/* =====================================================================
   world-town.js - the neighbourhood grows up.
   Five new lazily-built regions hang off the streets Milo already knows:
   Birch Lane (through the south arch of Willow Park), the Town Square,
   the Allotments, the School and the Canal, plus a crawl tunnel east to
   Gus's gas station.
   Everything here is additive: new regions, new animals, new humans, new
   collectibles. Nothing in the old files is replaced, only chained onto
   through G.EXT and the small registries (G.INTERACT, G.COLLECT, NPC).
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, EXT = G.EXT, R = G.Regions, NPC = G.NPC, SQ = G.SQ;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const has = (k) => !!(G.game && G.game.S.flags[k]);
  const flag = (k, v = true) => game().flag(k, v);
  const ch = () => (G.game ? G.game.S.chapter : 0);

  /* Town content is open from the epilogue onwards: chapter 6 (the epilogue),
     every sequel chapter, and Free Explore. During the first five chapters
     Milo has a music box to worry about, so the new streets stay shut. */
  const townOpen = () => { const c = ch(); return c === 6 || c >= 10; };
  const T = (G.Town = { open: townOpen, regions: {} });

  /* ================================================================ NEW ANIMALS
     Derived from the parametric kinds in cast.js. Each one reuses an
     existing body plan and then swaps or adds the parts that make it
     recognisable, so no old model code has to change. */
  const B = G.BeastKinds, P = G.BeastParts;
  if (B && P) {
    const { ball, eyes, fur, col } = P;
    /* a house cat: the marten body plan with a rounder head and pointed ears */
    B.cat = (o = {}) => {
      const r = B.marten(Object.assign({ color: o.color || 0x6a6a72 }, o));
      const f = fur(o.color || 0x6a6a72, 'ct');
      for (const e of r.ears) { e.parent.remove(e); }
      r.ears.length = 0;
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.062, 4), f);
        ear.position.set(s * 0.046, 0.062, -0.004); ear.rotation.set(0, Math.PI / 4, -s * 0.22); ear.castShadow = true;
        r.head.add(ear); r.ears.push(ear);
      }
      if (o.bib) { const b = ball(fur(o.bib, 'ctb'), 0.062, 0.85, 0.85, 0.9); b.position.set(0, 0.12, 0.17); r.body.add(b); }
      for (const ey of r.eyes) { const b = ey.userData && ey.userData.ball; if (b) b.scale.x = 0.014; }
      r.cat = true; return r;
    };
    /* a dog: a bigger, blockier marten with floppy ears and a waggier tail */
    B.dog = (o = {}) => {
      const r = B.marten(Object.assign({ color: o.color || 0xc9a06a }, o));
      const f = fur(o.color || 0xc9a06a, 'dg');
      for (const e of r.ears) e.parent.remove(e);
      r.ears.length = 0;
      for (const s of [-1, 1]) {
        const ear = ball(fur(o.earColor || 0x8a6a42, 'dge'), 0.034, 0.5, 1.5, 0.9);
        ear.position.set(s * 0.058, 0.03, -0.01); r.head.add(ear); r.ears.push(ear);
      }
      const mz = ball(fur(o.muzzle || 0xe8dcc4, 'dgm'), 0.038, 1, 0.8, 1.3); mz.position.set(0, -0.02, 0.07); r.head.add(mz);
      r.h = 0.44; return r;
    };
    /* a duck: the bird body plan, flat bill, no visible legs on the water */
    B.duck = (o = {}) => {
      const r = B.bird(Object.assign({ color: o.color || 0x6a6a5a, belly: o.belly || 0xcfc4ae, size: o.size || 2.4, beak: 0.7, beakW: 2.2, beakColor: o.beakColor || 0xe0a038, legColor: 0xe0a038, tailLen: 0.7 }, o));
      const s = o.size || 2.4;
      const neck = ball(fur(o.head || o.color || 0x2a5a3a, 'dkn'), 0.026 * s, 1, 1.5, 1); neck.position.set(0, 0.1 * s, 0.035 * s); r.body.add(neck);
      r.duck = true; return r;
    };
    /* town pigeons */
    B.pigeon = (o = {}) => B.bird(Object.assign({ color: 0x6f7480, belly: 0x8a8f9a, headColor: 0x4a5560, wingColor: 0x5a606c, beakColor: 0x3a3a3a, legColor: 0xc06a6a, size: 1.7, tailLen: 1.1 }, o));
    /* a hamster: a mouse with a fat body and almost no tail */
    B.hamster = (o = {}) => {
      const r = B.mouse(Object.assign({ color: o.color || 0xd9b483, belly: o.belly || 0xf4ead8 }, o));
      for (const t of r.tail) t.visible = false;
      r.body.scale.set(1.35, 1.2, 1.05);
      r.h = 0.2; return r;
    };
    /* a puffin, for the summer arc */
    B.puffin = (o = {}) => {
      const r = B.bird(Object.assign({ color: 0x1a1a20, belly: 0xf6f2ea, headColor: 0x1a1a20, wingColor: 0x22222a, beakColor: 0xe2622c, beak: 1.5, beakW: 2.4, legColor: 0xe2a038, size: 2.2, tailLen: 0.8 }, o));
      const s = 2.2;
      const cheek = ball(fur(0xf6f2ea, 'pfc'), 0.026 * s, 1, 1, 0.6); cheek.position.set(0, -0.002 * s, 0.024 * s); r.head.add(cheek);
      return r;
    };
  }

  /* extra animal sounds, chained onto the existing player */
  { const basePlay = A.play.bind(A);
    A.play = function (name, v = 1) {
      switch (name) {
        case 'meowPosh': A.tone({ f: 760, f2: 520, type: 'sine', dur: 0.4, vol: 0.05 * v, lp: 2200, slide: 0.3 }); return;
        case 'coo': for (let i = 0; i < 3; i++) A.tone({ f: 420, f2: 330, type: 'sine', dur: 0.16, vol: 0.04 * v, delay: i * 0.2, lp: 1200 }); return;
        case 'quack': for (let i = 0; i < 2; i++) A.tone({ f: 620, f2: 380, type: 'sawtooth', dur: 0.12, vol: 0.055 * v, lp: 1600, delay: i * 0.18 }); return;
        case 'bark': A.tone({ f: 340, f2: 180, type: 'square', dur: 0.12, vol: 0.06 * v, lp: 1100 }); A.noise({ f: 700, q: 1, dur: 0.08, vol: 0.03 * v }); return;
        case 'churr': A.noise({ f: 1800, q: 2.2, dur: 0.22, vol: 0.04 * v }); A.tone({ f: 900, f2: 1200, dur: 0.12, vol: 0.025 * v, delay: 0.1 }); return;
        case 'bell1': A.tone({ f: 660, f2: 660, type: 'sine', dur: 1.6, vol: 0.05 * v, lp: 3000 }); A.tone({ f: 990, dur: 1.2, vol: 0.02 * v, delay: 0.02 }); return;
        case 'shopbell': A.tone({ f: 1720, dur: 0.5, vol: 0.05 * v, type: 'sine' }); A.tone({ f: 2280, dur: 0.4, vol: 0.03 * v, delay: 0.03 }); return;
        case 'ding': A.tone({ f: 1180, dur: 0.35, vol: 0.045 * v, type: 'sine' }); return;
        case 'hornbus': A.tone({ f: 190, f2: 150, type: 'sawtooth', dur: 0.45, vol: 0.05 * v, lp: 800 }); return;
      }
      return basePlay(name, v);
    }; }

  /* ================================================================ SMALL SHARED PROPS
     Reused by every town region. All of them draw into whatever region
     root is current, so they merge into that region's batched meshes. */
  const Props = (T.props = {});
  const rngOf = (seed) => U.rng(seed);

  /* a run of picket fence with optional gaps Milo can slip through */
  Props.picket = function (H, x0, z0, x1, z1, o = {}) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const h = o.h || 0.8, color = o.color || 0xf2ece0, gaps = o.gaps || [];
    const mat = M.std('picket' + color.toString(16), { color, rough: 0.7, map: 'paintwood' });
    const inGap = (v) => gaps.some(([a, b]) => v > a - 0.06 && v < b + 0.06);
    const n = Math.max(2, Math.round(len / 0.24));
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = alongX ? U.lerp(x0, x1, t) : x0, pz = alongX ? z0 : U.lerp(z0, z1, t);
      if (inGap(alongX ? px : pz)) continue;
      H.box({ w: alongX ? 0.09 : 0.05, h, d: alongX ? 0.05 : 0.09, x: px, z: pz, mat, col: false, cast: true });
      H.cyl({ r: 0.045, h: 0.07, x: px, y: h, z: pz, mat, seg: 4, ry: Math.PI / 4, col: false });
    }
    for (const ry of [0.32, 0.66]) { // two rails
      const y = h * ry;
      let cur = alongX ? Math.min(x0, x1) : Math.min(z0, z1), end = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
      for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) {
        if (a > cur) railSeg(H, alongX, cur, a, alongX ? z0 : x0, y, mat);
        cur = Math.max(cur, b);
      }
      if (cur < end) railSeg(H, alongX, cur, end, alongX ? z0 : x0, y, mat);
    }
    // colliders: solid between the gaps, low enough to see over
    let cur = alongX ? Math.min(x0, x1) : Math.min(z0, z1), end = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const seg = (a, b) => { if (b - a < 0.05) return; if (alongX) W.collider(a, b, z0 - 0.08, z0 + 0.08, 0, h, { cam: false }); else W.collider(x0 - 0.08, x0 + 0.08, a, b, 0, h, { cam: false }); };
    for (const [a, b] of gaps.slice().sort((p, q) => p[0] - q[0])) { if (a > cur) seg(cur, a); cur = Math.max(cur, b); }
    if (cur < end) seg(cur, end);
  };
  function railSeg(H, alongX, a, b, other, y, mat) {
    const len = b - a; if (len < 0.08) return;
    H.box({ w: alongX ? len : 0.035, h: 0.05, d: alongX ? 0.035 : len, x: alongX ? (a + b) / 2 : other, y, z: alongX ? other : (a + b) / 2, mat, col: false });
  }

  /* a garden gnome Milo can knock over (tracked for an achievement) */
  T.gnomes = [];
  Props.gnome = function (H, x, z, o = {}) {
    const id = o.id || 'gn' + T.gnomes.length;
    const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = o.ry || 0;
    W.h.collider(x - 0.14, x + 0.14, z - 0.14, z + 0.14, (o.y || 0), (o.y || 0) + 0.34, { cam: false, name: 'gnome_' + id });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 10), M.std('gnomeCoat' + (o.coat || 0x3f6fa0).toString(16), { color: o.coat || 0x3f6fa0, rough: 0.7 }));
    body.position.y = 0.12; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(P ? P.SPH : new THREE.SphereGeometry(1, 12, 8), M.std('gnomeSkin', { color: 0xe8c8a8, rough: 0.8 }));
    head.scale.setScalar(0.055); head.position.y = 0.26; head.castShadow = true; g.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.13, 9), M.std('gnomeHat', { color: 0xc03828, rough: 0.7 }));
    hat.position.y = 0.34; hat.castShadow = true; g.add(hat);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 8), M.std('gnomeBeard', { color: 0xf0ece4, rough: 0.9 }));
    beard.rotation.x = Math.PI; beard.position.set(0, 0.235, 0.038); g.add(beard);
    g.userData.dynamic = true; g.traverse((m) => (m.userData.dynamic = true));
    (o.parent || W.root).add(g);
    const rec = { id, g, x, z, y: o.y || 0, down: false, ry: o.ry || 0, name: o.name || 'Garden gnome' };
    T.gnomes.push(rec); W.obj['gnome_' + id] = g;
    // G.INTERACT reads pos as a plain array, so each gnome registers its own
    G.INTERACT.push({
      id: 'gnome_' + id, pos: [x, (o.y || 0) + 0.2, z], r: 0.75, anim: 'push',
      label: 'Knock over the gnome',
      when: () => !rec.down && T.open(),
      act: () => {
        if (!T.knockGnome(rec)) return;
        const n = T.gnomes.filter((q) => q.down).length;
        G.SQ.toast('Timber!', `Garden gnomes knocked over: ${n}/${T.gnomes.length}`);
      },
    });
    return rec;
  };
  T.knockGnome = function (rec) {
    if (rec.down) return false;
    rec.down = true; rec.g.rotation.z = Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1); rec.g.position.y = rec.y + 0.11;
    A.play('thud', 0.7);
    const s = S(); s.town = s.town || {}; s.town.gnomes = s.town.gnomes || {}; s.town.gnomes[rec.id] = true;
    if (G.Extras && G.Extras.check) G.Extras.check();
    return true;
  };

  /* a washing line with a few shirts that sway */
  T.washLines = [];
  Props.washingLine = function (H, x0, z0, x1, z1, o = {}) {
    const y = o.y || 1.5, n = o.n || 4;
    H.cyl({ r: 0.04, h: y, x: x0, z: z0, mat: 'darkwood', col: true });
    H.cyl({ r: 0.04, h: y, x: x1, z: z1, mat: 'darkwood', col: true });
    const len = Math.hypot(x1 - x0, z1 - z0);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4), M.color(0xd9cdb4));
    line.position.set((x0 + x1) / 2, y - 0.04, (z0 + z1) / 2); line.rotation.z = Math.PI / 2; line.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    (o.parent || W.root).add(line);
    const cols = o.colors || [0xd9573b, 0x6a9fd0, 0xe8d98a, 0xf2ebe0, 0x8abf7a];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.7) / (n + 0.4), px = U.lerp(x0, x1, t), pz = U.lerp(z0, z1, t);
      const c = cols[i % cols.length];
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.02), M.std('wash' + c.toString(16), { color: c, rough: 0.95, map: 'fabric' }));
      sh.position.set(px, y - 0.24, pz); sh.rotation.y = -Math.atan2(z1 - z0, x1 - x0); sh.castShadow = true;
      sh.userData.dynamic = true; (o.parent || W.root).add(sh);
      T.washLines.push({ m: sh, ph: i * 1.3 });
    }
  };

  /* a bird feeder on a pole: seed falls when Milo climbs it */
  Props.feeder = function (H, x, z, o = {}) {
    H.cyl({ r: 0.035, h: 1.3, x, z, mat: 'darkwood', col: true, climb: true });
    const tray = H.box({ w: 0.3, h: 0.03, d: 0.3, x, y: 1.3, z, mat: 'midwood', col: false });
    const tube = H.cyl({ r: 0.05, h: 0.26, x, y: 1.34, z, mat: M.std('feederTube', { color: 0x7ab08a, rough: 0.3, transparent: true, opacity: 0.55 }), col: false });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 8), M.get('darkwood'));
    roof.position.set(x, 1.66, z); roof.castShadow = true; W.root.add(roof);
    for (let i = 0; i < 5; i++) { const a = i * 1.3; W.h.sph({ x: x + Math.cos(a) * 0.09, y: 1.345, z: z + Math.sin(a) * 0.09, r: 0.014, mat: M.std('seed', { color: 0xc9a86a, rough: 0.9 }), cast: false }); }
    return tray;
  };

  /* a stack of crates / a bin Milo can climb */
  Props.crates = function (H, x, z, o = {}) {
    const n = o.n || 3;
    for (let i = 0; i < n; i++) {
      const s = 0.42 - i * 0.04;
      H.box({ w: s, h: 0.3, d: s, x: x + (i % 2 ? 0.05 : -0.04), y: i * 0.3, z: z + (i % 2 ? -0.03 : 0.04), mat: 'crate', ry: i * 0.2, climb: true });
    }
  };

  /* a hedge gap Milo can squeeze through: a low crawl-height opening */
  T.gaps = {};
  T.hedgeGap = function (H, x, z, o = {}) {
    // switch the solid collider off (the spatial hash keeps collider objects,
    // so removing it from the array would leave it colliding) and replace it
    // with two solid pieces either side and a low lintel over the gap
    const half = (o.w || 0.7) / 2, alongX = o.alongX !== false;
    const add = (c) => { const k = Object.assign({}, c); delete k._cells; k.on = true; const i = W.colliders.push(k) - 1; if (G.game && G.game.hashC) G.game.hashC(k, i); return k; };
    for (let i = W.colliders.length - 1; i >= 0; i--) {
      const c = W.colliders[i];
      if (!c.on || c.y1 < 1 || c.y0 > 0.4) continue;
      if (alongX) { if (!(z > c.z0 - 0.9 && z < c.z1 + 0.9 && x > c.x0 && x < c.x1 && c.x1 - c.x0 > 1.6)) continue; }
      else { if (!(x > c.x0 - 0.9 && x < c.x1 + 0.9 && z > c.z0 && z < c.z1 && c.z1 - c.z0 > 1.6)) continue; }
      c.on = false;
      const a = Object.assign({}, c), b = Object.assign({}, c), l = Object.assign({}, c);
      if (alongX) { a.x1 = x - half; b.x0 = x + half; l.x0 = x - half; l.x1 = x + half; }
      else { a.z1 = z - half; b.z0 = z + half; l.z0 = z - half; l.z1 = z + half; }
      if (alongX ? a.x1 > a.x0 + 0.05 : a.z1 > a.z0 + 0.05) add(a);
      if (alongX ? b.x1 > b.x0 + 0.05 : b.z1 > b.z0 + 0.05) add(b);
      l.y0 = o.top || 0.42; add(l);
      break;
    }
    if (o.name) T.gaps[o.name] = { x, z, w: o.w || 0.7 };
  };

  /* ================================================================ SHOP / BUILDING SHELL
     A little high-street unit: walls, a roof, a door gap, a lit window and
     a hanging sign. Returns the window mesh so night lighting can use it. */
  T.litWindows = [];
  T.unit = function (ctx, o) {
    const H = ctx.H, x0 = o.x0, x1 = o.x1, z0 = o.z0, z1 = o.z1, h = o.h || 3.2;
    const wallM = o.wall || 'plaster', roofM = o.roof || 'shingles';
    const doorW = o.doorW || 1.2, dx = o.doorX !== undefined ? o.doorX : (x0 + x1) / 2;
    // front wall faces north (-z) by default: the square is to the north
    const frontZ = o.frontS ? z1 : z0;
    const gapsFront = [[dx - doorW / 2, dx + doorW / 2, 2.2]];
    H.wall(x0, z0, x1, z0, h, 0.2, wallM, wallM, o.frontS ? [] : gapsFront, { s: 2, edge: wallM });
    H.wall(x0, z1, x1, z1, h, 0.2, wallM, wallM, o.frontS ? gapsFront : [], { s: 2, edge: wallM });
    H.wall(x0, z0, x0, z1, h, 0.2, wallM, wallM, o.gapsW || [], { s: 2, edge: wallM });
    H.wall(x1, z0, x1, z1, h, 0.2, wallM, wallM, o.gapsE || [], { s: 2, edge: wallM });
    H.roofPrism((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, h, o.rise || 1.1, true, M.get(roofM), M.get(roofM));
    if (o.interior !== false) {
      H.plane(x0, x1, z0, z1, 0.02, o.floor || 'planks', 1.8);
      W.collider(x0, x1, z0, z1, -0.3, 0, { cam: false });
      const c = H.plane(x0, x1, z0, z1, h, o.ceil || 'plaster', 2.4); c.rotation.x = Math.PI; c.position.y = h;
      W.collider(x0, x1, z0, z1, h, h + 0.2, { walk: false });
    }
    // shop windows either side of the door
    const wins = [];
    for (const s of [-1, 1]) {
      const wx = dx + s * (doorW / 2 + 0.75);
      if (wx < x0 + 0.5 || wx > x1 - 0.5) continue;
      const win = H.windowAt(wx, 1.5, frontZ, 0, 1.15, 1.25, { sill: true });
      wins.push(win);
      T.litWindows.push({ x: wx, y: 1.5, z: frontZ + (o.frontS ? 0.3 : -0.3), night: o.nightLit !== false });
    }
    // fascia sign over the door
    if (o.sign) {
      const tex = R.text('shopsign-' + o.sign, 512, 128, (g2, W2, H2) => {
        g2.fillStyle = o.signBg || '#2f4f3a'; g2.fillRect(0, 0, W2, H2);
        g2.strokeStyle = 'rgba(255,240,210,.5)'; g2.lineWidth = 5; g2.strokeRect(8, 8, W2 - 16, H2 - 16);
        g2.fillStyle = o.signFg || '#f6e9c8'; g2.font = `bold ${o.sign.length > 16 ? 40 : 52}px Georgia`;
        g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(o.sign, W2 / 2, H2 / 2 + 3);
      });
      const board = new THREE.Mesh(new THREE.BoxGeometry(Math.min(x1 - x0 - 0.3, 3.4), 0.62, 0.12), [M.get('darkwood'), M.get('darkwood'), M.get('darkwood'), M.get('darkwood'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), M.get('darkwood')]);
      // the lettering is on the box's +Z face, so only a north-facing front turns round
      board.position.set(dx, 2.62, frontZ + (o.frontS ? 0.16 : -0.16)); if (!o.frontS) board.rotation.y = Math.PI;
      board.castShadow = true; ctx.root.add(board);
      T.litWindows.push({ x: dx, y: 2.5, z: frontZ + (o.frontS ? 0.5 : -0.5), night: false, lamp: true });
    }
    if (o.awning) {
      const aw = new THREE.Mesh(new THREE.BoxGeometry(Math.min(x1 - x0 - 0.2, 3.8), 0.06, 0.9), M.std('awn' + (o.awning).toString(16), { color: o.awning, rough: 0.9, map: 'fabric' }));
      aw.position.set(dx, 2.28, frontZ + (o.frontS ? 0.5 : -0.5)); aw.rotation.x = (o.frontS ? -1 : 1) * 0.16; aw.castShadow = true; ctx.root.add(aw);
    }
    return { wins, doorX: dx, frontZ };
  };

  /* a street lamp that lights up at night */
  T.lamps = [];
  T.lamp = function (H, x, z, o = {}) {
    const h = o.h || 3.4;
    H.cyl({ r: 0.07, h, x, z, mat: 'streetlamp', col: true, climb: o.climb });
    const arm = H.box({ w: 0.06, h: 0.06, d: 0.06, x, y: h, z, mat: 'streetlamp', col: false });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), M.std('lampGlass', { color: 0xfff0c8, rough: 0.3, emissive: 0xffd9a0, ei: 0.4, transparent: true, opacity: 0.85 }));
    head.rotation.x = Math.PI; head.position.set(x, h + 0.08, z); W.root.add(head); head.userData.dynamic = true;
    const L = H.light(x, h, z, 0xffd9a0, 1.5, 9, { night: true });
    T.lamps.push({ head, L });
    return L;
  };

  /* ================================================================ region helpers */
  const grav = () => M.std('gravel', { map: 'dirt', color: 0xd8c8a8, rough: 1 });
  const paving = () => M.std('paving', { map: 'sidewalk', color: 0xd4cec2, rough: 0.9 });
  const cobble = () => M.std('cobbles', { map: 'stone', color: 0xb8ada0, rough: 0.9 });

  /* ================================================================ BIRCH LANE
     Through the arch in the south fence of Willow Park (x 9-12, z 64).
     A second residential street: six houses, gardens, a treehouse, a
     paddling pool, washing lines, feeders and knockable gnomes. */
  const BL = { x0: -34, x1: 44, z0: 66, z1: 108 };
  const HOUSES = [
    { id: 'bl1', name: 'The Hartleys’', x: -26, z: 74, wall: 'siding', roof: 'shinglesBlue', door: 0x3f6fa0, ry: Math.PI },
    { id: 'bl2', name: 'The Okonkwos’', x: -6, z: 74, wall: 'sidingGreen', roof: 'shingles', door: 0xc9a13a, ry: Math.PI },
    { id: 'bl3', name: 'The Delgados’', x: 30, z: 74, wall: 'brick', roof: 'shingles', door: 0x7a3a2a, ry: Math.PI },
    { id: 'bl4', name: 'The Paynes’', x: -22, z: 100, wall: 'plaster', roof: 'shinglesBlue', door: 0x2f6f5a, ry: 0, tint: 0xf0e0a8 },
    { id: 'bl5', name: 'The Nowaks’', x: 4, z: 100, wall: 'siding', roof: 'shingles', door: 0xd9573b, ry: 0 },
    { id: 'bl6', name: 'Mrs Ferraro’s', x: 30, z: 100, wall: 'plaster', roof: 'mossroof', door: 0x6a4a8a, ry: 0, tint: 0xc9d8e0 },
  ];

  R.def({
    id: 'birch', name: 'Birch Lane', bounds: [BL.x0, BL.x1, BL.z0, BL.z1], preload: 24,
    areas: [
      ['blTree', 'The Treehouse', -27, -17, 90, 96.4, { zone: 'garden', surf: 'wood' }],
      ['blPool', 'The Paddling Pool', -1, 9, 90, 96.4, { zone: 'garden', surf: 'grass' }],
      ['blGardenN', 'Birch Lane Gardens', -32, 42, 68, 82, { zone: 'garden', surf: 'grass' }],
      ['blGardenS', 'Birch Lane Gardens', -32, 42, 92, 106, { zone: 'garden', surf: 'grass' }],
      ['birchlane', 'Birch Lane', -34, 44, 66, 108, { zone: 'town', surf: 'stone' }],
    ],
    nav: {
      nodes: {
        blArch: [10.5, 0, 66], blN: [10.5, 0, 78], blMid: [10.5, 0, 86], blW: [-20, 0, 86], blWW: [-31, 0, 86], blE: [30, 0, 86], blEE: [42, 0, 86],
        bl1: [-26, 0, 79], bl2: [-6, 0, 79], bl3: [30, 0, 79], bl4: [-22, 0, 95], bl5: [4, 0, 95], bl6: [30, 0, 95],
        blTree: [-22, 0, 93.5], blPool: [4, 0, 93.5], blHog: [-31, 0, 96],
        blS1: [-10, 0, 104], blS2: [22, 0, 104],
      },
      edges: 'pGate-blArch blArch-blN blN-blMid blMid-blW blW-blWW blMid-blE blE-blEE blN-bl2 bl1-blW bl2-blN bl3-blE blW-bl4 blMid-bl5 blE-bl6 bl4-blTree bl5-blPool blWW-blHog blMid-blS1 blMid-blS2',
    },
    build(ctx) {
      const { H, veg, gy } = ctx, root = ctx.root, rng = rngOf(8181);
      /* ---- the lane itself: tarmac with pavements, joined to the park path */
      H.plane(BL.x0 + 1, BL.x1 - 1, 83.4, 88.6, 0.01, 'asphalt', 6);
      H.plane(BL.x0 + 1, BL.x1 - 1, 82.2, 83.4, 0.06, paving(), 2);
      H.plane(BL.x0 + 1, BL.x1 - 1, 88.6, 89.8, 0.06, paving(), 2);
      // the path down from the park arch
      H.plane(9.2, 11.8, 66, 82.2, 0.03, paving(), 2);
      for (let z = 67; z < 83; z += 1.4) W.noGrass.push(['c', 10.5, z, 1.5]);
      W.noGrass.push([BL.x0, BL.x1, 82, 90, 1]);
      /* ---- gardens front and back, and the grass verges */
      veg.grass.push([BL.x0 + 2, BL.x1 - 2, 67, 82, 1.2], [BL.x0 + 2, BL.x1 - 2, 90, 106, 1.2]);
      ctx.def.noGrass = (x, z) => (z > 82 && z < 90) || (x > 9 && x < 12 && z < 83) || HOUSES.some((h) => Math.abs(x - h.x) < 5.2 && Math.abs(z - h.z) < 4.2);

      /* ---- six houses, each with its own colour and a garden */
      for (const hs of HOUSES) {
        const x0 = hs.x - 4.6, x1 = hs.x + 4.6, z0 = hs.z - 3.4, z1 = hs.z + 3.4;
        const wallM = hs.tint ? M.std('blw' + hs.id, { color: hs.tint, rough: 0.9, map: hs.wall === 'brick' ? 'brick' : 'plaster' }) : M.get(hs.wall);
        const roofM = hs.roof === 'mossroof' ? M.std('mossroof', { map: 'shingles', color: 0x7a8a6a }) : M.get(hs.roof);
        const front = hs.ry === Math.PI ? z1 : z0; // all six face the lane
        H.wall(x0, z0, x1, z0, 3.0, 0.22, wallM, wallM, hs.ry === 0 ? [[hs.x - 0.6, hs.x + 0.6, 2.1]] : [], { s: 2, edge: wallM });
        H.wall(x0, z1, x1, z1, 3.0, 0.22, wallM, wallM, hs.ry === Math.PI ? [[hs.x - 0.6, hs.x + 0.6, 2.1]] : [], { s: 2, edge: wallM });
        H.wall(x0, z0, x0, z1, 3.0, 0.22, wallM, wallM, [], { s: 2, edge: wallM });
        H.wall(x1, z0, x1, z1, 3.0, 0.22, wallM, wallM, [], { s: 2, edge: wallM });
        H.roofPrism(hs.x, hs.z, 9.2, 6.8, 3.0, 1.5, true, roofM, roofM);
        W.collider(x0, x1, z0, z1, 0, 3.0, { cam: false });
        // front door (closed: these are neighbours, not Milo's house)
        H.box({ w: 1.2, h: 2.1, d: 0.08, x: hs.x, y: 0, z: front + (hs.ry === Math.PI ? 0.12 : -0.12), mat: M.std('bld' + hs.id, { color: hs.door, rough: 0.5, map: 'paintwood' }), col: false });
        // windows, lit at night
        for (const s of [-1, 1]) {
          H.windowAt(hs.x + s * 2.9, 1.5, front + (hs.ry === Math.PI ? 0.02 : -0.02), hs.ry === Math.PI ? 0 : Math.PI, 1.1, 1.1, { sill: true });
          T.litWindows.push({ x: hs.x + s * 2.9, y: 1.5, z: front + (hs.ry === Math.PI ? 0.4 : -0.4), night: true });
          H.windowAt(hs.x + s * 2.4, 3.5, front + (hs.ry === Math.PI ? 0.02 : -0.02), hs.ry === Math.PI ? 0 : Math.PI, 0.8, 0.8, {});
        }
        // a doorstep and a path out to the pavement
        H.box({ w: 1.6, h: 0.12, d: 0.5, x: hs.x, y: 0, z: front + (hs.ry === Math.PI ? 0.4 : -0.4), mat: 'stone', climb: true });
        R.path(ctx, hs.ry === Math.PI ? [[hs.x, front + 0.6], [hs.x, 82.4]] : [[hs.x, front - 0.6], [hs.x, 89.6]], 1.1, grav());
        // picket fence round the front garden with one ferret-sized gap
        const fz = hs.ry === Math.PI ? 82.2 : 89.8, gapX = hs.x + 3.2;
        Props.picket(H, x0 - 1.2, fz, x1 + 1.2, fz, { color: hs.id === 'bl6' ? 0xdfe6ea : 0xf2ece0, gaps: [[hs.x - 0.7, hs.x + 0.7], [gapX - 0.35, gapX + 0.35]] });
        // a tree, a shrub or two and flowers
        veg.trees.push([hs.x - 3.6, hs.ry === Math.PI ? hs.z + 6.2 : hs.z - 6.2, 0.9 + rng() * 0.35, ['birch', 'oak', 'birch'][Math.floor(rng() * 3)]]);
        for (let i = 0; i < 5; i++) veg.bushes.push([hs.x + (rng() - 0.5) * 8, 0.4 + rng() * 0.3, hs.z + (hs.ry === Math.PI ? 1 : -1) * (4.4 + rng() * 1.6), 0.6 + rng() * 0.4, 0x4d6e36, true]);
        for (let i = 0; i < 16; i++) veg.flowers.push([hs.x + (rng() - 0.5) * 8.4, hs.z + (hs.ry === Math.PI ? 1 : -1) * (4.2 + rng() * 2.4), [0xe7a0b0, 0xe8d98a, 0xd9573b, 0xffffff, 0x9a7ac0][Math.floor(rng() * 5)]]);
        // the house name on the gate post
        R.sign(ctx, hs.x + 4.4, fz, hs.ry === Math.PI ? 0 : Math.PI, hs.name.replace('’', "'"), { w: 0.9, h: 0.7 });
      }

      /* ---- garden gnomes: a whole squad, for knocking over */
      for (const [gx, gz, coat] of [[-29.5, 78.6, 0x3f6fa0], [-28.4, 79.4, 0xc03828], [-2.4, 78.8, 0x2f6f5a], [26.2, 79.2, 0xc9a13a], [33.8, 78.6, 0x6a4a8a], [-18.6, 93.4, 0x3f6fa0], [8.4, 93.2, 0xc03828], [34.2, 93.6, 0x2f6f5a]])
        Props.gnome(H, gx, gz, { coat, ry: rng() * 6, parent: root });

      /* ---- No. 4: the treehouse (climbable) */
      { const tx = -22, tz = 93.4;
        veg.trees.push([tx, tz, 1.5, 'oak']);
        // ladder rungs up the trunk
        for (let i = 0; i < 9; i++) H.box({ w: 0.7, h: 0.06, d: 0.1, x: tx, y: 0.5 + i * 0.28, z: tz + 0.62, mat: 'midwood', climb: true });
        // the platform
        H.plane(tx - 1.6, tx + 1.6, tz - 1.6, tz + 1.6, 3.1, 'planks', 1.4);
        W.collider(tx - 1.6, tx + 1.6, tz - 1.6, tz + 1.6, 2.86, 3.1, { cam: false, name: 'treehouseFloor' });
        for (const [a, b, c, d] of [[tx - 1.6, tz - 1.6, tx + 1.6, tz - 1.6], [tx - 1.6, tz + 1.6, tx + 1.6, tz + 1.6], [tx - 1.6, tz - 1.6, tx - 1.6, tz + 1.6]])
          Props.picket(H, a, b, c, d, { color: 0xc9a06a, h: 0.62, gaps: [] });
        H.roofPrism(tx, tz, 3.4, 3.4, 3.72, 0.7, true, M.get('shedwood'), M.get('shedwood'));
        for (let i = 0; i < 4; i++) H.cyl({ r: 0.05, h: 0.62, x: tx + (i % 2 ? 1.5 : -1.5), y: 3.1, z: tz + (i < 2 ? 1.5 : -1.5), mat: 'midwood', col: false });
        // a rope and a bucket, and a crate of kids' treasure
        H.box({ w: 0.36, h: 0.26, d: 0.3, x: tx + 0.8, y: 3.1, z: tz - 0.7, mat: 'crate', climb: true });
        R.sign(ctx, tx + 1.2, tz - 1.9, 0, 'KEEP OUT', { w: 0.7, h: 2.6, bg: '#8a5a3a' });
      }

      /* ---- No. 5: the paddling pool, a slide and a hose */
      { const px = 4, pz = 93.6;
        H.disc(px, pz, 1.7, 0.16, M.std('poolRim', { color: 0x3aa0c0, rough: 0.5 }), 1.4);
        // ankle deep: no hazard, so Milo can actually get in and splash
        R.waterDisc(ctx, px, pz, 1.5, 0.2, { hazard: false, name: 'paddling pool', mat: M.std('poolWater', { color: 0x7fd0e8, rough: 0.1, transparent: true, opacity: 0.75, envI: 1.2 }) });
        for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.28; W.collider(px + Math.cos(a) * 1.7 - 0.16, px + Math.cos(a) * 1.7 + 0.16, pz + Math.sin(a) * 1.7 - 0.16, pz + Math.sin(a) * 1.7 + 0.16, 0, 0.26, { climb: true, cam: false }); }
        // a beach ball and a watering can
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M.std('beachball', { color: 0xf2ebe0, rough: 0.4 }));
        ball.position.set(px + 2.3, 0.16, pz - 0.9); ball.castShadow = true; ball.userData.dynamic = true; root.add(ball);
        H.cyl({ r: 0.14, h: 0.24, x: px - 2.4, z: pz + 0.6, mat: M.std('canGreen', { color: 0x4a8a6a, rough: 0.5, metal: 0.3 }), col: true });
        // a coiled hose
        const hose = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 20), M.std('hose', { color: 0x2f6f4a, rough: 0.6 }));
        hose.rotation.x = Math.PI / 2; hose.position.set(px + 3.4, 0.04, pz + 1.6); root.add(hose);
      }

      /* ---- No. 6: washing lines, and No. 2: bird feeders */
      Props.washingLine(W.h, 26.5, 104.5, 33.5, 104.5, { y: 1.5, n: 5, parent: root });
      Props.washingLine(W.h, 27.5, 106.2, 34, 106.2, { y: 1.4, n: 4, colors: [0xf2ebe0, 0x8abf7a, 0xe8d98a], parent: root });
      Props.feeder(W.h, -7.8, 79.4);
      Props.feeder(W.h, 31.5, 104.2);
      Props.feeder(W.h, -24.5, 80.1);

      /* ---- street lamps, a post box and a bench */
      for (const lx of [-24, 0, 24]) T.lamp(W.h, lx, 89.4, { climb: lx === 0 });
      H.box({ w: 1.4, h: 0.1, d: 0.42, x: 12, y: 0.44, z: 82.7, mat: 'midwood', climb: true, colY0: -0.44 });
      for (const s of [-1, 1]) H.box({ w: 0.1, h: 0.44, d: 0.4, x: 12 + s * 0.6, z: 82.7, mat: 'darkmetal', col: false });
      H.cyl({ r: 0.28, h: 1.2, x: 16.5, z: 89.2, mat: M.std('postbox', { color: 0xb02a22, rough: 0.5 }), col: true, seg: 14 });
      { const top = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.std('postbox', { color: 0xb02a22, rough: 0.5 })); top.position.set(16.5, 1.2, 89.2); top.castShadow = true; root.add(top); }
      H.box({ w: 0.16, h: 0.1, d: 0.04, x: 16.5, y: 0.84, z: 88.93, mat: 'darkmetal', col: false });

      /* ---- the arch sign, and the hedge back into the park */
      R.sign(ctx, 13.6, 67.4, 0, 'BIRCH LANE', { w: 1.5, h: 1.5, bg: '#2f4f3a' });
      H.hedge(BL.x0 + 1, 66.8, 8.4, 66.8, 1.5, 1.0);
      H.hedge(12.6, 66.8, BL.x1 - 1, 66.8, 1.5, 1.0, [[36, 37.4, 0.4]]);
      W.collider(35.9, 37.5, 66.2, 67.4, 0, 0.4, { name: 'blHedgeGap' });
      // the lane runs on east to the Town Square and west to the allotments
      R.walls(BL.x0, BL.x1, BL.z0, BL.z1, 0, 4, { n: [[8.4, 12.6]], s: [[-12, -8], [20, 24]], e: [[83, 90]], w: [[83, 90]] });

      /* ---- the two ways south: to the allotments and to the school */
      R.path(ctx, [[-10, 90], [-10, 100], [-10, 107.6]], 1.3, grav());
      R.path(ctx, [[22, 90], [22, 100], [22, 107.6]], 1.3, grav());
      R.sign(ctx, -7.4, 104.6, 0, 'ALLOTMENTS', { w: 1.3, h: 1.2, bg: '#4a6a2a' });
      R.sign(ctx, 24.6, 104.6, 0, 'SCHOOL', { w: 1.1, h: 1.2, bg: '#2f4f6a' });
      for (let z = 92; z < 107; z += 1.4) { W.noGrass.push(['c', -10, z, 1.2], ['c', 22, z, 1.2]); }

      /* ---- a few trees along the verge, and bins */
      for (const [tx, tz, s, k] of [[-32, 70, 1.2, 'birch'], [-32, 104, 1.1, 'birch'], [40, 70, 1.2, 'birch'], [40, 104, 1, 'oak'], [18, 70, 1, 'birch'], [-14, 105, 1.1, 'oak']]) veg.trees.push([tx, tz, s, k]);
      for (const [bx, bz] of [[-16.5, 89.2], [21, 82.6], [37, 89.2]]) {
        H.cyl({ r: 0.3, h: 0.9, x: bx, z: bz, mat: 'dumpster', col: true, climb: true, seg: 12 });
        H.cyl({ r: 0.32, h: 0.06, x: bx, y: 0.9, z: bz, mat: 'darkmetal', col: false, seg: 12 });
      }
    },
  });
  T.regions.birch = R.byId.birch;

  /* ================================================================ TOWN SQUARE
     East of Birch Lane, a small high street round a fountain. */
  const TS = { x0: 44, x1: 100, z0: 66, z1: 108 };
  R.def({
    id: 'square', name: 'Town Square', bounds: [TS.x0, TS.x1, TS.z0, TS.z1], preload: 24,
    areas: [
      ['sqBakery', 'Thistle & Crumb Bakery', 52, 60, 68, 75, { indoor: true, zone: 'house2', surf: 'tile' }],
      ['sqCafe', 'The Copper Kettle', 61, 69, 68, 75, { indoor: true, zone: 'house2', surf: 'tile' }],
      ['sqBooks', 'Ashgrove Books', 70, 78, 68, 75, { indoor: true, zone: 'house2', surf: 'wood', dim: 0.3 }],
      ['sqPets', 'Paws & Whiskers', 79, 87, 68, 75, { indoor: true, zone: 'house2', surf: 'wood' }],
      ['sqPost', 'The Post Office', 88, 96, 68, 75, { indoor: true, zone: 'house2', surf: 'tile' }],
      ['sqFountain', 'The Fountain', 64, 78, 82, 96, { zone: 'town', surf: 'stone' }],
      ['sqBus', 'The Bus Stop', 46, 54, 92, 100, { zone: 'town', surf: 'stone' }],
      ['townsquare', 'Town Square', 44, 100, 66, 108, { zone: 'town', surf: 'stone' }],
    ],
    nav: {
      nodes: {
        sqW: [46, 0, 86], sqMid: [66, 0, 86], sqE: [92, 0, 86], sqN: [66, 0, 78], sqS: [66, 0, 100],
        sqBake: [56, 0, 76.5], sqBakeIn: [56, 0, 72], sqCafe: [65, 0, 76.5], sqCafeIn: [65, 0, 72],
        sqBook: [74, 0, 76.5], sqBookIn: [74, 0, 72], sqPet: [83, 0, 76.5], sqPetIn: [83, 0, 72],
        sqPost: [92, 0, 76.5], sqPostIn: [92, 0, 72], sqBus: [50, 0, 96], sqFount: [71, 0, 89],
      },
      edges: 'blEE-sqW sqW-sqMid sqMid-sqE sqMid-sqN sqMid-sqS sqN-sqBake sqBake-sqBakeIn sqN-sqCafe sqCafe-sqCafeIn sqN-sqBook sqBook-sqBookIn sqE-sqPet sqPet-sqPetIn sqE-sqPost sqPost-sqPostIn sqW-sqBus sqMid-sqFount',
    },
    build(ctx) {
      const { H, veg, gy } = ctx, root = ctx.root, rng = rngOf(9292);
      /* ---- the plaza: cobbles, with the lane coming in from the west */
      H.plane(46, 98, 76.5, 104, 0.01, cobble(), 2.4);
      H.plane(TS.x0, 46.4, 83.4, 88.6, 0.01, 'asphalt', 6);
      W.noGrass.push([44, 100, 66, 106, 1]);
      ctx.def.noGrass = () => true;

      /* ---- five shopfronts along the north side */
      const SHOPS = [
        { x0: 52, x1: 60, sign: 'THISTLE & CRUMB', bg: '#7a4a2a', wall: 'brick', roof: 'shingles', awning: 0xd9573b, id: 'bakery' },
        { x0: 61, x1: 69, sign: 'THE COPPER KETTLE', bg: '#2f5f5a', wall: 'plaster', roof: 'shinglesBlue', awning: 0x3a8a8a, id: 'cafe' },
        { x0: 70, x1: 78, sign: 'ASHGROVE BOOKS', bg: '#3a2f5a', wall: 'brick', roof: 'shingles', id: 'books' },
        { x0: 79, x1: 87, sign: 'PAWS & WHISKERS', bg: '#8a5a1a', wall: 'plaster', roof: 'shingles', awning: 0xe8b13a, id: 'pets' },
        { x0: 88, x1: 96, sign: 'POST OFFICE', bg: '#8a1a1a', wall: 'stonewall', roof: 'shingles', id: 'post' },
      ];
      for (const sh of SHOPS) {
        const u = T.unit(ctx, { x0: sh.x0, x1: sh.x1, z0: 68, z1: 75, h: 3.3, wall: sh.wall, roof: sh.roof, sign: sh.sign, signBg: sh.bg, awning: sh.awning, frontS: true, doorW: 1.3, floor: sh.id === 'books' ? 'planks' : 'tiles' });
        T.shopDoors = T.shopDoors || {};
        T.shopDoors[sh.id] = { x: u.doorX, z: 75, area: 'sq' + sh.id.charAt(0).toUpperCase() + sh.id.slice(1) };
        // a step and a doormat
        H.box({ w: 1.8, h: 0.1, d: 0.6, x: u.doorX, y: 0, z: 75.4, mat: 'stone', climb: true });
      }
      /* the pet shop's ferret poster in the window, and a cat flap into the bakery */
      { const tex = R.text('ferretPoster', 256, 320, (g2, W2, H2) => {
          g2.fillStyle = '#f6e9c8'; g2.fillRect(0, 0, W2, H2);
          g2.fillStyle = '#c9885a'; g2.beginPath(); g2.ellipse(W2 / 2, H2 * 0.5, 54, 86, 0, 0, 7); g2.fill();
          g2.fillStyle = '#f0dcc0'; g2.beginPath(); g2.ellipse(W2 / 2, H2 * 0.38, 30, 34, 0, 0, 7); g2.fill();
          g2.fillStyle = '#2a1d15'; g2.beginPath(); g2.arc(W2 / 2 - 12, H2 * 0.36, 5, 0, 7); g2.arc(W2 / 2 + 12, H2 * 0.36, 5, 0, 7); g2.fill();
          g2.fillStyle = '#7a3a2a'; g2.font = 'bold 30px Georgia'; g2.textAlign = 'center';
          g2.fillText('FERRETS!', W2 / 2, 44); g2.font = '20px Georgia'; g2.fillText('ask inside', W2 / 2, H2 - 24);
        });
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.88), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
        pm.position.set(84.6, 1.6, 74.82); pm.rotation.y = Math.PI; root.add(pm); W.obj.ferretPoster = pm;
      }
      // the bakery cat flap: a low hole in the front wall
      T.hedgeGap(H, 53.2, 75, { w: 0.6, top: 0.5, alongX: true, name: 'bakeryFlap' });
      { const fr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.06), M.get('flapframe'));
        fr.position.set(53.2, 0.26, 75.02); root.add(fr);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.03), M.get('flap'));
        fl.position.set(53.2, 0.28, 75.08); fl.userData.dynamic = true; root.add(fl); W.obj.bakeryFlapPanel = fl; }

      /* ---- the fountain in the middle */
      { const fx = 71, fz = 89, stone = M.std('fountainStone', { color: 0xc9c2b2, rough: 0.9, map: 'stone' });
        H.disc(fx, fz, 3.2, 0.02, cobble(), 2);
        const basin = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.26, 10, 44), stone);
        basin.rotation.x = Math.PI / 2; basin.position.set(fx, 0.44, fz); basin.castShadow = true; root.add(basin);
        H.disc(fx, fz, 2.4, 0.1, stone, 1.5);
        for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.28, x = fx + Math.cos(a) * 2.4, z = fz + Math.sin(a) * 2.4; W.collider(x - 0.28, x + 0.28, z - 0.28, z + 0.28, 0, 0.62, { climb: true, cam: false }); }
        R.waterDisc(ctx, fx, fz, 2.26, 0.42, { name: 'the fountain' });
        H.cyl({ r: 0.4, rt: 0.3, h: 1.3, x: fx, y: 0.1, z: fz, mat: stone, col: true });
        H.cyl({ r: 0.85, h: 0.1, x: fx, y: 1.4, z: fz, mat: stone, col: false });
        H.cyl({ r: 0.22, rt: 0.16, h: 0.7, x: fx, y: 1.5, z: fz, mat: stone, col: false });
        // a stone heron on top, spouting
        const heron = new THREE.Group(); heron.position.set(fx, 2.2, fz); root.add(heron);
        { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), stone); b.scale.set(0.8, 1, 1.5); heron.add(b);
          const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.42, 8), stone); nk.position.set(0, 0.26, 0.08); nk.rotation.x = -0.2; heron.add(nk);
          const hd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), stone); hd.position.set(0, 0.5, 0.14); heron.add(hd);
          const bk = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 6), M.std('heronBeak', { color: 0xd4b06a, rough: 0.7 })); bk.rotation.x = Math.PI / 2 + 0.5; bk.position.set(0, 0.48, 0.3); heron.add(bk);
          heron.traverse((m) => { m.castShadow = true; }); }
        // the jet of water
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 1.5, 6), M.std('jetWater', { color: 0xbfe4f0, rough: 0.1, transparent: true, opacity: 0.5 }));
        jet.position.set(fx, 1.7, fz + 0.5); jet.rotation.x = 0.45; jet.userData.dynamic = true; root.add(jet); W.obj.sqFountainJet = jet;
        // coins in the bottom, and benches round the edge
        for (let i = 0; i < 9; i++) { const a = rng() * 6.28, r = rng() * 1.8; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 10), M.get('brass')); c.position.set(fx + Math.cos(a) * r, 0.11, fz + Math.sin(a) * r); root.add(c); }
        for (const [bx, bz, ry] of [[fx - 4.6, fz, Math.PI / 2], [fx + 4.6, fz, -Math.PI / 2], [fx, fz + 4.8, 0]]) {
          H.box({ w: 1.7, h: 0.1, d: 0.46, x: bx, y: 0.45, z: bz, mat: 'midwood', ry, climb: true, colY0: -0.45 });
          H.box({ w: 1.7, h: 0.5, d: 0.08, x: bx - Math.sin(ry) * 0.2, y: 0.55, z: bz - Math.cos(ry) * 0.2, mat: 'midwood', ry, col: false });
        }
      }

      /* ---- café tables outside, under the awning */
      for (const [tx, tz] of [[63, 78.5], [66.5, 78.5], [63, 81.5]]) {
        H.cyl({ r: 0.05, h: 0.62, x: tx, z: tz, mat: 'darkmetal', col: true });
        H.cyl({ r: 0.42, h: 0.05, x: tx, y: 0.62, z: tz, mat: M.std('cafeTable', { color: 0xf2ebe0, rough: 0.4 }), col: false, seg: 18 });
        W.collider(tx - 0.42, tx + 0.42, tz - 0.42, tz + 0.42, 0.5, 0.67, { climb: true, cam: false });
        for (const s of [-1, 1]) {
          H.cyl({ r: 0.04, h: 0.38, x: tx + s * 0.62, z: tz + s * 0.1, mat: 'darkmetal', col: false });
          H.box({ w: 0.34, h: 0.04, d: 0.34, x: tx + s * 0.62, y: 0.38, z: tz + s * 0.1, mat: M.std('cafeChair', { color: 0x3a6a6a, rough: 0.5 }), climb: true, colY0: -0.38 });
        }
        // a saucer and a crumb-covered plate
        H.cyl({ r: 0.11, h: 0.02, x: tx + 0.1, y: 0.67, z: tz, mat: 'ceramic', col: false, seg: 14 });
      }
      { const par = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.5, 8), M.std('parasol', { color: 0xe8d98a, rough: 0.9, map: 'fabric' }));
        par.position.set(64.8, 2.3, 79.8); par.castShadow = true; root.add(par);
        H.cyl({ r: 0.05, h: 2.1, x: 64.8, z: 79.8, mat: 'darkwood', col: true }); }

      /* ---- the bus stop: a shelter, a timetable, a bench */
      { const bx = 50, bz = 96;
        H.plane(bx - 2.4, bx + 2.4, bz - 1.6, bz + 1.6, 0.03, paving(), 1.6);
        for (const s of [-1, 1]) H.cyl({ r: 0.06, h: 2.5, x: bx + s * 2.1, z: bz - 1.3, mat: 'darkmetal', col: true });
        for (const s of [-1, 1]) H.cyl({ r: 0.06, h: 2.5, x: bx + s * 2.1, z: bz + 1.3, mat: 'darkmetal', col: true });
        H.box({ w: 4.6, h: 0.1, d: 3, x: bx, y: 2.5, z: bz, mat: M.std('busRoof', { color: 0x4a6a7a, rough: 0.6, metal: 0.2 }), col: false });
        W.collider(bx - 2.3, bx + 2.3, bz - 1.5, bz + 1.5, 2.5, 2.7, { walk: false });
        // the back wall (glass), and a bench Milo and Biscuit share
        const gl = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.9, 0.06), M.get('glass'));
        gl.position.set(bx, 1.35, bz + 1.3); root.add(gl); W.collider(bx - 2.3, bx + 2.3, bz + 1.24, bz + 1.36, 0, 2.3, { cam: false });
        H.box({ w: 3.4, h: 0.1, d: 0.42, x: bx, y: 0.45, z: bz + 0.9, mat: 'midwood', climb: true, colY0: -0.45 });
        // the timetable
        { const tex = R.text('busTimes', 256, 320, (g2, W2, H2) => {
            g2.fillStyle = '#f6f2e8'; g2.fillRect(0, 0, W2, H2);
            g2.fillStyle = '#2f4f6a'; g2.fillRect(0, 0, W2, 52);
            g2.fillStyle = '#f6f2e8'; g2.font = 'bold 26px Georgia'; g2.textAlign = 'center'; g2.fillText('THE No. 4', W2 / 2, 34);
            g2.fillStyle = '#2a1d15'; g2.font = '20px Georgia'; g2.textAlign = 'left';
            const times = ['08:00  the Square', '10:00  Birch Lane', '12:00  the Allotments', '14:00  the School', '16:00  the Canal', '18:00  and home again'];
            times.forEach((t, i) => g2.fillText(t, 18, 92 + i * 34));
            g2.font = 'italic 17px Georgia'; g2.fillText('(roughly)', 18, 300);
          });
          const tb = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
          tb.position.set(bx + 1.5, 1.4, bz + 1.24); tb.rotation.y = Math.PI; root.add(tb); }
        R.sign(ctx, bx - 2.6, bz - 1.9, -0.4, 'BUS STOP', { w: 1, h: 2.1, bg: '#2f4f6a' });
      }

      /* ---- market stalls (they only appear on market days; see the tick) */
      T.stalls = [];
      for (let i = 0; i < 4; i++) {
        const sx = 56 + i * 5.4, sz = 98.5;
        const g = new THREE.Group(); g.position.set(sx, 0, sz); root.add(g); g.visible = false;
        const cols = [0xd9573b, 0x3a8a8a, 0xe8b13a, 0x6a8ac0][i];
        for (const dx of [-1.3, 1.3]) for (const dz of [-0.9, 0.9]) {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), M.get('darkwood'));
          p.position.set(dx, 1.05, dz); p.castShadow = true; g.add(p);
        }
        const tb = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 1.9), M.get('midwood')); tb.position.set(0, 0.85, 0); tb.castShadow = true; g.add(tb);
        const cn = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 2.3), M.std('stallCanvas' + i, { color: cols, rough: 0.9, map: 'fabric' })); cn.position.set(0, 2.15, 0); cn.castShadow = true; g.add(cn);
        // stripy valance
        const vl = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.3, 0.04), M.std('stallCanvas' + i, { color: cols, rough: 0.9, map: 'fabric' })); vl.position.set(0, 1.98, -1.15); g.add(vl);
        // goods on the table
        for (let k = 0; k < 7; k++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 + rng() * 0.04, 8, 6), M.std('stallGood' + (k % 3), { color: [0xc03828, 0xe8b13a, 0x6a9a4a][k % 3], rough: 0.7 }));
          b.position.set(-1.1 + k * 0.36, 0.95, -0.2 + (k % 2) * 0.4); b.castShadow = true; g.add(b);
        }
        g.traverse((m) => (m.userData.dynamic = true));
        T.stalls.push({ g, x: sx, z: sz });
        // Milo can hide under a stall: a crawl space with a low ceiling
        W.collider(sx - 1.45, sx + 1.45, sz - 1, sz + 1, 0.8, 0.95, { walk: false, cam: false, name: 'stall' + i });
      }

      /* ---- lamps, a noticeboard, a clock tower stub and trees */
      for (const [lx, lz] of [[50, 80], [80, 80], [58, 102], [86, 102], [94, 86]]) T.lamp(W.h, lx, lz, {});
      for (const [tx, tz, s] of [[47, 72, 1.2], [97, 100, 1.1], [48, 104, 1], [92, 104, 1.1]]) veg.trees.push([tx, tz, s, 'birch']);
      for (let i = 0; i < 12; i++) veg.flowers.push([46.5 + rng() * 2, 78 + rng() * 24, [0xe7a0b0, 0xe8d98a, 0xd9573b][Math.floor(rng() * 3)]]);
      // planters round the plaza
      for (const [px, pz] of [[59, 84], [83, 84], [59, 94], [83, 94]]) {
        H.box({ w: 1.1, h: 0.42, d: 1.1, x: px, y: 0, z: pz, mat: 'stone', climb: true });
        for (let i = 0; i < 7; i++) veg.bushes.push([px + (rng() - 0.5) * 0.8, 0.52 + rng() * 0.2, pz + (rng() - 0.5) * 0.8, 0.34, 0x4d6e36, false]);
        for (let i = 0; i < 6; i++) veg.flowers.push([px + (rng() - 0.5) * 0.9, pz + (rng() - 0.5) * 0.9, 0xe7a0b0]);
      }
      /* the church clock on the east side: it rings the hour */
      { const cx = 97, cz = 78;
        H.wall(cx - 2, cz - 2, cx + 2, cz - 2, 7, 0.4, 'stonewall', 'stonewall', [], { s: 2, edge: 'stonewall' });
        H.wall(cx - 2, cz + 2, cx + 2, cz + 2, 7, 0.4, 'stonewall', 'stonewall', [], { s: 2, edge: 'stonewall' });
        H.wall(cx - 2, cz - 2, cx - 2, cz + 2, 7, 0.4, 'stonewall', 'stonewall', [], { s: 2, edge: 'stonewall' });
        H.wall(cx + 2, cz - 2, cx + 2, cz + 2, 7, 0.4, 'stonewall', 'stonewall', [], { s: 2, edge: 'stonewall' });
        W.collider(cx - 2, cx + 2, cz - 2, cz + 2, 0, 7, { cam: false });
        const sp = new THREE.Mesh(new THREE.ConeGeometry(2.9, 3.2, 4), M.std('towerroof2', { map: 'shingles', color: 0x5a6a7a }));
        sp.position.set(cx, 8.6, cz); sp.rotation.y = Math.PI / 4; sp.castShadow = true; root.add(sp);
        const face = R.text('townClock', 256, 256, (g2, W2, H2) => {
          g2.fillStyle = '#f6f2e8'; g2.beginPath(); g2.arc(128, 128, 120, 0, 7); g2.fill();
          g2.strokeStyle = '#2a1d15'; g2.lineWidth = 7; g2.stroke();
          g2.fillStyle = '#2a1d15';
          for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 - Math.PI / 2; g2.beginPath(); g2.arc(128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98, i % 3 ? 5 : 9, 0, 7); g2.fill(); }
          g2.lineWidth = 9; g2.strokeStyle = '#2a1d15'; g2.beginPath(); g2.moveTo(128, 128); g2.lineTo(128, 56); g2.stroke();
          g2.lineWidth = 7; g2.beginPath(); g2.moveTo(128, 128); g2.lineTo(182, 156); g2.stroke();
        });
        for (const [fz2, ry] of [[cz - 2.05, 0], [cz + 2.05, Math.PI]]) {
          const fm = new THREE.Mesh(new THREE.CircleGeometry(1.1, 28), new THREE.MeshStandardMaterial({ map: face, roughness: 0.8 }));
          fm.position.set(cx, 5.4, fz2); fm.rotation.y = ry; root.add(fm);
        }
        T.clockTower = [cx, cz];
      }

      /* ---- boundary: open west to Birch Lane, south to the school lane */
      R.walls(TS.x0, TS.x1, TS.z0, TS.z1, 0, 6, { w: [[83, 90]], s: [[62, 70]], n: [[69.4, 70.6]], e: [] });
      /* a hedge gap north into the old town, behind the corner shop */
      T.hedgeGap(H, 70, 64, { w: 0.8, top: 0.44, alongX: true, name: 'townHedgeGap' });
      R.sign(ctx, 68.4, 68.6, Math.PI, 'TOWN SQUARE', { w: 1.6, h: 1.4, bg: '#2f4f3a' });
    },
  });
  T.regions.square = R.byId.square;

  /* ================================================================ LIVING TOWN: ticks
     Night lighting for the shop windows, the fountain jet, washing that
     sways, the church clock, and the market stalls on market days. */
  T.dayOf = () => Math.floor((G.game ? G.game.S.playTime || 0 : 0) / 600) % 7; // an in-game "day" rolls over every ten minutes
  T.isMarketDay = () => [2, 5].includes(T.dayOf());

  let clockT = 0, lastHour = -1;
  SQ.tick((dt, s, st) => {
    if (st !== 'play' || !G.game) return;
    const t = s.time || 12, night = t < 6.5 || t > 20;
    // washing sways
    for (const w of T.washLines) { w.ph += dt * 1.2; w.m.rotation.z = Math.sin(w.ph) * 0.09; }
    // market stalls
    const mk = T.isMarketDay();
    for (const st2 of T.stalls || []) if (st2.g.visible !== mk) st2.g.visible = mk;
    // the town clock chimes on the hour
    clockT += dt;
    if (clockT > 1) {
      clockT = 0;
      const hr = Math.floor(t);
      if (hr !== lastHour && lastHour >= 0 && T.clockTower && !night) {
        const p = G.game.player.pos, d = Math.hypot(p.x - T.clockTower[0], p.z - T.clockTower[1]);
        if (d < 90) { const n = ((hr + 11) % 12) + 1; for (let i = 0; i < Math.min(n, 12); i++) setTimeout(() => A.play('bell1', U.clamp(1 - d / 100, 0.15, 1)), i * 900); }
      }
      lastHour = hr;
    }
  });

  /* lit windows and lamps at night: register them with the world's light list
     the first time each region is built, so the existing night pass handles them */
  const oBuilt = (d, fn) => { const o = d.onBuilt; d.onBuilt = function (g, ctx) { if (o) o.call(this, g, ctx); fn(g, ctx); }; };
  for (const id of ['birch', 'square']) oBuilt(R.byId[id], () => {
    for (const w of T.litWindows.splice(0)) {
      if (w.lamp) W.h.light(w.x, w.y, w.z, 0xffd9a0, 0.8, 5, { night: true });
      else if (w.night) W.h.light(w.x, w.y, w.z, 0xffe0a8, 1.1, 6, { night: true });
    }
    if (G.game) G.game._lT = 99;
  });

  /* ================================================================ MAP, TRAVEL, ADMIN */
  const townShow = () => townOpen() || has('townSeen');
  SQ.mapViews.town = {
    bounds: [-40, 104, 60, 150], show: townShow, bg: '#e4dcc4', base: false,
    draw: (c, X, Z, sc) => {
      // the lane and the square's cobbles, drawn by hand
      c.strokeStyle = 'rgba(70,60,50,.5)'; c.lineWidth = Math.max(3, 5 * sc / 6);
      c.beginPath(); c.moveTo(X(-32), Z(86)); c.lineTo(X(98), Z(86)); c.stroke();
      c.beginPath(); c.moveTo(X(10.5), Z(64)); c.lineTo(X(10.5), Z(86)); c.stroke();
    },
  };
  { const tabs = document.getElementById('mapTabs');
    if (tabs && !tabs.querySelector('[data-v="town"]')) { const b = document.createElement('button'); b.dataset.v = 'town'; b.textContent = 'Town'; tabs.appendChild(b); } }

  SQ.travelSpots.push(['birchlane', 'Birch Lane', [10.5, 0, 84], Math.PI], ['townsquare', 'Town Square', [66, 0, 86], Math.PI / 2]);

  (G.AdminExtras = G.AdminExtras || []).push(({ group, close, toast }) => {
    const add = group('Town');
    const go = (label, pos, yaw) => add(label, () => { close(); G.game.flag('townSeen'); G.game.travel(pos, yaw === undefined ? 0 : yaw); });
    go('Birch Lane', [10.5, 0, 84], Math.PI);
    go('Birch Lane gardens', [-22, 0, 97], Math.PI);
    go('Town Square', [66, 0, 86], Math.PI / 2);
    go('The bus stop', [50, 0, 94], Math.PI);
    add('Stand every gnome back up', () => { for (const gn of T.gnomes) { gn.down = false; gn.g.rotation.z = 0; gn.g.position.y = gn.y; } const s = S(); if (s.town) s.town.gnomes = {}; toast('<b>Admin</b>', null, 'The gnomes are upright again.'); });
    add('Market day on/off', () => { const s = S(); s.town = s.town || {}; s.town.forceMarket = !s.town.forceMarket; toast('<b>Admin</b>', null, 'Market day ' + (s.town.forceMarket ? 'forced on' : 'back on schedule') + '.'); }, !!(S().town && S().town.forceMarket));
  });

  /* honour the admin override for market day */
  const baseMarket = T.isMarketDay;
  T.isMarketDay = () => (S().town && S().town.forceMarket) || baseMarket();

  /* ================================================================ SAVE DATA
     s.town holds the new flags (knocked gnomes, quest state). Old saves
     simply have no s.town and get a fresh one. */
  SQ.onApply((s) => {
    s.town = s.town || {};
    s.town.gnomes = s.town.gnomes || {};
    for (const gn of T.gnomes) {
      const down = !!s.town.gnomes[gn.id];
      if (down !== gn.down) { gn.down = down; gn.g.rotation.z = down ? Math.PI / 2 : 0; gn.g.position.y = gn.y + (down ? 0.11 : 0); }
    }
  });

  /* mark the town as seen once Milo actually walks into it, so the map tab
     and the burrow exits stay available in later chapters and old saves */
  SQ.trigger(() => { const p = game().player.pos; return townOpen() && p.z > 67 && p.x > -36 && p.x < 102 && p.y > -5; }, () => {
    flag('townSeen'); const s = S(); s.discovered.birchlane = true;
    SQ.toast('Birch Lane', 'A whole second street, right through the park gate. The map has a Town tab now.');
  });
})();

