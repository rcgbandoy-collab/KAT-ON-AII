// Memory Test: real cards. Flip two; a term and its meaning make a pair.
GAMES.memory = function () {
  const n = { easy: 4, medium: 6, hard: 8 }[level];
  const ks = take(D.keywords, n, k => k.term);
  const cards = shuffle(ks.flatMap(k => [
    { id: k.term, t: k.term, topic: k.topic, kind: 'term' },
    { id: k.term, t: k.definition, topic: k.topic, kind: 'def' }]));
  let open = [], matched = 0, mistakes = 0, wrong = [], lock = false;
  $('board').innerHTML = `<div class="card"><p class="tag">Flip two cards: match each term with its meaning. Pairs: <b id="p">0</b>/${ks.length} · Mistakes: <b id="m">0</b></p>
    <div class="mem">${cards.map((c, i) => `<div class="mcard" data-i="${i}"><div class="mface mback">🐱</div><div class="mface mfront ${c.kind}">${esc(c.t)}</div></div>`).join('')}</div></div>`;
  document.querySelectorAll('.mcard').forEach(el => el.onclick = () => {
    if (lock || el.classList.contains('up')) return;
    const c = cards[el.dataset.i];
    el.classList.add('up'); open.push([el, c]);
    if (open.length < 2) return;
    const [[e1, c1], [e2, c2]] = open; open = [];
    if (c1.id === c2.id) {
      matched++; $('p').textContent = matched;
      timers.push(setTimeout(() => [e1, e2].forEach(x => x.classList.add('match')), 450));
      if (matched === ks.length) timers.push(setTimeout(() => result('memory', `${ks.length} pairs · ${mistakes} mistakes`, wrong), 1500));
    } else {
      mistakes++; $('m').textContent = mistakes; wrong.push(c1.topic, c2.topic); lock = true;
      timers.push(setTimeout(() => { [e1, e2].forEach(x => x.classList.remove('up')); lock = false; }, 1100));
    }
  });
};