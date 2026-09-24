# Truyện Vai — CONTEXT (đọc TRƯỚC mọi việc khác)

Generator `perchance.org/phufantasyroleplay`: nhập vai nhiều nhân vật, **người chơi là người thật
duy nhất**, phần còn lại do AI viết. Chữ hiển thị cho người dùng là **tiếng Việt**. Chủ đề người
lớn được phép — không tự ý làm nhẹ đi.

Tệp này chỉ chứa **luật + bảng tra**. Chi tiết tra cứu: `src/README.md` (lịch sử từng đợt sửa) và
`tests/README.md` (cách chạy test, luật viết test, đóng gói). Đọc đúng mục cần.

## 1. Module + chiều import (DAG, không vòng)

```
ui/taoAnh/*   màn tạo ảnh (index.js = vỏ · taoAnhFlow.js = quyết định THUẦN, không DOM)
  ↑ CHỈ app.js được import `ui/`; lõi KHÔNG BAO GIỜ import `ui/` (ca kiểm thử ghim)
app.js        giao diện + mọi luồng người dùng
 ↑
ai.js         dựng prompt + gọi ai-text-plugin
 ↑
store.js      dữ liệu + kv        →  lore.js
 ↑
thoiGian.js   thời gian vắng mặt  →  trangThai.js
 ↑
dom.js · schema.js · ngoaiHinh.js · trangThai.js   (không import gì)
```

| Tệp | Vai trò (vài hàm chính) |
|---|---|
| `dom.js` | Hạ tầng DOM: `esc`, `fmt`, `icon`, `toast`, `modal`, `confirmModal`, `download`. |
| `schema.js` | Hình dạng dữ liệu `MO_TA_*`/`kiemTra*` + sổ đăng ký phiên bản `MIGRATION_*` + nhật ký nâng cấp & lỗi hình dạng (trong bộ nhớ). Thuần, không import gì. |
| `trangThai.js` | Trạng thái **dẫn xuất** từ `canhDaKhep`: `tinhTrangThai`, `taoCanh`, `taoHuong`, `taoTienDo`, `taoDinhChinh`. |
| `ngoaiHinh.js` | Hồ sơ ngoại hình: `chuanHoaHoSo`, `ghepPromptNgoaiHinh`, `canDichNgoaiHinh`; `PHIEN_BAN_HO_SO`. |
| `thoiGian.js` | Đồng hồ truyện + vắng mặt: `thoiGianOf`, `xetDieuKien`, `suKienCua`, `maPhien`. |
| `store.js` | Dữ liệu + kv (nguồn sự thật của mọi thứ được lưu): `saveStory`, `giaoDichKV`, `laNguoiLon`, `chanNoiDungNguoiLon`; **cửa vào nạp dữ liệu `migrate`/`napBanGhi`**; `chuanHoa*`; `PHIEN_BAN_TRUYEN`; mốc sao lưu; nhật ký; `kiemTraBatBien`. |
| `lore.js` | Sổ tri thức: `loreCua`, `docLorebook`, `xuatLorebook`, `buildLore`. |
| `ai.js` | Mọi prompt + lời gọi model: `buildContext`, `buildPrompt`, `streamText`, `docPhieu`, `taoAnh`; `LUAT_NGON_NGU`. |
| `ui/taoAnh/` | Màn tạo ảnh: `index.js` (vỏ ≤150 dòng) nối `taoAnhFlow.js` (quyết định THUẦN, không DOM) + `taoAnhHtml/Chon/Dung/Luu.js`. |
| `app.js` | Giao diện + luồng: `render`, `boot`, các `open*`, stream, vắng mặt, Đạo diễn, nhập/xuất, sao lưu & tự kiểm tra; nối vào `ui/`; `window.__tv_test` là điểm neo kiểm thử. |
| `main.pjs` | Danh sách + cấu hình Perchance (`CauHinh`, `TheLoai`, `GiaoKeoMacDinh`, danh sách BDSM/ảnh). |
| `index.html` | Chỉ `<body>`: nạp `src/styles.css`, `src/app.js`, đặt `window.TRUYEN_VAI_ROOT = root`. |

## 2. Bất biến dữ liệu — KHÔNG được phá

1. **`story.canhDaKhep` là nguồn sự thật.** Quan hệ/ký ức/nhân vật/hướng/tiến độ chỉ là **dẫn
   xuất** (`tinhTrangThai`) — không bao giờ ghi ngược.
