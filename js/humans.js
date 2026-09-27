/* =====================================================================
   humans.js - the people in Milo's life.
   - A new, fully rigged human model (Ellie, Mum, and Gus the gas-station
     attendant) with walk / run / wave / reach / dive / sit / carry / hug
     and more, replacing the old bed-Ellie.
   - The family now appears around the house during the day, reacts to
     Milo, and sometimes tries to catch him (bath time!) - escape by
     hiding under furniture or running outside.
   - A cutscene sequencer, and the bonus chapter "The Failed Road Trip":
     the family leaves Milo at a highway gas station by accident and he
     has to find his way home.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, EXT = G.EXT, UG = G.World.UG, Mt = G.Mat;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI, I = G.Input;
  const has = (f) => !!S().flags[f];
  const SPH = new THREE.SphereGeometry(1, 18, 14);
  const mat = (c, r = 0.8, extra) => { const m = Mt.std('hm' + c.toString(16) + '_' + r + (extra ? JSON.stringify(extra) : ''), Object.assign({ color: c, rough: r }, extra || {})); if (!m.userData.lin) { m.userData.lin = true; const k = new THREE.Color(c); m.color.setRGB(Math.pow(k.r, 1.6), Math.pow(k.g, 1.6), Math.pow(k.b, 1.6)); } return m; };
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };

  /* ================================================================ HUMAN MODEL */
  const LOOKS = {
    ellie: { name: 'Ellie', height: 1.36, skin: 0xf0c09a, hair: 0x5a2c16, hairStyle: 'pigtails', shirt: 0xf5a623, pants: 0x2f5f9a, shoes: 0xd9573b, dress: false, shorts: true, socks: 0xffffff, cheeks: true, tie: 0xd9573b, stripe: 0xffffff },
    mum: { name: 'Mum', height: 1.68, skin: 0xeab68f, hair: 0x4a2414, hairStyle: 'bun', shirt: 0xf3efe4, pants: 0x2c3e5c, shoes: 0x5a3a2a, glasses: true, cardigan: 0x3f8a74 },
    gus: { name: 'Gus', height: 1.8, skin: 0xd9a47e, hair: 0x5a4a3a, hairStyle: 'cap', cap: 0xd2342a, shirt: 0x3f6f9e, pants: 0x3f6f9e, shoes: 0x2a2420, overalls: true, mustache: 0x6a5a4a, belly: true },
  };
  class Human {
    constructor(look) {
      const o = (this.o = LOOKS[look]); this.id = look;
      const root = (this.root = new THREE.Group()), body = (this.body = new THREE.Group()); root.add(body); body.scale.setScalar(o.height / 1.7);
      const skin = mat(o.skin, 0.55), shirt = mat(o.shirt, 0.9, { map: 'fabric' }), pants = mat(o.pants, 0.85, { map: 'fabric' }), shoe = mat(o.shoes, 0.45), hair = mat(o.hair, 0.65);
      this.shadow = G.shadowDisc(0.32); root.add(this.shadow);
      const hips = (this.hips = new THREE.Group()); hips.position.y = 0.93; body.add(hips);
      const pel = mesh(SPH, pants); pel.scale.set(0.165, 0.11, 0.12); hips.add(pel);
      // legs
      this.legs = [];
      for (const s of [-1, 1]) {
        const th = new THREE.Group(); th.position.set(s * 0.095, -0.03, 0); hips.add(th);
        th.add(mesh(new THREE.CylinderGeometry(0.07, 0.058, 0.46, 12), pants, 0, -0.23, 0));
        const kn = new THREE.Group(); kn.position.y = -0.45; th.add(kn);
        { const kb = mesh(SPH, o.shorts ? skin : pants, 0, 0, 0); kb.scale.setScalar(0.056); kn.add(kb); }
        kn.add(mesh(new THREE.CylinderGeometry(0.054, 0.042, 0.42, 12), o.shorts ? skin : pants, 0, -0.21, 0));
        if (o.socks) kn.add(mesh(new THREE.CylinderGeometry(0.045, 0.043, 0.1, 10), mat(o.socks, 0.9), 0, -0.37, 0));
        const ft = new THREE.Group(); ft.position.y = -0.42; kn.add(ft);
        const sh = mesh(SPH, shoe, 0, -0.03, 0.045); sh.scale.set(0.058, 0.048, 0.115); ft.add(sh);
        const sole = mesh(new THREE.BoxGeometry(0.11, 0.02, 0.22), mat(0xf2ebe0, 0.6), 0, -0.068, 0.045); ft.add(sole);
        this.legs.push({ th, kn, ft, s });
      }
      if (o.shorts) for (const s of [-1, 1]) { const sh = mesh(new THREE.CylinderGeometry(0.078, 0.074, 0.2, 12), pants, s * 0.095, -0.12, 0); hips.add(sh); }
      // torso (lathe = smooth rounded shape)
      const spine = (this.spine = new THREE.Group()); spine.position.y = 0.04; hips.add(spine);
      const prof = o.belly ? [[0.15, 0], [0.19, 0.1], [0.215, 0.22], [0.2, 0.34], [0.2, 0.44], [0.16, 0.53], [0.06, 0.57]] : [[0.145, 0], [0.155, 0.08], [0.15, 0.2], [0.165, 0.34], [0.185, 0.44], [0.155, 0.53], [0.06, 0.57]];
      const torsoG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 22);
      const torso = mesh(torsoG, o.overalls ? mat(0xb84a3a, 0.9, { map: 'fabric' }) : shirt); torso.scale.z = 0.72; spine.add(torso);
      if (o.stripe) { const st = mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.05, 22, 1, true), mat(o.stripe, 0.9)); st.scale.z = 0.72; st.position.y = 0.3; spine.add(st); }
      if (o.overalls) { const bib = mesh(new THREE.BoxGeometry(0.24, 0.26, 0.02), pants, 0, 0.3, 0.155); spine.add(bib); const lo = mesh(torsoG, pants); lo.scale.set(1.02, 0.45, 0.74); spine.add(lo); for (const s of [-1, 1]) spine.add(mesh(new THREE.BoxGeometry(0.035, 0.3, 0.02), pants, s * 0.09, 0.38, 0.13)).rotation.x = -0.15; const tag = mesh(new THREE.BoxGeometry(0.06, 0.03, 0.005), mat(0xffffff, 0.6), -0.06, 0.38, 0.167); spine.add(tag); }
      if (o.cardigan) { const cg = mesh(torsoG, mat(o.cardigan, 0.95, { map: 'fabric' })); cg.scale.set(1.06, 0.98, 0.78); spine.add(cg); const gap = mesh(new THREE.BoxGeometry(0.1, 0.5, 0.02), shirt, 0, 0.28, 0.12); spine.add(gap); }
      // neck + head
      spine.add(mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.09, 10), skin, 0, 0.6, 0));
      const head = (this.head = new THREE.Group()); head.position.set(0, 0.79, 0.01); head.scale.setScalar(look === 'ellie' ? 1.42 : 1.28); spine.add(head);
      const skull = mesh(SPH, skin); skull.scale.set(0.108, 0.122, 0.112); head.add(skull);
      const jaw = mesh(SPH, skin, 0, -0.045, 0.01); jaw.scale.set(0.088, 0.08, 0.09); head.add(jaw);
      for (const s of [-1, 1]) { const ear = mesh(SPH, skin, s * 0.105, -0.005, -0.005); ear.scale.set(0.02, 0.032, 0.018); head.add(ear); }
      this.eyes = [];
      for (const s of [-1, 1]) {
        const eg = new THREE.Group(); eg.position.set(s * 0.04, 0.008, 0.094); head.add(eg);
        const w = mesh(SPH, mat(0xffffff, 0.3)); w.scale.set(0.022, 0.024, 0.012); eg.add(w);
        const ir = mesh(SPH, mat(look === 'ellie' ? 0x5a3a22 : look === 'mum' ? 0x3f6f5a : 0x3a5a8a, 0.2)); ir.scale.set(0.014, 0.016, 0.008); ir.position.z = 0.007; eg.add(ir);
        const pu = mesh(SPH, mat(0x111111, 0.1)); pu.scale.set(0.008, 0.009, 0.005); pu.position.z = 0.012; eg.add(pu);
        const hl = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.scale.setScalar(0.004); hl.position.set(0.005, 0.006, 0.016); eg.add(hl);
        const br = mesh(new THREE.BoxGeometry(0.038, 0.008, 0.01), hair, 0, 0.034, 0.004); br.rotation.z = -s * 0.12; eg.add(br); eg.userData.brow = br;
        this.eyes.push(eg);
      }
      const nose = mesh(SPH, mat(o.skin - 0x080808, 0.55), 0, -0.018, 0.112); nose.scale.set(0.017, 0.022, 0.02); head.add(nose);
      const mouth = (this.mouth = mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 14, Math.PI), mat(0x9a3a3a, 0.5), 0, -0.058, 0.098)); mouth.rotation.z = Math.PI; head.add(mouth);
      if (o.cheeks) for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), new THREE.MeshBasicMaterial({ color: 0xf0a0a0, transparent: true, opacity: 0.55 })); c.position.set(s * 0.066, -0.03, 0.094); c.rotation.y = s * 0.5; head.add(c); }
      if (o.mustache) { const m = mesh(new THREE.BoxGeometry(0.07, 0.014, 0.02), mat(o.mustache, 0.8), 0, -0.038, 0.108); head.add(m); }
      if (o.glasses) { const gm = mat(0x3a2a20, 0.3); for (const s of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 18), gm, s * 0.04, 0.008, 0.108); head.add(r); } head.add(mesh(new THREE.BoxGeometry(0.03, 0.005, 0.005), gm, 0, 0.012, 0.11)); }
      // hair
      { const back = mesh(SPH, hair, 0, 0.015, -0.03); back.scale.set(0.116, o.hairStyle === 'cap' ? 0.1 : 0.125, 0.105); head.add(back); }
      const cap = (s, th, x, y, z, sx, sy, sz, rx = 0) => { const m = mesh(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, th), hair, x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; head.add(m); return m; };
      if (o.hairStyle === 'pigtails') {
        cap(1, Math.PI * 0.6, 0, 0.012, -0.004, 0.12, 0.133, 0.123, -0.14);
        const fr = mesh(SPH, hair, 0, 0.07, 0.072); fr.scale.set(0.085, 0.03, 0.04); fr.rotation.x = 0.4; head.add(fr);
        for (const s of [-1, 1]) { const tie = mesh(new THREE.TorusGeometry(0.018, 0.007, 6, 12), mat(o.tie, 0.5), s * 0.115, 0.01, -0.03); tie.rotation.y = Math.PI / 2; head.add(tie); const pt = new THREE.Group(); pt.position.set(s * 0.125, 0.0, -0.035); head.add(pt); const b = mesh(SPH, hair, s * 0.02, -0.05, 0); b.scale.set(0.035, 0.07, 0.035); pt.add(b); (this.tails = this.tails || []).push(pt); }
      } else if (o.hairStyle === 'bun') {
        cap(1, Math.PI * 0.6, 0, 0.012, -0.004, 0.121, 0.133, 0.124, -0.12);
        for (const s of [-1, 1]) { const side = mesh(SPH, hair, s * 0.09, -0.01, -0.02); side.scale.set(0.035, 0.07, 0.07); head.add(side); }
        const bun = mesh(SPH, hair, 0, 0.1, -0.075); bun.scale.setScalar(0.05); head.add(bun);
        const sw = mesh(SPH, hair, -0.03, 0.08, 0.07); sw.scale.set(0.07, 0.025, 0.04); sw.rotation.z = 0.3; head.add(sw);
      } else if (o.hairStyle === 'cap') {
        cap(1, Math.PI * 0.45, 0, 0.02, -0.01, 0.12, 0.12, 0.12, -0.1);
        const c = mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.cap, 0.6), 0, 0.04, 0); c.scale.set(0.12, 0.09, 0.125); head.add(c);
        const vis = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 16, 1, false, -Math.PI / 2, Math.PI), mat(o.cap, 0.6), 0, 0.045, 0.1); vis.scale.z = 1.1; head.add(vis);
        const logo = mesh(new THREE.CircleGeometry(0.02, 12), mat(0xffffff, 0.6), 0, 0.09, 0.105); logo.rotation.x = -0.5; head.add(logo);
      }
      // arms
      this.arms = [];
      for (const s of [-1, 1]) {
        const sh = new THREE.Group(); sh.position.set(s * 0.2, 0.47, 0); spine.add(sh);
        { const sb = mesh(SPH, o.cardigan ? mat(o.cardigan, 0.95, { map: 'fabric' }) : o.overalls ? mat(0xb84a3a, 0.9) : shirt); sb.scale.setScalar(0.058); sh.add(sb); }
        sh.add(mesh(new THREE.CylinderGeometry(0.05, 0.043, 0.3, 10), o.cardigan ? mat(o.cardigan, 0.95, { map: 'fabric' }) : o.overalls ? mat(0xb84a3a, 0.9) : shirt, 0, -0.15, 0));
        const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
        el.add(mesh(new THREE.CylinderGeometry(0.041, 0.034, 0.27, 10), o.cardigan ? mat(o.cardigan, 0.95, { map: 'fabric' }) : skin, 0, -0.135, 0));
        const hand = new THREE.Group(); hand.position.y = -0.29; el.add(hand);
        const pm = mesh(SPH, skin, 0, -0.02, 0); pm.scale.set(0.035, 0.05, 0.022); hand.add(pm);
        const th = mesh(SPH, skin, -s * 0.03, -0.005, 0.015); th.scale.set(0.012, 0.025, 0.012); th.rotation.z = s * 0.5; hand.add(th);
        this.arms.push({ sh, el, hand, s });
      }
      this.t = Math.random() * 10; this.ph = 0; this.blink = 2; this.look = 0; this.pose = 'idle'; this.speed = 0;
      this.pos = V3(); this.yaw = 0; this.path = []; this.state = 'idle';
    }
    /* pose blending: every frame compute target joint angles for the current action */
    update(dt, st = {}) {
      this.t += dt; const t = this.t, sp = this.speed, act = st.action || this.pose;
      const walking = sp > 0.1 && !['sit', 'drive', 'lie', 'sitbed', 'fall'].includes(act);
      const run = sp > 2;
      this.ph += dt * (walking ? (run ? sp * 3.1 : sp * 5.4) : 0);
      const J = { hipY: 0.93, hipRX: 0, spine: 0, head: 0, headY: 0, th: [0, 0], kn: [0, 0], ft: [0, 0], shX: [0, 0], shZ: [0.12, -0.12], el: [-0.15, -0.15], rootRX: 0, handY: 0 };
      if (walking) {
        const s1 = Math.sin(this.ph), amp = run ? 0.85 : 0.45;
        J.th = [s1 * amp, -s1 * amp]; J.kn = [Math.max(0, -Math.cos(this.ph)) * (run ? 1.4 : 0.7), Math.max(0, Math.cos(this.ph)) * (run ? 1.4 : 0.7)];
        J.shX = [-s1 * amp * 0.9, s1 * amp * 0.9]; J.el = run ? [-1.3, -1.3] : [-0.3, -0.3];
        J.hipY = 0.93 + Math.abs(Math.cos(this.ph)) * (run ? 0.05 : 0.02) - (run ? 0.03 : 0); J.spine = run ? 0.25 : 0.04;
      } else {
        const br = Math.sin(t * 1.8) * 0.015; J.spine = br; J.shZ = [0.1 + br, -0.1 - br];
      }
      switch (act) {
        case 'wave': J.shZ[1] = -2.4; J.shX[1] = -0.35; J.el[1] = -0.15 + Math.sin(t * 9) * 0.3; break;
        case 'wave2': J.shZ = [2.6, -2.6]; J.el = [-0.4 + Math.sin(t * 9) * 0.35, -0.4 - Math.sin(t * 9) * 0.35]; J.hipY += Math.abs(Math.sin(t * 6)) * 0.03; break;
        case 'cheer': J.shZ = [2.7, -2.7]; J.el = [-0.2, -0.2]; J.hipY += Math.abs(Math.sin(t * 8)) * 0.07; break;
        case 'point': J.shX[1] = -1.5; J.el[1] = 0; break;
        case 'reach': case 'pet': J.spine = 0.75; J.hipY = 0.62; J.th = [-1.1, -0.6]; J.kn = [1.7, 1.1]; J.shX = [-1.2, -1.2]; J.el = [-0.2, -0.2]; if (act === 'pet') J.el[1] = -0.4 + Math.sin(t * 7) * 0.3; J.head = 0.4; break;
        case 'lunge': J.spine = 0.95; J.hipY = 0.7; J.th = [-1.2, 0.3]; J.kn = [1.2, 0.3]; J.shX = [-2.2, -2.2]; J.el = [0, 0]; J.head = -0.2; break;
        case 'fall': J.hipY = 0.2; J.th = [-1.5, -1.4]; J.kn = [0.2, 0.4]; J.spine = -0.35; J.shX = [0.6, 0.5]; J.shZ = [0.5, -0.5]; J.head = 0.25 + Math.sin(t * 4) * 0.1; break;
        case 'carry': J.shX = [-0.9, -0.9]; J.shZ = [-0.15, 0.15]; J.el = [-1.0, -1.0]; break;
        case 'hug': J.shX = [-1.1, -1.1]; J.shZ = [-0.5, 0.5]; J.el = [-1.5, -1.5]; J.head = 0.25; J.headY = Math.sin(t * 2) * 0.15; break;
        case 'cook': J.shX = [-0.8, -0.8]; J.el = [-0.9 + Math.sin(t * 5) * 0.2, -0.9 - Math.sin(t * 5) * 0.2]; J.head = 0.35; break;
        case 'cry': J.shX = [-2.1, -2.1]; J.shZ = [-0.35, 0.35]; J.el = [-2.1, -2.1]; J.head = 0.4; J.hipY += Math.sin(t * 10) * 0.005; break;
        case 'laugh': J.head = -0.3 + Math.sin(t * 12) * 0.08; J.spine = -0.1; J.shZ = [0.3, -0.3]; break;
        case 'think': J.shX[1] = -2.2; J.el[1] = -2.2; J.head = 0.1; J.headY = 0.2; break;
        case 'sit': case 'read': case 'drive': J.hipY = 0.48; J.th = [-1.5, -1.5]; J.kn = [1.5, 1.5]; J.spine = 0.05; if (act === 'read') { J.shX = [-0.9, -0.9]; J.el = [-1.1, -1.1]; J.shZ = [-0.2, 0.2]; J.head = 0.4; } if (act === 'drive') { J.shX = [-1.1, -1.1]; J.el = [-0.5, -0.5]; J.shZ = [-0.1 + Math.sin(t * 0.8) * 0.06, 0.1 + Math.sin(t * 0.8) * 0.06]; } break;
        case 'sitfloor': J.hipY = 0.16; J.th = [-1.45, -1.45]; J.kn = [2.2, 2.2]; J.spine = 0.15; J.shX = [-0.7, -0.7]; J.el = [-0.6, -0.6]; J.head = 0.3; break;
        case 'lie': J.th = [0, 0]; J.kn = [0.05, 0.05]; J.shZ = [0.1, -0.1]; J.shX = [-0.2, -0.2]; J.head = Math.sin(t * 0.5) * 0.05; break;
        case 'sitbed': J.hipY = 0.18; J.th = [-1.55, -1.55]; J.kn = [0.1, 0.1]; J.shX = [-0.9, -0.9]; J.el = [-0.9, -0.9]; J.shZ = [-0.2, 0.2]; J.head = 0.2; break;
        case 'lift': J.shX = [-1.9 + Math.sin(t * 2) * 0.1, -1.9 + Math.sin(t * 2) * 0.1]; J.el = [-0.4, -0.4]; J.head = -0.3; break;
        case 'garden': J.hipY = 0.35; J.th = [-1.9, -1.9]; J.kn = [2.4, 2.4]; J.spine = 0.6; J.shX = [-1.1, -1.1]; J.el = [-0.3 + Math.sin(t * 4) * 0.3, -0.3]; J.head = 0.5; break;
      }
      // blend toward targets
      const k = 1 - Math.exp(-12 * dt), L = (a, b) => a + (b - a) * k;
      this.hips.position.y = L(this.hips.position.y, J.hipY); this.spine.rotation.x = L(this.spine.rotation.x, J.spine);
      this.legs.forEach((l, i) => { l.th.rotation.x = L(l.th.rotation.x, J.th[i]); l.kn.rotation.x = L(l.kn.rotation.x, J.kn[i]); l.ft.rotation.x = L(l.ft.rotation.x, -(J.th[i] + J.kn[i]) * 0.5 + (act === 'sitbed' || act === 'lie' ? 0.8 : 0)); });
      this.arms.forEach((a, i) => { a.sh.rotation.x = L(a.sh.rotation.x, J.shX[i]); a.sh.rotation.z = L(a.sh.rotation.z, J.shZ[i] * (a.s > 0 ? 1 : 1)); a.el.rotation.x = L(a.el.rotation.x, J.el[i]); });
      const lookY = st.lookY !== undefined ? U.clamp(st.lookY, -1, 1) : Math.sin(t * 0.4) * 0.3;
      this.head.rotation.y = L(this.head.rotation.y, lookY + J.headY); this.head.rotation.x = L(this.head.rotation.x, J.head + (st.lookX || 0));
      // blinking, mouth, pigtails bounce
      this.blink -= dt; const es = this.blink < 0.12 ? 0.1 : act === 'laugh' ? 0.3 : 1; if (this.blink < 0) this.blink = 2 + Math.random() * 3;
      this.eyes.forEach((e) => (e.scale.y = act === 'lie' ? 0.1 : es));
      this.mouth.scale.set(1, act === 'cry' || act === 'fall' ? -1 : act === 'laugh' || act === 'cheer' ? 1.6 : st.talking ? 1 + Math.abs(Math.sin(t * 14)) * 0.8 : 1, 1);
      if (this.tails) this.tails.forEach((p, i) => (p.rotation.z = Math.sin(this.ph + i) * 0.25 * (walking ? 1 : 0.2)));
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
      this.body.rotation.x = L(this.body.rotation.x, act === 'lunge' ? 0.35 : 0);
      this.shadow.visible = act !== 'lie' && act !== 'sitbed';
    }
    handPos(out) { this.root.updateMatrixWorld(true); const a = V3(), b = V3(); this.arms[0].hand.getWorldPosition(a); this.arms[1].hand.getWorldPosition(b); return out.copy(a).add(b).multiplyScalar(0.5); }
  }
  G.Human = Human;

  /* ================================================================ movement helpers */
  function moveH(h, tx, tz, sp, dt, collide = true) {
    const g = game(), p = h.pos, dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
    if (l < 0.05) { h.speed = U.damp(h.speed, 0, 8, dt); return true; }
    const step = Math.min(sp * dt, l); p.x += (dx / l) * step; p.z += (dz / l) * step; h.speed = sp;
    h.yaw = U.dampAngle(h.yaw, Math.atan2(dx, dz), 9, dt);
    if (collide) for (const c of g.near(p.x - 0.4, p.x + 0.4, p.z - 0.4, p.z + 0.4)) {
      if (!c.on || !(p.y + 1.5 > c.y0 && p.y + 0.25 < c.y1)) continue;
      const cx = U.clamp(p.x, c.x0, c.x1), cz = U.clamp(p.z, c.z0, c.z1), ex = p.x - cx, ez = p.z - cz, d2 = ex * ex + ez * ez;
      if (d2 < 0.22 * 0.22 && d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (ex / d) * 0.22; p.z = cz + (ez / d) * 0.22; }
    }
    return l - step < 0.06;
  }
  function followPath(h, dt, sp) { const w = h.path[0]; if (!w) { h.speed = U.damp(h.speed, 0, 8, dt); return true; } if (moveH(h, w[0], w[2] !== undefined ? w[2] : w[1], w.sp || sp, dt, !h.noCollide)) h.path.shift(); return !h.path.length; }
  const sheltered = () => { const p = game().player; return p.overhead < 0.62 || EXT.hidden; };

  /* ================================================================ CARS */
  function makeCar(col, family) {
    const g = new THREE.Group(), paint = mat(col, 0.25, { metal: 0.4, envI: 1.3 }), dark = mat(0x1c1c1e, 0.8), glass = Mt.get('glass'), chrome = Mt.get('chrome');
    const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    const low = add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.3), paint), 0, 0.58, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.12, 4.36), dark), 0, 0.36, 0);
    const cab = add(new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.52, family ? 2.6 : 2.1), paint), 0, 1.1, family ? -0.35 : -0.15);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.4, family ? 2.5 : 2.0), glass), 0, 1.1, family ? -0.35 : -0.15);
    for (const s of [-1, 1]) { add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), mat(0xfff2c0, 0.2, { emissive: 0xfff2c0, ei: 0.5 })), s * 0.6, 0.66, 2.16); add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), mat(0xc0392b, 0.3, { emissive: 0x801010, ei: 0.4 })), s * 0.62, 0.7, -2.16); }
    add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.06), chrome), 0, 0.5, 2.18);
    g.userData.wheels = [];
    for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) { const w = new THREE.Group(); w.position.set(x, 0.34, z); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), dark); t.rotation.z = Math.PI / 2; t.castShadow = true; w.add(t); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12), chrome); hub.rotation.z = Math.PI / 2; w.add(hub); g.add(w); g.userData.wheels.push(w); }
    if (family) {
      // doors that open, a roof rack with luggage
      g.userData.doors = [];
      for (const [x, z, s] of [[0.91, 0.35, 1], [-0.91, 0.35, -1], [-0.91, -0.9, -1]]) { const d = new THREE.Group(); d.position.set(x, 0.4, z + 0.55); const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 1.05), paint); p.position.set(0, 0.45, -0.52); p.castShadow = true; d.add(p); const wn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.8), glass); wn.position.set(0, 0.72, -0.52); d.add(wn); d.userData.s = s; g.add(d); g.userData.doors.push(d); }
      const trunk = new THREE.Group(); trunk.position.set(0, 1.36, -1.65); const tp = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.8, 0.06), paint); tp.position.set(0, -0.4, -0.03); tp.castShadow = true; trunk.add(tp); g.add(trunk); g.userData.trunk = trunk;
      add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 1.8), dark), 0, 1.4, -0.35);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.6), mat(0xd98f6a, 0.7)), -0.2, 1.6, -0.2); add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.5), mat(0x3f6fa0, 0.7)), 0.35, 1.56, -0.8);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshBasicMaterial({ map: G.Tex.make('plate', 128, 36, (c) => { c.fillStyle = '#f2ebe0'; c.fillRect(0, 0, 128, 36); c.fillStyle = '#2a3a55'; c.font = 'bold 22px sans-serif'; c.fillText('FERRET 1', 14, 27); }) })); plate.position.set(0, 0.5, -2.19); plate.rotation.y = Math.PI; g.add(plate);
    }
    g.userData.speed = 0; return g;
  }
  function carTick(car, dt) { const s = car.userData.speed || 0; car.userData.wheels.forEach((w) => (w.rotation.x += s * dt / 0.34)); car.children[0].position.y = 0.58 + (s > 0.5 ? Math.sin(game().t * 18) * 0.008 : 0); }
  function openDoor(car, i, open) { const d = car.userData.doors[i]; const from = d.rotation.y, to = open ? d.userData.s * 1.1 : 0; game().tween(0.5, (k) => (d.rotation.y = U.lerp(from, to, U.smooth(k)))); A.play(open ? 'door' : 'thud', 0.5); }

  /* ================================================================ WORLD: highway, gas station, farmland */
  const oBuild = EXT.buildWorld;
  EXT.buildWorld = function (W) {
    oBuild(W);
    const H = W.h, root = W.root, dyn = (m) => { m.userData.dynamic = true; m.traverse((o) => (o.userData.dynamic = true)); return m; };
    const sub = (id, name, x0, x1, z0, z1, o = {}) => W.areas.unshift(Object.assign({ id, name, x0, x1, z0, z1 }, o));
    // ground
    H.plane(90.5, 216, -46, 61, 0, 'grass', 6); W.grassZones.push([96, 138, -44, 60, 0.35], [153, 214, 26, 60, 0.6], [153, 214, -45, -26, 0.5]);
    H.plane(139, 153, -160, 160, 0.012, 'asphalt', 6, { po: 1 });
    for (let z = -158; z < 160; z += 6) H.plane(145.85, 146.15, z, z + 3, 0.016, 'paint', 2, { po: 2 });
    for (const x of [139.6, 152.4]) H.plane(x - 0.08, x + 0.08, -160, 160, 0.016, M_paint(), 2, { po: 2 });
    for (const x of [139.2, 152.8]) { for (let z = -150; z < 150; z += 4) H.box({ w: 0.35, h: 0.8, d: 3.9, x, z: z + 2, mat: 'concrete', col: false }); H.collider(x - 0.2, x + 0.2, -160, 160, 0, 3, { cam: false }); }
    W.noGrass.push([138, 154, -160, 160]);
    // boundaries around the farmland
    H.collider(90, 216, -47, -46, 0, 8, { cam: false }); H.collider(90, 216, 61, 62, 0, 8, { cam: false }); H.collider(215, 216, -47, 62, 0, 8, { cam: false });
    for (let x = 94; x < 214; x += 1.2) { if (x > 137 && x < 155) continue; W.bushes.push([x, 0.8, -46.4 + Math.random() * 0.4, 1 + Math.random() * 0.4, 0x3f5a2a], [x, 0.8, 61.3 + Math.random() * 0.4, 1 + Math.random() * 0.4, 0x3f5a2a]); }
    for (let z = -44; z < 60; z += 1.2) W.bushes.push([215.3, 0.8, z, 1.1, 0x3f5a2a]);
    // gas station lot
    H.plane(153, 205, -25, 25, 0.014, M_lot(), 5, { po: 1 }); W.noGrass.push([152.5, 205.5, -25.5, 25.5]);
    H.plane(155, 186, -24.6, -20.5, 0.02, 'grass', 3, { po: 2 }); W.grassZones.push([155, 186, -24.5, -20.6, 1.3]);
    // canopy + pumps
    for (const [x, z] of [[170, -7], [180, -7], [170, 7], [180, 7]]) H.cyl({ r: 0.18, h: 4.3, x, z, mat: 'white', col: true });
    H.box({ w: 13, h: 0.5, d: 17, x: 175, y: 4.3, z: 0, mat: M_canopy(), col: false }); H.box({ w: 13.2, h: 0.15, d: 17.2, x: 175, y: 4.25, z: 0, mat: 'red', col: false });
    for (const z of [-3.2, 3.2]) { H.box({ w: 1.4, h: 0.15, d: 4.2, x: 175, z, mat: 'concrete', climb: true }); for (const dz of [-1.1, 1.1]) { H.box({ w: 0.7, h: 1.5, d: 0.5, x: 175, y: 0.15, z: z + dz, mat: M_pump(), col: true }); H.box({ w: 0.72, h: 0.3, d: 0.3, x: 175, y: 1.2, z: z + dz, mat: M_screen(), col: false }); } }
    H.light(175, 4, 0, 0xfff2e0, 1.6, 14, { night: true });
    // the store
    H.box({ w: 12, h: 3.6, d: 20, x: 196, z: 0, mat: 'brick', s: 1.6 }); H.box({ w: 12.4, h: 0.4, d: 20.4, x: 196, y: 3.6, z: 0, mat: 'darkwood', col: false });
    for (const z of [-6, 6]) H.box({ w: 0.06, h: 1.8, d: 5, x: 189.98, y: 0.7, z, mat: 'shopglass', col: false });
    H.doorPanel(189.97, 0, -Math.PI / 2, 1.3, 2.2, M_storeDoor());
    const sign = G.Tex.make('gussign', 512, 128, (c, w, h) => { c.fillStyle = '#c0392b'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2ebe0'; c.font = 'bold 54px Georgia'; c.textAlign = 'center'; c.fillText("GUS'S GAS & SNACKS", w / 2, 62); c.font = '26px Georgia'; c.fillText('Cold drinks • Hot dogs • Worms', w / 2, 104); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 })); sg.position.set(189.95, 3.1, 0); sg.rotation.y = -Math.PI / 2; root.add(sg);
    const tall = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.5), new THREE.MeshStandardMaterial({ map: G.Tex.make('fuelsign', 256, 96, (c) => { c.fillStyle = '#2a3a55'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#f2c14e'; c.font = 'bold 40px sans-serif'; c.fillText('FUEL  3.99', 18, 62); }), roughness: 0.6, side: THREE.DoubleSide })); tall.position.set(156, 7, -18); root.add(tall); H.cyl({ r: 0.2, h: 6.3, x: 156, z: -18, mat: 'darkmetal', col: true });
    // ice box, bins, crates, the box truck (hide underneath!) and a parked sedan
    H.box({ w: 1, h: 1.2, d: 1.8, x: 189.4, z: -9, mat: M_ice(), col: true });
    for (const [x, z] of [[188.8, -13.5], [188.8, 12.5]]) H.cyl({ r: 0.35, h: 0.9, x, z, mat: M_bin(), col: true });
    const truck = new THREE.Group(); truck.position.set(163, 0, 16.5); root.add(truck);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), mat(0xe8e4d8, 0.5)); tb.position.set(0, 1.75, -0.8); tb.castShadow = true; truck.add(tb);
    const tc = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 1.8), mat(0x3f6f9e, 0.4, { metal: 0.3 })); tc.position.set(0, 1.4, 3); tc.castShadow = true; truck.add(tc);
    const tl = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshStandardMaterial({ map: G.Tex.make('trucklogo', 256, 64, (c) => { c.fillStyle = '#e8e4d8'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#c0392b'; c.font = 'bold 30px sans-serif'; c.fillText('ACME PIES', 40, 44); }) })); tl.position.set(1.21, 1.9, -0.8); tl.rotation.y = Math.PI / 2; truck.add(tl);
    for (const [x, z] of [[-1.1, 2.9], [1.1, 2.9], [-1.1, -2.6], [1.1, -2.6], [-1.1, -1.4], [1.1, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), mat(0x1c1c1e, 0.8)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); truck.add(w); }
    H.collider(161.8, 164.2, 12.7, 20.9, 0.52, 3.2, {}); for (const [x, z] of [[161.9, 19.4], [164.1, 19.4], [161.9, 13.9], [164.1, 13.9], [161.9, 15.1], [164.1, 15.1]]) H.collider(x - 0.15, x + 0.15, z - 0.45, z + 0.45, 0, 0.6, { cam: false });
    const sedan = makeCar(0x8f3b3b, false); sedan.position.set(184, 0, 17); sedan.rotation.y = 0.1; root.add(sedan); H.collider(183, 185, 14.8, 19.2, 0.34, 1.4, {});
    // chain-link fence around the lot (the north gate closes after the family leaves)
    const cl = M_chain();
    H.wall(153, 25, 205, 25, 2, 0.05, cl, cl, [[179.5, 180.5, 0.3]], { s: 2, edge: cl }); H.collider(179.5, 180.5, 24.9, 25.1, 0, 0.3, { name: 'tripDig' });
    H.wall(153, -25, 205, -25, 2, 0.05, cl, cl, [[155, 162, 2]], { s: 2, edge: cl });
    H.wall(205, -25, 205, 25, 2, 0.05, cl, cl, [], { s: 2, edge: cl });
    for (let x = 153; x <= 205; x += 3) { H.cyl({ r: 0.04, h: 2.1, x, z: 25, mat: 'metal' }); H.cyl({ r: 0.04, h: 2.1, x, z: -25, mat: 'metal' }); }
    const gate = dyn(new THREE.Group()); gate.position.set(155, 0, -25); root.add(gate); W.obj.tripGate = gate;
    const gp = new THREE.Mesh(new THREE.BoxGeometry(7, 1.9, 0.05), cl); gp.position.set(3.5, 0.95, 0); gate.add(gp); dyn(gp); const gf = new THREE.Mesh(new THREE.BoxGeometry(7, 0.06, 0.06), Mt.get('metal')); gf.position.set(3.5, 1.9, 0); gate.add(gf); dyn(gf);
    const gcol = H.collider(155, 162, -25.1, -24.9, 0, 2, { name: 'tripGate' }); gcol.on = false;
    const mound = dyn(H.sph({ x: 180, y: 0, z: 24.5, r: 0.4, sy: 0.3, mat: 'dirt', name: 'tripMound' }));
    // ditch culvert under the highway
    for (const [x, ry] of [[154.3, -Math.PI / 2], [137.7, Math.PI / 2]]) { const pipe = H.cyl({ r: 0.45, h: 0.8, x, y: 0.2, z: 30, mat: 'concrete', rz: Math.PI / 2, open: true }); pipe.material = pipe.material.clone(); pipe.material.side = THREE.DoubleSide; const hole = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), Mt.color(0x0b0706, 1)); hole.position.set(x + (x > 146 ? 0.41 : -0.41), 0.2, 30); hole.rotation.y = ry; root.add(hole); }
    H.tunnel('CULVERT', [[154, UG, 30], [150, UG, 30], [146, UG, 30.4], [142, UG, 30], [138, UG, 30]]);
    sub('culvert', 'Under the Highway', 136, 156, 27, 33, { ug: true, zone: 'under', surf: 'stone', dark: true });
    // farmland: a cornfield maze, a water tower, a scarecrow, power poles
    const cornPts = [], rng = U.rng(77); EXT.cornGaps = [];
    for (let i = 0; i < 12; i++) {
      const x = 104 + i * 2.1, gaps = [8 + rng() * 30, 8 + rng() * 30].sort((a, b) => a - b); EXT.cornGaps.push([x, gaps[0]]);
      let z0 = -45;
      for (const gz of gaps) { H.collider(x - 0.3, x + 0.3, z0, gz - 0.7, 0, 2.2, { cam: false }); z0 = gz + 0.7; }
      H.collider(x - 0.3, x + 0.3, z0, 61, 0, 2.2, { cam: false });
      for (let z = -45; z < 61; z += 0.42) { if (gaps.some((gz) => Math.abs(z - gz) < 0.75)) continue; cornPts.push([x + (rng() - 0.5) * 0.25, z, 1.6 + rng() * 0.6]); }
    }
    EXT.cornPts = cornPts; W.noGrass.push([102.5, 128.5, -46, 61]);
    H.plane(102.5, 128.5, -46, 61, 0.008, 'soil', 3, { po: 1 });
    const wt = new THREE.Group(); wt.position.set(98, 0, -30); root.add(wt);
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 11, 8), Mt.get('darkmetal')); l.position.set(x * 0.8, 5.5, z * 0.8); l.rotation.z = -x * 0.03; wt.add(l); }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3.5, 24), mat(0xb8c8d0, 0.4, { metal: 0.4 })); tank.position.y = 12.5; tank.castShadow = true; wt.add(tank);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 24), mat(0x8a9aa0, 0.4, { metal: 0.4 })); roof.position.y = 15; wt.add(roof);
    const wtl = new THREE.Mesh(new THREE.CylinderGeometry(3.02, 3.02, 1, 24, 1, true, -0.8, 1.6), new THREE.MeshStandardMaterial({ map: G.Tex.make('wtlabel', 256, 64, (c) => { c.fillStyle = '#b8c8d0'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#2a3a55'; c.font = 'bold 34px Georgia'; c.fillText('MAPLE TOWN', 22, 44); }), roughness: 0.5 })); wtl.position.y = 12.6; wt.add(wtl);
    for (let x = 94; x < 138; x += 11) { H.cyl({ r: 0.12, h: 7, x, z: 24, mat: 'bark', col: true }); H.box({ w: 0.1, h: 0.1, d: 1.6, x, y: 6.6, z: 24, mat: 'darkwood', col: false }); }
    const scare = new THREE.Group(); scare.position.set(133.5, 0, 27.4); root.add(scare);
    scare.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), Mt.get('bark'), 0, 0.9, 0)); scare.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), Mt.get('bark'), 0, 1.4, 0)).rotation.z = Math.PI / 2;
    scare.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.3), mat(0x8e3b2e, 0.9, { map: 'fabric' }), 0, 1.3, 0)); scare.add(mesh(SPH, mat(0xe0c890, 0.9), 0, 1.8, 0)).scale.setScalar(0.18); scare.add(mesh(new THREE.ConeGeometry(0.3, 0.3, 12), mat(0xc9a24a, 0.9), 0, 2.02, 0));
    H.collider(133.3, 133.7, 27.2, 27.6, 0, 1.2, {});
    // a hole in the town hedge at the east end of Maple Street
    const hh = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), Mt.color(0x0b0706, 1)); hh.position.set(90.82, 0.26, 20); hh.rotation.y = Math.PI / 2; root.add(hh);
    for (let i = 0; i < 20; i++) W.flowers.push([94 + Math.random() * 8, 16 + Math.random() * 8, [0xf2d24b, 0xffffff, 0xc07ad9][i % 3]]);
    for (const [x, z] of [[95, 40], [97, -12], [134, -30], [135, 50], [160, 45], [190, 40], [210, -35]]) W.trees.push([x, z, 1 + Math.random() * 0.3]);
    sub('station', "Gus's Gas & Snacks", 153, 205, -25, 25, { zone: 'town', surf: 'stone' });
    sub('highway', 'Highway 9', 138.5, 153, -160, 160, { zone: 'town', surf: 'stone' });
    sub('corn', 'The Cornfield', 102.5, 128.5, -46, 61, { zone: 'town', surf: 'dirt' });
    sub('farmland', 'Farmland', 90.5, 216, -46, 61, { zone: 'town', surf: 'grass' });
    W.extraClear.push([98, -30, 3]);
  };
  const M_paint = () => Mt.std('whiteline', { color: 0xf2ebe0, rough: 0.6 });
  const M_lot = () => Mt.std('lot', { map: 'asphalt', color: 0x8a8a90, rough: 0.8 });
  const M_canopy = () => Mt.std('canopy', { color: 0xf2ebe0, rough: 0.5, emissive: 0xffffff, ei: 0.05 });
  const M_pump = () => Mt.std('pump', { color: 0xc0392b, rough: 0.4, metal: 0.2 });
  const M_screen = () => Mt.std('pscreen', { color: 0x2a3a55, emissive: 0x4a8fd0, ei: 0.4 });
  const M_storeDoor = () => Mt.std('storedoor', { color: 0x2f5d4a, rough: 0.5 });
  const M_ice = () => Mt.std('icebox', { color: 0xe8f0f8, rough: 0.3, emissive: 0x4a7fb0, ei: 0.1 });
  const M_bin = () => Mt.std('bin', { color: 0x2f5d4a, rough: 0.5, metal: 0.3 });
  const M_chain = () => { const t = G.Tex.make('chainlink', 64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.strokeStyle = 'rgba(200,205,210,.95)'; c.lineWidth = 2; for (let i = -64; i < 128; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } }); return Mt.std('chain', { color: 0xffffff, rough: 0.4, metal: 0.6, map: 'x' in {} ? null : null, transparent: true }) && (() => { const m = Mt.cache.chainM || (Mt.cache.chainM = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 })); return m; })(); };

  /* ================================================================ CUTSCENE SEQUENCER */
  const SEQ = (G.SEQ = { running: false, skip: false, waits: [], moves: [] });
  const wait = (sec) => new Promise((res) => { if (SEQ.skip) return res(); SEQ.waits.push({ t: game().t + sec, res }); });
  const talk = (lines) => new Promise((res) => { if (SEQ.skip) return res(); game().say(lines, res); });
  const shot = (pos, look, sec) => { game().cinematic({ pos: V3(...pos), look: V3(...look), dur: 999 }); if (game().cine) game().cam.snap = !!SEQ.cut; SEQ.cut = false; return sec ? wait(sec) : Promise.resolve(); };
  const cut = (pos, look, sec) => { SEQ.cut = true; return shot(pos, look, sec); };
  const track = (obj, off, lookOff) => { SEQ.track = obj ? { obj, off: V3(...off), look: V3(...(lookOff || [0, 0.5, 0])) } : null; };
  /* move an actor (human, car, or 'milo') along points; resolves when there */
  const go = (actor, pts, speed) => new Promise((res) => { if (SEQ.skip) { const e = pts[pts.length - 1]; place(actor, e); return res(); } SEQ.moves.push({ actor, pts: pts.map((p) => p.slice()), speed, res }); });
  function place(actor, e) { if (actor === 'milo') { const p = game().player; p.teleport(e[0], e.length > 2 ? e[1] : 0, e.length > 2 ? e[2] : e[1], p.yaw); } else if (actor.isObject3D) { actor.position.set(e[0], 0, e.length > 2 ? e[2] : e[1]); } else { actor.pos.set(e[0], 0, e.length > 2 ? e[2] : e[1]); } }
  async function cutscene(fn) {
    const g = game(); SEQ.running = true; SEQ.skip = false; g.state = 'cutscene'; g.busy = true; UI().showHUD(false); UI().letterbox(true); I.unlock();
    document.getElementById('skipHint').hidden = false;
    try { await fn(); } catch (e) { console.error(e); }
    document.getElementById('skipHint').hidden = true;
    SEQ.running = false; SEQ.skip = false; SEQ.track = null; SEQ.moves.forEach((m) => m.res()); SEQ.moves = [];
    g.cinematicEnd(); g.busy = false; if (g.state === 'cutscene') g.state = 'play'; UI().showHUD(true); UI().updateObjective(true);
  }
  function skipCutscene() { if (!SEQ.running || SEQ.skip) return; SEQ.skip = true; SEQ.lastSkip = performance.now(); if (UI().dialogueOpen) { UI().queue = []; UI().choosing = false; UI().next(); } SEQ.waits.forEach((w) => w.res()); SEQ.waits = []; for (const m of SEQ.moves) { place(m.actor, m.pts[m.pts.length - 1]); m.res(); } SEQ.moves = []; }
  function seqUpdate(dt) {
    const g = game(), t = g.t;
    for (let i = SEQ.waits.length - 1; i >= 0; i--) if (t >= SEQ.waits[i].t) { SEQ.waits[i].res(); SEQ.waits.splice(i, 1); }
    for (let i = SEQ.moves.length - 1; i >= 0; i--) {
      const m = SEQ.moves[i], a = m.actor, w = m.pts[0];
      if (!w) { m.res(); SEQ.moves.splice(i, 1); continue; }
      const tz = w.length > 2 ? w[2] : w[1];
      if (a === 'milo') { const p = g.player; p.auto = { x: w[0], z: tz, speed: m.speed }; if (Math.hypot(p.pos.x - w[0], p.pos.z - tz) < 0.18) m.pts.shift(); }
      else if (a.isObject3D) { const dx = w[0] - a.position.x, dz = tz - a.position.z, l = Math.hypot(dx, dz); a.userData.speed = m.speed; const st = Math.min(m.speed * dt, l); if (l > 0.01) { a.position.x += dx / l * st; a.position.z += dz / l * st; a.rotation.y = U.dampAngle(a.rotation.y, Math.atan2(dx, dz), 4, dt); } if (l < 0.2) { m.pts.shift(); if (!m.pts.length) a.userData.speed = 0; } }
      else { if (moveH(a, w[0], tz, m.speed, dt, false)) m.pts.shift(); }
    }
    if (SEQ.track && g.cine) { const o = SEQ.track.obj, p = o.isObject3D ? o.position : o === 'milo' ? g.player.pos : o.pos; g.cine.pos.copy(p).add(SEQ.track.off); g.cine.look.copy(p).add(SEQ.track.look); }
  }

  /* ================================================================ CAST */
  const C = (G.Cast = {});
  C.init = function (g) {
    for (const id of ['ellie', 'mum', 'gus']) { const h = (C[id] = new Human(id)); h.root.visible = false; g.scene.add(h.root); }
    C.bedEllie = new Human('ellie'); G.World.obj.ellie.add(C.bedEllie.root);
    G.World.obj.ellie.children.forEach((c, i) => { if (i > 0 && c !== C.bedEllie.root) c.visible = false; });
    C.car = makeCar(0x5a8fa8, true); C.car.visible = false; g.scene.add(C.car);
    C.driver = new Human('mum'); C.driver.pose = 'drive'; C.car.add(C.driver.root); C.driver.root.position.set(0.42, 0.05, 0.25); C.driver.root.scale.setScalar(0.95);
    C.passenger = new Human('ellie'); C.passenger.pose = 'sit'; C.car.add(C.passenger.root); C.passenger.root.position.set(-0.42, 0.05, -0.9);
    C.traffic = []; const tc = [0xd9573b, 0xf2c14e, 0x3f6fa0, 0xe8e4d8, 0x2f5d4a, 0x6a4a8a, 0x1c1c1e, 0xb8b8bd];
    for (let i = 0; i < 10; i++) { const car = makeCar(tc[i % tc.length], false); const lane = i % 2 ? 1 : -1; car.userData.lane = lane; car.position.set(146 + lane * 3, 0, -150 + i * 31); car.rotation.y = lane > 0 ? Math.PI : 0; car.userData.speed = 16 + Math.random() * 6; g.scene.add(car); C.traffic.push(car); }
    // portraits
    const shotH = (id) => { const h = new Human(id); h.update(0.016, {}); h.update(0.5, {}); const p = V3(); h.head.getWorldPosition(p); return G.Portrait.shot('h_' + id, h.root, V3(p.x + 0.12, p.y + 0.02, p.z + 0.62), V3(p.x, p.y - 0.02, p.z)); };
    G.UI.portraitsExtra = G.UI.portraitsExtra || {}; for (const id of ['ellie', 'mum', 'gus']) G.UI.portraitsExtra[id] = shotH(id);
    const crowM = crowModel(); C.crow = crowM; crowM.position.set(133.5, 2.2, 27.4); crowM.visible = false; g.scene.add(crowM);
    G.UI.portraitsExtra.corvin = G.Portrait.shot('corvin', crowModel(), V3(0.25, 0.2, 0.6), V3(0, 0.12, 0));
    Object.assign(G.NAMES, { ellie: 'Ellie', mum: 'Mum', gus: 'Gus', corvin: 'Corvin' });
    // corn stalks (instanced)
    const cg = new THREE.CylinderGeometry(0.02, 0.03, 1, 5); cg.translate(0, 0.5, 0); const leaf = new THREE.PlaneGeometry(0.5, 0.08); leaf.translate(0.25, 0, 0);
    const pts = EXT.cornPts, stalks = new THREE.InstancedMesh(cg, Mt.std('cornstalk', { color: 0x9aa04a, rough: 0.8 }), pts.length), leaves = new THREE.InstancedMesh(leaf, Mt.std('cornleaf', { color: 0x7f9a3a, rough: 0.8, side: THREE.DoubleSide }), pts.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    pts.forEach(([x, z, h], i) => { m4.compose(V3(x, 0, z), q.identity(), V3(1, h, 1)); stalks.setMatrixAt(i, m4); for (let k = 0; k < 3; k++) { m4.compose(V3(x, h * (0.35 + k * 0.2), z), q.setFromEuler(e.set(0.4, i * 2.1 + k * 2.2, -0.5)), V3(1, 1, 1)); leaves.setMatrixAt(i * 3 + k, m4); } });
    stalks.frustumCulled = leaves.frustumCulled = false; stalks.castShadow = leaves.castShadow = true; g.scene.add(stalks, leaves); C.corn = [stalks, leaves];
    // talk-to-humans interactions (at home)
    for (const id of ['ellie', 'mum']) G.INTERACT.push({ id: 'h_' + id, pos: [0, -999, 0], r: 1.0, label: () => (id === 'ellie' ? 'Nuzzle Ellie' : 'Beg Mum for a snack'), when: () => C[id].root.visible && C[id].home && !C.chaser && !SEQ.running, act: () => talkHuman(id) });
    G.INTERACT.push({ id: 'h_gus', pos: [0, -999, 0], r: 1, label: 'Sniff Gus’s boots', when: () => false, act: () => {} });
    const crowIt = { id: 'a_corvin', pos: [133.5, 1.2, 27.4], r: 1.6, label: 'Talk to the crow', when: () => S().chapter === 7 && crowM.visible, act: () => talkCrow() }; G.INTERACT.push(crowIt);
  };
  function crowModel() {
    const g = new THREE.Group(), blk = Mt.fur(0x222428, 'crow');
    const b = mesh(SPH, blk, 0, 0.12, 0); b.scale.set(0.08, 0.08, 0.13); g.add(b);
    const h = new THREE.Group(); h.position.set(0, 0.2, 0.09); g.add(h); const hd = mesh(SPH, blk); hd.scale.setScalar(0.06); h.add(hd);
    const bk = mesh(new THREE.ConeGeometry(0.02, 0.08, 6), mat(0x3a3a3a, 0.4), 0, -0.005, 0.08); bk.rotation.x = Math.PI / 2; h.add(bk);
    for (const s of [-1, 1]) { const ey = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xf0d060 })); ey.scale.setScalar(0.009); ey.position.set(s * 0.035, 0.015, 0.04); h.add(ey); }
    const t = mesh(new THREE.BoxGeometry(0.06, 0.01, 0.12), blk, 0, 0.1, -0.16); t.rotation.x = -0.3; g.add(t);
    for (const s of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4), mat(0x3a3a3a)); l.position.set(s * 0.03, 0.04, 0); g.add(l); }
    g.userData.head = h; return g;
  }

  /* ================================================================ FAMILY AT HOME */
  const SPOTS = {
    mum: [{ at: [6.4, 0, -4.95], yaw: Math.PI, pose: 'cook', t: 22 }, { at: [4, 0, -2.0], yaw: Math.PI, pose: 'idle', t: 10 }, { at: [-4.5, 0, 4.9], yaw: Math.PI, pose: 'read', t: 25, seat: 0.18 }, { at: [3, 0, 5.1], yaw: Math.PI, pose: 'idle', t: 8 }, { at: [-1.7, 0, -4.6], yaw: Math.PI, pose: 'sit', t: 14, seat: 0.05 }],
    ellie: [{ at: [-3.6, 0, 2.9], yaw: 0.6, pose: 'sitfloor', t: 22 }, { at: [-1.7, 0, -4.7], yaw: Math.PI, pose: 'sit', t: 20, seat: 0.05 }, { at: [-5, 0, -2.4], yaw: 2, pose: 'sitfloor', t: 18 }, { at: [2.9, 0, -2.8], yaw: Math.PI / 2, pose: 'sit', t: 14, seat: 0.05 }],
  };
  function homeAvailable(id) {
    const s = S(), c = s.chapter, e = G.env || {}, day = (e.night || 0) < 0.55;
    if (SEQ.running || s.chapter === 7 || game().state === 'title') return false;
    if (!day) return false;
    if (id === 'mum') return [2, 3, 4, 6].includes(c) || c >= 10;
    return [4, 6].includes(c) || c >= 10 || (c === 2 && !!(s.quests || {}).mochi);
  }
  function homeTick(id, dt) {
    const h = C[id], g = game(), pl = g.player; if (C.chaser === h) return;
    const avail = homeAvailable(id);
    if (!avail) { if (h.home) { h.home = false; h.root.visible = false; } return; }
    if (!h.home) { h.home = true; h.root.visible = true; h.spot = 0; const sp = SPOTS[id][0]; h.pos.set(...sp.at); h.yaw = sp.yaw; h.pose = sp.pose; h.timer = sp.t; h.path = []; }
    const sp = SPOTS[id][h.spot];
    if (h.path.length) { h.pose = 'idle'; if (followPath(h, dt, 1.3)) { h.pos.x = sp.at[0]; h.pos.z = sp.at[2]; } }
    else { h.speed = U.damp(h.speed, 0, 8, dt); h.yaw = U.dampAngle(h.yaw, sp.yaw, 4, dt); h.pose = sp.pose; h.timer -= dt; if (h.timer <= 0) { h.spot = (h.spot + 1) % SPOTS[id].length; const n = SPOTS[id][h.spot]; h.timer = n.t; h.path = G.World.navPath([h.pos.x, 0, h.pos.z], n.at).slice(1); } }
    h.pos.y = h.path.length ? 0 : (sp.seat || 0);
    // look at Milo, and say hi occasionally
    const d = Math.hypot(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z);
    h.lookY = d < 4 ? U.angDiff(h.yaw, Math.atan2(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z)) : undefined;
    if (d < 2.5 && !h.greeted && !UI().dialogueOpen && g.state === 'play') { h.greeted = true; UI().toast(`<b>${h.o.name}</b>`, G.UI.portraitsExtra[id], id === 'ellie' ? '"Hi Milo! Who’s a good noodle?"' : '"Hello, trouble."'); }
    if (d > 6) h.greeted = false;
    const it = G.INTERACT.find((x) => x.id === 'h_' + id); it.pos[0] = h.pos.x; it.pos[1] = 0; it.pos[2] = h.pos.z;
    // keep Milo from walking through people
    if (d < 0.35 && Math.abs(pl.pos.y) < 0.5 && d > 0.001) { pl.pos.x = h.pos.x + (pl.pos.x - h.pos.x) / d * 0.35; pl.pos.z = h.pos.z + (pl.pos.z - h.pos.z) / d * 0.35; }
    // bath time!
    C.bathT = (C.bathT === undefined ? 200 + Math.random() * 200 : C.bathT) - dt;
    if (C.bathT <= 0 && id === 'mum' && g.state === 'play' && !g.busy && !UI().dialogueOpen && d < 9 && G.env.area && G.env.area.zone === 'house') { C.bathT = 360 + Math.random() * 300; startChase(h, 'bath'); }
  }
  function talkHuman(id) {
    const h = C[id], s = S(), c = s.chapter, q = s.quests || {}; const pl = game().player;
    h.yaw = Math.atan2(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z); pl.yaw = Math.atan2(h.pos.x - pl.pos.x, h.pos.z - pl.pos.z);
    const prev = h.pose; h.pose = 'pet'; setTimeout(() => (h.pose = prev), 2500); A.play('dook');
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (id === 'ellie') {
      const lines = [pick([
        ['ellie', 'Milo! Who’s the fluffiest noodle in the whole world? You are!', 'happy'],
        ['ellie', c >= 6 ? 'I play Grandpa’s music box every night now. You found it, didn’t you? I just KNOW it.' : 'Mum says you’ve been digging in the garden again. I said it was a squirrel. You owe me.', 'smug'],
        ['ellie', q.mochi === 'done' ? 'You and Mochi are best friends now. I’m a little bit jealous. A little.' : 'I wish I could go on adventures like you. Where do you even GO all day?', 'think'],
      ])];
      const opts = [{ t: 'Do a happy war dance', then: [{ do: () => { game().player.dance(2.4); h.pose = 'laugh'; setTimeout(() => (h.pose = 'idle'), 2200); } }, ['ellie', 'Hahaha! Do the dance again! Mum, MUM, he’s doing the dance!', 'happy']] }];
      if (G.isPost(c) && !has('tripDone') && !has('tripStarted')) opts.unshift({ t: 'Ask about the suitcase by the door', then: [['ellie', 'We’re going on a ROAD TRIP to see Grandpa Arlo! And you and Mochi are coming too! We leave right now!', 'happy'], { do: () => setTimeout(() => startTrip(false), 400) }] });
      opts.push({ t: 'Steal her sock and run!', then: [['ellie', 'Hey! My SOCK! Come back here, you little thief!', 'surprised'], { do: () => startChase(h, 'sock') }] });
      return game().say([...lines, { choice: opts }]);
    }
    const lines = [pick([
      ['mum', 'No, you may not have any of my sandwich. ...Fine. One crumb.', 'smug'],
      ['mum', 'Somebody keeps stealing my socks. I have my suspicions.', 'think'],
      ['mum', c >= 6 ? 'That music box... I haven’t heard it since Ellie was little. Dad cried on the phone for an hour.' : 'Have you been in the vegetable bed? There’s a very ferret-shaped hole in my lettuces.', 'think'],
    ])];
    return game().say([...lines, { choice: [
      { t: 'Beg with big eyes', then: [['mum', 'Oh, don’t look at me like that. Here. ONE treat.', 'happy'], { do: () => { if (!has('mumTreatToday')) { game().flag('mumTreatToday'); game().give('treat'); } else UI().toast('<b>Nice try</b>', G.UI.portraitsExtra.mum, 'Mum only falls for the big eyes once.'); } }] },
      { t: 'Steal her slipper and run!', then: [['mum', 'MILO! That’s my slipper! Bath time for you, mister!', 'surprised'], { do: () => startChase(h, 'bath') }] },
    ] }]);
  }

  /* ================================================================ THE CHASE: escape the humans */
  C.startChase = (h, why) => startChase(h, why);
  function startChase(h, why) {
    const g = game(); C.chaser = h; h.chase = { why, t: 0, shelter: 0, far: 0, lunge: 0, stumble: 0, repath: 0 }; h.path = []; h.root.visible = true;
    A.play('woof'); A.play('squeak');
    UI().toast(why === 'gus' ? '<b>Escape!</b>' : '<b>Uh oh!</b>', G.UI.portraitsExtra[h.id], why === 'bath' ? 'Bath time! Escape: hide under furniture or run outside.' : why === 'sock' ? 'Ellie wants her sock back. Don’t get caught!' : 'Gus is trying to catch you. Hide under the truck or a car, or outrun him.');
    document.body.classList.add('chased');
  }
  function endChase(h, caught) {
    document.body.classList.remove('chased'); const why = h.chase.why; h.chase = null; C.chaser = null; h.pose = 'idle'; h.path = [];
    if (!caught) {
      const l = { bath: ['mum', 'Where did that ferret GO? ...Fine. Bath tomorrow.', 'think'], sock: ['ellie', 'Hmph. Keep the sock. I have like forty.', 'smug'], gus: ['gus', 'Huh. Where’d the little noodle go? Slippery as a greased hot dog.', 'think'] }[why];
      UI().toast(`<b>You escaped!</b>`, G.UI.portraitsExtra[h.id], l[1]); A.play('secret'); game().player.happy();
      S().flags['escaped_' + why] = (S().flags['escaped_' + why] || 0) + 1;
      if (why === 'gus') { h.pose = 'think'; h.path = [[188.5, -1.5], [189.5, 0]]; C.gusSearch = 6; }
      return;
    }
    caughtScene(h, why);
  }
  function chaseTick(h, dt) {
    const g = game(), pl = g.player, ch = h.chase; if (!ch) return; ch.t += dt;
    const d = Math.hypot(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z), hid = sheltered();
    h.lookY = U.angDiff(h.yaw, Math.atan2(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z));
    if (ch.stumble > 0) { ch.stumble -= dt; h.pose = 'fall'; h.speed = 0; if (ch.stumble <= 0 && Math.random() < 0.5) game().say([[h.id, h.id === 'gus' ? 'Oof! My knee! ...Okay. OKAY. You’re fast.' : h.id === 'mum' ? 'Whoa! Slippery little...' : 'Wheee- oof!', 'surprised']]); return; }
    if (ch.lunge > 0) { ch.lunge -= dt; h.pose = 'lunge'; moveH(h, h.pos.x + Math.sin(h.yaw) * 2, h.pos.z + Math.cos(h.yaw) * 2, 2.6, dt); if (ch.lunge <= 0) { const dd = Math.hypot(pl.pos.x - h.pos.x, pl.pos.z - h.pos.z); if (dd < 0.75 && !hid) { endChase(h, true); } else { ch.stumble = 1.5; A.play('thud'); } } return; }
    // give up conditions: hiding under things, too far away, or out of reach
    const outOfArea = ch.why === 'gus' ? pl.pos.z > 25.3 || pl.pos.y < -5 : !(G.env.area && G.env.area.zone === 'house');
    if (hid && d < 3.5) ch.shelter += dt; else ch.shelter = Math.max(0, ch.shelter - dt * 0.5);
    if (d > (ch.why === 'gus' ? 16 : 11)) ch.far += dt; else ch.far = 0;
    if (ch.shelter > 3.5 || ch.far > 3 || outOfArea || ch.t > 45) { endChase(h, false); return; }
    if (hid && d < 1.4) { h.pose = 'reach'; h.speed = 0; if (Math.random() < dt * 0.5) UI().toast(`<b>${h.o.name}</b>`, G.UI.portraitsExtra[h.id], '"I can’t reach under there..."'); return; }
    h.pose = 'idle';
    ch.repath -= dt; if (ch.repath <= 0) { ch.repath = 0.7; h.path = G.World.navPath([h.pos.x, 0, h.pos.z], [pl.pos.x, 0, pl.pos.z]).slice(1); if (d < 5) h.path = [[pl.pos.x, 0, pl.pos.z]]; }
    followPath(h, dt, h.id === 'gus' ? 2.9 : h.id === 'ellie' ? 3 : 2.6);
    if (d < 1.35 && !hid) { ch.lunge = 0.45; A.play('jump'); }
  }
  async function caughtScene(h, why) {
    const g = game(), pl = g.player;
    await cutscene(async () => {
      C.carried = h; h.pose = 'lift'; A.play('squeak');
      shot([h.pos.x + 1.6, 1.4, h.pos.z + 1.6], [h.pos.x, 1.1, h.pos.z]);
      if (why === 'gus') {
        await talk([['gus', 'GOTCHA! Heh. Now let’s find you a nice box while I call somebody...', 'happy']]);
        h.pose = 'carry'; await wait(0.6); A.play('squeak'); pl.act('shake', 1);
        await talk([['gus', 'Hey! Hey, quit wigglin’-- WHOA!', 'surprised']]);
        C.carried = null; h.pose = 'fall'; A.play('thud'); pl.teleport(h.pos.x + 1, 0, h.pos.z + 1, 0.5); pl.dance(1.2);
        await wait(1.2);
        await talk([['milo', 'Wriggled free! Ferrets are basically made of noodles. Now, hide or run!', 'happy']]);
        h.pos.set(189, 0, -1); h.pose = 'idle'; C.gusSearch = 3;
        return;
      }
      await talk([[h.id, why === 'bath' ? 'Gotcha! Into the bath with you, mister stinky!' : 'Ha! Caught you! Sock please.', 'happy']]);
      h.pose = 'carry'; await wait(0.8); UI().fade(true); await wait(0.9);
      C.carried = null; pl.teleport(5.2, 0, 2.2, 3.1); h.pose = 'idle'; h.pos.set(5.8, 0, 2.8);
      for (let i = 0; i < 40; i++) g.particles.emit({ x: 5.2 + (Math.random() - 0.5) * 0.6, y: 0.2 + Math.random() * 0.4, z: 2.2 + (Math.random() - 0.5) * 0.6, vx: 0, vy: 0.3, vz: 0, life: 3, size: 0.06, col: 0xe8f4ff, glow: true, wander: 0.3 });
      UI().fade(false); pl.act('shake', 1.4); A.play('splash');
      await talk([['milo', why === 'bath' ? 'Squeaky clean. Smells like lavender. Deeply, deeply offended.' : 'She took the sock back. And then she tickled me. I lost that round.', 'sad']]);
    });
  }

  /* ================================================================ THE FAILED ROAD TRIP */
  G.STEPS.r_escape = { text: 'Get away from Gus, then dig under the back fence', target: () => (C.gus && C.gus.chase ? [163, 0, 16.5] : [180, 0, 24.2]) };
  G.STEPS.r_culvert = { text: 'Find a way across the highway', target: [154.2, 0, 30] };
  G.STEPS.r_crow = { text: 'Ask the crow on the scarecrow for directions', target: [133.2, 0, 28.4] };
  G.STEPS.r_corn = { text: 'Cross the cornfield towards the water tower (use your nose!)', target: () => { const p = game().player.pos; const gps = EXT.cornGaps || []; const nxt = gps.slice().reverse().find(([x]) => x < p.x - 0.3); return nxt ? [nxt[0] - 0.8, 0, nxt[1]] : [100, 0, 20]; } };
  G.STEPS.r_hedge = { text: 'Find a way back into Maple Street', target: [91.2, 0, 20] };
  G.STEPS.r_home = { text: 'Run home!', target: [5, 0, 11] };
  G.COLLECT.push({ id: 's_keychain', cat: 'secrets', model: 'keychain', name: 'Road Trip Keychain', desc: '"I survived the Failed Road Trip." Ellie bought it at the next gas station. The irony.', pos: null });
  G.INTERACT.push(
    { id: 'r_dig', pos: [180, 0, 24.3], r: 0.8, label: 'Dig under the fence', anim: 'dig', when: () => S().chapter === 7 && G.World.col.tripDig.on, act: () => {
      if (C.gus.chase && Math.hypot(C.gus.pos.x - 180, C.gus.pos.z - 24) < 4.5) { UI().toast('<b>Too close!</b>', G.UI.portraitsExtra.gus, 'Gus is right behind you. Lose him first.'); return; }
      const g = game(); g.player.act('dig', 1.6, { lockMove: true }); A.play('dig'); setTimeout(() => A.play('dig'), 600); const iv = setInterval(() => g.dirtBurst(), 280);
      setTimeout(() => { clearInterval(iv); G.World.col.tripDig.on = false; G.World.obj.tripMound.visible = false; S().flags.tripDug = true; A.play('secret'); UI().toast('<b>Under the fence!</b>', null, 'Squeeze through to the ditch.'); }, 1600);
    } },
    { id: 'r_culvertIn', pos: [154.6, 0, 30], r: 0.8, label: 'Crawl into the culvert', anim: 'sniff', when: () => S().chapter === 7, act: () => game().travel([153.6, UG, 30], -Math.PI / 2, () => { if (!has('culvertSeen')) { game().flag('culvertSeen'); game().say([['milo', 'A drainpipe right under the highway. Cars are thundering over my head. Just... keep... going.', 'surprised']]); } }) },
    { id: 'r_culvertOut', pos: [138.4, UG, 30], r: 0.7, label: 'Crawl out on the other side', act: () => game().travel([137.2, 0, 30], -Math.PI / 2, () => { if (S().step === 'r_culvert') setStep('r_crow'); }) },
    { id: 'r_culvertBack', pos: [153.7, UG, 30], r: 0.7, label: 'Back to the gas station side', act: () => game().travel([155, 0, 30], Math.PI / 2) },
    { id: 'r_culvertW', pos: [137.4, 0, 30], r: 0.7, label: 'Crawl back into the culvert', when: () => S().chapter === 7, act: () => game().travel([138.6, UG, 30], Math.PI / 2) },
    { id: 'r_hedge', pos: [91.5, 0, 20], r: 0.9, label: 'Squeeze through the hedge', anim: 'sniff', when: () => S().chapter === 7, act: () => game().travel([88.4, 0, 20], -Math.PI / 2, () => { if (['r_hedge', 'r_corn'].includes(S().step)) { setStep('r_home'); game().say([['milo', 'MAPLE STREET! I know this street! Home is just down there. Run, Milo, RUN!', 'happy']]); } }) },
    { id: 'r_hedgeBack', pos: [89.2, 0, 20], r: 0.7, label: 'Squeeze back to the farmland', when: () => S().chapter === 7, act: () => game().travel([92, 0, 20], Math.PI / 2) },
  );
  function setStep(st) { game().setStep(st); }
  async function talkCrow() {
    const q = S().step;
    if (q === 'r_crow') return game().say([
      ['corvin', 'CAW! A weasel! In MY field! State your business, noodle.', 'surprised'],
      ['milo', 'I’m a ferret. My family left me at the gas station by accident. I live on Maple Street. Which way is home?', 'sad'],
      ['corvin', 'Maple Street! Where the squirrel with the enormous tail throws acorns at me! Hmph.', 'smug'],
      ['corvin', 'West. Through the corn, toward the big silver tower. The corn is a maze, but the gaps smell of fresh earth. Use that twitchy nose of yours.', 'think'],
      ['corvin', 'Past the tower there’s a hedge with a hole in it. Maple Street is right behind. Caw! Good luck, noodle.', 'happy'],
    ], () => { setStep('r_corn'); A.play('flutter'); C.crowFly = 5; });
    return game().say([['corvin', 'West, noodle! Through the corn! Toward the tower! CAW!', 'smug']]);
  }

  G.Trip = { start: (fromTitle) => startTrip(fromTitle) };
  function startTrip(fromTitle) {
    const g = game();
    if (fromTitle) { A.init(); g.S = Object.assign(JSON.parse(JSON.stringify(g.S)), { chapter: 7, step: 'r_intro', flags: { fenceDug: true, hedgeOpen: true, tripFromTitle: true, bestFriendsGuest: true }, time: 9, weather: 'clear', quests: { mochi: 'done' } }); }
    g.S.flags.tripStarted = true;
    UI().fade(true, async () => {
      const s = g.S; s.prevChapter = s.chapter === 7 ? s.prevChapter : s.chapter; s.chapter = 7; s.step = 'r_intro'; s.time = 9; s.weather = 'clear';
      g.applyWorldState(); g.placeNPCs(); UI().title(false); g.state = 'play'; A.setMood('trail');
      UI().fade(false);
      await tripIntro();
    });
  }
  const hideMilo = (v) => { game().player.f.root.visible = !v; };
  async function tripIntro() {
    const g = game(), pl = g.player, car = C.car, E = C.ellie, Mm = C.mum;
    await cutscene(async () => {
      // --- morning, the front yard: packing the car
      car.visible = true; car.position.set(11, 0, 9.2); car.rotation.y = Math.PI; car.userData.speed = 0; C.driver.root.visible = false; C.passenger.root.visible = false; car.userData.trunk.rotation.x = -1.3;
      [E, Mm].forEach((h) => { h.root.visible = true; h.home = false; }); E.pos.set(5, 0, 7.4); E.yaw = 0; Mm.pos.set(10.2, 0, 6.9); Mm.yaw = Math.PI; Mm.pose = 'carry';
      pl.teleport(4.3, 0, 7.8, 0.4); hideMilo(false); C.mochiOut = true; G.Mochi && (G.Mochi.f.root.visible = true, G.Mochi.place(3.8, 0, 8.3), G.Mochi.state = 'shy');
      UI().chapterCard(7);
      cut([7.5, 1.3, 13.8], [8, 0.8, 8], 3.2);
      await wait(3.2);
      await talk([['ellie', 'Road trip! Road trip! We’re going to see Grandpa Arlo! Four whole hours in the car!', 'happy']]);
      E.pose = 'cheer'; await wait(1.2); E.pose = 'idle';
      go(Mm, [[10.6, 7.6]], 1.2); await wait(1); Mm.pose = 'lift'; A.play('thud'); await wait(0.8); Mm.pose = 'idle';
      await talk([['mum', 'Suitcases: in. Snacks: in. Map: probably in. Ellie, get the ferrets into the carrier, please!', 'happy'], ['ellie', 'Come on, Milo! Mochi! Adventure time!', 'happy']]);
      go(E, [[6.6, 8.4], [9.4, 8.6]], 1.4); go('milo', [[6.2, 8.8], [9.2, 9.1]], 1.9);
      await shot([7, 0.6, 11], [8, 0.4, 8.6], 2.6);
      E.pose = 'carry'; hideMilo(true); C.mochiOut = false; if (G.Mochi) G.Mochi.f.root.visible = false; A.play('door');
      car.userData.trunk.rotation.x = 0; A.play('thud');
      await talk([['ellie', 'Everybody in! Carrier on the back seat. Seatbelts! Let’s GO!', 'happy']]);
      [E, Mm].forEach((h) => (h.root.visible = false)); C.driver.root.visible = true; C.passenger.root.visible = true;
      A.play('door'); await wait(0.5);
      // pull out of the driveway and drive off down Maple Street
      cut([13.5, 1.2, 18.5], [11, 0.8, 11], 0.1);
      await go(car, [[11, 14], [11.8, 19], [16, 20.8]], 3); await go(car, [[40, 20.8], [86, 20.8]], 9);
      UI().fade(true); await wait(0.8);
      // --- on the highway
      car.position.set(146 - 3, 0, -150); car.rotation.y = 0; UI().fade(false);
      track(car, [4.2, 1.8, -5], [0, 0.9, 3]);
      const drive = go(car, [[143, -40]], 14);
      await wait(1);
      await talk([['ellie', 'Are we there yet?', 'happy'], ['mum', 'No.', 'neutral'], ['ellie', '...Are we there yet?', 'happy'], ['mum', 'Ellie.', 'think'], ['ellie', 'Milo wants to know.', 'smug']]);
      await drive; track(null);
      cut([160, 3, -30], [158, 0.5, -24], 0.1);
      await talk([['mum', 'Gas station. Everybody out for five minutes. Stretch your legs!', 'happy']]);
      car.position.set(157, 0, -34); car.rotation.y = 0; W_gate(true);
      await go(car, [[158.5, -24], [165, -12], [171.5, -4.8]], 5);
      car.userData.speed = 0; openDoor(car, 0, true); openDoor(car, 1, true);
      C.driver.root.visible = false; C.passenger.root.visible = false; [E, Mm].forEach((h) => { h.root.visible = true; h.pose = 'idle'; });
      Mm.pos.set(172.5, 0, -4.2); Mm.yaw = Math.PI / 2; E.pos.set(170.6, 0, -4.4); E.yaw = -Math.PI / 2;
      // --- stretching legs on the grass
      go(Mm, [[174.3, -4.6]], 1.2); Mm.pose = 'cook';
      go(E, [[166, -12], [165, -20.6]], 1.6);
      await shot([162, 1.4, -15], [166, 0.6, -21], 2.2);
      E.pose = 'reach'; await wait(0.8); hideMilo(false); pl.teleport(165.4, 0, -21.4, 0); C.mochiOut = true; if (G.Mochi) { G.Mochi.place(164.6, 0, -21.3); G.Mochi.state = 'shy'; }
      A.play('dook'); E.pose = 'idle';
      await talk([['ellie', 'There you go! Sniff sniff! Five minutes, okay? Don’t go anywhere.', 'happy']]);
      go(E, [[168, -14], [171.2, -6]], 1.5);
      // Milo gets distracted by a crinkly chip bag
      A.play('rustle'); await wait(0.6);
      cut([184, 0.8, -17], [187.6, 0.3, -14], 0.1);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.2), mat(0xf2c14e, 0.4, { metal: 0.3 })); bag.position.set(187.8, 0.03, -14.4); bag.rotation.y = 0.5; g.scene.add(bag); C.bag = bag;
      await talk([['milo', 'Crinkle crinkle. Is that... a CHIP BAG? Nobody else is going to investigate that. It’s my duty.', 'surprised']]);
      track('milo', [2.2, 1.1, 2.2], [0, 0.2, 0]);
      await go('milo', [[172, -19], [182, -17], [187.6, -14.5]], 3.4);
      track(null); pl.act('dig', 1.2); A.play('rustle'); hideMilo(true); bag.scale.set(1.3, 2.2, 1.3);
      await wait(1);
      // --- the family leaves without him
      cut([168, 1.5, -10], [172, 1, -4.8], 0.1);
      await talk([['mum', 'Okay! Tank’s full! Everybody back in!', 'happy'], ['ellie', 'Mochi’s in... and Milo is... this fuzzy lump? Yep! That’s Milo!', 'happy'], ['milo', '(It was her scarf.)', 'sad']]);
      E.pose = 'carry'; await wait(0.6); [E, Mm].forEach((h) => (h.root.visible = false)); C.mochiOut = false; if (G.Mochi) G.Mochi.f.root.visible = false;
      C.driver.root.visible = true; C.passenger.root.visible = true; openDoor(car, 0, false); openDoor(car, 1, false);
      await wait(0.6); A.play('thud', 0.4);
      const leave = go(car, [[166, -14], [158.5, -26], [157.5, -40]], 6);
      await wait(1.2);
      hideMilo(false); bag.scale.set(1, 1, 1); pl.teleport(187, 0, -14.8, -2.4); A.play('squeak');
      cut([185, 0.6, -13], [187, 0.3, -14.8], 0.1);
      await talk([['milo', '...Wait. Was that the car?', 'surprised']]);
      track('milo', [1.6, 0.9, 3.4], [0, 0.3, -2]);
      await go('milo', [[175, -18], [162, -22], [158.8, -24.2]], 4.4);
      track(null);
      await leave; car.visible = false;
      cut([159, 0.5, -21.5], [158.6, 0.2, -24.2], 0.1);
      pl.act('lookup', 2.5); A.setMood('mystery');
      for (let i = 0; i < 12; i++) g.particles.emit({ x: 157.5 + Math.random(), y: 0.3, z: -38 + Math.random() * 2, vx: 0, vy: 0.4, vz: 0, life: 2, size: 0.4, col: 0x9a9a9a, alpha: 0.4 });
      await wait(1.5);
      await talk([['milo', 'They... left without me.', 'sad'], ['milo', 'Okay. Okay okay okay. Don’t panic. Home is... west. Past the highway. I’m a ferret. Ferrets are EXCELLENT at finding things.', 'think'], ['milo', 'Even if the thing is home, and home is forty miles away.', 'sad']]);
      // --- enter Gus
      const Gs = C.gus; Gs.root.visible = true; Gs.pos.set(189.3, 0, -1); Gs.yaw = -Math.PI / 2; Gs.pose = 'idle';
      cut([185, 1.7, -3.5], [189.3, 1.2, -1], 0.1); A.play('door');
      await go(Gs, [[186.5, -3]], 1.4);
      Gs.pose = 'point';
      await talk([['gus', 'Well, well! A weasel! In my gas station! Hey there, little fella. You lost?', 'surprised'], ['gus', 'Better close the gate before you run out on that highway. Then come to ol’ Gus...', 'happy']]);
      W_gate(false);
      await talk([['milo', 'The gate’s shut! There’s a soft patch of dirt by the back fence... but first I need to lose him.', 'think']]);
      Gs.pose = 'idle';
    });
    S().step = 'r_escape'; S().weather = 'cloudy'; A.setMood('trail'); UI().updateObjective(true); g.autosave();
    startChase(C.gus, 'gus');
  }
  function W_gate(open) { const gate = G.World.obj.tripGate, col = G.World.col.tripGate; const from = gate.rotation.y, to = open ? -1.5 : 0; game().tween(1, (k) => (gate.rotation.y = U.lerp(from, to, U.smooth(k)))); col.on = !open; game().hashC(col); if (!open) A.play('metal'); }

  async function tripReunion() {
    const g = game(), pl = g.player, car = C.car, E = C.ellie, Mm = C.mum;
    C.reunion = true;
    await cutscene(async () => {
      A.setMood('ending');
      pl.teleport(5.4, 0, 12.2, Math.PI / 2 + 0.6);
      car.visible = true; car.position.set(60, 0, 20.8); car.rotation.y = -Math.PI / 2; C.driver.root.visible = true; C.passenger.root.visible = true;
      cut([9, 0.7, 16.5], [5.4, 0.3, 12.2], 0.1);
      await talk([['milo', 'Home. I made it. I actually made it! ...But nobody’s here. They’re still on the road trip.', 'sad']]);
      pl.act('sleep', 3);
      A.play('door'); await wait(0.8);
      track(car, [-6, 2.2, 4], [0, 0.6, 0]);
      await go(car, [[16, 20.8], [11.8, 19], [11, 14.5]], 7);
      track(null); car.userData.speed = 0;
      cut([7.8, 1.2, 16.8], [10, 0.8, 12], 0.1);
      openDoor(car, 1, true); openDoor(car, 0, true); C.driver.root.visible = false; C.passenger.root.visible = false;
      E.root.visible = true; Mm.root.visible = true; E.pos.set(10.1, 0, 14.4); Mm.pos.set(11.9, 0, 14.6); E.home = Mm.home = false;
      await talk([['ellie', 'MILO?!', 'surprised']]);
      pl.act(null, 0); pl.action = null; E.pose = 'idle';
      go('milo', [[6.8, 12.8]], 3.6);
      await go(E, [[7.4, 13.2]], 3.4);
      E.pose = 'reach'; await wait(0.7); C.carried = E; E.pose = 'hug'; A.play('dook'); setTimeout(() => A.play('dook'), 500);
      cut([6, 1.4, 14.8], [7.4, 1, 13.2], 0.1);
      await talk([
        ['ellie', 'We noticed at the NEXT gas station! Mum turned around on the highway and we drove all the way back and you were GONE and I cried and...', 'cry'],
        ['ellie', '...and how are you even HOME?! It’s forty miles!', 'surprised'],
        ['milo', 'Culverts. Corn. A very opinionated crow named Corvin. Long story.', 'happy'],
      ]);
      go(Mm, [[8.3, 13.6]], 1.4); await wait(1.1); Mm.pose = 'laugh';
      await talk([['mum', 'That ferret has better navigation than our car. We are putting a BELL on him.', 'happy'], ['ellie', 'Like Juniper’s bell! Grandpa will love that!', 'happy']]);
      C.mochiOut = true; if (G.Mochi) { G.Mochi.place(10.6, 0, 13.6); G.Mochi.state = 'shy'; G.Mochi.doAct('dance', 3); } A.play('dook');
      if ((S().quests || {}).mochi === 'done') await talk([['mochi', 'MILO!! I told them! I told them the lump was a scarf! Nobody listens to the small ferret!', 'happy']]);
      cut([7.6, 2.2, 18], [8, 0.8, 13], 0.1); Mm.pose = 'wave2'; E.pose = 'hug';
      await talk([['mum', 'Right. New plan. Grandpa Arlo is coming HERE instead. Everybody inside.', 'happy']]);
      await wait(1.2);
    });
    C.carried = null; C.reunion = false; car.visible = false;
    const s = S(); s.flags.tripDone = true; game().giveCollectible('s_keychain');
    [E, Mm].forEach((h) => { h.root.visible = false; h.home = false; });
    const fromTitle = s.flags.tripFromTitle;
    s.chapter = fromTitle ? 6 : s.prevChapter || 6; s.step = s.chapter === 6 ? 'end' : s.step; g.applyWorldState(); g.placeNPCs(); A.setMood(g.moodFor());
    const el = document.getElementById('ending'); el.querySelector('.over').textContent = 'Bonus chapter complete'; el.querySelector('h2').textContent = 'The Failed Road Trip';
    el.querySelector('.story').textContent = 'Milo escaped Gus, crawled under a highway, got lost in a cornfield, took directions from a crow and ran home before the car did. Grandpa Arlo came to visit instead, and brought a tiny brass bell. Milo pretends to hate it.';
    UI().ending(game().stats());
    if (fromTitle) document.getElementById('endRoam').hidden = true;
  }

  /* ================================================================ HOOKS */
  const oInit = EXT.init, oUpd = EXT.update, oApply = EXT.applyState;
  EXT.init = function (g) {
    oInit(g); C.init(g);
    const btn = document.getElementById('btnTrip'); if (btn) btn.onclick = () => { A.init(); A.play('ui'); startTrip(true); };
    document.getElementById('skipHint').onclick = skipCutscene;
    const oMake = G.makeItem; G.makeItem = (id) => { if (id === 'keychain') { const gr = new THREE.Group(); const r = mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 16), Mt.get('chrome'), 0, 0.02, 0); gr.add(r); const tag = mesh(new THREE.BoxGeometry(0.05, 0.07, 0.008), mat(0x3f6fa0, 0.4), 0, -0.035, 0); gr.add(tag); gr.position.y = 0.05; const w = new THREE.Group(); w.add(gr); return w; } return oMake(id); };
    // Ellie mentions the road trip in the epilogue
  };
  EXT.applyState = function () {
    oApply(); if (!C.car) return;
    const s = S(), c = s.chapter;
    const inTrip = c === 7;
    C.car.visible = false; C.crow.visible = inTrip && s.step !== 'r_intro';
    C.gus.root.visible = inTrip && s.step !== 'r_intro'; if (inTrip) { C.gus.pos.set(189, 0, -1); C.gus.chase = null; C.gus.pose = 'idle'; }
    if (C.chaser && !inTrip) { C.chaser.chase = null; C.chaser = null; }
    W_gateInstant(inTrip && s.step !== 'r_intro' ? false : true);
    const dug = !!s.flags.tripDug; G.World.col.tripDig.on = !dug; G.World.obj.tripMound.visible = !dug;
    if (inTrip && s.step === 'r_intro' && game().state === 'play' && !SEQ.running) setTimeout(() => tripIntro(), 300);
    if (c === 7 && G.Mochi && G.Mochi.f) G.Mochi.f.root.visible = false;
  };
  function W_gateInstant(open) { const gate = G.World.obj.tripGate, col = G.World.col.tripGate; gate.rotation.y = open ? -1.5 : 0; col.on = !open; game().hashC(col); }
  EXT.update = function (dt, st) {
    oUpd(dt, st); if (!C.car) return;
    const g = game(), s = S(), pl = g.player;
    if (SEQ.running && (I.pressed('pause') || I.pressed('back'))) skipCutscene();
    seqUpdate(dt);
    if (st === 'title') { ['ellie', 'mum', 'gus'].forEach((id) => (C[id].root.visible = false)); C.car.visible = false; return; }
    // bed Ellie: asleep in chapters 1 and 5 (and at night), sitting up for the finale
    const be = C.bedEllie, ellieGrp = G.World.obj.ellie;
    if (ellieGrp.visible) {
      const sitting = s.chapter === 6 && g.state === 'cutscene' && !SEQ.running;
      if (sitting) { be.root.position.set(0, -0.12, 0.25); be.root.rotation.set(0, 0, 0); be.pose = 'sitbed'; } else { be.root.position.set(0, 0.02, 0.62); be.root.rotation.set(-Math.PI / 2, 0, 0); be.pose = 'lie'; }
      G.World.obj.ellieTorso.visible = false;
      if (G.isPost(s.chapter) && !sitting && (G.env.night || 0) < 0.55) ellieGrp.visible = false;
      be.update(dt, {});
    }
    if (G.isPost(s.chapter) && (G.env.night || 0) >= 0.55 && g.state === 'play') ellieGrp.visible = true;
    // the family at home
    if (st === 'play' || st === 'menu') { homeTick('mum', dt); homeTick('ellie', dt); }
    for (const id of ['ellie', 'mum']) { const h = C[id]; if (h.chase) chaseTick(h, dt); }
    if (C.gus.chase) chaseTick(C.gus, dt);
    else if (s.chapter === 7 && C.gus.root.visible && !SEQ.running) { if (C.gus.path.length) followPath(C.gus, dt, 1.4); else { C.gus.pose = C.gusSearch > 0 ? 'think' : 'idle'; C.gus.yaw = U.dampAngle(C.gus.yaw, -Math.PI / 2, 2, dt); } C.gusSearch = (C.gusSearch || 0) - dt; const d = Math.hypot(pl.pos.x - C.gus.pos.x, pl.pos.z - C.gus.pos.z); if (st === 'play' && s.step === 'r_escape' && C.gusSearch <= 0 && d < 7 && !sheltered() && pl.pos.z < 24.8) startChase(C.gus, 'gus'); }
    for (const h of [C.ellie, C.mum, C.gus, C.driver, C.passenger]) if (h.root.visible || h === C.driver) h.update(dt, { lookY: h.lookY, talking: UI().dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === h.id });
    // carried Milo sits in someone's arms
    if (C.carried) { const hp = C.carried.handPos(V3()); pl.f.root.position.set(hp.x, hp.y - 0.05, hp.z); pl.f.root.rotation.y = C.carried.yaw + Math.PI / 2; pl.pos.copy(pl.f.root.position); pl.vy = 0; }
    // cars
    carTick(C.car, dt);
    const trafficOn = s.chapter === 7 || (pl.pos.x > 90 && pl.pos.y > -5); C.traffic.forEach((car) => { car.visible = trafficOn; if (!trafficOn) return; car.position.z += car.userData.lane * -car.userData.speed * dt * -1; if (car.position.z > 160) car.position.z = -160; if (car.position.z < -160) car.position.z = 160; carTick(car, dt); });
    if (trafficOn && Math.hypot(pl.pos.x - 146, 0) < 30 && Math.random() < dt * 0.8) A.play('car');
    // crow
    C.crow.visible = s.chapter === 7 && s.step !== 'r_intro';
    if (C.crow.visible) { const h = C.crow.userData.head; h.rotation.y = Math.sin(g.t * 1.5) * 0.6; h.rotation.z = Math.sin(g.t * 0.7) * 0.3; if (C.crowFly > 0) { C.crowFly -= dt; C.crow.position.x -= dt * 4; C.crow.position.y += dt * 1.5; if (C.crowFly <= 0) C.crow.position.set(97.5, 16.6, -30); } if (Math.random() < dt * 0.1 && Math.hypot(pl.pos.x - C.crow.position.x, pl.pos.z - C.crow.position.z) < 30) A.play('caw'); }
    // Mochi rides along in the carrier during the trip
    if (s.chapter === 7 && G.Mochi && G.Mochi.f && !C.mochiOut) G.Mochi.f.root.visible = false;
    // trip progress
    if (st === 'play' && s.chapter === 7 && !SEQ.running) {
      if (s.step === 'r_escape' && pl.pos.z > 25.6 && pl.pos.y > -5) { if (C.gus.chase) endChase(C.gus, false); setStep('r_culvert'); g.say([['milo', 'Out! Now: the highway. I am NOT running across that. There must be another way.', 'think']]); s.weather = 'clear'; }
      if (s.step === 'r_corn' && pl.pos.x < 101.5) { setStep('r_hedge'); g.say([['milo', 'Out of the corn! There’s the water tower... and that hedge looks awfully familiar.', 'happy']]); }
      if (s.step === 'r_home' && Math.hypot(pl.pos.x - 5, pl.pos.z - 11) < 4) tripReunion();
    }
    // Ellie mentions the trip in the epilogue
    if (s.chapter === 6 && st === 'play' && !has('tripHint') && !has('tripDone') && C.ellie.root.visible && s.playTime > 60) { g.flag('tripHint'); UI().toast('<b>Ellie is packing a suitcase...</b>', G.UI.portraitsExtra.ellie, 'Talk to her to go on the road trip (bonus chapter).'); }
  };
  // journal: bonus chapter line
  const oPanel = EXT.panels.quests;
  EXT.panels.quests = function () { oPanel(); const s = S(); if (!s.flags.tripStarted && !s.flags.tripDone) return; const box = document.getElementById('questBody'); const d = document.createElement('div'); d.innerHTML = `<h3>Bonus chapter</h3><div class="qlist"><div class="q ${s.flags.tripDone ? 'done' : 'active'}"><i></i><div><b>The Failed Road Trip</b><small>${s.flags.tripDone ? 'Made it home before the car did. Gus is still telling the story.' : (G.STEPS[s.step] || {}).text || ''}</small></div></div></div>`; box.appendChild(d); };
  // new sounds
  const basePlay = A.play.bind(A);
  A.play = function (name, v = 1) {
    if (!A.ready) return;
    if (name === 'car') { A.noise({ f: 180, f2: 90, q: 0.6, dur: 1.4, vol: 0.12 * v, brown: true, ft: 'lowpass', a: 0.5 }); return; }
    if (name === 'caw') { for (let i = 0; i < 2; i++) A.tone({ f: 620, f2: 420, type: 'sawtooth', dur: 0.22, vol: 0.05 * v, lp: 1600, delay: i * 0.3 }); return; }
    return basePlay(name, v);
  };
  document.addEventListener('keydown', (e) => { if (SEQ.running && e.code === 'Escape') skipCutscene(); });
})();
