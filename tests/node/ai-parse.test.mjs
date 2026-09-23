// Truyện Vai — tầng kiểm thử Node: các BỘ ĐỌC của src/ai.js (hàm thuần, không gọi mạng).
// Chạy: node --test tests/node/
//
// Vì sao tầng này quan trọng: mô hình là thứ KHÔNG đáng tin — nó trả về thiếu mục, sai
// định dạng, đổi thứ tự, hoặc lẫn marker điều khiển vào giữa câu văn. Mọi bộ đọc ở đây
// phải chịu được rác mà KHÔNG ném lỗi và KHÔNG để rác lọt ra giao diện.
//
// Luật: file này KHÔNG dùng dấu gạch chéo ngược (mọi ký tự đặc biệt viết bằng
// String.fromCharCode) để nội dung luôn đi qua mọi tầng trung gian một cách nguyên vẹn.

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau } from "../lib/h.js";
import {
  thoatPerchance, catDieuKhien, docKhep, docHeLo, docKeHoach, docPhieu,
  docKeHoachVangMat, cleanReply,
} from "../../src/ai.js";
import { taoTruyen, taoNhanVat, taoHoiThoai, taoTinNhan, ID_NGUOI } from "../fixtures/truyen.mjs";
import { PHIEU_DAY_DU, PHIEU_TOI_THIEU, PHIEU_RAC, PHIEU_CHUA_NOI } from "../fixtures/phieu.mjs";
import { KE_HOACH_DAY_DU, KE_HOACH_RONG, KE_HOACH_DAO_THU_TU } from "../fixtures/ke-hoach.mjs";
import { VANG_MAT_HAI_SU_KIEN, VANG_MAT_KHONG_CO, VANG_MAT_RAC } from "../fixtures/vang-mat.mjs";

const co = (s, x) => String(s).indexOf(x) >= 0;
const BS = String.fromCharCode(92); // dấu gạch chéo ngược, viết kiểu này cho chắc chắn
const NL = String.fromCharCode(10);

const NV_A = "nv_a"; // Duy
const NV_B = "nv_b"; // Minh Quân

// Dựng truyện + hội thoại tối thiểu. Tên/id ở đây là HƯ CẤU, trung tính.
function dungTruyen() {
  const story = taoTruyen({
    nhanVats: [taoNhanVat(NV_A, "Duy"), taoNhanVat(NV_B, "Minh Quân")],
    nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "" },
  });
  story.hoiThoais = [taoHoiThoai("ht_be", "Bếp", [NV_A, NV_B])];
  return story;
}
function dungConv(story) {
  const ht = story.hoiThoais[0];
  return { id: ht.id, tieuDe: ht.tieuDe, nhanVatIds: ht.nhanVatIds.slice(), hienDien: ht.hienDien.slice() };
}

// ----------------------------------------------------------------- thoatPerchance
test("thoatPerchance: thoát ngoặc để prompt ảnh không bị engine đọc thành lệnh", () => {
  eq(thoatPerchance("a[b]"), "a" + BS + "[b" + BS + "]", "ngoặc vuông bị thoát");
  eq(thoatPerchance("a{b}"), "a" + BS + "{b" + BS + "}", "ngoặc móc bị thoát");
  eq(thoatPerchance("bình thường"), "bình thường", "chữ thường giữ nguyên");
  eq(thoatPerchance(""), "", "chuỗi rỗng");
  eq(thoatPerchance(null), "", "null thành rỗng");
  eq(thoatPerchance(undefined), "", "undefined thành rỗng");
  eq(thoatPerchance(0), "0", "số 0 vẫn là chuỗi");
  eq(thoatPerchance(BS + "["), BS + BS + BS + "[", "gạch chéo có sẵn được đếm, không nhân đôi bừa");
  eq(thoatPerchance("[NGOẠI HÌNH]"), BS + "[NGOẠI HÌNH" + BS + "]", "nhãn khối ngoại hình");
  eq(thoatPerchance("{thì thầm|hét}"), BS + "{thì thầm|hét" + BS + "}", "lồng tiếng trong prompt");
  // Không được mất chữ: bỏ hết gạch chéo thì phải bằng bản gốc.
  const goc = "Một [cười] rồi {a|b} và " + BS + "[lạ]";
  const boHet = (s) => s.split(BS).join("");
  eq(boHet(thoatPerchance(goc)), boHet(goc), "bỏ hết gạch chéo thì về đúng chữ gốc, không mất chữ");
  ok(co(thoatPerchance(goc), BS + "[cười" + BS + "]"), "ngoặc mới được thoát đúng một lớp");
});

