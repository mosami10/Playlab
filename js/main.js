/* PLAYLAB orchestrator — boots every module, tracks zone visibility so the
   games idle when offscreen, wires the chrome (sound toggle, ticker, year). */
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const P = window.PLAYLAB;

    P.initBoot();
    P.Roast?.initHud();
    P.initCursor();
    P.initShader();
    P.initDino();
    P.initFloor();
    P.initSurvivor();
    P.initMirror();
    P.initEggs();

    /* zone visibility — modules check P.vis[id] to pause their loops */
    const watched = ['hero', 'dino', 'floor', 'survivor', 'mirror'];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { P.vis[en.target.id] = en.isIntersecting; });
    }, { threshold: 0.05 });
    watched.forEach((id) => {
      const el = document.getElementById(id);
      if (el) { P.vis[id] = true; io.observe(el); }
    });

    /* reveal-on-scroll — with a hard snap 800ms after the class lands, in
       case the CSS transition stalls (seen in some Chromium compositors) */
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting || en.target.classList.contains('in')) return;
        en.target.classList.add('in');
        const tag = en.target.querySelector('.zone__tag');
        if (tag) scramble(tag);
        setTimeout(() => {
          en.target.style.opacity = '1';
          en.target.style.transform = 'none';
        }, 800);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.zone').forEach((z) => revealIO.observe(z));

    /* IntersectionObserver can go fully quiet when the compositor idles
       (occluded tabs, some embedded webviews). This cheap timer keeps
       reveals + the vis map truthful no matter what. */
    const syncZones = () => {
      document.querySelectorAll('.zone:not(.in)').forEach((z) => {
        const r = z.getBoundingClientRect();
        if (r.top < innerHeight * 0.95 && r.bottom > 0) {
          z.classList.add('in');
          z.style.opacity = '1';
          z.style.transform = 'none';
          const tag = z.querySelector('.zone__tag');
          if (tag) scramble(tag);
        }
      });
      watched.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        P.vis[id] = r.bottom > -80 && r.top < innerHeight + 80;
      });
    };
    setInterval(syncZones, 600);
    addEventListener('scroll', syncZones, { passive: true });

    /* tickers need their content doubled for the seamless -50% loop */
    document.querySelectorAll('.ticker__track').forEach((track) => {
      track.innerHTML += track.innerHTML;
    });

    /* ── chaos ambience (skipped under reduced motion) ─────────────── */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      /* hero title glitch seizure every 4–8s */
      const heroTitle = document.querySelector('.hero__title');
      (function glitchLoop() {
        setTimeout(() => {
          if (P.vis.hero !== false && heroTitle) {
            heroTitle.classList.add('glitching');
            setTimeout(() => heroTitle.classList.remove('glitching'), 260);
          }
          glitchLoop();
        }, 4000 + Math.random() * 4000);
      })();

      /* site-wide micro-glitch every 14–26s — blink and you miss it */
      (function microLoop() {
        setTimeout(() => {
          document.body.classList.add('microglitch');
          setTimeout(() => document.body.classList.remove('microglitch'), 200);
          microLoop();
        }, 14000 + Math.random() * 12000);
      })();
    }

    /* ── scramble-decode effect on zone tags when they reveal ──────── */
    const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
    function scramble(el) {
      if (reduced || el.dataset.scrambled) return;
      el.dataset.scrambled = '1';
      const target = el.textContent;
      let frame = 0;
      const total = 22;
      (function step() {
        frame += 1;
        const settled = Math.floor((frame / total) * target.length);
        el.textContent = target.slice(0, settled) +
          [...target.slice(settled)].map((ch) =>
            ch === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
        if (frame < total) setTimeout(step, 34);
        else el.textContent = target;
      })();
    }

    /* sound toggle */
    const snd = document.getElementById('soundToggle');
    const syncSnd = () => {
      const on = !P.Sound.muted;
      snd.textContent = on ? 'SND: ON' : 'SND: OFF';
      snd.setAttribute('aria-pressed', String(on));
    };
    snd.addEventListener('click', () => {
      P.Sound.setMuted(!P.Sound.muted);
      syncSnd();
      if (!P.Sound.muted) P.Sound.blip(660);
    });
    syncSnd();

    /* housekeeping */
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
