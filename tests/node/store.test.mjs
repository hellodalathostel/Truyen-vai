// Truyện Vai — tầng kiểm thử Node: lớp dữ liệu + AN TOÀN TUỔI (src/store.js).
//
// Đây là tầng giữ các BẤT BIẾN AN TOÀN của Giai đoạn 1: nhân vật vị thành niên không
// bao giờ được ghi cờ người lớn, dù là ghi hàng loạt, qua file nhập, hay qua bản lưu cũ.

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import {
  uid, newCharacter, newChapter, newConversation, laDataUrlAnh, tuoiVietSangSo, tuoiSo,
  laNguoiLon, chanGiaoKeo, laCheDoNguoiLon, chanNoiDungNguoiLon, dauHieuViThanhNien,
  dsSeGhiCoNguoiLon, dsChanGhiCo, xacNhanMoiNguoiLon, giaoKeoMacDinh, giaoKeoOf,
  daoDienMacDinh, daoDienOf, chuanHoaTruyen, PHIEN_BAN_TRUYEN, hienDienCua, hienDienNhom,
  canhRiengCua, charById, charsOf, storyStats, isGroupConv, looseConversations,
} from "../../src/store.js";

const co = (s, x) => String(s).indexOf(x) >= 0;

function nv(id, ten, them) {
  return Object.assign({ id: id, ten: ten }, them || {});
}
function truyenTho(o) {
  return Object.assign({ id: "ct_zzstore", ten: "ZZ Store", nhanVats: [], hoiThoais: [], chuongs: [] }, o || {});
}

test("uid / newCharacter / newChapter / newConversation: mặc định an toàn", () => {
  ok(uid("nv").indexOf("nv_") === 0, "uid có tiền tố");
  ok(uid("x") !== uid("x"), "uid không trùng");
  const c = newCharacter();
  ok(c.id.indexOf("nv") === 0, "nhân vật mới có id");
  eq(c.nguoiLon, false, "NHÂN VẬT MỚI MẶC ĐỊNH KHÔNG PHẢI NGƯỜI LỚN");
  eq(c.tuoi, "", "tuổi để trống chứ không đoán bừa");
  eqSau(c.soThich, [], "chưa chọn sở thích");
  eq(c.ngoaiHinhId, "", "không tự liên kết hồ sơ ngoại hình");
  eq(c.bietDanh, "", "không có biệt danh");
  eq(c.avatarStyle, "chu", "kiểu đại diện mặc định");
  const c2 = newCharacter({ ten: "Duy", nguoiLon: true, tuoi: "28" });
  eq(c2.ten, "Duy", "dữ liệu truyền vào đè mặc định");
  eq(c2.nguoiLon, true, "cờ truyền vào được giữ");
  const ch = newChapter(2);
  eq(ch.so, 2, "chương có số");
  eq(ch.tieuDe, "Chương 2", "tiêu đề chương tự đặt");
  eq(ch.daKetThuc, false, "chương mới chưa kết thúc");
  const ht = newConversation();
  ok(ht.id.indexOf("ht") === 0, "hội thoại mới có id");
  eqSau(ht.nhanVatIds, [], "chưa có nhân vật");
  eqSau(ht.hienDien, [], "danh sách hiện diện khớp danh sách tham gia");
  eq(ht.canhRieng, null, "chưa mở cảnh riêng");
  eq(ht.khepGoc, 0, "mốc khép gốc bằng 0");
});

