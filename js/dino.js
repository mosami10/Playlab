/* DINO.EXE — the extinction simulator.
   Chrome-dino skeleton, PLAYLAB chaos on top:
   - mimic coins (some treasure bites back)
   - lying event banners (CONTROLS REVERSED… or is it)
   - moon gravity + speed surges + ground gaps
   - a fully customisable dino (skin / hat / face / bling), persisted.
   Canvas is a fixed 900×300 stage scaled by CSS. The loop always runs so the
   fitting room previews outfits live, even before the first run. */
(() => {
  const W = 900, H = 300, GROUND = 252;
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);

  const SKINS = { mint: '#63f2b8', magma: '#ff5c39', banana: '#ffd93b', void: '#16161c' };
  const DEATH_MSGS = {
    bug:   ['A bug. In production. Classic.', 'The bug won. They usually do.'],
    drone: ['Clipped by a delivery drone. It had a package for you: pain.', 'The drone union sends regards.'],
    gap:   ['Gravity: 1 — You: 0.', 'That hole was on the map. You did not read the map.'],
    mimic: ['The coin was a mimic. Obviously.', 'You trusted the shiny thing. The shiny thing had teeth.'],
  };

  let cv, ctx, overlay, msgEl, scoreEl, bestEl, bannerEl;
  let state = 'idle';                       // idle | run | dead
  let t = 0, speed = 6, dist = 0, coinsGot = 0, score = 0;
  let best = +localStorage.getItem('playlab.dino.best') || 0;
  let dino, obs, coins, parts, spawnIn, coinIn, eventIn, evt, shake, duckKeys;
  let fit;
  try { fit = JSON.parse(localStorage.getItem('playlab.fit')); } catch (_) {}
  fit = Object.assign({ skin: 'mint', hat: 'none', face: 'none', bling: 'none' }, fit || {});

  function reset() {
    t = 0; speed = 6; dist = 0; coinsGot = 0; score = 0;
    dino = { x: 90, y: GROUND, vy: 0, duck: false, ground: true, squash: 0 };
    obs = []; coins = []; parts = [];
    spawnIn = 90; coinIn = 160; eventIn = 500; evt = null; shake = 0;
    duckKeys = new Set();
  }
  reset();

  /* ── input ─────────────────────────────────────────────────────── */
  const reversed = () => evt && evt.name === 'REVERSED' && !evt.lie && t < evt.until;

  function doJump() {
    if (state === 'dead') { start(); return; }
    if (state !== 'run') return;
    if (dino.ground) {
      dino.vy = -12;
      dino.ground = false;
      Sound()?.jump();
    }
  }
  function setDuck(key, on) {
    if (on) duckKeys.add(key); else duckKeys.delete(key);
    dino.duck = duckKeys.size > 0;
  }
  function onKey(e, down) {
    if (window.PLAYLAB.vis.dino === false) return;
    const jumpKey = e.code === 'Space' || e.code === 'ArrowUp';
    const duckKey = e.code === 'ArrowDown';
    if (!jumpKey && !duckKey) return;
    if (state === 'run' || state === 'dead') e.preventDefault();

    const flip = reversed();
    if (down) {
      if ((jumpKey && !flip) || (duckKey && flip)) doJump();
      else setDuck(e.code, true);
    } else {
      setDuck(e.code, false);
    }
  }

  /* ── chaos events ──────────────────────────────────────────────── */
  function fireEvent() {
    const roll = Math.random();
    if (roll < 0.4) {
      const lie = Math.random() < 0.5;
      evt = { name: 'REVERSED', lie, until: t + 260 };
      banner('⚠ CONTROLS REVERSED ⚠');
      if (lie) setTimeout(() => { if (state === 'run') toast('…the sign lied. nothing changed.'); }, 1700);
    } else if (roll < 0.7) {
      evt = { name: 'MOON', until: t + 320 };
      banner('🌙 MOON GRAVITY');
    } else {
      evt = { name: 'SURGE', until: t + 170 };
      banner('⚡ SPEED SURGE');
      shake = 14;
      Sound()?.zap();
    }
    eventIn = 550 + Math.random() * 420;
  }
  function banner(text) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    setTimeout(() => bannerEl.classList.remove('show'), 2000);
  }

  /* ── update ────────────────────────────────────────────────────── */
  function update() {
    t += 1;
    const surge = evt?.name === 'SURGE' && t < evt.until ? 4 : 0;
    const sp = speed + surge;
    speed = Math.min(14, 6 + dist / 2600);
    dist += sp;
    score = Math.floor(dist / 9) + coinsGot * 50;

    // spawn obstacles
    spawnIn -= 1;
    if (spawnIn <= 0) {
      const r = Math.random();
      if (r < 0.48) obs.push({ type: 'bug', x: W + 30, w: 26 + Math.random() * 18, h: 30 + Math.random() * 18 });
      else if (r < 0.78) obs.push({ type: 'drone', x: W + 30, w: 46, h: 22, y: GROUND - 46, rot: 0 });
      else if (score > 150) obs.push({ type: 'gap', x: W + 30, w: 72 + Math.random() * 46 });
      else obs.push({ type: 'bug', x: W + 30, w: 30, h: 34 });
      spawnIn = (58 + Math.random() * 55) * (6.5 / Math.max(sp, 6.5)) + 30;
    }
    // spawn coins
    coinIn -= 1;
    if (coinIn <= 0) {
      coins.push({ x: W + 20, y: GROUND - 70 - Math.random() * 55, mimic: Math.random() < 0.22, r: 11 });
      coinIn = 130 + Math.random() * 200;
    }
    // events
    eventIn -= 1;
    if (eventIn <= 0 && !evt) fireEvent();
    if (evt && t >= evt.until) evt = null;

    // physics
    const g = evt?.name === 'MOON' && t < evt.until ? 0.24 : 0.62;
    dino.vy += g;
    dino.y += dino.vy;

    // ground / gap resolution
    const overGap = obs.some((o) => o.type === 'gap' && dino.x + 20 > o.x && dino.x + 20 < o.x + o.w);
    if (dino.y >= GROUND) {
      if (overGap) {
        if (dino.y > GROUND + 40) return die('gap');   // fell in
      } else {
        if (!dino.ground) { dino.squash = 6; }
        dino.y = GROUND; dino.vy = 0; dino.ground = true;
      }
    }
    if (dino.squash > 0) dino.squash -= 0.6;

    // move + cull world
    obs.forEach((o) => { o.x -= sp; if (o.rot !== undefined) o.rot += 0.4; });
    coins.forEach((c) => { c.x -= sp; });
    obs = obs.filter((o) => o.x + (o.w || 60) > -40);
    coins = coins.filter((c) => c.x > -30);

    // collisions — AABB with kindness padding
    const dw = 40, dh = dino.duck ? 26 : 46;
    const dx = dino.x + 4, dy = dino.y - dh;
    for (const o of obs) {
      if (o.type === 'gap') continue;
      const oy = o.type === 'drone' ? o.y : GROUND - o.h;
      if (dx < o.x + o.w - 8 && dx + dw - 8 > o.x && dy < oy + o.h - 6 && dy + dh - 6 > oy) {
        return die(o.type);
      }
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      const cx = dx + dw / 2, cy = dy + dh / 2;
      if (Math.hypot(c.x - cx, c.y - cy) < 30) {
        coins.splice(i, 1);
        if (c.mimic) { burst(c.x, c.y, '#ff4040', 26); return die('mimic'); }
        coinsGot += 1;
        burst(c.x, c.y, '#ffd24a', 14);
        Sound()?.coin();
      }
    }

    // particles
    parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 1; });
    parts = parts.filter((p) => p.life > 0);
    if (shake > 0) shake -= 1;
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 24 + Math.random() * 18, color });
    }
  }

  function die(cause) {
    state = 'dead';
    const msgs = DEATH_MSGS[cause] || ['Extinct. Again.'];
    const causeMsg = msgs[Math.floor(Math.random() * msgs.length)];
    burst(dino.x + 20, dino.y - 24, SKINS[fit.skin] || '#63f2b8', 30);
    shake = 18;
    (cause === 'mimic' ? Sound()?.trap() : Sound()?.death());

    const newBest = score > best;
    if (newBest) { best = score; localStorage.setItem('playlab.dino.best', best); toast('NEW BEST: ' + best); }

    /* Roast engine: performance-tiered disrespect + aura economy */
    const tier = newBest && score > 100 ? 'respect' : score < 200 ? 'brutal' : 'mid';
    const R = window.PLAYLAB.Roast;
    if (R) {
      const hit = tier === 'respect' ? +150 : tier === 'mid' ? -250 : -500;
      const r = R.loss({ tier, anchor: document.querySelector('.dino__stage'), auraHit: hit });
      msgEl.innerHTML =
        `<span class="roast-head">${r.headline}</span>` +
        `<span class="roast-line">${r.line}</span>` +
        `<span class="roast-score">SCORE ${score} · ${causeMsg}</span>`;
    } else {
      msgEl.textContent = causeMsg + ` — SCORE ${score}`;
    }

    document.getElementById('dinoStart').textContent = 'RUN IT BACK';
    overlay.classList.remove('off');
    document.querySelector('.dino__stage')?.classList.remove('live');
    syncHud();
  }

  function start() {
    reset();
    state = 'run';
    overlay.classList.add('off');
    document.querySelector('.dino__stage')?.classList.add('live');
    Sound()?.blip(520);
  }

  /* ── drawing ───────────────────────────────────────────────────── */
  function skinColor() {
    if (fit.skin === 'holo') return `hsl(${(t * 2.4) % 360} 90% 66%)`;
    return SKINS[fit.skin] || SKINS.mint;
  }

  function drawDino() {
    const duck = dino.duck && dino.ground;
    const fy = dino.y;                       // foot line
    const x = dino.x;
    const bodyW = 44, legH = 12;
    const bodyH = (duck ? 22 : 32) - dino.squash * 0.6;
    const by = fy - legH - bodyH;
    const col = skinColor();
    const isVoid = fit.skin === 'void';
    const phase = Math.floor(t / 5) % 2;

    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x + 24, GROUND + 6, 26, 5, 0, 0, 7); ctx.fill();

    ctx.fillStyle = col;
    ctx.strokeStyle = isVoid ? '#c8ff3e' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = isVoid ? 2 : 1;

    // legs (tucked mid-air)
    if (dino.ground) {
      ctx.fillRect(x + 8 + (phase ? 0 : 4), fy - legH, 9, legH);
      ctx.fillRect(x + 26 + (phase ? 4 : 0), fy - legH, 9, legH);
    } else {
      ctx.fillRect(x + 10, fy - legH - 2, 9, 9);
      ctx.fillRect(x + 26, fy - legH - 2, 9, 9);
    }
    // tail
    ctx.beginPath();
    ctx.moveTo(x - 14, by + 4); ctx.lineTo(x + 4, by); ctx.lineTo(x + 4, by + bodyH * 0.7);
    ctx.closePath(); ctx.fill(); if (isVoid) ctx.stroke();
    // body
    rr(x, by, bodyW, bodyH, 8); ctx.fill(); if (isVoid) ctx.stroke();
    // head
    const hx = x + bodyW - 10, hy = by - (duck ? 6 : 16);
    rr(hx, hy, 30, 20, 6); ctx.fill(); if (isVoid) ctx.stroke();

    // face
    const ex = hx + 20, ey = hy + 7;
    if (fit.face === 'shades') {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(hx + 12, ey - 3, 17, 7);
      ctx.fillRect(hx + 2, ey - 2, 12, 2);
    } else if (fit.face === 'laser') {
      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.arc(ex, ey, 3.4, 0, 7); ctx.fill();
      const lg = ctx.createLinearGradient(ex, ey, ex + 70, ey);
      lg.addColorStop(0, 'rgba(255,40,40,0.9)'); lg.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = lg; ctx.fillRect(ex, ey - 1.5, 70, 3);
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + 1, ey, 1.8, 0, 7); ctx.fill();
    }

    // hats
    ctx.fillStyle = '#111';
    if (fit.hat === 'cap') {
      ctx.fillStyle = '#ff3d81';
      ctx.beginPath(); ctx.arc(hx + 15, hy + 1, 12, Math.PI, 0); ctx.fill();
      ctx.fillRect(hx + 15, hy - 3, 22, 4);
    } else if (fit.hat === 'crown') {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy); ctx.lineTo(hx + 4, hy - 10); ctx.lineTo(hx + 10, hy - 3);
      ctx.lineTo(hx + 15, hy - 12); ctx.lineTo(hx + 20, hy - 3); ctx.lineTo(hx + 26, hy - 10);
      ctx.lineTo(hx + 26, hy); ctx.closePath(); ctx.fill();
    } else if (fit.hat === 'halo') {
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(hx + 15, hy - 12 + Math.sin(t * 0.1) * 2, 13, 4, 0, 0, 7);
      ctx.stroke();
    } else if (fit.hat === 'tophat') {
      ctx.fillStyle = '#0d0d12';
      ctx.fillRect(hx + 4, hy - 16, 22, 16);
      ctx.fillRect(hx - 1, hy - 3, 32, 4);
      ctx.fillStyle = '#c8ff3e'; ctx.fillRect(hx + 4, hy - 6, 22, 3);
    }

    // bling
    if (fit.bling === 'chain') {
      ctx.fillStyle = '#ffd24a';
      for (let i = 0; i < 5; i++) {
        const ang = 0.35 + i * 0.13;
        ctx.beginPath();
        ctx.arc(hx + 4 + i * 5, hy + 22 + Math.sin(ang * 6) * 2.5, 2.6, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.clearRect(-20, -20, W + 40, H + 40);

    // synthwave floor grid
    ctx.strokeStyle = 'rgba(255,61,129,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const gy = GROUND + 4 + i * 8;
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    const gridOff = (dist * 1.2) % 60;
    ctx.strokeStyle = 'rgba(65,240,255,0.10)';
    for (let gx = -gridOff; gx < W; gx += 60) {
      ctx.beginPath(); ctx.moveTo(gx, GROUND + 2); ctx.lineTo(gx - 30, H); ctx.stroke();
    }

    // ground line, interrupted by gaps
    ctx.strokeStyle = '#41f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#41f0ff'; ctx.shadowBlur = 8;
    let segStart = 0;
    const gaps = obs.filter((o) => o.type === 'gap').sort((a, b) => a.x - b.x);
    for (const gp of gaps) {
      ctx.beginPath(); ctx.moveTo(segStart, GROUND + 2); ctx.lineTo(Math.max(segStart, gp.x), GROUND + 2); ctx.stroke();
      segStart = gp.x + gp.w;
      ctx.save();                                  // hazard chevrons at gap edges
      ctx.fillStyle = 'rgba(255,61,129,0.85)';
      ctx.shadowBlur = 0;
      ctx.fillRect(gp.x - 4, GROUND, 4, 8);
      ctx.fillRect(gp.x + gp.w, GROUND, 4, 8);
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(segStart, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // coins
    for (const c of coins) {
      const glint = c.mimic && Math.floor(t / 8) % 5 === 0;   // the tell — learn it
      ctx.save();
      ctx.fillStyle = glint ? '#ff5050' : '#ffd24a';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(c.x, c.y + Math.sin(t * 0.08 + c.x) * 3, c.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('$', c.x, c.y + Math.sin(t * 0.08 + c.x) * 3 + 4);
      ctx.restore();
    }

    // obstacles
    for (const o of obs) {
      if (o.type === 'bug') {
        const oy = GROUND - o.h;
        ctx.save();
        ctx.fillStyle = '#ff3d81';
        ctx.shadowColor = '#ff3d81'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(o.x, GROUND);
        for (let i = 0; i <= 4; i++) ctx.lineTo(o.x + (o.w / 4) * i, oy + (i % 2 ? 0 : 10));
        ctx.lineTo(o.x + o.w, GROUND);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#12021f';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(o.x + o.w / 2, oy + 16, 3, 0, 7); ctx.fill();
        ctx.restore();
      } else if (o.type === 'drone') {
        ctx.save();
        ctx.fillStyle = '#41f0ff';
        ctx.shadowColor = '#41f0ff'; ctx.shadowBlur = 10;
        rr(o.x, o.y, o.w, o.h, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(216,255,232,0.9)'; ctx.lineWidth = 2;
        const rl = 18 * Math.cos(o.rot);
        ctx.beginPath(); ctx.moveTo(o.x + o.w / 2 - rl, o.y - 5); ctx.lineTo(o.x + o.w / 2 + rl, o.y - 5); ctx.stroke();
        ctx.fillStyle = '#ff2222'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(o.x + 8, o.y + o.h / 2, 2.5, 0, 7); ctx.fill();
        ctx.restore();
      }
    }

    drawDino();

    // particles
    for (const p of parts) {
      ctx.globalAlpha = Math.max(p.life / 30, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    if (state === 'idle') {
      ctx.fillStyle = 'rgba(216,255,232,0.5)';
      ctx.font = '10px Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('· fitting room live preview ·', W / 2, 40);
    }
    ctx.restore();
  }

  function syncHud() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
  }

  /* ── fitting room ──────────────────────────────────────────────── */
  function wireFitting() {
    document.querySelectorAll('.fitting__row').forEach((row) => {
      const group = row.dataset.fitGroup;
      row.querySelectorAll('button').forEach((btn) => {
        if (fit[group] === btn.dataset.fit) {
          row.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
          btn.classList.add('on');
        }
        btn.addEventListener('click', () => {
          fit[group] = btn.dataset.fit;
          localStorage.setItem('playlab.fit', JSON.stringify(fit));
          row.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
          btn.classList.add('on');
          Sound()?.click();
        });
      });
    });
  }

  /* ── boot ──────────────────────────────────────────────────────── */
  window.PLAYLAB.initDino = () => {
    cv = document.getElementById('dinoCanvas');
    ctx = cv.getContext('2d');
    overlay = document.getElementById('dinoOverlay');
    msgEl = document.getElementById('dinoMsg');
    scoreEl = document.getElementById('dinoScore');
    bestEl = document.getElementById('dinoBest');
    bannerEl = document.getElementById('dinoBanner');
    bestEl.textContent = best;

    document.getElementById('dinoStart').addEventListener('click', start);
    cv.addEventListener('pointerdown', () => { if (state === 'run') doJump(); });
    addEventListener('keydown', (e) => onKey(e, true));
    addEventListener('keyup', (e) => onKey(e, false));

    wireFitting();

    (function loop() {
      if (window.PLAYLAB.vis.dino !== false) {
        t += state === 'run' ? 0 : 1;         // idle animation clock
        if (state === 'run') update();
        draw();
        if (state === 'run') syncHud();
      }
      window.PLAYLAB.raf(loop);
    })();
  };
})();
