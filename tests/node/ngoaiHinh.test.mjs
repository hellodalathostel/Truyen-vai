// Truyện Vai — tầng kiểm thử Node: thư viện ngoại hình (src/ngoaiHinh.js).

import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import {
  chuanHoaHoSo, tenUngVien, ungVienNgoaiHinh, hoSoTheoId, nhanDienNgoaiHinh, ngoaiHinhEn,
  tranhEn, khoiNgoaiHinh, tachNgoaiHinh, ghepPromptNgoaiHinh, gopLoaiTruNgoaiHinh,
  coDauTiengViet, canDichNgoaiHinh, boBanDichCu, demLienKetNgoaiHinh, demDungNgoaiHinh,
  moTaNguoiDung, thamChieuMo, hoSoCuaTruyen, nguoiChoiNhuNhanVat, hoSoNguoiChoi, laNguoiChoi,
  ID_NGUOI_CHOI, MARK_NGOAI_HINH, MARK_NGOAI_HINH_CU,
} from "../../src/ngoaiHinh.js";
import { taoTruyen, taoNhanVat, taoHoiThoai, taoHoSo } from "../fixtures/truyen.mjs";

const co = (s, x) => String(s).indexOf(x) >= 0;
const HS_A = taoHoSo("nh_a", "Minh Quân", { tuoi: "31", moTa: "cao, vai rộng, tóc ngắn", tranh: "mũ lưỡi trai" });
const HS_B = taoHoSo("nh_b", "Duy", { tuoi: "28", moTa: "thấp hơn, mắt một mí" });

test("chuanHoaHoSo: cắt khoảng trắng, đóng dấu phiên bản", () => {
  const h = chuanHoaHoSo({ id: "nh_x", tenChinh: "  Duy  ", moTa: "  cao  ", anh: 5 });
  eq(h.tenChinh, "Duy", "tên được cắt");
  eq(h.moTa, "cao", "mô tả được cắt");
  eq(h.anh, "", "ảnh không phải chuỗi thì thành rỗng");
  ok(h.phienBan > 0, "có đóng dấu phiên bản hồ sơ");
  const h2 = chuanHoaHoSo(null);
  eq(h2.tenChinh, "", "null thành hồ sơ rỗng");
  eq(h2.tuoi, "", "tuổi rỗng");
  eq(h2.luc, 0, "mốc thời gian mặc định 0");
});

test("tenUngVien: gom mọi cách gọi, bỏ trùng, bỏ tên quá ngắn", () => {
  const c = taoNhanVat("nv_a", "Minh Quân", { bietDanh: "Quân" });
  const ds = tenUngVien(c, HS_A);
  ok(ds.indexOf("Minh Quân") >= 0, "có tên hồ sơ");
  ok(ds.indexOf("Quân") >= 0, "có biệt danh");
  eq(ds.length, 2, "không lặp lại tên trùng (tên nhân vật trùng tên hồ sơ)");
  const ds2 = tenUngVien(taoNhanVat("nv_b", "A"), HS_B);
  ok(ds2.indexOf("A") < 0, "tên một ký tự bị bỏ");
  ok(ds2.indexOf("Duy") >= 0, "vẫn giữ tên hồ sơ");
  eqSau(tenUngVien(null, null), [], "không có gì thì rỗng");
});

test("nhanDienNgoaiHinh: chỉ tự chọn tên KHÔNG mơ hồ", () => {
  const ds = [
    { nvId: "nv_a", hoSoId: "nh_a", ten: ["Minh Quân", "Quân"] },
    { nvId: "nv_b", hoSoId: "nh_b", ten: ["Duy"] },
  ];
  eqSau(nhanDienNgoaiHinh("Khung hình có Minh Quân đang đứng.", ds).chon, ["nh_a"], "nhận ra tên duy nhất");
  eq(nhanDienNgoaiHinh("Khung hình có Minh Quân đang đứng.", ds).trung.length, 0, "không có tên mơ hồ");
  eqSau(nhanDienNgoaiHinh("Duy và Quân ngồi đối diện.", ds).chon, ["nh_a", "nh_b"], "nhận ra hai người");
  eqSau(nhanDienNgoaiHinh("Khung cảnh trống.", ds).chon, [], "không nhắc ai thì không chọn gì");
  eq(nhanDienNgoaiHinh("", ds).chon.length, 0, "văn bản rỗng");
  const dsTrung = [
    { nvId: "nv_a", hoSoId: "nh_a", ten: ["An"] },
    { nvId: "nv_b", hoSoId: "nh_b", ten: ["An"] },
  ];
  const kq = nhanDienNgoaiHinh("An đứng đó.", dsTrung);
  eq(kq.chon.length, 0, "tên trùng hai người thì KHÔNG tự chọn");
  eq(kq.trung.length, 1, "báo là mơ hồ để người dùng tự chọn");
  eq(kq.trung[0].ids.length, 2, "mơ hồ giữa hai hồ sơ");
  eqSau(nhanDienNgoaiHinh("Anh ấy đứng đó.", dsTrung).chon, [], "tên phải khớp trọn từ");
  eqSau(nhanDienNgoaiHinh("an đứng đó.", dsTrung).trung.length, 1, "khớp không phân biệt hoa thường");
});

