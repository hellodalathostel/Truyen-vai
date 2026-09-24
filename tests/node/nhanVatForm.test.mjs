// Truyện Vai — tầng kiểm thử Node: LOGIC THUẦN của màn "Sửa nhân vật" (Đợt 6b).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `openCharacterEditor` từng là một hàm 537 dòng trộn DOM với quyết
// định, nên cổng 18+ của màn này không kiểm được gì ở tầng Node. Sau khi tách, mọi quyết
// định nằm ở `src/ui/nhanVat/nhanVatForm.js` — tệp này ghim chúng lại.
//
// Bốn luật 18+ của màn này:
//   1. tuổi số dưới 18 ⇒ KHOÁ CỨNG ô "Người trưởng thành (18+)" (bỏ tích + không tích lại)
//   2. lúc LƯU: tuổi số dưới 18 LUÔN thắng ô tích
//   3. thiếu tuổi KHÔNG phải là người lớn — chỉ cờ do người dùng tự tích mới tính
//   4. hồ sơ ngoại hình đã khai tuổi ⇒ tuổi nhân vật theo hồ sơ (tuổi khai báo thắng ảnh)
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const F = await import("../../src/ui/nhanVat/nhanVatForm.js");

const NL = String.fromCharCode(10);

// =============================================================== 1. khoá cứng theo tuổi
test("khoaNguoiLonTheoTuoi: dưới 18 ⇒ bỏ tích + khoá + giải thích; 18 trở lên ⇒ mở", () => {
  const tre = F.khoaNguoiLonTheoTuoi(17);
  eq(tre.tre, true, "17 tuổi bị coi là trẻ");
  eq(tre.boTich, true, "17 tuổi ⇒ bỏ tích");
  ok(tre.title.length > 0, "17 tuổi ⇒ có lời giải thích");
  eq(tre.title, F.LY_DO_KHOA_TUOI, "đúng câu chữ đã ghim");
  for (const t of [0, 1, 12, 17]) eq(F.khoaNguoiLonTheoTuoi(t).tre, true, "dưới 18 bị khoá: " + t);
  for (const t of [18, 19, 30, 99]) eq(F.khoaNguoiLonTheoTuoi(t).tre, false, "từ 18 được mở: " + t);
  const trong = F.khoaNguoiLonTheoTuoi(null);
  eq(trong.tre, false, "thiếu tuổi KHÔNG bị khoá");
  eq(trong.boTich, false, "thiếu tuổi không tự bỏ tích");
  eq(trong.title, "", "thiếu tuổi không có lời giải thích");
  eq(F.khoaNguoiLonTheoTuoi(undefined).tre, false, "undefined cũng như thiếu tuổi");
});

// =============================================================== 2+3. chốt lúc LƯU
test("chotNguoiLon: tuổi dưới 18 luôn thắng ô tích; thiếu tuổi không phải người lớn", () => {
  eq(F.chotNguoiLon({ tuoi: 17, nguoiLon: true }), false, "tuổi 17 thắng ô tích đang bật");
  eq(F.chotNguoiLon({ tuoi: 17, nguoiLon: false }), false, "tuổi 17 và ô tích tắt");
  eq(F.chotNguoiLon({ tuoi: 18, nguoiLon: true }), true, "đúng 18 và ô tích bật ⇒ người lớn");
  eq(F.chotNguoiLon({ tuoi: 30, nguoiLon: true }), true, "30 và ô tích bật");
  eq(F.chotNguoiLon({ tuoi: 30, nguoiLon: false }), false, "30 nhưng ô tích tắt ⇒ không");
  eq(F.chotNguoiLon({ tuoi: null, nguoiLon: true }), true, "thiếu tuổi nhưng ô tích TƯỜNG MINH ⇒ người lớn");
  eq(F.chotNguoiLon({ tuoi: null, nguoiLon: false }), false, "thiếu tuổi, ô tích tắt ⇒ không");
  eq(F.chotNguoiLon({ tuoi: null }), false, "thiếu tuổi, thiếu ô tích ⇒ KHÔNG phải người lớn");
  eq(F.chotNguoiLon({ nguoiLon: true }), true, "không có trường tuổi, ô tích bật");
  eq(F.chotNguoiLon({ tuoi: null, nguoiLon: 0 }), false, "0 không phải là bật");
  eq(F.chotNguoiLon({ tuoi: 19, nguoiLon: "x" }), true, "giá trị thật ⇒ bật");
});