test("tuoiVietSangSo: đọc tuổi viết bằng CHỮ, không bắt oan từ khác", () => {
  eq(tuoiVietSangSo("mười sáu", true), 16, "tuổi bằng chữ, cả trường");
  eq(tuoiVietSangSo("mười bảy tuổi", true), 17, "tuổi bằng chữ kèm chữ tuổi");
  eq(tuoiVietSangSo("mười tám tuổi", true), 18, "mười tám là người lớn");
  eq(tuoiVietSangSo("hai mươi", true), 20, "hai mươi");
  eq(tuoiVietSangSo("ba tuổi", true), 3, "ba tuổi");
  eq(tuoiVietSangSo("BA TUỔI", true), 3, "không phân biệt hoa thường");
  eq(tuoiVietSangSo("31 tuổi", true), null, "chữ số không đọc ở chế độ cả trường");
  eq(tuoiVietSangSo("", true), null, "chuỗi rỗng");
  eq(tuoiVietSangSo(null, true), null, "null");
  eq(tuoiVietSangSo("ba vết sẹo", false), null, "BA VẾT SẸO không phải tuổi 3");
  eq(tuoiVietSangSo("tư thế đứng", false), null, "TƯ THẾ không phải tuổi 4");
  eq(tuoiVietSangSo("năm người bạn", false), null, "NĂM NGƯỜI không phải tuổi 5");
  eq(tuoiVietSangSo("ba tuổi", false), 3, "có chữ tuổi ngay sau thì đọc được");
  eq(tuoiVietSangSo("cô ấy mười lăm tuổi", false), 15, "đọc được giữa câu");
});

test("tuoiSo: số, chữ số trong chuỗi, và tuổi bằng chữ", () => {
  eq(tuoiSo({ tuoi: 26 }), 26, "tuổi dạng số");
  eq(tuoiSo({ tuoi: "26" }), 26, "tuổi dạng chuỗi số");
  eq(tuoiSo({ tuoi: "31 tuổi" }), 31, "chuỗi có chữ tuổi");
  eq(tuoiSo({ tuoi: "khoảng 25" }), 25, "số nằm trong câu");
  eq(tuoiSo({ tuoi: "mười sáu" }), 16, "tuổi bằng chữ KHÔNG được lọt cổng");
  eq(tuoiSo({ tuoi: "mười bảy tuổi" }), 17, "tuổi bằng chữ kèm chữ tuổi");
  eq(tuoiSo({ tuoi: "" }), null, "thiếu tuổi ⇒ null (KHÔNG phải người lớn)");
  eq(tuoiSo({}), null, "không có trường tuổi ⇒ null");
  eq(tuoiSo(null), null, "không có nhân vật ⇒ null");
  eq(tuoiSo({ tuoi: "ba vết sẹo" }), null, "mô tả lẫn vào trường tuổi ⇒ null");
  eq(tuoiSo({ tuoi: "tư thế" }), null, "tư thế không thành tuổi 4");
  eq(tuoiSo({ tuoi: "0" }), null, "tuổi 0 không hợp lệ");
  eq(tuoiSo({ tuoi: Infinity }), null, "vô cực không hợp lệ");
  eq(tuoiSo({ tuoi: 18 }), 18, "đúng 18 là hợp lệ");
});

test("laNguoiLon: tuổi dưới 18 KHOÁ CỨNG, thiếu tuổi KHÔNG thành người lớn", () => {
  eq(laNguoiLon({ tuoi: 20, nguoiLon: true }), true, "có tuổi và có cờ");
  eq(laNguoiLon({ tuoi: 20, nguoiLon: false }), false, "có tuổi nhưng chưa xác nhận");
  eq(laNguoiLon({ tuoi: "", nguoiLon: true }), true, "không rõ tuổi nhưng người dùng đã xác nhận");
  eq(laNguoiLon({ tuoi: "", nguoiLon: false }), false, "KHÔNG rõ tuổi thì KHÔNG mặc định là người lớn");
  eq(laNguoiLon({ tuoi: 16, nguoiLon: true }), false, "16 tuổi + cờ ⇒ vẫn bị khoá cứng");
  eq(laNguoiLon({ tuoi: "mười sáu", nguoiLon: true }), false, "16 tuổi viết bằng chữ cũng bị khoá");
  eq(laNguoiLon({ tuoi: "17 tuổi", nguoiLon: true }), false, "17 tuổi bị khoá");
  eq(laNguoiLon({ tuoi: "18", nguoiLon: true }), true, "đúng 18 tuổi thì được");
  eq(laNguoiLon({ tuoi: 16 }), false, "có tuổi 16 thì không cần cờ cũng bị chặn");
  eq(laNguoiLon(null), false, "không có nhân vật");
});

