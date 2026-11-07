# Echoes — design notes

Working title. Handcrafted grid puzzle game: grey **echo blocks** labelled N repeat the move you made N turns earlier.

## Current rules (as implemented in `js/engine.js`)

**Turn structure**
1. You choose one action: Up, Down, Left, Right or Wait. It is added to the move history.
2. You move. If the target is blocked (wall, echo, closed door, edge), you stay put, **but the action is still recorded as that direction** (a "bump").
3. The echoes move one at a time, in **ascending N**. Ties are broken by reading order (top row first, then left to right) of where they stand at the start of the turn.
4. You win if you are standing on the exit.

**Echo timing.** On turn *t*, an echo with number N attempts your action from turn *t − N*. While *t ≤ N* it waits (it shows a countdown badge). So an N=1 echo does on turn 5 what you did on turn 4. N=0 is not allowed. Because N ≥ 1, an echo's next move is always already known, which is what the preview arrow shows.

**Blocking.** Echoes are solid. They can't enter walls, closed doors, other echoes or your tile, and you can't push them. A blocked echo move is lost; the echo keeps its place in your history and replays the next entry next turn. Order matters: an echo can step into a tile that you, or a lower-N echo, vacated earlier in the same turn.

**Plates and doors.** Plates and doors are lettered a–d / A–D. A door is open while **every** plate of its letter is pressed by you or an echo. Doors are checked at the moment of each individual move. The thing currently moving does *not* count as pressing the plate it is stepping off, so you can't hold a door open for yourself by stepping off its plate straight into the doorway. A door can't close on something standing in it; it is drawn open until the tile is empty.

**Undo / restart.** Z restores the full previous state, including the move history. R restarts, and is itself undoable.

### Things to keep an eye on
- **Wall bumps are a strong tool.** Next to a wall you can feed a direction to the echoes without moving yourself. That means the walls next to the player's route effectively decide what the echoes can be programmed to do. Levels 1–6 are built so bumps are never needed (or are just an alternative way to stall). Levels 7–8 rely on them.
- **Pausing by stepping back and forth.** A WAIT can often be imitated by stepping off and back on (2 turns) or by a harmless bump. To make WAIT truly necessary, a level needs an odd-length pause *and* every available bump has to hurt (see level 3).
- **Tie order** is by current position, so you can always work it out from the screen. It only matters when echoes queue up behind each other.
- **No fail state.** Echoes can get stuck in dead ends; that's what undo is for. The dev panel's "Solve from current state" tells you whether a position is still winnable.

## Level file format (`js/levels.js`)

```
#  wall        .  floor        @  player       E  exit
1-9 echo (N)   a-d plate       A-D door (opens when all same-letter plates are pressed)
```
Optional `solution` (intended answer, checked by the dev tools) and `note`.

## Level notes (solver results)

| # | Name | Teaches | Shortest | Without WAIT | Without bumps | Without both |
|---|------|---------|----------|--------------|---------------|--------------|
| 1 | Follow | N=1 trails you; plates open doors | 7 | 7 | 7 | 7 |
| 2 | Nook | Echoes copy *moves*, not your path; walls park them | 8 | 8 | 8 | 8 |
| 3 | Pause | WAIT | 8 | 10 (tricky bump timing) | 8 | impossible |
| 4 | Hold the Door | N=3 delay: stay on b until the echo is through | 14 | 14 (bumps as stalls) | 14 | 15 |
| 5 | Late by One | Two echoes, AND-door; the one-turn lag between N=1 and N=2 | 10 | 10 | 10 | impossible |
| 6 | Relay | One echo holds a door for the other | 13 | 13 | 13 | 14 |
| 7 | Remote Control | Wall bumps program an N=3 echo | 13 | 13 | impossible | impossible |
| 8 | Two Minds | One program must drive two echoes through two mazes | 17 | 17 | impossible | impossible |

In every level the designer's intended solution is the shortest one; the solver found no shortcut. Level 1 originally had a way around the door; that's fixed.

**Difficulty curve caveats.** 4 → 5 drops in move count but needs a new idea. 8 is a real jump: it's the first level where you have to plan both echoes' paths at once. Levels 3 and 5 are the only ones where WAIT or a bump is strictly required; elsewhere WAIT and bump-stalls are interchangeable.

### Part two (levels 9–20)

