# Truyện Vai — CONTEXT (đọc TRƯỚC mọi việc khác)

Generator `perchance.org/phufantasyroleplay`: nhập vai nhiều nhân vật, **người chơi là người
thật duy nhất**, phần còn lại do AI viết. Chữ hiển thị cho người dùng là **tiếng Việt**. Chủ đề
người lớn được phép — không tự ý làm nhẹ đi.

`src/README.md` (~200KB) là **lịch sử chi tiết** của từng đợt sửa — tra cứu khi cần, không phải
điểm bắt đầu.

## 1. Module + chiều import (DAG, không vòng)

```
app.js        giao diện + mọi luồng người dùng (trên cùng, ~9.400 dòng)
 ↑
ai.js         dựng prompt + gọi ai-text-plugin
 ↑
store.js      dữ liệu + kv   →  lore.js
 ↑
thoiGian.js   thời gian vắng mặt  →  trangThai.js
 ↑
dom.js · trangThai.js · ngoaiHinh.js   (không import gì)
```

| Tệp | Vai trò |
|---|---|
| `dom.js` | Hạ tầng DOM: `esc`, `fmt`, `icon`, `toast`, `modal`, `confirmModal`, `download`, `debounce`. |
| `trangThai.js` | Trạng thái **dẫn xuất** từ `canhDaKhep`: `tinhTrangThai`, `taoCanh`, `taoHuong`, `taoTienDo`, `taoDinhChinh`. |
| `ngoaiHinh.js` | Hồ sơ ngoại hình: `MARK_NGOAI_HINH`, `chuanHoaHoSo`, `ghepPromptNgoaiHinh`, `canDichNgoaiHinh`; `PHIEN_BAN_HO_SO`. |
| `thoiGian.js` | Đồng hồ truyện + vắng mặt: `thoiGianOf`, **`xetDieuKien`** (có mô phỏng khoảng vắng mặt không), `newSuKien`, `maPhien`, `suKienCua`. |
| `store.js` | Dữ liệu + kv (nguồn sự thật của mọi thứ được lưu): `createStory`, `saveStory`, `makeMessage`, `replaceMessages`, `giaoDichKV`, `chupNhieuKhoa`/`traNhieuKhoa`, `daoDienOf`, **`laNguoiLon`**, **`chanNoiDungNguoiLon`**, `chuanHoa*`; `PHIEN_BAN_TRUYEN`; mốc sao lưu `mocSaoLuu`/`danhDauSaoLuu`/`danhDauDaDoi`/`nenNhacSaoLuu`; vòng đệm nhật ký `themVaoVong`/`catTho`/`docNhatKyLlm`/`ghiNhatKyLlm`; `kiemTraBatBien`. |
| `lore.js` | Sổ tri thức: `loreCua`, `docLorebook`, `xuatLorebook`, `mucKhop`, `buildLore`. |
| `ai.js` | Mọi prompt + lời gọi model: `buildContext`, `buildPrompt`, `streamText`, `replyAs`, `replyAsGroup`, `suggestLines`, `docPhieu`, `docKeHoach`, `docKeHoachVangMat`, `dichNgoaiHinh`, `vietPromptAnh`, `taoAnh`; `LUAT_NGON_NGU`. |
| `app.js` | Giao diện + luồng: `render`, `boot`, các `open*`, `streamGroupReply`/`streamOneReply`, vắng mặt (`kiemTraVangMat` → `chayPhienVangMat` → `luuPhienVangMat` → `ketThucPhien`), Đạo diễn (`openDaoDien`, `openTaoHuong`, `ddKichHoat`), nhập/xuất truyện, sao lưu & lưới an toàn (`khoiCanhBaoDoiTen`, `chuTrangThaiSaoLuu`, `nhacSaoLuuKhiMo`, `openGoLoi`, `openXuatGoLoi`, `openTuKiemTra`, `suaBatBien`); `window.__tv_test` là điểm neo kiểm thử. |
| `main.pjs` | Danh sách + cấu hình Perchance (`CauHinh`, `TheLoai`, `GiaoKeoMacDinh`, danh sách BDSM/ảnh). |
| `index.html` | Chỉ `<body>`: nạp `src/styles.css`, `src/app.js`, đặt `window.TRUYEN_VAI_ROOT = root`. |

