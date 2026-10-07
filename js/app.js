(async () => {
  const SIZE = 1024;
  const KEY = "tao-icon-v2";
  const c = document.getElementById("c");
  const ctx = c.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);
  const sheet = $("sheet");

  const state = { layers: [], stack: [], pick: -1, active: -1, seq: 1, kit: [], kitSlot: -1, abPick: "a" };
  const hist = { stack: [], i: -1, lock: false };

  const NAMES = {
    outer: "Bóng Ngoài", inset: "Bóng Chìm", soft: "Mờ Diện Rộng", hard: "Nổi Khối 3D",
    glow: "Phát Sáng", bottom: "Bóng Dưới", floating: "Nổi Bay", pressed: "Ấn Xuống",
    pop: "Pop Bubble", double: "Viền Kép", neu: "Neu Nổi", neuIn: "Neu Chìm",
    neon: "Neon", long: "Bóng Dài", crisp: "Sắc Nét", clay: "Đất Sét"
  };
  const INSET = new Set(["inset","pressed","neuIn","clay"]);
  const DUAL = new Set(["neu","double"]);

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

  const FIELDS = ["frameMode","frame1","frame2","frame3","frameAng","bg","c1","c2","c3","ang","noise","radius","squircle","safeOn","glass","stroke","pad","sx","sy","sblur","salpha","scolor","layerTarget","bakeShadow","mark","letters","letters2","font","inkMode","ink","ink2","inkAng","size","size2","gap2","alpha","keepSvg","edge","edgeAng","edgeMode","edge1","edge2","edge3","zoom","px","py","rot","flipH","flipV","snap","mockOn","label","wall","opaque","fileBase","dropTo","kitN"];
  const LIB = "tao-icon-lib";
  const STY = "tao-icon-style";

  const SYMBOLS = [
    { q: "wifi sóng internet", t: "📶" },
    { q: "pin battery sạc", t: "🔋" },
    { q: "sấm sét power", t: "⚡️" },
    { q: "khóa lock", t: "🔒" },
    { q: "mở khóa", t: "🔓" },
    { q: "nhà home", t: "🏠" },
    { q: "bánh răng cài đặt", m: "gear" },
    { q: "thư mail", m: "mail" },
    { q: "điện thoại phone", m: "phone" },
    { q: "mặt trời sun", m: "sun" },
    { q: "cộng plus add", m: "plus" },
    { q: "sao star", m: "star" },
    { q: "tim heart yêu", m: "heart" },
    { q: "camera ảnh", t: "📷" },
    { q: "nhạc music", t: "🎵" },
    { q: "mic micro", t: "🎤" },
    { q: "chuông bell", t: "🔔" },
    { q: "định vị location", t: "📍" },
    { q: "cloud mây", t: "☁️" },
    { q: "trăng moon", t: "🌙" },
    { q: "lửa fire", t: "🔥" },
    { q: "bóng đá sport", t: "⚽️" },
    { q: "xe car", t: "🚗" },
    { q: "máy bay fly", t: "✈️" },
    { q: "game", t: "🎮" },
    { q: "thư mục folder", t: "📁" },
    { q: "link", t: "🔗" },
    { q: "tìm search", t: "🔍" },
    { q: "lịch calendar", t: "📅" },
    { q: "đồng hồ clock", t: "⏰" },
    { q: "ok check", t: "✅" },
    { q: "x close", t: "❌" },
    { q: "play", t: "▶️" },
    { q: "pause", t: "⏸️" }
  ];

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

  function roundPath(g, x, y, w, h, r, start = true) {
    r = Math.max(0, Math.min(r, w/2, h/2));
    if (start) g.beginPath();
    if (r <= 0) { g.rect(x, y, w, h); return; }
    g.moveTo(x+r, y);
    g.arcTo(x+w, y, x+w, y+h, r);
    g.arcTo(x+w, y+h, x, y+h, r);
    g.arcTo(x, y+h, x, y, r);
    g.arcTo(x, y, x+w, y, r);
    g.closePath();
  }

  function squirclePath(g, x, y, w, h, start = true) {
    const n = 5, steps = 80, cx = x+w/2, cy = y+h/2;
    if (start) g.beginPath();
    else g.moveTo(cx + w/2, cy);
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
    const bake = on("bakeShadow") && state.layers.some((L) => L.on && L.target === "frame");
    const m = bake ? 90 : 0;
    return { x:m, y:m, w:SIZE-m*2, h:SIZE-m*2, r: num("radius")*((SIZE-m*2)/SIZE) };
  }

  function addIconPath(g, box, start = true) {
    if (on("squircle") && num("radius") === 0) squirclePath(g, box.x, box.y, box.w, box.h, start);
    else roundPath(g, box.x, box.y, box.w, box.h, box.r, start);
  }

  function clipIcon(g, box) {
    addIconPath(g, box, true);
  }

  function frameShape(box, inner) {
    return val("bg") === "clear" ? inner : box;
  }

  function fillBackground(g, box) {
    const mode = val("bg");
    clipIcon(g, box);
    if (mode !== "clear") {
      const ang = num("ang") * Math.PI / 180;
      const cx = box.x+box.w/2, cy = box.y+box.h/2;
      const L = Math.hypot(box.w, box.h)/2;
      const grad = g.createLinearGradient(cx-Math.cos(ang)*L, cy-Math.sin(ang)*L, cx+Math.cos(ang)*L, cy+Math.sin(ang)*L);
      grad.addColorStop(0, colorValue("c1"));
      if (mode === "grad3") grad.addColorStop(.5, colorValue("c2"));
      grad.addColorStop(1, colorValue(mode === "solid" ? "c1" : mode === "grad3" ? "c3" : "c2"));
      g.fillStyle = grad;
      g.fill();
    }
    if (mode !== "clear") paintGrain(g, box, num("noise"));
  }

  const grainTile = { key: "", c: null };
  function paintGrain(g, box, n) {
    if (n <= 0) return;
    const key = n + ":" + Math.round(box.w) + ":" + Math.round(box.h);
    if (grainTile.key !== key) {
      const cnv = document.createElement("canvas");
      cnv.width = Math.max(8, Math.round(box.w));
      cnv.height = Math.max(8, Math.round(box.h));
      const o = cnv.getContext("2d");
      const count = Math.round(n * 160);
      const boost = n / 40;
      for (let i = 0; i < count; i++) {
        const dark = seeded(i + 17) > 0.5;
        const a = (0.1 + seeded(i) * 0.3) * boost;
        o.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
        const s = seeded(i + 4) > 0.75 ? 3 : 2;
        o.fillRect(seeded(i + 3) * cnv.width, seeded(i + 9) * cnv.height, s, s);
      }
      grainTile.key = key; grainTile.c = cnv;
    }
    g.drawImage(grainTile.c, box.x, box.y, box.w, box.h);
  }

  function activeLayer() { return state.layers[state.active] || null; }

  function layerColor(L, a) {
    const hex = (L.color && /^#[0-9a-fA-F]{6}$/.test(L.color)) ? L.color : "#000000";
    return hexAlpha(hex, a);
  }

  function applyContentShadows(g, drawFn) {
    const list = state.layers.filter((L) => L.on && L.target === "content" && L.alpha > 0);
    const outers = list.filter((L) => !INSET.has(L.type));
    const insets = list.filter((L) => INSET.has(L.type));
    outers.forEach((L) => {
      g.save();
      const a = L.alpha / 100;
      const glow = L.type === "glow" || L.type === "neon";
      g.shadowColor = layerColor(L, a);
      g.shadowBlur = glow ? Math.max(14, L.blur * 2.8) : L.blur * 2;
      g.shadowOffsetX = L.sx * 2;
      g.shadowOffsetY = L.sy * 2;
      drawFn(g);
      if (DUAL.has(L.type)) {
        g.shadowColor = hexAlpha("#ffffff", Math.min(0.65, a + 0.15));
        g.shadowOffsetX = -L.sx * 2;
        g.shadowOffsetY = -L.sy * 2;
        drawFn(g);
      }
      g.restore();
    });
    clearShadow(g);
    drawFn(g);
    if (insets.length) paintContentInsets(g, insets, drawFn);
    clearShadow(g);
  }

  function paintContentInsets(g, insets, drawFn) {
    const src = document.createElement("canvas");
    src.width = src.height = SIZE;
    drawFn(src.getContext("2d"));
    const inv = document.createElement("canvas");
    inv.width = inv.height = SIZE;
    const iv = inv.getContext("2d");
    iv.fillStyle = "#000";
    iv.fillRect(0, 0, SIZE, SIZE);
    iv.globalCompositeOperation = "destination-out";
    iv.drawImage(src, 0, 0);
    insets.forEach((L) => {
      const a = L.alpha / 100;
      const pass = (color, ox, oy) => {
        const sh = document.createElement("canvas");
        sh.width = sh.height = SIZE;
        const h = sh.getContext("2d");
        h.shadowColor = color;
        h.shadowBlur = Math.max(8, L.blur * 1.8);
        h.shadowOffsetX = ox;
        h.shadowOffsetY = oy;
        h.drawImage(inv, 0, 0);
        h.globalCompositeOperation = "destination-in";
        clearShadow(h);
        h.drawImage(src, 0, 0);
        g.drawImage(sh, 0, 0);
      };
      pass(layerColor(L, a), L.sx * 2, L.sy * 2);
      if (L.type === "neuIn" || L.type === "clay") {
        pass(hexAlpha("#ffffff", a * 0.55), -L.sx * 2, -L.sy * 2);
      }
    });
  }

  function applyFrameLayer(g, box, L) {
    const a = L.alpha/100;
    if (a <= 0) return;
    g.save();
    clearShadow(g);
    const blur = (L.type === "hard" || L.type === "crisp") ? Math.max(0, L.blur) : L.blur * 2;
    if (DUAL.has(L.type)) {
      g.shadowColor = hexAlpha("#000000", a);
      g.shadowBlur = blur;
      g.shadowOffsetX = L.sx * 2; g.shadowOffsetY = L.sy * 2;
      clipIcon(g, box); g.fillStyle = "#000"; g.fill();
      g.shadowColor = hexAlpha("#ffffff", Math.min(0.7, a + 0.2));
      g.shadowOffsetX = -L.sx * 2; g.shadowOffsetY = -L.sy * 2;
      clipIcon(g, box); g.fill();
    } else if (L.type === "glow" || L.type === "neon") {
      g.shadowColor = layerColor(L, a);
      g.shadowBlur = Math.max(10, L.blur * 2.6);
      g.shadowOffsetX = L.sx; g.shadowOffsetY = L.sy;
      clipIcon(g, box); g.fillStyle = layerColor(L, Math.min(0.4, a)); g.fill();
    } else {
      g.shadowColor = layerColor(L, a);
      g.shadowBlur = blur;
      g.shadowOffsetX = L.sx * 2; g.shadowOffsetY = L.sy * 2;
      clipIcon(g, box); g.fillStyle = "#000"; g.fill();
    }
    g.restore();
  }

  function punchShape(g, box) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    clearShadow(g);
    clipIcon(g, box);
    g.fillStyle = "#000";
    g.fill();
    g.restore();
  }

  function applyInsetLayer(g, box, L) {
    const a = L.alpha/100;
    if (a <= 0) return;
    const ring = (color, ox, oy) => {
      g.save();
      addIconPath(g, box, true);
      g.clip();
      g.shadowColor = color;
      g.shadowBlur = Math.max(10, L.blur * 1.6);
      g.shadowOffsetX = ox;
      g.shadowOffsetY = oy;
      g.fillStyle = "#000";
      g.beginPath();
      g.rect(-SIZE, -SIZE, SIZE * 3, SIZE * 3);
      addIconPath(g, box, false);
      g.fill("evenodd");
      g.restore();
    };
    ring(layerColor(L, a), L.sx * 2, L.sy * 2);
    if (L.type === "neuIn" || L.type === "clay") {
      ring(hexAlpha("#ffffff", a * 0.5), -L.sx * 2, -L.sy * 2);
    }
  }

  function clearShadow(g) {
    g.shadowColor = "transparent"; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  }

  function colorPaint(g, w, h, mode, colors, angle) {
    if (mode === "solid" || mode === "1") return colors[0];
    const a = angle * Math.PI / 180, d = Math.hypot(w, h) / 2;
    const grad = g.createLinearGradient(w/2-Math.cos(a)*d, h/2-Math.sin(a)*d, w/2+Math.cos(a)*d, h/2+Math.sin(a)*d);
    grad.addColorStop(0, colors[0]);
    const three = mode === "grad3" || mode === "3";
    if (three) grad.addColorStop(.5, colors[1]);
    grad.addColorStop(1, three ? colors[2] : colors[1]);
    return grad;
  }

  function starPath(g, cx, cy, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i*Math.PI/5 - Math.PI/2, rr = i%2 ? r*.42 : r;
      i ? g.lineTo(cx+Math.cos(rad)*rr, cy+Math.sin(rad)*rr) : g.moveTo(cx+Math.cos(rad)*rr, cy+Math.sin(rad)*rr);
    }
    g.closePath();
  }

  const sourceCache = new WeakMap();
  function paintLayerSource(layer) {
    const key = JSON.stringify([layer.asset, layer.kind, layer.size, layer.letters, layer.letters2, layer.size2, layer.gap2, layer.font, layer.ink, layer.ink2, layer.inkMode, layer.inkAng, layer.keepSvg, layer.symbol, layer.colorBases]);
    const cached = sourceCache.get(layer);
    if (cached && cached.key === key) return cached.canvas;
    const size = Math.max(12, layer.size || 220);
    const cnv = document.createElement("canvas");
    const img = layer.img;
    if (layer.kind === "text") {
      const measure = cnv.getContext("2d");
      measure.font = `700 ${size}px ${layer.font}`;
      let width = measure.measureText(layer.letters || " ").width;
      measure.font = `600 ${layer.size2}px ${layer.font}`;
      width = Math.max(width, layer.letters2 ? measure.measureText(layer.letters2).width : 0);
      cnv.width = Math.min(2048, Math.ceil(width + size * .35));
      cnv.height = Math.ceil(size * 1.4 + (layer.letters2 ? layer.size2 * 1.4 + layer.gap2 : 0));
    } else if (img) {
      const ratio = img.naturalWidth / img.naturalHeight || img.width / img.height || 1;
      cnv.width = Math.max(1, Math.round(ratio >= 1 ? size : size * ratio));
      cnv.height = Math.max(1, Math.round(ratio >= 1 ? size / ratio : size));
    } else cnv.width = cnv.height = Math.ceil(size * 1.4);
    const o = cnv.getContext("2d");
    const paint = colorPaint(o, cnv.width, cnv.height, layer.inkMode, [layerColorValue(layer,"ink"), layerColorValue(layer,"ink2")], layer.inkAng);
    if (layer.kind === "text") {
      o.fillStyle = paint;
      o.textAlign = "center"; o.textBaseline = "middle";
      o.font = `700 ${size}px ${layer.font}`;
      o.fillText(layer.letters || " ", cnv.width / 2, size * .7, cnv.width - size * .2);
      if (layer.letters2 && layer.size2 > 0) {
        o.font = `600 ${layer.size2}px ${layer.font}`;
        o.fillText(layer.letters2, cnv.width / 2, size * 1.4 + layer.gap2 + layer.size2 * .7, cnv.width - size * .2);
      }
    } else if (img) {
      o.drawImage(img, 0, 0, cnv.width, cnv.height);
      if (layer.kind === "svg" && !layer.keepSvg) {
        o.globalCompositeOperation = "source-in";
        o.fillStyle = paint; o.fillRect(0, 0, cnv.width, cnv.height);
      }
    } else if (layer.kind === "symbol") paintSymbol(o, layer.symbol, cnv.width / 2, cnv.height / 2, size, paint);
    sourceCache.set(layer, { key, canvas: cnv });
    return cnv;
  }
  const plateCache = new WeakMap();
  function layerPlate(layer) {
    const src = paintLayerSource(layer);
    const key = JSON.stringify([layer.zoom, layer.edge, layer.edgeMode, layer.edge1, layer.edge2, layer.edge3, layer.edgeAng, layer.colorBases]);
    const cached = plateCache.get(layer);
    if (cached && cached.src === src && cached.key === key) return cached.plate;
    const z = (layer.zoom ?? 100) / 100;
    const w = src.width * z, h = src.height * z, edge = layer.edge || 0, pad = Math.ceil(edge + 2);
    const plate = document.createElement("canvas");
    const logicalW = Math.ceil(w + pad * 2), logicalH = Math.ceil(h + pad * 2);
    const rasterScale = Math.min(1, 2048 / Math.max(logicalW, logicalH));
    plate.width = Math.ceil(logicalW * rasterScale); plate.height = Math.ceil(logicalH * rasterScale);
    const p = plate.getContext("2d"); p.scale(rasterScale, rasterScale);
    if (edge > 0) {
      for (let r = 1; r <= Math.ceil(edge / 3); r++) {
        const radius = Math.min(edge, r * 3);
        for (let i = 0; i < 32; i++) {
          const a = i * Math.PI / 16;
          p.drawImage(src, pad + Math.cos(a) * radius, pad + Math.sin(a) * radius, w, h);
        }
      }
      p.globalCompositeOperation = "source-in";
      p.fillStyle = colorPaint(p, logicalW, logicalH, layer.edgeMode, ["edge1","edge2","edge3"].map(id=>layerColorValue(layer,id)), layer.edgeAng);
      p.fillRect(0, 0, logicalW, logicalH);
      p.globalCompositeOperation = "source-over";
    }
    p.drawImage(src, pad, pad, w, h);
    const result = {canvas:plate, w:logicalW, h:logicalH};
    plateCache.set(layer, { src, key, plate:result });
    return result;
  }
  function drawStackItem(g, box, layer) {
    if (!layer || layer.on === false) return;
    const plate = layerPlate(layer);
    const cx = box.x + box.w * (layer.px / 100), cy = box.y + box.h * (layer.py / 100);
    g.save();
    g.translate(cx, cy); g.rotate(layer.rot * Math.PI / 180);
    g.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
    g.globalAlpha = layer.alpha / 100;
    if (layer.shadow > 0) { g.shadowColor = layerColorValue(layer,"lyShadowColor","shadowColor"); g.shadowBlur = layer.shadow; }
    const paint = (out) => out.drawImage(plate.canvas, -plate.w / 2, -plate.h / 2, plate.w, plate.h);
    paint(g);
    g.restore();
  }
  function selectedLayer() { return state.stack[state.pick] || null; }
  const PICK_FIELDS = { letters:"letters", letters2:"letters2", font:"font", size:"size", size2:"size2", gap2:"gap2", alpha:"alpha", ink:"ink", ink2:"ink2", inkMode:"inkMode", inkAng:"inkAng", zoom:"zoom", px:"px", py:"py", rot:"rot", flipH:"flipH", flipV:"flipV", keepSvg:"keepSvg", edge:"edge", edgeMode:"edgeMode", edge1:"edge1", edge2:"edge2", edge3:"edge3", edgeAng:"edgeAng", lyShadow:"shadow", lyShadowColor:"shadowColor" };
  function loadPick() {
    const layer = selectedLayer();
    $("layerEdit").hidden = !layer;
    $("center").disabled = !layer;
    $("autoInk").disabled = !layer || layer.kind === "photo";
    $("selectionStatus").textContent = layer ? `Đang sửa lớp ${state.pick + 1}: ${layer.kind === "text" ? "Chữ" : layer.kind === "symbol" ? "Ký hiệu" : layer.kind === "svg" ? "SVG" : "Ảnh"}` : "Chưa có lớp. Bấm Ảnh, SVG hoặc Chữ để thêm.";
    Object.entries(PICK_FIELDS).forEach(([id, key]) => {
      const el = $(id); el.disabled = !layer;
      if (!layer) return;
      if (el.type === "checkbox") el.checked = !!layer[key]; else el.value = layer[key];
    });
    ["letters","letters2","size2","gap2","font"].forEach(id => $(id).closest("label").hidden = !layer || layer.kind !== "text");
    ["ink","ink2","inkMode","inkAng"].forEach(id => $(id).closest("label").hidden = !layer || layer.kind === "photo");
    $("keepSvg").closest("label").hidden = !layer || layer.kind !== "svg";
    $("font").style.fontFamily = val("font");
    if (layer) Object.keys(PICK_FIELDS).filter(id => $(id).type === "color").forEach(id => { colorBases[id] = normalizeColorSetting(layer.colorBases?.[id],val(id)); });
    syncColorControls(); syncUI();
  }
  function writePick(id) {
    const layer = selectedLayer(), key = PICK_FIELDS[id];
    if (!layer || !key) return;
    const el = $(id);
    layer[key] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
    if (el.type === "color") layer.colorBases[id] = { ...colorBases[id] };
    if (id === "letters") renderStack();
  }
  function moveStack(from, to) {
    if (from === to || from < 0 || to < 0 || from >= state.stack.length || to >= state.stack.length) return;
    const [layer] = state.stack.splice(from, 1);
    state.stack.splice(to, 0, layer);
    state.pick = to;
    renderStack(); loadPick(); draw(); pushHist();
  }
  function renderStack() {
    const box = $("stack"); box.replaceChildren();
    state.stack.forEach((layer, i) => {
      const row = document.createElement("div"); row.className = "layer content-layer" + (i === state.pick ? " on-edit" : "");
      const select = document.createElement("button"); select.type = "button";
      select.className = "layer-name"; select.textContent = `${i + 1}. ${layer.kind === "text" ? layer.letters || "Chữ" : layer.kind === "symbol" ? layer.symbol : layer.kind === "svg" ? "SVG" : "Ảnh"}`;
      select.onclick = () => { state.pick = i; renderStack(); loadPick(); persist(); };
      row.append(select);
      [["↑", "Đưa xuống dưới", () => moveStack(i, i - 1), i === 0], ["↓", "Đưa lên trên", () => moveStack(i, i + 1), i === state.stack.length - 1], ["✕", "Xóa lớp", () => { state.stack.splice(i, 1); state.pick = Math.min(state.pick, state.stack.length - 1); renderStack(); loadPick(); draw(); pushHist(); }, false]].forEach(([text, title, click, disabled]) => {
        const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.title = title; button.setAttribute("aria-label", title); button.disabled = disabled; button.onclick = click; row.append(button);
      });
      box.append(row);
    });
  }
  function layerDefaults() {
    return { kind:"text", letters:"S", letters2:"", font:val("font"), size:220, size2:96, gap2:8, ink:"#5ac8fa", ink2:"#007aff", inkMode:"solid", inkAng:90, zoom:100, alpha:100, shadow:0, shadowColor:"#000000", edge:0, edgeMode:"1", edge1:"#ffffff", edge2:"#5ac8fa", edge3:"#ff9f0a", edgeAng:45, px:50, py:50, rot:0, flipH:false, flipV:false, keepSvg:false, on:true, colorBases:{} };
  }
  function keepLayer(kind, img, asset) {
    const layer = { ...layerDefaults(), kind, img:img || null, asset:asset || null };
    if (kind === "photo") layer.size = 700;
    state.stack.push(layer); state.pick = state.stack.length - 1;
    renderStack(); loadPick();
    return layer;
  }
  function drawMark(g, box, stack = state.stack) { applyContentShadows(g, out => stack.forEach(layer => drawStackItem(out, box, layer))); }
  function paintSymbol(ctx, m, cx, cy, s, paint) {
    ctx.fillStyle = ctx.strokeStyle = paint; ctx.lineWidth = Math.max(10, s * .08); ctx.lineCap = ctx.lineJoin = "round";
      if (m === "sun") {
        ctx.beginPath(); ctx.arc(cx, cy-s*.08, s*.28, 0, 7); ctx.fill();
        ctx.fillRect(cx-s*.55, cy+s*.32, s*1.1, Math.max(8,s*.05));
      } else if (m === "plus") {
        const t = Math.max(16,s*.18);
        ctx.fillRect(cx-t/2, cy-s/2, t, s); ctx.fillRect(cx-s/2, cy-t/2, s, t);
      } else if (m === "gear") {
        ctx.beginPath(); ctx.arc(cx, cy, s*.22, 0, 7); ctx.stroke();
        for (let i=0;i<8;i++) {
          const t=i/8*Math.PI*2;
          ctx.beginPath();
          ctx.moveTo(cx+Math.cos(t)*s*.3, cy+Math.sin(t)*s*.3);
          ctx.lineTo(cx+Math.cos(t)*s*.42, cy+Math.sin(t)*s*.42); ctx.stroke();
        }
      } else if (m === "mail") {
        const w=s*1.05,h=s*.72;
        ctx.strokeRect(cx-w/2, cy-h/2, w, h);
        ctx.beginPath(); ctx.moveTo(cx-w/2, cy-h/2); ctx.lineTo(cx, cy+h*.08); ctx.lineTo(cx+w/2, cy-h/2); ctx.stroke();
      } else if (m === "phone") {
        roundPath(ctx, cx-s*.24, cy-s*.41, s*.48, s*.82, s*.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy+s*.26, s*.045, 0, 7); ctx.fill();
      } else if (m === "star") { starPath(ctx, cx, cy, s*.48); ctx.fill(); }
      else if (m === "heart") {
        ctx.beginPath();
        ctx.moveTo(cx, cy+s*.2);
        ctx.bezierCurveTo(cx-s, cy-s*.08, cx-s*.45, cy-s*.47, cx, cy-s*.2);
        ctx.bezierCurveTo(cx+s*.45, cy-s*.47, cx+s, cy-s*.08, cx, cy+s*.2);
        ctx.fill();
      }

  }

  let live = false, raf = 0;
  function requestDraw(save) {
    if (raf) { if (save) state._save = true; return; }
    raf = requestAnimationFrame(() => {
      raf = 0;
      draw({ draft: live });
      if (save || state._save) { state._save = false; if (!live) pushHist(); }
    });
  }

  function draw(opt) {
    const draft = opt && opt.draft;
    const target = opt?.canvas || c, ctx = target.getContext("2d");
    ctx.clearRect(0,0,SIZE,SIZE);
    const box = iconBox();
    const pad = num("pad");
    const inner = { x:box.x+pad, y:box.y+pad, w:Math.max(8,box.w-pad*2), h:Math.max(8,box.h-pad*2), r:Math.max(0,box.r-pad*.35) };
    const fb = frameShape(box, inner);
    const outers = state.layers.filter((L) => L.on && L.target === "frame" && !INSET.has(L.type) && L.alpha > 0);
    outers.forEach((L) => applyFrameLayer(ctx, fb, L));
    if (outers.length) punchShape(ctx, fb);
    ctx.save();
    clipIcon(ctx, box); ctx.clip();
    fillBackground(ctx, box);
    if (val("bg") !== "clear" && num("glass")>0) { ctx.fillStyle = `rgba(255,255,255,${num("glass")/100})`; ctx.fillRect(box.x,box.y,box.w,box.h); }
    drawMark(ctx, inner, opt?.stack || state.stack);
    if (val("bg") !== "clear" && !draft && num("noise") > 0) paintGrain(ctx, box, Math.round(num("noise") * 0.45));
    state.layers.forEach((L) => {
      if (L.on && L.target === "frame" && INSET.has(L.type)) applyInsetLayer(ctx, fb, L);
    });
    if (num("stroke")>0) {
      ctx.strokeStyle = colorPaint(ctx, SIZE, SIZE, val("frameMode"), ["frame1","frame2","frame3"].map(colorValue), num("frameAng"));
      ctx.lineWidth = num("stroke");
      clipIcon(ctx, { x:box.x+num("stroke")/2, y:box.y+num("stroke")/2, w:box.w-num("stroke"), h:box.h-num("stroke"), r:Math.max(0,box.r-num("stroke")/2) });
      ctx.stroke();
    }
    ctx.restore();
    if (target !== c) return;
    const mini = $("mini");
    if (mini) {
      const m = mini.getContext("2d");
      m.clearRect(0,0,180,180);
      m.drawImage(c, 0, 0, 180, 180);
    }
    syncUI();
  }

  function syncUI() {
    document.querySelectorAll("[data-bg-mode]").forEach(button=>{
      const active = button.dataset.bgMode === val("bg");
      button.classList.toggle("on",active); button.setAttribute("aria-pressed",String(active));
    });
    const layer = selectedLayer();
    const map = { lyShadow:"lyShadowVal", frameAng:"frameAngVal", noise:"noiseVal", ang:"angVal", radius:"radiusVal", glass:"glassVal", stroke:"strokeVal", pad:"padVal", sx:"sxVal", sy:"syVal", sblur:"sblurVal", salpha:"salphaVal", size:"sizeVal", size2:"size2Val", gap2:"gap2Val", alpha:"alphaVal", zoom:"zoomVal", px:"pxVal", py:"pyVal", rot:"rotVal", inkAng:"inkAngVal", edge:"edgeVal", edgeAng:"edgeAngVal" };
    const units = { frameAng:"°", ang:"°", inkAng:"°", rot:"°", edgeAng:"°", alpha:"%", zoom:"%" };
    Object.entries(map).forEach(([id, lab]) => { if ($(lab)) $(lab).textContent = $(id).value + (units[id] || ""); });
    $("mockName").textContent = val("label") || "Icon";
    $("mock").className = "mock" + (on("mockOn") ? ` wall-${val("wall")}` : " off");
    if (val("wall")==="ios" && on("mockOn")) $("mock").className = "mock wall-ios";
    $("safe").hidden = !on("safeOn");
    c.style.borderRadius = "0";
    const mode = val("edgeMode") || "1";
    if ($("edge2wrap")) $("edge2wrap").hidden = mode === "1";
    if ($("edge3wrap")) $("edge3wrap").hidden = mode !== "3";
    if ($("edgeAngWrap")) $("edgeAngWrap").hidden = mode === "1";
    ["c1","c2","c3"].forEach((id, i) => $(id).closest("label").hidden = val("bg") === "clear" || (i === 1 && val("bg") === "solid") || (i === 2 && val("bg") !== "grad3"));
    ["ang","noise","glass"].forEach(id => $(id).disabled = val("bg") === "clear");
    $("ang").closest("label").hidden = ["solid","clear"].includes(val("bg"));
    $("opaque").disabled = val("bg") === "clear";
    $("ink2").closest("label").hidden = !layer || layer.kind === "photo" || val("inkMode") === "solid";
    $("inkAng").closest("label").hidden = !layer || layer.kind === "photo" || val("inkMode") === "solid";
    ["frame2","frame3"].forEach((id, i) => $(id).closest("label").hidden = val("frameMode") === "solid" || (i === 1 && val("frameMode") !== "grad3"));
    $("frameAng").closest("label").hidden = val("frameMode") === "solid";
    if ($("undo")) $("undo").disabled = hist.i <= 0;
    if ($("redo")) $("redo").disabled = hist.i >= hist.stack.length - 1;
    const w = $("warn");
    const issues = [];
    if (val("bg") === "clear" && !on("opaque")) issues.push("PNG trong suốt — iOS dễ ra nền đen.");
    const room = SIZE / 2 - Math.max(num("pad"), SIZE * 0.1);
    if (layer?.kind === "text" && num("size") / 2 + 24 > room) issues.push("Chữ sát mép safe zone 80%.");
    if (["photo","svg"].includes(layer?.kind) && num("zoom") > 130 && num("pad") < 40) issues.push("Ảnh phóng lớn, iOS sẽ cắt squircle.");
    if (["text","symbol"].includes(layer?.kind)) {
      const ok = Math.abs(lum(val("c1"))-lum(val("ink"))) > .28;
      if (!ok && val("bg") !== "clear") issues.push("Chữ/nền tương phản thấp.");
    }
    w.hidden = !issues.length;
    w.textContent = issues[0] || "";
    syncColorControls();
  }

  function readForm() {
    const o = {};
    FIELDS.forEach((id) => {
      const el = $(id); if (!el) return;
      o[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    o.stack = state.stack.map(({img, ...layer}) => clone(layer));
    o.pick = state.pick;
    o.colors = clone(colorBases);
    o.layers = clone(state.layers);
    o.active = state.active;
    o.seq = state.seq;
    return o;
  }
  function writeForm(o) {
    hist.lock = true;
    FIELDS.forEach((id) => {
      const el = $(id); if (!el || o[id] == null) return;
      if (el.type === "checkbox") el.checked = !!o[id]; else el.value = o[id];
    });
    if (o.layers) state.layers = o.layers.map(migrateShadowColor);
    if (o.active != null) state.active = o.active;
    if (o.seq) state.seq = o.seq;
    if (!o.stack) o = { ...o, stack:legacyStack(o), pick:0 };
    if (o.stack) state.stack = o.stack.map(layer => ({ ...layerDefaults(), ...migrateLayerColors(layer), img:assets.get(layer.asset)?.img || null }));
    if (o.pick != null) state.pick = Math.max(-1, Math.min(o.pick, state.stack.length - 1));
    if (o.colors) Object.entries(o.colors).forEach(([id,entry])=>{
      if (!$(id) || $(id).type !== "color") return;
      const setting = normalizeColorSetting(entry,val(id));
      if (entry.mode !== "opacity") $(id).value = setting.base;
      colorBases[id] = setting;
    });
    hist.lock = false;
    renderStack(); loadPick();
    renderLayers();
    loadLayerToSliders();
  }
  function pushHist() {
    if (hist.lock) return;
    const snap = JSON.stringify(readForm());
    if (hist.stack[hist.i] === snap) return;
    hist.stack = hist.stack.slice(0, hist.i+1);
    hist.stack.push(snap);
    if (hist.stack.length > 40) hist.stack.shift();
    hist.i = hist.stack.length-1;
    persist(); syncUI();
  }
  function undo() { if (hist.i<=0) return; hist.i--; writeForm(JSON.parse(hist.stack[hist.i])); draw(); persist(); }
  function redo() { if (hist.i>=hist.stack.length-1) return; hist.i++; writeForm(JSON.parse(hist.stack[hist.i])); draw(); persist(); }

  function addLayer(type) {
    const p = PRESETS[type] || PRESETS.outer;
    const L = {
      id: state.seq++, type, on: true,
      target: INSET.has(type) ? "frame" : "frame",
      sx: p.sx, sy: p.sy, blur: p.sblur, alpha: p.salpha,
      color: (type === "neon" || type === "glow") ? val("ink") : "#000000"
    };
    if (type === "glow" || type === "neon") L.target = "content";
    state.layers.push(L);
    state.active = state.layers.length - 1;
    renderLayers();
    loadLayerToSliders();
    draw(); pushHist();
  }

  function loadLayerToSliders() {
    const L = activeLayer();
    if (!L) return;
    hist.lock = true;
    $("sx").value = L.sx; $("sy").value = L.sy;
    $("sblur").value = L.blur; $("salpha").value = L.alpha;
    $("scolor").value = L.color;
    $("layerTarget").value = L.target;
    colorBases.scolor = normalizeColorSetting(L.colorBase,L.color);
    syncColorControls();
    hist.lock = false;
    syncUI();
  }

  function saveSlidersToLayer() {
    const L = activeLayer();
    if (!L || hist.lock) return;
    L.sx = num("sx"); L.sy = num("sy");
    L.blur = num("sblur"); L.alpha = num("salpha");
    L.color = val("scolor");
    L.colorBase = clone(colorBases.scolor);
    L.target = val("layerTarget");
  }

  function renderLayers() {
    const box = $("layerList");
    if (!box) return;
    box.innerHTML = state.layers.map((L, i) =>
      `<div class="layer${i===state.active?" on-edit":""}" data-i="${i}">
        <input type="checkbox" ${L.on?"checked":""} data-act="on">
        <span>${NAMES[L.type]||L.type} · ${L.target==="content"?"nội dung":"khung"}</span>
        <button type="button" data-act="del">✕</button>
      </div>`
    ).join("") || `<p class="note">Chưa có lớp. Thêm từ menu trên.</p>`;
    box.querySelectorAll(".layer").forEach((row) => {
      const i = +row.dataset.i;
      row.addEventListener("click", (e) => {
        if (e.target.dataset.act === "on") {
          state.layers[i].on = e.target.checked; draw(); pushHist(); return;
        }
        if (e.target.dataset.act === "del") {
          state.layers.splice(i,1);
          state.active = Math.min(state.active, state.layers.length-1);
          renderLayers(); loadLayerToSliders(); draw(); pushHist(); return;
        }
        state.active = i; renderLayers(); loadLayerToSliders();
      });
    });
  }

  function canvasBlob() { return new Promise((r) => c.toBlob(r, "image/png")); }
  function scaledBlob(px, flat, source = c) {
    const s = document.createElement("canvas");
    s.width = s.height = px;
    const g = s.getContext("2d");
    if (flat && val("bg") !== "clear") { g.fillStyle = val("c1"); g.fillRect(0,0,px,px); }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(source, 0, 0, px, px);
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

  function dosStamp(date) {
    const d = date || new Date();
    const time = (d.getHours()<<11) | (d.getMinutes()<<5) | (d.getSeconds()>>1);
    const day = ((d.getFullYear()-1980)<<9) | ((d.getMonth()+1)<<5) | d.getDate();
    return [time & 255, time>>>8, day & 255, day>>>8];
  }
  async function zipBlobs(files) {
    const parts = [], central = [];
    let offset = 0;
    const stamp = dosStamp(new Date());
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const name = new TextEncoder().encode(f.name);
      const crc = crc32(data);
      const local = new Uint8Array([
        0x50,0x4b,0x03,0x04, 20,0, 0,8, 0,0, ...stamp,
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), 0,0
      ]);
      parts.push(local, name, data);
      const cen = new Uint8Array([
        0x50,0x4b,0x01,0x02, 0x1e,3, 20,0, 0,8, 0,0, ...stamp,
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), 0,0,0,0, 0,0, 0,0, 0,0,0,0,
        ...u32(offset)
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

  async function svgMarkup() {
    draw();
    const blob = await scaledBlob(SIZE, false);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const image = `<image href="data:image/png;base64,${btoa(bin)}" x="0" y="0" width="1024" height="1024"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${image}</svg>`;
  }

  async function shareOrDownload(name, blob) {
    const type = /\.zip$/i.test(name) ? "application/zip" : (blob.type || "application/octet-stream");
    const file = new File([blob], name, { type });
    try {
      if (navigator.canShare && navigator.canShare({ files:[file] })) {
        await navigator.share({ files:[file] });
        return;
      }
    } catch (e) { if (e && e.name==="AbortError") return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function slug() {
    const lab = val("label");
    if (lab && lab !== "Icon") return fileSlug(lab);
    return fileSlug(val("fileBase") || "icon-home-screen");
  }
  function fileSlug(s) {
    return String(s || "icon").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "icon";
  }

  async function exportPng(px, share) {
    draw();
    const blob = await scaledBlob(px, on("opaque"));
    const name = px === SIZE ? `${slug()}.png` : `${slug()}-${px}.png`;
    if (share) { await shareOrDownload(name, blob); showTip(); }
    else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      showTip();
    }
  }


  function xmlEscape(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID().toUpperCase();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(b => b.toString(16).padStart(2,"0")).join("");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`.toUpperCase();
  }
  async function exportConfig() {
    const name = ($("clipName").value || val("label") || "Icon").trim();
    const desc = ($("clipDesc").value || name).trim();
    let url = ($("clipUrl").value || "").trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) { alert("URL cần có scheme, ví dụ https://, shortcuts://, zalo://"); return; }
    draw();
    const blob = await scaledBlob(180, true);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    const id = uuid();
    const clip = uuid();
    const org = "Sentechtipsvn";
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadDisplayName</key>
  <string>${xmlEscape(name)}</string>
  <key>PayloadDescription</key>
  <string>${xmlEscape(desc)}</string>
  <key>PayloadIdentifier</key>
  <string>com.sentechtipsvn.${id}</string>
  <key>PayloadOrganization</key>
  <string>${org}</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${id}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadDisplayName</key>
      <string>${xmlEscape(name)}</string>
      <key>PayloadDescription</key>
      <string>${xmlEscape(desc)}</string>
      <key>PayloadOrganization</key>
      <string>${org}</string>
      <key>PayloadIdentifier</key>
      <string>com.sentechtipsvn.webclip.${clip}</string>
      <key>PayloadUUID</key>
      <string>${clip}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Label</key>
      <string>${xmlEscape(name)}</string>
      <key>URL</key>
      <string>${xmlEscape(url)}</string>
      <key>Icon</key>
      <data>${b64}</data>
      <key>IsRemovable</key>
      <true/>
      <key>FullScreen</key>
      <true/>
      <key>Precomposed</key>
      <true/>
    </dict>
  </array>
</dict>
</plist>`;
    const file = new Blob([xml], { type: "application/x-apple-aspen-config" });
    await shareOrDownload(`${fileSlug(name)}.mobileconfig`, file);
  }

  const RUNS = "icontool-runs";
  function loadRuns() { try { return JSON.parse(localStorage.getItem(RUNS) || "[]"); } catch { return []; } }
  function fillRuns() {
    const box = $("runSaved"); if (!box) return;
    const cur = box.value;
    box.replaceChildren();
    const first = document.createElement("option");
    first.value = ""; first.textContent = "Chọn tên đã lưu";
    box.appendChild(first);
    loadRuns().forEach((x) => {
      const o = document.createElement("option");
      o.value = x.name; o.textContent = x.name;
      box.appendChild(o);
    });
    box.value = cur;
  }
  async function iconB64(px) {
    draw();
    const blob = await scaledBlob(Math.max(16, Math.min(180, px || 60)), true);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  async function saveRunName() {
    const name = ($("runName").value || val("label") || "").trim();
    if (!name) { alert("Nhập tên phím tắt"); return; }
    const size = +$("runSize").value || 60;
    const icon = await iconB64(size);
    const list = loadRuns().filter((x) => x.name !== name);
    list.unshift({ name, size, icon });
    localStorage.setItem(RUNS, JSON.stringify(list.slice(0, 24)));
    fillRuns();
    $("runSaved").value = name;
  }
  async function iconText(px) {
    draw();
    const size = Math.max(16, Math.min(180, px || 60));
    const blob = await scaledBlob(size, true);
    const img = await createImageBitmap(blob);
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = size;
    cnv.getContext("2d").drawImage(img, 0, 0, size, size);
    const jpg = await new Promise((ok) => cnv.toBlob(ok, "image/jpeg", 0.7));
    const bytes = new Uint8Array(await jpg.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  async function runShortcut() {
    const name = ($("runName").value || $("runSaved").value || "").trim();
    if (!name) { alert("Nhập tên phím tắt"); return; }
    const text = await iconText(+$("runSize").value || 60);
    location.href = "shortcuts://x-callback-url/run-shortcut?name=" + encodeURIComponent(name) + "&input=text&text=" + encodeURIComponent(text);
  }
  async function exportZip() {
    draw();
    const sizes = [1024,180,167,152,120];
    const files = [];
    const base = slug();
    for (const s of sizes) files.push({ name: s===1024 ? `${base}.png` : `${base}-${s}.png`, blob: await scaledBlob(s, on("opaque")) });
    files.push({ name: `${base}.svg`, blob: new Blob([await svgMarkup()], { type:"image/svg+xml" }) });
    await shareOrDownload(`${base}-ios.zip`, await zipBlobs(files));
    showTip();
  }

  function loadFile(file, kind) {
    if (!file) return;
    const isSvg = kind === "svg" || (file.type||"").includes("svg") || /\.svg$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const asset = uuid(); assets.set(asset, { img, data:reader.result });
        keepLayer(isSvg ? "svg" : "photo", img, asset);
        $("px").value = 50; $("py").value = 50; $("rot").value = 0;
        draw(); pushHist();
      };
      img.onerror = () => alert("Không đọc được file");
      img.src = reader.result;
    };
    reader.onerror = () => alert("Không đọc được tệp. Vui lòng chọn lại.");
    reader.readAsDataURL(file);
    ["file","fileCam","filePhoto","fileSvg"].forEach((id) => { if ($(id)) $(id).value = ""; });
  }

  const TITLES = { bg:"Nền · Bo góc · Kính", shadow:"Đổ bóng", media:"Chữ · Ảnh · SVG", home:"Màn hình chính", export:"Xuất file" };

  function placeSheet() {
    const mock = $("mock");
    if (!mock) return;
    if (window.matchMedia && window.matchMedia("(min-width: 768px), (max-width: 767px) and (orientation: landscape)").matches) {
      sheet.style.removeProperty("top"); sheet.style.removeProperty("bottom"); return;
    }
    const edge = mock.getBoundingClientRect().bottom;
    sheet.style.top = Math.ceil(edge) + "px";
    const vv = window.visualViewport;
    if (vv) {
      const inset = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      sheet.style.bottom = Math.max(8, inset + 8) + "px";
    }
  }
  function openPane(id) {
    $("sheetTitle").textContent = TITLES[id] || id;
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === id));
    document.querySelectorAll(".rail button").forEach((b) => b.classList.toggle("on", b.dataset.panel === id));
    sheet.hidden = false;
    sheet.classList.remove("ghost");
    placeSheet();
    requestAnimationFrame(() => { placeSheet(); sheet.classList.add("open"); });
  }
  function closeSheet() {
    sheet.classList.remove("open", "ghost");
    document.querySelectorAll(".rail button").forEach((b) => b.classList.remove("on"));
    setTimeout(() => { if (!sheet.classList.contains("open")) sheet.hidden = true; }, 340);
  }

  function bind() {
    document.querySelectorAll("input,select").forEach((el) => {
      if (el.type === "file" || el.dataset.tone || el.id === "symQ") return;
      el.addEventListener("input", () => {
        if (el.id === "addLayer") {
          if (el.value) { addLayer(el.value); el.value = ""; }
          return;
        }
        if (el.id === "scolor") resetColorBase("scolor");
        if (["sx","sy","sblur","salpha","scolor","layerTarget"].includes(el.id)) saveSlidersToLayer();
        if (PICK_FIELDS[el.id]) { if (el.type === "color") resetColorBase(el.id); writePick(el.id); }
        else if (el.type === "color") resetColorBase(el.id);
        if (el.id === "bg" && val("bg") === "clear") $("opaque").checked = false;

        requestDraw(false);
      });
      el.addEventListener("change", () => { if (el.type !== "file") pushHist(); });
    });
    document.querySelectorAll("input[type=range], input[type=color]").forEach((el) => {
      const dim = () => { live = true; sheet.classList.add("ghost"); };
      const undim = () => { live = false; sheet.classList.remove("ghost"); requestDraw(true); };
      el.addEventListener("pointerdown", dim);
      el.addEventListener("touchstart", dim, { passive:true });
      el.addEventListener("pointerup", undim);
      el.addEventListener("touchend", undim);
    });
    document.addEventListener("pointerup", () => sheet.classList.remove("ghost"));
    window.addEventListener("resize", placeSheet);
    window.addEventListener("orientationchange", placeSheet);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", placeSheet);

    document.querySelectorAll(".rail button").forEach((b) => {
      b.onclick = () => {
        if (b.classList.contains("on") && sheet.classList.contains("open")) closeSheet();
        else openPane(b.dataset.panel);
      };
    });
    $("sheetClose").onclick = closeSheet;
    $("bgModes").onclick = event => {
      const button = event.target.closest("[data-bg-mode]"); if (!button) return;
      $("bg").value = button.dataset.bgMode;
      $("bg").dispatchEvent(new Event("input",{bubbles:true}));
      $("bg").dispatchEvent(new Event("change",{bubbles:true}));
    };
    $("pick").onclick = () => $("file").click();
    $("cam").onclick = () => $("fileCam").click();
    $("file").onchange = () => loadFile($("file").files[0]);
    $("fileCam").onchange = () => loadFile($("fileCam").files[0], "photo");
    $("filePhoto").onchange = () => loadFile($("filePhoto").files[0], "photo");
    $("fileSvg").onchange = () => loadFile($("fileSvg").files[0], "svg");
    $("addText").onclick = () => { keepLayer("text"); draw(); pushHist(); };
    $("center").onclick = () => { const layer = selectedLayer(); if (!layer) return; Object.assign(layer, {px:50,py:50,rot:0}); loadPick(); draw(); pushHist(); };

    $("autoInk").onclick = () => { $("ink").value = lum(val("c1")) > .45 ? "#111111" : "#ffffff"; resetColorBase("ink"); writePick("ink"); draw(); pushHist(); };
    $("symQ").addEventListener("input", renderSymbols);
    const fontEl = $("font");
    const paintFont = () => { if (fontEl) fontEl.style.fontFamily = fontEl.value; };
    if (fontEl) { paintFont(); fontEl.addEventListener("change", paintFont); }
    $("undo").onclick = undo; $("redo").onclick = redo;
    $("reset").onclick = () => { writeForm(defaultForm); draw(); pushHist(); };
    $("share1024").onclick = () => exportPng(SIZE, true);
    $("share180").onclick = () => exportPng(180, true);
    $("shareZip").onclick = exportZip;
    $("shareConfig").onclick = () => {
      $("configBox").hidden = false;
      if (!$("clipName").value) $("clipName").value = val("label") || "Icon";
      if (!$("clipUrl").value) $("clipUrl").value = "https://";
    };
    $("saveConfig").onclick = exportConfig;
    $("saveRun").onclick = saveRunName;
    $("runShortcut").onclick = runShortcut;
    $("runSaved").onchange = () => {
      const hit = loadRuns().find((x) => x.name === $("runSaved").value);
      if (!hit) return;
      $("runName").value = hit.name;
      if (hit.size) $("runSize").value = hit.size;
    };
    fillRuns();
    $("shareSvg").onclick = async () => shareOrDownload(`${slug()}.svg`, new Blob([await svgMarkup()], { type:"image/svg+xml" }));
    document.addEventListener("keydown",e=>{ if (e.key === "Escape" && state.drop) $("pickDrop").click(); });
    $("pickDrop").onclick = () => {
      state.drop = !state.drop;
      $("pickDrop").textContent = state.drop ? "Hủy lấy màu" : "Lấy màu";
      $("dropStatus").textContent = state.drop ? "Chạm vào một điểm có màu trên ảnh xem trước." : "Đã hủy lấy màu.";
      sheet.classList.toggle("ghost", state.drop);
    };
    $("saveLib").onclick = saveLib;
    $("saveStyle").onclick = saveStyle;
    $("applyStyle").onclick = applySavedStyle;
    $("snapA").onclick = () => snapAB("abAc");
    $("snapB").onclick = () => snapAB("abBc");
    $("abA").onclick = () => { state.abPick = "a"; markAB(); };
    $("abB").onclick = () => { state.abPick = "b"; markAB(); };
    $("kitN").addEventListener("change", renderKit);
    $("exportKit").onclick = exportKit;
    $("fileKit").onchange = () => loadKitFile($("fileKit").files[0]);
    $("styles").addEventListener("click", (e) => {
      const b = e.target.closest("[data-style]");
      if (b) applyPack(b.dataset.style);
    });

    const pointers = new Map();
    let gesture = null;
    const beginGesture = () => {
      const layer = selectedLayer(); if (!layer || !pointers.size) { gesture = null; return; }
      const pts = [...pointers.values()], a = pts[0], b = pts[1];
      gesture = { layer, px:layer.px, py:layer.py, zoom:layer.zoom, rot:layer.rot, x:b ? (a.x+b.x)/2 : a.x, y:b ? (a.y+b.y)/2 : a.y, dist:b ? Math.hypot(b.x-a.x,b.y-a.y) : 0, angle:b ? Math.atan2(b.y-a.y,b.x-a.x) : 0 };
    };
    c.addEventListener("pointerdown", e => {
      if (state.drop) {
        const r = c.getBoundingClientRect();
        const x = Math.max(0, Math.min(SIZE-1, Math.floor((e.clientX-r.left)/r.width*SIZE)));
        const y = Math.max(0, Math.min(SIZE-1, Math.floor((e.clientY-r.top)/r.height*SIZE)));
        draw();
        const d = ctx.getImageData(x, y, 1, 1).data;
        if (!d[3]) { $("dropStatus").textContent = "Điểm này trong suốt. Chọn điểm có màu nhé."; return; }
        const to = val("dropTo");
        if (PICK_FIELDS[to] && !["text","symbol","svg"].includes(selectedLayer()?.kind)) { $("dropStatus").textContent = "Thêm hoặc chọn lớp chữ/SVG trước khi lấy màu."; return; }
        $(to).value = "#" + [...d].slice(0,3).map(v => v.toString(16).padStart(2,"0")).join("");
        resetColorBase(to); writePick(to);
        state.drop = false; $("pickDrop").textContent = "Lấy màu";
        $("dropStatus").textContent = `Đã gắn ${val(to)} vào ${$("dropTo").selectedOptions[0].textContent}.`;
        sheet.classList.remove("ghost"); draw(); pushHist(); return;
      }
      if (!selectedLayer() || pointers.size >= 2) return;
      c.setPointerCapture(e.pointerId); pointers.set(e.pointerId, {x:e.clientX,y:e.clientY}); beginGesture();
    });
    c.addEventListener("pointermove", e => {
      if (!pointers.has(e.pointerId) || !gesture) return;
      pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
      const pts = [...pointers.values()], a = pts[0], b = pts[1];
      const x = b ? (a.x+b.x)/2 : a.x, y = b ? (a.y+b.y)/2 : a.y;
      const box = iconBox(), r = c.getBoundingClientRect(), innerWidth = Math.max(8,box.w-num("pad")*2);
      const k = SIZE / r.width / innerWidth * 100, layer = gesture.layer;
      layer.px = Math.max(-20,Math.min(120,gesture.px+(x-gesture.x)*k));
      layer.py = Math.max(-20,Math.min(120,gesture.py+(y-gesture.y)*k));
      if (b && gesture.dist > 0) {
        layer.zoom = Math.max(20,Math.min(400,gesture.zoom*Math.hypot(b.x-a.x,b.y-a.y)/gesture.dist));
        const delta = Math.atan2(b.y-a.y,b.x-a.x)-gesture.angle;
        layer.rot = ((gesture.rot+Math.atan2(Math.sin(delta),Math.cos(delta))*180/Math.PI+540)%360)-180;
      }
      live = true; loadPick(); requestDraw(false);
    });
    const endGesture = e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size) { beginGesture(); return; }
      const layer = gesture?.layer;
      if (layer && on("snap")) { if (Math.abs(layer.px-50)<3) layer.px=50; if (Math.abs(layer.py-50)<3) layer.py=50; }
      gesture = null; live = false; loadPick(); draw(); pushHist();
    };
    ["pointerup","pointercancel","lostpointercapture"].forEach(event => c.addEventListener(event, endGesture));

    const stage = $("stage");
    stage.addEventListener("dragover", (e) => e.preventDefault());
    stage.addEventListener("drop", (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
    document.addEventListener("paste", (e) => {
      const f = [...(e.clipboardData?.files||[])][0]; if (f) loadFile(f);
    });
  }

  function applyPack(name) {
    const packs = {
      flat: { glass:0, stroke:0, pad:44, layers: [] },
      glass: { glass:30, stroke:10, pad:52, layers: [{ type:"soft", target:"frame" }] },
      neu: { glass:0, stroke:0, pad:48, layers: [{ type:"neu", target:"frame" }, { type:"neuIn", target:"frame" }] },
      glow: { glass:6, stroke:0, pad:56, layers: [{ type:"glow", target:"content", color: val("ink") }] },
      clay: { glass:0, stroke:0, pad:48, layers: [{ type:"clay", target:"content" }] },
      soft: { glass:10, stroke:4, pad:56, layers: [{ type:"outer", target:"frame" }, { type:"bottom", target:"frame" }] }
    };
    const p = packs[name]; if (!p) return;
    $("glass").value = p.glass; $("stroke").value = p.stroke; $("pad").value = p.pad;
    state.layers = p.layers.map((L) => {
      const pr = PRESETS[L.type] || PRESETS.outer;
      return { id: state.seq++, type: L.type, on: true, target: L.target, sx: pr.sx, sy: pr.sy, blur: pr.sblur, alpha: pr.salpha, color: L.color || "#000000" };
    });
    state.active = state.layers.length ? 0 : -1;
    document.querySelectorAll("#styles [data-style]").forEach((b) => b.classList.toggle("on", b.dataset.style === name));
    renderLayers(); loadLayerToSliders(); draw(); pushHist();
  }

  function readLib() { return libraryItems; }
  async function saveLib() {
    draw();
    const item = { id:uuid(), thumb:c.toDataURL("image/png"), data:readForm() };
    libraryItems.unshift(item); libraryItems = libraryItems.slice(0,20);
    await persist(); renderLib();
  }
  const STYLE_FIELDS = ["glass","stroke","pad","radius","squircle","noise","bg","c1","c2","c3","ang","frameMode","frame1","frame2","frame3","frameAng","ink","ink2","inkMode","inkAng"];
  function saveStyle() {
    const data=readForm(), style={layers:data.layers,colors:data.colors};
    STYLE_FIELDS.forEach(key=>style[key]=data[key]);
    try { localStorage.setItem(STY,JSON.stringify(style)); } catch (error) { storageError(error); }
  }
  function applySavedStyle() {
    try {
      const style=JSON.parse(localStorage.getItem(STY)||"null"); if (!style) return;
      STYLE_FIELDS.forEach(id=>{
        if (style[id] == null) return;
        if ($(id).type === "checkbox") $(id).checked=style[id]; else $(id).value=style[id];
        if ($(id).type === "color") {
          colorBases[id]=normalizeColorSetting(style.colors?.[id],val(id));
          if (style.colors?.[id] && style.colors[id].mode !== "opacity") $(id).value=colorBases[id].base;
        }
        if (PICK_FIELDS[id]) writePick(id);
      });
      if (style.layers) { state.layers=style.layers.map(migrateShadowColor); state.active=0; }
      syncColorControls(); renderLayers(); loadLayerToSliders(); draw(); pushHist();
    } catch (error) { storageError(error); }
  }
  function renderLib() {
    const box = $("lib"); if (!box) return;
    const items = readLib();
    box.innerHTML = items.map((it) =>
      `<button type="button" data-id="${it.id}"><img alt="" src="${it.thumb}"><span data-del="${it.id}">×</span></button>`
    ).join("");
    box.querySelectorAll("button").forEach((b) => {
      b.onclick = (e) => {
        if (e.target.dataset.del) {
          libraryItems = libraryItems.filter(x => String(x.id) !== e.target.dataset.del); persist();
          renderLib(); return;
        }
        const it = readLib().find((x) => String(x.id) === b.dataset.id);
        if (it && it.data) { writeForm(it.data); draw(); pushHist(); }
      };
    });
  }

  function renderSymbols() {
    const box = $("symGrid"); if (!box) return;
    const q = (($("symQ") && $("symQ").value) || "").toLowerCase().trim();
    const list = SYMBOLS.filter((s) => !q || s.q.includes(q) || (s.t && s.t.includes(q)));
    box.innerHTML = list.slice(0, 24).map((s) =>
      `<button type="button" class="sym" data-m="${s.m||""}" data-t="${s.t||""}">${s.t || "●"}</button>`
    ).join("");
    box.querySelectorAll(".sym").forEach((b) => {
      b.onclick = () => {
        let layer = selectedLayer();
        if (!layer || !["text","symbol"].includes(layer.kind)) layer = keepLayer("text");
        layer.kind = b.dataset.m ? "symbol" : "text";
        layer.symbol = b.dataset.m || ""; layer.letters = b.dataset.t || "";
        renderStack(); loadPick();
        draw(); pushHist();
      };
    });
  }

  function snapAB(id) {
    const t = $(id); if (!t) return;
    const g = t.getContext("2d");
    g.clearRect(0,0,160,160);
    g.drawImage(c, 0, 0, 160, 160);
  }
  function markAB() {
    if ($("abA")) $("abA").classList.toggle("on", state.abPick === "a");
    if ($("abB")) $("abB").classList.toggle("on", state.abPick === "b");
  }
  function showTip() {
    const tip = $("tip"); if (!tip) return;
    const name = val("label") || "Icon";
    const url = "shortcuts://run-shortcut?name=" + encodeURIComponent(name);
    $("tipText").textContent = "Đã lưu ảnh. Bấm Chạy phím tắt để gửi icon base64.";
    if (!$("runName").value) $("runName").value = name;
    tip.hidden = false;
  }
  function kitCount() { return Math.max(6, Math.min(12, num("kitN") || 8)); }
  function renderKit() {
    const box = $("kit"); if (!box) return;
    const n = kitCount();
    while (state.kit.length < n) state.kit.push({ name: "", img: null, thumb: "" });
    state.kit = state.kit.slice(0, n);
    box.replaceChildren();
    state.kit.forEach((slot, i) => {
      const el = document.createElement(slot.thumb ? "div" : "button"); el.className = "slot" + (slot.thumb ? "" : " empty"); el.dataset.i = i;
      if (slot.thumb) {
        const img = document.createElement("img"); img.alt = ""; img.src = slot.thumb;
        const input = document.createElement("input"); input.dataset.name = i; input.maxLength = 14; input.value = slot.name; input.placeholder = "Tên MH";
        el.append(img,input);
      } else { el.type = "button"; el.textContent = "+"; }
      box.append(el);
    });
    box.querySelectorAll("[data-i]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return;
        state.kitSlot = +el.dataset.i;
        $("fileKit").click();
      });
    });
    box.querySelectorAll("[data-name]").forEach((inp) => {
      inp.addEventListener("input", () => { state.kit[+inp.dataset.name].name = inp.value; });
    });
  }
  function loadKitFile(file) {
    if (!file || state.kitSlot < 0) return;
    const i = state.kitSlot;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.kit[i].img = img;
        state.kit[i].thumb = reader.result;
        if (!state.kit[i].name) state.kit[i].name = (file.name || "").replace(/\.[^.]+$/, "").slice(0, 14);
        renderKit();
      };
      img.src = reader.result;
    };
    reader.onerror = () => alert("Không đọc được tệp. Vui lòng chọn lại.");
    reader.readAsDataURL(file);
  }
  async function exportKit() {
    const slots = state.kit.filter((s) => s.img);
    if (!slots.length) return;
    const files = [];
    const used = new Set();
    const target = document.createElement("canvas"); target.width = target.height = SIZE;
    for (const slot of slots) {
      const composition = [{ ...layerDefaults(), kind:"photo", img:slot.img, size:700 }];
      draw({ canvas:target, stack:composition });
      let base = fileSlug(slot.name || "icon"), suffix = 2, unique = base;
      while (used.has(unique)) unique = `${base}-${suffix++}`;
      used.add(unique); base = unique;
      files.push({ name:`${base}.png`, blob:await scaledBlob(SIZE,on("opaque"),target) });
      files.push({ name:`${base}-180.png`, blob:await scaledBlob(180,on("opaque"),target) });
    }
    await shareOrDownload("bo-icon-ios.zip", await zipBlobs(files));
    showTip();
  }

  function legacyStack(form) {
    if (["none","photo","svg"].includes(form.mark)) return [];
    const layer=layerDefaults();
    Object.entries(PICK_FIELDS).forEach(([id,key])=>{
      if (form[id] != null) layer[key]=$(id).type === "range" ? +form[id] : form[id];
    });
    if (form.mark && form.mark !== "text") { layer.kind="symbol"; layer.symbol=form.mark; }
    return [layer];
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const assets = new Map();
  let libraryItems = [], db = null, storageReady = false, persistence = Promise.resolve(), storageWarned = false;
  function storageError(error) {
    console.error("Không lưu được dữ liệu", error);
    if (!storageWarned) { storageWarned = true; alert("Không lưu được thiết kế trên thiết bị này. Thiết kế vẫn chỉnh và xuất được trong phiên hiện tại; hãy kiểm tra dung lượng hoặc chế độ riêng tư trước khi đóng trang."); }
  }
  function openStorage() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open("icontool-projects",1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("assets",{keyPath:"id"});
        request.result.createObjectStore("docs");
      };
      request.onsuccess = () => { db=request.result; resolve(); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB đang bị chặn"));
    });
  }
  function dbGet(store,key) {
    return new Promise((resolve,reject) => {
      const r=db.transaction(store).objectStore(store).get(key);
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  function dbReadAll(store) {
    return new Promise((resolve,reject) => {
      const r=db.transaction(store).objectStore(store).getAll();
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  function persist() {
    if (!db || !storageReady) return Promise.resolve(false);
    const snapshot=readForm(), items=clone(libraryItems), history=clone(hist);
    const refs=new Set([...snapshot.stack,...items.flatMap(item=>item.data?.stack || []),...history.stack.flatMap(item=>JSON.parse(item).stack || [])].map(layer=>layer.asset).filter(Boolean));
    persistence=persistence.catch(()=>{}).then(()=>new Promise((resolve,reject) => {
      const tx=db.transaction(["assets","docs"],"readwrite");
      const pending=[...assets].filter(([id,item])=>refs.has(id)&&!item.saved);
      [...assets].filter(([id])=>!refs.has(id)).forEach(([id])=>tx.objectStore("assets").delete(id));
      pending.forEach(([id,item])=>tx.objectStore("assets").put({id,data:item.data}));
      tx.objectStore("docs").put(snapshot,"current");
      tx.objectStore("docs").put(items,"library");
      tx.objectStore("docs").put(history,"history");
      tx.oncomplete=()=>{ pending.forEach(([,item])=>item.saved=true); [...assets].filter(([id])=>!refs.has(id)).forEach(([,item])=>item.saved=false); resolve(); };
      tx.onabort=tx.onerror=()=>reject(tx.error || new Error("Lưu trữ thất bại"));
    }));
    return persistence.catch(error => { storageError(error); return false; });
  }
  function decodeImage(data) {
    return new Promise((resolve,reject)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error("Không đọc được ảnh đã lưu")); img.src=data; });
  }

  const colorBases = {};
  function normalizeColorSetting(setting, fallback) {
    return {base:setting?.base || fallback,tone:setting?.mode === "opacity" ? Math.max(0,Math.min(100,+setting.tone)) : 100,mode:"opacity"};
  }
  function migrateShadowColor(layer) {
    const migrated = clone(layer);
    if (migrated.colorBase && migrated.colorBase.mode !== "opacity") migrated.color = migrated.colorBase.base || migrated.color;
    migrated.colorBase = normalizeColorSetting(migrated.colorBase,migrated.color);
    return migrated;
  }
  function migrateLayerColors(layer) {
    const migrated = {...layer,colorBases:{...layer.colorBases}};
    Object.entries(migrated.colorBases).forEach(([id,entry])=>{
      const key = PICK_FIELDS[id]; if (!key) return;
      const setting = normalizeColorSetting(entry,migrated[key]);
      if (entry.mode !== "opacity") migrated[key] = setting.base;
      migrated.colorBases[id] = setting;
    });
    return migrated;
  }
  function colorValue(id) { return hexAlpha(val(id),(colorBases[id]?.tone ?? 100)/100); }
  function layerColorValue(layer,id,key=id) { return hexAlpha(layer[key],(layer.colorBases?.[id]?.tone ?? 100)/100); }
  function setupColorControls() {
    document.querySelectorAll('input[type="color"]').forEach(input => {
      const label = input.closest("label"), title = label.querySelector("span").textContent.trim();
      input.setAttribute("aria-label",title);
      colorBases[input.id]=normalizeColorSetting(null,input.value);
      const disc=document.createElement("span"); disc.className="color-disc";
      const fill=document.createElement("span"); fill.className="color-fill";
      input.before(disc); disc.append(fill,input);
      // Shadow already has one opacity control: salpha. Do not add a duplicate.
      if (input.id === "scolor") return;
      const wrap=document.createElement("span"); wrap.className="color-tone";
      const name=document.createElement("span"); name.textContent="Độ đậm";
      const output=document.createElement("output"); output.id=input.id+"ToneVal";
      const range=document.createElement("input"); range.type="range"; range.min=0; range.max=100; range.value=100; range.id=input.id+"Tone"; range.dataset.tone=input.id;
      range.setAttribute("aria-label","Đậm nhạt "+title);
      wrap.append(name,output,range); label.append(wrap);
      range.addEventListener("input",()=>{
        colorBases[input.id].tone=+range.value;
        if (PICK_FIELDS[input.id]) writePick(input.id);
        syncColorControls(); requestDraw(false);
      });
      range.addEventListener("change",()=>{ draw(); pushHist(); });
    });
  }
  function resetColorBase(id) {
    const tone=colorBases[id]?.mode === "opacity" ? colorBases[id].tone : 100;
    colorBases[id]={base:val(id),tone,mode:"opacity"}; syncColorControls();
  }
  function syncColorControls() {
    document.querySelectorAll('input[type="color"]').forEach(input=>{
      const entry=normalizeColorSetting(colorBases[input.id],input.value);
      const range=$(input.id+"Tone"), output=$(input.id+"ToneVal");
      if (range) { range.value=entry.tone; range.disabled=input.disabled; range.style.setProperty("--tone-color",input.value); }
      if (output) output.textContent=entry.tone+"%";
      const opacity=input.id === "scolor" ? num("salpha")/100 : entry.tone/100;
      input.closest(".color-disc").style.setProperty("--swatch-color",hexAlpha(input.value,opacity));
    });
  }

  setupColorControls();
  keepLayer("text");
  const defaultForm = readForm();
  try {
    await openStorage();
    const [storedAssets, storedLibrary, saved, history] = await Promise.all([dbReadAll("assets"),dbGet("docs","library"),dbGet("docs","current"),dbGet("docs","history")]);
    let unreadable = 0;
    await Promise.all(storedAssets.map(async item => {
      let img = null;
      try { img = await decodeImage(item.data); } catch { unreadable++; }
      assets.set(item.id,{img,data:item.data,saved:true});
    }));
    if (unreadable) alert(`Không đọc được ${unreadable} ảnh đã lưu. Dữ liệu gốc vẫn được giữ nguyên.`);
    libraryItems = storedLibrary || [];
    storageReady = true;
    if (saved) {
      writeForm(saved);
      if (history?.stack?.length) { hist.stack = history.stack; hist.i = Math.max(0,Math.min(history.i,hist.stack.length-1)); }
    }
    else {
      const legacy = JSON.parse(localStorage.getItem(KEY) || "null");
      if (legacy) writeForm(legacy);
      libraryItems = JSON.parse(localStorage.getItem(LIB) || "[]").map(item=>({ ...item, data:{...item.data,stack:legacyStack(item.data || {}),pick:0} }));
      if (await persist() !== false) { localStorage.removeItem(KEY); localStorage.removeItem(LIB); }
    }
  } catch (error) { storageError(error); }
  renderLayers(); renderStack(); loadPick(); renderSymbols(); renderLib(); renderKit(); markAB(); bind(); draw(); pushHist();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
