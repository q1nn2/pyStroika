(function(global) {
  var pyodide = null;
  var loading = null;
  function loadPyodide() {
    if (pyodide) return Promise.resolve(pyodide);
    if (loading) return loading;
    loading = new Promise(function(resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.onload = function() {
        var loader = global.loadPyodide || global.languagePluginLoader;
        if (!loader) { reject(new Error('Pyodide not found')); return; }
        loader({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' })
          .then(function(p) { pyodide = p; resolve(p); })
          .catch(reject);
      };
      script.onerror = function() { reject(new Error('Pyodide load failed')); };
      document.head.appendChild(script);
    });
    return loading;
  }
  function runCode(code, stdin, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return loadPyodide().then(function(p) {
      var stdout = [], stderr = [];
      // Batched handler: получает строки (полные строки или части при flush)
      p.setStdout({ batched: function(s) { stdout.push(s); } });
      p.setStderr({ batched: function(s) { stderr.push(s); } });
      if (stdin && String(stdin).length) {
        var lines = String(stdin).split('\n');
        var lineIndex = 0;
        p.setStdin({ stdin: function() {
          if (lineIndex < lines.length) return lines[lineIndex++] + '\n';
          return undefined;
        }});
      } else {
        // При "Запустить" без stdin возвращаем пустую строку вместо EOF, чтобы код мог выполниться
        // (для правильной проверки используй "Проверить")
        var inputCount = 0;
        p.setStdin({ stdin: function() {
          inputCount++;
          if (inputCount === 1) return '\n'; // первое input() получает пустую строку
          return undefined; // последующие вызовы - EOF
        }});
      }
      return Promise.race([
        p.runPythonAsync(code),
        new Promise(function(_, rej) { setTimeout(function() { rej(new Error('Timeout')); }, timeoutMs); })
      ]).then(function() {
        // batched отдаёт строки без \n; print() даёт одну строку с \n в конце — склеиваем с \n
        var out = stdout.join('\n');
        if (out.length) out += '\n';
        var err = stderr.join('\n');
        if (err.length) err += '\n';
        return { stdout: out, stderr: err, error: null };
      }).catch(function(err) {
        var out = stdout.join('\n');
        if (out.length) out += '\n';
        return { stdout: out, stderr: stderr.join('\n'), error: err.message || String(err) };
      });
    });
  }
  global.PythonRunner = { loadPyodide: loadPyodide, runCode: runCode };
})(window);