// ----------------------------------------------------------------- catDieuKhien
test("catDieuKhien: cắt marker điều khiển, nhưng không ăn chữ thường", () => {
  eq(catDieuKhien("Chờ chút <<HIEN"), "Chờ chút ", "cắt cả marker mới sinh một nửa");
  eq(catDieuKhien("Xong rồi <<KHEP>>"), "Xong rồi ", "cắt khối KHEP");
  eq(catDieuKhien("a <<HET>> b"), "a ", "cắt khối HET");
  eq(catDieuKhien("câu 1" + NL + "<<HIENDIEN>> Duy"), "câu 1" + NL, "cắt khối HIENDIEN ở dòng sau");
  eq(catDieuKhien("2 < 10"), "2 < 10", "dấu nhỏ hơn trong câu không bị cắt");
  eq(catDieuKhien("Anh cười <3"), "Anh cười <3", "trái tim bằng dấu nhỏ hơn giữ nguyên");
  eq(catDieuKhien("<<ngạc nhiên>>"), "<<ngạc nhiên>>", "marker lạ không nằm trong danh sách thì giữ");
  eq(catDieuKhien(""), "", "chuỗi rỗng");
  eq(catDieuKhien(null), "", "null thành rỗng");
  ok(!co(catDieuKhien("ok <<HELO: S1>>"), "<<HELO"), "khối HELO bị cắt khỏi phần hiển thị");
});

// ----------------------------------------------------------------- docKhep
test("docKhep: chỉ nhận có/không, thiếu tín hiệu thì trả null", () => {
  eq(docKhep("văn văn" + NL + "<<KHEP>> có"), true, "có");
  eq(docKhep("<<KHEP>> không"), false, "không");
  eq(docKhep("<<KHEP>> khong nen"), false, "không nên");
  eq(docKhep("<<KHEP>> chưa"), false, "chưa");
  eq(docKhep("<<KHEP>> nên"), true, "nên");
  eq(docKhep("<<KHEP>> đã tới"), true, "đã tới điểm nghỉ");
  eq(docKhep("<<KHEP>> Có gì đó"), true, "hoa thường không quan trọng");
  eq(docKhep("<<KHEP>>"), null, "có marker nhưng không ghi gì");
  eq(docKhep("<<KHEP>> hmm"), null, "chữ không rõ nghĩa thì null chứ không đoán");
  eq(docKhep("không có marker nào"), null, "thiếu marker thì null");
  eq(docKhep(null), null, "null");
});

// ----------------------------------------------------------------- docHeLo
test("docHeLo: đọc mã sự kiện đã lộ, khử trùng", () => {
  eqSau(docHeLo("<<HELO: s1>> rồi <<HELO: s3>>"), ["S1", "S3"], "hai khối riêng");
  eqSau(docHeLo("<<HELO: S1, S2>>"), ["S1", "S2"], "nhiều mã trong một khối");
  eqSau(docHeLo("<<HELO: s1>> <<HELO: s1>>"), ["S1"], "mã lặp chỉ giữ một lần");
  eqSau(docHeLo("<<HELo: s2; s3>>"), ["S2", "S3"], "marker hoa thường lẫn lộn");
  eqSau(docHeLo("không có gì"), [], "không có khối nào");
  eqSau(docHeLo(null), [], "null");
});

// ----------------------------------------------------------------- docKeHoach
test("docKeHoach: đọc kế hoạch Đạo diễn, không phụ thuộc thứ tự mục", () => {
  const k = docKeHoach(KE_HOACH_DAY_DU);
  ok(co(k.trangThaiDau, "chìa khoá"), "trạng thái xuất phát");
  ok(co(k.mucTieu, "tin tưởng"), "mục tiêu");
  eq(k.buoc.length, 4, "BƯỚC CHUYỂN bị cắt còn tối đa 4 bước");
  eq(k.buoc[0], "Một buổi nói chuyện ngắn trong bếp", "bước đầu");
  eq(k.buoc[3], "Một lần Duy chủ động nhờ người chơi giúp", "bước thứ tư");
  ok(!co(k.buoc.join(" "), "thứ năm"), "bước thứ năm không lọt vào");
  eq(k.xungDot, "", "KHONG CO được hiểu là rỗng chứ không lưu chữ đó");
  ok(co(k.dauHieu, "chủ động nhắn tin"), "dấu hiệu");
  ok(co(k.dieuKienDung, "phá lời hứa"), "điều kiện đổi hướng");

  const d = docKeHoach(KE_HOACH_DAO_THU_TU);
  eq(d.mucTieu, "Nguoi choi tin tuong Duy.", "mục tiêu dù đứng đầu");
  eq(d.trangThaiDau, "Duy dang ngoi o ben tau.", "trạng thái dù đứng sau");
  eqSau(d.buoc, ["buoc mot", "buoc hai"], "các bước vẫn đọc được khi thiếu dấu");
  ok(co(d.dieuKienDung, "bo roi giua duong"), "điều kiện đổi hướng dù đứng trước BƯỚC CHUYỂN");

  const r = docKeHoach("");
  eq(r.trangThaiDau, "", "rỗng: trạng thái");
  eq(r.mucTieu, "", "rỗng: mục tiêu");
  eqSau(r.buoc, [], "rỗng: bước");
  eq(r.xungDot, "", "rỗng: xung đột");
});

