/**
 * FrostTrack LAN-to-HTTPS gateway. Run on a laptop/Raspberry Pi on the same LAN as Arduino.
 * Node >=20, no npm dependencies required.
 * POST http://GATEWAY_LAN_IP:8787/telemetry from W5500.
 * The gateway forwards JSON via HTTPS to Vercel, using DEVICE_API_KEY.
 * IMPORTANT: Local LAN hop is plain HTTP; use only on a trusted/isolated network.
 */
import http from 'node:http';

const PORT = Number(process.env.GATEWAY_PORT||8787);
const API_BASE = (process.env.CLOUD_API_URL||'').replace(/\/$/,'');
const DEVICE_API_KEY = process.env.DEVICE_API_KEY||'';
if (!API_BASE.startsWith('https://') || DEVICE_API_KEY.length<20) {
  console.error('Set CLOUD_API_URL=https://YOUR-VERCEL-DOMAIN and DEVICE_API_KEY (20+ chars).');
  process.exit(1);
}
http.createServer((req,res)=>{
  if (req.url!=='/telemetry'||req.method!=='POST') {res.writeHead(404).end('Not found');return;}
  let size=0;const chunks=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>8000){res.writeHead(413).end('Payload too large');req.destroy();return;}chunks.push(chunk);});
  req.on('end',async()=>{
    try {
      const raw=Buffer.concat(chunks).toString('utf8');JSON.parse(raw);
      const remote=await fetch(`${API_BASE}/api/telemetry`,{method:'POST',headers:{'Content-Type':'application/json','x-device-key':DEVICE_API_KEY},body:raw,signal:AbortSignal.timeout(15000)});
      const text=await remote.text();res.writeHead(remote.status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(text);
      console.log(new Date().toISOString(),'Arduino telemetry -> cloud',remote.status);
    }catch(e){console.error(e.message);res.writeHead(502).end('Gateway forwarding failed');}
  });
}).listen(PORT,'0.0.0.0',()=>console.log(`FrostTrack gateway listening on LAN port ${PORT}; forwarding to ${API_BASE}`));
