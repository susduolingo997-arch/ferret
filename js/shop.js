/* =====================================================================
   shop.js - Pemberton's Corner Shop reopens.
   When the new town first opens up, the shop on Maple Street is closed
   for a makeover: boarded windows, scaffolding, dust sheets and a sign.
   Mr Pemberton needs three small jobs done (find the shop bell, clear a
   pigeon out of the stockroom, take the ribbon to Ellie), then the whole
   neighbourhood turns out one morning for the grand reopening.
   Afterwards the shop is a real interior: shelves, a sweet counter, an
   ice-lolly freezer, a cafe corner, a cat bed, a stockroom, a hiding spot
   under the counter and a trapdoor down to a forgotten cellar.
   The old solid shop block is swapped for a hollow building while the
   world is built (before static meshes are merged); the admin cabinet in
   the alley is untouched.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, R = G.Regions, NPC = G.NPC, SQ = G.SQ, EXT = G.EXT, T = G.Town;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI, C = () => G.Cast, K = () => G.Kit;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const has = (k) => !!(G.game && G.game.S.flags[k]);
  const item = (id) => G.game.hasItem(id);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const add = (o) => G.INTERACT.push(o);
  const award = (id) => G.Extras && G.Extras.award && G.Extras.award(id);
  const hour = () => (G.game ? G.game.S.time || 12 : 12);

  /* ---- save data: s.shop always has defaults (old saves have none) */
  const sh = () => { const s = S(); if (!s.shop || typeof s.shop !== 'object') s.shop = {}; const o = s.shop; o.stage = o.stage || 'reno'; return o; };
  const townOpen = () => T && T.open && T.open();
  /* the makeover starts when the town content first opens; before that the
     shop looks exactly as it always did */
  const stage = () => (townOpen() || sh().stage === 'open' ? sh().stage : 'old');
  const isOpen = () => sh().stage === 'open';
  const openHours = () => hour() >= 7 && hour() < 20;

  const SHOP = (G.Shop = { x0: 46, x1: 60, z0: -4, z1: 8, doorX: 53, parts: {} });
  const P = SHOP.parts;

  /* ================================================================ BUILDING */
  const oBuild = EXT.buildWorld;
  EXT.buildWorld = function (Wd) {
    oBuild(Wd);
    const H = W.h, root = W.root;
    /* ---- take out the old solid block, its collider and the fixed door */
    const kill = [];
    root.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.parameters && Math.abs(o.position.x - 53) < 0.01 && Math.abs(o.position.z - 2) < 0.01) {
        const p = o.geometry.parameters; if (p.width === 14 && p.height === 3.4 && p.depth === 12) kill.push(o);
      }
      if (o.isGroup && Math.abs(o.position.x - 53) < 0.01 && Math.abs(o.position.z - 8.04) < 0.01 && o.parent === root) kill.push(o);
    });
    for (const o of kill) o.parent.remove(o);
    for (const c of W.colliders) if (c.x0 === 46 && c.x1 === 60 && c.z0 === -4 && c.z1 === 8) c.on = false;
    SHOP.swapped = kill.length;

    /* ---- the shell: brick walls with a door, two shop windows and a back door */
    const brick = M.get('brick'), plaster = M.std('shopPlaster', { map: 'plaster', color: 0xf3e6cc, rough: 0.95 });
    const Hh = 3.4, x0 = 46, x1 = 60, z0 = -4, z1 = 8;
    // front wall, built round the door (x 52.4-53.6) and the two windows (y 0.7-2.5)
    const fw = (xa, xb, ya, yb) => { if (xb - xa < 0.01 || yb - ya < 0.01) return; H.box({ w: xb - xa, h: yb - ya, d: 0.2, x: (xa + xb) / 2, y: ya, z: z1 - 0.1, mat: brick, s: 1.6 }); };
    fw(x0, 47.3, 0, Hh); fw(50.7, 52.4, 0, Hh); fw(53.6, 55.3, 0, Hh); fw(58.7, x1, 0, Hh);
    for (const [a, b] of [[47.3, 50.7], [55.3, 58.7]]) { fw(a, b, 0, 0.7); fw(a, b, 2.5, Hh); W.collider(a, b, z1 - 0.1, z1 + 0.05, 0.7, 2.5, { cam: false }); } // the old glass stays; this makes it solid
    fw(52.4, 53.6, 2.2, Hh);
    // side and back walls; the stockroom door opens onto the alley (east wall, z -1.3 to -0.1)
    H.wall(x0, z0, x0, z1, Hh, 0.2, brick, plaster, [], { s: 1.6, edge: brick });
    H.wall(x1, z0, x1, z1, Hh, 0.2, plaster, brick, [[-1.3, -0.1, 2.1]], { s: 1.6, edge: brick });
    H.wall(x0, z0, x1, z0, Hh, 0.2, plaster, brick, [], { s: 1.6, edge: brick });
    // inside: floor, ceiling, the partition between shop and stockroom
    H.plane(x0 + 0.1, x1 - 0.1, z0 + 0.1, z1 - 0.1, 0.02, 'planks', 1.6);
    const ceil = H.plane(x0, x1, z0, z1, Hh - 0.02, plaster, 2.4); ceil.rotation.x = Math.PI; ceil.position.y = Hh - 0.02;
    H.wall(x0, 1, x1, 1, Hh, 0.16, plaster, plaster, [[49.4, 50.6, 2.1]], { s: 1.8, edge: 'basewood' });
    H.light(53, 3.0, 4.6, 0xfff0d0, 1.2, 9, {}); H.light(52, 3.0, -1.6, 0xffe8c0, 0.7, 6, {});
    W.areas.unshift(Object.assign({ id: 'shopStock', name: 'The Stockroom', x0: 46, x1: 60, z0: -4, z1: 1 }, { indoor: true, zone: 'house', surf: 'wood', dim: 0.4 }));
    W.areas.unshift(Object.assign({ id: 'shopIn', name: "Inside Pemberton's", x0: 46, x1: 60, z0: 1, z1: 8 }, { indoor: true, zone: 'house', surf: 'wood' }));

    /* ---- doors that change with the story: front, stockroom and back */
    const mkDoor = (x, z, ry, w, col, name) => {
      const g = new THREE.Group(); g.position.set(x - w / 2, 0, z); g.rotation.y = ry; root.add(g); g.userData.dynamic = true;
      const d = new THREE.Mesh(new THREE.BoxGeometry(w, 2.15, 0.06), M.std(name + 'Door', { color: col, rough: 0.5, map: 'paintwood' })); d.position.set(w / 2, 1.075, 0); d.castShadow = true; d.userData.dynamic = true; g.add(d);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.get('brass')); knob.position.set(w - 0.12, 1.0, 0.05); knob.userData.dynamic = true; g.add(knob);
      return g;
    };
    P.front = mkDoor(53, 8.02, 0, 1.2, 0x2f5d4a, 'shopFront');
    P.frontCol = W.collider(52.4, 53.6, 7.9, 8.1, 0, 2.2, { cam: false, name: 'shopFrontDoor' });
    P.stock = mkDoor(50, 1, 0, 1.2, 0x8a6a4a, 'shopStock');
    P.stockCol = W.collider(49.4, 50.6, 0.9, 1.1, 0, 2.1, { cam: false, name: 'shopStockDoor' });
    P.backCol = W.collider(59.9, 60.1, -1.3, -0.1, 0, 2.1, { cam: false, name: 'shopBackDoor' });
    P.back = mkDoor(0, 0, 0, 1.2, 0x5a4a3a, 'shopBack'); P.back.position.set(60.02, 0, -1.3); P.back.rotation.y = -Math.PI / 2;

    /* ---- the shop floor */
    const shelfM = M.std('shopShelf', { color: 0xc9a06a, rough: 0.7, map: 'planks' });
    const goods = [0xd9573b, 0xf2c14e, 0x3f8a74, 0x3f6fa0, 0xe8e4d8, 0x9a5ab0, 0xe07a3a];
    const shelfUnit = (x, z, w, d, ry) => {
      H.box({ w, h: 1.9, d: 0.06, x, y: 0, z: z - (ry ? 0 : d / 2), mat: shelfM, col: false, ry });
      for (let i = 0; i < 4; i++) {
        H.box({ w, h: 0.04, d, x, y: 0.2 + i * 0.48, z, mat: shelfM, col: false, ry });
        for (let k = 0; k < Math.floor(w / 0.24); k++) {
          const off = -w / 2 + 0.14 + k * 0.24, gx = ry ? x : x + off, gz = ry ? z + off : z;
          const h = 0.14 + ((k * 7 + i * 3) % 5) * 0.03;
          H.box({ w: 0.16, h, d: 0.14, x: gx, y: 0.24 + i * 0.48, z: gz, mat: M.std('goods' + ((k + i) % goods.length), { color: goods[(k + i) % goods.length], rough: 0.5 }), col: false });
        }
      }
      if (ry) W.collider(x - d / 2, x + d / 2, z - w / 2, z + w / 2, 0, 1.9, { cam: false }); else W.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 1.9, { cam: false });
    };
    shelfUnit(46.5, 3.8, 3.6, 0.6, Math.PI / 2);     // along the west wall
    shelfUnit(52.6, 1.5, 3.0, 0.6, 0);               // against the partition
    // the sweet counter, with jars along the top, the till, the cheese samples, and a cubby underneath
    const cM = M.std('counterWood', { color: 0x6a4a2e, rough: 0.55, map: 'planks' });
    H.box({ w: 3.6, h: 0.08, d: 0.8, x: 56.8, y: 0.9, z: 3.4, mat: cM, col: false });
    H.box({ w: 3.6, h: 0.44, d: 0.05, x: 56.8, y: 0.46, z: 3.8, mat: cM, col: false });  // front panel above the gap
    H.box({ w: 3.6, h: 0.05, d: 0.78, x: 56.8, y: 0.40, z: 3.4, mat: cM, col: false });  // the low shelf (the hiding cubby is beneath)
    W.collider(55, 58.6, 3.0, 3.8, 0.4, 0.98, { cam: false, name: 'shopCounter' });
    for (let i = 0; i < 7; i++) {
      const jx = 55.3 + i * 0.5, c = [0xd9412f, 0xf2d24b, 0x6ab04a, 0xe7a0b0, 0x3f8ad0, 0xf0a030, 0xb05ad0][i];
      H.cyl({ r: 0.11, h: 0.3, x: jx, y: 0.98, z: 3.2, mat: M.std('sweetJar', { color: 0xdfeef0, rough: 0.05, transparent: true, opacity: 0.4, envI: 1.4 }), col: false, seg: 12 });
      for (let k = 0; k < 5; k++) H.sph({ x: jx + (k % 2 - 0.5) * 0.08, y: 1.04 + k * 0.04, z: 3.2 + (k % 3 - 1) * 0.05, r: 0.035, mat: M.std('sweet' + i, { color: c, rough: 0.3 }), cast: false });
      H.cyl({ r: 0.07, h: 0.05, x: jx, y: 1.28, z: 3.2, mat: 'brass', col: false, seg: 10 });
    }
    H.box({ w: 0.44, h: 0.3, d: 0.36, x: 58.2, y: 0.98, z: 3.5, mat: 'darkmetal', col: false });  // the till
    P.cheese = new THREE.Group(); P.cheese.position.set(55.5, 0.98, 3.6); root.add(P.cheese); P.cheese.userData.dynamic = true;
    { const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.02, 16), M.get('ceramic')); plate.userData.dynamic = true; P.cheese.add(plate);
      for (let k = 0; k < 6; k++) { const cb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), M.std('cheeseCube', { color: 0xf2c84e, rough: 0.6 })); cb.position.set(Math.cos(k) * 0.08, 0.03, Math.sin(k) * 0.08); cb.userData.dynamic = true; P.cheese.add(cb); }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshStandardMaterial({ map: G.Tex.make('freeSample', 64, 32, (c2) => { c2.fillStyle = '#f6f2ea'; c2.fillRect(0, 0, 64, 32); c2.fillStyle = '#c0392b'; c2.font = 'bold 12px Georgia'; c2.textAlign = 'center'; c2.fillText('FREE', 32, 14); c2.fillText('SAMPLE', 32, 27); }) }));
      flag.position.set(0, 0.12, 0.05); flag.userData.dynamic = true; P.cheese.add(flag); }
    // the ice-lolly freezer
    H.box({ w: 1.1, h: 0.86, d: 1.6, x: 59.2, y: 0, z: 6.4, mat: M.std('freezer', { color: 0xf2f4f6, rough: 0.3 }) });
    H.box({ w: 1.0, h: 0.03, d: 1.5, x: 59.2, y: 0.86, z: 6.4, mat: M.std('freezerLid', { color: 0xbfe0f0, rough: 0.05, transparent: true, opacity: 0.45, emissive: 0x6ab0d0, ei: 0.25 }), col: false });
    for (let k = 0; k < 8; k++) H.box({ w: 0.05, h: 0.14, d: 0.03, x: 58.9 + (k % 2) * 0.5, y: 0.7, z: 5.9 + Math.floor(k / 2) * 0.3, mat: M.std('lolly' + (k % 4), { color: [0xd9412f, 0xf2c14e, 0x6ab04a, 0xe07aa0][k % 4], rough: 0.3 }), col: false });
    // the cafe corner: a round table and two chairs by the window
    H.cyl({ r: 0.05, h: 0.7, x: 47.6, z: 6.6, mat: 'darkmetal', col: true });
    H.cyl({ r: 0.45, h: 0.04, x: 47.6, y: 0.7, z: 6.6, mat: M.std('cafeTop', { color: 0xf2ebe0, rough: 0.4 }), col: false, seg: 20 });
    W.collider(47.15, 48.05, 6.15, 7.05, 0.6, 0.74, { climb: true, cam: false });
    for (const [cx, cz] of [[47.6, 5.7], [48.5, 6.6]]) { H.box({ w: 0.36, h: 0.04, d: 0.36, x: cx, y: 0.42, z: cz, mat: M.std('cafeSeat', { color: 0x3f8a74, rough: 0.5 }), climb: true, colY0: -0.42 }); for (const d2 of [-0.14, 0.14]) H.cyl({ r: 0.02, h: 0.42, x: cx + d2, z: cz, mat: 'darkmetal', col: false }); }
    H.cyl({ r: 0.06, h: 0.1, x: 47.5, y: 0.74, z: 6.5, mat: 'ceramic', col: false });
    // the neighbours' noticeboard on the partition
    { const tex = G.Tex.make('shopNotes', 384, 256, (c2, w, h) => {
        c2.fillStyle = '#b08a5a'; c2.fillRect(0, 0, w, h); c2.strokeStyle = '#5a3a1a'; c2.lineWidth = 10; c2.strokeRect(5, 5, w - 10, h - 10);
        const notes = [['LOST: one cushion', 'velvet, gold tassel', '(found - Duchess)', '#f6f2ea'], ['Piano lessons', 'ask at No. 3', '', '#f2e6a0'], ['Allotment swap:', 'beans for eggs', '- Mr Okafor', '#d8ecd0'], ['Has anyone seen', 'my nuts?', '- R.', '#f6d8d0'], ['Summer fair', 'in the Square!', '', '#d0e0f6']];
        notes.forEach(([a, b, c3, bg], i) => { const x = 20 + (i % 3) * 118, y = 22 + Math.floor(i / 3) * 116; c2.save(); c2.translate(x + 50, y + 45); c2.rotate((i % 2 ? 1 : -1) * 0.05); c2.fillStyle = bg; c2.fillRect(-50, -45, 104, 92); c2.fillStyle = '#2a1d15'; c2.font = '15px Georgia'; c2.textAlign = 'center'; c2.fillText(a, 2, -15); c2.fillText(b, 2, 5); c2.fillText(c3, 2, 25); c2.fillStyle = '#c0392b'; c2.beginPath(); c2.arc(2, -40, 5, 0, 7); c2.fill(); c2.restore(); });
      });
      const nb = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      nb.position.set(57.2, 1.6, 1.1); root.add(nb); }
    // the cat bed by the window (Tilly's, from the day the shop reopens)
    { const bed = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 8, 20), M.std('catBed', { color: 0xc0392b, rough: 0.9, map: 'fabric' }));
      bed.rotation.x = Math.PI / 2; bed.position.set(50.2, 0.1, 7.2); bed.castShadow = true; root.add(bed);
      H.disc(50.2, 7.2, 0.26, 0.06, M.std('catBedIn', { color: 0xf2e6cc, rough: 0.95, map: 'fabric' }), 0.6);
      SHOP.catBed = [50.2, 0.12, 7.2]; }
    // the shop bell over the door (hidden until it is found)
    P.bell = new THREE.Group(); P.bell.position.set(53, 2.28, 7.7); root.add(P.bell); P.bell.userData.dynamic = true;
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.12, 12, 1, true), M.get('brass')); b.userData.dynamic = true; P.bell.add(b); const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), M.get('darkmetal')); sp.position.y = 0.12; sp.userData.dynamic = true; P.bell.add(sp); }

    /* ---- the stockroom: crates, boxes, a mop, and the trapdoor */
    for (const [cx, cz, n] of [[47.2, -3.2, 3], [48.2, -3.2, 2], [54.4, -3.1, 3], [55.4, -3.1, 2], [59.2, -2.6, 1]])
      for (let i = 0; i < n; i++) H.box({ w: 0.62, h: 0.44, d: 0.56, x: cx + (i % 2) * 0.05, y: i * 0.44, z: cz, mat: M.std('crate', { color: 0xb08a5a, rough: 0.9, map: 'shedwood' }), climb: true, colY0: i ? -i * 0.44 : 0 });
    for (let i = 0; i < 6; i++) H.box({ w: 0.36, h: 0.26, d: 0.3, x: 51.2 + i * 0.4, y: 0, z: -3.6, mat: 'cardboard', col: i % 2 === 0 });
    H.cyl({ r: 0.2, h: 0.3, x: 58.8, z: 0.4, mat: M.std('mopBucket', { color: 0xd9a030, rough: 0.5 }), col: true });
    H.cyl({ r: 0.02, h: 1.4, x: 58.8, y: 0.3, z: 0.4, mat: 'midwood', col: false, rz: 0.2 });
    // the trapdoor (the secret way down to the cellar)
    P.trap = new THREE.Group(); P.trap.position.set(48.6, 0.03, -1.6); root.add(P.trap); P.trap.userData.dynamic = true;
    { const t = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.7), M.std('trapdoor', { color: 0x5a3a24, rough: 0.8, map: 'planks' })); t.userData.dynamic = true; P.trap.add(t);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12), M.get('darkmetal')); ring.rotation.x = Math.PI / 2; ring.position.set(0.3, 0.03, 0); ring.userData.dynamic = true; P.trap.add(ring); }

    /* ---- the makeover: boards, scaffolding, dust sheets, the sign */
    P.reno = new THREE.Group(); root.add(P.reno); P.reno.userData.dynamic = true;
    { const g = P.reno, plank = M.std('renoPlank', { color: 0xb89a6a, rough: 0.9, map: 'shedwood' });
      const addM = (m) => { m.castShadow = true; m.userData.dynamic = true; g.add(m); return m; };
      for (const wx of [49, 57]) for (let i = 0; i < 4; i++) { const b = addM(new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 0.05), plank)); b.position.set(wx, 0.95 + i * 0.44, 8.16); b.rotation.z = (i % 2 ? 1 : -1) * 0.03; }
      for (let i = 0; i < 3; i++) { const b = addM(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.05), plank)); b.position.set(53, 0.6 + i * 0.6, 8.2); b.rotation.z = (i - 1) * 0.12; }
      // the sign on the boards over the door
      const tex = G.Tex.make('renoSign', 512, 192, (c2, w, h) => { c2.fillStyle = '#f2e6c0'; c2.fillRect(0, 0, w, h); c2.strokeStyle = '#c0392b'; c2.lineWidth = 10; c2.strokeRect(6, 6, w - 12, h - 12); c2.fillStyle = '#c0392b'; c2.textAlign = 'center'; c2.font = 'bold 40px Georgia'; c2.fillText('CLOSED FOR', w / 2, 58); c2.fillText('RENOVATION', w / 2, 102); c2.fillStyle = '#2f5d4a'; c2.font = 'bold italic 28px Georgia'; c2.fillText('– GRAND REOPENING SOON! –', w / 2, 152); });
      const s1 = addM(new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }))); s1.position.set(53, 1.9, 8.26);
      // scaffolding: poles, ledgers and a plank walkway in front of the shop
      const pole = M.std('scaffold', { color: 0x9aa0a8, rough: 0.35, metal: 0.7 });
      for (const px of [46.4, 50.2, 55.8, 59.6]) for (const pz of [8.6, 10.1]) { const p = addM(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.6, 8), pole)); p.position.set(px, 1.8, pz); }
      for (const y of [1.6, 3.2]) for (const pz of [8.6, 10.1]) { const r = addM(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 13.2, 6), pole)); r.rotation.z = Math.PI / 2; r.position.set(53, y, pz); }
      for (const y of [1.6, 3.2]) { const w2 = addM(new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.05, 1.5), plank)); w2.position.set(53, y + 0.04, 9.35); }
      // dust sheets over the awning and on the pavement
      const dust = M.std('dustsheet2', { color: 0xe8e2d4, rough: 1, map: 'fabric', side: THREE.DoubleSide });
      const ds = addM(new THREE.Mesh(new THREE.PlaneGeometry(14.2, 2.4, 12, 3), dust)); ds.rotation.x = -Math.PI / 2 + 0.28; ds.position.set(53, 2.82, 9.05);
      const pa = ds.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, pa.getZ(i) + Math.sin(pa.getX(i) * 1.7) * 0.06); ds.geometry.computeVertexNormals();
      const floor = addM(new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6), dust)); floor.rotation.x = -Math.PI / 2; floor.position.set(55.4, 0.03, 10.6);
      // paint tins and a roller tray
      for (let i = 0; i < 4; i++) { const t = addM(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), M.std('tin' + i, { color: [0x2f5d4a, 0xf3e6cc, 0xd4a347, 0x2f5d4a][i], rough: 0.4, metal: 0.4 }))); t.position.set(54.6 + i * 0.3, 0.1, 10.4 + (i % 2) * 0.2); }
      const tray = addM(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.5), M.std('tray', { color: 0x2f5d4a, rough: 0.4 }))); tray.position.set(56.2, 0.05, 10.9);
      P.renoCols = [W.collider(46.3, 59.7, 8.55, 8.65, 0, 0.12, { cam: false })]; }

    /* ---- the party: bunting, balloons and a red ribbon across the door */
    P.party = new THREE.Group(); root.add(P.party); P.party.userData.dynamic = true;
    { const g = P.party;
      const cols = [0xd9412f, 0xf2c14e, 0x3f8ad0, 0x6ab04a, 0xe7a0b0, 0xf6f2ea];
      const bunting = (ax, ay, az, bx, by, bz, n) => {
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, sag = Math.sin(t * Math.PI) * 0.5;
          const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 3), M.std('flag' + (i % cols.length), { color: cols[i % cols.length], rough: 0.8, side: THREE.DoubleSide }));
          f.rotation.x = Math.PI; f.position.set(U.lerp(ax, bx, t), U.lerp(ay, by, t) - sag - 0.12, U.lerp(az, bz, t)); f.userData.dynamic = true; f.castShadow = true; g.add(f); }
        const len = Math.hypot(bx - ax, by - ay, bz - az);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 4), M.color(0xf6f2ea)); line.position.set((ax + bx) / 2, (ay + by) / 2 - 0.3, (az + bz) / 2); line.lookAt(bx, by - 0.3, bz); line.rotateX(Math.PI / 2); line.userData.dynamic = true; g.add(line);
      };
      bunting(46.2, 3.3, 8.3, 53, 3.3, 8.3, 11); bunting(53, 3.3, 8.3, 59.8, 3.3, 8.3, 11);
      bunting(46.2, 3.3, 8.3, 44.6, 3.5, 13.8, 7); bunting(59.8, 3.3, 8.3, 61.6, 3.5, 13.8, 7);
      P.balloons = [];
      for (const [bx, bz] of [[51.6, 8.7], [54.4, 8.7]]) for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M.std('balloon' + i, { color: cols[i], rough: 0.25, envI: 1.2 }));
        b.scale.y = 1.15; const home = V3(bx + Math.cos(i * 1.3) * 0.25, 2.2 + (i % 3) * 0.28, bz + Math.sin(i * 1.3) * 0.12); b.position.copy(home); b.userData.dynamic = true; b.castShadow = true; g.add(b);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, home.y - 1.0, 3), M.color(0xf6f2ea)); str.position.set(bx, (home.y + 1.0) / 2, bz); str.userData.dynamic = true; g.add(str);
        P.balloons.push({ m: b, home, str });
      }
      P.ribbon = new THREE.Group(); g.add(P.ribbon); P.ribbon.userData.dynamic = true;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.02), M.std('redRibbon', { color: 0xc0182a, rough: 0.5 })); rib.position.set(53, 1.05, 8.34); rib.userData.dynamic = true; P.ribbon.add(rib);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), M.std('redRibbon', { color: 0xc0182a, rough: 0.5 })); bow.position.set(53, 1.05, 8.36); bow.scale.x = 1.6; bow.userData.dynamic = true; P.ribbon.add(bow);
    }
    // a lamp post by the shop for Pip to sit on, and a bit of hedge for Moss and Hazel to peek out of
    if (T && T.lamp) T.lamp(H, 44.6, 12.6, { climb: true });
    for (const [bx, bz] of [[41.2, 12.2], [42.1, 12.8], [40.4, 12.9]]) W.bushes.push([bx, 0.5, bz, 0.8, 0x4d6e36]);
  };

  /* ================================================================ THE SECRET CELLAR (underground layer) */
  R.def({
    id: 'shopcellar', ug: true, name: 'The Old Cellar', bounds: [202, 216, 44, 56],
    openUG: [[204, 214, 46, 54]],
    areas: [['shopCellar', 'The Old Cellar', 204, 214, 46, 54, { ug: true, zone: 'under', surf: 'stone', dark: true }]],
    build(ctx) {
      const { H } = ctx;
      R.room(ctx, 204, 214, 46, 54, UG, 2.4, M.std('cellarWall', { map: 'stonewall', color: 0x8a8274, rough: 1 }), M.std('cellarWall', { map: 'stonewall', color: 0x8a8274, rough: 1 }), { floor: 'stone', ceil: 'planks', noCeilCol: false });
      // shelves of dusty jars, an old enamel sign and a stack of tins
      for (let i = 0; i < 3; i++) { H.box({ w: 3.2, h: 0.05, d: 0.5, x: 207, y: UG + 0.4 + i * 0.55, z: 46.4, mat: 'darkwood', col: false });
        for (let k = 0; k < 8; k++) H.cyl({ r: 0.08, h: 0.2, x: 205.7 + k * 0.38, y: UG + 0.45 + i * 0.55, z: 46.4, mat: M.std('dustyJar', { color: 0xc8b890, rough: 0.3, transparent: true, opacity: 0.6 }), col: false, seg: 10 }); }
      W.collider(205.3, 208.7, 46, 46.8, UG, UG + 1.6, { cam: false });
      const tex = G.Tex.make('oldEnamel', 256, 128, (c2, w, h) => { c2.fillStyle = '#2f5d4a'; c2.fillRect(0, 0, w, h); c2.strokeStyle = '#f3e6cc'; c2.lineWidth = 6; c2.strokeRect(8, 8, w - 16, h - 16); c2.fillStyle = '#f3e6cc'; c2.font = 'bold 26px Georgia'; c2.textAlign = 'center'; c2.fillText('PEMBERTON & SON', w / 2, 56); c2.font = '18px Georgia'; c2.fillText('GROCERS · EST. 1911', w / 2, 90); });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); sg.position.set(213.9, UG + 1.3, 50); sg.rotation.y = -Math.PI / 2; ctx.root.add(sg);
      for (let i = 0; i < 5; i++) H.cyl({ r: 0.12, h: 0.18, x: 211.6 + (i % 2) * 0.26, y: UG + Math.floor(i / 2) * 0.18, z: 52.8, mat: M.std('oldTin', { color: 0xa84a2a, rough: 0.5, metal: 0.5 }), col: false });
      // the ladder back up
      for (let i = 0; i < 6; i++) H.box({ w: 0.5, h: 0.04, d: 0.06, x: 205, y: UG + 0.3 + i * 0.35, z: 53.6, mat: 'midwood', col: false });
      H.light(209, UG + 2, 50, 0xffd9a0, 0.8, 7, { ug: true });
    },
  });
  G.COLLECT.push({ id: 's_enamel', cat: 'secrets', model: 'photo', name: 'Pemberton & Son, 1911', desc: 'A tiny photo tucked behind a jar in the cellar: the shop a hundred years ago, with a ferret asleep in the window. Some things never change.', pos: [212.4, UG + 0.02, 47.2] });

  /* ================================================================ MR PEMBERTON */
  if (G.HumanLooks) G.HumanLooks.pemberton = { name: 'Mr Pemberton', height: 1.74, skin: 0xf0c8a8, hair: 0x9a948c, hairStyle: 'bald', shirt: 0xf2ebe0, pants: 0x3f6f9e, shoes: 0x3a2a22, overalls: true, glasses: true, mustache: 0x9a948c, belly: true };
  // the Birch Lane neighbours who come to the opening
  if (G.HumanLooks) Object.assign(G.HumanLooks, {
    nbrA: { name: 'Mr Delgado', height: 1.78, skin: 0xc68a5e, hair: 0x2a1a10, hairStyle: 'cap', cap: 0x2f5d4a, shirt: 0xf2c14e, pants: 0x3a3a4a, shoes: 0x2a2420 },
    nbrB: { name: 'Mrs Okonkwo', height: 1.7, skin: 0x7a4e36, hair: 0x1a1210, hairStyle: 'bun', shirt: 0x3f8ad0, pants: 0x2a2a3a, shoes: 0x6a2a2a, cardigan: 0xf2c14e },
    nbrC: { name: 'Mrs Ferraro', height: 1.58, skin: 0xf0c8a8, hair: 0xe8e4dc, hairStyle: 'bun', shirt: 0x9a5ab0, pants: 0x3a3040, shoes: 0x2a2420, glasses: true, cardigan: 0x6a4a8a },
  });
  const PEM = (SHOP.pem = { h: null, extras: {} });
  { const oInit = EXT.init;
    EXT.init = function (g) {
      oInit(g);
      Object.assign(G.NAMES, { pemberton: 'Mr Pemberton', nbrA: 'Mr Delgado', nbrB: 'Mrs Okonkwo', nbrC: 'Mrs Ferraro', stockpigeon: 'A Very Rude Pigeon' });
      if (!G.Human) return;
      const h = new G.Human('pemberton'); h.root.visible = false; g.scene.add(h.root); h.path = []; PEM.h = h; C().extraHumans.push(h);
      // a paint roller in his right hand
      try { const hand = h.arms[1].hand; const rl = new THREE.Group(); const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), M.get('darkwood')); handle.position.y = -0.1; rl.add(handle); const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), M.std('rollerNap', { color: 0x2f5d4a, rough: 1 })); roll.rotation.z = Math.PI / 2; roll.position.y = -0.26; rl.add(roll); rl.rotation.x = -0.6; hand.add(rl); PEM.roller = rl; } catch (e) { /* the hand rig is optional */ }
      for (const id of ['nbrA', 'nbrB', 'nbrC']) { const n = new G.Human(id); n.root.visible = false; g.scene.add(n.root); PEM.extras[id] = n; }
      try {
        G.UI.portraitsExtra = G.UI.portraitsExtra || {};
        const ph = new G.Human('pemberton'); ph.update(0.016, {}); ph.update(0.5, {}); const p = V3(); ph.head.getWorldPosition(p);
        const url = G.Portrait.shot('h_pemberton', ph.root, V3(p.x + 0.12, p.y + 0.02, p.z + 0.62), V3(p.x, p.y, p.z)); G.UI.portraitsExtra.pemberton = url; if (G.UI.portraits) G.UI.portraits.pemberton = url;
      } catch (e) { console.warn('pemberton portrait', e); }
    }; }

  /* where he is, by stage and time of day */
  const pemSpot = () => {
    const st = stage();
    if (st === 'old') return null;
    if (st !== 'open') return hour() >= 7.5 && hour() < 19 ? [50.6, 10.9, Math.PI, 'think'] : null;       // out front, painting
    if (!openHours()) return null;
    return hour() < 12 ? [57, 2.4, 0, 'idle'] : hour() < 16 ? [48.8, 5.6, 0.8, 'read'] : [57, 2.4, 0, 'idle'];  // till, cafe corner, till
  };

  /* ================================================================ THE THREE JOBS */
  Object.assign(G.ITEMS, {
    shopbell: { name: 'The Shop Bell', desc: 'A little brass bell on a curly bracket. It rolled all the way to the duck pond. It still goes ting.' },
    ribbonroll: { name: 'A Roll of Red Ribbon', desc: 'Two whole metres of shiny red ribbon, for the grand reopening. It is meant for Ellie.' },
  });
  G.QUESTS.bq_reopen = {
    kind: 'Town mission', title: 'The Grand Reopening', giver: 'Mr Pemberton',
    steps: { jobs: 'Help Mr Pemberton get ready: find the shop bell, clear the stockroom (the door is in the alley), and take the ribbon to Ellie', party: 'Come to the shop in the morning for the grand reopening' },
    done: 'Pemberton’s Corner Shop is open again, with a cat bed by the window and a free cheese sample for the first customer.',
    target: (st) => {
      if (st === 'party') return [53, 0, 12];
      const o = sh();
      if (!o.bell) return item('shopbell') ? [50.6, 0, 11] : [-3.2, 0, 47.2];
      if (!o.pigeon) return game().player.pos.x < 60 && game().player.pos.z < 1 ? [53.4, 0, -1.6] : [61, 0, -0.7];
      if (!o.ribbon) return item('ribbonroll') && C().ellie && C().ellie.root.visible ? [C().ellie.pos.x, 0, C().ellie.pos.z] : item('ribbonroll') ? [-3, 0, 2] : [55.2, 0, 10.9];
      return [53, 0, 12];
    },
  };
  SQ.panelsExtra.push((esc) => {
    const o = sh(); if (stage() === 'old') return '';
    const jobs = [['Find the shop bell', o.bell], ['Clear the pigeon out of the stockroom', o.pigeon], ['Take the ribbon to Ellie', o.ribbon]];
    let h = '<h3>Pemberton’s Corner Shop</h3><div class="qlist">';
    if (o.stage === 'open') h += `<div class="q done"><i></i><div><b>The Grand Reopening</b><small>${esc('The whole street came. Ellie cut the ribbon with the biggest scissors in the world, Tilly claimed the cat bed in about four seconds, and Milo was the first customer. “Good luck, that is!”')}</small></div></div>`;
    else for (const [t, d] of jobs) h += `<div class="q ${d ? 'done' : 'active'}"><i></i><div><b>${esc(t)}</b></div></div>`;
    return h + '</div>';
  });

  // 1. the bell rolled into the park pond: it sits in the shallows at the east edge
  G.PICKUPS.push({ id: 'p_shopbell', item: 'shopbell', model: 'bell', pos: [-3.2, 0.05, 47.2], when: () => stage() === 'reno' && !sh().bell && (S().quests || {}).bq_reopen === 'jobs', msg: 'Something brass winks in the reeds at the edge of the duck pond. Ting! The shop bell!' });
  // 3. the ribbon, on the paint tins by the scaffolding
  G.PICKUPS.push({ id: 'p_ribbonroll', item: 'ribbonroll', model: 'ribbon', pos: [55.2, 0.2, 10.9], when: () => stage() === 'reno' && !sh().ribbon && (S().quests || {}).bq_reopen === 'jobs', msg: 'A roll of red ribbon, tucked between the paint tins. This is for Ellie, for the opening!' });
  // 2. the pigeon in the stockroom
  NPC.add({
    id: 'stockpigeon', name: 'A Very Rude Pigeon', kind: 'pigeon', sound: 'coo', portrait: false,
    look: { scale: 1.2, color: 0x7a7e88 }, pos: [53.4, 0, -1.6], yaw: 2.2, wander: 0.8,
    when: () => stage() === 'reno' && !sh().pigeon && (S().quests || {}).bq_reopen === 'jobs', label: 'Chase the pigeon out',
    lines: () => [
      ['stockpigeon', 'Oi. This is MY stockroom now. I’ve got a box of cornflakes and a view of the bins. Living the dream.', 'smug'],
      ['milo', '*It’s Mr Pemberton’s stockroom, and he’s opening the shop again. Out you go!*', 'neutral'],
      { do: () => { A.play('flutter'); game().player.act('dance', 1.2); } },
      ['stockpigeon', 'Whoa! Whoa! A war dance? In THIS economy? Fine! FINE! I’m going to the Square. Gossip will want to hear about this.', 'surprised'],
      { do: () => { sh().pigeon = true; A.play('flutter'); jobDone('The stockroom is pigeon-free!'); } },
    ],
  });

  function jobDone(msg) {
    const o = sh();
    const n = (o.bell ? 1 : 0) + (o.pigeon ? 1 : 0) + (o.ribbon ? 1 : 0);
    SQ.toast('Getting ready', `${msg} (${n}/3)`);
    if (n === 3) {
      o.stage = 'ready'; G.EXT.setQuest('bq_reopen', 'party');
      setTimeout(() => game().say([['pemberton', 'Bell, stockroom, ribbon! That’s everything! We open TOMORROW MORNING. Tell everyone. Tell the pigeons, even.', 'happy']]), 900);
    }
    UI().updateObjective(true);
  }

  /* ---- talking to Mr Pemberton */
  function pemLines() {
    const o = sh(), q = (S().quests || {}).bq_reopen, t = hour();
    if (o.stage === 'open') {
      if (t < 9) return [['pemberton', pick(['Morning, Milo! First customer of the day, as usual. The kettle’s on.', 'Early bird! I’ve just put the fresh bread out. Not for ferrets. Mostly.']), 'happy']];
      if (t < 12) return [['pemberton', pick(['Busy morning! Mrs Ferraro bought seven lemons. Seven. I didn’t ask.', 'Tilly’s had the cat bed since we opened. I’ve started charging her rent. In purrs.']), 'happy']];
      if (t < 16) return [['pemberton', pick(['Lunchtime rush! Well. Two customers and a pigeon. It’s a start.', 'The café corner is a hit! Somebody read a whole book in it this morning.']), 'happy']];
      return [['pemberton', pick(['Nearly closing time. Sweep the floor, count the till, say goodnight to the jars.', 'Evening, Milo. Take a sample for the road, go on. Just the one.']), 'happy']];
    }
    if (!q) return [
      ['pemberton', 'Oh! Hello, little fellow. Mind the wet paint.', 'surprised'],
      ['pemberton', 'I’m Mr Pemberton. This is my shop. Was, for forty years. Is again, soon: I’m giving her a makeover. Grand reopening and everything!', 'happy'],
      ['pemberton', 'Trouble is, everything’s gone wrong. My shop bell rolled all the way down to the duck pond. A pigeon has moved into the new stockroom. And I promised young Ellie she could cut the ribbon, but I can’t leave the paint to take it to her.', 'sad'],
      ['milo', '*I can help with all of that!*', 'happy'],
      ['pemberton', 'You look like you understand me, you know. Go on, then. Bell, pigeon, ribbon. The stockroom door’s in the alley, by the bins.', 'happy'],
      { do: () => G.EXT.startQuest('bq_reopen', 'jobs') },
    ];
    if (q === 'jobs' && item('shopbell') && !o.bell) return [
      ['pemberton', 'MY BELL! Oh, you marvellous creature. It even still goes ting. Listen: ting!', 'happy'],
      { do: () => { game().take('shopbell'); o.bell = true; A.play('shopbell'); jobDone('The bell is back over the door.'); } },
    ];
    if (o.stage === 'ready') return [['pemberton', 'Tomorrow morning, bright and early! There’ll be bunting. There’ll be balloons. There might be cheese.', 'happy']];
    return [['pemberton', pick(['Second coat of green, I think. It’s called “Heritage Fern”. Very classy.', 'I found a 1911 penny in the wall! This place has stories.', 'The bell, the pigeon, the ribbon. You’re a better helper than my nephew.']), 'happy']];
  }
  PEM.it = { id: 'pem_talk', pos: [0, -999, 0], r: 1.3, label: 'Sniff Mr Pemberton’s boots', anim: 'sniff',
    when: () => !!PEM.h && PEM.h.root.visible && !PEM.h.chase && !G.SEQ.running,
    act: () => { const h = PEM.h; h.talkLock = 5; h.yaw = Math.atan2(game().player.pos.x - h.pos.x, game().player.pos.z - h.pos.z); game().say(pemLines()); } };
  add(PEM.it);

  // giving Ellie the ribbon: an interaction that follows her round the house
  const ellieIt = { id: 'pem_ribbon', pos: [0, -999, 0], r: 1.3, label: 'Give Ellie the ribbon', anim: 'sniff',
    when: () => item('ribbonroll') && !sh().ribbon && C().ellie && C().ellie.root.visible && !G.SEQ.running,
    act: () => game().say([
      ['ellie', 'Milo! What’s that? Is that... RIBBON? For the shop?', 'surprised'],
      ['ellie', 'Mr Pemberton said I could cut it! He said I’d need the BIG scissors! I’m going to be so careful. I’m going to be the carefullest.', 'happy'],
      { do: () => { game().take('ribbonroll'); sh().ribbon = true; jobDone('Ellie has the ribbon, and she is VERY excited.'); } },
    ]) };
  add(ellieIt);

  /* ================================================================ EVERY FRAME */
  SQ.tick((dt, s, st) => {
    if (!G.game || !P.front) return;
    const g = game(), o = sh(), stg = stage();
    // the building's state
    P.reno.visible = stg === 'reno' || stg === 'ready';
    P.party.visible = stg === 'open' || !!SHOP.partyUp;
    P.ribbon.visible = !!SHOP.partyUp && !SHOP.ribbonCut;
    P.bell.visible = !!o.bell || stg === 'open';
    P.cheese.visible = !SHOP.cheeseGone;
    const frontOpen = stg === 'open' && openHours() || !!SHOP.doorsOpen;
    if (P.frontCol.on === frontOpen) { P.frontCol.on = !frontOpen; }
    P.front.rotation.y = U.damp(P.front.rotation.y, frontOpen ? -1.45 : 0, 3, dt);
    const stockOpen = stg === 'open' || !!SHOP.doorsOpen;
    P.stockCol.on = !stockOpen; P.stock.rotation.y = U.damp(P.stock.rotation.y, stockOpen ? 1.4 : 0, 3, dt);
    const backOpen = stg !== 'old';
    P.backCol.on = !backOpen; P.back.rotation.y = U.damp(P.back.rotation.y, backOpen ? -Math.PI / 2 - 1.35 : -Math.PI / 2, 3, dt);
    P.renoCols[0].on = P.reno.visible;
    for (const b of P.balloons) if (!SHOP.balloonsUp) { b.m.position.y = b.home.y + Math.sin(g.t * 1.3 + b.home.x * 3) * 0.05; }
    // after chapter 6 Ellie has no home routine, so during the makeover she
    // comes to watch the painting by day (only if nothing else is using her)
    { const E2 = C().ellie, c = s.chapter;
      const want = (stg === 'reno' || stg === 'ready') && !o.ribbon && hour() >= 8 && hour() < 18 && (c === 19 || (c >= 10 && c <= 17)) && !G.SEQ.running && !C().chaser;
      if (E2) {
        if (want && !E2.root.visible && !E2.home) { SHOP.ellieOut = true; E2.root.visible = true; E2.pos.set(48.2, 0, 11.8); E2.yaw = Math.PI - 0.4; E2.pose = 'idle'; E2.seated = false; }
        else if (SHOP.ellieOut && !want) { SHOP.ellieOut = false; if (!G.SEQ.running) E2.root.visible = false; }
        if (SHOP.ellieOut && E2.root.visible) { const pl2 = g.player.pos; E2.lookY = Math.hypot(pl2.x - E2.pos.x, pl2.z - E2.pos.z) < 4 ? U.angDiff(E2.yaw, Math.atan2(pl2.x - E2.pos.x, pl2.z - E2.pos.z)) : 0; }
      } }
    // the ribbon interaction follows Ellie round the house
    const E = C().ellie; if (E && E.root.visible) { ellieIt.pos[0] = E.pos.x; ellieIt.pos[1] = E.pos.y + 0.2; ellieIt.pos[2] = E.pos.z; }
    // Mr Pemberton
    const h = PEM.h; if (!h) return;
    if (h.chase) { h.update(dt, {}); return; }
    if (SHOP.hold) { h.root.visible = true; h.pos.set(SHOP.hold[0], 0, SHOP.hold[1]); h.yaw = SHOP.hold[2]; h.pose = SHOP.hold[3] || 'idle'; h.update(dt, { talking: UI().dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === 'pemberton' }); return; }
    const sp = G.SEQ.running ? null : pemSpot();
    h.root.visible = !!sp; if (!sp) return;
    if (!h.placed || Math.hypot(h.pos.x - sp[0], h.pos.z - sp[1]) > 8) { h.pos.set(sp[0], 0, sp[1]); h.placed = true; }
    if (h.talkLock > 0) { h.talkLock -= dt; h.pose = 'idle'; h.speed = 0; }
    else if (!K().moveH(h, sp[0], sp[1], 1.1, dt)) h.pose = 'idle';
    else { h.pose = sp[3]; h.yaw = U.dampAngle(h.yaw, sp[2], 3, dt); }
    if (PEM.roller) { PEM.roller.visible = stg !== 'open'; if (stg !== 'open' && h.talkLock <= 0) PEM.roller.rotation.x = -0.6 + Math.sin(g.t * 3) * 0.4; }
    const pl = g.player.pos, d = Math.hypot(pl.x - h.pos.x, pl.z - h.pos.z);
    h.update(dt, { lookY: d < 4 ? U.angDiff(h.yaw, Math.atan2(pl.x - h.pos.x, pl.z - h.pos.z)) : 0, talking: UI().dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === 'pemberton' });
    PEM.it.pos[0] = h.pos.x; PEM.it.pos[1] = 0.2; PEM.it.pos[2] = h.pos.z;
  });

  /* when all three jobs are done, the opening happens the next time Milo
     comes down Maple Street (the cutscene sets the clock to morning) */
  // Milo has to go away and come back ("tomorrow morning"), so the opening
  // never starts on top of the moment the last job is done
  const nearShop = (p) => p.x > 38 && p.x < 68 && p.z > 9 && p.z < 28 && p.y > -2;
  SQ.tick(() => { if (G.game && sh().stage === 'ready' && !nearShop(game().player.pos) && Math.hypot(game().player.pos.x - 53, game().player.pos.z - 12) > 30) SHOP.awayOnce = true; });
  SQ.trigger(() => sh().stage === 'ready' && SHOP.awayOnce && townOpen() && nearShop(game().player.pos), () => SHOP.opening(), false);

  /* ================================================================ THE CUTSCENE */
  A.MOODS.fete = { bpm: 116, chords: [[48, 55, 60, 64, 67], [53, 57, 60, 65, 69], [55, 59, 62, 67, 71], [48, 52, 55, 60, 64]], density: 1.1, vol: 0.34 };
  function fanfare() { const n = [60, 64, 67, 72, 67, 72]; n.forEach((m, i) => A.tone({ f: 440 * Math.pow(2, (m - 69) / 12), type: 'triangle', dur: i === n.length - 1 ? 0.8 : 0.18, vol: 0.06, delay: i * 0.16, lp: 3200 })); }
  function confetti(g, n = 90) {
    const cols = [0xd9412f, 0xf2c14e, 0x3f8ad0, 0x6ab04a, 0xe7a0b0, 0xffffff];
    for (let i = 0; i < n; i++) g.particles.emit({ x: 53 + (Math.random() - 0.5) * 2, y: 2.6, z: 8.8 + (Math.random() - 0.5), vx: (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 2.5, vz: 0.5 + Math.random() * 2, life: 3 + Math.random() * 2, size: 0.03, col: cols[i % cols.length], wander: 0.6, grav: 0.6 });
  }
  // who stands where (x, z, yaw, pose): a crowd on the pavement facing the door
  const CROWD = {
    ellie: [53, 9.3, Math.PI, 'idle'], mum: [51.2, 11.2, Math.PI - 0.3, 'idle'],
    nbrA: [55.4, 11.4, Math.PI + 0.35, 'idle'], nbrB: [49.6, 12.2, Math.PI - 0.5, 'idle'], nbrC: [56.9, 12.6, Math.PI + 0.5, 'idle'],
  };
  const FOLK_HOLD = { baker: [58.4, 11.8, Math.PI + 0.6, 'idle'], postie: [47.8, 11.8, Math.PI - 0.7, 'idle'], gardener: [53.9, 13.2, Math.PI, 'idle'], lollipop: [52, 13.4, Math.PI, 'idle'], kid1: [50.6, 10.8, Math.PI - 0.2, 'idle'], kid2: [55.6, 10.4, Math.PI + 0.2, 'idle'], kid3: [54.4, 12.4, Math.PI, 'idle'] };
  const ANIMALS = { duchess: [58.6, 10.2, 3.6], biscuit: [49, 10.6, 2.4], gossip: [45.2, 11.2, 2.2], gary: [45.8, 11.8, 2.4], rusty: [60.2, 10.6, 3.8], soot: [57.6, 9.6, 3.4] };
  const OLD = { tilly: [47.7, 0.92, 9.25, 2.6], pip: [44.6, 3.52, 12.6, 2.2], moss: [41.6, 0, 12.1, 1.6] };

  SHOP.opening = function () {
    const g = game(), k = K(); if (!k || g.busy || G.SEQ.running) return;
    const o = sh(), E = C().ellie, Mm = C().mum;
    const npcDefs = {};
    SHOP.running = k.cutscene(async () => {
      // morning, clear, the whole street out
      UI().fade(true); await k.wait(0.6);
      S().time = 9.2; S().weather = 'clear'; g.applyWorldState && g.applyWorldState();
      SHOP.partyUp = true; SHOP.ribbonCut = false; SHOP.cheeseGone = false; SHOP.doorsOpen = false; SHOP.balloonsUp = false;
      A.setMood('fete');
      g.player.teleport(53.4, 0, 12.6, Math.PI);
      await k.wait(0.1);
      for (const [id, h] of [['ellie', E], ['mum', Mm]]) if (h) { const c = CROWD[id]; h.home = false; h.root.visible = true; h.seated = false; h.pos.set(c[0], 0, c[1]); h.yaw = c[2]; h.pose = c[3]; }
      for (const id in PEM.extras) { const h = PEM.extras[id], c = CROWD[id]; h.root.visible = true; h.pos.set(c[0], 0, c[1]); h.yaw = c[2]; h.pose = c[3]; }
      T.sceneHold = Object.assign({}, FOLK_HOLD);
      SHOP.hold = [53, 9.4, 0, 'idle'];
      for (const id in ANIMALS) { const d = NPC.get(id); if (!d) continue; npcDefs[id] = { when: d.when, pos: d.pos, wander: d.wander }; const a = ANIMALS[id]; d.when = () => true; d.pos = () => [a[0], 'g', a[1]]; d.wander = 0; }
      const hz = NPC.get('hazel'); if (hz) { npcDefs.hazel = { when: hz.when, pos: hz.pos, wander: hz.wander }; hz.when = () => true; hz.pos = () => [42.4, 'g', 12.7]; hz.wander = 0; }
      for (const id in OLD) { const n = g.npcs[id]; if (!n) continue; const a = OLD[id]; n.c.root.visible = true; n.hidden = false; n.c.root.position.set(a[0], a[1], a[2]); n.c.root.rotation.y = a[3]; n.anchor = [a[0], a[1], a[2]]; n.wander = 0; }
      // Mochi in Ellie's arms
      if (G.Mochi && G.Mochi.f && E) { G.Mochi.f.root.visible = true; C().mochiRide = { car: E.root, off: V3(0, 0.86, 0.2), yaw: 0 }; E.pose = 'carry'; }
      // scissors in Ellie's hand
      let scissors = null;
      try { scissors = new THREE.Group(); for (const s2 of [-1, 1]) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.01), M.get('chrome')); blade.position.set(s2 * 0.02, -0.18, 0); blade.rotation.z = s2 * 0.12; scissors.add(blade); const loop = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), M.std('scissorHandle', { color: 0xc0392b, rough: 0.4 })); loop.position.set(s2 * 0.04, 0.0, 0); scissors.add(loop); } scissors.scale.setScalar(1.6); E.arms[1].hand.add(scissors); SHOP.scissors = scissors; } catch (e) { scissors = null; }
      UI().fade(false);

      // 1. Maple Street, dressed for a party
      await k.shot([53, 6.4, 27], [53, 2.4, 8], 0);
      await k.wait(2.4);
      await k.shot([46.6, 2.4, 15.2], [52, 1.2, 10], 0);
      await k.talk([['mum', 'Look at this! Half the street’s here. The Birch Lane lot, the baker, even the postie.', 'happy'], ['nbrC', 'I haven’t been to an opening since 1974. I wore my good cardigan.', 'happy']]);
      // the animals watch
      await k.cut([46, 2.6, 13.8], [44.6, 2.6, 11.6], 1.6);
      await k.shot([43.6, 0.8, 14.8], [41.8, 0.3, 12.3], 1.6);
      await k.shot([49, 1.4, 11.8], [47.7, 1, 9.3], 1.4);
      // 2. the speech
      await k.cut([53.9, 1.7, 13.2], [53, 1.55, 9.4], 0);
      await k.talk([
        ['pemberton', 'Ahem. AHEM. Is this thing on? It’s not a thing. I’m just talking loudly.', 'think'],
        ['pemberton', 'Friends. Neighbours. Mrs Ferraro. Forty years ago I opened this shop with a till, a bell, and one jar of sherbet lemons.', 'happy'],
        ['pemberton', 'The till broke. The bell ran away to the duck pond. And I ate the sherbet lemons.', 'sad'],
        ['pemberton', 'But thanks to a very helpful little weasel, we are ready. So, without further ado, and with a great deal of ado, actually...', 'happy'],
        ['pemberton', 'Ellie, would you do the honours?', 'happy'],
      ]);
      // 3. the ribbon
      SHOP.hold = [55.2, 9.6, -0.4, 'idle'];
      if (E) { C().mochiRide = null; if (G.Mochi && G.Mochi.f) { G.Mochi.f.root.position.set(51.9, 0, 10.2); G.Mochi.f.root.rotation.y = Math.PI; } E.pose = 'idle'; }
      await k.cut([55.8, 1.3, 10.6], [53, 1.0, 8.4], 0);
      await k.talk([['ellie', 'With the BIG scissors! Everybody count!', 'happy'], ['ellie', 'Three... two... one...', 'happy']]);
      if (E) E.pose = 'reach';
      await k.wait(0.6);
      SHOP.ribbonCut = true; A.play('shopbell'); await k.wait(0.3); A.play('shopbell');
      fanfare(); confetti(g); g.particles.burst(V3(53, 1.05, 8.4), 26, 0xc0182a, 'dust');
      for (const h of [E, Mm, ...Object.values(PEM.extras)]) if (h) h.pose = 'wave';
      T.sceneHold = Object.fromEntries(Object.entries(FOLK_HOLD).map(([id, v]) => [id, [v[0], v[1], v[2], 'wave']]));
      SHOP.hold = [55.2, 9.6, -0.4, 'laugh'];
      await k.shot([53, 3.2, 17.4], [53, 2.2, 8.5], 0);
      // balloons go up
      SHOP.balloonsUp = true;
      for (let i = 0; i < 40; i++) { for (const b of P.balloons) { b.m.position.y += 0.09; b.m.position.x += Math.sin(i * 0.3 + b.home.x) * 0.02; b.str.visible = false; } if (i % 10 === 0) confetti(g, 30); await k.wait(0.05); }
      await k.talk([['ellie', 'WE DID IT! It’s OPEN!', 'happy'], ['nbrA', 'Hooray for Pemberton’s!', 'happy']]);
      // 4. the doors open and the camera swoops inside
      SHOP.doorsOpen = true; A.play('door');
      await k.cut([53, 1.6, 10.4], [53, 1.4, 6], 0.8);
      await k.shot([53, 1.8, 7.2], [53, 1.2, 3], 1.4);
      await k.shot([55.6, 1.9, 5.4], [56.8, 1.1, 3.3], 1.6);      // the sweet counter and its jars
      await k.shot([57.6, 1.5, 5.2], [59.2, 0.8, 6.6], 1.4);      // the ice-lolly freezer
      await k.shot([49.8, 1.6, 4.4], [47.6, 0.8, 6.6], 1.4);      // the cafe corner
      await k.shot([55.8, 1.7, 4.6], [57.2, 1.6, 1.1], 1.4);      // the noticeboard
      // Tilly claims the cat bed
      const tilly = g.npcs.tilly;
      await k.shot([51.8, 1.1, 5.4], [50.2, 0.2, 7.2], 0);
      if (tilly) {
        const r = tilly.c.root, pts = [[47.7, 0.92, 9.25], [49.6, 0, 10.2], [53, 0, 9.4], [53, 0, 7.2], [50.2, 0.12, 7.2]];
        for (let s2 = 0; s2 < pts.length - 1; s2++) { const a = pts[s2], b = pts[s2 + 1]; r.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]); for (let t = 0; t <= 1; t += 0.1) { r.position.set(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)); await k.wait(0.04); } }
        r.position.set(...SHOP.catBed); r.rotation.y = -0.6; tilly.anchor = SHOP.catBed.slice(); tilly.c.setEmote && tilly.c.setEmote('happy');
      }
      await k.talk([['tilly', 'Mine. Obviously.', 'smug']]);
      // Milo and the free sample
      await k.shot([57.4, 1.4, 5.8], [55.5, 1, 3.6], 0);
      g.player.teleport(53, 0, 8.6, Math.PI);
      await k.go('milo', [[53, 6.4], [55.3, 4.4]], 2.4);
      g.player.act('eat', 1.2); A.play('eat'); SHOP.cheeseGone = true; award('ach_sample');
      await k.wait(1.1);
      SHOP.hold = [56.6, 5.6, -2.4, 'laugh'];
      await k.cut([56.8, 1.5, 6.4], [55.8, 1.1, 4.4], 0);
      await k.talk([['pemberton', 'Ha! Look at that. The first customer is always a weasel. Good luck, that is!', 'happy'], ['milo', '*Ferret. But thank you. It was delicious.*', 'happy']]);
      await k.wait(0.4);
    });
    // make sure everything ends in the right place, even if the cutscene was skipped
    const finish = () => {
      o.stage = 'open'; SHOP.awayOnce = false; G.EXT.setQuest('bq_reopen', 'done');
      SHOP.partyUp = false; SHOP.ribbonCut = true; SHOP.doorsOpen = false; SHOP.hold = null; SHOP.balloonsUp = false; SHOP.cheeseGone = false;
      for (const b of P.balloons) { b.m.position.copy(b.home); b.str.visible = true; }
      T.sceneHold = null; C().mochiRide = null;
      for (const id in npcDefs) { const d = NPC.get(id); Object.assign(d, npcDefs[id]); }
      for (const id in PEM.extras) PEM.extras[id].root.visible = false;
      if (E) { E.root.visible = false; E.home = false; E.pose = 'idle'; }
      if (SHOP.scissors && SHOP.scissors.parent) SHOP.scissors.parent.remove(SHOP.scissors); SHOP.scissors = null;
      if (Mm) { Mm.root.visible = false; Mm.home = false; }
      g.placeNPCs(); g.player.teleport(55, 0, 5.4, Math.PI);
      const tilly = g.npcs.tilly; if (tilly) { tilly.c.root.position.set(...SHOP.catBed); tilly.c.root.visible = true; tilly.hidden = false; tilly.anchor = SHOP.catBed.slice(); tilly.wander = 0; }
      A.setMood(g.moodFor());
      if (G.COLLECT.find((c) => c.id === 'm_grandopening') && !S().collected.m_grandopening) g.giveCollectible('m_grandopening');
      g.autosave();
    };
    SHOP.running.then(finish);
  };

  /* Tilly keeps her cat bed on sunny days once the shop is open (when she
     has nowhere more important to be in the story) */
  { const oPlace = G.npcPlacement;
    G.npcPlacement = function () {
      const P2 = oPlace(); const s = S();
      if (s.shop && s.shop.stage === 'open' && !P2.tilly && (s.chapter === 6 || s.chapter === 19) && hour() > 8 && hour() < 18) P2.tilly = { pos: SHOP.catBed.slice(), yaw: -0.6 };
      return P2;
    }; }

  /* ================================================================ AFTER THE OPENING */
  G.COLLECT.push({ id: 'm_grandopening', cat: 'memories', model: 'photo', name: 'Grand Opening', desc: 'A photo from the reopening of Pemberton’s: Ellie with the giant scissors, confetti everywhere, Mochi looking alarmed, and Milo, blurred, heading straight for the cheese.' });
  // Ellie's treat: she leaves her pocket money at the till, one treat a day
  add({ id: 'shop_treat', pos: [57.4, 0.2, 4.6], r: 1.2, label: 'Wait by the till for Ellie’s treat', anim: 'sniff',
    when: () => isOpen() && openHours() && PEM.h && PEM.h.root.visible && (sh().treatDay ?? -1) !== T.dayOf(),
    act: () => { const o = sh(); o.treatDay = T.dayOf(); game().say([['pemberton', pick(['Ah, the daily order! Ellie paid in advance: one treat, for one ferret. She was very specific.', 'Here we are. From Ellie’s pocket money. She said, and I quote, “the crunchy ones, he likes the crunchy ones.”']), 'happy']], () => game().give('treat')); } });
  add({ id: 'shop_cheese', pos: [55.5, 0.2, 4.4], r: 1.0, label: 'Nibble a free cheese sample', anim: 'eat',
    when: () => isOpen() && openHours() && (sh().sampleDay ?? -1) !== T.dayOf(),
    act: () => { sh().sampleDay = T.dayOf(); A.play('eat'); award('ach_sample'); game().say([['milo', '*Mild cheddar. Tiny cube. Perfect.*', 'happy']]); } });
  add({ id: 'shop_trapIn', pos: [48.6, 0, -1.6], r: 0.8, label: 'Lift the trapdoor', anim: 'sniff', when: () => stage() !== 'old',
    act: () => game().travel([205, UG, 52.6], Math.PI, () => { if (!has('visit_shopcellar')) { game().flag('visit_shopcellar'); A.play('secret'); UI().toast('<b>Secret place</b>', null, 'An old cellar under the shop, full of dusty jars. “Pemberton & Son, est. 1911.”'); } }) });
  add({ id: 'shop_trapOut', pos: [205, UG, 53.2], r: 0.9, label: 'Climb back up to the stockroom', act: () => game().travel([48.6, 0, -0.8], Math.PI) });

  /* ---- save data */
  SQ.onApply((s) => {
    sh(); SHOP.partyUp = false; SHOP.hold = null; SHOP.doorsOpen = false; SHOP.cheeseGone = false;
    if (PEM.h) PEM.h.placed = false;
  });

  /* ---- admin buttons */
  (G.AdminExtras = G.AdminExtras || []).push(({ group, close, toast }) => {
    const add2 = group('Pemberton’s Corner Shop');
    add2('Replay shop opening', () => { close(); if (!townOpen()) { toast('<b>Admin</b>', null, 'The shop opening needs the town to be open (the epilogue, a sequel chapter or Free Explore).'); return; } const o = sh(); o.bell = o.pigeon = o.ribbon = true; o.stage = 'ready'; if (!(S().quests || {}).bq_reopen) (S().quests = S().quests || {}).bq_reopen = 'party'; setTimeout(() => SHOP.opening(), 400); });
    add2('Shop: back to renovation', () => { const o = sh(); o.stage = 'reno'; o.bell = o.pigeon = o.ribbon = false; delete (S().quests || {}).bq_reopen; close(); toast('<b>Admin</b>', null, 'Scaffolding is back up.'); });
    add2('Go to the shop', () => { close(); game().travel([53, 0, 11.4], Math.PI); });
    add2('Go to the cellar', () => { close(); game().travel([205, UG, 52.6], Math.PI); });
  });
})();
