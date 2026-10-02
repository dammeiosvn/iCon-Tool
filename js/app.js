(() => {
  const SIZE = 1024;
  const KEY = "tao-icon-v2";
  const c = document.getElementById("c");
  const ctx = c.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);
  const sheet = $("sheet");

  const state = { photo: null, svgImg: null, drag: null, pinch: null, layers: [], active: -1, seq: 1, kit: [], kitSlot: -1, abPick: "a" };
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

  const FIELDS = ["bg","c1","c2","c3","ang","noise","radius","squircle","safeOn","glass","stroke","pad","sx","sy","sblur","salpha","scolor","layerTarget","bakeShadow","mark","letters","letters2","font","inkMode","ink","ink2","inkAng","size","size2","gap2","alpha","keepSvg","zoom","px","py","rot","flipH","flipV","snap","mockOn","label","wall","opaque","fileBase","dropTo","kitN","scName"];
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
      grad.addColorStop(0, val("c1"));
      if (mode === "grad3") grad.addColorStop(.5, val("c3"));
      grad.addColorStop(1, mode === "solid" ? val("c1") : val("c2"));
      g.fillStyle = grad;
      g.fill();
    }
    paintGrain(g, box, num("noise"));
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

  function withContentXform(g, box, fn) {
    const cx = box.x + box.w/2, cy = box.y + box.h/2;
    g.save();
    g.globalAlpha = num("alpha")/100;
    g.translate(cx, cy);
    g.rotate(num("rot")*Math.PI/180);
    g.scale(on("flipH") ? -1 : 1, on("flipV") ? -1 : 1);
    g.translate(-cx, -cy);
    const ox = (num("px")-50)/50 * box.w * 0.9;
    const oy = (num("py")-50)/50 * box.h * 0.9;
    g.translate(ox, oy);
    fn();
    g.restore();
  }

  function inkPaint(g, box) {
    if (val("inkMode") !== "grad") return val("ink");
    const ang = num("inkAng") * Math.PI / 180;
    const cx = box.x + box.w/2, cy = box.y + box.h/2;
    const L = Math.hypot(box.w, box.h) / 2;
    const gr = g.createLinearGradient(cx-Math.cos(ang)*L, cy-Math.sin(ang)*L, cx+Math.cos(ang)*L, cy+Math.sin(ang)*L);
    gr.addColorStop(0, val("ink"));
    gr.addColorStop(1, val("ink2") || val("ink"));
    return gr;
  }

  function drawPhoto(g, box) {
    const img = state.photo; if (!img) return;
    const zoom = num("zoom")/100;
    const ir = img.width/img.height, br = box.w/box.h;
    let dw, dh;
    if (ir > br) { dh = box.h*zoom; dw = dh*ir; }
    else { dw = box.w*zoom; dh = dw/ir; }
    applyContentShadows(g, (ctx) => ctx.drawImage(img, box.x+box.w/2-dw/2, box.y+box.h/2-dh/2, dw, dh));
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
      o.fillStyle = inkPaint(o, { x:0, y:0, w:off.width, h:off.height });
      o.fillRect(0,0,off.width,off.height);
    }
    applyContentShadows(g, (ctx) => ctx.drawImage(off, x, y, s, s));
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
      applyContentShadows(g, (ctx) => {
      const paint = inkPaint(ctx, box);
      ctx.fillStyle = ctx.strokeStyle = paint;
      ctx.lineWidth = Math.max(10, s*.08);
      ctx.lineCap = ctx.lineJoin = "round";
      if (m === "text") {
        ctx.font = `700 ${s}px ${val("font")}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((val("letters") || "S").slice(0,24), cx, cy - (val("letters2") ? num("size2")/2 + num("gap2")/2 : 0) + s*.04);
        if (val("letters2") && num("size2") > 0) {
          ctx.font = `600 ${num("size2")}px ${val("font")}`;
          ctx.fillText(val("letters2").slice(0,24), cx, cy + s/2 + num("gap2")/2);
        }
      } else if (m === "sun") {
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
      });
    });
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
    if (num("glass")>0) { ctx.fillStyle = `rgba(255,255,255,${num("glass")/100})`; ctx.fillRect(box.x,box.y,box.w,box.h); }
    drawMark(ctx, inner);
    if (!draft && num("noise") > 0) paintGrain(ctx, box, Math.round(num("noise") * 0.45));
    state.layers.forEach((L) => {
      if (L.on && L.target === "frame" && INSET.has(L.type)) applyInsetLayer(ctx, fb, L);
    });
    if (num("stroke")>0) {
      ctx.strokeStyle = "rgba(255,255,255,.78)";
      ctx.lineWidth = num("stroke");
      clipIcon(ctx, { x:box.x+num("stroke")/2, y:box.y+num("stroke")/2, w:box.w-num("stroke"), h:box.h-num("stroke"), r:Math.max(0,box.r-num("stroke")/2) });
      ctx.stroke();
    }
    ctx.restore();
    const mini = $("mini");
    if (mini) {
      const m = mini.getContext("2d");
      m.clearRect(0,0,180,180);
      m.drawImage(c, 0, 0, 180, 180);
    }
    syncUI();
  }

  function syncUI() {
    const map = { noise:"noiseVal", ang:"angVal", radius:"radiusVal", glass:"glassVal", stroke:"strokeVal", pad:"padVal", sx:"sxVal", sy:"syVal", sblur:"sblurVal", salpha:"salphaVal", size:"sizeVal", size2:"size2Val", gap2:"gap2Val", alpha:"alphaVal", zoom:"zoomVal", px:"pxVal", py:"pyVal", rot:"rotVal", inkAng:"inkAngVal" };
    const units = { ang:"°", inkAng:"°", rot:"°", alpha:"%", zoom:"%" };
    Object.entries(map).forEach(([id, lab]) => { if ($(lab)) $(lab).textContent = $(id).value + (units[id] || ""); });
    $("mockName").textContent = val("label") || "Icon";
    $("mock").className = "mock" + (on("mockOn") ? ` wall-${val("wall")}` : " off");
    if (val("wall")==="ios" && on("mockOn")) $("mock").className = "mock wall-ios";
    $("safe").hidden = !on("safeOn");
    const w = $("warn");
    const issues = [];
    if (val("bg") === "clear" && !on("opaque")) issues.push("PNG trong suốt — iOS dễ ra nền đen.");
    const room = SIZE / 2 - Math.max(num("pad"), SIZE * 0.1);
    if (val("mark") === "text" && num("size") / 2 + 24 > room) issues.push("Chữ sát mép safe zone 80%.");
    if ((val("mark") === "photo" || val("mark") === "svg") && num("zoom") > 130 && num("pad") < 40) issues.push("Ảnh phóng lớn, iOS sẽ cắt squircle.");
    if (val("mark")==="text") {
      const ok = Math.abs(lum(val("c1"))-lum(val("ink"))) > .28;
      if (!ok && val("bg") !== "clear") issues.push("Chữ/nền tương phản thấp.");
    }
    w.hidden = !issues.length;
    w.textContent = issues[0] || "";
  }

  function readForm() {
    const o = {};
    FIELDS.forEach((id) => {
      const el = $(id); if (!el) return;
      o[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    o.layers = state.layers;
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
    if (o.layers) state.layers = JSON.parse(JSON.stringify(o.layers));
    if (o.active != null) state.active = o.active;
    if (o.seq) state.seq = o.seq;
    hist.lock = false;
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
    try { localStorage.setItem(KEY, snap); } catch {}
  }
  function undo() { if (hist.i<=0) return; hist.i--; writeForm(JSON.parse(hist.stack[hist.i])); draw(); }
  function redo() { if (hist.i>=hist.stack.length-1) return; hist.i++; writeForm(JSON.parse(hist.stack[hist.i])); draw(); }

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
    hist.lock = false;
    syncUI();
  }

  function saveSlidersToLayer() {
    const L = activeLayer();
    if (!L || hist.lock) return;
    L.sx = num("sx"); L.sy = num("sy");
    L.blur = num("sblur"); L.alpha = num("salpha");
    L.color = val("scolor");
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
  function uuid() { return crypto.randomUUID().toUpperCase(); }
  async function exportConfig() {
    const name = ($("clipName").value || val("label") || "Icon").trim();
    let url = ($("clipUrl").value || "").trim();
    if (!/^https?:\/\//i.test(url)) { alert("URL phải bắt đầu bằng https://"); return; }
    draw();
    const blob = await scaledBlob(180, true);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin).replace(/(.{64})/g, "$1\n");
    const id = uuid();
    const clip = uuid();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key><true/>
      <key>Icon</key><data>${b64}</data>
      <key>IsRemovable</key><true/>
      <key>Label</key><string>${xmlEscape(name)}</string>
      <key>PayloadIdentifier</key><string>vn.sentechtips.webclip.${clip}</string>
      <key>PayloadType</key><string>com.apple.webClip.management</string>
      <key>PayloadUUID</key><string>${clip}</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>Precomposed</key><true/>
      <key>URL</key><string>${xmlEscape(url)}</string>
    </dict>
  </array>
  <key>PayloadDisplayName</key><string>${xmlEscape(name)}</string>
  <key>PayloadIdentifier</key><string>vn.sentechtips.profile.${id}</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${id}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>`;
    const file = new Blob([xml], { type: "application/x-apple-aspen-config" });
    await shareOrDownload(`${fileSlug(name)}.mobileconfig`, file);
  }
  async function exportZip() {
    draw();
    const sizes = [1024,180,167,152,120];
    const files = [];
    const base = slug();
    for (const s of sizes) files.push({ name: s===1024 ? `${base}.png` : `${base}-${s}.png`, blob: await scaledBlob(s, on("opaque")) });
    files.push({ name: `${base}.svg`, blob: new Blob([svgMarkup()], { type:"image/svg+xml" }) });
    await shareOrDownload(`${base}-ios.zip`, await zipBlobs(files));
    showTip();
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

  function placeSheet() {
    const mock = $("mock");
    if (!mock) return;
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
      if (el.id === "file" || el.id === "fileCam") return;
      el.addEventListener("input", () => {
        if (el.id === "addLayer") {
          if (el.value) { addLayer(el.value); el.value = ""; }
          return;
        }
        if (["sx","sy","sblur","salpha","scolor","layerTarget"].includes(el.id)) saveSlidersToLayer();
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
    $("pick").onclick = () => $("file").click();
    $("cam").onclick = () => $("fileCam").click();
    $("file").onchange = () => loadFile($("file").files[0]);
    $("fileCam").onchange = () => loadFile($("fileCam").files[0]);
    $("center").onclick = () => { $("px").value=50; $("py").value=50; $("rot").value=0; draw(); pushHist(); };
    $("autoInk").onclick = () => { $("ink").value = lum(val("c1")) > .45 ? "#111111" : "#ffffff"; draw(); pushHist(); };
    $("symQ").addEventListener("input", renderSymbols);
    const fontEl = $("font");
    const paintFont = () => { if (fontEl) fontEl.style.fontFamily = fontEl.value; };
    if (fontEl) { paintFont(); fontEl.addEventListener("change", paintFont); }
    $("undo").onclick = undo; $("redo").onclick = redo;
    $("reset").onclick = () => {
      try { localStorage.removeItem(KEY); } catch {}
      location.reload();
    };
    $("share1024").onclick = () => exportPng(SIZE, true);
    $("share180").onclick = () => exportPng(180, true);
    $("shareZip").onclick = exportZip;
    $("shareConfig").onclick = () => {
      $("configBox").hidden = false;
      if (!$("clipName").value) $("clipName").value = val("label") || "Icon";
      if (!$("clipUrl").value) $("clipUrl").value = "https://";
    };
    $("saveConfig").onclick = exportConfig;
    $("shareSvg").onclick = () => shareOrDownload(`${slug()}.svg`, new Blob([svgMarkup()], { type:"image/svg+xml" }));
    $("dl1024").onclick = () => exportPng(SIZE, false);
    $("pickDrop").onclick = () => { state.drop = true; sheet.classList.add("ghost"); };
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

    c.addEventListener("pointerdown", (e) => {
      if (state.drop) {
        const r = c.getBoundingClientRect();
        const x = Math.max(0, Math.min(SIZE-1, Math.floor((e.clientX-r.left)/r.width*SIZE)));
        const y = Math.max(0, Math.min(SIZE-1, Math.floor((e.clientY-r.top)/r.height*SIZE)));
        const d = ctx.getImageData(x, y, 1, 1).data;
        const hex = "#" + [d[0],d[1],d[2]].map((v) => v.toString(16).padStart(2,"0")).join("");
        const to = val("dropTo") || "c1";
        if ($(to)) $(to).value = hex;
        state.drop = false;
        sheet.classList.remove("ghost");
        draw(); pushHist();
        return;
      }
      if (val("mark") === "none") return;
      c.setPointerCapture(e.pointerId);
      state.drag = { x:e.clientX, y:e.clientY, px:num("px"), py:num("py"), id:e.pointerId };
    });
    c.addEventListener("pointermove", (e) => {
      if (!state.drag || state.drag.id!==e.pointerId) return;
      const k = 55 / Math.max(c.getBoundingClientRect().width, 1);
      $("px").value = Math.max(-20, Math.min(120, state.drag.px - (e.clientX-state.drag.x)*k));
      $("py").value = Math.max(-20, Math.min(120, state.drag.py - (e.clientY-state.drag.y)*k));
      live = true; requestDraw(false);
    });
    c.addEventListener("pointerup", () => {
      live = false;
      if (state.drag && on("snap")) {
        if (Math.abs(num("px")-50) < 5) $("px").value = 50;
        if (Math.abs(num("py")-50) < 5) $("py").value = 50;
        draw();
      }
      if (state.drag) pushHist();
      state.drag = null;
    });
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
        $("zoom").value = Math.round(Math.max(20, Math.min(400, state.pinch.zoom*(d/state.pinch.dist))));
        live = true; requestDraw(false);
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

  function readLib() { try { return JSON.parse(localStorage.getItem(LIB) || "[]"); } catch { return []; } }
  function saveLib() {
    draw();
    const items = readLib();
    items.unshift({ id: Date.now(), name: val("label") || "Icon", thumb: c.toDataURL("image/jpeg", 0.7), data: readForm() });
    localStorage.setItem(LIB, JSON.stringify(items.slice(0, 20)));
    renderLib();
  }
  function saveStyle() {
    const s = { glass: val("glass"), stroke: val("stroke"), pad: val("pad"), bg: val("bg"), c1: val("c1"), c2: val("c2"), c3: val("c3"), ang: val("ang"), ink: val("ink"), ink2: val("ink2"), inkMode: val("inkMode"), layers: state.layers };
    localStorage.setItem(STY, JSON.stringify(s));
  }
  function applySavedStyle() {
    try {
      const s = JSON.parse(localStorage.getItem(STY) || "null");
      if (!s) return;
      ["glass","stroke","pad","bg","c1","c2","c3","ang","ink","ink2","inkMode"].forEach((k) => { if (s[k] != null && $(k)) $(k).value = s[k]; });
      if (s.layers) { state.layers = JSON.parse(JSON.stringify(s.layers)); state.active = 0; }
      renderLayers(); loadLayerToSliders(); draw(); pushHist();
    } catch {}
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
          localStorage.setItem(LIB, JSON.stringify(readLib().filter((x) => String(x.id) !== e.target.dataset.del)));
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
        if (b.dataset.m) $("mark").value = b.dataset.m;
        else { $("mark").value = "text"; $("letters").value = b.dataset.t; }
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
    const name = val("scName") || val("label") || "Icon";
    const url = "shortcuts://run-shortcut?name=" + encodeURIComponent(name);
    $("tipText").textContent = "Lưu ảnh xong → mở Shortcuts «" + name + "» → chọn ảnh vừa lưu.";
    $("tipLink").href = url;
    const qr = $("tipQr");
    qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(url);
    qr.hidden = false;
    tip.hidden = false;
  }
  function kitCount() { return Math.max(6, Math.min(12, num("kitN") || 8)); }
  function renderKit() {
    const box = $("kit"); if (!box) return;
    const n = kitCount();
    while (state.kit.length < n) state.kit.push({ name: "", img: null, thumb: "" });
    state.kit = state.kit.slice(0, n);
    box.innerHTML = state.kit.map((s, i) => s.thumb
      ? `<div class="slot" data-i="${i}"><img alt="" src="${s.thumb}"><input data-name="${i}" maxlength="14" value="${s.name || ""}" placeholder="Tên MH"></div>`
      : `<button type="button" class="slot empty" data-i="${i}">+</button>`
    ).join("");
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
    reader.readAsDataURL(file);
  }
  async function exportKit() {
    const slots = state.kit.filter((s) => s.img);
    if (!slots.length) return;
    const keep = { photo: state.photo, mark: val("mark"), label: val("label") };
    const files = [];
    for (const s of slots) {
      state.photo = s.img;
      $("mark").value = "photo";
      $("label").value = s.name || "Icon";
      draw();
      const base = fileSlug(s.name || "icon");
      files.push({ name: `${base}.png`, blob: await scaledBlob(SIZE, on("opaque")) });
      files.push({ name: `${base}-180.png`, blob: await scaledBlob(180, on("opaque")) });
    }
    state.photo = keep.photo;
    $("mark").value = keep.mark;
    $("label").value = keep.label;
    draw();
    await shareOrDownload("bo-icon-ios.zip", await zipBlobs(files));
    showTip();
  }

  renderLayers();
  renderSymbols();
  renderLib();
  renderKit();
  markAB();
  bind();
  draw();
  pushHist();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
