/* CLICK ME — ten stages of button betrayal, styled like a haunted OS dialog.
   The task is always "just click the button." The button disagrees.
   Every stage is beatable; the game counts every wasted click and judges. */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);

  let body, titleEl, stageEl, clicksEl, timerEl;
  let stage = 0, clicks = 0, t0 = 0, timerIv = null, done = false;

  const wasted = () => { clicks += 1; clicksEl.textContent = clicks; };

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function btn(label, cls = '') {
    return el(`<button type="button" class="cm-btn ${cls}">${label}</button>`);
  }
  function clear() { body.innerHTML = ''; }
  function say(text) {
    const p = el(`<p class="cm-say">${text}</p>`);
    body.prepend(p);
  }
  function advance(quip) {
    stage += 1;
    Sound()?.coin();
    if (quip) toast(quip);
    if (stage >= STAGES.length) return finish();
    stageEl.textContent = `${stage + 1}/10`;
    STAGES[stage]();
  }

  /* ── the ten stages ──────────────────────────────────────────── */
  const STAGES = [
    // 1 — the dodger
    () => {
      clear(); say('Step 1. Click the button. Easy.');
      const b = btn('CLICK ME');
      b.style.position = 'relative';
      let dodges = 0;
      b.addEventListener('pointerenter', () => {
        if (dodges < 3) {
          dodges += 1;
          b.style.left = ((Math.random() * 140 - 70) | 0) + 'px';
          b.style.top = ((Math.random() * 60 - 20) | 0) + 'px';
          Sound()?.blip(700);
          if (dodges === 3) { b.style.left = '0px'; b.style.top = '0px'; toast('fine. it\'s tired now.'); }
        }
      });
      b.addEventListener('click', () => advance());
      body.appendChild(b);
    },
    // 2 — both buttons say NO
    () => {
      clear(); say('Are you sure you want to continue?');
      const row = el('<div class="cm-row"></div>');
      ['NO', 'NO'].forEach((t) => {
        const b = btn(t);
        b.addEventListener('click', () => { wasted(); advance('glad you agreed.'); });
        row.appendChild(b);
      });
      body.appendChild(row);
    },
    // 3 — the real button is the ✕
    () => {
      clear(); say('Click CONTINUE to continue.');
      const b = btn('CONTINUE');
      let tries = 0;
      b.addEventListener('click', () => {
        wasted(); tries += 1;
        Sound()?.trap();
        say(tries < 3 ? 'hm. didn\'t work. weird.' : 'psst. try the ✕ up there.');
      });
      body.appendChild(b);
      const x = document.querySelector('#clickme .cm-x');
      const handler = () => { x.removeEventListener('click', handler); advance('the exit was the way in.'); };
      x.addEventListener('click', handler);
    },
    // 4 — the self-unchecking checkbox
    () => {
      clear(); say('Confirm you are not a robot.');
      const wrap = el('<label class="cm-check"><input type="checkbox" /> I am not a robot</label>');
      const box = wrap.querySelector('input');
      let unchecks = 0;
      box.addEventListener('change', () => {
        if (box.checked && unchecks < 2) {
          unchecks += 1; wasted();
          setTimeout(() => { box.checked = false; toast(unchecks === 1 ? 'the box disagrees.' : 'it\'s testing your patience.'); Sound()?.blip(300); }, 420);
        } else if (box.checked) {
          setTimeout(() => advance('robot status: unclear. moving on.'), 350);
        }
      });
      body.appendChild(wrap);
    },
    // 5 — slide to verify (it resets once)
    () => {
      clear(); say('Slide to verify you have motor skills.');
      const s = el('<input type="range" class="cm-slide" min="0" max="100" value="0" />');
      let cheated = false;
      s.addEventListener('input', () => {
        if (+s.value >= 96 && !cheated) {
          cheated = true; wasted();
          s.value = 0;
          toast('slipped. tragic. again.');
          Sound()?.trap();
        } else if (+s.value >= 100 && cheated) {
          advance('verified: you can drag things.');
        }
      });
      body.appendChild(s);
    },
    // 6 — cancel the loading to finish it
    () => {
      clear(); say('Loading the next step…');
      const bar = el('<div class="cm-load"><div class="cm-load__fill"></div><span>99%</span></div>');
      body.appendChild(bar);
      setTimeout(() => {
        const b = btn('CANCEL');
        b.addEventListener('click', () => advance('cancelling finished it. obviously.'));
        body.appendChild(b);
        say('(it\'s been at 99% forever. do something.)');
      }, 2600);
    },
    // 7 — the tiny button
    () => {
      clear(); say('The button is right there.');
      const b = btn('.', 'cm-tiny');
      b.title = 'yes this is it';
      b.addEventListener('click', () => advance('eagle eyes. or luck.'));
      body.appendChild(b);
    },
    // 8 — two REAL buttons, one is fake
    () => {
      clear(); say('Click the REAL button.');
      const row = el('<div class="cm-row"></div>');
      const fakeFirst = Math.random() < 0.5;
      [0, 1].forEach((i) => {
        const b = btn('REAL');
        b.addEventListener('click', () => {
          if ((i === 0) === fakeFirst) { wasted(); Sound()?.trap(); toast('wrong REAL. -50 aura.'); window.PLAYLAB.Roast?.addAura(-50, document.querySelector('.cm-window')); }
          else advance('correct REAL. there was a difference. we won\'t say what.');
        });
        row.appendChild(b);
      });
      body.appendChild(row);
    },
    // 9 — type YES (it becomes NO)
    () => {
      clear(); say('Type YES to continue.');
      const input = el('<input type="text" class="cm-input" placeholder="type YES" />');
      const b = btn('SUBMIT');
      input.addEventListener('input', () => {
        if (input.value.toUpperCase() === 'YES') {
          input.value = 'NO';
          toast('input sanitized for your safety.');
          Sound()?.blip(300);
        }
      });
      b.addEventListener('click', () => {
        wasted();
        if (input.value.toUpperCase() === 'NO') advance('NO means YES here. everyone knows that.');
        else say('it wants NO. which is YES. keep up.');
      });
      body.appendChild(input); body.appendChild(b);
    },
    // 10 — DO NOT CLICK
    () => {
      clear(); say('Final step.');
      const b = btn('DO NOT CLICK', 'cm-big');
      b.addEventListener('click', () => advance());
      body.appendChild(b);
    },
  ];

  function finish() {
    done = true;
    clearInterval(timerIv);
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    clear();
    const R = window.PLAYLAB.Roast;
    R?.win({ anchor: document.querySelector('.cm-window'), auraGain: 800 });
    say(`10 buttons. ${clicks} wasted clicks. ${secs} seconds of your life. gone. <b>+800 AURA</b> for your suffering.`);
    const b = btn('SUFFER AGAIN');
    b.addEventListener('click', start);
    body.appendChild(b);
    Sound()?.win();
  }

  function start() {
    stage = 0; clicks = 0; done = false;
    clicksEl.textContent = 0;
    stageEl.textContent = '1/10';
    t0 = performance.now();
    clearInterval(timerIv);
    timerIv = setInterval(() => {
      if (window.PLAYLAB.vis.clickme !== false && !done) {
        timerEl.textContent = ((performance.now() - t0) / 1000).toFixed(0) + 's';
      }
    }, 500);
    STAGES[0]();
  }

  window.PLAYLAB.initClickme = () => {
    body = document.getElementById('cmBody');
    titleEl = document.getElementById('cmTitle');
    stageEl = document.getElementById('cmStage');
    clicksEl = document.getElementById('cmClicks');
    timerEl = document.getElementById('cmTimer');

    // every click anywhere in the window counts as "engagement"
    document.querySelector('.cm-window').addEventListener('click', () => { Sound()?.click(); });

    document.getElementById('cmStart').addEventListener('click', () => {
      document.getElementById('cmIntro').hidden = true;
      start();
    });
  };
})();
