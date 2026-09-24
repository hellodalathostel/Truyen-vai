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
      lib/prompt.mjs            BA truyện mẫu HƯ CẤU + đường chạy prompt THẬT (AI giả)
      lib/tao-prompt-fixture.mjs công cụ SNAPSHOT: ghi fixtures/prompt/*.txt + moc.json
      fixtures/*.mjs            dữ liệu mẫu HƯ CẤU (truyện, phiếu, kế hoạch, vắng mặt,
                                phien-ban-cu: hình dạng cũ theo TỪNG PHIEN_BAN_*)
      fixtures/prompt/*.txt     3 mẫu × 5 lượt prompt, so TỪNG BYTE (Giai đoạn 7a)
      fixtures/prompt/moc.json  mốc prefix-cache (tỉ lệ tiền tố chung) để bắt hồi quy
      node/*.test.mjs           tầng Node — hàm thuần, không DOM
      browser/*.js              tầng trình duyệt — mỗi tệp là một "bộ"
      browser/runner.js         DANH_MUC + bộ chạy + báo cáo
      README.md                 tệp này

`src/ui/` là **thư mục con DUY NHẤT** có thể có của `src/`, và chỉ chứa thân màn hình
tách ra từ `app.js`:

    src/ui/taoAnh/index.js        vỏ màn "Dựng ảnh cho cảnh này" (≤ 150 dòng, chỉ nối)
    src/ui/taoAnh/taoAnhFlow.js   logic THUẦN, KHÔNG DOM — có test ở tầng Node
    src/ui/taoAnh/taoAnhHtml.js   chuỗi HTML từng khối
    src/ui/taoAnh/taoAnhChon.js   khu "Nhân vật trong khung hình" + dịch ngoại hình
    src/ui/taoAnh/taoAnhDung.js   "Viết lại" + "Dựng khung hình" (cổng 18+ ở đây)
    src/ui/taoAnh/taoAnhLuu.js    "Đưa vào truyện"
    src/ui/nhanVat/index.js       vỏ màn "Sửa nhân vật" (thân hàm ≤ 150 dòng, chỉ nối)
    src/ui/nhanVat/nhanVatForm.js logic THUẦN, KHÔNG DOM — cổng 18+ theo tuổi, có test Node
    src/ui/taoTruyen/index.js     vỏ màn "Cốt truyện mới" (thân hàm ≤ 150 dòng, chỉ nối)
    src/ui/taoTruyen/taoTruyenFlow.js  logic THUẦN, KHÔNG DOM — đối số createStory
    src/ui/tuyChonTruyen/index.js vỏ màn "Tuỳ chọn truyện"
    src/ui/tuyChonTruyen/tuyChonTruyenFlow.js  logic THUẦN — ngưỡng, nhãn nút, chụp/khôi phục
    src/ui/lorebook/index.js      vỏ màn "Sổ tri thức"
    src/ui/lorebook/lorebookFlow.js  logic THUẦN — parse/xếp/lọc mục lore, có test Node
    src/ui/vietTruyen/vietTruyenFlow.js  logic THUẦN — nguồn, chia lô, nén prose (Giai đoạn 8)
    src/ui/suKien/index.js        gopBangSuKien(D) + BANG_CON — gộp 7 bảng sự kiện
    src/ui/suKien/*.js            mỗi tệp MỘT bảng "data-act" ⇒ hàm xử lý (theo tính năng)
    src/ui/cong18.js              cửa 18+ DÙNG CHUNG: câu chữ + ai được ghi cờ (THUẦN)

Sáu màn đã tách khỏi `app.js` là `taoAnh/` (tạo ảnh) · `nhanVat/` (sửa nhân vật) ·
`taoTruyen/` (cốt truyện mới) · `tuyChonTruyen/` (tuỳ chọn truyện) · `lorebook/` (sổ tri thức) và
`suKien/` (bảng xử lý sự kiện toàn cục). Mỗi màn: `index.js` là VỎ (chỉ nối, **thân hàm** ≤ 150
dòng — không phải số dòng tệp) và `*Form.js`/`*Flow.js` là **quyết định THUẦN, KHÔNG DOM** nên
kiểm được ở tầng Node. `cong18.js` là cửa 18+ dùng chung cho mọi màn.

## Luật không được vi phạm

1. **Dữ liệu thật của người dùng không bao giờ được ghi vào bất kỳ tệp nào của gói.**
   Bộ kiểm thử muốn kiểm tra trên truyện thật thì phải đọc chúng **trong bộ nhớ** lúc
   chạy (qua `root.kv.cotTruyen.entries()` và lọc bỏ id có tiền tố test), đối chiếu,
   rồi bỏ đi. Không chụp lại, không lưu lại, không đưa vào zip. Mọi tên/id trong
   `fixtures/` phải là hư cấu và trung tính. Luật tự động chỉ bắt được **dạng id** (token dài),
   nên còn một chốt chặn thứ hai: bộ `rr-ten-that` (tầng trình duyệt, chạy **ĐẦU TIÊN**) lấy mẫu
   tên/id THẬT trong kv **chỉ trong bộ nhớ** rồi quét **mọi tệp sẽ vào gói** (tiêm qua
   `window.__tvGoi`) — khớp thì ĐỎ, chỉ báo **tệp + số dòng**, **TUYỆT ĐỐI KHÔNG in chuỗi khớp**.
   **BẮT BUỘC chạy trước MỖI lần đóng gói**; thiếu `window.__tvGoi` thì bộ này ĐỎ có chủ ý.
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
10. **DAG một chiều: lõi KHÔNG BAO GIỜ import `src/ui/*`.** `src/ui/*` **được** import lõi; lõi
   (`store`, `ai`, `schema`, `trangThai`, `thoiGian`, `ngoaiHinh`, `lore`, `dom`) chỉ được import
   thứ trong lõi. Chỉ `app.js` — tầng ghép — được phép import `src/ui/*`. Vòng ngược lại biến
   thư mục con thành mê cung và phá thứ tự nạp. `goi-chung.test.mjs` có ca đệ quy ghim luật này
   (bỏ qua `app.js`).
11. **Logic THUẦN của mỗi màn hình phải nằm ở `src/ui/<màn>/…Flow.js` — KHÔNG import DOM** —
   và **phải có test tầng Node**. Quyết định (chọn gì, cổng 18+, trạng thái nút, dựng prompt,
   bản ghi để lưu) không được trốn trong tệp HTML/DOM, vì như vậy chỉ kiểm được bằng trình duyệt.
   Prompt gửi máy vẽ còn phải có **ca snapshot byte-for-byte** trong Node.
12. **Khi tách hàm khỏi `app.js`: KHÔNG ĐỔI HÀNH VI.** Bằng chứng phải là **byte-for-byte**, không
   phải "trông giống": script **tất định** (id đặt cứng, AI giả, máy vẽ giả) chạy trên bản CŨ rồi
   bản MỚI và so HTML/`instruction`/prompt gửi máy vẽ; ảnh chụp phần tử phải giống hệt; ảnh chụp
   cả trang lệch vài pixel jitter khử răng cưa thì chấp nhận (phải soi lại bằng mắt/crop).
   Hàm **vỏ** ở lại `app.js` phải ≤ 150 dòng và nối qua một bảng `*_DEPS` tường minh — nhưng bảng
   đó chỉ chứa hàm **còn lại của app**; mọi thứ khác lấy thẳng từ lõi. Đừng biến nó thành túi đồ
   nghề chung. Luật 150 dòng áp cho **mọi** hàm trong `src/ui/**`, kể cả hàm con bên trong tệp, và
   `goi-chung.test.mjs` đếm cả chúng.
13. **MỘT điểm đăng ký sự kiện toàn cục duy nhất.** Chỉ `bindGlobalEvents` (trong `app.js`) được
   gọi `addEventListener`; phần **xử lý** chia theo tính năng ở `src/ui/suKien/*` (mỗi tệp export
   một map `"data-act" ⇒ hàm`) và gộp bằng `gopBangSuKien(D)` — trùng tên giữa các bảng là **lỗi
   ném ra**, và **mọi** `data-act` xuất hiện trong HTML của app phải có hàm xử lý. Có ca Node ghim
   cả hai chiều; đừng thêm `addEventListener("click")` ở chỗ khác.
14. **Bảng `*_DEPS` khớp HAI CHIỀU.** Mọi `D.<tên>` mà tệp của màn gọi phải có trong bảng, VÀ mọi
   tên trong bảng phải được dùng ít nhất một lần; khai thừa là lỗi, khoá có giá trị chỉ được là
   HÀM. `goi-chung.test.mjs` soát tự động cho **cả tám** màn — đừng khai thêm cho "chắc ăn".
15. **Snapshot prompt: đổi prompt thì phải cập nhật fixture trong CÙNG một lần commit.**
   `tests/fixtures/prompt/*.txt` là prompt THẬT của 3 truyện mẫu × 5 lượt, do
   `node tests/lib/tao-prompt-fixture.mjs` ghi ra; ca Node so **từng byte**. Muốn đổi prompt
   (có chủ đích) thì chạy lại công cụ đó rồi commit **fixture mới + `moc.json` mới + một dòng
   LÝ DO** (trong thông điệp commit hoặc mục Giai đoạn tương ứng ở tệp này). **Không** sửa
   tay fixture cho khớp, và không được để ca này đỏ rồi bỏ qua.
16. **Mốc prefix-cache không được tụt quá 5 điểm phần trăm.** `moc.json` ghi tỉ lệ tiền tố
   chung nhỏ nhất/trung bình của từng mẫu; ca Node ĐỎ nếu tụt quá ngưỡng — nghĩa là có nội
   dung động trôi lên ĐẦU prompt và máy chủ mất phần cache dùng chung. Hạ mốc chỉ được phép
   khi đó là thay đổi có chủ đích kèm lý do (ghi rõ trong mục Giai đoạn), **không** hạ cho
   vừa lòng test.
17. **Chỉ xoá bản ghi kiểm thử THEO ID — không bao giờ theo TÊN.** Mọi chỗ dọn dẹp
   (`donHoSoTest` ở các bộ `nh-*`, `donTruyenTest`, `donTest` trong `runner.js`) chỉ được xoá
   bản ghi có id test (`nhz_*`, `ct_zz*`, `ht_z*`, `nv_z*`…). **Không** lọc theo `tenChinh`/`ten`:
   người dùng hoàn toàn có thể đặt tên hồ sơ/truyện trùng tên kiểm thử (Linh, Sara, Khoa…), nên
   xoá theo tên là xoá **dữ liệu thật** — đã xảy ra thật ở Giai đoạn 7a. Hồ sơ do FORM tạo ra
   mang id do app sinh (`nh_*`), không nhận ra được bằng tiền tố: bộ nào tạo hồ sơ qua form thì
   phải **xoá ngay theo đúng id vừa lưu** (xem `nh-lib.js` mục 3). Chạy bị ngắt (F5) vẫn có thể
   để lại rác mang id app sinh — cách xử lý: tìm hồ sơ đó và xoá qua giao diện app, rồi chạy lại
   lượt đầy đủ trước khi đóng gói.

18. **Lượt mới chỉ được NỐI THÊM vào cuối khối DIỄN BIẾN** (ca CẤU TRÚC trong
   `tests/node/prompt.test.mjs`, hàm thuần `doCotPrompt` trong `tests/lib/prompt.mjs`). Điểm lệch
   đầu tiên giữa hai lượt liền nhau phải nằm ở hoặc sau chỗ tin nhắn cũ cuối cùng kết thúc trong
   khối DIỄN BIẾN; riêng lượt trước có nhật ký RỖNG thì mốc là ĐẦU khối. Ca này đo **đúng chỗ**
   nên không phụ thuộc độ dài truyện mẫu (tỉ lệ phần trăm thì phụ thuộc — xem luật 16). Cặp lượt có
   sự kiện đổi SỚM trong CỐT TRUYỆN là chủ đích (Khép cảnh, vào/rời cảnh) phải khai
   `ngoaiLe` trong `moc.json` **kèm `lyDo`**; ca kiểm còn khẳng định ngoại lệ đó vẫn là vi phạm
   THẬT — ngoại lệ cũ không được âm thầm che hồi quy. Đối chứng âm bắt buộc:
   `dungDoiChungAm()` (chèn chuỗi động vào khối CỐT TRUYỆN) phải làm ca cấu trúc ĐỎ.

## Không đổi hành vi — cách đo (bắt buộc mỗi lần tách hàm khỏi `app.js`)

Mọi lần tách hàm phải chứng minh **hành vi không đổi**. "Trông giống" không tính; bằng chứng
phải là **ký tự** và **pixel**, và chạy trên **cả** bản CŨ **lẫn** bản MỚI. Quy trình (đã dùng
ở Giai đoạn 6 và Đợt 6b):

1. Giữ lại `app.js` **CŨ** (trước khi tách) thành một tệp riêng trong lúc làm; bản MỚI là
   `src/app.js`. Nạp bản nào thì `page_refresh` bản đó — **không** vá `window.fetch` để tráo
   mã (không chặn được module loader). Vì `page_refresh` xoá `window.__tvNguon`, phải **tiêm
   lại** nguồn các bộ test sau mỗi lần nạp.
2. Viết **một script TẤT ĐỊNH** chạy trên trang thật, dùng `window.__tv_test` (điểm neo kiểm
   thử) + AI giả trả lời theo NỘI DUNG câu hỏi + máy vẽ giả ghi lại prompt. Script phải:
   - đặt cứng **mọi** id/thời gian: `Date.now = () => 1700000000000`, id theo bộ đếm;
   - thay `Math.random` bằng **LCG** (bộ sinh tuyến tính) — **KHÔNG** dùng hằng số: hằng số làm
     `uid()` trùng nhau, bản ghi sau ghi đè bản ghi trước, hai bản "giống nhau" một cách giả tạo;
   - lấy ra đủ thứ để so: `outerHTML` của modal qua **từng bước**, mọi `instruction` gửi AI,
     prompt gửi máy vẽ, **câu chữ + thứ tự bước + mặc định của mọi hộp xác nhận 18+**, trạng
     thái ô tích/tuổi sau từng bước, và bản ghi cuối cùng;
   - trả về một chuỗi JSON. Chạy trên CŨ rồi MỚI và so **từng ký tự** (độ dài + nội dung).
3. So **ảnh chụp** trên cả hai bản: phần tử modal, thân modal khi đã **bỏ giới hạn cao**, từng
   khối (tuổi, dòng ô tích 18+, khối giao kèo), và ảnh cả trang. Ảnh chụp phần tử phải giống
   **từng byte**; ảnh cả trang nếu lệch thì phải là **jitter khử răng cưa** — so pixel bằng
   `createImageBitmap` + `OffscreenCanvas.getImageData` (không cần thư viện giải PNG) và đòi mỗi
   kênh lệch **≤ 1**. Ảnh chụp cả trang là thứ **vision** soi lại được, nên hãy hỏi vision đúng
   thứ đáng thấy (khối nào, nút nào, thứ tự nào).
4. **Dữ liệu THẬT phải nguyên trạng**: chụp tập khoá kv trước/sau (so **tập khoá**, đừng lọc
   theo tiền tố — id truyện sinh bằng `uid()` nên không có tiền tố), `chayTuKiemTra()` phải ra
   `soLoi 0`/`soLoiHinhDang 0`, và `localStorage["truyenVai.caiDat"]` phải được **trả nguyên**.
5. Dọn sạch **mọi** dữ liệu test đã sinh, rồi mới chạy tầng trình duyệt đầy đủ (`chayTatCa()`,
   không `gomPhu`) và đóng gói.

Bẫy khi viết script: modal cao hơn khung nhìn ⇒ phải bỏ giới hạn cao của `.modal-body` rồi mới
chụp được khối dưới; đóng modal bằng **nút đóng của chính nó** theo LIFO (luật 7); `page_eval`
với IIFE `async` mà **không** có `return` ngoài thì trả `null`; hộp xác nhận 18+ dùng nút
`"Tôi xác nhận 18+"`, và wizard chỉ qua cửa khi ô tích người lớn đã bật.

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

### Bộ Giai đoạn 6 (thí điểm tách `openTaoAnh` → `src/ui/taoAnh/`)

Giai đoạn 6 **chỉ** tách màn tạo ảnh; các màn khác chưa đụng. Bộ kiểm thử trình duyệt **không
thêm ca nào** cho giai đoạn này — đó chính là bằng chứng: `1077/1077 ca · 31 bộ, 0 cảnh báo`,
y như trước khi tách, trên **cùng** dữ liệu thật không đổi một byte.

| Tệp Node | Phủ gì |
|---|---|
| `taoAnhFlow.test.mjs` (66 khẳng định) | Logic thuần của màn tạo ảnh, **không cần DOM**: `chonHoSo`/`nhanDienTrongKhung`/`hoSoHienChip`/`hoSoConLai`/`thaoTacChip` (ai hiện chip, ai bị ẩn, thêm/bỏ tay thắng nhận diện tự động), `nvChuaXacNhanChoTaoAnh` + `loiChanTaoAnh` (**cổng 18+** — nhân vật vị thành niên chưa xác nhận thì chặn, và chặn cả khi dựng LẪN khi lưu), `nutTaoAnh` (trạng thái nút theo `busy`/`coAnh`), `promptGuiMayVe`/`loaiTruGuiMayVe`/`kichThuocNen` (**snapshot byte-for-byte**: prompt mẫu 469 B), `xuLyKetQuaMayVe`, `thongSoBanGhiAnh` |

`goi-chung.test.mjs` thêm **4 ca** (xem luật 10, 11, 12 ở trên — ca thứ tư đếm số dòng của **mọi**
hàm trong `src/ui/**`, kể cả hàm con); `khong-ro-ri.test.mjs` nay quét **đệ quy** `src/ui/**` để tệp
mới không lọt lưới soát id/tên thật.

Ghi chú kiểm chứng: `src/ui/` được Perchance phục vụ **đúng byte** (6/6 tệp `fetch` → HTTP 200,
kể cả đường dẫn lồng `ui/taoAnh/…`) — nhưng tầng phục vụ `src/` của nền tảng **luôn đi qua service
worker**, nên từ trong editor **không thể** chứng minh "không qua SW" (gọi vòng qua SW trả 404
`"No src manifest available for this page"` dù generator đã lưu). Cái kiểm được là resolver xử lý
đúng đường dẫn lồng và trả đúng byte.

### Đợt 6b (tách `openCharacterEditor` + `openNewStoryModal` → `src/ui/nhanVat/` + `src/ui/taoTruyen/`)

Đợt 6b tách **hai** hàm còn lại cùng lúc, theo đúng khuôn Giai đoạn 6, và rút cổng 18+ của cả
ba đường vào nội dung người lớn ra một tệp dùng chung. Tầng trình duyệt **không thêm ca nào** —
đó chính là bằng chứng: `1077/1077 ca · 31 bộ, 0 cảnh báo`, **y như trước khi tách**, và **giống
hệt** khi chạy trên `app.js` **CŨ** lẫn **MỚI** (cùng số ca; `gd1-tuoi` cùng mọi bộ chạm
editor/wizard đều xanh ở cả hai bản).

| Tệp Node | Phủ gì |
|---|---|
| `cong18.test.mjs` (51 khẳng định) | **Cửa 18+ dùng chung** (`src/ui/cong18.js`) — thuần, không DOM: ghim **nguyên văn 8 hằng câu chữ** (`LY_DO_BAT_GIAO_KEO`, `LY_DO_NHANH_DUNG_BAN_NHAP`, `LY_DO_NHANH_TAO_TRUYEN`, `LOI_TU_CHOI_DANH_SACH`, `LOI_TU_CHOI_BAT_GIAO_KEO`, `GHI_CHU_NHANH_KHONG_BDSM`, `LOI_NHANH_THE_LOAI_BDSM`, `LOI_NHANH_CHUA_XAC_NHAN`), `coBdsm`, danh sách **được ghi cờ** / **bị chặn**, `maDanhSach`, `canHoiLaiDanhSach`, `patchGiaoKeoTaoNhanh`/`patchGiaoKeoBanNhap`, `loiTuChoiTaoNhanh` |
| `nhanVatForm.test.mjs` (84 khẳng định) | Logic THUẦN của màn sửa nhân vật: bốn luật khoá ô 18+ theo tuổi (`khoaNguoiLonTheoTuoi`, `chotNguoiLon`, `tuoiTheoHoSo`), `tenTrongForm`/`tenSauKhiLuu`, `bdsmTrongEditor`, `soThichTuChuoi`/`doiSoThich`, `goiYTuoiText`, và **snapshot byte-for-byte** của `promptAvatarAi` |
| `taoTruyenFlow.test.mjs` (51 khẳng định) | Logic THUẦN của màn tạo cốt truyện: `cheDoMacDinh`, `theLoaiHienThi`/`emojiTheLoai`, `tenNguoiChoi`, `ghepBoiCanhVaLuat`, `datTenTuBoiCanh` (trần 60 ký tự), `stubTruyen`, `locNhanVatCoTen`, và payload `createStory` của **cả hai** đường (`payloadWizard`/`payloadTaoNhanh`) |

`goi-chung.test.mjs` thêm **2 ca** cho đợt này:

- *"bảng DEPS chỉ chứa thứ KHÔNG import được từ lõi"* — quét `export` của lõi rồi đòi mọi `D.<tên>`
  xuất hiện trong `src/ui/**` phải **có** trong bảng của màn và **không** được là thứ lõi đã
  export. Ca này bắt được một lỗi thật (một tệp gọi `D.<hàm>` mà bảng thiếu khoá ⇒ nút "Tạo ảnh
  đại diện" hỏng lúc chạy).
- *"cổng 18+ của hai màn mới nằm ở tầng logic THUẦN, câu chữ chỉ có một nguồn"* — đòi mọi quyết
  định 18+ (khi nào hỏi lại, ai được ghi cờ, ai bị chặn + lý do) nằm ở tầng logic và câu chữ chỉ
  tồn tại ở `src/ui/cong18.js`, **không** rải trong tệp HTML/DOM.

Luật import `src/ui/` cũng được nới **đúng mức**: cho phép `../` (để `src/ui/<màn>/…` với tới
`src/ui/cong18.js` và lõi) nhưng vẫn **chặn trỏ ra ngoài gói**.

Tổng tầng Node sau Đợt 6b: **15 tệp, 2 710 khẳng định, 0 không đạt** (Giai đoạn 6: 12 tệp,
2 012 khẳng định). Con số này là hệ quả của việc thêm ca, nên **đừng** ghim nó vào tài liệu như
một mốc cứng — nó sẽ đổi mỗi lần thêm ca.

### Đợt 6c (tách `openStoryMenu` + `openLorebook` + `bindGlobalEvents`)

Ba hàm dài nhất còn lại của `app.js` (`bindGlobalEvents` 319 · `openLorebook` 299 ·
`openStoryMenu` 245 dòng) nay chỉ còn **vỏ 3 dòng**; `app.js` **8 397 → 7 578 dòng**. Đợt này có
ba điểm luật mới (luật 13, 14 ở trên) và một bẫy đo mới.

| Tệp Node | Phủ gì |
|---|---|
| `suKien.test.mjs` (324 khẳng định) | Bảng sự kiện toàn cục: **66 khoá = 66 `data-act` cũ**, **không trùng tên** giữa các bảng con, `gopBangSuKien` **NÉM LỖI** khi trùng (ghim bằng bảng giả), mọi giá trị phải là HÀM, và **mọi `data-act` trong HTML do app sinh ra đều có hàm xử lý** (đọc chuỗi HTML của các màn) — ghép lại đúng **một** điểm đăng ký |
| `lorebookFlow.test.mjs` (85 khẳng định) | Logic THUẦN của sổ tri thức: `soBat`/`bangKhop` (đếm mục bật, khớp từ khoá), `mucTuForm` + `thieuNoiDung`, `tenFileXuat`, các câu hỏi xác nhận (thay thế / xoá sổ / xoá mục) và **mã lỗi file** (file rỗng, JSON hỏng, không mục nào dùng được) — câu chữ ghim **nguyên văn** |
| `tuyChonTruyenFlow.test.mjs` (91 khẳng định) | Logic THUẦN của màn Tuỳ chọn truyện: mặc định (nhịp/chế độ/emoji/tên người chơi), `nguongChonDuoc`, nhãn nút Giao kèo/Sổ tri thức theo trạng thái, `giaTriSapLuu`, `chupTrangThai`/`khoiPhucTrangThai` (hoàn tác), `demNguoiDung`, `lechTen`, `chonConSong` |

`goi-chung.test.mjs` 935 → **1 793 khẳng định**: thêm ca **DEPS HAI CHIỀU** (khai thừa là lỗi,
khoá có giá trị chỉ được là HÀM, quét cả **sáu** màn) và tổng quát hoá ca "các màn đã tách" cho
cả màn mới; `khong-ro-ri.test.mjs` 195 → **198**. Tổng tầng Node sau Đợt 6c: **18 tệp,
4 071 khẳng định, 0 không đạt**.

Tầng trình duyệt **không thêm ca nào** — bằng chứng vẫn là `1077/1077 ca · 31 bộ, 0 cảnh báo`,
**giống hệt** khi chạy trên `app.js` **CŨ** lẫn **MỚI**, `gd1-tuoi` **94/94** trên cả hai. Kịch
bản tất định cho JSON **69 456 ký tự giống từng byte** và ba ảnh chụp **phần tử** giống hệt từng
byte (`#appRoot` 1 874 222 B · `.modal-backdrop` 1 710 081 B · sổ tri thức 1 373 219 B).

**Bẫy mới (quan trọng):** `snapshot.capture()` **cả trang** KHÔNG tất định — cùng một trạng thái,
hai lần gọi liên tiếp ra hai ảnh khác nhau (đã gặp thật ở đợt này). Từ nay **chỉ** dùng ảnh chụp
**phần tử** làm bằng chứng pixel, và phải bỏ `maxHeight`/`overflow` của `.modal-box`/`.modal-body`
trước khi chụp vì modal cao hơn khung nhìn (`GIAN` trong kịch bản). Ghi chú 6b "ảnh cả trang lệch
206/3 980 673 pixel" vì vậy **không** còn được coi là bằng chứng; đừng dựa vào ảnh cả trang.

### Đợt 6d (tách `openSuaNgoaiHinh` + `renderDashboard` + `capIdMoi` + `openDaoDien`)

Bốn hàm cuối trên 150 dòng của `app.js` (`openSuaNgoaiHinh` 223 · `renderDashboard` 218 ·
`capIdMoi` 172 · `openDaoDien` 153) nay đều là **vỏ ngắn**; `app.js` **7 578 → 6 839 dòng**.
Từ đây **toàn bộ `src/` không còn hàm nào > 150 dòng** — luật 150 dòng được nâng từ `src/ui/**`
lên **TOÀN `src/**`** (quét cả `app.js` và các tệp lõi; hiện đếm **764 hàm**, 0 quá hạn).

| Tệp Node | Phủ gì |
|---|---|
| `nhap.test.mjs` (87 khẳng định) | `src/nhap.js` — `capIdMoi`: bản gốc KHÔNG bị đụng, mọi id mới và duy nhất, dịch **mọi** tham chiếu chéo (hội thoại, chương, nhân vật, tin nhắn, ảnh, hồ sơ, sổ hé lộ, sự kiện vắng mặt, phiên), **ảnh** chỉ nhận nguồn hợp lệ + thuộc truyện, **hồ sơ** chỉ đi kèm khi được tham chiếu (liên kết trỏ hồ sơ thiếu thì bị BỎ), qua `kiemTraTruyen`/`kiemTraTinNhan` (Giai đoạn 5) và `chuanHoaTruyen` idempotent |
| `daoDienFlow.test.mjs` | Câu chữ + trạng thái của bốn nút hướng (nguyên văn), hộp xác nhận hoàn tất/huỷ, `mucGocSau`, `trangThaiKhoiPhuc`; và **mọi `data-act` của màn Đạo diễn phát ra đều có hàm trong `BANG_NUT`** (khoá bảng `"act": hàm` tính là "có xử lý") |
| `bangDieuKhienFlow.test.mjs` | Logic THUẦN của Bảng điều khiển: nhãn chế độ, nhãn vai giao kèo, khung quan hệ mặc định (không hiện), câu gộp nhịp/ngôn ngữ, gộp vai nhân vật/sở thích, đếm chương xong, câu mẹo — câu chữ ghim **nguyên văn** |
| `suaNgoaiHinhFlow.test.mjs` | Câu chữ + quyết định THUẦN của màn Sửa hồ sơ ngoại hình: hằng `NH_MAX_ANH`, nhãn nút theo trạng thái ảnh, ghi chú "hồ sơ dùng chung" theo số liên kết, câu báo sau khi AI điền nháp, câu lỗi AI, hộp hỏi ghi đè mô tả, `giaTriDienThem` (AI chỉ điền vào ô TRỐNG) |

`goi-chung.test.mjs` 1 793 → **2 937 khẳng định**: thêm hai bảng DEPS (`BANG_DIEU_KHIEN_DEPS` 6 ·
`SUA_NGOAI_HINH_DEPS` 3) và hai màn mới trong `MAN_HINH` (vỏ ≤ 150 dòng + nạp điểm vào), và ca
150 dòng quét toàn `src/`. Tổng tầng Node sau Đợt 6d: **22 tệp, 5 233 khẳng định, 0 không đạt**
(mốc 6c: 18 tệp, 4 071). Danh sách bộ Node trong `tv-chay-node.mjs` nay **suy từ thư mục**
(`tests/node/*.test.mjs`) nên thêm tệp mới là tự chạy.

Tầng trình duyệt **1 082/1 082 ca · 32 bộ · 0 cảnh báo** (thêm bộ `rr-ten-that` — 5 ca, **0 tệp
rò rỉ**). Bằng chứng "không đổi hành vi": kịch bản tất định phủ **cả bốn vùng** cho ra JSON
**144 984 ký tự GIỐNG TỪNG BYTE** giữa `app.js` CŨ (6c) và MỚI (6d).

**Hai bẫy mới:**

- **Bảng `*_DEPS` phải viết NHIỀU DÒNG.** Phép đọc bảng của ca DEPS-hai-chiều cắt tới dòng `};`
  **đầu tiên ở cột 0**; bảng viết gọn một dòng làm phép cắt chạy tuốt sang bảng/cấu trúc sau và
  ca báo hàng loạt khoá lạ. Bảng mới luôn viết `const X = {` … `};` nhiều dòng.
- **Ca tự-kiểm-tra của phép quét phải đúng cơ chế.** Bản đầu của `rr-ten-that.js` kiểm "bỏ qua
  chuỗi ngắn" bằng cách dò `"ab"` trong `x "ab"` — nhưng hàm khớp đòi **ranh giới từ**, nên
  `ab` giữa hai nháy vẫn khớp; ca tự kiểm sai và luôn ĐỎ. Nay nó khẳng định trên **chính bộ
  mẫu** (mọi mẫu ≥ 4 ký tự, không mẫu nào là từ thông dụng) + một ca riêng cho ranh giới từ.

### Giai đoạn 7a (snapshot prompt + đo prefix-cache)

Ba truyện mẫu **hư cấu** (`tests/lib/prompt.mjs`): **nhóm thường** · **cảnh riêng** · **chế độ
Đạo diễn**. Mỗi truyện chạy **5 lượt liên tiếp** qua ĐÚNG đường dựng prompt của app (AI giả cắm
vào `aiTextPlugin`, nên chuỗi bắt được chính là `instruction` mà app thật sự gửi đi):
`replyAsGroup` cho cảnh nhóm (lượt 1 là lượt MỞ ĐẦU `moDau`), `replyAs` cho cảnh riêng (tin nhắn
mang dấu `rieng`), và mẫu Đạo diễn có **một lần duyệt Khép cảnh thật** ở lượt 4. Prompt từng lượt
được ghim vào `tests/fixtures/prompt/<mẫu>-<lượt>.txt` (15 tệp, so **từng byte**), mốc đo ở
`moc.json`. Tạo lại: `node tests/lib/tao-prompt-fixture.mjs`.

| Mẫu | 1-2 | 2-3 | 3-4 | 4-5 | nhỏ nhất | trung bình | prompt (byte) |
|---|---|---|---|---|---|---|---|
| nhóm thường | 56,5% | 61,5% | 64,1% | 64,9% | **56,5%** | 61,8% | 5 874 → 8 548 |
| cảnh riêng | 70,0% | 71,5% | 74,1% | 75,9% | **70,0%** | 72,9% | 5 358 → 7 227 |
| chế độ Đạo diễn | 70,5% | 72,2% | **19,3%** | 78,7% | **19,3%** | 60,2% | 9 104 → 13 311 |

Đo bằng **byte UTF-8**; tỉ lệ = tiền tố chung / độ dài prompt SAU (prompt thật sự gửi đi). Ca Node
ĐỎ nếu nhỏ nhất HOẶC trung bình của mẫu nào giảm quá **5 điểm phần trăm** so với `moc.json`.

**Ca CẤU TRÚC (không phụ thuộc độ dài)** — xem luật 18: `doCotPrompt` trong `tests/lib/prompt.mjs`
khẳng định điểm lệch đầu tiên giữa hai lượt liền nhau nằm ở hoặc sau **cuối khối DIỄN BIẾN** của
lượt trước (lượt mới chỉ được NỐI THÊM). Cặp có sự kiện đổi sớm trong CỐT TRUYỆN là chủ đích khai
trong `moc.json` → `mau.<mẫu>.ngoaiLe` kèm `lyDo`; ca kiểm còn khẳng định ngoại lệ đó **vẫn là vi
phạm thật**. Đối chứng âm: `dungDoiChungAm()` (chuỗi động chèn vào khối CỐT TRUYỆN) phải làm **cả
4/4 cặp** bị bắt.

**Phát hiện (đã đo, đã cân nhắc — và đã QUYẾT ĐỊNH):** tỉ lệ leo dần theo lượt ở hai mẫu đầu là
đúng thiết kế: `buildPrompt` đặt tiền tố tĩnh → nhật ký chỉ-nối-thêm → sổ tri thức → `TASK`, nên
phần dùng chung lớn dần; mẫu nhóm thấp hơn vì prompt ngắn (5,9 → 8,5 KB) nên nhật ký chiếm tỉ lệ
nhỏ, và lượt 1 có nhật ký RỖNG (`(chưa có tin nhắn nào)`). **Cặp 3-4 của mẫu Đạo diễn rơi còn
19,3%**: một lần duyệt Khép cảnh đổi *hai khối nằm SỚM trong `buildContext`* — khối NỘI TÂM & QUAN
HỆ (`buildTrangThai`) và khối ĐÍNH CHÍNH/HƯỚNG PHÁT TRIỂN (`buildDaoDien`) — nên toàn bộ ~12,9 KB
còn lại bị tính lại từ chỗ đó thay vì dùng cache. Cùng cơ chế đó, một nhân vật bước vào/rời cảnh sẽ
làm khối HIỆN DIỆN TRONG CẢNH (cũng trong `buildContext`) đổi theo. **QUYẾT ĐỊNH: KHÔNG sửa prompt**
(chốt với chủ dự án): ở đường thường điểm lệch đầu tiên đã nằm đúng chỗ tin nhắn mới nối vào cuối
DIỄN BIẾN nên cấu trúc đã tối ưu, tỉ lệ 56–75% chỉ thấp vì truyện mẫu NGẮN; cú rơi chỉ xảy ra một
lượt mỗi lần Khép cảnh; và dời NỘI TÂM & QUAN HỆ xuống cuối prompt sẽ **đổi trọng số chú ý của
model** → rủi ro chất lượng truyện lớn hơn lợi ích cache. Ghi lại để **lần sau không đề xuất lại**;
muốn đảo ngược thì phải có bằng chứng về chất lượng truyện thật, không chỉ bằng con số cache.

**Kiểm chứng 7a:** tầng Node **23 tệp · 5 437 khẳng định · 0 không đạt** (mốc 6d: 22 tệp ·
5 233); riêng `prompt.test.mjs` **97 khẳng định** (6 việc: so từng byte, mốc prefix-cache, cấu trúc,
đối chứng âm cấu trúc, chạy-lại-giống-hệt, kiểm kê fixture). Tầng trình duyệt **1 082/1 082 ca ·
32 bộ · 0 cảnh báo**; ca quét ngược
**5/5** và **0 tệp rò rỉ** trên **165 tệp của gói** (đã gồm 15 fixture `.txt` mới). Dữ liệu thật
của người dùng **giống từng byte** trước/sau lượt chạy — so cả thư viện ngoại hình, không chỉ tập
khoá. Đối chứng âm (bản sao tạm của cây gói, dựng trong phiên rồi xoá): sửa một ký tự trong một
fixture `.txt` và nâng khống một mốc trong `moc.json` làm `prompt.test.mjs` **3 ca ĐỎ đúng chỗ**
(báo tệp, vị trí ký tự, ngữ cảnh ngắn, mức tụt so với mốc) — phép kiểm thật sự có tác dụng, không
phải ca trang trí. Cách dựng lại đối chứng: chép cả cây gói sang chỗ khác, sửa một ký tự trong
`tests/fixtures/prompt/nhom-1.txt`, nâng `mau.nhom.nhoNhat` trong `moc.json` lên 0.95, rồi chạy
tầng Node trỏ vào bản sao đó — phải thấy đúng 3 ca đỏ.

**Sự cố thật đã gặp ở 7a (và cách sửa):** lượt chạy trình duyệt ĐẦU TIÊN của 7a bị ngắt giữa
chừng (người dùng phải F5 vì tab treo), để lại trong kv một hồ sơ ngoại hình do **form** tạo (id do
app sinh `nh_*`, tên trùng tên kiểm thử — `nh-lib` mục 3 lưu hồ sơ qua form để kiểm luồng nháp AI).
Lượt chạy đầy đủ sau đó cho **25 ca quét ngược ĐỎ trên 24 tệp**: bộ quét đọc hồ sơ rác ấy như DỮ
LIỆU THẬT, mà cái tên đó lại nằm sẵn trong câu văn của gói (ví dụ trong phần mô tả thể loại ở
`main.pjs`) nên khớp hàng loạt — **báo oan**, không phải rò rỉ thật. Nặng hơn: chính bộ dọn dẹp của
`nh-lib`/`nh-io` xoá hồ sơ **theo TÊN**, nên nó đã xoá hồ sơ đó — và cùng cách ấy nó có thể xoá hồ
sơ THẬT của người dùng nếu người dùng đặt tên trùng tên kiểm thử. Đã sửa theo **luật 17**: mọi chỗ
dọn dẹp chỉ xoá theo id; hồ sơ do form tạo ở `nh-lib` mục 3 được xoá ngay theo đúng id vừa lưu;
`nh-visual-setup` và `nh-fix5` cũng bỏ lọc theo tên. Sau khi sửa: chạy đầy đủ **1 082/1 082**,
**0 cảnh báo**, thư viện ngoại hình của người dùng **không đổi một byte**. Ghi lại đây để lần sau
không ai "dọn cho sạch" bằng cách lọc theo tên lần nữa.

### Giai đoạn 8 — "Viết thành truyện" (`vietTruyen`)

**Luật riêng của giai đoạn này (áp ngay từ Đợt 1):**

- `story.truyenVietRa` là dữ liệu **DẪN XUẤT, chỉ-ghi-thêm**: tính năng `vietTruyen` **không bao giờ**
  sửa `canhDaKhep`, `hoiThoais` hay bất kỳ trường nhập vai nào. Ca kiểm của các đợt sau phải chứng
  minh phần nhập vai **giống từng byte** trước/sau khi sinh văn xuôi.
- Bản ghi thiếu trường ⇒ **bù mặc định**, không xoá (bất biến #4). Điểm khác `canhDaKhep`: tham
  chiếu tới hội thoại đã mất vẫn được **GIỮ**, vì văn xuôi của người dùng không sinh lại được.
- `trangThai` lạ ⇒ `loi` (không được rơi về `dangChay`: giao diện sẽ quay vô hạn).
- Fixture hình dạng cũ phải có mục cho **mọi** phiên bản 0..`PHIEN_BAN_TRUYEN`; thêm phiên bản mới
  thì thêm mục + đưa tên trường mới vào `khongCo` của mọi mục cũ.

**Đợt 1 — schema + chuẩn hoá + migration (đã xong, đã kiểm chứng):**

| Việc | Ở đâu |
|---|---|
| `truyenVietRa` trong mô tả truyện + báo mục không phải đối tượng | `src/schema.js` (`MO_TA_TRUYEN`, `kiemTraTruyen`) |
| Mục **v8** trong sổ migration | `src/schema.js` (`MIGRATION_TRUYEN`) |
| `PHIEN_BAN_TRUYEN` 7 → 8, `s.truyenVietRa` bù mặc định, `createStory` khởi tạo mảng | `src/store.js` |
| Id mới (`vt`) + dịch `hoiThoaiId` khi nhập bản sao | `src/nhap.js` (`gomId`, `dichThamChieu`) |
| Fixture **v8** + `khongCo` của v0..v7 | `tests/fixtures/phien-ban-cu.mjs` |
| Ca Node: chuẩn hoá, sổ migration, báo hình dạng, nhập bản sao, mốc phiên bản | `store.test.mjs` · `schema.test.mjs` · `nhap.test.mjs` · `gd4.test.mjs` |

Ca đáng chú ý: `gd4.test.mjs` từng **ghim cứng `PHIEN_BAN_TRUYEN === 7`** với hàm ý "Giai đoạn 4 không
đổi hình dạng". Từ v8, ca đó đổi tên + ghim **8** kèm ghi chú: con số là mốc của TOÀN dự án, chỉ được
tăng khi có mục `MIGRATION_TRUYEN` + đường chuẩn hoá (ràng buộc ghim ở `schema.test.mjs`).

**Kiểm chứng Đợt 1:** tầng Node **23 tệp · 5 500 khẳng định · 0 không đạt** (mốc 7a: 5 437). Tầng
trình duyệt: xem mục "Kiểm chứng Giai đoạn 8" bên dưới (chạy lại đầy đủ trước khi đóng gói).

**Đợt 2 — logic THUẦN: chọn nguồn · chia lô · nén prose (đã xong, đã kiểm chứng):**

| Việc | Ở đâu |
|---|---|
| `layNguonVietTruyen(story, hoiThoaiId, loaiNguon, tinNhan)` — lọc `vai` theo `luc`, cảnh khép theo `huy`/`htIds` | `src/ui/vietTruyen/vietTruyenFlow.js` |
| `chiaLoNguon(doanNguon, gioiHanKyTu)` — chia lô, cắt đoạn quá dài ở ranh giới câu, **không mất chữ** | nt |
| `gioiHanKyTuChoLo(countTokens, idealMaxTokens, mauDo)` — ngân sách ký tự **đo** từ `countTokens` | nt |
| `canNenProse` / `cutProseGiuMachVan` / `phanDauProseCanNen` — mốc 0,6 và phần cuối giữ nguyên | nt |
| Ca Node (24 tệp, **165 khẳng định** riêng tệp này) | `tests/node/vietTruyenFlow.test.mjs` |

Ba điểm cần nhớ khi sửa tệp đó:

- **Tin nhắn là tham số, không nằm trong `story`.** Log thô nằm ở kv riêng (`tinNhan`) nên phải truyền
  vào — cùng quy ước `buildLog(story, conv, messages)` của `ai.js`. Quên truyền ⇒ nguồn rỗng chứ
  không ném lỗi.
- **Không có hằng số ký tự nào bị đóng cứng.** Ngân sách một lô = `0,4 × idealMaxTokens()` (token) ×
  tỉ lệ ký tự/token ĐO trên chính văn bản nguồn; đổi bộ đếm token là ngưỡng tự đổi. Tỉ lệ dự phòng
  3,6 chỉ dùng khi không đo được, và nó bằng đúng mặc định của `countTokens` trong `ai.js`.
- **Chia lô phải chứng minh KHÔNG mất chữ**: ca kiểm so `Σ ký tự các mảnh = Σ ký tự nguồn`, mọi lô
  ≤ ngưỡng (tính cả 2 ký tự nối `"\n\n"`), và nối mọi mảnh ra đúng chuỗi gốc — với cả ngưỡng 1 ký tự
  và đoạn không có dấu câu (phải cắt thẳng thay vì để lô vượt ngưỡng). Đối chứng âm: đoạn LẶP ở hai
  chỗ vẫn phải là **hai** đoạn (chặn lỗi gộp/khử trùng làm mất một đoạn của người dùng).

**Kiểm chứng Đợt 2:** tầng Node **24 tệp · 5 683 khẳng định · 0 không đạt** (Đợt 1: 23 tệp ·
5 500).

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
- **ĐỦ BỐN ĐIỀU mới coi là xong** (luật thường trực, ghi cả ở `src/CONTEXT.md`): (1) hai tầng
  test **XANH**; (2) **quét ngược tên thật 0 rò rỉ**; (3) gói phát hành **không chứa `.git`**;
  (4) **CI GitHub xanh**. Báo cáo cho chủ dự án luôn theo dạng **x/y**.
- CI (`.github/workflows/test.yml`) chạy `npm test` trên **Node 22**. `package.json` dùng
  `node --test tests/node/*.test.mjs`: dạng **thư mục** (`node --test tests/node/`) hỏng trên
  Node ≥21.
- Test cấu trúc gói (`goi-chung.test.mjs`) phải chạy được **cả** trong bản zip giải nén **lẫn**
  trong repo git thật — danh sách "gốc gói" cho phép `.git` khi chạy trong repo. **Nhưng gói
  PHÁT HÀNH thì KHÔNG được chứa `.git`** (bước đóng gói phải lọc bỏ thư mục đó).
- **Bước kiểm SAU khi tải lại URL (bắt buộc):** tải chính URL vừa upload, giải nén vào một thư
  mục tạm, rồi khẳng định (a) gói giải nén **không có `.git`**, và (b) chạy lại `npm test` trên
  bản giải nén cho **0 không đạt** (đặt `ROOT_OVERRIDE` trỏ vào thư mục đó). So byte `src/**`
  giữa gói và workspace: chỉ được khác **khối URL** trong `src/README.md` (bản trong gói trỏ lần
  đóng TRƯỚC), còn lại phải giống hệt từng byte.
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
