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
      fixtures/*.mjs            dữ liệu mẫu HƯ CẤU (truyện, phiếu, kế hoạch, vắng mặt,
                                phien-ban-cu: hình dạng cũ theo TỪNG PHIEN_BAN_*)
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
6. **Bộ nào ghi vào `localStorage["truyenVai.caiDat"]` phải chụp lại và TRẢ NGUYÊN** (lẫn bản
   trong RAM — chỉ trả `localStorage` thì màn Cài đặt vẫn hiện trạng thái giả). Ba bộ `gd4-*`
   phải ghi mốc sao lưu nên đều làm việc này; chụp/so **trong bộ nhớ**, không ghi ra tệp.
7. **Đóng modal bằng NÚT ĐÓNG của chính nó, không gỡ node.** Nhiều màn giữ cờ trong bộ nhớ và
   chỉ xoá cờ khi hook `onClose` chạy (vd `app.daoDienDangMo`); gỡ node trực tiếp để lại cờ
   bật, nên lần mở sau bị chặn **im lặng**. `donModal()` trong `runner.js` bấm nút đóng của
   từng modal theo thứ tự LIFO rồi mới gỡ phần còn sót — đừng quay lại kiểu `x.remove()`.
8. **Mọi đường nạp dữ liệu phải đi qua MỘT cửa vào: `napBanGhi()`/`migrate()` trong `store.js`.**
   Không chỗ nào (kể cả đường **nhập file**) được gọi thẳng `chuanHoa*` — làm vậy là **lặng lẽ** bỏ
   qua việc kiểm hình dạng, và bản ghi dị dạng sẽ không bao giờ hiện ra ở màn Tự kiểm tra.
   `tests/node/goi-chung.test.mjs` soát chuỗi trên `app.js`/`store.js` để ghim luật này.
9. **`src/CONTEXT.md` phải ≤ 10 240 byte và vẫn giữ đủ các mục LUẬT.** Đó là tệp được đọc đầu
   tiên mỗi phiên, nên nó là *luật + bảng tra*, không phải lịch sử: phần chi tiết thuộc về
   `src/README.md` và `tests/README.md`. Có ca kiểm thử đếm byte bằng `TextEncoder` và đòi các mục
   luật còn nguyên — viết chi tiết dài vào `CONTEXT.md` sẽ làm ca đó đỏ.

## Biết trước (khiếm khuyết đã biết)

- `docKeHoach()` từng lọc mọi mục qua `laKhongCo()` **trừ** danh sách bước chuyển, nên một
  kế hoạch ghi `BƯỚC CHUYỂN: KHONG CO` cho ra `buoc` bằng đúng mảng `["KHONG CO"]`. **Đã
  sửa** trong `src/ai.js` — mục bước nay lọc y như mọi mục khác — và ca kiểm thử đã đổi
  thành khẳng định ĐÚNG: `buoc` phải rỗng khi đầu ra là `KHONG CO` (kèm các biến thể
  `n/a`, `-`, `none`, `KHONG`, `khong co gi`, và ca bước thật lẫn một dòng rỗng).
  Không còn ca nào khoá hành vi sai đó lại.
- `laKhongCo()` từng có hai nhánh chết: nó so `n/a` và `-` trên chuỗi **đã bỏ dấu**,
  mà bỏ dấu thì xoá luôn dấu xuyệt và dấu gạch ngang. Hậu quả: mô hình ghi `n/a` cho một
  mục thì chuỗi `n/a` bị lưu thẳng vào dữ liệu. **Đã sửa** trong `src/ai.js`
  (so thêm trên chuỗi gốc) và có ca canh lại trong `ai-parse.test.mjs`.
- `nhap-check` và `nhap-isolation` cần ba truyện test do `nhap-setup` dựng; nếu
  `nhap-setup` không tạo ra chúng thì hai bộ này chạy 0 ca. Bộ chạy đã có cảnh báo
  "bộ … không trả về ca nào" cho đúng tình huống này; `goi-chung.test.mjs` canh việc
  cảnh báo đó không bị gỡ.
- Các bộ `gy-goi-y` và `dk-loi-thoai` kiểm tra bố cục, nên chỉ đạt khi khung nhìn đủ
  rộng. Khung hẹp của trình soạn thảo (từng gặp 121px) làm chúng báo lỗi giả — đặt
  `set_viewport_size({ width: 1100, height: 820 })` trước khi chạy tầng trình duyệt.

## Danh mục bộ kiểm thử

`tests/browser/runner.js` giữ `DANH_MUC` — mỗi bộ một dòng, kèm `loai`:

- `nen`  — điểm neo: dựng/dọn truyện test, chạy trước
- `dung` — dựng cảnh/AI giả cho bộ khác, không tự đếm
- `bo`   — bộ kiểm thử thật, chạy mặc định
- `phu`  — phụ trợ, **không** chạy mặc định (ca AI thật tốn quota, công cụ soi bố cục,
  dò lỗi, công cụ cho người/agent)

Mọi tệp trong `tests/browser/` (trừ `runner.js`) phải được khai báo trong `DANH_MUC`,
và ngược lại — `goi-chung.test.mjs` canh cả hai chiều.

### Bộ tiêu thụ cho các khung dựng (`dung` → `bo`)

Ba khung dựng từng **không có bộ tiêu thụ nào** — chúng đã chết mà vẫn nằm trong `DANH_MUC`.
Nay mỗi khung có bộ tiêu thụ thật, chạy đúng luồng của người dùng:

| Khung dựng (`dung`) | Bộ tiêu thụ (`bo`) | Phủ gì |
|---|---|---|
| `dd-setup` + `dd-fake-ai` | `dd-check` | Chế độ Đạo diễn: mở hộp thoại Hướng mới → "Lập cầu nối" → đọc kế hoạch đã bóc tách → "Kích hoạt hướng", kiểm cả hướng đã ghi xuống kv; và **lượt kế hoạch RỖNG** (`BƯỚC CHUYỂN: KHONG CO` phải ra mảng bước rỗng, không phải một bước tên "KHONG CO") |
| `dd-fake-ai-loi` | `dd-loi` | Chế độ Đạo diễn, nhánh AI lỗi — cả promise bị từ chối **lẫn** `stopReason: "error"`: báo lỗi trong hộp thoại, giữ nguyên bản nháp, không tạo hướng, không đóng hộp thoại, nút "Lập cầu nối" dùng lại được |
| `vg-base` | `vg-check` | Thời gian vắng mặt: đủ ngưỡng ⇒ có sự kiện + tin nhắn nhìn thấy được + dải phân cách, phiên đóng, và **không** mô phỏng lại cùng khoảng vắng mặt; `cheDo: "tamDung"` ⇒ không gọi AI; AI lỗi ⇒ giữ phiên ở "thử lại" và hiện dòng báo lỗi |

Vì sao phải là tầng trình duyệt: tầng Node chỉ kiểm được các hàm thuần **rời** (`docKeHoach`,
`docPhieu`, `docKeHoachVangMat`, `xetDieuKien`…). Phần **nối** — dựng prompt, gọi AI, bóc kết
quả, đổ lên thẻ duyệt, kích hoạt, ghi kv — chỉ nằm ở `app.js`/`ai.js` nên chỉ kiểm được trong
trang thật. Đây cũng là lý do VÌ SAO ba khung dựng này phải tồn tại: `app.js` quá lớn để dựng
lại trạng thái bằng tay trong mỗi ca.

### Bộ Giai đoạn 4 (sao lưu, nhật ký parse, gỡ lỗi, tự kiểm tra)

| Bộ (`bo`) | Phủ gì |
|---|---|
| `gd4-saoluu` | Cảnh báo đổi tên generator ở **cả hai** mặt tiền (chân Thư viện + Cài đặt); dòng trạng thái sao lưu theo **năm** tình huống; dòng dung lượng; nút "Xuất bản sao lưu" thật sự tải file VÀ đóng dấu mốc `xuatLuc`; lời nhắc khi mở app: đến hạn ⇒ có toast 2 nút, gọi lại trong ngày ⇒ im, "Để sau" ⇒ hoãn một ngày, bản sao lưu mới hơn thay đổi ⇒ im |
| `gd4-goloi` | Nhật ký parse: ghi/đọc/xoá, vòng đệm chặn **cả** 20 mục **lẫn** 12 KB phần thô, mỗi mục cắt ở 1000 ký tự; bảng gỡ lỗi liệt kê đúng; gói gỡ lỗi **mặc định chỉ metadata** (có dấu riêng trong đầu ra thô để chứng minh dấu đó KHÔNG lọt vào gói mặc định, vào file xuất truyện, hay vào bản sao lưu toàn bộ); hộp chọn + hộp xác nhận nói rõ gói chứa gì, cảnh báo khi có đầu ra thô |
| `gd4-tukiem` | Dựng một truyện hỏng đủ **8 nhóm lỗi**, quét ra đủ, sửa **6 nhóm an toàn** trong một giao dịch (xoá khoá mồ côi, gỡ liên kết mồ), và khẳng định hai nhóm **không** được sửa (chương đã mất, cảnh khép trỏ hội thoại đã mất) vẫn được BÁO; nội dung tin nhắn/tên nhân vật/tên truyện không bị đụng |

`tests/node/gd4.test.mjs` (128 khẳng định) giữ **luật** của cùng các hàm đó: mọi nhánh lý do của
`nenNhacSaoLuu`, mốc `mocSaoLuu` ghi xuống ngay lần đầu, hai trần của vòng đệm **ăn khớp** với
nhau, 9 nhóm của `kiemTraBatBien`, và một ca ghim rằng Giai đoạn 4 **không** đổi
`PHIEN_BAN_TRUYEN`.

### Bộ Giai đoạn 5 (tầng schema + migration tập trung)

| Bộ (`bo`) | Phủ gì |
|---|---|
| `gd5-schema` | **Chạy bóng trên dữ liệu THẬT của chủ dự án, trong bộ nhớ, không ghi gì**: `migrateTruyen`/`migrateHoSo`/`migrateTinNhan`/`napBanGhi` phải cho ra kết quả **giống hệt từng ký tự** với `chuanHoa*`/đường nạp cũ (đòi số khác biệt = 0, và đếm số truyện/hồ sơ/nhóm tin nhắn/ảnh đã so); đường nạp **không** sửa bản ghi đã đúng phiên bản; chạy lại lần hai vẫn ra y nguyên; **chứng minh không ghi kv** bằng cách chụp từng bản ghi trước/sau. Cộng phần validate-khi-nạp: một bản ghi **sai hình dạng** ghi thẳng vào kv ⇒ `loadStories()` **không ném, không xoá**, kv giữ nguyên byte, truyện vẫn nằm trong `store.byId`, hiện ở nhóm `hinh-dang` của màn Tự kiểm tra, **không** lọt nhóm "sửa được"; xoá khỏi kv + `xoaLoiHinhDang()` thì nhóm biến mất. Và phần nhập file cũ: `napBanGhi(..., { choNhap: true, dongY18: … })`, nhập sai hình dạng ⇒ chỉ báo, không ghi kv. |

`tests/node/schema.test.mjs` (460 khẳng định) là mặt Node của cùng tầng đó: sổ đăng ký phiên bản
(`soPhienBan`/`buocCanChay`), mô tả hình dạng **phủ đúng** bản ghi đã chuẩn hoá, kiểm hình dạng
(bắt lỗi thật, không báo oan, trần số lỗi mỗi bản ghi), **chạy bóng `migrate*` vs `chuanHoa*` trên
mọi fixture** (khoá `Date.now`/`Math.random` trong lúc so), **idempotent** (ba lần), nâng cấp **mọi
hình dạng cũ** trong `tests/fixtures/phien-ban-cu.mjs` lên bản hiện tại mà không mất dữ liệu,
`napBanGhi` (đúng phiên bản ⇒ **giữ nguyên đối tượng**; bản cũ ⇒ nâng + ghi nhật ký; **bản tương
lai** ⇒ giữ nguyên + đánh dấu `vuotPhienBan`, **không hạ phiên bản**; bản ghi có tham chiếu mồ côi
⇒ **không** bị dọn), bản ghi dị dạng ⇒ **chỉ báo**, và trần của hai nhật ký (20 mục / 60 mục /
4 000 ký tự).

Fixture `tests/fixtures/phien-ban-cu.mjs` dựng **một mục cho TỪNG `PHIEN_BAN_*` cũ** (truyện v0
không có trường `phienBan` rồi v1…v7; hồ sơ; tin nhắn; ảnh). Mỗi mục tự khai `khongCo` — những
trường mà phiên bản đó chưa có — và có ca kiểm thử khẳng định `khongCo` đúng, nên fixture không
thể "phản ánh sai" hình dạng cũ. **Toàn bộ là dữ liệu tổng hợp** (id ngắn, tên `zz…`), không lấy
một byte nào từ dữ liệu thật.

## Thêm một bộ kiểm thử

1. Viết `tests/browser/<tên>.js`, dùng `import { test, ok, eq, eqSau } from "../lib/h.js"`.
2. Thêm một dòng vào `DANH_MUC` trong `tests/browser/runner.js`.
3. Nếu là hàm thuần của `src/`, viết thêm ca ở `tests/node/<tên>.test.mjs` — nhanh hơn,
   không tốn quota, và chạy được trên CI.
4. Chạy `npm test` và chạy tầng trình duyệt một lượt đầy đủ trước khi đóng gói.

## Đóng gói & CI

- **Nguồn sự thật: repo GitHub `https://github.com/hellodalathostel/Truyen-vai`.** Gói zip trên
  uploads.dev chỉ là bản dự phòng. Mỗi giai đoạn: agent đóng gói zip → chủ dự án đẩy lên repo →
  **CI phải xanh** thì giai đoạn đó mới coi là xong.
- CI (`.github/workflows/test.yml`) chạy `npm test` trên **Node 22**. `package.json` dùng
  `node --test tests/node/*.test.mjs`: dạng **thư mục** (`node --test tests/node/`) hỏng trên
  Node ≥21.
- Test cấu trúc gói (`goi-chung.test.mjs`) phải chạy được **cả** trong bản zip giải nén **lẫn**
  trong repo git thật — danh sách "gốc gói" phải cho phép `.git`.
- Node ≥23 in kết quả kiểu `ℹ pass N` thay cho `# pass N`: đừng grep theo định dạng in, hãy dựa
  vào **mã thoát** của `npm test`.
- Gói zip **không thể** chứa URL của chính nó, nên `src/README.md` *bên trong* gói luôn trỏ tới
  lần đóng trước; sau khi upload thì cập nhật dòng URL trong `src/README.md` ở workspace.
- Các bộ `phu` (dò nút, soi bố cục, ca AI THẬT) là **công cụ gỡ lỗi**, không chạy mặc định và
  **không** phải tiêu chuẩn nghiệm thu. Ví dụ `dbg-t3c` bấm thử nút trong trạng thái do bộ trước
  để lại; chạy cả `phu` (`gomPhu: true`) có thể làm preview bận rất lâu. Nghiệm thu bằng lượt
  chạy **mặc định** (`chayTatCa()`).

## Tầng Node không có node:fs

`goi-chung.test.mjs` và `khong-ro-ri.test.mjs` cần đọc tệp. Ở môi trường không có
`node:fs` (ví dụ worker không DOM), chúng tự bỏ qua, **hoặc** dùng bộ đọc cắm sẵn:

    globalThis.__TV_BO_DOC = {
      doc: async (đường_dẫn_tương_đối) => chuỗi,
      lietKe: async (thư_mục) => mảng tên,
      co: async (đường_dẫn) => đúng/sai,
    };

Nhờ vậy cùng một logic kiểm tra vẫn chạy được ở cả hai môi trường.
