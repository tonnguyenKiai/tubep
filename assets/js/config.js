/* ============================================================================
   CẤU HÌNH KẾT NỐI GOOGLE SHEET & CHỐNG SPAM
   ----------------------------------------------------------------------------
   Đây là file DUY NHẤT bạn cần sửa khi đưa website lên chạy thật.
   Không cần mở main.js.

   1. WEB_APP_URL       – dán URL Web App của Google Apps Script
                          (xem hướng dẫn chi tiết ở README.md, mục 10)
   2. TURNSTILE_SITE_KEY – Site Key của Cloudflare Turnstile.
                          Để trống nếu chưa dùng, form vẫn gửi bình thường.

   Khi WEB_APP_URL còn để nguyên giá trị mẫu, website chạy ở CHẾ ĐỘ DEMO:
   form vẫn kiểm tra dữ liệu, vẫn báo thành công, nhưng không gửi đi đâu cả
   (dữ liệu được in ra Console của trình duyệt để bạn xem thử).
   ========================================================================== */

window.SITE_CONFIG = {

  /* --- Bắt buộc: URL Web App dạng https://script.google.com/macros/s/..../exec --- */
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwytJX4xBF0EkTFFGrhy608QCe243hMY6fQqLfh3ed2rEGGAGDmWBCMRjSlwPHtcN7s/exec',

  /* --- Không bắt buộc: Site Key Cloudflare Turnstile (bắt đầu bằng 0x....) --- */
  TURNSTILE_SITE_KEY: '',

  /* --- Thời gian chờ tối đa cho một lần gửi (mili giây) --- */
  REQUEST_TIMEOUT_MS: 15000,

  /* --- Gửi nhanh hơn số giây này bị coi là bot và bỏ qua --- */
  MIN_FILL_SECONDS: 3,

  /* --- Thông tin liên hệ dùng trong thông báo lỗi gửi form --- */
  HOTLINE: '0353 353 190',
  HOTLINE_TEL: '0353353190',
  ZALO_URL: 'https://zalo.me/0353353190',

  /* --- Tên công ty hiển thị trong ô đồng ý nhận liên hệ --- */
  COMPANY_NAME: 'Tủ Bếp Hưng Phát'
};
