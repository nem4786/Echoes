/*
 * Echoes — level definitions. Edit freely; this is the only file you need
 * to touch to make new levels.
 *
 * Legend
 *   #     wall
 *   .     floor (a space also works)
 *   @     player start
 *   E     exit
 *   1-9   echo block; repeats your action from N turns ago
 *   a-d   pressure plate
 *   A-D   door, open while EVERY plate of the same letter is pressed
 *
 * Optional fields
 *   solution : the designer's intended solution (U D L R W). The dev panel
 *              checks it still works and compares it with the solver's.
 *   note     : design note, shown in the dev panel only.
 *
 * Rows may have different lengths; missing cells count as wall.
 */
var ECHOES_LEVELS = [
  {
    name: 'Follow',
    note: 'N=1 trails one step behind. Hold right; bump the door once and the echo catches up onto the plate.',
    solution: 'RRRRRRR',
    map: [
      '###########',
      '#.......###',
      '#1@..a..AE#',
      '#.......###',
      '###########'
    ]
  },
  {
    name: 'Nook',
    note: 'The echo copies moves, it does not follow your path. Your step up sends it into a nook you never visit; walls then keep it parked.',
    solution: 'RRURRRDD',
    map: [
      '########',
      '###a####',
      '#1.....#',
      '########',
      '###....#',
      '#@..##A#',
      '######E#'
    ]
  },
  {
    name: 'Pause',
    note: 'Introduces WAIT. The double door needs the echo to stand still for two of your moves. Floor above/below the plate means a wall bump knocks it off; only an odd-length pause works.',
    solution: 'RRRRWRRR',
    map: [
      '#########',
      '#####.###',
      '#1...a..#',
      '#####.###',
      '#########',
      '#@....AAE',
      '#########'
    ]
  },
  {
    name: 'Hold the Door',
    note: 'N=3. Stand on b so the echo can pass door B, which it reaches 3 turns after you reach b. Leave too early and it is shut out.',
    solution: 'RRRRWWWRRRRRDD',
    map: [
      '############',
      '#3...Ba#####',
      '############',
      '#@...b.....#',
      '##########A#',
      '##########E#'
    ]
  },
  {
    name: 'Late by One',
    note: 'Two plates, one door. Both echoes copy the same moves; the 1 overshoots against its wall. A last-second L pulls it back while the 2 has not replayed that L yet.',
    solution: 'RRRRRRLWDD',
    map: [
      '#########',
      '#1.a.####',
      '#########',
      '#2.....a#',
      '#########',
      '#@......#',
      '######A##',
      '######E##'
    ]
  },
  {
    name: 'Relay',
    note: 'The 1 must hold b for the 2. Your step up sends the 1 into its nook; the 2 replays that step a turn later into a wall and keeps going through B.',
    solution: 'RRRURRRRRWDDD',
    map: [
      '###########',
      '####b######',
      '#1......###',
      '###########',
      '#2...B...a#',
      '###########',
      '#.........#',
      '#@........#',
      '#########A#',
      '#########E#'
    ]
  },
  {
    name: 'Remote Control',
    note: 'Wall bumps as programming. You can only move up/down, so every left/right is a bump the 3 executes later. Up moves cost you, but the delay hides them.',
    solution: 'DDDDRRUUDDDDD',
    map: [
      '###########',
      '#@#3......#',
      '#.#.#####.#',
      '#.#.#a..#.#',
      '#.#.#.#...#',
      '#.#...#####',
      '#.#########',
      '#A#########',
      '#E#########'
    ]
  },
  {
    name: 'Two Minds',
    note: 'One program, two mazes, two delays. Both plates must be pressed at the same moment. The 1 runs one step ahead of the 2, so the final moves have to suit both.',
    solution: 'URDDRRDLLLDLLRDDD',
    map: [
      '###########',
      '#@#1...#..#',
      '#.#.##.#.##',
      '#.#..a.#2.#',
      '#.######.##',
      '#.#a......#',
      '#.#########',
      '#A#########',
      '#E#########'
    ]
  },

  // ---- Part two: levels 9-20 -------------------------------------------
  {
    name: 'Stack',
    note: 'Two echoes share one maze and block each other. The dead end holds two plates: tuck the 1 into the bottom slot first, then slide the 2 in above it.',
    solution: 'DLUDRRRRRRRRRULDLLRRDD',
    map: [
      '############',
      '#a1.2......#',
      '#a##.###.#.#',
      '#..........#',
      '############',
      '#@.........#',
      '#########A##',
      '#########E##'
    ]
  },
  {
    name: 'Slow Switch',
    note: 'You have two cells. Standing on b opens both B doors, but stepping on or off b is also a left/right the 4 will copy four turns later. Time each toggle for when the 4 reaches a door.',
    solution: 'RRRRRRLRDDRRUULRUUUUDD',
    map: [
      '############',
      '#4..B...#.a#',
      '#.#.#.#.#..#',
      '#.#...#.B..#',
      '############',
      '####b@######',
      '#####A######',
      '#####E######'
    ]
  },
  {
    name: 'Corridor Gate',
    note: 'You can only move up and down; left/right are bumps. The 1 must stand on b at the moment you reach B, and the 2 must be on a when you reach A. Your own walk down is part of both programs.',
    solution: 'RRRDDRRUURRRDDDDDDDUDDDD',
    map: [
      '############',
      '#@#1..#....#',
      '#.#.#.#.##b#',
      '#.#.#...#..#',
      '#B#........#',
      '#.##########',
      '#.#2...#...#',
      '#.#.##.#.#a#',
      '#.#........#',
      '#.##########',
      '#A##########',
      '#E##########'
    ]
  },
  {
    name: 'Gatekeeper',
    note: 'Roles reversed: you hold b so the 2 can get through B. Program its route first, then walk back and stand on b on exactly the turn it arrives.',
    solution: 'RRRRDLLLLRUURURRDRRRDRRDD',
    map: [
      '#############',
      '#2....#.....#',
      '#.###.B.#.#.#',
      '#...#.#.#a..#',
      '#############',
      '#.b.........#',
      '#@.........##',
      '##########A##',
      '##########E##'
    ]
  },
  {
    name: 'Trio',
    note: 'Three echoes, three mazes, one program. All three plates must be pressed at the same moment, and with delays of 1, 2 and 3 the last few moves have to suit all of them.',
    solution: 'DDRRUURRDDRRUURRDDRUULRDUDD',
    map: [
      '###########',
      '#1...#....#',
      '#.##.#.##a#',
      '#.........#',
      '###########',
      '#2..#...#.#',
      '#.#.#.#.#.#',
      '#.#...#.a.#',
      '###########',
      '#3#...#.a.#',
      '#.#.#.#.#.#',
      '#...#...#.#',
      '###########',
      '#####@#####',
      '#####A#####',
      '#####E#####'
    ]
  },
  {
    name: 'Series',
    note: 'Two doors on your path. The 1 holds b while you pass B, then the 2 has to be on a when you reach the exit. Program the 2 while you wait for the 1.',
    solution: 'RRDDLRRULURRRDDURRRRRRDLLRRDD',
    map: [
      '##############',
      '#1..#....#####',
      '#.#.#.##.#####',
      '#.#...##b#####',
      '##############',
      '#2.....#.....#',
      '###.##.#.###.#',
      '#a...........#',
      '##############',
      '#.....B......#',
      '#@....B.....##',
      '###########A##',
      '###########E##'
    ]
  },
  {
    name: 'Long Wait',
    note: 'The Gatekeeper room again, with N=3 and the plate by your start. The echo reaches B a turn later than it feels like it should, so you have to come back to b twice.',
    solution: 'RRRRDDULLLLRRLLURRDRRRRDRRRDD',
    map: [
      '#############',
      '#3....#.....#',
      '#.###.B.#.#.#',
      '#...#.#.#a..#',
      '#############',
      '#b..........#',
      '#@.........##',
      '##########A##',
      '##########E##'
    ]
  },
  {
    name: 'Handshake',
    note: 'One echo, three favours: you hold b so it can pass B, it holds c so you can pass C, then it steps back onto a for the exit. The two plates are neighbours.',
    solution: 'DDRRRULLLRRLLURRRRDRRRRLLRRRDD',
    map: [
      '#############',
      '#3...#...ac.#',
      '#.##.B.##.#.#',
      '#....#......#',
      '#############',
      '#b....#.....#',
      '#@....C....##',
      '##########A##',
      '##########E##'
    ]
  },
  {
    name: 'Switch',
    note: 'Your two-cell switch now opens doors for two echoes with different delays. The 3 goes through first; later the 2 and the 3 have to be on both plates at once.',
    solution: 'RRRURLRRDDRRUURRRLRDDLUURDUUDD',
    map: [
      '############',
      '#2..#..B...#',
      '#.#.#.###..#',
      '#.#...#..a.#',
      '############',
      '#3..B...#.a#',
      '#.#.#.#.#..#',
      '#...#.#....#',
      '############',
      '####b@######',
      '#####A######',
      '#####E######'
    ]
  },
  {
    name: 'Closet Relay',
    note: 'You cannot move at all. The 1 must be on b on the very turn the 2 steps into B, then the 2 continues to a. Same program, two mazes, one turn apart.',
    solution: 'RRDDRRUURRRRDDRRURRDDRRUURRRUUDD',
    map: [
      '#############',
      '#1..#.......#',
      '#.#.#.###.#b#',
      '#.#.....#...#',
      '#############',
      '#2..B..#...a#',
      '#.##.#.#.##.#',
      '#....#......#',
      '#############',
      '######@######',
      '######A######',
      '######E######'
    ]
  },
  {
    name: 'Switchboard',
    note: 'Your switch opens B for the 2. The 2 must then stand on c while the 3 passes C, and the 3 ends on a. You toggle, the 2 relays, the 3 delivers.',
    solution: 'RRDDRRUURRRLLRDRDLLURDRRRDDRRUURUUUDD',
    map: [
      '############',
      '#2..#..B...#',
      '#.#.#.###..#',
      '#.#...#..c.#',
      '############',
      '#3..C...#.a#',
      '#.#.#.#.#..#',
      '#...#.#....#',
      '############',
      '####b@######',
      '#####A######',
      '#####E######'
    ]
  },
  {
    name: 'Relay Chain',
    note: 'The finale. You cannot move. The 1 holds b for the 2, the 2 holds c for the 3, and the 3 holds a for you. 42 moves, and each one is read by three mazes at three different times.',
    solution: 'RRDDRRUURRRRDDRULLURRRRDDRRURURRRRDDRUUUDD',
    map: [
      '#############',
      '#1..#.......#',
      '#.#.#.###.#.#',
      '#.#...#...b.#',
      '#############',
      '#2..B...#.c.#',
      '#.#.#.#.#...#',
      '#...#.#.....#',
      '#############',
      '#3.#..C.....#',
      '#..#.#.#.#..#',
      '#....#...#.a#',
      '#############',
      '######@######',
      '######A######',
      '######E######'
    ]
  }
];
