// Truyện Vai — tầng kiểm thử Node: màn "Sửa hồ sơ ngoại hình" (src/ui/suaNgoaiHinh/).
//
// Ghim NGUYÊN VĂN câu chữ người dùng đọc (nhãn nút, câu báo lỗi, cảnh báo gửi ảnh cho AI) và các
// quyết định thuần (nhãn nút chính, câu hỏi ghi đè, chỉ điền vào ô trống).
//
// Tệp này KHÔNG dùng dữ liệu thật: mọi chuỗi đều là hư cấu.

import "../lib/moi-truong.js";
import { test, ok, eq } from "../lib/h.js";
import * as F from "../../src/ui/suaNgoaiHinh/suaNgoaiHinhFlow.js";

test("suaNgoaiHinhFlow: hằng số giữ nguyên giá trị đã chốt", () => {
  eq(F.NH_MAX_ANH, 1024, "cạnh dài tối đa của ảnh tham chiếu");
  eq(F.TIEU_DE_MOI, "Hồ sơ ngoại hình mới", "tiêu đề khi tạo mới");
  eq(F.TIEU_DE_SUA, "Sửa hồ sơ ngoại hình", "tiêu đề khi sửa");
  eq(F.NHAN_NUT_TAO, "Tạo hồ sơ", "nhãn nút khi tạo mới");
  eq(F.NHAN_NUT_LUU, "Lưu", "nhãn nút khi sửa");
  eq(F.NHAN_ANH_THEM, "Thêm ảnh tham chiếu", "nhãn khi chưa có ảnh");
  eq(F.NHAN_ANH_DOI, "Đổi ảnh tham chiếu", "nhãn khi đã có ảnh");
});

test("suaNgoaiHinhFlow: câu chữ trạng thái và lỗi (nguyên văn)", () => {
  eq(F.LOI_THIEU_TEN, "Hồ sơ cần có tên chính — đó là tên dùng để nhận diện trong prompt ảnh.", "thiếu tên chính");
  eq(F.LOI_DOC_ANH, "Không đọc được ảnh này. Thử ảnh png/jpg/webp khác.", "đọc ảnh hỏng");
  eq(F.DANG_THU_NHO, "Đang thu nhỏ ảnh…", "đang thu nhỏ ảnh");
  eq(F.THONG_BAO_BO_ANH, "Đã bỏ ảnh tham chiếu khỏi form (chưa lưu).", "bỏ ảnh khỏi form");
  eq(F.LOI_THIEU_MO_TA, "Hãy nhập mô tả, hoặc thêm ảnh tham chiếu, rồi bấm lại.", "thiếu mô tả");
  eq(F.DANG_SOAN, "Đang soạn bản nháp ngoại hình…", "đang soạn bản nháp");
  eq(F.LOI_DOC_ANH_PT, "Không đọc được ảnh để phân tích — chỉ dùng phần mô tả chữ.", "không đọc được ảnh để phân tích");
  eq(F.TOAST_TAO, "Đã tạo hồ sơ ngoại hình.", "toast khi tạo");
  eq(F.TOAST_LUU, "Đã lưu hồ sơ ngoại hình.", "toast khi lưu");
});

test("suaNgoaiHinhFlow: cảnh báo ảnh được GỬI cho AI (nguyên văn)", () => {
  eq(
    F.CANH_BAO_ANH_GUI_AI,
    "Ảnh có trong form sẽ được GỬI tới dịch vụ AI của Perchance để phân tích khi bạn bấm “Tạo hồ sơ từ mô tả / ảnh”.",
    "câu cảnh báo quyền riêng tư của ảnh"
  );
});

test("suaNgoaiHinhFlow: nhãn theo trạng thái tạo mới / sửa", () => {
  eq(F.tieuDeModal(true), F.TIEU_DE_MOI, "mới ⇒ tiêu đề mới");
  eq(F.tieuDeModal(false), F.TIEU_DE_SUA, "sửa ⇒ tiêu đề sửa");
  eq(F.nhanNutChinh(true), F.NHAN_NUT_TAO, "mới ⇒ nút Tạo hồ sơ");
  eq(F.nhanNutChinh(false), F.NHAN_NUT_LUU, "sửa ⇒ nút Lưu");
});

