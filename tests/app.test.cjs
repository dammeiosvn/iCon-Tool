const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {IDBFactory} = require('fake-indexeddb');
const canvas = require('@napi-rs/canvas');
const root = path.join(__dirname,'..');

async function boot(database = new IDBFactory(), legacy) {
  const dom = new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'), {url:'https://example.test/iCon-Tool/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, UploadFile=w.File, errors=[], downloads=[];
  const backing=new WeakMap(), contexts=new WeakMap();
  function native(el) {
    let value=backing.get(el);
    if (!value) { value=canvas.createCanvas(el.width,el.height);backing.set(el,value); }
    if(value.width!==el.width)value.width=el.width;
    if(value.height!==el.height)value.height=el.height;
    return value;
  }
  w.HTMLCanvasElement.prototype.getContext=function(){
    const value=native(this), original=value.getContext('2d');
    if (!contexts.has(original)) contexts.set(original,new Proxy(original,{
      get(target,key){
        if(key==='drawImage') return (image,...args)=>target.drawImage(backing.has(image)?native(image):image,...args);
        const prop=target[key];return typeof prop==='function'?prop.bind(target):prop;
      },set(target,key,value){target[key]=value;return true;}
    }));
    return contexts.get(original);
  };
  w.HTMLCanvasElement.prototype.toDataURL=function(type){return native(this).toDataURL(type)};
  w.HTMLCanvasElement.prototype.toBlob=function(callback,type='image/png'){callback(new Blob([native(this).toBuffer(type)],{type}))};
  Object.defineProperty(canvas.Image.prototype,'naturalWidth',{get(){return this.width},configurable:true});
  Object.defineProperty(canvas.Image.prototype,'naturalHeight',{get(){return this.height},configurable:true});
  // Native rasterizer accepts SVG buffers; browser Image also accepts SVG data URLs.
  w.Image=class BrowserImage extends canvas.Image {
    get src(){return this._source || super.src;}
    set src(value){this._source=value;super.src=typeof value==='string' && /^data:image\/svg\+xml;base64,/.test(value) ? Buffer.from(value.split(',')[1],'base64') : value;}
  }; w.Blob=Blob; w.File=File; w.TextEncoder=TextEncoder;
  w.indexedDB=database; w.alert=message=>errors.push(message);
  w.console.error=(...args)=>errors.push(args.join(' '));
  w.URL.createObjectURL=blob=>{ downloads.push(blob);return 'blob:test'; };w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=()=>{};
  w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:320,height:320,bottom:320});
  if (legacy) Object.entries(legacy).forEach(([key,value])=>w.localStorage.setItem(key,JSON.stringify(value)));
  const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  w.eval(source.replace('  if ("serviceWorker" in navigator)', '  window.__app = {state,hist,readForm,writeForm,pushHist,draw,scaledBlob,svgMarkup,keepLayer,loadFile,loadPick,paintLayerSource,layerPlate,moveStack,saveLib,persist,dbGet,exportKit,decodeImage,assets,uuid,defaultForm};\n  if ("serviceWorker" in navigator)'));
  for(let i=0;i<200&&!w.__app;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.ok(w.__app,'app booted'); assert.deepEqual(errors,[]);
  const a=w.__app;
  const set=(id,value)=>{const el=w.document.getElementById(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const pointer=(type,id,x,y)=>{const event=new w.Event(type);Object.assign(event,{pointerId:id,clientX:x,clientY:y});w.document.getElementById('c').dispatchEvent(event)};
  return {w,a,set,pointer,errors,downloads,dom,upload:(buffer,name,type)=>new UploadFile([buffer],name,{type}),close:()=>w.close()};
}
async function pixel(blob,x,y){const image=await canvas.loadImage(Buffer.from(await blob.arrayBuffer()));const c=canvas.createCanvas(image.width,image.height);const g=c.getContext('2d');g.drawImage(image,0,0);return [...g.getImageData(x,y,1,1).data];}
function imageData(color,width=400,height=200){const c=canvas.createCanvas(width,height);const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,width,height);return c.toDataURL();}

// Real canvas pixels, DOM events and IndexedDB transactions run together.
test('editor: transparent PNG/SVG, isolated layers, gestures, colors, history and storage',async t=>{
 const db=new IDBFactory();let app=await boot(db);let {w,a,set,pointer}=app;
 t.after(()=>app.close());
 assert.equal(w.document.querySelectorAll('.rail button').length,5);
 assert.equal(w.document.getElementById('radius').closest('.pane').dataset.pane,'bg');
 assert.equal(w.document.getElementById('letters').closest('.pane').dataset.pane,'media');
 set('glass',60);set('noise',40);set('opaque',true);set('bg','clear');a.draw();
 for(const size of [180,512,1024]) assert.equal((await pixel(await a.scaledBlob(size,true),0,0))[3],0,'clear survives forced flat export');
 const svg=await a.svgMarkup();assert.ok(!svg.includes('<rect'));assert.ok(svg.includes('data:image/png;base64,'));
 const id=a.uuid(), data=imageData('#ff0000');const img=await a.decodeImage(data);a.assets.set(id,{img,data});
 const layer=a.keepLayer('photo',img,id);layer.size=200;a.loadPick();a.draw();a.pushHist();
 const source=a.paintLayerSource(layer);assert.equal(source.width/source.height,2,'non-square aspect');
 const initialPlate=a.layerPlate(layer);set('zoom',200);const large=a.layerPlate(layer);assert.ok(large.w>initialPlate.w*1.9,'zoom changes width');
 const previous=a.state.stack[0].px;pointer('pointerdown',1,100,100);pointer('pointermove',1,130,150);pointer('pointerup',1,130,150);
 assert.ok(layer.px>50&&layer.py>50,'drag follows finger');assert.equal(a.state.stack[0].px,previous,'other layer unchanged');
 const before={zoom:layer.zoom,rot:layer.rot};pointer('pointerdown',1,100,100);pointer('pointerdown',2,200,100);pointer('pointermove',2,240,180);pointer('pointerup',2,240,180);pointer('pointerup',1,100,100);
 assert.ok(layer.zoom>before.zoom);assert.notEqual(layer.rot,before.rot);
 set('flipH',true);set('flipV',true);assert.ok(layer.flipH&&layer.flipV);w.document.getElementById('center').click();assert.equal(layer.px,50);assert.equal(layer.py,50);assert.equal(layer.rot,0);
 set('edge',12);set('edgeMode','3');set('edge1','#00ff00');set('lyShadow',24);assert.equal(layer.edge,12);assert.equal(layer.shadow,24);
 set('c1','#204060');set('c1Tone',50);assert.equal(w.document.getElementById('c1').value,'#90a0b0');set('c1Tone',0);assert.equal(w.document.getElementById('c1').value,'#204060','brightness reversible');
 set('bg','solid');set('noise',0);set('glass',0);a.state.pick=0;a.loadPick();set('dropTo','ink');w.document.getElementById('pickDrop').click();pointer('pointerdown',9,3,3);assert.equal(a.state.stack[0].ink,'#204060');assert.match(w.document.getElementById('dropStatus').textContent,/Đã gắn/);
 const second=a.keepLayer('text');second.letters='<img src=x onerror=alert(1)>';a.loadPick();a.draw();a.pushHist();
 assert.equal(w.document.querySelector('#stack img'),null,'layer text cannot inject HTML');
 const count=a.state.stack.length;a.moveStack(2,0);w.document.getElementById('undo').click();assert.equal(a.state.stack[2].letters,second.letters);w.document.getElementById('redo').click();assert.equal(a.state.stack[0].letters,second.letters);
 w.document.querySelector('#stack .content-layer:last-child button:last-child').click();assert.equal(a.state.stack.length,count-1);w.document.getElementById('undo').click();assert.equal(a.state.stack.length,count);
 await a.saveLib();const saved=a.readForm();const library=await a.dbGet('docs','library');assert.equal(library[0].data.stack.length,count);
 assert.ok(!JSON.stringify(saved).includes('data:image'),'snapshots only asset references');assert.equal(w.localStorage.getItem('tao-icon-v2'),null);
 await a.persist();app.close();app=await boot(db);({w,a,set,pointer}=app);
 assert.equal(a.state.stack.length,count);assert.ok(a.hist.stack.length>1,'undo history survives reload');assert.ok(a.state.stack.some(layer=>layer.kind==='photo'&&layer.img&&layer.img.width===400),'image decoded after reload');
 assert.deepEqual(app.errors,[]);
});

test('kit renders every slot independently and does not mutate editor',async t=>{
 const app=await boot();t.after(app.close);const {a,set,downloads}=app;
 set('noise',0);set('glass',0);set('bg','clear');const before=JSON.stringify(a.readForm());
 for(const color of ['#ff0000','#0000ff'])a.state.kit.push({name:'same',img:await a.decodeImage(imageData(color)),thumb:''});
 // Empty slots booted by renderKit are ignored; same names get unique ZIP names.
 await a.exportKit();assert.equal(JSON.stringify(a.readForm()),before);
 const zip=Buffer.from(await downloads[0].arrayBuffer());const files=[];let offset=0;
 while(zip.readUInt32LE(offset)===0x04034b50){const len=zip.readUInt32LE(offset+18),nameLength=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28),start=offset+30+nameLength+extra;files.push({name:zip.subarray(offset+30,offset+30+nameLength).toString(),blob:new Blob([zip.subarray(start,start+len)])});offset=start+len;}
 assert.deepEqual(files.map(f=>f.name),['same.png','same-180.png','same-2.png','same-2-180.png']);
 assert.deepEqual(await pixel(files[0].blob,512,512),[255,0,0,255]);assert.deepEqual(await pixel(files[2].blob,512,512),[0,0,255,255]);assert.equal((await pixel(files[0].blob,0,0))[3],0);
});