2. **Dữ liệu dẫn xuất không ghi ngược**: prompt ảnh đã ghép, bản dịch EN, bản nhẹ/đầy đủ của ảnh.
3. **Mọi thao tác nhiều khoá qua giao dịch** `chupNhieuKhoa`/`traNhieuKhoa`/`giaoDichKV`; giữ bất
   biến `thamChieuMo`.
4. **Đổi hình dạng dữ liệu ⇒ tăng `PHIEN_BAN_*` + thêm mục vào sổ đăng ký migration.** Không bao
   giờ làm mất dữ liệu thật. Mọi đường nạp (kv lẫn file nhập) đi qua `migrate`/`napBanGhi`; bản ghi
   dị dạng chỉ được **báo**, không bị xoá, không chặn mở app.
5. **MỌI giá trị động đều qua `esc()`** khi chèn vào HTML, kể cả chuỗi do app ghép ra. Chỉ **HTML
   khung tĩnh viết cứng trong code** mới không cần — không có ngoại lệ nào khác.
6. **Mọi phán định "người lớn" qua `laNguoiLon()`** — không tự suy từ `c.tuoi`; mọi đường vào nội
   dung người lớn qua `chanNoiDungNguoiLon()`.
7. Prompt máy vẽ phải qua `thoatPerchance()`: plugin **đọc prompt như mẫu pjs**, nên `[ ] { }` chưa
   thoát bị Perchance ăn mất.
8. **Nhật ký parse LLM và "gói gỡ lỗi" là dữ liệu NHẠY CẢM.** Gói gỡ lỗi mặc định CHỈ metadata; đầu
   ra thô chỉ kèm khi người dùng tự tích, và hộp xác nhận nói rõ gói chứa gì. Nhật ký **không bao
   giờ** đi vào file xuất truyện/bản sao lưu. Vòng đệm chặn cả số mục (**20**) lẫn dung lượng phần
   thô (**12 KB** — `TOI_DA_*`).
9. **Mốc sao lưu nằm ở `localStorage`** (5 mốc thời gian, không chứa nội dung), không nằm trong bản
   ghi truyện. **Hai nhật ký vận hành** (nâng cấp dữ liệu, lỗi hình dạng) **chỉ sống trong phiên**,
   không ghi kv, không vào file xuất truyện.

## 3. Luật ngôn ngữ prompt

Một chỗ duy nhất: `LUAT_NGON_NGU` trong `src/ai.js`. Máy vẽ ảnh → **tiếng Anh** (`mayVe`; nhãn
`MARK_NGOAI_HINH` cũng tiếng Anh cho khớp). Văn bản truyện + mọi prompt văn bản → **tiếng Việt**
(`truyen`). Cần tên ngôn ngữ thì lấy từ hằng đó, đừng viết lại chuỗi.

## 4. Muốn sửa X → vào đâu

| Muốn sửa | Tệp · hàm |
|---|---|
| Ai là người lớn | `store.js` · `laNguoiLon` |
| Cổng chặn nội dung người lớn | `store.js` · `chanNoiDungNguoiLon` |
| Nhãn tuổi trong prompt | `ai.js` · `buildContext` |
| Kế hoạch cầu nối (Đạo diễn) | `ai.js` · `lapCauNoi` + `docKeHoach` |
| Phiếu khép cảnh | `ai.js` · `khepCanh` + `docPhieu` |
| Mô phỏng vắng mặt | `ai.js`/`app.js` · `lapKeHoachVangMat` / `chayPhienVangMat` |
| Điều kiện có mô phỏng vắng mặt | `thoiGian.js` · `xetDieuKien` |
| Ngoại hình cố định trong prompt ảnh | `ngoaiHinh.js` · `ghepPromptNgoaiHinh` |
| Màn tạo ảnh: cổng 18+, chọn nhân vật, prompt, bản ghi ảnh, luồng bấm | `ui/taoAnh/` · `taoAnhFlow.js` + `index.js` |
| Dịch ngoại hình sang tiếng Anh | `ai.js` · `dichNgoaiHinh` |
| Dọn `[ ] { }` khỏi prompt ảnh | `ai.js` · `thoatPerchance` |
| Trạng thái/quan hệ dẫn xuất | `trangThai.js` · `tinhTrangThai` |
| Hình dạng dữ liệu (trường nào, kiểu gì) | `schema.js` · `MO_TA_*` + `kiemTra*` |
| Lịch sử phiên bản + nâng cấp dữ liệu cũ | `schema.js` · `MIGRATION_*`; `store.js` · `migrate` |
| Đường nạp dữ liệu (kv, file nhập) | `store.js` · `loadStories`/`loadMessages`/`loadNgoaiHinh`/`napBanGhi` |
| Nhật ký parse AI (vòng đệm, hạn mức) | `store.js` · `TOI_DA_*` + `themVaoVong`/`catTho` |
| Ghi nhật ký một lượt gọi AI | `ai.js` · `bocPhanTich`/`ghiNhatKy`; `app.js` · `AI.datHookNhatKy` |
| Gói gỡ lỗi chứa gì | `app.js` · `dungGoLoi` + `moTaGoLoi` (mặc định chỉ metadata) |
| Bảng gỡ lỗi (giao diện) | `app.js` · `openGoLoi` + `openXuatGoLoi` |
| Tự kiểm tra bất biến / sửa an toàn | `store.js` · `kiemTraBatBien`; `app.js` · `suaBatBien` |
| Ngưỡng ngày + điều kiện nhắc sao lưu | `main.pjs` · `CauHinh().soNgayNhacSaoLuu`; `store.js` · `nenNhacSaoLuu` |
| Mặt tiền sao lưu (cảnh báo, trạng thái, dung lượng) | `app.js` · `khoiCanhBaoDoiTen`/`chuTrangThaiSaoLuu`/`thanhDungLuong`/`nhacSaoLuuKhiMo` |

