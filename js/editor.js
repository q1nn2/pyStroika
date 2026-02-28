(function(global) {
  var editor = null;
  function getCode() { return editor ? editor.getValue() : ''; }

  function initEditor(containerId, options) {
    var container = document.getElementById(containerId);
    if (!container || typeof CodeMirror === 'undefined') return null;
    editor = CodeMirror(container, {
      mode: 'python',
      lineNumbers: true,
      indentUnit: 4,
      lineWrapping: true,
      theme: 'default',
      value: (options && options.initialValue) || ''
    });
    return editor;
  }

  function initGamePage(level) {
    if (!level) return;

    var modal = document.getElementById('successModal');
    if (modal) { modal.hidden = true; modal.style.display = 'none'; }

    var levelTitle = document.getElementById('levelTitle');
    if (levelTitle) levelTitle.textContent = level.title;

    var levelIcon = document.getElementById('levelIcon');
    if (levelIcon) levelIcon.textContent = level.icon || '';

    var taskDesc = document.getElementById('taskDescription');
    if (taskDesc) taskDesc.textContent = level.description;

    var taskEx = document.getElementById('taskExample');
    if (taskEx) {
      taskEx.textContent = '';
      if (level.example) {
        taskEx.textContent = level.example;
      }
    }

    var taskTopic = document.getElementById('taskTopic');
    if (taskTopic) taskTopic.textContent = level.topic || '';

    // Theory toggle
    var theorySection = document.getElementById('theorySection');
    var theoryContent = document.getElementById('theoryContent');
    var theoryText = document.getElementById('theoryText');
    var btnTheoryToggle = document.getElementById('btnTheoryToggle');
    if (theorySection && level.theory) {
      theorySection.style.display = 'block';
      if (theoryText) theoryText.textContent = level.theory;
      if (theoryContent) theoryContent.hidden = true;
      if (btnTheoryToggle) {
        btnTheoryToggle.textContent = '📖 Теория (нажми, чтобы открыть)';
        btnTheoryToggle.onclick = function() {
          var open = !theoryContent.hidden;
          theoryContent.hidden = !open;
          btnTheoryToggle.textContent = open
            ? '📖 Теория (нажми, чтобы открыть)'
            : '📖 Теория (нажми, чтобы закрыть)';
        };
      }
    } else if (theorySection) theorySection.style.display = 'none';

    // Hints
    var hintOutput = document.getElementById('hintOutput');
    var btnHint = document.getElementById('btnHint');
    var hintIndex = 0;
    if (btnHint && hintOutput) {
      hintOutput.innerHTML = '';
      hintIndex = 0;
      var hints = level.hints || [];
      btnHint.style.display = hints.length ? '' : 'none';
      btnHint.disabled = false;
      btnHint.onclick = function() {
        if (hintIndex < hints.length) {
          var p = document.createElement('p');
          p.className = 'hint-item';
          p.textContent = (hintIndex + 1) + '. ' + hints[hintIndex];
          hintOutput.appendChild(p);
          hintIndex++;
        }
        if (hintIndex >= hints.length) btnHint.disabled = true;
      };
    }

    initEditor('editorWrap', { initialValue: level.starterCode || '# Напиши код\n' });

    var outputEl = document.getElementById('output');
    function showOutput(text, isError) {
      if (outputEl) {
        outputEl.textContent = text || '';
        outputEl.className = 'output' + (isError ? ' error' : '');
      }
    }

    // Run button — resets world and runs code
    var btnRun = document.getElementById('btnRun');
    if (btnRun) {
      btnRun.onclick = function() {
        showOutput('Запускаем кран...');

        // Reset world state before run
        if (global.GameWorld && level.world) {
          global.GameWorld.init(level.world);
        }
        if (global.GameCrane && level.world) {
          global.GameCrane.reset();
          global.GameCrane.init(level.world.crane || { x: 0, y: 0, dir: 'S' });
          if (level.world.carried) global.GameCrane.carried = level.world.carried;
        }

        global.PythonRunner.runCode(getCode(), '').then(function(r) {
          if (r.error) {
            showOutput('Ошибка:\n' + r.error, true);
          } else {
            showOutput(r.stdout ? r.stdout : 'Готово! Теперь нажми «Проверить».');
          }
        }).catch(function(e) {
          showOutput('Ошибка: ' + (e.message || e), true);
        });
      };
    }

    // Check button
    var btnCheck = document.getElementById('btnCheck');
    if (btnCheck) {
      btnCheck.onclick = function() {
        if (global.CheckRunner && global.CheckRunner.check) {
          global.CheckRunner.check(level, getCode(), showOutput);
        }
      };
    }

    // Reset button
    var btnReset = document.getElementById('btnReset');
    if (btnReset) {
      btnReset.onclick = function() {
        if (global.GameWorld && level.world) global.GameWorld.init(level.world);
        if (global.GameCrane && level.world) {
          global.GameCrane.reset();
          global.GameCrane.init(level.world.crane || { x: 0, y: 0, dir: 'S' });
          if (level.world.carried) global.GameCrane.carried = level.world.carried;
        }
        showOutput('Мир сброшен!');
      };
    }
  }

  global.Editor = { initEditor: initEditor, initGamePage: initGamePage, getCode: getCode };
})(window);
