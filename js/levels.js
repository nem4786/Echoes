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
  }
];
