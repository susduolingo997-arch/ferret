/* =====================================================================
   world.js - builds the connected world: Milo's house (bedroom, kitchen,
   living room, hallway, garage, basement), the backyard, the street and
   neighbours, the corner shop, the park and playground, the forest with
   its creek, clearing, abandoned workshop and cave, and the tunnels
   underneath it all. Also owns colliders, areas and the scent nav graph.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat;
  const W = (G.World = {
    colliders: [], areas: [], obj: {}, col: {}, lightSrc: [], hazards: [], tunnels: [], rugs: [], nightMats: [], skyPanes: [],
    grassZones: [], noGrass: [], trees: [], pines: [], bushes: [], rocks: [], flowers: [], ferns: [], puddles: [], updaters: [], camBoxes: [],
    UG: -40,
  });
  const UG = W.UG;
  let root;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------------------------------------------------------------- helpers */
  function uvBox(geo, w, h, d, s) {
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
    uv.needsUpdate = true;
  }
  function mat(m) { return typeof m === 'string' ? M.get(m) : Array.isArray(m) ? m.map(mat) : m; }
  function collider(x0, x1, z0, z1, y0, y1, o = {}) {
    const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1, climb: !!o.climb, cam: o.cam !== false, on: true, name: o.name, surf: o.surf, walk: o.walk !== false };
    W.colliders.push(c); if (o.name) W.col[o.name] = c; return c;
  }
  W.collider = collider;
  function box(o) {
    const geo = new THREE.BoxGeometry(o.w, o.h, o.d); if (o.s) uvBox(geo, o.w, o.h, o.d, o.s);
    const m = new THREE.Mesh(geo, mat(o.mat)); m.position.set(o.x, (o.y || 0) + o.h / 2, o.z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; (o.parent || root).add(m);
    if (o.col !== false && !o.parent) {
      const sw = o.ry && Math.abs(Math.sin(o.ry)) > 0.7; const hw = (sw ? o.d : o.w) / 2, hd = (sw ? o.w : o.d) / 2;
      collider(o.x - hw, o.x + hw, o.z - hd, o.z + hd, (o.y || 0) + (o.colY0 || 0), (o.y || 0) + o.h, o);
    }
    if (o.name) W.obj[o.name] = m;
    return m;
  }
  function cyl(o) {
    const geo = new THREE.CylinderGeometry(o.rt ?? o.r, o.r, o.h, o.seg || 16, 1, !!o.open);
    const m = new THREE.Mesh(geo, mat(o.mat)); m.position.set(o.x, (o.y || 0) + (o.rx || o.rz ? 0 : o.h / 2), o.z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.ry) m.rotation.y = o.ry;
    m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || root).add(m);
    if (o.col && !o.parent) { const r = o.r * 0.85; collider(o.x - r, o.x + r, o.z - r, o.z + r, o.y || 0, (o.y || 0) + o.h, o); }
    if (o.name) W.obj[o.name] = m;
    return m;
  }
  function sph(o) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, o.seg || 16, o.seg ? Math.ceil(o.seg * 0.7) : 12), mat(o.mat)); m.scale.set(o.r * (o.sx || 1), o.r * (o.sy || 1), o.r * (o.sz || 1));
    m.position.set(o.x, o.y, o.z); m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || root).add(m); if (o.name) W.obj[o.name] = m; return m;
  }
  function plane(x0, x1, z0, z1, y, m, s, o = {}) {
    const w = x1 - x0, d = z1 - z0, geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * d / s);
    const me = new THREE.Mesh(geo, mat(m)); me.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); me.receiveShadow = true; if (o.po) { me.material = me.material.clone(); me.material.polygonOffset = true; me.material.polygonOffsetFactor = -o.po; me.material.polygonOffsetUnits = -o.po; }
    (o.parent || root).add(me); return me;
  }
  function disc(x, z, r, y, m, s, o = {}) {
    const geo = new THREE.CircleGeometry(r, 32); geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2 / s, uv.getY(i) * r * 2 / s);
    const me = new THREE.Mesh(geo, mat(m)); me.position.set(x, y, z); me.receiveShadow = true; root.add(me); if (o.name) W.obj[o.name] = me; return me;
  }
  function area(id, name, x0, x1, z0, z1, o = {}) { W.areas.push(Object.assign({ id, name, x0, x1, z0, z1 }, o)); }
  function light(x, y, z, color, int, dist, o = {}) { const L = Object.assign({ x, y, z, color: new THREE.Color(color), int, dist, flicker: 0 }, o); W.lightSrc.push(L); return L; }
  function blob(x, z, rx, rz, y = 0.004) { const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), M.get('shadow')); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.004, z); m.renderOrder = 1; root.add(m); return m; }
  const rng = U.rng(1234);

  /* walls with openings. Axis-aligned only. gaps: [[from, to, top]] along the wall */
  function wall(x0, z0, x1, z1, h, t, mA, mB, gaps = [], o = {}) {
    const alongX = z0 === z1; const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const segs = []; let cur = a0; const gs = gaps.slice().sort((a, b) => a[0] - b[0]);
    for (const [g0, g1, top] of gs) { if (g0 > cur) segs.push([cur, g0, 0, h]); if (top < h) segs.push([g0, g1, top, h]); cur = g1; }
    if (cur < a1) segs.push([cur, a1, 0, h]);
    const y0 = o.y || 0;
    for (const [s0, s1, b, tp] of segs) {
      const len = s1 - s0, mid = (s0 + s1) / 2, hh = tp - b;
      // materials: faces px,nx,py,ny,pz,nz
      const edge = mat(o.edge || mA), A = mat(mA), B = mat(mB);
      const mats = alongX ? [edge, edge, edge, edge, A, B] : [A, B, edge, edge, edge, edge];
      const geo = new THREE.BoxGeometry(alongX ? len : t, hh, alongX ? t : len); uvBox(geo, alongX ? len : t, hh, alongX ? t : len, o.s || 1.6);
      if (o.vOffset !== false) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + b / (o.s || 1.6)); }
      const m = new THREE.Mesh(geo, mats); m.position.set(alongX ? mid : x0, y0 + b + hh / 2, alongX ? z0 : mid); m.castShadow = true; m.receiveShadow = true; root.add(m);
      if (alongX) collider(s0, s1, z0 - t / 2, z0 + t / 2, y0 + b, y0 + tp, { walk: false }); else collider(x0 - t / 2, x0 + t / 2, s0, s1, y0 + b, y0 + tp, { walk: false });
      // skirting board
      if (o.skirt && b === 0) {
        const sk = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : t + 0.04, 0.1, alongX ? t + 0.04 : len), M.get(o.skirt)); sk.position.set(alongX ? mid : x0, y0 + 0.05, alongX ? z0 : mid); sk.receiveShadow = true; root.add(sk);
      }
    }
  }
  /* window: exterior glowing pane + interior sky pane with curtains */
  function windowAt(x, y, z, ry, w, h, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    const frameM = M.get('whitewood');
    for (const side of o.inside === false ? [1] : o.outside === false ? [-1] : [1, -1]) {
      const off = side * (o.t || 0.09);
      [[0, h / 2, w + 0.12, 0.07], [0, -h / 2, w + 0.16, 0.08], [-w / 2, 0, 0.07, h], [w / 2, 0, 0.07, h], [0, 0, 0.04, h], [0, 0.02, w, 0.04]].forEach(([fx, fy, fw, fh]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.05), frameM); b.position.set(fx, fy, off); g.add(b); });
      if (side > 0) { // outside: warm at night
        const pm = M.std('winOut', { color: 0x223040, rough: 0.1, metal: 0.3, emissive: 0xffc47a, ei: 0, envI: 1.5 }); if (!W.nightMats.includes(pm)) W.nightMats.push(pm);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm); p.position.z = off - 0.01; g.add(p);
      } else {
        const sm = new THREE.MeshBasicMaterial({ color: 0x9fc3e8 }); W.skyPanes.push(sm);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sm); p.position.z = off + 0.02; p.rotation.y = Math.PI; g.add(p);
        if (o.curtain !== false) for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, h + 0.3, 0.04), M.std('curtain' + (o.cc || 0), { color: o.cc || 0xc9826b, rough: 1, map: 'fabric' })); c.position.set(sx * (w / 2 + 0.05), 0, off - 0.06); c.castShadow = true; g.add(c); }
        if (o.sill !== false) { const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.05, 0.22), frameM); s.position.set(0, -h / 2 - 0.05, off - 0.1); g.add(s); }
      }
    }
    return g;
  }
  function doorPanel(x, z, ry, w, h, m, o = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const bt = o.bottom || 0;
    const d = new THREE.Mesh(new THREE.BoxGeometry(w, h - bt, 0.05), mat(m)); d.position.set(0, bt + (h - bt) / 2, 0); d.castShadow = true; d.receiveShadow = true; g.add(d);
    for (const [py, ph] of [[h * 0.72, h * 0.35], [h * 0.3 + bt * 0.5, h * 0.35 - bt]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, ph, 0.06), mat(o.panel || m)); p.position.set(0, py, 0); p.scale.set(1, 1, 1.1); g.add(p); }
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.get('brass')); k.position.set(w * 0.38, h * 0.47, 0.05); g.add(k); const k2 = k.clone(); k2.position.z = -0.05; g.add(k2);
    return g;
  }
  function roofPrism(cx, cz, len, span, wallTop, rise, alongX, m1, m2) {
    const sh = new THREE.Shape(); sh.moveTo(-span / 2, 0); sh.lineTo(span / 2, 0); sh.lineTo(0, rise); sh.lineTo(-span / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2);
    // UVs for the slopes
    const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i); uv.setXY(i, pz / 1.5, (Math.abs(px) + py) / 1.2); }
    const m = new THREE.Mesh(geo, [mat(m2), mat(m1)]); m.position.set(cx, wallTop, cz); if (alongX) m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = true; root.add(m);
    return m;
  }
  function fence(x0, z0, x1, z1, h, gaps = [], o = {}) {
    const alongX = z0 === z1, len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    wall(x0, z0, x1, z1, h, 0.06, o.mat || 'fence', o.mat || 'fence', gaps, { s: 1.2, edge: o.mat || 'fence' });
    const n = Math.round(len / 2.4); for (let i = 0; i <= n; i++) { const t = i / n; const px = alongX ? U.lerp(x0, x1, t) : x0, pz = alongX ? z0 : U.lerp(z0, z1, t); box({ w: 0.12, h: h + 0.1, d: 0.12, x: px, z: pz, mat: 'darkwood', col: false }); }
    if (o.rail !== false) { const rl = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 0.08, alongX ? 0.05 : len), M.get('fence')); rl.position.set((x0 + x1) / 2 + (alongX ? 0 : 0.05), h * 0.8, (z0 + z1) / 2 + (alongX ? 0.05 : 0)); rl.castShadow = true; root.add(rl); }
  }
  function hedge(x0, z0, x1, z1, h, t = 1.2, gaps = []) {
    const alongX = z0 === z1; const hm = M.std('hedge', { color: 0x4d6e36, rough: 0.95, map: 'foliage' });
    wall(x0, z0, x1, z1, h, t, hm, hm, gaps, { s: 2, edge: hm });
    const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.floor(len / 1.1);
    for (let i = 0; i < n; i++) { const tt = (i + 0.5) / n; const px = alongX ? U.lerp(x0, x1, tt) : x0, pz = alongX ? z0 : U.lerp(z0, z1, tt); if (gaps.some(([a, b]) => { const v = alongX ? px : pz; return v > a - 0.6 && v < b + 0.6; })) continue; W.bushes.push([px, h - 0.1 + rng() * 0.2, pz, 0.7 + rng() * 0.3, 0x4d6e36]); }
  }

  /* ---------------------------------------------------------------- build */
  W.build = function (scene) {
    root = new THREE.Group(); root.name = 'world'; scene.add(root); W.root = root;
    if (G.EXT && G.EXT.preBuild) G.EXT.preBuild(W);
    buildGround(); buildHouse(); buildBedroom(); buildKitchen(); buildLiving(); buildHall(); buildGarage();
    buildBackyard(); buildStreet(); buildNeighbours(); buildShop(); buildPark(); buildForest(); buildShed(); buildCave();
    buildBasement(); buildTunnels();
    if (G.EXT && G.EXT.buildWorld) G.EXT.buildWorld(W);
    buildAreas(); buildNav();
    if (G.EXT && G.EXT.buildNav) G.EXT.buildNav(W);
    buildInstanced(scene);
    root.traverse((o) => { if (o.isMesh && !o.userData.dynamic) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
    mergeStatic();
  };

  /* Batch static meshes that share a material into one mesh per 32 m cell: far fewer draw calls. */
  function mergeStatic(top) {
    const root0 = root; top = top || root; root.updateMatrixWorld(true);
    const keep = new Set(); for (const k in W.obj) W.obj[k].traverse((o) => keep.add(o));
    const groups = new Map(), victims = [];
    top.traverse((o) => {
      if (!o.isMesh || keep.has(o) || Array.isArray(o.material) || o.isInstancedMesh) return;
      for (let p = o; p && p !== top; p = p.parent) if (p.userData.dynamic || keep.has(p) || p.userData.region) return;
      const g = o.geometry; if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      const c = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
      const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder + '|' + Math.floor(c.x / 32) + ',' + Math.floor(c.y / 20) + ',' + Math.floor(c.z / 32);
      if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder, list: [] });
      groups.get(key).list.push(o); victims.push(o);
    });
    let merged = 0;
    for (const grp of groups.values()) {
      if (grp.list.length < 2) continue;
      let n = 0; const parts = grp.list.map((o) => { const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); g.applyMatrix4(o.matrixWorld); n += g.attributes.position.count; return g; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let off = 0;
      for (const g of parts) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); uv.set(g.attributes.uv.array, off * 2); off += g.attributes.position.count; g.dispose(); }
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); mg.computeBoundingSphere();
      const m = new THREE.Mesh(mg, grp.mat); m.castShadow = grp.cast; m.receiveShadow = grp.recv; m.renderOrder = grp.ro; m.matrixAutoUpdate = false; top.add(m);
      for (const o of grp.list) o.parent.remove(o);
      merged += grp.list.length;
    }
    W.mergedCount = (W.mergedCount || 0) + merged;
  }
  W.mergeStatic = (g) => { g.traverse((o) => { if (o.isMesh && !o.userData.dynamic) { o.updateMatrix(); o.matrixAutoUpdate = false; } }); mergeStatic(g); };

  function buildGround() {
    const town = plane(-50.2, 92, -32, 66, 0, 'grass', 6); town.name = 'townGround';
    const forest = plane(-140, -50, -70, 80, 0, 'forestfloor', 7);
    // the far ground leaves room for the sequel's terrain (Far Wood, Wren Cottage, the meadow, the mountains)
    const fg = M.std('farground', { color: 0x3d5230, rough: 1 });
    plane(-200, 220, -30.5, 200, -0.03, fg, 50); plane(-200, -50, -70, -30.5, -0.03, fg, 50); plane(30, 220, -70, -30.5, -0.03, fg, 50);
    plane(-200, -150, -172, -70, -0.03, fg, 50); plane(30, 220, -172, -70, -0.03, fg, 50);
    W.noGrass.push([-8.2, 8.2, -6.2, 6.2], [8, 14.2, -2.2, 6.2]);
  }

  /* ================================================================ HOUSE shell */
  function buildHouse() {
    const H = 2.6, T = 0.16;
    // floors
    plane(-8, 0, -6, 0, 0.004, 'planks', 1.8); plane(0, 8, -6, 0, 0.004, 'tiles', 1.2); plane(-8, 2, 0, 6, 0.004, 'planks', 1.8); plane(2, 8, 0, 6, 0.004, 'planks', 1.8);
    plane(8, 14, -2, 6, 0.004, 'concrete', 2);
    // foundation
    box({ w: 16.6, h: 0.34, d: 12.6, x: 0, y: -0.34, z: 0, mat: 'brick', s: 1.4, col: false });
    // exterior walls (outside: siding, inside: wallpaper)
    wall(-8, -6, 8, -6, H, T, 'wallpaper', 'siding', [[4.8, 5.2, 0.34]], { skirt: 'basewood' });  // north, pet flap
    wall(-8, 6, 8, 6, H, T, 'siding', 'wallpaper', [], { skirt: 'basewood' });                     // south
    wall(-8, -6, -8, 6, H, T, 'wallpaper', 'siding', [], { skirt: 'basewood' });                   // west
    wall(8, -6, 8, -2, H, T, 'siding', 'tiles', [], {});                                          // kitchen east (outside)
    wall(8, -2, 8, 6, H, T, 'plaster', 'wallpaper2', [[3.4, 4.2, 2.1]], { skirt: 'basewood' });   // hall | garage
    // interior walls
    wall(-8, 0, 8, 0, H, 0.12, 'wallpaper2', 'wallpaper', [[-2.4, -1.4, 2.1], [3, 4, 2.1]], { skirt: 'basewood' });
    wall(0, -6, 0, 0, H, 0.12, 'tiles', 'wallpaper', [[-3.35, -3.0, 0.3]], { skirt: 'basewood' });
    wall(2, 0, 2, 6, H, 0.12, 'wallpaper2', 'wallpaper2', [[2.4, 3.6, 2.1]], { skirt: 'basewood' });
    // garage walls
    wall(8, -2, 14, -2, 2.4, T, 'concrete', 'siding', [], { s: 2 });
    wall(14, -2, 14, 6, 2.4, T, 'siding', 'concrete', [], { s: 2 });
    wall(8, 6, 14, 6, 2.4, T, 'siding', 'concrete', [[12.6, 13.0, 0.25]], { s: 2 });
    collider(12.6, 13.0, 5.9, 6.1, 0, 0.25, { name: 'garageGap' });
    collider(4.8, 5.2, -6.1, -5.9, 0, 0.34, { name: 'petFlap' });
    // ceiling
    const ceil = plane(-8, 8, -6, 6, H, 'plaster', 3); ceil.rotation.x = Math.PI; ceil.position.y = H; ceil.castShadow = true;
    const ceil2 = plane(8, 14, -2, 6, 2.4, 'concrete', 3); ceil2.rotation.x = Math.PI; ceil2.position.y = 2.4; ceil2.castShadow = true;
    collider(-8, 8, -6, 6, H, H + 0.3, { walk: false }); collider(8, 14, -2, 6, 2.4, 2.7, { walk: false });
    // roofs
    roofPrism(0, 0, 17.4, 13.4, H + 0.05, 2.1, true, 'shingles', 'siding');
    roofPrism(11, 2, 8.6, 6.8, 2.45, 1.2, false, 'shingles', 'siding');
    box({ w: 0.8, h: 2.2, d: 0.8, x: -5, y: 3.6, z: -2.5, mat: 'brick', s: 1.2, col: false });
    // front door + back door + garage door
    doorPanel(5, 6.1, 0, 1, 2.1, 'red', { panel: 'red' });
    doorPanel(5, 6.02 - 0.12, Math.PI, 1, 2.1, 'whitewood');
    doorPanel(5, -6.1, Math.PI, 1, 2.1, 'paintwood', { bottom: 0.36 }); doorPanel(5, -5.92, 0, 1, 2.1, 'whitewood', { bottom: 0.36 });
    box({ w: 0.5, h: 0.02, d: 0.22, x: 5, y: 0.34, z: -6, mat: 'whitewood', col: false }); box({ w: 0.04, h: 0.36, d: 0.22, x: 4.78, y: 0, z: -6, mat: 'whitewood', col: false }); box({ w: 0.04, h: 0.36, d: 0.22, x: 5.22, y: 0, z: -6, mat: 'whitewood', col: false });
    box({ w: 0.28, h: 0.36, d: 0.22, x: 4.64, y: 0, z: -6, mat: 'paintwood', col: false }); box({ w: 0.28, h: 0.36, d: 0.22, x: 5.36, y: 0, z: -6, mat: 'paintwood', col: false });
    // pet flap (swings when Milo passes)
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.33, 0.02), M.std('flap', { color: 0xd9e2e0, rough: 0.2, transparent: true, opacity: 0.55 })); const fp = new THREE.Group(); fp.position.set(5, 0.34, -6); flap.position.y = -0.165; fp.add(flap); root.add(fp); fp.userData.dynamic = true; flap.userData.dynamic = true; W.obj.flap = fp;
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.2), M.std('flapframe', { color: 0xeeeeee, rough: 0.4 })); fr.position.set(5, 0.2, -6); fr.scale.set(1, 1, 1); root.add(fr); fr.visible = false;
    const gd = new THREE.Mesh(new THREE.BoxGeometry(4, 2.1, 0.08), M.std('garagedoor', { color: 0xe8e2d4, rough: 0.6, map: 'siding' })); gd.position.set(11, 1.05 + 0.25, 6.08); gd.castShadow = true; root.add(gd);
    const gd2 = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 0.08), gd.material); gd2.position.set(10.6, 0.125, 6.08); root.add(gd2); gd2.scale.x = 0.8; gd2.position.x = 10.8 - 0.4;
    box({ w: 0.12, h: 0.14, d: 0.12, x: 12.9, y: 0.01, z: 6.1, mat: 'midwood', col: false, name: 'garageStick', ry: 0.4 }).visible = false; W.obj.garageStick.userData.dynamic = true;
    // windows
    windowAt(-4.5, 1.5, -6, Math.PI, 1.4, 1.1, { cc: 0x7d98b3 }); windowAt(2, 1.6, -6, Math.PI, 1.6, 0.9, { cc: 0xd9b36a, curtain: false });
    windowAt(-5, 1.5, 6, 0, 1.6, 1.2); windowAt(-1.2, 1.5, 6, 0, 1.2, 1.2); windowAt(6.8, 1.6, 6, 0, 0.7, 0.9, { cc: 0x9fb59a });
    windowAt(-8, 1.5, -3, -Math.PI / 2, 1.2, 1.1, { cc: 0x7d98b3 }); windowAt(-8, 1.5, 3.2, -Math.PI / 2, 1.2, 1.1);
    windowAt(8, 1.6, -4, Math.PI / 2, 1.1, 0.9, { curtain: false });
    windowAt(14, 1.5, 2, Math.PI / 2, 1.2, 0.7, { curtain: false, sill: false });
    // porch step + lamp
    box({ w: 2.2, h: 0.12, d: 1, x: 5, y: 0, z: 6.6, mat: 'stone', s: 1, climb: true });
    const pl = box({ w: 0.18, h: 0.3, d: 0.18, x: 6, y: 1.9, z: 6.18, mat: M.std('porchlamp', { color: 0x333333, emissive: 0xffc070, ei: 0 }), col: false }); W.nightMats.push(pl.material);
    light(6, 1.9, 6.6, 0xffc070, 1.2, 7, { night: true });
    area('bedroom', "Ellie's Bedroom", -8, 0, -6, 0, { indoor: true, zone: 'house', surf: 'wood' });
    area('kitchen', 'Kitchen', 0, 8, -6, 0, { indoor: true, zone: 'house', surf: 'tile' });
    area('living', 'Living Room', -8, 2, 0, 6, { indoor: true, zone: 'house', surf: 'wood' });
    area('hall', 'Hallway', 2, 8, 0, 6, { indoor: true, zone: 'house', surf: 'wood' });
    area('garage', 'Garage', 8, 14, -2, 6, { indoor: true, zone: 'house', surf: 'stone' });
  }

  /* ================================================================ BEDROOM */
  function buildBedroom() {
    // rug
    disc(-4, -2.4, 1.4, 0.012, 'rug2', 2.8); W.rugs.push([-5.4, -2.6, -3.8, -1]);
    // Ellie's bed (walk underneath!)
    box({ w: 2.1, h: 1.1, d: 0.12, x: -5.5, z: -5.88, mat: 'midwood' });
    box({ w: 2.1, h: 0.25, d: 2.2, x: -5.5, y: 0.3, z: -4.7, mat: 'midwood', colY0: 0 });
    for (const [lx, lz] of [[-6.5, -3.65], [-4.5, -3.65]]) box({ w: 0.1, h: 0.3, d: 0.1, x: lx, z: lz, mat: 'midwood' });
    box({ w: 2.1, h: 0.4, d: 0.1, x: -5.5, z: -3.6, y: 0.32, mat: 'midwood', col: false });
    box({ w: 2.0, h: 0.18, d: 2.1, x: -5.5, y: 0.55, z: -4.75, mat: 'linen', col: false });
    const quilt = box({ w: 2.08, h: 0.1, d: 1.5, x: -5.5, y: 0.68, z: -4.3, mat: 'quilt', s: 1.2, col: false }); W.obj.quilt = quilt;
    box({ w: 0.7, h: 0.14, d: 0.45, x: -5.9, y: 0.72, z: -5.5, mat: 'linen', col: false }); box({ w: 0.7, h: 0.14, d: 0.45, x: -5.05, y: 0.72, z: -5.5, mat: 'linen', col: false });
    collider(-6.55, -4.45, -5.9, -3.6, 0.3, 0.85, { climb: false });
    // Ellie (asleep at night, sits up for the ending)
    const ellie = new THREE.Group(); ellie.position.set(-5.5, 0.7, -5.0); root.add(ellie); ellie.userData.dynamic = true; W.obj.ellie = ellie;
    const skin = M.std('skin', { color: 0xf0c7a8, rough: 0.7 }), hair = M.std('hair', { color: 0x5a3320, rough: 0.8 }), pj = M.std('pj', { color: 0x8fb0d4, rough: 0.9, map: 'fabric' });
    const lump = sph({ x: 0, y: 0.1, z: 0.75, r: 0.35, sx: 1, sy: 0.45, sz: 1.9, mat: 'quilt', parent: ellie }); lump.userData.dynamic = true;
    const torso = new THREE.Group(); ellie.add(torso); W.obj.ellieTorso = torso;
    sph({ x: 0, y: 0.3, z: 0, r: 0.2, sx: 1.1, sy: 1.6, sz: 0.8, mat: pj, parent: torso });
    const head = new THREE.Group(); head.position.set(0, 0.68, 0); torso.add(head);
    sph({ x: 0, y: 0, z: 0, r: 0.14, mat: skin, parent: head }); sph({ x: 0, y: 0.04, z: -0.03, r: 0.155, sy: 0.95, mat: hair, parent: head });
    for (const sx of [-1, 1]) { sph({ x: sx * 0.12, y: -0.08, z: -0.05, r: 0.07, sy: 1.6, mat: hair, parent: head }); sph({ x: sx * 0.05, y: 0.0, z: 0.13, r: 0.018, mat: M.color(0x2a1a10, 0.3), parent: head }); }
    const arms = new THREE.Group(); torso.add(arms); W.obj.ellieArms = arms;
    for (const sx of [-1, 1]) { const a = cyl({ r: 0.05, h: 0.45, x: sx * 0.2, y: 0.18, z: 0.12, mat: pj, parent: arms, rx: 1.2 }); }
    torso.rotation.x = -Math.PI / 2 + 0.15; torso.position.set(0, 0.1, 0.2);
    ellie.traverse((o) => (o.userData.dynamic = true));
    // nightstand + lamp
    box({ w: 0.55, h: 0.55, d: 0.5, x: -4.05, z: -5.7, mat: 'midwood', climb: true, name: 'nightstand' });
    cyl({ r: 0.08, h: 0.25, x: -4.1, y: 0.55, z: -5.8, mat: 'ceramic' }); cyl({ r: 0.2, rt: 0.12, h: 0.22, x: -4.1, y: 0.78, z: -5.8, mat: 'lampshade', open: true });
    light(-4.1, 0.9, -5.6, 0xffb866, 1.4, 5, { night: true, room: 'bedroom' });
    // Milo's basket
    const bk = cyl({ r: 0.45, rt: 0.5, h: 0.18, x: -3, z: -4.6, mat: M.std('wicker', { color: 0xb88a55, rough: 0.9, map: 'shedwood' }), open: true });
    bk.material.side = THREE.DoubleSide;
    cyl({ r: 0.42, h: 0.08, x: -3, y: 0.01, z: -4.6, mat: 'cushion' });
    sph({ x: -3.15, y: 0.1, z: -4.75, r: 0.14, sy: 0.5, mat: M.std('blanket', { color: 0x8fa77e, rough: 1, map: 'fabric' }) });
    // desk + chair
    box({ w: 1.5, h: 0.05, d: 0.7, x: -1.7, y: 0.72, z: -5.6, mat: 'whitewood', climb: true, colY0: 0 , col: false });
    collider(-2.45, -0.95, -5.95, -5.25, 0.68, 0.77, { climb: true });
    for (const [lx, lz] of [[-2.4, -5.3], [-1.0, -5.3], [-2.4, -5.9], [-1.0, -5.9]]) box({ w: 0.05, h: 0.72, d: 0.05, x: lx, z: lz, mat: 'whitewood' });
    box({ w: 0.45, h: 0.05, d: 0.45, x: -1.7, y: 0.42, z: -4.85, mat: 'midwood', climb: true, colY0: -0.02, col: false }); collider(-1.93, -1.47, -5.08, -4.62, 0.4, 0.47, { climb: true });
    box({ w: 0.45, h: 0.5, d: 0.05, x: -1.7, y: 0.47, z: -4.62, mat: 'midwood', col: false });
    for (const [lx, lz] of [[-1.9, -5.05], [-1.5, -5.05], [-1.9, -4.65], [-1.5, -4.65]]) box({ w: 0.04, h: 0.42, d: 0.04, x: lx, z: lz, mat: 'midwood', col: false });
    // desk items: books, a globe, pencil cup
    box({ w: 0.3, h: 0.06, d: 0.22, x: -2.1, y: 0.77, z: -5.7, mat: M.color(0x3b6fb5), col: false }); box({ w: 0.28, h: 0.05, d: 0.2, x: -2.1, y: 0.83, z: -5.7, mat: M.color(0xc0492f), col: false });
    sph({ x: -1.2, y: 0.95, z: -5.75, r: 0.12, mat: M.std('globe', { color: 0x5f9ec9, rough: 0.4 }) }); cyl({ r: 0.02, h: 0.12, x: -1.2, y: 0.77, z: -5.75, mat: 'brass' });
    // bookshelf / wardrobe / toy chest
    box({ w: 0.4, h: 1.9, d: 1.4, x: -7.75, z: -4.3, mat: 'darkwood' });
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.6), M.std('booksM', { map: 'books', rough: 0.9 })); bs.rotation.y = Math.PI / 2; bs.position.set(-7.54, 1.0, -4.3); root.add(bs);
    box({ w: 0.6, h: 2, d: 1.2, x: -7.65, z: -0.9, mat: 'whitewood' });
    box({ w: 0.9, h: 0.45, d: 0.55, x: -7.4, z: -2.2, mat: M.std('toychest', { color: 0x4f7fa8, rough: 0.7 }), climb: true, name: 'toychest' });
    const lid = box({ w: 0.92, h: 0.06, d: 0.57, x: -7.4, y: 0.45, z: -2.2, mat: M.std('toylid', { color: 0xe0b46a, rough: 0.7 }), col: false, name: 'toylid' }); lid.userData.dynamic = true;
    // wall art and details
    for (const [px, pc] of [[-6.8, 0xe9c46a], [-5.9, 0x8fb0a1], [-2.2, 0xd98f6a]]) { box({ w: 0.5, h: 0.4, d: 0.03, x: px, y: 1.5, z: -5.9, mat: M.color(pc, 0.9), col: false }); }
    box({ w: 0.03, h: 0.5, d: 0.7, x: -0.08, y: 1.4, z: -2, mat: M.std('poster', { color: 0xf2e3c4, rough: 0.9 }), col: false });
    // a potted plant and slippers
    cyl({ r: 0.16, rt: 0.2, h: 0.3, x: -7.5, z: -5.6, mat: M.color(0xb5653d), col: true }); sph({ x: -7.5, y: 0.55, z: -5.6, r: 0.3, mat: M.std('plant', { color: 0x4f7a3a, rough: 0.8, map: 'foliage' }) });
    box({ w: 0.12, h: 0.06, d: 0.26, x: -6.9, z: -3.3, mat: M.color(0xe79a9a), col: false, ry: 0.3 }); box({ w: 0.12, h: 0.06, d: 0.26, x: -6.7, z: -3.35, mat: M.color(0xe79a9a), col: false, ry: -0.1 });
    // ceiling lamp
    light(-4, 2.3, -2.5, 0xffe2b0, 0.9, 7, { day: false, room: 'bedroom', dim: true });
  }

  /* ================================================================ KITCHEN */
  function buildKitchen() {
    // counters
    box({ w: 4.2, h: 0.88, d: 0.62, x: 2.2, z: -5.66, mat: 'cabinet' }); box({ w: 4.3, h: 0.05, d: 0.66, x: 2.2, y: 0.88, z: -5.64, mat: 'counter', col: false });
    box({ w: 2.2, h: 0.88, d: 0.62, x: 6.9, z: -5.66, mat: 'cabinet' }); box({ w: 2.3, h: 0.05, d: 0.66, x: 6.9, y: 0.88, z: -5.64, mat: 'counter', col: false });
    for (let i = 0; i < 6; i++) box({ w: 0.62, h: 0.7, d: 0.02, x: 0.5 + i * 0.68, y: 0.1, z: -5.34, mat: M.color(0x86a594, 0.55), col: false });
    for (let i = 0; i < 6; i++) sph({ x: 0.5 + i * 0.68, y: 0.7, z: -5.32, r: 0.02, mat: 'brass' });
    // the bottom drawer (tiny key)
    const dr = box({ w: 0.6, h: 0.2, d: 0.5, x: 1.35, y: 0.02, z: -5.35, mat: M.color(0x93b3a2, 0.55), col: false, name: 'drawer' }); dr.userData.dynamic = true;
    // sink, stove, fridge
    box({ w: 0.7, h: 0.05, d: 0.45, x: 2.2, y: 0.89, z: -5.6, mat: 'chrome', col: false }); cyl({ r: 0.02, h: 0.3, x: 2.2, y: 0.92, z: -5.85, mat: 'chrome' });
    box({ w: 0.8, h: 0.03, d: 0.6, x: 6.6, y: 0.92, z: -5.65, mat: 'darkmetal', col: false });
    for (const [bx, bz] of [[6.4, -5.5], [6.8, -5.5], [6.4, -5.8], [6.8, -5.8]]) cyl({ r: 0.09, h: 0.01, x: bx, y: 0.95, z: bz, mat: 'darkmetal', seg: 12 });
    const pot = cyl({ r: 0.14, h: 0.16, x: 6.4, y: 0.96, z: -5.5, mat: M.color(0xb23a2e, 0.35, 0.3) });
    box({ w: 0.8, h: 1.9, d: 0.72, x: 7.58, z: -4.2, mat: M.std('fridge', { color: 0xe8e4d8, rough: 0.3 }) });
    box({ w: 0.04, h: 0.5, d: 0.04, x: 7.2, y: 1.1, z: -4.5, mat: 'chrome', col: false });
    for (const [mx, mc] of [[1.2, 0xe2463b], [1.4, 0xf5cf2f], [1.5, 0x3b6fb5]]) box({ w: 0.02, h: 0.08, d: 0.08, x: 7.17, y: mx, z: -4.2 + (mx - 1.3), mat: M.color(mc), col: false });
    // upper cabinets
    box({ w: 1.6, h: 0.7, d: 0.35, x: 0.9, y: 1.5, z: -5.82, mat: 'cabinet', col: false }); box({ w: 1.4, h: 0.7, d: 0.35, x: 3.5, y: 1.5, z: -5.82, mat: 'cabinet', col: false });
    // table and chairs (climbable)
    box({ w: 1.5, h: 0.06, d: 1, x: 4, y: 0.72, z: -2.8, mat: 'midwood', col: false }); collider(3.25, 4.75, -3.3, -2.3, 0.7, 0.78, { climb: true });
    for (const [lx, lz] of [[3.35, -3.2], [4.65, -3.2], [3.35, -2.4], [4.65, -2.4]]) box({ w: 0.07, h: 0.72, d: 0.07, x: lx, z: lz, mat: 'midwood' });
    for (const cx of [2.9, 5.1]) {
      box({ w: 0.45, h: 0.05, d: 0.45, x: cx, y: 0.42, z: -2.8, mat: 'midwood', col: false }); collider(cx - 0.23, cx + 0.23, -3.03, -2.57, 0.4, 0.47, { climb: true });
      const bx = cx < 4 ? cx - 0.2 : cx + 0.2; box({ w: 0.05, h: 0.55, d: 0.45, x: bx, y: 0.47, z: -2.8, mat: 'midwood', col: false });
      for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box({ w: 0.04, h: 0.42, d: 0.04, x: cx + a, z: -2.8 + b, mat: 'midwood', col: false });
    }
    // on the table: fruit bowl, treat jar, cups
    cyl({ r: 0.2, rt: 0.25, h: 0.08, x: 3.7, y: 0.78, z: -2.8, mat: 'ceramic' }); for (let i = 0; i < 4; i++) sph({ x: 3.62 + (i % 2) * 0.14, y: 0.88 + (i > 1 ? 0.06 : 0), z: -2.85 + Math.floor(i / 2) * 0.1, r: 0.06, mat: M.color([0xd9412f, 0xe8a33b, 0x9ab83a, 0xd9412f][i], 0.5) });
    cyl({ r: 0.12, h: 0.22, x: 4.45, y: 0.78, z: -2.6, mat: M.std('jar', { color: 0xcfe0e0, rough: 0.05, transparent: true, opacity: 0.45, envI: 1.5 }) }); cyl({ r: 0.125, h: 0.04, x: 4.45, y: 1.0, z: -2.6, mat: 'midwood' });
    cyl({ r: 0.05, h: 0.1, x: 4.2, y: 0.78, z: -3.1, mat: M.color(0xe0b46a, 0.4) });
    // food and water bowls
    cyl({ r: 0.15, rt: 0.17, h: 0.07, x: 7.3, z: -1.9, mat: M.color(0x3f6fa0, 0.3), name: 'foodBowl' }); cyl({ r: 0.13, h: 0.02, x: 7.3, y: 0.05, z: -1.9, mat: M.color(0x9c5a2c) });
    cyl({ r: 0.15, rt: 0.17, h: 0.07, x: 7.3, z: -1.3, mat: M.color(0xc0492f, 0.3), name: 'waterBowl' }); cyl({ r: 0.13, h: 0.02, x: 7.3, y: 0.05, z: -1.3, mat: M.get('water') });
    box({ w: 0.7, h: 0.01, d: 1.2, x: 7.3, y: 0.004, z: -1.6, mat: M.color(0xd9b36a, 1), col: false, recv: true });
    // hanging lamp
    cyl({ r: 0.3, rt: 0.06, h: 0.25, x: 4, y: 1.9, z: -2.8, mat: 'lampshade', open: true }); cyl({ r: 0.01, h: 0.5, x: 4, y: 2.1, z: -2.8, mat: 'darkmetal' });
    light(4, 1.8, -2.8, 0xffd6a0, 1.3, 7, { night: true, room: 'kitchen' });
    // mouse hole trim
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16, 0, Math.PI), M.color(0x100b08, 1)); hole.position.set(0.07, 0.0, -3.17); hole.rotation.y = Math.PI / 2; root.add(hole);
    const hole2 = hole.clone(); hole2.position.x = -0.07; hole2.rotation.y = -Math.PI / 2; root.add(hole2);
  }

  /* ================================================================ LIVING ROOM */
  function buildLiving() {
    plane(-6.5, -2.5, 1.9, 4.7, 0.012, 'rug', 2.2, { po: 1 }); W.rugs.push([-6.5, -2.5, 1.9, 4.7]);
    // sofa: raised on legs so Milo can crawl beneath
    const sx = -4.5, sz = 5.2;
    box({ w: 2.6, h: 0.2, d: 0.9, x: sx, y: 0.24, z: sz, mat: 'sofa', s: 1, colY0: 0, col: false }); collider(sx - 1.3, sx + 1.3, sz - 0.45, sz + 0.45, 0.24, 0.44, { climb: true });
    box({ w: 2.6, h: 0.55, d: 0.25, x: sx, y: 0.24, z: sz + 0.4, mat: 'sofa', s: 1 , colY0: 0.0 });
    box({ w: 0.25, h: 0.45, d: 0.9, x: sx - 1.3, y: 0.24, z: sz, mat: 'sofa', s: 1 }); box({ w: 0.25, h: 0.45, d: 0.9, x: sx + 1.3, y: 0.24, z: sz, mat: 'sofa', s: 1 });
    for (const [lx, lz] of [[-1.35, -0.4], [1.35, -0.4], [-1.35, 0.4], [1.35, 0.4]]) box({ w: 0.08, h: 0.24, d: 0.08, x: sx + lx, z: sz + lz, mat: 'darkwood', col: false });
    for (let i = 0; i < 3; i++) box({ w: 0.8, h: 0.12, d: 0.7, x: sx - 0.85 + i * 0.85, y: 0.44, z: sz - 0.05, mat: 'sofa', col: false });
    box({ w: 0.45, h: 0.4, d: 0.15, x: sx - 0.9, y: 0.5, z: sz + 0.2, mat: 'cushion', col: false, rz: 0.2 }); box({ w: 0.45, h: 0.4, d: 0.15, x: sx + 0.9, y: 0.5, z: sz + 0.2, mat: M.std('cush2', { color: 0x5f7d73, rough: 1, map: 'fabric' }), col: false, rz: -0.2 });
    // armchair
    box({ w: 1, h: 0.2, d: 0.9, x: -7.1, y: 0.2, z: 1.3, mat: 'sofa2', ry: 0, col: false }); collider(-7.6, -6.6, 0.85, 1.75, 0.2, 0.4, { climb: true });
    box({ w: 0.2, h: 0.55, d: 0.9, x: -7.55, y: 0.2, z: 1.3, mat: 'sofa2' }); box({ w: 1, h: 0.35, d: 0.18, x: -7.1, y: 0.2, z: 0.9, mat: 'sofa2' }); box({ w: 1, h: 0.35, d: 0.18, x: -7.1, y: 0.2, z: 1.7, mat: 'sofa2' });
    // coffee table (walk under, climb on top)
    box({ w: 1.3, h: 0.06, d: 0.65, x: -4.5, y: 0.4, z: 3.3, mat: 'midwood', col: false }); collider(-5.15, -3.85, 2.97, 3.63, 0.38, 0.46, { climb: true });
    for (const [lx, lz] of [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]]) box({ w: 0.06, h: 0.4, d: 0.06, x: -4.5 + lx, z: 3.3 + lz, mat: 'midwood' });
    box({ w: 0.35, h: 0.05, d: 0.25, x: -4.2, y: 0.46, z: 3.3, mat: M.color(0x3b6fb5), col: false, ry: 0.3 }); cyl({ r: 0.05, h: 0.09, x: -4.8, y: 0.46, z: 3.2, mat: 'ceramic' });
    // TV unit
    box({ w: 2, h: 0.5, d: 0.45, x: -4.5, z: 0.3, mat: 'darkwood', climb: true }); box({ w: 1.5, h: 0.85, d: 0.06, x: -4.5, y: 0.6, z: 0.25, mat: 'screen', col: false }); box({ w: 0.3, h: 0.1, d: 0.2, x: -4.5, y: 0.5, z: 0.3, mat: 'darkmetal', col: false });
    // fireplace (glowing embers at night)
    box({ w: 0.5, h: 1.2, d: 1.8, x: -7.75, z: 3.3, mat: 'brick', s: 1 }); box({ w: 0.6, h: 0.08, d: 2, x: -7.7, y: 1.2, z: 3.3, mat: 'darkwood' });
    box({ w: 0.1, h: 0.55, d: 0.9, x: -7.5, y: 0.1, z: 3.3, mat: M.color(0x1a1210, 1), col: false });
    const em = box({ w: 0.2, h: 0.1, d: 0.6, x: -7.45, y: 0.12, z: 3.3, mat: 'ember', col: false }); W.obj.embers = em; em.userData.dynamic = true;
    for (let i = 0; i < 3; i++) cyl({ r: 0.05, h: 0.6, x: -7.42, y: 0.18, z: 3.1 + i * 0.2, mat: 'bark', rx: Math.PI / 2, ry: 0.3 * i });
    light(-7.1, 0.4, 3.3, 0xff7a2f, 1.6, 5, { flicker: 1, night: true, room: 'living' });
    box({ w: 0.2, h: 0.18, d: 0.03, x: -7.6, y: 1.28, z: 2.8, mat: M.color(0xd4a347, 0.3, 0.6), col: false, ry: Math.PI / 2 });
    // Arlo's grandfather clock
    box({ w: 0.5, h: 2.1, d: 0.4, x: 1.6, z: 0.35, mat: 'darkwood', name: 'clock' }); cyl({ r: 0.18, h: 0.03, x: 1.6, y: 1.7, z: 0.555, mat: M.color(0xf2ebe0), rx: Math.PI / 2 });
    const pend = new THREE.Group(); pend.position.set(1.6, 1.45, 0.56); root.add(pend); pend.userData.dynamic = true; W.obj.pendulum = pend;
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 6), M.get('brass')); pm.position.y = -0.35; pend.add(pm); const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), M.get('brass')); pb.rotation.x = Math.PI / 2; pb.position.y = -0.72; pend.add(pb);
    // bookshelf, floor lamp, plant
    box({ w: 1.4, h: 1.8, d: 0.35, x: -1.2, z: 0.25, mat: 'darkwood' });
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), M.std('booksM', { map: 'books', rough: 0.9 })); bs.position.set(-1.2, 0.95, 0.43); root.add(bs);
    cyl({ r: 0.15, h: 0.03, x: -7.4, z: 5.5, mat: 'darkmetal' }); cyl({ r: 0.015, h: 1.5, x: -7.4, z: 5.5, mat: 'darkmetal' }); cyl({ r: 0.25, rt: 0.15, h: 0.3, x: -7.4, y: 1.45, z: 5.5, mat: 'lampshade', open: true });
    light(-7.4, 1.4, 5.4, 0xffc27a, 1.3, 6, { night: true, room: 'living' });
    cyl({ r: 0.2, rt: 0.25, h: 0.4, x: 1.4, z: 5.5, mat: M.color(0x2f6f6a), col: true }); for (let i = 0; i < 5; i++) sph({ x: 1.4 + Math.cos(i) * 0.15, y: 0.7 + i * 0.12, z: 5.5 + Math.sin(i) * 0.15, r: 0.22, sy: 0.6, mat: 'plant' });
    // photos on the wall
    box({ w: 0.03, h: 0.5, d: 0.4, x: 1.93, y: 1.5, z: 4.6, mat: M.color(0x6b4a33), col: false }); box({ w: 0.035, h: 0.4, d: 0.3, x: 1.93, y: 1.5, z: 4.6, mat: new THREE.MeshStandardMaterial({ map: G.Tex.picture('photo1'), roughness: 0.6 }), col: false });
  }

  /* ================================================================ HALLWAY */
  function buildHall() {
    plane(3.8, 6.2, 1.4, 5.2, 0.012, M.std('runner', { color: 0x8e3b2e, map: 'rug', rough: 1 }), 2.4, { po: 1 }); W.rugs.push([3.8, 6.2, 1.4, 5.2]);
    // floor vent (to the basement)
    const vent = box({ w: 0.6, h: 0.02, d: 0.4, x: 6.6, y: 0.004, z: 1.0, mat: 'darkmetal', col: false, name: 'vent' }); vent.userData.dynamic = true;
    for (let i = 0; i < 6; i++) box({ w: 0.56, h: 0.025, d: 0.02, x: 6.6, y: 0.01, z: 0.84 + i * 0.065, mat: 'metal', col: false, parent: null });
    // coat rack, boots, key table
    cyl({ r: 0.03, h: 1.7, x: 7.6, z: 5.5, mat: 'darkwood' }); sph({ x: 7.55, y: 1.35, z: 5.45, r: 0.2, sy: 1.7, sz: 0.7, mat: M.std('coat', { color: 0x8a6d4b, rough: 1, map: 'fabric' }) });
    box({ w: 0.16, h: 0.3, d: 0.3, x: 7.3, z: 4.9, mat: M.color(0xf2d24b, 0.5), name: 'boot1' }); box({ w: 0.16, h: 0.3, d: 0.3, x: 7.5, z: 4.8, mat: M.color(0xf2d24b, 0.5) });
    box({ w: 0.9, h: 0.8, d: 0.35, x: 3, z: 5.7, mat: 'whitewood' }); cyl({ r: 0.12, h: 0.05, x: 3, y: 0.8, z: 5.7, mat: 'ceramic' });
    box({ w: 0.6, h: 0.8, d: 0.03, x: 3, y: 1.3, z: 5.9, mat: M.std('mirror', { color: 0xdddddd, rough: 0.02, metal: 1, envI: 2 }), col: false });
    box({ w: 0.1, h: 0.6, d: 1.1, x: 7.9, y: 0.1, z: 1.4, mat: M.color(0xe8e4d8, 0.4), col: false });
    light(5, 2.3, 3, 0xffe2b0, 0.9, 6, { night: true, room: 'hall', dim: true });
  }

  /* ================================================================ GARAGE */
  function buildGarage() {
    // the family car
    const car = new THREE.Group(); car.position.set(10.8, 0, 2.2); root.add(car);
    const paint = M.std('carpaint', { color: 0x5a8fa8, rough: 0.25, metal: 0.4, envI: 1.4 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4), paint); b1.position.y = 0.55; car.add(b1); b1.castShadow = true;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), paint); b2.position.set(0, 1.1, -0.2); car.add(b2); b2.castShadow = true;
    const gl = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.4, 2), M.get('glass')); gl.position.set(0, 1.12, -0.2); car.add(gl);
    for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18), M.color(0x1c1c1e, 0.8)); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.33, wz); car.add(wh); }
    collider(9.9, 11.7, 0.2, 4.2, 0, 1.4, {});
    // workbench, shelves, boxes (a staircase of boxes!)
    box({ w: 2.4, h: 0.9, d: 0.7, x: 10, z: -1.6, mat: 'midwood' }); box({ w: 2.4, h: 0.9, d: 0.05, x: 10, y: 1.2, z: -1.93, mat: M.std('pegboard', { color: 0xb88a55, rough: 0.9 }), col: false });
    for (let i = 0; i < 5; i++) box({ w: 0.05, h: 0.3, d: 0.05, x: 9.2 + i * 0.35, y: 1.4, z: -1.88, mat: 'darkmetal', col: false });
    box({ w: 0.5, h: 1.8, d: 1.6, x: 13.7, z: -0.8, mat: 'darkmetal' });
    for (const [y, c] of [[0.5, 0xc0492f], [0.95, 0x3b6fb5], [1.4, 0xe0b46a]]) cyl({ r: 0.12, h: 0.22, x: 13.6, y, z: -1.2, mat: M.color(c, 0.4, 0.3) });
    box({ w: 0.7, h: 0.45, d: 0.6, x: 13.3, z: 1.5, mat: M.std('cardboard', { color: 0xb08a5a, rough: 0.95 }), climb: true });
    box({ w: 0.6, h: 0.9, d: 0.55, x: 13.35, z: 2.3, mat: 'cardboard', climb: true });
    box({ w: 0.6, h: 1.25, d: 0.5, x: 13.35, z: 3.0, mat: 'cardboard', climb: true });
    box({ w: 0.6, h: 0.12, d: 1.4, x: 13.65, y: 1.5, z: 4.2, mat: 'midwood', climb: true, colY0: -0.02 }); // high shelf
    for (let i = 0; i < 3; i++) cyl({ r: 0.1, h: 0.18, x: 13.65, y: 1.62, z: 4.6 + i * 0.25 - 0.3, mat: M.color([0x5f9ec9, 0xd98f6a, 0x9ab83a][i], 0.4, 0.3) });
    // bicycle
    const bike = new THREE.Group(); bike.position.set(8.6, 0, 5); bike.rotation.y = Math.PI / 2; root.add(bike);
    for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 24), M.color(0x1c1c1e)); w.position.set(z, 0.34, 0); bike.add(w); }
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), M.color(0xc0492f, 0.3, 0.5)); fr.rotation.z = Math.PI / 2; fr.position.y = 0.6; bike.add(fr);
    collider(8.2, 9.0, 4.4, 5.6, 0.2, 1, {});
    light(11, 2.2, 1, 0xdfe8ff, 0.8, 6, { night: true, room: 'garage', dim: true });
  }

  /* ================================================================ BACKYARD */
  function buildBackyard() {
    // fences: west, north, east (gate + dig spot), short south pieces
    fence(-10, -28, 16, -28, 1.5);
    fence(-10, -28, -10, -6, 1.5);
    fence(16, -28, 16, -6, 1.5, [[-22.45, -21.55, 0.28], [-16, -14, 1.5]]);
    fence(-10, -6, -8, -6, 1.5); fence(8, -6, 16, -6, 1.5);
    collider(15.9, 16.1, -22.45, -21.55, 0, 0.28, { name: 'digFence' });
    // the gate
    const gate = new THREE.Group(); gate.position.set(16, 0, -16); root.add(gate); gate.userData.dynamic = true; W.obj.gate = gate;
    const gp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 2), M.get('paintwood')); gp.position.set(0, 0.7, 1); gp.castShadow = true; gate.add(gp); gp.userData.dynamic = true;
    const lt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.25), M.get('darkmetal')); lt.position.set(0.05, 1.0, 1.9); gate.add(lt); lt.userData.dynamic = true;
    collider(15.9, 16.1, -16, -14, 0, 1.5, { name: 'gate' });
    // dig mound under east fence
    const mound = sph({ x: 15.6, y: 0, z: -22, r: 0.4, sy: 0.35, mat: 'dirt', name: 'digMound' }); mound.userData.dynamic = true;
    // patio + furniture
    plane(1.5, 8.5, -9.5, -6, 0.01, M.std('patio', { map: 'stone', color: 0xd8cdb8, rough: 0.8 }), 1.1, { po: 1 }); W.noGrass.push([1.3, 8.7, -9.7, -6]);
    cyl({ r: 0.5, h: 0.04, x: 3.5, y: 0.7, z: -8, mat: 'whitewood', col: false }); cyl({ r: 0.04, h: 0.7, x: 3.5, z: -8, mat: 'whitewood', col: true }); collider(3, 4, -8.5, -7.5, 0.68, 0.76, { climb: true });
    for (const a of [0, 2.1, 4.2]) { const cx = 3.5 + Math.cos(a) * 0.85, cz = -8 + Math.sin(a) * 0.85; box({ w: 0.42, h: 0.04, d: 0.42, x: cx, y: 0.4, z: cz, mat: 'whitewood', col: false }); collider(cx - 0.21, cx + 0.21, cz - 0.21, cz + 0.21, 0.38, 0.45, { climb: true }); box({ w: 0.04, h: 0.4, d: 0.04, x: cx, z: cz, mat: 'whitewood', col: false }); }
    // grill
    cyl({ r: 0.3, h: 0.3, x: 7.3, y: 0.7, z: -8.6, mat: 'darkmetal' }); for (const a of [0, 2.1, 4.2]) cyl({ r: 0.02, h: 0.75, x: 7.3 + Math.cos(a) * 0.2, z: -8.6 + Math.sin(a) * 0.2, mat: 'darkmetal' }); collider(7, 7.6, -8.9, -8.3, 0, 1, {});
    // garden beds (soft soil)
    for (const [bx, bz] of [[-6, -12], [-2.5, -12]]) {
      box({ w: 2.6, h: 0.25, d: 1.4, x: bx, z: bz, mat: M.std('bedwood', { color: 0x7a5a3a, rough: 0.9, map: 'shedwood' }), s: 1, climb: true });
      plane(bx - 1.2, bx + 1.2, bz - 0.6, bz + 0.6, 0.255, 'soil', 1.2); W.noGrass.push([bx - 1.4, bx + 1.4, bz - 0.8, bz + 0.8]);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) sph({ x: bx - 0.9 + i * 0.45, y: 0.33, z: bz - 0.3 + j * 0.6, r: 0.13 + rng() * 0.05, sy: 0.7, mat: M.std('lettuce', { color: 0x7fb24a, rough: 0.8, map: 'foliage' }), cast: true });
    }
    for (let i = 0; i < 4; i++) { cyl({ r: 0.015, h: 0.9, x: 0.2 + i * 0.5, z: -12.8, mat: 'midwood' }); sph({ x: 0.2 + i * 0.5, y: 0.6, z: -12.8, r: 0.15, mat: M.std('tomplant', { color: 0x4f7a3a, map: 'foliage' }) }); sph({ x: 0.26 + i * 0.5, y: 0.45, z: -12.7, r: 0.05, mat: M.color(0xd9412f, 0.4) }); }
    // tool shed (a little garden shed, not the forest one)
    box({ w: 3.2, h: 2.1, d: 2.6, x: 11.5, z: -24.5, mat: 'paintwood', s: 1.5 });
    roofPrism(11.5, -24.5, 3.6, 3.0, 2.1, 0.8, true, 'shingles', 'paintwood');
    doorPanel(11.5, -23.18, 0, 0.9, 1.8, 'whitewood');
    // apple tree with a tire swing; the tunnel exit bush
    W.trees.push([-4, -20, 1.3, 'apple'], [11, -14, 1.1], [-8, -8.5, 0.8]);
    const rope = cyl({ r: 0.012, h: 1.8, x: -3.2, y: 0.55, z: -20, mat: M.color(0xc9b28a) }); const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 10, 20), M.color(0x1c1c1e, 0.9)); tire.position.set(-3.2, 0.55, -20); tire.castShadow = true; root.add(tire); W.obj.tire = tire; tire.userData.dynamic = true;
    W.noGrass.push([9.8, 13.2, -25.9, -23.1]);
    W.bushes.push([-7, 0.5, -25, 1.1, 0x55743a], [-8, 0.5, -24.2, 0.9, 0x4d6e36], [-6.2, 0.45, -25.8, 0.8, 0x5f7d3f]);
    const holeM = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), M.color(0x0e0907, 1)); holeM.rotation.x = -Math.PI / 2; holeM.position.set(-6.6, 0.02, -24.2); root.add(holeM);
    sph({ x: -6.6, y: 0, z: -24.45, r: 0.35, sy: 0.25, sz: 0.5, mat: 'dirt' });
    // bird bath
    cyl({ r: 0.1, h: 0.7, x: -1, z: -23.5, mat: 'stone', col: true }); cyl({ r: 0.4, rt: 0.45, h: 0.1, x: -1, y: 0.7, z: -23.5, mat: 'stone' }); cyl({ r: 0.38, h: 0.02, x: -1, y: 0.79, z: -23.5, mat: 'water' });
    // clothesline
    for (const pz of [-21, -10]) cyl({ r: 0.04, h: 2, x: 14.2, z: pz, mat: 'darkwood', col: true });
    cyl({ r: 0.006, h: 11, x: 14.2, y: 1.9, z: -15.5, mat: M.color(0xeeeeee), rx: Math.PI / 2 });
    for (const [cz, cc, w] of [[-19, 0xe8c98f, 0.5], [-17.5, 0x8fb0d4, 0.7], [-15, 0xd98f6a, 0.4], [-12.5, 0xf2ebe0, 0.9]]) { const c = box({ w, h: 0.55, d: 0.02, x: 14.2, y: 1.35, z: cz, ry: Math.PI / 2, mat: M.std('cloth' + cc, { color: cc, rough: 1, map: 'fabric', side: THREE.DoubleSide }), col: false }); c.userData.dynamic = true; W.updaters.push((t) => { c.rotation.z = Math.sin(t * 1.3 + cz) * 0.15 * (1 + (G.env ? G.env.wind : 0) * 2); }); }
    // pots, watering can, wheelbarrow
    for (const [px, pz, c] of [[7.8, -6.6, 0xb5653d], [8.4, -6.8, 0x9c5a2c], [1.2, -6.6, 0xb5653d]]) { cyl({ r: 0.18, rt: 0.23, h: 0.3, x: px, z: pz, mat: M.color(c), col: true }); sph({ x: px, y: 0.4, z: pz, r: 0.22, mat: M.std('flowers', { color: 0xe7a0b0, rough: 0.8, map: 'foliage' }) }); }
    cyl({ r: 0.14, h: 0.25, x: -8.8, z: -14, mat: M.color(0x5a8f6a, 0.4, 0.5), col: true }); cyl({ r: 0.02, h: 0.35, x: -8.6, y: 0.12, z: -14, mat: M.color(0x5a8f6a, 0.4, 0.5), rz: -0.9 });
    // flower strip along the north fence
    for (let x = -9; x < 15; x += 0.35) if (rng() > 0.3) W.flowers.push([x, -27.4 + rng() * 0.6, [0xe7a0b0, 0xf2d24b, 0xffffff, 0xc07ad9, 0xe86f4a][Math.floor(rng() * 5)]]);
    W.grassZones.push([-10, 16, -28, -6, 1]);
    area('backyard', 'Backyard', -10, 16, -28, -6, { zone: 'town', surf: 'grass' });
  }

  /* ================================================================ STREET */
  function buildStreet() {
    plane(-50, 90, 14, 16, 0.02, 'sidewalk', 2, { po: 1 }); plane(-50, 90, 24, 26, 0.02, 'sidewalk', 2, { po: 1 });
    plane(-50, 90, 16, 24, 0.01, 'asphalt', 6, { po: 1 });
    W.noGrass.push([-52, 92, 13.8, 26.2]);
    // kerbs
    box({ w: 140, h: 0.08, d: 0.15, x: 20, z: 16, mat: 'concrete', col: false }); box({ w: 140, h: 0.08, d: 0.15, x: 20, z: 24, mat: 'concrete', col: false });
    // lane dashes
    for (let x = -48; x < 90; x += 4) { const d = plane(x, x + 2, 19.9, 20.1, 0.015, M.std('paint', { color: 0xf0e6c0, rough: 0.6 }), 2, { po: 2 }); }
    // crosswalk to the park
    for (let i = 0; i < 6; i++) plane(0 + i * 0.7, 0.4 + i * 0.7, 16, 24, 0.016, 'paint', 2, { po: 2 });
    // street lamps
    for (const x of [-40, -18, 4, 26, 48, 70]) {
      cyl({ r: 0.07, h: 4, x, z: 14.4, mat: 'darkmetal', col: true }); box({ w: 0.8, h: 0.06, d: 0.08, x: x, y: 4, z: 14.6, mat: 'darkmetal', col: false });
      const hd = box({ w: 0.35, h: 0.18, d: 0.35, x: x, y: 3.85, z: 14.9, mat: M.std('streetlamp', { color: 0x333333, emissive: 0xffd08a, ei: 0 }), col: false }); if (!W.nightMats.includes(hd.material)) W.nightMats.push(hd.material);
      light(x, 3.6, 15, 0xffcf8a, 2.2, 12, { night: true, halo: true });
    }
    // path to the front door, driveway, mailbox
    plane(4.5, 5.5, 7.1, 14, 0.015, M.std('flag', { map: 'stone', color: 0xcfc6b2 }), 1, { po: 1 }); W.noGrass.push([4.3, 5.7, 6, 14]);
    plane(9, 13, 6, 14, 0.015, 'concrete', 2, { po: 1 }); W.noGrass.push([8.8, 13.2, 6, 14]);
    cyl({ r: 0.05, h: 1.1, x: 3.5, z: 13.5, mat: 'darkwood', col: true }); box({ w: 0.3, h: 0.25, d: 0.5, x: 3.5, y: 1.1, z: 13.5, mat: M.color(0x2f5d8a, 0.5, 0.4), col: false });
    W.trees.push([-5, 10, 0.9], [-30, 11, 1], [34, 11.5, 0.9], [60, 12, 0.8]);
    for (let x = -9; x < 3.5; x += 0.3) if (rng() > 0.25) W.flowers.push([x, 6.5 + rng() * 0.4, [0xe7a0b0, 0xf2d24b, 0xe86f4a, 0xffffff][Math.floor(rng() * 4)]]);
    W.bushes.push([-7.5, 0.35, 7, 0.7, 0x4d6e36], [-1, 0.35, 7, 0.6, 0x55743a], [7.5, 0.35, 7, 0.6, 0x4d6e36]);
    // parked car
    const car = new THREE.Group(); car.position.set(30, 0, 22.5); car.rotation.y = Math.PI / 2; root.add(car);
    const p = M.std('car2', { color: 0xc9a24a, rough: 0.3, metal: 0.4, envI: 1.3 }); const a = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 3.8), p); a.position.y = 0.55; a.castShadow = true; car.add(a); const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2), p); b.position.set(0, 1.08, -0.2); b.castShadow = true; car.add(b); const gg = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.36, 1.8), M.get('glass')); gg.position.set(0, 1.1, -0.2); car.add(gg);
    for (const [wx, wz] of [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), M.color(0x1c1c1e, 0.8)); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.32, wz); car.add(wh); }
    collider(28.1, 31.9, 21.6, 23.4, 0.25, 1.4, {});
    // town edges
    hedge(-50, -30, -50, 64, 2.6, 1.6, [[48.9, 51.1, 0.45]]); hedge(-50, 64, -30, 64, 2.4, 1.4); hedge(40, 64, 90, 64, 2.4, 1.4); hedge(-50, 27, -30.7, 27, 2.2, 1.2);
    collider(-50.6, -49.4, -70, -30, 0, 6, { cam: false }); collider(-50.6, -49.4, 64, 80, 0, 6, { cam: false });
    for (const [tx, tz] of [[50, 36], [62, 48], [76, 34], [84, 56], [-40, 36], [-44, 58], [-36, 44]]) W.trees.push([tx, tz, 0.9 + rng() * 0.4]); hedge(-50, -30, 90, -30, 2.6, 1.6); hedge(90, -30, 90, 64, 2.6, 1.6);
    box({ w: 0.2, h: 1, d: 8, x: -48.8, z: 20, mat: M.std('barrier', { color: 0xe8e4d8, rough: 0.6 }) });
    for (let i = 0; i < 4; i++) box({ w: 0.22, h: 0.2, d: 1, x: -48.8, y: 0.7, z: 17 + i * 2, mat: 'red', col: false });
    area('street', 'Maple Street', -50, 90, 14, 26, { zone: 'town', surf: 'stone' });
    area('frontyard', 'Front Yard', -10, 16, 6, 14, { zone: 'town', surf: 'grass' });
    area('sidepath', 'Side Lane', 16, 24, -30, 14, { zone: 'town', surf: 'grass' });
    W.grassZones.push([-10, 16, 6, 14, 1], [16, 24, -30, 14, 1]);
  }

  /* ================================================================ NEIGHBOURS */
  function simpleHouse(x0, x1, z0, z1, wallM, roofM, o = {}) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    box({ w: w + 0.4, h: 0.35, d: d + 0.4, x: cx, y: -0.3, z: cz, mat: 'brick', s: 1.4, col: false });
    box({ w, h: 2.8, d, x: cx, z: cz, mat: wallM, s: 1.6 });
    roofPrism(cx, cz, w + 0.8, d + 0.8, 2.8, 2.2, true, roofM, wallM);
    doorPanel(cx, z1 + 0.03, 0, 1, 2.1, o.door || 'paintwood');
    for (const wx of [cx - w * 0.3, cx + w * 0.3]) windowAt(wx, 1.6, z1, 0, 1.3, 1.1, { inside: false });
    windowAt(cx, 1.6, z0, Math.PI, 1.3, 1.1, { inside: false });
    W.noGrass.push([x0 - 0.3, x1 + 0.3, z0 - 0.3, z1 + 0.3]);
  }
  function buildNeighbours() {
    // Tilly's house (the Fairweathers)
    simpleHouse(-38, -24, -6, 6, 'sidingGreen', 'shinglesBlue', { door: 'whitewood' });
    box({ w: 5, h: 0.3, d: 2, x: -31, z: 7, mat: 'midwood', climb: true, s: 1 });
    fence(-24, -8, -24, -30, 1.4); fence(-44, -8, -44, -30, 1.4); fence(-44, -8, -24, -8, 1.4);
    box({ w: 0.9, h: 0.35, d: 0.6, x: -28.5, y: 0.3, z: 7.3, mat: M.color(0x6b8aa0, 0.8), climb: true, colY0: -0.3 }); // cushion bench on porch
    W.grassZones.push([-44, -10, -8, 14, 0.7]);
    area('tilly', 'The Fairweathers’', -44, -10, -30, 14, { zone: 'town', surf: 'grass' });
    // Bram's house (Mr. Oakes) with a proper porch
    simpleHouse(24, 38, -6, 6, 'siding', 'shingles', { door: 'darkwood' });
    box({ w: 8, h: 0.35, d: 2.4, x: 31, z: 7.2, mat: 'wood', climb: true, s: 1.4 });
    box({ w: 2, h: 0.17, d: 0.6, x: 31, z: 8.7, mat: 'wood', climb: true, s: 1 });
    for (const px of [27.2, 34.8]) cyl({ r: 0.08, h: 2.4, x: px, y: 0.35, z: 8.2, mat: 'whitewood', col: true });
    box({ w: 8.4, h: 0.15, d: 2.8, x: 31, y: 2.75, z: 7.3, mat: 'shingles', col: false });
    // rocking chair + dog bed
    box({ w: 0.7, h: 0.08, d: 0.7, x: 28.3, y: 0.8, z: 7, mat: 'darkwood', col: false }); box({ w: 0.7, h: 0.8, d: 0.08, x: 28.3, y: 0.8, z: 6.6, mat: 'darkwood', col: false });
    cyl({ r: 0.6, h: 0.12, x: 31.5, y: 0.35, z: 7.1, mat: M.std('dogbed', { color: 0x8e3b2e, rough: 1, map: 'fabric' }) });
    cyl({ r: 0.12, h: 0.06, x: 33, y: 0.35, z: 7.6, mat: M.color(0x3f6fa0, 0.3), name: 'bramBowl' });
    box({ w: 0.25, h: 0.35, d: 0.25, x: 34.2, y: 1.9, z: 6.2, mat: M.std('porchlamp', { color: 0x333333, emissive: 0xffc070, ei: 0 }), col: false });
    light(34.2, 2, 6.8, 0xffc070, 1.4, 7, { night: true });
    fence(24, -8, 24, -30, 1.4); fence(38, -8, 38, -30, 1.4); fence(24, -8, 38, -8, 1.4);
    W.grassZones.push([24, 44, -8, 14, 0.7]);
    area('bram', "Mr. Oakes' Porch", 24, 44, -30, 14, { zone: 'town', surf: 'wood' });
    // a third house further east
    simpleHouse(66, 80, -4, 6, 'brick', 'shinglesBlue');
    W.grassZones.push([62, 88, -28, 14, 0.5]);
  }

  /* ================================================================ SHOP */
  function buildShop() {
    const x0 = 46, x1 = 60, z0 = -4, z1 = 8;
    box({ w: 14, h: 3.4, d: 12, x: 53, z: 2, mat: 'brick', s: 1.6 });
    box({ w: 14.4, h: 0.4, d: 12.4, x: 53, y: 3.4, z: 2, mat: 'darkwood', col: false });
    // shop front glass + awning
    for (const wx of [49, 57]) { box({ w: 3.4, h: 1.8, d: 0.05, x: wx, y: 0.7, z: 8.03, mat: M.std('shopglass', { color: 0x2c3a44, rough: 0.05, metal: 0.4, emissive: 0xffd9a0, ei: 0.2, envI: 1.6 }), col: false }); }
    W.nightMats.push(M.get('shopglass') || M.cache.shopglass);
    doorPanel(53, 8.04, 0, 1.2, 2.2, M.std('shopdoor', { color: 0x2f5d4a, rough: 0.5 }));
    const aw = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 2), M.std('awning', { color: 0xffffff, rough: 0.9, map: 'shopstripe' in {} ? 'fabric' : 'fabric' })); aw.position.set(53, 2.7, 9); aw.rotation.x = 0.25; aw.castShadow = true; root.add(aw);
    const stripes = G.Tex.make('awningStripes', 128, 16, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f3e6cc' : '#2f6d5a'; g.fillRect(i * 8, 0, 8, h); } }, 6, 1); aw.material.map = stripes; aw.material.needsUpdate = true;
    const sign = G.Tex.make('shopsign', 512, 96, (g, w, h) => { g.fillStyle = '#2f3f35'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d4a347'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f3e6cc'; g.font = 'bold 50px Georgia'; g.textAlign = 'center'; g.fillText("PEMBERTON'S", w / 2, 66); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 })); sg.position.set(53, 3.1, 8.06); root.add(sg);
    // crates, bench, flower buckets
    for (const [cx, cy, cz] of [[47.3, 0, 9.2], [48.1, 0, 9.3], [47.7, 0.45, 9.25]]) box({ w: 0.7, h: 0.45, d: 0.6, x: cx, y: cy, z: cz, mat: M.std('crate', { color: 0xb08a5a, rough: 0.9, map: 'shedwood' }), climb: true, colY0: cy ? -cy : 0 });
    for (let i = 0; i < 6; i++) sph({ x: 47.1 + (i % 3) * 0.2, y: 0.5, z: 9.1 + Math.floor(i / 3) * 0.2, r: 0.08, mat: M.color([0xd9412f, 0xe8a33b, 0x9ab83a][i % 3], 0.5) });
    box({ w: 1.8, h: 0.08, d: 0.5, x: 57.5, y: 0.45, z: 9.5, mat: 'midwood', col: false }); collider(56.6, 58.4, 9.25, 9.75, 0.43, 0.53, { climb: true }); for (const lx of [56.8, 58.2]) box({ w: 0.08, h: 0.45, d: 0.45, x: lx, z: 9.5, mat: 'darkmetal', col: false });
    for (let i = 0; i < 3; i++) { cyl({ r: 0.18, h: 0.35, x: 59 + i * 0.45, z: 9.3, mat: 'metal', col: true }); sph({ x: 59 + i * 0.45, y: 0.5, z: 9.3, r: 0.22, mat: M.std('bouquet' + i, { color: [0xe7a0b0, 0xf2d24b, 0xc07ad9][i], rough: 0.8, map: 'foliage' }) }); }
    // the alley
    plane(60, 64, -4, 14, 0.012, 'concrete', 2, { po: 1 }); W.noGrass.push([59.8, 64.2, -4, 14]);
    box({ w: 1.4, h: 1.2, d: 1, x: 62.5, z: -2, mat: M.std('dumpster', { color: 0x2f5d4a, rough: 0.6, metal: 0.3 }) });
    box({ w: 0.8, h: 0.5, d: 0.6, x: 61, z: 0.5, mat: 'cardboard', climb: true }); box({ w: 0.6, h: 0.4, d: 0.5, x: 61.2, y: 0.5, z: 0.5, mat: 'cardboard', col: false });
    fence(60, -8, 66, -8, 1.8);
    area('shop', "Pemberton's Corner Shop", 44, 66, -8, 14, { zone: 'town', surf: 'stone' });
    light(53, 2.4, 9.8, 0xffd9a0, 1.4, 8, { night: true });
  }

  /* ================================================================ PARK + PLAYGROUND + POND */
  function buildPark() {
    fence(-30, 28, 0, 28, 0.9, [], { rail: true }); fence(4, 28, 40, 28, 0.9); fence(40, 28, 40, 64, 0.9); fence(-30, 64, 40, 64, 0.9, [[9, 12, 2]]);
    // an arch over the south gate to Birch Lane
    for (const ax of [8.85, 12.15]) cyl({ r: 0.07, h: 2.3, x: ax, z: 64, mat: 'whitewood', col: true });
    box({ w: 3.6, h: 0.12, d: 0.14, x: 10.5, y: 2.3, z: 64, mat: 'whitewood', col: false });
    for (let i = 0; i < 9; i++) W.flowers.push([8.8 + (i % 2) * 0.1, 64.2 + (i - 4) * 0.12, 0xe7a0b0]);
    // west hedge with the hidden ferret passage
    hedge(-30, 28, -30, 64, 2.2, 1.4, [[49.4, 50.6, 0.36]]);
    collider(-30.8, -29.2, 49.4, 50.6, 0, 0.36, { name: 'hedgeGap' });
    // paths
    const pm = M.std('gravel', { map: 'dirt', color: 0xd8c8a8, rough: 1 });
    const path = (x0, z0, x1, z1, w) => { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); const g = new THREE.PlaneGeometry(w, len); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2, uv.getY(i) * len / 2); const m = new THREE.Mesh(g, pm); m.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2); m.rotation.y = a; m.receiveShadow = true; root.add(m); const n = Math.ceil(len / 1.5); for (let i = 0; i <= n; i++) W.noGrass.push(['c', U.lerp(x0, x1, i / n), U.lerp(z0, z1, i / n), w * 0.6]); };
    W.parkPath = path; path(10.5, 58, 10.5, 66, 1.6);
    path(2, 26, 2, 36, 2.2); path(2, 36, 18, 42, 2); path(2, 36, -12, 42, 2); path(-12, 42, -22, 50, 1.6); path(-22, 50, -29, 50, 1.2); path(18, 42, 20, 56, 2); path(20, 56, 0, 58, 2); path(0, 58, -12, 56, 1.8);
    // big oak (Pip's tree)
    W.trees.push([0, 38.5, 2.1, 'oak']);
    const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), M.color(0x100b08, 1)); hollow.position.set(0.05, 0.9, 39.56); root.add(hollow);
    for (const [tx, tz, s] of [[-18, 34, 1.2], [-24, 40, 1], [30, 34, 1.1], [34, 52, 1.2], [12, 60, 1], [-6, 61, 0.9], [26, 60, 1], [-26, 60, 0.9], [36, 40, 0.9]]) W.trees.push([tx, tz, s]);
    // benches
    for (const [bx, bz, ry] of [[6, 35, 0], [-8, 45, 0.6], [14, 57, Math.PI]]) {
      const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.y = ry; root.add(g);
      for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.12), M.get('midwood')); s.position.set(0, 0.45, -0.15 + i * 0.15); s.castShadow = true; g.add(s); }
      for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.03), M.get('midwood')); s.position.set(0, 0.62 + i * 0.15, 0.2); g.add(s); }
      for (const lx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.45), M.get('darkmetal')); l.position.set(lx, 0.22, 0); g.add(l); }
      const cs = Math.abs(Math.sin(ry)) > 0.5; collider(bx - (cs ? 0.3 : 0.8), bx + (cs ? 0.3 : 0.8), bz - (cs ? 0.8 : 0.3), bz + (cs ? 0.8 : 0.3), 0.43, 0.49, { climb: true });
    }
    // lamp posts & bins
    for (const [lx, lz] of [[2, 31], [2, 47], [-12, 50], [20, 50]]) { cyl({ r: 0.06, h: 3, x: lx + 1.3, z: lz, mat: 'darkmetal', col: true }); const hd = sph({ x: lx + 1.3, y: 3.1, z: lz, r: 0.18, mat: 'streetlamp' }); light(lx + 1.3, 2.9, lz, 0xffcf8a, 1.6, 9, { night: true, halo: true }); }
    cyl({ r: 0.25, h: 0.8, x: 4.3, z: 34, mat: M.color(0x2f5d4a, 0.5, 0.3), col: true });
    // pond
    disc(-10, 50, 5.6, 0.005, M.std('pondbed', { color: 0x4a4030, rough: 1, map: 'dirt' }), 3);
    const pond = disc(-10, 50, 5.3, 0.06, 'water', 4); W.obj.pond = pond; pond.userData.dynamic = true;
    W.hazards.push({ type: 'circle', x: -10, z: 50, r: 5.0, name: 'pond' }); W.noGrass.push(['c', -10, 50, 6]);
    for (let i = 0; i < 26; i++) { const a = rng() * 6.28, r = 5.3 + rng() * 0.8; for (let k = 0; k < 4; k++) W.ferns.push([-10 + Math.cos(a) * r + rng() * 0.3, 50 + Math.sin(a) * r + rng() * 0.3, 0.5 + rng() * 0.5, 'reed']); }
    for (let i = 0; i < 9; i++) { const a = rng() * 6.28, r = rng() * 4; const lp = new THREE.Mesh(new THREE.CircleGeometry(0.22 + rng() * 0.15, 12, 0.3, 5.8), M.std('lily', { color: 0x5f8a3a, rough: 0.6, side: THREE.DoubleSide })); lp.rotation.x = -Math.PI / 2; lp.position.set(-10 + Math.cos(a) * r, 0.07, 50 + Math.sin(a) * r); root.add(lp); }
    for (const [rx, rz] of [[-15.6, 49], [-4.8, 52], [-9, 55.4]]) W.rocks.push([rx, 0, rz, 0.5, 'rock']);
    // playground (old and a bit rusty)
    const px = 22, pz = 44;
    plane(px - 4, px + 4, pz - 3.5, pz + 3.5, 0.01, M.std('sand', { color: 0xe3cf9e, rough: 1, map: 'dirt' }), 2, { po: 1 }); W.noGrass.push([px - 4.2, px + 4.2, pz - 3.7, pz + 3.7]);
    const rust = M.std('rust', { color: 0xa0522d, rough: 0.6, metal: 0.5 }), teal = M.std('teal', { color: 0x3f8f8a, rough: 0.5, metal: 0.4 });
    // swing set
    for (const sx of [-1.6, 1.6]) for (const sz of [-0.6, 0.6]) cyl({ r: 0.05, h: 2.4, x: px - 1.5 + sx, z: pz - 1.8 + sz * 0.8, mat: rust, rx: -sz * 0.35 * 0, col: true });
    cyl({ r: 0.05, h: 3.3, x: px - 1.5, y: 2.4, z: pz - 1.8, mat: rust, rz: Math.PI / 2 });
    for (const s of [-0.7, 0.7]) { const sw = new THREE.Group(); sw.position.set(px - 1.5 + s, 2.4, pz - 1.8); root.add(sw); sw.userData.dynamic = true; for (const k of [-0.2, 0.2]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.9, 4), M.get('metal')); ch.position.set(k, -0.95, 0); sw.add(ch); } const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.2), teal); seat.position.y = -1.9; seat.castShadow = true; sw.add(seat); W.updaters.push((t) => { sw.rotation.x = Math.sin(t * 1.2 + s) * 0.08 * (1 + (G.env ? G.env.wind : 0) * 3); }); }
    // slide with steps
    for (let i = 0; i < 5; i++) box({ w: 0.5, h: 0.25, d: 0.3, x: px + 2.2, y: i * 0.25, z: pz + 0.6 - i * 0.3, mat: teal, climb: true, colY0: -i * 0.25 });
    box({ w: 0.7, h: 0.08, d: 0.7, x: px + 2.2, y: 1.25, z: pz - 1.05, mat: teal, climb: true, colY0: -1.25 + 0.001 });
    const sl = box({ w: 0.55, h: 0.05, d: 2.8, x: px + 2.2, y: 0.62, z: pz - 2.5, mat: M.std('slide', { color: 0xd9b36a, rough: 0.2, metal: 0.6 }), rx: -0.45, col: false });
    // seesaw
    cyl({ r: 0.1, h: 0.4, x: px - 2, z: pz + 1.8, mat: rust, col: true }); const ss = box({ w: 3, h: 0.06, d: 0.25, x: px - 2, y: 0.4, z: pz + 1.8, mat: teal, col: false, rz: 0.18 });
    // merry-go-round
    cyl({ r: 1.1, h: 0.1, x: px + 0.8, y: 0.12, z: pz + 2, mat: rust, col: false }); collider(px - 0.2, px + 1.8, pz + 1, pz + 3, 0.1, 0.24, { climb: true });
    // sandbox dig spot (marble)
    box({ w: 2, h: 0.2, d: 0.12, x: px - 2.4, z: pz - 3.3 + 3.3, mat: 'midwood', col: false });
    area('playground', 'The Old Playground', px - 4.5, px + 4.5, pz - 4, pz + 4, { zone: 'town', surf: 'dirt' });
    area('pond', 'Duck Pond', -16, -4, 44, 56, { zone: 'town', surf: 'grass' });
    area('park', 'Willow Park', -30, 40, 26, 64, { zone: 'town', surf: 'grass' });
    W.grassZones.push([-30, 40, 28, 64, 1.2]);
    // Nora's burrow
    sph({ x: -26.5, y: 0, z: 56.5, r: 1.1, sy: 0.45, mat: M.std('burrowmound', { color: 0x5d6b33, rough: 1, map: 'grass' }) });
    const bh = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), M.color(0x100b08, 1)); bh.position.set(-25.6, 0.12, 56.1); bh.rotation.y = 1.1; root.add(bh);
    // hidden path beyond the hedge, to the forest
    plane(-50, -30.7, 48.8, 51.2, 0.012, 'dirt', 2, { po: 1 });
    area('hiddenpath', 'The Hidden Path', -50, -30, 44, 56, { zone: 'forest', surf: 'dirt' });
    for (let x = -49; x < -31; x += 1.2) { W.bushes.push([x, 0.5 + rng() * 0.3, 47.6 - rng() * 0.6, 0.8 + rng() * 0.4, 0x4d6e36]); W.bushes.push([x + 0.5, 0.5 + rng() * 0.3, 52.4 + rng() * 0.6, 0.8 + rng() * 0.4, 0x55743a]); }
    collider(-50, -30.7, 46.8, 48.2, 0, 3, { cam: false }); collider(-50, -30.7, 51.8, 53.2, 0, 3, { cam: false });
    // the forest-edge hedge now has an opening at the path
    W.forestGate = [-50, 48.8, 51.2];
  }

  /* ================================================================ FOREST */
  function buildForest() {
    // bounds
    collider(-141, -140, -70, 80, 0, 6, { cam: false }); collider(-140, -88, -71, -70, 0, 6, { cam: false }); collider(-72, -50, -71, -70, 0, 6, { cam: false }); collider(-140, -50, 80, 81, 0, 6, { cam: false });
    // the creek keeps going north: a bramble thicket hides the way until the sequel opens it
    collider(-88, -72, -71.2, -69.8, 0, 3, { name: 'farThicket', cam: false });
    // the trail (dirt ribbon)
    const trail = [[-50, 50], [-58, 48], [-66, 40], [-72, 29], [-77.5, 22], [-82.5, 22], [-88, 18], [-94, 13], [-100, 10], [-102, -4], [-107, -13], [-107, -15.6]];
    const branch = [[-100, 10], [-108, 24], [-116, 36], [-118, 40]];
    const pm = M.get('dirt');
    const seg = (a, b, w) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.PlaneGeometry(w, len + w * 0.6); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2, uv.getY(i) * len / 2); const m = new THREE.Mesh(g, pm); m.position.set((a[0] + b[0]) / 2, 0.01 + rng() * 0.004, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); m.receiveShadow = true; root.add(m); };
    const clearZones = [];
    for (const path of [trail, branch]) for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1]; if (Math.abs(a[0] + 80) < 3 && Math.abs(b[0] + 80) < 3) continue; seg(a, b, 1.8); const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2); for (let k = 0; k <= n; k++) clearZones.push([U.lerp(a[0], b[0], k / n), U.lerp(a[1], b[1], k / n), 3.2]); }
    W.trail = trail;
    // creek
    const creekW = M.get('water');
    const cb = plane(-83, -77, -70, 80, -0.02, M.std('creekbed', { color: 0x4f4636, rough: 1, map: 'dirt' }), 3);
    const water = plane(-82, -78, -70, 80, 0.07, creekW, 4); W.obj.creek = water; water.userData.dynamic = true;
    W.hazards.push({ type: 'rect', x0: -81.8, x1: -78.2, z0: -70, z1: 80, name: 'creek' });
    for (let z = -68; z < 78; z += 1.3) { W.rocks.push([-82.3 + rng() * 0.3, 0, z + rng(), 0.25 + rng() * 0.25, 'mossrock']); W.rocks.push([-77.7 - rng() * 0.3, 0, z + rng(), 0.25 + rng() * 0.25, 'mossrock']); if (rng() > 0.6) W.ferns.push([-83.5 - rng(), z, 0.8, 'fern'], [-76.5 + rng(), z, 0.8, 'fern']); }
    // stepping stones (jump between them)
    const stones = [[-81.1, 22.1], [-80.0, 21.8], [-78.9, 22.2]];
    for (const [sx, sz] of stones) { const st = cyl({ r: 0.36, rt: 0.3, h: 0.22, x: sx, y: 0, z: sz, mat: 'rock', seg: 9, col: false }); collider(sx - 0.3, sx + 0.3, sz - 0.3, sz + 0.3, 0, 0.22, { climb: true }); }
    W.stones = stones;
    // fallen log over the creek (decorative, too high)
    cyl({ r: 0.45, h: 7, x: -80, y: 0.55, z: -34, mat: 'bark', rz: Math.PI / 2, ry: 0.2, col: false }); collider(-83.5, -76.5, -34.6, -33.4, 0.1, 1.0, {});
    area('creek', 'Whisper Creek', -86, -74, -70, 80, { zone: 'forest', surf: 'dirt' });
    // Moss's hollow log home
    const logg = cyl({ r: 0.55, h: 2.2, x: -60.5, y: 0.45, z: 38.8, mat: 'bark', rz: Math.PI / 2, ry: 0.4, open: true, col: false }); logg.material = logg.material.clone(); logg.material.side = THREE.DoubleSide;
    collider(-61.6, -59.4, 38.2, 39.4, 0, 1.0, {});
    for (let i = 0; i < 6; i++) W.ferns.push([-59 + rng() * 3, 37 + rng() * 3.5, 0.7, 'fern']);
    for (let i = 0; i < 6; i++) sph({ x: -61 + rng() * 2, y: 0.95 + rng() * 0.1, z: 38.4 + rng() * 0.8, r: 0.06, sy: 0.5, mat: M.std('mossy', { color: 0x6f8f3a, rough: 1 }) });
    area('mosslog', "Moss's Log", -64, -56, 34, 42, { zone: 'forest', surf: 'leaves' });
    area('forestedge', 'Forest Edge', -64, -50, 40, 60, { zone: 'forest', surf: 'leaves' });
    // clearing
    const cx = -100, cz = 10;
    disc(cx, cz, 10, 0.006, 'grass', 6); W.grassZones.push(['c', cx, cz, 9.5, 1.6]); clearZones.push([cx, cz, 11]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; W.rocks.push([cx + Math.cos(a) * 6.5, 0, cz + Math.sin(a) * 6.5, 0.28, 'mossrock']); }
    // old stump + dig spot marked by three stones
    cyl({ r: 0.55, rt: 0.5, h: 0.5, x: -96, z: 6, mat: 'bark', col: true, climb: true, name: 'stump' }); cyl({ r: 0.5, h: 0.02, x: -96, y: 0.5, z: 6, mat: M.std('stumptop', { color: 0xc9a27a, rough: 0.9 }) });
    W.col.stump && (W.col.stump.climb = true);
    for (const [a, b] of [[-94.9, 6.2], [-95.2, 5.3], [-94.5, 5.6]]) W.rocks.push([a, 0, b, 0.14, 'rock']);
    const km = sph({ x: -94.9, y: 0, z: 5.7, r: 0.35, sy: 0.3, mat: 'dirt', name: 'keyMound' }); km.userData.dynamic = true;
    // fairy-ring mushrooms (glow a little at night)
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28, r = 3; cyl({ r: 0.012, h: 0.08, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, mat: M.color(0xf2ebe0), cast: false }); sph({ x: cx + Math.cos(a) * r, y: 0.08, z: cz + Math.sin(a) * r, r: 0.04, sy: 0.55, mat: 'mushroom', cast: false }); }
    area('clearing', 'The Clearing', cx - 11, cx + 11, cz - 11, cz + 11, { zone: 'forest', surf: 'grass' });
    // trees
    const inClear = (x, z) => clearZones.some(([a, b, r]) => (x - a) ** 2 + (z - b) ** 2 < r * r) || (x > -84 && x < -76) || (x > -113 && x < -100 && z > -27 && z < -12) || ((x + 118) ** 2 + (z - 42) ** 2 < 49) || ((x + 60.5) ** 2 + (z - 38.8) ** 2 < 9) || (W.extraClear || []).some(([a, b, r]) => (x - a) ** 2 + (z - b) ** 2 < r * r);
    let n = 0;
    for (let i = 0; i < 3000 && n < 330; i++) {
      const x = -138 + rng() * 87, z = -68 + rng() * 146; if (inClear(x, z)) continue;
      n++; const s = 0.9 + rng() * 0.9; if (rng() < 0.45) W.pines.push([x, z, s]); else W.trees.push([x, z, s * 1.1]);
      if (rng() < 0.5) { const fx = x + rng() * 2 - 1, fz = z + rng() * 2 - 1; if (!inClear(fx, fz)) W.ferns.push([fx, fz, 0.6 + rng() * 0.6, 'fern']); }
    }
    const hardNo = (x, z) => (x > -113 && x < -100 && z > -27 && z < -12) || (x > -83.5 && x < -76.5) || ((x + 119) ** 2 + (z - 42) ** 2 < 36) || ((x + 60.5) ** 2 + (z - 38.8) ** 2 < 6);
    for (let i = 0; i < 700; i++) { const x = -138 + rng() * 87, z = -68 + rng() * 146; if (hardNo(x, z) || (inClear(x, z) && rng() > 0.15)) continue; if (rng() < 0.6) W.ferns.push([x, z, 0.5 + rng() * 0.7, 'fern']); else W.bushes.push([x, 0.3, z, 0.4 + rng() * 0.5, rng() > 0.5 ? 0x3f5a2a : 0x55743a, true]); }
    for (let i = 0; i < 90; i++) { const x = -138 + rng() * 87, z = -68 + rng() * 146; if (inClear(x, z)) continue; W.rocks.push([x, 0, z, 0.3 + rng() * 0.7, 'mossrock']); }
    // grass tufts along the trail
    for (const [a, b] of clearZones) if (rng() > 0.2) W.grassZones.push(['c', a, b, 2.4, 0.5]);
    W.clearZones = clearZones;
  }

  /* ================================================================ ARLO'S WORKSHOP (abandoned shed) */
  function buildShed() {
    const x0 = -111, x1 = -103, z0 = -24, z1 = -16, H = 2.6;
    plane(x0, x1, z0, z1, 0.02, M.std('shedfloor', { map: 'planks', color: 0x9a8a78, rough: 0.8 }), 1.6);
    wall(x0, z0, x1, z0, H, 0.14, 'shedwood', 'shedwood', [], { s: 1.8 });
    wall(x0, z0, x0, z1, H, 0.14, 'shedwood', 'shedwood', [], { s: 1.8 });
    wall(x1, z0, x1, z1, H, 0.14, 'shedwood', 'shedwood', [], { s: 1.8 });
    wall(x0, z1, x1, z1, H, 0.14, 'shedwood', 'shedwood', [[-108, -106, 2.1]], { s: 1.8 });
    const ceil = plane(x0, x1, z0, z1, H, 'shedwood', 2); ceil.rotation.x = Math.PI; ceil.position.y = H; ceil.castShadow = true;
    collider(x0, x1, z0, z1, H, H + 0.3, { walk: false });
    roofPrism(-107, -20, 9, 9, H, 1.6, true, M.std('mossroof', { map: 'shingles', color: 0x7a8a6a }), 'shedwood');
    // door (locked until the key)
    const dg = new THREE.Group(); dg.position.set(-108, 0, -16); root.add(dg); dg.userData.dynamic = true; W.obj.shedDoor = dg;
    const dp = new THREE.Mesh(new THREE.BoxGeometry(2, 2.1, 0.08), M.get('shedwood')); dp.position.set(1, 1.05, 0); dp.castShadow = true; dg.add(dp); dp.userData.dynamic = true;
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), M.get('darkmetal')); lock.position.set(1.8, 1.0, 0.07); dg.add(lock); lock.userData.dynamic = true; W.obj.shedLock = lock;
    collider(-108, -106, -16.1, -15.9, 0, 2.1, { name: 'shedDoor' });
    // windows (broken, letting light in)
    windowAt(-111, 1.6, -20, -Math.PI / 2, 1, 0.8, { curtain: false, sill: false });
    // workbench with clock parts
    box({ w: 3, h: 0.9, d: 0.8, x: -107, z: -23.4, mat: 'darkwood', climb: false });
    box({ w: 0.5, h: 0.45, d: 0.45, x: -108.9, z: -22.6, mat: 'midwood', climb: true });
    for (let i = 0; i < 6; i++) { const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.05 + i * 0.01, 0.05 + i * 0.01, 0.01, 12), M.get('brass')); gear.position.set(-108 + i * 0.35, 0.91, -23.3 + (i % 2) * 0.15); root.add(gear); }
    box({ w: 0.4, h: 0.3, d: 0.3, x: -106, y: 0.9, z: -23.5, mat: 'darkwood', col: false });
    cyl({ r: 0.08, h: 0.25, x: -105.5, y: 0.9, z: -23.2, mat: M.std('lantern', { color: 0xffd08a, emissive: 0xffb050, ei: 0.8 }) });
    light(-105.5, 1.3, -22.8, 0xffb050, 1.2, 6, { shed: true });
    // shelves with jars and an old clock
    box({ w: 0.4, h: 1.8, d: 2.2, x: -110.7, z: -18, mat: 'darkwood' });
    for (let i = 0; i < 5; i++) cyl({ r: 0.07, h: 0.18, x: -110.5, y: 0.9, z: -18.8 + i * 0.35, mat: M.std('jar2', { color: 0xbfd0c0, rough: 0.1, transparent: true, opacity: 0.5 }) });
    cyl({ r: 0.25, h: 0.08, x: -110.45, y: 1.35, z: -17.6, mat: M.color(0xf2ebe0), rz: Math.PI / 2 });
    // corkboard (clue board)
    box({ w: 0.05, h: 1, d: 1.6, x: -103.1, y: 1.1, z: -20.9, mat: M.std('cork', { color: 0xb88a55, rough: 1, map: 'dirt' }), col: false, name: 'corkboard' });
    // trapdoor hatch in the floor (covered by fallen boards until chapter 5)
    const hatch = box({ w: 0.9, h: 0.04, d: 0.9, x: -105, y: 0.02, z: -21, mat: 'midwood', col: false, name: 'hatch' }); hatch.userData.dynamic = true;
    const boards = new THREE.Group(); root.add(boards); W.obj.hatchBoards = boards; boards.userData.dynamic = true;
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.2), M.get('shedwood')); b.position.set(-105 + (rng() - 0.5) * 0.3, 0.08 + i * 0.05, -21.3 + i * 0.2); b.rotation.y = (rng() - 0.5) * 0.6; b.castShadow = true; boards.add(b); b.userData.dynamic = true; }
    collider(-105.6, -104.4, -21.6, -20.4, 0, 0.25, { name: 'hatchBoards', climb: true });
    // cobwebs
    for (const [wx, wz] of [[-110.8, -23.8], [-103.2, -16.3]]) { const cw = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8, 0, Math.PI / 2), M.std('web', { color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })); cw.position.set(wx, 2.3, wz); cw.rotation.y = Math.PI / 4; root.add(cw); }
    area('shed', "Arlo's Workshop", x0, x1, z0, z1, { zone: 'forest', indoor: true, surf: 'wood', dim: 0.6 });
    W.noGrass.push([x0 - 1, x1 + 1, z0 - 1, z1 + 1]);
  }

  /* ================================================================ CAVE */
  function buildCave() {
    const cx = -119, cz = 42;
    // outcrop: big rocks form a ring with an entrance facing south-east
    const ringR = 4.2;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; if (a > 0.3 && a < 1.2) continue; const x = cx + Math.cos(a) * ringR, z = cz + Math.sin(a) * ringR; W.rocks.push([x, 0, z, 1.4 + rng() * 0.6, 'rock', true]); }
    const roof = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), M.get('rock')); roof.scale.set(5.2, 1.7, 5.2); roof.position.set(cx, 3.3, cz); roof.castShadow = true; root.add(roof);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), M.std('caveInner', { color: 0x5a554d, rough: 1, map: 'stone', side: THREE.BackSide, flat: true })); inner.scale.set(4.4, 2.2, 4.4); inner.position.set(cx, 0.4, cz); root.add(inner);
    collider(cx - 5, cx + 5, cz - 5, cz + 5, 2.4, 3.5, { walk: false });
    plane(cx - 4, cx + 4, cz - 4, cz + 4, 0.015, M.std('cavefloor', { map: 'stone', color: 0x7a746a, rough: 1 }), 2);
    for (let i = 0; i < 7; i++) { const a = rng() * 6.28, r = rng() * 2.5; const m = sph({ x: cx + Math.cos(a) * r, y: 0.02, z: cz + Math.sin(a) * r, r: 0.05, sy: 0.6, mat: 'mushroom', cast: false }); }
    light(cx, 0.6, cz, 0x6fe0c4, 1.2, 6, { cave: true });
    area('cave', 'Echo Cave', cx - 4.5, cx + 4.5, cz - 4.5, cz + 4.5, { zone: 'forest', indoor: true, dark: true, surf: 'stone' });
    W.noGrass.push(['c', cx, cz, 6]);
  }

  /* ================================================================ BASEMENT (underground) */
  function buildBasement() {
    const y = UG, x0 = -6, x1 = 8, z0 = -5, z1 = 5, H = 2.4;
    plane(x0, x1, z0, z1, y + 0.004, 'concrete', 2);
    wall(x0, z0, x1, z0, H, 0.3, 'stonewall', 'stonewall', [], { y, s: 1.4 }); wall(x0, z1, x1, z1, H, 0.3, 'stonewall', 'stonewall', [], { y, s: 1.4 });
    wall(x1, z0, x1, z1, H, 0.3, 'stonewall', 'stonewall', [], { y, s: 1.4 });
    wall(x0, z0, x0, z1, H, 0.3, 'stonewall', 'stonewall', [[-0.32, 0.32, 0.5]], { y, s: 1.4 });
    const c = plane(x0, x1, z0, z1, y + H, M.std('joists', { map: 'planks', color: 0x7a6a5a }), 2); c.rotation.x = Math.PI; c.position.y = y + H;
    collider(x0, x1, z0, z1, y + H, y + H + 0.5, { walk: false });
    for (let x = x0 + 0.5; x < x1; x += 1.2) box({ w: 0.12, h: 0.2, d: 10, x, y: y + H - 0.2, z: 0, mat: 'darkwood', col: false });
    // boiler with a warm glow
    cyl({ r: 0.55, h: 1.7, x: 6.6, y, z: -3.6, mat: 'boiler', col: true }); box({ w: 0.2, h: 0.12, d: 0.05, x: 6.6, y: y + 0.4, z: -3.04, mat: 'ember', col: false });
    cyl({ r: 0.1, h: 0.9, x: 6.6, y: y + 1.7, z: -3.6, mat: 'darkmetal' });
    light(6.6, y + 0.5, -2.7, 0xff7a2f, 1.2, 4, { ug: true, flicker: 0.5 });
    // hanging bulb
    cyl({ r: 0.006, h: 0.5, x: 0.5, y: y + H - 0.5, z: 0, mat: 'darkmetal' }); sph({ x: 0.5, y: y + H - 0.55, z: 0, r: 0.06, mat: M.std('bulb', { color: 0xfff2c0, emissive: 0xffd28a, ei: 1.4 }) });
    light(0.5, y + H - 0.7, 0, 0xffd28a, 1.1, 8, { ug: true, flicker: 0.05 });
    // shelves, washing machine, boxes
    box({ w: 3, h: 1.8, d: 0.45, x: 1, y, z: -4.6, mat: 'midwood' });
    for (let i = 0; i < 6; i++) cyl({ r: 0.08, h: 0.2, x: -0.2 + i * 0.45, y: y + 1.0, z: -4.5, mat: M.std('preserve' + (i % 3), { color: [0xd9412f, 0xe8a33b, 0x9ab83a][i % 3], rough: 0.2, transparent: true, opacity: 0.85 }) });
    box({ w: 0.75, h: 0.9, d: 0.7, x: 7.4, y, z: 3.9, mat: M.std('washer', { color: 0xeae6dc, rough: 0.4 }) }); cyl({ r: 0.2, h: 0.03, x: 7.02, y: y + 0.5, z: 3.9, mat: 'glass', rz: Math.PI / 2 });
    box({ w: 0.8, h: 0.6, d: 0.7, x: 3.5, y, z: 4.4, mat: 'cardboard', climb: true }); box({ w: 0.6, h: 0.5, d: 0.6, x: 4.4, y, z: 4.4, mat: 'cardboard', climb: true });
    // Ellie's old memory box
    box({ w: 0.7, h: 0.4, d: 0.5, x: 2, y, z: -3.9, mat: M.std('memorybox', { color: 0xc96f5b, rough: 0.8 }), climb: true, name: 'memoryBox' });
    // the crate that hides the tunnel
    const crate = box({ w: 0.8, h: 0.7, d: 0.8, x: -5.4, y, z: 0, mat: M.std('crate', { color: 0xb08a5a, rough: 0.9, map: 'shedwood' }), col: false, name: 'crate' }); crate.userData.dynamic = true;
    collider(-5.8, -5.0, -0.4, 0.4, y, y + 0.7, { name: 'crate' });
    const scratch = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: G.Tex.make('jscratch', 64, 64, (g) => { g.strokeStyle = 'rgba(230,220,200,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 10); g.lineTo(40, 45); g.quadraticCurveTo(38, 56, 24, 52); g.stroke(); }), transparent: true }));
    scratch.position.set(-5.84, y + 0.8, 0); scratch.rotation.y = Math.PI / 2; root.add(scratch);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), M.color(0x0a0605, 1)); hole.position.set(-5.84, y + 0.22, 0); hole.rotation.y = Math.PI / 2; root.add(hole);
    // vent duct
    box({ w: 0.5, h: 2.1, d: 0.5, x: 6.6, y: y + 0.3, z: 1.0, mat: 'metal', col: false }); box({ w: 0.7, h: 0.3, d: 0.7, x: 6.6, y, z: 1.0, mat: 'darkmetal', climb: true });
    area('basement', 'Basement', x0, x1, z0, z1, { ug: true, indoor: true, zone: 'under', surf: 'stone', dim: 0.3 });
  }

  /* ================================================================ TUNNELS (underground capsule networks) */
  function tunnel(id, pts, o = {}) {
    const P = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(P.map((p) => p.clone().add(new THREE.Vector3(0, 0.22, 0))), false, 'centripetal');
    const len = curve.getLength(); const r = o.vr || 0.52;
    const geo = new THREE.TubeGeometry(curve, Math.max(8, Math.ceil(len * 5)), r, 12, false);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.2, uv.getY(i) * 2);
    if (!o.noVis) { const m = new THREE.Mesh(geo, M.std('tunnelwall', { map: 'dirt', color: 0x9a7a5a, rough: 1, side: THREE.BackSide })); m.receiveShadow = true; root.add(m); }
    for (let i = 0; i < P.length - 1 && !o.noVis; i++) {
      const a = P[i], b = P[i + 1], d = b.clone().sub(a), l = d.length();
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, l + 0.5), M.get('dirt')); f.position.copy(a).add(b).multiplyScalar(0.5); f.position.y -= 0.025;
      f.lookAt(b.x, f.position.y + (b.y - a.y) / 2, b.z); f.receiveShadow = true; root.add(f);
      // hanging roots and glowing mushrooms
      if (rng() > 0.3) { const rp = a.clone().lerp(b, rng()); const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 0.3 + rng() * 0.3, 5), M.color(0x6b4a33)); rt.position.set(rp.x + (rng() - 0.5) * 0.4, rp.y + 0.55, rp.z + (rng() - 0.5) * 0.4); rt.rotation.z = (rng() - 0.5) * 0.6; root.add(rt); }
      if (rng() > 0.45) { const mp = a.clone().lerp(b, rng()); const side = rng() > 0.5 ? 1 : -1; const nrm = new THREE.Vector3(d.z, 0, -d.x).normalize().multiplyScalar(0.36 * side); for (let k = 0; k < 3; k++) { const mm = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rng() * 0.02, 8, 6), M.get('mushroom')); mm.scale.y = 0.6; mm.position.set(mp.x + nrm.x + rng() * 0.1, mp.y + 0.05 + rng() * 0.1, mp.z + nrm.z + rng() * 0.1); root.add(mm); } light(mp.x + nrm.x, mp.y + 0.2, mp.z + nrm.z, 0x6fe0c4, 0.7, 2.5, { ug: true }); }
    }
    const T = { id, pts: pts.map((p) => p.slice()), r: o.r || 0.3, on: true };
    W.tunnels.push(T); return T;
  }
  function buildTunnels() {
    const y = UG;
    // Tunnel A: basement -> backyard (chapter 1), with a caved-in side passage to Moss's nook
    tunnel('A', [[-5.6, y, 0], [-7, y, 0], [-8.6, y, -0.6], [-10, y, -2], [-11, y, -4.8], [-11.2, y, -8], [-11.8, y, -10.6], [-12.4, y, -12]]);
    tunnel('A2', [[-11, y, -4.8], [-12.4, y, -4.6], [-13.8, y, -4.4], [-15.4, y, -4.2], [-17, y, -4]]);
    const rub = new THREE.Group(); root.add(rub); W.obj.rubble = rub; rub.userData.dynamic = true;
    for (let i = 0; i < 9; i++) { const rr = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rng() * 0.12, 0), M.get('rock')); rr.position.set(-13.3 + (rng() - 0.5) * 0.3, y + rng() * 0.45, -4.5 + (rng() - 0.5) * 0.6); rr.castShadow = true; rub.add(rr); rr.userData.dynamic = true; }
    collider(-13.6, -13.0, -5.0, -3.9, y, y + 0.8, { name: 'rubble' });
    // Moss's nook: a round chamber under the garden
    const nook = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), M.std('nookwall', { map: 'dirt', color: 0xa07a5a, rough: 1, side: THREE.BackSide })); nook.scale.set(1, 0.6, 1); nook.position.set(-18.4, y + 0.3, -4); root.add(nook);
    disc(-18.4, -4, 1.45, y + 0.003, 'dirt', 1);
    for (let i = 0; i < 20; i++) { const a = rng() * 6.28, r = 0.6 + rng() * 0.7; const lf = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), M.std('dryleaf', { color: 0xb5793a, rough: 1, side: THREE.DoubleSide })); lf.rotation.x = -Math.PI / 2; lf.rotation.z = rng() * 6; lf.position.set(-18.4 + Math.cos(a) * r, y + 0.01 + rng() * 0.02, -4 + Math.sin(a) * r); root.add(lf); }
    light(-18.4, y + 0.6, -4, 0xffb866, 0.9, 4, { ug: true, flicker: 0.2 });
    tunnel('NOOK', [[-17, y, -4], [-18.4, y, -4], [-18.5, y, -4.1]], { r: 1.05, noVis: true });
    // Deep tunnel from the workshop hatch (chapter 5)
    tunnel('D', [[-40, y, -10], [-37, y, -10], [-34, y, -10.2]]);
    tunnel('DL', [[-34, y, -10.2], [-32.4, y, -12.6], [-31.4, y, -15.6], [-31, y, -16.6]]);
    tunnel('DR', [[-34, y, -10.2], [-32.4, y, -7.6], [-30.8, y, -5.4], [-30.4, y, -4.8]]);
    tunnel('DC', [[-34, y, -10.2], [-31, y, -10.1], [-28.6, y, -10], [-26.4, y, -9.8], [-24.6, y + 0.45, -9.2], [-23, y + 0.9, -8.2], [-21.6, y + 0.9, -6.6], [-20.2, y + 0.35, -5], [-18.6, y, -4.1]]);
    // roots blocking the centre passage (dig through)
    const roots = new THREE.Group(); root.add(roots); W.obj.roots = roots; roots.userData.dynamic = true;
    for (let i = 0; i < 10; i++) { const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.9, 6), M.color(0x6b4a33, 0.9)); rt.position.set(-27.4 + (rng() - 0.5) * 0.2, y + 0.4, -10 + (i - 5) * 0.09); rt.rotation.set((rng() - 0.5) * 0.8, 0, (rng() - 0.5) * 0.8); roots.add(rt); rt.userData.dynamic = true; }
    sph({ x: -27.4, y: y, z: -10, r: 0.45, sy: 0.4, mat: 'dirt', name: 'rootMound' }).userData.dynamic = true;
    collider(-27.7, -27.1, -10.5, -9.5, y, y + 1, { name: 'roots' });
    // arrows scratched by Juniper years ago
    area('nook', "Moss's Nook", -20, -16.8, -5.6, -2.4, { ug: true, zone: 'under', surf: 'dirt', dim: 0.4 });
    area('tunnelA', 'The Old Tunnel', -16.8, -5.9, -13, 1, { ug: true, zone: 'under', surf: 'dirt', dark: true });
    area('deep', 'Juniper’s Tunnels', -41, -20, -18, -2, { ug: true, zone: 'under', surf: 'dirt', dark: true });
  }

  /* ground height: terrain patches (surface or underground) or the flat default */
  W.terrains = []; W.openUG = [[-5.95, 8, -5, 5]];
  W.terrainAt = function (x, z, ug) { for (const t of W.terrains) if (!!t.ug === ug && x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1) { const h = t.h(x, z); if (h !== null) return h; } return null; };
  W.groundAt = function (x, y, z) { const ug = y < UG + 12; const t = W.terrainAt(x, z, ug); return t === null ? (ug ? UG : 0) : t; };
  W.groundY = (x, z) => { const t = W.terrainAt(x, z, false); return t === null ? 0 : t; };
  W.openUGAt = (x, z) => W.openUG.some((r) => x > r[0] && x < r[1] && z > r[2] && z < r[3]);
  W.h = { box, cyl, sph, plane, disc, area, light, collider, wall, fence, hedge, blob, tunnel, windowAt, doorPanel, roofPrism };
  function buildAreas() {
    area('forest', 'Hollow Wood', -140, -50, -70, 80, { zone: 'forest', surf: 'leaves' });
    area('town', 'Maple Street', -52, 92, -32, 66, { zone: 'town', surf: 'grass' });
  }

  /* area lookup: most specific (first registered) wins; underground areas only below y=-20 */
  W.areaAt = function (x, y, z) {
    const ug = y < UG + 12;
    for (const a of W.areas) { if (!!a.ug !== ug) continue; if (a.y0 !== undefined && (y < a.y0 || y >= a.y1)) continue; if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) return a; }
    return ug ? W.areas.find((a) => a.id === 'tunnelA') : W.areas[W.areas.length - 1];
  };
  W.surfaceAt = function (x, y, z, a) {
    a = a || W.areaAt(x, y, z);
    if (a.id === 'backyard' && x > 1.3 && x < 8.7 && z > -9.7) return 'stone';
    if (a.zone === 'house' && W.rugs.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) return 'rug';
    if (a.id === 'street' || (z > 13.8 && z < 26.2 && x > -50 && x < 90)) return 'stone';
    if (a.zone === 'forest' && W.clearZones && W.clearZones.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < 1.2)) return 'dirt';
    return a.surf || 'grass';
  };

  /* ================================================================ nav graph for scent trails */
  function buildNav() {
    const N = {
      basket: [-3, 0, -3.9], bedC: [-4, 0, -2.4], bdN: [-1.9, 0, -0.9], bdS: [-1.9, 0, 0.9], mhB: [-0.5, 0, -3.18], mhK: [0.5, 0, -3.18],
      liv: [-3.5, 0, 2.2], sofa: [-4.2, 0, 4.2], lDoor: [1.3, 0, 3], hDoor: [2.7, 0, 3], hall: [5, 0, 3], vent: [6.6, 0, 1.6], kdS: [3.5, 0, 0.9], kdN: [3.5, 0, -0.9],
      kit: [5.6, 0, -1.8], flapIn: [5, 0, -5.3], flapOut: [5, 0, -6.8], bowls: [6.8, 0, -1.6], drawer: [1.35, 0, -4.8],
      gDoorH: [7.4, 0, 3.8], gDoorG: [8.6, 0, 3.8], gar: [12.3, 0, 4.4], gGapIn: [12.8, 0, 5.4], gGapOut: [12.8, 0, 6.8],
      patio: [5, 0, -10.2], yard: [3, 0, -15.5], bush: [-6.2, 0, -23.6], digIn: [15.1, 0, -22], digOut: [16.9, 0, -22], gateIn: [15.2, 0, -15], gateOut: [16.9, 0, -15],
      lane: [19.5, 0, -12], laneS: [19.5, 0, 10], front: [5, 0, 11], drive: [11, 0, 11], st0: [5, 0, 18], stE: [19.5, 0, 18], stW: [-20, 0, 18], stWW: [-40, 0, 18], stE2: [31, 0, 18], stE3: [53, 0, 18],
      tilly: [-31, 0, 10], bramP: [31, 0, 10], shop: [53, 0, 11], alley: [62, 0, 6],
      pGate: [2, 0, 27], oak: [2, 0, 36], play: [18, 0, 42], playC: [22, 0, 44], pondE: [-2, 0, 46], pw: [-12, 0, 42], pnw: [-22, 0, 50], nora: [-25, 0, 54], hIn: [-28.8, 0, 50], hOut: [-31.4, 0, 50], hp: [-40, 0, 50],
      f0: [-50, 0, 50], f1: [-58, 0, 48], mossLog: [-59.5, 0, 40.6], f2: [-66, 0, 40], f3: [-72, 0, 29], cE: [-77.5, 0, 22], cW: [-82.5, 0, 22], f4: [-88, 0, 18], f45: [-94, 0, 13], clr: [-100, 0, 10], stump: [-95.5, 0, 7],
      f5: [-102, 0, -4], shedDoor: [-107, 0, -14.5], shedIn: [-107, 0, -18], hatch: [-105, 0, -20.2], board: [-103.8, 0, -20.9], bench: [-107, 0, -22.4],
      f6: [-108, 0, 24], f7: [-116, 0, 36], cave: [-118, 0, 41],
      // underground
      bVent: [6.6, UG, 1.9], bC: [2, UG, 0], bCrate: [-4.6, UG, 0.2], bMem: [2, UG, -3.2], tA0: [-7, UG, 0], tA1: [-10, UG, -2], tA2: [-11, UG, -4.8], tA3: [-11.2, UG, -8], tAend: [-12.3, UG, -11.8],
      tA2b: [-12.8, UG, -4.6], tRub: [-14.2, UG, -4.3], nook: [-18.4, UG, -4],
      d0: [-39.5, UG, -10], dF: [-34, UG, -10.2], dL: [-31, UG, -16.4], dR: [-30.5, UG, -4.9], dC1: [-28.6, UG, -10], dRoots: [-27.9, UG, -10], dC2: [-26.4, UG, -9.8], dC3: [-23, UG + 0.9, -8.2], dC4: [-20.2, UG + 0.35, -5],
    };
    const E = 'basket-bedC bedC-bdN bdN-bdS bdS-liv liv-sofa bedC-mhB mhB-mhK mhK-kit liv-lDoor lDoor-hDoor hDoor-hall hall-vent hall-kdS kdS-kdN kdN-kit kit-flapIn flapIn-flapOut kit-bowls kit-drawer mhK-drawer hall-gDoorH gDoorH-gDoorG gDoorG-gar gar-gGapIn gGapIn-gGapOut gGapOut-drive drive-front front-st0 ' +
      'flapOut-patio patio-yard yard-bush yard-digIn digIn-digOut yard-gateIn gateIn-gateOut gateOut-lane digOut-lane lane-laneS laneS-stE stE-st0 st0-stW stW-stWW stW-tilly stE-stE2 stE2-bramP stE2-stE3 stE3-shop shop-alley ' +
      'st0-pGate pGate-oak oak-play play-playC oak-pondE oak-pw pw-pnw pnw-nora pnw-hIn hIn-hOut hOut-hp hp-f0 f0-f1 f1-mossLog f1-f2 f2-f3 f3-cE cE-cW cW-f4 f4-f45 f45-clr clr-stump clr-f5 f5-shedDoor shedDoor-shedIn shedIn-hatch shedIn-board shedIn-bench clr-f6 f6-f7 f7-cave ' +
      'bVent-bC bC-bCrate bC-bMem bCrate-tA0 tA0-tA1 tA1-tA2 tA2-tA3 tA3-tAend tA2-tA2b tA2b-tRub tRub-nook d0-dF dF-dL dF-dR dF-dC1 dC1-dRoots dRoots-dC2 dC2-dC3 dC3-dC4 dC4-nook';
    const adj = {}; for (const k in N) adj[k] = [];
    for (const e of E.split(/\s+/)) { if (!e) continue; const [a, b] = e.split('-'); if (!adj[a] || !adj[b]) { console.warn('nav edge', e); continue; } adj[a].push(b); adj[b].push(a); }
    W.nav = { N, adj };
  }
  W.navPath = function (from, to) {
    const { N, adj } = W.nav; const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 * 4 + (p[2] - q[2]) ** 2;
    const aFrom = W.areaAt(from[0], from[1], from[2]).id, aTo = W.areaAt(to[0], to[1], to[2]).id;
    const nearest = (p, aid) => { let best = null, bd = 1e9; for (const k in N) { const q = N[k]; const same = W.areaAt(q[0], q[1], q[2]).id === aid; const d = d2(p, q) * (same ? 1 : 6); if (d < bd) { bd = d; best = k; } } return best; };
    const s = nearest(from, aFrom), t = nearest(to, aTo);
    const dist = {}, prev = {}, Q = new Set(Object.keys(N)); for (const k in N) dist[k] = Infinity; dist[s] = 0;
    while (Q.size) { let u = null, ud = Infinity; for (const k of Q) if (dist[k] < ud) { ud = dist[k]; u = k; } if (u === null || u === t) break; Q.delete(u); for (const v of adj[u]) { const alt = dist[u] + Math.sqrt(d2(N[u], N[v])); if (alt < dist[v]) { dist[v] = alt; prev[v] = u; } } }
    const path = [to]; let c = t; if (dist[t] === Infinity) return [from, to];
    while (c) { path.unshift(N[c]); c = prev[c]; }
    path.unshift(from);
    return path;
  };

  /* ================================================================ instanced vegetation
     Everything is split into cells so the graphics system can cull by
     frustum and distance and swap in lower-detail geometry far away. */
  W.lod = [];
  function chunked(scene, geo, mat, items, place, o = {}) {
    const cell = o.cell || 48, groups = new Map();
    for (const it of items) { const k = Math.floor(it[0] / cell) + ',' + Math.floor(it[o.zi || 1] / cell); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), out = [];
    for (const [k, arr] of groups) {
      const per = o.per || 1, im = new THREE.InstancedMesh(o.lo ? o.hiGeo || geo : geo, mat, arr.length * per); let n = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, maxY = 0;
      for (const it of arr) for (let j = 0; j < per; j++) { if (place(it, m4, col, j) === false) continue; im.setMatrixAt(n, m4); if (o.color) im.setColorAt(n, col); const e = m4.elements; minX = Math.min(minX, e[12]); maxX = Math.max(maxX, e[12]); minZ = Math.min(minZ, e[14]); maxZ = Math.max(maxZ, e[14]); maxY = Math.max(maxY, e[13]); n++; }
      im.count = n; if (!n) continue; im.frustumCulled = false; im.castShadow = o.cast !== false; im.receiveShadow = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      scene.add(im);
      const c = new THREE.Vector3((minX + maxX) / 2, maxY / 2, (minZ + maxZ) / 2), r = Math.hypot(maxX - minX, maxZ - minZ, maxY) / 2 + (o.pad || 2);
      const L = { mesh: im, c, r, cls: o.cls || 'tree', hi: o.hiGeo || geo, lo: o.lo || null, loD: o.loD, ug: !!o.ug, total: n }; W.lod.push(L); out.push(L);
    }
    return out;
  }
  W.chunked = chunked;
  function buildInstanced(scene) {
    const gy = (x, z) => W.groundY(x, z);
    // --- trees (deciduous): trunk + canopy blobs
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1, 8); trunkGeo.translate(0, 0.5, 0);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: G.Tex.get('foliage') }); W.canopyMat = canopyMat; canopyMat.userData.outdoor = true;
    windify(canopyMat, 0.12);
    const blobs = [], pineBlobs = [], trunkList = [];
    const e = new THREE.Euler(), q4 = new THREE.Quaternion();
    for (const [x, z, s, kind] of W.trees) {
      const h = (kind === 'oak' ? 3.2 : 2.6) * s, r = kind === 'oak' ? 2.2 : 1, y = gy(x, z);
      trunkList.push([x, z, r * s * 0.9, h, rng() * 6, y]);
      collider(x - 0.2 * s * r, x + 0.2 * s * r, z - 0.2 * s * r, z + 0.2 * s * r, y, y + h + 2, { cam: false });
      const nb = kind === 'oak' ? 9 : 5 + Math.floor(rng() * 3);
      const hue = kind === 'apple' ? 0x7fae4a : W.forestTint(x);
      for (let i = 0; i < nb; i++) { const a = rng() * 6.28, rr = rng() * 1.1 * s * (kind === 'oak' ? 1.6 : 1); blobs.push([x + Math.cos(a) * rr, z + Math.sin(a) * rr, y + h + (rng() * 1.3 - 0.2) * s * (kind === 'oak' ? 1.3 : 1), (0.9 + rng() * 0.6) * s * (kind === 'oak' ? 1.5 : 1), hue, rng(), rng(), rng(), (rng() - 0.5), (rng() - 0.5)]); }
      if (kind === 'apple') for (let i = 0; i < 10; i++) { const a = rng() * 6.28, rr = 0.8 + rng() * 0.8; sph({ x: x + Math.cos(a) * rr * s, y: y + h + (rng() - 0.3) * s, z: z + Math.sin(a) * rr * s, r: 0.07, mat: M.color(0xd9412f, 0.4) }); }
    }
    for (const [x, z, s] of W.pines) {
      const h = 1.2 * s, y = gy(x, z); trunkList.push([x, z, 0.7 * s, h + 1.4 * s, 0, y]);
      collider(x - 0.18 * s, x + 0.18 * s, z - 0.18 * s, z + 0.18 * s, y, y + 8, { cam: false });
      // five tapering tiers read as a proper conifer rather than stacked discs
      for (let i = 0; i < 5; i++) pineBlobs.push([x, z, y + h + i * 0.82 * s, (1.42 - i * 0.25) * s, (1.75 - i * 0.12) * s, rng() * 6, rng()]);
    }
    chunked(scene, trunkGeo, M.get('bark'), trunkList, ([x, z, w, h, ry, y], m4) => { m4.compose(V3(x, y, z), q4.setFromEuler(e.set(0, ry, 0)), V3(w, h, w)); }, { cls: 'tree' });
    W.canopyGeo = [new THREE.IcosahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 2)];
    const col = new THREE.Color();
    W.canopyChunks = chunked(scene, null, canopyMat, blobs, ([x, z, y, s, c, r1, r2, r3, h1, l1], m4, cl) => { m4.compose(V3(x, y, z), q4.setFromEuler(e.set(r1, r2, r3)), V3(s, s * 0.85, s)); cl.set(c).offsetHSL(h1 * 0.04, 0, l1 * 0.08); }, { cls: 'tree', color: true, hiGeo: W.canopyGeo[1], lo: W.canopyGeo[0], loD: 70 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: G.Tex.get('foliage') }); windify(pineMat, 0.06); pineMat.userData.outdoor = true;
    const pineHi = new THREE.ConeGeometry(1, 1, 12, 2); pineHi.translate(0, 0.5, 0); { const p = pineHi.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.05) p.setY(i, p.getY(i) - 0.12); pineHi.computeVertexNormals(); }
    const pineLo = new THREE.ConeGeometry(1, 1, 6); pineLo.translate(0, 0.5, 0);
    W.pineMat = pineMat; W.pineGeo = [pineHi, pineLo]; W.trunkGeo = trunkGeo;
    chunked(scene, null, pineMat, pineBlobs, ([x, z, y, r, h, ry, l], m4, cl) => { m4.compose(V3(x, y, z), q4.setFromEuler(e.set(0, ry, 0)), V3(r, h, r)); cl.set(0x3d5a3a).offsetHSL((l - 0.5) * 0.03, 0, (l - 0.5) * 0.06); }, { cls: 'tree', color: true, hiGeo: pineHi, lo: pineLo, loD: 60 });
    // --- bushes
    const bushM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: G.Tex.get('foliage') }); windify(bushM, 0.05); bushM.userData.outdoor = true; W.bushMat = bushM;
    W.bushes.forEach(([x, y, z, s, c, solid]) => { if (solid && s > 0.6) collider(x - s * 0.5, x + s * 0.5, z - s * 0.5, z + s * 0.5, 0.25, 1, { cam: false }); });
    chunked(scene, null, bushM, W.bushes.map((b) => [b[0], b[2], b[1], b[3], b[4], rng(), rng(), rng(), rng()]), ([x, z, y, s, c, a, b2, c2, l], m4, cl) => { m4.compose(V3(x, y + gy(x, z), z), q4.setFromEuler(e.set(a * 6, b2 * 6, c2 * 6)), V3(s, s * 0.75, s)); cl.set(c).offsetHSL(0, 0, (l - 0.5) * 0.08); }, { cls: 'small', color: true, hiGeo: W.canopyGeo[1], lo: W.canopyGeo[0], loD: 45 });
    // --- rocks
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const byMat = {}; for (const r of W.rocks) (byMat[r[4]] = byMat[r[4]] || []).push(r);
    for (const k in byMat) {
      const arr = byMat[k].map((r) => [r[0], r[2], r[1], r[3], r[5], rng(), rng(), rng(), rng(), rng()]);
      for (const [x, z, y, s, big] of arr) if (s > 0.35) collider(x - s * 0.8, x + s * 0.8, z - s * 0.8, z + s * 0.8, y + gy(x, z), y + gy(x, z) + s * (big ? 3 : 0.9), { cam: !!big });
      chunked(scene, rockGeo, M.get(k), arr, ([x, z, y, s, big, a, b2, c2, d, f], m4) => { m4.compose(V3(x, y + gy(x, z) + s * 0.2, z), q4.setFromEuler(e.set(a, b2, c2)), V3(s * (1 + d * 0.4), s * (0.6 + f * 0.4), s)); }, { cls: 'small', pad: 3 });
    }
    // --- ferns & reeds
    const fernGeo = new THREE.PlaneGeometry(0.16, 0.7, 1, 3); fernGeo.translate(0, 0.35, 0); { const p = fernGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, y * y * 0.5); } fernGeo.computeVertexNormals(); }
    const fernMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, map: G.Tex.get('foliage') }); windify(fernMat, 0.2, true); fernMat.userData.outdoor = true; W.fernMat = fernMat; W.fernGeo = fernGeo; W.rockGeo = rockGeo;
    chunked(scene, fernGeo, fernMat, W.ferns.map((f) => [f[0], f[1], f[2], f[3], rng(), rng(), rng(), rng(), rng()]), ([x, z, s, kind, r1, r2, r3, r4, r5], m4, cl, k) => {
      const fronds = kind === 'reed' ? 3 : 5; if (k >= fronds) return false; const a = (k / fronds) * 6.28 + [r1, r2, r3, r4, r5][k];
      m4.compose(V3(x, gy(x, z), z), q4.setFromEuler(e.set(kind === 'reed' ? 0 : 0.5 + r2 * 0.3, a, 0, 'YXZ')), V3(s * (kind === 'reed' ? 0.3 : 1), s * (kind === 'reed' ? 1.9 : 1), s)); cl.set(kind === 'reed' ? 0x8a9a4a : 0x5a7a3a).offsetHSL(0, 0, (r3 - 0.5) * 0.1);
    }, { cls: 'small', color: true, per: 5, cast: false });
    // --- flowers
    const flM = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const flowerItems = W.flowers.map(([x, z, c]) => [x, z, c, 0.2 + rng() * 0.2]);
    chunked(scene, new THREE.SphereGeometry(0.05, 6, 4), flM, flowerItems, ([x, z, c, h], m4, cl) => { m4.compose(V3(x, h + gy(x, z), z), q4.identity(), V3(1, 0.7, 1)); cl.set(c); }, { cls: 'small', color: true, cast: false });
    chunked(scene, new THREE.CylinderGeometry(0.006, 0.006, 1, 3), M.color(0x4f7a3a), flowerItems, ([x, z, c, h], m4) => { m4.compose(V3(x, h / 2 + gy(x, z), z), q4.identity(), V3(1, h, 1)); }, { cls: 'small', cast: false });
    // --- grass blades
    buildGrass(scene, G.GFX ? G.GFX.grassDensity || 1 : 1);
  }
  W.setTreeDetail = function (lvl) { const g = W.canopyGeo[Math.min(2, Math.max(1, lvl))]; for (const c of W.canopyChunks || []) { if (c.mesh.geometry === c.hi) c.mesh.geometry = g; c.hi = g; } };
  W.windify = (m, a, t) => windify(m, a, t);
  W.withRoot = (g, fn) => { const old = root; root = g; try { fn(); } finally { root = old; } };
  W.grassAllowed = (x, z) => grassAllowed(x, z);
  W.forestTint = (x) => (x < -50 ? [0x4d6e36, 0x5a7a3a, 0x6b7a35, 0x8a8a3a][Math.floor(rng() * 4)] : [0x55743a, 0x5f8a3a, 0x4d6e36][Math.floor(rng() * 3)]);
  W.windU = { value: 0.3 }; W.timeU = { value: 0 }; W.playerU = { value: new THREE.Vector3() };
  function windify(m, amt, tip) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = W.timeU; sh.uniforms.uWind = W.windU;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
        vec4 wp0 = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        #else
        vec4 wp0 = vec4(0.0);
        #endif
        float wk = ${tip ? 'position.y * position.y * 2.0' : '1.0'} * ${amt.toFixed(3)} * (0.4 + uWind * 1.6);
        transformed.x += sin(uTime * 1.3 + wp0.x * 0.35 + wp0.z * 0.2 + position.y) * wk;
        transformed.z += cos(uTime * 1.1 + wp0.z * 0.3 + position.x) * wk * 0.6;`);
    };
  }
  function grassAllowed(x, z) {
    for (const n of W.noGrass) { if (n[0] === 'c') { if ((x - n[1]) ** 2 + (z - n[2]) ** 2 < n[3] * n[3]) return false; } else if (x > n[0] && x < n[1] && z > n[2] && z < n[3]) return false; }
    return true;
  }
  let grassScene = null;
  function buildGrass(scene, density) {
    grassScene = scene;
    // a single blade: 5 vertices, 3 triangles, tapered to a tip
    const blade = new THREE.BufferGeometry();
    const P = [-0.022, 0, 0, 0.022, 0, 0, -0.014, 0.075, 0.008, 0.014, 0.075, 0.008, 0, 0.15, 0.03];
    blade.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3, 0, 1, 0.3], 3));
    blade.setAttribute('color', new THREE.Float32BufferAttribute([0.42, 0.42, 0.42, 0.42, 0.42, 0.42, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.92, 0.94, 0.84], 3));
    blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]); W.bladeGeo = blade;
    const mat = W.grassMat || new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true, side: THREE.DoubleSide });
    mat.envMapIntensity = 0.35; mat.userData.outdoor = true;
    if (!W.grassMat) mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = W.timeU; sh.uniforms.uWind = W.windU; sh.uniforms.uPlayer = W.playerU;
      sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec3 uPlayer;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
        float hy = position.y / 0.15;
        float gust = 0.6 + 0.4 * sin(uTime * 0.37 + ip.x * 0.05) * sin(uTime * 0.23 + ip.z * 0.04);
        float sw = sin(uTime * 1.8 + ip.x * 0.7 + ip.z * 0.5) * 0.5 + sin(uTime * 3.1 + ip.x * 1.3) * 0.2;
        vec2 away = ip.xz - uPlayer.xz; float dp = length(away); float push = smoothstep(0.45, 0.0, dp) * step(abs(ip.y - uPlayer.y), 0.6);
        vec3 bendW = vec3(sw * (0.05 + uWind * 0.12 * gust) + uWind * uWind * 0.05 * gust, 0.0, sw * 0.03) + vec3(away.x, 0.0, away.y) / max(dp, 0.001) * push * 0.18;
        mat3 invR = mat3(instanceMatrix); bendW = transpose(invR) * bendW;
        transformed += bendW * hy * hy;`);
    };
    const pts = [];
    for (const z of W.grassZones) {
      let x0, x1, z0, z1, dens, circ = null;
      if (z[0] === 'c') { circ = z; x0 = z[1] - z[3]; x1 = z[1] + z[3]; z0 = z[2] - z[3]; z1 = z[2] + z[3]; dens = z[4]; } else { [x0, x1, z0, z1, dens] = z; }
      const n = Math.floor((x1 - x0) * (z1 - z0) * 16 * density * dens * (circ ? 0.785 : 1));
      for (let i = 0; i < n; i++) { const x = x0 + rng() * (x1 - x0), zz = z0 + rng() * (z1 - z0); if (circ && (x - circ[1]) ** 2 + (zz - circ[2]) ** 2 > circ[3] ** 2) continue; if (!grassAllowed(x, zz)) continue; pts.push([x, zz]); }
    }
    const MAX = Math.round(130000 * Math.max(0.4, density)); if (pts.length > MAX) { for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; } pts.length = MAX; }
    const q4 = new THREE.Quaternion(), e = new THREE.Euler();
    // blade colours are picked in sRGB and converted, so they sit in the same colour space as the painted ground
    W.grassChunks = chunked(scene, blade, mat, pts, ([x, z], m4, col) => {
      const s = 0.6 + rng() * 0.8, y = W.groundY(x, z); m4.compose(V3(x, y, z), q4.setFromEuler(e.set((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3)), V3(1 + rng() * 0.5, s, 1));
      const f = x < -50; col.setHSL((f ? 0.2 : 0.24) + (rng() - 0.5) * 0.05, 0.42 + rng() * 0.18, 0.3 + rng() * 0.12).convertSRGBToLinear();
    }, { cell: 16, cls: 'grass', color: true, cast: false, pad: 1 }).map((c) => c.mesh);
    W.grassMat = mat;
  }
  W.buildGrassExtra = null;
  /* Vegetation Quality: rebuild the grass at another density */
  W.rebuildGrass = function (density) {
    if (!grassScene) return;
    for (let i = W.lod.length - 1; i >= 0; i--) if (W.lod[i].cls === 'grass' && !W.lod[i].region) { grassScene.remove(W.lod[i].mesh); W.lod[i].mesh.dispose(); W.lod.splice(i, 1); }
    buildGrass(grassScene, density);
    if (W.onGrassRebuild) W.onGrassRebuild(density);
  };
})();
