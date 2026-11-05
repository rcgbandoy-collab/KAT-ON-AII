// Quiz Battle "Point Clash": You vs a Bot. Both start with 100 points. Correct answers STEAL points.
//  - you right, bot wrong -> you steal 20      - you wrong, bot right -> bot steals 20
//  - both right -> the FASTER one steals 10    - both wrong -> nothing moves
GAMES.battle = function () {
  const qs = take(D.quiz, { easy: 8, medium: 10, hard: 12 }[level], q => q.q).map(prepQ);
  if (qs.length < 3) { $('board').innerHTML = '<div class="card">Not enough quiz questions. Click New file and Analyze again.</div>'; return; }
  pickColors(['You', 'Bot'], cs => play(cs[0], cs[1]), 'Quiz Battle: choose your color');

  function play(me, bot) {
    const acc = { easy: .55, medium: .7, hard: .85 }[level], T = { easy: 20, medium: 15, hard: 10 }[level];
    const STEAL = 20, BONUS = 10, shapes = ['▲', '◆', '●', '■'], C = [me, bot], pts = [100, 100], bad = [];
    let i = 0, left = T;
    const panel = (p, tag) => `<div class="bt-p" id="bp${p}" style="--c:${C[p].hex}"><small>${tag} · ${C[p].name}</small><b>${pts[p]}</b></div>`;
    const hud = () => `<div class="bt-hud">${panel(0, '🙋 You')}<span class="bt-vs">VS</span>${panel(1, '🤖 Bot')}</div>
      <div class="bt-bar"><i style="width:${pts[0] / (pts[0] + pts[1] || 1) * 100}%;background:${me.hex}"></i><i style="width:${pts[1] / (pts[0] + pts[1] || 1) * 100}%;background:${bot.hex}"></i></div>`;

    const ask = () => {
      clearTimers();
      if (i >= qs.length) return end();
      const q = qs[i]; left = T;
      $('board').innerHTML = `<div class="card"><div id="hud2">${hud()}</div>
        <div class="tbar"><i style="animation-duration:${T}s"></i></div>
        <p class="tag">Question ${i + 1}/${qs.length} · ⏱ <b id="t">${left}</b>s</p><h3>${esc(q.q)}</h3>
        <div class="abcd">${q.choices.map((c, k) => `<button class="ans a${k}" data-n="${k}"><b>${shapes[k]}</b> ${esc(c)}</button>`).join('')}</div>
        <p class="bt-msg" id="msg2"></p></div>`;
      document.querySelectorAll('.ans').forEach(b => b.onclick = () => pick(+b.dataset.n));
      timers.push(setInterval(() => { $('t').textContent = --left; if (left <= 0) pick(-1); }, 1000));
    };

    const pick = k => {
      clearTimers();
      const q = qs[i], ok = k === q.answer, used = T - left;
      const botOk = Math.random() < acc, botTime = 2 + Math.random() * T * .7;
      if (!ok) bad.push(q.topic);
      let w = -1, amt = 0;                               // w = who steals (0 you, 1 bot)
      if (ok && !botOk) { w = 0; amt = STEAL; }
      else if (!ok && botOk) { w = 1; amt = STEAL; }
      else if (ok && botOk) { w = used < botTime ? 0 : 1; amt = BONUS; }
      if (w >= 0) { amt = Math.min(amt, pts[1 - w]); pts[w] += amt; pts[1 - w] -= amt; }
      document.querySelectorAll('.ans').forEach((b, x) => {
        b.disabled = true; b.classList.add(x === q.answer ? 'ok' : 'dim');
        if (x === k && !ok) b.classList.add('no');
      });
      $('hud2').innerHTML = hud();
      if (w >= 0) $('bp' + (1 - w)).classList.add('hit');
      $('msg2').textContent = w < 0 ? '😬 Both missed. No points moved.'
        : `${w === 0 ? '🎯 You stole' : '🤖 Bot stole'} ${amt} points${ok && botOk ? ' (faster answer!)' : '!'}`;
      timers.push(setTimeout(() => { i++; ask(); }, 2200));
    };

    const end = () => {
      const win = pts[0] > pts[1], draw = pts[0] === pts[1];
      result('battle', `${me.name} ${pts[0]} – ${pts[1]} ${bot.name}`, bad,
        { ok: win, title: win ? 'You win the clash!' : draw ? "It's a draw" : 'Bot wins this time' });
    };
    ask();
  }
};