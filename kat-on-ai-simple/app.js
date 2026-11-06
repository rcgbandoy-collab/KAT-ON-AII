// KAT-ON-AI: shared core. Every game in /games plugs into GAMES and uses the one shared question bank (D).
let D = null, level = 'easy', timers = [];
const weak = {};
const used = new Set();   // study-session history: keys of items already used in some game
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const clearTimers = () => { timers.forEach(t => { clearInterval(t); clearTimeout(t); }); timers = []; };
function show(id) { ['upload', 'menu', 'game'].forEach(x => $(x).hidden = x !== id); }

// ---------- Text helpers ----------
// Turn fancy characters (en-dash, curly quotes, accents) into plain ones so they can be typed and compared.
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').trim();
// Only characters that exist on a normal keyboard (used by the typing race).
const typeable = s => norm(s).replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();

// ---------- Question history: pick fresh items first, so games don't repeat the same keywords/questions ----------
function take(arr, n, keyFn = x => JSON.stringify(x)) {
  const all = shuffle(arr || []);
  const fresh = all.filter(x => !used.has(keyFn(x)));
  const old = all.filter(x => used.has(keyFn(x)));
  const picked = fresh.concat(old).slice(0, n);
  if (fresh.length < n) all.forEach(x => used.delete(keyFn(x)));   // bank exhausted: start a new round
  picked.forEach(x => used.add(keyFn(x)));
  return picked;
}
// Shuffle the A/B/C/D choices but keep track of which one is correct.
function prepQ(q) {
  const idx = shuffle(q.choices.map((_, i) => i));
  return { ...q, choices: idx.map(i => q.choices[i]), answer: idx.indexOf(q.answer) };
}

