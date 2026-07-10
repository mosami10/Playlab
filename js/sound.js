/* PLAYLAB core namespace + synth sound engine.
   All SFX are generated with WebAudio oscillators — zero audio assets.
   AudioContext is created lazily on first user gesture (autoplay policy). */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  let ctx = null;
  let muted = localStorage.getItem('playlab.mute') === '1';

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* One enveloped oscillator note. */
  function note(freq, dur = 0.08, type = 'square', vol = 0.12, when = 0, glideTo = null) {
    if (muted) return;
    try {
      const a = ac();
      const t0 = a.currentTime + when;
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (_) { /* audio unavailable — silence is fine */ }
  }

  const Sound = {
    get muted() { return muted; },
    setMuted(v) {
      muted = v;
      localStorage.setItem('playlab.mute', v ? '1' : '0');
    },
    click()  { note(240, 0.04, 'sine', 0.06); },
    hover()  { note(880, 0.02, 'sine', 0.025); },
    jump()   { note(340, 0.1, 'square', 0.09, 0, 660); },
    coin()   { note(880, 0.07, 'square', 0.08); note(1320, 0.09, 'square', 0.08, 0.07); },
    death()  { note(300, 0.35, 'sawtooth', 0.12, 0, 55); },
    trap()   { [392, 349, 311, 233].forEach((f, i) => note(f, 0.16, 'triangle', 0.1, i * 0.14)); },
    win()    { [523, 659, 784, 1046].forEach((f, i) => note(f, 0.12, 'square', 0.09, i * 0.09)); },
    blip(f = 440) { note(f, 0.05, 'square', 0.07); },
    zap()    { note(1200, 0.12, 'sawtooth', 0.08, 0, 90); },
  };

  window.PLAYLAB.Sound = Sound;

  /* Simple global toast — defined here (first script) so every module has it. */
  window.PLAYLAB.toast = (msg) => {
    const host = document.getElementById('toast');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast__item';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2900);
  };

  /* Warm up the AudioContext on first interaction. */
  window.addEventListener('pointerdown', () => { if (!muted) ac(); }, { once: true });

  /* rAF that survives frozen compositors (occluded tabs, some embedded
     webviews): if the real rAF doesn't fire within 60ms, we tick anyway at
     ~16fps via timer. When rAF is healthy the timer is a no-op. */
  window.PLAYLAB.raf = (fn) => {
    let fired = false;
    const id = requestAnimationFrame((t) => { fired = true; fn(t); });
    setTimeout(() => {
      if (!fired) { cancelAnimationFrame(id); fn(performance.now()); }
    }, 60);
  };
})();