test("docKeHoach: kế hoạch RỖNG — ghi nhận đúng hành vi hiện tại (bước chưa lọc)", () => {
  // ĐÂY LÀ KHIẾM KHUYẾT ĐÃ BIẾT: các mục khác lọc qua laKhongCo(), riêng BƯỚC CHUYỂN thì
  // không — nên "KHONG CO" vẫn thành một bước. Ca này KHOÁ hành vi hiện tại lại để lần
  // sau có sửa thì biết ngay; xem tests/README.md phần "khiếm khuyết đã biết".
  const k = docKeHoach(KE_HOACH_RONG);
  eqSau(k.buoc, ["KHONG CO"], "bước giữ nguyên chuỗi KHONG CO (khiếm khuyết đã biết)");
  eq(k.mucTieu, "", "mục tiêu rỗng");
  eq(k.dauHieu, "", "dấu hiệu n/a thành rỗng");
  eq(k.xungDot, "", "xung đột gạch ngang thành rỗng");
  eq(k.dieuKienDung, "", "điều kiện none thành rỗng");
});

// ----------------------------------------------------------------- docPhieu
test("docPhieu: phiếu khép cảnh đầy đủ đi vào đúng các trường", () => {
  const story = dungTruyen();
  const conv = dungConv(story);
  const p = docPhieu(PHIEU_DAY_DU, { story, conv });
  ok(co(p.tomTat, "bến tàu"), "tóm tắt");
  eq(p.kyUc.length, 2, "hai ký ức");
  ok(co(p.kyUc[0].noiDung, "bến tàu"), "ký ức đầu");
  ok(p.kyUc[0].id !== p.kyUc[1].id, "mỗi ký ức một id riêng");
  eqSau(p.kyUc[0].biet, [ID_NGUOI, NV_B, NV_A], "BIẾT đọc được tên, người chơi luôn có mặt");
  eqSau(p.kyUc[1].biet, [ID_NGUOI], "không ghi BIẾT thì mặc định chỉ người chơi");

  eq(p.quanHe.length, 3, "ba mục quan hệ");
  eq(p.quanHe[0].tu, NV_B, "quan hệ 0: từ ai");
  eq(p.quanHe[0].den, NV_A, "quan hệ 0: tới ai");
  eq(p.quanHe[0].chieu, "tinTuong", "quan hệ 0: chiều");
  eq(p.quanHe[0].huong, 1, "quan hệ 0: đi lên");
  eq(p.quanHe[0].lyDo, "đã giữ lời", "quan hệ 0: lý do");
  eq(p.quanHe[1].chieu, "chuaNoi", "quan hệ 1: điều chưa nói");
  eq(p.quanHe[1].moi, "vẫn còn giận chuyện cũ", "quan hệ 1: nội dung");
  eq(p.quanHe[1].huong, 1, "quan hệ 1: chưa nói luôn đi lên");
  eq(p.quanHe[2].chieu, "cangThang", "quan hệ 2: chiều");
  eq(p.quanHe[2].huong, -1, "quan hệ 2: đi xuống");

  eq(p.nhanVat.length, 2, "hai mục nhân vật");
  eq(p.nhanVat[0].nvId, NV_A, "nhân vật 0");
  eq(p.nhanVat[0].truong, "camXuc", "nhân vật 0: trường");
  eq(p.nhanVat[0].cu, "lạnh nhạt", "nhân vật 0: giá trị cũ");
  eq(p.nhanVat[0].moi, "dịu hơn", "nhân vật 0: giá trị mới");
  eq(p.nhanVat[0].lyDo, "được quan tâm", "nhân vật 0: lý do");
  eq(p.nhanVat[1].nvId, NV_B, "nhân vật 1");
  eq(p.nhanVat[1].truong, "mucTieu", "nhân vật 1: trường");
  eq(p.nhanVat[1].moi, "giữ lời hứa", "nhân vật 1: giá trị mới");
  ok(co(p.moc, "bến tàu"), "móc cảnh sau");
  eqSau(p.tienDo, [], "không có hướng Đạo diễn thì không có tiến độ");
});

