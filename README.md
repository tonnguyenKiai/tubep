# Website tủ bếp nhôm – hướng dẫn sử dụng & triển khai

Website tĩnh (HTML5 + CSS3 + JavaScript thuần), không framework, không build step.
Mở trực tiếp bằng trình duyệt là chạy được, hoặc kéo thả lên Cloudflare Pages / Netlify / GitHub Pages.

---

## 1. Cấu trúc thư mục

```
/
├── index.html                                     Trang chủ
├── mau-tu-bep/
│   ├── index.html                                 Danh mục 12 mẫu + bộ lọc
│   └── tu-bep-nhom-kinh-chu-l.html                Trang chi tiết mẫu (mẫu tham chiếu)
├── cong-trinh/index.html                          Thư viện công trình + slider so sánh trước/sau
├── bang-gia/index.html                            Bảng giá + công cụ dự toán
├── lien-he/index.html                             Form báo giá đầy đủ + bản đồ
├── kien-thuc/
│   ├── index.html                                 Danh sách bài viết
│   └── so-sanh-tu-bep-nhom-va-tu-bep-go.html      Bài viết mẫu ~1.250 từ
├── chinh-sach-bao-mat/index.html                  Chính sách bảo mật (ô tích đồng ý trỏ tới đây)
├── 404.html                                       Trang lỗi (noindex)
├── sitemap.xml                                    9 URL
├── robots.txt
├── google-apps-script/
│   └── Code.gs                                    Máy chủ nhận form, ghi Google Sheet (mục 4)
└── assets/
    ├── css/style.css                              Toàn bộ CSS (biến màu/typography ở :root)
    ├── js/config.js                               ⚙ URL Web App + Site Key Turnstile – sửa ở đây
    ├── js/main.js                                 Lõi dùng chung: menu, thanh đáy, form nhiều bước, ngăn báo giá, toast…
    ├── js/catalog.js                              Bộ lọc danh mục (bottom sheet) – chỉ trang danh mục
    ├── js/gallery.js                              Gallery ảnh – chỉ trang chi tiết mẫu
    ├── js/lightbox.js                             Phóng to ảnh (pinch/zoom) – trang chủ, chi tiết, công trình
    ├── js/estimator.js                            Công cụ dự toán – chỉ trang Bảng giá
    ├── js/animations.js                           Hiệu ứng cuộn (IntersectionObserver + CSS/WAAPI), nạp Lenis/Swiper khi cần
    ├── icons/favicon.svg
    └── images/README.txt                          Quy ước đặt tên & kích thước ảnh
```

### Chạy thử trên máy

Mở `index.html` bằng trình duyệt là xem được ngay. **Riêng `404.html` cần chạy qua máy chủ**
(vì nó dùng đường dẫn tuyệt đối `/assets/...` để hiển thị đúng ở bất kỳ URL sai nào).
Muốn chạy máy chủ cục bộ:

```bash
npx serve . -l 4173
```

---

## 2. Thay ảnh demo bằng ảnh thật

Hiện toàn bộ ảnh là **ảnh tạm lấy từ Unsplash** qua URL trực tiếp (mọi thẻ `<img>` dùng ảnh Unsplash
đều có ghi chú trong code). Khi có ảnh công trình thật, làm theo 4 bước:

**Bước 1 – Chuẩn bị file.** Xuất ảnh sang **WebP**, chất lượng 72–78:
- ảnh trong thẻ (card): bề ngang 800px
- ảnh lớn/lightbox/hero: bề ngang 1600px

**Bước 2 – Đặt tên file không dấu, nối bằng gạch ngang, có chứa từ khoá.** Tên file là một yếu tố SEO ảnh:

```
assets/images/tu-bep-nhom-kinh-chu-l-mau-trang.webp
assets/images/tu-bep-nhom-xingfa-chu-u-van-go.webp
assets/images/cong-trinh-tu-bep-nhom-thanh-xuan-01.webp
```

**Bước 3 – Sửa thẻ `<img>`.** Thay `src`/`srcset` bằng đường dẫn nội bộ, **giữ nguyên `width` và `height`**
(hai thuộc tính này chống nhảy layout – CLS) và **viết lại `alt` bằng tiếng Việt có dấu, mô tả đúng ảnh**:

```html
<img src="../assets/images/tu-bep-nhom-kinh-chu-l-mau-trang.webp"
     srcset="../assets/images/tu-bep-nhom-kinh-chu-l-mau-trang-400.webp 400w,
             ../assets/images/tu-bep-nhom-kinh-chu-l-mau-trang.webp 800w"
     sizes="(max-width: 640px) 100vw, 25vw"
     alt="Tủ bếp nhôm kính chữ L màu vân gỗ kết hợp mặt đá trắng tại Thanh Xuân"
     width="800" height="600" loading="lazy" decoding="async">
```