## 2. Bất biến dữ liệu — KHÔNG được phá

1. **`story.canhDaKhep` là nguồn sự thật.** Quan hệ/ký ức/nhân vật/hướng/tiến độ chỉ là **dẫn
   xuất** (`tinhTrangThai`) — không bao giờ ghi ngược.
2. **Dữ liệu dẫn xuất không ghi ngược**: prompt ảnh đã ghép, bản dịch EN, bản nhẹ/đầy đủ của ảnh.
3. **Mọi thao tác nhiều khoá qua giao dịch** `chupNhieuKhoa`/`traNhieuKhoa`/`giaoDichKV`; giữ bất
   biến `thamChieuMo`.
4. **Đổi hình dạng dữ liệu đã lưu ⇒ tăng `PHIEN_BAN_*` + đường nâng cấp.** Không bao giờ làm mất
   dữ liệu thật của người dùng.
5. **MỌI giá trị động đều qua `esc()`** khi chèn vào HTML: tên, mô tả, nội dung AI, nội dung
   người dùng nhập, **kể cả chuỗi do chính app ghép ra từ dữ liệu** (nhãn có tên nhân vật, dòng
   "đã xoá …", thông báo lỗi có tên file, v.v.). Chỉ **HTML khung tĩnh viết cứng trong code**
   (`"<div class='row'>"`) mới không cần `esc()`. Không có ngoại lệ nào khác: "app tự sinh" không
   phải là căn cứ để bỏ qua `esc()`.
6. **Mọi phán định "người lớn" qua `laNguoiLon()`** — không tự suy từ `c.tuoi`; mọi đường vào nội
   dung người lớn qua `chanNoiDungNguoiLon()`.
7. Prompt máy vẽ phải qua `thoatPerchance()`: plugin **đọc prompt như một mẫu pjs**, nên `[ ] { }`
   chưa thoát sẽ bị Perchance ăn mất.
8. **Nhật ký parse LLM và "gói gỡ lỗi" là dữ liệu NHẠY CẢM.** Mặc định gói gỡ lỗi CHỈ có
   metadata (loại lệnh, thời điểm, ok/lỗi, lý do, độ dài đầu ra); đầu ra thô chỉ đi kèm khi
   người dùng tự tích, và hộp xác nhận phải nói rõ gói chứa gì trước khi tải. Nhật ký **không
   bao giờ** đi vào file xuất truyện / bản sao lưu — chỉ vào gói gỡ lỗi. Vòng đệm bị chặn cả
   số mục (**20**) lẫn tổng dung lượng phần thô (**12 KB**, xem `TOI_DA_*` trong `store.js`).
9. **Mốc sao lưu nằm ở `localStorage`, không nằm trong bản ghi truyện**: chỉ là 5 mốc thời gian
   (`batDauLuc`, `xuatLuc`, `daDoiLuc`, `hoanLuc`, `nhacLuc`) — không chứa nội dung. Đổi hình
   dạng *bản ghi truyện* vẫn là chuyện của bất biến 4, không liên quan tới khối này.

## 3. Luật ngôn ngữ prompt

Một chỗ duy nhất: `LUAT_NGON_NGU` trong `src/ai.js`.

- Máy vẽ ảnh → **tiếng Anh** (`mayVe`); nhãn `MARK_NGOAI_HINH` cũng tiếng Anh cho khớp.
- Văn bản truyện + mọi prompt văn bản → **tiếng Việt** (`truyen`).

