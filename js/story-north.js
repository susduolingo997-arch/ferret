/* =====================================================================
   story-north.js - Chapters Six to Nine.
   6  Beyond the Creek      the hidden upstream path, the ravine, Otto
   7  The Old Garden        Rose's garden, her journal, the fountain
   8  The Forgotten House   memories, the stopped clocks, Arlo's study
   9  The Mountain Trail    the prickly scent, the hawk, Rose's lookout
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

  /* ================================================================ items, collectibles */
  Object.assign(G.ITEMS, {
    carvedacorn: { name: 'Carved Acorn', desc: 'A tiny wooden acorn carved with a spiral. Moss found it bobbing down Whisper Creek. Who makes these?', story: true },
    ottoshell: { name: "Otto's Lucky Shell", desc: 'A pearly river shell, slightly chewed. Otto swears it is lucky.', story: true },
    spout: { name: 'Brass Fish Spout', desc: 'A little brass spout shaped like a fish’s mouth. It belongs to the garden fountain.', story: true },
    rosepage1: { name: "Rose's Journal (spring)", desc: '"The roses are up! Arlo built the fountain for my birthday and pretends the fish is a trout. It is not a trout."', story: true },
    rosepage2: { name: "Rose's Journal (summer)", desc: '"Too tired to weed today. Arlo did it all, badly and lovingly. Juniper dug up the peonies AGAIN."', story: true },
    rosepage3: { name: "Rose's Journal (autumn)", desc: '"If I can’t tend the garden, let it grow wild and happy. Plant a white rose for Ellie. The little ones in the hills will look after the rest."', story: true },
    arloletter: { name: "Arlo's Letter", desc: '"Juniper keeps vanishing toward the mountains. I followed her once, past Rose’s lookout. There are little folk up there, with a village of their own, and Rose’s roses grow by their doors."', story: true },
    bilberry: { name: 'Mountain Bilberry', desc: 'A purple berry stem from the attic floor. It only grows high on the mountain.', story: true },
    painting: { name: "Rose's Painting", desc: 'A small watercolour of a hidden valley, with tiny round doors and smoke curling from tiny chimneys.', story: true },
    thimble: { name: 'Thimbles', desc: 'Sewing thimbles. Thimble the mouse collects them. Obviously.', stack: true },
  });
  const AC = [
    ['a_ac1', -75.3, -121.2, 'In a crack of the old bridge'], ['a_ac2', -66.7, -132.2, 'On the path past the ravine'], ['a_ac3', -71.8, -142.6, 'Near the otter pool'],
    ['a_ac4', -24, -160, 'In an overgrown rose bed'], ['a_ac5', 21.4, -158.3, 'Among the greenhouse pots'], ['a_ac6', -4.6, -108, 'On the parlour mantelpiece', 1.3], ['a_ac7', -9.6, -106, 'Under a trunk in the attic', 5.6],
    ['a_ac8', -34, -216, 'By the mountain trail'], ['a_ac9', -44, -300, 'Tucked under the lookout', null],
  ];
  for (const [id, x, z, desc, y] of AC) G.COLLECT.push({ id, cat: 'acorns', model: 'acorn', name: 'Carved Acorn', desc: desc + '. A spiral is carved on its cap.', pos: [x, y === undefined ? 'g' : y === null ? 'g' : y, z] });
  G.COLLECT.push(
    { id: 'g_gold1', cat: 'golden', model: 'goldacorn', name: 'Golden Acorn', desc: 'Hidden in the Whispering Grove. It hums faintly when you hold it.', pos: [-136.2, 'g', -163.4], scentOnly: true },
    { id: 'g_gold2', cat: 'golden', model: 'goldacorn', name: 'Golden Acorn', desc: 'Sable’s prize for answering all three riddles.', pos: null },
    { id: 'p_rose', cat: 'photos', model: 'photo2', name: 'Photo: Rose’s Garden', desc: 'Rose on her knees in the roses, laughing, with dirt on her nose.', pos: [7.4, 0.9, -104.2] },
    { id: 'p_wed', cat: 'photos', model: 'photo5', name: 'Photo: Arlo & Rose', desc: 'The day they planted the garden. Arlo is holding the wrong end of the spade.', pos: [-6.6, 3.3, -120.4] },
    { id: 'p_eli3', cat: 'photos', model: 'photo4', name: 'Photo: Ellie, Age Three', desc: 'Ellie in wellies, chasing a ferret with a red ribbon around the fountain.', pos: [-12.8, 3.25, -105.8] },
    { id: 'p_juni', cat: 'photos', model: 'photo3', name: 'Photo: Juniper Asleep', desc: 'Juniper curled in a teapot in the greenhouse. The teapot still has a mouse in it.', pos: [-8, 6.2, -117] },
  );
  const MEM = { m_piano: 'The Piano', m_specs: "Rose's Spectacles", m_calendar: 'The Kitchen Calendar', m_marks: 'Height Marks', m_bed: 'Rose’s Nightstand', m_bench: "Arlo's Workbench", m_sheet: 'The Dust Sheet', m_bird: 'The Clockwork Bird', m_rose: 'The White Rose', m_paint: "Rose's Paint Tin" };
  for (const k in MEM) G.COLLECT.push({ id: k, cat: 'memories', model: k === 'm_rose' ? 'feather3' : 'photo1', name: MEM[k], desc: 'A memory of the Wren family, found in the old cottage.', pos: null });
  G.COLLECT.push({ id: 'h_dormouse', cat: 'homes', model: 'acorn', name: "Dormouse Nest", desc: 'A woven ball of grass in the Whispering Grove. Someone is snoring inside.', pos: null }, { id: 'h_badger', cat: 'homes', model: 'acorn', name: "Bracken's Sett", desc: 'An old badger lives here. He would like you to leave now, please.', pos: null }, { id: 'h_bees', cat: 'homes', model: 'acorn', name: 'Bee Hotel', desc: 'A block of hollow stems in the Old Garden, humming like a tiny town.', pos: null });
  for (let i = 1; i <= 5; i++) G.PICKUPS.push({ id: 'p_thimble' + i, item: 'thimble', model: 'thimble', pos: [[-26.4, 'g', -150.8], [19.6, 0.83, -159.3], [-30, 0.83, -132.4], [5.2, 0.8, -104.6], [3, 2.82, -103.6]][i - 1], when: () => (S().quests || {}).thim === 'find', msg: i === 1 ? 'A tiny silver thimble! Thimble the mouse would love this.' : null });
  G.PICKUPS.push(
    { id: 'p_ottoshell', item: 'ottoshell', model: 'shell', pos: [-86.4, 'g', -157.8], when: () => st() === 's10_shell', msg: 'A pearly shell, wedged behind the waterfall rocks. Otto’s lucky shell!' },
    { id: 'p_spout', item: 'spout', model: 'spout', pos: [-31, 0.06, -130.6], when: () => ch() >= 11 && !has('spoutFit'), msg: 'A brass fish spout, rolled under the shed shelf. It looks like it belongs on a fountain.' },
    { id: 'p_page1', item: 'rosepage1', model: 'journal', pos: [-28.4, 0.82, -132.5], when: () => ch() >= 11, msg: null },
    { id: 'p_page2', item: 'rosepage2', model: 'journal', pos: [17.6, 0.82, -159.2], when: () => ch() >= 11, msg: null },
    { id: 'p_bilberry', item: 'bilberry', model: 'bilberry', pos: [-3, 5.62, -119.6], when: () => ch() >= 12 && inStep('s12_window', 's12_prints'), msg: null },
  );

  /* ================================================================ steps */
  Object.assign(G.STEPS, {
    s10_intro: T('Talk to Moss in the backyard', () => [-6.2, 0, -22.8]),
    s10_creek: T('Meet Moss where Whisper Creek comes out of the hills', P.far.moss),
    s10_thicket: T('Push through the bramble thicket', P.far.thicket),
    s10_upstream: T('Follow the creek upstream into the Far Wood', P.far.ravineS),
    s10_ravine: T('Find a way across the old ravine (try your nose)', () => (game().player.pos.y < UG + 12 ? [-54.6, UG, -125.7] : P.far.holeS)),
    s10_bridge: T('Kick the loose planks into place so Moss can cross', P.far.ravineN),
    s10_acorns: T('Follow the trail of carved acorns (sniff with Q)', () => SQ.trailPos(SQ.trails.acorns)),
    s10_otto: T('Say hello to whoever is splashing in the pool', P.far.otto),
    s10_shell: T('Find Otto’s lucky shell (listen for warmer and colder)', () => (item('ottoshell') ? P.far.otto : null)),
    s10_wall: T('Follow the path east to the old stone wall', P.far.gate),
    s11_drain: T('Find a way through the garden wall', P.far.drain),
    s11_explore: T('Explore the overgrown garden', () => [[-3, 0, -139], [16, 0, -151], [-29, 0, -126.2]].find((p, i) => !has(['gv_f', 'gv_g', 'gv_s'][i])) || null, { subs: () => [['Fountain', has('gv_f')], ['Greenhouse', has('gv_g')], ['Shed', has('gv_s')]] }),
    s11_pages: T('Find the three pages of Rose’s garden journal', () => (!item('rosepage1') ? P.wren.shed : !item('rosepage2') ? P.wren.greenhouse : !item('rosepage3') ? P.wren.sundial : null), { count: () => [['rosepage1', 'rosepage2', 'rosepage3'].filter(item).length, 3] }),
    s11_fountain: T('Make Rose’s fountain flow again', () => (!has('spoutFit') && !item('spout') ? [-31, 0, -130.6] : !has('spoutFit') ? P.wren.fountain : !has('valveOpen') ? P.wren.valve : P.wren.fountain), { subs: () => [['Brass spout', has('spoutFit')], ['Water valve', has('valveOpen')]] }),
    s11_passage: T('Follow the water down under the fountain', () => (game().player.pos.y < UG + 12 ? [-3, UG, -119.5] : [-4.3, 0, -142.6])),
    s12_cellar: T('Find your way up out of the cellar', [-3.3, -2.6, -107.4]),
    s12_explore: T('Explore the Forgotten House and its memories', null, { count: () => [Object.keys(MEM).filter((k) => k !== 'm_paint' && k !== 'm_rose' && game().gotC(k)).length, 5] }),
    s12_note: T('Every clock has stopped. Look in the Clock Room upstairs', [5, 2.8, -104.2]),
    s12_clocks: T('Set all four clocks to seven o’clock', () => { const c = (W.wrenClocks || []).find((k) => clockH(k.id) !== 7); return c ? [c.pos[0] + (c.id === 'clockroom' ? -0.6 : 0.5), c.pos[1] > 3 ? 2.8 : 0, c.pos[2]] : null; }, { subs: () => (W.wrenClocks || []).map((k) => [{ hall: 'Hall', parlor: 'Parlour', kitchen: 'Kitchen', clockroom: 'Clock Room' }[k.id], clockH(k.id) === 7]) }),
    s12_study: T('Step into Arlo’s hidden study', [-15.6, 0, -117.5]),
    s12_attic: T('Moss smells a hedgehog in the attic. Go and look', [-3, 5.6, -110]),
    s12_prints: T('Follow the tiny prickly footprints', () => SQ.trailPos(SQ.trails.attic)),
    s12_window: T('Look out of the open attic window', [-3, 5.6, -119.8]),
    s13_gate: T('Nudge open the garden’s north gate', [0, 0, -170.6]),
    s13_scent: T('Follow the prickly scent up the mountain (sniff with Q)', () => SQ.trailPos(SQ.trails.mount1)),
    s13_meadow: T('Cross the tall grass. When the hawk’s shadow passes, stay still!', g_(-20, -238)),
    s13_scent2: T('Pick up the scent again past the little falls', () => SQ.trailPos(SQ.trails.mount2)),
    s13_slide: T('Climb around the rockslide', g_(-50, -279)),
    s13_lookout: T('Climb up to the old lookout', () => [-40, P.mount.deckY || 26, -300]),
    s13_cave: T('The scent goes into the cave on the ridge', P.mount.cave),
  });

  /* ================================================================ NPCs */
  const mossSpec = { color: 0x6a4a33, face: 0xd9c0a0, tip: 0xe8dcc4, scale: 1.3, shy: true };
  const companion = () => ch() >= 10 && ch() <= 12 && has('mossWith');
  NPC.add({ id: 'mossC', name: 'Moss', kind: 'hedgehog', look: mossSpec, portrait: false, sound: 'snuffle',
    when: () => ch() >= 10 && ch() <= 12 && !inStep('s10_intro'), pos: () => (inStep('s10_ravine', 's10_bridge') ? P.far.ravineS : has('mossWith') ? mossSpot() : st() === 's10_creek' || st() === 's10_thicket' ? P.far.moss : mossSpot()),
    lines: () => mossLines(), tick: (dt, d) => { d.following = companion() && !inStep('s10_ravine', 's10_bridge') && !d.path; } });
  const mossSpot = () => { const p = game().player.pos; return [p.x - 0.8, p.y, p.z - 0.8]; };
  function mossLines() {
    const s = st();
    if (s === 's10_creek' || s === 's10_thicket') return [['moss', 'See? Right here, where the creek comes out of the hill. Brambles. And behind them... a path. I can smell it.', 'think'], ['moss', 'You’re better at pushing than me. I just get stuck. Spiky, you know.', 'shy']];
    if (s === 's10_ravine') return [['moss', 'The bridge is broken, Milo. I’m not jumping THAT. But... can you smell that? Old tunnel air, under those mossy rocks.', 'think']];
    if (s === 's10_bridge') return [['moss', 'You made it across! Can you fix the bridge from that side? Kick the loose planks back!', 'happy']];
    if (ch() === 11) return [['moss', ['Everything here smells of roses. Old ones. Sleepy ones.', 'Somebody loved this garden a lot, Milo. You can tell.', 'I found a snail. His name is Gary. I named him.'][Math.floor(Math.random() * 3)], 'happy']];
    if (ch() === 12) return [['moss', ['This house is so quiet. Like it’s holding its breath.', 'I keep smelling hedgehog. Not me. Another hedgehog. It’s... strange.', 'Do you think Ellie ever lived here? It smells a little like her.'][Math.floor(Math.random() * 3)], 'think']];
    return [['moss', 'Lead the way, Milo. I’m right behind you. Mostly.', 'happy']];
  }
  NPC.add({ id: 'otto', name: 'Otto', kind: 'otter', look: { scale: 1.2, scarf: 0x3f8a74 }, sound: 'otter', pos: P.far.otto, yaw: -1.3, when: () => ch() >= 10 && !(ch() === 10 && ['s10_intro', 's10_creek', 's10_thicket', 's10_upstream', 's10_ravine', 's10_bridge', 's10_acorns'].includes(st())), lines: () => ottoLines(), wander: 1.2 });
  function ottoLines() {
    const s = st();
    if (s === 's10_otto') return [
      ['otto', 'OH! A FERRET! A long, fluffy, land-otter! Hello! I’m Otto! This is my pool! That’s my log! Do you want to see me slide down it? Watch!', 'happy'],
      { do: () => { A.play('splash'); game().particles.burst(V3(-84, -0.5, -147.5), 26, 0xcfe6f0, 'splash'); } },
      ['milo', 'We followed carved acorns up the creek. Do you know where they come from?', 'think'],
      ['otto', 'Acorns! Every spring they come bobbing down from up the hill. Little spirals on them. I collect them! Well. I USED to. Then I lost my lucky shell and now I can’t concentrate.', 'sad'],
      ['otto', 'Tell you what. Find my lucky shell and I’ll tell you everything I know. It’s somewhere near the waterfall. I’ll shout warmer and colder!', 'smug'],
      { do: () => step('s10_shell') },
    ];
    if (s === 's10_shell' && item('ottoshell')) return [
      ['otto', 'MY SHELL! My beautiful, lucky, slightly-chewed shell! You’re the best land-otter in the world!', 'happy'],
      { do: () => { game().take('ottoshell'); A.play('otter'); } },
      ['otto', 'Okay, okay. A deal’s a deal. The acorns come from the east, over the old stone wall. There’s a garden there. A lady used to live in it.', 'think'],
      ['otto', 'She smelled of roses and she left berries out for all of us. Then one winter she stopped coming, and the gate got locked, and the garden went wild.', 'sad'],
      ['otto', 'But the acorns still come. And lately... a little prickly someone sneaks through, very early, carrying them. Toward the mountains. Friend of yours?', 'think'],
      ['moss', 'Prickly? Like... a hedgehog? Out HERE?', 'surprised'],
      ['otto', 'Follow the path east from the pool. You can’t miss the wall. It’s very wall-ish.', 'happy'],
      { do: () => step('s10_wall') },
    ];
    if (s === 's10_shell') return [['otto', game().player.pos.distanceTo(V3(-86.4, game().player.pos.y, -157.8)) < 6 ? 'You’re HOT! Boiling! Behind the waterfall rocks!' : 'Cold! Frosty! Try near the waterfall!', 'happy']];
    return [['otto', ['Want to hear the acorn count? It’s eleven. No, twelve. I ate one.', 'Sometimes I float on my back and look at the clouds. That one looks like you!', 'The creek’s been noisy since the storm. Lots of sticks. Great sticks.', 'If you ever find more carved acorns, I want to see them! I won’t eat them. Probably.'][Math.floor(Math.random() * 4)], 'happy']];
  }
  NPC.add({ id: 'bracken', name: 'Old Bracken', kind: 'badger', look: { scale: 1.2, glasses: true, hatScale: 1.5 }, sound: 'badger', pos: [-121.6, 'g', -129.6], yaw: 1, when: () => ch() >= 10, lines: () => brackenLines() });
  function brackenLines() {
    const first = !has('met_bracken');
    const l = [first ? ['bracken', 'Hrmph. A ferret. In my sett. Without knocking. The youth of today.', 'smug'] : ['bracken', 'You again. I suppose you want tea. I don’t have tea. I have roots.', 'sleepy']];
    if (first) l.push({ do: () => SQ.collect('h_badger') }, ['bracken', 'I’ve lived in this wood since before your mother was a kit. I remember the ribboned ferret. She dug under my sett twice. Rude, but polite about it.', 'think'], ['bracken', 'She was always going east, then north. Up the mountain. Carrying things. Songs, mostly. Now leave an old badger to his nap.', 'sleepy']);
    else if (ch() >= 16) l.push(['bracken', 'Found the little village, did you? Tell Thistle that Bracken says her pie is still too sweet.', 'smug']);
    return l;
  }
  NPC.add({ id: 'barnaby', name: 'Barnaby', kind: 'toad', look: { scale: 1.8, color: 0x6a6a38 }, sound: 'toad', pos: [-0.2, 'g', -139.4], yaw: 2.6, when: () => ch() >= 11 && !(ch() === 11 && st() === 's11_drain'), lines: () => barnabyLines() });
  function barnabyLines() {
    if (has('fountainOn')) return [['barnaby', 'Water! In MY fountain! After all these years! Oh, it tickles. Ribbit. I’m not crying, it’s just the splashing.', 'happy']];
    if (st() === 's11_fountain' || st() === 's11_pages') return [['barnaby', 'The fountain? The fish lost its spout in a storm. Rolled under something, I expect. And the water was turned off at the wheel in the shed.', 'think'], ['barnaby', 'Rose used to sing to me while she weeded. Old toads remember these things.', 'sad']];
    return [['barnaby', 'Ribbit. Visitors. First in years. Mind the brambles, they bite.', 'sleepy'], ['barnaby', 'This was Rose’s garden. Rose Wren. She planted every rose you see, and a few you can’t.', 'think']];
  }
  NPC.add({ id: 'thimble', name: 'Thimble', kind: 'mouse', look: { scale: 1.2, color: 0xa89078, apron: 0xd98f6a, apronScale: 0.5, hat: 'bonnet', hatScale: 0.8 }, sound: 'squeak', pos: [12.7, 'g', -153.2], yaw: -0.6, wander: 0.6, when: () => ch() >= 11, lines: () => thimbleLines() });
  function thimbleLines() {
    const q = (S().quests || {}).thim, n = S().inv.thimble || 0;
    if (!q) return [['thimble', 'Eek! Oh. A ferret. Please don’t eat my teapot. I live in it.', 'surprised'], ['thimble', 'I’m Thimble. I collect thimbles. Rose had FIVE and I had them all, until the jackdaws moved them about. Now they’re everywhere. Garden, shed, even the big house.', 'sad'], ['thimble', 'If you found them, I’d be ever so grateful. I’d give you my best secret.', 'shy'], { do: () => G.EXT.startQuest('thim', 'find') }];
    if (q === 'find' && n >= 5) return [['thimble', 'All FIVE! Oh, oh, oh! Look at them shine!', 'happy'], { do: () => { game().take('thimble', 5); } }, ['thimble', 'My best secret: the bees in the old wall have a hotel. A whole bee hotel! Behind the rose arbour. And Rose kept a golden acorn in the Whispering Grove, past Old Bracken’s. Sniff for it.', 'smug'], { do: () => { G.EXT.setQuest('thim', 'done'); SQ.collect('h_bees'); game().flag('sniffed_g_gold1'); game().refreshItems(); } }];
    if (q === 'find') return [['thimble', `${n} of 5! Keep looking! One was in the shed, one in the greenhouse, one by the rose beds... and two ran off to the big house.`, 'happy']];
    return [['thimble', ['I’m polishing them. Every day. That’s normal.', 'The white rose in the greenhouse is the only one still blooming. I talk to it.', 'Your friend Moss snores like a kettle.'][Math.floor(Math.random() * 3)], 'happy']];
  }
  G.QUESTS.thim = { kind: 'Side quest', title: "Thimble's Thimbles", giver: 'Thimble', steps: { find: 'Find five thimbles in the Old Garden and the Forgotten House' }, done: 'Thimble’s teapot is full of shine again.', target: () => { const p = game().player.pos; const t = G.PICKUPS.filter((q) => q.id.startsWith('p_thimble') && !S().flags['got_' + q.id]).map((q) => q.pos); t.sort((a, b) => U.dist2(a[0], a[2], p.x, p.z) - U.dist2(b[0], b[2], p.x, p.z)); return t[0] || null; } };
  NPC.add({ id: 'nimbus', name: 'Nimbus', kind: 'marmot', look: { scale: 1.1, scarf: 0xd9573b, scarfScale: 1.3 }, sound: 'whistle', pos: g_(-27, -256.5), yaw: 0.5, when: () => ch() >= 13, lines: () => nimbusLines() });
  function nimbusLines() {
    if (ch() === 13 && inStep('s13_scent', 's13_meadow')) return [['nimbus', 'WHEEEET! Oh. Sorry. That’s my hawk whistle. I’m the lookout. You’re a very long marmot.', 'surprised'], ['nimbus', 'The hawk hunts over the tall grass. When its shadow comes, don’t run. Freeze. Grass is only a hiding place if you’re still.', 'think']];
    return [['nimbus', ['A prickly little thing went past at dawn. Up toward the lookout. Carrying berries. Very determined.', 'The rockslide? Go round it. The ledges on the left are good, if you don’t look down. Don’t look down.', 'WHEEEET! ...False alarm. It was a cloud.'][Math.floor(Math.random() * 3)], 'think']];
  }
  NPC.add({ id: 'sable', name: 'Sable', kind: 'marten', look: { scale: 1.15, ribbon: 0x6a4a9a }, sound: 'chatter', pos: g_(-58.5, -276.4), yaw: 1.2, when: () => ch() >= 13, lines: () => sableLines() });
  G.QUESTS.sable = { kind: 'Side quest', title: "Sable's Riddles", giver: 'Sable', steps: { r1: 'Answer Sable’s first riddle', r2: 'Answer Sable’s second riddle', r3: 'Answer Sable’s third riddle' }, done: 'Sable was not impressed. Very impressed.', target: () => g_(-58.5, -276.4) };
  function sableLines() {
    const q = (S().quests || {}).sable, E = G.EXT;
    const riddle = (id, text, opts, right, nxt) => [['sable', text, 'smug'], { choice: opts.map((o, i) => ({ t: o, then: i === right ? [['sable', 'Hmph. Correct. How annoying.', 'surprised'], { do: () => { if (nxt === 'done') { E.setQuest('sable', 'done'); SQ.collect('g_gold2'); } else E.setQuest('sable', nxt); } }] : [['sable', 'Wrong! Hee hee. Come back when your brain has warmed up.', 'happy']] })) }];
    if (!q) return [['sable', 'Well, well. A ferret who climbs mountains. Clever or foolish? Let’s find out. Three riddles. Get them right and I’ll give you something shiny.', 'smug'], { do: () => E.startQuest('sable', 'r1') }];
    if (q === 'r1') return riddle('r1', 'I have roots nobody sees, I’m taller than trees, up, up I go, and yet I never grow. What am I?', ['A mountain', 'A cloud', 'A very tall squirrel'], 0, 'r2');
    if (q === 'r2') return riddle('r2', 'The more of me you take, the more you leave behind. What am I?', ['Treats', 'Footsteps', 'Naps'], 1, 'r3');
    if (q === 'r3') return riddle('r3', 'I sing without a mouth, I go round without legs, and a little girl wound me every night. What am I?', ['A windmill', 'A music box', 'A cat'], 1, 'done');
    return [['sable', 'You again. Still clever? Hmph. The golden acorn suits you.', 'smug']];
  }

  /* ================================================================ placement of old friends */
  SQ.placement[10] = (P0, s) => { if (s !== 's10_intro') delete P0.moss; return P0; };
  SQ.placement[11] = (P0) => { delete P0.moss; return P0; };
  SQ.placement[12] = (P0) => { delete P0.moss; return P0; };
  SQ.placement[13] = (P0) => { P0.moss = { pos: [-8, 0, -126], yaw: 0.5 }; P0.tilly = { pos: [-38.6, 2.4, -150], yaw: 1.57 }; return P0; };

  /* ================================================================ dialogue for the old friends */
  const baseMossEp = G.DIALOGUE.moss;
  G.DIALOGUE.moss = function () {
    const s = S();
    if (s.chapter === 6) { const l = baseMossEp(); if (!SQ.s().started) l.push(['moss', 'Milo... can I show you something? It came floating down Whisper Creek this morning.', 'shy'], { choice: [{ t: 'Show me! (Begin Chapter Six)', then: [{ do: () => setTimeout(() => SQ.begin(), 200) }] }, { t: 'Maybe later', then: [['moss', 'Okay. I’ll be here. Under the lettuces.', 'happy']] }] }); return l; }
    if (s.chapter === 13) return [['moss', 'I’ll mind the cottage while you climb. I’m, um, not good with heights. Or hawks. Or up.', 'shy'], ['moss', 'Milo... if there’s another hedgehog up there... tell me, okay?', 'sad']];
    return baseMossEp();
  };
  SQ.dialogue.tilly = (c) => {
    game().tillySighting('s' + c);
    if (c === 10) return [['tilly', 'Off upstream, are we? The creek smells different lately. Honey and cedar. Carved wood.', 'think'], ['tilly', 'I don’t do water. You go. Tell me everything. Don’t tell anyone I asked.', 'smug']];
    if (c === 11 || c === 12) return [['tilly', 'Wren Cottage. My grandmother told me about it. The lady gave cats cream on Sundays.', 'happy'], ['tilly', 'Don’t just stand there, weasel. Old houses keep secrets in their clocks.', 'smug']];
    if (c === 13) return [['milo', 'Tilly! You’re on top of the garden wall!', 'surprised'], ['tilly', 'Obviously. Best view of the mountain. The hawk only takes things that run, darling. Don’t run.', 'smug']];
    return null;
  };
  SQ.dialogue.nora = (c) => { if (c === 10) return [['nora', 'Carved acorns in the creek? How curious. There are old songs about little folk in the hills who carve things. My grandmother sang them.', 'think'], ['nora', 'My burrows don’t reach that far, little one. But I’ll open a new one if you find somewhere worth hopping to.', 'happy']]; return null; };

  /* ================================================================ CHAPTER SIX: Beyond the Creek */
  SQ.onStart[10] = () => {
    say([['moss', 'Milo! Look. This came floating down Whisper Creek this morning.', 'surprised'], { do: () => { game().give('carvedacorn'); } }, ['milo', 'A tiny wooden acorn... with a spiral carved on the cap. Somebody MADE this.', 'surprised'], ['moss', 'It came from upstream. But the creek comes out of a bramble thicket. Nobody goes past the thicket.', 'think'], ['moss', 'I think there’s a path behind it. A hidden one. Will you come? I’ll meet you at the thicket, where the creek comes out of the hill!', 'happy'], ['milo', 'An adventure! Of course I’ll come.', 'happy']], () => step('s10_creek'));
  };
  SQ.trigger(() => st() === 's10_creek' && SQ.near(P.far.moss, 3.2), () => say([['moss', 'You came! Look: the brambles. And the creek goes right under them. Smell that? Old path. Wet stones. Something sweet, like honey.', 'happy'], ['moss', 'You’re better at pushing than me. I just get stuck. Spiky.', 'shy']], () => step('s10_thicket')), false);
  G.INTERACT.push({ id: 'far_thicket', pos: P.far.thicket, r: 1.6, label: () => (st() === 's10_thicket' ? 'Push through the bramble thicket' : 'Sniff the bramble thicket'), anim: 'push', when: () => !has('farOpen'), act: () => {
    if (st() !== 's10_thicket') { say(think(ch() < 10 ? 'Brambles, thick and prickly. The creek disappears under them. Something smells sweet on the other side...' : 'Moss said to meet him here. Where is he?')); return; }
    const g = game(); g.busy = true; g.player.act('push', 2, { lockMove: true }); A.play('rustle'); setTimeout(() => A.play('rustle'), 600);
    const th = W.obj.farThicket; g.tween(1.8, (k) => { if (th) th.children.forEach((b, i) => { b.scale.setScalar(1 - U.smooth(Math.min(1, k * 1.3 - i * 0.02)) * 0.95); b.position.z = -70.2 - k * (i % 2 ? 0.6 : -0.6); }); }, () => {
      g.busy = false; g.flag('farOpen'); g.flag('mossWith'); applyNorth(); A.play('secret'); g.particles.burst(V3(-80, 0.5, -70), 30, 0x6a8a3a, 'dust');
      g.cinematic({ pos: V3(-77, 1.8, -64), look: V3(-80, 0.3, -80), dur: 3 });
      say([['milo', 'A path! It follows the creek up into a wood I’ve never seen. A whole new wood!', 'surprised'], ['moss', 'The Far Wood. Nora’s grandmother used to sing about it. Let’s go!', 'happy']], () => step('s10_upstream'));
    });
  } });
  SQ.trigger(() => st() === 's10_upstream' && game().player.pos.z < -103, () => { game().cinematic({ pos: V3(-58.5, 2.2, -106.5), look: V3(-62, 0, -118), dur: 3.2 }); say([['milo', 'A ravine! Deep, with roots hanging down the sides. And the bridge...', 'surprised'], ['moss', 'Broken. Half the planks are down there. I’m NOT jumping that.', 'sad'], ['milo', 'Hmm. There’s cold air coming from under those mossy rocks. Tunnel air. Let me sniff around.', 'think']], () => { step('s10_ravine'); game().flag('mossWait'); }); });
  G.INTERACT.push({ id: 'far_holeS', pos: [-57, 'g', -109.3], r: 0.9, label: 'Squeeze under the mossy rocks', anim: 'sniff', when: () => ch() >= 10 && has('farOpen'), act: () => game().travel([-57, UG, -109.8], Math.PI, () => { if (!has('visit_glow')) { game().flag('visit_glow'); say(think('A little tunnel under the ravine. And... lights? Glowworms! Hundreds of them.', 'surprised')); } }) });
  G.INTERACT.push({ id: 'far_holeSback', pos: [-57, UG, -109.5], r: 0.7, label: 'Climb back out (south side)', act: () => game().travel([-57, W.groundY(-57, -108.4), -108.4], 0) });
  G.INTERACT.push({ id: 'far_holeN', pos: [-54.6, UG, -125.7], r: 0.7, label: 'Climb out (north side)', act: () => game().travel([-54.5, W.groundY(-54.5, -127), -127.2], Math.PI, () => { if (st() === 's10_ravine') { step('s10_bridge'); say([['milo', 'I’m across! Moss is waving from the other side. The loose planks are right here, I can kick them back into place.', 'happy']]); } }) });
  G.INTERACT.push({ id: 'far_holeNback', pos: [-54.5, 'g', -126.2], r: 0.9, label: 'Squeeze into the tunnel', anim: 'sniff', when: () => ch() >= 10, act: () => game().travel([-54.6, UG, -125.4], 0) });
  G.INTERACT.push({ id: 'far_carving', pos: [-57, UG, -118.4], r: 1.3, label: 'Study the carvings on the wall', act: () => {
    const first = !has('sawCarving'); game().flag('sawCarving');
    say([['milo', 'Carvings. A big spiral... little animals walking toward it... mice, rabbits, hedgehogs... and a long one with a bow. And a J.', 'surprised'], ['milo', 'J for Juniper? She was here. But the spiral is the same as on the acorn. What does it mean?', 'think'], ...(first ? [{ do: () => UI().toast('<b>New clue in your journal</b>', null, 'A spiral carving of little animals, signed with a J, under the Far Wood.') }] : [])]);
  } });
  G.INTERACT.push({ id: 'far_planks', pos: [-62, 'g', -123.6], r: 1.4, label: 'Kick the loose planks into place', anim: 'push', when: () => ch() >= 10 && !has('fwBridge') && game().player.pos.z < -121.6, act: () => {
    const g = game(); g.busy = true; g.player.act('push', 1.6, { lockMove: true }); A.play('scrape'); setTimeout(() => A.play('thud'), 900);
    setTimeout(() => { g.busy = false; g.flag('fwBridge'); applyNorth(); A.play('secret');
      if (st() === 's10_bridge') { const m = NPC.get('mossC'); m.path = [[-62, 0, -112], [-62, 0, -124.5]]; m.pathSpeed = 1.3; m.onArrive = () => { m.path = null; g.flag('mossWait', false); say([['moss', 'I did it! I crossed! Don’t look at my legs, they’re still wobbly.', 'happy'], ['moss', 'Milo, look: another carved acorn, stuck in the bridge. And another one further on! It’s a trail!', 'surprised']], () => step('s10_acorns')); }; }
    }, 1500);
  } });
  SQ.trail('acorns', [g_(-75.3, -121.2), g_(-66.7, -132.2), g_(-71.8, -142.6)], { active: () => st() === 's10_acorns', label: 'Sniff the carved acorn', onNext: (i) => SQ.collect(['a_ac1', 'a_ac2', 'a_ac3'][i - 1]), onDone: () => { SQ.collect('a_ac3'); game().cinematic({ pos: V3(-70, 1.5, -141), look: V3(-80, -0.3, -150), dur: 2.6 }); say([['milo', 'The acorns lead to a pool with a waterfall. And something’s splashing in it. Something big and whiskery.', 'surprised']], () => step('s10_otto')); } });
  SQ.tick((dt) => {
    if (st() !== 's10_shell' || item('ottoshell') || UI().dialogueOpen) return; SQ._hc = (SQ._hc || 0) - dt; if (SQ._hc > 0) return; SQ._hc = 2.4;
    const p = game().player.pos, d = Math.hypot(p.x + 86.4, p.z + 157.8); const w = d < 3 ? 'BOILING hot!' : d < 7 ? 'Warmer! Warmer!' : d < SQ._hd - 0.5 ? 'Warmer...' : d > SQ._hd + 0.5 ? 'Colder!' : 'Hmm, lukewarm.'; SQ._hd = d;
    UI().toast('<b>Otto:</b>', G.UI.portraits.otto, `"${w}"`); A.play('otter', 0.5);
  });
  SQ.trigger(() => st() === 's10_wall' && SQ.near(P.far.gate, 7), () => {
    game().cinematic({ pos: V3(-46, 1.8, -137), look: V3(-40, 1.1, -140), dur: 5 });
    say([['milo', 'An old stone wall, and an iron gate with a rose worked into it. Locked. Rusted shut.', 'surprised'], ['milo', 'And a sign: WREN COTTAGE. Wren... like Arlo Wren. Ellie’s grandpa!', 'surprised'], ['moss', 'Arlo? The one who made the singing box? Then this garden...', 'think'], ['milo', 'Must have been his. And the lady who smelled of roses... We have to get in.', 'think']], () => { A.play('chapter'); setTimeout(() => game().startChapter(11), 600); });
  });
  SQ.onStart[11] = () => say([['milo', 'The gate won’t budge. But water runs out under the wall, down there. A drain. Ferret-sized, probably.', 'think']]);

  /* ================================================================ CHAPTER SEVEN: The Old Garden */
  G.INTERACT.push({ id: 'wren_drain', pos: [-40.9, 'g', -133], r: 0.9, label: 'Squeeze through the drain under the wall', anim: 'sniff', when: () => ch() >= 11 || has('wrenIn'), act: () => game().travel([-38.6, 0.1, -133], Math.PI / 2, () => { if (!has('wrenIn')) { game().flag('wrenIn'); say([['milo', 'I’m in! Oh... oh, it’s beautiful. Wild and tangled and full of roses nobody has trimmed in years.', 'surprised'], ['moss', '(squeezing through behind you) Ow. Ow. Spikes. I’m through!', 'happy']], () => { if (st() === 's11_drain') step('s11_explore'); }); } }) });
  G.INTERACT.push({ id: 'wren_drainBack', pos: [-38.6, 'g', -133], r: 0.8, label: 'Squeeze back out to the Far Wood', when: () => has('wrenIn'), act: () => game().travel([-41.4, W.groundY(-41.4, -133), -133], -Math.PI / 2) });
  SQ.tick(() => {
    if (ch() < 11) return; const p = game().player.pos;
    for (const [k, x, z, r] of [['gv_f', -3, -142, 4.2], ['gv_g', 16, -154, 5.5], ['gv_s', -29, -127, 3.4]]) if (!has(k) && Math.hypot(p.x - x, p.z - z) < r && p.y > -1 && p.y < 3) { game().flag(k); UI().updateObjective(); if (st() === 's11_explore' && ['gv_f', 'gv_g', 'gv_s'].every(has)) setTimeout(() => say([['milo', 'A dry fountain, a glasshouse, a shed... and pages. Look, a torn page from a journal, caught in the roses: "Rose’s garden book".', 'think'], ['milo', 'If I find the rest of it, maybe I’ll understand why nobody comes here any more.', 'think']], () => step('s11_pages')), 300); }
  });
  // the shed: string latch reached from the barrel
  G.INTERACT.push({ id: 'wren_shedString', pos: [-28.55, 1.0, -126.8], r: 1.7, label: 'Tug the string latch', anim: 'interact', when: () => ch() >= 11 && !has('shedOpen2'), act: () => { const g = game(); g.flag('shedOpen2'); A.play('unlock'); g.tween(1.2, (k) => (W.obj.wrenShedDoor.rotation.y = -1.6 * U.smooth(k)), () => { W.col.wrenShedDoor.on = false; }); UI().toast('<b>The shed door creaks open</b>', null, 'Clever ferret.'); } });
  G.INTERACT.push({ id: 'wren_shedDoor', pos: [-29, 0, -126.3], r: 0.9, label: 'Scratch at the shed door', when: () => ch() >= 11 && !has('shedOpen2'), act: () => say(think('Latched with a loop of string, way up high. If I stood on that barrel I could tug it.')) });
  G.INTERACT.push({ id: 'wren_valve', pos: [-30.6, 0, -132.2], r: 0.9, label: () => (has('valveOpen') ? 'The water valve is open' : 'Turn the rusty valve wheel'), anim: 'push', when: () => ch() >= 11 && has('shedOpen2'), act: () => {
    if (has('valveOpen')) return; const s = SQ.s(); s.valve = (s.valve || 0) + 1; A.play('metal'); const wh = W.obj.valveWheel; game().tween(0.8, (k) => (wh.rotation.z = (s.valve - 1 + U.smooth(k)) * 2.1));
    if (s.valve < 3) { UI().toast('<b>Creeeak...</b>', null, `The wheel turns a little. (${s.valve}/3)`); return; }
    game().flag('valveOpen'); A.play('push'); UI().toast('<b>Gurgle gurgle</b>', null, 'Water rumbles in the old pipes.'); UI().updateObjective(); checkFountain();
  } });
  // the greenhouse: push the pots under the broken pane, hop in
  G.INTERACT.push({ id: 'wren_pots', pos: [13.4, 0, -150.2], r: 1.1, label: 'Nudge the flower pots under the broken pane', anim: 'push', when: () => ch() >= 11 && !has('potsMoved'), act: () => { const g = game(); g.player.act('push', 1.2); A.play('scrape'); setTimeout(() => { g.flag('potsMoved'); applyNorth(); A.play('thud'); say(think('A little staircase of pots. Up I go, and in through the broken glass!', 'happy')); }, 1100); } });
  G.INTERACT.push({ id: 'wren_ghDoor', pos: [9.6, 0, -156], r: 0.9, label: 'Push the greenhouse door', when: () => ch() >= 11, act: () => say(think('Swollen shut with damp. But one of the glass panes on the south side is broken...')) });
  G.INTERACT.push({ id: 'wren_rose', pos: [21.2, 0.8, -155], r: 1.1, label: 'Sniff the white rose', anim: 'sniff', when: () => ch() >= 11, act: () => { SQ.collect('m_rose'); say([['milo', 'One white rose, still blooming, all alone in the glasshouse. It smells like... Ellie’s shampoo. No. Like Ellie.', 'surprised']]); } });
  // the sundial page
  G.INTERACT.push({ id: 'wren_sundial', pos: [-14.4, 0, -159.4], r: 0.9, label: () => (item('rosepage3') ? 'Look at the sundial' : 'Dig beside the sundial'), anim: () => (item('rosepage3') ? null : 'dig'), when: () => ch() >= 11, act: () => {
    if (item('rosepage3') || has('got_page3')) { say(think('"Grow old along with me, the best is yet to be." Engraved around the edge.')); return; }
    const g = game(); g.player.act('dig', 1.5, { lockMove: true }); A.play('dig'); const iv = setInterval(() => g.dirtBurst(), 280);
    setTimeout(() => { clearInterval(iv); g.flag('got_page3'); g.give('rosepage3'); readPage(3); }, 1500);
  } });
  function readPage(n) {
    const L = {
      1: [['milo', '"Spring. The roses are up! Arlo built me a fountain for my birthday and swears the fish is a trout. It is NOT a trout."', 'happy'], ['milo', '"Juniper helped plant the tulips. By which I mean she dug them all up again."', 'happy']],
      2: [['milo', '"Summer. Too tired to weed today. Arlo did it all, badly and lovingly."', 'sad'], ['milo', '"The doctor says I must rest. I told him roses don’t rest, and neither do I. Ellie visited and named every snail."', 'sad']],
      3: [['milo', '"Autumn. If I can’t tend the garden, let it grow wild and happy. Don’t tidy it, Arlo. Let it be a home for the little ones."', 'sad'], ['milo', '"Plant a white rose for Ellie, so she always has one. And tell her the little folk in the hills will look after my roses. Juniper knows the way."', 'think']],
    }[n];
    say(L, () => { UI().updateObjective(); if (['rosepage1', 'rosepage2', 'rosepage3'].every(item) && st() === 's11_pages') say([['milo', 'Rose got sick, and couldn’t garden any more. So she asked Arlo to let it grow wild. It wasn’t abandoned. It was LEFT for someone.', 'think'], ['moss', '"The little folk in the hills"... Milo, that’s what the carvings showed. Little animals. Walking toward a spiral.', 'surprised'], ['milo', 'Rose wrote about the fountain too. Maybe if we get it running, we’ll find out more.', 'think']], () => step('s11_fountain')); });
  }
  const oPick = G.game ? null : null;
  const hookPick = (g) => { const op = g.pickUp.bind(g); g.pickUp = function (w) { op(w); const id = w.def.id; if (id === 'p_page1') readPage(1); if (id === 'p_page2') readPage(2); if (id === 'p_bilberry') atticWindow(); }; };
  G.INTERACT.push({ id: 'wren_fish', pos: [-3, 0.2, -140.6], r: 1.4, label: () => (item('spout') && !has('spoutFit') ? 'Fit the brass spout on the stone fish' : 'Look at the stone fish'), when: () => ch() >= 11 && !has('fountainOn'), act: () => {
    if (item('spout') && !has('spoutFit')) { game().take('spout'); game().flag('spoutFit'); applyNorth(); A.play('metal'); UI().toast('<b>Click!</b>', null, 'The spout fits the fish perfectly.'); UI().updateObjective(); checkFountain(); return; }
    say(think(has('spoutFit') ? 'The fish has its spout back. But no water yet. The pipes must be turned off somewhere.' : 'A stone fish, mouth open. Something’s missing from its mouth. A spout?'));
  } });
  function checkFountain() {
    if (!has('spoutFit') || !has('valveOpen') || has('fountainOn')) return;
    const g = game(); g.flag('fountainOn'); g.busy = true;
    g.cinematic({ pos: V3(1.5, 2.2, -137), look: V3(-3, 0.2, -142), dur: 9 });
    setTimeout(() => { A.play('splash'); W.obj.fountainWater.visible = true; W.obj.fountainWater.position.y = -0.3; }, 800);
    g.tween(5, (k) => { W.obj.fountainWater.position.y = -0.3 + k * 0.42; W.obj.fountainLeaves.children.forEach((l, i) => { const a = k * 8 + i; l.position.x = -3 + Math.cos(a) * (1.8 - k * 1.6) - 1.3 * k; l.position.z = -142 + Math.sin(a) * (1.8 - k * 1.6) - 0.6 * k; l.position.y = -0.32 + k * 0.4 - (k > 0.85 ? (k - 0.85) * 3 : 0); }); }, () => { W.obj.fountainLeaves.visible = false; W.obj.fountainHole.visible = true; });
    const iv = setInterval(() => g.particles.burst(V3(-2.75, 1.45, -142), 6, 0xcfe6f0, 'splash'), 150); setTimeout(() => clearInterval(iv), 9000);
    setTimeout(() => { g.busy = false; say([['milo', 'It’s flowing! The fish is spouting water!', 'happy'], ['barnaby', 'RIBBIT! Oh my stars. Just like the old days.', 'happy'], ['milo', 'The leaves swirled away... into a drain at the bottom. A round drain, just ferret-sized. And I can feel air coming UP it.', 'surprised'], ['moss', 'A secret passage under a fountain. Of COURSE there is.', 'happy']], () => step('s11_passage')); }, 6000);
  }
  G.INTERACT.push({ id: 'wren_fhole', pos: [-4.3, -0.3, -142.6], r: 1.1, label: 'Slip down the fountain drain', anim: 'sniff', when: () => has('fountainOn'), act: () => game().travel([-3, UG, -141], 0, () => { if (!has('visit_wpass')) { game().flag('visit_wpass'); say(think('A stone passage, dripping. It runs toward the house. Arlo must have built it so water could reach the cellar.')); } }) });
  G.INTERACT.push({ id: 'wren_passUp', pos: [-3, UG, -120], r: 0.8, label: 'Climb up into the cellar', act: () => game().travel([-10, -2.6, -118.6], Math.PI, () => { if (ch() === 11) { A.play('chapter'); game().startChapter(12); } }) });
  G.INTERACT.push({ id: 'wren_passDown', pos: [-10, -2.6, -119.2], r: 0.7, label: 'Climb down to the fountain passage', when: () => has('fountainOn'), act: () => game().travel([-3, UG, -120.6], Math.PI) });
  G.INTERACT.push({ id: 'wren_passBack', pos: [-3, UG, -141.4], r: 0.7, label: 'Climb back up to the fountain', act: () => game().travel([-5.6, W.groundY(-5.6, -142), -142], -Math.PI / 2) });
  // hidden animal home + a funny one
  G.INTERACT.push({ id: 'wren_bees', pos: [-5.2, 0, -125.4], r: 0.8, label: 'Peek behind the rose arbour', anim: 'sniff', when: () => ch() >= 11, act: () => { SQ.collect('h_bees'); A.play('ui'); say(think('A bee hotel! Dozens of hollow stems, and a busy little bee in every one. Bzzzz. Very rude, bees.', 'happy')); } });

  /* ================================================================ CHAPTER EIGHT: The Forgotten House */
  SQ.onStart[12] = () => say([['milo', 'A cellar. Jars of old jam, a cold boiler, and stairs going up. We’re under the house!', 'surprised'], ['moss', 'It’s so dark. And... dusty. Achoo!', 'shy']]);
  SQ.trigger(() => st() === 's12_cellar' && game().player.pos.y > -0.3 && W.areaAt(game().player.pos.x, game().player.pos.y, game().player.pos.z).zone === 'house2', () => { game().cinematic({ pos: V3(-2.4, 1.7, -103.8), look: V3(-1, 0.6, -115), dur: 3.2 }); say([['milo', 'Oh... dust sheets over everything. Stopped clocks. Photographs. It’s like the house fell asleep and forgot to wake up.', 'surprised'], ['milo', 'Every room must have a story. Let’s find them.', 'think']], () => step('s12_explore')); });
  const memAct = (id, lines) => () => { const had = game().gotC(id); say(lines, () => { if (!had) SQ.collect(id); UI().updateObjective(); if (st() === 's12_explore' && Object.keys(MEM).filter((k) => k !== 'm_paint' && k !== 'm_rose' && game().gotC(k)).length >= 5) setTimeout(() => say([['milo', 'Rose, Arlo, little Ellie, Juniper... they were so happy here.', 'think'], ['milo', 'But every single clock in the house stopped. All at different times. That’s strange for a clockmaker’s house.', 'think']], () => step('s12_note')), 300); }); };
  G.INTERACT.push(
    { id: 'mem_piano', pos: [-12.2, 0, -104.9], r: 1.1, label: 'Press a piano key', anim: 'interact', when: () => ch() >= 12, act: () => { A.musicBox({ vol: 0.07, beat: 0.4, broken: true }); memAct('m_piano', [['milo', 'Plink. Out of tune, but it’s Ellie’s song. Rose must have played it for her here.', 'think']])(); } },
    { id: 'mem_specs', pos: [5.3, 0, -104.9], r: 1, label: 'Look at the spectacles', when: () => ch() >= 12, act: memAct('m_specs', [['milo', 'Little round spectacles on a half-finished quilt. The quilt has ferrets stitched on it. A ferret with a red bow.', 'sad']]) },
    { id: 'mem_cal', pos: [7.4, 0, -117.6], r: 1.1, label: 'Read the kitchen calendar', when: () => ch() >= 12, act: memAct('m_calendar', [['milo', 'A calendar, stopped in April. One day circled in red: "E’s birthday!! Cake. Candles. Hide the cake from J."', 'happy']]) },
    { id: 'mem_sheet', pos: [-8, 0, -109.9], r: 1.2, label: 'Tug the dust sheet', anim: 'interact', when: () => ch() >= 12, act: memAct('m_sheet', [['milo', 'Under the sheet: an old armchair, and a blanket with a little dent in it. Just ferret-sized. Juniper’s spot.', 'surprised']]) },
    { id: 'mem_marks', pos: [-4.6, 2.8, -107.2], r: 1.1, label: 'Look at the marks on the door frame', when: () => ch() >= 12, act: memAct('m_marks', [['milo', 'Pencil marks. "E 3", "E 4", "E 5", "E 6". Ellie grew up here, a little. And right at the bottom, tiny: "J!"', 'happy'], ['milo', 'There’s a birthday card pinned by the bed: "To our Ellie, born at SEVEN O’CLOCK sharp, the best time of all. Love, Gran & Grandpa."', 'think']]) },
    { id: 'mem_bed', pos: [-6.6, 2.8, -119.6], r: 1.1, label: 'Look at the nightstand', when: () => ch() >= 12, act: memAct('m_bed', [['milo', 'A photo of Rose, laughing in the garden. And a pressed white rose. Arlo kept it by the bed.', 'sad']]) },
    { id: 'mem_bench', pos: [5, 2.8, -104.3], r: 1.3, label: 'Read the note on the workbench', when: () => ch() >= 12, act: () => { memAct('m_bench', [['milo', 'A clock, half-built. And a note in Arlo’s handwriting:', 'think'], ['milo', '"I stopped every clock the day we left. Time can wait here for us. When all four strike Ellie’s hour together, my study will open for whoever needs it."', 'surprised']])(); if (inStep('s12_explore', 's12_note')) setTimeout(() => { if (!UI().dialogueOpen) step('s12_clocks'); else SQ._afterNote = true; }, 400); } },
    { id: 'mem_bird', pos: [4, 5.6, -108.6], r: 1.1, label: 'Wind the clockwork bird', anim: 'interact', when: () => ch() >= 12, act: () => { const b = W.obj.clockBird; A.play('bell'); game().tween(2, (k) => { b.rotation.y = Math.sin(k * 20) * 0.5; b.position.y = 6.16 + Math.abs(Math.sin(k * 12)) * 0.05; }); memAct('m_bird', [['milo', 'Tweet-tweet! A little brass bird. It sings the first bars of Ellie’s tune, then stops. Arlo made it for her, I bet.', 'happy']])(); } },
  );
  SQ.tick(() => { if (SQ._afterNote && !UI().dialogueOpen && inStep('s12_explore', 's12_note')) { SQ._afterNote = false; step('s12_clocks'); } });
  const clockH = (id) => { const c = SQ.s().clocks || {}; return c[id] || { hall: 4, parlor: 11, kitchen: 2, clockroom: 9 }[id]; };
  G.INTERACT.push({ id: 'wren_clock', pos: [0, -999, 0], r: 0.9, label: () => 'Turn the clock’s hour hand', when: () => ch() >= 12 && !has('studyOpen'), act: () => {
    const p = game().player.pos; const c = W.wrenClocks.slice().sort((a, b) => U.dist2(a.pos[0], a.pos[2], p.x, p.z) + (a.pos[1] - p.y - 1.4) ** 2 * 4 - U.dist2(b.pos[0], b.pos[2], p.x, p.z) - (b.pos[1] - p.y - 1.4) ** 2 * 4)[0];
    const s = SQ.s(); s.clocks = s.clocks || {}; s.clocks[c.id] = (clockH(c.id) % 12) + 1; A.play('ui'); setClocks(); UI().toast('<b>Tick</b>', null, `The ${{ hall: 'hall', parlor: 'parlour', kitchen: 'kitchen', clockroom: 'clock room' }[c.id]} clock now says ${s.clocks[c.id]} o’clock`); UI().updateObjective();
    if (W.wrenClocks.every((k) => clockH(k.id) === 7)) openStudy();
  } });
  SQ.tick(() => { const it = G.INTERACT.find((i) => i.id === 'wren_clock'); if (!it || !W.wrenClocks) return; const p = game().player.pos; let best = null, bd = 9; for (const c of W.wrenClocks) { const floorY = c.pos[1] > 3 ? 2.8 : 0; const d = Math.hypot(c.pos[0] - p.x, c.pos[2] - p.z); if (d < bd && Math.abs(p.y - floorY) < 1.2) { bd = d; best = c; } } if (best && bd < 1.6) { it.pos[0] = best.pos[0] + (best.id === 'clockroom' ? -0.35 : 0.35); it.pos[1] = best.pos[1] > 3 ? 2.8 : 0; it.pos[2] = best.pos[2]; } else it.pos[1] = -999; });
  function setClocks() { for (const c of W.wrenClocks || []) { c.hand.rotation.z = -((clockH(c.id) % 12) / 12) * Math.PI * 2; } }
  function openStudy() {
    const g = game(); g.flag('studyOpen'); g.busy = true; A.play('bell'); setTimeout(() => A.play('bell'), 400); setTimeout(() => A.play('bell'), 800);
    UI().toast('<b>Bong... bong... bong...</b>', null, 'All four clocks strike seven together.');
    g.cinematic({ pos: V3(-8.6, 1.3, -116.4), look: V3(-13.8, 1, -119), dur: 6 });
    setTimeout(() => { A.play('push'); const bc = W.obj.wrenBookcase; g.tween(2.2, (k) => (bc.position.z = -119 + 1.4 * U.smooth(k)), () => { W.col.wrenBookcase.on = false; g.busy = false; if (inStep('s12_clocks')) step('s12_study'); say(think('The bookcase slid aside! There’s a little room behind it. Arlo’s secret study.', 'surprised')); }); }, 1800);
  }
  SQ.trigger(() => st() === 's12_study' && game().player.pos.x < -14.2 && game().player.pos.y < 2, () => {
    game().cinematic({ pos: V3(-15.2, 1.3, -116.2), look: V3(-16.2, 1.4, -119.9), dur: 99, soft: true });
    say([['milo', 'A map on the wall. Our town, the old wood, this cottage... and a mountain, with a lookout marked "Rose’s lookout".', 'surprised'], ['milo', 'A dotted red line goes past the mountain to a circle. "The little ones. (J. knows the way)"', 'surprised'], ['milo', 'And a letter on the desk...', 'think'], { do: () => game().give('arloletter') },
      ['milo', '"Juniper keeps vanishing toward the mountains. I followed her once, past Rose’s lookout. There are little folk up there, with a village of their own. Rose’s roses grow by their doors."', 'surprised'], ['milo', '"I never told anyone. Who would believe an old clockmaker? But Juniper visits them, and she takes them Ellie’s song."', 'think'],
      ['moss', 'A village. Of little folk. In the mountains.', 'surprised'], ['moss', '...Milo, I smell hedgehog. Fresh. Upstairs. Right at the top of the house.', 'think']], () => { game().cinematicEnd(); step('s12_attic'); });
  });
  SQ.trigger(() => st() === 's12_attic' && game().player.pos.y > 5.2, () => say([['milo', 'The attic. Trunks, dust... and on the floor, in the dust: tiny prickly footprints. Fresh ones.', 'surprised'], ['moss', 'That’s not me! I’ve never been up here!', 'surprised']], () => step('s12_prints')));
  SQ.trail('attic', [[-3, 5.6, -109], [-3, 5.6, -114], [-3, 5.6, -118.6]], { active: () => st() === 's12_prints', label: 'Sniff the little footprints', col: 0xffc0a0, onDone: () => { step('s12_window'); say(think('The footprints go up onto the windowsill. The window is open, just a crack. There’s a purple berry stem on the floor.', 'surprised')); } });
  function atticWindow() {
    if (!inStep('s12_window')) return; const g = game(); g.busy = true;
    g.cinematic({ pos: V3(-3, 7.2, -120.2), look: V3(-30, 20, -300), dur: 99 }); A.setMood('trail');
    setTimeout(() => { g.busy = false; say([['milo', 'A mountain bilberry. They only grow up high. And through the window... the mountain. With a little wooden tower near the top.', 'surprised'], ['milo', 'Rose’s lookout. That’s where the prickly someone went. That’s where the little folk are.', 'think'], ['moss', 'It’s getting dark, Milo. Tomorrow. First thing. You go up the mountain, and... I’ll mind the cottage.', 'shy'], ['milo', 'Tomorrow, then.', 'happy']], () => { g.cinematicEnd(); g.flag('mossWith', false); UI().fade(true, () => { g.player.teleport(-1, 0.1, -165, Math.PI); g.cam.snap = true; g.startChapter(13); setTimeout(() => UI().fade(false), 400); }); }); }, 2200);
  }
  // hidden passages: dumbwaiter (kitchen <-> attic), laundry chute (bathroom -> cellar)
  G.INTERACT.push({ id: 'wren_dumb', pos: [7.6, 0, -112.5], r: 0.8, label: 'Climb into the dumbwaiter', when: () => ch() >= 12, act: () => { A.play('scrape'); game().travel([5, 5.6, -112.6], Math.PI / 2, () => { if (!has('dumbSeen')) { game().flag('dumbSeen'); say(think('Rattle, rattle, creak... the dumbwaiter goes all the way up to the attic!', 'happy')); } }); } });
  G.INTERACT.push({ id: 'wren_dumbUp', pos: [5, 5.6, -112.5], r: 0.8, label: 'Ride the dumbwaiter down to the kitchen', when: () => ch() >= 12, act: () => game().travel([7.2, 0, -112.5], -Math.PI / 2) });
  G.INTERACT.push({ id: 'wren_chute', pos: [3, 2.8, -120.1], r: 0.7, label: 'Jump down the laundry chute', when: () => ch() >= 12, act: () => { A.play('rustle'); game().travel([3, -2.6, -119.4], 0, () => { if (!has('chuteSeen')) { game().flag('chuteSeen'); game().player.act('shake', 1); say(think('WHEEEE! ...Landed in a pile of old sheets in the cellar. Ten out of ten. Would chute again.', 'happy')); } }); } });
  G.INTERACT.push({ id: 'wren_front', pos: [-1, 0, -103.6], r: 0.8, label: 'Squeeze out through the letterbox', when: () => ch() >= 12, act: () => game().travel([-1, 0.1, -101.6], 0) });
  G.INTERACT.push({ id: 'wren_frontIn', pos: [-1, 0, -102.2], r: 0.8, label: 'Squeeze in through the letterbox', when: () => ch() >= 12, act: () => game().travel([-1, 0, -104.4], Math.PI) });
  G.INTERACT.push({ id: 'wren_backdoor', pos: [-1, 0, -121.8], r: 0.8, label: 'Nose through the cat flap', when: () => ch() >= 12 || has('studyOpen'), act: () => { const inside = game().player.pos.z > -121; game().travel(inside ? [-1, 0.1, -122.6] : [-1, 0, -120.2], inside ? Math.PI : 0); } });

  /* ================================================================ CHAPTER NINE: The Mountain Trail */
  SQ.onStart[13] = () => say([['milo', 'Morning. The mountain is pink in the sunrise. Somewhere up there, a prickly someone is carrying carved acorns and bilberries.', 'happy'], ['milo', 'The north gate of the garden leads to the trail. Time to climb!', 'happy']]);
  G.INTERACT.push({ id: 'mt_gate', pos: [0, 0, -171], r: 1.6, label: 'Nudge the old gate open', anim: 'push', when: () => !has('ngOpen') && ch() >= 13, act: () => { const g = game(); g.flag('ngOpen'); A.play('door'); g.tween(1.2, (k) => (W.obj.northGate.rotation.y = -1.4 * U.smooth(k)), () => { W.col.northGate.on = false; if (st() === 's13_gate') step('s13_scent'); }); } });
  G.INTERACT.push({ id: 'mt_gateShut', pos: [0, 0, -171], r: 1.4, label: 'Push the north gate', when: () => !has('ngOpen') && ch() < 13, act: () => say(think('Stuck. And beyond it, the mountain. Not today.')) });
  SQ.trail('mount1', [g_(-2, -182), g_(-18, -194.6), g_(-38, -206)], { active: () => st() === 's13_scent', label: 'Sniff the prickly scent', onDone: () => { say([['milo', 'The scent goes straight into that tall grass. Something big is circling overhead...', 'think']], () => step('s13_meadow')); } });
  // the hawk over the tall grass
  const hawk = { t: 6, phase: 'idle', shadow: null };
  SQ.tick((dt, s, stt) => {
    const g = game(); if (ch() !== 13 || st() !== 's13_meadow' || stt !== 'play') { if (hawk.shadow) hawk.shadow.visible = false; return; }
    if (!hawk.shadow) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.set(1.6, 0.6, 1); g.scene.add(m); hawk.shadow = m; }
    const p = g.player.pos, inM = Math.hypot(p.x + 20, p.z + 228) < 10;
    if (p.z < -237.5 && Math.abs(p.x + 20) < 8) { hawk.shadow.visible = false; step('s13_scent2'); say([['milo', 'Made it through the grass! The hawk has given up. Phew. Nimbus the marmot is whistling at me from that rock.', 'happy']]); return; }
    hawk.t -= dt;
    if (hawk.phase === 'idle' && hawk.t <= 0 && inM && !UI().dialogueOpen) { hawk.phase = 'warn'; hawk.t = 2.8; A.play('caw'); A.play('whistle'); UI().toast('<b>A shadow passes!</b>', G.UI.portraits.nimbus, 'Freeze! Stand still in the grass.'); }
    if (hawk.phase === 'warn') {
      hawk.shadow.visible = true; hawk.shadow.position.set(p.x + Math.cos(g.t * 2) * 3 * hawk.t / 2.8, W.groundAt(p.x, p.y, p.z) + 0.05, p.z + Math.sin(g.t * 2) * 3 * hawk.t / 2.8); hawk.shadow.rotation.z = g.t * 2;
      if (hawk.t <= 0) {
        const still = g.player.speedH < 0.2 && inM;
        if (still || G.EXT.hidden) { UI().toast('<b>The hawk flies past</b>', null, 'It didn’t see you. Keep going!'); A.play('flutter'); }
        else { A.play('caw'); g.shake = 0.6; g.player.act('shake', 1.2); g.particles.burst(V3(p.x, p.y + 0.3, p.z), 20, 0x5a4a3a, 'dust'); UI().fade(true, () => { g.player.teleport(-22, W.groundY(-22, -218.4), -218.4, Math.PI); g.cam.snap = true; setTimeout(() => UI().fade(false), 300); }); UI().toast('<b>SWOOSH!</b>', null, 'The hawk swooped! Milo tumbled back to the edge of the meadow.'); }
        hawk.phase = 'idle'; hawk.t = 5 + Math.random() * 4; hawk.shadow.visible = false;
      }
    }
  });
  SQ.trail('mount2', [g_(-45, -243), g_(-66, -248.2), g_(-72, -262)], { active: () => st() === 's13_scent2', label: 'Sniff the prickly scent', onDone: () => say([['milo', 'The scent goes up the switchback... straight into a pile of fallen rocks. A rockslide. I’ll have to climb round it.', 'think']], () => step('s13_slide')) });
  SQ.trigger(() => st() === 's13_slide' && game().player.pos.z < -277 && game().player.pos.x > -56, () => { step('s13_lookout'); say(think('Round the rocks! And up there on the ridge: the lookout. Rose’s lookout.', 'happy')); });
  SQ.trigger(() => st() === 's13_lookout' && SQ.near([-40, P.mount.deckY || 26, -300], 3.2) && game().player.pos.y > (P.mount.deckY || 26) - 0.4, () => lookoutScene());
  function lookoutScene() {
    const g = game(); g.busy = true; A.setMood('ending'); const dy = P.mount.deckY;
    g.cinematic({ pos: V3(-37.5, dy + 1.4, -296.5), look: V3(-38.5, dy + 0.1, -301.5), dur: 99 });
    setTimeout(() => { g.busy = false; say([['milo', 'A little paint tin, rusted shut, tucked in the corner. R.W. scratched on the lid.', 'think'], { do: () => { SQ.collect('m_paint'); g.give('painting'); } }, ['milo', 'And inside, a folded watercolour. A hidden valley, with tiny round doors and tiny chimneys. Rose painted the little folk’s village!', 'surprised'],
      { do: () => { g.cinematic({ pos: V3(-40, dy + 2.2, -300), look: V3(80, 6, -250), dur: 99 }); } },
      ['milo', 'Through the telescope... over the ridge, far to the east: a valley, a waterfall, and wisps of smoke. Real smoke. Somebody lives there!', 'surprised'],
      { do: () => { g.cinematic({ pos: V3(-44, dy + 1, -302), look: V3(-66, dy - 1, -310), dur: 99 }); } },
      ['milo', 'The prickly scent goes into that cave on the ridge. It must be a way through the mountain.', 'think']], () => { g.cinematicEnd(); A.setMood('trail'); step('s13_cave'); }); }, 1600);
  }
  G.INTERACT.push({ id: 'mt_cave', pos: [...P.mount.cave], r: 1.8, label: () => (st() === 's13_cave' ? 'Follow the scent into the cave' : 'Peer into the cave'), anim: 'sniff', when: () => ch() >= 13, act: () => { if (st() === 's13_cave') caveFall(); else if (ch() > 13) game().travel(G.pts ? G.pts.caveBottom : [-66, UG, -300], 0); else say(think('Cold air and darkness. The scent isn’t strong enough here yet.')); } });
  function caveFall() {
    const g = game(); g.busy = true; UI().letterbox(true); A.setMood('mystery');
    g.cinematic({ pos: V3(-62, P.mount.cave[1] + 1.4, -305), look: V3(-66, P.mount.cave[1] + 0.2, -309.5), dur: 99 });
    say([['milo', 'It’s dark in here, but the scent is strong. Sweet bilberries, and hedgehog. Keep going...', 'think'], { do: () => { A.play('thud'); g.shake = 1.5; } }, ['milo', 'Wait. What was that crack? The floor is...', 'surprised'], { do: () => { A.play('thud'); A.play('rustle'); g.shake = 2; } }, ['milo', 'WHOAAAAA!', 'surprised']], () => {
      UI().fade(true, () => { g.cinematicEnd(); UI().letterbox(false); g.busy = false; const L = (W.pts.under && W.pts.under.landing) || [-66, UG, -300]; g.player.teleport(L[0], L[1], L[2], 0); g.cam.snap = true; g.startChapter(14); setTimeout(() => UI().fade(false), 900); });
    });
  }

  /* ================================================================ world state after loads */
  function applyNorth() {
    const s = S(), f = s.flags, C = W.col, O = W.obj;
    if (C.farThicket) C.farThicket.on = !f.farOpen; if (O.farThicket) O.farThicket.visible = !f.farOpen;
    if (C.fwBridge) C.fwBridge.on = !!f.fwBridge; if (O.fwPlanks) O.fwPlanks.visible = !!f.fwBridge;
    if (C.wrenShedDoor) { C.wrenShedDoor.on = !f.shedOpen2; O.wrenShedDoor.rotation.y = f.shedOpen2 ? -1.6 : 0; }
    if (O.ghPots) { O.ghPots.visible = !!f.potsMoved; O.ghPotsDown.visible = !f.potsMoved; if (C.ghPot1) { C.ghPot1.on = C.ghPot2.on = !!f.potsMoved; } }
    if (O.fountainSpout) O.fountainSpout.visible = !!f.spoutFit;
    if (O.fountainWater) { O.fountainWater.visible = !!f.fountainOn; O.fountainWater.position.y = 0.12; O.fountainLeaves.visible = !f.fountainOn; O.fountainHole.visible = !!f.fountainOn; }
    if (O.valveWheel) O.valveWheel.rotation.z = (SQ.s().valve || 0) * 2.1;
    if (O.wrenBookcase) { O.wrenBookcase.position.z = f.studyOpen ? -117.6 : -119; C.wrenBookcase.on = !f.studyOpen; }
    if (O.northGate) { O.northGate.rotation.y = f.ngOpen ? -1.4 : 0; C.northGate.on = !f.ngOpen; }
    if (O.atticPrints) O.atticPrints.visible = s.chapter <= 13;
    setClocks();
    for (const k of ['farThicket', 'fwBridge', 'wrenShedDoor', 'wrenBookcase', 'northGate', 'ghPot1', 'ghPot2']) if (C[k]) game().hashC(C[k]);
  }
  SQ.onApply(applyNorth);
  const R_far = R.byId.farwood, R_wren = R.byId.wren;
  const ob1 = R_far.onBuilt; R_far.onBuilt = (g, c) => { ob1 && ob1(g, c); applyNorth(); };
  const ob2 = R_wren.onBuilt; R_wren.onBuilt = (g, c) => {
    ob2 && ob2(g, c);
    // pots become a little climbable staircase once moved; the lower broken pane stays glassy
    W.collider(15.3, 15.9, -151.7, -151.1, 0, 0.34, { name: 'ghPot1', climb: true }); W.collider(15.6, 16.2, -151.7, -151.1, 0.34, 0.68, { name: 'ghPot2', climb: true });
    W.obj.ghPots.position.set(15.5, 0, -151.4);
    const lowGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.03), M.get('ghGlass')); lowGlass.position.set(16, 0.4, -152); c.root.add(lowGlass);
    for (const cc of [W.col.ghPot1, W.col.ghPot2]) game().hashC(cc, W.colliders.indexOf(cc));
    const b = W.colliders.find((cc) => cc.x0 === 15.4 && cc.y1 === 0.6); if (b) b.y1 = 0.8;
    applyNorth();
  };
  const oInit = G.EXT.init; G.EXT.init = function (g) { oInit(g); hookPick(g); };

  /* ================================================================ item models */
  const baseMake = G.makeItem;
  G.makeItem = function (id) {
    const g = new THREE.Group(), add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    switch (id) {
      case 'acorn': case 'goldacorn': case 'carvedacorn': { const mat = id === 'goldacorn' ? M.std('goldacorn', { color: 0xf2c14e, metal: 0.9, rough: 0.25, emissive: 0x5a4010, ei: 0.4 }) : M.color(0xa0703a, 0.6); add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), mat), 0, 0.035, 0).scale.set(1, 1.25, 1); const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8, 0, 6.3, 0, 1.4), id === 'goldacorn' ? mat : M.color(0x6a4a2a, 0.9)), 0, 0.055, 0); add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 4), M.color(0x5a3a1a)), 0, 0.08, 0); return g; }
      case 'shell': { const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 8, 0, 6.3, 0, 1.2), M.std('shellM', { color: 0xf2e6e0, rough: 0.25, metal: 0.2, emissive: 0x302830, ei: 0.2 })), 0, 0.01, 0); m.scale.set(1, 0.4, 0.8); return g; }
      case 'spout': { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.09, 10), M.get('brass')), 0, 0.02, 0); m.rotation.z = Math.PI / 2; return g; }
      case 'thimble': { add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.03, 12), M.get('chrome')), 0, 0.015, 0); return g; }
      case 'bilberry': { for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.color(0x3a2a6a, 0.3)), (i % 2) * 0.02 - 0.01, 0.015, Math.floor(i / 2) * 0.02 - 0.01); add(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.06, 4), M.color(0x5a3a2a)), 0, 0.02, 0).rotation.z = 1.2; return g; }
      case 'painting': case 'arloletter': case 'rosepage1': case 'rosepage2': case 'rosepage3': return baseMake('journal');
      case 'ottoshell': return G.makeItem('shell');
    }
    return baseMake(id);
  };
})();
