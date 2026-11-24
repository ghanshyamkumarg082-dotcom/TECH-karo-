const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const server = http.createServer((req,res)=>{
  const file = path.join(__dirname,'public',req.url==='/'?'index.html':req.url.replace(/^\/+/,''));
  if(!file.startsWith(path.join(__dirname,'public'))){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});res.end(data);});
});
const wss = new WebSocket.Server({server});
let waiting = null;
function send(ws,obj){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
wss.on('connection',ws=>{
  ws.partner=null; ws.queued=false;
  ws.on('message',raw=>{
    let msg;try{msg=JSON.parse(raw)}catch{return}
    if(msg.type==='join'){
      if(ws.partner)return;
      if(waiting&&waiting!==ws&&waiting.readyState===WebSocket.OPEN){
        const other=waiting;waiting=null;other.queued=false;
        ws.partner=other;other.partner=ws;
        send(other,{type:'paired',initiator:true});send(ws,{type:'paired',initiator:false});
      }else{waiting=ws;ws.queued=true;send(ws,{type:'waiting'});}
    }else if(msg.type==='signal'){
      if(ws.partner)send(ws.partner,{type:'signal',data:msg.data});
    }else if(msg.type==='leave'){
      if(ws.partner){const p=ws.partner;ws.partner=null;p.partner=null;send(p,{type:'peer-left'});}
      if(waiting===ws)waiting=null;ws.queued=false;
    }
  });
  ws.on('close',()=>{
    if(waiting===ws)waiting=null;
    if(ws.partner){const p=ws.partner;ws.partner=null;p.partner=null;send(p,{type:'peer-left'});}
  });
});
const port=process.env.PORT||3000;
server.listen(port,()=>console.log('RAHUL PRO LIVE MIC server listening on '+port));