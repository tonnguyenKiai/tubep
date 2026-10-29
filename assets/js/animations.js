/* =========================================================================
   animations.js – Hiệu ứng chuyển động (CSS transition + IntersectionObserver)
   Giai đoạn 3: bỏ GSAP + ScrollTrigger (≈45 KB gzip/trang), Lenis chỉ nạp cho chuột
   (desktop), Swiper chỉ nạp khi slider sắp vào màn hình.

   NGUYÊN TẮC BẮT BUỘC (không ảnh hưởng SEO / Core Web Vitals):
   1. Mọi nội dung đã có sẵn trong HTML. File này KHÔNG chèn nội dung mới.
   2. Chỉ ẩn phần tử khi <html> có class .js-anim (do script nội tuyến ở <head>
      thêm vào). Tắt JS hoặc file lỗi => nội dung vẫn hiển thị đầy đủ. Nếu file
      đến muộn hơn mốc 2,5 giây (js-anim đã bị gỡ) thì KHÔNG ẩn lại gì cả.
   3. Phần tử LCP (H1, mô tả hero, ảnh hero) không bị ẩn, không có delay.
   4. Chỉ animate transform + opacity => CLS = 0. Không đặt will-change tĩnh.
   5. prefers-reduced-motion hoặc máy yếu (KT.lowEnd): hiện ngay tất cả
      (data-anim-done), không zoom hero, không đếm số, không Lenis, không tự chạy slider.
   6. Dọn Lenis / Swiper khi rời trang để tránh rò rỉ bộ nhớ.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };

  var KT = window.KT || {};
  var reduced = typeof KT.reduced === 'boolean' ? KT.reduced : mq('(prefers-reduced-motion: reduce)');
  var lowEnd = !!KT.lowEnd;
  var isTouch = mq('(hover: none)');
  var hasIO = 'IntersectionObserver' in window;

  var SWIPER_SRC = 'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.js';
  var SWIPER_CSS = 'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.css';
  var LENIS_SRC  = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';

  var idle = window.requestIdleCallback
    ? function (fn) { window.requestIdleCallback(fn, { timeout: 2500 }); }
    : function (fn) { setTimeout(fn, 300); };

  function clearFallback() {
    if (window.__animFallback) { clearTimeout(window.__animFallback); window.__animFallback = 0; }
  }

  function loadScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = onload;
    document.head.appendChild(s);
  }

  /* Đánh dấu một phần tử đã xong hiệu ứng: trả lại transition riêng của nó (hover…) */
  function markDone(el) {
    el.setAttribute('data-anim-done', '');
    el.classList.remove('is-in');
    el.style.transitionDelay = '';
  }

  /* Hiện toàn bộ nội dung ngay (reduced-motion / máy yếu / đến muộn / thiếu IntersectionObserver) */
  function revealAll() {
    root.classList.remove('js-anim');
    $$('[data-anim], [data-anim-hero]').forEach(function (el) { el.setAttribute('data-anim-done', ''); });
    clearFallback();
  }

  /* Chạy hiệu ứng cho một nhóm phần tử so le nhau (stagger), rồi gắn data-anim-done */
  function play(items, step, dur) {
    void window.getComputedStyle(items[0]).opacity;   // chốt trạng thái đầu để transition thật sự chạy
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i * step).toFixed(2) + 's';
      el.classList.add('is-in');
    });
    setTimeout(function () { items.forEach(markDone); }, Math.round((items.length - 1) * step * 1000 + dur + 80));
  }

  /* ================================================================== */
  /* 1. HIỆU ỨNG XUẤT HIỆN – hero ngay lập tức, phần còn lại khi cuộn tới */
  /* ================================================================== */
  var animate = root.classList.contains('js-anim') && !reduced && !lowEnd && hasIO;

  if (!animate) {
    revealAll();
  } else {
    clearFallback();

    /* Hero: chỉ trượt nhẹ 10px, KHÔNG delay đầu, KHÔNG bắt đầu từ ẩn hoàn toàn */
    var heroItems = $$('[data-anim-hero]');
    if (heroItems.length) play(heroItems, 0.06, 550);

    /* Nhóm các phần tử cùng khối cha để hiệu ứng so le trông tự nhiên */
    var groups = {};
    var seq = 0;
    $$('[data-anim]').forEach(function (el) {
      var parent = el.parentElement;
      var key = el.getAttribute('data-anim-group') || (parent && parent.__animKey) || '';
      if (!key) {
        key = 'g' + (++seq);
        if (parent) parent.__animKey = key;
      }
      (groups[key] = groups[key] || []).push(el);
    });

    /* Tương đương ScrollTrigger "top 88%": kích hoạt khi mép trên phần tử đầu nhóm lọt vào 88% chiều cao màn hình.
       Phần tử đã bị cuộn vượt qua (nhảy neo #…) cũng được hiện. */
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var r = en.boundingClientRect;
        var rb = en.rootBounds;
        var passed = !en.isIntersecting && (r.width || r.height) && rb && r.bottom <= rb.top;
        if (!en.isIntersecting && !passed) return;
        var items = en.target.__animItems;
        if (!items) return;
        /* Cả nhóm chạy một lần: gỡ quan sát mọi phần tử của nhóm (kể cả phần tử đang bị ẩn bởi bộ lọc) */
        items.forEach(function (it) { revealIO.unobserve(it); });
        play(items, 0.08, 600);
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    Object.keys(groups).forEach(function (key) {
      var items = groups[key];
      /* Quan sát MỌI phần tử trong nhóm (không chỉ phần tử đầu): nếu phần tử đầu đang bị ẩn
         (display:none do bộ lọc danh mục) thì phần tử còn lại vẫn kích hoạt được cả nhóm */
      items.forEach(function (it) { it.__animItems = items; revealIO.observe(it); });
    });

    /* -------- Đếm số liệu uy tín từ 0 (giá trị cuối có sẵn trong HTML) ----- */
    var nf = new Intl.NumberFormat('vi-VN');
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countIO.unobserve(en.target);
        countUp(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    function countUp(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      var t0 = null, dur = 1600;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        if (p < 1) {
          el.textContent = nf.format(Math.round(target * (1 - (1 - p) * (1 - p)))) + suffix;
          requestAnimationFrame(step);
        } else {
          el.textContent = nf.format(target) + suffix;
        }
      }
      el.textContent = nf.format(0) + suffix;
      requestAnimationFrame(step);
    }
    $$('[data-count]').forEach(function (el) {
      if (!isNaN(parseFloat(el.getAttribute('data-count')))) countIO.observe(el);
    });

    /* -------- Đường nối quy trình thi công được vẽ dần theo thanh cuộn ----- */
    var line = document.querySelector('.process__line-fill');
    var proc = document.querySelector('.process');
    if (line && proc) {
      var cur = 0, goal = 0, raf = 0, near = false;
      var frame = function () {
        raf = 0;
        var r = proc.getBoundingClientRect();                       // đọc
        goal = Math.min(1, Math.max(0, (window.innerHeight * 0.7 - r.top) / (r.height || 1)));
        cur += (goal - cur) * 0.2;                                  // làm mượt (như scrub 0,5s)
        if (Math.abs(goal - cur) < 0.003) cur = goal;
        line.style.transform = 'scaleX(' + cur.toFixed(4) + ')';    // ghi
        if (cur !== goal && near) raf = requestAnimationFrame(frame);
      };
      var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };
      new IntersectionObserver(function (entries) {
        var now = entries[entries.length - 1].isIntersecting;
        if (now === near) return;
        near = now;
        if (near) {
          var r = proc.getBoundingClientRect();
          cur = Math.min(1, Math.max(0, (window.innerHeight * 0.7 - r.top) / (r.height || 1)));
          line.style.transform = 'scaleX(' + cur.toFixed(4) + ')';
          window.addEventListener('scroll', kick, { passive: true });
          window.addEventListener('resize', kick);
          kick();
        } else {
          window.removeEventListener('scroll', kick);
          window.removeEventListener('resize', kick);
        }
      }, { rootMargin: '150px 0px' }).observe(proc);
    }
  }

  /* Ảnh nền hero zoom rất chậm (scale 1.05 -> 1) – chỉ transform nên không gây CLS.
     A27: chỉ khi máy khoẻ + màn ≥600px + không reduced, và chỉ bắt đầu SAU khi ảnh đã giải mã xong
     (ảnh LCP luôn hiện ngay, không bao giờ "giật" từ 1.05 về 1). */
  var heroImg = document.querySelector('[data-hero-zoom]');
  if (heroImg && !reduced && !lowEnd && window.innerWidth >= 600 && heroImg.decode && heroImg.animate) {
    heroImg.decode().then(function () {
      heroImg.animate([{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { duration: 2400, easing: 'cubic-bezier(.5,1,.89,1)' });
    }, function () {});
  }

  /* ================================================================== */
  /* 2. LENIS – cuộn mượt, CHỈ nạp cho thiết bị dùng chuột (không cảm ứng)*/
  /*    Nạp sau sự kiện load, lúc rảnh; thất bại thì cuộn gốc của trình duyệt */
  /* ================================================================== */
  var lenis = null;
  var lenisRaf = 0;
  function initLenis() {
    if (!window.Lenis || lenis) return;
    lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      syncTouch: false          // không can thiệp cuộn cảm ứng
    });
    window.__lenis = lenis;
    var tick = function (time) { lenis.raf(time); lenisRaf = requestAnimationFrame(tick); };
    lenisRaf = requestAnimationFrame(tick);

    /* Liên kết neo (#) vẫn hoạt động đúng: mục lục bài viết, nút trong trang */
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (!id || id === '#' || a.hasAttribute('data-no-smooth')) return;
      a.addEventListener('click', function (e) {
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -(parseInt(getComputedStyle(root).getPropertyValue('--header-h'), 10) || 68) - 12 });
        // Giữ đúng thứ tự tiêu điểm cho người dùng bàn phím
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        history.pushState(null, '', id);
      });
    });
  }
  if (!isTouch && !reduced && !lowEnd) {
    var startLenis = function () { idle(function () { loadScript(LENIS_SRC, initLenis); }); };
    if (document.readyState === 'complete') startLenis();
    else window.addEventListener('load', startLenis, { once: true });
  }

  /* ================================================================== */
  /* 3. SWIPER – slider đánh giá khách hàng (nạp khi sắp tới màn hình)  */
  /*    Mọi slide đã có sẵn trong HTML (CSS tự bố trí hàng vuốt ngang    */
  /*    giữ đúng chiều cao); Swiper chỉ nâng cấp thêm nút/chấm/phím.     */
  /*    Cảm ứng + máy yếu: bỏ hẳn Swiper (≈40 KB), dùng vuốt gốc.        */
  /* ================================================================== */
  var swipers = [];
  var swEls = $$('[data-swiper="reviews"]');
  if (swEls.length && !(isTouch && lowEnd)) {
    var swStarted = false;
    var buildSwipers = function () {
      if (!window.Swiper) return;
      /* CX02: tự chuyển thẻ CHỈ khi dùng chuột, máy khoẻ, không reduced; dừng hẳn sau lần
         tương tác đầu (WCAG 2.2.2). Cảm ứng / máy yếu: không tự chuyển. */
      var canAutoplay = !isTouch && !lowEnd && !reduced;
      requestAnimationFrame(function () {
        swEls.forEach(function (el) {
          swipers.push(new window.Swiper(el, {
            slidesPerView: 1.12,
            spaceBetween: 16,
            speed: reduced ? 0 : 300,
            autoHeight: false,
            a11y: {
              prevSlideMessage: 'Đánh giá trước',
              nextSlideMessage: 'Đánh giá tiếp theo',
              paginationBulletMessage: 'Tới đánh giá số {{index}}'
            },
            keyboard: { enabled: true },
            autoplay: canAutoplay ? { delay: 7000, disableOnInteraction: true, pauseOnMouseEnter: true } : false,
            navigation: { nextEl: el.querySelector('.swiper-button-next'), prevEl: el.querySelector('.swiper-button-prev') },
            pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
            breakpoints: { 600: { slidesPerView: 2, spaceBetween: 24 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }
          }));
        });
      });
    };
    var loadSwiper = function () {
      if (swStarted) return;
      swStarted = true;
      /* CSS Swiper chỉ cần khi Swiper chạy: nếu trang không có sẵn <link> thì tự nạp cùng lúc với JS (không chặn LCP).
         Chờ cả hai xong (hoặc CSS lỗi/quá 4 giây) rồi mới dựng, để Swiper đo đúng kích thước. */
      var cssOk = false, jsOk = false, built = false;
      var go = function () { if (built || !cssOk || !jsOk) return; built = true; buildSwipers(); };
      var cssDone = function () { cssOk = true; go(); };
      if (document.querySelector('link[href*="swiper-bundle"]')) cssOk = true;
      else {
        var lk = document.createElement('link');
        lk.rel = 'stylesheet';
        lk.href = SWIPER_CSS;
        lk.onload = cssDone;
        lk.onerror = cssDone;
        document.head.appendChild(lk);
        setTimeout(cssDone, 4000);
      }
      var jsDone = function () { jsOk = true; go(); };
      if (window.Swiper) jsDone(); else loadScript(SWIPER_SRC, jsDone);
    };
    if (hasIO) {
      var swIO = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { swIO.disconnect(); loadSwiper(); return; }
        }
      }, { rootMargin: '600px 0px' });
      swEls.forEach(function (el) { swIO.observe(el); });
    } else {
      idle(loadSwiper);
    }
  }

  /* ================================================================== */
  /* 4. DỌN DẸP – hủy instance khi rời trang (tránh rò rỉ bộ nhớ)       */
  /* ================================================================== */
  window.addEventListener('pagehide', function (e) {
    if (e && e.persisted) return;   // về lại từ bộ nhớ đệm (bfcache): giữ nguyên
    swipers.forEach(function (s) { if (s && s.destroy) s.destroy(true, true); });
    if (lenisRaf) cancelAnimationFrame(lenisRaf);
    if (lenis && lenis.destroy) lenis.destroy();
  });
})();
