// AI Quiz (Kahoot style). You + up to 3 bots. Points only go UP. Faster answer = more points.
GAMES.quiz = function () {
  const qs = D.quiz.map(q => ({ ...q, choices: q.choices.slice(0, 4) }));
  if (!qs.length) { $('board').innerHTML = '<div class="card">No quiz questions. Click New file and Analyze again.</div>'; return; }
  $('board').innerHTML = `<div class="card center"><h2>🅰️ AI Quiz</h2><p class="tag">How many players? (you + bots)</p>
    <div class="row c">${[1, 2, 3, 4].map(n => `<button class="pick" data-n="${n}">${n === 1 ? '🙋 Solo' : '👥 ' + n + ' players'}</button>`).join('')}</div></div>`;
  document.querySelectorAll('.pick').forEach(b => b.onclick = () => play(+b.dataset.n));

  function play(n) {
    const acc = { easy: .55, medium: .7, hard: .85 }[level], T = { easy: 20, medium: 15, hard: 10 }[level], shapes = ['▲', '◆', '●', '■'];
    const P = ['You', 'Bot A', 'Bot B', 'Bot C'].slice(0, n).map((nm, i) => ({ nm, pts: 0, add: 0, me: i === 0 }));
    let i = 0, left = 0, bad = [];
    const lb = () => [...P].sort((a, b) => b.pts - a.pts)
      .map(p => `<div class="lb"><span>${p.me ? '🙋' : '🤖'} ${p.nm}</span><b>${p.pts}</b>${p.add ? `<em>+${p.add}</em>` : ''}</div>`).join('');
    const ask = () => {
      clearTimers();
      if (i >= qs.length) return podium();
      const q = qs[i]; left = T;
      $('board').innerHTML = `<div class="card"><div class="tbar"><i style="animation-duration:${T}s"></i></div>
        <p class="tag">Question ${i + 1}/${qs.length} · ⏱ <b id="t">${left}</b>s</p><h3>${esc(q.q)}</h3>
        <div class="abcd">${q.choices.map((c, k) => `<button class="ans a${k}" data-n="${k}"><b>${shapes[k]}</b> ${esc(c)}</button>`).join('')}</div></div>`;
      document.querySelectorAll('.ans').forEach(b => b.onclick = () => pick(+b.dataset.n));
      timers.push(setInterval(() => { $('t').textContent = --left; if (left <= 0) pick(-1); }, 1000));
    };
    const pick = k => {
      clearTimers();
      const q = qs[i], ok = k === q.answer;
      if (!ok) bad.push(q.topic);
      P.forEach(p => {
        p.add = p.me ? (ok ? Math.round(500 + 500 * left / T) : 0) : (Math.random() < acc ? Math.round(500 + 500 * Math.random()) : 0);
        p.pts += p.add;
      });
      document.querySelectorAll('.ans').forEach((b, x) => {
        b.disabled = true; b.classList.add(x === q.answer ? 'ok' : 'dim');
        if (x === k && !ok) b.classList.add('no');
      });
      document.querySelector('#board .card').insertAdjacentHTML('beforeend', `<div class="lbs">${lb()}</div>`);
      timers.push(setTimeout(() => { i++; ask(); }, 2000));
    };
    const podium = () => {
      addWeak(bad);
      const r = [...P].sort((a, b) => b.pts - a.pts), medal = ['🥇', '🥈', '🥉', '4️⃣'];
      $('board').innerHTML = `<div class="card center"><div class="trophy">🏆</div>
        <h2>${n === 1 ? 'Quiz complete!' : r[0].me ? 'You win!' : r[0].nm + ' wins!'}</h2>
        <div class="podium">${r.map((p, x) => `<div class="pl"><div class="av">${p.me ? '🙋' : '🤖'}</div><b>${p.nm}</b>
          <div class="step s${x}" style="--d:${x * .3}s">${medal[x]}<br>${p.pts}</div></div>`).join('')}</div>
        <p>${bad.length ? '⚠ Needs review: <b>' + [...new Set(bad)].map(esc).join(', ') + '</b>' : '✅ No weak topics!'}</p>
        <button onclick="startGame('quiz')">Play again</button></div>`;
      confetti();
    };
    ask();
  }
};