/* =====================================================================
   cast.js - the sequel's new characters.
   G.Beast builds a small animal from simple shapes (hedgehog, mouse,
   rabbit, badger, otter, mole, squirrel, songbird, magpie, gull, toad,
   marmot, marten, vole, crab), with outfits (hats, scarves, aprons,
   glasses, bags) and a shared animation (walk, bob, look, talk, emotes).
   G.NPC places them in the world, runs their behaviour (idle, wander,
   follow Milo) and handles conversations, portraits and names.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, UG = W.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const SPH = new THREE.SphereGeometry(1, 16, 12), CONE = new THREE.ConeGeometry(1, 1, 8);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;

  function ball(mat, r, sx = 1, sy = 1, sz = 1) { const m = new THREE.Mesh(SPH, mat); m.scale.set(r * sx, r * sy, r * sz); m.castShadow = true; return m; }
  function eyes(g, x, y, z, r, col = 0x0b0705) { const out = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * x, y, z); const b = new THREE.Mesh(SPH, M.std('beye' + col, { color: col, rough: 0.1 })); b.scale.setScalar(r); e.add(b); const h = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xffffff })); h.scale.setScalar(r * 0.32); h.position.set(r * 0.3, r * 0.35, r * 0.72); e.add(h); g.add(e); out.push(e); } return out; }
  const fur = (c, k) => M.fur(c, 'b' + k + c);
  const col = (c, r = 0.7) => M.color(c, r);
  function leg(parent, mat, x, y, z, len, r, front) { const L = new THREE.Group(); L.position.set(x, y, z); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 6), mat); m.position.y = -len / 2; m.castShadow = true; L.add(m); const p = ball(mat, r * 1.2, 1, 0.6, 1.4); p.position.set(0, -len, r * 0.5); L.add(p); L.userData.front = front; L.userData.side = Math.sign(x); parent.add(L); return L; }
  function tailChain(parent, mat, n, r0, r1, seg, x, y, z, rx) { const t = []; let par = parent; for (let i = 0; i < n; i++) { const g = new THREE.Group(); const r = U.lerp(r0, r1, i / Math.max(1, n - 1)); const m = ball(mat, r, 1, 1, 1.4); m.position.z = -seg / 2; g.add(m); if (i === 0) { g.position.set(x, y, z); g.rotation.x = rx || 0; } else g.position.z = -seg; par.add(g); t.push(g); par = g; } return t; }

  /* ---------------------------------------------------------------- builders: return { g, body, head, eyes, legs, tail, wings, ears, h } */
  const B = {
    hedgehog(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const c = o.color || 0x6a4a33, face = fur(o.face || 0xd9c0a0, 'hf');
      const sp = new THREE.Group(); body.add(sp); const spike = M.std('spike' + c, { color: c, rough: 0.8 }), tip = M.std('spiket', { color: o.tip || 0xe8dcc4, rough: 0.8 });
      const core = ball(fur(c, 'hb'), 0.15, 1, 0.85, 1.2); core.position.y = 0.13; sp.add(core);
      const rng = U.rng(o.seed || 3), cg = new THREE.ConeGeometry(0.018, 0.09, 4); cg.translate(0, 0.045, 0);
      for (let i = 0; i < 70; i++) { const a = rng() * 6.28, b = rng() * 1.3; const n = V3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b) * 1.2 - 0.25).normalize(); if (n.z > 0.75) continue; const m = new THREE.Mesh(cg, i % 5 ? spike : tip); m.position.set(n.x * 0.14, 0.13 + n.y * 0.12, n.z * 0.17); m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(n.x, n.y * 1.2, n.z - 0.4).normalize()); m.castShadow = true; sp.add(m); }
      const head = new THREE.Group(); head.position.set(0, 0.11, 0.16); body.add(head); head.add(ball(face, 0.075, 1, 0.9, 1.1)); const sn = ball(face, 0.04, 1, 0.8, 1.4); sn.position.set(0, -0.02, 0.07); head.add(sn); const nz = ball(col(0x1a1210, 0.3), 0.014); nz.position.set(0, -0.015, 0.125); head.add(nz);
      for (const s of [-1, 1]) { const e = ball(face, 0.022, 1, 1, 0.5); e.position.set(s * 0.05, 0.055, 0.01); head.add(e); }
      const ey = eyes(head, 0.038, 0.02, 0.06, 0.012);
      const legs = [[-0.06, 0.1], [0.06, 0.1], [-0.07, -0.09], [0.07, -0.09]].map(([x, z], i) => leg(body, fur(0x4a3325, 'hl'), x, 0.06, z, 0.05, 0.012, i < 2));
      return { g, body, head, eyes: ey, legs, tail: [], h: 0.28, shy: o.shy, spikes: sp };
    },
    mouse(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0x9a8a78, 'mo'), pink = col(0xe8a0a0);
      const b = ball(f, 0.06, 1, 0.9, 1.3); b.position.y = 0.06; body.add(b); const bel = ball(fur(o.belly || 0xeee0d0, 'mb'), 0.045, 1, 0.8, 1.1); bel.position.set(0, 0.05, 0.02); body.add(bel);
      const head = new THREE.Group(); head.position.set(0, 0.085, 0.08); body.add(head); head.add(ball(f, 0.042, 1, 0.9, 1.25)); const nz = ball(pink, 0.009); nz.position.set(0, -0.005, 0.052); head.add(nz);
      const ears = []; for (const s of [-1, 1]) { const e = ball(pink, 0.026, 1, 1, 0.3); e.position.set(s * 0.035, 0.04, -0.005); head.add(e); ears.push(e); }
      const ey = eyes(head, 0.02, 0.012, 0.037, 0.008);
      const legs = [[-0.03, 0.05], [0.03, 0.05], [-0.035, -0.04], [0.035, -0.04]].map(([x, z], i) => leg(body, pink, x, 0.03, z, 0.028, 0.006, i < 2));
      const tail = tailChain(body, pink, 6, 0.006, 0.003, 0.028, 0, 0.05, -0.07, 0.4);
      return { g, body, head, eyes: ey, legs, tail, ears, h: 0.16 };
    },
    vole(o) { const r = B.mouse(Object.assign({ color: 0x7a5a3a, belly: 0xc9b08a }, o)); r.ears.forEach((e) => e.scale.multiplyScalar(0.6)); r.tail.forEach((t, i) => (t.visible = i < 3)); r.body.scale.set(1.15, 1.05, 1); return r; },
    rabbit(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0xb3a08a, 'ra'), lt = fur(o.belly || 0xeee4d6, 'rl'), pink = col(0xe5a3a0);
      const t = ball(f, 0.11, 0.95, 0.9, 1.2); t.position.set(0, 0.11, -0.02); body.add(t); const ch = ball(lt, 0.065, 1, 1, 0.8); ch.position.set(0, 0.12, 0.07); body.add(ch);
      const head = new THREE.Group(); head.position.set(0, 0.22, 0.09); body.add(head); head.add(ball(f, 0.065, 1, 0.95, 1.1)); const mz = ball(lt, 0.035, 1.2, 0.8, 0.9); mz.position.set(0, -0.02, 0.05); head.add(mz); const nz = ball(pink, 0.01); nz.position.set(0, -0.01, 0.08); head.add(nz);
      const ears = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * 0.03, 0.05, -0.01); const m = ball(f, 0.028, 0.5, 1.9, 0.3); m.position.y = 0.05; e.add(m); const i2 = ball(pink, 0.02, 0.4, 1.6, 0.2); i2.position.set(0, 0.05, 0.006); e.add(i2); e.rotation.x = -0.25; e.rotation.z = -s * 0.12; head.add(e); ears.push(e); }
      const ey = eyes(head, 0.038, 0.012, 0.045, 0.012);
      const legs = [[-0.045, 0.07], [0.045, 0.07], [-0.07, -0.08], [0.07, -0.08]].map(([x, z], i) => leg(body, f, x, 0.06, z, 0.05, 0.016, i < 2));
      const tl = ball(lt, 0.03); tl.position.set(0, 0.1, -0.13); body.add(tl);
      return { g, body, head, eyes: ey, legs, tail: [], ears, h: 0.32, hop: true };
    },
    badger(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const grey = fur(o.color || 0x7a7a78, 'bg'), blk = fur(0x1f1c1a, 'bk'), wht = fur(0xf0ece4, 'bw');
      const t = ball(grey, 0.2, 1, 0.75, 1.35); t.position.y = 0.18; body.add(t);
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.3); body.add(head); head.add(ball(wht, 0.1, 0.95, 0.85, 1.25));
      for (const s of [-1, 1]) { const st = ball(blk, 0.06, 0.35, 0.7, 1.5); st.position.set(s * 0.05, 0.02, 0.02); head.add(st); const e = ball(blk, 0.025, 1, 1, 0.5); e.position.set(s * 0.07, 0.07, -0.04); head.add(e); }
      const nz = ball(blk, 0.02); nz.position.set(0, -0.02, 0.13); head.add(nz);
      const ey = eyes(head, 0.05, 0.015, 0.07, 0.013, 0x111111);
      const legs = [[-0.12, 0.18], [0.12, 0.18], [-0.13, -0.16], [0.13, -0.16]].map(([x, z], i) => leg(body, blk, x, 0.1, z, 0.1, 0.035, i < 2));
      const tail = tailChain(body, grey, 2, 0.04, 0.03, 0.06, 0, 0.18, -0.26, -0.2);
      return { g, body, head, eyes: ey, legs, tail, h: 0.45 };
    },
    otter(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0x5a3e28, 'ot'), cr = fur(o.belly || 0xd9c0a0, 'oc');
      const t = ball(f, 0.13, 0.9, 0.85, 1.9); t.position.set(0, 0.14, 0); body.add(t); const ch = ball(cr, 0.1, 0.85, 0.75, 1.2); ch.position.set(0, 0.13, 0.12); body.add(ch);
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.27); body.add(head); head.add(ball(f, 0.085, 1.05, 0.85, 1.05)); const mz = ball(cr, 0.05, 1.3, 0.8, 1); mz.position.set(0, -0.025, 0.06); head.add(mz); const nz = ball(col(0x1a1210, 0.3), 0.017, 1.3, 0.8, 1); nz.position.set(0, -0.01, 0.11); head.add(nz);
      for (const s of [-1, 1]) { const e = ball(f, 0.018, 1, 1, 0.5); e.position.set(s * 0.07, 0.045, -0.02); head.add(e); }
      const wv = []; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) wv.push(s * 0.03, -0.03, 0.09, s * 0.12, -0.03 - k * 0.012, 0.06); const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3)); head.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xf0e8d8, transparent: true, opacity: 0.6 })));
      const ey = eyes(head, 0.042, 0.025, 0.07, 0.012);
      const legs = [[-0.08, 0.12], [0.08, 0.12], [-0.09, -0.14], [0.09, -0.14]].map(([x, z], i) => leg(body, f, x, 0.07, z, 0.06, 0.022, i < 2));
      const tail = tailChain(body, f, 5, 0.06, 0.02, 0.07, 0, 0.12, -0.24, 0.1);
      return { g, body, head, eyes: ey, legs, tail, h: 0.4 };
    },
    mole(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0x2a2626, 'ml'), pink = col(0xe8a8a0);
      const t = ball(f, 0.1, 1, 0.8, 1.25); t.position.y = 0.08; body.add(t);
      const head = new THREE.Group(); head.position.set(0, 0.08, 0.12); body.add(head); head.add(ball(f, 0.055, 0.9, 0.8, 1.2)); const sn = ball(pink, 0.02, 1, 0.8, 1.6); sn.position.set(0, -0.005, 0.07); head.add(sn);
      const ey = eyes(head, 0.025, 0.018, 0.045, 0.005);
      const legs = []; for (const s of [-1, 1]) { const h2 = new THREE.Group(); h2.position.set(s * 0.09, 0.04, 0.08); const p = ball(pink, 0.035, 1, 0.3, 1); p.rotation.z = s * 0.6; h2.add(p); body.add(h2); h2.userData.front = true; h2.userData.side = s; legs.push(h2); }
      legs.push(leg(body, pink, -0.05, 0.03, -0.07, 0.025, 0.01, false), leg(body, pink, 0.05, 0.03, -0.07, 0.025, 0.01, false));
      return { g, body, head, eyes: ey, legs, tail: [], h: 0.16 };
    },
    squirrel(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0xb0582c, 'sq'), bl = fur(o.belly || 0xf0dcc0, 'sb');
      const t = ball(f, 0.07, 0.9, 1.1, 1); t.position.set(0, 0.1, 0); t.rotation.x = -0.6; body.add(t); const be = ball(bl, 0.055, 0.8, 1, 0.7); be.position.set(0, 0.1, 0.03); be.rotation.x = -0.6; body.add(be);
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.04); body.add(head); head.add(ball(f, 0.05, 1, 0.95, 1.05)); const ck = ball(bl, 0.034, 1.2, 0.8, 1); ck.position.set(0, -0.015, 0.03); head.add(ck);
      const ears = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.045, 8), f); e.position.set(s * 0.028, 0.055, -0.005); e.rotation.z = -s * 0.2; head.add(e); ears.push(e); }
      const ey = eyes(head, 0.026, 0.012, 0.04, 0.012);
      const legs = [[-0.03, 0.05], [0.03, 0.05], [-0.045, -0.02], [0.045, -0.02]].map(([x, z], i) => leg(body, f, x, 0.05, z, 0.04, 0.012, i < 2));
      const tail = tailChain(body, f, 7, 0.03, 0.06, 0.05, 0, 0.04, -0.07, -0.5); tail.forEach((tt, i) => (tt.rotation.x = i < 4 ? -0.5 : 0.35));
      return { g, body, head, eyes: ey, legs, tail, h: 0.3, hop: true };
    },
    bird(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const s = o.size || 1, c = o.color || 0x8a6a4a, f = fur(c, 'bd'), be = fur(o.belly || 0xe8dcc4, 'bb');
      const b = ball(f, 0.05 * s, 0.9, 0.85, 1.35); b.position.y = 0.07 * s; body.add(b); const bl = ball(be, 0.04 * s, 0.8, 0.75, 1); bl.position.set(0, 0.06 * s, 0.018 * s); body.add(bl);
      const head = new THREE.Group(); head.position.set(0, 0.115 * s, 0.045 * s); body.add(head); head.add(ball(o.headColor ? fur(o.headColor, 'bh') : f, 0.036 * s));
      const bk = new THREE.Mesh(new THREE.ConeGeometry(0.01 * s * (o.beakW || 1), 0.03 * s * (o.beak || 1), 6), col(o.beakColor || 0x3a2a1a, 0.4)); bk.rotation.x = Math.PI / 2; bk.position.set(0, -0.004 * s, 0.045 * s); head.add(bk);
      const ey = eyes(head, 0.02 * s, 0.01 * s, 0.026 * s, 0.006 * s);
      const wings = []; for (const sd of [-1, 1]) { const wp = new THREE.Group(); wp.position.set(sd * 0.042 * s, 0.085 * s, 0); const w = ball(o.wingColor ? fur(o.wingColor, 'bw') : f, 0.035 * s, 0.25, 0.7, 1.4); w.position.set(sd * 0.01 * s, -0.01 * s, -0.01 * s); wp.add(w); body.add(wp); wings.push(wp); }
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.008 * s, 0.07 * s * (o.tailLen || 1)), o.tailColor ? col(o.tailColor, 0.4) : f); tl.position.set(0, 0.075 * s, -0.08 * s * (o.tailLen || 1)); tl.rotation.x = -0.35 + (o.tailUp || 0); body.add(tl);
      const legs = [-1, 1].map((sd) => leg(body, col(o.legColor || 0x6a5a3a), sd * 0.015 * s, 0.03 * s, 0, 0.03 * s, 0.004 * s, false));
      return { g, body, head, eyes: ey, legs, tail: [], wings, h: 0.16 * s, bird: true };
    },
    toad(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const c = M.std('toad' + (o.color || 0x7a7a3a), { color: o.color || 0x7a7a3a, rough: 0.6 });
      const b = ball(c, 0.1, 1.2, 0.65, 1.1); b.position.y = 0.06; body.add(b); const bl = ball(col(0xd9d0a0, 0.6), 0.08, 1.1, 0.4, 0.9); bl.position.set(0, 0.035, 0.03); body.add(bl);
      const rng = U.rng(4); for (let i = 0; i < 16; i++) { const w = ball(c, 0.012); w.position.set((rng() - 0.5) * 0.18, 0.1 + rng() * 0.02, (rng() - 0.5) * 0.14); body.add(w); }
      const head = new THREE.Group(); head.position.set(0, 0.07, 0.08); body.add(head); head.add(ball(c, 0.07, 1.3, 0.55, 0.8));
      const ey = eyes(head, 0.05, 0.035, 0.03, 0.02, 0x2a2008); for (const e of ey) { const lid = ball(c, 0.024, 1, 0.6, 1); lid.position.y = 0.012; e.add(lid); }
      const legs = [[-0.09, 0.05], [0.09, 0.05], [-0.1, -0.06], [0.1, -0.06]].map(([x, z], i) => leg(body, c, x, 0.035, z, 0.03, 0.014, i < 2));
      return { g, body, head, eyes: ey, legs, tail: [], h: 0.14, throat: bl };
    },
    marmot(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0x8a6a48, 'mm'), bl = fur(0xd0b890, 'mbl');
      const t = ball(f, 0.14, 1, 1.3, 1); t.position.set(0, 0.16, 0); body.add(t); const be = ball(bl, 0.1, 0.9, 1.1, 0.7); be.position.set(0, 0.15, 0.06); body.add(be);
      const head = new THREE.Group(); head.position.set(0, 0.34, 0.03); body.add(head); head.add(ball(f, 0.075, 1.05, 0.9, 1)); const mz = ball(bl, 0.04, 1.2, 0.8, 1); mz.position.set(0, -0.02, 0.06); head.add(mz); const nz = ball(col(0x2a2018, 0.3), 0.012); nz.position.set(0, -0.005, 0.1); head.add(nz);
      for (const s of [-1, 1]) { const e = ball(f, 0.02, 1, 1, 0.5); e.position.set(s * 0.06, 0.05, -0.02); head.add(e); }
      const ey = eyes(head, 0.035, 0.02, 0.06, 0.011);
      const legs = [[-0.07, 0.08], [0.07, 0.08], [-0.08, -0.03], [0.08, -0.03]].map(([x, z], i) => leg(body, f, x, 0.08, z, 0.07, 0.02, i < 2));
      const tail = tailChain(body, fur(0x5a4a38, 'mt'), 3, 0.03, 0.025, 0.05, 0, 0.06, -0.12, 0.6);
      return { g, body, head, eyes: ey, legs, tail, h: 0.42 };
    },
    marten(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const f = fur(o.color || 0x4a3020, 'mn'), bib = fur(0xf0c870, 'mbib');
      const t = ball(f, 0.1, 0.9, 0.85, 2); t.position.set(0, 0.14, 0); body.add(t); const b2 = ball(bib, 0.07, 0.8, 0.8, 1); b2.position.set(0, 0.13, 0.15); body.add(b2);
      const head = new THREE.Group(); head.position.set(0, 0.2, 0.25); body.add(head); head.add(ball(f, 0.065, 1, 0.9, 1.25)); const nz = ball(col(0x1a1210, 0.3), 0.012); nz.position.set(0, -0.01, 0.085); head.add(nz);
      const ears = []; for (const s of [-1, 1]) { const e = ball(f, 0.03, 1, 1, 0.35); e.position.set(s * 0.045, 0.055, -0.01); head.add(e); ears.push(e); }
      const ey = eyes(head, 0.034, 0.018, 0.055, 0.011);
      const legs = [[-0.06, 0.13], [0.06, 0.13], [-0.07, -0.14], [0.07, -0.14]].map(([x, z], i) => leg(body, fur(0x2a1a10, 'mnl'), x, 0.08, z, 0.07, 0.018, i < 2));
      const tail = tailChain(body, f, 6, 0.05, 0.035, 0.06, 0, 0.14, -0.2, -0.15);
      return { g, body, head, eyes: ey, legs, tail, ears, h: 0.36 };
    },
    crab(o) {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const c = M.std('crab', { color: o.color || 0xc9442a, rough: 0.4 });
      const b = ball(c, 0.07, 1.3, 0.5, 1); b.position.y = 0.05; body.add(b);
      const head = new THREE.Group(); head.position.set(0, 0.07, 0.05); body.add(head);
      const ey = []; for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 4), c); st.position.set(s * 0.025, 0.02, 0.02); head.add(st); const e = new THREE.Group(); e.position.set(s * 0.025, 0.042, 0.02); const eb = ball(col(0x111111, 0.2), 0.009); e.add(eb); head.add(e); ey.push(e); }
      const legs = []; for (const s of [-1, 1]) { const cl2 = new THREE.Group(); cl2.position.set(s * 0.08, 0.05, 0.05); const arm = ball(c, 0.02, 1, 0.8, 1.6); arm.position.z = 0.02; cl2.add(arm); const pin = ball(c, 0.025, 1.2, 0.7, 1); pin.position.set(0, 0, 0.055); cl2.add(pin); body.add(cl2); cl2.userData.front = true; cl2.userData.side = s; legs.push(cl2); for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.003, 0.07, 4), c); l.position.set(s * 0.09, 0.03, -0.02 - k * 0.025); l.rotation.z = s * 1.1; body.add(l); } }
      return { g, body, head, eyes: ey, legs, tail: [], h: 0.1, crab: true };
    },
    ferret(o) {
      const f = new G.Ferret(o.pal || {}); (G.extraFerrets = G.extraFerrets || []).push(f);
      return { g: f.root, body: f.root, head: f.head, eyes: f.eyes || [], legs: [], tail: [], h: 0.25, ferret: f };
    },
  };
  B.magpie = (o) => B.bird(Object.assign({ color: 0x15161c, belly: 0xf2f2f2, wingColor: 0x1a2a4a, tailColor: 0x1a2a55, tailLen: 2.2, size: 2, beak: 1.3 }, o));
  B.gull = (o) => B.bird(Object.assign({ color: 0xf2f2f0, belly: 0xffffff, wingColor: 0x9aa4ae, beakColor: 0xf2c14e, legColor: 0xe8a060, size: 2.8, beak: 1.6, tailLen: 1.2 }, o));
  B.wren = (o) => B.bird(Object.assign({ color: 0x8a5a38, belly: 0xc9a07a, tailUp: 1.1, tailLen: 0.8, size: 1.1 }, o));
  B.robin = (o) => B.bird(Object.assign({ color: 0x7a6a58, belly: 0xe0703a, size: 1.2 }, o));

  /* outfits */
  function outfit(r, o) {
    const hd = r.head, s = o.hatScale || 1;
    if (o.hat === 'cap') { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, 6.3, 0, 1.6), col(o.hatColor || 0x3f6fa0)); c.scale.setScalar(0.05 * s); c.position.y = 0.035 * s; hd.add(c); }
    if (o.hat === 'pointy') { const c = new THREE.Mesh(CONE, col(o.hatColor || 0xc0392b)); c.scale.set(0.05 * s, 0.1 * s, 0.05 * s); c.position.y = 0.09 * s; c.rotation.z = 0.2; hd.add(c); }
    if (o.hat === 'bonnet') { const c = new THREE.Mesh(new THREE.TorusGeometry(0.055 * s, 0.02 * s, 6, 16), col(o.hatColor || 0xf2e6cf)); c.rotation.x = -0.4; c.position.set(0, 0.03 * s, -0.01); hd.add(c); }
    if (o.hat === 'flower') { const c = ball(col(o.hatColor || 0xe7a0b0), 0.02 * s); c.position.set(0.04 * s, 0.05 * s, 0); hd.add(c); }
    if (o.hat === 'top') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.07 * s, 12), col(o.hatColor || 0x222222)); c.position.y = 0.075 * s; hd.add(c); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 0.006, 16), c.material); br.position.y = 0.04 * s; hd.add(br); }
    if (o.scarf) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.06 * (o.scarfScale || 1), 0.018 * (o.scarfScale || 1), 6, 16), col(o.scarf, 0.95)); sc.rotation.x = Math.PI / 2; sc.position.copy(hd.position).add(V3(0, -0.04 * (o.scarfScale || 1), -0.03)); r.body.add(sc); }
    if (o.apron) { const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * (o.apronScale || 1), 0.12 * (o.apronScale || 1)), M.std('apron' + o.apron, { color: o.apron, rough: 0.9, side: THREE.DoubleSide, map: 'fabric' })); ap.position.copy(hd.position).add(V3(0, -0.1 * (o.apronScale || 1), 0.03)); r.body.add(ap); }
    if (o.glasses) { for (const sd of [-1, 1]) { const gl = new THREE.Mesh(new THREE.TorusGeometry(0.014 * s, 0.003 * s, 6, 12), M.get('brass')); gl.position.copy(r.eyes[sd > 0 ? 1 : 0].position).add(V3(0, 0, 0.01)); hd.add(gl); } }
    if (o.bag) { const bg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), col(o.bag)); bg.position.set(0.07 * (o.bagScale || 1), 0.08 * (o.bagScale || 1), 0); r.body.add(bg); }
    if (o.ribbon) { const rb = new THREE.Mesh(new THREE.TorusKnotGeometry(0.015, 0.005, 24, 4, 2, 3), col(o.ribbon, 0.5)); rb.position.set(0, 0.04, -0.03); hd.add(rb); }
  }

  /* ---------------------------------------------------------------- the animated creature */
  class Beast {
    constructor(kind, o = {}) {
      Object.assign(this, B[kind](o)); this.kind = kind; this.o = o;
      if (!this.ferret) { outfit(this, o); this.root = new THREE.Group(); this.root.add(this.g); this.g.add(G.shadowDisc(this.h * 0.8)); }
      else this.root = this.ferret.root;
      this.root.scale.setScalar(o.scale || 1);
      this.t = Math.random() * 10; this.ph = 0; this.blinkT = 2; this.emote = null; this.emoteT = 9; this.state = { moving: false, talk: false, speed: 0 }; this.curl = 0; this.fly = 0;
      this.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    }
    setEmote(e) { this.emote = e; this.emoteT = 0; }
    update(dt) {
      if (this.ferret) { this.ferret.update(dt, { speed: this.state.speed || 0, action: this.state.action || null, look: this.state.lookYaw }); return; }
      this.t += dt; this.emoteT += dt; const t = this.t, s = this.state, e = this.emoteT < 1.6 ? this.emote : null;
      this.ph += dt * (s.moving ? 12 : 0);
      let by = 0; if (s.moving) by = this.hop ? Math.abs(Math.sin(this.ph * 0.5)) * 0.05 : Math.abs(Math.sin(this.ph)) * 0.01;
      if (e === 'happy') by += Math.abs(Math.sin(t * 12)) * 0.03; if (e === 'surprised') by += Math.max(0, 0.05 - this.emoteT * 0.06);
      if (this.fly > 0) by += this.fly;
      this.body.position.y = U.damp(this.body.position.y, by, 14, dt);
      if (this.shy || this.spikes) { this.curl = U.damp(this.curl, s.scared ? 1 : 0, 6, dt); this.head.scale.setScalar(1 - this.curl * 0.8); }
      const nod = s.talk ? Math.sin(t * 7) * 0.08 : 0;
      let hy = Math.sin(t * 0.6) * 0.3; if (s.lookYaw !== undefined) hy = s.lookYaw; let hp = nod; if (e === 'sad') hp += 0.3; if (e === 'think') { hp -= 0.2; hy += 0.3; } if (e === 'surprised') hp -= 0.25;
      if (this.bird && !s.moving && !s.talk && Math.sin(t * 2.3) > 0.8) hp += 0.6;
      this.head.rotation.y = U.dampAngle(this.head.rotation.y, U.clamp(hy, -1.1, 1.1), 5, dt); this.head.rotation.x = U.damp(this.head.rotation.x, hp, 8, dt);
      this.blinkT -= dt; const es = this.blinkT < 0.1 ? 0.12 : e === 'happy' ? 0.5 : 1; if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4; for (const ey of this.eyes) ey.scale.y = es;
      for (const L of this.legs) { const ph = this.ph + (L.userData.front ? 0 : Math.PI) + (L.userData.side > 0 ? 0.5 : 0); L.rotation.x = s.moving ? Math.sin(this.hop ? this.ph * 0.5 : ph) * 0.7 : this.crab && s.talk ? Math.sin(t * 8) * 0.3 : 0; }
      this.tail.forEach((tl, i) => (tl.rotation.y = Math.sin(t * (e === 'happy' ? 9 : 1.8) - i * 0.5) * (this.kind === 'squirrel' ? 0.12 : 0.2)));
      if (this.wings) this.wings.forEach((w, i) => (w.rotation.z = (this.fly > 0 || s.flap ? Math.sin(t * 38) * 0.9 : e === 'happy' ? Math.sin(t * 20) * 0.4 : 0) * (i ? 1 : -1)));
      if (this.ears) this.ears.forEach((ear, i) => (ear.rotation.z = (i ? 1 : -1) * (-0.12 + (Math.sin(t * 1.3 + i * 2) > 0.97 ? 0.2 : 0))));
      if (this.throat) this.throat.scale.y = 1 + Math.max(0, Math.sin(t * 7)) * (s.talk ? 0.5 : 0.1);
    }
  }
  G.Beast = Beast;

  /* ================================================================ NPC framework */
  const NPC = (G.NPC = { list: {}, byId: {} });
  const ground = (p) => [p[0], p[1] === 'g' ? W.groundAt(p[0], 0, p[2]) : p[1] === 'u' ? W.groundAt(p[0], UG, p[2]) : p[1], p[2]];
  /* def: { id, name, kind, look:{...}, pos:[x,y,z] | ()=>[x,y,z]|null, yaw, when:()=>bool, lines:()=>[...], wander, r, label, sound, portrait } */
  NPC.add = function (def) {
    this.byId[def.id] = def; G.NAMES[def.id] = def.name;
    const make = () => { if (def.beast) return def.beast; def.beast = new Beast(def.kind, def.look || {}); def.beast.root.visible = false; game().scene.add(def.beast.root); def.home = null; return def.beast; };
    def.make = make; def.target = null; def.wait = 0;
    def.it = { id: 'npc_' + def.id, pos: [0, -999, 0], r: def.r || 0.95, label: () => (def.label ? (typeof def.label === 'function' ? def.label() : def.label) : 'Talk to ' + def.name), when: () => def.shown && !def.busy && !def.noTalk, act: () => NPC.talk(def.id) };
    G.INTERACT.push(def.it);
    return def;
  };
  NPC.portraits = function () {
    const P = G.Portrait; G.UI.portraitsExtra = G.UI.portraitsExtra || {};
    for (const id in this.byId) {
      const d = this.byId[id]; if (d.portrait === false) continue;
      const b = new Beast(d.kind, d.look || {}); b.update(0.016); b.root.updateMatrixWorld(true);
      const hp = V3(); b.head.getWorldPosition(hp); const s = Math.max(0.08, b.h * (d.look && d.look.scale || 1));
      const url = P.shot('npc_' + id, b.root, V3(hp.x + s * 0.55, hp.y + s * 0.12, hp.z + s * 1.7), V3(hp.x, hp.y - s * 0.05, hp.z));
      G.UI.portraitsExtra[id] = url; if (G.UI.portraits) G.UI.portraits[id] = url;
      if (b.ferret) { const i = G.extraFerrets.indexOf(b.ferret); if (i >= 0) G.extraFerrets.splice(i, 1); }
    }
  };
  NPC.get = (id) => NPC.byId[id];
  NPC.place = function (id, pos, yaw) { const d = this.byId[id]; const b = d.make(); const p = ground(pos); b.root.position.set(p[0], p[1], p[2]); if (yaw !== undefined) b.root.rotation.y = yaw; d.home = p; d.target = null; };
  NPC.update = function (dt) {
    const g = game(), pl = g.player; if (!pl) return;
    for (const id in this.byId) {
      const d = this.byId[id];
      let want = null; try { want = d.when ? d.when() : true; } catch (e) { want = false; }
      let pos = null; if (want) { try { pos = typeof d.pos === 'function' ? d.pos() : d.pos; } catch (e) { pos = null; } }
      const show = !!(want && pos);
      if (!show) { if (d.beast) d.beast.root.visible = false; d.shown = false; d.it.pos[1] = -999; continue; }
      const b = d.make(), r = b.root;
      if (!d.shown || !d.home || d.posKey !== String(pos)) { if ((!d.following && !(d.path && d.path.length)) || !d.shown) { const p = ground(pos); r.position.set(p[0], p[1], p[2]); if (d.yaw !== undefined) r.rotation.y = typeof d.yaw === 'function' ? d.yaw() : d.yaw; d.home = p; d.target = null; } d.posKey = String(pos); }
      r.visible = true; d.shown = true;
      const dx = pl.pos.x - r.position.x, dz = pl.pos.z - r.position.z, dist = Math.hypot(dx, dz);
      b.state.moving = false; b.state.lookYaw = undefined; b.state.speed = 0;
      const moveTo = (tx, tz, sp) => { const ax = tx - r.position.x, az = tz - r.position.z, l = Math.hypot(ax, az); if (l < 0.06) return true; const st = Math.min(sp * dt, l); r.position.x += (ax / l) * st; r.position.z += (az / l) * st; r.position.y = U.damp(r.position.y, W.groundAt(r.position.x, r.position.y + 0.3, r.position.z), 12, dt); r.rotation.y = U.dampAngle(r.rotation.y, Math.atan2(ax, az), 8, dt); b.state.moving = true; b.state.speed = sp; return false; };
      if (d.talking) r.rotation.y = U.dampAngle(r.rotation.y, Math.atan2(dx, dz), 6, dt);
      else if (d.following) {
        // follow Milo along his breadcrumbs, keeping a polite distance
        d.crumbs = d.crumbs || []; const last = d.crumbs[d.crumbs.length - 1];
        if (!last || Math.hypot(pl.pos.x - last[0], pl.pos.z - last[1]) > 0.5) d.crumbs.push([pl.pos.x, pl.pos.z]); if (d.crumbs.length > 60) d.crumbs.shift();
        if (dist > 14) { const f = pl.fwd(); r.position.set(pl.pos.x - f.x * 1.2, pl.pos.y, pl.pos.z - f.z * 1.2); d.crumbs = []; }
        else if (dist > (d.followGap || 0.9)) { while (d.crumbs.length > 1 && Math.hypot(d.crumbs[0][0] - r.position.x, d.crumbs[0][1] - r.position.z) < 0.25) d.crumbs.shift(); const c = d.crumbs[0] || [pl.pos.x, pl.pos.z]; moveTo(c[0], c[1], Math.max(1.6, Math.min(4.2, pl.speedH * 1.05 + (dist > 3 ? 1.5 : 0)))); }
        else r.rotation.y = U.dampAngle(r.rotation.y, Math.atan2(dx, dz), 3, dt);
      } else if (d.path && d.path.length) { if (moveTo(d.path[0][0], d.path[0][2] ?? d.path[0][1], d.pathSpeed || 1.4)) { d.path.shift(); if (!d.path.length && d.onArrive) { const f = d.onArrive; d.onArrive = null; f(); } } }
      else if (d.wander) {
        d.wait -= dt; if (!d.target && d.wait <= 0) { const a = Math.random() * 6.28, rr = Math.random() * d.wander; d.target = [d.home[0] + Math.cos(a) * rr, d.home[2] + Math.sin(a) * rr]; }
        if (d.target && moveTo(d.target[0], d.target[1], d.speed || 0.5)) { d.target = null; d.wait = 2 + Math.random() * 5; }
      } else if (d.yaw !== undefined && dist > 3) r.rotation.y = U.dampAngle(r.rotation.y, typeof d.yaw === 'function' ? d.yaw() : d.yaw, 2, dt);
      if (!d.talking && !b.state.moving && dist < 3.5) b.state.lookYaw = U.clamp(U.angDiff(r.rotation.y, Math.atan2(dx, dz)), -1, 1);
      b.state.talk = !!d.talking && G.UI.dialogueOpen && G.UI.history.length && G.UI.history[G.UI.history.length - 1].who === id;
      if (d.scaredOf) b.state.scared = d.scaredOf();
      if (d.tick) d.tick(dt, d, b);
      b.update(dt);
      d.it.pos[0] = r.position.x; d.it.pos[1] = r.position.y; d.it.pos[2] = r.position.z;
      // don't walk through them
      const R2 = (d.solid || 0.2) + 0.12; if (dist < R2 && dist > 0.001 && Math.abs(pl.pos.y - r.position.y) < 0.5 && !d.following) { pl.pos.x = r.position.x + (dx / dist) * R2; pl.pos.z = r.position.z + (dz / dist) * R2; }
    }
  };
  NPC.talk = function (id, linesOverride, done) {
    const d = this.byId[id], g = game(); if (!d || !d.beast) return;
    const lines = linesOverride || (d.lines ? d.lines() : [[id, '...', 'neutral']]); if (!lines || !lines.length) return;
    const p = g.player, np = d.beast.root.position;
    p.yaw = Math.atan2(np.x - p.pos.x, np.z - p.pos.z); d.talking = true;
    const mid = V3((p.pos.x + np.x) / 2, Math.max(p.pos.y, np.y) + 0.25 + (d.beast.h || 0.2) * 0.4, (p.pos.z + np.z) / 2), dx = np.x - p.pos.x, dz = np.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
    const side = V3(-dz / l, 0, dx / l).multiplyScalar(1.4 + (d.beast.h || 0.2)); const camP = mid.clone().add(side).add(V3(0, 0.4, 0)); if (g.camFree(mid, camP)) g.cinematic({ pos: camP, look: mid, dur: 999, soft: true });
    if (d.sound) A.play(d.sound);
    if (!S().flags['met_' + id]) g.flag('met_' + id);
    g.say(lines, () => { d.talking = false; g.cinematicEnd(); done && done(); d.after && d.after(); });
  };
  NPC.emote = (id, e) => { const d = NPC.byId[id]; if (d && d.beast) d.beast.setEmote(e); };

  // hook into the game
  const EXT = G.EXT, oInit = EXT.init, oUpd = EXT.update;
  EXT.init = function (g) {
    oInit(g); NPC.portraits();
    // dialogue expressions work for the new speakers too
    const oNext = G.UI.next.bind(G.UI);
    G.UI.next = function () { const L = this.queue[0]; if (L && Array.isArray(L) && NPC.byId[L[0]] && L[2]) NPC.emote(L[0], L[2]); return oNext(); };
  };
  EXT.update = function (dt, st) { oUpd(dt, st); if (st === 'play' || st === 'cutscene' || st === 'menu') NPC.update(dt); else for (const id in NPC.byId) { const d = NPC.byId[id]; if (d.beast) d.beast.root.visible = false; } };
  // new sounds for the new animals
  const basePlay = A.play.bind(A);
  A.play = function (name, v = 1) {
    if (!A.ready) return;
    switch (name) {
      case 'otter': for (let i = 0; i < 4; i++) A.tone({ f: 1500 + Math.random() * 600, f2: 1100, type: 'triangle', dur: 0.05, vol: 0.05 * v, delay: i * 0.07, lp: 3000 }); return;
      case 'badger': A.tone({ f: 160, f2: 120, type: 'sawtooth', dur: 0.3, vol: 0.06 * v, lp: 600 }); return;
      case 'mole': A.noise({ f: 900, q: 1.5, dur: 0.15, vol: 0.05 * v }); A.tone({ f: 700, f2: 900, dur: 0.08, vol: 0.03 * v, delay: 0.15 }); return;
      case 'magpie': for (let i = 0; i < 5; i++) A.tone({ f: 1100, f2: 900, type: 'square', dur: 0.05, vol: 0.03 * v, delay: i * 0.08, lp: 2500 }); return;
      case 'gull': A.tone({ f: 1300, f2: 800, type: 'sawtooth', dur: 0.4, vol: 0.05 * v, lp: 2200, slide: 0.35 }); A.tone({ f: 1250, f2: 750, type: 'sawtooth', dur: 0.35, vol: 0.04 * v, lp: 2200, delay: 0.45 }); return;
      case 'whistle': A.tone({ f: 2600, f2: 3400, dur: 0.35, vol: 0.05 * v, slide: 0.3 }); return;
      case 'toad': A.tone({ f: 140, f2: 110, type: 'square', dur: 0.25, vol: 0.05 * v, lp: 400 }); return;
      case 'crab': for (let i = 0; i < 3; i++) A.noise({ f: 3500, q: 3, dur: 0.02, vol: 0.05 * v, delay: i * 0.06 }); return;
    }
    return basePlay(name, v);
  };
})();
