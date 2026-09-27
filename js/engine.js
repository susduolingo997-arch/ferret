/* =====================================================================
   FERRET: THE HIDDEN PATH
   engine.js - shared utilities, input, audio synthesis, procedural
   textures and materials. Everything hangs off the global `G`.
   ===================================================================== */
'use strict';
const G = (window.G = window.G || {});
/* chapters after the music box: the epilogue (6) and the sequel chapters (10+) */
G.isPost = (c) => c === 6 || c >= 10;

/* ---------------------------------------------------------------- Utils */
G.U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)),
  smooth: (t) => t * t * (3 - 2 * t),
  angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  dampAngle(a, b, k, dt) { return a + G.U.angDiff(a, b) * (1 - Math.exp(-k * dt)); },
  rng(seed) {
    let s = seed >>> 0;
    return function () { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; },
  hexLerp(c1, c2, t) { return new THREE.Color(c1).lerp(new THREE.Color(c2), t); },
  storage: {
    mem: {},
    get(k) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} return k in this.mem ? this.mem[k] : null; },
    set(k, v) { this.mem[k] = v; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch (e) {} },
  },
};

/* ---------------------------------------------------------------- Input
   Keyboard, mouse (drag or pointer lock), gamepad and touch all feed
   into a single set of actions the game reads each frame.            */
G.Input = {
  keys: {}, pressedQ: {}, lookX: 0, lookY: 0, wheel: 0,
  moveX: 0, moveY: 0, run: false, dragging: false, locked: false,
  touch: { active: false, jx: 0, jy: 0, run: false },
  pad: { prev: {}, now: {} },
  lastDevice: 'kb',
  init(canvas) {
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (!this.keys[e.code]) this.pressedQ[e.code] = true;
      this.keys[e.code] = true; this.lastDevice = 'kb';
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('mousedown', (e) => {
      this.dragging = true; this.lastDevice = 'kb';
      if (G.game && G.game.state === 'play' && !this.locked && e.button === 0 && G.settings && G.settings.pointerLock) {
        try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) {}
      }
    });
    addEventListener('mouseup', () => { this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (this.locked || this.dragging) { this.lookX += e.movementX; this.lookY += e.movementY; }
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.initTouch();
  },
  unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} },
  initTouch() {
    const tc = document.getElementById('touch');
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (isTouch || coarse) document.body.classList.add('has-touch');
    addEventListener('touchstart', () => { document.body.classList.add('has-touch'); this.lastDevice = 'touch'; }, { passive: true });
    // the on-screen interaction prompt is itself a button on touch screens
    const pr = document.getElementById('prompt');
    const tapPrompt = (e) => { e.preventDefault(); this.pressedQ.T_interact = true; this.lastDevice = 'touch'; };
    pr.addEventListener('touchstart', tapPrompt, { passive: false }); pr.addEventListener('click', tapPrompt);
    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const btn = t.target.closest && t.target.closest('[data-act]');
        if (btn) continue;
        if (t.clientX < innerWidth * 0.45 && stickId === null) {
          stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          stick.style.left = sx - 60 + 'px'; stick.style.top = sy - 60 + 'px'; stick.classList.add('on');
        } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      this.lastDevice = 'touch';
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy; const l = Math.hypot(dx, dy), m = 50;
          if (l > m) { dx = (dx / l) * m; dy = (dy / l) * m; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.touch.jx = dx / m; this.touch.jy = dy / m; this.touch.run = l > m * 0.95;
        } else if (t.identifier === lookId) {
          this.lookX += (t.clientX - lx) * 1.6; this.lookY += (t.clientY - ly) * 1.6; lx = t.clientX; ly = t.clientY;
        }
      }
      if (G.game && G.game.state === 'play') e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.touch.jx = this.touch.jy = 0; knob.style.transform = ''; stick.classList.remove('on'); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    const cv = this.canvas;
    cv.addEventListener('touchstart', onStart, { passive: true });
    cv.addEventListener('touchmove', onMove, { passive: false });
    cv.addEventListener('touchend', onEnd); cv.addEventListener('touchcancel', onEnd);
    tc.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('touchstart', (e) => { e.preventDefault(); const a = b.dataset.act; this.pressedQ['T_' + a] = true; this.keys['T_' + a] = true; this.lastDevice = 'touch'; }, { passive: false });
      b.addEventListener('touchend', (e) => { e.preventDefault(); this.keys['T_' + b.dataset.act] = false; }, { passive: false });
      b.addEventListener('click', () => { this.pressedQ['T_' + b.dataset.act] = true; });
    });
  },
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null; for (const g of pads) if (g && g.connected) { p = g; break; }
    this.pad.prev = this.pad.now; this.pad.now = {};
    if (!p) return null;
    const b = (i) => p.buttons[i] && p.buttons[i].pressed;
    const n = this.pad.now;
    n.a = b(0); n.b = b(1); n.x = b(2); n.y = b(3); n.lb = b(4); n.rb = b(5); n.lt = b(6); n.rt = b(7);
    n.back = b(8); n.start = b(9); n.up = b(12); n.down = b(13); n.left = b(14); n.right = b(15);
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    n.lx = dz(p.axes[0] || 0); n.ly = dz(p.axes[1] || 0); n.rx = dz(p.axes[2] || 0); n.ry = dz(p.axes[3] || 0);
    if (n.lx || n.ly || n.a || n.b || n.x || n.y || n.start) this.lastDevice = 'pad';
    return p;
  },
  padPressed(k) { return this.pad.now[k] && !this.pad.prev[k]; },
  /* Action edges: true only on the frame the action starts */
  pressed(act) {
    const q = this.pressedQ, P = (k) => this.padPressed(k);
    switch (act) {
      case 'interact': return q.KeyE || q.Enter || q.T_interact || P('x');
      case 'jump': return q.Space || q.T_jump || P('a');
      case 'scent': return q.KeyQ || q.T_scent || P('y');
      case 'inventory': return q.KeyI || q.Tab || q.T_inv || P('back');
      case 'map': return q.KeyM || q.T_map || P('lb');
      case 'pause': return q.Escape || q.KeyP || q.T_pause || P('start');
      case 'dance': return q.KeyF || P('rb') && this.pad.now.lb;
      case 'confirm': return q.KeyE || q.Enter || q.Space || q.T_interact || P('a') || P('x');
      case 'back': return q.Escape || P('b');
      case 'up': return q.ArrowUp || q.KeyW || P('up');
      case 'down': return q.ArrowDown || q.KeyS || P('down');
      case 'n1': return q.Digit1; case 'n2': return q.Digit2; case 'n3': return q.Digit3;
      case 'history': return q.KeyH;
    }
    return false;
  },
  update() {
    this.pollPad();
    const k = this.keys, n = this.pad.now;
    let x = 0, y = 0;
    if (k.KeyA || k.ArrowLeft) x -= 1; if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1; if (k.KeyS || k.ArrowDown) y += 1;
    x += n.lx || 0; y += n.ly || 0; x += this.touch.jx; y += this.touch.jy;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    this.moveX = x; this.moveY = y;
    this.run = !!(k.ShiftLeft || k.ShiftRight || n.rt || n.rb || this.touch.run || k.T_run);
    if (n.rx || n.ry) { this.lookX += n.rx * 14; this.lookY += n.ry * 9; }
  },
  endFrame() { this.pressedQ = {}; this.lookX = 0; this.lookY = 0; this.wheel = 0; },
};

