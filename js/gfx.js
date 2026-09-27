/* =====================================================================
   gfx.js - Graphics settings and the performance system.
   Seven presets (Performance ... Extra High) and fifteen individual
   controls. Every control changes real renderer state: pixel ratio,
   shadow maps and cascades, procedural texture resolution, anisotropy,
   environment reflections, SSR, vegetation density and LOD distances,
   particles, water, anti-aliasing, SSAO, volumetric light and the
   post-processing chain (gfx-pipeline.js).
   The performance system adds a frame-rate cap, dynamic resolution,
   adaptive quality, distance/LOD culling and a live FPS measurement.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, P = G.GFXP;
  const $ = (s) => document.querySelector(s);

  /* ---------------------------------------------------------------- options */
  const L5 = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra'], ['extreme', 'Extreme']];
  const OPTS = [
    { k: 'resolution', label: 'Resolution', hint: 'Caps the render resolution before scaling', opts: [['native', 'Native'], ['2160', '2160p'], ['1440', '1440p'], ['1080', '1080p'], ['900', '900p'], ['720', '720p'], ['540', '540p']] },
    { k: 'renderScale', label: 'Render Scale', hint: 'Percent of the resolution actually rendered', range: [50, 200, 5] },
    { k: 'shadowQuality', label: 'Shadow Quality', hint: 'Map size, softness and cascade count', opts: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High · 2 cascades'], ['ultra', 'Ultra · 3 cascades'], ['extreme', 'Extreme · 4 cascades']] },
    { k: 'shadowDistance', label: 'Shadow Distance', opts: [['short', 'Short'], ['medium', 'Medium'], ['long', 'Long'], ['far', 'Far'], ['extreme', 'Extreme']] },
    { k: 'textureQuality', label: 'Texture Quality', hint: 'Procedural texture resolution + anisotropic filtering', opts: L5 },
    { k: 'reflectionQuality', label: 'Reflection Quality', hint: 'Sky reflections; Ultra+ adds screen-space reflections on wet ground', opts: [['off', 'Off'], ...L5] },
    { k: 'vegetationQuality', label: 'Vegetation Quality', hint: 'Grass density, plant draw distance, tree detail', opts: L5 },
    { k: 'effectsQuality', label: 'Effects Quality', hint: 'Weather, wildlife, footprints and ambient detail', opts: L5 },
    { k: 'viewDistance', label: 'View Distance', opts: [['near', 'Near'], ['medium', 'Medium'], ['far', 'Far'], ['veryfar', 'Very Far'], ['extreme', 'Extreme']] },
    { k: 'antiAliasing', label: 'Anti-Aliasing', opts: [['off', 'Off'], ['fxaa', 'FXAA'], ['msaa2', 'MSAA 2×'], ['msaa4', 'MSAA 4×'], ['msaa4fxaa', 'MSAA 4× + FXAA'], ['msaa8fxaa', 'MSAA 8× + FXAA']] },
    { k: 'ambientOcclusion', label: 'Ambient Occlusion', hint: 'Screen-space AO; Extreme adds contact shadows', opts: [['off', 'Off'], ...L5] },
    { k: 'volumetrics', label: 'Volumetric Effects', hint: 'God rays; High+ ray-marches shadowed light shafts', opts: [['off', 'Off'], ...L5] },
    { k: 'waterQuality', label: 'Water Quality', hint: 'Waves, fresnel; Ultra+ real planar reflections', opts: L5 },
    { k: 'particleQuality', label: 'Particle Quality', opts: L5 },
    { k: 'postProcessing', label: 'Post Processing', hint: 'Bloom, grading, eye adaptation; Ultra+ depth of field and motion blur', opts: [['off', 'Off'], ...L5] },
  ];
  const PRESETS = {
    performance: { resolution: 'native', renderScale: 60, shadowQuality: 'off', shadowDistance: 'short', textureQuality: 'low', reflectionQuality: 'off', vegetationQuality: 'low', effectsQuality: 'low', viewDistance: 'near', antiAliasing: 'off', ambientOcclusion: 'off', volumetrics: 'off', waterQuality: 'low', particleQuality: 'low', postProcessing: 'off' },
    low: { resolution: 'native', renderScale: 80, shadowQuality: 'low', shadowDistance: 'short', textureQuality: 'medium', reflectionQuality: 'low', vegetationQuality: 'low', effectsQuality: 'low', viewDistance: 'medium', antiAliasing: 'fxaa', ambientOcclusion: 'off', volumetrics: 'off', waterQuality: 'medium', particleQuality: 'low', postProcessing: 'low' },
    medium: { resolution: 'native', renderScale: 100, shadowQuality: 'medium', shadowDistance: 'medium', textureQuality: 'high', reflectionQuality: 'medium', vegetationQuality: 'medium', effectsQuality: 'medium', viewDistance: 'medium', antiAliasing: 'fxaa', ambientOcclusion: 'off', volumetrics: 'low', waterQuality: 'medium', particleQuality: 'medium', postProcessing: 'medium' },
    high: { resolution: 'native', renderScale: 100, shadowQuality: 'high', shadowDistance: 'long', textureQuality: 'high', reflectionQuality: 'high', vegetationQuality: 'high', effectsQuality: 'high', viewDistance: 'far', antiAliasing: 'msaa4', ambientOcclusion: 'medium', volumetrics: 'medium', waterQuality: 'high', particleQuality: 'high', postProcessing: 'high' },
    veryhigh: { resolution: 'native', renderScale: 100, shadowQuality: 'ultra', shadowDistance: 'far', textureQuality: 'ultra', reflectionQuality: 'high', vegetationQuality: 'ultra', effectsQuality: 'ultra', viewDistance: 'veryfar', antiAliasing: 'msaa4fxaa', ambientOcclusion: 'high', volumetrics: 'high', waterQuality: 'ultra', particleQuality: 'ultra', postProcessing: 'high' },
    ultra: { resolution: 'native', renderScale: 125, shadowQuality: 'ultra', shadowDistance: 'far', textureQuality: 'ultra', reflectionQuality: 'ultra', vegetationQuality: 'ultra', effectsQuality: 'ultra', viewDistance: 'veryfar', antiAliasing: 'msaa4fxaa', ambientOcclusion: 'high', volumetrics: 'ultra', waterQuality: 'ultra', particleQuality: 'ultra', postProcessing: 'ultra' },
    extrahigh: { resolution: 'native', renderScale: 150, shadowQuality: 'extreme', shadowDistance: 'extreme', textureQuality: 'extreme', reflectionQuality: 'extreme', vegetationQuality: 'extreme', effectsQuality: 'extreme', viewDistance: 'extreme', antiAliasing: 'msaa8fxaa', ambientOcclusion: 'extreme', volumetrics: 'extreme', waterQuality: 'extreme', particleQuality: 'extreme', postProcessing: 'extreme' },
  };
  const PORDER = [['performance', 'Performance'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['veryhigh', 'Very High'], ['ultra', 'Ultra'], ['extrahigh', 'Extra High']];
  const PERF = { fpsCap: 0, dynRes: true, adaptive: true };

  /* level tables */
  const LV = { off: -1, low: 0, medium: 1, high: 2, ultra: 3, extreme: 4 };
  const SHADOW = { off: null, low: { size: 1024, n: 1, type: 'pcf', radius: 1, bias: -0.0008 }, medium: { size: 2048, n: 1, type: 'soft', radius: 1, bias: -0.0005 }, high: { size: 2048, n: 2, type: 'soft', radius: 1, bias: -0.0004 }, ultra: { size: 4096, n: 3, type: 'pcf', radius: 2.2, bias: -0.0003 }, extreme: { size: 4096, n: 4, type: 'pcf', radius: 3, bias: -0.00025 } };
  const SDIST = { short: 16, medium: 26, long: 44, far: 80, extreme: 140 };
  const TEX = { low: [0.5, 1], medium: [1, 2], high: [1, 4], ultra: [2, 8], extreme: [2, 16] };
  const REFL = { off: [128, 12], low: [256, 6], medium: [256, 4], high: [512, 2], ultra: [512, 1], extreme: [1024, 0.5] };
  const VEG = { low: { grass: 0.45, dist: 32, small: 45, tree: 1 }, medium: { grass: 0.75, dist: 46, small: 70, tree: 1 }, high: { grass: 1, dist: 62, small: 100, tree: 1 }, ultra: { grass: 1.6, dist: 85, small: 150, tree: 2 }, extreme: { grass: 2.4, dist: 120, small: 230, tree: 2 } };
  const VIEW = { near: 95, medium: 160, far: 260, veryfar: 420, extreme: 700 };
  const PART = { low: [0.35, 700], medium: [0.65, 1400], high: [1, 2200], ultra: [1.5, 3600], extreme: [2.2, 6000] };
  const FX = { low: 0, medium: 1, high: 2, ultra: 3, extreme: 4 };

  const GFX = (G.GFX = { OPTS, PRESETS, PORDER, cfg: null, perf: null, pMul: 1, pMax: 2200, grassDist: 60, smallDist: 100, treeDist: 260, fxLevel: 2, envRes: 256, envInterval: 4, fps: 60, frameMs: 16, adaptLvl: 0, dynScale: 1, lod: [] });

  function detectDefault() {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0, small = Math.min(screen.width, screen.height) < 700;
    if (touch && small) return 'low';
    if (touch) return 'medium';
    return 'high';
  }
  GFX.defaultPreset = detectDefault;

  /* ---------------------------------------------------------------- load / save (G.settings.gfx) */
  GFX.load = function () {
    const S = G.settings; let c = S.gfx;
    if (!c || !c.cfg) {
      // older saves only had quality: 'high' | 'low'
      const p = S.quality === 'low' ? 'low' : detectDefault();
      c = S.gfx = { preset: p, cfg: Object.assign({}, PRESETS[p]), perf: Object.assign({}, PERF) };
    }
    c.cfg = Object.assign({}, PRESETS[c.preset] || PRESETS.high, c.cfg); c.perf = Object.assign({}, PERF, c.perf);
    this.store = c; this.cfg = Object.assign({}, c.cfg); this.perf = Object.assign({}, c.perf);
    S.quality = LV[this.cfg.vegetationQuality] <= 0 ? 'low' : 'high';
  };
  GFX.save = function () { const S = G.settings; S.gfx = this.store; S.quality = LV[this.cfg.vegetationQuality] <= 0 ? 'low' : 'high'; try { G.U.storage.set('ferret-thp-settings', JSON.stringify(S)); } catch (e) {} };

  /* ---------------------------------------------------------------- before the world is built */
  GFX.preInit = function (renderer) {
    this.r = renderer; this.load();
    const [ts, an] = TEX[this.cfg.textureQuality]; G.Tex.scale = ts; G.Tex.aniso = Math.min(an, renderer.capabilities.getMaxAnisotropy());
    const v = VEG[this.cfg.vegetationQuality]; this.grassDensity = v.grass; this.treeDetail = v.tree;
    this.built = { grass: v.grass };
  };

  /* ---------------------------------------------------------------- after the world is built */
  GFX.init = function (game) {
    this.g = game; this.cascades = [];
    this.pipe = new P.Pipeline(this.r); this.mirror = new P.Mirror(this.r);
    // water surfaces get the wave/reflection shader
    this.water = [];
    const wm = G.Mat.get('water'); P.patchWater(wm, { flow: [0, 0.35] }); this.waterMats = [wm];
    for (const k of ['creek', 'pond']) if (G.World.obj[k]) this.water.push({ mesh: G.World.obj[k], y: G.World.obj[k].position.y });
    if (G.EXT) G.EXT.panels.graphics = () => GFX.renderPanel();
    this.apply(this.cfg, { initial: true });
    this.lastT = performance.now(); this.fpsT = 0; this.fpsN = 0; this.lastRender = 0;
  };
  GFX.registerWater = function (mesh, opts = {}) {
    const m = mesh.material; if (m && !m.userData.waterPatched) { P.patchWater(m, opts); this.waterMats.push(m); }
    this.water.push({ mesh, y: opts.planeY ?? mesh.position.y, flat: opts.flat !== false });
  };

  /* all materials need recompiling when shadows or tone mapping change */
  GFX.recompileAll = function () { this.g.scene.traverse((o) => { if (!o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); }); };

  /* ---------------------------------------------------------------- derived state */
  function effective(cfg, adaptLvl) {
    const e = Object.assign({}, cfg);
    // adaptive quality: turn off the most expensive effects first
    const steps = [['postProcessing', 'high'], ['volumetrics', 'medium'], ['reflectionQuality', 'high'], ['ambientOcclusion', 'low'], ['waterQuality', 'high'], ['shadowQuality', 'medium'], ['volumetrics', 'off'], ['ambientOcclusion', 'off'], ['vegetationQuality', 'low']];
    for (let i = 0; i < adaptLvl && i < steps.length; i++) { const [k, v] = steps[i]; if ((LV[e[k]] ?? 0) > (LV[v] ?? 0)) e[k] = v; }
    return e;
  }
  GFX.adaptSteps = ['post-processing detail', 'volumetric light', 'screen-space reflections', 'ambient occlusion', 'water reflections', 'shadow cascades', 'god rays', 'all AO', 'vegetation'];
  function pipeFlags(e) {
    const pp = LV[e.postProcessing], ao = LV[e.ambientOcclusion], vol = LV[e.volumetrics], refl = LV[e.reflectionQuality], aa = e.antiAliasing;
    const F = {};
    F.msaa = { msaa2: 2, msaa4: 4, msaa4fxaa: 4, msaa8fxaa: 8 }[aa] || 0; F.fxaa = aa === 'fxaa' || aa.endsWith('fxaa');
    if (ao >= 0) F.ao = { kernel: [6, 10, 16, 24, 32][ao], half: ao <= 1, contact: ao >= 4, steps: 12, len: 0.24 };
    if (vol >= 0) F.rays = { samples: [24, 32, 40, 56, 72][vol] };
    if (vol >= 2) F.vol = { steps: [0, 0, 16, 28, 48][vol], half: vol < 4 };
    if (refl >= 3) F.ssr = { steps: refl >= 4 ? 40 : 24, len: refl >= 4 ? 7 : 5, str: 1 };
    if (pp >= 1) F.bloom = { levels: [0, 3, 5, 6, 7][pp], str: [0, 0.05, 0.06, 0.07, 0.075][pp] };
    if (pp >= 0) F.grade = true; if (pp >= 2) { F.vignette = true; F.adapt = true; }
    if (pp >= 3) { F.dof = { taps: pp >= 4 ? 36 : 20, maxBlur: pp >= 4 ? 8 : 6 }; F.mblur = { samples: pp >= 4 ? 14 : 8, str: pp >= 4 ? 0.55 : 0.45 }; }
    if (pp >= 4) { F.grain = 0.018; F.ca = 0.0025; }
    const water = LV[e.waterQuality];
    F.planar = water >= 3 ? (water >= 4 ? 1 : 0.5) : 0;
    F.use = !!(F.msaa || F.fxaa || F.ao || F.rays || F.vol || F.ssr || F.bloom || F.grade || F.planar);
    return F;
  }
  GFX.pipeFlags = pipeFlags;

  /* ---------------------------------------------------------------- apply */
  GFX.apply = function (cfg, o = {}) {
    const g = this.g, r = this.r, prev = this.eff || {};
    this.cfg = Object.assign({}, cfg);
    const e = (this.eff = effective(this.cfg, this.adaptLvl));
    let recompile = false;
    // resolution + render scale
    this.baseScale = this.cfg.renderScale / 100; this.updatePixelRatio(true);
    // shadows
    if (o.initial || prev.shadowQuality !== e.shadowQuality) recompile = this.setupShadows(e) || recompile;
    this.shadowDist = SDIST[e.shadowDistance];
    // textures
    if (!o.initial && prev.textureQuality !== e.textureQuality) { const [ts, an] = TEX[e.textureQuality]; G.Tex.setQuality(ts, Math.min(an, r.capabilities.getMaxAnisotropy())); }
    // reflections
    [this.envRes, this.envInterval] = REFL[e.reflectionQuality]; if (g.skyMat) { const q = LV[e.reflectionQuality] >= 3 || LV[e.postProcessing] >= 3 ? 3 : LV[e.postProcessing] >= 1 ? 2 : 1; if (g.skyMat.defines.CLOUD_Q !== q) { g.skyMat.defines.CLOUD_Q = q; g.skyMat.needsUpdate = true; } }
    g._envT = 99; for (const m of Object.values(G.Mat.cache)) if (m && m.isMaterial && m.envMapIntensity !== undefined) { if (m.userData.envI0 === undefined) m.userData.envI0 = m.envMapIntensity; m.envMapIntensity = e.reflectionQuality === 'off' ? m.userData.envI0 * 0.5 : m.userData.envI0; }
    // vegetation
    const v = VEG[e.vegetationQuality]; this.grassDist = v.dist; this.smallDist = v.small;
    if (!o.initial && G.World.rebuildGrass && Math.abs(v.grass - this.built.grass) > 0.01) { G.World.rebuildGrass(v.grass); this.built.grass = v.grass; }
    if (G.World.setTreeDetail) G.World.setTreeDetail(v.tree);
    // view distance
    this.viewDist = VIEW[e.viewDistance]; this.treeDist = this.viewDist; g.camera.far = this.viewDist + 40; g.camera.updateProjectionMatrix();
    // effects + particles
    this.fxLevel = FX[e.effectsQuality]; [this.pMul, this.pMax] = PART[e.particleQuality]; if (g.particles && g.particles.setMax) g.particles.setMax(this.pMax);
    if (g.rain) g.rainActive = Math.min(g.rainN, [700, 1400, 2600, 4200, 6000][this.fxLevel]);
    // point light budget
    this.setLightPool([5, 6, 8, 12, 14][Math.max(0, LV[e.postProcessing] + 1 > 4 ? 4 : LV[e.postProcessing] + 1)] || 5);
    // water
    P.waterU.uWaterQ.value = LV[e.waterQuality];
    // fur
    this.furShells = LV[e.postProcessing] >= 4 ? 10 : LV[e.postProcessing] >= 3 ? 6 : 0; if (LV[e.textureQuality] < 3) this.furShells = Math.min(this.furShells, 4);
    // post-processing pipeline
    const F = (this.flags = pipeFlags(e));
    const tm = F.use ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    if (r.toneMapping !== tm) { r.toneMapping = tm; recompile = true; }
    this.pipe.configure(F);
    if (g.skyMat && g.skyMat.defines.PIPE !== (F.use ? 1 : 0)) { g.skyMat.defines.PIPE = F.use ? 1 : 0; g.skyMat.needsUpdate = true; }
    if (F.planar) this.mirror.size(1, 1, this.pipe.hdrType); else if (this.mirror.rt) { this.mirror.rt.dispose(); this.mirror.rt = null; this.mirror.on = false; }
    if (recompile) this.recompileAll();
    if (!o.preview) { this.store.cfg = Object.assign({}, this.cfg); this.save(); }
  };

  GFX.setupShadows = function (e) {
    const g = this.g, r = this.r, S = SHADOW[e.shadowQuality]; let recompile = false;
    const on = !!S;
    if (r.shadowMap.enabled !== on) { r.shadowMap.enabled = on; recompile = true; }
    g.sun.castShadow = on;
    if (!on) { this.setCascades(0); return true; }
    const type = S.type === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (r.shadowMap.type !== type) { r.shadowMap.type = type; recompile = true; }
    this.setCascades(S.n - 1);
    for (const L of [g.sun, ...this.cascades]) {
      if (L.shadow.mapSize.x !== S.size) { L.shadow.mapSize.set(S.size, S.size); if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null; } }
      L.shadow.radius = S.radius; L.shadow.bias = S.bias; L.shadow.normalBias = 0.02;
    }
    this.shadowS = S; r.shadowMap.needsUpdate = true;
    return recompile;
  };
  GFX.setCascades = function (n) {
    const g = this.g;
    while (this.cascades.length > n) { const L = this.cascades.pop(); if (L.shadow.map) L.shadow.map.dispose(); g.scene.remove(L); g.scene.remove(L.target); }
    while (this.cascades.length < n) { const L = new THREE.DirectionalLight(0x000000, 0); L.castShadow = true; L.shadow.camera.near = 1; g.scene.add(L); g.scene.add(L.target); this.cascades.push(L); }
  };
  GFX.setLightPool = function (n) {
    const g = this.g; if (!g.pool) return;
    while (g.pool.length > n) { const p = g.pool.pop(); g.scene.remove(p); }
    while (g.pool.length < n) { const p = new THREE.PointLight(0xffffff, 0, 6, 2); p.userData = { src: null, cur: 0 }; g.scene.add(p); g.pool.push(p); }
    g._lT = 99;
  };

  /* pixel ratio from resolution cap x render scale x dynamic scale */
  GFX.updatePixelRatio = function (force) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cap = this.cfg.resolution === 'native' ? dpr : Math.min(dpr, +this.cfg.resolution / innerHeight);
    let pr = cap * this.baseScale * (this.perf.dynRes ? this.dynScale : 1);
    const px = innerWidth * innerHeight * pr * pr, maxPx = 3840 * 2160 * 1.25; if (px > maxPx) pr *= Math.sqrt(maxPx / px);
    pr = Math.max(0.25, Math.round(pr * 100) / 100);
    if (force || Math.abs(pr - this.r.getPixelRatio()) > 0.009) { this.r.setPixelRatio(pr); this.g.resize(); }
    this.pixelRatio = pr;
  };

  /* ---------------------------------------------------------------- per frame */
  GFX.frame = function (now) {
    // optional frame-rate target: skip frames that come too early
    const cap = +this.perf.fpsCap; if (cap > 0 && now - this.lastRender < 1000 / cap - 1.5) return false;
    const ft = now - (this.lastRender || now); this.lastRender = now;
    if (ft > 0 && ft < 1000) { this.frameMs = U.lerp(this.frameMs, ft, 0.05); this.fpsN++; this.fpsT += ft; if (this.fpsT > 1000) { this.fps = (this.fpsN * 1000) / this.fpsT; this.fpsN = 0; this.fpsT = 0; } }
    return true;
  };
  const tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), fwd = new THREE.Vector3();
  GFX.updateCascades = function () {
    const g = this.g, cam = g.camera, S = this.shadowS; if (!S || !g.sun.castShadow) return;
    const sunDir = tv.copy(g.sun.position).sub(g.sun.target.position).normalize(); this.sunDir = (this.sunDir || new THREE.Vector3()).copy(sunDir);
    const lights = [g.sun, ...this.cascades], n = lights.length, D = this.shadowDist, near = 0.5;
    cam.getWorldDirection(fwd);
    const tanV = Math.tan((cam.fov * Math.PI) / 360), tanH = tanV * cam.aspect;
    let d0 = 0;
    for (let i = 0; i < n; i++) {
      const L = lights[i], k = (i + 1) / n;
      const d1 = n === 1 ? D : 0.78 * near * Math.pow(D / near, k) + 0.22 * (near + (D - near) * k);
      const mid = (d0 + d1) / 2, hw = d1 * tanH, hh = d1 * tanV;
      let rad = Math.sqrt(((d1 - d0) / 2) ** 2 + hw * hw + hh * hh); if (n === 1) rad = Math.max(rad * 0.55, 14); rad = Math.max(rad, 3);
      const c = tv2.copy(cam.position).addScaledVector(fwd, n === 1 ? Math.min(mid, D * 0.35) : mid);
      if (n === 1) { const p = g.player.pos; c.lerp(p, 0.5); }
      // snap to shadow texels so edges don't shimmer
      const texel = (2 * rad) / L.shadow.mapSize.x; const up = Math.abs(sunDir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const ax = new THREE.Vector3().crossVectors(up, sunDir).normalize(), ay = new THREE.Vector3().crossVectors(sunDir, ax);
      const cx = Math.round(c.dot(ax) / texel) * texel - c.dot(ax), cy = Math.round(c.dot(ay) / texel) * texel - c.dot(ay); c.addScaledVector(ax, cx).addScaledVector(ay, cy);
      const sc = L.shadow.camera; sc.left = -rad; sc.right = rad; sc.top = rad; sc.bottom = -rad; sc.near = 1; sc.far = rad * 2 + 160; sc.updateProjectionMatrix();
      L.position.copy(c).addScaledVector(sunDir, rad + 80); L.target.position.copy(c); L.target.updateMatrixWorld();
      L.shadow.bias = S.bias * (1 + i * 1.6) * (rad / 18); L.shadow.normalBias = 0.015 + i * 0.02;
      if (i > 0) { L.intensity = 0; L.color.setRGB(0, 0, 0); }
      d0 = d1 * 0.92;
    }
    this.volLight = lights[n - 1];
  };
  GFX.updateLOD = function () {
    const cp = this.g.camera.position, W = G.World;
    const dists = { tree: this.treeDist, small: this.smallDist, grass: this.grassDist, far: this.viewDist + 60 };
    const cam = this.g.camera; cam.updateMatrixWorld(); this._pm = this._pm || new THREE.Matrix4(); this._fr = this._fr || new THREE.Frustum(); this._sp = this._sp || new THREE.Sphere();
    this._pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse.copy(cam.matrixWorld).invert()); this._fr.setFromProjectionMatrix(this._pm);
    const shadowR = (this.shadowDist || 30) + 10, sp = this._sp;
    for (const c of W.lod || []) { const d = (c.c.x - cp.x) ** 2 + (c.c.z - cp.z) ** 2, lim = (dists[c.cls] || this.viewDist) + c.r; let vis = d < lim * lim && (c.ug ? cp.y < W.UG + 14 : cp.y > W.UG + 12);
      // frustum test, but keep shadow casters near the camera so their shadows don't pop
      if (vis) { sp.center.copy(c.c); sp.radius = c.r; if (!this._fr.intersectsSphere(sp) && !(c.mesh.castShadow && d < (shadowR + c.r) ** 2)) vis = false; }
      c.mesh.visible = vis && !c.off;
      if (vis && c.lo) { const lo = d > (c.loD || 55) ** 2; if (c.mesh.geometry !== (lo ? c.lo : c.hi)) c.mesh.geometry = lo ? c.lo : c.hi; } }
    // minimum haze so the far clip plane is never visible
    const f = this.g.scene.fog; if (f) { const minD = 2.4 / this.viewDist; if (f.density < minD) f.density = minD; }
    // stars sit inside the far plane
    if (this.g.stars) this.g.stars.scale.setScalar(Math.min(1, (this.viewDist + 20) / 470));
  };
  /* dynamic resolution + adaptive quality from real frame times */
  GFX.adaptTick = function (dt) {
    if (this.g.state !== 'play' && this.g.state !== 'cutscene') return;
    const cap = +this.perf.fpsCap, target = 1000 / (cap > 0 ? cap : 60), ms = this.frameMs;
    this._adT = (this._adT || 0) + dt; if (this._adT < 1.2) return; this._adT = 0;
    if (this.perf.dynRes) {
      if (ms > target * 1.18 && this.dynScale > 0.55) { this.dynScale = Math.max(0.55, this.dynScale - 0.07); this.updatePixelRatio(); }
      else if (ms < target * 0.8 && this.dynScale < 1) { this.dynScale = Math.min(1, this.dynScale + 0.05); this.updatePixelRatio(); }
    } else if (this.dynScale !== 1) { this.dynScale = 1; this.updatePixelRatio(); }
    if (this.perf.adaptive) {
      const floor = !this.perf.dynRes || this.dynScale <= 0.56;
      this._slow = floor && ms > target * 1.4 ? (this._slow || 0) + 1 : 0; this._fast = ms < target * 0.7 ? (this._fast || 0) + 1 : 0;
      if (this._slow >= 3 && this.adaptLvl < this.adaptSteps.length) { this.adaptLvl++; this._slow = 0; this.apply(this.cfg, { preview: true }); }
      else if (this._fast >= 8 && this.adaptLvl > 0) { this.adaptLvl--; this._fast = 0; this.apply(this.cfg, { preview: true }); }
    } else if (this.adaptLvl) { this.adaptLvl = 0; this.apply(this.cfg, { preview: true }); }
  };
  GFX.cut = function () { this._cut = true; };

  /* grading follows time of day, weather and place */
  function grade(env) {
    const n = env.night || 0, rain = env.rain || 0, fog = env.fog || 0, z = env.area ? env.area.zone : '', golden = env.golden || 0;
    const gr = { sat: 1.06, contrast: 1.04, lift: [0.0, 0.0, 0.0], gain: [1, 1, 1], gamma: [1, 1, 1], tint: [1, 1, 1] };
    gr.sat -= rain * 0.18 + fog * 0.1 - golden * 0.08; gr.contrast += golden * 0.04 - fog * 0.06;
    gr.tint = [1 + golden * 0.05 - n * 0.05, 1 + golden * 0.01 - n * 0.02, 1 - golden * 0.06 + n * 0.06];
    gr.lift = [0.004 - n * 0.002, 0.004, 0.006 + n * 0.012];
    if (env.ug) { gr.tint = [0.96, 1.0, 1.05]; gr.sat = 0.98; gr.lift = [0.006, 0.008, 0.012]; }
    else if (z === 'forest' && !env.indoor) { gr.tint[1] += 0.02; gr.sat += 0.02; }
    if (env.storm) { gr.sat -= 0.12; gr.tint = [0.95, 0.98, 1.05]; gr.contrast += 0.05; }
    return gr;
  }

  const penv = { sunDir: new THREE.Vector3(0, 1, 0), sunCol: new THREE.Color() };
  GFX.render = function (dt) {
    const g = this.g, r = this.r, cam = g.camera, scene = g.scene, E = G.env || {};
    P.waterU.uWTime.value = g.t; if (g.skyMat) g.skyMat.uniforms.skyEx.value = r.toneMappingExposure;
    this.updateCascades(); this.updateLOD(); this.adaptTick(dt);
    // shell fur for the ferrets
    this.furTick();
    const F = this.flags;
    // planar water reflection (drawn after the scene; water samples the previous frame)
    if (!F.use) { r.setRenderTarget(null); r.render(scene, cam); this.after(scene, cam); this._cut = false; return; }
    // environment for the post chain
    const sd = this.sunDir || penv.sunDir; penv.sunDir.copy(sd); penv.sunCol.copy(g.sun.color); penv.sunInt = Math.min(1.4, g.sun.intensity / 2);
    penv.shadowLight = this.volLight || (g.sun.castShadow ? g.sun : null);
    penv.wet = (E.wet || 0) * (E.indoor || E.ug ? 0 : 1) * (LV[this.eff.reflectionQuality] >= 4 ? 1 : 0.8);
    const cine = !!g.cine && !g.cine.soft, talk = G.UI && G.UI.dialogueOpen;
    penv.focus = Math.max(0.4, cam.position.distanceTo(g.cam.look || g.player.pos)); penv.aperture = cine || talk ? 0.32 : 0.07;
    penv.exposure = r.toneMappingExposure; penv.dt = dt; penv.cut = this._cut || g.cam.snap; penv.indoor = !!E.indoor; penv.ug = !!E.ug; penv.cine = cine;
    penv.volDensity = E.ug ? 0 : 0.012 + (E.fog || 0) * 0.03 + (E.area && E.area.zone === 'forest' ? 0.012 : 0) + (E.indoor ? 0.03 : 0) + (E.rain || 0) * 0.01;
    { const pp = g.player.pos; if (pp.x > 150 && pp.x < 230 && pp.z > 55 && pp.z < 150) penv.volDensity *= 0.3; } penv.volDist = Math.min(90, this.viewDist * 0.5); penv.baseY = 0; penv.rayStr = 0.45 + (E.area && E.area.zone === 'forest' ? 0.25 : 0);
    penv.grade = grade(E); penv.adaptKey = E.ug ? 0.12 : 0.2 - (E.night || 0) * 0.08; penv.bloomK = 1 + (E.night || 0) * 0.5 + (E.ug ? 0.6 : 0);
    const pp = g.player.pos; penv.aoStr = E.ug ? 0.8 : (pp.x > 150 && pp.x < 230 && pp.z > 55 && pp.z < 150) || (pp.x > 396 && pp.x < 460 && pp.z > 296 && pp.z < 360) ? 0 : 1; // the farm's big flat planes band under SSAO penv.fade = 1;
    this.pipe.render(scene, cam, penv, null);
    this.after(scene, cam);
    this._cut = false;
  };
  GFX.after = function (scene, cam) {
    const F = this.flags;
    if (F.planar && this.water.length) {
      // pick the reflective surface nearest the camera
      let best = null, bd = 1e18; const cp = cam.position;
      for (const w of this.water) { if (!w.mesh.visible || !w.flat) continue; w.mesh.getWorldPosition(tv); const d = (tv.x - cp.x) ** 2 + (tv.z - cp.z) ** 2 + (w.y - cp.y) ** 2 * 4; if (d < bd) { bd = d; best = w; } }
      if (best && bd < 120 * 120) {
        const size = this.r.getDrawingBufferSize(new THREE.Vector2()); this.mirror.size(size.x * F.planar, size.y * F.planar, this.pipe.hdrType); this.mirror.planeY = best.y;
        this.mirror.render(scene, cam, this.water.map((w) => w.mesh).concat(this.g.particles ? [this.g.particles.glow, this.g.particles.solid] : []));
        P.waterU.uReflTex.value = this.mirror.rt.texture; P.waterU.uReflMat.value.copy(this.mirror.matrix); P.waterU.uReflOn.value = this.mirror.on ? 1 : 0;
      } else P.waterU.uReflOn.value = 0;
    } else P.waterU.uReflOn.value = 0;
  };
  GFX.furTick = function () {
    const want = this.furShells || 0, list = [this.g.player && this.g.player.f, G.Mochi && G.Mochi.f, ...(G.extraFerrets || [])];
    for (const f of list) if (f && f.head) P.setFurShells(f, f.root.visible ? want : 0);
  };

  /* ---------------------------------------------------------------- cost estimate (not a measurement) */
  GFX.estimate = function (cfg) {
    const e = cfg, px = (innerWidth * innerHeight * Math.pow(Math.min(devicePixelRatio || 1, 2) * e.renderScale / 100, 2)) / (1920 * 1080);
    const F = pipeFlags(e); const S = SHADOW[e.shadowQuality];
    let pixel = 0.45 + (F.use ? 0.12 : 0) + (F.fxaa ? 0.05 : 0) + (F.msaa ? F.msaa * 0.06 : 0) + (F.ao ? F.ao.kernel * (F.ao.half ? 0.008 : 0.028) + (F.ao.contact ? 0.15 : 0) : 0)
      + (F.rays ? 0.06 : 0) + (F.vol ? F.vol.steps * (F.vol.half ? 0.006 : 0.022) : 0) + (F.ssr ? F.ssr.steps * 0.006 : 0) + (F.bloom ? F.bloom.levels * 0.02 : 0)
      + (F.dof ? F.dof.taps * 0.006 : 0) + (F.mblur ? F.mblur.samples * 0.01 : 0) + (F.planar ? F.planar * 0.6 : 0);
    let geo = 0.35 * (VIEW[e.viewDistance] / 260) + 0.25 * VEG[e.vegetationQuality].grass + (S ? S.n * (S.size / 2048) ** 2 * 0.12 * (SDIST[e.shadowDistance] / 44) : 0) + [0.02, 0.05, 0.1, 0.18, 0.3][FX[e.effectsQuality]] + [0.02, 0.04, 0.07, 0.12, 0.2][FX[e.particleQuality]];
    const cost = pixel * px + geo;
    const label = cost < 0.9 ? 'Excellent' : cost < 1.7 ? 'Good' : cost < 3 ? 'Moderate' : 'Heavy';
    return { cost, label };
  };
  GFX.presetOf = function (cfg) { for (const [k] of PORDER) { const p = PRESETS[k]; if (OPTS.every((o) => String(p[o.k]) === String(cfg[o.k]))) return k; } return 'custom'; };

  /* ---------------------------------------------------------------- preview: the real scene rendered with other presets */
  GFX.capture = function (preset, w, h) {
    const saved = Object.assign({}, this.cfg), savedFlags = this.flags, g = this.g, r = this.r;
    const pc = Object.assign({}, PRESETS[preset], { shadowQuality: this.cfg.shadowQuality === 'off' ? 'off' : PRESETS[preset].shadowQuality, textureQuality: this.cfg.textureQuality });
    // shadow cascade count and texture resolution stay as applied (changing them recompiles every shader)
    const S0 = SHADOW[this.cfg.shadowQuality], S1 = SHADOW[pc.shadowQuality]; if (S0 && S1) pc.shadowQuality = S0.n === S1.n ? pc.shadowQuality : this.cfg.shadowQuality;
    const pipe = this.prevPipe || (this.prevPipe = new P.Pipeline(r)); const F = pipeFlags(pc); F.msaa = F.msaa ? Math.min(F.msaa, 4) : 0; pipe.configure(F);
    const tm = r.toneMapping; const out = new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    const vd = this.viewDist, gd = this.grassDist, sd = this.smallDist, sh = this.shadowDist;
    this.viewDist = VIEW[pc.viewDistance]; this.grassDist = VEG[pc.vegetationQuality].dist; this.smallDist = VEG[pc.vegetationQuality].small; this.shadowDist = SDIST[pc.shadowDistance]; this.treeDist = this.viewDist;
    g.camera.far = this.viewDist + 40; g.camera.updateProjectionMatrix(); this.updateLOD(); this.updateCascades();
    if (tm !== THREE.NoToneMapping) { r.toneMapping = THREE.NoToneMapping; this.recompileAll(); }
    const E = G.env || {}; const env = Object.assign({}, penv, { dt: 0.016, cut: true, exposure: r.toneMappingExposure, grade: grade(E), sunDir: this.sunDir || penv.sunDir, sunCol: g.sun.color, sunInt: Math.min(1.4, g.sun.intensity / 2), shadowLight: this.volLight || g.sun, wet: (E.wet || 0) * (E.indoor ? 0 : 1), focus: g.camera.position.distanceTo(g.cam.look || g.player.pos), aperture: 0.07, volDensity: E.ug ? 0 : 0.014 + (E.fog || 0) * 0.03, volDist: 60, adaptKey: 0.2, bloomK: 1, aoStr: 1, fade: 1, rayStr: 0.5 });
    pipe.render(g.scene, g.camera, env, out);
    const buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(out, 0, 0, w, h, buf); out.dispose();
    // restore
    this.viewDist = vd; this.grassDist = gd; this.smallDist = sd; this.shadowDist = sh; this.treeDist = vd; g.camera.far = vd + 40; g.camera.updateProjectionMatrix();
    if (tm !== THREE.NoToneMapping) { r.toneMapping = tm; this.recompileAll(); }
    this.cfg = saved; this.flags = savedFlags;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c2 = cv.getContext('2d'); const img = c2.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    c2.putImageData(img, 0, 0); return cv;
  };

  /* ---------------------------------------------------------------- UI */
  GFX.renderPanel = function () {
    const box = document.querySelector('[data-panel="graphics"]'); if (!box) return;
    $('#menuTitle').textContent = 'Graphics';
    const pend = (this.pending = Object.assign({}, this.cfg)), perf = (this.pendingPerf = Object.assign({}, this.perf));
    const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    box.innerHTML = `
      <div class="gfx-top">
        <div class="gfx-presets" role="radiogroup" aria-label="Graphics preset">${PORDER.map(([k, n]) => `<button type="button" data-p="${k}" class="gp ${k === 'extrahigh' ? 'xh' : ''}" role="radio">${n}</button>`).join('')}</div>
        <p class="gfx-warn" hidden><b>EXTRA HIGH</b> Designed for powerful hardware. Performance may be significantly reduced.</p>
      </div>
      <div class="gfx-main">
        <section class="gfx-controls">${OPTS.map((o) => `<label class="gc" title="${esc(o.hint || '')}"><span>${o.label}</span>${o.range ? `<span class="rng"><input type="range" data-k="${o.k}" min="${o.range[0]}" max="${o.range[1]}" step="${o.range[2]}"><output></output></span>` : `<select data-k="${o.k}">${o.opts.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select>`}</label>`).join('')}
          <div class="gfx-perf"><h4>Performance system</h4>
            <label class="gc"><span>Frame-rate target</span><select data-perf="fpsCap"><option value="0">Unlimited (V-Sync)</option><option value="30">30 fps</option><option value="45">45 fps</option><option value="60">60 fps</option><option value="120">120 fps</option></select></label>
            <label class="ck"><input type="checkbox" data-perf="dynRes"> Dynamic resolution scaling</label>
            <label class="ck"><input type="checkbox" data-perf="adaptive"> Adapt expensive effects when the frame rate drops</label>
          </div>
        </section>
        <div class="gfx-side">
          <div class="gfx-est"><span class="lbl">Estimated performance</span><b class="val"></b><i class="bar"><i></i></i><small>An estimate from your settings and screen size, not a measurement.</small></div>
          <div class="gfx-meas"><span class="lbl">Measured right now</span><b class="fps">–</b><small class="info"></small></div>
          <div class="gfx-prev"><div class="pv-tabs"><button type="button" data-v="high">High</button><button type="button" data-v="ultra">Ultra</button><button type="button" data-v="extrahigh">Extra High</button></div>
            <div class="pv-frame"><canvas width="480" height="270"></canvas><span class="pv-msg">Render a preview of this exact scene</span></div>
            <button type="button" class="btn small ghost pv-go">Render preview</button>
            <small class="note">Compares the current view with High, Ultra and Extra High. Shadow cascades and texture resolution follow your applied settings.</small></div>
        </div>
      </div>
      <div class="gfx-actions"><button type="button" class="btn gfx-apply">APPLY SETTINGS</button><button type="button" class="btn ghost gfx-reset">RESTORE DEFAULTS</button><span class="gfx-dirty" hidden>Unapplied changes</span></div>`;
    const sync = () => {
      const pk = this.presetOf(pend);
      box.querySelectorAll('.gp').forEach((b) => { b.classList.toggle('sel', b.dataset.p === pk); b.setAttribute('aria-checked', b.dataset.p === pk); });
      box.querySelector('.gfx-warn').hidden = pk !== 'extrahigh';
      box.querySelectorAll('[data-k]').forEach((el) => { el.value = pend[el.dataset.k]; if (el.type === 'range') el.nextElementSibling.textContent = pend[el.dataset.k] + '%'; });
      box.querySelector('[data-perf="fpsCap"]').value = String(perf.fpsCap); box.querySelector('[data-perf="dynRes"]').checked = !!perf.dynRes; box.querySelector('[data-perf="adaptive"]').checked = !!perf.adaptive;
      const est = this.estimate(pend); const vb = box.querySelector('.gfx-est'); vb.querySelector('.val').textContent = est.label; vb.dataset.k = est.label.toLowerCase(); vb.querySelector('.bar i').style.width = Math.min(100, (est.cost / 4) * 100) + '%';
      const dirty = JSON.stringify(pend) !== JSON.stringify(this.cfg) || JSON.stringify(perf) !== JSON.stringify(this.perf); box.querySelector('.gfx-dirty').hidden = !dirty;
    };
    box.querySelectorAll('.gp').forEach((b) => (b.onclick = () => { Object.assign(pend, PRESETS[b.dataset.p]); G.Audio.play('ui'); sync(); }));
    box.querySelectorAll('[data-k]').forEach((el) => (el[el.type === 'range' ? 'oninput' : 'onchange'] = () => { pend[el.dataset.k] = el.type === 'range' ? +el.value : el.value; sync(); }));
    box.querySelectorAll('[data-perf]').forEach((el) => (el.onchange = () => { perf[el.dataset.perf] = el.type === 'checkbox' ? el.checked : +el.value; sync(); }));
    box.querySelector('.gfx-apply').onclick = () => {
      G.Audio.play('ui'); this.perf = Object.assign({}, perf); this.store.perf = Object.assign({}, perf); this.store.preset = this.presetOf(pend); this.adaptLvl = 0; this.dynScale = 1;
      const t0 = performance.now(); this.apply(pend); this.prevCache = {};
      G.UI.toast('<b>Graphics applied</b>', null, `${(PORDER.find(([k]) => k === this.store.preset) || [0, 'Custom'])[1]} · ${this.estimate(pend).label} (applied in ${Math.round(performance.now() - t0)} ms)`); sync();
    };
    box.querySelector('.gfx-reset').onclick = () => { Object.assign(pend, PRESETS[detectDefault()]); Object.assign(perf, PERF); G.Audio.play('ui'); sync(); };
    // preview
    const cv = box.querySelector('.pv-frame canvas'), msg = box.querySelector('.pv-msg'); this.prevCache = this.prevCache || {};
    const show = (k) => { box.querySelectorAll('.pv-tabs button').forEach((b) => b.classList.toggle('sel', b.dataset.v === k)); this.prevSel = k; const c = this.prevCache[k]; const g2 = cv.getContext('2d'); if (c) { g2.drawImage(c, 0, 0, cv.width, cv.height); msg.hidden = true; } else { g2.clearRect(0, 0, cv.width, cv.height); msg.hidden = false; } };
    box.querySelectorAll('.pv-tabs button').forEach((b) => (b.onclick = () => show(b.dataset.v)));
    box.querySelector('.pv-go').onclick = () => {
      msg.hidden = false; msg.textContent = 'Rendering…'; const list = ['high', 'ultra', 'extrahigh']; let i = 0;
      const step = () => { if (i >= list.length) { msg.textContent = ''; show(this.prevSel || 'ultra'); return; } try { this.prevCache[list[i]] = this.capture(list[i], 480, 270); } catch (e) { console.warn('preview', e); msg.textContent = 'Preview not available on this device.'; return; } show(list[i]); i++; setTimeout(step, 60); };
      setTimeout(step, 30);
    };
    show(this.prevSel || 'ultra');
    // live measurement
    const meas = box.querySelector('.gfx-meas');
    clearInterval(this._measIv); this._measIv = setInterval(() => {
      if (box.hidden || !document.body.contains(box)) return;
      const inf = this.r.info.render, sz = this.r.getDrawingBufferSize(new THREE.Vector2());
      meas.querySelector('.fps').textContent = `${Math.round(this.fps)} fps`;
      meas.querySelector('.info').textContent = `${sz.x}×${sz.y} · ${inf.calls} draw calls · ${(inf.triangles / 1000).toFixed(0)}k triangles${this.dynScale < 1 ? ` · dynamic res ${Math.round(this.dynScale * 100)}%` : ''}${this.adaptLvl ? ` · adapted: ${this.adaptSteps.slice(0, this.adaptLvl).join(', ')}` : ''}`;
    }, 500);
    sync();
  };
})();