All twelve rely on wall bumps as programming; in every one but Handshake, the level can't be solved without them. Shortest solutions go up steadily from 22 to 42 moves. Every door was also checked to be a real chokepoint: turning it into a wall makes the level unsolvable, so no plate is decorative.

| # | Name | Idea | Shortest | Search size |
|---|------|------|----------|-------------|
| 9 | Stack | Two echoes share a maze and block each other; stack both into a two-plate dead end | 22 | 108k |
| 10 | Slow Switch | Two-cell "switch": standing on b opens doors, but each toggle is also a move the N=4 echo copies | 22 | 16k |
| 11 | Corridor Gate | You only move up/down. Echo 1 holds b for your door B, echo 2 holds a | 24 | 35k |
| 12 | Gatekeeper | Roles reversed: you hold b so the echo can pass B | 25 | 7k |
| 13 | Trio | Three echoes, three mazes, one program, AND-door | 27 | 212k |
| 14 | Series | Two doors in a row on your path, held by two different echoes | 29 | 74k |
| 15 | Long Wait | Gatekeeper room with N=3; you have to come back to b twice | 29 | 31k |
| 16 | Handshake | One echo: you hold b for it, it holds c for you, then it holds a | 30 (38 without bumps) | 20k |
| 17 | Switch | The switch with two echoes (N=2, N=3) | 30 | 55k |
| 18 | Closet Relay | You can't move; echo 1 holds b while echo 2 passes B | 32 | 8k |
| 19 | Switchboard | Your switch opens B for echo 2, which holds c for echo 3, which holds a | 37 | 34k |
| 20 | Relay Chain | Closet. 1 holds b for 2, 2 holds c for 3, 3 holds a. The finale | 42 | 383k |

**How these were made.** Layouts were drawn by hand. The exact plate positions were then tuned with the solver: a script tried every combination of a few hand-picked candidate cells and kept the placement with the longest shortest-solution. The tuning scripts aren't in the repo; ask if you want them.

**Rule fact found while designing.** On the two-cell switch (levels 10, 17, 19), an N=1 echo can never get through a door you control. You're on the plate only if your last left/right was L, so its entry move has to be followed right away by your L, and the echo copies that L on the very next turn, which pulls it back out. That's why every switch level uses N ≥ 2.

**Curve notes.** Long Wait reuses Gatekeeper's room on purpose (same room, longer memory). Three of the last five levels are "closet" programming puzzles, because they give the longest solutions with the smallest search. If they feel samey, Switch and Switchboard are the templates to build more player-movement levels from.

## Ideas for future twists
- **Mirror echoes** (e.g. a block labelled –2) replay the *opposite* move. Great for symmetric two-maze puzzles.
- **Number tiles**: stepping on a +1/–1 tile changes an echo's N. Shifting the delay mid-level changes which past move it reads.
- **Chained echoes**: an echo that copies another echo's *actual* movement (including lost moves) rather than yours.
- **Recorder tile**: an echo only records/replays while you stand inside a marked zone.
- **One-way tiles / ice**: an echo slides until blocked, so one recorded move covers many tiles.
- **Pushable crates** that only echoes can push (they're solid to you), turning echoes into delayed movers of other things.
- **Exit needs an echo**: some exits only count if a specific echo is also on a goal tile at the same moment.
- **History budget**: a level allows only K WAITs, or only K bumps, to force a particular solution.
- **Erase tile**: stepping on it deletes the oldest entries of the history, so echoes "forget".
- **Visible "tape"**: show each echo's upcoming 3–4 moves in the world, not only in the history strip.

## Tech notes
- `engine.js` is pure: `step(level, state, action) -> newState`. No DOM, no mutation. Porting to C#: `Level` (immutable), `State` (struct-like, copy per step), one static `Step`.
- `solver.js`: BFS. The search state is player + echo positions + the last maxN actions, padded with W. The turn counter isn't needed, because a charging echo behaves exactly like one replaying WAIT. States are stored as compact string keys (one character per position plus the history), with parent links in flat arrays. The largest level (20) explores about 383k states: about 3 s in Node or a browser. "Check all levels" in the browser computes only the shortest solution and checks the intended one; "Solve this level" adds the WAIT/bump variants.
- `tools/check-levels.js`: the same checks from the command line (`node tools/check-levels.js`).
