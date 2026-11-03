/* ==========================================================================
   art.js — every graphic in the game is SVG code written here (no image files).

   The look is the one from LuckyKeno + Paper Plane, turned dark:
     * a colour patch printed slightly OFF-REGISTER behind a hand-drawn ink outline
     * the outline is a thick pass + a thin shifted pass, so the line weight looks uneven
     * every path is jittered by a seeded random, so the drawing is wobbly but identical every run
   Parts of a symbol carry classes (f-eye, f-flame, f-wingL ...). When a symbol wins, the cell
   swaps its <use> for an inline copy, and CSS animates those parts (flames flicker, eyes glow).
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;

  const P = (CP.PAL = {
    ink: '#17121C', paper: '#E9DCC0', paperD: '#CDBB96', paperL: '#F4EBD3',
    blood: '#B3202A', bloodD: '#6E1018', bloodL: '#E4474F',
    sick: '#8FD14F', sickD: '#3F7A2B', glowG: '#B9FF7A',
    bone: '#F3EAD0', purple: '#4A2C73', purpleL: '#8A63C7', orange: '#E8872A', gold: '#E9B93C', goldD: '#8A6A1E',
    night: '#0E0A16', teal: '#1E4A4A', fog: '#9fb6c9',
  });

  /* ------------------------------ drawing helpers ------------------------------ */
  const f1 = (n) => Math.round(n * 10) / 10;
  /** jitter every coordinate of an absolute M/L/C/Q/Z path (no arcs, no H/V used anywhere) */
  function rough(d, amt, r) {
    return d.replace(/-?\d*\.?\d+/g, (m) => f1(parseFloat(m) + (r() - 0.5) * 2 * amt));
  }
  function smooth(pts) {            // closed Catmull-Rom -> cubic bezier
    const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d + ' Z';
  }
  function blob(cx, cy, rx, ry, r, n = 9, wob = 0.05) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * wob;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return smooth(pts);
  }
  const st = (c, w, o = 1, extra = '') => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" ${extra}`;
  /** hand-drawn ink line: a thick pass and a thin, slightly shifted second pass */
  function pen(d, r, w = 3.2, amt = 0.8, cls = '') {
    return `<path class="${cls}" d="${rough(d, amt, r)}" ${st(P.ink, w)}/><path d="${rough(d, amt * 1.5, r)}" ${st(P.ink, w * 0.4, 0.55)} transform="translate(.7 .6)"/>`;
  }
  /** colour patch printed off-register */
  function cut(d, fill, r, o = {}) {
    return `<path class="${o.cls || ''}" d="${rough(d, o.amt === undefined ? 0.6 : o.amt, r)}" fill="${fill}" opacity="${o.op === undefined ? 1 : o.op}" transform="translate(${o.dx === undefined ? 3.5 : o.dx} ${o.dy === undefined ? 3.5 : o.dy})"/>`;
  }
  /** flat shade / highlight shape, no offset */
  const shade = (d, fill, op, r, cls = '') => `<path class="${cls}" d="${rough(d, 0.5, r)}" fill="${fill}" opacity="${op}"/>`;
  const drip = (x, y, len, r) => {
    const w = 3 + r() * 1.5;
    return `<path d="M${f1(x - w)},${y} L${f1(x - w)},${f1(y + len)} C${f1(x - w)},${f1(y + len + 7)} ${f1(x + w)},${f1(y + len + 7)} ${f1(x + w)},${f1(y + len)} L${f1(x + w)},${y} Z" fill="${P.blood}" ${''}/>` +
      `<path d="M${f1(x - w)},${f1(y + 2)} L${f1(x - w)},${f1(y + len)} C${f1(x - w)},${f1(y + len + 7)} ${f1(x + w)},${f1(y + len + 7)} ${f1(x + w)},${f1(y + len)} L${f1(x + w)},${f1(y + 2)}" ${st(P.ink, 2)}/>`;
  };
  const ground = '<ellipse cx="60" cy="110" rx="34" ry="4.5" fill="#17121C" opacity=".16"/>';

  /* ------------------------------ the 12 symbols ------------------------------ */
  const SYM = [];

  function letter(ch, col, seed, dripsAt) {
    const r = U.seeded(seed);
    const t = (fill, extra) => `<text x="60" y="92" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand','Segoe Print',cursive" font-size="112" ${extra}>${ch}</text>`;
    let g = `<g transform="translate(${f1(3.5)} ${f1(3.5)})" opacity=".96"><text x="60" y="92" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand','Segoe Print',cursive" font-size="112" fill="${col}">${ch}</text></g>`;
    g += `<text x="60" y="92" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand','Segoe Print',cursive" font-size="112" fill="none" stroke="${P.ink}" stroke-width="4.2" stroke-linejoin="round">${ch}</text>`;
    g += `<text x="60" y="92" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand','Segoe Print',cursive" font-size="112" fill="none" stroke="${P.ink}" stroke-width="1.4" opacity=".5" transform="translate(1.4 1.2)">${ch}</text>`;
    dripsAt.forEach(([x, y, l]) => (g += drip(x, y, l, r)));
    g += pen(`M${24 + r() * 8},${30 + r() * 10} L${34 + r() * 6},${40 + r() * 6}`, r, 2, 0.5);
    return ground + g;
  }
  SYM[0] = letter('J', P.sick, 11, [[60, 96, 8], [40, 94, 5]]);
  SYM[1] = letter('Q', P.purpleL, 12, [[46, 94, 9], [74, 96, 6]]);
  SYM[2] = letter('K', P.bloodL, 13, [[44, 96, 7], [78, 98, 11]]);
  SYM[3] = letter('A', P.orange, 14, [[36, 98, 8], [86, 98, 6]]);

  /* ---- 4  BAT ---- */
  (function () {
    const r = U.seeded(41);
    const wing = 'M53,58 C45,40 26,30 5,38 C11,44 11,52 17,58 C21,54 27,54 31,61 C35,57 41,59 45,65 C49,69 54,69 58,67 Z';
    const bones = 'M52,58 L12,41 M50,62 L30,60 M49,64 L43,67';
    const half = (flip) =>
      `<g class="${flip ? 'f-wingR' : 'f-wingL'}" ${flip ? 'transform="translate(120 0) scale(-1 1)"' : ''}>` +
      cut(wing, P.purpleL, r, { dx: 3, dy: 3 }) + shade(wing, P.purple, 0.5, r) + pen(wing, r, 3.2) + pen(bones, r, 1.8, 0.5) + '</g>';
    const body = 'M51,58 C51,48 69,48 69,58 L67,80 C65,89 55,89 53,80 Z';
    const head = 'M49,40 L47,20 L57,30 L63,30 L73,20 L71,40 C71,52 49,52 49,40 Z';
    SYM[4] = ground + half(false) + half(true) +
      cut(body, '#3A2A52', r) + pen(body, r, 3) + cut(head, '#3A2A52', r, { dx: 3, dy: 3 }) + pen(head, r, 3.2) +
      `<circle class="f-eye" cx="55.5" cy="38" r="3" fill="${P.bloodL}"/><circle class="f-eye" cx="64.5" cy="38" r="3" fill="${P.bloodL}"/>` +
      `<circle cx="55.5" cy="38" r="1" fill="${P.ink}"/><circle cx="64.5" cy="38" r="1" fill="${P.ink}"/>` +
      `<path d="M56,46 L57.6,52 L59.2,46 Z M60.8,46 L62.4,52 L64,46 Z" fill="${P.bone}" stroke="${P.ink}" stroke-width="1"/>` +
      pen('M55,88 L52,98 M65,88 L68,98', r, 2.2, 0.4);
  })();

  /* ---- 5  CANDLE ---- */
  (function () {
    const r = U.seeded(55);
    const dish = 'M14,92 C30,85 90,85 106,92 C102,106 18,106 14,92 Z';
    const wax = 'M44,42 C44,35 51,33 60,35 C69,33 76,35 76,42 L76,92 L44,92 Z';
    const d1 = 'M44,50 L44,72 C44,80 53,80 53,72 L53,52 Z', d2 = 'M67,48 L67,82 C67,91 76,91 76,82 L76,50 Z';
    const flame = 'M60,38 C43,26 54,16 60,3 C66,16 77,26 60,38 Z', inner = 'M60,36 C52,29 58,22 60,15 C62,22 68,29 60,36 Z';
    SYM[5] = ground +
      `<circle class="f-glow" cx="60" cy="24" r="30" fill="url(#gGlowO)"/>` +
      cut(dish, P.goldD, r) + pen(dish, r, 3.2) +
      cut(wax, P.bone, r, { dx: 3, dy: 3 }) + shade('M66,36 L76,42 L76,92 L66,92 Z', P.bloodD, 0.16, r) + pen(wax, r, 3.2) +
      cut(d1, P.bone, r, { dx: 2, dy: 2 }) + pen(d1, r, 2.6) + cut(d2, P.bone, r, { dx: 2, dy: 2 }) + pen(d2, r, 2.6) +
      pen('M60,35 L60,42', r, 2.2, 0.2) +
      // the melting face
      `<circle cx="55" cy="60" r="2.8" fill="${P.ink}"/><circle cx="66" cy="60" r="2.8" fill="${P.ink}"/>` + pen('M53,71 C57,77 64,77 68,71', r, 2.2, 0.4) +
      `<g class="f-flame"><path d="${rough(flame, 0.5, r)}" fill="${P.orange}" transform="translate(2 2)"/>` + pen(flame, r, 2.8, 0.5) +
      `<path d="${rough(flame, 0.3, r)}" fill="${P.gold}"/><path d="${rough(inner, 0.3, r)}" fill="${P.paperL}"/></g>`;
  })();

  /* ---- 6  PUMPKIN ---- */
  (function () {
    const r = U.seeded(66);
    const body = 'M60,27 C84,19 110,35 108,64 C106,92 86,106 60,106 C34,106 14,92 12,64 C10,35 36,19 60,27 Z';
    const stem = 'M54,29 C52,19 56,11 66,9 L74,13 C70,19 70,25 68,29 Z';
    const eyeL = 'M30,50 L50,58 L34,72 Z', eyeR = 'M90,50 L70,58 L86,72 Z', nose = 'M60,66 L53,78 L67,78 Z';
    const mouth = 'M27,82 L40,78 L46,90 L54,80 L60,92 L66,80 L74,90 L80,78 L93,82 C87,99 72,103 60,103 C48,103 33,99 27,82 Z';
    SYM[6] = ground + `<circle class="f-glow" cx="60" cy="72" r="46" fill="url(#gGlowY)" opacity=".5"/>` +
      cut(body, P.orange, r) + shade('M86,30 C104,40 108,66 100,88 C94,100 80,105 66,106 C84,90 92,60 86,30 Z', P.bloodD, 0.3, r) +
      pen(body, r, 3.6) + pen('M60,27 C48,50 48,84 60,106', r, 2.4) + pen('M60,27 C72,50 72,84 60,106', r, 2.4) +
      pen('M36,29 C22,50 24,84 38,102', r, 2) + pen('M84,29 C98,50 96,84 82,102', r, 2) +
      cut(stem, P.sickD, r, { dx: 2, dy: 2 }) + pen(stem, r, 3) + pen('M72,13 C85,4 95,10 91,21 C89,25 83,23 85,19', r, 2.4) +
      [eyeL, eyeR, nose, mouth].map((d) => `<path class="f-glow2" d="${rough(d, 0.4, r)}" fill="${P.gold}"/>` + pen(d, r, 2.6, 0.5)).join('') +
      `<path d="M34,60 L44,62 L36,68 Z M86,60 L76,62 L84,68 Z" fill="${P.paperL}" opacity=".8"/>`;
  })();

  /* ---- 7  GHOST ---- */
  (function () {
    const r = U.seeded(77);
    const body = 'M60,10 C86,10 102,30 102,58 L102,102 C96,98 92,108 85,102 C79,97 74,108 68,102 C62,97 57,108 51,102 C45,97 40,108 34,102 C28,97 24,108 18,102 L18,58 C18,30 34,10 60,10 Z';
    const armL = 'M20,62 C8,55 0,66 4,78 C8,87 16,85 21,80 Z', armR = 'M100,62 C112,55 120,66 116,78 C112,87 104,85 99,80 Z';
    SYM[7] = `<circle class="f-glow" cx="60" cy="58" r="58" fill="url(#gGlowG)"/>` + ground +
      cut(armL, '#B6EBD9', r) + pen(armL, r, 2.8) + cut(armR, '#B6EBD9', r) + pen(armR, r, 2.8) +
      cut(body, '#B6EBD9', r) + shade('M18,58 C18,30 34,10 60,10 C36,22 30,50 36,80 C38,92 34,100 28,102 L18,102 Z', P.purple, 0.2, r) +
      pen(body, r, 3.4) +
      `<path class="f-eye" d="${blob(44, 50, 8, 13.5, r)}" fill="${P.ink}"/><path class="f-eye" d="${blob(76, 50, 8, 13.5, r)}" fill="${P.ink}"/>` +
      `<circle cx="46.5" cy="45" r="2.2" fill="${P.glowG}"/><circle cx="78.5" cy="45" r="2.2" fill="${P.glowG}"/>` +
      `<path d="${blob(60, 80, 9, 14, r)}" fill="${P.ink}"/>` + pen('M44,64 C42,72 46,78 44,88', r, 2, 0.4) + pen('M76,64 C74,72 78,78 76,88', r, 2, 0.4);
  })();

  /* ---- 8  SKULL ---- */
  (function () {
    const r = U.seeded(88);
    const skull = 'M60,10 C90,10 106,30 104,56 C103,68 98,76 90,82 L90,98 L76,98 L74,108 L66,108 L64,98 L56,98 L54,108 L46,108 L44,98 L30,98 L30,82 C22,76 17,68 16,56 C14,30 30,10 60,10 Z';
    const eyeL = 'M28,52 C28,38 48,38 52,52 C54,64 36,70 28,52 Z', eyeR = 'M92,52 C92,38 72,38 68,52 C66,64 84,70 92,52 Z';
    SYM[8] = ground + `<circle class="f-glow" cx="60" cy="58" r="52" fill="url(#gGlowR)" opacity=".5"/>` +
      cut(skull, '#E6D8A8', r) + shade('M82,14 C100,26 106,50 98,72 C94,78 92,80 90,82 L90,98 L76,98 C84,76 88,40 82,14 Z', P.purple, 0.22, r) + pen(skull, r, 3.6) +
      `<path d="${rough(eyeL, 0.4, r)}" fill="${P.ink}"/><path d="${rough(eyeR, 0.4, r)}" fill="${P.ink}"/>` +
      `<circle class="f-eye" cx="40" cy="53" r="5.2" fill="${P.bloodL}"/><circle class="f-eye" cx="80" cy="53" r="5.2" fill="${P.bloodL}"/>` +
      `<circle cx="38.5" cy="51.5" r="1.6" fill="${P.paperL}"/><circle cx="78.5" cy="51.5" r="1.6" fill="${P.paperL}"/>` +
      `<path d="M60,64 L53,81 L67,81 Z" fill="${P.ink}"/>` + pen('M46,98 L46,86 M60,98 L60,86 M74,98 L74,86', r, 2.2, 0.4) +
      pen('M72,12 L66,26 L74,34 L68,47', r, 2.4, 0.5) + drip(40, 62, 14, r);
  })();

  /* ---- 9  DOLL ---- */
  (function () {
    const r = U.seeded(99);
    const head = 'M60,16 C78,16 90,30 88,48 C86,64 74,74 60,74 C46,74 34,64 32,48 C30,30 42,16 60,16 Z';
    const hair = 'M32,42 C26,14 50,6 60,10 C72,6 94,16 88,42 C80,28 70,25 60,26 C50,25 38,28 32,42 Z';
    const pigL = 'M33,34 C16,32 8,52 18,66 C24,58 28,48 34,45 Z', pigR = 'M87,34 C104,32 112,52 102,66 C96,58 92,48 86,45 Z';
    const dress = 'M40,74 L80,74 L98,110 L22,110 Z';
    SYM[9] = ground +
      cut(dress, P.blood, r) + shade('M70,74 L80,74 L98,110 L82,110 Z', P.bloodD, 0.35, r) + pen(dress, r, 3.2) +
      pen('M44,74 L40,110 M60,76 L60,110 M76,74 L80,110', r, 1.6, 0.4) +
      pen('M42,80 L22,98 M78,80 L98,98', r, 3.6, 0.5) +
      cut(pigL, '#3A2A52', r) + pen(pigL, r, 3) + cut(pigR, '#3A2A52', r) + pen(pigR, r, 3) +
      cut(head, '#EBD3BB', r, { dx: 3, dy: 3 }) + pen(head, r, 3.4) +
      cut(hair, '#3A2A52', r, { dx: 2, dy: 2 }) + pen(hair, r, 3) +
      `<path d="M12,34 L26,28 L24,42 Z M108,34 L94,28 L96,42 Z" fill="${P.bloodL}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>` +
      // button eyes
      `<g class="f-eye"><circle cx="48" cy="46" r="8" fill="${P.paperL}" stroke="${P.ink}" stroke-width="2.6"/>` + pen('M43,41 L53,51 M53,41 L43,51', r, 2.4, 0.3) + '</g>' +
      `<g class="f-eye2"><circle cx="72" cy="46" r="8" fill="${P.ink}"/><circle cx="72" cy="46" r="3" fill="${P.bloodL}"/><circle cx="69.5" cy="43.5" r="1.6" fill="${P.paperL}"/></g>` +
      `<path d="M34,56 C38,54 42,56 42,58 C38,60 34,59 34,56 Z M86,56 C82,54 78,56 78,58 C82,60 86,59 86,56 Z" fill="${P.bloodL}" opacity=".5"/>` +
      pen('M44,62 C52,67 68,67 76,62', r, 2.4, 0.4) + pen('M49,59 L48,68 M56,63 L56,71 M64,63 L64,71 M71,59 L72,68', r, 1.8, 0.3) +
      `<path d="M72,56 C74,62 72,66 74,70" ${st(P.bloodL, 2)}/>` + `<path d="M66,12 C70,4 80,6 78,14" ${st(P.ink, 2.2)}/>`;
  })();

  /* ---- 10  WILD (black cat) ---- */
  (function () {
    const r = U.seeded(110);
    const head = 'M26,44 L20,10 L44,25 C52,23 68,23 76,25 L100,10 L94,44 C98,60 82,76 60,76 C38,76 22,60 26,44 Z';
    const body = 'M34,70 C28,86 30,98 38,106 L82,106 C90,98 92,86 86,70 C78,78 42,78 34,70 Z';
    const tail = 'M88,102 C114,100 116,66 100,56 C104,70 98,84 86,92 Z';
    const eyeL = 'M33,46 C39,35 52,37 56,48 C50,57 40,57 33,46 Z', eyeR = 'M87,46 C81,35 68,37 64,48 C70,57 80,57 87,46 Z';
    const rim = (d) => `<path d="${rough(d, 0.5, r)}" ${st(P.bone, 1.8, 0.75)} transform="translate(-1.6 -1.6)"/>`;
    SYM[10] = `<circle class="f-glow" cx="60" cy="52" r="56" fill="url(#gGlowG)" opacity=".75"/>` +
      cut(tail, '#2A1F3A', r) + pen(tail, r, 3) + cut(body, '#2A1F3A', r) + rim(body) + pen(body, r, 3.2) +
      cut(head, '#2A1F3A', r) + rim(head) + pen(head, r, 3.4) +
      `<path d="M27,32 L25,19 L38,27 Z M93,32 L95,19 L82,27 Z" fill="${P.bloodL}" opacity=".75"/>` +
      [eyeL, eyeR].map((d) => `<path class="f-eye" d="${rough(d, 0.3, r)}" fill="${P.sick}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`).join('') +
      `<path d="M45,40 C42,46 42,50 45,56 C48,50 48,46 45,40 Z M75,40 C72,46 72,50 75,56 C78,50 78,46 75,40 Z" fill="${P.ink}"/>` +
      `<circle cx="42.5" cy="43.5" r="1.7" fill="${P.paperL}"/><circle cx="72.5" cy="43.5" r="1.7" fill="${P.paperL}"/>` +
      `<path d="M60,58 L55,64 L65,64 Z" fill="${P.bloodL}"/>` +
      `<path d="M60,64 C58,70 52,70 50,66 M60,64 C62,70 68,70 70,66" ${st(P.bone, 1.8, 0.9)}/>` +
      `<path d="M30,60 L6,55 M30,65 L6,67 M90,60 L114,55 M90,65 L114,67" ${st(P.bone, 1.6, 0.8)}/>` +
      // WILD ribbon
      `<path d="M8,90 L112,90 L105,103 L112,116 L8,116 L15,103 Z" fill="${P.bloodD}" transform="translate(2.5 2.5)"/>` +
      `<path d="M8,90 L112,90 L105,103 L112,116 L8,116 L15,103 Z" fill="${P.blood}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<text x="60" y="111" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand',cursive" font-size="25" letter-spacing="3" fill="${P.paperL}" stroke="${P.ink}" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">WILD</text>`;
  })();

  /* ---- 11  SCATTER (cursed grimoire) ---- */
  (function () {
    const r = U.seeded(121);
    const cover = 'M22,8 L98,8 C102,8 104,12 104,16 L104,90 C104,94 102,98 98,98 L22,98 C18,98 16,94 16,90 L16,16 C16,12 18,8 22,8 Z';
    const spine = 'M16,8 L30,8 L30,98 L16,98 Z';
    const eye = 'M32,53 C44,33 76,33 88,53 C76,73 44,73 32,53 Z';
    let rays = '';
    for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI, x0 = 60 + Math.cos(a) * 33, y0 = 52 + Math.sin(a) * 24, x1 = 60 + Math.cos(a) * 41, y1 = 52 + Math.sin(a) * 31; rays += `M${f1(x0)},${f1(y0)} L${f1(x1)},${f1(y1)} `; }
    SYM[11] = `<circle class="f-glow" cx="60" cy="54" r="62" fill="url(#gGlowG)"/>` + ground +
      cut(cover, '#43285F', r, { dx: 3.5, dy: 3.5 }) + shade('M70,8 L98,8 C102,8 104,12 104,16 L104,90 C104,94 102,98 98,98 L60,98 C80,70 80,34 70,8 Z', P.night, 0.28, r) + pen(cover, r, 3.6) +
      cut(spine, '#2B183E', r, { dx: 2, dy: 2 }) + pen(spine, r, 2.8) +
      `<path d="M36,16 L96,16 L96,90 L36,90 Z" ${st(P.gold, 1.8, 0.85, 'stroke-dasharray="4 3"')}/>` +
      [[24, 20], [24, 86], [96, 20], [96, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${P.gold}" stroke="${P.ink}" stroke-width="1.6"/>`).join('') +
      `<path d="${rays}" ${st(P.gold, 2.4, 0.95)}/>` +
      `<path d="${rough(eye, 0.4, r)}" fill="${P.paperL}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<g class="f-eye"><circle cx="60" cy="53" r="13" fill="${P.sick}" stroke="${P.ink}" stroke-width="2.6"/></g>` +
      `<path d="M60,41 C56,48 56,58 60,65 C64,58 64,48 60,41 Z" fill="${P.ink}"/><circle cx="55.5" cy="48" r="2.2" fill="${P.paperL}"/>` +
      `<path d="M14,92 L106,92 L100,105 L106,118 L14,118 L20,105 Z" fill="${P.ink}" opacity=".5" transform="translate(2.5 2.5)"/>` +
      `<path d="M14,92 L106,92 L100,105 L106,118 L14,118 L20,105 Z" fill="${P.gold}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<text x="60" y="112" text-anchor="middle" font-family="'Caveat Brush','Patrick Hand',cursive" font-size="19" letter-spacing="2" fill="${P.bloodD}">SCATTER</text>`;
  })();

  CP.symbolSVG = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 128 128">${SYM[id]}</svg>`;

  /* ------------------------------ global defs (gradients + symbols) ------------------------------ */
  CP.installDefs = function () {
    const grad = (id, c, a0, a1) => `<radialGradient id="${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c}" stop-opacity="${a0}"/><stop offset=".6" stop-color="${c}" stop-opacity="${a1}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    const symbols = SYM.map((s, i) => `<symbol id="sym${i}" viewBox="-4 -4 128 128" overflow="visible">${s}</symbol>`).join('');
    const svg = document.getElementById('defs');
    svg.innerHTML = `<defs>${grad('gGlowY', '#FFD84A', 0.75, 0.25)}${grad('gGlowG', '#B9FF7A', 0.5, 0.16)}${grad('gGlowO', '#FFA040', 0.8, 0.28)}${grad('gGlowR', '#FF4A4A', 0.55, 0.2)}
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.035" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>
      ${symbols}</defs>`;
  };
  /* v3: the 12 symbols are the supplied artwork (symbols/s0..s11.webp, all normalised to the same
     512 box and the same 440 px height, so they sit on the same baseline and centre in every cell). */
  CP.SYMFILES = Array.from({ length: 12 }, (_, i) => `symbols/s${i}.webp`);
  CP.symbolHTML = (id, cls) => `<img class="sym ${cls || ''}" src="${CP.SYMFILES[id]}" alt="" draggable="false" decoding="async">`;
  CP.symbolInline = CP.symbolHTML;
  CP.LOGO = 'logo/logo.webp';
  CP.preload = function () {
    const list = CP.SYMFILES.concat([CP.LOGO]);
    return Promise.all(list.map((src) => new Promise((res) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().then(res, res) : res()); im.onerror = res; im.src = src; })));
  };

  /* ------------------------------ UI icons (24 x 24, currentColor) ------------------------------ */
  const ICON = {
    menu: '<path d="M4,7 L20,7 M4,12.5 L20,12.5 M4,18 L20,18"/>',
    plus: '<path d="M12,4.5 L12,19.5 M4.5,12 L19.5,12"/>',
    minus: '<path d="M4.5,12 L19.5,12"/>',
    close: '<path d="M5,5 L19,19 M19,5 L5,19"/>',
    back: '<path d="M15,5 L8,12 L15,19"/>', next: '<path d="M9,5 L16,12 L9,19"/>',
    sound: '<path d="M4,9.5 L8,9.5 L13,5 L13,19 L8,14.5 L4,14.5 Z"/><path d="M16.5,9 C18.5,11 18.5,13 16.5,15 M19,6.5 C22.5,10 22.5,14 19,17.5"/>',
    mute: '<path d="M4,9.5 L8,9.5 L13,5 L13,19 L8,14.5 L4,14.5 Z"/><path d="M17,9.5 L22,14.5 M22,9.5 L17,14.5"/>',
    auto: '<path d="M19.5,11 C19,7 15.5,4.5 12,4.5 C8,4.5 5,7.5 4.7,11 M4.5,13 C5,17 8.5,19.5 12,19.5 C16,19.5 19,16.5 19.3,13"/><path d="M19.5,5 L19.5,11 L13.5,11 M4.5,19 L4.5,13 L10.5,13"/>',
    turbo: '<path d="M13.5,2.5 L5.5,13.5 L11,13.5 L9.5,21.5 L18.5,9.5 L12.5,9.5 Z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12,11 L12,17 M12,7.4 L12,7.6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12,2.8 L12,5.4 M12,18.6 L12,21.2 M2.8,12 L5.4,12 M18.6,12 L21.2,12 M5.5,5.5 L7.3,7.3 M16.7,16.7 L18.5,18.5 M5.5,18.5 L7.3,16.7 M16.7,7.3 L18.5,5.5"/>',
    book: '<path d="M4,5.5 C7.5,4.5 10,5 12,7 C14,5 16.5,4.5 20,5.5 L20,18.5 C16.5,17.5 14,18 12,20 C10,18 7.5,17.5 4,18.5 Z M12,7 L12,20"/>',
    chart: '<path d="M4.5,19.5 L19.5,19.5 M7,19 L7,12 M12,19 L12,6 M17,19 L17,10"/>',
    skull: '<path d="M12,3.5 C16.5,3.5 19,6.5 19,10.5 C19,13 18,14.5 16.5,15.5 L16.5,19.5 L7.5,19.5 L7.5,15.5 C6,14.5 5,13 5,10.5 C5,6.5 7.5,3.5 12,3.5 Z"/><path d="M9,10.5 L9,10.7 M15,10.5 L15,10.7 M10.5,19.5 L10.5,16.5 M13.5,19.5 L13.5,16.5"/>',
    full: '<path d="M4.5,9 L4.5,4.5 L9,4.5 M15,4.5 L19.5,4.5 L19.5,9 M19.5,15 L19.5,19.5 L15,19.5 M9,19.5 L4.5,19.5 L4.5,15"/>',
    refresh: '<path d="M19,12 C19,8 15.5,5 12,5 C9.5,5 7.5,6.3 6.3,8.2 M5,12 C5,16 8.5,19 12,19 C14.5,19 16.5,17.7 17.7,15.8"/><path d="M6.3,4.5 L6.3,8.2 L10,8.2 M17.7,19.5 L17.7,15.8 L14,15.8"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    bolt: '<path d="M13.5,2.5 L5.5,13.5 L11,13.5 L9.5,21.5 L18.5,9.5 L12.5,9.5 Z"/>',
  };
  CP.icon = (name, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

  /* ------------------------------ logo + spin seal ------------------------------ */
  CP.logoSVG = function () { return `<img class="logo-svg" src="${CP.LOGO}" alt="Cursed Pages" draggable="false">`; };

  /** SPIN button: a blood-wax seal with dripping edge, a gold rim carrying slowly turning runes, and the turning arrows */
  CP.sealSVG = function () {
    const r = U.seeded(77), G = '#E9B93C', GD = '#8A6A1E', GL = '#FFE9A6';
    const wax = blob(100, 100, 88, 88, r, 26, 0.026);          // scalloped, hand-cut wax edge
    const disc = blob(100, 100, 59, 59, r, 14, 0.012);
    const rim = blob(100, 100, 68, 68, r, 16, 0.01);
    // rune glyphs on the gold rim (they turn slowly)
    const GLY = ['M0,-4 L3.6,3 L-3.6,3 Z', 'M-3.6,-3.6 L3.6,3.6 M3.6,-3.6 L-3.6,3.6', 'M-3.2,0 A3.2,3.2 0 1,0 3.2,0 A3.2,3.2 0 1,0 -3.2,0 M0,-5 L0,5', 'M3,-4 C-3,-3 -3,3 3,4 C0,2 0,-2 3,-4 Z'];
    let runes = '';
    for (let i = 0; i < 14; i++) { const an = (i / 14) * 360, x = 100 + Math.cos((an * Math.PI) / 180) * 68, y = 100 + Math.sin((an * Math.PI) / 180) * 68; runes += `<path d="${GLY[i % 4]}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(an + 90)})" fill="none" stroke="${P.ink}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`; }
    return `<svg class="seal-svg" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="spD" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#D93A45"/><stop offset=".55" stop-color="#A81E28"/><stop offset="1" stop-color="#5E0C14"/></radialGradient>
        <radialGradient id="spW" cx="40%" cy="32%" r="85%"><stop offset="0" stop-color="#C82A35"/><stop offset="1" stop-color="#7A121B"/></radialGradient>
        <linearGradient id="spG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GL}"/><stop offset=".5" stop-color="${G}"/><stop offset="1" stop-color="${GD}"/></linearGradient>
      </defs>
      <path d="${wax}" fill="${P.ink}" opacity=".55" transform="translate(5 8)"/>
      <g class="seal-body">
        <path d="${wax}" fill="${P.bloodD}" transform="translate(4 4)"/>
        ${drip(60, 170, 10, r)}${drip(104, 182, 5, r)}${drip(146, 168, 11, r)}
        <path d="${wax}" fill="url(#spW)" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
        <path d="${rim}" fill="none" stroke="${P.ink}" stroke-width="17" stroke-linejoin="round"/>
        <path d="${rim}" fill="none" stroke="url(#spG)" stroke-width="12" stroke-linejoin="round"/>
        <g class="seal-ring">${runes}</g>
        <path d="${disc}" fill="url(#spD)" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>
        <path d="M44,84 C48,58 70,42 98,40 C74,48 60,64 56,92 Z" fill="#fff" opacity=".2"/>
        <circle cx="62" cy="52" r="3.4" fill="#fff" opacity=".55"/>
        <g class="seal-arrows"><g transform="translate(100 100) scale(.93) translate(-100 -100)"><g ${st(P.ink, 13)}><path d="M44,100 C44,68 68,46 100,46 C120,46 136,54 146,66"/><path d="M156,100 C156,132 132,154 100,154 C80,154 64,146 54,134"/><path d="M146,50 L148,68 L130,70"/><path d="M54,150 L52,132 L70,130"/></g>
          <g ${st(P.paperL, 6.5)}><path d="M44,100 C44,68 68,46 100,46 C120,46 136,54 146,66"/><path d="M156,100 C156,132 132,154 100,154 C80,154 64,146 54,134"/><path d="M146,50 L148,68 L130,70"/><path d="M54,150 L52,132 L70,130"/></g></g></g>
      </g>
    </svg>`;
  };
})();
