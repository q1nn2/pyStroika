(function(global) {
  var DIRS = ['N', 'E', 'S', 'W'];
  var DIR_DX = { N: 0, E: 1, S: 0, W: -1 };
  var DIR_DY = { N: -1, E: 0, S: 1, W: 0 };

  var STEP_MS = 350; // ms per animation step

  function Crane(world) {
    this.world = world;
    this.x = 0;
    this.y = 0;
    this.dir = 'S';
    this.carried = null;  // block type being carried
    this.queue = [];      // animation steps
    this.busy = false;
    this._resolve = null;
    this._reject = null;
    this._stepTimer = null;
    // visual interpolation
    this.vx = 0; this.vy = 0;  // visual position
    this.animProgress = 1;
    this.fromX = 0; this.fromY = 0;
  }

  Crane.prototype.init = function(cfg) {
    this.x = cfg.x !== undefined ? cfg.x : 0;
    this.y = cfg.y !== undefined ? cfg.y : 0;
    this.dir = cfg.dir || 'S';
    this.carried = null;
    this.defaultBlock = cfg.defaultBlock || 'brick'; // always available supply
    this.vx = this.x; this.vy = this.y;
    this.fromX = this.x; this.fromY = this.y;
    this.animProgress = 1;
    this.queue = [];
    this.busy = false;
  };

  Crane.prototype.reset = function() {
    this.carried = null;
    this.queue = [];
    this.busy = false;
    if (this._stepTimer) { clearTimeout(this._stepTimer); this._stepTimer = null; }
    if (this._reject) { this._reject = null; }
    this._resolve = null;
  };

  // Enqueue a command; returns a promise resolved when fully done
  Crane.prototype._enqueue = function(fn) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.queue.push({ fn: fn, resolve: resolve, reject: reject });
      if (!self.busy) self._processNext();
    });
  };

  Crane.prototype._processNext = function() {
    if (this.queue.length === 0) { this.busy = false; return; }
    this.busy = true;
    var item = this.queue.shift();
    var self = this;
    try {
      var result = item.fn(self);
      // animate: set fromX/fromY and start lerp
      self.fromX = self.vx; self.fromY = self.vy;
      self.animProgress = 0;
      var startT = Date.now();
      function animStep() {
        var t = Math.min(1, (Date.now() - startT) / STEP_MS);
        self.animProgress = t;
        self.vx = self.fromX + (self.x - self.fromX) * t;
        self.vy = self.fromY + (self.y - self.fromY) * t;
        if (t < 1) {
          self._stepTimer = setTimeout(animStep, 16);
        } else {
          self.vx = self.x; self.vy = self.y;
          item.resolve(result);
          self._processNext();
        }
      }
      animStep();
    } catch (e) {
      item.reject(e);
      self._processNext();
    }
  };

  // Commands — each returns a promise
  Crane.prototype.move = function() {
    var self = this;
    return self._enqueue(function(c) {
      var nx = c.x + DIR_DX[c.dir];
      var ny = c.y + DIR_DY[c.dir];
      if (nx < 0 || nx >= c.world.gridW || ny < 0 || ny >= c.world.gridH) {
        throw new Error('Кран выехал за границу поля!');
      }
      c.x = nx; c.y = ny;
    });
  };

  Crane.prototype.turnLeft = function() {
    var self = this;
    return self._enqueue(function(c) {
      var i = DIRS.indexOf(c.dir);
      c.dir = DIRS[(i + 3) % 4];
    });
  };

  Crane.prototype.turnRight = function() {
    var self = this;
    return self._enqueue(function(c) {
      var i = DIRS.indexOf(c.dir);
      c.dir = DIRS[(i + 1) % 4];
    });
  };

  Crane.prototype.lift = function() {
    var self = this;
    return self._enqueue(function(c) {
      if (c.carried) throw new Error('Кран уже несёт блок!');
      var tx = c.x + DIR_DX[c.dir];
      var ty = c.y + DIR_DY[c.dir];
      var tz = c.world.getTopZ(tx, ty);
      if (tz < 0) throw new Error('Нет блока впереди для подъёма!');
      var type = c.world.getBlock(tx, ty, tz);
      c.world.removeBlock(tx, ty, tz);
      c.carried = type;
    });
  };

  Crane.prototype.place = function() {
    var self = this;
    return self._enqueue(function(c) {
      // Use lifted block if available, otherwise draw from default supply
      var blockType = c.carried || c.defaultBlock || 'brick';
      var tx = c.x + DIR_DX[c.dir];
      var ty = c.y + DIR_DY[c.dir];
      if (tx < 0 || tx >= c.world.gridW || ty < 0 || ty >= c.world.gridH) {
        throw new Error('Нельзя поставить блок за границей поля!');
      }
      var tz = c.world.getTopZ(tx, ty) + 1;
      c.world.setBlock(tx, ty, tz, blockType);
      if (c.carried) c.carried = null; // consuming lifted block
    });
  };

  // placeBlock(type) — place a specific block type without carrying
  Crane.prototype.placeBlock = function(type) {
    var self = this;
    return self._enqueue(function(c) {
      var tx = c.x + DIR_DX[c.dir];
      var ty = c.y + DIR_DY[c.dir];
      if (tx < 0 || tx >= c.world.gridW || ty < 0 || ty >= c.world.gridH) {
        throw new Error('Нельзя поставить блок за границей поля!');
      }
      var tz = c.world.getTopZ(tx, ty) + 1;
      c.world.setBlock(tx, ty, tz, type || 'brick');
    });
  };

  Crane.prototype.dig = function() {
    var self = this;
    return self._enqueue(function(c) {
      var tx = c.x + DIR_DX[c.dir];
      var ty = c.y + DIR_DY[c.dir];
      var tz = c.world.getTopZ(tx, ty);
      if (tz < 0) throw new Error('Нет блока впереди для сноса!');
      c.world.removeBlock(tx, ty, tz);
    });
  };

  Crane.prototype.look = function() {
    var self = this;
    return self._enqueue(function(c) {
      var tx = c.x + DIR_DX[c.dir];
      var ty = c.y + DIR_DY[c.dir];
      if (tx < 0 || tx >= c.world.gridW || ty < 0 || ty >= c.world.gridH) return 'wall';
      var tz = c.world.getTopZ(tx, ty);
      if (tz < 0) return 'empty';
      return c.world.getBlock(tx, ty, tz);
    });
  };

  // Returns a promise that resolves when the queue empties
  Crane.prototype.waitDone = function() {
    var self = this;
    return new Promise(function(resolve) {
      function check() {
        if (!self.busy && self.queue.length === 0) { resolve(); }
        else { setTimeout(check, 50); }
      }
      check();
    });
  };

  // Animate a pre-recorded command list (from CraneAPI.getQueue())
  Crane.prototype.runQueue = function(commands) {
    var self = this;
    var idx = 0;
    return new Promise(function(resolve, reject) {
      function next() {
        if (idx >= commands.length) { resolve(); return; }
        var item = commands[idx++];
        var p;
        try {
          switch (item.cmd) {
            case 'move':        p = self.move(); break;
            case 'turn_left':   p = self.turnLeft(); break;
            case 'turn_right':  p = self.turnRight(); break;
            case 'lift':        p = self.lift(); break;
            case 'place':       p = self.place(); break;
            case 'dig':         p = self.dig(); break;
            case 'place_block': p = self.placeBlock(item.arg); break;
            default: p = Promise.resolve(); break;
          }
          p.then(next, function(e) {
            reject(e);
          });
        } catch(e) { reject(e); }
      }
      next();
    });
  };

  // Draw the crane on the isometric canvas (camera-aware)
  Crane.prototype.draw = function(ctx, ox, oy) {
    var camera = (this.world && this.world.camera) || { angle: 0, zoom: 1, offsetX: 0, offsetY: 0 };
    var zoom = camera.zoom || 1;
    var rad = (camera.angle || 0) * Math.PI / 180;

    // Rotate visual position around grid center
    var cx = this.world ? this.world.gridW / 2 : 4;
    var cy = this.world ? this.world.gridH / 2 : 4;
    var dx = this.vx - cx, dy = this.vy - cy;
    var rx = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
    var ry = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;

    var TW = global.TILE_W, TH = global.TILE_H, BH = global.BLOCK_H;
    var hw = TW / 2 * zoom, hh = TH / 2 * zoom, bh = BH * zoom;

    // Screen position of crane (z=0, sitting on top of ground tile)
    var sx = (rx - ry) * TW / 2 * zoom + ox;
    var sy = (rx + ry) * TH / 2 * zoom + oy;

    var bodyColors = { top: '#f1c40f', left: '#c39a0e', right: '#d4ac0e' };
    var bodyScale = 0.7;
    var s_hw = hw * bodyScale, s_hh = hh * bodyScale, s_bh = bh * bodyScale;
    var bx = sx, by = sy - bh * 0.6;

    // top face
    ctx.beginPath();
    ctx.moveTo(bx, by - s_bh);
    ctx.lineTo(bx + s_hw, by - s_bh + s_hh);
    ctx.lineTo(bx, by - s_bh + s_hh * 2);
    ctx.lineTo(bx - s_hw, by - s_bh + s_hh);
    ctx.closePath();
    ctx.fillStyle = bodyColors.top; ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();

    // left face
    ctx.beginPath();
    ctx.moveTo(bx - s_hw, by - s_bh + s_hh);
    ctx.lineTo(bx, by - s_bh + s_hh * 2);
    ctx.lineTo(bx, by + s_hh);
    ctx.lineTo(bx - s_hw, by);
    ctx.closePath();
    ctx.fillStyle = bodyColors.left; ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();

    // right face
    ctx.beginPath();
    ctx.moveTo(bx, by - s_bh + s_hh * 2);
    ctx.lineTo(bx + s_hw, by - s_bh + s_hh);
    ctx.lineTo(bx + s_hw, by);
    ctx.lineTo(bx, by + s_hh);
    ctx.closePath();
    ctx.fillStyle = bodyColors.right; ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();

    // Crane arm: vertical pole + boom rotated with camera
    var poleH = 20 * zoom;
    var armX = bx, armY = by - s_bh - 4 * zoom;
    ctx.strokeStyle = '#e67e00';
    ctx.lineWidth = Math.max(1, 3 * zoom);
    ctx.beginPath(); ctx.moveTo(armX, armY); ctx.lineTo(armX, armY - poleH); ctx.stroke();

    // boom angle: world direction offset by camera rotation
    var dirAngles = { N: Math.PI * 1.25, E: Math.PI * 1.75, S: Math.PI * 0.25, W: Math.PI * 0.75 };
    var ang = (dirAngles[this.dir] || 0) - rad;
    var boomLen = 18 * zoom;
    var boomEndX = armX + Math.cos(ang) * boomLen;
    var boomEndY = armY - poleH + Math.sin(ang) * boomLen * 0.5;
    ctx.beginPath(); ctx.moveTo(armX, armY - poleH); ctx.lineTo(boomEndX, boomEndY); ctx.stroke();

    // hanging cable + carried block indicator
    if (this.carried) {
      var cableLen = 12 * zoom;
      ctx.strokeStyle = '#555'; ctx.lineWidth = Math.max(1, 1.5 * zoom);
      ctx.beginPath(); ctx.moveTo(boomEndX, boomEndY); ctx.lineTo(boomEndX, boomEndY + cableLen); ctx.stroke();
      var bw = 10 * zoom, bh2 = 8 * zoom;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(boomEndX - bw / 2, boomEndY + cableLen, bw, bh2);
      ctx.strokeStyle = '#999'; ctx.lineWidth = 0.5; ctx.strokeRect(boomEndX - bw / 2, boomEndY + cableLen, bw, bh2);
    }

    // direction arrow on body
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.max(8, Math.round(10 * zoom)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var arrowMap = { N: '↑', E: '→', S: '↓', W: '←' };
    ctx.fillText(arrowMap[this.dir] || '↓', bx, by - s_bh / 2);
  };

  global.Crane = Crane;
})(window);
