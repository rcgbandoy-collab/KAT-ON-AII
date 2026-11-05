// True or False: statements made from your material.
GAMES.tf = function () {
  const qs = take(D.tf, { easy: 6, medium: 8, hard: 10 }[level], t => t.s);
  if (!qs.length) { $('board').innerHTML = '<div class="card">No statements yet. Click New file and Analyze again.</div>'; return; }
  let i = 0, right = 0, bad = [];
  const ask = () => {
    if (i >= qs.length) return result('tf', `${right} / ${qs.length} correct`, bad);
    const q = qs[i], truth = q.a === true || q.a === 'true';
    $('board').innerHTML = `<div class="card center"><p class="tag">Statement ${i + 1}/${qs.length}</p><h3>${esc(q.s)}</h3>
      <div class="row c"><button class="tfb a3" data-v="1">✅ True</button><button class="tfb a0" data-v="0">❌ False</button></div><p id="fb"></p></div>`;
    document.querySelectorAll('.tfb').forEach(b => b.onclick = () => {
      const good = (b.dataset.v === '1') === truth;
      document.querySelectorAll('.tfb').forEach(x => x.disabled = true);
      b.classList.add(good ? 'ok' : 'no');
      if (good) right++; else bad.push(q.topic);
      $('fb').textContent = good ? '🎉 Correct!' : `Oops! That statement is ${truth ? 'TRUE' : 'FALSE'}.`;
      timers.push(setTimeout(() => { i++; ask(); }, 1500));
    });
  };
  ask();
};