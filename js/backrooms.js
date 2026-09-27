/* =====================================================================
   backrooms.js - Bonus Chapter IV: "What Is This Place?"
   A patch of the backyard fence flickers. Milo sniffs it, slips through
   the world... and wakes up on damp yellow carpet under humming lights.
   From there, five levels chained one under the other:
     0 The Lobby     yellow wallpaper maze, odd empty rooms, a dead-end
                     hallway, rooms with no doors. 3 bottles of almond
                     water, a flickering static thing, an EXIT door.
     1 The Warehouse concrete, crates, puddles, orange lamps, grey fog.
                     4 fuses power a freight elevator. Every ~30 s the
                     lights go out: freeze, or you're back at the start.
     2 Pipe Dreams   a narrow dark pipe maze. Milo carries a small light.
                     Steam vents push him back. 3 valve wheels open the
                     hatch. The static thing is back, a little slower.
     3 The Poolrooms white tiles, shallow water, deep pools. No threats,
                     Calm refills. 5 rubber ducks open the ladder.
     4 The Party...  streamers, confetti, cake. Smiling balloons drift
                     after Milo (touch one and the level resets). Pounce
                     on 6 golden balloons; the giant cake slides aside
                     and the way home is behind it.
   Also: a Calm meter (only shown here), spare almond water drunk
   automatically when Calm is low, 10 Wanderer's Notes by Clementine the
   hamster (who also turns up in Levels 1 and 3), checkpoints at the
   furthest level reached, admin jumps, and scent vision (Q) that paths
   through the mazes to the next goal.
   Nothing here hurts Milo: every threat only sends him back a bit.
   Chapter id 20. Every level is an underground region at its own XZ block.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, M = G.Mat, A = G.Audio, W = G.World, R = G.Regions, EXT = G.EXT, UG = W.UG;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const has = (f) => !!S().flags[f];
  const CH = 20, inBR = () => S().chapter === CH;
  const BR = () => { const s = S(); if (!s.br || typeof s.br !== 'object') s.br = { lvl: 0, max: 0, calm: 100, pop: [] }; if (!Array.isArray(s.br.pop)) s.br.pop = []; if (typeof s.br.calm !== 'number') s.br.calm = 100; return s.br; };
  const lvl = () => BR().lvl | 0;
  const key = (i, j) => i + ',' + j;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /* ================================================================ grid mazes
     E[i][j] = wall on the east side of cell (i,j); Sw[i][j] = wall on its south (+z) side.
     o: { x0, z0, n, cs, seed, knock, rooms:[[i,j,w,h]], sealed:[[i,j,w,h]], custom(g), start:[i,j], pools } */
  function mkGrid(o) {
    const N = o.n, CS = o.cs, g = Object.assign({ N, CS, X1: o.x0 + N * CS, Z1: o.z0 + N * CS }, o), X0 = o.x0, Z0 = o.z0;
    const E = (g.E = []), Sw = (g.Sw = []), rng = U.rng(o.seed);
    for (let i = 0; i < N; i++) { E[i] = []; Sw[i] = []; for (let j = 0; j < N; j++) { E[i][j] = true; Sw[i][j] = true; } }
    const seen = new Set(['0,0']), st = [[0, 0]];
    while (st.length) {
      const [i, j] = st[st.length - 1];
      const nb = DIRS.map(([di, dj]) => [i + di, j + dj, di, dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a + ',' + b));
      if (!nb.length) { st.pop(); continue; }
      const [a, b, di, dj] = nb[Math.floor(rng() * nb.length)];
      if (di === 1) E[i][j] = false; else if (di === -1) E[a][b] = false; else if (dj === 1) Sw[i][j] = false; else Sw[a][b] = false;
      seen.add(a + ',' + b); st.push([a, b]);
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (rng() < o.knock) E[i][j] = false; if (rng() < o.knock) Sw[i][j] = false; }
    for (const [ri, rj, w = 3, h = 3] of o.rooms || []) for (let i = ri; i < ri + w; i++) for (let j = rj; j < rj + h; j++) { if (i < ri + w - 1) E[i][j] = false; if (j < rj + h - 1) Sw[i][j] = false; }
    g.cx = (i) => X0 + (i + 0.5) * CS; g.cz = (j) => Z0 + (j + 0.5) * CS;
    g.cellOf = (x, z) => [U.clamp(Math.floor((x - X0) / CS), 0, N - 1), U.clamp(Math.floor((z - Z0) / CS), 0, N - 1)];
    g.inside = (x, y, z, pad = 1) => y < UG + 8 && x > X0 - pad && x < g.X1 + pad && z > Z0 - pad && z < g.Z1 + pad;
    g.setWall = (i, j, di, dj, v) => { if (di === 1) E[i][j] = v; else if (di === -1) E[i - 1][j] = v; else if (dj === 1) Sw[i][j] = v; else Sw[i][j - 1] = v; };
    g.prot = new Set(); g.sealed = new Set(); g.blocked = new Set();
    for (const [ri, rj, w, h] of o.sealed || []) for (let i = ri; i < ri + w; i++) for (let j = rj; j < rj + h; j++) {
      g.sealed.add(key(i, j)); g.prot.add(key(i, j));
      E[i][j] = i === ri + w - 1; Sw[i][j] = j === rj + h - 1; if (i === ri && i > 0) E[i - 1][j] = true; if (j === rj && j > 0) Sw[i][j - 1] = true;
    }
    if (o.custom) o.custom(g);
    g.open = (i, j, di, dj, avoid) => { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) return false; if (avoid && g.blocked.has(key(a, b))) return false; if (di === 1) return !E[i][j]; if (di === -1) return !E[a][b]; if (dj === 1) return !Sw[i][j]; return !Sw[a][b]; };
    g.bfs = (si, sj, avoid = true) => { const d = Array.from({ length: N }, () => Array(N).fill(-1)), q = [[si, sj]]; d[si][sj] = 0; while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of DIRS) if (g.open(i, j, di, dj, avoid) && d[i + di][j + dj] < 0) { d[i + di][j + dj] = d[i][j] + 1; q.push([i + di, j + dj]); } } return d; };
    const START = (g.START = o.start || [0, 0]);
    // every cell that isn't meant to be sealed off must be reachable
    const repair = () => { for (let it = 0; it < 800; it++) { const d = g.bfs(...START); let fixed = false;
      for (let i = 0; i < N && !fixed; i++) for (let j = 0; j < N && !fixed; j++) { if (d[i][j] >= 0 || g.sealed.has(key(i, j)) || g.blocked.has(key(i, j))) continue;
        for (const [di, dj] of DIRS) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N || d[a][b] < 0 || g.prot.has(key(i, j)) || g.prot.has(key(a, b))) continue; g.setWall(i, j, di, dj, false); fixed = true; break; } }
      if (!fixed) return; } };
    repair();
    // deep pools: only where they never cut anything off
    if (o.pools) { const cand = []; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (Math.abs(i - START[0]) + Math.abs(j - START[1]) > 2 && !g.prot.has(key(i, j))) cand.push([i, j, rng()]); cand.sort((a, b) => a[2] - b[2]);
      const reach = () => { const d = g.bfs(...START); let n = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (d[i][j] >= 0) n++; return n; };
      let want = reach() - 1; for (const [i, j] of cand) { if (g.blocked.size >= o.pools) break; const nb = g.blocked.size; g.blocked.add(key(i, j)); if (reach() < want - nb) g.blocked.delete(key(i, j)); } }
    const D0 = (g.D0 = g.bfs(...START)), ok = (i, j) => D0[i][j] >= 0 && !g.prot.has(key(i, j)) && !g.blocked.has(key(i, j));
    let far = START; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (ok(i, j) && (!o.edgeExit || i === 0 || j === 0 || i === N - 1 || j === N - 1) && D0[i][j] > D0[far[0]][far[1]]) far = [i, j];
    g.far = far; g.maxD = D0[far[0]][far[1]];
    g.used = [START, far];
    g.pick = (k) => { let best = null, bd = 1e9; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (!ok(i, j) || g.used.some(([a, b]) => a === i && b === j)) continue; const dd = Math.abs(D0[i][j] - g.maxD * k) + (g.used.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) < 3) ? 40 : 0) + ((i * 7 + j * 3) % 5) * 0.1; if (dd < bd) { bd = dd; best = [i, j]; } } g.used.push(best); return best; };
    g.at = ([i, j], ox = 0.6, oz = -0.4) => [g.cx(i) + ox, UG, g.cz(j) + oz];
    g.side = far[0] === N - 1 ? [1, 0] : far[0] === 0 ? [-1, 0] : far[1] === N - 1 ? [0, 1] : far[1] === 0 ? [0, -1] : [0, 1];
    // a walking route through the maze (cell centres) for scent vision
    g.route = (from, to) => { const [fi, fj] = g.cellOf(from[0], from[2]), [ti, tj] = g.cellOf(to[0], to[2]), d = g.bfs(ti, tj), pts = [from]; let i = fi, j = fj;
      if (d[i][j] < 0) return [from, to];
      for (let k = 0; k < 400 && d[i][j] > 0; k++) { let moved = false; for (const [di, dj] of DIRS) if (g.open(i, j, di, dj, true) && d[i + di][j + dj] === d[i][j] - 1) { i += di; j += dj; pts.push([g.cx(i), UG + 0.05, g.cz(j)]); moved = true; break; } if (!moved) break; }
      pts.push(to); return pts; };
    g.stepTo = (fi, fj, ti, tj) => { const d = g.bfs(ti, tj), path = []; let i = fi, j = fj; for (let k = 0; k < 80 && d[i][j] > 0; k++) { let moved = false; for (const [di, dj] of DIRS) if (g.open(i, j, di, dj, true) && d[i + di][j + dj] === d[i][j] - 1) { i += di; j += dj; path.push([i, j]); moved = true; break; } if (!moved) break; } return path; };
    return g;
  }

  /* ---------------------------------------------------------------- the five layouts */
  const G0 = mkGrid({ x0: 400, z0: 300, n: 14, cs: 4, seed: 4040, knock: 0.38, start: [1, 1], rooms: [[3, 9], [9, 3], [8, 10]], sealed: [[5, 5, 2, 2], [11, 0, 2, 2]],
    custom(g) { // a long hallway that goes nowhere: row 7, from column 6 to 12
      for (let i = 6; i <= 12; i++) { g.Sw[i][6] = true; g.Sw[i][7] = true; g.E[i][7] = i === 12; g.prot.add(key(i, 7)); }
      g.E[5][7] = false; g.deadEnd = [12, 7];
    } });
  const G1 = mkGrid({ x0: 480, z0: 300, n: 10, cs: 6, seed: 5151, knock: 0.5, rooms: [[2, 2, 3, 2], [6, 6, 3, 3]], edgeExit: true });
  const G2 = mkGrid({ x0: 560, z0: 300, n: 14, cs: 2.5, seed: 6262, knock: 0.07 });
  const G3 = mkGrid({ x0: 400, z0: 380, n: 10, cs: 5, seed: 7373, knock: 0.55, rooms: [[1, 5, 3, 3], [6, 1, 3, 3]], pools: 7, edgeExit: true });
  const G4 = mkGrid({ x0: 480, z0: 380, n: 10, cs: 5, seed: 8484, knock: 0.42, rooms: [[2, 6, 3, 3], [6, 2, 2, 3]], edgeExit: true });
  const GR = [G0, G1, G2, G3, G4];

  // goals, spares and notes for each level (cells picked along the walking distance from the start)
  const cells = (g, ks) => ks.map((k) => g.pick(k));
  const L0B = cells(G0, [0.3, 0.55, 0.8]), L1F = cells(G1, [0.25, 0.45, 0.65, 0.85]), L2V = cells(G2, [0.35, 0.6, 0.85]), L3D = cells(G3, [0.2, 0.4, 0.55, 0.7, 0.9]), L4B = cells(G4, [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]);
  const SPARE = GR.map((g) => cells(g, [0.12, 0.5, 0.72]));
  const NOTEC = GR.map((g) => cells(g, [0.38, 0.95]));
  // Pipe Dreams: steam vents sit on the way to the hatch
  const VENTS = (() => { const g = G2, path = g.stepTo(...g.START, ...g.far), out = []; for (let k = 3; k < path.length - 2 && out.length < 7; k += 4) { const c = path[k]; if (g.used.some(([a, b]) => a === c[0] && b === c[1])) continue; const prev = path[k - 1]; out.push({ c, dir: [prev[0] - c[0], prev[1] - c[1]], ph: out.length * 0.9 }); } return out; })();

  // exits sit against the outer wall of the far cell
  const exitAt = (g, inset) => [g.cx(g.far[0]) + g.side[0] * (g.CS / 2 - inset), UG, g.cz(g.far[1]) + g.side[1] * (g.CS / 2 - inset)];
  const EXIT = exitAt(G0, 0.3 / 2 + 0.05), EXIT_YAW = Math.atan2(-G0.side[0], -G0.side[1]);
  const LV = [
    { name: 'The Lobby', region: 'backrooms', g: G0, hgt: 3, fog: 0x8a7a3a, fogD: 0.055, hemi: 0.95, hc: 0xfff2b8, hg: 0x8a7a40 },
    { name: 'The Warehouse', region: 'br1', g: G1, hgt: 6, fog: 0x5c5c5e, fogD: 0.065, hemi: 0.55, hc: 0xd8c0a0, hg: 0x3a3632 },
    { name: 'Pipe Dreams', region: 'br2', g: G2, hgt: 2.4, fog: 0x07080a, fogD: 0.16, hemi: 0.05, hc: 0x506070, hg: 0x101010 },
    { name: 'The Poolrooms', region: 'br3', g: G3, hgt: 4, fog: 0xd8eef2, fogD: 0.03, hemi: 1.25, hc: 0xf4feff, hg: 0x9fd4e0 },
    { name: 'The Party That Never Ends', region: 'br4', g: G4, hgt: 3, fog: 0x8a7462, fogD: 0.05, hemi: 0.85, hc: 0xffe6c8, hg: 0x8a6a50 },
  ];
  LV.forEach((L, k) => { L.start = [L.g.cx(L.g.START[0]), UG, L.g.cz(L.g.START[1])]; L.k = k; });
  const P = (W.pts.backrooms = {
    start: LV[0].start, exit: EXIT, bottles: L0B.map((c) => G0.at(c)),
    fuses: L1F.map((c) => G1.at(c, 1.1, -0.9)), elev: exitAt(G1, 1.7),
    valves: L2V.map((c) => G2.at(c, 0, 0)), hatch: [G2.cx(G2.far[0]), UG, G2.cz(G2.far[1])],
    ducks: L3D.map((c) => G3.at(c, 0.9, 0.7)), ladder: exitAt(G3, 0.45),
    gold: L4B.map((c) => G4.at(c, 0, 0)), cake: exitAt(G4, 1.3), door: exitAt(G4, 0.2),
    clem1: G1.at(G1.START, 2.2, 1.4), clem3: G3.at(G3.START, 1.6, 1.4),
  });
  const levelAt = (x, y, z) => { for (let k = 0; k < LV.length; k++) if (LV[k].g.inside(x, y, z)) return k; return -1; };

  /* ================================================================ items, notes, steps */
  Object.assign(G.ITEMS, {
    almond: { name: 'Almond Water', desc: 'A plastic bottle of something sweet and cloudy. It smells like almonds and like... being okay. Found in a place that should not exist.', stack: true },
    almondx: { name: 'Spare Almond Water', desc: 'A little bottle of sweet almond water. When the hum gets too much, Milo takes a sip without even thinking about it.', stack: true },
    brfuse: { name: 'Glass Fuse', desc: 'A chunky old fuse with brass caps. The wire inside glows a little orange when you shake it.', stack: true, story: true },
    brduck: { name: 'Rubber Duck', desc: 'A squeaky yellow duck from the Poolrooms. It looks very pleased with itself.', stack: true, story: true },
  });
  G.CHAPTERS[CH] = ['Bonus Chapter IV', 'What Is This Place?']; G.ROMAN[CH] = '?';
  G.CATS.brnotes = 'Wanderer’s Notes';
  const NOTES = [
    ['Note 1: Hello?', 'If you can read this, hello! My name is Clementine. I am a hamster. I was running in my wheel and the wheel ran me somewhere else. The carpet here is damp. I do not recommend it.'],
    ['Note 2: The Hum', 'The lights hum all the time. I hummed back once. The lights did not like that. There is a room here with no door. I have walked all the way around it three times. Somebody is inside playing the radio.'],
    ['Note 3: Concrete', 'Found a staircase that went down forever and then stopped. Now it is all concrete and puddles and big wooden boxes. I have named the biggest box Gerald. Hello, Gerald.'],
    ['Note 4: Lights Out', 'When the lights go out: FREEZE. Be a statue. Be a very small furry statue. The eyes in the dark only notice you if you wiggle. I did not wiggle. I am very proud of myself.'],
    ['Note 5: Pipes', 'The pipes gurgle like a tummy. The steam comes out on a rhythm: hiss... hiss... hiss. Count it, then run through the quiet bit. I singed one whisker. It grew back.'],
    ['Note 6: The Static Friend', 'The fizzy tall thing is back down here. I don’t think it is mean. I think it is lonely and does not know how to say hello properly. Still, I say hello from VERY far away.'],
    ['Note 7: Swimming Pools', 'I found the best place! It is warm and bright and smells like summer holidays. Nothing chases you. The water is only toe deep, except the dark blue bits. Stay out of the dark blue bits.'],
    ['Note 8: Ducks', 'There are rubber ducks everywhere. I lined them up and gave them a speech. They listened very well. Ducks are good listeners. Better than Gerald.'],
    ['Note 9: A Party', 'Somebody is having a party but nobody came. The balloons smile at you and follow you around. Do not let them hug you. The golden ones are different: they are shy, and they go POP.'],
    ['Note 10: Home', 'I think every place leads to the next place, and the last place leads home. If you find home first, keep a light on for me. Love, Clementine. P.S. Hamsters like sunflower seeds. Just saying.'],
  ];
  NOTES.forEach(([name, desc], n) => { const L = Math.floor(n / 2), c = NOTEC[L][n % 2]; G.COLLECT.push({ id: 'brnote' + n, cat: 'brnotes', model: 'brnote', name, desc, pos: GR[L].at(c, -0.9, 0.9) }); });

  const got = (id) => has('got_' + id);
  const n0 = () => [0, 1, 2].filter((k) => got('p_br' + k)).length;
  const n1 = () => [0, 1, 2, 3].filter((k) => got('p_brf' + k)).length;
  const n2 = () => [0, 1, 2].filter((k) => has('brv' + k)).length;
  const n3 = () => [0, 1, 2, 3, 4].filter((k) => got('p_brd' + k)).length;
  const n4 = () => BR().pop.length;
  const nearestOf = (list, done) => { const p = game().player.pos; let best = null, bd = 1e9; list.forEach((b, k) => { if (done(k)) return; const d = (b[0] - p.x) ** 2 + (b[2] - p.z) ** 2; if (d < bd) { bd = d; best = b; } }); return best; };
  const T = (text, target) => ({ text, target });
  Object.assign(G.STEPS, {
    br_wake: T('Where... is this?', null),
    br_bottles: T(() => `Find something that smells sweet (almond water ${n0()}/3)`, () => nearestOf(P.bottles, (k) => got('p_br' + k))),
    br_exit: T('The EXIT sign is lit! Find the door', P.exit),
    br1_fuses: T(() => `Find fuses for the freight elevator (${n1()}/4)`, () => nearestOf(P.fuses, (k) => got('p_brf' + k))),
    br1_elev: T('Power the freight elevator and ride it down', P.elev),
    br2_valves: T(() => `Turn the valve wheels (${n2()}/3)`, () => nearestOf(P.valves, (k) => has('brv' + k))),
    br2_hatch: T('The hatch is open! Climb down', P.hatch),
    br3_ducks: T(() => `Collect the rubber ducks (${n3()}/5)`, () => nearestOf(P.ducks, (k) => got('p_brd' + k))),
    br3_ladder: T('Climb the ladder out of the Poolrooms', P.ladder),
    br4_gold: T(() => `Pounce on the golden balloons (${n4()}/6)`, () => nearestOf(P.gold, (k) => BR().pop.includes(k))),
    br4_home: T('The cake moved! Go through the doorway home', P.door),
  });
  const stepFor = (k) => [n0() >= 3 ? 'br_exit' : 'br_bottles', n1() >= 4 ? 'br1_elev' : 'br1_fuses', n2() >= 3 ? 'br2_hatch' : 'br2_valves', n3() >= 5 ? 'br3_ladder' : 'br3_ducks', n4() >= 6 ? 'br4_home' : 'br4_gold'][k];

  // pickups: the level goals and spare bottles (all only while in the Backrooms)
  const bottleMsg = ['A bottle of... almond water? It smells sweet. Like somebody left it here on purpose.', 'Another bottle. The sweet smell helps the humming feel further away.', 'The third bottle! And under the almond smell... wind. Real outside wind.'];
  for (let k = 0; k < 3; k++) G.PICKUPS.push({ id: 'p_br' + k, item: 'almond', model: 'almond', pos: P.bottles[k], when: () => inBR(), msg: bottleMsg[k] });
  for (let k = 0; k < 4; k++) G.PICKUPS.push({ id: 'p_brf' + k, item: 'brfuse', model: 'brfuse', pos: P.fuses[k], when: () => inBR(), msg: k === 3 ? 'The last fuse! Now to find that elevator.' : null });
  for (let k = 0; k < 5; k++) G.PICKUPS.push({ id: 'p_brd' + k, item: 'brduck', model: 'brduck', pos: P.ducks[k], when: () => inBR() });
  SPARE.forEach((cs, L) => cs.forEach((c, k) => G.PICKUPS.push({ id: `p_brs${L}_${k}`, item: 'almondx', model: 'almondx', pos: GR[L].at(c, -0.5, -0.8), when: () => inBR() })));

  const oMake = G.makeItem;
  G.makeItem = function (id) {
    const g = new THREE.Group();
    if (id === 'almond' || id === 'almondx') {
      const s = id === 'almondx' ? 0.8 : 1;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.13 * s, 12), M.std('almondBottle', { color: 0xf2ecd8, rough: 0.2, transparent: true, opacity: 0.85, emissive: 0x302818, ei: 0.3 })); b.position.y = 0.065 * s; g.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * s, 0.018 * s, 0.025 * s, 10), M.std(id === 'almondx' ? 'almondCapX' : 'almondCap', { color: id === 'almondx' ? 0x5fa05a : 0x3f6fa0, rough: 0.4 })); cap.position.y = 0.14 * s; g.add(cap);
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0355 * s, 0.0355 * s, 0.05 * s, 12, 1, true), M.std('almondLabel', { color: 0xd9c070, rough: 0.6 })); lab.position.y = 0.06 * s; g.add(lab);
      return g;
    }
    if (id === 'brfuse') {
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 12), M.std('brFuseGlass', { color: 0xfff0d0, rough: 0.1, transparent: true, opacity: 0.6, emissive: 0xff8a30, ei: 0.6 })); gl.rotation.z = Math.PI / 2; gl.position.y = 0.024; g.add(gl);
      for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12), M.get('brass')); c.rotation.z = Math.PI / 2; c.position.set(s * 0.055, 0.024, 0); g.add(c); }
      return g;
    }
    if (id === 'brduck') {
      const y = M.std('brDuckY', { color: 0xffd23a, rough: 0.35 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), y); b.scale.set(1, 0.8, 1.25); b.position.y = 0.04; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), y); h.position.set(0, 0.09, 0.035); g.add(h);
      const bk = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 8), M.std('brDuckB', { color: 0xff8a20, rough: 0.4 })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.085, 0.07); g.add(bk);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 4), M.color(0x111111, 0.3)); e.position.set(s * 0.014, 0.1, 0.058); g.add(e); }
      return g;
    }
    if (id === 'brnote') {
      const t = G.Tex.make('brNoteTex', 128, 128, (c, w, h, r) => { c.fillStyle = '#f4ecd2'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,50,120,.8)'; c.lineWidth = 2; for (let l = 0; l < 8; l++) { c.beginPath(); c.moveTo(12, 20 + l * 12); for (let x = 12; x < 116; x += 6) c.lineTo(x, 20 + l * 12 + (r() - 0.5) * 3); c.stroke(); } c.fillStyle = '#d98a3a'; c.beginPath(); c.arc(100, 110, 8, 0, 7); c.fill(); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = 0.4; m.position.y = 0.006; g.add(m);
      return g;
    }
    return oMake(id);
  };

  /* ================================================================ textures */
  const tex = {
    wall: () => G.Tex.make('brWallpaper', 256, 256, (g, w, h, r) => {
      g.fillStyle = '#c9b458'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(120,100,30,.18)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,240,160,.12)'; g.fillRect(x + 12, 0, 8, h); }
      g.fillStyle = 'rgba(110,90,30,.22)'; for (let y = 8; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 8); g.lineTo(x, y + 16); g.lineTo(x - 5, y + 8); g.closePath(); g.fill(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,70,20,${0.03 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 10 + r() * 40, 0, 0, 7); g.fill(); }
    }),
    carpet: () => G.Tex.make('brCarpet', 256, 256, (g, w, h, r) => {
      g.fillStyle = '#9a8a4a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const c = 110 + r() * 60; g.fillStyle = `rgba(${c},${c * 0.88},${c * 0.45},.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
      for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(60,50,20,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 22, 5 + r() * 16, r() * 3, 0, 7); g.fill(); }
    }),
    ceil: () => G.Tex.make('brCeiling', 128, 128, (g, w, h, r) => { g.fillStyle = '#d8d0a8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(120,110,80,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 1, 1); } g.strokeStyle = '#a89e78'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }),
    concrete: () => G.Tex.make('brConcrete', 256, 256, (g, w, h, r) => { g.fillStyle = '#8a8a86'; g.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { const c = 100 + r() * 70; g.fillStyle = `rgba(${c},${c},${c - 4},.35)`; g.fillRect(r() * w, r() * h, 2, 2); } for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(40,40,36,${0.04 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, 7); g.fill(); } g.strokeStyle = 'rgba(50,50,48,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }),
    crate: () => G.Tex.make('brCrate', 128, 128, (g, w, h, r) => { g.fillStyle = '#9a7448'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 21) { g.fillStyle = 'rgba(60,40,20,.35)'; g.fillRect(0, y, w, 2); } g.strokeStyle = '#5f4428'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.beginPath(); g.moveTo(8, 8); g.lineTo(w - 8, h - 8); g.stroke(); g.fillStyle = 'rgba(30,20,10,.55)'; g.font = 'bold 16px monospace'; g.fillText('FRAGILE?', 26, 72); }),
    pipeWall: () => G.Tex.make('brPipeWall', 256, 256, (g, w, h, r) => { g.fillStyle = '#3a3c3e'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = `rgb(${50 + r() * 14},${52 + r() * 12},${54 + r() * 10})`; g.fillRect(x + 2, y + 2, 60, 60); g.fillStyle = 'rgba(20,20,20,.6)'; for (const [a, b] of [[8, 8], [54, 8], [8, 54], [54, 54]]) g.fillRect(x + a, y + b, 3, 3); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(120,60,20,${0.05 + r() * 0.12})`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 10 + r() * 50); } }),
    grate: () => G.Tex.make('brGrate', 128, 128, (g, w, h) => { g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a4c4e'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 5, h); for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4); }),
    tile: () => G.Tex.make('brTile', 256, 256, (g, w, h, r) => { g.fillStyle = '#cfe0e2'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const c = 238 + r() * 14; g.fillStyle = `rgb(${c},${c + 2},${c + 3})`; g.fillRect(x + 2, y + 2, 29, 29); } }),
    party: () => G.Tex.make('brParty', 256, 256, (g, w, h, r) => { g.fillStyle = '#d9c3a0'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 42) { g.fillStyle = 'rgba(180,140,100,.25)'; g.fillRect(x, 0, 14, h); } for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(150,110,80,${0.1 + r() * 0.1})`; const x = r() * w, y = r() * h; g.beginPath(); g.ellipse(x, y, 6, 8, 0, 0, 7); g.fill(); g.fillRect(x - 0.5, y + 8, 1, 10); } }),
    partyCarpet: () => G.Tex.make('brPartyCarpet', 256, 256, (g, w, h, r) => { g.fillStyle = '#b08a6a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const c = 140 + r() * 50; g.fillStyle = `rgba(${c},${c * 0.78},${c * 0.6},.4)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); } const cols = ['#e8505b', '#f9d56e', '#5fb0e0', '#7fd07a', '#c07ae0', '#ff9a4a']; for (let i = 0; i < 260; i++) { g.fillStyle = cols[i % cols.length]; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 3); g.fillRect(-2.5, -1.5, 5, 3); g.restore(); } }),
    smile: () => G.Tex.make('brSmile', 128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#1a1a1a'; g.fillStyle = '#1a1a1a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(44, 50, 7, 0, 7); g.fill(); g.beginPath(); g.arc(84, 50, 7, 0, 7); g.fill(); g.beginPath(); g.arc(64, 62, 36, 0.25, Math.PI - 0.25); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(34, 88); g.lineTo(30, 80); g.moveTo(94, 88); g.lineTo(98, 80); g.stroke(); }),
    banner: () => G.Tex.make('brBanner', 512, 96, (g, w, h) => { const cols = ['#e8505b', '#f9d56e', '#5fb0e0', '#7fd07a', '#c07ae0']; const txt = 'HAPPY BIRTHDAY TO ??? '; g.clearRect(0, 0, w, h); for (let i = 0; i < txt.length; i++) { const x = 8 + i * 23; g.fillStyle = cols[i % cols.length]; g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 22, 6); g.lineTo(x + 11, 90); g.closePath(); g.fill(); g.fillStyle = '#2a1a10'; g.font = 'bold 18px Arial'; g.textAlign = 'center'; g.fillText(txt[i], x + 11, 36); } }),
  };

  /* ================================================================ build helpers */
  const O = [{}, {}, {}, {}, {}]; // per-level live objects
  const dyn = (o) => { o.userData.dynamic = true; o.traverse((c) => (c.userData.dynamic = true)); return o; };
  function shell(ctx, g, hgt, wallM, floorM, ceilM, o = {}) {
    const { H, root } = ctx, y = UG, X0 = g.x0, Z0 = g.z0, X1 = g.X1, Z1 = g.Z1, WT = o.wt || 0.3, segs = [];
    H.plane(X0, X1, Z0, Z1, y + 0.002, floorM, o.fs || 3);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), ceilM); ceil.rotation.x = Math.PI / 2; ceil.position.set((X0 + X1) / 2, y + hgt, (Z0 + Z1) / 2);
    { const uv = ceil.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (X1 - X0) / (o.cs || 1.2), uv.getY(i) * (Z1 - Z0) / (o.cs || 1.2)); } root.add(ceil);
    W.collider(X0, X1, Z0, Z1, y - 0.3, y, { cam: false }); W.collider(X0, X1, Z0, Z1, y + hgt, y + hgt + 0.4, { walk: false });
    for (const [x0, x1, z0, z1] of [[X0 - 1, X0, Z0 - 1, Z1 + 1], [X1, X1 + 1, Z0 - 1, Z1 + 1], [X0, X1, Z0 - 1, Z0], [X0, X1, Z1, Z1 + 1]]) W.collider(x0, x1, z0, z1, y - 1, y + hgt, { walk: false }); // outer walls also stop the camera
    for (const [x0, x1, z0, z1] of [[X0 - WT, X0, Z0, Z1], [X1, X1 + WT, Z0, Z1], [X0, X1, Z0 - WT, Z0], [X0, X1, Z1, Z1 + WT]]) H.box({ w: x1 - x0, h: hgt, d: z1 - z0, x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, mat: wallM, s: 2, col: false });
    for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) {
      if (g.E[i][j] && i < g.N - 1) { const s = { x: X0 + (i + 1) * g.CS, z: g.cz(j), w: WT, d: g.CS + WT, ax: 'z' }; H.box({ w: s.w, h: hgt, d: s.d, x: s.x, y, z: s.z, mat: wallM, s: 2 }); segs.push(s); }
      if (g.Sw[i][j] && j < g.N - 1) { const s = { x: g.cx(i), z: Z0 + (j + 1) * g.CS, w: g.CS + WT, d: WT, ax: 'x' }; H.box({ w: s.w, h: hgt, d: s.d, x: s.x, y, z: s.z, mat: wallM, s: 2 }); segs.push(s); }
    }
    return segs;
  }
  const reserved = (g) => new Set(g.used.map(([i, j]) => key(i, j)));
  // the static thing: a flickering, too-tall smudge with two pale lights for eyes
  function makeStatic(root, sc = 1) {
    const ent = dyn(new THREE.Group()); root.add(ent); ent.visible = false;
    const em = new THREE.MeshBasicMaterial({ color: 0x0c0a06, transparent: true, opacity: 0.82, depthWrite: false });
    const blobs = []; for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry((0.28 + (k % 3) * 0.08) * sc, 10, 8), em); b.position.set(0, (0.4 + k * 0.24) * sc, 0); ent.add(b); blobs.push(b); }
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045 * sc, 8, 6), eyeM); e.position.set(s * 0.12 * sc, 2.25 * sc, 0.26 * sc); ent.add(e); }
    dyn(ent); return { ent, blobs };
  }
  function lampPanels(ctx, g, hgt, lampM, deadM, o = {}) {
    const rng = U.rng(o.seed || 77), lights = [];
    for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) {
      if (g.sealed.has(key(i, j))) continue;
      const dead = (o.dead && o.dead(i, j)) || rng() < (o.deadP ?? 0.12), pm = new THREE.Mesh(new THREE.BoxGeometry(o.pw || 1.2, 0.04, o.pd || 0.6), dead ? deadM : lampM); pm.position.set(g.cx(i), UG + hgt - 0.03, g.cz(j)); ctx.root.add(pm);
      if (!dead && (i + j) % (o.every || 2) === 0) lights.push(ctx.H.light(g.cx(i), UG + hgt - 0.2, g.cz(j), o.col || 0xfff0c0, o.int || 0.9, o.dist || 7.5, { ug: true, flicker: rng() < 0.2 ? 0.25 : 0.02 }));
    }
    for (const L of lights) { L.int0 = L.int; L.f0 = L.flicker; }
    return lights;
  }
  const hazards3 = []; for (const k of G3.blocked) { const [i, j] = k.split(',').map(Number), m = 0.45; hazards3.push({ type: 'rect', x0: G3.x0 + i * G3.CS + m, x1: G3.x0 + (i + 1) * G3.CS - m, z0: G3.z0 + j * G3.CS + m, z1: G3.z0 + (j + 1) * G3.CS - m, y: UG + 0.05, name: 'deep pool' }); }

  /* ================================================================ Level 0: The Lobby */
  R.def({
    id: 'backrooms', ug: true, manual: true, name: 'Level 0', bounds: [G0.x0 - 2, G0.X1 + 2, G0.z0 - 2, G0.Z1 + 2],
    areas: [['brLevel0', 'Level 0 · The Lobby', G0.x0, G0.X1, G0.z0, G0.Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[G0.x0, G0.X1, G0.z0, G0.Z1]],
    build(ctx) {
      const { H, root } = ctx, y = UG, g = G0, HGT = LV[0].hgt, rng = U.rng(77), o = O[0];
      const wallM = M.std('brWall', { map: tex.wall(), color: 0xffffff, rough: 0.9 });
      const lampM = (o.lampM = M.std('brLamp', { color: 0xfffbe6, emissive: 0xfff2c0, ei: 1.6, rough: 0.5 })), deadM = M.std('brLampDead', { color: 0x8a8670, rough: 0.6 });
      shell(ctx, g, HGT, wallM, M.std('brCarpetM', { map: tex.carpet(), color: 0xffffff, rough: 1 }), M.std('brCeilM', { map: tex.ceil(), color: 0xffffff, rough: 1, side: THREE.DoubleSide }));
      const res = reserved(g);
      // lonely pillars
      for (let k = 0; k < 18; k++) { const i = Math.floor(rng() * (g.N - 1)), j = Math.floor(rng() * (g.N - 1)); if (Math.abs(i - g.START[0]) + Math.abs(j - g.START[1]) < 2 || res.has(key(i, j)) || g.prot.has(key(i, j)) || g.prot.has(key(i + 1, j + 1))) continue; H.box({ w: 0.6, h: HGT, d: 0.6, x: g.x0 + (i + 1) * g.CS, y, z: g.z0 + (j + 1) * g.CS, mat: wallM, s: 2 }); }
      // odd rooms: a pillar hall, a room with just one office chair, a room where every light is dead
      for (const [a, b] of [[10, 4], [11, 4], [10, 5], [11, 5]]) H.box({ w: 0.9, h: HGT, d: 0.9, x: g.x0 + a * g.CS, y, z: g.z0 + b * g.CS, mat: wallM, s: 2 });
      const chM = M.std('brChair', { color: 0x3a3a40, rough: 0.6 }), cx = g.cx(4), cz = g.cz(10);
      H.cyl({ r: 0.04, h: 0.45, x: cx, y, z: cz, mat: 'chrome' }); H.box({ w: 0.5, h: 0.08, d: 0.5, x: cx, y: y + 0.45, z: cz, mat: chM, col: false }); H.box({ w: 0.5, h: 0.55, d: 0.07, x: cx, y: y + 0.53, z: cz - 0.24, ry: 0, mat: chM, col: false }); W.collider(cx - 0.28, cx + 0.28, cz - 0.28, cz + 0.28, y, y + 0.53, { climb: true });
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; H.box({ w: 0.28, h: 0.03, d: 0.04, x: cx + Math.cos(a) * 0.14, y: y + 0.02, z: cz + Math.sin(a) * 0.14, ry: -a, mat: 'chrome', col: false }); }
      const darkRoom = (i, j) => i >= 8 && i <= 10 && j >= 10 && j <= 12;
      o.lights = lampPanels(ctx, g, HGT, lampM, deadM, { dead: (i, j) => darkRoom(i, j) && !(i === 9 && j === 11) });
      // the dead-end hallway: a door painted on the wall at the end
      const [di, dj] = g.deadEnd, dx = g.x0 + (di + 1) * g.CS - 0.16;
      const dT = G.Tex.make('brPaintedDoor', 128, 256, (c, w, h) => { c.fillStyle = '#c9b458'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a6a3a'; c.fillRect(14, 30, w - 28, h - 30); c.strokeStyle = '#5a4424'; c.lineWidth = 4; c.strokeRect(24, 44, w - 48, 80); c.strokeRect(24, 140, w - 48, 90); c.fillStyle = '#d9b64a'; c.beginPath(); c.arc(w - 30, 150, 7, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.25)'; c.font = 'italic 14px Georgia'; c.fillText('(paint)', 40, 250); });
      const pd = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshStandardMaterial({ map: dT, roughness: 0.9 })); pd.position.set(dx, y + 1.1, g.cz(dj)); pd.rotation.y = -Math.PI / 2; root.add(pd);
      // the exit: a grey metal door with a sign that lights up
      const door = dyn(new THREE.Group()); door.position.set(EXIT[0], y, EXIT[2]); door.rotation.y = EXIT_YAW; root.add(door); o.door = door;
      const dm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), M.std('brDoor', { color: 0x6a6e72, rough: 0.5, metal: 0.4 })); dm.position.y = 1.05; door.add(dm);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.get('brass')); kn.position.set(0.4, 1.0, 0.06); door.add(kn);
      const signT = G.Tex.make('brExitSign', 128, 48, (c, w, h) => { c.fillStyle = '#1a0e0e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4a3a'; c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.fillText('EXIT', w / 2, 36); });
      o.signM = new THREE.MeshStandardMaterial({ map: signT, emissive: 0xff3020, emissiveMap: signT, emissiveIntensity: 0, roughness: 0.4 });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), o.signM); sg.position.set(0, 2.35, 0.06); door.add(sg); dyn(door);
      o.exitLight = H.light(EXIT[0] - g.side[0] * 0.6, y + 2.2, EXIT[2] - g.side[1] * 0.6, 0xff5040, 0, 4, { ug: true });
      Object.assign(o, makeStatic(root));
    },
  });

  /* ================================================================ Level 1: The Warehouse */
  R.def({
    id: 'br1', ug: true, manual: true, name: 'Level 1', bounds: [G1.x0 - 2, G1.X1 + 2, G1.z0 - 2, G1.Z1 + 2],
    areas: [['brLevel1', 'Level 1 · The Warehouse', G1.x0, G1.X1, G1.z0, G1.Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[G1.x0, G1.X1, G1.z0, G1.Z1]],
    build(ctx) {
      const { H, root } = ctx, y = UG, g = G1, HGT = LV[1].hgt, rng = U.rng(515), o = O[1];
      const conc = M.std('brConcWall', { map: tex.concrete(), color: 0xd8d8d4, rough: 0.95 });
      shell(ctx, g, HGT, conc, M.std('brConcFloor', { map: tex.concrete(), color: 0x9a9a96, rough: 0.85 }), M.std('brConcCeil', { map: tex.concrete(), color: 0x404040, rough: 1, side: THREE.DoubleSide }), { fs: 4, cs: 6 });
      const res = reserved(g), crateM = M.std('brCrateM', { map: tex.crate(), color: 0xffffff, rough: 0.9 });
      const puddleM = M.std('brPuddle', { color: 0x202428, rough: 0.05, metal: 0.3, transparent: true, opacity: 0.75 });
      const beamM = M.std('brBeam', { color: 0x4a3a2a, rough: 0.7, metal: 0.3 });
      for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) {
        const cx = g.cx(i), cz = g.cz(j), k = key(i, j);
        // puddles
        for (let p = 0; p < 2; p++) if (rng() < 0.45) { const pm = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rng() * 0.9, 20), puddleM); pm.rotation.x = -Math.PI / 2; pm.scale.set(1, 0.5 + rng() * 0.6, 1); pm.position.set(cx + (rng() - 0.5) * 4, y + 0.006, cz + (rng() - 0.5) * 4); root.add(pm); }
        // crate stacks tucked into a corner (never where something important is)
        if (!res.has(k) && !(i === g.START[0] && j === g.START[1]) && rng() < 0.55) {
          const sx = rng() < 0.5 ? -1 : 1, sz = rng() < 0.5 ? -1 : 1, bx = cx + sx * 1.8, bz = cz + sz * 1.8, n = 1 + Math.floor(rng() * 3);
          for (let s = 0; s < n; s++) H.box({ w: 1.3, h: 1.3, d: 1.3, x: bx + (rng() - 0.5) * 0.15, y: y + s * 1.3, z: bz + (rng() - 0.5) * 0.15, ry: (rng() - 0.5) * 0.2, mat: crateM, s: 1.3 });
          if (rng() < 0.7) H.box({ w: 0.5, h: 0.5, d: 0.5, x: bx - sx * 1.05, y, z: bz, mat: crateM, s: 0.5, climb: true });
        }
        // hanging sodium lamps
        if ((i + j) % 2 === 0) { H.cyl({ r: 0.015, h: HGT - 4.4, x: cx, y: y + 4.4, z: cz, mat: 'darkmetal', cast: false }); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 12, 1, true), beamM); sh.position.set(cx, y + 4.45, cz); root.add(sh); }
      }
      o.lampM = M.std('brSodium', { color: 0xffd0a0, emissive: 0xff9a40, ei: 2, rough: 0.4 }); o.lights = [];
      for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) if ((i + j) % 2 === 0) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), o.lampM); b.position.set(g.cx(i), y + 4.3, g.cz(j)); root.add(b); const L = H.light(g.cx(i), y + 4.1, g.cz(j), 0xff9a40, 1.5, 12, { ug: true, flicker: 0.04 }); L.int0 = L.int; L.f0 = L.flicker; o.lights.push(L); }
      for (let i = 0; i < g.N; i += 2) H.box({ w: 0.3, h: 0.4, d: g.Z1 - g.z0, x: g.x0 + (i + 1) * g.CS, y: y + HGT - 0.4, z: (g.z0 + g.Z1) / 2, mat: beamM, col: false, cast: false });
      // the freight elevator: a caged platform against the outer wall, and a panel with four fuse lamps
      const [ex, , ez] = P.elev, sd = g.side, ry = Math.atan2(-sd[0], -sd[1]), el = dyn(new THREE.Group()); el.position.set(ex, y, ez); el.rotation.y = ry; root.add(el); o.elev = el;
      const stripe = G.Tex.make('brStripe', 64, 64, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; for (let x = -64; x < 64; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 8, 0); c.lineTo(x + 72, h); c.lineTo(x + 64, h); c.fill(); } });
      const plat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 2.8), [M.get('darkmetal'), M.get('darkmetal'), new THREE.MeshStandardMaterial({ map: tex.grate(), roughness: 0.6, metalness: 0.4 }), M.get('darkmetal'), new THREE.MeshStandardMaterial({ map: stripe }), M.get('darkmetal')]); plat.position.y = 0.05; el.add(plat);
      const cageM = new THREE.MeshStandardMaterial({ map: G.Tex.make('brMesh', 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#8a8c90'; c.lineWidth = 3; for (let x = -64; x < 128; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 64, h); c.moveTo(x + 64, 0); c.lineTo(x, h); c.stroke(); } }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
      cageM.map.wrapS = cageM.map.wrapT = THREE.RepeatWrapping; cageM.map.repeat.set(4, 5);
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.4), cageM); m.rotation.y = Math.PI / 2; m.position.set(s * 1.4, 1.75, 0); el.add(m); }
      const back = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.4), cageM); back.position.set(0, 1.75, -1.4); el.add(back);
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 2.9), M.get('darkmetal')); top.position.y = 3.5; el.add(top);
      for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 0.1), M.get('darkmetal')); p.position.set(a, 1.75, b); el.add(p); }
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1), M.std('brPanel', { color: 0x5a6068, rough: 0.5, metal: 0.4 })); panel.position.set(1.75, 0.85, 1.2); el.add(panel);
      o.fuseLamps = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x40ff60, emissiveIntensity: 0 })); m.position.set(1.62 + (k % 2) * 0.26, 1.0 - Math.floor(k / 2) * 0.26, 1.26); el.add(m); o.fuseLamps.push(m); }
      dyn(el);
      // colliders: the two cage sides and the back; the front is open
      const lx = (a, b) => [ex + Math.cos(ry) * a + Math.sin(ry) * b, ez - Math.sin(ry) * a + Math.cos(ry) * b];
      for (const [a0, b0, a1, b1] of [[-1.45, -1.45, -1.35, 1.45], [1.35, -1.45, 1.45, 1.45], [-1.45, -1.45, 1.45, -1.35]]) { const p = lx(a0, b0), q = lx(a1, b1); W.collider(Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1]), y, y + 3.5, { walk: false }); }
      o.elevLight = H.light(ex, y + 3, ez, 0x40ff60, 0, 5, { ug: true });
      // eyes in the dark (only during a blackout)
      const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }); o.eyes = [];
      for (let k = 0; k < 7; k++) { const e = dyn(new THREE.Group()); for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeM); m.scale.set(1.4, 0.7, 0.4); m.position.x = s * 0.1; e.add(m); } e.visible = false; root.add(dyn(e)); o.eyes.push(e); }
    },
  });

  /* ================================================================ Level 2: Pipe Dreams */
  R.def({
    id: 'br2', ug: true, manual: true, name: 'Level 2', bounds: [G2.x0 - 2, G2.X1 + 2, G2.z0 - 2, G2.Z1 + 2],
    areas: [['brLevel2', 'Level 2 · Pipe Dreams', G2.x0, G2.X1, G2.z0, G2.Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[G2.x0, G2.X1, G2.z0, G2.Z1]],
    build(ctx) {
      const { H, root } = ctx, y = UG, g = G2, HGT = LV[2].hgt, rng = U.rng(626), o = O[2];
      const wallM = M.std('brPipeWallM', { map: tex.pipeWall(), color: 0xffffff, rough: 0.8, metal: 0.2 });
      const segs = shell(ctx, g, HGT, wallM, new THREE.MeshStandardMaterial({ map: tex.grate(), roughness: 0.6, metalness: 0.5 }), M.std('brPipeCeil', { color: 0x151618, rough: 1, side: THREE.DoubleSide }), { wt: 0.24, fs: 1 });
      const cop = M.std('brCopper', { color: 0x9a5a34, rough: 0.45, metal: 0.7 }), gry = M.std('brPipeGrey', { color: 0x5a5e62, rough: 0.5, metal: 0.6 }), rust = M.std('brRust', { color: 0x6a3a22, rough: 0.9 });
      // pipes along every wall, both faces
      for (const s of segs) for (const f of [-1, 1]) for (const [hy, r, m] of [[0.42, 0.05, cop], [1.55, 0.08, gry]]) {
        if (rng() < 0.2) continue; const along = s.ax === 'x', len = along ? s.w : s.d, off = (along ? s.d : s.w) / 2 + r + 0.02;
        H.cyl({ r, h: len, x: s.x + (along ? 0 : f * off), y: y + hy, z: s.z + (along ? f * off : 0), mat: m, rz: along ? Math.PI / 2 : 0, rx: along ? 0 : Math.PI / 2, seg: 8, cast: false });
      }
      // big pipes overhead, rust stains
      for (let j = 0; j < g.N; j += 2) H.cyl({ r: 0.14, h: g.X1 - g.x0, x: (g.x0 + g.X1) / 2, y: y + HGT - 0.25, z: g.cz(j), rz: Math.PI / 2, mat: gry, seg: 10, cast: false });
      for (let k = 0; k < 40; k++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.2 + rng() * 0.4, 12), rust); p.rotation.x = -Math.PI / 2; p.position.set(g.x0 + rng() * (g.X1 - g.x0), y + 0.005, g.z0 + rng() * (g.Z1 - g.z0)); root.add(p); }
      // a few dim cage lamps
      o.lampM = M.std('brCageLamp', { color: 0xc8ffd0, emissive: 0x7fe09a, ei: 1.2 }); o.lights = [];
      for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) if ((i * 3 + j * 5) % 7 === 0) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), o.lampM); b.position.set(g.cx(i), y + HGT - 0.1, g.cz(j)); root.add(b); const L = H.light(g.cx(i), y + HGT - 0.3, g.cz(j), 0x7fe09a, 0.45, 3.6, { ug: true, flicker: 0.3 }); L.int0 = L.int; L.f0 = L.flicker; o.lights.push(L); }
      // steam vents
      o.vents = VENTS.map((v) => { const x = g.cx(v.c[0]), z = g.cz(v.c[1]); const gr = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.8), new THREE.MeshStandardMaterial({ map: tex.grate(), color: 0x886655, roughness: 0.5, metalness: 0.5 })); gr.position.set(x, y + 0.015, z); root.add(gr); return Object.assign({ x, z }, v); });
      // valve wheels on little risers
      o.wheels = P.valves.map(([x, , z]) => { H.cyl({ r: 0.06, h: 0.5, x, y, z, mat: gry, col: true }); const w = dyn(new THREE.Group()); w.position.set(x, y + 0.55, z); const red = M.std('brValveRed', { color: 0xc8322a, rough: 0.4, metal: 0.4 }); const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 20), red); t.rotation.x = Math.PI / 2; w.add(t); for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), red); s.rotation.y = k * Math.PI / 3; w.add(s); } root.add(dyn(w)); return w; });
      // the exit hatch in the floor
      const [hx, , hz] = P.hatch; for (const [a, b, w, d] of [[0, -0.6, 1.3, 0.1], [0, 0.6, 1.3, 0.1], [-0.6, 0, 0.1, 1.3], [0.6, 0, 0.1, 1.3]]) H.box({ w, h: 0.05, d, x: hx + a, y, z: hz + b, mat: gry, col: false });
      o.hole = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: 0x9fe8ff })); o.hole.rotation.x = -Math.PI / 2; o.hole.position.set(hx, y + 0.008, hz); o.hole.visible = false; root.add(dyn(o.hole));
      const piv = dyn(new THREE.Group()); piv.position.set(hx - 0.55, y + 0.03, hz); root.add(piv); o.lid = piv;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), M.std('brHatch', { color: 0x4a5a4a, rough: 0.5, metal: 0.5 })); lid.position.x = 0.55; piv.add(lid);
      const hw = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 18), M.get('brass')); hw.rotation.x = Math.PI / 2; hw.position.set(0.55, 0.04, 0); piv.add(hw); dyn(piv);
      o.hatchLight = H.light(hx, y + 1.2, hz, 0x9fe8ff, 0, 4, { ug: true });
      Object.assign(o, makeStatic(root, 0.85));
    },
  });

  /* ================================================================ Level 3: The Poolrooms */
  R.def({
    id: 'br3', ug: true, manual: true, name: 'Level 3', bounds: [G3.x0 - 2, G3.X1 + 2, G3.z0 - 2, G3.Z1 + 2],
    areas: [['brLevel3', 'Level 3 · The Poolrooms', G3.x0, G3.X1, G3.z0, G3.Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[G3.x0, G3.X1, G3.z0, G3.Z1]],
    hazards: hazards3,
    build(ctx) {
      const { H, root } = ctx, y = UG, g = G3, HGT = LV[3].hgt, rng = U.rng(737), o = O[3];
      const tileM = M.std('brTileM', { map: tex.tile(), color: 0xffffff, rough: 0.25 });
      shell(ctx, g, HGT, tileM, M.std('brTileFloor', { map: tex.tile(), color: 0xf4fbfc, rough: 0.15 }), M.std('brTileCeil', { map: tex.tile(), color: 0xe8eeef, rough: 0.6, side: THREE.DoubleSide }), { fs: 2, cs: 2 });
      // toe-deep water over everything, darker deep pools
      const shallow = new THREE.Mesh(new THREE.PlaneGeometry(g.X1 - g.x0, g.Z1 - g.z0), new THREE.MeshStandardMaterial({ color: 0x9fe0ee, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false })); shallow.rotation.x = -Math.PI / 2; shallow.position.set((g.x0 + g.X1) / 2, y + 0.035, (g.z0 + g.Z1) / 2); root.add(dyn(shallow)); o.water = shallow;
      const deepM = new THREE.MeshStandardMaterial({ color: 0x1f7fa8, transparent: true, opacity: 0.88, roughness: 0.05, metalness: 0.2 }), rimM = M.std('brPoolRim', { color: 0xf8ffff, rough: 0.3 });
      for (const h of hazards3) { const m = new THREE.Mesh(new THREE.PlaneGeometry(h.x1 - h.x0 + 0.3, h.z1 - h.z0 + 0.3), deepM); m.rotation.x = -Math.PI / 2; m.position.set((h.x0 + h.x1) / 2, y + 0.045, (h.z0 + h.z1) / 2); root.add(dyn(m));
        for (const [a, b, w, d] of [[(h.x0 + h.x1) / 2, h.z0 - 0.2, h.x1 - h.x0 + 0.5, 0.1], [(h.x0 + h.x1) / 2, h.z1 + 0.2, h.x1 - h.x0 + 0.5, 0.1], [h.x0 - 0.2, (h.z0 + h.z1) / 2, 0.1, h.z1 - h.z0 + 0.5], [h.x1 + 0.2, (h.z0 + h.z1) / 2, 0.1, h.z1 - h.z0 + 0.5]]) H.box({ w, h: 0.06, d, x: a, y, z: b, mat: rimM, col: false, cast: false });
        const lad = (h.x0 + h.x1) / 2; for (const s of [-0.2, 0.2]) H.cyl({ r: 0.025, h: 0.5, x: lad + s, y, z: h.z0 - 0.15, mat: 'chrome', col: false }); }
      const res = reserved(g);
      for (let i = 0; i < g.N - 1; i++) for (let j = 0; j < g.N - 1; j++) if (rng() < 0.3 && !g.blocked.has(key(i, j)) && !g.blocked.has(key(i + 1, j + 1))) H.box({ w: 0.7, h: HGT, d: 0.7, x: g.x0 + (i + 1) * g.CS, y, z: g.z0 + (j + 1) * g.CS, mat: tileM, s: 2 });
      o.lampM = M.std('brPoolLamp', { color: 0xffffff, emissive: 0xf4fcff, ei: 1.8 });
      o.lights = lampPanels(ctx, g, HGT, o.lampM, o.lampM, { deadP: 0, col: 0xf0fbff, int: 1.0, dist: 10, pw: 1, pd: 1, seed: 373 });
      // the ladder out: rungs up the wall to a hatch, and a little board with five duck lamps
      const [lx, , lz] = P.ladder, sd = g.side, grp = dyn(new THREE.Group()); grp.position.set(lx, y, lz); grp.rotation.y = Math.atan2(-sd[0], -sd[1]); root.add(grp);
      for (const s of [-0.3, 0.3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, HGT, 0.06), M.get('chrome')); r.position.set(s, HGT / 2, 0.1); grp.add(r); }
      for (let k = 0; k < 11; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), M.get('chrome')); r.rotation.z = Math.PI / 2; r.position.set(0, 0.3 + k * 0.34, 0.1); grp.add(r); }
      o.hatchM = new THREE.MeshStandardMaterial({ color: 0x8a9aa0, emissive: 0xfff2c0, emissiveIntensity: 0 }); const ht = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), o.hatchM); ht.position.set(0, HGT - 0.03, 0.45); grp.add(ht);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.05), M.std('brDuckBoard', { color: 0x2a6a8a, rough: 0.5 })); board.position.set(0, 1.3, 0.04); board.position.x = 0.95; grp.add(board);
      o.duckLamps = []; for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0x555544, emissive: 0xffd23a, emissiveIntensity: 0 })); m.position.set(0.55 + k * 0.2, 1.3, 0.09); grp.add(m); o.duckLamps.push(m); }
      dyn(grp); o.ladderLight = H.light(lx - sd[0] * 0.8, y + HGT - 0.6, lz - sd[1] * 0.8, 0xfff2c0, 0, 5, { ug: true });
      // floating inflatable ring, just because
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 10, 20), M.std('brRing', { color: 0xff6a5a, rough: 0.4 })); ring.rotation.x = Math.PI / 2; const h0 = hazards3[0]; if (h0) { ring.position.set((h0.x0 + h0.x1) / 2 + 0.4, y + 0.1, (h0.z0 + h0.z1) / 2); root.add(dyn(ring)); o.ring = ring; }
    },
  });

  /* ================================================================ Level 4: The Party That Never Ends */
  R.def({
    id: 'br4', ug: true, manual: true, name: 'Level 4', bounds: [G4.x0 - 2, G4.X1 + 2, G4.z0 - 2, G4.Z1 + 2],
    areas: [['brLevel4', 'Level 4 · The Party That Never Ends', G4.x0, G4.X1, G4.z0, G4.Z1, { ug: true, zone: 'backrooms', surf: 'dirt', dim: 0 }]],
    openUG: [[G4.x0, G4.X1, G4.z0, G4.Z1]],
    build(ctx) {
      const { H, root } = ctx, y = UG, g = G4, HGT = LV[4].hgt, rng = U.rng(848), o = O[4];
      const wallM = M.std('brPartyWall', { map: tex.party(), color: 0xffffff, rough: 0.9 });
      const segs = shell(ctx, g, HGT, wallM, M.std('brPartyFloor', { map: tex.partyCarpet(), color: 0xffffff, rough: 1 }), M.std('brPartyCeil', { map: tex.ceil(), color: 0xf0dcc0, rough: 1, side: THREE.DoubleSide }));
      const cols = [0xe8505b, 0xf9d56e, 0x5fb0e0, 0x7fd07a, 0xc07ae0, 0xff9a4a].map((c) => M.std('brStreamer' + c, { color: c, rough: 0.7 }));
      // streamers along the tops of the walls
      segs.forEach((s, n) => { for (const f of [-1, 1]) { const along = s.ax === 'x', off = (along ? s.d : s.w) / 2 + 0.012; for (let t = 0; t < 2; t++) H.box({ w: along ? s.w : 0.015, h: 0.07, d: along ? 0.015 : s.d, x: s.x + (along ? 0 : f * off), y: y + HGT - 0.3 - t * 0.12, z: s.z + (along ? f * off : 0), mat: cols[(n + t) % cols.length], col: false, cast: false }); } });
      o.lampM = M.std('brPartyLamp', { color: 0xfff4e0, emissive: 0xffe0b0, ei: 1.3 });
      o.lights = lampPanels(ctx, g, HGT, o.lampM, M.std('brLampDead', { color: 0x8a8670, rough: 0.6 }), { deadP: 0.08, col: 0xffe0b0, int: 0.95, seed: 484 });
      // cake tables, party hats, a banner
      const res = reserved(g), tabM = M.std('brTable', { color: 0xf4efe6, rough: 0.8 }), cakeM = M.std('brCakeM', { color: 0xfbe6f0, rough: 0.8 }), icing = M.std('brIcing', { color: 0xe8505b, rough: 0.6 });
      for (let i = 0; i < g.N; i++) for (let j = 0; j < g.N; j++) {
        if (res.has(key(i, j)) || (i === g.START[0] && j === g.START[1])) continue; const cx = g.cx(i) + 1.2, cz = g.cz(j) + 1.2;
        if (rng() < 0.22) { H.box({ w: 1.4, h: 0.06, d: 0.8, x: cx, y: y + 0.72, z: cz, mat: tabM, col: false }); for (const [a, b] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) H.box({ w: 0.05, h: 0.72, d: 0.05, x: cx + a, y, z: cz + b, mat: tabM, col: false }); W.collider(cx - 0.7, cx + 0.7, cz - 0.4, cz + 0.4, y + 0.72, y + 0.78, { cam: false });
          H.cyl({ r: 0.2, h: 0.14, x: cx - 0.2, y: y + 0.78, z: cz, mat: cakeM }); H.cyl({ r: 0.205, h: 0.03, x: cx - 0.2, y: y + 0.9, z: cz, mat: icing }); for (let c = 0; c < 3; c++) H.cyl({ r: 0.008, h: 0.08, x: cx - 0.25 + c * 0.05, y: y + 0.93, z: cz, mat: cols[c] }); }
        if (rng() < 0.35) { const hat = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 12), cols[Math.floor(rng() * cols.length)]); hat.position.set(g.cx(i) + (rng() - 0.5) * 3, y + 0.12, g.cz(j) + (rng() - 0.5) * 3); hat.rotation.z = rng() < 0.4 ? 1.4 : 0; root.add(hat); }
      }
      const bn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshStandardMaterial({ map: tex.banner(), transparent: true, side: THREE.DoubleSide })); bn.position.set(g.cx(g.START[0]) + 0.5, y + HGT - 0.7, g.z0 + 0.2); root.add(bn);
      // the doorway home, hidden behind a giant cake
      const [dx, , dz] = P.door, sd = g.side, yaw = Math.atan2(-sd[0], -sd[1]);
      o.doorM = new THREE.MeshBasicMaterial({ color: 0xf0a050 }); const dp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), o.doorM); dp.position.set(dx, y + 0.75, dz); dp.rotation.y = yaw; root.add(dyn(dp)); for (const [a, b2, w, h] of [[-0.5, 0.8, 0.1, 1.6], [0.5, 0.8, 0.1, 1.6], [0, 1.58, 1.1, 0.1]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), M.get('darkwood')); f.position.set(dx - sd[0] * 0.02 + Math.cos(yaw) * a, y + b2, dz - sd[1] * 0.02 - Math.sin(yaw) * a); f.rotation.y = yaw; root.add(f); }
      o.homeLight = H.light(dx - sd[0] * 0.5, y + 1, dz - sd[1] * 0.5, 0xffc880, 0, 5, { ug: true });
      const cake = dyn(new THREE.Group()); const [kx, , kz] = P.cake; cake.position.set(kx, y, kz); cake.rotation.y = yaw; root.add(cake); o.cake = cake; o.cake0 = [kx, kz];
      const tiers = [[1.0, 0.7, 0xfbe6f0], [0.75, 0.55, 0xf9f0d8], [0.5, 0.45, 0xfbe6f0]]; let ty = 0;
      for (const [r, h, c] of tiers) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), M.std('brBigCake' + c, { color: c, rough: 0.8 })); t.position.y = ty + h / 2; cake.add(t); const ic = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 28), icing); ic.rotation.x = Math.PI / 2; ic.position.y = ty + h; cake.add(ic); ty += h; }
      for (let c = 0; c < 6; c++) { const a = c / 6 * 6.28, cn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), cols[c]); cn.position.set(Math.cos(a) * 0.3, ty + 0.15, Math.sin(a) * 0.3); cake.add(cn); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc040 })); fl.scale.y = 1.6; fl.position.set(Math.cos(a) * 0.3, ty + 0.36, Math.sin(a) * 0.3); cake.add(fl); }
      dyn(cake); o.cakeCol = W.collider(kx - 0.85, kx + 0.85, kz - 0.85, kz + 0.85, y, y + 1.7, { walk: false });
      // golden balloons (shy, low, poppable) and smiling balloons (they follow you)
      const goldM = M.std('brGold', { color: 0xf2c440, rough: 0.2, metal: 0.6, emissive: 0x5a4010, ei: 0.4 }), strM = M.color(0xeeeeee, 0.8);
      o.golds = P.gold.map(([x, , z]) => { const b = dyn(new THREE.Group()); const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), goldM); s.scale.y = 1.2; b.add(s); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.35, 4), strM); st.position.y = -0.36; b.add(st); b.position.set(x, y + 0.5, z); root.add(dyn(b)); return b; });
      const faceM = new THREE.MeshBasicMaterial({ map: tex.smile(), transparent: true, depthWrite: false });
      o.smiles = [0xfff4f4, 0xf4f8ff, 0xfffbe8, 0xf6fff4].map((c) => { const b = dyn(new THREE.Group()); const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), M.std('brSmileB' + c, { color: c, rough: 0.35 })); s.scale.y = 1.15; b.add(s); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), faceM); f.position.z = 0.31; b.add(f); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.95, 4), strM); st.position.y = -0.8; b.add(st); b.visible = false; root.add(dyn(b)); return b; });
    },
  });

  /* ================================================================ the way in: a glitching patch of backyard fence */
  const GLITCH = [-8.6, 0, -27.55];
  let glitch = null;
  function makeGlitch(scene) {
    const t = G.Tex.make('brGlitch', 64, 64, (g, w, h, r) => { g.fillStyle = '#c9b458'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,250,200,.6)' : 'rgba(60,50,20,.5)'; g.fillRect(0, r() * h, w, 1 + r() * 3); } });
    glitch = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    glitch.position.set(GLITCH[0], 0.55, GLITCH[2] - 0.02); scene.add(glitch);
  }
  const glitchOn = () => ![7, 8, 9, CH].includes(S().chapter) && !G.SEQ.running;
  const resumeLvl = () => (BR().done ? 0 : BR().max || 0);
  G.INTERACT.push({ id: 'br_glitch', pos: [GLITCH[0], 0, GLITCH[2] + 0.5], r: 1.3, label: () => (has('brSeen') ? `Sniff the flickering fence (Level ${resumeLvl()})` : 'Sniff the flickering patch of fence'), anim: 'sniff', when: () => glitchOn() && S().chapter !== 1, act: () => start() });

  /* ================================================================ entering, leaving, resetting */
  const INTRO = [
    () => [['milo', '...Ow. Where...', 'sad'], ['milo', 'Yellow walls. Yellow carpet. Wet carpet. And a hum. A big, flat, buzzy hum, coming from everywhere at once.', 'surprised'], ['milo', 'This isn’t the backyard. This isn’t ANYWHERE. It smells like old carpet and... nothing. Nothing else at all.', 'think'], ['milo', 'Wait. Very faint, far away... something sweet. Like almonds. Follow your nose, Milo. And maybe... don’t stay in one place too long.', 'think']],
    () => [['milo', 'That door did NOT lead outside. Concrete floor. Puddles. Orange lamps way up high, buzzing like bees.', 'surprised'], ['milo', 'Somewhere far away, something big goes CLUNK. The lights just dipped for a second...', 'think'], ['milo', 'A painted arrow on the floor: FREIGHT ELEVATOR. And a scrawled sign: “NO POWER. 4 FUSES MISSING.” Of course.', 'think']],
    () => [['milo', 'The elevator creaked all the way down and stopped in... pipes. Pipes everywhere. Gurgling like a tummy.', 'surprised'], ['milo', 'It’s so dark. Good thing a little clip-on light fell off the elevator. I’ll wear it. Now I’m a ferret with a headlamp.', 'happy'], ['milo', 'The hatch on the map has three valve pictures next to it. Turn three valves, open the hatch. Easy. ...Hear that hiss? Not easy.', 'think']],
    () => [['milo', 'SPLASH! Oh! It’s... warm? And bright. And it smells like summer holidays and swimming lessons.', 'surprised'], ['milo', 'The hum is gone. Just drips, and echoes, and my own paws going plip, plop.', 'happy'], ['milo', 'The water is only toe deep. The dark blue bits look deep though. I will NOT be going in the dark blue bits.', 'think']],
    () => [['milo', 'Up the ladder and... streamers? Confetti? A cake? It’s a party! ...For nobody. Nobody is here.', 'surprised'], ['milo', 'Except the balloons. The white ones have faces drawn on. Big smiley faces. They’re all turning to look at me.', 'think'], ['milo', 'The golden ones look shy, though, bobbing low to the floor. A good pounce would pop them. Pouncing is my specialty.', 'happy']],
  ];
  function enterLevel(k, o = {}) {
    const g = game(), s = S(), b = BR(), L = LV[k]; g.busy = true;
    UI().fade(true, () => {
      R.build(R.byId[L.region]); g.cinematicEnd && g.cinematicEnd();
      s.chapter = CH; s.flags.brSeen = true; b.lvl = k; b.max = Math.max(b.max || 0, k); b.calm = 100;
      s.step = o.wake ? 'br_wake' : stepFor(k);
      g.applyWorldState(); g.placeNPCs && g.placeNPCs(); g.refreshItems && g.refreshItems();
      g.player.teleport(L.start[0], UG, L.start[2], Math.PI / 4); g.cam.snap = true; g.cam.yaw = Math.PI / 4 + Math.PI;
      if (o.wake && g.player.act) g.player.act('sleep', 1.6);
      resetThreats(k, true); syncVisuals(); A.setMood('quiet'); g.busy = false;
      setTimeout(() => { UI().fade(false); if (o.card) UI().chapterCard(CH); UI().updateObjective(true); g.autosave && g.autosave(); }, 500);
      if (!s.flags['brIntro' + k]) setTimeout(() => { s.flags['brIntro' + k] = true; g.say(INTRO[k](), () => { if (S().step === 'br_wake') { S().step = stepFor(0); } UI().updateObjective(true); g.autosave && g.autosave(); }); }, o.card ? 1900 : 1100);
      else if (o.wake) s.step = stepFor(0);
    });
  }
  function resetRun() {
    const s = S(), b = BR();
    for (const k in s.flags) if (/^got_p_br/.test(k) || /^brv\d$/.test(k)) delete s.flags[k];
    for (const it of ['almond', 'brfuse', 'brduck']) delete s.inv[it];
    b.max = 0; b.lvl = 0; b.pop = []; b.done = false; b.calm = 100; b.cakeMoved = false;
  }
  function start() {
    const g = game(), s = S();
    if (![7, 8, 9, CH].includes(s.chapter)) { s.brPrev = s.chapter; s.brPrevStep = s.step; }
    if (BR().done) resetRun();
    const first = !has('brSeen'), k = BR().max || 0;
    const go = () => enterLevel(k, { wake: k === 0 && !has('brIntro0'), card: true });
    if (first) g.say([['milo', 'This bit of fence is... flickering? Like a TV between channels. And it smells like damp carpet.', 'surprised'], ['milo', 'I’ll just have one little sniff...', 'think'], { do: () => { A.play('secret'); g.shake = 0.6; } }], go);
    else go();
  }
  function jump(k) { const s = S(); if (![7, 8, 9, CH].includes(s.chapter)) { s.brPrev = s.chapter; s.brPrevStep = s.step; } const b = BR(); b.done = false; b.max = Math.max(b.max || 0, k); s.flags['brIntro' + k] = s.flags['brIntro' + k] || false; enterLevel(k, { card: false }); }
  function finishHome() {
    const g = game(), s = S(), b = BR(); g.busy = true; A.play('door');
    UI().fade(true, () => {
      s.flags.brDone = true; b.done = true; b.calm = 100;
      s.chapter = s.brPrev && ![7, 8, 9, CH].includes(s.brPrev) ? s.brPrev : 6; s.step = s.chapter === 6 ? 'end' : s.brPrevStep || s.step;
      hideAll(); A.setMood(g.moodFor());
      g.applyWorldState(); g.placeNPCs && g.placeNPCs(); g.refreshItems && g.refreshItems();
      g.cinematicEnd && g.cinematicEnd(); g.player.teleport(-3, 0, -3.9, 0.4); g.cam.snap = true; g.busy = false;
      setTimeout(() => { UI().fade(false); UI().updateObjective(true); g.autosave && g.autosave();
        g.say([['milo', '*...My basket. My blanket. The house is making its normal house noises.*', 'surprised'], ['milo', '*Five levels. A warehouse, pipes, pools, a party with no guests... Was it a dream? It must have been a dream.*', 'think'], ['milo', '*...Then why is there confetti in my fur? And why does it smell like almonds?*', 'surprised'], ['milo', '*I hope Clementine finds her way home too. I’ll leave a sunflower seed by the fence. Just in case.*', 'happy']],
          () => UI().toast('<b>Bonus chapter complete</b>', null, `What Is This Place? · You found the way home. Wanderer’s Notes ${NOTES.filter((_, n) => S().collected['brnote' + n]).length}/10. The fence still flickers...`)); }, 700);
    });
  }
  // something sends Milo back to where this level began (goals kept)
  function resetToStart(title, sub, o = {}) {
    const g = game(), k = lvl(), L = LV[k], b = BR(); if (g.busy) return; g.busy = true; A.play('thud'); g.shake = 1;
    UI().fade(true, () => {
      g.player.teleport(L.start[0], UG, L.start[2], Math.PI / 4); g.cam.snap = true;
      if (o.clearPops) { b.pop = []; b.cakeMoved = false; }
      b.calm = Math.max(b.calm, 60); resetThreats(k, false); syncVisuals(); g.busy = false;
      setTimeout(() => UI().fade(false), 300); UI().toast(`<b>${title}</b>`, null, sub); UI().updateObjective(); g.autosave && g.autosave();
    });
  }

  /* ================================================================ interactions */
  const act = (id, pos, r, label, when, fn, anim) => G.INTERACT.push({ id, pos, r, label, when: () => inBR() && !G.SEQ.running && when(), act: fn, anim });
  // Level 0
  act('br_exit', [EXIT[0] - G0.side[0] * 0.5, UG, EXIT[2] - G0.side[1] * 0.5], 1.4, () => (S().step === 'br_exit' ? 'Push open the EXIT door' : 'Try the grey metal door'), () => lvl() === 0, () => {
    const g = game();
    if (S().step !== 'br_exit') return g.say([['milo', 'Locked. Or maybe not locked, just... not ready. The sign above it is dark.', 'think'], ['milo', 'I need to find more of that sweet smell first.', 'think']]);
    A.play('door'); g.say([['milo', 'The door handle is cold. Real cold. Outside cold. Here goes...', 'think']], () => { const s = S(); s.inv.almondx = (s.inv.almondx || 0) + (s.inv.almond || 0); delete s.inv.almond; enterLevel(1); });
  }, 'push');
  act('br_paintdoor', [G0.x0 + (G0.deadEnd[0] + 1) * G0.CS - 0.6, UG, G0.cz(G0.deadEnd[1])], 1.2, 'Try the door at the end of the hallway', () => lvl() === 0, () => game().say([['milo', 'A door! At the end of all that hallway! Finally!', 'happy'], ['milo', '...It’s painted on. Somebody painted a door on the wall. With a little painted doorknob. Why would anybody DO that?', 'surprised']]), 'push');
  act('br_sealed', [G0.x0 + 5 * G0.CS - 0.45, UG, G0.cz(5) + 0.5], 1.2, 'Listen at the wall', () => lvl() === 0, () => game().say([['milo', 'There’s no door into this room. I’ve been all the way around it. No door, no window, no vent.', 'think'], ['milo', 'But if I put my ear to the wallpaper... music? A tiny radio, playing a song very quietly. In a room nobody can get into.', 'surprised'], ['milo', 'Nope. Moving on. Moving on NOW.', 'sad']]), 'sniff');
  // Level 1
  act('br_elev', [P.elev[0], UG, P.elev[2]], 1.6, () => (n1() >= 4 ? 'Slot in the fuses and ride the elevator down' : 'Inspect the freight elevator'), () => lvl() === 1, () => {
    const g = game();
    if (n1() < 4) return g.say([['milo', `A caged platform and a panel with four empty fuse slots. ${n1()} of 4 found so far.`, 'think'], ['milo', 'The fuses must be somewhere in all these crates and puddles.', 'think']]);
    A.play('metal'); for (const f of O[1].fuseLamps || []) f.material.emissiveIntensity = 2.2; g.shake = 0.5;
    g.say([['milo', 'Click, click, click, CLICK. Four green lights! The whole cage shudders...', 'surprised'], { do: () => A.play('door') }, ['milo', 'Going down! Hold on to your whiskers, Milo.', 'happy']], () => { delete S().inv.brfuse; enterLevel(2); });
  }, 'push');
  // Level 2: valves and the hatch
  P.valves.forEach((v, k) => act('br_valve' + k, [v[0] + 0.35, UG, v[2]], 1.1, () => (has('brv' + k) ? 'The valve is open' : 'Turn the valve wheel'), () => lvl() === 2, () => {
    const g = game(); if (has('brv' + k)) return g.say([['milo', 'Already turned. It’s gurgling happily now.', 'happy']]);
    g.flag('brv' + k); A.play('metal'); const w = O[2].wheels && O[2].wheels[k]; if (w && g.tween) g.tween(1.2, (t) => { w.rotation.y = t * Math.PI * 3; });
    setTimeout(() => A.play('push'), 400); UI().toast('<b>Squeak... squeak... CLUNK</b>', null, `Valve ${n2()} of 3 turned. Somewhere, a pipe stops hissing.`); UI().updateObjective(); g.autosave();
  }, 'push'));
  act('br_hatch', [P.hatch[0], UG, P.hatch[2]], 1.2, () => (n2() >= 3 ? 'Climb down the hatch' : 'Inspect the floor hatch'), () => lvl() === 2, () => {
    const g = game(); if (n2() < 3) return g.say([['milo', `A round hatch in the floor, locked tight. Three little pictures of valve wheels are painted on it, ${n2()} of them glowing.`, 'think']]);
    g.say([['milo', 'Down I go. Something below smells like... chlorine? And sunscreen?', 'surprised']], () => { A.play('splash'); enterLevel(3); });
  }, 'push');
  // Level 3
  act('br_ladder', [P.ladder[0] - G3.side[0] * 0.5, UG, P.ladder[2] - G3.side[1] * 0.5], 1.3, () => (n3() >= 5 ? 'Climb the ladder' : 'Inspect the ladder'), () => lvl() === 3, () => {
    const g = game(); if (n3() < 5) return g.say([['milo', `The hatch at the top is shut. The board next to it has five duck-shaped lights, and ${n3()} of them are lit.`, 'think'], ['milo', 'More ducks, then. Quack.', 'happy']]);
    g.say([['milo', 'Five ducks, five lights, one open hatch. Bye, pools. I’ll miss you most of all.', 'happy']], () => { delete S().inv.brduck; A.play('door'); enterLevel(4); });
  }, 'push');
  // Level 4: pounce on golden balloons; then the doorway home
  P.gold.forEach((p, k) => act('br_gold' + k, [p[0], UG, p[2]], 1.0, 'Pounce on the golden balloon!', () => lvl() === 4 && !BR().pop.includes(k), () => {
    const pl = game().player; if (!pl.grounded) return; const dx = p[0] - pl.pos.x, dz = p[2] - pl.pos.z, l = Math.hypot(dx, dz) || 1;
    pl.yaw = Math.atan2(dx, dz); pl.vy = 4.8; pl.grounded = false; pl.vel.x = (dx / l) * Math.min(2.5, l * 3); pl.vel.z = (dz / l) * Math.min(2.5, l * 3); A.play('jump');
  }));
  act('br_home', [P.door[0] - G4.side[0] * 0.5, UG, P.door[2] - G4.side[1] * 0.5], 1.3, 'Go through the warm doorway (home!)', () => lvl() === 4 && S().step === 'br4_home' && !!BR().cakeMoved, () => game().say([['milo', 'Behind the cake: a little doorway, and on the other side... my blanket smell. Mum’s shampoo. Ellie’s crayons. HOME.', 'happy']], () => finishHome()), 'push');

  /* ---------------------------------------------------------------- Clementine */
  G.NPC.add({ id: 'clementine', name: 'Clementine', kind: 'mouse', look: { scale: 1.7, color: 0xe0a060, belly: 0xfbeedd }, r: 0.9, sound: 'squeak', yaw: Math.PI,
    pos: () => (!inBR() ? null : lvl() === 1 ? P.clem1 : lvl() === 3 ? P.clem3 : null), when: () => inBR() && (lvl() === 1 || lvl() === 3),
    lines: () => clemLines() });
  function clemLines() {
    const g = game(), k = lvl(), first = !has('brClem' + k); g.flag('brClem' + k);
    const notes = NOTES.filter((_, n) => S().collected['brnote' + n]).length;
    if (k === 1) {
      if (first && !has('brClem3')) return [['clementine', 'EEP! Oh! Oh, a ferret! A small ferret! A friendly-looking small ferret?', 'surprised'], ['milo', 'Very friendly. I’m Milo. Who are you? What IS this place?', 'happy'],
        ['clementine', 'I’m Clementine! I was running in my wheel and the wheel ran me right out of the world. I’ve been exploring ever since. I leave notes, so the next lost one knows what I know.', 'happy'],
        ['clementine', 'Important tip! Every so often the lights go out here. When they flicker, FREEZE. Don’t move a whisker until they come back. The eyes in the dark only notice wigglers.', 'think'],
        ['clementine', 'The elevator needs four fuses. They roll into corners and puddles. And drink your almond water when your tummy feels wobbly. It helps!', 'happy'], ['milo', 'Freeze in the dark, find the fuses, sip when wobbly. Got it. Thank you, Clementine!', 'happy']];
      if (n1() < 4) return [['clementine', `Fuses: ${n1()} of 4. Use your nose! Big sniff! (That’s Q, I think. Ferrets have a Q.)`, 'happy'], ['clementine', 'And remember: lights flicker, you freeze.', 'think']];
      return [['clementine', 'All four! The elevator is at the far wall. I’ll catch you up. Hamsters take the stairs. Very slowly.', 'happy']];
    }
    if (first) return [['clementine', has('brClem1') ? 'MILO! You made it! Isn’t it lovely here? Warm water, nice echoes, and NOTHING chasing anybody.' : 'Oh, hello! A ferret! Don’t worry, nothing chases anyone here. I’m Clementine. I’m lost, but in a nice way right now.', 'happy'],
      ['clementine', 'This is the place to catch your breath. Just walking around here makes you feel calmer. I can feel my whiskers un-frizzing.', 'happy'],
      ['clementine', 'The ladder out needs five rubber ducks. And stay out of the dark blue water: it’s much deeper than it looks. Toe-deep is fine!', 'think'],
      ['clementine', `You’ve found ${notes} of my notes, by the way. I’m so glad somebody is reading them.`, 'shy']];
    if (n3() < 5) return [['clementine', `${n3()} ducks so far. I like to think they’re having a meeting somewhere and forgot to invite us.`, 'happy']];
    return [['clementine', 'Five ducks! Up the ladder you go. I’ll stay a little longer. It’s nice here. Leave a light on for me, wherever home is.', 'happy']];
  }

  /* ================================================================ threats */
  const RT = { ent: null, bo: null, vents: [], push: null, balloons: [], hum: 0, amb: 0, drink: 0, gold: 0 };
  function resetThreats(k, first) {
    const g = game(); RT.push = null;
    // the static thing (Level 0 and Level 2)
    RT.ent = null; for (const o of O) if (o.ent) o.ent.visible = false;
    if ((k === 0 || k === 2) && O[k].ent) {
      const gr = LV[k].g, L = LV[k], [pi, pj] = gr.cellOf(L.start[0], L.start[2]), d = gr.bfs(pi, pj); let best = gr.far, bd = -1;
      for (let i = 0; i < gr.N; i++) for (let j = 0; j < gr.N; j++) { const v = d[i][j] + ((i * 13 + j * 7) % 4); if (d[i][j] > 7 && d[i][j] < 18 && v > bd) { bd = v; best = [i, j]; } }
      RT.ent = { k, g: gr, i: best[0], j: best[1], path: [], repath: 0, cool: first ? (k === 0 ? 25 : 18) : 12, speed: k === 0 ? 2.35 : 1.9, shown: false };
      O[k].ent.position.set(gr.cx(best[0]), UG, gr.cz(best[1]));
    }
    // blackouts (Level 1)
    RT.bo = k === 1 ? { t: first ? -5 : 0, phase: 'calm', p0: null } : null; setDark(false);
    // smiling balloons (Level 4)
    RT.balloons = [];
    if (k === 4 && O[4].smiles) { const gr = G4, d = gr.bfs(...gr.START); const spots = []; for (let i = 0; i < gr.N; i++) for (let j = 0; j < gr.N; j++) if (d[i][j] >= 6 && d[i][j] <= 13) spots.push([i, j, (i * 31 + j * 17) % 11]); spots.sort((a, b) => a[2] - b[2]);
      O[4].smiles.forEach((m, n) => { const c = spots[(n * 3) % Math.max(1, spots.length)] || gr.far; RT.balloons.push({ m, i: c[0], j: c[1], path: [], repath: n * 0.2, x: gr.cx(c[0]), z: gr.cz(c[1]), ph: n * 1.7 }); m.position.set(gr.cx(c[0]), UG + 1, gr.cz(c[1])); m.visible = true; }); RT.bcool = first ? 6 : 4; }
    else if (O[4].smiles) O[4].smiles.forEach((m) => (m.visible = false));
    if (g && g.player) g.player.vel.set(0, 0, 0);
  }
  function hideAll() { resetThreats(-1, true); for (const o of O) if (o.eyes) o.eyes.forEach((e) => (e.visible = false)); }
  function setDark(on) {
    const o = O[1]; if (!o.lights) return;
    for (const L of o.lights) { L.int = on ? 0 : L.int0; L.flicker = L.f0; }
    if (o.lampM) o.lampM.emissiveIntensity = on ? 0 : 2;
    if (o.eyes) o.eyes.forEach((e) => (e.visible = false));
  }
  function placeEyes() {
    const p = game().player.pos, o = O[1], gr = G1;
    o.eyes.forEach((e, n) => { const a = (n / o.eyes.length) * 6.28 + Math.random() * 0.6, d = 3.5 + Math.random() * 4; const x = U.clamp(p.x + Math.cos(a) * d, gr.x0 + 0.5, gr.X1 - 0.5), z = U.clamp(p.z + Math.sin(a) * d, gr.z0 + 0.5, gr.Z1 - 0.5); e.position.set(x, UG + 0.3 + Math.random() * 1.4, z); e.lookAt(p.x, UG + 0.3, p.z); e.visible = true; e.userData.blink = Math.random() * 3; });
  }
  function syncVisuals() {
    const k = lvl(), s = S(), b = BR();
    if (O[0].signM) { const on = inBR() && k === 0 && s.step === 'br_exit'; O[0].signM.emissiveIntensity = on ? 2.2 : 0; if (O[0].exitLight) O[0].exitLight.int = on ? 1.4 : 0; }
    if (O[1].fuseLamps) { O[1].fuseLamps.forEach((m, n) => (m.material.emissiveIntensity = n < n1() ? 1.6 : 0)); if (O[1].elevLight) O[1].elevLight.int = n1() >= 4 ? 1.2 : 0; }
    if (O[2].wheels) { O[2].wheels.forEach((w, n) => (w.rotation.y = has('brv' + n) ? Math.PI * 3 : 0)); const open = n2() >= 3; O[2].lid.rotation.z = open ? 1.9 : 0; O[2].hole.visible = open; if (O[2].hatchLight) O[2].hatchLight.int = open ? 1.2 : 0; }
    if (O[3].duckLamps) { O[3].duckLamps.forEach((m, n) => { const on = n < n3(); m.material.emissiveIntensity = on ? 0.9 : 0; m.material.color.setHex(on ? 0xffc820 : 0x555544); }); const on = n3() >= 5; O[3].hatchM.emissiveIntensity = on ? 1.6 : 0; if (O[3].ladderLight) O[3].ladderLight.int = on ? 1.3 : 0; }
    if (O[4].golds) {
      O[4].golds.forEach((m, n) => (m.visible = !b.pop.includes(n)));
      const moved = !!b.cakeMoved && n4() >= 6, sd = G4.side, [kx, kz] = O[4].cake0, off = moved ? 1.4 : 0;
      O[4].cake.position.set(kx + sd[1] * off, UG, kz - sd[0] * off); O[4].cakeCol.on = !moved; if (O[4].homeLight) O[4].homeLight.int = moved ? 1.4 : 0;
    }
  }

  /* ================================================================ the Calm meter */
  const css = document.createElement('style');
  css.textContent = `#brCalm{position:absolute;left:16px;top:calc(76px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:8px;padding:6px 12px 6px 10px;border-radius:18px;background:var(--glass,rgba(20,20,20,.5));color:#f4ecd8;font:600 13px 'Atkinson Hyperlegible',system-ui,sans-serif;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none;transition:opacity .4s}
#brCalm[hidden]{display:none}
#brCalm i{position:relative;display:block;width:120px;height:10px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}
#brCalm i b{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,#7fd0c0,#b8f0d8);transition:width .3s,background .3s}
#brCalm.low i b{background:linear-gradient(90deg,#e8905b,#f2c46a);animation:brPulse .8s infinite alternate}
#brCalm.fill i b{background:linear-gradient(90deg,#7fc8ff,#d6f4ff)}
#brCalm em{font-style:normal;opacity:.85;font-size:12px}
@keyframes brPulse{to{opacity:.55}}`;
  document.head.appendChild(css);
  let calmEl = null;
  function calmUI() {
    if (!calmEl) { const hud = document.getElementById('hud'); if (!hud) return; calmEl = document.createElement('div'); calmEl.id = 'brCalm'; calmEl.hidden = true; calmEl.innerHTML = '<span>Calm</span><i><b></b></i><em></em>'; calmEl.title = 'Calm: drains near danger. Spare almond water is drunk automatically when it runs low.'; hud.appendChild(calmEl); }
    const g = game(), show = inBR() && g.state === 'play'; calmEl.hidden = !show; if (!show) return;
    const b = BR(); calmEl.querySelector('b').style.width = U.clamp(b.calm, 0, 100) + '%'; calmEl.classList.toggle('low', b.calm < 30); calmEl.classList.toggle('fill', lvl() === 3);
    calmEl.querySelector('em').textContent = `almond water × ${S().inv.almondx || 0}`;
  }
  function tickCalm(dt, threat) {
    const g = game(), s = S(), b = BR();
    b.calm = U.clamp(b.calm + (lvl() === 3 ? 4 : -(0.45 + threat)) * dt, 0, 100);
    RT.drink -= dt;
    if (b.calm < 30 && (s.inv.almondx || 0) > 0 && RT.drink <= 0) { RT.drink = 2; g.take('almondx'); b.calm = Math.min(100, b.calm + 45); A.play('pickup'); UI().toast('<b>Glug glug...</b>', null, `Milo sips some almond water. Much better. (${s.inv.almondx || 0} left)`); g.particles && g.particles.burst(V3(g.player.pos.x, g.player.pos.y + 0.2, g.player.pos.z), 12, 0xfff2c0, 'spark'); }
    if (b.calm <= 0) { b.calm = 60; resetToStart('Too much!', 'Milo got all panicky, curled up into a ball... and woke up back at the start of the level. Deep breaths.', { clearPops: lvl() === 4 }); }
  }

  /* ================================================================ per-frame */
  let lamp = null;
  const oUpd = EXT.update;
  EXT.update = function (dt, st) {
    oUpd(dt, st);
    const g = game(); if (!g || !g.player) return;
    if (!glitch && g.scene) makeGlitch(g.scene);
    if (glitch) { const on = glitchOn() && S().chapter !== 1; glitch.visible = on; if (on) { const d = Math.hypot(g.player.pos.x - GLITCH[0], g.player.pos.z - GLITCH[2]); glitch.material.opacity = (Math.random() < 0.15 ? 0.9 : 0.25) * U.clamp(1.4 - d / 10, 0.15, 1); glitch.material.map.offset.y = Math.random(); } }
    if (!lamp && g.scene) { lamp = new THREE.PointLight(0xffd9a0, 0, 5.5, 2); g.scene.add(lamp); }
    calmUI();
    if (!inBR()) { if (RT.ent || RT.bo || RT.balloons.length) hideAll(); if (lamp) lamp.intensity = 0; return; }
    const p = g.player.pos, k = lvl(), L = LV[k], inside = L.g.inside(p.x, p.y, p.z);
    // each level's look
    if (inside && g.scene.fog) { const dark = RT.bo && RT.bo.phase === 'dark'; g.scene.fog.color.setHex(dark ? 0x000000 : L.fog); g.scene.fog.density = dark ? 0.3 : L.fogD; g.hemi.intensity = dark ? 0.015 : L.hemi; g.hemi.color.setHex(L.hc); g.hemi.groundColor.setHex(L.hg); if (dark) { g.glow.intensity = 0; g.flash.intensity = 0; } else if (k === 2) g.glow.intensity = 0.25; }
    if (lamp) { lamp.intensity = inside && k === 2 ? 1.5 : 0; lamp.position.set(p.x, p.y + 0.45, p.z); }
    if (st !== 'play' || !inside) return;
    ambience(dt, k);
    const talking = UI().dialogueOpen || g.busy;
    progress(g);
    if (talking) return;
    let threat = 0;
    if (RT.ent) threat += tickEntity(dt, g);
    if (k === 1 && RT.bo) threat += tickBlackout(dt, g);
    if (k === 2) tickVents(dt, g);
    if (k === 4) threat += tickParty(dt, g);
    if (k === 3) { RT.drip = (RT.drip || 0) - dt; if (g.player.speedH > 0.3 && RT.drip <= 0) { RT.drip = 0.32; A.play('step-water', 0.5); } if (O[3].ring) O[3].ring.position.y = UG + 0.08 + Math.sin(g.t * 1.5) * 0.015; }
    if (!g.busy) tickCalm(dt, threat);
  };
  // goals completing
  function progress(g) {
    if (UI().dialogueOpen || g.busy) return;
    const s = S();
    if (s.step === 'br_bottles' && n0() >= 3) { s.step = 'br_exit'; syncVisuals(); UI().updateObjective(true); A.play('secret'); g.say([['milo', 'Three bottles... and now I can smell it properly. WIND. Real wind, and grass, and far-away rain.', 'surprised'], ['milo', 'Somewhere in these halls there’s a way out. And... something just switched a sign on. I can see a red glow.', 'think']]); }
    else if (s.step === 'br1_fuses' && n1() >= 4) { s.step = 'br1_elev'; syncVisuals(); UI().updateObjective(true); A.play('secret'); g.say([['milo', 'Four fuses, all glowing a little orange. Now: the freight elevator. The arrows on the floor point to the far wall.', 'happy']]); }
    else if (s.step === 'br2_valves' && n2() >= 3) { s.step = 'br2_hatch'; A.play('secret'); g.shake = 0.8; if (g.tween) { const lid = O[2].lid; g.tween(1.2, (t) => (lid.rotation.z = 1.9 * t)); } setTimeout(syncVisuals, 1250); UI().updateObjective(true); g.say([['milo', 'CLANG! Far away, a heavy hatch just swung open. And the air smells... clean. Like a swimming pool.', 'surprised']]); }
    else if (s.step === 'br3_ducks' && n3() >= 5) { s.step = 'br3_ladder'; syncVisuals(); UI().updateObjective(true); A.play('secret'); g.say([['milo', 'Five ducks! Quack quack quack quack QUACK. Somewhere a hatch clicks open, and a warm light comes on at the top of a ladder.', 'happy']]); }
    else if (s.step === 'br4_gold' && n4() >= 6) { s.step = 'br4_home'; A.play('secret'); UI().updateObjective(true); cakeSlide(g); }
    else if (s.step === 'br4_home' && !BR().cakeMoved) { BR().cakeMoved = true; syncVisuals(); }
  }
  function cakeSlide(g) {
    const b = BR(); g.busy = true; const cake = O[4].cake, [kx, kz] = O[4].cake0, sd = G4.side; A.play('push'); g.shake = 0.6;
    const cam = V3(P.cake[0] - sd[0] * 4.5 + sd[1] * 1.5, UG + 2.4, P.cake[2] - sd[1] * 4.5 - sd[0] * 1.5); if (g.cinematic) g.cinematic({ pos: cam, look: V3(P.cake[0], UG + 0.8, P.cake[2]), dur: 3.2 });
    const t0 = performance.now(), tick = () => { const t = Math.min(1, (performance.now() - t0) / 2200), e = t * t * (3 - 2 * t); cake.position.set(kx + sd[1] * 1.4 * e, UG, kz - sd[0] * 1.4 * e); if (t < 1) requestAnimationFrame(tick); else { b.cakeMoved = true; syncVisuals(); g.busy = false; g.say([['milo', 'The giant cake is SLIDING... all by itself! And behind it: a little doorway, glowing warm and orange like a kitchen at teatime.', 'surprised'], ['milo', 'That smell... that’s HOME.', 'happy']]); } };
    tick();
  }
  // the static thing walks the halls toward Milo
  function tickEntity(dt, g) {
    const E = RT.ent, o = O[E.k], p = g.player.pos, gr = E.g; if (!o.ent) return 0;
    if (E.cool > 0) { E.cool -= dt; o.ent.visible = false; return 0; }
    if (!E.shown) { E.shown = true; A.play('thud', 0.3); if (!has('brEntTip' + E.k)) { g.flag('brEntTip' + E.k); UI().toast(E.k === 0 ? '<b>The hum just got louder.</b>' : '<b>The fizzy static is back.</b>', null, E.k === 0 ? 'Something is walking the halls. Keep moving. Run (Shift) if the lights start to flicker.' : 'It’s a little slower down here. Keep your light pointed ahead and keep moving.'); } }
    const [pi, pj] = gr.cellOf(p.x, p.z); E.repath -= dt;
    if (E.repath <= 0 || !E.path.length) { E.repath = 0.6; E.path = gr.stepTo(E.i, E.j, pi, pj); }
    const e = o.ent.position, tgt = E.path.length ? [gr.cx(E.path[0][0]), gr.cz(E.path[0][1])] : [p.x, p.z];
    const dx = tgt[0] - e.x, dz = tgt[1] - e.z, l = Math.hypot(dx, dz);
    if (l > 0.05) { e.x += (dx / l) * Math.min(l, E.speed * dt); e.z += (dz / l) * Math.min(l, E.speed * dt); o.ent.rotation.y = Math.atan2(dx, dz); }
    if (E.path.length && l < 0.2) [E.i, E.j] = E.path.shift();
    const ce = gr.cellOf(e.x, e.z); E.i = ce[0]; E.j = ce[1];
    o.blobs.forEach((b, n) => { b.position.x = Math.sin(g.t * 9 + n * 1.7) * 0.07; b.position.z = Math.cos(g.t * 7 + n) * 0.05; b.scale.setScalar(1 + Math.sin(g.t * 13 + n) * 0.12); });
    o.ent.visible = Math.random() > 0.04;
    const near = Math.hypot(e.x - p.x, e.z - p.z);
    const lm = O[E.k].lampM; if (lm) lm.emissiveIntensity = near < 10 && Math.random() < 0.25 ? 0.2 : E.k === 0 ? 1.6 : 1.2;
    for (const Lt of O[E.k].lights || []) Lt.flicker = near < 10 ? 0.6 : Lt.f0;
    RT.hum = near;
    if (near < 0.75) { resetToStart('...You blinked.', E.k === 0 ? 'And you’re back on the damp carpet where you woke up. Your almond water is still with you.' : 'Fizz... and you’re back where the elevator dropped you. The valves you turned stay turned.'); return 0; }
    return near < 10 ? (10 - near) * 0.35 : 0;
  }
  // blackouts: 2.5 s of warning flicker, then 6 s of dark with eyes; moving in the dark sends Milo back
  function tickBlackout(dt, g) {
    const B = RT.bo, o = O[1], pl = g.player; B.t += dt;
    if (B.phase === 'calm') { if (B.t >= 21.5) { B.phase = 'warn'; B.t = 0; A.play('thud', 0.4); if (!has('brBoTip')) { g.flag('brBoTip'); UI().toast('<b>The lights are flickering!</b>', null, 'When it goes dark, FREEZE. Don’t move until the lights come back.'); } } return 0; }
    if (B.phase === 'warn') {
      for (const L of o.lights) { L.int = Math.random() < 0.45 ? 0 : L.int0; } if (o.lampM) o.lampM.emissiveIntensity = Math.random() < 0.45 ? 0.1 : 2;
      if (Math.random() < dt * 8) A.tone({ f: 110 + Math.random() * 20, type: 'sawtooth', dur: 0.08, vol: 0.03, lp: 900 });
      if (B.t >= 2.5) { B.phase = 'dark'; B.t = 0; setDark(true); placeEyes(); B.p0 = pl.pos.clone(); A.tone({ f: 70, f2: 40, type: 'sine', dur: 1.2, vol: 0.12 }); }
      return 2;
    }
    // dark
    o.eyes.forEach((e) => { e.userData.blink -= dt; if (e.userData.blink < 0) { e.scale.y = 0.1; if (e.userData.blink < -0.15) { e.scale.y = 1; e.userData.blink = 1 + Math.random() * 3; } } e.lookAt(pl.pos.x, UG + 0.3, pl.pos.z); });
    if (B.t < 0.35) B.p0.copy(pl.pos);
    else if (Math.hypot(pl.pos.x - B.p0.x, pl.pos.z - B.p0.z) > 0.3) { RT.bo = { t: 0, phase: 'calm', p0: null }; setDark(false); resetToStart('The eyes blinked...', '...and so did you. Back at the start of the Warehouse. Your fuses are still in your satchel. Freeze in the dark next time!'); return 0; }
    if (B.t >= 6) { B.phase = 'calm'; B.t = 0; setDark(false); A.play('unlock'); UI().toast('<b>The lights are back.</b>', null, 'Phew. Statue mode: off.'); }
    return 3;
  }
  // steam vents: 1.3 s of steam every 3.6 s, with a small hiss before
  function tickVents(dt, g) {
    const pl = g.player, t = g.t;
    for (const v of O[2].vents || []) {
      const ph = (t + v.ph) % 3.6, on = ph < 1.3, warn = ph > 3.0;
      if ((on || warn) && Math.random() < (on ? 0.9 : 0.25)) g.particles.emit({ x: v.x + (Math.random() - 0.5) * 0.5, y: UG + 0.05, z: v.z + (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 0.3, vy: on ? 1.6 : 0.5, vz: (Math.random() - 0.5) * 0.3, life: on ? 1.1 : 0.6, size: on ? 0.22 : 0.1, col: 0xe8eef2, wander: 0.3, alpha: 0.5 });
      if (on && ph < dt * 1.5) { const d = Math.hypot(pl.pos.x - v.x, pl.pos.z - v.z); if (d < 9) A.noise({ f: 3000, q: 0.6, dur: 1.2, vol: 0.05 * (1 - d / 9), ft: 'highpass' }); }
      if (on && !RT.push && Math.hypot(pl.pos.x - v.x, pl.pos.z - v.z) < 0.85) {
        const l = Math.hypot(v.dir[0], v.dir[1]) || 1; RT.push = { dx: v.dir[0] / l, dz: v.dir[1] / l, t: 0.5 }; pl.vy = 2.6; pl.grounded = false; A.play('squeak');
        if (!has('brSteamTip')) { g.flag('brSteamTip'); UI().toast('<b>Whoosh! Hot steam!</b>', null, 'The vents puff on a rhythm. Wait for the hiss to stop, then dash across.'); }
      }
    }
    if (RT.push) { const P2 = RT.push; P2.t -= dt; pl.pos.x += P2.dx * 5.5 * dt; pl.pos.z += P2.dz * 5.5 * dt; pl.vel.x = P2.dx * 3; pl.vel.z = P2.dz * 3; if (P2.t <= 0) RT.push = null; }
  }
  // the party: golden balloons bob and pop; smiling balloons drift after Milo
  function tickParty(dt, g) {
    const o = O[4], b = BR(), pl = g.player, p = pl.pos; if (!o.golds) return 0;
    o.golds.forEach((m, n) => { if (b.pop.includes(n)) return; const [x, , z] = P.gold[n]; m.position.set(x + Math.sin(g.t * 0.8 + n) * 0.12, UG + 0.5 + Math.sin(g.t * 1.6 + n * 2) * 0.05, z + Math.cos(g.t * 0.7 + n) * 0.12);
      if (!pl.grounded && Math.hypot(p.x - m.position.x, p.z - m.position.z) < 0.5 && p.y - UG > 0.12) { b.pop.push(n); m.visible = false; A.noise({ f: 2200, q: 0.6, dur: 0.09, vol: 0.35 }); A.play('collect'); g.particles.burst(V3(m.position.x, m.position.y, m.position.z), 26, 0xf2c440, 'spark'); UI().toast('<b>POP!</b>', null, `Golden balloon ${n4()} of 6. Confetti everywhere!`); UI().updateObjective(); g.autosave(); } });
    if (RT.bcool > 0) { RT.bcool -= dt; }
    let minD = 99;
    for (const B of RT.balloons) {
      const m = B.m; B.repath -= dt; const [pi, pj] = G4.cellOf(p.x, p.z), [bi, bj] = G4.cellOf(B.x, B.z);
      if (RT.bcool <= 0) {
        if (B.repath <= 0) { B.repath = 0.8; B.path = G4.stepTo(bi, bj, pi, pj); }
        const tgt = B.path.length ? [G4.cx(B.path[0][0]), G4.cz(B.path[0][1])] : [p.x, p.z], dx = tgt[0] - B.x, dz = tgt[1] - B.z, l = Math.hypot(dx, dz);
        if (l > 0.05) { const sp = 0.8 * dt; B.x += (dx / l) * Math.min(l, sp); B.z += (dz / l) * Math.min(l, sp); }
        if (B.path.length && l < 0.2) B.path.shift();
      }
      m.position.set(B.x, UG + 1 + Math.sin(g.t * 1.3 + B.ph) * 0.08, B.z); m.rotation.y = Math.atan2(p.x - B.x, p.z - B.z); m.rotation.z = Math.sin(g.t * 0.9 + B.ph) * 0.08;
      const d = Math.hypot(p.x - B.x, p.z - B.z); minD = Math.min(minD, d);
      if (d < 0.5 && RT.bcool <= 0) { A.play('squeaktoy'); resetToStart('SQUEAK! A balloon hug!', 'The smiling balloon squeaked, the room spun... and the whole party started over. All six golden balloons are back.', { clearPops: true }); return 0; }
    }
    return minD < 5 ? (5 - minD) * 0.5 : 0;
  }
  // each level's soundscape (on top of the quiet mood)
  function ambience(dt, k) {
    RT.amb -= dt; if (RT.amb > 0) return;
    if (k === 0) { RT.amb = 1.9; const near = RT.ent && RT.ent.shown ? RT.hum : 99; A.tone({ f: 60, type: 'sawtooth', dur: 2.1, vol: 0.012 + (near < 12 ? (12 - near) * 0.004 : 0), lp: 380, a: 0.3 }); A.tone({ f: 120, type: 'sine', dur: 2.1, vol: 0.01, a: 0.3 }); }
    else if (k === 1) { RT.amb = 2.6; if (RT.bo && RT.bo.phase === 'dark') return; A.noise({ f: 90, q: 0.7, dur: 2.8, vol: 0.05, brown: true, ft: 'lowpass', a: 0.6 }); A.tone({ f: 100, type: 'sawtooth', dur: 2.6, vol: 0.006, lp: 300, a: 0.4 }); if (Math.random() < 0.35) A.tone({ f: 180 + Math.random() * 200, type: 'triangle', dur: 0.6, vol: 0.03, verb: 0.9, delay: Math.random() }); }
    else if (k === 2) { RT.amb = 1.6; A.noise({ f: 220, q: 1.2, dur: 1.8, vol: 0.035, brown: true, a: 0.4 }); if (Math.random() < 0.45) A.tone({ f: 70 + Math.random() * 60, f2: 50, type: 'sine', dur: 0.5, vol: 0.06, delay: Math.random() * 0.8 }); if (Math.random() < 0.3) A.noise({ f: 5000, q: 0.5, dur: 0.6, vol: 0.02, ft: 'highpass', delay: Math.random() }); }
    else if (k === 3) { RT.amb = 0.9 + Math.random() * 1.8; A.tone({ f: 1300 + Math.random() * 900, f2: 700, type: 'sine', dur: 0.14, vol: 0.05, verb: 1, pan: Math.random() * 2 - 1 }); if (Math.random() < 0.4) A.noise({ f: 500, q: 0.5, dur: 2.4, vol: 0.02, a: 0.8, verb: 0.6 }); }
    else if (k === 4) { // a tinny, slightly out-of-tune party tune from somewhere
      RT.amb = 3.2; const mel = [0, 4, 7, 12, 11, 7, 9, 7, 4, 5, 4, 0]; RT.mel = ((RT.mel || 0) + 1) % 4;
      mel.slice(RT.mel * 3, RT.mel * 3 + 3).concat(mel.slice(((RT.mel + 1) % 4) * 3, ((RT.mel + 1) % 4) * 3 + 3)).forEach((s, n) => A.tone({ f: 523 * Math.pow(2, (s - 0.18) / 12), type: 'square', dur: 0.22, vol: 0.012, lp: 1400, delay: n * 0.45, verb: 0.7 }));
      if (Math.random() < 0.25) A.noise({ f: 1200, q: 0.4, dur: 1.4, vol: 0.012, a: 0.4, verb: 1, delay: 1 });
    }
  }

  /* ================================================================ hooks: chapter routing, loading, mood, scent, admin */
  const oInit = EXT.init;
  EXT.init = function (g) {
    oInit(g);
    const oStart = g.startChapter.bind(g); g.startChapter = (n, silent) => (n === CH ? start() : oStart(n, silent));
    const oMood = g.moodFor.bind(g); g.moodFor = () => (S().chapter === CH ? 'quiet' : oMood());
    // scent vision: walk the maze to the goal instead of the surface nav graph
    const oNav = W.navPath; W.navPath = function (from, to) { if (inBR()) { const a = levelAt(from[0], from[1], from[2]), b = levelAt(to[0], to[1], to[2]); if (a >= 0 && a === b) return LV[a].g.route(from, to); } return oNav(from, to); };
    (G.AdminExtras = G.AdminExtras || []).push(({ group, close }) => { const add = group('Backrooms'); LV.forEach((L, k) => add(`Level ${k} · ${L.name}`, () => { close(); jump(k); }, inBR() && lvl() === k)); add('Reset Backrooms run', () => { resetRun(); game().refreshItems(); close(); UI().toast('<b>Admin</b>', null, 'Backrooms progress reset (notes kept).'); }); });
  };
  const oApply = EXT.applyState;
  EXT.applyState = function (g0) {
    oApply(g0);
    if (inBR()) { const k = lvl(); R.build(R.byId[LV[k].region]); syncVisuals(); if (game().player && !RT.ent && !RT.bo && !RT.balloons.length) resetThreats(k, true); }
  };
  G.Backrooms = { LV, P, O, RT, BR, enterLevel, jump, start, finishHome, resetToStart, stepFor, grids: GR, vents: VENTS };
})();
