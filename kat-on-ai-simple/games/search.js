// ---------- Game 3: Word Search ----------
function search() {
  const N = { easy: 8, medium: 10, hard: 12 }[level], count = { easy: 5, medium: 7, hard: 9 }[level];
  const list = D.keywords.map(k => ({ ...k, w: k.term.replace(/[^a-z]/gi, '').toUpperCase() }))
    .filter(k => k.w.length >= 3 && k.w.length <= N);
  const picked = shuffle(list).slice(0, count);
  if (picked.length < 3) { $('board').innerHTML = '<div class="card">Not enough single words in this file for Word Search. Try another game.</div>'; return; }
  const g = Array.from({ length: N }, () => Array(N).fill(''));
  const dirs = level === 'easy' ? [[0, 1], [1, 0]] : [[0, 1], [1, 0], [1, 1]];
  picked.forEach(p => {
    for (let t = 0; t < 200 && !p.placed; t++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
      if (r + dr * (p.w.length - 1) >= N || c + dc * (p.w.length - 1) >= N) continue;
      let ok = true;
      for (let k = 0; k < p.w.length; k++) { const ch = g[r + dr * k][c + dc * k]; if (ch && ch !== p.w[k]) ok = false; }
      if (!ok) continue;
      for (let k = 0; k < p.w.length; k++) g[r + dr * k][c + dc * k] = p.w[k];
      p.placed = true;
    }
  });
  const words = picked.filter(p => p.placed);
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = abc[Math.floor(Math.random() * 26)];
  const found = new Set();
  let first = null;
  $('board').innerHTML = `<div class="card"><p class="tag">Click the FIRST letter, then the LAST letter of a word.</p>
    <p>${words.map(w => `<span class="chip" id="w_${w.w}">${w.w}</span>`).join('')}</p>
    <div class="grid" style="grid-template-columns:repeat(${N},38px)">
    ${g.map((row, r) => row.map((ch, c) => `<button class="cell" data-r="${r}" data-c="${c}">${ch}</button>`).join('')).join('')}</div>
    <button class="alt" id="fin">Finish</button></div>`;
  const finish = () => result('search', `${found.size} / ${words.length} words found`, words.filter(w => !found.has(w.w)).map(w => w.topic));
  $('fin').onclick = finish;
  document.querySelectorAll('.cell').forEach(b => b.onclick = () => {
    const r = +b.dataset.r, c = +b.dataset.c;
    if (!first) { first = [r, c]; b.classList.add('sel'); return; }
    const [r0, c0] = first; first = null;
    document.querySelectorAll('.sel').forEach(x => x.classList.remove('sel'));
    if (!(r === r0 || c === c0 || Math.abs(r - r0) === Math.abs(c - c0))) return;
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0), len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    const pos = []; let s = '';
    for (let k = 0; k < len; k++) { pos.push([r0 + dr * k, c0 + dc * k]); s += g[r0 + dr * k][c0 + dc * k]; }
    const hit = words.find(w => !found.has(w.w) && (w.w === s || w.w === [...s].reverse().join('')));
    if (!hit) return;
    found.add(hit.w);
    pos.forEach(([a, d]) => document.querySelector(`[data-r="${a}"][data-c="${d}"]`).classList.add('done'));
    $('w_' + hit.w).classList.add('found');
    if (found.size === words.length) timers.push(setTimeout(finish, 600));
  });
}


GAMES.search = search;