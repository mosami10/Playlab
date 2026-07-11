/* MIRROR.SYS — camera playground. Four live effects (thermal / ascii /
   glitch / mosaic), frame-diff motion detection that feeds a particle
   system and re-tints the whole zone. Everything stays on-device. */
(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const FX = ['THERMAL', 'ASCII', 'GLITCH', 'MOSAIC', 'EDGE', 'GHOST'];
  const SW = 160, SH = 120;                     // sample resolution

  let video, out, ctx, fxCv, fxCtx, overlay, msgEl, fxBtn, stopBtn, meterBar, section;
  let stream = null, fxIdx = 0, prev = null, hue = 0, parts = [];
  let amt = 4;                                  // CHAOS slider 1..10 — drives every effect's intensity
  let quipTimer = 0, motionAvg = 0;
  const sample = document.createElement('canvas');
  sample.width = SW; sample.height = SH;
  const sctx = sample.getContext('2d', { willReadFrequently: true });

  const ASCII = ' .:-=+*#%@';

  function thermal(d) {
    const img = ctx.createImageData(SW, SH);
    for (let i = 0; i < SW * SH; i++) {
      const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765; // 0..1
      let r, g, b;
      if (l < 0.25)      { const t = l / 0.25;        r = 10 + 50 * t;  g = 0;             b = 60 + 90 * t; }
      else if (l < 0.5)  { const t = (l - 0.25) / 0.25; r = 60 + 140 * t; g = 20 * t;        b = 150 - 90 * t; }
      else if (l < 0.75) { const t = (l - 0.5) / 0.25;  r = 200 + 55 * t; g = 20 + 120 * t;  b = 60 - 60 * t; }
      else               { const t = (l - 0.75) / 0.25; r = 255;          g = 140 + 115 * t; b = 220 * t; }
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sample, 0, 0, out.width, out.height);
  }

  function ascii(d) {
    ctx.fillStyle = '#03080a';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#6dff8a';
    ctx.font = '8px monospace';
    const cw = out.width / (SW / 2), chh = out.height / (SH / 2);
    for (let y = 0; y < SH; y += 2) {
      for (let x = 0; x < SW; x += 2) {
        const i = (y * SW + x) * 4;
        const l = (d[i] + d[i + 1] + d[i + 2]) / 765;
        const ch = ASCII[Math.min(ASCII.length - 1, Math.floor(l * ASCII.length))];
        if (ch !== ' ') ctx.fillText(ch, (x / 2) * cw, (y / 2) * chh + 8);
      }
    }
  }

  function glitch() {
    ctx.imageSmoothingEnabled = true;
    // rgb split
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(video, 0, 0, out.width, out.height);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(video, -6, 0, out.width, out.height);
    ctx.drawImage(video, 6, 2, out.width, out.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // slice bands
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.6) {
        const y = Math.random() * out.height, h = 4 + Math.random() * 22;
        const off = (Math.random() - 0.5) * 60;
        ctx.drawImage(out, 0, y, out.width, h, off, y, out.width, h);
      }
    }
    // scanline tint
    ctx.fillStyle = 'rgba(200,255,62,0.05)';
    for (let y = 0; y < out.height; y += 4) ctx.fillRect(0, y, out.width, 1);
  }

  function mosaic(d) {
    const B = Math.max(2, Math.round(amt * 1.6));   // CHAOS slider = pixelation size
    ctx.fillStyle = '#0a0716';
    ctx.fillRect(0, 0, out.width, out.height);
    const bw = out.width / (SW / B), bh = out.height / (SH / B);
    for (let y = 0; y < SH; y += B) {
      for (let x = 0; x < SW; x += B) {
        const i = (y * SW + x) * 4;
        ctx.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        ctx.beginPath();
        ctx.arc((x / B) * bw + bw / 2, (y / B) * bh + bh / 2, bw * 0.42, 0, 7);
        ctx.fill();
      }
    }
  }

  /* EDGE — sobel outline of you, white ink on black */
  function edge(d) {
    const thr = 90 - amt * 6;                    // CHAOS slider = edge sensitivity
    const img = ctx.createImageData(SW, SH);
    for (let y = 1; y < SH - 1; y++) {
      for (let x = 1; x < SW - 1; x++) {
        const i = (y * SW + x);
        const L = (p) => d[p * 4];
        const gx = -L(i - SW - 1) + L(i - SW + 1) - 2 * L(i - 1) + 2 * L(i + 1) - L(i + SW - 1) + L(i + SW + 1);
        const gy = -L(i - SW - 1) - 2 * L(i - SW) - L(i - SW + 1) + L(i + SW - 1) + 2 * L(i + SW) + L(i + SW + 1);
        const on = Math.abs(gx) + Math.abs(gy) > thr;
        const o = i * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = on ? 235 : 6;
        img.data[o + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sample, 0, 0, out.width, out.height);
  }

  /* GHOST — motion trails; the mirror remembers where you were */
  function ghost() {
    ctx.fillStyle = `rgba(10, 7, 22, ${0.4 - amt * 0.032})`;   // CHAOS = trail length
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.globalAlpha = 0.55;
    ctx.save(); ctx.translate(out.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, out.width, out.height);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function motion(d) {
    if (!prev) { prev = new Uint8ClampedArray(d); return; }
    let energy = 0, cx = 0, cy = 0, hits = 0;
    for (let i = 0; i < SW * SH; i += 2) {       // every other pixel is plenty
      const diff = Math.abs(d[i * 4] - prev[i * 4]);
      if (diff > 26) {
        energy += diff; hits += 1;
        cx += i % SW; cy += (i / SW) | 0;
      }
    }
    prev.set(d);
    const level = Math.min(100, (hits / (SW * SH / 2)) * 480);
    motionAvg = motionAvg * 0.95 + level * 0.05;
    meterBar.style.width = level + '%';

    if (hits > 40) {
      hue = (hue + level * 0.15) % 360;
      section.style.setProperty('--mirror-hue', hue.toFixed(0));
      const px = (cx / hits / SW) * fxCv.width;
      const py = (cy / hits / SH) * fxCv.height;
      for (let k = 0; k < Math.min(6, level / 10); k++) {
        const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3.5;
        parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 40, c: `hsl(${(hue + Math.random() * 60) | 0} 90% 70%)` });
      }
    }
  }

  /* the mirror has opinions about your energy level */
  function quips() {
    const q = document.getElementById('mirrorQuip');
    if (!q) return;
    quipTimer += 1;
    if (quipTimer % 360 !== 0) return;           // roughly every 6s at 60fps
    const line = motionAvg < 4
      ? ['are you… okay? blink twice.', 'a statue would move more.', 'the mirror is bored of you.'][(Math.random() * 3) | 0]
      : motionAvg > 30
        ? ['calm down. it\'s a website.', 'save some energy for the games.', 'the particles are scared of you.'][(Math.random() * 3) | 0]
        : ['you call that a wave?', 'mid movement. mid everything.', 'the mirror has seen better.'][(Math.random() * 3) | 0];
    q.textContent = '“' + line + '”';
  }

  function drawParts() {
    fxCtx.clearRect(0, 0, fxCv.width, fxCv.height);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 1;
      fxCtx.globalAlpha = p.life / 40;
      fxCtx.fillStyle = p.c;
      fxCtx.beginPath(); fxCtx.arc(p.x, p.y, 3, 0, 7); fxCtx.fill();
    });
    fxCtx.globalAlpha = 1;
    parts = parts.filter((p) => p.life > 0);
  }

  function frame() {
    if (!stream) return;
    if (window.PLAYLAB.vis.mirror !== false && video.readyState >= 2) {
      // mirror-flip the sample so it behaves like a mirror
      sctx.save();
      sctx.translate(SW, 0); sctx.scale(-1, 1);
      sctx.drawImage(video, 0, 0, SW, SH);
      sctx.restore();
      const d = sctx.getImageData(0, 0, SW, SH).data;

      const fx = FX[fxIdx];
      if (fx === 'THERMAL') thermal(d);
      else if (fx === 'ASCII') ascii(d);
      else if (fx === 'GLITCH') {
        // glitch draws the raw video, flip via canvas transform
        ctx.save(); ctx.translate(out.width, 0); ctx.scale(-1, 1);
        glitch(); ctx.restore();
      } else if (fx === 'EDGE') edge(d);
      else if (fx === 'GHOST') ghost();
      else mosaic(d);

      motion(d);
      drawParts();
      quips();
    }
    window.PLAYLAB.raf(frame);
  }

  async function start() {
    msgEl.textContent = 'Negotiating with the browser…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await video.play();
      overlay.classList.add('off');
      fxBtn.disabled = false; stopBtn.disabled = false;
      Sound()?.win();
      window.PLAYLAB.toast?.('the mirror is awake. wave at it.');
      window.PLAYLAB.raf(frame);
    } catch (err) {
      msgEl.textContent = err?.name === 'NotAllowedError'
        ? 'The mirror was refused. It respects that, but it sulks.'
        : 'No camera found. The mirror stares into nothing.';
      Sound()?.trap();
    }
  }

  function stop() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null; prev = null;
    overlay.classList.remove('off');
    msgEl.textContent = 'The mirror sleeps. It saw nothing. It kept nothing.';
    fxBtn.disabled = true; stopBtn.disabled = true;
    meterBar.style.width = '0%';
    ctx.fillStyle = '#0a0716';
    ctx.fillRect(0, 0, out.width, out.height);
  }

  window.PLAYLAB.initMirror = () => {
    video = document.getElementById('mirrorVideo');
    out = document.getElementById('mirrorCanvas');
    ctx = out.getContext('2d');
    fxCv = document.getElementById('mirrorFxCanvas');
    fxCtx = fxCv.getContext('2d');
    overlay = document.getElementById('mirrorOverlay');
    msgEl = document.getElementById('mirrorMsg');
    fxBtn = document.getElementById('mirrorFx');
    stopBtn = document.getElementById('mirrorStop');
    meterBar = document.getElementById('mirrorMeterBar');
    section = document.querySelector('.zone--mirror .mirror__stage');

    document.getElementById('mirrorStart').addEventListener('click', start);
    stopBtn.addEventListener('click', () => { Sound()?.click(); stop(); });
    fxBtn.addEventListener('click', () => {
      fxIdx = (fxIdx + 1) % FX.length;
      fxBtn.textContent = 'FX: ' + FX[fxIdx];
      Sound()?.blip(500 + fxIdx * 150);
    });

    /* CHAOS slider — pixelation size / edge sensitivity / trail length */
    const amtEl = document.getElementById('mirrorAmt');
    amtEl?.addEventListener('input', () => {
      amt = +amtEl.value;
      Sound()?.blip(300 + amt * 60);
    });
  };
})();
