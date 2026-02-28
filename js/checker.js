(function(global) {
  function normalize(s) { return (s == null ? '' : String(s)).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); }
  function check(level, code, showOutput) {
    var tests = level.tests || [];
    if (!tests.length) { showOutput('Нет тестов.', true); return; }
    showOutput('Проверяем...');
    var index = 0;
    var points = level.points || 0;
    function runNext() {
      if (index >= tests.length) {
        window.ProgressState.completeLevel(level.id, points);
        showOutput('Все тесты пройдены! +' + points + ' очков.');
        var modal = document.getElementById('successModal');
        var msg = document.getElementById('successMessage');
        if (msg) msg.textContent = 'Ты набрал ' + points + ' очков!';
        if (modal) { modal.hidden = false; modal.style.display = 'flex'; }
        return;
      }
      var test = tests[index];
      var stdin = test.input != null ? String(test.input) : '';
      var expected = normalize(test.expected);
      global.PythonRunner.runCode(code, stdin).then(function(r) {
        if (r.error) { showOutput('Ошибка: ' + r.error + (r.stderr ? '\n' + r.stderr : ''), true); return; }
        var got = normalize(r.stdout);
        if (got !== expected) {
          showOutput('Тест ' + (index + 1) + ' не пройден.\nОжидалось:\n' + expected + '\nПолучено:\n' + got, true);
          return;
        }
        index++;
        runNext();
      }).catch(function(e) { showOutput('Ошибка: ' + (e.message || e), true); });
    }
    runNext();
  }
  global.CheckRunner = { check: check };
})(window);
