/* ==========================================================================
   reels.js — the five reels. Every reel scrolls a strip of paper cells:
     * while spinning it loops endlessly (cells are recycled from the bottom to the top)
     * stop(i) rebuilds the strip so the real result lands exactly where the loop is,
       then decelerates onto it with a little paper bounce.
   Reels are independent, so the game can hold back reel 4/5 for the scatter tension.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, M = window.CPMath, U = CP.U;
  const SPEED = [{ v: 19, land: 0.62, dist: 7 }, { v: 25, land: 0.42, dist: 6 }, { v: 33, land: 0.3, dist: 5 }];

  const R = (CP.reels = {
    cell: 80, reels: [], spinning: false, haunt: null,
    init() {
      this.el = document.getElementById('reels');
      this.board = document.getElementById('board');
      this.el.innerHTML = '';
      this.reels = [];
      for (let i = 0; i < M.REELS; i++) {
        const el = U.el('div', 'reel', this.el), strip = U.el('div', 'strip', el);
        const rv = { i, el, strip, mode: 'rest', y: 0, phase: 0, items: [] };
        for (let k = 0; k < 5; k++) rv.items.push(this.mkCell(strip, this.randSym(i)));
        this.reels.push(rv);
      }
      this.haunt = U.el('div', 'haunt', this.el); this.haunt.style.cssText = 'position:absolute;inset:0;z-index:3;pointer-events:none';
      gsap.ticker.add((t, dt) => this.tick(dt / 1000));
    },
    randSym(i) { const st = M.STRIPS[i]; return st[(Math.random() * st.length) | 0]; },
    mkCell(parent, id) { const c = U.el('div', 'cell', parent); this.setCell(c, id); return c; },
    setCell(c, id, live) {
      c.classList.remove('win', 'gwin');
      c.dataset.s = id; c.style.setProperty('--idl', (-Math.random() * 8).toFixed(2) + 's'); c.style.setProperty('--idr', (0.85 + Math.random() * 0.35).toFixed(2)); c.className = c.className.replace(/\b(scat|wild)\b/g, '').trim() + (id === M.S.SCAT ? ' scat' : id === M.S.WILD ? ' wild' : '');
      c.innerHTML = live ? CP.symbolInline(id) : CP.symbolHTML(id);
    },
    layout(cell) {
      this.cell = cell;
      this.reels.forEach((rv) => { if (rv.mode === 'rest') gsap.set(rv.strip, { y: -cell }); });
      this.layoutHaunt();
    },
    /** put an exact 3x5 grid on the reels (no animation) */
    showGrid(grid) {
      this.reels.forEach((rv, i) => {
        this.resetStrip(rv);
        for (let k = 0; k < 3; k++) this.setCell(rv.items[k + 1], grid[i][k]);
        const st = M.STRIPS[i]; this.setCell(rv.items[0], this.randSym(i)); this.setCell(rv.items[4], this.randSym(i));
      });
    },
    resetStrip(rv) {
      rv.strip.querySelectorAll('.cell').forEach((c, idx) => { if (idx >= 5) c.remove(); });
      while (rv.strip.children.length > 5) rv.strip.removeChild(rv.strip.lastChild);
      rv.items = Array.from(rv.strip.children);
      while (rv.items.length < 5) rv.items.push(this.mkCell(rv.strip, this.randSym(rv.i)));
      gsap.killTweensOf(rv.strip); gsap.set(rv.strip, { y: -this.cell }); rv.mode = 'rest'; rv.strip.classList.remove('blur'); rv.el.classList.remove('moving');
    },
    cellEl(r, k) { return this.reels[r].items[k + 1]; },

    /* ---------- spinning ---------- */
    start(speedIdx) {
      this.sp = SPEED[speedIdx] || SPEED[0]; this.spinning = true;
      this.clearWins();
      this.reels.forEach((rv, i) => this.startReel(rv, i));
    },
    startReel(rv, i) {
      if (rv.mode === 'spin') return;
      this.resetStrip(rv);
      // loop strip of 8 cells (the 5 resting ones are reused + 3 new)
      const cur = rv.items.map((c) => c);
      while (cur.length < 8) cur.push(this.mkCell(rv.strip, this.randSym(i)));
      rv.items = cur; rv.mode = 'spin'; rv.phase = 0; rv.t0 = 0; rv.el.classList.add('moving');
      rv.items.forEach((c) => c.classList.remove('win'));
      // start with a short anticipation dip (paper being pulled up) then accelerate
      rv.acc = 0; rv.base = -(rv.items.length - 3) * this.cell;       // position where items[len-3..len-1] are visible
      // keep what is visible now: current rows are items[1..3]; move them to the bottom of the loop
      const vis = [rv.items[1], rv.items[2], rv.items[3]];
      vis.forEach((c) => rv.strip.appendChild(c));
      rv.items = Array.from(rv.strip.children);
      if (CP.store.data.settings.quality === 'high' && !CP.store.data.settings.reduced) rv.strip.classList.add('blur');
    },
    tick(dt) {
      if (!this.spinning) return;
      const cell = this.cell;
      this.reels.forEach((rv) => {
        if (rv.mode !== 'spin') return;
        rv.acc = Math.min(1, rv.acc + dt / 0.18);
        rv.phase += this.sp.v * cell * dt * (0.25 + 0.75 * rv.acc);
        while (rv.phase >= cell) {                         // one cell passed: recycle the bottom cell to the top
          rv.phase -= cell;
          const last = rv.items.pop(); this.setCell(last, this.randSym(rv.i)); rv.strip.insertBefore(last, rv.strip.firstChild); rv.items.unshift(last);
        }
        gsap.set(rv.strip, { y: -(rv.items.length - 3) * cell + rv.phase });
      });
    },
    /** land reel i on `rows` (3 symbol ids top->bottom). `stopIdx` = strip index of rows[0], for natural fillers. */
    stop(i, rows, stopIdx, opts = {}) {
      return new Promise((resolve) => {
        const rv = this.reels[i], cell = this.cell, sp = this.sp || SPEED[0];
        if (rv.mode !== 'spin') { this.setRows(rv, rows); resolve(); return; }
        const quick = !!opts.quick, dist = quick ? 3 : sp.dist;
        // the four cells the player sees right now (one partly above) become the bottom of the landing strip
        const n = rv.items.length, cur = [rv.items[n - 4], rv.items[n - 3], rv.items[n - 2], rv.items[n - 1]];
        const curIds = cur.map((c) => +c.dataset.s), phase = rv.phase;
        // rebuild: [above, r0, r1, r2, below, fillers..., cur0..cur3]
        const st = M.STRIPS[i], L = st.length;
        const ids = [st[(stopIdx - 1 + L) % L], rows[0], rows[1], rows[2], st[(stopIdx + 3) % L]];
        for (let j = 0; j < dist; j++) ids.push(st[(stopIdx + 4 + j) % L]);
        curIds.forEach((id) => ids.push(id));
        rv.strip.innerHTML = ''; rv.items = ids.map((id) => this.mkCell(rv.strip, id));
        const total = ids.length;
        const y0 = -cell + phase - (total - 4) * cell;
        gsap.set(rv.strip, { y: y0 }); rv.mode = 'land';
        rv.strip.classList.remove('blur');
        gsap.to(rv.strip, { y: -cell, duration: opts.dur || (quick ? 0.22 : sp.land), ease: quick ? 'power2.out' : 'back.out(1.25)', onComplete: () => {
          this.setRows(rv, rows); rv.mode = 'rest'; resolve();
        } });
        if (!opts.keepTense) rv.el.classList.remove('tense');
      }).then(() => { if (this.reels.every((r) => r.mode !== 'spin' && r.mode !== 'land')) this.spinning = false; });
    },
    setRows(rv, rows) {
      this.resetStrip(rv);
      for (let k = 0; k < 3; k++) this.setCell(rv.items[k + 1], rows[k]);
      this.setCell(rv.items[0], this.randSym(rv.i)); this.setCell(rv.items[4], this.randSym(rv.i));
    },
    isSpinning() { return this.reels.some((r) => r.mode === 'spin' || r.mode === 'land'); },

    /* ---------- tension / lightning / haunted wilds ---------- */
    tense(i, on) { this.reels[i].el.classList.toggle('tense', !!on); },
    struck(r) {
      const rv = this.reels[r]; rv.el.classList.remove('struck'); void rv.el.offsetWidth; rv.el.classList.add('struck');
      for (let k = 0; k < 3; k++) {
        const c = this.cellEl(r, k); this.setCell(c, M.S.WILD);
        gsap.fromTo(c.firstChild, { scale: 0.2, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.5, delay: 0.08 * k, ease: 'back.out(2.2)' });
      }
      setTimeout(() => rv.el.classList.remove('struck'), 600);
    },
    cellBox(r, k) { const c = this.cell; return { x: r * c, y: k * c, w: c, h: c }; },
    layoutHaunt() { Array.from(this.haunt.children).forEach((d) => { const p = d._pos; d.style.cssText = `position:absolute;left:${p[0] * this.cell}px;top:${p[1] * this.cell}px;width:${this.cell}px;height:${this.cell}px`; }); },
    /** sticky (haunted) wilds: wilds that are already on the board are left completely alone; only new ones are added and
     *  ones that are no longer wanted are removed. Nothing is rebuilt or re-animated between spins, so the wilds never blink. */
    setHaunted(cells) {
      const want = new Map(cells.map(([r, k]) => [r + ',' + k, [r, k]]));
      Array.from(this.haunt.children).forEach((d) => { const key = d._pos.join(','); if (want.has(key)) want.delete(key); else d.remove(); });
      want.forEach(([r, k]) => {
        // a new sticky wild is created exactly on top of the wild that just landed there, so no entrance animation is needed
        const d = U.el('div', 'cell haunted', this.haunt); d._pos = [r, k]; this.setCell(d, M.S.WILD); d.classList.add('haunted');
        d.style.cssText = `position:absolute;left:${r * this.cell}px;top:${k * this.cell}px;width:${this.cell}px;height:${this.cell}px`;
      });
    },
    clearHaunted() { this.haunt.innerHTML = ''; },

    /* ---------- win presentation ---------- */
    /** take a winning cell apart again: put the symbol back where it was and drop the glow copies */
    unwin(c) {
      const w = c.querySelector(':scope > .winwrap');
      if (w) { const sym = w.querySelector('.sym'); if (sym) c.insertBefore(sym, w); w.remove(); }
      c.classList.remove('win', 'gwin');
    },
    clearWins() {
      this.el.classList.remove('dim');
      this.el.querySelectorAll('.cell.win').forEach((c) => this.unwin(c));
    },
    /** show exactly these cells as winning. Cells that are already winning are left alone (their animation keeps running,
     *  nothing is rebuilt), so cycling through the lines never flickers or restarts a symbol. */
    markWins(cells, dim) {
      const want = new Set(cells.map(([r, k]) => r + ',' + k));
      this.reels.forEach((rv, r) => [0, 1, 2].forEach((k) => { const c = this.cellEl(r, k); if (c && c.classList.contains('win') && !want.has(r + ',' + k)) this.unwin(c); }));
      this.el.classList.toggle('dim', !!dim);
      cells.forEach(([r, k]) => {
        const c = this.cellEl(r, k); if (!c || c.classList.contains('win')) return;
        const sym = c.querySelector('.sym'); if (!sym) return;
        const id = +c.dataset.s, green = id === M.S.SCAT || id === M.S.GHOST || id === M.S.WILD, src = sym.getAttribute('src') || '';
        if (green) c.classList.add('gwin');
        // ONE wrapper carries the win animation; the symbol, its outline-glow copy and its light-sweep copy all live inside it,
        // so they can never drift apart. The glow copy is the symbol's own artwork, so it follows the real outline.
        const w = document.createElement('div'); w.className = 'winwrap';
        c.insertBefore(w, sym);
        w.insertAdjacentHTML('beforeend', `<img class="gl-halo" src="${src}" alt="" draggable="false">`);
        w.appendChild(sym);
        w.insertAdjacentHTML('beforeend', `<img class="gl-shine" src="${src}" alt="" draggable="false" style="--sd:${(Math.random() * 1.2).toFixed(2)}s">`);
        c.classList.add('win');
      });
    },
    centre(r, k) { const b = this.el.getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect(); return { x: b.left - a.left + (r + 0.5) * this.cell, y: b.top - a.top + (k + 0.5) * this.cell }; },
  });
})();
