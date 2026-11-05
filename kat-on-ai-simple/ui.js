// UI layer only: shows the selected game's name at the top. Does not touch game logic.
const GAME_NAMES = { space: '🚀 Space Launch Challenge', race: '🏎️ Fast Type Race', quiz: '🅰️ AI Quiz', battle: '⚔️ Quiz Battle', search: '🔎 Word Search', memory: '🧠 Memory Test', match: '🧩 Match-It', blank: '✏️ Missing Word', tf: '✅ True or False' };
const _startGame = startGame;
startGame = function (n) { _startGame(n); $('gtitle').textContent = GAME_NAMES[n] || ''; };