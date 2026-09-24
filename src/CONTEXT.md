# Truyện Vai — CONTEXT (đọc TRƯỚC mọi việc khác)

Generator `perchance.org/phufantasyroleplay`: nhập vai nhiều nhân vật, **người chơi là người thật
duy nhất**, phần còn lại do AI viết. Chữ hiển thị cho người dùng là **tiếng Việt**. Chủ đề người
lớn được phép — không tự ý làm nhẹ đi.

Tệp này chỉ chứa **luật + bảng tra**. Chi tiết tra cứu: `src/README.md` (lịch sử từng đợt sửa) và
`tests/README.md` (cách chạy test, luật viết test, đóng gói). Đọc đúng mục cần.

## 1. Module + chiều import (DAG, không vòng)

```
app.js + ui/<màn>/*   ← CHỈ app.js được import `ui/`; lõi KHÔNG BAO GIỜ import `ui/` (test ghim)
  ↑
ai.js  →  store.js  →  lore.js · thoiGian.js  →  trangThai.js
  ↑
dom.js · schema.js · ngoaiHinh.js   (không import gì)
```

`ui/<màn>/*` = màn đã tách khỏi `app.js`: `index.js` là VỎ ≤150 dòng; `*Form|*Flow.js` giữ **quyết
định THUẦN, không DOM**. Hiện có `taoAnh/` (tạo ảnh) · `nhanVat/` (sửa nhân vật) · `taoTruyen/`
(cốt truyện mới), cộng `ui/cong18.js` = **cửa 18+ dùng chung** (câu chữ + ai được ghi cờ).

| Tệp | Vai trò (vài hàm chính) |
|---|---|
| `dom.js` | Hạ tầng DOM: `esc`, `fmt`, `icon`, `toast`, `modal`, `confirmModal`, `download`. |
| `schema.js` | Hình dạng dữ liệu `MO_TA_*`/`kiemTra*`, sổ đăng ký phiên bản `MIGRATION_*`, nhật ký nâng cấp & lỗi hình dạng. Thuần. |
| `trangThai.js` | Trạng thái **dẫn xuất** từ `canhDaKhep`: `tinhTrangThai`, `taoCanh`, `taoHuong`, `taoTienDo`, `taoDinhChinh`. |
| `ngoaiHinh.js` | Hồ sơ ngoại hình: `chuanHoaHoSo`, `ghepPromptNgoaiHinh`, `canDichNgoaiHinh`; `PHIEN_BAN_HO_SO`. |
| `thoiGian.js` | Đồng hồ truyện + vắng mặt: `thoiGianOf`, `xetDieuKien`, `suKienCua`, `maPhien`. |
| `store.js` | Dữ liệu + kv (nguồn sự thật của mọi thứ được lưu): `createStory`, `giaoDichKV`, `laNguoiLon`, `chanNoiDungNguoiLon`, `dsSeGhiCoNguoiLon`/`dsChanGhiCo`; **cửa vào nạp dữ liệu `migrate`/`napBanGhi`**; `chuanHoa*`; `PHIEN_BAN_TRUYEN`; `kiemTraBatBien`. |
| `lore.js` | Sổ tri thức: `loreCua`, `docLorebook`, `xuatLorebook`, `buildLore`. |
| `ai.js` | Mọi prompt + lời gọi model: `buildContext`, `buildPrompt`, `streamText`, `docPhieu`, `taoAnh`; `LUAT_NGON_NGU`. |
| `ui/` | Ba màn tách khỏi `app.js` (xem trên) + `cong18.js`. |
| `app.js` | Giao diện + luồng: `render`, các `open*`, stream, vắng mặt, Đạo diễn, nhập/xuất, sao lưu & tự kiểm tra; nối vào `ui/`; `window.__tv_test` = điểm neo kiểm thử. |
| `main.pjs` | Danh sách + cấu hình Perchance (`CauHinh`, `TheLoai`, `GiaoKeoMacDinh`, danh sách BDSM/ảnh). |
| `index.html` | Chỉ `<body>`: nạp `src/styles.css`, `src/app.js`, đặt `window.TRUYEN_VAI_ROOT = root`. |

## 2. Bất biến dữ liệu — KHÔNG được phá

1. **`story.canhDaKhep` là nguồn sự thật.** Quan hệ/ký ức/nhân vật/hướng/tiến độ chỉ là **dẫn
   xuất** (`tinhTrangThai`), không ghi ngược.
