# Truyện Vai — CONTEXT (đọc TRƯỚC mọi việc khác)

Generator `perchance.org/phufantasyroleplay`: nhập vai nhiều nhân vật, **người chơi là người thật
duy nhất**, phần còn lại do AI viết. Chữ hiển thị **tiếng Việt**. Chủ đề người lớn được phép —
không tự ý làm nhẹ đi.

Tệp này chỉ chứa **luật + bảng tra**. Chi tiết: `src/README.md` (lịch sử từng đợt) và
`tests/README.md` (chạy test, luật viết test, đóng gói). Đọc đúng mục cần.

## 1. Module + chiều import (DAG, không vòng)

```
CHỈ app.js import `ui/` — lõi KHÔNG BAO GIỜ import `ui/` (test ghim)
ai.js → store.js → lore.js · thoiGian.js → trangThai.js
dom.js · schema.js · ngoaiHinh.js (không import gì)
```

`ui/<màn>/*` = màn đã tách khỏi `app.js`: `index.js` là VỎ ≤150 dòng; `*Form|*Flow.js` giữ **quyết
định THUẦN, không DOM**. Có `taoAnh/`·`nhanVat/`·`taoTruyen/`·`tuyChonTruyen/`·`lorebook/`·`suKien/`
·`daoDien/`·`bangDieuKhien/`·`suaNgoaiHinh/`; `ui/cong18.js` = **cửa 18+ dùng chung**.

| Tệp | Vai trò (vài hàm chính) |
|---|---|
| `dom.js` | Hạ tầng DOM: `esc`, `fmt`, `icon`, `toast`, `modal`, `confirmModal`. |
| `nhap.js` | Nhập bản sao: `capIdMoi` (cấp id mới + dịch tham chiếu chéo). Thuần. |
| `schema.js` | Hình dạng `MO_TA_*`/`kiemTra*`, sổ phiên bản `MIGRATION_*`, nhật ký nâng cấp & lỗi hình dạng. Thuần. |
| `trangThai.js` | Trạng thái **dẫn xuất** từ `canhDaKhep`: `tinhTrangThai`, `taoHuong`, `taoTienDo`, `taoDinhChinh`. |
| `ngoaiHinh.js` | Hồ sơ ngoại hình: `chuanHoaHoSo`, `ghepPromptNgoaiHinh`, `canDichNgoaiHinh`; `PHIEN_BAN_HO_SO`. |
| `thoiGian.js` | Đồng hồ truyện + vắng mặt: `thoiGianOf`, `xetDieuKien`, `suKienCua`, `maPhien`. |
| `store.js` | Dữ liệu + kv: `createStory`, `giaoDichKV`, `laNguoiLon`, `chanNoiDungNguoiLon`, `dsSeGhiCoNguoiLon`/`dsChanGhiCo`; **cửa vào nạp: `migrate`/`napBanGhi`**; `chuanHoa*`; `PHIEN_BAN_TRUYEN`; `kiemTraBatBien`. |
| `lore.js` | Sổ tri thức: `loreCua`, `docLorebook`, `xuatLorebook`, `buildLore`. |
| `ai.js` | Mọi prompt + lời gọi model: `buildContext`, `buildPrompt`, `streamText`, `docPhieu`; `LUAT_NGON_NGU`. |
| `app.js` | Giao diện + luồng: `render`, các `open*`, stream, vắng mặt, nhập/xuất, sao lưu; nối `ui/`; `window.__tv_test` = điểm neo test. |
| `main.pjs` | Danh sách + cấu hình Perchance (`CauHinh`, `TheLoai`, `GiaoKeoMacDinh`, danh sách BDSM). |
| `index.html` | Chỉ `<body>`: nạp `src/styles.css`, `src/app.js`, đặt `window.TRUYEN_VAI_ROOT = root`. |

## 2. Bất biến dữ liệu — KHÔNG được phá

1. **`story.canhDaKhep` là nguồn sự thật.** Quan hệ/ký ức/nhân vật/hướng/tiến độ chỉ là **dẫn
   xuất** (`tinhTrangThai`), không ghi ngược.
2. **Dữ liệu dẫn xuất không ghi ngược**: prompt ảnh đã ghép, bản dịch EN, bản nhẹ/đầy đủ ảnh.
3. **Mọi thao tác nhiều khoá qua giao dịch** `chupNhieuKhoa`/`traNhieuKhoa`/`giaoDichKV`; giữ bất
   biến `thamChieuMo`.
