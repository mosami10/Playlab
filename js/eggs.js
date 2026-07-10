/* Easter eggs — the ledger says 4. The ledger is honest, for once.
   1. Konami code → temporary god mode (chromatic chaos)
   2. typing "dino" → summoned to the arcade
   3. clicking the logo ×5 → barrel roll
   4. the DO NOT PRESS button → playful screen of death */
(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);
  const found = new Set(JSON.parse(localStorage.getItem('playlab.eggs') || '[]'));

  function score(id) {
    if (!found.has(id)) {
      found.add(id);
      localStorage.setItem('playlab.eggs', JSON.stringify([...found]));
      toast(`SECRET FOUND — ${found.size}/4`);
    }
    const el = document.getElementById('eggCount');
    if (el) el.textContent = `eggs found: ${found.size}/4`;
  }

  window.PLAYLAB.initEggs = () => {
    const el = document.getElementById('eggCount');
    if (el && found.size) el.textContent = `eggs found: ${found.size}/4`;

    /* 1 & 2 — keystroke listeners */
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
    let kIdx = 0, typed = '';
    addEventListener('keydown', (e) => {
      // konami
      kIdx = e.code === KONAMI[kIdx] ? kIdx + 1 : (e.code === KONAMI[0] ? 1 : 0);
      if (kIdx === KONAMI.length) {
        kIdx = 0;
        document.body.classList.add('chaos');
        Sound()?.win();
        toast('GOD MODE ENABLED (5s — like all power, temporary)');
        score('konami');
        setTimeout(() => document.body.classList.remove('chaos'), 5000);
      }
      // "dino"
      if (/^Key[A-Z]$/.test(e.code)) {
        typed = (typed + e.code[3].toLowerCase()).slice(-4);
        if (typed === 'dino' && !e.target.closest('input, textarea')) {
          document.getElementById('dino')?.scrollIntoView({ behavior: 'smooth' });
          toast('🦖 summoned.');
          Sound()?.blip(300);
          score('dino');
        }
      }
    });

    /* 3 — annoy the logo */
    let clicks = [], logo = document.getElementById('logo');
    logo?.addEventListener('click', () => {
      const now = Date.now();
      clicks = clicks.filter((t) => now - t < 2000);
      clicks.push(now);
      Sound()?.click();
      if (clicks.length >= 5) {
        clicks = [];
        document.body.classList.add('rolling');
        Sound()?.zap();
        toast('wheeee');
        score('logo');
        setTimeout(() => document.body.classList.remove('rolling'), 950);
      }
    });

    /* 4 — the button */
    document.getElementById('doNotPress')?.addEventListener('click', () => {
      const bsod = document.getElementById('bsod');
      bsod.hidden = false;
      Sound()?.trap();
      score('dnp');
      setTimeout(() => {
        bsod.hidden = true;
        toast('told you.');
      }, 2800);
    });

    /* ambient mischief */
    let realTitle = document.title;
    addEventListener('blur', () => { document.title = 'come back 🥺'; });
    addEventListener('focus', () => { document.title = realTitle; });

    console.log(
      '%c◓ PLAYLAB™' + '\n%cyou opened the console. respect.\ntry: PLAYLAB.toast("hi")',
      'font-size:28px; font-weight:bold; color:#c8ff3e;',
      'font-size:12px; color:#888;'
    );
  };
})();
