import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
process.env.NODE_ENV='development';process.env.MAIL_MODE='development';process.env.APP_URL='http://localhost:3000';
process.env.DATA_DIR=mkdtempSync(tmpdir()+'/printsncuts-test-');
process.env.ADMIN_EMAIL='admin@test.com';process.env.ADMIN_PASSWORD='admin-password-123';
const {server}=await import('../server.js');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
function client(){let cookie='';return async(path,method='GET',body,status=200)=>{const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};}
test('Marketplace lifecycle and permission boundaries',async()=>{try{
const seller=client(),buyer=client(),other=client(),admin=client(),guest=client();
async function signup(c,email,role){const d=await c('/register','POST',{name:role,email,password:'secure-password-123',role});assert.match(d.developmentCode,/^\d{6}$/);await c('/verify','POST',{email,code:d.developmentCode});await c('/login','POST',{email,password:'secure-password-123'});}
await signup(seller,'seller@test.com','seller');await signup(buyer,'buyer@test.com','buyer');await signup(other,'other@test.com','buyer');
await admin('/login','POST',{email:'admin@test.com',password:'admin-password-123'});
await guest('/admin','GET',undefined,401);await buyer('/admin','GET',undefined,403);
await seller('/profile','PATCH',{company:'Print Machinery Ltd',phone:'+91 90000 00000',about:'Machine specialists'});
const cats=await guest('/categories');const payload={title:'Test large-format press',category_id:cats[0].id,brand:'Test manufacturer',model:'1600',condition:'Used',year:'2020',location:'New Delhi, India',price:12000,currency:'INR',description:'Working printing machine',specs:{'Print width':'1600 mm'},photos:['https://example.com/press.jpg'],videos:['https://example.com/demo.mp4'],status:'published'};
await buyer('/listings','POST',payload,403);
const l=await seller('/listings','POST',payload);assert.equal((await guest('/listings?q=large-format')).length,1);assert.equal((await guest('/listings?q=unmatched')).length,0);
assert.equal((await guest('/listings/'+l.id)).specs['Print width'],'1600 mm');
const c=await buyer(`/listings/${l.id}/contact`,'POST',{body:'Is it available?'});await other(`/conversations/${c.id}/messages`,'GET',undefined,403);await other('/listings/'+l.id,'PATCH',payload,403);
await seller(`/conversations/${c.id}/messages`,'POST',{body:'Yes, available for inspection.'});assert.equal((await buyer(`/conversations/${c.id}/messages`)).length,2);
assert.equal((await seller('/conversations')).length,1);assert.equal((await other('/conversations')).length,0);
await seller('/listings/'+l.id,'PATCH',{...payload,status:'draft'});await guest('/listings/'+l.id,'GET',undefined,404);assert.equal((await guest('/listings')).length,0);
await seller('/listings/'+l.id,'PATCH',payload);
await buyer(`/listings/${l.id}/report`,'POST',{reason:'Please review this listing'});const data=await admin('/admin');await admin('/reports/nope','GET',undefined,404);
await admin('/admin/reports/'+data.reports[0].id,'PATCH',{hide:true});await guest('/listings/'+l.id,'GET',undefined,404);await seller('/listings/'+l.id,'PATCH',payload,403);
await admin('/admin/categories','POST',{name:'Test category'});const added=(await admin('/categories')).find(x=>x.name==='Test category');await admin('/admin/categories/'+added.id,'PATCH',{name:'Renamed category'});await admin('/admin/categories/'+added.id,'DELETE');await admin('/admin/categories/'+cats[0].id,'DELETE',undefined,409);
const sellerUser=data.users.find(u=>u.email==='seller@test.com');await admin('/admin/users/'+sellerUser.id,'PATCH',{suspended:true});await seller('/conversations','GET',undefined,401);await seller('/login','POST',{email:'seller@test.com',password:'secure-password-123'},403);
await buyer(`/conversations/${c.id}/messages`,'POST',{body:'Can you reply?'},403);
await admin('/admin/users/'+sellerUser.id,'PATCH',{suspended:false});await seller('/login','POST',{email:'seller@test.com',password:'secure-password-123'});
assert.ok(!(await seller('/me')).password);
}finally{await new Promise(r=>server.close(r));rmSync(process.env.DATA_DIR,{recursive:true,force:true});}});
