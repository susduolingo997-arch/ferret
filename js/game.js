/* =====================================================================
   game.js - the game: renderer, lighting, day/night + weather, player
   physics, camera, NPCs, interaction, dialogue, inventory, map,
   quests, save system, menus and the main loop.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, W = G.World, A = G.Audio, I = G.Input, UG = W.UG;
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  const SAVE_KEY = 'ferret-thp-save-', SET_KEY = 'ferret-thp-settings';
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmpV = new THREE.Vector3();

  /* ---------------------------------------------------------------- settings */
  G.settings = Object.assign({ music: 0.6, sfx: 0.8, amb: 0.7, muteMusic: false, muteSfx: false, quality: 'high', sens: 1, invertY: false, weather: 'story', timeFlow: true, pointerLock: false, textSpeed: 1, shake: true, autoCam: true },
    (() => { try { return JSON.parse(U.storage.get(SET_KEY) || '{}'); } catch (e) { return {}; } })());
  function saveSettings() { U.storage.set(SET_KEY, JSON.stringify(G.settings)); A.applyVolumes(); }

  const CHAPTERS = G.CHAPTERS = { 7: ['Bonus Chapter', 'The Failed Road Trip'], 1: ['Chapter One', 'The Noise'], 2: ['Chapter Two', 'The Trail'], 3: ['Chapter Three', 'The Forest'], 4: ['Chapter Four', 'The Mystery'], 5: ['Chapter Five', 'Home'], 6: ['Epilogue', 'The Hidden Path'] };
  const NAMES = G.NAMES = { milo: 'Milo', pip: 'Pip', nora: 'Nora', bram: 'Bram', tilly: 'Tilly', moss: 'Moss', ellie: 'Ellie' };
  const NPC_R = { pip: 0.22, nora: 0.3, bram: 0.5, tilly: 0.26, moss: 0.24 };

  function newState() {
    return { v: 1, chapter: 1, step: 'c1_wake', flags: {}, inv: {}, collected: {}, choices: {}, discovered: {}, tilly: {}, pos: [-3, 0, -4.6], yaw: 0.4, time: 1.5, weather: 'clear', playTime: 0, saved: 0 };
  }

  /* ================================================================ GAME */
  const game = (G.game = {
    state: 'loading', S: newState(), t: 0,
    init() {
      const cv = (this.canvas = $('#cv'));
      // anti-aliasing, resolution and every other graphics option are handled by gfx.js
      const r = (this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' }));
      r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); r.info.autoReset = false;
      r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
      G.GFX.preInit(r);
      const sc = (this.scene = new THREE.Scene());
      sc.fog = new THREE.FogExp2(0x9fb4c8, 0.01);
      this.camera = new THREE.PerspectiveCamera(58, 1, 0.03, 700);
      // lights
      this.hemi = new THREE.HemisphereLight(0xbcd6ff, 0x6b5a3d, 0.7); sc.add(this.hemi);
      const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 2)); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -18; sc2.right = 18; sc2.top = 18; sc2.bottom = -18; sc2.near = 1; sc2.far = 120;
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sc.add(sun); sc.add(sun.target);
      this.pool = []; for (let i = 0; i < 5; i++) { const p = new THREE.PointLight(0xffffff, 0, 6, 2); p.userData = { src: null, cur: 0 }; sc.add(p); this.pool.push(p); }
      this.flash = new THREE.SpotLight(0xfff0cc, 0, 10, 0.55, 0.55, 1.6); sc.add(this.flash); sc.add(this.flash.target);
      this.glow = new THREE.PointLight(0xffc98a, 0, 3.2, 2); sc.add(this.glow);
      this.buildSky();
      W.build(sc);
      this.grid();
      // player
      this.player = new Player(); sc.add(this.player.f.root);
      this.carryBox = G.makeItem('musicbox'); this.carryBox.scale.setScalar(0.7); this.carryBox.visible = false; this.player.f.head.add(this.carryBox); this.carryBox.position.set(0, -0.05, 0.1);
      this.carryFlash = G.makeItem('flashlight'); this.carryFlash.scale.setScalar(0.75); this.carryFlash.rotation.y = -Math.PI / 2; this.carryFlash.visible = false; this.player.f.head.add(this.carryFlash); this.carryFlash.position.set(0.02, -0.04, 0.09);
      // npcs
      this.npcs = {};
      for (const id of ['pip', 'nora', 'bram', 'tilly', 'moss']) { const c = new G.Critter(id); c.root.visible = false; sc.add(c.root); this.npcs[id] = { c, id, anchor: null, target: null, wait: 0, scared: 0 }; }
      this.buildItems();
      if (G.EXT) G.EXT.init(this);
      this.particles = new Particles(sc);
      this.buildRain();
      this.buildHalos();
      this.pmrem = new THREE.PMREMGenerator(r);
      UI.init();
      I.init(cv);
      addEventListener('resize', () => this.resize()); this.resize();
      this.env = G.env = { night: 0, wind: 0.3, rain: 0, cloud: 0, fog: 0, wet: 0, indoor: false, ug: false, dark: 0 };
      this.weatherNow = { cloud: 0.1, rain: 0, fog: 0, wind: 0.3 };
      this.last = performance.now();
      G.GFX.init(this);
      this.titleScreen(true);
      requestAnimationFrame((t) => this.loop(t));
    },
    resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.particles && this.particles.resize(h, this.camera); },

    /* spatial hash for colliders */
    grid() {
      this.cells = new Map(); W.colliders.forEach((c, i) => this.hashC(c, i));
    },
    hashC(c, i) {
      if (c._cells) for (const k of c._cells) { const a = this.cells.get(k); if (a) { const j = a.indexOf(c); if (j >= 0) a.splice(j, 1); } }
      c._cells = [];
      for (let x = Math.floor(c.x0 / 4); x <= Math.floor(c.x1 / 4); x++) for (let z = Math.floor(c.z0 / 4); z <= Math.floor(c.z1 / 4); z++) { const k = x + ',' + z; if (!this.cells.has(k)) this.cells.set(k, []); this.cells.get(k).push(c); c._cells.push(k); }
    },
    near(x0, x1, z0, z1) {
      const out = new Set();
      for (let x = Math.floor(x0 / 4); x <= Math.floor(x1 / 4); x++) for (let z = Math.floor(z0 / 4); z <= Math.floor(z1 / 4); z++) { const a = this.cells.get(x + ',' + z); if (a) for (const c of a) out.add(c); }
      return out;
    },
    col(name) { return W.col[name] || { on: false }; },

    /* ---------------------------------------------------------------- sky + atmosphere */
    buildSky() {
      const mat = (this.skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false, defines: { CLOUD_Q: 1, PIPE: 0 },
        uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: V3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, glowI: { value: 1 }, moonDir: { value: V3(0, 1, 0) }, nightK: { value: 0 }, cloudCov: { value: 0.2 }, cloudCol: { value: new THREE.Color(1, 1, 1) }, uTime: W.timeU, skyEx: { value: 1 } },
        vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
        fragmentShader: `uniform vec3 top, hor, bot, sunCol, sunDir, moonDir, cloudCol; uniform float glowI, nightK, cloudCov, uTime, skyEx; varying vec3 vD;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
          float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3 + CLOUD_Q * 2; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
          void main(){ vec3 d = normalize(vD); float h = d.y;
            vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(hor, bot, pow(clamp(-h, 0.0, 1.0), 0.35));
            float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35 * glowI);
            float m = max(dot(d, moonDir), 0.0); c += vec3(1.0, 0.97, 0.9) * smoothstep(0.99935, 0.9996, m) * nightK * 1.2 + vec3(0.55, 0.65, 1.0) * pow(m, 180.0) * 0.25 * nightK;
            if (h > 0.0) { vec2 uv = d.xz / (h + 0.18) * 1.1 + vec2(uTime * 0.006, uTime * 0.0025); float n = fbm(uv);
              float th = 1.05 - cloudCov * 0.75; float cl = smoothstep(th - 0.18, th + 0.12, n) * smoothstep(0.0, 0.22, h);
              vec3 cc = cloudCol * (0.85 + 0.25 * fbm(uv * 2.0 + 3.0)) + sunCol * pow(s, 4.0) * 0.4;
              #if CLOUD_Q > 1
              // a thinner, faster high layer and sunlit edges
              vec2 uv2 = d.xz / (h + 0.3) * 0.55 + vec2(uTime * 0.011, -uTime * 0.004); float hi = smoothstep(0.55, 0.95, fbm(uv2 * 1.7)) * smoothstep(0.05, 0.3, h) * (0.25 + cloudCov * 0.45);
              cc += sunCol * smoothstep(0.35, 0.0, abs(n - th)) * pow(s, 3.0) * 0.6;
              c = mix(c, cloudCol * 1.05 + sunCol * pow(s, 6.0) * 0.3, hi * 0.5);
              #endif
              #if CLOUD_Q > 2
              // self shadowing: thicker cloud is darker underneath
              float thick = fbm(uv + normalize(sunDir.xz + 0.001) * 0.09); cc *= mix(1.0, 0.72, smoothstep(th, th + 0.35, thick) * (1.0 - s * 0.5));
              #endif
              c = mix(c, cc, cl * 0.92); }
            #if PIPE == 1
            // the HDR pipeline tone maps everything; hand it the value that maps back to this exact display colour
            c = clamp(c, 0.0, 0.995); vec3 lin = mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, vec3(lessThanEqual(c, vec3(0.04045))));
            vec3 y = mat3(vec3(0.643038, 0.059269, 0.005962), vec3(0.311187, 0.931436, 0.063929), vec3(0.045775, 0.009295, 0.930118)) * lin; vec3 A = 1.0 - y * 0.983729, B = 0.0245786 - y * 0.4329510, C = -(0.000090537 + y * 0.238081);
            vec3 v = (-B + sqrt(max(B * B - 4.0 * A * C, 0.0))) / (2.0 * A); c = max(mat3(vec3(1.764741, -0.147028, -0.036337), vec3(-0.675778, 1.160252, -0.162436), vec3(-0.088963, -0.013224, 1.198773)) * v, 0.0) * 0.6 / max(skyEx, 0.05);
            #endif
            gl_FragColor = vec4(c, 1.0); }`,
      }));
      this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat); this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
      this.skyScene = new THREE.Scene(); this.skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), mat));
      // stars
      const n = 1600, pos = []; const r = U.rng(77);
      for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.28, s = Math.sqrt(1 - u * u); if (u < 0.05) { i--; continue; } pos.push(Math.cos(a) * s * 450, u * 450, Math.sin(a) * s * 450); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); this.stars.frustumCulled = false; this.scene.add(this.stars);
      this.clouds = [];
    },
    buildRain() {
      const n = 6000, pos = new Float32Array(n * 6); this.rainN = n; this.rainActive = 2600;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0, depthWrite: false })); this.rain.frustumCulled = false; this.scene.add(this.rain);
      this.drops = []; const r = U.rng(5); for (let i = 0; i < n; i++) this.drops.push([r() * 30 - 15, r() * 16, r() * 30 - 15, 14 + r() * 6]);
      // puddles on paths and in the yard
      const pm = G.Mat.get('puddle'); const r2 = U.rng(9);
      const spots = [[5, 11], [3, 18], [12, 20], [-8, 21], [25, 17], [40, 22], [2, 30], [2, -9.5], [6, -8.5], [-60, 47], [-70, 33], [-90, 16], [-101, 0], [55, 12], [18, 42], [-20, 50], [19.5, -5], [-3, -15]];
      for (const [x, z] of spots) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5 + r2() * 0.8, 20), pm); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.022, z); m.scale.set(1, 0.6 + r2() * 0.5, 1); m.renderOrder = 2; this.scene.add(m); }
    },
    buildHalos() {
      this.halos = [];
      const tex = G.Tex.get('glow');
      for (const L of W.lightSrc) if (L.halo) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: tex, color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.position.set(L.x, L.y + 0.25, L.z); this.scene.add(s); this.halos.push(s); }
    },

    /* ---------------------------------------------------------------- items in the world */
    buildItems() {
      this.worldItems = [];
      const add = (def, kind) => {
        const m = G.makeItem(def.model); m.position.set(def.pos[0], def.pos[1] + 0.005, def.pos[2]); m.userData.base = def.pos[1] + 0.005; m.userData.spin = Math.random() * 6;
        m.traverse((o) => (o.castShadow = true));
        this.scene.add(m); this.worldItems.push({ def, kind, m });
      };
      for (const c of G.COLLECT) if (c.pos) add(c, 'collect');
      for (const p of G.PICKUPS) add(p, 'pickup');
      // the music box waiting in Moss's nook, and its twin for the nightstand
      this.nookBox = G.makeItem('musicbox'); this.nookBox.position.set(-18.9, UG + 0.005, -4.4); this.nookBox.rotation.y = 0.6; this.scene.add(this.nookBox);
      this.standBox = G.makeItem('musicbox'); this.standBox.position.set(-4.0, 0.555, -5.72); this.standBox.rotation.y = 0.3; this.standBox.visible = false; this.scene.add(this.standBox);
    },
    refreshItems() {
      const S = this.S;
      for (const w of this.worldItems) {
        let vis;
        if (w.kind === 'collect') vis = !S.collected[w.def.id];
        else vis = !S.flags['got_' + w.def.id] && w.def.when();
        if (w.def.scentOnly && !S.flags['sniffed_' + w.def.id]) vis = false;
        w.m.visible = vis;
      }
      this.nookBox.visible = S.chapter === 5 && !this.hasItem('musicbox') && !S.flags.boxPlaced;
      this.standBox.visible = !!S.flags.boxPlaced;
    },

    /* ---------------------------------------------------------------- state helpers */
    flag(k, v = true) { this.S.flags[k] = v; },
    hasItem(id) { return (this.S.inv[id] || 0) > 0; },
    give(id, n = 1) {
      this.S.inv[id] = (this.S.inv[id] || 0) + n; const it = G.ITEMS[id];
      A.play('pickup'); UI.toast(`<b>${it.name}</b>`, G.Portrait.item(id === 'photo' ? 'photo1' : id), 'Added to your satchel');
      this.player.happy();
      if (id === 'flashlight' && this.S.step === 'c1_light') this.setStep('c1_vent');
      if (['bottlecap', 'foil', 'marble'].includes(id) && this.S.step === 'c2_shiny' && ['bottlecap', 'foil', 'marble'].every((k) => this.hasItem(k))) this.setStep('c2_pip2');
      if (['photo', 'journal'].includes(id) && this.S.step === 'c3_clues' && this.hasItem('photo') && this.hasItem('journal')) setTimeout(() => this.chapter4(), 1600);
      this.refreshItems(); this.autosave();
    },
    take(id, n = 1) { this.S.inv[id] = Math.max(0, (this.S.inv[id] || 0) - n); if (!this.S.inv[id]) delete this.S.inv[id]; },
    gotC(id) { return !!this.S.collected[id]; },
    giveCollectible(id) {
      const c = G.COLLECT.find((x) => x.id === id); if (!c || this.S.collected[id]) return;
      this.S.collected[id] = true; if (c.treat) this.S.inv.treat = (this.S.inv.treat || 0) + 1;
      A.play('collect');
      const done = G.COLLECT.filter((x) => x.cat === c.cat && this.S.collected[x.id]).length, tot = G.COLLECT.filter((x) => x.cat === c.cat).length;
      UI.toast(`<b>${c.name}</b>`, G.Portrait.item(c.model), `${G.CATS[c.cat]} ${done}/${tot}`);
      this.player.happy(); this.refreshItems(); this.autosave();
    },
    tillySighting(key) { const k = key === 2 ? (this.S.step === 'c2_tilly' || this.S.step === 'c2_out' ? '2a' : '2b') : String(key); if (!this.S.tilly[k]) { this.S.tilly[k] = true; } },
    npcEmote(id, e) { this.npcs[id].c.setEmote(e); },
    nearestShiny() {
      const p = this.player.pos, list = [];
      if (!this.hasItem('bottlecap')) list.push([47.2, 0, 15.3]); if (!this.hasItem('foil')) list.push([61, 0.5, 0.5]); if (!this.hasItem('marble')) list.push([20.3, 0, 43.2]);
      if (!list.length) return [1.4, 0, 36.8];
      list.sort((a, b) => U.dist2(a[0], a[2], p.x, p.z) - U.dist2(b[0], b[2], p.x, p.z)); return list[0];
    },
    nearestClue() { if (!this.hasItem('photo')) return [-109.6, 0, -19.4]; return [-108.9, 0.45, -22.6]; },
    nearestC4() {
      const p = this.player.pos, list = [];
      if (!this.hasItem('tinykey')) list.push([1.35, 0, -4.95]);
      if (!this.S.flags.gotGear) list.push(this.hasItem('stone') ? [1.4, 0, 36.8] : [-80, 0.22, 21.8]);
      if (!this.S.flags.mossTrust) { if (this.S.choices.moss !== 'promise' && !this.S.flags.m3done && !this.hasItem('treat')) { const t = G.COLLECT.filter((c) => c.treat && !this.S.collected[c.id]).map((c) => c.pos); list.push(...(t.length ? t : [[-59.2, 0, 41.2]])); } else list.push([-59.2, 0, 41.2]); }
      if (!list.length) return [-105, 0, -20.4];
      list.sort((a, b) => U.dist2(a[0], a[2], p.x, p.z) + (a[1] - p.y) ** 2 * 400 - U.dist2(b[0], b[2], p.x, p.z) - (b[1] - p.y) ** 2 * 400); return list[0];
    },
    c4Check() {
      if (this.S.step !== 'c4_tasks') return;
      const done = [this.hasItem('tinykey'), !!this.S.flags.gotGear, !!this.S.flags.mossTrust];
      UI.updateObjective();
      if (done.every(Boolean)) { setTimeout(() => { UI.toast('<b>Everything is ready</b>', null, 'Moss will meet you at the workshop hatch after dark.'); this.setStep('c4_meet'); }, 800); }
    },
    setStep(step) {
      if (step === 'c2_shiny' && ['bottlecap', 'foil', 'marble'].every((k) => this.hasItem(k))) step = 'c2_pip2';
      this.S.step = step; UI.updateObjective(true); this.placeNPCs(); this.refreshItems();
      if (step !== 'c1_wake') A.play('quest');
      this.autosave();
    },

    /* ---------------------------------------------------------------- saving */
    snapshot() {
      const S = this.S, p = this.player; S.pos = [p.pos.x, p.pos.y, p.pos.z]; S.yaw = p.yaw; S.saved = Date.now();
      if (p.safe) S.pos = [p.safe.x, p.safe.y, p.safe.z];
      return JSON.stringify(S);
    },
    save(slot) {
      if (this.state !== 'play' && this.state !== 'menu') return false;
      const ok = U.storage.set(SAVE_KEY + slot, this.snapshot());
      if (slot === 'auto') UI.saveBlip(); return ok;
    },
    autosave() { clearTimeout(this._as); this._as = setTimeout(() => { if (this.state === 'play' || this.state === 'menu') this.save('auto'); }, 400); },
    readSlot(slot) { try { const v = U.storage.get(SAVE_KEY + slot); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    latestSlot() { let best = null; for (const s of ['auto', '1', '2', '3']) { const d = this.readSlot(s); if (d && (!best || d.saved > best.d.saved)) best = { s, d }; } return best; },
    load(data) {
      UI.fade(true, () => {
        this.S = Object.assign(newState(), data);
        this.applyWorldState(); this.placeNPCs(); this.refreshItems();
        const [x, y, z] = this.S.pos; this.player.teleport(x, y, z, this.S.yaw); this.cam.snap = true;
        this.setWeatherStory(); A.setMood(this.moodFor());
        this.state = 'play'; UI.showHUD(true); UI.updateObjective(); UI.closeAll(); UI.title(false);
        setTimeout(() => UI.fade(false), 200);
        UI.toast('<b>Welcome back</b>', G.Portrait.character('milo'), `${CHAPTERS[this.S.chapter][0]}: ${CHAPTERS[this.S.chapter][1]}`);
      });
    },

    /* world objects that must reflect story progress (after a load) */
    applyWorldState() {
      const S = this.S, f = S.flags, c = S.chapter, O = W.obj, C = W.col;
      const setCol = (n, on) => { if (C[n]) C[n].on = on; };
      setCol('petFlap', c < 2); setCol('garageGap', c < 2); O.garageStick.visible = c >= 2;
      O.ellie.visible = c === 1 || c === 5 || c === 6; O.ellieTorso.rotation.x = c === 6 ? -0.15 : -Math.PI / 2 + 0.15; O.ellieTorso.position.set(0, c === 6 ? 0.05 : 0.1, c === 6 ? 0.1 : 0.2);
      O.quilt.position.y = 0.73;
      // crate
      if (f.crateMoved) { O.crate.position.z = 1.3; C.crate.z0 = 0.9; C.crate.z1 = 1.7; } else { O.crate.position.z = 0; C.crate.z0 = -0.4; C.crate.z1 = 0.4; } this.hashC(C.crate);
      O.vent.position.x = f.ventOpen ? 6.95 : 6.6; O.vent.position.z = f.ventOpen ? 1.25 : 1.0; O.vent.updateMatrix();
      setCol('digFence', !f.fenceDug); O.digMound.scale.set(f.fenceDug ? 0.001 : 0.4, f.fenceDug ? 0.001 : 0.14, f.fenceDug ? 0.001 : 0.4); O.digMound.updateMatrix();
      if (f.fenceDug && !this.fenceHole) { this.fenceHole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), G.Mat.color(0x120c08, 1)); this.fenceHole.rotation.x = -Math.PI / 2; this.fenceHole.position.set(16, 0.02, -22); this.scene.add(this.fenceHole); }
      setCol('gate', !f.gateOpen); O.gate.rotation.y = f.gateOpen ? -1.6 : 0;
      setCol('hedgeGap', !f.hedgeOpen);
      setCol('shedDoor', !f.shedOpen); O.shedDoor.rotation.y = f.shedOpen ? 1.7 : 0; O.shedLock.visible = !f.shedOpen;
      const hatchOpen = c >= 5 || f.hatchOpen; setCol('hatchBoards', !hatchOpen); O.hatchBoards.visible = !hatchOpen; O.hatch.rotation.x = hatchOpen ? -1.2 : 0; O.hatch.position.set(-105, hatchOpen ? 0.4 : 0.04, hatchOpen ? -21.45 : -21); O.hatch.updateMatrix();
      setCol('roots', !f.rootsDug); O.roots.visible = !f.rootsDug; O.rootMound.visible = !f.rootsDug;
      setCol('rubble', !f.rubbleClear); O.rubble.visible = !f.rubbleClear;
      O.keyMound.visible = !f.keyDug;
      O.drawer.position.z = f.drawerOpen ? -5.1 : -5.35; O.drawer.updateMatrix();
      this.refreshItems();
      if (G.EXT) G.EXT.applyState();
    },
    moodFor() { return { 1: 'night', 2: 'trail', 3: 'forest', 4: 'mystery', 5: 'night', 6: 'home', 7: 'trail' }[this.S.chapter] || 'home'; },
    setWeatherStory() { this.S.weather = this.S.weather || 'clear'; },

    /* ---------------------------------------------------------------- NPCs */
    placeNPCs() {
      const P = G.npcPlacement();
      for (const id in this.npcs) {
        const n = this.npcs[id], p = P[id];
        n.c.root.visible = !!p; n.hidden = !p; if (!p) continue;
        if (!n.anchor || n.anchor[0] !== p.pos[0] || n.anchor[2] !== p.pos[2] || n.anchor[1] !== p.pos[1]) { n.c.root.position.set(p.pos[0], p.pos[1], p.pos[2]); n.c.root.rotation.y = p.yaw; }
        n.anchor = p.pos; n.yaw0 = p.yaw; n.wander = p.wander || 0; n.target = null; n.leaving = false; n.c.root.scale.setScalar(n.c.root.scale.x);
      }
    },
    mossRunsOff() {
      const n = this.npcs.moss; n.leaving = true; n.target = [-76.5, 0, 24]; n.speed = 1.8; A.play('snuffle');
      setTimeout(() => { n.c.root.visible = false; n.hidden = true; }, 3800);
      this.setStep('c3_creek');
    },

    /* ---------------------------------------------------------------- scripted world actions */
    travel(pos, yaw, after) {
      if (this.busy) return; this.busy = true; A.play('rustle');
      UI.fade(true, () => { this.player.teleport(pos[0], pos[1], pos[2], yaw); this.cam.snap = true; this.cam.yaw = yaw + Math.PI; setTimeout(() => { UI.fade(false); this.busy = false; if (after) after(); }, 250); });
    },
    ventAnim() { A.play('metal'); const v = W.obj.vent; this.tween(0.5, (k) => { v.position.x = 6.6 + 0.35 * k; v.position.z = 1.0 + 0.25 * k; v.updateMatrix(); }); },
    drawerAnim() { this.flag('drawerOpen'); A.play('push'); const d = W.obj.drawer; this.tween(0.4, (k) => { d.position.z = -5.35 + 0.25 * k; d.updateMatrix(); }); },
    toyLid() { const l = W.obj.toylid; A.play('door'); this.tween(0.6, (k) => { l.rotation.x = -1.2 * Math.sin(k * Math.PI); l.position.y = 0.48 + 0.1 * Math.sin(k * Math.PI); l.updateMatrix(); }); },
    swingTire() { const t = W.obj.tire; A.play('thud'); let v = 0.6; this.tween(4, (k) => { t.rotation.x = Math.sin(k * 20) * v * (1 - k); t.updateMatrix(); }); },
    pushCrate() {
      const p = this.player; if (p.pos.x < -5.1) { this.say([['milo', '*I need to push it from this side... It won’t budge towards the wall.*', 'think']]); return; }
      this.flag('crateMoved'); A.play('push'); const c = W.obj.crate, C = W.col.crate;
      p.act('push', 1.4, { lockMove: true });
      this.tween(1.3, (k) => { c.position.z = 1.3 * U.smooth(k); c.updateMatrix(); }, () => {
        C.z0 = 0.9; C.z1 = 1.7; this.hashC(C); this.refreshItems(); A.play('secret'); this.particles.burst(V3(-5.84, UG + 0.25, 0), 18, 0xd9b78a, 'dust');
        this.cinematic({ pos: V3(-4.4, UG + 0.6, 0.9), look: V3(-5.9, UG + 0.2, 0), dur: 2.4 });
        this.say([['milo', '*A hole! A real tunnel, behind the crate. And there’s something red at the entrance...*', 'surprised']], () => this.setStep('c1_tunnel'));
      });
    },
    exitTunnelA() {
      if (this.S.chapter === 1) {
        this.busy = true; A.play('rustle');
        UI.fade(true, () => {
          this.player.teleport(-6.1, 0, -23.4, 0.5); this.cam.snap = true; this.cam.yaw = 0.5 + Math.PI;
          this.S.time = 6.1; this.startChapter(2);
          setTimeout(() => { UI.fade(false); this.busy = false; }, 300);
        });
      } else this.travel([-6.1, 0, -23.4], 0.5);
    },
    digFence() {
      this.player.act('dig', 1.6, { lockMove: true }); A.play('dig'); setTimeout(() => A.play('dig'), 500); setTimeout(() => A.play('dig'), 1000);
      const m = W.obj.digMound; let b = 0; const iv = setInterval(() => { this.dirtBurst(); if (++b > 4) clearInterval(iv); }, 280);
      this.tween(1.5, (k) => { const s = 0.4 * (1 - k) + 0.001; m.scale.set(s, s * 0.35, s); m.updateMatrix(); }, () => {
        this.flag('fenceDug'); this.applyWorldState(); A.play('secret'); this.player.happy();
        UI.toast('<b>A way out!</b>', null, 'Milo dug a tunnel under the fence.');
        if (this.S.step === 'c2_out' || this.S.step === 'c2_tilly') this.setStep('c2_nora');
      });
    },
    openGate() { this.flag('gateOpen'); A.play('unlock'); const g = W.obj.gate; this.tween(1, (k) => (g.rotation.y = -1.6 * U.smooth(k)), () => { W.col.gate.on = false; UI.toast('<b>Gate open</b>', null, 'A shortcut between the backyard and the lane.'); }); },
    revealHedge() {
      this.flag('hedgeOpen'); W.col.hedgeGap.on = false; A.play('secret');
      this.particles.burst(V3(-30, 0.25, 50), 30, 0xf0c060, 'spark');
      this.cinematic({ pos: V3(-27.2, 0.9, 51.8), look: V3(-30, 0.2, 50), dur: 2.6 });
    },
    digKey() {
      this.player.act('dig', 1.6, { lockMove: true }); A.play('dig'); setTimeout(() => A.play('dig'), 600);
      const iv = setInterval(() => this.dirtBurst(), 300); setTimeout(() => clearInterval(iv), 1500);
      setTimeout(() => { this.flag('keyDug'); W.obj.keyMound.visible = false; this.give('key'); A.play('secret'); if (['c3_trail', 'c3_moss', 'c3_creek', 'c3_clear', 'c3_sniff'].includes(this.S.step)) this.setStep('c3_shed'); this.say([['milo', '*A key! With a tiny gear on the end. Moss said it felt important...*', 'surprised']]); }, 1600);
    },
    unlockShed() {
      this.flag('shedOpen'); this.flag('usedKey'); this.take('key'); A.play('unlock');
      const d = W.obj.shedDoor; W.obj.shedLock.visible = false;
      this.tween(1.4, (k) => (d.rotation.y = 1.7 * U.smooth(k)), () => { W.col.shedDoor.on = false; });
      this.cinematic({ pos: V3(-104.8, 1.2, -12.5), look: V3(-107, 0.8, -18), dur: 2.6 });
      if (this.S.chapter === 3 && this.S.step !== 'c3_clues') this.setStep('c3_clues');
    },
    digRoots() {
      this.player.act('dig', 1.8, { lockMove: true }); A.play('dig'); setTimeout(() => A.play('dig'), 600); setTimeout(() => A.play('dig'), 1200);
      const iv = setInterval(() => this.dirtBurst(), 300); setTimeout(() => clearInterval(iv), 1700);
      setTimeout(() => { this.flag('rootsDug'); this.applyWorldState(); A.play('secret'); this.setStep('c5_nook'); }, 1800);
    },
    clearRubble() {
      this.player.act('push', 1.4, { lockMove: true }); A.play('push'); A.play('thud');
      this.particles.burst(V3(-13.3, UG + 0.3, -4.5), 30, 0xa08060, 'dust');
      setTimeout(() => { this.flag('rubbleClear'); this.applyWorldState(); A.play('secret'); this.setStep('c5_home'); UI.toast('<b>The old tunnel!</b>', null, 'This leads back to the basement.'); }, 1300);
    },
    dirtBurst(col = 0x6b4b31) { const p = this.player, f = p.fwd(); this.particles.burst(V3(p.pos.x + f.x * 0.3, p.pos.y + 0.08, p.pos.z + f.z * 0.3), 10, col, 'dirt'); },
    sleep() {
      const s = this.S;
      if (s.chapter === 1 && s.step !== 'end') { this.say([['milo', '*Sleep? Not now! That noise...*', 'surprised']]); return; }
      if (this.hasItem('musicbox')) { this.say([['milo', '*No napping yet. Ellie’s music box needs to get home!*', 'think']]); return; }
      this.player.act('sleep', 3.2, { lockMove: true }); A.play('yawn');
      setTimeout(() => UI.fade(true, () => { s.time = (s.time + 5) % 24; this.save('auto'); UI.toast('<b>What a nap</b>', null, 'The game has been saved.'); setTimeout(() => UI.fade(false), 400); }), 1800);
    },
    fixMusicBox() {
      this.busy = true; const lid = this.nookBox.userData.lid;
      this.say([['milo', '*First, the brass gear from Pip. It clicks right into place...*', 'think']], () => {
        this.take('gear'); A.play('metal'); this.particles.burst(this.nookBox.position.clone().add(V3(0, 0.1, 0)), 14, 0xf0c060, 'spark');
        this.say([['milo', '*Now the tiny brass key, from Ellie’s kitchen drawer. Wind, wind, wind...*', 'think']], () => {
          this.take('tinykey'); this.flag('usedTinyKey');
          this.cinematic({ pos: V3(-17.7, UG + 0.5, -3.6), look: V3(-18.9, UG + 0.1, -4.4), dur: 9 });
          this.tween(1, (k) => { lid.rotation.x = -1.1 * k; lid.position.set(0, 0.09 + 0.04 * k, -0.05 * k); });
          const dur = A.musicBox({ vol: 0.12 }); this.notes = { pos: this.nookBox.position.clone(), t: dur };
          this.npcEmote('moss', 'happy');
          setTimeout(() => {
            this.busy = false; this.give('musicbox'); this.nookBox.visible = false;
            this.say([['moss', 'It’s... it’s singing properly! Oh, Milo. That’s the song. That’s the one.', 'happy'], ['moss', 'The loose earth over there leads back to your house. I’m sure of it. Go on! Take it home!', 'happy'], ['milo', '*Thank you, Moss. You’ve been looking after it all this time.*', 'happy']], () => this.setStep('c5_rubble'));
          }, Math.min(dur * 1000, 9000));
        });
      });
    },
    placeMusicBox() {
      this.take('musicbox'); this.flag('boxPlaced'); this.refreshItems(); this.busy = true; this.state = 'cutscene'; UI.showHUD(false); A.setMood('quiet');
      const lid = this.standBox.userData.lid;
      this.cinematic({ pos: V3(-3.3, 1.0, -4.9), look: V3(-4.05, 0.62, -5.7), dur: 30 });
      this.player.act('dance', 2.4, { lockMove: true });
      setTimeout(() => {
        this.tween(1, (k) => { lid.rotation.x = -1.1 * k; lid.position.set(0, 0.09 + 0.04 * k, -0.05 * k); });
        const dur = A.musicBox({ vol: 0.13 }); this.notes = { pos: this.standBox.position.clone(), t: dur + 2 };
        setTimeout(() => this.ending(), dur * 1000 + 600);
      }, 1500);
    },
    ending() {
      UI.fade(true, () => {
        this.S.chapter = 6; this.S.step = 'end'; this.S.time = 7.4; this.S.weather = 'clear'; this.applyWorldState(); this.placeNPCs();
        this.player.teleport(-3.6, 0.55, -5.2, -1.6); this.player.pos.y = 0.73; this.player.vy = 0;
        W.obj.ellieTorso.rotation.x = -0.15; W.obj.ellieTorso.position.set(0, 0.05, 0.1); W.obj.ellieArms.rotation.x = -0.75; W.obj.ellieArms.position.set(0, 0.12, 0.02);
        this.player.teleport(-4.3, 0.73, -4.9, -2.2);
        this.cinematic({ pos: V3(-3.2, 1.35, -3.4), look: V3(-5.1, 0.9, -5.2), dur: 40 });
        A.setMood('ending');
        setTimeout(() => {
          UI.fade(false);
          this.say([
            ['ellie', 'Mm... Milo? What’s that music...?', 'sleepy'],
            ['ellie', '...Grandpa’s music box?! I haven’t seen this since I was six!', 'surprised'],
            ['ellie', 'Milo... did YOU find this?', 'surprised'],
            { do: () => { this.player.act('dance', 3, { lockMove: true }); A.play('dook'); setTimeout(() => A.play('dook'), 700); } },
            ['milo', '*Dook dook dook dook!*', 'happy'],
            ['ellie', 'You silly, wonderful weasel. I have to call Grandpa. He’s going to cry. The happy kind.', 'happy'],
          ], () => this.epilogue());
        }, 900);
      });
    },
    epilogue() {
      UI.fade(true, () => {
        this.S.time = 16.5; this.player.teleport(-2, 0, -17.5, 3.0); this.cam.snap = true;
        this.cinematic({ pos: V3(1.5, 1.6, -14.2), look: V3(-3, 0.3, -19), dur: 60 });
        setTimeout(() => { UI.fade(false); setTimeout(() => UI.ending(this.stats()), 2500); }, 500);
      });
    },
    stats() {
      const S = this.S; const cats = {}; for (const c of G.COLLECT) { cats[c.cat] = cats[c.cat] || [0, 0]; cats[c.cat][1]++; if (S.collected[c.id]) cats[c.cat][0]++; }
      return { cats, total: G.COLLECT.filter((c) => S.collected[c.id]).length, of: G.COLLECT.length, tilly: Object.keys(S.tilly).length, time: S.playTime };
    },
    freeRoam() {
      this.cinematicEnd(); this.busy = false; this.state = 'play'; UI.showHUD(true); UI.updateObjective(true); this.S.chapter = 6; this.S.step = 'end'; this.save('auto');
      UI.chapterCard(6);
    },

    /* ---------------------------------------------------------------- chapters */
    startChapter(n, silent) {
      const S = this.S; S.chapter = n;
      const cfg = {
        1: { time: 1.5, weather: 'clear', step: 'c1_wake' }, 2: { time: 6.2, weather: 'clear', step: 'c2_tilly' }, 3: { time: 17.3, weather: 'clear', step: 'c3_trail' },
        4: { time: 9.6, weather: 'rain', step: 'c4_board' }, 5: { time: 21.4, weather: 'clear', step: 'c5_hatch' },
      }[n];
      S.step = cfg.step; S.weather = cfg.weather; if (n !== 2) S.time = cfg.time; else S.time = Math.max(S.time, 6.1);
      this.applyWorldState(); this.placeNPCs(); this.refreshItems(); A.setMood(this.moodFor());
      if (!silent) UI.chapterCard(n); UI.updateObjective(true); this.autosave();
      if (n === 2) setTimeout(() => this.say([['milo', '*...Outside! The tunnel goes all the way from the basement to the backyard. The sun is coming up.*', 'surprised'], ['milo', '*Someone’s been using it. The earth is fresh. Who? And that little song...*', 'think']]), 4700);
      if (n === 3) setTimeout(() => this.say([['milo', '*Hollow Wood. It’s so quiet here. And it smells like... hedgehog, and old leaves, and adventure.*', 'happy']]), 4700);
      if (n === 5) setTimeout(() => this.say([['moss', 'Milo! Down here! I cleared the boards. Come on, the singing box is waiting in my nook!', 'happy'], ['milo', '*Tonight, we bring it home.*', 'happy']]), 4700);
    },
    chapter4() {
      this.busy = true;
      this.say([['milo', '*The photo, the journal, the ribbon, the song... Juniper was a ferret, like me. Grandpa Arlo made a music box for Ellie.*', 'think'], ['milo', '*It’s getting dark. Maybe I’ll rest here in the workshop and think it all through...*', 'sleepy']], () => {
        this.player.act('sleep', 3, { lockMove: true }); A.play('yawn');
        setTimeout(() => UI.fade(true, () => { this.player.teleport(-106.2, 0, -19.2, 1.2); this.cam.snap = true; this.startChapter(4); setTimeout(() => { UI.fade(false); this.busy = false; setTimeout(() => this.say([['milo', '*Rain! And the corkboard... if I put all the clues together, maybe it’ll make sense.*', 'think']]), 4700); }, 400); }), 1600);
      });
    },

    /* ---------------------------------------------------------------- dialogue entry points */
    say(lines, done) { UI.dialogue(lines, done); },
    talk(id) {
      const n = this.npcs[id]; if (!n) return;
      if (id === 'moss' && this.S.chapter === 3 && n.scared > 0.5) { UI.toast('<b>Moss is frightened</b>', G.Portrait.character('moss'), 'Walk slowly - don’t hold Shift near him.'); return; }
      const lines = G.DIALOGUE[id]();
      if (!this.S.flags['met_' + id]) { this.flag('met_' + id); }
      if (id === 'nora' && !this.S.flags.fastTravel && this.S.chapter >= 2) { this.flag('fastTravel'); lines.push({ do: () => UI.toast('<b>Nora’s burrows</b>', G.Portrait.character('nora'), 'Open the map (M) to hop between places you’ve discovered.') }); }
      // face each other + frame the moment
      const p = this.player, np = n.c.root.position; p.yaw = Math.atan2(np.x - p.pos.x, np.z - p.pos.z); n.talkYaw = Math.atan2(p.pos.x - np.x, p.pos.z - np.z);
      n.talking = true; n.c.state.talk = true;
      const mid = V3((p.pos.x + np.x) / 2, Math.max(p.pos.y, np.y) + 0.3, (p.pos.z + np.z) / 2), dx = np.x - p.pos.x, dz = np.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      const side = V3(-dz / l, 0, dx / l).multiplyScalar(1.5 + (id === 'bram' ? 0.6 : 0));
      const camP = mid.clone().add(side).add(V3(0, 0.45, 0)); if (this.camFree(mid, camP)) this.cinematic({ pos: camP, look: mid, dur: 999, soft: true });
      if (id === 'pip') A.play('chatter'); if (id === 'tilly') A.play('meow'); if (id === 'bram' && !(this.S.chapter === 1 || this.S.chapter === 4 && !this.S.flags.bramAwake)) A.play('woof'); if (id === 'moss') A.play('snuffle');
      this.say(lines, () => { n.talking = false; n.c.state.talk = false; this.cinematicEnd(); });
    },
    camFree(a, b) { return this.rayBoxes(a, b) > 0.95; },

    /* ---------------------------------------------------------------- tweens + cinematics */
    tweens: [],
    tween(dur, fn, done) { this.tweens.push({ t: 0, dur, fn, done }); },
    cinematic(o) { this.cine = Object.assign({ t: 0 }, o); if (!o.soft) UI.letterbox(true); },
    cinematicEnd() { this.cine = null; UI.letterbox(false); },

    /* ---------------------------------------------------------------- title screen */
    titleScreen(first) {
      this.state = 'title'; UI.showHUD(false); UI.title(true);
      this.S = newState(); this.S.chapter = 2; this.S.time = 18.2; this.S.weather = 'clear'; this.applyWorldState(); this.placeNPCs(); this.refreshItems();
      for (const id in this.npcs) { this.npcs[id].c.root.visible = false; this.npcs[id].hidden = true; }
      this.player.teleport(-2.5, 0, -17.4, 0.6); this.player.titleIdle = true;
      A.setMood('home');
      if (!first) UI.fade(false);
    },
    newGame() {
      A.init();
      UI.fade(true, () => {
        this.S = newState(); this.applyWorldState();
        this.player.titleIdle = false; this.player.teleport(-3, 0.02, -4.6, 0.4); this.cam.snap = true; this.cam.yaw = 0.4 + Math.PI - 0.5; this.cam.pitch = 0.4;
        this.state = 'play'; UI.title(false); UI.showHUD(true); this.startChapter(1, true);
        this.player.act('sleep', 5.5, { lockMove: true });
        this.cinematic({ pos: V3(-2.2, 0.9, -3.4), look: V3(-3, 0.1, -4.6), dur: 6.5 });
        setTimeout(() => UI.fade(false), 300);
        setTimeout(() => UI.chapterCard(1), 700);
        setTimeout(() => { A.musicBox({ broken: true, muffled: true, vol: 0.08 }); A.play('thud'); this.shake = 0.5; }, 4200);
        setTimeout(() => { A.play('dook'); this.say([['milo', '*...Huh? What was that?*', 'surprised'], ['milo', '*A clink... and a little song. It came from under the floor!*', 'think'], ['milo', '*Everyone’s asleep. I’d better investigate. Quietly.*', 'neutral']], () => { this.cinematicEnd(); UI.hint(); }); }, 6200);
      });
    },

    /* ---------------------------------------------------------------- main loop */
    loop(now) {
      requestAnimationFrame((t) => this.loop(t));
      if (!G.GFX.frame(now)) return;
      // rAF timestamps can precede the last performance.now() (e.g. right after the slow world build);
      // a negative dt would make every damped value (exposure, lights, camera) overshoot wildly
      let dt = U.clamp((now - this.last) / 1000, 0, G.dtMax || 0.05); this.last = Math.max(now, this.last); this.t += dt;
      I.update();
      try { this.update(dt); } catch (e) { console.error(e); }
      I.endFrame();
      this.renderer.info.reset();
      G.GFX.render(dt);
    },
    update(dt) {
      const S = this.S, st = this.state;
      W.timeU.value = this.t;
      for (let i = this.tweens.length - 1; i >= 0; i--) { const tw = this.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1) { this.tweens.splice(i, 1); tw.done && tw.done(); } }
      if (st === 'play') { S.playTime += dt; if (G.settings.timeFlow && !UI.dialogueOpen) S.time = (S.time + dt / 180) % 24; }
      if (st === 'title') S.time = 18.2;
      // global input
      if (st === 'play' && !UI.dialogueOpen && !this.busy) {
        if (I.pressed('pause') && !(G.SEQ && (G.SEQ.running || performance.now() - (G.SEQ.lastSkip || 0) < 600))) { UI.menu('pause'); }
        else if (I.pressed('inventory')) UI.menu('inventory');
        else if (I.pressed('map')) UI.menu('map');
        else if (I.pressed('history')) UI.menu('history');
      } else if (st === 'menu') { if (I.pressed('pause') || I.pressed('back') || I.pressed('inventory') && UI.panel === 'inventory' || I.pressed('map') && UI.panel === 'map') UI.closeAll(); }
      if (UI.dialogueOpen) UI.dialogueInput();
      if (UI.cardOpen && (I.pressed('confirm'))) UI.chapterCardSkip();
      if (st === 'play' || st === 'title' || st === 'cutscene') {
        this.player.update(dt, st === 'play' && !UI.dialogueOpen && !this.busy && !this.cine || (this.cine && this.cine.soft === false && false));
        this.updateNPCs(dt);
        this.updateInteract(dt);
        this.updateTriggers(dt);
      }
      this.updateEnv(dt);
      this.updateCamera(dt);
      this.updateItems(dt);
      if (G.EXT) G.EXT.update(dt, st);
      this.particles.update(dt, this.camera);
      for (const f of W.updaters) f(this.t);
      if (W.obj.pendulum) { W.obj.pendulum.rotation.z = Math.sin(this.t * Math.PI) * 0.18; W.obj.pendulum.updateMatrix(); }
      if (W.obj.embers) { W.obj.embers.material.emissiveIntensity = 1.6 + Math.sin(this.t * 9) * 0.3 + Math.sin(this.t * 23) * 0.2; }
      if (W.obj.flap) { const p = this.player.pos; const d = Math.hypot(p.x - 5, p.z + 6); W.obj.flap.rotation.x = U.damp(W.obj.flap.rotation.x, d < 0.45 && !W.col.petFlap.on ? (p.z < -6 ? -1.1 : 1.1) : 0, 8, dt); }
      if (st === 'play' && this.t - (this._lastAuto || 0) > 90) { this._lastAuto = this.t; this.save('auto'); }
      UI.update(dt);
    },

    /* ---------------------------------------------------------------- environment */
    SKY: [
      [0, 0x0a1024, 0x1b2745, 0x0b0d14, 0x8ea6d8, 0.3, 0x2c3a66, 0x15110c, 0.42, 0x121a30],
      [4.8, 0x121a38, 0x2c3558, 0x0b0d14, 0x8ea6d8, 0.28, 0x34406a, 0x1a150e, 0.44, 0x1c2440],
      [6.2, 0x3f5188, 0xf0a57c, 0x3a3030, 0xffb27a, 0.9, 0x8a90b0, 0x4a3a2a, 0.55, 0xc49a86],
      [8, 0x5e97d6, 0xcfe0ea, 0x6a7a6a, 0xffe6c2, 1.8, 0xb8d0ee, 0x6b5a3d, 0.72, 0xb4c8d6],
      [13, 0x4d8cd4, 0xd4e6f2, 0x6a7a6a, 0xfff4e0, 2.1, 0xc4dcff, 0x6e5c3e, 0.78, 0xbfd2e0],
      [16.8, 0x5584c6, 0xf0d6ae, 0x6a6a5a, 0xffd49e, 1.7, 0xbccae6, 0x6b5537, 0.72, 0xd0c2a8],
      [18.6, 0x3c4a86, 0xf08d5a, 0x3a2a2a, 0xff8a4a, 1.0, 0x8a86b0, 0x4a3526, 0.56, 0xb88670],
      [19.8, 0x1f2754, 0x5d4c7a, 0x151520, 0xb0a0d8, 0.4, 0x4a4f80, 0x211a14, 0.46, 0x383552],
      [21.2, 0x0c1228, 0x1f2a4a, 0x0b0d14, 0x8ea6d8, 0.3, 0x2c3a66, 0x15110c, 0.42, 0x141b30],
      [24, 0x0a1024, 0x1b2745, 0x0b0d14, 0x8ea6d8, 0.3, 0x2c3a66, 0x15110c, 0.42, 0x121a30],
    ],
    WEATHER: { clear: { cloud: 0.12, rain: 0, fog: 0, wind: 0.3 }, cloudy: { cloud: 0.85, rain: 0, fog: 0.12, wind: 0.55 }, rain: { cloud: 1, rain: 1, fog: 0.35, wind: 0.75 }, fog: { cloud: 0.55, rain: 0, fog: 1, wind: 0.1 } },
    updateEnv(dt) {
      const S = this.S, E = this.env, h = S.time;
      let i = 0; while (i < this.SKY.length - 2 && this.SKY[i + 1][0] <= h) i++;
      const a = this.SKY[i], b = this.SKY[i + 1], k = U.smooth(U.clamp((h - a[0]) / (b[0] - a[0]), 0, 1));
      const C = (j) => new THREE.Color(a[j]).lerp(new THREE.Color(b[j]), k), N = (j) => U.lerp(a[j], b[j], k);
      // weather target
      let wname = G.settings.weather !== 'story' ? G.settings.weather : S.weather;
      if (S.chapter === 3 && ['c3_sniff', 'c3_shed', 'c3_clues'].includes(S.step) && G.settings.weather === 'story') wname = 'fog';
      if (S.chapter === 6 && G.settings.weather === 'story') { this._wT = (this._wT || 0) + dt; if (this._wT > 240) { this._wT = 0; S.weather = ['clear', 'clear', 'cloudy', 'rain', 'fog'][Math.floor(Math.random() * 5)]; } wname = S.weather; }
      const wt = this.WEATHER[wname] || this.WEATHER.clear, wn = this.weatherNow;
      for (const key in wt) wn[key] = U.damp(wn[key], wt[key], 0.35, dt);
      // where is the player?
      const p = this.player.pos, ar = W.areaAt(p.x, p.y, p.z);
      E.area = ar; E.indoor = !!ar.indoor; E.ug = p.y < UG + 12; E.darkArea = ar.dark ? 1 : ar.dim ? ar.dim : 0;
      // sun
      const ang = ((h - 6) / 12) * Math.PI, el = Math.sin(ang);
      const night = (E.night = U.clamp((0.12 - el) / 0.3, 0, 1));
      E.wind = wn.wind; E.rain = wn.rain; E.cloud = wn.cloud; E.fog = wn.fog; E.wet = U.damp(E.wet || 0, wn.rain > 0.3 ? 1 : 0, 0.08, dt);
      const top = C(1), hor = C(2), bot = C(3), sunC = C(4), grey = new THREE.Color(0x8a9098).multiplyScalar(1 - night * 0.8);
      top.lerp(grey, wn.cloud * 0.6); hor.lerp(grey, wn.cloud * 0.5);
      this.skyMat.uniforms.top.value.copy(top); this.skyMat.uniforms.hor.value.copy(hor); this.skyMat.uniforms.bot.value.copy(bot);
      const sd = night > 0.5 ? V3(-Math.cos(ang), Math.abs(el) * 0.8 + 0.25, 0.4).normalize() : V3(Math.cos(ang), Math.max(el, 0.05), 0.4).normalize();
      this.skyMat.uniforms.sunDir.value.copy(sd); this.skyMat.uniforms.sunCol.value.copy(sunC).multiplyScalar((1 - wn.cloud * 0.9) * (1 - night));
      this.skyMat.uniforms.glowI.value = 1 - wn.cloud;
      // lights
      let sunI = N(5) * (1 - wn.cloud * 0.7), hemiI = N(8) * (1 - wn.rain * 0.25);
      const hemiS = C(6), hemiG = C(7);
      let fogCol = C(9).lerp(new THREE.Color(0x8a9098).multiplyScalar(1 - night * 0.75), wn.cloud * 0.5 + wn.fog * 0.3);
      let fogD = 0.0045 + wn.fog * 0.05 + wn.rain * 0.012 + night * 0.004;
      if (E.indoor) { fogD = 0.006; }
      if (ar.zone === 'forest' && !E.indoor) { sunI *= 0.8; fogD += 0.006; }
      if (E.ug) { sunI = 0; hemiI = 0.16; hemiS.set(0x6a5a4a); hemiG.set(0x2a1d15); fogCol.set(0x1a120c); fogD = 0.12; }
      else if (ar.dark) { sunI *= 0.1; hemiI *= 0.3; }
      else if (E.indoor && ar.id === 'shed') { hemiI *= 0.7; }
      else if (E.indoor && ar.zone === 'house') { hemiI *= 1 + (1 - night) * 0.25; }
      this.sun.intensity = U.damp(this.sun.intensity, sunI, 3, dt); this.sun.color.copy(sunC);
      this.hemi.intensity = U.damp(this.hemi.intensity, hemiI, 3, dt); this.hemi.color.copy(hemiS); this.hemi.groundColor.copy(hemiG);
      this.scene.fog.color.lerp(fogCol, 1 - Math.exp(-4 * dt)); this.scene.fog.density = U.damp(this.scene.fog.density, fogD, 3, dt);
      this.renderer.toneMappingExposure = U.damp(this.renderer.toneMappingExposure, E.ug ? 1.25 : 1.0 + night * 0.25, 2, dt);
      G.Mat.rimU.value = 0.35 + (1 - night) * 0.35;
      const sp = this.player.pos; this.sun.position.set(sp.x + sd.x * 50, sp.y + sd.y * 50, sp.z + sd.z * 50); this.sun.target.position.set(sp.x, sp.y, sp.z);
      // stars, moon, clouds
      this.sky.position.copy(this.camera.position); this.stars.position.copy(this.camera.position);
      this.stars.material.opacity = night * (1 - wn.cloud) * 0.9;
      const U2 = this.skyMat.uniforms; U2.moonDir.value.copy(V3(-Math.cos(ang), Math.abs(Math.sin(ang)) * 0.7 + 0.3, 0.4).normalize()); U2.nightK.value = night * (1 - wn.cloud * 0.8);
      U2.cloudCov.value = 0.25 + wn.cloud * 0.75; U2.cloudCol.value.copy(hor).lerp(new THREE.Color(0xffffff), 0.55 * (1 - night)).multiplyScalar((1 - wn.rain * 0.45) * (1 - night * 0.55));
      // window panes show the sky; windows glow at night
      for (const m of W.skyPanes) m.color.copy(hor).lerp(top, 0.3).multiplyScalar(0.9 + (1 - night) * 0.3);
      for (const m of W.nightMats) m.emissiveIntensity = night * 1.4;
      W.windU.value = wn.wind;
      if (W.canopyMat) W.canopyMat.color.setScalar(1 - wn.rain * 0.15);
      // wetness
      const wet = E.wet; const pm = G.Mat.get('puddle'); pm.opacity = wet * 0.75;
      for (const k of ['asphalt', 'sidewalk', 'concrete', 'stone', 'dirt']) { const m = G.Mat.cache[k]; if (m) { m.roughness = U.lerp(k === 'asphalt' ? 0.8 : 0.9, 0.25, wet); m.color.setScalar(1 - wet * 0.25); } }
      // rain
      const rv = wn.rain * (E.indoor || E.ug ? 0 : 1); this.rain.material.opacity = rv * 0.42; this.rain.visible = rv > 0.02;
      if (this.rain.visible) {
        const arr = this.rain.geometry.attributes.position.array, cp = this.camera.position, wx = wn.wind * 2.5;
        const nA = Math.min(this.rainN, this.rainActive || 2600); this.rain.geometry.setDrawRange(0, nA * 2);
        for (let j = 0; j < nA; j++) { const d = this.drops[j]; d[1] -= d[3] * dt; if (d[1] < -1) { d[1] = 14 + Math.random() * 2; d[0] = Math.random() * 30 - 15; d[2] = Math.random() * 30 - 15; } const x = cp.x + d[0], y = cp.y - 3 + d[1], z = cp.z + d[2]; arr[j * 6] = x; arr[j * 6 + 1] = y; arr[j * 6 + 2] = z; arr[j * 6 + 3] = x + wx * 0.03; arr[j * 6 + 4] = y + 0.35; arr[j * 6 + 5] = z; }
        this.rain.geometry.attributes.position.needsUpdate = true;
      }
      // env map from the sky every few seconds
      this._envT = (this._envT || 99) + dt;
      if (this._envT > G.GFX.envInterval && !E.ug) { this._envT = 0; const rt = this.pmrem.fromEquirectangular(this.paintEnv(top, hor, bot, sd, sunC, night)); if (this.envRT) this.envRT.dispose(); this.envRT = rt; this.scene.environment = rt.texture; }
      if (E.ug && this.scene.environment) { this.scene.environment = null; this._envT = 99; }
      // local lights
      this.updateLights(dt, night);
      // flashlight: on whenever it's dark and Milo has it
      const dark = E.ug || ar.dark || (night > 0.5 && !E.indoor) || (night > 0.5 && E.indoor && ar.zone !== 'house');
      const fOn = this.hasItem('flashlight') && dark && this.state !== 'title';
      const f = this.player.f, head = tmpV; f.head.getWorldPosition(head); const fw = this.player.fwd();
      this.flash.position.copy(head).add(V3(fw.x * 0.1, 0.05, fw.z * 0.1)); this.flash.target.position.set(head.x + fw.x * 3, head.y - 0.4, head.z + fw.z * 3);
      this.flash.intensity = U.damp(this.flash.intensity, fOn ? 2.4 : 0, 6, dt);
      this.glow.position.set(head.x, head.y + 0.4, head.z); this.glow.intensity = U.damp(this.glow.intensity, E.ug || ar.dark ? 0.9 : night > 0.6 && !E.indoor ? 0.35 : 0, 3, dt);
      this.carryFlash.visible = fOn && !this.carryBox.visible;
      for (const s of this.halos) { s.material.opacity = night * 0.6 * (E.ug ? 0 : 1); s.visible = s.material.opacity > 0.01; s.quaternion.copy(this.camera.quaternion); }
      // ambience
      if (A.ready) {
        const out = !E.indoor && !E.ug, forest = ar.zone === 'forest';
        const cp = this.player.pos; const creekD = Math.min(Math.abs(cp.x + 80), 999) + (cp.x < -50 ? 0 : 999); const pondD = Math.hypot(cp.x + 10, cp.z - 50);
        A.setLayer('rain', wn.rain * (out ? 0.5 : E.ug ? 0 : 0.18));
        A.setLayer('wind', (0.05 + wn.wind * 0.18) * (out ? 1 : 0.25) * (E.ug ? 0 : 1) + (forest ? 0.05 : 0));
        A.setLayer('creek', out ? U.clamp(1 - creekD / 22, 0, 1) * 0.35 + U.clamp(1 - pondD / 12, 0, 1) * 0.08 : 0);
        A.setLayer('hum', ar.zone === 'house' && !E.ug ? 0.03 : 0);
        A.setLayer('cave', E.ug || ar.dark ? 0.35 : 0);
        A.tickAmbient(dt, { crickets: out ? night * (1 - wn.rain) : 0, birds: out ? (1 - night) * (1 - wn.rain * 0.8) * (forest ? 1.3 : 0.8) : 0, creaks: ar.zone === 'house' || ar.id === 'shed' ? 1 : 0, owl: out && forest ? night : 0, drips: E.ug || (wn.rain > 0.5 && E.indoor) ? 1 : 0, frogs: out && pondD < 16 ? night : 0, clock: ar.id === 'living' || ar.id === 'hall' ? 1 : 0 });
      }
      // fireflies at night in the backyard and clearing, dust indoors
      this._ffT = (this._ffT || 0) + dt;
      if (this._ffT > 0.12) {
        this._ffT = 0;
        if (night > 0.5 && !E.indoor && !E.ug && wn.rain < 0.3 && (ar.id === 'backyard' || ar.id === 'clearing' || ar.zone === 'forest')) { const q = this.player.pos; this.particles.ambient({ x: q.x + (Math.random() - 0.5) * 16, y: 0.3 + Math.random() * 1.5, z: q.z + (Math.random() - 0.5) * 16, vx: 0, vy: 0.05, vz: 0, life: 4, size: 0.07, col: 0xd9ff7a, glow: true, wander: 0.6, blink: true }); }
        if ((E.indoor && !E.ug && night < 0.5) || E.ug) { const q = this.player.pos; this.particles.ambient({ x: q.x + (Math.random() - 0.5) * 5, y: q.y + Math.random() * 1.6, z: q.z + (Math.random() - 0.5) * 5, vx: 0, vy: -0.01, vz: 0, life: 5, size: 0.018, col: 0xffe9c0, glow: true, wander: 0.05, alpha: 0.35 }); }
        if (ar.zone === 'forest' && !E.indoor && Math.random() < 0.3) { const q = this.player.pos; this.particles.ambient({ x: q.x + (Math.random() - 0.5) * 12, y: 4 + Math.random() * 3, z: q.z + (Math.random() - 0.5) * 12, vx: 0.2, vy: -0.4, vz: 0.1, life: 9, size: 0.06, col: [0xc07a2a, 0xa8a03a, 0xd9a040][Math.floor(Math.random() * 3)], leaf: true, wander: 0.4, grav: 0 }); }
      }
      if (this.notes && this.notes.t > 0) { this.notes.t -= dt; if (Math.random() < dt * 5) this.particles.emit({ x: this.notes.pos.x + (Math.random() - 0.5) * 0.2, y: this.notes.pos.y + 0.15, z: this.notes.pos.z + (Math.random() - 0.5) * 0.2, vx: (Math.random() - 0.5) * 0.2, vy: 0.35, vz: (Math.random() - 0.5) * 0.2, life: 2.2, size: 0.09, col: 0xffd070, glow: true, note: true, wander: 0.3 }); }
    },
    /* a small painted equirect sky, blurred by PMREM into image-based lighting */
    paintEnv(top, hor, bot, sd, sunC, night) {
      const ER = G.GFX.envRes; if (this.envCv && this.envCv.width !== ER) { this.envTex.dispose(); this.envCv = null; }
      if (!this.envCv) { this.envCv = document.createElement('canvas'); this.envCv.width = ER; this.envCv.height = ER / 2; this.envTex = new THREE.CanvasTexture(this.envCv); this.envTex.mapping = THREE.EquirectangularReflectionMapping; this.envTex.encoding = THREE.sRGBEncoding; }
      const g = this.envCv.getContext('2d'), css = (c) => '#' + c.getHexString(); g.setTransform(ER / 256, 0, 0, ER / 256, 0, 0);
      const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, css(top)); gr.addColorStop(0.48, css(hor)); gr.addColorStop(0.52, css(new THREE.Color(0x4a5a38).multiplyScalar(1 - night * 0.8))); gr.addColorStop(1, css(bot)); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      const u = (Math.atan2(sd.x, -sd.z) / (Math.PI * 2) + 0.5) * 256, v = (1 - (Math.asin(U.clamp(sd.y, -1, 1)) / Math.PI + 0.5)) * 128;
      const sg = g.createRadialGradient(u, v, 0, u, v, 40); const sc = sunC.clone().multiplyScalar(1 - night); sg.addColorStop(0, `rgba(${sc.r * 255 | 0},${sc.g * 255 | 0},${sc.b * 255 | 0},0.9)`); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, 256, 128);
      this.envTex.needsUpdate = true; return this.envTex;
    },
    updateLights(dt, night) {
      this._lT = (this._lT || 99) + dt; const p = this.player.pos, E = this.env;
      if (this._lT > 0.4) {
        this._lT = 0;
        const act = W.lightSrc.filter((L) => (L.ug ? E.ug : !E.ug) && (L.night ? night > 0.35 || (L.room && E.indoor && E.area.zone === 'house' && night > 0.2) : true) && (L.dim ? night > 0.4 : true));
        act.sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2 + (a.z - p.z) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 + (b.z - p.z) ** 2));
        const pick = act.slice(0, this.pool.length);
        // keep already-assigned lights in their slot to avoid popping
        const free = this.pool.filter((pl) => !pick.includes(pl.userData.src));
        for (const L of pick) if (!this.pool.some((pl) => pl.userData.src === L)) { const pl = free.shift(); if (pl) { pl.userData.src = L; pl.intensity = 0; pl.position.set(L.x, L.y, L.z); pl.color.copy(L.color); pl.distance = L.dist; } }
        for (const pl of this.pool) if (!pick.includes(pl.userData.src)) pl.userData.fadeOut = true; else pl.userData.fadeOut = false;
      }
      for (const pl of this.pool) {
        const L = pl.userData.src; if (!L) { pl.intensity = 0; continue; }
        const fl = L.flicker ? 1 + (Math.sin(this.t * 13 + L.x) * 0.5 + Math.sin(this.t * 31 + L.z) * 0.5) * 0.15 * L.flicker : 1;
        const target = pl.userData.fadeOut ? 0 : L.int * fl; pl.intensity = U.damp(pl.intensity, target, 5, dt);
        if (pl.userData.fadeOut && pl.intensity < 0.01) pl.userData.src = null;
      }
    },

    /* ---------------------------------------------------------------- camera */
    cam: { yaw: Math.PI, pitch: 0.35, dist: 2.1, zoom: 2.1, snap: true, idle: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), shakeT: 0 },
    updateCamera(dt) {
      const c = this.cam, cam = this.camera, p = this.player;
      if (this.state === 'title') {
        const t = this.t * 0.05; const tgt = V3(-2.5, 0.25, -17.4);
        const pos = V3(-2.5 + Math.sin(0.7 + Math.sin(t) * 0.25) * 2.4, 0.55 + Math.sin(t * 1.3) * 0.08, -17.4 - Math.cos(0.7 + Math.sin(t) * 0.25) * 2.4);
        cam.position.copy(pos); const wide = U.clamp((cam.aspect - 0.6) / 1.2, 0, 1); cam.lookAt(tgt.x + 0.6 * wide, U.lerp(0.45, 0.9, wide), tgt.z + 2 * wide + 0.3); c.snap = true; return;
      }
      if (this.cine) {
        const ci = this.cine; ci.t += dt;
        if (!ci.soft && ci.t > 0.8 && (I.pressed('jump') || I.pressed('pause')) && this.state === 'play' && !UI.dialogueOpen) { this.cinematicEnd(); }
        else {
          const k = 1 - Math.exp(-2.2 * dt); cam.position.lerp(ci.pos, c.snap ? 1 : k); c.look.lerp(ci.look, c.snap ? 1 : k); cam.lookAt(c.look); c.snap = false;
          if (ci.t > ci.dur) this.cinematicEnd();
          return;
        }
      }
      const sens = G.settings.sens * 0.0035;
      c.yaw -= I.lookX * sens; c.pitch += I.lookY * sens * (G.settings.invertY ? -1 : 1);
      if (I.lookX || I.lookY) c.idle = 0; else c.idle += dt;
      c.zoom = U.clamp(c.zoom + I.wheel * 0.25, 1.1, 4.5);
      c.pitch = U.clamp(c.pitch, -0.25, 1.25);
      // gentle auto-follow when moving
      if (G.settings.autoCam && c.idle > 1.2 && p.speedH > 0.5) c.yaw = U.dampAngle(c.yaw, p.yaw + Math.PI, 0.9, dt);
      // small spaces: pull in close and low
      const small = p.overhead < 0.75 ? 1 : 0, tun = p.inTunnel ? 1 : 0;
      c.smallK = U.damp(c.smallK || 0, Math.max(small, tun), 4, dt);
      let dist = U.lerp(c.zoom, tun ? 1.05 : 0.95, c.smallK);
      let pitch = U.lerp(c.pitch, tun ? 0.18 : 0.06, c.smallK * 0.85);
      c.ahead = c.ahead || V3(); c.ahead.x = U.damp(c.ahead.x, p.vel.x * 0.12, 3, dt); c.ahead.z = U.damp(c.ahead.z, p.vel.z * 0.12, 3, dt);
      const tgt = V3(p.vis.x + (p.inTunnel ? 0 : c.ahead.x), p.vis.y + U.lerp(0.32, 0.18, c.smallK), p.vis.z + (p.inTunnel ? 0 : c.ahead.z));
      const off = V3(Math.sin(c.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(c.yaw) * Math.cos(pitch));
      let want = tgt.clone().addScaledVector(off, dist);
      // collide with walls and furniture
      const t = this.rayBoxes(tgt, want); c.clear = c.clear === undefined ? t : (t < c.clear ? t : U.damp(c.clear, t, 2.5, dt)); if (c.snap) c.clear = t;
      if (c.clear < 1) want = tgt.clone().lerp(want, Math.max(0.05, c.clear - 0.06 / dist));
      const floor = (p.pos.y < UG + 12 ? (p.inTunnel ? p.floorY : UG) : 0) + 0.07; if (want.y < floor) want.y = floor;
      if (p.inTunnel) { const q = this.tunnelClamp(want.x, want.z, 0.36); if (q) { want.x = q.x; want.z = q.z; want.y = U.clamp(want.y, q.y + 0.1, q.y + 0.55); } }
      c.dist = dist;
      if (c.snap) { cam.position.copy(want); c.look.copy(tgt); c.snap = false; }
      else { cam.position.lerp(want, 1 - Math.exp(-14 * dt)); c.look.lerp(tgt, 1 - Math.exp(-18 * dt)); }
      cam.lookAt(c.look);
      if (this.shake > 0 && G.settings.shake) { this.shake -= dt; cam.position.x += (Math.random() - 0.5) * 0.03 * this.shake; cam.position.y += (Math.random() - 0.5) * 0.03 * this.shake; }
      // zoom a touch for story moments
      cam.fov = U.damp(cam.fov, UI.dialogueOpen ? 50 : 58, 3, dt); cam.updateProjectionMatrix();
    },
    /* segment vs collider AABBs, returns fraction of the segment that is clear */
    rayBoxes(a, b) {
      const d = b.clone().sub(a); let tmin = 1;
      const set = this.near(Math.min(a.x, b.x) - 0.5, Math.max(a.x, b.x) + 0.5, Math.min(a.z, b.z) - 0.5, Math.max(a.z, b.z) + 0.5);
      for (const c of set) {
        if (!c.on || !c.cam) continue;
        let t0 = 0, t1 = 1, ok = true;
        for (const [o, dd, lo, hi] of [[a.x, d.x, c.x0 - 0.08, c.x1 + 0.08], [a.y, d.y, c.y0 - 0.05, c.y1 + 0.05], [a.z, d.z, c.z0 - 0.08, c.z1 + 0.08]]) {
          if (Math.abs(dd) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } }
          else { let ta = (lo - o) / dd, tb = (hi - o) / dd; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
        }
        if (ok && t0 > 0 && t0 < tmin) tmin = t0;
      }
      return tmin;
    },
    /* nearest point on any open tunnel within radius r */
    tunnelClamp(x, z, rOverride) {
      let best = null, bd = 1e9;
      for (const T of W.tunnels) {
        if (!T.on) continue; const pts = T.pts;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l2 = dx * dx + dz * dz || 1e-6;
          const tt = U.clamp(((x - a[0]) * dx + (z - a[2]) * dz) / l2, 0, 1), cx = a[0] + dx * tt, cz = a[2] + dz * tt, dd = (x - cx) ** 2 + (z - cz) ** 2;
          const r = rOverride !== undefined ? Math.min(rOverride, T.r) : T.r;
          const excess = Math.sqrt(dd) - r;
          if (excess < bd) { bd = excess; best = { cx, cz, y: a[1] + (b[1] - a[1]) * tt, r, d: Math.sqrt(dd) }; }
        }
      }
      if (!best) return null;
      if (best.d > best.r) { const k = best.r / best.d; return { x: best.cx + (x - best.cx) * k, z: best.cz + (z - best.cz) * k, y: best.y, clamped: true }; }
      return { x, z, y: best.y, clamped: false };
    },

    /* ---------------------------------------------------------------- NPC update */
    updateNPCs(dt) {
      const p = this.player;
      for (const id in this.npcs) {
        const n = this.npcs[id], c = n.c, r = c.root; if (n.hidden) continue;
        const dx = p.pos.x - r.position.x, dz = p.pos.z - r.position.z, d = Math.hypot(dx, dz);
        c.state.moving = false; c.state.lookYaw = undefined;
        // hedgehog shyness
        if (id === 'moss') {
          if (this.S.chapter === 3 && d < 3.4 && p.speedH > 2.3) { n.scared = 3; }
          n.scared = Math.max(0, n.scared - dt);
          c.state.scared = n.scared > 0 || (this.S.chapter === 4 && !this.S.flags.mossTrust && !n.talking);
        }
        const asleep = id === 'bram' && (this.S.chapter === 1 || this.S.chapter === 4 && !this.S.flags.bramAwake);
        if (asleep && Math.random() < dt * 0.6) this.particles.emit({ x: r.position.x + 0.3, y: r.position.y + 0.6, z: r.position.z + 0.3, vx: 0.05, vy: 0.2, vz: 0, life: 2.5, size: 0.08, col: 0xf2e6cf, glow: true, zz: true });
        if (n.talking) { r.rotation.y = U.dampAngle(r.rotation.y, n.talkYaw, 6, dt); }
        else if (n.leaving && n.target) {
          const tx = n.target[0] - r.position.x, tz = n.target[2] - r.position.z, l = Math.hypot(tx, tz);
          if (l > 0.2) { r.position.x += (tx / l) * (n.speed || 0.6) * dt; r.position.z += (tz / l) * (n.speed || 0.6) * dt; r.rotation.y = U.dampAngle(r.rotation.y, Math.atan2(tx, tz), 8, dt); c.state.moving = true; }
        } else if (n.wander && !asleep) {
          n.wait -= dt;
          if (!n.target && n.wait <= 0) { const a = Math.random() * 6.28, rr = Math.random() * n.wander; n.target = [n.anchor[0] + Math.cos(a) * rr, n.anchor[1], n.anchor[2] + Math.sin(a) * rr]; }
          if (n.target) { const tx = n.target[0] - r.position.x, tz = n.target[2] - r.position.z, l = Math.hypot(tx, tz); if (l < 0.08) { n.target = null; n.wait = 1.5 + Math.random() * 4; } else { const sp = id === 'pip' ? 1.3 : 0.5; r.position.x += (tx / l) * sp * dt; r.position.z += (tz / l) * sp * dt; r.rotation.y = U.dampAngle(r.rotation.y, Math.atan2(tx, tz), 7, dt); c.state.moving = true; } }
        } else if (!asleep) { r.rotation.y = U.dampAngle(r.rotation.y, n.yaw0, 2, dt); }
        if (!n.talking && !c.state.moving && d < 3 && !asleep) { c.state.lookYaw = U.clamp(U.angDiff(r.rotation.y, Math.atan2(dx, dz)), -1, 1); }
        c.state.alert = d < 2.5;
        if (id === 'bram') c.state.talk = n.talking && !asleep;
        c.update(dt);
        // keep Milo from walking through NPCs
        const R = NPC_R[id] + 0.12; if (d < R && d > 0.001 && Math.abs(p.pos.y - r.position.y) < 0.5) { p.pos.x = r.position.x + (dx / d) * R; p.pos.z = r.position.z + (dz / d) * R; }
      }
    },

    /* ---------------------------------------------------------------- interaction */
    updateInteract(dt) {
      if (this.state !== 'play') { UI.prompt(null); return; }
      const p = this.player; let best = null, bs = 1e9;
      const cand = (pos, r, label, fn, kind) => {
        const dx = pos[0] - p.pos.x, dz = pos[2] - p.pos.z, dy = pos[1] - p.pos.y; const d = Math.hypot(dx, dz);
        if (d > r || Math.abs(dy) > (kind === 'npc' ? 1.8 : 0.7)) return;
        const f = p.fwd(); const facing = d < 0.2 ? 1 : (f.x * dx + f.z * dz) / d; const score = d - facing * 0.35;
        if (score < bs) { bs = score; best = { label, fn, pos }; }
      };
      if (!UI.dialogueOpen && !this.busy && !p.action) {
        for (const it of G.INTERACT) { if (it.when && !it.when()) continue; const l = typeof it.label === 'function' ? it.label() : it.label; if (!l) continue; cand(it.pos, it.r, l, () => { const an = typeof it.anim === 'function' ? it.anim() : it.anim; if (an) p.act(an, 0.9); it.act(); }); }
        for (const w of this.worldItems) { if (!w.m.visible) continue; const d = w.def; cand(d.pos, 0.55, 'Pick up ' + (w.kind === 'collect' ? d.name : G.ITEMS[d.item].name), () => this.pickUp(w)); }
        for (const id in this.npcs) { const n = this.npcs[id]; if (n.hidden || n.leaving) continue; const r = n.c.root.position; cand([r.x, r.y, r.z], NPC_R[id] + 0.9, 'Talk to ' + NAMES[id], () => this.talk(id), 'npc'); }
      }
      this.focus = best; UI.prompt(best ? best.label : null);
      if (best && I.pressed('interact')) { A.play('ui'); best.fn(); }
    },
    pickUp(w) {
      const d = w.def; this.player.act('interact', 0.6);
      if (w.kind === 'collect') this.giveCollectible(d.id);
      else { this.flag('got_' + d.id); this.give(d.item); if (d.msg) this.say([['milo', '*' + d.msg + '*', 'happy']]); }
      this.particles.burst(V3(d.pos[0], d.pos[1] + 0.05, d.pos[2]), 14, 0xffe08a, 'spark');
      this.refreshItems();
    },
    updateItems(dt) {
      for (const w of this.worldItems) { if (!w.m.visible) continue; const m = w.m; m.userData.spin += dt; m.rotation.y = m.userData.spin * 0.8; m.position.y = m.userData.base + 0.02 + Math.sin(this.t * 2.2 + m.userData.spin) * 0.012; if (Math.random() < dt * 1.2) this.particles.emit({ x: m.position.x + (Math.random() - 0.5) * 0.12, y: m.position.y + 0.05, z: m.position.z + (Math.random() - 0.5) * 0.12, vx: 0, vy: 0.12, vz: 0, life: 0.9, size: 0.035, col: 0xfff0b0, glow: true }); }
      if (this.nookBox.visible && Math.random() < dt) this.particles.emit({ x: -18.9, y: UG + 0.15, z: -4.4, vx: 0, vy: 0.1, vz: 0, life: 1.2, size: 0.04, col: 0xffd070, glow: true });
      // the carried music box
      this.carryBox.visible = this.hasItem('musicbox') && this.state !== 'title';
    },

    /* ---------------------------------------------------------------- story triggers from movement */
    updateTriggers(dt) {
      if (this.state !== 'play' || this.busy || UI.dialogueOpen) return;
      const S = this.S, p = this.player.pos, ar = this.env.area; if (!ar) return;
      // discovery
      if (!S.discovered[ar.id]) { S.discovered[ar.id] = true; if (ar.id !== 'town') UI.location(ar.name, true); }
      else if (this._lastArea !== ar.id) UI.location(ar.name, false);
      this._lastArea = ar.id;
      const st = S.step;
      if (st === 'c2_path' && (ar.id === 'forestedge' || ar.id === 'forest' || ar.id === 'mosslog')) this.startChapter(3);
      if (st === 'c3_trail' && Math.hypot(p.x + 59.2, p.z - 41.2) < 7) { this.setStep('c3_moss'); this.cinematic({ pos: V3(-57.4, 1, 43.4), look: V3(-59.2, 0.15, 41.2), dur: 2.4 }); UI.toast('<b>A shy hedgehog</b>', G.Portrait.character('moss'), 'Walk slowly - running will frighten him.'); }
      if (st === 'c3_creek' && p.x < -82.8) this.setStep('c3_clear');
      if (st === 'c3_clear' && Math.hypot(p.x + 100, p.z - 10) < 9) { this.setStep('c3_sniff'); this.say([['milo', '*Moss’s scent ends here, in the clearing. He said he buried a key by the old stump... Let me use my nose.*', 'think']]); }
      if (st === 'c4_meet' && ar.id === 'shed' && Math.hypot(p.x + 105, p.z + 20.6) < 3) { UI.fade(true, () => { this.startChapter(5); setTimeout(() => UI.fade(false), 400); }); this.busy = true; setTimeout(() => (this.busy = false), 1200); }
      if (st === 'c5_fork' && p.y < UG + 5 && p.x > -30.2 && Math.abs(p.z + 10) < 1.2) this.setStep('c5_roots');
      if (st === 'c5_nook' && Math.hypot(p.x + 18.4, p.z + 4) < 1.6 && p.y < UG + 5) this.talk('moss');
      // the music box calls from the nook in chapter 5
      if (S.chapter === 5 && p.y < UG + 5 && ['c5_fork', 'c5_roots', 'c5_nook'].includes(st)) {
        this._mbT = (this._mbT || 3) - dt;
        if (this._mbT <= 0) { this._mbT = 11; const d = Math.hypot(p.x + 18.4, p.z + 4); A.musicBox({ broken: true, muffled: true, vol: U.clamp(0.1 - d * 0.003, 0.02, 0.09) }); }
      }
    },
  });

  /* ================================================================ PLAYER */
  class Player {
    constructor() {
      this.f = new G.Ferret(); this.pos = V3(0, 0, 0); this.vis = V3(); this.vel = V3(); this.vy = 0; this.yaw = 0; this.grounded = true; this.coyote = 0;
      this.speedH = 0; this.action = null; this.actT = 0; this.overhead = 9; this.inTunnel = false; this.floorY = 0; this.safe = null; this.safeT = 0; this.stepPh = 0; this.idleVoc = 8; this.turn = 0;
    }
    fwd() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
    teleport(x, y, z, yaw) { this.pos.set(x, y, z); this.vis.set(x, y, z); this.vel.set(0, 0, 0); this.vy = 0; this.yaw = yaw || 0; this.safe = this.pos.clone(); this.f.root.position.copy(this.pos); this.f.root.rotation.y = this.yaw; }
    act(name, dur, o = {}) { this.action = name; this.actT = dur; this.lockMove = o.lockMove !== false; }
    dance(d = 2.4) { this.act('dance', d); A.play('dook'); setTimeout(() => A.play('dook', 0.8), 800); }
    happy() { if (!this.action || this.action === 'interact') { setTimeout(() => { if (!this.action) this.dance(1.6); }, 650); } }
    update(dt, control) {
      const g = game, c = g.cam;
      if (this.titleIdle) { this.f.update(dt, { speed: 0, action: null }); return; }
      if (this.action) { this.actT -= dt; if (this.actT <= 0) this.action = null; }
      // input -> desired velocity
      let mx = 0, mz = 0, run = false, mag = 0;
      if (control && !(this.action && this.lockMove)) {
        mx = I.moveX; mz = I.moveY; mag = Math.hypot(mx, mz); run = I.run;
        if (I.pressed('dance') && this.grounded) this.dance();
        if (I.pressed('scent')) g.scent();
      }
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
      let dx = fx * -mz + rx * mx, dz = fz * -mz + rz * mx; const dl = Math.hypot(dx, dz); if (dl > 0) { dx /= dl; dz /= dl; }
      const crawl = this.overhead < 0.42;
      let top = (crawl ? 1.1 : run ? 4.4 : 1.8) * Math.min(1, mag) * (G.speedBoost || 1);
      if (this.auto) { const ax = this.auto.x - this.pos.x, az = this.auto.z - this.pos.z, al = Math.hypot(ax, az); if (al > 0.12) { dx = ax / al; dz = az / al; mag = 1; top = this.auto.speed || 1.8; } else { this.auto = null; } }
      const acc = this.grounded ? 14 : 5;
      this.vel.x = U.damp(this.vel.x, dx * top, acc, dt); this.vel.z = U.damp(this.vel.z, dz * top, acc, dt);
      if (this.action === 'dance') { const s = Math.sin(this.f.t * 5.5); this.vel.x = Math.cos(this.yaw) * s * 0.6; this.vel.z = -Math.sin(this.yaw) * s * 0.6; }
      this.speedH = Math.hypot(this.vel.x, this.vel.z);
      if (mag > 0.1) { const ty = Math.atan2(dx, dz); const before = this.yaw; this.yaw = U.dampAngle(this.yaw, ty, 11, dt); this.turn = U.angDiff(before, this.yaw) / Math.max(dt, 1e-4); } else this.turn = U.damp(this.turn, 0, 8, dt);
      // jump
      if (this.grounded) this.coyote = 0.12; else this.coyote -= dt;
      if (control && !this.action && I.pressed('jump') && this.coyote > 0 && this.overhead > 0.6) { this.vy = 4.6; this.grounded = false; this.coyote = 0; A.play('jump'); if (Math.random() < 0.3) A.play('squeak'); }
      // horizontal move with collision
      const R = 0.13, PH = 0.2;
      const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
      this.pos.x = nx; this.resolve(R, PH, mag > 0.3); this.pos.z = nz; this.resolve(R, PH, mag > 0.3);
      // tunnels
      const ug = this.pos.y < UG + 12;
      const inBase = this.pos.x > -5.95 && this.pos.x < 8 && this.pos.z > -5 && this.pos.z < 5;
      this.inTunnel = ug && !inBase;
      let base = ug ? UG : 0;
      if (this.inTunnel) { const q = g.tunnelClamp(this.pos.x, this.pos.z); if (q) { this.pos.x = q.x; this.pos.z = q.z; base = q.y; this.floorY = q.y; } }
      // ground height from walkable colliders underfoot
      let ground = base, over = 9;
      const set = g.near(this.pos.x - 0.3, this.pos.x + 0.3, this.pos.z - 0.3, this.pos.z + 0.3);
      for (const col of set) {
        if (!col.on) continue;
        const ox = U.clamp(this.pos.x, col.x0, col.x1) - this.pos.x, oz = U.clamp(this.pos.z, col.z0, col.z1) - this.pos.z;
        const inside = ox * ox + oz * oz < (R * 0.6) ** 2;
        if (!inside) continue;
        if (col.walk && col.y1 <= this.pos.y + 0.21 && col.y1 > ground) ground = col.y1;
        if (col.y0 > this.pos.y + 0.05) over = Math.min(over, col.y0 - this.pos.y);
      }
      this.overhead = over;
      // vertical
      if (!this.grounded || this.pos.y > ground + 0.001) {
        this.vy -= 15 * dt; let ny = this.pos.y + this.vy * dt;
        if (this.vy > 0 && ny + PH > this.pos.y + over) { ny = this.pos.y; this.vy = 0; }
        if (ny <= ground) { if (!this.grounded && this.vy < -2.5) A.play('land'); ny = ground; this.vy = 0; this.grounded = true; }
        else if (this.grounded && ny < ground + 0.22 && this.vy <= 0) { ny = ground; this.vy = 0; }
        else this.grounded = false;
        this.pos.y = ny;
      } else { this.pos.y = ground; this.vy = 0; this.grounded = true; }
      // hazards (water): respawn safely with a splash
      if (this.grounded && !ug && this.pos.y < 0.12) {
        const hz = W.hazards.find((h) => (h.type === 'rect' ? this.pos.x > h.x0 && this.pos.x < h.x1 && this.pos.z > h.z0 && this.pos.z < h.z1 : (this.pos.x - h.x) ** 2 + (this.pos.z - h.z) ** 2 < h.r * h.r));
        if (hz) { A.play('splash'); g.particles.burst(V3(this.pos.x, 0.1, this.pos.z), 24, 0xcfe6f0, 'splash'); UI.toast('<b>Splash!</b>', null, 'Brr! Ferrets are not fond of swimming.'); if (this.safe) this.teleport(this.safe.x, this.safe.y, this.safe.z, this.yaw); g.cam.snap = false; this.act('shake', 1.1); return; }
      }
      if (this.pos.y < (ug ? UG - 5 : -5)) { if (this.safe) this.teleport(this.safe.x, this.safe.y, this.safe.z, this.yaw); }
      this.safeT -= dt; if (this.grounded && this.safeT <= 0) { this.safeT = 0.5; this.safe = this.pos.clone(); }
      // visuals
      this.vis.x = this.pos.x; this.vis.z = this.pos.z; this.vis.y = U.damp(this.vis.y, this.pos.y, this.grounded ? 22 : 60, dt);
      const f = this.f; f.root.position.copy(this.vis); f.root.rotation.y = this.yaw;
      f.shadow.position.y = (ground - this.vis.y) / 1.3 + 0.006; f.shadow.visible = true;
      let look; const fo = g.focus; if (fo && this.speedH < 0.3 && !this.action) { look = U.clamp(U.angDiff(this.yaw, Math.atan2(fo.pos[0] - this.pos.x, fo.pos[2] - this.pos.z)), -0.9, 0.9); }
      f.update(dt, { speed: this.speedH, run: this.speedH > 2.3, air: !this.grounded, vy: this.vy, action: this.action || (this.hiding ? 'hide' : null), crawl: crawl || this.overhead < 0.5 || this.action === 'hide', turn: this.turn, look });
      W.playerU.value.copy(this.pos);
      // footsteps follow the leg cycle
      if (this.grounded && this.speedH > 0.2 && !this.action) {
        const ph = Math.floor(f.ph / Math.PI);
        if (ph !== this.stepPh) { this.stepPh = ph; const env = g.env, s = ug ? 'dirt' : W.surfaceAt(this.pos.x, this.pos.y, this.pos.z, env.area); A.play('step-' + (env.wet > 0.5 && !env.indoor && s !== 'wood' ? 'water' : s === 'rug' ? 'rug' : s), this.speedH > 2.3 ? 1 : 0.6); if (this.speedH > 2.3 && s !== 'rug' && !env.indoor && Math.random() < 0.3) g.particles.emit({ x: this.pos.x, y: this.pos.y + 0.02, z: this.pos.z, vx: (Math.random() - 0.5) * 0.4, vy: 0.3, vz: (Math.random() - 0.5) * 0.4, life: 0.5, size: 0.03, col: s === 'grass' ? 0x7a8a4a : 0x9a8060, grav: 3 }); }
      }
      // little vocalisations
      this.idleVoc -= dt; if (this.idleVoc < 0) { this.idleVoc = 12 + Math.random() * 20; if (control && Math.random() < 0.6) A.play(Math.random() < 0.7 ? 'dook' : 'sniff', 0.5); }
    }
    resolve(R, PH, pushing) {
      const g = game, p = this.pos;
      const set = g.near(p.x - R - 0.1, p.x + R + 0.1, p.z - R - 0.1, p.z + R + 0.1);
      for (const c of set) {
        if (!c.on) continue;
        if (!(p.y + PH > c.y0 && p.y + 0.02 < c.y1)) continue;
        const cx = U.clamp(p.x, c.x0, c.x1), cz = U.clamp(p.z, c.z0, c.z1); let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        const rise = c.y1 - p.y;
        if (c.walk && rise <= 0.2 && this.grounded) { p.y = c.y1; continue; } // step up
        if (c.climb && rise <= 0.64 && pushing && this.grounded && this.overhead > rise + 0.2) { this.vy = Math.sqrt(2 * 15 * (rise + 0.1)); this.grounded = false; this.action = null; A.play('jump', 0.5); }
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * R; p.z = cz + (dz / d) * R; }
        else { const l = p.x - c.x0, r = c.x1 - p.x, b = p.z - c.z0, f = c.z1 - p.z, m = Math.min(l, r, b, f); if (m === l) p.x = c.x0 - R; else if (m === r) p.x = c.x1 + R; else if (m === b) p.z = c.z0 - R; else p.z = c.z1 + R; }
      }
    }
  }

  /* scent vision: glowing trail to the current objective + reveals nearby things */
  game.scent = function () {
    if (this.scentCd > 0) { A.play('error'); return; }
    this.scentMax = G.EXT ? G.EXT.scentDuration() : 9; this.scentT = this.scentMax; this.scentCd = 10; A.play('sniff'); this.player.act('sniff', 1.2, { lockMove: false });
    const tgt = UI.objTarget(); this.scentPath = null; this.scentPath2 = null; const p = this.player.pos;
    if (tgt) this.scentPath = W.navPath([p.x, p.y, p.z], tgt);
    const t2 = G.EXT && G.EXT.sideTarget(); if (t2) this.scentPath2 = W.navPath([p.x, p.y, p.z], t2);
    if (G.EXT) G.EXT.onScent();
    UI.scent(true);
  };
  game.scentT = 0; game.scentCd = 0;
  const _upd = game.update;
  game.update = function (dt) {
    _upd.call(this, dt);
    this.scentCd = Math.max(0, this.scentCd - dt);
    if (this.scentT > 0) {
      this.scentT -= dt; if (this.scentT <= 0) UI.scent(false);
      for (const [path, col, n] of [[this.scentPath, 0xffb347, 5], [this.scentPath2, 0x8fe07a, 3]])
      if (path && path.length > 1) {
        for (let k = 0; k < n; k++) {
          // pick a random point along the path, weighted by length
          const i = Math.floor(Math.random() * (path.length - 1)), a = path[i], b = path[i + 1], t = Math.random();
          const x = U.lerp(a[0], b[0], t), y = U.lerp(a[1], b[1], t), z = U.lerp(a[2], b[2], t);
          if ((x - this.player.pos.x) ** 2 + (z - this.player.pos.z) ** 2 > 900) continue;
          this.particles.emit({ x: x + (Math.random() - 0.5) * 0.3, y: y + 0.08 + Math.random() * 0.15, z: z + (Math.random() - 0.5) * 0.3, vx: (b[0] - a[0]) * 0.02, vy: 0.08, vz: (b[2] - a[2]) * 0.02, life: 1.6, size: 0.06, col, glow: true, wander: 0.2 });
        }
        const e = path[path.length - 1]; if (Math.random() < 0.5) this.particles.emit({ x: e[0] + (Math.random() - 0.5) * 0.4, y: e[1] + 0.1, z: e[2] + (Math.random() - 0.5) * 0.4, vx: 0, vy: 0.5, vz: 0, life: 1.2, size: 0.1, col: col === 0xffb347 ? 0xffd27a : 0xbfff9f, glow: true });
      }
      // hidden things glow faintly
      const p = this.player.pos;
      for (const w of this.worldItems) if (w.m.visible && (w.def.pos[0] - p.x) ** 2 + (w.def.pos[2] - p.z) ** 2 < 400 && Math.random() < 0.15) this.particles.emit({ x: w.def.pos[0], y: w.def.pos[1] + 0.1, z: w.def.pos[2], vx: 0, vy: 0.4, vz: 0, life: 1, size: 0.08, col: 0x9fe0ff, glow: true });
      for (const it of G.INTERACT) if ((it.anim === 'dig') && (!it.when || it.when()) && (it.pos[0] - p.x) ** 2 + (it.pos[2] - p.z) ** 2 < 400 && Math.random() < 0.2) this.particles.emit({ x: it.pos[0] + (Math.random() - 0.5) * 0.4, y: it.pos[1] + 0.05, z: it.pos[2] + (Math.random() - 0.5) * 0.4, vx: 0, vy: 0.3, vz: 0, life: 1, size: 0.07, col: 0xc9ff9a, glow: true });
    }
    UI.scentMeter(this.scentT > 0 ? this.scentT / (this.scentMax || 9) : 1 - this.scentCd / 10, this.scentT > 0);
  };

  /* ================================================================ PARTICLES */
  class Particles {
    constructor(scene) {
      this.max = 2200; this.list = []; this.free = []; this.scene = scene;
      const mk = (additive) => {
        const m = new THREE.ShaderMaterial({
          uniforms: { map: { value: G.Tex.get('glow') }, uH: { value: 800 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
          vertexShader: 'attribute float size; attribute vec4 pcol; varying vec4 vC; uniform float uH; void main(){ vC = pcol; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uH / max(-mv.z, 0.05); gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); }',
        });
        const pts = new THREE.Points(this.geo(), m); pts.frustumCulled = false; scene.add(pts); return pts;
      };
      this.glow = mk(true); this.solid = mk(false); this.col = new THREE.Color();
    }
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.max * 3), 3)); g.setAttribute('pcol', new THREE.BufferAttribute(new Float32Array(this.max * 4), 4)); g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(this.max), 1)); return g; }
    /* Particle Quality changes the pool size */
    setMax(n) { if (n === this.max) return; this.max = n; for (const p of [this.glow, this.solid]) { p.geometry.dispose(); p.geometry = this.geo(); } if (this.list.length > n * 2) this.list.length = n * 2; }
    resize(h, cam) { const uH = h / (2 * Math.tan((cam.fov * Math.PI) / 360)); this.glow.material.uniforms.uH.value = uH; this.solid.material.uniforms.uH.value = uH; }
    /* particles are pooled objects: emit copies the options into a recycled record */
    emit(o) {
      if (this.list.length >= this.max * 2 - 4) return;
      const p = this.free.pop() || {};
      p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.life = o.life || 1; p.size = o.size || 0.05; p.col = o.col ?? 0xffffff;
      p.glow = !!o.glow; p.grav = o.grav || 0; p.wander = o.wander || 0; p.blink = !!o.blink; p.note = !!o.note; p.leaf = !!o.leaf; p.zz = !!o.zz; p.alpha = o.alpha ?? 1; p.t = 0;
      this.list.push(p); return p;
    }
    /* ambient effects scale with Particle Quality; gameplay feedback (scent trails, sparks) never does */
    ambient(o) { const m = G.GFX.pMul; if (m < 1 ? Math.random() < m : true) { const p = this.emit(o); if (p && m > 1 && Math.random() < m - 1) { const q = this.emit(o); if (q) { q.x += (Math.random() - 0.5) * 2; q.z += (Math.random() - 0.5) * 2; } } } }
    burst(pos, n, col, kind) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = Math.random();
        if (kind === 'dirt') this.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * (0.5 + s), vy: 1.2 + Math.random() * 1.2, vz: Math.sin(a) * (0.5 + s), life: 0.8, size: 0.035 + Math.random() * 0.03, col, grav: 7 });
        else if (kind === 'splash') this.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * s * 1.2, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * s * 1.2, life: 0.8, size: 0.04, col, grav: 8, glow: true, alpha: 0.7 });
        else if (kind === 'dust') this.emit({ x: pos.x + (Math.random() - 0.5) * 0.4, y: pos.y + Math.random() * 0.3, z: pos.z + (Math.random() - 0.5) * 0.4, vx: Math.cos(a) * 0.2, vy: 0.1 + s * 0.2, vz: Math.sin(a) * 0.2, life: 2, size: 0.08 + s * 0.08, col, alpha: 0.5 });
        else this.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * s * 0.8, vy: 0.4 + Math.random() * 0.9, vz: Math.sin(a) * s * 0.8, life: 1 + Math.random() * 0.5, size: 0.05, col, glow: true, grav: 0.8 });
      }
    }
    update(dt) {
      const G1 = this.glow.geometry.attributes, G2 = this.solid.geometry.attributes; let n1 = 0, n2 = 0; const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i]; p.t += dt;
        if (p.t >= p.life) { L[i] = L[L.length - 1]; L.pop(); this.free.push(p); continue; }
        if (p.grav) p.vy -= p.grav * dt; if (p.wander) { p.vx += (Math.random() - 0.5) * p.wander * dt * 4; p.vz += (Math.random() - 0.5) * p.wander * dt * 4; p.vy += (Math.random() - 0.5) * p.wander * dt * 2; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const k = p.t / p.life; let a = p.alpha * Math.min(1, k * 6) * (1 - k); if (p.blink) a *= 0.5 + 0.5 * Math.sin(p.t * 6 + p.x * 10);
        this.col.set(p.col);
        const A2 = p.glow ? G1 : G2, j = p.glow ? n1++ : n2++; if (j >= this.max) continue;
        A2.position.array[j * 3] = p.x; A2.position.array[j * 3 + 1] = p.y; A2.position.array[j * 3 + 2] = p.z;
        A2.pcol.array[j * 4] = this.col.r; A2.pcol.array[j * 4 + 1] = this.col.g; A2.pcol.array[j * 4 + 2] = this.col.b; A2.pcol.array[j * 4 + 3] = a;
        A2.size.array[j] = p.size * (p.note ? 1 + Math.sin(p.t * 8) * 0.2 : 1);
      }
      for (const [A2, n, pts] of [[G1, n1, this.glow], [G2, n2, this.solid]]) { pts.geometry.setDrawRange(0, Math.min(n, this.max)); A2.position.needsUpdate = A2.pcol.needsUpdate = A2.size.needsUpdate = true; }
    }
  }

  /* ================================================================ UI */
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', '❧', '★'];
  const UI = (G.UI = {
    dialogueOpen: false, panel: null, cardOpen: false, history: [],
    init() {
      // portraits (rendered once)
      this.portraits = {}; for (const id of ['milo', 'pip', 'nora', 'bram', 'tilly', 'moss']) this.portraits[id] = G.Portrait.character(id);
      this.portraits.ellie = ellieP();
      $('#titlePortrait') && ($('#titlePortrait').src = this.portraits.milo);
      // title menu
      $('#btnNew').onclick = () => { A.init(); A.play('ui'); if (game.latestSlot()) this.confirm('Start a new adventure? Your saves stay in their slots until the autosave is replaced.', () => game.newGame()); else game.newGame(); };
      $('#btnContinue').onclick = () => { A.init(); A.play('ui'); const l = game.latestSlot(); if (l) game.load(l.d); };
      $('#btnLoad').onclick = () => { A.init(); A.play('ui-open'); this.menu('saves', true); };
      $('#btnSettings').onclick = () => { A.init(); A.play('ui-open'); this.menu('settings', true); };
      $('#btnControls').onclick = () => { A.init(); A.play('ui-open'); this.menu('controls', true); };
      this.refreshTitle();
      // menu tabs
      $$('#menu [data-tab]').forEach((b) => (b.onclick = () => { A.play('ui'); this.menu(b.dataset.tab, this.fromTitle); }));
      $('#menuClose').onclick = () => this.closeAll();
      $('#pauseResume').onclick = () => this.closeAll();
      $('#pauseTitle').onclick = () => this.confirm('Return to the title screen? Progress since your last save will be lost, though the game autosaves often.', () => { this.closeAll(); this.fade(true, () => { game.cinematicEnd(); UI.dialogueClose(); game.titleScreen(); this.refreshTitle(); }); });
      document.addEventListener('pointerdown', () => A.init(), { once: true });
      this.bindSettings();
      $('#dlgBox').addEventListener('click', (e) => { if (e.target.closest('.choice')) return; this.dlgAdvance(); });
      $('#chapterCard').addEventListener('click', () => this.chapterCardSkip());
      this.fade(false);
      setTimeout(() => $('#loading').classList.add('done'), 100);
    },
    refreshTitle() { const l = game.latestSlot(); $('#btnContinue').disabled = !l; $('#btnContinue').querySelector('small').textContent = l ? `${CHAPTERS[l.d.chapter][0]} · ${fmtTime(l.d.playTime)}` : 'No saved game yet'; $('#btnLoad').disabled = !l; },
    title(on) { $('#title').hidden = !on; if (on) { this.refreshTitle(); game.state = 'title'; } },
    showHUD(on) { $('#hud').classList.toggle('off', !on); $('#touch').classList.toggle('off', !on); },
    fade(on, cb) { const f = $('#fade'); f.classList.toggle('on', on); if (cb) setTimeout(cb, on ? 650 : 0); },
    letterbox(on) { $('#letterbox').classList.toggle('on', on); },
    hint() { this.toast('<b>Controls</b>', null, I.lastDevice === 'touch' ? 'Drag left to move, right to look. Tap the paw to interact.' : 'WASD to move, Shift to run, mouse-drag to look, E to interact, Q to sniff.'); },
    /* ---- HUD */
    updateObjective(flash) {
      const S = game.S, step = G.STEPS[S.step]; const el = $('#objective');
      if (!step || game.state === 'title') { el.hidden = true; return; }
      el.hidden = false; el.querySelector('.ch').textContent = ROMAN[S.chapter] || '';
      let txt = step.text;
      if (S.step === 'c2_shiny') txt += ` (${['bottlecap', 'foil', 'marble'].filter((k) => game.hasItem(k)).length}/3)`;
      el.querySelector('.txt').textContent = txt;
      const sub = el.querySelector('.sub'); sub.innerHTML = '';
      if (S.step === 'c4_tasks') { const d = { tinykey: game.hasItem('tinykey') || !!S.flags.usedTinyKey, gear: !!S.flags.gotGear, moss: !!S.flags.mossTrust }; for (const k in G.C4_TASKS) { const s = document.createElement('span'); s.className = d[k] ? 'done' : ''; s.textContent = G.C4_TASKS[k]; sub.appendChild(s); } }
      if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    },
    objTarget() { const step = G.STEPS[game.S.step]; if (!step || !step.target) return null; return typeof step.target === 'function' ? step.target() : step.target; },
    prompt(label) {
      const el = $('#prompt'), tb = $('#tInteract'); if (tb) tb.classList.toggle('ready', !!label || this.dialogueOpen);
      if (!label) { el.classList.remove('on'); return; }
      el.classList.add('on'); el.querySelector('span').textContent = label; el.querySelector('kbd').textContent = I.lastDevice === 'pad' ? 'X' : I.lastDevice === 'touch' ? 'Tap' : 'E';
    },
    location(name, isNew) {
      const el = $('#location'); el.querySelector('.n').textContent = name; el.querySelector('.d').textContent = isNew ? 'Discovered' : ''; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      clearTimeout(this._locT); this._locT = setTimeout(() => el.classList.remove('on'), 3200);
      if (isNew) A.play('secret');
    },
    toast(title, img, sub) {
      const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `${img ? `<img src="${img}" alt="">` : '<i class="dot"></i>'}<div><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
      $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
      while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    },
    saveBlip() { const b = $('#saveBlip'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); },
    scent(on) { $('#scentVeil').classList.toggle('on', on); },
    scentMeter(k, active) { const r = $('#scentRing'); if (!r) return; r.style.strokeDashoffset = String(113 * (1 - U.clamp(k, 0, 1))); $('#scent').classList.toggle('active', active); $('#scent').classList.toggle('ready', !active && k >= 1); },
    update(dt) {
      if (this.typing) { this.typeT += dt * 48 * G.settings.textSpeed; const n = Math.floor(this.typeT); if (n !== this.typed) { this.typed = Math.min(n, this.fullText.length); this.textEl.textContent = this.fullText.slice(0, this.typed); if (this.typed % 3 === 0) A.play('type', 0.6); if (this.typed >= this.fullText.length) this.typeDone(); } }
    },
    /* ---- chapter title cards */
    chapterCard(n) {
      const c = CHAPTERS[n]; const el = $('#chapterCard'); el.querySelector('.num').textContent = c[0]; el.querySelector('.title').textContent = c[1]; el.querySelector('.rn').textContent = ROMAN[n];
      el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); this.cardOpen = true; A.play('chapter');
      clearTimeout(this._cardT); this._cardT = setTimeout(() => this.chapterCardSkip(), 4200);
    },
    chapterCardSkip() { const el = $('#chapterCard'); el.classList.remove('show'); this.cardOpen = false; setTimeout(() => { if (!this.cardOpen) el.hidden = true; }, 600); },
    /* ---- dialogue */
    dialogue(lines, done) {
      this.queue = lines.slice(); this.dlgDone = done; this.dialogueOpen = true; document.body.classList.add('talking'); $('#dialogue').hidden = false; $('#dialogue').classList.add('on');
      this.textEl = $('#dlgText'); this.next();
    },
    next() {
      if (!this.queue.length) { this.dialogueClose(); const d = this.dlgDone; this.dlgDone = null; d && d(); return; }
      const L = this.queue.shift();
      if (L.do) { L.do(); this.next(); return; }
      if (L.choice) { this.showChoices(L.choice); return; }
      let [who, text, expr] = L;
      $('#dlgChoices').innerHTML = ''; $('#dialogue').className = 'on who-' + who + ' expr-' + (expr || 'neutral');
      $('#dlgName').textContent = NAMES[who] || who; $('#dlgPortrait').src = this.portraits[who] || '';
      $('#dlgExpr').textContent = { happy: '♪', surprised: '!', think: '…', sad: '••', shy: '~', smug: '★', sleepy: 'z' }[expr] || '';
      const npc = game.npcs[who]; if (npc && expr) npc.c.setEmote(expr);
      text = who === 'milo' ? text.replace(/^\*|\*$/g, '') : text;
      this.fullText = text; this.typed = 0; this.typeT = 0; this.typing = true; this.textEl.textContent = '';
      this.history.push({ who, text }); if (this.history.length > 200) this.history.shift();
    },
    typeDone() { this.typing = false; this.textEl.textContent = this.fullText; },
    dlgAdvance() { if (this.choosing) return; if (this.typing) { this.typeDone(); return; } A.play('ui', 0.5); this.next(); },
    showChoices(opts) {
      this.choosing = true; this.typing = false; const box = $('#dlgChoices'); box.innerHTML = ''; this.choiceIdx = 0;
      $('#dialogue').className = 'on who-milo choosing'; $('#dlgName').textContent = 'Milo'; $('#dlgPortrait').src = this.portraits.milo; $('#dlgExpr').textContent = '?'; this.textEl.textContent = '';
      opts.forEach((o, i) => { const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `<kbd>${i + 1}</kbd>${o.t}`; b.onclick = () => this.pick(o); box.appendChild(b); });
      this.choiceOpts = opts; this.hlChoice();
    },
    hlChoice() { $$('#dlgChoices .choice').forEach((b, i) => b.classList.toggle('hl', i === this.choiceIdx)); },
    pick(o) {
      A.play('ui'); this.choosing = false; if (o.set) Object.assign(game.S.choices, o.set); this.history.push({ who: 'milo', text: '→ ' + o.t });
      this.queue = (o.then || []).concat(this.queue); $('#dlgChoices').innerHTML = ''; this.next();
    },
    dialogueInput() {
      if (this.choosing) {
        const n = this.choiceOpts.length;
        if (I.pressed('up')) { this.choiceIdx = (this.choiceIdx + n - 1) % n; this.hlChoice(); A.play('ui', 0.5); }
        if (I.pressed('down')) { this.choiceIdx = (this.choiceIdx + 1) % n; this.hlChoice(); A.play('ui', 0.5); }
        for (let i = 0; i < n; i++) if (I.pressed('n' + (i + 1))) { this.pick(this.choiceOpts[i]); return; }
        if (I.pressed('confirm')) this.pick(this.choiceOpts[this.choiceIdx]);
        return;
      }
      if (I.pressed('confirm')) this.dlgAdvance();
    },
    dialogueClose() { this.dialogueOpen = false; document.body.classList.remove('talking'); this.choosing = false; this.typing = false; $('#dialogue').classList.remove('on'); setTimeout(() => { if (!this.dialogueOpen) $('#dialogue').hidden = true; }, 250); },
    /* ---- inline confirm (the viewer can't show browser dialogs) */
    confirm(msg, yes) {
      const el = $('#confirm'); el.querySelector('p').textContent = msg; el.hidden = false;
      el.querySelector('.yes').onclick = () => { el.hidden = true; A.play('ui'); yes(); }; el.querySelector('.no').onclick = () => { el.hidden = true; A.play('ui-close'); };
      el.querySelector('.yes').focus();
    },
    /* ---- menus */
    menu(tab, fromTitle) {
      this.fromTitle = !!fromTitle;
      if (!fromTitle) { if (game.state !== 'play' && game.state !== 'menu') return; game.state = 'menu'; }
      I.unlock();
      const m = $('#menu'); m.hidden = false; m.classList.toggle('fromTitle', !!fromTitle); this.panel = tab; A.play('ui-open');
      $$('#menu [data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
      $$('#menu .panel').forEach((p) => (p.hidden = p.dataset.panel !== tab));
      $('#menuTitle').textContent = { pause: 'Paused', inventory: 'Satchel', collection: 'Collection', map: 'Map', saves: 'Save & Load', settings: 'Settings', controls: 'Controls', history: 'Conversation Log', quests: 'Quests & Clues', graphics: 'Graphics' }[tab];
      if (tab === 'settings') { const P = G.GFX.PORDER.find(([k]) => k === G.GFX.presetOf(G.GFX.cfg)); $('#gfxSummary').textContent = 'Preset: ' + (P ? P[1] : 'Custom') + ' · ' + G.GFX.estimate(G.GFX.cfg).label; }
      if (tab === 'pause') this.renderPause();
      if (tab === 'inventory') this.renderInv();
      if (tab === 'collection') this.renderCollection();
      if (tab === 'map') this.renderMap();
      if (tab === 'saves') this.renderSaves();
      if (tab === 'history') this.renderHistory();
      if (G.EXT && G.EXT.panels[tab]) G.EXT.panels[tab]();
    },
    closeAll() { $('#menu').hidden = true; this.panel = null; if (game.state === 'menu') game.state = 'play'; A.play('ui-close'); if (this.fromTitle) this.refreshTitle(); this.fromTitle = false; },
    renderPause() {
      const S = game.S; $('#pauseChapter').textContent = `${CHAPTERS[S.chapter][0]} — ${CHAPTERS[S.chapter][1]}`; $('#pauseObj').textContent = G.STEPS[S.step] ? G.STEPS[S.step].text : '';
      const st = game.stats(); $('#pauseStats').textContent = `Collectibles ${st.total}/${st.of} · Tilly sightings ${st.tilly}/6 · Played ${fmtTime(S.playTime)}`;
    },
    renderInv() {
      const S = game.S, grid = $('#invGrid'); grid.innerHTML = '';
      const ids = Object.keys(S.inv).filter((k) => S.inv[k] > 0 && G.ITEMS[k]);
      if (!ids.length) grid.innerHTML = '<p class="empty">Milo’s satchel is empty. Well, apart from some crumbs.</p>';
      ids.forEach((id, i) => {
        const it = G.ITEMS[id]; const b = document.createElement('button'); b.className = 'slot';
        b.innerHTML = `<img src="${G.Portrait.item(id === 'photo' ? 'photo1' : id)}" alt=""><span>${it.name}</span>${it.stack ? `<em>×${S.inv[id]}</em>` : ''}`;
        b.onclick = () => { $$('#invGrid .slot').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); this.invDetail(id); A.play('ui', 0.6); };
        grid.appendChild(b); if (i === 0) { b.classList.add('sel'); this.invDetail(id); }
      });
      if (!ids.length) $('#invDetail').innerHTML = '';
    },
    invDetail(id) {
      const it = G.ITEMS[id], d = $('#invDetail');
      d.innerHTML = `<img src="${G.Portrait.item(id === 'photo' ? 'photo1' : id)}" alt=""><h3>${it.name}</h3><p>${it.desc}</p>`;
      if (id === 'treat') { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Eat a treat'; b.onclick = () => { game.take('treat'); this.closeAll(); game.player.act('eat', 1.4); A.play('eat'); setTimeout(() => game.player.dance(2), 1500); }; d.appendChild(b); }
      if (id === 'note') { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Hum the tune'; b.onclick = () => A.musicBox({ vol: 0.06, beat: 0.4 }); d.appendChild(b); }
    },
    renderCollection() {
      const S = game.S, box = $('#colGrid'); box.innerHTML = '';
      for (const cat in G.CATS) {
        const items = G.COLLECT.filter((c) => c.cat === cat), got = items.filter((c) => S.collected[c.id]).length;
        const sec = document.createElement('section'); sec.innerHTML = `<header><h3>${G.CATS[cat]}</h3><span>${got}/${items.length}</span><i style="--k:${got / items.length}"></i></header>`;
        const row = document.createElement('div'); row.className = 'crow';
        for (const c of items) { const s = document.createElement('div'); s.className = 'cslot' + (S.collected[c.id] ? ' got' : ''); s.innerHTML = S.collected[c.id] ? `<img src="${G.Portrait.item(c.model)}" alt=""><b>${c.name}</b><small>${c.desc}</small>` : '<span class="q">?</span><b>Not found yet</b>'; row.appendChild(s); }
        sec.appendChild(row); box.appendChild(sec);
      }
      const t = Object.keys(S.tilly).length; const sec = document.createElement('section'); sec.innerHTML = `<header><h3>Tilly Sightings</h3><span>${t}/6</span><i style="--k:${t / 6}"></i></header><p class="note">Tilly turns up somewhere new in every chapter. Say hello whenever you spot her.</p>`; box.appendChild(sec);
    },
    renderHistory() { const h = $('#histList'); h.innerHTML = this.history.length ? this.history.map((l) => `<p class="${l.who}"><b>${NAMES[l.who] || l.who}</b>${esc(l.text)}</p>`).join('') : '<p class="empty">No conversations yet.</p>'; h.scrollTop = h.scrollHeight; },
    renderSaves() {
      const box = $('#saveList'); box.innerHTML = ''; const inGame = !this.fromTitle;
      for (const s of ['auto', '1', '2', '3']) {
        const d = game.readSlot(s); const row = document.createElement('div'); row.className = 'saverow';
        const name = s === 'auto' ? 'Autosave' : 'Slot ' + s;
        row.innerHTML = `<div class="info"><b>${name}</b>${d ? `<span>${CHAPTERS[d.chapter][0]}: ${CHAPTERS[d.chapter][1]}</span><small>${G.STEPS[d.step] ? G.STEPS[d.step].text : ''}</small><small>${fmtTime(d.playTime)} played · ${new Date(d.saved).toLocaleString()}</small>` : '<span class="emptytxt">Empty</span>'}</div><div class="acts"></div>`;
        const acts = row.querySelector('.acts');
        if (inGame && s !== 'auto') { const b = btn('Save', () => { const go = () => { const ok = game.save(s); A.play('save'); this.toast(ok ? '<b>Game saved</b>' : '<b>Saved for this session</b>', null, ok ? name : 'This browser is blocking storage, so the save lasts until you close the page.'); this.renderSaves(); }; if (d) this.confirm(`Overwrite ${name}?`, go); else go(); }); acts.appendChild(b); }
        if (d) { acts.appendChild(btn('Load', () => { const go = () => { this.closeAll(); game.load(d); }; if (inGame) this.confirm('Load this save? Unsaved progress will be lost.', go); else go(); })); acts.appendChild(btn('Delete', () => this.confirm(`Delete ${name}? This can’t be undone.`, () => { U.storage.del(SAVE_KEY + s); this.renderSaves(); this.refreshTitle(); }), 'ghost')); }
        box.appendChild(row);
      }
      $('#resetAll').onclick = () => this.confirm('Reset all saves and settings? This removes every slot.', () => { for (const s of ['auto', '1', '2', '3']) U.storage.del(SAVE_KEY + s); U.storage.del(SET_KEY); this.renderSaves(); this.refreshTitle(); this.toast('<b>All saves reset</b>'); });
    },
    bindSettings() {
      const S = G.settings;
      const bindR = (id, key) => { const el = $('#' + id); el.value = S[key]; el.oninput = () => { S[key] = parseFloat(el.value); saveSettings(); }; };
      const bindC = (id, key, fn) => { const el = $('#' + id); el.checked = !!S[key]; el.onchange = () => { S[key] = el.checked; saveSettings(); fn && fn(); }; };
      const bindS = (id, key, fn) => { const el = $('#' + id); el.value = S[key]; el.onchange = () => { S[key] = el.value; saveSettings(); fn && fn(); }; };
      bindR('setMusic', 'music'); bindR('setSfx', 'sfx'); bindR('setAmb', 'amb'); bindR('setSens', 'sens'); bindR('setText', 'textSpeed');
      bindC('setMuteMusic', 'muteMusic'); bindC('setMuteSfx', 'muteSfx'); bindC('setInvert', 'invertY'); bindC('setTime', 'timeFlow'); bindC('setLock', 'pointerLock'); bindC('setShake', 'shake'); bindC('setAutoCam', 'autoCam');
      $('#openGfx').onclick = () => { A.play('ui'); this.menu('graphics', this.fromTitle); };
      bindS('setWeather', 'weather');
    },
    /* ---- map */
    renderMap() {
      const cv = $('#mapCv'), g = cv.getContext('2d'), S = game.S, W2 = cv.width, H2 = cv.height; const ug = game.player.pos.y < UG + 12 && game.state !== 'title';
      const view = this.mapView || (ug ? 'under' : 'world'); this.mapView = view;
      $$('#mapTabs button').forEach((b) => { b.classList.toggle('sel', b.dataset.v === view); b.onclick = () => { this.mapView = b.dataset.v; this.renderMap(); }; });
      const bx = view === 'world' ? [-142, 94, -72, 82] : [-42, 10, -18, 6];
      const sc = Math.min(W2 / (bx[1] - bx[0]), H2 / (bx[3] - bx[2])); const ox = (W2 - (bx[1] - bx[0]) * sc) / 2, oz = (H2 - (bx[3] - bx[2]) * sc) / 2;
      const X = (x) => ox + (x - bx[0]) * sc, Z = (z) => oz + (z - bx[2]) * sc;
      g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, W2, H2);
      const r = U.rng(3); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,90,50,${r() * 0.06})`; g.fillRect(r() * W2, r() * H2, 2, 2); }
      const fill = { house: '#c9a27a', town: '#b8c98f', forest: '#7f9a64', under: '#a08466' };
      const areas = W.areas.filter((a) => (view === 'under' ? a.ug : !a.ug) && a.id !== 'town');
      const noLabel = new Set(['forest', 'sidepath', 'hiddenpath']);
      if (view === 'world') { g.fillStyle = 'rgba(184,201,143,.35)'; g.fillRect(X(-50), Z(-30), (140) * sc, 94 * sc); g.fillStyle = 'rgba(127,154,100,.35)'; g.fillRect(X(-140), Z(-70), 90 * sc, 150 * sc); }
      for (const a of areas.slice().reverse()) {
        const known = S.discovered[a.id]; g.fillStyle = known ? fill[a.zone] || '#b8c98f' : 'rgba(90,70,50,.10)';
        if (!known) { g.save(); g.setLineDash([3, 4]); g.strokeStyle = 'rgba(90,70,50,.25)'; g.strokeRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc); g.restore(); continue; }
        g.fillRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc); g.strokeStyle = 'rgba(60,40,25,.45)'; g.lineWidth = 1; g.strokeRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc);
      }
      if (view === 'world') {
        if (S.discovered.street) { g.fillStyle = '#8a8378'; g.fillRect(X(-50), Z(16), 140 * sc, 8 * sc); }
        if (S.discovered.forest || S.discovered.forestedge) { g.strokeStyle = '#8a6b48'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); W.trail.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); g.setLineDash([]); g.strokeStyle = '#5f8fb0'; g.lineWidth = 4 * sc / 2; g.beginPath(); g.moveTo(X(-80), Z(-70)); g.lineTo(X(-80), Z(80)); g.stroke(); }
        if (S.discovered.pond) { g.fillStyle = '#7fa8c0'; g.beginPath(); g.arc(X(-10), Z(50), 5.3 * sc, 0, 7); g.fill(); }
      } else {
        g.strokeStyle = '#6b4b31'; g.lineWidth = 0.55 * sc; g.lineCap = 'round';
        for (const T of W.tunnels) { const known = T.pts.some(([x, y, z]) => { const a = W.areaAt(x, y, z); return S.discovered[a.id]; }); if (!known) continue; g.beginPath(); T.pts.forEach(([x, , z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); }
      }
      // labels
      g.font = '600 13px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'center';
      for (const a of areas) { if (!S.discovered[a.id] || noLabel.has(a.id)) continue; const w = (a.x1 - a.x0) * sc; if (w < 40 && a.id !== 'cave' && a.id !== 'shed' && a.id !== 'mosslog') continue; g.fillStyle = '#2a1d15'; g.fillText(a.name, X((a.x0 + a.x1) / 2), Z((a.z0 + a.z1) / 2) + 4); }
      // objective + player
      const t = this.objTarget(); if (t && (view === 'under') === (t[1] < UG + 12)) { star(g, X(t[0]), Z(t[2]), 9, '#d9573b'); }
      if ((view === 'under') === ug || game.state === 'title') { const p = game.player; g.save(); g.translate(X(p.pos.x), Z(p.pos.z)); g.rotate(-p.yaw + Math.PI); g.fillStyle = '#2d3a55'; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.strokeStyle = '#f2e6cf'; g.lineWidth = 2; g.stroke(); g.restore(); }
      // fast travel list
      const ft = $('#mapTravel'); ft.innerHTML = '';
      const can = S.flags.fastTravel && !game.hasItem('musicbox') && S.chapter !== 5 && !this.fromTitle;
      const spots = [['bedroom', 'Milo’s Basket', [-3, 0, -3.9], 3.14], ['backyard', 'Backyard', [3, 0, -15], 3.14], ['street', 'Maple Street', [5, 0, 18], 0], ['park', 'Willow Park', [2, 0, 32], 0], ['forestedge', 'Forest Edge', [-54, 0, 49.5], -1.57], ['clearing', 'The Clearing', [-99, 0, 12], 3.14], ['shed', 'Arlo’s Workshop', [-107, 0, -13.2], 3.14]];
      const h = document.createElement('p'); h.className = 'note'; h.textContent = can ? 'Nora’s burrows connect these places:' : S.chapter === 5 ? 'No shortcuts tonight: the music box has to go through the tunnels.' : 'Meet Nora in Willow Park to unlock her burrow shortcuts.'; ft.appendChild(h);
      if (can) for (const [aid, name, pos, yaw] of spots) { if (!S.discovered[aid]) continue; ft.appendChild(btn(name, () => { this.closeAll(); game.travel(pos, yaw); }, 'ghost')); }
    },
    /* ---- clue board (chapter 4 puzzle) */
    openClues() {
      game.busy = true; game.state = 'menu'; I.unlock();
      const Q = [
        { q: 'Who dug the old tunnels?', ev: ['photo', 'ribbon'], a: ['Moss the hedgehog', 'Juniper, Arlo’s ferret', 'Pip the squirrel'], c: 1, why: 'The ribbon in the tunnel matches the one Juniper wears in the photograph.' },
        { q: 'What has been making the noise under the house?', ev: ['note', 'journal'], a: ['The old boiler', 'Tilly, sneaking about', 'Arlo’s music box for Ellie'], c: 2, why: 'Clink, clink, and a little song: Ellie’s tune, from the music box Arlo built.' },
        { q: 'Who has been moving it through the tunnels at night?', ev: ['ribbon', 'key'], a: ['Moss, the shy hedgehog', 'Bram, the old dog', 'Juniper'], c: 0, why: 'The fresh tunnels smell of hedgehog, and Moss knew about a "singing box".' },
        { q: 'What does the music box need to play properly again?', ev: ['journal', 'photo'], a: ['A new coat of paint', 'Its winding key and a brass gear', 'A battery'], c: 1, why: 'Arlo’s journal: Juniper kept stealing the winding key, and the brass gear needs replacing.' },
      ];
      let i = 0; const el = $('#clues'); el.hidden = false; A.play('paper');
      const render = () => {
        const q = Q[i];
        el.querySelector('.cq').innerHTML = `<small>Clue ${i + 1} of ${Q.length}</small>${q.q}`;
        el.querySelector('.cev').innerHTML = q.ev.map((id) => `<figure><img src="${G.Portrait.item(id === 'photo' ? 'photo1' : id)}" alt=""><figcaption>${G.ITEMS[id].name}</figcaption></figure>`).join('');
        const ans = el.querySelector('.cans'); ans.innerHTML = ''; el.querySelector('.cwhy').textContent = '';
        q.a.forEach((t, k) => { const b = document.createElement('button'); b.className = 'pin'; b.innerHTML = `<kbd>${k + 1}</kbd>${t}`; b.onclick = () => {
          if (k === q.c) { b.classList.add('right'); A.play('secret'); el.querySelector('.cwhy').textContent = q.why; ans.querySelectorAll('button').forEach((x) => (x.disabled = true)); setTimeout(() => { i++; if (i < Q.length) render(); else finish(); }, 1900); }
          else { b.classList.add('wrong'); b.disabled = true; A.play('error'); el.querySelector('.cwhy').textContent = 'Hmm. That doesn’t quite fit the clues.'; }
        }; ans.appendChild(b); });
      };
      const finish = () => {
        el.hidden = true; game.state = 'play'; game.busy = false; A.play('quest');
        game.say([['milo', '*Juniper dug the tunnels. Arlo made the music box for Ellie. Moss has been carrying it home through the tunnels, a little every night!*', 'surprised'], ['milo', '*To fix it I need the winding key (the tiny brass key in the kitchen drawer!), a brass gear, and Moss has to trust me enough to show me where it is.*', 'think']], () => game.setStep('c4_tasks'));
      };
      el.querySelector('.cclose').onclick = () => { el.hidden = true; game.state = 'play'; game.busy = false; };
      render();
    },
    /* ---- ending */
    ending(st) {
      const el = $('#ending'); el.hidden = false; game.state = 'cutscene';
      el.querySelector('.estats').innerHTML = Object.entries(st.cats).map(([k, [a, b]]) => `<li><span>${G.CATS[k]}</span><b>${a}/${b}</b></li>`).join('') + `<li><span>Tilly sightings</span><b>${st.tilly}/6</b></li><li><span>Time played</span><b>${fmtTime(st.time)}</b></li>`;
      $('#endRoam').onclick = () => { el.hidden = true; game.freeRoam(); };
      $('#endTitle').onclick = () => { el.hidden = true; game.S.chapter = 6; game.S.step = 'end'; game.state = 'play'; game.save('auto'); this.fade(true, () => { game.cinematicEnd(); game.titleScreen(); this.refreshTitle(); }); };
      A.play('chapter');
    },
  });

  function btn(t, fn, cls) { const b = document.createElement('button'); b.className = 'btn small ' + (cls || ''); b.textContent = t; b.onclick = () => { A.play('ui'); fn(); }; return b; }
  function esc(s) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function fmtTime(s) { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`; }
  function star(g, x, y, r, col) { g.save(); g.translate(x, y); g.fillStyle = col; g.strokeStyle = '#f2e6cf'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.restore(); }
  function ellieP() {
    const g = new THREE.Group(); const skin = G.Mat.std('skin', {}), hair = G.Mat.std('hair', {});
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), skin); g.add(h);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), hair); hr.position.set(0, 0.04, -0.03); hr.scale.set(1, 0.95, 1); g.add(hr);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), G.Mat.color(0x2a1a10, 0.3)); e.position.set(sx * 0.05, 0, 0.13); g.add(e); const pg = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), hair); pg.scale.set(1, 1.6, 1); pg.position.set(sx * 0.13, -0.07, -0.02); g.add(pg); }
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), G.Mat.std('pj', {})); body.scale.set(1.1, 1, 0.8); body.position.y = -0.3; g.add(body);
    return G.Portrait.shot('ellie', g, V3(0.12, 0.02, 0.62), V3(0, -0.04, 0));
  }

  addEventListener('load', () => {
    if (!window.THREE) { $('#loading .msg').textContent = 'Three.js could not be loaded. Check your connection and reload.'; return; }
    try { game.init(); } catch (e) { console.error(e); $('#loading .msg').textContent = 'Something went wrong while building the world: ' + e.message; }
  });
})();
