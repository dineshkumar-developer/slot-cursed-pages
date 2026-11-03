/* ==========================================================================
   math.js — the whole game maths, with NO browser code in it, so the very same
   file runs in the page and in tools/simulate.js (node): the RTP you simulate
   is the RTP you play.

   5 reels x 3 rows, 20 fixed paylines, left to right.
   Wild (black cat)  : reels 2-4 only, replaces every symbol except the Scatter.
   Scatter (grimoire): pays anywhere (x total bet) and 3+ start FREE SPINS.
   Lightning Wild    : in the base game a bolt may strike 1-2 reels (2-4) and turn
                       the whole reel wild before the win is counted.
   Free spins        : curse multiplier x1 -> x10 (+1 after every winning spin),
                       cat wilds stay haunted for one more spin, retriggers add spins.
   All money is integer credits (bet is always a multiple of 20 = 20 lines).
   ========================================================================== */
(function (root) {
  'use strict';
  const M = {};

  /* symbol ids */
  const S = { J: 0, Q: 1, K: 2, A: 3, BAT: 4, CANDLE: 5, PUMPKIN: 6, GHOST: 7, SKULL: 8, DOLL: 9, WILD: 10, SCAT: 11 };
  const NAMES = ['J', 'Q', 'K', 'A', 'BAT', 'CANDLE', 'PUMPKIN', 'GHOST', 'SKULL', 'DOLL', 'WILD', 'SCATTER'];
  M.S = S; M.NAMES = NAMES;
  M.REELS = 5; M.ROWS = 3; M.NLINES = 20;

  /* pays in multiples of the LINE bet, index = number of symbols in a row */
  M.PAYS = {
    [S.J]:       [0, 0, 0, 6, 18, 45],
    [S.Q]:       [0, 0, 0, 6, 18, 45],
    [S.K]:       [0, 0, 0, 9, 24, 70],
    [S.A]:       [0, 0, 0, 9, 24, 70],
    [S.BAT]:     [0, 0, 0, 14, 45, 130],
    [S.CANDLE]:  [0, 0, 0, 18, 55, 170],
    [S.PUMPKIN]: [0, 0, 0, 24, 85, 280],
    [S.GHOST]:   [0, 0, 0, 35, 115, 440],
    [S.SKULL]:   [0, 0, 0, 48, 170, 650],
    [S.DOLL]:    [0, 0, 0, 70, 280, 1100],
  };
  /* scatter pays x TOTAL bet, free spins awarded, extra spins on retrigger */
  M.SCAT_PAY = [0, 0, 0, 2, 10, 50];
  M.FS_AWARD = [0, 0, 0, 8, 12, 20];
  M.FS_RETRIGGER = [0, 0, 0, 5, 8, 12];
  M.FS_MAX_SPINS = 100;
  M.MULT_MAX = 5;
  M.MAX_WIN_X = 5000;           // cap, x total bet, for one whole round
  M.BUY_COST_X = 80;            // BUY FREE SPINS costs this x bet (3 scatters guaranteed)
  M.LIGHTNING = { chance: 0.030, two: 0.18 };     // base game bolt: chance per spin, chance it is two reels
  M.FS_LIGHTNING = { chance: 0.0, two: 0 };

  /* 20 paylines: row index (0 top, 1 middle, 2 bottom) for reels 1..5 */
  M.LINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
    [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
    [1,1,0,1,1],[1,1,2,1,1],[0,0,1,2,2],[2,2,1,0,0],[0,2,0,2,0],
  ];

  /* ---------------- reel strips (built once, identical on every device) ---------------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  //            J  Q  K  A BAT CAN PUM GHO SKU DOL WLD SCT
  M.COUNTS = [
    [ 9, 9, 8, 8, 7, 6, 5, 4, 3, 2, 0, 2],   // reel 1
    [ 8, 8, 8, 7, 7, 6, 5, 4, 3, 2, 3, 2],   // reel 2
    [ 8, 8, 7, 7, 7, 6, 5, 4, 3, 2, 3, 2],   // reel 3
    [ 8, 8, 8, 7, 7, 6, 5, 4, 3, 2, 3, 1],   // reel 4
    [ 9, 9, 8, 8, 7, 6, 5, 4, 3, 2, 0, 2],   // reel 5
  ];
  function buildStrip(counts, seed) {
    const rnd = mulberry(seed);
    const bag = [];
    counts.forEach((n, sym) => { for (let i = 0; i < n; i++) bag.push(sym); });
    const L = bag.length;
    for (let tries = 0; tries < 20000; tries++) {
      for (let i = L - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      let ok = true;
      for (let i = 0; i < L && ok; i++) {
        const a = bag[i], b = bag[(i + 1) % L], c = bag[(i + 2) % L];
        if (a === b) ok = false;                                          // no identical neighbours
        if (a === S.SCAT && (b === S.SCAT || c === S.SCAT)) ok = false;  // never two scatters in one window
        if (a === S.WILD && (b === S.WILD || c === S.WILD)) ok = false;  // never two wilds in one window
        if (a >= S.PUMPKIN && a <= S.DOLL && c === a) ok = false;        // no high symbol twice in one window
      }
      if (ok) return bag.slice();
    }
    return bag.slice();
  }
  M.STRIPS = M.COUNTS.map((c, i) => buildStrip(c, 1301 + i * 97));

  /* ---------------- RNG ---------------- */
  M.cryptoRng = function () {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (!c) return Math.random;
    const buf = new Uint32Array(64); let i = 64;
    return function () { if (i >= 64) { c.getRandomValues(buf); i = 0; } return buf[i++] / 4294967296; };
  };

  /* ---------------- one spin ---------------- */
  /** returns { stops:[5], grid:[5][3] } */
  M.spinReels = function (rng, forceScatters) {
    const stops = [], grid = [];
    for (let r = 0; r < M.REELS; r++) {
      const st = M.STRIPS[r], L = st.length;
      const p = Math.floor(rng() * L);
      stops.push(p);
      grid.push([st[p], st[(p + 1) % L], st[(p + 2) % L]]);
    }
    if (forceScatters) {                               // BUY FEATURE: scatters on reels 1, 3 and 5
      [0, 2, 4].forEach((r) => {
        const st = M.STRIPS[r], L = st.length, at = [];
        st.forEach((s, i) => { if (s === S.SCAT) at.push(i); });
        const p = at[Math.floor(rng() * at.length)];
        const pos = ((p - Math.floor(rng() * 3)) % L + L) % L;
        stops[r] = pos; grid[r] = [st[pos], st[(pos + 1) % L], st[(pos + 2) % L]];
      });
      [1, 3].forEach((r) => {                           // reels 2 and 4 must not add a scatter by accident
        for (let k = 0; k < 40 && grid[r].includes(S.SCAT); k++) {
          const st = M.STRIPS[r], L = st.length, p = Math.floor(rng() * L);
          stops[r] = p; grid[r] = [st[p], st[(p + 1) % L], st[(p + 2) % L]];
        }
      });
    }
    return { stops, grid };
  };

  /** pay evaluation. grid is [reel][row]. bet = total bet in credits. */
  M.evaluate = function (grid, bet) {
    const lineBet = bet / M.NLINES;
    const lineWins = [];
    for (let li = 0; li < M.NLINES; li++) {
      const row = M.LINES[li];
      let base = -1;
      for (let r = 0; r < M.REELS; r++) {
        const s = grid[r][row[r]];
        if (s === S.WILD) continue;
        base = s; break;
      }
      if (base < 0 || base === S.SCAT) continue;
      let n = 0;
      for (let r = 0; r < M.REELS; r++) {
        const s = grid[r][row[r]];
        if (s === base || s === S.WILD) n++; else break;
      }
      const pay = M.PAYS[base][n];
      if (pay > 0) {
        const cells = []; for (let r = 0; r < n; r++) cells.push([r, row[r]]);
        lineWins.push({ line: li, sym: base, count: n, win: pay * lineBet, cells });
      }
    }
    let scat = 0; const scatCells = [];
    for (let r = 0; r < M.REELS; r++) for (let k = 0; k < M.ROWS; k++) if (grid[r][k] === S.SCAT) { scat++; scatCells.push([r, k]); }
    const scatterWin = M.SCAT_PAY[Math.min(5, scat)] * bet;
    let lines = 0; lineWins.forEach((w) => (lines += w.win));
    return { lineWins, lineTotal: lines, scatterCount: scat, scatterCells: scatCells, scatterWin };
  };

  /** lightning wilds: returns the reels that were struck (only reels 2-4, i.e. index 1..3) */
  M.rollLightning = function (rng, cfg) {
    if (rng() >= cfg.chance) return [];
    const pool = [1, 2, 3];
    const first = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const out = [first];
    if (rng() < cfg.two) out.push(pool[Math.floor(rng() * pool.length)]);
    return out.sort();
  };

  /**
   * ONE complete spin with all features. `ctx` is the mutable round state:
   *   { fs: bool, mult, sticky: [[reel,row],...] (cells that stay wild this spin) }
   * returns the full result the UI animates.
   */
  M.resolveSpin = function (rng, bet, ctx, opts) {
    opts = opts || {};
    const sp = opts.forceGrid ? { stops: [0, 0, 0, 0, 0], grid: opts.forceGrid.map((c) => c.slice()) } : M.spinReels(rng, opts.forceScatters);   // forceGrid: tests / demos only
    const baseGrid = sp.grid.map((c) => c.slice());
    const grid = sp.grid.map((c) => c.slice());
    const stickyIn = (ctx.sticky || []).map((c) => c.slice());       // haunted wilds from the previous free spin
    stickyIn.forEach(([r, k]) => { grid[r][k] = S.WILD; });
    const lcfg = ctx.fs ? M.FS_LIGHTNING : M.LIGHTNING;
    const bolts = opts.forceBolts ? opts.forceBolts.slice() : opts.noLightning ? [] : M.rollLightning(rng, lcfg);
    bolts.forEach((r) => { for (let k = 0; k < M.ROWS; k++) grid[r][k] = S.WILD; });

    const ev = M.evaluate(grid, bet);
    const mult = ctx.fs ? ctx.mult : 1;
    const win = (ev.lineTotal + ev.scatterWin) * mult;
    const res = {
      stops: sp.stops, baseGrid, grid, stickyIn, bolts,
      lineWins: ev.lineWins, lineTotal: ev.lineTotal * mult, scatterCount: ev.scatterCount, scatterCells: ev.scatterCells,
      scatterWin: ev.scatterWin * mult, mult, win, fs: !!ctx.fs,
      fsAward: 0, fsAwardKind: '', stickyOut: [], multNext: mult,
    };
    if (ctx.fs) {
      const next = [];                                                // cat wilds that were physically on the reels haunt the next spin
      for (let r = 1; r <= 3; r++) for (let k = 0; k < M.ROWS; k++) if (grid[r][k] === S.WILD) next.push([r, k]);
      res.stickyOut = next;
      if (ev.scatterCount >= 3) { res.fsAward = M.FS_RETRIGGER[Math.min(5, ev.scatterCount)]; res.fsAwardKind = 'retrigger'; }
      res.multNext = win > 0 ? Math.min(M.MULT_MAX, ctx.mult + 1) : ctx.mult;
    } else if (ev.scatterCount >= 3) {
      res.fsAward = M.FS_AWARD[Math.min(5, ev.scatterCount)]; res.fsAwardKind = 'trigger';
    }
    return res;
  };

  /** play a whole round (spin + free spins) without any animation: used by the simulator */
  M.playRound = function (rng, bet, opts) {
    opts = opts || {};
    const cap = M.MAX_WIN_X * bet;
    const r0 = M.resolveSpin(rng, bet, { fs: false, mult: 1, sticky: [] }, opts);
    const base = r0.win;
    let fsTotal = 0, fsSpins = 0, capped = false;
    const triggered = r0.fsAward > 0;
    if (triggered) {
      let left = r0.fsAward, total = left;
      const ctx = { fs: true, mult: 1, sticky: [] };
      while (left > 0) {
        left--; fsSpins++;
        const r = M.resolveSpin(rng, bet, ctx);
        fsTotal += r.win;
        if (r.fsAward > 0 && total < M.FS_MAX_SPINS) { const add = Math.min(r.fsAward, M.FS_MAX_SPINS - total); left += add; total += add; }
        ctx.mult = r.multNext; ctx.sticky = r.stickyOut;
        if (base + fsTotal >= cap) { capped = true; break; }
      }
    }
    let total = base + fsTotal;
    if (total > cap) { total = cap; capped = true; }
    return { bet, base, fs: fsTotal, total, triggered, fsSpins, capped, bolts: r0.bolts.length };
  };

  /** win tiers by total win / bet */
  M.TIERS = [
    { id: 'epic', min: 50, name: 'EPIC WIN' },
    { id: 'mega', min: 25, name: 'MEGA WIN' },
    { id: 'big', min: 10, name: 'BIG WIN' },
  ];
  M.tierOf = function (win, bet) {
    const x = win / bet;
    for (const t of M.TIERS) if (x >= t.min) return t;
    return null;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M; else root.CPMath = M;
})(typeof window !== 'undefined' ? window : globalThis);
