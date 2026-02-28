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
    if (taskEx) taskEx.textContent = level.example || '';
    var taskTopic = document.getElementById('taskTopic');
    if (taskTopic) taskTopic.textContent = level.topic || '';
    var theorySection = document.getElementById('theorySection');
    var theoryContent = document.getElementById('theoryContent');
    var theoryText = document.getElementById('theoryText');
    var btnTheoryToggle = document.getElementById('btnTheoryToggle');
    if (theorySection && level.theory) {
      theorySection.style.display = 'block';
      if (theoryText) theoryText.textContent = level.theory;
      if (btnTheoryToggle) btnTheoryToggle.textContent = '📖 Теория (нажми, чтобы открыть)';
      if (theoryContent) theoryContent.hidden = true;
      btnTheoryToggle.onclick = function() {
        var open = !theoryContent.hidden;
        theoryContent.hidden = !open;
        btnTheoryToggle.textContent = open ? '📖 Теория (нажми, чтобы открыть)' : '📖 Теория (нажми, чтобы закрыть)';
      };
    } else if (theorySection) theorySection.style.display = 'none';
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
    document.getElementById('btnRun').onclick = function() {
      showOutput('Запуск...');
      var stdinEl = document.getElementById('runStdin');
      var stdin = (stdinEl && stdinEl.value !== undefined) ? String(stdinEl.value) : '';
      global.PythonRunner.runCode(getCode(), stdin).then(function(r) {
        if (r.error) {
          var errMsg = r.stderr || r.error;
          // Более понятное сообщение для EOFError
          if (errMsg.indexOf('EOF') !== -1 || errMsg.indexOf('EOFError') !== -1) {
            errMsg = 'Ошибка: программа ожидает ввод данных.\nИспользуй кнопку «Проверить» для автоматической проверки с тестовыми данными.';
          }
          showOutput(errMsg, true);
        } else {
          showOutput(r.stdout || '(пусто)');
        }
      }).catch(function(e) { showOutput('Ошибка: ' + (e.message || e), true); });
    };
    document.getElementById('btnCheck').onclick = function() {
      if (global.CheckRunner && global.CheckRunner.check) global.CheckRunner.check(level, getCode(), showOutput);
    };
  }
  global.Editor = { initEditor: initEditor, initGamePage: initGamePage, getCode: getCode };
})(window);