test("dauHieuViThanhNien: bắt đúng dấu hiệu, không bắt oan", () => {
  ok(dauHieuViThanhNien({ tuoi: "16" }) !== "", "tuổi số 16 là dấu hiệu");
  ok(co(dauHieuViThanhNien({ tuoi: "16" }), "dưới 18"), "nêu rõ lý do dưới 18");
  ok(dauHieuViThanhNien({ tuoi: "mười bảy" }) !== "", "tuổi chữ mười bảy là dấu hiệu");
  ok(dauHieuViThanhNien({ moTa: "học sinh cấp 3" }) !== "", "học sinh cấp 3");
  ok(dauHieuViThanhNien({ moTa: "đang học lớp 9" }) !== "", "học lớp 9");
  ok(dauHieuViThanhNien({ ghiChu: "còn nhỏ" }) !== "", "ghi chú còn nhỏ");
  ok(dauHieuViThanhNien({ vaiTro: "thiếu niên" }) !== "", "vai trò thiếu niên");
  ok(dauHieuViThanhNien({ moTa: "em bé bán vé số" }) !== "", "em bé");
  ok(dauHieuViThanhNien({ moTa: "chưa đủ 18" }) !== "", "chưa đủ 18");
  ok(dauHieuViThanhNien({ moTa: "em ấy 15 tuổi" }) !== "", "tuổi số nằm trong mô tả");
  ok(co(dauHieuViThanhNien({ moTa: "mười lăm tuổi" }), "bằng chữ"), "tuổi chữ trong mô tả cũng bị bắt");
  eq(dauHieuViThanhNien({ moTa: "cao, ba vết sẹo ở tay" }), "", "ba vết sẹo KHÔNG phải dấu hiệu");
  eq(dauHieuViThanhNien({ moTa: "tư thế đứng rất đẹp" }), "", "tư thế KHÔNG phải dấu hiệu");
  eq(dauHieuViThanhNien({ moTa: "trẻ trung, nhỏ nhắn" }), "", "trẻ trung/nhỏ nhắn KHÔNG phải dấu hiệu");
  eq(dauHieuViThanhNien({ moTa: "ngồi ở tầng 3 toà nhà" }), "", "số trong câu bình thường không phải tuổi");
  eq(dauHieuViThanhNien({ tuoi: "31", moTa: "cao 1m80, có sẹo ở tay" }), "", "người lớn bình thường thì sạch");
  eq(dauHieuViThanhNien({ tuoi: "", moTa: "sinh năm 1990" }), "", "năm sinh không phải tuổi");
  eq(dauHieuViThanhNien(null), "", "không có nhân vật");
  eq(dauHieuViThanhNien({}), "", "nhân vật trống");
});

test("BẤT BIẾN 3c: mô tả có dấu hiệu vị thành niên + KHÔNG có trường tuoi ⇒ không bao giờ ghi cờ hàng loạt", () => {
  const dskhophang = [
    { id: "nv_1", ten: "Bé", moTa: "em nhỏ mười lăm tuổi" },
    { id: "nv_2", ten: "Học trò", moTa: "mới học lớp 10" },
    { id: "nv_3", ten: "Thiếu niên", vaiTro: "thiếu niên mới lớn" },
    { id: "nv_4", ten: "Nhỏ", ghiChu: "còn nhỏ, chưa đủ tuổi" },
    { id: "nv_5", ten: "Cấp hai", moTa: "đang học cấp hai" },
    { id: "nv_6", ten: "Mười bảy", moTa: "mười bảy tuổi" },
  ];
  for (const c of dskhophang) {
    ok(dauHieuViThanhNien(c) !== "", "phải thấy dấu hiệu ở " + c.ten);
    const s = truyenTho({ nhanVats: [c] });
    eq(dsSeGhiCoNguoiLon(s).length, 0, "KHÔNG được ghi cờ hàng loạt cho " + c.ten);
    const chan = dsChanGhiCo(s);
    eq(chan.length, 1, "phải hiện riêng trong hộp cho " + c.ten);
    eq(chan[0].ten, c.ten, "nêu đúng tên nhân vật bị chặn");
    ok(chan[0].lyDo !== "", "nêu lý do cho " + c.ten);
    xacNhanMoiNguoiLon(s);
    ok(c.nguoiLon !== true, "xác nhận hàng loạt KHÔNG được ghi cờ cho " + c.ten);
  }
});

