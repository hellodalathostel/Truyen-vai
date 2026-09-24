# Truyện Vai — sổ tay nhập vai đa nhân vật

> **Agent/session mới: đọc `src/CONTEXT.md` trước.** Đây là bản đồ ngắn (sơ đồ module, bất biến
> dữ liệu, nguồn sự thật, cách chạy test). Tệp bạn đang đọc là **lịch sử chi tiết** — tra cứu
> khi cần, không phải điểm bắt đầu.

Ứng dụng nhập vai (roleplay) dành cho **một người chơi duy nhất**: bạn là nhân vật
chính, còn lại là các nhân vật do AI thủ vai. Toàn bộ giao diện bằng **tiếng Việt**.
Dữ liệu lưu ngay trên máy người dùng (IndexedDB qua `kv-plugin`), không cần tài
khoản, không có server.

## Hai cách dựng cốt truyện

Người dùng chọn ngay ở bước đầu của wizard "Cốt truyện mới", và có thể đổi lại sau
trong **Tuỳ chọn → Cách dựng truyện**:

| id | Nhãn | Ý nghĩa |
| --- | --- | --- |
| `chuong` | 📖 Một cốt truyện, nhiều chương | Mạch truyện đi theo từng chương nối tiếp. Mỗi chương có mục tiêu; "Kết thúc chương" cho AI tóm tắt diễn biến + rút ra sự kiện đưa vào biên niên sử + gợi ý chương kế tiếp. |
| `songSong` | 🧵 Nhiều hội thoại theo cốt truyện | Một thế giới, nhiều tuyến hội thoại song song. Trò chuyện riêng từng nhân vật hoặc gom thành group chat; tất cả dùng chung bối cảnh + biên niên sử. |

Cả hai chế độ đều có hội thoại **nhóm** (group chat) khi chọn ≥ 2 nhân vật: bộ điều
phối ẩn tự chọn từ 1 tới `CauHinh().soNguoiTraLoiToiDa` nhân vật phù hợp
(`pickSpeakers`), hoặc người chơi ghim một người / gọi `@Tên` / chọn "Tất cả". Chi tiết
ở mục **Cảnh nhóm** bên dưới.

## Cảnh nhóm, hiện diện & cảnh riêng (đợt "roleplay nhóm v1")

Nâng hội thoại nhóm thành chế độ **một người chơi — nhiều nhân vật AI** có mạch cảnh
tự nhiên. Người chơi luôn là trung tâm và giữ quyền quyết định nhân vật của mình.

### Một lượt nhóm = một lần sinh, một đoạn cảnh

- `AI.replyAsGroup({ story, conv, messages, nhanVats, goiTen, goiVang, moDau })` sinh
  **một đoạn văn liền mạch** cho cả lượt (không sinh rời rạc từng nhân vật), nên các
  nhân vật thật sự đối đáp/ tranh luận/ phối hợp được với nhau. Chỉ những nhân vật
  được chọn mới được nói; cuối đoạn luôn để lại khoảng trống hành động cho người chơi.
- **Khối điều khiển ẩn**: AI kết thúc phản hồi bằng
  `<<HIENDIEN>> tên những người còn có mặt` rồi `<<HET>>` (stop sequence). `catDieuKhien()`
  cắt khối này khỏi **cả phần đang stream** lẫn nội dung lưu/ hiển thị; `docHienDien()`
  đọc danh sách người có mặt (đã lọc bỏ tên người chơi và tên người ngoài truyện).
  Nếu model không ghi khối đó — hoặc ghi mà không khớp được tên nhân vật nào (không phải
  tên người chơi, không phải "không có ai") — danh sách hiện diện **giữ nguyên** (mặc định
  an toàn, chịu được cả trường hợp phản hồi bị cắt trước khi ghi xong khối). Nếu cảnh
  **không còn nhân vật nào**, TASK dặn model ghi đúng chữ `KHÔNG CÓ AI` (hoặc danh sách chỉ
  còn tên người chơi; `Tất cả` nghĩa là mọi người tham gia đều có mặt) ⇒ `docHienDien()` trả
  về **mảng rỗng**, nghĩa là "chỉ còn người chơi trong cảnh" — xem «Hiện diện trong cảnh».
- Khi danh sách đổi, `streamGroupReply()` cập nhật `conv.hienDien` và thêm một ghi chú
  `vai:"he"`: `🚪 X rời khỏi cảnh.` / `➡️ X bước vào cảnh.` (ghi chú này cũng đi vào
  nhật ký nên lượt sau AI vẫn biết).
- Hội thoại **một nhân vật** (`nhanVatIds` chỉ có một người) vẫn dùng `replyAs` như cũ —
  không tốn thêm gì, tin nhắn giữ schema cũ (`nvId`). Hội thoại **nhóm** thì luôn đi đường
  cảnh nhóm, **kể cả khi trong cảnh chỉ còn một người**: đường `replyAs` không có khối
  điều khiển nên sẽ không bao giờ kể được người cuối cùng rời cảnh (hoặc người khác bước
  vào). Việc chọn người lên tiếng vẫn dựa trên `coMat` (một người có mặt ⇒ không gọi
  `pickSpeakers`).

### Chọn người phản ứng

| Lựa chọn | Cách hoạt động |
| --- | --- |
| Tự động (mặc định) | `pickSpeakers` chọn 1..`soNguoiTraLoiToiDa` (mặc định 3) người **đang có mặt**, chỉ ai có lý do phản ứng |
| Ghim một nhân vật | chỉ người đó trả lời (chip trên thanh "Ai trả lời") |
| Tất cả | mọi người đang có mặt, vẫn trong **một** đoạn nhóm |

Gọi tên trong tin nhắn (`@Sera` hoặc nhắc đúng tên — `timNhanVatDuocGoi`) **được ưu tiên**:
chỉ người được gọi lên tiếng, không gọi thêm ai ("không chen vào vô cớ"). Tên được gọi
nhưng **vắng mặt** được ghi vào TASK để nhân vật đang có mặt phản ứng với việc cái tên
đó được nhắc tới, chứ người vắng mặt không bao giờ xuất hiện. Đây không phải mệnh lệnh:
TASK nói rõ nhân vật được gọi có thể im lặng, từ chối hoặc phản đối.

### Hiện diện trong cảnh (bản tối giản)

- `conv.hienDien` = mảng id người đang có mặt. `hienDienCua(story, conv)` là nguồn duy
  nhất: cảnh riêng đang mở ⇒ chỉ người đó; ngược lại là `hienDienNhom(conv)` (mảng
  `hienDien` đã lọc theo `nhanVatIds`).
- **Ngữ nghĩa rỗng vs thiếu — đừng trộn lẫn**: `hienDien` **thiếu hoặc `null`** ⇒ chưa
  từng ghi ⇒ dùng **danh sách nhân vật mặc định** (`nhanVatIds`); đây là đường tương thích
  của truyện cũ nên không cần migrate. `hienDien: []` ⇒ trạng thái hợp lệ **"trong cảnh chỉ
  còn người chơi"** (không còn ai để chọn). Vì vậy khi cảnh trống, thanh hiện diện vẫn hiện
  (`.presence-trong`: lời nhắc + nút **Sửa** để gọi người trở lại — đây là lối thoát duy
  nhất, đừng bỏ), ô nhập bị khoá kèm placeholder chỉ vào nút **Sửa**, và `generateTurn` từ
  chối lượt bằng toast. `openHienDien` cho phép **lưu cả khi bỏ chọn hết**;
  `taoNhanhVaLuuLai` giữ nguyên `undefined` thay vì biến thành `[]`.
- Chỉ người có mặt mới được chọn, được nói, và được "chứng kiến". `buildContext()` phát
  ra khối `# HIỆN DIỆN TRONG CẢNH` (ai có mặt / ai vắng) và chia hồ sơ nhân vật thành
  **đang có mặt** (hồ sơ đầy đủ) và **vắng mặt** (hồ sơ ngắn, "không nói, không chứng kiến").
- Thanh **Đang có mặt** ngay trên ô nhập: chip từng người + nút **Sửa** (modal
  `openHienDien` để chỉnh tay) + nút **Cảnh riêng**. Chỉ hiện khi hội thoại có ≥ 2 nhân
  vật hoặc đang ở cảnh riêng.

### Cảnh riêng

- `conv.canhRieng = { nvId, moLuc }` — mở bằng nút **Cảnh riêng**, bằng modal chọn người
  (`openChonCanhRieng`, có nút **Đổi người** khi đang ở trong cảnh riêng), hoặc bằng câu
  lệnh nhanh trong ô nhập: `Cảnh riêng: Tên` / `Quay lại nhóm` (`xuLyLenhCanh`).