4. **Đổi hình dạng dữ liệu ⇒ tăng `PHIEN_BAN_*` + thêm mục `MIGRATION_*`.** Không bao giờ làm mất
   dữ liệu thật. Mọi đường nạp qua `migrate`/`napBanGhi`; bản ghi dị dạng chỉ **báo**, không xoá.
5. **MỌI giá trị động đều qua `esc()`** khi vào HTML, kể cả chuỗi do app ghép ra. Chỉ **HTML khung
   tĩnh viết cứng trong code** mới không cần.
6. **Mọi phán định "người lớn" qua `laNguoiLon()`** — không tự suy từ `c.tuoi`; mọi đường vào nội
   dung người lớn qua `chanNoiDungNguoiLon()`.
7. Prompt máy vẽ phải qua `thoatPerchance()`: plugin **đọc prompt như mẫu pjs** nên `[ ] { }` chưa
   thoát bị ăn mất.
8. **Nhật ký parse LLM + "gói gỡ lỗi" là dữ liệu NHẠY CẢM.** Mặc định CHỈ metadata; đầu ra thô khi tự
   tích. Nhật ký **không bao giờ** vào file xuất/sao lưu. Trần: **20** mục, **12 KB** thô (`TOI_DA_*`).
9. **Mốc sao lưu ở `localStorage`** (5 mốc). **Hai nhật ký vận hành** (nâng cấp dữ liệu, lỗi
   hình dạng) **chỉ sống trong phiên**, không ghi kv/xuất.

## 3. Luật ngôn ngữ prompt

Một chỗ duy nhất: `LUAT_NGON_NGU` (`ai.js`). Máy vẽ ảnh → **tiếng Anh** (`mayVe`; nhãn
`MARK_NGOAI_HINH` cũng vậy). Truyện + mọi prompt văn bản → **tiếng Việt** (`truyen`).

## 4. Muốn sửa X → vào đâu

| Muốn sửa | Tệp · hàm |
|---|---|
| Ai là người lớn · cổng chặn | `store.js` · `laNguoiLon` · `chanNoiDungNguoiLon` |
| Câu chữ + danh sách ghi cờ 18+ | `ui/cong18.js`; `store.js` · `dsSeGhiCoNguoiLon`/`dsChanGhiCo` |
| Nhãn tuổi trong prompt | `ai.js` · `buildContext` |
| Kế hoạch cầu nối · phiếu khép cảnh | `ai.js` · `lapCauNoi`/`docKeHoach` · `khepCanh`/`docPhieu` |
| Mô phỏng vắng mặt | `ai.js`/`app.js` · `lapKeHoachVangMat` / `chayPhienVangMat` |
| Ngoại hình cố định trong prompt ảnh | `ngoaiHinh.js` · `ghepPromptNgoaiHinh` |
| Ba màn: tạo ảnh (cổng 18+) · sửa nhân vật · cốt truyện mới | `ui/taoAnh/` (`taoAnhFlow.js`) · `ui/nhanVat/` (`nhanVatForm.js`) · `ui/taoTruyen/` (`taoTruyenFlow.js`) |
| Tuỳ chọn truyện · Sổ tri thức | `ui/tuyChonTruyen/` · `ui/lorebook/` |
| Bảng điều khiển · Đạo diễn · Sửa hồ sơ ngoại hình | `ui/bangDieuKhien/` · `ui/daoDien/` · `ui/suaNgoaiHinh/` |
| Sự kiện toàn cục (`data-act` → hàm) | `ui/suKien/*`; `app.js` · `bindGlobalEvents` |
| Dịch ngoại hình sang EN · dọn `[ ] { }` | `ai.js` · `dichNgoaiHinh` · `thoatPerchance` |
| Trạng thái/quan hệ dẫn xuất | `trangThai.js` · `tinhTrangThai` |
| Hình dạng dữ liệu | `schema.js` · `MO_TA_*` + `kiemTra*` |
| Lịch sử phiên bản + nâng cấp dữ liệu cũ | `schema.js` · `MIGRATION_*`; `store.js` · `migrate` |
| Đường nạp dữ liệu (kv, file nhập) | `store.js` · `load*` + `napBanGhi` |
| Gói gỡ lỗi | `app.js` · `dungGoLoi`/`moTaGoLoi` · `openGoLoi` |
| Tự kiểm tra bất biến / sửa | `store.js` · `kiemTraBatBien`; `app.js` · `suaBatBien` |
| Nhắc sao lưu | `main.pjs` · `soNgayNhacSaoLuu`; `store.js` · `nenNhacSaoLuu` |
| Điều kiện có mô phỏng vắng mặt | `thoiGian.js` · `xetDieuKien` |

