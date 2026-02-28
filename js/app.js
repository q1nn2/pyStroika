(function() {
  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function renderLevels() {
    var levels = window.LEVELS || [];
    var state = window.ProgressState.get();
    var list = document.getElementById('levelsList');
    if (!list) return;
    list.innerHTML = '';
    if (!levels.length) {
      list.innerHTML = '<p class="levels-error">Не удалось загрузить уровни. Проверьте, что файл data/levels.json доступен.</p>';
      return;
    }
    for (var i = 0; i < levels.length; i++) {
      var level = levels[i];
      var unlocked = window.ProgressState.isLevelUnlocked(level.id, levels);
      var done = state.completedLevels.indexOf(level.id) !== -1;
      var card = document.createElement('a');
      card.href = unlocked ? 'game.html?id=' + encodeURIComponent(level.id) : '#';
      card.className = 'level-card' + (done ? ' done' : '') + (unlocked ? '' : ' locked');
      card.innerHTML = '<div class="level-info"><h3>' + escapeHtml(level.title) + '</h3><p>' + escapeHtml(level.topic) + ' · ' + (level.points || 0) + ' очков</p></div><span class="level-badge">' + (done ? 'Пройден' : 'Уровень ' + (i + 1)) + '</span>';
      list.appendChild(card);
    }
  }
  function updateStats() {
    var state = window.ProgressState.get();
    var totalPoints = document.getElementById('totalPoints');
    var currentLevelNum = document.getElementById('currentLevelNum');
    if (totalPoints) totalPoints.textContent = state.totalPoints;
    if (currentLevelNum && window.LEVELS.length) {
      var next = -1;
      for (var i = 0; i < window.LEVELS.length; i++) {
        if (state.completedLevels.indexOf(window.LEVELS[i].id) === -1) { next = i; break; }
      }
      currentLevelNum.textContent = next === -1 ? window.LEVELS.length : next + 1;
    }
  }
  function init() {
    window.loadLevels(function(levels) {
      window.LEVELS = levels;
      renderLevels();
      updateStats();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
