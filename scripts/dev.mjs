import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function build(){const r=spawnSync(process.execPath,['build.mjs'],{cwd:root,stdio:'inherit'});return r.status===0;}
if(!build())process.exit(1);
let timer;
for(const dir of ['src','packages'])fs.watch(path.join(root,dir),{recursive:true},(_,name)=>{
 if(!name||name==='data.js'||name==='portrait-views.js'||name==='portrait.css')return;
 clearTimeout(timer);timer=setTimeout(build,150);
});
const server=http.createServer((request,response)=>{
 if(request.url==='/favicon.ico'){response.writeHead(204);response.end();return;}
 if(request.url?.split('?')[0]!=='/'){response.writeHead(404);response.end('Not found');return;}
 response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 response.end(fs.readFileSync(path.join(root,'dist/index.html')));
});
server.listen(5173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5173 — edit source, then refresh to view the rebuilt game.'));
