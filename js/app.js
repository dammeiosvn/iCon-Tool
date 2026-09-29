(() => {
  const SIZE = 1024;
  const c = document.getElementById("c");
  const ctx = c.getContext("2d", { alpha: true });
  const $ = (id) => document.getElementById(id);

  const state = {
    photo: null,
    svgImg: null,
    px: 50,
    py: 50,
    drag: null,
    pinch: null,
  };

  const PRESETS = {
    none:      { sx: 0, sy: 0, sblur: 0, salpha: 0 },
    outer:     { sx: 0, sy: 16, sblur: 22, salpha: 42 },
    inset:     { sx: 0, sy: 10, sblur: 18, salpha: 50 },
    soft:      { sx: 0, sy: 20, sblur: 48, salpha: 28 },
    hard:      { sx: 8, sy: 14, sblur: 6, salpha: 55 },
    glow:      { sx: 0, sy: 0, sblur: 36, salpha: 55 },
    bottom:    { sx: 0, sy: 22, sblur: 18, salpha: 38 },
    floating:  { sx: 0, sy: 28, sblur: 40, salpha: 32 },
    pressed:   { sx: 0, sy: 8, sblur: 10, salpha: 45 },
    pop:       { sx: 0, sy: 10, sblur: 8, salpha: 35 },
    double:    { sx: 0, sy: 6, sblur: 4, salpha: 40 },
    neu:       { sx: 12, sy: 12, sblur: 22, salpha: 28 },
    neuIn:     { sx: 10, sy: 10, sblur: 18, salpha: 32 },
    neon:      { sx: 0, sy: 0, sblur: 28, salpha: 70 },
    long:      { sx: 18, sy: 28, sblur: 8, salpha: 36 },
    crisp:     { sx: 0, sy: 1, sblur: 2, salpha: 50 },
    clay:      { sx: 0, sy: 8, sblur: 14, salpha: 40 },
  };

  function val(id) { return $(id).value; }
  function num(id) { return +$(id).value; }
  function hexAlpha(hex, a) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function roundPath(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    if (r <= 0) { g.rect(x, y, w, h); return; }
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function seeded(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function iconBox() {
    const bake = $("bakeShadow").checked && val("shadowPreset") !== "none";
    const m = bake ? 90 : 0;
    return { x: m, y: m, w: SIZE - m * 2, h: SIZE - m * 2, r: num("radius") * ((SIZE - m * 2) / SIZE) };
  }

  function fillBackground(g, box) {
    const mode = val("bg");
    if (mode === "clear") return;
    const grad = g.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    grad.addColorStop(0, val("c1"));
    if (mode === "grad3") grad.addColorStop(0.5, val("c3"));
    grad.addColorStop(1, mode === "solid" ? val("c1") : val("c2"));
    g.fillStyle = grad;
    g.fill();

    const n = num("noise");
    if (!n) return;
    for (let i = 0; i < n * 90; i++) {
      g.fillStyle = `rgba(255,255,255,${seeded(i) * 0.08})`;
      g.fillRect(box.x + seeded(i + 3) * box.w, box.y + seeded(i + 9) * box.h, 2, 2);
    }
  }

  function applyOuterShadow(g, box, preset) {
    const a = num("salpha") / 100;
    if (a <= 0 || preset === "none") return;
    const col = hexAlpha(val("scolor"), a);
    g.save();
    g.shadowColor = col;
    g.shadowBlur = num("sblur") * 2;
    g.shadowOffsetX = num("sx") * 2;
    g.shadowOffsetY = num("sy") * 2;
    if (preset === "neu" || preset === "double") {
      g.shadowColor = hexAlpha("#000000", a);
      g.shadowOffsetX = num("sx") * 2;
      g.shadowOffsetY = num("sy") * 2;
      roundPath(g, box.x, box.y, box.w, box.h, box.r);
      g.fillStyle = "#000";
      g.fill();
      g.shadowColor = hexAlpha("#ffffff", Math.min(0.7, a + 0.15));
      g.shadowOffsetX = -num("sx") * 2;
      g.shadowOffsetY = -num("sy") * 2;
      g.fill();
    } else if (preset === "neon") {
      g.shadowColor = hexAlpha(val("ink"), a);
      roundPath(g, box.x, box.y, box.w, box.h, box.r);
      g.fillStyle = "#000";
      g.fill();
    } else {
      roundPath(g, box.x, box.y, box.w, box.h, box.r);
      g.fillStyle = "#000";
      g.fill();
    }
    g.restore();
  }

  function applyInset(g, box, preset) {
    if (!["inset", "pressed", "neuIn", "clay"].includes(preset)) return;
    const a = num("salpha") / 100;
    g.save();
    roundPath(g, box.x, box.y, box.w, box.h, box.r);
    g.clip();
    g.strokeStyle = hexAlpha(val("scolor"), a);
    g.lineWidth = Math.max(8, num("sblur"));
    g.shadowColor = hexAlpha(val("scolor"), a);
    g.shadowBlur = num("sblur");
    g.shadowOffsetX = num("sx");
    g.shadowOffsetY = num("sy");
    roundPath(g, box.x, box.y, box.w, box.h, box.r);
    g.stroke();
    if (preset === "neuIn") {
      g.shadowColor = hexAlpha("#ffffff", a * 0.6);
      g.shadowOffsetX = -num("sx");
      g.shadowOffsetY = -num("sy");
      g.strokeStyle = "rgba(255,255,255,.2)";
      g.stroke();
    }
    g.restore();
  }

  function drawPhoto(g, box) {
    const img = state.photo;
    if (!img) return;
    const zoom = num("zoom") / 100;
    const ir = img.width / img.height;
    const br = box.w / box.h;
    let dw, dh;
    if (ir > br) { dh = box.h * zoom; dw = dh * ir; }
    else { dw = box.w * zoom; dh = dw / ir; }
    const ox = box.x - (dw - box.w) * (state.px / 100);
    const oy = box.y - (dh - box.h) * (state.py / 100);
    g.drawImage(img, ox, oy, dw, dh);
  }

  function drawSvg(g, box) {
    const img = state.svgImg;
    if (!img) return;
    const s = num("size") * (num("zoom") / 100);
    const x = box.x + box.w / 2 - s / 2;
    const y = box.y + box.h / 2 - s / 2;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(s));
    off.height = Math.max(1, Math.round(s));
    const o = off.getContext("2d");
    o.drawImage(img, 0, 0, off.width, off.height);
    o.globalCompositeOperation = "source-in";
    o.fillStyle = val("ink");
    o.fillRect(0, 0, off.width, off.height);
    g.drawImage(off, x, y, s, s);
  }

  function starPath(g, cx, cy, r, n = 5) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = (i * Math.PI) / n - Math.PI / 2;
      const rr = i % 2 ? r * 0.42 : r;
      const fn = i ? g.lineTo : g.moveTo;
      fn.call(g, cx + Math.cos(rad) * rr, cy + Math.sin(rad) * rr);
    }
    g.closePath();
  }

  function heartPath(g, cx, cy, s) {
    g.beginPath();
    g.moveTo(cx, cy + s * 0.35);
    g.bezierCurveTo(cx - s, cy - s * 0.15, cx - s * 0.45, cy - s * 0.85, cx, cy - s * 0.35);
    g.bezierCurveTo(cx + s * 0.45, cy - s * 0.85, cx + s, cy - s * 0.15, cx, cy + s * 0.35);
    g.closePath();
  }

  function drawMark(g, box) {
    const m = val("mark");
    if (m === "none") return;
    if (m === "photo") { drawPhoto(g, box); return; }
    if (m === "svg") { drawSvg(g, box); return; }

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const s = num("size");
    g.fillStyle = val("ink");
    g.strokeStyle = val("ink");
    g.lineWidth = Math.max(10, s * 0.08);
    g.lineCap = "round";
    g.lineJoin = "round";

    if (m === "text") {
      g.font = `700 ${s}px ${val("font")}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText((val("letters") || "S").slice(0, 2), cx, cy + s * 0.04);
      return;
    }
    if (m === "sun") {
      g.beginPath();
      g.arc(cx, cy - s * 0.08, s * 0.28, 0, Math.PI * 2);
      g.fill();
      g.fillRect(cx - s * 0.55, cy + s * 0.32, s * 1.1, Math.max(8, s * 0.05));
      return;
    }
    if (m === "plus") {
      const t = Math.max(16, s * 0.18);
      g.fillRect(cx - t / 2, cy - s / 2, t, s);
      g.fillRect(cx - s / 2, cy - t / 2, s, t);
      return;
    }
    if (m === "gear") {
      g.beginPath();
      g.arc(cx, cy, s * 0.22, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(t) * s * 0.3, cy + Math.sin(t) * s * 0.3);
        g.lineTo(cx + Math.cos(t) * s * 0.42, cy + Math.sin(t) * s * 0.42);
        g.stroke();
      }
      return;
    }
    if (m === "mail") {
      const w = s * 1.05, h = s * 0.72;
      g.strokeRect(cx - w / 2, cy - h / 2, w, h);
      g.beginPath();
      g.moveTo(cx - w / 2, cy - h / 2);
      g.lineTo(cx, cy + h * 0.08);
      g.lineTo(cx + w / 2, cy - h / 2);
      g.stroke();
      return;
    }
    if (m === "phone") {
      const w = s * 0.48, h = s * 0.82, r = s * 0.1;
      roundPath(g, cx - w / 2, cy - h / 2, w, h, r);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy + h * 0.32, s * 0.045, 0, Math.PI * 2);
      g.fill();
      return;
    }
    if (m === "star") {
      starPath(g, cx, cy, s * 0.48);
      g.fill();
      return;
    }
    if (m === "heart") {
      heartPath(g, cx, cy, s * 0.55);
      g.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    const box = iconBox();
    const preset = val("shadowPreset");
    const pad = num("pad");
    const inner = {
      x: box.x + pad,
      y: box.y + pad,
      w: Math.max(8, box.w - pad * 2),
      h: Math.max(8, box.h - pad * 2),
      r: Math.max(0, box.r - pad * 0.35),
    };

    if (preset !== "none" && !["inset", "pressed", "neuIn", "clay"].includes(preset)) {
      applyOuterShadow(ctx, box, preset);
    }

    ctx.save();
    roundPath(ctx, box.x, box.y, box.w, box.h, box.r);
    ctx.clip();
    fillBackground(ctx, box);

    if (num("glass") > 0) {
      ctx.fillStyle = `rgba(255,255,255,${num("glass") / 100})`;
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }

    ctx.save();
    roundPath(ctx, inner.x, inner.y, inner.w, inner.h, inner.r);
    ctx.clip();
    drawMark(ctx, inner);
    ctx.restore();

    applyInset(ctx, box, preset);

    if (num("stroke") > 0) {
      ctx.strokeStyle = "rgba(255,255,255,.78)";
      ctx.lineWidth = num("stroke");
      roundPath(ctx, box.x + num("stroke") / 2, box.y + num("stroke") / 2, box.w - num("stroke"), box.h - num("stroke"), Math.max(0, box.r - num("stroke") / 2));
      ctx.stroke();
    }
    ctx.restore();
    syncLabels();
  }

  function syncLabels() {
    $("noiseVal").textContent = num("noise");
    $("radiusVal").textContent = num("radius");
    $("glassVal").textContent = num("glass");
    $("strokeVal").textContent = num("stroke");
    $("padVal").textContent = num("pad");
    $("sxVal").textContent = num("sx");
    $("syVal").textContent = num("sy");
    $("sblurVal").textContent = num("sblur");
    $("salphaVal").textContent = num("salpha");
    $("sizeVal").textContent = num("size");
    $("zoomVal").textContent = num("zoom");
  }

  function applyPreset() {
    const p = PRESETS[val("shadowPreset")];
    if (!p) return;
    $("sx").value = p.sx;
    $("sy").value = p.sy;
    $("sblur").value = p.sblur;
    $("salpha").value = p.salpha;
    if (val("shadowPreset") === "neon") $("scolor").value = val("ink");
    draw();
  }

  function canvasBlob(mime = "image/png") {
    return new Promise((resolve) => c.toBlob(resolve, mime));
  }

  function scaledBlob(px) {
    const s = document.createElement("canvas");
    s.width = s.height = px;
    const g = s.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(c, 0, 0, px, px);
    return new Promise((resolve) => s.toBlob(resolve, "image/png"));
  }

  function svgMarkup() {
    const box = iconBox();
    const clear = val("bg") === "clear";
    const r = box.r;
    const mode = val("bg");
    const stops = mode === "grad3"
      ? `<stop stop-color="${val("c1")}"/><stop offset=".5" stop-color="${val("c3")}"/><stop offset="1" stop-color="${val("c2")}"/>`
      : `<stop stop-color="${val("c1")}"/><stop offset="1" stop-color="${mode === "solid" ? val("c1") : val("c2")}"/>`;
    const text = val("mark") === "text"
      ? `<text x="512" y="540" text-anchor="middle" font-size="${num("size")}" font-family="${val("font")}" font-weight="700" fill="${val("ink")}">${(val("letters") || "S").slice(0, 2)}</text>`
      : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${
      clear ? "" : `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>`
    }<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${r}" fill="${clear ? "none" : "url(#g)"}" stroke="rgba(255,255,255,.78)" stroke-width="${num("stroke")}"/>${text}</svg>`;
  }

  async function shareOrDownload(filename, blob) {
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Icon iOS" });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function exportPng(px, share) {
    draw();
    const blob = px === SIZE ? await canvasBlob() : await scaledBlob(px);
    const name = px === SIZE ? "icon-home-screen.png" : `icon-${px}.png`;
    if (share) await shareOrDownload(name, blob);
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  }

  async function exportSvg(share) {
    const blob = new Blob([svgMarkup()], { type: "image/svg+xml" });
    if (share) await shareOrDownload("icon-home-screen.svg", blob);
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "icon-home-screen.svg";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const isSvg = (file.type || "").includes("svg") || /\.svg$/i.test(file.name);
        if (isSvg) {
          state.svgImg = img;
          $("mark").value = "svg";
        } else {
          state.photo = img;
          $("mark").value = "photo";
        }
        state.px = 50;
        state.py = 50;
        draw();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onPointerDown(e) {
    if (val("mark") !== "photo" || !state.photo) return;
    if (e.pointerType === "touch" && e.target.hasPointerCapture?.(e.pointerId)) return;
    c.setPointerCapture(e.pointerId);
    state.drag = { x: e.clientX, y: e.clientY, px: state.px, py: state.py, id: e.pointerId };
  }

  function onPointerMove(e) {
    if (!state.drag || state.drag.id !== e.pointerId) return;
    const rect = c.getBoundingClientRect();
    const k = 100 / Math.max(rect.width, 1);
    state.px = Math.max(0, Math.min(100, state.drag.px - (e.clientX - state.drag.x) * k));
    state.py = Math.max(0, Math.min(100, state.drag.py - (e.clientY - state.drag.y) * k));
    draw();
  }

  function onPointerUp() { state.drag = null; }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      state.pinch = { dist, zoom: num("zoom") };
      state.drag = null;
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2 && state.pinch) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.max(60, Math.min(220, state.pinch.zoom * (dist / state.pinch.dist)));
      $("zoom").value = Math.round(next);
      draw();
    }
  }

  function bind() {
    document.querySelectorAll("input,select").forEach((el) => {
      if (el.id === "file") return;
      el.addEventListener("input", () => {
        if (el.id === "shadowPreset") applyPreset();
        else draw();
      });
    });
    $("pick").onclick = () => $("file").click();
    $("file").onchange = () => loadFile($("file").files[0]);
    $("share1024").onclick = () => exportPng(SIZE, true);
    $("share180").onclick = () => exportPng(180, true);
    $("shareSvg").onclick = () => exportSvg(true);
    $("dl1024").onclick = () => exportPng(SIZE, false);
    c.addEventListener("pointerdown", onPointerDown);
    c.addEventListener("pointermove", onPointerMove);
    c.addEventListener("pointerup", onPointerUp);
    c.addEventListener("pointercancel", onPointerUp);
    c.addEventListener("touchstart", onTouchStart, { passive: true });
    c.addEventListener("touchmove", onTouchMove, { passive: false });
    document.querySelectorAll(".panel summary").forEach((s) => {
      s.addEventListener("click", () => {
        const host = s.parentElement;
        document.querySelectorAll(".panel").forEach((p) => {
          if (p !== host) p.open = false;
        });
      });
    });
  }

  bind();
  draw();
})();