/* =====================================================================
   world-town.js (part two) - the life of the new streets: animals with
   their own quests, the things Milo can find, and the bus.
   ===================================================================== */
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, R = G.Regions, NPC = G.NPC, SQ = G.SQ, T = G.Town;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const has = (k) => !!(G.game && G.game.S.flags[k]);
  const flag = (k, v = true) => game().flag(k, v);
  const ch = () => (G.game ? G.game.S.chapter : 0);
  const Q = (id) => (S().quests || {})[id];
  const item = (id) => G.game.hasItem(id);
  const open = () => T.open();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ================================================================ ITEMS */
  Object.assign(G.ITEMS, {
    cushion: { name: "Duchess's Cushion", desc: 'A small velvet cushion with a gold tassel, slightly chewed at one corner. It smells faintly of a very smug cat.' },
    crumbs: { name: 'Bag of Crumbs', desc: 'A paper twist of bakery crumbs. Pigeon currency.' },
    storybook: { name: 'A Very Small Book', desc: 'A pocket book of seaside poems from the bookshop floor. Someone has folded down a corner.' },
  });

  /* ================================================================ COLLECTIBLES: "Around Town"
     Twenty keepsakes spread over the new streets. The first eight live in
     Birch Lane and the Square; the rest come with the other areas. */
  G.CATS.town = 'Around Town';
  const TC = [
    ['t_gnomehat', 'gnome', 'Spare Gnome Hat', 'A tiny red hat, knocked off in some long-ago gnome-related incident.', [-29.1, 0.06, 79.8]],
    ['t_chalk', 'stone', 'Pavement Chalk', 'A stub of pink chalk. Somebody drew a hopscotch grid outside No. 5 and only got to seven.', [14.2, 0.04, 89.2]],
    ['t_kite', 'ribbon', 'Kite Tail', 'A long ribbon tail from a lost kite, wrapped twice round the treehouse rail.', [-20.9, 3.2, 92.5]],
    ['t_marble', 'marble', 'Blue Swirl Marble', 'A big blue swirl marble, fished out of the paddling pool and left drying on the rim. A champion, this one.', [2.6, 0.28, 95.3]],
    ['t_peg', 'button', 'Wooden Peg', 'A washing peg, dropped in the grass. It grips Milo’s whisker if he is careless.', [30.4, 0.04, 105.4]],
    ['t_coin2', 'coin', 'Fountain Penny', 'A penny someone wished on, sitting on the fountain’s stone lip. Milo will wish carefully.', [69.6, 0.64, 91.4]],
    ['t_recipe', 'note', 'Bakery Order Slip', 'A paper slip: "6 seeded, 1 large tin, and the usual bun for the small ginger cat."', [55.6, 0.04, 76.9]],
    ['t_stamp', 'foil', 'Corner of a Stamp', 'The corner of a stamp with half a lighthouse on it. Grandpa Arlo would like this one.', [92.4, 0.04, 76.6]],
  ];
  for (const [id, model, name, desc, pos] of TC) G.COLLECT.push({ id, cat: 'town', model, name, desc, pos });

  /* ================================================================ DIGGING SPOTS
     Four here, four more with the allotments, the school and the canal. */
  const TOWN_DIGS = [
    { id: 'td1', pos: [-26.4, 0, 79.6], loot: 'treat' },
    { id: 'td2', pos: [8.4, 0, 95.2], loot: 'bone' },
    { id: 'td3', pos: [35.6, 0, 80.4], loot: 'button' },
    { id: 'td4', pos: [62.4, 0, 100.8], loot: 'coin' },
  ];
  /* the original digs live in a closed-over list in expansion.js, so the new
     ones follow the same pattern here: a mound, an interaction and s.dug */
  T.digs = TOWN_DIGS;
  T.mounds = {};
  const oInitDigs = G.EXT.init;
  G.EXT.init = function (g) {
    oInitDigs(g);
    for (const d of TOWN_DIGS) {
      const mm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M.get('dirt'));
      mm.scale.set(1, 0.3, 1); mm.position.set(d.pos[0], d.pos[1], d.pos[2]); mm.receiveShadow = true;
      g.scene.add(mm); T.mounds[d.id] = mm;
      for (let k = 0; k < 4; k++) {
        const pb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03), M.get('rock'));
        pb.position.set(Math.cos(k * 1.7) * 0.25, 0.015, Math.sin(k * 1.7) * 0.25);
        pb.position.divide(mm.scale); mm.add(pb);
      }
      G.INTERACT.push({
        id: 'dig_' + d.id, pos: d.pos, r: 0.6, label: 'Dig in the soft soil', anim: 'dig',
        when: () => open() && !(S().dug || {})[d.id],
        act: () => townDig(d),
      });
    }
  };
  const DIG_LOOT = {
    treat: ['A treat!', 'Buried and forgotten. Finders keepers.'],
    bone: ['An old bone', 'Far too big for a ferret. Biscuit would know whose it was.'],
    button: ['A brass button', 'Off a coat, a long time ago. It still shines if you rub it.'],
    coin: ['A lost coin', 'Dropped outside the bakery, probably. Milo will keep it safe.'],
  };
  T.dig = (d) => townDig(d);
  function townDig(d) {
    const g = game();
    g.player.act('dig', 1.5, { lockMove: true }); A.play('dig');
    setTimeout(() => A.play('dig'), 600);
    const iv = setInterval(() => g.dirtBurst(), 280);
    setTimeout(() => {
      clearInterval(iv);
      const s = S(); s.dug = s.dug || {}; s.dug[d.id] = true;
      if (T.mounds[d.id]) T.mounds[d.id].visible = false;
      if (d.loot === 'treat') g.give('treat');
      else { const [t, sub] = DIG_LOOT[d.loot]; A.play('pickup'); UI().toast(`<b>${t}</b>`, null, sub); }
      const n = T.digs.filter((x) => (s.dug || {})[x.id]).length;
      if (n === T.digs.length) UI().toast('<b>Town digger</b>', null, 'Every soft spot in the new streets, thoroughly investigated.');
      if (G.Extras && G.Extras.check) G.Extras.check();
    }, 1500);
  }

  /* ================================================================ QUESTS */
  Object.assign(G.QUESTS, {
    tq_cushion: {
      kind: 'Side quest', title: "Duchess's Cushion", giver: 'Duchess',
      steps: { find: 'Find the cushion Duchess says was stolen', ret: 'Take the cushion back to Duchess at the café' },
      done: 'Nobody stole it. Rusty was sitting on it. Duchess has decided to forgive him, grandly.',
      target: (st) => (st === 'find' ? [-21.2, 3.16, 92.2] : [64.2, 0, 79.4]),
    },
    tq_pigeons: {
      kind: 'Side quest', title: 'Crumbs for Gossip', giver: 'Gossip and Gary',
      steps: { crumbs: 'Find some crumbs for the pigeons (try under the café tables)', tell: 'Bring the crumbs back to Gossip and Gary' },
      done: 'Three rumours, two of them true: there is a hole under the bakery, the No. 4 bus is always late, and a cat lives in the bookshop.',
      target: (st) => (st === 'crumbs' ? [63, 0, 78.5] : [72.4, 0, 87.6]),
    },
    tq_soot: {
      kind: 'Side quest', title: 'A Book for Soot', giver: 'Soot',
      steps: { book: 'Find a small book Soot would like', read: 'Read the book to Soot in the bookshop' },
      done: 'Soot has heard a poem about the sea. She has never seen it. One day, she says. One day.',
      target: (st) => (st === 'book' ? [75.6, 0, 71.4] : [73.4, 0, 70.6]),
    },
    tq_biscuit: {
      kind: 'Side quest', title: 'Biscuit Waits', giver: 'Biscuit',
      steps: { wait: 'Sit with Biscuit at the bus stop until the bus comes' },
      done: 'The bus came. It was not his owner. Biscuit did not mind; he had company this time.',
      target: () => [50, 0, 96],
    },
  });

  /* ================================================================ THE ANIMALS */
  const g_ = (x, z) => [x, 'g', z];

  /* ---- Duchess: a very posh cat outside the café */
  NPC.add({
    id: 'duchess', name: 'Duchess', kind: 'cat', sound: 'meowPosh',
    look: { scale: 1.25, color: 0xe8e2d4, bib: 0xf6f2ea, collar: 0xb02a4a },
    pos: g_(64.2, 79.4), yaw: -1.2, wander: 0.5, when: () => open(),
    lines: () => {
      const q = Q('tq_cushion');
      if (!q) return [
        ['duchess', 'You may approach. Slowly. I am Duchess, and this is my café.', 'neutral'],
        ['duchess', 'I would be perfectly content, except that my cushion has been STOLEN. Velvet. Gold tassel. Irreplaceable.', 'sad'],
        ['duchess', 'The staff here are useless. You, however, appear to be a small, determined weasel.', 'think'],
        ['milo', '*Ferret. But I will find your cushion.*', 'happy'],
        { do: () => G.EXT.startQuest('tq_cushion', 'find') },
      ];
      if (q === 'find' && item('cushion')) return [
        ['duchess', 'Is that— it IS. Oh, my cushion.', 'surprised'],
        { do: () => { game().take('cushion'); G.EXT.setQuest('tq_cushion', 'done'); if (G.Extras && G.Extras.award) G.Extras.award('ach_cushion'); } },
        ['duchess', 'And where, precisely, was it?', 'neutral'],
        ['milo', '*In the treehouse on Birch Lane. A squirrel was sitting on it.*', 'neutral'],
        ['duchess', 'Rusty. Of course. That animal buries his own breakfast and then looks surprised.', 'sad'],
        ['duchess', 'Very well. He may live. And you, weasel, may sit on the good chair. That is the highest honour I give.', 'happy'],
      ];
      if (q === 'find') return [['duchess', 'Still looking? Try somewhere high and ridiculous. That is where stolen things go.', 'neutral']];
      return [['duchess', pick([
        'The cushion is exactly where it belongs. As am I.',
        'The baker gives me a bun every morning. I allow it.',
        'That dog at the bus stop has been waiting for years. Sentimental creature. I admire him, secretly.',
      ]), 'happy']];
    },
  });

  /* ---- Gossip and Gary: two pigeons who trade rumours for crumbs */
  NPC.add({
    id: 'gossip', name: 'Gossip', kind: 'pigeon', sound: 'coo',
    look: { scale: 1.1 }, pos: g_(72.4, 87.6), yaw: 1, wander: 1.4, when: () => open(),
    lines: () => {
      const q = Q('tq_pigeons');
      if (!q) return [
        ['gossip', 'Ooh. Ooh! Gary. GARY. There’s a ferret. In the square. In OUR square.', 'surprised'],
        ['gary', 'I can see him, Gossip.', 'neutral'],
        ['gossip', 'We know everything that happens here, ferret. Everything. Who left the gate open. Whose bin fell over.', 'happy'],
        ['gossip', 'But information costs. Crumbs. Good ones, not the wet ones from the fountain.', 'think'],
        { do: () => G.EXT.startQuest('tq_pigeons', 'crumbs') },
      ];
      if (q === 'crumbs' && item('crumbs')) return [
        ['gossip', 'CRUMBS. Gary, he brought crumbs.', 'happy'],
        { do: () => { game().take('crumbs'); G.EXT.setQuest('tq_pigeons', 'done'); } },
        ['gary', 'Tell him the things, then.', 'neutral'],
        ['gossip', 'One: there is a hole under the bakery wall, cat-sized, and a cat does not use it.', 'happy'],
        ['gossip', 'Two: the No. 4 bus is never on time, and the old dog waits for it anyway.', 'neutral'],
        ['gossip', 'Three: there is a black cat living in the bookshop who has never once been outside.', 'think'],
        ['gary', 'Four: Gossip made one of those up.', 'happy'],
        ['gossip', 'I did NOT.', 'sad'],
      ];
      if (q === 'crumbs') return [['gossip', 'Crumbs first. Rumours after. That is how it works.', 'neutral']];
      return [['gossip', pick([
        'The baker is out of seeded loaves. That is news. That is absolutely news.',
        'Someone knocked over a gnome on Birch Lane. We are watching you.',
        'Gary saw a train. Gary always sees the train. It is not news any more, Gary.',
      ]), 'happy']];
    },
  });
  NPC.add({
    id: 'gary', name: 'Gary', kind: 'pigeon', sound: 'coo',
    look: { scale: 1.15, color: 0x5a6068, belly: 0x7a8088 }, pos: g_(73.6, 88.4), yaw: 2, wander: 1.2, when: () => open(),
    lines: () => [['gary', pick(['Mm.', 'Gossip talks enough for both of us.', 'There is a train at four. I like the train.', 'You are standing on my favourite paving stone. It is fine. It is fine.']), 'neutral']],
  });

  /* ---- Soot: a shy black cat in the bookshop who loves being read to */
  NPC.add({
    id: 'soot', name: 'Soot', kind: 'cat', sound: 'meow',
    look: { scale: 1.1, color: 0x2a2a30, bib: 0x3a3a42 }, pos: g_(73.4, 70.6), yaw: 0.4, wander: 0.3, shy: true, when: () => open(),
    lines: () => {
      const q = Q('tq_soot');
      if (!q) return [
        ['soot', '...', 'sad'],
        ['milo', '*Hello? I’m Milo. I won’t come any closer if you’d rather.*', 'neutral'],
        ['soot', 'Oh. You asked. Nobody asks.', 'surprised'],
        ['soot', 'I’m Soot. I live in the poetry shelf. It’s warm, and nobody reaches that high.', 'neutral'],
        ['soot', 'The shop man used to read out loud on Sundays. He stopped. I miss it more than I miss the sun, and I have never seen the sun.', 'sad'],
        ['milo', '*...I could read to you. If you found me a book small enough to carry.*', 'happy'],
        ['soot', 'There’s one on the floor by the door. It fell. I couldn’t pick it up; I don’t have the thumbs, or the courage.', 'neutral'],
        { do: () => G.EXT.startQuest('tq_soot', 'book') },
      ];
      if (q === 'book' && item('storybook')) return [
        ['soot', 'You found it. You really came back.', 'surprised'],
        { do: () => { G.EXT.setQuest('tq_soot', 'read'); } },
        ['milo', '*Budge up, then. I’ll start at the folded corner.*', 'happy'],
        ['soot', '...That one’s about the sea.', 'neutral'],
      ];
      if (q === 'read') return [
        ['milo', '*"...and the grey gulls turned, and the whole tide turned with them."*', 'neutral'],
        ['soot', 'Again. Please. The bit with the gulls.', 'happy'],
        { do: () => { game().take('storybook'); G.EXT.setQuest('tq_soot', 'done'); if (G.Extras && G.Extras.award) G.Extras.award('ach_soot'); } },
        ['soot', 'I’ve decided something. One day I am going to go and look at it. The sea.', 'happy'],
        ['milo', '*I’ve been. It’s loud, and it’s cold, and it’s the best thing there is.*', 'happy'],
        ['soot', 'Then I shall definitely go. Come back on Sundays. I’ll keep your place warm.', 'happy'],
      ];
      if (q === 'book') return [['soot', 'By the door. The little one. I promise it’s there.', 'neutral']];
      return [['soot', pick([
        'Sundays, remember. I’ll be on the poetry shelf.',
        'Somebody bought the book about lighthouses. I hope they read it properly.',
        'It’s quiet in here. That’s the whole point of here.',
      ]), 'happy']];
    },
  });

  /* ---- Biscuit: an old dog waiting at the bus stop */
  NPC.add({
    id: 'biscuit', name: 'Biscuit', kind: 'dog', sound: 'bark',
    look: { scale: 1.3, color: 0xd9b483, earColor: 0x9a7048, muzzle: 0xf0e6d2, collar: 0x8a2a2a },
    pos: g_(51.4, 96.6), yaw: -0.3, wander: 0.2, when: () => open(),
    lines: () => {
      const q = Q('tq_biscuit');
      if (!q) return [
        ['biscuit', 'Hullo, small one. Mind the bench, I’ve warmed it.', 'happy'],
        ['milo', '*Are you waiting for someone?*', 'neutral'],
        ['biscuit', 'My boy. He gets the four o’clock. Gets off right there, by the post.', 'happy'],
        ['biscuit', 'He’s been at the university some years now. But the bus still comes, so I still come.', 'neutral'],
        ['milo', '*...Would you like company while you wait?*', 'neutral'],
        ['biscuit', 'I would like that very much.', 'happy'],
        { do: () => G.EXT.startQuest('tq_biscuit', 'wait') },
      ];
      if (q === 'wait') return [['biscuit', 'Sit yourself down. It won’t be long. It’s never long, and it’s always long.', 'happy']];
      return [['biscuit', pick([
        'Good bus, that one. Not my boy. But a good bus.',
        'You came back. That’s twice now. You’re a regular.',
        'The posh cat pretends she doesn’t see me. She leaves half her bun on the bench. Every day.',
      ]), 'happy']];
    },
  });

  /* ================================================================ THINGS TO FIND AND DO */
  const add = (o) => G.INTERACT.push(o);

  /* the cushion in the treehouse, guarded by a snoozing squirrel's hoard */
  G.PICKUPS.push(
    { id: 'p_cushion', item: 'cushion', model: 'cushionItem', pos: [-21.2, 3.16, 92.2], when: () => Q('tq_cushion') === 'find', msg: 'A velvet cushion with a gold tassel, up in the treehouse. There are acorns tucked all round it. Rusty.' },
    { id: 'p_crumbs', item: 'crumbs', model: 'crumbsItem', pos: [63.2, 0.04, 78.9], when: () => Q('tq_pigeons') === 'crumbs', msg: 'A twist of paper under the café table, still half full of crumbs.' },
    { id: 'p_storybook', item: 'storybook', model: 'note', pos: [75.6, 0.04, 71.4], when: () => Q('tq_soot') === 'book', msg: 'A small book of seaside poems, face down by the bookshop door.' },
  );
  { const oMake = G.makeItem;
    G.makeItem = (id) => {
      if (id === 'cushionItem') {
        const g = new THREE.Group();
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.15), M.std('cushionVelvet', { color: 0x7a2a4a, rough: 0.9, map: 'fabric' }));
        c.position.y = 0.04; c.castShadow = true; g.add(c);
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.get('brass')); t.position.set(0.075, 0.03, 0.075); g.add(t);
        return g;
      }
      if (id === 'crumbsItem') {
        const g = new THREE.Group();
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 7), M.std('crumbBag', { color: 0xdccfae, rough: 0.95 }));
        b.position.y = 0.045; b.castShadow = true; g.add(b);
        for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), M.std('crumb', { color: 0xc9a86a, rough: 0.9 })); c.position.set((i - 1.5) * 0.02, 0.095, 0.01); g.add(c); }
        return g;
      }
      return oMake(id);
    }; }

  /* the paddling pool, the fountain and the treehouse: little joys */
  add({ id: 'tw_pool', pos: [4, 0.3, 93.6], r: 2.7, label: 'Splash in the paddling pool', anim: 'dig',
    when: () => open(), act: () => { A.play('splash'); game().say([['milo', '*Ice cold. Absolutely freezing. Milo does it again immediately.*', 'happy']]); if (G.Extras && G.Extras.award) G.Extras.award('ach_paddle'); } });
  add({ id: 'tw_fountain', pos: [71, 0.5, 89], r: 2.9, label: 'Drink from the fountain', anim: 'eat',
    when: () => open(), act: () => { A.play('drink'); game().say([['milo', '*Cold, clean and faintly of pennies. Ten out of ten.*', 'happy']]); } });
  add({ id: 'tw_flap', pos: [53.2, 0.2, 75.4], r: 0.8, label: 'Squeeze through the cat flap', anim: 'sniff',
    when: () => open(), act: () => { A.play('rustle'); game().travel([53.2, 0, 73.4], Math.PI); flag('bakeryIn'); if (G.Extras && G.Extras.award) G.Extras.award('ach_flap'); } });
  add({ id: 'tw_flapOut', pos: [53.2, 0.2, 73.6], r: 0.8, label: 'Slip back out of the bakery', anim: 'sniff',
    when: () => open(), act: () => { A.play('rustle'); game().travel([53.2, 0, 76], 0); } });

  /* market stalls: hide underneath */
  for (let i = 0; i < 4; i++) add({
    id: 'tw_stall' + i, pos: [56 + i * 5.4, 0.2, 98.5], r: 1.5, anim: 'sniff',
    label: 'Hide under the market stall',
    when: () => open() && T.isMarketDay(),
    act: () => game().say([['milo', '*Under a market stall is the second best place in the world. Cool, dark, and it rains crumbs.*', 'happy']]),
  });

  /* ================================================================ THE No. 4 BUS
     It arrives on the hour, waits a moment, and trundles off again. */
  const BUS = { m: null, t: 0, state: 'away', x: 120 };
  function makeBus() {
    if (BUS.m) return BUS.m;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 6.4), M.std('busBody', { color: 0x2f6f5a, rough: 0.45, metal: 0.2 }));
    body.position.y = 1.5; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.2, 6.2), M.std('busRoof2', { color: 0xf2ebe0, rough: 0.6 }));
    roof.position.y = 2.6; g.add(roof);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 1.2), M.get('glass'));
      w.position.set(s * 1.11, 1.9, -2.2 + i * 1.5); g.add(w);
    }
    const front = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.05), M.get('glass'));
    front.position.set(0, 1.9, 3.2); g.add(front);
    for (const [wx, wz] of [[-1.05, 2.1], [1.05, 2.1], [-1.05, -2.1], [1.05, -2.1]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.26, 14), M.std('busTyre', { color: 0x1a1a1e, rough: 0.9 }));
      wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.44, wz); wh.castShadow = true; g.add(wh);
    }
    // the destination blind
    const tex = R.text('busBlind', 256, 64, (g2, W2, H2) => { g2.fillStyle = '#1a2a22'; g2.fillRect(0, 0, W2, H2); g2.fillStyle = '#e8d98a'; g2.font = 'bold 30px Georgia'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('4  TOWN SQUARE', W2 / 2, H2 / 2 + 2); });
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, emissive: 0x332a10, emissiveIntensity: 0.5 }));
    bl.position.set(0, 2.42, 3.23); g.add(bl);
    g.traverse((m) => (m.userData.dynamic = true));
    g.visible = false; W.root.add(g);
    return (BUS.m = g);
  }
  T.bus = BUS;
  SQ.tick((dt, s, st) => {
    if (st !== 'play' || !G.game || !R.byId.square.built) return;
    const m = makeBus(), t = s.time || 12;
    const mins = (t % 1) * 60; // the bus is due on the hour, between 7am and 7pm
    const due = t > 7 && t < 19 && mins < 6;
    if (BUS.state === 'away' && due) { BUS.state = 'arriving'; BUS.x = 118; m.visible = true; }
    if (BUS.state === 'arriving') {
      BUS.x = U.damp(BUS.x, 53, 1.6, dt);
      if (BUS.x < 54.4) { BUS.state = 'stopped'; BUS.t = 0; A.play('hornbus', 0.5); busArrived(); }
    } else if (BUS.state === 'stopped') {
      BUS.x = U.damp(BUS.x, 53, 2.4, dt); // settle neatly alongside the shelter
      BUS.t += dt; if (BUS.t > 12) BUS.state = 'leaving';
    } else if (BUS.state === 'leaving') {
      BUS.x = U.damp(BUS.x, -30, 0.8, dt);
      if (BUS.x < -24) { BUS.state = 'away'; m.visible = false; }
    }
    if (m.visible) { m.position.set(BUS.x, 0, 93.2); m.rotation.y = -Math.PI / 2; }
    BUS.at[0] = BUS.x;
  });
  function busArrived() {
    const p = game().player.pos;
    if (Math.hypot(p.x - 50, p.z - 96) > 12) return;
    if (Q('tq_biscuit') === 'wait') {
      G.EXT.setQuest('tq_biscuit', 'done');
      if (G.Extras && G.Extras.award) G.Extras.award('ach_biscuit');
      setTimeout(() => game().say([
        ['biscuit', 'That’s her. Listen to the brakes. Always squeals at the corner.', 'happy'],
        ['biscuit', '...', 'neutral'],
        ['biscuit', 'No. Not today.', 'sad'],
        ['milo', '*I’m sorry, Biscuit.*', 'sad'],
        ['biscuit', 'Don’t be. He’ll come. And today I had somebody to wait with, which I haven’t had in a long while.', 'happy'],
        ['biscuit', 'Same time tomorrow, small one?', 'happy'],
        ['milo', '*Same time tomorrow.*', 'happy'],
      ]), 1400);
    }
  }
  BUS.at = [120, 0.4, 93.2]; // mutated each tick: G.INTERACT reads the array in place
  add({ id: 'tw_busride', pos: BUS.at, r: 2.6, label: 'Peer into the bus', anim: 'sniff',
    when: () => BUS.state === 'stopped', act: () => game().say([['milo', '*Warm, rumbly, and it smells of wet coats. One day, Milo. One day you ride the No. 4.*', 'happy']]) });
})();