/* ---------------------------------------------------------------- Audio
   All sound is synthesised with the Web Audio API: Karplus-Strong guitar
   plucks for the music, a bell synth for the music box, filtered noise
   for rain / wind / water, and small envelopes for every sound effect. */
G.Audio = {
  ctx: null, ready: false, ks: {}, layers: {}, lvl: {},
  init() {
    if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.connect(c.destination);
    this.music = c.createGain(); this.sfx = c.createGain(); this.amb = c.createGain();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(this.master);
    this.music.connect(comp); this.sfx.connect(comp); this.amb.connect(comp);
    // warm lowpass on the music bus
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 3800; this.musicLP.connect(this.music);
    // reverb send shared by music and sfx
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.6); const vg = c.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(comp);
    this.verbSend = c.createGain(); this.verbSend.gain.value = 1; this.verbSend.connect(this.verb);
    this.white = this.noiseBuf('white'); this.brown = this.noiseBuf('brown');
    this.makeLayers();
    this.applyVolumes();
    this.ready = true; this.next = c.currentTime + 0.2; this.step = 0; this.bar = 0;
    this.sched = setInterval(() => this.schedule(), 90);
  },
  applyVolumes() {
    if (!this.ctx) return; const s = G.settings || {};
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(s.muteMusic ? 0 : (s.music ?? 0.6) * 0.55, t, 0.2);
    this.sfx.gain.setTargetAtTime(s.muteSfx ? 0 : (s.sfx ?? 0.8), t, 0.1);
    this.amb.gain.setTargetAtTime(s.muteSfx ? 0 : (s.amb ?? 0.7), t, 0.2);
  },
  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    return b;
  },
  noiseBuf(kind) {
    const c = this.ctx, n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  },
  loopSrc(buf) { const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; },
  makeLayers() {
    const c = this.ctx;
    const mk = (name, build) => { const g = c.createGain(); g.gain.value = 0; build(g); g.connect(this.amb); this.layers[name] = g; this.lvl[name] = 0; };
    mk('rain', (g) => { const s = this.loopSrc(this.white); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; s.connect(hp); hp.connect(lp); lp.connect(g); });
    mk('wind', (g) => { const s = this.loopSrc(this.brown); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 350; bp.Q.value = 0.7; const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(bp.frequency); lfo.start(); s.connect(bp); bp.connect(g); });
    mk('creek', (g) => { const s = this.loopSrc(this.white); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6; const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2600; bp2.Q.value = 3; const lfo = c.createOscillator(); lfo.frequency.value = 3.3; const lg = c.createGain(); lg.gain.value = 700; lfo.connect(lg); lg.connect(bp2.frequency); lfo.start(); s.connect(bp); s.connect(bp2); const m = c.createGain(); m.gain.value = 0.5; bp2.connect(m); m.connect(g); bp.connect(g); });
    mk('hum', (g) => { const o = c.createOscillator(); o.frequency.value = 58; const o2 = c.createOscillator(); o2.frequency.value = 117; const g2 = c.createGain(); g2.gain.value = 0.3; o.connect(g); o2.connect(g2); g2.connect(g); o.start(); o2.start(); });
    mk('cave', (g) => { const s = this.loopSrc(this.brown); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; s.connect(lp); lp.connect(g); });
    this.timers = { cricket: 0, bird: 2, creak: 5, owl: 9, drip: 1, tick: 0, frog: 4 };
  },
  setLayer(name, v) { if (!this.ready) return; this.lvl[name] = v; this.layers[name].gain.setTargetAtTime(v, this.ctx.currentTime, 0.6); },
  /* periodic ambient events driven by the game each frame */
  tickAmbient(dt, env) {
    if (!this.ready) return; const T = this.timers;
    for (const k in T) T[k] -= dt;
    if (env.crickets > 0.05 && T.cricket <= 0) { T.cricket = 0.4 + Math.random() * 1.4; this.cricket(env.crickets); }
    if (env.birds > 0.05 && T.bird <= 0) { T.bird = 1.2 + Math.random() * 4; this.bird(env.birds); }
    if (env.creaks > 0.05 && T.creak <= 0) { T.creak = 7 + Math.random() * 12; this.creak(env.creaks); }
    if (env.owl > 0.05 && T.owl <= 0) { T.owl = 12 + Math.random() * 16; this.owl(env.owl); }
    if (env.drips > 0.05 && T.drip <= 0) { T.drip = 0.3 + Math.random() * 1.5; this.drip(env.drips); }
    if (env.frogs > 0.05 && T.frog <= 0) { T.frog = 1.5 + Math.random() * 4; this.frog(env.frogs); }
    if (env.clock > 0.05 && T.tick <= 0) { T.tick = 1; this.tone({ f: 2400, type: 'square', dur: 0.015, vol: 0.03 * env.clock, lp: 3000 }); }
  },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  tone(o) {
    if (!this.ready) return; const c = this.ctx, t = (o.when || c.currentTime) + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur));
    const g = c.createGain(); this.env(g, t, o.a || 0.005, o.vol || 0.2, o.dur);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g); g.connect(o.out || this.sfx); if (o.verb) { const s = c.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(this.verbSend); }
    osc.start(t); osc.stop(t + (o.a || 0.005) + o.dur + 0.05);
  },
  noise(o) {
    if (!this.ready) return; const c = this.ctx, t = (o.when || c.currentTime) + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = o.brown ? this.brown : this.white; s.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = c.createGain(); this.env(g, t, o.a || 0.003, o.vol || 0.2, o.dur);
    s.connect(f); f.connect(g); g.connect(o.out || this.sfx);
    if (o.pan !== undefined && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.disconnect(); g.connect(p); p.connect(o.out || this.sfx); }
    if (o.verb) { const vs = c.createGain(); vs.gain.value = o.verb; g.connect(vs); vs.connect(this.verbSend); }
    s.start(t, Math.random() * 2); s.stop(t + o.dur + 0.1);
  },
  /* -------- sound effects */
  play(name, v = 1) {
    if (!this.ready) return;
    const R = Math.random;
    switch (name) {
      case 'step-wood': this.noise({ f: 1800 + R() * 500, q: 2, dur: 0.05, vol: 0.05 * v }); break;
      case 'step-tile': this.noise({ f: 3200 + R() * 400, q: 3, dur: 0.035, vol: 0.045 * v }); break;
      case 'step-grass': this.noise({ f: 4200 + R() * 1500, q: 0.7, dur: 0.08, vol: 0.04 * v, ft: 'highpass' }); break;
      case 'step-dirt': this.noise({ f: 900 + R() * 300, q: 1.2, dur: 0.07, vol: 0.05 * v }); break;
      case 'step-stone': this.noise({ f: 2600 + R() * 400, q: 4, dur: 0.03, vol: 0.05 * v }); break;
      case 'step-rug': this.noise({ f: 700, q: 0.8, dur: 0.05, vol: 0.02 * v }); break;
      case 'step-water': this.noise({ f: 1400 + R() * 600, q: 1.5, dur: 0.12, vol: 0.07 * v, f2: 600 }); break;
      case 'step-leaves': this.noise({ f: 3000 + R() * 2000, q: 0.5, dur: 0.1, vol: 0.05 * v, ft: 'highpass' }); break;
      case 'jump': this.noise({ f: 800, f2: 2400, q: 0.8, dur: 0.12, vol: 0.05 }); break;
      case 'land': this.noise({ f: 300, q: 1, dur: 0.08, vol: 0.12, brown: true, ft: 'lowpass' }); break;
      case 'dook': { // the happy ferret chuckle
        const n = 3 + Math.floor(R() * 3), b = 700 + R() * 250;
        for (let i = 0; i < n; i++) this.tone({ f: b * (1 + (i % 2) * 0.12), f2: b * 0.7, type: 'triangle', dur: 0.045, vol: 0.09 * v, delay: i * 0.075, lp: 2400 });
        break;
      }
      case 'squeak': this.tone({ f: 1600, f2: 2300, type: 'sine', dur: 0.09, vol: 0.06 * v, lp: 3000 }); break;
      case 'sniff': for (let i = 0; i < 3; i++) this.noise({ f: 5000, q: 1, dur: 0.05, vol: 0.05, delay: i * 0.1, ft: 'highpass' }); break;
      case 'dig': for (let i = 0; i < 4; i++) this.noise({ f: 500 + R() * 400, q: 0.9, dur: 0.09, vol: 0.12, delay: i * 0.11, brown: true, ft: 'lowpass' }); break;
      case 'pickup': [0, 4, 7, 12].forEach((s, i) => this.bell(76 + s, 0.12, i * 0.07)); break;
      case 'collect': [0, 7, 12, 16, 19].forEach((s, i) => this.bell(72 + s, 0.1, i * 0.06)); break;
      case 'quest': [0, 4, 7, 11, 14].forEach((s, i) => this.pluck(60 + s, 0.5, i * 0.09)); break;
      case 'ui': this.tone({ f: 880, type: 'sine', dur: 0.05, vol: 0.05 }); break;
      case 'ui-open': this.tone({ f: 660, type: 'sine', dur: 0.08, vol: 0.05 }); this.tone({ f: 990, type: 'sine', dur: 0.1, vol: 0.05, delay: 0.06 }); break;
      case 'ui-close': this.tone({ f: 990, type: 'sine', dur: 0.06, vol: 0.05 }); this.tone({ f: 660, type: 'sine', dur: 0.08, vol: 0.05, delay: 0.05 }); break;
      case 'type': this.tone({ f: 1200 + R() * 300, type: 'sine', dur: 0.015, vol: 0.02 * v }); break;
      case 'door': this.tone({ f: 120, f2: 190, type: 'sawtooth', dur: 0.5, vol: 0.05, lp: 900, slide: 0.5 }); this.noise({ f: 180, dur: 0.15, vol: 0.2, delay: 0.45, brown: true, ft: 'lowpass' }); break;
      case 'push': this.noise({ f: 250, q: 0.5, dur: 0.6, vol: 0.12, brown: true, ft: 'lowpass' }); break;
      case 'metal': this.tone({ f: 1400, type: 'triangle', dur: 0.4, vol: 0.06, verb: 0.4 }); this.tone({ f: 2150, type: 'sine', dur: 0.3, vol: 0.04 }); break;
      case 'splash': this.noise({ f: 1500, f2: 400, q: 0.7, dur: 0.5, vol: 0.2 }); break;
      case 'eat': for (let i = 0; i < 5; i++) this.noise({ f: 2500 + R() * 1500, q: 2, dur: 0.04, vol: 0.08, delay: i * 0.13 }); break;
      case 'drink': for (let i = 0; i < 5; i++) this.tone({ f: 500 + R() * 200, f2: 900, type: 'sine', dur: 0.05, vol: 0.05, delay: i * 0.16 }); break;
      case 'yawn': this.tone({ f: 500, f2: 280, type: 'triangle', dur: 0.9, vol: 0.05, lp: 1200, slide: 0.9 }); break;
      case 'paper': this.noise({ f: 4000, q: 0.6, dur: 0.18, vol: 0.06, ft: 'highpass' }); this.noise({ f: 3000, q: 0.6, dur: 0.12, vol: 0.05, delay: 0.15, ft: 'highpass' }); break;
      case 'woof': this.tone({ f: 190, f2: 120, type: 'sawtooth', dur: 0.16, vol: 0.12, lp: 700 }); this.tone({ f: 170, f2: 110, type: 'sawtooth', dur: 0.14, vol: 0.1, lp: 700, delay: 0.25 }); break;
      case 'meow': this.tone({ f: 600, f2: 900, type: 'sawtooth', dur: 0.25, vol: 0.05, lp: 1800, slide: 0.12 }); this.tone({ f: 900, f2: 520, type: 'sawtooth', dur: 0.35, vol: 0.05, lp: 1600, delay: 0.2 }); break;
      case 'chatter': for (let i = 0; i < 7; i++) this.tone({ f: 2400 + R() * 800, type: 'square', dur: 0.025, vol: 0.03, delay: i * 0.05, lp: 4000 }); break;
      case 'hop': this.noise({ f: 400, dur: 0.06, vol: 0.06, brown: true, ft: 'lowpass' }); break;
      case 'snuffle': for (let i = 0; i < 4; i++) this.noise({ f: 2200, q: 2, dur: 0.05, vol: 0.05, delay: i * 0.08 }); break;
      case 'unlock': this.tone({ f: 900, type: 'square', dur: 0.03, vol: 0.05, lp: 2500 }); this.tone({ f: 600, type: 'square', dur: 0.05, vol: 0.06, lp: 2000, delay: 0.12 }); this.play('door'); break;
      case 'secret': [0, 3, 7, 10, 14].forEach((s, i) => this.bell(69 + s, 0.08, i * 0.1)); break;
      case 'chapter': [48, 55, 60, 64, 67, 72].forEach((m, i) => this.pluck(m, 0.6, i * 0.14)); break;
      case 'rustle': this.noise({ f: 3500, q: 0.4, dur: 0.35, vol: 0.08, ft: 'highpass' }); break;
      case 'thud': this.noise({ f: 140, dur: 0.25, vol: 0.3, brown: true, ft: 'lowpass' }); break;
      case 'save': this.bell(84, 0.06); this.bell(91, 0.05, 0.1); break;
      case 'error': this.tone({ f: 300, type: 'triangle', dur: 0.12, vol: 0.06 }); this.tone({ f: 240, type: 'triangle', dur: 0.14, vol: 0.06, delay: 0.1 }); break;
    }
  },
  cricket(v) { const t = this.ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), f = 4300 + Math.random() * 500, pan = Math.random() * 2 - 1; for (let i = 0; i < n; i++) this.noise({ f, q: 30, dur: 0.035, vol: 0.05 * v, when: t + i * 0.06, pan, out: this.amb }); },
  bird(v) {
    const t = this.ctx.currentTime, n = 2 + Math.floor(Math.random() * 5), base = 2500 + Math.random() * 1800;
    for (let i = 0; i < n; i++) this.tone({ f: base * (1 + Math.random() * 0.3), f2: base * (0.8 + Math.random() * 0.6), dur: 0.07 + Math.random() * 0.06, vol: 0.035 * v, when: t + i * (0.09 + Math.random() * 0.07), out: this.amb, verb: 0.3 });
  },
  owl(v) { const t = this.ctx.currentTime; this.tone({ f: 390, f2: 360, dur: 0.35, vol: 0.05 * v, when: t, out: this.amb, lp: 800, verb: 0.6, a: 0.05 }); this.tone({ f: 380, f2: 330, dur: 0.6, vol: 0.05 * v, when: t + 0.55, out: this.amb, lp: 800, verb: 0.6, a: 0.06 }); },
  creak(v) { this.tone({ f: 90 + Math.random() * 60, f2: 140, type: 'sawtooth', dur: 0.6, vol: 0.02 * v, lp: 600, out: this.amb, slide: 0.6, verb: 0.5 }); },
  drip(v) { this.tone({ f: 1400 + Math.random() * 900, f2: 700, dur: 0.06, vol: 0.05 * v, out: this.amb, verb: 0.8 }); },
  frog(v) { const t = this.ctx.currentTime; for (let i = 0; i < 2; i++) this.tone({ f: 180, f2: 150, type: 'square', dur: 0.08, vol: 0.02 * v, when: t + i * 0.14, lp: 500, out: this.amb }); },
  /* -------- instruments */
  mtof: (m) => 440 * Math.pow(2, (m - 69) / 12),
  ksBuf(m) {
    if (this.ks[m]) return this.ks[m];
    const c = this.ctx, sr = c.sampleRate, f = this.mtof(m), N = Math.floor(sr * 2.6), b = c.createBuffer(1, N, sr), d = b.getChannelData(0);
    const p = Math.max(2, Math.round(sr / f)), ring = new Float32Array(p);
    for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
    for (let k = 0; k < 2; k++) for (let i = 0; i < p; i++) ring[i] = (ring[i] + ring[(i + 1) % p]) * 0.5; // soften the attack
    const decay = 0.9975 - Math.max(0, m - 60) * 0.00012; let idx = 0;
    for (let i = 0; i < N; i++) { const a = ring[idx], nx = ring[(idx + 1) % p]; ring[idx] = (a + nx) * 0.5 * decay; d[i] = a * 0.6; idx = (idx + 1) % p; }
    return (this.ks[m] = b);
  },
  pluck(m, vol = 0.4, delay = 0, when) {
    if (!this.ready) return; const c = this.ctx, t = (when || c.currentTime) + delay;
    const s = c.createBufferSource(); s.buffer = this.ksBuf(m);
    const g = c.createGain(); g.gain.value = vol; s.connect(g);
    let out = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = (Math.random() - 0.5) * 0.5; g.connect(p); out = p; }
    out.connect(this.musicLP); const vs = c.createGain(); vs.gain.value = 0.25; out.connect(vs); vs.connect(this.verbSend);
    s.start(t); s.stop(t + 2.6);
  },
  bell(m, vol = 0.1, delay = 0, when, out) {
    if (!this.ready) return; const c = this.ctx, t = (when || c.currentTime) + delay, f = this.mtof(m);
    [[1, 1, 1.6], [2.01, 0.35, 0.8], [3.9, 0.15, 0.4], [5.4, 0.08, 0.25]].forEach(([r, a, d]) => {
      const o = c.createOscillator(); o.frequency.value = f * r; const g = c.createGain(); this.env(g, t, 0.002, vol * a, d);
      o.connect(g); g.connect(out || this.sfx); const vs = c.createGain(); vs.gain.value = 0.3; g.connect(vs); vs.connect(this.verbSend); o.start(t); o.stop(t + d + 0.1);
    });
  },
  /* Ellie's tune - the melody at the heart of the story */
  TUNE: [[79, 1], [76, 1], [77, 1], [79, 1], [84, 2], [83, 1], [81, 1], [79, 2], [81, 1], [77, 1], [79, 1], [81, 1], [86, 2], [84, 1], [83, 1], [84, 3]],
  musicBox(opts = {}) {
    if (!this.ready) return 0; const c = this.ctx; let t = c.currentTime + 0.1; const beat = opts.beat || 0.34, vol = opts.vol || 0.09;
    const notes = opts.broken ? this.TUNE.slice(0, 6) : this.TUNE;
    const out = c.createGain(); out.gain.value = 1; out.connect(opts.ambient ? this.amb : this.sfx);
    if (opts.muffled) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; out.disconnect(); out.connect(lp); lp.connect(this.sfx); }
    notes.forEach(([m, b], i) => {
      const slow = opts.broken ? 1 + i * 0.18 : 1, detune = opts.broken ? -i * 0.25 : 0;
      this.bell(m + detune, vol, 0, t, out); if (!opts.broken && i % 4 === 0) this.bell(m - 24, vol * 0.5, 0, t, out);
      t += b * beat * slow;
    });
    return t - c.currentTime;
  },
  /* -------- music scheduler: gentle finger-picked guitar that follows the mood */
  MOODS: {
    home: { bpm: 74, chords: [[48, 55, 64, 67, 72], [45, 52, 60, 64, 69], [41, 48, 57, 60, 65], [43, 50, 59, 62, 67]], density: 0.9, vol: 0.34 },
    night: { bpm: 58, chords: [[45, 52, 60, 64, 69], [41, 48, 57, 60, 65], [48, 55, 64, 67, 72], [40, 47, 55, 59, 64]], density: 0.55, vol: 0.28 },
    trail: { bpm: 82, chords: [[43, 50, 59, 62, 67], [48, 55, 64, 67, 72], [40, 47, 55, 59, 64], [48, 55, 62, 67, 71]], density: 0.95, vol: 0.32 },
    forest: { bpm: 66, chords: [[38, 45, 53, 57, 62], [43, 50, 59, 62, 67], [38, 45, 53, 57, 60], [36, 43, 52, 55, 64]], density: 0.7, vol: 0.3 },
    mystery: { bpm: 54, chords: [[45, 52, 57, 60, 64], [38, 45, 53, 57, 62], [40, 47, 56, 59, 64], [45, 52, 57, 60, 64]], density: 0.45, vol: 0.26 },
    ending: { bpm: 70, chords: [[48, 55, 64, 67, 76], [41, 48, 57, 64, 69], [45, 52, 60, 64, 72], [43, 50, 59, 62, 71]], density: 1, vol: 0.36 },
    quiet: { bpm: 60, chords: [[48, 55, 64]], density: 0, vol: 0 },
  },
  mood: 'quiet',
  setMood(m) { if (this.MOODS[m]) this.mood = m; },
  schedule() {
    if (!this.ready || this.ctx.state !== 'running') return;
    const c = this.ctx;
    while (this.next < c.currentTime + 0.4) {
      const M = this.MOODS[this.mood], spb = 60 / M.bpm / 2; // eighth notes
      const bar = Math.floor(this.step / 8) % M.chords.length, pos = this.step % 8, ch = M.chords[bar];
      const pattern = [0, 3, 2, 4, 1, 3, 2, 4];
      if (M.density > 0) {
        const idx = pattern[pos] % ch.length;
        if (pos === 0 || Math.random() < M.density) this.pluck(ch[idx], (pos === 0 ? 0.5 : 0.32) * M.vol * 2, 0, this.next + (Math.random() - 0.5) * 0.012);
        if (pos === 0 && Math.random() < 0.5) this.pluck(ch[ch.length - 1] + 12, 0.18 * M.vol * 2, 0, this.next + spb * 2);
        if (pos === 4 && Math.random() < 0.3 * M.density) this.pluck(ch[(bar + 2) % ch.length] + 12, 0.16 * M.vol * 2, 0, this.next);
      }
      this.next += spb; this.step++;
    }
  },
};

