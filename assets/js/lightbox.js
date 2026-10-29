/* =========================================================================
   lightbox.js – Xem ảnh phóng to (gallery công trình, mẫu tủ, ảnh trang chủ)
   Chỉ nạp ở trang có #lightbox (trang chủ, chi tiết mẫu, công trình). Cần main.js nạp TRƯỚC (window.KT).
   Tách từ main.js (Giai đoạn 3) để trang không dùng thì không phải tải/phân tích.
   Nạp bằng <script src="..." defer></script> SAU main.js.
   ========================================================================= */
(function () {
  'use strict';
  var KT = window.KT;
  if (!KT) return;   // main.js lỗi/tải trễ: bỏ qua, trang vẫn dùng được như không JS

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ================================================================== */
  /* 4. LIGHTBOX xem ảnh phóng to (dùng cho gallery công trình & mẫu tủ)*/
  /* ================================================================== */
  (function lightboxModule() {
    var box = $('#lightbox');
    if (!box) return;

    var imgEl     = $('.lightbox__img', box);
    var captionEl = $('.lightbox__caption', box);
    var btnPrev   = $('.lightbox__btn--prev', box);
    var btnNext   = $('.lightbox__btn--next', box);
    var btnClose  = $('.lightbox__close', box);
    var figure    = $('.lightbox__figure', box) || box;
    if (!imgEl || !btnClose) return;

    /* Vòng xoay báo đang tải ảnh (thêm bằng JS, không đổi HTML gốc) */
    var spinner = document.createElement('span');
    spinner.className = 'lightbox__spinner';
    spinner.setAttribute('aria-hidden', 'true');
    figure.appendChild(spinner);
    if (captionEl) captionEl.setAttribute('aria-live', 'polite');

    /* Gợi ý phím tắt cho trình đọc màn hình (dòng ẩn, gắn qua aria-describedby của hộp thoại) */
    // (HTML đã có sẵn <p id="lightbox-keys">; chỉ tạo thêm khi trang không có, tránh trùng id)
    var keyHint = document.getElementById('lightbox-keys');
    if (!keyHint) {
      keyHint = document.createElement('span');
      keyHint.className = 'visually-hidden';
      keyHint.id = 'lightbox-keys';
      keyHint.textContent = 'Phím mũi tên trái phải để đổi ảnh, dấu cộng và dấu trừ để phóng to thu nhỏ, số 0 để về cỡ gốc, Esc để đóng.';
      box.appendChild(keyHint);
    }
    box.setAttribute('aria-describedby', keyHint.id);

    var MAX = 4;                                    // phóng tối đa 4 lần
    var items = [], index = 0, owner = null, opener = null;
    var isOpen = false, releaseTrap = null, inerted = [];
    var scale = 1, tx = 0, ty = 0, loadToken = 0, animTimer = 0;

    /* ---------- Hiển thị 1 ảnh trong nhóm ---------- */
    function applyT() {
      imgEl.style.transform = (scale === 1 && !tx && !ty)
        ? '' : 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
      box.classList.toggle('is-zoomed', scale > 1.02);
    }
    function animated(fn) {                         // đổi transform có chuyển động (tắt khi giảm chuyển động)
      if (!KT.reduced) {
        imgEl.classList.add('is-animating');
        clearTimeout(animTimer);
        animTimer = setTimeout(function () { imgEl.classList.remove('is-animating'); }, 320);
      }
      fn();
    }
    function preload() {
      if (items.length < 2) return;
      [index + 1, index - 1].forEach(function (j) {
        var it = items[(j + items.length) % items.length];
        if (it) { var im = new Image(); im.src = it.src; }
      });
    }
    function show(i, dir) {
      var n = items.length;
      index = ((i % n) + n) % n;
      var it = items[index];
      scale = 1; tx = 0; ty = 0;
      imgEl.style.opacity = '';
      imgEl.classList.remove('is-animating', 'is-slide-next', 'is-slide-prev');
      applyT();
      if (dir && !KT.reduced) {
        void imgEl.offsetWidth;
        imgEl.classList.add(dir > 0 ? 'is-slide-next' : 'is-slide-prev');
      }
      var token = ++loadToken;
      var same = imgEl.getAttribute('src') === it.src;
      // Chú thích (figcaption, aria-live) đã đọc nội dung này rồi: alt rỗng để trình đọc không đọc hai lần
      imgEl.alt = captionEl && it.caption ? '' : it.caption;
      if (!(same && imgEl.complete && imgEl.naturalWidth)) {
        box.classList.add('is-loading');
        imgEl.onload = imgEl.onerror = function () {
          if (token !== loadToken) return;
          box.classList.remove('is-loading');
          preload();
        };
      } else { box.classList.remove('is-loading'); preload(); }
      imgEl.setAttribute('src', it.src);
      if (captionEl) {
        captionEl.textContent = n > 1 ? it.caption + ' (' + (index + 1) + '/' + n + ')' : it.caption;
      }
    }
    imgEl.addEventListener('animationend', function () {
      imgEl.classList.remove('is-slide-next', 'is-slide-prev');
    });

    /* ---------- Mở / đóng ---------- */
    function open(list, i, from, ownerKey) {
      if (!list || !list.length) return;
      items = list;
      owner = ownerKey || null;
      opener = from || document.activeElement;
      if (!isOpen) {
        isOpen = true;
        box.classList.add('is-open');
        box.removeAttribute('aria-hidden');
        KT.lockScroll();
        inerted = KT.siblingsOf(box);
        KT.inert(inerted, true);
        releaseTrap = KT.trapFocus(box);
      }
      var multi = items.length > 1;
      if (btnPrev) btnPrev.hidden = !multi;           // chỉ hiện mũi tên khi có hơn 1 ảnh
      if (btnNext) btnNext.hidden = !multi;
      show(i, 0);
      // focus() ép style/layout đồng bộ → dời sang khung hình kế để handler ngắn (INP)
      requestAnimationFrame(function () {
        if (!isOpen) return;
        try { btnClose.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
      });
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      box.classList.remove('is-open', 'is-zoomed', 'is-loading');
      box.setAttribute('aria-hidden', 'true');
      KT.inert(inerted, false); inerted = [];
      if (releaseTrap) { releaseTrap({ restore: false }); releaseTrap = null; }
      KT.unlockScroll();
      var o = opener; opener = null;
      var ow = owner; owner = null;
      document.dispatchEvent(new CustomEvent('lightbox:close', { detail: { index: index, owner: ow } }));
      if (o && o.focus && document.contains(o)) {
        requestAnimationFrame(function () {           // focus() ép layout đồng bộ → để khung hình kế (INP)
          if (isOpen) return;
          try { o.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
        });
      }
      setTimeout(function () {                        // trả ảnh về trạng thái gốc sau khi mờ hẳn
        if (isOpen) return;
        scale = 1; tx = 0; ty = 0; imgEl.style.opacity = ''; applyT();
      }, 320);
    }
    function step(d) { if (items.length > 1) show(index + d, d); }

    /* ---------- Zoom / kéo / vuốt bằng Pointer Events ---------- */
    var ptrs = {}, g = null, gestureMoved = false;
    var lastTap = { t: 0, x: 0, y: 0 };

    function count() { return Object.keys(ptrs).length; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function baseCenter() {                           // tâm ảnh khi chưa dịch/zoom
      var r = imgEl.getBoundingClientRect();
      return { x: r.left + r.width / 2 - tx, y: r.top + r.height / 2 - ty };
    }
    function clampT() {
      var lx = Math.max(0, (imgEl.offsetWidth * scale - box.clientWidth) / 2);
      var ly = Math.max(0, (imgEl.offsetHeight * scale - box.clientHeight) / 2);
      tx = Math.max(-lx, Math.min(lx, tx));
      ty = Math.max(-ly, Math.min(ly, ty));
    }
    function settle() {                               // sau pinch: về 1 nếu nhỏ hơn, chặn quá MAX, kẹp biên
      if (scale < 1.05) { scale = 1; tx = 0; ty = 0; }
      else { scale = Math.min(scale, MAX); clampT(); }
      animated(applyT);
    }
    function snapBack() {
      scale = 1; tx = 0; ty = 0; imgEl.style.opacity = '';
      animated(applyT);
    }
    function zoomAt(x, y, s) {
      var c = baseCenter();
      var px = (x - c.x - tx) / scale, py = (y - c.y - ty) / scale;
      scale = s;
      tx = x - c.x - px * s; ty = y - c.y - py * s;
      if (scale <= 1.02) { scale = 1; tx = 0; ty = 0; } else clampT();
    }
    function startGesture() {
      var ids = Object.keys(ptrs), c = baseCenter();
      if (ids.length >= 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        g = { mode: 'pinch', d0: dist(a, b) || 1, s0: scale, c: c,
              px: (mx - c.x - tx) / scale, py: (my - c.y - ty) / scale };
      } else {
        var p = ptrs[ids[0]];
        g = { mode: scale > 1.02 ? 'pan' : 'idle', x0: p.x, y0: p.y, tx0: tx, ty0: ty, t0: Date.now(), axis: null };
      }
    }
    function onMove(e) {
      var p = ptrs[e.pointerId];
      if (!p || !g) return;
      p.x = e.clientX; p.y = e.clientY;
      if (g.mode === 'pinch') {
        var ids = Object.keys(ptrs);
        if (ids.length < 2) return;
        var a = ptrs[ids[0]], b = ptrs[ids[1]];
        var s = Math.max(0.6, Math.min(MAX * 1.25, g.s0 * dist(a, b) / g.d0));
        scale = s;
        tx = (a.x + b.x) / 2 - g.c.x - g.px * s;
        ty = (a.y + b.y) / 2 - g.c.y - g.py * s;
        gestureMoved = true;
        applyT();
        return;
      }
      var dx = p.x - g.x0, dy = p.y - g.y0;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) gestureMoved = true;
      if (g.mode === 'pan') { tx = g.tx0 + dx; ty = g.ty0 + dy; clampT(); applyT(); return; }
      if (g.mode !== 'idle' || e.pointerType === 'mouse') return;   // chuột: không vuốt chuyển ảnh
      if (!g.axis) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (g.axis === 'x') {
        if (items.length < 2) return;
        tx = dx; applyT();
      } else {
        ty = dy > 0 ? dy : dy * 0.2;
        imgEl.style.opacity = String(1 - Math.min(0.6, Math.max(0, dy) / 400));
        applyT();
      }
    }
    function endListeners() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }
    function onUp(e) {
      var p = ptrs[e.pointerId];
      if (!p) return;
      delete ptrs[e.pointerId];
      var left = count();
      if (g && g.mode === 'pinch') {
        settle();
        if (left === 1) {                             // còn 1 ngón: tiếp tục kéo nếu đang phóng
          startGesture();
          if (g.mode === 'idle') g.mode = 'none';
        } else if (left === 0) { g = null; endListeners(); }
        return;
      }
      if (left > 0 || !g) return;
      var gg = g; g = null;
      endListeners();
      if (e.type === 'pointercancel') { if (gg.mode === 'idle') snapBack(); return; }
      var dx = e.clientX - gg.x0, dy = e.clientY - gg.y0, dt = Math.max(1, Date.now() - gg.t0);
      if (Math.hypot(dx, dy) < 10 && dt < 500) {      // chạm: 2 lần liên tiếp = phóng / thu
        var now = Date.now();
        if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
          lastTap.t = 0;
          animated(function () { zoomAt(e.clientX, e.clientY, scale > 1.02 ? 1 : 2.5); applyT(); });
        } else { lastTap = { t: now, x: e.clientX, y: e.clientY }; }
        return;
      }
      if (gg.mode === 'idle') {
        if (gg.axis === 'x' && items.length > 1 &&
            (Math.abs(dx) > 60 || (Math.abs(dx) > 25 && Math.abs(dx) / dt > 0.5))) {
          step(dx < 0 ? 1 : -1);                      // vuốt sang trái = ảnh kế tiếp
          return;
        }
        if (gg.axis === 'y' && (dy > 100 || (dy > 40 && dy / dt > 0.6))) { close(); return; }   // vuốt xuống = đóng
        snapBack();
      } else if (gg.mode === 'pan') {
        clampT(); animated(applyT);
      }
    }
    box.addEventListener('pointerdown', function (e) {
      if (!isOpen || (e.target.closest && e.target.closest('.lightbox__btn'))) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (count() === 0) gestureMoved = false;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      imgEl.classList.remove('is-animating');
      startGesture();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
    box.addEventListener('wheel', function (e) {      // máy tính: lăn chuột / pinch trackpad để zoom
      if (!isOpen) return;
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.max(1, Math.min(MAX, scale * Math.exp(-e.deltaY * 0.002))));
      applyT();
    }, { passive: false });

    /* ---------- Nút & bàn phím ---------- */
    function keyZoom(f) {
      var r = box.getBoundingClientRect();
      animated(function () {
        zoomAt(r.left + box.clientWidth / 2, r.top + box.clientHeight / 2, Math.max(1, Math.min(MAX, scale * f)));
        applyT();
      });
    }
    btnClose.addEventListener('click', close);
    if (btnPrev) btnPrev.addEventListener('click', function () { step(-1); });
    if (btnNext) btnNext.addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) {
      if (e.target === box && !gestureMoved) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape')          { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft')  step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === '+' || e.key === '=') keyZoom(1.5);
      else if (e.key === '-')          keyZoom(1 / 1.5);
      else if (e.key === '0')          snapBack();
    });

    /* ---------- Nhóm ảnh từ thuộc tính data-lightbox (trang Công trình, v.v.) ----------
       Đọc lại ngay lúc bấm để luôn lấy đúng src/caption hiện tại.
       Phần tử đã được gallery trang chi tiết "nhận quản lý" (__ktOwned) thì bỏ qua. */
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-lightbox]') : null;
      if (!t || t.__ktOwned) return;
      e.preventDefault();
      var group = $$('[data-lightbox]').filter(function (el) { return !el.__ktOwned; });
      var list = group.map(function (el) {
        return { src: el.getAttribute('data-lightbox'), caption: el.getAttribute('data-caption') || '' };
      });
      open(list, Math.max(0, group.indexOf(t)), t);
    });

    KT.lightbox = { open: open, close: close, isOpen: function () { return isOpen; } };
  })();
})();
