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

  // Compact key: one char per position (cell index) + the last maxN actions.
  function makeCodec(level) {
    var W = level.width, m = level.maxN, starts = level.start.echoes, ne = starts.length;
    return {
      encode: function (s) {
        var k = String.fromCharCode(s.py * W + s.px);
        for (var i = 0; i < ne; i++) k += String.fromCharCode(s.echoes[i].y * W + s.echoes[i].x);
        var h = s.history, L = h.length;
        for (var j = m; j >= 1; j--) k += L - j >= 0 ? h[L - j] : 'W';
        return k;
      },
      decode: function (k) {
        var c = k.charCodeAt(0);
        var s = { turn: m, px: c % W, py: (c / W) | 0, echoes: new Array(ne), history: null, won: false, last: null };
        for (var i = 0; i < ne; i++) {
          c = k.charCodeAt(1 + i);
          s.echoes[i] = { n: starts[i].n, x: c % W, y: (c / W) | 0 };
        }
        s.history = k.slice(1 + ne).split('');
        return s;
      }
    };
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

    var codec = makeCodec(level);
    var start = opts.start || E.initialState(level);
    if (start.won) return { solved: true, solution: '', length: 0, explored: 1, capped: false };

    // ids are assigned in BFS order, so keys[] doubles as the queue
    var ids = new Map(), keys = [], parent = [], via = [];
    var k0 = codec.encode(start);
    ids.set(k0, 0); keys.push(k0); parent.push(-1); via.push('');

    function path(id) {
      var out = [];
      while (parent[id] >= 0) { out.push(via[id]); id = parent[id]; }
      return out.reverse().join('');
    }

    for (var head = 0; head < keys.length; head++) {
      var s = codec.decode(keys[head]);
      for (var ai = 0; ai < actions.length; ai++) {
        var a = actions[ai];
        var n = E.step(level, s, a);
        if (opts.noBump && a !== 'W' && n.last.player.blocked) continue;
        var nk = codec.encode(n);
        if (ids.has(nk)) continue;
        var id = keys.length;
        ids.set(nk, id); keys.push(nk); parent.push(head); via.push(a);
        if (n.won) {
          var sol = path(id);
          return { solved: true, solution: sol, length: sol.length, explored: keys.length, capped: false };
        }
        if (keys.length >= maxStates) {
          return { solved: false, solution: null, length: -1, explored: keys.length, capped: true };
        }
      }
    }
    return { solved: false, solution: null, length: -1, explored: keys.length, capped: false };
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
