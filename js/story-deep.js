/* =====================================================================
   story-deep.js - Chapters Ten to Fourteen, the finale and Free Explore.
   10 The Underground     the Deepways, the sluice, Digby, the old lift
   11 The Storm           Storm Valley, the lightning tree, little Clover
   12 The Hidden Village  Thistlecombe, Hazel, three good deeds, Juniper
   13 The Final Trail     the Hidden Path home with Juniper and Hazel
   14 Home                Ellie, Grandpa Arlo, and everybody
   ===================================================================== */
'use strict';
(function () {
  const SQ = G.SQ, NPC = G.NPC, W = G.World, U = G.U, A = G.Audio, M = G.Mat, UG = W.UG, R = G.Regions;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI, P = W.pts;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const has = (f) => !!S().flags[f], item = (i) => game().hasItem(i), st = () => S().step, ch = () => S().chapter;
  const say = SQ.say, think = SQ.think, step = SQ.step;
  const inStep = (...a) => a.includes(st());
  const T = (text, target, o) => Object.assign({ text, target }, o || {});
  const g_ = (x, z) => [x, 'g', z];
  const gp = (p) => [p[0], p[1] === 'g' || p[1] === 0 && p[0] > 38 ? W.groundY(p[0], p[2]) : p[1], p[2]];
  const inArea = (id) => { const p = game().player.pos; return W.areaAt(p.x, p.y + 0.1, p.z).id === id; };
  const near = (p, r) => { const q = game().player.pos, t = gp(p); return Math.hypot(q.x - t[0], q.z - t[2]) < r && Math.abs(q.y - t[1]) < 3; };
  const npcAt = (id) => { const d = NPC.get(id); const r = d && d.beast && d.shown && d.beast.root.position; return r ? [r.x, r.y, r.z] : null; };
  const C = () => G.Cast;
  const rx = (z) => 88 + Math.sin(z * 0.045) * 7;

  // chapter set-up: where each one starts, and the weather it starts with
  SQ.CH[14].spawn = () => P.under.landing.concat([0]);
  SQ.CH[15].spawn = () => [P.valley.mine[0], W.groundY(P.valley.mine[0], P.valley.mine[2]), P.valley.mine[2], Math.PI / 2]; SQ.CH[15].weather = 'cloudy';
  SQ.CH[16].spawn = () => [141.4, W.groundY(141.4, -236), -236, Math.PI / 2];
  SQ.CH[17].spawn = () => [146, W.groundY(146, -237.2), -237.2, -Math.PI / 2];
  SQ.CH[18].spawn = () => [2, 0, -26.2, Math.PI];
  SQ.CH[19].spawn = null;
  // the Deepways, the valley and the lift can't be fast-travelled out of mid-scene
  SQ.CH[14].noTravel = () => true; SQ.CH[15].noTravel = (s) => s !== 's15_gate'; SQ.CH[17].noTravel = () => true;

  /* ================================================================ items + collectibles */
  Object.assign(G.ITEMS, {
    glowshard: { name: 'Glow Crystal Shards', desc: 'Shards of the Deepways crystals. They glow brighter when they are together.', stack: true },
    honeycomb: { name: 'Honeycomb', desc: 'A dripping piece of comb from the bee tree. The bees were very understanding. Mostly.', story: true },
    lantern: { name: 'Thistlecombe Lantern', desc: 'A paper lantern from the festival. It never quite goes out.', story: true },
  });
  G.COLLECT.push(
    { id: 'a_ac10', cat: 'acorns', model: 'acorn', name: 'Carved Acorn', desc: 'On the moss heap in the Deepways. The spiral points east.', pos: [-66.6, UG, -303.4] },
    { id: 'a_ac11', cat: 'acorns', model: 'acorn', name: 'Carved Acorn', desc: 'Wedged in the mine head timbers.', pos: g_(52.8, -301.4) },
    { id: 'a_ac12', cat: 'acorns', model: 'acorn', name: 'Carved Acorn', desc: 'On a post of the Thistlecombe gate. The last one: the trail ends here.', pos: g_(141.2, -233.6) },
    { id: 'g_gold3', cat: 'golden', model: 'goldacorn', name: 'Golden Acorn', desc: 'On a crystal ledge high in the Crystal Hall.', pos: [16.6, UG + 1.2, -316] },
    { id: 'g_gold4', cat: 'golden', model: 'goldacorn', name: 'Golden Acorn', desc: 'Behind the waterfall rocks of Storm Valley... well, behind a big boulder, anyway.', pos: g_(60.4, -196) },
    { id: 'g_gold5', cat: 'golden', model: 'goldacorn', name: 'Golden Acorn', desc: 'Up in the Thistlecombe bell tower, next to the bell.', pos: null },
    { id: 'h_digby', cat: 'homes', model: 'acorn', name: "Digby's Burrow", desc: 'A round green door in the Crystal Hall. It smells of lamp oil and worm pie.', pos: null },
    { id: 'h_warren', cat: 'homes', model: 'acorn', name: "Mallow's Warren", desc: 'Nine rooms, forty-one rabbits, one very tired mother.', pos: null },
    { id: 'h_combe', cat: 'homes', model: 'acorn', name: 'The Bank Burrows', desc: 'Round doors in the bank of Thistlecombe. The voles live on the left. The mice live on the right. Nobody talks about the middle one.', pos: null },
    { id: 'h_rook', cat: 'homes', model: 'acorn', name: "Old Rook's Belfry", desc: 'A nest of twigs, string and one teaspoon, right beside the bell.', pos: null },
  );
  for (let i = 1; i <= 3; i++) G.PICKUPS.push({ id: 'p_shard' + i, item: 'glowshard', model: 'shard', pos: P.under['shard' + i], when: () => ch() === 14 && inStep('s14_shards'), msg: i === 1 ? 'A glow crystal shard, balanced on the top mushroom. Two more to find.' : null });

  /* ================================================================ steps */
  const shardTarget = () => { for (let i = 1; i <= 3; i++) if (!has('got_p_shard' + i)) return P.under['shard' + i]; return P.under.lift; };
  const shelterIdx = () => SQ.s().shelter || 0;
  Object.assign(G.STEPS, {
    s14_wake: T('Get your bearings in the dark', P.under.landing),
    s14_way: T('Follow the draught through the tunnel', P.under.grottoIn),
    s14_climb: T('Climb the giant glowshrooms to the high tunnel', P.under.ledge),
    s14_river: T('Find a way across the underground river', P.under.lever),
    s14_cross: T('Hop across the stepping stones', P.under.riverFar),
    s14_digby: T('Follow the lantern light', () => npcAt('digby') || P.under.digby),
    s14_shards: T('Find three glow crystal shards for the lift lamp', shardTarget, { count: () => [S().inv.glowshard || 0, 3] }),
    s14_lift: T('Put the shards in the old lift lamp', P.under.lift),
    s15_out: T('Head east, towards the smoke beyond the river', g_(P.valley.storm[0], P.valley.storm[2])),
    s15_log: T('Cross the river on the fallen tree', g_(99, -262)),
    s15_cry: T('Find who is crying in the storm', () => npcAt('clover') || g_(101, -252)),
    s15_shelter: T('Lead Clover home. When the wind howls, get under a rock!', () => { const i = shelterIdx(), sh = P.valley.shelters; return i < sh.length ? g_(sh[i][0], sh[i][1]) : g_(P.valley.warren[0], P.valley.warren[2]); }),
    s15_gate: T('The storm has passed. Follow the rainbow to the gate on the eastern rim', g_(P.valley.gate[0], P.valley.gate[2])),
    s16_arrive: T('Enter the hidden village', g_(146, -237)),
    s16_hazel: T('Talk to the prickly hedgehog', () => npcAt('hazel') || g_(148.5, -238.2)),
    s16_help: T('Help the villagers (talk to them to find out how)', () => helpTarget(), { subs: () => [['Free the mill wheel', has('wheelFree')], ['Ring the bell in the tower', has('bellRung')], ['Bring honey to Tansy the baker', has('honeyGiven')]] }),
    s16_juniper: T('Visit Juniper at the Council Oak', g_(206, -258.4)),
    s16_fest: T('Join the lantern festival in the square', g_(185, -242.6)),
    s17_valley: T('Cross Storm Valley to the old mine with Juniper and Hazel', g_(51.8, -296.4)),
    s17_hollow: T('Climb out of Glowworm Hollow', [-57, UG, -109.5]),
    s17_garden: T('Follow the Hidden Path to the Old Garden', g_(-4.6, -140.6)),
    s17_last: T('Take Juniper home through Hawthorn Meadow', g_(2, -32.4)),
    s18_back: T('Bring Juniper to Ellie and Grandpa Arlo by the back door', [-1.4, 0, -19.2]),
    free: T('Free Explore: go anywhere. Secrets, side quests and old friends are waiting.', null),
  });
  const helpTarget = () => { if (!has('wheelFree')) return g_(P.village.wheelJam[0] - 1.2, P.village.wheelJam[2]); if (!has('bellRung')) return [P.village.tower[0], W.groundY(P.village.tower[0], P.village.tower[2]) + 3, P.village.tower[2]]; if (!item('honeycomb')) return SQ.trailIdx(SQ.trails.bees) < 3 ? SQ.trailPos(SQ.trails.bees) : g_(P.village.beeTree[0] + 1.2, P.village.beeTree[2] + 1); return npcAt('tansy'); };

  /* ================================================================ NPCs */
  const JUNI_PAL = { brown: 0xa8a098, dark: 0x6a645e, cream: 0xf0ece4, mask: 0x8a847c, key: 'juni' };
  const addBow = (d) => { const mk = d.make; d.make = () => { const b = mk(); if (!b._bow && b.head) { b._bow = true; const bw = new THREE.Group(); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.std('juniBow', { color: 0xc0302a, rough: 0.5 })); l.scale.set(1.4, 0.8, 0.6); l.position.x = s * 0.022; bw.add(l); } const k = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), M.std('juniBow', { color: 0xc0302a })); bw.add(k); bw.position.set(0.035, 0.035, -0.02); bw.rotation.z = -0.4; b.head.add(bw); const bell = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.get('brass')); bell.position.set(0, -0.05, 0.03); b.head.add(bell); } return b; }; return d; };
  const following = (d) => { d.following = true; };
  NPC.add({ id: 'digby', name: 'Digby', kind: 'mole', look: { scale: 1.7, hat: 'cap', hatColor: 0xf2c14e, glasses: true, bag: 0x6a4a2a }, sound: 'mole',
    pos: () => (ch() === 14 && inStep('s14_wake', 's14_way', 's14_climb', 's14_river', 's14_cross') ? null : ch() === 14 && inStep('s14_digby') ? [16, UG, -314.4] : ch() === 14 && inStep('s14_lift') ? [29.6, UG, -300.8] : [22, UG, -309]), yaw: -0.8,
    when: () => ch() === 14 || ch() >= 15 && has('liftOn'), lines: () => digbyLines() });
  NPC.add({ id: 'clover', name: 'Clover', kind: 'rabbit', look: { scale: 0.75, color: 0xd8c8b0, ribbon: 0xe7a0b0 }, sound: 'squeak',
    pos: () => (ch() === 15 && inStep('s15_cry') ? g_(101, -252) : ch() === 15 && inStep('s15_shelter') ? g_(101, -252) : g_(123, -216.4)), yaw: 2.4, followGap: 0.7,
    when: () => ch() === 15 && inStep('s15_cry', 's15_shelter', 's15_gate') || ch() >= 16, lines: () => (inStep('s15_cry') ? cloverMeet() : [['clover', ch() === 15 ? 'Is it going to BOOM again? Stay close, please.' : 'Mister Milo! I told everybody about the storm. You were VERY brave. I was a bit brave.', ch() === 15 ? 'sad' : 'happy']]),
    tick: (dt, d) => { d.following = ch() === 15 && inStep('s15_shelter'); } });
  NPC.add({ id: 'mallow', name: 'Mallow', kind: 'rabbit', look: { scale: 1.3, color: 0xa89078, apron: 0xf2ebe0 }, pos: () => g_(121.4, -210.6), yaw: 3, wander: 1.2,
    when: () => ch() >= 15 && (ch() !== 15 || has('cloverHome')), lines: () => [['mallow', ch() === 15 ? 'Thank you, thank you. The village is just over the rim: follow the rainbow, you can’t miss it.' : 'Forty-one children, and every one of them talks about the long brave mouse who brought Clover home.', 'happy']] });
  addBow(NPC.add({ id: 'juniper', name: 'Juniper', kind: 'ferret', look: { pal: JUNI_PAL, scale: 0.95 }, sound: 'dook', r: 1.1, followGap: 1.4,
    pos: () => { const c = ch(); if (c === 16) return inStep('s16_fest') ? g_(183.6, -241.6) : g_(206, -258.8); if (c === 17) return inStep('s17_valley') ? g_(147.6, -238.2) : null; if (c === 18) return has('finaleDone') ? g_(-4, -24.4) : g_(1.2, -25.4); if (c === 19) return has('finaleDone') ? g_(-4.6, -139.2) : null; return null; },
    yaw: 0, when: () => ch() === 16 && inStep('s16_juniper', 's16_fest') && !SQ.s().juniHidden || ch() >= 17, lines: () => juniperLines(),
    tick: (dt, d) => { d.following = ch() === 17 || ch() === 18 && !has('finaleDone') && inStep('s18_back'); if (d.beast && d.beast.state) d.beast.state.speed = d.beast.state.moving ? 1 : 0; } }));
  NPC.add({ id: 'hazel', name: 'Hazel', kind: 'hedgehog', look: { scale: 1.05, scarf: 0x8a5a9a, bag: 0x6a4a2a, seed: 11, color: 0x7a5a3f }, sound: 'snuffle', followGap: 1.1,
    pos: () => { const c = ch(); if (c === 16) return inStep('s16_arrive', 's16_hazel') ? g_(148.5, -238.2) : inStep('s16_fest') ? g_(186.4, -241.8) : g_(184, -238); if (c === 17) return inStep('s17_valley') ? g_(147.8, -236) : null; if (c === 18) return g_(-6.4, -22.6); if (c === 19) return g_(-6.4, -22.6); return null; },
    yaw: -1.6, when: () => ch() >= 16, lines: () => hazelLines(), tick: (dt, d) => { d.following = ch() === 17; } });
  NPC.add({ id: 'tansy', name: 'Tansy', kind: 'mouse', look: { scale: 1.35, apron: 0xf2ebe0, hat: 'bonnet', hatColor: 0xf2ebe0 }, sound: 'squeak', pos: () => g_(176.2, -226.4), yaw: 0.2,
    when: () => ch() >= 16 && !vHide(), lines: () => tansyLines() });
  NPC.add({ id: 'fennel', name: 'Fennel', kind: 'vole', look: { scale: 1.4, hat: 'cap', hatColor: 0x6a4a2a }, sound: 'squeak', pos: () => g_(196.2, -227.8), yaw: 1.2,
    when: () => ch() >= 16 && !vHide(), lines: () => fennelLines() });
  NPC.add({ id: 'rook', name: 'Old Rook', kind: 'bird', look: { scale: 1.3, size: 2.2, color: 0x2a2a32, belly: 0x4a4a55, wingColor: 0x1a1a22, beak: 1.5, glasses: true }, sound: 'caw', pos: () => g_(169.6, -249), yaw: 1,
    when: () => ch() >= 16 && !vHide(), lines: () => rookLines() });
  const VILL = [
    ['bluebell', 'Bluebell', 'rabbit', { scale: 1, color: 0xc0a890, ribbon: 0x6a8fd0 }, [180.4, -236.6], 'I thought you were a weasel. You’re much politer than a weasel.'],
    ['thorn', 'Thorn', 'hedgehog', { scale: 0.9, hat: 'pointy', hatColor: 0x3f8a74, seed: 7 }, [189.6, -238.4], 'Hazel says you can sniff out anything. Can you sniff out my spectacles? ...Oh. They were on my head.'],
    ['conker', 'Conker', 'squirrel', { scale: 1 }, [193.2, -244.4], 'I’ve buried a hundred and six nuts this autumn. I remember where three of them are.'],
    ['pipkin', 'Pipkin', 'mouse', { scale: 0.85, scarf: 0xd9573b }, [182.2, -245.2], 'Are you a SNAKE? With LEGS? Can I ride you? Mum says no.'],
    ['wick', 'Wick', 'vole', { scale: 1.1, apron: 0x3f6f9e }, [166.8, -238.8], 'I make the lanterns. Wax, paper and a little bit of glowworm. Don’t tell the glowworms.'],
  ];
  const vHide = () => ch() === 16 && inStep('s16_arrive', 's16_hazel') && !G.SEQ.running;
  for (const [id, name, kind, look, [x, z], line] of VILL) NPC.add({ id, name, kind, look, sound: kind === 'squirrel' ? 'chatter' : 'squeak', pos: () => (ch() === 16 && inStep('s16_fest') ? g_(185 + Math.cos(id.length) * 3.2, -240 + Math.sin(id.length) * 3.2) : g_(x, z)), yaw: () => Math.atan2(185 - x, -240 - z), wander: 1.1,
    when: () => ch() >= 16 && !vHide(), lines: () => [[id, has('bellRung') && has('wheelFree') && has('honeyGiven') ? line : 'Eek! Oh. You’re the one Hazel brought. Hello, I suppose.', 'happy']] });

  /* ---- lines */
  function digbyLines() {
    if (ch() === 14 && inStep('s14_digby')) return [
      ['digby', 'Who’s stomping about in my river? Hold still. Hold STILL. Let me get my specs on.', 'think'],
      ['digby', '...A ferret! Haven’t seen a ferret down here since the Long Lady. Long, like you, with a bell that went ting-ting in the tunnels.', 'surprised'],
      ['milo', 'Juniper! You knew Juniper!', 'surprised'], ['digby', 'Knew her? Know her. She lives in Thistlecombe, over the valley. Carves acorns for the little ones to find.', 'happy'],
      ['milo', 'I need to get out. And I think I need to get to Thistlecombe.', 'think'],
      ['digby', 'Then you need the old lift. It goes up to the valley. But the lamp’s gone dark, and she won’t budge without light. Three glow shards in the lamp, that’s the trick.', 'think'],
      ['digby', 'There’s shards about. One on the top of the tallest glowshroom, one past the river rocks, and one up the ledge behind me. Off you go. Chop chop. Dig dig.', 'happy'],
      { do: () => step('s14_shards') }];
    if (ch() === 14 && inStep('s14_shards')) return [['digby', 'Tallest glowshroom, past the river rocks, up the ledge. Three shards. My knees don’t do ledges any more.', 'think']];
    if (ch() === 14 && inStep('s14_lift')) return [['digby', 'Three shards! Pop them in the lamp on the lift and I’ll give her a crank.', 'happy']];
    return [['digby', 'The lift runs smooth as a worm now. Up to the valley, down to the Deepways, whenever you like.', 'happy']];
  }
  function cloverMeet() {
    return [['clover', '*sniff* ...Who’s there? Are you a FOX?', 'scared'], ['milo', 'No, I’m a ferret. Milo. Are you lost?', 'think'],
      ['clover', 'I’m Clover. I chased a dandelion fluff and then it went BOOM and the sky went white and now I don’t know where my warren is.', 'sad'],
      ['milo', 'I’ll take you home. Stay right behind me. When the wind howls, we hide under a rock. Deal?', 'happy'], ['clover', '...Deal.', 'shy'],
      { do: () => { SQ.s().shelter = 0; step('s15_shelter'); } }];
  }
  function juniperLines() {
    const c = ch();
    if (c === 16 && inStep('s16_juniper')) return null;
    if (c === 16) return [['juniper', 'Tonight, the lanterns. Tomorrow, the Hidden Path. It has been a very long time since I walked it.', 'happy']];
    if (c === 17) return [['juniper', inStep('s17_valley') ? 'Don’t walk too fast, young one. These legs have seen twelve summers.' : 'I remember every stone of this path. I made most of those arrows in the tunnels, you know.', 'happy']];
    if (c === 18 && !has('finaleDone')) return [['juniper', 'I can smell her. Ellie. And... Arlo? Is Arlo here too?', 'surprised']];
    return [['juniper', 'Arlo moved back into Wren Cottage, and I have the warmest spot by his fire. Come for supper whenever you like, Milo.', 'happy']];
  }
  function hazelLines() {
    const c = ch();
    if (c === 16 && inStep('s16_hazel')) return [
      ['hazel', 'Stop right there, long one. I’ve smelled you on MY trail for days. Up the mountain, round the lookout... even in the attic!', 'angry'],
      ['milo', 'You’re the prickly scent! I’m Milo. I followed your acorns and your bilberries. I didn’t mean to scare anyone.', 'happy'],
      ['hazel', 'Where are you from?', 'think'], ['milo', 'Maple Street. The house with the red door, by the Hollow Wood. My best friend lives under our apple tree. He’s a hedgehog called Moss.', 'happy'],
      ['hazel', '...Moss?', 'surprised'], ['hazel', 'Little Moss? Scruffy? Terrified of owls? Makes a noise like a kettle when he’s happy?', 'surprised'],
      ['milo', 'That’s him! Exactly him!', 'surprised'], ['hazel', 'He’s my brother. We were split up in a flood when we were hoglets. I looked for him for two whole summers.', 'sad'],
      ['hazel', 'Right. RIGHT. Everybody! You can come out! This one’s a friend. My brother’s friend.', 'happy'],
      ['hazel', 'They’re still a bit twitchy. The storm left the whole village in a muddle. Lend a paw, and they’ll warm to you. Then I’ll take you to meet Juniper.', 'happy'],
      { do: () => { step('s16_help'); A.play('quest'); } }];
    if (c === 16 && inStep('s16_help')) return [['hazel', 'Fennel’s mill, Old Rook’s bell and Tansy’s honey. Talk to them: they’ll tell you what’s wrong.', 'think']];
    if (c === 16) return [['hazel', 'Tomorrow we go home. To Moss. I keep saying it out loud to see if it’s real.', 'happy']];
    if (c === 17) return [['hazel', 'I can smell the Hollow Wood already. Or I think I can. I’m trying very hard.', 'happy']];
    return [['hazel', 'Moss snores. Did you know he snores? I have my brother back AND he snores. Best day.', 'happy']];
  }
  function tansyLines() {
    if (has('honeyGiven')) return [['tansy', 'Honey cakes for the festival! There’s one with your name on. Well, a squiggle. I can’t spell ferret.', 'happy']];
    if (item('honeycomb')) return [['milo', 'I brought you honey from the bee tree!', 'happy'], { do: () => { game().take('honeycomb'); game().flag('honeyGiven'); A.play('quest'); UI().updateObjective(true); helpCheck(); } }, ['tansy', 'Oh! Oh my whiskers! Now there’ll be honey cakes for the lantern festival after all. Thank you, long one!', 'happy']];
    if (!ch() || !inStep('s16_help')) return [['tansy', 'Fresh bread! Well. Fresh-ish.', 'happy']];
    return [['tansy', 'The storm knocked my honey pot off the shelf and there’s none left for the festival cakes. The bees in the old tree have plenty.', 'sad'], ['tansy', 'You’ve got a nose. Follow the bees: sniff where they’ve been, up past the mill.', 'think'], { do: () => game().flag('beesTold') }];
  }
  function fennelLines() {
    if (has('wheelFree')) return [['fennel', 'Hear that? Creak, splash, creak. The mill’s grinding again. Best sound in the combe.', 'happy']];
    return [['fennel', 'The storm washed half a hedge into my mill wheel. Jammed solid. I tug and I tug, but I’m a vole. We’re not tuggers.', 'sad'], ['fennel', 'You’re long and strong. Could you pull the branches out? They’re caught on the downstream side.', 'think']];
  }
  function rookLines() {
    if (has('bellRung')) return [['rook', 'CAW. Thank you. My wings aren’t what they were, and that bell hasn’t rung since the storm. Now everybody knows the festival is on.', 'happy']];
    return [['rook', 'Caw. The festival bell. Somebody must ring it, or nobody will know the festival is on. The storm blew my ladder away and I’m too old to flap that high.', 'sad'], ['rook', 'There are steps up the side of the tower. Young legs, young legs.', 'think']];
  }

  /* ================================================================ CHAPTER TEN: The Underground */
  SQ.onStart[14] = () => {
    const g = game(); g.player.act('sleep', 1.4);
    say([['milo', 'Ow... ow. I’m okay. I landed on something soft. A great big heap of moss.', 'sad'], ['milo', 'Hello? HELLOOO? ...Just my echo. It’s a long way back up.', 'think'],
      ['milo', 'A cave under the mountain. And... the air is moving. A draught, from that tunnel. Air means there’s a way out.', 'think'], ['milo', '*Follow the air, Milo.*', 'happy']], () => step('s14_way'));
  };
  SQ.trigger(() => st() === 's14_way' && inArea('dGrotto'), () => { const g = game(); g.cinematic({ pos: V3(-47.6, UG + 1.6, -306.4), look: V3(-38, UG + 1.6, -300), dur: 3.4 }); say([['milo', 'Mushrooms! As big as umbrellas, and glowing blue! And high up in the wall... another tunnel.', 'surprised'], ['milo', '*The caps look like steps. Bouncy steps.*', 'happy']], () => { g.cinematicEnd(); step('s14_climb'); }); });
  SQ.trigger(() => st() === 's14_climb' && game().player.pos.y > UG + 2.15 && inArea('dGrotto'), () => { step('s14_river'); say(think('Up! The tunnel goes on, and down. I can hear water.', 'happy')); });
  SQ.trigger(() => st() === 's14_river' && inArea('dRiver') && game().player.pos.z > -303, () => { const g = game(); g.cinematic({ pos: V3(-10, UG + 1.8, -299.6), look: V3(-2, UG, -307), dur: 3 }); say([['milo', 'An underground river, and it’s roaring. The stepping stones are under the water. I’d be swept away.', 'think'], ['milo', 'There’s a lantern by the wall... and a big old lever. And a wooden gate at the end of the river.', 'think']], () => g.cinematicEnd()); });
  G.INTERACT.push({ id: 'deep_lever', pos: P.under.lever, r: 1.1, label: () => (has('deepDrained') ? 'Push the sluice lever back' : 'Heave the rusty sluice lever'), anim: 'push', when: () => ch() >= 14 && (ch() !== 14 || !inStep('s14_wake', 's14_way', 's14_climb')), act: () => {
    const g = game(); if (has('deepDrained')) { say(think('Better leave it open. Somebody might need to cross.')); return; }
    g.busy = true; A.play('metal'); g.shake = 0.3;
    const lev = W.obj.sluiceLever; g.tween(0.8, (k) => { if (lev) lev.userData.arm.rotation.z = 0.7 - 1.4 * U.smooth(k); }, () => {
      A.play('splash'); g.cinematic({ pos: V3(2, UG + 2.4, -298.8), look: V3(4, UG, -306), dur: 99 }); g.flag('deepDrained');
      const gate = W.obj.sluiceGate, water = W.obj.deepWater; g.tween(3.2, (k) => { if (gate) gate.position.y = UG + 1.6 * U.smooth(k); if (water) water.position.y = U.lerp(UG + 0.45, UG - 0.3, U.smooth(k)); }, () => { applyDeep(); g.busy = false;
        say([['milo', 'The gate lifted and the water rushed away! The stepping stones are out!', 'happy']], () => { g.cinematicEnd(); if (st() === 's14_river') step('s14_cross'); }); });
    });
  } });
  SQ.trigger(() => st() === 's14_cross' && game().player.pos.z < -309.4 && inArea('dRiver'), () => { step('s14_digby'); say([['milo', 'Across! And... there’s a light. A little bobbing lantern, coming through the tunnel!', 'surprised']]); });
  SQ.tick(() => { if (ch() === 14 && st() === 's14_shards' && (S().inv.glowshard || 0) >= 3) { step('s14_lift'); say(think('Three shards, glowing together like a tiny sun. To the lift!', 'happy')); } });
  G.INTERACT.push({ id: 'deep_lift', pos: [P.under.lift[0] - 1.1, UG, P.under.lift[2]], r: 1.1, label: () => (ch() === 14 && st() === 's14_lift' ? 'Put the shards in the lift lamp' : 'Ride the lift up to the valley'), when: () => ch() === 14 && st() === 's14_lift' || has('liftOn') && ch() !== 14, act: () => { if (ch() === 14) liftUp(); else game().travel(gp([P.valley.mine[0], 'g', P.valley.mine[2] + 2]), Math.PI / 2); } });
  G.INTERACT.push({ id: 'valley_lift', pos: [50, 'g', -298.2], r: 1.2, label: 'Ride the old lift down to the Deepways', when: () => has('liftOn') && ch() !== 15 && ch() !== 17, act: () => game().travel([29.4, UG, -300.4], Math.PI / 2) });
  function liftUp() {
    const { wait, talk, cut, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      g.take('glowshard', 3); g.flag('liftOn'); A.play('secret');
      const lamp = W.obj.liftLamp; if (lamp) { lamp.material.emissiveIntensity = 3; lamp.material.color.setHex(0xffffff); }
      const [lx, , lz] = P.under.lift; g.player.teleport(lx, UG + 0.1, lz, Math.PI / 2);
      cut([lx - 3.4, UG + 1.2, lz + 2.4], [lx, UG + 0.8, lz], 0.1);
      await talk([['digby', 'She’s glowing! Right. Hold on to your whiskers, long one. And say hello to the Long Lady from old Digby.', 'happy'], ['milo', 'Thank you, Digby!', 'happy']]);
      A.play('metal'); g.shake = 0.4; const lift = W.obj.deepLift;
      g.tween(4, (k) => { if (lift) lift.position.y = UG + 8 * U.smooth(k); g.player.pos.y = UG + 0.1 + 8 * U.smooth(k); g.player.f.root.position.y = g.player.pos.y; });
      await wait(2.6); UI().fade(true); await wait(1.6);
      if (lift) lift.position.y = UG;
      const [mx, , mz] = P.valley.mine; g.player.teleport(mx, W.groundY(mx, mz), mz, Math.PI / 2); g.cam.snap = true;
    }).then(() => { game().startChapter(15); setTimeout(() => UI().fade(false), 600); });
  }

  /* ================================================================ CHAPTER ELEVEN: The Storm */
  SQ.onStart[15] = () => say([['milo', 'Daylight! I’m out, on the other side of the mountain. A whole valley, with a river running through it.', 'happy'],
    ['milo', 'And far away, over the eastern rim... smoke. Little wisps of chimney smoke. That’s where Thistlecombe must be.', 'surprised'],
    ['milo', 'Those clouds look angry though. I’d better hurry.', 'think']], () => step('s15_out'));
  SQ.trigger(() => st() === 's15_out' && near(P.valley.storm, 8), () => stormStrike());
  function stormStrike() {
    const g = game(); g.busy = true; S().weather = 'storm'; if (G.Weather) { G.Weather.flash = 1; G.Weather.boltT = 7; }
    A.play('thud'); g.shake = 1.2; A.noise && A.noise({ f: 140, f2: 35, q: 0.4, dur: 3.2, vol: 0.5, brown: true, ft: 'lowpass', a: 0.02 });
    const [tx, , tz] = P.valley.stormTree, ty = W.groundY(tx, tz); g.cinematic({ pos: V3(tx - 16, ty + 4, tz + 9), look: V3(tx - 4, ty + 2, tz), dur: 99 });
    const t = W.obj.stormTree; g.particles.burst(V3(tx, ty + 10, tz), 40, 0xfff2c0, 'spark');
    setTimeout(() => { A.play('thud'); g.tween(1.7, (k) => { if (t) t.rotation.z = (Math.PI / 2 - 0.06) * k * k; }, () => { A.play('thud'); g.shake = 1; g.particles.burst(V3(tx - 6, ty + 0.6, tz), 40, 0x6a5a4a, 'dust'); g.flag('stormTree'); applyValley(); g.busy = false;
      say([['milo', 'WHOA! The lightning hit the dead tree and it fell right across the river!', 'surprised'], ['milo', '...A bridge. A scary, wet, crackly bridge. Thank you, lightning. I think.', 'think']], () => { g.cinematicEnd(); step('s15_log'); }); }); }, 700);
  }
  SQ.trigger(() => st() === 's15_log' && game().player.pos.x > 98 && Math.abs(game().player.pos.z + 262) < 10, () => { step('s15_cry'); say([['milo', 'Made it across. Now which way... wait. Listen. Under the wind...', 'think'], ['milo', 'Somebody’s crying.', 'sad']]); });
  // the gusts: every so often the wind howls, and Milo (and Clover) must be under a rock
  const GUST = { t: 8, warn: 0 };
  SQ.tick((dt, s, stt) => {
    if (ch() !== 15 || st() !== 's15_shelter' || stt !== 'play' || UI().dialogueOpen || game().busy) return;
    const g = game(), p = g.player.pos, sh = P.valley.shelters, i = shelterIdx();
    // reaching the next shelter moves the checkpoint on
    for (let k = i; k < sh.length; k++) if (Math.hypot(p.x - sh[k][0], p.z - sh[k][1]) < 1.6) { SQ.s().shelter = k + 1; UI().updateObjective(); if (k === 0) UI().toast('<b>Under the rock!</b>', null, 'Safe from the wind. Now dash to the next one.'); }
    if (i >= sh.length && Math.hypot(p.x - P.valley.warren[0], p.z - P.valley.warren[2]) < 4.5) { cloverHome(); return; }
    GUST.t -= dt;
    if (GUST.t < 3 && !GUST.warn) { GUST.warn = 1; A.play('wind'); UI().toast('<b>The wind is howling...</b>', null, 'A big gust is coming. Get under a rock!'); if (G.Weather) G.Weather.flash = 0.6; }
    if (GUST.t <= 0) {
      GUST.t = 11 + Math.random() * 5; GUST.warn = 0; const safe = sh.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 1.7);
      if (G.Weather) G.Weather.flash = 1;
      if (!safe) { const back = i > 0 ? sh[i - 1] : [101, -252]; A.play('wind'); g.shake = 0.8; g.player.act('shake', 1.2); UI().fade(true, () => { g.player.teleport(back[0] + 0.4, W.groundY(back[0], back[1]), back[1] + 0.6, 0.5); g.cam.snap = true; const d = NPC.get('clover'); if (d && d.beast) d.beast.root.position.set(back[0] - 0.4, W.groundY(back[0], back[1]), back[1] + 0.2); setTimeout(() => UI().fade(false), 250); }); UI().toast('<b>WHOOOSH!</b>', null, 'The gust tumbled Milo and Clover back to the last shelter.'); }
      else UI().toast('<b>Phew!</b>', null, 'The gust roared right over the top of the rock.');
    }
  });
  function cloverHome() {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    g.flag('cloverHome'); SQ.collect('h_warren');
    cutscene(async () => {
      const [wx, , wz] = P.valley.warren, wy = W.groundY(wx, wz);
      cut([wx + 3.4, wy + 1.4, wz - 3.4], [wx, wy + 0.4, wz + 0.8], 0.1);
      await talk([['mallow', 'CLOVER! Oh, Clover, Clover, CLOVER! Where have you BEEN?', 'surprised'], ['clover', 'I chased a dandelion and then the sky went BOOM and Mister Milo found me and we hid under rocks and I was only a LITTLE bit scared.', 'happy'],
        ['mallow', 'Thank you, stranger. Thank you. Every burrow in this valley is yours, for ever.', 'happy']]);
      S().weather = 'rain'; await wait(1.4); S().weather = 'clear'; g.flag('rainbow');
      cut([wx - 6, wy + 2.2, wz - 6], [wx + 30, wy + 10, wz - 30], 0.1); await shot([wx - 4, wy + 2.6, wz - 4], [wx + 30, wy + 14, wz - 34], 3.4);
      await talk([['milo', 'The storm’s going. And look: a rainbow! It ends right over the eastern rim.', 'surprised'], ['mallow', 'That’s Thistlecombe. The village gate is just over there. Tell them Mallow sent you.', 'happy']]);
    }).then(() => { step('s15_gate'); g.autosave(); });
  }
  SQ.trigger(() => st() === 's15_gate' && near(P.valley.gate, 4.5), () => game().startChapter(16));
  // a rainbow over the eastern rim after the storm
  let bow = null;
  SQ.tick(() => {
    const on = (ch() === 15 || ch() === 16) && has('rainbow') && !(G.env && G.env.ug);
    if (on && !bow) { const g = new THREE.TorusGeometry(60, 3.2, 8, 48, Math.PI), cols = [], pos = g.attributes.position, c = new THREE.Color(), cc = [0xff4040, 0xff9a30, 0xffe040, 0x50e060, 0x4080ff, 0x8a50ff]; for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); const k = U.clamp((r - 56.8) / 6.4, 0, 0.999); c.set(cc[Math.floor(k * 6)]); cols.push(c.r, c.g, c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); bow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide })); bow.position.set(175, -8, -236); bow.rotation.y = Math.PI / 2 + 0.3; game().scene.add(bow); }
    if (bow) { bow.visible = on; if (on) bow.material.opacity = U.damp(bow.material.opacity, (1 - ((G.env && G.env.night) || 0)) * 0.28, 1, 0.016); }
  });

  /* ================================================================ CHAPTER TWELVE: The Hidden Village */
  SQ.onStart[16] = () => {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      cut([150, 8, -226], [186, 3, -242], 0.1); await shot([156, 6.4, -230], [186, 3, -242], 3.6);
      await talk([['milo', 'Thistlecombe. Tiny round doors, tiny chimneys, lanterns strung across the lanes... it’s Rose’s painting. It’s REAL.', 'surprised']]);
      cut([184, 1.4, -233.4], [185, 0.5, -240], 0.1);
      await talk([['pipkin', 'Mum! MUM! There’s a WEASEL at the gate!', 'scared']]);
      A.play('squeak'); SQ.s().villFled = true; await wait(0.6);
      await talk([['thorn', 'Everybody inside! Doors shut! Hide the cakes!', 'scared']]);
      cut([144, 1.2, -234.4], [148.5, 0.4, -238.2], 0.1);
      await talk([['milo', '...Oh. I don’t think they like ferrets.', 'sad']]);
    }).then(() => step('s16_hazel'));
  };
  // the three good deeds
  G.INTERACT.push({ id: 'v_wheel', pos: g_(P.village.wheelJam[0] - 0.9, P.village.wheelJam[2]), r: 1.4, label: 'Tug the branches out of the mill wheel', anim: 'dig', when: () => ch() >= 16 && !has('wheelFree') && !inStep('s16_arrive', 's16_hazel'), act: () => {
    const g = game(); g.busy = true; g.player.act('dig', 2, { lockMove: true }); A.play('rustle'); setTimeout(() => A.play('rustle'), 700);
    setTimeout(() => { A.play('splash'); g.flag('wheelFree'); applyVillage(); g.particles.burst(V3(P.village.wheelJam[0], W.groundY(P.village.wheelJam[0], P.village.wheelJam[2]) + 0.3, P.village.wheelJam[2]), 30, 0xcfe6f0, 'splash'); g.busy = false; UI().updateObjective(true); say([['milo', 'Got them all! The wheel is turning!', 'happy'], ['fennel', 'Creak, splash, creak! Oh, you marvellous long thing!', 'happy']], helpCheck); }, 1900);
  } });
  G.INTERACT.push({ id: 'v_bell', pos: () => 0, r: 1.2, label: 'Ring the festival bell', anim: 'push', when: () => ch() >= 16 && !inStep('s16_arrive', 's16_hazel'), act: () => ringBell() });
  SQ.onApply(() => { const it = G.INTERACT.find((i) => i.id === 'v_bell'); const [x, , z] = P.village.tower; it.pos = [x, W.groundY(x, z) + 3, z]; });
  function ringBell() {
    const g = game(), b = W.obj.vBell; A.play('bell'); for (let i = 0; i < 3; i++) setTimeout(() => A.tone({ f: 392, type: 'sine', dur: 2, vol: 0.14, lp: 2500 }), i * 700);
    g.tween(2.4, (k) => { if (b) b.rotation.z = Math.sin(k * 16) * 0.5 * (1 - k); });
    if (!has('bellRung')) { g.flag('bellRung'); UI().updateObjective(true); if (!game().gotC('g_gold5')) setTimeout(() => SQ.collect('g_gold5'), 1400); if (!game().gotC('h_rook')) setTimeout(() => SQ.collect('h_rook'), 2600); setTimeout(() => say([['milo', 'DONG! DONG! DONG! The whole combe can hear it!', 'happy'], ['rook', 'CAW! Festival’s on! Festival’s on!', 'happy']], helpCheck), 900); }
  }
  SQ.trail('bees', [g_(206.4, -222), g_(212.2, -212.6), g_(217.4, -205.6)], { active: () => ch() === 16 && inStep('s16_help') && has('beesTold') && !item('honeycomb') && !has('honeyGiven'), label: 'Sniff where the bees have been', col: 0xf2c14e, onDone: () => say(think('The bees all go to that old tree. There’s the hive! Gently, Milo. Gently.')) });
  G.INTERACT.push({ id: 'v_hive', pos: g_(P.village.beeTree[0] + 1.2, P.village.beeTree[2] + 1), r: 1.4, label: 'Nudge a piece of honeycomb loose', anim: 'push', when: () => ch() >= 16 && has('beesTold') && !item('honeycomb') && !has('honeyGiven'), act: () => {
    const g = game(); g.busy = true; A.play('rustle'); for (let i = 0; i < 30; i++) setTimeout(() => g.particles.emit({ x: g.player.pos.x + (Math.random() - 0.5), y: g.player.pos.y + 0.4 + Math.random() * 0.4, z: g.player.pos.z + (Math.random() - 0.5), vx: 0, vy: 0, vz: 0, life: 1, size: 0.035, col: 0x2a2010, wander: 3 }), i * 30);
    setTimeout(() => { g.busy = false; g.give('honeycomb'); say([['milo', 'Bzzz! BZZZ! Sorry! Sorry! Just a little piece! For the festival!', 'surprised'], ['milo', '...They let me have it. Very understanding bees.', 'happy']]); }, 1400);
  } });
  function helpCheck() { if (ch() === 16 && st() === 's16_help' && has('wheelFree') && has('bellRung') && has('honeyGiven')) setTimeout(() => say([['hazel', 'Well! Look at you. The whole combe is talking about the long one who fixed the mill and rang the bell and brought the honey.', 'happy'], ['hazel', 'Come on. Juniper’s waiting at the Council Oak.', 'happy']], () => step('s16_juniper')), 600); }
  SQ.trigger(() => st() === 's16_juniper' && near(P.village.juniper, 3.2), () => meetJuniper());
  function meetJuniper() {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      const [x, , z] = P.village.juniper, y = W.groundY(x, z);
      g.player.teleport(x, y, z + 1.6, Math.PI); cut([x + 2.4, y + 0.9, z + 2.6], [x, y + 0.3, z - 0.4], 0.1);
      A.setMood('ending');
      await talk([['juniper', 'So. You’re the one who followed my acorns all the way from Whisper Creek.', 'happy'],
        ['milo', 'You’re Juniper. Ellie’s Juniper. Arlo’s Juniper. You wear the red bow in all the photos.', 'surprised'],
        ['juniper', 'Ellie... little Ellie, in her wellies. And Arlo. And Rose, with dirt on her nose. You smell of all of them, young one.', 'happy'],
        ['juniper', 'I found this valley the summer I got lost. The little folk had lost their way too: the old path to the Hollow Wood had caved in. I dug it out again, and they asked me to stay and keep it.', 'think'],
        ['juniper', 'I carved the acorns and sent them down the creek every spring. The spiral means: this way home. I hoped someone from home would find them one day.', 'happy'],
        ['milo', 'Ellie still has your bell. Well, I found it. And Arlo still talks about you. He told me you went to be where you were needed.', 'sad'],
        ['juniper', 'Rose always did know things.', 'sad'], ['juniper', 'I’m old now, Milo. Twelve summers. My legs creak. But I would very much like to see them again. Once.', 'think'],
        ['milo', 'Then come home with me! The Hidden Path. We’ll go together.', 'happy'],
        ['hazel', 'And me. I’m coming. I have a brother to squash.', 'happy'],
        ['juniper', 'Tomorrow, then. Tonight, there’s a festival. Everyone will want to thank you.', 'happy']]);
    }).then(() => { S().time = Math.max(S().time, 19.6); step('s16_fest'); g.autosave(); });
  }
  SQ.trigger(() => st() === 's16_fest' && near([185, 'g', -240], 5.2), () => festival());
  function festival() {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      S().time = 21; g.flag('lanternFest'); A.setMood('village');
      const y = W.groundY(185, -240); cut([176, y + 3.4, -232], [185, y + 1.4, -240], 0.1);
      const iv = setInterval(() => { for (let i = 0; i < 3; i++) g.particles.emit({ x: 185 + (Math.random() - 0.5) * 12, y: y + 1 + Math.random(), z: -240 + (Math.random() - 0.5) * 12, vx: 0, vy: 0.5 + Math.random() * 0.3, vz: 0, life: 7, size: 0.14, col: [0xffc070, 0xff9a50, 0xffe0a0][i], glow: true, wander: 0.2 }); }, 120);
      await wait(2.2);
      await talk([['tansy', 'Honey cakes! Everybody gets one! Even the long one gets one! ESPECIALLY the long one!', 'happy'], ['rook', 'CAW! Lanterns up!', 'happy']]);
      await shot([189, y + 1.6, -236], [185, y + 2.6, -241], 3);
      A.musicBox && A.musicBox({ vol: 0.12 });
      await talk([['juniper', 'Listen. That’s Ellie’s song. She used to hum it to me. I taught it to the whole village.', 'happy'], ['milo', '*The music box song. Here, over the mountains, in a village nobody knows about. Everybody is singing it.*', 'happy']]);
      cut([170, y + 9, -226], [185, y + 4, -240], 0.1); await shot([172, y + 13, -228], [185, y + 12, -240], 4.2);
      clearInterval(iv); UI().fade(true); await wait(1.2);
    }).then(() => { game().give('lantern'); game().startChapter(17); setTimeout(() => UI().fade(false), 400); });
  }

  /* ================================================================ CHAPTER THIRTEEN: The Final Trail */
  SQ.onStart[17] = () => say([['juniper', 'Good morning, young one. Ready? The Hidden Path goes the old way: across the valley, down Digby’s mine, along the deep line, and up by the glowworms.', 'happy'],
    ['hazel', 'Then the creek, then the garden, then MOSS. Let’s go let’s go let’s go.', 'happy'], ['milo', 'Stay close, both of you. I’ll lead.', 'happy']], () => step('s17_valley'));
  SQ.placement[17] = (P0, s) => { P0.moss = inStep('s17_last') || s === 's17_garden' ? { pos: [-3.4, 0, -138.2], yaw: 3 } : undefined; if (!P0.moss) delete P0.moss; return P0; };
  SQ.trigger(() => st() === 's17_valley' && near([51.8, 'g', -296.4], 3.2), () => deepLine());
  function deepLine() {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      UI().fade(true); await wait(0.8);
      g.flag('liftOn'); const [lx, , lz] = P.under.lift; g.player.teleport(24, UG, -309.6, Math.PI / 2); g.cam.snap = true;
      const cart = cartMesh(); cart.position.set(22.6, UG, -311.6); g.scene.add(cart);
      cut([27.6, UG + 1.6, -306.4], [23, UG + 0.4, -311], 0.1); UI().fade(false);
      await talk([['digby', 'The Long Lady herself! And the ferret, and a hedgehog! Going home by the deep line, are we? Hop in the cart. Mind the bumps.', 'happy'], ['juniper', 'Hello, old friend.', 'happy']]);
      // the cart ride: along the crystal hall, through the dark, sparks at the corners
      const sp = setInterval(() => g.particles.burst(V3(cart.position.x, cart.position.y + 0.05, cart.position.z), 4, 0xffc060, 'spark'), 90);
      g.cinematic({ pos: V3(26, UG + 1.2, -311.6), look: V3(18, UG + 0.4, -311.6), dur: 99 });
      A.play('metal');
      await new Promise((res) => g.tween(3, (k) => { cart.position.x = U.lerp(22.6, 14, k); g.cine.pos.set(cart.position.x + 3, UG + 1.1, -311.2); g.cine.look.set(cart.position.x - 5, UG + 0.4, -312); }, res));
      UI().fade(true); await wait(0.7); clearInterval(sp);
      cart.position.set(-54, UG, -118); g.player.teleport(-56.6, UG, -116.8, 0); g.cam.snap = true;
      cut([-58.2, UG + 1.4, -114], [-57, UG + 0.5, -117], 0.1); UI().fade(false);
      await talk([['milo', 'Glowworms! This is Glowworm Hollow, under the Far Wood! The deep line comes out right here!', 'surprised'], ['juniper', 'I dug the last bit myself. Took me all of one autumn.', 'happy']]);
      g.scene.remove(cart);
    }).then(() => { step('s17_hollow'); g.autosave(); });
  }
  function cartMesh() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.6), M.get('darkmetal')); b.position.y = 0.35; g.add(b); for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), M.get('darkmetal')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z); g.add(w); } return g; }
  SQ.trigger(() => st() === 's17_hollow' && game().player.pos.y > UG + 12, () => { step('s17_garden'); say([['hazel', 'The Hollow Wood! I can smell it! Now I KNOW I can smell it!', 'happy'], ['milo', 'Up the creek, through the drain under the garden wall. Moss is waiting at Rose’s fountain. I know he is.', 'happy']]); });
  SQ.trigger(() => st() === 's17_garden' && near([-3, 'g', -142], 5), () => reunion());
  function reunion() {
    const { wait, talk, cut, shot, cutscene } = G.SEQ.api; const g = game();
    cutscene(async () => {
      S().time = Math.max(S().time, 18.6); A.setMood('ending');
      const hz = NPC.get('hazel'); if (hz && hz.beast) { hz.following = false; hz.path = null; hz.beast.root.position.set(-3.6, W.groundY(-3.6, -140.2), -140.2); }
      cut([-7.2, 1.4, -137.2], [-3.4, 0.3, -139.6], 0.1);
      await talk([['moss', 'Milo! MILO! You’re back! I went home and got everyone and we looked EVERYWHERE and Bram said...', 'surprised'], ['moss', '...', 'surprised'], ['moss', '...Hazel?', 'surprised']]);
      await wait(0.8);
      await talk([['hazel', 'Hello, Moss. You got scruffier.', 'happy'], ['moss', 'HAZEL!', 'happy']]);
      A.play('snuffle'); if (hz && hz.beast) hz.beast.setEmote('happy'); NPC.emote && NPC.emote('hazel', 'happy');
      await shot([-5, 0.8, -138], [-3.4, 0.25, -139.8], 2.4);
      await talk([['moss', '*kettle noises*', 'happy'], ['hazel', 'There it is. The kettle noise. Oh, I missed the kettle noise.', 'happy'], ['milo', '*Worth every stepping stone.*', 'happy']]);
      await talk([['juniper', 'Rose’s fountain. Rose’s roses. I used to sleep in that teapot in the greenhouse.', 'sad'], ['juniper', 'It’s nearly dark. Take me home, Milo. Take me to Ellie.', 'happy']]);
    }).then(() => { step('s17_last'); g.autosave(); });
  }
  // Nora's burrow under the back fence joins the garden to Hawthorn Meadow
  G.INTERACT.push(
    { id: 'meadow_burrowIn', pos: [2, 0, -27.3], r: 1, label: 'Squeeze through the burrow under the back fence', anim: 'sniff', when: () => ch() >= 12 || has('meadowOpen'), act: () => { game().flag('meadowOpen'); game().travel([2, W.groundY(2, -33.2), -33.2], Math.PI); } },
    { id: 'meadow_burrowOut', pos: [2, 'g', -32.2], r: 1, label: 'Squeeze back into the backyard', anim: 'sniff', when: () => ch() >= 12 || has('meadowOpen'), act: () => game().travel([2, 0, -26.4], 0) },
  );
  SQ.trigger(() => st() === 's17_last' && near([2, 'g', -32.4], 2.6), () => { const g = game(); g.travel([2, 0, -26.2], Math.PI, () => g.startChapter(18)); });

  /* ================================================================ CHAPTER FOURTEEN: Home, and the finale */
  SQ.onStart[18] = () => say([['milo', 'The backyard. The apple tree. The red door. We’re home.', 'happy'], ['juniper', 'It’s smaller than I remember. Or I’m bigger. No. Smaller.', 'happy'],
    ['ellie', '(from the garden) MILO? Milo, is that you?! Grandpa, Grandpa, he’s BACK!', 'surprised']], () => step('s18_back'));
  SQ.placement[18] = (P0) => { P0.moss = { pos: [-5.4, 0, -21.8], yaw: 0.4 }; return P0; };
  SQ.onApply((s) => {
    const c = C(); if (!c || !c.arlo) return;
    if (s.chapter === 18 && !G.SEQ.running) { c.arlo.root.visible = true; c.arlo.home = false; c.arlo.pos.set(-1.4, 0, -16.2); c.arlo.yaw = Math.PI; c.arlo.pose = 'idle'; }
    if (s.chapter === 19 && has('finaleDone')) { R.byId.wren && R.build(R.byId.wren); c.arlo.root.visible = true; c.arlo.pos.set(-6.2, 0, -139.4); c.arlo.yaw = 0.6; c.arlo.pose = 'sit'; }
  });
  SQ.trigger(() => st() === 's18_back' && near([-1.4, 0, -19.2], 2.6), () => finale());
  function finale() {
    const { wait, talk, cut, shot, cutscene, go } = G.SEQ.api; const g = game(), c = C(), E = c.ellie, Ar = c.arlo, Mm = c.mum, pl = g.player;
    const jd = NPC.get('juniper');
    cutscene(async () => {
      S().time = 18.9; A.setMood('ending');
      [E, Ar, Mm].forEach((h) => { h.root.visible = true; h.home = false; h.path = []; });
      E.pos.set(-1.6, 0, -18.4); E.yaw = Math.PI; E.pose = 'idle'; Ar.pos.set(0.4, 0, -16.4); Ar.yaw = Math.PI; Ar.pose = 'idle'; Mm.pos.set(-3.4, 0, -15.6); Mm.yaw = Math.PI - 0.4; Mm.pose = 'idle';
      pl.teleport(-1.4, 0, -21.4, 0); if (jd) { jd.following = false; jd.path = null; if (jd.beast) jd.beast.root.position.set(0.8, 0, -23.4); }
      cut([-4.8, 1.2, -23.8], [-1.2, 0.8, -19], 0.1);
      E.pose = 'cheer'; await talk([['ellie', 'MILO! You’ve been gone for DAYS! Where did you GO?!', 'surprised']]);
      E.pose = 'reach'; await wait(0.8); c.carried = E; E.pose = 'hug'; A.play('dook'); setTimeout(() => A.play('dook'), 500);
      await talk([['ellie', 'You smell like... mushrooms? And rain? And... honey?', 'surprised'], ['milo', '*Long story. Very long. With a mole in it.*', 'happy']]);
      cut([1.6, 0.9, -21.6], [0.8, 0.2, -23.4], 0.1); await wait(0.5);
      await talk([['arlo', '...Ellie. Ellie, love. Look. By the apple tree.', 'surprised']]);
      cut([-0.6, 1.5, -18.6], [0.8, 0.3, -23.2], 0.1);
      await talk([['ellie', 'Another ferret? A grey one? With a... red bow...', 'surprised']]);
      Ar.pose = 'think'; await wait(1.2);
      cut([2.4, 1.3, -18.8], [0.4, 1.3, -16.4], 0.1);
      await talk([['arlo', 'That’s... no. It can’t be. That bow. Rose tied that bow.', 'surprised'], ['arlo', '...Juniper?', 'sad']]);
      if (jd && jd.beast) { jd.path = [[0.6, 0, -19.4], [0.4, 0, -17.4]]; jd.pathSpeed = 0.9; }
      A.play('dook'); await wait(2.8);
      cut([-2, 0.8, -15], [0.4, 0.5, -16.8], 0.1); Ar.pose = 'reach'; await wait(1); Ar.pose = 'hug'; if (jd && jd.beast) jd.beast.root.visible = false;
      await talk([['juniper', '*A tiny, creaky, very happy dook.*', 'happy'], ['arlo', 'Juniper. Oh, you daft old thing. You came home. You came HOME.', 'happy'], ['ellie', 'Juniper? JUNIPER? From the photos? Grandpa, you’re crying.', 'surprised'], ['arlo', 'So are you, pet.', 'happy']]);
      await wait(0.8);
      // everybody comes to see
      cut([-10.6, 2.8, -26.4], [-2, 0.4, -18], 0.1);
      await talk([['mum', 'I don’t understand ANYTHING that is happening. But I’m putting the kettle on.', 'happy']]);
      await shot([-8, 1.6, -24], [-2, 0.4, -19], 2.4);
      await talk([['moss', 'Milo! Everybody came! Nora, Pip, Tilly, even Bram! And look: Hazel’s meeting everyone.', 'happy'], ['nora', 'Welcome home, travellers.', 'happy'], ['pip', 'Did you bring anything SHINY back?', 'happy'], ['tilly', 'I knew he’d come back. Obviously.', 'smug'], ['bram', 'Well done, pup. Well done.', 'happy']]);
      if (G.Mochi) { G.Mochi.place(-3.2, 0, -20.4); G.Mochi.state = 'shy'; G.Mochi.doAct && G.Mochi.doAct('dance', 3); } A.play('dook');
      await talk([['mochi', 'MILO! And a GRANNY FERRET! Is she staying? Can she stay? She’s staying.', 'happy'], ['milo', '*Everybody I love, in one garden. The sun is going down, and the apple tree is full of fireflies.*', 'happy']]);
      c.carried = null; pl.teleport(-1.8, 0, -20.4, Math.PI);
      cut([-3.6, 1.1, -24.2], [-1.8, 0.4, -20.4], 0.1); pl.act('dance', 3); A.play('dook');
      await wait(2.4);
    }).then(() => credits());
  }
  function credits() {
    const { wait, cut, shot, cutscene } = G.SEQ.api; const g = game();
    const el = document.createElement('div'); el.id = 'credits';
    el.innerHTML = `<div class="roll"><h1>FERRET</h1><h2>The Hidden Path</h2>
      <p class="sec">Starring</p><p>Milo <i>as himself</i></p><p>Moss &amp; Hazel</p><p>Juniper, keeper of the Hidden Path</p><p>Ellie, Mum &amp; Grandpa Arlo</p><p>Mochi, Nora, Pip, Tilly &amp; Bram</p>
      <p class="sec">With</p><p>Otto the otter · Old Bracken · Barnaby · Thimble</p><p>Nimbus · Sable · Digby · Clover &amp; Mallow</p><p>Tansy · Fennel · Old Rook · the folk of Thistlecombe</p><p>Captain Squall <i>(no chips were harmed)</i></p>
      <p class="sec">Places</p><p>Maple Street · the Hollow Wood · the Far Wood</p><p>Wren Cottage &amp; Rose’s garden · the Mountain Trail</p><p>the Deepways · Storm Valley · Thistlecombe</p><p>Saltwhistle Bay</p>
      <p class="sec">In memory of</p><p>Rose, who knew things</p>
      <p class="end">The End</p><p class="small">…but the path is always there.</p></div>`;
    document.body.appendChild(el);
    cutscene(async () => {
      const shots = [[[-6, 6, -8], [0, 0, -24], 7], [[-60, 4, -104], [-60, -2, -124], 6], [[-18, 5, -128], [-2, 1, -145], 6], [[-30, 32, -290], [80, 6, -250], 6], [[160, 12, -226], [186, 3, -242], 6], [[40, 16, -60], [0, 0, -20], 7]];
      requestAnimationFrame(() => el.classList.add('on'));
      for (const [pos, look, t] of shots) { UI().fade(true); await wait(0.7); if (pos[2] < -200) { R.ensureAt(look[0], 5, look[2]); } cut(pos, look, 0.1); UI().fade(false); await shot([pos[0] + 3, pos[1] + 0.6, pos[2] - 2], look, t); }
      UI().fade(true); await wait(1.2);
    }).then(() => {
      el.remove(); g.flag('finaleDone'); SQ.collect('m_rose'); g.startChapter(19, true);
      g.player.teleport(-1.8, 0, -20.4, Math.PI); g.cam.snap = true; UI().fade(false);
      const e = document.getElementById('ending'); e.querySelector('.over').textContent = 'The End'; e.querySelector('h2').textContent = 'The Hidden Path';
      e.querySelector('.story').textContent = 'Milo followed the carved acorns beyond the creek, through Rose’s garden and the forgotten house, over the mountain and under it, through the storm, all the way to Thistlecombe. He brought Juniper home to Ellie and Arlo, and Hazel home to Moss. Free Explore is now open: the whole world is yours.';
      SQ.endingMode = true; UI().ending(g.stats()); document.getElementById('endRoam').textContent = 'Free Explore';
      SQ.endingMode = false;
    });
  }

  /* ================================================================ FREE EXPLORE (chapter id 19) */
  SQ.onStart[19] = () => { if (!has('freeHello')) { game().flag('freeHello'); SQ.toast('Free Explore', 'Everywhere is open. Nora’s burrows now reach every place you’ve been (open the map to travel).', G.UI.portraits && G.UI.portraits.nora); } };
  SQ.placement[19] = (P0) => { P0.moss = { pos: [-6.2, 0, -22.8], yaw: 0.6 }; return P0; };
  SQ.travelSpots.push(['farwood', 'The Far Wood', [-72, 0, -140], 0], ['wrenGarden', 'Rose’s Garden', [-6, 0, -136], Math.PI], ['lookout', 'Rose’s Lookout', [-40, 0, -292.6], Math.PI], ['dCrystal', 'The Deepways', [24, UG, -309.4], 0], ['minehead', 'Storm Valley', [54, 0, -294], Math.PI / 2], ['vsquare', 'Thistlecombe', [182, 0, -238], Math.PI / 2]);
  // the ending button leads into Free Explore after the finale
  const oEI = G.EXT.init; G.EXT.init = function (g) { oEI(g); const b = document.getElementById('endRoam'); if (b) { const o = b.onclick; b.onclick = () => { if (S().chapter === 19) { document.getElementById('ending').hidden = true; b.textContent = 'Keep exploring'; game().state = 'play'; } else o && o(); }; } };
  

  /* ================================================================ world state */
  function applyDeep() {
    const f = S().flags, water = W.obj.deepWater, gate = W.obj.sluiceGate, lev = W.obj.sluiceLever; if (!water) return;
    water.position.y = f.deepDrained ? UG - 0.3 : UG + 0.45; if (gate) gate.position.y = f.deepDrained ? UG + 1.6 : UG; if (lev && lev.userData.arm) lev.userData.arm.rotation.z = f.deepDrained ? -0.7 : 0.7;
    const hz = W.hazards.find((h) => h.name === 'deepRiver'); if (hz) hz.y = f.deepDrained ? UG - 0.35 : UG + 0.45;
    const lamp = W.obj.liftLamp; if (lamp) lamp.material.emissiveIntensity = f.liftOn ? 2.5 : 0;
  }
  function applyValley() {
    const f = S().flags, t = W.obj.stormTree; if (!t) return;
    t.rotation.z = f.stormTree ? Math.PI / 2 - 0.06 : 0; if (W.col.stormTreeUp) W.col.stormTreeUp.on = !f.stormTree; if (W.col.stormLog) W.col.stormLog.on = !!f.stormTree;
    for (const k of ['stormTreeUp', 'stormLog']) if (W.col[k]) game().hashC(W.col[k]);
  }
  function applyVillage() { const f = S().flags; if (W.obj.wheelJam) W.obj.wheelJam.visible = !f.wheelFree; }
  SQ.onApply(() => { applyDeep(); applyValley(); applyVillage(); });
  for (const [id, fn] of [['deep', applyDeep], ['valley', applyValley], ['village', applyVillage]]) { const d = R.byId[id]; const ob = d.onBuilt; d.onBuilt = (g, c) => { ob && ob(g, c); fn(); }; }
  // hidden homes you can peek into
  G.INTERACT.push(
    { id: 'home_digby', pos: [21, UG, -317.2], r: 1, label: "Knock on Digby's round door", when: () => ch() >= 14, act: () => { if (!game().gotC('h_digby')) SQ.collect('h_digby'); say([['milo', 'Knock knock! ...It smells of lamp oil and something called worm pie. I’ll pass on the pie.', 'happy']]); } },
    { id: 'home_combe', pos: g_(174.4, -271), r: 1.4, label: 'Peek at the round doors in the bank', when: () => ch() >= 16 && !inStep('s16_arrive', 's16_hazel'), act: () => { if (!game().gotC('h_combe')) SQ.collect('h_combe'); say([['milo', 'Seven little round doors, each a different colour. The one in the middle has a sign: GO AWAY. Politely underlined.', 'happy']]); } },
  );

  /* ================================================================ journal: the new places on the map */
  const oEI2 = G.EXT.init; G.EXT.init = function (g) {
    oEI2(g);
    const tabs = document.getElementById('mapTabs');
    const addTab = (v, label) => { if (tabs && !tabs.querySelector(`[data-v="${v}"]`)) { const b = document.createElement('button'); b.dataset.v = v; b.textContent = label; tabs.appendChild(b); } };
    addTab('north', 'Old Garden & Mountain'); addTab('east', 'Valley & Village'); addTab('deep', 'The Deepways');
    SQ.mapViews.north = { bounds: [-160, 40, -335, -95], show: () => ch() >= 10, bg: '#e2d6ba', draw: (c, X, Z) => { c.strokeStyle = 'rgba(80,110,140,.7)'; c.lineWidth = 3; c.beginPath(); for (let z = -70; z >= -146; z -= 4) { const x = -80 + 5 * Math.sin((z + 70) * 0.04); z === -70 ? c.moveTo(X(x), Z(z)) : c.lineTo(X(x), Z(z)); } c.stroke(); } };
    SQ.mapViews.east = { bounds: [40, 230, -330, -160], show: () => ch() >= 15 || has('liftOn'), bg: '#e2d6ba', draw: (c, X, Z) => { c.strokeStyle = 'rgba(80,110,140,.75)'; c.lineWidth = 4; c.beginPath(); for (let z = -330; z <= -160; z += 5) { const x = rx(z); z === -330 ? c.moveTo(X(x), Z(z)) : c.lineTo(X(x), Z(z)); } c.stroke(); } };
    SQ.mapViews.deep = { bounds: [-72, 36, -320, -292], ug: true, show: () => ch() >= 14, bg: '#cbbfa6' };
  };

  /* ================================================================ item models */
  const baseMake = G.makeItem;
  G.makeItem = function (id) {
    const g = new THREE.Group();
    if (id === 'shard' || id === 'glowshard') { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), M.std('shardM', { color: 0xc0a0ff, emissive: 0x9f7fff, ei: 1.6, rough: 0.2, transparent: true, opacity: 0.9 })); m.scale.y = 1.8; m.position.y = 0.06; g.add(m); return g; }
    if (id === 'honeycomb') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 6), M.std('comb', { color: 0xf2b030, rough: 0.3, emissive: 0x5a3a00, ei: 0.3 })); m.position.y = 0.01; g.add(m); return g; }
    if (id === 'lantern') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.std('paperLantern', { color: 0xffd9a0, emissive: 0xffb050, ei: 1.2 })); m.scale.y = 1.2; m.position.y = 0.04; g.add(m); return g; }
    return baseMake(id);
  };
})();