test("dsSeGhiCoNguoiLon / xacNhanMoiNguoiLon: chỉ ghi cho người đủ điều kiện", () => {
  const s = truyenTho({
    nhanVats: [
      nv("nv_a", "Người lớn chưa tích", { tuoi: "31" }),
      nv("nv_b", "Đã tích rồi", { tuoi: "28", nguoiLon: true }),
      nv("nv_c", "Ghi tuổi 16", { tuoi: "16" }),
      nv("nv_d", "Mô tả trẻ", { moTa: "đang học cấp ba" }),
      nv("nv_e", "Không rõ tuổi", {}),
    ],
  });
  eqSau(dsSeGhiCoNguoiLon(s).map((c) => c.id), ["nv_a", "nv_e"], "chỉ hai nhân vật đủ điều kiện");
  const chan = dsChanGhiCo(s);
  eqSau(chan.map((c) => c.id), ["nv_c", "nv_d"], "hai nhân vật bị chặn vì dấu hiệu vị thành niên");
  const chanTheoTen = dsChanGhiCo(s).map((c) => c.ten);
  eqSau(chanTheoTen, ["Ghi tuổi 16", "Mô tả trẻ"], "hộp xác nhận nêu đúng TÊN từng nhân vật bị chặn");
  xacNhanMoiNguoiLon(s);
  eq(charById(s, "nv_a").nguoiLon, true, "nhân vật đủ điều kiện được ghi cờ");
  eq(charById(s, "nv_e").nguoiLon, true, "nhân vật không rõ tuổi nhưng sạch cũng được ghi");
  ok(charById(s, "nv_c").nguoiLon !== true, "nhân vật 16 tuổi KHÔNG được ghi cờ");
  ok(charById(s, "nv_d").nguoiLon !== true, "nhân vật có dấu hiệu KHÔNG được ghi cờ");
  eq(dsSeGhiCoNguoiLon(s).length, 0, "lần xác nhận sau không còn ai để ghi");
});

test("laCheDoNguoiLon: dấu hiệu duy nhất là giao kèo đang BẬT", () => {
  eq(laCheDoNguoiLon({ giaoKeo: { bat: true } }), true, "giao kèo bật");
  eq(laCheDoNguoiLon({ giaoKeo: { bat: false } }), false, "giao kèo tắt");
  eq(laCheDoNguoiLon({ giaoKeo: { nguoiLon: true } }), false, "cờ 18+ mà không bật thì chưa phải chế độ người lớn");
  eq(laCheDoNguoiLon({}), false, "chưa có giao kèo");
  eq(laCheDoNguoiLon(null), false, "không có truyện");
});