test("ngoaiHinhEn / tranhEn: ưu tiên bản tiếng Anh", () => {
  eq(ngoaiHinhEn(HS_A), "cao, vai rộng, tóc ngắn", "chưa dịch thì dùng bản gốc");
  eq(ngoaiHinhEn({ moTa: "gốc", moTaEn: "  tall, broad  " }), "tall, broad", "có bản dịch thì dùng bản dịch");
  eq(ngoaiHinhEn(null), "", "null thành rỗng");
  eq(tranhEn(HS_A), "mũ lưỡi trai", "điều cần tránh dùng bản gốc");
  eq(tranhEn({ tranh: "gốc", tranhEn: "hat" }), "hat", "có bản dịch thì dùng bản dịch");
});

test("khoiNgoaiHinh: mỗi người một dòng, có tuổi và điều cần tránh", () => {
  const khoi = khoiNgoaiHinh([HS_A, HS_B]);
  ok(co(khoi, MARK_NGOAI_HINH), "có nhãn khối");
  ok(co(khoi, "Minh Quân (age 31)"), "có tên và tuổi");
  ok(co(khoi, "avoid: mũ lưỡi trai"), "có phần cần tránh");
  eq(khoi.split(String.fromCharCode(10)).length, 3, "một dòng nhãn và hai dòng người");
  eq(khoiNgoaiHinh([]), "", "không có hồ sơ thì khối rỗng");
  eq(khoiNgoaiHinh([taoHoSo("nh_c", "X")]), "", "hồ sơ không có mô tả thì không tạo khối");
});

test("tachNgoaiHinh: cắt được cả nhãn mới lẫn nhãn tiếng Việt cũ", () => {
  const goc = "Hai người ngồi trong bếp, đèn vàng.";
  const full = ghepPromptNgoaiHinh(goc, [HS_A]);
  ok(co(full, goc), "prompt cuối chứa phần mô tả cảnh");
  eq(tachNgoaiHinh(full), goc, "tách ra đúng phần mô tả cảnh");
  const cu = goc + String.fromCharCode(10) + String.fromCharCode(10) + MARK_NGOAI_HINH_CU + String.fromCharCode(10) + "- gì đó";
  eq(tachNgoaiHinh(cu), goc, "tách được nhãn tiếng Việt của bản ghi cũ");
  eq(tachNgoaiHinh(goc), goc, "không có khối thì trả nguyên văn");
  eq(ghepPromptNgoaiHinh(goc, []), goc, "không có hồ sơ thì prompt không đổi");
  eq(ghepPromptNgoaiHinh(ghepPromptNgoaiHinh(goc, [HS_A]), [HS_A]), full, "ghép hai lần vẫn chỉ một khối");
});

test("gopLoaiTruNgoaiHinh: gộp điều cần tránh, không thừa dấu phẩy", () => {
  eq(gopLoaiTruNgoaiHinh("", [HS_A]), "mũ lưỡi trai", "chỉ có phần ngoại hình");
  eq(gopLoaiTruNgoaiHinh("mờ, nhiễu", []), "mờ, nhiễu", "không có hồ sơ thì giữ nguyên");
  eq(gopLoaiTruNgoaiHinh("mờ", [HS_A, HS_B]), "mờ, mũ lưỡi trai", "gộp thêm, bỏ qua hồ sơ không có phần tránh");
  eq(gopLoaiTruNgoaiHinh("mờ,", []), "mờ", "cắt dấu phẩy thừa");
});

test("dịch ngoại hình: chỉ dịch khi còn chữ CHƯA có bản tiếng Anh", () => {
  ok(coDauTiengViet("tóc ngắn"), "có dấu tiếng Việt");
  ok(!coDauTiengViet("short hair"), "chữ Anh thì không");
  eq(canDichNgoaiHinh(HS_A), true, "hồ sơ chưa dịch thì cần dịch");
  eq(canDichNgoaiHinh({ id: "nh_x", moTa: "tóc ngắn", moTaEn: "short hair" }), false, "đã dịch rồi thì thôi");
  eq(canDichNgoaiHinh({ id: "nh_x", moTa: "short hair" }), false, "vốn là tiếng Anh thì không cần dịch");
  eq(canDichNgoaiHinh({ moTa: "tóc ngắn" }), false, "thiếu id thì không xử lý");
  const moi = boBanDichCu(HS_A, { id: "nh_a", moTa: "tóc dài", moTaEn: "long hair", tranh: "mũ lưỡi trai", tranhEn: "hat" });
  eq(moi.moTaEn, "", "mô tả đổi thì bỏ bản dịch mô tả");
  eq(moi.tranhEn, "hat", "phần tránh không đổi thì giữ bản dịch");
});

