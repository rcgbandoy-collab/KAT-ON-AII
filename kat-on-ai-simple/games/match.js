// Match-It: drag each meaning onto its term (or tap the meaning, then tap the term).
GAMES.match = function () {
  const n = { easy: 4, medium: 6, hard: 8 }[level];
  const ks = take(D.keywords, n, k => k.term);
  let sel = null, done = 0, mistakes = 0, wrong = [];
  $('board').innerHTML = `<div class="card"><p class="tag">Drag each meaning onto its term, or tap a meaning then tap a term. Matched: <b id="mm">0</b>/${ks.length} · Mistakes: <b id="mx">0</b></p>
    <div class="slots">${ks.map((k, i) => `<div class="slot" data-i="${i}"><b>${esc(k.term)}</b><br><span></span></div>`).join('')}</div>
    <div class="pool">${shuffle(ks.map((k, i) => ({ k, i }))).map(({ k, i }) => `<div class="drag" draggable="true" data-i="${i}">${esc(k.definition)}</div>`).join('')}</div></div>`;
  const place = (slot, chip) => {
    if (!slot || !chip || slot.classList.contains('ok')) return;
    if (slot.dataset.i === chip.dataset.i) {
      slot.querySelector('span').textContent = chip.textContent;
      slot.classList.add('ok'); chip.remove(); sel = null; done++;
      $('mm').textContent = done;
      if (done === ks.length) timers.push(setTimeout(() => result('match', `${ks.length} matched · ${mistakes} mistakes`, wrong), 700));
    } else {
      mistakes++; $('mx').textContent = mistakes; wrong.push(ks[slot.dataset.i].topic);
      slot.classList.add('no'); setTimeout(() => slot.classList.remove('no'), 400);
    }
  };
  document.querySelectorAll('.drag').forEach(c => {
    c.ondragstart = e => e.dataTransfer.setData('t', c.dataset.i);
    c.onclick = () => { document.querySelectorAll('.drag').forEach(x => x.classList.remove('sel')); sel = c; c.classList.add('sel'); };
  });
  document.querySelectorAll('.slot').forEach(s => {
    s.ondragover = e => e.preventDefault();
    s.ondrop = e => { e.preventDefault(); place(s, document.querySelector(`.drag[data-i="${e.dataTransfer.getData('t')}"]`)); };
    s.onclick = () => place(s, sel);
  });
};