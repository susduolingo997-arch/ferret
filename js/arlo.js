/* =====================================================================
   arlo.js - Bonus Chapter II: Grandpa Arlo.
   If Milo stays in the car at Gus's gas station, the family drives on
   to Saltwhistle Bay: Grandpa Arlo's cottage by the sea, a pier with a
   stopped tide clock, tide pools, beach huts and a lighthouse.
   Built as a lazily loaded region far to the east of the farmland.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, R = G.Regions, NPC = G.NPC, EXT = G.EXT, SQ = G.SQ;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const has = (f) => !!S().flags[f], st = () => S().step, ch = () => S().chapter, item = (i) => game().hasItem(i);
  const ss = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const say = (lines, done) => game().say(lines, done);
  const C = () => G.Cast, Q = () => G.SEQ.api;

  /* ================================================================ the bay */
  const shoreX = (z) => 293 + Math.sin(z * 0.06) * 2.5 + Math.sin(z * 0.17) * 0.8;
  const pointD = (x, z) => Math.hypot((x - 306) * 0.8, z + 48);
  const poolD = (x, z) => { const ax = 289, az = -21, bx = 299, bz = -26, dx = bx - ax, dz = bz - az, k = U.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - ax - dx * k, z - az - dz * k); };
  function bayH(x, z) {
    const sx = shoreX(z);
    let y = -0.9 * ss(sx - 8, sx + 10, x) - 1.2 * ss(sx + 10, sx + 30, x);
    y += 0.3 * Math.max(0, Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.23)) * ss(sx - 11, sx - 7, x) * (1 - ss(sx - 3, sx, x));
    const pd = pointD(x, z); if (pd < 19) y = Math.max(y, 1.7 * ss(13, 4, pd) + 0.62 * ss(19, 11, pd) - 0.6);
    y = Math.max(y, U.lerp(-2, -0.28, ss(8, 4.5, poolD(x, z)))); // the rock shelf with the tide pools
    return y;
  }
  const B = (W.pts.bay = {
    road: [238, 0, -6], car: [253, 0, -4.4], cottage: [266, 0, -6], porch: [271.4, 0, -6], bench: [271.6, 0.34, -7.6], shed: [259, 0, -16],
    pier0: [284, 0, 12], clock: [320.4, 0.35, 12], pools: [297.5, 0, -25.5], huts: [282, 0, 30], light: [306, 0, -48], castle: [289.2, 0, 3.4], deck: [283.4, 0, -1.6],
  });
  const PIER_Y = 0.35, BO = {};
  G.CATS.seaside = 'Seaside Treasures';

  R.def({
    id: 'bay', name: 'Saltwhistle Bay', bounds: [236, 330, -70, 50], manual: true, preload: 0,
    areas: [
      ['bayPier', 'The Pier', 283, 323, 10.6, 13.4, { zone: 'coast', surf: 'wood', y0: 0.1, y1: 3 }],
      ['bayPools', 'The Tide Pools', 292, 304, -34, -18, { zone: 'beach', surf: 'stone' }],
      ['bayLight', 'Lighthouse Point', 296, 318, -60, -38, { zone: 'beach', surf: 'stone' }],
      ['bayHuts', 'Beach Huts', 276, 292, 20, 44, { zone: 'beach', surf: 'dirt' }],
      ['bayCottage', 'Arlo’s Cottage', 250, 280, -20, 4, { zone: 'coast', surf: 'grass' }],
      ['bayBeach', 'Saltwhistle Beach', 282, 330, -70, 50, { zone: 'beach', surf: 'dirt' }],
      ['bay', 'Saltwhistle Bay', 236, 330, -70, 50, { zone: 'coast', surf: 'grass' }],
    ],
    terrains: [{ x0: 236, x1: 330, z0: -70, z1: 50, h: bayH }],
    hazards: [{ type: 'rect', x0: 289, x1: 470, z0: -150, z1: 130, y: -0.5, name: 'sea' }],
    build(ctx) {
      const { H, veg, root } = ctx, rng = U.rng(2024), gy = ctx.gy;
      G.Tex.make('sand', 256, 256, (g, w, h, r) => { g.fillStyle = '#d8c49a'; g.fillRect(0, 0, w, h); G.Tex.speckle(g, w, h, r, 2600, ['#b8a070', '#efe0bb', '#a89066', '#f7ecd0'], 0.35, 2); for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(150,120,80,.12)'; g.lineWidth = 2; g.beginPath(); const y0 = r() * h; for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 5); g.stroke(); } });
      R.terrain(ctx, { x0: 236, x1: 330, z0: -70, z1: 50, seg: 94, h: bayH, key: 'bay', tex: ['grass', 'sand', 'stone'], scale: 5,
        weights: (x, z, y, slope) => { const sx = shoreX(z), sand = ss(sx - 12, sx - 8.5, x), rock = U.clamp(ss(9, 4, pointD(x, z)) + ss(6, 3.5, poolD(x, z)) * 0.8 + slope * 2.2, 0, 1); return [(1 - sand) * (1 - rock), sand * (1 - rock), rock]; } });
      // the sea, and the sea floor beyond the terrain
      const sea = R.water(ctx, 286, 470, -150, 130, -0.45, { hazard: false, flat: true }); sea.userData.bay = true;
      H.plane(330, 470, -150, 130, -2.2, M.std('seabed', { map: 'sand', color: 0x8a9a8a, rough: 1 }), 8);
      H.plane(236, 330, 50, 130, -2.2, M.std('seabed', { map: 'sand', color: 0x8a9a8a, rough: 1 }), 8); H.plane(236, 330, -150, -70, -2.2, M.std('seabed', { map: 'sand', color: 0x8a9a8a, rough: 1 }), 8);
      // foam where the waves run up the sand
      const foamT = G.Tex.make('foam', 256, 64, (g, w, h, r) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.beginPath(); g.ellipse(r() * w, h * 0.3 + r() * h * 0.5, 2 + r() * 7, 1 + r() * 2, 0, 0, 7); g.fill(); } });
      const fP = [], fI = [], fUV = [];
      for (let i = 0, z = -70; z <= 50; z += 2, i++) { const sx = shoreX(z); for (const [k, dx] of [[0, -0.8], [1, 1.6]]) { fP.push(sx + dx, 0, z); fUV.push(k, z / 8); } if (i) { const b = i * 2; fI.push(b - 2, b, b - 1, b - 1, b, b + 1); } }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fP, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(fUV, 2)); fg.setIndex(fI); fg.computeVertexNormals();
      const foam = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: foamT, transparent: true, depthWrite: false, opacity: 0.8 })); foam.position.y = -0.42; foam.userData.dynamic = true; root.add(foam); W.obj.bayFoam = foam;
      // the lane in from the highway, and the drive
      R.path(ctx, [[236, -6], [246, -6], [256, -5.5], [262, -5]], 3.6, 'asphalt');
      R.path(ctx, [[262, -2.8], [266, -1.6], [271, -2.2], [276, -3], [281, -4], [285, -5]], 1.2, M.std('sandpath', { map: 'sand', color: 0xe8d8b0, rough: 1 }));
      R.sign(ctx, 244, -9, Math.PI / 2, 'SALTWHISTLE BAY', { w: 1.6, bg: '#2f6a8a' });
      // ---- Arlo's cottage: whitewashed, blue door, porch facing the sea
      const [cx, , cz] = B.cottage, wallM = M.std('cottagewall', { map: 'plaster', color: 0xf4efe6, rough: 0.9 }), trimM = M.std('cottagetrim', { color: 0x2f5d8a, rough: 0.5 });
      H.box({ w: 8, h: 3, d: 6, x: cx, z: cz, mat: wallM });
      const roofM = M.std('cottageroof', { map: 'shingles', color: 0x5a6a7a, rough: 0.8 });
      for (const s of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.14, 3.9), roofM); rf.position.set(cx, 3.95, cz + s * 1.55); rf.rotation.x = s * 0.62; rf.castShadow = true; rf.receiveShadow = true; root.add(rf); }
      const gab = new THREE.Shape(); gab.moveTo(-3, 0); gab.lineTo(3, 0); gab.lineTo(0, 2.05); gab.lineTo(-3, 0);
      for (const s of [-1, 1]) { const gg = new THREE.ExtrudeGeometry(gab, { depth: 0.14, bevelEnabled: false }); gg.translate(0, 0, -0.07); const gm = new THREE.Mesh(gg, wallM); gm.position.set(cx + s * 3.93, 3, cz); gm.rotation.y = Math.PI / 2; gm.castShadow = true; root.add(gm); }
      H.box({ w: 0.8, h: 1.8, d: 0.8, x: cx - 2.4, y: 3.6, z: cz + 1.2, mat: 'brick' });
      for (const [x, z, ry, w2, h2, y] of [[cx + 4.01, cz, Math.PI / 2, 1.0, 2.0, 0], [cx + 4.01, cz - 2, Math.PI / 2, 1.1, 1.0, 1.2], [cx + 4.01, cz + 2, Math.PI / 2, 1.1, 1.0, 1.2], [cx - 2, cz - 3.01, Math.PI, 1.1, 1.0, 1.2], [cx + 1.5, cz - 3.01, Math.PI, 1.1, 1.0, 1.2], [cx - 2, cz + 3.01, 0, 1.1, 1.0, 1.2], [cx + 1.5, cz + 3.01, 0, 1.1, 1.0, 1.2], [cx - 4.01, cz, -Math.PI / 2, 1.0, 2.0, 0]]) {
        const fr = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.16, h2 + 0.16, 0.06), trimM); fr.position.set(x, y + h2 / 2, z); fr.rotation.y = ry; root.add(fr);
        const pn = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2), h2 > 1.5 ? trimM : M.std('cottageglass', { color: 0x1c2a3a, rough: 0.1, metal: 0.4, emissive: 0xffc070, ei: 0 })); pn.position.set(x + Math.sin(ry) * 0.035, y + h2 / 2, z + Math.cos(ry) * 0.035); pn.rotation.y = ry; root.add(pn); if (h2 < 1.5) (BO.bayWindows = BO.bayWindows || []).push(pn);
      }
      // porch
      H.box({ w: 2.6, h: 0.16, d: 7, x: cx + 5.3, z: cz, mat: 'midwood' }); W.collider(cx + 4, cx + 6.6, cz - 3.5, cz + 3.5, -0.3, 0.16, { cam: false });
      for (const dz of [-3.3, 3.3]) H.box({ w: 0.12, h: 2.4, d: 0.12, x: cx + 6.45, y: 0.16, z: cz + dz, mat: 'whitewood' });
      const pr = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 7.4), roofM); pr.position.set(cx + 5.3, 2.7, cz); pr.rotation.z = -0.18; pr.castShadow = true; root.add(pr);
      H.box({ w: 0.5, h: 0.08, d: 1.8, x: cx + 5.8, y: 0.5, z: cz - 1.6, mat: 'midwood', climb: true }); H.box({ w: 0.08, h: 0.5, d: 1.8, x: cx + 5.6, y: 0.58, z: cz - 1.6, mat: 'midwood', col: false });
      for (const dz of [-0.8, 0.8]) H.box({ w: 0.4, h: 0.34, d: 0.08, x: cx + 5.8, y: 0.16, z: cz - 1.6 + dz, mat: 'darkwood', col: false });
      H.light(cx + 6.2, 2.3, cz + 1.6, 0xffd9a0, 1.2, 9, { night: true });
      const lampM = M.std('porchlamp', { color: 0xffe6b0, emissive: 0xffc070, ei: 1.5 }); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lampM); lamp.position.set(cx + 6.2, 2.4, cz + 1.6); root.add(lamp);
      // Arlo's workshop: an open-fronted shed full of clocks
      const [sx0, , sz0] = B.shed;
      H.box({ w: 4, h: 0.1, d: 3, x: sx0, y: 2.4, z: sz0, mat: 'shedwood' });
      H.box({ w: 4, h: 2.4, d: 0.1, x: sx0, z: sz0 - 1.5, mat: 'shedwood' }); for (const s of [-1, 1]) H.box({ w: 0.1, h: 2.4, d: 3, x: sx0 + s * 2, z: sz0, mat: 'shedwood' });
      H.box({ w: 3.4, h: 0.9, d: 0.8, x: sx0, z: sz0 - 0.9, mat: 'darkwood', climb: true });
      const clockFace = (key, n) => G.Tex.make(key, 128, 128, (g, w, h) => { g.fillStyle = '#f2ebe0'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#3a2a1a'; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillRect(64 + Math.sin(a) * 48 - 2, 64 - Math.cos(a) * 48 - 2, 4, 4); } g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(n) * 30, 64 - Math.cos(n) * 30); g.moveTo(64, 64); g.lineTo(64 + Math.sin(n * 7) * 44, 64 - Math.cos(n * 7) * 44); g.stroke(); });
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.2 + (i % 2) * 0.1, 20), new THREE.MeshStandardMaterial({ map: clockFace('bayclock' + i, i * 1.3), roughness: 0.6 })); f.position.set(sx0 - 1.5 + i * 0.75, 1.5 + (i % 2) * 0.45, sz0 - 1.44); root.add(f); }
      // garden: picket fence, hydrangeas, a washing line
      const pick = M.std('picket', { color: 0xf2ede4, rough: 0.7 });
      const fenceLine = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(l / 0.25); for (let i = 0; i <= n; i++) { const t = i / n; H.box({ w: 0.07, h: 0.8, d: 0.03, x: U.lerp(x0, x1, t), z: U.lerp(z0, z1, t), mat: pick, col: false }).rotation.y = Math.atan2(x1 - x0, z1 - z0); } W.collider(Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, Math.min(z0, z1) - 0.05, Math.max(z0, z1) + 0.05, 0, 0.8, { cam: false }); };
      fenceLine(254, -20, 280, -20); fenceLine(254, 3, 262, 3); fenceLine(268, 3, 280, 3); fenceLine(254, -20, 254, -8); fenceLine(254, -2.2, 254, 3); fenceLine(280, -20, 280, -7.2); fenceLine(280, -3.2, 280, 3);
      for (let i = 0; i < 16; i++) { const x = 256 + rng() * 22, z = -19 + rng() * 21; if (Math.abs(x - cx) < 5.5 && Math.abs(z - cz) < 4.5) continue; if (Math.hypot(x - sx0, z - sz0) < 3) continue; if (z > -7.5 && z < -1) continue; veg.bushes.push([x, 0.35, z, 0.6 + rng() * 0.3, [0x6a8fd0, 0x8a7ad0, 0xd08ab0][i % 3], false]); }
      for (let i = 0; i < 60; i++) veg.flowers.push([256 + rng() * 22, -19 + rng() * 5, [0xf2d24b, 0xffffff, 0xe7a0b0, 0xc07ad9][i % 4]]);
      for (const x of [273, 278.5]) H.cyl({ r: 0.05, h: 2.1, x, z: -14, mat: 'darkwood', col: true });
      const line = new THREE.Group(); line.position.set(275.75, 1.9, -14); root.add(line); line.userData.dynamic = true; W.obj.bayLine = line;
      const rope = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.015, 0.015), M.color(0xe8e0d0)); rope.userData.dynamic = true; line.add(rope);
      for (const [dx, c, w2] of [[-1.8, 0xd9573b, 0.7], [-0.6, 0x3f6fa0, 0.9], [0.6, 0xf2c14e, 0.6], [1.7, 0xffffff, 0.8]]) { const cl = new THREE.Mesh(new THREE.PlaneGeometry(w2, 0.8), M.std('cloth' + c, { color: c, rough: 0.9, map: 'fabric', side: THREE.DoubleSide })); cl.geometry.translate(0, -0.4, 0); cl.position.x = dx; cl.userData.dynamic = true; line.add(cl); }
      // grass on the land, reeds on the dunes
      veg.grass.push([238, 281, -68, 48, 1.1]);
      ctx.def.noGrass = (x, z) => x > shoreX(z) - 11 || (x > 260 && x < 273.5 && z > -10 && z < -1) || (Math.abs(z + 5.8) < 2.2 && x < 263) || (x > 256.5 && x < 261.5 && z > -18 && z < -13.8) || (x > 277 && z > 18);
      for (let i = 0; i < 150; i++) { const z = -68 + rng() * 116, x = shoreX(z) - 11 + rng() * 6; if (Math.abs(z - 12) < 2.5 || Math.abs(z + 5) < 1.4 || (z > 18 && z < 44 && x < 288)) continue; veg.ferns.push([x, z, 0.7 + rng() * 0.6, 'reed']); }
      for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r2 = 4 + rng() * 10; veg.rocks.push([306 + Math.cos(a) * r2 / 0.8, 0, -48 + Math.sin(a) * r2, 0.4 + rng() * 0.9, 'rock']); }
      for (let i = 0; i < 14; i++) { const a = rng() * 6.28, r2 = 2 + rng() * 6; veg.rocks.push([297.5 + Math.cos(a) * r2, -0.05, -26 + Math.sin(a) * r2 * 0.8, 0.3 + rng() * 0.5, 'mossrock']); }
      // tide pools
      for (const [x, z, r2] of [[296.2, -24.2, 1.1], [299, -27.6, 1.4], [295, -29, 0.8], [300.6, -23.4, 0.7]]) { const y = gy(x, z) + 0.05; const m = new THREE.Mesh(new THREE.CircleGeometry(r2, 24), M.std('tidepool', { color: 0x2f6f80, rough: 0.08, transparent: true, opacity: 0.88, envI: 0.6 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.userData.dynamic = true; root.add(m); for (let k = 0; k < 3; k++) { const a = rng() * 6.28, st2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.02, 5), M.color([0xd9573b, 0xf2c14e, 0xc07ad9][k])); st2.position.set(x + Math.cos(a) * r2 * 0.6, y - 0.02, z + Math.sin(a) * r2 * 0.6); root.add(st2); } }
      // the pier
      R.ramp(ctx, 280.6, 12, 0, 283.4, 12, PIER_Y, 2.2, 'midwood');
      R.bridge(ctx, 283.4, 12, 322, 12, PIER_Y, 2.4, { name: 'bayPier' });
      for (let x = 286; x < 322; x += 4) for (const s of [-1, 1]) H.cyl({ r: 0.14, h: 3, x, y: -2.6, z: 12 + s * 1.1, mat: 'darkwood', col: false });
      for (const [x, s] of [[300, 1], [316, -1]]) { H.cyl({ r: 0.16, h: 0.5, x, y: PIER_Y, z: 12 + s * 0.95, mat: 'darkmetal', col: true }); }
      // the tide clock at the end of the pier
      { const g = new THREE.Group(); g.position.set(B.clock[0], PIER_Y, B.clock[2]); root.add(g);
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), M.get('darkwood')); base.position.y = 0.55; base.castShadow = true; g.add(base);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.3, 0.45), M.std('clockpost', { color: 0x2f5d8a, rough: 0.5 })); post.position.y = 2.2; post.castShadow = true; g.add(post);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.5), M.std('clockpost', { color: 0x2f5d8a, rough: 0.5 })); head.position.y = 3.8; head.castShadow = true; g.add(head);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 4), M.get('brass')); cap.position.y = 4.65; cap.rotation.y = Math.PI / 4; g.add(cap);
        const faceT = G.Tex.make('tideface', 256, 256, (c, w, h) => { c.fillStyle = '#f2ebe0'; c.beginPath(); c.arc(128, 128, 122, 0, 7); c.fill(); c.strokeStyle = '#2f5d8a'; c.lineWidth = 10; c.stroke(); c.fillStyle = '#2f5d8a'; c.font = 'bold 26px Georgia'; c.textAlign = 'center'; c.fillText('HIGH', 128, 52); c.fillText('LOW', 128, 222); c.font = 'italic 16px Georgia'; c.fillText('Saltwhistle', 128, 150); c.fillText('Tide Clock', 128, 170); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 3, 6, 6); } });
        for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.46, 28), new THREE.MeshStandardMaterial({ map: faceT, roughness: 0.5, emissive: 0xffe0a0, emissiveIntensity: 0 })); f.position.set(0, 3.8, s * 0.26); f.rotation.y = s > 0 ? 0 : Math.PI; g.add(f); (BO.tideFaces = BO.tideFaces || []).push(f);
          const hand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.02), M.color(0x2a2420)); hand.geometry.translate(0, 0.17, 0); hand.position.set(0, 3.8, s * 0.28); hand.rotation.z = 2.4; hand.userData.dynamic = true; g.add(hand); (BO.tideHands = BO.tideHands || []).push(hand); }
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.34), M.get('brass')); door.position.set(-0.46, 0.4, 0); g.add(door); W.obj.tideDoor = door;
        W.collider(B.clock[0] - 0.45, B.clock[0] + 0.45, B.clock[2] - 0.45, B.clock[2] + 0.45, PIER_Y, PIER_Y + 4.5, {});
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, 6.3, 0, 1.7), M.get('brass')); bell.position.set(0, 4.35, 0.42); g.add(bell); W.obj.tideBell = bell; }
      // beach huts
      const hutC = [0xd9573b, 0x3f8a74, 0xf2c14e, 0x6a8fd0, 0xe7a0b0];
      for (let i = 0; i < 5; i++) { const z = 22 + i * 4.4, x = 282.5, c = hutC[i]; const hm = M.std('hut' + c, { color: c, rough: 0.7, map: 'siding' });
        H.box({ w: 2.2, h: 2.1, d: 2.8, x, z, mat: hm }); for (const s of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.7), M.get('white')); rf.position.set(x, 2.45, z + s * 0.72); rf.rotation.x = s * 0.5; rf.castShadow = true; root.add(rf); }
        const dr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), M.get('white')); dr.position.set(x + 1.11, 0.8, z); dr.rotation.y = Math.PI / 2; root.add(dr); }
      // a rowing boat on the sand, a moored boat, driftwood, a deckchair and Ellie's sandcastle
      { const bt = new THREE.Group(); bt.position.set(287.5, gy(287.5, -9.5) + 0.2, -9.5); bt.rotation.set(0.1, 0.5, 0.18); root.add(bt);
        const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), M.std('boathull', { color: 0xd9573b, rough: 0.6, side: THREE.DoubleSide })); hull.scale.set(0.8, 0.5, 2); hull.castShadow = true; bt.add(hull);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), M.get('midwood')); seat.position.y = -0.15; bt.add(seat); }
      { const mb = new THREE.Group(); mb.position.set(326, -0.45, 3); root.add(mb); mb.userData.dynamic = true; W.obj.bayBoat = mb;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 5), M.std('boat2', { color: 0xf2ebe0, rough: 0.5 })); hull.position.y = 0.2; mb.add(hull); const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.6), M.std('boatcab', { color: 0x2f5d8a, rough: 0.5 })); cab.position.set(0, 1, -0.6); mb.add(cab); mb.traverse((o) => (o.userData.dynamic = true)); }
      R.log(ctx, 291.5, 1.2, 3.2, 0.4, 0.2); R.log(ctx, 288.6, 38, 2.4, -0.7, 0.16);
      { const [x, , z] = B.deck; const y = gy(x, z); const ch2 = new THREE.Group(); ch2.position.set(x, y, z); ch2.rotation.y = 1.9; root.add(ch2); const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), M.std('deckcloth', { color: 0x3f6fa0, map: 'fabric', side: THREE.DoubleSide })); cl.position.set(0, 0.45, 0); cl.rotation.x = -0.9; ch2.add(cl); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.1), M.get('midwood')); f.position.set(s * 0.32, 0.3, 0); f.rotation.x = 0.6; ch2.add(f); } }
      { const [x, , z] = B.castle; const y = gy(x, z); const sm = M.std('sandcastle', { map: 'sand', color: 0xe0c898, rough: 1 }); const g = new THREE.Group(); g.position.set(x, y, z); root.add(g); for (const [dx, dz, r2, h2] of [[0, 0, 0.32, 0.4], [0.4, 0.3, 0.16, 0.35], [-0.4, 0.3, 0.16, 0.35], [0.4, -0.3, 0.16, 0.35], [-0.4, -0.3, 0.16, 0.35]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r2 * 0.85, r2, h2, 10), sm); t.position.set(dx, h2 / 2, dz); t.castShadow = true; g.add(t); } const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), M.std('flagred', { color: 0xd9573b, side: THREE.DoubleSide })); fl.position.set(0.06, 0.62, 0); g.add(fl); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4), M.get('darkwood')); pole.position.set(0, 0.5, 0); g.add(pole); W.obj.bayCastle = g; }
      // the lighthouse on the point
      { const [lx, , lz] = B.light, y = gy(lx, lz) - 0.1; const g = new THREE.Group(); g.position.set(lx, y, lz); root.add(g);
        const stripes = G.Tex.make('lhstripes', 64, 256, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#c0392b' : '#f4efe6'; c.fillRect(0, i * h / 6, w, h / 6); } });
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.7, 11, 24), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })); tw.position.y = 5.5; tw.castShadow = true; g.add(tw);
        const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.15, 24), M.get('darkmetal')); gal.position.y = 11; g.add(gal);
        const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 16), M.std('lantern', { color: 0xfff2c0, emissive: 0xffe0a0, ei: 0.6, rough: 0.1, transparent: true, opacity: 0.85 })); lan.position.y = 11.8; g.add(lan); W.obj.bayLantern = lan;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.1, 16), M.get('red')); cap.position.y = 13; cap.castShadow = true; g.add(cap);
        const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.geometry.translate(0, -13, 0); beam.rotation.z = Math.PI / 2; const bp = new THREE.Group(); bp.position.y = 11.8; bp.add(beam); g.add(bp); W.obj.bayBeam = bp; beam.userData.dynamic = true; bp.userData.dynamic = true;
        const dr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), M.std('lhdoor', { color: 0x2f5d8a, rough: 0.5 })); dr.position.set(-1.62, 0.9, 0); dr.rotation.y = -Math.PI / 2 - 0.05; g.add(dr);
        W.collider(lx - 1.5, lx + 1.5, lz - 1.5, lz + 1.5, y, y + 13, {}); H.light(lx, y + 12, lz, 0xffe6b0, 2, 30, { night: true }); }
      // the edge of the world: a hedge bank to the west, the sea everywhere else
      R.walls(236, 330, -70, 50, -3, 8);
      for (let z = -68; z < 48; z += 1.3) veg.bushes.push([237 + rng() * 0.6, 0.6, z, 1.1 + rng() * 0.3, 0x3f5a2a, false]);
      for (let x = 238; x < 282; x += 1.3) { veg.bushes.push([x, 0.6, -69 + rng() * 0.6, 1.1 + rng() * 0.3, 0x3f5a2a, false]); veg.bushes.push([x, 0.6, 49 - rng() * 0.6, 1.1 + rng() * 0.3, 0x3f5a2a, false]); }
      for (const [x, z] of [[242, -30], [246, 22], [250, -48], [240, 40], [252, 34], [244, -58]]) veg.trees.push([x, z, 0.9 + rng() * 0.3, rng() < 0.5 ? 'birch' : null]);
    },
    update(dt, g) {
      const t = g.t, n = (G.env && G.env.night) || 0;
      if (W.obj.bayFoam) { W.obj.bayFoam.position.x = Math.sin(t * 0.5) * 0.7; W.obj.bayFoam.material.opacity = 0.55 + Math.sin(t * 0.5 + 1.2) * 0.3; }
      if (W.obj.bayBoat) { W.obj.bayBoat.rotation.z = Math.sin(t * 0.8) * 0.05; W.obj.bayBoat.position.y = -0.45 + Math.sin(t * 1.1) * 0.06; }
      if (W.obj.bayLine) W.obj.bayLine.children.forEach((c, i) => { if (i) c.rotation.x = Math.sin(t * 2.2 + i) * 0.25 + 0.15; });
      if (W.obj.bayBeam) { W.obj.bayBeam.rotation.y += dt * 0.6; W.obj.bayBeam.visible = n > 0.25; }
      if (W.obj.bayLantern) W.obj.bayLantern.material.emissiveIntensity = 0.4 + n * 2;
      for (const w of BO.bayWindows || []) w.material.emissiveIntensity = n * 1.2;
      const run = has('tideFixed'); for (const h of BO.tideHands || []) h.rotation.z = run ? 2.4 - t * 0.05 : 2.4;
      for (const f of BO.tideFaces || []) f.material.emissiveIntensity = run ? 0.15 + n * 0.5 : 0;
      gulls(dt, g);
    },
  });

  /* flying gulls: wheeling over the bay */
  const flock = [];
  function gulls(dt, g) {
    if (!flock.length) for (let i = 0; i < 5; i++) { const b = new G.Beast('gull', { scale: 1.1 }); b.fly = 0.001; b.state.flap = true; g.scene.add(b.root); flock.push({ b, a: i * 1.3, r: 10 + i * 4, cx: 300 + (i % 2) * 12, cz: -10 + i * 8, y: 7 + i * 1.5, sp: 0.18 + i * 0.03 }); }
    const on = ch() === 8 && R.byId.bay.built && R.byId.bay.group.visible;
    for (const f of flock) { f.b.root.visible = on; if (!on) continue; f.a += dt * f.sp; const x = f.cx + Math.cos(f.a) * f.r, z = f.cz + Math.sin(f.a) * f.r; f.b.root.position.set(x, f.y + Math.sin(f.a * 3) * 0.6, z); f.b.root.rotation.y = f.a + Math.PI; f.b.state.flap = Math.sin(f.a * 5) > 0.2; f.b.update(dt); if (Math.random() < dt * 0.05) A.play('gull', 0.4); }
  }

  /* ================================================================ story */
  G.CHAPTERS[8] = ['Bonus Chapter II', 'Grandpa Arlo'];
  Object.assign(G.ITEMS, {
    glassGreen: { name: 'Green Sea Glass', desc: 'A smooth green pebble of old bottle, frosted by the waves.', story: true },
    glassBlue: { name: 'Blue Sea Glass', desc: 'A rare cornflower-blue piece. Crabs go wild for these.', story: true },
    glassAmber: { name: 'Amber Sea Glass', desc: 'Honey-coloured and glowing when you hold it up to the sun.', story: true },
    clockpin: { name: 'Brass Pendulum Pin', desc: 'A little brass pin from the tide clock. Pinch kept it very well polished.', story: true },
  });
  const GLASS = ['glassGreen', 'glassBlue', 'glassAmber'];
  const glassPos = { glassGreen: [289.6, 'g', 31.6], glassBlue: [300.8, 'g', -42.2], glassAmber: [287.6, 'g', -9.2] };
  for (const k of GLASS) G.PICKUPS.push({ id: 'p_' + k, item: k, model: 'seaglass_' + k, pos: glassPos[k], when: () => ch() === 8 && st() === 'b_glass', msg: k === 'glassAmber' ? 'Amber sea glass, rattling around in the bottom of the old rowing boat!' : null });
  G.COLLECT.push(
    { id: 'sea_conch', cat: 'seaside', model: 'shell', name: 'Singing Conch', desc: 'Hold it to your ear: it hums the sea. Found on the rocks by the lighthouse.', pos: [309.4, 'g', -44.2] },
    { id: 'sea_star', cat: 'seaside', model: 'starfish', name: 'Sleepy Starfish Stone', desc: 'A starfish-shaped stone from the tide pools. Probably not a real starfish. Probably.', pos: [300.2, 'g', -28.4] },
    { id: 'sea_bottle', cat: 'seaside', model: 'bottle', name: 'Message in a Bottle', desc: '"To whoever finds this: the fish and chips at Saltwhistle are the best in the world. — Ellie, age 5"', pos: [293.4, 'g', 14.6] },
    { id: 'sea_post', cat: 'seaside', model: 'photo2', name: 'Postcard: Saltwhistle Bay', desc: 'A faded postcard of the pier. On the back: "Rose, the tide clock works! Juniper supervised. — A."', pos: [284.2, 'g', 39.1] },
  );
  const T = (text, target) => ({ text, target });
  Object.assign(G.STEPS, {
    b_arrive: T('Arrive at Saltwhistle Bay', null),
    b_clock: T('Look at the tide clock at the end of the pier', [B.clock[0] - 1.1, PIER_Y, B.clock[2]]),
    b_tracks: T('Follow the crab tracks along the beach', null),
    b_pinch: T('Talk to the crab in the tide pools', () => { const d = NPC.get('pinch'); const r = d && d.beast && d.beast.root.position; return r ? [r.x, r.y, r.z] : B.pools; }),
    b_glass: Object.assign(T('Find three pieces of sea glass for Pinch', () => { const p = game().player.pos; let best = null, bd = 1e9; for (const k of GLASS) { if (item(k) || has('got_p_' + k)) continue; const q = glassPos[k], d = Math.hypot(q[0] - p.x, q[2] - p.z); if (d < bd) { bd = d; best = [q[0], q[1] === 'g' ? W.groundY(q[0], q[2]) : q[1], q[2]]; } } return best; }), { count: () => [GLASS.filter((k) => item(k)).length, 3] }),
    b_trade: T('Bring the sea glass to Pinch', () => G.STEPS.b_pinch.target()),
    b_fix: T('Fix the tide clock on the pier', [B.clock[0] - 1.1, PIER_Y, B.clock[2]]),
    b_sunset: T('Join Grandpa Arlo on the porch', B.porch),
  });
  SQ.trail('crab', [[292.6, 'g', 6.6], [290.2, 'g', -4.5], [292.4, 'g', -19.4]], { active: () => ch() === 8 && st() === 'b_tracks', label: 'Sniff the crab tracks', col: 0xffb080, onDone: () => { say([['milo', 'The tracks go into the tide pools. Sideways. Of course they go sideways.', 'think']], () => SQ.step('b_pinch')); } });
  G.STEPS.b_tracks.target = () => SQ.trailPos(SQ.trails.crab);
  // footprints for the trail: little crab tracks in the sand
  const trackMarks = [];

  /* ---- NPCs */
  NPC.add({ id: 'pinch', name: 'Pinch', kind: 'crab', look: { scale: 2.2, color: 0xd9573b }, pos: () => [297.6, 'g', -25.6], yaw: -1.2, when: () => ch() === 8 && !['b_arrive', 'b_clock', 'b_tracks'].includes(st()) || has('arloDone') && ch() === 19, r: 1.1, sound: 'mole',
    lines: () => pinchLines() });
  NPC.add({ id: 'squall', name: 'Captain Squall', kind: 'gull', look: { scale: 1.4, hat: 'cap', hatColor: 0x2a3a55, hatScale: 1.2 }, pos: () => [300, PIER_Y + 0.5, 13.05], yaw: Math.PI, when: () => ch() === 8 || has('arloDone') && ch() === 19, r: 1.3, sound: 'gull',
    lines: () => squallLines() });
  function pinchLines() {
    const s = st();
    if (s === 'b_pinch') return [['pinch', 'Clack! CLACK! Who goes there? This is MY pool. Everything shiny in it is mine. Finders keepers!', 'angry'],
      ['milo', 'Hi! I’m Milo. Did you find a little brass pin? From the clock on the pier? My grandpa needs it.', 'happy'],
      ['pinch', 'Your grandpa? The tall one with the whiskers on his FACE? ...He does whistle nicely.', 'think'],
      ['pinch', 'The pin is my best thing. I polish it every tide. I will only swap it for something SHINIER. Sea glass! Three pieces! Green, blue, and the gold kind.', 'smug'],
      ['milo', 'Three pieces of sea glass. Deal!', 'happy'], { do: () => SQ.step('b_glass') }];
    if (s === 'b_glass') return [['pinch', 'Green, blue and gold. The sea hides them where the old things wash up: by the huts, by the lighthouse rocks... and in boats. Boats are full of treasure.', 'think']];
    if (s === 'b_trade') return [['milo', 'Green, blue and amber. As promised!', 'happy'], { do: () => GLASS.forEach((k) => game().take(k)) },
      ['pinch', '...Oh. Oh my. Look how they GLOW. Clack clack clack!', 'happy'], ['pinch', 'Fine. Here. Take the pin. It was getting boring anyway. Don’t tell anyone I was nice.', 'shy'],
      { do: () => { game().give('clockpin'); SQ.step('b_fix'); } }, ['milo', 'Thank you, Pinch! Your secret is safe with me.', 'happy']];
    return [['pinch', has('tideFixed') ? 'The clock goes tick-tock again. I can hear it from my pool. Very annoying. Very nice.' : 'Clack. Busy. Polishing.', 'smug']];
  }
  function squallLines() {
    const k = (SQ.s().squallTalks = (SQ.s().squallTalks || 0) + 1);
    if (k === 1) return [['squall', 'AHOY, landlubber! Captain Squall, terror of the pier! Master of the seven chips!', 'happy'], ['milo', 'You’re a seagull in a hat.', 'think'], ['squall', 'I am a CAPTAIN in a hat. Very different. Have you got any chips?', 'smug'], ['milo', 'No.', 'neutral'], ['squall', 'Then this conversation is over. ...Come back if you get chips.', 'sad']];
    if (k === 2) return [['squall', 'Chips?', 'surprised'], ['milo', 'Still no.', 'neutral'], ['squall', 'The tall girl with the bucket has a whole bag. I’ve been watching her for an hour. Tactically.', 'think']];
    if (!has('squallChip')) return [['squall', 'Listen. You distract the girl. I swoop. We split it fifty-fifty. Ninety-ten. Ninety-nine-one.', 'smug'], ['milo', 'Absolutely not.', 'think'], { do: () => game().flag('squallChip') }, ['squall', 'Worth a try. Arrr.', 'sad']];
    return [['squall', has('tideFixed') ? 'The old clock rings again! Now I know exactly when it’s chip o’clock.' : 'The old clock hasn’t rung since the big storm. A captain likes to know the tide, you know.', 'happy']];
  }

  /* ---- talking to the family at the bay (humans) */
  const humanTalk = (id) => {
    const s = st(), done = has('tideFixed');
    if (id === 'arlo') {
      if (s === 'b_clock') return [['arlo', 'The tide clock is at the very end of the pier. Go on, have a look. Your nose is better than my spectacles.', 'happy']];
      if (s === 'b_tracks' || s === 'b_pinch') return [['arlo', 'A crab took it, you think? Ha! Crabs and ferrets. Juniper used to have terrible arguments with the crabs here.', 'happy']];
      if (s === 'b_glass' || s === 'b_trade') return [['arlo', 'Sea glass? Look where old things wash up. Rose always found the best pieces by the lighthouse.', 'think']];
      if (s === 'b_fix') return [['arlo', 'You got the pin? Clever lad! The little hatch at the bottom of the clock. Juniper used to squeeze in there when I oiled the gears.', 'surprised']];
      return [['arlo', done ? 'Listen to it tick. Best sound in the world, after Ellie laughing.' : 'Welcome to Saltwhistle, Milo.', 'happy']];
    }
    if (id === 'ellie') return s === 'b_glass' ? [['ellie', 'I’m building a castle for you and Mochi! It has a moat. And a gift shop.', 'happy'], ['ellie', 'Oh! I saw something shiny in the old rowing boat. Is that what you’re looking for?', 'surprised']] : [['ellie', done ? 'Grandpa says you fixed his clock! You’re the cleverest noodle in the world.' : 'Milo, look! The SEA! It’s so big! It’s bigger than the bath!', 'happy']];
    return [['mum', done ? 'Dad hasn’t smiled like that in years. Thank you, little one.' : 'Don’t go in the water, Milo. Ferrets and waves do not mix.', 'happy']];
  };
  const hIt = (id) => ({ id: 'bay_' + id, pos: [0, -999, 0], r: 1.2, label: 'Talk to ' + ({ arlo: 'Grandpa Arlo', ellie: 'Ellie', mum: 'Mum' })[id], when: () => ch() === 8 && C()[id] && C()[id].root.visible && !G.SEQ.running, act: () => talkHuman(id) });
  const HITS = ['arlo', 'ellie', 'mum'].map(hIt); G.INTERACT.push(...HITS);
  function talkHuman(id) {
    const h = C()[id], g = game(), p = g.player; g.player.yaw = Math.atan2(h.pos.x - p.pos.x, h.pos.z - p.pos.z); h.yaw = Math.atan2(p.pos.x - h.pos.x, p.pos.z - h.pos.z);
    const mid = V3((p.pos.x + h.pos.x) / 2, p.pos.y + 0.8, (p.pos.z + h.pos.z) / 2), dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
    const cam = mid.clone().add(V3(-dz / l * 2.6, 0.5, dx / l * 2.6)); if (g.camFree(mid, cam)) g.cinematic({ pos: cam, look: mid, dur: 999, soft: true });
    const pose = h.pose; h.pose = id === 'arlo' ? 'point' : 'wave'; setTimeout(() => (h.pose = pose), 1400);
    say(humanTalk(id), () => g.cinematicEnd());
  }

  /* ---- interactions */
  G.INTERACT.push(
    { id: 'bay_clock', pos: [B.clock[0] - 0.75, PIER_Y, B.clock[2]], r: 1.1, label: () => (st() === 'b_fix' ? 'Squeeze into the tide clock with the pin' : 'Inspect the tide clock'), anim: 'sniff', when: () => ch() === 8 || has('arloDone'), act: () => {
      const s = st();
      if (s === 'b_clock') return say([['milo', 'A little brass hatch at the bottom. It’s open... and inside: gears, a pendulum... and an empty hole where a pin should be.', 'think'], ['milo', 'There are scratchy little marks on the pier. And in the sand below. Tracks! Sideways ones.', 'surprised'], ['milo', '*My nose can follow those. Q to sniff!*', 'happy']], () => SQ.step('b_tracks'));
      if (s === 'b_fix' && item('clockpin')) return fixClock();
      say([['milo', has('tideFixed') ? 'Tick. Tock. Tick. The pendulum swings and the tide hand creeps round. I did that!' : 'The clock is stopped. It says the tide is... confused.', 'happy']]);
    } },
    { id: 'bay_castle', pos: [B.castle[0], 'g', B.castle[2]], r: 1.2, label: 'Admire Ellie’s sandcastle', when: () => ch() === 8, act: () => { if (!has('castleFlag')) { game().flag('castleFlag'); game().player.dance(2); } say([['milo', has('castleKnocked') ? 'It’s a ruin now. A very atmospheric ruin.' : 'Five towers, a moat and a flag. Five stars. Would live in it.', 'happy']]); } },
    { id: 'bay_boat', pos: [287.4, 'g', -7.4], r: 1.2, label: 'Hop into the rowing boat', when: () => ch() === 8 || has('arloDone'), act: () => { const g = game(); g.player.teleport(287.5, W.groundY(287.5, -9.6) + 0.05, -9.6, 0.5); g.player.act('lookup', 2.2); say([['milo', 'Captain Milo, on the high seas! ...The boat is on the sand. But in my heart, it is sailing.', 'happy']]); } },
    { id: 'bay_bench', pos: [B.bench[0] - 0.4, 0.16, B.bench[2]], r: 1, label: 'Sit on Arlo’s bench', when: () => ch() === 8 && has('tideFixed') || ch() !== 8 && has('arloDone'), act: () => { const g = game(); g.player.teleport(B.bench[0], 0.6, B.bench[2], Math.PI / 2); g.player.act('sleep', 4); UI().toast('<b>The sea breathes in and out</b>', null, 'Milo listens for a while.'); } },
  );

  /* ================================================================ cutscenes */
  async function arrive() {
    const { wait, talk, cut, shot, track, go, cutscene, openDoor, hide } = Q(); const g = game(), c = C(), car = c.car, E = c.ellie, Mm = c.mum, Ar = c.arlo;
    await cutscene(async () => {
      R.build(R.byId.bay);
      g.S.time = 16.2; g.S.weather = 'clear';
      hide(true); c.mochiOut = false; if (G.Mochi && G.Mochi.f) G.Mochi.f.root.visible = false;
      car.visible = true; car.position.set(238, 0, -6); car.rotation.y = Math.PI / 2; c.driver.root.visible = true; c.passenger.root.visible = true; hide(false); c.ride = { car, off: V3(0.4, 0.61, -0.84), yaw: 0 };
      [E, Mm].forEach((h) => { h.root.visible = false; h.home = false; });
      Ar.root.visible = true; Ar.pos.set(271.6, 0.16, -6.4); Ar.yaw = -Math.PI / 2; Ar.pose = 'idle';
      UI().fade(false);
      UI().chapterCard(8);
      cut([262, 9, 14], [300, 0, -8], 0.1); await shot([266, 6, 8], [310, 2, -20], 4.2);
      track(car, [-5, 2.2, 5], [2, 0.8, 0]);
      await go(car, [[250, -6], [253, -4.4]], 7); car.userData.speed = 0; track(null); c.ride = null;
      cut([256.5, 1.4, -1], [253, 0.8, -4.4], 0.1);
      await talk([['ellie', 'THE SEA! Milo, wake up, it’s the SEA!', 'happy']]);
      openDoor(car, 0, true); openDoor(car, 1, true); c.driver.root.visible = false; c.passenger.root.visible = false;
      [E, Mm].forEach((h) => (h.root.visible = true)); E.pos.set(252.6, 0, -2.6); E.yaw = Math.PI / 2; Mm.pos.set(254.2, 0, -2.6); Mm.yaw = Math.PI / 2; E.pose = 'carry'; hide(false); c.carried = E;
      go(Ar, [[270.6, -6.2], [270.9, -1.6], [266, -1.6], [258, -2.8]], 1.1);
      await wait(2.4);
      cut([259.6, 1.6, 0.8], [256.2, 1, -2.6], 0.1);
      await go(Ar, [[256.2, -2.6]], 1.1); Ar.pose = 'wave2';
      await talk([['arlo', 'There she is! My favourite granddaughter. And my favourite daughter. And... who’s this?', 'happy'], ['ellie', 'Grandpa! This is Milo! He’s a ferret, like Juniper was!', 'happy']]);
      Ar.pose = 'reach'; await wait(0.8); c.carried = Ar; Ar.pose = 'hug'; A.play('dook');
      await talk([['arlo', 'Well, well. A ferret again, after all these years. Look at that nose. Juniper had a nose like that. Into everything.', 'happy'], ['milo', '*He smells of oil and sawdust and the sea. I like him immediately.*', 'happy']]);
      Ar.pose = 'think';
      await talk([['arlo', 'Milo, I have a job for a clever nose. The old tide clock at the end of the pier stopped in the spring storm. The little pendulum pin has gone missing.', 'think'], ['arlo', 'Everybody in Saltwhistle checks the tide on that clock. My fingers are too big for its insides these days. Juniper used to help.', 'sad'], ['milo', '*A mystery. At the seaside. This is the best day ever.*', 'happy']]);
      Ar.pose = 'reach'; await wait(0.6); c.carried = null; Ar.pose = 'idle';
      const pl = g.player; pl.teleport(257.2, 0, -3.4, Math.PI / 2); A.play('dook');
      await wait(0.5);
    });
    placeFamily(); SQ.step('b_clock'); g.autosave();
  }
  async function fixClock() {
    const { wait, talk, cut, shot, cutscene, hide } = Q(); const g = game(), c = C(), Ar = c.arlo;
    await cutscene(async () => {
      g.take('clockpin'); const [x, y, z] = B.clock;
      Ar.root.visible = true; Ar.pos.set(x - 5, PIER_Y, z - 0.6); Ar.yaw = Math.PI / 2; Ar.pose = 'idle'; Ar.pos.y = PIER_Y;
      cut([x - 2.6, y + 0.6, z + 1.6], [x - 0.5, y + 0.4, z], 0.1);
      g.player.teleport(x - 0.8, y, z, Math.PI / 2); await wait(0.5); A.play('rustle'); hide(true); W.obj.tideDoor.rotation.y = -1.2;
      await wait(0.8); for (let i = 0; i < 4; i++) { A.play(i % 2 ? 'metal' : 'thud', 0.6); g.shake = 0.15; await wait(0.45); }
      await talk([['milo', '*Squeeze... past the big gear... pin into the pendulum... PUSH!*', 'think']]);
      g.flag('tideFixed'); A.play('secret'); for (let i = 0; i < 3; i++) setTimeout(() => A.tone({ f: 523 * [1, 1.26, 1.5][i], type: 'sine', dur: 1.4, vol: 0.12 }), i * 420);
      cut([x - 3.4, y + 3.2, z + 3.4], [x, y + 3.8, z], 0.1); g.particles.burst(V3(x, y + 4.3, z + 0.4), 30, 0xf2c14e, 'spark');
      await wait(2.2);
      hide(false); W.obj.tideDoor.rotation.y = 0; g.player.teleport(x - 1, y, z, -Math.PI / 2);
      cut([x - 3.6, y + 1.1, z + 1.8], [x - 3.5, y + 0.9, z - 0.4], 0.1); Ar.pose = 'cheer';
      await talk([['arlo', 'HA! Listen to that! Tick, tock! The tide clock of Saltwhistle Bay, back from the dead!', 'happy'], ['arlo', 'Juniper would have been proud of you, lad. That was always her job.', 'happy']]);
      Ar.pose = 'idle'; await wait(0.4);
    });
    SQ.step('b_sunset'); g.S.time = Math.max(g.S.time, 18.2); placeFamily(); g.autosave();
  }
  async function sunset() {
    const { wait, talk, cut, shot, cutscene, go } = Q(); const g = game(), c = C(), Ar = c.arlo, E = c.ellie, Mm = c.mum;
    await cutscene(async () => {
      const pl = g.player; g.S.time = 19.1; A.setMood('ending');
      Ar.pos.set(B.bench[0] + 0.2, 0.2, B.bench[2]); Ar.yaw = Math.PI / 2; Ar.pose = 'sit';
      E.pos.set(B.bench[0] + 0.3, 0.16, B.bench[2] + 1.3); E.yaw = Math.PI / 2 + 0.4; E.pose = 'sitfloor'; Mm.pos.set(B.bench[0] - 1.2, 0.16, B.bench[2] + 2.6); Mm.yaw = Math.PI / 2; Mm.pose = 'idle';
      pl.teleport(B.bench[0] + 0.1, 0.62, B.bench[2] - 0.5, Math.PI / 2);
      cut([B.bench[0] + 4.5, 1.6, B.bench[2] + 2.4], [B.bench[0], 0.9, B.bench[2]], 0.1);
      await wait(1.5);
      await talk([['arlo', 'Rose and I used to sit right here. She’d do the crossword and I’d pretend to know the answers.', 'happy'],
        ['ellie', 'Grandpa, tell Milo about Juniper!', 'happy'],
        ['arlo', 'Juniper. Ha. She was a ferret with a bow on, and a bell, and absolutely no respect for anybody’s peonies.', 'happy'],
        ['arlo', 'When we lived at Wren Cottage, she used to vanish for days. Off to the mountains. She came back smelling of pine and honey, with little carved acorns in her fur.', 'think'],
        ['milo', '*Carved acorns?!*', 'surprised'],
        ['arlo', 'One summer she didn’t come back. Rose said she’d found somewhere she was needed. I like to think she was right.', 'sad'],
        ['arlo', 'Now then. Who wants fish and chips?', 'happy'], ['ellie', 'MEEEE!', 'happy']]);
      cut([B.bench[0] + 16, 5, B.bench[2] + 10], [B.bench[0] + 40, 2, B.bench[2] - 6], 0.1); await shot([B.bench[0] + 12, 3.5, B.bench[2] + 6], [B.bench[0] + 50, 1, B.bench[2] - 10], 3.6);
      const sq = NPC.get('squall'); if (sq && sq.beast) { const b = sq.beast; b.fly = 1; b.state.flap = true; }
      await talk([['squall', 'CHIIIIIPS!', 'happy'], ['mum', 'DAD! The gull has your chips!', 'surprised'], ['arlo', 'Let him have them. It’s a good day.', 'happy']]);
      await wait(1);
    });
    finish();
  }
  function finish() {
    const g = game(), s = S(), c = C();
    s.flags.arloDone = true; s.flags.tripDone = true; g.giveCollectible('sea_post');
    ['arlo', 'ellie', 'mum'].forEach((id) => { c[id].root.visible = false; c[id].home = false; }); c.car.visible = false; c.carried = null;
    const sq = NPC.get('squall'); if (sq && sq.beast) sq.beast.fly = 0;
    const fromTitle = s.flags.tripFromTitle;
    s.chapter = fromTitle ? 6 : s.prevChapter || 6; if (s.chapter === 8 || s.chapter === 7) s.chapter = 6; if (s.chapter === 6) s.step = 'end';
    else if (SQ.CH[s.chapter]) s.step = s.prevStep || SQ.CH[s.chapter].first;
    g.player.teleport(5.4, 0, 12.2, 0); g.cam.snap = true; s.time = 10; s.weather = 'clear';
    g.applyWorldState(); g.placeNPCs(); A.setMood(g.moodFor());
    const el = document.getElementById('ending'); el.querySelector('.over').textContent = 'Bonus chapter complete'; el.querySelector('h2').textContent = 'Grandpa Arlo';
    el.querySelector('.story').textContent = 'Milo stayed in the car and woke up at the sea. He followed crab tracks, traded sea glass with a grumpy crab, squeezed inside the old tide clock and made it tick again. Grandpa Arlo told stories about Juniper until the sun went down, and a gull stole the chips.';
    UI().ending(g.stats()); if (fromTitle) document.getElementById('endRoam').hidden = true;
  }

  /* where the family is during the chapter */
  function placeFamily() {
    const c = C(), s = st(); if (!c || !c.arlo) return;
    const E = c.ellie, Mm = c.mum, Ar = c.arlo, car = c.car;
    car.visible = true; car.position.set(...B.car); car.rotation.y = Math.PI / 2; c.driver.root.visible = false; c.passenger.root.visible = false;
    c.car.userData.doors.forEach((d) => (d.rotation.y = 0));
    for (const h of [E, Mm, Ar]) { h.root.visible = true; h.home = false; h.path = []; }
    E.pos.set(B.castle[0] - 0.8, W.groundY(B.castle[0] - 0.8, B.castle[2]), B.castle[2]); E.yaw = Math.PI / 2; E.pose = 'garden';
    Mm.pos.set(B.deck[0] + 0.2, W.groundY(B.deck[0], B.deck[2]), B.deck[2] - 0.6); Mm.yaw = 1.9; Mm.pose = 'read';
    if (s === 'b_fix' || s === 'b_sunset') { Ar.pos.set(284.6, 0, 9.8); Ar.yaw = Math.PI / 2; Ar.pose = 'idle'; }
    else { Ar.pos.set(B.porch[0] - 0.1, 0.16, B.porch[2] + 1); Ar.yaw = Math.PI / 2; Ar.pose = 'think'; }
  }

  /* ================================================================ start + hooks */
  G.Arlo = {
    start() {
      const g = game(), s = S();
      if (s.chapter !== 8 && s.chapter !== 7) { s.prevChapter = s.chapter; s.prevStep = s.step; }
      s.chapter = 8; s.step = 'b_arrive'; s.time = 16.2; s.weather = 'clear'; s.flags.tripStarted = true;
      R.build(R.byId.bay); g.player.teleport(257, 0, -3.4, Math.PI / 2); g.cam.snap = true;
      g.applyWorldState(); g.placeNPCs(); g.state = 'play'; A.setMood('coast'); UI().updateObjective(true);
      arrive();
    },
    placeFamily,
  };
  const oApply = EXT.applyState, oUpd = EXT.update, oInit = EXT.init;
  EXT.applyState = function () {
    oApply(); const s = S(); if (!C() || !C().car) return;
    if (s.chapter === 8) {
      R.build(R.byId.bay); placeFamily();
      if (s.step === 'b_arrive' && game().state === 'play' && !G.SEQ.running) setTimeout(() => arrive(), 300);
    } else if (C().arlo) C().arlo.root.visible = false;
    if (has('arloDone')) R.byId.bay.manual = false;
  };
  EXT.init = function (g) {
    oInit(g);
    // the map gets a seaside tab once Milo has been there
    const tabs = document.getElementById('mapTabs'); if (tabs && !tabs.querySelector('[data-v="bay"]')) { const b = document.createElement('button'); b.dataset.v = 'bay'; b.textContent = 'Saltwhistle Bay'; tabs.appendChild(b); }
    SQ.mapViews.bay = { bounds: [236, 330, -70, 50], show: () => ch() === 8 || has('arloDone'), bg: '#e9dcc0',
      draw: (c, X, Z, sc) => { c.fillStyle = '#9cc4d4'; c.beginPath(); c.moveTo(X(shoreX(-70)), Z(-70)); for (let z = -70; z <= 50; z += 4) c.lineTo(X(shoreX(z)), Z(z)); c.lineTo(X(330), Z(50)); c.lineTo(X(330), Z(-70)); c.closePath(); c.fill(); c.fillStyle = '#8a6a4a'; c.fillRect(X(283), Z(11), (322 - 283) * sc, 2 * sc); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(X(306), Z(-48), 4, 0, 7); c.fill(); c.fillStyle = '#f4efe6'; c.fillRect(X(262), Z(-9), 8 * sc, 6 * sc); } };
    // Bonus Chapter II from the chapter select, once unlocked
    SQ.travelSpots.push(['bayCottage', 'Saltwhistle Bay', [257, 0, -3.4], Math.PI / 2]);
  };
  EXT.update = function (dt, st2) {
    oUpd(dt, st2); const g = game(), s = S(); if (!g || !g.player) return;
    if (s.chapter !== 8) { if (flock.length && flock[0].b.root.visible) flock.forEach((f) => (f.b.root.visible = false)); return; }
    const c = C();
    // talk interactions follow the family around
    for (const it of HITS) { const h = c[it.id.slice(4)]; if (!h) continue; it.pos[0] = h.pos.x; it.pos[1] = h.root.visible ? h.pos.y : -999; it.pos[2] = h.pos.z; }
    // stand on the sand, not in it
    if (!G.SEQ.running) for (const h of [c.ellie, c.mum, c.arlo]) if (h.root.visible && h.pos.x > 276) h.pos.y = W.groundY(h.pos.x, h.pos.z);
    if (st2 === 'play' && !G.SEQ.running && !UI().dialogueOpen) {
      if (st() === 'b_glass' && GLASS.every((k) => item(k))) { SQ.step('b_trade'); say([['milo', 'Green, blue and amber. Three shiny pieces of sea glass. Pinch is going to LOVE these.', 'happy']]); }
      if (st() === 'b_sunset' && Math.hypot(g.player.pos.x - B.porch[0], g.player.pos.z - B.porch[2]) < 3.2) sunset();
      // Squall has a go at the sandcastle once
      if (!has('castleKnocked') && has('tideFixed') && Math.hypot(g.player.pos.x - B.castle[0], g.player.pos.z - B.castle[2]) < 6) { g.flag('castleKnocked'); const cs = W.obj.bayCastle; if (cs) cs.children[0].scale.y = 0.4; A.play('gull'); UI().toast('<b>SQUAWK!</b>', G.UI.portraitsExtra.squall, 'Captain Squall landed on Ellie’s sandcastle. It is now a bungalow.'); }
    }
  };

  // item models
  const baseMake = G.makeItem;
  G.makeItem = function (id) {
    const g = new THREE.Group();
    if (id.startsWith('seaglass_') || GLASS.includes(id)) { const k = id.replace('seaglass_', ''); const c = { glassGreen: 0x5fbf8a, glassBlue: 0x6a9fe0, glassAmber: 0xe0a040 }[k] || 0x9fd9c9; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), M.std('sg' + c, { color: c, rough: 0.35, transparent: true, opacity: 0.85, emissive: c, ei: 0.25, flat: true })); m.scale.set(1, 0.5, 0.8); m.position.y = 0.02; m.castShadow = true; g.add(m); return g; }
    if (id === 'clockpin') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), M.get('brass')); m.rotation.z = Math.PI / 2; m.position.y = 0.01; g.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.get('brass')); h.position.set(0.045, 0.01, 0); g.add(h); return g; }
    if (id === 'starfish') { for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 5), M.color(0xe08a5a, 0.8)); a.rotation.set(Math.PI / 2, 0, 0); a.position.set(Math.sin(i * 1.2566) * 0.025, 0.008, Math.cos(i * 1.2566) * 0.025); a.rotation.y = i * 1.2566; g.add(a); } return g; }
    if (id === 'bottle') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 10), M.std('bottleglass', { color: 0x7ab09a, rough: 0.1, transparent: true, opacity: 0.7 })); b.rotation.z = Math.PI / 2; b.position.y = 0.018; g.add(b); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M.color(0xf2ebe0)); p.rotation.z = Math.PI / 2; p.position.y = 0.018; g.add(p); return g; }
    return baseMake(id);
  };
})();
