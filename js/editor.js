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
    var taskDesc = document.getElementById('taskDescription');
    if (taskDesc) taskDesc.textContent = level.description;
    var taskEx = document.getElementById('taskExample');
    if (taskEx) taskEx.textContent = level.example || '';
    var taskTopic = document.getElementById('taskTopic');
    if (taskTopic) taskTopic.textContent = level.topic || '';
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
