/* =====================================================================
   trailer.js - a cinematic trailer that runs on the real game engine.
   Every shot uses the actual 3D world, characters and props: Milo,
   Mochi, Ellie, Mum, Gus, Grandpa Arlo, the family car, the farm.
   Loaded only by trailer.html, after game.js.
   ===================================================================== */
'use strict';
(function () {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = G.Audio;
  let K, C, g, pl, UG, running = false, stopFlag = false;
  const cap = document.getElementById('tCap'), capT = cap.querySelector('.t'), capS = cap.querySelector('.s');
  const big = document.getElementById('tBig'), endCard = document.getElementById('tEnd'), fade = document.getElementById('tFade');
  const wait = (s) => new Promise((r) => { const end = G.game.t + s; const f = () => (G.game.t >= end || stopFlag ? r() : requestAnimationFrame(f)); f(); });
  const setFade = (on, dur = 0.5) => { fade.style.transitionDuration = dur + 's'; fade.classList.toggle('on', on); return wait(dur); };
  function caption(t, s = '') { capT.textContent = t; capS.textContent = s; cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on'); }
  function clearCap() { cap.classList.remove('on'); }
  function cam(pos, look, snap = true) { g.cinematic({ pos: V3(...pos), look: V3(...look), dur: 999, soft: true }); if (snap) g.cam.snap = true; }
  // smooth camera move between two framings over d seconds
  async function dolly(p0, l0, p1, l1, d) {
    const t0 = g.t; g.cinematic({ pos: V3(...p0), look: V3(...l0), dur: 999, soft: true, lock: true }); g.cam.snap = true;
    while (!stopFlag) { const k = Math.min(1, (g.t - t0) / d), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (g.cine) { g.cine.pos.set(...p0.map((v, i) => v + (p1[i] - v) * e)); g.cine.look.set(...l0.map((v, i) => v + (l1[i] - v) * e)); g.cine.lock = true; }
      if (k >= 1) break; await new Promise((r) => requestAnimationFrame(r)); }
  }
  function world(ch, time, weather = 'clear', step) {
    const s = g.S; s.chapter = ch; s.time = time; s.weather = weather; if (step) s.step = step;
    s.flags.fenceDug = true; s.flags.hedgeOpen = true; s.quests.mochi = 'done'; s.flags.bestFriends = true;
    g.applyWorldState(); g.placeNPCs && g.placeNPCs(); g.refreshItems && g.refreshItems();
    [C.ellie, C.mum, C.gus].forEach((h) => { h.root.visible = false; h.home = false; h.chase = null; h.path = []; h.seated = false; h.root.rotation.x = 0; });
    K.track(null); K.trackL(null); K.cutaway(false); driveCar = null;
    C.car.visible = false; C.ride = null; C.mochiRide = null; C.carried = null; C.cruise = null; K.hideMilo(false); pl.action = null; pl.auto = null;
    if (G.Farm) { G.Farm.fireflies = 0; }
  }
  const pinObj = new THREE.Object3D();
  const mochi = (x, z, yaw = 0, act) => { const M = G.Mochi; if (!M) return; M.f.root.visible = true; M.place(x, 0, z); M.state = 'sleep'; M.stateT = 1e9; pinObj.position.set(x, 0, z); pinObj.rotation.y = 0; C.mochiRide = { car: pinObj, off: V3(0, 0, 0), yaw }; M.doAct(act || null, act ? 99 : 0); };
  // simple per-frame driver for cars during shots
  let driveCar = null;
  function tick() { if (driveCar) { const c = driveCar; c.car.position.z += c.speed / 60; c.car.userData.speed = c.speed; if (c.car.position.z > c.z1) c.car.position.z = c.z0; } requestAnimationFrame(tick); }

  /* ------------------------------------------------------------ the shots */
  async function run() {
    running = true; stopFlag = false;
    endCard.classList.remove('on'); big.classList.remove('on'); document.getElementById('tSoon').classList.remove('on');
    await K.cutscene(async () => {
      document.getElementById('skipHint').hidden = true;
      // 1. Night. A clink under the floor.
      world(1, 1.6, 'clear'); A.setMood('night');
      pl.teleport(-3, 0, -3.9, 0.4); pl.act('sleep', 5, { lockMove: true });
      await setFade(false, 1.2);
      await dolly([-1.6, 1.3, -2.6], [-3, 0.2, -4.4], [-2.3, 0.75, -3.3], [-3, 0.25, -4.5], 3.6);
      A.play('metal', 0.6); setTimeout(() => A.play('metal', 0.4), 450);
      pl.act('lookup', 3, { lockMove: true }); caption('Every house has a secret.'); await wait(3.2);
      clearCap(); await setFade(true, 0.6);

      // 2. Title over the house at dusk
      world(2, 19.2, 'clear'); A.setMood('home'); pl.teleport(5, 0, 11, 3.1);
      await setFade(false, 0.8);
      big.classList.add('on');
      await dolly([26, 12, 30], [3, 1, 0], [-18, 9, 26], [3, 1, 0], 6);
      big.classList.remove('on'); await setFade(true, 0.6);

      // 3. The tunnels
      world(2, 12, 'clear'); A.setMood('mystery');
      const T = G.World.tunnels.find((t) => t.id === 'A'); const pts = T.pts;
      pl.teleport(pts[0][0], pts[0][1], pts[0][2], -Math.PI / 2); g.cinematicEnd(); g.cam.yaw = Math.PI / 2; g.cam.pitch = 0.2; g.cam.snap = true;
      await setFade(false, 0.5);
      K.go('milo', pts.map((p) => [p[0], p[2]]), 3.2); caption('Find the tunnels.', 'Follow your nose');
      await wait(4.6); clearCap(); await setFade(true, 0.5);

      // 4. Mochi
      world(6, 11, 'clear'); A.setMood('home');
      pl.teleport(1.2, 0, -15.2, Math.PI / 2); mochi(3.2, -15.3, -Math.PI / 2);
      cam([2.4, 0.7, -17.9], [2.2, 0.25, -15.2]);
      await setFade(false, 0.5);
      caption('Make a new friend.', 'Meet Mochi'); await wait(1.4);
      pl.dance(2.4); G.Mochi.doAct('dance', 2.4); await wait(2.6);
      await dolly([2.4, 0.7, -17.9], [2.2, 0.25, -15.2], [5.6, 1.6, -18.5], [2.2, 0.25, -15.2], 1.8);
      clearCap(); await setFade(true, 0.5);

      // 5. Bath time chase in the living room
      world(4, 11, 'clear'); A.setMood('trail');
      const M = C.mum; M.root.visible = true; M.pos.set(1.6, 0, 1.2); M.yaw = -Math.PI / 2; M.pose = 'idle';
      pl.teleport(0.2, 0, 2.2, -Math.PI / 2);
      cam([0.6, 1.3, 0.7], [-3.2, 0.4, 3.6]);
      await setFade(false, 0.4);
      caption('Don’t get caught.', 'Bath time!'); A.play('squeak');
      K.go('milo', [[-2.6, 3], [-4.2, 4.2]], 4.2); await wait(0.3); K.go(M, [[-1.2, 2.4], [-3.4, 3.6]], 2.8);
      await dolly([0.6, 1.3, 0.7], [-3.2, 0.4, 3.6], [-1.6, 1.0, 1.0], [-4.2, 0.3, 4.2], 2.6);
      M.pose = 'reach'; pl.act('hide', 3, { lockMove: true }); await wait(1.4); M.pose = 'think'; await wait(1);
      clearCap(); await setFade(true, 0.5);

      // 6. The road trip: in the car and on the highway
      world(7, 11, 'clear', 'r_escape'); A.setMood('trail');
      const car = C.car, P = C.passenger, D = C.driver; car.visible = true; car.position.set(141.8, 0, -150); car.rotation.y = 0; if (car.userData.cutaway) car.userData.cutaway(false);
      P.root.visible = true; P.seated = true; P.pose = 'sing'; D.root.visible = true; D.pose = 'drive';
      C.ride = { car, off: V3(0.4, 0.61, -0.84), yaw: 0 }; C.mochiRide = { car, off: V3(0.33, 0.61, -1.05), yaw: 0.4 }; if (G.Mochi) { G.Mochi.f.root.visible = true; G.Mochi.doAct('sleep', 99); }
      driveCar = { car, speed: 13, z0: -150, z1: -70 };
      K.track(car, [-3.2, 2.1, -8], [0, 0.9, 4]);
      await setFade(false, 0.5);
      caption('The Failed Road Trip', 'Bonus chapter'); await wait(3);
      K.trackL(car, K.CAMS.top[0], K.CAMS.top[1]); await wait(2.4);
      K.trackL(car, K.CAMS.back[0], K.CAMS.back[1]); clearCap(); await wait(2.6);
      pl.act('lookup', 3, { lockMove: true }); C.ride.yaw = Math.PI / 2 - 0.3; K.trackL(car, K.CAMS.window[0], K.CAMS.window[1], false); await wait(2.4);
      K.track(car, [-3.2, 3.4, 9.5], [0.8, 0.8, -3]); P.pose = 'wave2'; A.play('honk'); await wait(2.2);
      driveCar = null; K.cutaway(false); await setFade(true, 0.5);

      // 7. The gas station... and a choice
      world(7, 12.5, 'clear', 'r_escape'); A.setMood('mystery');
      car.visible = true; car.position.set(171.3, 0, -4.6); car.rotation.y = 0; car.userData.speed = 0; C.ride = null; C.mochiRide = null;
      const Gs = C.gus; Gs.root.visible = true; Gs.pos.set(186.5, 0, -3); Gs.yaw = -Math.PI / 2; Gs.pose = 'wave2';
      pl.teleport(163.4, 0, -15.5, 0.8); pl.act('sniff', 4, { lockMove: true });
      await setFade(false, 0.5);
      await dolly([158, 2.4, -24], [165, 0.6, -12], [161, 1.2, -18.5], [164, 0.3, -15], 3.2);
      caption('One choice.', 'Jump out… or stay in the car?'); await wait(2.6);
      clearCap(); Gs.pose = 'idle'; await setFade(true, 0.6);

      // 8. Grandpa Arlo's farm at sunset
      world(9, 18.6, 'clear', 'a_tasks'); A.setMood('ending');
      g.applyWorldState(); const El = C.ellie; El.root.visible = true; El.swinging = true; El.seated = true; El.pose = 'sit'; C.mum.root.visible = true; pl.teleport(182.5, 0, 95.5, Math.PI); mochi(183.6, 95.8, Math.PI);
      if (G.Farm) G.Farm.fireflies = 1;
      await setFade(false, 0.8);
      caption('Grandpa Arlo’s Farm', 'Bonus chapter III');
      await dolly([166, 12, 70], [186, 0, 98], [174, 5, 84], [186, 1, 100], 5);
      const Ar = G.Farm.arlo; Ar.pos.set(182, 0, 97.2); Ar.pos.y = 0; Ar.yaw = Math.PI; Ar.pose = 'wave2'; Ar.talkLock = 99; Ar.path = [];
      cam([182.3, 1.5, 93.2], [182, 1.1, 97.2]); clearCap(); await wait(2.4);
      cam([199, 2.2, 107], [203.6, 1, 112.6]); await wait(2.4);
      cam([171, 1.2, 82], [166.5, 0.3, 88]); await wait(2.2);
      cam([195, 4.5, 117], [209.5, 7, 124]); await wait(2);
      await setFade(true, 0.5);

      // 9. Montage
      A.setMood('forest');
      const beats = [
        ['Climb the hayloft.', () => { world(9, 15, 'clear', 'a_tasks'); pl.teleport(205.6, 2.4, 82, Math.PI); cam([201.5, 3.4, 85.5], [206, 2.5, 81.5]); }],
        ['Get lost in the corn.', () => { world(7, 14, 'clear', 'r_corn'); pl.teleport(118, 0, 20, -Math.PI / 2); K.go('milo', [[112, 20]], 3.4); cam([122, 1.0, 21.2], [116, 0.4, 20]); }],
        ['Ask a crow for directions.', () => { world(7, 14, 'clear', 'r_crow'); pl.teleport(133.4, 0, 28.8, Math.PI); cam([131.6, 2.1, 30.4], [133.5, 1.7, 27.4]); }],
        ['Uncover Juniper’s secret.', () => { world(9, 17, 'clear', 'a_denIn'); pl.teleport(221.6, UG, 142.5, 0.9); cam([220.3, UG + 1.1, 141.4], [223, UG + 0.2, 143]); }],
      ];
      for (const [t, f] of beats) { f(); await setFade(false, 0.3); caption(t); await wait(2.3); await setFade(true, 0.3); }
      clearCap();

      // 10. End card over the farm at night
      world(9, 21.5, 'clear', 'a_done'); A.setMood('night'); if (G.Farm) G.Farm.fireflies = 1;
      pl.teleport(182, 0.34, 99.2, Math.PI); pl.act('sleep', 99, { lockMove: true });
      await setFade(false, 1);
      endCard.classList.add('on'); const soon = document.getElementById('tSoon'); soon.classList.remove('on');
      setTimeout(() => { soon.classList.add('on'); A.play('secret'); }, 4200);
      await dolly([176, 3.2, 90], [183, 1, 100], [166, 10, 76], [184, 1.5, 100], 11);
    });
    running = false; document.getElementById('tPlay').hidden = false; const tp = document.getElementById('tPlay'); tp.querySelector('b').hidden = true; tp.style.alignItems = 'end'; tp.style.paddingBottom = '12%'; tp.style.background = 'none'; tp.querySelector('i').textContent = '↻ Watch again';
  }

  /* ------------------------------------------------------------ boot */
  function ready() {
    g = G.game; if (!g || g.state !== 'title' || !G.Kit) return setTimeout(ready, 200);
    K = G.Kit; C = G.Cast; pl = g.player; UG = G.World.UG;
    G.UI.title(false); G.UI.showHUD(false); g.state = 'cutscene'; g.busy = true;
    // a living backdrop behind the play button
    world(9, 18.8, 'clear', 'a_tasks'); if (G.Farm) G.Farm.fireflies = 1; pl.teleport(182.5, 0, 95.5, Math.PI);
    g.cinematic({ pos: V3(168, 10, 74), look: V3(186, 0, 98), dur: 999, soft: true }); g.cam.snap = true;
    document.getElementById('tLoad').hidden = true; document.getElementById('tPlay').hidden = false;
    requestAnimationFrame(tick);
  }
  document.getElementById('tPlay').onclick = async () => {
    if (running) return; document.getElementById('tPlay').hidden = true;
    try { A.init(); } catch (e) {}
    await setFade(true, 0.5); run();
  };
  ready();
})();
