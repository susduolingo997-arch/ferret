/* =====================================================================
   sequel.js - the framework for chapters six to fourteen.
   Internal chapter ids stay clear of the old ones so existing saves keep
   working: 1-5 main story, 6 epilogue, 7 road trip, 8 Grandpa Arlo's
   (bonus II), 10-18 = chapters six to fourteen, 19 = Free Explore.
   New save data lives in S.sq and always has defaults.
   ===================================================================== */
'use strict';
(function () {
  const U = G.U, A = G.Audio, W = G.World, UG = W.UG, EXT = G.EXT;
  const game = () => G.game, S = () => G.game.S, UI = () => G.UI;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const SQ = (G.SQ = { CH: {}, triggers: [], ticks: [], onStart: {}, dialogue: {}, placement: {}, panelsExtra: [] });
  SQ.CH = {
    10: { n: 6, title: 'Beyond the Creek', time: 15.6, weather: 'clear', mood: 'forest', first: 's10_intro', spawn: () => [-2.5, 0, -17.4, 0] },
    11: { n: 7, title: 'The Old Garden', time: 10.2, weather: 'cloudy', mood: 'mystery', first: 's11_drain', spawn: () => [-44.5, 0, -133, Math.PI / 2] },
    12: { n: 8, title: 'The Forgotten House', time: 13.5, weather: 'fog', mood: 'mystery', first: 's12_cellar', spawn: () => [-10, -2.6, -117.4, Math.PI] },
    13: { n: 9, title: 'The Mountain Trail', time: 7.2, weather: 'morning', mood: 'trail', first: 's13_gate', spawn: () => [0, 0, -165, Math.PI] },
    14: { n: 10, title: 'The Underground', time: 11, weather: 'clear', mood: 'under', first: 's14_wake' },
    15: { n: 11, title: 'The Storm', time: 15, weather: 'storm', mood: 'storm', first: 's15_out' },
    16: { n: 12, title: 'The Hidden Village', time: 9.5, weather: 'clear', mood: 'village', first: 's16_arrive' },
    17: { n: 13, title: 'The Final Trail', time: 8.5, weather: 'clear', mood: 'trail', first: 's17_home' },
    18: { n: 14, title: 'Home', time: 17.6, weather: 'sunset', mood: 'home', first: 's18_back' },
    19: { n: 0, title: 'Free Explore', time: 10, weather: 'clear', mood: 'home', first: 'free' },
  };
  const WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen'];
  const RN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
  G.CHAPTERS = G.CHAPTERS || {}; G.ROMAN = G.ROMAN || [];
  for (const k in SQ.CH) { const c = SQ.CH[k]; G.CHAPTERS[k] = k == 19 ? ['Free Explore', 'The Hidden Path'] : ['Chapter ' + WORD[c.n], c.title]; G.ROMAN[k] = k == 19 ? '∞' : RN[c.n]; }
  G.ROMAN[8] = '★'; G.ROMAN[9] = '';
  SQ.isSeq = (c) => c >= 10;
  SQ.s = () => { const s = S(); if (!s.sq || typeof s.sq !== 'object') s.sq = {}; return s.sq; };
  SQ.flag = (k, v = true) => game().flag(k, v); SQ.has = (k) => !!S().flags[k];
  SQ.step = (st) => game().setStep(st);
  SQ.say = (lines, done) => game().say(lines, done);
  SQ.think = (t, e = 'think') => [['milo', t, e]];
  SQ.toast = (t, sub, img) => UI().toast(`<b>${t}</b>`, img || null, sub || '');
  SQ.near = (p, r) => { const q = game().player.pos; return Math.hypot(q.x - p[0], q.z - p[2]) < r && Math.abs(q.y - (p[1] === 'g' ? W.groundAt(p[0], q.y + 0.3, p[2]) : p[1])) < 2.5; };
  SQ.gp = (x, z, ug) => [x, W.groundAt(x, ug ? UG : 0, z), z];

  /* ---------------------------------------------------------------- moods for the new places */
  Object.assign(A.MOODS, {
    under: { bpm: 52, chords: [[38, 45, 50, 53, 57], [36, 43, 48, 52, 55], [41, 48, 53, 57, 60], [40, 47, 52, 55, 59]], density: 0.4, vol: 0.26 },
    storm: { bpm: 88, chords: [[38, 45, 50, 53, 57], [34, 41, 46, 50, 53], [36, 43, 48, 51, 55], [33, 40, 45, 48, 52]], density: 0.85, vol: 0.3 },
    village: { bpm: 96, chords: [[43, 50, 55, 59, 62], [48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [50, 57, 62, 66, 69]], density: 1, vol: 0.33 },
    coast: { bpm: 78, chords: [[45, 52, 57, 61, 64], [50, 57, 62, 66, 69], [42, 49, 54, 57, 61], [47, 54, 59, 62, 66]], density: 0.9, vol: 0.32 },
  });
  const oMood = game ? null : null;

  /* ---------------------------------------------------------------- starting a chapter */
  SQ.start = function (n, silent) {
    const g = game(), s = S(), c = SQ.CH[n]; if (!c) return;
    const sp = c.spawn && c.spawn(); if (sp) { const q = g.player.pos; if (Math.hypot(q.x - sp[0], q.z - sp[2]) > 20 || Math.abs(q.y - sp[1]) > 2) { g.player.teleport(sp[0], W.groundAt(sp[0], sp[1] + 0.5, sp[2]), sp[2], sp[3] || 0); g.cam.snap = true; } }
    s.chapter = n; s.step = c.first; s.weather = c.weather; s.time = c.time; SQ.s().started = Object.assign(SQ.s().started || {}, { [n]: true });
    g.applyWorldState(); g.placeNPCs(); g.refreshItems(); A.setMood(g.moodFor());
    if (!silent) UI().chapterCard(n); UI().updateObjective(true); g.autosave();
    if (SQ.onStart[n]) setTimeout(() => SQ.onStart[n](), silent ? 300 : 4600);
  };

  /* ---------------------------------------------------------------- hooks into game.js */
  const oEI = EXT.init, oEU = EXT.update, oApply = EXT.applyState, oScent = EXT.onScent;
  EXT.init = function (g) {
    oEI(g);
    const oStart = g.startChapter.bind(g); g.startChapter = (n, silent) => (n >= 8 && SQ.CH[n] ? SQ.start(n, silent) : n === 8 && G.Arlo ? G.Arlo.start() : oStart(n, silent));
    const oMoodFor = g.moodFor.bind(g); g.moodFor = () => { const c = S().chapter; if (SQ.CH[c]) { const a = W.areaAt(g.player.pos.x, g.player.pos.y, g.player.pos.z); return c === 14 && a.ug ? 'under' : SQ.CH[c].mood; } if (c === 8) return 'coast'; return oMoodFor(); };
    const oLoad = g.load.bind(g); g.load = (data) => { SQ.migrate(data); return oLoad(data); };
    // extra objective detail: checklists for sequel steps
    const oObj = UI().updateObjective.bind(UI()); UI().updateObjective = function (flash) {
      oObj(flash); const st = G.STEPS[S().step], el = document.getElementById('objective'); if (!st || !el || el.hidden) return;
      if (st.count) { const [a, b] = st.count(); el.querySelector('.txt').textContent = `${st.text} (${a}/${b})`; }
      if (st.subs) { const sub = el.querySelector('.sub'); sub.innerHTML = ''; for (const [t, done] of st.subs()) { const sp = document.createElement('span'); sp.className = done ? 'done' : ''; sp.textContent = t; sub.appendChild(sp); } }
    };
    // Moss and friends in the new chapters
    const oPlace = G.npcPlacement; G.npcPlacement = function () {
      const s = S(), c = s.chapter;
      if (c < 10) return oPlace();
      s.chapter = 6; let P; try { P = oPlace(); } finally { s.chapter = c; }
      const f = SQ.placement[c]; if (f) P = f(P, s.step) || P;
      return P;
    };
    for (const id of ['tilly', 'nora', 'pip', 'bram', 'moss']) {
      const base = G.DIALOGUE[id];
      G.DIALOGUE[id] = function () { const s = S(); const f = SQ.dialogue[id]; if (s.chapter >= 10 && f) { const r = f(s.chapter, s.step); if (r) return r; } if (s.chapter >= 10) { const c = s.chapter; s.chapter = 6; try { return base(); } finally { s.chapter = c; } } return base(); };
    }
    // the ending card can lead straight into the new story
    const end = document.getElementById('ending'); if (end && !document.getElementById('endNext')) { const b = document.createElement('button'); b.id = 'endNext'; b.className = 'btn'; b.textContent = 'Continue the story'; end.querySelector('.row').prepend(b); b.onclick = () => { end.hidden = true; g.freeRoam(); setTimeout(() => SQ.begin(), 900); }; }
    const oEnding = UI().ending.bind(UI()); UI().ending = function (st) { oEnding(st); const b = document.getElementById('endNext'); if (b) b.hidden = !(S().chapter === 6 && !SQ.s().started) || !!SQ.endingMode; };
    SQ.inited = true;
  };
  SQ.begin = function () { if (S().chapter === 6) game().startChapter(10); };
  SQ.migrate = function (d) { if (!d) return; if (!d.sq || typeof d.sq !== 'object') d.sq = {}; if (!d.quests) d.quests = {}; if (!d.flags) d.flags = {}; };
  EXT.applyState = function () { oApply(); SQ.s(); for (const f of SQ.applyFns || []) try { f(S()); } catch (e) { console.warn(e); } };
  SQ.onApply = (f) => (SQ.applyFns = SQ.applyFns || []).push(f);
  EXT.onScent = function () { oScent(); for (const tr of Object.values(SQ.trails)) if (tr.active()) SQ.trailSniff(tr); };
  EXT.update = function (dt, st) {
    oEU(dt, st); const g = game(); if (!g || !SQ.inited) return;
    const s = S(); SQ.s();
    if (st === 'play' && !g.busy && !UI().dialogueOpen) {
      for (const t of SQ.triggers) { if (t.done && t.once) continue; let ok = false; try { ok = t.when(s); } catch (e) {} if (ok) { if (t.once) t.done = true; t.fn(s); if (g.busy || UI().dialogueOpen) break; } }
      // the epilogue hints at the new adventure
      if (s.chapter === 6 && !SQ.s().started && !s.flags.sqHint && s.playTime > 30 && g.state === 'play') { g.flag('sqHint'); SQ.toast('A new adventure', 'Moss is waiting in the backyard. He found something in the creek.', G.UI.portraits.moss); }
    }
    for (const f of SQ.ticks) try { f(dt, s, st); } catch (e) { console.warn(e); }
    SQ.trailTick(dt);
  };
  SQ.trigger = (when, fn, once = true) => SQ.triggers.push({ when, fn, once });
  SQ.tick = (f) => SQ.ticks.push(f);

  /* ---------------------------------------------------------------- scent trails: sniff (Q) near each marker to find the next */
  SQ.trails = {};
  SQ.trail = function (id, pts, o = {}) { const tr = { id, pts, active: o.active || (() => false), onNext: o.onNext, onDone: o.onDone, col: o.col || 0xffd27a, label: o.label || 'Sniff the trail' }; SQ.trails[id] = tr;
    G.INTERACT.push({ id: 'trail_' + id, pos: [0, -999, 0], r: 1.3, label: tr.label, anim: 'sniff', when: () => tr.active() && SQ.trailIdx(tr) < pts.length, act: () => SQ.trailSniff(tr, true) });
    return tr; };
  SQ.trailIdx = (tr) => SQ.s()['trail_' + tr.id] || 0;
  SQ.trailPos = (tr) => { const p = tr.pts[Math.min(SQ.trailIdx(tr), tr.pts.length - 1)]; return [p[0], p[1] === 'g' ? W.groundY(p[0], p[2]) : p[1] === 'u' ? W.groundAt(p[0], UG, p[2]) : p[1], p[2]]; };
  SQ.trailSniff = function (tr, forced) {
    const i = SQ.trailIdx(tr); if (i >= tr.pts.length) return; const p = SQ.trailPos(tr), pl = game().player.pos;
    if (!forced && Math.hypot(pl.x - p[0], pl.z - p[2]) > 7) return;
    if (forced || Math.hypot(pl.x - p[0], pl.z - p[2]) < 7) {
      SQ.s()['trail_' + tr.id] = i + 1; A.play('sniff'); game().particles.burst(V3(p[0], p[1] + 0.1, p[2]), 18, tr.col, 'spark');
      if (i + 1 >= tr.pts.length) { tr.onDone && tr.onDone(); } else { tr.onNext && tr.onNext(i + 1); UI().toast('<b>The scent goes on…</b>', null, `${i + 1} of ${tr.pts.length} scent marks`); }
      UI().updateObjective(); game().autosave();
    }
  };
  SQ.trailTick = function (dt) {
    const g = game(); if (!g.particles) return;
    for (const id in SQ.trails) {
      const tr = SQ.trails[id]; let on = false; try { on = tr.active(); } catch (e) {}
      const it = G.INTERACT.find((x) => x.id === 'trail_' + id); if (!on || SQ.trailIdx(tr) >= tr.pts.length) { if (it) it.pos[1] = -999; continue; }
      const p = SQ.trailPos(tr); if (it) { it.pos[0] = p[0]; it.pos[1] = p[1]; it.pos[2] = p[2]; }
      const pl = g.player.pos, d = Math.hypot(pl.x - p[0], pl.z - p[2]);
      if ((d < 9 || g.scentT > 0) && Math.random() < dt * (g.scentT > 0 ? 18 : 4)) g.particles.emit({ x: p[0] + (Math.random() - 0.5) * 0.6, y: p[1] + 0.05 + Math.random() * 0.2, z: p[2] + (Math.random() - 0.5) * 0.6, vy: 0.25, life: 1.4, size: 0.05, col: tr.col, glow: true, wander: 0.3 });
    }
  };

  /* ---------------------------------------------------------------- collectible helpers */
  G.CATS.acorns = 'Carved Acorns'; G.CATS.memories = 'Memories'; G.CATS.golden = 'Golden Acorns'; G.CATS.homes = 'Hidden Animal Homes';
  SQ.collect = (id) => game().giveCollectible(id);
  /* resolve 'g' (surface) and 'u' (underground) heights once the terrain exists */
  const oBW = EXT.buildWorld;
  EXT.buildWorld = function (Wd) {
    oBW(Wd);
    const fix = (p) => { if (!p) return; if (p[1] === 'g') p[1] = W.groundY(p[0], p[2]); else if (p[1] === 'u') p[1] = W.groundAt(p[0], UG, p[2]); };
    for (const c of G.COLLECT) fix(c.pos); for (const c of G.PICKUPS) fix(c.pos); for (const i of G.INTERACT) fix(i.pos);
  };

  /* ---------------------------------------------------------------- journal */
  const oPanel = EXT.panels.quests;
  EXT.panels.quests = function () {
    oPanel(); const s = S(), box = document.getElementById('questBody'); if (!box) return;
    const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    let h = '<h3>The story continues</h3><div class="qlist">';
    const cur = s.chapter;
    for (let k = 10; k <= 18; k++) {
      const c = SQ.CH[k], started = (SQ.s().started || {})[k] || cur > k, act = cur === k, done = cur > k && cur !== 8 && cur !== 9 && cur !== 20 || ((cur === 8 || cur === 9 || cur === 20) && (s.prevChapter || 0) > k);
      if (!started && !act) { h += `<div class="q"><i></i><div><b>Chapter ${c.n}: ???</b>${k === 10 && cur === 6 ? '<small>Moss found something in the creek. Talk to him in the backyard.</small>' : ''}</div></div>`; continue; }
      h += `<div class="q ${act ? 'active' : 'done'}"><i></i><div><b>Chapter ${c.n}: ${esc(c.title)}</b><small>${act && G.STEPS[s.step] ? esc(G.STEPS[s.step].text) : 'Complete'}</small></div></div>`;
    }
    if (cur === 19) h += '<div class="q done"><i></i><div><b>Free Explore</b><small>The whole world is open. Nora’s burrows reach everywhere you have been.</small></div></div>';
    h += '</div>';
    for (const f of SQ.panelsExtra) h += f(esc) || '';
    const d = document.createElement('div'); d.innerHTML = h; box.insertBefore(d, box.children[2] || null);
  };

  /* ---------------------------------------------------------------- fast travel to the new places */
  SQ.travelSpots = [];
  const hookMap = () => {
    const U2 = UI(), base = U2.renderMap.bind(U2);
    U2.renderMap = function () {
      const s = S(); if (SQ.mapViews[this.mapView]) { SQ.renderMap(this.mapView); } else base();
      const ft = document.getElementById('mapTravel'); const can = s.flags.fastTravel && !game().hasItem('musicbox') && s.chapter !== 5 && !this.fromTitle && !SQ.noTravel();
      if (can) for (const [aid, name, pos, yaw] of SQ.travelSpots) { if (!s.discovered[aid]) continue; const b = document.createElement('button'); b.className = 'btn small ghost'; b.textContent = name; b.onclick = () => { A.play('ui'); this.closeAll(); game().travel(pos, yaw); }; ft.appendChild(b); }
      document.querySelectorAll('#mapTabs button').forEach((b) => { b.classList.toggle('sel', b.dataset.v === this.mapView); b.onclick = () => { this.mapView = b.dataset.v; this.renderMap(); }; b.hidden = SQ.mapViews[b.dataset.v] ? !SQ.mapViews[b.dataset.v].show() : false; });
    };
  };
  SQ.noTravel = () => { const c = S().chapter; return !!(SQ.CH[c] && SQ.CH[c].noTravel && SQ.CH[c].noTravel(S().step)); };
  SQ.mapViews = {};
  SQ.renderMap = function (view) {
    const V = SQ.mapViews[view], cv = document.getElementById('mapCv'), g = cv.getContext('2d'), s = S(), W2 = cv.width, H2 = cv.height, bx = V.bounds;
    const sc = Math.min(W2 / (bx[1] - bx[0]), H2 / (bx[3] - bx[2])), ox = (W2 - (bx[1] - bx[0]) * sc) / 2, oz = (H2 - (bx[3] - bx[2]) * sc) / 2, X = (x) => ox + (x - bx[0]) * sc, Z = (z) => oz + (z - bx[2]) * sc;
    g.fillStyle = V.bg || '#e9dcc0'; g.fillRect(0, 0, W2, H2); const r = U.rng(7); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(120,90,50,${r() * 0.06})`; g.fillRect(r() * W2, r() * H2, 2, 2); }
    const fill = { forest: '#7f9a64', garden: '#9fbf7a', house2: '#c9a27a', mountain: '#b9b08a', under: '#a08466', valley: '#8fb07a', village: '#d9b87a', town: '#b8c98f', coast: '#e8d49a', beach: '#e8d49a' };
    const areas = W.areas.filter((a) => (V.ug ? a.ug : !a.ug) && a.x1 > bx[0] && a.x0 < bx[1] && a.z1 > bx[2] && a.z0 < bx[3] && (a.region || V.base) && a.y0 === undefined);
    for (const a of areas.slice().reverse()) { const known = s.discovered[a.id]; if (!known) { g.save(); g.setLineDash([3, 4]); g.strokeStyle = 'rgba(90,70,50,.25)'; g.strokeRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc); g.restore(); continue; } g.fillStyle = fill[a.zone] || '#b8c98f'; g.fillRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc); g.strokeStyle = 'rgba(60,40,25,.45)'; g.strokeRect(X(a.x0), Z(a.z0), (a.x1 - a.x0) * sc, (a.z1 - a.z0) * sc); }
    if (V.draw) V.draw(g, X, Z, sc, s);
    g.font = '600 13px "Atkinson Hyperlegible", sans-serif'; g.textAlign = 'center';
    for (const a of areas) { if (!s.discovered[a.id] || (a.x1 - a.x0) * sc < 36) continue; g.fillStyle = '#2a1d15'; g.fillText(a.name, X((a.x0 + a.x1) / 2), Z((a.z0 + a.z1) / 2) + 4); }
    const t = UI().objTarget(); if (t && t[0] > bx[0] && t[0] < bx[1] && t[2] > bx[2] && t[2] < bx[3] && (!!V.ug === t[1] < UG + 12)) { g.save(); g.translate(X(t[0]), Z(t[2])); g.fillStyle = '#d9573b'; g.strokeStyle = '#f2e6cf'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 4 : 9; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.restore(); }
    const p = game().player; if (p.pos.x > bx[0] && p.pos.x < bx[1] && p.pos.z > bx[2] && p.pos.z < bx[3] && (!!V.ug === p.pos.y < UG + 12)) { g.save(); g.translate(X(p.pos.x), Z(p.pos.z)); g.rotate(-p.yaw + Math.PI); g.fillStyle = '#2d3a55'; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.strokeStyle = '#f2e6cf'; g.lineWidth = 2; g.stroke(); g.restore(); }
    const ft = document.getElementById('mapTravel'); ft.innerHTML = ''; const hp = document.createElement('p'); hp.className = 'note'; hp.textContent = s.flags.fastTravel ? 'Nora’s burrows connect these places:' : 'Meet Nora in Willow Park to unlock her burrow shortcuts.'; ft.appendChild(hp);
  };
  const oEI2 = EXT.init; EXT.init = function (g) { oEI2(g); hookMap(); };
  // map: pick the view that contains Milo when the map opens
  SQ.autoView = function () { const p = game().player.pos; for (const k in SQ.mapViews) { const V = SQ.mapViews[k], b = V.bounds; if (V.show() && p.x > b[0] && p.x < b[1] && p.z > b[2] && p.z < b[3] && (!!V.ug === p.y < UG + 12) && (!V.auto || V.auto(p))) return k; } return null; };
  const hookMenu = () => { const U2 = UI(), m = U2.menu.bind(U2); U2.menu = function (tab, ft) { if (tab === 'map') { const v = SQ.autoView(); this.mapView = v || (game().player.pos.y < UG + 12 ? 'under' : 'world'); } return m(tab, ft); }; };
  const oEI3 = EXT.init; EXT.init = function (g) { oEI3(g); hookMenu(); };
})();
