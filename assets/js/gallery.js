/* =========================================================================
   gallery.js – Gallery ảnh trang chi tiết mẫu (vuốt, chấm, phóng to)
   Chỉ nạp ở trang chi tiết mẫu. Cần main.js nạp TRƯỚC; mở phóng to qua KT.lightbox (lightbox.js).
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
  /* 12. GALLERY TRANG CHI TIẾT: đổi ảnh lớn khi bấm ảnh nhỏ            */
  /* ================================================================== */
  (function productGalleryModule() {
    var gallery = $('.pgallery');
    if (!gallery) return;
    var main = $('.pgallery__main img', gallery);
    var mainLink = $('.pgallery__main', gallery);
    var thumbs = $$('.pgallery__thumb', gallery);
    if (!main || !mainLink || thumbs.length < 2) return;

    /* Dữ liệu ảnh lấy từ chính các ảnh nhỏ có sẵn trong HTML (không đổi nội dung) */
    var data = thumbs.map(function (btn) {
      var full = btn.getAttribute('data-full') || '';
      return { full: full, zoom: btn.getAttribute('data-zoom') || full, alt: btn.getAttribute('data-alt') || '' };
    });
    var n = data.length;

    function mk(tag, cls, attrs) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      return e;
    }
    function srcsetOf(url) {                          // dựng srcset 480/720/1000 từ URL ảnh (nếu có tham số w=)
      if (!/([?&]w=)\d+/.test(url)) return '';
      return [480, 720, 1000].map(function (w) {
        return url.replace(/([?&]w=)\d+/, function (m, p) { return p + w; }) + ' ' + w + 'w';
      }).join(', ');
    }

    /* ---------- Dựng khung vuốt: stage > track > slide ---------- */
    var stage = mk('div', 'pgallery__stage');
    var track = mk('div', 'pgallery__track', {
      role: 'group', 'aria-roledescription': 'carousel',
      'aria-label': 'Bộ ảnh mẫu tủ bếp, vuốt ngang để xem thêm'
    });
    track.tabIndex = 0;
    var links = [], imgs = [];
    data.forEach(function (d, i) {
      var slide = mk('div', 'pgallery__slide', {
        role: 'group', 'aria-roledescription': 'slide', 'aria-label': 'Ảnh ' + (i + 1) + ' / ' + n
      });
      if (i === 0) {                                  // ảnh đầu: dùng lại đúng nút + ảnh LCP có sẵn
        links[0] = mainLink; imgs[0] = main;
        gallery.insertBefore(stage, mainLink);
        slide.appendChild(mainLink);
      } else {
        var b = mk('button', 'pgallery__main ratio ratio--4x3', { type: 'button', 'aria-label': 'Phóng to ảnh: ' + d.alt });
        var im = mk('img', '', { alt: d.alt, width: '1000', height: '750', decoding: 'async', loading: 'lazy' });
        var sz = main.getAttribute('sizes');
        if (sz) im.setAttribute('sizes', sz);
        b.appendChild(im);
        slide.appendChild(b);
        links[i] = b; imgs[i] = im;
      }
      track.appendChild(slide);
    });
    stage.appendChild(track);

    var count = mk('span', 'pgallery__count', { 'aria-hidden': 'true' });
    var zoomIcon = mk('span', 'pgallery__zoom', { 'aria-hidden': 'true' });
    zoomIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>';
    var dotsWrap = mk('div', 'pgallery__dots', { role: 'group', 'aria-label': 'Chọn ảnh' });
    var dots = data.map(function (d, i) {
      var dot = mk('button', 'pgallery__dot', { type: 'button', 'aria-label': 'Xem ảnh ' + (i + 1) + ' / ' + n, 'aria-current': 'false' });
      dotsWrap.appendChild(dot);
      return dot;
    });
    var live = mk('p', 'sr-only', { role: 'status', 'aria-live': 'polite' });
    stage.appendChild(count);
    stage.appendChild(zoomIcon);
    stage.appendChild(dotsWrap);
    stage.appendChild(live);

    /* ---------- Nạp ảnh: ảnh đầu có sẵn; ảnh còn lại nạp khi người dùng chạm hoặc sau khi trang tải xong ---------- */
    function ensure(i) {
      if (i < 0 || i >= n) return;
      var im = imgs[i];
      if (im.getAttribute('src')) return;
      var ss = srcsetOf(data[i].full);
      if (ss) im.setAttribute('srcset', ss);
      im.setAttribute('src', data[i].full);
    }

    var idx = 0, lockUntil = 0, settleTimer = 0, raf = 0;
    function setActive(i, announce, quiet) {
      idx = i;
      dots.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      thumbs.forEach(function (t, j) { t.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      links.forEach(function (l, j) { l.tabIndex = j === i ? 0 : -1; });
      count.textContent = (i + 1) + ' / ' + n;
      if (announce) live.textContent = 'Ảnh ' + (i + 1) + ' trên ' + n + ': ' + data[i].alt;
      if (!quiet) { ensure(i); ensure(i + 1); ensure(i - 1); }
    }
    function go(i, instant) {
      i = Math.max(0, Math.min(n - 1, i));
      var smooth = !instant && !KT.reduced;
      lockUntil = smooth ? Date.now() + 700 : 0;
      setActive(i, !instant);
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    }
    function indexFromScroll() {
      var w = track.clientWidth;
      return w ? Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / w))) : idx;
    }
    track.addEventListener('scroll', function () {
      if (!raf) {
        raf = requestAnimationFrame(function () {
          raf = 0;
          if (Date.now() < lockUntil) return;         // đang cuộn theo lệnh bấm ảnh nhỏ / chấm
          var i = indexFromScroll();
          if (i !== idx) setActive(i, true);
        });
      }
      clearTimeout(settleTimer);                      // cuộn xong: chốt lại đúng ảnh đang hiển thị
      settleTimer = setTimeout(function () {
        var i = indexFromScroll();
        if (i !== idx) setActive(i, true);
      }, 140);
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End')  { e.preventDefault(); go(n - 1); }
    });
    var rz = 0;
    window.addEventListener('resize', function () {   // đổi cỡ màn hình / xoay: giữ nguyên ảnh đang xem
      clearTimeout(rz);
      rz = setTimeout(function () { track.scrollLeft = idx * track.clientWidth; }, 120);
    });

    /* ---------- Điều khiển ---------- */
    thumbs.forEach(function (btn, i) { btn.addEventListener('click', function () { go(i); }); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

    var lbItems = data.map(function (d) { return { src: d.zoom, caption: d.alt }; });
    links.forEach(function (l, i) {
      l.__ktOwned = true;                             // gallery tự mở lightbox (nhóm = đúng các ảnh của mẫu này)
      l.addEventListener('click', function (e) {
        e.preventDefault();
        if (KT.lightbox) KT.lightbox.open(lbItems, i, l, 'pgallery');
      });
    });
    document.addEventListener('lightbox:close', function (e) {   // đóng lightbox: gallery nhảy tới ảnh vừa xem
      if (!e.detail || e.detail.owner !== 'pgallery') return;
      go(e.detail.index, true);
      try { links[idx].focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
    });

    stage.addEventListener('pointerdown', function () { ensure(idx + 1); ensure(idx - 1); }, { passive: true });
    stage.addEventListener('focusin', function () { ensure(idx + 1); ensure(idx - 1); });

    setActive(0, false, true);
    function warm() { for (var i = 0; i < n; i++) ensure(i); }
    function afterLoad() {
      // Máy yếu / mạng chậm / Tiết kiệm dữ liệu: không nạp trước ảnh xa (chỉ nạp ảnh kề khi chạm/focus)
      var c = navigator.connection || {};
      if (KT.lowEnd || c.saveData) return;
      setTimeout(function () {
        if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 }); else warm();
      }, 1200);
    }
    if (document.readyState === 'complete') afterLoad(); else window.addEventListener('load', afterLoad);
  })();
})();
