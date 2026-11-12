import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const envPath=fileURLToPath(new URL('./.env',import.meta.url));
if(existsSync(envPath))process.loadEnvFile(envPath);
export const production=process.env.NODE_ENV==='production';
export const baseUrl=(process.env.APP_URL||'http://localhost:'+(process.env.PORT||3000)).replace(/\/$/,'');
export const mailMode=process.env.MAIL_MODE||'development';
export function checkConfig(){
  const url=new URL(baseUrl);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('APP_URL must be a plain origin, e.g. https://printsncuts.example');
  if(production){
    if(url.protocol!=='https:')throw Error('Production requires an HTTPS APP_URL');
    if(mailMode!=='resend'||!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)throw Error('Production requires MAIL_MODE=resend, RESEND_API_KEY, and MAIL_FROM');
    if(!process.env.DATA_DIR)throw Error('Production requires DATA_DIR on a persistent disk');
    if(process.env.ADMIN_EMAIL?.endsWith('.test'))throw Error('Do not use demo admin credentials in production');
  }
}
