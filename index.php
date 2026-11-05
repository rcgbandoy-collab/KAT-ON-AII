<?php require 'config.php'; $ready = GROQ_API_KEY !== 'PASTE_YOUR_KEY_HERE'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KAT-ON-AI</title>
<link rel="stylesheet" href="style.css?v=2">
<link rel="stylesheet" href="games.css?v=2">
</head>
<body>
<header>
  <div class="mascot">🐱</div>
  <h1>KAT-ON-AI</h1>
  <p>UPLOAD · PLAY · LEARN</p>
</header>
<main>
  <?php if (!$ready): ?>
    <p class="warn">⚠ Open config.php and paste your Groq key first.</p>
  <?php endif; ?>

  <section id="upload" class="card">
    <h2>📂 1. Upload your learning material</h2>
    <p><input type="file" id="file" accept=".txt,.docx,.pptx"></p>
    <p class="tag">TXT · DOCX · PPTX. For a PDF, paste the text below instead.</p>
    <textarea id="pasted" placeholder="...or paste your text here"></textarea>
    <div class="row">
      <select id="level" style="width:auto">
        <option value="easy">🟢 Easy</option>
        <option value="medium">🟡 Medium</option>
        <option value="hard">🔴 Hard</option>
      </select>
      <button id="go">Analyze ✨</button>
    </div>
    <p id="msg" class="tag"></p>
  </section>

  <section id="menu" hidden>
    <div id="weak"></div>
    <h2>🎮 2. Choose a game</h2>
    <div class="games">
      <button class="gcard wide" onclick="startGame('space')"><span>🚀</span><b>Space Launch Challenge</b><small>Answer questions to fly from Earth to outer space</small></button>
      <button class="gcard" onclick="startGame('race')"><span>🏎️</span><b>Fast Type Race</b><small>Solo or vs a Bot</small></button>
      <button class="gcard" onclick="startGame('quiz')"><span>🅰️</span><b>AI Quiz</b><small>Solo or vs bots</small></button>
      <button class="gcard" onclick="startGame('battle')"><span>⚔️</span><b>Quiz Battle</b><small>Point Clash vs a Bot</small></button>
      <button class="gcard" onclick="startGame('search')"><span>🔎</span><b>Word Search</b><small>Find hidden keywords</small></button>
      <button class="gcard" onclick="startGame('memory')"><span>🧠</span><b>Memory Test</b><small>Match term and meaning</small></button>
      <button class="gcard" onclick="startGame('match')"><span>🧩</span><b>Match-It</b><small>Drag meanings to terms</small></button>
      <button class="gcard" onclick="startGame('blank')"><span>✏️</span><b>Missing Word</b><small>Type the missing keyword</small></button>
      <button class="gcard" onclick="startGame('tf')"><span>✅</span><b>True or False</b><small>Is the statement correct?</small></button>
    </div>
    <div class="card" id="reviewer"></div>
    <button class="alt" onclick="show('upload')">📁 New file</button>
  </section>

  <section id="game" hidden>
    <button class="alt" id="back">← Back to games</button>
    <h2 id="gtitle"></h2>
    <div id="board"></div>
  </section>
</main>
<script src="app.js"></script>
<script src="ui.js"></script>
<script src="games/space.js"></script>
<script src="games/race.js"></script>
<script src="games/quiz.js"></script>
<script src="games/battle.js?v=2"></script>
<script src="games/search.js"></script>
<script src="games/memory.js?v=2"></script>
<script src="games/match.js"></script>
<script src="games/blank.js"></script>
<script src="games/tf.js"></script>
</body>
</html>