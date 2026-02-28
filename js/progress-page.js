(function() {
  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function render(state, levels) {
    var rv = document.getElementById('ratingValue');
    if (rv) rv.textContent = state.totalPoints;
    var totalLevels = levels.length;
    var completed = state.completedLevels.length;
    var percent = totalLevels ? Math.round((completed / totalLevels) * 100) : 0;
    var pb = document.getElementById('progressBar');
    if (pb) pb.style.width = percent + '%';
    var pp = document.getElementById('progressPercent');
    if (pp) pp.textContent = percent + '%';
    var topics = {};
    for (var i = 0; i < levels.length; i++) {
      var l = levels[i];
      if (!topics[l.topic]) topics[l.topic] = { done: 0, total: 0 };
      topics[l.topic].total++;
      if (state.completedLevels.indexOf(l.id) !== -1) topics[l.topic].done++;
    }
    var topicsList = document.getElementById('topicsList');
    if (!topicsList) return;
    topicsList.innerHTML = '';
    for (var t in topics) {
      var topic = topics[t];
      var p = topic.total ? Math.round((topic.done / topic.total) * 100) : 0;
      var el = document.createElement('div');
      el.className = 'topic-item';
      el.innerHTML = '<span class="topic-name">' + escapeHtml(t) + '</span> <span class="topic-done">' + topic.done + '/' + topic.total + '</span> (' + p + '%)';
      topicsList.appendChild(el);
    }
    var building = document.getElementById('buildingVisual');
    if (!building) return;
    building.innerHTML = '';
    var maxFloors = Math.max(1, totalLevels);
    for (var j = maxFloors - 1; j >= 0; j--) {
      var level = levels[j];
      var passed = level && state.completedLevels.indexOf(level.id) !== -1;
      var floor = document.createElement('div');
      floor.className = 'building-floor' + (passed ? ' building-floor-done' : '');
      floor.title = level ? escapeHtml(level.title) : 'Этаж ' + (j + 1);
      building.appendChild(floor);
    }
  }
  window.loadLevels(function(levels) {
    window.LEVELS = levels;
    render(window.ProgressState.get(), levels);
  });

  // Reset progress
  var btnReset   = document.getElementById('btnResetProgress');
  var modal      = document.getElementById('resetModal');
  var btnConfirm = document.getElementById('btnResetConfirm');
  var btnCancel  = document.getElementById('btnResetCancel');

  if (btnReset) {
    btnReset.addEventListener('click', function() {
      modal.hidden = false;
      modal.style.display = 'flex';
    });
  }
  if (btnCancel) {
    btnCancel.addEventListener('click', function() {
      modal.hidden = true;
      modal.style.display = 'none';
    });
  }
  if (btnConfirm) {
    btnConfirm.addEventListener('click', function() {
      localStorage.removeItem('stroika_progress');
      location.href = 'index.html';
    });
  }
})();
