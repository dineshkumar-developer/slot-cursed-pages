/* ==========================================================================
   core.js — namespace, small helpers, config, saved data and the viewport.
   The viewport module is the ONE place that knows the real screen size: every
   layout (reels, frame, background, canvas) re-runs from CP.onViewport().
   ========================================================================== */
(function () {
  'use strict';
  const CP = (window.CP = window.CP || {});

  /* ------------------------------ helpers ------------------------------ */
  const U = (CP.U = {
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rnd: (a = 0, b = 1) => a + Math.random() * (b - a),
    rndi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    fmt: (n) => Math.round(n).toLocaleString('en-US'),
    el(tag, cls, parent, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html !== undefined) e.innerHTML = html;
      if (parent) parent.appendChild(e);
      return e;
    },
    $: (s, r) => (r || document).querySelector(s),
    $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
    wait: (s) => new Promise((res) => gsap.delayedCall(s, res)),
    seeded(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    vibrate(p) { try { if (CP.store.data.settings.vibration && !CP.store.data.settings.reduced) navigator.vibrate && navigator.vibrate(p); } catch (e) {} },
  });

  /* ------------------------------ config ------------------------------ */
  CP.CFG = {
    startBalance: 10000,
    bets: [20, 40, 60, 100, 200, 400, 600, 1000, 2000],
    defaultBetIdx: 3,
    refill: 10000,
    autoOptions: [10, 25, 50, 100, 250, 500],
    historyMax: 40,
    // time scale per speed mode: 0 normal, 1 quick, 2 turbo
    speed: [
      { name: 'NORMAL', stagger: 0.26, spin: 1.15, stopGap: 0.0, resultHold: 1 },
      { name: 'QUICK',  stagger: 0.14, spin: 0.7,  stopGap: 0.0, resultHold: 0.65 },
      { name: 'TURBO',  stagger: 0.05, spin: 0.38, stopGap: 0.0, resultHold: 0.35 },
    ],
  };

  /* ------------------------------ saved data ------------------------------ */
  const KEY = 'cursed-pages-slot-v1';
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const defaults = () => ({
    balance: CP.CFG.startBalance,
    betIdx: CP.CFG.defaultBetIdx,
    settings: {
      music: true, musicVol: 70, sfx: true, sfxVol: 85, ambience: true,
      shake: true, flash: true, lightning: true, vibration: true, reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
      quality: coarse || cores <= 4 ? 'medium' : 'high',
      speed: 0, leftHanded: false, showLines: true, spaceSpin: true, introSkip: false,
    },
    stats: { spins: 0, wagered: 0, won: 0, biggest: 0, bigX: 0, big: 0, mega: 0, epic: 0, fsTriggers: 0, bestMult: 1, lightning: 0 },
    history: [],
  });
  function load() {
    const d = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return { ...d, ...p, settings: { ...d.settings, ...(p.settings || {}) }, stats: { ...d.stats, ...(p.stats || {}) }, history: Array.isArray(p.history) ? p.history : [] };
      }
    } catch (e) { /* private mode / bad json */ }
    return d;
  }
  let saveT = 0;
  CP.store = {
    data: load(),
    save(now) {
      clearTimeout(saveT);
      const go = () => { try { localStorage.setItem(KEY, JSON.stringify(CP.store.data)); } catch (e) {} };
      if (now) go(); else saveT = setTimeout(go, 300);
    },
    reset() { CP.store.data = defaults(); CP.store.save(true); },
    get s() { return CP.store.data.settings; },
  };
  addEventListener('pagehide', () => CP.store.save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) CP.store.save(true); });

  /* quality helper: how much of every effect to spend */
  CP.fxScale = () => {
    const s = CP.store.data.settings;
    if (s.reduced) return 0.25;
    return s.quality === 'low' ? 0.35 : s.quality === 'medium' ? 0.7 : 1;
  };

  /* ------------------------------ viewport ------------------------------ */
  // reference worlds: portrait 430 x 800, landscape 860 x 420 (u = 1 there)
  const subs = new Set();
  const vp = (CP.vp = { w: 1, h: 1, orient: 'portrait', u: 1, dpr: 1, safe: { t: 0, r: 0, b: 0, l: 0 } });
  let raf = 0, timers = [];
  function measure() {
    const app = document.getElementById('app');
    const r = app ? app.getBoundingClientRect() : null;
    const vv = window.visualViewport;
    const w = Math.round(r && r.width ? r.width : vv ? vv.width : innerWidth);
    const h = Math.round(r && r.height ? r.height : vv ? vv.height : innerHeight);
    const orient = w >= h * 1.08 ? 'landscape' : 'portrait';
    const u = U.clamp(orient === 'portrait' ? Math.min(w / 430, h / 800) : Math.min(w / 860, h / 420), 0.55, 1.9);
    return { w, h, orient, u, dpr: Math.min(2, window.devicePixelRatio || 1) };
  }
  function apply(m) {
    Object.assign(vp, m);
    const app = document.getElementById('app');
    if (!app) return;
    app.dataset.orient = vp.orient;
    app.dataset.size = vp.orient === 'portrait' ? (vp.w < 360 || vp.h < 620 ? 's' : vp.w > 700 ? 'l' : 'm') : (vp.h < 340 ? 's' : vp.h > 700 ? 'l' : 'm');
    app.style.setProperty('--u', vp.u.toFixed(4));
    // landscape: the game UI lives in a centred 'canvas' no wider than height x landscape_max_ratio (js/config.js); the background still fills the screen
    const ratio = Math.max(1.6, +window.landscape_max_ratio || 2.2);
    app.style.setProperty('--cw', (vp.orient === 'landscape' ? Math.min(vp.w, Math.round(vp.h * ratio)) : vp.w) + 'px');
    app.style.setProperty('--vw', vp.w + 'px');
    app.style.setProperty('--vh', vp.h + 'px');
  }
  function check(force) {
    const m = measure();
    if (!force && Math.abs(m.w - vp.w) < 2 && Math.abs(m.h - vp.h) < 2 && m.dpr === vp.dpr) return;
    const prev = { ...vp };
    apply(m);
    subs.forEach((f) => { try { f(vp, prev); } catch (e) { console.error(e); } });
  }
  CP.onViewport = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  CP.viewportInit = () => { check(true); };
  // phones report their final size late after a rotation: measure again as it settles
  function schedule() {
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => check());
    timers.forEach(clearTimeout);
    timers = [setTimeout(check, 120), setTimeout(check, 350), setTimeout(check, 800)];
  }
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', schedule);

  // never let the page zoom, scroll or rubber-band
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('#app')) e.preventDefault(); });
  document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
})();