## 5. Test: ở đâu, chạy thế nào

Bộ kiểm thử **không** nằm trong `src/` (công khai + quota) mà ở **repo GitHub** (mục 9). Cách chạy,
số ca, bẫy, luật viết test: **`tests/README.md`** (`npm test` = Node; trình duyệt =
`tests/browser/runner.js` + `chayTatCa()`).

**Tách/đổi hàm = KHÔNG ĐỔI HÀNH VI** — phải chứng minh bằng **ký tự + pixel**; cách đo ở
`tests/README.md`, mục “Không đổi hành vi”. Áp cho MỌI lần tách.

**Prompt có snapshot GHIM TỪNG BYTE + mốc prefix-cache** (`tests/fixtures/prompt/`, 7a): đổi prompt
thì cập nhật fixture + `moc.json` CÙNG commit kèm lý do; mốc không tụt quá 5 điểm phần trăm.

## 6. `PHIEN_BAN_*` hiện tại

| Hằng | Giá trị | Ở đâu | Ý nghĩa |
|---|---|---|---|
| `PHIEN_BAN_TRUYEN` | 8 | `store.js` | Hình dạng truyện đã lưu. Lịch sử: `schema.js` · `MIGRATION_TRUYEN`. |
| `PHIEN_BAN_HO_SO` | 1 | `ngoaiHinh.js` | Hình dạng hồ sơ ngoại hình (`MIGRATION_HO_SO`). |

## 7. Luật làm việc

1. **Tính năng mới** (đóng băng đã GỠ ở 7a): logic THUẦN ở module riêng + ca Node; màn mới ở
   `ui/<tên>/` đúng khuôn luật 2; **mọi đường vào nội dung người lớn qua `ui/cong18.js`**.
2. **Không hàm nào dài quá 150 dòng** (TOÀN `src/**`, kể cả `app.js`). Màn quá dài thì tách ra
   `ui/<màn>/`: `app.js` giữ VỎ nối qua bảng `*_DEPS` (chỉ chứa hàm **còn lại của app**; còn lại
   import thẳng từ lõi). Bảng phải khớp **HAI CHIỀU** với `D.*` mà tệp của màn gọi — thừa/thiếu đều
   là lỗi. Đã tách 8 màn + `capIdMoi` → `nhap.js` (tên màn: §4 và `tests/README.md`).
3. **MỘT điểm đăng ký sự kiện toàn cục**: chỉ `bindGlobalEvents` (`app.js`) gọi `addEventListener`;
   xử lý chia theo TÍNH NĂNG ở `ui/suKien/*` (bảng `"data-act": hàm`), gộp bằng `gopBangSuKien` —
   trùng tên NÉM LỖI, mọi `data-act` phải có hàm xử lý.
4. **Làm từng giai đoạn, xong thì DỪNG** báo cáo và chờ chủ dự án duyệt.
5. Mỗi thay đổi chỉ coi là xong khi ĐỦ BỐN: hai tầng test **XANH**, **quét ngược tên thật 0 rò
   rỉ**, gói **không `.git`**, **CI GitHub xanh**. Báo cáo dạng **x/y**.
6. Giao tiếp bằng tiếng Việt, ngắn gọn. Không tự đổi tên/đăng lại generator.
7. Không secret/API key ở bất cứ đâu — mọi thứ trong `src/` và repo là công khai.

## 8. Quyền riêng tư

Dữ liệu **thật** của người dùng **chỉ** được đọc/so **trong bộ nhớ lúc chạy test**; **không** ghi
thành tệp, **không** đóng gói/upload. **Không** id/tên thật trong `src/`, `tests/` hay gói upload —
id test có tiền tố riêng, duy nhất mỗi lượt (`ct_zz…`, `ht_z…`, `nhz_…`, tiêu đề `ZZ…`). Luật tự
động chỉ bắt **dạng id**; ca **quét ngược** (`rr-ten-that`, tầng trình duyệt) bắt cả TÊN bằng cách
so với dữ liệu thật trong kv — **BẮT BUỘC chạy trước mỗi lần đóng gói** (`tests/README.md`).

## 9. Nguồn sự thật & quy trình

**Nguồn sự thật: `https://github.com/hellodalathostel/Truyen-vai`** (zip uploads.dev là dự phòng).
Mỗi đợt: agent đóng gói → báo URL → **chủ dự án đẩy lên repo** → **CI xanh**. Cách đóng gói:
`tests/README.md`. Gói **không** chứa URL của chính nó: `src/README.md` trong gói trỏ lần đóng
TRƯỚC; workspace trỏ URL mới nhất.