- Trong cảnh riêng: `hienDienCua` chỉ trả về nhân vật đó (những người khác thành "vắng
  mặt"), thanh hiện diện đổi thành nhãn `🔒 Cảnh riêng với X` + nút **Quay lại nhóm**,
  hàng chọn người trả lời ẩn đi, và lượt nào cũng dùng `replyAs` cho đúng nhân vật đó.
- **Tin nhắn sinh trong cảnh riêng được gắn `rieng: <nvId>`** (cả tin của người chơi lẫn
  tin của AI). `logLine()` in chúng thành `[CẢNH RIÊNG với X] Tên: …` và `buildContext()`
  chèn khối `# CẢNH RIÊNG ĐANG MỞ` cùng quy tắc trong `# GIỚI HẠN HIỂU BIẾT`: chỉ người
  chơi và X biết; người khác **không được biết, không được nhắc tới, không được hành
  động như đã chứng kiến** trừ khi được kể lại/ tự phát hiện. Cờ `conv.daCoCanhRieng`
  giữ quy tắc này sống mãi sau khi cảnh riêng đóng.
- Tóm tắt tích luỹ (`tomTatMotDoan`) được dặn **giữ nguyên nhãn** `(cảnh riêng với X)`,
  nên thông tin riêng không rò rỉ vào ngữ cảnh chung qua bản tóm tắt.
- AI chỉ **gợi ý** quay lại nhóm khi tình huống riêng đã khép; người chơi là người đóng.

### Dữ liệu & tương thích

- `newConversation()` luôn có `hienDien` (mặc định = `nhanVatIds`), `canhRieng = null`,
  `daCoCanhRieng = false`. `chuanHoaTruyen()` chỉ bù mặc định khi `hienDien` **thiếu/
  `null`**; mảng (kể cả rỗng, sau khi đã bỏ những id không còn là người tham gia) được giữ
  nguyên — đây là đường tương thích cho file nhập và bản lưu cũ.
- `chuanHoaTinNhan()` chuẩn hoá `nvIds` (mảng, suy ra `[nvId]` cho tin cũ) và `rieng`.
- `chuanHoaTruyen()` cũng chuẩn hoá `story.nhip` (`cham` mặc định) và `story.canhDaKhep`
  (id, `htIds` lọc theo hội thoại còn tồn tại, mảng coerced, `huy` bool) rồi **bỏ** những
  cảnh không gắn được với hội thoại nào (dữ liệu rác kiểu đó sẽ được tính cho mọi hội thoại).
  `createStory()` khởi tạo sẵn `nhip: "cham"` và `canhDaKhep: []`.
- Tin nhắn AI nhóm: `{ vai:"ai", noiDung, nvIds:[…], nvId:<người đầu>, ten:"A · B" }`.
  `messageHtml()` vẽ chồng avatar (`avatarStack`) + tên ghép + nhãn `cảnh nhóm`; tin nhắn
  trong cảnh riêng có chip `🔒 cảnh riêng`. Tin cũ chỉ có `nvId` vẫn đọc được.
- `nvtsCuaTin()` là cửa vào duy nhất để lấy nhân vật của một tin (nhóm hay đơn).
- Viết lại tin nhắn (`regen-msg`) dùng `nvtsCuaTin` → tin nhóm được sinh lại **theo nhóm**
  (`sinhLaiVaoLichSu`), tin đơn sinh lại như cũ; nhánh mới (`taoNhanhVaLuuLai`) sao chép cả
  `nvIds`, `rieng`, `hienDien`.
- Xuất/nhập JSON giữ nguyên `hienDien`, `canhRieng`, `daCoCanhRieng`, `nvIds`, `rieng`
  (đã kiểm tra vòng lặp `chuanHoaTruyen`/`chuanHoaTinNhan`). `PHIEN_BAN_TRUYEN = 6` (tăng ở
  đợt Chế độ Đạo diễn để mọi bản lưu/nhập đều đi qua `chuanHoaDaoDien()`).
- Từ khoá dừng, chăm sóc sau, thương lượng (`tinHieuCanh`) giờ chỉ gọi những người
  **đang có mặt**; thanh giao kèo (`gkBar`) cũng chỉ liệt kê vai BDSM của người đang có mặt.

## Nội tâm, quan hệ & khép cảnh (đợt "quan hệ, tính cách ẩn & khép cảnh v1")

Nhân vật có nội tâm và quan hệ **phát triển từ từ, có nguyên nhân**, nhưng trạng thái
đó được **giữ ẩn** và chỉ biểu hiện qua hành vi. App **không** chạy thêm lượt AI phân
tích nào sau mỗi tin nhắn: chỉ khi người chơi bấm **Khép cảnh** mới có đúng một lượt
phân tích, và **chỉ những gì người chơi duyệt trong thẻ** mới trở thành sự thật lâu dài.

### Mô hình dữ liệu: `story.canhDaKhep` là nguồn sự thật duy nhất

`src/trangThai.js` **không lưu trạng thái song song**. Mọi thứ (ký ức, quan hệ, nội tâm)
được **tính ra** (`tinhTrangThai(story, conv)`) từ danh sách cảnh đã duyệt:

```js
story.canhDaKhep = [
  { id:"canh_…", htId, htIds:[convId…], tuMsgId, denMsgId, tuLuc, denLuc,
    tomTat, moc, luc, huy, huyLuc,
    kyUc:   [{ id, noiDung, biet:[id…], rieng }],
    quanHe: [{ id, tu, den, chieu, huong, buoc, moi, lyDo }],
    nhanVat:[{ id, nvId, truong, cu, moi, lyDo }] }, …
]
```

- `chieu` ∈ `tinTuong | ganGui | cangThang | quyenLuc | chuaNoi`; `huong` = `+1/-1`;
  `buoc` = bước dịch (1 với nhịp `cham`/`thichUng`, 2 với `kichTinh`).
  Mức nội bộ 0..10 **chỉ dùng cho logic** — UI chỉ hiện nhãn tự nhiên (`nhanMuc`) và
  chip `Tin tưởng ↑`. `chuaNoi` là **chữ**, không phải số.
- `truong` ∈ `mucTieu | camXuc | mauThuan | dongCo | cheGiau | huongThayDoi`
  (trạng thái phát triển, **tách khỏi** `tinhCach` gốc — tính cách gốc không bao giờ bị ghi đè).
- `tu` của một delta quan hệ **luôn là nhân vật AI** (người ta chỉ kể được cảm xúc của
  nhân vật, không kể thay người chơi); `den` có thể là `"nguoi"` (id người chơi) hoặc
  một nhân vật khác ⇒ quan hệ **bất đối xứng** (A tin B ≠ B tin A).
- Ưu điểm của thiết kế này: ghi = **một thao tác append duy nhất** (không có trạng thái
  nửa vời); vô hiệu một cảnh = đặt `huy` ⇒ mọi delta của nó tự biến mất; trạng thái và
  nguồn không thể lệch nhau. `htIds` cho phép một cảnh thuộc nhiều hội thoại (bản sao
  cảnh khi tạo nhánh) mà vẫn cộng đúng vào trạng thái của từng hội thoại.

### Nhịp phát triển (theo từng truyện)

`story.nhip` ∈ `cham` (mặc định) · `thichUng` · `kichTinh` — chọn trong **Tuỳ chọn
truyện** rồi bấm **Lưu**. `nhip.dan` chèn thẳng vào prompt phân tích để ép mức bảo thủ;
`nhip.buoc` quyết định bước dịch của delta.

### Đưa trạng thái vào prompt (`ai.js → buildTrangThai`)

- Chèn vào `buildContext` **chỉ khi** hội thoại đã có cảnh được duyệt
  (`tt.coDuLieu`); truyện chưa khép cảnh nào ⇒ prompt **không đổi một ký tự**.
- Chỉ dựng khối cho **những nhân vật liên quan** tới lượt này (`opts.ids`), tối đa 6 ký
  ức gần nhất mỗi người, mỗi dòng cắt ngắn ⇒ truyện dài không phình context.
- Khối nói rõ: trạng thái là **nguyên nhân của hành vi**, không phải để nhân vật thuật
  lại cảm xúc; điều đang che giấu chỉ lộ qua dấu hiệu.
- **Phạm vi biết**: ký ức của cảnh riêng chỉ vào khối của người tham gia. Khi một cảnh
  *có cả* người biết và người không biết, mục `# ĐIỀU KHÔNG ĐƯỢC BIẾT` mới liệt kê
  “X KHÔNG được biết: … (chỉ A, B biết)” để model không để lộ bí mật. Nếu người biết
  không có mặt thì bí mật đơn giản là **không vào prompt** ⇒ không có đường rò rỉ.

### Tín hiệu "đã tới điểm nghỉ" (ẩn)

`<<KHEP>> có|không` được yêu cầu ở **cuối mỗi lượt thường** (cả nhánh một nhân vật —
`replyAs` — lẫn nhánh nhóm — `replyAsGroup`), với điều kiện nghiêm: chỉ nói `có` khi cao
trào/mục tiêu nhỏ vừa xong và câu chuyện đang ở điểm nghỉ; **không** nói `có` giữa cao
trào, khi người chơi còn phải phản ứng, hoặc khi chăm sóc sau chưa xong.

- `catDieuKhien()` cắt khối điều khiển khỏi **cả khi đang stream** lẫn bản lưu ⇒ người
  dùng không bao giờ thấy ký hiệu; `docKhep()` đọc tín hiệu (true / false / null).
- **Chữ ký đã đổi**: `AI.replyAs()` giờ trả `{ text, khep }` (trước đây trả chuỗi). Lượt
  chăm sóc sau / thương lượng trả `khep: null` (không được phép gợi ý khép). Gọi ở
  `streamOneReply`; ở lượt thường đặt `conv.goiKhep = (khep === true)`.
- Kết quả nằm ở `conv.goiKhep` (trạng thái **tạm**, `chuanHoaTruyen` luôn đặt lại `false`).
  Chỉ hiện **chip mỏng** `Có thể khép cảnh` ở hàng chip trên ô nhập. Không tự mở thẻ,
  không tự khép. `generateTurn` xoá cờ ở đầu mỗi lượt; `tinHieuCanh` (từ khoá dừng /
  chăm sóc sau) cũng xoá vì cảnh vừa đổi nhịp.

### Luồng Khép cảnh: gọi AI một lần → thẻ duyệt → ghi nguyên tử

1. **Nút thủ công** `[data-act="khep-canh"]` trong khung chat (và chip gợi ý) →
   `openKhepCanh()`. Đoạn cần phân tích = `messages.slice(TS.mocBatDau(...))` — tức từ
   **sau** cảnh đã khép gần nhất (mốc `conv.khepGoc` hoặc `denMsgId` của cảnh cuối).
   Rỗng ⇒ báo "Chưa có gì mới để khép…", không gọi AI.
2. `AI.khepCanh({story, conv, messages, ids})` — **một lượt gọi duy nhất**: ngữ cảnh
   thường + `# DIỄN BIẾN CỦA CẢNH CẦN KHÉP` + TASK quy định đúng định dạng
   `TÓM TẮT:` / `KÝ ỨC:` / `QUAN HỆ:` / `NHÂN VẬT:` / `MÓC:`, kèm quy tắc bằng chứng
   (một câu nói bình thường không đổi quan hệ; từ chối/đặt giới hạn không phải mất thiện
   cảm; dùng từ khoá dừng đúng giao kèo không phải phản bội; thay đổi lớn phải tích luỹ),
   trần số mục (4 ký ức / 4 quan hệ / 3 phát triển) và dòng nhịp phát triển.
   `ids` (`idsCuaDoan`) = người đang có mặt + nhân vật của cảnh riêng + ai đã lên tiếng
   trong đoạn ⇒ cảnh nhóm không đụng tới người vắng mặt.
3. `AI.docPhieu(raw, …)` — parser **chịu lỗi**: khớp nhãn không dấu/không phân biệt hoa
   thường, chấp nhận `|` phân trường, `KHONG CO` ⇒ bỏ mục đó, tên → id qua `tenRaId`
   (chỉ trong số người của hội thoại), riêng cảnh riêng thì luôn thêm người chơi + nhân
   vật đó vào `biet`. Hỏng hoàn toàn ⇒ trả phiếu rỗng và người dùng tự viết.
4. Thẻ `theKhepHtml()` hiện **tất cả** các mục dưới dạng sửa được: tóm tắt, từng ký ức
   (checkbox + textarea + chip `Ai biết`), từng thay đổi quan hệ (cặp `A → B` + chip
   hướng `Tin tưởng ↑` / `Điều chưa nói` + ô `Vì…`), phát triển nhân vật (`Cũ:` + hướng
   mới + `Vì…`), móc cảnh sau. `docTheKhep()` đọc lại **đúng** những gì người dùng để
   lại (mục bỏ chọn không được ghi).
5. **Duyệt & khép cảnh** → `apDungKhep()`: append `TS.taoCanh(...)` vào `story.canhDaKhep`,
   thêm một divider nhẹ `⏸ Đã khép cảnh — <tóm tắt>` (`vai:"he"`, `khep:"<sceneId>"`),
   rồi **một** `luuTruyen`. Lỗi bất kỳ ⇒ khôi phục `canhDaKhep`/`goiKhep`, gỡ divider,
   **giữ nguyên thẻ và nội dung người dùng đang duyệt** để bấm lại. `conv.goiKhep = false`.
6. Móc cảnh sau chỉ là gợi ý: chip `🎬 <móc>` chèn vào ô nhập (`dung-moc`), không tự sinh cảnh.

### Sửa/cắt lịch sử và tạo nhánh

- `TS.canhSauDiem(story, convId, msgs, idx)` trả về các cảnh **không** nằm trọn trước
  `idx` (thiếu mốc tin nhắn ⇒ coi như bị ảnh hưởng). Trước khi sửa/xoá/cắt, `hoiVoHieuCanh`
  hiện cảnh báo nêu **số cảnh + tóm tắt** sẽ bị vô hiệu; đồng ý thì `voHieuCanhTuDiem`
  đánh dấu `huy`, gỡ divider của chúng và lưu lại. Đã áp cho `save-edit`, `del-msg`,
  `vietLaiTinCuoi`, `catVaLuuLai`, `xoaHoiThoai`; `moVietLaiTinGiua` cũng nêu trước số
  cảnh bị ảnh hưởng.
- `taoNhanhVaLuuLai` chỉ **sao chép** những cảnh nằm trọn trước điểm rẽ (id cảnh mới,
  `tuMsgId`/`denMsgId` remap sang bản sao, `htIds:[nhánh]`), đặt `conv.khepGoc = idx`,
  remap cả id trong divider `khep` ⇒ nhánh **không** thừa hưởng delta từ tương lai của
  bản cũ, và bản cũ không bị đụng tới.

### UI tối giản

- Hàng chip `khépBar` chỉ chiếm ~30px phía trên ô nhập, cuộn ngang, không xuống dòng ở
  390px (`khepBar()` trả `""` khi không có chip ⇒ truyện cũ không có hàng này).
- Không biểu đồ, không thanh điểm, không sơ đồ quan hệ. Màn hình xem trạng thái riêng
  (và quyền sửa nhận định sai / đặt hướng tương lai) nằm ở **Chế độ Đạo diễn** — xem mục
  dưới. Đợt này **cố ý không làm**: sơ đồ quan hệ, mô phỏng thời gian vắng mặt, sự kiện
  ngoài màn hình, hệ điểm công khai.

## Chế độ Đạo diễn (đợt "chế độ đạo diễn v1")

Một màn **riêng của người dùng**, tách hẳn khỏi luồng chat (không làm đứt cảm xúc nhập
vai): xem trạng thái ẩn bằng ngôn ngữ tự nhiên, **sửa nhận định AI rút ra sai**, và **đặt
hướng phát triển tương lai** mà AI phải đi từng bước nhỏ qua nhiều cảnh. Mặc định **tắt**
với truyện cũ; bật/tắt ở **Tuỳ chọn truyện → Chế độ Đạo diễn** (tắt chỉ ẩn phần hiển thị,
**không xoá dữ liệu** — hướng chỉ ngừng vào prompt khi bấm Tạm dừng/Huỷ). Lối vào: nút
`data-act="open-dao-dien"` ở Tuỳ chọn truyện, panel `ddPanel` trên dashboard, và một biểu
tượng nhỏ ở header chat (chỉ khi `bat`). Modal được chặn mở trùng bằng `app.daoDienDangMo`.

### Ba thứ PHẢI tách bạch (cả trong dữ liệu lẫn trên màn hình)

| | Là gì | Ở đâu |
| --- | --- | --- |
| **Sự thật hiện tại** | Kết quả `TS.tinhTrangThai()` = cảnh đã duyệt + đính chính đang bật | nhãn `dd-tag-fact` |
| **Đính chính** | Lớp phủ tắt/xoá được; **không** sửa lịch sử, **không** phải cảnh giả | nhãn `dd-tag-dc`, khối viền đỏ |
| **Hướng tương lai** | Chỉ đạo kể chuyện, **không** phải sự thật; chỉ vào prompt như một đích | nhãn `dd-tag-huong`, khối viền vàng |

### Dữ liệu

```js
story.daoDien = {
  bat: false,
  dinhChinh: [{ id, loai:"nhanvat"|"quanhe", nvId, truong, tu, den, chieu, muc, cu, moi,
                lyDo, nguonCanh:[canhId…], luc, bat, xoa, xoaLuc, suaLuc }, …],
  huong: [{ id, ten, phamVi:"truyen"|"nhanvat"|"quanhe", nvId, tu, den, mongMuon, nhip,
            soCanh, rangBuoc, keHoach:{ trangThaiDau, mucTieu, buoc:[…], dauHieu, xungDot,
            dieuKienDung }, trangThai:"hoatDong"|"tamDung"|"hoanTat"|"huy",
            tienDo:[{ id, htId, canhId, trangThai, bangChung, buocTiep, luc }], luc, suaLuc }, …]
}
```

- `daoDienMacDinh()` / `daoDienOf(story)` (store.js) bù mặc định cho truyện cũ ⇒ không cần
  migrate; `daoDien` được tạo sẵn trong `createStory()` và đi qua `chuanHoaDaoDien()` trong
  `chuanHoaTruyen()` (nên export/import/backup giữ nguyên nó).
- `phamVi = "truyen"` ⇒ không có đối tượng; `"nhanvat"` ⇒ `nvId`; `"quanhe"` ⇒ `tu`/`den`
  (một phía có thể là `ID_NGUOI`). Hướng **không** thay đổi quan hệ/tính cách: nó chỉ tạo
  cơ hội — thay đổi thật vẫn phải qua thẻ Khép cảnh.

### Đính chính đi vào `tinhTrangThai()` như thế nào

`tinhTrangThai()` tính từ `story.canhDaKhep` **trước**, rồi **phủ đính chính đang bật lên
sau cùng** (`dinhChinhHieuLuc(story)`), và trả thêm `dinhChinh` để UI biết đâu là lớp phủ.
Đính chính `loai:"nhanvat"` ghi đè đúng một `truong` của một nhân vật; `loai:"quanhe"` ghi
đè một `chieu` của cặp (`chieu:"chuaNoi"` là ghi **chữ**, không phải mức số). Vì là lớp phủ
nên tắt (`bat:false`) hoặc xoá mềm (`xoa:true`) là trạng thái **quay về đúng** kết quả suy
từ cảnh — không có bản ghi nào bị sửa. `cu` (giá trị AI đang suy ra lúc tạo) và `nguonCanh`
(các cảnh làm cơ sở) được lưu lại chỉ để hiển thị/cảnh báo.

### Kế hoạch cầu nối trước khi kích hoạt

`openTaoHuong()` → người dùng điền form (phạm vi / đối tượng / hướng mong muốn / nhịp /
số cảnh / điều không được phá vỡ) → **Lập cầu nối** gọi AI **một lần**
(`AI.lapCauNoi()`, TASK `KẾ HOẠCH CẦU NỐI`) → `AI.docKeHoach()` đọc ra trạng thái xuất phát,
mục tiêu, 2–4 bước, dấu hiệu nhỏ, xung đột, điều kiện đổi hướng. Người dùng **sửa được kế
hoạch** rồi mới bấm **Kích hoạt hướng**. Huỷ modal hoặc lỗi AI/lỗi lưu ⇒ **không** tạo hướng
dở dang (hướng chỉ được `push` sau khi đã có kế hoạch và đã qua kiểm tra xung đột).
`ddKiemTraHuong()` + `huongCungDoiTuong()` phát hiện một hướng đang hoạt động **cùng đối
tượng**; nếu có, người dùng phải chọn *Quay lại / Tạm dừng hướng cũ / Huỷ hướng cũ* — không
bao giờ để hai chỉ đạo trái nhau cùng vào prompt.

### Hướng đi vào prompt như thế nào (`ai.js → buildDaoDien`)

- Chỉ chèn **đính chính đang bật** và **hướng đang hoạt động & liên quan** tới lượt này
  (`TS.huongLienQuan(story, conv, ids)`: `truyen` luôn liên quan; `nhanvat` khi nhân vật có
  mặt; `quanhe` khi một trong hai phía có mặt — người chơi luôn coi là có mặt).
- Chỉ đưa **mục tiêu + bước nên đẩy trong cảnh này + tiến độ gần nhất + ràng buộc**; **không**
  đưa toàn bộ lịch sử kế hoạch ⇒ context không phình.
- Khối `# ĐÍNH CHÍNH CỦA ĐẠO DIỄN` nói rõ đây là sự thật **đúng hơn** suy luận từ diễn biến,
  và dặn **đừng nhắc tới việc có đính chính**. Khối
  `# HƯỚNG PHÁT TRIỂN CỦA ĐẠO DIỄN` mở đầu bằng **ĐÍCH TƯƠNG LAI — không phải trạng thái hiện
  tại, không phải kết quả bắt buộc**, kèm 7 quy tắc bắt buộc (mỗi cảnh **một** bước nhỏ; AI
  được tạo cơ hội nhưng **tuyệt đối không ép người chơi**; nhân vật có thể chống lại/chậm
  thay đổi/làm hỏng cơ hội; người chơi đi ngược thì ghi nhận bị cản chứ không bẻ nhân vật;
  hướng quan hệ chỉ tạo cơ hội, quan hệ thật chỉ đổi khi duyệt ở Khép cảnh; hướng tính cách
  **không** sửa tính cách gốc).
- Từ khoá dừng / giới hạn cứng / giao kèo / quyền quyết định của người chơi **luôn cao hơn**
  mọi chỉ đạo Đạo diễn (khối Đạo diễn nằm trước `# GIAO KÈO` và `TASK:`).

### Tiến độ gắn với Khép cảnh

Thẻ Khép cảnh có thêm mục **Tiến độ Đạo diễn**, **chỉ hiện khi có hướng liên quan tới cảnh
đang khép** (`ai.js → khepCanh` thêm phần `TIẾN ĐỘ ĐẠO DIỄN` vào định dạng phiếu, `docPhieu`
parse nó ra `phieu.tienDo`; `mucTienDoHtml` vẽ một dòng cho mỗi hướng: trạng thái
`chuaCham | dangTienTrien | biCan | canDoiHuong | coTheHoanTat`, bằng chứng ngắn, bước tiếp).
Người dùng sửa/bỏ chọn từng dòng; **chỉ dòng còn chọn** mới được ghi, và `apDungKhep()` ghi
`TS.taoTienDo({htId, canhId, …})` **cùng lúc** với việc append cảnh (một `luuTruyen`), nên
không bao giờ có cảnh đã khép mà thiếu/ thừa tiến độ. **AI không bao giờ tự đánh dấu hoàn
tất**: chỉ khi người dùng tự tick ô "Đánh dấu hướng này HOÀN TẤT" (ô chỉ hiện khi AI đề xuất
`Có thể hoàn tất`) thì `h.trangThai` mới thành `hoanTat`. Tiến độ là **lịch sử riêng của chỉ
đạo**, không phải ký ức của nhân vật — nó không đi vào prompt như ký ức (chỉ dòng "tiến độ
gần nhất" của chính hướng đó). Tạo nhánh (`taoNhanhVaLuuLai`) chỉ sao chép bước tiến có
`canhId` nằm trước điểm rẽ (id remap, `htId` đổi sang nhánh); tiến độ tương lai của bản cũ
**không** đi theo.

### Cơ sở thay đổi & tính nguyên tử

- `TS.canhBaoCoSo(story, dc)` / `TS.tienDoCoCanhBao(story, huong)` phát hiện đính chính hoặc
  bước tiến đang tham chiếu một cảnh đã bị **vô hiệu** (do sửa/xoá/cắt tin nhắn) và hiện
  cảnh báo "cơ sở đã thay đổi" trong màn Đạo diễn — **không** tự xoá dữ liệu người dùng.
- **Mọi thao tác ghi đi qua `ddLuu(story, viec, truoc)`**: người gọi chụp `ddTruoc(story)`
  **TRƯỚC khi sửa** rồi truyền vào; ghi hỏng thì `story.daoDien = truoc` trả lại nguyên trạng
  (chụp sau khi đã sửa thì vô nghĩa — đây từng là một lỗi thật, làm "đính chính ma" sống
  trong RAM sau khi lưu hỏng). `apDungKhep()` và `taoNhanhVaLuuLai()` cũng có snapshot riêng
  cho `story.daoDien` trong `khoiPhuc()`/`donNhanh()`.

### UI tối giản

Card + chip + form hiện có, **không** thêm biểu đồ. Mỗi hướng hiện tên, chip phạm vi/đối
tượng/nhịp/số cảnh/số bước, trạng thái, bằng chứng gần nhất, và các nút *Sửa kế hoạch /
Tạm dừng-Tiếp tục / Hoàn tất / Huỷ hướng*. Bằng chứng và ký ức dài nằm trong `<details>`
thu gọn. `@media (max-width: 560px)`: `.dd-grid`/`.dd-2col` về **một cột**, `.dd-pair` và
`.dd-acts .btn` xuống dòng, `.dd-form input/textarea` không tràn ngang, và `.dd-line` đổi
sang lưới `minmax(0,40%) minmax(0,1fr) auto`. `.dd-line` dùng **CSS grid** (không phải flex
baseline) để nhãn/giá trị/nút luôn tách rời ở mọi bề rộng.

## Kiến trúc

```
main.pjs        "bảng điều khiển": import plugin, $meta, CauHinh(), TheLoai(),
                MauNhanVat(), MauCotTruyen(), layChuDau().
index.html      khung rỗng: #bootScreen #appRoot #modalRoot #toastRoot + nạp src/app.js.
src/store.js    lớp dữ liệu: persist qua kv-plugin, các hàm new*/create/save/delete,
                messagesCache, thống kê, tiện ích truy vấn (charById, convsOfChapter…).
src/trangThai.js lớp trạng thái nhập vai: ký ức / quan hệ / nội tâm được TÍNH RA từ
                story.canhDaKhep (tinhTrangThai), mốc tin nhắn, vô hiệu cảnh khi sửa
                lịch sử, dựng bản ghi cảnh từ phiếu đã duyệt (taoCanh), nhịp phát triển.
                KHÔNG import gì (tránh vòng import với store/ai).
src/thoiGian.js schema + logic thuần của "thời gian vắng mặt": chuẩn hoá story.thoiGian,
                phiên vắng mặt, sổ sự kiện ngoài màn hình, khi nào được mô phỏng, ai biết
                sự kiện nào. KHÔNG import gì (store.js dùng lại schema từ đây).
src/ai.js       toàn bộ prompt + gọi AI: dựng ngữ cảnh (prefix-cache-friendly),
                stream, chọn người nói, gợi ý, tóm tắt, rút sự kiện, sinh truyện/nhân vật/mở đầu/ảnh.
src/app.js      giao diện & luồng: thư viện, wizard, bảng điều khiển, chat, các editor,
                modal, routing bằng hash, theme, boot().
src/ui/<màn>/   các màn đã tách khỏi app.js (Đợt 6): taoAnh/, nhanVat/, taoTruyen/,
                tuyChonTruyen/, lorebook/, suKien/ (bảng xử lý sự kiện toàn cục) + cong18.js
                (cửa 18+ dùng chung). Mỗi màn: index.js = VỎ, *Flow.js = logic THUẦN.
src/lore.js     sổ tri thức (lorebook): đọc file chuẩn World Info / SillyTavern, dò từ khoá
                theo diễn biến, dựng khối ngữ cảnh gửi kèm, xuất ngược ra JSON.
src/dom.js      tiện ích dùng chung: esc/fmt, icon() SVG, toast, modal/confirm/prompt,
                avatar chữ cái, timeAgo, download.
src/styles.css  theme tối/sáng (html[data-theme="toi"|"sang"]), responsive.
```

Quy ước: mọi tên hàm/biến nội bộ đặt theo tiếng Việt không dấu (`conTruyen`,
`pickSpeakers`, `taoTruyen`) để dễ đối chiếu với nhãn hiển thị.

### Dữ liệu

- kv folder `cotTruyen` — mỗi cốt truyện một bản ghi, key = `story.id`.
- kv folder `tinNhan` — tin nhắn của từng hội thoại, key = `conv.id` (mảng message).
- kv folder `thuVienAnh` — **ảnh cảnh đã dựng**, key = `anh.id`. Bản ghi đầy đủ
  (`{ id, dataUrl, prompt, loaiTru, phongCach, kichThuoc, chuThich, convId, luc }`);
  `story.anh` chỉ giữ **bản nhẹ** (bỏ `dataUrl`) làm mục lục, mới nhất đứng đầu.
  `getAnh(id)` đọc qua `store.anhCache` rồi mới tới kv; `luuAnh`/`xoaAnh` là cửa vào.
- `localStorage["truyenVai.caiDat"]` — cài đặt giao diện (theme, autoChronicle, autoOpening,
  và lựa chọn gần nhất cho ảnh: `anhPhongCach`, `anhKichThuoc`).

Cấu trúc một message: `{ id, vai: "nguoi"|"ai"|"he"|"anh", noiDung, luc, nvId?, nvIds?, ten?, rieng?, anhId?, chuThich?, __streaming?, sua?, daDung? }`
(`vai: "he"` dùng cho ghi chú/placeholder như "⚠️ …" khi AI lỗi; `nvId` là id nhân vật AI đã nói;
`nvIds` là **danh sách** nhân vật tham gia một đoạn cảnh nhóm (tin cũ chỉ có `nvId` vẫn đọc được);
`rieng` là id nhân vật của cảnh riêng đang mở lúc tin nhắn ra đời — xem mục **Cảnh nhóm**;
`vai: "anh"` là **tin nhắn khung hình** — nội dung ảnh nằm ở bản ghi `thuVienAnh[anhId]`, không nằm trong `noiDung`).
với sự kiện vắng mặt: `vangMat` là id sự kiện (kèm `vangMatPhien`) để dựng dải phân cách
thời gian khi tin nhắn ra đời từ một phiên vắng mặt)
- Cấu trúc một hội thoại: `{ id, tieuDe, chuongId, nhanVatIds, hienDien, canhRieng, daCoCanhRieng, goiY, tomTat, tomTatDen, … }`
  (`nhanVatIds` = người tham gia hội thoại; `hienDien` = người **đang có mặt trong cảnh**,
  mặc định bằng `nhanVatIds` — `[]` là cảnh chỉ còn người chơi, còn *thiếu hẳn* trường này
  nghĩa là "chưa từng ghi, dùng mặc định"; `canhRieng = { nvId, moLuc }` khi đang nói riêng
  với một người; `vgMocLuc` chỉ có ở nhánh tạo từ quá khứ — mốc điểm rẽ, để loại sự kiện
  ngoài màn hình sinh ra sau khi tách nhánh).
- `store.messagesCache` — cache tin nhắn trong RAM; `loadMessages`/`persistMessages` là cửa vào.
- `story.nhip` — nhịp phát triển (`cham` mặc định · `thichUng` · `kichTinh`).
- `story.canhDaKhep` — nhật ký cảnh đã duyệt (nguồn sự thật duy nhất của trạng thái nhập
  vai). Chi tiết schema ở mục **Nội tâm, quan hệ & khép cảnh**.
- `story.daoDien = { bat, dinhChinh:[…], huong:[…] }` — Chế độ Đạo diễn: lớp đính chính
  (có thể tắt/xoá mềm) và các hướng phát triển tương lai kèm kế hoạch + tiến độ. Chi tiết
  schema ở mục **Chế độ Đạo diễn**.
- `story.thoiGian = { cheDo, nguongPhut, chuDong, hoatDongLuc, daXuLyLuc, phien }` — cấu hình "thời gian vắng mặt"
  theo từng truyện (chế độ quy đổi thời gian, ngưỡng xử lý, công tắc tương tác chủ động),
  kèm mốc hoạt động gần nhất, mốc đã xử lý, và `phien` (phiên đang xử lý / cần thử lại / vừa xong). Chi tiết ở mục **Thời gian vắng mặt & tương tác
  chủ động**.
- `story.ngoaiManHinh = [ … ]` — sổ sự kiện ngoài màn hình (chỉ chứa sự kiện **không** gắn
  hội thoại; sự kiện theo cảnh nằm ở `story.canhDaKhep`). Chi tiết schema ở cùng mục trên.
  Mỗi sự kiện: `{ id, luc, loai, hinhThuc, noiDung, thamGia, biet, muc, mucGoc, heLo,
  phatHien, htId, tnIds, anhHuong, phienId, phutVangMat, cheDoVangMat, suaLuc }` — `muc` là
  **mức hiệu lực**, `mucGoc` là mức gốc, `heLo` là sổ nguồn của các lần hé lộ (xem mục **Sổ
  hé lộ**).

### Khái niệm then chốt

- **Bối cảnh (`story.boiCanh`)** — luôn nằm đầu ngữ cảnh gửi cho AI.
- **Biên niên sử (`story.bienNienSu`)** — ký ức chung của cả truyện, luôn được gửi
  kèm trong mọi hội thoại. Ghi bằng tay, hoặc AI rút ra từ hội thoại / cuối chương.
- **Tóm tắt hội thoại (`conv.tomTat` + `tomTatDen`)** — nén phần tin nhắn cũ khi
  ngữ cảnh vượt ngưỡng (`maybeCompact`), để cuộc trò chuyện dài không tràn context.

### Điều hướng & hội thoại chưa xếp chương

Luồng màn hình: **Thư viện → Bảng điều khiển (truyện) → Khung chat**. Mọi màn hình
trong truyện đều có đường quay lại:

- Khung chat: nút mũi tên trái (`go-dashboard`) về Bảng điều khiển.
- Bảng điều khiển: hàng nav trên cùng (`navQuayLai()`) gồm nút **Thư viện**
  (`go-library`) + tên truyện; trên màn hình hẹp (`≤940px`) hàng này còn có nút mở
  sidebar (`dash-menu` → `toggle-sidebar`).
- Sidebar: nút về Thư viện ở `side-top` (mọi kích thước), và các mục
  Bảng điều khiển / Nhân vật / Biên niên sử.

**Hội thoại chưa xếp chương** = `looseConversations(story)` — hội thoại có `chuongId`
rỗng **hoặc** trỏ tới một chương đã bị xoá. Chúng xuất hiện ở:

- Panel **“Chưa xếp chương (N)”** trên bảng điều khiển (chỉ ở chế độ `chuong` và chỉ
  khi có ít nhất một hội thoại như vậy) — dùng chung hàm dựng thẻ `threadCard()`.
- Mục cùng tên trong **sidebar** (`side-sep` “Chưa xếp chương”).

Gán lại chương cho một hội thoại bằng “Sửa” trong hội thoại (`openConvEditor` → ô chọn
chương). Không cần gán: hội thoại lẻ vẫn dùng chung bối cảnh + biên niên sử.

## Lớp giao kèo (BDSM M/M — trao đổi quyền lực)

Một **lớp tuỳ chọn** cho các cốt truyện chủ đề nam–nam có trao đổi quyền lực. Bật/tắt
theo từng cốt truyện; khi tắt thì app chạy y như cũ.

- **Dữ liệu**: `story.giaoKeo = { bat, vaiNguoiChoi: "sub"|"dom"|"switch", tuKhoaDung,
  kieuQuanHe, mucDo: 1..5, nhipDo, doDai, ngonNgu, soThich: [id…],
  gioiHanCung, gioiHanMem, khongKhi, chamSocSau, danhXung, luatCanh, luuY }`.
  Mặc định ở `GiaoKeoMacDinh()` (main.pjs); `giaoKeoMacDinh()` / `giaoKeoOf(story)`
  (store.js) bù mặc định cho truyện cũ nên không cần migrate. **`soThich` là mảng** —
  `giaoKeoMacDinh()` phải `.slice()` nó, nếu không mọi truyện sẽ dùng chung một tham chiếu.
- **Danh sách trong `main.pjs`** (đều là `() => [...]`, đọc qua `R.<Ten>()`):
  `KieuQuanHe()` — 13 khung quan hệ (chủ–tớ, thầy–trò, huấn luyện, bác sĩ, cai ngục,
  quý tộc, săn đuổi, chiến lợi phẩm, thú cưng, đổi vai, không khuôn mẫu…), mỗi mục có
  `{ id, emoji, ten, vaiMacDinh, moTa, goiY }`; `SoThichBdsm()` — **39 sở thích** chia
  6 nhóm (`Trói buộc & đạo cụ`, `Kiểm soát giác quan`, `Kiểm soát & mệnh lệnh`,
  `Đau & kỷ luật`, `Tâm lý`, `Thân mật (NSFW)`) dạng `{ id, emoji, ten, nhom, moTa }`;
  `NhipDoBdsm()` (4), `DoDaiCanh()` (4), `NgonNguBdsm()` (4); `MucDoBdsm()` — 5 mức,
  mỗi mức có thêm `gom` (liệt kê thứ nằm trong mức đó, được chèn vào prompt);
  `CanhBdsm()` — 14 preset bối cảnh; `MauGiaoKeo()` — **8 mẫu giao kèo dựng sẵn**
  (`{ id, emoji, ten, moTa, ap: {…một phần giao kèo…} }`) cho nút bấm-một-cái-là-đầy.
- **Thể loại BDSM**: `TheLoai()` có 10 mục `bdsm: true` (M/M, cổ trang, câu lạc bộ,
  trại huấn luyện, bệnh viện, nhà tù, chủ nhân bóng tối, thú cưng, sát thủ, cung đình).
  Mỗi mục có thêm `kieuQuanHe` — chọn thể loại trong wizard sẽ **tự bật giao kèo**,
  **tự chọn khung quan hệ** và đổ `khongKhi` (nếu còn trống).
- **Nhân vật**: `newCharacter()` có `vaiBdsm` ("Dom"|"Sub"|"Switch"), `kinhNghiem`
  ("Mới tập"|"Có kinh nghiệm"|"Dày dạn"|"Bậc thầy"), `phongCach` ("Nghiêm khắc"|"Dịu
  dàng"|"Trêu chọc"|"Lạnh lùng"|"Bảo vệ"|"Thất thường"), `khauVi`, `soThich: [id…]`,
  `gioiHan`, `gioiHanCung`, `danhXung`, `luatRieng`, `chamSocSau`, `tinHieuRieng`.
  `MauNhanVat()` có **25 mẫu BDSM** điền sẵn toàn bộ các trường này (10 mẫu đầu là mẫu
  thường, không có `vaiBdsm`).
- **Prompt**: `buildGiaoKeo(story)` trong `src/ai.js` phát ra khối
  `# GIAO KÈO TRAO ĐỔI QUYỀN LỰC (BDSM, nam–nam / M/M)` gồm vai người chơi, khung quan
  hệ, từ khoá dừng, mức độ (kèm `gom`), nhịp độ, độ dài cảnh, ngôn ngữ, "Điều người
  chơi MUỐN có trong cảnh" (tên sở thích đã chọn), giới hạn cứng/mềm, luật riêng,
  chăm sóc sau, dặn dò — rồi **14 quy tắc bắt buộc**: (1) từ khoá dừng dừng cảnh ngay →
  chăm sóc sau; (2) giới hạn cứng không bao giờ xuất hiện; (3) giữ đúng tương quan
  quyền lực; (4) đồng thuận nằm trong màn chơi; (5) viết cụ thể, giàu giác quan;
  (6) đi vào nội tâm; (7) người nắm quyền đọc dấu hiệu quá sức; (8) không viết thay
  người chơi; (9) chuyển sang chăm sóc sau; (10) không vượt mức đã thoả thuận;
  **(11) viết thẳng cảnh thân mật theo đúng mục Ngôn ngữ — không cắt cảnh, không tóm
  tắt, không né bằng từ mơ hồ; (12) nhân vật AI phải chủ động dẫn cảnh; (13) chỉ dùng
  hoạt động nằm trong mục MUỐN hoặc nhẹ hơn; (14) cả hai bên đều có cảm xúc thật.**
  Khối này nằm trong **tiền tố tĩnh** của `buildContext()` (ngay trước biên niên sử) nên
  giữ được prefix cache; mọi nhiệm vụ AI (trả lời, gợi ý, mở đầu, tóm tắt, rút sự kiện)
  đều đi qua `buildPrompt` nên đều tuân theo giao kèo. `hoSoNhanVat()` cũng phát ra mọi
  trường BDSM của nhân vật (kể cả `Dấu hiệu cho thấy nhân vật sắp quá sức`).
- **Sinh nội dung**: `generateStorySeed({ theLoai, yTuong, giaoKeo })` đưa khung quan hệ
  + mức độ vào bối cảnh; `generateCharacter({ …, bdsm })` hỏi AI thêm 11 mục BDSM khi
  `bdsm` bật, và tự chuẩn hoá câu trả lời về đúng enum (`chuan()`) + tra id sở thích
  (`tenSoThichTheoTen()`).
- **Hai nhiệm vụ riêng**: `replyAs({ loaiTask: "chamSocSau" })` (thoát vai, kiểm tra
  người chơi, nước/chăn/thuốc, không diễn tiếp) và `loaiTask: "thuongLuong"` (nói
  thẳng về mong muốn/giới hạn trước cảnh). Không có `loaiTask` thì là trả lời thường.
- **Giao diện**: `htmlGiaoKeo/dienGiaoKeo/docGiaoKeo/ganSuKienGiaoKeo` trong `app.js`
  dùng chung cho **Bước 4 của wizard**, **modal `openGiaoKeo()`** (từ Tuỳ chọn truyện,
  từ thanh giao kèo trong chat, và từ panel trên dashboard) — cùng tiền tố `wiz` / `gk`.
  Form chia 6 khối có tiêu đề (`.gk-sec`): Mẫu dựng sẵn → Vai & cường độ → Khung quan hệ
  & nhịp cảnh → Điều bạn muốn có trong cảnh → Giới hạn & an toàn → Xưng hô & chăm sóc sau.
  `htmlMauGiaoKeo(p)` vẽ nút mẫu dựng sẵn; `htmlThichChips(g, p)` vẽ chip sở thích theo
  nhóm (chọn nhiều, lưu vào một `<input type="hidden" data-f="<p>soThich">` dạng CSV);
  `paintGiaoKeo(scope, p)` đồng bộ lại phần nhìn (chip mức độ, mô tả mức độ, chip sở
  thích, gợi ý khung quan hệ). Bấm một mẫu dựng sẵn = gộp `docGiaoKeo()` hiện tại với
  `m.ap`, rồi `dienGiaoKeo()` lại toàn bộ (mảng `soThich` phải được `.slice()`).
- **Editor nhân vật + giao kèo**: khối BDSM trong `openCharacterEditor` **luôn được vẽ**
  (kể cả khi truyện chưa bật giao kèo) — khi chưa bật thì nằm trong `<details
  data-gk-off>` đóng sẵn, kèm nút **Bật giao kèo cho truyện này**
  (`data-act="enable-giao-keo"`: đặt `bat = true`, lưu truyện, mở sẵn khối, giữ nguyên
  mọi thứ đã điền). Chip sở thích của nhân vật do `htmlThichChipsNv(c)` vẽ
  (`data-nv-thich`, khoá `soThich` **không** có tiền tố) và `paintNvThich(body)` đồng bộ.
  Danh sách mẫu nhân vật luôn hiện đủ, nhóm mẫu BDSM nằm riêng dưới nhãn “Mẫu BDSM”;
  chọn một mẫu BDSM khi giao kèo đang tắt thì khối `<details>` tự mở ra và gợi ý bật.
- **Thanh giao kèo trong chat** (`gkBar()`): chip vai + khung quan hệ + tên nhân vật kèm
  vai BDSM + số sở thích đã chọn, chip mức độ 1–5 bấm nhanh (`doiMucDo`), chip từ khoá dừng, và 3 nút:
  **Thương lượng**, **Chăm sóc sau**, **Từ khoá dừng** (`tinHieuCanh()` → đẩy tin
  nhắn của người chơi (nếu có) + một ghi chú `vai:"he"` rồi cho từng nhân vật trong
  hội thoại phản hồi bằng đúng `loaiTask`).
- **Panel dashboard** (`gkPanel` trong `renderDashboard`): bản tóm tắt giao kèo đang áp
  dụng — vai, từ khoá dừng, mức độ, khung quan hệ, nhịp & ngôn ngữ, danh sách sở thích
  đã chọn, luật riêng, xưng hô, giới hạn, bối cảnh, chăm sóc sau, vai BDSM của nhân vật.
- **CSS**: mục «giao kèo» trong `src/styles.css` — `.gk-sec` (tiêu đề khối),
  `.gk-mau-row/.gk-mau*` (nút mẫu dựng sẵn), `.gk-thich-box/.gk-thich-nhom/.gk-thich-ten/
  .gk-thich-row/.gk-thich(.on)` (chip sở thích), `details.gk-more`, `details[data-gk-off]`,
  `.mau-nv-bdsm` (mẫu BDSM trong danh sách mẫu nhân vật). Có biến thể hẹp trong
  `@media (max-width: 560px)` (chip nhỏ hơn, nút mẫu dựng sẵn full-width) và biến thể
  sáng `html[data-theme="sang"] .gk-thich.on`.
- **Chỉnh sửa**: `GiaoKeoMacDinh()`, `KieuQuanHe()`, `SoThichBdsm()`, `NhipDoBdsm()`,
  `DoDaiCanh()`, `NgonNguBdsm()`, `MauGiaoKeo()`, `MucDoBdsm()`, `CanhBdsm()` và các
  thể loại `bdsm:*` trong `TheLoai()` — tất cả ở `main.pjs`; prompt trong
  `buildGiaoKeo()`/`hoSoNhanVat()`/`generateStorySeed()`/`generateCharacter()`;
  giao diện trong `gkBar`/`gkPanel`/`openGiaoKeo`/`htmlGiaoKeo`/`openCharacterEditor`.

## Sổ tri thức (lorebook)

Nạp file JSON theo chuẩn **World Info / SillyTavern** để AI có sẵn kiến thức nền (địa danh, tổ chức, nhân vật
phụ, luật lệ…). Chỉ những mục có **từ khoá** khớp mới được chèn vào prompt, nên sổ dài cũng không tốn ngữ cảnh.

- **Dữ liệu**: `story.lorebook = { ten, phienBan, entries: [...] }`; mỗi mục là
  `{ id, ghiChu, keys, keys2, noiDung, bat, hangSo, chonLoc, thuTu, doSau, phanBietHoa, khopTronTu, khongDeQuy }`.
  `loreCua(story)` bù mặc định cho truyện cũ (không cần migrate); `chamLore(story)` đổi `phienBan` sau mỗi lần
  sửa để bộ đệm “mục đang khớp” biết dữ liệu đã đổi. Sổ nằm trong bản ghi truyện nên đi kèm luôn khi xuất/nhập JSON.
- **Đọc file** (`docLorebook`): nhận `{entries:{…}}` (World Info), `{entries:[…]}` (character book), một mảng,
  một mục đơn lẻ, và cả thẻ nhân vật (`data.character_book`). Các trường được đọc: `key/keys`,
  `keysecondary/secondary_keys`, `content`, `comment/name`, `constant`, `selective`, `disable`/`enabled`,
  `order`/`insertion_order`, `caseSensitive`, `matchWholeWords`, `preventRecursion`, `scanDepth`. Mục thiếu
  **nội dung** bị bỏ qua (đếm vào `boQua`); mục thiếu **từ khoá** được nhập ở trạng thái tắt (đếm vào
  `thieuTuKhoa`). `xuatLorebook(story)` xuất ngược ra đúng chuẩn World Info.
- **Dò từ khoá** (`mucKhop`): quét tên truyện + bối cảnh + tên/bối cảnh mở đầu hội thoại + `CFG.soTinNhanQuetLore`
  tin nhắn gần nhất (mỗi mục ghi đè được bằng `doSau`). Khớp không phân biệt hoa/thường (trừ khi bật
  `phanBietHoa`); `khopTronTu` khớp theo biên từ. Mục `hangSo` luôn được gửi; mục `chonLoc` phải khớp thêm một
  khoá trong `keys2`. Sau vòng đầu còn quét thêm tối đa 3 vòng: nội dung của các mục đã khớp có thể kéo theo mục
  khác (trừ mục bật `khongDeQuy`) — đó là `recursive_scanning` của SillyTavern, ở dạng đơn giản. Kết quả sắp theo
  `thuTu`, có bộ đệm theo `phienBan` + số tin nhắn cuối.
- **Prompt** (`buildLore`): khối `# SỔ TRI THỨC — thông tin nền đã định trước` nằm **giữa nhật ký và `TASK:`**
  (không thuộc tiền tố tĩnh, vì nó đổi theo từng lượt) — `buildPrompt` chỉ chèn khi có mục khớp, nên truyện
  không có sổ giữ nguyên prompt cũ. Cắt bớt theo `CFG.nganSachKyTuLore` (tổng) và `CFG.soKyTuMoiMucLore` (mỗi mục).
- **Giao diện** (`openLorebook()`): mở từ **Tuỳ chọn truyện**, từ panel **Sổ tri thức** trên bảng điều khiển, và
  từ nút 📖 trên thanh chat (kèm huy hiệu `đang khớp/tổng` hiện khi huy hiệu > 0). Trong modal: chọn file `.json`,
  dán JSON (**Thêm vào sổ** / **Thay thế toàn bộ sổ**), **Thêm mục trống**, sửa từng mục bằng form inline
  (`lbFormHtml`), bật/tắt nhanh, xoá mục, **Xuất JSON**, **Xoá cả sổ**; mục đang khớp với hội thoại hiện tại
  (hoặc hội thoại mở gần nhất) được tô “đang khớp”.
- **Chỉnh sửa**: hằng số ở `CauHinh()` — `soTinNhanQuetLore`, `nganSachKyTuLore`, `soKyTuMoiMucLore`; logic ở
  `src/lore.js`; giao diện ở `openLorebook` / `lbMucHtml` / `lbFormHtml` / panel `lbPanel` (app.js); CSS ở mục
  «sổ tri thức» cuối `src/styles.css` (`.lb-*`, `.icon-badge`).

## Tạo nhân vật bằng AI (hai bước)

**Tạo bằng AI** trong editor nhân vật (và **Nhân vật đầu tiên bằng AI** ở Bước 3 của wizard) không
viết chi tiết nhân vật ngay, mà chạy hai bước:

1. `generateCharacterOptions({ story, yTuong, bdsm, soLuong = 3 })` (`src/ai.js`) — AI đề xuất **3 hướng
   khác nhau**, mỗi hướng chỉ gồm `TÊN` / `VAI TRÒ` / `NÉT RIÊNG` (2 đến 3 câu). `docHuongNhanVat()` đọc
   khuôn `Ý 1:` … (bỏ markdown, gộp dòng xuống hàng, chịu được nhãn viết lệch như "NÉT RIÊN") và trả về
   mảng `{ so, ten, vaiTro, tomTat }`.
2. Người dùng bấm **Chọn hướng này** → `chonHuongNhanVat()` ghép hướng đã chọn vào `yTuong` rồi mới gọi
   `generateCharacter()` để viết hồ sơ chi tiết.

Hai lời gọi AI dùng chung `dauNhanVat(story, yTuong, { laDanChuyen, bdsm })`: khối ngữ cảnh (tên truyện,
bối cảnh, thể loại, nhân vật đã có, biên niên sử, yêu cầu, giao kèo) nằm ở **tiền tố**, chỉ phần `TASK:`
ở cuối khác nhau — nên vẫn tận dụng prefix cache. Trong nhánh BDSM, khối ngữ cảnh còn **liệt kê tên toàn bộ
sở thích** trong `SoThichBdsm()` để AI ghi đúng tên (chip trong editor mới tra ra id); `generateCharacter`
vẫn chuẩn hoá `VAI BDSM` / `KINH NGHIỆM` / `PHONG CÁCH` về đúng enum và tra `SỞ THÍCH` sang id.

Yêu cầu của người dùng lấy từ ô **“Bạn muốn nhân vật thế nào?”** (`data-f="nvYeuCau"`, mới thêm ở editor
nhân vật); để trống thì lấy ô Tên rồi tới Mô tả — nên vẫn tương thích với cách dùng cũ.

Giao diện dùng chung cho cả hai chỗ: `htmlHuongNhanVat(ds)` vẽ thẻ hướng vào `[data-nv-opts]`,
`sinhHuongNhanVat()` lo bước 1 (có chỉ báo `anhLoading()`), `chonHuongNhanVat()` lo bước 2
(`danhDauHuongDaChon()` khoá nút + đánh dấu thẻ đang chọn). Editor nhân vật truyền `onXong` là
`dienNhanVat(gen)`; wizard truyền `onXong` lưu `body.dataset.pendingCharacter`.

## Ảnh cảnh (generate hình theo hội thoại)

Tính năng **sinh ảnh từ chính mạch đối thoại đang diễn ra**: AI đọc ngữ cảnh hội thoại
(bối cảnh truyện, biên niên sử, nhân vật, các tin nhắn gần nhất) → viết **prompt tiếng
Anh** cho công cụ vẽ ảnh → người dùng duyệt/sửa → dựng khung hình → chèn thẳng **tin
nhắn ảnh** vào mạch truyện.

- **Dữ liệu**: `story.anh` là **mục lục nhẹ** (`{ id, prompt, chuThich, phongCach, kichThuoc, convId, luc }`,
  bỏ `dataUrl`, mới nhất đứng đầu); bản đầy đủ nằm ở kv folder `thuVienAnh` (key `anh.id`).
  Xoá một ảnh sẽ xoá cả hai nơi; xoá truyện thì xoá luôn các bản ghi ảnh của truyện đó.
- **Hai hàm AI** (`src/ai.js`): `vietPromptAnh({ story, conv, messages, tinNhan, ghiChu })`
  → `{ prompt, loaiTru, chuThich }` (đọc khối `MÔ TẢ ẢNH` / `LOẠI TRỪ` / `CHÚ THÍCH`),
  và `taoAnh({ prompt, loaiTru, kichThuoc, seed })` → `{ dataUrl, … }`.
- **Điểm vào**:
  - Nút **🎨 trên thanh chat** — dựng ảnh cho cả khung cảnh hiện tại (tin nhắn mới).
  - Nút **🎨 trên từng tin nhắn AI** — dựng ảnh cho đúng đoạn đó, chèn **ngay sau**
    tin nhắn nguồn (`openTaoAnh({ sauMsgId })`).
  - Trong lightbox/thư viện: **Dựng lại** (`anh-lai` → thay ảnh tại chỗ, xoá bản ghi cũ)
    và **Xoá** (`del-msg` → xoá cả tin nhắn + bản ghi kv + mục trong `story.anh`).
- **Phong cách & khung hình**: `PhongCachAnh()` (9 preset), `KichThuocAnh()` (4 cỡ),
  `AnhMacDinh()` (preset + cỡ mặc định, kèm loại-trừ luôn chặn nội dung trẻ em) —
  đều ở `main.pjs`. Lựa chọn gần nhất lưu trong `localStorage` (`anhPhongCach`,
  `anhKichThuoc`).
- **Xem ảnh**: tin nhắn `vai:"anh"` render khung ảnh + chú thích + nhãn phong cách +
  hàng nút (xem lớn / tải / dựng lại / xoá); bấm mở **lightbox** (`moXemAnh`).
- **Kích thước khung**: `anhHolder()` (`kichThuocWh()`) đặt `aspect-ratio` theo đúng
  tỉ lệ đã dựng (768×512 / 512×768 / 768×768 / 512×512) và thêm
  `max-width: min(100%, (62·w/h)vh)` cho khung trong mạch truyện — nhờ vậy ảnh dọc
  và ảnh vuông **không bị cắt** (`object-fit: cover` chỉ cắt khi tỉ lệ khung khác tỉ lệ
   ảnh) mà khung cũng không cao hơn ~62% màn hình. Ảnh thu nhỏ (`kind === "thumb"`)
  giữ tỉ lệ gốc, không cắt.
- **Thư viện ảnh** (`moThuVienAnh`, panel “Thư viện ảnh (N)” trên dashboard): lưới thẻ
  ảnh của cả truyện, mỗi thẻ có **Tới cảnh** (nhảy về đúng tin nhắn trong chat), tải, xoá.
- **Xuất/nhập**: ảnh đi kèm trong JSON xuất (`data.anh`). Luồng nhập nay đi qua
  `capIdMoi()` (bản sao) hoặc `ghiTruyenNhap()` (ghi đè) — xem mục **Nhập truyện (hai
  chế độ)** bên dưới. Bản sao cấp id ảnh mới và remap `anhId`/`convId`; ghi đè giữ
  nguyên id trong file. Cả hai đều đi qua `luuAnh()` nên thư viện ảnh luôn khớp.
  Ảnh của truyện này **không bao giờ** lẫn sang truyện khác: `capIdMoi()` chỉ lấy ảnh
  thuộc chỉ mục `story.anh` + `anhId` trong tin nhắn của chính truyện đó.

## Nhập truyện (hai chế độ)

Một file JSON của app có hai hình dạng, `docFileNhap()` đọc được cả hai:

- **một truyện** — `{ type:"truyen-vai", version, story, messages:{htId→[tin]}, anh:{anhId→bản ghi} }`;
- **cả thư viện** — `{ type:"truyen-vai-all", version, stories:[…], messages, anh }` (`f.toanBo = true`).

Hai lối vào cũ (`import-story` trong Tuỳ chọn truyện, `import-all` ở Cài đặt/thư viện) giờ
dùng **cùng một luồng**: `chonFileNhap()` → `docFileNhap()` → `openNhapTruyen()`.

`openNhapTruyen()` **chỉ hiện thông tin**, chưa ghi gì: số truyện/nhân vật/hội thoại/tin
nhắn/ảnh/cảnh đã khép/đính chính/hướng (`thongKeNhap()`), số truyện trùng ID, và hai thẻ
chế độ. Người dùng bấm **Nhập** thì mới ghi.

### Chế độ 1 — "Nhập thành bản sao" (`nhapBanSao` → `capIdMoi`)

Cấp **ID mới cho mọi thứ** rồi dịch lại toàn bộ tham chiếu chéo, nên bản nhập là một
truyện **hoàn toàn độc lập**:

| Nhóm | ID được cấp mới | Tham chiếu được dịch lại |
| --- | --- | --- |
| Truyện | `s.id` (`ct_…`) | — |
| Nhân vật | `nhanVats[].id` | `nhanVatIds`, `hienDien`, `canhRieng.nvId`, `kyUc.biet`, `quanHe.tu/den`, `nhanVat.nvId`, `dinhChinh.nvId/tu/den`, `huong.nvId/tu/den`, `msg.nvId/nvIds/rieng` |
| Chương | `chuongs[].id` | `hoiThoais[].chuongId` |
| Hội thoại | `hoiThoais[].id` (**khoá `kv.tinNhan`**) | `canhDaKhep.htId/htIds`, `anh.convId`, `tienDo.htId` |
| Tin nhắn | `tn_…` trong từng hội thoại | `canhDaKhep.tuMsgId/denMsgId`, `msg.anhId`, `msg.khep` |
| Cảnh đã khép | `canh_…` + `kyUc[].id` + `quanHe[].id` + `nhanVat[].id` | `dinhChinh.nguonCanh`, `tienDo.canhId` |
| Ảnh | `anh_…` (**khoá `kv.thuVienAnh`**) | `story.anh[].id`, `msg.anhId` |
| Khác | `bienNienSu[].id`, `lorebook.entries[].id`, `dinhChinh[].id`, `huong[].id`, `tienDo[].id` | — |

`TS.ID_NGUOI` (`"nguoi"`) **không bao giờ** bị đổi. Nhờ vậy hai truyện không bao giờ dùng
chung khoá `tinNhan`/`thuVienAnh`, và sửa/xoá một bản không đụng tới bản kia.

Hai chốt chống rò rỉ giữa các truyện trong **file sao lưu toàn thư viện**:

- **tin nhắn**: chỉ lấy cho những hội thoại *còn* trong truyện đang nhập;
- **ảnh**: chỉ lấy ảnh thuộc `story.anh` **của chính truyện đó** (cộng `anhId` trong tin
  nhắn của nó). Nếu lấy cả `anhMap` của file thì mỗi bản sao sẽ ôm trọn ảnh của mọi
  truyện khác và `convId` của chúng trỏ ra ngoài truyện (lỗi đã gặp và đã sửa).
  `convId` nào không thuộc truyện thì bị đặt về `""` thay vì giữ id lạ.

### Chế độ 2 — "Khôi phục ghi đè" (`nhapGhiDe`)

Giữ **đúng ID trong file**. Với mỗi truyện: nếu đã có bản cùng ID thì `deleteStory()`
(tin nhắn + ảnh cũ bị xoá theo, nên không còn dữ liệu mồ côi) rồi ghi bản trong file lên.
Tuỳ chọn **"Xoá những truyện không có trong file"** (chỉ hiện với file toàn thư viện) khôi
phục đúng nguyên trạng lúc sao lưu.

Trước khi ghi, `hoiXacNhan()` nói rõ: bao nhiêu truyện bị thay thế, bao nhiêu được thêm
mới, có xoá truyện ngoài file hay không, và — nếu có hội thoại trong file trùng ID với hội
thoại của một truyện **khác** (`demTrungHoiThoai()`) — cảnh báo rằng tin nhắn của truyện
kia sẽ bị thay bằng tin nhắn trong file.

### Giao dịch: một lần nhập = một khối, hỏng thì trả về nguyên trạng (`chayNhap`)

Cả hai chế độ đều phải **XOÁ dữ liệu cũ trước khi ghi** (ghi đè) và **xoá truyện ngoài
file** (xoá thừa), nên không thể chỉ dọn dẹp tại chỗ: bản cũ đã mất thì không còn gì để
khôi phục. Vì vậy cả lần nhập được bọc trong **một giao dịch**:

1. **`chuanBiNhap(f, cheDo, tuyChon)`** — chưa ghi gì. Nó dựng danh sách việc sẽ làm
   (`viec[]`: `capIdMoi()` cho bản sao, hoặc thân truyện + `messages` + `anh` cho ghi đè),
   danh sách truyện sẽ bị xoá thừa (`xoaIds[]`), rồi liệt kê **mọi khoá có thể bị đọc,
   ghi hoặc xoá**: khoá sắp ghi (`tapCot`/`tapTn`/`tapAnh`) **cộng** khoá của những truyện
   đang có mà sẽ bị thay thế/xoá (tin nhắn + ảnh của chúng cũng bị xoá theo). *Bỏ sót
   `tapCot` cho truyện mới là lỗi đã gặp: bản ghi của truyện ghi xong vẫn nằm lại sau khi
   khôi phục.*
2. **Chụp** — đọc thẳng **từ kv** (không qua bộ đệm) giá trị hiện tại của từng khoá đó
   thành `snap { cot, tn, anh }`. Nếu đọc không được thì **ném lỗi ngay, chưa ghi gì**.
3. **Ghi** — lần lượt từng truyện: `deleteStory()` bản cũ cùng ID (ghi đè) rồi
   `ghiTruyenNhap()` (thứ tự trong một truyện: **tin nhắn từng hội thoại → ảnh (`luuAnh`)
   → thân truyện sau cùng**); cuối cùng xoá những truyện trong `xoaIds`.
4. **`traLaiNhap(snap)`** khi có bất kỳ lỗi nào — kể cả lỗi ở bước xoá thừa cuối cùng:
   **xoá hết** các khoá đã chạm trước (để giải phóng chỗ — quan trọng khi lỗi là hết bộ
   nhớ), rồi **ghi lại** nguyên giá trị đã chụp (khoá nào trước đó không tồn tại thì để
   trống), xoá bộ đệm `messagesCache`/`anhCache` của các khoá đó và `loadStories()`.
   Hàm trả về **số bản ghi không khôi phục được**; nếu > 0, lỗi ném ra được bọc thêm câu
   “còn N bản ghi chưa khôi phục được” để người dùng biết phải nhập lại file sao lưu.

Nhờ vậy: **một lần nhập hỏng không bao giờ làm mất dữ liệu cũ**, dù lỗi xảy ra sau khi
bản cũ đã bị xoá, dù là lỗi tạm thời hay hết chỗ dai dẳng (bản ghi mới bị xoá trước khi
bản ghi cũ được ghi lại nên chỗ luôn đủ). Toast lỗi nói rõ “thư viện đã được trả về
nguyên trạng trước khi nhập”.

Thứ tự ghi trong một truyện và việc `ghiTruyenNhap()` tự đặt lại `story.anh` theo đúng
thứ tự trong file (vì `luuAnh()` chèn lên đầu) vẫn giữ nguyên như cũ; `don()` bên trong
`ghiTruyenNhap()` chỉ còn là lớp dọn dẹp phụ, giao dịch mới là thứ bảo đảm toàn vẹn.

### Kiểm thử đã chạy

- Dựng truyện test đầy đủ (2 nhân vật, 1 chương, 2 hội thoại, 5 tin nhắn, 1 ảnh, 1 cảnh
  đã khép có ký ức/quan hệ/nội tâm, 1 biên niên sử, 1 mục lorebook, 1 đính chính, 1 hướng
  có tiến độ) → xuất → **nhập cùng file hai lần** ở chế độ bản sao: 3 bản, mọi ID khác
  nhau, **0 lỗi tham chiếu** trên cả 4 nhóm kiểm tra (ID dùng chung, tham chiếu chéo,
  khoá `tinNhan`/`thuVienAnh` mồ côi, `tinhTrangThai()` giống nhau).
- **Cô lập**: thêm tin nhắn + ảnh vào bản B, xoá bản C ⇒ bản A **nguyên vẹn từng byte**
  (thân truyện, tin nhắn, ảnh), bản B chỉ đổi đúng phần đã sửa, dữ liệu của C bị xoá sạch.
- **Ghi đè**: nhập lại file một truyện ⇒ hộp xác nhận hiện đúng số liệu, số truyện không
  đổi, ID không đổi, tin nhắn khớp `chuanHoaTinNhan(file)` từng ký tự, ảnh còn nguyên.
- **Sao lưu toàn thư viện**: nhập ở chế độ ghi đè + tick "xoá thừa" ⇒ truyện tạo thêm bị
  xoá, 4 truyện trong file được khôi phục đúng, **0 lỗi tham chiếu**; nhập cùng file đó ở
  chế độ bản sao ⇒ 8 truyện, không ID nào dùng chung, mỗi bản chỉ giữ ảnh của mình.
- **Tiêm lỗi giữa chừng (giao dịch)**: bọc cả `root.kv` (kv-plugin trả folder MỚI mỗi lần
  truy cập nên phải thay cả `root.kv`, không thể vá `root.kv.tinNhan.set`) bằng một bản
  ghi có lỗi: (a) lỗi một lần ở đúng lượt ghi N, (b) **mô hình hết chỗ thật** — theo dõi
  dung lượng từng khoá, `budget = đang dùng + extra`, `set` vượt ngân sách thì ném lỗi,
  `delete` trả lại chỗ. Chụp nguyên thư viện (mọi khoá của `cotTruyen`/`tinNhan`/
  `thuVienAnh` dưới dạng chuỗi JSON) trước khi nhập rồi so **từng ký tự** sau khi nhập
  hỏng. Các ca đã chạy, tất cả đều **giống hệt từng byte**:
  - ghi đè một truyện, lỗi ở lượt ghi tin nhắn giữa chừng (sau khi bản cũ đã bị xoá);
  - ghi đè một truyện, lỗi ở lượt ghi cuối cùng (bản ghi truyện);
  - ghi đè một truyện khi **hết chỗ** (lỗi dai dẳng, không phải lỗi một lần);
  - **cả thư viện + xoá thừa**, lỗi ở chính bước xoá truyện thừa (sau khi cả 4 truyện đã
    bị xoá và ghi lại) ⇒ truyện thừa vẫn còn, mọi thứ nguyên vẹn;
  - **cả thư viện** khi hết chỗ vì phải thêm lại một truyện lớn (60 KB) mà đĩa chỉ còn
    ~3 KB chỗ trống ⇒ khôi phục hoàn hảo dù lỗi vẫn tiếp diễn lúc khôi phục;
  - **bản sao nhiều truyện**, lỗi ở lượt ghi thân truyện thứ 3 ⇒ không sót bản ghi rác.
  - Sau khi khôi phục: mọi truyện còn lại đều hiện đúng trên thư viện, không có khoá
    `tinNhan`/`thuVienAnh` mồ côi.
- Hộp thoại ở 390px và 1280px: hai thẻ chế độ xếp dọc, không tràn/đè chữ; ô "xoá thừa"
  **chỉ** hiện với file toàn thư viện.

## Thời gian vắng mặt & tương tác chủ động (đợt "thời gian vắng mặt v1")

Khi được bật theo từng truyện, thế giới có thể **tiến thêm một nhịp** trong lúc người dùng
rời app: nhân vật có lý do có thể chủ động liên lạc hoặc để lại dấu hiệu, và các nhân vật
AI có thể có diễn biến **ngoài màn hình** với nhau.

### Ràng buộc nền tảng (đọc trước khi sửa)

Perchance **không chạy khi tab đã đóng**. Không có gì chạy nền, không có thông báo đẩy,
không có backend. Vì vậy mọi "thời gian đã trôi" chỉ được **tính ra lúc người dùng quay
lại**, bằng cách so mốc hoạt động đã lưu với hiện tại. Ghi chú này cũng hiện trong UI.

### Ba chế độ (theo từng truyện, trong Tuỳ chọn truyện)

| Chế độ | Hành vi |
| --- | --- |
| **Tạm dừng** (mặc định) | Không gọi AI, không mô phỏng, không sổ mới, không tin chủ động. |
| **Theo cảnh** | Chỉ chạy khi cảnh cuối đã Khép cảnh: tối đa **MỘT** nhịp chuyển tiếp, dù rời 1 giờ hay 3 ngày. Không ánh xạ thời gian thật vào tuổi/lịch/thời lượng. |
| **Theo thời gian thật** | Khoảng vắng mặt thật là **gợi ý** cho thời gian truyện; vẫn tối đa 3 sự kiện, ưu tiên ý nghĩa hơn số lượng. |

Kèm `ngưỡngPhút` (mặc định **30**, chọn được 15…1440 hoặc **Tắt**) và công tắc **tương tác
chủ động**. Giới hạn **3 sự kiện** là cho **cả truyện mỗi lần quay lại**, không phải mỗi
nhân vật hay mỗi hội thoại.

### Ba tầng chặn (một nguồn sự thật: `xetDieuKien()` trong `src/thoiGian.js`)

1. chế độ **Tạm dừng**, hoặc ngưỡng = 0 → không làm gì;
2. chưa đủ ngưỡng phút → không làm gì;
3. **còn cảnh đang mở** ở *bất kỳ* hội thoại nào → không mô phỏng, chỉ hiện thẻ
   **Nhịp trước đó**.

"Cảnh đang mở" (`canhDangMo()`) = còn tin nhắn **sau cảnh đã khép gần nhất** của hội thoại
đó, hoặc đang mở một `canhRieng`. Điều kiện này xét **cả truyện** (đọc tin nhắn của mọi hội
thoại qua `taiTinNhanTatCa()`), không chỉ hội thoại đang mở — nếu không, thời gian có thể
trôi vượt qua một mạch cảm xúc dang dở ở tuyến khác. Không bao giờ tự Khép cảnh để cho thời
gian trôi.

### Dữ liệu

`story.thoiGian = { cheDo, nguongPhut, chuDong, hoatDongLuc, daXuLyLuc, phien }`

- `hoatDongLuc` — mốc người dùng **rời/hoạt động** gần nhất. Ghi bằng `visibilitychange`
  (khi tab bị ẩn → ghi ngay) và `pagehide`; khi người dùng thật sự tương tác thì cập nhật
  trong RAM và chỉ **ghi xuống kv tối đa một lần mỗi phút** (`ghiMocHoatDong`). Không ghi
  sau mỗi lần render.
- `daXuLyLuc` — mốc kết thúc của khoảng vắng mặt **đã xử lý** gần nhất. Chỉ được ghi **sau
  khi** toàn bộ kết quả đã lưu thành công, hoặc khi người dùng bấm **Bỏ qua lần này**.
- `phien` — phiên gần nhất: `{ id, batDau, ketThuc, phut, cheDo, trangThai, soSuKien, luc, loiNhan }`
  với `trangThai ∈ dangXuLy | xong | thuLai | boQua`.

`story.ngoaiManHinh = [ … ]` — sổ **chỉ-nối-thêm** (append-only) các sự kiện vắng mặt:

```
{ id, luc, loai: lienLac | dauHieu | ngoaiManHinh, hinhThuc, noiDung,
  thamGia:[nvId], biet:[nvId|"nguoi"], muc: an | heLo | daLo, phatHien,
  htId, tnIds:[tnId], anhHuong:{ quanHe:[…], noiTam:[…] }, phienId,
  phutVangMat, cheDoVangMat, suaLuc }
```

Tin nhắn nhìn thấy được mang thêm `vangMat` (id sự kiện) + `vangMatPhien` (id phiên) để
`renderChat` chèn divider **một lần cho mỗi lần vắng mặt**. Hội thoại của một **nhánh** mang
`vgMocLuc` = thời điểm điểm rẽ (xem mục Nhánh bên dưới).

`PHIEN_BAN_TRUYEN = 6` (tăng ở đợt này; `chuanHoaTruyen()` đi qua `chuanHoaThoiGian()` +
`suKienCua()` nên bản lưu/tệp nhập cũ tự được bù mặc định — mặc định là **Tạm dừng**).

### Một lần gọi AI cho 0–3 sự kiện

`AI.lapKeHoachVangMat()` (một lượt `streamText` duy nhất) → `AI.docKeHoachVangMat()` parse
thành dữ liệu có cấu trúc, chịu lỗi hoàn toàn (thiếu trường thì bỏ sự kiện đó; `SU KIEN:
KHONG CO` ⇒ 0 sự kiện). **AI được phép trả về 0** và app không bao giờ chọn đại một nhân
vật cho có nội dung. Thời điểm mô phỏng (`luc`) được kẹp vào **bên trong** khoảng vắng mặt;
số sự kiện bị cắt theo `soToiDa` của chế độ.

Prompt nói rõ: ưu tiên nhân vật có việc chưa giải quyết/lời hứa/lo lắng/hướng Đạo diễn
(không ưu tiên chỉ vì lâu chưa nói); một liên lạc nhìn thấy **chỉ** được đặt vào hội thoại
đang có chứa nhân vật đó (**không tạo hội thoại mới trong v1**); không có hội thoại hợp lệ
thì đừng ép sinh tin nhắn; **hình thức phải hợp thế giới** (hiện đại: tin nhắn/missed
call/email/ghi âm — cổ trang/fantasy: thư, người đưa tin, vật đánh dấu, dấu vết, hoặc tình
huống khi trở lại; **không phát minh công nghệ/phép thuật**); không giải quyết hộ cao trào,
bí ẩn chính, xung đột lớn hay hướng của người chơi; không coi việc người dùng không mở app
là hành động canon của nhân vật người chơi. Khi công tắc chủ động **tắt**, chỉ còn sự kiện
`ngoaiManHinh` (app lọc lại lần nữa sau khi parse).

### Sự kiện ẩn đi vào prompt / trạng thái / Đạo diễn như thế nào

- **Prompt** — `buildNgoaiManHinh()` chỉ đưa vào ngữ cảnh những sự kiện mà **nhân vật đang
  trong cảnh thật sự biết** (`suKienBiet`), gắn nhãn `[S1]`, `[S2]`… qua `suKienTheoMaNgan`,
  kèm "Biết chuyện"/"Mức hé lộ" và lệnh cấm nhân vật khác biết tới. **Không bơm cả sổ vào
  mọi lượt.**
- **Trạng thái** — `tinhTrangThai()` (src/trangThai.js) gộp sự kiện vắng mặt theo **đúng thứ
  tự thời gian**, sau vòng lặp cảnh đã khép nhưng **trước** lớp phủ đính chính Đạo diễn. Nó
  **bỏ mọi tác động chạm tới `ID_NGUOI`**: quan hệ người chơi–AI chỉ đổi khi người chơi
  duyệt ở Khép cảnh, nên việc người dùng bận ngoài đời **không bao giờ** bị trừ điểm quan
  hệ.
- **Đạo diễn** — mục **Ngoài màn hình** (`vgNgoaiManHinhHtml`) liệt kê toàn bộ sổ (thời
  gian, loại, hình thức, người trong cuộc, ai biết, cách phát hiện, tác động nhỏ) và cho
  đổi **mức hé lộ**; `suKienCua()` ép lại quy tắc "đã lộ ⇔ người chơi có trong danh sách
  biết". Sổ chỉ-nối-thêm nên **không có nút xoá**.
- **Hé lộ tự nhiên** — khi có sự kiện đang ẩn mà người trong cảnh biết, `dongHeLo()` yêu cầu
  model ghi **đúng một dòng** `<<HELO: S1>>` nếu chuyện đó thật sự được kể/lộ ra. App đọc
  bằng `docHeLo()` (thuần, tất định), cắt tín hiệu khỏi phần hiển thị (`catDieuKhien`), rồi
  `apDungHeLo(story, raw, nguon)` **ghi lại nguồn** của lần hé lộ (xem mục dưới) — lần thứ
  hai (model lặp lại dấu hiệu) thấy `daLo` là bỏ qua, nên mỗi sự kiện chỉ lộ **một lần**.
  **Không toast** — hé lộ phải xảy ra bằng lời kể/bằng chứng trong cảnh, thông báo sẽ làm lộ
  bí mật cho người chơi.

### Sổ hé lộ: nguồn của mỗi lần lộ (đợt "hé lộ có nguồn v1")

Mức "đã lộ" **không** được ghi thẳng như một sự thật độc lập, vì như vậy khi tin nhắn chứa nó
biến mất (xoá tin, cắt lịch sử, tạo nhánh bỏ lại phía sau, xoá cả hội thoại, nhập lại file)
thì trạng thái "ai biết gì" sẽ sai mà không có gì để tính lại. Thay vào đó mỗi sự kiện giữ
**hai lớp**:

- `mucGoc` — mức **gốc**: do kế hoạch AI đặt (`newSuKien`) hoặc do bạn chỉnh tay trong Đạo
  diễn. Không phụ thuộc vào văn bản.
- `heLo: [{ htId, tnId, nvId, luc }]` — **sổ hé lộ**: mỗi lần sự kiện được kể/lộ ra trong
  một tin nhắn, lưu lại **nguồn**: hội thoại nào, tin nhắn nào, ai kể, lúc nào. Dấu hiệu
  `<<HELO: S1>>` đã bị cắt khỏi nội dung, nên chính tin nhắn nguồn là bằng chứng duy nhất.

Mức hiệu lực và danh sách "ai biết" được **suy ra** (`chuanHoaSuKien`) và **tính lại**
(`tinhLaiBiet(story, msgsByHt)`) từ hai lớp đó: còn ít nhất một lần hé lộ ⇒ `daLo` + `"nguoi"`
trong `biet`; hết ⇒ quay về đúng `mucGoc`. Một lần hé lộ còn hiệu lực khi tin nhắn nguồn còn
tồn tại; hội thoại **chưa nạp** (`msgsByHt` không có khoá) được coi là còn nguyên — thiếu dữ
liệu không phải là mất. Nhánh và nhập truyện dịch lại `htId`/`tnId`/`nvId`, đồng thời **bỏ**
những lần hé lộ mà tin nhắn nguồn không được mang sang.

Các điểm gọi `tinhLaiBiet()` (đều ngay trước khi lưu truyện): xoá tin nhắn (`del-msg`), cắt
lịch sử (`catVaLuuLai`), viết lại tin nhắn cuối (`vietLaiTinCuoi` — tin nhắn mới có id khác),
xoá hội thoại (`xoaHoiThoai`), tạo nhánh (`taoNhanhVaLuuLai`), nhập truyện (`capIdMoi` +
`chuanBiNhap`), và ngay trong `apDungHeLo`. Chỉnh mức bằng tay trong Đạo diễn là **chốt mức**:
ghi vào `mucGoc` rồi xoá sổ hé lộ của sự kiện đó, nếu không lựa chọn vừa bấm sẽ bị tính lại
thành "đã lộ" ngay sau đó.

### Hiển thị

- Divider nhẹ **"Trong lúc bạn vắng mặt"** trước nhóm tin đầu tiên của mỗi phiên (gộp theo
  `vangMatPhien`), **không lặp** cho từng tin liên tiếp; chỉ ghi thêm thời lượng ở chế độ
  **Theo thời gian thật**.
- Bong bóng giữ nguyên schema (avatar/tên/`nvIds`) và mang metadata liên kết tới sự kiện;
  dùng đúng timestamp mô phỏng trong quá khứ, **không stream lại** như đang xảy ra lúc mở app.
- Thẻ **Nhịp trước đó** (`nhipTruocDo()` — dựng từ `tinhTrangThai()` + tin nhắn gần nhất,
  **không gọi AI**) hiện phía trên phần hội thoại khi khoảng vắng mặt đã đủ ngưỡng: vị
  trí/tình huống gần nhất, cảm xúc còn đọng, điều đang chờ, ai đang hiện diện, móc cảnh.
  Thẻ **thu gọn mặc định**, có nút đóng, không chèn vào message và không được gửi lại cho
  AI. Nếu mạch dang dở nằm ở hội thoại khác, thẻ có nút **mở hội thoại đó**.
- Khi đang xử lý: một dòng trạng thái nhẹ *"Đang xem điều gì đã xảy ra…"* — **không khoá
  app**. Khi lỗi: một dòng thông báo ngắn + **Thử lại** / **Bỏ qua lần này**; **không chèn
  bong bóng lỗi vào truyện**. Khi thành công với 0 sự kiện: không hiện gì.
- **Không có inbox riêng.** Tương tác nhìn thấy được nằm ngay trong hội thoại phù hợp.

### Chống trùng & tính nguyên tử

- Phiên được ghi trạng thái **`dangXuLy` TRƯỚC** khi gọi AI (tab đóng giữa lúc gọi ⇒ lần mở
  sau biết là có phiên bỏ dở và **thử lại**, không mô phỏng lại từ đầu).
- Thử lại **dùng lại đúng phiên cũ** khi vẫn cùng `batDau`; và trước khi gọi AI, app kiểm tra
  sổ đã có sự kiện nào của chính phiên đó chưa — nếu có thì chỉ hoàn tất trạng thái
  (**chốt chặn cuối**, phòng trường hợp ghi xong nhưng chưa kịp lưu trạng thái).
- Mốc `hoatDongLuc`/`daXuLyLuc` chỉ được ghi **sau khi lưu thành công**; khi thử lại một
  phiên cũ chưa ghi gì thì bỏ qua mốc `daXuLyLuc`, còn ở đường thường thì **tôn trọng** mốc
  đó — nhờ vậy reload nhiều lần trong cùng một khoảng vắng mặt không sinh trùng.
- `luuPhienVangMat()` là **một giao dịch**: chụp trước sổ + `thoiGian` + `suaLuc` + tin nhắn
  của **mọi** hội thoại sẽ đụng tới; hỏng ở bất kỳ bước nào (kể cả lỗi quota khi lưu cốt
  truyện) thì **trả tất cả về nguyên trạng** và giữ phiên ở `thuLai`.
- `Bỏ qua lần này` **không** đụng quan hệ, sổ hay tin nhắn: chỉ đánh dấu phiên `boQua` và đẩy
  mốc lên để không hỏi lại.

### Nhập truyện & nhánh

- **Nhập** — `capIdMoi()` cấp ID mới cho `ngoaiManHinh[].id`, `phien.id` và remap
  `htId`, `thamGia[]`, `biet[]`, `tnIds[]`, `phienId`, `anhHuong.quanHe[].tu/den`,
  `anhHuong.noiTam[].nvId`, cùng `msg.vangMat` / `msg.vangMatPhien`.
- Sau **cả** nhập bản sao **lẫn** khôi phục ghi đè, `datLaiMocNhap()` đặt `hoatDongLuc =
  daXuLyLuc = hiện tại` và `phien = null`: nếu không, app sẽ tưởng người dùng vừa vắng mặt
  suốt khoảng thời gian kể từ lúc tệp sao lưu được tạo.
- **Nhánh** — hội thoại nhánh mang `vgMocLuc` = thời điểm điểm rẽ (chỉ số tin nhắn cuối cùng
  được sao chép). Sự kiện gắn với hội thoại này chỉ được mang theo nếu **nằm trọn trước điểm
  rẽ** (`tnIds` đều được sao chép, hoặc `luc <= vgMocLuc` khi không có tin nhắn); bản sao
  được **cấp ID mới** và trỏ về hội thoại nhánh. Sự kiện **không** gắn hội thoại nào mà xảy
  ra **sau** điểm rẽ bị `tinhTrangThai()` loại khỏi nhánh (chúng vẫn nằm trong sổ của truyện
  và Đạo diễn vẫn xem được).
- **Cố ý chưa làm**: sổ ngoài màn hình là **của cả truyện**, không phải của từng nhánh — nhánh
  chỉ *lọc* theo `vgMocLuc`, không có bản sao sổ riêng (sổ hé lộ thì đi theo TIN NHẮN, nên nó
  tự đúng cho mọi nhánh — xem mục **Sổ hé lộ**). Không có mô phỏng khi tab **vẫn mở** mà
  người dùng chỉ rời màn hình (không có
  timer nền — đúng tinh thần "chỉ tính khi quay lại").

### Kiểm thử đã chạy (preview thật, AI giả qua `root.aiTextPlugin`)

`window.__tv_vg` (chỉ để kiểm thử) phơi `app`, `ghiNhanVangMat`, `kiemTraVangMat`,
`thuLaiVangMat`, `boQuaVangMat`, `taiTinNhanTatCa` và `gapVangMat(story, phút)` để giả lập
"vừa vắng mặt" mà không phải chờ thật.

| # | Ca | Kết quả |
| --- | --- | --- |
| 1 | Tạm dừng + vắng 24 giờ | 0 lời gọi AI, 0 sự kiện/tin nhắn/phiên; mốc vẫn được cập nhật |
| 2 | Dưới ngưỡng 30 phút (và ngưỡng = 0) | không gọi AI, không ghi gì |
| 3 | Rời giữa cảnh chưa khép + 24 giờ | 0 sự kiện; thẻ **Nhịp trước đó** hiện đúng mạch dang dở |
| 4 | Theo cảnh + 3 ngày | tối đa **1** sự kiện (AI trả 3 → cắt còn 1) |
| 5 | Theo thời gian thật + 3 giờ | 3 sự kiện, mọi `luc` nằm trong khoảng vắng mặt, divider ghi "· 3 giờ" |
| 6 | Gọi lại/lap lại nhiều lần cùng phiên | không sinh trùng (sổ, tin nhắn, số lời gọi AI giữ nguyên); reload thật cũng vậy |
| 7 | AI trả `SU KIEN: KHONG CO` / trả rỗng | 0 sự kiện, phiên `xong`, không cảnh báo |
| 8 | Bối cảnh cổ trang/fantasy | prompt có luật "dùng thư/dấu vết", cấm phát minh công nghệ; sự kiện `thư` hiện thành bong bóng bình thường |
| 9 | Nhân vật vắng khỏi `hienDien` vẫn liên lạc từ xa | `hienDien` **không** đổi, bong bóng vẫn có `nvIds` |
| 10 | Sự kiện AI–AI ẩn | chỉ vào prompt của người biết (kiểm tra bằng `buildContext`); hé lộ đúng **một lần**, marker bị cắt khỏi bong bóng, không toast |
| 11 | Tác động `nguoi -> Aria` trong sự kiện | bị loại bỏ hoàn toàn; quan hệ AI–AI vẫn nhích nhẹ |
| 12 | Lỗi AI / lỗi lưu cốt truyện / lỗi lưu một trong hai hội thoại | không có dữ liệu nửa chừng (tin nhắn trả về đúng số cũ), phiên `thuLai`, dòng lỗi + Thử lại/Bỏ qua, thử lại thành công và **không** sinh trùng |
| 13 | Nhập bản sao + khôi phục ghi đè | ID sự kiện/phiên/`htId`/`tnIds`/`vangMat` được remap hết; `phien = null`; mốc hoạt động về hiện tại (không mô phỏng khoảng thời gian từ lúc tạo backup) |
| 14 | Tạo nhánh trước một sự kiện vắng mặt | sự kiện trước điểm rẽ được mang theo (ID mới, `htId` trỏ nhánh); sự kiện sau điểm rẽ bị loại khỏi trạng thái nhánh; bản gốc giữ nguyên |
| 15 | 390px và 1280px (ảnh chụp + đo `getBoundingClientRect`) | không tràn ngang, composer vẫn trong màn hình, divider/thẻ/dòng lỗi không chồng lên nhau |
| 17 | Sổ hé lộ — logic thuần | nguồn còn tin nhắn ⇒ `daLo` + `"nguoi"` trong `biet`; mất tin nhắn ⇒ về đúng `mucGoc`; nguồn ở hội thoại chưa nạp vẫn tính; mức gốc `heLo`/`daLo` giữ nguyên; nguồn rác bị lọc; gọi lại không sửa gì |
| 18 | Sổ hé lộ — giao diện (AI giả) | ghi nguồn `{htId, tnId, nvId}` + lưu kv; lộ lần hai không thêm nguồn; **xoá tin nhắn nguồn ⇒ về `an` và lưu lại**; hé lộ lại ⇒ nguồn mới; **nhánh** bỏ nguồn nằm sau điểm rẽ (bản gốc giữ nguyên); **viết lại tin nhắn cuối** ⇒ nguồn chết, về `mucGoc`; Đạo diễn chỉnh mức ⇒ chốt `mucGoc` + xoá sổ |
| 19 | Sổ hé lộ — nhập bản sao | `htId`/`tnId`/`nvId` được dịch sang ID mới (sự kiện vẫn `daLo`); nguồn trỏ tin nhắn không có trong file bị bỏ ⇒ về `an` |
| 20 | **AI thật** — vắng ngắn & yên ắng | model trả `SU KIEN: KHONG CO` → 0 sự kiện, 0 tin nhắn, phiên `xong`, không thông báo |
| 21 | **AI thật** — bối cảnh có lý do liên lạc | model trả 1 sự kiện `liên lạc` hợp cảnh (Linh ốm nhắn cho Khang) → `lienLac` gắn đúng hội thoại, `phutVangMat = 300`, tin nhắn mang `vangMat`, divider "· 5 giờ" |
| 22 | **AI thật** — sự kiện ẩn được hé lộ | lượt đầu model không lộ (không ghi dấu hiệu, app không ghi gì); lượt sau có `<<HELO: S1>>` → nguồn được ghi + lưu; lượt kế tiếp prompt không còn yêu cầu hé lộ và **không** thêm nguồn nào (đúng một lần) |

### Kiểm thử với AI THẬT (ba ca, preview thật)

Ba ca dưới đây chạy bằng plugin AI **thật** (không giả lập), có ghi lại nguyên văn phản hồi của
model để đối chiếu:

- **A — không có sự kiện.** Căn hộ Đà Nẵng, 3 giờ sáng, cả hai đang ngủ, vắng 35 phút. Model trả
  đúng `SU KIEN: KHONG CO` ⇒ 0 lời gọi thừa, 0 sự kiện, 0 tin nhắn, phiên `xong`, mốc đã xử lý
  nhích tới, không divider cũng không dòng trạng thái.
- **B — liên lạc phù hợp bối cảnh.** Khang đi làm 8h–13h, Linh ốm ở nhà, vắng 5 tiếng. Model trả
  một sự kiện `liên lạc nhìn thấy` trong hội thoại đang có: *"Em uống thuốc rồi, giờ nằm nghỉ tí.
  Anh làm việc vui vẻ nhé!"* ⇒ app tạo sự kiện `lienLac` (`phutVangMat = 300`, `luc` nằm trong
  khoảng vắng mặt), ghi tin nhắn mới kèm `vangMat`/`vangMatPhien` và render divider *"Trong lúc
  bạn vắng mặt · 5 giờ"*.
- **C — sự kiện ẩn được hé lộ đúng một lần.** Sự kiện ẩn: Linh lén bán xe máy của Khang. Lượt
  đầu model để Linh chối (không có dấu hiệu ⇒ app không ghi gì). Lượt sau model ghi `<<HELO: S1>>`
  ⇒ sổ hé lộ có `{ htId, tnId, nvId }` đúng tin nhắn vừa sinh, `mucGoc` vẫn `an`, `muc` thành
  `daLo`, `biet` có `"nguoi"`, dấu hiệu bị cắt khỏi bong bóng và trạng thái được lưu xuống kv.
  Lượt kế tiếp prompt **không còn** yêu cầu hé lộ (sự kiện đã `daLo`), model không ghi dấu hiệu, và
  số nguồn vẫn đúng **1**.

Ba bộ kiểm thử tự động cho sổ hé lộ (dựng trong phiên làm việc rồi bỏ, không thuộc generator):
**11 ca logic** trên `src/thoiGian.js`/`src/store.js`, **22 ca giao diện** (ghi nguồn → xoá tin
nhắn → hé lộ lại → tạo nhánh → viết lại tin cuối → Đạo diễn chỉnh mức, đều kiểm tra cả bộ nhớ lẫn
kv), **9 ca cắt lịch sử / xoá hội thoại**, và **6 ca nhập bản sao** (dịch ID nguồn + bỏ nguồn mất
tin nhắn).
| 16 | Regression | gửi lượt nhóm = **một** bong bóng + cập nhật hiện diện, Đạo diễn (có mục Ngoài màn hình), Khép cảnh, Tuỳ chọn truyện (đọc/ghi được chế độ–ngưỡng–công tắc), nhánh, xuất/nhập đều chạy |

## Kế hoạch chỉnh sửa 7 giai đoạn — GIAI ĐOẠN 1 đã xong (tháng 9/2026)

Chủ dự án ra một kế hoạch 7 giai đoạn (`truyen-vai-ke-hoach-sua.md`) và **ghi đè** luật "làm
luôn": mỗi giai đoạn phải DỪNG lại để duyệt. Giai đoạn 1 — *an toàn nhân vật vị thành niên* —
đã hoàn thành. Ghi lại để lần sau không sửa lại:

**Lỗi gốc (đã sửa).** `ai.js → hoSoNhanVat()` gắn nhãn tuổi bằng biểu thức
`c.nguoiLon === false ? … : " — người trưởng thành"` ⇒ nhân vật có tuổi mà **chưa** đặt cờ
`nguoiLon` (undefined) — kể cả tuổi 16 — đều bị gửi cho AI với nhãn "người trưởng thành".
Nay nhãn đi qua **`laNguoiLon(c)`** (nguồn sự thật duy nhất); tuổi không xác định KHÔNG được
coi là người lớn.

**Cổng dùng chung (`src/store.js`).**
- `laCheDoNguoiLon(story)` — truyện "ở chế độ người lớn" ⟺ `story.giaoKeo.bat` (đó là dấu hiệu
  duy nhất được lưu; cờ `bdsm` của thể loại chỉ dùng lúc tạo).
- `chanNoiDungNguoiLon(story)` — trả lý do (rỗng = cho phép). Từng nhân vật phải thoả
  `laNguoiLon()`; tuổi số dưới 18 khoá cứng (thông điệp "dưới 18" cũ được giữ qua
  `chanGiaoKeo`, nay là **trường hợp hẹp** của cổng này nên hành vi cũ không đổi).
- `xacNhanMoiNguoiLon(story)` — **nơi DUY NHẤT** được ghi cờ hàng loạt: gọi ngay sau khi người
  dùng xác nhận 18+ tường minh cho cả truyện, ghi `nguoiLon = true` cho mọi nhân vật **trừ**
  nhân vật ghi tuổi số dưới 18. Nhờ vậy cờ cấp nhân vật phản ánh đúng lời xác nhận (không suy
  diễn từ dữ liệu thiếu).

**Mọi đường vào đều qua cổng** (kiểm kê): `createStory`, `saveStory` (đường ghi duy nhất),
`chuanHoaTruyen` (file nhập — cờ trong file KHÔNG thay được lời xác nhận của lần nhập),
`luuTruyen` (mọi lần ghi từ giao diện), nút "Bật giao kèo" trong editor nhân vật, hộp Giao kèo
ở Tuỳ chọn truyện, Tạo nhanh (draft + tạo), wizard Tạo cốt truyện. Các điểm xác nhận 18+ đều
gọi `xacNhanMoiNguoiLon` trước khi mở cổng.

**Prompt văn bản.** `buildGiaoKeo` thêm **dòng luật cố định số 15 — TUỔI** ở CUỐI khối (phần
prefix ổn định, không phá prefix-cache): nhân vật chưa được xác nhận trưởng thành tuyệt đối
không tham gia nội dung tình dục. Nội dung cố định, không nêu tên ai, nên không đổi theo trạng
thái nhân vật.

**Máy vẽ ảnh.** `vietPromptAnh` nhận thêm `anToan`; khi bật thì **bỏ** khối BDSM và thêm luật
"KHUNG HÌNH AN TOÀN" (phi tình dục). `app.js → openTaoAnh` có `nvChuaXacNhan()` (đọc trạng thái
sống): truyện ở chế độ người lớn mà trong cảnh có nhân vật chưa xác nhận ⇒ "Viết lại" chạy ở
chế độ an toàn, "Dựng khung hình" nối thêm prompt loại trừ (`nudity, nude, bare chest, sexual
content, bondage, suggestive pose`) và hiện toast giải thích lý do.

**Kiểm thử Giai đoạn 1:** `scratch/tests/gd1-tuoi.js` — **51 ca, 0 lỗi** (nhãn tuổi trong prompt
khớp `laNguoiLon()` cho 6 tổ hợp tuổi × cờ; cổng chặn ở mọi đường; ghi cờ hàng loạt; khung hình
an toàn ở cả tầng `ai.js` lẫn giao diện). Hồi quy: **669 ca / 22 bộ, 0 lỗi** (bộ chạy
`runner.js`, chạy trong MỘT lần tải trang, gác dữ liệu thật byte-for-byte). Truyện thật của chủ
dự án (giao kèo đang bật, nhân vật 45 tuổi đã xác nhận) **không đổi một byte**.

**Bộ kiểm thử (Giai đoạn 2).** Bộ kiểm thử **không** nằm trong `src/` — luật của kế hoạch:
`src/` là công khai và tính quota. Nó là một repo riêng, đóng gói trong phiên ở `scratch/repo/`:
`package.json`, `tests/lib`, `tests/node`, `tests/browser`, `tests/fixtures`, `tests/README.md`,
`src/` (bản sao byte-for-byte) và workflow CI `.github/workflows/test.yml`.

**NGUỒN SỰ THẬT: repo GitHub `https://github.com/hellodalathostel/Truyen-vai`.** Tải repo là
cách chính để lấy mã nguồn + bộ kiểm thử; CI của repo phải xanh thì một giai đoạn mới coi là xong.

**Gói phát hành (bản dự phòng tiện tay — giải nén là chạy được):** mới nhất là gói **Đợt 6c**
`https://user.uploads.dev/file/5b6804aec274c1a3c22f9df24be6af39.zip` (Đợt 6b:
`https://user.uploads.dev/file/1da7f265676235f0bec0b2f49915d55a.zip` — mốc tách
`openCharacterEditor` + `openNewStoryModal`; Giai đoạn 6:
`https://user.uploads.dev/file/c5eb29483e0383f59ced780c56a74d2a.zip` — mốc tách `openTaoAnh`;
Giai đoạn 5: `https://user.uploads.dev/file/6d32cb23b2b5d3fdb6c28bea8b310f16.zip`; Giai đoạn 4:
`https://user.uploads.dev/file/29c20b8b44adbddd616bca6b2fbef024.zip`).

*Lưu ý quy trình:* gói zip **không thể** chứa URL của chính nó, nên `src/README.md` **bên trong
gói** vẫn trỏ tới **Đợt 6c**; dòng vừa cập nhật ở trên chỉ có ở workspace (và ở repo sau khi
chủ dự án đẩy lên).

- Tầng Node: `npm test` (không cần trình duyệt, không tốn quota, chạy trên CI).
- Tầng trình duyệt: mở generator rồi nạp `tests/browser/runner.js` và gọi `chayTatCa()`.

**HAI GÓI ĐÓNG TRƯỚC: CHỈ GỠ KHỎI TÀI LIỆU, CHƯA XOÁ ĐƯỢC TRÊN MÁY CHỦ — RỦI RO ĐÃ CHẤP NHẬN.**
`65ec79c7…` và `6cfd2611…` đã bị **gỡ mọi tham chiếu** trong gói, nhưng **không** được xoá khỏi
uploads.dev: bộ upload bất biến chỉ trả `deletionUrl` một lần lúc tải lên, và hai lần đó không giữ
lại `deletionUrl`, cũng không có API xoá nào khác. Ta cũng không còn URL đầy đủ (chỉ còn 8 ký tự
đầu) nên **không thể kiểm chứng chúng còn sống hay không**. Cả hai chứa **id/tên thật** bên trong
`src/README.md` của chúng. Rủi ro được chấp nhận vì: URL là 32 ký tự hex (không đoán được), chưa
từng công bố ở đâu ngoài cửa sổ chat với chủ dự án, và dữ liệu lộ chỉ là **id truyện/hội thoại +
tên nhân vật/hồ sơ** — không có nội dung truyện, không có ảnh, không có bản chụp kv. Nếu chủ dự án
còn giữ tin nhắn gốc có URL đầy đủ + liên kết xoá thì nên xoá; nếu không, coi như đã chấp nhận.

**Bộ kiểm thử không nằm trong `src/`.** Luật của kế hoạch: `src/` là công khai và tính quota. Bộ
kiểm thử là một repo riêng, đóng gói trong phiên ở `scratch/repo/`:

(Bản `src/README.md` **bên trong** gói là bản ngay trước lần đóng gói đó, nên dòng URL trong đó có
thể lùi vài nhịp so với dòng ở trên; nội dung còn lại giống hệt.)

**RÒ RỈ DỮ LIỆU — đã kiểm tra và đã sửa (tháng 9/2026).** Gói upload đầu tiên
(`65ec79c7…`, **đã thu hồi, không dùng nữa**) có **7 file nhắc tới dữ liệu truyện thật**: id truyện
thật và id hội thoại thật làm "điểm neo chỉ-đọc" trong `audit-base.js`, `nh-io.js`, `nh-lib.js`,
`nh-fix5.js`, `nh-anh-en.js`, `gd1-tuoi.js`, cộng tên nhân vật/hồ sơ thật dùng làm tên fixture
trong `nh-anh-en.js`, `nh-nguoichoi.js`. **Không** file nào chứa nội dung truyện thật (không có
`nh-real-*.json`, `nh-restore.json`, ảnh base64, hay bản chụp kv) — nhưng id/tên thật vẫn là dữ
liệu thật nên đã bị loại bỏ.

**LUẬT MỚI (áp dụng cho MỌI giai đoạn):** dữ liệu thật **chỉ** được chụp/so **trong bộ nhớ lúc
chạy test**; **không bao giờ** ghi thành file (kể cả file kết quả tạm) hay đóng gói/upload.
Cách làm hiện tại: mọi bộ tự **dò** truyện thật lúc chạy —
`(await root.kv.cotTruyen.entries())` rồi lọc bỏ truyện test (`/^ct_zz/` hoặc tiêu đề `/^ZZ/`) —
nên mã nguồn bộ kiểm thử **không còn một id/tên thật nào**. Tên fixture cũng đã đổi sang tên
trung tính. Để chặn tái phát, Giai đoạn 2 đã thêm `tests/node/khong-ro-ri.test.mjs`: nó quét **cả gói** và
chặn mọi token dạng `<tiền tố id>_<thân>` có thân từ 10 ký tự trở lên (id thật do `uid()` sinh ra
dài 14–15 ký tự; id test dài nhất trong gói là 9), cộng luật “mặt hàng phát hành (`src/**`,
`main.pjs`, `index.html`) không được chứa token id nào ngoài ký hiệu riêng của bộ test”. Ca đó
tự kiểm tra chính phép quét của nó bằng token tổng hợp.

**Phát hiện khi rà lại lần hai (cuối Giai đoạn 2): bản ghi chép cũng là một chỗ rò rỉ.** Gói thứ
hai (`6cfd2611…`) đã sạch trong `tests/`, nhưng **chính `src/README.md` — tệp ghi chép về đợt rà
soát — vẫn còn** một id truyện thật, một id hội thoại thật, và tên thật của vài nhân vật/hồ sơ
người dùng (ở đoạn “Ba hồ sơ thật của người dùng…” và đoạn liệt kê tên trong mục `nh-anh-en`).
Đã thay bằng ký hiệu trung tính. Đây là lần đầu lỗi rò rỉ nằm ở **tài liệu** chứ không ở mã kiểm
thử — và `src/README.md` đi theo generator ra công khai, nên đây cũng là chỗ nguy hiểm nhất.

Giai đoạn 2 xong phần dựng repo: `tests/lib` (khung kiểm thử dùng chung hai tầng), `tests/node`
(9 tệp, chạy bằng `node --test`, không cần DOM), `tests/browser` (43 bộ + `runner.js` nạp nguồn
tiêm sẵn qua `window.__tvNguon` để chạy được ngoài `src/`), `tests/fixtures`, `tests/README.md`
và `.github/workflows/test.yml`.

**Giai đoạn 2 — vòng chỉnh sau khi CI thật bắt lỗi.** CI của repo phát hiện hai lỗi đóng gói đã
sửa: `node --test <thư mục>` không chạy trên Node ≥21 (đổi sang
`node --test tests/node/*.test.mjs`, workflow ghim Node 22), và danh sách "gốc gói" trong
`goi-chung.test.mjs` thiếu `.git` nên ca "gốc gói không có tệp lạ" luôn đỏ trong repo git thật.
Bài học: test cấu trúc gói phải chạy được **cả** trong bản giải nén **lẫn** trong repo git; và
Node ≥23 in `ℹ pass N` thay cho `# pass N` nên script đọc kết quả phải dựa vào **mã thoát**.

**Giai đoạn 2 — vá ba lỗ hổng phủ test (đã kiểm chứng xanh):**

1. `docKeHoach().buoc` **không** lọc qua `laKhongCo()` như các mục khác, nên `BƯỚC CHUYỂN: KHONG CO`
   biến thành một bước tên là "KHONG CO". Đã lọc như mọi mục, và ca kiểm thử cũ (vốn **khoá hành
   vi sai** lại) đã đổi thành khẳng định đúng: `buoc` rỗng, kèm các biến thể `n/a`, `-`, `none`,
   `KHONG`, `khong co gi`.
2. `dd-setup` / `dd-fake-ai` / `dd-fake-ai-loi` (khung dựng chế độ Đạo diễn) và `vg-base` (khung
   dựng thời gian vắng mặt) là **phụ trợ không có bộ tiêu thụ nào** — tức là đã chết mà vẫn nằm
   trong `DANH_MUC`. Nay đã có bộ tiêu thụ thật: `dd-check` (lập cầu nối → đọc kế hoạch → kích
   hoạt hướng, gồm cả lượt kế hoạch RỖNG) · `dd-loi` (AI lỗi: cả promise bị từ chối lẫn
   `stopReason: "error"`) · `vg-check` (vắng mặt: đủ ngưỡng có sự kiện + tin nhắn + dải phân
   cách, tạm dừng thì không gọi AI, AI lỗi thì giữ phiên "thử lại"). Cả ba khung nay là bước
   `dung`, các bộ tiêu thụ là bước `bo`.
3. `openTaoHuong` được mở thêm trong `window.__tv_test` (điểm neo cho kiểm thử, không phải API
   của ứng dụng) để bộ tiêu thụ chạy đúng luồng thật.

### Giai đoạn 3 — `src/CONTEXT.md`

Đã thêm `src/CONTEXT.md` (bản đồ ngắn cho session sau: sơ đồ module, bất biến dữ liệu, luật
ngôn ngữ prompt, bảng "sửa X ở đâu", cách chạy test, `PHIEN_BAN_*`, luật làm việc, quyền riêng
tư, nguồn sự thật & quy trình). Luật ngôn ngữ prompt nay được tuyên bố **một chỗ duy nhất**:
hằng `LUAT_NGON_NGU` trong `src/ai.js` (máy vẽ = tiếng Anh, văn bản truyện/prompt văn bản =
tiếng Việt), và các chỗ cần tên ngôn ngữ đều lấy từ hằng đó (`dichNgoaiHinh()` trong `ai.js`;
nhãn "Mô tả khung hình", khối "Ngoại hình cố định", dòng "Chưa dịch được sang…" trong `app.js`).
Nội dung thay thế **giống hệt từng ký tự** so với trước, nên không đổi hành vi.

### Giai đoạn 4 — sao lưu, nhật ký parse, gỡ lỗi, tự kiểm tra

Sáu mục theo kế hoạch, cộng ba yêu cầu siết thêm về quyền riêng tư và chống làm phiền.

1. **Cảnh báo đổi tên generator** — `khoiCanhBaoDoiTen()` trong `app.js`, hiện ở **hai** chỗ:
   chân màn Thư viện (`.lib-foot`) và mục "Sao lưu & an toàn dữ liệu" trong Cài đặt. Nói đúng
   cơ chế (dữ liệu nằm theo **origin** của trang, nên đổi tên/fork là thành địa chỉ khác ⇒ app
   ở địa chỉ mới không thấy dữ liệu cũ), nói rõ hậu quả trông như mất sạch, và việc cần làm:
   xuất bản sao lưu trước, đổi lại tên cũ là thấy lại dữ liệu. CSS dùng lại đúng dạng
   `.lib-privacy` (chữ chảy quanh icon SVG), **không** dùng flex cho khối chữ — flex biến mỗi
   đoạn chữ và mỗi `<b>` thành một "cột" riêng (lỗi bố cục thật đã gặp và đã sửa ở bộ này).
2. **Tự nhắc sao lưu** — `mocSaoLuu`/`danhDauSaoLuu`/`danhDauDaDoi`/`nenNhacSaoLuu` trong
   `store.js`; mốc nằm ở `localStorage["truyenVai.caiDat"].saoLuu` (**5 mốc thời gian**, không
   nội dung). `nhacSaoLuuKhiMo()` (gọi trong `boot()`) chỉ nhắc khi **dữ liệu đã đổi SAU lần
   xuất gần nhất** và đã quá `CauHinh().soNgayNhacSaoLuu` (**mặc định 7**, đặt trong `main.pjs`);
   tối đa **một lần mỗi ngày** (`nhacLuc`), và nút **Để sau** hoãn đúng **một ngày**
   (`hoanLuc`). Toast có nút bấm (`.toast-nut`, 20 giây) — `toast()` trong `dom.js` nhận thêm
   tham số `hanhDong`. `danhDauDaDoi()` được gọi ở **9 đường ghi/xoá trung tâm** (truyện, tin
   nhắn, ảnh, hồ sơ ngoại hình) nên không thể ghi dữ liệu mà quên đánh dấu.
3. **`dungLuongUocTinh` lên mặt tiền** — `thanhDungLuong(el, opts)` dùng chung cho màn Thư viện
   và Cài đặt; dòng "Bộ nhớ trình duyệt đã dùng: X / Y (Z%)", kèm cảnh báo khi ≥ 80%.
4. **Nhật ký parse LLM dạng vòng đệm** — `themVaoVong`/`catTho`/`docNhatKyLlm`/`ghiNhatKyLlm`
   (`store.js`, kv folder `nhatKyLlm`), ghi một mục cho **mỗi lượt gọi AI**: loại lệnh (lấy từ
   TASK trong prompt, `loaiLenhTuPrompt`), thời điểm, ok/lỗi + lý do, độ dài đầu ra, và đầu ra
   thô cho các lượt parse. Vòng đệm chặn **hai đầu**: `TOI_DA_MUC_NHAT_KY = 20` và
   `TOI_DA_BYTE_NHAT_KY = 12 KB` phần thô, mỗi mục bị cắt ở `DO_DAI_THO_MOI_MUC = 1000` ký tự.
   Ba hằng này **phải ăn khớp** với nhau, nếu không trần dung lượng không bao giờ chạm tới
   (đã có ca kiểm thử ghim điều đó). `ai.js` nhận hook qua `datHookNhatKy()` nên tầng Node vẫn
   thuần khi không có hook.
5. **Bảng gỡ lỗi** — `openGoLoi()`: số liệu tổng quan (phiên bản dữ liệu, số truyện/hồ sơ, dung
   lượng), danh sách nhật ký (giờ + chip ok/lỗi + loại lệnh + lý do + độ dài), đầu ra thô nằm
   trong `<details>` thu gọn, nút **Xuất gói gỡ lỗi** / **Xoá nhật ký** / **Tự kiểm tra dữ liệu**.
6. **Màn tự kiểm tra bất biến** — `kiemTraBatBien()` (`store.js`, thuần) soi 9 nhóm: tin nhắn mồ
   côi, ảnh mồ côi, thiếu hồ sơ ngoại hình, hội thoại/hiện diện/cảnh riêng trỏ nhân vật đã mất,
   hội thoại trỏ chương đã mất, cảnh đã khép trỏ hội thoại đã mất, id trùng trong một truyện.
   `suaBatBien()` chỉ sửa **6 nhóm an toàn** (xoá khoá mồ côi, gỡ liên kết trỏ vào thứ đã mất)
   trong **một** `giaoDichKV`; hai nhóm còn lại **chỉ báo** — không bao giờ tự xoá chương hay
   cảnh đã khép của người dùng.

Ba yêu cầu siết thêm (đều đã có kiểm thử ở cả hai tầng):

- **Gói gỡ lỗi mặc định CHỈ có metadata.** `dungGoLoi({kemTho})` bỏ hẳn trường `dauRaTho` khi
  người dùng không tích; hộp chọn nói rõ vì sao đầu ra thô là nhạy cảm (có thể chứa nội dung
  truyện, kể cả người lớn), và hộp xác nhận liệt kê **đúng** những gì file sắp chứa, kèm dòng
  "Gói KHÔNG chứa: nội dung tin nhắn, ảnh, hồ sơ ngoại hình…". Cài đặt trong gói đã bị **bỏ mốc
  sao lưu** trước khi ghi. Bộ `gd4-goloi` chèn một dấu riêng vào đầu ra thô rồi khẳng định dấu
  đó **không** xuất hiện ở gói mặc định, ở file xuất truyện, và ở bản sao lưu toàn bộ.
- **Nhật ký không bao giờ đi vào file xuất truyện** (kiểm bằng: khoá cấp cao nhất của file xuất
  không có mục nào chứa "nhat", cộng dấu riêng ở trên), có **nút xoá nhật ký** (hỏi lại trước),
  và vòng đệm chặn cả số mục lẫn dung lượng như mục 4.
- **Nhắc sao lưu không làm phiền**: chỉ khi dữ liệu **thật sự đổi** sau lần xuất gần nhất, đã
  quá N ngày, tối đa một lần mỗi ngày, có "để sau" hoãn một ngày; trạng thái bằng chữ trong Cài
  đặt luôn nói rõ đang ở tình huống nào ("chưa từng xuất", "đã bao gồm mọi thay đổi", "đã thay
  đổi sau lần xuất gần nhất… đến hạn nhắc sao lưu", "…bạn đã chọn để sau").

**Sửa nhỏ trước Giai đoạn 4 — bất biến 5.** Bất biến 5 trong `src/CONTEXT.md` đã bỏ ngoại lệ
"(trừ chuỗi do chính app sinh)": **mọi** giá trị động đều qua `esc()`, kể cả chuỗi do app ghép ra
từ dữ liệu. Rà lại `app.js` bằng AST (acorn) tìm chỗ dựa vào ngoại lệ đó: **50 vị trí** —
43 chỗ chèn `.id` vào thuộc tính `data-id`/`data-mid`/`data-nv`/`value=`, 6 chỗ chèn số chương/mức
(`.so`), 1 chỗ chèn số đếm hồ sơ — tất cả đã bọc `esc()`, cộng thêm `paintAvatar` (`data-mau` /
`style="background:…"` và `data-emoji`). Cách kiểm: một bộ dò dựng truyện mà **mọi** trường văn
bản mang payload phá vỡ ngữ cảnh (`"` + thẻ + thuộc tính), rồi rà ~48 màn/hộp thoại và khẳng định
payload **không** tạo ra phần tử/thuộc tính thật nào. Bộ dò đó nay là bộ kiểm thử thường trực
`tests/browser/esc-bat-bien.js` (25 ca), nên ngoại lệ cũ không thể quay lại.

**Kiểm chứng Giai đoạn 4:** tầng Node **10 tệp, 1.314 khẳng định, 0 không đạt** (thêm tệp
`tests/node/gd4.test.mjs`, 128 khẳng định); tầng trình duyệt **1.034/1.034 ca · 30 bộ** (thêm ba
bộ `gd4-saoluu` / `gd4-goloi` / `gd4-tukiem`). Dữ liệu thật của chủ dự án **không đổi một byte**
(bộ chạy chụp kv trước/sau; ba bộ `gd4-*` còn tự chụp và trả nguyên
`localStorage["truyenVai.caiDat"]`). Gói được đóng zip, tải lại chính URL đó, giải nén, và chạy
lại tầng Node **trong thư mục có `git init`** để khớp môi trường CI.

### Giai đoạn 5 — tầng schema + migration tập trung (tháng 9/2026)

Bốn yêu cầu của kế hoạch, cộng hai việc siết thêm (`src/CONTEXT.md` ≤ 10 KB, giữ hàm UI ≤ 150 dòng).

1. **`src/schema.js` — tầng hình dạng dữ liệu, thuần, không import gì.** Chứa `KIEU` (các kiểu
   nguyên thuỷ), `MO_TA_TRUYEN` / `MO_TA_NHAN_VAT` / `MO_TA_CHUONG` / `MO_TA_HOI_THOAI` /
   `MO_TA_TIN_NHAN` / `MO_TA_ANH` / `MO_TA_HO_SO` (mô tả từng trường: kiểu, bắt buộc, mặc định),
   `kiemTheoMo` + `kiemTraTruyen`/`kiemTraTinNhan`/`kiemTraAnh`/`kiemTraHoSo` (trả `{ ok, loi[] }`,
   **không ném**), `nhanLoaiBanGhi`/`kiemTheoLoai`, `moTaHinhDang`, và **sổ đăng ký phiên bản**
   `MIGRATION_TRUYEN` (7 mục, v1…v7) + `MIGRATION_HO_SO` (1 mục) với `soPhienBan`/`buocCanChay`.
   Mô tả hình dạng **phủ đúng bản ghi đã chuẩn hoá** (đã có ca kiểm thử ghim điều này; khi thêm
   trường vào `chuanHoa*` mà quên `MO_TA_*` thì ca đó đỏ).
2. **Một cửa vào cho MỌI đường nạp: `napBanGhi(raw, loai, id, tuyChon)` → `migrate`.** `loadStories`,
   `nhanHoSo`, `loadMessages`, `getAnh` và cả hai đường **nhập file** đều đi qua đó. `migrate(raw,
   loai, tuyChon)` là điểm vào duy nhất (ném nếu `loai` lạ); `migrateTruyen`/`migrateTinNhan`/
   `migrateHoSo`/`migrateAnh` là các vỏ mỏng. Không chỗ nào còn gọi thẳng `chuanHoa*` lúc nạp —
   có ca kiểm thử soát chuỗi trên `app.js`/`store.js` để giữ luật đó.
   - Bản ghi đã **đúng hoặc mới hơn** `PHIEN_BAN_*` thì **trả nguyên đối tượng** (không chuẩn hoá
     lại — chuẩn hoá lại là *sửa* dữ liệu, mà tham chiếu mồ côi chính là thứ màn Tự kiểm tra phải
     báo, không phải thứ đường nạp phải dọn). Bản ghi **mới hơn** app cũng được giữ nguyên, chỉ
     ghi một dòng nhật ký `vuotPhienBan` — **không hạ phiên bản**.
   - `migrate` **idempotent** (có ca chạy ba lần liên tiếp).
3. **Validate khi nạp — chỉ BÁO, không xoá, không chặn.** Bản ghi sai hình dạng được ghi vào
   **nhật ký lỗi hình dạng trong bộ nhớ** (`ghiLoiHinhDang`/`docLoiHinhDang`/`xoaLoiHinhDang`, trần
   **60 mục** và **4 000 ký tự**), rồi hiện thành nhóm `"hinh-dang"` trong màn Tự kiểm tra của
   Giai đoạn 4 (`chayTuKiemTra` → `bc.nhom["hinh-dang"]`, kèm `bc.soLoiHinhDang`), và có mặt trong
   bảng gỡ lỗi. Bản ghi hỏng **vẫn nằm nguyên trong kv**, app vẫn mở được, và nó **không** lọt vào
   nhóm "sửa được" (`suaBatBien` không đụng tới). Hai nhật ký (nâng cấp + lỗi hình dạng) **chỉ sống
   trong phiên**, không ghi vào kv, không đi vào file xuất/backup (có ca kiểm thử chứng minh bằng
   cách chụp kv trước/sau).
   - Quét bất biến của `kiemTraBatBien` chạy **trên cả bản ghi sai hình dạng**, nên hàm này phải
     chịu được dữ liệu sai kiểu — đó là lý do có `mang()` trong `store.js` (một trường đáng lẽ là
     mảng mà lại là chuỗi từng làm cả màn Tự kiểm tra ném lỗi).
4. **Fixture cho TỪNG `PHIEN_BAN_*` cũ** — `tests/fixtures/phien-ban-cu.mjs`: 8 mục cho truyện
   (v0 không có trường `phienBan`, rồi v1…v7), 2 mục cho hồ sơ, 5 mục cho tin nhắn, 1 mục cho ảnh.
   **Toàn bộ là dữ liệu TỔNG HỢP** (id ngắn, tên `zz…`), không lấy một byte nào từ dữ liệu thật.
   Mỗi mục tự khai `khongCo` (những trường mà phiên bản đó chưa có) và có ca kiểm thử khẳng định
   `khongCo` đúng — nếu fixture phản ánh sai hình dạng cũ thì ca đó đỏ.
5. **Chạy bóng `migrate*` vs `chuanHoa*`** — trên mọi fixture (Node) **và trên dữ liệu THẬT** của
   chủ dự án (trình duyệt), so sâu **trong bộ nhớ, không ghi gì**: `tests/node/schema.test.mjs` và
   `tests/browser/gd5-schema.js`. Trên dữ liệu thật: **1 truyện · 3 hồ sơ · 2 nhóm tin nhắn · 4 ảnh
   — khác biệt 0, idempotent 0**. Khi so phải **khoá đồng hồ** (`Date.now`) vì `tinhLaiBiet` có thể
   đặt `suaLuc`.
6. **Không tăng `PHIEN_BAN_*`.** Giai đoạn 5 không đổi hình dạng đã lưu (bộ kiểm thử vẫn đòi
   `PHIEN_BAN_TRUYEN` = 7, `PHIEN_BAN_HO_SO` = 1).

**`src/CONTEXT.md` ≤ 10 240 byte.** Tệp đó là thứ được đọc ĐẦU TIÊN mỗi phiên, nên nó phải là
**luật + bảng tra**, không phải lịch sử: đã rút **12 976 → 10 177 byte** mà vẫn giữ đủ các mục luật.
Phần chi tiết nằm ở đây (`src/README.md`) và `tests/README.md`. Có ca kiểm thử đếm byte bằng
`TextEncoder` và đòi các mục luật (`## 1. Module + chiều import`, `## 2. Bất biến dữ liệu`,
`## 4. Muốn sửa X`, `` `PHIEN_BAN_*` ``, `## 7. Luật làm việc`, `esc()`, `laNguoiLon()`, `schema.js`,
`migrate`) còn nguyên.

**Hai hàm UI đã tới trần 150 dòng — cấm phình thêm.** `openTaoAnh` (541 → **566**) và
`openCharacterEditor` (533 → **537**). Từ giờ tới Giai đoạn 6, sửa gì trong hai hàm này thì **kéo
ra hàm con**, không viết thẳng vào thân.

**Kiểm chứng Giai đoạn 5:** tầng Node **11 tệp, 1 837 khẳng định, 0 không đạt** (thêm
`tests/node/schema.test.mjs` — 460 khẳng định — và `tests/fixtures/phien-ban-cu.mjs`); tầng trình
duyệt **1 077/1 077 ca · 31 bộ, 0 cảnh báo** (thêm bộ `gd5-schema`, 39 ca). Bộ chạy xác nhận **dữ
liệu thật không đổi một byte** và `localStorage["truyenVai.caiDat"]` **đã trả nguyên trạng**. Gói
được đóng zip, tải lại chính URL đó, giải nén, và chạy lại tầng Node **trong thư mục có `git init`**
để khớp môi trường CI.

**Bẫy đã gặp (giữ lại phần bị rút gọn khỏi `src/CONTEXT.md`).** Nếu khung xem trước bị bóp hẹp
(ví dụ 121 px) thì hai bộ kiểm bố cục `gy-goi-y` / `dk-loi-thoai` **đỏ giả** — phải
`set_viewport_size({ width: 1100, height: 820 })` trước khi chạy tầng trình duyệt. Bộ `phu` (ca AI
THẬT, soi bố cục, dò lỗi) **không** chạy mặc định nên đừng lấy làm tiêu chuẩn nghiệm thu. Nguồn
các bộ kiểm thử được **tiêm sẵn** vào `window.__tvNguon[<tên>]` (vì `tests/` không nằm trong `src/`).

### Giai đoạn 6 — thí điểm tách `openTaoAnh` (tháng 9/2026)

Kế hoạch 7 giai đoạn đòi **không hàm nào > 150 dòng**. Giai đoạn 5 đã kéo `openTaoAnh`
lên **566 dòng** — đó là hàm dài nhất app. Giai đoạn 6 làm **một thí điểm duy nhất** (chỉ
`openTaoAnh`, không đụng màn nào khác) để chủ dự án duyệt *cách làm* trước khi tách tiếp.

1. **`src/ui/taoAnh/` — 6 tệp, mỗi tệp một việc.** `index.js` (140 dòng) là **vỏ**: nhận
   `(opts, D)`, dựng khung/modal, gom state `S`, rồi gọi `lapChon`/`lapDung`/`lapLuu`. Đây là
   điểm vào duy nhất — `app.js` chỉ giữ một hàm 3 dòng gọi lại nó.
   - `taoAnhFlow.js` (**logic THUẦN, KHÔNG import DOM**, chạy được bằng Node): chọn/nhận diện
     hồ sơ theo khung (`chonHoSo`, `nhanDienTrongKhung`, `hoSoHienChip`, `hoSoConLai`,
     `thaoTacChip`, `nvChuaXacNhanChoTaoAnh`), **cổng 18+ cho ảnh** (`loiChanTaoAnh`), trạng thái
     nút (`nutTaoAnh`), **dựng prompt gửi máy vẽ** (`promptGuiMayVe` → `{nen, gui}`,
     `loaiTruGuiMayVe`, `kichThuocNen`), xử lý kết quả máy vẽ (`xuLyKetQuaMayVe`), và bản ghi ảnh
     để lưu (`thongSoBanGhiAnh`). Mọi thứ "quyết định" nằm ở đây nên kiểm được không cần trình duyệt.
   - `taoAnhHtml.js`: chuỗi HTML của từng khối (`htmlThan`, `htmlChip`, `htmlKhuChon`,
     `htmlKhoiNgoaiHinh`, `htmlChonThem`, `htmlNut`).
   - `taoAnhChon.js` (`lapChon` + ba hàm con cùng tệp: `damBaoNgoaiHinhEn`, `moChonThem`,
     `ganSuKienChon`): khu "Nhân vật trong khung hình" + dịch ngoại hình (gọi AI, có nhớ đệm
     `dangDich`/`daThuDich`/`dichHong`). `lapChon` chỉ còn là chỗ **lắp** (gắn hàm con lên `S`
     rồi nối sự kiện) — không hàm nào > 150 dòng.
   - `taoAnhDung.js` (`lapDung`): "Viết lại" (`vietLai`) + "Dựng khung hình" (`dungAnh`, có cổng 18+).
   - `taoAnhLuu.js` (`lapLuu`): "Đưa vào truyện" (`luuVaoHoiThoai`).
2. **`TAO_ANH_DEPS` — cầu nối có ý thức.** `app.js` truyền 16 hàm **còn lại của app** (điều hướng,
   ghi dữ liệu, tiện ích ảnh: `currentStory`, `currentConv`, `render`, `luuTinNhan`, `ganAnhVao`…).
   Mọi thứ khác `src/ui/taoAnh/*` **lấy thẳng từ lõi** (`store/ai/ngoaiHinh/dom`) — nên `deps`
   không phình thành túi đồ nghề chung. Có ca kiểm thử đòi đúng dạng `moTaoAnh(opts, TAO_ANH_DEPS)`
   + `const TAO_ANH_DEPS = {` trong `app.js`.
3. **DAG một chiều — luật mới, có ca ghim.** `src/ui/*` **được** import lõi; lõi (`store`, `ai`,
   `schema`, `trangThai`, `thoiGian`, `ngoaiHinh`, `lore`, `dom`) **KHÔNG BAO GIỜ** import
   `src/ui/*`. Chỉ mỗi `app.js` được phép (nó là tầng ghép). `tests/node/goi-chung.test.mjs` có
   **bốn** ca mới: (a) *"DAG: lõi KHÔNG BAO GIỜ import src/ui"* — quét từng tệp lõi, bỏ qua
   `app.js`; (b) *"import trong src/ui/ đều tương đối và trỏ đúng tệp có thật"*; (c) *"màn tạo ảnh:
   logic thuần nằm ở src/ui, KHÔNG ở app.js"* — đòi `openTaoAnh` ≤ 150 dòng và đòi cầu
   `moTaoAnh(opts, TAO_ANH_DEPS)`; (d) *"không hàm nào trong src/ui/ dài quá 150 dòng"* — quét
   **mọi** tệp `src/ui/**`, kể cả hàm con (đây là ca bắt được `lapChon` 178 dòng lúc đầu, phải
   tách thêm).
   `tests/node/khong-ro-ri.test.mjs` cũng đã đi **đệ quy** `src/ui/**` (nếu không thì tệp mới
   lọt lưới quét id/tên thật).
4. **KHÔNG ĐỔI HÀNH VI — chứng minh byte-for-byte, không phải "cảm giác giống".** Một script
   **tất định** (id đặt cứng, AI giả trả lời theo nội dung câu hỏi, máy vẽ giả ghi lại prompt) chạy
   trên `app.js` **CŨ** rồi trên **MỚI**, cùng dữ liệu giả:
   - HTML modal (`outerHTML`), khối ngoại hình, chuỗi chip, dòng trạng thái, **`instruction` gửi
     AI**, và **prompt gửi máy vẽ** (`nen`/`gui`/`loaiTru`/kích thước) — **giống hệt**.
   - **Ảnh chụp giống hệt TỪNG BYTE**: ảnh chụp **phần tử modal** 268 764 B (0 pixel khác) và ảnh
     chụp **cả trang** 455 131 B (2 313 × 1 721 = 3 980 673 pixel, **0 pixel khác**) — không phải
     jitter khử răng cưa mà đúng từng pixel. Vision soi lại cũng khớp (khối "Ngoại hình cố định",
     hai ô chọn, khu "Nâng cao", hàng nút — xem ghi chú cuộn ở dưới).
   - **Ca snapshot prompt trong Node**: `tests/node/taoAnhFlow.test.mjs` (66 khẳng định) chép
     nguyên một prompt mẫu **469 B** và đòi `promptGuiMayVe` trả **đúng từng byte** cho cùng đầu vào.
5. **`src/ui/` con được Perchance phục vụ đúng.** Kiểm trên trang thật: cả **6/6 tệp `fetch` →
   HTTP 200 + giống hệt từng byte** so với workspace (kể cả đường dẫn lồng `ui/taoAnh/…`). Ghi chú
   quan trọng: tầng phục vụ `src/` của nền tảng **luôn đi qua service worker** (gọi vòng qua SW trả
   404 `"No src manifest available for this page"` dù generator đã lưu), nên từ trong editor
   **không thể** chứng minh "không qua SW" — cái kiểm được là resolver xử lý đúng **đường dẫn lồng**
   và trả **đúng byte**.

**Kiểm chứng Giai đoạn 6:** tầng Node **12 tệp, 2 012 khẳng định, 0 không đạt** (thêm
`tests/node/taoAnhFlow.test.mjs` — 66 khẳng định — và 4 ca DAG/hạn-dòng trong `goi-chung.test.mjs`,
399 → 426 khẳng định); tầng trình duyệt **1 077/1 077 ca · 31 bộ, 0 cảnh báo** — **y như trước khi
tách**. Bộ chạy xác nhận **dữ liệu thật không đổi một byte** (1 truyện · 3 hồ sơ · 2 nhóm tin nhắn ·
4 ảnh) và `localStorage["truyenVai.caiDat"]` **đã trả nguyên trạng**. Gói zip được tải lại chính URL
đó, giải nén, `git init`, rồi chạy lại tầng Node để khớp môi trường CI.

**Cách đo "không đổi hành vi" (đừng bỏ bước này khi tách hàm sau).** Script tất định
(`window.__tv_test.openTaoAnh` + AI giả trả lời theo NỘI DUNG câu hỏi + máy vẽ giả ghi lại prompt)
chạy trên bản CŨ rồi bản MỚI, rồi so **8 khoá** của kết quả: `html` (5 356 ký tự), `khoi`, `chip`,
`status`, `ai`, `ve` (prompt 552 ký tự), `sau`, `chipSau` — **giống hệt từng ký tự**; ảnh chụp phần
tử modal và cả trang **giống hệt từng byte** (PNG giải ra rồi so pixel: 0 pixel khác). Lưu ý khi soi
ảnh chụp: modal cao hơn khung nhìn (thân modal `scrollHeight` 940 > `clientHeight` 612), nên ảnh
chụp **phần đầu** modal không thấy khối "Ngoại hình cố định"/hai ô chọn/"Nâng cao" — phải **cuộn
xuống đáy** rồi chụp lại mới thấy đủ; kiểm bằng DOM (`[data-nh-khoi]` không `hidden`,
`[data-f="phongCach"]` = `dien-anh`, `[data-f="kichThuoc"]` = `512x768`) là chắc nhất.
(Cách so pixel: `createImageBitmap` + `OffscreenCanvas.getImageData` ngay trong `execute_js` — không
cần thư viện giải PNG nào.)

### Đợt 6b — tách `openCharacterEditor` + `openNewStoryModal` (tháng 9/2026)

Chủ dự án đã duyệt *cách làm* của Giai đoạn 6 và yêu cầu tách **hai** hàm còn lại **cùng lúc**,
cùng khuôn. Hai hàm này chứa các đường vào nội dung người lớn nên có ba điều kiện riêng: mọi
quyết định cổng 18+ phải nằm ở tầng logic THUẦN (có ca Node riêng); các bộ trình duyệt
(`gd1-tuoi` và mọi bộ chạm editor/wizard) phải xanh **y như trước trên cả bản CŨ lẫn MỚI, cùng
số ca**; và **không** được đổi thông điệp, thứ tự bước hay mặc định của bất kỳ hộp 18+ nào.

1. **`src/ui/nhanVat/` — 9 tệp.** `index.js` là **vỏ**: nhận `(charId, opts, D)`, dựng modal rồi
   gọi `lapMau`/`lapAvatar`/`lapLienKet`/`lapAi`/`lapGiaoKeo`/`lapLuu` (đòi **thân hàm** ≤ 150
   dòng — không phải số dòng tệp).
   - `nhanVatForm.js` (**THUẦN, không DOM**): luật tuổi/cờ người lớn (`khoaNguoiLonTheoTuoi`,
     `chotNguoiLon`, `tuoiTheoHoSo`), tên (`tenTrongForm`, `tenSauKhiLuu`), BDSM trong editor
     (`bdsmTrongEditor`, `soThichTuChuoi`, `doiSoThich`), `goiYTuoiText`, và `promptAvatarAi` +
     câu chữ `LY_DO_KHOA_TUOI`, `LY_DO_BAT_GIAO_KEO`, `LOI_TU_CHOI_BAT_GIAO_KEO`, `TEN_MAC_DINH`.
   - `nhanVatHtml.js` (chuỗi HTML từng khối), `nhanVatMau.js` (áp mẫu + ghi chú mẫu BDSM),
     `nhanVatAvatar.js` (ảnh đại diện qua AI), `nhanVatLienKet.js` (liên kết hồ sơ ngoại hình),
     `nhanVatAi.js` (nhờ AI nghĩ hướng / viết chi tiết), `nhanVatGiaoKeo.js` (**nút "Bật giao
     kèo"** — hỏi lại rồi đi qua cửa 18+), `nhanVatLuu.js` (`docForm`/`luuNhanVat`).
2. **`src/ui/taoTruyen/` — 5 tệp.** `index.js` là **vỏ**: nhận `(opts, D)` rồi gọi `lapTaoNhanh`
   (đường "Tạo nhanh") hoặc `lapWizard` (đường "Nâng cao"/wizard).
   - `taoTruyenFlow.js` (**THUẦN, không DOM**): `cheDoMacDinh`, `theLoaiHienThi`, `emojiTheLoai`,
     `tenNguoiChoi`, `ghepBoiCanhVaLuat`, `datTenTuBoiCanh` (trần 60 ký tự), `locNhanVatCoTen`,
     `stubTruyen`, và payload `createStory` của hai đường (`payloadWizard`, `payloadTaoNhanh`).
   - `taoTruyenHtml.js`, `taoTruyenNhanh.js`, `taoTruyenWizard.js`.
3. **`src/ui/cong18.js` — cửa 18+ DÙNG CHUNG (THUẦN, không DOM).** Một nguồn duy nhất cho câu chữ
   và cho quyết định "ai được ghi cờ / ai bị chặn / có phải hỏi lại không": `coBdsm`,
   `danhSachGhiCo`, `danhSachBiChan`, `maDanhSach`, `canHoiLaiDanhSach`, `patchGiaoKeoTaoNhanh`,
   `patchGiaoKeoBanNhap`, `loiTuChoiTaoNhanh`. Tệp DOM **chỉ hiển thị** câu chữ đó và **chuyển
   lựa chọn** của người dùng vào đây. Nhờ vậy cả ba đường (bật giao kèo ở màn sửa nhân vật; xác
   nhận 18+ ở "Tạo nhanh" lúc dựng bản nháp **và** lúc tạo; cờ người lớn từng nhân vật ở wizard)
   dùng chung một luật, kiểm được bằng Node.
4. **`NHAN_VAT_DEPS` / `TAO_TRUYEN_DEPS` — cùng luật Giai đoạn 6:** bảng chỉ chứa hàm **còn lại
   của app**; mọi thứ khác (kể cả `createStory`, `newCharacter`, `giaoKeoMacDinh`,
   `xacNhanMoiNguoiLon`) lấy thẳng từ lõi. `app.js`: **9 311 → 8 397 dòng**;
   `openCharacterEditor` (**537 dòng**) và `openNewStoryModal` (**416 dòng**) nay chỉ còn **vỏ 3
   dòng**.
5. **HAI LỖI THẬT bắt được nhờ kịch bản tất định + ca test mới** — giá trị thật của đợt này:
   - `src/ui/cong18.js` import `"../../store.js"` **sai độ sâu** (tệp nằm một tầng, phải là
     `"../store.js"`) ⇒ **mọi** module import nó đều chết, app **không boot**. Ca "import trong
     `src/ui/` đều tương đối và trỏ đúng tệp có thật" đã bắt được (trước đó luật cấm `../` nên
     không ai phát hiện).
   - `nhanVatAvatar.js` gọi `D.promptAvatarAi` trong khi `NHAN_VAT_DEPS` **thiếu khoá đó** ⇒ bấm
     "Tạo ảnh đại diện" báo `D.promptAvatarAi is not a function`. Ca mới *"bảng DEPS chỉ chứa thứ
     KHÔNG import được từ lõi"* đã bắt được.

**Kiểm chứng Đợt 6b:** tầng Node **15 tệp, 2 710 khẳng định, 0 không đạt** (thêm
`tests/node/cong18.test.mjs` 51, `nhanVatForm.test.mjs` 84, `taoTruyenFlow.test.mjs` 51, và 2 ca
mới trong `goi-chung.test.mjs`); tầng trình duyệt **1 077/1 077 ca · 31 bộ, 0 cảnh báo — giống hệt**
khi chạy trên `app.js` **CŨ** lẫn **MỚI** (cùng số ca; `gd1-tuoi` và mọi bộ chạm editor/wizard đều
xanh ở cả hai). Kịch bản tất định cho ra JSON **90 828 ký tự GIỐNG HỆT TỪNG BYTE** (HTML modal hai
màn qua từng bước, 6 `instruction` gửi AI, prompt máy vẽ, **câu chữ + thứ tự bước + mặc định của
cả ba hộp xác nhận 18+**, trạng thái ô tích/tuổi sau từng bước, bản ghi truyện tạo ra). **Ảnh chụp
giống hệt từng byte**: modal 270 617 B, thân modal bỏ giới hạn cao 1 346 910 B, khối Tuổi 18 152 B,
khối giao kèo 563 681 B, dòng ô tích 23 360 B; ảnh **cả trang** chỉ khác 206/3 980 673 pixel và mỗi
kênh lệch **≤ 1** (jitter khử răng cưa) — hợp luật 12. Dữ liệu thật **nguyên trạng** (1 truyện ·
3 hồ sơ · 2 nhóm tin nhắn · 4 ảnh; `chayTuKiemTra()` → `soLoi 0`, `soLoiHinhDang 0`) và mọi dữ liệu
test đã dọn sạch. `src/CONTEXT.md` = **10 196 byte** (≤ 10 240), đã thêm dòng trỏ tới mục
"Không đổi hành vi" của `tests/README.md`.

**Cách đo "không đổi hành vi" giờ là CHUẨN BẮT BUỘC cho mọi lần tách hàm** (chi tiết + bẫy nằm ở
`tests/README.md`, mục "Không đổi hành vi"): script tất định trên bản CŨ rồi MỚI, so **từng ký tự**
và so **từng pixel**. `openTaoAnh`, `openCharacterEditor`, `openNewStoryModal`, `openStoryMenu`,
`openLorebook` đã tách xong — **đừng** viết thân màn trở lại `app.js`; `bindGlobalEvents` phải giữ
**một** điểm đăng ký sự kiện duy nhất.

### Đợt 6c — tách `openStoryMenu` + `openLorebook` + `bindGlobalEvents` (tháng 9/2026)

Ba hàm còn lại trên 150 dòng của `app.js` (`bindGlobalEvents` **319**, `openLorebook` **299**,
`openStoryMenu` **245**) nay chỉ còn **vỏ 3 dòng** gọi màn đã tách, cùng khuôn Giai đoạn 6/6b —
`app.js` **8 397 → 7 578 dòng**. Kèm một việc dọn nhỏ chủ dự án yêu cầu làm trước.

1. **Dọn bảng DEPS + phép kiểm tĩnh HAI CHIỀU.** Bản rà soát chỉ ra `NHAN_VAT_DEPS` khai 20 tên
   nhưng `src/ui/nhanVat/` chỉ dùng 18, `TAO_TRUYEN_DEPS` khai 15 dùng 14. Đã bỏ mục thừa: `$$`
   (nay lấy thẳng từ `src/dom.js`, không còn là mục của bảng) và hai hằng bảng màu/emoji viết lại
   thành `mauChoices`/`emojiChoices` để mỗi bảng chỉ còn **đúng tên khoá được dùng**. Ca kiểm tĩnh
   trong `tests/node/goi-chung.test.mjs` nay chạy **HAI CHIỀU**: mọi `D.<tên>` mà tệp của màn gọi
   phải có trong bảng VÀ mọi tên trong bảng phải được dùng ít nhất một lần (khai thừa là lỗi);
   khoá có giá trị chỉ được là HÀM. Bảng hiện tại: `TAO_ANH_DEPS` 16 · `NHAN_VAT_DEPS` 18 ·
   `TAO_TRUYEN_DEPS` 13 · `TUY_CHON_TRUYEN_DEPS` 15 · `LOREBOOK_DEPS` 4 · `SU_KIEN_DEPS` 54.
2. **`bindGlobalEvents` — MỘT điểm đăng ký duy nhất, không chia nhỏ.** Đây là chỗ khác các màn
   trước: hàm này **không** được tách thành nhiều nơi tự `addEventListener`. `bindGlobalEvents`
   (nay **54 dòng**) vẫn giữ **đúng một** `document.addEventListener("click")` — cộng các mốc hoạt
   động `pointerdown`/`keydown`/`visibilitychange` và `pagehide` như cũ (giữ thứ tự cũ); phần *xử
   lý* chia theo TÍNH NĂNG ở **`src/ui/suKien/` — 7 tệp**: `chung`, `chat`, `anh`, `canh`,
   `nguoiLon`, `vangMat`, `lorebook`; mỗi tệp export một map `"data-act" ⇒ hàm`, cộng `index.js`
   với `BANG_CON` + `gopBangSuKien(D)`. Đúng **66 khoá = 66 `case` cũ**, không trùng tên (trùng thì
   `gopBangSuKien` **NÉM LỖI**). Muốn thêm hành động: thêm một khoá vào bảng con — **đừng** thêm
   `addEventListener` ở chỗ khác. Tệp dài nhất `chat.js` **155 dòng cả tệp**, thân hàm dài nhất
   `bangChat` **141 dòng** (< 150).
3. **`src/ui/tuyChonTruyen/` — 5 tệp** (màn Tuỳ chọn truyện, trước là `openStoryMenu` 245 dòng).
   `index.js` là vỏ (`openTuyChonTruyen(D)`); `tuyChonTruyenFlow.js` là **logic THUẦN, 0 import**
   (mặc định, ngưỡng, nhãn nút, `chupTrangThai`/`khoiPhucTrangThai`, `giaTriSapLuu`); còn
   `tuyChonTruyenHtml.js` (chuỗi HTML), `tuyChonTruyenLink.js` (khối liên kết người chơi) và
   `tuyChonTruyenLuu.js` (lưu + hiệu ứng nhấp nháy). **Luật riêng của màn này:** mọi đường vào hộp
   Giao kèo / chế độ người lớn đi qua hàm dùng chung của app (`D.openGiaoKeo` →
   `xacNhan18PlusTruyen` + `chanNoiDungNguoiLon`), **không** tự dựng lại logic tuổi và **không**
   chép câu chữ 18+ (có ca kiểm thử ghim).
4. **`src/ui/lorebook/` — 6 tệp** (trước là `openLorebook` 299 dòng). Phần **parse/xếp/lọc mục
   lore là logic THUẦN** nên tách riêng: `lorebookFlow.js` (0 import — `soBat`, `bangKhop`,
   `mucTuForm`, `thieuNoiDung`, `tenFileXuat`, câu hỏi/thông báo, mã lỗi file) **có ca Node riêng**;
   `lorebookHtml.js` (chuỗi HTML), `lorebookVe.js` (vẽ danh sách/thống kê), `lorebookNhap.js`
   (dán JSON / nhập file), `lorebookNut.js` (thêm-sửa-xoá-xuất); `index.js` là vỏ
   (`openLorebook(D)`).
5. **Kiểm chứng "không đổi hành vi".** Kịch bản tất định cho JSON **69 456 ký tự GIỐNG TỪNG BYTE**
   (HTML màn Tuỳ chọn truyện + Sổ tri thức qua từng bước, 12 hành động toàn cục qua dispatcher, thứ
   tự toast, bản ghi truyện) và **ba ảnh chụp PHẦN TỬ giống hệt từng byte**: `#appRoot` 1 874 222 B,
   `.modal-backdrop` 1 710 081 B, sổ tri thức 1 373 219 B (mỗi bản tự chụp hai lần cũng trùng
   byte). **Bẫy mới:** `snapshot.capture()` **cả trang** KHÔNG tất định (cùng trạng thái, hai lần
   gọi ra hai ảnh khác nhau) ⇒ chỉ dùng **chụp phần tử**, và phải bỏ `maxHeight`/`overflow` của
   `.modal-box`/`.modal-body` trước khi chụp vì modal cao hơn khung nhìn.

**Kiểm chứng Đợt 6c:** tầng Node **18 tệp, 4 071 khẳng định, 0 không đạt** (mốc 6b: 15 tệp,
2 710) — thêm `tests/node/suKien.test.mjs` **324**, `lorebookFlow.test.mjs` **85**,
`tuyChonTruyenFlow.test.mjs` **91**; `goi-chung.test.mjs` 935 → **1 793** khẳng định (ca
DEPS-hai-chiều mới), `khong-ro-ri.test.mjs` 195 → 198. Tầng trình duyệt **1 077/1 077 ca · 31 bộ ·
0 cảnh báo — giống hệt** khi chạy trên `app.js` **CŨ** lẫn **MỚI** (`gd1-tuoi` **94/94** trên cả
hai). Dữ liệu thật **nguyên trạng** (1 truyện · 3 hồ sơ · 2 nhóm tin nhắn · 4 ảnh; `khoaMat: []`)
và mọi khoá test đã dọn sạch. `src/CONTEXT.md` = **10 232 byte** (≤ 10 240).

### Đợt 6d — tách nốt bốn hàm cuối: `openSuaNgoaiHinh` + `renderDashboard` + `capIdMoi` + `openDaoDien` (tháng 9/2026)

Bốn hàm còn lại trên 150 dòng của `app.js` (`openSuaNgoaiHinh` **223**, `renderDashboard` **218**,
`capIdMoi` **172**, `openDaoDien` **153**) nay đã tách xong, cùng khuôn Giai đoạn 6/6b/6c —
`app.js` **7 578 → 6 839 dòng**. **Từ đây TOÀN BỘ `src/` không còn hàm nào quá 150 dòng**, và luật
đó được ghim bằng ca tĩnh (xem mục 6).

1. **`src/nhap.js` — đường NHẬP bản sao.** `capIdMoi` là **logic THUẦN** (không DOM, không kv)
   nên tách hẳn ra khỏi `app.js`: 6 hàm con — `capIdMoi` (điều phối) + `gomId` / `dichThamChieu` /
   `dichTinNhan` / `dichAnh` / `dichHoSo`. **Luồng nhập KHÔNG đổi:** `app.js` vẫn dựng dữ liệu thô
   → `napBanGhi(raw, "truyen", "", { choNhap: true, dongY18 })` (cửa vào Giai đoạn 5: kiểm hình
   dạng + nâng phiên bản) → rồi mới tới `capIdMoi`. Hai luật riêng giữ nguyên: **ảnh** chỉ lấy ảnh
   thuộc truyện này, **hồ sơ ngoại hình** chỉ lấy hồ sơ truyện tham chiếu (liên kết trỏ hồ sơ
   không đi kèm thì bị BỎ). Ca Node mới `tests/node/nhap.test.mjs` — 87 khẳng định.
2. **`src/ui/daoDien/` — 3 tệp** (màn "Chế độ Đạo diễn", trước là `openDaoDien` 153 dòng).
   `index.js` là vỏ (`openDaoDien(D)`); `daoDienFlow.js` **thuần, 0 import** (câu chữ + trạng thái
   của bốn nút, có ca Node riêng); `daoDienNut.js` là **bảng hành động cục bộ** `"data-act" ⇒ hàm`
   theo đúng khuôn `src/ui/suKien/*`, dùng chung `doiTrangThai()` cho bốn nút. **Hai điểm không
   được đổi:** cờ chống mở hai lần `D.app.daoDienDangMo` **chỉ** được xoá trong `onClose` (gỡ
   node modal trực tiếp sẽ để lại cờ bật ⇒ lần mở sau bị chặn IM LẶNG), và sự kiện gắn vào **thân
   modal** chứ không gắn `document` — điểm đăng ký toàn cục duy nhất vẫn là `bindGlobalEvents`.
3. **`src/ui/bangDieuKhien/` — 3 tệp** (màn "Bảng điều khiển", trước là `renderDashboard` 218
   dòng). `index.js` là vỏ; `bangDieuKhienFlow.js` **thuần** (nhãn chế độ, nhãn vai giao kèo, câu
   gộp "nhịp & ngôn ngữ", câu mẹo — có ca Node); `bangDieuKhienHtml.js` giữ **chuỗi HTML từng
   khối** (hero · nhân vật · hành trình · rơi chương · tổng quan · giao kèo · sổ tri thức · đạo
   diễn · thư viện ảnh · biên niên). Thứ tự cột trái/phải giữ NGUYÊN.
4. **`src/ui/suaNgoaiHinh/` — 3 tệp** (màn "Sửa hồ sơ ngoại hình", trước là `openSuaNgoaiHinh`
   223 dòng). `suaNgoaiHinhFlow.js` **thuần** — câu chữ người dùng đọc + hằng `NH_MAX_ANH = 1024`
   (trước nằm trong `app.js`, nay về đúng tệp dùng nó) — có ca Node; `suaNgoaiHinhHtml.js` giữ
   chuỗi form; `index.js` giữ luồng (modal, ảnh tạm `anhTam`, lưu, nháp AI). **Ba điểm không được
   đổi:** ảnh trong form CHƯA phải ảnh đã lưu; **lưu hỏng ⇒ GIỮ NGUYÊN form**; **lỗi AI ⇒ KHÔNG
   mất bản nháp** người dùng đang có.
5. **Kiểm chứng "không đổi hành vi".** Kịch bản tất định phủ CẢ BỐN vùng (bảng điều khiển hai
   chế độ · màn Đạo diễn + đổi hội thoại + modal con · sửa hồ sơ (tạo mới / có liên kết + có ảnh
   / không liên kết / thiếu mô tả / thiếu tên / LƯU / HUỶ / `focusYeuCau` / `focusAnh`) · nhập bản
   sao qua `napBanGhi` + `capIdMoi`) cho ra JSON **144 984 ký tự GIỐNG TỪNG BYTE** giữa `app.js`
   **CŨ** (6c) và **MỚI** (6d) — cùng một hash. Kịch bản chạy trên bản CŨ bằng cách hoán `src/**`
   sang bản 6c (đã sao lưu), chạy lại, so byte, rồi khôi phục.
6. **Luật 150 dòng nay áp TOÀN `src/`.** Ca tĩnh trong `tests/node/goi-chung.test.mjs` đổi từ
   "mọi hàm trong `src/ui/`" thành "mọi hàm trong `src/**`" — quét **cả `app.js` và các tệp lõi**
   (đếm dòng khai báo cột 0 tới dòng `}` cột 0, không dùng regex). Hiện đếm được **764 hàm** và
   không hàm nào quá 150 dòng.
7. **Quét ngược tên/id thật (chốt chặn trước khi đóng gói).** Bộ `tests/browser/rr-ten-that.js`
   đọc **dữ liệu THẬT trong kv (chỉ trong bộ nhớ)** — tên truyện, tên nhân vật, tiêu đề hội thoại,
   tên hồ sơ, mọi id + **thân id ≥ 6 ký tự** — rồi quét **mọi tệp sẽ vào gói** (tiêm qua
   `window.__tvGoi`) để tìm chúng; khớp ⇒ bộ test ĐỎ, chỉ báo **tệp + số dòng**, **TUYỆT ĐỐI
   KHÔNG in chuỗi khớp**. Bỏ qua chuỗi < 4 ký tự và từ/cụm thông dụng, so ở **ranh giới từ**. Bộ
   này chạy **ĐẦU TIÊN** trong `DANH_MUC` (lúc đó kv chỉ còn dữ liệu thật) và **BẮT BUỘC chạy
   trước mỗi lần đóng gói**.

**Kiểm chứng Đợt 6d:** tầng Node **22 tệp, 5 233 khẳng định, 0 không đạt** (mốc 6c: 18 tệp,
4 071) — thêm `nhap.test.mjs` **87**, `daoDienFlow.test.mjs`, `bangDieuKhienFlow.test.mjs`,
`suaNgoaiHinhFlow.test.mjs`; `goi-chung.test.mjs` 1 793 → **2 937** (thêm hai bảng DEPS, hai màn
mới trong `MAN_HINH`, và ca 150 dòng quét toàn `src/`). Tầng trình duyệt **1 082/1 082 ca ·
32 bộ · 0 cảnh báo**, trong đó ca quét ngược **5/5** và **0 tệp rò rỉ**. Dữ liệu thật nguyên
trạng, mọi khoá test đã dọn. `src/CONTEXT.md` = **10 198 byte** (≤ 10 240).

**Hai bẫy mới của Đợt 6d:**

- **Bảng DEPS PHẢI viết nhiều dòng.** Phép đọc bảng của ca "DEPS hai chiều" cắt từ `const X = {`
  tới dòng `};` **đầu tiên ở cột 0**. Một bảng viết gọn một dòng (`const X = { a, b };`) làm phép
  cắt chạy tuốt sang tận bảng/cấu trúc sau ⇒ ca báo hàng loạt khoá lạ (`title`, `actions`…). Đây
  là bẫy của **công cụ kiểm**, không phải của mã — nhưng nó chỉ lộ ra khi bảng mới viết một dòng.
- **Ca tự-kiểm-tra của phép quét cũng phải đúng cơ chế.** Bản đầu của `rr-ten-that.js` kiểm "bỏ
  qua chuỗi ngắn" bằng cách dò `"ab"` trong `x "ab"` — nhưng hàm khớp đòi **ranh giới từ**, nên
  `ab` giữa hai dấu nháy VẪN khớp; ca tự kiểm sai và luôn ĐỎ. Đã sửa thành khẳng định trên **chính
  bộ mẫu** (mọi mẫu ≥ 4 ký tự và không mẫu nào là từ thông dụng) + một ca riêng cho ranh giới từ.

**Luật đóng gói mới:** gói phát hành **KHÔNG** chứa thư mục `.git`; bước kiểm sau khi tải lại URL
phải khẳng định gói giải nén **không có `.git`**.

## Đợt sửa lỗi theo bản rà soát (tháng 9/2026)

Đã sửa xong toàn bộ P0 và P1, cùng phần lớn P2. Ghi lại để lần sau không sửa lại
hoặc vô tình làm hỏng:

**P0 — đều đã sửa và có kiểm thử trong preview:**

1. **Từ khoá dừng khi AI đang viết.** `tinHieuCanh()` không còn `return` khi
   `app.streaming`; nó gọi `dungSinhVaLuu()` (đặt `app.stopRequested`, gọi
   `AI.stopCurrent()`, chờ lượt hiện tại kết thúc) rồi mới đẩy tín hiệu. Mọi vòng
   lặp sinh phản hồi (`generateTurn`, `tinHieuCanh`) đều `break` khi
   `app.stopRequested`. Phần văn bản đã sinh vẫn được lưu (đánh dấu `daDung`, hiện
   nhãn “đã dừng”), không bị coi là lỗi. Nút **Dừng** còn đổi chỗ nút Gửi trong
   composer nên luôn bấm được.
2. **Tóm tắt không mất ký ức cũ.** `tomTatMotDoan()` luôn *gộp* bản tóm tắt cũ với
   đoạn mới (bản cũ nằm trong khối “Tóm tắt trước đó … phải giữ lại”), không thay
   thế. `maybeCompact` truyền `tomTatCu` và hoàn tác nếu ghi thất bại.
3. **Kết chương không bỏ sót đoạn giữa.** `concludeChapter` dựng **bản tóm tắt liên
   tục** cho từng hội thoại: `chiaDoan()` cắt diễn biến thành các đoạn ≤
   `CFG.soKyTuMoiDoanTomTat` rồi gộp dần; chỉ `CFG.soTinNhanGiuLaiKhiKetChuong` tin
   cuối giữ nguyên văn. `tomTatMotDoan` **không dùng `buildLog`** (buildLog cắt còn
   36 tin cuối — chính là nguyên nhân cũ làm rơi đoạn giữa). Bản tóm tắt liên tục
   được ghi ngược vào `conv.tomTat`/`tomTatDen` qua `res.tomTatTheoHt`.
4. **Lỗi lưu không bị nuốt.** `store.js` ném `LoiLuu` (có phân biệt `laLoiHetCho` để
   báo “bộ nhớ đã đầy”); `persistMessages`/`pushMessage`/`replaceMessages`/`luuAnh`/
   `xoaAnh`/`deleteStory`/`createStory`/`saveStory` đều **hoàn tác** cache/chỉ mục khi
   ghi hỏng. Phía app: `luuTruyen()`, `luuTinNhan(hoanTac)`, `themTinNhan()`,
   `baoLoiLuu()` hiện toast và không báo thành công giả. `loadMessages` ném lỗi thay
   vì trả mảng rỗng (tránh ghi đè dữ liệu thật bằng rỗng).
   Phản hồi lỗi của AI **không** ghi vào bản ghi truyện nữa: chúng nằm trong
   `app.loiTam` và hiện kèm nút “Thử lại” (nếu ghi vào, lượt sau AI sẽ đọc nhầm).
5. **Viết lại tin nhắn cũ.** `regen-msg` chỉ viết lại ngay khi là tin cuối; nếu ở giữa
   thì mở `moVietLaiTinGiua()` với hai lựa chọn: **Tạo nhánh mới** (sao chép tiền tố
   sang hội thoại mới rồi viết lại ở đó — bản cũ còn nguyên) hoặc **Cắt và viết lại**.
6. **Sửa/xoá tin nhắn đã tóm tắt** → `voHieuTomTat(conv, idx)` xoá `conv.tomTat`
   và đưa `tomTatDen` về 0, rồi gọi `maybeCompact` để tóm lại từ đầu.

**P1:**

- **Tạo nhanh bằng một prompt**: `openNewStoryModal` có hai chế độ
  (`data-pane="nhanh" | "nangcao"`, trạng thái ở `body.dataset.cachTao`). Chế độ nhanh
  gọi `AI.generateQuickStory()` → hiện bản nháp cho sửa (tên, mô tả, bối cảnh, luật,
  người chơi, mục tiêu, danh sách nhân vật) → `taoTruyenNhanh()`.
- **Mobile**: công cụ tin nhắn luôn hiện và ≥ 42px; thao tác phụ của header gom vào
  menu `⋯` (`.chat-more-btn` + `.chat-actions.open`); thanh giao kèo thu gọn còn một
  dòng (`.gk-bar-toggle`, `app.gkMo`) nhưng **nút Từ khoá dừng luôn hiện**.
- **Không mất bản nháp modal**: “Nhân vật mới” trong modal hội thoại mở chồng lên
  (`openCharacterEditor(..., {onSaved})`) và tự chọn nhân vật vừa tạo; “Tuỳ chọn
  truyện” gọi `luuNhapNhay()` trước khi mở Giao kèo / Sổ tri thức; Escape chỉ đóng
  modal trên cùng (`modal()` so `rootEl.lastElementChild === wrap`).
- **Quyền riêng tư**: ghi rõ trong footer thư viện và trong Cài đặt — dữ liệu lưu cục
  bộ, nhưng ngữ cảnh liên quan được gửi tới dịch vụ AI khi người dùng gọi tính năng.
- **18+**: `docGiaoKeo()` chỉ bật giao kèo khi `nguoiLon` đã được xác nhận; tick
  “Bật giao kèo” sẽ mở hộp thoại xác nhận 18+ (huỷ thì tự bỏ tick). Nhân vật có thêm
  `tuoi` + `nguoiLon` (hiện trong hồ sơ gửi cho AI).
- **Sao lưu dễ thấy hơn**: nút **Sao lưu** ở thư viện (`xuatTatCa()`), và dòng dung
  lượng IndexedDB (`dungLuongUocTinh()` + `hienDungLuong()`, cảnh báo khi ≥ 80%).

**P2:**

- `PHIEN_BAN_TRUYEN` (nay = 6) + `chuanHoaTruyen()` / `chuanHoaTinNhan()` khi nhập file và
  khi đọc tin nhắn; nhập truyện ánh xạ tin nhắn **theo ID hội thoại** (`ghiTruyenNhap()`,
  không dựa vào thứ tự khoá JSON). Luồng nhập đã được viết lại thành hai chế độ tách
  bạch — xem mục **Nhập truyện (hai chế độ)**.
- Bộ đệm lorebook (`mucKhop`) dùng **băm nội dung** (`bam()`) của cửa sổ quét và của
  toàn bộ mục, nên sửa tin nhắn mà giữ nguyên độ dài vẫn làm cache hết hiệu lực.
- A11y: `role="dialog"` + `aria-modal` + focus trap trong Tab, `aria-label` tự gắn cho
  input đứng sau `label.field-label`, `:focus-visible`, `prefers-reduced-motion`, và
  nâng `--text-3` để chữ phụ đủ tương phản.

**Còn lại (chưa làm, cố ý):** tách `app.js` (~4.000 dòng) theo tính năng — chỉ nên
làm khi đã có bộ test thật; hiện giữ nguyên một file cho dễ sửa.

## Đợt rà soát phát hành (bản kiểm tra nguồn + test cô lập) — tháng 9/2026

Bản rà soát này chạy trên chính cây `src/` (không phải bản đã lưu), với **test cô lập**
(ép lỗi ghi/xoá ở từng bước) cộng với **test trong preview thật**. Năm lỗi chặn phát
hành và các lỗi P1 đều đã sửa; ghi lại đây để lần sau không vô tình làm hỏng lại.

### P0 — từng lỗi và cách chặn

1. **Mất dữ liệu khi xoá (thao tác nhiều khoá không nguyên tử).** Xoá tin nhắn/ảnh xong
   mới tới bản ghi truyện; hỏng bước cuối là mất tin nhắn mà truyện vẫn còn.
   `store.js` có `chupNhieuKhoa` / `traNhieuKhoa` / `giaoDichKV`; `deleteStory` là một
   giao dịch có ảnh chụp + hoàn tác. Phía app có `giaoDichApp(khoá, chạy, việc)` dùng
   chung cho `xoaHoiThoai`, `xoaAnhKhoiTruyen`, `catVaLuuLai`, `taoNhanhVaLuuLai`; nó
   chụp cả `messagesCache`/`anhCache` (bản sao nông từng phần tử) và trả
   `{ok, kq, loi, hong}`. **Không** đóng modal và **không** báo “đã lưu/đã xoá” khi
   `luuTruyen()` trả `false`.
2. **Khe hở của từ khoá dừng.** Bấm Dừng trong lúc `pickSpeakers()` đang chọn người nói
   thì lượt mới vẫn chạy tiếp, và `streamText()` còn tự xoá cờ dừng. Nay:
   `ai.js` có `moPhienSinh()` (mở phiên cho mỗi lần gọi AI độc lập) + `daYeuCauDungSinh()`;
   `streamText()` **không** xoá cờ; `generateTurn()` kiểm tra cờ ngay sau `await pickSpeakers`
   rồi `ketThucLuot()`; `streamGroupReply()`/`streamOneReply()` trả `null` nếu đã dừng.
3. **Tạo nhanh BDSM lách cửa 18+.** Luồng nhanh tự bật `giaoKeo.bat` khi chọn thể loại
   BDSM/tích ô, không qua hộp xác nhận; nhân vật mặc định `nguoiLon: true` và tuổi < 18
   không khoá được. Nay mọi đường (Tạo nhanh “Dựng bản nháp”, thể loại BDSM, nút “Bật
   giao kèo”, nhập file) đều đi qua `xacNhan18Plus()`; `newCharacter().nguoiLon = false`;
   `laNguoiLon()` đòi tuổi số ≥ 18 hoặc cờ xác nhận tường minh; `chanGiaoKeo()` khoá giao
   kèo khi có nhân vật ghi tuổi < 18 (áp cả trong `createStory`/`saveStory`); ô tuổi < 18
   tự bỏ tick và khoá ô “người trưởng thành”. Ở bước **TẠO** truyện, từ chối cửa 18+ thì
   **không tạo truyện** (giữ hộp mở để người dùng bỏ tích hoặc xác nhận lại).
4. **File nhập chèn mã qua ảnh.** `rec.dataUrl` từ JSON nhập bị nối thẳng vào `innerHTML`
   (`x" onerror="…` tạo được thuộc tính sự kiện). Nay `laDataUrlAnh()` chỉ nhận
   `data:image/(png|jpe?g|webp|gif|avif|bmp);base64,…` hoặc URL http(s) sạch (không nháy,
   không `<`, không khoảng trắng); bản ghi sai bị **bỏ hẳn** trong `chuanBiNhap`/`capIdMoi`;
   avatar nhân vật sai bị xoá trong `chuanHoaTruyen`; mọi chỗ dựng ảnh dùng `ganAnhVao()`
   (`createElement("img") + .src`) thay vì ghép HTML.
5. **Tách nhánh nhân đôi sự kiện toàn truyện.** `taoNhanhVaLuuLai()` sao chép cả sự kiện
   `htId=""` thành một sự kiện “toàn truyện” thứ hai, nên `tinhTrangThai()` cộng tác động
   hai lần cho mọi hội thoại (đo được: tin tưởng 7 → 9 chỉ vì tạo bản sao). Nay sự kiện
   `htId=""` **không** bị sao chép; lớp hé lộ riêng của nhánh nằm trên
   `conv.vgHeLo` (vật chất hoá từ sổ hiệu lực của hội thoại cha, chỉ những nguồn nằm trước
   điểm rẽ). `nguonHieuLuc()`/`mucTrong()`/`bietTrong()` trong `thoiGian.js` đều nhận
   `conv`; `tinhTrangThai()` lọc sự kiện toàn truyện theo `conv.vgMocLuc`.

### P1 — đã sửa

- **`catDieuKhien()` cắt ở mọi dấu `<`** → nay chỉ cắt ở marker ĐÃ BIẾT (`viTriMarker`) hoặc
  ở hậu tố đang là tiền tố marker (`duoiLaTienToMarker`). `<3`, `2 < 10`, `<<ngạc nhiên>>`
  sống sót; `<<HI` đang stream dở vẫn bị cắt.
- **`getAnh()` nuốt lỗi đọc** → nay **ném** `LoiLuu("…", "đọc")`; đường chỉ-hiển-thị dùng
  `getAnhMem()` (nuốt lỗi, hiện khung ảnh trống). `xuatTruyen()`/`xuatTatCa()` gom ảnh thiếu:
  đọc lỗi ⇒ **DỪNG**, không tải file, báo rõ; chỉ thiếu dữ liệu ⇒ hỏi trước rồi vẫn xuất
  kèm cảnh báo “THIẾU N ảnh”.
- **Bỏ qua kết quả `await luuTruyen(...)`** → đã kiểm tra ở ~20 chỗ (thêm ảnh, sổ
  tri thức, sửa hội thoại, kết chương, `tinHieuCanh`, Tuỳ chọn truyện, giao kèo, Đạo diễn…).
  Hỏng thì hoàn tác thay đổi trong RAM, giữ modal mở, không báo thành công giả.
- **Nhánh ghi tin nhắn nhưng hỏng lưu truyện** → để lại khoá `tinNhan` mồ côi. Nay nhánh đi
  qua `giaoDichApp([["cotTruyen", story.id], ["tinNhan", moi.id]], …)`.

### Quyết định có chủ ý trong đợt này

- **Hai truyện thật đang có** (`«id thật»`, `«id thật»`) vẫn giữ
  `giaoKeo.bat = true`. Nhân vật của chúng **không ghi tuổi số** và có cờ `nguoiLon: true`
  do người dùng tự bật, nên `chanGiaoKeo()` trả về chuỗi rỗng: đây là dữ liệu cũ được giữ
  nguyên (grandfathered), không bị hạ cờ oan.
- **Từ chối cửa 18+ ở bước TẠO truyện nhanh ⇒ không tạo truyện**, thay vì âm thầm tạo
  truyện không kèm BDSM. Người dùng bỏ tích hoặc xác nhận rồi bấm lại; thông báo nói rõ.

### Kiểm thử đã chạy cho đợt này (193 ca, preview thật, AI giả qua `root.aiTextPlugin`)

| Bộ | Số ca | Nội dung |
| --- | --- | --- |
| T1 | 33 | giao dịch nhiều khoá: ép lỗi ở từng bước ghi/xoá của `deleteStory`, `xoaHoiThoai`, `xoaAnhKhoiTruyen`, `catVaLuuLai`, `taoNhanhVaLuuLai` (kèm đối chứng thành công) |
| T2 | 12 | cờ dừng: bấm Dừng khi `pickSpeakers` đang treo ⇒ đúng **một** lời gọi AI, không có tin AI, lượt sau vẫn chạy |
| T3 | 24 | cửa 18+: Tạo nhanh (cả ô tích lẫn thể loại BDSM), huỷ/xác nhận, `laNguoiLon`/`chanGiaoKeo`, nhân vật 17 tuổi, khoá giao kèo khi lưu |
| T4 | 25 | `laDataUrlAnh`, ảnh nhập độc hại bị bỏ ở cả hai chế độ, nhập thật qua hộp thoại (cửa 18+), DOM không có thuộc tính sự kiện, payload không chạy |
| T5 | 18 | sự kiện toàn truyện chỉ còn **một** bản chuẩn; nhánh không nhân đôi tác động (7, không phải 9); nhánh trước/sau lần hé lộ |
| T6 | 21 | `catDieuKhien`: `<3`, `2 < 10`, `<<ngạc nhiên>>` sống sót; marker bị cắt; tích hợp một lượt gửi thật có `<3` vào tới tin nhắn + DOM |
| T7 | 12 | xuất bản sao lưu: đọc ảnh lỗi ⇒ DỪNG (không tải file); thiếu dữ liệu ⇒ hỏi trước, huỷ thì không tải, đồng ý thì tải kèm cảnh báo |
| helo-logic / helo-ui / helo-import / helo-cut | 11 + 22 + 6 + 9 | hồi quy sổ hé lộ (đã cập nhật ca 13 cho luật mới: nhánh **không** sao chép sự kiện toàn truyện) |

Cuối mỗi bộ đều soát lại hai truyện THẬT (số hội thoại + số tin nhắn khớp từng khoá).

### Đợt rà soát cuối — ba mục còn lại của bản kiểm tra nguồn

1. **Ảnh đang sửa vẫn bị ghép vào `innerHTML`.** `openTaoAnh()` dựng khung xem trước bằng
   chuỗi `'<img src="' + suaAnh.dataUrl + '">'`, nên một bản ghi ảnh CŨ nằm sẵn trong
   IndexedDB (không cần qua file nhập) vẫn tạo được thuộc tính `onerror`. Nay khung rỗng
   được dựng trước, rồi `paintPreview()` gọi `ganAnhVao()` (DOM + `.src`, đã lọc qua
   `laDataUrlAnh()`) — áp cho cả ảnh đang sửa.
2. **Sửa/xoá tin nhắn chưa phải giao dịch nhiều khoá.** `save-edit` và `del-msg` ghi
   `tinNhan`, xoá ảnh, vô hiệu cảnh đã khép rồi mới ghi `cotTruyen`; hỏng bước cuối là
   mất tin nhắn/ảnh mà trạng thái truyện chưa đổi. Nay cả hai đi qua
   `giaoDichApp([["cotTruyen", story.id], ["tinNhan", conv.id], …["thuVienAnh", anhId]])`.
   `del-msg` để lỗi xoá ảnh **ném ra** (trước đây nuốt lỗi ⇒ có thể còn khoá ảnh mồ côi),
   và chỉ báo "đã vô hiệu cảnh…" sau khi TOÀN BỘ giao dịch thành công. Giao diện cũng chỉ
   đóng khi giao dịch xong: `save-edit` hỏng thì hộp sửa vẫn MỞ và giữ nguyên chữ vừa gõ
   (giao dịch đã trả nội dung cũ về, không bắt người dùng gõ lại).
3. **`ketThucPhien()` bỏ qua kết quả lưu.** Lần ghi cuối hỏng nhưng mốc phiên vẫn bị coi là
   `xong` và giao diện xoá trạng thái lỗi. Nay hàm trả về `true/false`; hỏng thì trả các
   mốc trong RAM về đúng kv (`phien`, `daXuLyLuc`, `hoatDongLuc`, `ghiMocLuc`), giữ phiên ở
   `thuLai` kèm dòng báo lỗi + nút Thử lại, và `chayPhienVangMat()` **không** báo
   "Trong lúc bạn vắng mặt có N diễn biến mới".

| Bộ | Số ca | Nội dung |
| --- | --- | --- |
| T8 | 72 | ảnh độc hại NẰM SẴN trong IndexedDB (thẻ ảnh, khung xem lớn, bảng Dựng lại — không qua file nhập) + đối chứng ảnh hợp lệ vẫn hiện đúng; ép lỗi từng bước khi xoá tin có ảnh & có cảnh đã khép (ghi tin nhắn / xoá ảnh / ghi cốt truyện) và khi sửa tin nhắn (hộp sửa phải vẫn mở + còn chữ vừa gõ), kèm ca đối chứng; ép lỗi lần ghi cuối của `ketThucPhien` rồi bấm Thử lại |

Tổng sau hai đợt rà soát: **265 ca** (T1–T8 + bốn bộ hồi quy sổ hé lộ), tất cả đạt;
hai truyện thật được soát lại sau mỗi bộ (số hội thoại và số tin nhắn khớp từng khoá).

### Điểm neo kiểm thử trong app: `window.__tv_test`


`boot()` trong `src/app.js` gán `window.__tv_test` phơi một số hàm nội bộ (`app`, `AI`,
`store`, `luuTruyen`, `giaoDichApp`, `taoNhanhVaLuuLai`, `apDungHeLo`, `xuatTruyen`, …) để
kiểm thử tự động chạy được trong preview. **Đây không phải API của ứng dụng** — không
dùng ở đâu trong luồng thật, không phải dữ liệu của người dùng, và xoá đi cũng không ảnh
hưởng gì (xoá đúng khối `window.__tv_test = { … };` trong `boot()`). Tương tự,
`window.__tv_vg` chỉ phục vụ kiểm thử thời gian vắng mặt.

Từ đợt "thư viện ngoại hình", khối này phơi thêm: `newNgoaiHinh`, `loadNgoaiHinh`,
`getNgoaiHinh`, `dsNgoaiHinh`, `luuNgoaiHinh`, `xoaNgoaiHinh`, `ghepPromptNgoaiHinh`,
`tachNgoaiHinh`, `gopLoaiTruNgoaiHinh`, `khoiNgoaiHinh`, `nhanDienNgoaiHinh`,
`ungVienNgoaiHinh`, `demLienKetNgoaiHinh`, `demDungNgoaiHinh`, `coLoiDocNgoaiHinh`,
`thamChieuMo`, `hoSoCuaTruyen`, `tenUngVien`, `hoSoTheoId`,
`chuanHoaHoSo`, `tenHoSo`, `MARK_NGOAI_HINH`, `MARK_NGOAI_HINH_CU`, `ngoaiHinhEn`, `tranhEn`,
`canDichNgoaiHinh`, `boBanDichCu`, `luuBanDichNgoaiHinh`, `PHIEN_BAN_HO_SO`, `openNgoaiHinh`,
`openSuaNgoaiHinh`, `nhapHoSoNgoaiHinh`, `xuatNgoaiHinh`, `openNhapNgoaiHinh`, `docFileNhap`,
`nhanHoSoNhap`, `chonFileNgoaiHinh`, `idHoSoCuaTruyen`, `xoaHoSoNgoaiHinh`, `openTaoAnh`,
`openCharacterEditor`.

**Cách chạy lại nhanh:** mở preview → `page_eval` nạp `scratch/tests/audit-base.js` (điểm neo
`window.__A`, có `caiChan`/`datLoi` ép lỗi ghi qua `IDBObjectStore.prototype.put/delete`)
rồi nạp từng file `scratch/tests/audit-t*.js` trong **eval riêng** (mỗi file tự khai `const`).

**Thứ tự cho bộ "thư viện ngoại hình" (quan trọng):** trong **cùng một lần tải trang**, nạp
`audit-base.js` → `nh-fake-ai.js` (eval riêng, vì nó gán `root.aiTextPlugin`/`textToImagePlugin`)
→ `nh-lib.js` → `nh-io.js` → `nh-fix5.js` → `nh-thoat.js` → `nh-nguoichoi.js` → `nh-anh-en.js`.
`nh-io` **dùng dữ liệu thử do
`nh-lib` dựng** (hồ sơ "Sara", truyện `ct_zz1/ct_zz2`), còn `audit-t4/t5/t7/t8` **xoá mọi truyện
có tiêu đề bắt đầu bằng "ZZ"** — nên chúng phải chạy ở lần tải trang khác, hoặc trước cặp
`nh-lib → nh-io`.

**Hai luật kiểm thử đã trả giá bằng dữ liệu thật — đừng vi phạm:**

1. **`page_refresh` trước mỗi lượt chạy bộ test.** Mỗi bộ tự cài bẫy `URL.createObjectURL` /
   `HTMLAnchorElement.prototype.click` (và AI giả) qua một cờ `window.__NH_DL*`; cờ này chỉ cho
   cài **một lần mỗi lần tải trang**, nên **chạy lại bộ thứ hai trong cùng một lần tải trang**
   sẽ dùng bẫy của lượt trước với biến closure cũ ⇒ mọi ca "xuất file" báo "không có file" (lỗi
   giả, không phải lỗi sản phẩm). Đúng một lượt mỗi bộ trong một lần tải trang.
2. **Dọn hồ sơ test CHỈ theo `^nhz`** (và vài tên đã biết). Id hồ sơ **THẬT** cũng có dạng
   `nh_*`, nên bộ lọc `/^nhz|^nh_/` từng xoá sạch thư viện ngoại hình thật của người dùng ngay
   ở bước dọn đầu tiên. Mọi hồ sơ do test dựng đều được đặt id `nhz_*` (`mkHoSo`/`mk`,
   `nh-visual-setup` cũng đổi id `nh_` → `nhz_`). Trước khi chạy bộ nào, chốt dữ liệu thật
   (`scratch/tests/nh-real-*.json`) rồi so lại **byte-for-byte** sau khi chạy.

## Đợt Frontend polish (tháng 9/2026)

Đợt này **không đổi kiến trúc**, chỉ sửa hai va chạm class thật và làm gọn mật độ giao diện chat.

### P0 — hai va chạm class

1. **`.stat` dùng cho hai thứ khác nhau.** `.stat` vừa là thông số nhỏ trên thẻ truyện
   (hàng ngang) vừa là ô thống kê lớn ở Bảng điều khiển (ô dọc) — rule sau ghi đè rule
   trước nên hàng thông số của thẻ truyện có nguy cơ biến thành ô dọc. Nay tách hẳn:
   `.story-stat` (+ `.story-stat.muted`) cho thẻ truyện, `.dashboard-stat-grid` /
   `.dashboard-stat` / `.dashboard-stat-num` / `.dashboard-stat-lb` cho Bảng điều khiển.
2. **`.seg` dùng cho hai thứ khác nhau.** `.seg` vừa là khung chọn kiểu avatar (pill,
   `border-radius: 100px`) vừa là hai nút "Tạo nhanh / Thiết lập nâng cao" trong hộp
   Cốt truyện mới. Rule sau ghi đè nên bộ chọn avatar bị phình/sai bo góc. Nay nút tạo
   truyện là `.create-method-btn`; `.seg` / `.seg-btn` chỉ còn dùng cho segmented control
   (bộ chọn kiểu avatar). Khi sửa nhớ `data-act`/handler: selector trong `openNewStoryModal`
   cũng đã đổi theo (`.cach-tao .create-method-btn`).

### P1 — mật độ giao diện chat

- **Thanh trạng thái cảnh** (`thanhCanhBar()` trong `src/app.js`, CSS `.scene-bar*`): gom
  gợi ý · chọn người trả lời · giao kèo · khép cảnh · hiện diện vào **một** thanh thu gọn
  được. Trạng thái mở/đóng là `app.thanhCanhMo`; nút ⋯ đổi thẳng class trên DOM
  (`data-act="toggle-scene-bar"`) để **không mất vị trí cuộn**. Dòng tóm tắt trên đầu luôn
  cho biết cảnh đang thế nào. **Nút "Từ khoá dừng" luôn nằm trên ĐẦU thanh, không bao giờ
  bị thu gọn**, và được bỏ khỏi bảng giao kèo để không còn hai nút trùng nhau.
  Gợi ý lời thoại (`suggRowHtml()`) **ép mở** thanh (`const mo = !!suggHtml || …`) để gợi ý
  vừa sinh ra không bị ẩn. `updateComposerState()` giờ vẽ lại **cả** thanh trạng thái cảnh
  lẫn ô nhập (trước chỉ có ô nhập) — vì gợi ý/dòng "đang nghĩ…" nằm trong thanh.
- **Công cụ tin nhắn trên màn hình hẹp**: chỉ còn MỘT nút `⋯` 42px
  (`data-act="toggle-msg-tools"`, class `.msg-more`); các nút sửa/xoá/sao chép/dựng ảnh…
  bị ẩn bằng CSS cho tới khi `.msg-tools` có class `.open`. Toggle chỉ đổi class, không vẽ lại.
- **Header hội thoại** chỉ giữ **Đạo diễn** + **Khép cảnh**; Dựng ảnh, Sửa hội thoại,
  Biên niên sử, Xoá hội thoại và Sổ tri thức vào menu `⋯` (`.chat-menu` / `.chat-menu-item`,
  mở/đóng bằng thuộc tính `hidden` + `aria-expanded`).
- **Cột đọc**: bề rộng văn truyện `900px → 780px` (`.msg`, `.input-row`, `.composer-hint`,
  `.sugg-row`, `.presence-bar`, `.khep-bar`), chữ nội dung `15.8px` / `line-height: 1.65`
  (mobile `15.2px`).
- **Ẩn dòng "Enter để gửi…" trên mobile** (`.composer-hint { display: none }` ở ≤560px);
  **gợi ý lời thoại trên mobile là một hàng cuộn ngang** (`.sugg-row` nowrap + `overflow-x`,
  `.sugg` `ellipsis` + `max-width: 74vw`).
- **`aria-label` cho nút chỉ có icon**: `ganAriaNhan()` trong `src/dom.js` quét
  `button.icon-btn` / `button.tool` không có chữ và lấy `title` làm `aria-label`
  (gọi trong `afterRender()` và trong `modal()`); nút đóng modal cũng đặt nhãn trực tiếp.
- **Chế độ tập trung** (`app.tapTrung`, lưu ở `store.settings.tapTrung`, bật trong menu `⋯`):
  `.app.tap-trung` ẩn sidebar + nút mở sidebar, và `thanhCanhBar()` tự thu gọn thanh trạng
  thái khi không có gợi ý nào đang chờ.
- Không thêm gradient/hiệu ứng/animation mới; `prefers-reduced-motion` vẫn giữ nguyên.

### Kiểm thử đã chạy cho đợt này (preview thật)

- **265 ca hồi quy cũ vẫn đạt** (T1 33 · T2 12 · T3 24 · T4 25 · T5 18 · T6 21 · T7 12 · T8 72 ·
  helo-cut 9 · helo-import 6 · helo-ui 22 · helo-logic 11) — không bộ nào phụ thuộc selector cũ.
- Đo trực tiếp trên preview (không chỉ nhìn ảnh): `.story-stat` = `flex` hàng ngang 1 hàng/thẻ;
  `.dashboard-stat` = 3 cột × 2 hàng, hướng cột; `.create-method-btn` = `border-radius: 9px`;
  `.seg` vẫn `100px` + padding `2px`; `.scene-bar` đóng chỉ cao 39px ở 390px; chỉ có **1**
  `[data-act="safeword"]` trong DOM; `.sugg-row` `scrollWidth 849 > clientWidth 372` (đúng 1 hàng);
  `.msg-more` = 42×42; không có cặp phần tử nào trong thanh trạng thái chồng nhau và không tràn
  (hàm dò giao hình chữ nhật đệ quy); không tràn ngang ở cả 390px và 1280px.
- Chụp ảnh + soi bằng `vision` ở desktop (chat, Bảng điều khiển, thư viện) và mobile (đóng/mở
  thanh trạng thái): không còn chữ xuống dòng lỗi, không chồng chéo, không cắt chữ.
- Sau khi chạy: thư viện vẫn đúng **2 truyện thật** (68 / 54 tin nhắn), không khoá mồ côi,
  `store.settings.tapTrung = false` như mặc định.

## Đợt "phân biệt đối thoại và hành động" (tháng 9/2026)

Thêm một **lớp hiển thị thuần** cho bong bóng chat: tách lời thoại / hành động / văn bản
thường để dễ theo dõi mạch truyện. Không đổi kiến trúc, không thêm schema truyện, không
gọi thêm AI, **không bao giờ sửa `noiDung` gốc** — sao chép, sửa tin, xuất/nhập, tóm tắt
và prompt gửi AI vẫn dùng nguyên văn (đã kiểm thử đối chiếu).

### Luật nhận diện (cố ý đơn giản — thiếu dấu hiệu thì để nguyên)

| Dấu hiệu | Phần được tách |
| --- | --- |
| `*…*` | hành động / miêu tả (chữ trong span **bỏ** hai dấu sao) |
| `"…"` hoặc `“…”` | đối thoại (giữ nguyên dấu ngoặc kép đang có) |
| dòng bắt đầu bằng `-`, `–`, `—` | **cả dòng** là đối thoại |

- Một tin nhắn **xen kẽ** nhiều đoạn hành động/đối thoại/thường tuỳ ý.
- Chỉ tách khi dấu **đóng** đã có; dấu mở chưa đóng (đang stream) nằm nguyên trong văn bản
  thường và tự định dạng lại ngay khi dấu đóng xuất hiện.
- Một đoạn **không vượt qua dòng trống**: `timDauDong()` bỏ qua dấu đóng nằm sau `\n\n`.
- `*` chỉ mở hành động khi đứng đầu chuỗi hoặc sau khoảng trắng/dấu câu (`[\s(«“"—–]`) ⇒
  `2*3*4`, `a*b` yên; chữ trong `*…*` không được bắt đầu/kết thúc bằng khoảng trắng ⇒
  `* như một dấu *` yên.
- `"` không mở đối thoại khi đứng ngay sau chữ/số (`TRUOC_CHU_SO`) ⇒ `cao 1m75"` yên.
- `**đậm**` là một khối nguyên vẹn, không bị cắt vào giữa.
- **Không** đoán thêm: nội dung không đủ dấu hiệu giữ đúng kiểu văn bản cũ.

### Hiển thị (khác biệt vừa đủ)

- Đối thoại → `.dk-dt`: chữ sáng hơn (`--text-manh`), kiểu thường.
- Hành động → `.dk-hd`: chữ **nghiêng**, màu chữ phụ nhạt hơn (`--text-2`).
- Văn bản thường → không bọc gì, giữ style hiện tại. Không bubble con, không icon, không
  nhãn "Đối thoại/Hành động", không animation, không màu nổi bật.

Trong bong bóng chat, các đoạn gọi `dinhDangInline(…, false)`: `*…*` đã mang nghĩa hành
động nên dấu sao **không hợp lệ không quay về `<em>`** như kiểu cũ (tránh định dạng nhầm
chữ thường); `**đậm**`, `` `mã` ``, `_nghiêng_`, link và xuống dòng vẫn chạy như trước.
(Khi tắt, `fmtBongBong` gọi thẳng `fmt()` nên **mọi thứ** giống hệt kiểu cũ.)

Mọi đoạn đều đi qua `esc()` trước khi ghép HTML ⇒ `<3`, `2 < 10`, `<img src=x onerror=…>`
hiển thị an toàn, không tạo phần tử, không chạy payload (đã kiểm thử cả trong đoạn đối thoại).

### Công tắc trong Cài đặt hiển thị

`store.settings.phanBietLoiThoai` (mặc định **BẬT**, chỉ tắt khi người dùng tự bỏ tick), lưu
bằng đúng cơ chế cài đặt sẵn có (`saveSettings()` → `localStorage["truyenVai.caiDat"]`),
**không** thêm trường nào vào schema truyện. Đổi công tắc có hiệu lực **ngay** (gọi
`render()` nên tin cũ, tin mới và phần đang stream đều đổi theo) và giữ nguyên sau reload.

**`openSettings()`** (mới) là hộp **Cài đặt** — mở từ mục *Cài đặt hiển thị* trong menu `⋯`
của khung chat (`data-act="open-settings"`), ba khối `.set-sec`: **Hiển thị** (công tắc mới
+ chọn giao diện), **Tự động** (`autoOpening`, `autoChronicle`), **Ảnh cảnh mặc định**
(`anhPhongCach`, `anhKichThuoc`). Hàm này cũng **sửa một lỗi cũ**: `data-act="open-settings"`
trước đây đã được nối nhưng **không có hàm** `openSettings` (bấm nút Cài đặt ở thư viện là
ReferenceError), và theme / hai công tắc tự động / mặc định ảnh trước đó **không có giao
diện nào**.

### Prompt: quy ước viết, không phải điều kiện

`QUY_UOC_TRINH_BAY` (`src/ai.js`, cạnh `MOC_KHD`/`MOC_HET`/`MOC_KHEP`) chèn **một dòng** vào
5 chỗ: `replyAs` (lượt thường), hai TASK của chế độ chương / song song, `replyAsGroup`, và
`generateOpening` — nói rằng hành động/cử chỉ/miêu tả đặt trong `*dấu sao*`, lời nói trực
tiếp trong dấu ngoặc kép. Đây **chỉ là quy ước viết**: không có nhánh từ chối, không kiểm
tra model có tuân hay không — phản hồi luôn được nhận và hiển thị bình thường.

### Chỉnh sửa

- **Luật + hiển thị** → `src/dom.js`: `esc()`, `dinhDangInline(s, coNghieng)` (dùng chung,
  `coNghieng` chỉ bật cho đường cũ), `phanTichDoanThoai(t)`, `fmtBongBong(text, phanBiet)`;
  `fmt()` giữ nguyên hành vi cũ.
- **Gọi vào** → `src/app.js`: `batPhanBiet()`, `messageHtml()` (nhánh không stream) và
  `paintStreaming()`; công tắc + hộp Cài đặt ở `openSettings()`.
- **Mặc định** → `src/store.js` (`store.settings.phanBietLoiThoai = true`) — chỉ một khoá,
  đi qua `loadSettings`/`saveSettings` như cũ.
- **Kiểu dáng** → `src/styles.css`: `--text-manh` (cả hai theme), `.dk-hd`, `.dk-dt`,
  `.set-sec` / `.set-check` (hộp Cài đặt).
- **Prompt** → `QUY_UOC_TRINH_BAY` + 5 điểm dùng trong `src/ai.js`.
- **Cố ý KHÔNG làm**: parser Markdown đầy đủ, AI phân loại nội dung, chuẩn hoá lại nội dung,
  bubble con / nhãn / icon cho từng loại, đổi chiều rộng bong bóng.

### Kiểm thử đã chạy cho đợt này

`scratch/tests/dk-loi-thoai.js` (**41 ca, 0 lỗi**) phủ đúng 10 nhóm yêu cầu: (1) chỉ đối
thoại; (2) chỉ `*hành động*`; (3) xen kẽ; (4) nhiều dòng gạch ngang; (5) marker chưa đóng
lúc stream + tự định dạng khi đóng; (6) văn thường không bị định dạng nhầm (kể cả `1m75"`,
`2*3*4`, `* … *` rời, `_nghiêng_` cũ vẫn chạy); (7) `<3`, `2 < 10`, HTML độc hại an toàn;
(8) công tắc mặc định bật, bật/tắt có hiệu lực ngay, ghi vào cài đặt, hộp Cài đặt vẫn mở,
**giữ nguyên sau reload** (kiểm bằng `page_refresh` hai lần); (9) sao chép / ô sửa / JSON
xuất đều trả **nguyên bản** (spy clipboard + `URL.createObjectURL`, kv không đổi); (10)
bật/tắt **không đổi bề rộng bong bóng** và không tràn ngang ở cả 390px lẫn 1280px.

Đo trực tiếp trên preview: `.dk-hd` = `italic` + màu chữ phụ, `.dk-dt` = chữ thường + màu
sáng hơn, chữ thường giữ nguyên; ảnh chụp desktop + mobile 390px và hộp Cài đặt ở 390px đều
gọn, không tràn. **265 ca hồi quy cũ vẫn đạt** (T1–T8 + bốn bộ sổ hé lộ); sau khi chạy, thư
viện vẫn đúng **2 truyện thật** (33 / 35 và 28 / 23 / 3 tin nhắn), không khoá mồ côi,
`store.settings.phanBietLoiThoai = true`.

## Đợt "Gợi ý lời đáp" (tháng 9/2026)

Tách nội dung do AI gợi ý ra khỏi thanh **Trạng thái cảnh** thành **một khối riêng**, xếp
dọc và hiện đủ chữ — để so sánh và chọn trên mobile. Không đổi kiến trúc, không thêm schema
truyện, không gọi AI nền, không animation mới.

### Bố cục (trong `renderChat`)

```
hội thoại (.chat-scroll) → Trạng thái cảnh (.scene-bar) → Gợi ý lời đáp (.goi-y) → ô nhập (.composer)
```

- `goiYkhoiHtml()` (thay cho `suggRowHtml()` cũ) dựng khối; `thayKhoiChat(selector, html)`
  là cách vẽ lại một khối **tại chỗ** mà không đụng vị trí cuộn của mạch truyện (dùng ở
  `updateComposerState()` cho cả `.scene-bar` lẫn `.goi-y`).
- `thanhCanhBar(story, conv)` **không còn tham số gợi ý** và **không** chứa khối gợi ý nữa,
  nên thanh có thể trả `""` (không dựng) trong khi gợi ý vẫn hiện — đúng ý đồ tách bạch.
  `app.thanhCanhMo`/`app.tapTrung` chỉ còn ảnh hưởng tới chính thanh: thu gọn thanh hay bật
  **Chế độ tập trung** đều **không** làm mất khối gợi ý (đã kiểm thử bằng DOM).
- Khối chỉ hiện khi có gợi ý (hoặc có lỗi/đang tạo). Mỗi gợi ý là một thẻ `<button>` **xếp
  dọc**, `text-align:left`, `white-space:normal` + `overflow-wrap:anywhere`, chiếm hết bề
  rộng khối ⇒ hiện **đủ chữ, tự xuống dòng**, không ellipsis, không `line-clamp`, không cuộn
  ngang. CSS: `.goi-y*` (`src/styles.css`); các rule cũ `.sugg-row`/`.sugg` (kể cả rule
  mobile `white-space:nowrap; text-overflow:ellipsis; max-width:74vw`) đã **bị xoá** — chính
  chúng là thứ gây cắt chữ.
- Nội dung mỗi thẻ đi qua `fmtBongBong(esc…, batPhanBiet())`, nên `*hành động*` hiện đúng
  kiểu hành động như trong bong bóng chat, và mọi chuỗi của AI được escape trước khi vào
  `innerHTML`.

### Hành vi chọn & "Tạo hướng khác"

- Thẻ chọn gần nhất được tô sáng bằng **`app.suggChon`** (chỉ số, RAM, không lưu vào truyện):
  `use-suggestion` điền **nguyên văn** vào ô nhập, `focus()`, đổi class `.on`/`aria-pressed`
  **trên DOM** (không `render()` lại) — không tự gửi, không ghi tin nhắn, khối **không tự
  đóng**. Sửa bản nháp (sự kiện `input` của composer) không đụng tới highlight; chọn thẻ khác
  thì thay nội dung ô nhập và chuyển highlight.
- **"Tạo hướng khác"** (nút đầu khối, `data-act="suggest"` — dùng chung `onSuggest()` với nút
  ✨ trong ô nhập): `app.suggDangTao` bật ⇒ **chỉ nút đó** đổi sang loading (`disabled` +
  `.typing`); danh sách cũ và `app.draft` giữ nguyên trong lúc chờ; xong thì thay **toàn bộ**
  danh sách, `app.suggChon = -1` và **không** đụng ô nhập (chỉ chọn thẻ mới mới thay ô nhập).
  Chặn bấm chồng bằng `if (app.streaming || app.suggDangTao) return` và bỏ kết quả nếu đã đổi
  hội thoại (`app.convId !== htId`).
- **Lỗi**: `AI.suggestLines()` nay **ném lỗi** khi lượt gọi hỏng hoặc không đọc được gợi ý
  nào (trước đây `return []` ⇒ âm thầm xoá danh sách người dùng đang xem). `onSuggest` bắt
  lỗi ⇒ giữ nguyên danh sách + bản nháp, ghi `app.suggLoi` và hiện dòng lỗi kèm nút **Thử
  lại** (`data-act="suggest"`) ngay trong khối.
- Dọn danh sách + lựa chọn qua **`xoaGoiY()`** (`app.suggestions = []`, `suggChon = -1`,
  `suggLoi = ""`) ở: `openStory`, `openConv`, `goDashboard`, `onContinueAi` và `onSend`.
  Không có trường nào thêm vào schema truyện ⇒ export/import không đổi.
- Prompt `suggestLines` dặn rõ bộ gợi ý phải **khác nhau rõ rệt về ý định, cảm xúc hoặc hành
  động** (không chỉ đổi vài từ).

### Kiểm thử đã chạy cho đợt này

`scratch/tests/gy-goi-y.js` (**46 ca, 0 lỗi — chạy hai lượt ở 1280×900 và 390×844**) với AI
giả `scratch/tests/gy-fake-ai.js` (phải nạp ở page_eval **riêng** vì `root` phơi plugin qua
proxy). Phủ: gợi ý **không** nằm trong DOM của Trạng thái cảnh + đúng thứ tự bốn khối; thu
gọn thanh và bật **Chế độ tập trung** đều không làm mất gợi ý; 3 thẻ xếp dọc, hiện đủ chữ,
không ellipsis/`line-clamp`/cuộn ngang ở cả hai bề rộng; chọn thẻ chỉ điền ô nhập (số tin
nhắn và số lời gọi AI không đổi), có highlight, khối vẫn mở, sửa bản nháp không mất
highlight, chọn thẻ khác thì chuyển highlight + thay ô nhập; "Tạo hướng khác" giữ danh sách
cũ + bản nháp trong lúc chờ, chỉ một lời gọi AI, xong thì thay cả danh sách và bỏ highlight
mà **không** đụng ô nhập; AI lỗi giữ nguyên mọi thứ + hiện Thử lại; payload `<img onerror>`
không chạy và hiển thị đúng chuỗi thô; Từ khoá dừng vẫn nằm trong thanh, đang stream thì
không sinh gợi ý, gửi tin vẫn chạy (2 tin mới) và xoá danh sách, đổi hội thoại qua
`hashchange` thì xoá danh sách + lựa chọn. **265 ca hồi quy cũ vẫn đạt** (T1–T8 + bốn bộ sổ
hé lộ) và bộ "phân biệt đối thoại" 41 ca vẫn đạt; sau khi chạy, dữ liệu trong IndexedDB vẫn
nguyên (không khoá mồ côi), `tapTrung = false` và `phanBietLoiThoai = true`.

Ảnh chụp: `scratch/shots/gy-390.png`, `scratch/shots/gy-1280.png` (đã soi bằng `vision`:
khối riêng giữa thanh và ô nhập, 3 thẻ dọc đủ chữ, thẻ đầu có viền vàng, ô nhập chứa sẵn
gợi ý đang chọn).

## Đợt "Thư viện ngoại hình nhân vật v1" (tháng 9/2026)

Một **thư viện ngoại hình dùng chung ở cấp app**: mỗi hồ sơ là một con người với tên chính,
tuổi do người dùng khai, mô tả ngoại hình, điều cần tránh khi tạo ảnh và (không bắt buộc)
một ảnh tham chiếu. Khi tạo ảnh, app nhận diện tên/biệt danh được nhắc trong prompt rồi ghép
đúng ngoại hình của hồ sơ đã duyệt — **kể cả khi prompt có nhiều nhân vật**.

Đây **chỉ** là ngoại hình: tính cách, quan hệ, ký ức và lorebook vẫn thuộc từng truyện. Truyện
cũ **không bị** tự liên kết hay đổi tên, và không có gì được ghi vào nhân vật cũ khi cập nhật.

### Giới hạn THẬT của ảnh tham chiếu (đã kiểm tra plugin trước khi làm)

Đọc thẳng `imports/ai-text-plugin/main.pjs` và `imports/text-to-image-plugin/main.pjs`:

| Việc | Plugin | Thực tế |
| --- | --- | --- |
| AI **đọc** ảnh để tả lại | `ai-text-plugin` | **Có**: `instruction` là một mảng có **tối đa MỘT ảnh** png/jpeg/webp (< 20MB), chèn giữa phần bối cảnh và `TASK` |
| Máy vẽ **nhận** ảnh tham chiếu | `text-to-image-plugin` | **Không**: chỉ nhận prompt chữ. `referenceImage` đã bị **tắt phía máy chủ** (ghi chú ngày 2026-08-25 trong `imports/text-to-image-plugin/main.pjs`), tức hiện **không** có tác dụng |

⇒ KHÔNG có tham số "identity lock"/"reference image" nào để dùng, nên app **không** gọi nó.
Giao diện vì vậy ghi rõ **"Dùng mô tả từ ảnh"** — ảnh chỉ để AI soạn **mô tả**, không được gửi
trực tiếp vào máy vẽ, và app **không bảo đảm giữ nguyên khuôn mặt**. V1 lưu **một** ảnh tham
chiếu mỗi hồ sơ, nhúng thẳng (đã thu nhỏ, cạnh dài ≤ `NH_MAX_ANH = 1024`) vào bản ghi hồ sơ nên
hồ sơ là một khối tự chứa: xoá hồ sơ là hết ảnh, không có ảnh mồ côi. Trước khi phân tích ảnh,
form hiện dòng **"Ảnh có trong form sẽ được GỬI tới dịch vụ AI của Perchance…"**, và chỉ gọi
AI khi người dùng bấm nút — **mở hồ sơ không tự gọi AI, không tự phân tích ảnh**.

### Dữ liệu

- Folder kv **`thuVienNgoaiHinh`** (dùng chung mọi truyện cùng trình duyệt — **không** đồng bộ
  giữa thiết bị). Hồ sơ: `{ id, tenChinh, tuoi, moTa, tranh, anh, luc, suaLuc, phienBan }`.
  `id` có tiền tố `nh`. **Khoá dữ liệu là `id`, không bao giờ là tên** — trùng tên là hai người
  khác nhau.
- Truyện giữ **liên kết**: `nhanVats[].ngoaiHinhId` (ID ổn định, mặc định `""`) và
  `nhanVats[].bietDanh` (biệt danh **chỉ có hiệu lực trong truyện đó**). Ảnh cảnh đã dựng giữ
  `anh[].hoSoIds` = những hồ sơ đã dùng cho khung hình.
- `chuanHoaTruyen()` bổ sung hai trường này (mặc định rỗng, **không** tự suy theo tên) và
  `PHIEN_BAN_TRUYEN` **6 → 7**. Thư viện KHÔNG nằm trong `cotTruyen`, nên **xoá truyện không
  bao giờ xoá hồ sơ**, và `xoaNgoaiHinh()` không đụng truyện.
- `loadNgoaiHinh()` dựng lại chỉ mục RAM (`store.ngoaiHinh`, `store.ngoaiHinhById`) và **lọc
  ảnh không hợp lệ** khi đọc từ kv / file nhập (`laDataUrlAnh`): ảnh sai thì bỏ **ảnh**, giữ hồ sơ.
  **Đọc kv hỏng KHÁC "thư viện rỗng"**: hỏng thì giữ **nguyên bộ đệm cũ**, bật cờ
  `coLoiDocNgoaiHinh()`, và mọi đường xuất bản sao lưu phải hỏi lại trước khi ghi file.

### Form hồ sơ (giữ gọn)

Mở từ **Cài đặt → Thư viện ngoại hình**, hoặc từ editor nhân vật (khối "Liên kết hồ sơ ngoại
hình"). Form chính chỉ có **tên chính · tuổi · mô tả ngoại hình · đặc điểm cần tránh · khu vực
ảnh tham chiếu**; phần **AI nằm trong một `<details>` đóng sẵn** (tự mở khi vào từ nút "Tạo từ
mô tả / ảnh"), nên form không bắt người dùng điền hàng chục trường. Thông báo lỗi/lưu nằm
**ngoài** `<details>` để luôn thấy được.

- **Tạo hồ sơ bằng AI** (`AI.phacNgoaiHinh`): nháp từ mô tả tự do **và/hoặc** ảnh tham chiếu,
  trả về `{tenChinh, tuoi, moTa, tranh, xungDot}`. Chỉ **điền bản nháp**, **chưa lưu** — người
  dùng đọc, sửa rồi mới bấm Lưu. Prompt dặn: **không** tự bịa tuổi/chiều cao/đặc điểm bị che,
  **không** đưa quần áo–nền ảnh–tư thế trong ảnh vào đặc điểm cố định, mô tả và ảnh mâu thuẫn
  thì nêu ở mục **ĐIỂM CẦN CHỌN** (app hiện thành dòng "Điểm cần bạn chọn: …") chứ **không**
  âm thầm ghi đè bên nào.
- Ghi hỏng ⇒ **giữ nguyên form** (chữ đã gõ còn nguyên) + dòng lỗi; lỗi AI ⇒ **không mất bản
  nháp**. Mọi hàm ghi đều là giao dịch: `luuNgoaiHinh`/`xoaNgoaiHinh` trả RAM về đúng trạng
  thái cũ nếu kv lỗi, `nhapHoSoNgoaiHinh` bọc trong `giaoDichKV`.
- Sửa hồ sơ đang liên kết có **nhắc ngắn** là thay đổi ảnh hưởng các truyện đang liên kết; tin
  nhắn cũ **không** bị sửa. Đổi tên chính cập nhật nhất quán vì mọi liên kết đi theo `id`.
- **Hồ sơ khai tuổi là thứ quyết định**: khi lưu nhân vật có liên kết, tuổi nhân vật lấy theo
  hồ sơ và **cửa 18+ được áp lại** (hồ sơ < 18 ⇒ nhân vật không thể là người lớn). Ảnh trông
  trưởng thành **không** thay cho tuổi khai báo.
- **Tên nhân vật ≠ tên hồ sơ**: liên kết chỉ để lấy **ngoại hình**, app **không** tự đổi tên nhân
  vật (tên trong truyện có thể là tên riêng: "Zara" dùng hồ sơ "Sara Nguyễn"). Nếu tên đang gõ
  khác tên chính của hồ sơ, khối liên kết hiện dòng cảnh báo nêu **cả hai** tên kèm nút **"Dùng
  tên chính của hồ sơ"**. Nút chỉ **điền vào form** — vẫn phải bấm Lưu mới áp dụng — và **không**
  viết lại tin nhắn cũ. Bộ nhận diện tên khi tạo ảnh vẫn nhận **cả** tên hồ sơ lẫn tên trong
  truyện + biệt danh, nên không bắt buộc phải đổi.
- Dựng lại khối liên kết (đổi hồ sơ, quay về từ thư viện) **giữ nguyên biệt danh đang gõ**: khối
  là DOM dựng mới, nếu không giữ thì biệt danh cũ bị xoá âm thầm ngay khi bấm Lưu.
- **Chặn xoá** hồ sơ đang có người dùng — và **"dùng" gồm cả ảnh cảnh**: `demDungNgoaiHinh()`
  đếm `nhanVats[].ngoaiHinhId` **và** `anh[].hoSoIds`, lời chặn nêu rõ cả hai loại kèm cách gỡ
  từng loại (bỏ liên kết nhân vật / dựng lại ảnh mà bỏ chip, hoặc xoá ảnh). Nhờ vậy không bao
  giờ có tham chiếu trỏ vào hồ sơ đã mất (`thamChieuMo()` kiểm tra bất biến này).
- **Form nhân vật dùng BẢN NHÁP**: chọn hồ sơ, gõ biệt danh, đổi ảnh đại diện… đều chỉ đổi bản
  nháp. Bấm **Huỷ** ⇒ không có thay đổi nào (kể cả liên kết), và lần lưu truyện sau đó cũng
  không ghi thay đổi đã huỷ. Nhân vật trong truyện chỉ được áp bản nháp đúng lúc lưu thành công.

### Ghép vào prompt tạo ảnh (trong màn tạo ảnh CŨ, không có công cụ thứ hai)

Logic thuần nằm ở `src/ngoaiHinh.js` (không import gì, để tránh vòng import):

- `nhanDienNgoaiHinh(text, dsUngVien)`: khớp **cả từ** theo ký tự chữ/số Unicode
  (`(^|[^\p{L}\p{N}])tên($|[^\p{L}\p{N}])`, cờ `iu`, không lookbehind), **không** phân biệt
  hoa/thường, **không** khớp một phần từ (`Sarachan` ≠ `Sara`). Chỉ **tự chọn** tên ứng với
  **đúng một** hồ sơ; tên trùng nhiều người bị coi là **mơ hồ** → trả ở `trung` và hiện cảnh
  báo "hãy tự chọn đúng người; app không tự đoán".
- `ungVienNgoaiHinh(story, conv, dsHoSo)`: ứng viên = **nhân vật của hội thoại** đã liên kết hồ
  sơ. Tên dùng để nhận diện = **tên chính của hồ sơ + tên nhân vật trong truyện + biệt danh**.
- **Chip** trong `openTaoAnh` (`[data-nh-pick]`). Mặc định chọn sẵn nhân vật **đang có mặt trong
  cảnh** (khung hình minh hoạ đúng cảnh đang diễn ra) **+** tên vừa nhận diện; người dùng bỏ
  chip, chọn lại, hoặc "Chọn thêm" để lấy hồ sơ bất kỳ. Gõ tay tên vào ô mô tả (hoặc ô yêu cầu
  thêm) ⇒ debounce 250 ms cập nhật chip **và** ghép lại khối ngoại hình. **Chỉ** hồ sơ đang
  chọn mới vào prompt — không bao giờ đưa cả thư viện.
- Khối ngoại hình: `MARK_NGOAI_HINH` (nhãn mở đầu, **tiếng Anh** —
  `[FIXED CHARACTER APPEARANCE — TRUYỆN VAI — keep each person's features exactly as written, never
  blend traits between characters]`) + **mỗi nhân vật MỘT dòng riêng**:
  `- Tên (age N): mô tả | avoid: …`. Khối **luôn ở CUỐI** prompt, nên `ghepPromptNgoaiHinh()`
  chỉ cần cắt từ nhãn tới hết (`tachNgoaiHinh`) rồi ghép lại. Nhãn **cũ** (tiếng Việt,
  `Mô tả ngoại hình cố định`) vẫn được giữ ở `MARK_NGOAI_HINH_CU` và `tachNgoaiHinh()` **cắt cả
  hai nhãn** — bản ghi ảnh đã lưu từ trước còn khối tiếng Việt, nếu chỉ cắt nhãn mới thì khối cũ
  rò lại vào ô \"Mô tả khung hình\".
- **Ô mô tả CHỈ chứa mô tả cảnh** (đây là điều đã sửa ở mục "Đợt sửa năm lỗi"): khối ngoại hình
  hiện **riêng, chỉ đọc** trong `[data-nh-khoi]` và do `capNhatKhoiNgoaiHinh()` vẽ lại mỗi khi
  chip/nhận diện đổi. Ô mô tả không bao giờ bị ghi ngoài thao tác của người dùng (trừ nút
  **Viết lại** — vốn là yêu cầu viết mô tả mới), nên chữ người dùng thêm ở **cuối ô** (trang
  phục, góc nhìn…) không bị lần ghép sau xoá mất; con trỏ cũng không bao giờ bị nhảy.
- Prompt gửi AI (`vietPromptAnh`) **KHÔNG nhận chữ mô tả ngoại hình nào** (xem mục
  \"Mô tả khung hình không còn trộn ngoại hình\" bên dưới). Nó chỉ nhận **DANH SÁCH TÊN** những
  người có hồ sơ (kèm tuổi), và luật: trong `MÔ TẢ ẢNH` **chỉ** viết **trang phục + tư thế/hành
  động** cho những người đó, **mở đầu bằng tên làm NHÃN** (tên là nhãn, không phải chữ cần hiện
  trong ảnh); **TUYỆT ĐỐI không tả lại** cơ thể/gương mặt/tóc/da/vóc dáng/dấu hiệu nhận diện
  (ngoại hình do khối riêng ghép vào; tả lại = hai mô tả chọi nhau = trộn đặc điểm). Người
  **không** có hồ sơ thì vẫn được tả đầy đủ. Trang phục lấy từ **chính khung hình này**, **KHÔNG**
  lấy từ ảnh tham chiếu, và **không** mặc định nhân vật không mặc gì.
- **"Điều cần tránh"** của hồ sơ được gộp **tất định** vào prompt loại trừ ngay lúc bấm Dựng
  (`gopLoaiTruNgoaiHinh`), không phụ thuộc model có nhắc lại hay không.
- `dungAnh()` **ghép prompt ngay trước khi dựng** (lấy đúng chữ trong ô mô tả + nối khối ngoại
  hình) và giữ kết quả trong biến `promptDaDung` — **không ghi ngược vào ô mô tả**. Bản ghi ảnh
  lưu **prompt đã ghép thật sự gửi máy vẽ** (cùng với `hoSoIds`), nên mở "Dựng lại" thì ô nhận
  lại đúng phần mô tả cảnh (`tachNgoaiHinh(anh.prompt)`) và khu chọn tự hiện lại hồ sơ cũ.
  Prompt đã ghép là **dữ liệu dẫn xuất**, **không** ghi ngược vào hồ sơ.

### Mô tả khung hình không còn trộn ngoại hình + khối ngoại hình tiếng Anh (bổ sung tháng 9/2026)

**Vấn đề thật khi dùng:** ô \"Mô tả khung hình\" bị trộn lẫn mô tả ngoại hình của **hai nhân vật**
với nhau. Nguyên nhân nằm ở cấu trúc chứ không phải ở model: `vietPromptAnh()` từng **nhận thẳng
chữ ngoại hình của từng người**, rồi **bảo model chép lại** thành khối `"TÊN — ngoại hình cố
định: …; trang phục: …; tư thế/hành động: …"` ngay trong `MÔ TẢ ẢNH`. Tức là (a) mô tả ngoại hình
đi vào ô \"mô tả khung hình\" — vốn phải chỉ có mô tả cảnh — và (b) model phải phát lại đặc điểm
của người này lẫn người kia trong **cùng một lượt viết**, nên đặc điểm hai người bị **trộn** vào
nhau (mắt/tóc/thân hình của người này gán sang người kia). Khối ngoại hình riêng ở cuối prompt thì
lại **nhắc lại** lần nữa ⇒ hai mô tả chọi nhau.

**Cách sửa (cấu trúc, không chỉ là \"xin model đừng làm thế\"):**

- `vietPromptAnh()` **không còn nhận bất kỳ chữ ngoại hình nào**. Nó chỉ nhận **danh sách tên**
  (kèm tuổi) của những người có hồ sơ, và luật nói rõ: trong `MÔ TẢ ẢNH` **chỉ** viết **trang
  phục + tư thế/hành động**, mỗi người **mở đầu bằng tên làm nhãn**; **tuyệt đối không tả lại**
  cơ thể/gương mặt/tóc/da/vóc dáng/dấu hiệu nhận diện. Vì nó không còn giữ chữ ngoại hình, model
  **không có gì để trộn** và **không thể chép lại** ngoại hình vào ô mô tả cảnh.
- Người **không** có hồ sơ vẫn được tả đầy đủ (không ai khác cung cấp ngoại hình cho họ).
- Ngoại hình **vẫn cố định** giữa các khung hình, vì khối `[FIXED CHARACTER APPEARANCE …]` do app
  ghép ở cuối prompt, không do model viết lại.
- Dòng luật cũ (*\"Tả ngoại hình cụ thể (tuổi, dáng, tóc, mắt, vết sẹo, trang phục) theo đúng hồ
  sơ nhân vật\"*) đã **xoá** — chính nó là thứ kéo ngoại hình vào phần mô tả cảnh.

**Khối ngoại hình chuyển sang tiếng Anh (khớp prompt mô tả khung hình):** prompt mô tả khung hình
là **tiếng Anh**, nhưng khối ngoại hình cố định lại là **tiếng Việt** (\"mô tả ngoại hình cố
định\", \"trang phục\", \"điều cần tránh\"). Nay **toàn bộ khối là tiếng Anh** — nhãn
`MARK_NGOAI_HINH`, khuôn dòng `- Tên (age N): <en> | avoid: <en>`, và prompt loại trừ
(`gopLoaiTruNgoaiHinh`). Tên riêng **không dịch** (vẫn là nhãn nhận diện người).

- **Bản tiếng Anh là dữ liệu dẫn xuất, dịch MỘT LẦN cho mỗi hồ sơ rồi lưu.** Hồ sơ có thêm
  `moTaEn` + `tranhEn`. Hàm thuần `ngoaiHinhEn(h)`/`tranhEn(h)` trả `*En || bản gốc`; `khoiNgoaiHinh`
  và `gopLoaiTruNgoaiHinh` (prompt loại trừ) dùng chúng. `AI.dichNgoaiHinh(ds)` gọi **đúng MỘT**
  lượt `ai-text-plugin` để dịch cả danh sách (khuôn `ID:/APPEARANCE:/AVOID:` từng người, bóc bằng
  `bocBanDich`+`truongTrongKhoi`; `(trống)`/`[none]` ⇒ `""`). Lưu bằng
  `store.luuBanDichNgoaiHinh(hoSo)` — **ghi nhẹ, KHÔNG tăng `suaLuc`** (giống `luuMoC`), nên thứ
  tự thư viện không xáo.
- **Không dịch lại việc đã xong:** `canDichNgoaiHinh(h)` bỏ qua hồ sơ đã có `*En` và hồ sơ mà
  chữ **đã là tiếng Anh** (đo bằng heuristic dấu tiếng Việt `coDauTiengViet`) ⇒ đỡ tốn một lượt
  gọi AI. Hồ sơ chữ Việt chỉ dịch **một lần duy nhất**; mọi khung hình sau dùng lại bản đã lưu.
- **Ghi đè lười trong modal:** `damBaoNgoaiHinhEn()` (gọi từ `capNhatKhoiNgoaiHinh()`) tự dịch
  `moTaEn`/`tranhEn` còn thiếu rồi lưu; `capNhatKhoiNgoaiHinh()` vừa vẽ, vừa **kích** lượt dịch
  (cờ `dangDich`/`daThuDich`), vừa `await` trước khi `dungAnh()` ghép prompt. **Không** chặn UI:
  khối hiện ngay bằng bản tiếng Việt rồi tự chuyển sang tiếng Anh khi dịch xong.
- **Hỏng dịch thì KHÔNG mất chữ người dùng gõ:** nếu lượt dịch lỗi, khối vẫn dựng bằng **chữ gốc**
  (tiếng Việt) và hiện dòng nhắc vàng `.nh-khoi-thieu` (*\"Chưa dịch được sang tiếng Anh: <tên> —
  khối trên vẫn dùng đúng chữ bạn đã gõ…\"*), kèm ghi chú trong dòng trạng thái dựng ảnh. Bấm
  **Dựng lại** (`thuLai`) sẽ `await` và **thử lại**.
- **Sửa chữ ⇒ bản dịch cũ bị bỏ:** `boBanDichCu(cu, moi)` (\`chuanHoaHoSo\`/form `luuForm`) xoá
  `moTaEn`/`tranhEn` khi `moTa`/`tranh` đổi, tránh dùng bản dịch đã lệch với chữ mới.
- **Hồ sơ của người chơi** cũng đi cùng đường (nó là một hồ sơ ngoại hình như bao hồ sơ khác).

**Kiểm thử:** `scratch/tests/nh-anh-en.js` (**48 ca, 0 lỗi**) — logic thuần cho phần lớn, cộng
phần giao diện với AI giả: dịch đúng một lượt cho N người, bóc `(trống)` ⇒ rỗng, modal tự dịch +
lưu, \"Viết lại\" trả về **mô tả cảnh không có ngoại hình** (chỉ tên làm nhãn), prompt gửi máy vẽ
nhận **khối tiếng Anh** + **prompt loại trừ tiếng Anh**, dựng lại **không** dịch lại, đường hỏng
vẫn dựng được + hiện dòng nhắc, dữ liệu thật **không đổi**. `nh-lib` ca 4.9/4.10 đã **đảo** kỳ
vọng (giờ khẳng định **vắng** ngoại hình trong mô tả khung hình), và `khoiText()` trong
`nh-lib`/`nh-nguoichoi`/`nh-fix5` chỉ đọc `.nh-khoi-body` (đầu khối + dòng nhắc nằm ngoài). Thử
với **AI thật**: mô tả khung hình trả về chỉ có cảnh + trang phục/tư thế, mỗi người mở đầu bằng
tên («tên riêng của từng người»), **0** chữ ngoại hình; một lượt `dichNgoaiHinh` thật chạy
~7 s, bản dịch trung thành và `avoid` chuyển sang dạng prompt loại trừ. Ba hồ sơ thật của người
dùng («ba hồ sơ thật của người dùng»). Hồi quy: nh-lib **96**,
nh-io **34**, nh-fix5 **46**, nh-thoat **35**, nh-nguoichoi **58**, T1–T8 **217**, gợi ý lời đáp
**46**, phân biệt đối thoại **41**, sổ hé lộ **11+9+6+22** — tất cả **0 lỗi**.

### Xuất – nhập

- `xuatNgoaiHinh` → file riêng `{type:"truyen-vai-ngoai-hinh", version, ngoaiHinh:{id:hồ sơ}}`.
- **Xuất riêng một truyện** kèm **đúng những** hồ sơ truyện đó tham chiếu (qua nhân vật **và**
  qua `anh[].hoSoIds` — `hoSoCuaTruyen`), để nhập sang nơi khác không mất liên kết. **Xuất toàn
  bộ app** kèm **cả** thư viện.
- **Cả hai đường xuất đều đi qua `choXuatKhiThieuHoSo()`**: đọc lại thư viện ngoại hình, và nếu
  vẫn lỗi đọc thì **hỏi trước** (mặc định dừng) thay vì lặng lẽ xuất một file thiếu hồ sơ.
- **Nhập hồ sơ** (`openNhapNgoaiHinh`): xem trước (số hồ sơ, số ảnh, số trùng ID), mặc định
  **không ghi đè** hồ sơ trùng ID (chỉ thêm cái mới), có ô "Ghi đè…" khi người dùng muốn, và
  nói rõ **trùng tên KHÔNG phải cùng một người**. File chỉ có hồ sơ (không có truyện) được
  `chonFileNhap` định tuyến sang luồng này.
- **Nhập truyện**: chế độ *bản sao* cấp ID mới cho cả hồ sơ (`capIdMoi` dịch `ngoaiHinhId` và
  `hoSoIds` sang ID mới); hồ sơ **không có trong file thì bỏ liên kết** (không để trỏ ra ngoài).
  Chế độ *khôi phục ghi đè* mặc định **giữ nguyên** hồ sơ đang có (`ghiDeHoSo` để ghi đè). Hồ
  sơ được ghi **trước** thân truyện, và hỏng ở bất kỳ bước nào thì `traLaiNhap()` trả cả
  `thuVienNgoaiHinh` về nguyên trạng (ảnh chụp `snap.nh`).
- **File TOÀN BỘ** (`f.toanBo`) được xử lý khác file một truyện: hồ sơ ngoại hình gom **một lần
  ngoài vòng lặp truyện** (`hoSoToanBo`) và ghi bằng `ghiHoSoNhap()` — nên **hồ sơ chưa gắn vào
  truyện nào cũng được khôi phục**, trong cùng giao dịch, trước thân truyện. Hộp thoại nhập nói
  rõ điều này. (Không xoá hồ sơ thừa: xoá là việc phá huỷ, không tự làm.)

### Đợt sửa năm lỗi (rà soát nguồn, tháng 9/2026)

Năm lỗi thật, đã sửa **trước khi chốt v1** — mỗi lỗi có ca kiểm thử đúng tình huống trong
`scratch/tests/nh-fix5.js` (46 ca):

1. **Bấm Huỷ vẫn làm đổi liên kết hồ sơ.** `openCharacterEditor()` sửa thẳng nhân vật trong
   truyện, nên chỉ cần chọn hồ sơ là `nhanVats[].ngoaiHinhId` đổi ngay; Huỷ không hoàn tác và
   lần lưu truyện sau đó ghi luôn thay đổi đó. ⇒ Form nay dùng **bản nháp riêng**
   (`const nhap = JSON.parse(JSON.stringify(c))`): mọi thứ trong form — liên kết, biệt danh,
   tên, kiểu ảnh đại diện, màu, ảnh tải lên — chỉ chạm vào bản nháp. `luuNhanVat(nhap, …)` chỉ
   áp bản nháp lên `c` **sau khi mọi kiểm tra xong**, và trả `c` về nguyên trạng nếu ghi hỏng
   (modal vẫn mở, chữ đã gõ còn nguyên để bấm Lưu lại).
2. **Khôi phục toàn thư viện bỏ sót hồ sơ chưa gắn vào truyện.** Bản sao lưu có mọi hồ sơ,
   nhưng `chuanBiNhap()` chỉ lấy hồ sơ mà *truyện* tham chiếu ⇒ khôi phục xong thiếu đúng những
   hồ sơ chưa dùng, không cảnh báo. ⇒ Hồ sơ của file **TOÀN BỘ** được gom **một lần, ngoài vòng
   lặp truyện** (`hoSoToanBo`) và ghi bằng `ghiHoSoNhap()` **trong cùng giao dịch**, **trước**
   các truyện (liên kết luôn trỏ tới dữ liệu đã tồn tại); hỏng ở đâu cũng được `traLaiNhap(snap)`
   trả lại nguyên trạng vì các id đó đã nằm trong `snap.nh`. File **một truyện** vẫn chỉ mang
   hồ sơ truyện đó dùng. Hộp thoại nhập nói rõ: chọn *Khôi phục ghi đè* thì **cả thư viện** được
   khôi phục. (Hồ sơ thừa trong thư viện **không** bị xoá — xoá là việc phá huỷ, không tự làm.)
3. **Chữ người dùng thêm ở cuối prompt tạo ảnh bị xoá.** Ô mô tả từng chứa *cả* khối ngoại
   hình ở đuôi, và `tachNgoaiHinh()` cắt "từ nhãn tới hết" ⇒ mỗi lần chip đổi hoặc viết lại mô
   tả là chữ người dùng viết thêm ở cuối ô bị nuốt. ⇒ **Ô mô tả chỉ chứa mô tả cảnh**; khối
   ngoại hình hiện **riêng, chỉ đọc** (`[data-nh-khoi]`, hàm `capNhatKhoiNgoaiHinh()` thay cho
   `ghepPromptHienTai()`), và chỉ được ghép vào prompt **đúng lúc bấm Dựng** (`dungAnh()` giữ
   prompt đã ghép trong `promptDaDung`, **không** ghi ngược vào ô). Mở lại ảnh cũ để dựng lại
   thì ô nhận `tachNgoaiHinh(anh.prompt)` — đúng phần mô tả cảnh; bản ghi ảnh vẫn lưu **prompt
   đã ghép** thật sự gửi cho máy vẽ.
4. **Lỗi đọc thư viện bị coi thành thư viện rỗng.** `loadNgoaiHinh()` nuốt lỗi rồi đặt bộ đệm
   về `[]` ⇒ bản sao lưu xuất ra *thiếu hồ sơ* mà vẫn báo thành công. ⇒ Đọc hỏng thì **giữ
   nguyên bộ đệm cũ**, bật cờ `coLoiDocNgoaiHinh()`, `boot()` hiện toast cảnh báo, thư viện
   hiện khung `.nh-loi-doc` + nút **Thử đọc lại**, và **mọi đường xuất bản sao lưu**
   (`xuatTatCa`, `xuatTruyen`) đọc lại thư viện rồi **hỏi trước** khi xuất
   (`choXuatKhiThieuHoSo()` — mặc định DỪNG, phải chọn "Vẫn xuất (có thể thiếu hồ sơ)").
5. **Vẫn xoá được hồ sơ mà ảnh đã lưu đang tham chiếu.** Cửa chặn chỉ đếm liên kết từ *nhân
   vật*, bỏ qua `anh[].hoSoIds` ⇒ gỡ liên kết nhân vật rồi xoá là để lại ảnh trỏ vào ID không
   tồn tại. ⇒ Thêm `demDungNgoaiHinh(stories, id)` = `{nhanVat, anh}`; `xoaHoSoNgoaiHinh()` dùng
   nó, lời chặn nêu rõ **cả hai** loại và cách gỡ từng loại; thẻ hồ sơ trong thư viện cũng hiện
   đủ ("Đang dùng ở N nhân vật · M ảnh cảnh"). Thêm `thamChieuMo(stories, dsHoSo)` để kiểm tra
   bất biến "không tham chiếu nào trỏ vào hồ sơ đã mất" (dùng trong kiểm thử, 0 mồ).

### Lỗi thật khi dùng: prompt tạo ảnh bị đọc như MẪU PJS (tháng 9/2026)

Người dùng báo: *"There's a problem with the syntax of this expression: '[NGOẠI HÌNH CỐ ĐỊNH —
TRUYỆN VAI — giữ đúng từng người, không trộn đặc điểm giữa các nhân vật]' … Unexpected
identifier 'HÌNH'"* — xuất hiện sau khi liên kết hồ sơ ngoại hình rồi bấm Dựng khung hình.

**Nguyên nhân.** `text-to-image-plugin` **tự gọi `.evaluateItem` trên prompt** (trong trang
Perchance, chuỗi có sẵn `evaluateItem`), tức là prompt bị đọc như một **mẫu pjs**:
`d.prompt = data.prompt.evaluateItem.toString()` (dòng ~211 của plugin). Nhãn khối ngoại hình
của app có ngoặc vuông ⇒ engine coi `NGOẠI HÌNH CỐ ĐỊNH …` là biểu thức ⇒ lỗi cú pháp. Nguy
hiểm hơn lỗi cú pháp là **thay âm thầm**: `[b = 3]` biến thành `3`, `{mưa|nắng}` bị chọn ngẫu
nhiên — chữ người dùng viết trong ô mô tả cảnh cũng có thể dính. `ai-text-plugin` **không** dính
lỗi này vì nó chỉ đánh giá khi đầu vào KHÔNG phải chuỗi (`typeof instruction !== "string"`).

**Cách sửa.** Thêm `thoatPerchance(text)` (export ở `src/ai.js`): thoát `[ ] { }` bằng `\` đúng
theo cách của `literal-plugin` (đếm cả nhóm `\` sẵn có). Gọi nó ở **đúng ranh giới plugin** —
`taoAnh()` cho `prompt` **và** `negativePrompt`, `generateAvatar()` cho prompt avatar — chứ
không thoát ở chỗ ghép prompt: bản ghi ảnh vẫn lưu prompt dạng người đọc được, và engine bỏ `\`
khi đánh giá nên **máy vẽ nhận đúng chữ gốc**.

**Vì sao 5 đợt kiểm thử trước không bắt được.** Các bộ đó đều **giả** `root.textToImagePlugin`
để soi prompt — mà máy vẽ giả thì **không đánh giá** prompt, nên lỗi chỉ hiện với plugin thật.
Bài học: khi kiểm thử một ranh giới có hành vi "lạ" ở plugin thật, phải **kiểm tra chính hành
vi đó** (`VE.last.evaluateItem` phải chạy được và bằng chữ gốc — xem `nh-thoat.js` B/D), và
cuối cùng **gọi plugin thật một lần** để chốt.

**Đã kiểm chứng bằng plugin THẬT:** gọi `root.textToImagePlugin(thoatPerchance(prompt))` với
prompt chứa nhãn khối + `[cười]` + `{mưa|nắng}` ⇒ trả ảnh JPEG thật (94.927 byte) sau 7,5 giây,
**không** có lỗi perchance nào. Bản chưa thoát thì `evaluateItem` báo đúng lỗi cú pháp người
dùng gặp (xem ca C1–C3 của `nh-thoat.js`).

### Kiểm thử đã chạy cho đợt này (preview thật, AI giả + máy vẽ giả)

`scratch/tests/nh-fake-ai.js` (page_eval **riêng**) giả cả `root.aiTextPlugin` **và**
`root.textToImagePlugin` — hàm sau ghi lại **prompt cuối** và **prompt loại trừ** đã nhận.
Lưu ý: máy vẽ **giả** không đánh giá prompt, nên riêng ranh giới đó được
`scratch/tests/nh-thoat.js` phủ bằng cách **tự đánh giá** `VE.last` (đúng việc plugin thật
làm).
`scratch/tests/nh-lib.js` (**96 ca, 0 lỗi**) + `scratch/tests/nh-io.js` (**34 ca, 0 lỗi**) +
`scratch/tests/nh-fix5.js` (**46 ca, 0 lỗi** — năm lỗi ở mục trên, mỗi lỗi một tình huống
tái hiện được) + `scratch/tests/nh-thoat.js` (**35 ca, 0 lỗi** — thoát ngoặc + vòng lặp
thoát→đánh giá→đúng chữ gốc + đối chứng chứng minh bản chưa thoát thì hỏng/thay chữ) +
`scratch/tests/nh-anh-en.js` (**48 ca, 0 lỗi** — mô tả khung hình không trộn ngoại hình + khối
ngoại hình tiếng Anh, xem mục riêng bên trên),
dùng `scratch/tests/audit-base.js` (`taoZZ`/`xoaZZ`, mốc dữ liệu thật, chặn lỗi ghi theo từng
folder/phương thức/lần gọi) và `scratch/tests/nh-visual-setup.js` (dựng 4 hồ sơ, 3 liên kết vào
cảnh để soi bố cục).

Phủ: lưu/nạp lại/xoá hồ sơ + ảnh sai định dạng bị bỏ mà hồ sơ còn; nhận diện đúng tên, đúng
biệt danh, **không** khớp một phần từ, tên trùng ⇒ **không** tự chọn; ghép/tách khối idempotent,
mỗi người một dòng, bỏ chip ⇒ hồ sơ rời khỏi prompt mà phần mô tả cảnh còn nguyên; **một hồ sơ
dùng ở hai truyện** với biệt danh khác nhau, tên chính thống nhất, biệt danh chỉ có hiệu lực
trong truyện của nó; liên kết + biệt danh lưu và nạp lại được, **không** sửa tin nhắn cũ, không
đổi liên kết của nhân vật khác, không tự liên kết nhân vật chưa liên kết; **đổi hồ sơ / quay về
từ thư viện ⇒ biệt danh đang gõ còn nguyên** (không bị xoá âm thầm khi bấm Lưu); tên nhân vật
khác tên chính hồ sơ ⇒ hiện cảnh báo nêu **cả hai** tên + nút "Dùng tên chính của hồ sơ", bấm
nút chỉ **điền vào form** (chưa lưu) và cảnh báo biến mất, Lưu xong tên theo hồ sơ nhưng
`ngoaiHinhId`/biệt danh giữ nguyên và tin nhắn cũ **không** đổi; tên đã khớp ⇒ không còn cảnh
báo; hồ sơ khai 17 tuổi ⇒
tuổi nhân vật lấy theo hồ sơ và **không** thể là người lớn dù ô tích bật; sửa tên chính cập nhật
nhất quán theo ID; form tạo mới: AI nháp ⇒ chưa lưu ⇒ **Huỷ không lưu** ⇒ Lưu thì lưu; lỗi AI
giữ nguyên chữ đã gõ; chọn ảnh tham chiếu ⇒ xem trước + dòng nhắc gửi ảnh đi; `phacNgoaiHinh`
với Blob ⇒ AI nhận **đúng 1 ảnh** và bóc đúng các mục (tuổi trống thì để trống, "KHÔNG" ⇒ rỗng);
gõ tay tên trong prompt ⇒ chip tự chọn + khối tự ghép, con trỏ không nhảy; prompt gửi **máy vẽ**
có ngoại hình của từng người, có "điều cần tránh" trong prompt loại trừ, **không** chứa ảnh/base64,
không có trang phục trong khối ngoại hình, vẫn giữ mô tả cảnh; ảnh lưu vào truyện nhớ đúng
`hoSoIds` và `hoSoCuaTruyen` trả đủ; chặn xoá hồ sơ đang liên kết; xuất riêng thư viện / một
truyện (kèm **đúng** hồ sơ truyện dùng, không ôm cả thư viện) / toàn bộ app (kèm cả thư viện, đủ
truyện) — đọc lại file thật qua `Blob` bắt được; nhập: xem trước, mặc định không ghi đè, trùng
tên vẫn là hai người, bật ghi đè thì thay, ảnh đi kèm; nhập truyện bản sao ⇒ ID hồ sơ mới + liên
kết dịch sang ID mới + khoá tin nhắn mới, hồ sơ thiếu trong file ⇒ bỏ liên kết; khôi phục ghi đè
mặc định giữ hồ sơ đang có, `ghiDeHoSo` thì thay; chuẩn bị nhập là **thuần đọc** (không đổi
truyện/thư viện khi chưa bấm Nhập); ghi hỏng khi lưu hồ sơ ⇒ form vẫn mở + chữ còn nguyên + có
dòng lỗi + RAM không lệch đĩa; nhập nhiều hồ sơ hỏng giữa chừng ⇒ ném lỗi + thư viện nguyên trạng
+ không có hồ sơ nửa chừng; xoá hỏng ⇒ hồ sơ vẫn còn.

**Bố cục** (đo bằng `getBoundingClientRect`, không chỉ nhìn): 390×844 và 1280×900 — không có
`scrollWidth > innerWidth` ở màn thư viện truyện, màn truyện, thư viện ngoại hình, form hồ sơ,
màn tạo ảnh; cột chữ của mỗi hàng hồ sơ rộng 250 px (390) / 513 px (1280) — **không** bị ép về
0; 3 nút hành vi **cùng một hàng**, nút cao 40 px (390) / 31 px (1280); chip ngoại hình **xuống
dòng** ở 390 (2 hàng) và **một hàng** ở 1280, không chip nào tràn khỏi modal; form hồ sơ cao
**1,24 màn** ở 390 (trước khi sửa bố cục: 1,91 màn) và **1,10 màn** ở 1280, phần AI đóng sẵn;
khối liên kết ở trạng thái **có cảnh báo lệch tên** (`.nh-info-lech` + nút đồng bộ) không tràn
ngang ở cả hai cỡ (`modal-body` và `documentElement` đều `scrollWidth − clientWidth = 0`), dòng
cảnh báo rộng 294 px/390 và 710 px/1280, nút đồng bộ cao 40 px ở 390 (nằm riêng một hàng) và
31 px ở 1280 (ngang hàng hai nút kia).

Ảnh chụp, đã soi bằng `vision` (mô tả đúng ý đồ rồi mới đối chiếu): `scratch/shots/nh-lib-390.png`,
`nh-lib-1280.png` (4 hàng hồ sơ, hàng chưa liên kết ghi "Chưa liên kết với nhân vật nào", mỗi
hàng đúng 3 nút cùng hàng, không cắt), `nh-form-390.png` / `nh-form-1280.png` (form gọn, ảnh
tham chiếu và hai nút nằm cạnh nhau, dòng nhắc trung thực đọc được), `nh-anh-390.png` /
`nh-anh-1280.png` (panel "NHÂN VẬT TRONG KHUNG HÌNH" với chip đã chọn có viền vàng + dấu ✓, chip
chưa chọn xám + dấu +, không tràn), `nh-chon-390.png` (modal "Chọn thêm hồ sơ"), `nh-nhap-390.png`
(xem trước khi nhập), `nh-lech-390.png` / `nh-lech-1280.png` (khối liên kết có cảnh báo lệch tên:
cảnh báo màu vàng đọc được, nút "Dùng tên chính của hồ sơ" rõ ràng, không cắt chữ),
`nh-khoi2-390.png` / `nh-khoi2-1280.png` (khối ngoại hình chỉ-đọc: viền nét đứt, tiêu đề vàng,
mỗi nhân vật một dòng, không cắt chữ), `nh-loidoc-390.png` (khung cảnh báo lỗi đọc thư viện: viền
đỏ, chữ hồng, nút "Thử đọc lại" nằm riêng một hàng).

`nh-fix5.js` phủ đúng năm tình huống đã báo: (A) đổi liên kết/tên/biệt danh rồi **Huỷ** ⇒ truyện
không đổi, kể cả sau khi lưu truyện lần nữa; **Lưu** ⇒ ghi thật; **ghi hỏng** ⇒ nhân vật nguyên
trạng + modal vẫn mở với chữ đã gõ. (B) kế hoạch khôi phục file toàn bộ chứa **cả** hồ sơ chưa
dùng, `snap.nh` đủ khoá để trả lại nguyên trạng, file một truyện thì chỉ kèm hồ sơ truyện dùng;
xoá sạch thư viện rồi nhập lại ⇒ cả hai hồ sơ trở về và liên kết vẫn đúng. (C) ô mô tả không
chứa khối, khối hiện riêng; chữ thêm ở cuối ô sống sót qua nhận diện lại và qua bật/tắt chip;
prompt gửi máy vẽ có cả chữ đó lẫn khối ở cuối. (D) đọc hỏng ⇒ bộ đệm giữ nguyên + cờ lỗi +
khung cảnh báo + nút đọc lại; xuất bản sao lưu **hỏi trước** và **không tải file** nếu bỏ qua;
đọc lại được thì xuất bình thường kèm hồ sơ. (E) xoá hồ sơ còn ảnh tham chiếu ⇒ bị chặn và nói
rõ là do **ảnh cảnh**; gỡ ảnh rồi thì xoá được. (F) bất biến `thamChieuMo` = 0 và dữ liệu truyện
THẬT không đổi.

`nh-thoat.js` phủ **lỗi thật khi dùng** (prompt tạo ảnh bị đọc như mẫu pjs): (A) `thoatPerchance`
thoát `[ ] { }` và không đụng `\` không đứng trước ngoặc; (B) vòng lặp **thoát → đánh giá lại →
đúng chữ gốc** cho chữ thường, nhãn khối ngoại hình, `[cười]`, `{thì thầm|nói to}`, `[b = 3]`,
ngoặc lồng, dấu chéo trước ngoặc; (C) **đối chứng**: bản KHÔNG thoát thì hoặc lỗi cú pháp (đúng
lỗi người dùng gặp) hoặc bị thay âm thầm — chứng minh ca kiểm thử không rỗng nghĩa; (D) đầu-cuối
qua máy vẽ giả: prompt gửi đi đã thoát, `VE.last.evaluateItem` chạy được và bằng chữ gốc, nhãn
khối tới máy vẽ dạng đọc được, `[cười]`/`{…|…}` còn nguyên, tên + mô tả hồ sơ vẫn có, prompt loại
trừ cũng được thoát, `generateAvatar` cũng được thoát. Ngoài ra ranh giới này còn được chốt bằng
**một lần gọi plugin THẬT** (ảnh JPEG 94.927 byte, 7,5 giây, không lỗi perchance).

**Hồi quy**: 265 ca cũ (T1–T8 + bốn bộ sổ hé lộ) + 41 ca "phân biệt đối thoại" + 46 ca "gợi ý lời
đáp" **vẫn đạt**; `window.__tv_test` được phơi thêm các hàm của đợt này để kiểm thử bằng
`page_eval`. Dữ liệu truyện THẬT được chốt lại trước/sau mỗi bộ (chỉ đọc) và so khớp: không đổi.
Mọi bản ghi test đều có ID nhận diện được (`ct_zz*`, `ht_z*`, `nv_z*`, `nhz_*`) và được dọn ở
cuối; **không** thao tác trên bản ghi thật. Dọn hồ sơ test **chỉ** theo `^nhz` — id hồ sơ thật
cũng là `nh_*`, từng bị xoá mất vì bộ lọc `/^nhz|^nh_/` (xem "Hai luật kiểm thử đã trả giá bằng
dữ liệu thật").

### Người chơi cũng có hồ sơ ngoại hình (bổ sung tháng 9/2026)

**Vấn đề thật khi dùng:** thư viện ngoại hình chỉ liên kết được với **nhân vật** (`story.nhanVats`),
vì đường duy nhất để liên kết là trình sửa nhân vật. **Người chơi** (`story.nguoiChoi`) không nằm
trong `nhanVats` nên không có chỗ nào để liên kết — mọi khung hình có người chơi đều chỉ dựa vào
mô tả chữ. Đợt này thêm đúng một trường và đúng một chỗ để liên kết.

**Dữ liệu:** `story.nguoiChoi.ngoaiHinhId` (chuỗi). `createStory` tạo sẵn `""`;
`chuanHoaTruyen` chuẩn hoá giá trị không phải chuỗi ⇒ `""` (truyện cũ thiếu hẳn trường vẫn an
toàn). Liên kết theo **ID**, không bao giờ suy ra từ tên — cùng luật với nhân vật.

**Quy ước "người chơi là một nhân vật":** `ID_NGUOI_CHOI = "nguoi"` là ID quy ước để người chơi
đi lọt qua mọi đường đã có của nhân vật (ghép prompt, đếm, kiểm tra hồ sơ mồ) mà **không** bị ghi
vào `nhanVats`: `laNguoiChoi(id)`, `nguoiChoiNhuNhanVat(story)` (bọc `story.nguoiChoi` thành hình
dạng nhân vật, `id = "nguoi"`), `hoSoNguoiChoi(story, dsHoSo)`, `moTaNguoiDung(dem)`.

**Đếm & kiểm tra** (`src/ngoaiHinh.js`): `ungVienNgoaiHinh()` **nối thêm** người chơi vào **cuối**
danh sách ứng viên khi đã liên kết, gắn cờ `laNguoiChoi: true` — kể cả khi `conv.nhanVatIds` không
chứa người chơi (người chơi không bao giờ nằm trong đó). `demLienKetNgoaiHinh` tính cả người chơi;
`demDungNgoaiHinh` đổi hình dạng trả về thành `{ nhanVat, nguoiChoi, anh }` (trước là một số) —
mọi chỗ hiển thị đi qua `moTaNguoiDung(dem)`; `thamChieuMo` báo `{ loai: "nguoiChoi", id: "nguoi",
hoSoId }`; `hoSoCuaTruyen` bao gồm hồ sơ của người chơi.

**Chỗ duy nhất để liên kết:** `Tuỳ chọn truyện` → khối `[data-nc-link]` "🧬 Hồ sơ ngoại hình của bạn
(người chơi)". Ô chọn `[data-f="nguoiChoiNgoaiHinhId"]` chỉ đổi trên **FORM**; chỉ ghi vào truyện khi
bấm **Lưu** thành công (`luuNhapNhay`, có chụp/khôi phục `story.nguoiChoi.ngoaiHinhId` khi ghi hỏng).
`lamMoiNcLink()` dựng lại `<option>` từ thư viện **hiện tại** mỗi lần mở lại từ màn thư viện/sửa hồ
sơ và chỉ giữ lựa chọn nếu hồ sơ đó **còn tồn tại**. Tên người chơi khác tên chính của hồ sơ ⇒ hiện
cảnh báo nêu **cả hai** tên + nút `[data-act="dong-ten-nguoi-choi"]` "Dùng tên chính của hồ sơ" —
nút **chỉ điền vào form**, không tự lưu và **không** sửa tin nhắn cũ (tin nhắn đã gửi vẫn giữ tên
cũ trong `msg.ten`).

**Trong màn tạo ảnh** (`src/app.js → nhanDienLai`/`paintPick`): hồ sơ của người chơi **mặc định
được chọn** khi đã liên kết (người chơi có mặt trong mọi cảnh), và chip của họ mang nhãn
`.nh-chip-nguoi` "bạn" — bỏ chọn chip để khung hình không có người chơi (góc nhìn thứ nhất). Nhãn
này chỉ nói "hồ sơ này cũng là của bạn": một hồ sơ có thể vừa của nhân vật vừa của người chơi.

**Các đường đã có tự phủ người chơi:** `capIdMoi()` (nhập bản sao) dịch/giữ/bỏ `nguoiChoi.ngoaiHinhId`
theo hồ sơ có trong file; `xuatTruyen` kèm hồ sơ người chơi dùng; chặn xoá hồ sơ (`xoaHoSoNgoaiHinh`)
đếm cả người chơi và trong thông báo có ghi rõ cách gỡ (Tuỳ chọn truyện → Hồ sơ ngoại hình của bạn →
"— không liên kết —"); `hoSoCuaTruyen`/kiểm tra hồ sơ mồ coi người chơi là một chủ sở hữu.

**Kiểm thử:** `scratch/tests/nh-nguoichoi.js` (**58 ca, 0 lỗi**) — dựng truyện test `ct_zznc1`
(có `nguoiChoi` **không** nằm trong `nhanVats`) và chạy qua `window.__tv_test`. Phủ: bọc người chơi
thành "nhân vật" (`id = "nguoi"`), truyện thiếu trường / trỏ hồ sơ không tồn tại ⇒ an toàn; liên kết
**ghi xuống kv** thật ([A4b]); `demDungNgoaiHinh` trả đúng ba khoá; `moTaNguoiDung`; hồ sơ mồ báo
đúng `loai: "nguoiChoi"`; `chuanHoaTruyen` (thiếu/không phải chuỗi/chuỗi hợp lệ); `createStory`;
khối liên kết trong menu (`[data-nc-link]`, ô chọn, cảnh báo lệch tên + nút chỉ-điền-form); **đóng
mà không Lưu ⇒ kv không đổi**; lưu ⇒ ghi thật; ghi hỏng ⇒ nhân vật nguyên trạng; xuất/nhập bản sao
(F2–F4). Hồi quy: nh-lib **96**, nh-io **34**, nh-fix5 **46**, nh-thoat **35**, nh-anh-en **48**,
T1–T8 **217**, gợi ý lời đáp **46**, phân biệt đối thoại **41**, sổ hé lộ **11+9+6+22** — tất cả
**0 lỗi**.
`window.__tv_test` được phơi thêm `ID_NGUOI_CHOI`, `laNguoiChoi`, `nguoiChoiNhuNhanVat`,
`hoSoNguoiChoi`, `moTaNguoiDung`, `openStoryMenu`, `MARK_NGOAI_HINH_CU`, `ngoaiHinhEn`, `tranhEn`,
`canDichNgoaiHinh`, `boBanDichCu`, `luuBanDichNgoaiHinh`.

**Bố cục** (390×844, đo bằng `getBoundingClientRect` + soi bằng `vision`): khối liên kết nằm giữa ô
mô tả người chơi và "Cách dựng truyện", đủ tiêu đề / nhãn / ô chọn ("— không liên kết —", 4 lựa
chọn) / dòng nhắc / nút "Thư viện ngoại hình" / dòng tóm tắt; trạng thái **đã liên kết + lệch tên**
hiện tóm tắt ("Đang liên kết «tên» · 22 tuổi · có ảnh tham chiếu…"), mô tả, dòng "Tránh: …", cảnh báo
màu vàng và hai nút — không cắt chữ, không tràn ngang. Chip trong màn tạo ảnh: 2 chip một hàng,
`chipH = 32px` / chữ một dòng (20px) — cảnh báo "chữ xuống dòng/đè" của `vision` là **ảo giác do
ảnh chụp bị thu nhỏ**, số đo DOM mới là căn cứ. Ảnh chụp: `scratch/shots/nc-link-390.png`,
`nc-link-mismatch-390.png`, `nc-chip-390.png`.

**Dữ liệu THẬT:** không đổi. Bộ kiểm thử chỉ **đọc** truyện thật (`«id thật»`); chốt
trước/sau mỗi bộ. **Lưu ý cho người đọc sau:** một đợt kiểm tra đã tưởng sáu tin nhắn mới trong
`«id thật»` là rác do test — **không phải**: đã đối chiếu (không file test nào ghi vào hội
thoại thật; khoảng cách giữa các lượt 51–62 giây ≈ thời gian sinh AI thật; nội dung tiếp nối mạch
truyện) ⇒ đó là **người dùng chơi thật**, tuyệt đối không xoá.

## Chỉnh sửa

- **Hành vi app / tham số ngữ cảnh** → `CauHinh()` ở đầu `main.pjs`.
- **Thể loại, mẫu nhân vật, mô tả hai chế độ** → `TheLoai()`, `MauNhanVat()`, `MauCotTruyen()`.
- **Prompt cho AI** → `src/ai.js` (`buildContext` = tiền tố tĩnh, `buildLog` = nhật ký
  chỉ-thêm, `buildPrompt` = ghép hai phần trên + `TASK:`; các `task` riêng nằm trong
  từng hàm `replyAs`/`suggestLines`/`summarizeConversation`/`extractFacts`/`concludeChapter`…).
- **Giao diện** → `src/app.js` (render*) và `src/styles.css`.
  Khung chat: header chỉ còn Đạo diễn + Khép cảnh + menu `⋯` (`renderChat`), thanh trạng
  thái cảnh gom mọi thứ phía trên ô nhập (`thanhCanhBar`/`responderRow`/`gkBar`/`khepBar`/
  `presenceBar`), ô nhập (`renderComposer`). CSS theo khối `.scene-bar*`, `.chat-menu*`,
  `.story-stat`, `.dashboard-stat*`, `.create-method-btn`.
  Nhãn `aria-label` cho nút chỉ có icon do `ganAriaNhan()` (`src/dom.js`) quét tự động.
  Bong bóng chat (nội dung tin) do `fmtBongBong()` (`src/dom.js`) dựng — lớp tách lời
  thoại/hành động, bật/tắt bằng `store.settings.phanBietLoiThoai` qua `batPhanBiet()`.
  Khối **Gợi ý lời đáp** do `goiYkhoiHtml()` dựng (giữa `.scene-bar` và `.composer`), hành
  vi chọn/tạo lại ở `onSuggest()` + `xoaGoiY()`/`thayKhoiChat()`; CSS `.goi-y*`.
  **Cài đặt của app** (giao diện, tự động, ảnh mặc định, công tắc hiển thị) nằm ở
  `openSettings()` — hộp duy nhất cho mọi thiết lập không thuộc một truyện nào.
- **Sổ tri thức** → hằng số trong `CauHinh()` (`soTinNhanQuetLore`, `nganSachKyTuLore`, `soKyTuMoiMucLore`);
  đọc file / dò từ khoá / dựng prompt ở `src/lore.js`; giao diện ở `openLorebook()` / `lbMucHtml()` /
  `lbFormHtml()` / `lbPanel` (`src/app.js`); CSS `.lb-*` (`src/styles.css`).
- **Tạo nhân vật bằng AI** → `dauNhanVat()` / `generateCharacterOptions()` / `generateCharacter()` /
  `docHuongNhanVat()` (`src/ai.js` — prompt, số hướng, khuôn đọc kết quả); giao diện ở
  `htmlHuongNhanVat()` / `sinhHuongNhanVat()` / `chonHuongNhanVat()` / `dienNhanVat()` (`src/app.js`);
  kiểu dáng ở `.nv-opt*` (`src/styles.css`).
- **Ảnh cảnh** (phong cách / cỡ khung / mặc định) → `PhongCachAnh()`, `KichThuocAnh()`,
  `AnhMacDinh()` trong `main.pjs`; prompt ở `vietPromptAnh()`/`taoAnh()` (`src/ai.js`) — và
  **luôn** qua `thoatPerchance()` trước khi gọi `textToImagePlugin` (xem mục "Lỗi thật khi
  dùng: prompt tạo ảnh bị đọc như MẪU PJS"); giao diện ở các hàm `*Anh*` của `src/app.js` +
  mục «ảnh cảnh» của `src/styles.css`.
- **Thư viện ngoại hình** → logic thuần ở `src/ngoaiHinh.js` (`nhanDienNgoaiHinh`,
  `ungVienNgoaiHinh`, `tenUngVien`, `khoiNgoaiHinh`, `ghepPromptNgoaiHinh`, `tachNgoaiHinh`,
  `gopLoaiTruNgoaiHinh`, `demLienKetNgoaiHinh`, **`demDungNgoaiHinh`** (đếm cả liên kết nhân vật
  lẫn `anh[].hoSoIds` — dùng cho cửa chặn xoá), **`thamChieuMo`** (bất biến "không trỏ vào hồ sơ
  đã mất"), `hoSoCuaTruyen`, `chuanHoaHoSo`, `MARK_NGOAI_HINH`, `MARK_NGOAI_HINH_CU`,
  `ngoaiHinhEn`/`tranhEn` (bản tiếng Anh dẫn xuất), `canDichNgoaiHinh`, `boBanDichCu`);
  lưu trữ ở `src/store.js` (folder kv `thuVienNgoaiHinh`, `newNgoaiHinh`/`loadNgoaiHinh`/
  `getNgoaiHinh`/`dsNgoaiHinh`/`luuNgoaiHinh`/`xoaNgoaiHinh`, **`coLoiDocNgoaiHinh()`** + cờ
  `loiDocNgoaiHinh` — `loadNgoaiHinh` đọc hỏng thì **giữ bộ đệm cũ** chứ không trả `[]`,
  `newCharacter().ngoaiHinhId`/`.bietDanh`, `newAnh().hoSoIds`, `PHIEN_BAN_TRUYEN`); nháp bằng AI
  ở `phacNgoaiHinh()` + `vietPromptAnh()` (`src/ai.js` — chỉ nhận **tên** làm nhãn, không nhận
  chữ ngoại hình; xem \"Mô tả khung hình không còn trộn ngoại hình\") + `dichNgoaiHinh()` (một
  lượt dịch cho cả danh sách, lưu qua `luuBanDichNgoaiHinh`); giao diện ở khối
  "THƯ VIỆN NGOẠI HÌNH" của `src/app.js` (`openNgoaiHinh`, `openSuaNgoaiHinh`, `openNhapNgoaiHinh`,
  `nhapHoSoNgoaiHinh`, `xuatNgoaiHinh`, `xoaHoSoNgoaiHinh` — chặn theo `demDungNgoaiHinh`,
  `choXuatKhiThieuHoSo`/`xuatTatCa`/`xuatTruyen` — hỏi trước khi xuất thiếu hồ sơ,
  `chuanBiNhap`/`chayNhap`/`ghiHoSoNhap` — khôi phục cả thư viện trong cùng giao dịch,
  `htmlLienKetNgoaiHinh`/`dienLienKetNgoaiHinh`/`lamMoiLienKet` (dựng lại khối liên kết nhưng
  **giữ** biệt danh đang gõ), nút `dong-ten-ngoai-hinh` = "Dùng tên chính của hồ sơ", `nhCard`,
  `dienAnhNgoaiHinh`) + phần chip trong `openTaoAnh` (**`capNhatKhoiNgoaiHinh()`** vẽ khối ngoại
  hình chỉ-đọc vào `[data-nh-khoi]` thay cho `ghepPromptHienTai()` cũ — ô mô tả không còn chứa
  khối; `promptDaDung` giữ prompt đã ghép lúc bấm Dựng); CSS `.nh-*` (`src/styles.css`, gồm
  `.nh-info-lech`, `.nh-khoi-head`/`.nh-khoi-body`, `.nh-loi-doc`/`.nh-loi-doc-acts`) và
  `.anh-prompt-note`/`.anh-ngoai-hinh`.
  Giới hạn thật: **máy vẽ chỉ nhận prompt chữ**, ảnh tham chiếu chỉ được AI phân tích thành mô tả.
- **Cảnh nhóm / hiện diện / cảnh riêng** → prompt ở `replyAsGroup()`, `pickSpeakers()`,
  `catDieuKhien()`/`docHienDien()` và các khối `# HIỆN DIỆN TRONG CẢNH` /
  `# CÁCH VIẾT CẢNH NHÓM` / `# GIỚI HẠN HIỂU BIẾT` / `# CẢNH RIÊNG ĐANG MỞ` trong
  `buildContext()` (`src/ai.js`); trạng thái ở `hienDienCua`/`hienDienNhom`/`canhRiengCua`
  (`src/store.js`); luồng ở `generateTurn`/`streamGroupReply`/`moCanhRieng`/`dongCanhRieng`/
  `presenceBar`/`openHienDien`/`openChonCanhRieng`/`xuLyLenhCanh` (`src/app.js`);
  CSS `.presence-*`, `.msg-rieng` (`src/styles.css`).
  Số nhân vật tối đa mỗi lượt: `CauHinh().soNguoiTraLoiToiDa`.
- **Chế độ Đạo diễn** → schema/mặc định ở `daoDienMacDinh()`/`daoDienOf()`/`chuanHoaDaoDien()`
  (`src/store.js`); luật trạng thái/phủ đính chính/liên quan-hướng ở `src/trangThai.js`
  (`dinhChinhHieuLuc`, `huongHoatDong`, `huongLienQuan`, `canhBaoCoSo`, `taoTienDo`, …);
  prompt ở `buildDaoDien()` + phần `TIẾN ĐỘ ĐẠO DIỄN` của `khepCanh()`/`docPhieu()` +
  `lapCauNoi()`/`docKeHoach()` (`src/ai.js`); giao diện ở cả khối `dd*` của `src/app.js`
  (`openDaoDien`, `ddTongQuanHtml`, `ddFormDinhChinhHtml`, `ddFormHuongHtml`,
  `ddFormKeHoachHtml`, `openTaoHuong`, `openSuaHuong`, `mucTienDoHtml`, `ddLuu`/`ddTruoc`);
  CSS `.dd-*` (`src/styles.css`).

## Ghi chú kỹ thuật / cạm bẫy

- AI được truy cập qua `root.generateText`; ảnh qua `root.textToImagePlugin`; lưu
  trữ qua `root.kv`. Trong module phải dùng `R` (được export từ `store.js`) chứ
  không dùng tên trần.
- **`text-to-image-plugin` ĐÁNH GIÁ prompt như một mẫu pjs** (`data.prompt.evaluateItem`,
  và cả `negativePrompt`). Vì trong trang Perchance chuỗi có sẵn `.evaluateItem`, mọi
  `[ ]` / `{ }` trong prompt — nhãn khối ngoại hình của app, chữ người dùng viết trong ô mô tả
  cảnh, tên hồ sơ — đều bị hiểu là lệnh: nặng thì lỗi cú pháp, nhẹ hơn là **bị thay âm thầm**
  (`[b = 3]` → `3`, `{mưa|nắng}` → chọn ngẫu nhiên). **Luôn** gọi plugin qua
  `thoatPerchance()` (`src/ai.js`). `ai-text-plugin` thì ngược lại: nó chỉ đánh giá khi đầu vào
  **không phải chuỗi**, nên `streamText` phải luôn truyền chuỗi — đừng đổi thành node/giá trị
  khác kẻo prompt truyện (có ngoặc trong tin nhắn người dùng) bị đánh giá.
- Ưu tiên prompt theo thứ tự **tiền tố tĩnh → nhật ký chỉ-thêm → TASK:** để tận
  dụng prefix cache.
- Chọn theme "Theo hệ thống" được quy về `data-theme="sang"|"toi"` ngay trong
  `applyTheme()` (có lắng nghe `prefers-color-scheme` đổi).
- Không dùng `IntersectionObserver` cho việc quan trọng (dễ treo trong preview).
- `hidden` luôn thắng inline style khi cần ẩn phần tử.
- **Cẩn thận trùng tên class**: bảng dựng ảnh dùng `.anh-preview` (khung xem trước,
  đặt `height: auto`); ảnh đại diện trong editor nhân vật dùng `.anh-avatar` (56×56
  tròn). Trước đây cả hai đều tên `.anh-preview` nên `height: 56px` của avatar khoá
  luôn chiều cao khung xem trước, khiến `overflow: hidden` cắt mất phần trên/dưới của
  ảnh dọc và ảnh vuông — đừng gộp lại hai class này.
  Tương tự, **đừng đặt lại tên cũ**: thông số thẻ truyện là `.story-stat` (KHÔNG phải
  `.stat`), ô thống kê Bảng điều khiển là `.dashboard-stat*`, nút "Tạo nhanh / Thiết lập
  nâng cao" là `.create-method-btn` (KHÔNG phải `.seg` — `.seg` chỉ dành cho segmented
  control của bộ chọn kiểu avatar).
- **Khối điều khiển của lượt nhóm** (`<<HIENDIEN>> … <<HET>>`) là hợp đồng giữa prompt
  và bộ đọc: phải luôn ở **cuối** phản hồi, và mọi chỗ hiển thị/ lưu văn bản phải đi
  qua `catDieuKhien()` (lúc stream dùng `AI.catDieuKhien(acc)`). Nếu sửa `replyAsGroup`
  mà quên `stopSequences:[MOC_HET]`, model sẽ viết tiếp sau khối và chữ sẽ bị cắt cụt.
- **Hiện diện rỗng ≠ hiện diện thiếu**: `hienDienNhom()` chỉ fallback về `nhanVatIds` khi
  `hienDien` **không phải mảng**. Đừng "sửa" thành `hd.length ? hd : tat.slice()` — như vậy
  `[]` sẽ bị hiểu thành "cả nhóm đang có mặt" và không còn cách diễn tả cảnh chỉ còn người
  chơi. Tương tự, mọi chỗ chép `conv.hienDien` sang hội thoại khác phải chép y nguyên mảng
  (kể cả rỗng) và chỉ bỏ hẳn trường khi nguồn cũng thiếu (`(conv.hienDien || [])` là sai ở
  đây). `docHienDien()` theo cùng luật: có mục nhưng không ra tên nhân vật nào (khối trống,
  chỉ có tên người chơi) ⇒ **mảng rỗng**; chỉ khi thiếu hẳn khối mới trả `null` (giữ
  nguyên).
- Trong TASK của cảnh nhóm có dặn **không dùng ký tự `<` `>`** trong đoạn văn — vì
  `catDieuKhien()` cắt từ dấu `<` đầu tiên (để xử lý cả trường hợp dấu mới stream được
  một nửa). Đừng bỏ lời dặn đó.
- `hienDienCua()` là **nguồn duy nhất** cho "ai đang ở trong cảnh" (đã tính cả cảnh
  riêng); đừng tự đọc `conv.hienDien` trong luồng sinh phản hồi. `hienDien` rỗng được
  hiểu là "lấy toàn bộ người tham gia", nên truyện cũ không bao giờ rơi vào trạng thái
  không ai nói được.
- Tin nhắn AI nhóm phải giữ **cả** `nvIds` (mảng) **và** `nvId` (phần tử đầu) để mọi
  chỗ cũ (`charById(story, m.nvId)`) vẫn chạy. Dùng `nvtsCuaTin(story, m)` thay vì tự
  đọc `m.nvId`.

## Kiểm thử nhanh (qua preview)

```js
// mở app rồi:
window.__truyenVaiReady              // true khi boot xong
root.kv.cotTruyen.entries()          // danh sách truyện đang lưu
"[câu tiếng Việt]".evaluateItem      // chạy thử pjs
```

Các luồng nên test sau khi sửa: tạo truyện (cả 2 chế độ) → tạo nhân vật (tay + AI)
→ tạo hội thoại (đơn + nhóm) → chat có streaming → "Viết mở đầu" / "Gợi ý" /
"Tiếp tục" → "Kết thúc chương" → biên niên sử (thêm/sửa/xoá) → xuất/nhập JSON →
đổi theme → reload (khôi phục theo hash `#ct=…&ht=…`). Thêm cho đợt ngoại hình: tạo hồ
sơ tay → liên kết ở hai truyện với hai biệt danh → bỏ/ thêm chip ở màn tạo ảnh → dựng
ảnh → xuất riêng truyện rồi nhập ở chỗ khác xem liên kết còn không → reload xem hồ sơ +
ảnh + liên kết còn nguyên. Thêm cho đợt sửa lỗi prompt: liên kết một hồ sơ rồi dựng ảnh, và
gõ `[cười] {mưa|nắng}` vào cuối ô mô tả — ảnh phải dựng được, **không** có cảnh báo lỗi cú
pháp trong trang (nếu có, `thoatPerchance` đã bị bỏ sót ở một đường gọi nào đó).

### Kiểm thử AI mà không tốn lượt gọi thật

Thay `root.aiTextPlugin` bằng một hàm giả là cách nhanh nhất để thử các luồng P0:
nó phải trả về promise có `.stop()`, gọi `opts.onChunk({fullTextSoFar})` theo từng
bước, và resolve `{text, stopReason}` (`"user"` khi bị `stop()`). Hai điều cần nhớ
vì chúng từng làm test chạy nhầm vào AI thật:

- `root` phơi plugin qua **getter/setter proxy**: gán `root.aiTextPlugin = fake` có
  thể chưa ăn ngay ở lần gọi kế tiếp trong *cùng* một `page_eval`. Hãy gán ở một
  `page_eval` riêng (hoặc `Object.defineProperty`) rồi mới gọi.
- `root.kv.tinNhan` trả về **object mới mỗi lần truy cập**, nên muốn giả lập lỗi ghi
  phải bọc lại cả `root.kv` — gán `root.kv.tinNhan.set = …` sẽ không có tác dụng.
- Cùng cách đó, `root.textToImagePlugin` gán được bằng hàm giả ⇒ **kiểm tra được prompt
  CUỐI thật sự gửi cho máy vẽ** (ngoại hình từng người, prompt loại trừ) mà không tốn
  lượt vẽ nào: `root.textToImagePlugin = (prompt, opts) => { ghi lại prompt/opts;
  return Promise.resolve({ dataUrl: ANH_1PX }); }`. Dùng ở
  `scratch/tests/nh-fake-ai.js`.

Các điểm cần kiểm lại khi sửa vùng này:
- Gửi tin rồi bấm **Dừng** giữa lúc streaming: phần đã viết phải được lưu, tin nhắn
  mang cờ `daDung`, không có bong bóng nào còn quay.
- Bấm **Từ khoá dừng** *trong lúc* AI đang viết: lượt đang chạy phải bị cắt, sau đó
  có tin người chơi `đỏ`, ghi chú `🛑` và một phản hồi chăm sóc sau.
- Sửa/xoá một tin nằm trong vùng đã tóm tắt (`idx < conv.tomTatDen`): `conv.tomTat`
  phải bị xoá và `tomTatDen` về 0.
- Kết chương với hội thoại dài (≈200 tin): số tin trong prompt các đoạn phải **liền
  mạch** (`1–66`, `67–131`, `132–192`, đoạn cuối nguyên văn) và mỗi đoạn sau phải
  chứa bản tóm tắt của đoạn trước.
- Làm hỏng ghi xuống kv (giả lập quota) khi gửi tin: phải thấy toast “Bộ nhớ trình
  duyệt đã đầy…”, không có tin nhắn ma trong cache, và ô nhập giữ lại chữ đã gõ.

Riêng **Khép cảnh** (đợt “quan hệ, tính cách ẩn & khép cảnh v1”), dùng hàm giả với ba
khuôn trả lời tuỳ theo `opts.instruction` — nhánh nhóm nhận ra bằng `<<HIENDIEN>>`,
phiếu phân tích bằng `KHÉP CẢNH`, còn lại là lượt đơn (kết thúc bằng `<<KHEP>> có|không`):

```
TÓM TẮT: …
KÝ ỨC:
- <một câu> | BIẾT: Kai, Aric
QUAN HỆ:
- Aric -> Kai: tin tưởng lên | VÌ: <hành động cụ thể> | CHƯA NÓI: <nếu có>
NHÂN VẬT:
- Aric: mục tiêu | CŨ: … | MỚI: … | VÌ: …
MÓC: …
```

Checklist đã chạy (đều qua): truyện cũ mở bình thường (không có hàng chip nào); nhịp
`cham` + cảnh nhẹ ⇒ chỉ tóm tắt, `QUAN HỆ/NHÂN VẬT: KHONG CO`; cảnh có lời hứa ⇒ đúng
một delta `Tin tưởng ↑` kèm “Vì…”, không lộ số ra UI/prompt; bỏ chọn một ký ức + sửa tóm
tắt ⇒ chỉ phần đã chọn/đã sửa được lưu; huỷ modal không ghi gì; lỗi quota khi lưu ⇒ thẻ
giữ nguyên nội dung đang duyệt, không có cảnh/divider nửa chừng, bấm lại lưu được; cảnh
riêng ⇒ ký ức chỉ thuộc người chơi + nhân vật đó, nhân vật khác có mục “KHÔNG được biết”;
xoá/sửa tin đi qua cảnh đã duyệt ⇒ cảnh báo nêu số cảnh rồi vô hiệu đúng, state về 0;
tạo nhánh ⇒ chỉ mang cảnh nằm trọn trước điểm rẽ (id remap, `khepGoc = idx`); từ khoá
dừng + chăm sóc sau ⇒ không tự tạo penalty, không tự khép; 390px ⇒ hàng chip một dòng,
không tràn ngang, ô nhập không cao thêm.

Riêng **Chế độ Đạo diễn**, dùng hàm giả ở trên nhưng thêm hai khuôn: `KẾ HOẠCH CẦU NỐI`
(trạng thái xuất phát / mục tiêu / `BƯỚC CHUYỂN:` / `DẤU HIỆU:` / `XUNG ĐỘT:` /
`ĐIỀU KIỆN ĐỔI HƯỚNG:`) và một dòng `TIẾN ĐỘ ĐẠO DIỄN:` trong phiếu Khép cảnh
(`- <tên hướng>: <trạng thái> | BẰNG CHỨNG: … | BƯỚC TIẾP: …`). Checklist đã chạy (đều qua):
truyện cũ mở bình thường; bật/tắt Đạo diễn không đổi trạng thái/prompt khi chưa có gì; tổng
quan khớp `tinhTrangThai()` và **không lộ số nội bộ**; bí mật cảnh riêng hiện đúng người biết
mà không lọt sang prompt người khác; tạo đính chính → reload còn → tắt thì quay về kết quả suy
từ cảnh, không tin nhắn/cảnh nào bị sửa; tạo hướng 2 bước (lập kế hoạch → sửa kế hoạch →
Kích hoạt) và prompt lượt sau có đủ 7 quy tắc, **không** có hướng đang tạm dừng; xung đột
cùng đối tượng ⇒ cảnh báo trước khi kích hoạt; Khép cảnh chỉ ghi dòng tiến độ còn chọn, AI
không tự hoàn tất, tick ô xác nhận mới thành `hoanTat`; tạm dừng ⇒ khối biến mất khỏi prompt,
tiếp tục ⇒ trở lại; sửa/xoá tin trong cảnh đã khép ⇒ cảnh báo "cơ sở đã thay đổi" nhưng
**không** tự xoá dữ liệu; tạo nhánh ⇒ chỉ mang tiến độ trước điểm rẽ; lỗi quota khi lưu đính
chính / khi duyệt Khép cảnh ⇒ không có dữ liệu nửa chừng, form/thẻ giữ nguyên nội dung, và
**RAM không giữ bản ghi ma** (kiểm bằng cách xuất truyện rồi đếm `daoDien.dinhChinh`); export
rồi import ⇒ `daoDien` khớp từng ký tự; 390px + 1280px ⇒ một cột / lưới nhiều cột, không
tràn ngang, không chồng chữ.

Riêng sổ tri thức: mở **Tuỳ chọn truyện → Nạp file lorebook** → bấm **Xem ví dụ JSON** rồi **Thêm vào sổ**
(phải hiện 3 mục, đếm đúng ở dòng thống kê) → sửa một mục (đổi từ khoá, số ưu tiên, bật “Luôn gửi”) và **Lưu mục**
→ tắt một mục → mở hội thoại có tin nhắn chứa từ khoá: nút 📖 trên thanh chat phải hiện huy hiệu `đang khớp/tổng`
và mục khớp được tô “đang khớp” trong sổ → thử **Thay thế toàn bộ sổ** và **Xoá cả sổ**. File thật: nạp một
lorebook SillyTavern (`.json`) — số mục, tên mục, từ khoá phải khớp với file; nạp lại file do **Xuất JSON** sinh ra
phải ra đúng số mục cũ.

Riêng tạo nhân vật bằng AI: bấm **Tạo bằng AI** → phải hiện 3 thẻ hướng (tên và kiểu quan hệ khác nhau,
chưa chọn thì không thẻ nào có viền vàng) → bấm **Chọn hướng này** → đúng thẻ đó sáng viền vàng, cả 3 nút
chuyển sang disabled, form được điền đủ (kể cả 11 mục BDSM khi giao kèo bật) → bấm **Tạo bằng AI** lần nữa
phải ra 3 hướng khác. Với truyện bật giao kèo, mục SỞ THÍCH phải làm **chip sáng** (không được rỗng) — rỗng
nghĩa là AI tự đặt tên không có trong `SoThichBdsm()`.

Riêng lớp giao kèo: bật ở Bước 4 (chọn thể loại BDSM sẽ tự bật + tự chọn khung quan hệ
+ đổ `khongKhi`) → bấm thử vài **mẫu dựng sẵn** (mức độ, khung quan hệ, nhịp, ngôn ngữ,
`danhXung`… phải đổi theo, chip sở thích sáng đúng) → bật/tắt vài chip sở thích (giá trị
trong `<input hidden data-f="wizsoThich">` phải khớp) → tạo truyện → mở lại bằng Tuỳ chọn
truyện / panel dashboard (`gkPanel` phải hiện khung quan hệ, nhịp & ngôn ngữ, sở thích,
luật riêng) / thanh trong chat → đổi mức độ bằng chip 1–5 → bấm **Từ khoá dừng** (phải ra
tin nhắn người chơi `đỏ`, ghi chú `he`, rồi nhân vật thoát vai và chăm sóc sau) → bấm
**Thương lượng** / **Chăm sóc sau**.

Riêng editor nhân vật + BDSM: mở một nhân vật → bấm một mẫu trong nhóm **Mẫu BDSM** →
phải điền đủ `vaiBdsm / danhXung / kinhNghiem / phongCach / khauVi / soThich (chip sáng)
/ gioiHan / gioiHanCung / luatRieng / chamSocSau / tinHieuRieng` → Lưu rồi mở lại, các
trường phải còn nguyên. Với truyện **chưa bật giao kèo**: khối BDSM nằm trong
`<details>` đóng sẵn, bấm một mẫu BDSM thì details tự mở, bấm **Bật giao kèo cho truyện
này** thì `bat` thành `true` và mọi thứ đã điền **không** bị mất.

Riêng ảnh cảnh: mở một hội thoại đã có vài tin nhắn → bấm **🎨** trên thanh chat
(phải hiện modal với prompt tiếng Anh + chú thích tiếng Việt) → **Dựng khung hình**
(hiện chỉ báo đang vẽ, ~10s) → **Đưa vào truyện** (phải xuất hiện tin nhắn khung ảnh
đúng vị trí) → đổi **Khung hình** sang *Dọc* / *Vuông* rồi dựng lại — cả khung xem
trước lẫn khung trong chat phải **không cắt** ảnh (kiểm tra `scrollHeight === clientHeight`
của `.anh-preview` và `.anh-holder`) → bấm 🎨 trên một tin nhắn AI (ảnh phải chèn **ngay sau** tin đó) →
thử **xem lớn / tải / dựng lại / xoá** → mở **Thư viện ảnh (N)** trên dashboard
(**Tới cảnh** phải nhảy đúng tin nhắn) → xuất JSON rồi nhập lại vào truyện khác
(xoá bản nhập phải **không** làm mất ảnh gốc).

Riêng cảnh nhóm / hiện diện / cảnh riêng (đã kiểm thử bằng cả AI giả lẫn AI thật):
tạo hội thoại 4 nhân vật → gửi tin ở chế độ **Tự động**: phải ra **một** bong bóng AI
duy nhất (avatar chồng + tên ghép + nhãn `cảnh nhóm`) với 1–3 nhân vật, và lượt sau
những ai không được chọn không được lên tiếng → gõ `@Tên`: chỉ đúng người đó trả lời,
không gọi thêm ai → bảo một nhân vật rời cảnh: phản hồi phải có dòng
`<<HIENDIEN>> Kael, Minh` (bị cắt khỏi nội dung hiển thị) và thêm ghi chú
`🚪 … rời khỏi cảnh.`; nhân vật đó **biến mất khỏi hàng chip** và khỏi
`pickSpeakers` → cho cảnh còn **đúng một** nhân vật rồi để AI kể người đó rời đi
(`<<HIENDIEN>> KHÔNG CÓ AI`): `conv.hienDien` phải thành `[]`, thanh hiện diện đổi sang
dạng cảnh trống (lời nhắc + nút **Sửa**), ô nhập bị khoá kèm placeholder chỉ vào nút
**Sửa**; mở **Sửa** → bỏ chọn hết rồi **Lưu** vẫn lưu được `[]` (toast "Cảnh giờ chỉ còn
mình bạn.", không phải lỗi) → chọn lại một người: người đó **trở lại hàng chip**, trả lời
được ở lượt sau, và nếu AI kể thêm người bước vào thì có ghi chú `➡️ … bước vào cảnh.` →
một phản hồi **không** có khối điều khiển phải giữ nguyên hiện diện cũ → truyện cũ (không
có trường `hienDien`) vẫn hiện đủ người tham gia; xuất rồi nhập lại JSON (kể cả
`hienDien: []`) giữ nguyên trạng thái → bấm **Cảnh riêng** (hoặc gõ `Cảnh riêng: Tên`): thanh đổi thành
`🔒 Cảnh riêng với X`, hàng chọn người trả lời ẩn, tin nhắn sinh ra có chip
`🔒 cảnh riêng`; gõ `Quay lại nhóm` → nhật ký gửi cho AI phải có
`[CẢNH RIÊNG với X]` và khối `# GIỚI HẠN HIỂU BIẾT` phải nêu nhãn đó → reload: trạng
thái hiện diện/ cảnh riêng còn nguyên → xuất rồi nhập lại JSON: `hienDien`, `canhRieng`,
`nvIds`, `rieng` còn nguyên → **Dừng** giữa lúc streaming vẫn giữ phần đã viết
(`daDung`) và **Từ khoá dừng** vẫn cắt được lượt nhóm đang chạy rồi chuyển sang chăm sóc
sau. Trên mobile (390×844): thanh hiện diện đúng một dòng (không tràn ngang, không cắt
nút), hàng "Ai trả lời" cuộn ngang một dòng thay vì xuống dòng choán chỗ.

Khi kiểm thử AI nhóm mà không muốn tốn lượt gọi thật: cho hàm giả trả về văn bản kết
thúc bằng `<<HIENDIEN>> A, B\n<<HET>>` để thử cả nhánh đọc khối điều khiển, và trả về
văn bản **không** có khối đó để kiểm tra mặc định an toàn (giữ nguyên hiện diện).
