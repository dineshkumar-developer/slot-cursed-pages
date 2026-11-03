/* ==========================================================================
   intro.js — the opening cinematic (replaces the old title card).
     0  the chained grimoire floats in a dark room, fog, dust, green light leaking out
        TAP the book (this tap also unlocks the audio)
     1  the book shakes, the chains rattle, lightning, the chains SNAP
     2  the eye on the cover opens, the cover swings open in real 3D, souls and bats pour out
     3  pages flip, a glowing ritual circle is revealed
     4  the camera dives into the circle, white-out, boom
     5  CURSED PAGES slams in with shockwave, lightning and embers, then the game appears
   SKIP is always available. With "Reduce motion" the cinematic is replaced by a short fade.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U, P = CP.PAL, $ = U.$, el = U.el;
  CP.BUILD = '21';
  // SAFE 2.5D book: on touch devices the five coplanar pages of the 3D book can z-fight on the phone GPU (flicker). In safe mode the
  // pages are not sorted by the GPU at all: each leaf is its own flat layer painted in a fixed z-index order. ?safe3d=0 / =1 forces it.
  CP.safe3d = /[?&]safe3d=1/.test(location.search) || (!/[?&]safe3d=0/.test(location.search) && !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches));

  /* ------------------------------ art pieces ------------------------------ */
  function coverSVG() {
    let rays = '';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rays += `M${(Math.cos(a) * 80).toFixed(1)},${(Math.sin(a) * 58).toFixed(1)} L${(Math.cos(a) * 94).toFixed(1)},${(Math.sin(a) * 70).toFixed(1)} `; }
    const corner = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})"><path d="M0,0 C16,0 22,8 22,22 M0,8 C10,8 14,12 14,22" fill="none" stroke="#d7a93a" stroke-width="2.4"/><circle cx="26" cy="26" r="5.5" fill="#d7a93a" stroke="#07030c" stroke-width="1.8"/></g>`;
    return `<svg viewBox="0 0 300 396" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="cvL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f2f70"/><stop offset=".5" stop-color="#2b1742"/><stop offset="1" stop-color="#130922"/></linearGradient>
      <radialGradient id="cvI" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#eaffb4"/><stop offset=".45" stop-color="#7fd13a"/><stop offset="1" stop-color="#1d4a12"/></radialGradient>
      <radialGradient id="cvG"><stop offset="0" stop-color="#9cff7a" stop-opacity=".85"/><stop offset="1" stop-color="#9cff7a" stop-opacity="0"/></radialGradient>
      <filter id="cvTex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .3 0"/></filter></defs>
      <rect x="2" y="2" width="296" height="392" rx="12" fill="url(#cvL)" stroke="#07030c" stroke-width="4"/>
      <rect x="2" y="2" width="296" height="392" rx="12" filter="url(#cvTex)"/>
      <path d="M14,6 C60,4 120,4 160,8 C110,40 60,40 14,30 Z" fill="#fff" opacity=".07"/>
      <rect x="2" y="2" width="30" height="392" rx="10" fill="#000" opacity=".4"/><rect x="32" y="2" width="3" height="392" fill="#000" opacity=".5"/>
      <rect x="46" y="22" width="236" height="352" rx="6" fill="none" stroke="#d7a93a" stroke-width="3"/>
      <rect x="55" y="31" width="218" height="334" rx="4" fill="none" stroke="#8a6a1e" stroke-width="1.4" stroke-dasharray="5 4"/>
      ${corner(46, 22, 1, 1)}${corner(282, 22, -1, 1)}${corner(46, 374, 1, -1)}${corner(282, 374, -1, -1)}
      <text x="164" y="80" text-anchor="middle" font-family="'Caveat Brush',cursive" font-size="36" letter-spacing="6" fill="#d7a93a" stroke="#07030c" stroke-width="3" paint-order="stroke">CURSED</text>
      <text x="164" y="344" text-anchor="middle" font-family="'Caveat Brush',cursive" font-size="36" letter-spacing="6" fill="#d7a93a" stroke="#07030c" stroke-width="3" paint-order="stroke">PAGES</text>
      <g transform="translate(164 198)">
        <circle id="cvGlow" r="120" fill="url(#cvG)" opacity=".5"/>
        <path id="cvSlit" d="M-72,0 C-30,-7 30,-7 72,0" fill="none" stroke="#b6ff8a" stroke-width="5" stroke-linecap="round"/>
        <g id="cvRays"><path d="${rays}" stroke="#d7a93a" stroke-width="3.2" stroke-linecap="round" fill="none"/></g>
        <g id="cvEye">
          <path d="M-72,0 C-38,-54 38,-54 72,0 C38,54 -38,54 -72,0 Z" fill="#d9c9a0" stroke="#07030c" stroke-width="4.5" stroke-linejoin="round"/>
          <path d="M-60,-4 C-48,-14 -40,-12 -34,-18 M60,4 C48,14 40,12 34,18 M-56,10 C-46,6 -40,10 -34,6 M56,-10 C46,-6 40,-10 34,-6" stroke="#b02a2a" stroke-width="1.2" fill="none" opacity=".7"/>
          <g id="cvIris"><circle r="31" fill="url(#cvI)" stroke="#07030c" stroke-width="3.4"/><ellipse id="cvPupil" rx="8" ry="24" fill="#07030c"/><circle cx="-9" cy="-11" r="5.5" fill="#fff" opacity=".85"/></g>
        </g>
      </g></svg>`;
  }
  function chainSVG(n) {
    let g = '';
    for (let i = 0; i < n; i++) {
      const x = 16 + i * 26, even = i % 2 === 0, rx = even ? 15 : 8, ry = even ? 9 : 12;
      g += `<ellipse cx="${x}" cy="20" rx="${rx}" ry="${ry}" fill="none" stroke="#07030c" stroke-width="9.5"/><ellipse cx="${x}" cy="20" rx="${rx}" ry="${ry}" fill="none" stroke="${even ? '#b3b9c9' : '#6c7285'}" stroke-width="5"/><ellipse cx="${x}" cy="20" rx="${rx}" ry="${ry}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".35" transform="translate(-1.5 -1.5)"/>`;
    }
    return `<svg viewBox="0 0 ${n * 26 + 8} 40" width="100%" height="100%" preserveAspectRatio="none">${g}</svg>`;
  }
  const lockSVG = `<svg viewBox="0 0 80 100" width="100%" height="100%"><path d="M20,44 L20,30 C20,10 60,10 60,30 L60,44" fill="none" stroke="#07030c" stroke-width="14"/><path d="M20,44 L20,30 C20,10 60,10 60,30 L60,44" fill="none" stroke="#b3b9c9" stroke-width="8"/>
    <rect x="8" y="42" width="64" height="50" rx="8" fill="#d7a93a" stroke="#07030c" stroke-width="5"/><path d="M12,48 L68,48" stroke="#fff" opacity=".35" stroke-width="3"/><circle cx="40" cy="64" r="7" fill="#07030c"/><path d="M36,68 L34,82 L46,82 L44,68 Z" fill="#07030c"/></svg>`;
  const circleSVG = `<svg viewBox="0 0 200 200" width="100%" height="100%"><g fill="none" stroke="#17e04a" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 4px #37ff6a)"><circle cx="100" cy="100" r="86" stroke-width="3"/><circle cx="100" cy="100" r="74" stroke-width="1.6" stroke-dasharray="5 6"/><polygon points="100,22 148,164 24,76 176,76 52,164" stroke-width="2.6"/>
    ${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 6.283; return `<path d="M${(100 + Math.cos(a) * 88).toFixed(1)},${(100 + Math.sin(a) * 88).toFixed(1)} l${(Math.cos(a + 1.2) * 7).toFixed(1)},${(Math.sin(a + 1.2) * 7).toFixed(1)}" stroke-width="2.4"/>`; }).join('')}</g></svg>`;
  const doodle = (id, style) => `<div class="doodle" style="${style}">${CP.symbolHTML(id)}</div>`;
  const note = (txt, style) => `<div class="inknote" style="${style}">${txt}</div>`;

  function grainURL() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return c.toDataURL('image/png');
  }

  /* ------------------------------ the intro ------------------------------ */
  const I = (CP.intro = {
    started: false, ended: false, tl: null, timers: [],
    init() {
      const sp = $('#splash'); if (!sp) return;
      this.build(sp);
      if (!this._vp) { this._vp = true; CP.onViewport(() => { if (!this.started && $('#splash')) this.build($('#splash')); }); }
    },
    build(sp) {
      const vp = CP.vp, pw = Math.round(Math.min(vp.w * 0.66, vp.h * 0.5)), ph = Math.round(pw * 1.32);
      this.pw = pw; this.ph = ph; this.sOpen = Math.min(1, (vp.w * 0.92) / (pw * 2));
      const fogURL = CP.cloudTex('night'), tw = Math.round(vp.h * 1.2);
      sp.innerHTML = `
        <div class="in-bg"></div>
        <div class="in-fog" style="background-image:url(${fogURL});--tw:${tw}px;width:${vp.w + tw * 2}px"></div>
        <div class="in-fog f2" style="background-image:url(${fogURL});--tw:${tw}px;width:${vp.w + tw * 2}px"></div>
        <div class="in-rays"></div><div class="in-glow"></div><div class="in-beam"></div>
        <div class="in-floor"></div>
        <div class="bk-scene" id="bkScene" style="--pw:${pw}px;--ph:${ph}px"><div class="bk-wrap" id="bkWrap"><div class="bk" id="bk">
          <div class="leaf base"><div class="face f pg pgR">
            <div class="circle" id="ritual">${circleSVG}</div>${note('lay your hand upon the circle', 'left:12%;bottom:6%;width:76%;transform:rotate(-2deg)')}${doodle(7, 'left:6%;top:4%;width:26%;transform:rotate(-8deg)')}</div></div>
          <div class="leaf" id="lf3" style="z-index:2"><div class="face f pg pgR">${doodle(8, 'left:18%;top:12%;width:64%;transform:rotate(3deg)')}${note('it hungers', 'left:10%;bottom:10%;width:80%;transform:rotate(-3deg);font-size:1.5em')}</div>
            <div class="face b pg pgL">${doodle(10, 'left:16%;top:14%;width:68%;transform:rotate(-4deg)')}${note('the cat saw it first', 'left:10%;bottom:9%;width:80%;transform:rotate(2deg)')}</div></div>
          <div class="leaf" id="lf2" style="z-index:3"><div class="face f pg pgR">${doodle(9, 'left:20%;top:10%;width:60%;transform:rotate(-3deg)')}${note('she is still smiling', 'left:8%;bottom:9%;width:84%;transform:rotate(2deg)')}</div>
            <div class="face b pg pgL">${doodle(6, 'left:18%;top:14%;width:64%;transform:rotate(5deg)')}${note('do not light the candle', 'left:8%;bottom:10%;width:84%;transform:rotate(-2deg)')}</div></div>
          <div class="leaf" id="lf1" style="z-index:4"><div class="face f pg pgR">${doodle(4, 'left:14%;top:10%;width:72%;transform:rotate(-5deg)')}${note('they come at night', 'left:8%;bottom:10%;width:84%;transform:rotate(-2deg)')}</div>
            <div class="face b pg pgL">${doodle(5, 'left:20%;top:12%;width:60%;transform:rotate(2deg)')}${note('every page you turn…', 'left:8%;bottom:10%;width:84%;transform:rotate(1.5deg)')}</div></div>
          <div class="leaf" id="cover" style="z-index:5"><div class="face f cov" id="covF">${coverSVG()}
              <div class="chain c1" id="ch1">${chainSVG(24)}</div><div class="chain c2" id="ch2">${chainSVG(24)}</div><div class="lock" id="lock">${lockSVG}</div></div>
            <div class="face b pg pgL">${doodle(7, 'left:22%;top:10%;width:56%;transform:rotate(-4deg)')}${note('Do not turn the page.', 'left:8%;bottom:12%;width:84%;transform:rotate(-3deg);font-size:1.7em')}</div></div>
        </div></div></div>
        <div class="in-title" id="inTitle"><div class="in-ring" id="inRing"></div><div class="in-ring r2" id="inRing2"></div>
          <div class="in-logo" id="inLogo">${CP.logoSVG()}</div><p class="in-tag" id="inTag">Every spin turns a page… and something turns back.</p></div>
        <div class="in-hint" id="inHint">TOUCH THE BOOK</div>
        <div class="in-fine">Virtual credits only · no real money · b${CP.BUILD}</div>
        <button class="in-skip" id="inSkip" aria-label="Skip intro">SKIP ▸</button>
        <div class="lb t" id="lbT"></div><div class="lb b" id="lbB"></div>
        <div class="in-white" id="inWhite"></div><div class="in-vig"></div>
        <div class="grain" style="background-image:url(${this._grain || (this._grain = grainURL())})"></div>`;
      const q = (s) => $(s, sp);
      this.e = { sp, scene: q('#bkScene'), wrap: q('#bkWrap'), bk: q('#bk'), cover: q('#cover'), ch1: q('#ch1'), ch2: q('#ch2'), lock: q('#lock'), hint: q('#inHint'), title: q('#inTitle'), logo: q('#inLogo'), tag: q('#inTag'),
        white: q('#inWhite'), lbT: q('#lbT'), lbB: q('#lbB'), rays: q('.in-rays'), glow: q('.in-glow'), beam: q('.in-beam'), ritual: q('#ritual'), ring: q('#inRing'), ring2: q('#inRing2'), fog: sp.querySelectorAll('.in-fog'), skip: q('#inSkip') };
      const e = this.e;
      gsap.set(e.wrap, { rotationX: 24, rotationZ: -1.5, transformPerspective: 1400 });
      sp.classList.toggle('flat3d', CP.safe3d);
      if (CP.safe3d) {
        gsap.set('.base', { zIndex: 1 }); gsap.set(['#lf1', '#lf2', '#lf3', e.cover], { transformPerspective: 1300 });   // fixed paint order, no depth sorting
      } else {
        gsap.set('#lf3', { z: 4 }); gsap.set('#lf2', { z: 8 }); gsap.set('#lf1', { z: 12 }); gsap.set(e.cover, { z: 16 });   // stacked in real depth, never coplanar
      }
      gsap.set('#cvEye', { scaleY: 0.05, svgOrigin: '164 198' });
      gsap.set(e.title, { opacity: 0 }); gsap.set(e.ritual, { opacity: 0 });
      gsap.set(e.beam, { scaleY: 0, opacity: 0 }); gsap.set(e.rays, { opacity: 0 });
      // idle: the book breathes, the green slit pulses, dust floats
      this.idle = [
        gsap.to(e.wrap, { y: -8, rotationZ: -0.6, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
        gsap.to('#cvSlit', { opacity: 0.35, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
        gsap.to(e.glow, { opacity: 0.55, duration: 1.7, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
        gsap.fromTo(e.hint, { opacity: 0.35 }, { opacity: 1, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
      ];
      gsap.fromTo(e.scene, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' });
      const dust = () => { if (this.started || !$('#splash')) return; CP.fx.emit(U.rnd(0, vp.w), U.rnd(vp.h * 0.2, vp.h), 'spark', 1, { angle: -1.57, spread: 1, min: 6, max: 26, g: -4, lifeMin: 3, lifeMax: 6, sMin: 0.8, sMax: 1.8, drag: 0.1 }); this.timers.push(gsap.delayedCall(0.25, dust)); };
      dust();
      const go = () => this.begin();
      e.scene.addEventListener('pointerdown', go); e.hint.addEventListener('pointerdown', go);
      sp.addEventListener('pointerdown', (ev) => { if (ev.target === e.skip) return; if (!this.started) go(); else if (this.canEnter) this.finish(); });
      e.skip.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); this.skip(); });
    },
    center() { const r = this.e.sp.getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }; },

    /* ------------------------------ the cinematic ------------------------------ */
    begin() {
      if (this.started) return; this.started = true;
      const e = this.e, A = CP.audio, fx = CP.fx, vp = CP.vp, pw = this.pw, c = this.center();
      CP.app.enter({ keep: true });                                      // audio unlock + music
      this.idle.forEach((t) => t.kill()); gsap.killTweensOf(e.hint);
      if (CP.store.data.settings.reduced) { gsap.to(e.hint, { opacity: 0, duration: 0.3 }); this.titleScene(true); return; }
      const tl = (this.tl = gsap.timeline());      // the title scene ends the intro itself (it needs time on screen)
      const at = (t, fn) => tl.call(fn, null, t);
      tl.to(e.hint, { opacity: 0, duration: 0.4 }, 0)
        .to(e.lbT, { height: '9%', duration: 1.2, ease: 'power2.out' }, 0).to(e.lbB, { height: '9%', duration: 1.2, ease: 'power2.out' }, 0)
        .to(e.glow, { opacity: 0.9, scale: 1.25, duration: 1.8, ease: 'power1.in' }, 0);
      at(0.05, () => { A.heart(0.7); A.creak(); A.swell(7.5, 0.1); });
      at(0.9, () => A.heart(0.8)); at(1.5, () => A.heart(0.9));
      // 1) the book fights its chains
      for (let i = 0; i < 9; i++) {
        const t = 0.15 + i * 0.17;
        tl.to(e.wrap, { x: U.rnd(-6, 6), rotationZ: U.rnd(-2.5, 2.5), duration: 0.08, ease: 'none' }, t);
        if (i % 3 === 0) at(t, () => { A.chain(5); U.vibrate(10); });
      }
      tl.to('#cvSlit', { attr: { 'stroke-width': 10 }, duration: 1.4 }, 0).to('#cvGlow', { opacity: 1, duration: 1.4 }, 0);
      tl.to(e.wrap, { x: 0, rotationZ: -1, duration: 0.2 }, 1.8);
      // 2) lightning, the chains snap
      at(1.85, () => { fx.strike({ power: 1.5, x: c.x, y: c.y, shake: false }); A.snap(); this.shake(10, 0.6); U.vibrate([40, 30, 80]); fx.emit(c.x, c.y, 'spark', 40, { min: 160, max: 520, g: 500, lifeMin: 0.5, lifeMax: 1.1 }); });
      tl.to(e.ch1, { x: -vp.w * 0.7, y: -vp.h * 0.15, rotation: '-=140', opacity: 0, duration: 1.1, ease: 'power2.in' }, 1.9)
        .to(e.ch2, { x: vp.w * 0.7, y: -vp.h * 0.1, rotation: '+=140', opacity: 0, duration: 1.1, ease: 'power2.in' }, 1.9)
        .to(e.lock, { y: vp.h * 0.7, rotation: 260, duration: 1.0, ease: 'power2.in' }, 1.9);
      // 3) the eye opens
      tl.to('#cvEye', { scaleY: 1, duration: 0.9, ease: 'power3.out' }, 2.2).to('#cvSlit', { opacity: 0, duration: 0.3 }, 2.2)
        .to('#cvPupil', { attr: { rx: 5, ry: 27 }, duration: 0.5, yoyo: true, repeat: 1 }, 2.9)
        .to('#cvRays', { rotation: 360, svgOrigin: '164 198', duration: 3, ease: 'none' }, 2.2);
      at(2.3, () => { A.whoosh(true, 1.4, 0.28); });
      // 4) the cover opens in 3D
      const open = this.sOpen, shift = (pw / 2) * open;
      tl.to(e.cover, Object.assign({ rotationY: -179, duration: 2.1, ease: 'power2.inOut' }, CP.safe3d ? {} : { z: 4 }), 3.0)
        .to(e.wrap, { x: shift, scale: open, rotationX: 40, y: -pw * 0.04, duration: 2.3, ease: 'power2.inOut' }, 3.0)
        .to(e.rays, { opacity: 1, duration: 1.6 }, 3.3).to(e.beam, { opacity: 1, scaleY: 1, duration: 1.4, ease: 'power2.out' }, 3.8)
        .to(e.lbT, { height: '12%', duration: 2, ease: 'sine.inOut' }, 3).to(e.lbB, { height: '12%', duration: 2, ease: 'sine.inOut' }, 3);
      if (CP.safe3d) tl.set(e.cover, { zIndex: 10 }, 4.05);
      at(3.0, () => { A.creak(); A.whoosh(true, 1.8, 0.3); });
      at(3.5, () => { fx.flock(7); A.thunder(0.9); fx.skyFlash(0.8); });
      // souls pour out of the book
      let souls = 0; const stream = gsap.to({}, { duration: 6.5, repeat: 0, onUpdate: () => { if (++souls % 3 === 0) { const b = this.bookPoint(); fx.emit(b.x, b.y, 'soul', 3, { angle: -1.57, spread: 0.9, min: 50, max: 230, jx: pw * 0.3, jy: 8, g: -40, lifeMin: 1.4, lifeMax: 3, sMin: 3, sMax: 7 }); } } }); tl.add(stream, 3.2);
      // 5) pages flip, the circle wakes
      ['#lf1', '#lf2', '#lf3'].forEach((id, i) => {
        const t = 5.25 + i * 0.5;
        tl.to(id, Object.assign({ rotationY: -179, duration: 0.62, ease: 'power2.inOut' }, CP.safe3d ? {} : { z: [8, 12, 16][i] }), t);
        if (CP.safe3d) tl.set(id, { zIndex: 11 + i }, t + 0.31);   // once a page is past the spine it lies on the left: later pages on top
        at(t, () => { A.flip(); const b = this.bookPoint(); fx.emit(b.x, b.y, 'paper', 10, { angle: -1.2 + i * 0.3, spread: 0.8, min: 120, max: 420, g: 260, jx: pw * 0.3, lifeMin: 0.8, lifeMax: 1.6, sMin: 3, sMax: 6 }); });
      });
      tl.to(e.ritual, { opacity: 1, duration: 1.0 }, 6.5).fromTo(e.ritual, { rotation: -40, scale: 0.7 }, { rotation: 0, scale: 1, duration: 1.4, ease: 'power3.out' }, 6.5);
      at(6.6, () => { A.heart(1); fx.emit(this.bookPoint().x, this.bookPoint().y, 'soul', 26, { min: 80, max: 380, g: -60, lifeMin: 1.2, lifeMax: 2.4 }); });
      at(7.1, () => A.heart(1));
      // 6) dive into the circle
      at(7.3, () => {
        const r = $('.base', this.e.sp).getBoundingClientRect(), s = this.e.sp.getBoundingClientRect();
        this.e.scene.style.transformOrigin = `${r.left - s.left + r.width / 2}px ${r.top - s.top + r.height / 2}px`;
        A.whoosh(true, 1.8, 0.4);
      });
      tl.to(e.scene, { scale: 10, duration: 1.7, ease: 'power3.in' }, 7.35)
        .to(e.scene, { opacity: 0.35, duration: 1.5, ease: 'power2.in' }, 7.5)
        .to(e.glow, { opacity: 1, scale: 2.2, duration: 1.5 }, 7.35)
        .to(e.white, { opacity: 1, duration: 0.35, ease: 'power2.in', background: '#eafff0' }, 8.75);
      // 7) the title slams in
      at(9.0, () => this.titleScene(false));
    },
    bookPoint() { const r = $('.base', this.e.sp).getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect(); return { x: r.left - a.left + r.width / 2 - this.pw * 0.45, y: r.top - a.top + r.height * 0.42 }; },
    shake(amp, dur) { const sp = this.e.sp, n = Math.round(dur / 0.04); const tl = gsap.timeline(); for (let i = 0; i < n; i++) { const k = 1 - i / n; tl.to(sp, { x: U.rnd(-amp, amp) * k, y: U.rnd(-amp, amp) * k, duration: 0.04 }); } tl.to(sp, { x: 0, y: 0, duration: 0.05 }); },

    titleScene(quick) {
      const e = this.e, A = CP.audio, fx = CP.fx, vp = CP.vp, c = { x: vp.w / 2, y: vp.h / 2 };
      gsap.set(e.scene, { display: 'none' }); gsap.set([e.rays, e.beam], { opacity: 0 });
      gsap.to(e.lbT, { height: 0, duration: 1.2 }); gsap.to(e.lbB, { height: 0, duration: 1.2 });
      gsap.to(e.glow, { opacity: 0.35, scale: 1, duration: 1.5 });
      gsap.set(e.title, { opacity: 1 });
      this.canEnter = false;
      gsap.delayedCall(quick ? 1.6 : 2.6, () => { if (this.ended) return; this.canEnter = true; e.hint.textContent = 'TAP TO ENTER'; e.hint.classList.add('enter'); gsap.killTweensOf(e.hint); gsap.fromTo(e.hint, { opacity: 0 }, { opacity: 1, duration: 0.8 }); gsap.to(e.hint, { opacity: 0.45, duration: 1.1, yoyo: true, repeat: -1, delay: 0.8, ease: 'sine.inOut' }); });
      if (quick) { A.startMusic(); gsap.fromTo(e.logo, { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.8 }); gsap.fromTo(e.tag, { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.4 }); gsap.delayedCall(5, () => this.finish()); return; }
      gsap.delayedCall(0.6, () => A.startMusic()); A.boom(); fx.strike({ power: 1.7, x: c.x, y: c.y * 0.9, silent: true, shake: false }); this.shake(14, 0.7); U.vibrate([60, 40, 120]);
      gsap.to(e.white, { opacity: 0, duration: 0.9, ease: 'power2.out', delay: 0.05 });
      gsap.fromTo(e.logo, { scale: 3.4, opacity: 0, filter: 'blur(22px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.62, ease: 'expo.out' });
      gsap.fromTo(e.logo, { rotation: -3 }, { rotation: 0, duration: 1.2, ease: 'elastic.out(1,.4)', delay: 0.1 });
      [[e.ring, 0], [e.ring2, 0.18]].forEach(([r, d]) => gsap.fromTo(r, { width: 24, height: 24, xPercent: -50, yPercent: -50, opacity: 0.95 }, { width: Math.max(vp.w, vp.h) * 1.5, height: Math.max(vp.w, vp.h) * 1.5, opacity: 0, duration: 1.3, ease: 'power2.out', delay: d }));
      gsap.fromTo(e.tag, { opacity: 0, y: 14, letterSpacing: '0.35em' }, { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 1.2, delay: 0.9, ease: 'power2.out' });
      gsap.to(e.logo, { filter: 'drop-shadow(0 0 22px rgba(255,50,50,.9))', duration: 0.8, yoyo: true, repeat: 3, ease: 'sine.inOut', delay: 0.8 });
      fx.emit(c.x, c.y, 'ember', 70, { min: 120, max: 620, g: -80, lifeMin: 1.4, lifeMax: 3, sMin: 2, sMax: 6, jx: vp.w * 0.3, jy: 40 });
      fx.emit(c.x, c.y, 'paper', 36, { min: 200, max: 700, g: 300, lifeMin: 1.2, lifeMax: 2.4, jx: 60 });
      gsap.delayedCall(0.5, () => fx.strike({ power: 1, x: vp.w * 0.15, y: vp.h * 0.5, shake: false }));
      gsap.delayedCall(1.1, () => { fx.strike({ power: 1.1, x: vp.w * 0.86, y: vp.h * 0.45, shake: false }); fx.flock(6); });
      for (let i = 0; i < 32; i++) gsap.delayedCall(0.4 + i * 0.22, () => { if (this.ended) return; fx.emit(U.rnd(0, vp.w), vp.h + 4, 'ember', 3, { angle: -1.57, spread: 0.5, min: 80, max: 260, g: -50, lifeMin: 2, lifeMax: 4, sMin: 1.5, sMax: 4 }); });
      gsap.to(e.logo, { y: -7, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.4 });          // the title floats while it is on screen
      gsap.delayedCall(8, () => this.finish());                                                              // ~8 s to read the title (tap to enter earlier)
    },
    finish() {
      if (this.ended) return; this.ended = true;
      this.timers.forEach((t) => t.kill());
      CP.audio.creak();
      CP.app.leaveSplash(0, 1.3);
      CP.fx.flock(3);
    },
    skip() {
      if (this.ended) return;
      if (!this.started) { this.started = true; CP.app.enter({ keep: true }); this.idle.forEach((t) => t.kill()); }
      if (this.tl) this.tl.kill(); gsap.killTweensOf('#splash *'); CP.audio.startMusic();
      this.ended = true; CP.audio.click();
      CP.app.leaveSplash(0, 0.55);
    },
  });
})();
