(function(global) {

  function showSuccess(points, level) {
    global.ProgressState.completeLevel(level.id, points);
    var modal = document.getElementById('successModal');
    var msg = document.getElementById('successMessage');
    if (msg) msg.textContent = 'Ты набрал ' + points + ' очков! Здание построено!';
    if (modal) { modal.hidden = false; modal.style.display = 'flex'; }
  }

  // Crane game check: run code, wait for animations, compare world state to goals
  function checkCrane(level, code, showOutput) {
    if (!global.GameWorld || !global.GameCrane) {
      showOutput('Игровой мир не инициализирован!', true);
      return;
    }
    showOutput('Запускаем кран...');

    // Reset world and crane to initial level state
    if (global.GameWorld && level.world) {
      global.GameWorld.init(level.world);
    }
    if (global.GameCrane && level.world && level.world.crane) {
      global.GameCrane.init(level.world.crane);
      if (level.world.carried) global.GameCrane.carried = level.world.carried;
    }

    global.PythonRunner.runCode(code, '').then(function(r) {
      if (r.error) {
        showOutput('Ошибка в коде:\n' + r.error, true);
        return;
      }
      // Wait for all crane animations to complete
      global.GameCrane.waitDone().then(function() {
        var goals = level.world.goal || [];
        if (goals.length === 0) {
          showOutput('Нет целей для проверки!', true);
          return;
        }
        var allMet = true;
        var missing = [];
        for (var i = 0; i < goals.length; i++) {
          var g = goals[i];
          var actual = global.GameWorld.getBlock(g[0], g[1], g[2]);
          if (actual !== g[3]) {
            allMet = false;
            missing.push('Нужен блок "' + g[3] + '" на (' + g[0] + ',' + g[1] + ',' + g[2] + ')');
          }
        }
        if (allMet) {
          showOutput('Отлично! Все блоки на месте! +' + (level.points || 0) + ' очков!');
          showSuccess(level.points || 0, level);
        } else {
          showOutput('Почти! Не хватает:\n' + missing.slice(0, 3).join('\n'), true);
        }
      });
    }).catch(function(e) {
      showOutput('Ошибка: ' + (e.message || e), true);
    });
  }

  function check(level, code, showOutput) {
    if (level.world) {
      checkCrane(level, code, showOutput);
    } else {
      // Legacy: stdout-based check (for levels without world)
      var normalize = function(s) { return (s == null ? '' : String(s)).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); };
      var tests = level.tests || [];
      if (!tests.length) { showOutput('Нет тестов.', true); return; }
      showOutput('Проверяем...');
      var index = 0;
      var points = level.points || 0;
      function runNext() {
        if (index >= tests.length) {
          showSuccess(points, level);
          showOutput('Все тесты пройдены! +' + points + ' очков.');
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
  }

  global.CheckRunner = { check: check };
})(window);
