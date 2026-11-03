/* ==========================================================================
   fx.js — lightning (procedural, branching), particles, screen flash, shake,
   bats and the ambient storm. One canvas, drawn only while something is alive.
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP, U = CP.U;
  const rnd = U.rnd;

  const FX = (CP.fx = {
    bolts: [], parts: [], running: false,
    init() {
      this.cv = document.getElementById('fx'); this.ctx = this.cv.getContext('2d');
      this.scenes = [document.getElementById('scene'), document.getElementById('sceneFS')]; this.flashEl = document.getElementById('flash'); this.game = document.getElementById('game');
      this.resize(); CP.onViewport(() => this.resize());
      gsap.ticker.add(() => this.frame());
      this.stormLoop(); this.batLoop();
    },
    resize() {
      const d = Math.min(CP.vp.dpr, CP.store.data.settings.quality === 'low' ? 1.5 : 2);
      this.w = CP.vp.w; this.h = CP.vp.h;
      this.cv.width = Math.round(this.w * d); this.cv.height = Math.round(this.h * d); this.d = d;
      this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    },

    /* ---------- lightning bolt geometry (midpoint displacement + branches) ---------- */
    makeBolt(x1, y1, x2, y2, o = {}) {
      const segs = [], branch = o.branch === undefined ? 0.28 : o.branch, rough = o.rough || 0.16;
      const rec = (ax, ay, bx, by, depth, width, alpha) => {
        if (depth === 0) { segs.push([ax, ay, bx, by, width, alpha]); return; }
        const mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay);
        const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1), off = (Math.random() - 0.5) * len * rough * 2;
        const cx = mx + nx * off, cy = my + ny * off;
        rec(ax, ay, cx, cy, depth - 1, width, alpha); rec(cx, cy, bx, by, depth - 1, width, alpha);
        if (depth > 2 && Math.random() < branch && width > 1) {
          const ang = Math.atan2(by - ay, bx - ax) + (Math.random() - 0.5) * 1.3, bl = len * (0.5 + Math.random() * 0.6);
          rec(cx, cy, cx + Math.cos(ang) * bl, cy + Math.sin(ang) * bl * 0.9 + len * 0.1, depth - 2, width * 0.55, alpha * 0.7);
        }
      };
      rec(x1, y1, x2, y2, o.depth || 7, o.width || 3.2, 1);
      return segs;
    },
    addBolt(x1, y1, x2, y2, o = {}) {
      const life = o.life || 0.45;
      this.bolts.push({ segs: this.makeBolt(x1, y1, x2, y2, o), t: 0, life, color: o.color || '170,200,255', flick: 0 });
      this.wake();
    },
    /** a bolt that falls out of the sky; shakes the screen, flashes, lights the scene, rolls thunder */
    strike(o = {}) {
      const S = CP.store.data.settings, x = o.x === undefined ? rnd(this.w * 0.1, this.w * 0.9) : o.x, y2 = o.y === undefined ? rnd(this.h * 0.35, this.h * 0.75) : o.y;
      const power = o.power || 1;
      if (S.lightning !== false || o.force) {
        this.addBolt(x + rnd(-40, 40), -10, x, y2, { width: 3 + power * 1.4, life: 0.5 + power * 0.1, branch: 0.34, color: o.color });
        if (power > 0.9 && Math.random() < 0.7) this.addBolt(x + rnd(-150, 150), -10, x + rnd(-120, 120), y2 * rnd(0.6, 1), { width: 2.2, life: 0.4, color: o.color });
        this.skyFlash(power);
      }
      if (!o.silent) CP.audio.thunder(power);
      if (o.shake !== false) this.shake(5 * power, 0.45);
      U.vibrate(power > 1 ? [30, 40, 60] : 25);
    },
    skyFlash(power = 1) {
      if (CP.store.data.settings.flash === false) return;
      const sc = this.scenes, tl = gsap.timeline(), on = () => sc.forEach((e) => e && e.classList.add('lit')), off = () => sc.forEach((e) => e && e.classList.remove('lit'));
      tl.call(on).to({}, { duration: 0.06 }).call(off).to({}, { duration: 0.07 }).call(on).to({}, { duration: 0.12 * power }).call(off);
      this.flash(0.55 * Math.min(1.2, power), 0.5);
    },
    flash(a = 0.7, dur = 0.3, color = '#dbe6ff') {
      if (CP.store.data.settings.flash === false || CP.store.data.settings.reduced) return;
      gsap.killTweensOf(this.flashEl); this.flashEl.style.background = color;
      gsap.fromTo(this.flashEl, { opacity: a }, { opacity: 0, duration: dur, ease: 'power3.out' });
    },
    shake(amp = 6, dur = 0.4) {
      const S = CP.store.data.settings; if (!S.shake || S.reduced) return;
      const el = this.game, n = Math.max(2, Math.round(dur / 0.04)), tl = gsap.timeline();
      for (let i = 0; i < n; i++) { const k = 1 - i / n; tl.to(el, { x: (Math.random() - 0.5) * amp * 2 * k, y: (Math.random() - 0.5) * amp * 2 * k, duration: 0.04 }); }
      tl.to(el, { x: 0, y: 0, duration: 0.05 });
    },

    /* ---------- particles ---------- */
    emit(x, y, kind, n, o = {}) {
      n = Math.round(n * CP.fxScale()); if (n < 1) n = 1;
      const cols = o.colors || { paper: ['#F3EAD0', '#CDBB96', '#B3202A', '#8FD14F', '#E9B93C'], ember: ['#ffcf5a', '#ff8a3a', '#ff5a3a'], blood: ['#B3202A', '#E4474F', '#6E1018'], spark: ['#ffffff', '#bfe0ff', '#9ad'], soul: ['#B9FF7A', '#8FD14F', '#e6ffd0'], wisp: ['#efe0ff', '#c79cff', '#9a6bff'] }[kind];
      for (let i = 0; i < n && this.parts.length < 700; i++) {
        const a = o.angle === undefined ? rnd(0, 6.283) : o.angle + rnd(-(o.spread || 0.5), o.spread || 0.5), sp = rnd(o.min || 60, o.max || 380);
        this.parts.push({ x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), g: o.g === undefined ? (kind === 'soul' ? -40 : 620) : o.g,
          life: 0, max: rnd(o.lifeMin || 0.9, o.lifeMax || 1.7), s: rnd(o.sMin || 3, o.sMax || 8), c: cols[(Math.random() * cols.length) | 0], r: rnd(0, 6.28), vr: rnd(-9, 9), kind, drag: o.drag === undefined ? 0.4 : o.drag });
      }
      this.wake();
    },
    rain(x, w, n, kind) { for (let i = 0; i < n; i++) this.emit(rnd(x, x + w), -10, kind || 'paper', 1, { angle: 1.57, spread: 0.3, min: 80, max: 260, g: 160, lifeMin: 2.4, lifeMax: 4.2, sMin: 4, sMax: 9 }); },

    /* ---------- loop ---------- */
    wake() { this.running = true; },
    frame() {
      if (!this.running) return;
      const ctx = this.ctx, dt = Math.min(0.05, gsap.ticker.deltaRatio() / 60);
      ctx.setTransform(this.d, 0, 0, this.d, 0, 0); ctx.clearRect(0, 0, this.w, this.h);
      // bolts
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const b = this.bolts[i]; b.t += dt; if (b.t > b.life) { this.bolts.splice(i, 1); continue; }
        const k = 1 - b.t / b.life; b.flick = Math.random() < 0.28 ? 0.35 : 1;
        const a = Math.min(1, k * 1.6) * b.flick;
        for (const [w, al, col] of [[14, 0.12, b.color], [6, 0.35, b.color], [2.2, 1, '255,255,255']]) {
          ctx.strokeStyle = `rgba(${col},${al * a})`;
          for (const s of b.segs) { ctx.lineWidth = Math.max(0.6, s[4] * w / 3.2) * (0.7 + k * 0.3); ctx.globalAlpha = s[5]; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      // particles
      ctx.globalCompositeOperation = 'source-over';
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i]; p.life += dt; if (p.life > p.max || p.y > this.h + 30) { this.parts.splice(i, 1); continue; }
        p.vx *= 1 - p.drag * dt; p.vy += p.g * dt; p.vy *= 1 - p.drag * 0.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        const k = p.life / p.max, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx.globalAlpha = a;
        if (p.kind === 'paper') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 1.3)); ctx.fillStyle = p.c; ctx.fillRect(-p.s, -p.s * 0.6, p.s * 2, p.s * 1.2); ctx.strokeStyle = '#17121C'; ctx.lineWidth = 1; ctx.strokeRect(-p.s, -p.s * 0.6, p.s * 2, p.s * 1.2); ctx.restore(); }
        else if (p.kind === 'blood') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.6, p.s * 1.1, 0, 0, 6.28); ctx.fill(); }
        else { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.2); g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 2.2, 0, 6.28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      }
      ctx.globalAlpha = 1;
      if (!this.bolts.length && !this.parts.length) { this.running = false; ctx.clearRect(0, 0, this.w, this.h); }
    },

    /* ---------- bats + ambient storm ---------- */
    bat(o = {}) {
      const layer = document.getElementById('bats'), w = CP.vp.w, h = CP.vp.h;
      const depth = o.depth === undefined ? Math.random() : o.depth;                       // 0 = far (small, dim, soft) .. 1 = near
      const size = o.size || (18 + depth * 46);
      const el = U.el('div', 'bat', layer, CP.batHTML(size)); const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = o.y === undefined ? rnd(h * 0.04, h * 0.5) : o.y, dur = o.dur || (9 - depth * 4 + rnd(0, 3));
      el.style.opacity = 0.55 + depth * 0.45; if (depth < 0.35) el.style.filter = 'blur(.7px)';
      const x0 = dir > 0 ? -size * 2 : w + size * 2, x1 = dir > 0 ? w + size * 2 : -size * 2;
      gsap.set(el, { x: x0, y: y0, scaleX: dir });
      gsap.to(el, { x: x1, duration: dur, ease: 'none', onComplete: () => el.remove() });
      // erratic bat flight: a chain of swoops (up / down / dart) instead of a smooth sine
      const tl = gsap.timeline(); let y = y0, t = 0;
      while (t < dur) { const d = rnd(0.5, 1.2); y = U.clamp(y + rnd(-90, 90) * (0.5 + depth), h * 0.03, h * 0.78); tl.to(el, { y, duration: d, ease: Math.random() < 0.5 ? 'sine.inOut' : 'power2.inOut' }); t += d; }
      const wings = el.querySelectorAll('.wing'); wings.forEach((wg) => { wg.style.animationDuration = (0.13 + (1 - depth) * 0.06 + Math.random() * 0.04) + 's'; });
    },
    flock(n) { for (let i = 0; i < n; i++) gsap.delayedCall(i * 0.18, () => this.bat({ y: rnd(CP.vp.h * 0.05, CP.vp.h * 0.8), dur: rnd(3, 5.5), depth: rnd(0.4, 1) })); },
    batLoop() {
      const go = () => { if (!document.hidden && CP.store.data.settings.ambience !== false && CP.fxScale() > 0.3) this.bat(); gsap.delayedCall(rnd(7, 16), go); };
      gsap.delayedCall(4, go);
    },
    fsEmbers(on) {
      gsap.killTweensOf(this._emb); gsap.killTweensOf(this._fst); this._embOn = on; if (!on) return;
      const go = () => { if (!this._embOn) return; if (!document.hidden) this.emit(rnd(0, this.w), this.h + 6, 'ember', 1, { angle: -1.57, spread: 0.5, min: 40, max: 120, g: -26, lifeMin: 2.5, lifeMax: 4.5, sMin: 1.6, sMax: 4, drag: 0.1 }); this._emb = gsap.delayedCall(rnd(0.16, 0.3), go); };
      go();
      // the free spins sky is its own storm: violet lightning with thunder_loud
      const storm = () => {
        if (!this._embOn) return; const S = CP.store.data.settings;
        if (!document.hidden && S.lightning !== false) { const big = Math.random() < 0.4; this.strike({ power: big ? 0.95 : 0.55, shake: false, silent: !S.ambience, color: '215,160,255', x: rnd(this.w * 0.08, this.w * 0.92) }); }
        this._fst = gsap.delayedCall(rnd(6, 13), storm);
      };
      this._fst = gsap.delayedCall(rnd(3, 5), storm);
    },
    /** when the multiplier climbs, a burst of cursed pages whirls out of the dark and the sky flashes violet */
    fsSurge(mult) {
      const sc = document.getElementById('sceneFS'), ex = sc && sc.querySelector('.fs-extra'); if (!ex) return;
      sc.classList.add('surge'); gsap.delayedCall(1.3, () => sc.classList.remove('surge'));
      const n = 6 + Math.min(6, mult | 0), made = [];
      for (let i = 0; i < n; i++) {
        const d = document.createElement('div'), ang = (-90 + rnd(-60, 60)) * Math.PI / 180, dist = rnd(34, 78);
        d.className = 'fs-burst'; d.style.cssText = `--dx:${(Math.cos(ang) * dist * 1.1).toFixed(1)}vw;--dy:${(Math.sin(ang) * dist).toFixed(1)}vh;--rot:${rnd(-260, 260).toFixed(0)}deg;width:${rnd(30, 56).toFixed(0)}px;animation-delay:${(i * 0.04).toFixed(2)}s`;
        d.innerHTML = CP.fsPageSVG(500 + i + ((Math.random() * 900) | 0), i % 3 === 0); ex.appendChild(d); made.push(d);
      }
      setTimeout(() => made.forEach((d) => d.remove()), 2800);
    },
    stormLoop() {
      const go = () => {
        const S = CP.store.data.settings;
        if (!document.hidden && S.lightning !== false && CP.app && CP.app.ambientStorm()) {
          const big = Math.random() < 0.35;
          this.strike({ power: big ? 0.9 : 0.5, shake: false, silent: !S.ambience });
          if (!S.ambience) {}
          else if (big) gsap.delayedCall(0.35, () => this.skyFlash(0.5));
        }
        gsap.delayedCall(rnd(9, 22), go);
      };
      gsap.delayedCall(7, go);
    },
  });
})();
