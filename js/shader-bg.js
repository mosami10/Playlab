/* Hero background — raw WebGL fragment shader. Flowing iridescent fbm noise,
   mouse-warped. No libraries. Falls back to a CSS gradient if WebGL is out. */
(() => {
  const FRAG = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;

  float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int k=0;k<5;k++){ v += a*noise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
    return v;
  }
  vec3 pal(float t){
    return 0.5 + 0.5*cos(6.2831*(t + vec3(0.0,0.33,0.67)) + vec3(0.5,0.2,0.9));
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes.xy;
    vec2 p = uv * 3.0;
    p.x *= uRes.x / uRes.y;
    vec2 m = (uMouse - 0.5) * 1.4;
    float t = uTime * 0.08;
    // domain-warped fbm — the "liquid" look
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2,1.3) - t));
    vec2 r = vec2(fbm(p + 2.6*q + m + t*0.7), fbm(p + 2.4*q + vec2(8.3,2.8)));
    float f = fbm(p + 3.0*r);
    vec3 col = pal(f + t*0.4) * (f*f*1.6 + 0.12);
    // vignette + keep it dark enough for white type
    float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
    col *= vig * 0.85;
    col = pow(col, vec3(1.25));
    gl_FragColor = vec4(col, 1.0);
  }`;

  window.PLAYLAB.initShader = () => {
    const canvas = document.getElementById('shaderBg');
    const hero = document.getElementById('hero');
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl || reduced) {
      canvas.style.background = 'radial-gradient(ellipse at 30% 40%, #142, #050505 70%), radial-gradient(ellipse at 70% 70%, #214, #050505 60%)';
      return;
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }');
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FRAG);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn('[playlab] shader failed:', gl.getShaderInfoLog(fs));
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
    addEventListener('mousemove', (e) => {
      tmx = e.clientX / innerWidth;
      tmy = 1 - e.clientY / innerHeight;
    }, { passive: true });

    function resize() {
      const dpr = Math.min(devicePixelRatio, 1.5); // cap — fbm x5 octaves is spicy
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    const t0 = performance.now();
    (function frame() {
      if (window.PLAYLAB.vis.hero !== false) {      // pause offscreen
        mx += (tmx - mx) * 0.05;
        my += (tmy - my) * 0.05;
        gl.uniform1f(uTime, (performance.now() - t0) / 1000);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform2f(uMouse, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      window.PLAYLAB.raf(frame);
    })();
  };
})();
