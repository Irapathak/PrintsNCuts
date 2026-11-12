import { mailMode, production } from './config.js';
export async function sendMail({to,subject,text,key},fetchImpl=fetch){
  if(mailMode==='development'){
    if(production)throw Error('Development email is disabled in production');
    return {development:true};
  }
  if(mailMode!=='resend')throw Error('Unknown MAIL_MODE');
  const response=await fetchImpl('https://api.resend.com/emails',{
    method:'POST',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},
    body:JSON.stringify({from:process.env.MAIL_FROM,to:[to],subject,text})
  });
  if(!response.ok)throw Error(`Email provider rejected delivery (${response.status})`);
  return {sent:true};
}
