// Local demonstration only. Uses its own database, separate from npm start.
import {DatabaseSync} from 'node:sqlite';
import {scryptSync,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.env.DATA_DIR=fileURLToPath(new URL('./data/demo',import.meta.url));
process.env.ADMIN_EMAIL='admin@printsncuts.test';process.env.ADMIN_PASSWORD='Demo-admin-2026!';
if(process.env.NODE_ENV==='production')throw Error('Demo is for local use only');
const {server}=await import('./server.js');
const db=new DatabaseSync(process.env.DATA_DIR+'/market.db');
function hash(p){const s=randomBytes(16).toString('hex');return s+':'+scryptSync(p,s,64).toString('hex');}
for(const [name,email,role,company]of [['Alex Morgan','seller@printsncuts.test','seller','Morgan Print Equipment'],['Jamie Lee','buyer@printsncuts.test','buyer','']])db.prepare('INSERT OR IGNORE INTO users(name,email,password,role,verified,company,phone,about) VALUES(?,?,?,?,1,?,?,?)').run(name,email,hash('Demo-market-2026!'),role,company,'+91 90000 00000','Demonstration account. Listings are illustrative, not real offers.');
const seller=db.prepare('SELECT id FROM users WHERE email=?').get('seller@printsncuts.test');
if(!db.prepare('SELECT id FROM listings LIMIT 1').get()){
const rows=[['Wide-format production printer','Large format','DemoPrint','WF-1600','Used','2021','Mumbai, Maharashtra',1050000,{'Print width':'1600 mm','Resolution':'1440 dpi','Ink type':'Eco-solvent'}],['Digital color production press','Digital printing','DemoPress','C750','Refurbished','2020','New Delhi, Delhi',2000000,{'Print speed':'75 pages/min','Paper size':'Up to SRA3','Color':'CMYK'}],['Programmable paper cutter','Cutting & finishing','DemoCut','P-720','New','2026','Ahmedabad, Gujarat',0,{'Cut width':'720 mm','Controls':'Touchscreen','Power':'220 V'}]];
for(const [title,category,brand,model,condition,year,location,price,specs]of rows){const c=db.prepare('SELECT id FROM categories WHERE name=?').get(category);db.prepare('INSERT INTO listings(seller_id,title,category_id,brand,model,condition,year,location,price,currency,description,specs,photos,videos) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(seller.id,title,c.id,brand,model,condition,year,location,price,'INR','Illustrative demo machine. Specifications and price are sample data, not an actual offer. Contact the demo seller to try the private messaging flow.',JSON.stringify(specs),JSON.stringify(['/images/'+({'Large format':'wide-format','Digital printing':'digital-press','Cutting & finishing':'paper-cutter'}[category])+'.svg']),JSON.stringify(['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4']));}}
db.close();server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Local demo: http://localhost:'+(process.env.PORT||3000)+'\nSeller: seller@printsncuts.test / Demo-market-2026!\nBuyer: buyer@printsncuts.test / Demo-market-2026!\nAdmin: admin@printsncuts.test / Demo-admin-2026!\nSample video is a playback placeholder, not machine footage.'));
