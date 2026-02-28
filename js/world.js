(function(global) {
  var TILE_W = 64, TILE_H = 32, BLOCK_H = 28;

  var BLOCK_COLORS = {
    ground:  { top: '#5a9e3a', left: '#3d7a25', right: '#4a8c2e' },
    sand:    { top: '#d4b96a', left: '#a88b45', right: '#bda052' },
    brick:   { top: '#c0392b', left: '#922b21', right: '#a93226' },
    slab:    { top: '#95a5a6', left: '#6c7a7d', right: '#7f8c8d' },
    wood:    { top: '#8b6914', left: '#5c4510', right: '#6e5212' },
    stone:   { top: '#7f8c8d', left: '#566566', right: '#697475' },
    goal:    { top: 'rgba(255,220,50,0.35)', left: 'rgba(255,200,30,0.2)', right: 'rgba(255,210,40,0.25)', outline: true }
  };

  function toIso(x, y, z, offsetX, offsetY) {
    return {
      sx: (x - y) * TILE_W / 2 + offsetX,
      sy: (x + y) * TILE_H / 2 - z * BLOCK_H + offsetY
    };
  }

  function drawBlockFace(ctx, pts, color, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function drawBlock(ctx, x, y, z, type, offsetX, offsetY) {
    var colors = BLOCK_COLORS[type] || BLOCK_COLORS.brick;
    var p = toIso(x, y, z, offsetX, offsetY);
    var hw = TILE_W / 2, hh = TILE_H / 2, bh = BLOCK_H;
    var tx = p.sx, ty = p.sy;

    if (colors.outline) {
      // Goal block — draw glowing outline only
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 400));
      // top face
      drawBlockFace(ctx, [
        [tx, ty - bh], [tx + hw, ty - bh + hh], [tx, ty - bh + TILE_H], [tx - hw, ty - bh + hh]
      ], colors.top, '#f1c40f');
      // left face
      drawBlockFace(ctx, [
        [tx - hw, ty - bh + hh], [tx, ty - bh + TILE_H], [tx, ty + hh], [tx - hw, ty]
      ], colors.left, '#f1c40f');
      // right face
      drawBlockFace(ctx, [
        [tx, ty - bh + TILE_H], [tx + hw, ty - bh + hh], [tx + hw, ty], [tx, ty + hh]
      ], colors.right, '#f1c40f');
      ctx.restore();
      return;
    }

    var stroke = 'rgba(0,0,0,0.18)';
    // top face
    drawBlockFace(ctx, [
      [tx, ty - bh], [tx + hw, ty - bh + hh], [tx, ty - bh + TILE_H], [tx - hw, ty - bh + hh]
    ], colors.top, stroke);
    // left face
    drawBlockFace(ctx, [
      [tx - hw, ty - bh + hh], [tx, ty - bh + TILE_H], [tx, ty + hh], [tx - hw, ty]
    ], colors.left, stroke);
    // right face
    drawBlockFace(ctx, [
      [tx, ty - bh + TILE_H], [tx + hw, ty - bh + hh], [tx + hw, ty], [tx, ty + hh]
    ], colors.right, stroke);
  }

  function World(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blocks = {};   // key: "x,y,z" -> type string
    this.goals = [];    // [{x,y,z,type}]
    this.gridW = 8;
    this.gridH = 8;
    this.crane = null;
    this._animFrame = null;
    this._goalPulse = 0;
    var self = this;
    this._loop = function() {
      self._goalPulse = Date.now();
      self.render();
      self._animFrame = requestAnimationFrame(self._loop);
    };
  }

  World.prototype.init = function(levelWorld) {
    this.blocks = {};
    this.goals = [];
    this.gridW = levelWorld.size ? levelWorld.size[0] : 8;
    this.gridH = levelWorld.size ? levelWorld.size[1] : 8;
    // Auto-fill ground for entire grid so blocks always sit at z>=1
    for (var gx = 0; gx < this.gridW; gx++) {
      for (var gy = 0; gy < this.gridH; gy++) {
        this.setBlock(gx, gy, 0, 'ground');
      }
    }
    // Apply level-specific blocks (override ground or add stone/sand/wood)
    var bs = levelWorld.blocks || [];
    for (var i = 0; i < bs.length; i++) {
      this.setBlock(bs[i][0], bs[i][1], bs[i][2], bs[i][3]);
    }
    this.goals = (levelWorld.goal || []).map(function(g) {
      return { x: g[0], y: g[1], z: g[2], type: g[3] };
    });
  };

  World.prototype.setBlock = function(x, y, z, type) {
    if (type === null || type === undefined || type === '') {
      delete this.blocks[x + ',' + y + ',' + z];
    } else {
      this.blocks[x + ',' + y + ',' + z] = type;
    }
  };

  World.prototype.getBlock = function(x, y, z) {
    return this.blocks[x + ',' + y + ',' + z] || null;
  };

  World.prototype.removeBlock = function(x, y, z) {
    delete this.blocks[x + ',' + y + ',' + z];
  };

  World.prototype.getTopZ = function(x, y) {
    var max = -1;
    for (var key in this.blocks) {
      var parts = key.split(',');
      if (parseInt(parts[0]) === x && parseInt(parts[1]) === y) {
        var z = parseInt(parts[2]);
        if (z > max) max = z;
      }
    }
    return max;
  };

  World.prototype.checkGoal = function() {
    for (var i = 0; i < this.goals.length; i++) {
      var g = this.goals[i];
      if (this.getBlock(g.x, g.y, g.z) !== g.type) return false;
    }
    return this.goals.length > 0;
  };

  World.prototype.getOffset = function() {
    var cw = this.canvas.width, ch = this.canvas.height;
    var ox = cw / 2;
    var oy = ch / 2 - (this.gridW + this.gridH) * TILE_H / 4 + 60;
    return { x: ox, y: oy };
  };

  World.prototype.render = function() {
    var ctx = this.ctx;
    var cw = this.canvas.width, ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // sky gradient
    var grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(1, '#c9e8f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    var off = this.getOffset();
    var ox = off.x, oy = off.y;

    // collect all blocks sorted back-to-front (painter's algo)
    var allBlocks = [];
    for (var key in this.blocks) {
      var parts = key.split(',');
      allBlocks.push({ x: parseInt(parts[0]), y: parseInt(parts[1]), z: parseInt(parts[2]), type: this.blocks[key] });
    }
    allBlocks.sort(function(a, b) {
      var da = a.x + a.y - a.z * 0.01;
      var db = b.x + b.y - b.z * 0.01;
      return da - db;
    });

    for (var i = 0; i < allBlocks.length; i++) {
      var b = allBlocks[i];
      drawBlock(ctx, b.x, b.y, b.z, b.type, ox, oy);
    }

    // draw goal outlines
    for (var g = 0; g < this.goals.length; g++) {
      var gl = this.goals[g];
      if (!this.getBlock(gl.x, gl.y, gl.z)) {
        drawBlock(ctx, gl.x, gl.y, gl.z, 'goal', ox, oy);
      }
    }

    // draw crane
    if (this.crane) this.crane.draw(ctx, ox, oy);
  };

  World.prototype.startLoop = function() {
    if (!this._animFrame) this._animFrame = requestAnimationFrame(this._loop);
  };

  World.prototype.stopLoop = function() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
  };

  global.World = World;
  global.TILE_W = TILE_W;
  global.TILE_H = TILE_H;
  global.BLOCK_H = BLOCK_H;
  global.toIso = toIso;
})(window);
