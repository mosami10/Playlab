/* GASLIGHT LAYER — the site itself is an unreliable narrator.
   - RAGE meter in the header: fills as you lose across every game, decays
     slowly. At 100% the site tells you to breathe, then says "lol".
   - Cookie banner with no decline option. Comes back once, claiming you
     never accepted. Then it lets it go. Mostly.
   - A "rate your experience" popup where every option is YES.
   - Rare scroll gaslights: "you scrolled past something important." (you didn't) */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);

  let rage = Math.min(95, +sessionStorage.getItem('playlab.rage') || 0);
  let rageBar, ragePill;

  function setRage(v) {
    rage = Math.max(0, Math.min(100, v));
    sessionStorage.setItem('playlab.rage', String(rage | 0));
    if (rageBar) rageBar.style.width = rage + '%';
    if (ragePill) ragePill.classList.toggle('rage--hot', rage > 65);
    if (rage >= 100) meltdown();
  }

  function meltdown() {
    const m = document.getElementById('meltdown');
    if (!m || !m.hidden) return;
    m.hidden = false;
    Sound()?.zap();
    setTimeout(() => { m.querySelector('p').textContent = 'lol.'; }, 2200);
    setTimeout(() => {
      m.hidden = true;
      setRage(15);
      window.PLAYLAB.Roast?.addAura(200, null);
      toast('+200 AURA for emotional damage. courts ruled in your favor.');
    }, 3400);
  }

  /* ── cookie banner: consent is mandatory ─────────────────────── */
  function cookies() {
    if (sessionStorage.getItem('playlab.cookies') === 'done') return;
    const round2 = sessionStorage.getItem('playlab.cookies') === 'once';
    const bar = document.getElementById('cookieBar');
    const msg = document.getElementById('cookieMsg');
    if (!bar) return;
    msg.textContent = round2
      ? 'our records show you never accepted the cookies. accept again. properly this time.'
      : '🍪 this site uses cookies. we already ate them. this is a courtesy notice.';
    bar.hidden = false;
    bar.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        bar.hidden = true;
        Sound()?.click();
        if (!round2) {
          sessionStorage.setItem('playlab.cookies', 'once');
          toast('consent recorded. probably.');
          setTimeout(cookies, 45000);            // it comes back. once.
        } else {
          sessionStorage.setItem('playlab.cookies', 'done');
          toast('consent double-recorded. legally bulletproof.');
        }
      }, { once: true });
    });
  }

  /* ── the survey where every answer is yes ────────────────────── */
  function survey() {
    if (sessionStorage.getItem('playlab.survey')) return;
    setTimeout(() => {
      const p = document.getElementById('surveyPop');
      if (!p) return;
      p.hidden = false;
      Sound()?.blip(500);
      p.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          p.hidden = true;
          sessionStorage.setItem('playlab.survey', '1');
          toast('feedback received. it changes nothing.');
          Sound()?.click();
        }, { once: true });
      });
    }, 55000);
  }

  /* ── scroll gaslighting (max 2 per session) ──────────────────── */
  function scrollLies() {
    let fired = 0, lastY = 0, armed = true;
    const LIES = [
      'you scrolled past something important.',
      'go back. actually — don\'t. it\'s gone now.',
    ];
    addEventListener('scroll', () => {
      if (fired >= 2 || !armed) return;
      const y = scrollY;
      if (Math.abs(y - lastY) > 1800) {
        lastY = y;
        armed = false;
        setTimeout(() => { armed = true; }, 30000);
        if (Math.random() < 0.5) {
          toast(LIES[fired % LIES.length]);
          fired += 1;
          Sound()?.blip(260);
        }
      } else if (Math.abs(y - lastY) > 400) {
        lastY = y;
      }
    }, { passive: true });
  }

  window.PLAYLAB.initGaslight = () => {
    rageBar = document.getElementById('rageBar');
    ragePill = document.getElementById('ragePill');
    setRage(rage);

    /* losses feed the meter; wins soothe it a little */
    addEventListener('playlab:loss', (e) => {
      setRage(rage + (e.detail?.tier === 'brutal' ? 14 : 8));
    });
    addEventListener('playlab:win', () => setRage(rage - 12));

    /* slow decay — anger fades. the games refill it. */
    setInterval(() => { if (rage > 0) setRage(rage - 1); }, 9000);

    ragePill?.addEventListener('click', () => {
      toast(rage > 60 ? 'sounds like a you problem.' : 'you seem calm. we can fix that.');
      Sound()?.click();
    });

    cookies();
    survey();
    scrollLies();
  };
})();
