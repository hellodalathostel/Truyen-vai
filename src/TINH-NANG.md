# Truyện Vai — SPEC: "tính năng kiểu SillyTavern" (Giai đoạn 9)

Yêu cầu của chủ dự án (23/10/2026): *"kết hợp thêm các tính năng như của SillyTavern"*.

Tệp này là **đặc tả + kế hoạch chia đợt**. Lịch sử đã làm gì thì ở `src/README.md`; cách chạy
kiểm thử ở `tests/README.md`. Luật thường trực (bất biến dữ liệu, cửa 18+, 150 dòng, bốn điều kiện
"Xong") vẫn ở `src/CONTEXT.md` — tệp này KHÔNG thay thế CONTEXT.md.

## 1. Đối chiếu: app đã có gì so với SillyTavern

| Tính năng của SillyTavern | Ở app này | Ghi chú |
|---|---|---|
| Thẻ nhân vật (chara_card_v2/v3), nhập/xuất PNG+JSON | **có từ Giai đoạn 9 Đợt 1** | `src/theNhanVat.js` + `ui/nhanVat/nhanVatThe.js` |
| Thư viện nhân vật + tạo nhân vật bằng AI | có (Đợt 6b) | `ui/nhanVat/` |
| Hồ sơ ngoại hình (persona ngoại hình, ảnh tham chiếu) | có (đợt "thư viện ngoại hình") | `ngoaiHinh.js`, `ui/suaNgoaiHinh/` |
| World Info / Lorebook, kích hoạt theo từ khoá | có | `lore.js` (`docLorebook` nhận cả `character_book` trong thẻ) |
| Group chat / nhiều nhân vật trong một cảnh | có | "cảnh nhóm", `hienDien`, `canhRieng` |
| Author's Note / hướng dẫn cốt truyện | có (Đạo diễn) | `ui/daoDien/` |
| Tóm tắt + ký ức dài hạn | có (Khép cảnh, sổ hé lộ) | `canhDaKhep`, `trangThai.js` |
| Quick replies / gợi ý lời đáp | có | `ui/suKien/chat.js` (✨) |
| Tạo ảnh trong cảnh | có | `ui/taoAnh/` |
| **Swipe / nhiều phương án cho một tin AI** | **chưa** | chỉ có "viết lại tin cuối" (thay hẳn) |
| **Nhiều persona NGƯỜI CHƠI** | **chưa** | mỗi truyện có một người chơi |
| **Prompt manager** (bật/tắt, sửa, đổi thứ tự khối prompt) | **chưa** | prompt do `ai.js` dựng cố định |
| **Regex / macro tuỳ biến** (`{{char}}`, `{{user}}`, script tìm–thay) | **chưa** | chỉ có macro nội bộ của app |
| **TTS đọc tin nhắn** | **chưa** | nền tảng có Paradee TTS |
| **Bookmark / ghim tin nhắn** | **chưa** | cắt/xoá + tạo nhánh thì có |
| Chỉnh sửa tin nhắn, tạo nhánh hội thoại | có | `catVaLuuLai`, `taoNhanhVaLuuLai` |
| Sao lưu / nhập–xuất cả truyện | có | `xuatTruyen`, `openNhapTruyen` |

Kết luận: phần **dữ liệu nhập vai** đã tương đương. Thiếu chủ yếu là **cách người dùng điều khiển
model** (swipe, prompt manager, regex) và **định danh người chơi** (persona).

## 2. Kế hoạch 5 đợt

Mỗi đợt làm xong thì DỪNG, báo cáo x/5, chờ chủ dự án duyệt (luật §7.4 của `CONTEXT.md`).

### Đợt 1 — Thẻ nhân vật (chara_card_v2) — **XONG**

- `src/theNhanVat.js` (thuần): đọc thẻ từ JSON **và** PNG (khối `chara`/`ccv3`, `tEXt`/`iTXt`),
  ánh xạ ⇄ nhân vật của app, xuất thẻ v2, nhúng thẻ vào PNG (CRC32 tự viết).
- `ui/nhanVat/nhanVatThe.js`: hai nút **Nhập thẻ (JSON/PNG)** / **Xuất thẻ** trong màn Sửa nhân
  vật; nhập chỉ điền BẢN NHÁP (bấm Lưu mới đổi nhân vật); ảnh trong thẻ thành ảnh đại diện.
- Không làm mất dữ liệu: thẻ gốc nằm nguyên trong `character.theGoc` (trường lạ không vào prompt).
- 18+ **không bao giờ** suy ra từ thẻ ngoài; cờ chỉ khôi phục từ khối `extensions.truyenVai` và
  vẫn phải qua `laNguoiLon` (tuổi số dưới 18 thắng).
