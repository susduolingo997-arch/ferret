/* =====================================================================
   mochi.js - "Milo's New Friend": an optional story mission in which
   Ellie brings home a second young ferret, Mochi. Covers her model and
   behaviour, the arrival cutscene, seven quest objectives, and her life
   in the house afterwards (following, napping, playing, finding things
   first, and small funny moments). Hooks into G.EXT like expansion.js.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, EXT = G.EXT, UG = G.World.UG;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const has = (f) => !!S().flags[f];
  const Q = () => (S().quests || {}).mochi;
  const say = (l, d) => game().say(l, d);
  const PAL = { key: 'mochi', brown: 0x9a8474, dark: 0x4a3a30, cream: 0xf7f1ea, mask: 0x5a4636, nose: 0xe89aa0, earIn: 0xf0b0b4, earOut: 0xf3ece2, back: 0x705d4f, side: 0x9e8878, belly: 0xece2d4, tip: 0x3e3028, scale: 1.1 };
  const ROOMS = { living: 'the living room', kitchen: 'the kitchen', bedroom: "Ellie's bedroom", hall: 'the hallway' };

  G.ITEMS.mochiball = { name: "Mochi's Jingle Ball", desc: 'A little blue ball full of holes, with a bell inside. Mochi’s absolute favourite thing in the world (after Milo).', story: true };
  G.ITEMS.mochitreat = { name: 'Welcome Treats', desc: 'A little bag of treats Ellie left by the carrier for Mochi.', story: true };
  G.PICKUPS.push(
    { id: 'p_mochiball', item: 'mochiball', model: 'mochiball', pos: [13.05, 0, 3.95], when: () => Q() === 'toy', msg: 'A blue jingle ball behind the boxes! It smells exactly like Mochi.' },
    { id: 'p_mochitreat', item: 'treat', model: 'treat', pos: [4.1, 0, 4.9], when: () => Q() === 'treat' && !G.game.hasItem('treat'), msg: 'Ellie left some treats by the carrier. For Mochi. Probably.' },
  );
  G.QUESTS.mochi = {
    kind: 'Story mission', title: "Milo's New Friend", giver: 'Ellie',
    steps: {
      carrier: 'Someone came home. See what’s in the carrier in the hallway', find: 'Find where Mochi is hiding', tour: 'Show Mochi around the house', toy: 'Find Mochi’s favourite toy', treat: 'Share a treat with Mochi',
      play: 'Play together in the backyard', tag: 'Tag! Catch Mochi three times', tunnel: 'Follow Mochi through the little tunnel', home: 'Mochi ran off! Find her and bring her home',
    },
    done: 'Best friends. Mochi is part of the family now.',
    target: (st) => M.target(st),
  };
  G.CLUES.push(['mochi', 'Mochi joined the family. Milo has a best friend.', () => Q() === 'done']);
  G.NAMES = G.NAMES || {};

  /* ================================================================ state */
  const M = (G.Mochi = { state: 'off', path: [], crumbs: [], t: 0, act: null, actT: 0, tags: 0, rooms: {}, emoteT: 0 });

  M.init = function (g) {
    G.NAMES.mochi = 'Mochi';
    this.f = new G.Ferret(PAL); this.f.root.visible = false; g.scene.add(this.f.root);
    this.pos = V3(0, 0, 0); this.yaw = 0; this.speed = 0; this.turn = 0;
    // portrait
    const pf = new G.Ferret(PAL); pf.idleT = -99; pf.update(0.016, { speed: 0 }); const hp = V3(); pf.head.getWorldPosition(hp);
    const url = G.Portrait.shot('mochi', pf.root, V3(hp.x + 0.14, hp.y + 0.04, hp.z + 0.36), V3(hp.x, hp.y - 0.02, hp.z));
    G.UI.portraitsExtra = G.UI.portraitsExtra || {}; G.UI.portraitsExtra.mochi = url;
    // pet carrier
    const c = (this.carrier = new THREE.Group()); c.position.set(4.6, 0, 4.5); c.rotation.y = -Math.PI / 2 - 0.3; c.visible = false; g.scene.add(c);
    const shell = G.Mat.std('carrier', { color: 0x7fb0c4, rough: 0.45 }), grey = G.Mat.std('carrierg', { color: 0xe8e4d8, rough: 0.5 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.36), shell); b.position.y = 0.17; b.castShadow = true; c.add(b);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.38), grey); top.position.y = 0.34; c.add(top);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), grey); hd.position.y = 0.36; c.add(hd);
    const door = (this.cDoor = new THREE.Group()); door.position.set(0.25, 0.02, -0.15); c.add(door);
    const gm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.3), G.Mat.std('grille', { color: 0x333333, rough: 0.4, metal: 0.6, transparent: true, opacity: 0.8 })); gm.position.set(0, 0.14, 0.15); door.add(gm);
    const blank = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), G.Mat.std('carrierblanket', { color: 0xd98f6a, rough: 1, map: 'fabric' })); blank.rotation.x = -Math.PI / 2; blank.position.y = 0.012; c.add(blank);
    G.World.collider(4.3, 4.9, 4.2, 4.8, 0, 0.36, { name: 'carrier', climb: true }).on = false; g.hashC(G.World.col.carrier);
    // talk / interact
    this.it = { id: 'mochi_talk', pos: [0, 0, 0], r: 0.95, label: () => this.label(), when: () => this.f.root.visible && !['path', 'hideAway', 'flee', 'lead', 'sleepNow'].includes(this.state) && this.label() !== '', act: () => this.talk() };
    G.INTERACT.push(this.it);
    // wrap game methods so Mochi comes along through tunnels and naps with Milo
    const oTravel = g.travel.bind(g); g.travel = (pos, yaw, after) => { const follow = this.state === 'follow' && this.pos.distanceTo(g.player.pos) < 8; oTravel(pos, yaw, () => { if (follow) this.place(pos[0] - Math.sin(yaw) * 0.6, pos[1], pos[2] - Math.cos(yaw) * 0.6); after && after(); }); };
    const oSleep = g.sleep.bind(g); g.sleep = () => { oSleep(); if (Q() === 'done' && this.inHouse(this.pos) && g.player.action === 'sleep') { this.place(-3.25, 0, -4.35); this.state = 'sleep'; this.stateT = 60; this.yaw = 2; if (!has('napTogether')) { g.flag('napTogether'); setTimeout(() => UI().toast('<b>Nap buddies</b>', null, 'Mochi curled up right next to Milo.'), 1200); } } };
  };
  M.inHouse = (p) => p.y > -5 && p.x > -8 && p.x < 14 && p.z > -6 && p.z < 6;
  M.place = function (x, y, z) { this.pos.set(x, y, z); this.crumbs = []; this.f.root.position.copy(this.pos); };

  /* where Mochi should be after loading a save (or when state changes) */
  M.apply = function () {
    const q = Q(), g = game(), c = S().chapter;
    this.carrier.visible = !!q && q !== 'done' || (q === 'done' && c !== 6);
    if (q === 'carrier') this.carrier.visible = true;
    G.World.col.carrier.on = this.carrier.visible; this.cDoor.rotation.y = q && q !== 'carrier' ? -1.6 : 0;
    this.f.root.visible = !!q && q !== 'carrier';
    if (!q || q === 'carrier') { this.state = 'off'; return; }
    if (q === 'find') { this.place(-4.5, 0, 5.15); this.state = 'hideAway'; this.yaw = 0; return; }
    if (q === 'home') { this.place(...this.lostSpot()); this.state = 'lost'; return; }
    if (q === 'done') { this.home(); return; }
    const p = g.player.pos; this.place(p.x - 0.6, p.y, p.z - 0.6); this.state = 'follow';
    if (q === 'tunnel') this.startTunnel();
    if (q === 'tag') this.state = 'flee';
  };
  M.home = function () {
    const c = S().chapter, g = game();
    if (c === 6 && g.state !== 'play') { this.place(-2.4, 0, -18.6); this.state = 'idle'; return; }
    if (c === 5 || (G.env && G.env.night > 0.6)) { this.place(-3.25, 0, -4.35); this.state = 'sleep'; this.stateT = 999; return; }
    this.place(-4.2, 0, 3.4); this.state = 'idle'; this.stateT = 5;
  };
  M.lostSpot = () => (S().flags.fenceDug ? [19.7, 0, -4.2] : [-8.8, 0, -26.8]);

  /* ================================================================ objectives */
  M.target = function (st) {
    const p = this.pos;
    switch (st) {
      case 'carrier': return [4.6, 0, 4.1];
      case 'find': return [-4.5, 0, 4.6];
      case 'tour': { const next = Object.keys(ROOMS).find((r) => !this.rooms[r]); return { living: [-3.5, 0, 2.5], kitchen: [4.5, 0, -1.6], bedroom: [-4, 0, -2.4], hall: [5, 0, 3] }[next] || [p.x, p.y, p.z]; }
      case 'toy': return game().hasItem('mochiball') ? [p.x, p.y, p.z] : [13.05, 0, 3.95];
      case 'treat': return game().hasItem('treat') ? [p.x, p.y, p.z] : [4.1, 0, 4.9];
      case 'play': return [2, 0, -15];
      case 'tag': case 'tunnel': return [p.x, p.y, p.z];
      case 'home': return this.state === 'lost' ? [p.x, p.y, p.z] : [5, 0, -4.6];
    }
    return null;
  };
  function setStep(st, quiet) { const s = S(); s.quests = s.quests || {}; if (!s.quests.mochi) { EXT.startQuest('mochi', st); } else EXT.setQuest('mochi', st); if (!quiet) game().autosave(); }

  /* the arrival: the family comes home with a pet carrier */
  M.checkStart = function () {
    const g = game(), s = S(), e = G.env || {};
    if (Q() || g.busy || G.UI.dialogueOpen || g.state !== 'play') return;
    if (!([2, 3, 4, 6].includes(s.chapter) || s.chapter >= 10) || e.night > 0.45 || g.hasItem('musicbox')) return;
    if (!e.area || e.area.zone !== 'house' || s.playTime - (M.chapterClock || 0) < 45) return;
    this.carrier.visible = true; G.World.col.carrier.on = true; g.hashC(G.World.col.carrier);
    A.play('door'); setTimeout(() => A.play('thud', 0.4), 700);
    setStep('carrier');
    say([['ellie', 'Milo! We’re home! Come and see who we brought...', 'happy'], ['milo', 'Ellie’s home early? And she put a box with a little door in the hallway. It’s... wiggling.', 'surprised']]);
  };
  M.arrival = function () {
    const g = game(); g.busy = true; UI().letterbox(true);
    g.cinematic({ pos: V3(5.9, 0.55, 3.1), look: V3(4.7, 0.18, 4.3), dur: 12 });
    const pl = g.player; if (pl.pos.distanceTo(V3(4.6, 0, 4.5)) < 1.3) pl.teleport(5.4, 0, 3.4, -0.6);
    setTimeout(() => { A.play('unlock'); g.tween(0.8, (k) => (this.cDoor.rotation.y = -1.6 * U.smooth(k))); }, 700);
    setTimeout(() => {
      this.f.root.visible = true; this.place(4.62, 0, 4.42); this.yaw = -Math.PI / 2 - 0.3 + Math.PI;
      this.path = [[4.95, 3.85, 0.35, 'sniff', 1.6], [5.05, 3.7, 0.3, 'look', 1.4]]; this.state = 'path'; A.play('squeak', 0.6); this.after = () => { this.state = 'shy'; };
    }, 1600);
    setTimeout(() => say([['ellie', 'This is Mochi. Be gentle, Milo, she’s a little bit shy. Mum and I will unpack her things!', 'happy'], ['mochi', '...eep?', 'shy']], () => {
      A.play('squeak'); g.cinematicEnd();
      this.path = [[4.2, 3, 4.2], [2.6, 3, 4.2], [1.2, 3, 4.2], [-2.6, 4.2, 4.2], [-4.5, 5.15, 3.2, 'hide', 0]]; this.state = 'path'; this.after = () => { this.state = 'hideAway'; };
      setTimeout(() => { g.busy = false; say([['milo', 'Another ferret! She zoomed off... I think she went into the living room. I’ll need my nose to find her.', 'surprised']], () => setStep('find')); }, 1600);
    }), 5200);
  };
  M.found = function () {
    const g = game(); g.busy = true; this.state = 'shy'; A.play('squeak', 0.5);
    g.cinematic({ pos: V3(-3.6, 0.35, 3.7), look: V3(-4.4, 0.1, 5), dur: 999, soft: true });
    say([
      ['mochi', 'Eep! Oh. You found me. Um. Hi. Are you the other ferret? You smell like... tunnels and adventures.', 'shy'],
      ['milo', 'She’s trembling a little. What should I do?', 'think'],
      { choice: [
        { t: 'Do a silly little war dance', set: { mochiMeet: 'dance' }, then: [{ do: () => { g.player.dance(2.2); } }, ['mochi', '...pfff! Hee hee! What WAS that? Do it again! No wait, let ME try!', 'happy'], { do: () => { this.doAct('dance', 2.2); A.play('dook'); } }] },
        { t: 'Lie down and wait quietly', set: { mochiMeet: 'wait' }, then: [['mochi', '...', 'shy'], ['mochi', '*sniff sniff* ...You’re nice. You didn’t even try to grab me. Okay. I’m coming out.', 'happy'], { do: () => this.doAct('sniff', 1.4) }] },
      ] },
      ['mochi', 'I’m Mochi! This house is SO big. Will you show me around? Please please please?', 'happy'],
    ], () => { g.cinematicEnd(); g.busy = false; this.state = 'follow'; this.rooms = {}; setStep('tour'); });
  };

  /* ================================================================ talking to Mochi */
  M.label = function () {
    const q = Q(); if (!q || q === 'carrier' || q === 'find') return '';
    if (q === 'treat' && game().hasItem('treat')) return 'Give Mochi a treat';
    if (q === 'home' && this.state === 'lost') return 'Comfort Mochi';
    return 'Talk to Mochi';
  };
  M.talk = function () {
    const g = game(), q = Q(), meet = S().choices.mochiMeet;
    this.face(g.player.pos); A.play('dook', 0.6);
    if (q === 'tour') return say([['mochi', `Where next? You haven’t shown me ${ROOMS[Object.keys(ROOMS).find((r) => !this.rooms[r])]} yet! Lead the way!`, 'happy']]);
    if (q === 'toy') return say([['mochi', 'My jingle ball fell out of the carrier when we came in. I heard it roll off somewhere cold with lots of boxes...', 'sad'], ['milo', 'Cold, with lots of boxes. The garage!', 'think']]);
    if (q === 'treat') {
      if (g.hasItem('treat')) return say([['milo', 'Here, Mochi. My very best treat. Don’t tell anyone I shared.', 'happy'], { do: () => { g.take('treat'); this.doAct('eat', 1.6); g.player.act('eat', 1.4); A.play('eat'); } }, ['mochi', 'Crunch crunch crunch... MMMF. This is the best day of my whole life. Can we play outside now?', 'happy']], () => setStep('play'));
      return say([['mochi', 'My tummy is rumbly. Do you have any treats? I bet you know ALL the treat spots.', 'shy']]);
    }
    if (q === 'play') return say([['mochi', 'Outside! Outside! Is there grass? Is there DIRT? Take me to the backyard!', 'happy']]);
    if (q === 'tag') return say([['mochi', 'You can’t catch meeee!', 'happy']]);
    if (q === 'home' && this.state === 'lost') return say([
      ['mochi', 'M-Milo? I chased a butterfly and then everything looked the same and I got lost and it’s big and loud out here...', 'sad'],
      ['milo', 'It’s okay. Stay right behind me. I’ll take you home.', 'happy'],
      ['mochi', '...Okay. Right behind you. Like a tail. A tail with a tail.', 'shy'],
    ], () => { this.state = 'follow'; A.play('dook'); });
    if (q === 'home') return say([['mochi', 'Home is the big house with the cosy basket, right? I’m right behind you!', 'happy']]);
    // after the quest: a little menu of things to do together
    const following = this.state === 'follow';
    const opts = [
      { t: 'Play tag!', then: [['mochi', meet === 'dance' ? 'TAG! Bet you can’t out-dance me either!' : 'Tag! You’re it!', 'happy'], { do: () => this.startTag(true) }] },
      following ? { t: 'Wait here for me, Mochi', then: [['mochi', 'Okay! I’ll find something fun to do. Or a nap. Probably a nap.', 'happy'], { do: () => { this.state = 'idle'; this.stateT = 4; } }] } : { t: 'Come exploring with me', then: [['mochi', 'Adventure! I’m coming! Wait for me!', 'happy'], { do: () => { this.state = 'follow'; this.followT = 999; } }] },
    ];
    if (g.hasItem('treat')) opts.push({ t: 'Share a treat', then: [{ do: () => { g.take('treat'); this.doAct('eat', 1.6); A.play('eat'); } }, ['mochi', 'Nom nom nom. You’re the best, Milo.', 'happy']] });
    opts.push({ t: 'Just say hi', then: [this.chatLine()] });
    say([['mochi', this.greet(), 'happy'], { choice: opts }]);
  };
  M.greet = function () { const l = ['Milo! Milo! Hi! Hi, Milo!', 'Oh! It’s you! My favourite ferret!', 'Did you find anything shiny today? I found a sock.', 'I was just thinking about you. And snacks. Mostly you.']; return l[Math.floor(Math.random() * l.length)]; };
  M.chatLine = function () {
    const c = S().chapter; const lines = [
      ['mochi', 'Tilly the cat looked at me through the window. I looked back. She blinked first. I WIN.', 'smug'],
      ['mochi', 'Do you think the grandfather clock is alive? It keeps going tick. At me.', 'think'],
      ['mochi', 'I found a secret spot under the bed. Well, you probably already knew. But now it’s OUR secret spot.', 'happy'],
      ['mochi', c >= 6 ? 'Ellie plays the music box every night now. I fall asleep before the end every time.' : 'Ellie hums a little song when she thinks nobody’s listening. I’m always listening.', 'happy'],
      ['mochi', 'When I grow up I want to be a tunnel. Or a ferret who digs tunnels. Either is fine.', 'think'],
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  };
  M.pathTo = function (to, sp, last) { const pts = G.World.navPath([this.pos.x, this.pos.y, this.pos.z], to).slice(1); this.path = pts.map((p) => [p[0], p[2], sp]); if (last) Object.assign(this.path[this.path.length - 1], { 3: last[0], 4: last[1] }); this.state = 'path'; };
  M.face = function (p) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); };
  M.doAct = function (a, d) { this.act = a; this.actT = d; };

  /* ================================================================ tag, tunnel, lost */
  M.startTag = function (casual) { this.tags = 0; this.casual = !!casual; this.state = 'flee'; this.fleeT = 0; if (!casual) setStep('tag'); UI().toast('<b>Tag!</b>', G.UI.portraitsExtra.mochi, 'Run (Shift) and catch Mochi three times.'); };
  M.startTunnel = function () {
    this.state = 'lead'; this.leadPts = [[8.2, -26.85], [9.5, -26.85], [11.3, -27.1]]; this.leadI = 0;
    say([['mochi', 'Ooh! OOH! A little tunnel under that bush! Follow me, Milo!', 'happy']]);
  };
  M.tunnelDone = function () {
    const g = game(); this.state = 'shy'; this.doAct('sniff', 2);
    const hat = !g.gotC('s_gnomehat');
    say([['mochi', hat ? 'A secret garden corner! And look, I found a tiny hat! I found it first! I’m a GREAT explorer!' : 'A secret garden corner! And a gnome! He’s staring at me. I’m staring back.', 'happy'], ['mochi', '...wait. Was that a butterfly? BUTTERFLY!', 'surprised']], () => {
      A.play('squeak'); setStep('home');
      this.state = 'hideAway'; this.path = [[9.5, -26.85, 3.5], [7, -26, 3.5], [4, -24, 3.5]]; this.state = 'path';
      this.after = () => { const s = M.lostSpot(); this.place(...s); this.state = 'lost'; };
      setTimeout(() => say([['milo', 'Mochi! Wait! ...She’s gone. She doesn’t know her way around yet. I have to find her before she gets scared.', 'surprised']]), 1500);
    });
  };
  M.brought = function () {
    const g = game(); this.pathTo([-3.25, 0, -4.35], 1.6, ['sleep', 0]); this.after = () => { this.state = 'sleep'; this.stateT = 999; };
    A.play('yawn');
    say([['mochi', 'Home... the cosy basket... Milo, can I share it? Just for tonight? And tomorrow? And forever?', 'sleepy'], ['milo', 'Of course. That’s what best friends do.', 'happy']], () => {
      setStep('done'); g.flag('bestFriends');
      setTimeout(() => { A.play('chapter'); UI().toast('<b>Unlocked: Best Friends</b>', G.UI.portraitsExtra.mochi, 'Mochi lives with Milo now. Talk to her to play, explore or share treats.'); }, 800);
    });
  };

  /* ================================================================ movement */
  const R = 0.11, PH = 0.18;
  M.move = function (tx, tz, sp, dt) {
    const g = game(), p = this.pos, dx = tx - p.x, dz = tz - p.z, l = Math.hypot(dx, dz);
    if (l < 0.02) { this.speed = U.damp(this.speed, 0, 10, dt); return true; }
    const step = Math.min(sp * dt, l); const nx = p.x + (dx / l) * step, nz = p.z + (dz / l) * step;
    const before = this.yaw; this.yaw = U.dampAngle(this.yaw, Math.atan2(dx, dz), 10, dt); this.turn = U.angDiff(before, this.yaw) / Math.max(dt, 1e-4);
    p.x = nx; p.z = nz; this.speed = sp;
    // collide with walls/furniture, step up small ledges
    let ground = p.y < UG + 12 ? UG : 0, over = 9;
    for (const c of g.near(p.x - 0.3, p.x + 0.3, p.z - 0.3, p.z + 0.3)) {
      if (!c.on) continue; const cx = U.clamp(p.x, c.x0, c.x1), cz = U.clamp(p.z, c.z0, c.z1), ex = p.x - cx, ez = p.z - cz, d2 = ex * ex + ez * ez;
      if (d2 < (R * 0.6) ** 2 && c.walk && c.y1 <= p.y + 0.21) ground = Math.max(ground, c.y1);
      if (d2 < (R * 0.6) ** 2 && c.y0 > p.y + 0.05) over = Math.min(over, c.y0 - p.y);
      if (!(p.y + PH > c.y0 && p.y + 0.02 < c.y1) || d2 >= R * R) continue;
      if (c.walk && c.y1 - p.y <= 0.2) { p.y = c.y1; continue; }
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (ex / d) * R; p.z = cz + (ez / d) * R; }
    }
    if (p.y < UG + 12 && !(p.x > -5.95 && p.x < 8 && p.z > -5 && p.z < 5)) { const q = g.tunnelClamp(p.x, p.z); if (q) { p.x = q.x; p.z = q.z; ground = q.y; } }
    p.y = U.damp(p.y, ground, 18, dt); this.over = over;
    return l - step < 0.03;
  };

  /* ================================================================ per-frame */
  M.update = function (dt, st) {
    const g = game(), s = S(), q = Q(), pl = g.player; this.t += dt;
    if (!this.f) return;
    if (s.chapter !== this.lastCh) { this.lastCh = s.chapter; M.chapterClock = s.playTime; }
    if (st === 'title') { this.f.root.visible = false; this.carrier.visible = false; return; }
    if (st === 'play') this.checkStart();
    if (q === 'carrier' && st === 'play' && !g.busy && !UI().dialogueOpen && pl.pos.distanceTo(V3(4.6, 0, 4.5)) < 1.7) this.arrival();
    if (!this.f.root.visible) return;
    if (this.act) { this.actT -= dt; if (this.actT <= 0) this.act = null; }
    const d = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z), sameLevel = Math.abs(pl.pos.y - this.pos.y) < 1.5;
    let act = this.act; this.speed = U.damp(this.speed, 0, 6, dt);
    switch (this.state) {
      case 'path': {
        const w = this.path[0]; if (!w) { this.state = 'idle'; const a = this.after; this.after = null; a && a(); break; }
        if (w.dwell === undefined && w[4] !== undefined) w.dwell = w[4];
        w.stuck = (w.stuck || 0) + dt; if (w.stuck > 6) { this.place(w[0], this.pos.y, w[1]); }
        if (this.move(w[0], w[1], w[2] || 3.6, dt)) { if (w[3]) { if (w[3] !== 'look') this.doAct(w[3], w.dwell || 0.1); else this.face(pl.pos); } w.dwell = (w.dwell || 0) - dt; if (w.dwell <= 0) this.path.shift(); }
        break;
      }
      case 'hideAway': act = 'hide'; if (q === 'find' && d < 1.05 && st === 'play' && !g.busy && !UI().dialogueOpen) this.found(); if (Math.random() < dt * 0.3) this.face(pl.pos); break;
      case 'shy': act = act || 'hide'; this.face(pl.pos); break;
      case 'lost': act = 'hide'; if (Math.random() < dt * 0.4 && d < 25) A.play('squeak', 0.3); if (d < 0.95 && st === 'play' && !UI().dialogueOpen && !g.busy) this.talk(); break;
      case 'follow': {
        // breadcrumbs keep her from cutting through walls
        const last = this.crumbs[this.crumbs.length - 1];
        if (!last || Math.hypot(last[0] - pl.pos.x, last[2] - pl.pos.z) > 0.3) this.crumbs.push([pl.pos.x, pl.pos.y, pl.pos.z]);
        if (this.crumbs.length > 80) this.crumbs.shift();
        if (!sameLevel || d > 14) { if (d > 14 || !sameLevel) { const f = pl.fwd(); this.place(pl.pos.x - f.x * 0.7, pl.pos.y, pl.pos.z - f.z * 0.7); } break; }
        if (this.distractT > 0) { this.distractT -= dt; act = 'sniff'; if (d > 3.5) this.distractT = 0; break; }
        if (d > 0.85) { while (this.crumbs.length > 1 && Math.hypot(this.crumbs[0][0] - this.pos.x, this.crumbs[0][2] - this.pos.z) < 0.25) this.crumbs.shift(); const c = this.crumbs[0] || [pl.pos.x, 0, pl.pos.z]; this.move(c[0], c[2], d > 2.2 ? Math.max(3.4, pl.speedH * 1.05) : 1.7, dt); }
        else { this.crumbs = []; if (pl.speedH < 0.1 && Math.random() < dt * 0.25) { this.distractT = 1.5 + Math.random() * 2; A.play('sniff', 0.4); } else if (Math.random() < dt * 0.5) this.face(pl.pos); }
        if (q === 'done' && this.followT !== undefined) { this.followT -= dt; if (this.followT <= 0) { this.state = 'idle'; this.stateT = 3; this.followT = undefined; } }
        break;
      }
      case 'flee': {
        this.fleeT = (this.fleeT || 0) - dt;
        if (this.tagPause > 0) { this.tagPause -= dt; act = 'dance'; break; }
        if (d < 0.6 && pl.speedH > 0.3) { this.tags++; this.tagPause = 1.3; A.play('dook'); A.play('squeak'); g.player.happy(); UI().toast(`<b>Tag! ${this.tags}/3</b>`, G.UI.portraitsExtra.mochi, this.tags < 3 ? 'She’s off again!' : 'Caught her!'); if (this.tags >= 3) { this.tagPause = 0; if (this.casual) { this.state = 'follow'; say([['mochi', 'Hee hee! Okay okay, you win. Again tomorrow?', 'happy']]); } else { this.state = 'follow'; say([['mochi', 'Hah... hah... you’re SO fast. That was the best game ever. Ooh, what’s over there?', 'happy']], () => { setStep('tunnel'); this.startTunnel(); }); } } break; }
        if (!this.fleeTo || this.fleeT <= 0 || Math.hypot(this.fleeTo[0] - this.pos.x, this.fleeTo[1] - this.pos.z) < 0.3) {
          const inYard = this.pos.z < -6.5 && this.pos.x > -9.5 && this.pos.x < 15.5 && this.pos.y > -5, awayX = this.pos.x - pl.pos.x, awayZ = this.pos.z - pl.pos.z, al = Math.hypot(awayX, awayZ) || 1;
          let tx = this.pos.x + (awayX / al) * 3 + (Math.random() - 0.5) * 3, tz = this.pos.z + (awayZ / al) * 3 + (Math.random() - 0.5) * 3;
          if (inYard) { tx = U.clamp(tx, -8.5, 14.5); tz = U.clamp(tz, -27, -8); }
          this.fleeTo = [tx, tz]; this.fleeT = 1.2 + Math.random();
        }
        this.move(this.fleeTo[0], this.fleeTo[1], d < 2.5 ? 3.3 : 2.2, dt);
        if (d > 7) this.fleeTo = [pl.pos.x + (this.pos.x - pl.pos.x) * 0.5, pl.pos.z + (this.pos.z - pl.pos.z) * 0.5];
        break;
      }
      case 'lead': {
        const w = this.leadPts[this.leadI];
        if (!w) { if (d < 1.8 && sameLevel) this.tunnelDone(); else { act = 'sniff'; if (Math.random() < dt * 0.5) this.face(pl.pos); } break; }
        if (d > 3.2 && Math.hypot(pl.pos.x - w[0], pl.pos.z - w[1]) > Math.hypot(this.pos.x - w[0], this.pos.z - w[1])) { this.face(pl.pos); act = 'look'; if (Math.random() < dt * 0.3) A.play('dook', 0.4); break; }
        this.leadStuck = (this.leadStuck || 0) + dt; if (this.leadStuck > 7) { this.place(w[0], 0, w[1]); }
        if (this.move(w[0], w[1], 2.4, dt)) { this.leadI++; this.leadStuck = 0; }
        break;
      }
      case 'sleep': act = 'sleep'; if (q === 'done' && (this.stateT -= dt) <= 0) { this.state = 'idle'; this.stateT = 3; } break;
      case 'idle': case 'wander': this.routine(dt, d); act = this.act || (this.state === 'sleep' ? 'sleep' : act); break;
      case 'discover': { const w = this.goal; if (!w) { this.state = 'idle'; break; } if (this.move(w[0], w[2], 2.8, dt)) { act = 'dance'; this.stateT -= dt; if (this.stateT <= 0 || d < 1.2) { this.state = 'idle'; this.stateT = 4; } } break; }
      case 'chase': { if (d > 0.55) this.move(pl.pos.x, pl.pos.z, 3.8, dt); else { A.play('dook'); UI().toast('<b>Tag!</b>', G.UI.portraitsExtra.mochi, 'Mochi got you! Now catch her!'); this.startTag(true); } if ((this.stateT -= dt) <= 0) { this.state = 'idle'; this.stateT = 3; } break; }
    }
    // quest progress from positions
    if (st === 'play') this.progress(dt, d);
    if (M.ball) this.playBall(dt);
    // animate
    const f = this.f; f.root.position.copy(this.pos); f.root.rotation.y = this.yaw;
    const fAct = act === 'look' ? null : act;
    f.update(dt, { speed: this.speed, run: this.speed > 2.3, air: false, vy: 0, action: fAct, crawl: (this.over || 9) < 0.45 || fAct === 'hide', turn: this.turn, look: act === 'look' || d < 3 ? U.clamp(U.angDiff(this.yaw, Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z)), -0.9, 0.9) : undefined });
    f.shadow.position.y = 0.006;
    this.it.pos[0] = this.pos.x; this.it.pos[1] = this.pos.y; this.it.pos[2] = this.pos.z;
    // footsteps & chatter
    if (this.speed > 0.3) { const ph = Math.floor(f.ph / Math.PI); if (ph !== this.stepPh) { this.stepPh = ph; if (d < 6) A.play('step-wood', 0.35); } }
    // she dances when Milo dances
    if (pl.action === 'dance' && d < 4 && !this.act && ['follow', 'idle', 'wander'].includes(this.state)) this.doAct('dance', 2);
  };

  /* tour of the house, toy, backyard, bringing her home */
  M.progress = function (dt, d) {
    const g = game(), q = Q(), ar = G.env && G.env.area; if (!ar) return;
    if (q === 'tour' && this.state === 'follow' && d < 3.2 && ROOMS[ar.id] && !this.rooms[ar.id] && !UI().dialogueOpen) {
      this.rooms[ar.id] = true; const n = Object.keys(this.rooms).length;
      const line = { living: ['mochi', 'A squishy sofa! A rug! A clock that goes TICK TOCK... is it angry? Is it hungry?', 'surprised'], kitchen: ['mochi', 'It smells like FOOD in here. Crunchy food. Is that your bowl? Can it be our bowl?', 'happy'], bedroom: ['mochi', 'Is that your basket? It smells like you. And socks. It’s perfect.', 'happy'], hall: ['mochi', 'That’s the big door I came in through! And those yellow boots are HUGE.', 'surprised'] }[ar.id];
      if (ar.id === 'living') this.doAct('hide', 1.2); if (ar.id === 'kitchen') this.doAct('sniff', 1.5); if (ar.id === 'bedroom') this.doAct('dance', 1.6);
      say([line], () => { UI().toast('<b>House tour</b>', G.UI.portraitsExtra.mochi, `${n}/4 rooms`); if (n >= 4) say([['mochi', 'This is the best house EVER. Oh no. Oh no no. Where is my jingle ball?!', 'sad']], () => setStep('toy')); });
    }
    if (q === 'play' && ar.id === 'backyard' && d < 3 && this.state === 'follow' && !UI().dialogueOpen) { say([['mochi', 'GRASS! It tickles! Let’s play tag! You’re it!', 'happy']], () => this.startTag(false)); }
    if (q === 'home' && this.state === 'follow' && ar.zone === 'house' && this.inHouse(this.pos) && !UI().dialogueOpen && !g.busy) this.brought();
  };
  EXT.onGiveMochi = function (id) {
    if (id === 'mochiball' && Q() === 'toy') {
      const g = game(); setTimeout(() => {
        g.take('mochiball'); const p = g.player.pos, f = g.player.fwd();
        M.ball = { pos: V3(p.x + f.x * 0.4, p.y + 0.3, p.z + f.z * 0.4), vel: V3(f.x * 0.6, 1, f.z * 0.6), m: makeBall() }; g.scene.add(M.ball.m);
        if (M.pos.distanceTo(p) > 4) M.place(p.x - f.x * 0.8, p.y, p.z - f.z * 0.8);
        M.state = 'idle'; M.playing = 6; A.play('jingle');
        say([['mochi', 'MY JINGLE BALL! You found it! *jingle jingle jingle*', 'happy']], () => setStep('treat'));
      }, 400);
    }
  };
  function makeBall() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshStandardMaterial({ map: G.Tex.make('jingleball', 64, 32, (g) => { g.fillStyle = '#2f7fd0'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#123a66'; for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(4 + i * 8 + (j % 2) * 4, 6 + j * 10, 2.4, 0, 7); g.fill(); } }), roughness: 0.35 }));
    m.castShadow = true; return m;
  }
  /* the jingle ball: Mochi bats it around, and it rolls */
  M.playBall = function (dt) {
    const b = M.ball, g = game(); if (!b) return;
    b.vel.y -= 9.8 * dt; b.pos.addScaledVector(b.vel, dt);
    const ground = b.pos.y < UG + 12 ? UG : 0; if (b.pos.y < ground + 0.05) { b.pos.y = ground + 0.05; b.vel.y = Math.abs(b.vel.y) > 1 ? -b.vel.y * 0.4 : 0; const fr = Math.exp(-1.6 * dt); b.vel.x *= fr; b.vel.z *= fr; }
    for (const c of g.near(b.pos.x - 0.2, b.pos.x + 0.2, b.pos.z - 0.2, b.pos.z + 0.2)) { if (!c.on || b.pos.y > c.y1 || b.pos.y + 0.05 < c.y0) continue; const cx = U.clamp(b.pos.x, c.x0, c.x1), cz = U.clamp(b.pos.z, c.z0, c.z1), ex = b.pos.x - cx, ez = b.pos.z - cz, dd = Math.hypot(ex, ez); if (dd < 0.05 && dd > 1e-4) { b.pos.x = cx + (ex / dd) * 0.05; b.pos.z = cz + (ez / dd) * 0.05; const n = V3(ex / dd, 0, ez / dd), vn = b.vel.dot(n); if (vn < 0) b.vel.addScaledVector(n, -1.6 * vn); } }
    b.m.position.copy(b.pos); b.m.rotation.x += (b.vel.z / 0.05) * dt; b.m.rotation.z -= (b.vel.x / 0.05) * dt;
    // Milo can bat it too
    for (const who of [g.player.pos, M.pos]) { const dx = b.pos.x - who.x, dz = b.pos.z - who.z, dd = Math.hypot(dx, dz); if (dd < 0.2 && dd > 1e-4 && Math.abs(b.pos.y - who.y) < 0.3) { const sp = who === M.pos ? 1.6 : Math.max(1, g.player.speedH); b.vel.set((dx / dd) * sp, 0.8, (dz / dd) * sp); if (!b.snd || g.t - b.snd > 0.3) { b.snd = g.t; A.play('jingle', 0.6); } } }
    if (M.playing > 0) { M.playing -= dt; if (M.state === 'idle') { M.move(b.pos.x, b.pos.z, 2.6, dt); } }
  };

  /* ================================================================ life after the quest */
  const NAP_SPOTS = [[-3.25, 0, -4.35], [-4.6, 0, 2.6], [5.8, 0, -1.2], [-6.6, 0, -2], [-3.6, 0, -19.2], [3.4, 0, -8.8]];
  M.routine = function (dt, d) {
    const g = game(), q = Q(); if (q !== 'done') { if (!(M.playing > 0)) { this.state = 'follow'; this.crumbs = []; } return; }
    this.stateT = (this.stateT || 0) - dt;
    if (this.wanderTo) { if (this.move(this.wanderTo[0], this.wanderTo[2], this.wanderTo[3] || 1.4, dt)) this.wanderTo = null; }
    if (this.stateT > 0) return;
    const r = Math.random(), env = G.env || {}, nearMilo = d < 8;
    // Mochi finds things before Milo does
    if (r < 0.2 && nearMilo) { const t = this.findSomething(); if (t) { this.state = 'discover'; this.goal = t; this.stateT = 6; A.play('dook'); UI().toast('<b>Mochi found something!</b>', G.UI.portraitsExtra.mochi, 'She’s sitting next to it, very proud of herself.'); return; } }
    if (r < 0.35 && nearMilo && d < 5) { this.state = 'chase'; this.stateT = 6; A.play('squeak'); return; }
    if (r < 0.45 && nearMilo && g.hasItem('treat') && !has('treatThief') ) { g.flag('treatThief'); g.take('treat'); this.doAct('eat', 1.6); A.play('eat'); UI().toast('<b>Treat thief!</b>', G.UI.portraitsExtra.mochi, 'Mochi stole a treat from your satchel. She is not sorry.'); this.stateT = 6; return; }
    if (r < 0.55 && nearMilo) { this.state = 'follow'; this.followT = 40; this.crumbs = []; return; }
    if (r < 0.7 && M.ball) { M.playing = 8; this.stateT = 9; return; }
    if (r < 0.85 || env.night > 0.5) { const sp = NAP_SPOTS[Math.floor(Math.random() * (env.rain > 0.4 ? 4 : NAP_SPOTS.length))]; if (Math.hypot(sp[0] - this.pos.x, sp[2] - this.pos.z) > 12 || !this.inHouse(this.pos) !== !this.inHouse(V3(...sp))) this.place(...sp); this.pathTo(sp, 1.6, ['sleep', 0]); this.after = () => { this.state = 'sleep'; this.stateT = 30 + Math.random() * 40; }; return; }
    this.wanderTo = [this.pos.x + (Math.random() - 0.5) * 3, 0, this.pos.z + (Math.random() - 0.5) * 3]; if (this.act === null && Math.random() < 0.5) this.doAct('sniff', 1.5); this.stateT = 5 + Math.random() * 6;
  };
  M.findSomething = function () {
    const g = game(), p = this.pos; let best = null, bd = 144;
    for (const w of g.worldItems) { const dd = w.def; if (w.kind !== 'collect' || g.S.collected[dd.id] || Math.abs(dd.pos[1] - p.y) > 1) continue; const d2 = U.dist2(dd.pos[0], dd.pos[2], p.x, p.z); if (d2 < bd) { bd = d2; best = dd; } }
    if (!best) return null;
    if (best.scentOnly) { g.flag('sniffed_' + best.id); g.refreshItems(); }
    return best.pos;
  };

  /* ================================================================ hook into the expansion */
  const oInit = EXT.init, oUpd = EXT.update, oApply = EXT.applyState, oGive = EXT.onGive;
  EXT.init = function (g) { oInit(g); M.init(g); };
  EXT.update = function (dt, st) { oUpd(dt, st); M.update(dt, st); };
  EXT.applyState = function () { oApply(); if (M.f) { const withBall = ['treat', 'play', 'tag', 'tunnel', 'home', 'done'].includes(Q()); if (withBall && !M.ball) { M.ball = { pos: V3(-3.8, 0.05, 2.9), vel: V3(), m: makeBall() }; game().scene.add(M.ball.m); } if (!withBall && M.ball) { game().scene.remove(M.ball.m); M.ball = null; } M.apply(); } };
  EXT.onGive = function (id) { oGive(id); EXT.onGiveMochi(id); };
  // Best Friends in the journal
  const oPanel = EXT.panels.quests;
  EXT.panels.quests = function () {
    oPanel(); if (!has('bestFriends')) return;
    const box = document.getElementById('questBody'), div = document.createElement('div');
    div.innerHTML = `<h3>Best Friends</h3><div class="q done bf"><img src="${G.UI.portraitsExtra.mochi}" alt=""><div><b>Milo &amp; Mochi</b><small>Mochi joined the family on a sunny day and never left Milo’s side. Talk to her to play tag, go exploring together, or share a treat. She naps in the funniest places, and sometimes her nose finds secrets before yours does.</small></div></div>`;
    box.insertBefore(div, box.firstChild);
  };
  const baseMake = G.makeItem; G.makeItem = (id) => { if (id === 'mochiball') { const g = new THREE.Group(); const b = makeBall(); b.position.y = 0.05; g.add(b); return g; } return baseMake(id); };
})();
