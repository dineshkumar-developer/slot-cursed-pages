/* ==========================================================================
   scene.js — everything that is not a symbol: generated paper textures, the
   haunted night scene behind the game, the torn-paper reel frame and the bats.
   All of it is built at the REAL pixel size of the screen (rebuilt on resize),
   so strokes stay crisp and nothing is ever stretched.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, P = CP.PAL;
  const f1 = (n) => Math.round(n * 10) / 10;

  /* ------------------------------ paper textures (canvas, generated once) ------------------------------ */
  CP.tex = {};
  function paperTex(base, speck, stain, seed, stainA) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = U.seeded(seed);
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) {                                     // tea / blood stains, wrapped so the tile joins
      const x = r() * 256, y = r() * 256, rad = 30 + r() * 70, a = stainA * (0.4 + r() * 0.8);
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, `rgba(${stain},${a})`); gr.addColorStop(1, `rgba(${stain},0)`);
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${speck},${0.025 + r() * 0.07})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6); }
    g.lineWidth = 1;
    for (let i = 0; i < 80; i++) {                                     // paper fibres
      const x = r() * 256, y = r() * 256, a = r() * 6.28, l = 6 + r() * 16;
      g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : `rgba(${speck},.06)`;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5 - 3, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c.toDataURL('image/png');
  }
  CP.makeTextures = function () {
    CP.tex.light = paperTex('#E9DCC0', '90,66,36', '150,100,40', 5, 0.16);
    CP.tex.dark = paperTex('#D6C5A1', '70,48,24', '120,60,30', 9, 0.2);
    CP.tex.night = paperTex('#241A33', '255,255,255', '90,40,120', 3, 0.1);
    const s = document.getElementById('app').style;
    s.setProperty('--tex-light', `url(${CP.tex.light})`);
    s.setProperty('--tex-dark', `url(${CP.tex.dark})`);
    s.setProperty('--tex-night', `url(${CP.tex.night})`);
  };

  /* ------------------------------ helpers ------------------------------ */
  function ridge(w, base, amp, freq, phase, h, r, jag) {
    let d = `M-10,${h + 10} L-10,${f1(base)}`;
    for (let x = 0; x <= w + 20; x += 14) {
      const y = base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.4 + (jag ? (r() - 0.5) * jag : 0);
      d += ` L${f1(x)},${f1(y)}`;
    }
    return d + ` L${w + 10},${h + 10} Z`;
  }
  function treeParts(r, x, y, len, ang, depth, wdt, out) {
    if (depth <= 0 || len < 5) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const cx = (x + x2) / 2 + (r() - 0.5) * len * 0.35, cy = (y + y2) / 2 + (r() - 0.5) * len * 0.35;
    (out[depth] = out[depth] || { w: wdt, d: '' }).d += `M${f1(x)},${f1(y)} Q${f1(cx)},${f1(cy)} ${f1(x2)},${f1(y2)} `;
    const n = depth > 3 ? 2 : r() < 0.65 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const dir = n === 1 ? (r() - 0.5) : i ? 1 : -1;
      treeParts(r, x2, y2, len * (0.6 + r() * 0.2), ang + dir * (0.4 + r() * 0.55) + (r() - 0.5) * 0.25, depth - 1, wdt * 0.64, out);
    }
  }
  function tree(r, x, y, h, lean, flip) {
    const out = {};
    treeParts(r, x, y, h * 0.32, -Math.PI / 2 + lean, 7, h * 0.05, out);
    let s = '';
    Object.keys(out).forEach((k) => { s += `<path d="${out[k].d}" fill="none" stroke="#07040d" stroke-width="${f1(Math.max(1.2, out[k].w))}" stroke-linecap="round"/>`; });
    return s;
  }
  function tomb(r, x, y, s) {
    const k = r();
    if (k < 0.4) return `<path d="M${f1(x - s * 0.5)},${f1(y)} L${f1(x - s * 0.5)},${f1(y - s * 1.1)} C${f1(x - s * 0.5)},${f1(y - s * 1.7)} ${f1(x + s * 0.5)},${f1(y - s * 1.7)} ${f1(x + s * 0.5)},${f1(y - s * 1.1)} L${f1(x + s * 0.5)},${f1(y)} Z" fill="#0a0612"/>`;
    if (k < 0.75) return `<path d="M${f1(x - s * 0.12)},${f1(y)} L${f1(x - s * 0.12)},${f1(y - s * 0.7)} L${f1(x - s * 0.5)},${f1(y - s * 0.7)} L${f1(x - s * 0.5)},${f1(y - s * 0.95)} L${f1(x - s * 0.12)},${f1(y - s * 0.95)} L${f1(x - s * 0.12)},${f1(y - s * 1.5)} L${f1(x + s * 0.12)},${f1(y - s * 1.5)} L${f1(x + s * 0.12)},${f1(y - s * 0.95)} L${f1(x + s * 0.5)},${f1(y - s * 0.95)} L${f1(x + s * 0.5)},${f1(y - s * 0.7)} L${f1(x + s * 0.12)},${f1(y - s * 0.7)} L${f1(x + s * 0.12)},${f1(y)} Z" fill="#0a0612"/>`;
    return `<path d="M${f1(x - s * 0.55)},${f1(y)} L${f1(x - s * 0.4)},${f1(y - s * 0.9)} L${f1(x + s * 0.45)},${f1(y - s * 1.0)} L${f1(x + s * 0.55)},${f1(y)} Z" fill="#0a0612"/>`;
  }
  function house(x, y, s, r) {            // local box 100 wide, 90 tall, anchored bottom-centre
    const L = (px, py) => `${f1(x + (px - 50) * s)},${f1(y + (py - 90) * s)}`;
    const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(([a, b]) => L(a, b)).join(' ')}" fill="${fill}" ${extra}/>`;
    const win = (px, py, w, h, id) => `<rect class="win-lit w${id}" x="${f1(x + (px - 50) * s)}" y="${f1(y + (py - 90) * s)}" width="${f1(w * s)}" height="${f1(h * s)}" fill="#FFD66B"/>`;
    let g = '';
    g += poly([[8, 90], [8, 44], [66, 40], [66, 90]], '#0b0712', 'stroke="#2c1c47" stroke-width="1.5"');
    g += poly([[2, 46], [37, 12], [72, 42]], '#0b0712', 'stroke="#2c1c47" stroke-width="1.5"');
    g += poly([[62, 90], [62, 36], [92, 34], [92, 90]], '#0b0712', 'stroke="#2c1c47" stroke-width="1.5"');
    g += poly([[58, 38], [78, -14], [97, 34]], '#0b0712', 'stroke="#2c1c47" stroke-width="1.5"');
    g += poly([[24, 28], [24, 8], [32, 8], [32, 22]], '#0b0712');
    g += win(16, 54, 9, 14, 1) + win(34, 54, 9, 14, 2) + win(70, 42, 9, 13, 3) + win(70, 66, 9, 13, 4) + win(46, 20, 8, 10, 5);
    g += poly([[40, 90], [40, 72], [46, 66], [52, 72], [52, 90]], '#050309');
    g += `<path d="M${L(-6, 90)} L${L(-6, 74)} M${L(0, 90)} L${L(0, 72)} M${L(100, 90)} L${L(100, 74)} M${L(106, 90)} L${L(106, 72)}" stroke="#0b0712" stroke-width="${f1(2 * s)}"/>`;
    return g;
  }

  /* ------------------------------ the night scene ------------------------------ */
  CP.sceneSVG = function (w, h, orient) {
    const r = U.seeded(2026), port = orient === 'portrait';
    const q = CP.fxScale();
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    s += `<defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05040c"/><stop offset=".4" stop-color="#150e29"/><stop offset=".72" stop-color="#2b1a3b"/><stop offset="1" stop-color="#3a2040"/></linearGradient>
      <radialGradient id="moonH" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F4EBC6" stop-opacity=".55"/><stop offset=".35" stop-color="#cfe0c8" stop-opacity=".2"/><stop offset="1" stop-color="#cfe0c8" stop-opacity="0"/></radialGradient>
      <radialGradient id="fogG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9fb6c9" stop-opacity=".34"/><stop offset="1" stop-color="#9fb6c9" stop-opacity="0"/></radialGradient>
      <linearGradient id="groundG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120a1d"/><stop offset="1" stop-color="#05030a"/></linearGradient></defs>`;
    // stars
    const nStars = Math.round((w * h) / 5200 * (0.5 + q * 0.5));
    for (let g = 0; g < 3; g++) {
      s += `<g class="twinkle t${g}">`;
      for (let i = 0; i < nStars / 3; i++) { const x = r() * w, y = r() * h * 0.62, rr = 0.5 + r() * 1.4; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rr)}" fill="#f4ecd0" opacity="${f1(0.35 + r() * 0.6)}"/>`; }
      s += '</g>';
    }
    // (v4: the sky, moon, castle, hills and trees now come from the supplied background image)
    const nFog = Math.round(3 + 2 * q);
    for (let i = 0; i < nFog; i++) {
      const fw = w * (0.7 + r() * 0.6), fh = fw * (0.12 + r() * 0.08), fy = h * (0.5 + r() * 0.45), dur = 40 + r() * 50;
      s += `<g class="drift2" style="--dx:${Math.round(w * 0.35)}px;animation-duration:${f1(dur)}s;animation-delay:${f1(-r() * dur)}s"><ellipse cx="${f1(w * (r()))}" cy="${f1(fy)}" rx="${f1(fw / 2)}" ry="${f1(fh / 2)}" fill="url(#fogG)"/></g>`;
    }
    return s + '</svg>';
  };

  /* ------------------------------ torn-paper reel frame ------------------------------ */
  function torn(x, y, w, h, amp, step, r) {
    const pts = [];
    for (let px = 0; px < w; px += step) pts.push([x + px, y + (r() - 0.5) * amp * 2]);
    for (let py = 0; py < h; py += step) pts.push([x + w + (r() - 0.5) * amp * 2, y + py]);
    for (let px = w; px > 0; px -= step) pts.push([x + px, y + h + (r() - 0.5) * amp * 2]);
    for (let py = h; py > 0; py -= step) pts.push([x + (r() - 0.5) * amp * 2, y + py]);
    return 'M' + pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' L') + ' Z';
  }
  /** REEL FRAME (v20): flat, hand-inked and stitched, in the same style as the symbols (no gloss, no gradients).
   *  A dark ink-purple board with a blood-red off-register print behind it, a thick wobbly ink outline, a bone-coloured
   *  stitched seam, cross-stitches in the corners, a few blood drips and a cobweb.
   *  Everything stays inside the band; the window (hole) is exactly the reel rectangle. */
  CP.frameSVG = function (w, h, pad) {
    const r = U.seeded(404), [pt, pr, pb, pl] = pad;
    const hx = pl, hy = pt, hw = w - pl - pr, hh = h - pt - pb;
    const u = Math.min(pt, pl), o = 3, cx0 = w / 2, INK = P.ink, BAND = '#1d1329';
    const outer = torn(o, o, w - o * 2, h - o * 2, 1.1, 26, r);
    const hole = `M${hx},${hy} L${hx + hw},${hy} L${hx + hw},${hy + hh} L${hx},${hy + hh} Z`;
    const xL = (o + pl) / 2, xR = w - (o + pr) / 2, yT = (o + pt) / 2, yB = h - (o + pb) / 2;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    s += `<defs><pattern id="patP" patternUnits="userSpaceOnUse" width="256" height="256"><image href="${CP.tex.dark}" width="256" height="256"/></pattern>
      <linearGradient id="innerSh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>`;
    s += `<path d="${outer}" fill="#000" opacity=".45" transform="translate(4 7)"/>`;                                       // flat cast shadow
    s += `<path fill-rule="evenodd" d="${outer} ${hole}" fill="${P.bloodD}" transform="translate(3 3)"/>`;                 // off-register blood print
    s += `<path fill-rule="evenodd" d="${outer} ${hole}" fill="${BAND}"/>`;                                                // the board
    s += `<path fill-rule="evenodd" d="${outer} ${hole}" fill="url(#patP)" opacity=".28"/>`;                               // the game's own paper grain
    s += `<path d="${outer}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/>`;                    // uneven ink line: thick pass ...
    s += `<path d="${outer}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" transform="translate(1.1 .9)"/>`;   // ... plus a thin shifted pass
    s += `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="url(#innerSh)"/>`;
    s += `<path d="${hole}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>`;
    s += `<path d="${hole}" fill="none" stroke="${P.paperD}" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round" transform="translate(-1.3 -1.3)"/>`;
    // stitched seam all the way round
    const seam = torn(xL, yT, xR - xL, yB - yT, 0.5, 30, r);
    s += `<path d="${seam}" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="7 6" stroke-linecap="round" opacity=".7"/>`;
    s += `<path d="${seam}" fill="none" stroke="${P.bone}" stroke-width="2" stroke-dasharray="7 6" stroke-linecap="round"/>`;
    // cross-stitches in the four corners
    const k = u * 0.3;
    [[xL, yT], [xR, yT], [xL, yB], [xR, yB]].forEach(([x, y]) => {
      const d = `M${f1(x - k)},${f1(y - k)} L${f1(x + k)},${f1(y + k)} M${f1(x + k)},${f1(y - k)} L${f1(x - k)},${f1(y + k)}`;
      s += `<rect x="${f1(x - k * 1.5)}" y="${f1(y - k * 1.5)}" width="${f1(k * 3)}" height="${f1(k * 3)}" fill="${BAND}"/><path d="${d}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="${d}" stroke="${P.blood}" stroke-width="2.6" stroke-linecap="round"/>`;
    });
    // blood drips from the top edge (same positions as before)
    const ew = u * 1.6;
    for (let i = 0; i < 4; i++) {
      let x = w * (0.1 + r() * 0.8); if (Math.abs(x - cx0) < ew + 12) x += (x < cx0 ? -1 : 1) * (ew + 14);
      const l = (pt - o) + 3 + r() * 9, wd = 2.4 + r() * 1.4, y0 = o;
      s += `<path d="M${f1(x - wd)},${f1(y0)} L${f1(x - wd)},${f1(y0 + l)} C${f1(x - wd)},${f1(y0 + l + wd * 2.2)} ${f1(x + wd)},${f1(y0 + l + wd * 2.2)} ${f1(x + wd)},${f1(y0 + l)} L${f1(x + wd)},${f1(y0)} Z" fill="${P.blood}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
    }
    // flat cobweb in the top-right corner
    const wx = w - o - 1, wy = o + 1, wr = u * 2.2;
    let web = '';
    for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 + (i / 5) * (Math.PI / 2); web += `M${f1(wx)},${f1(wy)} L${f1(wx + Math.cos(a) * wr)},${f1(wy + Math.sin(a) * wr)} `; }
    for (let q = 1; q <= 4; q++) { const rr = (wr * q) / 4; web += `M${f1(wx)},${f1(wy + rr)} `; for (let i = 1; i <= 5; i++) { const a = Math.PI / 2 + (i / 5) * (Math.PI / 2), sag = rr * 0.12; web += `Q${f1(wx + Math.cos(a - 0.15) * (rr - sag))},${f1(wy + Math.sin(a - 0.15) * (rr - sag))} ${f1(wx + Math.cos(a) * rr)},${f1(wy + Math.sin(a) * rr)} `; } }
    s += `<path d="${web}" fill="none" stroke="${P.bone}" stroke-width="1.1" opacity=".6"/>`;
    return s + '</svg>';
  };

  /* ------------------------------ bats (flying paper cut-outs) ------------------------------ */
  CP.batHTML = function (size) {
    const wing = 'M30,34 C26,22 14,16 2,20 C6,24 6,30 10,34 C13,31 17,32 20,36 C23,34 27,36 30,38 Z';
    return `<svg class="bat" width="${size}" height="${size * 0.62}" viewBox="0 0 60 37" aria-hidden="true">
      <g class="wl"><path d="${wing}" fill="#0b0712" stroke="#2c1c47" stroke-width="1"/></g>
      <g class="wr" transform="translate(60 0) scale(-1 1)"><path d="${wing}" fill="#0b0712" stroke="#2c1c47" stroke-width="1"/></g>
      <path d="M26,24 C26,18 34,18 34,24 L33,34 C32,38 28,38 27,34 Z M26,19 L25,10 L29,15 L31,15 L35,10 L34,19 Z" fill="#0b0712"/>
      <circle cx="28.4" cy="19.5" r="1" fill="#ff4a4a"/><circle cx="31.6" cy="19.5" r="1" fill="#ff4a4a"/></svg>`;
  };
})();
