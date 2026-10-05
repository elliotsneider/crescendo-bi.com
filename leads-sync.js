const headers = {'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
export async function leadsSync(request, env) {
 if(request.method!=='GET') return new Response('{}',{status:405,headers:{...headers,Allow:'GET'}});
 const supplied=request.headers.get('Authorization')||'';
 if(!env.LEADS_SYNC_TOKEN || !env.CASE_STUDY_LEADS) return new Response('{}',{status:503,headers});
 const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([digest(supplied),digest('Bearer '+env.LEADS_SYNC_TOKEN)]);
 let difference=0; for(let i=0;i<a.length;i++) difference|=a[i]^b[i];
 if(difference) return new Response('{}',{status:401,headers});
 const url=new URL(request.url),cursor=url.searchParams.get('cursor');
 if(cursor && cursor.length>2048) return new Response('{}',{status:400,headers});
 try {
  const page=await env.CASE_STUDY_LEADS.list({prefix:'lead:',limit:100,...(cursor?{cursor}:{})});
  const records=(await Promise.all(page.keys.map(async key=>{
   const raw=await env.CASE_STUDY_LEADS.get(key.name); if(!raw) return null;
   try { const row=JSON.parse(raw); return {id:key.name,email:row.email,requestedAt:row.requestedAt,resource:row.resource}; } catch { return null; }
  }))).filter(Boolean);
  return new Response(JSON.stringify({records,cursor:page.list_complete?null:page.cursor}),{headers});
 } catch { return new Response('{}',{status:503,headers}); }
}
