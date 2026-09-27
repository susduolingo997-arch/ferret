/* =====================================================================
   world-north.js - the sequel's northern lands, built on demand:
   - Far Wood: the creek's hidden upstream path (ch. 6)
   - Wren Cottage: the Old Garden (ch. 7) and the Forgotten House (ch. 8)
   - Hawthorn Meadow: the lane between town and the cottage
   - The Mountain Trail (ch. 9) and the distant peaks
   ===================================================================== */
'use strict';
(function () {
  const R = G.Regions, W = G.World, M = G.Mat, U = G.U, UG = W.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const sm = U.smooth, cl = U.clamp, ss = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const P = (W.pts = W.pts || {});
  const fallMat = () => M.std('waterfall', { color: 0xcfe8f0, rough: 0.1, transparent: true, opacity: 0.55, map: 'water', emissive: 0x2a4a55, ei: 0.3 });
  G.fallMat = fallMat;
  const noise = (x, z) => Math.sin(x * 0.071 + 1.3) * Math.cos(z * 0.063 - 0.4) * 0.6 + Math.sin(x * 0.17 + z * 0.11) * 0.25 + Math.cos(x * 0.31 - z * 0.27) * 0.1;

  /* ================================================================ FAR WOOD */
  const creekX = (z) => -80 + 5 * Math.sin((z + 70) * 0.04);
  const ravine = (x, z) => (x > -76 && x < -40 ? ss(-124, -121, z) * ss(-112, -115, z) * ss(-77, -74, x) : 0);
  const pool = (x, z) => Math.hypot(x + 80, z + 150);
  function farH(x, z) {
    const fade = ss(-70, -80, z); let y = noise(x, z) * 0.9 * fade;
    const d = Math.abs(x - creekX(z)); if (z > -146) y -= 1.05 * ss(5, 1.5, d) * ss(-70, -72, z) + 0.05;
    y -= 1.1 * ss(9, 5, pool(x, z)) + 0.1 * ss(9, 0, pool(x, z));
    y -= 3.2 * ravine(x, z);
    y += 2.4 * ss(-160, -172, z) + 1.2 * ss(-140, -150, x); // rises to the ridge in the north and west
    return y;
  }
  P.far = { entry: [-80, 0, -72], moss: [-77.4, 0, -63.5], thicket: [-80, 0, -70.2], ravineS: [-62, 0, -111.8], ravineN: [-62, 0, -124.6], holeS: [-57, 0, -109.3], holeN: [-54.5, 0, -126.2], pool: [-80, 0, -150], otto: [-72.6, 0, -149.4], gate: [-40.6, 0, -140], drain: [-40.7, 0, -133], bracken: [-120, 0, -128], grove: [-133, 0, -160] };
  R.def({
    id: 'farwood', navGround: true, name: 'Far Wood', bounds: [-150, -40, -172, -70], preload: 30,
    areas: [
      ['glowhollow', 'Glowworm Hollow', -62, -52, -130, -105, { ug: true, zone: 'under', surf: 'dirt', dark: true }],
      ['otterpool', "Otto's Pool", -89, -71, -159, -141, { zone: 'forest', surf: 'grass' }],
      ['farravine', 'The Old Ravine', -76, -40, -124, -112, { zone: 'forest', surf: 'stone' }],
      ['brackenden', "Bracken's Den", -125, -115, -133, -123, { zone: 'forest', indoor: true, dim: 0.7, surf: 'dirt' }],
      ['whisper', 'The Whispering Grove', -145, -125, -170, -152, { zone: 'forest', surf: 'grass' }],
      ['farwood', 'Far Wood', -150, -40, -172, -70, { zone: 'forest', surf: 'leaves' }],
    ],
    terrains: [{ x0: -150, x1: -40, z0: -172, z1: -70, h: farH }],
    nav: { nodes: { fw0: [-80, 0, -72], fw1: [-74, 0, -84], fw2: [-70, 0, -98], fw3: [-62, 0, -108], fwHs: [-57, 0, -109.6], fwBs: [-62, 0, -111.5], fwBn: [-62, 0, -124.8], fwHn: [-54.5, 0, -126.6], fw4: [-66, 0, -132], fw5: [-72, 0, -143], fwPool: [-73, 0, -149], fw6: [-56, 0, -140], fwGate: [-41.5, 0, -140], fwW: [-100, 0, -95], fwBr: [-118, 0, -127], fwGr: [-130, 0, -150],
      fwT0: [-57, UG, -109.4], fwT1: [-57, UG, -117], fwT2: [-55, UG, -121], fwT3: [-54.6, UG, -126] },
      edges: 'cE-fw0 fw0-fw1 fw1-fw2 fw2-fw3 fw3-fwHs fw3-fwBs fwBs-fwBn fwBn-fw4 fwHn-fw4 fw4-fw5 fw5-fwPool fw4-fw6 fw6-fwGate fw2-fwW fwW-fwBr fwBr-fwGr fwT0-fwT1 fwT1-fwT2 fwT2-fwT3' },
    hazards: [],
    register() {
      for (let z = -71; z > -146; z -= 1.6) W.hazards.push({ type: 'circle', x: creekX(z), z, r: 1.5, y: -0.6, name: 'farcreek' });
      W.hazards.push({ type: 'circle', x: -80, z: -150, r: 6.2, y: -0.6, name: 'otterpool' });
    },
    build(ctx) {
      const { H, veg, gy } = ctx, rng = U.rng(606);
      R.terrain(ctx, { x0: -150, x1: -40, z0: -172, z1: -70, seg: 110, h: farH, key: 'far', tex: ['forestfloor', 'stone', 'dirt'], scale: 7,
        weights: (x, z, y, slope) => { const d = Math.abs(x - creekX(z)); return [1 - Math.min(1, slope * 2.5), Math.min(1, slope * 2.5) + (d < 3 ? 0.6 : 0) + ravine(x, z) * 2, ss(2.5, 0.5, Math.abs(x + 64 - Math.sin(z * 0.08) * 4)) * 0.6]; } });
      // the creek winds north to the otter pool
      const cpts = []; for (let z = -70; z >= -146; z -= 2) cpts.push([creekX(z), z]); cpts.push([-80, -148]);
      const water = R.path(ctx, cpts, 3.8, 'water', { y: -0.55, lift: 0, po: false }); water.userData.dynamic = true; G.GFX.registerWater(water, { planeY: -0.55 });
      R.waterDisc(ctx, -80, -150, 6.6, -0.55, { hazard: false });
      for (let z = -72; z > -146; z -= 1.4) { const cx = creekX(z); veg.rocks.push([cx - 2.1 - rng() * 0.3, -0.35, z, 0.25 + rng() * 0.3, 'mossrock'], [cx + 2.1 + rng() * 0.3, -0.35, z + 0.6, 0.25 + rng() * 0.3, 'mossrock']); if (rng() > 0.55) veg.ferns.push([cx - 3.2, z, 0.8, 'fern'], [cx + 3.2, z + 0.5, 0.8, 'reed']); }
      // a little cascade where the forest creek drops into the Far Wood
      for (let i = 0; i < 5; i++) veg.rocks.push([-81.8 + i * 0.9, -0.25, -70.6, 0.35, 'mossrock']);
      // stepping stones across the creek (west side trail)
      for (const [x, z] of [[-83.4, -92.4], [-81.7, -92.9], [-80.1, -93.2]]) { H.cyl({ r: 0.4, rt: 0.34, h: 0.45, x, y: -0.72, z, mat: 'rock', seg: 9, col: false }); W.collider(x - 0.33, x + 0.33, z - 0.33, z + 0.33, -1, -0.27, { climb: true }); }
      // the thicket that hid the way (cleared in chapter 6)
      const th = new THREE.Group(); th.userData.dynamic = true; ctx.root.add(th); W.obj.farThicket = th;
      for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + rng() * 0.35, 1), W.bushMat); b.position.set(-87.5 + i * 1.02, 0.45 + rng() * 0.3, -70.2 + (rng() - 0.5) * 0.8); b.castShadow = true; th.add(b); b.userData.dynamic = true; for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.12, 4), M.color(0x6a3a2a)); t.position.set((rng() - 0.5) * 0.8, (rng() - 0.3) * 0.5, (rng() - 0.5) * 0.8); t.rotation.set(rng() * 3, rng() * 3, 0); b.add(t); } }
      // trail
      const trail = [[-80, -72], [-76, -78], [-74, -84], [-70, -92], [-70, -98], [-66, -104], [-62, -108], [-62, -111.5]];
      R.path(ctx, trail, 1.6, 'dirt');
      R.path(ctx, [[-62, -124.8], [-64, -128], [-66, -132], [-70, -138], [-72, -143], [-73, -148]], 1.4, 'dirt');
      R.path(ctx, [[-66, -132], [-60, -136], [-56, -140], [-48, -140], [-41.5, -140]], 1.3, 'dirt');
      R.path(ctx, [[-70, -98], [-80, -95], [-92, -94], [-100, -95], [-110, -104], [-116, -118], [-118, -126]], 1.1, M.std('faintpath', { map: 'dirt', color: 0xb09a80, rough: 1 }));
      // fallen trees across the trail: jump over one, crawl under the other
      R.log(ctx, -73, -87, 5.5, 0.35, 0.34);
      R.log(ctx, -68.2, -101, 6, -0.25, 0.3, { gap: 0.5, raise: 0.45 }); for (const s of [-1, 1]) H.sph({ x: -68.2 + s * 2.4, y: gy(-68.2 + s * 2.4, -101), z: -101 + s * 0.6, r: 0.55, sy: 0.9, mat: 'mossrock' });
      R.log(ctx, -95, -118, 7, 1.2, 0.38); R.log(ctx, -108, -88, 6, 0.6, 0.32); R.log(ctx, -130, -110, 8, 2.0, 0.45);
      // the ravine: a broken bridge, rock outcrops closing both ends, railings of roots
      const bridge = R.bridge(ctx, -62, -121.4, -62, -114.6, 0.08, 1.3, { broken: [8, 9, 10, 11, 12], name: 'fwBridge' }); if (bridge[0]) bridge[0].on = false;
      const planks = new THREE.Group(); planks.userData.dynamic = true; ctx.root.add(planks); W.obj.fwPlanks = planks; planks.visible = false;
      for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.28), M.get('midwood')); p.position.set(-62, 0.02, -118.2 + i * 0.3); p.castShadow = true; planks.add(p); p.userData.dynamic = true; }
      for (const z of [-121, -115]) { W.collider(-76, -62.8, z - 0.2, z + 0.2, -4, 1.2, { cam: false, walk: false }); W.collider(-61.2, -40, z - 0.2, z + 0.2, -4, 1.2, { cam: false, walk: false }); }
      W.collider(-62.9, -62.7, -121.4, -114.6, -4, 1.2, { cam: false, walk: false }); W.collider(-61.3, -61.1, -121.4, -114.6, -4, 1.2, { cam: false, walk: false });
      for (let x = -75; x < -40; x += 1.6) if (Math.abs(x + 62) > 1.2) { veg.rocks.push([x, -0.2, -121.3 - rng() * 0.4, 0.3 + rng() * 0.3, 'rock'], [x + 0.6, -0.2, -114.7 + rng() * 0.4, 0.3 + rng() * 0.3, 'rock']); }
      for (let i = 0; i < 8; i++) veg.rocks.push([-77 + (i % 3) * 1.2, 0.2, -122 + i * 1.1, 1.3 + rng() * 0.5, 'rock', true]);
      W.collider(-79, -74, -123, -113, -4, 3, { cam: false });
      for (let i = 0; i < 12; i++) { const x = -74 + rng() * 33, z = -120 + rng() * 4; const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 2 + rng(), 5), M.color(0x5a3e2b, 0.9)); rt.position.set(x, -1.6, z); rt.rotation.set((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5); ctx.root.add(rt); }
      // holes into Glowworm Hollow (a short tunnel under the ravine)
      for (const [x, z] of [[-57, -109.3], [-54.5, -126.2]]) { const hm = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), M.color(0x0b0706, 1)); hm.rotation.x = -Math.PI / 2; hm.position.set(x, gy(x, z) + 0.03, z); ctx.root.add(hm); H.sph({ x, y: gy(x, z), z: z + 0.35, r: 0.4, sy: 0.3, mat: 'dirt' }); }
      veg.rocks.push([-56, 0, -108.2, 0.9, 'mossrock'], [-58.4, 0, -108.8, 0.75, 'mossrock'], [-56.9, 0, -107.6, 0.6, 'mossrock']);
      H.tunnel('GLOW', [[-57, UG, -109.4], [-57.2, UG, -113], [-57, UG, -117], [-55.2, UG, -121], [-54.6, UG, -126]]);
      H.tunnel('GLOWC', [[-57.2, UG, -116.4], [-57, UG, -117.6]], { r: 1.2, noVis: true });
      R.caveDome(ctx, -57, UG + 0.4, -117, 2.2, 1.3, 2.2, { key: 'glowDome', color: 0x6a5a48 });
      H.disc(-57, -117, 2.1, UG + 0.004, 'dirt', 1);
      for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r = 1.4 + rng() * 0.6, gl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 4), M.std('glowworm', { color: 0x9fffe0, emissive: 0x6fffd0, ei: 2.2 })); gl.position.set(-57 + Math.cos(a) * r, UG + 1 + rng() * 0.9, -117 + Math.sin(a) * r); ctx.root.add(gl); }
      H.light(-57, UG + 1.2, -117, 0x6fffd0, 1.1, 5, { ug: true, flicker: 0.1 });
      const carv = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: R.text('carving1', 256, 160, (g) => { g.fillStyle = '#6a5a48'; g.fillRect(0, 0, 256, 160); g.strokeStyle = 'rgba(30,20,12,.8)'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 18; a += 0.15) { const r = 4 + a * 3.2; g.lineTo(128 + Math.cos(a) * r, 80 + Math.sin(a) * r); } g.stroke(); g.lineWidth = 3; for (const x of [30, 58, 198, 226]) { g.beginPath(); g.ellipse(x, 128, 10, 6, 0, 0, 7); g.arc(x + 10, 118, 5, 0, 7); g.stroke(); } g.font = 'bold 22px Georgia'; g.fillStyle = 'rgba(30,20,12,.8)'; g.fillText('J', 120, 30); }), roughness: 1 }));
      carv.position.set(-57, UG + 0.9, -119.05); ctx.root.add(carv); W.obj.carving1 = carv;
      // otter pool with a waterfall from the ridge
      for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28; if (Math.abs(a - 0.05) < 0.4) continue; veg.rocks.push([-80 + Math.cos(a) * 7.2, -0.4, -150 + Math.sin(a) * 7.2, 0.4 + rng() * 0.4, 'mossrock']); }
      for (let i = 0; i < 5; i++) veg.rocks.push([-83 + i * 1.5, 0.6 + i * 0.3, -158.5 - (i % 2), 1.4, 'rock', true]);
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), fallMat()); fall.position.set(-80, 0.7, -156.7); fall.userData.dynamic = true; ctx.root.add(fall); W.obj.farFall = fall;
      H.cyl({ r: 0.5, rt: 0.45, h: 0.35, x: -75.2, y: gy(-75.2, -146), z: -146, mat: 'rock', col: true, climb: true });
      // Otto's log slide into the pool
      R.log(ctx, -86.5, -147, 4, 0.9, 0.3);
      // the old stone wall of Wren Cottage, with its rose gate and a drain
      H.wall(-40, -172, -40, -95, 2.2, 0.6, 'stonewall', 'stonewall', [[-141.2, -138.8, 2.2], [-133.4, -132.6, 0.3]], { s: 1.4, edge: 'stonewall' });
      W.collider(-40.4, -39.6, -133.4, -132.6, 0, 0.3, { name: 'wrenDrain' });
      const gate = new THREE.Group(); gate.position.set(-40, 0, -141.2); gate.userData.dynamic = true; ctx.root.add(gate); W.obj.roseGate = gate;
      const iron = M.std('iron', { color: 0x2a2a2e, rough: 0.5, metal: 0.7 });
      for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), iron); b.position.set(0, 0.95, 0.15 + i * 0.26); gate.add(b); b.userData.dynamic = true; }
      for (const y of [0.3, 1.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 2.4), iron); b.position.set(0, y, 1.2); gate.add(b); b.userData.dynamic = true; }
      const rose = new THREE.Mesh(new THREE.TorusKnotGeometry(0.12, 0.03, 40, 6, 2, 5), M.std('roseIron', { color: 0x8a2a2a, rough: 0.4, metal: 0.5 })); rose.position.set(0, 1.1, 1.2); rose.rotation.y = Math.PI / 2; gate.add(rose); rose.userData.dynamic = true;
      W.collider(-40.3, -39.7, -141.2, -138.8, 0, 2.2, { name: 'roseGate' });
      const grate = new THREE.Group(); grate.position.set(-40.32, 0.14, -133); grate.rotation.y = Math.PI / 2; ctx.root.add(grate);
      grate.add(new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.28), M.color(0x0b0706, 1))); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.03), iron); b.position.set(-0.28 + i * 0.14, 0, 0.02); grate.add(b); }
      R.sign(ctx, -43, -136.5, Math.PI / 2, 'WREN COTTAGE', { w: 1.2 });
      // Bracken's den: a small cave in the west
      R.caveDome(ctx, -120, 0.2, -128, 4, 2.3, 3.8, { key: 'brackenDome' });
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), M.get('rock')); shell.scale.set(4.4, 2.6, 4.2); shell.position.set(-120, 0.3, -128); shell.castShadow = true; ctx.root.add(shell);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18, 0, Math.PI), M.color(0x100b08, 1)); hole.position.set(-116.1, 0.1, -125.4); hole.rotation.y = 0.9; ctx.root.add(hole);
      R.walls(-124, -116, -132, -124, -1, 3, { e: [[-126.6, -124.3]] });
      W.collider(-124, -116, -132, -124, 2.1, 3, { walk: false });
      H.cyl({ r: 0.6, h: 0.1, x: -121, y: gy(-121, -130), z: -130, mat: M.std('moss_bed', { color: 0x5f7a3a, rough: 1, map: 'fabric' }) });
      H.light(-120, 1.1, -127, 0xffb866, 0.8, 5, { flicker: 0.2 });
      // Whispering Grove: ringed by boulders, reached through a hollow log
      for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.28; if (Math.abs(a - 0.1) < 0.25) continue; veg.rocks.push([-135 + Math.cos(a) * 8, 0, -161 + Math.sin(a) * 8, 1.3 + rng() * 0.4, 'mossrock', true]); }
      const hl = H.cyl({ r: 0.44, h: 3.2, x: -126.4, y: gy(-126.4, -160.2) + 0.42, z: -160.2, mat: 'bark', rz: Math.PI / 2, open: true }); hl.material = hl.material.clone(); hl.material.side = THREE.DoubleSide;
      for (let i = 0; i < 16; i++) { const a = rng() * 6.28, r = rng() * 5; veg.flowers.push([-135 + Math.cos(a) * r, -161 + Math.sin(a) * r, [0xcfe0ff, 0xffffff, 0xe7a0b0][i % 3]]); }
      veg.grass.push(['c', -135, -161, 6, 1.6]);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; veg.shrooms.push([-135 + Math.cos(a) * 2.4, -161 + Math.sin(a) * 2.4, 0.05, 0xbfe0ff]); }
      H.light(-135, 0.6, -161, 0x9fd8ff, 0.9, 6, { night: true });
      // trees, rocks, ferns
      const clear = (x, z) => Math.abs(x - creekX(z)) < 4.5 || pool(x, z) < 9 || ravine(x, z) > 0.02 || (x > -79 && x < -74 && z > -123 && z < -113) || trail.some(([a, b]) => (x - a) ** 2 + (z - b) ** 2 < 9) || (x > -125 && x < -114 && z > -134 && z < -122) || Math.hypot(x + 135, z + 161) < 9 || x > -43 || (x > -70 && x < -52 && z > -144 && z < -128) || Math.hypot(x + 57, z + 108.5) < 3;
      let n = 0;
      for (let i = 0; i < 2600 && n < 260; i++) { const x = -148 + rng() * 106, z = -171 + rng() * 99; if (clear(x, z)) continue; n++; const s = 0.9 + rng() * 0.9; if (rng() < 0.5) veg.pines.push([x, z, s * 1.1]); else veg.trees.push([x, z, s * 1.1, rng() < 0.12 ? 'oak' : null]); if (rng() < 0.5) veg.ferns.push([x + rng() - 0.5, z + rng() - 0.5, 0.6 + rng() * 0.6, 'fern']); }
      for (let i = 0; i < 520; i++) { const x = -148 + rng() * 106, z = -171 + rng() * 99; if (clear(x, z) && rng() > 0.1) continue; if (rng() < 0.62) veg.ferns.push([x, z, 0.5 + rng() * 0.7, rng() < 0.15 ? 'bramble' : 'fern']); else veg.bushes.push([x, 0.3, z, 0.4 + rng() * 0.5, rng() > 0.5 ? 0x3f5a2a : 0x55743a, true]); }
      for (let i = 0; i < 90; i++) { const x = -148 + rng() * 106, z = -171 + rng() * 99; if (clear(x, z)) continue; veg.rocks.push([x, 0, z, 0.3 + rng() * 0.8, 'mossrock']); }
      for (const [a, b] of trail) veg.grass.push(['c', a, b, 2.2, 0.5]);
      veg.grass.push(['c', -73, -146, 4, 1], ['c', -62, -136, 5, 0.8]);
      W.windowGlow = W.windowGlow || [];
      R.walls(-150, -40, -172, -70, -4, 6, { s: [[-140, -40]], e: [[-172, -70]] });
      W.collider(-150, -140, -70.5, -69.5, -2, 6, { cam: false });
    },
    update(dt, g) { if (W.obj.farFall && W.obj.farFall.material.map) W.obj.farFall.material.map.offset.y = -g.t * 0.9; },
  });

  /* ================================================================ WREN COTTAGE: garden + house */
  const HX0 = -14, HX1 = 8, HZ0 = -121, HZ1 = -103;
  const inHouse = (x, z) => x > HX0 && x < HX1 && z > HZ0 && z < HZ1;
  const annex = (x, z) => x > -17.6 && x <= HX0 && z > -120.1 && z < -114.9, gh = (x, z) => x > 9.9 && x < 22.1 && z > -160.1 && z < -151.9, shed = (x, z) => x > -32.1 && x < -25.9 && z > -133.1 && z < -126.9;
  const wrenVis = (x, z) => (inHouse(x, z) || annex(x, z) || gh(x, z) || shed(x, z) ? -0.05 : 0.1 + noise(x * 0.6, z * 0.6) * 0.07 - 0.5 * ss(2.8, 1.2, Math.hypot(x + 3, z + 142)));
  const wrenH = (x, z) => (inHouse(x, z) ? -2.6 : annex(x, z) ? 0 : Math.hypot(x + 3, z + 142) < 2.2 ? -0.35 : wrenVis(x, z));
  P.wren = { drainIn: [-38.8, 0, -133], shed: [-29, 0, -126.3], shedIn: [-29, 0, -129.8], valve: [-30.6, 0, -131.6], fountain: [-3, 0, -142], greenhouse: [16, 0, -151.3], ghIn: [16, 0, -155.4], pots: [13.8, 0, -151.2], sundial: [-15, 0, -160], backDoor: [-1, 0, -121.6], frontDoor: [-1, 0, -102.4], cellarUp: [-10, -2.6, -119.2], northGate: [0, 0, -171.2] };
  R.def({
    id: 'wren', name: 'Wren Cottage', bounds: [-40, 30, -172, -95], preload: 20,
    areas: [
      ['wrenBasement', 'The Cellar', HX0, HX1, HZ0, HZ1, { indoor: true, zone: 'house2', surf: 'stone', dim: 0.5, y0: -5, y1: -0.3 }],
      ['wrenAttic', 'The Attic', -12, 6, -121, -103, { indoor: true, zone: 'house2', surf: 'wood', dim: 0.4, y0: 5.3, y1: 12 }],
      ['wrenBath', 'Upstairs Bathroom', 2, 8, -121, -114, { indoor: true, zone: 'house2', surf: 'tile', y0: 2.5, y1: 5.3 }],
      ['wrenClocks', 'The Clock Room', 2, 8, -114, -103, { indoor: true, zone: 'house2', surf: 'wood', y0: 2.5, y1: 5.3 }],
      ['wrenBedroom', "Arlo & Rose's Room", HX0, -4, -121, -110, { indoor: true, zone: 'house2', surf: 'rug', y0: 2.5, y1: 5.3 }],
      ['wrenNursery', "Ellie's Little Room", HX0, -4, -110, -103, { indoor: true, zone: 'house2', surf: 'wood', y0: 2.5, y1: 5.3 }],
      ['wrenLanding', 'Upstairs Landing', -4, 2, -121, -103, { indoor: true, zone: 'house2', surf: 'wood', y0: 2.5, y1: 5.3 }],
      ['wrenSecret', "Arlo's Hidden Study", -17.5, HX0, -120, -115, { indoor: true, zone: 'house2', surf: 'wood', dim: 0.6, y0: -0.3, y1: 2.5 }],
      ['wrenParlor', 'The Parlour', HX0, -4, -112, -103, { indoor: true, zone: 'house2', surf: 'rug', y0: -0.3, y1: 2.5 }],
      ['wrenStudy', "Arlo's Study", HX0, -4, -121, -112, { indoor: true, zone: 'house2', surf: 'wood', y0: -0.3, y1: 2.5 }],
      ['wrenKitchen', 'The Old Kitchen', 2, HX1, -121, -110, { indoor: true, zone: 'house2', surf: 'tile', y0: -0.3, y1: 2.5 }],
      ['wrenSewing', "Rose's Sewing Room", 2, HX1, -110, -103, { indoor: true, zone: 'house2', surf: 'rug', y0: -0.3, y1: 2.5 }],
      ['wrenHall', 'The Forgotten House', -4, 2, -121, -103, { indoor: true, zone: 'house2', surf: 'wood', y0: -0.3, y1: 2.5 }],
      ['wrenPassage', 'Under the Fountain', -6, 0, -143, -116, { ug: true, zone: 'under', surf: 'stone', dark: true }],
      ['greenhouse', 'The Greenhouse', 10, 22, -160, -152, { indoor: true, zone: 'garden', surf: 'stone' }],
      ['wrenShed', 'Garden Shed', -32, -26, -133, -127, { indoor: true, zone: 'garden', surf: 'wood', dim: 0.5 }],
      ['oldgarden', 'The Old Garden', -40, 30, -172, -122, { zone: 'garden', surf: 'grass' }],
      ['wrenfront', 'Wren Cottage', -40, 30, -122, -95, { zone: 'garden', surf: 'grass' }],
    ],
    terrains: [{ x0: -40, x1: 30, z0: -172, z1: -95, h: wrenH }],
    nav: { nodes: { wDrain: [-38.6, 0, -133], wShed: [-29, 0, -126], wShedIn: [-29, 0, -130], wF: [-3, 0, -138.4], wFw: [-8, 0, -142], wGH: [16, 0, -150.6], wGHin: [16, 0, -155.6], wSun: [-15, 0, -158.5], wBack: [-1, 0, -122.4], wHall: [-1, 0, -116], wHallS: [-1, 0, -106], wFront: [-1, 0, -101.5], wStudy: [-9, 0, -116.5], wParlor: [-9, 0, -107.5], wKit: [5, 0, -115], wSew: [5, 0, -106.5], wStairsB: [1.4, 0, -105.4], wUp: [1.4, 2.8, -111.6], wLand: [-1, 2.8, -114], wBed: [-9, 2.8, -115.5], wNur: [-9, 2.8, -106.5], wClk: [5, 2.8, -108.5], wBath: [5, 2.8, -117.5], wAtS: [-3.9, 2.8, -119.9], wAtT: [1.8, 5.6, -119.9], wAttic: [-3, 5.6, -112], wWin: [-3, 5.6, -120.2], wCelS: [-3.3, 0, -103.5], wCel: [-3.3, -2.6, -108.4], wCel2: [-10, -2.6, -118.6], wNG: [0, 0, -169.5], wPass0: [-3, UG, -141.5], wPass1: [-3, UG, -119.5] },
      edges: 'fwGate-wDrain wDrain-wShed wShed-wShedIn wShed-wFw wFw-wF wF-wGH wGH-wGHin wFw-wSun wF-wBack wBack-wHall wHall-wHallS wHallS-wFront wHall-wStudy wHallS-wParlor wHall-wKit wHallS-wSew wHallS-wStairsB wStairsB-wUp wUp-wLand wLand-wBed wLand-wNur wLand-wClk wLand-wBath wLand-wAtS wAtS-wAtT wAtT-wAttic wAttic-wWin wHallS-wCelS wCelS-wCel wCel-wCel2 wF-wNG wPass0-wPass1' },
    build(ctx) {
      const { H, veg, gy } = ctx, rng = U.rng(707), root = ctx.root;
      R.terrain(ctx, { x0: -40, x1: 30, z0: -172, z1: -95, seg: 80, h: wrenVis, key: 'wren', tex: ['grass', 'stone', 'dirt'], scale: 6, weights: (x, z) => [1, 0, ss(1.2, 0.3, Math.min(Math.abs(x + 3), Math.abs(z + 142))) * 0.8 + (inHouse(x, z) ? 1 : 0)] });
      // garden walls (north gate to the mountain trail), hedge to the meadow in the south
      H.wall(-40, -172, 30, -172, 2.2, 0.6, 'stonewall', 'stonewall', [[-1.4, 1.4, 2.2]], { s: 1.4, edge: 'stonewall' });
      H.wall(30, -172, 30, -95, 2.2, 0.6, 'stonewall', 'stonewall', [], { s: 1.4, edge: 'stonewall' });
      H.hedge(-40, -95, -3, -95, 1.6, 1.0); H.hedge(1, -95, 30, -95, 1.6, 1.0);
      const ngate = new THREE.Group(); ngate.position.set(-1.4, 0, -172); ngate.userData.dynamic = true; root.add(ngate); W.obj.northGate = ngate;
      const gm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 0.06), M.std('oldgate', { color: 0x5a4a3a, rough: 0.8, map: 'shedwood' })); gm.position.set(1.4, 0.9, 0); gm.castShadow = true; ngate.add(gm); gm.userData.dynamic = true;
      W.collider(-1.4, 1.4, -172.2, -171.8, 0, 2.2, { name: 'northGate' });
      // paths
      const gravel = M.std('gravel', { map: 'dirt', color: 0xd8c8a8, rough: 1 });
      R.path(ctx, [[-38.6, -133], [-30, -133], [-20, -138], [-8, -141.5]], 1.2, gravel); R.path(ctx, [[-1, -122], [-1.5, -130], [-3, -139.5]], 1.4, gravel);
      R.path(ctx, [[2, -142], [10, -146], [16, -150.8]], 1.2, gravel); R.path(ctx, [[-3, -144.5], [-2, -155], [0, -165], [0, -171]], 1.2, gravel); R.path(ctx, [[-6, -144], [-12, -152], [-15, -158.5]], 1, gravel); R.path(ctx, [[-1, -102], [-1, -95]], 1.4, gravel);
      // overgrown beds: roses gone wild, brambles, tall grass
      for (const [bx, bz, bw, bd] of [[-22, -150, 7, 4], [-22, -160, 7, 4], [14, -138, 8, 4], [-14, -130, 6, 3], [8, -130, 6, 3], [-30, -160, 5, 7]]) {
        H.box({ w: bw, h: 0.22, d: bd, x: bx, y: gy(bx, bz) - 0.05, z: bz, mat: M.std('bedwood', { color: 0x7a5a3a, rough: 0.9, map: 'shedwood' }), s: 1, climb: true });
        for (let i = 0; i < bw * bd * 1.2; i++) { const x = bx + (rng() - 0.5) * bw, z = bz + (rng() - 0.5) * bd; if (rng() < 0.5) veg.ferns.push([x, z, 0.6 + rng() * 0.6, rng() < 0.4 ? 'bramble' : 'tall']); else veg.flowers.push([x, z, [0xd9412f, 0xe7a0b0, 0xffffff, 0xc03050][Math.floor(rng() * 4)]]); }
      }
      for (let i = 0; i < 200; i++) { const x = -38 + rng() * 66, z = -170 + rng() * 46; if (Math.hypot(x + 3, z + 142) < 4 || (x > 9 && x < 23 && z > -161 && z < -151) || (x > -33 && x < -25 && z > -134 && z < -126)) continue; veg.ferns.push([x, z, 0.7 + rng() * 0.7, rng() < 0.3 ? 'bramble' : 'tall']); }
      veg.grass.push([-38, 28, -170, -123, 1.6], [-38, 28, -121, -97, 1.1]);
      ctx.def.noGrass = (x, z) => inHouse(x, z) || Math.hypot(x + 3, z + 142) < 2.6 || (x > 10 && x < 22 && z > -160 && z < -152) || (x > -32 && x < -26 && z > -133 && z < -127);
      for (const [x, z, s] of [[-34, -165, 1.3, 'oak'], [24, -165, 1.2], [24, -100, 1], [-34, -100, 1.1], [-20, -120, 1.1], [20, -125, 1.1]]) veg.trees.push([x, z, s, 'oak']);
      veg.trees.push([-12, -164, 1.1, 'willow'], [-36, -145, 0.9, 'autumn'], [26, -148, 0.9, 'autumn']);
      // rose arbour + bench
      for (const s of [-1, 1]) H.cyl({ r: 0.05, h: 2.2, x: -3 + s * 1.2, z: -125, mat: 'whitewood', col: true });
      H.box({ w: 2.8, h: 0.1, d: 0.5, x: -3, y: 2.2, z: -125, mat: 'whitewood', col: false });
      for (let i = 0; i < 24; i++) veg.flowers.push([-3 + (rng() - 0.5) * 2.6, -125 + (rng() - 0.5) * 0.5, 0xd9412f]);
      H.box({ w: 1.5, h: 0.08, d: 0.45, x: -9, y: 0.42, z: -146, mat: 'midwood', climb: true, colY0: -0.42 });
      // the broken fountain: a basin, a pillar and a stone fish missing its spout
      const stone = M.std('fountainStone', { color: 0xc9c2b2, rough: 0.9, map: 'stone' });
      const basin = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 10, 40), stone); basin.rotation.x = Math.PI / 2; basin.position.set(-3, 0.25, -142); basin.castShadow = true; root.add(basin);
      H.disc(-3, -142, 2.2, -0.34, stone, 1.5);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28, x = -3 + Math.cos(a) * 2.2, z = -142 + Math.sin(a) * 2.2; W.collider(x - 0.24, x + 0.24, z - 0.24, z + 0.24, -0.4, 0.44, { climb: true }); }
      H.cyl({ r: 0.35, rt: 0.28, h: 1.1, x: -3, y: -0.35, z: -142, mat: stone, col: true });
      H.cyl({ r: 0.8, h: 0.1, x: -3, y: 0.75, z: -142, mat: stone });
      const fish = new THREE.Group(); fish.position.set(-3, 0.85, -142); root.add(fish); fish.userData.dynamic = true; W.obj.fountainFish = fish;
      { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), stone); b.scale.set(1.6, 0.8, 0.8); b.rotation.z = 0.9; b.position.y = 0.3; fish.add(b); const t = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), stone); t.position.set(-0.3, 0.05, 0); t.rotation.z = 2.3; fish.add(t); fish.traverse((o) => (o.userData.dynamic = true)); }
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), M.get('brass')); spout.position.set(-2.8, 1.45, -142); spout.rotation.z = -0.9; spout.userData.dynamic = true; root.add(spout); W.obj.fountainSpout = spout; spout.visible = false;
      const fw = new THREE.Mesh(new THREE.CircleGeometry(2.05, 32), M.get('water')); fw.rotation.x = -Math.PI / 2; fw.position.set(-3, 0.12, -142); fw.userData.dynamic = true; root.add(fw); W.obj.fountainWater = fw; fw.visible = false;
      const grille = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), M.color(0x0b0706, 1)); grille.rotation.x = -Math.PI / 2; grille.position.set(-4.3, -0.33, -142.6); grille.userData.dynamic = true; root.add(grille); W.obj.fountainHole = grille; grille.visible = false;
      const leaves = new THREE.Group(); leaves.userData.dynamic = true; root.add(leaves); W.obj.fountainLeaves = leaves;
      for (let i = 0; i < 30; i++) { const lf = new THREE.Mesh(new THREE.CircleGeometry(0.08, 5), M.std('dryleaf', { color: 0xb5793a, rough: 1, side: THREE.DoubleSide })); lf.rotation.x = -Math.PI / 2; lf.rotation.z = rng() * 6; const a = rng() * 6.28, r = rng() * 1.8; lf.position.set(-3 + Math.cos(a) * r, -0.32 + rng() * 0.02, -142 + Math.sin(a) * r); leaves.add(lf); lf.userData.dynamic = true; }
      // passage under the fountain to the cellar
      H.tunnel('WRENP', [[-3, UG, -141.5], [-3.4, UG, -136], [-3, UG, -130], [-4, UG, -124], [-3, UG, -119.5]]);
      // the garden shed (string latch; valve wheel inside)
      H.wall(-32, -133, -26, -133, 2.2, 0.12, 'shedwood', 'shedwood'); H.wall(-32, -133, -32, -127, 2.2, 0.12, 'shedwood', 'shedwood'); H.wall(-26, -133, -26, -127, 2.2, 0.12, 'shedwood', 'shedwood');
      H.wall(-32, -127, -26, -127, 2.2, 0.12, 'shedwood', 'shedwood', [[-29.6, -28.4, 1.9]]);
      H.roofPrism(-29, -130, 6.6, 6.6, 2.2, 1.2, true, M.std('mossroof', { map: 'shingles', color: 0x7a8a6a }), 'shedwood');
      H.plane(-32, -26, -133, -127, 0.03, 'planks', 1.6); const sc = H.plane(-32, -26, -133, -127, 2.2, 'shedwood', 2); sc.rotation.x = Math.PI; sc.position.y = 2.2; W.collider(-32, -26, -133, -127, 2.2, 2.4, { walk: false });
      const sdoor = new THREE.Group(); sdoor.position.set(-29.6, 0, -127); sdoor.userData.dynamic = true; root.add(sdoor); W.obj.wrenShedDoor = sdoor;
      const sdp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.06), M.get('shedwood')); sdp.position.set(0.6, 0.95, 0); sdp.castShadow = true; sdoor.add(sdp); sdp.userData.dynamic = true;
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), M.color(0xd9c8a0)); str.position.set(1.05, 1.2, 0.05); sdoor.add(str); str.userData.dynamic = true;
      W.collider(-29.6, -28.4, -127.1, -126.9, 0, 1.9, { name: 'wrenShedDoor' });
      H.cyl({ r: 0.3, h: 0.7, x: -27.1, z: -126.4, mat: M.std('barrel', { color: 0x7a5a3a, map: 'shedwood', rough: 0.9 }), col: true, climb: true });
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), M.std('redIron', { color: 0x8a2a1a, rough: 0.5, metal: 0.6 })); wheel.position.set(-30.6, 0.55, -132.8); wheel.userData.dynamic = true; root.add(wheel); W.obj.valveWheel = wheel;
      H.cyl({ r: 0.05, h: 0.6, x: -30.6, z: -132.8, mat: 'darkmetal' });
      H.box({ w: 2.4, h: 0.8, d: 0.6, x: -28, z: -132.5, mat: 'darkwood', climb: true }); for (let i = 0; i < 4; i++) H.cyl({ r: 0.1, rt: 0.13, h: 0.18, x: -29 + i * 0.5, y: 0.8, z: -132.5, mat: M.color(0xb5653d), col: false });
      for (let i = 0; i < 5; i++) H.box({ w: 0.04, h: 1.2, d: 0.05, x: -31.8, y: 0.3, z: -132 + i * 0.4, mat: 'midwood', col: false, rz: 0.15 });
      H.light(-29, 1.8, -130, 0xffe0b0, 0.6, 5, {});
      // the greenhouse: glass box with a stuck door and a broken pane
      const glass = M.std('ghGlass', { color: 0xd8ecec, rough: 0.05, metal: 0.1, transparent: true, opacity: 0.22, envI: 1.5, side: THREE.DoubleSide });
      H.plane(10, 22, -160, -152, 0.03, M.std('ghFloor', { map: 'stone', color: 0xbcb4a0 }), 1.2);
      for (const [x0, z0, x1, z1, gaps] of [[10, -160, 22, -160, []], [10, -152, 22, -152, [[15.4, 16.6, 1.2]]], [22, -160, 22, -152, []], [10, -160, 10, -152, []]]) {
        H.wall(x0, z0, x1, z1, 2.4, 0.04, glass, glass, gaps, { s: 1, edge: glass, vOffset: false });
        const alongX = z0 === z1, len = alongX ? x1 - x0 : z1 - z0; for (let i = 0; i <= len; i += 1.5) H.box({ w: 0.06, h: 2.4, d: 0.06, x: alongX ? x0 + i : x0, z: alongX ? z0 : z0 + i, mat: 'whitewood', col: false });
      }
      W.collider(15.4, 16.6, -152.1, -151.9, 0, 0.6, { cam: false });
      const gr = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.05, 8.2), glass); gr.position.set(16, 2.9, -156); gr.rotation.z = 0.08; root.add(gr);
      for (let i = 0; i < 9; i++) H.box({ w: 0.06, h: 0.06, d: 8.2, x: 10 + i * 1.5, y: 2.9 + (i - 4) * 0.12, z: -156, mat: 'whitewood', col: false });
      H.box({ w: 8, h: 0.8, d: 0.8, x: 16, z: -159.2, mat: 'darkwood', climb: true }); H.box({ w: 0.8, h: 0.8, d: 5, x: 21.2, z: -156, mat: 'darkwood', climb: true });
      for (let i = 0; i < 10; i++) { H.cyl({ r: 0.14, rt: 0.18, h: 0.24, x: 12.8 + i * 0.7, y: 0.8, z: -159.2, mat: M.color(0xb5653d), col: false }); H.cyl({ r: 0.012, h: 0.3, x: 12.8 + i * 0.7, y: 1.04, z: -159.2, mat: M.color(0x5a4a2a), col: false }); }
      const wr = new THREE.Group(); wr.position.set(21.2, 0.8, -155); root.add(wr); W.obj.whiteRose = wr; wr.userData.dynamic = true;
      { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 12), M.color(0xb5653d)); p.position.y = 0.13; wr.add(p); for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.std('whiterose', { color: 0xfff8f0, rough: 0.6, emissive: 0x302820, ei: 0.2 })); bl.position.set((i - 1) * 0.08, 0.5 + (i % 2) * 0.08, 0); bl.scale.set(1, 0.8, 1); wr.add(bl); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4), M.color(0x3f6a2a)); st.position.set((i - 1) * 0.08, 0.35, 0); wr.add(st); } wr.traverse((o) => (o.userData.dynamic = true)); }
      const teapot = new THREE.Group(); teapot.position.set(12, 0, -154); root.add(teapot);
      { const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), M.std('teapot', { color: 0x7fb0c4, rough: 0.3 })); b.scale.y = 0.8; b.position.y = 0.32; teapot.add(b); const sp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.4, 8), b.material); sp2.position.set(0.42, 0.4, 0); sp2.rotation.z = -0.8; teapot.add(sp2); const dr = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), M.color(0x100b08, 1)); dr.position.set(-0.3, 0.2, 0.2); dr.rotation.y = -1; teapot.add(dr); }
      W.collider(11.6, 12.4, -154.4, -153.6, 0, 0.6, {});
      const pots = new THREE.Group(); pots.position.set(13.8, 0, -151); pots.userData.dynamic = true; root.add(pots); W.obj.ghPots = pots;
      for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.34, 12), M.color(0xb5653d)); p.position.set(i * 0.3, 0.17 + i * 0.34, 0); p.castShadow = true; pots.add(p); p.userData.dynamic = true; }
      pots.visible = false; W.obj.ghPotsDown = H.cyl({ r: 0.25, h: 0.5, x: 13, z: -149.4, mat: M.color(0xb5653d), rz: Math.PI / 2 - 0.2, col: false }); W.obj.ghPotsDown.userData.dynamic = true;
      // sundial
      H.cyl({ r: 0.3, h: 0.7, x: -15, z: -160, mat: stone, col: true }); H.cyl({ r: 0.45, h: 0.05, x: -15, y: 0.7, z: -160, mat: 'brass' });
      const gno = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.3), M.get('brass')); gno.position.set(-15, 0.82, -160); gno.rotation.x = 0.5; root.add(gno);
      /* ---------------- THE FORGOTTEN HOUSE */
      buildHouse(ctx);
      // lamps in the garden (dim, overgrown)
      for (const [x, z] of [[-8, -126], [6, -126], [-3, -165]]) { H.cyl({ r: 0.05, h: 1.8, x, z, mat: 'darkmetal', col: true }); H.light(x, 1.9, z, 0xffcf8a, 1.1, 8, { night: true, halo: true }); }
      R.walls(-40, 30, -172, -95, -5, 6, { n: [[-1.4, 1.4]], w: [[-172, -95]], s: [[-3, 1]] });
    },
  });

  function buildHouse(ctx) {
    const { H } = ctx, root = ctx.root, rng = U.rng(808);
    const WP = M.std('wp3', { map: 'wallpaper', color: 0xd6c4a6, rough: 0.95 }), WP2 = M.std('wp4', { map: 'wallpaper2', color: 0xb8c0b0, rough: 0.95 }), SID = M.std('wrenSiding', { map: 'siding', color: 0xc9bfae, rough: 0.9 }), FL = M.std('wrenFloor', { map: 'planks', color: 0xa8927a, rough: 0.7 });
    const dust = M.std('dustsheet', { color: 0xe8e2d6, rough: 1, map: 'fabric' });
    // --- exterior shell (two storeys), gable roof along z
    const T = 0.18, WH = 5.6;
    H.wall(HX0, HZ0, HX1, HZ0, WH, T, WP, SID, [[-1.6, -0.4, 2.2]], { skirt: 'basewood' });
    H.wall(HX0, HZ1, HX1, HZ1, WH, T, SID, WP, [[-1.6, -0.4, 2.2]], { skirt: 'basewood' });
    H.wall(HX0, HZ0, HX0, HZ1, WH, T, WP, SID, [[-119.6, -118.4, 2.05]], { skirt: 'basewood' });
    H.wall(HX1, HZ0, HX1, HZ1, WH, T, SID, WP, [], { skirt: 'basewood' });
    H.roofPrism(-3, -112, 19.2, 23.4, WH + 0.02, 3, false, M.std('oldShingles', { map: 'shingles', color: 0x7a6a5a }), SID);
    W.collider(HX0, HX1, HZ0, HZ1, WH + 2.6, WH + 3.2, { walk: false });
    H.box({ w: 0.9, h: 2.4, d: 0.9, x: -11, y: 6.4, z: -110, mat: 'brick', s: 1.2, col: false });
    for (const [x, y, z, ry] of [[-9, 1.4, HZ1, 0], [5, 1.4, HZ1, 0], [-9, 4.2, HZ1, 0], [5, 4.2, HZ1, 0], [-9, 1.4, HZ0, Math.PI], [5, 1.4, HZ0, Math.PI], [5, 4.2, HZ0, Math.PI], [-9, 4.2, HZ0, Math.PI], [HX0, 1.4, -107, -Math.PI / 2], [HX1, 1.4, -116, Math.PI / 2], [HX1, 4.2, -108, Math.PI / 2], [-3, 7, HZ0, Math.PI]]) H.windowAt(x, y, z, ry, 1.1, 1.1, { cc: 0x9a8a7a });
    H.doorPanel(-1, HZ1 + 0.02, 0, 1.2, 2.2, M.std('wrenDoor', { color: 0x3f5a4a, rough: 0.6 }));
    H.box({ w: 2.4, h: 0.15, d: 1, x: -1, y: -0.05, z: HZ1 + 0.6, mat: 'stone', climb: true });
    // --- floors (walkable slabs with stair holes) + ceilings
    const slab = (x0, x1, z0, z1, y) => W.collider(x0, x1, z0, z1, y - 0.25, y, { cam: true });
    slab(HX0, -3.9, HZ0, HZ1, 0); slab(-2.7, HX1, HZ0, HZ1, 0); slab(-3.9, -2.7, HZ0, -108, 0);
    slab(HX0, 0.7, HZ0, HZ1, 2.8); slab(2.1, HX1, HZ0, HZ1, 2.8); slab(0.7, 2.1, HZ0, -111, 2.8); slab(0.7, 2.1, -105.6, HZ1, 2.8);
    slab(-11.5, 5.5, -119.3, -103.4, 5.6); slab(-11.5, -3.7, -120.6, -119.3, 5.6); slab(1.4, 5.5, -120.6, -119.3, 5.6);
    // the attic is only as wide as the roof lets it be
    W.collider(-11.8, -11.5, -120.8, -103.2, 5.6, 7.5, { walk: false }); W.collider(5.5, 5.8, -120.8, -103.2, 5.6, 7.5, { walk: false }); W.collider(-11.8, 5.8, -103.4, -103.1, 5.6, 7.5, { walk: false }); W.collider(-11.8, 5.8, -120.9, -120.6, 5.6, 7.5, { walk: false });
    for (const [y, m, s] of [[0, FL, 1.8], [2.8, FL, 1.8]]) H.plane(HX0, HX1, HZ0, HZ1, y + 0.006, m, s);
    H.plane(-11.5, 5.5, -120.6, -103.4, 5.606, M.std('atticFloor', { map: 'planks', color: 0x8a7a66 }), 1.6);
    for (const y of [-0.02, 2.77, 5.58]) { const c = H.plane(HX0, HX1, HZ0, HZ1, y, 'plaster', 3); c.rotation.x = Math.PI; c.position.y = y; }
    // --- stairs: cellar (hall west), main (hall east), attic (landing)
    R.stairs(ctx, -3.3, -107.9, -2.6, 0, 'z', 1.1); R.stairs(ctx, 1.4, -105.7, 0, 2.8, '-z', 1.2); R.stairs(ctx, -3.6, -119.95, 2.8, 5.6, 'x', 1.2);
    for (const [x0, z0, x1, z1] of [[-2.7, -108, -2.7, -103.3], [0.7, -111, 0.7, -106]]) { H.box({ w: 0.05, h: 0.9, d: Math.abs(z1 - z0), x: x0, y: x0 > 0 ? 2.8 : 0, z: (z0 + z1) / 2, mat: 'darkwood', col: false }); }
    // --- ground floor rooms
    const iw = (x0, z0, x1, z1, gaps, m1, m2, y = 0, h = 2.8) => H.wall(x0, z0, x1, z1, h, 0.12, m1 || WP, m2 || WP, gaps, { y, skirt: 'basewood' });
    iw(-4, HZ0, -4, HZ1, [[-117.6, -116.4, 2.1], [-109.6, -108.4, 2.1]]); iw(2, HZ0, 2, HZ1, [[-116.6, -115.4, 2.1], [-107.6, -106.4, 2.1]], WP2, WP);
    iw(HX0, -112, -4, -112, [], WP, WP2); iw(2, -110, HX1, -110, [], WP2, WP2);
    // parlour: piano, fireplace, dust-sheeted sofa, mantel clock
    H.box({ w: 1.6, h: 1.1, d: 0.6, x: -12.2, z: -104, mat: 'darkwood', climb: false }); H.box({ w: 1.5, h: 0.05, d: 0.25, x: -12.2, y: 0.75, z: -103.75, mat: 'white', col: false });
    H.box({ w: 0.6, h: 1.2, d: 1.6, x: -13.6, z: -108, mat: 'brick', s: 1.2 }); H.box({ w: 0.7, h: 0.1, d: 1.9, x: -13.55, y: 1.2, z: -108, mat: 'darkwood', col: false });
    H.box({ w: 2.2, h: 0.55, d: 0.9, x: -8, z: -110.8, mat: dust, climb: true }); H.box({ w: 2.2, h: 0.5, d: 0.25, x: -8, y: 0.55, z: -111.2, mat: dust, col: false });
    H.box({ w: 0.8, h: 0.6, d: 0.8, x: -6, z: -106, mat: dust, climb: true }); H.box({ w: 1.2, h: 0.45, d: 0.7, x: -9, z: -107.5, mat: 'midwood', climb: true });
    // study: desk, chair, bookcase (the secret door), a rolled map
    H.box({ w: 2, h: 0.85, d: 0.9, x: -9, z: -119.8, mat: 'darkwood', climb: false }); H.box({ w: 0.5, h: 0.45, d: 0.5, x: -9, z: -118.6, mat: 'midwood', climb: true });
    const bc = new THREE.Group(); bc.position.set(-13.85, 0, -119); bc.userData.dynamic = true; root.add(bc); W.obj.wrenBookcase = bc;
    { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 1.3), M.get('darkwood')); b.position.set(0.2, 1.1, 0); b.castShadow = true; bc.add(b); for (let i = 0; i < 4; i++) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshStandardMaterial({ map: G.Tex.get('books') })); sh.position.set(0.41, 0.35 + i * 0.5, 0); sh.rotation.y = Math.PI / 2; bc.add(sh); } bc.traverse((o) => (o.userData.dynamic = true)); }
    W.collider(-14, -13.45, -119.65, -118.35, 0, 2.2, { name: 'wrenBookcase' });
    // hidden study behind the bookcase
    R.room(ctx, -17.5, HX0, -120, -115, 0, 2.4, WP2, SID, { floor: FL, gaps: { e: [[-119.6, -118.4, 2.05]] }, skip: ['e'], ceil: 'plaster' });
    H.box({ w: 1.2, h: 0.8, d: 0.7, x: -16.6, z: -117.5, mat: 'darkwood', climb: true });
    const map = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshStandardMaterial({ map: mapTex(), roughness: 0.9 })); map.position.set(-16.2, 1.5, -119.93); root.add(map); W.obj.arloMap = map;
    H.light(-16, 1.8, -117.5, 0xffd08a, 0.9, 5, {});
    // kitchen: stove, table, pantry shelves, wall clock, dumbwaiter
    H.box({ w: 1.2, h: 0.9, d: 0.7, x: 7.3, z: -119.5, mat: 'boiler' }); H.box({ w: 1.6, h: 0.75, d: 1, x: 4.5, z: -115, mat: 'midwood', climb: true });
    for (const [x, z] of [[3.4, -115], [5.6, -115]]) H.box({ w: 0.45, h: 0.45, d: 0.45, x, z, mat: 'midwood', climb: true });
    H.box({ w: 2.2, h: 1.8, d: 0.4, x: 4, z: -120.7, mat: 'darkwood' }); for (let i = 0; i < 6; i++) H.cyl({ r: 0.07, h: 0.18, x: 3.2 + i * 0.3, y: 1.0, z: -120.6, mat: M.std('dustyJar', { color: 0xa8b0a0, rough: 0.4, transparent: true, opacity: 0.7 }), col: false });
    H.box({ w: 0.6, h: 0.7, d: 0.1, x: 7.94, y: 0.9, z: -112.5, mat: 'darkwood', col: false }); W.obj.dumbwaiter = H.box({ w: 0.05, h: 0.5, d: 0.5, x: 7.9, y: 0.95, z: -112.5, mat: M.color(0x100b08, 1), col: false });
    // sewing room: table, spectacles, a dress form
    H.box({ w: 1.4, h: 0.75, d: 0.7, x: 5, z: -104.2, mat: 'midwood', climb: false }); H.box({ w: 0.45, h: 0.45, d: 0.45, x: 5, z: -105.2, mat: 'sofa', climb: true });
    H.cyl({ r: 0.22, rt: 0.28, h: 0.8, x: 7, y: 0.3, z: -108.5, mat: M.std('dressform', { color: 0xc98f7a, rough: 0.9, map: 'fabric' }) }); H.cyl({ r: 0.03, h: 0.3, x: 7, z: -108.5, mat: 'darkwood' });
    const specs = new THREE.Group(); specs.position.set(5.3, 0.77, -104.3); root.add(specs); for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 14), M.get('brass')); r.rotation.x = Math.PI / 2; r.position.x = s * 0.035; specs.add(r); }
    // hall: grandfather clock (stopped), coat rack, height board
    H.box({ w: 0.6, h: 2.1, d: 0.4, x: -3.6, z: -113, mat: 'darkwood' }); H.cyl({ r: 0.22, h: 0.04, x: -3.38, y: 1.7, z: -113, mat: M.color(0xf2ebe0), rz: Math.PI / 2, col: false });
    // --- clocks: four faces with turnable hour hands
    W.wrenClocks = [];
    for (const [id, x, y, z, ry, r] of [['hall', -3.35, 1.7, -113, Math.PI / 2, 0.2], ['parlor', -13.2, 1.45, -108, Math.PI / 2, 0.14], ['kitchen', 2.08, 1.8, -118, Math.PI / 2, 0.18], ['clockroom', 7.9, 4.3, -108.5, -Math.PI / 2, 0.3]]) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); g.userData.dynamic = true;
      const face = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.6 })); g.add(face); face.userData.dynamic = true;
      const hh = new THREE.Group(); hh.position.z = 0.01; g.add(hh); hh.userData.dynamic = true; const hand = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, r * 0.55, 0.01), M.color(0x1a1410)); hand.position.y = r * 0.25; hh.add(hand); hand.userData.dynamic = true;
      const mh = new THREE.Group(); mh.position.z = 0.012; g.add(mh); const m2 = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.8, 0.01), M.color(0x1a1410)); m2.position.y = r * 0.38; mh.add(m2); mh.userData.dynamic = true; m2.userData.dynamic = true;
      W.wrenClocks.push({ id, g, hand: hh, pos: [x, y, z] });
    }
    // --- upstairs
    const y1 = 2.8;
    iw(-4, HZ0, -4, HZ1, [[-117.6, -116.4, 2.1], [-107.6, -106.4, 2.1]], WP, WP, y1); iw(2, HZ0, 2, HZ1, [[-118.6, -117.4, 2.1], [-109.6, -108.4, 2.1]], WP2, WP, y1);
    iw(HX0, -110, -4, -110, [], WP, WP2, y1); iw(2, -114, HX1, -114, [], WP2, M.get('tiles'), y1);
    // bedroom: big bed with a quilt, wardrobe, Rose's photo
    H.box({ w: 2.2, h: 0.5, d: 2.4, x: -9, y: y1, z: -119.6, mat: 'quilt', climb: true }); H.box({ w: 2.2, h: 1, d: 0.12, x: -9, y: y1, z: -120.85, mat: 'darkwood' });
    H.box({ w: 1.4, h: 2, d: 0.6, x: -13.3, y: y1, z: -115, mat: 'darkwood' }); H.box({ w: 0.5, h: 0.5, d: 0.4, x: -6.6, y: y1, z: -120.5, mat: 'midwood', climb: true });
    // Ellie's little room: small bed, height marks on the door frame, crayon drawings, the birthday card
    H.box({ w: 1.2, h: 0.4, d: 1.9, x: -12.8, y: y1, z: -105, mat: M.std('kidquilt', { map: 'quilt', color: 0xf0d8e0 }), climb: true });
    const marks = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.2), new THREE.MeshStandardMaterial({ map: R.text('heightmarks', 64, 256, (g) => { g.fillStyle = '#e7d7b9'; g.fillRect(0, 0, 64, 256); g.strokeStyle = '#3a2a1a'; g.fillStyle = '#3a2a1a'; g.font = '11px Georgia'; [[220, 'E 3'], [180, 'E 4'], [150, 'E 5'], [118, 'E 6']].forEach(([y, t]) => { g.beginPath(); g.moveTo(4, y); g.lineTo(34, y); g.stroke(); g.fillText(t, 36, y + 4); }); g.fillStyle = '#b5653d'; g.fillRect(4, 238, 20, 2); g.fillText('J!', 26, 242); }), transparent: false }));
    marks.position.set(-4.08, y1 + 0.7, -107.2); marks.rotation.y = Math.PI / 2; root.add(marks);
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshStandardMaterial({ map: G.Tex.picture(i === 0 ? 'note' : 'photo' + (i + 2)), roughness: 0.9 })); d.position.set(-10 + i * 1.3, y1 + 1.6, -109.93); d.rotation.y = Math.PI; root.add(d); }
    H.box({ w: 0.8, h: 0.5, d: 0.5, x: -8.5, y: y1, z: -103.5, mat: 'toybox' in M.cache ? 'toybox' : 'red', climb: true });
    // clock room: many clocks, workbench
    H.box({ w: 2.4, h: 0.85, d: 0.7, x: 5, y: y1, z: -103.5, mat: 'darkwood', climb: false });
    for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.08 + (i % 3) * 0.03, 16), new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.6 })); c.position.set(2.1, y1 + 1.2 + (i % 3) * 0.35, -112 + i * 0.9); c.rotation.y = Math.PI / 2; root.add(c); }
    // bathroom: tub, laundry chute hatch
    H.box({ w: 1.6, h: 0.6, d: 0.8, x: 6.6, y: y1, z: -120, mat: 'ceramic', climb: true }); H.box({ w: 0.5, h: 0.05, d: 0.5, x: 3, y: y1 + 0.01, z: -120.4, mat: M.color(0x100b08, 1), col: false });
    // attic: trunks, a dress form, the telescope window, fresh prickly footprints
    for (const [x, z, w] of [[-9, -106, 1.2], [4, -108, 1], [-8, -117, 1.4], [2, -116, 0.9]]) H.box({ w, h: 0.55, d: 0.6, x, y: 5.6, z, mat: M.std('trunk', { color: 0x6a4a33, rough: 0.8, map: 'shedwood' }), climb: true });
    const bird = new THREE.Group(); bird.position.set(4, 6.16, -108); root.add(bird); W.obj.clockBird = bird; bird.userData.dynamic = true;
    { const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), M.get('brass')); b.scale.set(1, 0.9, 1.4); b.position.y = 0.08; bird.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.get('brass')); h.position.set(0, 0.16, 0.08); bird.add(h); const k = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), M.get('chrome')); k.position.set(0, 0.1, -0.12); bird.add(k); bird.traverse((o) => (o.userData.dynamic = true)); }
    const prints = new THREE.Group(); prints.userData.dynamic = true; root.add(prints); W.obj.atticPrints = prints;
    for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), M.std('print', { color: 0x3a2a1a, transparent: true, opacity: 0.6, rough: 1 })); p.rotation.x = -Math.PI / 2; p.position.set(-3 + (i % 2 ? 0.08 : -0.08), 5.615, -106 - i * 1.02); prints.add(p); p.userData.dynamic = true; }
    H.light(-3, 7.2, -119.8, 0xcfe0ff, 0.8, 7, {});
    H.light(-1, 2.2, -112, 0xffd9a0, 0.7, 8, {}); H.light(-9, 2.2, -108, 0xffd9a0, 0.5, 7, {}); H.light(5, 2.2, -116, 0xffd9a0, 0.5, 7, {}); H.light(-1, 5, -110, 0xffd9a0, 0.5, 8, {});
    // --- the cellar
    H.plane(HX0, HX1, HZ0, HZ1, -2.596, 'concrete', 2); W.collider(HX0, HX1, HZ0, HZ1, -2.9, -2.6, { cam: false });
    for (const [x0, z0, x1, z1] of [[HX0, HZ0, HX1, HZ0], [HX0, HZ1, HX1, HZ1], [HX0, HZ0, HX0, HZ1], [HX1, HZ0, HX1, HZ1]]) H.wall(x0, z0, x1, z1, 2.6, 0.3, 'stonewall', 'stonewall', [], { y: -2.6, s: 1.4 });
    for (let x = HX0 + 3; x < HX1; x += 4) H.cyl({ r: 0.15, h: 2.6, x, y: -2.6, z: -112, mat: 'darkwood', col: true });
    H.cyl({ r: 0.5, h: 1.6, x: 5.5, y: -2.6, z: -118.8, mat: 'boiler', col: true }); H.box({ w: 3, h: 1.6, d: 0.45, x: -7, y: -2.6, z: -120.6, mat: 'midwood' });
    for (let i = 0; i < 8; i++) H.cyl({ r: 0.07, h: 0.2, x: -8.2 + i * 0.35, y: -1.7, z: -120.5, mat: M.std('preserve' + (i % 3), {}), col: false });
    const jt = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), M.color(0x0b0706, 1)); jt.position.set(-13.84, -2.38, -106); jt.rotation.y = Math.PI / 2; root.add(jt); W.obj.junTunnel = jt;
    const bricks = new THREE.Group(); bricks.userData.dynamic = true; root.add(bricks); W.obj.junBricks = bricks;
    for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), M.get('brick')); b.position.set(-13.78, -2.52 + Math.floor(i / 3) * 0.13, -106.2 + (i % 3) * 0.2); bricks.add(b); b.userData.dynamic = true; }
    H.cyl({ r: 0.18, h: 0.02, x: -10, y: -2.59, z: -119.2, mat: M.color(0x0b0706, 1) });
    H.light(-3, -0.8, -112, 0xffd28a, 0.9, 10, { flicker: 0.05 }); H.light(5.5, -2.1, -118, 0xff7a2f, 0.7, 4, { flicker: 0.4 });
    // dust motes and cobwebs everywhere
    for (const [x, y, z] of [[-13.8, 2.6, -120.8], [7.8, 2.6, -103.2], [-13.8, 5.4, -103.2], [7.8, 5.4, -120.8], [HX0 + 0.2, -0.1, HZ0 + 0.2]]) { const cw = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8, 0, Math.PI / 2), M.std('web', { color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })); cw.position.set(x, y, z); cw.rotation.y = Math.PI / 4; root.add(cw); }
  }
  function clockTex() { return G.Tex.make('clockface', 128, 128, (g) => { g.fillStyle = '#f2ead8'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.stroke(); g.fillStyle = '#3a2a1a'; g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; const n = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 - Math.PI / 2; g.fillText(n[i], 64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); } }); }
  function mapTex() {
    return G.Tex.make('arlomap', 512, 360, (g, w, h, r) => {
      g.fillStyle = '#e8d8b4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(120,90,50,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 3, 3); }
      g.strokeStyle = '#5f8fb0'; g.lineWidth = 4; g.beginPath(); g.moveTo(150, 360); g.bezierCurveTo(160, 250, 120, 200, 150, 120); g.stroke();
      g.fillStyle = '#7a6a58'; for (const [x, y, s] of [[80, 60, 40], [150, 40, 55], [230, 55, 45], [320, 40, 60], [400, 70, 40]]) { g.beginPath(); g.moveTo(x - s, y + s * 0.6); g.lineTo(x, y - s * 0.4); g.lineTo(x + s, y + s * 0.6); g.fill(); }
      g.fillStyle = '#3a2a1a'; g.font = 'italic 18px Georgia'; g.fillText('the old wood', 60, 250); g.fillText('our cottage', 230, 240); g.fillText('Rose’s lookout', 120, 110); g.fillText('town', 330, 320);
      g.strokeStyle = '#b5352a'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(250, 230); g.bezierCurveTo(300, 170, 380, 150, 430, 110); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(440, 100, 26, 0, 7); g.stroke(); g.fillStyle = '#b5352a'; g.font = 'italic 16px Georgia'; g.fillText('the little ones', 380, 150); g.fillText('(J. knows the way)', 380, 170);
      g.font = 'bold 20px Georgia'; g.fillStyle = '#3a2a1a'; g.fillText('✵', 150, 132);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#6a4a33'; g.beginPath(); g.ellipse(262 + i * 30, 218 - i * 20, 4, 3, 0, 0, 7); g.fill(); }
    });
  }

  /* ================================================================ HAWTHORN MEADOW (town <-> cottage) */
  const meadowH = (x, z) => noise(x * 0.8, z * 0.8) * 0.35 * ss(-32, -40, z) * ss(-95, -88, z) + 0.02;
  P.meadow = { burrowIn: [2, 0, -27.4], burrowOut: [2, 0, -33], lane: [-1, 0, -60], house: [-1, 0, -96] };
  R.def({
    id: 'meadow', navGround: true, name: 'Hawthorn Meadow', bounds: [-50, 30, -95, -30],
    areas: [['meadow', 'Hawthorn Meadow', -50, 30, -95, -30, { zone: 'town', surf: 'grass' }]],
    terrains: [{ x0: -50, x1: 30, z0: -95, z1: -30.5, h: meadowH }],
    nav: { nodes: { mdB: [2, 0, -33.5], md1: [0, 0, -50], md2: [-2, 0, -70], md3: [-1, 0, -90] }, edges: 'yard-mdB mdB-md1 md1-md2 md2-md3 md3-wFront' },
    build(ctx) {
      const { H, veg } = ctx, rng = U.rng(909);
      R.terrain(ctx, { x0: -50, x1: 30, z0: -95, z1: -30.5, seg: 60, h: meadowH, key: 'meadow', tex: ['grass', 'stone', 'dirt'], weights: (x, z) => [1, 0, ss(1.5, 0.4, Math.abs(x + 1 - Math.sin(z * 0.07) * 2)) * 0.7] });
      R.path(ctx, Array.from({ length: 14 }, (_, i) => { const z = -32 - i * 4.8; return [-1 + Math.sin(z * 0.07) * 2, z]; }), 1.6, M.std('laneDirt', { map: 'dirt', color: 0xc8b090, rough: 1 }));
      for (let i = 0; i < 18; i++) { const x = -46 + rng() * 72, z = -92 + rng() * 58; if (Math.abs(x + 1) < 5) continue; veg.trees.push([x, z, 0.8 + rng() * 0.4, rng() < 0.3 ? 'autumn' : null, rng() < 0.4 ? 0x8aa05a : null]); for (let k = 0; k < 6; k++) veg.flowers.push([x + (rng() - 0.5) * 3, z + (rng() - 0.5) * 3, 0xffffff]); }
      for (let i = 0; i < 160; i++) { const x = -48 + rng() * 76, z = -93 + rng() * 60; if (Math.abs(x + 1 - Math.sin(z * 0.07) * 2) < 1.4) continue; if (rng() < 0.7) veg.ferns.push([x, z, 0.6 + rng() * 0.7, 'tall']); else veg.flowers.push([x, z, [0xf2d24b, 0xc07ad9, 0xffffff, 0xe7a0b0][Math.floor(rng() * 4)]]); }
      veg.grass.push([-48, 28, -93, -32, 1.8]);
      for (let z = -34; z > -94; z -= 2.4) { H.cyl({ r: 0.06, h: 1, x: -49.5, z, mat: 'darkwood', col: false }); H.cyl({ r: 0.06, h: 1, x: 29.5, z, mat: 'darkwood', col: false }); }
      R.sign(ctx, 1.6, -40, 0, 'WREN COTTAGE →', { w: 1.3 });
      const bh = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), M.color(0x0b0706, 1)); bh.position.set(2, 0.26, -31.25); root(ctx).add(bh);
      R.walls(-50, 30, -95, -30.5, -2, 5, { n: [[-3, 1]] });
    },
  });
  function root(ctx) { return ctx.root; }

  /* ================================================================ THE MOUNTAIN TRAIL */
  const TRAIL = [[0, -172], [-2, -180], [-10, -190], [-26, -198], [-40, -206], [-34, -216], [-20, -224], [-18, -234], [-32, -242], [-52, -244], [-66, -248], [-74, -258], [-68, -268], [-54, -274], [-44, -282], [-42, -292], [-40, -300]];
  const trailD = (x, z) => { let best = 1e9, t = 0; for (let i = 0; i < TRAIL.length - 1; i++) { const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; const k = cl(((x - ax) * dx + (z - az) * dz) / l2, 0, 1); const d = Math.hypot(x - ax - dx * k, z - az - dz * k); if (d < best) { best = d; t = i + k; } } return [best, t]; };
  const rise = (z) => 26 * ss(-172, -305, z) + 4 * ss(-285, -330, z);
  function mountH(x, z) {
    const [d, t] = trailD(x, z); const along = rise(TRAIL[Math.min(TRAIL.length - 1, Math.floor(t))][1] + (TRAIL[Math.min(TRAIL.length - 1, Math.ceil(t))][1] - TRAIL[Math.min(TRAIL.length - 1, Math.floor(t))][1]) * (t % 1));
    const wild = rise(z) + noise(x * 0.5, z * 0.5) * 3 + Math.abs(noise(x * 0.23 + 5, z * 0.23)) * 6 * ss(-190, -220, z) + 6 * ss(-120, -160, x) + 5 * ss(10, 38, x);
    let y = U.lerp(along, wild, ss(3.5, 12, d));
    const wfD = Math.hypot(x + 95, z + 232); y -= 1.4 * ss(5, 1, wfD); // pool below the falls
    if (Math.hypot(x + 40, z + 300) < 6) y = Math.max(y, along); // lookout knoll
    return y * ss(-170, -178, z);
  }
  P.mount = { gate: [0, 0, -174], meadow: [-20, 0, -228], falls: [-95, 0, -232], nimbus: [-26, 0, -256], sable: [-58, 0, -276], slide: [-52, 0, -271], lookout: [-40, 0, -300], cave: [-66, 0, -309], hawkHide: [-20, 0, -228] };
  R.def({
    id: 'mountain', navGround: true, name: 'The Mountain Trail', bounds: [-160, 40, -335, -172], preload: 40,
    areas: [
      ['lookout', "Rose's Lookout", -48, -32, -308, -292, { zone: 'mountain', surf: 'wood' }],
      ['mfalls', 'Little Falls', -104, -84, -244, -222, { zone: 'mountain', surf: 'stone' }],
      ['tallgrass', 'Tall Grass Meadow', -32, -8, -236, -218, { zone: 'mountain', surf: 'grass' }],
      ['mcave', 'The Cave Mouth', -74, -58, -318, -303, { zone: 'mountain', surf: 'stone', dim: 0.6 }],
      ['mountain', 'The Mountain Trail', -160, 40, -335, -172, { zone: 'mountain', surf: 'grass' }],
    ],
    terrains: [{ x0: -160, x1: 40, z0: -335, z1: -172, h: mountH }],
    nav: { nodes: Object.fromEntries(TRAIL.map(([x, z], i) => ['mt' + i, [x, 0, z]]).concat([['mtCave', [-64, 0, -306]], ['mtFall', [-90, 0, -236]], ['mtNim', [-28, 0, -254]]])), edges: 'wNG-mt0 ' + TRAIL.slice(1).map((_, i) => `mt${i}-mt${i + 1}`).join(' ') + ' mt16-mtCave mt10-mtFall mt8-mtNim' },
    build(ctx) {
      const { H, veg, gy } = ctx, rng = U.rng(1010);
      R.terrain(ctx, { x0: -160, x1: 40, z0: -335, z1: -172, seg: 120, h: mountH, key: 'mount', tex: ['grass', 'stone', 'dirt'], scale: 7,
        weights: (x, z, y, slope) => { const [d] = trailD(x, z); return [Math.max(0, 1 - slope * 2.2) * (1 - ss(18, 30, y) * 0.6), Math.min(1.5, slope * 2.6) + ss(18, 30, y) * 0.6, ss(2, 0.6, d) * 0.9]; } });
      R.path(ctx, TRAIL, 1.5, M.std('mountPath', { map: 'dirt', color: 0xc0a888, rough: 1 }));
      // cliffs along the steep sides keep Milo on the mountain
      R.walls(-160, 40, -335, -172, -5, 60, { s: [[-1.6, 1.6]] });
      for (let i = 0; i < TRAIL.length - 1; i++) { const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1]; for (let k = 0; k < 4; k++) { const t = k / 4, x = U.lerp(ax, bx, t), z = U.lerp(az, bz, t); const dx = bz - az, dz = -(bx - ax), l = Math.hypot(dx, dz) || 1; for (const s of [-1, 1]) if (rng() < 0.55) { const px = x + dx / l * s * (3.2 + rng() * 2), pz = z + dz / l * s * (3.2 + rng() * 2); if (trailD(px, pz)[0] > 2.6) veg.rocks.push([px, -0.3, pz, 0.5 + rng() * 0.9, 'rock', rng() < 0.3]); } } }
      // tall grass meadow where the hawk hunts
      veg.grass.push(['c', -20, -228, 9, 3.2]); for (let i = 0; i < 260; i++) { const a = rng() * 6.28, r = Math.sqrt(rng()) * 9; veg.ferns.push([-20 + Math.cos(a) * r, -228 + Math.sin(a) * r, 0.9 + rng() * 0.5, 'tall']); }
      for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r = rng() * 8; veg.flowers.push([-20 + Math.cos(a) * r, -228 + Math.sin(a) * r, [0x8a7ad9, 0xf2d24b, 0xffffff][i % 3]]); }
      // little falls: terraces of water stepping down the hillside into a pool
      const fy = gy(-95, -232); R.waterDisc(ctx, -95, -232, 4.2, fy + 0.9, { name: 'mfallsPool' });
      for (let i = 0; i < 4; i++) { const z = -238 - i * 3.4, x = -95 - i * 1.2, y = fy + 1.8 + i * 1.6; R.water(ctx, x - 1.2, x + 1.2, z - 1.4, z + 1.4, y, { hazard: false }); for (const s of [-1, 1]) veg.rocks.push([x + s * 1.7, y - gy(x + s * 1.7, z) - 0.2, z, 0.9, 'mossrock', true]); const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), fallMat()); f.position.set(x, y - 0.8, z + 1.45); ctx.root.add(f); f.userData.dynamic = true; (W.mFalls = W.mFalls || []).push(f); }
      for (let i = 0; i < 20; i++) veg.ferns.push([-95 + (rng() - 0.5) * 12, -236 + (rng() - 0.5) * 16, 0.8, rng() < 0.5 ? 'reed' : 'fern']);
      // rockslide across the switchback (climb around it on the ledges)
      for (let i = 0; i < 9; i++) veg.rocks.push([-52 + (rng() - 0.5) * 5, 0.1, -271.5 + (rng() - 0.5) * 3, 0.8 + rng() * 0.5, 'rock', true]);
      const ly = gy(-58, -266); for (let i = 0; i < 5; i++) { const x = -59 + i * 0.9, z = -266.5 - i * 0.7, y = gy(x, z) + 0.2 + i * 0.15; H.box({ w: 1, h: 0.3, d: 0.9, x, y: y - 0.3, z, mat: 'rock', climb: true, colY0: -2 }); }
      // Rose's lookout: a wooden platform with a view
      const ky = gy(-40, -300), deck = ky + 2.2;
      for (const [x, z] of [[-42.5, -302.5], [-37.5, -302.5], [-42.5, -297.5], [-37.5, -297.5]]) H.box({ w: 0.25, h: deck - ky + 1.1, d: 0.25, x, y: ky - 0.3, z, mat: 'darkwood', col: true });
      H.box({ w: 5.4, h: 0.12, d: 5.4, x: -40, y: deck - 0.12, z: -300, mat: 'midwood', col: false }); W.collider(-42.7, -37.3, -302.7, -297.3, deck - 0.3, deck, {});
      for (const [x0, z0, x1, z1] of [[-42.7, -302.7, -37.3, -302.7], [-42.7, -302.7, -42.7, -297.3], [-37.3, -302.7, -37.3, -297.3]]) { const alongX = z0 === z1; H.box({ w: alongX ? 5.4 : 0.08, h: 0.08, d: alongX ? 0.08 : 5.4, x: (x0 + x1) / 2, y: deck + 0.8, z: (z0 + z1) / 2, mat: 'darkwood', col: false }); W.collider(Math.min(x0, x1) - 0.05, Math.max(x0, x1) + 0.05, Math.min(z0, z1) - 0.05, Math.max(z0, z1) + 0.05, deck, deck + 0.9, { walk: false }); }
      R.stairs(ctx, -40, -293.4, gy(-40, -293.4), deck, '-z', 1); // up from the trail side
      const scope = new THREE.Group(); scope.position.set(-41.5, deck, -301.8); ctx.root.add(scope); { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 12), M.get('brass')); t.rotation.x = Math.PI / 2 - 0.3; t.position.y = 1; scope.add(t); const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), M.get('darkmetal')); s2.position.y = 0.5; scope.add(s2); }
      const tin = new THREE.Group(); tin.position.set(-38.5, deck, -301.5); ctx.root.add(tin); W.obj.paintTin = tin; tin.userData.dynamic = true;
      { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2), M.std('painttin', { color: 0x8a2a2a, rough: 0.4, metal: 0.4 })); b.position.y = 0.05; tin.add(b); for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), M.color([0xd9412f, 0xf2d24b, 0x3f6fa0, 0x5f9a3a, 0xffffff][i], 0.5)); d.position.set(-0.1 + i * 0.05, 0.105, 0); tin.add(d); } tin.traverse((o) => (o.userData.dynamic = true)); }
      P.mount.deckY = deck;
      // the cave mouth: an arch of rock with dark inside
      const cy = gy(-66, -310);
      const arch = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), M.get('rock')); arch.scale.set(5, 3.6, 4); arch.position.set(-66, cy + 1.2, -313); arch.castShadow = true; ctx.root.add(arch);
      const dark = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20, 0, Math.PI), M.color(0x080605, 1)); dark.position.set(-66, cy, -309.1); ctx.root.add(dark);
      W.collider(-71, -61, -318, -310, cy - 2, cy + 5, {});
      // trees thin out with height
      let n = 0;
      for (let i = 0; i < 3000 && n < 230; i++) { const x = -158 + rng() * 196, z = -333 + rng() * 160; const [d] = trailD(x, z); if (d < 5 || Math.hypot(x + 20, z + 228) < 10 || Math.hypot(x + 95, z + 236) < 9 || Math.hypot(x + 40, z + 300) < 8 || Math.hypot(x + 66, z + 311) < 7) continue; const y = gy(x, z); if (y > 24 && rng() < 0.7) continue; n++; const s = 0.8 + rng() * 0.8; if (rng() < 0.7 || y > 14) veg.pines.push([x, z, s * 1.15]); else veg.trees.push([x, z, s, rng() < 0.3 ? 'birch' : null]); }
      for (let i = 0; i < 380; i++) { const x = -158 + rng() * 196, z = -333 + rng() * 160; if (trailD(x, z)[0] < 2.5) continue; const r = rng(); if (r < 0.4) veg.rocks.push([x, -0.2, z, 0.3 + rng() * 0.7, rng() < 0.5 ? 'rock' : 'mossrock']); else if (r < 0.8) veg.ferns.push([x, z, 0.6 + rng() * 0.6, rng() < 0.4 ? 'tall' : 'fern']); else veg.bushes.push([x, 0.3, z, 0.5 + rng() * 0.4, 0x4d6e36]); }
      for (let i = 0; i < TRAIL.length; i++) veg.grass.push(['c', TRAIL[i][0], TRAIL[i][1], 3.5, 0.7]);
      ctx.def.noGrass = (x, z) => trailD(x, z)[0] < 0.9;
    },
    update(dt, g) { for (const f of W.mFalls || []) if (f.material.map) f.material.map.offset.y = -g.t * 1.1; },
  });

  /* ================================================================ distant peaks: a backdrop that follows the camera, so it always sits at the horizon */
  R.def({
    id: 'peaks', name: 'Peaks', bounds: [-1e5, 1e5, -1e5, 1e5], manual: true, always: true,
    build(ctx) {
      const rng = U.rng(55), snow = M.std('snowpeak', { color: 0xdfe6ee, rough: 0.8 }), rock = M.std('farrock', { color: 0x6a6e76, rough: 1, flat: true });
      const g = (W.obj.peaks = new THREE.Group()); ctx.root.add(g);
      for (let i = 0; i < 18; i++) {
        const a = -2.35 + i * 0.1 + (rng() - 0.5) * 0.05, d = 1 + rng() * 0.15, h = 0.12 + rng() * 0.11, r = 0.14 + rng() * 0.08;
        const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 3), rock); m.position.set(Math.cos(a) * d, h / 2 - 0.03, Math.sin(a) * d); m.rotation.y = rng() * 3; g.add(m);
        const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3, h * 0.3, 7, 1), snow); c.position.set(m.position.x, h * 0.85 - 0.03, m.position.z); c.rotation.y = m.rotation.y; g.add(c);
      }
      ctx.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.userData.dynamic = true; o.frustumCulled = false; } });
    },
    update(dt, g) { const p = W.obj.peaks; if (!p) return; const R2 = Math.min(400, ((G.GFX && G.GFX.viewDist) || 260) * 0.8); const cp = g.camera.position; p.position.set(cp.x, 0, cp.z); p.scale.setScalar(R2); p.visible = cp.y > UG + 12 && !(G.env && G.env.indoor); },
  });
  const oInit = G.EXT.init;
  G.EXT.init = function (g) { oInit(g); R.build(R.byId.peaks); };
})();
