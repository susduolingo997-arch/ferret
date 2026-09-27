/* =====================================================================
   actors.js - Milo the ferret, the five animal NPCs, and 3D models for
   every item. All geometry is procedural.
   ===================================================================== */
'use strict';
(function () {
  const SPH = new THREE.SphereGeometry(1, 22, 16);
  const SPH_LO = new THREE.SphereGeometry(1, 12, 9);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
  const U = G.U;

  function ball(mat, r, sx = 1, sy = 1, sz = 1, lo) {
    const m = new THREE.Mesh(lo ? SPH_LO : SPH, mat); m.scale.set(r * sx, r * sy, r * sz); m.castShadow = true; return m;
  }
  function eye(r, col = 0x0b0705) {
    const g = new THREE.Group();
    const e = new THREE.Mesh(SPH, G.Mat.std('eye' + col, { color: col, rough: 0.08, metal: 0.1, envI: 2 })); e.scale.setScalar(r); g.add(e);
    const h = new THREE.Mesh(SPH_LO, new THREE.MeshBasicMaterial({ color: 0xffffff })); h.scale.setScalar(r * 0.3); h.position.set(r * 0.35, r * 0.4, r * 0.75); g.add(h);
    const h2 = new THREE.Mesh(SPH_LO, h.material); h2.scale.setScalar(r * 0.14); h2.position.set(-r * 0.3, -r * 0.3, r * 0.85); g.add(h2);
    g.userData.ball = e; return g;
  }
  function shadowDisc(r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), G.Mat.get('shadow')); m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = 1; return m;
  }
  G.shadowDisc = shadowDisc;

  /* ================================================================ MILO */
  const MILO_PAL = { key: 'milo', brown: 0x5a3e2b, dark: 0x2f2119, cream: 0xf1e1c4, mask: 0x3a2a20, nose: 0xd98c8c, earIn: null, back: 0x3a281b, side: 0x5e422d, belly: 0xb8966f, tip: 0x241810, scale: 1.3 };
  class Ferret {
    constructor(pal) {
      pal = this.pal = Object.assign({}, MILO_PAL, pal || {}); const K = pal.key;
      const brown = G.Mat.fur(pal.brown, K), dark = G.Mat.fur(pal.dark, K + 'dark'), cream = G.Mat.fur(pal.cream, K + 'cream'), mask = G.Mat.fur(pal.mask, K + 'mask');
      this.root = new THREE.Group();
      this.shadow = shadowDisc(0.28); this.shadow.scale.set(0.8, 1.6, 1); this.root.add(this.shadow);
      this.pivot = new THREE.Group(); this.root.add(this.pivot); // hips pivot (for rearing up)
      this.rig = new THREE.Group(); this.pivot.add(this.rig);
      this.N = 7; this.sp = 0.056; this.zHind = -0.2; this.pivot.position.z = this.zHind; this.rig.position.z = -this.zHind;
      this.radii = [0.058, 0.064, 0.067, 0.067, 0.065, 0.062, 0.056];
      this.segs = [];
      for (let i = 0; i < this.N; i++) { const s = ball(brown, this.radii[i], 1, 0.88, 1.25); s.visible = false; this.rig.add(s); this.segs.push(s); }
      this.buildBody();
      this.throat = ball(cream, 0.042, 1, 0.8, 1.3); this.rig.add(this.throat);
      this.belly = ball(G.Mat.fur(0x7a5a40, 'milobelly'), 0.05, 0.9, 0.6, 2.2); this.belly.visible = false; this.rig.add(this.belly);
      // head
      this.neck = ball(brown, 0.045, 1, 0.95, 1.2); this.rig.add(this.neck);
      this.head = new THREE.Group(); this.rig.add(this.head);
      const skull = ball(brown, 0.05, 1.05, 0.9, 1.2); this.head.add(skull);
      const face = ball(cream, 0.046, 1.08, 0.92, 1.05); face.position.set(0, -0.006, 0.02); this.head.add(face);
      const crown = ball(brown, 0.034, 0.7, 0.6, 1.4); crown.position.set(0, 0.03, 0.005); this.head.add(crown);
      this.muzzle = ball(cream, 0.027, 1.05, 0.8, 1.25); this.muzzle.position.set(0, -0.016, 0.058); this.head.add(this.muzzle);
      this.jaw = ball(cream, 0.02, 1, 0.55, 1.2); this.jaw.position.set(0, -0.031, 0.05); this.head.add(this.jaw);
      const nose = ball(G.Mat.color(pal.nose, 0.4), 0.0105, 1.2, 0.8, 1); nose.position.set(0, -0.009, 0.089); this.head.add(nose); this.nose = nose;
      this.eyes = [];
      for (const sx of [-1, 1]) {
        const mk = ball(mask, 0.024, 1.15, 0.72, 0.55); mk.position.set(sx * 0.026, 0.008, 0.043); mk.rotation.y = sx * 0.5; this.head.add(mk);
        const e = eye(0.0145); e.position.set(sx * 0.028, 0.011, 0.054); e.rotation.y = sx * 0.35; this.head.add(e); this.eyes.push(e);
        const ear = new THREE.Group(); ear.position.set(sx * 0.037, 0.034, -0.012);
        const eo = ball(pal.earOut ? G.Mat.fur(pal.earOut, K + 'earo') : brown, 0.019, 1, 1, 0.42); ear.add(eo); const ei = ball(pal.earIn ? G.Mat.color(pal.earIn, 0.7) : cream, 0.014, 1, 1, 0.3); ei.position.z = 0.004; ear.add(ei);
        ear.rotation.set(-0.2, sx * 0.6, sx * 0.3); this.head.add(ear); (this.ears = this.ears || []).push(ear);
      }
      // whiskers
      const wv = [];
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { wv.push(sx * 0.018, -0.015, 0.07, sx * 0.075, -0.012 - k * 0.012 + 0.01, 0.06 + k * 0.01); }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3));
      this.head.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xf8f2e6, transparent: true, opacity: 0.6 })));
      // legs
      this.legs = [];
      const legDef = [[1, -1, 0.042], [1, 1, 0.042], [5, -1, 0.046], [5, 1, 0.046]];
      for (const [si, sx, ox] of legDef) {
        const L = new THREE.Group(); L.userData = { si, sx, ox, front: si < 3 };
        const up = new THREE.Mesh(CYL, dark); up.scale.set(0.017, 0.07, 0.019); up.position.y = -0.035; up.castShadow = true; L.add(up);
        const paw = ball(dark, 0.019, 1, 0.55, 1.4); paw.position.set(0, -0.07, 0.01); L.add(paw);
        this.rig.add(L); this.legs.push(L);
      }
      // tail
      this.tail = []; let parent = this.rig;
      for (let i = 0; i < 9; i++) {
        const t = new THREE.Group(); const r = 0.034 - i * 0.0022; const m = ball(i > 5 ? dark : G.Mat.fur(0x4a3325, 'milotail'), r, 1, 1, 1.5); m.position.z = -0.016; m.visible = false; t.add(m);
        t.position.z = i === 0 ? 0 : -0.03; parent.add(t); this.tail.push(t); parent = t;
      }
      this.root.scale.setScalar(pal.scale);
      this.t = 0; this.ph = 0; this.blinkT = 2; this.earT = 1; this.lookYaw = 0; this.lookPitch = 0; this.idleT = 0; this.rear = 0; this.curl = 0; this.arch = 0; this.crouch = 0; this.bend = 0; this.headDown = 0;
      this.lookTarget = 0; this.lookTimer = 0; this.mouth = 0;
    }
    /* continuous furry tubes (body and tail) that follow the spine: no visible segments */
    makeTube(K, S, colFn, key) {
      const n = (K + 1) * (S + 1), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), idx = [], tmp = new THREE.Color();
      for (let k = 0; k <= K; k++) for (let j = 0; j <= S; j++) {
        const i = k * (S + 1) + j, th = (j / S) * Math.PI * 2, v = k / K;
        uv[i * 2] = (j / S) * 2; uv[i * 2 + 1] = v * 3.5; colFn(tmp, Math.sin(th), v); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        if (k < K && j < S) { const a = i, b = i + S + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
      const m = G.Mat.fur(0xffffff, key); m.vertexColors = true;
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.K = K; mesh.userData.S = S; this.rig.add(mesh); return mesh;
    }
    buildBody() {
      const L = (h) => new THREE.Color(h);
      const P = this.pal, back = L(P.back), side = L(P.side), belly = L(P.belly), tip = L(P.tip);
      this.body = this.makeTube(22, 14, (c, sn, v) => { c.copy(side).lerp(back, Math.max(sn, 0) * 0.9).lerp(belly, Math.max(-sn, 0) * (0.5 + (1 - v) * 0.35)).multiplyScalar(1 - v * 0.2); if (v < 0.14) c.lerp(belly, (0.14 - v) * 4 * Math.max(-sn + 0.3, 0)); }, P.key + 'body');
      this.tailTube = this.makeTube(16, 10, (c, sn, v) => { c.copy(side).lerp(back, 0.5 + Math.max(sn, 0) * 0.3).lerp(tip, U.smooth(Math.min(1, v * 1.4))); }, P.key + 'tailtube');
    }
    updateTube(mesh, P, R, flat = 0.86) {
      const K = mesh.userData.K, S = mesh.userData.S, n = P.length - 1, pos = mesh.geometry.attributes.position.array, nor = mesh.geometry.attributes.normal.array;
      const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      const at = (u) => { const i = Math.min(Math.floor(u), n - 1), t = u - i, q = (k) => P[Math.max(0, Math.min(n, k))]; return [cr(q(i - 1)[0], q(i)[0], q(i + 1)[0], q(i + 2)[0], t), cr(q(i - 1)[1], q(i)[1], q(i + 1)[1], q(i + 2)[1], t), cr(q(i - 1)[2], q(i)[2], q(i + 1)[2], q(i + 2)[2], t)]; };
      for (let k = 0; k <= K; k++) {
        const u = (k / K) * n, c = at(u), nx = at(Math.min(n, u + 0.05)), pv = at(Math.max(0, u - 0.05));
        let tx = pv[0] - nx[0], ty = pv[1] - nx[1], tz = pv[2] - nx[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        let sx = tz, sz = -tx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
        const ux = ty * sz, uy = tz * sx - tx * sz, uz = -ty * sx;
        const ri = Math.min(Math.floor(u), n - 1), rt = u - ri; const r = R[ri] + (R[ri + 1] - R[ri]) * rt;
        for (let j = 0; j <= S; j++) {
          const th = (j / S) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), i = (k * (S + 1) + j) * 3;
          pos[i] = c[0] + sx * cs * r + ux * sn * r * flat; pos[i + 1] = c[1] + uy * sn * r * flat; pos[i + 2] = c[2] + sz * cs * r + uz * sn * r * flat;
          let a = sx * cs + ux * sn / flat, b = uy * sn / flat, d = sz * cs + uz * sn / flat; const nl = Math.hypot(a, b, d) || 1; nor[i] = a / nl; nor[i + 1] = b / nl; nor[i + 2] = d / nl;
        }
      }
      mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true;
    }
    updateBody(pts) {
      const P = [], R = [], d0 = [Math.sin(pts[0][3]), Math.cos(pts[0][3])], L = pts[pts.length - 1], dl = [Math.sin(L[3]), Math.cos(L[3])];
      P.push([pts[0][0] + d0[0] * 0.045, pts[0][1] + 0.014, pts[0][2] + d0[1] * 0.045]); R.push(0.036);
      pts.forEach((p, i) => { P.push([p[0], p[1], p[2]]); R.push(this.radii[i] * (i === 0 ? 0.92 : 1)); });
      P.push([L[0] - dl[0] * 0.04, L[1] - 0.004, L[2] - dl[1] * 0.04]); R.push(0.03);
      this.updateTube(this.body, P, R);
    }
    updateTail() {
      this.root.updateMatrixWorld(true);
      const P = [], R = [], v = new THREE.Vector3(), inv = new THREE.Matrix4().copy(this.rig.matrixWorld).invert();
      this.tail.forEach((t, i) => { v.set(0, 0, 0).applyMatrix4(t.matrixWorld).applyMatrix4(inv); P.push([v.x, v.y, v.z]); R.push(Math.max(0.012, 0.034 - i * 0.0026) * (i === 0 ? 0.95 : 1 + Math.sin(i * 0.9) * 0.06)); });
      const a = P[P.length - 2], b = P[P.length - 1]; P.push([b[0] + (b[0] - a[0]) * 0.8, b[1] + (b[1] - a[1]) * 0.8, b[2] + (b[2] - a[2]) * 0.8]); R.push(0.004);
      this.updateTube(this.tailTube, P, R, 1);
    }
    /* s: {speed, run, air, vy, action, crawl, turn, grounded} */
    update(dt, s) {
      this.t += dt; const t = this.t, act = s.action;
      const moving = s.speed > 0.08 && !act;
      const running = moving && s.run && s.speed > 2.2;
      this.ph += dt * (running ? s.speed * 3.3 : s.speed * 9.5);
      // idle behaviour timers
      if (!moving && !act && !s.air) this.idleT += dt; else this.idleT = 0;
      const wantRear = this.idleT > 6 && (this.idleT % 14) < 3.2 ? 1 : 0;
      const tgt = {
        rear: act === 'lookup' ? 1 : wantRear, curl: act === 'sleep' ? 1 : 0,
        arch: running ? 0.022 + Math.sin(this.ph) * 0.03 : act === 'dance' ? 0.05 : 0,
        crouch: s.crawl ? 1 : act === 'push' ? 0.6 : act === 'dig' ? 0.2 : 0,
        headDown: act === 'sniff' || act === 'eat' || act === 'drink' ? 1 : act === 'dig' ? 0.6 : act === 'interact' ? 0.5 : 0,
      };
      this.rear = U.damp(this.rear, tgt.rear, 6, dt); this.curl = U.damp(this.curl, tgt.curl, 3, dt);
      this.arch = U.damp(this.arch, tgt.arch, 12, dt); this.crouch = U.damp(this.crouch, tgt.crouch, 8, dt);
      this.headDown = U.damp(this.headDown, tgt.headDown, 8, dt);
      this.bend = U.damp(this.bend, U.clamp(-(s.turn || 0) * 0.05, -0.18, 0.18) + (act === 'shake' ? Math.sin(t * 38) * 0.22 : 0), act === 'shake' ? 30 : 6, dt);
      // body height
      let h = 0.1 - this.crouch * 0.03;
      let bob = 0;
      if (moving && !s.air) bob = running ? Math.abs(Math.sin(this.ph)) * 0.035 : Math.abs(Math.sin(this.ph)) * 0.006;
      if (act === 'dance') bob = Math.abs(Math.sin(t * 11)) * 0.06;
      const breathe = Math.sin(t * 2.4) * 0.0025;
      // spine
      let a = 0, x = 0, z = 0.12, pts = [];
      const curlBend = this.curl * 0.62;
      for (let i = 0; i < this.N; i++) {
        if (i > 0) { a += this.bend + curlBend + (act === 'dance' ? Math.sin(t * 5.5) * 0.06 : 0); x -= Math.sin(a) * this.sp; z -= Math.cos(a) * this.sp; }
        const y = h + bob + this.arch * Math.sin(Math.PI * i / (this.N - 1)) * 1.4 + (running ? Math.sin(this.ph + i * 0.5) * 0.012 : 0) - this.curl * 0.03;
        pts.push([x, y, z, a]);
        const sgm = this.segs[i]; sgm.position.set(x, y, z); sgm.rotation.y = a; const bs = 1 + breathe * (i > 0 && i < 5 ? 3 : 0); sgm.scale.set(this.radii[i] * bs, this.radii[i] * 0.88 * bs, this.radii[i] * 1.25);
      }
      this.pts = pts; this.updateBody(pts);
      const p0 = pts[0], p1 = pts[1], p5 = pts[5], pl = pts[this.N - 1];
      this.throat.position.set(p0[0], p0[1] - 0.03, p0[2] + 0.01);
      this.belly.position.set((p1[0] + p5[0]) / 2, (p1[1] + p5[1]) / 2 - 0.02, (p1[2] + p5[2]) / 2); this.belly.rotation.y = pts[3][3];
      // hips pivot follow
      this.pivot.position.set(p5[0], 0, p5[2]); this.rig.position.set(-p5[0], 0, -p5[2]);
      this.pivot.rotation.x = -this.rear * 1.05 + (s.air ? U.clamp(-s.vy * 0.12, -0.4, 0.4) : 0) + (act === 'dig' ? 0.12 : 0);
      this.pivot.position.y = this.rear * 0.02;
      // head
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) { this.lookTimer = 1.5 + Math.random() * 3; this.lookTarget = moving ? 0 : (Math.random() - 0.5) * 1.3; this.lookPitchT = (Math.random() - 0.6) * 0.4; }
      if (moving) this.lookTarget = U.clamp(-(s.turn || 0) * 0.08, -0.5, 0.5);
      else if (s.look !== undefined) this.lookTarget = s.look;
      this.lookYaw = U.damp(this.lookYaw, act && act !== 'hide' ? 0 : this.lookTarget, 4, dt);
      this.lookPitch = U.damp(this.lookPitch, (this.lookPitchT || 0) * (moving ? 0 : 1), 4, dt);
      let hp = this.lookPitch + this.headDown * 0.75 - this.rear * 0.8 + this.curl * 0.3;
      let hx = p0[0], hy = p0[1] + 0.035 - this.headDown * 0.05 - this.curl * 0.02, hz = p0[2] + 0.06 - this.headDown * 0.005;
      if (act === 'sniff' || act === 'eat') { hz += Math.sin(t * 20) * 0.004; hp += Math.sin(t * 8) * 0.08; }
      if (act === 'drink') hp += Math.sin(t * 14) * 0.08;
      if (act === 'sneeze') { const k = (t * 3) % 1; hp += k < 0.6 ? -0.35 * k / 0.6 : 0.5 * Math.sin((k - 0.6) / 0.4 * Math.PI); }
      if (act === 'shake') { hp += Math.sin(t * 40) * 0.12; this.lookYaw = Math.sin(t * 40) * 0.5; }
      if (act === 'hide') hp += 0.15;
      if (act === 'dig') hp += Math.sin(t * 16) * 0.05;
      if (act === 'interact') hz += Math.max(0, Math.sin(t * 6)) * 0.02;
      if (act === 'dance') { hp = -0.3 + Math.sin(t * 11) * 0.25; this.lookYaw = Math.sin(t * 5.5) * 0.4; }
      if (running) hp += Math.sin(this.ph) * 0.12;
      this.head.position.set(hx, hy, hz); this.head.rotation.set(hp, this.lookYaw + this.curl * 1.7, 0);
      if (this.curl > 0.3) this.head.position.x += this.curl * 0.05;
      this.neck.position.set(p0[0], p0[1] + 0.015 - this.headDown * 0.02, p0[2] + 0.035);
      this.jaw.position.y = -0.031 - (act === 'dance' || act === 'eat' ? Math.abs(Math.sin(t * 9)) * 0.008 : 0);
      this.nose.position.y = -0.009 + Math.sin(t * (act === 'sniff' ? 30 : 4)) * 0.0012;
      // blink / sleep eyes
      this.blinkT -= dt; let eyeS = 1; if (this.blinkT < 0.12) eyeS = 0.15; if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
      if (act === 'sleep') eyeS = 0.08; if (act === 'dance') eyeS = 1.1;
      for (const e of this.eyes) e.scale.y = U.damp(e.scale.y, eyeS, 30, dt);
      // ears
      this.earT -= dt; const tw = this.earT < 0.15 ? 0.4 : 0; if (this.earT < 0) this.earT = 1 + Math.random() * 5;
      this.ears.forEach((ear, i) => { const sx = i ? 1 : -1; ear.rotation.z = sx * (0.3 + (i ? tw : 0) + (running || act === 'hide' ? -0.3 : 0)); ear.rotation.x = -0.2 - (s.air ? 0.4 : 0) - (act === 'hide' ? 0.5 : 0); });
      // legs
      for (const L of this.legs) {
        const d = L.userData, p = pts[d.si];
        L.position.set(p[0] + Math.cos(p[3]) * d.ox * d.sx, p[1] - 0.02, p[2] - Math.sin(p[3]) * d.ox * d.sx);
        L.rotation.y = p[3];
        let sw = 0, lift = 0;
        if (moving && !s.air) {
          if (running) { const ph = this.ph + (d.front ? 0 : Math.PI) + (d.sx > 0 ? 0.35 : 0); sw = Math.sin(ph) * 0.9; }
          else { const ph = this.ph + (d.front ? 0 : Math.PI) + (d.sx > 0 ? Math.PI : 0); sw = Math.sin(ph) * 0.55; lift = Math.max(0, Math.cos(ph)) * 0.012; }
        } else if (s.air) sw = d.front ? -0.8 : 0.9;
        else if (act === 'dig' && d.front) sw = Math.sin(t * 22 + (d.sx > 0 ? Math.PI : 0)) * 0.9 - 0.3;
        else if (act === 'push') sw = Math.sin(t * 7 + (d.front ? 0 : Math.PI) + (d.sx > 0 ? Math.PI : 0)) * 0.5;
        else if (act === 'dance') sw = Math.sin(t * 11 + (d.front ? 0 : 1)) * 0.4;
        else if (act === 'interact' && d.front && d.sx > 0) sw = -Math.max(0, Math.sin(t * 6)) * 0.9;
        if (this.rear > 0.1 && d.front) sw = U.lerp(sw, -0.5, this.rear);
        if (this.curl > 0.1) sw = U.lerp(sw, d.front ? -1.2 : 1.2, this.curl);
        if (this.rear > 0.1 && !d.front) sw = U.lerp(sw, 0.9, this.rear);
        L.rotation.x = sw; L.position.y += lift + this.crouch * 0.012;
        L.scale.y = 1 - this.crouch * 0.25;
      }
      // tail
      const tailRoot = pl; this.tail[0].position.set(tailRoot[0], tailRoot[1] + 0.005, tailRoot[2] - 0.03);
      const happy = act === 'dance' || act === 'sniff';
      this.tail.forEach((tl, i) => {
        let yaw = Math.sin(t * (happy ? 9 : 1.6) - i * 0.6) * (happy ? 0.35 : 0.12) + (i === 0 ? tailRoot[3] : 0) + this.bend * 0.8 + this.curl * 0.55;
        let pitch = (i === 0 ? -0.15 : 0.06) + (running ? Math.sin(this.ph - i * 0.7) * 0.2 : 0) + (s.air ? -0.1 : 0);
        if (this.rear > 0.1 && i === 0) pitch += this.rear * 0.9;
        tl.rotation.set(pitch, yaw, 0);
      });
      this.updateTail();
      this.shadow.position.x = pts[3][0]; this.shadow.position.z = pts[3][2];
    }
  }
  G.Ferret = Ferret;

  /* ================================================================ NPCs
     A small builder library; each species returns a group with named
     parts, and a shared animator that handles idle / walk / talk / emote. */
  function quadLegs(g, mat, spots, len, r) {
    const legs = [];
    for (const [x, y, z, front] of spots) {
      const L = new THREE.Group(); L.position.set(x, y, z); const up = new THREE.Mesh(CYL, mat); up.scale.set(r, len, r); up.position.y = -len / 2; up.castShadow = true; L.add(up);
      const paw = ball(mat, r * 1.15, 1, 0.6, 1.4); paw.position.set(0, -len, r * 0.4); L.add(paw); L.userData.front = front; L.userData.side = Math.sign(x); g.add(L); legs.push(L);
    }
    return legs;
  }

  const BUILD = {
    pip() {
      const fur = G.Mat.fur(0xa4532c, 'pip'), belly = G.Mat.fur(0xf0dcc0, 'pipb'), dark = G.Mat.fur(0x6a3218, 'pipd');
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = ball(fur, 0.07, 0.9, 1.1, 1); torso.position.set(0, 0.1, 0); torso.rotation.x = -0.6; body.add(torso);
      const bel = ball(belly, 0.055, 0.8, 1, 0.7); bel.position.set(0, 0.1, 0.03); bel.rotation.x = -0.6; body.add(bel);
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.04); body.add(head);
      head.add(ball(fur, 0.05, 1, 0.95, 1.05)); const cheek = ball(belly, 0.035, 1.2, 0.8, 1); cheek.position.set(0, -0.015, 0.03); head.add(cheek);
      const nose = ball(G.Mat.color(0x3a2016), 0.008); nose.position.set(0, -0.005, 0.058); head.add(nose);
      const eyes = []; for (const sx of [-1, 1]) { const e = eye(0.014); e.position.set(sx * 0.026, 0.012, 0.04); e.rotation.y = sx * 0.4; head.add(e); eyes.push(e); const ear = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.045, 8), fur); ear.position.set(sx * 0.028, 0.055, -0.005); ear.rotation.z = -sx * 0.25; ear.castShadow = true; head.add(ear); const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.025, 6), dark); tuft.position.set(sx * 0.034, 0.085, -0.005); head.add(tuft); }
      const legs = quadLegs(body, dark, [[-0.03, 0.14, 0.05, 1], [0.03, 0.14, 0.05, 1], [-0.045, 0.06, -0.02, 0], [0.045, 0.06, -0.02, 0]], 0.05, 0.012);
      // big S-curve tail
      const tail = []; let par = body; const tr = [0.03, 0.045, 0.055, 0.06, 0.06, 0.055, 0.045];
      for (let i = 0; i < tr.length; i++) { const t = new THREE.Group(); const m = ball(i % 2 ? fur : G.Mat.fur(0xb86a3c, 'pipt'), tr[i], 1, 1, 1.2); t.add(m); if (i === 0) t.position.set(0, 0.04, -0.07); else t.position.set(0, 0.05, -0.02); t.rotation.x = i < 4 ? -0.5 : 0.35; par.add(t); tail.push(t); par = t; }
      return { g, body, head, eyes, legs, tail, height: 0.28, hop: true };
    },
    nora() {
      const fur = G.Mat.fur(0xb3a08a, 'nora'), light = G.Mat.fur(0xeee4d6, 'noral'), pink = G.Mat.color(0xe5a3a0, 0.7);
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = ball(fur, 0.12, 0.95, 0.9, 1.2); torso.position.set(0, 0.12, -0.02); body.add(torso);
      const haunch = ball(fur, 0.09, 1.2, 0.9, 0.9); haunch.position.set(0, 0.09, -0.08); body.add(haunch);
      const chest = ball(light, 0.07, 1, 1, 0.8); chest.position.set(0, 0.12, 0.08); body.add(chest);
      const cotton = ball(G.Mat.fur(0xffffff, 'cotton'), 0.04); cotton.position.set(0, 0.15, -0.17); body.add(cotton);
      const head = new THREE.Group(); head.position.set(0, 0.23, 0.1); body.add(head);
      head.add(ball(fur, 0.07, 0.95, 0.9, 1.1)); const snout = ball(light, 0.04, 1.1, 0.8, 1); snout.position.set(0, -0.02, 0.055); head.add(snout);
      const nose = ball(pink, 0.01); nose.position.set(0, -0.005, 0.092); head.add(nose);
      const eyes = []; const ears = [];
      for (const sx of [-1, 1]) {
        const e = eye(0.017, 0x2b1a10); e.position.set(sx * 0.045, 0.015, 0.04); e.rotation.y = sx * 0.7; head.add(e); eyes.push(e);
        const ear = new THREE.Group(); ear.position.set(sx * 0.03, 0.05, -0.02); const eo = ball(fur, 0.03, 0.6, 2.6, 0.35); eo.position.y = 0.07; ear.add(eo); const ei = ball(pink, 0.022, 0.45, 2.2, 0.2); ei.position.set(0, 0.07, 0.008); ear.add(ei); ear.rotation.set(-0.25, 0, -sx * 0.25); head.add(ear); ears.push(ear);
      }
      // her blue knitted scarf
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 18), G.Mat.std('scarf', { color: 0x3f6f9e, rough: 1, map: 'fabric' })); scarf.position.set(0, 0.18, 0.07); scarf.rotation.x = Math.PI / 2 - 0.4; body.add(scarf);
      const tailEnd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.012), scarf.material); tailEnd.position.set(0.04, 0.13, 0.12); tailEnd.rotation.z = 0.2; body.add(tailEnd);
      const legs = quadLegs(body, fur, [[-0.04, 0.07, 0.08, 1], [0.04, 0.07, 0.08, 1], [-0.07, 0.06, -0.06, 0], [0.07, 0.06, -0.06, 0]], 0.05, 0.018);
      return { g, body, head, eyes, legs, ears, tail: [], height: 0.4, hop: true };
    },
    bram() {
      const fur = G.Mat.fur(0xc49a5e, 'bram'), grey = G.Mat.fur(0xd9d1c3, 'bramg'), dark = G.Mat.fur(0x7a5530, 'bramd');
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = ball(fur, 0.2, 0.9, 0.8, 1.6); torso.position.set(0, 0.26, 0); body.add(torso);
      const chest = ball(grey, 0.14, 1, 1, 0.8); chest.position.set(0, 0.26, 0.22); body.add(chest);
      const head = new THREE.Group(); head.position.set(0, 0.46, 0.33); body.add(head);
      head.add(ball(fur, 0.12, 1, 0.95, 1.05));
      const muz = ball(grey, 0.07, 1, 0.8, 1.3); muz.position.set(0, -0.04, 0.11); head.add(muz);
      const nose = ball(G.Mat.color(0x1b1512, 0.3), 0.025, 1.2, 0.8, 1); nose.position.set(0, -0.02, 0.2); head.add(nose);
      const brow = ball(grey, 0.04, 2.2, 0.6, 1); brow.position.set(0, 0.05, 0.08); head.add(brow);
      const eyes = [], ears = [];
      for (const sx of [-1, 1]) {
        const e = eye(0.02, 0x2b1a0e); e.position.set(sx * 0.055, 0.025, 0.09); e.rotation.y = sx * 0.3; head.add(e); eyes.push(e);
        const ear = new THREE.Group(); ear.position.set(sx * 0.1, 0.05, -0.01); const eo = ball(dark, 0.06, 0.35, 1.4, 0.9); eo.position.y = -0.07; ear.add(eo); ear.rotation.z = sx * 0.2; head.add(ear); ears.push(ear);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 20), G.Mat.color(0xa3322a, 0.6)); collar.position.set(0, 0.38, 0.25); collar.rotation.x = Math.PI / 2 - 0.5; body.add(collar);
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 14), G.Mat.get('brass')); tag.position.set(0, 0.29, 0.33); tag.rotation.x = Math.PI / 2 - 0.2; body.add(tag);
      const legs = quadLegs(body, fur, [[-0.1, 0.18, 0.22, 1], [0.1, 0.18, 0.22, 1], [-0.11, 0.18, -0.2, 0], [0.11, 0.18, -0.2, 0]], 0.17, 0.035);
      const tail = []; let par = body; for (let i = 0; i < 4; i++) { const t = new THREE.Group(); t.add(ball(fur, 0.035 - i * 0.005, 1, 1, 1.8)); t.position.set(0, i ? 0 : 0.34, i ? -0.06 : -0.3); t.rotation.x = i ? 0.2 : -0.6; par.add(t); tail.push(t); par = t; }
      return { g, body, head, eyes, legs, ears, tail, height: 0.6, lies: true };
    },
    tilly() {
      const fur = G.Mat.fur(0xd98a47, 'tilly'), white = G.Mat.fur(0xf7efe4, 'tillyw'), pink = G.Mat.color(0xe79a9a, 0.6);
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = ball(fur, 0.09, 0.85, 0.85, 1.9); torso.position.set(0, 0.17, 0); body.add(torso);
      const chest = ball(white, 0.07, 0.9, 1, 0.9); chest.position.set(0, 0.16, 0.12); body.add(chest);
      const head = new THREE.Group(); head.position.set(0, 0.28, 0.18); body.add(head);
      head.add(ball(fur, 0.07, 1.1, 0.95, 1)); const mz = ball(white, 0.04, 1.2, 0.8, 1); mz.position.set(0, -0.025, 0.045); head.add(mz);
      const nose = ball(pink, 0.009); nose.position.set(0, -0.008, 0.075); head.add(nose);
      const eyes = [], ears = [];
      for (const sx of [-1, 1]) {
        const e = eye(0.018, 0x6aa84f); e.position.set(sx * 0.032, 0.012, 0.055); e.rotation.y = sx * 0.35; e.userData.ball.scale.x = 0.012; head.add(e); eyes.push(e);
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), fur); ear.position.set(sx * 0.045, 0.065, -0.005); ear.rotation.set(0, Math.PI / 4, -sx * 0.25); ear.castShadow = true; head.add(ear); ears.push(ear);
      }
      // tabby stripes
      for (let i = 0; i < 4; i++) { const st = ball(G.Mat.fur(0xa65a24, 'tillys'), 0.02, 4.6, 0.4, 0.7); st.position.set(0, 0.24, 0.08 - i * 0.07); body.add(st); }
      const legs = quadLegs(body, fur, [[-0.045, 0.12, 0.12, 1], [0.045, 0.12, 0.12, 1], [-0.05, 0.12, -0.12, 0], [0.05, 0.12, -0.12, 0]], 0.12, 0.018);
      legs.forEach((l) => { l.children[1].material = white; });
      const tail = []; let par = body; for (let i = 0; i < 7; i++) { const t = new THREE.Group(); t.add(ball(i === 6 ? white : fur, 0.018, 1, 1, 2)); t.position.set(0, i ? 0 : 0.2, i ? -0.04 : -0.16); t.rotation.x = i ? -0.22 : -0.9; par.add(t); tail.push(t); par = t; }
      return { g, body, head, eyes, legs, ears, tail, height: 0.36, cat: true };
    },
    moss() {
      const face = G.Mat.fur(0xd9bf96, 'moss'), dark = G.Mat.color(0x2a1f18, 0.4);
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const torso = ball(G.Mat.fur(0x8a6e52, 'mossb'), 0.1, 1, 0.8, 1.2); torso.position.set(0, 0.08, 0); body.add(torso);
      const head = new THREE.Group(); head.position.set(0, 0.08, 0.1); body.add(head);
      head.add(ball(face, 0.05, 1, 0.9, 1.2)); const snout = ball(face, 0.025, 1, 0.9, 1.3); snout.position.set(0, -0.012, 0.055); head.add(snout);
      const nose = ball(dark, 0.011); nose.position.set(0, -0.01, 0.087); head.add(nose);
      const eyes = []; for (const sx of [-1, 1]) { const e = eye(0.011); e.position.set(sx * 0.028, 0.014, 0.04); e.rotation.y = sx * 0.4; head.add(e); eyes.push(e); const ear = ball(face, 0.012, 1, 1, 0.5); ear.position.set(sx * 0.035, 0.04, 0.0); head.add(ear); }
      // spines: instanced cones over the back
      const n = 170, cone = new THREE.ConeGeometry(0.01, 0.07, 5); cone.translate(0, 0.035, 0);
      const sp = new THREE.InstancedMesh(cone, G.Mat.std('spine', { color: 0xffffff, rough: 0.7 }), n); sp.castShadow = true;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color(); const r = U.rng(9);
      for (let i = 0; i < n; i++) {
        const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 1.25); const dir = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u) * 1.2 - 0.25).normalize();
        if (dir.z > 0.55 && dir.y < 0.6) { i--; continue; }
        q.setFromUnitVectors(up, dir); m.compose(new THREE.Vector3(dir.x * 0.09, 0.08 + dir.y * 0.07, dir.z * 0.1), q, new THREE.Vector3(1, 0.8 + r() * 0.5, 1)); sp.setMatrixAt(i, m);
        sp.setColorAt(i, col.set(r() > 0.3 ? 0x4a3524 : 0xe8dcc4));
      }
      body.add(sp);
      const legs = quadLegs(body, G.Mat.fur(0x6a5240, 'mossl'), [[-0.05, 0.04, 0.05, 1], [0.05, 0.04, 0.05, 1], [-0.05, 0.04, -0.06, 0], [0.05, 0.04, -0.06, 0]], 0.035, 0.012);
      return { g, body, head, eyes, legs, tail: [], height: 0.2, spines: sp, shy: true };
    },
  };

  class Critter {
    constructor(id) {
      const b = BUILD[id](); Object.assign(this, b); this.id = id;
      this.root = new THREE.Group(); this.root.add(this.g); this.g.add(shadowDisc(id === 'bram' ? 0.45 : 0.22));
      this.t = Math.random() * 10; this.ph = 0; this.blink = 3; this.emote = null; this.emoteT = 0; this.curl = 0;
      this.state = { moving: false, speed: 0, talk: false };
      if (id === 'bram') this.root.scale.setScalar(1.25);
      if (id === 'moss') this.root.scale.setScalar(1.3);
      if (id === 'pip') this.root.scale.setScalar(1.35);
      if (id === 'nora') this.root.scale.setScalar(1.2);
      if (id === 'tilly') this.root.scale.setScalar(1.3);
    }
    setEmote(e) { this.emote = e; this.emoteT = 0; }
    update(dt) {
      this.t += dt; const t = this.t, s = this.state; this.emoteT += dt;
      const e = this.emoteT < 1.6 ? this.emote : null;
      this.ph += dt * (s.moving ? 12 : 0);
      // body
      let by = 0, rx = 0;
      if (this.hop && s.moving) by = Math.abs(Math.sin(this.ph * 0.5)) * 0.06;
      if (e === 'happy') by = Math.abs(Math.sin(t * 12)) * 0.04;
      if (e === 'surprised') by = Math.max(0, 0.05 - this.emoteT * 0.06);
      if (this.lies && !s.moving) { by = -0.14; }
      this.body.position.y = U.damp(this.body.position.y, by, 14, dt);
      this.body.rotation.x = rx;
      // hedgehog curls into a ball when startled
      if (this.shy) { this.curl = U.damp(this.curl, s.scared ? 1 : 0, 6, dt); this.head.scale.setScalar(1 - this.curl * 0.8); this.head.position.z = 0.1 - this.curl * 0.07; this.body.scale.set(1 + this.curl * 0.05, 1 + this.curl * 0.3, 1 - this.curl * 0.1); }
      // head
      const talkNod = s.talk ? Math.sin(t * 7) * 0.05 : 0;
      let hy = Math.sin(t * 0.7) * 0.3, hp = talkNod;
      if (this.id === 'pip') { hy = Math.sin(t * 3.1) * 0.5 * (Math.sin(t * 1.3) > 0 ? 1 : 0.2); hp += Math.sin(t * 9) * 0.03; }
      if (s.lookYaw !== undefined) hy = s.lookYaw;
      if (e === 'sad') hp += 0.35; if (e === 'think') { hp -= 0.2; hy += 0.3; }
      if (e === 'surprised') hp -= 0.25;
      this.head.rotation.y = U.dampAngle(this.head.rotation.y, U.clamp(hy, -1, 1), 5, dt);
      this.head.rotation.x = U.damp(this.head.rotation.x, hp, 8, dt);
      if (this.lies) this.head.position.y = U.damp(this.head.position.y, s.talk || s.alert ? 0.46 : 0.38, 3, dt);
      // blink
      this.blink -= dt; const es = this.blink < 0.1 || (this.shy && this.curl > 0.5) ? 0.12 : e === 'happy' ? 0.55 : 1; if (this.blink < 0) this.blink = 2 + Math.random() * 4;
      this.eyes.forEach((ey) => (ey.scale.y = es));
      // ears
      if (this.ears) this.ears.forEach((ear, i) => { const tw = Math.sin(t * 1.3 + i * 2) > 0.97 ? 0.3 : 0; if (this.id === 'nora') ear.rotation.x = -0.25 + tw + (e === 'surprised' ? -0.3 : 0) + (e === 'sad' ? 0.6 : 0); else if (this.id === 'bram') ear.rotation.x = s.talk ? -0.2 : 0; else ear.rotation.x = tw; });
      // legs
      this.legs.forEach((L) => { const ph = this.ph + (L.userData.front ? 0 : Math.PI) + (L.userData.side > 0 ? 0.5 : 0); L.rotation.x = s.moving ? Math.sin(this.hop ? this.ph * 0.5 : ph) * 0.7 : this.lies ? (L.userData.front ? -1.4 : 1.4) : 0; });
      // tail
      this.tail.forEach((tl, i) => {
        if (this.id === 'bram') tl.rotation.y = Math.sin(t * (s.talk || e === 'happy' ? 10 : 2.5)) * 0.4;
        else if (this.cat) { tl.rotation.y = Math.sin(t * 1.4 - i * 0.5) * 0.18; }
        else if (this.id === 'pip') tl.rotation.z = Math.sin(t * 4 - i * 0.4) * (Math.sin(t * 0.9) > 0.5 ? 0.25 : 0.05);
      });
    }
  }
  G.Critter = Critter;

  /* ================================================================ ITEMS */
  function gearGeo(r, teeth, th) {
    const sh = new THREE.Shape(); const n = teeth * 2;
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = (Math.floor(i / 2) % 2 ? r * 0.82 : r); if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g;
  }
  G.makeItem = function (id) {
    const g = new THREE.Group(); const M = G.Mat; let m;
    const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
    switch (id) {
      case 'key': case 'tinykey': {
        const s = id === 'tinykey' ? 0.6 : 1, mat = id === 'tinykey' ? M.get('brass') : M.color(0x8d7a55, 0.4, 0.8);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, 0.009 * s, 8, 20), mat), -0.06 * s, 0.01, 0).rotation.x = Math.PI / 2;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.007 * s, 0.007 * s, 0.1 * s, 8), mat), 0.02 * s, 0.01, 0).rotation.z = Math.PI / 2;
        add(new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.006 * s, 0.03 * s), mat), 0.06 * s, 0.01, 0.015 * s);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.01 * s, 0.006 * s, 0.022 * s), mat), 0.045 * s, 0.01, 0.012 * s);
        break;
      }
      case 'note': case 'journal': {
        m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: G.Tex.picture(id), roughness: 0.9, side: THREE.DoubleSide }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = 0.3; add(m, 0, 0.004, 0); if (id === 'journal') { add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), M.color(0x6b3b2a, 0.8)), 0, -0.008, 0); m.position.y = 0.004; }
        break;
      }
      case 'ribbon': {
        const rm = M.std('ribbon', { color: 0xc4262e, rough: 0.35, envI: 1 });
        for (const sx of [-1, 1]) { const l = add(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 8, 16), rm), sx * 0.025, 0.02, 0); l.scale.set(1, 0.6, 1); l.rotation.y = Math.PI / 2; }
        add(new THREE.Mesh(SPH, rm), 0, 0.02, 0).scale.setScalar(0.012);
        for (const sx of [-1, 1]) { const tl = add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.005, 0.06), rm), sx * 0.015, 0.006, 0.03); tl.rotation.y = sx * 0.4; }
        break;
      }
      case 'flashlight': {
        const body = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.1, 14), M.std('flash', { color: 0x2f6fb0, rough: 0.35, metal: 0.4 })), 0, 0.016, 0); body.rotation.z = Math.PI / 2;
        const head = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, 0.03, 14), M.get('chrome')), 0.06, 0.016, 0); head.rotation.z = Math.PI / 2;
        const lens = add(new THREE.Mesh(new THREE.CircleGeometry(0.019, 14), M.std('lens', { color: 0xfff2c0, emissive: 0xfff2c0, ei: 0.8 })), 0.076, 0.016, 0); lens.rotation.y = Math.PI / 2;
        add(new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), M.get('chrome')), -0.06, 0.016, 0);
        break;
      }
      case 'feather': case 'feather2': case 'feather3': case 'feather4': case 'feather5': {
        const cols = { feather: 0x3b6fb5, feather2: 0xd8d0c0, feather3: 0xc0492f, feather4: 0x2e2e2e, feather5: 0xb8a07a };
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.03, 0.06, 0.005, 0.16); sh.quadraticCurveTo(-0.03, 0.07, 0, 0);
        m = add(new THREE.Mesh(new THREE.ShapeGeometry(sh), M.std('fth' + id, { color: cols[id], rough: 0.7, side: THREE.DoubleSide })), 0, 0.01, 0); m.rotation.x = -Math.PI / 2 + 0.15; m.rotation.z = 0.5;
        break;
      }
      case 'photo': case 'photo1': case 'photo2': case 'photo3': case 'photo4': case 'photo5': {
        const k = id === 'photo' ? 'photo1' : id;
        add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.004, 0.14), M.color(0xf1e7d0, 0.9)), 0, 0.002, 0);
        m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.135, 0.135), new THREE.MeshStandardMaterial({ map: G.Tex.picture(k), roughness: 0.6 })), 0, 0.0045, 0); m.rotation.x = -Math.PI / 2;
        g.rotation.y = 0.4; break;
      }
      case 'stone': case 'shiny': case 'marble': case 'button': case 'coin': {
        if (id === 'stone') { m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), M.std('opal', { color: 0x9fd6e8, rough: 0.05, metal: 0.6, envI: 2.5, flat: true })), 0, 0.028, 0); m.scale.set(1.2, 0.8, 1); }
        else if (id === 'marble') { m = add(new THREE.Mesh(SPH, M.std('marble', { color: 0x4fa3d9, rough: 0.02, metal: 0.1, envI: 2, transparent: true, opacity: 0.85 })), 0, 0.02, 0); m.scale.setScalar(0.02); }
        else if (id === 'button') { m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 16), M.std('btn', { color: 0xd4a347, rough: 0.25, metal: 0.9 })), 0, 0.004, 0); }
        else if (id === 'coin') { m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 20), M.get('chrome')), 0, 0.003, 0); }
        else { m = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), M.std('gem', { color: 0xe86f9a, rough: 0.05, metal: 0.3, envI: 2.5, flat: true })), 0, 0.025, 0); }
        break;
      }
      case 'bottlecap': { m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.01, 18, 1, true), M.std('cap', { color: 0xc62f2f, rough: 0.3, metal: 0.8, side: THREE.DoubleSide })), 0, 0.006, 0); add(new THREE.Mesh(new THREE.CircleGeometry(0.018, 18), M.get('cap' in M.cache ? 'cap' : 'red')), 0, 0.011, 0).rotation.x = -Math.PI / 2; break; }
      case 'foil': { m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), M.std('foil', { color: 0xdddddd, rough: 0.25, metal: 1, flat: true })), 0, 0.022, 0); break; }
      case 'gear': { m = add(new THREE.Mesh(gearGeo(0.035, 10, 0.008), M.get('brass')), 0, 0.001, 0); break; }
      case 'treat': case 'berries': case 'acorn': {
        if (id === 'treat') { for (let i = 0; i < 3; i++) { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.035, 8), M.color(0x9c5a2c, 0.8)), (i - 1) * 0.022, 0.01, (i % 2) * 0.01); b.rotation.z = Math.PI / 2; b.rotation.y = i; } }
        else if (id === 'berries') { for (let i = 0; i < 5; i++) add(new THREE.Mesh(SPH_LO, M.std('berry', { color: 0x3b4a9e, rough: 0.3 })), Math.cos(i * 1.3) * 0.015, 0.012 + (i === 4 ? 0.012 : 0), Math.sin(i * 1.3) * 0.015).scale.setScalar(0.012); }
        else { add(new THREE.Mesh(SPH, M.color(0x9c6b3a, 0.5)), 0, 0.02, 0).scale.set(0.016, 0.02, 0.016); add(new THREE.Mesh(SPH, M.color(0x5b3a22, 0.9)), 0, 0.034, 0).scale.set(0.018, 0.009, 0.018); }
        break;
      }
      case 'musicbox': {
        const wood = M.std('mbwood', { color: 0x7a3f28, rough: 0.35, envI: 1.2 });
        add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.11), wood), 0, 0.04, 0);
        const lid = add(new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.02, 0.115), wood), 0, 0.09, 0); g.userData.lid = lid;
        add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.12), M.get('brass')), 0, 0.08, 0);
        const crank = add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6), M.get('brass')), 0.1, 0.05, 0); crank.rotation.z = Math.PI / 2;
        g.userData.crank = crank;
        const inlay = add(new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), M.get('brass')), 0, 0.1005, 0); inlay.rotation.x = -Math.PI / 2;
        break;
      }
      case 'ball': { add(new THREE.Mesh(SPH, M.std('toyball', { color: 0xe2463b, rough: 0.4 })), 0, 0.04, 0).scale.setScalar(0.04); add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 6, 20), M.color(0xf2d24b, 0.4)), 0, 0.04, 0); break; }
      case 'mouse': { add(new THREE.Mesh(SPH, M.fur(0x9a9a9a, 'toymouse')), 0, 0.025, 0).scale.set(0.028, 0.024, 0.045); add(new THREE.Mesh(SPH_LO, M.color(0xe8a0a0)), 0, 0.045, -0.01).scale.set(0.012, 0.012, 0.004); const t = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), M.color(0xe8a0a0)), 0, 0.01, -0.07); t.rotation.x = Math.PI / 2; break; }
      case 'duck': { add(new THREE.Mesh(SPH, M.std('duck', { color: 0xf5cf2f, rough: 0.35 })), 0, 0.03, 0).scale.set(0.035, 0.028, 0.045); add(new THREE.Mesh(SPH, M.get('duck')), 0, 0.065, 0.022).scale.setScalar(0.022); add(new THREE.Mesh(SPH_LO, M.color(0xe87b27, 0.4)), 0, 0.062, 0.045).scale.set(0.012, 0.006, 0.014); break; }
      case 'sock': { const sm = M.std('sock', { color: 0x6aa0c9, rough: 1, map: 'fabric' }); add(new THREE.Mesh(CYL, sm), 0, 0.015, 0).scale.set(0.025, 0.1, 0.02); g.children[0].rotation.x = Math.PI / 2; add(new THREE.Mesh(SPH, sm), 0, 0.02, 0.055).scale.set(0.028, 0.02, 0.035); break; }
      case 'bell': { add(new THREE.Mesh(SPH, M.get('brass')), 0, 0.02, 0).scale.setScalar(0.02); break; }
      default: add(new THREE.Mesh(SPH, M.color(0xff00ff)), 0, 0.02, 0).scale.setScalar(0.02);
    }
    return g;
  };

  /* ================================================================ Portraits
     A second, tiny renderer photographs characters and items once at
     start-up; the images are used by the dialogue box and inventory. */
  G.Portrait = {
    init() {
      this.r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.r.setSize(192, 192); this.r.outputEncoding = THREE.sRGBEncoding; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0;
      this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
      this.scene.add(new THREE.HemisphereLight(0xfff2dd, 0x6a5040, 0.75)); const d = new THREE.DirectionalLight(0xffffff, 0.95); d.position.set(1, 2, 2); this.scene.add(d);
      const rim = new THREE.DirectionalLight(0xffd9a0, 0.8); rim.position.set(-2, 1, -1); this.scene.add(rim);
      this.cache = {};
    },
    shot(key, obj, camPos, look) {
      if (!this.r) this.init();
      if (this.cache[key]) return this.cache[key];
      this.scene.add(obj); this.cam.position.copy(camPos); this.cam.lookAt(look); this.r.render(this.scene, this.cam);
      const url = this.r.domElement.toDataURL(); this.scene.remove(obj); return (this.cache[key] = url);
    },
    character(id) {
      const V = THREE.Vector3;
      if (id === 'milo') { const f = new Ferret(); f.idleT = -99; f.update(0.016, { speed: 0 }); const hp = new V(); f.head.getWorldPosition(hp); return this.shot(id, f.root, new V(hp.x + 0.16, hp.y + 0.04, hp.z + 0.42), new V(hp.x, hp.y - 0.02, hp.z)); }
      const c = new Critter(id); c.update(0.016); c.g.updateMatrixWorld(true); const hp = new V(); c.head.getWorldPosition(hp);
      const d = { pip: 0.45, nora: 0.62, bram: 1.1, tilly: 0.6, moss: 0.5 }[id];
      return this.shot(id, c.root, new V(hp.x + d * 0.35, hp.y + d * 0.1, hp.z + d), new V(hp.x, hp.y - d * 0.05, hp.z));
    },
    item(id) {
      const it = G.makeItem(id); const box = new THREE.Box3().setFromObject(it); const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3()).length();
      return this.shot('item-' + id, it, new THREE.Vector3(c.x + s * 0.5, c.y + s * 1.1, c.z + s * 1.2), c);
    },
  };
})();