test("chanNoiDungNguoiLon / chanGiaoKeo: cửa chặn dùng chung", () => {
  eq(chanNoiDungNguoiLon(null), "Chưa có truyện.", "không có truyện");
  eq(chanNoiDungNguoiLon({ nhanVats: [] }), "", "chưa có nhân vật thì chưa có gì để vi phạm");
  const coTre = { nhanVats: [nv("nv_c", "Bé", { tuoi: "16" })] };
  const loiTre = chanNoiDungNguoiLon(coTre);
  ok(co(loiTre, "dưới 18"), "giữ nguyên thông điệp dưới 18 cũ");
  ok(co(loiTre, "Bé"), "nêu tên nhân vật");
  ok(co(chanGiaoKeo(coTre), "dưới 18"), "chanGiaoKeo cũng chặn");
  const chuaXacNhan = { nhanVats: [nv("nv_a", "Duy", { tuoi: "31" })] };
  ok(co(chanNoiDungNguoiLon(chuaXacNhan), "CHƯA được xác nhận"), "có nhân vật chưa xác nhận thì chặn");
  ok(co(chanNoiDungNguoiLon(chuaXacNhan), "Người trưởng thành (18+)"), "chỉ rõ cách sửa");
  eq(chanGiaoKeo(chuaXacNhan), "", "chanGiaoKeo chỉ soi tuổi số, không soi cờ xác nhận");
  const sach = { nhanVats: [nv("nv_a", "Duy", { tuoi: "31", nguoiLon: true }), nv("nv_b", "Quân", { tuoi: "28", nguoiLon: true })] };
  eq(chanNoiDungNguoiLon(sach), "", "mọi người đã xác nhận thì cho qua");
});

test("giaoKeoMacDinh / giaoKeoOf: mảng sở thích không dùng chung tham chiếu", () => {
  const g1 = giaoKeoMacDinh();
  const g2 = giaoKeoMacDinh();
  eq(g1.bat, false, "mặc định chưa bật");
  eq(g1.vaiNguoiChoi, "sub", "vai mặc định");
  eq(g1.tuKhoaDung, "đỏ", "từ khoá dừng mặc định");
  ok(g1.soThich !== g2.soThich, "HAI lần gọi không dùng chung một mảng");
  const s = truyenTho({});
  const gk = giaoKeoOf(s);
  eq(gk.bat, false, "truyện cũ được bù giao kèo mặc định");
  ok(s.giaoKeo === gk, "giao kèo được gắn vào truyện");
  s.giaoKeo = { bat: true, tuKhoaDung: "dừng lại", soThich: ["st_a"] };
  const gk2 = giaoKeoOf(s);
  eq(gk2.bat, true, "giá trị đã lưu được giữ");
  eq(gk2.tuKhoaDung, "dừng lại", "từ khoá dừng riêng được giữ");
  eqSau(gk2.soThich, ["st_a"], "sở thích riêng được giữ");
  eq(gk2.mucDo, 3, "trường thiếu được bù mặc định");
  s.giaoKeo.soThich = "khong-phai-mang";
  eqSau(giaoKeoOf(s).soThich, [], "sở thích hỏng thành mảng rỗng");
});

test("daoDien: mặc định tắt, bù mảng nhưng KHÔNG xoá dữ liệu người dùng", () => {
  const d = daoDienMacDinh();
  eq(d.bat, false, "mặc định tắt");
  eqSau(d.dinhChinh, [], "chưa có đính chính");
  eqSau(d.huong, [], "chưa có hướng");
  ok(daoDienMacDinh().dinhChinh !== daoDienMacDinh().dinhChinh, "mảng không dùng chung tham chiếu");
  const s = truyenTho({});
  const dd = daoDienOf(s);
  eq(dd.bat, false, "truyện cũ được bù mặc định");
  s.daoDien = { bat: 1, dinhChinh: [{ id: "dc1" }], huong: "hong" };
  const dd2 = daoDienOf(s);
  eq(dd2.bat, true, "cờ bật được ép về boolean thật");
  eq(dd2.dinhChinh.length, 1, "danh sách đính chính của người dùng KHÔNG bị xoá");
  eqSau(dd2.huong, [], "danh sách hướng hỏng thành mảng rỗng");
  eq(daoDienOf(null).bat, false, "không có truyện");
});