// =============================================================== 4. tuổi theo hồ sơ
test("tuoiTheoHoSo: hồ sơ khai tuổi thì tuổi nhân vật theo hồ sơ", () => {
  eq(F.tuoiTheoHoSo(null), null, "không có hồ sơ ⇒ không ràng buộc");
  eq(F.tuoiTheoHoSo(undefined), null, "undefined ⇒ không ràng buộc");
  eq(F.tuoiTheoHoSo({}), null, "hồ sơ không khai tuổi ⇒ không ràng buộc");
  eq(F.tuoiTheoHoSo({ tuoi: "" }), null, "tuổi rỗng ⇒ không ràng buộc");
  eq(F.tuoiTheoHoSo({ tuoi: "24" }), "24", "tuổi dạng chuỗi ⇒ trả nguyên văn");
  eq(F.tuoiTheoHoSo({ tuoi: 24 }), "24", "tuổi dạng số ⇒ trả thành chuỗi");
  eq(F.tuoiTheoHoSo({ tuoi: "17" }), "17", "hồ sơ ghi 17 ⇒ vẫn ràng buộc (và sẽ bị cổng chặn)");
  eq(F.tuoiTheoHoSo({ tuoi: "abc" }), null, "tuổi không đọc được ⇒ không ràng buộc");
});

// =============================================================== tên hiển thị
test("tenTrongForm / tenSauKhiLuu: tên mặc định không được hiện như tên thật", () => {
  eq(F.TEN_MAC_DINH, "Nhân vật mới", "hằng tên mặc định");
  eq(F.tenTrongForm({ ten: "Nhân vật mới" }), "", "đúng tên mặc định ⇒ để trống cho người dùng tự đặt");
  eq(F.tenTrongForm({ ten: "An" }), "An", "tên thật ⇒ hiện nguyên văn");
  eq(F.tenTrongForm({}), "", "chưa có tên ⇒ trống");
  eq(F.tenTrongForm({ ten: "" }), "", "tên rỗng ⇒ trống");
  eq(F.tenSauKhiLuu("  an  "), "an", "cắt khoảng trắng hai đầu");
  eq(F.tenSauKhiLuu(""), "Nhân vật mới", "bỏ trống ⇒ về tên mặc định");
  eq(F.tenSauKhiLuu("   "), "Nhân vật mới", "toàn khoảng trắng ⇒ về tên mặc định");
  eq(F.tenSauKhiLuu(null), "Nhân vật mới", "null ⇒ về tên mặc định");
  eq(F.tenSauKhiLuu(undefined), "Nhân vật mới", "undefined ⇒ về tên mặc định");
});

// =============================================================== hai nút AI + ô thích
test("bdsmTrongEditor: giao kèo đã bật HOẶC người dùng vừa mở khối ra xem", () => {
  eq(F.bdsmTrongEditor({ gkBat: true, moRong: false }), true, "truyện đã bật giao kèo");
  eq(F.bdsmTrongEditor({ gkBat: false, moRong: true }), true, "vừa mở khối giao kèo ra xem");
  eq(F.bdsmTrongEditor({ gkBat: true, moRong: true }), true, "cả hai");
  eq(F.bdsmTrongEditor({ gkBat: false, moRong: false }), false, "không gì cả");
  eq(F.bdsmTrongEditor({}), false, "thiếu hết");
});

test("soThichTuChuoi: chuỗi trong ô ẩn sang mảng id, hai kiểu cắt khác nhau", () => {
  eqSau(F.soThichTuChuoi("a,b", false), ["a", "b"], "bật/tắt chip: giữ nguyên từng phần");
  eqSau(F.soThichTuChuoi(" a , b ", false), [" a ", " b "], "bật/tắt chip KHÔNG cắt khoảng trắng");
  eqSau(F.soThichTuChuoi(" a , b ", true), ["a", "b"], "lúc LƯU có cắt khoảng trắng");
  eqSau(F.soThichTuChuoi("a,,b,", false), ["a", "b"], "bỏ phần rỗng");
  eqSau(F.soThichTuChuoi("a,,b,", true), ["a", "b"], "bỏ phần rỗng khi cắt");
  eqSau(F.soThichTuChuoi("", false), [], "rỗng ⇒ mảng rỗng");
  eqSau(F.soThichTuChuoi(null, true), [], "null ⇒ mảng rỗng");
  eqSau(F.soThichTuChuoi(" , ", true), [], "toàn khoảng trắng ⇒ mảng rỗng");
  eqSau(F.soThichTuChuoi("mot", false), ["mot"], "một phần tử");
});

test("doiSoThich: bật/tắt một id, không sửa mảng gốc, giữ thứ tự", () => {
  const goc = ["a", "b"];
  eqSau(F.doiSoThich(goc, "b"), ["a"], "đang có ⇒ bỏ ra");
  eqSau(goc, ["a", "b"], "mảng gốc không bị sửa");
  eqSau(F.doiSoThich(goc, "c"), ["a", "b", "c"], "chưa có ⇒ thêm vào CUỐI");
  eqSau(F.doiSoThich([], "a"), ["a"], "mảng rỗng ⇒ thêm vào");
  eqSau(F.doiSoThich(null, "a"), ["a"], "null vẫn an toàn");
  eqSau(F.doiSoThich(["a", "b", "c"], "b"), ["a", "c"], "giữ thứ tự còn lại");
});

