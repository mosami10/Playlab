/* DOODLE VOID 3D — a hand-drawn voxel world, rendered for real.
   Three.js scene dressed as a pencil sketch: paper fog, ink-outlined cubes,
   a doodle stick-guy with googly eyes, clouds made of blobs, and physics
   that betray you. All the gaslighting survived the jump to 3D:
   - void tiles are drawings of tiles (warmer tint + smudge + extra wobble)
   - crumble tiles crack, hesitate, then drop out from under you — physically
   - springs launch you two rows. usually forward.
   - "✓ checkpoint" teleports you to the start. checkpoints are a mythology.
   - signs lie 60% of the time. the flag RUNS AWAY twice before submitting.
   Controls: WASD / arrows to hop. On-screen pad on touch. */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);

  const COLS = 5, ROWS = 14, PITCH = 1.15;
  const PAPER = 0xf5f2ea, INK = 0x2a2622;
  const TILE_SOLID = 0xf8f5ee, TILE_VOIDISH = 0xece7d8;

  const FALL_QUIPS = [
    'the floor was a drawing. so are you.',
    'that tile was load-bearing… for your ego.',
    'gravity is canon in this universe. sorry.',
    'the artist erased that one years ago.',
    'you trusted pencil. pencil is temporary.',
    'sketchy tile. sketchy decision.',
  ];

  let cv, overlay, msgEl, hopsEl, fallsEl, startBtn;
  let T, scene, camera, renderer, ready = false;
  let world = [], tiles = [], signs = [], player, flagGroup, flagGeo, clouds = [], ambientStars = [], puffs = [];
  let state = 'idle';                 // idle | run | anim | falling | dead | won
  let anim = null, falls = 0, hops = 0, goalMoves = 0, reverseHops = 0;
  let camShake = 0, frame = 0, boilEpoch = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── tiny helpers ────────────────────────────────────────────── */
  const colX = (c) => (c - 2) * PITCH;
  const rowZ = (r) => -r * PITCH;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = (n) => { const s = Math.sin(n * 127.1 + boilEpoch * 311.7) * 43758.5453; return (s - Math.floor(s)) - 0.5; };

  function label(text, w = 256, h = 128, size = 44, angle = -0.04) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#f8f5ee'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#2a2622'; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#2a2622';
    x.font = `700 ${size}px Caveat, cursive`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.save(); x.translate(w / 2, h / 2); x.rotate(angle);
    x.fillText(text, 0, 0); x.restore();
    const tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }
  function inkEdges(geo) {
    return new T.LineSegments(new T.EdgesGeometry(geo, 20), new T.LineBasicMaterial({ color: INK }));
  }

  /* ── world data (same lying generator as ever) ───────────────── */
  function generate() {
    world = [];
    let safe = 2;
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      safe = Math.max(0, Math.min(COLS - 1, safe + (Math.random() < 0.34 ? -1 : Math.random() < 0.5 ? 0 : 1)));
      for (let c = 0; c < COLS; c++) {
        let type = 'solid';
        if (c !== safe && r > 0) {
          const roll = Math.random();
          if (roll < 0.30) type = 'void';
          else if (roll < 0.48) type = 'crumble';
          else if (roll < 0.56) type = 'spring';
          else if (roll < 0.62) type = 'checkpoint';
          else if (roll < 0.68) type = 'reverse';
        }
        row.push({ type, broken: false, crumbleAt: 0 });
      }
      row.signCol = Math.random() < 0.55 ? (Math.random() < 0.4 ? safe : (safe + 1 + (Math.random() * (COLS - 1) | 0)) % COLS) : -1;
      world.push(row);
    }
  }
  function extendWorld(untilRow) {
    while (world.length <= untilRow) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push({ type: c === 2 ? 'solid' : (Math.random() < 0.4 ? 'void' : 'solid'), broken: false, crumbleAt: 0 });
      row.signCol = -1;
      world.push(row);
      buildRowMeshes(world.length - 1);
    }
  }

  /* ── scene construction ──────────────────────────────────────── */
  function buildTile(r, c) {
    const t = world[r][c];
    const g = new T.Group();
    const isVoid = t.type === 'void';
    const geo = new T.BoxGeometry(1, 0.5, 1);
    const mat = new T.MeshLambertMaterial({ color: isVoid ? TILE_VOIDISH : TILE_SOLID });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.y = -0.25;
    g.add(mesh, inkEdges(geo).translateY(-0.25));

    if (isVoid) {                                 // the smudge tell
      const smudge = new T.Mesh(
        new T.CircleGeometry(0.22, 10),
        new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.09 })
      );
      smudge.rotation.x = -Math.PI / 2;
      smudge.position.set(rnd(-0.15, 0.15), 0.012, rnd(-0.15, 0.15));
      g.add(smudge);
    }
    const topLabel = { spring: 'boing?', checkpoint: '✓ checkpoint', reverse: '⇄' }[t.type];
    if (topLabel) {
      const p = new T.Mesh(
        new T.PlaneGeometry(0.85, 0.42),
        new T.MeshBasicMaterial({ map: label(topLabel, 256, 128, topLabel === '⇄' ? 72 : 40), transparent: false })
      );
      p.rotation.x = -Math.PI / 2;
      p.position.y = 0.013;
      g.add(p);
    }
    g.position.set(colX(c), 0, rowZ(r));
    g.userData = { r, c, baseY: 0 };
    scene.add(g);
    return g;
  }
  function buildRowMeshes(r) {
    tiles[r] = [];
    for (let c = 0; c < COLS; c++) tiles[r][c] = buildTile(r, c);
    if (world[r].signCol >= 0) buildSign(r, world[r].signCol);
  }
  function buildSign(r, pointsAt) {
    const g = new T.Group();
    const post = new T.Mesh(new T.BoxGeometry(0.07, 1.0, 0.07), new T.MeshLambertMaterial({ color: TILE_SOLID }));
    post.position.y = 0.5;
    const dir = pointsAt - 2;
    const text = dir < 0 ? '← trust me' : dir > 0 ? 'trust me →' : 'this one ↑';
    const board = new T.Mesh(new T.PlaneGeometry(1.15, 0.55), new T.MeshBasicMaterial({ map: label(text, 256, 128, 40), side: T.DoubleSide }));
    board.position.y = 1.05;
    g.add(post, inkEdges(post.geometry).translateY(0.5), board);
    g.position.set(colX(-0.35) - 1.1, 0, rowZ(r));
    g.rotation.y = 0.35;
    scene.add(g);
    signs.push(g);
  }

  function buildPlayer() {
    const g = new T.Group();
    const mat = new T.MeshLambertMaterial({ color: TILE_SOLID });
    const body = new T.Mesh(new T.BoxGeometry(0.34, 0.4, 0.22), mat);
    body.position.y = 0.42;
    const head = new T.Mesh(new T.SphereGeometry(0.21, 18, 14), mat);
    head.position.y = 0.82;
    // googly eyes
    const eyeW = new T.MeshBasicMaterial({ color: 0xffffff });
    const eyeB = new T.MeshBasicMaterial({ color: 0x111111 });
    [-0.08, 0.08].forEach((x) => {
      const w = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), eyeW);
      w.position.set(x, 0.86, 0.17);
      const p = new T.Mesh(new T.SphereGeometry(0.026, 8, 6), eyeB);
      p.position.set(x, 0.86, 0.215);
      g.add(w, p);
    });
    const legGeo = new T.BoxGeometry(0.09, 0.22, 0.09);
    const l1 = new T.Mesh(legGeo, mat); l1.position.set(-0.1, 0.11, 0);
    const l2 = new T.Mesh(legGeo, mat); l2.position.set(0.1, 0.11, 0);
    const armGeo = new T.BoxGeometry(0.08, 0.26, 0.08);
    const a1 = new T.Mesh(armGeo, mat); a1.position.set(-0.24, 0.46, 0); a1.rotation.z = 0.35;
    const a2 = new T.Mesh(armGeo, mat); a2.position.set(0.24, 0.46, 0); a2.rotation.z = -0.35;
    g.add(body, inkEdges(body.geometry).translateY(0.42), head, l1, l2, a1, a2);
    // fake shadow
    const shadow = new T.Mesh(new T.CircleGeometry(0.26, 14), new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.16 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    g.add(shadow);
    g.userData.shadow = shadow;
    scene.add(g);
    return g;
  }

  function buildFlag() {
    flagGroup = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.7, 8), new T.MeshLambertMaterial({ color: TILE_SOLID }));
    pole.position.y = 0.85;
    flagGeo = new T.PlaneGeometry(1.05, 0.55, 12, 1);
    const flag = new T.Mesh(flagGeo, new T.MeshBasicMaterial({ map: label('FINISH (probably)', 512, 256, 62), side: T.DoubleSide }));
    flag.position.set(0.56, 1.35, 0);
    flagGroup.add(pole, flag);
    flagGroup.userData.flag = flag;
    flagGroup.position.set(0, 0, rowZ(ROWS - 1));
    scene.add(flagGroup);
  }

  function buildAmbience() {
    // blob clouds
    for (let i = 0; i < 5; i++) {
      const cl = new T.Group();
      const m = new T.MeshLambertMaterial({ color: 0xffffff });
      for (let k = 0; k < 3; k++) {
        const s = new T.Mesh(new T.SphereGeometry(rnd(0.3, 0.55), 12, 10), m);
        s.position.set(k * 0.45 - 0.45, rnd(-0.08, 0.08), 0);
        s.scale.y = 0.62;
        cl.add(s);
      }
      cl.position.set(rnd(-7, 7), rnd(2.8, 4.6), rowZ(rnd(0, ROWS)));
      cl.userData.speed = rnd(0.002, 0.006);
      scene.add(cl);
      clouds.push(cl);
    }
    // floating doodle stars
    const starTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      x.strokeStyle = '#2a2622'; x.lineWidth = 3; x.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? 10 : 26, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        x[i ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
      }
      x.closePath(); x.stroke();
      return new T.CanvasTexture(c);
    })();
    for (let i = 0; i < 22; i++) {
      const s = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), new T.MeshBasicMaterial({ map: starTex, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide }));
      s.position.set(rnd(-8, 8), rnd(-2.5, 3.5), rowZ(rnd(-2, ROWS + 4)));
      s.userData = { spin: rnd(-0.01, 0.01), bob: rnd(0, 6.3) };
      scene.add(s);
      ambientStars.push(s);
    }
    // landing puff pool
    for (let i = 0; i < 10; i++) {
      const p = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      p.visible = false;
      scene.add(p);
      puffs.push(p);
    }
  }
  function puffAt(x, z) {
    let n = 0;
    for (const p of puffs) {
      if (n >= 6) break;
      if (p.visible) continue;
      p.visible = true;
      p.position.set(x + rnd(-0.2, 0.2), 0.06, z + rnd(-0.2, 0.2));
      p.userData = { vx: rnd(-0.02, 0.02), vy: rnd(0.015, 0.04), vz: rnd(-0.02, 0.02), life: 1 };
      n++;
    }
  }

  function rebuildScene() {
    // clear old dynamic objects
    tiles.flat().forEach((g) => g && scene.remove(g));
    signs.forEach((g) => scene.remove(g));
    tiles = []; signs = [];
    for (let r = 0; r < world.length; r++) buildRowMeshes(r);
    if (flagGroup) scene.remove(flagGroup);
    buildFlag();
  }

  /* ── game state ──────────────────────────────────────────────── */
  const pos = { r: -1, c: 2 };
  function reset(full) {
    if (full) { generate(); falls = 0; goalMoves = 0; rebuildScene(); }
    else {
      // restore tile transforms + un-break everything except learned voids stay identical
      world.forEach((row) => row.forEach((t) => { t.broken = false; t.crumbleAt = 0; }));
      tiles.flat().forEach((g) => {
        if (!g) return;
        g.visible = true;
        g.position.y = 0;
        g.rotation.set(0, 0, 0);
        g.userData.vy = 0;
      });
    }
    pos.r = -1; pos.c = 2;
    player.position.set(colX(2), 0, rowZ(-1));
    player.rotation.set(0, 0, 0);
    player.scale.set(1, 1, 1);
    reverseHops = 0; hops = 0; anim = null;
    state = 'run';
    syncHud();
  }

  function tryHop(dr, dc) {
    if (state !== 'run') return;
    if (reverseHops > 0) { dr = -dr; dc = -dc; }
    const nr = pos.r + dr, nc = pos.c + dc;
    if (nc < 0 || nc >= COLS || nr < -1 || nr > world.length + 2) return;
    state = 'anim';
    anim = {
      from: player.position.clone(),
      to: new T.Vector3(colX(nc), 0, rowZ(nr)),
      t: 0, nr, nc, arc: 0.55, dur: 0.11,
    };
    player.userData.face = Math.atan2(anim.to.x - anim.from.x, anim.to.z - anim.from.z) + Math.PI;
    hops += 1;
    if (reverseHops > 0) reverseHops -= 1;
    Sound()?.blip(420 + Math.random() * 180);
    syncHud();
  }

  function land(nr, nc) {
    pos.r = nr; pos.c = nc;
    state = 'run';
    player.scale.set(1.12, 0.82, 1.12);            // squash — restored in update
    puffAt(colX(nc), rowZ(nr));

    const goalRow = ROWS - 1 + goalMoves * 2;
    if (nr >= goalRow) {
      if (goalMoves < 2) {
        goalMoves += 1;
        const newRow = ROWS - 1 + goalMoves * 2;
        extendWorld(newRow);
        toast(goalMoves === 1 ? 'the flag moved. flags do that.' : 'it moved AGAIN. one more. promise.');
        Sound()?.trap();
        anim = null;
        flagGroup.userData.tween = { fromZ: flagGroup.position.z, toZ: rowZ(newRow), t: 0 };
        if (goalMoves === 2) flagGroup.userData.flag.material.map = label('fine. the real one.', 512, 256, 56);
        return;
      }
      return winGame();
    }
    if (nr === -1) return;
    const t = world[nr]?.[nc];
    if (!t || t.broken) return fall();

    if (t.type === 'void') return fall(nr, nc);
    if (t.type === 'crumble') { t.crumbleAt = performance.now() + 460; Sound()?.blip(180); }
    if (t.type === 'spring') {
      const back = Math.random() < 0.3;
      toast(back ? 'the spring lied.' : 'boing.');
      const target = Math.max(-1, nr + (back ? -2 : 2));
      state = 'anim';
      anim = { from: player.position.clone(), to: new T.Vector3(colX(nc), 0, rowZ(target)), t: 0, nr: target, nc, arc: 1.5, dur: 0.045 };
      Sound()?.jump();
      return;
    }
    if (t.type === 'checkpoint') {
      toast('checkpoint claimed! …checkpoint was a lie.');
      Sound()?.trap();
      state = 'anim';
      anim = { from: player.position.clone(), to: new T.Vector3(colX(2), 0, rowZ(-1)), t: 0, nr: -1, nc: 2, arc: 2.2, dur: 0.03 };
      return;
    }
    if (t.type === 'reverse') {
      reverseHops = 3;
      toast('⇄ controls reversed for 3 hops. the tile says sorry. it isn\'t.');
      Sound()?.zap();
    }
  }

  function fall(r, c) {
    state = 'falling';
    camShake = 0.25;
    player.userData.vy = 0.02;
    if (r !== undefined && tiles[r]?.[c]) {
      const g = tiles[r][c];
      g.userData.vy = 0.03;
      world[r][c].broken = true;
    }
    Sound()?.death();
  }
  function finishFall() {
    state = 'dead';
    falls += 1;
    const quip = FALL_QUIPS[(Math.random() * FALL_QUIPS.length) | 0];
    const R = window.PLAYLAB.Roast;
    if (R) {
      const r = R.loss({ tier: falls > 4 ? 'brutal' : 'mid', anchor: document.querySelector('.doodle__stage'), auraHit: -Math.min(150 + falls * 50, 500) });
      msgEl.innerHTML = `<span class="roast-head roast-head--ink">${r.headline}</span>` +
        `<span class="roast-line roast-line--ink">${quip}</span>` +
        `<span class="roast-score roast-score--ink">falls: ${falls} · hops wasted: ${hops}</span>`;
    } else msgEl.textContent = quip;
    startBtn.textContent = 'HOP AGAIN';
    overlay.classList.remove('off');
    syncHud();
  }

  function winGame() {
    state = 'won';
    window.PLAYLAB.Roast?.win({ anchor: document.querySelector('.doodle__stage'), auraGain: 1500 });
    // 3D star confetti
    for (const s of ambientStars.slice(0, 16)) {
      s.userData.burst = { vx: rnd(-0.06, 0.06), vy: rnd(0.05, 0.13), vz: rnd(-0.06, 0.06), life: 1 };
      s.position.copy(flagGroup.position).add(new T.Vector3(0, 1.2, 0));
    }
    msgEl.innerHTML = `<span class="roast-head roast-head--ink">fine. you win. whatever.</span>` +
      `<span class="roast-line roast-line--ink">the flag has accepted its fate. (real)</span>` +
      `<span class="roast-score roast-score--ink">${falls} falls · ${hops} hops · flag moved ${goalMoves}×</span>`;
    startBtn.textContent = 'NEW WORLD';
    overlay.classList.remove('off');
    Sound()?.win();
  }

  function syncHud() {
    if (hopsEl) hopsEl.textContent = hops;
    if (fallsEl) fallsEl.textContent = falls;
  }

  /* ── per-frame update ────────────────────────────────────────── */
  function update(dt) {
    frame += 1;
    const ts = dt * 60;
    if (!reduced && frame % 9 === 0) boilEpoch += 1;

    // boiling tiles
    if (!reduced) {
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < COLS; c++) {
          const g = tiles[r]?.[c];
          if (!g || !g.visible || g.userData.vy) continue;
          const mag = world[r][c].type === 'void' ? 0.03 : 0.016;   // voids wobble harder — tell #2
          g.rotation.x = hash(r * 31 + c) * mag;
          g.rotation.z = hash(r * 17 + c * 7) * mag;
          g.position.y = hash(r + c * 13) * 0.02;
        }
      }
    }

    // hop animation
    if (state === 'anim' && anim) {
      anim.t = Math.min(1, anim.t + anim.dur * ts);
      const e = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 2) / 2;
      player.position.lerpVectors(anim.from, anim.to, e);
      player.position.y = Math.sin(anim.t * Math.PI) * anim.arc;
      player.rotation.y += (player.userData.face - player.rotation.y) * 0.25;
      player.scale.y = 1 + Math.sin(anim.t * Math.PI) * 0.14;       // stretch mid-air
      if (anim.t >= 1) { const { nr, nc } = anim; anim = null; land(nr, nc); }
    }
    // un-squash
    if (state === 'run') {
      player.scale.x += (1 - player.scale.x) * 0.2;
      player.scale.y += (1 - player.scale.y) * 0.2;
      player.scale.z += (1 - player.scale.z) * 0.2;
      player.position.y += (0 - player.position.y) * 0.3;
    }

    // crumble resolution — the tile drops whether you're on it or not
    const now = performance.now();
    for (let r = 0; r < world.length; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = world[r][c];
        if (t.crumbleAt && now >= t.crumbleAt && !t.broken) {
          t.broken = true;
          const g = tiles[r][c];
          if (g) g.userData.vy = 0.02;
          if (state === 'run' && pos.r === r && pos.c === c) fall();
          Sound()?.blip(140);
        }
      }
    }

    // falling bodies (tiles + player)
    tiles.flat().forEach((g) => {
      if (!g || !g.userData.vy) return;
      g.userData.vy += 0.012 * ts;
      g.position.y -= g.userData.vy * ts;
      g.rotation.x += 0.04 * ts;
      g.rotation.z += 0.025 * ts;
      if (g.position.y < -9) { g.visible = false; g.userData.vy = 0; }
    });
    if (state === 'falling') {
      player.userData.vy += 0.014 * ts;
      player.position.y -= player.userData.vy * ts;
      player.rotation.x += 0.09 * ts;
      player.rotation.z += 0.05 * ts;
      if (player.position.y < -7) { player.userData.vy = 0; finishFall(); }
    }

    // flag tween + wave
    const ft = flagGroup.userData.tween;
    if (ft) {
      ft.t = Math.min(1, ft.t + 0.02 * ts);
      const e = 1 - Math.pow(1 - ft.t, 3);
      flagGroup.position.z = ft.fromZ + (ft.toZ - ft.fromZ) * e;
      flagGroup.position.y = Math.sin(ft.t * Math.PI * 3) * 0.4;    // it skips away. rude.
      if (ft.t >= 1) { flagGroup.position.y = 0; flagGroup.userData.tween = null; }
    }
    if (!reduced) {
      const p = flagGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setZ(i, Math.sin(x * 5 + frame * 0.12) * 0.07 * (x + 0.55));
      }
      p.needsUpdate = true;
    }

    // ambience
    if (!reduced) {
      clouds.forEach((cl) => {
        cl.position.x += cl.userData.speed * ts;
        if (cl.position.x > 9) cl.position.x = -9;
      });
      ambientStars.forEach((s) => {
        if (s.userData.burst) {
          const b = s.userData.burst;
          s.position.x += b.vx * ts; s.position.y += b.vy * ts; s.position.z += b.vz * ts;
          b.vy -= 0.004 * ts;
          s.rotation.z += 0.15 * ts;
          b.life -= 0.012 * ts;
          if (b.life <= 0) { s.userData.burst = null; s.position.set(rnd(-8, 8), rnd(-2.5, 3.5), rowZ(rnd(-2, world.length))); }
        } else {
          s.rotation.z += s.userData.spin * ts;
          s.position.y += Math.sin(frame * 0.02 + s.userData.bob) * 0.0012 * ts;
        }
      });
    }
    puffs.forEach((p) => {
      if (!p.visible) return;
      p.userData.life -= 0.05 * ts;
      p.position.x += p.userData.vx * ts;
      p.position.y += p.userData.vy * ts;
      p.position.z += p.userData.vz * ts;
      p.material.opacity = Math.max(0, p.userData.life);
      p.scale.setScalar(Math.max(0.01, p.userData.life));
      if (p.userData.life <= 0) p.visible = false;
    });

    // camera: smooth chase + sway + shake
    const sway = reduced ? 0 : Math.sin(frame * 0.008) * 0.25;
    const target = new T.Vector3(
      player.position.x * 0.6 + sway,
      Math.max(player.position.y, -1) + 4.2,
      player.position.z + 5.4
    );
    camera.position.lerp(target, 0.07);
    if (camShake > 0.002) {
      camera.position.x += (Math.random() - 0.5) * camShake;
      camera.position.y += (Math.random() - 0.5) * camShake;
      camShake *= 0.88;
    }
    camera.lookAt(player.position.x * 0.7, Math.max(player.position.y, -2) + 0.5, player.position.z - 1.4);
  }

  /* ── boot ────────────────────────────────────────────────────── */
  function size() {
    if (!renderer) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.PLAYLAB.initDoodle = () => {
    cv = document.getElementById('doodleCanvas');
    overlay = document.getElementById('doodleOverlay');
    msgEl = document.getElementById('doodleMsg');
    hopsEl = document.getElementById('doodleHops');
    fallsEl = document.getElementById('doodleFalls');
    startBtn = document.getElementById('doodleStart');

    T = window.THREE;
    if (!T) {
      msgEl.textContent = 'the 3D engine failed to load. imagine a beautiful world here.';
      startBtn.disabled = true;
      return;
    }
    try {
      renderer = new T.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    } catch (e) {
      msgEl.textContent = 'your GPU said no. it\'s not you. (it\'s you.)';
      startBtn.disabled = true;
      return;
    }

    scene = new T.Scene();
    scene.background = new T.Color(PAPER);
    scene.fog = new T.Fog(PAPER, 9, 22);
    camera = new T.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 4.5, 7);

    scene.add(new T.HemisphereLight(0xffffff, 0xd8d2c2, 1.15));
    const sun = new T.DirectionalLight(0xffffff, 0.5);
    sun.position.set(3, 6, 2);
    scene.add(sun);

    generate();
    rebuildScene();
    buildAmbience();
    player = buildPlayer();
    player.position.set(colX(2), 0, rowZ(-1));
    // start pads
    for (let c = 1; c <= 3; c++) {
      const geo = new T.BoxGeometry(1, 0.5, 1);
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color: TILE_SOLID }));
      const g = new T.Group();
      g.add(m.clone(), inkEdges(geo));
      g.position.set(colX(c), -0.25, rowZ(-1));
      scene.add(g);
    }

    size();
    addEventListener('resize', size, { passive: true });
    ready = true;

    startBtn.addEventListener('click', () => {
      reset(state === 'won' || state === 'idle');
      overlay.classList.add('off');
      Sound()?.blip(500);
    });

    addEventListener('keydown', (e) => {
      if (window.PLAYLAB.vis.doodle === false || state !== 'run') return;
      const k = e.code;
      if (['ArrowUp', 'KeyW'].includes(k))    { e.preventDefault(); tryHop(1, 0); }
      if (['ArrowDown', 'KeyS'].includes(k))  { e.preventDefault(); tryHop(-1, 0); }
      if (['ArrowLeft', 'KeyA'].includes(k))  { e.preventDefault(); tryHop(0, -1); }
      if (['ArrowRight', 'KeyD'].includes(k)) { e.preventDefault(); tryHop(0, 1); }
    });
    document.querySelectorAll('[data-hop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [dr, dc] = btn.dataset.hop.split(',').map(Number);
        tryHop(dr, dc);
      });
    });

    let last = performance.now();
    (function loop(now) {
      const dt = Math.min(((now || performance.now()) - last) / 1000, 0.05);
      last = now || performance.now();
      if (window.PLAYLAB.vis.doodle !== false && ready) {
        update(dt);
        renderer.render(scene, camera);
      }
      window.PLAYLAB.raf(loop);
    })(performance.now());

    /* debug handle — headless testing without rAF */
    window.PLAYLAB._doodle = Object.assign(
      () => ({ state, row: pos.r, col: pos.c, falls, hops, goalMoves, tiles: tiles.length, three: !!T }),
      { hop: tryHop, tick: (n = 1) => { for (let i = 0; i < n; i++) update(0.016); renderer.render(scene, camera); } }
    );
  };
})();
