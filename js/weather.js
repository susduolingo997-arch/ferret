/* =====================================================================
   weather.js - more weather, and small signs of life.
   Weather: clear, cloudy, rain, heavy rain, fog, storm (lightning and
   thunder), plus the time-of-day moods: sunset, night, early morning.
   Detail (scaled by Effects Quality): footprints in mud and sand,
   raindrop splashes, blowing leaves, birds overhead, butterflies.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, W = G.World, EXT = G.EXT, UG = W.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const fx = () => (G.GFX && G.GFX.fxLevel) || 0;

  // every weather lists every key, so the damped blend never leaves one behind
  const WX = {
    clear: { cloud: 0.12, rain: 0, fog: 0, wind: 0.3, storm: 0 },
    cloudy: { cloud: 0.85, rain: 0, fog: 0.12, wind: 0.55, storm: 0 },
    rain: { cloud: 1, rain: 1, fog: 0.35, wind: 0.75, storm: 0 },
    heavyrain: { cloud: 1, rain: 1.6, fog: 0.55, wind: 1.05, storm: 0.15 },
    storm: { cloud: 1, rain: 1.45, fog: 0.45, wind: 1.45, storm: 1 },
    fog: { cloud: 0.55, rain: 0, fog: 1, wind: 0.1, storm: 0 },
    morning: { cloud: 0.25, rain: 0, fog: 0.4, wind: 0.12, storm: 0 },
    sunset: { cloud: 0.3, rain: 0, fog: 0.05, wind: 0.25, storm: 0 },
    night: { cloud: 0.15, rain: 0, fog: 0.05, wind: 0.2, storm: 0 },
  };
  // the time-of-day moods hold the clock (only when chosen in Settings; story weathers keep real time)
  const HOLD = { sunset: 18.55, night: 23.2, morning: 6.6 };
  
  const X = (G.Weather = { flash: 0, boltT: 6, thunder: [], name: 'clear' });

  /* ---------------------------------------------------------------- lightning bolt mesh */
  function makeBolt() {
    const pts = []; let x = 0, y = 0;
    for (let i = 0; i < 14; i++) { pts.push(V3(x, y, 0)); x += (Math.random() - 0.5) * 6; y -= 4 + Math.random() * 3; }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 0, fog: false }));
  }

  /* ---------------------------------------------------------------- footprints */
  const FP = { list: [], i: 0, acc: 0, side: 1, last: null };
  function initFootprints(g) {
    const geo = new THREE.CircleGeometry(1, 10); geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a1d12, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.scale.set(0.028, 1, 0.04); m.visible = false; m.renderOrder = 2; g.scene.add(m); FP.list.push({ m, t: 0, life: 1 });
    }
  }
  function footTick(g, dt, wet) {
    const p = g.player, e = G.env || {}, ar = e.area || {}, lvl = fx();
    const soft = ar.zone === 'beach' || ar.surf === 'dirt' || (wet > 0.35 && (ar.surf === 'grass' || ar.zone === 'forest')) || ar.zone === 'snow';
    for (const f of FP.list) { if (!f.m.visible) continue; f.t += dt; const k = 1 - f.t / f.life; f.m.material.opacity = Math.max(0, k) * (ar.zone === 'beach' ? 0.28 : 0.4); if (k <= 0) f.m.visible = false; }
    if (!lvl || !soft || e.indoor || !p.grounded || g.state !== 'play') { FP.last = null; return; }
    const pos = p.pos; if (!FP.last) { FP.last = pos.clone(); return; }
    const d = Math.hypot(pos.x - FP.last.x, pos.z - FP.last.z); if (d < 0.2) return;
    const dx = (pos.x - FP.last.x) / d, dz = (pos.z - FP.last.z) / d; FP.last.copy(pos); FP.side = -FP.side;
    const n = Math.min(FP.list.length, [0, 30, 50, 70, 90, 90][lvl]); const f = FP.list[FP.i % n]; FP.i++;
    const y = W.groundAt(pos.x, pos.y + 0.3, pos.z);
    f.m.position.set(pos.x - dz * 0.05 * FP.side, y + 0.012, pos.z + dx * 0.05 * FP.side); f.m.rotation.y = Math.atan2(dx, dz); f.m.visible = true; f.t = 0; f.life = 8 + lvl * 4;
    f.m.material.color.set(ar.zone === 'beach' ? 0x8a7050 : ar.zone === 'snow' ? 0x9aa8b8 : 0x2a1d12);
  }

  /* ---------------------------------------------------------------- birds overhead */
  const BIRDS = [];
  function initBirds(g) {
    const wing = new THREE.PlaneGeometry(0.5, 0.16); wing.translate(0.25, 0, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a30, side: THREE.DoubleSide, fog: true });
    for (let f = 0; f < 3; f++) {
      const flock = { g: new THREE.Group(), birds: [], a: Math.random() * 6, r: 40 + f * 25, h: 22 + f * 6, sp: 0.05 + f * 0.015 };
      for (let i = 0; i < 6; i++) { const b = new THREE.Group(); const l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat); r.rotation.y = Math.PI; b.add(l, r); b.position.set((i % 3) * 1.2 - 1.2 + (Math.random() - 0.5), (Math.random() - 0.5) * 0.8, -Math.floor(i / 2) * 1.1); b.userData = { l, r, ph: Math.random() * 6 }; flock.g.add(b); flock.birds.push(b); }
      flock.g.visible = false; g.scene.add(flock.g); BIRDS.push(flock);
    }
  }
  function birdTick(g, dt, day, wn) {
    const lvl = fx(), e = G.env || {}, cp = g.camera.position, show = lvl >= 1 && day > 0.5 && wn.rain < 0.4 && !e.ug && cp.y > UG + 12;
    BIRDS.forEach((f, i) => {
      f.g.visible = show && i < lvl; if (!f.g.visible) return;
      f.a += dt * f.sp; f.g.position.set(cp.x + Math.cos(f.a) * f.r, f.h, cp.z + Math.sin(f.a) * f.r); f.g.rotation.y = -f.a;
      for (const b of f.birds) { const u = b.userData; u.ph += dt * 9; const fl = Math.sin(u.ph) * 0.6 * (Math.sin(u.ph * 0.13) > -0.3 ? 1 : 0.1); u.l.rotation.z = fl; u.r.rotation.z = -fl; }
    });
  }

  /* ---------------------------------------------------------------- butterflies */
  const FLY = [];
  function initButterflies(g) {
    const wing = new THREE.PlaneGeometry(0.07, 0.06); wing.translate(0.035, 0, 0);
    const cols = [0xf2c14e, 0xffffff, 0xe7a0b0, 0x6a9fe0, 0xe08a3a];
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, roughness: 0.8 });
      const b = new THREE.Group(), l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat); r.rotation.y = Math.PI; b.add(l, r);
      b.userData = { l, r, ph: Math.random() * 6, home: null, t: 0, tgt: V3() }; b.visible = false; g.scene.add(b); FLY.push(b);
    }
  }
  function flyTick(g, dt, day, wn) {
    const lvl = fx(), e = G.env || {}, ar = e.area || {}, p = g.player.pos;
    const ok = lvl >= 2 && day > 0.6 && wn.rain < 0.1 && wn.wind < 0.9 && !e.indoor && !e.ug && ['garden', 'town', 'park', 'coast', 'yard', 'forest'].includes(ar.zone || 'town');
    FLY.forEach((b, i) => {
      const u = b.userData, want = ok && i < lvl * 2;
      if (!want) { b.visible = false; u.home = null; return; }
      if (!u.home || u.home.distanceTo(p) > 14) { u.home = V3(p.x + (Math.random() - 0.5) * 10, 0, p.z + (Math.random() - 0.5) * 10); u.home.y = W.groundAt(u.home.x, p.y + 0.5, u.home.z); b.position.copy(u.home).add(V3(0, 0.5, 0)); u.t = 0; }
      b.visible = true; u.t -= dt; if (u.t <= 0) { u.t = 1 + Math.random() * 2; u.tgt.set(u.home.x + (Math.random() - 0.5) * 3, u.home.y + 0.3 + Math.random() * 0.9, u.home.z + (Math.random() - 0.5) * 3); }
      const d = V3().subVectors(u.tgt, b.position); const l = d.length(); if (l > 0.02) { b.position.addScaledVector(d, Math.min(1, dt * 1.2)); b.rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2; }
      u.ph += dt * 22; const fl = 0.3 + Math.abs(Math.sin(u.ph)) * 1.1; u.l.rotation.x = 0; u.l.rotation.z = fl; u.r.rotation.z = -fl; b.position.y += Math.sin(u.ph * 0.2) * dt * 0.2;
    });
  }

  /* ---------------------------------------------------------------- hooks */
  const oInit = EXT.init, oUpd = EXT.update;
  EXT.init = function (g) {
    oInit(g);
    Object.assign(g.WEATHER, JSON.parse(JSON.stringify(WX)));
    X.bolt = makeBolt(); X.bolt.visible = false; X.bolt.frustumCulled = false; g.scene.add(X.bolt);
    X.boltLight = new THREE.PointLight(0xdfe8ff, 0, 400, 1.2); g.scene.add(X.boltLight);
    initFootprints(g); initBirds(g); initButterflies(g);
    // time-of-day moods and lightning ride on top of the game's own sky + lights
    const oEnv = g.updateEnv.bind(g);
    g.updateEnv = function (dt) {
      const S = this.S, set = G.settings.weather, hold = HOLD[set]; if (this.weatherNow.storm === undefined) this.weatherNow.storm = 0;
      let t0 = null; if (hold !== undefined && this.state !== 'title') { t0 = S.time; S.time = hold; }
      oEnv(dt);
      if (t0 !== null) S.time = t0;
      after(this, dt);
    };
  };
  function after(g, dt) {
    const wn = g.weatherNow, e = G.env || {}, S = g.S;
    X.name = G.settings.weather !== 'story' ? G.settings.weather : S.weather;
    const out = !e.indoor && !e.ug;
    // heavier rain = more drops
    const base = [700, 1400, 2600, 4200, 6000][fx()] || 2600; g.rainActive = Math.min(g.rainN, Math.round(base * U.clamp(0.55 + (wn.rain - 1) * 0.9, 0.55, 1)));
    if (g.rain.visible) g.rain.material.opacity = Math.min(0.62, wn.rain * 0.42) * (out ? 1 : 0);
    // lightning
    X.flash = Math.max(0, X.flash - dt * 5);
    if (wn.storm > 0.5 && g.state !== 'title') {
      X.boltT -= dt;
      if (X.boltT <= 0) {
        X.boltT = 4 + Math.random() * 9; X.flash = 1; X.flash2 = Math.random() < 0.6 ? 0.25 : 0;
        const cp = g.camera.position, a = Math.random() * 6.28, d = 60 + Math.random() * 120;
        X.bolt.geometry.dispose(); const nb = makeBolt(); X.bolt.geometry = nb.geometry; X.bolt.position.set(cp.x + Math.cos(a) * d, 70, cp.z + Math.sin(a) * d); X.bolt.visible = out;
        X.boltLight.position.set(X.bolt.position.x, 50, X.bolt.position.z);
        if (A.ready) { const delay = d / 170; const v = (out ? 1 : 0.45) * (G.settings.muteSfx ? 0 : 1);
          A.noise({ f: 3000, f2: 300, q: 0.4, dur: 0.35, vol: 0.12 * v * (d < 90 ? 1 : 0.3), ft: 'lowpass', delay: delay * 0.3 });
          A.noise({ f: 140, f2: 35, q: 0.4, dur: 3.2, vol: 0.5 * v, brown: true, ft: 'lowpass', a: 0.04, delay });
          A.noise({ f: 90, f2: 30, q: 0.5, dur: 2.2, vol: 0.35 * v, brown: true, ft: 'lowpass', a: 0.2, delay: delay + 0.5 }); }
        if (G.settings.shake !== false && out && d < 90) setTimeout(() => (g.shake = Math.max(g.shake || 0, 0.12)), (d / 170) * 1000);
      }
      if (X.flash2 && X.flash < 0.55 && X.flash > 0.4) { X.flash = 0.9; X.flash2 = 0; }
    }
    const fl = X.flash * (e.ug ? 0 : e.indoor ? 0.4 : 1);
    X.bolt.material.opacity = fl; X.bolt.visible = fl > 0.05 && out;
    X.boltLight.intensity = fl * 3.5;
    if (fl > 0) { g.hemi.intensity += fl * 2.2; const su = g.skyMat.uniforms; su.top.value.lerp(new THREE.Color(0xc8d4ff), fl * 0.7); su.hor.value.lerp(new THREE.Color(0xd8e0ff), fl * 0.6); }
    // raindrop splashes
    if (wn.rain > 0.3 && out && fx() >= 2 && g.particles) {
      const cp = g.camera.position, n = wn.rain * fx() * 14 * dt;
      for (let i = 0; i < n + (Math.random() < n % 1 ? 1 : 0); i++) { const x = cp.x + (Math.random() - 0.5) * 16, z = cp.z + (Math.random() - 0.5) * 16, y = W.groundAt(x, cp.y + 2, z); if (y < UG + 12) continue; g.particles.emit({ x, y: y + 0.02, z, vx: 0, vy: 0.9, vz: 0, life: 0.22, size: 0.05, col: 0xcfe0ee, alpha: 0.6 }); }
    }
    // leaves on the wind
    if (wn.wind > 0.65 && out && fx() >= 1 && g.particles && Math.random() < dt * wn.wind * fx() * 2.2) {
      const cp = g.player.pos, a = Math.random() * 6.28; g.particles.emit({ x: cp.x + Math.cos(a) * 6, y: cp.y + 2 + Math.random() * 2, z: cp.z + Math.sin(a) * 6, vx: wn.wind * 1.6, vy: -0.4, vz: (Math.random() - 0.5) * 0.8, life: 3.5, size: 0.06, col: [0xc9722a, 0xd99a3a, 0x8a9a3a, 0xa8502a][Math.floor(Math.random() * 4)], wander: 1.2 });
    }
    const day = 1 - (e.night || 0);
    footTick(g, dt, e.wet || 0); birdTick(g, dt, day, wn); flyTick(g, dt, day, wn);
  }
  EXT.update = function (dt, st) { oUpd(dt, st); };
})();
