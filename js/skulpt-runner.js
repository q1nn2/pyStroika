/*
 * skulpt-runner.js
 * Unified Python runner. Uses MiniPython (our built-in mini interpreter)
 * which handles the Python subset needed for the crane game without any
 * external library dependency.
 */
(function(global) {

  function runCode(code, stdin) {
    if (global.MiniPython) {
      // Reset crane state if running with crane world
      return global.MiniPython.runCode(code, stdin);
    }
    return Promise.resolve({ stdout: '', error: 'Интерпретатор не загружен.' });
  }

  global.PythonRunner = { runCode: runCode };
})(window);
