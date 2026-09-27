/* =====================================================================
   admin.js - a locked maintenance cabinet beside Pemberton's Corner Shop.
   It asks for a 4-digit code (5683). The code is not written anywhere in
   the game world, so only players who already know it get in.
   Unlocked, it lets you jump between chapters, start the Road Trip,
   finish quests, grab items, change time and weather, teleport, and more.
   ===================================================================== */
'use strict';
(function () {
  const EXT = G.EXT, A = G.Audio;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const CODE = '5683', POS = [61.35, 0, 6.6];

  /* ---------------------------------------------------------- the cabinet */
  const oBuild = EXT.buildWorld;
  EXT.buildWorld = function (W) {
    oBuild(W);
    const H = W.h;
    H.box({ w: 0.5, h: 1.3, d: 0.9, x: POS[0] + 0.05, y: 0, z: POS[2], mat: G.Mat.std('admCab', { color: 0x4a5560, rough: 0.5, metal: 0.4 }) });
    H.box({ w: 0.04, h: 0.26, d: 0.4, x: POS[0] + 0.31, y: 0.85, z: POS[2], mat: G.Mat.std('admScr', { color: 0x0f2a1c, rough: 0.2, emissive: 0x2dd67a, ei: 0.55 }), col: false });
    H.box({ w: 0.04, h: 0.24, d: 0.24, x: POS[0] + 0.31, y: 0.48, z: POS[2], mat: G.Mat.std('admPad', { color: 0x222222, rough: 0.4 }), col: false });
    H.box({ w: 0.05, h: 0.12, d: 0.9, x: POS[0] + 0.3, y: 1.18, z: POS[2], mat: 'red', col: false });
  };
  G.INTERACT.push({ id: 'admin', pos: [POS[0] + 0.7, 0, POS[2]], r: 1.3, label: () => (S().flags.adminUnlocked ? 'Open the admin panel' : 'Inspect the locked cabinet'), when: () => game().state === 'play', act: () => open() });

  /* ---------------------------------------------------------- UI */
  const css = document.createElement('style');
  css.textContent = `
  #admin{position:absolute;inset:0;z-index:60;display:grid;place-items:center;background:rgba(10,14,12,.55);font-family:'Atkinson Hyperlegible',system-ui,sans-serif}
  #admin[hidden]{display:none}
  #admin .ab{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#101c16;color:#bff5d4;border:2px solid #2dd67a;border-radius:14px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  #admin h2{margin:0 0 4px;font:700 20px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.06em;color:#6ff0a4}
  #admin .sub{margin:0 0 14px;font-size:13px;opacity:.75}
  #admin .code{display:flex;gap:10px;justify-content:center;margin:10px 0 14px}
  #admin .code i{width:44px;height:54px;border:2px solid #2dd67a;border-radius:8px;display:grid;place-items:center;font:700 28px ui-monospace,monospace;font-style:normal}
  #admin .pad{display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center}
  #admin button{font:600 14px 'Atkinson Hyperlegible',sans-serif;background:#18352a;color:#d6ffe6;border:1px solid #2dd67a;border-radius:8px;padding:9px 10px;cursor:pointer;min-height:40px}
  #admin button:hover,#admin button:focus-visible{background:#22553f;outline:none}
  #admin .pad button{font-size:20px;height:52px}
  #admin .msg{min-height:20px;text-align:center;margin-top:10px;font-size:14px}
  #admin .msg.bad{color:#ff8a7a}
  #admin .grp{margin:12px 0 0}
  #admin .grp h3{margin:0 0 6px;font:700 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6ff0a4;opacity:.85}
  #admin .row{display:flex;flex-wrap:wrap;gap:6px}
  #admin .on{background:#2dd67a;color:#0b1a12}
  #admin .top{display:flex;justify-content:space-between;align-items:start;gap:10px}
  #admin.shake .ab{animation:admShake .35s}
  @keyframes admShake{25%{transform:translateX(-8px)}50%{transform:translateX(8px)}75%{transform:translateX(-4px)}}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'admin'; el.hidden = true; el.innerHTML = '<div class="ab"></div>';
  document.addEventListener('DOMContentLoaded', () => (document.getElementById('app') || document.body).appendChild(el));
  if (document.readyState !== 'loading') (document.getElementById('app') || document.body).appendChild(el);
  const box = el.querySelector('.ab');
  let entry = '', isOpen = false, prevState = 'play';

  function open() {
    const g = game(); isOpen = true; prevState = g.state; g.state = 'menu'; g.busy = true; G.Input.unlock && G.Input.unlock();
    el.hidden = false; entry = ''; S().flags.adminUnlocked ? panel() : keypad(); A.play('ui');
  }
  function close() { isOpen = false; el.hidden = true; const g = game(); if (g.state === 'menu') g.state = 'play'; g.busy = false; }
  G.Admin = { open, close, get isOpen() { return isOpen; } };

  function keypad(msg, bad) {
    box.innerHTML = `<div class="top"><div><h2>MAINTENANCE ACCESS</h2><p class="sub">Pemberton's Corner Shop &middot; authorised staff only</p></div><button data-x>Close</button></div>
      <div class="code">${[0, 1, 2, 3].map((i) => `<i>${entry[i] ? '•' : ''}</i>`).join('')}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}<button data-c>Clear</button><button data-n="0">0</button><button data-ok>Enter</button></div>
      <p class="msg ${bad ? 'bad' : ''}">${msg || 'Enter the 4-digit code.'}</p>`;
    box.querySelector('[data-x]').onclick = close;
    box.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => press(b.dataset.n)));
    box.querySelector('[data-c]').onclick = () => { entry = ''; keypad(); };
    box.querySelector('[data-ok]').onclick = submit;
  }
  function press(n) { if (entry.length >= 4) return; entry += n; A.play('ui'); keypad(); if (entry.length === 4) setTimeout(submit, 180); }
  function submit() {
    if (entry.length < 4) return keypad('Four digits, please.', true);
    if (entry === CODE) { S().flags.adminUnlocked = true; game().autosave && game().autosave(); A.play('unlock'); panel('Access granted.'); }
    else { entry = ''; A.play('error'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); keypad('Wrong code. The screen blinks red.', true); }
  }
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); return; }
    if (S().flags.adminUnlocked) return;
    if (/^[0-9]$/.test(e.key)) { e.stopPropagation(); press(e.key); }
    else if (e.key === 'Backspace') { entry = entry.slice(0, -1); keypad(); }
    else if (e.key === 'Enter') submit();
  }, true);

  /* ---------------------------------------------------------- actions */
  const CH = () => G.CHAPTERS || {};
  const TELE = [['Milo’s Basket', [-3, 0, -3.9], 3.14], ['Backyard', [3, 0, -15], 3.14], ['Maple Street', [5, 0, 18], 0], ['Corner Shop', [58, 0, 11], 3.14], ['Willow Park', [2, 0, 32], 0], ['Forest Edge', [-54, 0, 49.5], -1.57], ['The Clearing', [-99, 0, 12], 3.14], ['Arlo’s Workshop', [-107, 0, -13.2], 3.14], ['Gas Station', [168, 0, 0], 1.57], ['Pinewood Farm', [182, 0, 93], 0], ['Saltwhistle Bay', [257, 0, -3.4], 1.57, 'bay'], ['The Far Wood', [-72, 'g', -140], 0], ['Wren Cottage', [-1, 0.1, -101.6], 3.14], ['Rose’s Garden', [-6, 'g', -136], 3.14], ['Mountain Trail', [-20, 'g', -228], 3.14], ['Rose’s Lookout', [-40, 'g', -292.6], 3.14], ['The Deepways', [24, 'ug', -309.4], 0], ['Storm Valley', [54, 'g', -294], 1.57], ['Thistlecombe', [182, 'g', -238], 1.57]];
  const tpTo = (pos, yaw, rid) => { const W = G.World, R = G.Regions; if (rid && R && R.byId[rid]) R.build(R.byId[rid]); const [x, y, z] = pos; if (R) R.ensureAt(x, y === 'ug' ? W.UG : 5, z); const yy = y === 'ug' ? W.UG : y === 'g' ? W.groundY(x, z) : y; game().travel([x, yy, z], yaw); };
  function toast(t) { UI().toast('<b>Admin</b>', null, t); }
  function run(fn, msg) { try { fn(); } catch (e) { console.warn(e); } if (msg) toast(msg); game().autosave && game().autosave(); panel(msg); }
  function gotoChapter(n) {
    close(); const g = game();
    if (n === 7) { G.Trip.start(false); return; }
    if (n === 9) { UI().fade && UI().fade(true); setTimeout(() => G.ArloFarm.begin(), 700); return; }
    if (n === 8 && G.Arlo) { UI().fade && UI().fade(true); setTimeout(() => { G.Arlo.start(); UI().fade && UI().fade(false); }, 700); return; }
    const f = S().flags; f.fenceDug = true; if (n >= 3) f.hedgeOpen = true; if (n >= 2) f.fastTravel = true;
    if (n === 6) {
      const s = S(); s.chapter = 6; s.step = 'end'; s.time = 7.4; s.weather = 'clear';
      for (const k of ['m1', 'm2', 'm3']) s.quests[k] = s.quests[k] || 'done'; f.m3done = true;
      g.applyWorldState(); g.placeNPCs(); g.refreshItems(); EXT.applyState && EXT.applyState(g); UI().updateObjective(true); g.travel([-3, 0, -3.9], 3.14); g.autosave();
    } else g.startChapter(n);
    toast(`Jumped to ${(CH()[n] || ['Chapter ' + n])[0]}`);
  }
  function panel(msg) {
    const s = S(), f = s.flags, ch = CH();
    const chs = Object.keys(ch).map(Number).filter((n) => n >= 1).sort((a, b) => a - b);
    box.innerHTML = `<div class="top"><div><h2>ADMIN PANEL</h2><p class="sub">Now in ${(ch[s.chapter] || [''])[0]}: ${(ch[s.chapter] || ['', ''])[1]} &middot; step <code>${s.step}</code></p></div><button data-x>Close</button></div>
      <div class="grp"><h3>Skip to chapter</h3><div class="row" id="admCh"></div></div>
      <div class="grp"><h3>Story</h3><div class="row" id="admSt"></div></div>
      <div class="grp"><h3>Time &amp; weather</h3><div class="row" id="admTw"></div></div>
      <div class="grp"><h3>Cheats</h3><div class="row" id="admCt"></div></div>
      <div class="grp"><h3>Teleport</h3><div class="row" id="admTp"></div></div>
      <p class="msg">${msg || ''}</p>`;
    box.querySelector('[data-x]').onclick = close;
    const add = (id, label, fn, on) => { const b = document.createElement('button'); b.textContent = label; if (on) b.className = 'on'; b.onclick = fn; box.querySelector('#' + id).appendChild(b); };
    for (const n of chs) add('admCh', `${n === 6 ? '❧' : n === 7 ? '★' : n === 8 ? '★★' : n === 9 ? '★★★' : n === 19 ? '∞' : n === 20 ? '?' : n >= 10 && G.SQ && G.SQ.CH[n] ? G.SQ.CH[n].n : n} · ${n === 19 ? 'Free Explore' : n === 6 ? 'Epilogue: ' + ch[n][1] : ch[n][1]}`, () => gotoChapter(n), s.chapter === n);
    add('admSt', 'Finish Mochi quest', () => run(() => { s.quests.mochi = 'done'; f.bestFriends = true; game().applyWorldState && game().applyWorldState(); EXT.applyState && EXT.applyState(game()); }, 'Mochi is now Milo’s best friend.'));
    add('admSt', 'Complete all missions', () => run(() => { for (const k of ['m1', 'm2', 'm3', 's1', 's2', ...Object.keys(G.QUESTS || {})]) s.quests[k] = 'done'; f.m3done = true; }, 'All missions marked complete.'));
    add('admSt', 'Get every collectible', () => run(() => { for (const c of G.COLLECT) if (!s.collected[c.id]) game().giveCollectible(c.id); game().refreshItems && game().refreshItems(); }, 'Collection complete.'));
    add('admSt', 'Fill the satchel', () => run(() => { for (const id of Object.keys(G.ITEMS)) if (!s.inv[id]) s.inv[id] = 1; s.inv.treat = (s.inv.treat || 0) + 10; }, 'Every item added, plus 10 treats.'));
    add('admSt', 'Unlock fast travel', () => run(() => { f.fastTravel = true; for (const k of ['bedroom', 'backyard', 'street', 'park', 'forestedge', 'clearing', 'shed', ...((G.SQ && G.SQ.travelSpots) || []).map((t) => t[0])]) s.discovered[k] = true; }, 'All burrows open on the map.'));
    add('admSt', 'Owners: chase me!', () => { close(); const C = G.Cast; const h = C && (C.mum.root.visible ? C.mum : C.ellie.root.visible ? C.ellie : null); if (h && G.Cast.startChase) G.Cast.startChase(h, 'bath'); else toast('Nobody is home to chase you right now.'); });
    for (const [t, lbl] of [[7, 'Morning'], [12, 'Noon'], [18.5, 'Sunset'], [22.5, 'Night']]) add('admTw', lbl, () => run(() => { s.time = t; game().applyWorldState(); }, `Time set to ${lbl.toLowerCase()}.`));
    for (const w of ['clear', 'cloudy', 'rain', 'heavyrain', 'storm', 'fog', 'sunset', 'night']) add('admTw', ({ heavyrain: 'Heavy rain' }[w] || w[0].toUpperCase() + w.slice(1)), () => run(() => { s.weather = w; game().applyWorldState(); }, `Weather: ${w}.`), s.weather === w);
    add('admCt', `Super speed ${G.speedBoost > 1 ? 'ON' : 'OFF'}`, () => run(() => { G.speedBoost = G.speedBoost > 1 ? 1 : 2.2; }, G.speedBoost > 1 ? 'Back to normal speed.' : 'Zoom!'), G.speedBoost > 1);
    add('admCt', 'Heal the day (reset treats timer)', () => run(() => { delete f.mumTreatToday; }, 'Mum will hand out another treat.'));
    add('admCt', 'Lock panel again', () => { f.adminUnlocked = false; game().autosave && game().autosave(); entry = ''; keypad('Locked. You’ll need the code again.'); });
    for (const [lbl, pos, yaw, rid] of TELE) add('admTp', lbl, () => { close(); tpTo(pos, yaw, rid); });
  }
})();