Cần tên ngôn ngữ thì lấy từ hằng đó (`dichNgoaiHinh` trong `ai.js`; nhãn "Mô tả khung hình",
khối "Ngoại hình cố định", dòng "Chưa dịch được…" trong `app.js`).

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
| Dịch ngoại hình sang tiếng Anh | `ai.js` · `dichNgoaiHinh` |
| Dọn `[ ] { }` khỏi prompt ảnh | `ai.js` · `thoatPerchance` |
| Trạng thái/quan hệ dẫn xuất | `trangThai.js` · `tinhTrangThai` |
| Nâng cấp dữ liệu cũ | `store.js`/`ngoaiHinh.js` · `chuanHoa*` + `PHIEN_BAN_*` |
| Nhật ký parse AI (vòng đệm, hạn mức) | `store.js` · `TOI_DA_*` + `themVaoVong`/`catTho` |
| Ghi nhật ký một lượt gọi AI | `ai.js` · `bocPhanTich`/`ghiNhatKy` + `loaiLenhTuPrompt`; `app.js` · `AI.datHookNhatKy` |
| Gói gỡ lỗi chứa gì | `app.js` · `dungGoLoi` + `moTaGoLoi` (mặc định chỉ metadata) |
| Bảng gỡ lỗi (giao diện) | `app.js` · `openGoLoi` + `openXuatGoLoi` |
| Tự kiểm tra bất biến / sửa an toàn | `store.js` · `kiemTraBatBien`; `app.js` · `openTuKiemTra` + `suaBatBien` |
| Ngưỡng ngày + điều kiện nhắc sao lưu | `main.pjs` · `CauHinh().soNgayNhacSaoLuu`; `store.js` · `nenNhacSaoLuu` |
| Mặt tiền sao lưu (cảnh báo + trạng thái + dung lượng) | `app.js` · `khoiCanhBaoDoiTen`/`chuTrangThaiSaoLuu`/`thanhDungLuong`/`nhacSaoLuuKhiMo` |
| Giao diện, luồng bấm | `app.js` · `render`, các `open*` |

## 5. Test: ở đâu, chạy thế nào

Bộ kiểm thử **không** nằm trong `src/` (luật chủ dự án: `src/` công khai + tính quota). Nó ở
**repo GitHub** (mục 9): `tests/`, `package.json`, `.github/workflows/test.yml`, kèm bản sao
`src/` và `main.pjs`.

- **Tầng Node** (hàm thuần, không DOM, không tốn quota, chạy trên CI): `npm test` → 10 tệp
  `tests/node/*.test.mjs`, hiện **1.314 khẳng định, 0 không đạt**.
- **Tầng trình duyệt** (cần trang thật: DOM, IndexedDB, kv-plugin): nạp `tests/browser/runner.js`
  rồi gọi `chayTatCa()` → hiện **1.034/1.034 ca · 30 bộ**. Nguồn các bộ được **tiêm sẵn** vào
  `window.__tvNguon[<tên>]` (vì `tests/` không nằm trong `src/`) — xem đầu `runner.js`. Bộ chạy
  gác dữ liệu thật: chụp trước/sau, lệch một byte là cảnh báo, và tự dọn dữ liệu test.
- Ba bộ `gd4-*` là của Giai đoạn 4: `gd4-saoluu` (cảnh báo đổi tên + trạng thái + nút sao lưu +
  lời nhắc), `gd4-goloi` (nhật ký, vòng đệm, gói gỡ lỗi: mặc định chỉ metadata), `gd4-tukiem`
  (tự kiểm tra bất biến + sửa an toàn trong một giao dịch). Cả ba **tự chụp và trả nguyên**
  `localStorage["truyenVai.caiDat"]` (lẫn bản trong RAM) vì chúng phải ghi mốc sao lưu.
- Bộ `phu` (dò lỗi, ca AI THẬT, soi bố cục) **không** chạy mặc định — đừng lấy làm tiêu chuẩn
  nghiệm thu.
- Bẫy đã gặp: nếu **khung xem trước bị bóp hẹp** (ví dụ 121px) thì hai bộ kiểm bố cục
  (`gy-goi-y`, `dk-loi-thoai`) đỏ giả. Đặt `set_viewport_size({width:1100,height:820})` trước khi chạy.

## 6. `PHIEN_BAN_*` hiện tại

