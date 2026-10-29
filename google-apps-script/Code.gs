/**
 * =============================================================================
 *  NHẬN DỮ LIỆU FORM TỪ WEBSITE TỦ BẾP NHÔM → GHI VÀO GOOGLE SHEET
 * =============================================================================
 *  Không cần database, không cần máy chủ. Toàn bộ dữ liệu khách hàng nằm trong
 *  một file Google Sheet của bạn.
 *
 *  CÀI ĐẶT NHANH (chi tiết xem README.md mục 10):
 *    1. Tạo Google Sheet mới → Tiện ích mở rộng → Apps Script.
 *    2. Xoá code mẫu, dán toàn bộ file này vào.
 *    3. Chạy hàm thietLapBanDau() một lần để tạo sẵn các tab.
 *    4. Cài đặt dự án → Thuộc tính tập lệnh (Script Properties), thêm các khoá
 *       ở bảng CAU_HINH bên dưới.
 *    5. Triển khai → Lần triển khai mới → Ứng dụng web
 *         · Thực thi với tư cách (Execute as): Tôi / Me
 *         · Ai có quyền truy cập (Who has access): Bất kỳ ai / Anyone
 *    6. Sao chép URL /exec → dán vào assets/js/config.js (WEB_APP_URL).
 *
 *  ⚠ Mỗi lần sửa code phải TRIỂN KHAI LẠI (Deploy → Manage deployments →
 *    biểu tượng bút chì → Version: New version → Deploy) thì thay đổi mới có
 *    hiệu lực. URL giữ nguyên.
 *
 *  KHÔNG BAO GIỜ viết secret key / bot token thẳng vào file này.
 *  Tất cả đều đọc từ Script Properties.
 * =============================================================================
 */

/* ------------------------------------------------------------------ *
 *  BẢNG KHOÁ TRONG SCRIPT PROPERTIES
 * ------------------------------------------------------------------ *
 *  SHEET_ID            (bắt buộc nếu script không gắn vào Sheet)
 *                      ID của Google Sheet, lấy trong URL:
 *                      docs.google.com/spreadsheets/d/<SHEET_ID>/edit
 *
 *  TURNSTILE_SECRET    (nên có) Secret key của Cloudflare Turnstile.
 *                      Bỏ trống = tạm thời không kiểm tra Turnstile.
 *
 *  TELEGRAM_BOT_TOKEN  (tuỳ chọn) Token bot lấy từ @BotFather.
 *  TELEGRAM_CHAT_ID    (tuỳ chọn) ID nhóm/cá nhân nhận thông báo.
 *
 *  NOTIFY_EMAIL        (tuỳ chọn) Email nhận thông báo lead mới.
 *
 *  SHEET_MODE          (tuỳ chọn) 'TACH'  = mỗi loại form một tab (mặc định)
 *                                 'CHUNG' = tất cả ghi chung một tab
 *
 *  ALLOWED_ORIGIN      (tuỳ chọn) Tên miền website, ví dụ https://tubepnhom.vn
 *                      Dùng để ghi chú, Apps Script không chặn theo origin.
 * ------------------------------------------------------------------ */

/** Tên tab khi SHEET_MODE = 'CHUNG'. */
var TAB_CHUNG = 'Khách hàng';

/** Bản đồ: mã nguồn form (website gửi lên) → tên tab + tên hiển thị. */
var NGUON_FORM = {
  'bao-gia-day-du':    { tab: 'Báo giá đầy đủ',   ten: 'Form báo giá đầy đủ (trang Liên hệ)' },
  'bao-gia-nhanh':     { tab: 'Báo giá nhanh',    ten: 'Form báo giá nhanh (cuối trang)' },
  'mau-tu-bep':        { tab: 'Theo mẫu tủ',      ten: 'Nhận báo giá mẫu tủ (trang chi tiết)' },
  'du-toan':           { tab: 'Dự toán',          ten: 'Dự toán từ trang Bảng giá' },
  'danh-sach-bao-gia': { tab: 'Danh sách báo giá', ten: 'Danh sách báo giá (nhiều mẫu)' }
};

/** Thứ tự cột trong Sheet. Đổi ở đây là đổi cả header lẫn dòng ghi mới. */
var COT = [
  'Thời gian',
  'Nguồn form',
  'Trang gửi',
  'Họ tên',
  'Số điện thoại',
  'Khu vực',
  'Kiểu bếp',
  'Kích thước',
  'Ngân sách',
  'Mẫu đã chọn',
  'Giá dự toán',
  'Ghi chú',
  'Trạng thái xử lý',
  'UTM nguồn',
  'UTM chiến dịch'
];

