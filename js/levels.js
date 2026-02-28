(function(global) {
  var LEVELS = [];
  function loadLevels(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'data/levels.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            LEVELS = Array.isArray(parsed) ? parsed : [];
            LEVELS.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
          } catch (e) { LEVELS = []; }
        } else {
          LEVELS = [];
        }
        if (callback) callback(LEVELS);
      }
    };
    xhr.onerror = function() { if (callback) callback([]); };
    xhr.send();
  }
  function getLevelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }
  global.LEVELS = LEVELS;
  global.loadLevels = loadLevels;
  global.getLevelById = getLevelById;
})(window);