/* ---------------------------------------------------------------- Textures
   Every surface texture is painted at startup on a canvas.           */
G.Tex = {
  cache: {}, defs: {}, scale: 1, aniso: 4,
  /* textures are painted at (w, h) x scale; Texture Quality can repaint them at another scale */
  paint(key, w, h, draw, s) {
    const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(w * s)); cv.height = Math.max(2, Math.round(h * s)); const g = cv.getContext('2d');
    g.scale(cv.width / w, cv.height / h); draw(g, w, h, G.U.rng(key.length * 7919 + w)); return cv;
  },
  make(key, w, h, draw, rx = 1, ry = 1) {
    if (this.cache[key]) return this.cache[key];
    const s = w * this.scale > 2048 ? 2048 / w : this.scale;
    const t = new THREE.CanvasTexture(this.paint(key, w, h, draw, s)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = this.aniso;
    this.defs[key] = { w, h, draw, s };
    return (this.cache[key] = t);
  },
  setQuality(scale, aniso) {
    this.scale = scale; this.aniso = aniso;
    for (const k in this.cache) {
      const t = this.cache[k], d = this.defs[k]; if (!t || !d) continue;
      const s = d.w * scale > 2048 ? 2048 / d.w : scale;
      if (Math.abs(s - d.s) > 0.01) { t.image = this.paint(k, d.w, d.h, d.draw, s); d.s = s; }
      t.anisotropy = aniso; t.needsUpdate = true;
    }
  },
  speckle(g, w, h, r, n, cols, a = 0.15, size = 2) { for (let i = 0; i < n; i++) { g.globalAlpha = a * (0.4 + r() * 0.6); g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = size * (0.5 + r()); g.fillRect(r() * w, r() * h, s, s); } g.globalAlpha = 1; },
  get(name) {
    const T = this;
    switch (name) {
      case 'planks': return T.make(name, 512, 512, (g, w, h, r) => {
        const rows = 8, rh = h / rows;
        for (let i = 0; i < rows; i++) {
          let x = -r() * 200;
          while (x < w) {
            const len = 180 + r() * 220, l = 38 + r() * 10;
            g.fillStyle = `hsl(${26 + r() * 6},${42 + r() * 12}%,${l}%)`; g.fillRect(x, i * rh, len, rh);
            for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r(); g.beginPath(); const yy = i * rh + r() * rh; g.moveTo(x, yy); for (let xx = x; xx < x + len; xx += 20) g.lineTo(xx, yy + Math.sin(xx * 0.03 + k) * 2); g.stroke(); }
            g.fillStyle = 'rgba(40,20,8,.55)'; g.fillRect(x, i * rh, 2, rh); x += len;
          }
          g.fillStyle = 'rgba(40,20,8,.6)'; g.fillRect(0, i * rh, w, 2);
        }
        T.speckle(g, w, h, r, 3000, ['#2a1508', '#f3c58a'], 0.08);
      });
      case 'tiles': return T.make(name, 256, 256, (g, w, h, r) => {
        const n = 4, s = w / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#e9dfc6' : '#9fb59a'; g.fillRect(i * s, j * s, s, s); }
        T.speckle(g, w, h, r, 2000, ['#ffffff', '#6d7f69'], 0.12);
        g.strokeStyle = '#c8bfa9'; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
      });
      case 'wallpaper': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#e7d7b9'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(160,120,80,.10)'; g.fillRect(x, 0, 12, h); }
        for (let y = 16; y < h; y += 64) for (let x = 22; x < w; x += 32) { g.fillStyle = 'rgba(120,140,90,.35)'; g.beginPath(); g.ellipse(x, y + (x % 64 ? 32 : 0), 3, 6, 0.5, 0, 7); g.fill(); }
        T.speckle(g, w, h, r, 1500, ['#8a6d4b'], 0.05);
      });
      case 'wallpaper2': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#b9c7bd'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x + ((y / 32) % 2) * 16, y, 3, 0, 7); g.fill(); }
        T.speckle(g, w, h, r, 1500, ['#546b5f'], 0.06);
      });
      case 'plaster': return T.make(name, 256, 256, (g, w, h, r) => { g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h); T.speckle(g, w, h, r, 5000, ['#d6c9b3', '#ffffff'], 0.2, 3); });
      case 'rug': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#8e3b2e'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e1b560'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52);
        g.fillStyle = '#2f4a5c'; g.beginPath(); g.moveTo(w / 2, 50); g.lineTo(w - 50, h / 2); g.lineTo(w / 2, h - 50); g.lineTo(50, h / 2); g.fill();
        g.fillStyle = '#e1b560'; g.beginPath(); g.moveTo(w / 2, 90); g.lineTo(w - 90, h / 2); g.lineTo(w / 2, h - 90); g.lineTo(90, h / 2); g.fill();
        g.fillStyle = '#8e3b2e'; g.beginPath(); g.arc(w / 2, h / 2, 20, 0, 7); g.fill();
        T.speckle(g, w, h, r, 6000, ['#000', '#fff'], 0.07);
      });
      case 'rug2': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#3e5a6b'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) { g.strokeStyle = i % 2 ? '#d9c7a1' : '#6b8aa0'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 20 + i * 14, 0, 7); g.stroke(); }
        T.speckle(g, w, h, r, 5000, ['#000', '#fff'], 0.07);
      });
      case 'grass': return T.make(name, 512, 512, (g, w, h, r) => {
        g.fillStyle = '#56733a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) { g.globalAlpha = 0.18; g.fillStyle = r() > 0.5 ? '#6e8c43' : '#3f5a2a'; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 60, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        for (let i = 0; i < 9000; i++) { g.strokeStyle = `hsla(${80 + r() * 30},${40 + r() * 20}%,${25 + r() * 25}%,.5)`; g.lineWidth = 1; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke(); }
      }, 1, 1);
      case 'forestfloor': return T.make(name, 512, 512, (g, w, h, r) => {
        g.fillStyle = '#4a4028'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) { g.globalAlpha = 0.2; g.fillStyle = r() > 0.5 ? '#5d6b33' : '#3a2e1c'; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 60, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        for (let i = 0; i < 900; i++) { g.fillStyle = `hsla(${20 + r() * 30},${40 + r() * 30}%,${22 + r() * 22}%,.8)`; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6); g.beginPath(); g.ellipse(0, 0, 5 + r() * 4, 2 + r() * 2, 0, 0, 7); g.fill(); g.restore(); }
        T.speckle(g, w, h, r, 4000, ['#1d160c', '#8a7b52'], 0.25);
      });
      case 'dirt': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#6b4b31'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2; g.fillStyle = r() > 0.5 ? '#80603f' : '#4a3120'; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, 7); g.fill(); }
        g.globalAlpha = 1; T.speckle(g, w, h, r, 5000, ['#2e1d10', '#a8845a', '#3b2616'], 0.4, 2.5);
      });
      case 'soil': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#3f2a1b'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 5); }
        T.speckle(g, w, h, r, 6000, ['#1c110a', '#6d4e33'], 0.5, 2.5);
      });
      case 'bark': return T.make(name, 128, 256, (g, w, h, r) => {
        g.fillStyle = '#4b3526'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) { g.strokeStyle = r() > 0.5 ? 'rgba(25,15,8,.55)' : 'rgba(120,95,70,.35)'; g.lineWidth = 1 + r() * 3; const x = r() * w; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 4, y); g.stroke(); }
      }, 1, 2);
      case 'shingles': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#5a3a33'; g.fillRect(0, 0, w, h);
        const rh = 32; for (let y = 0; y < h; y += rh) for (let x = -((y / rh) % 2) * 16; x < w; x += 32) { g.fillStyle = `hsl(${8 + r() * 10},${25 + r() * 10}%,${24 + r() * 10}%)`; g.fillRect(x + 1, y + 1, 30, rh - 3); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + rh - 4, 32, 4); }
      });
      case 'shinglesBlue': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#34414f'; g.fillRect(0, 0, w, h);
        const rh = 32; for (let y = 0; y < h; y += rh) for (let x = -((y / rh) % 2) * 16; x < w; x += 32) { g.fillStyle = `hsl(${205 + r() * 10},${14 + r() * 10}%,${26 + r() * 8}%)`; g.fillRect(x + 1, y + 1, 30, rh - 3); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + rh - 4, 32, 4); }
      });
      case 'siding': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#e4d6bb'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 21) { g.fillStyle = 'rgba(90,70,40,.22)'; g.fillRect(0, y + 17, w, 4); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, y, w, 2); }
        T.speckle(g, w, h, r, 1500, ['#9d8b69'], 0.08);
      });
      case 'sidingGreen': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#9fb29a'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 21) { g.fillStyle = 'rgba(30,50,40,.25)'; g.fillRect(0, y + 17, w, 4); }
        T.speckle(g, w, h, r, 1500, ['#566b58'], 0.08);
      });
      case 'brick': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#cdbba0'; g.fillRect(0, 0, w, h); const bh = 24, bw = 56;
        for (let y = 0; y < h; y += bh) for (let x = -((y / bh) % 2) * 28; x < w; x += bw) { g.fillStyle = `hsl(${10 + r() * 12},${40 + r() * 15}%,${36 + r() * 12}%)`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
        T.speckle(g, w, h, r, 3000, ['#2b1a12', '#e6c9a0'], 0.15);
      });
      case 'asphalt': return T.make(name, 512, 512, (g, w, h, r) => { g.fillStyle = '#4a4a4f'; g.fillRect(0, 0, w, h); T.speckle(g, w, h, r, 30000, ['#2e2e33', '#6a6a70', '#57575c'], 0.5, 2); for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(20,20,22,.4)'; g.lineWidth = 1.5; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } });
      case 'concrete': return T.make(name, 256, 256, (g, w, h, r) => { g.fillStyle = '#a7a39a'; g.fillRect(0, 0, w, h); T.speckle(g, w, h, r, 8000, ['#8b877e', '#c2beb4'], 0.35, 2); });
      case 'sidewalk': return T.make(name, 256, 256, (g, w, h, r) => { g.fillStyle = '#b8b2a6'; g.fillRect(0, 0, w, h); T.speckle(g, w, h, r, 6000, ['#9a9489', '#d6d0c4'], 0.35, 2); g.fillStyle = 'rgba(60,55,50,.5)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); });
      case 'fabric': return T.make(name, 128, 128, (g, w, h, r) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x, 0, 1, h); } T.speckle(g, w, h, r, 800, ['#000'], 0.05); });
      case 'quilt': return T.make(name, 256, 256, (g, w, h, r) => {
        const cols = ['#d98f6a', '#e8c98f', '#8fb0a1', '#c96f5b', '#f2e3c4', '#7d98b3']; const s = 32;
        for (let x = 0; x < w; x += s) for (let y = 0; y < h; y += s) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, s, s); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x + 16, y + 16, 5, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(80,50,30,.35)'; g.setLineDash([3, 3]); for (let x = 0; x <= w; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
      });
      case 'fur': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 5000; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 12, v = 165 + r() * 90; g.strokeStyle = `rgba(${v},${v},${v},.5)`; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 3, y + l / 2, x + (r() - 0.5) * 5, y + l); g.stroke(); }
      });
      case 'stone': return T.make(name, 256, 256, (g, w, h, r) => { g.fillStyle = '#7d7a72'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.globalAlpha = 0.25; g.fillStyle = r() > 0.5 ? '#9a978d' : '#5f5c55'; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 40, 0, 7); g.fill(); } g.globalAlpha = 1; T.speckle(g, w, h, r, 5000, ['#3c3a35', '#b5b2a8'], 0.3); });
      case 'stonewall': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#4b4640'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 2) * 24; x < w; x += 48) { g.fillStyle = `hsl(${30 + r() * 20},${8 + r() * 8}%,${34 + r() * 14}%)`; g.beginPath(); g.roundRect ? g.roundRect(x + 3, y + 3, 42, 26, 8) : g.rect(x + 3, y + 3, 42, 26); g.fill(); }
        T.speckle(g, w, h, r, 3000, ['#211d19', '#9c948a'], 0.2);
      });
      case 'shedwood': return T.make(name, 256, 256, (g, w, h, r) => {
        const bw = 32; for (let x = 0; x < w; x += bw) { g.fillStyle = `hsl(${28 + r() * 8},${14 + r() * 10}%,${30 + r() * 12}%)`; g.fillRect(x, 0, bw, h); for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(20,12,6,.3)'; g.beginPath(); const xx = x + r() * bw; g.moveTo(xx, 0); g.lineTo(xx + (r() - 0.5) * 6, h); g.stroke(); } g.fillStyle = 'rgba(10,6,3,.6)'; g.fillRect(x, 0, 2, h); }
        for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(80,110,60,.25)'; g.beginPath(); g.arc(r() * w, h - r() * 60, 6 + r() * 16, 0, 7); g.fill(); }
      });
      case 'paintwood': return T.make(name, 256, 256, (g, w, h, r) => {
        const bw = 32; for (let x = 0; x < w; x += bw) { g.fillStyle = `hsl(${140 + r() * 10},${14 + r() * 6}%,${44 + r() * 6}%)`; g.fillRect(x, 0, bw, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, 0, 2, h); }
        T.speckle(g, w, h, r, 2000, ['#e7e3d0', '#2d3a2e'], 0.12);
      });
      case 'fence': return T.make(name, 256, 128, (g, w, h, r) => {
        const bw = 24; for (let x = 0; x < w; x += bw) { g.fillStyle = `hsl(${26 + r() * 6},${30 + r() * 8}%,${42 + r() * 10}%)`; g.fillRect(x + 1, 0, bw - 2, h); g.fillStyle = 'rgba(40,20,8,.2)'; for (let k = 0; k < 4; k++) g.fillRect(x + 2 + r() * 18, 0, 1, h); }
      });
      case 'water': return T.make(name, 256, 256, (g, w, h, r) => { g.fillStyle = '#7f7f7f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`; g.lineWidth = 2; g.beginPath(); const x = r() * w, y = r() * h; g.ellipse(x, y, 10 + r() * 20, 2 + r() * 3, 0, 0, 7); g.stroke(); } });
      case 'blob': return T.make(name, 128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      case 'glow': return T.make(name, 64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
      case 'books': return T.make(name, 256, 128, (g, w, h, r) => { g.fillStyle = '#2a1a10'; g.fillRect(0, 0, w, h); let x = 0; while (x < w) { const bw = 8 + r() * 14, bh = h * (0.7 + r() * 0.3); g.fillStyle = `hsl(${r() * 360},${30 + r() * 30}%,${25 + r() * 30}%)`; g.fillRect(x, h - bh, bw - 1, bh); g.fillStyle = 'rgba(255,230,160,.5)'; g.fillRect(x + 2, h - bh + 10, bw - 5, 2); x += bw; } });
      case 'foliage': return T.make(name, 256, 256, (g, w, h, r) => {
        g.fillStyle = '#9aa88a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 700; i++) { g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6.3); const l = 55 + r() * 45; g.fillStyle = `hsl(${70 + r() * 30},${10 + r() * 20}%,${l}%)`; g.beginPath(); g.ellipse(0, 0, 9 + r() * 5, 4 + r() * 2, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.15)'; g.stroke(); g.restore(); }
      });
      case 'leafcard': return T.make(name, 128, 128, (g, w, h, r) => {
        g.clearRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { g.save(); g.translate(20 + r() * 88, 20 + r() * 88); g.rotate(r() * 6.3); g.fillStyle = `hsl(${85 + r() * 40},${35 + r() * 25}%,${22 + r() * 22}%)`; g.beginPath(); g.ellipse(0, 0, 16, 7, 0, 0, 7); g.fill(); g.restore(); }
      });
    }
    return this.cache[name] || null;
  },
  /* small painted pictures used for photographs, drawings and notes */
  picture(kind) {
    const T = this;
    return this.make('pic-' + kind, 256, 256, (g, w, h, r) => {
      const sepia = (a) => `rgba(${90},${60},${30},${a})`;
      if (kind === 'note') {
        g.fillStyle = '#efe3c4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,60,40,.5)';
        for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(16, 40 + s * 70 + l * 8); g.lineTo(240, 40 + s * 70 + l * 8); g.stroke(); }
        g.fillStyle = '#3b2a1a'; for (let s = 0; s < 3; s++) for (let n = 0; n < 9; n++) { const x = 30 + n * 24, y = 40 + s * 70 + Math.floor(r() * 5) * 8; g.beginPath(); g.ellipse(x, y, 5, 4, -0.4, 0, 7); g.fill(); g.fillRect(x + 4, y - 22, 1.5, 22); }
        g.font = 'italic 16px Georgia'; g.fillText('for Ellie ~ A.', 130, 245); g.fillStyle = 'rgba(120,80,40,.15)'; g.fillRect(0, 0, w, 14);
      } else if (kind === 'journal') {
        g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a3624'; g.font = 'italic 17px Georgia';
        ['The music box is finished.', 'Juniper keeps stealing the', 'winding key - rascal!', 'Brass gear needs replacing.', '', 'The old tunnel leads', 'all the way home.'].forEach((l, i) => g.fillText(l, 16, 34 + i * 30));
        g.strokeStyle = '#4a3624'; g.beginPath(); g.arc(200, 215, 20, 0, 7); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; g.moveTo(200 + Math.cos(a) * 20, 215 + Math.sin(a) * 20); g.lineTo(200 + Math.cos(a) * 27, 215 + Math.sin(a) * 27); } g.stroke();
      } else {
        // sepia photograph
        g.fillStyle = '#f1e7d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#a58a62'; g.fillRect(14, 14, w - 28, h - 50);
        const gr = g.createLinearGradient(0, 14, 0, h - 36); gr.addColorStop(0, '#c9ae82'); gr.addColorStop(1, '#8a6d48'); g.fillStyle = gr; g.fillRect(14, 14, w - 28, h - 50);
        g.fillStyle = sepia(0.8);
        const person = (x, y, s) => { g.beginPath(); g.arc(x, y, 12 * s, 0, 7); g.fill(); g.fillRect(x - 12 * s, y + 12 * s, 24 * s, 50 * s); };
        const ferret = (x, y, s) => { g.beginPath(); g.ellipse(x, y, 26 * s, 8 * s, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + 26 * s, y - 4 * s, 8 * s, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 24 * s, y); g.quadraticCurveTo(x - 45 * s, y - 2 * s, x - 50 * s, y + 8 * s); g.lineWidth = 4 * s; g.strokeStyle = sepia(0.8); g.stroke(); };
        if (kind === 'photo1') { person(90, 90, 1.4); person(160, 120, 0.9); ferret(160, 110, 0.7); g.fillStyle = '#3b2a1a'; g.font = 'italic 15px Georgia'; g.fillText('Arlo, Ellie & Juniper', 40, 240); }
        else if (kind === 'photo2') { g.fillRect(40, 60, 170, 100); g.fillStyle = '#e8d4a8'; g.fillRect(60, 80, 30, 25); g.fillStyle = sepia(0.9); person(150, 110, 1); g.fillStyle = '#3b2a1a'; g.font = 'italic 15px Georgia'; g.fillText('The workshop, summer', 50, 240); }
        else if (kind === 'photo3') { ferret(128, 120, 1.4); g.fillStyle = sepia(0.6); g.beginPath(); g.arc(128, 175, 40, Math.PI, 0); g.fill(); g.fillStyle = '#3b2a1a'; g.font = 'italic 15px Georgia'; g.fillText('Juniper & her tunnel', 45, 240); }
        else if (kind === 'photo4') { person(128, 70, 1.1); g.fillRect(70, 140, 116, 40); g.fillStyle = '#e8d4a8'; g.beginPath(); g.arc(128, 160, 10, 0, 7); g.fill(); g.fillStyle = '#3b2a1a'; g.font = 'italic 15px Georgia'; g.fillText('Ellie, age six', 70, 240); }
        else { person(80, 100, 1); person(170, 100, 1); g.fillStyle = '#3b2a1a'; g.font = 'italic 15px Georgia'; g.fillText('Neighbours, 1998', 60, 240); }
        T.speckle(g, w, h, r, 1500, ['#3b2a1a', '#fff'], 0.15);
      }
    });
  },
};

