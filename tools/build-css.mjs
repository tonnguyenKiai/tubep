// Sinh bản CSS rút gọn cho website – không cần thư viện ngoài (chỉ dùng Node có sẵn).
//
//   node tools/build-css.mjs          → ghi assets/css/style.min.css + cập nhật ?v= trong mọi file .html
//   node tools/build-css.mjs --check  → chỉ kiểm tra, báo lỗi (exit 1) nếu bản rút gọn hoặc ?v= đã cũ
//
// style.css là BẢN NGUỒN (có chú thích, dễ đọc) – mọi chỉnh sửa làm ở đó.
// style.min.css là BẢN CHẠY (các trang đang dùng) – không sửa tay, luôn sinh lại bằng lệnh trên.
// ?v=<mã băm> đổi mỗi khi nội dung CSS đổi → trình duyệt tải bản mới ngay, dù file được cache lâu.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets/css/style.css');
const OUT = join(ROOT, 'assets/css/style.min.css');
const HEADER = '/* Ban rut gon tu sinh tu style.css - KHONG sua file nay, sua style.css roi chay: node tools/build-css.mjs */\n';
const SKIP_DIRS = new Set(['.git', '.claude', 'node_modules', 'tools']);

/* Rút gọn an toàn: bỏ chú thích, gộp khoảng trắng, bỏ khoảng trắng quanh { } ; , và sau dấu ":".
   Chuỗi trong nháy ("..." / '...') được giữ nguyên tuyệt đối. KHÔNG đụng tới khoảng trắng trước ":"
   (".a :hover" khác ".a:hover") và quanh + - trong calc(). */
function minify(css) {
  const strings = [];
  let s = '';
  for (let i = 0; i < css.length; ) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {               // chú thích → 1 khoảng trắng
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 2;
      s += ' ';
    } else if (c === '"' || c === "'") {                 // chuỗi → giữ chỗ \0n\0
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      strings.push(css.slice(i, j + 1));
      s += '\0' + (strings.length - 1) + '\0';
      i = j + 1;
    } else {
      s += c;
      i++;
    }
  }
  s = s
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();
  return s.replace(/\0(\d+)\0/g, (_, k) => strings[k]);
}

function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) out.push(...htmlFiles(join(dir, e.name))); }
    else if (e.name.endsWith('.html')) out.push(join(dir, e.name));
  }
  return out;
}

const check = process.argv.includes('--check');
const min = HEADER + minify(readFileSync(SRC, 'utf8')) + '\n';
const version = createHash('sha256').update(min).digest('hex').slice(0, 8);
const LINK = /(href="[^"]*assets\/css\/)style(?:\.min)?\.css(?:\?v=[0-9a-f]*)?"/g;
const stale = [];

let current = '';
try { current = readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n'); } catch {}   // Git trên Windows có thể đổi LF → CRLF khi checkout
if (current !== min) {
  stale.push('assets/css/style.min.css');
  if (!check) writeFileSync(OUT, min);
}
for (const file of htmlFiles(ROOT)) {
  const html = readFileSync(file, 'utf8');
  const next = html.replace(LINK, `$1style.min.css?v=${version}"`);
  if (next !== html) {
    stale.push(relative(ROOT, file).replace(/\\/g, '/'));
    if (!check) writeFileSync(file, next);
  }
}

const kb = n => (n / 1024).toFixed(1) + ' KB';
if (check) {
  if (stale.length) {
    console.error('CSS rút gọn đã cũ, hãy chạy: node tools/build-css.mjs\n  ' + stale.join('\n  '));
    process.exit(1);
  }
  console.log('OK – style.min.css và ?v=' + version + ' đã khớp style.css');
} else {
  console.log(`style.css ${kb(Buffer.byteLength(readFileSync(SRC)))} → style.min.css ${kb(Buffer.byteLength(min))} (v=${version})`);
  console.log(stale.length ? 'Đã cập nhật:\n  ' + stale.join('\n  ') : 'Không có gì thay đổi.');
}