test("đếm liên kết: nhân vật, NGƯỜI CHƠI và ảnh cảnh", () => {
  const s1 = taoTruyen({
    id: "ct_zz1",
    nhanVats: [taoNhanVat("nv_a", "Duy", { ngoaiHinhId: "nh_a" })],
    nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "nh_a" },
    anh: [{ id: "anh_1", hoSoIds: ["nh_a"] }],
  });
  const s2 = taoTruyen({ id: "ct_zz2", nhanVats: [taoNhanVat("nv_b", "Minh Quân", { ngoaiHinhId: "nh_b" })] });
  const ds = [s1, s2];
  eq(demLienKetNgoaiHinh(ds, "nh_a"), 2, "một nhân vật và một người chơi");
  eq(demLienKetNgoaiHinh(ds, "nh_b"), 1, "nhân vật của truyện kia");
  eq(demLienKetNgoaiHinh(ds, ""), 0, "không có id thì 0");
  eqSau(demDungNgoaiHinh(ds, "nh_a"), { nhanVat: 1, nguoiChoi: 1, anh: 1 }, "đếm cả ảnh cảnh");
  eq(moTaNguoiDung(demDungNgoaiHinh(ds, "nh_a")), "1 nhân vật · 1 người chơi · 1 ảnh cảnh", "câu mô tả khớp số đếm");
  eq(moTaNguoiDung({}), "", "không dùng ở đâu thì rỗng");
  eqSau(thamChieuMo(ds, [HS_A, HS_B]), [], "mọi tham chiếu đều trỏ tới hồ sơ còn tồn tại");
  eqSau(thamChieuMo(ds, [HS_A]).length, 1, "thiếu một hồ sơ thì phát hiện được tham chiếu mồ");
  eqSau(hoSoCuaTruyen(s1, [HS_A, HS_B]).map((h) => h.id), ["nh_a"], "hồ sơ một truyện dùng");
});

test("ungVienNgoaiHinh: chỉ nhân vật của hội thoại, người chơi xếp cuối", () => {
  const s = taoTruyen({
    nhanVats: [
      taoNhanVat("nv_a", "Duy", { ngoaiHinhId: "nh_a" }),
      taoNhanVat("nv_b", "Minh Quân", { ngoaiHinhId: "nh_b" }),
      taoNhanVat("nv_c", "Chưa liên kết"),
    ],
    nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "nh_b" },
  });
  const conv = taoHoiThoai("ht_1", "Bếp", ["nv_a", "nv_b", "nv_c"]);
  const ds = ungVienNgoaiHinh(s, conv, [HS_A, HS_B]);
  eq(ds.length, 3, "hai nhân vật có hồ sơ cộng người chơi");
  eq(ds[0].nvId, "nv_a", "nhân vật đứng trước");
  eq(ds[2].nvId, ID_NGUOI_CHOI, "người chơi luôn xếp cuối");
  eq(ds[2].laNguoiChoi, true, "đánh dấu là người chơi");
  const conv2 = taoHoiThoai("ht_2", "Bến tàu", ["nv_c"]);
  eq(ungVienNgoaiHinh(s, conv2, [HS_A, HS_B]).length, 1, "hội thoại không có ai liên kết thì chỉ còn người chơi");
  eq(ungVienNgoaiHinh(s, null, [HS_A, HS_B]).length, 1, "không có hội thoại thì chỉ người chơi");
});

test("người chơi như một nhân vật", () => {
  const s = taoTruyen({ nguoiChoi: { ten: "  Bạn  ", moTa: "", ngoaiHinhId: 7 } });
  const nc = nguoiChoiNhuNhanVat(s);
  eq(nc.id, ID_NGUOI_CHOI, "dùng đúng id quy ước của lớp trạng thái");
  eq(nc.ngoaiHinhId, "", "liên kết không phải chuỗi thì bỏ");
  eq(nc.laNguoiChoi, true, "đánh dấu người chơi");
  eq(laNguoiChoi(ID_NGUOI_CHOI), true, "nhận diện id người chơi");
  eq(laNguoiChoi("nv_a"), false, "id nhân vật không phải người chơi");
  eq(hoSoNguoiChoi(taoTruyen({}), [HS_A]), null, "chưa liên kết thì không có hồ sơ");
  eq(hoSoNguoiChoi(taoTruyen({ nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "nh_a" } }), [HS_A]).id, "nh_a", "đã liên kết thì tìm ra hồ sơ");
  eq(hoSoNguoiChoi(taoTruyen({ nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "nh_mat" } }), [HS_A]), null, "liên kết tới hồ sơ đã mất thì trả null");
  eq(Object.keys(hoSoTheoId([HS_A, HS_B, null, { id: "" }])).length, 2, "bản đồ hồ sơ bỏ mục rỗng");
});