/* =====================================================================
   world-town.js (part three) - the Allotments, the School and the Canal.
   ===================================================================== */
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, R = G.Regions, SQ = G.SQ, T = G.Town;
  const game = () => G.game, S = () => G.game.S;
  const grav = () => M.std('gravel', { map: 'dirt', color: 0xd8c8a8, rough: 1 });
  const paving = () => M.std('paving', { map: 'sidewalk', color: 0xd4cec2, rough: 0.9 });
  const rngOf = (seed) => U.rng(seed);

  /* ================================================================ THE ALLOTMENTS
     Vegetable plots, sheds, a greenhouse, compost heaps, a scarecrow, and
     a railway embankment along the south with a level crossing. */
  const AL = { x0: -54, x1: 2, z0: 108, z1: 152 };
  const RAIL_Z = 142, CROSS_X = -26;
  R.def({
    id: 'allot', name: 'The Allotments', bounds: [AL.x0, AL.x1, AL.z0, AL.z1], preload: 22,
    areas: [
      ['alShed', 'The Big Shed', -52, -46, 120.5, 126.5, { indoor: true, zone: 'garden', surf: 'wood', dim: 0.5 }],
      ['alGlass', 'The Greenhouse', -12, -2, 121, 129, { indoor: true, zone: 'garden', surf: 'stone' }],
      ['alRail', 'The Railway Embankment', -54, 2, 137, 147, { zone: 'town', surf: 'stone' }],
      ['allotments', 'The Allotments', -54, 2, 108, 152, { zone: 'garden', surf: 'soil' }],
    ],
    /* the layout: one path east-west along z 118, one path south along
       x -26 to the level crossing, and plots and buildings in the blocks */
    nav: {
      nodes: {
        alIn: [-10, 0, 110], alX: [-10, 0, 118], alMid: [-26, 0, 118], alW: [-43.5, 0, 118],
        alShedDoor: [-45, 0, 123.5], alShedIn: [-49, 0, 123.5], alGlassDoor: [-7, 0, 119.6], alGlassIn: [-7, 0, 124.5],
        alCompost: [-43.5, 0, 132], alS: [-26, 0, 135.4], alScare: [-8.6, 0, 135.4],
        alCross: [CROSS_X, 0, 142], alSouth: [CROSS_X, 0, 150],
      },
      edges: 'blS1-alIn alIn-alX alX-alMid alMid-alW alW-alShedDoor alShedDoor-alShedIn alX-alGlassDoor alGlassDoor-alGlassIn alW-alCompost alMid-alS alS-alCross alCross-alSouth alS-alScare',
    },
    build(ctx) {
      const { H, veg } = ctx, root = ctx.root, rng = rngOf(3131);
      /* ---- soil, and the gravel paths */
      H.plane(AL.x0 + 2, AL.x1 - 2, 110, 137, 0.008, M.std('allotSoil', { map: 'soil', color: 0x7a6247, rough: 1 }), 4);
      W.noGrass.push([AL.x0, AL.x1, 110, 148, 1]);
      R.path(ctx, [[-10, 108], [-10, 118]], 1.4, grav());
      R.path(ctx, [[-52, 118], [-2, 118]], 1.6, grav());
      R.path(ctx, [[-26, 118], [-26, 138]], 1.6, grav());
      R.path(ctx, [[-26, 135.4], [-4, 135.4]], 1.0, grav());
      /* ---- the plots, each with its own crop */
      const CROPS = [
        { c: 0x6a9a4a, h: 0.4, n: 14 }, { c: 0x9aa84a, h: 0.28, n: 18 }, { c: 0x4a8a5a, h: 0.55, n: 10 },
        { c: 0xc06a3a, h: 0.34, n: 12 }, { c: 0x7aba5a, h: 0.22, n: 22 }, { c: 0x5a7a3a, h: 0.48, n: 12 },
      ];
      const PLOTS = [
        [-46, 113.6, 8, 5], [-34.5, 113.6, 8, 5], [-19, 113.6, 7, 5], [-3.8, 113.6, 5.6, 5],   // north of the path
        [-36.5, 123, 8, 5], [-36.5, 131, 8, 5], [-19, 123, 7, 5], [-19, 131, 7, 5],           // south of the path
      ];
      PLOTS.forEach(([px, pz, pw, pd], k) => {
        const cr = CROPS[k % CROPS.length];
        for (const [ex, ez, ew, ed] of [[px, pz - pd / 2, pw, 0.12], [px, pz + pd / 2, pw, 0.12], [px - pw / 2, pz, 0.12, pd], [px + pw / 2, pz, 0.12, pd]])
          H.box({ w: ew, h: 0.18, d: ed, x: ex, y: 0, z: ez, mat: M.std('bedwood', { color: 0x7a5a3a, rough: 0.9, map: 'shedwood' }), climb: true });
        for (let i = 0; i < cr.n; i++) veg.bushes.push([px + (rng() - 0.5) * (pw - 0.8), cr.h * (0.7 + rng() * 0.6), pz + (rng() - 0.5) * (pd - 0.6), 0.22 + rng() * 0.14, cr.c, false]);
        // bean canes on every third plot
        if (k % 3 === 2) for (let i = 0; i < 4; i++) {
          const cx = px - pw / 2 + 1.2 + i * ((pw - 2.4) / 3);
          for (const s of [-1, 1]) H.cyl({ r: 0.02, h: 1.7, x: cx + s * 0.3, y: 0, z: pz + s * 0.5, mat: 'darkwood', col: false, rz: -s * 0.18 });
          H.cyl({ r: 0.015, h: 1.5, x: cx, y: 1.55, z: pz, mat: 'darkwood', col: false, rz: Math.PI / 2 });
        }
        if (k % 2) H.cyl({ r: 0.12, h: 0.22, x: px + pw / 2 - 0.5, z: pz - pd / 2 + 0.5, mat: M.std('canGalv', { color: 0x9aa0a8, rough: 0.4, metal: 0.5 }), col: true });
      });
      /* ---- the big shed, door facing east (the Bramblings live underneath) */
      { const sx0 = -52, sx1 = -46, sz0 = 120.5, sz1 = 126.5;
        H.wall(sx0, sz0, sx1, sz0, 2.3, 0.14, 'shedwood', 'shedwood', [], { s: 1.5, edge: 'shedwood' });
        H.wall(sx0, sz1, sx1, sz1, 2.3, 0.14, 'shedwood', 'shedwood', [], { s: 1.5, edge: 'shedwood' });
        H.wall(sx0, sz0, sx0, sz1, 2.3, 0.14, 'shedwood', 'shedwood', [], { s: 1.5, edge: 'shedwood' });
        H.wall(sx1, sz0, sx1, sz1, 2.3, 0.14, 'shedwood', 'shedwood', [[122.9, 124.1, 2]], { s: 1.5, edge: 'shedwood' });
        H.roofPrism(-49, 123.5, 6.4, 6.4, 2.3, 1.1, true, M.std('mossroof', { map: 'shingles', color: 0x7a8a6a }), M.get('shedwood'));
        H.plane(sx0, sx1, sz0, sz1, 0.02, 'planks', 1.6);
        const c = H.plane(sx0, sx1, sz0, sz1, 2.3, 'shedwood', 2); c.rotation.x = Math.PI; c.position.y = 2.3;
        // tools on the back wall, and a potting bench
        for (let i = 0; i < 4; i++) H.box({ w: 0.08, h: 1.5, d: 0.08, x: -51.6, y: 0.02, z: 121.4 + i * 0.3, mat: 'darkwood', col: false, rz: 0.08 });
        H.box({ w: 0.5, h: 0.06, d: 1.6, x: -51.5, y: 0.9, z: 125, mat: 'midwood', climb: true, colY0: -0.9 });
        // the hedgehogs' gap under the north wall
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12, 0, Math.PI), M.color(0x100b08, 1));
        hole.position.set(-49, 0.01, 120.4); hole.rotation.y = Math.PI; root.add(hole);
      }
      /* ---- the greenhouse, door facing the path */
      { const gx0 = -12, gx1 = -2, gz0 = 121, gz1 = 129;
        const glass = M.std('ghGlass2', { color: 0xcfe4e0, rough: 0.1, metal: 0.05, transparent: true, opacity: 0.32, envI: 1.4 });
        for (const [wx0, wz0, wx1, wz1, gaps] of [[gx0, gz0, gx1, gz0, [[-7.7, -6.3, 1.9]]], [gx0, gz1, gx1, gz1, []], [gx0, gz0, gx0, gz1, []], [gx1, gz0, gx1, gz1, []]])
          H.wall(wx0, wz0, wx1, wz1, 2.0, 0.08, glass, glass, gaps, { s: 1.4, edge: 'whitewood' });
        H.roofPrism(-7, 125, 10, 8, 2.0, 0.7, true, glass, glass);
        H.plane(gx0, gx1, gz0, gz1, 0.02, M.std('ghFloor2', { map: 'stone', color: 0xbdb5a6, rough: 0.95 }), 1.4);
        // staging along the east and west walls, tomatoes down the middle
        for (const bx of [-11.2, -2.8]) {
          H.box({ w: 1.1, h: 0.06, d: 7, x: bx, y: 0.75, z: 125, mat: 'midwood', climb: true, colY0: -0.75 });
          for (let i = 0; i < 6; i++) {
            H.box({ w: 0.3, h: 0.12, d: 0.42, x: bx, y: 0.81, z: 122.2 + i * 1.1, mat: M.std('seedtray', { color: 0x6a4a3a, rough: 0.9 }), col: false });
            veg.bushes.push([bx, 1.02, 122.2 + i * 1.1, 0.16, 0x6a9a4a, false]);
          }
        }
        for (let i = 0; i < 4; i++) { const tz = 123 + i * 1.7; H.cyl({ r: 0.02, h: 1.4, x: -7, y: 0, z: tz, mat: 'darkwood', col: false });
          for (let k = 0; k < 3; k++) veg.bushes.push([-7 + (rng() - 0.5) * 0.3, 0.4 + k * 0.4, tz + (rng() - 0.5) * 0.3, 0.2, 0x4a7a3a, false]);
          for (let k = 0; k < 2; k++) veg.flowers.push([-7 + (rng() - 0.5) * 0.4, tz + (rng() - 0.5) * 0.3, 0xd9412f]); }
        H.light(-7, 1.7, 125, 0xffe0a8, 0.5, 6, { night: true });
      }
      /* ---- compost bays, water butts and a wheelbarrow */
      for (const [cx, cz] of [[-48.6, 131], [-48.6, 134.6]]) {
        for (const [ex, ez, ew, ed] of [[cx, cz - 1.5, 2.6, 0.12], [cx, cz + 1.5, 2.6, 0.12], [cx - 1.3, cz, 0.12, 3], [cx + 1.3, cz, 0.12, 3]])
          H.box({ w: ew, h: 0.7, d: ed, x: ex, y: 0, z: ez, mat: 'shedwood', climb: true });
        H.sph({ x: cx, y: 0.34, z: cz, r: 1.1, sy: 0.42, sz: 1.2, mat: M.std('compost', { map: 'soil', color: 0x4a3a2a, rough: 1 }) });
      }
      for (const [bx, bz] of [[-44.6, 121.4], [-13.4, 120.2]]) {
        H.cyl({ r: 0.5, h: 1.2, x: bx, z: bz, mat: M.std('waterButt', { color: 0x3a5a4a, rough: 0.6 }), col: true, seg: 14 });
        H.cyl({ r: 0.46, h: 0.03, x: bx, y: 1.18, z: bz, mat: 'water', col: false, seg: 14 });
      }
      { const wb = new THREE.Group(); wb.position.set(-29.6, 0, 127); root.add(wb);
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 1.1), M.std('barrowTray', { color: 0x4a7a9a, rough: 0.5, metal: 0.3 }));
        tray.position.y = 0.42; tray.castShadow = true; wb.add(tray);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), M.std('barrowTyre', { color: 0x2a2a2e, rough: 0.9 }));
        wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.2, 0.68); wb.add(wheel);
        for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), M.get('midwood')); hd.rotation.x = Math.PI / 2 + 0.12; hd.position.set(s * 0.28, 0.4, -0.5); wb.add(hd); }
        wb.traverse((m) => (m.userData.dynamic = true));
        // high enough off the ground for Milo to hide underneath
        W.collider(-30, -29.2, 126.2, 127.8, 0.32, 0.55, { walk: true, cam: false }); }
      /* ---- the scarecrow, in its own patch by the southern path */
      { const sx = -6, sz = 133;
        for (let i = 0; i < 18; i++) veg.bushes.push([sx + (rng() - 0.5) * 4, 0.3 + rng() * 0.2, sz + (rng() - 0.5) * 2.4, 0.2 + rng() * 0.1, 0xc9a13a, false]);
        H.cyl({ r: 0.05, h: 1.9, x: sx, z: sz, mat: 'darkwood', col: true });
        H.box({ w: 1.5, h: 0.07, d: 0.07, x: sx, y: 1.45, z: sz, mat: 'darkwood', col: false });
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.3), M.std('scareShirt', { color: 0xb04a3a, rough: 0.95, map: 'fabric' }));
        shirt.position.set(sx, 1.2, sz); shirt.castShadow = true; root.add(shirt);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 9), M.std('scareHead', { color: 0xd9c08a, rough: 0.95, map: 'fabric' }));
        head.position.set(sx, 1.78, sz); head.castShadow = true; root.add(head);
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 10), M.std('scareHat', { color: 0x8a6a3a, rough: 0.9 }));
        hat.position.set(sx, 1.96, sz); hat.castShadow = true; root.add(hat);
        for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), M.std('straw', { color: 0xd9bc72, rough: 1 })); st.position.set(sx + s * 0.16, 1.66, sz + 0.06); st.rotation.z = s * 0.7; root.add(st); }
        // a heap of loose straw at his feet (where a hoglet might hide)
        H.sph({ x: sx - 0.8, y: 0.1, z: sz + 0.8, r: 0.45, sy: 0.35, mat: M.std('straw', { color: 0xd9bc72, rough: 1 }) });
        T.scarecrow = [sx, sz];
      }
      /* ---- the railway embankment along the south, with a level crossing */
      { const bz0 = RAIL_Z - 3.2, bz1 = RAIL_Z + 3.2;
        H.plane(AL.x0, AL.x1, bz0, bz1, 0.3, M.std('ballast', { map: 'stone', color: 0x8a8378, rough: 1 }), 2.2);
        // the ballast is a hop up anywhere except at the crossing, which has ramps
        W.collider(AL.x0, CROSS_X - 2.2, bz0, bz1, 0, 0.3, { climb: true, cam: false });
        W.collider(CROSS_X + 2.2, AL.x1, bz0, bz1, 0, 0.3, { climb: true, cam: false });
        // sleepers and two rails
        for (let x = AL.x0; x < AL.x1; x += 0.8)
          H.box({ w: 0.34, h: 0.08, d: 2.3, x, y: 0.3, z: RAIL_Z, mat: M.std('sleeper', { color: 0x4a3a2c, rough: 0.95, map: 'shedwood' }), col: false, cast: false });
        for (const s of [-1, 1])
          H.box({ w: AL.x1 - AL.x0, h: 0.1, d: 0.09, x: (AL.x0 + AL.x1) / 2, y: 0.38, z: RAIL_Z + s * 0.72, mat: M.std('railSteel', { color: 0xa8a29a, rough: 0.28, metal: 0.85 }), col: false, cast: false });
        // lineside fence, with the crossing left open
        for (const fz of [bz0 - 0.4, bz1 + 0.4])
          T.props.picket(H, AL.x0 + 1, fz, AL.x1 - 1, fz, { h: 0.9, color: 0x8a8a84, gaps: [[CROSS_X - 2.2, CROSS_X + 2.2]] });
        // the crossing deck
        H.plane(CROSS_X - 2.2, CROSS_X + 2.2, bz0, bz1, 0.42, 'planks', 1.4);
        W.collider(CROSS_X - 2.2, CROSS_X + 2.2, bz0, bz1, 0, 0.42, { cam: false });
        R.ramp(ctx, CROSS_X, bz0 - 1.4, 0.02, CROSS_X, bz0, 0.42, 4.4, 'planks');
        R.ramp(ctx, CROSS_X, bz1, 0.42, CROSS_X, bz1 + 1.4, 0.02, 4.4, 'planks');
        R.path(ctx, [[CROSS_X, bz1], [CROSS_X, 150]], 1.4, grav());
        // the flashing light and its bell post, one each side
        T.crossLights = [];
        for (const s of [-1, 1]) {
          const px = CROSS_X + s * 2.8, pz = RAIL_Z - s * 4.4;
          H.cyl({ r: 0.07, h: 2.2, x: px, z: pz, mat: M.std('crossPost', { color: 0xf2ece0, rough: 0.7 }), col: true });
          const X = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.05), M.std('crossX', { color: 0xf2ece0, rough: 0.7 }));
          X.position.set(px, 2.36, pz); X.rotation.z = 0.7; root.add(X);
          const X2 = X.clone(); X2.rotation.z = -0.7; root.add(X2);
          for (const ls of [-1, 1]) {
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), M.std('crossLampOff', { color: 0x6a2a24, rough: 0.5 }));
            lamp.position.set(px + ls * 0.26, 2.0, pz + 0.08); lamp.userData.dynamic = true; root.add(lamp);
            T.crossLights.push({ m: lamp, side: ls });
          }
        }
        T.crossing = [CROSS_X, RAIL_Z];
      }
      /* ---- greenery round the edges */
      veg.grass.push([AL.x0 + 2, AL.x1 - 2, 108, 112, 1], [AL.x0 + 2, AL.x1 - 2, 147, 151, 1.2]);
      for (const [tx, tz, s] of [[-52, 112, 1.2], [-52, 148, 1.1], [0, 150, 1], [-50, 128, 0.9]]) veg.trees.push([tx, tz, s, 'oak']);
      for (let i = 0; i < 30; i++) veg.ferns.push([AL.x0 + 2 + rng() * 52, 147.5 + rng() * 3.5, 0.6 + rng() * 0.5, 'tall']);
      R.sign(ctx, -7.6, 110.6, Math.PI, 'THE ALLOTMENTS', { w: 1.6, h: 1.3, bg: '#4a6a2a' });
      /* ---- open north to Birch Lane, south over the crossing to the canal */
      R.walls(AL.x0, AL.x1, AL.z0, AL.z1, 0, 5, { n: [[-12, -8]], s: [[CROSS_X - 2.2, CROSS_X + 2.2]], e: [], w: [] });
    },
  });
  T.regions.allot = R.byId.allot;

  /* ================================================================ THE SCHOOL
     Larkspur Primary: a playground with swings, a slide, a climbing frame
     and a sandpit, and a bell that rings out the school day. */
  const SC = { x0: 2, x1: 60, z0: 108, z1: 152 };
  R.def({
    id: 'school', name: 'The School', bounds: [SC.x0, SC.x1, SC.z0, SC.z1], preload: 22,
    areas: [
      ['scHall', 'Larkspur Primary', 30, 52, 112, 124, { indoor: true, zone: 'house2', surf: 'wood' }],
      ['scPlay', 'The Playground', 6, 28, 118, 140, { zone: 'town', surf: 'stone' }],
      ['scSand', 'The Sandpit', 8, 14, 132, 138, { zone: 'town', surf: 'sand' }],
      ['school', 'Larkspur Primary', 2, 60, 108, 152, { zone: 'town', surf: 'grass' }],
    ],
    nav: {
      nodes: {
        scIn: [22, 0, 109], scGate: [22, 0, 116], scYard: [18, 0, 126], scSwing: [10, 0, 122], scFrame: [22, 0, 134],
        scSand: [11, 0, 135], scDoor: [40, 0, 125], scHallIn: [40, 0, 118], scField: [44, 0, 142], scSouth: [30, 0, 150],
      },
      edges: 'blS2-scIn scIn-scGate scGate-scYard scYard-scSwing scYard-scFrame scYard-scSand scGate-scDoor scDoor-scHallIn scYard-scField scField-scSouth',
    },
    build(ctx) {
      const { H, veg } = ctx, root = ctx.root, rng = rngOf(4242);
      /* ---- the playground tarmac and the playing field */
      H.plane(6, 28, 118, 140, 0.01, M.std('playTarmac', { map: 'asphalt', color: 0x8a8580, rough: 0.9 }), 5);
      W.noGrass.push([4, 30, 116, 142, 1], [28, 56, 110, 128, 1]);
      R.path(ctx, [[22, 108], [22, 116], [20, 122], [18, 126]], 1.6, paving());
      R.path(ctx, [[22, 116], [32, 120], [40, 124]], 1.4, paving());
      veg.grass.push([30, 58, 128, 150, 1.3], [4, 28, 142, 150, 1.2]);
      /* ---- painted markings: a hopscotch grid and a running track ring */
      { const paint = M.std('playPaint', { color: 0xf2e6c0, rough: 0.9 });
        for (let i = 0; i < 6; i++) H.box({ w: 0.9, h: 0.008, d: 0.9, x: 24.6, y: 0.02, z: 120 + i * 1, mat: paint, col: false, cast: false });
        for (let i = 0; i < 28; i++) { const a = (i / 28) * 6.283; H.box({ w: 0.5, h: 0.008, d: 0.12, x: 17 + Math.cos(a) * 7, y: 0.02, z: 130 + Math.sin(a) * 7, mat: paint, ry: -a, col: false, cast: false }); } }
      /* ---- the school building */
      { const bx0 = 30, bx1 = 52, bz0 = 112, bz1 = 124;
        const brick = M.std('schoolBrick', { map: 'brick', color: 0xc9a08a, rough: 0.9 });
        H.wall(bx0, bz0, bx1, bz0, 4.2, 0.26, brick, brick, [], { s: 2.4, edge: brick });
        H.wall(bx0, bz1, bx1, bz1, 4.2, 0.26, brick, brick, [[38.8, 41.2, 2.4]], { s: 2.4, edge: brick });
        H.wall(bx0, bz0, bx0, bz1, 4.2, 0.26, brick, brick, [], { s: 2.4, edge: brick });
        H.wall(bx1, bz0, bx1, bz1, 4.2, 0.26, brick, brick, [], { s: 2.4, edge: brick });
        H.roofPrism(41, 118, 22, 12, 4.2, 2.2, true, M.get('shingles'), M.get('shingles'));
        W.collider(bx0, bx1, bz0, bz1, 0, 4.2, { cam: false });
        H.plane(bx0, bx1, bz0, bz1, 0.02, 'planks', 2);
        // tall classroom windows
        for (let i = 0; i < 5; i++) {
          H.windowAt(32.5 + i * 4.2, 1.9, bz1 - 0.02, Math.PI, 1.5, 1.9, { sill: true });
          T.litWindows.push({ x: 32.5 + i * 4.2, y: 1.9, z: bz1 + 0.5, night: false });
        }
        // the door, a step, and a painted name board
        H.box({ w: 2.4, h: 2.4, d: 0.08, x: 40, y: 0, z: bz1 + 0.13, mat: M.std('schoolDoor', { color: 0x2f5f4a, rough: 0.5, map: 'paintwood' }), col: false });
        H.box({ w: 3, h: 0.14, d: 0.7, x: 40, y: 0, z: bz1 + 0.5, mat: 'stone', climb: true });
        R.sign(ctx, 44.6, bz1 + 0.3, Math.PI, 'LARKSPUR PRIMARY', { w: 2.2, h: 2.6, bg: '#2f4f6a' });
        // the bell in a little gable housing
        { const bh = new THREE.Group(); bh.position.set(41, 6.5, 118); root.add(bh);
          const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.36, 12, 1, true), M.get('brass'));
          bell.position.y = -0.2; bh.add(bell);
          for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), M.get('darkwood')); p.position.set(s * 0.34, 0, 0); bh.add(p); }
          const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), M.get('darkwood')); top.position.y = 0.4; bh.add(top);
          bh.traverse((m) => { m.castShadow = true; m.userData.dynamic = true; });
          T.schoolBell = [41, 118]; }
      }
      /* ---- the swings */
      { const sx = 10, sz = 122;
        for (const s of [-1, 1]) for (const d of [-1, 1])
          H.cyl({ r: 0.06, h: 2.5, x: sx + s * 2.2, z: sz + d * 0.8, mat: M.std('frameSteel', { color: 0x3a6a8a, rough: 0.4, metal: 0.5 }), col: true, rz: -s * 0.28 });
        H.box({ w: 4.8, h: 0.1, d: 0.1, x: sx, y: 2.42, z: sz, mat: M.std('frameSteel', { color: 0x3a6a8a, rough: 0.4, metal: 0.5 }), col: false });
        T.swings = [];
        for (const ox of [-1.3, 1.3]) {
          const sw = new THREE.Group(); sw.position.set(sx + ox, 2.42, sz); root.add(sw);
          for (const s of [-1, 1]) { const ch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 5), M.get('chrome')); ch2.position.set(s * 0.22, -0.85, 0); sw.add(ch2); }
          const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.2), M.std('swingSeat', { color: 0x2a2a2e, rough: 0.8 }));
          seat.position.y = -1.7; seat.castShadow = true; sw.add(seat);
          sw.traverse((m) => (m.userData.dynamic = true));
          T.swings.push({ g: sw, ph: ox });
        }
      }
      /* ---- the slide: steps up, a shiny chute down */
      { const lx = 25, lz = 122;
        for (let i = 0; i < 7; i++) H.box({ w: 0.8, h: 0.05, d: 0.26, x: lx, y: 0.34 + i * 0.28, z: lz + 1.4 - i * 0.22, mat: M.std('frameSteel', { color: 0x3a6a8a, rough: 0.4, metal: 0.5 }), climb: true });
        H.plane(lx - 0.45, lx + 0.45, lz - 0.3, lz + 0.1, 2.3, M.get('metal'), 1);
        W.collider(lx - 0.45, lx + 0.45, lz - 0.3, lz + 0.1, 2.06, 2.3, { cam: false, name: 'slideTop' });
        for (const s of [-1, 1]) H.cyl({ r: 0.05, h: 2.3, x: lx + s * 0.45, z: lz + 0.1, mat: M.std('frameSteel', { color: 0x3a6a8a, rough: 0.4, metal: 0.5 }), col: true });
        // the chute, sloping north
        const chute = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 3.6), M.std('slideChute', { color: 0xd9d4c8, rough: 0.16, metal: 0.65 }));
        chute.position.set(lx, 1.32, lz - 2.1); chute.rotation.x = 0.52; chute.castShadow = true; root.add(chute);
        R.ramp(ctx, lx, lz - 0.4, 2.2, lx, lz - 3.8, 0.1, 0.85, 'metal', { noVis: true });
        for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 3.6), M.std('slideChute', { color: 0xd9d4c8, rough: 0.16, metal: 0.65 })); rail.position.set(lx + s * 0.44, 1.42, lz - 2.1); rail.rotation.x = 0.52; root.add(rail); }
        T.slide = [lx, lz];
      }
      /* ---- the climbing frame: a cube of bars Milo can actually climb */
      { const fx = 22, fz = 134, s = 2.4, steel = M.std('frameSteel', { color: 0x3a6a8a, rough: 0.4, metal: 0.5 });
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) H.cyl({ r: 0.055, h: 2.6, x: fx + dx * s, z: fz + dz * s, mat: steel, col: true, climb: true });
        for (const y of [0.85, 1.7, 2.55]) {
          for (const dz of [-1, 1]) { H.box({ w: s * 2, h: 0.07, d: 0.07, x: fx, y, z: fz + dz * s, mat: steel, col: false }); W.collider(fx - s, fx + s, fz + dz * s - 0.12, fz + dz * s + 0.12, y - 0.1, y, { climb: true, cam: false }); }
          for (const dx of [-1, 1]) { H.box({ w: 0.07, h: 0.07, d: s * 2, x: fx + dx * s, y, z: fz, mat: steel, col: false }); W.collider(fx + dx * s - 0.12, fx + dx * s + 0.12, fz - s, fz + s, y - 0.1, y, { climb: true, cam: false }); }
        }
        // a plank deck across the top so there is somewhere to sit
        H.plane(fx - s, fx + s, fz - 0.9, fz + 0.9, 2.62, 'planks', 1.2);
        W.collider(fx - s, fx + s, fz - 0.9, fz + 0.9, 2.4, 2.62, { cam: false, name: 'frameTop' });
        T.climbFrame = [fx, fz];
      }
      /* ---- the sandpit */
      { const px = 11, pz = 135;
        H.plane(px - 3, px + 3, pz - 3, pz + 3, 0.06, M.std('playSand', { map: 'grass', color: 0xe0cf9a, rough: 1 }), 2);
        for (const [ex, ez, ew, ed] of [[px, pz - 3, 6.4, 0.24], [px, pz + 3, 6.4, 0.24], [px - 3, pz, 0.24, 6.4], [px + 3, pz, 0.24, 6.4]])
          H.box({ w: ew, h: 0.26, d: ed, x: ex, y: 0, z: ez, mat: 'midwood', climb: true });
        // a bucket, a spade and a half-finished castle
        H.cyl({ r: 0.16, rt: 0.2, h: 0.24, x: px + 1.4, y: 0.06, z: pz - 1, mat: M.std('sandBucket', { color: 0xd9573b, rough: 0.5 }), col: true });
        H.box({ w: 0.05, h: 0.5, d: 0.14, x: px - 1.2, y: 0.06, z: pz + 0.8, mat: M.std('sandSpade', { color: 0x3f6fa0, rough: 0.5 }), col: false, rz: 0.4 });
        for (let i = 0; i < 3; i++) H.cyl({ r: 0.22 - i * 0.05, h: 0.18, x: px - 0.4, y: 0.06 + i * 0.18, z: pz - 0.6, mat: M.std('sandcastleM', { map: 'grass', color: 0xd8c48a, rough: 1 }), col: i === 0, seg: 10 });
        T.sandpit = [px, pz];
      }
      /* ---- the crossing outside the gate, where the lollipop lady stands */
      { H.plane(19, 25, 108.6, 111.4, 0.02, M.std('zebra', { color: 0x3a3a3c, rough: 0.9 }), 2);
        for (let i = 0; i < 5; i++) H.box({ w: 0.7, h: 0.008, d: 2.6, x: 19.8 + i * 1.1, y: 0.03, z: 110, mat: M.std('zebraWhite', { color: 0xf4efe2, rough: 0.85 }), col: false, cast: false });
        for (const s of [-1, 1]) { H.cyl({ r: 0.06, h: 1.9, x: 22 + s * 3.6, z: 110, mat: 'whitewood', col: true });
          const gl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 9), M.std('belisha', { color: 0xf2c14e, rough: 0.4, emissive: 0xf2a020, ei: 0.3 }));
          gl.position.set(22 + s * 3.6, 2.02, 110); gl.userData.dynamic = true; root.add(gl); }
        T.crossingSchool = [22, 110]; }
      /* ---- school railings and gates */
      T.props.picket(H, 4, 116, 28, 116, { h: 1.1, color: 0x2f5f4a, gaps: [[20.6, 23.4]] });
      T.props.picket(H, 4, 116, 4, 142, { h: 1.1, color: 0x2f5f4a, gaps: [] });
      T.props.picket(H, 4, 142, 28, 142, { h: 1.1, color: 0x2f5f4a, gaps: [[15.4, 16.6]] });
      W.collider(15.3, 16.7, 141.4, 142.6, 0, 0.4, { name: 'schoolRailGap' });
      /* ---- trees, benches, a bike rack */
      for (const [tx, tz, s, k] of [[6, 112, 1.1, 'birch'], [56, 114, 1.3, 'oak'], [56, 148, 1.2, 'oak'], [8, 148, 1.1, 'birch'], [50, 134, 1, 'oak']]) veg.trees.push([tx, tz, s, k]);
      for (const [bx, bz] of [[27, 128], [27, 136]]) { H.box({ w: 0.42, h: 0.1, d: 1.6, x: bx, y: 0.42, z: bz, mat: 'midwood', climb: true, colY0: -0.42 }); }
      for (let i = 0; i < 5; i++) { const rx = 32 + i * 0.5; H.cyl({ r: 0.03, h: 0.5, x: rx, z: 127, mat: 'darkmetal', col: false }); H.cyl({ r: 0.03, h: 0.5, x: rx, z: 128, mat: 'darkmetal', col: false }); H.box({ w: 0.04, h: 0.04, d: 1, x: rx, y: 0.5, z: 127.5, mat: 'darkmetal', col: false }); }
      /* ---- open north to Birch Lane and south to the canal */
      R.walls(SC.x0, SC.x1, SC.z0, SC.z1, 0, 6, { n: [[20, 24]], s: [[28, 32]], e: [], w: [] });
      R.sign(ctx, 26.6, 113.6, Math.PI, 'LARKSPUR PRIMARY', { w: 1.7, h: 1.3, bg: '#2f4f6a' });
    },
  });
  T.regions.school = R.byId.school;

  /* ================================================================ THE CANAL
     A towpath, a moored narrowboat, a lock with working-looking gates,
     ducks, reeds and a footbridge over to the far bank. */
  const CA = { x0: -54, x1: 100, z0: 152, z1: 180 };
  const W_Z0 = 162, W_Z1 = 170, W_Y = -0.55; // the cut itself
  R.def({
    id: 'canal', name: 'The Canal', bounds: [CA.x0, CA.x1, CA.z0, CA.z1], preload: 26,
    // the ground drops to the canal bed under the water, so the cut is a real cut
    terrains: [{ x0: CA.x0, x1: CA.x1, z0: W_Z0, z1: W_Z1, h: () => W_Y - 0.4 }],
    areas: [
      ['caLock', 'Larkspur Lock', 30, 46, 158, 174, { zone: 'town', surf: 'stone' }],
      ['caBoat', 'The Narrowboat', -6, 12, 160, 168, { zone: 'town', surf: 'wood' }],
      ['caFar', 'The Far Bank', -54, 100, 170, 180, { zone: 'garden', surf: 'grass' }],
      ['canal', 'The Canal', -54, 100, 152, 180, { zone: 'town', surf: 'grass' }],
    ],
    nav: {
      nodes: {
        caW: [-26, 0, 158], caMid: [16, 0, 158], caLock: [38, 0, 158], caE: [66, 0, 158],
        caBoat: [3, 0, 160.5], caBridgeS: [60, 0, 158.2], caBridge: [60, 1.5, 166], caFar: [60, 0, 174.4], caQuack: [-12, 0, 160],
      },
      edges: 'alSouth-caW scSouth-caMid caW-caMid caMid-caLock caLock-caE caMid-caBoat caE-caBridgeS caBridgeS-caBridge caBridge-caFar caW-caQuack',
    },
    build(ctx) {
      const { H, veg } = ctx, root = ctx.root, rng = rngOf(5353);
      /* ---- the cut: banks, water and a stone edge */
      H.plane(CA.x0, CA.x1, W_Z0 - 0.5, W_Z1 + 0.5, W_Y - 0.4, M.std('canalBed', { map: 'soil', color: 0x4a4436, rough: 1 }), 4);
      R.water(ctx, CA.x0, CA.x1, W_Z0, W_Z1, W_Y, { name: 'the canal', s: 6 });
      // coping stones along both banks, and the drop into the water
      for (const [bz, side] of [[W_Z0, -1], [W_Z1, 1]]) {
        H.box({ w: CA.x1 - CA.x0, h: 0.3, d: 0.5, x: (CA.x0 + CA.x1) / 2, y: -0.3, z: bz + side * 0.25, mat: M.std('coping', { map: 'stone', color: 0xb0a898, rough: 0.9 }), col: false });
        H.wall(CA.x0, bz, CA.x1, bz, 0.02, 0.5, 'stonewall', 'stonewall', [], { s: 2, edge: 'stonewall', y: W_Y });
      }
      /* ---- the towpath on the near bank, grass on the far one */
      H.plane(CA.x0, CA.x1, 156, W_Z0, 0.01, M.std('towpath', { map: 'dirt', color: 0xc8b898, rough: 1 }), 4);
      W.noGrass.push([CA.x0, CA.x1, 155.5, W_Z0 + 0.5, 1], [45.2, 48.8, 152, 155.7, 1]); // the towpath, and inside the lock-keeper's hut
      veg.grass.push([CA.x0 + 2, CA.x1 - 2, 152, 155.5, 1.2], [CA.x0 + 2, CA.x1 - 2, W_Z1 + 1, 179, 1.4]);
      R.path(ctx, [[-26, 152], [-26, 156]], 1.4, grav());
      R.path(ctx, [[30, 152], [30, 156]], 1.4, grav());
      /* ---- reeds and lilies along the edges */
      for (let i = 0; i < 150; i++) {
        const x = CA.x0 + 2 + rng() * (CA.x1 - CA.x0 - 4), edge = rng() < 0.5;
        const z = edge ? W_Z0 + 0.3 + rng() * 0.8 : W_Z1 - 1.1 + rng() * 0.8;
        if (x > 28 && x < 48) continue; // keep the lock clear
        veg.ferns.push([x, z, 0.8 + rng() * 0.7, 'reed']);
      }
      /* ---- the narrowboat "Kingfisher", moored on the near bank */
      { const bx = 3, bz = 164.2, L = 14, Wd = 2.1;
        const hull = new THREE.Mesh(new THREE.BoxGeometry(L, 1.0, Wd), M.std('boatHull2', { color: 0x1f4a3a, rough: 0.5 }));
        hull.position.set(bx, W_Y + 0.28, bz); hull.castShadow = true; root.add(hull);
        // pointed bow and stern: triangular prisms whose flat side matches the hull
        { const r = Wd / Math.sqrt(3);
          for (const s of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.0, 3), M.std('boatHull2', { color: 0x1f4a3a, rough: 0.5 })); w2.rotation.y = s * Math.PI / 2; w2.position.set(bx + s * (L / 2 + r / 2), W_Y + 0.28, bz); w2.castShadow = true; root.add(w2); }
          W.collider(bx - L / 2 - r, bx + L / 2 + r, bz - Wd / 4, bz + Wd / 4, W_Y, W_Y + 0.78, { cam: false }); }
        // the cabin, roofed in red with a cream band
        const cab = new THREE.Mesh(new THREE.BoxGeometry(9, 1.05, Wd - 0.2), M.std('boatCab2', { color: 0x1f4a3a, rough: 0.5 }));
        cab.position.set(bx - 1, W_Y + 1.28, bz); cab.castShadow = true; root.add(cab);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.12, Wd), M.std('boatRoof', { color: 0xa8342a, rough: 0.6 }));
        roof.position.set(bx - 1, W_Y + 1.86, bz); roof.castShadow = true; root.add(roof);
        // the deck and roof are solid: Milo can get aboard
        W.collider(bx - L / 2, bx + L / 2, bz - Wd / 2, bz + Wd / 2, W_Y, W_Y + 0.78, { cam: false, name: 'boatDeck' });
        W.collider(bx - 5.6, bx + 3.6, bz - Wd / 2, bz + Wd / 2, W_Y + 0.78, W_Y + 1.86, { cam: false });
        W.collider(bx - 5.6, bx + 3.6, bz - Wd / 2, bz + Wd / 2, W_Y + 1.7, W_Y + 1.92, { cam: false, name: 'boatRoofTop' });
        // portholes, a chimney, a tiller and the name board
        for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
          const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), M.get('brass'));
          ph.rotation.x = Math.PI / 2; ph.position.set(bx - 4.6 + i * 1.9, W_Y + 1.3, bz + s * (Wd / 2 - 0.08)); root.add(ph);
        }
        H.cyl({ r: 0.11, h: 0.62, x: bx - 4, y: W_Y + 1.86, z: bz, mat: M.std('boatFlue', { color: 0x2a2a2e, rough: 0.7, metal: 0.3 }), col: false });
        H.cyl({ r: 0.035, h: 0.9, x: bx + 5.6, y: W_Y + 0.78, z: bz, mat: 'darkwood', col: false, rz: 0.5 });
        { const tex = R.text('boatName', 320, 80, (g2, W2, H2) => { g2.fillStyle = '#1f4a3a'; g2.fillRect(0, 0, W2, H2); g2.fillStyle = '#f2e0a8'; g2.font = 'bold italic 44px Georgia'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('Kingfisher', W2 / 2, H2 / 2 + 2); });
          for (const s of [-1, 1]) { const nb = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); nb.position.set(bx + 3.4, W_Y + 1.3, bz + s * (Wd / 2 + 0.01)); nb.rotation.y = s > 0 ? 0 : Math.PI; root.add(nb); } }
        // pots of flowers on the roof, and a gangplank ashore
        for (let i = 0; i < 4; i++) { const px = bx - 4.2 + i * 2.2; H.cyl({ r: 0.16, h: 0.2, x: px, y: W_Y + 1.92, z: bz + 0.5, mat: M.std('flowerPot', { color: 0xb5613a, rough: 0.9 }), col: false });
          for (let k = 0; k < 4; k++) veg.flowers.push([px + (rng() - 0.5) * 0.3, bz + 0.5 + (rng() - 0.5) * 0.3, [0xd9412f, 0xe8d98a, 0xe7a0b0][k % 3]]); }
        R.ramp(ctx, bx + 4, W_Z0 - 0.1, 0.02, bx + 4, bz - Wd / 2, W_Y + 0.78, 0.7, 'midwood');
        // mooring ropes and bollards
        for (const ox of [-6, 6]) { H.cyl({ r: 0.1, h: 0.4, x: bx + ox, y: 0, z: W_Z0 - 0.9, mat: 'darkmetal', col: true, seg: 10 });
          const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 5), M.std('rope2', { color: 0xc8b48a, rough: 1 }));
          rope.position.set(bx + ox * 0.9, W_Y + 0.7, W_Z0 - 0.3); rope.rotation.set(0.7, 0, ox > 0 ? -0.5 : 0.5); root.add(rope); }
        T.boat = [bx, bz];
      }
      /* ---- the lock: two chambers of stone, gates at each end, a beam to push */
      { const lx0 = 32, lx1 = 44;
        for (const bz of [W_Z0, W_Z1]) H.box({ w: lx1 - lx0, h: 1.4, d: 1.2, x: (lx0 + lx1) / 2, y: W_Y, z: bz + (bz === W_Z0 ? -0.6 : 0.6), mat: M.std('lockStone', { map: 'stonewall', color: 0xa39a88, rough: 0.95 }), climb: true });
        T.lockGates = [];
        for (const [gx, side] of [[lx0, -1], [lx1, 1]]) {
          for (const half of [-1, 1]) {
            const piv = new THREE.Group(); piv.position.set(gx, W_Y, half < 0 ? W_Z0 + 0.1 : W_Z1 - 0.1); root.add(piv);
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 4.1), M.std('lockGate', { color: 0x3a2f22, rough: 0.9, map: 'shedwood' }));
            leaf.position.set(0, 1.0, half < 0 ? 2.0 : -2.0); leaf.castShadow = true; piv.add(leaf);
            // the balance beam sticking out over the bank
            const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 3.4), M.get('darkwood'));
            beam.position.set(0, 2.0, half < 0 ? -1.5 : 1.5); beam.castShadow = true; piv.add(beam);
            piv.traverse((m) => (m.userData.dynamic = true));
            piv.rotation.y = half * 0.5;
            T.lockGates.push({ g: piv, half, side, open: true });
          }
        }
        // the lock walls stop Milo falling in, but the beams are walkable
        for (const [gx] of [[lx0], [lx1]]) W.collider(gx - 0.3, gx + 0.3, W_Z0, W_Z1, W_Y, W_Y + 0.4, { climb: true, cam: false });
        R.sign(ctx, 38, 157.4, 0, 'LARKSPUR LOCK', { w: 1.5, h: 1.2, bg: '#3a4f2a' });
      }
      /* ---- the footbridge over to the far bank */
      { const bx = 60;
        R.ramp(ctx, bx, 158.4, 0.02, bx, 161.4, 1.5, 1.4, 'midwood');
        R.bridge(ctx, bx, W_Z0 - 0.6, bx, W_Z1 + 0.6, 1.5, 1.4, { name: 'canalBridge' });
        R.ramp(ctx, bx, W_Z1 + 0.6, 1.5, bx, 173.6, 0.02, 1.4, 'midwood');
        for (const s of [-1, 1]) H.cyl({ r: 0.1, h: 1.6, x: bx + s * 0.7, y: 0, z: W_Z0 - 0.7, mat: 'darkwood', col: false });
      }
      /* ---- the far bank: a hedge, a couple of willows, a bench */
      H.hedge(CA.x0 + 2, 178.6, CA.x1 - 2, 178.6, 1.8, 1.2, [[58, 62, 0.4]]);
      for (const [tx, tz, s, k] of [[-30, 174, 1.4, 'willow'], [18, 175, 1.3, 'willow'], [78, 174, 1.2, 'willow'], [-48, 156, 1.1, 'oak'], [92, 157, 1.2, 'oak']]) veg.trees.push([tx, tz, s, k]);
      H.box({ w: 1.7, h: 0.1, d: 0.44, x: 52, y: 0.44, z: 158.6, mat: 'midwood', climb: true, colY0: -0.44 });
      for (const [lx] of [[-20], [16], [52], [86]]) T.lamp(W.h, lx, 155.4, {});
      /* ---- a lock-keeper's hut and a pile of coal */
      { const hx = 47, hz = 153.9; // set back off the towpath, door facing it
        H.wall(hx - 1.6, hz - 1.6, hx + 1.6, hz - 1.6, 2.2, 0.16, 'stonewall', 'stonewall', [], { s: 1.4, edge: 'stonewall' });
        H.wall(hx - 1.6, hz + 1.6, hx + 1.6, hz + 1.6, 2.2, 0.16, 'stonewall', 'stonewall', [[hx - 0.55, hx + 0.55, 1.9]], { s: 1.4, edge: 'stonewall' });
        H.wall(hx - 1.6, hz - 1.6, hx - 1.6, hz + 1.6, 2.2, 0.16, 'stonewall', 'stonewall', [], { s: 1.4, edge: 'stonewall' });
        H.wall(hx + 1.6, hz - 1.6, hx + 1.6, hz + 1.6, 2.2, 0.16, 'stonewall', 'stonewall', [], { s: 1.4, edge: 'stonewall' });
        H.roofPrism(hx, hz, 3.4, 3.4, 2.2, 1.0, true, M.get('shingles'), M.get('shingles'));
        H.plane(hx - 1.6, hx + 1.6, hz - 1.6, hz + 1.6, 0.02, 'planks', 1.4); // walk in through the door; the walls collide on their own
        const hc = H.plane(hx - 1.6, hx + 1.6, hz - 1.6, hz + 1.6, 2.2, 'plaster', 2); hc.rotation.x = Math.PI; hc.position.y = 2.2;
        for (let i = 0; i < 9; i++) { const a = rng() * 6.28, r2 = rng() * 0.7; H.sph({ x: 50.4 + Math.cos(a) * r2, y: 0.08 + rng() * 0.12, z: 154 + Math.sin(a) * r2, r: 0.1 + rng() * 0.06, mat: M.std('coal', { color: 0x1c1c1e, rough: 0.9 }) }); } }
      /* ---- boundary: open north to the allotments and the school */
      R.walls(CA.x0, CA.x1, CA.z0, CA.z1, 0, 6, { n: [[-28, -24], [28, 32], [64, 70]], s: [], e: [], w: [] });
      R.sign(ctx, -23.4, 154.4, 0, 'THE TOWPATH', { w: 1.4, h: 1.2, bg: '#3a4f2a' });
    },
  });
  T.regions.canal = R.byId.canal;
})();