/* ---------------------------------------------------------------- Materials */
G.Mat = {
  cache: {},
  std(key, o) {
    if (this.cache[key]) return this.cache[key];
    const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0xffffff, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, flatShading: !!o.flat });
    if (o.map) { m.map = G.Tex.get(o.map); }
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
    if (o.transparent) { m.transparent = true; m.opacity = o.opacity ?? 1; m.depthWrite = o.depthWrite ?? false; }
    if (o.side) m.side = o.side;
    if (o.envI !== undefined) m.envMapIntensity = o.envI;
    return (this.cache[key] = m);
  },
  get(k) {
    const S = (o) => this.std(k, o);
    switch (k) {
      case 'planks': return S({ map: 'planks', rough: 0.55, envI: 0.6 });
      case 'tiles': return S({ map: 'tiles', rough: 0.35, envI: 0.8 });
      case 'wallpaper': return S({ map: 'wallpaper', rough: 0.95 });
      case 'wallpaper2': return S({ map: 'wallpaper2', rough: 0.95 });
      case 'plaster': return S({ map: 'plaster', rough: 0.95 });
      case 'basewood': return S({ color: 0x6b4a33, rough: 0.6 });
      case 'whitewood': return S({ color: 0xefe7d6, rough: 0.6 });
      case 'wood': return S({ color: 0x8a5a3a, rough: 0.6, map: 'planks' });
      case 'darkwood': return S({ color: 0x4d3322, rough: 0.55 });
      case 'midwood': return S({ color: 0x9a6a44, rough: 0.6 });
      case 'rug': return S({ map: 'rug', rough: 1 });
      case 'rug2': return S({ map: 'rug2', rough: 1 });
      case 'sofa': return S({ color: 0xb4674a, rough: 0.95, map: 'fabric' });
      case 'sofa2': return S({ color: 0x5f7d73, rough: 0.95, map: 'fabric' });
      case 'cushion': return S({ color: 0xe0b46a, rough: 0.95, map: 'fabric' });
      case 'quilt': return S({ map: 'quilt', rough: 0.95 });
      case 'linen': return S({ color: 0xf2ebe0, rough: 0.9, map: 'fabric' });
      case 'grass': return S({ map: 'grass', rough: 0.95, envI: 0.3 });
      case 'forestfloor': return S({ map: 'forestfloor', rough: 1, envI: 0.25 });
      case 'dirt': return S({ map: 'dirt', rough: 1, envI: 0.3 });
      case 'soil': return S({ map: 'soil', rough: 1 });
      case 'bark': return S({ map: 'bark', rough: 0.95 });
      case 'shingles': return S({ map: 'shingles', rough: 0.9 });
      case 'shinglesBlue': return S({ map: 'shinglesBlue', rough: 0.9 });
      case 'siding': return S({ map: 'siding', rough: 0.85 });
      case 'sidingGreen': return S({ map: 'sidingGreen', rough: 0.85 });
      case 'brick': return S({ map: 'brick', rough: 0.9 });
      case 'asphalt': return S({ map: 'asphalt', rough: 0.8, envI: 0.4 });
      case 'concrete': return S({ map: 'concrete', rough: 0.9 });
      case 'sidewalk': return S({ map: 'sidewalk', rough: 0.9 });
      case 'stone': return S({ map: 'stone', rough: 0.85 });
      case 'stonewall': return S({ map: 'stonewall', rough: 0.9 });
      case 'shedwood': return S({ map: 'shedwood', rough: 0.95 });
      case 'paintwood': return S({ map: 'paintwood', rough: 0.85 });
      case 'fence': return S({ map: 'fence', rough: 0.9 });
      case 'metal': return S({ color: 0xb8b8bd, rough: 0.3, metal: 0.8 });
      case 'darkmetal': return S({ color: 0x3b3d42, rough: 0.45, metal: 0.6 });
      case 'brass': return S({ color: 0xd4a347, rough: 0.28, metal: 0.95 });
      case 'chrome': return S({ color: 0xeeeeee, rough: 0.12, metal: 1 });
      case 'glass': return S({ color: 0xbfd8e8, rough: 0.05, metal: 0.1, transparent: true, opacity: 0.3, envI: 1.5 });
      case 'white': return S({ color: 0xf4efe6, rough: 0.5 });
      case 'ceramic': return S({ color: 0xf6f3ee, rough: 0.2, envI: 1 });
      case 'counter': return S({ color: 0xd9d2c3, rough: 0.35, envI: 1 });
      case 'cabinet': return S({ color: 0x7c9a8a, rough: 0.6 });
      case 'red': return S({ color: 0xb23a2e, rough: 0.6 });
      case 'leaf': return S({ color: 0xffffff, rough: 0.8 });
      case 'rock': return S({ color: 0x8b877c, rough: 0.9, map: 'stone', flat: true });
      case 'mossrock': return S({ color: 0x7c8a5c, rough: 0.95, map: 'stone', flat: true });
      case 'water': return S({ color: 0x24444c, rough: 0.12, metal: 0.1, transparent: true, opacity: 0.86, envI: 0.8, depthWrite: true });
      case 'puddle': return S({ color: 0x4c5a60, rough: 0.02, metal: 0.4, transparent: true, opacity: 0, envI: 2 });
      case 'windowNight': return S({ color: 0x333333, emissive: 0xffc877, ei: 0 });
      case 'shadow': { if (this.cache[k]) return this.cache[k]; const m = new THREE.MeshBasicMaterial({ map: G.Tex.get('blob'), transparent: true, depthWrite: false, opacity: 0.9 }); m.polygonOffset = true; m.polygonOffsetFactor = -2; return (this.cache[k] = m); }
      case 'mushroom': return S({ color: 0x9fd9c9, emissive: 0x6fe0c4, ei: 1.2, rough: 0.5 });
      case 'screen': return S({ color: 0x101418, rough: 0.2, metal: 0.3, envI: 1.2 });
      case 'lampshade': return S({ color: 0xf2d9a6, emissive: 0xffb866, ei: 0.6, rough: 0.9, side: THREE.DoubleSide });
      case 'ember': return S({ color: 0x331100, emissive: 0xff6a1f, ei: 2 });
      case 'boiler': return S({ color: 0x6a5140, rough: 0.5, metal: 0.4 });
    }
    return S({ color: 0xff00ff });
  },
  color(hex, rough = 0.85, metal = 0) { return this.std('c' + hex + '_' + rough + '_' + metal, { color: hex, rough, metal }); },
  /* fur: canvas strands + a soft fresnel rim that reads as fluff */
  fur(hex, key) {
    const k = 'fur' + (key || hex); if (this.cache[k]) return this.cache[k];
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 1, map: G.Tex.get('fur') });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.rimStrength = G.Mat.rimU;
      sh.fragmentShader = 'uniform float rimStrength;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float fr = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.4);\n totalEmissiveRadiance += diffuseColor.rgb * fr * rimStrength;');
    };
    return (this.cache[k] = m);
  },
  rimU: { value: 0.6 },
};
