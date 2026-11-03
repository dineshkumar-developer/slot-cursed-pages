/* ==========================================================================
   game.js — the controller. It owns the balance, the bet, the spin flow, win
   presentation, free spins, autoplay, keyboard input and the responsive layout.
   The maths never lives here: M.resolveSpin() decides, this file only shows it.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, M = window.CPMath, U = CP.U, $ = U.$, fmt = U.fmt, wait = U.wait;
  const rng = M.cryptoRng();

  const app = (CP.app = {
    balance: 0, betIdx: 3, busy: false, presenting: false, fs: null, auto: 0, quick: false, token: 0, modal: false, round: null, ready: false, forced: [],
    bet() { return CP.CFG.bets[this.betIdx]; },
    buyPrice() { return this.bet() * M.BUY_COST_X; },
    ambientStorm() { return !this.fs && !document.hidden; },

    /* ================================ boot ================================ */
    init() {
      const S = CP.store.data;
      this.balance = S.balance; this.betIdx = U.clamp(S.betIdx, 0, CP.CFG.bets.length - 1);
      if (this.balance < CP.CFG.bets[0]) this.balance = CP.CFG.startBalance;
      this.fixBet();
      CP.installDefs(); CP.makeTextures();
      $('#logo').innerHTML = CP.logoSVG();
      document.querySelectorAll('.seal').forEach((e) => (e.innerHTML = CP.sealSVG()));
      $('#btnMenu').innerHTML = CP.icon('menu'); $('#betMinus').innerHTML = CP.icon('minus'); $('#betPlus').innerHTML = CP.icon('plus');
      $('.bico').innerHTML = CP.symbolHTML(M.S.SCAT);
      CP.reels.init(); CP.fx.init();
      this.buildLadder();
      this.bind();
      CP.onViewport(() => this.onResize());
      CP.viewportInit();
      this.onResize(true);
      CP.reels.showGrid(this.startGrid());
      this.applySettings(); this.refresh();
      this.say('SPIN TO WAKE THE DEAD');
      this.ready = true;
      if (CP.intro && document.getElementById('splash')) CP.intro.init();
    },
    startGrid() { const g = [], S = M.S; const pick = [[S.K, S.PUMPKIN, S.Q], [S.A, S.GHOST, S.J], [S.BAT, S.WILD, S.CANDLE], [S.Q, S.SKULL, S.K], [S.J, S.DOLL, S.A]]; pick.forEach((c) => g.push(c)); return g; },
    onResize(first) {
      clearTimeout(this._rt);
      const go = () => { this.layout(); const v = CP.vp; $('#scene').innerHTML = CP.bgHTML('main', v.w, v.h, v.orient) + CP.sceneSVG(v.w, v.h, v.orient) + CP.cloudsHTML(v.w, v.h, 'night', v.orient); $('#sceneFS').innerHTML = CP.bgHTML('fs', v.w, v.h, v.orient) + CP.sceneFSSVG(v.w, v.h, v.orient) + CP.cloudsHTML(v.w, v.h, 'blood', v.orient) + CP.fsExtraHTML(v.w, v.h, v.orient); };
      if (first) go(); else { this.layout(); this._rt = setTimeout(go, 160); }
    },
    layout() {
      const st = $('#stage'), msg = $('#msg'), vp = CP.vp, board = $('#board');
      const sw = st.clientWidth - 8, sh = st.clientHeight - msg.offsetHeight - 10;
      const kx = 0.2, ky = 0.23;
      let cell = Math.min(sw / (5 + kx * 2), sh / (3 + ky * 2));
      cell = U.clamp(Math.floor(cell), 30, 190);
      const px = Math.round(cell * kx), pt = Math.round(cell * ky), bw = cell * 5 + px * 2, bh = cell * 3 + pt * 2;
      const s = board.style;
      s.setProperty('--cell', cell + 'px'); s.setProperty('--px', px + 'px'); s.setProperty('--pt', pt + 'px'); s.setProperty('--bw', bw + 'px'); s.setProperty('--bh', bh + 'px');
      document.getElementById('app').style.setProperty('--cell', cell + 'px');
      $('#frame').innerHTML = CP.frameSVG(bw, bh, [pt, px, pt, px]);
      CP.reels.layout(cell);
      this.centreBoard();
    },
    /** portrait: put the middle of the reels on the middle of the screen (as far as the controls below allow) */
    centreBoard() {
      const st = $('#stage'), board = $('#board'), msg = $('#msg'), app = $('#app');
      st.style.transform = '';
      if (CP.vp.orient !== 'portrait') return;
      const sr = st.getBoundingClientRect(), br = board.getBoundingClientRect(), mr = msg.getBoundingClientRect(), H = app.clientHeight;
      const room = (sr.bottom - mr.bottom) - 4, want = H / 2 - (br.top + br.height / 2);
      const dy = Math.max(0, Math.min(want, room));
      if (dy > 0.5) st.style.transform = `translateY(${Math.round(dy)}px)`;
    },
    bind() {
      const on = (id, fn) => { const e = $(id); e.addEventListener('click', (ev) => { if (!this.ready) return; fn(ev); }); };
      on('#btnSpin', () => this.onSpinBtn());
      on('#betPlus', () => this.changeBet(1)); on('#betMinus', () => this.changeBet(-1));
      on('#btnMax', () => this.maxBet());
      on('#btnAuto', () => { CP.audio.click(); if (this.auto > 0) this.stopAuto(true); else if (!this.busy && !this.fs) CP.ui.autoPicker((n) => { this.auto = n; this.refresh(); if (!this.busy) this.spin({ auto: true }); }); });
      on('#btnTurbo', () => { const S = CP.store.data.settings; S.speed = (S.speed + 1) % 3; CP.store.save(); CP.audio.click(); this.refresh(); CP.ui.toast('Spin speed: ' + CP.CFG.speed[S.speed].name); });
      on('#btnBuy', () => { if (this.busy || this.fs) return; CP.audio.click(); CP.ui.buyConfirm(this.buyPrice(), () => this.spin({ buy: true })); });
      on('#btnMenu', () => { CP.audio.click(); CP.ui.menu(); });
      on('#btnSound', () => { const S = CP.store.data.settings, mute = S.music || S.sfx; S.music = S.sfx = !mute; CP.audio.apply(); CP.store.save(); this.refresh(); CP.audio.click(); });
      on('#btnTest', () => { CP.audio.click(); this.testMenu(); });
      if (window.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(this._cbRaf); this._cbRaf = requestAnimationFrame(() => this.centreBoard()); }).observe($('#stage'));
      addEventListener('keydown', (e) => this.onKey(e));
      document.addEventListener('pointerdown', () => { if (CP.audio.ready) CP.audio.resume(); }, { passive: true });
    },
    /** o.keep = the intro is still on screen (it calls leaveSplash itself) */
    enter(o = {}) {
      if (this._entered) return; this._entered = true;
      CP.audio.init(); CP.audio.unlock(); CP.audio.apply();
      if (!o.keep) CP.audio.startMusic();
      if (!o.keep) { CP.audio.creak(); CP.fx.strike({ power: 1.2, x: CP.vp.w * 0.5, y: CP.vp.h * 0.4 }); CP.fx.flock(3); this.leaveSplash(0.2); }
    },
    leaveSplash(delay, dur) {
      const sp = $('#splash'); if (!sp) { $('#app').dataset.state = 'idle'; return; }
      gsap.to(sp, { opacity: 0, duration: dur || 0.9, delay: delay || 0, onComplete: () => { sp.remove(); $('#app').dataset.state = 'idle'; } });
    },
    /** TEST MODE: forces a known result so every feature can be seen at once */
    testMenu() {
      if (this.busy || this.fs) { CP.ui.toast('Wait for the round to finish'); return; }
      const S = M.S, G = {
        normal: [[S.Q, S.K, S.J], [S.A, S.K, S.BAT], [S.CANDLE, S.K, S.Q], [S.J, S.A, S.PUMPKIN], [S.BAT, S.Q, S.K]],
        big: [[S.Q, S.GHOST, S.J], [S.A, S.GHOST, S.BAT], [S.CANDLE, S.GHOST, S.Q], [S.J, S.GHOST, S.K], [S.BAT, S.GHOST, S.A]],
        mega: [[S.Q, S.SKULL, S.J], [S.A, S.SKULL, S.BAT], [S.CANDLE, S.SKULL, S.Q], [S.J, S.SKULL, S.K], [S.BAT, S.SKULL, S.A]],
        epic: [[S.Q, S.DOLL, S.J], [S.A, S.DOLL, S.BAT], [S.CANDLE, S.DOLL, S.Q], [S.J, S.DOLL, S.K], [S.BAT, S.DOLL, S.A]],
        fs: [[S.SCAT, S.K, S.Q], [S.A, S.J, S.BAT], [S.CANDLE, S.SCAT, S.Q], [S.J, S.K, S.A], [S.BAT, S.Q, S.SCAT]],
      };
      const items = [['normal', 'Normal win'], ['big', 'Big win'], ['mega', 'Mega win'], ['epic', 'Epic win'], ['fs', 'Free spins']];
      CP.ui.modal('TEST', (b, h) => {
        const l = U.el('div', 'test-list', b);
        items.forEach(([k, name]) => {
          const bt = U.el('button', '', l, `<span>${name}</span>`);
          bt.onclick = () => { CP.audio.click(); h.close(); setTimeout(() => { if (this.balance < this.bet()) { this.setBalance(this.balance + CP.CFG.refill); this.fixBet(); this.refresh(); } this.forced.push({ forceGrid: G[k], forceBolts: [] }); this.spin({}); }, 330); };
        });
      }, { cls: 'mini', tilt: 0 });
    },
    onKey(e) {
      if (e.repeat || !this.ready) return;
      const k = e.key;
      if (k === 'Escape') { if (CP.ui.hasModal()) CP.ui.closeModal(); return; }
      if (CP.ui.hasModal() || !this._entered) { if (!this._entered && (k === ' ' || k === 'Enter') && CP.intro) CP.intro.begin(); return; }
      if ((k === ' ' || k === 'Enter') && CP.store.data.settings.spaceSpin) { e.preventDefault(); this.onSpinBtn(); }
      else if (k === 'ArrowUp') this.changeBet(1); else if (k === 'ArrowDown') this.changeBet(-1);
      else if (k === 'a' || k === 'A') $('#btnAuto').click(); else if (k === 't' || k === 'T') $('#btnTurbo').click();
    },
    onModal(open) { this.modal = open; if (open && this.auto > 0) this.stopAuto(); },

    /* ================================ state / UI sync ================================ */
    say(t, cls) { const m = $('#msgText'); m.textContent = t; $('#msg').className = cls || ''; },
    fixBet() { const bets = CP.CFG.bets; while (this.betIdx > 0 && bets[this.betIdx] > this.balance) this.betIdx--; },
    setBalance(v) { this.balance = Math.max(0, Math.round(v)); CP.store.data.balance = this.balance; CP.store.save(); $('#balance').textContent = fmt(this.balance); },
    refresh() {
      const S = CP.store.data.settings, fs = !!this.fs;
      $('#balance').textContent = fmt(this.balance); $('#betVal').textContent = fmt(this.bet()); $('#buyPrice').textContent = fmt(this.buyPrice());
      const busy = this.busy || this.presenting && fs;
      $('#betMinus').disabled = busy || fs || this.betIdx === 0; $('#betPlus').disabled = busy || fs || this.betIdx >= CP.CFG.bets.length - 1 || CP.CFG.bets[this.betIdx + 1] > this.balance;
      $('#btnMax').disabled = busy || fs; $('#btnBuy').disabled = busy || fs || this.balance < this.buyPrice();
      const a = $('#btnAuto'); a.classList.toggle('on', this.auto > 0); a.innerHTML = CP.icon('auto') + (this.auto > 0 ? `<small>${this.auto}</small>` : ''); a.disabled = fs;
      const t = $('#btnTurbo'); t.classList.toggle('on', S.speed > 0); t.innerHTML = CP.icon('turbo') + `<small>${['', 'Q', 'T'][S.speed]}</small>`;
      $('#btnSound').innerHTML = CP.icon(S.music || S.sfx ? 'sound' : 'mute');
      const sp = $('#btnSpin'); sp.classList.toggle('busy', this.busy); sp.classList.toggle('auto', this.auto > 0); sp.classList.toggle('fsmode', fs);
      $('#spinLbl').textContent = fs ? (this.fs.left > 0 ? this.fs.left : '') : this.busy ? 'STOP' : this.auto > 0 ? 'STOP' : 'SPIN';
      sp.disabled = !this._entered || (this.busy && !CP.reels.isSpinning()) && !fs ? false : false;
      $('#app').dataset.fs = fs ? 1 : 0; $('#app').dataset.lh = 0;
      $('#fsBar').classList.toggle('hidden', !fs);
    },
    applySettings() {
      const S = CP.store.data.settings;
      document.body.classList.remove('q-low', 'q-medium', 'q-high'); document.body.classList.add('q-' + S.quality); document.body.classList.toggle('reduced', !!S.reduced);
      CP.audio.apply(); this.refresh();
      if (CP.fx.cv) { CP.fx.resize(); }
    },
    resetAll() { CP.store.reset(); this.balance = CP.CFG.startBalance; this.betIdx = CP.CFG.defaultBetIdx; this.auto = 0; this.setBalance(this.balance); CP.audio.apply(); this.refresh(); $('#winAmt').textContent = '0'; this.say('THE BOOK IS BLANK AGAIN'); },
    refill(force) {
      if (this.busy || this.fs) return;
      CP.ui.refill(() => { this.setBalance(this.balance + CP.CFG.refill); this.fixBet(); this.refresh(); CP.audio.winChime(0); });
    },
    changeBet(d) {
      if (this.busy || this.fs) return;
      const bets = CP.CFG.bets, ni = U.clamp(this.betIdx + d, 0, bets.length - 1);
      if (bets[ni] > this.balance && d > 0) { CP.ui.toast('Not enough credits'); return; }
      if (ni !== this.betIdx) { this.betIdx = ni; CP.store.data.betIdx = ni; CP.store.save(); CP.audio.betTick(d > 0); this.refresh(); this.clearPresentation(); }
    },
    maxBet() { if (this.busy || this.fs) return; const bets = CP.CFG.bets; let i = bets.length - 1; while (i > 0 && bets[i] > this.balance) i--; this.betIdx = i; CP.store.data.betIdx = i; CP.store.save(); CP.audio.betTick(true); this.refresh(); },
    buildLadder() { const l = $('#ladder'); l.innerHTML = ''; for (let i = 1; i <= M.MULT_MAX; i++) U.el('i', '', l, 'x' + i); },
    setLadder(m) { $('#ladder').querySelectorAll('i').forEach((e, i) => { e.classList.toggle('on', i + 1 <= m); e.classList.toggle('cur', i + 1 === m); }); },
    stopAuto() { this.auto = 0; this.refresh(); },

    /* ================================ spin entry ================================ */
    onSpinBtn() {
      if (!this._entered) return;
      if (CP.ui.hasModal()) return;
      if (this.busy) { if (CP.reels.isSpinning()) this.quick = true; return; }      // tap while spinning = stop now
      if (this.fs) { this.token++; return; }                                           // skip a win presentation in free spins
      if (this.auto > 0) { this.stopAuto(); return; }
      this.spin({});
    },
    clearPresentation() { this.token++; CP.reels.clearWins(); CP.ui.lines.clear(); this.presenting = false; },

    /** one paid round: base spin (+ free spins if triggered) */
    async spin(o = {}) {
      if (this.busy || !this._entered) return;
      let bet = this.bet(), cost = o.buy ? this.buyPrice() : bet;
      if (this.balance < (o.buy ? cost : bet)) {
        this.fixBet(); bet = this.bet();
        if (this.balance < CP.CFG.bets[0]) { this.stopAuto(); this.refill(); return; }
        if (o.buy) return;
        CP.ui.toast('Bet lowered to match your credits');
      }
      cost = o.buy ? bet * M.BUY_COST_X : bet;
      this.busy = true; this.quick = false; this.clearPresentation();
      const S = CP.store.data;
      this.setBalance(this.balance - cost); S.stats.spins++; S.stats.wagered += cost;
      this.round = { bet, win: 0, fs: false };
      $('#winAmt').textContent = '0'; this.say(o.buy ? 'THE BOOK OPENS…' : 'THE PAGES TURN…');
      this.refresh();
      const forced = this.forced.shift() || {};
      const res = await this.playSpin({ fs: false, mult: 1, sticky: [] }, bet, Object.assign({ forceScatters: !!o.buy }, forced));
      this.busy = false; this.refresh();
      this.round.win = Math.min(res.win, M.MAX_WIN_X * bet);
      let tier = null;
      if (res.win > 0) { this.setBalance(this.balance + res.win); tier = await this.presentWin(res, bet, false); }
      else this.say(res.scatterCount >= 1 && res.scatterCount < 3 ? 'SO CLOSE… THE BOOK STIRS' : 'THE DEAD ARE SILENT');
      this.refresh();
      let fsWin = 0;
      if (res.fsAward >= 3 || res.fsAwardKind === 'trigger') { this.stopAuto(); fsWin = await this.runFreeSpins(res.fsAward, bet, o.auto); }
      this.finishRound(bet, res.win + fsWin, !!this.round.fs);
      this.refresh();
      // autoplay
      const total = res.win + fsWin, t2 = M.tierOf(total, bet);
      if (this.auto > 0) {
        if (t2 && t2.id !== 'big') this.stopAuto();
        else if (this.balance < bet) this.stopAuto();
        else if (!this.modal) { this.auto--; this.refresh(); if (this.auto > 0) { await wait(0.25); if (this.auto > 0 && !this.busy && !this.modal && this._entered) return this.spin({ auto: true }); } }
        else this.stopAuto();
      }
      if (this.balance < CP.CFG.bets[0] && !this.fs) setTimeout(() => this.refill(), 900);
    },
    finishRound(bet, total, hadFs) {
      const S = CP.store.data, st = S.stats, win = Math.min(total, M.MAX_WIN_X * bet);
      st.won += win; if (win > st.biggest) st.biggest = win; if (win / bet > st.bigX) st.bigX = win / bet;
      const t = M.tierOf(win, bet); if (t) st[t.id]++;
      S.history.unshift({ bet, win, fs: hadFs }); S.history.length = Math.min(S.history.length, CP.CFG.historyMax);
      CP.store.save();
    },

    /* ================================ one visual spin ================================ */
    async playSpin(ctx, bet, opts) {
      const cfg = CP.CFG.speed[CP.store.data.settings.speed] || CP.CFG.speed[0];
      const res = M.resolveSpin(rng, bet, ctx, opts);
      // round cap (5000x for the whole round)
      const cap = M.MAX_WIN_X * bet, already = this.round ? this.round.win : 0;
      if (already + res.win > cap) { res.win = Math.max(0, cap - already); res.capped = true; }
      const R = CP.reels;
      R.setHaunted(ctx.sticky || []);
      R.start(CP.store.data.settings.speed);
      CP.audio.spinStart(); for (let i = 0; i < M.REELS; i++) gsap.delayedCall(i * 0.07, () => CP.audio.reelStart(i)); U.vibrate(15);
      CP.fx.shake(1.2, 0.18);
      await wait(this.quick ? 0.12 : cfg.spin);
      let scat = 0; const pend = [];
      for (let i = 0; i < M.REELS; i++) {
        const rows = res.baseGrid[i];
        const needTense = !this.quick && scat >= 2 && scat < 3 && i >= 2;
        if (needTense) { R.tense(i, true); CP.audio.tense(); await wait(0.9); if (!this.quick) { CP.audio.heart(); await wait(0.45); } }
        const tense = needTense;
        const n = rows.filter((s) => s === M.S.SCAT).length, w = rows.includes(M.S.WILD);
        scat += n;
        const quick = this.quick;
        pend.push(R.stop(i, rows, res.stops[i], { quick }).then(() => {
          R.tense(i, false); CP.audio.reelStop(i, tense); U.vibrate(8); CP.fx.shake(1.5, 0.12);
          if (n) { CP.audio.scatterLand(scat); rows.forEach((s, k) => { if (s === M.S.SCAT) { const c = R.centre(i, k); CP.fx.emit(c.x, c.y, 'soul', 8, { min: 30, max: 140, lifeMin: 0.8, lifeMax: 1.6 }); const el = R.cellEl(i, k); if (el && el.firstChild) gsap.fromTo(el.firstChild, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); } }); }
          if (w && !n) { CP.audio.wildLand(); rows.forEach((s, k) => { if (s === M.S.WILD) { const c = R.centre(i, k); CP.fx.emit(c.x, c.y, 'soul', 6, { min: 30, max: 120 }); } }); }
        }));
        if (i < M.REELS - 1) await wait(this.quick ? 0 : cfg.stagger);
      }
      await Promise.all(pend);
      // lightning wilds
      if (res.bolts.length) { CP.store.data.stats.lightning++; for (const r of res.bolts) await this.boltReel(r); await wait(0.25); }
      return res;
    },
    async boltReel(r) {
      const c = CP.reels.centre(r, 1), cell = CP.reels.cell;
      this.say('LIGHTNING STRIKES!', 'win');
      CP.fx.addBolt(c.x + U.rnd(-60, 60), -10, c.x, c.y + cell, { width: 4.4, life: 0.65, branch: 0.4, depth: 8 });
      CP.fx.addBolt(c.x + U.rnd(-90, 90), -10, c.x + U.rnd(-12, 12), c.y - cell * 0.4, { width: 2.6, life: 0.5 });
      CP.fx.skyFlash(1.3); CP.fx.flash(0.8, 0.6, '#ffffff'); CP.audio.bolt(); CP.fx.shake(7, 0.5); U.vibrate([40, 30, 80]);
      await wait(0.12);
      CP.reels.struck(r);
      for (let k = 0; k < 3; k++) { const p = CP.reels.centre(r, k); CP.fx.emit(p.x, p.y, 'spark', 14, { min: 120, max: 420, g: 300, lifeMin: 0.4, lifeMax: 0.9 }); }
      await wait(0.75);
    },

    /* ================================ win presentation ================================ */
    async presentWin(res, bet, inFs) {
      const tk = ++this.token, alive = () => this.token === tk, hold = (CP.CFG.speed[CP.store.data.settings.speed] || CP.CFG.speed[0]).resultHold;
      this.presenting = true;
      const R = CP.reels, win = res.win, chip = $('#chipWin');
      const cells = [], seen = {};
      res.lineWins.forEach((w) => w.cells.forEach(([r, k]) => { const key = r + ',' + k; if (!seen[key]) { seen[key] = 1; cells.push([r, k]); } }));
      if (res.scatterWin > 0) res.scatterCells.forEach(([r, k]) => { const key = r + ',' + k; if (!seen[key]) { seen[key] = 1; cells.push([r, k]); } });
      const tier = inFs ? null : M.tierOf(win, bet), lvl = tier ? (tier.id === 'epic' ? 2 : tier.id === 'mega' ? 1.6 : 1.2) : (win / bet >= 3 ? 0.6 : 0.2);
      // count the win chip up
      const start = inFs ? this.fs.shown : 0, o = { v: start };
      gsap.to(o, { v: start + win, duration: Math.min(1.4, 0.4 + win / bet * 0.03) * hold + 0.2, ease: 'power1.out', onUpdate: () => { $('#winAmt').textContent = fmt(o.v); }, onComplete: () => { $('#winAmt').textContent = fmt(start + win); } });
      if (inFs) this.fs.shown = start + win;
      chip.classList.remove('on'); void chip.offsetWidth; chip.classList.add('on');
      this.say(`WIN ${fmt(win)}`, 'win');
      R.markWins(cells, true);
      CP.audio.winChime(Math.min(3, Math.floor(lvl * 2))); CP.audio.winGlow();
      if (res.scatterWin > 0) { this.say(`${res.scatterCount} SCATTERS PAY ${fmt(res.scatterWin)}`, 'win'); CP.fx.strike({ power: 0.7, x: CP.vp.w / 2, y: CP.vp.h * 0.4, silent: false }); }
      await wait(0.75 * hold + 0.1); if (!alive()) return tier;
      if (tier) { await CP.ui.bigWin(tier, win, bet); CP.store.data.stats.bigX = Math.max(CP.store.data.stats.bigX, win / bet); if (!alive()) return tier; }
      // cycle the single lines
      const S = CP.store.data.settings;
      if (S.showLines && res.lineWins.length && !tier) {
        const list = res.lineWins.slice(0, 8);
        for (const w of list.length > 1 || true ? list : []) {
          if (!alive()) return tier;
          R.markWins(w.cells, true); CP.ui.lines.show(w.line, w.count);
          this.say(`LINE ${w.line + 1} · ${w.count}× ${M.NAMES[w.sym]} · ${fmt(w.win)}`, 'win');
          await wait((list.length > 3 ? 0.55 : 0.85) * hold + 0.05);
        }
        if (!alive()) return tier;
        CP.ui.lines.clear(); R.markWins(cells, true);
      }
      this.say(`WIN ${fmt(win)}`, 'win');
      if (!inFs) { await wait(0.35 * hold); }
      if (alive()) this.presenting = false;
      return tier;
    },

    /** cross-fade to the blood-moon cathedral during free spins and back again */
    fsWorld(on, instant) {
      const fs = $('#sceneFS'); gsap.killTweensOf(fs);
      if (instant) gsap.set(fs, { opacity: on ? 1 : 0 }); else gsap.to(fs, { opacity: on ? 1 : 0, duration: on ? 1.6 : 1.2, ease: 'power1.inOut' });
      if (on && !instant) { CP.fx.strike({ power: 1.1, x: CP.vp.w * 0.5, y: CP.vp.h * 0.3, shake: false }); CP.fx.flock(5); }
      CP.fx.fsEmbers(on);
    },
    /** screen-hiding transition into free spins: rising ink with dripping edges + lightning, `mid` runs while fully covered */
    fsTransition(mid, label) {
      return new Promise((resolve) => {
        const app = $('#app'), w = CP.vp.w, r = U.seeded(5150);
        const edge = (flip) => {
          let d = flip ? `M0,0 L0,18` : `M0,100 L0,82`;
          const n = Math.max(10, Math.round(w / 34)); let pts = '';
          for (let i = 0; i <= n; i++) { const x = (w * i) / n, long = r() < 0.28, hgt = long ? 40 + r() * 52 : 14 + r() * 22; pts += flip ? ` L${x.toFixed(1)},${(18 + hgt).toFixed(1)}` : ` L${x.toFixed(1)},${(82 - hgt).toFixed(1)}`; if (long && i < n) pts += flip ? ` L${(x + w / n * 0.5).toFixed(1)},${(18 + hgt * 0.4).toFixed(1)}` : ` L${(x + w / n * 0.5).toFixed(1)},${(82 - hgt * 0.4).toFixed(1)}`; }
          d += pts + (flip ? ` L${w},0 Z` : ` L${w},100 Z`);
          return `<svg class="tr-edge ${flip ? 'bot' : 'top'}" width="${w}" height="100" viewBox="0 0 ${w} 100" preserveAspectRatio="none"><path d="${d}" fill="#0b0214"/><path d="${d}" fill="none" stroke="#7a1fd0" stroke-width="2" opacity=".7"/></svg>`;
        };
        const t = U.el('div', 'trans', app, `<div class="tr-sheet">${edge(false)}<div class="tr-body"><div class="tr-glow"></div><div class="tr-text">${label || 'THE NIGHTMARE<br>BEGINS'}</div></div>${edge(true)}</div>`);
        const sheet = $('.tr-sheet', t), text = $('.tr-text', t);
        app.dataset.trans = 1;
        const tl = gsap.timeline({ onComplete: () => { delete app.dataset.trans; t.remove(); resolve(); } });
        gsap.set(sheet, { yPercent: 100, y: 100 }); gsap.set(text, { opacity: 0, scale: 1.5 });
        CP.audio.transIn(); CP.fx.flock(7);
        tl.to(sheet, { yPercent: 0, y: 0, duration: 0.85, ease: 'power2.in' })
          .call(() => { mid(); CP.fx.strike({ power: 1.5, x: CP.vp.w * 0.5, y: CP.vp.h * 0.35, shake: false }); CP.fx.flash(0.9, 0.7, '#e8d8ff'); CP.audio.boom(); U.vibrate([60, 40, 120]); CP.fx.shake(10, 0.6); CP.fx.flock(8); })
          .to(text, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, '<0.05')
          .to(text, { opacity: 0, scale: 1.12, duration: 0.35 }, '+=0.7')
          .call(() => CP.audio.transOut(), null, '<')
          .to(sheet, { yPercent: -100, y: -100, duration: 0.95, ease: 'power2.out' }, '<0.1');
      });
    },

    /* ================================ free spins ================================ */
    async runFreeSpins(award, bet, auto) {
      const S = CP.store.data;
      this.round.fs = true; S.stats.fsTriggers++;
      this.fs = { left: award, played: 0, total: award, mult: 1, sticky: [], win: 0, shown: 0 };
      // the scatters take a bow before the screen changes
      CP.reels.markWins(CP.reels.reels.flatMap((rv, r) => [0, 1, 2].filter((k) => +CP.reels.cellEl(r, k).dataset.s === M.S.SCAT).map((k) => [r, k])), true);
      await wait(0.6);
      await CP.ui.fsIntro(award, auto || this.auto > 0);
      CP.reels.clearWins();
      // ink floods the screen, the world is swapped while nothing can be seen, then it drains away
      await this.fsTransition(() => {
        this.fsWorld(true, true);
        CP.audio.setMode('fs'); this.setLadder(1); $('#winAmt').textContent = '0'; $('#fsTotal').textContent = '0';
        this.busy = true; this.refresh();
      });
      while (this.fs.left > 0) {
        const fs = this.fs; fs.left--; fs.played++;
        $('#fsLeft').textContent = fs.left; this.say(`FREE SPIN ${fs.played} OF ${fs.total} · CURSE x${fs.mult}`);
        this.busy = true; this.quick = false; this.refresh(); CP.ui.lines.clear();
        const res = await this.playSpin({ fs: true, mult: fs.mult, sticky: fs.sticky }, bet, this.forced.shift() || {});
        this.round.win += res.win;
        this.busy = false; this.refresh();
        if (res.win > 0) {
          this.setBalance(this.balance + res.win); fs.win += res.win;
          $('#fsTotal').textContent = fmt(fs.win);
          await this.presentWin(res, bet, true);
        } else { this.say('THE DEAD ARE SILENT'); await wait(0.35); }
        if (res.fsAward > 0) { const add = Math.min(res.fsAward, M.FS_MAX_SPINS - fs.total); if (add > 0) { fs.left += add; fs.total += add; $('#fsLeft').textContent = fs.left; await CP.ui.retrigger(add); } }
        if (res.multNext > fs.mult) { fs.mult = res.multNext; this.setLadder(fs.mult); CP.audio.multUp(fs.mult); CP.fx.fsSurge(fs.mult); CP.fx.strike({ power: 0.5 + fs.mult * 0.1, silent: true, shake: false }); S.stats.bestMult = Math.max(S.stats.bestMult, fs.mult); }
        fs.sticky = res.stickyOut;
        if (res.capped || this.round.win >= M.MAX_WIN_X * bet) { fs.left = 0; }
        this.refresh(); await wait(0.25);
      }
      const total = this.fs.win, played = this.fs.played, base = this.round.win - total;
      this.busy = true; this.refresh();
      CP.reels.clearHaunted(); CP.reels.clearWins(); CP.ui.lines.clear();
      const tier = M.tierOf(total + base, bet);
      if (tier) { await CP.ui.bigWin(tier, total, bet); }
      await CP.ui.fsOutro(total, played, bet);
      // COLLECT: the same ink transition hides the swap back to the night world
      await this.fsTransition(() => {
        this.fs = null; this.busy = false; this.presenting = false;
        this.fsWorld(false, true);
        CP.audio.setMode('base'); $('#winAmt').textContent = fmt(total + base); this.say(`ROUND TOTAL ${fmt(total + base)}`, 'win');
        this.refresh();
      }, 'THE NIGHTMARE<br>ENDS');
      return total;
    },
  });
})();
