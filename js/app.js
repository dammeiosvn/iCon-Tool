(() => {
  const SIZE = 1024;
  const KEY = "tao-icon-v2";
  const c = document.getElementById("c");
  const ctx = c.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);
  const sheet = $("sheet");

  const state = { photo: null, svgImg: null, drag: null, pinch: null };
  const hist = { stack: [], i: -1, lock: false };

  const PRESETS = {
    none: { sx: 0, sy: 0, sblur: 0, salpha: 0 },
    outer: { sx: 0, sy: 16, sblur: 22, salpha: 42 },
    inset: { sx: 0, sy: 10, sblur: 18, salpha: 50 },
    soft: { sx: 0, sy: 20, sblur: 48, salpha: 28 },
    hard: { sx: 8, sy: 14, sblur: 6, salpha: 55 },
    glow: { sx: 0, sy: 0, sblur: 36, salpha: 55 },
    bottom: { sx: 0, sy: 22, sblur: 18, salpha: 38 },
    floating: { sx: 0, sy: 28, sblur: 40, salpha: 32 },
    pressed: { sx: 0, sy: 8, sblur: 10, salpha: 45 },
    pop: { sx: 0, sy: 10, sblur: 8, salpha: 35 },
    double: { sx: 0, sy: 6, sblur: 4, salpha: 40 },
    neu: { sx: 12, sy: 12, sblur: 22, salpha: 28 },
    neuIn: { sx: 10, sy: 10, sblur: 18, salpha: 32 },
    neon: { sx: 0, sy: 0, sblur: 28, salpha: 70 },
    long: { sx: 18, sy: 28, sblur: 8, salpha: 36 },
    crisp: { sx: 0, sy: 1, sblur: 2, salpha: 50 },
    clay: { sx: 0, sy: 8, sblur: 14, salpha: 40 },
  };

  const FIELDS = ["bg","c1","c2","c3","ang","noise","radius","squircle","safeOn","glass","stroke","pad","shadowPreset","sx","sy","sblur","salpha","scolor","shadowFrame","shadowContent","bakeShadow","mark","letters","font","ink","size","alpha","keepSvg","zoom","px","py","rot","flipH","flipV","mockOn","label","wall","opaque"];

  function val(id) { return $(id).value; }
  function num(id) { return +$(id).value; }
  function on(id) { return $(id).checked; }

  function hexAlpha(hex, a) {
    const n = hex.replace("#", "");
    return `rgba(${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)},${a})`;
  }
  function lum(hex) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0,2),16)/255, g = parseInt(n.slice(2,4),16)/255, b = parseInt(n.slice(4,6),16)/255;
    const f = (v) => v <= .03928 ? v/12.92 : ((v+0.055)/1.055)**2.4;
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  }

  function roundPath(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w/2, h/2));
    g.beginPath();
    if (r <= 0) { g.rect(x, y, w, h); return; }
    g.moveTo(x+r, y);
    g.arcTo(x+w, y, x+w, y+h, r);
    g.arcTo(x+w, y+h, x, y+h, r);
    g.arcTo(x, y+h, x, y, r);
    g.arcTo(x, y, x+w, y, r);
    g.closePath();
  }

  function squirclePath(g, x, y, w, h) {
    const n = 5, steps = 80, cx = x+w/2, cy = y+h/2;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i/steps)*Math.PI*2;
      const ca = Math.cos(t), sa = Math.sin(t);
      const px = cx + (w/2)*Math.sign(ca)*Math.pow(Math.abs(ca), 2/n);
      const py = cy + (h/2)*Math.sign(sa)*Math.pow(Math.abs(sa), 2/n);
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }

  function seeded(i) {
    const x = Math.sin(i*127.1+311.7)*43758.5453;
    return x - Math.floor(x);
  }

  function iconBox() {
    const bake = on("bakeShadow") && val("shadowPreset") !== "none";
    const m = bake ? 90 : 0;
    return { x:m, y:m, w:SIZE-m*2, h:SIZE-m*2, r: num("radius")*((SIZE-m*2)/SIZE) };
  }

  function clipIcon(g, box) {
    if (on("squircle") && num("radius") === 0) squirclePath(g, box.x, box.y, box.w, box.h);
    else roundPath(g, box.x, box.y, box.w, box.h, box.r);
  }

  function fillBackground(g, box) {
    const mode = val("bg");
    if (mode === "clear") return;
    const ang = num("ang") * Math.PI / 180;
    const cx = box.x+box.w/2, cy = box.y+box.h/2;
    const L = Math.hypot(box.w, box.h)/2;
    const grad = g.createLinearGradient(cx-Math.cos(ang)*L, cy-Math.sin(ang)*L, cx+Math.cos(ang)*L, cy+Math.sin(ang)*L);
    grad.addColorStop(0, val("c1"));
    if (mode === "grad3") grad.addColorStop(.5, val("c3"));
    grad.addColorStop(1, mode === "solid" ? val("c1") : val("c2"));
    g.fillStyle = grad;
    g.fill();
    const n = num("noise");
    for (let i = 0; i < n*90; i++) {
      g.fillStyle = `rgba(255,255,255,${seeded(i)*.08})`;
      g.fillRect(box.x+seeded(i+3)*box.w, box.y+seeded(i+9)*box.h, 2, 2);
    }
  }

  function applyContentShadow(g) {
    if (!on("shadowContent") || num("salpha") <= 0) { clearShadow(g); return; }
    const a = num("salpha")/100;
    g.shadowColor = val("shadowPreset")==="neon" ? hexAlpha(val("ink"), a) : hexAlpha(val("scolor"), a);
    g.shadowBlur = num("sblur")*2;
    g.shadowOffsetX = num("sx")*2;
    g.shadowOffsetY = num("sy")*2;
  }
  function clearShadow(g) {
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  }

  function applyOuterShadow(g, box, preset) {
    if (!on("shadowFrame")) return;
    const a = num("salpha")/100;
    if (a <= 0 || preset === "none") return;
    g.save();
    g.shadowBlur = num("sblur")*2;
    if (preset === "neu" || preset === "double") {
      g.shadowColor = hexAlpha("#000000", a);
      g.shadowOffsetX = num("sx")*2; g.shadowOffsetY = num("sy")*2;
      clipIcon(g, box); g.fillStyle = "#000"; g.fill();
      g.shadowColor = hexAlpha("#ffffff", Math.min(.7, a+.15));
      g.shadowOffsetX = -num("sx")*2; g.shadowOffsetY = -num("sy")*2;
      g.fill();
    } else {
      g.shadowColor = preset==="neon" ? hexAlpha(val("ink"), a) : hexAlpha(val("scolor"), a);
      g.shadowOffsetX = num("sx")*2; g.shadowOffsetY = num("sy")*2;
      clipIcon(g, box); g.fillStyle = "#000"; g.fill();
    }
    g.restore();
  }

  function applyInset(g, box, preset) {
    if (!on("shadowFrame") || !["inset","pressed","neuIn","clay"].includes(preset)) return;
    const a = num("salpha")/100;
    g.save();
    clipIcon(g, box); g.clip();
    g.strokeStyle = hexAlpha(val("scolor"), a);
    g.lineWidth = Math.max(8, num("sblur"));
    g.shadowColor = hexAlpha(val("scolor"), a);
    g.shadowBlur = num("sblur");
    g.shadowOffsetX = num("sx"); g.shadowOffsetY = num("sy");
    clipIcon(g, box); g.stroke();
    g.restore();
  }

  function withContentXform(g, box, fn) {
    const cx = box.x + box.w/2, cy = box.y + box.h/2;
    g.save();
    g.globalAlpha = num("alpha")/100;
    g.translate(cx, cy);
    g.rotate(num("rot")*Math.PI/180);
    g.scale(on("flipH") ? -1 : 1, on("flipV") ? -1 : 1);
    g.translate(-cx, -cy);
    const ox = (num("px")-50)/50 * box.w * .35;
    const oy = (num("py")-50)/50 * box.h * .35;
    g.translate(ox, oy);
    fn();
    g.restore();
  }

  function drawPhoto(g, box) {
    const img = state.photo; if (!img) return;
    const zoom = num("zoom")/100;
    const ir = img.width/img.height, br = box.w/box.h;
    let dw, dh;
    if (ir > br) { dh = box.h*zoom; dw = dh*ir; }
    else { dw = box.w*zoom; dh = dw/ir; }
    applyContentShadow(g);
    g.drawImage(img, box.x+box.w/2-dw/2, box.y+box.h/2-dh/2, dw, dh);
    clearShadow(g);
  }

  function drawSvg(g, box) {
    const img = state.svgImg; if (!img) return;
    const s = num("size")*(num("zoom")/100);
    const x = box.x+box.w/2-s/2, y = box.y+box.h/2-s/2;
    const off = document.createElement("canvas");
    off.width = off.height = Math.max(1, Math.round(s));
    const o = off.getContext("2d");
    o.drawImage(img, 0, 0, off.width, off.height);
    if (!on("keepSvg")) {
      o.globalCompositeOperation = "source-in";
      o.fillStyle = val("ink");
      o.fillRect(0,0,off.width,off.height);
    }
    applyContentShadow(g);
    g.drawImage(off, x, y, s, s);
    clearShadow(g);
  }

  function starPath(g, cx, cy, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i*Math.PI/5 - Math.PI/2, rr = i%2 ? r*.42 : r;
      i ? g.lineTo(cx+Math.cos(rad)*rr, cy+Math.sin(rad)*rr) : g.moveTo(cx+Math.cos(rad)*rr, cy+Math.sin(rad)*rr);
    }
    g.closePath();
  }

  function drawMark(g, box) {
    const m = val("mark");
    if (m === "none") return;
    withContentXform(g, box, () => {
      if (m === "photo") { drawPhoto(g, box); return; }
      if (m === "svg") { drawSvg(g, box); return; }
      const cx = box.x+box.w/2, cy = box.y+box.h/2, s = num("size");
      g.fillStyle = g.strokeStyle = val("ink");
      g.lineWidth = Math.max(10, s*.08);
      g.lineCap = g.lineJoin = "round";
      applyContentShadow(g);
      if (m === "text") {
        g.font = `700 ${s}px ${val("font")}`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText((val("letters") || "S").slice(0,4), cx, cy+s*.04);
      } else if (m === "sun") {
        g.beginPath(); g.arc(cx, cy-s*.08, s*.28, 0, 7); g.fill();
        g.fillRect(cx-s*.55, cy+s*.32, s*1.1, Math.max(8,s*.05));
      } else if (m === "plus") {
        const t = Math.max(16,s*.18);
        g.fillRect(cx-t/2, cy-s/2, t, s); g.fillRect(cx-s/2, cy-t/2, s, t);
      } else if (m === "gear") {
        g.beginPath(); g.arc(cx, cy, s*.22, 0, 7); g.stroke();
        for (let i=0;i<8;i++) {
          const t=i/8*Math.PI*2;
          g.beginPath();
          g.moveTo(cx+Math.cos(t)*s*.3, cy+Math.sin(t)*s*.3);
          g.lineTo(cx+Math.cos(t)*s*.42, cy+Math.sin(t)*s*.42); g.stroke();
        }
      } else if (m === "mail") {
        const w=s*1.05,h=s*.72;
        g.strokeRect(cx-w/2, cy-h/2, w, h);
        g.beginPath(); g.moveTo(cx-w/2, cy-h/2); g.lineTo(cx, cy+h*.08); g.lineTo(cx+w/2, cy-h/2); g.stroke();
      } else if (m === "phone") {
        roundPath(g, cx-s*.24, cy-s*.41, s*.48, s*.82, s*.1); g.stroke();
        g.beginPath(); g.arc(cx, cy+s*.26, s*.045, 0, 7); g.fill();
      } else if (m === "star") { starPath(g, cx, cy, s*.48); g.fill(); }
      else if (m === "heart") {
        g.beginPath();
        g.moveTo(cx, cy+s*.2);
        g.bezierCurveTo(cx-s, cy-s*.08, cx-s*.45, cy-s*.47, cx, cy-s*.2);
        g.bezierCurveTo(cx+s*.45, cy-s*.47, cx+s, cy-s*.08, cx, cy+s*.2);
        g.fill();
      }
      clearShadow(g);
    });
  }

  function draw() {
    ctx.clearRect(0,0,SIZE,SIZE);
    const box = iconBox();
    const preset = val("shadowPreset");
    const pad = num("pad");
    const inner = { x:box.x+pad, y:box.y+pad, w:Math.max(8,box.w-pad*2), h:Math.max(8,box.h-pad*2), r:Math.max(0,box.r-pad*.35) };
    if (preset !== "none" && !["inset","pressed","neuIn","clay"].includes(preset)) applyOuterShadow(ctx, box, preset);
    ctx.save();
    clipIcon(ctx, box); ctx.clip();
    fillBackground(ctx, box);
    if (num("glass")>0) { ctx.fillStyle = `rgba(255,255,255,${num("glass")/100})`; ctx.fillRect(box.x,box.y,box.w,box.h); }
    drawMark(ctx, inner);
    applyInset(ctx, box, preset);
    if (num("stroke")>0) {
      ctx.strokeStyle = "rgba(255,255,255,.78)";
      ctx.lineWidth = num("stroke");
      clipIcon(ctx, { x:box.x+num("stroke")/2, y:box.y+num("stroke")/2, w:box.w-num("stroke"), h:box.h-num("stroke"), r:Math.max(0,box.r-num("stroke")/2) });
      ctx.stroke();
    }
    ctx.restore();
    syncUI();
  }

  function syncUI() {
    const map = { noise:"noiseVal", ang:"angVal", radius:"radiusVal", glass:"glassVal", stroke:"strokeVal", pad:"padVal", sx:"sxVal", sy:"syVal", sblur:"sblurVal", salpha:"salphaVal", size:"sizeVal", alpha:"alphaVal", zoom:"zoomVal", px:"pxVal", py:"pyVal", rot:"rotVal" };
    Object.entries(map).forEach(([id, lab]) => { if ($(lab)) $(lab).textContent = $(id).value; });
    $("mockName").textContent = val("label") || "Icon";
    $("mock").className = "mock" + (on("mockOn") ? ` wall-${val("wall")==="ios"?"ios":val("wall")}` : " off");
    if (val("wall")==="ios" && on("mockOn")) $("mock").className = "mock";
    $("safe").hidden = !on("safeOn");
    const w = $("warn");
    if (val("mark")==="text") {
      const ok = Math.abs(lum(val("c1"))-lum(val("ink"))) > .28;
      w.hidden = ok;
      w.textContent = ok ? "" : "Chữ/nền tương phản thấp.";
    } else w.hidden = true;
  }

  function readForm() {
    const o = {};
    FIELDS.forEach((id) => {
      const el = $(id); if (!el) return;
      o[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return o;
  }
  function writeForm(o) {
    hist.lock = true;
    FIELDS.forEach((id) => {
      const el = $(id); if (!el || o[id] == null) return;
      if (el.type === "checkbox") el.checked = !!o[id]; else el.value = o[id];
    });
    hist.lock = false;
  }
  function pushHist() {
    if (hist.lock) return;
    const snap = JSON.stringify(readForm());
    if (hist.stack[hist.i] === snap) return;
    hist.stack = hist.stack.slice(0, hist.i+1);
    hist.stack.push(snap);
    if (hist.stack.length > 40) hist.stack.shift();
    hist.i = hist.stack.length-1;
    try { localStorage.setItem(KEY, snap); } catch {}
  }
  function undo() { if (hist.i<=0) return; hist.i--; writeForm(JSON.parse(hist.stack[hist.i])); draw(); }
  function redo() { if (hist.i>=hist.stack.length-1) return; hist.i++; writeForm(JSON.parse(hist.stack[hist.i])); draw(); }

  function applyPreset() {
    const p = PRESETS[val("shadowPreset")]; if (!p) return;
    hist.lock = true;
    $("sx").value=p.sx; $("sy").value=p.sy; $("sblur").value=p.sblur; $("salpha").value=p.salpha;
    if (val("shadowPreset")==="neon") $("scolor").value = val("ink");
    hist.lock = false;
    draw(); pushHist();
  }

  function scaledBlob(px, flat) {
    const s = document.createElement("canvas");
    s.width = s.height = px;
    const g = s.getContext("2d");
    if (flat && val("bg") !== "clear") { g.fillStyle = val("c1"); g.fillRect(0,0,px,px); }
    else if (flat) { g.fillStyle = "#000"; g.fillRect(0,0,px,px); }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, px, px);
    return new Promise((r) => s.toBlob(r, "image/png"));
  }

  function crc32(buf) {
    let c = ~0;
    for (let i=0;i<buf.length;i++) c = (c>>>8) ^ CRC[(c^buf[i])&255];
    return ~c >>> 0;
  }
  const CRC = new Uint32Array(256);
  for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xedb88320^(c>>>1) : c>>>1; CRC[n]=c>>>0; }

  function u16(n){ return new Uint8Array([n&255, n>>>8]); }
  function u32(n){ return new Uint8Array([n&255, (n>>>8)&255, (n>>>16)&255, n>>>24]); }

  async function zipBlobs(files) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const name = new TextEncoder().encode(f.name);
      const crc = crc32(data);
      const local = new Uint8Array([
        0x50,0x4b,0x03,0x04, 20,0, 0,0, 0,0, 0,0,0,0,
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), 0,0
      ]);
      parts.push(local, name, data);
      const cen = new Uint8Array([
        0x50,0x4b,0x01,0x02, 20,0,20,0, 0,0,0,0, 0,0,0,0,
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), 0,0,0,0,0,0,0,0,0,0, ...u32(offset)
      ]);
      central.push(cen, name);
      offset += local.length + name.length + data.length;
    }
    const cenBuf = concat(central);
    const end = new Uint8Array([
      0x50,0x4b,0x05,0x06, 0,0,0,0, ...u16(files.length), ...u16(files.length),
      ...u32(cenBuf.length), ...u32(offset), 0,0
    ]);
    return new Blob([concat(parts), cenBuf, end], { type: "application/zip" });
  }
  function concat(arrs) {
    const len = arrs.reduce((a,b)=>a+b.length,0);
    const out = new Uint8Array(len); let o=0;
    arrs.forEach(a => { out.set(a,o); o+=a.length; });
    return out;
  }

  function svgMarkup() {
    const box = iconBox(), clear = val("bg")==="clear", mode = val("bg");
    const stops = mode==="grad3"
      ? `<stop stop-color="${val("c1")}"/><stop offset=".5" stop-color="${val("c3")}"/><stop offset="1" stop-color="${val("c2")}"/>`
      : `<stop stop-color="${val("c1")}"/><stop offset="1" stop-color="${mode==="solid"?val("c1"):val("c2")}"/>`;
    const text = val("mark")==="text"
      ? `<text x="512" y="540" text-anchor="middle" font-size="${num("size")}" font-family="${val("font")}" font-weight="700" fill="${val("ink")}">${(val("letters")||"S").slice(0,4)}</text>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${clear?"":`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>`}<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${box.r}" fill="${clear?"none":"url(#g)"}" stroke="rgba(255,255,255,.78)" stroke-width="${num("stroke")}"/>${text}</svg>`;
  }

  async function shareOrDownload(name, blob) {
    const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
    try {
      if (navigator.canShare && navigator.canShare({ files:[file] })) {
        await navigator.share({ files:[file], title:"Icon iOS" }); return;
      }
    } catch (e) { if (e && e.name==="AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function exportPng(px, share) {
    draw();
    const blob = await scaledBlob(px, on("opaque"));
    const name = px===SIZE ? "icon-home-screen.png" : `icon-${px}.png`;
    if (share) await shareOrDownload(name, blob);
    else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  }

  async function exportZip() {
    draw();
    const sizes = [1024,180,167,152,120];
    const files = [];
    for (const s of sizes) files.push({ name: s===1024 ? "icon-home-screen.png" : `icon-${s}.png`, blob: await scaledBlob(s, on("opaque")) });
    files.push({ name: "icon-home-screen.svg", blob: new Blob([svgMarkup()], { type:"image/svg+xml" }) });
    await shareOrDownload("icon-ios-pack.zip", await zipBlobs(files));
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const isSvg = (file.type||"").includes("svg") || /\.svg$/i.test(file.name);
        if (isSvg) { state.svgImg = img; $("mark").value = "svg"; }
        else { state.photo = img; $("mark").value = "photo"; }
        $("px").value = 50; $("py").value = 50; $("rot").value = 0;
        draw(); pushHist();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const TITLES = { bg:"Nền", radius:"Bo góc", glass:"Kính & viền", shadow:"Đổ bóng", mark:"Ký hiệu & chữ", media:"Ảnh & SVG", home:"Màn hình chính", export:"Xuất file" };

  function openPane(id) {
    sheet.hidden = false;
    $("sheetTitle").textContent = TITLES[id] || id;
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === id));
    document.querySelectorAll(".rail button").forEach((b) => b.classList.toggle("on", b.dataset.panel === id));
  }
  function closeSheet() {
    sheet.hidden = true;
    document.querySelectorAll(".rail button").forEach((b) => b.classList.remove("on"));
  }

  function bind() {
    document.querySelectorAll("input,select").forEach((el) => {
      if (el.id === "file" || el.id === "fileCam") return;
      el.addEventListener("input", () => {
        if (el.id === "shadowPreset") applyPreset();
        else { draw(); pushHist(); }
      });
    });
    document.querySelectorAll("input[type=range], input[type=color]").forEach((el) => {
      const dim = () => sheet.classList.add("ghost");
      const undim = () => sheet.classList.remove("ghost");
      el.addEventListener("pointerdown", dim);
      el.addEventListener("touchstart", dim, { passive:true });
      el.addEventListener("pointerup", undim);
      el.addEventListener("touchend", undim);
    });
    document.addEventListener("pointerup", () => sheet.classList.remove("ghost"));

    document.querySelectorAll(".rail button").forEach((b) => {
      b.onclick = () => {
        if (b.classList.contains("on") && !sheet.hidden) closeSheet();
        else openPane(b.dataset.panel);
      };
    });
    $("sheetClose").onclick = closeSheet;
    $("pick").onclick = () => $("file").click();
    $("cam").onclick = () => $("fileCam").click();
    $("file").onchange = () => loadFile($("file").files[0]);
    $("fileCam").onchange = () => loadFile($("fileCam").files[0]);
    $("center").onclick = () => { $("px").value=50; $("py").value=50; $("rot").value=0; draw(); pushHist(); };
    $("autoInk").onclick = () => { $("ink").value = lum(val("c1")) > .45 ? "#111111" : "#ffffff"; draw(); pushHist(); };
    $("undo").onclick = undo; $("redo").onclick = redo;
    $("reset").onclick = () => { location.reload(); };
    $("share1024").onclick = () => exportPng(SIZE, true);
    $("share180").onclick = () => exportPng(180, true);
    $("shareZip").onclick = exportZip;
    $("shareSvg").onclick = () => shareOrDownload("icon-home-screen.svg", new Blob([svgMarkup()], { type:"image/svg+xml" }));
    $("dl1024").onclick = () => exportPng(SIZE, false);

    c.addEventListener("pointerdown", (e) => {
      if (val("mark")!=="photo" && val("mark")!=="svg" && val("mark")!=="text") return;
      c.setPointerCapture(e.pointerId);
      state.drag = { x:e.clientX, y:e.clientY, px:num("px"), py:num("py"), id:e.pointerId };
    });
    c.addEventListener("pointermove", (e) => {
      if (!state.drag || state.drag.id!==e.pointerId) return;
      const k = 80 / Math.max(c.getBoundingClientRect().width, 1);
      $("px").value = Math.max(0, Math.min(100, state.drag.px - (e.clientX-state.drag.x)*k));
      $("py").value = Math.max(0, Math.min(100, state.drag.py - (e.clientY-state.drag.y)*k));
      draw();
    });
    c.addEventListener("pointerup", () => { if (state.drag) pushHist(); state.drag = null; });
    c.addEventListener("touchstart", (e) => {
      if (e.touches.length===2) {
        const [a,b]=e.touches;
        state.pinch = { dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY), zoom:num("zoom") };
        state.drag = null;
      }
    }, { passive:true });
    c.addEventListener("touchmove", (e) => {
      if (e.touches.length===2 && state.pinch) {
        e.preventDefault();
        const [a,b]=e.touches;
        const d = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        $("zoom").value = Math.round(Math.max(40, Math.min(240, state.pinch.zoom*(d/state.pinch.dist))));
        draw();
      }
    }, { passive:false });

    const stage = $("stage");
    stage.addEventListener("dragover", (e) => e.preventDefault());
    stage.addEventListener("drop", (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
    document.addEventListener("paste", (e) => {
      const f = [...(e.clipboardData?.files||[])][0]; if (f) loadFile(f);
    });
  }

  try {
    const saved = localStorage.getItem(KEY);
    if (saved) writeForm(JSON.parse(saved));
  } catch {}

  bind();
  draw();
  pushHist();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();