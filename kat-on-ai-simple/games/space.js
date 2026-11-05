// Space Launch: answer typed questions. Correct = rocket climbs from Earth to outer space. Wrong = it slows down.
GAMES.space = function () {
  const KIND = { enumeration: 'Enumeration: list all, separate with commas', listing: 'Listing: separate with commas', identification: 'Identification', definition: 'Definition', person: 'Who is it?', explanation: 'Explain briefly', blank: 'Fill in the blank' };
  const N = { easy: 8, medium: 10, hard: 12 }[level];
  const pool = D.ids.filter(x => x.q && x.a).concat(D.blanks.map(b => ({ kind: 'blank', q: b.s, a: b.a, topic: b.topic })));
  const qs = take(pool, N, x => x.q);
  if (qs.length < 3) { $('board').innerHTML = '<div class="card">Not enough questions. Click New file and Analyze again.</div>'; return; }
  const pass = Math.round({ easy: .6, medium: .7, hard: .8 }[level] * 100);   // passing score out of 100
  const H = 1600;
  let w = '<div class="grnd"></div><div class="road2"></div>';
  ['🏠', '🌳', '🏢', '🌳', '🏫', '🏠', '🌳', '🏢'].forEach((e, k) => w += `<span class="it" style="left:${k * 12 + 3}%;bottom:50px;font-size:38px">${e}</span>`);
  for (let k = 0; k < 10; k++) w += `<span class="it" style="left:${Math.random() * 90}%;bottom:${260 + Math.random() * 800}px;font-size:${30 + Math.random() * 26}px;opacity:${k > 6 ? .4 : 1}">☁️</span>`;
  for (let k = 0; k < 4; k++) w += `<span class="it bird" style="left:${Math.random() * 70}%;bottom:${320 + Math.random() * 300}px;font-size:24px">🐦</span>`;
  for (let k = 0; k < 60; k++) w += `<i class="star" style="left:${Math.random() * 100}%;bottom:${1080 + Math.random() * 500}px"></i>`;
  w += '<span class="it" style="left:15%;bottom:1250px;font-size:46px">🪐</span><span class="it" style="left:72%;bottom:1400px;font-size:40px">🌙</span><span class="it" style="left:42%;bottom:1510px;font-size:34px">🌍</span>';
  $('board').innerHTML = `<div class="card"><div class="hud"><span id="stg">🌍 Earth</span><span>⭐ <b id="sc">0</b>/${qs.length}</span><span>🚀 <b id="spd">1.0</b>x</span></div>
    <div class="sky"><div id="world" style="height:${H}px">${w}</div><div id="rocket">🚀</div></div><div id="qa"></div></div>`;
  const rocket = $('rocket');
  let alt = 0, i = 0, right = 0, sp = 1, bad = [];
  const setAlt = a => {
    alt = a;
    $('world').style.transform = `translateY(${a * (H - 320)}px)`;   // world scrolls down = rocket goes up
    $('stg').textContent = a < .18 ? '🌍 Earth' : a < .45 ? '☁️ Lower Atmosphere' : a < .7 ? '🌤 Upper Atmosphere' : '🌌 Outer Space';
  };
  const fly = (to, secs, cb) => {
    const from = alt, t0 = Date.now();
    rocket.classList.add('burn');
    const iv = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 1000 / secs);
      setAlt(from + (to - from) * k);
      if (k >= 1) { clearInterval(iv); rocket.classList.remove('burn'); cb(); }
    }, 40);
    timers.push(iv);
  };
  const end = () => {
    const score = Math.round(right / qs.length * 100), ok = score >= pass;
    const show = () => {
      addWeak(bad);
      const wk = [...new Set(bad.filter(Boolean))];
      $('board').innerHTML = `<div class="card center">${ok ? '<div class="trophy">🏆</div>' : '<div class="big">💥</div>'}
        <h2>SPACE LAUNCH RESULTS</h2><p class="tag">Your Score</p><p class="big">${score}/100</p><p class="tag">Passing Score</p><p class="big">${pass}/100</p>
        <h2 class="${ok ? 'good' : 'badc'}">${ok ? 'MISSION SUCCESSFUL' : 'MISSION FAILED'}</h2>
        <p>🎯 Accuracy ${score}% · ✔ ${right}/${qs.length} correct</p>
        <p>${wk.length ? '⚠ Needs review: <b>' + wk.map(esc).join(', ') + '</b>' : '✅ No weak topics!'}</p>
        <button onclick="startGame('space')">${ok ? 'Launch again' : 'Try again'}</button></div>`;
      if (ok) confetti();
    };
    if (ok) fly(1, 3, show);
    else { rocket.textContent = '💥'; rocket.classList.add('boom'); timers.push(setTimeout(show, 1800)); }
  };
  const ask = () => {
    if (i >= qs.length) return end();
    const q = qs[i];
    $('qa').innerHTML = `<p class="tag">🛰 Checkpoint ${i + 1}/${qs.length} · ${KIND[q.kind] || 'Answer'}</p><h3>${esc(q.q)}</h3>
      <div class="row"><input id="ans" autocomplete="off" placeholder="Type your answer"><button id="ok">Launch ▶</button></div><p id="fb"></p>`;
    $('ans').focus();
    const submit = () => {
      const v = $('ans').value.trim();
      if (!v) { $('ans').classList.add('shk'); setTimeout(() => $('ans')?.classList.remove('shk'), 400); return; }   // must answer
      $('ok').disabled = true; $('ans').disabled = true;
      const good = check(v, q.a), next = () => { i++; ask(); };
      if (good) { right++; sp = Math.min(2.5, sp + .3); } else { sp = Math.max(.5, sp - .5); bad.push(q.topic); }
      $('sc').textContent = right; $('spd').textContent = sp.toFixed(1);
      $('fb').innerHTML = good ? '✅ Correct! Engines accelerating...' : `❌ Not quite. Answer: <b>${esc(q.a.replace(/;/g, ','))}</b>. Slowing down...`;
      if (good) fly(right / qs.length, 2.5 / sp, next);
      else { rocket.classList.add('slow'); timers.push(setTimeout(() => { rocket.classList.remove('slow'); next(); }, 2400)); }
    };
    $('ok').onclick = submit;
    $('ans').onkeydown = e => { if (e.key === 'Enter') submit(); };
  };
  setAlt(0);
  ask();
};