2. **Dữ liệu dẫn xuất không ghi ngược**: prompt ảnh đã ghép, bản dịch EN, bản nhẹ/đầy đủ của ảnh.
3. **Mọi thao tác nhiều khoá qua giao dịch** `chupNhieuKhoa`/`traNhieuKhoa`/`giaoDichKV`; giữ bất
   biến `thamChieuMo`.
4. **Đổi hình dạng dữ liệu ⇒ tăng `PHIEN_BAN_*` + thêm mục vào sổ đăng ký migration.** Không bao
   giờ làm mất dữ liệu thật. Mọi đường nạp (kv lẫn file nhập) đi qua `migrate`/`napBanGhi`; bản ghi
   dị dạng chỉ được **báo**, không bị xoá, không chặn mở app.
5. **MỌI giá trị động đều qua `esc()`** khi chèn vào HTML, kể cả chuỗi do app ghép ra. Chỉ **HTML
   khung tĩnh viết cứng trong code** mới không cần.
6. **Mọi phán định "người lớn" qua `laNguoiLon()`** — không tự suy từ `c.tuoi`; mọi đường vào nội
   dung người lớn qua `chanNoiDungNguoiLon()`.
7. Prompt máy vẽ phải qua `thoatPerchance()`: plugin **đọc prompt như mẫu pjs**, nên `[ ] { }` chưa
   thoát bị Perchance ăn mất.
8. **Nhật ký parse LLM và "gói gỡ lỗi" là dữ liệu NHẠY CẢM.** Gói gỡ lỗi mặc định CHỈ metadata; đầu
   ra thô chỉ kèm khi người dùng tự tích. Nhật ký **không bao giờ** đi vào file xuất truyện/bản sao
   lưu. Vòng đệm chặn cả số mục (**20**) lẫn phần thô (**12 KB**, `TOI_DA_*`).
9. **Mốc sao lưu nằm ở `localStorage`** (5 mốc thời gian, không chứa nội dung). **Hai nhật ký vận
   hành** (nâng cấp dữ liệu, lỗi hình dạng) **chỉ sống trong phiên**, không ghi kv, không vào file xuất.

## 3. Luật ngôn ngữ prompt

Một chỗ duy nhất: `LUAT_NGON_NGU` trong `src/ai.js`. Máy vẽ ảnh → **tiếng Anh** (`mayVe`; nhãn
`MARK_NGOAI_HINH` cũng tiếng Anh cho khớp). Văn bản truyện + mọi prompt văn bản → **tiếng Việt**
(`truyen`). Lấy tên ngôn ngữ từ hằng đó, đừng viết lại.

## 4. Muốn sửa X → vào đâu

| Muốn sửa | Tệp · hàm |
|---|---|
| Ai là người lớn | `store.js` · `laNguoiLon` |
| Cổng chặn nội dung người lớn | `store.js` · `chanNoiDungNguoiLon` |
| Câu chữ + danh sách ghi cờ của cửa 18+ | `ui/cong18.js`; `store.js` · `dsSeGhiCoNguoiLon`/`dsChanGhiCo` |
| Nhãn tuổi trong prompt | `ai.js` · `buildContext` |
| Kế hoạch cầu nối (Đạo diễn) · phiếu khép cảnh | `ai.js` · `lapCauNoi`/`docKeHoach` · `khepCanh`/`docPhieu` |
| Mô phỏng vắng mặt | `ai.js`/`app.js` · `lapKeHoachVangMat` / `chayPhienVangMat` |
| Ngoại hình cố định trong prompt ảnh | `ngoaiHinh.js` · `ghepPromptNgoaiHinh` |
| Màn tạo ảnh: cổng 18+, chọn nhân vật, prompt, bản ghi ảnh | `ui/taoAnh/` · `taoAnhFlow.js` + `index.js` |
| Màn sửa nhân vật: khoá ô 18+ theo tuổi, lưu, giao kèo, AI, ảnh đại diện | `ui/nhanVat/` · `nhanVatForm.js` + `index.js` |
| Màn cốt truyện mới: Tạo nhanh + wizard, đối số `createStory` | `ui/taoTruyen/` · `taoTruyenFlow.js` + `index.js` |
| Dịch ngoại hình sang EN · dọn `[ ] { }` khỏi prompt ảnh | `ai.js` · `dichNgoaiHinh` · `thoatPerchance` |
| Trạng thái/quan hệ dẫn xuất | `trangThai.js` · `tinhTrangThai` |
| Hình dạng dữ liệu (trường nào, kiểu gì) | `schema.js` · `MO_TA_*` + `kiemTra*` |
| Lịch sử phiên bản + nâng cấp dữ liệu cũ | `schema.js` · `MIGRATION_*`; `store.js` · `migrate` |
| Đường nạp dữ liệu (kv, file nhập) | `store.js` · `load*` + `napBanGhi` |
| Gói gỡ lỗi chứa gì · bảng gỡ lỗi | `app.js` · `dungGoLoi`/`moTaGoLoi` (mặc định chỉ metadata) · `openGoLoi` |
| Tự kiểm tra bất biến / sửa an toàn | `store.js` · `kiemTraBatBien`; `app.js` · `suaBatBien` |
| Nhắc sao lưu: ngưỡng ngày + mặt tiền | `main.pjs` · `soNgayNhacSaoLuu`; `store.js` · `nenNhacSaoLuu`; `app.js` · `nhacSaoLuuKhiMo` |
| Điều kiện có mô phỏng vắng mặt | `thoiGian.js` · `xetDieuKien` |

