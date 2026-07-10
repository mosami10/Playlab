/* Custom cursor — instant acid dot + lazy ring. Difference blend keeps it
   readable on every zone. Disabled for coarse pointers + reduced motion. */
(() => {
  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.PLAYLAB.initCursor = () => {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring || !fine || reduced) {
      dot?.remove(); ring?.remove();
      document.body.style.cursor = 'auto';
      return;
    }

    let x = innerWidth / 2, y = innerHeight / 2;   // ring (lerped)
    let tx = x, ty = y;                             // target (mouse)

    /* spark trail — sheds acid confetti when the cursor moves fast */
    const SPARK_COLORS = ['#c8ff3e', '#ff3d81', '#41f0ff', '#ffd24a'];
    let lastSpark = 0, sparkX = 0, sparkY = 0, liveSparks = 0;

    addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%,-50%)`;
      dot.classList.remove('hidden'); ring.classList.remove('hidden');

      const now = performance.now();
      const moved = Math.hypot(tx - sparkX, ty - sparkY);
      if (now - lastSpark > 70 && moved > 24 && liveSparks < 24) {
        lastSpark = now; sparkX = tx; sparkY = ty;
        const s = document.createElement('span');
        s.className = 'spark';
        s.style.left = (tx + (Math.random() - 0.5) * 10) + 'px';
        s.style.top = (ty + (Math.random() - 0.5) * 10) + 'px';
        s.style.background = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
        document.body.appendChild(s);
        liveSparks += 1;
        setTimeout(() => { s.remove(); liveSparks -= 1; }, 600);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => { dot.classList.add('hidden'); ring.classList.add('hidden'); });

    document.addEventListener('mouseover', (e) => {
      const hot = e.target.closest('a, button, .tile, canvas');
      ring.classList.toggle('hover', !!hot);
    }, { passive: true });

    (function loop() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      ring.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      window.PLAYLAB.raf(loop);
    })();
  };
})();