test("laDataUrlAnh: chỉ nhận ảnh hợp lệ, chặn chuỗi lạ", () => {
  ok(laDataUrlAnh("data:image/png;base64,AAAA") !== "", "data URL png");
  ok(laDataUrlAnh("https://a.b/c.png") !== "", "URL http(s)");
  eq(laDataUrlAnh("  https://a.b/c.jpg  "), "https://a.b/c.jpg", "cắt khoảng trắng");
  eq(laDataUrlAnh("javascript:alert(1)"), "", "chặn javascript:");
  eq(laDataUrlAnh("data:text/html;base64,AAAA"), "", "chặn data URL không phải ảnh");
  eq(laDataUrlAnh("https://a.b/c.png\" onerror=alert(1)"), "", "chặn chuỗi có dấu nháy");
  eq(laDataUrlAnh(""), "", "chuỗi rỗng");
  eq(laDataUrlAnh(null), "", "null");
  eq(laDataUrlAnh(5), "", "không phải chuỗi");
});

test("chuanHoaTruyen: bù mặc định, lọc dữ liệu không đáng tin", () => {
  const s = chuanHoaTruyen({ id: "ct_zzn", ten: "  Truyện  ", nhanVats: [nv("nv_a", "Duy", { anh: "javascript:x", ngoaiHinhId: 5, bietDanh: "  Quân  " })], hoiThoais: [{ id: "ht_1", nhanVatIds: ["nv_a", "nv_khong_co"] }], nhip: "la-hoac" });
  ok(s.id === "ct_zzn", "id được giữ");
  eq(s.nhip, "cham", "nhịp lạ rơi về mặc định");
  eq(s.mode, "chuong", "chế độ lạ rơi về mặc định");
  eq(charById(s, "nv_a").anh, "", "ảnh không phải data URL hợp lệ bị xoá");
  eq(charById(s, "nv_a").ngoaiHinhId, "", "liên kết hồ sơ không phải chuỗi bị xoá (không tự liên kết theo tên)");
  eq(charById(s, "nv_a").bietDanh, "Quân", "biệt danh được cắt khoảng trắng");
  eqSau(s.hoiThoais[0].nhanVatIds, ["nv_a"], "id nhân vật không tồn tại bị loại");
  eq(s.phienBan, PHIEN_BAN_TRUYEN, "đóng dấu phiên bản dữ liệu");
  ok(typeof PHIEN_BAN_TRUYEN === "number", "phiên bản là số");
  eq(chuanHoaTruyen({}).ten, "Cốt truyện chưa đặt tên", "thiếu tên thì có tên mặc định");
  const s2 = chuanHoaTruyen({ hoiThoais: [{ id: "ht_1", nhanVatIds: [] }], canhDaKhep: [{ id: "c1", htId: "ht_khong_co", tomTat: "x" }, { id: "c2", htId: "ht_1", tomTat: "y" }] });
  eqSau(s2.canhDaKhep.map((c) => c.id), ["c2"], "cảnh không gắn được hội thoại nào là rác ⇒ bỏ");
});

