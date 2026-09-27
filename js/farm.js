/* =====================================================================
   farm.js - Bonus Chapter III: "Grandpa Arlo's Farm".
   Reached by choosing to stay in the car on the road trip.
   - Pinewood Farm: farmhouse + porch, a big red barn with a hayloft,
     hen coop, vegetable garden, pond with a dock, tractor and hay wagon
     (hiding spots), apple tree with a tire swing, a windmill.
   - Grandpa Arlo (rigged human) with his own routine: rocking chair,
     gardening, feeding the hens.
   - Tasks: three runaway eggs, Grandpa's lost glasses (hayloft), and a
     game of tag (Grandpa tries to catch you!).
   - Then: Juniper's secret den behind the barn, her treasure box, and a
     sunset porch ending with harmonica and fireflies.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, EXT = G.EXT, UG = G.World.UG, Mt = G.Mat, K = G.Kit, C = G.Cast;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const has = (f) => !!S().flags[f];
  const { cutscene, wait, talk, go, shot, cut, track, mat } = K;
  const inFarm = () => S().chapter === 9;
  const onFarm = () => { const p = game().player.pos; return p.x > 150 && p.x < 230 && p.z > 55 && p.z < 150; };


  /* ------------------------------------------------------------ items */
  Object.assign(G.ITEMS, {
    egg: { name: 'Speckled Egg', desc: 'Warm, brown and speckled. Rosie the hen keeps laying them in the silliest places.' },
    glasses: { name: 'Grandpa’s Glasses', desc: 'Round reading glasses with a wobbly left arm. Found in the hayloft, of course.', story: true },
    treasure: { name: 'Juniper’s Treasure Box', desc: 'A tiny wooden box, scratched with a “J”. Juniper hid it in her secret den under the farm fifty years ago.', story: true },
  });
  const oMake = G.makeItem;
  G.makeItem = (id) => {
    if (id === 'egg') { const g = new THREE.Group(); const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), Mt.std('eggshell', { color: 0xd9b48a, rough: 0.6, map: G.Tex.make('eggtex', 64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(90,50,20,.45)'; for (let i = 0; i < 60; i++) c.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); }) })); e.scale.y = 1.3; e.position.y = 0.058; e.castShadow = true; g.add(e); return g; }
    if (id === 'glasses') { const g = new THREE.Group(); const m = Mt.std('glassframe', { color: 0x4a3222, rough: 0.4 }); for (const x of [-0.035, 0.035]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 6, 18), m); r.position.set(x, 0.03, 0); g.add(r); } const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.004), m); b.position.y = 0.036; g.add(b); g.rotation.x = -1.2; return g; }
    if (id === 'treasure') { const g = new THREE.Group(); const w = Mt.std('tbox', { color: 0x7a4a2a, rough: 0.7, map: 'planks' }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.11), w); b.position.y = 0.04; b.castShadow = true; g.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.12), w); l.position.y = 0.09; g.add(l); const cl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), Mt.get('brass')); cl.position.set(0, 0.07, 0.06); g.add(cl); return g; }
    return oMake(id);
  };
  const tasksOn = () => inFarm() && has('arloTasks');
  G.PICKUPS.push(
    { id: 'p_egg1', item: 'egg', model: 'egg', pos: [200.6, 0, 70.4], when: tasksOn, msg: 'An egg! Under the tractor. Rosie, what were you DOING under here?' },
    { id: 'p_egg2', item: 'egg', model: 'egg', pos: [165.3, 0, 107.2], when: tasksOn, msg: 'Egg number... one of them! Tucked between the cabbages.' },
    { id: 'p_egg3', item: 'egg', model: 'egg', pos: [208.4, 0, 91.6], when: tasksOn, msg: 'An egg in the corner of the barn, snug in the straw.' },
    { id: 'p_glasses', item: 'glasses', model: 'glasses', pos: [207.6, 2.4, 80.9], when: tasksOn, msg: 'Round glasses, up in the hayloft. Grandpa must have fallen asleep up here again.' },
  );
  G.COLLECT.push({ id: 's_jphoto', cat: 'secrets', model: 'photo', name: 'Juniper’s Photo', desc: 'A faded photo: young Arlo in a flat cap, and a ferret on his shoulder with a brass bell. Juniper!', pos: [223.1, UG + 0.02, 143.6] });

  /* ------------------------------------------------------------ steps */
  const eggsGiven = () => S().flags.arloEggs || 0;
  const eggsHeld = () => (S().inv.egg || 0);
  G.STEPS.a_tasks = { text: 'Help Grandpa Arlo', target: () => {
    const f = S().flags;
    if (eggsHeld() + eggsGiven() < 3) { for (const [id, p] of [['p_egg1', [200.6, 0, 70.4]], ['p_egg2', [165.3, 0, 107.2]], ['p_egg3', [208.4, 0, 91.6]]]) if (!f['got_' + id]) return p; }
    if (!f.got_p_glasses) return [207.6, 2.4, 80.9];
    return [F.arlo.pos.x, 0, F.arlo.pos.z];
  } };
  G.STEPS.a_den = { text: 'Juniper’s hidey-hole: dig behind the old barn', target: [211.8, 0, 88.6] };
  G.STEPS.a_denIn = { text: 'Explore Juniper’s secret den', target: [222.6, UG, 143] };
  G.STEPS.a_return = { text: 'Bring Juniper’s treasure box to Grandpa Arlo', target: () => [F.arlo.pos.x, 0, F.arlo.pos.z] };
  G.STEPS.a_done = { text: 'The farm is yours! When you’re ready, ride home in the car by the gate', target: [176.5, 0, 87.8] };
  function taskText() {
    const f = S().flags, e = Math.min(3, eggsHeld() + eggsGiven());
    const parts = [`eggs ${e}/3${f.arloEggsDone ? ' ✓' : ''}`, `glasses ${f.arloGlasses ? '✓' : f.got_p_glasses ? '(bring them back)' : '?'}`, `tag ${f.arloTag ? '✓' : '(ask Grandpa)'}`];
    return 'Help Grandpa: ' + parts.join(' · ');
  }

  /* ------------------------------------------------------------ world: Pinewood Farm */
  const F = (G.Farm = { hens: [] });
  const oBuild = EXT.buildWorld;
  EXT.buildWorld = function (W) {
    oBuild(W);
    const H = W.h, root = W.root, dyn = (m) => { m.userData.dynamic = true; m.traverse((o) => (o.userData.dynamic = true)); return m; };
    const sub = (id, name, x0, x1, z0, z1, o = {}) => W.areas.unshift(Object.assign({ id, name, x0, x1, z0, z1 }, o));
    const M_red = Mt.std('barnred', { color: 0x9a3328, rough: 0.85, map: 'planks' }), M_white = Mt.std('farmwhite', { color: 0xf0e8d8, rough: 0.8, map: 'siding' }), M_trim = Mt.std('farmtrim', { color: 0xf5f0e6, rough: 0.6 });
    const M_leaf = Mt.std('farmleaf', { color: 0x5f8a3a, rough: 0.9, map: 'leaf' }), M_reed = Mt.std('reed', { color: 0x6f8a3a, rough: 0.9 });
    const M_hay = Mt.std('hay', { color: 0xe8c878, rough: 1, map: G.Tex.make('haytex', 128, 128, (c) => { c.fillStyle = '#e0bd6a'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 400; i++) { c.strokeStyle = `rgba(${140 + Math.random() * 80},${100 + Math.random() * 60},30,.6)`; c.beginPath(); const x = Math.random() * 128, y = Math.random() * 128; c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 6); c.stroke(); } }) });
    const M_green = mat(0x2f7a32, 0.45), M_yellow = mat(0xf0b82a, 0.5), M_tire = mat(0x26262a, 0.9);
    // ground, bounds, the drive
    H.plane(154, 216, 62, 133, 0, 'grass', 6); W.grassZones.push([156, 214, 64, 131, 0.7]);
    H.collider(155, 156, 62, 133, 0, 8, { cam: false }); H.collider(215, 216, 62, 133, 0, 8, { cam: false }); H.collider(155, 216, 132, 133, 0, 8, { cam: false });
    H.plane(159, 163, 62, 88, 0.006, 'dirt', 3); H.plane(163, 186, 84, 88, 0.006, 'dirt', 3); H.plane(182, 186, 88, 98, 0.006, 'dirt', 3);
    H.fence(157.5, 63, 157.5, 130, 1.1, [], {}); H.fence(164.5, 63, 164.5, 82, 1.1, [], {});
    // sign + mailbox at the gate
    { const t = G.Tex.make('farmsign', 512, 160, (c, w, h) => { c.fillStyle = '#6a4a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2614'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#f2e4c0'; c.textAlign = 'center'; c.font = 'bold 64px Georgia'; c.fillText('PINEWOOD FARM', w / 2, 80); c.font = 'italic 36px Georgia'; c.fillText('est. 1961 · A. Pemberton', w / 2, 128); });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); sg.position.set(158.2, 2.2, 64.2); sg.rotation.y = 0.35; root.add(sg);
      for (const dx of [-1.4, 1.4]) H.box({ w: 0.16, h: 2.8, d: 0.16, x: 158.2 + dx * Math.cos(0.35), z: 64.2 - dx * Math.sin(0.35), mat: 'darkwood', col: false });
      H.box({ w: 0.12, h: 1.1, d: 0.12, x: 164.2, z: 64, mat: 'darkwood' }); H.box({ w: 0.35, h: 0.28, d: 0.5, x: 164.2, y: 1.1, z: 64, mat: M_red, col: false }); }
    // --- the farmhouse
    H.box({ w: 14, h: 3.4, d: 8, x: 184, z: 105, mat: M_white, s: 1.2 });
    H.roofPrism(184, 105, 14.8, 9, 3.4, 2.4, true, 'shingles', M_white);
    H.box({ w: 0.8, h: 2, d: 0.8, x: 188.5, y: 4.4, z: 106, mat: 'brick', col: false });
    for (const x of [179.5, 188.5]) H.windowAt(x, 1.7, 100.98, Math.PI, 1.3, 1.2, { inside: false });
    for (const x of [180, 184, 188]) H.windowAt(x, 2.7, 109.02, 0, 1, 0.9, { inside: false });
    H.doorPanel(184, 100.96, Math.PI, 1.1, 2.2, Mt.std('farmdoor', { color: 0x2f5d4a, rough: 0.5 }));
    // porch: raised deck, steps, posts, roof, rocking chair, bench, Mochi's basket, the farm bell
    H.box({ w: 13, h: 0.34, d: 3, x: 184, z: 99.5, mat: 'planks', climb: true, s: 1 });
    H.box({ w: 2, h: 0.17, d: 0.5, x: 184, z: 97.75, mat: 'planks', climb: true });
    for (const x of [178, 182, 186, 190]) H.box({ w: 0.16, h: 2.5, d: 0.16, x, y: 0.34, z: 98.1, mat: M_trim, col: false });
    H.box({ w: 13.4, h: 0.12, d: 3.3, x: 184, y: 2.84, z: 99.4, mat: 'shingles', col: false });
    H.box({ w: 13, h: 0.06, d: 0.08, x: 184, y: 1.2, z: 98.05, mat: M_trim, col: false });
    const rock = dyn(new THREE.Group()); rock.position.set(181, 0.34, 99.7); rock.rotation.y = Math.PI + 0.3; root.add(rock); F.rocker = rock;
    { const w = Mt.get('midwood') || 'midwood'; const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), mat(0x7a5236, 0.7)); seat.position.y = 0.45; rock.add(seat); const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.05), mat(0x7a5236, 0.7)); back.position.set(0, 0.82, -0.25); back.rotation.x = -0.15; rock.add(back);
      for (const sx of [-0.27, 0.27]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 20, 1.2), mat(0x6a4426, 0.7)); r.rotation.y = Math.PI / 2; r.rotation.z = Math.PI + (Math.PI - 1.2) / 2; r.position.set(sx, 0.5, 0); rock.add(r); for (const lz of [-0.2, 0.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), mat(0x6a4426, 0.7)); l.position.set(sx, 0.24, lz); rock.add(l); } }
      dyn(rock); }
    H.box({ w: 1.5, h: 0.08, d: 0.45, x: 187.3, y: 0.78, z: 100.3, mat: 'midwood', col: false }); for (const dx of [-0.65, 0.65]) H.box({ w: 0.08, h: 0.44, d: 0.4, x: 187.3 + dx, y: 0.34, z: 100.3, mat: 'midwood', col: false });
    { const bk = new THREE.Group(); bk.position.set(183.2, 0.34, 100.4); root.add(bk); const wk = mat(0xc8995a, 0.9, { map: 'fabric' }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.16, 16, 1, true), wk); b.position.y = 0.08; bk.add(b); const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), mat(0x5a7fa0, 0.95, { map: 'fabric' })); cu.position.y = 0.04; bk.add(cu); }
    H.box({ w: 0.12, h: 2.2, d: 0.12, x: 175.6, z: 99, mat: 'darkwood' }); H.box({ w: 0.7, h: 0.08, d: 0.08, x: 175.9, y: 2.1, z: 99, mat: 'darkwood', col: false });
    { const bell = dyn(new THREE.Group()); bell.position.set(176.1, 2.02, 99); root.add(bell); const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.24, 14, 1, true), Mt.get('brass')); bm.position.y = -0.14; bm.material.side = THREE.DoubleSide; bell.add(bm); dyn(bell); F.bell = bell; }
    // --- the big red barn with a hayloft
    const bx0 = 196, bx1 = 210, bz0 = 78, bz1 = 94, bh = 4.6;
    H.wall(bx0, bz0, bx1, bz0, bh, 0.2, M_red, M_red, [], { s: 1.2, edge: M_trim });
    H.wall(bx0, bz1, bx1, bz1, bh, 0.2, M_red, M_red, [], { s: 1.2, edge: M_trim });
    H.wall(bx1, bz0, bx1, bz1, bh, 0.2, M_red, M_red, [[87.6, 88.2, 0.35]], { s: 1.2, edge: M_trim });
    H.wall(bx0, bz0, bx0, bz1, bh, 0.2, M_red, M_red, [[83, 89, 3.6]], { s: 1.2, edge: M_trim });
    H.roofPrism(203, 86, 16.6, 14.8, bh, 3.4, false, Mt.std('barnroof', { color: 0x4a4e52, rough: 0.6, metal: 0.3 }), M_red);
    for (const [z, s] of [[83, -1], [89, 1]]) { const d = new THREE.Group(); d.position.set(195.85, 0, z); d.rotation.y = s * 1.9; root.add(d); const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.6, 3), M_red); p.position.set(0, 1.8, -s * 1.5); d.add(p); for (const k of [-1, 1]) { const x = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 0.14), M_trim); x.position.set(0.02, 1.8, -s * 1.5); x.rotation.x = k * 0.62; d.add(x); } }
    H.plane(bx0, bx1, bz0, bz1, 0.01, Mt.std('barnfloor', { color: 0xb8955a, rough: 1, map: 'dirt' }), 2);
    for (let i = 0; i < 60; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.02), M_hay); s.position.set(bx0 + 1 + Math.random() * 12, 0.02, bz0 + 1 + Math.random() * 14); s.rotation.y = Math.random() * 3; root.add(s); }
    // hayloft (north-east part), reached by a staircase of hay bales
    H.box({ w: 7, h: 0.16, d: 6, x: 206.5, y: 2.24, z: 81.2, mat: 'planks', colY0: 0 });
    H.box({ w: 7, h: 0.1, d: 0.1, x: 206.5, y: 2.9, z: 84.2, mat: 'darkwood', col: false }); for (const x of [203.2, 206.5, 209.8]) H.box({ w: 0.14, h: 2.24, d: 0.14, x, z: 84.1, mat: 'darkwood', col: false });
    const bale = (x, y, z, ry = 0) => H.box({ w: 1.1, h: 0.45, d: 0.6, x, y, z, ry, mat: M_hay, climb: true });
    [86.4, 85.8, 85.2, 84.6, 84.0].forEach((z, i) => { for (let k = 0; k <= i; k++) bale(202.6, k * 0.45, z); });
    for (const [x, z] of [[205, 80], [206.3, 80], [207.6, 80], [205.6, 80.5]]) bale(x, 2.4, z);
    bale(199, 0, 92.6); bale(200.2, 0, 92.6); bale(199.6, 0.45, 92.6); bale(208.6, 0, 88); bale(208.6, 0, 89.2);
    H.light(203, 3.6, 86, 0xffd9a0, 0.8, 12, {});
    sub('barn', 'The Old Barn', bx0, bx1, bz0, bz1, { zone: 'farm', surf: 'dirt' }); sub('loft', 'The Hayloft', 203, bx1, bz0, 84.2, { zone: 'farm', surf: 'wood' });
    // hay wagon (hide underneath)
    H.box({ w: 2.2, h: 0.14, d: 3.4, x: 190, y: 0.56, z: 72, mat: 'planks', colY0: 0 }); for (const [x, z] of [[189.1, 70.9], [190.9, 70.9], [189.1, 73.1], [190.9, 73.1]]) { H.cyl({ r: 0.3, h: 0.1, x, y: 0.3, z, rz: Math.PI / 2, mat: M_tire }); H.collider(x - 0.06, x + 0.06, z - 0.3, z + 0.3, 0, 0.55, { cam: false }); }
    bale(189.6, 0.7, 71.4); bale(190.4, 0.7, 72.6); bale(190, 1.15, 72);
    // tractor (hide underneath)
    { const t = dyn(new THREE.Group()); t.position.set(200.6, 0, 70.4); t.rotation.y = 0.4; root.add(t); F.tractor = t;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 2.4), M_green); body.position.set(0, 1.0, 0.2); body.castShadow = true; t.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.1), M_green); cab.position.set(0, 1.9, -0.6); t.add(cab); const cg = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.6, 1.0), Mt.get('glass')); cg.position.set(0, 2.05, -0.6); t.add(cg);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), Mt.get('darkmetal') || M_tire); stack.position.set(0.3, 1.7, 0.9); t.add(stack);
      for (const [x, z, r] of [[-0.7, -0.6, 0.62], [0.7, -0.6, 0.62], [-0.55, 1.0, 0.36], [0.55, 1.0, 0.36]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 18), M_tire); w.rotation.z = Math.PI / 2; w.position.set(x, r, z); t.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.32, 12), M_yellow); hub.rotation.z = Math.PI / 2; hub.position.set(x, r, z); t.add(hub); }
      dyn(t);
      const c = Math.cos(0.4), s = Math.sin(0.4), tw = (lx, lz) => [200.6 + lx * c + lz * s, 70.4 - lx * s + lz * c];
      { const [x, z] = tw(0, 0.2); H.collider(x - 0.75, x + 0.75, z - 1.2, z + 1.2, 0.56, 2.4, {}); }
      for (const [lx, lz] of [[-0.7, -0.6], [0.7, -0.6], [-0.55, 1.0], [0.55, 1.0]]) { const [x, z] = tw(lx, lz); H.collider(x - 0.18, x + 0.18, z - 0.3, z + 0.3, 0, 0.6, { cam: false }); } }
    // hen coop + run
    H.box({ w: 3, h: 1.6, d: 2.4, x: 167, y: 0.4, z: 90.6, mat: M_red }); H.roofPrism(167, 90.6, 3.4, 2.8, 2.0, 0.9, true, 'shingles', M_red);
    for (const [x, z] of [[165.7, 89.6], [168.3, 89.6], [165.7, 91.6], [168.3, 91.6]]) H.box({ w: 0.12, h: 0.4, d: 0.12, x, z, mat: 'darkwood', col: false });
    H.box({ w: 0.5, h: 0.05, d: 1.4, x: 167, y: 0.2, z: 88.8, rx: 0.3, mat: 'planks', col: false });
    { const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.45), mat(0x1a120c, 1)); hole.position.set(167, 0.8, 89.38); hole.rotation.y = Math.PI; root.add(hole); }
    H.fence(162.5, 84.5, 171.5, 84.5, 0.8, [[166, 167.4, 0.8]], {}); H.fence(162.5, 84.5, 162.5, 94, 0.8, [], {}); H.fence(171.5, 84.5, 171.5, 94, 0.8, [], {}); H.fence(162.5, 94, 171.5, 94, 0.8, [], {});
    sub('coop', 'The Hen Run', 162.5, 171.5, 84.5, 94, { zone: 'farm', surf: 'dirt' }); H.plane(162.5, 171.5, 84.5, 94, 0.005, 'dirt', 2);
    // vegetable garden
    H.fence(159.5, 100.5, 171.5, 100.5, 0.9, [[165, 166.4, 0.9]], {}); H.fence(159.5, 100.5, 159.5, 112, 0.9, [], {}); H.fence(171.5, 100.5, 171.5, 112, 0.9, [], {}); H.fence(159.5, 112, 171.5, 112, 0.9, [], {});
    H.plane(160, 171, 101, 111.5, 0.006, 'soil', 1.5);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) { const x = 161 + i * 1.5, z = 102.5 + r * 2.4; if (Math.abs(x - 165.5) < 0.4 && Math.abs(z - 107.3) < 1) continue; if (r % 2) { H.sph({ x, y: 0.16, z, r: 0.26, sy: 0.7, mat: mat(0x7aa84e, 0.8) }); } else { H.box({ w: 0.04, h: 0.9, d: 0.04, x, z, mat: 'shedwood', col: false }); H.sph({ x, y: 0.45, z, r: 0.2, sy: 1.6, mat: M_leaf }); H.sph({ x: x + 0.08, y: 0.5, z: z + 0.1, r: 0.05, mat: Mt.std('tomato', { color: 0xd9412b, rough: 0.4 }) }); } }
    { const sc = new THREE.Group(); sc.position.set(170.2, 0, 110.6); root.add(sc); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), mat(0x7a5a3a, 0.9)); pole.position.y = 0.9; sc.add(pole); const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), mat(0x7a5a3a, 0.9)); arm.position.y = 1.4; sc.add(arm); const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.25), mat(0x3f6fa0, 0.9, { map: 'fabric' })); shirt.position.y = 1.25; sc.add(shirt); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(0xe0c890, 0.9, { map: 'fabric' })); hd.position.y = 1.72; sc.add(hd); const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 14), mat(0xc9a45a, 0.9)); hat.position.y = 1.85; sc.add(hat); }
    sub('garden', 'Grandpa’s Garden', 159.5, 171.5, 100.5, 112, { zone: 'farm', surf: 'dirt' });
    // pond with a dock and reeds
    { const px = 172, pz = 121, pr = 5.2; const wm = Mt.get('water') || Mt.std('pondw', { color: 0x3f6f7a, rough: 0.05, metal: 0.2 }); const d = new THREE.Mesh(new THREE.CircleGeometry(pr, 32), wm); d.rotation.x = -Math.PI / 2; d.position.set(px, 0.03, pz); root.add(d);
      H.disc(px, pz, pr + 0.5, 0.012, 'dirt', 2);
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; const rr = pr + 0.2; H.sph({ x: px + Math.cos(a) * rr, y: 0.06, z: pz + Math.sin(a) * rr, r: 0.22 + Math.random() * 0.12, sy: 0.6, mat: 'rock' }); if (i % 3 === 0) for (let k = 0; k < 4; k++) H.box({ w: 0.03, h: 0.7 + Math.random() * 0.4, d: 0.03, x: px + Math.cos(a + k * 0.04) * (rr + 0.3), z: pz + Math.sin(a + k * 0.04) * (rr + 0.3), rz: (Math.random() - 0.5) * 0.3, mat: M_reed, col: false }); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; if (Math.abs(a - Math.PI) < 0.35) continue; H.collider(px + Math.cos(a) * pr - 1.3, px + Math.cos(a) * pr + 1.3, pz + Math.sin(a) * pr - 1.3, pz + Math.sin(a) * pr + 1.3, 0, 1.4, { cam: false }); }
      H.collider(px - 3.6, px + 3.6, pz - 3.6, pz + 3.6, 0, 1.4, { cam: false });
      H.box({ w: 3, h: 0.1, d: 1, x: px - 5.6, y: 0.22, z: pz, mat: 'planks', climb: true }); for (const [x, z] of [[px - 4.3, pz - 0.45], [px - 4.3, pz + 0.45], [px - 6.9, pz - 0.45], [px - 6.9, pz + 0.45]]) H.box({ w: 0.12, h: 0.3, d: 0.12, x, z, mat: 'darkwood', col: false });
      for (let i = 0; i < 5; i++) { const lp = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), mat(0x4f8a3a, 0.7)); lp.rotation.x = -Math.PI / 2; lp.position.set(px + (Math.random() - 0.3) * 6, 0.04, pz + (Math.random() - 0.5) * 6); root.add(lp); }
      sub('pond', 'The Duck Pond', px - pr - 2, px + pr + 1, pz - pr - 1, pz + pr + 1, { zone: 'farm', surf: 'grass' }); }
    // apple tree + tire swing, windmill, more trees
    W.trees.push([204.5, 113, 1.5, 'apple'], [161, 125, 1.2], [176, 130, 1.1], [196, 128, 1.3], [212, 106, 1.1], [158.5, 95, 1], [212, 66, 1.2], [194, 64, 1]);
    W.pines.push([214, 118, 1.3], [213, 127, 1.1], [159, 116, 1.2], [185, 131, 1.2], [205, 131, 1]);
    { const sw = dyn(new THREE.Group()); sw.position.set(203.6, 3.7, 112.6); root.add(sw); F.swing = sw; const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 3, 6), mat(0xc9a45a, 0.9)); rope.position.y = -1.5; sw.add(rope); const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 10, 20), M_tire); tire.position.y = -3.05; tire.rotation.y = Math.PI / 2; sw.add(tire); dyn(sw);
      H.box({ w: 2.4, h: 0.14, d: 0.14, x: 204.1, y: 3.7, z: 112.6, mat: 'bark', col: false }); }
    { const wmX = 209.5, wmZ = 124; const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.2, 8, 4, 1, true), mat(0x8a9098, 0.55, { metal: 0.3 })); tower.position.set(wmX, 4, wmZ); tower.rotation.y = Math.PI / 4; root.add(tower);
      for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 8.1, 0.08), Mt.get('metal')); const a = Math.PI / 4 + i * Math.PI / 2; leg.position.set(wmX + Math.cos(a) * 0.7, 4, wmZ + Math.sin(a) * 0.7); leg.rotation.z = Math.cos(a) * 0.12; leg.rotation.x = -Math.sin(a) * 0.12; root.add(leg); }
      const hub = dyn(new THREE.Group()); hub.position.set(wmX, 8.1, wmZ - 0.4); root.add(hub); F.windmill = hub;
      for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.02), mat(0xe8e2d4, 0.5)); b.position.y = 0.9; const p = new THREE.Group(); p.rotation.z = (i / 12) * Math.PI * 2; p.add(b); b.rotation.y = 0.35; hub.add(p); }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 1.2), Mt.std('wmtail', { color: 0xc0392b, rough: 0.5 })); tail.position.set(0, 0, 1.1); hub.add(tail); dyn(hub);
      H.collider(wmX - 1, wmX + 1, wmZ - 1, wmZ + 1, 0, 3, { cam: false }); }
    // Juniper's secret den (underground) - entrance behind the barn
    { const mound = H.sph({ x: 211.8, y: 0, z: 88.6, r: 0.36, sy: 0.3, mat: 'dirt' }); F.denMound = dyn(mound);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), mat(0x0b0706, 1)); hole.rotation.x = -Math.PI / 2; hole.position.set(211.8, 0.02, 88.6); hole.visible = false; root.add(hole); F.denHole = dyn(hole);
      for (let i = 0; i < 5; i++) H.sph({ x: 211.2 + Math.random() * 1.2, y: 0.05, z: 88 + Math.random() * 1.2, r: 0.06, mat: 'rock' });
      H.tunnel('JDEN', [[214, UG, 140], [216.5, UG, 141.4], [219, UG, 140.6], [221.2, UG, 142.2]]);
      H.tunnel('JDENC', [[221.2, UG, 142.2], [222.6, UG, 143]], { r: 1.5, noVis: true });
      const ch = new THREE.Mesh(new THREE.SphereGeometry(2.5, 22, 16), Mt.std('jdenwall', { map: 'dirt', color: 0xa07a52, rough: 1, side: THREE.BackSide })); ch.scale.set(1, 0.62, 1); ch.position.set(222.6, UG + 0.3, 143); root.add(ch);
      H.disc(222.6, 143, 2.45, UG + 0.01, Mt.std('jdenfloor', { color: 0x8a6a48, rough: 1, map: 'dirt' }), 1.5);
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 8, 18), mat(0xb8955a, 1, { map: 'fabric' })); nest.rotation.x = -Math.PI / 2; nest.position.set(223.3, UG + 0.08, 142.5); root.add(nest);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.05), mat(0xc0392b, 0.6)); rib.position.set(222.2, UG + 0.02, 143.7); rib.rotation.y = 0.6; root.add(rib);
      for (let i = 0; i < 7; i++) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 10), Mt.get('brass')); cap.position.set(221.8 + Math.random() * 1.4, UG + 0.012, 142.2 + Math.random() * 0.5); root.add(cap); }
      const box = G.makeItem('treasure'); box.scale.setScalar(1.6); box.position.set(223.4, UG + 0.02, 142.4); root.add(box); F.tbox = dyn(box);
      H.light(222.6, UG + 0.7, 143, 0xffc27a, 0.9, 4, { ug: true, flicker: 0.15 });
      sub('jden', 'Juniper’s Secret Den', 212, 225, 138, 146, { ug: true, zone: 'under', surf: 'dirt', dark: true }); }
    // areas
    W.areas.push({ id: 'farm', name: 'Pinewood Farm', x0: 154, x1: 216, z0: 62, z1: 133, zone: 'farm', surf: 'grass' });
    sub('porch', 'The Porch', 177.5, 190.5, 97.8, 101, { zone: 'farm', surf: 'wood' });
    // hiding spots: under the tractor / wagon (overhead), plus the reeds and the bushes by the house
    if (EXT.HIDES) EXT.HIDES.push([164, 131, 1.2], [176.8, 116.2, 1.2]);
    W.bushes.push([164, 0.55, 131, 0.8, 0x4d6e36], [176.8, 0.5, 116.2, 0.75, 0x55743a], [179, 0.5, 101.4, 0.6, 0x4d6e36], [189, 0.5, 101.4, 0.6, 0x55743a]);
  };
  const oNav = EXT.buildNav;
  EXT.buildNav = function (W) {
    oNav(W);
    const { N, adj } = W.nav;
    const add = (id, p, links) => { N[id] = p; adj[id] = adj[id] || []; for (const l of links) { if (!N[l]) continue; adj[id].push(l); adj[l].push(id); } };
    add('fGate', [161, 0, 66], []); add('fDrive', [161, 0, 86], ['fGate']); add('fYard', [176, 0, 90], ['fDrive']); add('fPorch', [184, 0, 96.5], ['fYard']);
    add('fCoop', [166.7, 0, 83.5], ['fDrive', 'fYard']); add('fCoopIn', [166.7, 0, 87.5], ['fCoop']); add('fGardenG', [165.7, 0, 99.6], ['fYard', 'fCoop']); add('fGarden', [165.7, 0, 104], ['fGardenG']);
    add('fBarnDoor', [194.5, 0, 86], ['fYard']); add('fBarn', [199, 0, 86], ['fBarnDoor']); add('fBale', [201.6, 0, 87], ['fBarn']); add('fLoft', [206, 2.4, 82], ['fBale']);
    add('fTractor', [198.5, 0, 72.5], ['fYard', 'fBarnDoor']); add('fWagon', [192.5, 0, 74], ['fTractor', 'fYard']);
    add('fBehind', [212.2, 0, 86], ['fTractor']); add('fDen', [211.8, 0, 88.6], ['fBehind']);
    add('fPondW', [164.5, 0, 121], ['fGarden', 'fGardenG']); add('fSwing', [202, 0, 111], ['fPorch', 'fBehind']); add('fMill', [207, 0, 122], ['fSwing']);
    add('fNE', [194, 0, 104], ['fSwing', 'fYard', 'fBarnDoor']);
  };

  /* ------------------------------------------------------------ the cast at the farm */
  const HENS = [[165, 88], [168, 87], [169.5, 91.5], [164, 92.4], [176, 86]];
  function henModel(col) {
    const g = new THREE.Group(), m = mat(col, 0.9, { map: 'fabric' });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), m); b.scale.set(0.9, 0.9, 1.2); b.position.y = 0.24; b.castShadow = true; g.add(b);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 8), m); tail.position.set(0, 0.34, -0.2); tail.rotation.x = -0.9; g.add(tail);
    const hd = new THREE.Group(); hd.position.set(0, 0.38, 0.14); g.add(hd); const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m); hd.add(h);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.07), mat(0xd9412b, 0.5)); comb.position.set(0, 0.07, 0); hd.add(comb);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), mat(0xe8a93a, 0.5)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.005, 0.08); hd.add(beak);
    for (const sx of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), mat(0x111111, 0.2)); e.position.set(sx, 0.015, 0.055); hd.add(e); }
    const wings = []; for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m); w.scale.set(0.3, 0.7, 1.1); w.position.set(sx * 0.14, 0.26, -0.02); g.add(w); wings.push(w); }
    const legs = []; for (const sx of [-0.05, 0.05]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 5), mat(0xe8a93a, 0.5)); l.position.set(sx, 0.06, 0); g.add(l); legs.push(l); }
    g.userData = { hd, wings, legs }; return g;
  }
  F.init = function (g) {
    F.arlo = new G.Human('arlo'); F.arlo.root.visible = false; g.scene.add(F.arlo.root); C.extraHumans.push(F.arlo); F.arlo.home = false;
    G.UI.portraitsExtra.arlo = G.UI.portraitsExtra.arlo || null; if (G.UI.portraits && G.UI.portraitsExtra.arlo) G.UI.portraits.arlo = G.UI.portraitsExtra.arlo;
    HENS.forEach(([x, z], i) => { const m = henModel([0xb8642a, 0xf2ede4, 0x6a3a1a, 0xd9a45a, 0x2a2624][i]); m.position.set(x, 0, z); m.visible = false; g.scene.add(m); F.hens.push({ m, x, z, tx: x, tz: z, t: Math.random() * 3, flee: 0, peck: 0, yaw: Math.random() * 6 }); });
    // interactions
    const near = (p) => [p.x, 0, p.z];
    F.itArlo = { id: 'a_arlo', pos: [0, -999, 0], r: 1.3, label: () => (S().step === 'a_return' ? 'Show Grandpa the treasure box' : 'Talk to Grandpa Arlo'), when: () => inFarm() && F.arlo.root.visible && !F.arlo.chase && !G.SEQ.running, act: () => talkArlo() };
    F.itEllie = { id: 'a_ellie', pos: [0, -999, 0], r: 1.5, label: 'Visit Ellie on the swing', when: () => inFarm() && C.ellie.root.visible && !G.SEQ.running, act: () => talkEllieFarm() };
    F.itMum = { id: 'a_mum', pos: [187.3, 0.34, 100.9], r: 1.3, label: 'Say hi to Mum', when: () => inFarm() && C.mum.root.visible && !G.SEQ.running, act: () => talkMumFarm() };
    G.INTERACT.push(F.itArlo, F.itEllie, F.itMum,
      { id: 'a_hen', pos: [0, -999, 0], r: 1.2, label: 'Chase a hen!', anim: 'dance', when: () => inFarm() && F.henNear, act: () => chaseHen(F.henNear) },
      { id: 'a_bell', pos: [175.8, 0, 99.4], r: 1.1, label: 'Tug the farm bell rope', anim: 'interact', when: inFarm, act: () => ringBell() },
      { id: 'a_dig', pos: [211.8, 0, 88.6], r: 1, label: () => (has('jdenOpen') ? 'Crawl into Juniper’s den' : 'Dig at the loose earth'), anim: 'dig', when: () => inFarm() && (S().step === 'a_den' || has('jdenOpen')), act: () => digDen() },
      { id: 'a_denOut', pos: [214, UG, 140], r: 0.8, label: 'Climb back up to the barn', when: inFarm, act: () => game().travel([212.4, 0, 88.2], Math.PI) },
      { id: 'a_tbox', pos: [223.2, UG, 142.5], r: 1.1, label: 'Open the little wooden box', anim: 'interact', when: () => inFarm() && S().step === 'a_denIn', act: () => openBox() },
      { id: 'a_goHome', pos: [176.5, 0, 87.8], r: 2.4, label: 'Ride home in the car', when: () => has('arloDone') && !G.SEQ.running && onFarm(), act: () => goHome() },
    );
  };
  function ringBell() { A.play('bell'); setTimeout(() => A.play('bell', 0.7), 350); F.bellT = 2; if (!has('arloBell')) { game().flag('arloBell'); game().say([['arlo', 'Ha! Supper bell! ...It’s three in the afternoon, Milo. Nice try.', 'happy']]); } }
  function chaseHen(h) { h.flee = 2.2; h.fx = h.m.position.x - game().player.pos.x; h.fz = h.m.position.z - game().player.pos.z; A.play('cluck'); for (let i = 0; i < 6; i++) game().particles.emit({ x: h.m.position.x, y: 0.35, z: h.m.position.z, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 1.5, life: 1.4, size: 0.05, col: 0xf2ede4, grav: 2 }); S().flags.hensChased = (S().flags.hensChased || 0) + 1; if (S().flags.hensChased === 5) UI().toast('<b>Fox in the henhouse</b>', null, 'Five hens chased. Rosie has filed a formal complaint.'); }

  /* ------------------------------------------------------------ dialogue */
  function talkArlo() {
    const s = S(), f = s.flags, g = game(), a = F.arlo;
    a.yaw = Math.atan2(g.player.pos.x - a.pos.x, g.player.pos.z - a.pos.z); const prev = a.pose; a.pose = 'idle'; a.talkLock = 4;
    if (s.step === 'a_return' && g.hasItem('treasure')) return porchEnding();
    const lines = [];
    if (s.step === 'a_tasks') {
      const held = eggsHeld();
      if (held > 0) { lines.push({ do: () => { g.take('egg', held); f.arloEggs = eggsGiven() + held; a.pose = 'give'; A.play('pickup'); } }, ['arlo', held === 1 ? 'An egg! Still warm. You’ve got a gentle mouth, Milo. Juniper used to crack every single one.' : `${held} eggs! Not a crack on ’em. You’re hired.`, 'happy']); }
      if (eggsGiven() + held >= 3 && !f.arloEggsDone) lines.push({ do: () => { f.arloEggsDone = true; } }, ['arlo', 'That’s all three of Rosie’s runaways. Omelettes tonight!', 'happy']);
      if (g.hasItem('glasses')) lines.push({ do: () => { g.take('glasses'); f.arloGlasses = true; a.pose = 'think'; } }, ['arlo', 'My GLASSES! In the hayloft? ...I was napping up there, wasn’t I. Don’t tell your mother.', 'happy'], ['arlo', '*puts them on* Ah! There you are. You’re much less blurry than I thought.', 'happy']);
      const allDone = () => f.arloEggsDone && f.arloGlasses && f.arloTag;
      if (!f.arloTag) lines.push({ choice: [
        { t: 'Play tag with Grandpa!', then: [['arlo', 'Tag, eh? Juniper never once let me catch her. Alright: I’m IT. Keep away from me for twenty seconds, or hide somewhere clever. Ready?', 'happy'], { do: () => startTag() }] },
        { t: 'Not yet. (Keep exploring)', then: [['arlo', lines.length ? 'Go on then. Eggs, glasses... and tag whenever you’re ready.' : 'Three eggs, one pair of glasses, and a game of tag. Rosie’s eggs could be anywhere! Try your nose.', 'happy']] },
      ] });
      else if (!allDone()) lines.push(['arlo', `Still need ${[!f.arloEggsDone && 'those eggs', !f.arloGlasses && 'my glasses'].filter(Boolean).join(' and ')}. Try that famous nose of yours!`, 'think']);
      lines.push({ do: () => { if (allDone() && s.step === 'a_tasks') setTimeout(() => junipersStory(), 400); a.pose = prev === 'sit' ? 'idle' : 'idle'; UI().updateObjective(true); } });
      return g.say(lines);
    }
    if (s.step === 'a_den' || s.step === 'a_denIn') return g.say([['arlo', 'Behind the barn, by the old fence post. That’s where she always vanished. Go on, noodle!', 'happy']]);
    return g.say([['arlo', ['Best helper this farm has had in fifty years.', 'You want to hear about the time Juniper stole a whole pie? ...She took it one crumb at a time. Took her all week.', 'Stay for supper? Silly question. You’re a ferret. Of course you are.'][Math.floor(Math.random() * 3)], 'happy']]);
  }
  function talkEllieFarm() { const E = C.ellie; game().say([['ellie', ['Milo! Push me! ...Oh. You can’t push. You’re a noodle. That’s okay!', 'Grandpa says Juniper used to ride on this swing with him. On his SHOULDER. Can you do that?', 'Higher! HIGHER! ...Okay that’s high enough. MUM!'][Math.floor(Math.random() * 3)], 'happy']]); E.pose = 'cheer'; setTimeout(() => (E.pose = 'sit'), 1500); }
  function talkMumFarm() { game().say([['mum', ['This is the first time I’ve sat down in three days. Don’t steal my book. Please.', 'Dad’s so happy you’re here, Milo. He keeps telling everyone about the music box.', 'If you find a pie on the windowsill, it is NOT for ferrets.'][Math.floor(Math.random() * 3)], 'happy']]); }

  /* ------------------------------------------------------------ tag! */
  C.chaseDefs.tag = {
    title: '<b>Tag! Grandpa is it!</b>', msg: 'Stay away from Grandpa Arlo for 20 seconds, or hide under the tractor or the hay wagon.',
    escaped: '"Ho ho! You’re even quicker than Juniper was!"', far: 18, speed: 2.55, direct: true, maxT: 20,
    outOfArea: (pl) => pl.pos.z < 62.5 || pl.pos.y < -5,
    onEscaped: (h) => { S().flags.arloTag = true; h.pose = 'laugh'; h.talkLock = 3; UI().updateObjective(true); setTimeout(() => { if (inFarm()) game().say([['arlo', '*wheeze* ...You win, you win! I’m seventy-eight, Milo. Have mercy.', 'happy']]); }, 900); },
    caught: async (h) => {
      await talk([['arlo', 'GOTCHA! Ha! Fifty years of practice chasing a ferret, and it finally paid off!', 'happy']]);
      h.pose = 'hug'; await wait(0.8);
      await talk([['arlo', 'Best two out of three? Talk to me when you’ve caught your breath.', 'happy']]);
      C.carried = null; K.putDown(h); h.pose = 'idle';
    },
  };
  async function startTag() {
    const a = F.arlo; a.pose = 'think'; a.talkLock = 99;
    for (const n of ['One...', 'Two...', 'THREE!']) { UI().toast(`<b>${n}</b>`, G.UI.portraitsExtra.arlo, ''); A.play('ui'); await new Promise((r) => setTimeout(r, 900)); }
    a.talkLock = 0; K.startChase(a, 'tag');
  }

  /* ------------------------------------------------------------ Juniper */
  async function junipersStory() {
    const a = F.arlo, g = game(), pl = g.player;
    await cutscene(async () => {
      shot([a.pos.x + 2.4, 1.5, a.pos.z - 2], [a.pos.x, 0.9, a.pos.z]);
      a.pose = 'think';
      await talk([['arlo', 'Eggs, glasses, and you beat me at tag. You know who else could do all that?', 'happy'], ['arlo', 'Juniper. My ferret, when I was a boy. Same mask as you. Same bossy little face.', 'happy']]);
      a.pose = 'point'; a.yaw = Math.atan2(211 - a.pos.x, 88 - a.pos.z);
      cut([206, 2.6, 92.5], [211.8, 0.2, 88.6], 0.1); await wait(1.4);
      await talk([['arlo', 'Every evening she’d vanish behind the barn with something shiny in her mouth. Never did find where she took it all.', 'think'], ['arlo', 'Fifty years I’ve wondered. Maybe it takes a ferret to find a ferret’s secret.', 'happy'], ['milo', 'Challenge accepted.', 'happy']]);
      a.pose = 'idle';
    });
    S().step = 'a_den'; UI().updateObjective(true); A.play('quest'); g.autosave();
  }
  function digDen() {
    const g = game();
    if (!has('jdenOpen')) { g.flag('jdenOpen'); g.player.act('dig', 1.4); A.play('dig'); F.denMound.visible = false; F.denHole.visible = true; setTimeout(() => { g.say([['milo', 'The earth here is soft, like somebody dug it long ago... There’s a tunnel!', 'surprised']]); }, 1400); return; }
    g.travel([214.4, UG, 140.2], Math.PI / 2 + 0.3, () => { if (S().step === 'a_den') { S().step = 'a_denIn'; UI().updateObjective(true); } if (!has('jdenSeen')) { g.flag('jdenSeen'); g.say([['milo', 'It smells like... ferret. Old ferret. And brass, and ribbon, and a little bit of pie.', 'think']]); } });
  }
  function openBox() {
    const g = game(); if (F.tbox) F.tbox.visible = false;
    g.say([['milo', 'A tiny wooden box, scratched with a “J”. It rattles!', 'surprised'], { do: () => { g.give('treasure'); A.play('secret'); } }, ['milo', 'Inside: a brass button, a marble, a blue ribbon... and something else. I’d better let Grandpa open it.', 'happy']]);
    S().step = 'a_return'; UI().updateObjective(true); g.autosave();
  }

  function goHome() {
    const g = game(), s = S();
    g.say([['milo', 'Time to go home? ...Five more minutes. Okay. Fine.', 'happy'], { do: () => { UI().fade(true); setTimeout(() => { s.chapter = s.prevChapter && ![7, 8, 9].includes(s.prevChapter) ? s.prevChapter : 6; s.step = s.chapter === 6 ? 'end' : s.farmPrevStep || s.step; g.applyWorldState(); g.placeNPCs(); g.refreshItems(); A.setMood(g.moodFor()); g.player.teleport(-3, 0, -3.9, 0.4); g.cam.snap = true; UI().fade(false); UI().updateObjective(true); g.autosave(); g.say([['milo', '*Home. My basket smells like hay now. I don’t mind at all.*', 'happy']]); }, 900); } }]);
  }
  /* ------------------------------------------------------------ cutscenes */
  async function arrival() {
    const g = game(), s = S(), pl = g.player, car = C.car, E = C.ellie, Mm = C.mum, a = F.arlo, P = C.passenger, D = C.driver;
    await cutscene(async () => {
      s.time = 16.2; s.weather = 'clear'; g.applyWorldState(); applyFarm(true);
      car.visible = true; car.position.set(161, 0, 60); car.rotation.y = 0; car.userData.speed = 6; P.root.visible = true; D.root.visible = true; P.seated = true; P.pose = 'wave2'; D.pose = 'drive';
      E.root.visible = false; Mm.root.visible = false; K.hideMilo(true); C.ride = { car, off: V3(0.4, 0.61, -0.84), yaw: 0 };
      a.root.visible = true; a.pos.set(181, 0.34, 99.7); a.yaw = Math.PI + 0.3; a.pose = 'sit'; a.seated = false; a.talkLock = 999;
      UI().fade(false); UI().chapterCard(9);
      cut([166, 3.2, 70], [161, 0.8, 62], 0.1);
      const drive = go(car, [[161, 72], [161, 81.5], [164, 85.6], [176.5, 86.2]], 6.5);
      await wait(2.4); track(car, [-4.5, 2.4, -6.5], [0, 0.9, 3]);
      await wait(2.2);
      cut([184, 1.6, 93.5], [181, 1, 99.7], 0.1); a.pose = 'idle'; await wait(0.7); a.pose = 'wave2'; A.play('dook');
      await talk([['arlo', 'Is that... it IS! Ellie-belly! And the famous FERRETS!', 'happy']]);
      await drive; car.userData.speed = 0;
      a.pos.y = 0; go(a, [[184, 97.3], [180, 92], [177.4, 89.9]], 1.3);
      cut([172.5, 1.7, 91.8], [177, 0.9, 87], 0.1);
      await wait(0.6); K.openDoor(car, 0, true); K.openDoor(car, 2, true); await wait(0.3);
      P.root.visible = false; D.root.visible = false; P.seated = false; E.seated = false; Mm.seated = false; C.ride = null; K.hideMilo(false); K.pickUp(E); E.pose = 'carry';
      K.exitCar(car, Mm, 1, [178, 88.9], 1.1);
      await K.exitCar(car, E, -1, [176.6, 88.7], 1.4);
      await wait(0.3);
      E.pose = 'hug'; a.pose = 'hug'; E.yaw = Math.atan2(a.pos.x - E.pos.x, a.pos.z - E.pos.z); a.yaw = Math.atan2(E.pos.x - a.pos.x, E.pos.z - a.pos.z);
      cut([175.2, 1.5, 92.2], [177.2, 1.1, 89.3], 0.1);
      await talk([['ellie', 'GRANDPA! We almost didn’t make it! There was a gas station and a chip bag and Milo was SO brave!', 'happy'], ['arlo', 'Brave, was he? Let’s have a look at this brave fellow.', 'happy']]);
      a.pose = 'reach'; E.pose = 'reach'; await wait(0.6); K.putDown(E); E.pose = 'idle';
      pl.act('lookup', 2);
      { const dx = pl.pos.x - a.pos.x, dz = pl.pos.z - a.pos.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l, sz = dx / l; cut([pl.pos.x + dx / l * 1.5 + sx * 1.1, 1.0, pl.pos.z + dz / l * 1.5 + sz * 1.1], [(pl.pos.x + a.pos.x) / 2, 0.55, (pl.pos.z + a.pos.z) / 2], 0.1); }
      await talk([['arlo', 'So THIS is Milo. The ferret who found my music box, after fifty years under that old house.', 'happy']]);
      a.pose = 'pet'; await wait(1.1); pl.dance(1.6);
      await talk([['arlo', 'Ha! The war dance! Juniper did that too. You’d have liked her, Milo.', 'happy'], ['mum', 'Hi Dad. We brought you two ferrets, one tired daughter, and zero cheese puffs.', 'happy']]);
      a.pose = 'idle'; Mm.pose = 'hug'; await wait(0.8); Mm.pose = 'idle';
      cut([a.pos.x + 1.8, 1.3, a.pos.z + 2.2], [a.pos.x, 0.9, a.pos.z], 0.1); a.yaw = Math.atan2(pl.pos.x - a.pos.x, pl.pos.z - a.pos.z);
      await talk([['arlo', 'Now then, Milo. A farm doesn’t run itself. I could use a sharp-nosed helper.', 'happy'], ['arlo', 'Rosie the hen has hidden three eggs somewhere. And I’ve lost my reading glasses. Again.', 'think'], ['arlo', 'Oh, and when you’re ready... I challenge you to a game of tag. Winner gets pie.', 'smug']]);
      // everyone to their spots
      go(E, [[190, 96], [201.6, 111.8]], 2.2); go(Mm, [[184, 97.3], [187.3, 100.2]], 1.3);
    });
    s.step = 'a_tasks'; game().flag('arloTasks'); a.talkLock = 0; a.spot = 3; a.timer = 6; a.pos.y = 0; g.refreshItems(); UI().updateObjective(true); A.play('quest'); g.autosave();
    placeFamily(); if (G.Mochi) { G.Mochi.f.root.visible = true; G.Mochi.place(183.2, 0.4, 100.4); G.Mochi.state = 'sleep'; G.Mochi.stateT = 1e9; }
  }
  async function porchEnding() {
    const g = game(), s = S(), pl = g.player, a = F.arlo, E = C.ellie, Mm = C.mum;
    await cutscene(async () => {
      UI().fade(true); await wait(0.9);
      s.time = 19.3; g.applyWorldState();
      a.pos.set(181, 0.34, 99.7); a.yaw = Math.PI + 0.3; a.pose = 'sit'; a.seated = false;
      Mm.root.visible = true; Mm.pos.set(187.3, 0.34, 100.3); Mm.yaw = Math.PI; Mm.pose = 'sit';
      E.root.visible = true; E.swinging = false; E.seated = false; E.root.rotation.x = 0; E.pos.set(183.4, 0.34, 99.2); E.yaw = Math.PI; E.pose = 'sitfloor';
      pl.teleport(182, 0.34, 99.2, Math.PI); if (G.Mochi) { G.Mochi.f.root.visible = true; G.Mochi.place(183.2, 0.4, 100.4); G.Mochi.state = 'sleep'; G.Mochi.stateT = 999; }
      UI().fade(false);
      cut([181.6, 1.8, 95.2], [182, 0.8, 99.6], 0.1);
      await wait(1.2);
      await talk([['arlo', 'What have you got there, Milo?', 'surprised']]);
      a.pose = 'read'; await wait(0.8); game().take('treasure'); A.play('paper'); holdBox(true);
      cut([182.6, 1.45, 97.6], [181, 0.95, 99.6], 0.1);
      await talk([['arlo', 'That’s... that’s Juniper’s box. I made it for her. Out of an old cigar box. I was nine.', 'cry'], ['arlo', 'Her button collection. My marble! I KNEW she took my marble. And...', 'surprised']]);
      await talk([['arlo', '...her bell. Her little brass bell. I thought I’d lost it forever.', 'cry'], ['ellie', 'Grandpa? Are you crying?', 'sad'], ['arlo', 'Just a bit of hay in my eye, Ellie-belly. Happens on farms.', 'happy']]);
      a.pose = 'sit'; holdBox(false);
      cut([183.4, 1.35, 98.6], [181.4, 0.75, 99.5], 0.1);
      await talk([['arlo', 'Milo. Juniper would want this bell to go somewhere it can do some good.', 'happy']]);
      a.pose = 'reach'; await wait(0.8); A.play('bell'); a.pose = 'sit'; pl.act('shake', 0.8); await wait(0.9); pl.dance(1.4);
      await talk([['mum', 'Ha! Now we’ll always know where he is. Jingle jingle.', 'happy'], ['milo', 'It’s the most beautiful sound I’ve ever made.', 'happy']]);
      // harmonica, fireflies, the camera pulls back
      a.pose = 'think'; A.play('harmonica'); F.fireflies = 1;
      cut([183, 1.3, 94], [182.5, 1.1, 99.8], 0.1);
      await talk([['arlo', 'This one was Juniper’s favourite. I’d play it on this porch every night, and she’d fall asleep right... there.', 'happy']]);
      E.pose = 'sleepfloor'; pl.act('sleep', 30); await wait(2.6);
      shot([197, 6.5, 86], [183, 1.4, 100]); await wait(4.5);
      await talk([['milo', '*Home isn’t one place, I think. It’s wherever your people are. And tonight, my people are on a porch, listening to a harmonica, somewhere in the middle of nowhere.*', 'happy']]);
      await wait(1.4); UI().fade(true); await wait(1.2);
    });
    s.flags.arloDone = true; s.step = 'a_done'; F.fireflies = 0; g.giveCollectible && G.COLLECT.find((c) => c.id === 's_jbellFarm') && g.giveCollectible('s_jbellFarm');
    const el = document.getElementById('ending'); el.querySelector('.over').textContent = 'Bonus chapter III complete'; el.querySelector('h2').textContent = 'Grandpa Arlo’s Farm';
    el.querySelector('.story').textContent = 'Milo found three runaway eggs, one pair of glasses, and a secret fifty years in the making. Juniper’s bell jingles again, on a new ferret, on a porch full of people who love him. Grandpa Arlo says he’s coming to visit at Christmas. Milo is already planning where to hide the cookies.';
    UI().fade(false); UI().ending(game().stats());
    document.getElementById('endRoam').hidden = false;
    { const b = document.getElementById('endRoam'), o = b.onclick; b.onclick = () => { b.onclick = o; document.getElementById('ending').hidden = true; const g2 = game(); g2.cinematicEnd(); g2.busy = false; g2.state = 'play'; UI().showHUD && UI().showHUD(true); UI().updateObjective(true); g2.autosave && g2.autosave(); }; }
  }

  /* ------------------------------------------------------------ chapter state */
  function holdBox(on) {
    const a = F.arlo; if (!F.handBox) { F.handBox = G.makeItem('treasure'); F.handBox.scale.setScalar(2.2); F.handBox.position.set(0.03, -0.09, 0.06); a.arms[1].hand.add(F.handBox); }
    F.handBox.visible = on;
  }
  function placeFamily() {
    const E = C.ellie, Mm = C.mum; E.home = false; Mm.home = false;
    E.root.visible = true; E.swinging = true; E.seated = true; E.pose = 'sit'; E.path = [];
    Mm.root.visible = true; Mm.pos.set(187.3, 0.34, 100.3); Mm.yaw = Math.PI; Mm.pose = 'read'; Mm.path = [];
  }
  function applyFarm(cut) {
    const s = S(), on = s.chapter === 9, g = game();
    F.hens.forEach((h) => (h.m.visible = on));
    F.arlo.root.visible = on; if (!on) { F.arlo.chase = null; return; }
    if (C.car.userData.cutaway) C.car.userData.cutaway(false); C.car.visible = true; C.car.position.set(176.5, 0, 86.2); C.car.rotation.y = Math.PI / 2; C.car.userData.speed = 0; C.driver.root.visible = false; C.passenger.root.visible = false;
    if (F.denMound) { F.denMound.visible = !has('jdenOpen'); F.denHole.visible = has('jdenOpen'); }
    if (F.tbox) F.tbox.visible = !has('got_treasure') && s.step !== 'a_return' && s.step !== 'a_done';
    if (cut) return;
    F.arlo.pos.set(181, 0.34, 99.7); F.arlo.yaw = Math.PI + 0.3; F.arlo.pose = 'sit'; F.arlo.spot = 0; F.arlo.timer = 12; F.arlo.path = [];
    placeFamily();
    if (G.Mochi) { G.Mochi.f.root.visible = true; G.Mochi.place(183.2, 0.4, 100.4); G.Mochi.state = 'sleep'; G.Mochi.stateT = 1e9; }
  }
  // Grandpa's little routine
  const ROUTE = [
    { at: [181, 0.34, 99.7], yaw: Math.PI + 0.3, pose: 'sit', t: 22, via: [[184, 0, 96.8]] },
    { at: [163.5, 0, 104.5], yaw: -Math.PI / 2, pose: 'garden', t: 16, via: [[184, 0, 96.8], [176, 0, 95], [165.7, 0, 99.6]] },
    { at: [166, 0, 86.5], yaw: Math.PI, pose: 'cook', t: 12, via: [[165.7, 0, 99.6], [166.7, 0, 83.8]] },
    { at: [194, 0, 88], yaw: Math.PI / 2, pose: 'think', t: 10, via: [[166.7, 0, 83.8], [176, 0, 90]] },
  ];
  function arloTick(dt) {
    const a = F.arlo, g = game();
    if (!a.root.visible) return;
    a.update(dt, { lookY: a.lookY, talking: UI().dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === 'arlo' });
    // rocking chair follows its sitter
    const rocking = a.pose === 'sit' && a.pos.distanceTo(F.rocker.position) < 0.3 && !a.path.length;
    F.rocker.rotation.x = rocking ? Math.sin(g.t * 1.6) * 0.09 : U.damp(F.rocker.rotation.x, 0, 4, dt); if (rocking) { a.root.rotation.x = F.rocker.rotation.x; a.root.position.y = 0.34 + Math.abs(F.rocker.rotation.x) * 0.2; if (Math.random() < dt * 0.3) A.play('push', 0.15); } else a.root.rotation.x = 0;
    if (G.SEQ.running || a.chase) return;
    if (a.talkLock > 0) { a.talkLock -= dt; a.speed = U.damp(a.speed, 0, 8, dt); if (UI().dialogueOpen) a.talkLock = Math.max(a.talkLock, 0.5); return; }
    if (S().step !== 'a_tasks' && S().step !== 'a_den' && S().step !== 'a_denIn' && S().step !== 'a_done') return;
    const sp = ROUTE[a.spot || 0];
    if (a.path.length) { a.pose = 'idle'; a.seated = false; if (K.followPath(a, dt, 1.2)) { a.pos.set(...sp.at); } a.pos.y = 0; }
    else { a.speed = U.damp(a.speed, 0, 8, dt); a.yaw = U.dampAngle(a.yaw, sp.yaw, 4, dt); a.pose = sp.pose; a.pos.y = sp.at[1]; a.timer = (a.timer || sp.t) - dt; if (a.pose === 'cook' && Math.random() < dt * 2) g.particles.emit({ x: a.pos.x + (Math.random() - 0.5), y: 0.9, z: a.pos.z - 0.6, vx: 0, vy: -0.5, vz: 0, life: 1, size: 0.03, col: 0xe8c86a, grav: 3 });
      if (a.timer <= 0) { const n = ((a.spot || 0) + 1) % ROUTE.length; const nx = ROUTE[n]; a.spot = n; a.timer = nx.t; a.path = nx.via.map((p) => [p[0], 0, p[2]]).concat([[nx.at[0], 0, nx.at[2]]]); a.pos.y = 0; } }
  }
  function familyTick(dt) {
    const E = C.ellie, Mm = C.mum, g = game();
    if (E.swinging && E.root.visible && !G.SEQ.running) {
      const ang = Math.sin(g.t * 1.5) * 0.45; F.swing.rotation.x = ang;
      const L = 3.05; E.pos.set(F.swing.position.x, F.swing.position.y - Math.cos(ang) * L - 0.3, F.swing.position.z + Math.sin(ang) * L); E.pos.y = Math.max(0.05, E.pos.y); E.yaw = 0; E.seated = true; if (E.pose !== 'cheer') E.pose = 'sit';
      E.root.position.copy(E.pos); E.root.rotation.x = ang;
    } else if (F.swing) F.swing.rotation.x = U.damp(F.swing.rotation.x, 0, 1, dt);
    if (Mm.root.visible && !G.SEQ.running && inFarm()) { Mm.pos.set(187.3, 0.34, 100.3); Mm.yaw = Math.PI; Mm.pose = Mm.pose === 'read' || Mm.pose === 'sit' ? Mm.pose : 'read'; }
  }
  function hensTick(dt) {
    const g = game(), pl = g.player; let near = null, nd = 1.4;
    for (const h of F.hens) {
      if (!h.m.visible) continue; const m = h.m, u = m.userData; h.t -= dt;
      let sp = 0;
      if (h.flee > 0) { h.flee -= dt; const l = Math.hypot(h.fx, h.fz) || 1; h.tx = m.position.x + (h.fx / l) * 3; h.tz = m.position.z + (h.fz / l) * 3; sp = 2.6; u.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.3 + Math.abs(Math.sin(g.t * 30)) * 0.9))); m.position.y = Math.abs(Math.sin(g.t * 9)) * 0.15; }
      else { u.wings.forEach((w) => (w.rotation.z = U.damp(w.rotation.z, 0, 8, dt))); m.position.y = 0; if (h.t <= 0) { h.t = 2 + Math.random() * 4; if (Math.random() < 0.6) { h.tx = U.clamp(h.x + (Math.random() - 0.5) * 6, 158, 214); h.tz = U.clamp(h.z + (Math.random() - 0.5) * 6, 64, 130); } else h.peck = 1.5; } }
      const dx = h.tx - m.position.x, dz = h.tz - m.position.z, l = Math.hypot(dx, dz);
      if (l > 0.1 && h.peck <= 0) { sp = sp || 0.7; const st = Math.min(l, sp * dt); m.position.x += (dx / l) * st; m.position.z += (dz / l) * st; h.yaw = U.dampAngle(h.yaw, Math.atan2(dx, dz), 8, dt); u.legs.forEach((lg, i) => (lg.rotation.x = Math.sin(g.t * 16 + i * Math.PI) * 0.6)); u.hd.position.z = 0.14 + Math.sin(g.t * 16) * 0.03; }
      else { h.peck -= dt; u.hd.rotation.x = h.peck > 0 ? Math.max(0, Math.sin(g.t * 9)) * 1.1 : 0; }
      m.rotation.y = h.yaw;
      const d = Math.hypot(pl.pos.x - m.position.x, pl.pos.z - m.position.z); if (d < nd && h.flee <= 0) { nd = d; near = h; }
      if (Math.random() < dt * 0.04 && d < 14) A.play('cluck', 0.5);
    }
    F.henNear = near; const it = G.INTERACT.find((i) => i.id === 'a_hen'); if (it) { if (near) { it.pos[0] = near.m.position.x; it.pos[1] = 0; it.pos[2] = near.m.position.z; } else it.pos[1] = -999; }
  }

  /* ------------------------------------------------------------ sounds */
  const oPlay = A.play.bind(A);
  A.play = function (name, v = 1) {
    if (!A.ready) return;
    if (name === 'cluck') { for (let i = 0; i < 3; i++) A.tone({ f: 520 + Math.random() * 80, f2: 360, type: 'square', dur: 0.07, vol: 0.025 * v, lp: 1800, delay: i * 0.11 }); return; }
    if (name === 'rooster') { A.tone({ f: 500, f2: 700, type: 'sawtooth', dur: 0.25, vol: 0.03 * v, lp: 1600 }); A.tone({ f: 700, f2: 900, type: 'sawtooth', dur: 0.2, vol: 0.03 * v, lp: 1600, delay: 0.27 }); A.tone({ f: 900, f2: 520, type: 'sawtooth', dur: 0.7, vol: 0.03 * v, lp: 1600, delay: 0.5 }); return; }
    if (name === 'harmonica') { const notes = [392, 440, 494, 587, 494, 440, 392, 330, 392, 440, 392, 294, 330, 392]; notes.forEach((f, i) => { A.tone({ f, type: 'sawtooth', dur: 0.42, vol: 0.022, lp: 1400, a: 0.06, delay: i * 0.46, verb: 0.3 }); A.tone({ f: f * 1.005, type: 'square', dur: 0.42, vol: 0.012, lp: 1200, a: 0.06, delay: i * 0.46 }); }); return; }
    if (name === 'bell' && !oPlay.hasBell) { A.tone({ f: 1320, type: 'sine', dur: 1.2, vol: 0.06 * v, verb: 0.4 }); A.tone({ f: 1980, type: 'sine', dur: 0.8, vol: 0.03 * v }); return; }
    return oPlay(name, v);
  };

  /* ------------------------------------------------------------ hooks */
  G.ArloFarm = {
    begin: async () => { const s = S(); if (![7, 8, 9].includes(s.chapter)) { s.prevChapter = s.chapter; s.farmPrevStep = s.step; } s.prevChapter = s.prevChapter || 6; s.chapter = 9; s.step = 'a_arrive'; s.flags.farmVisited = true; game().placeNPCs && game().placeNPCs(); await arrival(); },
  };
  const oInit = EXT.init, oUpd = EXT.update, oApply = EXT.applyState;
  EXT.init = function (g) { oInit(g); F.init(g); };
  EXT.applyState = function (g0) { oApply(g0); const g = game(); if (F.arlo) applyFarm(false); const s = S(); if (s.chapter === 9 && s.step === 'a_arrive' && g.state === 'play' && !G.SEQ.running) setTimeout(() => arrival(), 300); };
  EXT.update = function (dt, st) {
    oUpd(dt, st);
    const g = game(); if (!F.arlo || !inFarm()) { if (F.arlo && F.arlo.root.visible && !G.SEQ.running) F.arlo.root.visible = false; return; }
    arloTick(dt); familyTick(dt); hensTick(dt);
    if (F.windmill) F.windmill.rotation.z += dt * 1.4;
    if (F.bellT > 0) { F.bellT -= dt; F.bell.rotation.z = Math.sin(g.t * 14) * 0.5 * F.bellT / 2; }
    F.itArlo.pos[0] = F.arlo.pos.x; F.itArlo.pos[1] = F.arlo.root.visible ? 0 : -999; F.itArlo.pos[2] = F.arlo.pos.z;
    F.itEllie.pos[0] = 203.6; F.itEllie.pos[1] = C.ellie.root.visible ? 0 : -999; F.itEllie.pos[2] = 111.2;
    if (S().step === 'a_tasks') { const t = taskText(); if (G.STEPS.a_tasks.text !== t) { G.STEPS.a_tasks.text = t; UI().updateObjective(false); } }
    if (F.fireflies && Math.random() < dt * 8) g.particles.emit({ x: 176 + Math.random() * 16, y: 0.5 + Math.random() * 1.5, z: 92 + Math.random() * 8, vx: 0, vy: 0.05, vz: 0, life: 3, size: 0.05, col: 0xfff27a, glow: true, wander: 0.4 });
    if (Math.random() < dt * 0.01) A.play('rooster', 0.6);
  };
  // journal entry
  const oPanel = EXT.panels.quests;
  EXT.panels.quests = function () { oPanel(); const s = S(); if (!s.flags.farmVisited) return; const box = document.getElementById('questBody'); const d = document.createElement('div'); const st = G.STEPS[s.step]; d.innerHTML = `<h3>Bonus chapter III</h3><div class="qlist"><div class="q ${s.flags.arloDone ? 'done' : 'active'}"><i></i><div><b>Grandpa Arlo’s Farm</b><small>${s.flags.arloDone ? 'Juniper’s bell jingles again.' : s.chapter === 9 && st ? (typeof st.text === 'function' ? st.text() : st.text) : 'Waiting at Pinewood Farm.'}</small></div></div></div>`; box.appendChild(d); };
})();
