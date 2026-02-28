/*
 * camera-controls.js
 * Adds smooth interactive camera controls to the isometric canvas:
 *   - Left mouse drag  → rotate (angle)
 *   - Right mouse drag → pan (offsetX / offsetY)
 *   - Scroll wheel     → zoom
 *   - Touch 1 finger   → rotate
 *   - Touch 2 fingers  → pinch-zoom + pan
 *   - Reset button     → restore default camera
 */
(function(global) {

  function initCameraControls(canvas, world) {
    if (!canvas || !world) return;

    var cam = world.camera;
    var isDragging = false;
    var isRightDrag = false;
    var lastX = 0, lastY = 0;

    // ── Mouse ────────────────────────────────────────────────
    canvas.addEventListener('mousedown', function(e) {
      isDragging = true;
      isRightDrag = (e.button === 2);
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = isRightDrag ? 'grabbing' : 'grab';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      if (isRightDrag) {
        cam.offsetX += dx;
        cam.offsetY += dy;
      } else {
        cam.angle += dx * 0.4;
      }
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', function() {
      isDragging = false;
      canvas.style.cursor = 'default';
    });

    canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // ── Scroll wheel → zoom ──────────────────────────────────
    canvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 0.92 : 1.09;
      cam.zoom = Math.max(0.25, Math.min(4.0, cam.zoom * factor));
    }, { passive: false });

    // ── Touch ────────────────────────────────────────────────
    var lastTouchDist = null;
    var lastMidX = null, lastMidY = null;

    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        var t0 = e.touches[0], t1 = e.touches[1];
        lastTouchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        lastMidX = (t0.clientX + t1.clientX) / 2;
        lastMidY = (t0.clientY + t1.clientY) / 2;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1 && isDragging) {
        var dx = e.touches[0].clientX - lastX;
        cam.angle += dx * 0.4;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        var t0 = e.touches[0], t1 = e.touches[1];
        var dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        var midX = (t0.clientX + t1.clientX) / 2;
        var midY = (t0.clientY + t1.clientY) / 2;

        if (lastTouchDist) {
          var factor = dist / lastTouchDist;
          cam.zoom = Math.max(0.25, Math.min(4.0, cam.zoom * factor));
        }
        if (lastMidX !== null) {
          cam.offsetX += midX - lastMidX;
          cam.offsetY += midY - lastMidY;
        }
        lastTouchDist = dist;
        lastMidX = midX;
        lastMidY = midY;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      if (e.touches.length < 2) { lastTouchDist = null; lastMidX = null; lastMidY = null; }
      if (e.touches.length === 0) isDragging = false;
    });

    // ── Reset button ─────────────────────────────────────────
    var btnReset = document.getElementById('btnCameraReset');
    if (btnReset) {
      btnReset.addEventListener('click', function() {
        cam.angle   = 0;
        cam.zoom    = 1.0;
        cam.offsetX = 0;
        cam.offsetY = 0;
      });
    }

    // ── Zoom buttons ─────────────────────────────────────────
    var btnZoomIn  = document.getElementById('btnZoomIn');
    var btnZoomOut = document.getElementById('btnZoomOut');
    if (btnZoomIn)  btnZoomIn.addEventListener('click',  function() { cam.zoom = Math.min(4.0, cam.zoom * 1.2); });
    if (btnZoomOut) btnZoomOut.addEventListener('click', function() { cam.zoom = Math.max(0.25, cam.zoom / 1.2); });
  }

  global.initCameraControls = initCameraControls;

})(window);
