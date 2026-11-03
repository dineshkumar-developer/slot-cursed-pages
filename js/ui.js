/* ==========================================================================
   ui.js — every card, menu and celebration screen: menu, settings, paytable (5 pages),
   stats, autoplay picker, buy confirm, BIG / MEGA / EPIC win, free spins intro + outro.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, M = window.CPMath, U = CP.U, el = U.el, fmt = U.fmt;
  const stack = [];

  const UI = (CP.ui = {
    /* ---------- generic card modal ---------- */
    modal(title, build, o = {}) {
      const root = document.getElementById('modals');
      const scrim = el('div', 'scrim' + (o.cls ? ' ' + o.cls : ''), root);
      const card = el('div', 'card' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : ''), scrim);
      const head = el('div', 'card-h', card, `<h2>${title}</h2>`);
      const x = el('button', 'rbtn sm', head, CP.icon('close')); x.setAttribute('aria-label', 'Close');
      const body = el('div', 'card-b scroll', card);
      const h = { scrim, card, body, close() { UI.closeModal(h); }, onClose: o.onClose };
      x.onclick = () => { CP.audio.click(); h.close(); };
      scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim && performance.now() - h.t0 > 350) h.close(); });
      h.t0 = performance.now();
      build(body, h);
      root.style.pointerEvents = 'auto';
      stack.push(h);
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(card, { y: 40, rotation: -2.5, scale: 0.92, opacity: 0 }, { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.5)', clearProps: 'transform' });   // ends with NO transform: rotated text is resampled and looks soft
      CP.audio.paper();
      if (CP.app) CP.app.onModal(true);
      return h;
    },
    closeModal(h) {
      h = h || stack[stack.length - 1]; if (!h) return;
      const i = stack.indexOf(h); if (i < 0) return; stack.splice(i, 1);
      CP.audio.paper();
      gsap.to(h.card, { y: 30, rotation: 2, opacity: 0, duration: 0.2 });
      gsap.to(h.scrim, { opacity: 0, duration: 0.22, onComplete: () => {
        h.scrim.remove(); if (!stack.length) document.getElementById('modals').style.pointerEvents = 'none';
        if (h.onClose) h.onClose(); if (CP.app && !stack.length) CP.app.onModal(false);
      } });
    },
    hasModal: () => stack.length > 0,
    closeAll() { [...stack].forEach((h) => UI.closeModal(h)); },
    toast(msg) {
      const t = document.getElementById('toast'); const d = el('div', 'toast', t, msg);
      setTimeout(() => d.remove(), 2700);
    },

    /* ---------- MENU ---------- */
    menu() {
      return UI.modal('MENU', (b, h) => {
        const tiles = el('div', 'tiles', b);
        const mk = (ico, label, fn) => { const t = el('button', 'tile', tiles, CP.icon(ico) + `<span>${label}</span>`); t.onclick = () => { CP.audio.click(); fn(); }; return t; };
        mk('book', 'PAYTABLE', () => { h.close(); setTimeout(() => UI.paytable(), 260); });
        mk('gear', 'SETTINGS', () => { h.close(); setTimeout(() => UI.settings(), 260); });
        mk('chart', 'STATS', () => { h.close(); setTimeout(() => UI.stats(), 260); });
        mk('info', 'HOW TO PLAY', () => { h.close(); setTimeout(() => UI.paytable(2), 260); });
        const full = document.fullscreenEnabled || document.webkitFullscreenEnabled;
        if (full) mk('full', 'FULLSCREEN', () => { const d = document, e = d.documentElement; if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (e.requestFullscreen || e.webkitRequestFullscreen).call(e); });
        mk('refresh', 'ADD CREDITS', () => { h.close(); CP.app.refill(true); });
        el('p', '', b, '<span style="font-size:.85em;opacity:.7">Virtual credits only. No real money is used or won.</span>').style.textAlign = 'center';
      }, { tilt: -0.6 });
    },

    /* ---------- SETTINGS ---------- */
    settings() {
      const S = CP.store.data.settings;
      return UI.modal('SETTINGS', (b) => {
        const row = (label, ctrl) => { const r = el('div', 'set-row', b, `<span>${label}</span>`); r.appendChild(ctrl); return r; };
        const toggle = (key, after) => {
          const t = el('button', 'tog' + (S[key] ? ' on' : '')); t.setAttribute('role', 'switch'); t.setAttribute('aria-checked', !!S[key]);
          t.onclick = () => { S[key] = !S[key]; t.classList.toggle('on', S[key]); t.setAttribute('aria-checked', !!S[key]); CP.audio.click(); CP.store.save(); CP.app.applySettings(); if (after) after(S[key]); }; return t;
        };
        const slider = (key) => { const s = el('input'); s.type = 'range'; s.min = 0; s.max = 100; s.step = 5; s.value = S[key]; s.setAttribute('aria-label', key);
          s.oninput = () => { S[key] = +s.value; CP.audio.apply(); CP.store.save(); }; s.onchange = () => CP.audio.betTick(true); return s; };
        const seg = (key, opts) => { const w = el('div', 'seg'); opts.forEach(([v, label]) => { const bt = el('button', S[key] === v ? 'on' : '', w, label); bt.onclick = () => { S[key] = v; w.querySelectorAll('button').forEach((x) => x.classList.remove('on')); bt.classList.add('on'); CP.audio.click(); CP.store.save(); CP.app.applySettings(); }; }); return w; };
        row('Music', toggle('music', () => CP.audio.apply())); row('Music volume', slider('musicVol'));
        row('Sound effects', toggle('sfx', () => CP.audio.apply())); row('Effects volume', slider('sfxVol'));
        row('Ambience (wind, creaks)', toggle('ambience', () => CP.audio.apply()));
        row('Spin speed', seg('speed', [[0, 'NORMAL'], [1, 'QUICK'], [2, 'TURBO']]));
        row('Lightning storm', toggle('lightning'));
        row('Flash effects', toggle('flash'));
        row('Screen shake', toggle('shake'));
        row('Vibration', toggle('vibration'));
        row('Reduce motion', toggle('reduced'));
        row('Graphics quality', seg('quality', [['low', 'LOW'], ['medium', 'MED'], ['high', 'HIGH']]));
        row('Show win lines', toggle('showLines'));
        row('Space bar spins', toggle('spaceSpin'));
        const rs = el('div', 'row-btns', b);
        const reset = el('button', 'btn-main alt', rs, 'RESET GAME');
        let armed = false;
        reset.onclick = () => { if (!armed) { armed = true; reset.textContent = 'TAP AGAIN TO ERASE'; setTimeout(() => { armed = false; reset.textContent = 'RESET GAME'; }, 3000); return; } CP.app.resetAll(); UI.closeAll(); };
      });
    },

    /* ---------- STATS ---------- */
    stats() {
      return UI.modal('STATS', (b) => {
        const s = CP.store.data.stats, g = el('div', 'stat-grid', b);
        const st = (l, v) => el('div', 'stat', g, `<span class="lbl">${l}</span><b>${v}</b>`);
        st('SPINS', fmt(s.spins)); st('TOTAL WAGERED', fmt(s.wagered)); st('TOTAL WON', fmt(s.won));
        st('RETURNED', s.wagered ? (s.won / s.wagered * 100).toFixed(1) + '%' : '—');
        st('BIGGEST WIN', fmt(s.biggest)); st('BEST MULTIPLIER', s.bigX ? s.bigX.toFixed(1) + 'x' : '—');
        st('BIG / MEGA / EPIC', `${s.big} / ${s.mega} / ${s.epic}`); st('FREE SPIN ROUNDS', s.fsTriggers);
        st('LIGHTNING WILDS', s.lightning); st('BEST CURSE', 'x' + s.bestMult);
        el('h3', '', b, 'LAST ROUNDS');
        const hist = CP.store.data.history;
        if (!hist.length) el('p', '', b, 'No rounds yet. Turn the first page…');
        else { const t = el('table', 'hist', b, '<tr><th>BET</th><th>WIN</th><th>X</th></tr>'); hist.slice(0, 15).forEach((r) => { t.insertAdjacentHTML('beforeend', `<tr><td>${fmt(r.bet)}${r.fs ? ' ☠' : ''}</td><td>${fmt(r.win)}</td><td>${(r.win / r.bet).toFixed(1)}x</td></tr>`); }); }
      });
    },

    /* ---------- PAYTABLE (5 pages) ---------- */
    paytable(startPage = 0) {
      const bet = CP.app.bet(), lb = bet / M.NLINES;
      const pages = [
        ['SYMBOLS', (b) => {
          el('p', '', b, `Wins pay from the <b>left</b> on neighbouring reels, on any of the 20 lines. Prizes are for your current bet of <b>${fmt(bet)}</b>.`);
          const g = el('div', 'pay-grid', b);
          [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].forEach((id) => {
            const p = M.PAYS[id];
            el('div', 'pay', g, `${CP.symbolHTML(id)}<ul><li><span>5</span><b>${fmt(p[5] * lb)}</b></li><li><span>4</span><b>${fmt(p[4] * lb)}</b></li><li><span>3</span><b>${fmt(p[3] * lb)}</b></li></ul>`);
          });
        }],
        ['SPECIAL', (b) => {
          el('div', 'feat', b, `${CP.symbolHTML(M.S.WILD)}<div><h4>BLACK CAT · WILD</h4><p>Lands on reels <b>2, 3 and 4</b>. Replaces every symbol except the Scatter to finish a winning line.</p></div>`);
          el('div', 'feat', b, `${CP.symbolHTML(M.S.SCAT)}<div><h4>GRIMOIRE · SCATTER</h4><p>Pays anywhere, on any reel: 3 = <b>${fmt(M.SCAT_PAY[3] * bet)}</b>, 4 = <b>${fmt(M.SCAT_PAY[4] * bet)}</b>, 5 = <b>${fmt(M.SCAT_PAY[5] * bet)}</b>.</p><p><b>3 / 4 / 5</b> Scatters open <b>${M.FS_AWARD[3]} / ${M.FS_AWARD[4]} / ${M.FS_AWARD[5]}</b> Free Spins.</p></div>`);
          el('div', 'feat', b, `<svg class="sym" viewBox="0 0 64 64"><path d="M38,2 L18,34 L31,34 L24,62 L48,26 L34,26 Z" fill="#E9B93C" stroke="#17121C" stroke-width="3" stroke-linejoin="round"/></svg><div><h4>LIGHTNING WILD</h4><p>In the base game a bolt can strike one or two of reels 2-4 and turn the <b>whole reel Wild</b> before wins are counted.</p></div>`);
        }],
        ['FREE SPINS', (b) => {
          el('p', '', b, `Land <b>3+ Scatters</b> to be dragged into the nightmare: <b>${M.FS_AWARD[3]}, ${M.FS_AWARD[4]} or ${M.FS_AWARD[5]}</b> Free Spins at your bet.`);
          el('h3', '', b, 'THE CURSE MULTIPLIER');
          el('p', '', b, `Every spin that wins raises the curse by one, from <b>x1 up to x${M.MULT_MAX}</b>. It multiplies every win and is never lost during the feature.`);
          el('h3', '', b, 'HAUNTED WILDS');
          el('p', '', b, 'Every Cat Wild that lands stays on the reels for <b>one more spin</b>, haunted in green.');
          el('h3', '', b, 'MORE SPINS');
          el('p', '', b, `3 / 4 / 5 Scatters during the feature add <b>${M.FS_RETRIGGER[3]} / ${M.FS_RETRIGGER[4]} / ${M.FS_RETRIGGER[5]}</b> spins (up to ${M.FS_MAX_SPINS}).`);
          el('h3', '', b, 'BUY FREE SPINS');
          el('p', '', b, `Pay <b>${M.BUY_COST_X}x</b> your bet to start the feature at once with 3 Scatters.`);
        }],
        ['PAYLINES', (b) => {
          el('p', '', b, 'All 20 lines are always active. The total bet is split evenly across them.');
          const g = el('div', 'lines-grid', b);
          M.LINES.forEach((ln, i) => {
            let pts = ln.map((row, c) => `${10 + c * 20},${8 + row * 12}`).join(' '), dots = '';
            for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) dots += `<circle cx="${10 + c * 20}" cy="${8 + r * 12}" r="1.8" fill="#9a8d77"/>`;
            el('div', '', g, `<svg viewBox="0 0 100 40">${dots}<polyline points="${pts}" fill="none" stroke="#B3202A" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>${i + 1}`);
          });
        }],
        ['RULES', (b) => {
          el('h3', '', b, 'WIN LEVELS');
          M.TIERS.slice().reverse().forEach((t) => el('div', 'tier-row', b, `<span>${t.name}</span><span>${t.min}x bet</span>`));
          el('p', '', b, `Maximum win per round: <b>${fmt(M.MAX_WIN_X)}x</b> your bet. Theoretical return to player: <b>96.0 %</b>.`);
          el('p', '', b, 'Only the highest win on each line is paid. Line wins are added together, Scatter wins are added to them. Malfunction voids all pays and plays.');
          el('p', '', b, 'This is a game of chance for entertainment. It uses <b>virtual credits only</b> and no real money.');
          el('p', '', b, '<b>Keys:</b> Space = spin / stop · ↑ ↓ = bet · A = autoplay · T = speed · Esc = close.');
        }],
      ];
      let idx = Math.min(startPage, pages.length - 1);
      return UI.modal('PAYTABLE', (b, h) => {
        h.card.classList.add('wide');
        const nav = el('div', '', null); nav.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px';
        const prev = el('button', 'rbtn sm', nav, CP.icon('back')), title = el('div', '', nav), next = el('button', 'rbtn sm', nav, CP.icon('next'));
        title.style.cssText = 'font-family:var(--f-title);font-size:calc(22*var(--s));color:var(--bloodD);text-align:center;flex:1';
        const dots = el('div', 'pt-tabs'), page = el('div', '', null);
        pages.forEach(() => el('i', '', dots));
        b.append(nav, page, dots);
        const render = (dir) => {
          title.textContent = `${idx + 1}/${pages.length} · ${pages[idx][0]}`;
          dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === idx));
          page.innerHTML = ''; pages[idx][1](page); b.scrollTop = 0;
          if (dir) gsap.fromTo(page, { x: dir * 50, opacity: 0, rotation: dir * 1.2 }, { x: 0, opacity: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
        };
        prev.onclick = () => { idx = (idx + pages.length - 1) % pages.length; CP.audio.paper(); render(-1); };
        next.onclick = () => { idx = (idx + 1) % pages.length; CP.audio.paper(); render(1); };
        let sx = 0; b.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
        b.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) (dx < 0 ? next : prev).click(); }, { passive: true });
        render(0);
      }, { wide: true });
    },

    /* ---------- AUTOPLAY / BUY / REFILL ---------- */
    autoPicker(cb) {
      return UI.modal('AUTOPLAY', (b, h) => {
        el('p', '', b, 'Spins automatically at the current bet. It stops on a feature, a big win, or when your balance is too low.');
        const g = el('div', 'auto-grid', b);
        CP.CFG.autoOptions.forEach((n) => { const x = el('button', '', g, n); x.onclick = () => { CP.audio.click(); h.close(); cb(n); }; });
      });
    },
    buyConfirm(price, cb) {
      return UI.modal('BUY FREE SPINS', (b, h) => {
        // hero: the scatter grimoire floating over a violet night sky with slowly turning rays; the award sits on a ribbon
        const L = el('div', 'bfx-l', b), R = el('div', 'bfx-r', b);
        const st = el('div', 'bfx-stage', L), hero = el('div', 'bfx-hero', st);
        el('div', 'bfx-stars', hero); el('div', 'bfx-rays', hero); el('div', 'bfx-book', hero, CP.symbolHTML(M.S.SCAT));
        el('div', 'bfx-rib', st, `<b>${M.FS_AWARD[3]}</b> FREE SPINS`);
        el('p', 'bfx-lead', R, 'Skip the wait and open the nightmare right now.');
        const chips = el('div', 'bfx-chips', R);
        el('div', 'bfx-chip', chips, `<span class="ic">${CP.icon('bolt')}</span>Curse multiplier`);
        el('div', 'bfx-chip', chips, `<span class="ic wild">${CP.symbolHTML(M.S.WILD)}</span>Haunted wilds`);
        el('div', 'bfx-price', R, `<span class="lbl">PRICE</span><b>${fmt(price)}</b><span class="sub">${M.BUY_COST_X}\u00d7 TOTAL BET</span>`);
        const r = el('div', 'row-btns', R);
        const no = el('button', 'btn-main alt', r, 'NO'), yes = el('button', 'btn-main', r, 'BUY');
        no.onclick = () => { CP.audio.click(); h.close(); }; yes.onclick = () => { h.close(); cb(); };
        if (CP.app.balance < price) { yes.disabled = true; yes.style.opacity = 0.5; el('p', 'bfx-warn', R, 'Not enough credits.'); }
      }, { cls: 'buyfx' });
    },
    refill(cb) {
      return UI.modal('THE SPIRITS PITY YOU', (b, h) => {
        el('p', '', b, `You are out of credits. A kind ghost slips <b>${fmt(CP.CFG.refill)}</b> virtual credits under the door.`).style.textAlign = 'center';
        const r = el('div', 'row-btns', b); const y = el('button', 'btn-main', r, 'TAKE THEM'); y.onclick = () => { h.close(); cb(); };
      }, { onClose: () => {} });
    },

    /* ---------- BIG / MEGA / EPIC WIN ---------- */
    bigWin(tier, amount, bet) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay');
        const n = el('div', 'big ' + tier.id, ov);
        el('div', 'rays', n);
        const txt = el('div', 'bigtxt', n, tier.name.replace(' ', '<br>')); const amt = el('div', 'bigamt', n, '0'); const xx = el('div', 'bigx', n, '0.0x');
        const tap = el('div', 'tapskip', n, 'TAP TO SKIP');
        let finished = false, done = false;
        const lvl = tier.id === 'epic' ? 3 : tier.id === 'mega' ? 2 : 1, dur = [0, 3.2, 4.8, 6.8][lvl];
        CP.audio.bigStinger(tier.id); CP.audio.bigAppear();
        gsap.fromTo(n, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(txt, { scale: 3, rotation: -12, opacity: 0 }, { scale: 1, rotation: -2, opacity: 1, duration: 0.55, ease: 'back.out(1.6)' });
        gsap.to(txt, { rotation: 2, scale: 1.05, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.6 });
        CP.fx.strike({ power: 0.8 + lvl * 0.25, x: CP.vp.w * 0.5, y: CP.vp.h * 0.45 }); CP.fx.flock(2 + lvl * 3);
        const o = { v: 0 }, cx = CP.vp.w / 2, cy = CP.vp.h * 0.5;
        const tl = gsap.timeline();
        tl.to(o, { v: amount, duration: dur, ease: 'power2.out', onUpdate: () => { amt.textContent = fmt(o.v); xx.textContent = (o.v / bet).toFixed(1) + 'x BET'; if (Math.random() < 0.5) CP.audio.tick(o.v / amount); } }, 0.3);
        for (let i = 0; i < lvl * 3; i++) tl.call(() => { CP.fx.emit(cx, cy, Math.random() < 0.5 ? 'paper' : 'ember', 26, { angle: -1.57, spread: 1.2, up: 120, min: 200, max: 640, jx: 120, jy: 20, g: 520, lifeMin: 1.2, lifeMax: 2.4 }); CP.audio.skullHit(); CP.fx.shake(3 + lvl * 2, 0.3); }, null, 0.4 + i * (dur / (lvl * 3)));
        if (lvl >= 2) for (let i = 0; i < lvl * 2 - 1; i++) tl.call(() => CP.fx.strike({ power: 0.7 + lvl * 0.2, shake: false }), null, 1.2 + i * 1.5);
        tl.call(() => { finished = true; CP.audio.winChime(lvl); tap.textContent = 'TAP TO CONTINUE'; CP.fx.emit(cx, cy, 'soul', 24, { min: 40, max: 160, lifeMin: 1.5, lifeMax: 3 }); }, null, 0.3 + dur);
        const close = () => {
          if (done) return; done = true; gsap.killTweensOf(txt);
          gsap.to(n, { opacity: 0, duration: 0.3, onComplete: () => { n.remove(); resolve(); } });
        };
        n.addEventListener('pointerdown', () => { if (!finished) { tl.progress(1); gsap.killTweensOf(o); o.v = amount; amt.textContent = fmt(amount); xx.textContent = (amount / bet).toFixed(1) + 'x BET'; finished = true; tap.textContent = 'TAP TO CONTINUE'; } else close(); });
        n._auto = () => { if (finished) close(); };
        UI._bigNode = n;
        gsap.delayedCall(dur + 4.5, close);                  // always closes itself
      });
    },

    /* ---------- FREE SPINS INTRO / RETRIGGER / OUTRO ---------- */
    fsIntro(spins, auto) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay'), n = el('div', 'big', ov);
        el('div', 'rays', n);
        const c = el('div', 'card-fs', n, `<h2>FREE SPINS</h2><div class="n">${spins}</div><p>The curse grows with every win: <b>x1 → x${M.MULT_MAX}</b><br>Cat wilds haunt the next spin.</p>`);
        const b = el('button', 'btn-main', c, 'ENTER THE NIGHTMARE');
        CP.audio.fsIntro(); CP.fx.strike({ power: 1.4, x: CP.vp.w / 2, y: CP.vp.h * 0.4 }); CP.fx.flock(8);
        gsap.fromTo(n, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(c, { scale: 0.2, rotation: -25, y: 120 }, { scale: 1, rotation: -1, y: 0, duration: 0.7, ease: 'back.out(1.8)' });
        gsap.to(c.querySelector('.n'), { scale: 1.12, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        let done = false;
        const go = () => { if (done) return; done = true; CP.audio.click(); gsap.to(n, { opacity: 0, duration: 0.35, onComplete: () => { n.remove(); resolve(); } }); };
        b.onclick = go;
        gsap.delayedCall(auto ? 3.2 : 12, go);
      });
    },
    retrigger(n) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay'), d = el('div', 'big', ov); d.style.background = 'rgba(5,2,10,.55)'; d.style.pointerEvents = 'none';
        const t = el('div', 'bigtxt', d, `+${n}<br>FREE SPINS`);
        CP.audio.toll(); CP.fx.strike({ power: 0.9 });
        gsap.fromTo(d, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.fromTo(t, { scale: 2.2, opacity: 0, rotation: 8 }, { scale: 1, opacity: 1, rotation: -2, duration: 0.5, ease: 'back.out(1.8)' });
        gsap.to(d, { opacity: 0, duration: 0.3, delay: 1.6, onComplete: () => { d.remove(); resolve(); } });
      });
    },
    fsOutro(total, spins, bet) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay'), n = el('div', 'big', ov);
        el('div', 'rays', n);
        const c = el('div', 'card-fs', n, `<h2>NIGHTMARE OVER</h2><p>${spins} free spins</p><div class="n" id="fsOutN">0</div><p>${total > 0 ? (total / bet).toFixed(1) + 'x your bet' : 'The spirits gave you nothing… this time.'}</p>`);
        const b = el('button', 'btn-main', c, 'COLLECT');
        gsap.fromTo(n, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(c, { scale: 0.3, rotation: 14 }, { scale: 1, rotation: 1, duration: 0.6, ease: 'back.out(1.7)' });
        const nn = c.querySelector('#fsOutN'), o = { v: 0 };
        gsap.to(o, { v: total, duration: Math.min(3, 0.6 + Math.log10(1 + total) * 0.5), delay: 0.4, ease: 'power2.out', onUpdate: () => { nn.textContent = fmt(o.v); if (Math.random() < 0.5) CP.audio.tick(o.v / (total || 1)); } });
        if (total > 0) { CP.audio.winChime(2); CP.fx.emit(CP.vp.w / 2, CP.vp.h * 0.5, 'paper', 36, { angle: -1.57, spread: 1.1, up: 100, min: 200, max: 560, jx: 80, g: 520 }); }
        let done = false;
        const go = () => { if (done) return; done = true; CP.audio.click(); gsap.to(n, { opacity: 0, duration: 0.35, onComplete: () => { n.remove(); resolve(); } }); };
        b.onclick = go; gsap.delayedCall(14, go);
      });
    },

    /* ---------- payline overlay ---------- */
    lines: {
      show(lineIdx, count, color) {
        const box = document.getElementById('lines'), c = CP.reels.cell, ln = M.LINES[lineIdx];
        let d = ''; for (let r = 0; r < count; r++) d += (r ? ' L' : 'M') + ((r + 0.5) * c).toFixed(1) + ',' + ((ln[r] + 0.5) * c).toFixed(1);
        box.innerHTML = `<svg viewBox="0 0 ${c * 5} ${c * 3}"><path d="${d}" fill="none" stroke="#17121C" stroke-width="${c * 0.11}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/><path id="lnp" d="${d}" fill="none" stroke="${color || '#E4474F'}" stroke-width="${c * 0.065}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const p = box.querySelector('#lnp'), len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        gsap.to(p, { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' });
      },
      clear() { document.getElementById('lines').innerHTML = ''; },
    },
  });
})();