/* =====================================================================
   world-town.js (part four) - life in the allotments, the school and on
   the canal: four more animals, four townsfolk on routines, the train,
   the school bell, and the rest of the collectibles and dig spots.
   ===================================================================== */
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, R = G.Regions, NPC = G.NPC, SQ = G.SQ, T = G.Town;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI, C = () => G.Cast, K = () => G.Kit;
  const has = (k) => !!(G.game && G.game.S.flags[k]);
  const flag = (k, v = true) => game().flag(k, v);
  const Q = (id) => (S().quests || {})[id];
  const item = (id) => G.game.hasItem(id);
  const open = () => T.open();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const g_ = (x, z) => [x, 'g', z];
  const add = (o) => G.INTERACT.push(o);
  const award = (id) => G.Extras && G.Extras.award && G.Extras.award(id);
  const hour = () => (G.game ? G.game.S.time || 12 : 12);
  const isDay = () => hour() > 7 && hour() < 20;

  /* ================================================================ ITEMS */
  Object.assign(G.ITEMS, {
    hoglet: { name: 'A Very Small Hedgehog', desc: 'Prickly, warm and extremely indignant about being carried. His name is Bramble Junior, and he would like to go home now.' },
    acornbag: { name: "Rusty's Nuts", desc: 'A little heap of hazelnuts and acorns, dug up from other people’s gardens. They smell of Birch Lane.' },
    ticket: { name: 'Ferry Ticket', desc: 'A bus ticket with “FERRY” scratched on it by a beak. Captain Quack’s own design. Valid for one crossing.' },
  });

  /* ================================================================ COLLECTIBLES (the other twelve) */
  const TC2 = [
    ['t_seedpkt', 'note', 'Seed Packet', 'Runner beans, "Scarlet Emperor". The packet is empty. The beans are very much planted.', [-44.6, 0.2, 117.2]],
    ['t_trowel', 'key', 'Tiny Trowel', 'A child’s trowel, painted green, left at the edge of plot six.', [-28.4, 0.2, 122.4]],
    ['t_tomato', 'berries', 'Cherry Tomato', 'Perfectly ripe. It fell off the vine in the greenhouse. Milo will not eat it. Probably.', [-8.4, 0.08, 126.4]],
    ['t_hat', 'ribbon', 'Scarecrow’s Hatband', 'A strip of red ribbon from the scarecrow’s hat. The crows took the rest.', [-4.6, 0.04, 135.2]],
    ['t_spike', 'bottlecap', 'Railway Spike', 'An old iron spike from beside the tracks. Heavy, cold and very important-looking.', [-40, 0.34, 139.4]],
    ['t_rubber', 'foil', 'Star Eraser', 'A star-shaped eraser, smelling faintly of strawberries. Lost under the swings.', [10.8, 0.04, 123.4]],
    ['t_bead', 'marble', 'Friendship Bead', 'A blue bead from a snapped friendship bracelet, glinting in the sandpit.', [12.4, 0.1, 134.2]],
    ['t_sticker', 'photo', 'Gold Star Sticker', 'A gold star sticker: "SUPER EFFORT". Milo has earned it, surely.', [24.1, 2.66, 134.6]],
    ['t_rope', 'ribbon', 'Mooring Knot', 'A neat little knot of rope, cut from the end of the Kingfisher’s line.', [-3.2, 0.2, 159.6]],
    ['t_feather', 'feather', 'Duck Feather', 'A shimmering green duck feather from the towpath. Captain Quack will pretend it isn’t his.', [-14.4, 0.04, 158.6]],
    ['t_lockkey', 'gear', 'Lock Windlass', 'A tiny brass windlass charm from the lock-keeper’s hut. For very small locks.', [47.4, 0.2, 153.6]],
    ['t_coin3', 'coin', 'Towpath Token', 'An old canal toll token, green with age. It paid for a horse, once.', [60.4, 0.2, 175.2]],
  ];
  for (const [id, model, name, desc, pos] of TC2) G.COLLECT.push({ id, cat: 'town', model, name, desc, pos });

  /* ================================================================ DIG SPOTS (four more, eight in all) */
  const DIGS2 = [
    { id: 'td5', pos: [-29.6, 0, 132.6], loot: 'treat' },
    { id: 'td6', pos: [-44.4, 0, 136.4], loot: 'coin' },
    { id: 'td7', pos: [16.2, 0, 145.4], loot: 'button' },
    { id: 'td8', pos: [-40, 0, 154.2], loot: 'bone' },
  ];
  T.digs.push(...DIGS2);
  { const oInit = G.EXT.init;
    G.EXT.init = function (g) {
      oInit(g);
      // mirror the part-two dig setup for the new spots
      for (const d of DIGS2) {
        const mm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M.get('dirt'));
        mm.scale.set(1, 0.3, 1); mm.position.set(d.pos[0], d.pos[1], d.pos[2]); mm.receiveShadow = true; g.scene.add(mm); T.mounds[d.id] = mm;
        G.INTERACT.push({ id: 'dig_' + d.id, pos: d.pos, r: 0.6, label: 'Dig in the soft soil', anim: 'dig', when: () => open() && !(S().dug || {})[d.id], act: () => T.dig(d) });
      }
    };
  }

  /* ================================================================ QUESTS */
  Object.assign(G.QUESTS, {
    tq_hoglet: {
      kind: 'Side quest', title: 'The Lost Hoglet', giver: 'Mrs Brambling',
      steps: { find: 'Find the littlest Brambling (listen for sneezing)', home: 'Carry the hoglet home to the big shed' },
      done: 'Bramble Junior is home, has been told off, and has immediately fallen asleep.',
      target: (st) => (st === 'find' ? [-6.8, 0, 133.9] : [-48.6, 0, 119.7]),
    },
    tq_rusty: {
      kind: 'Side quest', title: 'Rusty’s Nuts', giver: 'Rusty',
      steps: { dig: 'Sniff out the three nut stashes Rusty buried in the wrong gardens', ret: 'Bring the nuts back to Rusty' },
      done: 'Rusty has buried every single nut again. In the wrong gardens. He is delighted.',
      target: (st) => (st === 'dig' ? T.rustyNext() : [-28.6, 0, 113.4]),
    },
    tq_ferry: {
      kind: 'Side quest', title: 'The Canal Ferry', giver: 'Captain Quack',
      steps: { ticket: 'Find something Captain Quack will accept as a ticket', ride: 'Ride the ferry across the canal' },
      done: 'The crossing was eleven seconds long. Captain Quack called it "a proper voyage".',
      target: (st) => (st === 'ticket' ? [51.6, 0.2, 155.4] : [-12, 0, 160]),
    },
    tq_nibbles: {
      kind: 'Side quest', title: 'Nibbles’ Day Out', giver: 'Nibbles',
      steps: { out: 'Take Nibbles to see the sandpit, the swings and the top of the climbing frame' },
      done: 'Nibbles has seen the whole world. It is bigger than her cage. She is going to need a nap.',
      target: () => T.nibblesNext(),
    },
  });

  /* ================================================================ THE ANIMALS */
  /* ---- the Bramblings: a hedgehog family under the allotment shed */
  NPC.add({
    id: 'mrsbram', name: 'Mrs Brambling', kind: 'hedgehog', sound: 'snuffle',
    look: { scale: 1.2, color: 0x7a5a3a, apron: 0xe8c8a8, apronScale: 0.6 },
    pos: g_(-48.6, 119.7), yaw: Math.PI, wander: 0.3, when: () => open(),
    lines: () => {
      const q = Q('tq_hoglet');
      if (!q) return [
        ['mrsbram', 'Oh! A ferret. You gave me such a fright, I nearly curled up.', 'surprised'],
        ['mrsbram', 'I’m Mrs Brambling. We live under the big shed: me, Mr B, and our four little ones.', 'neutral'],
        ['mrsbram', 'Well. THREE little ones, at the moment. Bramble Junior wandered off this morning and hasn’t come home.', 'sad'],
        ['mrsbram', 'He sneezes when he’s nervous. If you hear a very small sneeze, that’s him.', 'think'],
        { do: () => G.EXT.startQuest('tq_hoglet', 'find') },
      ];
      if (q === 'home' && item('hoglet')) return [
        ['mrsbram', 'JUNIOR! You naughty, prickly, wonderful thing!', 'happy'],
        { do: () => { game().take('hoglet'); G.EXT.setQuest('tq_hoglet', 'done'); T.hogletHome = true; award('ach_hoglet'); } },
        ['mrsbram', 'Where was he?', 'think'],
        ['milo', '*In the scarecrow’s straw. He said he was being a scarecrow too.*', 'happy'],
        ['mrsbram', 'Of course he did. His father was exactly the same. Thank you, dear. Come by any evening; there are always slugs.', 'happy'],
      ];
      if (q === 'find') return [['mrsbram', 'Listen for the sneeze, dear. He never could hold one in.', 'sad']];
      return [['mrsbram', pick(['Junior has promised never to wander again. He is wandering right now, under the shed. That counts.', 'The gardener leaves us a saucer of water. Such a kind man, for a human.', 'Evenings are best. The slugs come out, and so do we.']), 'happy']];
    },
  });
  // the other three hoglets, snoozing by the shed
  for (let i = 0; i < 3; i++) NPC.add({
    id: 'hoglet' + i, name: ['Bramble Minor', 'Thistle', 'Burr'][i], kind: 'hedgehog', sound: 'snuffle', portrait: false,
    look: { scale: 0.6, color: 0x8a6a4a }, pos: g_(-50.4 + i * 0.6, 119.8), yaw: Math.PI + i * 0.4, wander: 0.2, when: () => open(),
    lines: () => [[`hoglet${i}`, pick(['*snore*', 'Are you a big hedgehog?', 'Junior is in TROUBLE.', 'I found a woodlouse. It’s mine.']), 'happy']],
  });
  G.NAMES.hoglet0 = 'Bramble Minor'; G.NAMES.hoglet1 = 'Thistle'; G.NAMES.hoglet2 = 'Burr';
  // Bramble Junior, hiding in the scarecrow's straw
  NPC.add({
    id: 'junior', name: 'Bramble Junior', kind: 'hedgehog', sound: 'snuffle', portrait: false,
    look: { scale: 0.55, color: 0x8a6a4a }, pos: g_(-6.8, 133.9), yaw: 0.4, wander: 0, when: () => open() && Q('tq_hoglet') === 'find',
    label: 'Scoop up the hoglet',
    lines: () => [
      ['junior', 'ATCHOO!', 'surprised'],
      ['junior', 'I’m a scarecrow. You can’t see me. I’m made of straw.', 'neutral'],
      ['milo', '*You’re made of hedgehog. And your mum is very worried.*', 'neutral'],
      ['junior', '...Is she cross?', 'sad'],
      ['milo', '*A bit. Mostly she misses you. Climb on, I’ll carry you home.*', 'happy'],
      { do: () => { game().give('hoglet'); G.EXT.setQuest('tq_hoglet', 'home'); } },
    ],
  });
  G.NAMES.junior = 'Bramble Junior';

  /* ---- Rusty: a squirrel who buried his nuts in everyone else's garden */
  const RUSTY_STASH = [[-29.2, 0, 80.4], [5.6, 0, 80.8], [33.8, 0, 94.8]];
  T.rustyNext = () => { const s = S().town || {}; const i = RUSTY_STASH.findIndex((p, k) => !(s.rusty || {})[k]); return i < 0 ? [-28.6, 0, 113.4] : RUSTY_STASH[i]; };
  NPC.add({
    id: 'rusty', name: 'Rusty', kind: 'squirrel', sound: 'churr',
    look: { scale: 1.15, color: 0xb05a2a }, pos: g_(-28.6, 113.4), yaw: 0.8, wander: 1.2, when: () => open(),
    lines: () => {
      const q = Q('tq_rusty'), n = Object.keys((S().town || {}).rusty || {}).length;
      if (!q) return [
        ['rusty', 'Nuts. NUTS. I had nuts. I buried the nuts. Where are the nuts?', 'surprised'],
        ['milo', '*Hello! I’m Milo. Are you all right?*', 'neutral'],
        ['rusty', 'Rusty. Rusty the squirrel. I buried three lots of nuts on Birch Lane, but all the gardens look the same, and there are gnomes, and the gnomes STARE.', 'sad'],
        ['rusty', 'You’ve got a nose. A proper nose. Sniff them out? One in the Hartleys’ garden, one by the Okonkwos’ feeder, one behind the Paynes’ treehouse, I think, maybe.', 'think'],
        { do: () => { const s = S(); s.town = s.town || {}; s.town.rusty = {}; G.EXT.startQuest('tq_rusty', 'dig'); } },
      ];
      if (q === 'dig' && n >= 3) return [
        ['rusty', 'THE NUTS! All of them! Every single one!', 'happy'],
        { do: () => { game().take('acornbag', 99); G.EXT.setQuest('tq_rusty', 'ret'); G.EXT.setQuest('tq_rusty', 'done'); award('ach_rusty'); } },
        ['rusty', 'Right. Right. I’m going to bury them somewhere SAFE this time.', 'think'],
        ['milo', '*Where?*', 'neutral'],
        ['rusty', 'Birch Lane! In the gardens! ...Oh no.', 'surprised'],
        ['rusty', 'Also, and I’m sorry about this, I sat on a cushion in the treehouse. A posh one. I think it belongs to a cat.', 'sad'],
      ];
      if (q === 'dig') return [['rusty', `${n} of 3! Keep sniffing! Press Q, that’s what I’d do if I had a nose like yours.`, 'happy']];
      return [['rusty', pick(['I’ve re-buried them. I’ve already forgotten where. This is my life.', 'Tell the posh cat I said sorry. Tell her from a distance.', 'The allotment man grows sunflowers. SUNFLOWERS. Seeds, the size of your ear!']), 'happy']];
    },
  });
  RUSTY_STASH.forEach((p, k) => add({
    id: 'rusty_stash' + k, pos: p, r: 0.9, label: 'Dig up Rusty’s nuts', anim: 'dig',
    when: () => open() && Q('tq_rusty') === 'dig' && !((S().town || {}).rusty || {})[k],
    act: () => {
      const g = game(); g.player.act('dig', 1.2, { lockMove: true }); A.play('dig');
      setTimeout(() => {
        const s = S(); s.town = s.town || {}; s.town.rusty = s.town.rusty || {}; s.town.rusty[k] = true; g.give('acornbag');
        const n = Object.keys(s.town.rusty).length;
        SQ.toast('Rusty’s nuts', n < 3 ? `Stash ${n} of 3. Rusty is going to be thrilled.` : 'All three stashes! Back to Rusty in the allotments.');
        UI().updateObjective(true);
      }, 1200);
    },
  }));

  /* ---- Captain Quack, who runs a "ferry" across the canal */
  NPC.add({
    id: 'quack', name: 'Captain Quack', kind: 'duck', sound: 'quack',
    look: { scale: 1.35, color: 0x6a5a48, head: 0x2a6a4a, hat: 'cap', hatColor: 0x2a3a55, hatScale: 1.1 },
    pos: g_(-12, 160.4), yaw: Math.PI, wander: 0.8, when: () => open(),
    lines: () => {
      const q = Q('tq_ferry');
      if (!q) return [
        ['quack', 'AHOY! Captain Quack, master of the Larkspur Ferry. Est. last Tuesday.', 'happy'],
        ['milo', '*What ferry?*', 'think'],
        ['quack', 'ME. I am the ferry. You climb on, I paddle, we cross. Very modern.', 'happy'],
        ['quack', 'Tickets only, mind. No ticket, no voyage. Those are the rules. I made them.', 'neutral'],
        ['quack', 'Anything official-looking will do. The lock-keeper leaves all sorts lying about by his hut.', 'think'],
        { do: () => G.EXT.startQuest('tq_ferry', 'ticket') },
      ];
      if (q === 'ticket' && item('ticket')) return [
        ['quack', 'A TICKET. A genuine, beak-certified ticket. All aboard!', 'happy'],
        { do: () => { game().take('ticket'); G.EXT.setQuest('tq_ferry', 'ride'); T.ferryRide(); } },
      ];
      if (q === 'ticket') return [['quack', 'No ticket, no voyage. Try the lock-keeper’s hut. He’s very careless with paper.', 'neutral']];
      return [
        ['quack', pick(['Another crossing, sailor? Hop on.', 'The Larkspur Ferry never sinks. Mostly.', 'Mind the lock. The lock is where ducks go to look important.']), 'happy'],
        { choice: [
          { t: 'Ride the ferry', then: [{ do: () => T.ferryRide() }] },
          { t: 'Maybe later', then: [['quack', 'The ferry waits for no ferret. Except you. I’ll wait for you.', 'happy']] },
        ] },
      ];
    },
  });
  G.PICKUPS.push({ id: 'p_ticket', item: 'ticket', model: 'note', pos: [51.6, 0.2, 155.4], when: () => Q('tq_ferry') === 'ticket', msg: 'An old bus ticket by the lock-keeper’s coal pile. Close enough to official.' });
  // the ferry ride: Milo rides on Quack's back, across and back again
  T.ferryRide = function () {
    const g = game(), k = K(), q = NPC.get('quack');
    if (!k || !q || !q.beast) { g.travel([-12, 0, 172], 0); return; }
    k.cutscene(async () => {
      const b = q.beast.root, p = g.player;
      b.position.set(-12, -0.52, 162.6); p.teleport(-12, -0.2, 162.6, 0);
      A.play('quack'); k.shot([-7, 1.8, 158], [-12, -0.2, 166]);
      p.pin = () => ({ p: new THREE.Vector3(b.position.x, b.position.y + 0.28, b.position.z), yaw: 0 });
      for (let t = 0; t < 1; t += 0.02) { b.position.z = 162.6 + t * 6.8; await k.wait(0.05); }
      await k.talk([['quack', 'LAND HO! The far bank, as promised. The voyage home is included.', 'happy']]);
      for (let t = 0; t < 1; t += 0.02) { b.position.z = 169.4 - t * 6.8; await k.wait(0.05); }
      p.pin = null; p.teleport(-12, 0, 159.4, Math.PI);
      if (Q('tq_ferry') !== 'done') { G.EXT.setQuest('tq_ferry', 'done'); award('ach_ferry'); }
      await k.talk([['quack', 'Thank you for travelling with the Larkspur Ferry. Please leave a review. Leave it in bread.', 'happy']]);
    });
  };

  /* ---- Nibbles, the school hamster, who wants a day out */
  const NIB = [['sandpit', [11, 0, 135]], ['swings', [10, 0, 122.8]], ['top of the climbing frame', [22, 2.62, 134]]];
  T.nibblesNext = () => { const s = S().town || {}; const i = NIB.findIndex((n, k) => !(s.nib || {})[k]); return i < 0 ? [40, 0, 118] : NIB[i][1]; };
  NPC.add({
    id: 'nibbles', name: 'Nibbles', kind: 'hamster', sound: 'squeak',
    look: { scale: 1.3, color: 0xd9a86a }, pos: g_(40, 118.6), yaw: Math.PI, wander: 0.3, when: () => open() && Q('tq_nibbles') !== 'out',
    lines: () => {
      const q = Q('tq_nibbles');
      if (!q) return [
        ['nibbles', 'A visitor! A real live visitor! Nobody visits Class Two after four o’clock.', 'happy'],
        ['nibbles', 'I’m Nibbles. I’m the class hamster. I have a wheel, a tube and a small ceramic house.', 'happy'],
        ['nibbles', 'I have never, not once, been OUTSIDE. The children talk about the sandpit like it’s the seaside.', 'sad'],
        ['milo', '*...Want to come with me? Just for a bit?*', 'happy'],
        ['nibbles', 'YES. Yes please. Can I sit on your head?', 'happy'],
        { do: () => { const s = S(); s.town = s.town || {}; s.town.nib = {}; G.EXT.startQuest('tq_nibbles', 'out'); T.nibblesRide(true); } },
      ];
      return [['nibbles', pick(['I’ve been to the sandpit. I am basically an explorer now.', 'The swings were terrifying. Ten out of ten.', 'Come back tomorrow! I’ll save you a sunflower seed.']), 'happy']];
    },
  });
  // while the quest runs, Nibbles rides on Milo's head
  T.nibblesRide = function (on) {
    const q = NPC.get('nibbles'); if (!q) return;
    const b = q.make(); const head = game().player.f.head;
    if (on) { head.add(b.root); b.root.position.set(0, 0.07, -0.01); b.root.rotation.set(0, 0, 0); b.root.scale.setScalar(0.55); b.root.visible = true; q.riding = true; }
    else { head.remove(b.root); game().scene.add(b.root); b.root.scale.setScalar(1.3); q.riding = false; q.home = null; }
  };
  NIB.forEach(([name, pos], k) => add({
    id: 'nib_' + k, pos, r: k === 2 ? 1.4 : 1.8, label: `Show Nibbles the ${name}`, anim: 'sniff',
    when: () => open() && Q('tq_nibbles') === 'out' && !((S().town || {}).nib || {})[k],
    act: () => {
      const s = S(); s.town.nib[k] = true;
      const lines = [
        [['nibbles', 'SAND. It’s like bedding, but for the whole world!', 'happy'], ['nibbles', 'I am going to dig. I am going to dig for ever.', 'happy']],
        [['nibbles', 'It MOVES. The seat moves! Why does it move?!', 'surprised'], ['milo', '*That’s the point of it.*', 'happy'], ['nibbles', 'Humans are so brave.', 'think']],
        [['nibbles', 'I can see... everything. The whole playground. The roofs. A pigeon. Hello, pigeon!', 'happy'], ['nibbles', 'This is the best day of my entire life. Please take me home now, I’m exhausted.', 'happy']],
      ][k];
      game().say(lines, () => {
        if (Object.keys(s.town.nib).length >= 3) {
          G.EXT.setQuest('tq_nibbles', 'done'); T.nibblesRide(false); award('ach_nibbles');
          SQ.toast('Nibbles’ day out', 'Nibbles is back in Class Two, asleep in her tube, dreaming of sand.');
        } else UI().updateObjective(true);
      });
    },
  }));
  SQ.onApply((s) => { const q = NPC.get('nibbles'); if (q && q.riding && Q('tq_nibbles') !== 'out') T.nibblesRide(false); if (q && !q.riding && Q('tq_nibbles') === 'out') T.nibblesRide(true); });

  /* ================================================================ THE TOWNSFOLK
     Four humans on daily routines. Each can be talked to (Milo "talks" in
     the usual way: a sniff, a nuzzle); the baker and the gardener chase
     Milo if he steals from them. */
  const LOOKS = G.HumanLooks;
  if (LOOKS) Object.assign(LOOKS, {
    baker: { name: 'Mr Crumb', height: 1.74, skin: 0xe8b894, hair: 0xd9d0c4, hairStyle: 'bald', shirt: 0xf6f2ea, pants: 0x4a4a52, shoes: 0x3a2a22, mustache: 0xd9d0c4, belly: true, cardigan: 0xf6f2ea },
    postie: { name: 'Pat the Postie', height: 1.78, skin: 0x9a6a4a, hair: 0x1a1210, hairStyle: 'cap', cap: 0xb02a22, shirt: 0xd9412f, pants: 0x2a3a5a, shoes: 0x1a1a1e, shorts: true, socks: 0x2a3a5a },
    gardener: { name: 'Mr Okafor', height: 1.72, skin: 0x6a4a34, hair: 0x2a2420, hairStyle: 'flatcap', cap: 0x5a6a3a, shirt: 0xc9b88a, pants: 0x3a4a2a, shoes: 0x3a2a1e, overalls: true, beard: 0x3a3430 },
    lollipop: { name: 'Mrs Pennywhistle', height: 1.62, skin: 0xf0c8a8, hair: 0xb8b0a8, hairStyle: 'bun', shirt: 0xf2e030, pants: 0x2a2a30, shoes: 0x1a1a1e, glasses: true, cardigan: 0xf2e030 },
    kid1: { name: 'Sam', height: 1.2, skin: 0xd9a47e, hair: 0x2a1a10, hairStyle: 'cap', cap: 0x3f6fa0, shirt: 0x6aa84f, pants: 0x3a3a5a, shoes: 0xd9573b, shorts: true, socks: 0xffffff, cheeks: true },
    kid2: { name: 'Priya', height: 1.16, skin: 0xb07a5a, hair: 0x1a1210, hairStyle: 'pigtails', tie: 0xf2c14e, shirt: 0xd9573b, pants: 0x2f5f9a, shoes: 0xf2c14e, shorts: true, socks: 0xffffff, cheeks: true },
    kid3: { name: 'Olly', height: 1.24, skin: 0xf0c09a, hair: 0xc98a3a, hairStyle: 'bun', shirt: 0xf5a623, pants: 0x4a4a4a, shoes: 0x3a6a8a, cheeks: true },
  });
  Object.assign(G.NAMES, { baker: 'Mr Crumb', postie: 'Pat the Postie', gardener: 'Mr Okafor', lollipop: 'Mrs Pennywhistle', kid1: 'Sam', kid2: 'Priya', kid3: 'Olly' });

  /* routines: [fromHour, toHour, waypoints, pose]. Outside every window, hidden. */
  const ROUTINES = {
    baker: [[6, 14, [[56, 0, 76.4], [58, 0, 78], [54, 0, 78.4]], 'idle'], [14, 18, [[64, 0, 80.6]], 'sit']],
    postie: [[8, 13, [[16.5, 0, 88.6], [-6, 0, 83], [-26, 0, 83], [-22, 0, 89.4], [4, 0, 89.4], [30, 0, 89.4], [30, 0, 83], [50, 0, 86], [92, 0, 77], [66, 0, 86]], 'walk']],
    gardener: [[9, 17, [[-20, 0, 118.2], [-36, 0, 118.2], [-43.5, 0, 128], [-26, 0, 132], [-14, 0, 119.4], [-26, 0, 124]], 'dig']],
    lollipop: [[8, 9.5, [[22, 0, 107.6]], 'lollipop'], [15, 16.5, [[22, 0, 107.6]], 'lollipop']],
    kid1: [[12, 16, [[10, 0, 122.4], [22, 0, 131], [12, 0, 134]], 'play']],
    kid2: [[12, 16, [[11.2, 0, 136], [17, 0, 126], [24, 0, 120]], 'play']],
    kid3: [[12, 16, [[21, 0, 136.8], [8.4, 0, 122.4], [18, 0, 128]], 'play']],
  };
  const FOLK = (T.folk = {});
  const initFolk = () => {
    if (!LOOKS || !G.Human) return;
    for (const id in ROUTINES) {
      const h = new G.Human(id); h.root.visible = false; game().scene.add(h.root);
      h.routine = ROUTINES[id]; h.wp = 0; h.wait = 0; h.home = false;
      FOLK[id] = h; C().extraHumans.push(h);
    }
    // portraits for dialogue and toasts
    G.UI.portraitsExtra = G.UI.portraitsExtra || {};
    for (const id of ['baker', 'postie', 'gardener', 'lollipop', 'kid1', 'kid2', 'kid3']) {
      try {
        const h = new G.Human(id); h.update(0.016, {}); h.update(0.5, {});
        const p = new THREE.Vector3(); h.head.getWorldPosition(p);
        const url = G.Portrait.shot('h_' + id, h.root, new THREE.Vector3(p.x + 0.12, p.y + 0.02, p.z + 0.62), new THREE.Vector3(p.x, p.y, p.z));
        G.UI.portraitsExtra[id] = url; if (G.UI.portraits) G.UI.portraits[id] = url;
      } catch (e) { console.warn('portrait', id, e); }
    }
  };
  { const oInit = G.EXT.init; G.EXT.init = function (g) { oInit(g); initFolk(); }; }

  const windowFor = (h) => { const t = hour(); return h.routine.find(([a, b]) => t >= a && t < b) || null; };
  SQ.tick((dt, s, st) => {
    if (!G.game || !G.Kit) return;
    const pl = game().player;
    for (const id in FOLK) {
      const h = FOLK[id];
      if (h.chase) { h.update(dt, { lookY: h.lookY }); continue; }
      const w = open() && !G.SEQ.running ? windowFor(h) : null;
      const inRange = Math.hypot(pl.pos.x - (h.pos.x || 0), pl.pos.z - (h.pos.z || 0)) < 140;
      if (!w) { h.root.visible = false; h.active = false; continue; }
      if (!h.active) { const p0 = w[2][0]; h.pos.set(p0[0], p0[1], p0[2]); h.wp = 0; h.active = true; }
      h.root.visible = inRange;
      const [, , pts, pose] = w, tgt = pts[h.wp % pts.length];
      if (h.talkLock > 0) { h.talkLock -= dt; h.pose = 'idle'; h.speed = 0; }
      else if (h.wait > 0) { h.wait -= dt; h.pose = pose === 'walk' ? 'idle' : pose === 'play' ? (Math.sin(game().t * 3 + h.pos.x) > 0 ? 'wave' : 'idle') : pose; h.speed = 0; }
      else if (G.Kit.moveH(h, tgt[0], tgt[2], pose === 'play' ? 2.2 : 1.1, dt)) { h.wait = pose === 'walk' ? 2.2 : 5 + Math.random() * 6; h.wp++; }
      else h.pose = 'idle';
      // wave at Ellie when she's nearby
      const E = C().ellie;
      if (E && E.root.visible && Math.hypot(E.pos.x - h.pos.x, E.pos.z - h.pos.z) < 6 && !h.waved) { h.waved = 12; h.pose = 'wave'; h.talkLock = 1.5; }
      if (h.waved) h.waved = Math.max(0, h.waved - dt);
      // look at Milo when he's close
      const d = Math.hypot(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z);
      h.lookY = d < 4 ? U.angDiff(h.yaw, Math.atan2(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z)) : 0;
      if (h.root.visible) h.update(dt, { lookY: h.lookY, talking: UI().dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === id });
    }
    // keep the interaction points on the humans
    for (const id in FOLK) { const it = T.folkIt[id]; if (!it) continue; const h = FOLK[id]; it.pos[0] = h.pos.x; it.pos[1] = h.pos.y + 0.2; it.pos[2] = h.pos.z; }
  });

  /* talking to the townsfolk (Milo sniffs their boots; they talk to him) */
  const FOLK_LINES = {
    baker: () => {
      const t = hour();
      if (t < 9) return [['baker', 'Up with the lark, little one? First batch is in. Mind your whiskers, the trays are hot.', 'happy']];
      return [['baker', pick(['A ferret! In MY doorway. Don’t even think about the iced buns.', 'The posh cat gets a bun every morning. She has never once said thank you.', 'I heard you found Soot a book. That was kind. She’s a funny little thing.']), 'happy']];
    },
    postie: () => [['postie', pick(['Morning! Nothing for you today, I’m afraid. Ferrets don’t get much post.', 'Number 3’s got a parcel. Big one. Shaped like a trampoline.', 'Seen Biscuit at the stop? I always give him a biscuit. Seems only right.']), 'happy']],
    gardener: () => [['gardener', pick(['Hello, friend. Mind the beans; they’re doing their best.', 'The hedgehogs keep the slugs off. You can stay if you keep the pigeons off.', 'Best carrots in Larkspur, these. Don’t you go pinching one.']), 'happy']],
    lollipop: () => [['lollipop', pick(['Stop, look, listen. That goes for ferrets too.', 'Thirty-one years on this crossing. Never lost a child. Nearly lost a duck once.', 'Hello, sweetheart. Wait for my lollipop.']), 'happy']],
    kid1: () => [['kid1', pick(['A FERRET! Priya, a FERRET!', 'Can it go down the slide? Can it?', 'I’m calling him Captain Noodle.']), 'happy']],
    kid2: () => [['kid2', pick(['He’s so soft! Is he yours? Is he anyone’s?', 'Miss says we can’t bring pets. He brought himself though.', 'He’s got a stripe on his nose!']), 'happy']],
    kid3: () => [['kid3', pick(['Olly says hello. I’m Olly.', 'Do ferrets like crisps?', 'Tag! You’re it! ...He’s not chasing me.']), 'happy']],
  };
  T.folkIt = {};
  for (const id in ROUTINES) {
    const it = { id: 'folk_' + id, pos: [0, -999, 0], r: 1.2, label: () => (id.startsWith('kid') ? 'Say hello to ' + G.NAMES[id] : 'Sniff ' + G.NAMES[id] + '’s boots'), anim: 'sniff',
      when: () => { const h = FOLK[id]; return !!h && h.root.visible && !h.chase && !(C().chaser) && !G.SEQ.running; },
      act: () => { const h = FOLK[id]; h.talkLock = 5; h.yaw = Math.atan2(game().player.pos.x - h.pos.x, game().player.pos.z - h.pos.z); game().say(FOLK_LINES[id]()); } };
    T.folkIt[id] = it; add(it);
  }

  /* ---- stealing from the baker or the gardener starts a chase (humans.js) */
  { const Cc = () => G.Cast;
    const inTown = (pl) => pl.pos.z > 64 && pl.pos.x > -56 && pl.pos.x < 102 && pl.pos.y > -5;
    const defs = {
      bun: { title: '<b>Stop, thief!</b>', msg: 'Mr Crumb wants his iced bun back. Run, or hide under a market stall, a café table or a bench!', escaped: '"Where did that ferret go? ...Well. Enjoy the bun, you scamp."', far: 14, speed: 2.5, direct: true, maxT: 30, outOfArea: (pl) => !inTown(pl) },
      carrot: { title: '<b>Oi! My carrot!</b>', msg: 'Mr Okafor is after you. Duck under the shed or the wheelbarrow, or just outrun him!', escaped: '"Fine. Keep it. You earned it, you little rascal."', far: 13, speed: 2.35, direct: true, maxT: 30, outOfArea: (pl) => !inTown(pl) },
    };
    for (const why in defs) {
      const d = defs[why];
      d.onEscaped = () => { const s = S(); s.town = s.town || {}; s.town['escaped_' + why] = (s.town['escaped_' + why] || 0) + 1; award('ach_escape_' + why); };
      d.caught = async (h) => {
        const k = K();
        await k.talk([[h.id, why === 'bun' ? 'GOT you! That bun is for a paying customer, sir.' : 'Caught you! Hand over that carrot.', 'surprised']]);
        h.pose = 'hug'; await k.wait(0.8);
        await k.talk([[h.id, why === 'bun' ? '...Oh, go on then. Half each. Don’t tell the cat.' : '...You know what? Have it. Just leave the rest for the rabbits.', 'happy']]);
        Cc().carried = null; k.putDown(h); h.pose = 'idle';
      };
      if (G.Cast) G.Cast.chaseDefs[why] = d;
      else { const oI = G.EXT.init; G.EXT.init = function (g) { oI(g); G.Cast.chaseDefs[why] = d; }; }
    }
    add({ id: 'tw_bun', pos: [57.4, 0.5, 72.2], r: 1.0, label: 'Pinch an iced bun', anim: 'eat',
      when: () => open() && FOLK.baker && FOLK.baker.root.visible && !Cc().chaser,
      act: () => { A.play('eat'); game().give('treat'); flag('stoleBun'); award('ach_bun'); setTimeout(() => Cc().startChase(FOLK.baker, 'bun'), 500); } });
    add({ id: 'tw_carrot', pos: [-34.5, 0.2, 115.4], r: 1.0, label: 'Tug up a carrot', anim: 'dig',
      when: () => open() && FOLK.gardener && FOLK.gardener.root.visible && !Cc().chaser,
      act: () => { A.play('dig'); game().give('treat'); flag('stoleCarrot'); setTimeout(() => Cc().startChase(FOLK.gardener, 'carrot'), 500); } });
  }

  /* ================================================================ THE LITTLE TRAIN
     Passes along the embankment every few minutes; the crossing flashes
     and dings while it comes through. */
  const TR = (T.train = { m: null, x: 90, state: 'away', timer: 40 });
  function makeTrain() {
    if (TR.m) return TR.m;
    const g = new THREE.Group();
    const body = (w, h, d, c, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.std('train' + c.toString(16), { color: c, rough: 0.5, metal: 0.15 })); m.position.set(x, y, 0); m.castShadow = true; g.add(m); return m; };
    body(4.2, 1.5, 1.8, 0x2f5f4a, 0, 1.25);                 // engine
    body(1.6, 0.8, 1.9, 0x1c1c1e, -1.1, 2.3);                // cab roof
    body(0.2, 0.6, 1.2, 0xd4a347, 2.2, 1.1);                 // brass buffer beam
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), M.std('trainChim', { color: 0x1c1c1e, rough: 0.6 })); chim.position.set(1.4, 2.3, 0); g.add(chim);
    for (let c = 1; c <= 2; c++) { body(4.6, 1.6, 1.9, [0xa8342a, 0xc9a13a][c - 1], -c * 5.0, 1.3); body(4.7, 0.12, 2.0, 0xf2ebe0, -c * 5.0, 2.14);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.03), M.get('glass')); w2.position.set(-c * 5.0 - 1.4 + i * 1.4, 1.6, s * 0.96); g.add(w2); } }
    for (let i = 0; i < 9; i++) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.0, 12), M.std('trainWheel', { color: 0x2a2a2e, rough: 0.6, metal: 0.4 })); wh.rotation.x = Math.PI / 2; wh.position.set(1.4 - i * 1.55, 0.62, 0); g.add(wh); }
    g.traverse((m) => (m.userData.dynamic = true));
    g.visible = false; W.root.add(g);
    return (TR.m = g);
  }
  let dingT = 0;
  SQ.tick((dt, s, st) => {
    if (st !== 'play' || !G.game || !R.byId.allot.built) return;
    const m = makeTrain();
    TR.timer -= dt;
    if (TR.state === 'away' && TR.timer <= 0) { TR.state = 'warning'; TR.warn = 5; TR.x = 70; }
    if (TR.state === 'warning') { TR.warn -= dt; if (TR.warn <= 0) { TR.state = 'passing'; m.visible = true; } }
    if (TR.state === 'passing') {
      TR.x -= dt * 9;
      if (TR.x < -80) { TR.state = 'away'; m.visible = false; TR.timer = 150 + Math.random() * 60; }
    }
    if (m.visible) m.position.set(TR.x, 0.3, 142);
    // flashing lights and the bell while the train is due or passing
    const flashing = TR.state === 'warning' || (TR.state === 'passing' && TR.x > -40);
    const on = flashing && Math.floor(game().t * 3) % 2;
    for (const L of T.crossLights || []) {
      const lit = flashing && (L.side > 0 ? on : !on);
      L.m.material = lit ? M.std('crossLampOn', { color: 0xff3a2a, emissive: 0xff2a1a, ei: 2.2, rough: 0.3 }) : M.std('crossLampOff', { color: 0x6a2a24, rough: 0.5 });
    }
    if (flashing) { dingT -= dt; if (dingT <= 0) { dingT = 0.6; const p = game().player.pos, d = Math.hypot(p.x + 26, p.z - 142); if (d < 60) A.play('ding', U.clamp(1 - d / 60, 0.1, 1)); } }
    // the train is solid while passing: Milo waits at the crossing like everyone else
    if (TR.state === 'passing' && Math.abs(TR.x + 26) < 8) {
      const p = game().player.pos;
      if (Math.abs(p.z - 142) < 1.6 && p.x > TR.x - 12 && p.x < TR.x + 3) { p.z = p.z < 142 ? 140.2 : 143.8; A.play('squeak'); award('ach_train'); }
    }
  });

  /* ================================================================ THE SCHOOL DAY
     Bell at nine, at lunchtime and at half past three; the swings swing
     while the children play; the lock gates ease open and shut. */
  let lastBell = -1;
  SQ.tick((dt, s, st) => {
    if (st !== 'play' || !G.game) return;
    const t = hour();
    if (R.byId.school.built) {
      const bellAt = [9, 12, 15.5].find((b) => t >= b && t < b + 0.05);
      if (bellAt !== undefined && lastBell !== bellAt) {
        lastBell = bellAt;
        const p = game().player.pos, d = Math.hypot(p.x - 41, p.z - 118);
        if (d < 80) for (let i = 0; i < 8; i++) setTimeout(() => A.play('shopbell', U.clamp(1 - d / 90, 0.2, 1)), i * 160);
      }
      const playing = t >= 12 && t < 16;
      for (const sw of T.swings || []) { sw.ph += dt * 1.9; sw.g.rotation.x = playing ? Math.sin(sw.ph) * 0.55 : Math.sin(sw.ph * 0.4) * 0.04; }
    }
    if (R.byId.canal.built) for (const gt of T.lockGates || []) {
      gt.phase = (gt.phase || 0) + dt * 0.02;
      const want = (Math.sin(gt.phase + (gt.side > 0 ? 3 : 0)) > 0 ? 0.5 : 0.02) * gt.half;
      gt.g.rotation.y = U.damp(gt.g.rotation.y, want, 0.6, dt);
    }
  });

  /* ================================================================ BURROWS, MAP, ADMIN */
  SQ.travelSpots.push(
    ['allotments', 'The Allotments', [-12, 0, 114], Math.PI],
    ['school', 'The School', [22, 0, 114], Math.PI],
    ['canal', 'The Canal', [-20, 0, 158], Math.PI / 2],
  );
  const mv = SQ.mapViews.town; if (mv) mv.bounds = [-56, 104, 60, 182];
  { const oDraw = mv && mv.draw;
    if (mv) mv.draw = (c, X, Z, sc, s) => {
      if (oDraw) oDraw(c, X, Z, sc, s);
      c.fillStyle = 'rgba(80,120,150,.75)'; c.fillRect(X(-54), Z(162), (154) * sc, 8 * sc);
      c.strokeStyle = 'rgba(60,50,40,.7)'; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(X(-54), Z(142)); c.lineTo(X(2), Z(142)); c.stroke(); c.setLineDash([]);
    }; }
  (G.AdminExtras = G.AdminExtras || []).push(({ group, close, toast }) => {
    const add2 = group('Town (south)');
    const go = (label, pos, yaw) => add2(label, () => { close(); flag('townSeen'); game().travel(pos, yaw || 0); });
    go('The Allotments', [-12, 0, 114], Math.PI);
    go('The level crossing', [-26, 0, 137], Math.PI);
    go('The School', [22, 0, 114], Math.PI);
    go('The playground', [18, 0, 126], Math.PI);
    go('The Canal', [-20, 0, 158], Math.PI / 2);
    go('Larkspur Lock', [38, 0, 157.6], 0);
    add2('Send the train now', () => { T.train.timer = 0; T.train.state = 'away'; close(); toast('<b>Admin</b>', null, 'The 4:15 is on its way.'); });
    add2('Set time: 3pm (school out)', () => { S().time = 15; close(); });
  });

  /* discovering the new areas opens their burrow exits */
  SQ.trigger(() => { const p = game().player.pos; return open() && p.z > 110 && p.z < 150 && p.x < 0; }, () => { S().discovered.allotments = true; }, true);
  SQ.trigger(() => { const p = game().player.pos; return open() && p.z > 110 && p.z < 150 && p.x > 2 && p.x < 60; }, () => { S().discovered.school = true; }, true);
  SQ.trigger(() => { const p = game().player.pos; return open() && p.z > 152 && p.z < 180; }, () => { S().discovered.canal = true; }, true);
  SQ.trigger(() => { const p = game().player.pos; return open() && p.z > 66 && p.x > 44 && p.x < 100 && p.z < 108; }, () => { S().discovered.townsquare = true; }, true);
})();

