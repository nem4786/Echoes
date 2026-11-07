// Optional: verify every level from the command line (needs Node.js).
//   node tools/check-levels.js          -> all levels
//   node tools/check-levels.js 3        -> only level 3
// The same check runs in the browser via the "Dev" panel.
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var dir = path.join(__dirname, '..', 'js');
['engine.js', 'solver.js', 'levels.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });
});

var only = process.argv[2] ? parseInt(process.argv[2], 10) : null;
var ok = true;
ECHOES_LEVELS.forEach(function (def, i) {
  if (only && only !== i + 1) return;
  var lvl = Echoes.parseLevel(def);
  var r = Echoes.analyze(lvl);
  function fmt(x) { return x.solved ? x.length + ' (' + x.solution + ')' : (x.capped ? 'CAPPED' : 'unsolvable'); }
  console.log('\n' + (i + 1) + '. ' + r.name + '   [' + r.ms + ' ms, ' + r.best.explored + ' states]');
  console.log('   shortest      : ' + fmt(r.best));
  console.log('   without WAIT  : ' + fmt(r.noWait));
  console.log('   without bumps : ' + fmt(r.noBump));
  console.log('   neither       : ' + fmt(r.noBoth));
  if (r.intended) console.log('   intended      : ' + (r.intended.ok ? 'OK' : 'FAILS') + ', ' + r.intended.length + ' moves (' + def.solution + ')');
  if (!r.best.solved) ok = false;
  if (r.intended && !r.intended.ok) ok = false;
});
console.log(ok ? '\nAll checked levels solvable.' : '\nPROBLEMS FOUND.');
process.exit(ok ? 0 : 1);
