(function() {
  function getQueryParam(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function init() {
    window.loadLevels(function(levels) {
      window.LEVELS = levels;
      var id = getQueryParam('id');
      var level = window.getLevelById(id) || (levels[0] || null);
      if (level && window.Editor && window.Editor.initGamePage) window.Editor.initGamePage(level);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