| Hằng | Giá trị | Ở đâu | Ý nghĩa |
|---|---|---|---|
| `PHIEN_BAN_TRUYEN` | 7 | `store.js` | Hình dạng một truyện đã lưu (truyện, tin nhắn, cảnh, Đạo diễn, thời gian). Tăng khi đổi schema, kèm `chuanHoaTruyen` để nâng bản cũ. |
| `PHIEN_BAN_HO_SO` | 1 | `ngoaiHinh.js` | Hình dạng một hồ sơ ngoại hình, kèm `chuanHoaHoSo`. |

**Giai đoạn 4 KHÔNG đổi hình dạng dữ liệu ⇒ không tăng phiên bản nào.** Mốc sao lưu nằm ở
`localStorage` (cài đặt), nhật ký nằm ở kv folder riêng `nhatKyLlm` (khoá `vong`), và màn tự
kiểm tra chỉ đọc. Có ca kiểm thử ghim đúng điều này (`tests/node/gd4.test.mjs`): nếu ai đó đổi
schema ở Giai đoạn 4 thì ca đó đỏ và buộc phải làm đường nâng cấp tử tế.

## 7. Luật làm việc

1. **Đóng băng tính năng mới** tới khi chủ dự án gỡ; chỉ sửa lỗi, lưới an toàn, tái cấu trúc.
2. **Không hàm giao diện mới nào dài quá 150 dòng.**
3. **Làm từng giai đoạn, xong thì DỪNG** báo cáo và chờ chủ dự án duyệt.
4. Sau mỗi thay đổi: chạy lại hai tầng, báo kết quả dạng **x/y**.
5. Giao tiếp bằng tiếng Việt, ngắn gọn. Không tự đổi tên/đăng lại generator.
6. Không secret/API key ở bất cứ đâu — mọi thứ trong `src/` và repo là công khai.

## 8. Quyền riêng tư

- Dữ liệu **thật** của người dùng **chỉ** được đọc/so **trong bộ nhớ lúc chạy test**; **không**
  ghi thành tệp (kể cả tệp kết quả tạm) và **không** đóng gói/upload.
- **Không** id thật, tên thật trong `src/`, `tests/`, hay gói upload. Id test phải có tiền tố
  riêng + duy nhất mỗi lần chạy (`ct_zz…`, `ht_z…`, `nhz_…`, tiêu đề `ZZ…`).
- Luật tự động chỉ bắt được **dạng id** (`tests/node/khong-ro-ri.test.mjs`: token
  `<tiền tố>_<thân ≥10 ký tự>`), vì tên người là chuỗi ngắn và hay trùng từ thường. **Tài liệu và
  ghi chú phải soát tay** — đã từng rò rỉ thật trong chính `src/README.md`.
- Trước khi đóng gói: đọc lại tài liệu/ghi chú vừa sửa và tự hỏi "có id/tên thật nào trong này".

## 9. Nguồn sự thật & quy trình

- **Nguồn sự thật: `https://github.com/hellodalathostel/Truyen-vai`.** Gói zip trên uploads.dev
  chỉ là bản dự phòng tiện tay.
- Mỗi giai đoạn: agent đóng gói zip → báo URL → **chủ dự án đẩy lên repo** → **CI phải xanh**
  (`.github/workflows/test.yml`, `npm test`, Node 22).
- Gói zip **không thể** chứa URL của chính nó, nên `src/README.md` *bên trong* gói luôn trỏ tới
  lần đóng trước; sau khi upload thì cập nhật dòng URL trong `src/README.md` ở workspace.
- Bài học đóng gói đã trả giá: (a) test cấu trúc gói phải chạy được **cả** trong bản zip giải
  nén **lẫn** trong repo git thật (danh sách "gốc gói" phải cho phép `.git`); (b) `node --test
  <thư mục>` hỏng trên Node ≥21 → dùng `node --test tests/node/*.test.mjs`; (c) Node ≥23 in
  `ℹ pass N` thay cho `# pass N` → đọc kết quả theo **mã thoát**, không theo định dạng in.
