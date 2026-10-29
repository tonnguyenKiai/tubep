/* =========================================================================
   catalog.js – Bộ lọc mẫu tủ bếp (+ bottom sheet trên mobile)
   Chỉ nạp ở trang danh mục mẫu tủ. Cần main.js nạp TRƯỚC (window.KT).
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
  /* 7. BỘ LỌC MẪU TỦ BẾP                                               */
  /*    Lưu ý SEO: toàn bộ thẻ mẫu đã có sẵn trong HTML, JS chỉ ẩn/hiện */
  /* ================================================================== */
  (function filterModule() {
    var form = $('#model-filters');
    var grid = $('#model-grid');
    if (!form || !grid) return;

    var cards   = $$('[data-model]', grid);
    var countEl = $('#filter-count');
    var emptyEl = $('#filter-empty');
    var resetEl = $('#filter-reset');

    function val(name) {
      var el = form.elements[name];
      return el ? el.value : '';
    }

    function matches(card) {
      var material = val('material');
      var shape    = val('shape');
      var color    = val('color');
      var price    = val('price');

      if (material && card.dataset.material !== material) return false;
      if (shape    && card.dataset.shape    !== shape)    return false;
      if (color    && card.dataset.color    !== color)    return false;

      if (price) {
        var p = parseInt(card.dataset.price, 10) || 0;   // giá từ (đ/mét dài)
        var parts = price.split('-');
        var min = parseInt(parts[0], 10) || 0;
        var max = parts[1] ? parseInt(parts[1], 10) : Infinity;
        if (p < min || p > max) return false;
      }
      return true;
    }

    function apply() {
      var visible = 0;
      cards.forEach(function (card) {
        var ok = matches(card);
        card.classList.toggle('is-filtered-out', !ok);
        if (ok) visible++;
      });
      // Ghi số kết quả vào thẻ <strong> để giữ nguyên câu "Đang hiển thị … mẫu tủ bếp"
      if (countEl) {
        var strong = countEl.querySelector('strong');
        if (strong) { strong.textContent = String(visible); }
        else { countEl.textContent = String(visible); }
      }
      if (emptyEl) emptyEl.hidden = visible !== 0;
      // Báo cho module animation biết để sắp xếp lại mượt mà (nếu có GSAP Flip)
      document.dispatchEvent(new CustomEvent('models:filtered', { detail: { visible: visible } }));
    }

    form.addEventListener('change', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    if (resetEl) {
      resetEl.addEventListener('click', function () { form.reset(); apply(); });
    }
    apply();
  })();

  /* ================================================================== */
  /* 7b. BỘ LỌC DẠNG BOTTOM SHEET TRÊN MOBILE (nâng cấp dần dần)        */
  /*     Dưới 900px: thanh "Bộ lọc (n)" + chip đang lọc, form chuyển    */
  /*     vào sheet với thẻ lựa chọn. Các ô <select> gốc vẫn là nguồn dữ  */
  /*     liệu duy nhất cho filterModule. Không JS / ≥900px: như cũ.      */
  /* ================================================================== */
  (function filterSheetModule() {
    var form = $('#model-filters');
    var grid = $('#model-grid');
    if (!form || !grid || !window.matchMedia || !KT.sheet) return;
    var selects = $$('select.field__control', form);
    if (!selects.length) return;

    var cards = $$('[data-model]', grid);
    var mq = window.matchMedia('(max-width: 899.98px)');

    function mk(tag, cls, attrs) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      return e;
    }

    /* ---------- Thanh lọc (dính dưới header) ---------- */
    var holder = document.createComment('model-filters');
    form.parentNode.insertBefore(holder, form);
    var bar = mk('div', 'filterbar');
    var row = mk('div', 'filterbar__row');
    var openBtn = mk('button', 'filterbar__btn', {
      type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'filter-sheet', 'aria-expanded': 'false'
    });
    openBtn.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-filter"/></svg><span data-fb-label>Bộ lọc</span>';
    var btnLabel = openBtn.querySelector('[data-fb-label]');
    var barCount = mk('p', 'filterbar__count', { role: 'status', 'aria-live': 'polite' });
    var chips = mk('div', 'filterbar__chips scroll-x', { role: 'group', 'aria-label': 'Bộ lọc đang áp dụng' });
    chips.hidden = true;
    row.appendChild(openBtn);
    row.appendChild(barCount);
    bar.appendChild(row);
    bar.appendChild(chips);
    holder.parentNode.insertBefore(bar, holder);

    /* ---------- Sheet (con trực tiếp của body để KT.sheet làm inert phần còn lại) ---------- */
    var sheet = mk('div', 'sheet filter-sheet', { id: 'filter-sheet' });
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="sheet__backdrop" data-sheet-close></div>' +
      '<div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title">' +
        '<span class="sheet__grab" aria-hidden="true"></span>' +
        '<div class="sheet__head">' +
          '<p class="sheet__title" id="filter-sheet-title" tabindex="-1">Bộ lọc mẫu tủ bếp</p>' +
          '<button class="sheet__close" type="button" data-sheet-close aria-label="Đóng bộ lọc"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-close"/></svg></button>' +
        '</div>' +
        '<div class="sheet__body"></div>' +
        '<div class="sheet__foot">' +
          '<button class="btn btn--primary" type="button" data-fs-apply>Xem mẫu</button>' +
          '<button class="btn btn--outline" type="button" data-fs-reset>Xoá lọc</button>' +
        '</div>' +
        '<p class="sr-only" role="status" aria-live="polite" data-fs-live></p>' +
      '</div>';
    document.body.appendChild(sheet);
    var sheetBody = sheet.querySelector('.sheet__body');
    var applyBtn  = sheet.querySelector('[data-fs-apply]');
    var resetBtn  = sheet.querySelector('[data-fs-reset]');
    var live      = sheet.querySelector('[data-fs-live]');

    /* ---------- Thẻ lựa chọn (radio) phản chiếu từng <select> ---------- */
    selects.forEach(function (sel) {
      var field = sel.closest('.field') || sel.parentNode;
      var label = field.querySelector('.field__label');
      var attrs = { role: 'radiogroup' };
      if (label) {
        if (!label.id) label.id = 'fs-' + sel.name + '-lbl';
        attrs['aria-labelledby'] = label.id;
      }
      var group = mk('div', 'choice-group', attrs);
      Array.prototype.forEach.call(sel.options, function (opt) {
        var lab = mk('label', 'choice');
        var inp = mk('input', 'choice__input', { type: 'radio', name: 'fs_' + sel.name, value: opt.value });
        inp.checked = sel.value === opt.value;
        var body = mk('span', 'choice__body');
        body.textContent = opt.value === '' ? 'Tất cả' : opt.textContent;
        lab.appendChild(inp);
        lab.appendChild(body);
        group.appendChild(lab);
      });
      group.addEventListener('change', function (e) {
        var inp = e.target;
        if (!inp || inp.type !== 'radio') return;
        e.stopPropagation();                          // chỉ để <select> phát change cho filterModule
        sel.value = inp.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      field.appendChild(group);
    });

    /* ---------- Cập nhật giao diện theo trạng thái lọc ---------- */
    function visibleCount() {
      return cards.filter(function (c) { return !c.classList.contains('is-filtered-out'); }).length;
    }
    function refresh() {
      var v = visibleCount();
      var active = selects.filter(function (s) { return s.value !== ''; });
      selects.forEach(function (sel) {
        var field = sel.closest('.field') || sel.parentNode;
        $$('input.choice__input', field).forEach(function (r) { r.checked = r.value === sel.value; });
      });
      btnLabel.textContent = active.length ? 'Bộ lọc (' + active.length + ')' : 'Bộ lọc';
      openBtn.classList.toggle('has-active', active.length > 0);
      barCount.innerHTML = '<strong>' + v + '</strong> mẫu';
      applyBtn.textContent = v ? 'Xem ' + v + ' mẫu' : 'Không có mẫu phù hợp';
      resetBtn.disabled = active.length === 0;
      chips.textContent = '';
      active.forEach(function (sel) {
        var opt = sel.options[sel.selectedIndex];
        var txt = opt ? opt.textContent : sel.value;
        var c = mk('button', 'chip', { type: 'button', 'data-fb-chip': sel.name, 'aria-label': 'Bỏ lọc: ' + txt });
        var t = mk('span');
        t.textContent = txt;
        var x = mk('span', 'chip__x', { 'aria-hidden': 'true' });
        x.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-close"/></svg>';
        c.appendChild(t);
        c.appendChild(x);
        chips.appendChild(c);
      });
      chips.hidden = active.length === 0;
    }
    function announce() {
      var v = visibleCount();
      live.textContent = v ? v + ' mẫu phù hợp' : 'Không có mẫu phù hợp';
    }
    function setAll(value) {
      selects.forEach(function (s) { s.value = value; });
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    /* ---------- Sự kiện ---------- */
    document.addEventListener('models:filtered', refresh);
    form.addEventListener('change', announce);        // chạy sau filterModule (đăng ký sau)
    openBtn.addEventListener('click', function () { KT.sheet.open(sheet, { opener: openBtn }); });
    sheet.addEventListener('sheet:open',  function () { openBtn.setAttribute('aria-expanded', 'true'); });
    sheet.addEventListener('sheet:close', function () { openBtn.setAttribute('aria-expanded', 'false'); });
    resetBtn.addEventListener('click', function () { setAll(''); });
    chips.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('[data-fb-chip]') : null;
      if (!c) return;
      var sel = form.elements[c.getAttribute('data-fb-chip')];
      if (!sel) return;
      sel.value = '';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      var next = chips.querySelector('button') || openBtn;   // chip vừa bị gỡ: trả focus về chip kế / nút Bộ lọc
      try { next.focus({ preventScroll: true }); } catch (err) { /* bỏ qua */ }
    });
    applyBtn.addEventListener('click', function () {
      sheet.addEventListener('sheet:close', function () {   // đóng xong thì đưa kết quả lên đầu màn hình
        var hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56;
        var off = hh + bar.offsetHeight + 8;
        var top = grid.getBoundingClientRect().top;
        if (top < off) {
          window.scrollTo({ top: window.pageYOffset + top - off, behavior: KT.reduced ? 'auto' : 'smooth' });
        }
      }, { once: true });
      KT.sheet.close(sheet);
    });

    /* ---------- Đặt form vào sheet (<900px) hoặc trả về chỗ cũ (≥900px) ---------- */
    function place() {
      if (mq.matches) {
        if (form.parentNode !== sheetBody) { sheetBody.appendChild(form); form.classList.add('is-sheet'); }
      } else if (form.parentNode === sheetBody) {
        KT.sheet.close(sheet);
        holder.parentNode.insertBefore(form, holder.nextSibling);
        form.classList.remove('is-sheet');
      }
    }
    if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place);
    place();
    refresh();
  })();
})();