## 5. Test: ở đâu, chạy thế nào

Bộ kiểm thử **không** nằm trong `src/` (luật: `src/` công khai + tính quota). Nó ở **repo GitHub**
(mục 9). Cách chạy, số ca, bẫy, luật viết test: xem **`tests/README.md`** (`npm test` = tầng Node
thuần; trình duyệt = nạp `tests/browser/runner.js` rồi `chayTatCa()`).

## 6. `PHIEN_BAN_*` hiện tại

| Hằng | Giá trị | Ở đâu | Ý nghĩa |
|---|---|---|---|
| `PHIEN_BAN_TRUYEN` | 7 | `store.js` | Hình dạng một truyện đã lưu. Lịch sử từng phiên bản: `schema.js` · `MIGRATION_TRUYEN`. |
| `PHIEN_BAN_HO_SO` | 1 | `ngoaiHinh.js` | Hình dạng một hồ sơ ngoại hình (`MIGRATION_HO_SO`). |

Giai đoạn 4–5 **không** tăng phiên bản nào; `tests/node/gd4.test.mjs` ghim điều này.

## 7. Luật làm việc

1. **Đóng băng tính năng mới** tới khi chủ dự án gỡ; chỉ sửa lỗi, lưới an toàn, tái cấu trúc.
2. **Không hàm mới nào dài quá 150 dòng.** `openTaoAnh` đã tách xong (vỏ ≤150 dòng, thân ở
   `ui/taoAnh/`); còn `openCharacterEditor` quá dài — sửa gì trong đó thì **kéo ra hàm con**.
3. **Làm từng giai đoạn, xong thì DỪNG** báo cáo và chờ chủ dự án duyệt.
4. Sau mỗi thay đổi: chạy lại hai tầng, báo kết quả dạng **x/y**.
5. Giao tiếp bằng tiếng Việt, ngắn gọn. Không tự đổi tên/đăng lại generator.
6. Không secret/API key ở bất cứ đâu — mọi thứ trong `src/` và repo là công khai.

## 8. Quyền riêng tư

Dữ liệu **thật** của người dùng **chỉ** được đọc/so **trong bộ nhớ lúc chạy test**; **không** ghi
thành tệp và **không** đóng gói/upload. **Không** id/tên thật trong `src/`, `tests/` hay gói upload — id test phải có tiền tố riêng + duy
nhất mỗi lần chạy (`ct_zz…`, `ht_z…`, `nhz_…`, tiêu đề `ZZ…`). Luật tự động chỉ bắt **dạng id**;
tài liệu/ghi chú phải soát tay.

## 9. Nguồn sự thật & quy trình

**Nguồn sự thật: `https://github.com/hellodalathostel/Truyen-vai`** (gói zip trên uploads.dev chỉ là
bản dự phòng). Mỗi giai đoạn: agent đóng gói zip → báo URL → **chủ dự án đẩy lên repo** → **CI phải
xanh**. Học đóng gói: `tests/README.md`. Gói **không thể** chứa URL của chính nó, nên
`src/README.md` trong gói luôn trỏ tới lần đóng trước; sau upload thì cập nhật URL ở workspace.
