/* Fake terminal boot. Lies about loading things, progress bar misbehaves,
   then glitches away. Repeat visitors get a 350ms courtesy flash instead. */
(() => {
  const LINES = [
    '> PLAYLAB OS v5.0.1 — bootleg edition',
    '> mounting /dev/fun ............ OK',
    '> calibrating chaos engine ..... OK',
    '> bribing pixels ............... OK (they wanted 3%)',
    '> loading trust issues ......... 847 found',
    '> deleting system32 ............ jk. relax.',
    '> waking the dinosaur .......... it\'s grumpy',
    '> READY. try not to break anything (do).',
  ];

  window.PLAYLAB.initBoot = () => {
    const boot = document.getElementById('boot');
    const log = document.getElementById('bootLog');
    const bar = document.getElementById('bootBar');
    const skip = document.getElementById('bootSkip');
    if (!boot) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = sessionStorage.getItem('playlab.booted');

    const finish = () => {
      boot.classList.add('done');
      sessionStorage.setItem('playlab.booted', '1');
      setTimeout(() => boot.remove(), 500);
    };

    if (seen || reduced) {           // fast lane for repeat visits
      log.textContent = '> welcome back. skipping theatrics.';
      bar.style.width = '100%';
      setTimeout(finish, 350);
      return;
    }

    let i = 0;
    const stepLine = () => {
      if (i < LINES.length) {
        log.textContent += (i ? '\n' : '') + LINES[i];
        window.PLAYLAB.Sound?.blip(300 + i * 60);
        i += 1;
        setTimeout(stepLine, 190 + Math.random() * 160);
      } else {
        setTimeout(finish, 700);
      }
    };
    stepLine();

    /* The progress bar is a liar: sprints to 99, retreats to 42, then commits. */
    const stops = [[200, 34], [600, 71], [1000, 99], [1400, 42], [1900, 87], [2400, 100]];
    stops.forEach(([t, w]) => setTimeout(() => { bar.style.width = w + '%'; }, t));

    skip.addEventListener('click', finish);
    boot.addEventListener('click', (e) => { if (e.target !== skip) finish(); });
    setTimeout(finish, 3400); // hard cap — never hold the user hostage
  };
})();
