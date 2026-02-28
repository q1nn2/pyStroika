(function() {
  function getQueryParam(name) {
    var m = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function resizeCanvas() {
    var canvas = document.getElementById('gameCanvas');
    var wrap = document.getElementById('canvasWrap');
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight || 420;
    if (window.GameWorld) window.GameWorld.render();
  }

  function initWorld(level) {
    var canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    resizeCanvas();

    var world = new window.World(canvas);
    var crane = new window.Crane(world);

    if (level.world) {
      world.init(level.world);
      crane.init(level.world.crane || { x: 0, y: 0, dir: 'S' });
      if (level.world.carried) crane.carried = level.world.carried;
    }

    world.crane = crane;
    window.GameWorld = world;
    window.GameCrane = crane;
    world.startLoop();

    // update carried indicator in UI
    setInterval(function() {
      var el = document.getElementById('carriedInfo');
      if (el) {
        el.textContent = crane.carried ? 'Несёт: ' + crane.carried : 'Пусто';
        el.className = crane.carried ? 'carried-info has-block' : 'carried-info';
      }
    }, 200);

    window.addEventListener('resize', resizeCanvas);
  }

  function init() {
    window.loadLevels(function(levels) {
      window.LEVELS = levels;
      var id = getQueryParam('id');
      var level = window.getLevelById(id) || (levels[0] || null);
      if (level) {
        if (window.Editor && window.Editor.initGamePage) window.Editor.initGamePage(level);
        initWorld(level);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
