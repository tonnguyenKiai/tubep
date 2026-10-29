/* =========================================================================
   main.js – LÕI tương tác dùng chung mọi trang (vanilla JS, không thư viện)
   Nạp bằng <script src="..." defer></script>
   Nguyên tắc: mỗi tính năng là một module nhỏ, tự kiểm tra sự tồn tại của
   phần tử trước khi chạy => dùng chung được cho mọi trang.
   Giai đoạn 3: các module chỉ vài trang cần đã tách thành file riêng, nạp SAU main.js:
     lightbox.js  (trang chủ, chi tiết mẫu, công trình)
     catalog.js   (danh mục mẫu: bộ lọc + bottom sheet)
     gallery.js   (chi tiết mẫu: gallery ảnh)
     estimator.js (bảng giá: công cụ dự toán)
   Mỗi file là một IIFE độc lập, chia sẻ window.KT do main.js tạo ra.
   ========================================================================= */
(function () {
  'use strict';

  // main.js đã chạy => gỡ trạng thái dự phòng (html.js-fail do bộ đếm 4 giây ở <head> thêm khi main.js tới trễ)
  document.documentElement.classList.remove('js-fail');

  /* ------------------------------------------------------------------ */
  /* CẤU HÌNH – đọc từ assets/js/config.js (nạp TRƯỚC main.js)           */
  /* Sửa URL Web App và Site Key Turnstile trong file đó, không sửa ở đây */
  /* ------------------------------------------------------------------ */
  var CFG = window.SITE_CONFIG || {};

  var WEB_APP_URL   = CFG.WEB_APP_URL || '';
  var TIMEOUT_MS    = CFG.REQUEST_TIMEOUT_MS || 15000;
  var MIN_FILL_MS   = (CFG.MIN_FILL_SECONDS || 3) * 1000;
  var HOTLINE       = CFG.HOTLINE || '0901 234 567';
  var HOTLINE_TEL   = CFG.HOTLINE_TEL || '0901234567';
  var ZALO_URL      = CFG.ZALO_URL || 'https://zalo.me/0901234567';

  // Chưa dán URL Web App => chạy chế độ demo: kiểm tra dữ liệu đầy đủ,
  // báo thành công, nhưng không gửi đi đâu (in ra Console để xem thử).
  var DEMO_MODE = !WEB_APP_URL || WEB_APP_URL.indexOf('DAN-URL') === 0;

  /* ------------------------------------------------------------------ */
  /* DỮ LIỆU MẪU TỦ BẾP (nguồn dữ liệu gốc)                              */
  /*                                                                     */
  /* QUAN TRỌNG CHO SEO: mảng này KHÔNG dùng để sinh HTML. Thẻ của từng  */
  /* mẫu đã nằm sẵn trong mau-tu-bep/index.html để Google đọc được, JS   */
  /* chỉ ẩn/hiện khi lọc. Mảng dưới đây là bản ghi chép tập trung giúp   */
  /* bạn thêm/sửa mẫu dễ dàng và để dùng cho các tiện ích về sau.        */
  /* Khi thêm một mẫu mới: thêm một phần tử ở đây VÀ dán thêm một thẻ    */
  /* <article class="model-card" data-model ...> tương ứng trong HTML.   */
  /* Giá trị data-* trong HTML phải khớp đúng các khoá bên dưới.         */
  /* ------------------------------------------------------------------ */
  var MODELS = [
    { slug: 'tu-bep-nhom-kinh-chu-l',        name: 'Tủ bếp nhôm kính chữ L vân gỗ',        material: 'kinh',          shape: 'chu-l',  color: 'van-go', price: 3200000, url: 'mau-tu-bep/tu-bep-nhom-kinh-chu-l.html' },
    { slug: 'tu-bep-nhom-acrylic-bong-guong', name: 'Tủ bếp nhôm cánh acrylic bóng gương', material: 'acrylic',       shape: 'chu-i',  color: 'trang',  price: 4100000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-xingfa-chu-u-alu',  name: 'Tủ bếp nhôm Xingfa chữ U cánh alu',    material: 'alu',           shape: 'chu-u',  color: 'xam',    price: 3600000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-kinh-co-dao',       name: 'Tủ bếp nhôm kính có đảo bếp',          material: 'kinh',          shape: 'co-dao', color: 'trang',  price: 4500000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-son-tinh-dien-chu-i', name: 'Tủ bếp nhôm sơn tĩnh điện chữ I',    material: 'son-tinh-dien', shape: 'chu-i',  color: 'trang',  price: 2600000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-kinh-den-mo-chu-l', name: 'Tủ bếp nhôm kính đen mờ chữ L',        material: 'kinh',          shape: 'chu-l',  color: 'den',    price: 3800000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-van-go-oc-cho-chu-u', name: 'Tủ bếp nhôm vân gỗ óc chó chữ U',    material: 'alu',           shape: 'chu-u',  color: 'van-go', price: 3900000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-acrylic-xam-chu-l', name: 'Tủ bếp nhôm acrylic xám chữ L',        material: 'acrylic',       shape: 'chu-l',  color: 'xam',    price: 4000000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-kinh-chu-i-can-ho', name: 'Tủ bếp nhôm kính chữ I căn hộ nhỏ',    material: 'kinh',          shape: 'chu-i',  color: 'trang',  price: 2900000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-alu-chu-l-van-go',  name: 'Tủ bếp nhôm cánh alu chữ L vân gỗ sáng', material: 'alu',         shape: 'chu-l',  color: 'van-go', price: 3300000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-son-tinh-dien-co-dao', name: 'Tủ bếp nhôm sơn tĩnh điện có đảo',  material: 'son-tinh-dien', shape: 'co-dao', color: 'xam',    price: 3500000, url: 'mau-tu-bep/index.html' },
    { slug: 'tu-bep-nhom-kinh-chu-u-den',    name: 'Tủ bếp nhôm kính cường lực chữ U đen', material: 'kinh',          shape: 'chu-u',  color: 'den',    price: 4300000, url: 'mau-tu-bep/index.html' }
  ];
  window.TU_BEP_MODELS = MODELS;   // tiện tra cứu nhanh trong Console

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ================================================================== */
  /* 0. TIỆN ÍCH GIAO DIỆN DÙNG CHUNG – gắn vào window.KT               */
  /*    Các module sau (và nhóm khác) chỉ GỌI: KT.reduced, KT.lowEnd,    */
  /*    KT.lockScroll/unlockScroll, KT.trapFocus, KT.inert, KT.sheet,    */
  /*    KT.toast, KT.bump, KT.measureBar                                 */
  /* ================================================================== */
  (function uiHelpers() {
    var root = document.documentElement;
    var KT = window.KT = window.KT || {};

    /* --- Giảm chuyển động / máy yếu --- */
    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    KT.reduced = mqReduce.matches;
    function onReduceChange(e) { KT.reduced = e.matches; }
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);
    else if (mqReduce.addListener) mqReduce.addListener(onReduceChange);

    var conn = navigator.connection || {};
    KT.lowEnd = !!(
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      conn.saveData ||
      ['slow-2g', '2g', '3g'].indexOf(conn.effectiveType) > -1
    );

    var mqMobile = window.matchMedia('(max-width: 899.98px)');
    KT.isMobile = function () { return mqMobile.matches; };

    /* --- Khoá cuộn nền: đếm tham chiếu, dừng/chạy lại Lenis --- */
    var locks = 0;
    KT.lockScroll = function () {
      if (locks++ === 0) {
        root.classList.add('is-locked');
        if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
      }
    };
    KT.unlockScroll = function () {
      if (locks === 0) return;
      if (--locks === 0) {
        root.classList.remove('is-locked');
        if (window.__lenis && window.__lenis.start) window.__lenis.start();
      }
    };

    /* --- inert cho nội dung phía sau lớp phủ (đếm tham chiếu theo phần tử) --- */
    KT.inert = function (els, on) {
      (els || []).forEach(function (el) {
        var n = el.__ktInert || 0;
        if (on) { el.__ktInert = n + 1; el.setAttribute('inert', ''); }
        else if (n > 0) { el.__ktInert = n - 1; if (n === 1) el.removeAttribute('inert'); }
      });
    };
    // Các phần tử con của <body> cần làm inert khi một lớp phủ mở (trừ chính lớp phủ, tổ tiên của nó, vùng toast)
    KT.siblingsOf = function (keep) {
      var keeps = [].concat(keep || []);
      return Array.prototype.filter.call(document.body.children, function (el) {
        if (/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/i.test(el.tagName)) return false;
        if (el.id === 'toast-region' || el.classList.contains('sprite')) return false;
        return !keeps.some(function (k) { return k && (el === k || el.contains(k)); });
      });
    };

    /* --- Bẫy focus (ngăn xếp): Tab xoay vòng trong container, trả focus khi nhả --- */
    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    function visibleFocusables(c) {
      return $$(FOCUSABLE, c).filter(function (el) {
        return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== 'hidden';
      });
    }
    var traps = [];
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !traps.length) return;
      var c = traps[traps.length - 1].el;
      var items = visibleFocusables(c);
      var tr = document.getElementById('toast-region');   // nút trong toast (vd. Hoàn tác) vẫn Tab tới được khi ngăn đang mở
      if (tr && !c.contains(tr)) items = items.concat(visibleFocusables(tr));
      if (!items.length) { e.preventDefault(); return; }
      var first = items[0], last = items[items.length - 1], a = document.activeElement;
      if (!c.contains(a) && !(tr && tr.contains(a))) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    });
    KT.trapFocus = function (container) {
      var entry = { el: container, prev: document.activeElement };
      traps.push(entry);
      var done = false;
      return function release(opts) {
        if (done) return;
        done = true;
        var i = traps.indexOf(entry);
        if (i > -1) traps.splice(i, 1);
        var p = entry.prev;
        if (!(opts && opts.restore === false) && p && p !== document.body && p.focus && document.contains(p)) {
          try { p.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
        }
      };
    };

    /* --- Toast: vùng #toast-region (aria-live) tạo sẵn để trình đọc màn hình nhận ra --- */
    function toastRegion() {
      var r = document.getElementById('toast-region');
      if (!r) {
        r = document.createElement('div');
        r.id = 'toast-region';
        r.setAttribute('role', 'status');
        r.setAttribute('aria-live', 'polite');
        document.body.appendChild(r);
      }
      return r;
    }
    toastRegion();
    KT.toast = function (msg, o) {
      o = o || {};
      var region = toastRegion();
      while (region.children.length >= 3) region.removeChild(region.firstElementChild);
      var t = document.createElement('div');
      t.className = 'toast';
      var txt = document.createElement('span');
      txt.textContent = msg;
      t.appendChild(txt);
      var timer = null, gone = false;
      function remove() { gone = true; if (t.parentNode) t.parentNode.removeChild(t); }
      function dismiss() {
        if (gone) return;
        if (timer) clearTimeout(timer);
        if (KT.reduced) { remove(); return; }
        t.classList.add('is-leaving');
        setTimeout(remove, 240);
      }
      if (o.label && typeof o.onAction === 'function') {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'toast__action';
        b.textContent = o.label;
        b.addEventListener('click', function () { try { o.onAction(); } finally { dismiss(); } });
        t.appendChild(b);
      }
      region.appendChild(t);
      var ms = o.timeout == null ? 4000 : o.timeout;     // 0 = không tự tắt
      if (ms > 0 && o.label && ms < 8000) ms = 8000;     // toast có nút hành động: đủ thời gian cho bàn phím/đọc màn hình (WCAG 2.2.1)
      // Tạm dừng đếm ngược khi rê chuột / focus trong toast / tab ẩn; chạy lại khi rời
      var left = ms, startedAt = 0, holds = 0;
      function arm() { if (ms > 0 && !gone && !holds) { startedAt = Date.now(); timer = setTimeout(dismiss, left); } }
      function hold() { if (holds++ === 0 && timer) { clearTimeout(timer); timer = null; left = Math.max(1500, left - (Date.now() - startedAt)); } }
      function release() { if (holds > 0 && --holds === 0) arm(); }
      t.addEventListener('pointerenter', hold);
      t.addEventListener('pointerleave', release);
      t.addEventListener('focusin', hold);
      t.addEventListener('focusout', release);
      function onVis() { if (gone) { document.removeEventListener('visibilitychange', onVis); return; } if (document.hidden) hold(); else release(); }
      document.addEventListener('visibilitychange', onVis);
      arm();
      return dismiss;
    };

    /* --- Nảy nhẹ 400ms (CSS .is-bump); giảm chuyển động thì bỏ qua --- */
    KT.bump = function (el) {
      if (!el || KT.reduced) return;
      el.classList.remove('is-bump');
      void el.offsetWidth;                                 // khởi động lại animation
      el.classList.add('is-bump');
      setTimeout(function () { el.classList.remove('is-bump'); }, 400);
    };

    /* --- Bottom sheet (cấu trúc .sheet): khoá cuộn, bẫy focus, Esc, backdrop, vuốt xuống để đóng --- */
    var sheets = [];
    function sheetState(el) {
      for (var i = 0; i < sheets.length; i++) if (sheets[i].el === el) return sheets[i];
      return null;
    }
    function resetSheetInline(st) {
      st.panel.style.transform = '';
      st.panel.style.transition = '';
      if (st.backdrop) st.backdrop.style.opacity = '';
    }
    function attachSwipe(st) {
      var panel = st.panel, backdrop = st.backdrop;
      var startY = 0, startT = 0, dy = 0, mode = 0;       // mode: 0 không, 1 chờ, 2 đang kéo
      panel.addEventListener('touchstart', function (e) {
        mode = 0;
        if (!mqMobile.matches || e.touches.length !== 1) return;
        // Không bắt đầu khi một vùng cuộn bên trong chưa ở đầu
        var n = e.target;
        while (n && n !== panel) {
          if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(window.getComputedStyle(n).overflowY) && n.scrollTop > 0) return;
          n = n.parentNode;
        }
        startY = e.touches[0].clientY; startT = Date.now(); dy = 0; mode = 1;
      }, { passive: true });
      panel.addEventListener('touchmove', function (e) {
        if (!mode) return;
        var d = e.touches[0].clientY - startY;
        if (mode === 1) {
          if (d < -6) { mode = 0; return; }
          if (d < 8) return;
          mode = 2;
          panel.style.transition = 'none';
          if (backdrop) backdrop.style.transition = 'none';
        }
        dy = Math.max(0, d);
        if (e.cancelable) e.preventDefault();
        panel.style.transform = 'translateY(' + dy + 'px)';
        if (backdrop) backdrop.style.opacity = String(Math.max(0, 1 - dy / Math.max(1, panel.offsetHeight)));
      }, { passive: false });
      function end(cancelled) {
        if (mode !== 2) { mode = 0; return; }
        mode = 0;
        var v = dy / Math.max(1, Date.now() - startT);
        if (backdrop) backdrop.style.transition = '';
        if (!cancelled && (dy > Math.min(120, panel.offsetHeight * 0.25) || v > 0.6)) {
          panel.style.transition = '';
          panel.style.transform = 'translateY(100%)';
          if (backdrop) backdrop.style.opacity = '0';
          KT.sheet.close(st.el);
        } else {
          resetSheetInline(st);
        }
      }
      panel.addEventListener('touchend', function () { end(false); }, { passive: true });
      panel.addEventListener('touchcancel', function () { end(true); }, { passive: true });
    }
    var stack = [];                                        // sheet đang mở, cái trên cùng ở cuối
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !stack.length) return;
      var st = stack[stack.length - 1];
      if (st.opts.dismissOnEsc === false) return;
      e.preventDefault();
      KT.sheet.close(st.el);
    });
    KT.sheet = {
      open: function (el, opts) {
        if (!el) return;
        var st = sheetState(el);
        if (st && st.active && !st.closing) return;
        if (st && st.closing) {                           // mở lại giữa lúc đang đóng: huỷ lần ẩn
          clearTimeout(st.hideTimer);
          st.closing = false;
          st.active = false;
        }
        opts = opts || {};
        var panel = el.querySelector('.sheet__panel') || el;
        var backdrop = el.querySelector('.sheet__backdrop');
        if (!st) {
          st = { el: el, panel: panel, backdrop: backdrop, opts: opts };
          sheets.push(st);
          el.addEventListener('click', function (e) {
            var s = sheetState(el);
            if (!s || s.closing) return;
            if (e.target === backdrop || (e.target.closest && (e.target.closest('.sheet__close') || e.target.closest('[data-sheet-close]')))) {
              KT.sheet.close(el);
            }
          });
          attachSwipe(st);
        }
        st.opts = opts;
        st.active = true;
        stack.push(st);
        st.opener = opts.opener || document.activeElement;
        if (!st.opener || st.opener === document.body) {
          st.opener = el.id ? document.querySelector('[aria-controls="' + el.id + '"]') : null;
        }
        resetSheetInline(st);
        el.removeAttribute('hidden');
        KT.lockScroll();
        st.inerted = KT.siblingsOf(el);
        KT.inert(st.inerted, true);
        st.release = KT.trapFocus(panel);
        // Khung hình 1: hết hidden (tính layout ngoài handler). Khung hình 2: thêm is-open để transition chạy, rồi focus.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (!st.active || st.closing) return;
            el.classList.add('is-open');
            var target = typeof opts.focus === 'string' ? el.querySelector(opts.focus) : opts.focus;
            target = target || el.querySelector('[data-autofocus]') || visibleFocusables(panel)[0] || panel;
            if (target === panel && !panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
            try { target.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
          });
        });
        el.dispatchEvent(new CustomEvent('sheet:open', { bubbles: true }));
      },
      close: function (el) {
        var st = sheetState(el);
        if (!st || !st.active || st.closing) return;
        st.closing = true;
        var si = stack.indexOf(st);
        if (si > -1) stack.splice(si, 1);
        el.classList.remove('is-open');
        KT.inert(st.inerted || [], false);
        if (st.release) st.release({ restore: false });
        KT.unlockScroll();
        var opener = st.opener;
        if (opener && opener.focus && document.contains(opener)) {
          requestAnimationFrame(function () {              // focus() ép layout đồng bộ → để khung hình kế (INP)
            if (stack.indexOf(st) > -1) return;            // đã mở lại: không giật focus
            try { opener.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
          });
        }
        function finish() {
          if (!st.closing) return;
          st.closing = false;
          st.active = false;
          el.setAttribute('hidden', '');
          resetSheetInline(st);
          el.dispatchEvent(new CustomEvent('sheet:close', { bubbles: true }));
          if (typeof st.opts.onClose === 'function') st.opts.onClose(el);
        }
        if (KT.reduced) finish();
        else st.hideTimer = setTimeout(finish, 320);
      }
    };

    /* --- Đo chiều cao thanh đáy thật → --bar-h (không gồm safe-area); ≥900 hoặc không có thanh → 0 --- */
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(probe);
    var barRO = null, watched = [];
    KT.measureBar = function () {
      var h = 0;
      if (mqMobile.matches) {
        var safe = parseFloat(window.getComputedStyle(probe).paddingBottom) || 0;
        $$('[data-bottom-bar]').forEach(function (b) {
          if (window.getComputedStyle(b).display === 'none') return;
          h = Math.max(h, b.offsetHeight - safe);
        });
      }
      root.style.setProperty('--bar-h', Math.max(0, Math.round(h)) + 'px');
      if (window.ResizeObserver) {
        if (!barRO) barRO = new ResizeObserver(function () { KT.measureBar(); });
        $$('[data-bottom-bar]').forEach(function (b) {
          if (watched.indexOf(b) < 0) { watched.push(b); barRO.observe(b); }
        });
      }
    };
    KT.measureBar();
    window.addEventListener('resize', KT.measureBar);
    window.addEventListener('orientationchange', KT.measureBar);
    window.addEventListener('load', KT.measureBar);
  })();

  /* ================================================================== */
  /* 1. MENU ĐIỀU HƯỚNG (hamburger trên mobile)                         */
  /* ================================================================== */
  (function navModule() {
    var root    = document.documentElement;
    var toggle  = $('.nav-toggle');
    var nav     = $('#main-nav');
    var overlay = $('.nav-overlay');
    var header  = $('.header');
    if (!toggle || !nav || !header) return;

    var mqDesk = window.matchMedia('(min-width: 900px)');
    var release = null, inerted = [];
    var LABEL_OPEN = 'Mở menu điều hướng', LABEL_CLOSE = 'Đóng menu điều hướng';

    function isOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }

    function open() {
      if (isOpen() || mqDesk.matches) return;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', LABEL_CLOSE);
      root.classList.remove('is-header-hidden');
      root.classList.add('is-nav-open');
      nav.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      KT.lockScroll();
      // Nội dung phía sau không focus/đọc được; header (có cả nút đóng) là vùng bẫy focus
      inerted = KT.siblingsOf([header, overlay]);
      KT.inert(inerted, true);
      release = KT.trapFocus(header);
      // Focus dời sang khung hình kế: focus() ép tính style/layout đồng bộ, kéo dài handler (INP)
      requestAnimationFrame(function () {
        if (!isOpen()) return;
        var first = $('a', nav);
        if (first) first.focus({ preventScroll: true });
      });
    }

    function close(returnFocus) {
      if (!isOpen()) return;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', LABEL_OPEN);
      root.classList.remove('is-nav-open');
      nav.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
      KT.inert(inerted, false);
      inerted = [];
      if (release) { release({ restore: false }); release = null; }
      KT.unlockScroll();
      // iOS không focus nút khi chạm → trả focus tường minh về nút mở menu (trừ khi đang chuyển trang / lên desktop)
      // (focus dời sang khung hình kế: focus() ép layout đồng bộ làm handler dài, ảnh hưởng INP)
      if (returnFocus) requestAnimationFrame(function () { if (!isOpen()) toggle.focus({ preventScroll: true }); });
    }

    toggle.addEventListener('click', function () { if (isOpen()) close(true); else open(); });
    if (overlay) overlay.addEventListener('click', function () { close(true); });

    // Esc đóng menu và trả focus về nút
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(true); }
    });

    // Bấm một mục trong menu thì đóng menu (không trả focus – trang sắp chuyển)
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { close(false); });
    });

    // Vuốt sang phải trên panel để đóng
    var sx = 0, sy = 0, tracking = false;
    nav.addEventListener('touchstart', function (e) {
      if (!isOpen() || e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    nav.addEventListener('touchmove', function (e) {
      if (!tracking) return;
      var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }
      if (dx > 70 && Math.abs(dy) < dx) { tracking = false; close(true); }
    }, { passive: true });
    nav.addEventListener('touchend', function () { tracking = false; }, { passive: true });

    // Lên desktop (xoay máy / kéo rộng cửa sổ) hoặc quay lại từ bfcache: trả menu về trạng thái bình thường
    function reset() { if (isOpen()) close(false); }
    if (mqDesk.addEventListener) mqDesk.addEventListener('change', function (e) { if (e.matches) reset(); });
    else if (mqDesk.addListener) mqDesk.addListener(function (e) { if (e.matches) reset(); });
    window.addEventListener('pageshow', function (e) { if (e.persisted) reset(); });
  })();

  /* ================================================================== */
  /* 2. HEADER đổ bóng khi cuộn + NÚT LÊN ĐẦU TRANG                     */
  /* ================================================================== */
  (function scrollUiModule() {
    var root   = document.documentElement;
    var header = $('.header');
    var toTop  = $('.to-top');
    var mqMobile = window.matchMedia('(max-width: 899.98px)');

    /* --- Header: đổ bóng khi cuộn; mobile: ẩn khi cuộn xuống, hiện khi cuộn lên --- */
    var ticking = false, lastY = window.scrollY || 0, acc = 0, accB = 0;
    var barScrollHidden = false, typingOn = false;       // thanh đáy ẩn vì cuộn xuống / vì đang nhập
    function setHeaderHidden(hide) {
      if (root.classList.contains('is-header-hidden') !== hide) root.classList.toggle('is-header-hidden', hide);
    }
    // html.is-bar-hidden = ẩn vì cuộn xuống HOẶC đang nhập (CSS: thanh đáy trượt xuống, nút nổi hạ xuống)
    function syncBar() { root.classList.toggle('is-bar-hidden', barScrollHidden || typingOn); }
    function setBarScrollHidden(hide) { if (barScrollHidden !== hide) { barScrollHidden = hide; syncBar(); } }
    function update() {
      ticking = false;
      var y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      if (header) header.classList.toggle('header--scrolled', y > 8);
      if (toTop)  toTop.classList.toggle('is-visible', y > 600);

      if (header) {
        var blocked = !mqMobile.matches || root.classList.contains('is-nav-open') || root.classList.contains('is-locked');
        if (blocked || y < 80) { setHeaderHidden(false); acc = 0; }
        else {
          var dy = y - lastY;
          if ((dy > 0 && acc < 0) || (dy < 0 && acc > 0)) acc = 0;   // đổi chiều → đo lại
          acc += dy;
          if (acc > 14) setHeaderHidden(true);
          else if (acc < -14) setHeaderHidden(false);
        }
      }
      // Thanh đáy: ẩn khi cuộn xuống, hiện khi cuộn lên; luôn hiện ở đầu trang, cuối trang và khi menu mở
      if (!root.classList.contains('is-locked')) {
        var maxY = document.documentElement.scrollHeight - window.innerHeight;
        var dyb = y - lastY;
        if (y < 80 || y > maxY - 120) { setBarScrollHidden(false); accB = 0; }
        else {
          if ((dyb > 0 && accB < 0) || (dyb < 0 && accB > 0)) accB = 0;
          accB += dyb;
          if (accB > 14) setBarScrollHidden(true);
          else if (accB < -14) setBarScrollHidden(false);
        }
      }
      lastY = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    // Focus bằng bàn phím vào header thì header phải hiện (CSS :focus-within lo phần hiển thị; ở đây giữ trạng thái đồng bộ)
    if (header) header.addEventListener('focusin', function () { setHeaderHidden(false); });

    // Skip-link: <main> cần focus được (tabindex=-1) để cảm ứng/Safari đưa focus vào nội dung; không vẽ viền khi focus bằng mã
    var mainEl = $('main[id]');
    if (mainEl) {
      if (!mainEl.hasAttribute('tabindex')) mainEl.setAttribute('tabindex', '-1');
      mainEl.style.outline = 'none';
    }

    if (toTop) {
      toTop.addEventListener('click', function () {
        // Nếu Lenis đang bật thì dùng API của Lenis, ngược lại dùng scroll gốc
        if (window.__lenis) { window.__lenis.scrollTo(0); }
        else {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        }
        var skip = $('.skip-link');
        if (skip) skip.focus({ preventScroll: true });
      });
    }

    /* --- Bàn phím ảo / ô nhập đang focus: ẩn thanh đáy + nút nổi (is-bar-hidden / is-typing) --- */
    var FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([type="file"]), textarea, select';
    var fieldFocused = false, vv = window.visualViewport;
    function applyTyping() {
      var kbd = !!(vv && window.innerHeight - vv.height > 150);
      var on = mqMobile.matches && (fieldFocused || kbd);
      typingOn = on;
      root.classList.toggle('is-typing', on);
      syncBar();
    }
    document.addEventListener('focusin', function (e) {
      fieldFocused = !!(e.target && e.target.matches && e.target.matches(FIELD));
      applyTyping();
    });
    document.addEventListener('focusout', function () {
      // chờ một nhịp: focus có thể chuyển sang ô nhập khác ngay sau đó
      setTimeout(function () {
        var a = document.activeElement;
        fieldFocused = !!(a && a.matches && a.matches(FIELD));
        applyTyping();
      }, 60);
    });
    if (vv) vv.addEventListener('resize', applyTyping);
    window.addEventListener('resize', applyTyping);

    /* --- Form đang nằm trong màn hình: gắn is-form-view (CSS ẩn nút nổi để không che mép phải ô nhập) --- */
    if ('IntersectionObserver' in window) {
      var inView = [];
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var i = inView.indexOf(en.target);
          if (en.isIntersecting && i < 0) inView.push(en.target);
          else if (!en.isIntersecting && i > -1) inView.splice(i, 1);
        });
        root.classList.toggle('is-form-view', inView.length > 0);
      }, { threshold: 0.1 });
      $$('form').forEach(function (f) { io.observe(f); });
    }

    /* --- Breadcrumb mobile: cuộn tới mục cuối (trang hiện tại) --- */
    var bc = $('.breadcrumb__list');
    function bcEnd() { if (bc && mqMobile.matches) bc.scrollLeft = bc.scrollWidth; }
    bcEnd();
    window.addEventListener('resize', bcEnd);
  })();

  /* ================================================================== */
  /* 3. FAQ ACCORDION (truy cập được bằng bàn phím)                     */
  /* ================================================================== */
  (function faqModule() {
    var buttons = $$('.faq__q');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!expanded));
        if (panel) { if (expanded) { panel.hidden = true; } else { panel.hidden = false; } }
      });
    });
  })();

  /* ================================================================== */
  /* 5. SLIDER SO SÁNH TRƯỚC / SAU THI CÔNG (tự viết, không thư viện)   */
  /* ================================================================== */
  (function compareModule() {
    $$('.compare').forEach(function (root) {
      var range  = $('.compare__range', root);
      var after  = $('.compare__after', root);
      var handle = $('.compare__handle', root);
      if (!range || !after || !handle) return;

      function apply(v) {
        // clip-path không gây reflow (khác với width) → kéo mượt, không hại INP
        after.style.clipPath = 'inset(0 ' + (100 - v) + '% 0 0)';
        handle.style.left = v + '%';
        // Trình đọc màn hình đọc "xx% ảnh sau thi công" thay vì chỉ con số trần
        range.setAttribute('aria-valuetext', v + '% là ảnh sau thi công');
      }
      range.addEventListener('input', function () { apply(range.value); });
      apply(range.value);
    });
  })();

  /* ================================================================== */
  /* 6. BẢN ĐỒ GOOGLE MAPS – chỉ tải khi cuộn tới hoặc khi bấm          */
  /* ================================================================== */
  (function mapModule() {
    var wraps = $$('.map-embed');
    if (!wraps.length) return;

    function load(wrap) {
      if (wrap.dataset.loaded === '1') return;
      wrap.dataset.loaded = '1';
      var iframe = document.createElement('iframe');
      iframe.src = wrap.getAttribute('data-map-src');
      iframe.title = wrap.getAttribute('data-map-title') || 'Bản đồ vị trí xưởng';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.setAttribute('allowfullscreen', '');
      iframe.width = '100%';
      iframe.height = wrap.getAttribute('data-map-height') || '260';
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
      wrap.appendChild(iframe);
      var ph = $('.map-embed__placeholder', wrap);
      if (ph) ph.remove();
    }

    wraps.forEach(function (wrap) {
      var ph = $('.map-embed__placeholder', wrap);
      if (ph) ph.addEventListener('click', function () { load(wrap); });

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { load(wrap); io.disconnect(); }
          });
        }, { rootMargin: '200px' });
        io.observe(wrap);
      }
    });
  })();

  /* ================================================================== */
  /* 7B. THÀNH PHẦN FORM DÙNG CHUNG (chỉ chạy khi có JS)                */
  /*     - KT.choice(select): đổi <select> ≤6 mục thành thẻ .choice     */
  /*       (select gốc vẫn là nguồn dữ liệu nên FormData không đổi)     */
  /*     - KT.stepper(input): ô số thành − [số] + kèm thanh trượt       */
  /* ================================================================== */
  (function formUi() {
    var KT = window.KT = window.KT || {};
    var seq = 0;

    function uid(p) { return p + '-' + (++seq); }
    function mk(tag, cls) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      return e;
    }
    function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

    /* ---------------- Thẻ lựa chọn thay <select> ---------------- */
    /* Radio dùng tên giả + form="kt-none" (không có form nào mang id này)
       => radio KHÔNG vào FormData, chỉ <select> ẩn được gửi như cũ. */
    function enhanceChoice(sel) {
      if (!sel || sel.__ktGroup) return;
      var field = sel.closest('.field');
      if (!field) return;

      var split = sel.getAttribute('data-choice') === 'split';   // tách "Tên – giá" thành 2 dòng
      var label = $('.field__label', field);
      var group = mk('div', 'choice-group ' + (split ? 'choice-group--stack' : 'choice-group--list'));
      group.setAttribute('role', 'radiogroup');
      if (label) {
        if (!label.id) label.id = uid('kt-lbl');
        group.setAttribute('aria-labelledby', label.id);
      }

      var name = uid('kt-choice');
      var radios = [];
      var blank = -1;                       // vị trí mục "— Chọn … —" (cho phép bỏ chọn)

      Array.prototype.forEach.call(sel.options, function (o, i) {
        var text = o.textContent.replace(/\s+/g, ' ').trim();
        if (o.value === '' && /^[—–-]/.test(text)) { blank = i; return; }

        var lab = mk('label', 'choice');
        var inp = mk('input', 'choice__input');
        inp.type = 'radio';
        inp.name = name;
        inp.value = String(i);
        inp.setAttribute('form', 'kt-none');

        var body = mk('span', 'choice__body');
        var tx = mk('span', 'choice__text');
        var k = split ? text.lastIndexOf(' – ') : -1;
        if (k > 0) {
          var main = mk('span', 'choice__main');
          main.textContent = text.slice(0, k);
          var sub = mk('span', 'choice__sub');
          sub.textContent = text.slice(k + 3);
          tx.appendChild(main);
          tx.appendChild(sub);
        } else {
          tx.textContent = text;
        }
        body.appendChild(tx);
        lab.appendChild(inp);
        lab.appendChild(body);
        group.appendChild(lab);
        radios.push(inp);

        // Bấm lại thẻ đang chọn => bỏ chọn (chỉ khi select có mục trống)
        inp.addEventListener('pointerdown', function () { inp.__was = inp.checked; });
        inp.addEventListener('click', function () {
          if (inp.__was && blank > -1) {
            inp.checked = false;
            sel.selectedIndex = blank;
            fire(sel, 'change');
          }
          inp.__was = false;
        });
        inp.addEventListener('change', function () {
          if (!inp.checked) return;
          sel.selectedIndex = parseInt(inp.value, 10);
          fire(sel, 'change');
        });
        // Bàn phím: Backspace / Delete trên thẻ đang chọn => bỏ chọn (Space không phát click bỏ chọn trên radio đã checked)
        inp.addEventListener('keydown', function (e) {
          if (blank < 0 || !inp.checked) return;
          if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            inp.checked = false;
            sel.selectedIndex = blank;
            fire(sel, 'change');
          }
        });
      });
      if (blank > -1 && radios.length) {
        var hint = mk('span', 'visually-hidden');
        hint.id = uid('kt-hint');
        hint.textContent = 'Nhấn Backspace hoặc Delete để bỏ chọn.';
        group.appendChild(hint);
        group.setAttribute('aria-describedby', hint.id);
        group.__ktKeyHint = hint.id;
      }

      function sync() {
        var si = sel.selectedIndex;
        radios.forEach(function (r) { r.checked = parseInt(r.value, 10) === si; });
      }

      sel.parentNode.insertBefore(group, sel.nextSibling);
      sel.hidden = true;
      sel.setAttribute('aria-hidden', 'true');
      sel.tabIndex = -1;
      sel.__ktGroup = group;
      sel.addEventListener('change', sync);
      if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(sync, 0); });
      sync();
    }
    KT.choice = enhanceChoice;

    /* ---------------- Bộ chỉnh số − / + và thanh trượt ---------------- */
    function enhanceNumber(input) {
      if (!input || input.__ktStep) return;
      input.__ktStep = true;

      var min = parseFloat(input.min); if (isNaN(min)) min = 0;
      var max = parseFloat(input.max); if (isNaN(max)) max = 100;
      var step = parseFloat(input.step) || 1;
      var dec = (String(step).split('.')[1] || '').length;
      var field = input.closest('.field');
      var lbl = field && $('.field__label', field) ? $('.field__label', field).textContent.trim() : '';

      function val() {
        var v = parseFloat(String(input.value).replace(',', '.'));
        return isNaN(v) ? 0 : v;
      }
      function clamp(v) { return Math.min(max, Math.max(min, v)); }

      var wrap = mk('div', 'stepper');
      input.parentNode.insertBefore(wrap, input);

      var minus = mk('button', 'stepper__btn');
      minus.type = 'button';
      minus.setAttribute('aria-label', 'Giảm ' + lbl);
      minus.innerHTML = iconSvg('minus');
      var plus = mk('button', 'stepper__btn');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'Tăng ' + lbl);
      plus.innerHTML = iconSvg('plus');

      var range = mk('input', 'stepper__range');
      range.type = 'range';
      range.min = String(min);
      range.max = String(max);
      range.step = String(step);
      range.setAttribute('aria-label', 'Kéo để chỉnh: ' + lbl);

      wrap.appendChild(minus);
      wrap.appendChild(input);
      wrap.appendChild(plus);
      wrap.appendChild(range);

      function paint() {
        var v = clamp(val());
        range.value = String(v);
        range.style.setProperty('--p', ((v - min) / (max - min) * 100).toFixed(1) + '%');
        minus.disabled = val() <= min;
        plus.disabled = val() >= max;
      }
      function setVal(v) {
        input.value = clamp(Math.round(v / step) * step).toFixed(dec);
        paint();
        fire(input, 'input');                // để công thức dự toán chạy lại
      }

      // Giữ nút để tăng/giảm liên tục
      function bind(btn, dir) {
        var t1 = null, t2 = null;
        function stop() { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; }
        btn.addEventListener('pointerdown', function (e) {
          if (e.button) return;
          setVal(val() + dir * step);
          stop();
          t1 = setTimeout(function () {
            t2 = setInterval(function () { setVal(val() + dir * step); }, 90);
          }, 450);
        });
        ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { btn.addEventListener(ev, stop); });
        btn.addEventListener('click', function (e) { if (e.detail === 0) setVal(val() + dir * step); });   // bàn phím
        btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      }
      bind(minus, -1);
      bind(plus, 1);

      range.addEventListener('input', function () { setVal(parseFloat(range.value)); });
      input.addEventListener('input', paint);
      input.addEventListener('change', paint);
      if (input.form) input.form.addEventListener('reset', function () { setTimeout(paint, 0); });
      paint();
    }
    KT.stepper = enhanceNumber;

    $$('select[data-choice]').forEach(enhanceChoice);
  })();

  /* ================================================================== */
  /* 9. HẠ TẦNG GỬI DỮ LIỆU VỀ GOOGLE SHEET                             */
  /*    Website tĩnh -> Google Apps Script Web App -> Google Sheet       */
  /* ================================================================== */

  /* --- 9.1 UTM: nhớ nguồn quảng cáo suốt phiên truy cập -------------- */
  var utmData = (function captureUtm() {
    var KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
    var data = {};
    var qs = new URLSearchParams(window.location.search);
    var found = false;

    KEYS.forEach(function (k) {
      var v = qs.get(k);
      if (v) { data[k] = String(v).slice(0, 100); found = true; }
    });

    try {
      if (found) {
        sessionStorage.setItem('tbn_utm', JSON.stringify(data));
      } else {
        var saved = sessionStorage.getItem('tbn_utm');
        if (saved) data = JSON.parse(saved) || {};
      }
    } catch (e) {
      // Trình duyệt chặn storage (chế độ ẩn danh…) => vẫn chạy bình thường
    }
    return data;
  })();

  /* --- 9.2 Báo chuyển đổi cho GA4 ------------------------------------ */
  function trackLead(source) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          form_source: source,
          currency: 'VND',
          value: 1
        });
      } else if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        // Trường hợp cài GA4 thông qua Google Tag Manager
        window.dataLayer.push({ event: 'generate_lead', form_source: source });
      }
    } catch (e) { /* lỗi đo lường không được làm hỏng việc gửi form */ }
  }

  /* --- 9.3 Cloudflare Turnstile -------------------------------------- */
  /* Chỉ nạp khi đã khai báo Site Key trong config.js, và chỉ nạp lúc khách
     chạm vào form lần đầu. Nhờ vậy trang mới mở không tốn thêm byte nào
     (api.js của Turnstile nặng ~27KB sau nén) => giữ nguyên ngân sách JS. */
  var TS_KEY = CFG.TURNSTILE_SITE_KEY || '';
  var tsDaNap = false;

  function napTurnstile() {
    if (tsDaNap || !TS_KEY) return;
    var boxes = $$('[data-turnstile]');
    if (!boxes.length) return;
    tsDaNap = true;

    window.__tsRender = function () {
      boxes.forEach(function (box) {
        box.__tsId = window.turnstile.render(box, {
          sitekey: TS_KEY,
          appearance: 'interaction-only',   // dạng "managed": chỉ hiện khi bị nghi ngờ
          'refresh-expired': 'auto',
          language: 'vi'
        });
      });
    };

    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__tsRender';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  /* Khách vừa chạm/đặt con trỏ vào form => nạp ngay, tới lúc bấm gửi là có mã */
  (function hen() {
    if (!TS_KEY) return;
    $$('[data-turnstile]').forEach(function (box) {
      var form = box.closest('form');
      if (!form || form.__tsHook) return;
      form.__tsHook = true;
      form.addEventListener('focusin', napTurnstile, { once: true });
      form.addEventListener('pointerdown', napTurnstile, { once: true });
    });
  })();

  function turnstileToken(form) {
    var box = $('[data-turnstile]', form);
    if (!box || !window.turnstile || box.__tsId === undefined) return '';
    try { return window.turnstile.getResponse(box.__tsId) || ''; } catch (e) { return ''; }
  }

  function turnstileReset(form) {
    var box = $('[data-turnstile]', form);
    if (!box || !window.turnstile || box.__tsId === undefined) return;
    try { window.turnstile.reset(box.__tsId); } catch (e) { /* bỏ qua */ }
  }

  /* Chờ Turnstile sinh mã (tối đa hanMs) rồi mới gửi đi */
  function doiToken(form, hanMs) {
    if (!TS_KEY || !$('[data-turnstile]', form)) return Promise.resolve('');
    napTurnstile();
    var het = Date.now() + (hanMs || 8000);
    return new Promise(function (resolve) {
      (function thu() {
        var t = turnstileToken(form);
        if (t || Date.now() > het) return resolve(t);
        setTimeout(thu, 200);
      })();
    });
  }

  /* --- 9.4 Gửi một bản ghi lên Web App ------------------------------- */
  function sendToSheet(payload) {
    // Dùng URLSearchParams chứ KHÔNG dùng JSON: trình duyệt sẽ gửi
    // Content-Type: application/x-www-form-urlencoded nên không phát sinh
    // preflight OPTIONS – thứ mà Google Apps Script không trả lời được.
    var body = new URLSearchParams();

    Object.keys(payload).forEach(function (k) {
      var v = payload[k];
      if (v !== undefined && v !== null && v !== '') body.append(k, v);
    });
    Object.keys(utmData).forEach(function (k) { body.append(k, utmData[k]); });

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var hetGio = false;
    var timer = setTimeout(function () {
      hetGio = true;
      if (ctrl) ctrl.abort();
    }, TIMEOUT_MS);

    return fetch(WEB_APP_URL, {
      method: 'POST',
      body: body,
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res || res.ok !== true) {
          var err = new Error('Máy chủ từ chối dữ liệu.');
          err.friendly = res && res.error ? res.error : '';
          throw err;
        }
        return res;
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (hetGio) {
          var e = new Error('timeout');
          e.friendly = 'Mạng đang chậm nên sau 15 giây vẫn chưa gửi xong.';
          throw e;
        }
        throw err;
      });
  }

  /* --- 9.5 Thoát ký tự HTML khi dựng chuỗi hiển thị ------------------ */
  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Câu nhắc chung: giá cuối cùng luôn phải khảo sát tận nơi */
  var LOI_NHAC_KHAO_SAT =
    'Mức giá trên website là giá tham khảo. Giá chính xác chỉ có sau khi kỹ thuật ' +
    'viên khảo sát và đo đạc thực tế tại nhà bạn (miễn phí).';

  /* --- Biểu tượng trong sprite của trang --- */
  function iconSvg(id) {
    return '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-' + id + '"/></svg>';
  }

  /* --- Thẻ "Đã nhận thông tin" dùng chung cho mọi form ----------------
     container: nơi chèn thẻ (form hoặc thân ngăn báo giá)
     o: { text, note, demo, more: { label, href } | { label }, onMore }
     Focus chuyển vào tiêu đề để trình đọc màn hình đọc ngay kết quả. */
  var LOI_DA_NHAN =
    'Cảm ơn bạn! Chúng tôi đã nhận được yêu cầu và sẽ gọi lại trong vòng 30 phút (giờ hành chính).';
  var LOI_DEMO =
    'Đã ghi nhận yêu cầu (chế độ demo – chưa nối với Google Sheet). ' +
    'Hãy dán URL Web App vào assets/js/config.js để lưu dữ liệu thật.';

  function renderDone(container, o) {
    o = o || {};
    var more = o.more || {};
    var el = document.createElement('div');
    el.className = 'form__done';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="form__done-icon" aria-hidden="true">' + iconSvg('check') + '</span>' +
      '<p class="form__done-title" tabindex="-1">Đã nhận thông tin</p>' +
      '<p class="form__done-text">' + escHtml(o.text || LOI_DA_NHAN) + '</p>' +
      '<p class="form__done-note">' + escHtml(o.note || LOI_NHAC_KHAO_SAT) + '</p>' +
      (o.demo ? '<p class="form__done-note">' + escHtml(LOI_DEMO) + '</p>' : '') +
      '<div class="form__done-actions">' +
        '<a class="btn btn--primary btn--lg" href="' + escHtml(ZALO_URL) + '" target="_blank" rel="noopener">' +
          iconSvg('zalo') + 'Nhắn Zalo ngay</a>' +
        (more.href
          ? '<a class="btn btn--outline btn--lg" href="' + escHtml(more.href) + '">' + escHtml(more.label) + '</a>'
          : '<button class="btn btn--outline btn--lg" type="button" data-done-more>' +
              escHtml(more.label || 'Gửi thêm yêu cầu') + '</button>') +
      '</div>';
    container.appendChild(el);

    var btn = el.querySelector('[data-done-more]');
    if (btn && typeof o.onMore === 'function') {
      btn.addEventListener('click', function () { o.onMore(el); });
    }

    var reduced = !!(window.KT && window.KT.reduced);
    var r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
    var title = el.querySelector('.form__done-title');
    try { title.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
    return el;
  }



  /* ================================================================== */
  /* 9B. DANH SÁCH BÁO GIÁ (thay cho giỏ hàng)                          */
  /*     - nút "Thêm vào danh sách báo giá" ở thẻ mẫu & trang chi tiết  */
  /*     - biểu tượng trên header kèm số đếm                            */
  /*     - bottom sheet (KT.sheet): ảnh nhỏ, xoá + hoàn tác, form gửi   */
  /* ================================================================== */
  (function quoteListModule() {
    var KEY = 'tbn_danh_sach_bao_gia';
    var TOI_DA = 12;                       // tránh danh sách vô tận
    var KT = window.KT || {};

    var drawer   = $('#quote-drawer');
    var openBtns = $$('[data-quote-open]');
    var counts   = $$('[data-quote-count]');
    var addBtns  = $$('[data-add-quote]');
    if (!drawer && !addBtns.length) return;

    var bodyEl    = drawer ? $('.sheet__body', drawer) : null;
    var titleEl   = drawer ? $('.sheet__title', drawer) : null;
    var itemsEl   = drawer ? $('[data-quote-items]', drawer) : null;
    var emptyEl   = drawer ? $('[data-quote-empty]', drawer) : null;
    var successEl = drawer ? $('[data-quote-success]', drawer) : null;
    var formEl    = drawer ? $('form[data-quote-form]', drawer) : null;
    var modelsEl  = formEl ? $('input[name="models"]', formEl) : null;
    var moreLink  = emptyEl ? $('a', emptyEl) : null;
    var doneEl    = null;                  // thẻ "Đã nhận thông tin" trong ngăn
    var huyUndo   = null;                  // hàm tắt toast "Hoàn tác" đang hiện

    /* -------- Lưu trữ: localStorage, hỏng thì dùng bộ nhớ tạm -------- */
    var boNho = null;   // bản sao trong RAM, dùng khi localStorage bị chặn

    function doc() {
      if (boNho) return boNho;
      try {
        var raw = localStorage.getItem(KEY);
        boNho = raw ? (JSON.parse(raw) || []) : [];
      } catch (e) {
        boNho = [];     // vẫn hoạt động bình thường trong phiên hiện tại
      }
      if (!Array.isArray(boNho)) boNho = [];
      return boNho;
    }

    function ghi(ds) {
      boNho = ds;
      try { localStorage.setItem(KEY, JSON.stringify(ds)); } catch (e) { /* bỏ qua */ }
      ve();
    }

    /* ------------------------- Vẽ lại giao diện ---------------------- */
    function ve() {
      var ds = doc();

      counts.forEach(function (c) {
        c.textContent = ds.length;
        c.hidden = ds.length === 0;
      });
      openBtns.forEach(function (b) {
        b.setAttribute('aria-label', ds.length
          ? 'Danh sách báo giá (' + ds.length + ' mẫu)'
          : 'Danh sách báo giá (chưa có mẫu nào)');
      });

      // Nút "Thêm vào danh sách" đổi trạng thái theo những gì đã chọn
      addBtns.forEach(function (b) {
        var co = ds.some(function (m) { return m.slug === b.getAttribute('data-slug'); });
        b.classList.toggle('is-added', co);
        var lb = $('[data-add-quote-label]', b) || b;
        if (co && b.closest('.mobile-bar')) {
          // Thanh đáy: sau khi thêm, nút thành lối tắt mở ngăn "Xem danh sách (n)" (không cần săn toast / biểu tượng header)
          b.removeAttribute('aria-pressed');
          lb.textContent = 'Xem danh sách (' + ds.length + ')';
        } else {
          b.setAttribute('aria-pressed', co ? 'true' : 'false');
          lb.textContent = co ? 'Đã có trong danh sách' : (b.getAttribute('data-label') || 'Thêm vào danh sách báo giá');
        }
      });

      if (!itemsEl) return;

      itemsEl.innerHTML = ds.map(function (m, i) {
        return '<li class="quote-item">' +
            '<span class="quote-item__thumb">' +
              (m.img
                ? '<img src="' + escHtml(m.img) + '" alt="" width="64" height="64" loading="lazy" decoding="async">'
                : iconSvg('list')) +
            '</span>' +
            '<div class="quote-item__info">' +
              (m.url
                ? '<a class="quote-item__name" href="' + escHtml(m.url) + '">' + escHtml(m.name) + '</a>'
                : '<span class="quote-item__name">' + escHtml(m.name) + '</span>') +
              (m.price ? '<span class="quote-item__price">từ ' + escHtml(m.price) + '</span>' : '') +
            '</div>' +
            '<button class="quote-item__del" type="button" data-quote-del="' + i + '" ' +
                    'aria-label="Xoá ' + escHtml(m.name) + '">' + iconSvg('trash') + '</button>' +
          '</li>';
      }).join('');

      if (successEl) successEl.hidden = true;           // lời cảm ơn gốc nằm trong HTML; thẻ .form__done thay thế
      if (emptyEl) emptyEl.hidden = ds.length > 0 || !!doneEl;
      if (formEl)  formEl.hidden  = ds.length === 0;
      if (modelsEl) {
        modelsEl.value = ds.map(function (m) { return m.name; }).join(' · ');
      }
    }

    function xoaThanhCong() {
      if (doneEl && doneEl.parentNode) doneEl.parentNode.removeChild(doneEl);
      doneEl = null;
    }

    /* ----------------- Đổi href tương đối thành tuyệt đối ------------ */
    function duongDanTuyetDoi(href) {
      if (!href) return '';
      try { return new URL(href, window.location.href).href; }
      catch (e) { return href; }
    }

    /* Ảnh nhỏ của mẫu: ảnh trong thẻ mẫu, hoặc ảnh chính ở trang chi tiết */
    function anhMau(btn) {
      var card = btn.closest('.model-card');
      var img = card ? $('img', card) : $('main img');
      var src = img ? (img.currentSrc || img.src || '') : '';
      return src.replace(/([?&]w=)\d+/, function (m, p) { return p + '160'; });
    }

    /* --------------------------- Thêm / xoá -------------------------- */
    function them(mau) {
      var ds = doc().slice();
      if (ds.some(function (m) { return m.slug === mau.slug; })) return 'co-roi';
      if (ds.length >= TOI_DA) return 'day';
      ds.push(mau);
      xoaThanhCong();
      ghi(ds);
      return 'da-them';
    }

    function xoa(i) {
      var ds = doc().slice();
      var bo = ds.splice(i, 1)[0];
      if (!bo) return;
      ghi(ds);

      // Hoàn tác trong vài giây
      if (huyUndo) huyUndo();
      huyUndo = KT.toast ? KT.toast('Đã xoá “' + bo.name + '”', {
        label: 'Hoàn tác',
        timeout: 6000,
        onAction: function () {
          var cur = doc().slice();
          if (cur.some(function (m) { return m.slug === bo.slug; })) return;
          cur.splice(Math.min(i, cur.length), 0, bo);
          ghi(cur);
          var btnDel = $$('.quote-item__del', itemsEl)[Math.min(i, cur.length - 1)];
          if (btnDel) btnDel.focus();
        }
      }) : null;

      // Đưa focus về mục kế tiếp (hoặc tiêu đề khi danh sách trống)
      var dels = $$('.quote-item__del', itemsEl);
      var next = dels[Math.min(i, dels.length - 1)];
      if (next) next.focus();
      else if (titleEl) titleEl.focus();
    }

    addBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Nút ở thanh đáy đã thêm rồi => mở thẳng ngăn danh sách
        if (btn.classList.contains('is-added') && btn.closest('.mobile-bar') && drawer && KT.sheet) { moDrawer(btn); return; }
        var mau = {
          slug:  btn.getAttribute('data-slug') || '',
          name:  btn.getAttribute('data-name') || '',
          price: btn.getAttribute('data-price') || '',
          // URL lưu ở dạng tuyệt đối: mẫu thêm ở /mau-tu-bep/ vẫn mở đúng
          // khi khách bấm vào danh sách từ một trang ở thư mục khác
          url:   duongDanTuyetDoi(btn.getAttribute('data-url')),
          img:   anhMau(btn)
        };
        var kq = them(mau);
        var xem = { label: 'Xem danh sách', onAction: function () { moDrawer(btn); } };

        if (!KT.toast) { if (kq === 'da-them') moDrawer(btn); return; }
        if (kq === 'da-them') {
          KT.toast('Đã thêm “' + mau.name + '”', { label: xem.label, onAction: xem.onAction, timeout: 5000 });
          (counts.length ? counts : []).forEach(function (c) { KT.bump(c); });
        } else if (kq === 'co-roi') {
          KT.toast('Mẫu này đã có trong danh sách.', { label: xem.label, onAction: xem.onAction, timeout: 4000 });
        } else {
          KT.toast('Danh sách đã đủ ' + TOI_DA + ' mẫu. Bạn xoá bớt một mẫu để thêm mẫu mới nhé.',
            { label: xem.label, onAction: xem.onAction, timeout: 5000 });
        }
      });
    });

    if (itemsEl) {
      itemsEl.addEventListener('click', function (e) {
        var del = e.target.closest('[data-quote-del]');
        if (!del) return;
        xoa(parseInt(del.getAttribute('data-quote-del'), 10));
      });
    }

    /* ------------------------- Mở ngăn báo giá ----------------------- */
    /* Ngăn là .sheet: KT.sheet lo khoá cuộn, bẫy focus, Esc, vuốt xuống để đóng.
       Chỉ mở khi người dùng bấm biểu tượng danh sách hoặc "Xem danh sách" – không tự mở. */
    function moDrawer(trigger) {
      if (!drawer || !KT.sheet) return;
      KT.sheet.open(drawer, { opener: trigger, focus: '#quote-drawer-title' });
    }

    openBtns.forEach(function (b) {
      b.addEventListener('click', function () { moDrawer(b); });
    });

    if (drawer) {
      drawer.addEventListener('sheet:open', function () {
        openBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      });
      drawer.addEventListener('sheet:close', function () {
        openBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        xoaThanhCong();
        ve();
      });
    }

    /* --- Gửi thành công: xoá danh sách, hiện thẻ "Đã nhận thông tin" -- */
    document.addEventListener('tbn:lead-sent', function (e) {
      if (!e.detail || e.detail.source !== 'danh-sach-bao-gia') return;
      ghi([]);
      xoaThanhCong();
      if (!bodyEl) return;
      doneEl = renderDone(bodyEl, {
        text: 'Cảm ơn bạn! Chúng tôi đã nhận được danh sách mẫu bạn quan tâm và sẽ gọi lại trong vòng 30 phút (giờ hành chính).',
        demo: DEMO_MODE,
        more: { label: 'Xem thêm mẫu tủ bếp', href: moreLink ? moreLink.getAttribute('href') : 'mau-tu-bep/index.html' }
      });
      if (emptyEl) emptyEl.hidden = true;
    });

    ve();
  })();

  /* ================================================================== */
  /* 10. FORM BÁO GIÁ: kiểm tra dữ liệu + gửi về Google Sheet           */
  /* ================================================================== */
  (function formModule() {
    var forms = $$('form[data-quote-form]');
    if (!forms.length) return;

    var KT = window.KT || {};
    var seq = 0;

    // Số điện thoại Việt Nam: 10 số, đầu số di động hợp lệ hoặc +84
    var PHONE_RE = /^(?:\+?84|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9\d)\d{7}$/;

    function cleanPhone(v) { return String(v).replace(/[\s.\-()]/g, ''); }

    /* Các ô thật của form (bỏ ô ẩn, ô honeypot và radio giả của thẻ lựa chọn) */
    function fieldsOf(form) {
      return $$('input, select, textarea', form).filter(function (f) {
        return f.form === form && f.type !== 'hidden' && f.name !== 'website';
      });
    }

    /* D18: ô ảnh hiện trạng — ảnh xem trước + nút bỏ ảnh 48px. Tệp vẫn không gửi đi (chỉ đếm số ảnh như cũ). */
    function photoPreview(input) {
      var wrap = input.closest('.field');
      if (!wrap || !window.URL || !URL.createObjectURL) return;
      var list = document.createElement('ul');
      list.className = 'photo-list';
      list.hidden = true;
      input.parentNode.insertBefore(list, input.nextSibling);
      var urls = [];

      /* Nút chọn ảnh tiếng Việt thay cho nút gốc của trình duyệt ("Choose Files"); <input> vẫn là nguồn dữ liệu */
      var pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'btn btn--outline photo-pick';
      pick.textContent = 'Chọn ảnh từ máy';
      var hintEl = $('.field__hint', wrap);
      if (hintEl) {
        if (!hintEl.id) hintEl.id = 'hint-' + (input.id || 'photo');
        pick.setAttribute('aria-describedby', hintEl.id);
      }
      pick.addEventListener('click', function () { input.click(); });
      input.parentNode.insertBefore(pick, input);
      input.classList.add('visually-hidden');
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');
      input.__ktPick = pick;

      function render() {
        urls.forEach(function (u) { URL.revokeObjectURL(u); });
        urls = [];
        list.textContent = '';
        var files = Array.prototype.slice.call(input.files || []);
        list.hidden = !files.length;
        files.forEach(function (file, i) {
          var li = document.createElement('li');
          li.className = 'photo-list__item';
          var img = new Image();
          img.className = 'photo-list__thumb';
          img.alt = '';
          img.width = 48; img.height = 48;
          var u = URL.createObjectURL(file);
          urls.push(u);
          img.src = u;
          var name = document.createElement('span');
          name.className = 'photo-list__name';
          name.textContent = file.name;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'photo-list__remove';
          btn.textContent = 'Bỏ ảnh';
          btn.setAttribute('aria-label', 'Bỏ ảnh ' + file.name);
          btn.addEventListener('click', function () {
            try {
              var dt = new DataTransfer();
              files.forEach(function (f, j) { if (j !== i) dt.items.add(f); });
              input.files = dt.files;
            } catch (e) { input.value = ''; }
            input.dispatchEvent(new Event('change', { bubbles: true }));
            pick.focus();
          });
          li.appendChild(img); li.appendChild(name); li.appendChild(btn);
          list.appendChild(li);
        });
      }

      input.addEventListener('change', render);
      if (input.form) input.form.addEventListener('reset', function () { setTimeout(render, 0); });
    }

    /* aria-describedby: gợi ý + vùng báo lỗi của ô */
    function wireField(f) {
      var wrap = f.closest('.field');
      if (!wrap) return;
      var ids = [];
      var hint = $('.field__hint', wrap);
      var err = $('.field__error', wrap);
      var base = f.id || ('f' + (++seq));
      if (hint) { if (!hint.id) hint.id = 'hint-' + base; ids.push(hint.id); }
      if (err) {
        if (!err.id) err.id = 'err-' + base;
        ids.push(err.id);
        err.removeAttribute('aria-live');   // lỗi đọc qua aria-describedby khi focus; tóm tắt do .form__status (role=status) báo một lần
      }
      if (!ids.length) return;
      f.setAttribute('aria-describedby', ids.join(' '));
      if (f.__ktGroup) {
        var kh = f.__ktGroup.__ktKeyHint;      // gợi ý "Backspace/Delete để bỏ chọn" của thẻ lựa chọn
        f.__ktGroup.setAttribute('aria-describedby', ids.concat(kh ? [kh] : []).join(' '));
      }
    }

    function setError(field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      var errEl = $('.field__error', wrap);
      wrap.classList.toggle('is-invalid', !!message);
      [field, field.__ktGroup].forEach(function (t) {
        if (!t) return;
        if (message) t.setAttribute('aria-invalid', 'true');
        else t.removeAttribute('aria-invalid');
      });
      if (errEl) errEl.textContent = message || '';
    }

    function validateField(field) {
      // Ô tích chọn (đồng ý cho liên hệ) kiểm tra riêng
      if (field.type === 'checkbox') {
        if (field.hasAttribute('required') && !field.checked) {
          setError(field, 'Bạn tích vào ô đồng ý để chúng tôi liên hệ tư vấn nhé.');
          return false;
        }
        setError(field, '');
        return true;
      }

      var v = (field.value || '').trim();
      var name = field.name;

      if (field.hasAttribute('required') && !v) {
        if (name === 'name') setError(field, 'Bạn nhập họ tên giúp chúng tôi nhé.');
        else if (name === 'phone') setError(field, 'Bạn nhập số điện thoại để kỹ thuật viên gọi lại nhé.');
        else setError(field, field.dataset.errorRequired || 'Bạn điền thông tin này giúp chúng tôi nhé.');
        return false;
      }
      if (name === 'phone' && v && !PHONE_RE.test(cleanPhone(v))) {
        setError(field, 'Số điện thoại chưa đúng, bạn kiểm tra lại nhé. Ví dụ: 0901 234 567.');
        return false;
      }
      if (field.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        setError(field, 'Email chưa đúng, bạn kiểm tra lại nhé. Ví dụ: ten@gmail.com.');
        return false;
      }
      if (name === 'name' && v && v.length < 2) {
        setError(field, 'Họ tên hơi ngắn, bạn nhập đầy đủ giúp chúng tôi nhé.');
        return false;
      }
      if (name === 'note' && v.length > 1000) {
        setError(field, 'Ghi chú hơi dài, bạn rút gọn còn tối đa 1000 ký tự nhé (hiện có ' + v.length + ').');
        return false;
      }
      if (field.type === 'file' && field.files && field.files.length) {
        var tooBig = Array.prototype.some.call(field.files, function (f) { return f.size > 5 * 1024 * 1024; });
        if (tooBig) { setError(field, 'Mỗi ảnh cần nhỏ hơn 5MB, bạn chọn lại ảnh nhẹ hơn nhé.'); return false; }
      }
      setError(field, '');
      return true;
    }

    /* Gom dữ liệu của một form thành các khoá mà Apps Script hiểu được */
    function thuThap(form, moLuc) {
      var fd = new FormData(form);
      var data = {
        form_source: form.getAttribute('data-form-source') || 'bao-gia-nhanh',
        page: window.location.href.split('#')[0].slice(0, 300),
        elapsed_ms: String(Date.now() - moLuc)
      };

      ['name', 'phone', 'area', 'shape', 'size', 'budget',
       'models', 'price', 'note', 'note_extra'].forEach(function (k) {
        var v = fd.get(k);
        if (typeof v === 'string' && v.trim()) data[k] = v.trim();
      });

      // Ảnh hiện trạng không gửi kèm được qua Apps Script => ghi chú lại số lượng
      var file = form.querySelector('input[type="file"]');
      if (file && file.files && file.files.length) {
        data.note_extra = (data.note_extra ? data.note_extra + ' | ' : '') +
          'Khách có ' + file.files.length + ' ảnh hiện trạng (hẹn gửi qua Zalo)';
      }

      var token = turnstileToken(form);
      if (token) data['cf-turnstile-response'] = token;

      return data;
    }

    /* --- Chia bước (dựng bằng JS: tắt JS thì form vẫn là một trang đầy đủ) ---
       Bước 1 chỉ có Họ tên + Số điện thoại. Mọi ô vẫn nằm trong form (chỉ bị
       ẩn bằng thuộc tính hidden) nên FormData và tên trường giữ nguyên. */
    function stepConfig(form) {
      var src = form.getAttribute('data-form-source') || '';
      if (src === 'danh-sach-bao-gia') return null;            // ngăn báo giá: form ngắn, một bước
      if (src === 'bao-gia-day-du') {
        return {
          titles: ['Thông tin liên hệ', 'Bếp nhà bạn', 'Mẫu quan tâm & ghi chú'],
          map: function (n) {
            if (n === 'name' || n === 'phone') return 1;
            if (n === 'area' || n === 'shape' || n === 'size' || n === 'budget') return 2;
            return 3;
          }
        };
      }
      return {
        titles: ['Thông tin liên hệ', 'Chi tiết & xác nhận'],
        map: function (n) { return (n === 'name' || n === 'phone') ? 1 : 2; }
      };
    }

    function setupSteps(form, submitBtn, fields, getSkip) {
      var cfg = stepConfig(form);
      if (!cfg || !submitBtn) return null;
      var N = cfg.titles.length;
      var items = [];

      Array.prototype.forEach.call(form.children, function (el) {
        if (el.classList.contains('form__hp')) return;
        var ctl = el.matches('input, select, textarea') ? el
          : $('input:not([type="hidden"]), select, textarea', el);
        if (!ctl || ctl.type === 'hidden' || ctl.form !== form || ctl.name === 'website') return;
        items.push({ el: el, step: cfg.map(ctl.name) });
      });
      if (!items.length) return null;

      // Thanh tiến trình
      var prog = document.createElement('div');
      prog.className = 'form__progress';
      var labelEl = document.createElement('p');
      labelEl.className = 'form__progress-label';
      labelEl.tabIndex = -1;
      var ol = document.createElement('ol');
      ol.className = 'form__steps';
      ol.setAttribute('aria-hidden', 'true');
      var dots = cfg.titles.map(function () {
        var li = document.createElement('li');
        ol.appendChild(li);
        return li;
      });
      prog.appendChild(labelEl);
      prog.appendChild(ol);
      form.insertBefore(prog, items[0].el);
      form.classList.add('is-stepped');

      // Hàng nút: Quay lại / Tiếp tục / Gửi
      var actions = document.createElement('div');
      actions.className = 'form__actions';
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn btn--outline btn--lg';
      back.setAttribute('data-step-back', '');
      back.innerHTML = iconSvg('chevron-left') + '<span>Quay lại</span>';
      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'btn btn--primary btn--lg';
      next.setAttribute('data-step-next', '');
      next.innerHTML = '<span>Tiếp tục</span>' + iconSvg('chevron-right');
      form.insertBefore(actions, submitBtn);
      actions.appendChild(back);
      actions.appendChild(next);
      actions.appendChild(submitBtn);

      var cur = 1;

      function stepOf(f) {
        for (var i = 0; i < items.length; i++) if (items[i].el.contains(f)) return items[i].step;
        return cur;
      }

      function show(n, o) {
        // Đọc vị trí form TRƯỚC khi đổi DOM (layout còn sạch): tránh ép layout đồng bộ giữa handler (INP)
        var top0 = (o && o.focus) ? form.getBoundingClientRect().top : 0;
        cur = n;
        items.forEach(function (it) {
          var vis = it.step === n;
          it.el.hidden = !vis;
          if (vis && o && o.focus && !KT.reduced) {
            it.el.classList.add('form__fade');
            setTimeout(function () { it.el.classList.remove('form__fade'); }, 450);
          }
        });
        labelEl.innerHTML = 'Bước ' + n + '/' + N + ' <span>· ' + cfg.titles[n - 1] + '</span>';
        dots.forEach(function (li, i) {
          li.classList.toggle('is-done', i + 1 < n);
          li.classList.toggle('is-current', i + 1 === n);
        });
        back.hidden = n === 1;
        next.hidden = n === N;
        submitBtn.hidden = n !== N;

        if (o && o.focus) {
          requestAnimationFrame(function () {        // scrollIntoView/focus ép layout → khung hình kế (INP)
            if (top0 < 8 || top0 > window.innerHeight * 0.6) {
              form.scrollIntoView({ block: 'start', behavior: KT.reduced ? 'auto' : 'smooth' });
            }
            try { labelEl.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
          });
        }
      }

      function stepFields(n) {
        return fields.filter(function (f) { return stepOf(f) === n; });
      }

      function focusField(f) {
        var n = stepOf(f);
        if (n !== cur) show(n, { focus: false });
        var target = f.__ktGroup ? ($('input[type="radio"]', f.__ktGroup) || f) : (f.__ktPick || f);
        try { target.focus(); } catch (e) { /* bỏ qua */ }
      }

      function goNext() {
        var bad = null;
        stepFields(cur).forEach(function (f) { if (!validateField(f) && !bad) bad = f; });
        if (bad) { focusField(bad); return false; }
        if (cur < N) show(cur + 1, { focus: true });
        return true;
      }

      back.addEventListener('click', function () { if (cur > 1) show(cur - 1, { focus: true }); });
      next.addEventListener('click', goNext);

      // Enter trong ô nhập: sang ô kế tiếp của bước, hết ô thì sang bước sau (bước cuối => gửi)
      form.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || e.isComposing) return;
        var t = e.target;
        if (!t || t.tagName !== 'INPUT' || t.type === 'checkbox' || t.type === 'file' || t.type === 'radio') return;
        var list = stepFields(cur).filter(function (f) {
          return !f.__ktGroup && f.type !== 'checkbox' && f.type !== 'file';
        });
        var i = list.indexOf(t);
        if (i > -1 && i < list.length - 1) { e.preventDefault(); list[i + 1].focus(); return; }
        if (cur < N) { e.preventDefault(); goNext(); }
      });

      show(1);
      return {
        N: N,
        cur: function () { return cur; },
        show: show,
        next: goNext,
        focusField: focusField
      };
    }

    forms.forEach(function (form) {
      var statusEl = $('.form__status', form);
      if (statusEl) {                // vùng báo trạng thái khai báo sẵn từ đầu (trình đọc màn hình mới đọc nội dung thêm vào sau)
        statusEl.removeAttribute('hidden');
        statusEl.setAttribute('role', 'status');
        statusEl.setAttribute('aria-live', 'polite');
      }
      var submitBtn = $('button[type="submit"]', form);
      var submitLabel = submitBtn ? submitBtn.textContent : '';
      var moLuc = Date.now();        // mốc thời gian mở form (chống bot điền tức thì)
      var dangGui = false;
      var boQuaBlur = false;         // đang bấm nút: đừng chèn lỗi làm nút nhảy vị trí
      var fields = fieldsOf(form);

      fields.forEach(wireField);
      fields.forEach(function (f) { if (f.type === 'file') photoPreview(f); });

      // Kiểm tra khi rời ô (chỉ ô đã nhập) và khi gửi; sửa xong lỗi tự biến mất
      fields.forEach(function (f) {
        f.addEventListener('blur', function () {
          if (boQuaBlur) return;
          var wrap = f.closest('.field');
          if (f.__dirty || (wrap && wrap.classList.contains('is-invalid'))) validateField(f);
        });
        f.addEventListener('change', function () {
          f.__dirty = true;
          if (f.type === 'checkbox' || f.tagName === 'SELECT' || f.type === 'file') validateField(f);
        });
        f.addEventListener('input', function () {
          f.__dirty = true;
          var wrap = f.closest('.field');
          if (wrap && wrap.classList.contains('is-invalid')) validateField(f);
        });
      });

      form.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('.form__actions, button[type="submit"]')) {
          boQuaBlur = true;
          setTimeout(function () { boQuaBlur = false; }, 600);
        }
      }, true);

      var steps = setupSteps(form, submitBtn, fields);

      function say(type, html) {
        if (!statusEl) return;
        statusEl.className = 'form__status form__status--' + type;
        statusEl.innerHTML = html;          // chuỗi do mình tự dựng, không có dữ liệu khách
        statusEl.setAttribute('role', 'status');
        statusEl.setAttribute('aria-live', 'polite');
      }

      function khoaNut(dang) {
        dangGui = dang;
        if (!submitBtn) return;
        submitBtn.disabled = dang;
        submitBtn.classList.toggle('is-loading', dang);
        submitBtn.setAttribute('aria-busy', dang ? 'true' : 'false');
        submitBtn.textContent = dang ? 'Đang gửi...' : submitLabel;
      }

      var LOI_LIEN_HE =
        ' Bạn vui lòng gọi <a href="tel:' + HOTLINE_TEL + '">' + HOTLINE + '</a> ' +
        'hoặc nhắn <a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo</a> giúp chúng tôi nhé.';

      /* Thẻ "Đã nhận thông tin" thay cho form (ngăn báo giá tự vẽ thẻ của nó) */
      function hienThanhCong() {
        form.classList.add('is-sent');
        renderDone(form, {
          demo: DEMO_MODE,
          more: { label: 'Gửi thêm yêu cầu' },
          onMore: function (card) {
            if (card.parentNode) card.parentNode.removeChild(card);
            form.classList.remove('is-sent');
            if (statusEl) { statusEl.innerHTML = ''; statusEl.className = 'form__status'; }
            if (steps) steps.show(1, { focus: true });
            else if (fields[0]) fields[0].focus();
          }
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (dangGui) return;                       // chặn bấm hai lần

        // Honeypot: bot điền vào ô ẩn => bỏ qua im lặng
        if (form.elements['website'] && form.elements['website'].value) return;

        // Form nhiều bước: Enter ở bước giữa nghĩa là "Tiếp tục"
        if (steps && steps.cur() < steps.N) { steps.next(); return; }

        // Điền xong trong chưa tới 3 giây gần như chắc chắn là máy
        if (Date.now() - moLuc < MIN_FILL_MS) {
          say('error', 'Bạn xem lại thông tin một lượt rồi bấm gửi lại giúp chúng tôi nhé.');
          return;
        }

        var firstBad = null;
        fields.forEach(function (f) { if (!validateField(f) && !firstBad) firstBad = f; });

        if (firstBad) {
          say('error', 'Bạn xem lại các ô được đánh dấu đỏ giúp chúng tôi nhé.');
          if (steps) steps.focusField(firstBad); else (firstBad.__ktPick || firstBad).focus();
          return;
        }

        var data = thuThap(form, moLuc);

        function thanhCong() {
          trackLead(data.form_source);
          if (statusEl) { statusEl.innerHTML = ''; statusEl.className = 'form__status'; }
          form.reset();
          turnstileReset(form);
          moLuc = Date.now();
          fields.forEach(function (f) { f.__dirty = false; });
          // reset xoá các ô ẩn của công cụ dự toán => tính lại để lần gửi sau vẫn kèm dự toán
          var est = document.getElementById('estimator');
          if (est) est.dispatchEvent(new Event('input', { bubbles: true }));
          if (steps) steps.show(1);
          if (data.form_source !== 'danh-sach-bao-gia') hienThanhCong();
          document.dispatchEvent(new CustomEvent('tbn:lead-sent', {
            detail: { source: data.form_source, form: form }
          }));
        }

        /* --- Chưa cấu hình URL Web App => chạy chế độ demo ------------ */
        if (DEMO_MODE) {
          khoaNut(true);
          setTimeout(function () {
            khoaNut(false);
            thanhCong();
            console.info('[Form demo] Dữ liệu sẽ gửi lên Google Sheet:', data);
          }, 400);
          return;
        }

        khoaNut(true);
        say('info', 'Đang gửi yêu cầu của bạn...');

        doiToken(form, 8000)
          .then(function (token) {
            if (token) data['cf-turnstile-response'] = token;
            return sendToSheet(data);
          })
          .then(function () {
            khoaNut(false);
            thanhCong();
          })
          .catch(function (err) {
            khoaNut(false);
            turnstileReset(form);
            var dau = err && err.friendly ? err.friendly : 'Gửi chưa thành công.';
            say('error', dau + LOI_LIEN_HE);
            console.warn('[Form] lỗi gửi:', err);
          });
      });
    });
  })();

  /* ================================================================== */
  /* 11. TỰ ĐIỀN TÊN MẪU TỦ VÀO FORM                                    */
  /*     - từ nút "Nhận báo giá mẫu này" (data-model-name)              */
  /*     - hoặc từ tham số ?mau=... trên URL trang liên hệ              */
  /* ================================================================== */
  (function prefillModule() {
    $$('[data-model-name]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-model-name');
        var target = $('#note') || $('textarea[name="note"]');
        var modelField = $('#model-name');
        if (modelField) modelField.value = name;
        if (target && target.value.indexOf(name) === -1) {
          target.value = 'Tôi muốn nhận báo giá mẫu: ' + name + '. ' + target.value;
        }
      });
    });

    var params = new URLSearchParams(window.location.search);
    var mau = params.get('mau');
    if (mau) {
      var note = $('#note');
      var modelField = $('#model-name');
      if (modelField) modelField.value = mau;
      if (note && !note.value) note.value = 'Tôi muốn nhận báo giá mẫu: ' + mau + '.';
    }
  })();

  /* ================================================================== */
  /* 13. MỤC LỤC BÀI VIẾT: làm nổi mục đang đọc (scrollspy)             */
  /*     Mục lục đã có sẵn trong HTML để Google đọc được.               */
  /* ================================================================== */
  (function tocModule() {
    var toc = $('.toc');
    if (!toc || !('IntersectionObserver' in window)) return;

    var links = $$('a[href^="#"]', toc);
    var map = {};
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { map[el.id] = a; targets.push(el); }
    });
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          // Dùng class thay vì style nội tuyến để giao diện nằm gọn trong CSS
          links.forEach(function (l) { l.classList.remove('is-active'); });
          a.classList.add('is-active');
          // Mobile: mục lục là hàng chip cuộn ngang → đưa chip đang đọc vào giữa hàng (không cuộn trang)
          var row = a.closest ? a.closest('.toc__list') : null;
          if (row && row.scrollWidth > row.clientWidth + 4 && getComputedStyle(row).overflowX === 'auto') {
            var li = a.parentNode, rr = row.getBoundingClientRect(), lr = li.getBoundingClientRect();
            row.scrollBy({ left: lr.left - rr.left - (row.clientWidth - lr.width) / 2, behavior: window.KT && window.KT.reduced ? 'auto' : 'smooth' });
          }
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  })();

  /* ================================================================== */
  /* 14. NĂM HIỆN TẠI Ở FOOTER                                          */
  /* ================================================================== */
  $$('[data-current-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
