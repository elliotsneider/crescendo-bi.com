import { EmailMessage } from 'cloudflare:email';
export async function notifyDownload(env, email, downloadedAt) {
 const id=crypto.randomUUID();
 const record={email:email||'Previously authorized visitor',downloadedAt,resource:'regional-media-case-study',notificationStatus:'pending'};
 const key='download-event:'+id;
 await env.CASE_STUDY_LEADS.put(key,JSON.stringify(record));
 try {
  const from='notifications@elliotsneider.com';
  const to='elliot@crescendo-bi.com';
  const text=`Your website served the Crescendo BI case study PDF.\r\n\r\nSubmitted email: ${record.email}\r\nTime (UTC): ${downloadedAt}\r\n\r\nThis records the PDF being served, not confirmation that the visitor saved or read it.\r\n`;
  const raw=[`From: Crescendo BI Downloads <${from}>`,`To: ${to}`,'Subject: New Crescendo BI case study download',`Date: ${new Date(downloadedAt).toUTCString()}`,`Message-ID: <${id}@elliotsneider.com>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','','',text].join('\r\n');
  await env.DOWNLOAD_EMAIL.send(new EmailMessage(from,to,raw));
  record.notificationStatus='sent';
 } catch(error) {
  record.notificationStatus='failed';
  record.notificationError=String(error.code||error.message||'Email delivery failed').slice(0,500);
  console.error('Download notification failed',id,record.notificationError);
 }
 await env.CASE_STUDY_LEADS.put(key,JSON.stringify(record));
}
