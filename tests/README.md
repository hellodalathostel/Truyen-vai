# Truyện Vai — bộ kiểm thử

Đây là bộ kiểm thử của generator **perchance.org/phufantasyroleplay** ("Truyện Vai").
Nó được đóng gói kèm mã nguồn, chạy được ở hai tầng, và **không** là một phần của
generator đang phát hành: `src/` mới là thứ người dùng tải về.

## Chạy

Tầng Node (hàm thuần, không cần trình duyệt, không tốn quota):

    npm test

Tầng trình duyệt (chạy trong trang thật, có DOM, IndexedDB, kv-plugin; tốn quota AI nếu
bật các bộ "thật"). Mở generator trong trình duyệt rồi nạp `tests/browser/runner.js` và
gọi `chayTatCa()` — xem `tests/browser/runner.js` để biết cách đăng ký `window.__tvNguon`.

## Cấu trúc

    tests/
      lib/h.js                  khung kiểm thử tối giản, dùng CHUNG cho cả hai tầng
      lib/moi-truong.js         dựng window.TRUYEN_VAI_ROOT giả trước khi nạp src/*
      fixtures/*.mjs            dữ liệu mẫu HƯ CẤU (truyện, phiếu, kế hoạch, vắng mặt)
      node/*.test.mjs           tầng Node — hàm thuần, không DOM
      browser/*.js              tầng trình duyệt — mỗi tệp là một "bộ"
      browser/runner.js         DANH_MUC + bộ chạy + báo cáo
      README.md                 tệp này

## Luật không được vi phạm

1. **Dữ liệu thật của người dùng không bao giờ được ghi vào bất kỳ tệp nào của gói.**
   Bộ kiểm thử muốn kiểm tra trên truyện thật thì phải đọc chúng **trong bộ nhớ** lúc
   chạy (qua `root.kv.cotTruyen.entries()` và lọc bỏ id có tiền tố test), đối chiếu,
   rồi bỏ đi. Không chụp lại, không lưu lại, không đưa vào zip. Mọi tên/id trong
   `fixtures/` phải là hư cấu và trung tính.
2. **Không đặt tệp kiểm thử, dữ liệu mẫu, bản nháp hay bản zip nào trong `src/`.**
   `src/` là mã công khai, tốn quota lưu trữ, và là thứ người dùng đọc.
   `goi-chung.test.mjs` canh điều này (cả gốc gói lẫn `src/`).
3. **Không đổi hình dạng dữ liệu đã lưu** nếu không tăng `PHIEN_BAN_TRUYEN` và kèm
   đường nâng cấp. Bộ kiểm thử chạy trên dữ liệu thật đang có của người dùng.
4. **Id của dữ liệu test phải có tiền tố riêng và duy nhất mỗi lần chạy**
   (`ct_zz…`, `ht_z…`, `nhz_…`, `anh_zz…`) để bộ dọn dẹp không bao giờ xoá nhầm
   truyện thật. Tiêu đề truyện test bắt đầu bằng `ZZ`.
5. **Tệp do gói này viết ra không được chứa dấu gạch chéo ngược** trong phần nội dung
   do công cụ sinh; quy ước là viết bằng `String.fromCharCode` khi thật sự cần.
   `tests/lib/h.js` tự cam kết điều này và có ca canh lại.

## Biết trước (khiếm khuyết đã biết)

- `docKeHoach()` lọc mọi mục qua `laKhongCo()` **trừ** danh sách bước chuyển: một kế
  hoạch ghi `BƯỚC CHUYỂN: KHONG CO` sẽ cho ra `buoc` bằng đúng mảng `["KHONG CO"]`.
  Ca kiểm thử đang **khoá hành vi hiện tại** lại (xem `ai-parse.test.mjs`), không phải
  khẳng định nó là đúng. Sửa thì sửa ở `docKeHoach()` rồi cập nhật ca.
- `laKhongCo()` từng có hai nhánh chết: nó so `n/a` và `-` trên chuỗi **đã bỏ dấu**,
  mà bỏ dấu thì xoá luôn dấu xuyệt và dấu gạch ngang. Hậu quả: mô hình ghi `n/a` cho một
  mục thì chuỗi `n/a` bị lưu thẳng vào dữ liệu. **Đã sửa** trong `src/ai.js`
  (so thêm trên chuỗi gốc) và có ca canh lại trong `ai-parse.test.mjs`.
- `nhap-check` và `nhap-isolation` cần ba truyện test do `nhap-setup` dựng; nếu
  `nhap-setup` không tạo ra chúng thì hai bộ này chạy 0 ca. Bộ chạy đã có cảnh báo
  "bộ … không trả về ca nào" cho đúng tình huống này; `goi-chung.test.mjs` canh việc
  cảnh báo đó không bị gỡ.
- Các bộ `gy-goi-y` và `dk-loi-thoai` kiểm tra bố cục, nên chỉ đạt khi khung nhìn đủ
  rộng (khoảng 390px trở lên). Ở khung hẹp của trình soạn thảo chúng báo lỗi giả.

## Danh mục bộ kiểm thử

`tests/browser/runner.js` giữ `DANH_MUC` — mỗi bộ một dòng, kèm `loai`:

- `nen`  — điểm neo: dựng/dọn truyện test, chạy trước
- `dung` — dựng cảnh/AI giả cho bộ khác, không tự đếm
- `bo`   — bộ kiểm thử thật, chạy mặc định
- `phu`  — phụ trợ, **không** chạy mặc định (ca AI thật tốn quota, công cụ soi bố cục,
  dò lỗi, công cụ cho người/agent)

Mọi tệp trong `tests/browser/` (trừ `runner.js`) phải được khai báo trong `DANH_MUC`,
và ngược lại — `goi-chung.test.mjs` canh cả hai chiều.

## Thêm một bộ kiểm thử

1. Viết `tests/browser/<tên>.js`, dùng `import { test, ok, eq, eqSau } from "../lib/h.js"`.
2. Thêm một dòng vào `DANH_MUC` trong `tests/browser/runner.js`.
3. Nếu là hàm thuần của `src/`, viết thêm ca ở `tests/node/<tên>.test.mjs` — nhanh hơn,
   không tốn quota, và chạy được trên CI.
4. Chạy `npm test` và chạy tầng trình duyệt một lượt đầy đủ trước khi đóng gói.

## Tầng Node không có node:fs

`goi-chung.test.mjs` và `khong-ro-ri.test.mjs` cần đọc tệp. Ở môi trường không có
`node:fs` (ví dụ worker không DOM), chúng tự bỏ qua, **hoặc** dùng bộ đọc cắm sẵn:

    globalThis.__TV_BO_DOC = {
      doc: async (đường_dẫn_tương_đối) => chuỗi,
      lietKe: async (thư_mục) => mảng tên,
      co: async (đường_dẫn) => đúng/sai,
    };

Nhờ vậy cùng một logic kiểm tra vẫn chạy được ở cả hai môi trường.