test('UUID fallback and large text canvas limits',async t=>{
 const app=await boot();t.after(app.close);const {a,w,set}=app;
 Object.defineProperty(w.crypto,'randomUUID',{value:undefined});assert.match(a.uuid(),/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
 set('letters','WWWWWWWWWWWWWWWWWWWWWWWW');set('size',900);set('zoom',400);const plate=a.layerPlate(a.state.stack[0]);assert.ok(plate.canvas.width<=2048&&plate.canvas.height<=2048);
});


test('SVG import, per-layer recolor/outline, save reopen and legacy migration',async t=>{
 const app=await boot();t.after(app.close);const {a,w,set}=app;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="200" height="200" fill="#ff0000"/></svg>';
 a.loadFile(app.upload(svg,'wide.svg','image/svg+xml'),'svg');
 for(let i=0;i<100&&a.state.stack.length<2;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(a.state.stack.length,2,JSON.stringify(app.errors));const layer=a.state.stack[1];assert.equal(layer.kind,'svg');assert.ok(layer.asset);assert.equal(a.paintLayerSource(layer).width/a.paintLayerSource(layer).height,2);
 set('ink','#00ff00');let src=a.paintLayerSource(layer);assert.deepEqual([...src.getContext('2d').getImageData(10,10,1,1).data],[0,255,0,255]);
 set('keepSvg',true);src=a.paintLayerSource(layer);assert.deepEqual([...src.getContext('2d').getImageData(10,10,1,1).data],[255,0,0,255]);
 set('edge',10);set('edge1','#0000ff');const plate=a.layerPlate(layer);assert.equal(plate.canvas.getContext('2d').getImageData(7,25,1,1).data[2],255,'outline visible around alpha silhouette');
 await a.saveLib();const saved=JSON.stringify(a.readForm().stack);w.document.getElementById('reset').click();assert.equal(a.state.stack.length,1);w.document.querySelector('#lib button').click();assert.equal(JSON.stringify(a.readForm().stack),saved,'saved composition restores SVG and effects');
 const legacy=await boot(new IDBFactory(),{'tao-icon-v2':{mark:'plus',ink:'#aabbcc',size:'300',px:'60',flipH:true},'tao-icon-lib':[{id:1,thumb:imageData('#ffff00'),data:{mark:'text',letters:'OLD',size:'180'}}]});t.after(legacy.close);
 assert.equal(legacy.a.state.stack[0].kind,'symbol');assert.equal(legacy.a.state.stack[0].symbol,'plus');assert.equal(legacy.a.state.stack[0].px,60);assert.equal(legacy.w.localStorage.getItem('tao-icon-v2'),null);
 legacy.w.document.querySelector('#lib button').click();assert.equal(legacy.a.state.stack[0].letters,'OLD');assert.equal(legacy.a.state.stack.length,1);
});
