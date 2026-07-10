/* CURSOR_SURVIVOR — bullet-hell where your cursor is the protagonist.
   Triangles chase, squares drift, hexagons telegraph then dash.
   Gold stars: real ones grant slow-mo. Bait ones (pulsing red core) spawn a
   punishment squad. Score = seconds alive. */
(() => {
  const Sound = () => window.PLAYLAB.Sound;
  let cv, ctx, overlay, msgEl, timeEl, bestEl;
  let W = 0, H = 0, dpr = 1;
  let state = 'idle';
  let player, enemies, stars, parts, t0, elapsed, spawnAt, starAt, slowUntil;
  let best = +localStorage.getItem('playlab.surv.best') || 0;
  let mx = 0, my = 0;

  function size() {
    dpr = Math.min(devicePixelRatio, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reset() {
    player = { x: W / 2, y: H / 2, r: 9 };
    mx = W / 2; my = H / 2;
    enemies = []; stars = []; parts = [];
    elapsed = 0; spawnAt = 0; starAt = 6; slowUntil = 0;
    t0 = performance.now();
  }

  function spawnEnemy(kind) {
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -20 : side === 1 ? W + 20 : Math.random() * W;
    const y = side === 2 ? -20 : side === 3 ? H + 20 : Math.random() * H;
    kind = kind || (['tri', 'tri', 'sq', 'hex'])[Math.floor(Math.random() * 4)];
    const e = { kind, x, y, r: 11, rot: Math.random() * 7 };
    if (kind === 'sq') {
      const a = Math.atan2(player.y - y, player.x - x) + (Math.random() - 0.5) * 0.5;
      e.vx = Math.cos(a) * 3.2; e.vy = Math.sin(a) * 3.2; e.r = 13;
    }
    if (kind === 'hex') { e.phase = 'aim'; e.aimT = elapsed + 0.75; e.r = 12; }
    enemies.push(e);
  }

  function burst(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 30, color });
    }
  }

  function update(dt) {
    elapsed = (performance.now() - t0) / 1000;
    const slow = elapsed < slowUntil ? 0.35 : 1;
    const ts = dt * 60 * slow;

    // player eases toward the pointer — feels expensive, is one lerp
    player.x += (mx - player.x) * 0.35;
    player.y += (my - player.y) * 0.35;

    // ramping spawns
    if (elapsed > spawnAt) {
      spawnEnemy();
      spawnAt = elapsed + Math.max(0.32, 0.95 - elapsed * 0.011);
    }
    // stars
    if (elapsed > starAt) {
      stars.push({
        x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80),
        bait: Math.random() < 0.45, r: 13, born: elapsed, spin: 0,
      });
      starAt = elapsed + 7 + Math.random() * 4;
    }

    for (const e of enemies) {
      if (e.kind === 'tri') {
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        const sp = (1.5 + Math.min(elapsed * 0.03, 1.6));
        e.x += Math.cos(a) * sp * ts; e.y += Math.sin(a) * sp * ts;
        e.rot = a;
      } else if (e.kind === 'sq') {
        e.x += e.vx * ts; e.y += e.vy * ts; e.rot += 0.05 * ts;
      } else if (e.kind === 'hex') {
        if (e.phase === 'aim') {
          e.tx = player.x; e.ty = player.y;   // keeps re-aiming while telegraphing
          if (elapsed > e.aimT) {
            const a = Math.atan2(e.ty - e.y, e.tx - e.x);
            e.vx = Math.cos(a) * 8.5; e.vy = Math.sin(a) * 8.5;
            e.phase = 'dash';
          }
        } else {
          e.x += e.vx * ts; e.y += e.vy * ts;
        }
      }
      // collision
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < e.r + player.r - 3 && elapsed > 1) return die();
      if (d < 34 && d > e.r + player.r) {   // near miss sparkle
        if (Math.random() < 0.2) parts.push({ x: player.x, y: player.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 14, color: '#c8ff3e' });
      }
    }
    enemies = enemies.filter((e) => e.x > -60 && e.x < W + 60 && e.y > -60 && e.y < H + 60);

    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.spin += 0.04 * ts;
      if (elapsed - s.born > 6) { stars.splice(i, 1); continue; }
      if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + player.r + 4) {
        stars.splice(i, 1);
        if (s.bait) {
          for (let k = 0; k < 8; k++) spawnEnemy('tri');
          burst(s.x, s.y, '#ff4040', 24);
          window.PLAYLAB.toast?.('bait.');
          Sound()?.trap();
        } else {
          slowUntil = elapsed + 2.5;
          burst(s.x, s.y, '#ffd24a', 20);
          window.PLAYLAB.toast?.('SLOW-MO ✦ 2.5s');
          Sound()?.coin();
        }
      }
    }

    parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.life -= 1; });
    parts = parts.filter((p) => p.life > 0);
    timeEl.textContent = elapsed.toFixed(1);
  }

  function die() {
    state = 'dead';
    burst(player.x, player.y, '#c8ff3e', 40);
    Sound()?.death();
    const newBest = elapsed > best;
    if (newBest) {
      best = elapsed;
      localStorage.setItem('playlab.surv.best', best.toFixed(1));
      window.PLAYLAB.toast?.('NEW BEST: ' + best.toFixed(1) + 's');
    }
    bestEl.textContent = (+best).toFixed(1);

    /* Roast engine: the shapes talk trash now */
    const tier = newBest && elapsed > 10 ? 'respect' : elapsed < 15 ? 'brutal' : 'mid';
    const R = window.PLAYLAB.Roast;
    if (R) {
      const hit = tier === 'respect' ? +150 : tier === 'mid' ? -250 : -500;
      const r = R.loss({ tier, anchor: document.querySelector('.surv__stage'), auraHit: hit });
      msgEl.innerHTML =
        `<span class="roast-head">${r.headline}</span>` +
        `<span class="roast-line">${r.line}</span>` +
        `<span class="roast-score">SURVIVED ${elapsed.toFixed(1)}s · the shapes remember.</span>`;
    } else {
      msgEl.textContent = `survived ${elapsed.toFixed(1)}s. the shapes remember.`;
    }

    document.getElementById('survStart').textContent = 'REDEPLOY';
    overlay.classList.remove('off');
    cv.closest('.surv__stage')?.classList.remove('live');
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const slow = elapsed < slowUntil && state === 'run';
    if (slow) { ctx.fillStyle = 'rgba(255,210,74,0.05)'; ctx.fillRect(0, 0, W, H); }

    // stars
    for (const s of stars) {
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.spin);
      ctx.fillStyle = '#ffd24a';
      ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 16;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? s.r * 0.45 : s.r;
        const a = (i / 10) * Math.PI * 2;
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      if (s.bait) {                                // the tell: pulsing red core
        ctx.fillStyle = `rgba(255,40,40,${0.5 + 0.5 * Math.sin(elapsed * 9)})`;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // enemies
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
      if (e.kind === 'tri') {
        ctx.fillStyle = '#ff3d81'; ctx.shadowColor = '#ff3d81'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(e.r + 3, 0); ctx.lineTo(-e.r, e.r * 0.8); ctx.lineTo(-e.r, -e.r * 0.8);
        ctx.closePath(); ctx.fill();
      } else if (e.kind === 'sq') {
        ctx.fillStyle = '#41f0ff'; ctx.shadowColor = '#41f0ff'; ctx.shadowBlur = 10;
        ctx.fillRect(-e.r, -e.r, e.r * 2, e.r * 2);
      } else {
        ctx.fillStyle = e.phase === 'aim' ? 'rgba(200,255,62,0.5)' : '#c8ff3e';
        ctx.shadowColor = '#c8ff3e'; ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * e.r, Math.sin(a) * e.r);
        }
        ctx.closePath(); ctx.fill();
        if (e.phase === 'aim') {                  // dash telegraph line
          ctx.rotate(-(e.rot || 0));
          ctx.strokeStyle = 'rgba(200,255,62,0.25)';
          ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(e.tx - e.x, e.ty - e.y); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // particles
    for (const p of parts) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // player
    if (state === 'run') {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = slow ? '#ffd24a' : '#c8ff3e';
      ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (window.PLAYLAB.vis.survivor !== false) {
      if (state === 'run') update(dt);
      draw();
    }
    window.PLAYLAB.raf(loop);
  }

  window.PLAYLAB.initSurvivor = () => {
    cv = document.getElementById('survCanvas');
    ctx = cv.getContext('2d');
    overlay = document.getElementById('survOverlay');
    msgEl = document.getElementById('survMsg');
    timeEl = document.getElementById('survTime');
    bestEl = document.getElementById('survBest');
    bestEl.textContent = (+best).toFixed(1);

    size();
    addEventListener('resize', size, { passive: true });

    const track = (cx, cy) => {
      const r = cv.getBoundingClientRect();
      mx = Math.max(6, Math.min(W - 6, cx - r.left));
      my = Math.max(6, Math.min(H - 6, cy - r.top));
    };
    cv.addEventListener('mousemove', (e) => track(e.clientX, e.clientY), { passive: true });
    cv.addEventListener('touchmove', (e) => { e.preventDefault(); track(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });

    document.getElementById('survStart').addEventListener('click', () => {
      size(); reset();
      state = 'run';
      overlay.classList.add('off');
      cv.closest('.surv__stage')?.classList.add('live');
      Sound()?.blip(700);
    });

    /* If the tab hides mid-run, shift t0 by the hidden duration so the
       survival clock doesn't count time the player couldn't play. */
    let hiddenAt = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = performance.now(); }
      else if (hiddenAt !== null) {
        if (state === 'run') t0 += performance.now() - hiddenAt;
        last = performance.now();
        hiddenAt = null;
      }
    });

    window.PLAYLAB.raf(loop);

    /* debug handle — closure state + manual tick (used by automated tests
       in environments where rAF is frozen) */
    window.PLAYLAB._surv = Object.assign(
      () => ({ state, elapsed, t0, enemies: enemies?.length, stars: stars?.length, W, H, mx, my, lastTick: last }),
      { tick: (dt) => { if (state === 'run') update(dt); draw(); } }
    );
  };
})();
