/* =====================================================================
   world-deep.js - the far side of the mountain.
   - The Deepways (ch. 10): caverns under the mountain, reached by falling
     through the ridge cave. Glowshroom grotto, an underground river with
     a sluice, a crystal hall and an old mine lift.
   - Storm Valley (ch. 11): a wide valley east of the mountain, with the
     Tumble River, a rabbit warren and the old mine head.
   - Thistlecombe (ch. 12-13): the hidden village of the little folk.
   All three are lazily built regions (see regions.js).
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, R = G.Regions, W = G.World, UG = W.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const ss = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 1.7 + z * 0.3) * Math.sin(z * 1.3 - x * 0.4) * 0.5 + Math.sin(x * 0.37 + z * 0.71) * 0.5;
  const P = W.pts;

  /* ================================================================ THE DEEPWAYS */
  // caverns: [id, name, x0, x1, z0, z1]
  const CAV = {
    land: [-70, -58, -313, -299], grotto: [-50, -30, -314, -296], river: [-20, 10, -318, -294], crystal: [14, 34, -318, -296],
  };
  P.under = { landing: [-64, UG, -305.5], grottoIn: [-48, UG, -306], ledge: [-32, UG + 2.4, -298], lever: [4, UG, -300.4], riverFar: [-4, UG, -311.5], digby: [22, UG, -309], lift: [31.2, UG, -300.2], shard1: [-47.2, UG + 1.85, -298.4], shard2: [6.4, UG, -315.2], shard3: [16.6, UG + 1.2, -315.6] };
  const RIVER = { x0: -20, x1: 10, z0: -309, z1: -303 };
  const riverBed = (x, z) => { const dz = Math.min(z - RIVER.z0, RIVER.z1 - z); if (x < RIVER.x0 || x > RIVER.x1 || dz < -0.5) return null; return UG - 0.9 * ss(-0.5, 0.8, dz); };
  const deepHaz = { type: 'rect', x0: -20, x1: 10, z0: -308.8, z1: -303.2, y: UG + 0.45, name: 'deepRiver' };
  R.def({
    id: 'deep', ug: true, name: 'The Deepways', bounds: [-72, 36, -320, -292],
    areas: [
      ['dLanding', 'The Landing', -70, -58, -313, -299, { ug: true, zone: 'deep', surf: 'dirt', dim: 0.5 }],
      ['dGrotto', 'Glowshroom Grotto', -50, -30, -314, -296, { ug: true, zone: 'deep', surf: 'dirt', dim: 0.3 }],
      ['dRiver', 'The Underground River', -20, 10, -318, -294, { ug: true, zone: 'deep', surf: 'stone', dim: 0.4 }],
      ['dCrystal', 'The Crystal Hall', 14, 34, -318, -296, { ug: true, zone: 'deep', surf: 'stone', dim: 0.2 }],
      ['dTunnels', 'The Deepways', -72, 36, -320, -292, { ug: true, zone: 'deep', surf: 'dirt', dark: true }],
    ],
    terrains: [{ ug: true, x0: -20.5, x1: 10.5, z0: -309.6, z1: -302.4, h: (x, z) => riverBed(x, z) }],
    openUG: Object.values(CAV).map(([x0, x1, z0, z1]) => [x0, x1, z0, z1]),
    hazards: [deepHaz],
    nav: { nodes: { dp1: [-64, UG, -305.5], dp2: [-54, UG, -305.6], dp3: [-42, UG, -306], dp4: [-36, UG, -299], dp5: [-26, UG + 2, -298.2], dp6: [-12, UG, -300], dp7: [-4, UG, -302], dp8: [-4, UG, -311], dp9: [6, UG, -314.5], dp10: [16, UG, -314.6], dp11: [24, UG, -308], dp12: [30, UG, -301] }, edges: 'dp1-dp2 dp2-dp3 dp3-dp4 dp4-dp5 dp5-dp6 dp6-dp7 dp7-dp8 dp8-dp9 dp9-dp10 dp10-dp11 dp11-dp12' },
    register() { deepHaz.y = UG + 0.45; },
    build(ctx) {
      const { H, root } = ctx, rng = U.rng(606), y = UG;
      const floorM = M.std('deepFloor', { map: 'stone', color: 0x7a6a5a, rough: 1 }), dirtM = M.std('deepDirt', { map: 'dirt', color: 0x8a6a4a, rough: 1 });
      const shroomCap = M.std('bigShroom', { color: 0x9fd9e9, emissive: 0x3fb0d0, ei: 0.9, rough: 0.5 }), stalkM = M.std('bigStalk', { color: 0xe8e2d4, rough: 0.8, emissive: 0x304048, ei: 0.3 });
      const room = (k, dome, mat, gaps) => { const [x0, x1, z0, z1] = CAV[k]; if (mat) H.plane(x0, x1, z0, z1, y + 0.002, mat, 3); R.caveDome(ctx, dome[0], y + dome[1], dome[2], dome[3], dome[4], dome[5], { key: 'dome' + k, color: dome[6] || 0x5a5048, detail: 3 }); R.walls(x0, x1, z0, z1, y - 3, y + 9, gaps); };
      // ---- the landing: a heap of moss that broke Milo's fall
      room('land', [-64, 0.6, -306, 7, 4.2, 8.2], dirtM, { e: [[-307, -305]] });
      for (let i = 0; i < 12; i++) H.sph({ x: -64 + (rng() - 0.5) * 1.6, y: y, z: -305.5 + (rng() - 0.5) * 1.6, r: 0.35 + rng() * 0.3, sy: 0.4, mat: 'mossrock', cast: false });
      for (let i = 0; i < 6; i++) { const a = rng() * 6.28; H.sph({ x: -64 + Math.cos(a) * 4.5, y: y, z: -306 + Math.sin(a) * 5, r: 0.6 + rng() * 0.6, sy: 0.7, mat: 'rock' }); }
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 6, 12, 1, true), M.std('shaftWall', { map: 'stone', color: 0x5a5048, side: THREE.BackSide })); shaft.position.set(-64, y + 6.5, -305.5); root.add(shaft);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(-64, y + 3, -305.5); beam.userData.dynamic = true; root.add(beam);
      H.light(-64, y + 2.6, -305.5, 0xffe8c0, 0.8, 8, { ug: true });
      H.tunnel('DEEP1', [[-59, y, -306], [-56.5, y, -305.4], [-53.5, y, -305.8], [-51, y, -306], [-49.2, y, -306]], { r: 0.34 });
      // ---- the glowshroom grotto: giant mushrooms step up to a high tunnel
      room('grotto', [-40, 1.6, -305, 11.5, 6.4, 10.5, 0x4a4a52], dirtM, { w: [[-307, -305]], e: [[-299, -297]] });
      W.collider(-30, -29, -299, -297, y - 3, y + 2.38, { cam: false });
      const caps = [[-44.6, -303.6, 0.6, 1.2], [-43.3, -302.3, 1.2, 1.1], [-42, -301, 1.8, 1.05], [-46.4, -300.2, 1.2, 0.9], [-47.2, -298.4, 1.8, 0.85]];
      for (const [x, z, h, r] of caps) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.36, h, 10), stalkM); st.position.set(x, y + h / 2, z); root.add(st);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), shroomCap); cap.scale.y = 0.42; cap.position.set(x, y + h - 0.02, z); cap.castShadow = true; root.add(cap);
        W.collider(x - r * 0.72, x + r * 0.72, z - r * 0.72, z + r * 0.72, y - 1, y + h + 0.05, { climb: true, cam: false });
      }
      const ledgeM = M.std('deepLedge', { map: 'stone', color: 0xa89888, rough: 1 }); H.box({ w: 11.2, h: 2.4, d: 3.6, x: -35.6, y: y, z: -298, mat: ledgeM, climb: true, s: 1.5 });
      for (let i = 0; i < 26; i++) { const x = -49 + rng() * 18, z = -313 + rng() * 16; if (x > -48.5 && x < -29 && z > -305 && z < -296) continue; const s = 0.2 + rng() * 0.5, st = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.2, s * 0.25, s * 1.4, 7), stalkM); st.position.set(x, y + s * 0.7, z); root.add(st); const cp = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 6, 0, 6.3, 0, 1.6), shroomCap); cp.scale.y = 0.45; cp.position.set(x, y + s * 1.4, z); root.add(cp); }
      H.light(-41, y + 1.4, -301, 0x6fd0f0, 1.4, 10, { ug: true, flicker: 0.08 }); H.light(-36, y + 3.4, -298.4, 0x9fe0ff, 0.9, 6, { ug: true });
      H.tunnel('DEEP2', [[-30.6, y + 2.4, -298], [-28, y + 2.2, -298.2], [-25, y + 1.6, -298.6], [-22.4, y + 0.8, -299.4], [-19.2, y, -300]], { r: 0.34 });
      // ---- the underground river and the sluice
      room('river', [-5, 1.8, -306, 17.5, 7, 13.5, 0x4a4e56], null, { w: [[-301, -299]], e: [[-316, -313]] });
      H.plane(-20, 10, -318, -309.6, y + 0.002, floorM, 3); H.plane(-20, 10, -302.4, -294, y + 0.002, floorM, 3);
      R.terrain(ctx, { x0: -20, x1: 10, z0: -309.6, z1: -302.4, seg: 30, h: (x, z) => { const b = riverBed(x, z); return b === null ? y : b; }, key: 'deepbed', tex: ['stone', 'stone', 'dirt'], ug: true });
      const wy = y + 0.45, water = H.plane(-20, 10, -309.2, -302.8, wy, M.std('deepWaterM', { map: 'water', color: 0x3a6a8a, rough: 0.08, metal: 0.1, transparent: true, opacity: 0.82, emissive: 0x0a2a3a, ei: 0.6, depthWrite: true }), 4); W.obj.deepWater = water; water.userData.dynamic = true;
      for (let i = 0; i < 5; i++) { const z = -303.9 - i * 1.1, x = -4 + (i % 2) * 0.25; H.sph({ x, y: y - 0.9, z, r: 0.45, sy: 1.3, mat: 'mossrock' }); W.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, y - 1, y + 0.28, { cam: false }); }
      const gate = new THREE.Group(); gate.position.set(9.6, y, -306); root.add(gate); gate.userData.dynamic = true; W.obj.sluiceGate = gate;
      { const gp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 6.4), M.get('darkwood')); gp.position.y = 0.3; gp.castShadow = true; gate.add(gp); gp.userData.dynamic = true; for (const s of [-1, 1]) { const po = H.box({ w: 0.3, h: 3.2, d: 0.3, x: 9.6, y: y - 1, z: -306 + s * 3.35, mat: 'darkwood' }); } H.box({ w: 0.3, h: 0.3, d: 7, x: 9.6, y: y + 2.1, z: -306, mat: 'darkwood', col: false }); }
      const lev = new THREE.Group(); lev.position.set(4, y, -300.4); root.add(lev); lev.userData.dynamic = true; W.obj.sluiceLever = lev;
      { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), M.get('darkmetal')); b.position.y = 0.15; lev.add(b); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), M.get('darkmetal')); arm.geometry.translate(0, 0.4, 0); arm.position.y = 0.3; arm.rotation.z = 0.7; lev.add(arm); lev.userData.arm = arm; const kn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.get('red')); kn.position.y = 0.8; arm.add(kn); lev.traverse((o) => (o.userData.dynamic = true)); }
      for (let i = 0; i < 16; i++) { const x = -19 + rng() * 28, z = rng() < 0.5 ? -313 - rng() * 4 : -300 + rng() * 5; H.sph({ x, y: y, z, r: 0.3 + rng() * 0.5, sy: 0.6, mat: 'rock', cast: false }); }
      for (let i = 0; i < 20; i++) { const a = rng() * 6.28; const st = new THREE.Mesh(new THREE.ConeGeometry(0.15 + rng() * 0.2, 1 + rng() * 1.6, 6), M.get('rock')); st.rotation.x = Math.PI; st.position.set(-5 + Math.cos(a) * (6 + rng() * 8), y + 6.6 - rng() * 1.2, -306 + Math.sin(a) * (4 + rng() * 6)); root.add(st); }
      H.light(-5, y + 2.4, -306, 0x7fb0ff, 1, 14, { ug: true }); H.light(4, y + 1, -300.8, 0xffb866, 0.8, 5, { ug: true, flicker: 0.25 });
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.std('deepLantern', { color: 0xffe0a0, emissive: 0xffb050, ei: 2 })); lan.position.set(4.3, y + 1.1, -300.9); root.add(lan);
      H.tunnel('DEEP3', [[9, y, -314.6], [11, y, -314.9], [13, y, -314.7], [15, y, -314.6]], { r: 0.36 });
      // ---- the crystal hall, Digby's burrow and the old lift
      room('crystal', [24, 2.2, -307, 11.5, 7.6, 12.5, 0x44405a], floorM, { w: [[-316, -313]] });
      const cryCols = [0x9f7fff, 0x7fd0ff, 0xff9fe0, 0x9fffd0];
      for (let i = 0; i < 22; i++) { const a = rng() * 6.28, r = 5 + rng() * 5, x = 24 + Math.cos(a) * r, z = -307 + Math.sin(a) * r * 1.05; if (x > 28 && z > -303) continue; const c = cryCols[i % 4]; const grp = new THREE.Group(); grp.position.set(x, y, z); root.add(grp); for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.12 + rng() * 0.12, 0.6 + rng() * 1.1, 5), M.std('crystal' + c, { color: c, emissive: c, ei: 0.8, rough: 0.15, metal: 0.1, transparent: true, opacity: 0.88, flat: true })); cr.position.set((rng() - 0.5) * 0.5, 0.3, (rng() - 0.5) * 0.5); cr.rotation.set((rng() - 0.5) * 0.7, rng() * 3, (rng() - 0.5) * 0.7); grp.add(cr); } }
      for (const [x, z, c] of [[20, -312, 0x9f7fff], [27, -313, 0x7fd0ff], [18, -302, 0xff9fe0]]) H.light(x, y + 1.2, z, c, 1.1, 8, { ug: true, flicker: 0.05 });
      H.box({ w: 1.6, h: 0.6, d: 1.4, x: 16.6, y: y, z: -315.4, mat: 'deepLedge', climb: true }); H.box({ w: 1.1, h: 0.6, d: 1, x: 16.6, y: y + 0.6, z: -315.8, mat: 'deepLedge', climb: true });
      // Digby's burrow: a round door, a lantern, a little table
      const dd = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), M.std('digbyDoor', { color: 0x3f6f5a, rough: 0.6 })); dd.position.set(21, y + 0.45, -317.9); root.add(dd);
      const df = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.05, 6, 24), M.get('darkwood')); df.position.copy(dd.position); root.add(df);
      H.box({ w: 0.8, h: 0.35, d: 0.6, x: 22.4, y: y, z: -316.6, mat: 'midwood' }); H.light(21.8, y + 0.8, -316.8, 0xffc070, 0.7, 4, { ug: true, flicker: 0.2 });
      // the lift: a wooden cage in a shaft going up into the dark
      const lift = new THREE.Group(); lift.position.set(31.2, y, -300.2); root.add(lift); W.obj.deepLift = lift; lift.userData.dynamic = true;
      { const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.6), M.get('midwood')); base.position.y = 0.05; lift.add(base); for (const [sx, sz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.6, 0.07), M.get('darkwood')); p.position.set(sx, 0.8, sz); lift.add(p); } const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), M.get('darkwood')); top.position.y = 1.6; lift.add(top);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M.std('liftLamp', { color: 0x444455, emissive: 0x9f7fff, ei: 0, transparent: true, opacity: 0.8 })); lamp.position.set(0, 1.35, -0.7); lift.add(lamp); W.obj.liftLamp = lamp; lift.traverse((o) => (o.userData.dynamic = true)); }
      W.collider(30.4, 32, -301, -299.4, y - 1, y + 0.1, { cam: false, name: 'liftFloor' });
      for (const [sx, sz] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) H.box({ w: 0.14, h: 9, d: 0.14, x: 31.2 + sx, y: y, z: -300.2 + sz, mat: 'darkwood' });
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 18), M.get('darkmetal')); wheel.position.set(31.2, y + 8.6, -300.2); root.add(wheel);
      // carvings of the little folk and the spiral, again
      const carv = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshStandardMaterial({ map: R.text('carving2', 256, 160, (g) => { g.fillStyle = '#5a5048'; g.fillRect(0, 0, 256, 160); g.strokeStyle = 'rgba(20,14,8,.85)'; g.lineWidth = 4; g.beginPath(); for (let a = 0; a < 16; a += 0.15) { const r = 3 + a * 2.6; g.lineTo(60 + Math.cos(a) * r, 80 + Math.sin(a) * r); } g.stroke(); for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(120 + i * 26, 110, 7, 5, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(120 + i * 26, 104); g.lineTo(120 + i * 26, 70 - i * 4); g.stroke(); } g.font = 'bold 22px Georgia'; g.fillStyle = 'rgba(20,14,8,.85)'; g.fillText('→ THISTLECOMBE', 110, 40); }), roughness: 1 }));
      carv.position.set(24, y + 1.2, -318.0 + 0.2); root.add(carv);
    },
    update(dt, g) { const w = W.obj.deepWater; if (w && w.material.map) w.material.map.offset.x = -g.t * 0.35; },
  });
  // the fog of the deep is thinner than in the little tunnels: the caverns are big
  const oUpd = G.EXT.update;
  G.EXT.update = function (dt, st) {
    oUpd(dt, st); const g = G.game; if (!g || !g.scene || !g.scene.fog) return;
    const a = G.env && G.env.area; if (a && a.zone === 'deep' && !a.dark) { g.scene.fog.density = Math.min(g.scene.fog.density, 0.035); g.hemi.intensity = Math.max(g.hemi.intensity, 0.42); g.hemi.color.setHex(0x8a9ab8); g.hemi.groundColor.setHex(0x3a3028); }
  };

  /* ================================================================ STORM VALLEY */
  const rx = (z) => 88 + Math.sin(z * 0.045) * 7;
  function valleyH(x, z) {
    const d = Math.abs(x - rx(z));
    let y = 2 + 7.5 * ss(18, 48, Math.abs(x - 90)) + noise(x * 0.3, z * 0.3) * 0.7 * ss(6, 14, d) + 4 * ss(-305, -330, z) + 3 * ss(-175, -160, z);
    y -= 1.3 * ss(4.2, 1.6, d);
    const mh = Math.hypot(x - 50, z + 300); if (mh < 7) y = U.lerp(y, 8.2, ss(7, 4, mh));
    return y;
  }
  P.valley = { mine: [50.5, 0, -297.6], storm: [82, 0, -262], stormTree: [rx(-262) + 4.5, 0, -262], shelters: [[96, -249], [104, -236.5], [112.6, -224.6]], clover: [94, 0, -254], warren: [122, 0, -214.5], gate: [139, 0, -236], vista: [128, 0, -238] };
  P.valley.stormTree[1] = 'g';
  R.def({
    id: 'valley', navGround: true, name: 'Storm Valley', bounds: [40, 140, -330, -160], preload: 30,
    areas: [
      ['minehead', 'The Old Mine Head', 44, 58, -306, -292, { zone: 'valley', surf: 'wood' }],
      ['warren', 'Mallow’s Warren', 114, 130, -222, -206, { zone: 'valley', surf: 'grass' }],
      ['vriver', 'The Tumble River', 76, 100, -330, -160, { zone: 'valley', surf: 'grass' }],
      ['valley', 'Storm Valley', 40, 140, -330, -160, { zone: 'valley', surf: 'grass' }],
    ],
    terrains: [{ x0: 40, x1: 140, z0: -330, z1: -160, h: valleyH }],
    hazards: (() => { const h = []; for (let z = -329; z < -160; z += 1.6) h.push({ type: 'circle', x: rx(z), z, r: 1.7, y: 1.4, name: 'tumble' }); return h; })(),
    nav: { nodes: { va1: [52, 0, -296], va2: [64, 0, -284], va3: [78, 0, -266], va4: [92, 0, -262], va5: [100, 0, -246], va6: [110, 0, -230], va7: [122, 0, -216], va8: [132, 0, -236], va9: [139, 0, -236] }, edges: 'va1-va2 va2-va3 va3-va4 va4-va5 va5-va6 va6-va7 va6-va8 va7-va8 va8-va9' },
    build(ctx) {
      const { H, veg, gy, root } = ctx, rng = U.rng(3131);
      R.terrain(ctx, { x0: 40, x1: 140, z0: -330, z1: -160, seg: 90, h: valleyH, key: 'valley', tex: ['grass', 'stone', 'dirt'], scale: 7,
        weights: (x, z, y, slope) => { const d = Math.abs(x - rx(z)); return [Math.max(0, 1 - slope * 2.2), Math.min(1.4, slope * 2.4) + ss(3, 1.5, d) * 0.9, ss(5, 3, d) * 0.6]; } });
      // the Tumble River
      const rp = []; for (let z = -330; z <= -160; z += 3) rp.push([rx(z), z]);
      const riv = R.path(ctx, rp, 7.2, M.get('water'), { y: 1.5, lift: 0, po: false }); riv.userData.dynamic = true; if (G.GFX && G.GFX.registerWater) G.GFX.registerWater(riv, { planeY: 1.5, flat: true, flow: [0, 1] }); W.obj.tumble = riv;
      for (let z = -328; z < -162; z += 2.2) { const x = rx(z); for (const s of [-1, 1]) if (rng() < 0.6) veg.rocks.push([x + s * (3.6 + rng()), -0.3, z, 0.3 + rng() * 0.4, 'mossrock']); if (rng() < 0.4) veg.ferns.push([x + (rng() < 0.5 ? -5 : 5), z, 0.9, 'reed']); }
      // the old mine head: a timber headframe over the lift shaft
      { const my = gy(50, -300); const fr = new THREE.Group(); fr.position.set(50, my, -300); root.add(fr);
        for (const [sx, sz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.6, 0.2), M.get('darkwood')); p.position.set(sx * 0.8, 2.3, sz * 0.8); p.rotation.set(-sz * 0.12, 0, sx * 0.12); p.castShadow = true; fr.add(p); }
        const tb = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.3), M.get('darkwood')); tb.position.y = 4.4; fr.add(tb); const wh = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 20), M.get('darkmetal')); wh.position.y = 4.6; fr.add(wh);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), M.color(0x080605, 1)); hole.rotation.x = -Math.PI / 2; hole.position.set(50, my + 0.03, -300); root.add(hole);
        H.box({ w: 3.2, h: 0.12, d: 3.2, x: 50, y: my - 0.1, z: -300, mat: 'midwood', col: false }); W.collider(48.6, 51.4, -301.4, -298.6, my - 1, my + 0.02, { cam: false });
        for (const [x, z] of [[54, -296], [47, -303], [55, -304]]) { const c = H.box({ w: 0.7, h: 0.5, d: 0.5, x, y: gy(x, z), z, mat: 'midwood' }); c.rotation.y = rng() * 3; }
        R.sign(ctx, 53, -295.5, 0.7, 'OLD DEEPWAYS MINE', { w: 1.4 }); }
      // the storm tree: a tall dead pine by the river, struck by lightning in chapter 11
      { const [tx, , tz] = P.valley.stormTree, ty = gy(tx, tz); const t = new THREE.Group(); t.position.set(tx, ty, tz); root.add(t); W.obj.stormTree = t; t.userData.dynamic = true;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 11, 9), M.std('deadwood', { color: 0x6a5a4a, map: 'bark', rough: 1 })); tr.geometry.translate(0, 5.5, 0); tr.castShadow = true; t.add(tr); tr.userData.dynamic = true;
        for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 1.8, 5), tr.material); b.geometry.translate(0, 0.9, 0); b.position.y = 4 + i * 1.1; b.rotation.z = (i % 2 ? 1 : -1) * (0.9 + rng() * 0.4); b.rotation.y = rng() * 6; tr.add(b); b.userData.dynamic = true; }
        W.collider(tx - 0.35, tx + 0.35, tz - 0.35, tz + 0.35, ty, ty + 11, { name: 'stormTreeUp' });
        W.collider(rx(tz) - 5.2, tx, tz - 0.4, tz + 0.4, 1.4, 2.25, { name: 'stormLog', cam: false }).on = false; }
      // shelters from the storm: rock overhangs and a hollow log
      for (const [x, z] of P.valley.shelters) { const y0 = gy(x, z); const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 2), M.get('rock')); slab.position.set(x, y0 + 1.05, z); slab.rotation.set(0.08, rng() * 3, -0.06); slab.castShadow = true; root.add(slab); for (const s of [-1, 1]) H.sph({ x: x + s * 1, y: y0, z, r: 0.55, sy: 1.2, mat: 'rock' }); W.collider(x - 1.2, x + 1.2, z - 0.9, z + 0.9, y0 + 0.88, y0 + 1.25, { walk: true, cam: false }); }
      // Mallow's warren: burrow holes in a grassy bank
      for (const [x, z] of [[121, -212], [123.5, -213.2], [119.6, -215.4], [125, -216.8]]) { const yy = gy(x, z); const h = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), M.color(0x0b0706, 1)); h.position.set(x, yy + 0.25, z + 0.3); h.rotation.x = -0.3; root.add(h); H.sph({ x, y: yy, z: z - 0.1, r: 0.6, sy: 0.5, mat: 'dirt', cast: false }); }
      for (let i = 0; i < 30; i++) veg.flowers.push([116 + rng() * 12, -220 + rng() * 12, [0xffffff, 0xf2d24b, 0xe7a0b0][i % 3]]);
      // the valley: trees, boulders, meadow flowers, tall grass
      let n = 0;
      for (let i = 0; i < 2500 && n < 170; i++) { const x = 42 + rng() * 96, z = -328 + rng() * 166; const d = Math.abs(x - rx(z)); if (d < 7 || Math.hypot(x - 50, z + 300) < 8 || Math.hypot(x - 122, z + 214) < 8 || (x > 128 && Math.abs(z + 236) < 6) || P.valley.shelters.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3.5)) continue; if (Math.abs(x - 90) < 22 && rng() < 0.75) continue; const k = rng(); veg.trees.push([x, z, 0.8 + rng() * 0.6, k < 0.35 ? 'birch' : k < 0.5 ? 'autumn' : null]); n++; }
      for (let i = 0; i < 90; i++) { const x = 42 + rng() * 96, z = -328 + rng() * 166; if (Math.abs(x - rx(z)) < 6) continue; veg.rocks.push([x, -0.2, z, 0.3 + rng() * 0.9, rng() < 0.5 ? 'rock' : 'mossrock', rng() < 0.15]); }
      for (let i = 0; i < 320; i++) { const x = 42 + rng() * 96, z = -328 + rng() * 166; if (Math.abs(x - rx(z)) < 5.5) continue; if (rng() < 0.6) veg.ferns.push([x, z, 0.7 + rng() * 0.6, rng() < 0.5 ? 'tall' : 'fern']); else veg.flowers.push([x, z, [0xc07ad9, 0xf2d24b, 0xffffff, 0x8a7ad9][Math.floor(rng() * 4)]]); }
      veg.grass.push([42, 138, -328, -162, 1.1]);
      ctx.def.noGrass = (x, z) => Math.abs(x - rx(z)) < 3.4 || Math.hypot(x - 50, z + 300) < 2;
      R.walls(40, 140, -330, -160, -5, 40, { e: [[-240, -232]] });
      // the village gate on the eastern rim
      { const gx = 139.6, gz = -236, y0 = gy(gx, gz); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 8), M.get('darkwood')); p.position.set(gx, y0 + 1.3, gz + s * 1.6); p.castShadow = true; root.add(p); W.collider(gx - 0.2, gx + 0.2, gz + s * 1.6 - 0.2, gz + s * 1.6 + 0.2, y0, y0 + 2.6, {}); }
        const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 20, Math.PI), M.get('darkwood')); arch.position.set(gx, y0 + 2.5, gz); arch.rotation.y = Math.PI / 2; root.add(arch);
        const sp = R.text('thistlesign', 256, 64, (c) => { c.fillStyle = '#6a4a2a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#f2e6cf'; c.font = 'bold 30px Georgia'; c.textAlign = 'center'; c.fillText('Thistlecombe', 128, 42); });
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshStandardMaterial({ map: sp, roughness: 0.8, side: THREE.DoubleSide })); sg.position.set(gx - 0.05, y0 + 3.45, gz); sg.rotation.y = -Math.PI / 2; root.add(sg);
        for (let i = 0; i < 14; i++) veg.flowers.push([gx - 2 - rng() * 3, gz + (rng() - 0.5) * 6, rng() < 0.5 ? 0xffffff : 0xe7a0b0]); }
    },
    update(dt, g) { const r = W.obj.tumble; if (r && r.material.map) r.material.map.offset.y = -g.t * 0.6; },
  });

  /* ================================================================ THISTLECOMBE, the hidden village */
  const sx2 = (z) => 199 + Math.sin(z * 0.08) * 2.5; // the village stream
  function villageH(x, z) {
    let y = 9 - 6 * ss(146, 170, x) + 5 * ss(214, 230, x) + 4 * ss(-300, -326, z) + 4 * ss(-190, -164, z) + noise(x * 0.25, z * 0.25) * 0.4;
    const d = Math.abs(x - sx2(z)); y -= 0.9 * ss(2.2, 0.8, d);
    if (Math.hypot(x - 185, z + 240) < 9) y = U.lerp(y, 3.1, ss(9, 6, Math.hypot(x - 185, z + 240)));
    return y;
  }
  P.village = { gate: [142, 0, -236], square: [185, 0, -240], well: [185, 0, -240], hazel: [148.5, 0, -238.2], juniper: [206, 0, -258.4], oak: [206, 0, -262], mill: [201.8, 0, -226], tower: [172, 0, -252], bakery: [176, 0, -228], beeTree: [219, 0, -201], wheelJam: [199.2, 0, -229.6] };
  R.def({
    id: 'village', navGround: true, name: 'Thistlecombe', bounds: [140, 230, -330, -160], preload: 30,
    areas: [
      ['vsquare', 'Thistlecombe Square', 176, 194, -249, -231, { zone: 'village', surf: 'stone' }],
      ['vmill', 'The Mill', 194, 208, -234, -218, { zone: 'village', surf: 'wood' }],
      ['voak', 'The Council Oak', 199, 214, -270, -254, { zone: 'village', surf: 'grass' }],
      ['vtower', 'The Bell Tower', 166, 178, -258, -246, { zone: 'village', surf: 'wood' }],
      ['vbees', 'The Bee Tree', 212, 226, -208, -194, { zone: 'village', surf: 'grass' }],
      ['village', 'Thistlecombe', 140, 230, -330, -160, { zone: 'village', surf: 'grass' }],
    ],
    terrains: [{ x0: 140, x1: 230, z0: -330, z1: -160, h: villageH }],
    hazards: (() => { const h = []; for (let z = -329; z < -160; z += 1.4) h.push({ type: 'circle', x: sx2(z), z, r: 0.9, y: villageH(sx2(z), z) + 0.55, name: 'vstream' }); return h; })(),
    nav: { nodes: { vg1: [142, 0, -236], vg2: [158, 0, -238], vg3: [172, 0, -240], vg4: [185, 0, -240], vg5: [194, 0, -232], vg6: [201, 0, -240], vg7: [206, 0, -254], vg8: [172, 0, -249], vg9: [210, 0, -214], vg10: [218, 0, -202], vg11: [176, 0, -230] }, edges: 'va9-vg1 vg1-vg2 vg2-vg3 vg3-vg4 vg4-vg5 vg4-vg6 vg6-vg7 vg3-vg8 vg5-vg9 vg9-vg10 vg4-vg11' },
    build(ctx) {
      const { H, veg, gy, root } = ctx, rng = U.rng(4242);
      R.terrain(ctx, { x0: 140, x1: 230, z0: -330, z1: -160, seg: 90, h: villageH, key: 'village', tex: ['grass', 'stone', 'dirt'], scale: 6,
        weights: (x, z, y, slope) => [Math.max(0, 1 - slope * 2.4), Math.min(1.4, slope * 2.6) + (Math.hypot(x - 185, z + 240) < 8 ? 1.2 : 0), ss(1.2, 0.5, Math.abs(z + 238 - Math.sin(x * 0.1) * 1.5)) * (x < 185 ? 0.9 : 0)] });
      // the stream and its footbridges
      const sp = []; for (let z = -330; z <= -160; z += 2) sp.push([sx2(z), z]);
      const st = R.path(ctx, sp, 3, M.get('water'), { lift: 0.02, po: false }); st.userData.dynamic = true; if (G.GFX && G.GFX.registerWater) G.GFX.registerWater(st, { planeY: 2.5, flat: false, flow: [0, 1] }); W.obj.vstream = st;
      for (const z of [-240, -262, -214]) { const x = sx2(z), y = gy(x - 2, z) + 0.05; R.bridge(ctx, x - 1.8, z, x + 1.8, z, Math.max(y, gy(x + 2, z) + 0.05) + 0.1, 1.2); }
      // the lane from the gate down to the square
      const lane = []; for (let x = 141; x <= 185; x += 2.5) lane.push([x, -238 + Math.sin(x * 0.1) * 1.5]);
      R.path(ctx, lane, 1.6, M.std('villageLane', { map: 'dirt', color: 0xc8a882, rough: 1 }));
      // the square: cobbles, a well, market stalls, lanterns on strings
      H.disc(185, -240, 7.6, gy(185, -240) + 0.02, M.std('cobbles', { map: 'stone', color: 0xb8a890, rough: 0.9 }), 3);
      { const wy = gy(185, -240); H.cyl({ r: 0.7, h: 0.55, x: 185, y: wy, z: -240, mat: 'stonewall', col: true }); const wd = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), M.color(0x0b1a22, 0.2)); wd.rotation.x = -Math.PI / 2; wd.position.set(185, wy + 0.45, -240); root.add(wd); for (const s of [-1, 1]) H.box({ w: 0.08, h: 1.2, d: 0.08, x: 185 + s * 0.6, y: wy + 0.5, z: -240, mat: 'darkwood', col: false }); const rf = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 4), M.std('wellroof', { color: 0x8a3a2a, map: 'shingles' })); rf.position.set(185, wy + 1.9, -240); rf.rotation.y = Math.PI / 4; root.add(rf); }
      const stall = (x, z, ry, c) => { const y0 = gy(x, z); const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; root.add(g); const tb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.6), M.get('midwood')); tb.position.y = 0.22; tb.castShadow = true; g.add(tb); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), M.get('darkwood')); p.position.set(s * 0.68, 0.55, -0.28); g.add(p); } const aw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.8), M.std('awning' + c, { color: c, map: 'fabric' })); aw.position.set(0, 1.1, 0); aw.rotation.x = 0.25; aw.castShadow = true; g.add(aw); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.color([0xd9573b, 0xf2c14e, 0x6a3a8a, 0x8ac04a][i % 4], 0.6)); f.position.set(-0.5 + i * 0.25, 0.5, 0.05); g.add(f); } W.collider(x - 0.75, x + 0.75, z - 0.75, z + 0.75, y0, y0 + 0.45, { climb: true }); };
      stall(179.4, -245.5, 0.6, 0xd9573b); stall(190.5, -245.6, -0.6, 0x3f8a74); stall(191.2, -234.4, -2.5, 0xf2c14e);
      const lamps = new THREE.Group(); root.add(lamps); W.obj.vLamps = lamps; lamps.userData.dynamic = true;
      const lampM = M.std('vLamp', { color: 0xffe0a0, emissive: 0xffb050, ei: 0.4 }); lamps.userData.mat = lampM;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28, x0 = 185 + Math.cos(a) * 7, z0 = -240 + Math.sin(a) * 7, y0 = gy(x0, z0); H.cyl({ r: 0.05, h: 2.4, x: x0, y: y0, z: z0, mat: 'darkwood', col: false }); for (let k = 1; k < 6; k++) { const t = k / 6, x = U.lerp(x0, 185, t), z = U.lerp(z0, -240, t), yy = U.lerp(y0 + 2.35, gy(185, -240) + 3.2, t) - Math.sin(t * Math.PI) * 0.35; const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lampM); l.position.set(x, yy, z); lamps.add(l); l.userData.dynamic = true; } }
      H.light(185, gy(185, -240) + 3, -240, 0xffc070, 1.4, 12, { night: true });
      // cottages of the little folk: stone walls, thatch or toadstool roofs, round doors
      const doorC = [0x3f6f9e, 0xd9573b, 0x3f8a74, 0xf2c14e, 0x8a5a9a, 0x2f5d4a];
      const cottage = (x, z, ry, k) => {
        const y0 = gy(x, z); const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = ry; root.add(g);
        const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.2, 12), M.std('vcotwall' + (k % 2), { map: k % 2 ? 'stonewall' : 'plaster', color: k % 2 ? 0xc8b8a0 : 0xf0e6d0, rough: 0.9 })); wall.position.y = 0.6; wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
        if (k % 3 === 0) { const cap = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 8, 0, 6.3, 0, 1.5), M.std('toadstool', { color: 0xc0392b, rough: 0.6 })); cap.scale.y = 0.6; cap.position.y = 1.15; cap.castShadow = true; g.add(cap); for (let i = 0; i < 7; i++) { const a = rng() * 6.28, h = 0.3 + rng() * 0.6, sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.get('white')); sp2.scale.y = 0.4; sp2.position.set(Math.cos(a) * Math.sqrt(1 - h * h) * 1.2, 1.15 + h * 0.72, Math.sin(a) * Math.sqrt(1 - h * h) * 1.2); g.add(sp2); } }
        else { const th = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.1, 12), M.std('thatch', { color: 0xb89858, map: 'bark', rough: 1 })); th.position.y = 1.72; th.castShadow = true; g.add(th); }
        const dr = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), M.std('vdoor' + k % 6, { color: doorC[k % 6], rough: 0.6 })); dr.position.set(0, 0.36, 0.93); g.add(dr); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), M.get('brass')); kn.position.set(0.15, 0.36, 0.95); g.add(kn);
        for (const s of [-1, 1]) { const wi = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), M.std('vwin', { color: 0x2a2a38, emissive: 0xffb050, ei: 0 })); wi.position.set(Math.sin(s * 0.9) * 0.93, 0.75, Math.cos(s * 0.9) * 0.93); wi.rotation.y = s * 0.9; g.add(wi); }
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6), M.get('brick')); ch.position.set(0.45, 1.9, -0.3); g.add(ch);
        W.collider(x - 0.85, x + 0.85, z - 0.85, z + 0.85, y0, y0 + 2.2, {});
        for (let i = 0; i < 6; i++) { const a = ry + (rng() - 0.5) * 2.2; veg.flowers.push([x + Math.sin(a) * 1.4, z + Math.cos(a) * 1.4, [0xffffff, 0xe7a0b0, 0xd9573b][i % 3]]); }
        return g;
      };
      const COTS = [[168, -236, 1.6], [170.5, -243.6, 1.2], [177.5, -250.5, 0.5], [192.8, -250.2, -0.5], [196.5, -244, -1.2], [182, -229.6, 3], [166.4, -229, 2.2], [160, -246, 1.3], [188.6, -257, 0.1], [214.5, -244, -1.6], [213, -232, -1.8], [157.4, -228.6, 2.4]];
      COTS.forEach(([x, z, ry], k) => cottage(x, z, ry, k));
      // doors in the banks: burrow homes along the north side of the combe
      for (let i = 0; i < 7; i++) { const x = 160 + i * 7.2, z = -272 - (i % 2) * 1.5, y0 = gy(x, z + 1.4); const d = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18), M.std('vdoor' + i % 6, { color: doorC[i % 6], rough: 0.6 })); d.position.set(x, y0 + 0.4, z + 1.2); d.rotation.x = -0.25; root.add(d); const fr = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 20), M.get('darkwood')); fr.position.copy(d.position); fr.rotation.x = -0.25; root.add(fr); const lp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lampM); lp.position.set(x + 0.5, y0 + 0.7, z + 1.3); root.add(lp); }
      // the bakery with its oven chimney
      { const [x, , z] = P.village.bakery, y0 = gy(x, z); H.box({ w: 2.4, h: 1.5, d: 1.8, x, y: y0, z, mat: M.std('bakerywall', { map: 'brick', color: 0xd8a888 }) }); const rf = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 4), M.std('bakeryroof', { color: 0x6a3a2a, map: 'shingles' })); rf.position.set(x, y0 + 2, z); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.8); root.add(rf); H.cyl({ r: 0.18, h: 1.1, x: x + 0.7, y: y0 + 1.6, z: z - 0.3, mat: 'brick', col: false }); W.obj.bakeryChimney = new THREE.Object3D(); W.obj.bakeryChimney.position.set(x + 0.7, y0 + 2.8, z - 0.3); root.add(W.obj.bakeryChimney);
        const sg = R.text('bakesign', 256, 64, (c) => { c.fillStyle = '#f2e6cf'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#6a3a2a'; c.font = 'bold 30px Georgia'; c.textAlign = 'center'; c.fillText("Tansy's Bakery", 128, 42); }); const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: sg, roughness: 0.8 })); sm.position.set(x, y0 + 1.25, z + 0.91); root.add(sm); }
      // the mill and its waterwheel (jammed by the storm until chapter 12)
      { const [x, , z] = P.village.mill, y0 = gy(x, z); H.box({ w: 2.6, h: 2.2, d: 2.4, x: x + 1.4, y: y0, z, mat: M.std('millwall', { map: 'stonewall', color: 0xc8b8a0 }) }); const rf = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.4, 4), M.std('millroof', { color: 0x4a5a6a, map: 'shingles' })); rf.position.set(x + 1.4, y0 + 2.9, z); rf.rotation.y = Math.PI / 4; root.add(rf);
        const wheel = new THREE.Group(); wheel.position.set(sx2(z) + 0.1, gy(sx2(z), z) + 0.9, z); root.add(wheel); W.obj.millWheel = wheel; wheel.userData.dynamic = true;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 24), M.get('darkwood')); rim.rotation.y = Math.PI / 2; wheel.add(rim); for (let i = 0; i < 10; i++) { const pd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.4), M.get('midwood')); const a = (i / 10) * 6.28; pd.position.set(0, Math.cos(a) * 1, Math.sin(a) * 1); pd.rotation.x = a; wheel.add(pd); pd.userData.dynamic = true; } rim.userData.dynamic = true;
        const jam = new THREE.Group(); root.add(jam); W.obj.wheelJam = jam; jam.userData.dynamic = true; const [jx, , jz] = P.village.wheelJam; for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.4 + rng(), 5), M.get('bark')); b.position.set(jx + (rng() - 0.5) * 0.6, gy(jx, jz) + 0.3 + rng() * 0.3, jz + (rng() - 0.5) * 0.5); b.rotation.set(rng() * 3, rng() * 3, Math.PI / 2); jam.add(b); b.userData.dynamic = true; } }
      // the bell tower: a ladder of steps up to the bell
      { const [x, , z] = P.village.tower, y0 = gy(x, z), top = y0 + 3;
        for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) H.box({ w: 0.18, h: 4.8, d: 0.18, x: x + a, y: y0, z: z + b, mat: 'darkwood' });
        H.box({ w: 3, h: 0.12, d: 3, x, y: top - 0.12, z, mat: 'midwood', col: false }); W.collider(x - 1.5, x + 1.5, z - 1.5, z + 1.5, top - 0.3, top, { cam: false });
        R.stairs(ctx, x + 0.9, z + 6.3, y0, top, '-z', 0.8, 'midwood');
        for (const s2 of [-1, 1]) H.box({ w: 3, h: 0.07, d: 0.07, x, y: top + 0.7, z: z + s2 * 1.45, mat: 'darkwood', col: false });
        W.collider(x - 1.5, x + 1.5, z - 1.55, z - 1.4, top, top + 0.8, { walk: false, cam: false }); W.collider(x - 1.55, x - 1.4, z - 1.5, z + 1.5, top, top + 0.8, { walk: false, cam: false }); W.collider(x + 1.4, x + 1.55, z - 1.5, z + 1.5, top, top + 0.8, { walk: false, cam: false });
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.3, 4), M.std('towerroof', { color: 0x3f5a8a, map: 'shingles' })); roof.position.set(x, y0 + 5.4, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; root.add(roof);
        const bell = new THREE.Group(); bell.position.set(x, y0 + 4.7, z); root.add(bell); W.obj.vBell = bell; bell.userData.dynamic = true; const bm = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 8, 0, 6.3, 0, 1.8), M.get('brass')); bm.position.y = -0.3; bm.castShadow = true; bell.add(bm); bm.userData.dynamic = true;
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), M.color(0xc8b080)); rope.position.set(x, top + 0.8, z); root.add(rope); }
      // the Council Oak, with Juniper's door among its roots
      { const [x, , z] = P.village.oak, y0 = gy(x, z); const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 7, 14), M.get('bark')); tr.position.set(x, y0 + 3.5, z); tr.castShadow = true; root.add(tr); W.collider(x - 1.9, x + 1.9, z - 1.9, z + 1.9, y0, y0 + 7, {});
        for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + 0.3; const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 2.2, 6), M.get('bark')); rt.position.set(x + Math.cos(a) * 2.3, y0 + 0.25, z + Math.sin(a) * 2.3); rt.rotation.set(0, -a, Math.PI / 2 - 0.25); rt.rotation.order = 'YXZ'; rt.castShadow = true; root.add(rt); }
        const dr = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), M.std('juniperDoor', { color: 0xa8302a, rough: 0.6 })); dr.position.set(x, y0 + 0.5, z + 2.25); dr.rotation.x = -0.2; root.add(dr); const drf = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.06, 6, 24), M.get('brass')); drf.position.copy(dr.position); drf.rotation.x = -0.2; root.add(drf);
        veg.trees.push([x, z, 3.2, 'oak', 0x5a8a3a]);
        H.light(x, y0 + 1, z + 2.8, 0xffc070, 0.8, 5, { night: true }); }
      // the bee tree and its honey
      { const [x, , z] = P.village.beeTree; veg.trees.push([x, z, 1.4, 'oak']); const hv = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), M.std('hive', { color: 0xd9a84a, rough: 0.6 })); hv.scale.y = 1.3; hv.position.set(x + 0.4, gy(x, z) + 2.4, z + 0.3); root.add(hv); W.obj.beeHive = hv; hv.userData.dynamic = true; }
      // Rose's roses by the doors, gardens, the combe's slopes
      for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r = 10 + rng() * 14, x = 185 + Math.cos(a) * r, z = -240 + Math.sin(a) * r; if (Math.abs(x - sx2(z)) < 2.5) continue; if (COTS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 1.8)) continue; veg.bushes.push([x, 0.3, z, 0.5 + rng() * 0.3, rng() < 0.5 ? 0x5a7a3a : 0x4a6a2a, false]); veg.flowers.push([x + 0.2, z, 0xffffff], [x - 0.2, z + 0.1, 0xe7a0b0]); }
      let n = 0; for (let i = 0; i < 2000 && n < 110; i++) { const x = 142 + rng() * 86, z = -328 + rng() * 166; if (Math.hypot(x - 185, z + 240) < 26 || Math.abs(x - sx2(z)) < 3) continue; if (Math.hypot(x - 219, z + 201) < 5) continue; veg.trees.push([x, z, 0.8 + rng() * 0.6, rng() < 0.3 ? 'birch' : rng() < 0.2 ? 'autumn' : null]); n++; }
      for (let i = 0; i < 200; i++) { const x = 142 + rng() * 86, z = -328 + rng() * 166; if (Math.abs(x - sx2(z)) < 2) continue; if (rng() < 0.5) veg.ferns.push([x, z, 0.7 + rng() * 0.5, 'fern']); else veg.flowers.push([x, z, [0xc07ad9, 0xf2d24b, 0xffffff][Math.floor(rng() * 3)]]); }
      veg.grass.push([142, 228, -328, -162, 1.2]);
      ctx.def.noGrass = (x, z) => Math.abs(x - sx2(z)) < 1.3 || Math.hypot(x - 185, z + 240) < 7.8 || Math.abs(z + 238 - Math.sin(x * 0.1) * 1.5) < 0.9 && x < 185;
      R.walls(140, 230, -330, -160, -5, 40, { w: [[-240, -232]] });
    },
    update(dt, g) {
      const w = W.obj.millWheel; if (w && G.game.S.flags.wheelFree) w.rotation.x -= dt * 1.2;
      const st = W.obj.vstream; if (st && st.material.map) st.material.map.offset.y = -g.t * 0.8;
      const n = (G.env && G.env.night) || 0, lm = W.obj.vLamps && W.obj.vLamps.userData.mat; if (lm) lm.emissiveIntensity = 0.4 + n * 2.2 + (G.game.S.flags.lanternFest ? 1.2 : 0);
      const ch = W.obj.bakeryChimney; if (ch && Math.random() < dt * 3 && g.particles) { const p = ch.position; g.particles.emit({ x: p.x, y: p.y, z: p.z, vx: 0.1, vy: 0.5, vz: 0, life: 3, size: 0.3, col: 0xd8d0c8, alpha: 0.35, grow: 1.5 }); }
      const hv = W.obj.beeHive; if (hv && Math.random() < dt * 4 && g.particles && Math.hypot(g.player.pos.x - hv.position.x, g.player.pos.z - hv.position.z) < 14) g.particles.emit({ x: hv.position.x + (Math.random() - 0.5), y: hv.position.y + (Math.random() - 0.5), z: hv.position.z + (Math.random() - 0.5), vx: 0, vy: 0, vz: 0, life: 1.5, size: 0.04, col: 0x2a2010, wander: 2.5 });
    },
  });
})();