test("suaNgoaiHinhFlow: nhãn nút ảnh có khoảng trắng đứng sau biểu tượng", () => {
  eq(F.nhanNutAnh(true), " Đổi ảnh tham chiếu", "có ảnh ⇒ Đổi (kèm khoảng trắng đầu)");
  eq(F.nhanNutAnh(false), " Thêm ảnh tham chiếu", "chưa có ảnh ⇒ Thêm (kèm khoảng trắng đầu)");
});

test("suaNgoaiHinhFlow: ghi chú hồ sơ dùng chung nêu đúng số liên kết", () => {
  eq(
    F.cauGhiChuDungChung(0),
    '<div class="hint nh-note">Đây là hồ sơ <b>dùng chung</b>: sửa ngoại hình ở đây sẽ ảnh hưởng tới mọi nhân vật liên kết sau này. Tin nhắn cũ không bị sửa.</div>',
    "chưa liên kết ai"
  );
  eq(
    F.cauGhiChuDungChung(7),
    '<div class="hint nh-note">Đây là hồ sơ <b>dùng chung</b>: sửa ngoại hình ở đây sẽ ảnh hưởng tới <b>7</b> nhân vật đang liên kết. Tin nhắn cũ không bị sửa.</div>',
    "có liên kết"
  );
});

test("suaNgoaiHinhFlow: câu báo sau khi AI điền bản nháp nhắc đúng nhãn nút", () => {
  eq(F.cauDaDienBanNhap(true), "Đã điền bản nháp — đọc lại và sửa tuỳ ý, rồi bấm “Tạo hồ sơ”. Chưa có gì được lưu.", "mới");
  eq(F.cauDaDienBanNhap(false), "Đã điền bản nháp — đọc lại và sửa tuỳ ý, rồi bấm “Lưu”. Chưa có gì được lưu.", "sửa");
});

test("suaNgoaiHinhFlow: câu điểm cần chọn và câu lỗi AI", () => {
  eq(F.cauDiemCanChon("giọng nói"), "Đã điền bản nháp. Có điểm cần bạn tự chọn: giọng nói", "dòng trạng thái");
  eq(F.cauDiemCanhBao("giọng nói"), "Điểm cần bạn chọn: giọng nói", "dòng cảnh báo");
  eq(F.cauLoiAi(new Error("mạng lỗi")), "Lỗi: mạng lỗi — nội dung bạn đã nhập vẫn còn nguyên.", "lỗi có message");
  eq(F.cauLoiAi("chuỗi trần"), "Lỗi: chuỗi trần — nội dung bạn đã nhập vẫn còn nguyên.", "lỗi là chuỗi");
});

test("suaNgoaiHinhFlow: hộp hỏi ghi đè mô tả (nguyên văn + nút)", () => {
  const q = F.hoiGhiDeMoTa();
  ok(Array.isArray(q) && q.length === 3, "trả về bộ ba [tiêu đề, nội dung, tuỳ chọn]");
  eq(q[0], "Ghi đè mô tả ngoại hình?", "tiêu đề");
  eq(q[1], "Ô mô tả ngoại hình đang có chữ. Ghi đè bằng bản nháp AI vừa soạn?", "nội dung");
  eq(q[2].yesLabel, "Ghi đè", "nhãn nút đồng ý");
});

test("suaNgoaiHinhFlow: AI chỉ được điền thêm vào ô ĐANG TRỐNG", () => {
  eq(F.giaTriDienThem("", "A"), "A", "ô trống ⇒ điền");
  eq(F.giaTriDienThem("   ", "A"), "A", "ô chỉ có khoảng trắng ⇒ điền");
  eq(F.giaTriDienThem("đã có", "A"), null, "ô có chữ ⇒ giữ nguyên");
  eq(F.giaTriDienThem("đã có", undefined), null, "AI không trả về gì ⇒ giữ nguyên");
  eq(F.giaTriDienThem("", ""), null, "AI trả chuỗi rỗng ⇒ không điền");
});
