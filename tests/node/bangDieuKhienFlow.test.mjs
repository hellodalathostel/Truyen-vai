// Truyện Vai — tầng kiểm thử Node: màn "Bảng điều khiển" (src/ui/bangDieuKhien/).
//
// Màn này chỉ DỰNG CHUỖI HTML, nên phần "logic" của nó là vài phép suy ra nhỏ và những CÂU CHỮ
// người dùng đọc (nhãn chế độ, nhãn vai giao kèo, câu mẹo). Ghim nguyên văn ở đây để một lần
// đổi chữ lặng lẽ không lọt qua.
//
// Tệp này KHÔNG dùng dữ liệu thật: mọi chuỗi đều là hư cấu.

import "../lib/moi-truong.js";
import { test, ok, eq } from "../lib/h.js";
import {
  coKhungQuanHe, gopKhungQuanHe, gopNhipNgonNgu, gopSoThich, gopVaiNhanVat, meoTongQuan,
  nhanCheDo, nhanVaiGiaoKeo, soChuongXong,
} from "../../src/ui/bangDieuKhien/bangDieuKhienFlow.js";

test("bangDieuKhienFlow: nhãn chế độ truyện (nguyên văn)", () => {
  eq(nhanCheDo({ mode: "chuong" }), "📖 nhiều chương", "chế độ nhiều chương");
  eq(nhanCheDo({ mode: "hoiThoai" }), "🧵 nhiều hội thoại", "chế độ nhiều hội thoại");
  eq(nhanCheDo({}), "🧵 nhiều hội thoại", "mặc định là nhiều hội thoại");
});

test("bangDieuKhienFlow: nhãn vai của giao kèo (nguyên văn)", () => {
  eq(nhanVaiGiaoKeo({ vaiNguoiChoi: "dom" }), "Dom — bạn nắm quyền", "dom");
  eq(nhanVaiGiaoKeo({ vaiNguoiChoi: "switch" }), "Switch — đổi vai", "switch");
  eq(nhanVaiGiaoKeo({ vaiNguoiChoi: "sub" }), "Sub — bạn trao quyền", "sub");
  eq(nhanVaiGiaoKeo({}), "Sub — bạn trao quyền", "thiếu vai ⇒ sub");
});

test("bangDieuKhienFlow: khung quan hệ mặc định KHÔNG hiện dòng nào", () => {
  eq(coKhungQuanHe(null), false, "không có khung ⇒ không hiện");
  eq(coKhungQuanHe({ id: "the-gioi-mo", ten: "Thế giới mở", emoji: "🌐" }), false, "khung mặc định ⇒ ẩn");
  eq(coKhungQuanHe({ id: "khac", ten: "Khác", emoji: "🔗" }), true, "khung khác ⇒ hiện");
  eq(gopKhungQuanHe({ emoji: "🔗", ten: "Khác" }), "🔗 Khác", "ghép emoji + tên");
});

test("bangDieuKhienFlow: câu gộp nhịp & ngôn ngữ chỉ có phần có thật", () => {
  eq(gopNhipNgonNgu(null, null), "", "không có gì ⇒ rỗng");
  eq(gopNhipNgonNgu({ ten: "Chậm" }, null), "nhịp: Chậm", "chỉ có nhịp");
  eq(gopNhipNgonNgu(null, { ten: "Thô" }), "ngôn ngữ: Thô", "chỉ có ngôn ngữ");
  eq(gopNhipNgonNgu({ ten: "Chậm" }, { ten: "Thô" }), "nhịp: Chậm · ngôn ngữ: Thô", "cả hai, ngăn bằng dấu chấm giữa");
});

test("bangDieuKhienFlow: câu gộp vai nhân vật / sở thích", () => {
  eq(gopVaiNhanVat([{ ten: "A", vaiBdsm: "Dom" }, { ten: "B", vaiBdsm: "Sub" }]), "A (Dom), B (Sub)", "vai nhân vật");
  eq(gopVaiNhanVat([]), "", "danh sách rỗng");
  eq(gopSoThich([{ ten: "x" }, { ten: "y" }]), "x, y", "sở thích");
  eq(gopSoThich([]), "", "sở thích rỗng");
});

test("bangDieuKhienFlow: đếm số chương đã kết thúc", () => {
  eq(soChuongXong({ chuongs: [{ daKetThuc: true }, { daKetThuc: false }, { daKetThuc: true }] }), 2, "đếm đúng");
  eq(soChuongXong({ chuongs: [] }), 0, "không có chương");
});

test("bangDieuKhienFlow: câu mẹo theo chế độ (nguyên văn)", () => {
  const chuong = meoTongQuan({ mode: "chuong" });
  const hoiThoai = meoTongQuan({ mode: "hoiThoai" });
  eq(
    chuong,
    "Mẹo: khi một chương đã đi đủ xa, bấm “Kết thúc chương” — AI sẽ tóm tắt diễn biến và gợi ý chương kế tiếp cho bạn.",
    "mẹo chế độ nhiều chương"
  );
  eq(
    hoiThoai,
    "Mẹo: bạn có thể trò chuyện riêng với từng nhân vật, rồi mở “Hội thoại mới” và chọn nhiều người để tạo group chat dùng chung bối cảnh.",
    "mẹo chế độ nhiều hội thoại"
  );
  ok(chuong.length > 0 && hoiThoai.length > 0, "hai câu mẹo đều không rỗng");
});