/** Giới hạn độ dài từng trường (ký tự) – chặn người gửi nhồi dữ liệu rác. */
var GIOI_HAN = {
  name: 100, phone: 20, area: 60, shape: 60, size: 150,
  budget: 60, models: 600, price: 80, note: 1000,
  page: 300, utm_source: 100, utm_campaign: 100
};

/** Gửi nhanh hơn số mili giây này bị coi là bot. */
var TOI_THIEU_MS = 3000;

/** Chặn gửi trùng: cùng số điện thoại trong khoảng này chỉ ghi một lần. */
var CHONG_TRUNG_GIAY = 120;


/* ==========================================================================
 *  1. ĐIỂM VÀO
 * ========================================================================== */

/**
 * Website gọi vào đây bằng POST (body dạng URLSearchParams, không phải JSON,
 * để trình duyệt không phải gửi preflight OPTIONS – Apps Script không hỗ trợ).
 */
function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    /* --- 1.1 Honeypot: bot điền vào ô ẩn → im lặng bỏ qua ---------------- */
    if (chuoi(p.website)) {
      console.warn('Bỏ qua: honeypot có dữ liệu.');
      return traLoi({ ok: true, skipped: 'honeypot' });
    }

    /* --- 1.2 Thời gian điền form: dưới 3 giây → coi là bot --------------- */
    var elapsed = parseInt(p.elapsed_ms, 10);
    if (!isNaN(elapsed) && elapsed >= 0 && elapsed < TOI_THIEU_MS) {
      console.warn('Bỏ qua: gửi quá nhanh (' + elapsed + 'ms).');
      return traLoi({ ok: true, skipped: 'too-fast' });
    }

    /* --- 1.3 Xác thực Cloudflare Turnstile ------------------------------- */
    var kqTurnstile = kiemTraTurnstile(chuoi(p['cf-turnstile-response']), chuoi(p.ip));
    if (!kqTurnstile.ok) {
      return traLoi({
        ok: false,
        error: 'Xác thực bảo mật chưa thành công. Bạn vui lòng tải lại trang và thử lại.'
      });
    }

    /* --- 1.4 Kiểm tra lại dữ liệu phía máy chủ --------------------------- */
    var loi = kiemTraDuLieu(p);
    if (loi) return traLoi({ ok: false, error: loi });

    /* --- 1.5 Chặn gửi trùng trong 2 phút --------------------------------- */
    var sdt = chuanHoaSdt(p.phone);
    var cache = CacheService.getScriptCache();
    var khoaTrung = 'dup_' + sdt;
    if (cache.get(khoaTrung)) {
      console.info('Bỏ qua: trùng số ' + sdt + ' trong ' + CHONG_TRUNG_GIAY + 's.');
      return traLoi({ ok: true, duplicate: true });
    }
    cache.put(khoaTrung, '1', CHONG_TRUNG_GIAY);

    /* --- 1.6 Ghi vào Sheet (có khoá để không đè dòng của nhau) ----------- */
    var banGhi = dungDongDuLieu(p);
    var viTri = ghiVaoSheet(banGhi);

    /* --- 1.7 Báo cho chủ shop. Lỗi thông báo KHÔNG ảnh hưởng tới khách --- */
    try {
      guiThongBao(banGhi, viTri);
    } catch (errTB) {
      console.error('Gửi thông báo thất bại (dữ liệu vẫn đã ghi): ' + errTB);
    }

    return traLoi({ ok: true, row: viTri.dong });

  } catch (err) {
    console.error('doPost lỗi: ' + (err && err.stack ? err.stack : err));
    return traLoi({
      ok: false,
      error: 'Hệ thống đang bận. Bạn vui lòng thử lại hoặc gọi hotline giúp chúng tôi nhé.'
    });
  }
}

/**
 * Mở URL Web App bằng trình duyệt sẽ chạy vào đây – dùng để kiểm tra
 * triển khai đã thành công chưa (phải thấy {"ok":true,...}).
 */
function doGet() {
  return traLoi({
    ok: true,
    service: 'Tủ bếp nhôm – nhận form',
    time: new Date().toISOString()
  });
}

