import { production, baseUrl, mailMode, checkConfig } from './config.js';
import { sendMail } from './mail.js';
import sharp from 'sharp';
import http from 'node:http';
import { DatabaseSync, backup } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, randomInt, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
checkConfig();
const root=fileURLToPath(new URL('.',import.meta.url));
const dataDir=process.env.DATA_DIR||root+'data';
mkdirSync(dataDir,{recursive:true,mode:0o700});
mkdirSync(dataDir+'/uploads',{recursive:true,mode:0o700});
export const db=new DatabaseSync(dataDir+'/market.db');
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,email TEXT UNIQUE,password TEXT,role TEXT DEFAULT 'buyer',verified INTEGER DEFAULT 0,suspended INTEGER DEFAULT 0,company TEXT DEFAULT '',phone TEXT DEFAULT '',website TEXT DEFAULT '',about TEXT DEFAULT '',code TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS listings(id INTEGER PRIMARY KEY,seller_id INTEGER REFERENCES users(id),title TEXT,category_id INTEGER REFERENCES categories(id),brand TEXT,model TEXT,condition TEXT,year TEXT,location TEXT,price REAL,currency TEXT,description TEXT,specs TEXT,photos TEXT,videos TEXT,status TEXT DEFAULT 'published',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS conversations(id INTEGER PRIMARY KEY,listing_id INTEGER REFERENCES listings(id),buyer_id INTEGER REFERENCES users(id),seller_id INTEGER REFERENCES users(id),UNIQUE(listing_id,buyer_id));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,conversation_id INTEGER REFERENCES conversations(id),sender_id INTEGER REFERENCES users(id),body TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,listing_id INTEGER REFERENCES listings(id),user_id INTEGER REFERENCES users(id),reason TEXT,status TEXT DEFAULT 'open');`);
// Additive, versioned migration: safe for existing demo and non-demo databases.
if(db.prepare('PRAGMA user_version').get().user_version<1){
  db.exec(`BEGIN;
    CREATE TABLE IF NOT EXISTS reset_tokens(user_id INTEGER PRIMARY KEY REFERENCES users(id),digest TEXT,expires INTEGER);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
    CREATE TABLE IF NOT EXISTS mail_queue(id INTEGER PRIMARY KEY,recipient INTEGER REFERENCES users(id),subject TEXT,body TEXT,attempts INTEGER DEFAULT 0,next_attempt INTEGER DEFAULT 0,status TEXT DEFAULT 'pending');
    CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY,actor INTEGER,action TEXT,target TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS uploads(name TEXT PRIMARY KEY,owner INTEGER REFERENCES users(id));
    CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id,id);
    CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    PRAGMA user_version=1; COMMIT;`);
}
const run=(s,...p)=>db.prepare(s).run(...p), one=(s,...p)=>db.prepare(s).get(...p), all=(s,...p)=>db.prepare(s).all(...p);
for(const name of ['Digital printing','Offset printing','Large format','Cutting & finishing'])run('INSERT OR IGNORE INTO categories(name) VALUES(?)',name);
function hash(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
function matches(p,h){const [s,k]=h.split(':');return timingSafeEqual(scryptSync(p,s,64),Buffer.from(k,'hex'));}
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){if(process.env.ADMIN_PASSWORD.length<12)throw Error('Admin password must be at least 12 characters');run("INSERT OR IGNORE INTO users(name,email,password,role,verified) VALUES(?,?,?,'admin',1)",'Administrator',process.env.ADMIN_EMAIL.toLowerCase(),hash(process.env.ADMIN_PASSWORD));}
const dummyPassword=hash(randomBytes(32).toString('hex'));
const safe=u=>u&&Object.fromEntries(Object.entries(u).filter(([k])=>!['password','code','expires'].includes(k)));
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const required=(v,n,max=500)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(400,`${n} is required (maximum ${max} characters)`);return v.trim();};
function throttle(key,limit,window=900000){
  const digest=createHash('sha256').update(key).digest('hex');
  const now=Date.now();
  run('INSERT INTO rate_limits(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END',digest,now+window,now,now);
  if(one('SELECT count FROM rate_limits WHERE key=?',digest).count>limit)fail(429,'Too many attempts. Try again later.');
}
const emailOf=v=>required(v,'Email',254).toLowerCase();
const digest=v=>createHash('sha256').update(v).digest('hex');
function audit(actor,action,target){run('INSERT INTO audit_log(actor,action,target) VALUES(?,?,?)',actor,action,String(target));}
async function verificationEmail(email,code){
  try{return await sendMail({to:email,subject:'Verify your PrintsNCuts email',text:`Your PrintsNCuts verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,key:randomBytes(16).toString('hex')});}
  catch{fail(503,'We could not send the email. Please use Resend code in a moment.');}
}
async function storePhotos(photos,owner){
  const validated=urls(photos,'photo'),result=[];
  for(const value of validated){
    if(value.startsWith('data:')){
      if(one('SELECT COUNT(*) count FROM uploads WHERE owner=?',owner).count>=200)fail(400,'Your account has reached its 200 uploaded-photo limit. Contact support for more storage.');
      let buffer;
      try{buffer=await sharp(Buffer.from(value.split(',')[1],'base64'),{limitInputPixels:25000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();}
      catch{fail(400,'This file is not a supported image or its dimensions are too large');}
      const name=randomBytes(24).toString('hex')+'.webp';
      writeFileSync(dataDir+'/uploads/'+name,buffer,{mode:0o600});
      run('INSERT INTO uploads(name,owner) VALUES(?,?)',name,owner);result.push('/media/'+name);
    }else if(value.startsWith('/media/')){
      if(!one('SELECT name FROM uploads WHERE name=? AND owner=?',value.slice(7),owner))fail(403,'You do not own this uploaded photo');
      result.push(value);
    }else result.push(value);
  }return result;
}
function notify(recipient,conversation){
  const u=one('SELECT verified,suspended FROM users WHERE id=?',recipient);
  if(u?.verified&&!u.suspended)run('INSERT INTO mail_queue(recipient,subject,body) VALUES(?,?,?)',recipient,'New message on PrintsNCuts',`You have a new private message about a machine. Sign in to read and reply: ${baseUrl}/#chat/${conversation}`);
}
let draining=false;
export async function drainMail(){
  if(draining||mailMode!=='resend')return;draining=true;
  try{for(const job of all("SELECT q.*,u.email,u.suspended FROM mail_queue q JOIN users u ON u.id=q.recipient WHERE q.status='pending' AND q.next_attempt<=? ORDER BY q.id LIMIT 10",Date.now())){
    if(job.suspended){run("UPDATE mail_queue SET status='cancelled',body='' WHERE id=?",job.id);continue;}
    try{await sendMail({to:job.email,subject:job.subject,text:job.body,key:'notification-'+digest(baseUrl+':'+job.id+':'+job.recipient+':'+job.body)});run("UPDATE mail_queue SET status='sent',body='' WHERE id=?",job.id);}
    catch{run('UPDATE mail_queue SET attempts=attempts+1,next_attempt=?,status=? WHERE id=?',Date.now()+Math.min(3600000,30000*2**job.attempts),job.attempts>=7?'failed':'pending',job.id);}
  }}finally{draining=false;}
}
export async function createBackup(){
  const folder=dataDir+'/backups';mkdirSync(folder,{recursive:true,mode:0o700});
  const destination=folder+'/market-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db';
  await backup(db,destination);
  const old=readdirSync(folder).filter(x=>/^market-.*\.db$/.test(x)).sort().slice(0,-7);
  for(const file of old)unlinkSync(folder+'/'+file);
  return destination;
}
function urls(a,kind){if(!Array.isArray(a)||a.length>10)fail(400,'Provide up to 10 media links');return a.map(x=>{if(typeof x!=='string')fail(400,'Invalid media');if(kind==='photo'&&/^\/media\/[a-f0-9]{48}\.webp$/.test(x))return x;if(kind==='photo'&&/^\/images\/(wide-format|digital-press|paper-cutter)\.svg$/.test(x))return x;if(kind==='photo'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x)&&x.length<2800000)return x;try{const u=new URL(x);if(u.protocol==='https:')return u.href;}catch{}fail(400,'Media must use HTTPS; photos may also be uploaded');});}
function listing(row){if(!row)return row;return {...row,specs:JSON.parse(row.specs),photos:JSON.parse(row.photos),videos:JSON.parse(row.videos)};}
const listingSql=`SELECT l.*,u.name seller_name,u.company,u.phone,u.email,u.website,u.about,u.verified,c.name category FROM listings l JOIN users u ON u.id=l.seller_id JOIN categories c ON c.id=l.category_id`;
export const server=http.createServer(async(req,res)=>{try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
res.setHeader('X-Frame-Options','DENY');
res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
if(!path.startsWith('/api/')){if(/^\/media\/[a-f0-9]{48}\.webp$/.test(path)){const file=dataDir+'/uploads/'+path.slice(7);if(!existsSync(file))fail(404,'Image not found');res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public, max-age=31536000, immutable');return res.end(readFileSync(file));}const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};if(/^\/images\/(wide-format|digital-press|paper-cutter)\.svg$/.test(path)){res.setHeader('Content-Type','image/svg+xml');return res.end(readFileSync(root+'public'+path));}if(!files[path])fail(404,'Not found');res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');return res.end(readFileSync(root+'public/'+files[path]));}
res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
if(!['GET','HEAD'].includes(method)){
  const allowed=production?baseUrl:new URL(req.url,`http://${req.headers.host}`).origin;
  if((production&&!req.headers.origin)||(req.headers.origin&&req.headers.origin!==allowed))fail(403,'Invalid origin');
  if(req.headers['sec-fetch-site']==='cross-site')fail(403,'Cross-site request blocked');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Use application/json');
}
const ip=process.env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
if(!['GET','HEAD'].includes(method))throttle(ip+':writes',300);
let b={};if(['POST','PATCH','PUT'].includes(method)){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>12000000)fail(413,'Request too large');chunks.push(c);}try{b=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'Invalid JSON');}}
const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
const user=token?one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',digest(token),Date.now()):null;
const auth=(role)=>{if(!user)fail(401,'Please sign in');if(user.suspended)fail(403,'Account suspended');if(role&&user.role!==role&&user.role!=='admin')fail(403,'Access denied');return user;};
const verified=()=>{auth();if(!user.verified)fail(403,'Verify your email first');};
let out;let m;
if(path==='/api/health'&&method==='GET'){one('SELECT 1');out={ok:true};}
else if(path==='/api/me'&&method==='GET')out=safe(user&&!user.suspended?user:null);
else if(path==='/api/register'&&method==='POST'){
  throttle(ip+':register',10);const email=emailOf(b.email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email');
  const p=required(b.password,'Password',128);if(p.length<12)fail(400,'Use at least 12 characters');
  if(!['buyer','seller'].includes(b.role))fail(400,'Choose buyer or seller');
  const name=required(b.name,'Name'),code=String(randomInt(100000,1000000));
  const existing=one('SELECT id FROM users WHERE email=?',email);
  if(!existing){
    run('INSERT INTO users(name,email,password,role,code,expires) VALUES(?,?,?,?,?,?)',name,email,hash(p),b.role,hash(code),Date.now()+600000);
    await verificationEmail(email,code);
  }
  out={message:'If this email is new, a verification code has been sent. Existing users can sign in or reset their password.',...(!production&&mailMode==='development'&&!existing?{developmentCode:code}:{})};
}
else if(path==='/api/resend-verification'&&method==='POST'){
  const email=emailOf(b.email);throttle(ip+':resend',20);throttle(email+':resend',1,60000);
  const u=one('SELECT * FROM users WHERE email=?',email);let code;
  if(u&&!u.verified&&!u.suspended){
    code=String(randomInt(100000,1000000));run('UPDATE users SET code=?,expires=? WHERE id=?',hash(code),Date.now()+600000,u.id);await verificationEmail(email,code);
  }
  out={message:'If this account needs verification, a new code has been sent.',...(!production&&mailMode==='development'&&code?{developmentCode:code}:{})};
}
else if(path==='/api/verify'&&method==='POST'){
  const email=emailOf(b.email);throttle(ip+':verify',30);throttle(email+':verify',10);
  const u=one('SELECT * FROM users WHERE email=?',email);
  if(!u||u.suspended||!u.code||u.expires<Date.now()||!/^\d{6}$/.test(String(b.code))||!matches(String(b.code),u.code))fail(400,'Invalid or expired code');
  run('UPDATE users SET verified=1,code=NULL,expires=NULL WHERE id=?',u.id);out={message:'Email verified. You can sign in.'};
}
else if(path==='/api/forgot-password'&&method==='POST'){
  const email=emailOf(b.email);throttle(ip+':forgot',20);throttle(email+':forgot',3,900000);
  const u=one('SELECT * FROM users WHERE email=?',email);let resetUrl;
  if(u&&!u.suspended){
    const token=randomBytes(32).toString('hex');resetUrl=baseUrl+'/#reset/'+token;
    run('INSERT INTO reset_tokens(user_id,digest,expires) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET digest=excluded.digest,expires=excluded.expires',u.id,digest(token),Date.now()+1800000);
    try{await sendMail({to:email,subject:'Reset your PrintsNCuts password',text:`Reset your password using this link: ${resetUrl}\nThis link expires in 30 minutes and can be used once. Ignore this email if you did not request a reset.`,key:randomBytes(16).toString('hex')});}catch{console.error('Password recovery delivery failed; check email service status');}
  }
  out={message:'If an eligible account exists, you will receive a password-reset email.',...(!production&&mailMode==='development'&&resetUrl?{developmentResetUrl:resetUrl}:{})};
}
else if(path==='/api/reset-password'&&method==='POST'){
  throttle(ip+':reset',20);
  const p=required(b.password,'Password',128);if(p.length<12)fail(400,'Use at least 12 characters');
  if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))fail(400,'Invalid or expired reset link');
  const t=one('SELECT r.*,u.suspended FROM reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.digest=? AND r.expires>?',digest(b.token),Date.now());
  if(!t||t.suspended)fail(400,'Invalid or expired reset link');
  const password=hash(p);db.exec('BEGIN');
  try{run('UPDATE users SET password=? WHERE id=?',password,t.user_id);run('DELETE FROM reset_tokens WHERE user_id=?',t.user_id);run('DELETE FROM sessions WHERE user_id=?',t.user_id);audit(t.user_id,'password_reset',t.user_id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  out={message:'Password updated. Sign in with your new password.'};
}
else if(path==='/api/login'&&method==='POST'){
  const email=emailOf(b.email);throttle(ip+':login',40);throttle(email+':login',15);
  const u=one('SELECT * FROM users WHERE email=?',email);
  if(typeof b.password!=='string'||b.password.length>128)fail(401,'Invalid email or password');
  // A fixed-cost dummy hash avoids a fast path for unknown accounts.
  if(!matches(b.password,u?.password||dummyPassword))fail(401,'Invalid email or password');
  if(!u)fail(401,'Invalid email or password');
  if(u.suspended)fail(403,'Account suspended');
  const t=randomBytes(32).toString('hex');run('INSERT INTO sessions VALUES(?,?,?)',digest(t),u.id,Date.now()+7*86400000);
  res.setHeader('Set-Cookie',`session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${production?'; Secure':''}`);out=safe(u);
}
else if(path==='/api/logout'&&method==='POST'){run('DELETE FROM sessions WHERE token=?',token?digest(token):'');res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');out={ok:true};}
else if(path==='/api/profile'&&method==='PATCH'){auth('seller');verified();run('UPDATE users SET company=?,phone=?,website=?,about=? WHERE id=?',required(b.company,'Company'),required(b.phone,'Contact phone'),String(b.website||'').slice(0,500),String(b.about||'').slice(0,3000),user.id);out=safe(one('SELECT * FROM users WHERE id=?',user.id));}
else if(path==='/api/categories'&&method==='GET')out=all('SELECT * FROM categories ORDER BY name');
else if(path==='/api/listings'&&method==='GET'){let sql=listingSql+" WHERE l.status='published' AND u.suspended=0",p=[];if(url.searchParams.get('mine')==='1'){auth('seller');sql=listingSql+' WHERE l.seller_id=?';p=[user.id];}for(const [key,col]of [['q','l.title || l.brand || l.model || l.description'],['location','l.location']])if(url.searchParams.get(key)){sql+=` AND (${col}) LIKE ?`;p.push('%'+url.searchParams.get(key)+'%');}if(url.searchParams.get('category')){sql+=' AND l.category_id=?';p.push(url.searchParams.get('category'));}if(url.searchParams.get('condition')){sql+=' AND l.condition=?';p.push(url.searchParams.get('condition'));}out=all(sql+' ORDER BY l.id DESC',...p).map(listing);}
else if((m=path.match(/^\/api\/listings\/(\d+)$/))&&method==='GET'){const row=one(listingSql+' WHERE l.id=?',m[1]);if(!row||(row.status!=='published'&&user?.id!==row.seller_id&&user?.role!=='admin')||(one('SELECT suspended FROM users WHERE id=?',row.seller_id).suspended&&user?.role!=='admin'))fail(404,'Listing not found');out=listing(row);}
else if((path==='/api/listings'&&method==='POST')||((m=path.match(/^\/api\/listings\/(\d+)$/))&&method==='PATCH')){auth('seller');verified();if(!user.company)fail(400,'Complete your company profile first');const old=m?one('SELECT * FROM listings WHERE id=?',m[1]):null;if(m&&(!old||old.seller_id!==user.id))fail(403,'You do not own this listing');if(old?.status==='hidden')fail(403,'This listing is hidden by an administrator');if(!one('SELECT id FROM categories WHERE id=?',b.category_id))fail(400,'Choose a category');if(!['New','Used','Refurbished'].includes(b.condition))fail(400,'Choose a condition');if(!['published','draft','sold'].includes(b.status))fail(400,'Invalid status');if(!Number.isFinite(Number(b.price))||Number(b.price)<0)fail(400,'Invalid price');if(b.currency!=='INR')fail(400,'Prices must be in Indian rupees (INR)');if(!b.specs||typeof b.specs!=='object'||Array.isArray(b.specs)||JSON.stringify(b.specs).length>10000)fail(400,'Invalid specifications');const vals=[required(b.title,'Title'),Number(b.category_id),required(b.brand,'Brand'),required(b.model,'Model'),b.condition,String(b.year||'').slice(0,4),required(b.location,'Location'),Number(b.price),b.currency,required(b.description,'Description',10000),JSON.stringify(b.specs),JSON.stringify(await storePhotos(b.photos,user.id)),JSON.stringify(urls(b.videos,'video')),b.status];if(old){run('UPDATE listings SET title=?,category_id=?,brand=?,model=?,condition=?,year=?,location=?,price=?,currency=?,description=?,specs=?,photos=?,videos=?,status=? WHERE id=?',...vals,old.id);out={id:old.id};}else{out={id:Number(run('INSERT INTO listings(title,category_id,brand,model,condition,year,location,price,currency,description,specs,photos,videos,status,seller_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',...vals,user.id).lastInsertRowid)};}}
else if((m=path.match(/^\/api\/listings\/(\d+)\/contact$/))&&method==='POST'){verified();const l=one('SELECT l.* FROM listings l JOIN users u ON l.seller_id=u.id WHERE l.id=? AND l.status=\'published\' AND u.suspended=0',m[1]);if(!l)fail(404,'Listing not found');if(l.seller_id===user.id)fail(400,'This is your own listing');const body=required(b.body,'Message',4000);run('INSERT OR IGNORE INTO conversations(listing_id,buyer_id,seller_id) VALUES(?,?,?)',l.id,user.id,l.seller_id);const c=one('SELECT id FROM conversations WHERE listing_id=? AND buyer_id=?',l.id,user.id);run('INSERT INTO messages(conversation_id,sender_id,body) VALUES(?,?,?)',c.id,user.id,body);notify(l.seller_id,c.id);out=c;}
else if(path==='/api/conversations'&&method==='GET'){auth();out=all('SELECT c.*,l.title,b.name buyer_name,s.name seller_name,(SELECT body FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) last_message FROM conversations c JOIN listings l ON l.id=c.listing_id JOIN users b ON b.id=c.buyer_id JOIN users s ON s.id=c.seller_id WHERE c.buyer_id=? OR c.seller_id=? ORDER BY c.id DESC',user.id,user.id);}
else if((m=path.match(/^\/api\/conversations\/(\d+)\/messages$/))){auth();const c=one('SELECT * FROM conversations WHERE id=?',m[1]);if(!c||![c.buyer_id,c.seller_id].includes(user.id))fail(403,'Private conversation');if(method==='POST'){verified();if(one('SELECT suspended FROM users WHERE id=?',c.buyer_id===user.id?c.seller_id:c.buyer_id).suspended)fail(403,'This account is suspended');run('INSERT INTO messages(conversation_id,sender_id,body) VALUES(?,?,?)',c.id,user.id,required(b.body,'Message',4000));notify(c.buyer_id===user.id?c.seller_id:c.buyer_id,c.id);}else if(method!=='GET')fail(405,'Method not allowed');out=all('SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender_id WHERE conversation_id=? ORDER BY m.id',c.id);}
else if((m=path.match(/^\/api\/listings\/(\d+)\/report$/))&&method==='POST'){verified();if(!one('SELECT id FROM listings WHERE id=?',m[1]))fail(404,'Listing not found');run('INSERT INTO reports(listing_id,user_id,reason) VALUES(?,?,?)',m[1],user.id,required(b.reason,'Reason',2000));out={ok:true};}
else if(path.startsWith('/api/admin')){auth('admin');if(path==='/api/admin'&&method==='GET')out={emailQueue:all('SELECT status,COUNT(*) count FROM mail_queue GROUP BY status'),audit:all('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50'),users:all('SELECT id,name,email,role,verified,suspended,company FROM users'),reports:all('SELECT r.*,l.title,u.email reporter FROM reports r JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=r.user_id ORDER BY r.id DESC')};else if(path==='/api/admin/backup'&&method==='POST'){await createBackup();audit(user.id,'backup','database');out={message:'Database backup created on the persistent disk. Copy it off-server with your uploads.'};}else if(path==='/api/admin/retry-email'&&method==='POST'){run("UPDATE mail_queue SET status='pending',attempts=0,next_attempt=0 WHERE status='failed'");out={ok:true};}else if(path==='/api/admin/categories'&&method==='POST'){try{run('INSERT INTO categories(name) VALUES(?)',required(b.name,'Category'));}catch{fail(409,'Category already exists');}out={ok:true};}else if((m=path.match(/^\/api\/admin\/categories\/(\d+)$/))){if(method==='PATCH')run('UPDATE categories SET name=? WHERE id=?',required(b.name,'Category'),m[1]);else if(method==='DELETE'){if(one('SELECT id FROM listings WHERE category_id=?',m[1]))fail(409,'Category is in use');run('DELETE FROM categories WHERE id=?',m[1]);}else fail(405,'Method not allowed');out={ok:true};}else if((m=path.match(/^\/api\/admin\/users\/(\d+)$/))&&method==='PATCH'){const u=one('SELECT * FROM users WHERE id=?',m[1]);if(!u||u.role==='admin')fail(400,'Cannot change this account');run('UPDATE users SET suspended=? WHERE id=?',b.suspended?1:0,m[1]);run('DELETE FROM sessions WHERE user_id=?',m[1]);audit(user.id,b.suspended?'suspend_account':'restore_account',m[1]);out={ok:true};}else if((m=path.match(/^\/api\/admin\/reports\/(\d+)$/))&&method==='PATCH'){const r=one('SELECT * FROM reports WHERE id=?',m[1]);if(!r)fail(404,'Report not found');if(b.hide)run("UPDATE listings SET status='hidden' WHERE id=?",r.listing_id);run("UPDATE reports SET status='resolved' WHERE id=?",r.id);audit(user.id,b.hide?'hide_listing':'resolve_report',r.listing_id);out={ok:true};}else fail(404,'Not found');}
else fail(404,'Not found');res.end(JSON.stringify(out));
}catch(e){res.statusCode=e.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.status?e.message:'Server error'}));if(!e.status)console.error(e);}});
server.on('listening',()=>{
  const worker=setInterval(()=>drainMail().catch(()=>console.error('Email worker failed')),15000);worker.unref();
  const clean=setInterval(()=>{run('DELETE FROM sessions WHERE expires<?',Date.now());run('DELETE FROM reset_tokens WHERE expires<?',Date.now());run('DELETE FROM rate_limits WHERE until<?',Date.now());},3600000);clean.unref();
  const backups=production?setInterval(()=>createBackup().catch(()=>console.error('Automatic backup failed')),86400000):null;backups?.unref();
  if(production)createBackup().catch(()=>console.error('Startup backup failed'));
  server.once('close',()=>{clearInterval(worker);clearInterval(clean);clearInterval(backups);});
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(production&&!one("SELECT id FROM users WHERE role='admin'"))throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD to provision the first administrator');
  server.listen(Number(process.env.PORT||3000),process.env.HOST||(production?'0.0.0.0':'127.0.0.1'),()=>console.log(`PrintsNCuts listening on port ${process.env.PORT||3000}; mail mode: ${mailMode}`));
  process.on('SIGTERM',()=>{server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
}
