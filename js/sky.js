/* ==========================================================================
   sky.js — (v2) realistic night sky pieces and the FREE SPINS world.
     * clouds : real volumetric-looking clouds, generated once on a canvas from tileable
              fractal noise and lit from the moon side, then drifted with the GPU
     * bats   : proper bat silhouettes with scalloped, finger-boned wings that really flap
     * free spins scene : a blood moon over a ruined cathedral, hanging chains, a glowing
              ritual circle, cracked lava ground and floating candles
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, P = CP.PAL;
  const f1 = (n) => Math.round(n * 10) / 10;

  /* ------------------------------ tileable fractal noise -> cloud texture ------------------------------ */
  function makeNoise(seed) {
    const r = U.seeded(seed), L = new Float32Array(256 * 256);
    for (let i = 0; i < L.length; i++) L[i] = r();
    return (x, y, px) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = yi & 255, y1 = (yi + 1) & 255;
      const a = L[y0 * 256 + x0], b = L[y0 * 256 + x1], c = L[y1 * 256 + x0], d = L[y1 * 256 + x1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const cache = {};
  const TINTS = {
    night: { shadow: [14, 12, 30], mid: [44, 48, 82], lit: [168, 186, 214], cover: 0.5, seed: 11 },
    blood: { shadow: [10, 4, 30], mid: [58, 30, 108], lit: [190, 140, 255], cover: 0.48, seed: 31 },
  };
  CP.cloudTex = function (kind) {
    if (cache[kind]) return cache[kind];
    const T = TINTS[kind], W = 768, H = 384, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), n = makeNoise(T.seed), n2 = makeNoise(T.seed + 7);
    const fbm = (x, y) => {                    // x,y in 0..1 (x wraps), 5 octaves
      let s = 0, a = 0.5, px = 3, py = 2, tot = 0;
      for (let o = 0; o < 5; o++) { s += a * n(x * px, y * py, px); tot += a; a *= 0.52; px *= 2; py *= 2; }
      return s / tot;
    };
    const sd = 1 / 100;
    for (let j = 0; j < H; j++) {
      const y = j / H;
      const band = smooth(0.0, 0.3, y) * (1 - smooth(0.62, 1.0, y));          // clouds live in a horizontal band
      for (let i = 0; i < W; i++) {
        const x = i / W, f = fbm(x, y) + (n2(x * 6, y * 4, 6) - 0.5) * 0.12;
        const dens = smooth(T.cover - 0.1, T.cover + 0.22, f * (0.55 + 0.7 * band));
        const f2 = fbm(((x - sd * 3) + 1) % 1, y - sd * 3);                   // light from the upper left (the moon)
        const lit = Math.min(1, Math.max(0, 0.45 + (f - f2) * 9));
        const body = Math.min(1, dens * 1.3);
        const col = [0, 1, 2].map((k) => {
          const base = T.shadow[k] + (T.mid[k] - T.shadow[k]) * (0.35 + body * 0.65);
          return base + (T.lit[k] - base) * lit * (1 - dens * 0.45);
        });
        const idx = (j * W + i) * 4;
        img.data[idx] = col[0]; img.data[idx + 1] = col[1]; img.data[idx + 2] = col[2];
        img.data[idx + 3] = Math.min(255, dens * band * 235);
      }
    }
    g.putImageData(img, 0, 0);
    return (cache[kind] = c.toDataURL('image/png'));
  };
  /** two drifting cloud layers + a soft moon glow, as plain divs (GPU-composited, no SVG filters) */
  CP.cloudsHTML = function (w, h, kind, orient) {
    const url = CP.cloudTex(kind), port = orient === 'portrait';
    const mk = (cls, hh, top, dur, op, rev) => {
      const th = h * hh, tw = th * 2;                                    // tile = 2:1
      return `<div class="clouds ${cls}" style="top:${f1(h * top)}px;height:${f1(th)}px;width:${f1(w + tw * 2)}px;background-image:url(${url});background-size:${f1(tw)}px ${f1(th)}px;--tw:${f1(tw)}px;opacity:${op};animation-duration:${dur}s;${rev ? 'animation-direction:reverse;' : ''}"></div>`;
    };
    return mk('c1', port ? 0.34 : 0.46, port ? 0.02 : 0, 320, 0.95, false) + mk('c2', port ? 0.26 : 0.38, port ? 0.12 : 0.1, 210, 0.78, true);
  };

  /* ------------------------------ real bats ------------------------------ */
  CP.batHTML = function (size) {
    const wing = 'M58,27 C52,15 38,7 19,5 C26,10 27,16 23,22 C29,20 34,24 34,31 C40,27 46,31 46,39 C50,35 56,37 58,43 Z';
    const bones = 'M58,27 L19,5 M58,28 L23,22 M58,30 L34,31 M58,33 L46,39';
    const w = (cls, tf) => `<g ${tf || ''}><g class="wing ${cls}"><path d="${wing}" fill="#09050f"/><path d="${wing}" fill="none" stroke="#2c1f45" stroke-width=".8"/><path d="${bones}" stroke="#22183a" stroke-width="1" fill="none"/></g></g>`;
    return `<svg class="bat" width="${size}" height="${size * 0.47}" viewBox="0 0 120 56" aria-hidden="true">
      ${w('wl')}${w('wr', 'transform="translate(120 0) scale(-1 1)"')}
      <g class="bbody"><ellipse cx="60" cy="31" rx="5.4" ry="10" fill="#09050f"/><circle cx="60" cy="20" r="5" fill="#09050f"/>
      <path d="M55.5,18 L53,6.5 L58.6,14 Z M64.5,18 L67,6.5 L61.4,14 Z" fill="#09050f"/><path d="M57,39 L55,48 L60,43 L65,48 L63,39 Z" fill="#09050f"/>
      <circle cx="58" cy="19.6" r=".9" fill="#ff5a4a"/><circle cx="62" cy="19.6" r=".9" fill="#ff5a4a"/></g></svg>`;
  };

  /* ------------------------------ FREE SPINS world ------------------------------ */
  function pointedArch(x, y, w, h) {             // window with a pointed top, y = bottom
    return `M${f1(x - w / 2)},${f1(y)} L${f1(x - w / 2)},${f1(y - h * 0.62)} Q${f1(x - w / 2)},${f1(y - h * 0.92)} ${f1(x)},${f1(y - h)} Q${f1(x + w / 2)},${f1(y - h * 0.92)} ${f1(x + w / 2)},${f1(y - h * 0.62)} L${f1(x + w / 2)},${f1(y)} Z`;
  }
  function cathedral(x, base, s, r, id) {          // anchored bottom-centre, ~ 260 wide, 230 tall in local units
    const X = (v) => f1(x + (v - 130) * s), Y = (v) => f1(base - (230 - v) * s);
    let g = '';
    const poly = (pts, extra = '') => `<polygon points="${pts.map(([a, b]) => X(a) + ',' + Y(b)).join(' ')}" fill="#0a0305" ${extra}/>`;
    g += poly([[40, 230], [40, 110], [220, 110], [220, 230]], 'stroke="#3a0d12" stroke-width="1.4"');                  // nave
    g += poly([[30, 112], [130, 52], [230, 112]], 'stroke="#3a0d12" stroke-width="1.4"');                              // roof
    g += poly([[8, 230], [8, 70], [20, 62], [30, 20], [40, 62], [56, 70], [56, 230]]);                                  // left tower, broken
    g += poly([[204, 230], [204, 80], [216, 74], [230, 4], [244, 74], [252, 84], [252, 230]]);                          // right tower, tall spire
    [[96, 40], [130, 50], [164, 40]].forEach(([wx, ww], i) => { g += `<path class="win-lit w${i + 1}" d="${pointedArch(x + (wx - 130) * s, Y(206), ww * s * 0.7, 78 * s)}" fill="#ff7a2a"/>`; });
    g += `<path class="win-lit w2" d="${pointedArch(x + (30 - 130) * s, Y(150), 12 * s, 38 * s)}" fill="#ff5a1a"/><path class="win-lit w4" d="${pointedArch(x + (230 - 130) * s, Y(130), 12 * s, 40 * s)}" fill="#ff5a1a"/>`;
    g += `<circle class="win-lit w3" cx="${X(130)}" cy="${Y(86)}" r="${f1(14 * s)}" fill="#ff6a2a"/>`;                // rose window
    g += `<path d="M${X(56)},${Y(130)} L${X(40)},${Y(190)} M${X(204)},${Y(130)} L${X(220)},${Y(190)}" stroke="#0a0305" stroke-width="${f1(5 * s)}"/>`;   // flying buttress
    return g;
  }
  CP.sceneFSSVG = function (w, h, orient) {
    const r = U.seeded(666), port = orient === 'portrait', q = CP.fxScale();
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    s += `<defs><radialGradient id="fogF" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#a98cff" stop-opacity=".3"/><stop offset="1" stop-color="#a98cff" stop-opacity="0"/></radialGradient>
      <radialGradient id="candG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc060" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a20" stop-opacity="0"/></radialGradient></defs>`;
    const nStars = Math.round((w * h) / 5200 * (0.5 + q * 0.5));
    for (let g = 0; g < 3; g++) {
      s += `<g class="twinkle t${g}">`;
      for (let i = 0; i < nStars / 3; i++) { const x = r() * w, y = r() * h * 0.62, rr = 0.5 + r() * 1.4; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="#efe0ff" opacity="${f1(0.35 + r() * 0.6)}"/>`; }
      s += '</g>';
    }
    // floating candles (kept from the old free spins world)
    const nC = 0;   // floating candles removed from the free spins background
    for (let i = 0; i < nC; i++) {
      const x = w * (0.04 + r() * 0.92), y = h * (0.42 + r() * 0.42), k = 0.7 + r() * 0.6;
      s += `<g class="float" style="animation-delay:${f1(-r() * 5)}s;animation-duration:${f1(4 + r() * 3)}s"><circle cx="${f1(x)}" cy="${f1(y - 6 * k)}" r="${f1(20 * k)}" fill="url(#candG)"/><rect x="${f1(x - 3 * k)}" y="${f1(y)}" width="${f1(6 * k)}" height="${f1(15 * k)}" rx="1.5" fill="#e8dcc0" stroke="#17121c" stroke-width="1"/><path class="flame" d="M${f1(x)},${f1(y - 11 * k)} C${f1(x - 4 * k)},${f1(y - 6 * k)} ${f1(x - 2 * k)},${f1(y - 2 * k)} ${f1(x)},${f1(y)} C${f1(x + 2 * k)},${f1(y - 2 * k)} ${f1(x + 4 * k)},${f1(y - 6 * k)} ${f1(x)},${f1(y - 11 * k)} Z" fill="#ffb347"/></g>`;
    }
    const nF = Math.round(3 + 2 * q);
    for (let i = 0; i < nF; i++) { const fw = w * (0.8 + r() * 0.6), fh = fw * (0.12 + r() * 0.08), fy = h * (0.55 + r() * 0.4), dur = 35 + r() * 40; s += `<g class="drift2" style="--dx:${Math.round(w * 0.3)}px;animation-duration:${f1(dur)}s;animation-delay:${f1(-r() * dur)}s"><ellipse cx="${f1(w * r())}" cy="${f1(fy)}" rx="${f1(fw / 2)}" ry="${f1(fh / 2)}" fill="url(#fogF)"/></g>`; }
    return s + '</svg>';
  };

  /* ------------------------------ background paintings (v4) ------------------------------ */
  // moon = where the moon sits in the picture (0..1), pan = how far the slow camera drift travels (0..1 of the spare width)
  CP.BG = {
    main: { src: 'bg/main_bg.webp', fill: '#05071c', moon: [0.151, 0.311], pan: [0.0, 0.55], glow: 'rgba(255,236,170,.30)' },
    fs: { src: 'bg/freespin_bg.webp', fill: '#1d064d', moon: [0.821, 0.218], pan: [1.0, 0.45], glow: 'rgba(214,150,255,.38)' },
  };
  /** the painting, scaled so it never shows an edge: landscape = cover, portrait = 60% of the height, with a slow camera drift */
  CP.bgHTML = function (kind, w, h, orient) {
    const B = CP.BG[kind], port = orient === 'portrait', RATIO = 1920 / 450;
    let ih = port ? h * 0.6 : Math.max(h, w / RATIO), iw = ih * RATIO;
    if (iw < w) { iw = w; ih = w / RATIO; }
    const range = Math.max(0, iw - w), x0 = -range * B.pan[0], x1 = -range * B.pan[1], top = port ? 0 : h - ih;
    const dur = port ? 150 : 200, gs = ih * 1.1;
    const fade = port ? 'mask-image:linear-gradient(#000 82%,transparent);-webkit-mask-image:linear-gradient(#000 82%,transparent);' : '';
    return `<div class="bgwrap" style="background:${B.fill}"><div class="bgpan" style="top:${f1(top)}px;width:${f1(iw)}px;height:${f1(ih)}px;background-image:url(${B.src});--x0:${f1(x0)}px;--x1:${f1(x1)}px;animation-duration:${dur}s;${fade}">` +
      `<div class="moonglow2" style="left:${f1(B.moon[0] * iw)}px;top:${f1(B.moon[1] * ih)}px;width:${f1(gs)}px;height:${f1(gs)}px;background:radial-gradient(circle,${B.glow},transparent 62%)"></div>${kind === 'fs' ? CP.fsPaintingFX(iw, ih) : ''}</div></div>`;
  };

  /* ------------------------------ FREE SPINS atmosphere: all hand-drawn SVG (v12) ------------------------------ */
  let svgN = 0;
  /** a torn parchment page with scribbled lines and a blood-red sigil (burnt = scorched corner with a glowing rim) */
  CP.fsPageSVG = function (seed, burnt) {
    const r = U.seeded(seed), j = (a) => (r() - 0.5) * a, pts = [];
    for (let x = 6; x <= 54; x += 8) pts.push([x + j(3), 5 + j(5)]);
    for (let y = 14; y <= 66; y += 10) pts.push([55 + j(5), y + j(3)]);
    for (let x = 54; x >= 6; x -= 8) pts.push([x + j(3), 75 + j(5)]);
    for (let y = 66; y >= 14; y -= 10) pts.push([5 + j(5), y + j(3)]);
    const d = 'M' + pts.map((q) => f1(q[0]) + ',' + f1(q[1])).join(' L') + ' Z';
    let lines = '';
    for (let i = 0; i < 5; i++) { const y = 16 + i * 8.5, len = 20 + r() * 26; lines += `M${f1(11)},${f1(y)} L${f1(11 + len)},${f1(y + j(1.6))} `; }
    const burn = burnt ? `<path d="M40,5 L55,6 L56,26 C50,20 44,14 40,5 Z" fill="#2a1208" opacity=".85"/><path class="fs-ember" d="M40,5 C44,14 50,20 56,26" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-linecap="round"/>` : '';
    return `<svg viewBox="0 0 60 80" aria-hidden="true"><path d="${d}" fill="#E8D6A8" stroke="#1a1022" stroke-width="2.4" stroke-linejoin="round"/><path d="M8,52 L52,48 L53,72 L9,74 Z" fill="#b9985a" opacity=".22"/><path d="${lines}" fill="none" stroke="#4a3550" stroke-width="1.8" stroke-linecap="round" opacity=".8"/><circle cx="30" cy="62" r="6.5" fill="none" stroke="#b3202a" stroke-width="1.9"/><path d="M30,55 L30,69 M23.5,62 L36.5,62" stroke="#b3202a" stroke-width="1.5" stroke-linecap="round"/>${burn}</svg>`;
  };
  const ghostSVG = () => { const id = 'fg' + svgN++; return `<svg viewBox="0 0 80 110" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1e8ff" stop-opacity=".92"/><stop offset=".6" stop-color="#bfa4ff" stop-opacity=".55"/><stop offset="1" stop-color="#9a7bff" stop-opacity="0"/></linearGradient></defs><path d="M40,4 C17,4 9,24 9,46 L9,92 C14,86 20,86 24,94 C28,102 34,98 40,92 C46,98 52,102 56,94 C60,86 66,86 71,92 L71,46 C71,24 63,4 40,4 Z" fill="url(#${id})"/><ellipse cx="28" cy="40" rx="6" ry="8.5" fill="#2a1450" opacity=".85"/><ellipse cx="52" cy="40" rx="6" ry="8.5" fill="#2a1450" opacity=".85"/><ellipse cx="40" cy="62" rx="6.5" ry="9.5" fill="#2a1450" opacity=".8"/></svg>`; };
  const batSVG = () => '<svg viewBox="0 0 64 28" aria-hidden="true"><path d="M32,13 C28,6 19,2 3,5 C9,9 9,15 13,22 C17,18 21,18 25,22 C28,20 30,17 32,13 C34,17 36,20 39,22 C43,18 47,18 51,22 C55,15 55,9 61,5 C45,2 36,6 32,13 Z" fill="#07040f"/><ellipse cx="32" cy="14" rx="3.2" ry="6" fill="#07040f"/></svg>';
  const eyesSVG = () => '<svg viewBox="0 0 44 16" aria-hidden="true"><path d="M3,10 Q11,1 20,8 Q12,13 3,10 Z" fill="#d4ff4a"/><path d="M41,10 Q33,1 24,8 Q32,13 41,10 Z" fill="#d4ff4a"/><ellipse cx="11.5" cy="7.5" rx="1.3" ry="4" fill="#0b0618"/><ellipse cx="32.5" cy="7.5" rx="1.3" ry="4" fill="#0b0618"/></svg>';
  const mistSVG = (seed) => { const r = U.seeded(seed), h = (a) => f1(70 + r() * a); const d = `M0,${h(30)} C130,${h(-40)} 260,${h(60)} 390,${h(20)} S650,${h(-30)} 800,${h(30)}`; const first = d.match(/^M0,([\d.]+)/)[1]; return `<svg viewBox="0 0 1600 170" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sm${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7a6ff" stop-opacity="0"/><stop offset=".45" stop-color="#b48cff" stop-opacity=".42"/><stop offset="1" stop-color="#6d3fd6" stop-opacity=".12"/></linearGradient><path id="sp${seed}" d="${d.replace(/ S650,[\d.\- ]+ 800,[\d.]+$/, '')} S650,${h(-30)} 800,${first} L800,170 L0,170 Z"/></defs><use href="#sp${seed}" fill="url(#sm${seed})"/><use href="#sp${seed}" x="800" fill="url(#sm${seed})"/></svg>`; };

  /** glowing eyes that open and blink in the dark parts of the painting (positions are in image pixels) */
  CP.fsPaintingFX = function (iw, ih) {
    const spots = [[0.052, 0.42, 0.022, 0], [0.205, 0.585, 0.018, -5], [0.968, 0.5, 0.02, -9]];
    return spots.map(([x, y, w, dl]) => `<div class="fs-eyes" style="left:${f1(x * iw)}px;top:${f1(y * ih)}px;width:${f1(w * iw)}px;animation-delay:${dl}s">${eyesSVG()}</div>`).join('');
  };
  /** screen-space layers: rolling mist, drifting ghosts, fluttering cursed pages, a bat flock crossing the moon */
  CP.fsExtraHTML = function (w, h, orient) {
    const r = U.seeded(4242), port = orient === 'portrait', q = CP.fxScale(); let s = '<div class="fs-extra">';
    s += `<div class="fs-mist" style="--d:90s">${mistSVG(11)}</div><div class="fs-mist b" style="--d:62s">${mistSVG(23)}</div>`;
    const ng = 0;   // drifting ghosts removed from the free spins background
    for (let i = 0; i < ng; i++) { const sz = 62 + r() * 54, dur = 46 + r() * 30; s += `<div class="fs-ghost" style="top:${f1(port ? 9 + r() * 17 : 12 + r() * 40)}vh;width:${f1(sz)}px;animation-duration:${f1(dur)}s;animation-delay:${f1(-r() * dur)}s"><div style="animation-delay:${f1(-r() * 4)}s">${ghostSVG()}</div></div>`; }
    const np = 0;   // floating pages removed from the free spins background
    for (let i = 0; i < np; i++) { const sz = 30 + r() * 38, dur = 17 + r() * 14, x0 = r() * 100, x1 = x0 + (r() - 0.5) * 60; s += `<div class="fs-page" style="--x0:${f1(x0)}vw;--x1:${f1(x1)}vw;width:${f1(sz)}px;animation-duration:${f1(dur)}s;animation-delay:${f1(-r() * dur)}s"><div style="animation-duration:${f1(2.2 + r() * 2.4)}s;animation-delay:${f1(-r() * 3)}s">${CP.fsPageSVG(100 + i * 7, i % 3 === 0)}</div></div>`; }
    const nb = Math.round(3 + 2 * q);
    for (let i = 0; i < nb; i++) { const sz = 26 + r() * 20, dur = 24 + r() * 16; s += `<div class="fs-bat" style="top:${f1(port ? 3 + r() * 14 : 5 + r() * 24)}vh;width:${f1(sz)}px;animation-duration:${f1(dur)}s;animation-delay:${f1(-r() * dur)}s"><div style="animation-duration:${f1(0.2 + r() * 0.1)}s">${batSVG()}</div></div>`; }
    return s + '</div>';
  };
})();
