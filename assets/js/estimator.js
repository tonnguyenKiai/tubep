/* =========================================================================
   estimator.js – Công cụ dự toán chi phí (trang Bảng giá)
   Chỉ nạp ở trang Bảng giá. Cần main.js nạp TRƯỚC (KT.stepper, KT.choice).
   Tách từ main.js (Giai đoạn 3) để trang không dùng thì không phải tải/phân tích.
   Nạp bằng <script src="..." defer></script> SAU main.js.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ================================================================== */
  /* 8. CÔNG CỤ DỰ TOÁN CHI PHÍ (trang Bảng giá)                        */
  /* ================================================================== */
  (function estimatorModule() {
    var form = $('#estimator');
    if (!form) return;

    var outTotal  = $('#est-total');
    var outList   = $('#est-breakdown');
    // Bốn ô ẩn dưới đây được gửi kèm lên Google Sheet cùng thông tin khách
    var hiddenSize  = $('#est-size');
    var hiddenShape = $('#est-shape');
    var hiddenPrice = $('#est-price');
    var hiddenExtra = $('#est-extra');

    var vnd = new Intl.NumberFormat('vi-VN');

    function money(n) { return vnd.format(Math.round(n / 1000) * 1000) + 'đ'; }

    function num(name) {
      var el = form.elements[name];
      var v = el ? parseFloat(String(el.value).replace(',', '.')) : 0;
      return isNaN(v) || v < 0 ? 0 : v;
    }

    function calc() {
      var upper = num('upper');     // chiều dài tủ trên (mét dài)
      var lower = num('lower');     // chiều dài tủ dưới (mét dài)

      var frameEl = form.elements['frame'];
      var doorEl  = form.elements['door'];
      var frame = frameEl.options[frameEl.selectedIndex];
      var door  = doorEl.options[doorEl.selectedIndex];

      var framePrice = parseInt(frame.dataset.price, 10) || 0;   // đ/md khung nhôm
      var doorPrice  = parseInt(door.dataset.price, 10) || 0;    // đ/md phụ thu loại cánh

      var basePerM = framePrice + doorPrice;
      // Tủ trên tính hệ số 0,85 do chiều cao nhỏ hơn tủ dưới
      var cabinet = (lower * basePerM) + (upper * basePerM * 0.85);

      var extras = 0;
      var extraRows = [];
      $$('input[name="extra"]:checked', form).forEach(function (cb) {
        var price = parseInt(cb.dataset.price, 10) || 0;
        var perMeter = cb.dataset.unit === 'md';
        var cost = perMeter ? price * (lower || 0) : price;
        extras += cost;
        extraRows.push([cb.dataset.label, cost]);
      });

      var total = cabinet + extras;
      var low  = total * 0.92;        // hiển thị dạng KHOẢNG giá
      var high = total * 1.12;

      var totalText = total > 0 ? money(low) + ' – ' + money(high) : '0đ';
      if (outTotal) outTotal.textContent = totalText;
      publish(totalText);

      if (outList) {
        var rows = '';
        if (lower > 0) rows += row('Tủ dưới ' + lower + ' md', money(lower * basePerM));
        if (upper > 0) rows += row('Tủ trên ' + upper + ' md', money(upper * basePerM * 0.85));
        extraRows.forEach(function (r) { rows += row(r[0], money(r[1])); });
        outList.innerHTML = rows || row('Chưa nhập kích thước', '—');
      }

      // Ghi vào các ô ẩn để gửi kèm lên Google Sheet khi khách bấm "Gửi dự toán"
      if (hiddenSize)  hiddenSize.value  = 'Tủ dưới ' + lower + 'md · Tủ trên ' + upper + 'md';
      if (hiddenShape) hiddenShape.value = 'Khung ' + frame.text + ' · Cánh ' + door.text;
      if (hiddenPrice) hiddenPrice.value = total > 0 ? (money(low) + ' – ' + money(high)) : '';
      if (hiddenExtra) {
        hiddenExtra.value = extraRows.length
          ? 'Phụ kiện chọn thêm: ' + extraRows.map(function (r) { return r[0]; }).join(', ')
          : '';
      }
    }

    function row(label, value) {
      return '<li><span>' + label + '</span><span>' + value + '</span></li>';
    }

    /* --- Nâng cấp giao diện khi có JS (công thức calc() ở trên giữ nguyên) --- */
    var KTu = window.KT || {};

    // Ô số => − [số] + và thanh trượt
    if (KTu.stepper) {
      ['lower', 'upper'].forEach(function (n) {
        if (form.elements[n]) KTu.stepper(form.elements[n]);
      });
    }

    // Thanh giá dính đáy màn hình (mobile): luôn thấy giá khi đang chỉnh
    var bar = document.createElement('div');
    bar.className = 'estimator__bar';
    bar.innerHTML =
      '<div class="estimator__bar-text">' +
        '<span class="estimator__bar-label" aria-hidden="true">Dự toán tạm tính</span>' +
        '<span class="estimator__bar-price" aria-hidden="true">0đ</span>' +
      '</div>' +
      '<a class="btn btn--primary" href="#gui-du-toan">Nhận báo giá</a>';
    form.appendChild(bar);
    var barPrice = $('.estimator__bar-price', bar);

    // Vùng đọc cho trình đọc màn hình: báo kết quả sau khi người dùng dừng chỉnh
    var live = document.createElement('div');
    live.className = 'visually-hidden';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    if (outTotal && outTotal.parentNode) outTotal.parentNode.appendChild(live);
    var liveTimer = null;
    var lastText = null;

    function publish(text) {
      if (barPrice) barPrice.textContent = text.replace(' – ', ' – ');   // dấu gạch dính số trước, không rớt xuống dòng riêng
      if (text === lastText) return;
      var first = lastText === null;
      lastText = text;
      if (first) return;
      if (KTu.bump) { KTu.bump(outTotal); KTu.bump(bar); }
      clearTimeout(liveTimer);
      liveTimer = setTimeout(function () { live.textContent = 'Dự toán tạm tính: ' + text; }, 900);
    }

    form.addEventListener('input', calc);
    form.addEventListener('change', calc);
    // Công cụ dự toán chỉ tính tại chỗ, không gửi đi đâu cả
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    calc();
  })();
})();
