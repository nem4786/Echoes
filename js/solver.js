/*
 * Echoes — breadth-first solver. Uses only the pure engine (no DOM).
 *
 * Key insight that keeps the search finite: echoes only ever read the last
 * maxN entries of the history, and an echo that is "still charging" behaves
 * exactly like one replaying WAIT. So a search state is
 *     player pos + echo positions + last maxN actions (padded with 'W')
 * and the turn counter can be dropped.
 */
(function (root) {
  'use strict';
  var E = (root.Echoes = root.Echoes || {});

  function normalize(level, s) {
    var m = level.maxN;
    var h = s.history.slice(Math.max(0, s.history.length - m));
    while (h.length < m) h.unshift('W');
    return { turn: m, px: s.px, py: s.py, echoes: s.echoes, history: h, won: s.won, last: null };
  }

  function keyOf(s) {
    var k = s.px + ',' + s.py;
    for (var i = 0; i < s.echoes.length; i++) k += '|' + s.echoes[i].x + ',' + s.echoes[i].y;
    return k + '|' + s.history.join('');
  }

  /**
   * solve(level, opts) -> { solved, solution, length, explored, capped }
   * opts.noWait   : forbid the WAIT action
   * opts.noBump   : forbid moves that bump (player doesn't move)
   * opts.maxStates: safety cap (default 2,000,000)
   * opts.start    : optional state to search from (defaults to level start)
   */
  function solve(level, opts) {
    opts = opts || {};
    var maxStates = opts.maxStates || 2000000;
    var actions = E.ACTIONS.filter(function (a) { return !(opts.noWait && a === 'W'); });

    var start = normalize(level, opts.start || E.initialState(level));
    var startKey = keyOf(start);
    var parent = new Map();
    parent.set(startKey, null);
    var queue = [start], keys = [startKey];
    var head = 0;

    function path(key) {
      var out = [];
      while (true) {
        var p = parent.get(key);
        if (!p) break;
        out.push(p.a);
        key = p.k;
      }
      return out.reverse().join('');
    }

    if (start.won) return { solved: true, solution: '', length: 0, explored: 1, capped: false };

    while (head < queue.length) {
      var s = queue[head], sk = keys[head];
      head++;
      for (var ai = 0; ai < actions.length; ai++) {
        var a = actions[ai];
        var n = E.step(level, s, a);
        if (opts.noBump && a !== 'W' && n.last.player.blocked) continue;
        n = normalize(level, n);
        var nk = keyOf(n);
        if (parent.has(nk)) continue;
        parent.set(nk, { k: sk, a: a });
        if (n.won) {
          var sol = path(nk);
          return { solved: true, solution: sol, length: sol.length, explored: parent.size, capped: false };
        }
        if (parent.size >= maxStates) {
          return { solved: false, solution: null, length: -1, explored: parent.size, capped: true };
        }
        queue.push(n); keys.push(nk);
      }
      // free memory as we go
      queue[head - 1] = null;
    }
    return { solved: false, solution: null, length: -1, explored: parent.size, capped: false };
  }

  /**
   * Full report for one level: shortest solution, plus whether it is still
   * solvable without WAIT / without wall bumps (to verify the level actually
   * needs the mechanic it is meant to teach), and whether the designer's
   * intended solution (level.solution) works.
   */
  function analyze(level) {
    var t0 = Date.now();
    var best = solve(level);
    var noWait = solve(level, { noWait: true });
    var noBump = solve(level, { noBump: true });
    var noBoth = solve(level, { noWait: true, noBump: true });
    var intended = null;
    if (level.solution) {
      var end = E.replay(level, level.solution);
      intended = { ok: end.won, length: level.solution.replace(/[ ,]/g, '').length };
    }
    return {
      name: level.name,
      best: best,
      noWait: noWait,
      noBump: noBump,
      noBoth: noBoth,
      intended: intended,
      ms: Date.now() - t0
    };
  }

  E.solve = solve;
  E.analyze = analyze;
})(typeof window !== 'undefined' ? window : globalThis);