/** Trả JSON về cho trình duyệt. */
function traLoi(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ==========================================================================
 *  2. KIỂM TRA DỮ LIỆU
 * ========================================================================== */

/** Trả về chuỗi lỗi nếu dữ liệu không hợp lệ, trả về null nếu hợp lệ. */
function kiemTraDuLieu(p) {
  var ten = chuoi(p.name);
  if (ten.length < 2) return 'Bạn vui lòng nhập họ tên (ít nhất 2 ký tự).';
  if (ten.length > GIOI_HAN.name) return 'Họ tên quá dài.';

  var sdt = chuanHoaSdt(p.phone);
  if (!laSdtVietNam(sdt)) return 'Số điện thoại chưa đúng. Ví dụ: 0901 234 567.';

  if (chuoi(p.note).length > GIOI_HAN.note) {
    return 'Phần ghi chú tối đa ' + GIOI_HAN.note + ' ký tự.';
  }
  if (chuoi(p.models).length > GIOI_HAN.models) {
    return 'Danh sách mẫu tủ quá dài.';
  }
  if (!NGUON_FORM[chuoi(p.form_source)]) {
    return 'Không xác định được nguồn gửi form.';
  }
  return null;
}

/** Bỏ khoảng trắng, dấu chấm, gạch ngang, ngoặc trong số điện thoại. */
function chuanHoaSdt(v) {
  return chuoi(v).replace(/[\s.\-()]/g, '');
}

/** Di động Việt Nam 10 số, hoặc dạng +84. */
function laSdtVietNam(sdt) {
  return /^(?:\+?84|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9\d)\d{7}$/.test(sdt);
}


/* ==========================================================================
 *  3. CLOUDFLARE TURNSTILE
 * ========================================================================== */

/**
 * Gọi API siteverify của Cloudflare để chắc chắn token do người thật tạo ra.
 * Secret key đọc từ Script Properties – không viết thẳng trong code.
 * Nếu chưa khai báo TURNSTILE_SECRET thì bỏ qua bước này (chế độ chưa bật).
 */
function kiemTraTurnstile(token, ip) {
  var secret = thuocTinh('TURNSTILE_SECRET');
  if (!secret) return { ok: true, skipped: true };   // chưa bật Turnstile

  if (!token) return { ok: false, reason: 'missing-token' };

  try {
    var payload = { secret: secret, response: token };
    if (ip) payload.remoteip = ip;

    var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });
    var data = JSON.parse(res.getContentText() || '{}');
    if (!data.success) {
      console.warn('Turnstile từ chối: ' + JSON.stringify(data['error-codes'] || []));
      return { ok: false, reason: 'rejected' };
    }
    return { ok: true };
  } catch (err) {
    // Cloudflare lỗi mạng: không chặn khách thật, chỉ ghi log lại.
    console.error('Không gọi được siteverify: ' + err);
    return { ok: true, skipped: true };
  }
}


/* ==========================================================================
 *  4. GHI VÀO SHEET
 * ========================================================================== */

/** Gom dữ liệu thô thành một bản ghi đã cắt gọn, đã chống chèn công thức. */
function dungDongDuLieu(p) {
  var ma = chuoi(p.form_source);

  // Một số form gửi kèm phần mô tả tự sinh (ví dụ phụ kiện chọn trong công cụ
  // dự toán) – ghép vào cột Ghi chú cho gọn.
  var ghiChu = chuoi(p.note);
  var themVao = chuoi(p.note_extra);
  if (themVao) ghiChu = ghiChu ? (ghiChu + " | " + themVao) : themVao;

  return {
    ma: ma,
    nguon: NGUON_FORM[ma].ten,
    tab: NGUON_FORM[ma].tab,
    thoiGian: new Date(),
    trang: cat(p.page, GIOI_HAN.page),
    hoTen: cat(p.name, GIOI_HAN.name),
    sdt: cat(chuanHoaSdt(p.phone), GIOI_HAN.phone),
    khuVuc: cat(p.area, GIOI_HAN.area),
    kieuBep: cat(p.shape, GIOI_HAN.shape),
    kichThuoc: cat(p.size, GIOI_HAN.size),
    nganSach: cat(p.budget, GIOI_HAN.budget),
    mauDaChon: cat(p.models, GIOI_HAN.models),
    giaDuToan: cat(p.price, GIOI_HAN.price),
    ghiChu: cat(ghiChu, GIOI_HAN.note),
    trangThai: 'Mới',
    utmSource: cat(p.utm_source, GIOI_HAN.utm_source),
    utmCampaign: cat(p.utm_campaign, GIOI_HAN.utm_campaign)
  };
}

/**
 * Thêm một dòng mới. Dùng LockService để nhiều khách gửi cùng lúc
 * không ghi đè lên nhau.
 */
