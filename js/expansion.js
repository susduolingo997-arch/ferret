/* =====================================================================
   expansion.js - "More to Discover" update.
   Adds hidden areas and secret tunnels, three story missions, two side
   quests, background animals, hiding, better scent vision, digging
   spots, props to push / kick / sniff, Easter eggs, weather effects on
   exploration, and a quest + clue journal. Plugs into the base game
   through small hooks (G.EXT.*) and never replaces existing content.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, M = G.Mat, UG = G.World.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const has = (f) => !!S().flags[f];
  const item = (id) => G.game.hasItem(id);
  const Q = (id) => (S().quests || {})[id];

  /* ================================================================ DATA */
  Object.assign(G.ITEMS, {
    jbell: { name: "Juniper's Bell", desc: 'A tiny brass bell on a scrap of red ribbon. It still jingles. Found in a crawlspace behind the garage wall.', story: true },
    postcard1: { name: 'Torn Postcard (left)', desc: 'A soggy corner of a postcard. "Dear Ellie..."', story: true },
    postcard2: { name: 'Torn Postcard (middle)', desc: 'The middle of a postcard. "...couldn’t find your music box when I packed..."', story: true },
    postcard3: { name: 'Torn Postcard (right)', desc: 'A corner with a stamp of a lighthouse. "...Love, Grandpa"', story: true },
    postcard: { name: "Arlo's Postcard", desc: '"Dear Ellie, I’m so sorry, I couldn’t find your music box when I packed. If it ever turns up, wind it and think of me. The workshop key is with the old stump. Love, Grandpa." It was never delivered.', story: true },
    quill: { name: 'Hedgehog Quill', desc: 'A single striped quill from Moss’s den under the apple tree. He has been visiting the garden every night.', story: true },
  });
  G.CATS.secrets = 'Secrets';
  G.COLLECT.push(
    { id: 's_figure', cat: 'secrets', model: 'figure', name: 'Tiny Ferret Figurine', desc: 'Hidden inside the walls. Is that... me? Juniper must have collected it.', pos: [73.4, UG + 0.45, 1.25] },
    { id: 's_chicken', cat: 'secrets', model: 'chicken', name: 'Rubber Chicken', desc: 'It squeaks. Nobody knows how it got into the garage crawlspace.', pos: [92.4, UG, 1.5] },
    { id: 's_telescope', cat: 'secrets', model: 'telescope', name: 'Toy Telescope', desc: 'Washed into the storm drain. Through it, the stars look much closer.', pos: [110.3, UG, 13.6] },
    { id: 's_bottle', cat: 'secrets', model: 'bottle', name: 'Message in a Bottle', desc: '"If found, please return to the SEA. — Gerald, age 8." The creek is doing its best.', pos: [-77.3, 0, 66.2] },
    { id: 's_glowstone', cat: 'secrets', model: 'glowstone', name: 'Glow Stone', desc: 'Dug up in Echo Cave. It glows faintly, like the mushrooms.', pos: null },
    { id: 's_gnomehat', cat: 'secrets', model: 'gnomehat', name: "Gnome's Spare Hat", desc: 'Behind the tool shed, through the bush tunnel. The gnome has a spare. Of course he does.', pos: [11.2, 0, -27.3] },
    { id: 's_biscuit', cat: 'secrets', model: 'biscuit', name: 'Emergency Dog Biscuit', desc: "Hidden behind Bram's rocking chair. He definitely knows it's there.", pos: [27.6, 0.35, 6.35] },
    { id: 's_clover', cat: 'secrets', model: 'clover', name: 'Four-Leaf Clover', desc: 'Only a very good nose could find this in Fern Hollow.', pos: [-64.6, 0, 15.6], scentOnly: true },
    { id: 's_moonshroom', cat: 'secrets', model: 'moonshroom', name: 'Moonlit Mushroom', desc: 'Appeared when Milo danced in the fairy ring under the stars.', pos: null },
    { id: 'c_featherS', cat: 'feathers', model: 'feather2', name: 'Sparrow Feather', desc: 'A gift from Dot, for sneaking up on her fair and square.', pos: null },
    { id: 'c_featherD', cat: 'feathers', model: 'feather5', name: 'Duck Feather', desc: 'From Mabel, for bringing her duckling home.', pos: null },
  );
  G.PICKUPS.push(
    { id: 'p_jbell', item: 'jbell', model: 'jbell', pos: [93.6, UG, 1.95], when: () => true, msg: 'A little brass bell on a scrap of red ribbon... the same red as the ribbon from the tunnel!' },
    { id: 'p_pc1', item: 'postcard1', model: 'postcard', pos: [112.1, UG, 8.2], when: () => true },
    { id: 'p_pc2', item: 'postcard2', model: 'postcard', pos: [64.6, 0, -5.2], when: () => true },
    { id: 'p_pc3', item: 'postcard3', model: 'postcard', pos: [-63.6, 0, 19.8], when: () => true },
    { id: 'p_quill', item: 'quill', model: 'quill', pos: [102.9, UG, 1.3], when: () => true, msg: 'A striped quill... and a pile of acorns and bright leaves. This is Moss’s den!' },
  );

  G.QUESTS = {
    m1: { kind: 'Story mission', title: "Juniper's Bell", giver: 'Bram',
      steps: { find: 'Find Juniper’s bell somewhere in Milo’s garage', ret: 'Show the bell to Bram' }, done: 'Juniper was Ellie’s first ferret, and she lived in Milo’s house.',
      target: (st) => st === 'find' ? (game().player.pos.y < UG + 12 ? [93.6, UG, 1.95] : has('boxMoved') ? [12.2, 0, -1.3] : [12.2, 0, -0.9]) : [31.5, 0.35, 8.3] },
    m2: { kind: 'Story mission', title: "Arlo's Lost Postcard", giver: 'Nora',
      steps: { pieces: 'Find the three pieces of the postcard: under the street, behind the shop, and deep in the forest' }, done: 'Arlo never meant to lose the music box. He wanted Ellie to have it.',
      target: () => nearestOf([[item('postcard1') ? null : [-9.2, 0, 13.2]], [item('postcard2') ? null : [64.6, 0, -5.2]], [item('postcard3') ? null : [-62, 0, 24.5]]].map((a) => a[0]).filter(Boolean)) },
    m3: { kind: 'Story mission', title: 'Night Tracks', giver: 'Tilly',
      steps: { earth: 'Sniff the fresh earth in the vegetable bed', prints: 'Follow the little footprints to the bird bath', dig: 'Dig at the roots of the apple tree', den: 'Explore the den under the apple tree' }, done: 'Moss visits the garden every night. Now he knows Milo is a friend.',
      target: (st) => ({ earth: [-3.2, 0, -13.6], prints: [-1.6, 0, -22.4], dig: [-4.7, 0, -20.9], den: game().player.pos.y < UG + 12 ? [102.9, UG, 1.3] : [-4.7, 0, -20.9] }[st]) },
    s1: { kind: 'Side quest', title: 'Sneaky Sparrow', giver: 'Dot',
      steps: { hide: 'Hide in the bush by the bird bath and wait for Dot' }, done: 'Nobody sneaks up on Dot. Except Milo.', target: () => [-2.8, 0, -25.2] },
    s2: { kind: 'Side quest', title: 'The Lost Duckling', giver: 'Mabel',
      steps: { find: 'Find the duckling hiding somewhere in Willow Park', lead: 'Lead the duckling back to the duck pond' }, done: 'Pip, Pop, Pud and Pat are all home.',
      target: (st) => st === 'find' ? [33.4, 0, 59.6] : [-5, 0, 50] },
  };
  function nearestOf(list) { const p = game().player.pos; list.sort((a, b) => U.dist2(a[0], a[2], p.x, p.z) - U.dist2(b[0], b[2], p.x, p.z)); return list[0] || null; }

  /* clues appear in the journal as the mystery unfolds */
  G.CLUES = [
    ['noise', 'A clink, clink and a little song under the floor at night.', () => S().chapter > 1 || S().step !== 'c1_wake'],
    ['tunnel', 'A hidden tunnel behind the basement crate, marked with a scratched "J".', () => has('crateMoved')],
    ['ribbon', 'A red ribbon at the tunnel mouth. It smells of another ferret.', () => has('got_p_ribbon')],
    ['digger', 'Nora: someone small and very shy has been digging new tunnels at night.', () => has('met_nora')],
    ['note', 'Sheet music signed "for Ellie ~ A." It is the tune Ellie hums.', () => item('note') || S().chapter >= 3],
    ['arlo', 'Bram: the tune is Arlo Wren’s. Ellie’s grandpa made clocks in a workshop in Hollow Wood.', () => ['c2_nora2', 'c2_path'].includes(S().step) || S().chapter >= 3],
    ['bell', 'Juniper wore a brass bell on her red ribbon. She was Ellie’s first ferret and lived in Milo’s house.', () => Q('m1') === 'done'],
    ['singing', 'Moss let slip about a "singing box" and a key buried by the stump.', () => has('met_moss')],
    ['photo', 'A photograph: "Arlo, Ellie & Juniper." Juniper is a ferret with a red ribbon.', () => item('photo') || S().chapter >= 5],
    ['journal', 'Arlo’s journal: the music box needs its winding key and a new brass gear.', () => item('journal') || S().chapter >= 5],
    ['postcard', 'Arlo’s undelivered postcard: he lost the music box in the move and was heartbroken.', () => Q('m2') === 'done'],
    ['tracks', 'Moss’s den is under the apple tree. He visits the garden every night.', () => Q('m3') === 'done'],
    ['solved', 'Juniper dug the tunnels, the box is Ellie’s, and Moss has been carrying it home.', () => S().chapter >= 4 && S().step !== 'c4_board'],
    ['home', 'The music box is home, on Ellie’s nightstand.', () => has('boxPlaced')],
  ];
  G.EGGS = { tv: 'Nature documentary', mirror: 'Handsome ferret', gnome: 'The judging gnome', fairy: 'Dance in the fairy ring', bone: 'A "dinosaur" bone', bottle: 'Message in a bottle', bramDance: 'Make Bram laugh', blanket: 'Five more minutes', apple: 'Gravity test', echo: 'Echo, echo' };

  /* digging spots: once each, each hides something */
  const DIGS = [
    { id: 'd1', pos: [10.1, 0, -20.6], loot: 'treat', hiddenBy: 'crate' },
    { id: 'd2', pos: [-8.6, 0, -9.6], loot: 'spoon' },
    { id: 'd3', pos: [12.4, 0, 9.2], loot: 'pebble' },
    { id: 'd4', pos: [19.6, 0, -20], loot: 'bone' },
    { id: 'd5', pos: [30.4, 0, 48.4], loot: 'treat' },
    { id: 'd6', pos: [-18.4, 0, 58.2], loot: 'acorn' },
    { id: 'd7', pos: [-70.4, 0, 47.4], loot: 'beetle' },
    { id: 'd8', pos: [-92, 0, -9.6], loot: 'treat' },
    { id: 'd9', pos: [-104.2, 0, 16.4], loot: 'whistle' },
    { id: 'd10', pos: [-120.4, 0, 42.6], loot: 'glowstone' },
    { id: 'd11', pos: [-63.2, 0, 14.4], loot: 'treat' },
    { id: 'd12', pos: [4.4, 0, 60], loot: 'button' },
  ];
  const LOOT = {
    treat: ['Buried treats!', 'Someone buried a treat here. Finders keepers.'], spoon: ['An old spoon', 'Shiny, but Pip already has twelve.'], pebble: ['A round pebble', 'Very round. Milo is impressed.'],
    bone: ['A dinosaur bone!', '...It’s a chicken bone. Still counts.'], acorn: ['A buried acorn', 'Pip will never know. Pip will absolutely know.'], beetle: ['A shiny beetle', 'It trundles off, offended.'],
    whistle: ['A rusty whistle', 'Milo tries it. Nothing. Somewhere, a dog looks up.'], glowstone: ['A glow stone!', 'It glows faintly in the dark.'], button: ['A lost button', 'Someone’s coat is missing this.'],
  };
  /* places Milo can hide: bushes and cosy spots (furniture overhead also counts) */
  const HIDES = [[-7, -25, 1.3], [-2.8, -25.2, 0.9], [-7.5, 7, 0.8], [-1, 7, 0.7], [7.5, 7, 0.7], [62.6, -3.6, 1.2], [33.4, 59.6, 1.1], [9.6, -26.9, 0.7], [-62.8, 21.2, 1], [-58, 45, 1], [-64, 18.4, 0.9]];

  /* ================================================================ WORLD */
  const EXT = (G.EXT = { panels: {} }); EXT.HIDES = HIDES;
  EXT.preBuild = function (W) {
    W.extraClear = [[-62, 17, 8.5], [-66, 29, 3.5], [-63.5, 26.5, 3]];
  };
  EXT.buildWorld = function (W) {
    const H = W.h, root = W.root, dyn = (m) => { m.userData.dynamic = true; m.traverse && m.traverse((o) => (o.userData.dynamic = true)); return m; };
    const sub = (id, name, x0, x1, z0, z1, o = {}) => W.areas.unshift(Object.assign({ id, name, x0, x1, z0, z1 }, o));
    const chamber = (x, z, r, col) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 18, 12), M.std('nookwall2', { map: 'dirt', color: col || 0x9a7a5a, rough: 1, side: THREE.BackSide })); m.scale.set(1, 0.55, 1); m.position.set(x, UG + 0.3, z); root.add(m); H.disc(x, z, r * 1.3, UG + 0.004, 'dirt', 1); };
    const hole = (x, y, z, ry, r = 0.2) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), M.color(0x0b0706, 1)); m.position.set(x, y, z); if (ry === 'flat') m.rotation.x = -Math.PI / 2; else m.rotation.y = ry; root.add(m); return m; };

    /* ---- inside the walls: bedroom wardrobe -> garage workbench */
    hole(-7.33, 0.15, -0.9, Math.PI / 2, 0.14);
    H.tunnel('WALL', [[70, UG, 0], [71.5, UG, 0], [72.6, UG + 0.45, 1.2], [74.4, UG + 0.45, 1.2], [75.6, UG, 2.6], [77.4, UG, 2.6]]);
    for (let i = 0; i < 6; i++) H.box({ w: 0.06, h: 0.9, d: 0.06, x: 71 + i * 1.2, y: UG, z: i < 2 ? -0.35 : i < 4 ? 0.85 : 2.25, mat: 'midwood', col: false, cast: false });
    sub('walls', 'Inside the Walls', 69, 79, -2, 5, { ug: true, zone: 'under', surf: 'wood', dark: true });
    hole(8.1, 0.14, -1.55, Math.PI / 2, 0.14);

    /* ---- garage crawlspace behind a pushable box (Juniper's Bell) */
    hole(12.2, 0.14, -1.91, 0, 0.17);
    const gbox = dyn(H.box({ w: 0.7, h: 0.55, d: 0.5, x: 12.2, z: -1.62, mat: M.std('cardboard2', { color: 0xa87f52, rough: 0.95 }), col: false, name: 'gbox' }));
    H.collider(11.85, 12.55, -1.87, -1.37, 0, 0.55, { name: 'gbox', climb: true });
    H.tunnel('CRAWL', [[90, UG, 0], [91.8, UG, 0.2], [93, UG, 1.2]]);
    H.tunnel('CRAWLC', [[93, UG, 1.2], [93.5, UG, 1.7]], { r: 0.75, noVis: true }); chamber(93.3, 1.5, 0.8);
    H.light(93.2, UG + 0.5, 1.5, 0xffb866, 0.8, 3, { ug: true, flicker: 0.2 });
    sub('crawl', 'Garage Crawlspace', 89, 95, -2, 4, { ug: true, zone: 'under', surf: 'dirt', dark: true });

    /* ---- backyard: pushable crate over a dig spot, den under the apple tree, secret corner behind the shed */
    const crate = dyn(H.box({ w: 0.8, h: 0.6, d: 0.8, x: 10.1, z: -20.6, mat: M.std('crate', {}), col: false, name: 'ycrate' }));
    H.collider(9.7, 10.5, -21, -20.2, 0, 0.6, { name: 'ycrate', climb: true });
    const den = dyn(hole(-4.7, 0.02, -20.95, 'flat', 0.22)); den.visible = false; W.obj.denHole = den;
    const denM = dyn(H.sph({ x: -4.7, y: 0, z: -20.95, r: 0.32, sy: 0.3, mat: 'dirt', name: 'denMound' }));
    H.tunnel('DEN', [[100, UG, 0], [101.6, UG, 0.4], [102.4, UG, 0.9]]);
    H.tunnel('DENC', [[102.4, UG, 0.9], [102.9, UG, 1.3]], { r: 0.75, noVis: true }); chamber(102.8, 1.2, 0.85, 0xa08060);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; H.sph({ x: 102.8 + Math.cos(a) * 0.6, y: UG + 0.03, z: 1.2 + Math.sin(a) * 0.6, r: 0.03, sy: 1.2, mat: M.color(0x9c6b3a, 0.5) }); }
    H.light(102.6, UG + 0.5, 1.1, 0xffc27a, 0.7, 3, { ug: true, flicker: 0.2 });
    sub('den', "Moss's Garden Den", 99, 105, -2, 4, { ug: true, zone: 'under', surf: 'dirt', dark: true });
    // behind the tool shed: dense bushes, one low bush tunnel on the west side
    const bushes = [[9.4, -27.6], [9.4, -26.1], [13.6, -26.2], [14.6, -26.3], [15.4, -26.4], [13.8, -27.4], [15, -27.5]];
    for (const [x, z] of bushes) W.bushes.push([x, 0.55, z, 0.75, 0x4d6e36]);
    W.bushes.push([9.5, 0.62, -26.85, 0.55, 0x55743a]);
    H.collider(9.1, 9.9, -28, -27.2, 0, 1.4, { cam: false }); H.collider(9.1, 9.9, -26.5, -25.8, 0, 1.4, { cam: false }); H.collider(9.1, 9.9, -27.2, -26.5, 0.3, 1.4, { cam: false });
    H.collider(13.1, 15.95, -28, -25.8, 0, 1.4, { cam: false });
    const gnome = new THREE.Group(); gnome.position.set(12.4, 0, -27.3); gnome.rotation.y = 0.4; root.add(gnome);
    const gm = (geo, col, y, s) => { const m = new THREE.Mesh(geo, M.color(col, 0.6)); m.position.y = y; if (s) m.scale.set(...s); m.castShadow = true; gnome.add(m); };
    gm(new THREE.CylinderGeometry(0.1, 0.13, 0.22, 10), 0x3f6fa0, 0.11); gm(new THREE.SphereGeometry(0.08, 12, 10), 0xf0c7a8, 0.28); gm(new THREE.ConeGeometry(0.09, 0.22, 12), 0xc0392b, 0.44); gm(new THREE.SphereGeometry(0.07, 10, 8), 0xf2ebe0, 0.22, [1, 1.1, 0.8]);
    H.collider(12.25, 12.55, -27.45, -27.15, 0, 0.5, {});
    sub('shedback', 'Behind the Tool Shed', 9.9, 13.1, -28, -25.8, { zone: 'town', surf: 'grass' });
    W.noGrass.push([9.9, 13.1, -28, -25.8]);
    H.plane(9.9, 13.1, -28, -25.8, 0.008, M.std('leaflitter', { map: 'forestfloor', rough: 1 }), 2);
    // a hide-and-seek bush by the bird bath
    W.bushes.push([-2.8, 0.45, -25.2, 0.7, 0x55743a], [-3.3, 0.4, -25.6, 0.55, 0x4d6e36]);

    /* ---- storm drain under Maple Street (front yard -> park) */
    const grate = new THREE.Group(); grate.position.set(-9.2, 0.015, 13.2); root.add(grate);
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), M.color(0x0c0908, 1)); gp.rotation.x = -Math.PI / 2; grate.add(gp);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.45), M.get('darkmetal')); b.position.set(-0.3 + i * 0.12, 0.01, 0); grate.add(b); }
    W.noGrass.push([-9.6, -8.8, 12.9, 13.5]);
    H.tunnel('DRAIN', [[110, UG, 0], [110, UG, 4], [112, UG, 6], [112, UG, 10], [110, UG, 12], [110, UG, 15]]);
    H.plane(109.6, 110.4, 0, 15, UG + 0.012, M.std('trickle', { color: 0x2d4a52, rough: 0.05, metal: 0.2, transparent: true, opacity: 0.6, envI: 1 }), 1);
    sub('drain', 'Under Maple Street', 108, 114, -2, 16, { ug: true, zone: 'under', surf: 'stone', dark: true });
    const pipe = H.cyl({ r: 0.42, h: 0.8, x: -27.8, y: 0.2, z: 30.2, mat: 'concrete', rx: Math.PI / 2, open: true }); pipe.material = pipe.material.clone(); pipe.material.side = THREE.DoubleSide;
    hole(-27.8, 0.2, 30.62, 0, 0.36);
    H.collider(-28.25, -27.35, 29.8, 30.6, 0, 0.62, {});

    /* ---- shop alley: a hideout behind the dumpster, reached by crawling under a leaning pallet */
    for (const [x, z, y] of [[64.2, -2.5, 0], [65.1, -2.5, 0], [64.6, -2.5, 0.5], [61.2, -2.5, 0]]) H.box({ w: 0.8, h: 0.5, d: 0.7, x, y, z, mat: 'crate', col: false });
    H.collider(63.2, 66, -2.9, -2.1, 0, 1.2, {}); H.collider(60.6, 61.8, -2.9, -2.1, 0, 1.2, {});
    H.box({ w: 0.6, h: 0.05, d: 1, x: 60.3, y: 0.3, z: -2.5, mat: 'shedwood', col: false, rz: 0.3 }); H.collider(60, 60.6, -2.9, -2.1, 0.28, 1.2, { cam: false });
    H.fence(66, -8, 66, -2.1, 1.2); H.fence(60, -8, 60, -4, 1.2);
    sub('dumpster', 'Behind the Dumpster', 60, 66, -8, -2.5, { zone: 'town', surf: 'stone' });
    H.plane(60, 66, -8, -2.5, 0.013, 'concrete', 2, { po: 1 }); W.noGrass.push([59.8, 66.2, -8.2, -2.4]);

    /* ---- Fern Hollow: a secret glade in the forest, entered through a hollow log */
    const cx = -62, cz = 17, R = 5.6;
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.3) continue; W.rocks.push([cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R, 1.15 + (i % 3) * 0.15, 'mossrock', true]); }
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28; if (Math.abs(a - Math.PI / 2) < 0.4) continue; const rr = R + 0.8 + Math.random(); W.bushes.push([cx + Math.cos(a) * rr, 0.6, cz + Math.sin(a) * rr, 0.8 + Math.random() * 0.4, 0x3f5a2a]); }
    const logM = H.cyl({ r: 0.46, h: 3.4, x: cx, y: 0.4, z: cz + R + 1.2, mat: 'bark', rx: Math.PI / 2, open: true }); logM.material = logM.material.clone(); logM.material.side = THREE.DoubleSide;
    for (const s of [-1, 1]) H.collider(cx + s * 0.5 - 0.06, cx + s * 0.5 + 0.06, cz + R - 0.5, cz + R + 2.9, 0, 1, { cam: false });
    H.collider(cx - 0.5, cx + 0.5, cz + R - 0.5, cz + R + 2.9, 0.34, 1.0, {});
    H.collider(cx - 2.6, cx - 0.56, cz + R - 0.6, cz + R + 0.5, 0, 2.2, { cam: false }); H.collider(cx + 0.56, cx + 2.6, cz + R - 0.6, cz + R + 0.5, 0, 2.2, { cam: false });
    H.disc(cx, cz, R + 0.4, 0.007, 'grass', 5); W.grassZones.push(['c', cx, cz, R - 0.3, 2]);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, rr = 1.5 + Math.random() * 3.4; W.ferns.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, 0.5 + Math.random() * 0.6, 'fern']); }
    W.trees.push([cx + 2.2, cz - 1.4, 1.2, 'oak']);
    H.cyl({ r: 0.32, rt: 0.28, h: 0.55, x: cx + 2.6, z: cz + 1.3, mat: 'bark', col: true, climb: true });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; H.sph({ x: cx - 1.6 + Math.cos(a) * 1.2, y: 0.05, z: cz + 0.8 + Math.sin(a) * 1.2, r: 0.05, sy: 0.6, mat: 'mushroom', cast: false }); }
    H.light(cx - 1.6, 0.4, cz + 0.8, 0x6fe0c4, 0.8, 4, { night: true });
    // a faint path from the trail to the log
    const pth = [[-70.5, 31.5], [-67, 28.5], [-63.6, 26], [cx, cz + R + 3]];
    for (let i = 0; i < pth.length - 1; i++) { const [a, b] = [pth[i], pth[i + 1]]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.PlaneGeometry(1.1, len + 0.6); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, M.std('faintpath', { map: 'dirt', color: 0xb09a80, rough: 1, transparent: true, opacity: 0.75 })); m.position.set((a[0] + b[0]) / 2, 0.012, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); m.receiveShadow = true; root.add(m); }
    sub('fernhollow', 'Fern Hollow', cx - R, cx + R, cz - R, cz + R, { zone: 'forest', surf: 'grass' });

    /* ---- props: doors, balls, toys, TV screen, apples */
    EXT.doors = [];
    for (const [hx, id] of [[-1.4, 'bedroomDoor'], [4, 'kitchenDoor']]) {
      const g = dyn(new THREE.Group()); g.position.set(hx, 0, 0); root.add(g);
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.86, 0.045), M.get('whitewood')); pnl.position.set(-0.49, 0.24 + 0.93, 0); pnl.castShadow = true; g.add(pnl); dyn(pnl);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.get('brass')); kn.position.set(-0.88, 1.1, 0.04); g.add(kn); dyn(kn);
      const col = H.collider(hx - 1, hx, -0.05, 0.05, 0.24, 2.1, { name: id }); col.on = false;
      g.rotation.y = -1.45; EXT.doors.push({ id, g, col, open: true, hx });
    }
    const tvS = dyn(new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.78), new THREE.MeshBasicMaterial({ map: tvTexture(), toneMapped: false })));
    tvS.position.set(-4.5, 1.025, 0.285); tvS.visible = false; root.add(tvS); W.obj.tvScreen = tvS;
    H.light(-4.5, 1, 0.9, 0x9fd0ff, 0, 4, { tv: true });
    EXT.tvLight = W.lightSrc[W.lightSrc.length - 1];
  };
  function tvTexture() {
    return G.Tex.make('tvdoc', 256, 144, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb0d8'); gr.addColorStop(0.55, '#cfe0c0'); gr.addColorStop(0.56, '#6f8f45'); gr.addColorStop(1, '#4a6a2e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#5a3e2b'; g.beginPath(); g.ellipse(120, 100, 44, 12, -0.1, 0, 7); g.fill(); g.beginPath(); g.arc(166, 92, 12, 0, 7); g.fill(); g.fillStyle = '#f1e1c4'; g.beginPath(); g.arc(170, 94, 8, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(172, 91, 2, 0, 7); g.fill();
      g.strokeStyle = '#3a281b'; g.lineWidth = 6; g.beginPath(); g.moveTo(78, 102); g.quadraticCurveTo(60, 98, 50, 110); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, h - 26, w, 26); g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.fillText('WILD FERRETS  •  PART 3', 10, h - 9);
    });
  }
  EXT.buildNav = function (W) {
    const { N, adj } = W.nav;
    const add = (id, p, links) => { N[id] = p; adj[id] = adj[id] || []; for (const l of links) { if (!N[l]) continue; adj[id].push(l); adj[l].push(id); } };
    add('wardrobe', [-7.05, 0, -0.9], ['bedC']); add('wbench', [8.45, 0, -0.9], ['gar']); add('gbox', [12.2, 0, -1.1], ['gar']);
    add('apple', [-4.7, 0, -21.4], ['yard', 'bush']); add('bath', [-1.6, 0, -22.4], ['yard', 'apple']); add('veg', [-3.2, 0, -13.6], ['yard']); add('shedW', [8.8, 0, -26.8], ['yard']); add('shedIn', [10.6, 0, -26.9], ['shedW']); add('ycrate', [10.1, 0, -19.6], ['yard']);
    add('grate', [-9.2, 0, 12.6], ['front', 'st0']); add('pNW', [-22, 0, 33], ['pGate', 'pw']); add('pipe', [-27.6, 0, 31.2], ['pNW']);
    add('pSE', [26, 0, 56], ['play']); add('duckling', [33, 0, 59], ['pSE']); add('mabel', [-4.2, 0, 51.4], ['pondE']);
    add('alleyB', [60.3, 0, -1.6], ['alley']); add('alleyH', [60.3, 0, -3.4], ['alleyB']); add('pc2', [64.6, 0, -5.2], ['alleyH']);
    add('fh0', [-70.5, 0, 31.5], ['f3', 'f2']); add('fh1', [-63.6, 0, 26], ['fh0']); add('logN', [-62, 0, 25.4], ['fh1']); add('logS', [-62, 0, 21.4], ['logN']); add('fhC', [-62, 0, 17], ['logS']);
  };

  /* ================================================================ ANIMALS */
  function mk(geo, col, rough = 0.8) { const m = new THREE.Mesh(geo, typeof col === 'number' ? M.color(col, rough) : col); m.castShadow = true; return m; }
  const SPH = new THREE.SphereGeometry(1, 14, 10);
  function eyes(g, x, y, z, r, col = 0x0b0705) { for (const s of [-1, 1]) { const e = mk(SPH, M.std('aeye' + col, { color: col, rough: 0.1 })); e.scale.setScalar(r); e.position.set(s * x, y, z); g.add(e); const h = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: 0xffffff })); h.scale.setScalar(r * 0.3); h.position.set(s * x + r * 0.3, y + r * 0.35, z + r * 0.7); g.add(h); } }
  const MODELS = {
    sparrow() { const g = new THREE.Group(); const b = mk(SPH, M.fur(0x8a6a4a, 'sparrow')); b.scale.set(0.045, 0.042, 0.065); b.position.y = 0.06; g.add(b); const be = mk(SPH, 0xe8dcc4); be.scale.set(0.035, 0.03, 0.045); be.position.set(0, 0.05, 0.015); g.add(be); const h = new THREE.Group(); h.position.set(0, 0.1, 0.04); g.add(h); const hd = mk(SPH, M.fur(0x6a4a30, 'sparrowh')); hd.scale.setScalar(0.032); h.add(hd); const bk = mk(new THREE.ConeGeometry(0.009, 0.025, 6), 0x3a2a1a); bk.rotation.x = Math.PI / 2; bk.position.z = 0.035; h.add(bk); eyes(h, 0.018, 0.008, 0.022, 0.006); const t = mk(new THREE.BoxGeometry(0.03, 0.006, 0.05), 0x5a4030); t.position.set(0, 0.07, -0.07); t.rotation.x = -0.4; g.add(t); const wings = []; for (const s of [-1, 1]) { const w = mk(new THREE.BoxGeometry(0.004, 0.035, 0.06), 0x6a4a30); w.position.set(s * 0.042, 0.07, -0.005); g.add(w); wings.push(w); } g.userData = { head: h, wings }; return g; },
    duck(scale = 1, yellow) { const g = new THREE.Group(); const c1 = yellow ? 0xf2d24b : 0xd9c6a4, c2 = yellow ? 0xf2d24b : 0x3d6b3a; const b = mk(SPH, M.fur(c1, 'duck' + c1)); b.scale.set(0.11, 0.08, 0.16); b.position.y = 0.05; g.add(b); const h = new THREE.Group(); h.position.set(0, 0.16, 0.1); g.add(h); const hd = mk(SPH, M.fur(c2, 'duckh' + c2)); hd.scale.setScalar(0.06); h.add(hd); const bk = mk(SPH, 0xe89a2a); bk.scale.set(0.03, 0.012, 0.045); bk.position.set(0, -0.01, 0.06); h.add(bk); eyes(h, 0.035, 0.015, 0.035, 0.009); const t = mk(new THREE.ConeGeometry(0.04, 0.08, 6), c1); t.rotation.x = -2.2; t.position.set(0, 0.09, -0.15); g.add(t); g.scale.setScalar(scale); g.userData = { head: h }; return g; },
    frog() { const g = new THREE.Group(); const gr = M.std('frog', { color: 0x5f9a3a, rough: 0.35 }); const b = mk(SPH, gr); b.scale.set(0.06, 0.04, 0.07); b.position.y = 0.04; g.add(b); const be = mk(SPH, 0xd9e0a0); be.scale.set(0.05, 0.025, 0.055); be.position.set(0, 0.025, 0.01); g.add(be); for (const s of [-1, 1]) { const bump = mk(SPH, gr); bump.scale.setScalar(0.022); bump.position.set(s * 0.03, 0.075, 0.035); g.add(bump); const l = mk(SPH, gr); l.scale.set(0.02, 0.015, 0.045); l.position.set(s * 0.055, 0.015, -0.03); g.add(l); } eyes(g, 0.03, 0.085, 0.047, 0.012, 0x201a08); const th = mk(SPH, 0xe8e8b0); th.scale.set(0.03, 0.02, 0.02); th.position.set(0, 0.03, 0.055); g.add(th); g.userData = { throat: th }; return g; },
    owl() { const g = new THREE.Group(); const f = M.fur(0x8a6a48, 'owl'); const b = mk(SPH, f); b.scale.set(0.12, 0.16, 0.11); b.position.y = 0.15; g.add(b); const bel = mk(SPH, M.fur(0xe0cfae, 'owlb')); bel.scale.set(0.09, 0.12, 0.05); bel.position.set(0, 0.13, 0.07); g.add(bel); const h = new THREE.Group(); h.position.set(0, 0.32, 0); g.add(h); const hd = mk(SPH, f); hd.scale.set(0.1, 0.085, 0.09); h.add(hd); const face = mk(SPH, M.fur(0xf0e2c8, 'owlf')); face.scale.set(0.085, 0.07, 0.04); face.position.z = 0.06; h.add(face); eyes(h, 0.035, 0.005, 0.085, 0.022, 0x1a1208); const irisM = M.std('owliris', { color: 0xf0a020, emissive: 0x805000, ei: 0.3 }); for (const s of [-1, 1]) { const r = mk(new THREE.TorusGeometry(0.022, 0.006, 6, 14), irisM); r.position.set(s * 0.035, 0.005, 0.09); h.add(r); const tuft = mk(new THREE.ConeGeometry(0.02, 0.07, 5), f); tuft.position.set(s * 0.06, 0.08, 0); tuft.rotation.z = -s * 0.4; h.add(tuft); } const bk = mk(new THREE.ConeGeometry(0.012, 0.03, 5), 0x3a3020); bk.rotation.x = Math.PI; bk.position.set(0, -0.02, 0.09); h.add(bk); const lids = []; for (const s of [-1, 1]) { const l = mk(SPH, f); l.scale.set(0.024, 0.024, 0.012); l.position.set(s * 0.035, 0.005, 0.1); h.add(l); lids.push(l); } g.userData = { head: h, lids }; return g; },
    snail() { const g = new THREE.Group(); const b = mk(SPH, M.std('snailb', { color: 0xb8a58a, rough: 0.3 })); b.scale.set(0.018, 0.012, 0.06); b.position.set(0, 0.012, 0.01); g.add(b); const sh = mk(new THREE.TorusGeometry(0.022, 0.014, 10, 18), M.std('shell', { color: 0xa0603a, rough: 0.4 })); sh.position.set(0, 0.035, -0.005); sh.rotation.y = Math.PI / 2; g.add(sh); for (const s of [-1, 1]) { const st = mk(new THREE.CylinderGeometry(0.002, 0.002, 0.025, 4), 0xb8a58a); st.position.set(s * 0.007, 0.03, 0.06); st.rotation.x = 0.4; g.add(st); } return g; },
    mouse() { const g = new THREE.Group(); const f = M.fur(0x9a9088, 'mouse'); const b = mk(SPH, f); b.scale.set(0.032, 0.028, 0.05); b.position.y = 0.03; g.add(b); const h = mk(SPH, f); h.scale.set(0.022, 0.02, 0.028); h.position.set(0, 0.04, 0.05); g.add(h); for (const s of [-1, 1]) { const e = mk(SPH, M.color(0xe8a0a0, 0.6)); e.scale.set(0.014, 0.014, 0.004); e.position.set(s * 0.018, 0.065, 0.04); g.add(e); } eyes(g, 0.012, 0.047, 0.07, 0.005); const t = mk(new THREE.CylinderGeometry(0.003, 0.002, 0.08, 4), M.color(0xe8a0a0)); t.rotation.x = 1.3; t.position.set(0, 0.025, -0.08); g.add(t); return g; },
    butterfly(col) { const g = new THREE.Group(); const wm = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.6 }); const wings = []; for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), wm); w.geometry.translate(s * 0.03, 0, 0); w.rotation.x = -Math.PI / 2; const piv = new THREE.Group(); piv.add(w); g.add(piv); wings.push(piv); } const b = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4), M.color(0x222222)); b.rotation.x = Math.PI / 2; g.add(b); g.userData = { wings }; return g; },
    dragonfly() { const g = MODELS.butterfly(0xbfe0f0); g.children.forEach((c) => c.children && c.children[0] && (c.children[0].scale.set(1.4, 0.35, 1))); g.children[2].material = M.std('dfly', { color: 0x2f8f9a, metal: 0.4, rough: 0.3 }); g.children[2].scale.set(1, 2.2, 1); return g; },
  };
  const TALK = {
    dot: { name: 'Dot', model: 'sparrow', lines() {
      const q = Q('s1');
      if (!q) return [['dot', 'Cheep! Nobody, and I mean NOBODY, can sneak up on Dot. Try it, fuzzy!', 'smug'], ['milo', 'Hmm. If I hid in that bush by the bird bath and kept very still...', 'think'], { do: () => EXT.startQuest('s1', 'hide') }];
      if (q === 'hide') return [['dot', 'Still here? I can see you. Probably. Cheep.', 'smug']];
      return [['dot', 'Cheep. You’re sneaky for something so long.', 'happy']];
    } },
    mabel: { name: 'Mabel', model: 'duck', lines() {
      const q = Q('s2');
      if (!q) return [['mabel', 'Oh, deary me! Pip, Pop, Pud... where is Pat? My littlest duckling waddled off into the park and hasn’t come back!', 'sad'], ['mabel', 'He hides when he’s scared. Somewhere quiet and leafy, I’d wager. Could your clever nose find him?', 'think'], { do: () => EXT.startQuest('s2', 'find') }];
      if (q !== 'done') return [['mabel', 'Any sign of little Pat? Try the quiet corners of the park, dear.', 'sad']];
      return [['mabel', 'Quack! Pat hasn’t left my side since. Thank you, dear ferret.', 'happy']];
    } },
    lily: { name: 'Lily', model: 'frog', lines() {
      const rain = G.env && G.env.rain > 0.4;
      if (rain) return [['lily', 'RIBBIT! Rain, rain, glorious rain! Everything smells of mud. Your nose won’t work half as well today, sweetie.', 'happy']];
      if (S().chapter >= 4) return [['lily', 'I saw a little hedgehog pushing a box under the hedge one night. Grunting like a tiny steam train.', 'think']];
      return [['lily', 'Ribbit. Pond’s a bit dry today. Come back when it rains, we’ll have a party.', 'neutral'], ['lily', 'Tip: in fog, scents hang in the air and last much longer. Frogs know these things.', 'smug']];
    } },
    hoot: { name: 'Hoot', model: 'owl', lines() {
      const night = G.env && G.env.night > 0.5;
      if (!night) return [['hoot', 'Hoo... it is daytime. Owls sleep in the daytime. Ask me again when the moon is up...', 'sleepy'], ['hoot', '...Fine. A piece of paper blew in here years ago. It’s by the ferns. Now let me sleep.', 'sleepy']];
      return [['hoot', 'Hoo! A ferret in Fern Hollow. Few find this place. Fewer find it by squeezing through a log.', 'surprised'], ['hoot', 'I have watched the woods for many years. The old man’s ferret, Juniper, dug her tunnels by moonlight, just as the hedgehog does now.', 'think'], ['hoot', 'And on foggy nights, little lights drift through the trees. Follow them, and they lead here. Hoo.', 'neutral']];
    } },
    shelly: { name: 'Shelly', model: 'snail', lines() { return [['shelly', 'Hellooooo... I’m... going... to the... other end... of the... garden bed.', 'happy'], ['shelly', 'I left... on Tuesday.', 'neutral']]; } },
    crumb: { name: 'Crumb', model: 'mouse', lines() {
      if (S().chapter <= 1) return [['crumb', 'Eek! Oh, it’s only you. Don’t tell the humans about my hole. Or the wall tunnel behind the wardrobe. Oops.', 'surprised']];
      return [['crumb', 'Psst. There’s a secret passage inside the walls, from behind the wardrobe to the garage. The old ferret dug it. Squeak!', 'smug']];
    } },
  };

  /* ================================================================ INTERACTIONS */
  const G_ = game;
  const egg = (id) => { const s = S(); s.eggs = s.eggs || {}; if (s.eggs[id]) return; s.eggs[id] = true; UI().toast('<b>Easter egg found</b>', null, G.EGGS[id]); A.play('secret'); };
  EXT.egg = egg;
  const say = (lines, done) => G_().say(lines, done);
  const think = (t, e = 'think') => [['milo', t, e]];
  const I_ = [];
  const add = (o) => { I_.push(o); G.INTERACT.push(o); };
  // secret passages
  add({ id: 'x_wardrobe', pos: [-7.08, 0, -0.9], r: 0.6, label: 'Squeeze behind the wardrobe', anim: 'sniff', act: () => G_().travel([70.4, UG, 0], Math.PI / 2, () => firstVisit('walls', 'Scratch marks everywhere... "J was here". Juniper dug a passage inside the walls!')) });
  add({ id: 'x_wallBack', pos: [70.3, UG, 0], r: 0.6, label: 'Squeeze out behind the wardrobe', act: () => G_().travel([-6.9, 0, -0.9], Math.PI / 2) });
  add({ id: 'x_wallEnd', pos: [77.1, UG, 2.6], r: 0.6, label: 'Pop out in the garage', act: () => G_().travel([8.55, 0, -0.95], Math.PI) });
  add({ id: 'x_bench', pos: [8.42, 0, -1.4], r: 0.55, label: 'Squeeze into the gap behind the workbench', anim: 'sniff', act: () => G_().travel([77.1, UG, 2.6], -Math.PI / 2) });
  add({ id: 'x_gbox', pos: [12.2, 0, -1.08], r: 0.6, label: 'Push the cardboard box', anim: 'push', when: () => !has('boxMoved'), act: () => pushProp('gbox', 0, 0.75, () => { G_().flag('boxMoved'); A.play('secret'); say(think('A hole in the wall behind the box! It smells old... and a little bit like the red ribbon.', 'surprised')); }) });
  add({ id: 'x_ghole', pos: [12.2, 0, -1.55], r: 0.55, label: 'Crawl into the hole', when: () => has('boxMoved'), act: () => G_().travel([90.3, UG, 0], Math.PI / 2, () => firstVisit('crawl', 'A little crawlspace behind the garage wall. Somebody used to sleep here.')) });
  add({ id: 'x_crawlBack', pos: [90.2, UG, 0], r: 0.6, label: 'Crawl back to the garage', act: () => G_().travel([12.2, 0, -1.2], 0) });
  add({ id: 'x_ycrate', pos: [10.1, 0, -19.9], r: 0.6, label: 'Push the crate', anim: 'push', when: () => !has('ycrateMoved'), act: () => pushProp('ycrate', 0.95, 0, () => { G_().flag('ycrateMoved'); say(think('Soft soil where the crate was. Something might be buried here!', 'surprised')); }) });
  add({ id: 'x_denIn', pos: [-4.7, 0, -21.2], r: 0.6, label: 'Slip into the den', when: () => has('denOpen'), act: () => G_().travel([100.3, UG, 0], Math.PI / 2, () => { firstVisit('den', 'A cosy den under the apple tree roots. It smells strongly of hedgehog.'); if (Q('m3') === 'dig') EXT.setQuest('m3', 'den'); }) });
  add({ id: 'x_denBack', pos: [100.2, UG, 0], r: 0.6, label: 'Climb back up to the garden', act: () => G_().travel([-4.8, 0, -21.6], Math.PI) });
  add({ id: 'x_grate', pos: [-9.2, 0, 12.7], r: 0.65, label: 'Squeeze through the drain grate', anim: 'sniff', when: () => S().chapter >= 2, act: () => G_().travel([110, UG, 0.4], 0, () => firstVisit('drain', 'An old drainpipe running under Maple Street. Drip... drip...')) });
  add({ id: 'x_grateLocked', pos: [-9.2, 0, 12.7], r: 0.65, label: 'Sniff the drain grate', when: () => S().chapter < 2, act: () => say(think('Cold air and dripping water down there. I should get to the bottom of that noise first.')) });
  add({ id: 'x_drainBack', pos: [110, UG, 0.3], r: 0.6, label: 'Climb up to the front yard', act: () => G_().travel([-9.2, 0, 12.4], Math.PI) });
  add({ id: 'x_drainEnd', pos: [110, UG, 14.7], r: 0.6, label: 'Crawl out into the park', act: () => G_().travel([-27.7, 0, 31.3], 0) });
  add({ id: 'x_pipe', pos: [-27.75, 0, 31], r: 0.6, label: 'Crawl into the drainpipe', anim: 'sniff', act: () => G_().travel([110, UG, 14.3], Math.PI) });
  // mission interactions
  add({ id: 'x_freshEarth', pos: [-3.2, 0, -13.6], r: 0.7, label: 'Sniff the fresh earth', anim: 'sniff', when: () => Q('m3') === 'earth', act: () => { A.play('sniff'); say(think('Freshly dug, last night. Tiny paw prints lead away... towards the bird bath.', 'surprised'), () => EXT.setQuest('m3', 'prints')); } });
  add({ id: 'x_prints', pos: [-1.6, 0, -22.4], r: 0.7, label: 'Follow the little footprints', anim: 'sniff', when: () => Q('m3') === 'prints', act: () => { A.play('sniff'); say(think('The prints stop by the apple tree. There’s a soft patch of earth between the roots...', 'think'), () => EXT.setQuest('m3', 'dig')); } });
  add({ id: 'x_appleDig', pos: [-4.7, 0, -20.95], r: 0.7, label: () => (Q('m3') === 'dig' ? 'Dig between the roots' : 'Sniff the roots'), anim: () => (Q('m3') === 'dig' ? 'dig' : 'sniff'), when: () => !has('denOpen'), act: () => {
    if (Q('m3') !== 'dig') { say(think(S().chapter >= 4 ? 'Something small comes and goes here at night. Tilly might know more.' : 'The apple tree roots. Smells like hedgehog, faintly.')); return; }
    digFx(() => { G_().flag('denOpen'); EXT.applyState(); A.play('secret'); say(think('A tunnel entrance! Just my size.', 'surprised')); });
  } });
  // side quest: duckling
  add({ id: 'x_duckling', pos: [33.4, 0, 59.6], r: 0.8, label: 'Nudge the little duckling', anim: 'interact', when: () => Q('s2') === 'find', act: () => { A.play('peep'); say([['pat', 'Peep! ...Peep? You smell nice. Are you taking me to Mama?', 'shy']], () => { EXT.setQuest('s2', 'lead'); EXT.duckFollow = true; }); } });
  // props & furniture
  add({ id: 'x_tv', pos: [-4.5, 0, 0.85], r: 0.7, label: () => (G.World.obj.tvScreen.visible ? 'Switch off the TV' : 'Paw the TV remote'), anim: 'interact', act: () => { const s = G.World.obj.tvScreen; s.visible = !s.visible; EXT.tvLight.int = s.visible ? 0.9 : 0; A.play('tv'); if (s.visible) { egg('tv'); UI().toast('<b>"...and here we see the ferret"</b>', null, '"...famous for its joyful war dance. Truly, nature’s finest creature."'); } } });
  add({ id: 'x_bdoor', pos: [-1.9, 0, 0.45], r: 0.6, label: () => (EXT.doors[0].open ? 'Nudge the bedroom door shut' : 'Nudge the bedroom door open'), anim: 'interact', act: () => toggleDoor(0) });
  add({ id: 'x_kdoor', pos: [3.5, 0, 0.45], r: 0.6, label: () => (EXT.doors[1].open ? 'Nudge the kitchen door shut' : 'Nudge the kitchen door open'), anim: 'interact', act: () => toggleDoor(1) });
  add({ id: 'x_blanket', pos: [-5.5, 0, -3.35], r: 0.7, label: 'Tug the blanket', anim: 'interact', when: () => G.World.obj.ellie.visible && S().chapter !== 6, act: () => { A.play('rustle'); egg('blanket'); say([['ellie', 'Mmmh... five more minutes, Milo...', 'sleepy']]); } });
  add({ id: 'x_cushion', pos: [-4.5, 0, 4.55], r: 0.7, label: 'Burrow under the sofa', anim: 'sniff', act: () => { UI().toast('<b>Hiding</b>', null, 'Stay still under furniture or in bushes to hide. Shy animals come closer.'); } });
  add({ id: 'x_books', pos: [-1.2, 0, 0.75], r: 0.6, label: 'Nose a book off the shelf', anim: 'interact', once: true, when: () => !has('bookFell'), act: () => { G_().flag('bookFell'); spawnProp('book', [-1.4, 0.7, 0.5], [0.2, 1, 1.2]); A.play('thud'); UI().toast('<b>Oops</b>', null, '"A Field Guide to Weasels". Milo will read it later.'); } });
  add({ id: 'x_apple', pos: [3.7, 0.78, -2.8], r: 0.55, label: 'Nudge an apple', anim: 'interact', when: () => !has('appleKnocked'), act: () => { G_().flag('appleKnocked'); spawnProp('apple', [3.6, 0.95, -2.75], [0.9, 0.8, 0.9]); egg('apple'); } });
  add({ id: 'x_jar', pos: [4.45, 0.78, -2.6], r: 0.5, label: 'Sniff the treat jar', anim: 'sniff', act: () => say(think('Sealed. Tragic. Absolutely tragic.', 'sad')) });
  add({ id: 'x_fridge', pos: [7.1, 0, -4.2], r: 0.6, label: 'Sniff the fridge', anim: 'sniff', act: () => say(think('Cheese. There is cheese in there. Somewhere. Sigh.', 'sad')) });
  add({ id: 'x_squeak', pos: [-3.6, 0, 3.9], r: 0.55, label: 'Chomp the squeaky bone', anim: 'interact', act: () => { A.play('squeaktoy'); EXT.props.forEach((p) => { if (p.kind === 'bone' && p.pos.distanceTo(G_().player.pos) < 1) { p.vel.set((Math.random() - 0.5) * 1.5, 2.2, (Math.random() - 0.5) * 1.5); } }); G_().player.happy(); } });
  add({ id: 'x_gnome', pos: [12.2, 0, -26.9], r: 0.6, label: 'Look at the garden gnome', act: () => { egg('gnome'); say(think('The gnome is judging me. I can feel it.', 'surprised')); } });
  add({ id: 'x_bramBowl', pos: [33, 0.35, 7.9], r: 0.5, label: "Steal a kibble from Bram's bowl", anim: 'eat', act: () => { A.play('eat'); const awake = !(S().chapter === 1 || S().chapter === 4 && !has('bramAwake')); say(awake ? [['bram', 'Oi. I saw that.', 'smug']] : think('Crunch. Bram snores on, blissfully unaware.', 'happy')); } });
  for (const [x, y, z] of [[7.8, 0, -6.35], [8.4, 0, -6.55], [1.2, 0, -6.35], [-7.35, 0, -5.3], [1.4, 0, 5.15], [59.4, 0, 9.8], [-0.5, 0, -27]]) add({ id: 'x_flower' + x, pos: [x, y, z], r: 0.55, label: 'Sniff the flowers', anim: 'sniff', act: () => sniffFlower([x, y, z]) });
  // hide-and-seek + dance secrets are checked every frame (see update)

  function firstVisit(id, text) { if (has('visit_' + id)) return; G_().flag('visit_' + id); say(think(text, 'surprised')); }
  function toggleDoor(i) {
    const d = EXT.doors[i]; d.open = !d.open; A.play('door'); d.col.on = !d.open; G_().hashC(d.col);
    const from = d.g.rotation.y, to = d.open ? -1.45 : 0; G_().tween(0.6, (k) => (d.g.rotation.y = U.lerp(from, to, U.smooth(k))));
    if (!d.open) UI().toast('<b>Door closed</b>', null, 'There’s a gap underneath. Just ferret-sized.');
  }
  function pushProp(name, dx, dz, done) {
    const W = G.World, m = W.obj[name], c = W.col[name]; A.play('scrape'); G_().player.act('push', 1.2);
    const ox = m.position.x, oz = m.position.z;
    G_().tween(1.1, (k) => { const e = U.smooth(k); m.position.x = ox + dx * e; m.position.z = oz + dz * e; }, () => { c.x0 += dx; c.x1 += dx; c.z0 += dz; c.z1 += dz; G_().hashC(c); done && done(); });
  }
  function digFx(done) { const g = G_(); g.player.act('dig', 1.5, { lockMove: true }); A.play('dig'); setTimeout(() => A.play('dig'), 600); const iv = setInterval(() => g.dirtBurst(), 280); setTimeout(() => { clearInterval(iv); done(); }, 1500); }
  function sniffFlower(p) { const g = G_(); g.player.act('sniff', 0.9); A.play('sniff'); for (let i = 0; i < 16; i++) g.particles.emit({ x: p[0] + (Math.random() - 0.5) * 0.4, y: 0.35 + Math.random() * 0.3, z: p[2] + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 0.3, vy: 0.2, vz: (Math.random() - 0.5) * 0.3, life: 2, size: 0.03, col: 0xfff08a, glow: true, wander: 0.3 }); setTimeout(() => { g.player.act('sneeze', 0.7); A.play('sneeze'); }, 900); }

  /* ================================================================ QUESTS */
  EXT.startQuest = function (id, step) { const s = S(); s.quests = s.quests || {}; if (s.quests[id]) return; s.quests[id] = step; const q = G.QUESTS[id]; A.play('quest'); UI().toast(`<b>${q.kind}: ${q.title}</b>`, null, q.steps[step]); G_().refreshItems(); G_().autosave(); };
  EXT.setQuest = function (id, step) {
    const s = S(); s.quests = s.quests || {}; s.quests[id] = step; const q = G.QUESTS[id];
    if (step === 'done') { s.flags[id + 'done'] = true; if (id === 'm3') { if (s.chapter === 4) setTimeout(() => G_().c4Check(), 100); } A.play('collect'); UI().toast(`<b>Completed: ${q.title}</b>`, null, q.done); G_().player.happy(); }
    else UI().toast(`<b>${q.title}</b>`, null, q.steps[step]);
    G_().refreshItems(); G_().autosave();
  };
  EXT.sideTarget = function () {
    const s = S(), qs = s.quests || {}, p = G_().player.pos; let best = null, bd = 1e18;
    for (const id in qs) { const st = qs[id]; if (st === 'done' || !G.QUESTS[id]) continue; const t = G.QUESTS[id].target(st); if (!t) continue; const d = U.dist2(t[0], t[2], p.x, p.z) + (t[1] - p.y) ** 2 * 50; if (d < bd) { bd = d; best = t; } }
    return best;
  };
  /* extra NPC lines as the missions progress, appended to the base dialogue */
  const baseD = Object.assign({}, G.DIALOGUE);
  G.DIALOGUE.bram = function () {
    const s = S(), c = s.chapter, asleep = c === 1 || c === 4 && !has('bramAwake');
    if (!asleep && Q('m1') === 'ret' && item('jbell')) return [
      ['milo', "I found this in a hole behind our garage wall. Is it...?", 'think'],
      ['bram', '...Juniper’s bell. Well, I’ll be. She lost it chasing a mouse and sulked for a week.', 'surprised'],
      ['bram', 'Juniper lived in your house, pup. She was Ellie’s first ferret, before Arlo moved away and took her with him.', 'sad'],
      ['bram', 'Keep it. She’d want a ferret to have it. And here, a biscuit for your trouble. Don’t tell my owner.', 'happy'],
      { do: () => { G_().take('jbell'); G_().give('treat'); EXT.setQuest('m1', 'done'); } },
    ];
    const lines = baseD.bram();
    if (!asleep && c >= 2 && !Q('m1') && (c > 2 || ['c2_nora2', 'c2_path'].includes(s.step))) lines.push(
      ['bram', 'One more thing, pup. That ferret I mentioned wore a little brass bell. Jingled everywhere.', 'think'],
      ['bram', 'She lost it in your garage once, chasing a mouse behind the boxes. Never did find it.', 'neutral'],
      { do: () => EXT.startQuest('m1', 'find') });
    if (!asleep && Q('m1') === 'done' && c >= 3 && Math.random() < 0.5) lines.push(['bram', 'You found Juniper’s bell. I still can’t believe it.', 'happy']);
    return lines;
  };
  G.DIALOGUE.nora = function () {
    const s = S(), c = s.chapter, lines = baseD.nora();
    if (c >= 3 && c <= 4 && !Q('m2')) lines.push(
      ['nora', 'Oh, and something I remembered. Years ago, on a windy day, the postman dropped a postcard. It tore into three pieces and blew away.', 'think'],
      ['nora', 'I saw "Ellie" written on one piece. One blew down the drain by your front yard, one behind the shop, and one far into the woods.', 'neutral'],
      { do: () => EXT.startQuest('m2', 'pieces') });
    if (Q('m2') === 'done') lines.push(['nora', 'Arlo’s postcard... he never stopped thinking about her, did he?', 'sad']);
    if (Q('s2') === 'done' && Math.random() < 0.4) lines.push(['nora', 'Mabel told everyone about the ferret who found her duckling. You’re famous!', 'happy']);
    return lines;
  };
  G.DIALOGUE.tilly = function () {
    const s = S(), lines = baseD.tilly();
    if (s.chapter === 4 && !Q('m3')) lines.push(
      ['tilly', 'Something else, weasel. Something digs in your vegetable bed every night. Small. Prickly. Very polite about it.', 'think'],
      ['tilly', 'If you want to understand your shy friend, follow his tracks. Start at the vegetable bed.', 'smug'],
      { do: () => EXT.startQuest('m3', 'earth') });
    if (Q('m1') === 'done' && s.chapter >= 3 && s.chapter <= 4) lines.push(['tilly', 'I heard a bell jingling in your satchel. Juniper’s? She used to chase my mother up trees.', 'smug']);
    return lines;
  };
  G.DIALOGUE.pip = function () {
    const lines = baseD.pip();
    if (S().chapter >= 3 && Q('m2') === 'pieces' && Math.random() < 0.6) lines.push(['pip', 'Paper? Torn paper? Not shiny. Don’t care. Try the drain! Things wash into the drain! Shiny things! Also paper!', 'think']);
    return lines;
  };
  G.DIALOGUE.moss = function () {
    const lines = baseD.moss();
    if (S().chapter === 4 && Q('m3') === 'done' && !has('mossTrust')) lines.unshift(['moss', 'Y-you found my den under the apple tree... and you didn’t touch anything. You really are a friend.', 'happy']);
    return lines;
  };
  /* Moss's den completes Night Tracks; postcard pieces combine */
  EXT.onGive = function (id) {
    if (id === 'quill' && Q('m3') && Q('m3') !== 'done') setTimeout(() => EXT.setQuest('m3', 'done'), 600);
    if (id === 'jbell' && Q('m1') !== 'done') { if (!Q('m1')) S().quests.m1 = 'find'; EXT.setQuest('m1', 'ret'); A.play('bell'); }
    if (/^postcard[123]$/.test(id)) {
      const n = ['postcard1', 'postcard2', 'postcard3'].filter(item).length;
      if (!Q('m2')) EXT.startQuest('m2', 'pieces');
      if (n === 3) setTimeout(() => { ['postcard1', 'postcard2', 'postcard3'].forEach((k) => G_().take(k)); G_().give('postcard'); say([['milo', 'All three pieces fit together! It’s from Grandpa Arlo...', 'surprised'], ['milo', '"Dear Ellie, I’m so sorry. I couldn’t find your music box when I packed. If it ever turns up, wind it and think of me. Love, Grandpa."', 'sad'], ['milo', 'He never meant to lose it. I have to get it back to her.', 'think']], () => EXT.setQuest('m2', 'done')); }, 900);
      else UI().toast('<b>Postcard pieces</b>', null, `${n} of 3 found`);
    }
  };

  /* ================================================================ RUNTIME */
  EXT.props = [];
  function spawnProp(kind, pos, vel) {
    let m, r;
    if (kind === 'apple') { m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.color(0xd9412f, 0.4)); r = 0.05; }
    else if (kind === 'book') { m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.22), M.color(0x2f6d5a, 0.7)); r = 0.08; }
    else if (kind === 'bone') { m = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), M.std('rubber', { color: 0x4fa3d9, rough: 0.4 })); b.rotation.z = Math.PI / 2; m.add(b); for (const s of [-1, 1]) for (const t of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), b.material); k.position.set(s * 0.06, 0, t * 0.015); m.add(k); } r = 0.04; }
    else if (kind === 'ball') { m = G.makeItem('ball'); m.scale.setScalar(1.5); r = 0.06; }
    else if (kind === 'beachball') { m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ map: G.Tex.make('beach', 64, 32, (g) => { ['#e2463b', '#f5f0e0', '#3b7fc4', '#f2d24b', '#f5f0e0', '#5aa84a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 11, 0, 11, 32); }); }), roughness: 0.4 })); r = 0.16; }
    m.traverse((o) => (o.castShadow = true)); G_().scene.add(m);
    const p = { kind, m, r, pos: V3(...pos), vel: V3(...(vel || [0, 0, 0])), grounded: false };
    m.position.copy(p.pos); EXT.props.push(p); return p;
  }
  function updateProps(dt) {
    const g = G_(), pl = g.player;
    for (const p of EXT.props) {
      // Milo nudges balls and toys by running into them
      const dx = p.pos.x - pl.pos.x, dz = p.pos.z - pl.pos.z, d = Math.hypot(dx, dz);
      if (d < p.r + 0.16 && Math.abs(p.pos.y - pl.pos.y) < 0.3 && d > 0.001) { const push = Math.max(pl.speedH, 0.6) * (p.kind === 'beachball' ? 1.3 : 1); p.vel.x = (dx / d) * push * 1.2; p.vel.z = (dz / d) * push * 1.2; if (p.kind === 'beachball' || p.kind === 'ball') { p.vel.y = 1.2; if (!p.bonk || g.t - p.bonk > 0.4) { A.play(p.kind === 'ball' ? 'jingle' : 'bounce'); p.bonk = g.t; } } p.pos.x = pl.pos.x + (dx / d) * (p.r + 0.16); p.pos.z = pl.pos.z + (dz / d) * (p.r + 0.16); }
      p.vel.y -= 9.8 * dt; p.pos.addScaledVector(p.vel, dt);
      // collide with the world
      let ground = p.pos.y < UG + 12 ? UG : 0;
      for (const c of g.near(p.pos.x - 0.3, p.pos.x + 0.3, p.pos.z - 0.3, p.pos.z + 0.3)) {
        if (!c.on) continue; const cx = U.clamp(p.pos.x, c.x0, c.x1), cz = U.clamp(p.pos.z, c.z0, c.z1), ddx = p.pos.x - cx, ddz = p.pos.z - cz, dd = Math.hypot(ddx, ddz);
        if (dd < p.r * 0.5 && c.walk && c.y1 <= p.pos.y + 0.05) ground = Math.max(ground, c.y1);
        else if (dd < p.r && p.pos.y < c.y1 && p.pos.y + p.r > c.y0 && dd > 0.0001) { p.pos.x = cx + (ddx / dd) * p.r; p.pos.z = cz + (ddz / dd) * p.r; const n = V3(ddx / dd, 0, ddz / dd), vn = p.vel.dot(n); if (vn < 0) p.vel.addScaledVector(n, -1.6 * vn); }
      }
      if (p.pos.y - p.r * (p.kind === 'book' ? 0.25 : 1) < ground) { p.pos.y = ground + p.r * (p.kind === 'book' ? 0.25 : 1); if (p.vel.y < -1.5) { p.vel.y *= -0.35; A.play(p.kind === 'apple' || p.kind === 'book' ? 'thud' : 'bounce', 0.5); } else p.vel.y = 0; const fr = Math.exp(-(p.kind === 'book' ? 8 : 1.4) * dt); p.vel.x *= fr; p.vel.z *= fr; }
      p.m.position.copy(p.pos);
      if (p.kind !== 'book') { p.m.rotation.x += (p.vel.z / p.r) * dt; p.m.rotation.z -= (p.vel.x / p.r) * dt; }
    }
  }

  /* ---- background animals */
  EXT.animals = [];
  function addAnimal(o) {
    const m = MODELS[o.model](...(o.args || [])); m.position.set(...o.pos); if (o.scale) m.scale.multiplyScalar(o.scale); G_().scene.add(m);
    const a = Object.assign({ m, home: o.pos.slice(), t: Math.random() * 10, target: null, wait: Math.random() * 3, vis: 1 }, o); EXT.animals.push(a);
    if (o.talk) { const T = TALK[o.talk]; const it = { id: 'a_' + o.talk, pos: [o.pos[0], o.pos[1], o.pos[2]], r: o.r || 0.9, label: () => (a.hiddenNow ? '' : 'Talk to ' + T.name), act: () => talkAnimal(a, T), when: () => !a.hiddenNow && (!a.when || a.when()) }; a.it = it; G.INTERACT.push(it); }
    return a;
  }
  function talkAnimal(a, T) {
    const p = G_().player; p.yaw = Math.atan2(a.m.position.x - p.pos.x, a.m.position.z - p.pos.z); a.talking = true;
    a.m.rotation.y = Math.atan2(p.pos.x - a.m.position.x, p.pos.z - a.m.position.z);
    A.play({ sparrow: 'chirp', duck: 'quack', frog: 'ribbit', owl: 'hoot', snail: 'ui', mouse: 'squeak' }[a.model] || 'ui');
    say(T.lines(), () => (a.talking = false));
  }
  EXT.init = function (g) {
    // names + portraits for the new speakers
    Object.assign(G.NAMES, { dot: 'Dot', mabel: 'Mabel', lily: 'Lily', hoot: 'Hoot', shelly: 'Shelly', crumb: 'Crumb', pat: 'Pat' });
    const P = G.Portrait, shot = (id, model, args) => { const m = MODELS[model](...(args || [])); const box = new THREE.Box3().setFromObject(m), c = box.getCenter(V3()), s = box.getSize(V3()).length(); G.UI.portraitsExtra = G.UI.portraitsExtra || {}; G.UI.portraitsExtra[id] = P.shot('a_' + id, m, V3(c.x + s * 0.35, c.y + s * 0.25, c.z + s * 1.1), c); };
    shot('dot', 'sparrow'); shot('mabel', 'duck'); shot('lily', 'frog'); shot('hoot', 'owl'); shot('shelly', 'snail'); shot('crumb', 'mouse'); shot('pat', 'duck', [0.45, true]);
    const origInit = G.UI.init.bind(G.UI); G.UI.init = function () { origInit(); Object.assign(this.portraits, this.portraitsExtra); };
    // talking animals
    addAnimal({ model: 'sparrow', pos: [-0.2, 0, -22.6], talk: 'dot', beh: 'hopper', rad: 1.2, r: 0.8, id: 'dot' });
    addAnimal({ model: 'sparrow', pos: [5.5, 0, 36.2], beh: 'hopper', rad: 1.5 }); addAnimal({ model: 'sparrow', pos: [4.4, 0, 34.8], beh: 'hopper', rad: 1.5 });
    addAnimal({ model: 'sparrow', pos: [51, 0, 11.5], beh: 'hopper', rad: 1.2 }); addAnimal({ model: 'sparrow', pos: [-2, 0, 9], beh: 'hopper', rad: 1.5 });
    addAnimal({ model: 'duck', pos: [-4.3, 0, 51.6], talk: 'mabel', beh: 'idle', r: 0.9, id: 'mabel', yaw: -1.9 });
    for (let i = 0; i < 3; i++) addAnimal({ model: 'duck', args: [0.45, true], pos: [-10, 0.05, 50], beh: 'swim', rad: 2.2 + i * 0.5, phase: i * 2.1, speed: 0.25 });
    addAnimal({ model: 'duck', pos: [-10, 0.05, 50], beh: 'swim', rad: 3.4, phase: 1, speed: 0.18 });
    EXT.pat = addAnimal({ model: 'duck', args: [0.45, true], pos: [33.4, 0, 59.6], beh: 'pat', id: 'pat' });
    addAnimal({ model: 'frog', pos: [-15.2, 0, 46.6], talk: 'lily', beh: 'frog', r: 0.8, id: 'lily' });
    addAnimal({ model: 'frog', pos: [-78.4, 0, 30], beh: 'frog', rain: true }); addAnimal({ model: 'frog', pos: [2.2, 0, -12.9], beh: 'frog', rain: true });
    addAnimal({ model: 'owl', pos: [-59.4, 0.55, 18.3], talk: 'hoot', beh: 'owl', r: 1.1, id: 'hoot', yaw: -2.3 });
    addAnimal({ model: 'snail', pos: [-2.5, 0.25, -11.32], talk: 'shelly', beh: 'snail', r: 0.6, id: 'shelly' });
    addAnimal({ model: 'mouse', pos: [1.4, 0, -3.4], talk: 'crumb', beh: 'mouse', r: 0.7, id: 'crumb' });
    // butterflies and dragonflies
    const bcols = [0xf2b134, 0xffffff, 0x7fb0e8, 0xe86f9a];
    for (let i = 0; i < 10; i++) { const home = [[-2, -26.5], [4, -26.5], [8, -7.2], [-4, 7], [3, 45], [20, 58], [-20, 52], [55, 10], [-100, 10], [-62, 17]][i]; addAnimal({ model: 'butterfly', args: [bcols[i % 4]], pos: [home[0], 0.5, home[1]], beh: 'fly', rad: 2.5, day: true }); }
    for (let i = 0; i < 5; i++) addAnimal({ model: 'dragonfly', pos: i < 3 ? [-10, 0.4, 50] : [-80, 0.4, 10 + i * 12], beh: 'fly', rad: i < 3 ? 4 : 2, fast: true, day: true });
    // bird flock overhead
    EXT.flock = []; for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0, 0, 0.25, 0.5, 0, 0], 3)), new THREE.MeshBasicMaterial({ color: 0x2a2420, side: THREE.DoubleSide, fog: false })); b.visible = false; g.scene.add(b); EXT.flock.push(b); } EXT.flockT = 20;
    // ripples
    EXT.ripples = []; const rg = new THREE.RingGeometry(0.8, 1, 24); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 24; i++) { const r = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xe0f0ff, transparent: true, opacity: 0, depthWrite: false })); r.visible = false; g.scene.add(r); EXT.ripples.push({ m: r, t: 9 }); }
    // props
    spawnProp('ball', [-3.1, 0.06, 2.6]); spawnProp('beachball', [9, 0.16, 40.5]); spawnProp('bone', [-3.6, 0.04, 3.7]);
    // water flows
    const wm = G.Mat.get('water'); wm.map = G.Tex.get('water').clone(); wm.map.needsUpdate = true; wm.map.repeat.set(1, 1); wm.color.setHex(0x78c0cc); wm.needsUpdate = true;
    // wrap existing interactions to add Easter eggs, and hooks
    const wrap = (id, f) => { const it = G.INTERACT.find((i) => i.id === id); if (it) { const o = it.act; it.act = () => { o(); f(); }; } };
    wrap('mirror', () => egg('mirror')); wrap('cave', () => egg('echo'));
    const oGive = g.give.bind(g); g.give = function (id, n) { oGive(id, n); EXT.onGive(id); };
    const oPick = g.pickUp.bind(g); g.pickUp = function (w) { oPick(w); if (w.def.id === 's_bottle') { egg('bottle'); say(think('A note inside: "If found, please return to the SEA. — Gerald, age 8." ...The creek is doing its best, Gerald.', 'happy')); } if (w.def.id === 's_chicken') A.play('squeaktoy'); };
    // digging spots
    EXT.mounds = {};
    for (const d of DIGS) {
      const mm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M.get('dirt')); mm.scale.set(1, 0.3, 1); mm.position.set(d.pos[0], d.pos[1], d.pos[2]); mm.receiveShadow = true; g.scene.add(mm); EXT.mounds[d.id] = mm;
      for (let k = 0; k < 4; k++) { const pb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03), M.get('rock')); pb.position.set(d.pos[0] + Math.cos(k * 1.7) * 0.25, 0.015, d.pos[2] + Math.sin(k * 1.7) * 0.25); mm.add(pb); pb.position.sub(mm.position); pb.position.divide(mm.scale); }
      G.INTERACT.push({ id: 'dig_' + d.id, pos: d.pos, r: 0.6, label: 'Dig in the soft soil', anim: 'dig', when: () => !(S().dug || {})[d.id] && (!d.hiddenBy || has('ycrateMoved')), act: () => digSpot(d) });
    }
  };
  function digSpot(d) {
    digFx(() => {
      const s = S(); s.dug = s.dug || {}; s.dug[d.id] = true; EXT.mounds[d.id].visible = false;
      const [t, sub] = LOOT[d.loot];
      if (d.loot === 'treat') G_().give('treat'); else if (d.loot === 'glowstone') G_().giveCollectible('s_glowstone'); else { A.play('pickup'); UI().toast(`<b>${t}</b>`, null, sub); }
      if (d.loot === 'bone') egg('bone');
      if (G.env.rain > 0.4) setTimeout(() => UI().toast('<b>A wiggly worm</b>', null, 'Rain brings the worms up. Milo politely lets it go.'), 900);
      const n = Object.keys(s.dug).length; if (n === DIGS.length) UI().toast('<b>Master digger</b>', null, 'Every soft spot dug. Ellie’s mum would be horrified.');
    });
  }

  EXT.applyState = function () {
    const W = G.World, f = S().flags;
    // restore pushed props after loading
    const place = (name, flag, dx, dz, bx, bz) => { const m = W.obj[name], c = W.col[name]; if (!m) return; const moved = !!f[flag]; m.position.x = bx + (moved ? dx : 0); m.position.z = bz + (moved ? dz : 0); const hw = (c.x1 - c.x0) / 2, hd = (c.z1 - c.z0) / 2; c.x0 = m.position.x - hw; c.x1 = m.position.x + hw; c.z0 = m.position.z - hd; c.z1 = m.position.z + hd; G_().hashC(c); };
    place('gbox', 'boxMoved', 0, 0.75, 12.2, -1.62); place('ycrate', 'ycrateMoved', 0.95, 0, 10.1, -20.6);
    if (W.obj.denHole) { W.obj.denHole.visible = !!f.denOpen; W.obj.denMound.visible = !f.denOpen; }
    const dug = S().dug || {}; for (const id in EXT.mounds) EXT.mounds[id].visible = !dug[id];
  };

  /* improved scent vision: weather matters */
  EXT.scentDuration = function () { const e = G.env || {}; return e.rain > 0.4 ? 6 : e.fog > 0.5 ? 13 : 9; };
  EXT.onScent = function () {
    const e = G.env, s = S(); s.flags = s.flags || {};
    if (e.rain > 0.4 && !has('tipRain')) { G_().flag('tipRain'); UI().toast('<b>Rain washes scents away</b>', null, 'Scent vision fades faster in the rain.'); }
    if (e.fog > 0.5 && !has('tipFog')) { G_().flag('tipFog'); UI().toast('<b>Scents hang in the fog</b>', null, 'Scent vision lasts longer in fog.'); }
    if (EXT.sideTarget() && !has('tipGreen')) { G_().flag('tipGreen'); UI().toast('<b>Two trails</b>', null, 'Gold leads to the main story, green to your other quests.'); }
    // sniff out hidden things nearby
    const p = G_().player.pos;
    for (const w of G_().worldItems) { const d = w.def; if (d.scentOnly && !has('sniffed_' + d.id) && U.dist2(d.pos[0], d.pos[2], p.x, p.z) < 196 && Math.abs(d.pos[1] - p.y) < 3) { G_().flag('sniffed_' + d.id); G_().refreshItems(); UI().toast('<b>Your nose found something!</b>', null, 'Something hidden is glowing nearby.'); } }
  };

  /* ---- per-frame update */
  const tmp = V3();
  EXT.update = function (dt, st) {
    const g = G_(), s = S(), env = G.env || {}, pl = g.player, t = g.t;
    s.quests = s.quests || {}; s.clues = s.clues || {}; s.eggs = s.eggs || {};
    updateAnimals(dt, env);
    updateProps(dt);
    updateAmbientLife(dt, env);
    if (st !== 'play') { EXT.hidden = false; pl.hiding = false; return; }
    // hiding: stand still under furniture or in a bush
    const inBush = HIDES.some(([x, z, r]) => U.dist2(x, z, pl.pos.x, pl.pos.z) < r * r) && pl.pos.y < 0.3;
    const still = pl.speedH < 0.15 && pl.grounded;
    EXT.hideT = still && (inBush || pl.overhead < 0.5) ? (EXT.hideT || 0) + dt : 0;
    const hidden = EXT.hideT > 0.6; if (hidden !== EXT.hidden) { EXT.hidden = hidden; document.getElementById('hiddenChip').hidden = !hidden; if (hidden && !has('tipHide')) { g.flag('tipHide'); UI().toast('<b>Hidden</b>', null, 'Shy animals come closer while Milo stays still.'); } }
    pl.hiding = hidden;
    if (hidden && g.npcs.moss) g.npcs.moss.scared = 0;
    // Sneaky Sparrow
    if (Q('s1') === 'hide' && hidden && U.dist2(-2.8, -25.2, pl.pos.x, pl.pos.z) < 1.3) { EXT.s1T = (EXT.s1T || 0) + dt; if (EXT.s1T > 3.5) { EXT.s1T = 0; const dot = EXT.animals.find((a) => a.id === 'dot'); dot.target = [pl.pos.x + 0.35, 0, pl.pos.z + 0.35]; setTimeout(() => say([['dot', 'CHEEP?! Where did YOU come from?!', 'surprised'], ['dot', 'Fine. FINE. You win, sneaky. Take this, a genuine Dot feather.', 'happy']], () => { g.giveCollectible('c_featherS'); EXT.setQuest('s1', 'done'); }), 700); } } else EXT.s1T = 0;
    // Lost duckling follows Milo home
    if (Q('s2') === 'lead' && EXT.pat) { if (Math.hypot(pl.pos.x + 10, pl.pos.z - 50) < 7.5) { EXT.duckFollow = false; EXT.pat.beh = 'swim'; EXT.pat.home = [-10, 0.05, 50]; EXT.pat.rad = 1.6; EXT.pat.speed = 0.3; A.play('quack'); say([['mabel', 'PAT! Oh, my little Pat! Quack quack!', 'happy'], ['mabel', 'Thank you, dear. Here, a feather from my best Sunday plumage.', 'happy']], () => { g.giveCollectible('c_featherD'); EXT.setQuest('s2', 'done'); }); } }
    // dance secrets
    if (pl.action === 'dance' && !EXT.danced) {
      EXT.danced = true;
      if (Math.hypot(pl.pos.x + 100, pl.pos.z - 10) < 2.7 && env.night > 0.5 && !g.gotC('s_moonshroom')) { egg('fairy'); for (let i = 0; i < 40; i++) { const a = (i / 40) * 6.28; g.particles.emit({ x: -100 + Math.cos(a) * 3, y: 0.2, z: 10 + Math.sin(a) * 3, vx: -Math.sin(a) * 0.8, vy: 0.6, vz: Math.cos(a) * 0.8, life: 2.5, size: 0.08, col: 0xbfffd0, glow: true }); } setTimeout(() => g.giveCollectible('s_moonshroom'), 1200); }
      for (const id in g.npcs) { const n = g.npcs[id]; if (!n.hidden && n.c.root.position.distanceTo(pl.pos) < 3.5) { n.c.setEmote('happy'); if (id === 'bram' && !(s.chapter === 1 || s.chapter === 4 && !has('bramAwake'))) { egg('bramDance'); A.play('woof'); UI().toast('<b>Bram:</b>', null, '"Hrrf-hrrf-hrrf! Ha! You silly pup."'); } } }
    }
    if (pl.action !== 'dance') EXT.danced = false;
    // Night Tracks can also start by sniffing the vegetable bed in chapter 4
    if (s.chapter === 4 && !Q('m3') && U.dist2(-4.2, -12.9, pl.pos.x, pl.pos.z) < 2 && pl.action === 'dig') EXT.startQuest('m3', 'earth');
    // clues
    EXT.clueT = (EXT.clueT || 0) - dt;
    if (EXT.clueT <= 0) { EXT.clueT = 1; const fresh = []; for (const [id, text, cond] of G.CLUES) { if (!s.clues[id]) { let ok = false; try { ok = cond(); } catch (e) {} if (ok) { s.clues[id] = true; fresh.push(text); } } } if (fresh.length && fresh.length <= 2 && s.playTime > 5) { A.play('clue'); for (const text of fresh) UI().toast('<b>New clue in your journal</b>', null, text.length > 80 ? text.slice(0, 78) + '…' : text); } }
    // rain showers in the calmer chapters
    weatherTick(dt);
    updateHUD(dt, env);
    // water flow
    const wm = G.Mat.get('water'); if (wm.map) { wm.map.offset.y -= dt * 0.08; wm.map.offset.x = Math.sin(t * 0.3) * 0.02; }
  };

  function weatherTick(dt) {
    const s = S(); if (G.settings.weather !== 'story' || ![2, 6].includes(s.chapter)) return;
    EXT.wT = (EXT.wT === undefined ? 300 + Math.random() * 200 : EXT.wT) - dt;
    if (EXT.wT <= 0) {
      if (s.weather === 'rain') { s.weather = 'clear'; EXT.wT = 360 + Math.random() * 240; UI().toast('<b>The rain stops</b>', null, 'Everything smells fresh again.'); }
      else { s.weather = Math.random() < 0.7 ? 'rain' : 'cloudy'; EXT.wT = 150; if (s.weather === 'rain') UI().toast('<b>A spring shower</b>', null, 'Frogs come out, birds shelter, scents fade faster.'); }
    }
  }

  function updateHUD(dt, env) {
    // weather chip
    const wc = document.getElementById('weatherChip'); const w = G.Weather && G.game.weatherNow.storm > 0.5 && env.rain > 0.4 ? 'storm' : env.rain > 0.4 ? 'rain' : env.fog > 0.5 ? 'fog' : null;
    if (w !== EXT.wShown) { EXT.wShown = w; wc.hidden = !w || env.ug; wc.innerHTML = w === 'storm' ? '<svg viewBox="0 0 24 24"><path d="M4 11a8 8 0 0116 0z"/><path d="M13 12l-3 5h4l-3 5"/></svg><b>Storm</b>&nbsp;stay under cover' : w === 'rain' ? '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0116 0z"/><path d="M12 12v7a2 2 0 01-4 0"/></svg><b>Rain</b>&nbsp;scents fade fast' : w === 'fog' ? '<svg viewBox="0 0 24 24"><path d="M3 8h18M5 12h14M3 16h18"/></svg><b>Fog</b>&nbsp;scents linger' : ''; }
    if (wc) wc.hidden = !w || !!env.ug || !!(env.area && env.area.indoor);
    // scent compass arrow
    const g = G_(), arr = document.getElementById('scentArrow');
    if (g.scentT > 0) {
      const tgt = UI().objTarget(); const p = g.player.pos;
      if (tgt && U.dist2(tgt[0], tgt[2], p.x, p.z) > 16) {
        tmp.set(tgt[0], tgt[1] + 0.2, tgt[2]).project(g.camera); let ax = tmp.x, ay = -tmp.y; if (tmp.z > 1) { ax = -ax; ay = -ay; }
        const ang = Math.atan2(ay, ax), rad = Math.min(innerWidth, innerHeight) * 0.28;
        arr.style.transform = `translate(${Math.cos(ang) * rad}px, ${Math.sin(ang) * rad}px)`; arr.querySelector('svg').style.transform = `rotate(${ang + Math.PI / 2}rad)`;
        const d = Math.round(Math.hypot(tgt[0] - p.x, tgt[2] - p.z)); arr.querySelector('span').textContent = d > 60 ? 'far away' : d + ' m';
        arr.classList.add('on');
      } else arr.classList.remove('on');
    } else arr.classList.remove('on');
  }

  function updateAnimals(dt, env) {
    const g = G_(), pl = g.player, day = (env.night || 0) < 0.5, rain = (env.rain || 0) > 0.4, t = g.t;
    for (const a of EXT.animals) {
      a.t += dt; const m = a.m, u = m.userData;
      // visibility rules
      let show = true;
      if (a.day && (!day || rain)) show = false;
      if (a.beh === 'hopper' && rain) show = false;
      if (a.rain && !rain) show = false;
      if (a.beh === 'pat' && Q('s2') === 'done') show = false;
      if (a.fled > 0) { a.fled -= dt; show = false; if (a.fled <= 0) m.position.set(...a.home); }
      if (a.beh === 'mouse' && a.hideT > 0) { a.hideT -= dt; show = false; }
      a.hiddenNow = !show; m.visible = show; if (!show) continue;
      if (a.it) { a.it.pos[0] = m.position.x; a.it.pos[1] = m.position.y; a.it.pos[2] = m.position.z; }
      const dxp = pl.pos.x - m.position.x, dzp = pl.pos.z - m.position.z, dp = Math.hypot(dxp, dzp);
      if (a.talking) continue;
      const faceMove = (tx, tz, sp) => { const dx = tx - m.position.x, dz = tz - m.position.z, l = Math.hypot(dx, dz); if (l < 0.03) return true; m.position.x += (dx / l) * Math.min(sp * dt, l); m.position.z += (dz / l) * Math.min(sp * dt, l); m.rotation.y = U.dampAngle(m.rotation.y, Math.atan2(dx, dz), 10, dt); return false; };
      switch (a.beh) {
        case 'hopper': {
          // flee from a running ferret unless he's hidden
          if (!(a.flying > 0) && a.id !== 'dot' && (dp < 2 && pl.speedH > 2 && !EXT.hidden || dp < 0.9 && pl.speedH > 0.8)) { a.flying = 1.2; a.fled = 0; A.play('flutter'); }
          if (a.flying > 0) { a.flying -= dt; m.position.y += dt * 3; m.position.x -= (dxp / (dp || 1)) * dt * 3; m.position.z -= (dzp / (dp || 1)) * dt * 3; u.wings.forEach((w, i) => (w.rotation.z = Math.sin(t * 40) * (i ? 1 : -1))); if (a.flying <= 0) a.fled = 8; break; }
          a.wait -= dt; if (!a.target && a.wait <= 0) { const an = Math.random() * 6.28, r = Math.random() * a.rad; a.target = [a.home[0] + Math.cos(an) * r, 0, a.home[2] + Math.sin(an) * r]; }
          if (a.target) { const done = faceMove(a.target[0], a.target[2], 0.8); m.position.y = Math.abs(Math.sin(a.t * 14)) * 0.03; if (done) { a.target = null; a.wait = 0.8 + Math.random() * 2.5; } }
          else { m.position.y = 0; u.head.rotation.x = Math.sin(a.t * 3) > 0.7 ? 0.9 : 0; if (Math.random() < dt * 0.15 && dp < 12) A.play('chirp', 0.4); }
          u.wings.forEach((w) => (w.rotation.z = 0)); break;
        }
        case 'swim': { const ang = a.t * (a.speed || 0.25) + (a.phase || 0); const x = a.home[0] + Math.cos(ang) * a.rad, z = a.home[2] + Math.sin(ang) * a.rad; m.position.set(x, 0.04 + Math.sin(a.t * 2) * 0.006, z); m.rotation.y = -ang; if (Math.random() < dt * 0.6) ripple(x, z, 0.3); if (Math.random() < dt * 0.05 && dp < 15) A.play('quack', 0.4); break; }
        case 'idle': { if (u.head) u.head.rotation.y = Math.sin(a.t * 0.7) * 0.5; if (dp < 3) m.rotation.y = U.dampAngle(m.rotation.y, Math.atan2(dxp, dzp), 3, dt); break; }
        case 'pat': {
          if (EXT.duckFollow && Q('s2') === 'lead') { const f = g.player.fwd(); const tx = pl.pos.x - f.x * 0.6, tz = pl.pos.z - f.z * 0.6; if (Math.hypot(tx - m.position.x, tz - m.position.z) > 0.25) { faceMove(tx, tz, Math.max(1.2, pl.speedH * 1.05)); m.position.y = Math.abs(Math.sin(a.t * 12)) * 0.02; } if (Math.random() < dt * 0.5) A.play('peep', 0.5); }
          else { m.position.y = 0; if (Math.random() < dt * 0.3 && dp < 8) A.play('peep', 0.4); }
          break;
        }
        case 'frog': { a.wait -= dt; if (a.wait <= 0) { a.wait = 3 + Math.random() * 5; a.hop = 0.5; a.hopDir = Math.random() * 6.28; if (dp < 10) A.play('ribbit', 0.6); } if (a.hop > 0) { a.hop -= dt; const k = 1 - a.hop / 0.5; m.position.y = Math.sin(k * Math.PI) * 0.1; const nx = m.position.x + Math.sin(a.hopDir) * dt * 0.8, nz = m.position.z + Math.cos(a.hopDir) * dt * 0.8; if (U.dist2(nx, nz, a.home[0], a.home[2]) < 1.5) { m.position.x = nx; m.position.z = nz; } m.rotation.y = a.hopDir; } u.throat.scale.setScalar(1 + Math.max(0, Math.sin(a.t * 9)) * (a.wait > 2.6 ? 0.6 : 0)); break; }
        case 'owl': { const night = (env.night || 0) > 0.5; u.lids.forEach((l) => (l.visible = !night)); u.head.rotation.y = night ? Math.sin(a.t * 0.4) * 1.4 + (dp < 4 ? U.angDiff(m.rotation.y, Math.atan2(dxp, dzp)) * 0.6 : 0) : 0; if (night && Math.random() < dt * 0.05) A.play('hoot', 0.5); break; }
        case 'snail': { const k = (Math.sin(a.t * 0.02) + 1) / 2; m.position.x = U.lerp(-3.7, -1.3, k); m.rotation.y = Math.cos(a.t * 0.02) > 0 ? Math.PI / 2 : -Math.PI / 2; break; }
        case 'mouse': {
          if (dp < 2.2 && pl.speedH > 1 && !EXT.hidden) { a.fleeing = true; }
          if (a.fleeing) { if (faceMove(0.4, -3.18, 3)) { a.fleeing = false; a.hideT = 5; A.play('squeak', 0.6); m.position.set(...a.home); } break; }
          a.wait -= dt; if (!a.target && a.wait <= 0) a.target = [1 + Math.random() * 2.5, 0, -4.4 + Math.random() * 2.4];
          if (a.target && faceMove(a.target[0], a.target[2], 0.9)) { a.target = null; a.wait = 1 + Math.random() * 3; }
          break;
        }
        case 'fly': { const sp = a.fast ? 1.4 : 0.5; const x = a.home[0] + Math.sin(a.t * sp * 0.7 + a.home[0]) * a.rad, z = a.home[2] + Math.cos(a.t * sp * 0.5 + a.home[2]) * a.rad; const y = a.home[1] + Math.sin(a.t * 2.3) * 0.25 + 0.2; const dx = x - m.position.x, dz = z - m.position.z; m.position.set(x, y, z); m.rotation.y = Math.atan2(dx, dz); u.wings.forEach((w, i) => (w.rotation.z = Math.sin(a.t * (a.fast ? 60 : 18)) * 0.9 * (i ? 1 : -1))); break; }
      }
    }
  }
  function ripple(x, z, s) { const r = EXT.ripples.find((q) => q.t >= 1.6); if (!r) return; r.t = 0; r.s = s; r.m.position.set(x, 0.075, z); r.m.visible = true; }
  function updateAmbientLife(dt, env) {
    const g = G_(), cp = g.camera.position, p = g.player.pos;
    for (const r of EXT.ripples) { if (r.t < 1.6) { r.t += dt; const k = r.t / 1.6; r.m.scale.setScalar(0.1 + k * r.s * 3); r.m.material.opacity = (1 - k) * 0.4; if (r.t >= 1.6) r.m.visible = false; } }
    // rain ripples on the pond and creek, fish/insect ripples otherwise
    const nearPond = Math.hypot(p.x + 10, p.z - 50) < 25, nearCreek = p.x < -60 && p.x > -100;
    if (nearPond && Math.random() < dt * (env.rain > 0.4 ? 14 : 0.8)) { const a = Math.random() * 6.28, rr = Math.random() * 4.6; ripple(-10 + Math.cos(a) * rr, 50 + Math.sin(a) * rr, env.rain > 0.4 ? 0.12 : 0.25); }
    if (nearCreek && env.rain > 0.4 && Math.random() < dt * 10) ripple(-81.5 + Math.random() * 3, p.z + (Math.random() - 0.5) * 16, 0.1);
    // bird flocks cross the sky by day
    EXT.flockT -= dt;
    if (EXT.flockT <= 0 && !env.ug && (env.night || 0) < 0.4 && env.rain < 0.4) { EXT.flockT = 35 + Math.random() * 40; const a = Math.random() * 6.28; EXT.flockDir = V3(Math.cos(a), 0, Math.sin(a)); EXT.flockPos = V3(p.x - EXT.flockDir.x * 70, 22 + Math.random() * 8, p.z - EXT.flockDir.z * 70); EXT.flockLife = 14; if (!env.indoor) setTimeout(() => A.play('flock'), 3000); }
    if (EXT.flockLife > 0) { EXT.flockLife -= dt; EXT.flockPos.addScaledVector(EXT.flockDir, dt * 11); EXT.flock.forEach((b, i) => { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; b.visible = EXT.flockLife > 0; b.position.set(EXT.flockPos.x - EXT.flockDir.x * row * 2 + -EXT.flockDir.z * side * row * 1.6, EXT.flockPos.y + Math.sin(g.t * 3 + i) * 0.3, EXT.flockPos.z - EXT.flockDir.z * row * 2 + EXT.flockDir.x * side * row * 1.6); b.rotation.y = Math.atan2(EXT.flockDir.x, EXT.flockDir.z); b.scale.set(1, 1, 1); b.rotation.z = Math.sin(g.t * 9 + i) * 0.4; }); }
    // falling apple-tree leaves in the backyard, gnats around lamps at night
    if (Math.random() < dt * 0.6 && Math.hypot(p.x + 4, p.z + 20) < 14 && !env.indoor) g.particles.emit({ x: -4 + (Math.random() - 0.5) * 3, y: 3.4, z: -20 + (Math.random() - 0.5) * 3, vx: 0.1, vy: -0.35, vz: 0.05, life: 8, size: 0.06, col: 0x8a9a3a, leaf: true, wander: 0.5 });
    // fog wisps lead to Fern Hollow
    if ((env.fog || 0) > 0.5 && p.x < -50 && Math.random() < dt * 2.5) { const path = [[-72, 29], [-70.5, 31.5], [-67, 28.5], [-63.6, 26], [-62, 24]]; const i = Math.floor(Math.random() * (path.length - 1)), k = Math.random(); const x = U.lerp(path[i][0], path[i + 1][0], k), z = U.lerp(path[i][1], path[i + 1][1], k); g.particles.emit({ x, y: 0.5 + Math.random() * 0.4, z, vx: (path[i + 1][0] - path[i][0]) * 0.08, vy: 0.02, vz: (path[i + 1][1] - path[i][1]) * 0.08, life: 3.5, size: 0.14, col: 0x9fe8ff, glow: true, wander: 0.1 }); }
  }

  /* ================================================================ JOURNAL (quests + clues) */
  EXT.panels.quests = function () {
    const s = S(), box = document.getElementById('questBody'); const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const CH = [['The Noise', 1], ['The Trail', 2], ['The Forest', 3], ['The Mystery', 4], ['Home', 5]];
    let h = '<h3>Main story</h3><div class="qlist">';
    for (const [title, n] of CH) { const done = s.chapter > n, act = s.chapter === n; if (n > s.chapter) { h += `<div class="q"><i></i><div><b>Chapter ${n}: ???</b></div></div>`; continue; } h += `<div class="q ${done ? 'done' : 'active'}"><i></i><div><b>Chapter ${n}: ${title}</b>${act && G.STEPS[s.step] ? `<small>${esc(G.STEPS[s.step].text)}</small>` : '<small>Complete</small>'}</div></div>`; }
    if (s.chapter >= 6) h += '<div class="q done"><i></i><div><b>Epilogue</b><small>The music box is home.</small></div></div>';
    h += '</div>';
    const qs = s.quests || {}; const ids = Object.keys(G.QUESTS);
    for (const kind of ['Story mission', 'Side quest']) {
      h += `<h3>${kind === 'Story mission' ? 'Story missions' : 'Side quests'}</h3><div class="qlist">`; let any = false;
      for (const id of ids) { const q = G.QUESTS[id]; if (q.kind !== kind) continue; const st = qs[id]; any = true; if (!st) { h += `<div class="q"><i></i><div><b>${esc(q.title)}</b><small>Not started. Someone around town might need help${kind === 'Story mission' ? ' (' + q.giver + ')' : ''}.</small></div></div>`; continue; } h += `<div class="q ${st === 'done' ? 'done' : 'active'}"><i></i><div><b>${esc(q.title)}<span class="tag">${esc(q.giver)}</span></b><small>${esc(st === 'done' ? q.done : q.steps[st])}${id === 'm2' && st !== 'done' ? ` (${['postcard1', 'postcard2', 'postcard3'].filter(item).length}/3)` : ''}</small></div></div>`; }
      if (!any) h += '<p class="note">None yet.</p>'; h += '</div>';
    }
    const cl = G.CLUES.filter(([id]) => (s.clues || {})[id]);
    h += `<h3>Clues (${cl.length}/${G.CLUES.length})</h3>` + (cl.length ? '<div class="clues">' + cl.map(([, t]) => `<div class="clue">${esc(t)}</div>`).join('') + '</div>' : '<p class="note">Nothing yet. Keep your nose to the ground.</p>');
    const dug = Object.keys(s.dug || {}).length, eggs = s.eggs || {};
    h += `<h3>Secrets</h3><p class="note">Digging spots found: ${dug}/${DIGS.length} · Secret places visited: ${['walls', 'crawl', 'den', 'drain'].filter((k) => s.flags['visit_' + k]).length + (s.discovered.fernhollow ? 1 : 0) + (s.discovered.shedback ? 1 : 0) + (s.discovered.dumpster ? 1 : 0)}/7</p><div class="eggs">` + Object.entries(G.EGGS).map(([k, n]) => `<span class="${eggs[k] ? 'got' : ''}">${eggs[k] ? esc(n) : '???'}</span>`).join('') + '</div>';
    box.innerHTML = h;
  };

  /* ================================================================ ITEM MODELS + SOUNDS */
  const baseMake = G.makeItem;
  G.makeItem = function (id) {
    if (/^postcard[123]$/.test(id)) id = 'postcard';
    const g = new THREE.Group(), add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    switch (id) {
      case 'jbell': { const b = baseMake('bell'); b.position.y = 0.005; g.add(b); const r = baseMake('ribbon'); r.scale.setScalar(0.6); r.position.set(0.035, 0, 0); g.add(r); return g; }
      case 'postcard': { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), new THREE.MeshStandardMaterial({ map: G.Tex.make('postcard', 128, 96, (c) => { c.fillStyle = '#efe3c4'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#6a8fb0'; c.fillRect(96, 8, 24, 28); c.strokeStyle = '#4a3624'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(10, 30 + i * 12); c.lineTo(80, 30 + i * 12); c.stroke(); } c.fillStyle = '#4a3624'; c.font = 'italic 12px Georgia'; c.fillText('Dear Ellie,', 10, 20); }), roughness: 0.9, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = 0.5; add(m, 0, 0.004, 0); return g; }
      case 'quill': { const m = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.1, 5), M.color(0x4a3524, 0.7)); m.rotation.z = Math.PI / 2; add(m, 0, 0.008, 0); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 5), M.color(0xe8dcc4, 0.7)); tip.rotation.z = -Math.PI / 2; add(tip, 0.06, 0.008, 0); return g; }
      case 'figure': { const f = new G.Ferret(); f.update(0.016, { speed: 0 }); f.root.scale.setScalar(0.18); f.shadow.visible = false; g.add(f.root); add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.012, 16), M.get('brass')), 0, 0.006, 0); f.root.position.y = 0.012; return g; }
      case 'chicken': { add(new THREE.Mesh(SPH, M.std('rchick', { color: 0xf2d24b, rough: 0.35 })), 0, 0.03, 0).scale.set(0.02, 0.02, 0.06); add(new THREE.Mesh(SPH, M.get('rchick' in M.cache ? 'rchick' : 'red')), 0, 0.04, 0.06).scale.setScalar(0.018); add(new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 5), M.color(0xe87b27, 0.4)), 0, 0.04, 0.08).rotation.x = Math.PI / 2; add(new THREE.Mesh(SPH, M.color(0xd9412f, 0.5)), 0, 0.058, 0.06).scale.set(0.004, 0.01, 0.01); return g; }
      case 'telescope': { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.12, 12), M.get('brass')), 0, 0.02, 0); m.rotation.z = Math.PI / 2 - 0.2; add(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 12), M.color(0x2a2420, 0.5)), 0.05, 0.03, 0).rotation.z = Math.PI / 2 - 0.2; return g; }
      case 'bottle': { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.09, 12), M.std('bottleg', { color: 0x7fb08a, rough: 0.05, transparent: true, opacity: 0.6, envI: 1.5 })), 0, 0.022, 0); m.rotation.z = Math.PI / 2; add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), M.color(0x9c6b3a)), 0.055, 0.022, 0).rotation.z = Math.PI / 2; add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), M.color(0xefe3c4)), 0, 0.022, 0).rotation.z = Math.PI / 2; return g; }
      case 'glowstone': { add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.028, 0), M.get('mushroom')), 0, 0.025, 0); return g; }
      case 'gnomehat': { add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), M.color(0xc0392b, 0.6)), 0, 0.045, 0).rotation.z = 0.3; return g; }
      case 'biscuit': { const s = new THREE.Shape(); s.moveTo(-0.03, -0.01); s.lineTo(0.03, -0.01); s.absarc(0.035, 0.0, 0.012, -Math.PI / 2, Math.PI / 2); s.lineTo(-0.03, 0.01); s.absarc(-0.035, 0, 0.012, Math.PI / 2, Math.PI * 1.5); const m = add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), M.color(0xc9924a, 0.8)), 0, 0.001, 0); m.rotation.x = -Math.PI / 2; return g; }
      case 'clover': { for (let i = 0; i < 4; i++) { const l = add(new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), M.std('clover', { color: 0x4fa83a, rough: 0.6, side: THREE.DoubleSide })), Math.cos(i * 1.57) * 0.012, 0.03, Math.sin(i * 1.57) * 0.012); l.rotation.x = -Math.PI / 2; } add(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 4), M.color(0x3f7a2a)), 0, 0.015, 0); return g; }
      case 'moonshroom': { add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.04, 8), M.color(0xf2ebe0)), 0, 0.02, 0); const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.std('moonshroom', { color: 0xcfe0ff, emissive: 0x9fb8ff, ei: 1.2 })), 0, 0.04, 0); return g; }
    }
    return baseMake(id);
  };
  const basePlay = A.play.bind(A);
  A.play = function (name, v = 1) {
    if (!A.ready) return; const R = Math.random;
    switch (name) {
      case 'chirp': A.bird(0.8 * v); return;
      case 'quack': for (let i = 0; i < 2; i++) A.tone({ f: 420, f2: 320, type: 'sawtooth', dur: 0.12, vol: 0.05 * v, lp: 1400, delay: i * 0.16 }); return;
      case 'peep': A.tone({ f: 2600, f2: 3100, dur: 0.07, vol: 0.04 * v }); return;
      case 'ribbit': for (let i = 0; i < 2; i++) A.tone({ f: 190, f2: 140, type: 'square', dur: 0.09, vol: 0.05 * v, lp: 700, delay: i * 0.13 }); return;
      case 'hoot': A.owl(0.9 * v); return;
      case 'flutter': for (let i = 0; i < 6; i++) A.noise({ f: 1800, q: 0.8, dur: 0.04, vol: 0.05, delay: i * 0.05 }); return;
      case 'flock': for (let i = 0; i < 4; i++) A.bird(0.4); return;
      case 'sneeze': A.noise({ f: 3000, q: 0.6, dur: 0.18, vol: 0.12, ft: 'highpass', delay: 0.05 }); A.tone({ f: 900, f2: 1500, dur: 0.06, vol: 0.05 }); return;
      case 'squeaktoy': A.tone({ f: 1300, f2: 2100, type: 'triangle', dur: 0.14, vol: 0.08, lp: 3500 }); A.tone({ f: 1900, f2: 1200, type: 'triangle', dur: 0.12, vol: 0.06, lp: 3500, delay: 0.15 }); return;
      case 'bounce': A.noise({ f: 260, dur: 0.08, vol: 0.15 * v, brown: true, ft: 'lowpass' }); A.tone({ f: 180, f2: 120, dur: 0.08, vol: 0.05 * v }); return;
      case 'jingle': [88, 91, 88].forEach((m, i) => A.bell(m + R(), 0.035 * v, i * 0.05)); return;
      case 'scrape': A.noise({ f: 700, q: 1.5, dur: 0.9, vol: 0.08, f2: 400 }); return;
      case 'tv': A.noise({ f: 3000, q: 0.5, dur: 0.25, vol: 0.06, ft: 'highpass' }); return;
      case 'bell': [84, 88, 91].forEach((m, i) => A.bell(m, 0.06, i * 0.08)); return;
      case 'clue': A.bell(79, 0.05); A.bell(86, 0.05, 0.12); return;
    }
    return basePlay(name, v);
  };
})();