## 5. Test: ở đâu, chạy thế nào

Bộ kiểm thử **không** nằm trong `src/` (công khai + tính quota) mà ở **repo GitHub** (mục 9). Cách
chạy, số ca, bẫy, luật viết test: **`tests/README.md`** (`npm test` = Node; trình duyệt =
`tests/browser/runner.js` + `chayTatCa()`).

**Tách hàm = KHÔNG ĐỔI HÀNH VI, phải CHỨNG MINH bằng ký tự + pixel.** Cách đo (script tất định trên
bản CŨ rồi bản MỚI, so từng ký tự HTML/`instruction`/bản ghi + so ảnh chụp) ở `tests/README.md`,
mục "Không đổi hành vi". Áp cho MỌI lần tách từ đây.

## 6. `PHIEN_BAN_*` hiện tại

| Hằng | Giá trị | Ở đâu | Ý nghĩa |
|---|---|---|---|
| `PHIEN_BAN_TRUYEN` | 7 | `store.js` | Hình dạng một truyện đã lưu. Lịch sử từng phiên bản: `schema.js` · `MIGRATION_TRUYEN`. |
| `PHIEN_BAN_HO_SO` | 1 | `ngoaiHinh.js` | Hình dạng một hồ sơ ngoại hình (`MIGRATION_HO_SO`). |

## 7. Luật làm việc

1. **Đóng băng tính năng mới** tới khi chủ dự án gỡ; chỉ sửa lỗi, lưới an toàn, tái cấu trúc.
2. **Không hàm mới nào dài quá 150 dòng** (kể cả hàm con trong `src/ui/**`). Màn quá dài thì tách ra
   `ui/<màn>/`: `app.js` giữ VỎ nối qua bảng `*_DEPS` (chỉ chứa hàm **còn lại của app**; còn lại
   import thẳng từ lõi). `openTaoAnh`, `openCharacterEditor`, `openNewStoryModal` đã tách xong;
   đừng viết thân màn trở lại `app.js`.
3. **Làm từng giai đoạn, xong thì DỪNG** báo cáo và chờ chủ dự án duyệt.
4. Sau mỗi thay đổi: chạy lại hai tầng, báo kết quả dạng **x/y**.
5. Giao tiếp bằng tiếng Việt, ngắn gọn. Không tự đổi tên/đăng lại generator.
6. Không secret/API key ở bất cứ đâu — mọi thứ trong `src/` và repo là công khai.

## 8. Quyền riêng tư

Dữ liệu **thật** của người dùng **chỉ** được đọc/so **trong bộ nhớ lúc chạy test**; **không** ghi
thành tệp và **không** đóng gói/upload. **Không** id/tên thật trong `src/`, `tests/` hay gói upload —
id test phải có tiền tố riêng, duy nhất mỗi lượt (`ct_zz…`, `ht_z…`, `nhz_…`, tiêu đề `ZZ…`).
Luật tự động chỉ bắt **dạng id**; tài liệu/ghi chú phải soát tay.

## 9. Nguồn sự thật & quy trình

**Nguồn sự thật: `https://github.com/hellodalathostel/Truyen-vai`** (gói zip trên uploads.dev chỉ là
bản dự phòng). Mỗi giai đoạn: agent đóng gói zip → báo URL → **chủ dự án đẩy lên repo** → **CI phải
xanh**. Học đóng gói: `tests/README.md`. Gói **không thể** chứa URL của chính nó, nên
`src/README.md` trong gói luôn trỏ tới lần đóng trước; sau upload thì cập nhật URL ở workspace.
