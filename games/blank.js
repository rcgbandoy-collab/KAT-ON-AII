// Missing Word Challenge: type the missing keyword (no choices).
GAMES.blank = function () {
  const qs = take(D.blanks, { easy: 5, medium: 7, hard: 9 }[level], b => b.s);
  if (!qs.length) { $('board').innerHTML = '<div class="card">No sentences yet. Click New file and Analyze again.</div>'; return; }
  let i = 0, right = 0, bad = [];
  const ask = () => {
    if (i >= qs.length) return result('blank', `${right} / ${qs.length} correct`, bad);
    const q = qs[i];
    $('board').innerHTML = `<div class="card"><p class="tag">Sentence ${i + 1}/${qs.length}</p>
      <h3>${esc(q.s).replace(/_{2,}/, '<span class="gap">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>')}</h3>
      <div class="row"><input id="ans" autocomplete="off" placeholder="Type the missing word"><button id="ok">Check</button></div><p id="fb"></p></div>`;
    $('ans').focus();
    const submit = () => {
      const v = $('ans').value.trim();
      if (!v) { $('ans').classList.add('shk'); setTimeout(() => $('ans')?.classList.remove('shk'), 400); return; }
      $('ok').disabled = true; $('ans').disabled = true;
      const good = check(v, q.a);
      if (good) right++; else bad.push(q.topic);
      $('fb').innerHTML = good ? '✅ Correct!' : `❌ The answer is <b>${esc(q.a)}</b>`;
      timers.push(setTimeout(() => { i++; ask(); }, 1600));
    };
    $('ok').onclick = submit;
    $('ans').onkeydown = e => { if (e.key === 'Enter') submit(); };
  };
  ask();
};