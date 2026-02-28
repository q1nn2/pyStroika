/*
 * crane-api.js
 * Registers crane commands as Skulpt built-ins.
 * Commands run SYNCHRONOUSLY during Python execution — they push to a queue.
 * After Python finishes, the queue is replayed with animations by crane.runQueue().
 *
 * look() is special: it evaluates immediately against current world state
 * (before any queued changes), returning a Skulpt string.
 */
(function(global) {

  var _crane = null;
  var _queue = [];

  function push(cmd, arg) {
    _queue.push(arg !== undefined ? { cmd: cmd, arg: arg } : { cmd: cmd });
  }

  function installCraneBuiltins(crane) {
    _crane = crane;
    _queue = [];

    if (typeof Sk === 'undefined') { console.error('Skulpt not loaded'); return; }

    Sk.builtins['move']       = new Sk.builtin.func(function() { push('move'); return Sk.builtin.none.none$; });
    Sk.builtins['turn_left']  = new Sk.builtin.func(function() { push('turn_left'); return Sk.builtin.none.none$; });
    Sk.builtins['turn_right'] = new Sk.builtin.func(function() { push('turn_right'); return Sk.builtin.none.none$; });
    Sk.builtins['lift']       = new Sk.builtin.func(function() { push('lift'); return Sk.builtin.none.none$; });
    Sk.builtins['place']      = new Sk.builtin.func(function() { push('place'); return Sk.builtin.none.none$; });
    Sk.builtins['dig']        = new Sk.builtin.func(function() { push('dig'); return Sk.builtin.none.none$; });

    Sk.builtins['place_block'] = new Sk.builtin.func(function(typeArg) {
      var type = typeArg ? Sk.ffi.remapToJs(typeArg) : 'brick';
      push('place_block', type);
      return Sk.builtin.none.none$;
    });

    // look() reads state from a "simulated" position based on queued moves
    Sk.builtins['look'] = new Sk.builtin.func(function() {
      // Simulate crane state after all queued commands so far
      var simState = simulateState(crane, _queue);
      var result = lookAt(crane.world, simState.x, simState.y, simState.dir);
      return new Sk.builtin.str(result);
    });
  }

  var DIR_DX = { N: 0, E: 1, S: 0, W: -1 };
  var DIR_DY = { N: -1, E: 0, S: 1, W: 0 };
  var DIRS = ['N', 'E', 'S', 'W'];

  function simulateState(crane, queue) {
    var x = crane.x, y = crane.y, dir = crane.dir;
    for (var i = 0; i < queue.length; i++) {
      var cmd = queue[i].cmd;
      if (cmd === 'move') { x += DIR_DX[dir]; y += DIR_DY[dir]; }
      else if (cmd === 'turn_left')  { dir = DIRS[(DIRS.indexOf(dir) + 3) % 4]; }
      else if (cmd === 'turn_right') { dir = DIRS[(DIRS.indexOf(dir) + 1) % 4]; }
    }
    return { x: x, y: y, dir: dir };
  }

  function lookAt(world, x, y, dir) {
    var tx = x + DIR_DX[dir], ty = y + DIR_DY[dir];
    if (tx < 0 || tx >= world.gridW || ty < 0 || ty >= world.gridH) return 'wall';
    var tz = world.getTopZ(tx, ty);
    if (tz < 0) return 'empty';
    return world.getBlock(tx, ty, tz) || 'empty';
  }

  function getQueue() { return _queue; }
  function resetQueue() { _queue = []; }

  global.CraneAPI = {
    install: installCraneBuiltins,
    getQueue: getQueue,
    resetQueue: resetQueue
  };
})(window);
