/* =====================================================================
   story.js - all the data that drives the adventure: items,
   collectibles, objectives, NPC placement, dialogue and interactions.
   Dialogue scripts are arrays of:
     ['who', 'text', 'expression']     a line
     { choice: [{ t, set, then: [...] }] } a branching choice
     { do: fn }                          run code mid-conversation
   ===================================================================== */
'use strict';
(function () {
  const UG = G.World.UG;
  const S = () => G.game.S;
  const has = (f) => !!S().flags[f];
  const item = (id) => G.game.hasItem(id);

  /* ---------------------------------------------------------------- items */
  G.ITEMS = {
    flashlight: { name: 'Keychain Flashlight', desc: 'A tiny blue flashlight that fell off Ellie’s keys. Milo can hold it in his teeth to light dark places.', story: true },
    ribbon: { name: 'Red Ribbon', desc: 'Tied in a neat bow and found at the mouth of a hidden tunnel. It smells of old soap and... another ferret?', story: true },
    bottlecap: { name: 'Bottle Cap', desc: 'Red, ridged and very shiny. Pip would love this.', story: true },
    foil: { name: 'Foil Wrapper', desc: 'A crumpled ball of silver foil. It crinkles delightfully.', story: true },
    marble: { name: 'Blue Marble', desc: 'Dug out of the old sandbox. There’s a swirl of cloud trapped inside.', story: true },
    note: { name: 'Strange Note', desc: 'Sheet music with little dots and lines. Signed "for Ellie ~ A." Milo has heard Ellie hum something like it.', story: true },
    stone: { name: 'Shiny Stone', desc: 'A creek pebble that glows like the inside of a shell. The shiniest thing in the whole wood.', story: true },
    feather: { name: 'Blue Feather', desc: 'A jay feather, soft and ticklish. Perfect for waking up sleepy dogs.', story: true },
    key: { name: 'Old Key', desc: 'A rusty key with a tiny gear worked into the bow. It was buried beside a stump in the clearing.', story: true },
    photo: { name: 'Old Photograph', desc: 'A man with kind eyes, a little girl... and a ferret wearing a red ribbon. On the back: "Arlo, Ellie & Juniper."', story: true },
    journal: { name: 'Journal Page', desc: '"The music box is finished. Juniper keeps stealing the winding key — rascal! Brass gear needs replacing. The old tunnel leads all the way home."', story: true },
    tinykey: { name: 'Tiny Brass Key', desc: 'Too small for any door. It was in the kitchen drawer all along — a winding key!', story: true },
    gear: { name: 'Brass Gear', desc: 'A little toothed wheel from Pip’s stash. Exactly the kind a music box needs.', story: true },
    musicbox: { name: 'Music Box', desc: 'Grandpa Arlo’s music box, made for Ellie. Heavy for a ferret, but Milo can manage.', story: true },
    treat: { name: 'Treats', desc: 'Crunchy chicken treats. Good for eating, and for making friends.', stack: true },
  };

  /* ---------------------------------------------------------------- collectibles (optional) */
  G.COLLECT = [
    { id: 'c_ball', cat: 'toys', model: 'ball', name: 'Jingle Ball', desc: 'Milo’s favourite ball. It had been missing for weeks.', pos: null, via: 'toychest' },
    { id: 'c_sock', cat: 'toys', model: 'sock', name: 'Ellie’s Sock', desc: 'Under the bed. Milo may have put it there.', pos: [-5.9, 0, -4.4] },
    { id: 'c_mouse', cat: 'toys', model: 'mouse', name: 'Toy Mouse', desc: 'Found stuffed inside a yellow rain boot.', pos: null, via: 'boot' },
    { id: 'c_duck', cat: 'toys', model: 'duck', name: 'Rubber Duck', desc: 'Someone’s bath toy, washed up by the duck pond.', pos: [-4.1, 0, 49.2] },
    { id: 'c_feather2', cat: 'feathers', model: 'feather2', name: 'Pigeon Feather', desc: 'Grey and white. It was on the top shelf in the garage.', pos: [13.65, 1.62, 4.35] },
    { id: 'c_feather3', cat: 'feathers', model: 'feather3', name: 'Cardinal Feather', desc: 'Bright red, found under the apple tree.', pos: [-4.7, 0, -19.1] },
    { id: 'c_feather4', cat: 'feathers', model: 'feather4', name: 'Crow Feather', desc: 'Glossy black, left on the grocer’s crates.', pos: [47.7, 0.9, 9.25] },
    { id: 'c_feather5', cat: 'feathers', model: 'feather5', name: 'Owl Feather', desc: 'Speckled and silent. Found at the mouth of Echo Cave.', pos: [-115.4, 0, 45.4] },
    { id: 'c_button', cat: 'shiny', model: 'button', name: 'Brass Button', desc: 'From an old coat. It rolled under the armchair.', pos: [-6.45, 0, 1.25] },
    { id: 'c_coin', cat: 'shiny', model: 'coin', name: 'Old Coin', desc: 'Dated 1962. Juniper must have stashed it in her tunnels.', pos: [-30.6, UG, -5.0] },
    { id: 'c_gem', cat: 'shiny', model: 'shiny', name: 'Pink Bead', desc: 'Off a bracelet, glinting on the Fairweathers’ porch bench.', pos: [-28.5, 0.65, 7.3] },
    { id: 'c_bell', cat: 'shiny', model: 'bell', name: 'Little Bell', desc: 'Tangled in the roots of the big oak. Pip must have dropped it.', pos: [1.9, 0, 37.1] },
    { id: 'c_photo2', cat: 'photos', model: 'photo2', name: 'Photo: The Workshop', desc: 'Arlo outside his workshop one summer, sleeves rolled up, grinning.', pos: [-119.6, 0, 41.3] },
    { id: 'c_photo3', cat: 'photos', model: 'photo3', name: 'Photo: Juniper’s Tunnel', desc: 'Juniper, very proud, beside a freshly dug hole. Of course.', pos: [-31.1, UG, -16.3] },
    { id: 'c_photo4', cat: 'photos', model: 'photo4', name: 'Photo: Ellie, Age Six', desc: 'Ellie holding a wooden music box. She has the same smile now.', pos: null, via: 'memoryBox' },
    { id: 'c_photo5', cat: 'photos', model: 'photo5', name: 'Photo: The Neighbours', desc: 'Arlo and Mr. Oakes on the porch, with a very young Bram between them.', pos: null, via: 'bram' },
    { id: 'c_t1', cat: 'treats', model: 'treat', name: 'Treat', desc: 'On the kitchen table. Climb a chair to reach it.', pos: [4.2, 0.78, -2.95], treat: true },
    { id: 'c_t2', cat: 'treats', model: 'treat', name: 'Treat', desc: 'On the coffee table.', pos: [-4.75, 0.46, 3.45], treat: true },
    { id: 'c_t3', cat: 'treats', model: 'treat', name: 'Treat', desc: 'On the patio table.', pos: [3.5, 0.76, -8.1], treat: true },
    { id: 'c_t4', cat: 'treats', model: 'treat', name: 'Treat', desc: 'On a park bench.', pos: [6.1, 0.49, 35], treat: true },
    { id: 'c_t5', cat: 'treats', model: 'treat', name: 'Treat', desc: 'Inside the workshop, by the door.', pos: [-104.2, 0.02, -17.1], treat: true },
  ];
  G.CATS = { toys: 'Lost Toys', feathers: 'Feathers', shiny: 'Shiny Things', photos: 'Old Photographs', treats: 'Hidden Treats' };

  /* story items lying in the world (appear when their condition is met) */
  G.PICKUPS = [
    { id: 'p_flash', item: 'flashlight', model: 'flashlight', pos: [-4.2, 0, 5.15], when: () => true, msg: 'Milo drags the little flashlight out from under the sofa. It clicks on!' },
    { id: 'p_ribbon', item: 'ribbon', model: 'ribbon', pos: [-5.62, UG, 0.02], when: () => has('crateMoved') },
    { id: 'p_cap', item: 'bottlecap', model: 'bottlecap', pos: [47.2, 0.02, 15.3], when: () => true },
    { id: 'p_foil', item: 'foil', model: 'foil', pos: [61, 0.5, 0.5], when: () => true },
    { id: 'p_stone', item: 'stone', model: 'stone', pos: [-80.0, 0.22, 21.8], when: () => true, msg: 'Something glimmers on the stepping stone... the shiniest pebble Milo has ever seen.' },
    { id: 'p_feather', item: 'feather', model: 'feather', pos: [-102, 0, 13.2], when: () => true },
    { id: 'p_photo', item: 'photo', model: 'photo1', pos: [-109.6, 0.02, -19.4], when: () => true, msg: 'An old photograph, fallen from the shelf. A girl... and a ferret with a red ribbon!' },
    { id: 'p_journal', item: 'journal', model: 'journal', pos: [-108.9, 0.46, -22.6], when: () => true },
  ];

  /* ---------------------------------------------------------------- objectives */
  const P = (...a) => a;
  G.STEPS = {
    c1_wake: { text: 'Find where the strange noise came from', target: P(6.6, 0, 1.2) },
    c1_light: { text: 'Find something to light the way', target: P(-4.2, 0, 5.1) },
    c1_vent: { text: 'Squeeze through the floor vent', target: P(6.6, 0, 1.2) },
    c1_base: { text: 'Search the basement for the source of the noise', target: P(-4.9, UG, 0.2) },
    c1_tunnel: { text: 'Follow the hidden tunnel', target: P(-12.3, UG, -11.8) },
    c2_tilly: { text: 'Talk to the cat on the fence', target: P(15.2, 0, -12.6) },
    c2_out: { text: 'Find a way out of the backyard', target: P(15.3, 0, -22) },
    c2_nora: { text: 'Find Nora the rabbit in Willow Park', target: P(-25, 0, 54) },
    c2_pip: { text: 'Ask Pip about what he found by the hedge', target: P(1.4, 0, 36.8) },
    c2_shiny: { text: 'Find three shiny things for Pip', target: () => G.game.nearestShiny() },
    c2_pip2: { text: 'Bring the shiny things to Pip', target: P(1.4, 0, 36.8) },
    c2_bram: { text: 'Show the strange note to the old dog on the porch', target: P(31.5, 0.35, 8.2) },
    c2_nora2: { text: 'Ask Nora how to get into the woods', target: P(-25, 0, 54) },
    c2_path: { text: 'Take the hidden path into Hollow Wood', target: P(-52, 0, 50) },
    c3_trail: { text: 'Follow the trail into the woods', target: P(-59.3, 0, 41.2) },
    c3_moss: { text: 'Approach the hedgehog slowly (walk, don’t run)', target: P(-59.3, 0, 41.2) },
    c3_creek: { text: 'Follow Moss across the creek', target: P(-82.5, 0, 22) },
    c3_clear: { text: 'Follow the trail to the clearing', target: P(-99, 0, 10) },
    c3_sniff: { text: 'Use your nose (Q) to find what Moss was digging at', target: P(-94.9, 0, 5.7) },
    c3_shed: { text: 'Find what the old key opens', target: P(-107, 0, -15.3) },
    c3_clues: { text: 'Search the workshop for clues', target: () => G.game.nearestClue() },
    c4_board: { text: 'Piece the clues together on Arlo’s corkboard', target: P(-103.8, 0, -20.9) },
    c4_tasks: { text: 'Repair the music box: winding key, brass gear, and Moss’s trust', target: () => G.game.nearestC4() },
    c4_meet: { text: 'Meet Moss at the workshop hatch', target: P(-105, 0, -20.4) },
    c5_hatch: { text: 'Slip down through the hatch', target: P(-105, 0, -20.4) },
    c5_fork: { text: 'Listen for the music box. Which tunnel?', target: P(-28.8, UG, -10) },
    c5_roots: { text: 'Dig through the roots', target: P(-28.1, UG, -10) },
    c5_nook: { text: 'Find Moss in his nook', target: P(-18.4, UG, -4) },
    c5_fix: { text: 'Fix the music box', target: P(-18.9, UG, -4.4) },
    c5_rubble: { text: 'Push through the loose earth towards home', target: P(-13.9, UG, -4.4) },
    c5_home: { text: 'Carry the music box to Ellie’s bedside', target: P(-4.05, 0.55, -5.55) },
    end: { text: 'Explore as much as you like', target: null },
  };
  G.C4_TASKS = { tinykey: 'Winding key', gear: 'Brass gear', moss: 'Moss’s trust' };

  /* ---------------------------------------------------------------- NPC placement */
  G.npcPlacement = function () {
    const s = S(), c = s.chapter, st = s.step, night = G.env && G.env.night;
    const P = {};
    // Tilly pops up somewhere new in every chapter
    if (c === 1) P.tilly = { pos: [10.8, 1.37, 2.4], yaw: 2.6 };
    else if (c === 2 && ['c2_tilly', 'c2_out'].includes(st)) P.tilly = { pos: [15.95, 1.5, -12.6], yaw: -1.57 };
    else if (c === 2) P.tilly = { pos: [48.3, 0.9, 9.35], yaw: 0.4 };
    else if (c === 3) P.tilly = { pos: [-104.5, 0.5, -12.8], yaw: 3.0 };
    else if (c === 4) P.tilly = { pos: [2.6, 0.93, -5.62], yaw: 0 };
    else if (c === 6) P.tilly = { pos: [15.95, 1.5, -12.6], yaw: -1.57 };
    // Bram: always on his porch (asleep at night and in the rain)
    if (c !== 5) P.bram = { pos: [31.5, 0.47, 7.1], yaw: 0.2 };
    if (c === 6) P.bram = { pos: [2, 0, -14], yaw: 3.0 };
    // Pip and Nora live in the park
    if (c >= 2 && c <= 4) { P.pip = { pos: [1.4, 0, 37.1], yaw: 0.5, wander: 1.4 }; P.nora = { pos: [-25.2, 0, 54.6], yaw: 0.8, wander: 0.8 }; }
    if (c === 6) { P.pip = { pos: [-3.4, 0, -19.4], yaw: 0.3, wander: 1 }; P.nora = { pos: [-4.8, 0, -12.8], yaw: 0.2 }; }
    // Moss
    if (c === 3 && ['c3_trail', 'c3_moss'].includes(st)) P.moss = { pos: [-59.2, 0, 41.2], yaw: 0.4 };
    if (c === 4) P.moss = { pos: [-59.2, 0, 41.2], yaw: 0.4 };
    if (c === 5 && ['c5_nook', 'c5_fix', 'c5_fork', 'c5_roots', 'c5_hatch', 'c5_rubble'].includes(st)) P.moss = { pos: [-18.0, UG, -3.4], yaw: 2.4 };
    if (c === 6) P.moss = { pos: [-6.2, 0, -22.8], yaw: 0.6 };
    return P;
  };

  /* ---------------------------------------------------------------- dialogue */
  const ch = (...opts) => ({ choice: opts });
  const act = (fn) => ({ do: fn });
  const G_ = () => G.game;

  G.DIALOGUE = {
    /* ---------------- TILLY ---------------- */
    tilly() {
      const s = S(), c = s.chapter, kind = s.choices.tilly === 'kind';
      G_().tillySighting(c);
      if (c === 1) return [
        ['tilly', 'Well, well. The house weasel, up past bedtime.', 'smug'],
        ['milo', '*Tilly?! How did you get into the garage?*', 'surprised'],
        ['tilly', 'A lady never reveals her entrances. There’s a gap under the big door, if you must know. Too small for you. For now.', 'smug'],
        ['tilly', 'You heard it too, didn’t you? The noise. Clink, clink, and then a little song. Under the floor.', 'think'],
        ['tilly', 'Vents go down. Down is where noises live. Off you trot.', 'neutral'],
      ];
      if (c === 2 && ['c2_tilly', 'c2_out'].includes(s.step)) {
        if (has('tillyTalk2')) return [['tilly', 'Still here? The soil by the far fence is soft. Ferrets dig. Do the maths.', 'smug']];
        return [
          ['tilly', 'Morning, weasel. You look like you slept in a tunnel.', 'smug'],
          ['milo', '*I DID sleep in a tunnel! Well, walked through one. It goes from the basement all the way out here!*', 'happy'],
          ['tilly', 'Hm. It smells of hedgehog, you know. Old tunnel, new visitor.', 'think'],
          ch(
            { t: 'Thank her for the tip', set: { tilly: 'kind' }, then: [['tilly', '...You’re welcome. Don’t tell anyone I was helpful.', 'happy']] },
            { t: 'Ask if she’s stuck up there', set: { tilly: 'cheeky' }, then: [['tilly', 'Stuck? I am SURVEYING. Honestly.', 'surprised']] },
          ),
          ['tilly', 'If you want answers, ask Nora. The rabbit in Willow Park. She knows every burrow in town.', 'neutral'],
          ['tilly', 'You’ll need to get out of this yard first. The earth by the far fence is soft. Ferrets dig, don’t they?', 'smug'],
          act(() => { G_().flag('tillyTalk2'); if (s.step === 'c2_tilly') G_().setStep('c2_out'); }),
        ];
      }
      if (c === 2) return [
        ['tilly', kind ? 'Oh, it’s you. Nice work with the digging.' : 'Oh look, the weasel escaped. Mind the cars, surveyor-mocker.', kind ? 'happy' : 'smug'],
        ['tilly', 'Pip’s been hoarding again. If he found something strange, he won’t hand it over for free.', 'think'],
        ['tilly', 'And old Bram on the porch? He pretends to sleep. He hears everything.', 'neutral'],
      ];
      if (c === 3) return [
        ['milo', '*Tilly?! We’re in the middle of the woods!*', 'surprised'],
        ['tilly', 'I go where I please. Cats are like that.', 'smug'],
        ['tilly', kind ? 'That workshop belonged to Ellie’s grandpa. He used to leave out sardines for me. Well... for my mother.' : 'That workshop has been locked for years. Not that I’d tell a surveyor-mocker why.', 'think'],
        ['tilly', 'Old things want to be found, weasel. Keep looking.', 'neutral'],
      ];
      if (c === 4) return [
        ['milo', '*How are you INSIDE the kitchen?*', 'surprised'],
        ['tilly', 'The pet flap swings both ways, darling.', 'smug'],
        ['tilly', 'You’re looking for a key? Small, brass, useless? Your human keeps junk like that in the bottom drawer. I’ve watched her.', 'think'],
        ['tilly', 'Don’t look so surprised. Cats notice everything.', 'happy'],
      ];
      if (c === 6) return [
        ['tilly', 'So. You found it. The music box.', 'neutral'],
        ['tilly', kind ? 'I suppose I’m... glad. It’s nice to hear that song again.' : 'Fine. FINE. It’s a lovely song. Don’t make it weird.', 'happy'],
        act(() => G_().tillySighting(6)),
      ];
      return [['tilly', 'Hm.', 'neutral']];
    },
    /* ---------------- NORA ---------------- */
    nora() {
      const s = S(), c = s.chapter, st = s.step;
      if (c === 2 && ['c2_tilly', 'c2_out', 'c2_nora'].includes(st)) return [
        ['nora', 'Oh! A ferret. Hello there, little one. You’re a long way from your house.', 'happy'],
        ['milo', '*Tilly said you know every burrow in town. Something’s been making noises under my house!*', 'neutral'],
        ['nora', 'Has it now...', 'think'],
        ['nora', 'New tunnels have been appearing at night. Across the gardens, under the hedges. Tiny ones.', 'think'],
        ['nora', 'Whoever digs them is small, and very, very shy. I only ever see the fresh earth in the morning.', 'neutral'],
        ['nora', 'Pip found something by the hedge last night. Paper, he said. He’s by the big oak. Probably talking to it.', 'happy'],
        ch(
          { t: 'Ask about her scarf', set: { noraScarf: true }, then: [['nora', 'This? A little girl left it on the hedge one winter, years ago. I’ve worn it ever since. Warm as a burrow.', 'happy'], ['milo', '*...It smells like Ellie!*', 'surprised'], ['nora', 'Does it? Well. Small world, isn’t it?', 'happy']] },
          { t: 'Thank her and hurry off', then: [['nora', 'Mind how you go, little one.', 'happy']] },
        ),
        act(() => G_().setStep('c2_pip')),
      ];
      if (c === 2 && ['c2_pip', 'c2_shiny', 'c2_pip2'].includes(st)) return [['nora', 'Pip’s by the big oak. You can’t miss him. You can hear him, mostly.', 'happy']];
      if (c === 2 && st === 'c2_bram') return [['nora', 'Music? On paper? How strange. The old dog on the porch across the street might know. He’s older than all of us.', 'think']];
      if (c === 2 && (st === 'c2_nora2' || st === 'c2_path')) return [
        ['milo', '*Bram says there was a workshop in Hollow Wood. How do I get there?*', 'neutral'],
        ['nora', 'Ah. Hollow Wood. The road ends at a big hedge, and the humans never go through.', 'think'],
        ['nora', 'But rabbits know a way. Come, look at the west hedge, just past my burrow.', 'happy'],
        act(() => G_().revealHedge()),
        ['nora', 'There. A little gap, just big enough for a rabbit... or a ferret.', 'happy'],
        ['nora', 'Follow the path and you’ll reach the woods. Be kind to whatever you find there.', 'neutral'],
        act(() => G_().setStep('c2_path')),
      ];
      if (c === 3) return [['nora', 'Back so soon? The woods can wait a moment. Have a sit.', 'happy']];
      if (c === 4) return [
        ['nora', 'Drenched, poor thing! Come under the hedge.', 'surprised'],
        ['nora', 'A music box, a hedgehog and a lost winding key? My, my.', 'think'],
        ['nora', s.choices.noraScarf ? 'Ellie... the girl who left me this scarf. I hope you bring her something lovely.' : 'Take your time. The best things are worth the trouble.', 'happy'],
        ['nora', 'Oh, and my burrows connect all over town now. Open your map, and you can hop between places you’ve been.', 'neutral'],
      ];
      if (c === 6) return [['nora', 'What a beautiful song. I think the whole neighbourhood heard it.', 'happy']];
      return [['nora', 'Lovely day for it, isn’t it?', 'happy']];
    },
    /* ---------------- PIP ---------------- */
    pip() {
      const s = S(), c = s.chapter, st = s.step;
      if (c === 2 && ['c2_tilly', 'c2_out', 'c2_nora'].includes(st)) return [['pip', 'HI! Hi hi hi! Who are you? Doesn’t matter! Busy! Very busy! Come back later!', 'happy']];
      if (c === 2 && st === 'c2_pip') return [
        ['pip', 'A FERRET! Hi! I’m Pip! This is my tree! That’s my acorn! That’s also my acorn!', 'happy'],
        ['milo', '*Nora says you found something by the hedge last night?*', 'neutral'],
        ['pip', 'Maaaybe. A paper. Dots and lines and squiggles. Very mysterious. Very valuable. VERY mine.', 'smug'],
        ['pip', 'But! I’d trade it! For shiny things! Three of them! Bottle caps, foil, marbles. Pip loves marbles.', 'happy'],
        ch(
          { t: 'Deal!', set: { pip: 'deal' }, then: [['pip', 'DEAL! Ha! Go go go!', 'happy']] },
          { t: 'Can’t you just give it to me?', set: { pip: 'haggle' }, then: [['pip', 'Ha! No. Three shinies. Three! Pip has standards.', 'smug']] },
        ),
        ['pip', 'Try the street. People drop EVERYTHING there. And the shop alley! And the sandbox, if you like digging.', 'think'],
        act(() => G_().setStep('c2_shiny')),
      ];
      if (c === 2 && (st === 'c2_shiny' || st === 'c2_pip2')) {
        const n = ['bottlecap', 'foil', 'marble'].filter(item).length;
        if (n < 3) return [['pip', `${n} shiny thing${n === 1 ? '' : 's'}? Need three! Three is the number! Street, alley, sandbox!`, 'think']];
        return [
          ['pip', 'Ooooh! Ooh! A cap! Crinkly foil! And a MARBLE! With a cloud in it!', 'surprised'],
          act(() => { G_().take('bottlecap'); G_().take('foil'); G_().take('marble'); }),
          ['pip', 'Fair’s fair. Here’s your squiggle paper.', 'happy'],
          act(() => G_().give('note')),
          ['milo', '*...This is music! Ellie hums this song. And it says "for Ellie"!*', 'surprised'],
          ['pip', 'Music? Huh. The old dog on the porch across the street hums sometimes too. He knows EVERYTHING. He just pretends to sleep.', 'think'],
          act(() => G_().setStep('c2_bram')),
        ];
      }
      if (c === 2) return [['pip', 'Found anything shiny? No? Okay! Bye! Hi again later!', 'happy']];
      if (c === 3) return [['pip', 'Woods? I don’t go to the woods. Owls in the woods. OWLS.', 'surprised']];
      if (c === 4) {
        if (has('gotGear')) return [['pip', 'Is it fixed? Is it singing? Tell me when it sings!', 'happy']];
        const opener = [
          ['milo', '*Pip, do you have a little brass gear? A wheel with teeth?*', 'neutral'],
          ['pip', 'Do I? DO I? I have the BEST brass gear. Top of my collection.', 'smug'],
        ];
        if (!item('stone')) return opener.concat([
          ['pip', s.choices.pip === 'haggle' ? 'And no haggling this time, weasel. I’ll want something even shinier. The SHINIEST.' : 'I’d swap it for something even shinier, friend. The shiniest thing you can find!', 'think'],
          ['pip', 'I heard there’s a glowy stone in the creek, in the woods. I don’t go to the woods. Owls.', 'surprised'],
        ]);
        return opener.concat([
          ['pip', '...Is that... a glowy creek stone?', 'surprised'],
          ['pip', 'It’s the shiniest thing I’ve ever seen. Swap! Swap swap swap!', 'happy'],
          act(() => { G_().take('stone'); G_().give('gear'); G_().flag('gotGear'); G_().c4Check(); }),
          ['pip', s.choices.pip === 'haggle' ? 'Pleasure doing business. Even with a haggler.' : 'Best trade ever. You’re my favourite ferret. You’re my only ferret. Still counts!', 'happy'],
        ]);
      }
      if (c === 6) return [['pip', 'It SINGS! I heard it from my tree! Best gear ever! My gear!', 'happy']];
      return [['pip', 'Hi!', 'happy']];
    },
    /* ---------------- BRAM ---------------- */
    bram() {
      const s = S(), c = s.chapter, st = s.step;
      const asleep = c === 1 || c === 4 && !has('bramAwake');
      if (asleep) {
        if (c === 4 && item('feather')) return [
          ['milo', '*Bram’s fast asleep. Maybe a little tickle with the blue feather...*', 'think'],
          act(() => { G_().flag('bramAwake'); G.Audio.play('woof'); G_().npcEmote('bram', 'surprised'); }),
          ['bram', 'Ah-CHOO! Wha—? Oh. It’s you, pup. Rather rude, that. But clever.', 'surprised'],
          ['bram', 'You smell of the old workshop. So you’ve found it. Then you’d better hear the rest.', 'think'],
          ['bram', 'Arlo had a ferret. Juniper. Red ribbon, full of mischief. She dug tunnels everywhere, from Arlo’s workshop all the way to that house of yours.', 'neutral'],
          ['bram', 'Arlo made a music box for little Ellie. Juniper kept pinching the winding key and hiding it in the kitchen.', 'happy'],
          ['bram', 'When Arlo moved to the city, the box went missing in the move. Everyone thought it was lost for good.', 'sad'],
          ['bram', 'Here. Arlo gave my old owner this picture. You should have it. Put it with the others.', 'neutral'],
          act(() => G_().giveCollectible('c_photo5')),
          ['bram', 'Now go on. And let an old dog sleep.', 'sleepy'],
        ];
        if (c === 4) return [['milo', '*Bram is snoring in the rain. Something ticklish might wake him...*', 'think']];
        return [['milo', '*The old dog is snoring. Better let him sleep... for now.*', 'think']];
      }
      if (c === 2 && st === 'c2_bram') return [
        ['bram', 'Hm? A ferret. Haven’t seen one of you on this street since...', 'surprised'],
        ['bram', '...never mind. What have you got there, pup?', 'neutral'],
        ['milo', '*A note! Music! Pip found it by the hedge. It says "for Ellie".*', 'neutral'],
        ['bram', '...', 'think'],
        ['bram', 'That’s Arlo’s tune. Arlo Wren. Ellie’s grandpa. He made clocks and music boxes in a little workshop out in Hollow Wood.', 'sad'],
        ['bram', 'He moved away years ago. Nobody’s been out there since.', 'sad'],
        item('ribbon') ? { choice: [
          { t: 'Show him the red ribbon', set: { bramRibbon: true }, then: [['bram', '...Well, I’ll be. I know that ribbon. But that’s a story for another day, pup.', 'surprised']] },
          { t: 'Ask how to get to the woods', then: [] },
        ] } : act(() => {}),
        ['bram', 'The woods? The road ends at a hedge. Ask the rabbit. Rabbits always know a way through.', 'neutral'],
        act(() => G_().setStep('c2_nora2')),
      ];
      if (c === 2 && ['c2_nora2', 'c2_path'].includes(st)) return [['bram', 'Ask the rabbit, pup. And mind the creek.', 'neutral']];
      if (c === 2) return [['bram', 'Hmph. A ferret. You remind me of someone.', 'think'], ['bram', 'Go on, then. I’m resting my eyes.', 'sleepy']];
      if (c === 3) return [['bram', s.choices.bramRibbon ? 'The workshop... and that ribbon. You’re close, pup. Closer than you know.' : 'Been to the woods, have you? Your paws smell of creek water.', 'think']];
      if (c === 4) return [['bram', 'Go on, pup. That box won’t fix itself.', 'happy']];
      if (c === 6) return [['bram', 'Juniper would have liked you, pup. She’d have hidden all your toys, but she’d have liked you.', 'happy']];
      return [['bram', 'Hmph.', 'sleepy']];
    },
    /* ---------------- MOSS ---------------- */
    moss() {
      const s = S(), c = s.chapter, st = s.step;
      if (c === 3) return [
        ['moss', 'Oh! Oh no. P-please don’t... I d-didn’t mean to scare anyone.', 'shy'],
        ['milo', '*It’s okay! I’m Milo. Are you the one who’s been digging tunnels?*', 'neutral'],
        ['moss', 'M-maybe. Only a little. I’m Moss. I just... I follow the old tunnels. At night. When it’s quiet.', 'shy'],
        ['milo', '*Something made a noise under my house. Clink, clink, and a little song.*', 'neutral'],
        ['moss', 'The singing box! No— I mean... nothing. There’s no box.', 'surprised'],
        ch(
          { t: '"I won’t tell anyone. Promise."', set: { moss: 'promise' }, then: [['moss', '...You promise? Okay. Okay. Thank you, Milo.', 'happy']] },
          { t: '"What singing box?"', set: { moss: 'pressed' }, then: [['moss', 'I-I have to go! Sorry! Sorry!', 'shy']] },
        ),
        ['moss', 'I found a key, once. By the old stump in the clearing. I buried it again. It felt... important.', 'shy'],
        act(() => G_().mossRunsOff()),
      ];
      if (c === 4) {
        if (has('mossTrust')) return [['moss', 'Tonight, at the workshop. I’ll clear the boards from underneath. I promise.', 'happy']];
        const promised = s.choices.moss === 'promise' || has('m3done');
        if (!promised && !item('treat')) return [
          ['moss', '...', 'shy'],
          ['milo', '*Moss is curled up tight. He needs a reason to trust me. Maybe a treat would help?*', 'think'],
        ];
        return [
          ['moss', promised ? 'M-Milo! You kept your promise. Nobody came looking for me.' : '...Is that a treat? For me?', promised ? 'happy' : 'surprised'],
          act(() => { if (!promised) G_().take('treat'); G.Audio.play('snuffle'); G_().npcEmote('moss', 'happy'); }),
          ['moss', 'I’ll tell you the truth. I found the singing box in the old tunnels, under the workshop.', 'neutral'],
          ['moss', 'When it bumps, it plays a little song. It sounds like... like home. Like somewhere warm.', 'happy'],
          ['moss', 'Every night I pushed it a bit further along the tunnels, towards your big house. The song seemed to want to go there.', 'neutral'],
          ['moss', 'But the last bit is too steep, and it got stuck in my nook. And it doesn’t play properly any more. Something’s broken inside.', 'sad'],
          ['milo', '*It’s Ellie’s music box! Her grandpa made it. Let’s bring it home together!*', 'happy'],
          ['moss', 'T-together? ...Okay. Tonight, when it’s dark. Meet me in the workshop. I’ll clear the boards from the hatch, from underneath.', 'happy'],
          act(() => { G_().flag('mossTrust'); G_().c4Check(); }),
        ];
      }
      if (c === 5 && st === 'c5_nook') return [
        ['moss', 'Milo! You came! Look... here it is.', 'happy'],
        ['moss', 'The singing box.', 'neutral'],
        act(() => G_().setStep('c5_fix')),
      ];
      if (c === 5) return [['moss', 'Go on, Milo. You know how to fix it. I can tell.', 'happy']];
      if (c === 6) return [['moss', 'Ellie said I can stay in the garden. I have a real home now, Milo. A real one.', 'happy']];
      return [['moss', '...hello.', 'shy']];
    },
  };

  /* ---------------------------------------------------------------- lore + interactables */
  const lore = (who, text, expr = 'think') => [[who, text, expr]];
  G.INTERACT = [
    // ----- house
    { id: 'basket', pos: [-3, 0, -4.6], r: 0.7, label: 'Curl up and nap', anim: 'sleep', act: () => G_().sleep() },
    { id: 'food', pos: [7.25, 0, -1.9], r: 0.55, label: 'Eat some kibble', anim: 'eat', act: () => { G.Audio.play('eat'); G_().toast('Crunch crunch. Milo feels ready for anything.'); } },
    { id: 'water', pos: [7.25, 0, -1.3], r: 0.55, label: 'Drink some water', anim: 'drink', act: () => { G.Audio.play('drink'); } },
    { id: 'drawer', pos: [1.35, 0, -4.95], r: 0.6, label: () => (S().chapter === 4 && !item('tinykey') ? 'Take the tiny brass key' : 'Nose open the bottom drawer'), anim: 'interact',
      when: () => !item('tinykey') && !has('usedTinyKey'),
      act: () => {
        G_().drawerAnim();
        if (S().chapter >= 4) { G_().give('tinykey'); G_().c4Check(); G_().say(lore('milo', '*String, batteries, a birthday candle... and the tiny brass key. It was a WINDING key all along!*', 'happy')); }
        else { G_().flag('sawTinyKey'); G_().say(lore('milo', '*String, batteries, a birthday candle... and a tiny brass key. Too small for any door. Weird.*')); }
      } },
    { id: 'clock', pos: [1.6, 0, 0.85], r: 0.6, label: 'Look at the tall clock', act: () => G_().say([['milo', '*The tall clock. Ellie says her grandpa built it. It ticks like a heartbeat.*', 'think'], ...(S().chapter >= 3 ? [['milo', '*Grandpa Arlo... from the workshop in the woods!*', 'surprised']] : [])]) },
    { id: 'toychest', pos: [-7.4, 0, -1.75], r: 0.65, label: 'Nudge open the toy chest', anim: 'interact', when: () => !G_().gotC('c_ball'), act: () => { G_().toyLid(); G_().giveCollectible('c_ball'); } },
    { id: 'boot', pos: [7.25, 0, 4.55], r: 0.6, label: 'Poke into the rain boot', anim: 'sniff', when: () => !G_().gotC('c_mouse'), act: () => G_().giveCollectible('c_mouse') },
    { id: 'mirror', pos: [3, 0, 5.3], r: 0.6, label: 'Admire yourself', act: () => { G.Audio.play('dook'); G_().player.dance(2.2); G_().toast('What a handsome ferret.'); } },
    { id: 'fire', pos: [-7.1, 0, 3.3], r: 0.6, label: 'Warm your paws', anim: 'sniff', act: () => G_().toast('Toasty.') },
    { id: 'frontdoor', pos: [5, 0, 5.55], r: 0.6, label: 'Scratch at the front door', anim: 'interact', act: () => G_().say(lore('milo', '*Far too heavy. Humans and their giant doors.*')) },
    { id: 'petflapLocked', pos: [5, 0, -5.55], r: 0.6, label: 'Push the pet flap', when: () => G_().col('petFlap').on, act: () => G_().say(lore('milo', '*Latched for the night. Ellie always locks it at bedtime.*')) },
    { id: 'garageGap', pos: [12.8, 0, 5.5], r: 0.6, label: 'Peek under the garage door', when: () => G_().col('garageGap').on, act: () => G_().say(lore('milo', '*A gap under the big door. Something’s wedged in it from outside... too tight right now.*')) },
    { id: 'vent', pos: [6.6, 0, 1.15], r: 0.7, label: () => (S().chapter === 1 && !has('ventOpen') ? (item('flashlight') ? 'Nudge the grate aside' : 'Sniff the vent') : 'Squeeze into the vent'), anim: 'sniff',
      act: () => {
        const s = S();
        if (s.chapter === 1 && !item('flashlight')) { G_().flag('ventFound'); G.Audio.musicBox({ broken: true, muffled: true, vol: 0.05 }); G_().say([['milo', '*There! The noise is coming from down there... Clink. Clink. And a little song.*', 'surprised'], ['milo', '*But it’s dark as a burrow. I need some light first. Ellie’s keychain flashlight rolled under the sofa yesterday...*', 'think']], () => G_().setStep('c1_light')); return; }
        if (!has('ventOpen')) { G_().flag('ventOpen'); G_().ventAnim(); }
        G_().travel([6.6, UG, 1.9], Math.PI, s.chapter === 1 && ['c1_wake', 'c1_light', 'c1_vent'].includes(s.step) ? () => G_().setStep('c1_base') : null);
      } },
    // ----- basement + tunnels
    { id: 'ductUp', pos: [6.6, UG, 1.55], r: 0.6, label: 'Climb up the duct', act: () => G_().travel([6.6, 0, 1.7], 0) },
    { id: 'crate', pos: [-4.85, UG, 0.1], r: 0.7, label: () => (has('crateMoved') ? '' : 'Push the old crate'), anim: 'push', when: () => !has('crateMoved'),
      act: () => G_().pushCrate() },
    { id: 'jscratch', pos: [-5.3, UG, -0.7], r: 0.7, label: 'Sniff the scratched letter', when: () => !has('crateMoved'), act: () => G_().say(lore('milo', '*Someone scratched a letter into the wall. A "J". The crate smells of earth... is something behind it?*')) },
    { id: 'memoryBox', pos: [2, UG, -3.4], r: 0.7, label: 'Nose through the old box', anim: 'sniff', when: () => !G_().gotC('c_photo4'),
      act: () => G_().say([['milo', '*Crayon drawings! A house, a sun... and a long brown squiggle with a red bow. "JUNIPER" in wobbly letters.*', 'surprised'], ['milo', '*Ellie drew this when she was little. Who is Juniper?*', 'think']], () => G_().giveCollectible('c_photo4')) },
    { id: 'tunnelExit', pos: [-12.3, UG, -11.7], r: 0.7, label: 'Climb out of the tunnel', act: () => G_().exitTunnelA() },
    { id: 'bushHole', pos: [-6.5, 0, -24], r: 0.7, label: 'Squeeze into the tunnel', when: () => S().chapter >= 2, act: () => G_().travel([-12.1, UG, -11.2], 0.5) },
    { id: 'rubbleA', pos: [-12.6, UG, -4.6], r: 0.6, label: () => (S().step === 'c5_rubble' ? 'Push through the loose earth' : 'Sniff the caved-in passage'), when: () => G_().col('rubble').on,
      act: () => { if (S().step === 'c5_rubble') G_().clearRubble(); else G_().say(lore('milo', '*The passage is caved in. It smells of damp earth... and hedgehog.*')); } },
    { id: 'rubbleN', pos: [-14.0, UG, -4.35], r: 0.6, label: () => (S().step === 'c5_rubble' ? 'Push through the loose earth' : 'Sniff the loose earth'), when: () => G_().col('rubble').on,
      act: () => { if (S().step === 'c5_rubble') G_().clearRubble(); else G_().say(lore('milo', '*Loose earth. On the other side... the old tunnel to the basement?*')); } },
    // ----- backyard
    { id: 'digFence', pos: [15.25, 0, -22], r: 0.7, label: 'Dig under the fence', anim: 'dig', when: () => S().chapter >= 2 && G_().col('digFence').on, act: () => G_().digFence() },
    { id: 'digFenceEarly', pos: [15.25, 0, -22], r: 0.7, label: 'Sniff the soft soil', when: () => S().chapter < 2, act: () => G_().toast('Soft soil under the fence.') },
    { id: 'gateLatch', pos: [16.8, 0, -15.2], r: 0.7, label: 'Nudge the gate latch', anim: 'interact', when: () => G_().col('gate').on && S().chapter >= 2, act: () => G_().openGate() },
    { id: 'birdbath', pos: [-1, 0, -23.05], r: 0.6, label: 'Look up at the bird bath', act: () => G_().toast('A sparrow splashes about. Milo watches, fascinated.') },
    { id: 'tire', pos: [-3.2, 0, -19.55], r: 0.6, label: 'Bat at the tire swing', anim: 'interact', act: () => G_().swingTire() },
    { id: 'toolshed', pos: [11.5, 0, -22.8], r: 0.7, label: 'Sniff the garden shed', anim: 'sniff', act: () => G_().toast('Locked. Smells of fertiliser and old flower pots.') },
    { id: 'veggies', pos: [-4.2, 0, -12.9], r: 0.9, label: 'Dig in the vegetable bed', anim: 'dig', act: () => { G.Audio.play('dig'); G_().dirtBurst(); G_().toast('Milo digs happily. Ellie’s mum will not be pleased.'); } },
    // ----- neighbourhood
    { id: 'sandbox', pos: [20.3, 0, 43.2], r: 0.8, label: 'Dig in the sandbox', anim: 'dig', when: () => S().chapter >= 2 && !item('marble') && !has('gotMarble'), act: () => { G.Audio.play('dig'); G_().dirtBurst(0xe3cf9e); G_().flag('gotMarble'); G_().give('marble'); } },
    { id: 'mailbox', pos: [3.5, 0, 13.1], r: 0.6, label: 'Sniff the mailbox post', anim: 'sniff', act: () => G_().toast('Smells of the postman’s dog. Rude.') },
    { id: 'shopdoor', pos: [53, 0, 8.6], r: 0.7, label: 'Look at the shop door', act: () => G_().say(lore('milo', '*A sign says BACK IN 10 MINUTES. Tilly says it’s said that for years.*')) },
    { id: 'pipstash', pos: [0.2, 0, 39.9], r: 0.7, label: 'Peek at Pip’s stash', anim: 'sniff', when: () => S().chapter >= 2, act: () => G_().say(lore('milo', '*Pip’s hollow! Bottle caps, a thimble, a spoon, three buttons, and... a little brass gear?*')) },
    { id: 'hedgeLook', pos: [-28.8, 0, 50], r: 0.8, label: 'Sniff the hedge', when: () => G_().col('hedgeGap').on, act: () => G_().toast('Thick hedge. Something smells like rabbit.') },
    // ----- forest
    { id: 'keyDig', pos: [-95.0, 0, 5.75], r: 0.75, label: 'Dig by the three stones', anim: 'dig', when: () => S().chapter >= 3 && !item('key') && !has('usedKey'), act: () => G_().digKey() },
    { id: 'stump', pos: [-96, 0, 6.8], r: 0.8, label: 'Sniff the old stump', anim: 'sniff', act: () => G_().toast('An old stump, carved with the letters A + E.') },
    { id: 'shedDoor', pos: [-107, 0, -15.2], r: 0.9, label: () => (item('key') ? 'Unlock the workshop door' : 'Push the workshop door'), anim: 'interact', when: () => G_().col('shedDoor').on,
      act: () => { if (item('key')) G_().unlockShed(); else G_().say(lore('milo', '*Locked tight. There’s a keyhole shaped like a little gear.*')); } },
    { id: 'corkboard', pos: [-103.75, 0, -20.9], r: 0.8, label: () => (S().step === 'c4_board' ? 'Piece the clues together' : 'Look at the corkboard'),
      act: () => { if (S().step === 'c4_board') G.UI.openClues(); else G_().say([['milo', '*A corkboard covered in sketches. Gears, springs... and a drawing of a little wooden music box with a girl’s name on the lid: ELLIE.*', 'surprised']]); } },
    { id: 'hatch', pos: [-105, 0, -20.2], r: 0.8, label: () => (G_().col('hatchBoards').on ? 'Sniff the trapdoor' : 'Slip down through the hatch'),
      act: () => { if (G_().col('hatchBoards').on) G_().say(lore('milo', '*A trapdoor, buried under heavy boards. Cool air drifts up between the cracks.*')); else G_().travel([-39.4, UG, -10], -Math.PI / 2, () => { if (S().step === 'c5_hatch') G_().setStep('c5_fork'); }); } },
    { id: 'hatchUp', pos: [-39.7, UG, -10], r: 0.6, label: 'Climb back up to the workshop', act: () => G_().travel([-105, 0, -19.4], 0) },
    { id: 'rootsDig', pos: [-28.1, UG, -10], r: 0.7, label: 'Dig through the roots', anim: 'dig', when: () => G_().col('roots').on, act: () => G_().digRoots() },
    { id: 'cave', pos: [-117.6, 0, 43.2], r: 1.0, label: 'Dook into the cave', act: () => { G.Audio.play('dook'); setTimeout(() => G.Audio.play('dook', 0.5), 450); setTimeout(() => G.Audio.play('dook', 0.25), 900); G_().toast('...dook... dook... dook...'); } },
    { id: 'musicbox', pos: [-18.9, UG, -4.4], r: 0.75, label: () => (S().step === 'c5_fix' ? 'Fix the music box' : 'Look at the music box'), when: () => S().chapter === 5 && !item('musicbox') && !has('boxPlaced'), act: () => { if (S().step === 'c5_fix') G_().fixMusicBox(); else G_().toast('Talk to Moss first.'); } },
    { id: 'nightstand', pos: [-4.05, 0.55, -5.55], r: 0.55, label: 'Place the music box', when: () => item('musicbox'), act: () => G_().placeMusicBox() },
  ];
})();