// ---------- Flexible answer checking ----------
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'or', 'is', 'are', 'it', 'in', 'on', 'for', 'by', 'with', 'as', 'that', 'this', 'be', 'was', 'were']);
const wordsOf = s => norm(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const clean = s => { const w = wordsOf(s); const k = w.filter(x => !STOP.has(x)); return (k.length ? k : w).join(' '); };
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// small spelling mistakes are OK, but numbers/dates must be exact
function close(a, b) {
  if (a === b) return true;
  if (!a || !b || /\d/.test(b)) return false;
  const tol = b.length <= 4 ? 0 : b.length <= 7 ? 1 : b.length <= 12 ? 2 : 3;
  return lev(a, b) <= tol;
}
function check(user, answer) {
  const items = String(answer ?? '').split(';').map(clean).filter(Boolean);
  if (!items.length) return false;
  if (items.length > 1) {                       // enumeration / listing: any order, every item must be there
    const got = String(user).split(/[;,\n]|\band\b/i).map(clean).filter(Boolean);
    if (got.length === 1) {                     // typed with spaces only: look for each item inside the text
      const uw = got[0].split(' ');
      return items.every(it => it.split(' ').every(w => uw.some(x => close(x, w))));
    }
    if (got.length > items.length) return false;
    const left = [...got];
    return items.every(it => { const k = left.findIndex(g => close(g, it)); if (k < 0) return false; left.splice(k, 1); return true; });
  }
  const a = items[0], u = clean(user);
  if (!u) return false;
  if (close(u, a)) return true;
  const aw = a.split(' '), uw = u.split(' ');
  if (aw.length === 1) return uw.length <= 3 && uw.some(w => close(w, a));
  const hit = aw.filter(w => uw.some(x => close(x, w))).length / aw.length;
  return hit >= (aw.length <= 2 ? 1 : aw.length <= 6 ? .75 : .6) && uw.length <= aw.length * 2 + 2;
}

// ---------- Player colors (Red / Blue / Yellow / Green). No two players can share a color. ----------
const COLORS = [
  { id: 'red', name: 'Red', hex: '#ef4444' }, { id: 'blue', name: 'Blue', hex: '#3b82f6' },
  { id: 'yellow', name: 'Yellow', hex: '#f5b800' }, { id: 'green', name: 'Green', hex: '#22c55e' }
];
function pickColors(names, cb, title = 'Choose your colors') {
  const cur = names.map((_, i) => i);           // one unique color index per player
  const draw = () => {
    $('board').innerHTML = `<div class="card center"><h2>🎨 ${esc(title)}</h2>
      <p class="tag">Tap a color. If another player already has it, you swap, so nobody ever shares a color.</p>
      ${names.map((nm, p) => `<div class="prow"><b style="color:${COLORS[cur[p]].hex}">${esc(nm)}</b>
        <span class="swatches">${COLORS.map((c, ci) => `<button class="sw${cur[p] === ci ? ' on' : ''}" style="background:${c.hex}" data-p="${p}" data-c="${ci}" title="${c.name}"></button>`).join('')}</span>
        <span class="tag">${COLORS[cur[p]].name}</span></div>`).join('')}
      <button id="cgo">Start ▶</button></div>`;
    document.querySelectorAll('.sw').forEach(b => b.onclick = () => {
      const p = +b.dataset.p, c = +b.dataset.c, o = cur.indexOf(c);
      if (o >= 0 && o !== p) cur[o] = cur[p];
      cur[p] = c; draw();
    });
    $('cgo').onclick = () => cb(cur.map(i => COLORS[i]));
  };
  draw();
}

// ---------- Upload + Analyze ----------
$('go').onclick = async () => {
  const f = $('file').files[0], p = $('pasted').value.trim();
  if (!f && !p) { $('msg').textContent = '⚠ Choose a file or paste some text first.'; return; }
  level = $('level').value;
  const fd = new FormData();
  if (f) fd.append('file', f);
  fd.append('pasted', p);
  fd.append('level', level);
  $('msg').textContent = 'AI is reading your material... please wait ⏳';
  $('go').disabled = true;
  try {
    const r = await fetch('api.php', { method: 'POST', body: fd });
    const text = await r.text();
    let j = null;
    try { j = text ? JSON.parse(text) : null; } catch { throw new Error(text || 'Unexpected server response.'); }
    if (!r.ok || j?.error) throw new Error(j?.error || 'Request failed (' + r.status + ')');
    j.keywords = (j.keywords || []).filter(k => k.term && k.definition);
    j.quiz = (j.quiz || []).filter(q => q.q && Array.isArray(q.choices) && q.choices.length >= 2)
      .map(q => ({ ...q, choices: q.choices.slice(0, 4), answer: Number(q.answer) }))
      .filter(q => q.answer >= 0 && q.answer < q.choices.length);
    j.tf = (j.tf || []).filter(t => t.s);
    j.blanks = (j.blanks || []).filter(b => b.s && b.a);
    j.ids = (j.ids || []).filter(x => x.q && x.a);
    j.topics = j.topics || [];
    D = j;
    used.clear();
    Object.keys(weak).forEach(k => delete weak[k]);
    $('msg').textContent = '';
    showMenu();
  } catch (e) { $('msg').textContent = '⚠ ' + e.message; }
  $('go').disabled = false;
};

function showMenu() {
  clearTimers();
  document.onkeydown = null;
  $('reviewer').innerHTML = `<h2>📖 ${esc(D.title)}</h2>
    <p class="tag">${esc(D.category)} · ${level.toUpperCase()}</p><p>${esc(D.overview)}</p>
    <h3>Topics</h3><p>${D.topics.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</p>
    <h3>Keywords</h3><ul>${D.keywords.map(k => `<li><b>${esc(k.term)}</b> — ${esc(k.definition)}</li>`).join('')}</ul>`;
  const w = Object.keys(weak).sort((a, b) => weak[b] - weak[a]).slice(0, 3);
  $('weak').innerHTML = w.length ? `<p class="card">🤖 <b>Needs review:</b> ${w.map(esc).join(' · ')}</p>` : '';
  show('menu');
}
$('back').onclick = showMenu;

// ---------- Game launcher, results, celebration ----------
const GAMES = {};   // every file in /games adds itself here
const addWeak = l => l.filter(Boolean).forEach(t => weak[t] = (weak[t] || 0) + 1);

function startGame(name) {
  clearTimers();
  document.onkeydown = null;
  show('game');
  if (!GAMES[name]) { $('board').innerHTML = '<div class="card">This game is not loaded. Check index.php.</div>'; return; }
  GAMES[name]();
}

// o.ok = false means "not completed / not passed": no trophy, no confetti.
function result(key, score, wrongTopics, o = {}) {
  clearTimers();
  document.onkeydown = null;
  addWeak(wrongTopics);
  const ok = o.ok !== false;
  const w = [...new Set(wrongTopics.filter(Boolean))];
  $('board').innerHTML = `<div class="card center"><div class="trophy">${ok ? '🏆' : '💪'}</div><h2>${esc(o.title || (ok ? 'Game complete!' : 'Keep practicing!'))}</h2><p class="big">${esc(score)}</p>
    <p>${w.length ? '⚠ Needs review: <b>' + w.map(esc).join(', ') + '</b>' : ok ? '✅ No weak topics. Great job!' : ''}</p>
    <p>🤖 ${!ok ? 'No trophy this time. Answer more correctly to earn one!' : w.length ? 'Try another game to practice the topics you missed.' : 'Try a harder difficulty next!'}</p>
    <button onclick="startGame('${key}')">Play again</button></div>`;
  if (ok) confetti();
}

function confetti() {
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('span');
    s.className = 'conf';
    s.textContent = ['🎉', '⭐', '✨', '🎊'][i % 4];
    s.style.cssText = `left:${Math.random() * 100}vw;animation-delay:${Math.random()}s;font-size:${16 + Math.random() * 16}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3500);
  }
}