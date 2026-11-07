/*
 * Echoes — game logic.
 *
 * Pure functions only: no DOM, no globals touched except the Echoes namespace.
 * The core API is   Echoes.step(level, state, action) -> newState
 * States are never mutated; every step returns a fresh object, so an undo
 * stack is just an array of past states.
 *
 * Porting notes (Unity/C#): `level` is immutable data, `state` is a small
 * value type (turn, player pos, echo list, action history). Everything here
 * maps 1:1 onto plain classes + static methods.
 */
(function (root) {
  'use strict';
  var E = (root.Echoes = root.Echoes || {});

  // ---- Actions -------------------------------------------------------------
  var ACTIONS = ['U', 'D', 'L', 'R', 'W']; // W = wait
  var DELTA = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

  // ---- Cell types ----------------------------------------------------------
  var FLOOR = 0, WALL = 1, EXIT = 2, PLATE = 3, DOOR = 4;
  var GROUPS = 'abcd'; // plate letters; doors use the uppercase letter

  /**
   * Parse a level definition { name, map: [rows...], solution? } into
   * immutable level data. Throws a readable Error on malformed maps.
   *
   * Legend:  #  wall          .  floor (space also counts as floor)
   *          @  player start  E  exit
   *          1-9 echo block with that N
   *          a-d pressure plate (group)   A-D door opened by that group
   */
  function parseLevel(def) {
    var rows = def.map;
    var height = rows.length;
    var width = 0, x, y;
    for (y = 0; y < height; y++) width = Math.max(width, rows[y].length);

    var cells = new Array(width * height);
    var group = new Array(width * height);
    var plates = [], doors = [], echoes = [];
    var player = null, exit = null;
    var name = def.name || 'Untitled';

    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        var ch = rows[y][x];
        if (ch === undefined) ch = '#'; // ragged rows are padded with wall
        var i = y * width + x;
        cells[i] = FLOOR;
        group[i] = -1;
        if (ch === '#') cells[i] = WALL;
        else if (ch === '.' || ch === ' ') { /* floor */ }
        else if (ch === '@') {
          if (player) throw new Error(name + ': more than one player (@)');
          player = { x: x, y: y };
        } else if (ch === 'E') {
          if (exit) throw new Error(name + ': more than one exit (E)');
          cells[i] = EXIT;
          exit = { x: x, y: y };
        } else if (ch >= '1' && ch <= '9') {
          echoes.push({ n: ch.charCodeAt(0) - 48, x: x, y: y });
        } else if (GROUPS.indexOf(ch) >= 0) {
          cells[i] = PLATE;
          group[i] = GROUPS.indexOf(ch);
          plates.push({ x: x, y: y, group: group[i] });
        } else if (GROUPS.toUpperCase().indexOf(ch) >= 0) {
          cells[i] = DOOR;
          group[i] = GROUPS.toUpperCase().indexOf(ch);
          doors.push({ x: x, y: y, group: group[i] });
        } else {
          throw new Error(name + ': unknown map symbol "' + ch + '" at ' + x + ',' + y);
        }
      }
    }
    if (!player) throw new Error(name + ': no player (@)');
    if (!exit) throw new Error(name + ': no exit (E)');
    doors.forEach(function (d) {
      var has = plates.some(function (p) { return p.group === d.group; });
      if (!has) throw new Error(name + ': door ' + GROUPS[d.group].toUpperCase() + ' has no plate ' + GROUPS[d.group]);
    });

    var maxN = 0;
    echoes.forEach(function (e) { maxN = Math.max(maxN, e.n); });

    return {
      name: name,
      width: width,
      height: height,
      cells: cells,
      group: group,
      plates: plates,
      doors: doors,
      exit: exit,
      start: { player: player, echoes: echoes },
      maxN: maxN,
      solution: def.solution || null,
      par: def.par || null
    };
  }

  function initialState(level) {
    return {
      turn: 0,
      px: level.start.player.x,
      py: level.start.player.y,
      echoes: level.start.echoes.map(function (e) { return { n: e.n, x: e.x, y: e.y }; }),
      history: [],
      won: false,
      last: null // description of the most recent turn (for animation only)
    };
  }

  // ---- Occupancy helpers (work on a mutable "board" used inside one step) --

  function occupantAt(board, x, y) {
    if (board.px === x && board.py === y) return -1; // player
    for (var i = 0; i < board.echoes.length; i++) {
      if (board.echoes[i].x === x && board.echoes[i].y === y) return i;
    }
    return null;
  }

  // A plate counts as pressed if anything other than `moverId` stands on it.
  // (The mover is "lifted" while it moves, so you cannot hold a door open for
  //  yourself by stepping off its plate straight into the doorway.)
  function groupOpen(level, board, g, moverId) {
    var any = false;
    for (var i = 0; i < level.plates.length; i++) {
      var p = level.plates[i];
      if (p.group !== g) continue;
      any = true;
      var occ = occupantAt(board, p.x, p.y);
      if (occ === null || occ === moverId) return false;
    }
    return any;
  }

  function isPassable(level, board, x, y, moverId) {
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
    var i = y * level.width + x;
    var c = level.cells[i];
    if (c === WALL) return false;
    if (c === DOOR && !groupOpen(level, board, level.group[i], moverId)) return false;
    return occupantAt(board, x, y) === null;
  }

  /** The action echo `i` will replay on turn `turn` (null = not active yet). */
  function echoActionForTurn(echo, history, turn) {
    var idx = turn - echo.n - 1; // history[k] is the action of turn k+1
    return idx >= 0 ? history[idx] : null;
  }

  /** Order in which echoes move this turn: ascending N, then reading order. */
  function echoOrder(echoes) {
    var order = echoes.map(function (_, i) { return i; });
    order.sort(function (a, b) {
      var A = echoes[a], B = echoes[b];
      return (A.n - B.n) || (A.y - B.y) || (A.x - B.x) || (a - b);
    });
    return order;
  }

  /**
   * Advance one turn. Pure: returns a new state.
   * action: 'U' | 'D' | 'L' | 'R' | 'W'
   */
  function step(level, state, action) {
    if (state.won) return state;
    if (!DELTA[action]) throw new Error('Bad action: ' + action);

    var turn = state.turn + 1;
    var history = state.history.concat([action]);
    var board = {
      px: state.px,
      py: state.py,
      echoes: state.echoes.map(function (e) { return { n: e.n, x: e.x, y: e.y }; })
    };
    var last = { player: null, echoes: new Array(board.echoes.length), order: null };

    // 1. Player moves (or bumps, or waits). Always recorded in history.
    var d = DELTA[action];
    var pm = { action: action, fromX: board.px, fromY: board.py, blocked: false };
    if (action !== 'W') {
      var nx = board.px + d[0], ny = board.py + d[1];
      if (isPassable(level, board, nx, ny, -1)) { board.px = nx; board.py = ny; }
      else pm.blocked = true;
    }
    pm.toX = board.px; pm.toY = board.py;
    last.player = pm;

    // 2. Echoes, ascending N, ties by reading order of their position at turn start.
    var order = echoOrder(state.echoes);
    last.order = order;
    for (var k = 0; k < order.length; k++) {
      var i = order[k];
      var e = board.echoes[i];
      var act = echoActionForTurn(e, history, turn);
      var em = { action: act, fromX: e.x, fromY: e.y, blocked: false, active: act !== null };
      if (act !== null && act !== 'W') {
        var dd = DELTA[act];
        var ex = e.x + dd[0], ey = e.y + dd[1];
        if (isPassable(level, board, ex, ey, i)) { e.x = ex; e.y = ey; }
        else em.blocked = true;
      }
      em.toX = e.x; em.toY = e.y;
      last.echoes[i] = em;
    }

    var won = level.cells[board.py * level.width + board.px] === EXIT;

    return {
      turn: turn,
      px: board.px,
      py: board.py,
      echoes: board.echoes,
      history: history,
      won: won,
      last: last
    };
  }

  // ---- Queries used by the renderer / UI (still pure) ----------------------

  /** Is the plate at (x,y) currently pressed? */
  function platePressed(level, state, x, y) {
    return occupantAt(state, x, y) !== null;
  }

  /** Is door group g open in this state (all its plates pressed)? */
  function doorGroupOpen(level, state, g) {
    return groupOpen(level, state, g, null);
  }

  /** Door tile shows as open if its group is open or something is standing in it. */
  function doorTileOpen(level, state, x, y) {
    var g = level.group[y * level.width + x];
    return doorGroupOpen(level, state, g) || occupantAt(state, x, y) !== null;
  }

  /** What echo i will attempt next turn (null = still charging). */
  function nextEchoAction(state, i) {
    return echoActionForTurn(state.echoes[i], state.history, state.turn + 1);
  }

  /** Index into history that echo i will replay next turn (or -1). */
  function nextEchoHistoryIndex(state, i) {
    return state.turn - state.echoes[i].n;
  }

  /** Replay a solution string like "RRUW" from the start. Returns final state. */
  function replay(level, actions) {
    var s = initialState(level);
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      if (a === ' ' || a === ',') continue;
      s = step(level, s, a);
      if (s.won) break;
    }
    return s;
  }

  E.ACTIONS = ACTIONS;
  E.DELTA = DELTA;
  E.CELL = { FLOOR: FLOOR, WALL: WALL, EXIT: EXIT, PLATE: PLATE, DOOR: DOOR };
  E.GROUPS = GROUPS;
  E.parseLevel = parseLevel;
  E.initialState = initialState;
  E.step = step;
  E.echoOrder = echoOrder;
  E.platePressed = platePressed;
  E.doorGroupOpen = doorGroupOpen;
  E.doorTileOpen = doorTileOpen;
  E.nextEchoAction = nextEchoAction;
  E.nextEchoHistoryIndex = nextEchoHistoryIndex;
  E.replay = replay;
})(typeof window !== 'undefined' ? window : globalThis);