test("docPhieu: chịu được phiếu thiếu mục và phiếu RÁC", () => {
  const story = dungTruyen();
  const conv = dungConv(story);
  const t = docPhieu(PHIEU_TOI_THIEU, { story, conv });
  ok(co(t.tomTat, "nhẹ nhàng"), "phiếu tối thiểu vẫn có tóm tắt");
  eqSau(t.kyUc, [], "KHONG CO ở KÝ ỨC không lưu chữ KHONG CO");
  eqSau(t.quanHe, [], "KHONG CO ở QUAN HỆ");
  eqSau(t.nhanVat, [], "KHONG CO ở NHÂN VẬT");
  eq(t.moc, "", "KHONG CO ở MÓC");

  const r = docPhieu(PHIEU_RAC, { story, conv });
  eq(r.tomTat, "", "rác: không tóm tắt");
  eqSau(r.kyUc, [], "rác: không ký ức");
  eqSau(r.quanHe, [], "rác: không quan hệ");
  eqSau(r.nhanVat, [], "rác: không nhân vật");
  eq(r.moc, "", "rác: không móc");
  eq(docPhieu("", { story, conv }).tomTat, "", "chuỗi rỗng không làm vỡ");
});

test("docPhieu: CHƯA NÓI đứng một mình vẫn thành mục quan hệ", () => {
  const story = dungTruyen();
  const conv = dungConv(story);
  const p = docPhieu(PHIEU_CHUA_NOI, { story, conv });
  eq(p.quanHe.length, 1, "đúng một mục");
  eq(p.quanHe[0].tu, NV_A, "từ Duy");
  eq(p.quanHe[0].den, NV_B, "tới Minh Quân");
  eq(p.quanHe[0].chieu, "chuaNoi", "chiều là chưa nói");
  eq(p.quanHe[0].moi, "định nói ra nhưng thôi", "nội dung chưa nói");
});

test("docPhieu: người biết mặc định lấy từ lịch sử tin nhắn, và tôn trọng cảnh riêng", () => {
  const story = dungTruyen();
  const conv = dungConv(story);
  const raw = "TÓM TẮT: một chuyện nhỏ." + NL + "KÝ ỨC:" + NL + "- chuyện nhỏ trong bếp";
  const msgs = [taoTinNhan("m1", "ai", "Duy", "nói gì đó", { nvId: NV_A })];
  const p1 = docPhieu(raw, { story, conv, messages: msgs });
  eqSau(p1.kyUc[0].biet, [ID_NGUOI, NV_A], "mặc định: người chơi + người vừa nói");
  eq(p1.kyUc[0].rieng, "", "không có cảnh riêng thì để rỗng");
  const p2 = docPhieu(raw, { story, conv, messages: msgs, rieng: NV_B });
  eq(p2.kyUc[0].rieng, NV_B, "ký ức ghi rõ thuộc cảnh riêng");
  ok(p2.kyUc[0].biet.indexOf(NV_B) >= 0, "người của cảnh riêng luôn nằm trong danh sách biết");
});

test("laKhongCo (gián tiếp): chữ thật không bị nuốt, mà rỗng thì nhận ra", () => {
  const story = dungTruyen();
  const conv = dungConv(story);
  const rong = (v) => docKeHoach("MỤC TIÊU: " + v).mucTieu;
  eq(rong("KHONG CO"), "", "khong co");
  eq(rong("không có gì"), "", "khong co gi");
  eq(rong("KHONG"), "", "khong");
  eq(rong("n/a"), "", "n/a");
  eq(rong("N/A"), "", "N/A hoa");
  eq(rong("-"), "", "gạch ngang");
  eq(rong("---"), "", "nhiều gạch ngang");
  eq(rong("none"), "", "none");
  eq(rong("None."), "", "none kèm dấu chấm");
  eq(rong("không có"), "", "không có");
  ok(rong("Không còn gì để nói").length > 0, "câu có chữ 'không' nhưng không rỗng thì giữ");
  ok(rong("n/a nhưng thực ra có").length > 0, "n/a nằm trong câu dài thì giữ");
  ok(rong("mục tiêu là n/a").length > 0, "n/a ở cuối câu dài vẫn giữ");
  eq(rong("n / a"), "", "n / a có khoảng trắng");
  const p = docPhieu("TÓM TẮT: n/a" + NL + "MÓC: -", { story, conv });
  eq(p.tomTat, "", "tóm tắt n/a không lọt vào dữ liệu");
  eq(p.moc, "", "móc gạch ngang không lọt vào dữ liệu");
});