**Bước 4 – Ảnh LCP.** Mỗi trang có **đúng một ảnh quan trọng nhất** (ảnh hero / ảnh thẻ đầu tiên).
Ảnh đó **không** được có `loading="lazy"`, phải có `fetchpriority="high"`, và trong `<head>` có một thẻ
`<link rel="preload" as="image" ...>` trỏ tới nó. Khi đổi ảnh, nhớ **sửa cả thẻ preload trong `<head>`**.

Các trang đang có preload ảnh LCP: `index.html`, `mau-tu-bep/index.html`,
`mau-tu-bep/tu-bep-nhom-kinh-chu-l.html`, `cong-trinh/index.html`, `kien-thuc/index.html`,
`kien-thuc/so-sanh-tu-bep-nhom-va-tu-bep-go.html`.

> Khi đã dùng ảnh nội bộ, có thể xoá dòng `<link rel="preconnect" href="https://images.unsplash.com" crossorigin>`
> trong `<head>` của các trang.

---

## 3. Thêm một mẫu tủ mới

Trang danh mục cố tình **không sinh HTML bằng JavaScript** – 12 thẻ mẫu nằm sẵn trong file để Google đọc được,
JS chỉ ẩn/hiện khi lọc. Vì vậy thêm mẫu mới cần **2 việc song song**.

**Việc 1 – Dán thêm thẻ vào `mau-tu-bep/index.html`**, bên trong `<div class="grid grid--4" id="model-grid">`.
Copy một thẻ `<article class="model-card">` có sẵn rồi sửa nội dung. Chú ý các thuộc tính `data-*`,
chính chúng điều khiển bộ lọc:

```html
<article class="model-card" data-model
         data-material="kinh"      <!-- kinh | acrylic | alu | son-tinh-dien -->
         data-shape="chu-l"        <!-- chu-i | chu-l | chu-u | co-dao      -->
         data-color="van-go"       <!-- trang | den | xam | van-go          -->
         data-price="3200000"      <!-- đơn giá/mét dài, chỉ chữ số         -->
         data-anim="up">
  ...
</article>
```

**Việc 2 – Thêm một dòng vào mảng `MODELS` trong `assets/js/main.js`** (khoảng dòng 31).
Các giá trị phải **khớp đúng** với `data-*` ở trên:

```js
{ slug: 'tu-bep-nhom-kinh-chu-l-moi', name: 'Tủ bếp nhôm kính chữ L mới',
  material: 'kinh', shape: 'chu-l', color: 'van-go', price: 3200000,
  url: 'mau-tu-bep/tu-bep-nhom-kinh-chu-l-moi.html' },
```

**Nếu mẫu mới có trang chi tiết riêng**, copy `mau-tu-bep/tu-bep-nhom-kinh-chu-l.html` rồi sửa:
`<title>`, `<meta name="description">`, `<link rel="canonical">`, các thẻ `og:` / `twitter:`,
khối JSON-LD (`Product` + `BreadcrumbList`), `<h1>`, nội dung, và nhớ **thêm URL mới vào `sitemap.xml`**.

Bộ đếm "Đang hiển thị N mẫu" và nút "Xoá bộ lọc" tự chạy, không cần sửa gì thêm.

---

## 4. Nhận dữ liệu khách hàng vào Google Sheet

Website tĩnh không có máy chủ, nên nó gửi dữ liệu form sang một **Google Apps Script Web App**,
và script đó ghi từng dòng vào **Google Sheet** của bạn. Không cần database, không tốn phí hosting.

```
Trình duyệt khách  ──POST──▶  Apps Script Web App  ──▶  Google Sheet
   (form trên web)              (doPost trong Code.gs)     (mỗi dòng = 1 khách)
                                        │
                                        └──▶  Telegram / Email báo có khách mới
```

### 4.1. Năm form đang nối vào hệ thống

| Nguồn form (`form_source`) | Ở đâu | Tab mặc định trong Sheet |
|---|---|---|
| `bao-gia-day-du` | Form đầy đủ trang **Liên hệ** | `Báo giá đầy đủ` |
| `bao-gia-nhanh` | Form ngắn cuối **trang chủ** và trang **Công trình** | `Báo giá nhanh` |
| `mau-tu-bep` | Nút “Nhận báo giá mẫu này” ở **trang chi tiết mẫu** | `Theo mẫu tủ` |
| `du-toan` | Form gửi kết quả ở trang **Bảng giá** | `Dự toán` |
| `danh-sach-bao-gia` | **Danh sách báo giá** (ngăn kéo bên phải) | `Danh sách báo giá` |