test("truyenVietRa: bù mặc định, KHÔNG bao giờ xoá bản viết của người dùng", () => {
  // Bản lưu cũ (chưa có trường) ⇒ mảng rỗng, không phải undefined.
  eqSau(chuanHoaTruyen(truyenTho({})).truyenVietRa, [], "truyện cũ: mảng rỗng");
  const s = chuanHoaTruyen(
    truyenTho({
      hoiThoais: [{ id: "ht_1", nhanVatIds: [] }],
      truyenVietRa: [
        { id: "vt_1", hoiThoaiId: "ht_1", loaiNguon: "canhKhep", taoLuc: 5, trangThai: "dangChay", noiDung: "prose 1", loiNeu: "" },
        { hoiThoaiId: "ht_khong_co", loaiNguon: "la-hoac", trangThai: "la-hoac", noiDung: 5 },
        "khong-phai-doi-tuong",
        null,
      ],
    })
  );
  eq(s.truyenVietRa.length, 2, "bỏ mục không phải đối tượng, GIỮ bản ghi thiếu trường");
  eq(s.truyenVietRa[0].id, "vt_1", "giữ id đã có");
  eq(s.truyenVietRa[0].trangThai, "dangChay", "giữ trạng thái hợp lệ");
  eq(s.truyenVietRa[0].noiDung, "prose 1", "giữ nội dung văn xuôi");
  eq(s.truyenVietRa[0].loaiNguon, "canhKhep", "giữ nguồn hợp lệ");
  const x = s.truyenVietRa[1];
  ok(x.id.indexOf("vt") === 0, "bù id mới cho bản ghi thiếu id");
  eq(x.loaiNguon, "tho", "nguồn lạ rơi về tho");
  eq(x.trangThai, "loi", "trạng thái lạ rơi về loi (không hiện nhầm là đang chạy)");
  eq(x.noiDung, "5", "nội dung không phải chuỗi được ép thành chuỗi");
  eq(x.loiNeu, "", "thiếu ghi chú lỗi ⇒ chuỗi rỗng");
  ok(x.taoLuc > 0, "thiếu mốc thời gian ⇒ bù mốc hiện tại");
  eq(x.hoiThoaiId, "ht_khong_co", "tham chiếu mồ côi được GIỮ (văn xuôi không sinh lại được)");
  eq(s.phienBan, PHIEN_BAN_TRUYEN, "truyện được đóng dấu phiên bản hiện tại");
  // Mảng của bản chuẩn hoá không dùng chung tham chiếu với bản gốc.
  const goc = truyenTho({ truyenVietRa: [{ id: "vt_goc", hoiThoaiId: "", loaiNguon: "tho", taoLuc: 1, trangThai: "xong", noiDung: "a", loiNeu: "" }] });
  const s3 = chuanHoaTruyen(goc);
  ok(s3.truyenVietRa !== goc.truyenVietRa, "không dùng chung mảng với bản gốc");
  eq(s3.truyenVietRa[0].noiDung, "a", "giữ nguyên nội dung của bản ghi hợp lệ");
});

test("CỔNG 18+ chạy SAU CÙNG: không đường nào tự mở lớp người lớn", () => {
  const nguoiLon = nv("nv_a", "Duy", { tuoi: "31" });
  const tre = nv("nv_b", "Bé", { tuoi: "16" });
  const a = chuanHoaTruyen(truyenTho({ nhanVats: [nguoiLon, tre], giaoKeo: { bat: true } }));
  eq(a.giaoKeo.bat, false, "có nhân vật dưới 18 ⇒ giao kèo bị tắt");
  const b = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { tuoi: "31" })], giaoKeo: { bat: true } }));
  eq(b.giaoKeo.bat, false, "nhân vật CHƯA xác nhận là người lớn ⇒ giao kèo bị tắt");
  const c = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { tuoi: "31", nguoiLon: true })], giaoKeo: { bat: true } }));
  eq(c.giaoKeo.bat, true, "mọi người đã xác nhận ⇒ giao kèo giữ nguyên");
  const d = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { tuoi: "31" })], giaoKeo: { bat: true } }), { choNhap: true, dongY18: true });
  eq(d.giaoKeo.bat, true, "lần nhập có xác nhận 18+ ⇒ được giữ, và cờ được ghi cho nhân vật");
  eq(charById(d, "nv_a").nguoiLon, true, "cờ cấp nhân vật khớp với cờ cấp truyện");
  eq(d.giaoKeo.nguoiLon, true, "cờ cấp truyện được đóng dấu");
  const e = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { tuoi: "31" })], giaoKeo: { bat: true } }), { choNhap: true, dongY18: false });
  eq(e.giaoKeo.bat, false, "lần nhập KHÔNG xác nhận ⇒ tắt, dù file có sẵn cờ bật");
  ok(charById(e, "nv_a").nguoiLon !== true, "không ghi cờ khi chưa xác nhận");
  const g = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { tuoi: "31", nguoiLon: true }), nv("nv_b", "Bé", { tuoi: "16" })], giaoKeo: { bat: true } }), { choNhap: true, dongY18: true });
  eq(g.giaoKeo.bat, false, "file nhập vừa có cờ bật vừa có nhân vật 16 tuổi ⇒ cổng chặn sau cùng thắng");
  ok(charById(g, "nv_b").nguoiLon !== true, "nhân vật 16 tuổi KHÔNG bao giờ được ghi cờ từ file nhập");
  const h = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { moTa: "em nhỏ mười lăm tuổi" })], giaoKeo: { bat: true } }), { choNhap: true, dongY18: true });
  eq(h.giaoKeo.bat, false, "dấu hiệu vị thành niên trong mô tả cũng chặn");
  ok(charById(h, "nv_a").nguoiLon !== true, "nhân vật có dấu hiệu KHÔNG được ghi cờ");
  const i2 = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy", { nguoiLon: true })], giaoKeo: { bat: true } }));
  eq(i2.giaoKeo.bat, true, "một nhân vật đã tích cờ nhưng không ghi tuổi vẫn qua được cổng");
});