/* game.js creates G.NAMES when it loads, after this file, so the town's
   speakers register their names at init like the other expansion files do */
(function () {
  const TOWN_NAMES = {
    duchess: 'Duchess', gossip: 'Gossip', gary: 'Gary', soot: 'Soot', biscuit: 'Biscuit',
    mrsbram: 'Mrs Brambling', junior: 'Bramble Junior', hoglet0: 'Bramble Minor', hoglet1: 'Thistle', hoglet2: 'Burr',
    rusty: 'Rusty', quack: 'Captain Quack', nibbles: 'Nibbles',
    baker: 'Mr Crumb', postie: 'Pat the Postie', gardener: 'Mr Okafor', lollipop: 'Mrs Pennywhistle', kid1: 'Sam', kid2: 'Priya', kid3: 'Olly',
  };
  G.Town.names = TOWN_NAMES;
  const oInit = G.EXT.init;
  G.EXT.init = function (g) { oInit(g); Object.assign(G.NAMES, TOWN_NAMES); };
})();

/* =====================================================================
   world-town.js (part five) - two drain-pipe shortcuts, and the high
   street shutting up shop at night.
   Crawl tunnels here follow the game's own pattern: they are small
   pockets in the underground layer, joined to the surface by travel().
   ===================================================================== */
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG, R = G.Regions, SQ = G.SQ, T = G.Town;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const open = () => T.open();
  const add = (o) => G.INTERACT.push(o);

  /* ================================================================ THE TOWN DRAINS */
  R.def({
    id: 'towndrains', ug: true, name: 'The Town Drains', bounds: [148, 192, 68, 112],
    areas: [
      ['tdCulvert', 'The Birch Lane Culvert', 146, 156, 68, 92, { ug: true, zone: 'under', surf: 'stone', dark: true }],
      ['tdOldPipe', 'The Old Pipe', 166, 176, 68, 92, { ug: true, zone: 'under', surf: 'stone', dark: true }],
    ],
    build(ctx) {
      const { H } = ctx, root = ctx.root;
      const trickle = M.std('trickle', { color: 0x2d4a52, rough: 0.05, metal: 0.2, transparent: true, opacity: 0.6, envI: 1 });
      /* the culvert under Birch Lane, out to the canal */
      H.tunnel('TCULV', [[150, UG, 70], [150, UG, 74], [153, UG, 77], [153, UG, 84], [150, UG, 87], [150, UG, 90]]);
      H.plane(149.6, 150.4, 70, 74, UG + 0.012, trickle, 1); H.plane(152.6, 153.4, 77, 84, UG + 0.012, trickle, 1);
      // a lost tennis ball and a pram wheel, washed down years ago
      H.sph({ x: 153.2, y: UG + 0.07, z: 80.4, r: 0.07, mat: M.std('tennis', { color: 0xc8d84a, rough: 0.9 }) });
      H.cyl({ r: 0.16, h: 0.04, x: 150.3, y: UG + 0.16, z: 88.4, mat: 'darkmetal', rx: Math.PI / 2.4, col: false });
      /* the old pipe from the Town Square out to the school field */
      H.tunnel('TPIPE', [[170, UG, 70], [172, UG, 74], [172, UG, 82], [170, UG, 86], [172, UG, 90]]);
      H.plane(171.6, 172.4, 74, 82, UG + 0.012, trickle, 1);
      // chalk marks: generations of children have dared each other down here
      const tex = R.text('pipeChalk', 256, 128, (g2, W2, H2) => { g2.clearRect(0, 0, W2, H2); g2.strokeStyle = 'rgba(240,236,220,.85)'; g2.lineWidth = 4; g2.font = 'bold 30px Georgia'; g2.fillStyle = 'rgba(240,236,220,.85)'; g2.fillText('S.P. 1998', 16, 44); g2.fillText('WAS HERE', 60, 96); g2.beginPath(); g2.arc(210, 60, 26, 0, 7); g2.stroke(); });
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1 }));
      ch.position.set(171.55, UG + 0.4, 78); ch.rotation.y = Math.PI / 2; root.add(ch);
      H.light(152, UG + 0.4, 80, 0x6fe0c4, 0.5, 3, { ug: true }); H.light(171, UG + 0.4, 80, 0x6fe0c4, 0.5, 3, { ug: true });
    },
  });
  T.regions.towndrains = R.byId.towndrains;

  /* surface ends: a grate on Birch Lane, one on the towpath, and two pipe mouths */
  const grate = (ctx, x, z, ry = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0.015, z); g.rotation.y = ry; ctx.root.add(g);
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), M.color(0x0c0908, 1)); gp.rotation.x = -Math.PI / 2; g.add(gp);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.45), M.get('darkmetal')); b.position.set(-0.3 + i * 0.12, 0.01, 0); g.add(b); }
    W.noGrass.push([x - 0.5, x + 0.5, z - 0.4, z + 0.4, 1]);
  };
  const pipeMouth = (ctx, x, z, ry) => {
    const pm = ctx.H.cyl({ r: 0.42, h: 0.8, x, y: 0.2, z, mat: 'concrete', rx: Math.PI / 2, ry, open: true, col: false });
    pm.material = pm.material.clone(); pm.material.side = THREE.DoubleSide;
    const dk = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), M.color(0x0c0908, 1)); dk.position.set(x - Math.sin(ry) * 0.2, 0.42, z - Math.cos(ry) * 0.2); dk.rotation.y = ry; ctx.root.add(dk);
    W.collider(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 0, 0.62, { climb: true, cam: false });
  };
  // R.build hashes colliders before onBuilt runs, so hash whatever these add
  const onBuilt = (id, fn) => { const d = R.byId[id], o = d.onBuilt; d.onBuilt = function (g, ctx) {
    if (o) o.call(this, g, ctx);
    const c0 = W.colliders.length;
    W.withRoot(d.group, () => fn(Object.assign({}, ctx, { root: d.group })));
    for (let i = c0; i < W.colliders.length; i++) g.hashC(W.colliders[i], i);
  }; };
  onBuilt('birch', (ctx) => grate(ctx, 13.2, 89.2));
  onBuilt('canal', (ctx) => grate(ctx, 14, 157.4));
  onBuilt('square', (ctx) => pipeMouth(ctx, 46.2, 101.6, -Math.PI / 2));
  onBuilt('school', (ctx) => pipeMouth(ctx, 55.4, 146.2, Math.PI / 2));

  const firstVisit = (key, msg) => { const s = S(); if (s.flags['visit_' + key]) return; game().flag('visit_' + key); A.play('secret'); UI().toast('<b>Secret place</b>', null, msg); if (G.Extras && G.Extras.award) G.Extras.award('ach_drains'); };
  add({ id: 'td_grateIn', pos: [13.2, 0, 89.2], r: 0.85, label: 'Squeeze through the drain grate', anim: 'sniff', when: () => open(),
    act: () => game().travel([150, UG, 70.4], 0, () => firstVisit('culvert2', 'The Birch Lane culvert. It runs all the way down to the canal, and it smells like it.')) });
  add({ id: 'td_grateBack', pos: [150, UG, 70.3], r: 0.6, label: 'Climb up to Birch Lane', act: () => game().travel([13.2, 0, 88.6], Math.PI) });
  add({ id: 'td_culvEnd', pos: [150, UG, 89.7], r: 0.6, label: 'Crawl out onto the towpath', act: () => game().travel([14, 0, 158.2], Math.PI) });
  add({ id: 'td_towIn', pos: [14, 0, 157.4], r: 0.85, label: 'Squeeze into the culvert', anim: 'sniff', when: () => open(), act: () => game().travel([150, UG, 89.4], Math.PI) });
  add({ id: 'td_pipeIn', pos: [46.2, 0.2, 101.6], r: 0.9, label: 'Crawl into the old pipe', anim: 'sniff', when: () => open(),
    act: () => game().travel([170, UG, 70.4], 0, () => firstVisit('oldpipe', 'The old pipe. Somebody has chalked their initials down here. Generations of somebodies.')) });
  add({ id: 'td_pipeBack', pos: [170, UG, 70.3], r: 0.6, label: 'Crawl back to the Town Square', act: () => game().travel([47.2, 0, 101.6], Math.PI / 2) });
  add({ id: 'td_pipeEnd', pos: [172, UG, 89.7], r: 0.6, label: 'Pop out on the school field', act: () => game().travel([54.4, 0, 146.2], -Math.PI / 2) });
  add({ id: 'td_fieldIn', pos: [55.4, 0.2, 146.2], r: 0.9, label: 'Crawl into the old pipe', anim: 'sniff', when: () => open(), act: () => game().travel([172, UG, 89.4], Math.PI) });

  /* ================================================================ THE HIGH STREET AT NIGHT
     After eight in the evening and before seven in the morning the shop
     doors are shut and a CLOSED sign hangs in each. The cat flap into the
     bakery still works, of course. */
  T.nightDoors = [];
  onBuilt('square', (ctx) => {
    const tex = R.text('closedSign', 128, 64, (g2, W2, H2) => { g2.fillStyle = '#f6f2e8'; g2.fillRect(0, 0, W2, H2); g2.strokeStyle = '#8a1a1a'; g2.lineWidth = 4; g2.strokeRect(3, 3, W2 - 6, H2 - 6); g2.fillStyle = '#8a1a1a'; g2.font = 'bold 26px Georgia'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('CLOSED', W2 / 2, H2 / 2 + 2); });
    for (const id in T.shopDoors) {
      const d = T.shopDoors[id];
      const g = new THREE.Group(); g.position.set(d.x, 0, d.z + 0.04); ctx.root.add(g);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.06), M.std('shopDoorNight', { color: 0x3a2f24, rough: 0.6, map: 'paintwood' }));
      panel.position.y = 1.1; panel.castShadow = true; g.add(panel);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      sign.position.set(0, 1.45, 0.04); g.add(sign);
      g.traverse((m) => (m.userData.dynamic = true)); g.visible = false;
      const col = W.collider(d.x - 0.66, d.x + 0.66, d.z - 0.1, d.z + 0.1, 0, 2.2, { cam: false, name: 'shutDoor_' + id });
      col.on = false;
      T.nightDoors.push({ g, col, id });
    }
  });
  T.shopsOpen = () => { const t = S().time || 12; return t >= 7 && t < 20; };
  SQ.tick((dt, s, st) => {
    if (!G.game || !T.nightDoors.length) return;
    const shut = !T.shopsOpen();
    for (const d of T.nightDoors) {
      if (d.col.on === shut) continue;
      // never shut a door on top of Milo
      const p = game().player.pos;
      if (shut && Math.abs(p.x - (d.col.x0 + d.col.x1) / 2) < 1 && Math.abs(p.z - d.col.z0) < 0.6) continue;
      d.col.on = shut; d.g.visible = shut;
    }
  });
})();