Mỗi tab có cùng 15 cột:

```
Thời gian · Nguồn form · Trang gửi · Họ tên · Số điện thoại · Khu vực · Kiểu bếp ·
Kích thước · Ngân sách · Mẫu đã chọn · Giá dự toán · Ghi chú · Trạng thái xử lý ·
UTM nguồn · UTM chiến dịch
```

Cột **Trạng thái xử lý** luôn được điền sẵn `Mới` – bạn đổi tay thành *Đã gọi*, *Đã khảo sát*,
*Đã chốt*… để theo dõi.

> **Muốn gộp tất cả vào một tab?** Thêm Script Property `SHEET_MODE` = `CHUNG`.
> Khi đó mọi form ghi chung vào tab `Khách hàng`, phân biệt bằng cột *Nguồn form*.

### 4.2. Các bước cài đặt (làm một lần, khoảng 10 phút)

**Bước 1 – Tạo Google Sheet**

Vào <https://sheets.new>, đặt tên ví dụ *Khách hàng tủ bếp nhôm*. Không cần tạo tab hay tiêu đề cột –
script tự tạo. Chép lấy **ID bảng tính** nằm giữa `/d/` và `/edit` trên thanh địa chỉ:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit
                                        └──────────── ID bảng tính ────────────┘
```

**Bước 2 – Dán code Apps Script**

Trong Sheet: **Tiện ích mở rộng → Apps Script**. Xoá hết nội dung `Code.gs` mặc định,
dán **toàn bộ** nội dung file `google-apps-script/Code.gs` của dự án này vào. Bấm lưu (Ctrl+S).

**Bước 3 – Khai báo Script Properties**

Trong trình chỉnh sửa Apps Script: **⚙ Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính**.

| Thuộc tính | Bắt buộc? | Giá trị |
|---|---|---|
| `SHEET_ID` | Nên có | ID bảng tính ở bước 1 |
| `TURNSTILE_SECRET` | Không | Secret key Cloudflare Turnstile (mục 4.4) |
| `TELEGRAM_BOT_TOKEN` | Không | Token bot Telegram (mục 4.5) |
| `TELEGRAM_CHAT_ID` | Không | Chat ID nhận thông báo (mục 4.5) |
| `NOTIFY_EMAIL` | Không | Email nhận thông báo khách mới |
| `SHEET_MODE` | Không | `TACH` (mặc định) hoặc `CHUNG` |
| `ALLOWED_ORIGIN` | Không | Tên miền website, ví dụ `https://tubepnhom.vn` |

> ⚠️ **Không bao giờ viết secret key, bot token thẳng vào `Code.gs`.** File đó có thể bị chia sẻ
> hoặc đưa lên Git. Mọi thứ nhạy cảm đều đọc từ Script Properties.

Nếu bỏ trống `TURNSTILE_SECRET`, script **bỏ qua** bước kiểm tra Turnstile và vẫn ghi dữ liệu bình thường.
Nếu bỏ trống cả `TELEGRAM_*` lẫn `NOTIFY_EMAIL`, script chỉ ghi Sheet, không gửi thông báo.

**Bước 4 – Chạy thử trong trình chỉnh sửa**

Chọn hàm `thietLapBanDau` trong danh sách thả xuống rồi bấm **Chạy**.
Lần đầu Google hỏi quyền → **Xem lại quyền → chọn tài khoản → Nâng cao → Chuyển tới … (không an toàn) → Cho phép**.
(Cảnh báo này là bình thường với script tự viết, chưa qua kiểm duyệt của Google.)

Hàm này tạo sẵn các tab và dòng tiêu đề. Chạy tiếp `kiemTraCauHinh()` để xem bảng nhật ký
báo thuộc tính nào đã khai, thiếu gì.

**Bước 5 – Deploy thành Web App**

**Triển khai → Tuỳ chọn triển khai mới → ⚙ chọn loại → Ứng dụng web**, rồi đặt:

| Mục | Chọn |
|---|---|
| Mô tả | *Nhận form tủ bếp nhôm v1* |
| Thực thi với tư cách (**Execute as**) | **Tôi** (`Me`) |
| Ai có quyền truy cập (**Who has access**) | **Bất kỳ ai** (`Anyone`) |

> Bắt buộc phải là **Me + Anyone**: khách vào website không đăng nhập Google, nên script phải
> chạy bằng quyền của bạn và phải cho phép mọi người gọi. Script chỉ **ghi** vào Sheet, không
> trả dữ liệu khách ra ngoài, nên cấu hình này an toàn.

