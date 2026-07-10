/* THE FLOOR IS A LIE — a glass-bridge trust exercise.
   8 rows × 4 tiles. One safe tile per row. Labels and arrows are written by
   the traps' union, so they lie freely. Two scripted betrayals:
   - row 4 (index 3): every tile is safe. The fear was the trap.
   - row 7 (index 6): the safe tile is the one labeled "NO".
   Layout persists across deaths in a run (learning is the reward);
   regenerates on win or NEW BRIDGE. */
(() => {
  const ROWS = 8, COLS = 4;
  const LABELS = ['SAFE', 'NO', 'YES', 'TRUST', 'DOUBT', '???', 'FREE', '☠'];
  const DEATH_QUIPS = [
    'The tile said SAFE. The tile lied.',
    'Physics remains undefeated.',
    'The arrow was drawn by the traps.',
    'Your ancestors watched that. All of them.',
    'That one was labeled correctly, actually. Rare.',
    'Glass 1 — Confidence 0.',
  ];
  const SAFE_QUIPS = ['lucky.', 'suspiciously smooth.', 'the bridge respects you (for now).', 'okay okay okay.', 'one more.'];

  const Sound = () => window.PLAYLAB.Sound;
  let grid, msgEl, deathsEl, fx, fxCtx;
  let rows = [], current = 0, deaths = 0, done = false, confetti = [];

  function generate() {
    rows = [];
    for (let r = 0; r < ROWS; r++) {
      const safe = Math.floor(Math.random() * COLS);
      const labels = Array.from({ length: COLS }, () => LABELS[Math.floor(Math.random() * LABELS.length)]);
      // an arrow that points at the safe tile only 40% of the time
      const arrowCol = Math.random() < 0.4 ? safe : (safe + 1 + Math.floor(Math.random() * (COLS - 1))) % COLS;
      rows.push({ safe, labels, arrowCol, allSafe: false });
    }
    rows[3].allSafe = true;                       // betrayal #1: paranoia bait
    rows[6].labels[rows[6].safe] = 'NO';          // betrayal #2: the "NO" is the way
  }

  function render() {
    grid.innerHTML = '';
    // rows displayed bottom-up: climb from the bottom of the DOM stack
    for (let r = ROWS - 1; r >= 0; r--) {
      const rowEl = document.createElement('div');
      rowEl.className = 'floor__row' + (r === current && !done ? ' active' : '') + (r < current ? ' done' : '');
      rowEl.dataset.row = r;
      for (let c = 0; c < COLS; c++) {
        const tile = document.createElement('button');
        tile.className = 'tile';
        tile.type = 'button';
        tile.textContent = rows[r].labels[c];
        tile.dataset.col = c;
        if (c === rows[r].arrowCol) {
          const a = document.createElement('span');
          a.className = 'arrow';
          a.textContent = '▼';
          tile.appendChild(a);
        }
        if (r < current) {   // already-cleared rows show their truth
          tile.classList.add(c === rows[r].safe || rows[r].allSafe ? 'safe-reveal' : 'trap-reveal');
          tile.style.animation = 'none';
        }
        tile.addEventListener('click', () => pick(r, c, rowEl));
        rowEl.appendChild(tile);
      }
      grid.appendChild(rowEl);
    }
  }

  function pick(r, c, rowEl) {
    if (done || r !== current) return;
    const row = rows[r];
    const safe = row.allSafe || c === row.safe;

    // reveal the whole row
    [...rowEl.children].forEach((tile, ci) => {
      tile.classList.add(row.allSafe || ci === row.safe ? 'safe-reveal' : 'trap-reveal');
    });
    rowEl.classList.remove('active');
    rowEl.classList.add('done');

    if (safe) {
      current += 1;
      Sound()?.coin();
      if (row.allSafe) msgEl.textContent = '…all four were safe. Why did you hesitate?';
      else if (r === 6 && row.labels[c] === 'NO') msgEl.textContent = 'The "NO" was the way. Trust nothing, remember?';
      else msgEl.textContent = SAFE_QUIPS[Math.floor(Math.random() * SAFE_QUIPS.length)];
      if (current >= ROWS) return win();
      setTimeout(render, 450);
    } else {
      deaths += 1;
      deathsEl.textContent = deaths;
      const R = window.PLAYLAB.Roast;
      if (R) {
        /* escalating disrespect: each death drains more aura (capped) */
        const r = R.loss({
          tier: 'brutal',
          anchor: document.querySelector('.floor__stage'),
          auraHit: -Math.min(200 + deaths * 100, 800),
        });
        msgEl.textContent = r.line + ' Back to the start.';
      } else {
        msgEl.textContent = DEATH_QUIPS[Math.floor(Math.random() * DEATH_QUIPS.length)] + ' Back to the start.';
      }
      Sound()?.trap();
      current = 0;
      setTimeout(render, 1100);
    }
  }

  function win() {
    done = true;
    const R = window.PLAYLAB.Roast;
    const w = R?.win({ anchor: document.querySelector('.floor__stage'), auraGain: 1000 });
    msgEl.textContent = (w ? w.line + ' ' : '') +
      `Crossed in ${deaths} death${deaths === 1 ? '' : 's'}. Trust issues: permanent.`;
    Sound()?.win();
    window.PLAYLAB.toast?.('🏆 BRIDGE CLEARED · +1000 AURA');
    // confetti
    const rect = fx.getBoundingClientRect();
    fx.width = rect.width; fx.height = rect.height;
    for (let i = 0; i < 130; i++) {
      confetti.push({
        x: fx.width / 2, y: fx.height * 0.25,
        vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 9 - 2,
        c: ['#ffb648', '#c8ff3e', '#41f0ff', '#ff3d81', '#efe6d8'][i % 5],
        s: 3 + Math.random() * 5, rot: Math.random() * 7, life: 130,
      });
    }
    (function fxLoop() {
      fxCtx.clearRect(0, 0, fx.width, fx.height);
      confetti.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.rot += 0.1; p.life -= 1;
        fxCtx.save();
        fxCtx.translate(p.x, p.y); fxCtx.rotate(p.rot);
        fxCtx.globalAlpha = Math.min(1, p.life / 40);
        fxCtx.fillStyle = p.c;
        fxCtx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        fxCtx.restore();
      });
      confetti = confetti.filter((p) => p.life > 0);
      if (confetti.length) window.PLAYLAB.raf(fxLoop);
      else fxCtx.clearRect(0, 0, fx.width, fx.height);
    })();
  }

  function restart(fresh) {
    current = 0; done = false;
    if (fresh) { deaths = 0; deathsEl.textContent = 0; generate(); msgEl.textContent = 'New glass. Same lies.'; }
    render();
  }

  window.PLAYLAB.initFloor = () => {
    grid = document.getElementById('floorGrid');
    msgEl = document.getElementById('floorMsg');
    deathsEl = document.getElementById('floorDeaths');
    fx = document.getElementById('floorFx');
    fxCtx = fx.getContext('2d');
    document.getElementById('floorRestart').addEventListener('click', () => { Sound()?.click(); restart(true); });
    generate();
    render();
  };
})();