function ghiVaoSheet(r) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);                       // chờ tối đa 20 giây
  try {
    var tenTab = (thuocTinh('SHEET_MODE') === 'CHUNG') ? TAB_CHUNG : r.tab;
    var sheet = layTab(tenTab);

    var dong = [
      r.thoiGian,
      an(r.nguon),
      an(r.trang),
      an(r.hoTen),
      an(r.sdt),
      an(r.khuVuc),
      an(r.kieuBep),
      an(r.kichThuoc),
      an(r.nganSach),
      an(r.mauDaChon),
      an(r.giaDuToan),
      an(r.ghiChu),
      r.trangThai,
      an(r.utmSource),
      an(r.utmCampaign)
    ];

    sheet.appendRow(dong);
    return { tab: tenTab, dong: sheet.getLastRow(), sheet: sheet };
  } finally {
    lock.releaseLock();
  }
}

/** Mở file Sheet: ưu tiên SHEET_ID, nếu không có thì lấy file đang gắn script. */
function moFile() {
  var id = thuocTinh('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Chưa khai báo SHEET_ID trong Script Properties.');
  }
  return ss;
}

/** Lấy tab theo tên, chưa có thì tạo mới kèm dòng tiêu đề. */
function layTab(ten) {
  var ss = moFile();
  var sheet = ss.getSheetByName(ten);
  if (!sheet) {
    sheet = ss.insertSheet(ten);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COT);
    sheet.getRange(1, 1, 1, COT.length)
         .setFontWeight('bold')
         .setBackground('#1F2328')
         .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);   // Thời gian
    sheet.setColumnWidth(3, 220);   // Trang gửi
    sheet.setColumnWidth(10, 260);  // Mẫu đã chọn
    sheet.setColumnWidth(12, 300);  // Ghi chú
  }
  return sheet;
}

/**
 * Chống chèn công thức (formula injection): giá trị bắt đầu bằng = + - @
 * được thêm dấu nháy đơn phía trước để Sheet coi là văn bản thuần.
 */
function an(v) {
  var s = chuoi(v);
  if (!s) return '';
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

/** Ép về chuỗi, cắt khoảng trắng hai đầu. */
function chuoi(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}

/** Cắt chuỗi theo giới hạn ký tự. */
function cat(v, n) {
  var s = chuoi(v);
  return s.length > n ? s.substring(0, n) : s;
}

/** Đọc một khoá trong Script Properties. */
function thuocTinh(key) {
  return chuoi(PropertiesService.getScriptProperties().getProperty(key));
}


/* ==========================================================================
 *  5. THÔNG BÁO LEAD MỚI (Telegram + Email)
 *  Mọi lỗi ở đây đều được nuốt – khách hàng không bao giờ thấy báo lỗi.
 * ========================================================================== */

function guiThongBao(r, viTri) {
  var linkSheet = '';
  try {
    linkSheet = moFile().getUrl() + '#gid=' + viTri.sheet.getSheetId();
  } catch (e) { /* bỏ qua */ }

  guiTelegram(r, linkSheet);
  guiEmail(r, linkSheet);
}

function guiTelegram(r, linkSheet) {
  var token = thuocTinh('TELEGRAM_BOT_TOKEN');
  var chatId = thuocTinh('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  var d = [];
  d.push('🔔 <b>KHÁCH MỚI – ' + esc(r.nguon) + '</b>');
  d.push('👤 <b>' + esc(r.hoTen) + '</b>');
  d.push('📞 <a href="tel:' + esc(r.sdt) + '">' + esc(r.sdt) + '</a>');
  if (r.khuVuc)     d.push('📍 Khu vực: ' + esc(r.khuVuc));
  if (r.kieuBep)    d.push('🍳 Kiểu bếp: ' + esc(r.kieuBep));
  if (r.kichThuoc)  d.push('📐 Kích thước: ' + esc(r.kichThuoc));
  if (r.nganSach)   d.push('💰 Ngân sách: ' + esc(r.nganSach));
  if (r.mauDaChon)  d.push('🗂 Mẫu quan tâm: ' + esc(r.mauDaChon));
  if (r.giaDuToan)  d.push('🧮 Dự toán: ' + esc(r.giaDuToan));
  if (r.ghiChu)     d.push('📝 ' + esc(r.ghiChu));
  if (r.utmCampaign) d.push('📣 Chiến dịch: ' + esc(r.utmSource + ' / ' + r.utmCampaign));
  if (r.trang)      d.push('🔗 Trang gửi: ' + esc(r.trang));
  if (linkSheet)    d.push('\n<a href="' + linkSheet + '">Mở Google Sheet</a>');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: {
      chat_id: chatId,
      text: d.join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: 'true'
    },
    muteHttpExceptions: true
  });
}