- Ca Node: `tests/node/theNhanVat.test.mjs`.

### Đợt 2 — Swipe: nhiều phương án cho một tin AI

- Lưu 2–4 phương án cho tin nhắn AI vừa sinh (`tinNhan[].phuongAn` + `chon`), mũi tên ◀ ▶ trên
  bong bóng chat, "chọn phương án này" ghi đè `noiDung`.
- Sinh thêm phương án = gọi lại đúng đường `streamOneReply`/`streamGroupReply` hiện có, **không**
  đổi cấu trúc prompt (giữ prefix cache).
- Ràng buộc: phương án là dữ liệu DẪN XUẤT của tin nhắn, không sửa `canhDaKhep`; cắt/xoá lịch sử
  phải dọn phương án theo; nhập/xuất truyện phải mang theo (hoặc bỏ an toàn).
- Ca: nén/kéo lại nhiều lần ra nhiều phương án · chọn phương án ghi đúng · xoá tin dọn sạch ·
  vòng xuất→nhập giữ được phương án đã chọn.

### Đợt 3 — Nhiều persona người chơi

- `persona` ở cấp THƯ VIỆN (không phải trong truyện): tên, mô tả, xưng hô, ảnh; mỗi truyện chọn
  một persona (mặc định = người chơi hiện tại để không phá dữ liệu cũ).
- Chèn vào prompt qua **một** hàm, thay cho `moTaNguoiDung` hiện tại; giữ đúng vị trí cũ để không
  phá prefix cache; snapshot prompt 7a phải cập nhật **có chủ đích** kèm lý do.
- Ca: persona mặc định cho truyện cũ · đổi persona đổi khối prompt · cửa 18+ vẫn là một.

### Đợt 4 — Prompt manager (bật/tắt + sửa từng khối)

- Danh sách khối prompt app đang dựng (bối cảnh, nhân vật, sổ tri thức, trạng thái, đạo diễn…),
  mỗi khối: bật/tắt, sửa chữ, **thứ tự cố định theo mức "ổn định"** (khối tĩnh trước, khối đổi
  theo lượt sau) — không cho người dùng kéo khối động lên đầu.
- "Khôi phục mặc định" theo từng khối; mọi thay đổi là dữ liệu của TRUYỆN (không ghi vào `src/`).
- Ca: tắt một khối thì prompt không còn khối đó · sửa chữ vào đúng vị trí · thứ tự bất biến ·
  khôi phục trả về đúng bản gốc · snapshot 7a chỉ đổi khi bật tính năng.

### Đợt 5 — Regex / macro tuỳ biến + TTS

- Macro hiển thị: `{{char}}`, `{{user}}`, `{{persona}}`; script tìm–thay **chỉ trên chuỗi hiển
  thị** (không sửa dữ liệu đã lưu) + tuỳ chọn áp trước khi gửi model.
- Bảo vệ: regex do người dùng nhập phải có trần thời gian/độ dài, lỗi cú pháp không được làm chết
  lượt chat; không cho script chạm vào `func` (chỉ chuỗi).
- TTS: đọc tin nhắn bằng Paradee (nút loa trên bong bóng + "đọc từ đây"), tắt mặc định.
- Ca: macro thay đúng · regex hỏng không ném ra ngoài · script không chạy trên dữ liệu lưu ·
  TTS không tự phát khi chưa bấm.

## 3. Quyết định chung cho cả 5 đợt

1. **Không phá prefix cache.** Mọi thứ thêm vào prompt phải giữ nguyên tắc "đầu ổn định, cuối
   TASK thay đổi" của `ai.js`; snapshot 7a chỉ được cập nhật khi thay đổi là CÓ CHỦ ĐÍCH.
2. **Cửa 18+ vẫn là một.** Không tính năng nào tự bật/tắt cờ người lớn; mọi đường vào nội dung
   người lớn đi qua `chanNoiDungNguoiLon`/`ui/cong18.js`.
3. **Dữ liệu dẫn xuất không ghi ngược** vào `canhDaKhep`/`hoiThoais`.
4. **Không làm mất dữ liệu người dùng.** Đổi hình dạng ⇒ tăng `PHIEN_BAN_*` + mục `MIGRATION_*`;
   nhập từ ngoài thì giữ nguyên bản gốc.
5. **Mỗi đợt: logic THUẦN ở tệp riêng + ca Node; màn ở `ui/<tên>/`; kết thúc bằng hai tầng xanh.**
