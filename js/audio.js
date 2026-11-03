/* ==========================================================================
   audio.js — everything you hear is synthesized live with WebAudio (plus three
   tiny embedded paper/pencil clips). No audio files, no downloads.
     music   : a detuned drone + a slow music-box lullaby in A minor (+ heartbeat in free spins)
     ambience: wind, now and then a creak
     sfx     : spin, reel stops, wild/scatter hits, win chimes, thunder, big-win stingers
   ========================================================================== */
(function () {
  'use strict';
  const CP = window.CP;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // A minor (natural + the raised 7th for the creepy leading tone)
  const SCALE = [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24];
  const A2 = 110;
  const hz = (semi) => A2 * Math.pow(2, semi / 12);

  const A = (CP.audio = {
    ready: false, mode: 'base', musicOn: false, buf: {},
    init() {
      if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6;
      this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(comp); comp.connect(c.destination);
      this.sfxG = c.createGain(); this.musicG = c.createGain(); this.ambG = c.createGain();
      [this.sfxG, this.musicG, this.ambG].forEach((g) => g.connect(this.master));
      // reverb send
      this.rev = c.createConvolver(); const len = c.sampleRate * 2.4, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      this.rev.buffer = ir; this.revG = c.createGain(); this.revG.gain.value = 0.38; this.rev.connect(this.revG); this.revG.connect(this.master);
      // noise
      const nl = c.sampleRate * 2; this.noise = c.createBuffer(1, nl, c.sampleRate);
      const nd = this.noise.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      this.ready = true;
      this.apply();
      this.decodeClips();
      this.startAmbience();
    },
    decodeClips() {
      const S = window.CP_SOUNDS || {};
      Object.keys(S).forEach((k) => {
        try {
          const bin = atob(S[k]), u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          const p = this.ctx.decodeAudioData(u8.buffer, (b) => (this.buf[k] = b), () => {});
          if (p && p.catch) p.catch(() => {});
        } catch (e) { /* synth fallback is used */ }
      });
    },
    apply() {
      if (!this.ready) return;
      const s = CP.store.data.settings, t = this.ctx.currentTime;
      this.sfxG.gain.setTargetAtTime(s.sfx ? (s.sfxVol / 100) * 1.1 : 0, t, 0.04);
      this.musicG.gain.setTargetAtTime(s.music ? (s.musicVol / 100) * 0.55 : 0, t, 0.15);
      this.ambG.gain.setTargetAtTime(s.ambience && s.sfx ? (s.sfxVol / 100) * 0.7 : 0, t, 0.2);
    },
    suspend() { if (this.ready) this.ctx.suspend(); },
    resume() { if (this.ready) this.ctx.resume(); },
    get on() { return this.ready && CP.store.data.settings.sfx && this.ctx.state === 'running'; },

    /* ------------ building blocks ------------ */
    env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
    tone(type, f0, f1, dur, vol, delay = 0, dest, rev = 0) {
      const c = this.ctx, t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      this.env(g, t0, 0.006, vol, dur); o.connect(g); g.connect(dest || this.sfxG); if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(this.rev); }
      o.start(t0); o.stop(t0 + dur + 0.1);
    },
    burst(dur, type, freq, q, vol, delay = 0, sweep = 0, dest, rev = 0) {
      const c = this.ctx, t0 = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; s.loop = true;
      f.type = type; f.frequency.setValueAtTime(freq, t0); if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t0 + dur); f.Q.value = q;
      this.env(g, t0, 0.005, vol, dur); s.connect(f); f.connect(g); g.connect(dest || this.sfxG);
      if (rev) { const r = c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
      s.start(t0, Math.random()); s.stop(t0 + dur + 0.1);
    },
    clip(key, vol) {
      const b = this.buf[key]; if (!b) return false;
      const c = this.ctx, s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(this.sfxG); s.start(); return true;
    },

    /* ------------ ui + reels ------------ */
    click() { if (!this.on) return; if (this.clip('click', 0.5)) return; this.tone('square', 900, 500, 0.04, 0.08); },
    paper() { if (!this.on) return; if (this.clip('paper', 0.55)) return; this.burst(0.25, 'bandpass', 3000, 0.8, 0.2, 0, 0.5); },
    pencil() { if (!this.on) return; if (this.clip('pencil', 0.5)) return; this.burst(0.3, 'bandpass', 2400, 2, 0.1); },
    betTick(up) { if (!this.on) return; this.tone('triangle', up ? 520 : 420, up ? 640 : 330, 0.07, 0.14); this.burst(0.04, 'highpass', 3000, 0.7, 0.07); },
    creak() { if (!this.on) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(240, t + 0.55); o.frequency.linearRampToValueAtTime(130, t + 0.9);
      l.frequency.value = 23; lg.gain.value = 22; l.connect(lg); lg.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 5;
      this.env(g, t, 0.08, 0.1, 0.85); o.connect(f); f.connect(g); g.connect(this.sfxG); o.start(t); l.start(t); o.stop(t + 1); l.stop(t + 1); },
    spinStart() { if (!this.on) return; this.paper(); this.burst(0.5, 'bandpass', 500, 1.2, 0.2, 0, 4, null, 0.2); this.tone('sine', 90, 55, 0.35, 0.3); },
    reelStop(i, tense) {
      if (!this.on) return;
      this.tone('sine', 150 + i * 6, 62, 0.16, 0.5); this.burst(0.07, 'lowpass', 900, 0.8, 0.28);
      this.burst(0.05, 'highpass', 2800, 0.8, 0.1);                       // paper slap
      if (tense) this.tone('sine', 52, 42, 0.5, 0.5, 0, null, 0.3);
    },
    scatterLand(n) { if (!this.on) return; const b = 330 + n * 70; this.tone('sine', b, b, 1.1, 0.2, 0, null, 0.6); this.tone('triangle', b * 1.5, b * 1.5, 0.9, 0.12, 0.04, null, 0.6); this.tone('sine', b * 2.01, b * 2.01, 0.6, 0.08, 0.08, null, 0.8); this.burst(0.5, 'bandpass', 4000, 3, 0.07, 0, 0.5, null, 0.4); },
    wildLand() { if (!this.on) return; this.tone('sawtooth', 220, 110, 0.35, 0.12, 0, null, 0.5); this.tone('sine', 880, 1320, 0.25, 0.12); this.burst(0.3, 'bandpass', 1800, 3, 0.1, 0, 0.3, null, 0.4); },
    heart(vol = 0.5) { if (!this.on) return; this.tone('sine', 62, 38, 0.2, vol); this.tone('sine', 58, 36, 0.22, vol * 0.8, 0.17); },
    tense() { if (!this.on) return; this.heart(0.55); this.tone('sawtooth', 70, 140, 1.6, 0.05, 0, null, 0.7); },
    thunder(power = 1) {
      if (!this.ready || !CP.store.data.settings.sfx) return;
      const c = this.ctx, t = c.currentTime + 0.02;
      this.burst(0.18, 'highpass', 1800, 0.5, 0.5 * power);                         // crack
      this.tone('sine', 90, 28, 2.6 * (0.7 + power * 0.3), 0.55 * power, 0.05, null, 0.4);
      const dur = 2.2 + power * 1.4;
      this.burst(dur, 'lowpass', 600 + power * 200, 0.7, 0.5 * power, 0.12, 0.18, null, 0.6);
      this.burst(dur * 0.8, 'lowpass', 260, 0.6, 0.35 * power, 0.5, 0.4, null, 0.5);
    },
    bolt() { if (!this.on) return; this.burst(0.4, 'highpass', 3500, 0.6, 0.45, 0, 0.5); this.tone('sawtooth', 2200, 90, 0.4, 0.2); this.thunder(1.1); },
    /* ------------ wins ------------ */
    winChime(level = 0) {
      if (!this.on) return;
      const base = [0, 3, 7, 12, 15, 19, 24];
      const n = 3 + Math.min(3, level);
      for (let i = 0; i < n; i++) this.tone(i % 2 ? 'triangle' : 'sine', hz(12 + base[i]) * 2, hz(12 + base[i]) * 2, 0.9, 0.16, i * 0.09, null, 0.7);
    },
    tick(p = 0) { if (!this.on) return; this.tone('square', 600 + p * 800, 600 + p * 800, 0.03, 0.045); },
    skullHit() { if (!this.on) return; this.tone('sine', 130, 45, 0.5, 0.5); this.tone('sawtooth', 65, 65, 0.4, 0.1, 0, null, 0.3); },
    bigStinger(tier) {
      if (!this.on) return;
      const lvl = tier === 'epic' ? 3 : tier === 'mega' ? 2 : 1;
      this.thunder(0.9 + lvl * 0.2);
      for (let i = 0; i < 5 + lvl * 2; i++) this.tone(i % 2 ? 'sawtooth' : 'triangle', hz(12 + SCALE[(i * 2) % 8]) , hz(12 + SCALE[(i * 2) % 8]), 0.8, 0.09, 0.15 + i * 0.12, null, 0.8);
      this.tone('sawtooth', hz(0), hz(0), 2.2, 0.16, 0.1, null, 0.5); this.tone('sawtooth', hz(7) * 1.005, hz(7), 2.2, 0.12, 0.1, null, 0.5);
      for (let i = 0; i < lvl; i++) this.tone('sine', 60, 30, 0.6, 0.6, 0.6 + i * 0.5);
    },
    fsIntro() { if (!this.on) return; this.thunder(1.2); for (let i = 0; i < 6; i++) this.tone('sine', hz(12 + SCALE[i]) , hz(12 + SCALE[i]), 1.6, 0.14, 0.2 + i * 0.28, null, 0.9);
      for (let i = 0; i < 3; i++) this.tone('sine', 110, 108, 1.8, 0.4, 0.1 + i * 1.1, null, 0.8); },
    toll() { if (!this.on) return; [1, 2.76, 5.4, 8.9].forEach((m, i) => this.tone('sine', 98 * m, 98 * m, 3.2 / (1 + i * 0.7), 0.3 / (1 + i * 0.6), 0, null, 0.8)); },
    multUp(n) { if (!this.on) return; this.tone('sawtooth', 160 + n * 40, 480 + n * 90, 0.5, 0.12, 0, null, 0.4); this.tone('sine', 660 + n * 60, 660 + n * 60, 0.4, 0.14, 0.2, null, 0.6); },

    /* ------------ intro cinematic ------------ */
    chain(n = 6) { if (!this.on) return; for (let i = 0; i < n; i++) { const d = i * 0.07 + Math.random() * 0.04; this.tone('square', 2400 + Math.random() * 1800, 1300, 0.05, 0.05, d, null, 0.3); this.burst(0.05, 'bandpass', 5200, 4, 0.08, d); } },
    snap() { if (!this.on) return; this.burst(0.25, 'highpass', 2500, 0.6, 0.6); this.tone('sawtooth', 380, 60, 0.35, 0.3, 0, null, 0.4); for (let i = 0; i < 5; i++) this.tone('square', 3000 + i * 400, 900, 0.07, 0.06, 0.05 + i * 0.05, null, 0.5); },
    whoosh(up = true, dur = 1.2, vol = 0.3) { if (!this.on) return; this.burst(dur, 'bandpass', up ? 300 : 3000, 1.1, vol, 0, up ? 8 : 0.1, null, 0.5); },
    swell(dur = 5, vol = 0.1) { if (!this.on) return; [0, 7, 12, 15].forEach((st, i) => { const f = hz(st), t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f * (1 + (i - 1.5) * 0.002); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2400, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6); o.connect(lp); lp.connect(g); g.connect(this.sfxG); const r = this.ctx.createGain(); r.gain.value = 0.8; g.connect(r); r.connect(this.rev); o.start(t); o.stop(t + dur + 0.8); }); },
    boom() { if (!this.on) return; this.tone('sine', 82, 26, 2.2, 0.8); this.tone('sine', 55, 30, 1.6, 0.5, 0.02, null, 0.6); this.burst(0.5, 'lowpass', 700, 0.7, 0.5, 0, 0.3, null, 0.6); this.thunder(1.4); },
    flip() { if (!this.on) return; this.paper(); this.whoosh(true, 0.35, 0.16); },

    /* ------------ ambience + music ------------ */
    startAmbience() {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.9; g.gain.value = 0.22;
      l.frequency.value = 0.09; lg.gain.value = 260; l.connect(lg); lg.connect(f.frequency);
      const l2 = c.createOscillator(), lg2 = c.createGain(); l2.frequency.value = 0.13; lg2.gain.value = 0.12; l2.connect(lg2); lg2.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(this.ambG); s.start(); l.start(); l2.start(); l2.frequency.value = 0.13;
      const creaker = () => { if (CP.audio.ready && Math.random() < 0.6 && !document.hidden && CP.store.data.settings.ambience) this.creak(); setTimeout(creaker, rnd(14000, 30000)); };
      setTimeout(creaker, 12000);
    },
    startMusic() {
      if (!this.ready || this.musicOn) return; this.musicOn = true;
      const c = this.ctx;
      // drone
      this.droneG = c.createGain(); this.droneG.gain.value = 0.0001; this.droneG.connect(this.musicG);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 3; lp.connect(this.droneG); this.droneLp = lp;
      [A2 / 2, A2 / 2 * 1.006, A2 * 0.75, A2 * 1.5 * 0.994].forEach((f, i) => { const o = c.createOscillator(); o.type = i === 3 ? 'triangle' : 'sawtooth'; o.frequency.value = f; const g = c.createGain(); g.gain.value = i === 3 ? 0.25 : 0.35; o.connect(g); g.connect(lp); o.start(); });
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.07; lg.gain.value = 180; l.connect(lg); lg.connect(lp.frequency); l.start();
      this.droneG.gain.linearRampToValueAtTime(0.5, c.currentTime + 4);
      this.step = 0; this.nextT = c.currentTime + 0.5;
      this.sched = setInterval(() => this.schedule(), 120);
    },
    setMode(m) {
      this.mode = m; if (!this.ready || !this.droneLp) return;
      this.droneLp.frequency.setTargetAtTime(m === 'fs' ? 620 : 380, this.ctx.currentTime, 1.2);
    },
    schedule() {
      const c = this.ctx; if (!c || c.state !== 'running') return;
      const fs = this.mode === 'fs', beat = fs ? 0.34 : 0.5;
      while (this.nextT < c.currentTime + 0.4) {
        const t = this.nextT, s = this.step;
        // lullaby: 3/4 waltz, a slow wandering melody with a bar of rest every few bars
        const bar = Math.floor(s / 3), pos = s % 3, rest = bar % 4 === 3;
        if (!rest && (pos === 0 || Math.random() < (fs ? 0.8 : 0.45))) {
          const motif = [7, 5, 4, 2, 4, 7, 9, 11, 9, 7, 5, 4, 2, 0, 2, 4];
          const note = SCALE[motif[(bar * 3 + pos) % motif.length] % SCALE.length] + (Math.random() < 0.12 ? -12 : 0);
          this.music(hz(24 + note), t, fs ? 0.9 : 1.2, pos === 0 ? 0.17 : 0.1);
        }
        if (pos === 0 && bar % 2 === 0) this.music(hz(SCALE[[0, 5, 3, 4][(bar / 2) % 4 | 0]]), t, 2, 0.16, true);   // bass pad note
        if (fs && pos === 0) { this.tone('sine', 60, 38, 0.2, 0.35 * (CP.store.data.settings.musicVol / 100), t - c.currentTime, this.musicG); this.tone('sine', 56, 36, 0.2, 0.26 * (CP.store.data.settings.musicVol / 100), t - c.currentTime + 0.16, this.musicG); }
        this.step++; this.nextT += beat;
      }
    },
    music(f, t, dur, vol, pad) {
      const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = pad ? 'triangle' : 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * (pad ? 1.003 : 2.756);   // inharmonic partial = music box
      const g2 = c.createGain(); g2.gain.value = pad ? 0.5 : 0.18; o2.connect(g2); g2.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (pad ? 0.4 : 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (pad ? 1.6 : 1));
      o.connect(g); g.connect(this.musicG); const r = c.createGain(); r.gain.value = 0.7; g.connect(r); r.connect(this.rev);
      o.start(t); o2.start(t); o.stop(t + dur * 1.7 + 0.1); o2.stop(t + dur * 1.7 + 0.1);
    },
  });

  /* ==========================================================================
     v4 — the supplied sound files. Short effects are embedded (assets.js) and decoded;
     long ones (music, thunder, ambience) are streamed. The synthesized sounds above stay:
     they are the fallback when a file cannot load, and everything not covered by a file.
     ========================================================================== */
  const U = CP.U, synth = { thunder: A.thunder, reelStop: A.reelStop, scatterLand: A.scatterLand, wildLand: A.wildLand, startMusic: A.startMusic, apply: A.apply };
  const GRAPH = /^https?:/.test(location.protocol);         // file:// cannot route <audio> into WebAudio (it would be silent)
  const FILES = {
    main: 'sounds/main.mp3', fs: 'sounds/freespin.mp3', tDist: 'sounds/thunder_distant.mp3', tLoud: 'sounds/thunder_loud.mp3', tLoudFx: 'sounds/thunder_loud.mp3',
    wind1: 'sounds/amb_wind1.mp3', wind2: 'sounds/amb_wind2.mp3', bell: 'sounds/amb_bell.mp3', whisper: 'sounds/amb_whisper.mp3', owl: 'sounds/amb_owl.mp3', bat: 'sounds/amb_bat.mp3',
  };
  A.streams = {}; A.fileMusic = false;
  A.stream = function (key, loop) {
    if (this.streams[key]) return this.streams[key];
    const a = new Audio(); a.src = FILES[key]; a.loop = !!loop; a.preload = 'auto'; a.setAttribute('playsinline', '');
    const st = (this.streams[key] = { key, a, base: 1, lvl: 0, gain: null, want: false, failed: false });
    a.addEventListener('error', () => { st.failed = true; if (key === 'main' && A.fileMusic) { A.fileMusic = false; A.musicOn = false; synth.startMusic.call(A); } });
    if (GRAPH && this.ready) { try { st.gain = this.ctx.createGain(); st.gain.gain.value = 0; this.ctx.createMediaElementSource(a).connect(st.gain); st.gain.connect(this.master); } catch (e) { st.gain = null; } }
    if (!st.gain) a.volume = 0;
    st.set = (v, dur) => {                                    // volume, with a fade (seconds)
      st.lvl = v; dur = dur === undefined ? 0.25 : dur;
      if (st.gain) st.gain.gain.setTargetAtTime(v, A.ctx.currentTime, Math.max(0.005, dur / 3));
      else { gsap.killTweensOf(a); gsap.to(a, { volume: U.clamp(v, 0, 1), duration: dur, ease: 'none' }); }
    };
    st.play = (fromStart) => { try { if (fromStart) a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); st.want = true; } catch (e) {} };
    st.stop = () => { st.want = false; try { a.pause(); } catch (e) {} };
    return st;
  };
  /** must run inside the first tap: lets iOS/Safari play every element later on */
  A.unlock = function () {
    if (this._unlocked) return; this._unlocked = true;
    Object.keys(FILES).forEach((k) => { const st = this.stream(k, k === 'main' || k === 'fs'); const a = st.a; a.muted = true; const p = a.play(); if (p && p.then) p.then(() => { if (!st.want) { a.pause(); a.currentTime = 0; } a.muted = false; }, () => { a.muted = false; }); else a.muted = false; });
  };
  const S = () => CP.store.data.settings;
  A.musicLevel = () => (S().music ? (S().musicVol / 100) * 0.62 : 0);
  A.sfxScale = () => (S().sfx ? S().sfxVol / 100 : 0);
  A.ambScale = () => (S().sfx && S().ambience ? S().sfxVol / 100 : 0);

  /* ---- music: main bg, and a slow cross-fade to the free spins bg ---- */
  A.startMusic = function () {
    if (!this.ready || this.musicOn) return; this.musicOn = true; this.fileMusic = true;
    const m = this.stream('main', true), f = this.stream('fs', true);
    m.base = 1; f.base = 1;
    m.set(0, 0); m.play(true); m.set(this.mode === 'fs' ? 0 : this.musicLevel(), 4);
    this.startThunder(); this.startAmbientLoop();
  };
  A.setMode = function (m) {
    this.mode = m; if (!this.ready) return;
    if (this.droneLp) this.droneLp.frequency.setTargetAtTime(m === 'fs' ? 620 : 380, this.ctx.currentTime, 1.2);
    if (!this.fileMusic) return;
    const main = this.stream('main', true), fs = this.stream('fs', true), lv = this.musicLevel(), D = 5;       // 5 s: never a sudden change
    if (m === 'fs') { fs.set(0, 0); fs.play(true); fs.set(lv, D); main.set(0, D); clearTimeout(this._xf); this._xf = setTimeout(() => { if (this.mode === 'fs') main.stop(); }, D * 1000 + 300); }
    else { main.play(); main.set(lv, D); fs.set(0, D); clearTimeout(this._xf); this._xf = setTimeout(() => { if (this.mode !== 'fs') fs.stop(); }, D * 1000 + 300); }
  };

  /* ---- distant-thunder, loud-thunder, 10 s of silence, again ---- */
  const playOnce = (st, lvl, fade) => new Promise((res) => {
    st.base = lvl; st.set(0, 0); st.play(true); st.set(lvl, fade || 0.2);
    let done = false; const fin = () => { if (done) return; done = true; st.a.removeEventListener('ended', fin); st.stop(); res(); };
    st.a.addEventListener('ended', fin); setTimeout(fin, 40000);
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /* ---- thunder for every lightning animation = the real thunder_loud file (synth only if the file cannot load) ---- */
  A.thunder = function (power = 1) {
    if (!this.ready || !S().sfx) return;
    const st = this.stream('tLoudFx', false);
    if (st.failed || st.a.error) { synth.thunder.call(this, power); return; }
    const lvl = U.clamp((0.55 + 0.3 * power) * this.sfxScale(), 0, 1);
    st.base = lvl; st.set(0, 0); st.play(true); st.set(lvl, 0.03);
  };
  A.startThunder = function () {
    if (this._thOn) return; this._thOn = true;
    const dist = this.stream('tDist', false), loud = this.stream('tLoud', false);
    (async () => {
      await sleep(6000);
      while (this._thOn) {
        if (document.hidden || !this.ambScale()) { await sleep(2000); continue; }
        if (CP.fx && CP.store.data.settings.lightning !== false) CP.fx.skyFlash(0.3);
        await playOnce(dist, 0.9 * this.ambScale(), 1.5);
        if (!this._thOn) break;
        if (CP.fx && CP.store.data.settings.lightning !== false) CP.fx.strike({ power: 0.9, silent: true, shake: false });
        await playOnce(loud, 0.75 * this.ambScale(), 0.05);
        await sleep(10000);                                        // 10 s gap, then both again
      }
    })();
  };

  /* ---- ambience: one sound after another, in a random order, forever ---- */
  const AMB = [['wind1', 0.34, 3], ['wind2', 0.34, 3], ['bell', 0.5, 1], ['whisper', 0.55, 1], ['owl', 0.5, 1], ['bat', 0.5, 1]];
  A.startAmbientLoop = function () {
    if (this._ambOn) return; this._ambOn = true; let last = -1;
    (async () => {
      await sleep(3000);
      while (this._ambOn) {
        if (document.hidden || !this.ambScale()) { await sleep(2000); continue; }
        const pool = []; AMB.forEach((a, i) => { if (i !== last) for (let k = 0; k < a[2]; k++) pool.push(i); });
        last = pool[(Math.random() * pool.length) | 0]; const [key, lvl] = AMB[last], st = this.stream(key, false);
        const fadeOut = () => { if (st.a.duration && isFinite(st.a.duration)) setTimeout(() => st.set(0, 0.9), Math.max(0, (st.a.duration - 1) * 1000)); };
        st.a.addEventListener('loadedmetadata', fadeOut, { once: true }); if (st.a.readyState >= 1) fadeOut();
        await playOnce(st, lvl * this.ambScale(), 0.6);
        await sleep(2500 + Math.random() * 5500);
      }
    })();
  };

  /* ---- levels follow the settings ---- */
  A.apply = function () {
    synth.apply.call(this); if (!this.ready) return;
    if (this.fileMusic) {
      const lv = this.musicLevel(), m = this.streams.main, f = this.streams.fs;
      if (m && m.want && this.mode !== 'fs') m.set(lv, 0.2); if (f && f.want && this.mode === 'fs') f.set(lv, 0.2);
    }
    ['tDist', 'tLoud', 'wind1', 'wind2', 'bell', 'whisper', 'owl', 'bat'].forEach((k) => { const st = this.streams[k]; if (st && st.want) st.set(st.base * (this.ambScale() ? 1 : 0), 0.2); });
  };

  /* ---- effects from files (synth versions remain as fallback) ---- */
  A.reelStart = function (i) { if (!this.on) return; if (this.buf.rot) this.clip('rot', 0.7); };
  A.reelStop = function (i, tense) {
    if (this.on && this.buf.stop) { this.clip('stop', 1.2); if (tense) this.tone('sine', 52, 42, 0.5, 0.4, 0, null, 0.3); } else synth.reelStop.call(this, i, tense);
  };
  A.scatterLand = function (n) { if (this.on && this.buf.scatter) this.clip('scatter', 0.95); else synth.scatterLand.call(this, n); };
  A.wildLand = function () { if (this.on && this.buf.wild) this.clip('wild', 0.95); else synth.wildLand.call(this); };
  A.winGlow = function () { if (this.on) this.clip('glow', 0.85); };
  A.bigAppear = function () { if (this.on) this.clip('appear', 0.9); };
  A.transIn = function () { if (!this.on) return; this.whoosh(true, 1.2, 0.34); this.swell(2.4, 0.09); this.creak(); };
  A.transOut = function () { if (!this.on) return; this.whoosh(false, 1.1, 0.3); this.tone('sine', 70, 38, 0.9, 0.4); };
  document.addEventListener('visibilitychange', () => {
    Object.keys(A.streams).forEach((k) => { const st = A.streams[k]; if (document.hidden) { if (st.want) { st._was = true; try { st.a.pause(); } catch (e) {} } } else if (st._was) { st._was = false; st.play(); } });
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) A.suspend(); else A.resume(); });
})();