Bấm **Triển khai**, chép **URL ứng dụng web** dạng:

```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

Mở URL đó bằng trình duyệt: thấy `{"ok":true,"service":"Tủ bếp nhôm – nhận form",...}` là chạy đúng.

**Bước 6 – Dán URL vào website**

Mở `assets/js/config.js`, thay chuỗi chờ:

```js
window.SITE_CONFIG = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxxxx.../exec',
  TURNSTILE_SITE_KEY: '',          // để trống nếu chưa dùng Turnstile
  REQUEST_TIMEOUT_MS: 15000,
  MIN_FILL_SECONDS: 3,
  HOTLINE: '0901 234 567',
  HOTLINE_TEL: '0901234567',
  ZALO_URL: 'https://zalo.me/0901234567',
  COMPANY_NAME: 'Nhôm Kính Thành Đạt'
};
```

Gửi thử một form trên website → mở Sheet xem dòng mới. Xong.

> **Chế độ demo:** khi `WEB_APP_URL` vẫn là `DAN-URL-WEB-APP-CUA-BAN-VAO-DAY`, form kiểm tra dữ liệu,
> in nội dung ra Console rồi báo thành công nhưng **không gửi đi đâu cả**. Bấm thử thoải mái.

> 🔁 **Mỗi lần sửa `Code.gs` phải deploy lại**, nếu không bản cũ vẫn chạy:
> **Triển khai → Quản lý triển khai → ✏️ (bút chì) → Phiên bản: Phiên bản mới → Triển khai.**
> URL giữ nguyên, không cần sửa `config.js`.

### 4.3. Chống spam và bảo vệ dữ liệu

Phía website (`assets/js/main.js`):

- **Honeypot** – mỗi form có ô ẩn tên `website`. Người thật không thấy; bot điền vào thì bỏ qua. **Đừng xoá ô này.**
- **Bấm giờ** – gửi nhanh hơn `MIN_FILL_SECONDS` (mặc định 3 giây) coi là bot.
- **Turnstile** – nếu có site key, token được gửi kèm.
- **Hết giờ 15 giây** – quá hạn thì báo lỗi kèm hotline và Zalo, không treo nút “Đang gửi…”.

Phía Apps Script (`Code.gs`):

- Kiểm tra lại honeypot và thời gian điền (không tin dữ liệu từ trình duyệt).
- Xác minh token Turnstile với `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
  Nếu Cloudflare lỗi mạng, script **vẫn ghi** để không chặn nhầm khách thật.
- Kiểm tra lại họ tên và số điện thoại Việt Nam hợp lệ, giới hạn độ dài từng trường (ghi chú tối đa 1.000 ký tự).
- **Chống chèn công thức:** giá trị bắt đầu bằng `=` `+` `-` `@` được thêm dấu `'` phía trước,
  để kẻ xấu không chèn công thức chạy trong Sheet của bạn.
- **`LockService`** khi ghi dòng mới – nhiều khách gửi cùng lúc không đè lên nhau.
- **`CacheService`** chặn trùng: cùng số điện thoại gửi nhiều lần trong **2 phút** chỉ ghi một dòng.

### 4.4. Bật Cloudflare Turnstile (không bắt buộc)

1. Vào <https://dash.cloudflare.com> → **Turnstile** → **Add site**.
2. Domain: tên miền website. Widget mode: **Managed** (hoặc **Invisible**).
3. Nhận **Site Key** (bắt đầu bằng `0x…`) và **Secret Key**.
4. Site Key → `TURNSTILE_SITE_KEY` trong `assets/js/config.js`.
5. Secret Key → Script Property `TURNSTILE_SECRET` (**không** để trong file website).

Script Turnstile chỉ được tải khi có site key, nên để trống thì website không tải thêm gì.
Khi đã có site key, script (~27 KB gzip) **vẫn chưa tải lúc mở trang**: chỉ tới khi khách chạm
hoặc đặt con trỏ vào form thì mới tải. Nhờ vậy ngân sách JS lúc mở trang không đổi và LCP không bị chậm.
Nếu khách bấm gửi khi mã xác thực chưa sẵn sàng, website tự chờ tối đa 8 giây rồi mới gửi.
Giao diện dùng `appearance: 'interaction-only'` – ô xác thực chỉ hiện ra khi Cloudflare thấy nghi ngờ.

### 4.5. Thông báo có khách mới

**Telegram:**

