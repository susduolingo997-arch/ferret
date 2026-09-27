/* =====================================================================
   backrooms.js - Bonus Chapter IV: "What Is This Place?"
   A patch of the backyard fence flickers. Milo sniffs it, slips through
   the world... and wakes up on damp yellow carpet under humming lights.
   Level 0: an endless (well, 56 x 56 m) maze of yellow wallpaper.
   - Find three bottles of almond water: the sweet smell of each one
     points the way on.
   - Something else walks the halls. When the lights flicker and the hum
     gets loud, run. If it catches Milo, he blinks and is back where he
     woke up (bottles kept).
   - With all three bottles, Milo can smell fresh air: an EXIT door,
     somewhere far from where he started.
   Chapter id 20. Built underground (like the Deepways) as a region.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, R = G.Regions, EXT = G.EXT, UG = W.UG;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const has = (f) => !!S().flags[f];
  const CH = 20, inBR = () => S().chapter === CH;

  /* ---------------------------------------------------------------- the maze */
  const X0 = 400, Z0 = 300, CS = 4, N = 14, HGT = 3, WT = 0.3; // cell size, cells per side, wall height/thickness
  const X1 = X0 + N * CS, Z1 = Z0 + N * CS;
  const cx = (i) => X0 + (i + 0.5) * CS, cz = (j) => Z0 + (j + 0.5) * CS;
  const cellOf = (x, z) => [U.clamp(Math.floor((x - X0) / CS), 0, N - 1), U.clamp(Math.floor((z - Z0) / CS), 0, N - 1)];
  // walls: E[i][j] = wall on the east side of cell (i,j); Sw[i][j] = wall on the south (+z) side
  const E = [], Sw = [];
  (function gen() {
    const rng = U.rng(4040);
    for (let i = 0; i < N; i++) { E[i] = []; Sw[i] = []; for (let j = 0; j < N; j++) { E[i][j] = true; Sw[i][j] = true; } }
    const seen = new Set(), st = [[0, 0]]; seen.add('0,0');
    while (st.length) {
      const [i, j] = st[st.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [i + di, j + dj, di, dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a + ',' + b));
      if (!nb.length) { st.pop(); continue; }
      const [a, b, di, dj] = nb[Math.floor(rng() * nb.length)];
      if (di === 1) E[i][j] = false; else if (di === -1) E[a][b] = false; else if (dj === 1) Sw[i][j] = false; else Sw[a][b] = false;
      seen.add(a + ',' + b); st.push([a, b]);
    }
    // the backrooms are open and samey, not a neat maze: knock out lots of extra walls and carve a few big rooms
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (rng() < 0.38) E[i][j] = false; if (rng() < 0.38) Sw[i][j] = false; }
    for (const [ri, rj] of [[3, 9], [9, 3], [8, 10]]) for (let i = ri; i < ri + 3; i++) for (let j = rj; j < rj + 3; j++) { if (i < ri + 2) E[i][j] = false; if (j < rj + 2) Sw[i][j] = false; }
  })();
  const open = (i, j, di, dj) => { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) return false; if (di === 1) return !E[i][j]; if (di === -1) return !E[a][b]; if (dj === 1) return !Sw[i][j]; return !Sw[a][b]; };
  function bfs(si, sj) { const d = Array.from({ length: N }, () => Array(N).fill(-1)), q = [[si, sj]]; d[si][sj] = 0; while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(i, j, di, dj) && d[i + di][j + dj] < 0) { d[i + di][j + dj] = d[i][j] + 1; q.push([i + di, j + dj]); } } return d; }
  const START = [1, 1], D0 = bfs(...START);
  // the exit: the cell furthest from where Milo wakes up; bottles at a third, half and three quarters of the way
  let far = START; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (D0[i][j] > D0[far[0]][far[1]]) far = [i, j];
  const maxD = D0[far[0]][far[1]];
  const pickAt = (k, avoid) => { let best = null, bd = 1e9; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const dd = Math.abs(D0[i][j] - maxD * k) + (avoid.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) < 4) ? 50 : 0) + ((i * 7 + j * 3) % 5) * 0.1; if (dd < bd) { bd = dd; best = [i, j]; } } return best; };
  const BOT = []; for (const k of [0.3, 0.55, 0.8]) BOT.push(pickAt(k, [START, far, ...BOT]));
  // the exit door sits on the outer wall of the far cell if it has one, else stands on its own
  const exitSide = far[0] === N - 1 ? [1, 0] : far[0] === 0 ? [-1, 0] : far[1] === N - 1 ? [0, 1] : far[1] === 0 ? [0, -1] : [0, 1];
  const EXIT = [cx(far[0]) + exitSide[0] * (CS / 2 - WT / 2 - 0.05), UG, cz(far[1]) + exitSide[1] * (CS / 2 - WT / 2 - 0.05)];
  const EXIT_YAW = Math.atan2(-exitSide[0], -exitSide[1]);
  const P = (W.pts.backrooms = { start: [cx(START[0]), UG, cz(START[1])], exit: EXIT, bottles: BOT.map(([i, j]) => [cx(i) + 0.6, UG, cz(j) - 0.4]) });

  /* ---------------------------------------------------------------- items, steps, chapter */
  Object.assign(G.ITEMS, { almond: { name: 'Almond Water', desc: 'A plastic bottle of something sweet and cloudy. It smells like almonds and like... being okay. Found in a place that should not exist.', stack: true } });
  G.CHAPTERS[CH] = ['Bonus Chapter IV', 'What Is This Place?']; G.ROMAN[CH] = '?';
  const bottlesLeft = () => BOT.length - (S().inv.almond || 0) - (S().brDrunk || 0);
  const nextBottle = () => { const p = game().player.pos; let best = null, bd = 1e9; P.bottles.forEach((b, k) => { if (has('got_p_br' + k)) return; const d = (b[0] - p.x) ** 2 + (b[2] - p.z) ** 2; if (d < bd) { bd = d; best = b; } }); return best; };
  Object.assign(G.STEPS, {
    br_wake: { text: 'Where... is this?', target: null },
    br_bottles: { text: () => `Find something that smells sweet (almond water ${3 - Math.max(0, bottlesLeft())}/3)`, target: () => nextBottle() },
    br_exit: { text: 'Fresh air! Follow it to the way out', target: P.exit },
  });
  for (let k = 0; k < 3; k++) G.PICKUPS.push({ id: 'p_br' + k, item: 'almond', model: 'almond', pos: P.bottles[k], when: () => inBR(), msg: ['A bottle of... almond water? It smells sweet. Like somebody left it here on purpose.', 'Another bottle. The sweet smell helps the humming feel further away.', 'The third bottle! And under the almond smell... wind. Real outside wind.'][k] });
  const oMake = G.makeItem;
  G.makeItem = function (id) {
    if (id !== 'almond') return oMake(id);
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 12), M.std('almondBottle', { color: 0xf2ecd8, rough: 0.2, transparent: true, opacity: 0.85, emissive: 0x302818, ei: 0.3 })); b.position.y = 0.065; g.add(b);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 10), M.std('almondCap', { color: 0x3f6fa0, rough: 0.4 })); cap.position.y = 0.14; g.add(cap);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0355, 0.0355, 0.05, 12, 1, true), M.std('almondLabel', { color: 0xd9c070, rough: 0.6 })); lab.position.y = 0.06; g.add(lab);
    return g;
  };

  /* ---------------------------------------------------------------- textures */
  const texWall = () => G.Tex.make('brWallpaper', 256, 256, (g, w, h, r) => {
    g.fillStyle = '#c9b458'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(120,100,30,.18)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,240,160,.12)'; g.fillRect(x + 12, 0, 8, h); }
    g.fillStyle = 'rgba(110,90,30,.22)'; for (let y = 8; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 8); g.lineTo(x, y + 16); g.lineTo(x - 5, y + 8); g.closePath(); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,70,20,${0.03 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 10 + r() * 40, 0, 0, 7); g.fill(); }
  });
  const texCarpet = () => G.Tex.make('brCarpet', 256, 256, (g, w, h, r) => {
    g.fillStyle = '#9a8a4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const c = 110 + r() * 60; g.fillStyle = `rgba(${c},${c * 0.88},${c * 0.45},.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(60,50,20,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 22, 5 + r() * 16, r() * 3, 0, 7); g.fill(); }
  });
  const texCeil = () => G.Tex.make('brCeiling', 128, 128, (g, w, h, r) => {
    g.fillStyle = '#d8d0a8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(120,110,80,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 1, 1); }
    g.strokeStyle = '#a89e78'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });

  /* ---------------------------------------------------------------- the region */
  const O = {};
  R.def({
    id: 'backrooms', ug: true, manual: true, name: 'Level 0', bounds: [X0 - 2, X1 + 2, Z0 - 2, Z1 + 2],
    areas: [['brLevel0', 'Level 0', X0, X1, Z0, Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[X0, X1, Z0, Z1]],
    build(ctx) {
      const { H, root } = ctx, y = UG, rng = U.rng(77);
      const wallM = M.std('brWall', { map: texWall(), color: 0xffffff, rough: 0.9 });
      const carpM = M.std('brCarpetM', { map: texCarpet(), color: 0xffffff, rough: 1 });
      const ceilM = M.std('brCeilM', { map: texCeil(), color: 0xffffff, rough: 1, side: THREE.DoubleSide });
      const lampM = M.std('brLamp', { color: 0xfffbe6, emissive: 0xfff2c0, ei: 1.6, rough: 0.5 }); O.lampM = lampM;
      const deadM = M.std('brLampDead', { color: 0x8a8670, rough: 0.6 });
      H.plane(X0, X1, Z0, Z1, y + 0.002, carpM, 3);
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), ceilM); ceil.rotation.x = Math.PI / 2; ceil.position.set((X0 + X1) / 2, y + HGT, (Z0 + Z1) / 2);
      { const uv = ceil.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (X1 - X0) / 1.2, uv.getY(i) * (Z1 - Z0) / 1.2); } root.add(ceil);
      W.collider(X0, X1, Z0, Z1, y + HGT, y + HGT + 0.4, { walk: false });
      // outer walls, then the maze walls (east and south sides of every cell)
      R.walls(X0, X1, Z0, Z1, y - 1, y + HGT, {});
      for (const [x0, x1, z0, z1] of [[X0 - WT, X0, Z0, Z1], [X1, X1 + WT, Z0, Z1], [X0, X1, Z0 - WT, Z0], [X0, X1, Z1, Z1 + WT]]) H.box({ w: x1 - x0, h: HGT, d: z1 - z0, x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, mat: wallM, s: 2, col: false });
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (E[i][j] && i < N - 1) H.box({ w: WT, h: HGT, d: CS + WT, x: X0 + (i + 1) * CS, y, z: cz(j), mat: wallM, s: 2 });
        if (Sw[i][j] && j < N - 1) H.box({ w: CS + WT, h: HGT, d: WT, x: cx(i), y, z: Z0 + (j + 1) * CS, mat: wallM, s: 2 });
      }
      // a few lonely pillars in the open rooms
      for (let k = 0; k < 18; k++) { const i = Math.floor(rng() * N), j = Math.floor(rng() * N); if (Math.abs(i - START[0]) + Math.abs(j - START[1]) < 2 || (i === far[0] && j === far[1]) || BOT.some(([a, b]) => a === i && b === j)) continue; H.box({ w: 0.6, h: HGT, d: 0.6, x: X0 + (i + 1) * CS, y, z: Z0 + (j + 1) * CS, mat: wallM, s: 2 }); }
      // fluorescent panels on the ceiling: most on, some dead, a real light every other cell
      O.lights = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const dead = rng() < 0.12, pm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), dead ? deadM : lampM); pm.position.set(cx(i), y + HGT - 0.03, cz(j)); root.add(pm);
        if (!dead && (i + j) % 2 === 0) O.lights.push(H.light(cx(i), y + HGT - 0.2, cz(j), 0xfff0c0, 0.9, 7.5, { ug: true, flicker: rng() < 0.2 ? 0.25 : 0.02 }));
      }
      // the exit: a grey metal door with a glowing sign (dark until Milo has found all three bottles)
      const door = new THREE.Group(); door.position.set(EXIT[0], y, EXIT[2]); door.rotation.y = EXIT_YAW; root.add(door); door.userData.dynamic = true; O.door = door;
      const dm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), M.std('brDoor', { color: 0x6a6e72, rough: 0.5, metal: 0.4 })); dm.position.y = 1.05; door.add(dm);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.get('brass')); kn.position.set(0.4, 1.0, 0.06); door.add(kn);
      const signT = G.Tex.make('brExitSign', 128, 48, (g, w, h) => { g.fillStyle = '#1a0e0e'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4a3a'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText('EXIT', w / 2, 36); });
      const signM = new THREE.MeshStandardMaterial({ map: signT, emissive: 0xff3020, emissiveMap: signT, emissiveIntensity: 0, roughness: 0.4 }); O.signM = signM;
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), signM); sg.position.set(0, 2.35, 0.06); door.add(sg); door.traverse((o) => (o.userData.dynamic = true));
      O.exitLight = H.light(EXIT[0] - exitSide[0] * 0.6, y + 2.2, EXIT[2] - exitSide[1] * 0.6, 0xff5040, 0, 4, { ug: true });
      // the thing in the halls: a flickering, too-tall smudge of static with two pale lights for eyes
      const ent = new THREE.Group(); ent.userData.dynamic = true; root.add(ent); O.ent = ent; ent.visible = false;
      const em = new THREE.MeshBasicMaterial({ color: 0x0c0a06, transparent: true, opacity: 0.82, depthWrite: false });
      O.blobs = []; for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.28 + (k % 3) * 0.08, 10, 8), em); b.position.set(0, 0.4 + k * 0.24, 0); b.userData.dynamic = true; ent.add(b); O.blobs.push(b); }
      const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeM); e.position.set(s * 0.12, 2.25, 0.26); e.userData.dynamic = true; ent.add(e); }
      ent.traverse((o) => (o.userData.dynamic = true));
    },
  });

  /* ---------------------------------------------------------------- the way in: a glitching patch of backyard fence */
  const GLITCH = [-8.6, 0, -27.55];
  let glitch = null;
  function makeGlitch(scene) {
    const t = G.Tex.make('brGlitch', 64, 64, (g, w, h, r) => { g.fillStyle = '#c9b458'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,250,200,.6)' : 'rgba(60,50,20,.5)'; g.fillRect(0, r() * h, w, 1 + r() * 3); } });
    glitch = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    glitch.position.set(GLITCH[0], 0.55, GLITCH[2] - 0.02); scene.add(glitch);
  }
  const glitchOn = () => ![7, 8, 9, CH].includes(S().chapter) && !G.SEQ.running;
  G.INTERACT.push({ id: 'br_glitch', pos: [GLITCH[0], 0, GLITCH[2] + 0.5], r: 1.3, label: () => (has('brSeen') ? 'Sniff the flickering fence (Level 0)' : 'Sniff the flickering patch of fence'), anim: 'sniff', when: () => glitchOn() && S().chapter !== 1, act: () => start() });

  /* ---------------------------------------------------------------- start / escape */
  function start() {
    const g = game(), s = S();
    if (![7, 8, 9, CH].includes(s.chapter)) { s.brPrev = s.chapter; s.brPrevStep = s.step; }
    const first = !has('brSeen');
    const go = () => {
      UI().fade(true, () => {
        R.build(R.byId.backrooms); g.cinematicEnd && g.cinematicEnd();
        s.chapter = CH; s.step = 'br_wake'; s.flags.brSeen = true; s.brDrunk = 0;
        for (let k = 0; k < 3; k++) { delete s.flags['got_p_br' + k]; } s.inv.almond = 0; delete s.inv.almond;
        g.applyWorldState(); g.placeNPCs && g.placeNPCs(); g.refreshItems && g.refreshItems();
        g.player.teleport(P.start[0], UG, P.start[2], Math.PI / 4); g.cam.snap = true; g.player.act && g.player.act('sleep', 1.6);
        resetEntity(true); applyExit(); A.setMood('quiet');
        setTimeout(() => { UI().fade(false); UI().chapterCard(CH); UI().updateObjective(true); }, 500);
        setTimeout(() => g.say([
          ['milo', '...Ow. Where...', 'sad'],
          ['milo', 'Yellow walls. Yellow carpet. Wet carpet. And a hum. A big, flat, buzzy hum, coming from everywhere at once.', 'surprised'],
          ['milo', 'This isn’t the backyard. This isn’t ANYWHERE. It smells like old carpet and... nothing. Nothing else at all.', 'think'],
          ['milo', 'Wait. Very faint, far away... something sweet. Like almonds. Follow your nose, Milo. And maybe... don’t stay in one place too long.', 'think'],
        ], () => { s.step = 'br_bottles'; UI().updateObjective(true); g.autosave && g.autosave(); }), 1900);
      });
    };
    if (first) g.say([['milo', 'This bit of fence is... flickering? Like a TV between channels. And it smells like damp carpet.', 'surprised'], ['milo', 'I’ll just have one little sniff...', 'think'], { do: () => { A.play('secret'); g.shake = 0.6; } }], go);
    else go();
  }
  function escape() {
    const g = game(), s = S(); g.busy = true; A.play('door');
    g.say([['milo', 'The door handle is cold. Real cold. Outside cold. Here goes...', 'think']], () => {
      UI().fade(true, () => {
        s.brDrunk = 0; s.flags.brDone = true;
        s.chapter = s.brPrev && ![7, 8, 9, CH].includes(s.brPrev) ? s.brPrev : 6; s.step = s.chapter === 6 ? 'end' : s.brPrevStep || s.step;
        if (O.ent) O.ent.visible = false; A.setMood(g.moodFor());
        g.applyWorldState(); g.placeNPCs && g.placeNPCs(); g.refreshItems && g.refreshItems();
        g.cinematicEnd && g.cinematicEnd(); g.player.teleport(-3, 0, -3.9, 0.4); g.cam.snap = true; g.busy = false;
        setTimeout(() => { UI().fade(false); UI().updateObjective(true); g.autosave && g.autosave();
          g.say([['milo', '*...My basket. My blanket. The house is making its normal house noises.*', 'surprised'], ['milo', '*Was it a dream? It must have been a dream.*', 'think'], ['milo', '*...Then why does my fur smell like almonds?*', 'surprised']], () => UI().toast('<b>Bonus chapter complete</b>', null, 'What Is This Place? · You escaped Level 0. The fence still flickers, if you ever want to go back.')); }, 700);
      });
    });
  }
  G.INTERACT.push({ id: 'br_exit', pos: [EXIT[0] - exitSide[0] * 0.5, UG, EXIT[2] - exitSide[1] * 0.5], r: 1.4, label: () => (S().step === 'br_exit' ? 'Push open the EXIT door' : 'Try the grey metal door'), anim: 'push', when: () => inBR() && !G.SEQ.running, act: () => {
    if (S().step === 'br_exit') return escape();
    game().say([['milo', 'Locked. Or maybe not locked, just... not ready. The sign above it is dark.', 'think'], ['milo', 'I need to find more of that sweet smell first.', 'think']]);
  } });
  function applyExit() { const on = inBR() && S().step === 'br_exit'; if (O.signM) O.signM.emissiveIntensity = on ? 2.2 : 0; if (O.exitLight) O.exitLight.int = on ? 1.4 : 0; }

  /* ---------------------------------------------------------------- the thing in the halls */
  const ENT = { i: 0, j: 0, path: [], t: 0, repath: 0, active: false, cool: 0 };
  function resetEntity(first) {
    const p = game().player.pos, [pi, pj] = cellOf(p.x, p.z), d = bfs(pi, pj);
    // put it somewhere a long walk away
    let best = [N - 1, N - 1], bd = -1; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const v = d[i][j] + ((i * 13 + j * 7) % 4); if (d[i][j] > 7 && d[i][j] < 16 && v > bd) { bd = v; best = [i, j]; } }
    ENT.i = best[0]; ENT.j = best[1]; ENT.path = []; ENT.cool = first ? 25 : 12; ENT.active = true;
    if (O.ent) { O.ent.position.set(cx(ENT.i), UG, cz(ENT.j)); O.ent.visible = false; }
  }
  function caught() {
    const g = game(); g.busy = true; A.play('thud'); g.shake = 1.2; ENT.active = false;
    UI().fade(true, () => { g.player.teleport(P.start[0], UG, P.start[2], Math.PI / 4); g.cam.snap = true; resetEntity(false); g.busy = false; setTimeout(() => UI().fade(false), 300);
      UI().toast('<b>...You blinked.</b>', null, 'And you’re back on the damp carpet where you woke up. Your almond water is still with you.'); });
  }
  let humT = 0;
  const oUpd = EXT.update;
  EXT.update = function (dt, st) {
    oUpd(dt, st);
    const g = game(); if (!g || !g.player) return;
    // the fence glitch in the backyard
    if (!glitch && g.scene) makeGlitch(g.scene);
    if (glitch) { const on = glitchOn() && S().chapter !== 1; glitch.visible = on; if (on) { const d = Math.hypot(g.player.pos.x - GLITCH[0], g.player.pos.z - GLITCH[2]); glitch.material.opacity = (Math.random() < 0.15 ? 0.9 : 0.25) * U.clamp(1.4 - d / 10, 0.15, 1); glitch.material.map.offset.y = Math.random(); } }
    if (!inBR() || !O.ent) { if (O.ent) O.ent.visible = false; return; }
    const p = g.player.pos, inside = p.y < UG + 6 && p.x > X0 - 1 && p.x < X1 + 1 && p.z > Z0 - 1 && p.z < Z1 + 1;
    // the look: bright, flat, yellow, a little hazy
    if (inside && g.scene.fog) { g.scene.fog.color.setHex(0x8a7a3a); g.scene.fog.density = 0.055; g.hemi.intensity = 0.95; g.hemi.color.setHex(0xfff2b8); g.hemi.groundColor.setHex(0x8a7a40); }
    if (st !== 'play' || !inside) return;
    // the hum
    humT -= dt; const near = O.ent.visible ? Math.hypot(O.ent.position.x - p.x, O.ent.position.z - p.z) : 99;
    if (humT <= 0) { humT = 1.9; A.tone && A.tone({ f: 60, type: 'sawtooth', dur: 2.1, vol: 0.012 + (near < 12 ? (12 - near) * 0.004 : 0), lp: 380, a: 0.3 }); A.tone && A.tone({ f: 120, type: 'sine', dur: 2.1, vol: 0.01, a: 0.3 }); }
    // lights flicker harder when it's close
    if (O.lampM) O.lampM.emissiveIntensity = near < 10 && Math.random() < 0.25 ? 0.2 : 1.6;
    if (O.lights) for (const L of O.lights) L.flicker = near < 10 ? 0.6 : L._f0 ?? (L._f0 = L.flicker);
    // collect: the sweet smell leads on
    const got = (S().inv.almond || 0);
    if (S().step === 'br_bottles' && got >= 3 && !UI().dialogueOpen) { S().step = 'br_exit'; applyExit(); UI().updateObjective(true); A.play('secret'); g.say([['milo', 'Three bottles... and now I can smell it properly. WIND. Real wind, and grass, and far-away rain.', 'surprised'], ['milo', 'Somewhere in these halls there’s a way out. And... something just switched a sign on. I can see a red glow.', 'think']]); }
    // the entity: waits a bit, then walks the halls toward Milo
    if (UI().dialogueOpen || g.busy || !ENT.active) return;
    if (ENT.cool > 0) { ENT.cool -= dt; return; }
    if (!O.ent.visible) { O.ent.visible = true; A.play('thud', 0.3); UI().toast('<b>The hum just got louder.</b>', null, 'Something is walking the halls. Keep moving. Run (Shift) if the lights start to flicker.'); }
    const [pi, pj] = cellOf(p.x, p.z);
    ENT.repath -= dt;
    if (ENT.repath <= 0 || !ENT.path.length) { ENT.repath = 0.6; const d = bfs(pi, pj); const path = []; let i = ENT.i, j = ENT.j; for (let k = 0; k < 60 && d[i][j] > 0; k++) { for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(i, j, di, dj) && d[i + di][j + dj] === d[i][j] - 1) { i += di; j += dj; path.push([i, j]); break; } } ENT.path = path; }
    const e = O.ent.position, tgt = ENT.path.length ? [cx(ENT.path[0][0]), cz(ENT.path[0][1])] : [p.x, p.z];
    const sp = 2.35, dx = tgt[0] - e.x, dz = tgt[1] - e.z, l = Math.hypot(dx, dz);
    if (l > 0.05) { e.x += (dx / l) * Math.min(l, sp * dt); e.z += (dz / l) * Math.min(l, sp * dt); O.ent.rotation.y = Math.atan2(dx, dz); }
    if (ENT.path.length && l < 0.2) { [ENT.i, ENT.j] = ENT.path.shift(); }
    const ce = cellOf(e.x, e.z); ENT.i = ce[0]; ENT.j = ce[1];
    O.blobs.forEach((b, k) => { b.position.x = Math.sin(g.t * 9 + k * 1.7) * 0.07; b.position.z = Math.cos(g.t * 7 + k) * 0.05; b.scale.setScalar(1 + Math.sin(g.t * 13 + k) * 0.12); });
    O.ent.visible = Math.random() > 0.04; // it flickers too
    if (near < 0.75) caught();
  };

  /* ---------------------------------------------------------------- hooks: chapter routing, loading, mood, admin */
  const oInit = EXT.init;
  EXT.init = function (g) {
    oInit(g);
    const oStart = g.startChapter.bind(g); g.startChapter = (n, silent) => (n === CH ? start() : oStart(n, silent));
    const oMood = g.moodFor.bind(g); g.moodFor = () => (S().chapter === CH ? 'quiet' : oMood());
  };
  const oApply = EXT.applyState;
  EXT.applyState = function (g0) {
    oApply(g0);
    if (inBR()) { R.build(R.byId.backrooms); applyExit(); if (!ENT.active && game().player) resetEntity(true); }
  };
})();
