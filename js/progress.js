(function(global) {
  var STORAGE_KEY = 'stroika_progress';
  function get() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { currentLevelId: null, completedLevels: [], totalPoints: 0 };
      var data = JSON.parse(raw);
      return {
        currentLevelId: data.currentLevelId || null,
        completedLevels: Array.isArray(data.completedLevels) ? data.completedLevels : [],
        totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : 0
      };
    } catch (e) { return { currentLevelId: null, completedLevels: [], totalPoints: 0 }; }
  }
  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function completeLevel(levelId, points) {
    var state = get();
    if (state.completedLevels.indexOf(levelId) !== -1) return state;
    state.completedLevels.push(levelId);
    state.totalPoints += (points || 0);
    state.currentLevelId = levelId;
    save(state);
    return state;
  }
  function isLevelUnlocked(levelId, levels) {
    if (!levels || !levels.length) return true;
    var idx = -1;
    for (var i = 0; i < levels.length; i++) { if (levels[i].id === levelId) { idx = i; break; } }
    if (idx <= 0) return true;
    return get().completedLevels.indexOf(levels[idx - 1].id) !== -1;
  }
  global.ProgressState = { get: get, save: save, completeLevel: completeLevel, isLevelUnlocked: isLevelUnlocked };
})(window);