function guiEmail(r, linkSheet) {
  var to = thuocTinh('NOTIFY_EMAIL');
  if (!to) return;

  var hang = function (nhan, giaTri) {
    if (!giaTri) return '';
    return '<tr><td style="padding:6px 12px;background:#F6F4F0;font-weight:600">' + esc(nhan) +
           '</td><td style="padding:6px 12px">' + esc(giaTri) + '</td></tr>';
  };

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px">' +
      '<h2 style="color:#1F2328;margin:0 0 4px">Khách mới từ website</h2>' +
      '<p style="color:#6B7280;margin:0 0 16px">' + esc(r.nguon) + '</p>' +
      '<table style="border-collapse:collapse;width:100%;border:1px solid #E5E1DA">' +
        hang('Họ tên', r.hoTen) +
        '<tr><td style="padding:6px 12px;background:#F6F4F0;font-weight:600">Điện thoại</td>' +
        '<td style="padding:6px 12px"><a href="tel:' + esc(r.sdt) + '" style="font-size:18px;font-weight:700">' +
        esc(r.sdt) + '</a></td></tr>' +
        hang('Khu vực', r.khuVuc) +
        hang('Kiểu bếp', r.kieuBep) +
        hang('Kích thước', r.kichThuoc) +
        hang('Ngân sách', r.nganSach) +
        hang('Mẫu đã chọn', r.mauDaChon) +
        hang('Giá dự toán', r.giaDuToan) +
        hang('Ghi chú', r.ghiChu) +
        hang('Trang gửi', r.trang) +
        hang('UTM', (r.utmSource || r.utmCampaign) ? (r.utmSource + ' / ' + r.utmCampaign) : '') +
      '</table>' +
      (linkSheet ? '<p style="margin-top:16px"><a href="' + linkSheet +
        '" style="background:#C8A45D;color:#1F2328;padding:10px 18px;border-radius:8px;' +
        'text-decoration:none;font-weight:700">Mở Google Sheet</a></p>' : '') +
    '</div>';

  MailApp.sendEmail({
    to: to,
    subject: '🔔 Khách mới: ' + r.hoTen + ' – ' + r.sdt,
    htmlBody: html,
    name: 'Website tủ bếp nhôm'
  });
}

/** Escape HTML cho nội dung Telegram / email. */
function esc(v) {
  return chuoi(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


/* ==========================================================================
 *  6. TIỆN ÍCH CHẠY TAY TRONG TRÌNH SOẠN THẢO APPS SCRIPT
 * ========================================================================== */

/** Chạy một lần sau khi dán code: tạo sẵn tất cả các tab kèm tiêu đề cột. */
function thietLapBanDau() {
  if (thuocTinh('SHEET_MODE') === 'CHUNG') {
    layTab(TAB_CHUNG);
  } else {
    Object.keys(NGUON_FORM).forEach(function (ma) { layTab(NGUON_FORM[ma].tab); });
  }
  Logger.log('Đã tạo xong các tab. Bây giờ hãy Triển khai → Ứng dụng web.');
}

/** Kiểm tra nhanh xem Script Properties đã khai báo đủ chưa. */
function kiemTraCauHinh() {
  var ds = ['SHEET_ID', 'TURNSTILE_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
            'NOTIFY_EMAIL', 'SHEET_MODE'];
  ds.forEach(function (k) {
    var v = thuocTinh(k);
    Logger.log(k + ': ' + (v ? '✔ đã khai báo' : '— trống'));
  });
  try {
    Logger.log('File Sheet: ' + moFile().getName());
  } catch (e) {
    Logger.log('⚠ Không mở được Sheet: ' + e.message);
  }
}

/** Gửi thử một bản ghi giả để kiểm tra Sheet + Telegram + email. */
function guiThuMotDong() {
  var ketQua = doPost({
    parameter: {
      form_source: 'bao-gia-nhanh',
      name: 'Nguyễn Văn Thử',
      phone: '0901234567',
      size: '3 – 4 mét dài',
      note: 'Đây là dòng kiểm tra, có thể xoá.',
      page: 'https://tubepnhom.vn/ (kiểm tra)',
      elapsed_ms: '9000'
    }
  });
  Logger.log(ketQua.getContent());
}
