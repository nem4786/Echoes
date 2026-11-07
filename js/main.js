/*
 * Echoes — browser glue: input, undo stack, HUD, dev tools.
 * All game rules live in engine.js; this file only calls Echoes.step().
 */
(function () {
  'use strict';
  var E = window.Echoes;
  var ANIM_MS = 130;
  var STORE_KEY = 'echoes.proto.v1';

  // ---- DOM ----
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('board'), ctx = canvas.getContext('2d');
  var stage = $('stage');

  // ---- persistent progress (best turns per level) ----
  var progress = { best: {}, current: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') progress = { best: saved.best || {}, current: saved.current || 0 };
  } catch (e) { /* storage unavailable: play without saving */ }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { }
  }

  // ---- levels ----
  var levels = [], loadError = null;
  try {
    levels = ECHOES_LEVELS.map(function (def) { return E.parseLevel(def); });
  } catch (err) {
    loadError = err.message;
  }

  // ---- game state ----
  var game = {
    index: 0,
    level: null,
    stack: [],          // undo stack of immutable states
    animStart: 0,
    winShown: false,
    lastSolution: null, // from the dev solver
    playTimer: null
  };

  function current() { return game.stack[game.stack.length - 1]; }

  function loadLevel(i) {
    stopPlayback();
    game.index = Math.max(0, Math.min(levels.length - 1, i));
    game.level = levels[game.index];
    game.stack = [E.initialState(game.level)];
    game.animStart = 0;
    game.winShown = false;
    game.lastSolution = null;
    $('playSolBtn').disabled = true;
    $('winOverlay').classList.add('hidden');
    progress.current = game.index;
    save();
    layout();
    refreshHUD();
  }

  function act(a) {
    var s = current();
    if (s.won) return;
    var n = E.step(game.level, s, a);
    game.stack.push(n);
    game.animStart = performance.now();
    refreshHUD();
    if (n.won) setTimeout(showWin, ANIM_MS + 60);
  }

  function undo() {
    stopPlayback();
    if (game.stack.length > 1) game.stack.pop();
    game.animStart = 0;
    game.winShown = false;
    $('winOverlay').classList.add('hidden');
    refreshHUD();
  }

  function restart() {
    stopPlayback();
    // Restart is itself undoable: Z after R brings you back.
    if (current().turn !== 0) game.stack.push(E.initialState(game.level));
    game.animStart = 0;
    game.winShown = false;
    $('winOverlay').classList.add('hidden');
    refreshHUD();
  }

  function showWin() {
    var s = current();
    if (!s.won || game.winShown) return;
    game.winShown = true;
    var name = game.level.name;
    var prev = progress.best[name];
    if (!prev || s.turn < prev) progress.best[name] = s.turn;
    save();
    var parTxt = game.level.solution ? ' · designer: ' + game.level.solution.length : '';
    $('winStats').textContent = 'Turns: ' + s.turn + ' · best: ' + progress.best[name] + parTxt;
    $('nextBtn').textContent = game.index < levels.length - 1 ? 'Next level ⏎' : 'Back to level 1 ⏎';
    $('winOverlay').classList.remove('hidden');
    buildLevelBar();
  }

  function nextLevel() {
    loadLevel(game.index < levels.length - 1 ? game.index + 1 : 0);
  }

  // ---- HUD ----
  var ARROW = { U: '↑', D: '↓', L: '←', R: '→', W: '·' };

  function buildLevelBar() {
    var bar = $('levelBar');
    bar.innerHTML = '';
    levels.forEach(function (lvl, i) {
      var b = document.createElement('button');
      b.textContent = (i + 1) + (progress.best[lvl.name] ? ' ✓' : '');
      b.title = lvl.name + (progress.best[lvl.name] ? ' — best ' + progress.best[lvl.name] + ' turns' : '');
      if (progress.best[lvl.name]) b.classList.add('solved');
      if (i === game.index) b.classList.add('current');
      b.addEventListener('click', function () { loadLevel(i); });
      bar.appendChild(b);
    });
  }

  function refreshHUD() {
    var s = current();
    $('levelName').textContent = (game.index + 1) + '. ' + game.level.name;
    $('turnCount').textContent = s.turn;
    buildLevelBar();
    renderHistory();
  }

  function renderHistory() {
    var s = current();
    var strip = $('historyStrip');
    strip.innerHTML = '';
    var cellW = 38;
    var maxCells = Math.max(4, Math.floor((strip.clientWidth - 12) / cellW));

    // Which history index each echo will replay next turn.
    var tags = {}; // index -> [n...]
    var charging = [];
    s.echoes.forEach(function (e, i) {
      var idx = E.nextEchoHistoryIndex(s, i);
      if (idx < 0) charging.push(e.n);
      else (tags[idx] = tags[idx] || []).push(e.n);
    });

    var slots = maxCells - (charging.length ? 1 : 0);
    var start = Math.max(0, s.history.length - slots);

    function tagEl(n, text) {
      var t = document.createElement('span');
      t.className = 'htag';
      t.style.background = E.Render.echoAccent(n);
      t.textContent = text || String(n);
      return t;
    }

    if (charging.length) {
      var c = document.createElement('div'); c.className = 'hcell';
      var m = document.createElement('div'); m.className = 'hmove pending'; m.textContent = 'wait';
      m.title = 'Echoes that have not started yet (they wait until N turns have passed)';
      var tg = document.createElement('div'); tg.className = 'htags';
      charging.sort().forEach(function (n) { tg.appendChild(tagEl(n)); });
      var tn = document.createElement('div'); tn.className = 'hturn'; tn.textContent = '—';
      c.appendChild(m); c.appendChild(tn); c.appendChild(tg);
      strip.appendChild(c);
    }

    // bump flags come from the undo stack (state k carries how turn k went)
    var top = game.stack.length - 1;
    for (var k = start; k < s.history.length; k++) {
      var a = s.history[k];
      var st = game.stack[top - (s.history.length - 1 - k)];
      var bumped = st && st.last && st.last.player.blocked;
      var cell = document.createElement('div'); cell.className = 'hcell';
      var mv = document.createElement('div');
      mv.className = 'hmove' + (a === 'W' ? ' wait' : '') + (bumped ? ' bump' : '') + (k === s.history.length - 1 ? ' latest' : '');
      mv.textContent = ARROW[a];
      mv.title = 'Turn ' + (k + 1) + ': ' + ({ U: 'up', D: 'down', L: 'left', R: 'right', W: 'wait' })[a] + (bumped ? ' (bumped)' : '');
      var turn = document.createElement('div'); turn.className = 'hturn'; turn.textContent = k + 1;
      var tgs = document.createElement('div'); tgs.className = 'htags';
      (tags[k] || []).sort().forEach(function (n) { tgs.appendChild(tagEl(n)); });
      cell.appendChild(mv); cell.appendChild(turn); cell.appendChild(tgs);
      strip.appendChild(cell);
    }
    if (!s.history.length && !charging.length) {
      var em = document.createElement('div'); em.className = 'history-empty'; em.textContent = 'No moves yet.';
      strip.appendChild(em);
    }
  }

  // ---- canvas layout & loop ----
  var view = { tile: 48, ox: 0, oy: 0 };
  function layout() {
    if (!game.level) return;
    var lvl = game.level;
    var maxW = Math.min(stage.clientWidth || 720, 720);
    var maxH = Math.max(220, Math.min(window.innerHeight * 0.62, 680));
    var tile = Math.floor(Math.min(maxW / lvl.width, maxH / lvl.height, 72));
    var dpr = window.devicePixelRatio || 1;
    var w = tile * lvl.width, h = tile * lvl.height;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.tile = tile * dpr;
    view.ox = 0; view.oy = 0;
    renderHistory();
  }

  function frame(now) {
    if (game.level) {
      var t = game.animStart ? (now - game.animStart) / ANIM_MS : 1;
      E.Render.draw(ctx, game.level, current(), { tile: view.tile, ox: view.ox, oy: view.oy, t: Math.min(1, t), time: now });
    }
    requestAnimationFrame(frame);
  }

  // ---- input ----
  var KEYMAP = {
    ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
    w: 'U', s: 'D', a: 'L', d: 'R', W: 'U', S: 'D', A: 'L', D: 'R',
    ' ': 'W'
  };
  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (!game.level) return;
    var k = e.key;
    if (KEYMAP[k]) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) return;
      stopPlayback();
      act(KEYMAP[k]);
    } else if (k === 'z' || k === 'Z' || k === 'Backspace') {
      e.preventDefault(); undo();
    } else if (k === 'r' || k === 'R') {
      if (e.ctrlKey || e.metaKey) return; // let the browser reload
      e.preventDefault(); restart();
    } else if ((k === 'Enter' || k === 'n' || k === 'N') && current().won) {
      e.preventDefault(); nextLevel();
    }
  });

  document.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('click', function () { stopPlayback(); act(btn.getAttribute('data-act')); btn.blur(); });
  });
  $('undoBtn').addEventListener('click', function () { undo(); this.blur(); });
  $('restartBtn').addEventListener('click', function () { restart(); this.blur(); });
  $('nextBtn').addEventListener('click', nextLevel);

  // swipe on the board
  var swipe = null;
  canvas.addEventListener('pointerdown', function (e) { swipe = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', function (e) {
    if (!swipe) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // a tap does nothing
    stopPlayback();
    if (Math.abs(dx) > Math.abs(dy)) act(dx > 0 ? 'R' : 'L');
    else act(dy > 0 ? 'D' : 'U');
  });
  canvas.addEventListener('pointercancel', function () { swipe = null; });

  window.addEventListener('resize', layout);

  // ---- dev tools ----
  var out = $('devOut');
  function fmtResult(r) {
    if (r.solved) return r.length + ' moves: ' + r.solution;
    return r.capped ? 'gave up (state cap reached)' : 'UNSOLVABLE';
  }

  function stopPlayback() {
    if (game.playTimer) { clearInterval(game.playTimer); game.playTimer = null; }
  }

  // Runs the variants one at a time so the page can repaint between them
  // (the biggest levels explore a few hundred thousand states per search).
  $('solveBtn').addEventListener('click', function () {
    var lvl = game.level, def = ECHOES_LEVELS[game.index];
    var lines = [lvl.name, '  shortest       solving…'];
    out.textContent = lines.join('\n');
    var t0 = Date.now(), best = null;
    var steps = [
      ['shortest      ', {}],
      ['without WAIT  ', { noWait: true }],
      ['without bumps ', { noBump: true }],
      ['neither       ', { noWait: true, noBump: true }]
    ];
    var i = 0;
    function run() {
      if (game.level !== lvl) return; // level changed meanwhile
      var r = E.solve(lvl, steps[i][1]);
      lines[1 + i] = '  ' + steps[i][0] + ' ' + fmtResult(r);
      if (i === 0) {
        best = r;
        lines[0] = lvl.name + '  (' + r.explored + ' states)';
        game.lastSolution = { from: 'start', actions: r.solution };
        $('playSolBtn').disabled = !r.solved;
      }
      i++;
      if (i < steps.length) {
        lines[1 + i] = '  ' + steps[i][0] + ' solving…';
        out.textContent = lines.join('\n');
        setTimeout(run, 15);
        return;
      }
      if (lvl.solution) {
        var ok = E.replay(lvl, lvl.solution).won;
        lines.push('  intended       ' + (ok ? 'works' : 'BROKEN') + ', ' + lvl.solution.length + ' moves' +
          (best.solved && lvl.solution.length > best.length ? '  ← solver found something shorter!' : ''));
      }
      lines.push('  (' + (Date.now() - t0) + ' ms)');
      if (def.note) lines.push('', 'Note: ' + def.note);
      out.textContent = lines.join('\n');
    }
    setTimeout(run, 20);
  });

  $('hintBtn').addEventListener('click', function () {
    var s = current();
    if (s.won) { out.textContent = 'Already solved.'; return; }
    out.textContent = 'Solving from turn ' + s.turn + '…';
    setTimeout(function () {
      var r = E.solve(game.level, { start: s });
      game.lastSolution = r.solved ? { from: 'here', actions: r.solution } : null;
      $('playSolBtn').disabled = !r.solved;
      out.textContent = 'From the current state: ' + fmtResult(r) + '  (' + r.explored + ' states)' +
        (r.solved ? '' : '\nThis position is a dead end — undo or restart.');
    }, 20);
  });

  $('playSolBtn').addEventListener('click', function () {
    if (!game.lastSolution) return;
    stopPlayback();
    if (game.lastSolution.from === 'start') restart();
    var acts = game.lastSolution.actions.split('');
    var i = 0;
    game.playTimer = setInterval(function () {
      if (i >= acts.length || current().won) { stopPlayback(); return; }
      act(acts[i++]);
    }, 260);
  });

  $('checkAllBtn').addEventListener('click', function () {
    var lines = ['Checking ' + levels.length + ' levels…'];
    out.textContent = lines.join('\n');
    var i = 0, problems = 0;
    function next() {
      if (i >= levels.length) {
        lines[0] = problems ? problems + ' PROBLEM(S) FOUND' : 'All ' + levels.length + ' levels solvable.';
        out.textContent = lines.join('\n');
        return;
      }
      // Shortest + intended only, to keep this quick; "Solve this level"
      // (or `node tools/check-levels.js`) gives the WAIT/bump variants.
      var lvl = levels[i];
      var best = E.solve(lvl);
      var intended = lvl.solution ? { ok: E.replay(lvl, lvl.solution).won, length: lvl.solution.length } : null;
      var flag = '';
      if (!best.solved) { flag = '  ✗ unsolvable'; problems++; }
      else if (intended && !intended.ok) { flag = '  ✗ intended solution broken'; problems++; }
      else if (intended && intended.length > best.length) flag = '  ⚠ shorter than intended';
      lines.push(
        (i + 1) + '. ' + lvl.name + flag,
        '   shortest ' + fmtResult(best) + (intended ? '  · intended ' + intended.length + (intended.ok ? '' : ' (broken)') : '')
      );
      out.textContent = lines.join('\n');
      i++;
      setTimeout(next, 10);
    }
    setTimeout(next, 20);
  });

  // ---- boot ----
  if (loadError) {
    var box = $('errorBox');
    box.textContent = 'Could not load levels:\n\n' + loadError + '\n\nFix js/levels.js and reload.';
    box.classList.remove('hidden');
    canvas.width = 600; canvas.height = 300; canvas.style.width = '100%'; canvas.style.height = '300px';
    return;
  }
  loadLevel(Math.min(progress.current || 0, levels.length - 1));
  requestAnimationFrame(frame);
})();
