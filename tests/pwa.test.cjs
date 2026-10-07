const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('manifest icons have their actual PNG sizes and profile scope is normalized',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));
 for(const icon of manifest.icons){const png=fs.readFileSync(path.join(root,icon.src));assert.equal(icon.sizes,`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);}
 assert.deepEqual(manifest.icons.map(i=>i.sizes),['180x180','512x512','1024x1024']);
 assert.ok(!fs.readFileSync(path.join(root,'iConTool.mobileconfig'),'utf8').includes('/iCon-Tool//'));
});

test('precache matches HTML versioned URLs, offline works, unrelated caches are retained',async()=>{
 const events={},stored=new Map(),deleted=[];
 const cache={addAll:async urls=>urls.forEach(url=>stored.set(new URL(url,'https://example.test/iCon-Tool/').href,new Response('cached '+url))),match:async request=>stored.get(new URL(typeof request==='string'?request:request.url,'https://example.test/iCon-Tool/').href),put:async()=>{}};
 const self={location:{origin:'https://example.test'},registration:{scope:'https://example.test/iCon-Tool/'},addEventListener:(name,handler)=>events[name]=handler,skipWaiting:()=>{},clients:{claim:()=>{}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self,URL,Response,caches:{open:async()=>cache,keys:async()=>['icontool-v37','tao-icon-v36','another-app'],delete:async key=>deleted.push(key)},fetch:async()=>{throw new Error('offline')}});
 let done;events.install({waitUntil:promise=>done=promise});await done;
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const url of [html.match(/href="(css\/style.css[^\"]+)"/)[1],html.match(/src="(js\/app.js[^\"]+)"/)[1]])assert.ok(stored.has(new URL(url,'https://example.test/iCon-Tool/').href));
 events.activate({waitUntil:promise=>done=promise});await done;assert.deepEqual(deleted,['tao-icon-v36']);
 for(const suffix of ['css/style.css?v=37','js/app.js?v=37','index.html']){let response;events.fetch({request:new Request('https://example.test/iCon-Tool/'+suffix),respondWith:promise=>response=promise,waitUntil:()=>{}});assert.equal((await response).status,200);}
 let intercepted=false;events.fetch({request:new Request('https://other.test/x'),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
});
