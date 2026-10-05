import { notifyDownload } from './download-notification.js';
import { leadsSync } from './leads-sync.js';
const noStore = {'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow'};
function redirect(path, headers={}) { return new Response(null,{status:303,headers:{...noStore,Location:path,...headers}}); }
export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if(url.pathname === '/api/leads-sync') return leadsSync(request,env);
  if (url.pathname === '/api/case-study') {
   if(request.method !== 'POST') return new Response('Method not allowed',{status:405,headers:{Allow:'POST',...noStore}});
   if(request.headers.get('Origin') !== url.origin) return new Response('Forbidden',{status:403,headers:noStore});
   if(Number(request.headers.get('Content-Length') || 0)>4096) return new Response('Request too large',{status:413,headers:noStore});
   const body = await request.text();
   if(body.length>4096) return new Response('Request too large',{status:413,headers:noStore});
   const form=new URLSearchParams(body);
   const email=(form.get('email')||'').trim().toLowerCase();
   if(form.get('website') || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirect('/case-study?error=email');
   if(!env.CASE_STUDY_LEADS) return redirect('/case-study?error=unavailable');
   try {
    const now=new Date().toISOString();
    const token=crypto.randomUUID();
    await env.CASE_STUDY_LEADS.put('lead:'+crypto.randomUUID(),JSON.stringify({email,requestedAt:now,resource:'regional-media-case-study'}));
    await env.CASE_STUDY_LEADS.put('download:'+token,JSON.stringify({email}),{expirationTtl:900});
    return redirect('/download/case-study',{'Set-Cookie':`case_study_access=${token}; Max-Age=900; Path=/download/; HttpOnly; Secure; SameSite=Strict`});
   } catch { return redirect('/case-study?error=unavailable'); }
  }
  if(url.pathname === '/download/case-study') {
   if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD',...noStore}});
   const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)case_study_access=([a-f0-9-]{36})(?:;|$)/)?.[1];
   const authorization=token && env.CASE_STUDY_LEADS && await env.CASE_STUDY_LEADS.get('download:'+token);
   if(!authorization) return redirect('/case-study');
   const encoded = await env.CASE_STUDY_LEADS.get('document:regional-media');
   if(!encoded) return redirect('/case-study?error=unavailable');
   const pdf=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));
   if(request.method==='GET' && env.DOWNLOAD_EMAIL) {
    let email=null;
    try { email=JSON.parse(authorization).email; } catch {}
    ctx.waitUntil(notifyDownload(env,email,new Date().toISOString()).catch(()=>console.error('Could not record download notification')));
   }
   return new Response(request.method==='HEAD'?null:pdf,{headers:{...noStore,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Crescendo-BI-Case-Study.pdf"','X-Content-Type-Options':'nosniff'}});
  }
  if(url.pathname === '/crescendo-media-case-study.pdf' || url.pathname.startsWith('/private/') || url.pathname === '/case-study.html') return redirect('/case-study');
  return env.ASSETS.fetch(request);
 }
};
