/*
 * Echoes — canvas renderer. Reads level + state, never changes them.
 */
(function (root) {
  'use strict';
  var E = root.Echoes;
  var C = E.CELL;

  var COL = {
    bg: '#15171d',
    void: '#15171d',
    floor: '#262a35',
    floorAlt: '#232732',
    grid: 'rgba(255,255,255,0.035)',
    wall: '#3b4150',
    wallTop: '#4a5163',
    wallEdge: '#2b303b',
    player: '#ffb547',
    playerDark: '#c9821c',
    echo: '#a3a9b6',
    echoDark: '#6f7583',
    echoText: '#171a21',
    exit: '#4ade80'
  };
  // One accent per echo number: used for its badge, its preview arrow and
  // its marker in the history strip, so you can tell which echo reads what.
  var ECHO_ACCENT = ['#ffffff', '#38bdf8', '#c084fc', '#f472b6', '#a3e635', '#fb923c', '#facc15', '#2dd4bf', '#f87171', '#e2e8f0'];
  var GROUP_COL = ['#facc15', '#2dd4bf', '#fb7185', '#93c5fd'];

  function echoAccent(n) { return ECHO_ACCENT[n % ECHO_ACCENT.length]; }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function cellAt(level, x, y) {
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) return C.WALL;
    return level.cells[y * level.width + x];
  }

  function isVoidWall(level, x, y) {
    // A wall with no walkable neighbour (incl. diagonals) is drawn as empty space.
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (cellAt(level, x + dx, y + dy) !== C.WALL) return false;
    }
    return true;
  }

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  // Interpolated draw position for a mover description from state.last
  function moverPos(m, x, y, t) {
    if (!m || t >= 1) return { x: x, y: y };
    var k = ease(t);
    if (m.blocked && m.action && m.action !== 'W') {
      var d = E.DELTA[m.action];
      var bump = Math.sin(Math.min(1, t) * Math.PI) * 0.16;
      return { x: x + d[0] * bump, y: y + d[1] * bump };
    }
    return { x: m.fromX + (m.toX - m.fromX) * k, y: m.fromY + (m.toY - m.fromY) * k };
  }

  function drawArrow(ctx, cx, cy, dir, size, color, alpha, blocked) {
    var d = E.DELTA[dir];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(d[1], d[0]));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(-size * 0.25, -size * 0.42);
    ctx.lineTo(-size * 0.05, 0);
    ctx.lineTo(-size * 0.25, size * 0.42);
    ctx.closePath();
    ctx.fill();
    if (blocked) {
      ctx.globalAlpha = Math.min(1, alpha + 0.2);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = Math.max(2, size * 0.1);
      ctx.beginPath();
      ctx.moveTo(size * 0.62, -size * 0.32); ctx.lineTo(size * 0.62, size * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * draw(ctx, level, state, view)
   * view: { tile, ox, oy, t (anim progress 0..1), time (ms, for pulses), showPreview }
   */
  function draw(ctx, level, state, view) {
    var T = view.tile, ox = view.ox, oy = view.oy;
    var t = view.t == null ? 1 : view.t;
    var time = view.time || 0;
    var x, y, i;

    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    function px(gx) { return ox + gx * T; }
    function py(gy) { return oy + gy * T; }

    // --- floor & walls ---
    for (y = 0; y < level.height; y++) {
      for (x = 0; x < level.width; x++) {
        var c = level.cells[y * level.width + x];
        if (c === C.WALL) {
          if (isVoidWall(level, x, y)) continue;
          ctx.fillStyle = COL.wallEdge;
          ctx.fillRect(px(x), py(y), T, T);
          ctx.fillStyle = COL.wall;
          ctx.fillRect(px(x), py(y), T, T - T * 0.12);
          ctx.fillStyle = COL.wallTop;
          ctx.fillRect(px(x), py(y), T, T * 0.08);
        } else {
          ctx.fillStyle = (x + y) % 2 ? COL.floorAlt : COL.floor;
          ctx.fillRect(px(x), py(y), T, T);
        }
      }
    }
    // soft floor grid
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = 1;
    for (y = 0; y < level.height; y++) for (x = 0; x < level.width; x++) {
      if (level.cells[y * level.width + x] !== C.WALL) ctx.strokeRect(px(x) + 0.5, py(y) + 0.5, T - 1, T - 1);
    }

    var pad = T * 0.14;

    // --- exit ---
    var ex = level.exit;
    var pulse = 0.5 + 0.5 * Math.sin(time / 380);
    ctx.save();
    ctx.shadowColor = COL.exit;
    ctx.shadowBlur = T * (0.25 + 0.2 * pulse);
    ctx.strokeStyle = COL.exit;
    ctx.lineWidth = Math.max(2, T * 0.07);
    roundRect(ctx, px(ex.x) + pad, py(ex.y) + pad, T - 2 * pad, T - 2 * pad, T * 0.12);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(74,222,128,' + (0.15 + 0.15 * pulse) + ')';
    roundRect(ctx, px(ex.x) + pad * 2, py(ex.y) + pad * 2, T - 4 * pad, T - 4 * pad, T * 0.08);
    ctx.fill();

    // --- plates ---
    level.plates.forEach(function (p) {
      var col = GROUP_COL[p.group];
      var pressed = E.platePressed(level, state, p.x, p.y);
      var inset = T * 0.18;
      ctx.lineWidth = Math.max(2, T * 0.06);
      ctx.strokeStyle = col;
      ctx.fillStyle = pressed ? col : 'rgba(0,0,0,0.25)';
      roundRect(ctx, px(p.x) + inset, py(p.y) + inset, T - 2 * inset, T - 2 * inset, T * 0.1);
      ctx.fill();
      ctx.stroke();
      if (!pressed) {
        ctx.fillStyle = col;
        ctx.font = 'bold ' + Math.round(T * 0.28) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(E.GROUPS[p.group], px(p.x) + T / 2, py(p.y) + T / 2 + 1);
      }
    });

    // --- doors ---
    level.doors.forEach(function (d) {
      var col = GROUP_COL[d.group];
      var open = E.doorTileOpen(level, state, d.x, d.y);
      var X = px(d.x), Y = py(d.y);
      if (open) {
        ctx.setLineDash([T * 0.12, T * 0.1]);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = Math.max(1.5, T * 0.04);
        ctx.strokeRect(X + pad * 0.6, Y + pad * 0.6, T - pad * 1.2, T - pad * 1.2);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = col;
        roundRect(ctx, X + T * 0.06, Y + T * 0.06, T * 0.88, T * 0.88, T * 0.08);
        ctx.fill();
        // bars
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        for (var b = 1; b <= 3; b++) ctx.fillRect(X + T * (b * 0.25) - T * 0.035, Y + T * 0.12, T * 0.07, T * 0.76);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = 'bold ' + Math.round(T * 0.3) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(E.GROUPS[d.group].toUpperCase(), X + T / 2, Y + T / 2 + 1);
      }
    });

    var last = t < 1 ? state.last : null;

    // --- preview arrows (what each echo will try next turn) ---
    if (view.showPreview !== false && !state.won && t >= 1) {
      state.echoes.forEach(function (e, idx) {
        var act = E.nextEchoAction(state, idx);
        if (!act || act === 'W') return;
        var d = E.DELTA[act];
        var tx = e.x + d[0], ty = e.y + d[1];
        var wall = cellAt(level, tx, ty) === C.WALL;
        var ax = px(e.x) + T / 2 + d[0] * T * (wall ? 0.62 : 0.78);
        var ay = py(e.y) + T / 2 + d[1] * T * (wall ? 0.62 : 0.78);
        drawArrow(ctx, ax, ay, act, T * 0.42, echoAccent(e.n), wall ? 0.55 : 0.9, wall);
      });
    }

    // --- echoes ---
    state.echoes.forEach(function (e, idx) {
      var m = last ? last.echoes[idx] : null;
      var p = moverPos(m, e.x, e.y, t);
      var X = px(p.x), Y = py(p.y);
      var s = T * 0.1;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, X + s, Y + s + T * 0.05, T - 2 * s, T - 2 * s, T * 0.14);
      ctx.fill();
      ctx.fillStyle = COL.echoDark;
      roundRect(ctx, X + s, Y + s, T - 2 * s, T - 2 * s, T * 0.14);
      ctx.fill();
      ctx.fillStyle = COL.echo;
      roundRect(ctx, X + s, Y + s, T - 2 * s, T - 2 * s - T * 0.07, T * 0.14);
      ctx.fill();
      // accent bar
      ctx.fillStyle = echoAccent(e.n);
      roundRect(ctx, X + T * 0.3, Y + T * 0.72, T * 0.4, T * 0.06, T * 0.03);
      ctx.fill();
      // number
      ctx.fillStyle = COL.echoText;
      ctx.font = '800 ' + Math.round(T * 0.46) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(e.n), X + T / 2, Y + T * 0.45);

      // status glyph when it will not move next turn
      if (t >= 1 && !state.won) {
        var act = E.nextEchoAction(state, idx);
        var gx = X + T * 0.8, gy = Y + T * 0.2, r = T * 0.13;
        if (act === null) {
          // still charging: show how many turns until it starts
          var left = e.n - state.turn;
          ctx.fillStyle = '#15171d';
          ctx.beginPath(); ctx.arc(gx, gy, r * 1.15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = echoAccent(e.n);
          ctx.font = 'bold ' + Math.round(T * 0.2) + 'px system-ui, sans-serif';
          ctx.fillText(String(left), gx, gy + 1);
        } else if (act === 'W') {
          ctx.fillStyle = '#15171d';
          ctx.beginPath(); ctx.arc(gx, gy, r * 1.15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = echoAccent(e.n);
          ctx.fillRect(gx - r * 0.5, gy - r * 0.55, r * 0.32, r * 1.1);
          ctx.fillRect(gx + r * 0.18, gy - r * 0.55, r * 0.32, r * 1.1);
        }
      }
    });

    // --- player ---
    var pm = last ? last.player : null;
    var pp = moverPos(pm, state.px, state.py, t);
    var cx = px(pp.x) + T / 2, cy = py(pp.y) + T / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + T * 0.3, T * 0.26, T * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.playerDark;
    ctx.beginPath(); ctx.arc(cx, cy + T * 0.03, T * 0.31, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COL.player;
    ctx.beginPath(); ctx.arc(cx, cy, T * 0.3, 0, Math.PI * 2); ctx.fill();
    // eyes look in the direction of the last action
    var look = state.last && state.last.player.action !== 'W' ? E.DELTA[state.last.player.action] : [0, 0];
    ctx.fillStyle = '#2a1d08';
    var eo = T * 0.06;
    ctx.beginPath(); ctx.arc(cx - T * 0.1 + look[0] * eo, cy - T * 0.04 + look[1] * eo, T * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + T * 0.1 + look[0] * eo, cy - T * 0.04 + look[1] * eo, T * 0.045, 0, Math.PI * 2); ctx.fill();
  }

  E.Render = {
    draw: draw,
    echoAccent: echoAccent,
    groupColor: function (g) { return GROUP_COL[g]; },
    colors: COL
  };
})(typeof window !== 'undefined' ? window : globalThis);