1. Nhắn cho [@BotFather](https://t.me/BotFather) → `/newbot` → đặt tên → nhận **bot token**.
2. Nhắn một câu bất kỳ cho bot vừa tạo (hoặc thêm bot vào nhóm công ty).
3. Mở `https://api.telegram.org/bot<TOKEN>/getUpdates`, tìm `"chat":{"id":123456789}` → đó là **chat ID**
   (nhóm thì id là số âm).
4. Điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` vào Script Properties.

Tin nhắn gồm tên khách, **số điện thoại bấm gọi được**, nguồn form, mẫu đã chọn và nút mở Sheet.

**Email:** điền `NOTIFY_EMAIL`. Apps Script dùng `MailApp`, hạn mức miễn phí 100 thư/ngày
với tài khoản Gmail thường.

> Nếu gửi thông báo lỗi (hết hạn mức, token sai…), script **vẫn ghi dữ liệu vào Sheet bình thường**
> và không báo lỗi cho khách. Lỗi được ghi vào nhật ký Apps Script (**Thực thi** ở menu trái).

### 4.6. Danh sách báo giá (thay cho giỏ hàng)

- Nút **“Thêm vào danh sách báo giá”** nằm trên mọi thẻ mẫu và trang chi tiết.
- Biểu tượng trên header hiện số mẫu đã chọn; bấm vào mở **ngăn kéo** bên phải.
- Danh sách lưu trong `localStorage` (khoá `tbn_danh_sach_bao_gia`), tối đa 12 mẫu.
  Nếu trình duyệt chặn `localStorage` (chế độ ẩn danh chặt), danh sách vẫn chạy trong phiên hiện tại.
- Gửi thành công → danh sách tự xoá, hiện lời cảm ơn.
- Tên các mẫu được gộp vào cột **Mẫu đã chọn**, ngăn cách bằng ` · `.

Muốn thêm nút cho một mẫu mới, chép đúng khối này vào trong `.model-card__body`:

```html
<button class="btn-quote" type="button" data-add-quote
        data-slug="tu-bep-nhom-xingfa-chu-u"
        data-name="Tủ bếp nhôm Xingfa chữ U"
        data-price="3.600.000đ / mét dài"
        data-url="tu-bep-nhom-xingfa-chu-u.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span data-add-quote-label>Thêm vào danh sách báo giá</span></button>
```

`data-slug` phải **không trùng** với mẫu khác (dùng để chống thêm hai lần).

### 4.7. Theo dõi chuyển đổi (GA4) và nguồn quảng cáo

- Gửi form thành công → bắn sự kiện `generate_lead` kèm tham số `form_source`.
  Có `gtag()` thì gọi thẳng, không thì đẩy vào `dataLayer` cho GTM.
  Chưa gắn GA4 thì không sao, đoạn code tự bỏ qua.
- Tham số `utm_source`, `utm_medium`, `utm_campaign` trên URL được lưu vào `sessionStorage`
  và gửi kèm mọi form sau đó – kể cả khi khách đã chuyển qua vài trang.

### 4.8. Ảnh đính kèm

Apps Script nhận dữ liệu dạng `URLSearchParams` (không phải JSON, để tránh lỗi CORS preflight),
nên **không gửi kèm file được**. Ô chọn ảnh ở trang Liên hệ chỉ ghi vào cột *Ghi chú* rằng
khách có sẵn N ảnh; phần mô tả ô đã nhắc khách gửi ảnh qua Zalo.
Cần nhận file thật thì phải đổi sang Google Drive API hoặc một dịch vụ form có trả phí.

### 4.9. Trang chính sách bảo mật

Mọi form đều có ô tích bắt buộc *“Tôi đồng ý để … liên hệ tư vấn”*, liên kết tới
`chinh-sach-bao-mat/index.html`. Trước khi chạy thật, hãy đọc lại trang này và sửa cho khớp
thực tế doanh nghiệp bạn: thời gian lưu dữ liệu, ai được xem, các dịch vụ bên thứ ba đang dùng.

### 4.10. Khắc phục sự cố

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Form báo lỗi mạng, Console có `Failed to fetch` | Chưa deploy, hoặc **Who has access** không phải *Anyone* |
| Gửi xong nhưng Sheet trống | `SHEET_ID` sai, hoặc sửa code mà chưa deploy phiên bản mới |
| Luôn báo “Hệ thống chưa xác minh được…” | `TURNSTILE_SECRET` không khớp với site key đang dùng |
| Gửi hai lần chỉ thấy một dòng | Đúng như thiết kế: chặn trùng 2 phút theo số điện thoại |
| Không có thông báo Telegram | Chưa nhắn cho bot lần nào, hoặc chat ID sai dấu âm |
| Cột tiêu đề bị lệch | Đã sửa tay dòng 1 trong Sheet – xoá tab đó rồi chạy lại `thietLapBanDau()` |

Xem nhật ký lỗi chi tiết: trình chỉnh sửa Apps Script → **Thực thi** ở menu bên trái.

---

## 5. Thay thông tin công ty

Dữ liệu demo hiện tại là **Nhôm Kính Thành Đạt**. Cần thay những chỗ sau trên **cả 10 trang**
(có ở header, footer, nội dung, khối JSON-LD và `assets/js/config.js`):

| Hạng mục | Giá trị demo đang dùng |
|---|---|
| Tên công ty | Nhôm Kính Thành Đạt |
| Hotline / Zalo | `0901 234 567` → kiểm tra cả `tel:0901234567` và `https://zalo.me/0901234567` |
| Email | `lienhe@tubepnhom.vn` |
| Địa chỉ | 128 Đường Lê Văn Lương, P. Nhân Chính, Q. Thanh Xuân, Hà Nội |
| Tên miền | `https://tubepnhom.vn` (có trong canonical, og:url, sitemap.xml, robots.txt) |
| Toạ độ bản đồ | `21.0049, 105.8065` (trong JSON-LD `geo` và trong URL iframe Google Maps) |
| Giờ làm việc | T2–T7 8:00–18:00 · CN 8:00–12:00 |
| Số liệu | 12 năm kinh nghiệm · 1.500+ công trình · bảo hành 24 tháng |
| Khu vực phục vụ | Hà Nội · Bắc Ninh · Hưng Yên · Hải Dương · Vĩnh Phúc · Hà Nam |
| Mã số thuế | 0101234567 |
| Facebook / Messenger | link trong footer và cụm nút nổi |

Cách nhanh nhất là tìm–thay hàng loạt. Ví dụ đổi tên miền:

```bash
sed -i 's#https://tubepnhom.vn#https://tenmienmoi.vn#g' *.html */*.html sitemap.xml robots.txt
```

**Lấy toạ độ thật:** mở Google Maps → chuột phải vào vị trí xưởng → số đầu là vĩ độ (latitude),
số sau là kinh độ (longitude). Dán vào JSON-LD (`"latitude"`, `"longitude"`) và vào thuộc tính `data-map-src`
của khối bản đồ trong HTML (footer của cả 10 trang, và thêm một khối nữa ở trang Liên hệ):

```html
<div class="footer__map map-embed ratio ratio--4x3 mt-5"
     data-map-src="https://www.google.com/maps?q=21.0049,105.8065&amp;hl=vi&amp;z=15&amp;output=embed"
     data-map-title="Bản đồ đường tới xưởng tủ bếp nhôm Thành Đạt">
```

Bản đồ chỉ được tải khi người dùng cuộn tới hoặc bấm vào ảnh giữ chỗ, nên không ảnh hưởng tốc độ trang.

---

## 6. Sửa bảng giá & công cụ dự toán

Trong `bang-gia/index.html`, giá nằm ở **hai nơi phải khớp nhau**:

1. **Bảng hiển thị** – các thẻ `<td>` trong `.table__price` và bảng phụ kiện.
2. **Dữ liệu tính toán** – thuộc tính `data-price` trên các `<option>` và `<input type="checkbox">`
   của form `#estimator`.

```html
<option value="xingfa-14" data-price="2800000">Nhôm Xingfa 1,4mm – 2.800.000đ/md</option>
<input type="checkbox" name="extra" data-price="1400000" data-unit="md" data-label="Mặt đá nhân tạo 18mm">
```

- `data-unit="md"` = phụ kiện tính theo mét dài (nhân với chiều dài tủ dưới).
  Không có `data-unit` = tính trọn gói một lần.
- Công thức: `đơn giá/md = giá khung nhôm + phụ thu loại cánh`, rồi
  `tủ dưới × đơn giá + tủ trên × đơn giá × 0,85 + phụ kiện` (tủ trên tính bằng 85% vì nông hơn), rồi hiển thị
  khoảng **−8% đến +12%** quanh con số đó.
  Muốn đổi biên độ, sửa hằng số `0.92` và `1.12` trong module dự toán (`assets/js/main.js`).
- Nhớ cập nhật `priceRange` trong JSON-LD và khối `Product`/`AggregateOffer` ở trang chi tiết.

---

## 7. Deploy lên Cloudflare Pages

### Cách A – Kéo thả (nhanh nhất, không cần Git)

1. Nén **toàn bộ nội dung bên trong** thư mục dự án thành `.zip`
   (nén các file `index.html`, `assets/`… chứ không nén thư mục cha).
2. Đăng nhập <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** →
   **Upload assets**.
3. Đặt tên project (ví dụ `tu-bep-nhom`) → kéo file `.zip` vào → **Deploy site**.
4. Vài giây sau có link `https://tu-bep-nhom.pages.dev`.

### Cách B – Nối với GitHub (tự động deploy mỗi lần sửa)

1. Đẩy thư mục này lên một repository GitHub.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
3. Cấu hình build – **để trống hết vì đây là site tĩnh**:
   - Framework preset: **None**
   - Build command: *(để trống)*
   - Build output directory: `/`
4. **Save and Deploy.** Từ đó mỗi lần `git push` là site tự cập nhật.

### Gắn tên miền riêng

Trong project vừa tạo → tab **Custom domains** → **Set up a domain** → nhập `tenmien.vn`.
Nếu tên miền đã dùng Cloudflare DNS thì bản ghi được thêm tự động; nếu không, Cloudflare sẽ
hướng dẫn trỏ CNAME. HTTPS được cấp miễn phí, tự động.

**Sau khi có tên miền thật, nhớ làm 3 việc:**
1. Thay toàn bộ `https://tubepnhom.vn` trong code (xem mục 5).
2. Cập nhật dòng `Sitemap:` trong `robots.txt`.
3. Khai báo website với [Google Search Console](https://search.google.com/search-console)
   và nộp `sitemap.xml`.

### Trang 404

Cloudflare Pages, Netlify và GitHub Pages đều **tự động** dùng file `404.html` ở thư mục gốc.
Không cần cấu hình gì thêm.

### Netlify / GitHub Pages

- **Netlify:** kéo thả thư mục vào <https://app.netlify.com/drop> là xong.
- **GitHub Pages:** Settings → Pages → Source: `main` / `(root)`.
  Nếu site chạy ở đường dẫn con (`username.github.io/ten-repo/`), **404.html sẽ không tìm thấy CSS**
  vì nó dùng đường dẫn tuyệt đối. Khi đó nên dùng tên miền riêng hoặc Cloudflare Pages.

---

## 8. Ghi chú kỹ thuật

### Thư viện ngoài (đều ghim phiên bản cụ thể, không dùng `@latest`)

| Thư viện | Phiên bản | Dùng ở trang | Dung lượng (gzip) |
|---|---|---|---|
| Lenis | 1.1.20 | mọi trang có hiệu ứng, **chỉ máy tính dùng chuột** (không nạp trên điện thoại) | 4,0 KB |
| Swiper | 11.0.5 | **chỉ trang chủ** (slider cảm nhận), nạp động khi slider sắp vào màn hình; máy yếu dùng cuộn-snap thay thế | 41,0 KB |

GSAP và ScrollTrigger **đã được gỡ** ở đợt tối ưu mobile (tiết kiệm ≈ 45 KB gzip): hiệu ứng cuộn nay do
`animations.js` tự viết bằng IntersectionObserver + CSS transition + Web Animations API.
Lightbox, gallery và slider so sánh trước/sau cũng **tự viết bằng vanilla JS**.

Mã của website (gzip): `main.js` 24,9 KB · `animations.js` 5,5 KB · `lightbox.js` 4,8 KB · `catalog.js` 4,1 KB ·
`gallery.js` 3,3 KB · `estimator.js` 2,5 KB · `config.js` 1,0 KB.

**Tổng JS mỗi trang (gzip):** trang chủ ≈ 36 KB ban đầu (+41 KB Swiper khi cuộn tới slider, +4 KB Lenis trên máy tính) ·
chi tiết mẫu ≈ 39 KB · các trang khác 28–36 KB. Tất cả dưới ngân sách 120 KB.
Số đo bằng `gzip -9` trên file thật.

Muốn **tự host thư viện** thay vì dùng CDN: tải file về `assets/vendor/` rồi sửa URL trong `animations.js`
(hằng số CDN ở đầu file). Giữ nguyên thuộc tính `defer` của các thẻ `<script>`.

### Vì sao không nội tuyến (inline) critical CSS

Toàn site chỉ có **một file CSS ~127 KB (≈29 KB sau gzip; ≈35 KB là chú thích)**. Khi lên hosting nên bật nén/minify CSS (Cloudflare Auto Minify hoặc bước build) để còn ≈17 KB gzip. Qua HTTP/2 của Cloudflare, chi phí chặn
render của nó không đáng kể, trong khi nội tuyến sẽ lặp lại CSS ở cả 9 file, làm HTML nặng thêm và
dễ sinh FOUC khi sửa. Thay vào đó: font Google và CSS của Swiper được tải **bất đồng bộ**
(`media="print" onload="this.media='all'"` kèm `<noscript>` dự phòng).

### Đường dẫn tương đối

Mọi liên kết dùng đường dẫn tương đối (`../mau-tu-bep/index.html`) để mở được bằng `file://`.
Ngoại lệ duy nhất là `404.html` dùng đường dẫn tuyệt đối (`/assets/…`) vì máy chủ trả nó về ở
bất kỳ URL nào. Nếu muốn chuyển cả site sang đường dẫn tuyệt đối sau khi lên hosting:

```bash
sed -i -E 's#(href|src)="\.\./#\1="/#g; s#(href|src)="(index\.html|mau-tu-bep/|cong-trinh/|bang-gia/|lien-he/|kien-thuc/|assets/)#\1="/\2#g' *.html */*.html
```

### Hiệu ứng không làm hỏng SEO

- Toàn bộ văn bản, ảnh, liên kết **nằm sẵn trong HTML**, JS không sinh nội dung mới.
- CSS **không** ẩn nội dung mặc định. Script nội tuyến trong `<head>` thêm class `js-anim`
  vào `<html>`; chỉ khi có class đó các phần tử mới ở trạng thái ẩn ban đầu.
  Tắt JS hoặc CDN lỗi → nội dung hiện đầy đủ. Ngoài ra còn bộ đếm an toàn 2,5 giây
  tự bỏ ẩn nếu script không chạy được.
- Chỉ animate `transform` và `opacity`; mọi khung ảnh đã đặt sẵn tỉ lệ → **CLS ≈ 0**.
- Phần tử LCP (H1, mô tả hero, ảnh hero) **không bị ẩn, không có delay**.
- Bật "giảm chuyển động" trong hệ điều hành → tắt Lenis, tắt hiệu ứng, nội dung hiện ngay.
- Lenis chỉ nạp trên máy tính dùng chuột; điện thoại giữ cuộn gốc của trình duyệt.
- Nếu `main.js` không tới được sau 4 giây, trang tự chuyển sang chế độ dự phòng (class `js-fail`): menu dạng hàng liên kết, form và bộ lọc hiện đầy đủ.

### Tuỳ biến giao diện

Mở `assets/css/style.css`, toàn bộ màu – font – khoảng cách – bo góc – bóng đổ nằm trong khối
`:root` ở đầu file. Ví dụ đổi màu nhấn:

```css
:root {
  --c-accent: #C8A45D;      /* màu đồng, dùng cho nút và điểm nhấn */
  --c-accent-ink: #8A6A28;  /* bản đậm hơn, dùng cho chữ trên nền trắng (đạt WCAG AA) */
}
```

> Nếu đổi màu nhấn, nhớ kiểm tra độ tương phản tại <https://webaim.org/resources/contrastchecker/>:
> chữ thường cần tối thiểu **4.5:1**.

---

## 9. Việc cần làm trước khi chạy thật

- [ ] Thay toàn bộ ảnh Unsplash bằng ảnh công trình thật (mục 2)
- [ ] Thay thông tin công ty, hotline, email, địa chỉ, MST (mục 5)
- [ ] Thay toạ độ bản đồ bằng toạ độ xưởng thật (mục 5)
- [ ] Tạo Google Sheet, deploy Apps Script, dán URL vào `assets/js/config.js` rồi gửi thử một form (mục 4)
- [ ] Bật Cloudflare Turnstile và khai `TURNSTILE_SECRET` trong Script Properties (mục 4.4)
- [ ] Bật thông báo Telegram và/hoặc email cho khách mới (mục 4.5)
- [ ] Đọc lại và sửa `chinh-sach-bao-mat/index.html` cho khớp thực tế doanh nghiệp (mục 4.9)
- [ ] Thay `https://tubepnhom.vn` bằng tên miền thật ở mọi nơi, kể cả `sitemap.xml` và `robots.txt`
- [ ] Tạo ảnh Open Graph thật, kích thước **1200×630**, thay vào các thẻ `og:image`
- [ ] Kiểm tra lại giá trong bảng giá và trong `data-price` (mục 6)
- [ ] Cập nhật `lastmod` trong `sitemap.xml`
- [ ] Khai báo Search Console, nộp sitemap, tạo hồ sơ Google Business Profile
- [ ] Chạy Lighthouse (chế độ mobile) sau khi đã lên hosting thật
- [ ] Kiểm tra dữ liệu có cấu trúc tại <https://search.google.com/test/rich-results>
- [ ] Chia sẻ thử một link lên Facebook/Zalo xem ảnh và tiêu đề hiển thị đúng chưa