// =============================================================== lời nhắc dưới khối liên kết
test("goiYTuoiText: hồ sơ khai tuổi thì nói TRƯỚC rằng tuổi hồ sơ sẽ thắng", () => {
  const t1 = F.goiYTuoiText({ tenHoSo: "An", tuoiHoSo: "24", tuoiForm: null, coThuVien: true });
  ok(t1.indexOf("An") >= 0, "nêu tên hồ sơ");
  ok(t1.indexOf("24") >= 0, "nêu tuổi hồ sơ");
  ok(t1.indexOf("lấy theo hồ sơ") >= 0, "nói rõ tuổi sẽ lấy theo hồ sơ");
  ok(t1.indexOf("dưới 18") < 0, "người lớn thì không nhắc chuyện dưới 18");
  eq(t1.indexOf("hiện đang ghi"), -1, "chưa ghi tuổi trong form thì không nhắc chênh lệch");
  const t2 = F.goiYTuoiText({ tenHoSo: "An", tuoiHoSo: "24", tuoiForm: "30", coThuVien: true });
  ok(t2.indexOf("hiện đang ghi 30") >= 0, "form đang ghi tuổi khác thì nêu ra");
  const t3 = F.goiYTuoiText({ tenHoSo: "Be", tuoiHoSo: "16", tuoiForm: "16", coThuVien: true });
  ok(t3.indexOf("KHÔNG thể là người trưởng thành") >= 0, "hồ sơ dưới 18 ⇒ cảnh báo ngay");
  eq(t3.indexOf("hiện đang ghi"), -1, "hai bên bằng nhau thì không nhắc chênh lệch");
  const t4 = F.goiYTuoiText({ tenHoSo: "An", tuoiHoSo: null, tuoiForm: null, coThuVien: true });
  ok(t4.indexOf("CỐ ĐỊNH") >= 0, "có thư viện nhưng hồ sơ chưa khai tuổi ⇒ lời nhắc chung");
  const t5 = F.goiYTuoiText({ tenHoSo: "", tuoiHoSo: null, tuoiForm: null, coThuVien: false });
  ok(t5.indexOf("Chưa có hồ sơ nào") >= 0, "chưa có thư viện ⇒ chỉ đường mở Thư viện");
  const t6 = F.goiYTuoiText({ tenHoSo: "Be", tuoiHoSo: "16", tuoiForm: null, coThuVien: true });
  ok(t6.indexOf("hiện đang ghi") < 0, "tuổi form rỗng thì không nhắc chênh lệch");
  ok(t6.indexOf("dưới 18") >= 0, "vẫn cảnh báo dưới 18");
});

// =============================================================== snapshot prompt ảnh đại diện
test("promptAvatarAi: đầu vào cố định ⇒ GIỐNG TỪNG BYTE", () => {
  const p = F.promptAvatarAi({ ten: "An", theLoaiTen: "Học viện", moTa: "tóc đen dài" });
  eq(
    p,
    "Chân dung nhân vật An trong một câu chuyện Học viện. Ngoại hình: tóc đen dài. Chất lượng cao, ánh sáng điện ảnh, nền đơn giản, cận cảnh khuôn mặt.",
    "prompt gửi máy vẽ phải khớp từng ký tự"
  );
  eq(new TextEncoder().encode(p).length, 190, "độ dài byte của prompt mẫu");
  eq(
    F.promptAvatarAi({ ten: "", theLoaiTen: "", moTa: "" }),
    "Chân dung nhân vật nhân vật trong một câu chuyện viễn tưởng. Ngoại hình: bí ẩn. Chất lượng cao, ánh sáng điện ảnh, nền đơn giản, cận cảnh khuôn mặt.",
    "thiếu hết ⇒ dùng chữ mặc định"
  );
});

// =============================================================== câu chữ của nút "Bật giao kèo"
test("câu chữ của nút Bật giao kèo và của khoá tuổi giữ nguyên từng ký tự", () => {
  eq(F.LY_DO_BAT_GIAO_KEO, "Bạn đang bật giao kèo BDSM cho truyện này.", "lý do hỏi 18+");
  eq(F.LOI_TU_CHOI_BAT_GIAO_KEO, "Chưa xác nhận 18+ nên giao kèo chưa được bật.", "lời từ chối");
  eq(F.LY_DO_KHOA_TUOI, "Nhân vật ghi tuổi dưới 18 — không thể đánh dấu là người trưởng thành.", "lời giải thích khi khoá ô");
  eq(F.LY_DO_KHOA_TUOI.indexOf(NL), -1, "lời giải thích chỉ một dòng");
});
