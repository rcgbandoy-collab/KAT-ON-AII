// Fast Type Race: side-view car. Type correctly = car drives. Wrong letter = car stalls until Backspace.
GAMES.race = function () {
  const ws = shuffle(D.keywords).slice(0, { easy: 4, medium: 6, hard: 8 }[level]).map(k => ({ ...k, t: k.term.trim() }));
  const total = ws.reduce((s, w) => s + w.t.length, 0);
  const dur = { easy: .12, medium: .3, hard: .6 }[level];   // easy = fast car, hard = slow car
  let wi = 0, ci = 0, err = null, typed = 0, good = 0, badKeys = 0, bad = [], t0 = 0, started = false, done = false, go = false, mv;
  const CAR = `<svg viewBox="0 0 120 50" width="110"><path d="M8 34V24Q8 20 14 20H34L46 8H82L96 20L110 22Q114 24 114 30V34Z" fill="#ef4444"/>
    <path d="M48 12H60V20H40ZM64 12H80L90 20H64Z" fill="#bae6fd"/>
    <g class="wh"><circle cx="30" cy="36" r="9" fill="#111"/><path d="M30 31v10M25 36h10" stroke="#9ca3af" stroke-width="2"/></g>
    <g class="wh"><circle cx="92" cy="36" r="9" fill="#111"/><path d="M92 31v10M87 36h10" stroke="#9ca3af" stroke-width="2"/></g></svg>`;
  $('board').innerHTML = `<div class="card"><div class="hud"><span>⏱ <b id="tm">0.0</b>s</span><span>🎯 <b id="ac">100</b>%</span><span>🏁 <b id="pg">0</b>%</span></div>
    <div class="scene"><div class="hills"></div><div class="road"></div><div class="fin"></div>
    <div id="car" style="--d:${dur}s">${CAR}</div><div id="cd" class="cd">3</div></div>
    <div class="pbar"><i id="pf"></i></div><div id="queue" class="queue"></div>
    <p class="tag center" id="hint"></p><p class="tag center">Wrong letter = car stops. Press Backspace to fix it and keep driving.</p></div>`;
  const car = $('car');
  const draw = () => {
    const w = ws[wi];
    $('queue').innerHTML = ws.slice(0, wi).map(x => `<span class="q done">✔ ${esc(x.t)}</span>`).join('') +
      `<span class="q now">${[...w.t].map((c, k) => `<u class="${k < ci ? 'g' : k === ci && err ? 'r' : ''}">${k === ci && err ? esc(err) : c === ' ' ? '␣' : esc(c)}</u>`).join('')}</span>` +
      ws.slice(wi + 1, wi + 3).map(x => `<span class="q next">${esc(x.t)}</span>`).join('');
    $('hint').textContent = '💡 ' + w.definition;
  };
  const stats = () => {
    $('ac').textContent = typed ? Math.round(good / typed * 100) : 100;
    const p = Math.round(good / total * 100);
    $('pg').textContent = p; $('pf').style.width = p + '%';
  };
  const move = () => {
    car.style.left = `calc(${good / total} * (100% - 140px))`;
    car.classList.add('go');
    clearTimeout(mv); mv = setTimeout(() => car.classList.remove('go'), 250);
    const p = document.createElement('i'); p.className = 'puff'; car.appendChild(p); setTimeout(() => p.remove(), 600);
  };
  const finish = () => {
    done = true; stats();
    const s = (Date.now() - t0) / 1000;
    const acc = Math.round(good / typed * 100), wpm = Math.round(good / 5 / (s / 60));
    timers.push(setTimeout(() => result('race', `🏁 ${s.toFixed(1)}s · 🎯 ${acc}% · ⌨ ${wpm} WPM`, bad), 1200));
  };
  document.onkeydown = e => {
    if (done || !go || $('game').hidden) return;
    if (e.key === 'Backspace') { if (err) { err = null; car.classList.remove('stall'); draw(); } return; }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    if (err) return;                      // stalled: only Backspace works
    if (!started) { started = true; t0 = Date.now(); }
    const w = ws[wi]; typed++;
    if (e.key.toLowerCase() === w.t[ci].toLowerCase()) {
      good++; ci++; move();
      if (ci >= w.t.length) { wi++; ci = 0; if (wi >= ws.length) return finish(); }
    } else {
      err = e.key; badKeys++; car.classList.add('stall');
      if (!w.m) { w.m = 1; bad.push(w.topic); }
    }
    draw(); stats();
  };
  timers.push(setInterval(() => { if (started && !done) $('tm').textContent = ((Date.now() - t0) / 1000).toFixed(1); }, 100));
  let n = 3;
  const cd = setInterval(() => {
    if (--n > 0) { $('cd').textContent = n; return; }
    clearInterval(cd); $('cd').textContent = 'GO!'; go = true;
    setTimeout(() => $('cd')?.remove(), 700);
  }, 800);
  timers.push(cd);
  draw();
};