test("hienDienCua / hienDienNhom / canhRiengCua: mảng rỗng là trạng thái hợp lệ", () => {
  const sach = newConversation({ nhanVatIds: ["nv_a", "nv_b"] });
  eqSau(hienDienCua({}, sach), ["nv_a", "nv_b"], "chưa ghi hiện diện thì dùng danh sách tham gia");
  sach.hienDien = [];
  eqSau(hienDienCua({}, sach), [], "mảng RỖNG nghĩa là chỉ còn người chơi");
  sach.hienDien = ["nv_b", "nv_khong_co"];
  eqSau(hienDienNhom(sach), ["nv_b"], "bỏ id không còn là người tham gia");
  eqSau(hienDienCua({}, null), [], "không có hội thoại");
  eqSau(hienDienNhom(null), [], "không có hội thoại");
  eq(canhRiengCua(sach), "", "chưa mở cảnh riêng");
  sach.canhRieng = { nvId: "nv_khong_co", moLuc: 1 };
  eq(canhRiengCua(sach), "", "cảnh riêng trỏ tới người không còn trong hội thoại thì coi như đóng");
  sach.canhRieng = { nvId: "nv_b", moLuc: 1 };
  eq(canhRiengCua(sach), "nv_b", "cảnh riêng đang mở");
  eqSau(hienDienCua({}, sach), ["nv_b"], "cảnh riêng thì chỉ có mình người đó");
});

test("tra cứu & thống kê truyện", () => {
  const s = chuanHoaTruyen(truyenTho({ nhanVats: [nv("nv_a", "Duy"), nv("nv_b", "Quân")], chuongs: [{ id: "ch_1", so: 1 }], hoiThoais: [{ id: "ht_1", chuongId: "ch_1", soTinNhan: 3 }, { id: "ht_2", chuongId: "ch_khong_co", soTinNhan: 2 }] }));
  eq(charById(s, "nv_a").ten, "Duy", "tìm nhân vật theo id");
  eq(charById(s, "nv_mat"), null, "không có thì trả null");
  eqSau(charsOf(s, ["nv_b", "nv_mat"]).map((c) => c.id), ["nv_b"], "lọc theo danh sách id");
  eq(storyStats(s).chars, 2, "đếm nhân vật");
  eq(storyStats(s).convs, 2, "đếm hội thoại");
  eq(storyStats(s).msgs, 5, "đếm tin nhắn");
  eq(isGroupConv(s, s.hoiThoais[0]), false, "một nhân vật thì không phải hội thoại nhóm");
  s.hoiThoais[0].nhanVatIds = ["nv_a", "nv_b"];
  eq(isGroupConv(s, s.hoiThoais[0]), true, "hai nhân vật là nhóm");
  eqSau(looseConversations(s).map((c) => c.id), ["ht_2"], "hội thoại trỏ tới chương không tồn tại là rời rạc");
});
