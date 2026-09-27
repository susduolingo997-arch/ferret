/* =====================================================================
   regions.js - the framework for the sequel's new places.
   A region is declared up front (bounds, areas, terrain, nav nodes) but
   its geometry is only built when Milo gets near it, or when a save,
   fast travel or cutscene puts him there (lazy loading). Built regions
   are merged into batched meshes, their plants are instanced in LOD
   chunks, and whole regions are hidden when far away.
   Also: terrain patches with texture splatting, and small builders
   (paths, cliffs, logs, bridges, water, signs, rooms) used by the
   world-*.js files.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, EXT = G.EXT, M = G.Mat;
  const W = G.World, UG = W.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const R = (G.Regions = { defs: [], byId: {} });

  R.def = function (o) { o.built = false; o.areas = o.areas || []; o.terrains = o.terrains || []; this.defs.push(o); this.byId[o.id] = o; return o; };

  /* ---------------------------------------------------------------- registration hooks */
  const oBuild = EXT.buildWorld, oNav = EXT.buildNav, oInit = EXT.init, oUpd = EXT.update;
  EXT.buildWorld = function (Wd) {
    oBuild(Wd);
    for (const d of R.defs) {
      for (let i = d.areas.length - 1; i >= 0; i--) { const [id, name, x0, x1, z0, z1, o] = d.areas[i]; W.areas.unshift(Object.assign({ id, name, x0, x1, z0, z1, region: d.id }, o || {})); }
      for (const t of d.terrains) W.terrains.push(t);
      for (const r of d.openUG || []) W.openUG.push(r);
      for (const h of d.hazards || []) W.hazards.push(h);
      if (d.register) d.register(W);
    }
  };
  EXT.buildNav = function (Wd) {
    oNav(Wd);
    const { N, adj } = W.nav;
    for (const d of R.defs) {
      if (!d.nav) continue;
      for (const k in d.nav.nodes) { const n = d.nav.nodes[k].slice(); if (d.navGround && n[1] === 0) n[1] = W.groundY(n[0], n[2]); N[k] = n; adj[k] = adj[k] || []; }
      for (const e of (d.nav.edges || '').split(/\s+/)) { if (!e) continue; const [a, b] = e.split('-'); if (!adj[a] || !adj[b]) { console.warn('nav edge', d.id, e); continue; } adj[a].push(b); adj[b].push(a); }
    }
  };
  EXT.init = function (g) {
    oInit(g);
    // anything that moves Milo far away builds the destination first
    const tp = g.player.teleport.bind(g.player);
    g.player.teleport = function (x, y, z, yaw) { R.ensureAt(x, y, z); return tp(x, y, z, yaw); };
    W.onGrassRebuild = () => { for (const d of R.defs) if (d.built) R.regrass(d); };
    for (const d of R.defs) if (d.init) d.init(g);
  };
  EXT.update = function (dt, st) {
    oUpd(dt, st);
    const g = G.game; if (!g || !g.player) return;
    R.tick(dt, g);
  };

  /* ---------------------------------------------------------------- building + streaming */
  const distTo = (b, x, z) => Math.hypot(Math.max(b[0] - x, 0, x - b[1]), Math.max(b[2] - z, 0, z - b[3]));
  R.ensureAt = function (x, y, z) { for (const d of this.defs) if (!d.built && !d.manual && distTo(d.bounds, x, z) < 40 && (!!d.ug === y < UG + 12 || distTo(d.bounds, x, z) < 1)) this.build(d); };
  R.tick = function (dt, g) {
    const p = g.player.pos, cp = g.camera.position, vd = (G.GFX && G.GFX.viewDist) || 260;
    this._t = (this._t || 0) - dt;
    if (this._t <= 0) {
      this._t = 0.5;
      // build one region per tick at most: the nearest one inside the preload radius
      let best = null, bd = 1e9;
      for (const d of this.defs) { if (d.built || d.manual) continue; const dd = distTo(d.bounds, p.x, p.z); const lim = Math.max(110, Math.min(vd, 200)) + (d.preload || 0); if ((!!d.ug === p.y < UG + 12 || dd < 2) && dd < lim && dd < bd) { bd = dd; best = d; } }
      if (best) this.build(best);
    }
    const ug = cp.y < UG + 12;
    for (const d of this.defs) {
      if (!d.built) continue;
      const vis = d.always ? true : (!!d.ug === ug || d.bothLevels) && distTo(d.bounds, cp.x, cp.z) < vd + 50;
      d.group.visible = vis;
      if (vis && d.update) d.update(dt, g);
    }
  };
  R.build = function (d) {
    if (d.built) return d;
    const t0 = performance.now(), g = G.game, group = new THREE.Group(); group.userData.region = d.id; W.root.add(group); d.group = group;
    const c0 = W.colliders.length, l0 = W.lightSrc.length;
    const veg = (d.veg = { trees: [], pines: [], bushes: [], rocks: [], ferns: [], flowers: [], grass: [], shrooms: [] });
    const ctx = { W, H: W.h, R, root: group, veg, def: d, gy: (x, z) => R.gy(d, x, z) };
    W.withRoot(group, () => d.build(ctx));
    W.mergeStatic(group);
    R.vegetation(d, ctx);
    for (let i = c0; i < W.colliders.length; i++) g.hashC(W.colliders[i], i);
    d.group = group; d.built = true;
    if (d.onBuilt) d.onBuilt(g, ctx);
    if (g.refreshItems) g.refreshItems();
    g._lT = 99;
    d.buildMs = Math.round(performance.now() - t0);
    return d;
  };
  R.gy = function (d, x, z) { const t = W.terrainAt(x, z, !!d.ug); return t === null ? (d.ug ? UG : 0) : t; };

  /* ---------------------------------------------------------------- vegetation for a region */
  const q4 = new THREE.Quaternion(), eu = new THREE.Euler(), rng = U.rng(4040);
  R.vegetation = function (d, ctx) {
    const v = d.veg, gy = ctx.gy, grp = ctx.root, ch = W.chunked, C = W.collider;
    const tr = [], blobs = [], pines = [];
    for (const [x, z, s, kind, tint] of v.trees) {
      const y = gy(x, z), big = kind === 'oak' || kind === 'willow', h = (big ? 3.2 : kind === 'birch' ? 3.4 : 2.6) * s, r = big ? 2 : kind === 'birch' ? 0.6 : 1;
      tr.push([x, z, r * s * 0.9, h, rng() * 6, y, kind === 'birch' ? 1 : 0]);
      C(x - 0.2 * s * r, x + 0.2 * s * r, z - 0.2 * s * r, z + 0.2 * s * r, y, y + h + 2, { cam: false });
      const nb = big ? 9 : 5 + Math.floor(rng() * 3), hue = tint || (kind === 'birch' ? 0x8ab04a : kind === 'autumn' ? [0xc9722a, 0xd99a3a, 0xa8502a][Math.floor(rng() * 3)] : W.forestTint(x));
      for (let i = 0; i < nb; i++) { const a = rng() * 6.28, rr = rng() * 1.1 * s * (big ? 1.6 : 1); blobs.push([x + Math.cos(a) * rr, z + Math.sin(a) * rr, y + h + (rng() * 1.3 - 0.2) * s * (big ? 1.3 : 1) - (kind === 'willow' ? rng() * 1.2 * s : 0), (0.9 + rng() * 0.6) * s * (big ? 1.5 : 1), hue, rng(), rng(), rng(), rng() - 0.5, rng() - 0.5, kind === 'willow' ? 1.5 : 0.85]); }
    }
    for (const [x, z, s] of v.pines) { const y = gy(x, z), h = 1.2 * s; tr.push([x, z, 0.7 * s, h + 1.4 * s, 0, y, 0]); C(x - 0.18 * s, x + 0.18 * s, z - 0.18 * s, z + 0.18 * s, y, y + 8, { cam: false }); for (let i = 0; i < 5; i++) pines.push([x, z, y + h + i * 0.82 * s, (1.42 - i * 0.25) * s, (1.75 - i * 0.12) * s, rng() * 6, rng()]); }
    const bark = M.get('bark'), birch = M.std('birchbark', { color: 0xe8e2d4, rough: 0.8, map: 'bark' });
    const trB = tr.filter((t) => t[6]), trN = tr.filter((t) => !t[6]);
    const place = ([x, z, w, h, ry, y], m4) => { m4.compose(V3(x, y, z), q4.setFromEuler(eu.set(0, ry, 0)), V3(w, h, w)); };
    const L = (arr) => { for (const l of arr) { l.region = d.id; l.ug = !!d.ug; } return arr; };
    if (trN.length) L(ch(grp, W.trunkGeo, bark, trN, place, { cls: 'tree' }));
    if (trB.length) L(ch(grp, W.trunkGeo, birch, trB, place, { cls: 'tree' }));
    if (blobs.length) L(ch(grp, null, W.canopyMat, blobs, ([x, z, y, s, c, a, b, cc, h1, l1, sy], m4, cl) => { m4.compose(V3(x, y, z), q4.setFromEuler(eu.set(a, b, cc)), V3(s, s * sy, s)); cl.set(c).offsetHSL(h1 * 0.04, 0, l1 * 0.08); }, { cls: 'tree', color: true, hiGeo: W.canopyGeo[Math.min(2, G.GFX.treeDetail || 1)], lo: W.canopyGeo[0], loD: 70 })).forEach((c) => W.canopyChunks.push(c));
    if (pines.length) L(ch(grp, null, W.pineMat, pines, ([x, z, y, r, h, ry, l], m4, cl) => { m4.compose(V3(x, y, z), q4.setFromEuler(eu.set(0, ry, 0)), V3(r, h, r)); cl.set(0x3d5a3a).offsetHSL((l - 0.5) * 0.03, 0, (l - 0.5) * 0.06); }, { cls: 'tree', color: true, hiGeo: W.pineGeo[0], lo: W.pineGeo[1], loD: 60 }));
    if (v.bushes.length) { for (const [x, y, z, s, c, solid] of v.bushes) if (solid && s > 0.6) C(x - s * 0.5, x + s * 0.5, z - s * 0.5, z + s * 0.5, gy(x, z) + 0.2, gy(x, z) + 1, { cam: false });
      L(ch(grp, null, W.bushMat, v.bushes.map((b) => [b[0], b[2], b[1], b[3], b[4], rng(), rng(), rng(), rng()]), ([x, z, y, s, c, a, b2, c2, l], m4, cl) => { m4.compose(V3(x, y + gy(x, z), z), q4.setFromEuler(eu.set(a * 6, b2 * 6, c2 * 6)), V3(s, s * 0.75, s)); cl.set(c).offsetHSL(0, 0, (l - 0.5) * 0.08); }, { cls: 'small', color: true, hiGeo: W.canopyGeo[1], lo: W.canopyGeo[0], loD: 45 })); }
    const byMat = {}; for (const r of v.rocks) (byMat[r[4] || 'rock'] = byMat[r[4] || 'rock'] || []).push(r);
    for (const k in byMat) {
      const arr = byMat[k].map((r) => [r[0], r[2], r[1], r[3], r[5], rng(), rng(), rng(), rng(), rng()]);
      for (const [x, z, y, s, big] of arr) if (s > 0.35) { const b = gy(x, z) + y; C(x - s * 0.8, x + s * 0.8, z - s * 0.8, z + s * 0.8, b - 1, b + s * (big ? 3 : 0.9), { cam: !!big }); }
      L(ch(grp, W.rockGeo, M.get(k), arr, ([x, z, y, s, big, a, b2, c2, dd, f], m4) => { m4.compose(V3(x, y + gy(x, z) + s * 0.2, z), q4.setFromEuler(eu.set(a, b2, c2)), V3(s * (1 + dd * 0.4), s * (0.6 + f * 0.4) * (big ? 1.4 : 1), s)); }, { cls: big(arr) ? 'tree' : 'small', pad: 3 }));
    }
    function big(arr) { return arr.some((a) => a[3] > 1.2); }
    if (v.ferns.length) L(ch(grp, W.fernGeo, W.fernMat, v.ferns.map((f) => [f[0], f[1], f[2], f[3], rng(), rng(), rng(), rng(), rng()]), ([x, z, s, kind, r1, r2, r3, r4, r5], m4, cl, k) => {
      const fronds = kind === 'reed' ? 3 : 5; if (k >= fronds) return false; const a = (k / fronds) * 6.28 + [r1, r2, r3, r4, r5][k];
      m4.compose(V3(x, gy(x, z), z), q4.setFromEuler(eu.set(kind === 'reed' ? 0 : kind === 'tall' ? 0.15 + r2 * 0.2 : 0.5 + r2 * 0.3, a, 0, 'YXZ')), V3(s * (kind === 'reed' ? 0.3 : kind === 'tall' ? 0.45 : 1), s * (kind === 'reed' ? 1.9 : kind === 'tall' ? 1.6 : 1), s));
      cl.set(kind === 'reed' ? 0x8a9a4a : kind === 'tall' ? 0x9aa65a : kind === 'bramble' ? 0x4a5a2a : 0x5a7a3a).offsetHSL(0, 0, (r3 - 0.5) * 0.1);
    }, { cls: 'small', color: true, per: 5, cast: false }));
    if (v.flowers.length) {
      const items = v.flowers.map(([x, z, c]) => [x, z, c, 0.2 + rng() * 0.2]);
      L(ch(grp, new THREE.SphereGeometry(0.05, 6, 4), M.std('flowerM', { rough: 0.7 }), items, ([x, z, c, h], m4, cl) => { m4.compose(V3(x, h + gy(x, z), z), q4.identity(), V3(1, 0.7, 1)); cl.set(c); }, { cls: 'small', color: true, cast: false }));
      L(ch(grp, new THREE.CylinderGeometry(0.006, 0.006, 1, 3), M.color(0x4f7a3a), items, ([x, z, c, h], m4) => { m4.compose(V3(x, h / 2 + gy(x, z), z), q4.identity(), V3(1, h, 1)); }, { cls: 'small', cast: false }));
    }
    if (v.shrooms.length) {
      const sm = M.std('glowShroom', { color: 0x9fd9e9, emissive: 0x5fd0f0, ei: 1.4, rough: 0.5 });
      L(ch(grp, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sm, v.shrooms, ([x, z, s, c], m4, cl) => { m4.compose(V3(x, gy(x, z) + s * 0.6, z), q4.identity(), V3(s, s * 0.6, s)); cl.set(c || 0xffffff); }, { cls: 'small', color: true, cast: false, ug: !!d.ug }));
    }
    R.regrass(d, ctx);
  };
  R.regrass = function (d) {
    for (const l of d.grassChunks || []) { l.mesh.parent && l.mesh.parent.remove(l.mesh); const i = W.lod.indexOf(l); if (i >= 0) W.lod.splice(i, 1); }
    const v = d.veg; if (!v || !v.grass.length) return;
    const dens = (G.GFX && G.GFX.built && G.GFX.built.grass) || 1, pts = [], r = U.rng(d.id.length * 77);
    for (const z of v.grass) {
      let x0, x1, z0, z1, k, circ = null; if (z[0] === 'c') { circ = z; x0 = z[1] - z[3]; x1 = z[1] + z[3]; z0 = z[2] - z[3]; z1 = z[2] + z[3]; k = z[4]; } else [x0, x1, z0, z1, k] = z;
      const n = Math.floor((x1 - x0) * (z1 - z0) * 16 * dens * k * (circ ? 0.785 : 1));
      for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), zz = z0 + r() * (z1 - z0); if (circ && (x - circ[1]) ** 2 + (zz - circ[2]) ** 2 > circ[3] ** 2) continue; if (d.noGrass && d.noGrass(x, zz)) continue; pts.push([x, zz]); }
    }
    const e = new THREE.Euler(), q = new THREE.Quaternion(), hue = d.grassHue ?? 0.23, gy = (x, z) => R.gy(d, x, z);
    d.grassChunks = W.chunked(d.group || G.game.scene, W.bladeGeo, W.grassMat, pts, ([x, z], m4, col) => {
      const s = (0.6 + r() * 0.8) * (d.grassScale || 1); m4.compose(V3(x, gy(x, z), z), q.setFromEuler(e.set((r() - 0.5) * 0.3, r() * 6.28, (r() - 0.5) * 0.3)), V3(1 + r() * 0.5, s, 1));
      col.setHSL(hue + (r() - 0.5) * 0.05, 0.42 + r() * 0.18, 0.3 + r() * 0.12).convertSRGBToLinear();
    }, { cell: 16, cls: 'grass', color: true, cast: false, pad: 1 });
    for (const l of d.grassChunks) { l.region = d.id; l.ug = !!d.ug; }
  };

  /* ---------------------------------------------------------------- terrain with texture splatting */
  const splatCache = {};
  R.splatMat = function (key, texs, o = {}) {
    if (splatCache[key]) return splatCache[key];
    const m = new THREE.MeshStandardMaterial({ color: o.color || 0xffffff, roughness: 0.95, map: G.Tex.get(texs[0]) }); m.userData.outdoor = !o.ug; m.envMapIntensity = 0.35;
    const t1 = G.Tex.get(texs[1] || 'stone'), t2 = G.Tex.get(texs[2] || 'dirt');
    m.onBeforeCompile = (sh) => {
      sh.uniforms.tB = { value: t1 }; sh.uniforms.tC = { value: t2 }; sh.uniforms.uTS = { value: o.scale || 6 };
      sh.vertexShader = 'attribute vec3 splat; varying vec3 vSplat; varying vec3 vTW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSplat = splat; vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform sampler2D tB; uniform sampler2D tC; uniform float uTS; varying vec3 vSplat; varying vec3 vTW;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        vec2 tuv = vTW.xz / uTS; vec3 sw = vSplat / max(vSplat.x + vSplat.y + vSplat.z, 1e-3);
        vec2 ruv = abs(vTW.y) > 0.0 ? vec2(vTW.x + vTW.z, vTW.y) / uTS : tuv;
        vec4 tex = texture2D(map, tuv) * sw.x + texture2D(tB, mix(tuv * 0.7, ruv * 0.7, 0.5)) * sw.y + texture2D(tC, tuv * 1.3) * sw.z;
        float mac = 0.9 + 0.2 * texture2D(map, tuv * 0.071).g; diffuseColor *= mapTexelToLinear(tex) * mac;`);
    };
    return (splatCache[key] = m);
  };
  /* heightfield mesh; weights(x, z, y, slope) -> [a, b, c] for the three textures */
  R.terrain = function (ctx, o) {
    const seg = o.seg || 64, segZ = o.segZ || Math.max(8, Math.round(seg * (o.z1 - o.z0) / (o.x1 - o.x0)));
    const geo = new THREE.PlaneGeometry(o.x1 - o.x0, o.z1 - o.z0, seg, segZ); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, n = pos.count, spl = new Float32Array(n * 3), cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
    for (let i = 0; i < n; i++) { const x = pos.getX(i) + cx, z = pos.getZ(i) + cz; const y = o.h(x, z); pos.setY(i, y); }
    geo.computeVertexNormals(); const nor = geo.attributes.normal;
    for (let i = 0; i < n; i++) { const x = pos.getX(i) + cx, z = pos.getZ(i) + cz, slope = 1 - nor.getY(i); const w = o.weights ? o.weights(x, z, pos.getY(i), slope) : [1 - Math.min(1, slope * 3), Math.min(1, slope * 3), 0]; spl[i * 3] = w[0]; spl[i * 3 + 1] = w[1]; spl[i * 3 + 2] = w[2]; }
    geo.setAttribute('splat', new THREE.BufferAttribute(spl, 3));
    const m = new THREE.Mesh(geo, R.splatMat(o.key || 'default', o.tex || ['grass', 'stone', 'dirt'], o)); m.position.set(cx, o.y || 0, cz); m.receiveShadow = true; m.castShadow = !!o.cast;
    m.userData.dynamic = true; // keep the custom attribute out of the merger
    (o.parent || ctx.root).add(m); return m;
  };

  /* ---------------------------------------------------------------- small builders */
  const H = () => W.h;
  /* a ribbon of path that hugs the terrain */
  R.path = function (ctx, pts, w, mat, o = {}) {
    const P = [], I = [], UVs = []; let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (const s of [-1, 1]) { const x = pts[i][0] + nx * w * 0.5 * s, z = pts[i][1] + nz * w * 0.5 * s; P.push(x, (o.y !== undefined ? o.y : ctx.gy(x, z)) + (o.lift ?? 0.025), z); UVs.push(s > 0 ? w / 2 : 0, acc / 2); }
      if (i) { const k = i * 2; I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2)); g.setIndex(I); g.computeVertexNormals();
    const mm = typeof mat === 'string' ? M.get(mat) : mat, m = new THREE.Mesh(g, mm); m.receiveShadow = true; if (o.po !== false) { m.material = mm.clone(); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -1; }
    ctx.root.add(m); return m;
  };
  /* invisible walls (with optional openings) */
  R.walls = function (x0, x1, z0, z1, y0, y1, gaps = {}) {
    const C = W.collider, seg = (a0, a1, g, fn) => { let cur = a0; for (const [g0, g1] of (g || []).slice().sort((a, b) => a[0] - b[0])) { if (g0 > cur) fn(cur, g0); cur = g1; } if (cur < a1) fn(cur, a1); };
    seg(x0, x1, gaps.n, (a, b) => C(a, b, z0 - 1, z0, y0, y1, { cam: false })); seg(x0, x1, gaps.s, (a, b) => C(a, b, z1, z1 + 1, y0, y1, { cam: false }));
    seg(z0, z1, gaps.w, (a, b) => C(x0 - 1, x0, a, b, y0, y1, { cam: false })); seg(z0, z1, gaps.e, (a, b) => C(x1, x1 + 1, a, b, y0, y1, { cam: false }));
  };
  /* a fallen tree: jump on it or squeeze under where it arches */
  R.log = function (ctx, x, z, len, ry, r, o = {}) {
    const y = (o.y ?? ctx.gy(x, z)) + (o.raise || 0) + r;
    const m = H().cyl({ r, h: len, x, y, z, mat: 'bark', rz: Math.PI / 2, ry, col: false });
    const c = Math.cos(ry), s = Math.sin(ry), hx = Math.abs(c) * len / 2 + r, hz = Math.abs(s) * len / 2 + r;
    if (Math.abs(s) < 0.3 || Math.abs(c) < 0.3) W.collider(x - hx, x + hx, z - hz, z + hz, y - r + (o.gap || 0), y + r * 0.8, { climb: !o.gap, cam: false });
    else for (let i = -3; i <= 3; i++) { const px = x + c * len / 2 * i / 3.5, pz = z - s * len / 2 * i / 3.5; W.collider(px - r, px + r, pz - r, pz + r, y - r + (o.gap || 0), y + r * 0.8, { climb: !o.gap, cam: false }); }
    for (let i = 0; i < 4; i++) { const t = (i / 3 - 0.5) * len * 0.8; H().sph({ x: x + c * t, y: y + r * 0.8, z: z - s * t, r: r * 0.5, sy: 0.25, mat: 'mossrock', cast: false }); }
    return m;
  };
  /* plank bridge along x or z with rails; walkable deck */
  R.bridge = function (ctx, x0, z0, x1, z1, y, w = 1.2, o = {}) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const n = Math.floor(len / 0.32), pm = o.mat || 'midwood';
    for (let i = 0; i < n; i++) { if (o.broken && o.broken.includes(i)) continue; const t = -len / 2 + (i + 0.5) * (len / n); H().box({ w: alongX ? len / n - 0.04 : w, h: 0.06, d: alongX ? w : len / n - 0.04, x: alongX ? cx + t : cx, y: y - 0.06 + (i % 3) * 0.006, z: alongX ? cz : cz + t, mat: pm, col: false }); }
    for (const s of [-1, 1]) { H().box({ w: alongX ? len : 0.07, h: 0.07, d: alongX ? 0.07 : len, x: alongX ? cx : cx + s * w / 2, y: y + 0.55, z: alongX ? cz + s * w / 2 : cz, mat: 'darkwood', col: false }); for (let i = 0; i <= Math.floor(len / 1.6); i++) { const t = -len / 2 + i * (len / Math.floor(len / 1.6)); H().box({ w: 0.08, h: 0.62, d: 0.08, x: alongX ? cx + t : cx + s * w / 2, y: y - 0.05, z: alongX ? cz + s * w / 2 : cz + t, mat: 'darkwood', col: false }); } }
    const cols = [];
    if (!o.noDeck) cols.push(W.collider(alongX ? Math.min(x0, x1) : cx - w / 2, alongX ? Math.max(x0, x1) : cx + w / 2, alongX ? cz - w / 2 : Math.min(z0, z1), alongX ? cz + w / 2 : Math.max(z0, z1), y - 0.3, y, { name: o.name, cam: false }));
    for (const s of [-1, 1]) W.collider(alongX ? Math.min(x0, x1) : cx + s * w / 2 - 0.05, alongX ? Math.max(x0, x1) : cx + s * w / 2 + 0.05, alongX ? cz + s * w / 2 - 0.05 : Math.min(z0, z1), alongX ? cz + s * w / 2 + 0.05 : Math.max(z0, z1), y, y + 0.7, { walk: false, cam: false });
    return cols;
  };
  /* ramp built from small steps (colliders) plus a sloped visual plank */
  R.ramp = function (ctx, x0, z0, y0, x1, z1, y1, w = 1, mat = 'midwood', o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(Math.abs(y1 - y0) / 0.15)), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, ax = U.lerp(x0, x1, t0), bx = U.lerp(x0, x1, t1), az = U.lerp(z0, z1, t0), bz = U.lerp(z0, z1, t1), top = U.lerp(y0, y1, (i + 1) / n);
      W.collider(alongX ? Math.min(ax, bx) : ax - w / 2, alongX ? Math.max(ax, bx) : ax + w / 2, alongX ? az - w / 2 : Math.min(az, bz), alongX ? az + w / 2 : Math.max(az, bz), Math.min(y0, y1) - 0.3, top, { cam: false }); }
    if (!o.noVis) { const pl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, len), M.get(mat)); pl.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.02, (z0 + z1) / 2); pl.rotation.order = 'YXZ'; pl.rotation.y = Math.atan2(x1 - x0, z1 - z0); pl.rotation.x = -Math.atan2(y1 - y0, len); pl.castShadow = true; pl.receiveShadow = true; ctx.root.add(pl); }
  };
  /* stairs as real steps */
  R.stairs = function (ctx, x, z, y0, y1, dir, w = 1, mat = 'darkwood') {
    const n = Math.ceil(Math.abs(y1 - y0) / 0.18), dy = (y1 - y0) / n, run = 0.3, dx = dir === 'x' ? run : dir === '-x' ? -run : 0, dz = dir === 'z' ? run : dir === '-z' ? -run : 0;
    for (let i = 0; i < n; i++) { const top = y0 + dy * (i + 1), cx = x + dx * (i + 0.5), cz = z + dz * (i + 0.5), hh = Math.abs(dy) + 0.02; H().box({ w: dx ? run : w, h: hh, d: dz ? run : w, x: cx, y: top - hh, z: cz, mat, col: false }); W.collider(cx - (dx ? run / 2 : w / 2), cx + (dx ? run / 2 : w / 2), cz - (dz ? run / 2 : w / 2), cz + (dz ? run / 2 : w / 2), Math.min(y0, y1) - 0.2, top, { cam: false }); }
  };
  /* water surface registered with the graphics system (+ an optional hazard) */
  R.water = function (ctx, x0, x1, z0, z1, y, o = {}) {
    const m = H().plane(x0, x1, z0, z1, y, o.mat || 'water', o.s || 4); m.userData.dynamic = true;
    if (G.GFX && G.GFX.registerWater) G.GFX.registerWater(m, { planeY: y, flat: o.flat !== false, flow: o.flow });
    if (o.hazard !== false) W.hazards.push({ type: 'rect', x0: x0 + 0.2, x1: x1 - 0.2, z0: z0 + 0.2, z1: z1 - 0.2, y: y - 0.05, name: o.name || 'water' });
    return m;
  };
  R.waterDisc = function (ctx, x, z, r, y, o = {}) {
    const g = new THREE.CircleGeometry(r, 40); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.get(o.mat || 'water')); m.position.set(x, y, z); m.userData.dynamic = true; ctx.root.add(m);
    if (G.GFX && G.GFX.registerWater) G.GFX.registerWater(m, { planeY: y });
    if (o.hazard !== false) W.hazards.push({ type: 'circle', x, z, r: r - 0.3, y: y - 0.05, name: o.name || 'pool' });
    return m;
  };
  /* hand-painted wooden sign */
  R.sign = function (ctx, x, z, ry, text, o = {}) {
    const y = (o.y ?? ctx.gy(x, z)), w = o.w || 1.1, key = 'sign-' + text;
    const tex = G.Tex.make(key, 256, 96, (g2, W2, H2) => { g2.fillStyle = o.bg || '#7a5a3a'; g2.fillRect(0, 0, W2, H2); g2.strokeStyle = 'rgba(40,24,12,.6)'; g2.lineWidth = 6; g2.strokeRect(4, 4, W2 - 8, H2 - 8); for (let i = 0; i < 5; i++) { g2.fillStyle = 'rgba(40,24,12,.12)'; g2.fillRect(0, 12 + i * 18, W2, 2); } g2.fillStyle = o.fg || '#f2e6cf'; g2.font = `bold ${text.length > 16 ? 26 : 34}px Georgia`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(text, W2 / 2, H2 / 2 + 2); });
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.375, 0.05), [M.get('darkwood'), M.get('darkwood'), M.get('darkwood'), M.get('darkwood'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), M.get('darkwood')]);
    board.position.set(x, y + (o.h || 0.9), z); board.rotation.y = ry; board.castShadow = true; ctx.root.add(board);
    H().cyl({ r: 0.04, h: (o.h || 0.9), x, y, z, mat: 'darkwood', col: true });
    return board;
  };
  /* a room: floor, four walls with door gaps, optional ceiling. gaps: {n:[[a,b,top]],...} */
  R.room = function (ctx, x0, x1, z0, z1, y, h, wallIn, wallOut, o = {}) {
    const Hh = H(), t = o.t || 0.14;
    if (o.floor !== false) { Hh.plane(x0, x1, z0, z1, y + 0.004, o.floor || 'planks', o.fs || 1.8); W.collider(x0, x1, z0, z1, y - 0.25, y, { cam: false }); }
    const g = o.gaps || {};
    if (!o.skip || !o.skip.includes('n')) Hh.wall(x0, z0, x1, z0, h, t, wallIn, wallOut, g.n || [], { y, skirt: o.skirt });
    if (!o.skip || !o.skip.includes('s')) Hh.wall(x0, z1, x1, z1, h, t, wallOut, wallIn, g.s || [], { y, skirt: o.skirt });
    if (!o.skip || !o.skip.includes('w')) Hh.wall(x0, z0, x0, z1, h, t, wallIn, wallOut, g.w || [], { y, skirt: o.skirt });
    if (!o.skip || !o.skip.includes('e')) Hh.wall(x1, z0, x1, z1, h, t, wallOut, wallIn, g.e || [], { y, skirt: o.skirt });
    if (o.ceil) { const c = Hh.plane(x0, x1, z0, z1, y + h, o.ceil, 3); c.rotation.x = Math.PI; c.position.y = y + h; if (!o.noCeilCol) W.collider(x0, x1, z0, z1, y + h, y + h + 0.2, { walk: false }); }
  };
  /* dome of rock for caves (inside faces) */
  R.caveDome = function (ctx, x, y, z, sx, sy, sz, o = {}) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, o.detail ?? 2), M.std(o.key || 'caveDome', { color: o.color || 0x5a554d, rough: 1, map: 'stone', side: THREE.BackSide, flat: true }));
    m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.receiveShadow = true; ctx.root.add(m); return m;
  };
  R.text = function (key, w, h, draw) { return G.Tex.make(key, w, h, draw); };
  R.distTo = distTo;
})();
