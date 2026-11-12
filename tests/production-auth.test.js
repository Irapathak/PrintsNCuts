import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {DatabaseSync} from 'node:sqlite';
process.env.DATA_DIR=mkdtempSync(tmpdir()+'/printsncuts-production-test-');
process.env.NODE_ENV='production';process.env.APP_URL='https://market.example';
process.env.MAIL_MODE='resend';process.env.MAIL_FROM='PrintsNCuts <accounts@auth.example.com>';
process.env.RESEND_API_KEY='test-placeholder-not-a-real-key';
process.env.ADMIN_EMAIL='admin@example.com';process.env.ADMIN_PASSWORD='test-admin-password';
const originalFetch=globalThis.fetch;const sent=[];let rejectMail=false;
globalThis.fetch=async(url,options)=>{
 if(url==='https://api.resend.com/emails'){
   if(rejectMail)return new Response('{}',{status:503});
   sent.push(JSON.parse(options.body));assert.equal(options.headers.Authorization,'Bearer test-placeholder-not-a-real-key');
   return new Response('{"id":"mock-email"}',{status:200});
 }
 return originalFetch(url,options);
};
const {server,db,drainMail,createBackup}=await import('../server.js');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
function client(){let cookie='';return async(path,method='GET',body,status=200)=>{
 const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Origin:process.env.APP_URL,Cookie:cookie},body:body?JSON.stringify(body):undefined});
 if(r.headers.get('set-cookie')){assert.match(r.headers.get('set-cookie'),/HttpOnly/);if(path==='/login')assert.match(r.headers.get('set-cookie'),/Secure/);cookie=r.headers.get('set-cookie').split(';')[0];}
 const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;
};}
test('Production email, recovery, uploads, delivery retry, backup and origin checks',async()=>{try{
 const seller=client(),buyer=client(),guest=client();
 const reg=await seller('/register','POST',{name:'Seller',email:'seller@example.com',password:'Original-password-123',role:'seller'});
 assert.equal(reg.developmentCode,undefined);assert.equal(sent.length,1);const code=sent.at(-1).text.match(/code is (\d{6})/)[1];
 await seller('/verify','POST',{email:'seller@example.com',code:'000000'},400);
 await seller('/verify','POST',{email:'seller@example.com',code});await seller('/verify','POST',{email:'seller@example.com',code},400);
 await seller('/login','POST',{email:'seller@example.com',password:'Original-password-123'});
 const storedSession=db.prepare('SELECT token FROM sessions LIMIT 1').get().token;assert.equal(storedSession.length,64);
 await seller('/profile','PATCH',{company:'Delhi Print Equipment',phone:'+91 90000 00000'});
 const newReg=await buyer('/register','POST',{name:'Buyer',email:'buyer@example.com',password:'Original-password-123',role:'buyer'});assert.equal(newReg.developmentCode,undefined);
 const oldCode=sent.at(-1).text.match(/code is (\d{6})/)[1];
 await buyer('/resend-verification','POST',{email:'buyer@example.com'});
 const newCode=sent.at(-1).text.match(/code is (\d{6})/)[1];
 if(newCode!==oldCode)await buyer('/verify','POST',{email:'buyer@example.com',code:oldCode},400);
 await buyer('/resend-verification','POST',{email:'buyer@example.com'},429);
 await buyer('/verify','POST',{email:'buyer@example.com',code:newCode});
 await buyer('/login','POST',{email:'buyer@example.com',password:'Original-password-123'});
 const forgot=await seller('/forgot-password','POST',{email:'seller@example.com'});assert.equal(forgot.developmentResetUrl,undefined);
 const reset=sent.at(-1).text.match(/#reset\/([a-f0-9]{64})/)[1];
 assert.notEqual(db.prepare('SELECT digest FROM reset_tokens LIMIT 1').get().digest,reset);
 const missing=await guest('/forgot-password','POST',{email:'unknown@example.com'});assert.deepEqual(missing,forgot);
 await guest('/reset-password','POST',{token:reset,password:'New-password-456'});
 assert.equal(await seller('/me'),null);
 await seller('/login','POST',{email:'seller@example.com',password:'Original-password-123'},401);
 await guest('/reset-password','POST',{token:reset,password:'Another-password-789'},400);
 await seller('/login','POST',{email:'seller@example.com',password:'New-password-456'});
 await guest('/forgot-password','POST',{email:'seller@example.com'});
 const expiredReset=sent.at(-1).text.match(/#reset\/([a-f0-9]{64})/)[1];
 db.prepare('UPDATE reset_tokens SET expires=0').run();
 await guest('/reset-password','POST',{token:expiredReset,password:'Should-not-change-123'},400);
 await guest('/reset-password','POST',{token:'invalid',password:'Should-not-change-123'},400);
 const r=await originalFetch(base+'/api/logout',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
 const noOrigin=await originalFetch(base+'/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(noOrigin.status,403);
 const cat=(await guest('/categories'))[0];
 const image=await sharp({create:{width:30,height:30,channels:3,background:'#165c4a'}}).png().toBuffer();
 const payload={title:'Production test press',category_id:cat.id,brand:'Test',model:'1200',condition:'Used',year:'2020',location:'Delhi, India',price:125000,currency:'INR',description:'Test machine',specs:{Width:'1200 mm'},photos:['data:image/png;base64,'+image.toString('base64')],videos:[],status:'published'};
 await seller('/listings','POST',{...payload,photos:['data:image/png;base64,'+Buffer.from('<script>bad</script>').toString('base64')]},400);
 const l=await seller('/listings','POST',payload);const detail=await guest('/listings/'+l.id);assert.match(detail.photos[0],/^\/media\/[a-f0-9]{48}\.webp$/);
 const media=await originalFetch(base+detail.photos[0]);assert.equal(media.headers.get('content-type'),'image/webp');assert.equal((await sharp(Buffer.from(await media.arrayBuffer())).metadata()).format,'webp');
 await seller('/listings/'+l.id,'PATCH',{...payload,photos:detail.photos});
 const c=await buyer('/listings/'+l.id+'/contact','POST',{body:'May I inspect this?'});
 rejectMail=true;await drainMail();assert.equal(db.prepare('SELECT attempts FROM mail_queue LIMIT 1').get().attempts,1);
 db.prepare('UPDATE mail_queue SET next_attempt=0').run();rejectMail=false;await drainMail();assert.equal(db.prepare('SELECT status FROM mail_queue LIMIT 1').get().status,'sent');assert.match(sent.at(-1).text,new RegExp('#chat/'+c.id));
 const backup=await createBackup();assert.ok(existsSync(backup));const copy=new DatabaseSync(backup,{readOnly:true});assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(copy.prepare('SELECT COUNT(*) count FROM listings').get().count,1);copy.close();
 const queue=sent.length;await guest('/resend-verification','POST',{email:'missing@example.com'});assert.equal(sent.length,queue);
 const health=await guest('/health');assert.equal(health.ok,true);
}finally{await new Promise(r=>server.close(r));db.close();globalThis.fetch=originalFetch;rmSync(process.env.DATA_DIR,{recursive:true,force:true});}});
