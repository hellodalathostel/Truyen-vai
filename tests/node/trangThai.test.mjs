// Truyện Vai — tầng kiểm thử Node: máy trạng thái cảnh (src/trangThai.js).

import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import {
  ma, khoaQuanHe, nhanMuc, huong, canhHopLe, tinhTrangThai, quanHeCua, coGiDangKe,
  kyUcBiet, kyUcKhongBiet, mocCanhCua, timIdx, canhCuoi, mocBatDau, tinNhanChuaKhep,
  canhSauDiem, voHieuCanh, taoCanh, aiBietMacDinh, nhipCua, nhanPhamVi, nhanTienDo,
  nhanTrangThaiHuong, nhanNhipHuong, tenGoi, dinhChinhHieuLuc, ID_NGUOI, MAC_DINH, TOI_DA,
} from "../../src/trangThai.js";
import { taoTruyen, taoNhanVat, taoHoiThoai, taoCanhDaKhep, taoTinNhan } from "../fixtures/truyen.mjs";

const A = taoNhanVat("nv_a", "Duy");
const B = taoNhanVat("nv_b", "Minh Quân");

function truyenCoBan() {
  return taoTruyen({
    nhanVats: [taoNhanVat("nv_a", "Duy"), taoNhanVat("nv_b", "Minh Quân")],
    hoiThoais: [taoHoiThoai("ht_1", "Bếp", ["nv_a", "nv_b"]), taoHoiThoai("ht_2", "Bến tàu", ["nv_a"])],
  });
}

test("ma / khoaQuanHe: mã duy nhất, khoá quan hệ có chiều", () => {
  const a = ma("ku");
  const b = ma("ku");
  ok(a.indexOf("ku_") === 0, "mã có tiền tố đúng");
  ok(a !== b, "hai lần gọi cho hai mã khác nhau");
  eq(khoaQuanHe("nv_a", "nv_b"), "nv_a|nv_b", "khoá theo chiều từ-trước-đến");
  ok(khoaQuanHe("nv_a", "nv_b") !== khoaQuanHe("nv_b", "nv_a"), "đảo chiều thì khác khoá");
});

test("nhanMuc / huong: nhãn tự nhiên, không bao giờ trả số", () => {
  eq(nhanMuc("tinTuong", 0), "rất thấp", "mức 0");
  eq(nhanMuc("tinTuong", 5), "vừa", "mức 5");
  eq(nhanMuc("tinTuong", 10), "cao", "mức 10");
  eq(nhanMuc("cangThang", 0), "không đáng kể", "căng thẳng mức 0");
  eq(nhanMuc("cangThang", 10), "rất căng", "căng thẳng mức 10");
  eq(nhanMuc("tinTuong", 99), "cao", "vượt trần thì kẹp về trần");
  eq(huong("tinTuong", { tinTuong: { huong: 1 } }), "cao hơn", "đi lên");
  eq(huong("tinTuong", { tinTuong: { huong: -1 } }), "thấp hơn", "đi xuống");
  eq(huong("cangThang", { cangThang: { huong: -1 } }), "dịu lại", "căng thẳng giảm");
  eq(huong("tinTuong", { tinTuong: { huong: 0 } }), "không đổi", "không đổi");
});

test("canhHopLe: bỏ cảnh đã huỷ và sắp theo thời gian", () => {
  const s = truyenCoBan();
  s.canhDaKhep = [
    taoCanhDaKhep("c2", "ht_1", { luc: 200 }),
    taoCanhDaKhep("c1", "ht_1", { luc: 100 }),
    taoCanhDaKhep("c3", "ht_1", { luc: 300, huy: true }),
  ];
  eqSau(canhHopLe(s).map((c) => c.id), ["c1", "c2"], "còn đúng hai cảnh, đã sắp xếp");
  s.canhDaKhep = [];
  eq(canhHopLe(s).length, 0, "không có cảnh nào");
});

test("tinhTrangThai: cộng dồn delta quan hệ và nội tâm", () => {
  const s = truyenCoBan();
  s.canhDaKhep = [
    taoCanhDaKhep("c1", "ht_1", {
      luc: 100,
      quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 2, lyDo: "giữ lời" }],
      nhanVat: [{ nvId: "nv_a", truong: "camXuc", moi: "dịu hơn" }],
      kyUc: [{ id: "ku1", noiDung: "Lời hứa ở bến tàu", biet: [ID_NGUOI, "nv_a"] }],
    }),
    taoCanhDaKhep("c2", "ht_1", {
      luc: 200,
      quanHe: [
        { tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: -1, buoc: 1 },
        { tu: "nv_a", den: "nv_b", chieu: "chuaNoi", moi: "vẫn còn giận chuyện cũ" },
      ],
    }),
    taoCanhDaKhep("c3", "ht_2", {
      luc: 300,
      quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 9 }],
    }),
  ];
  const tt = tinhTrangThai(s, s.hoiThoais[0]);
  eq(tt.canh.length, 2, "chỉ tính cảnh thuộc hội thoại này");
  eq(tt.coDuLieu, true, "có dữ liệu");
  const q = quanHeCua(tt, "nv_a", "nv_b");
  eq(q.tinTuong, 6, "5 + 2 - 1 = 6 (cảnh của hội thoại khác không tính)");
  eq(q.chuaNoi, "vẫn còn giận chuyện cũ", "điều chưa nói được ghi lại");
  eq(tt.nv.nv_a.camXuc, "dịu hơn", "nội tâm nhân vật được ghi");
  eq(tt.kyUc.length, 1, "ký ức được gom");
  eq(tt.kyUc[0].canhId, "c1", "ký ức nhớ cảnh sinh ra nó");
  ok(coGiDangKe(tt, "nv_a", "nv_b"), "cặp này có gì đáng kể");
  ok(!coGiDangKe(tt, "nv_b", "nv_a"), "chiều ngược lại chưa có gì");
  eq(kyUcBiet(tt, "nv_a").length, 1, "nv_a biết ký ức");
  eq(kyUcKhongBiet(tt, "nv_b").length, 1, "nv_b không biết ký ức");
});

test("tinhTrangThai: kẹp mức trong 0..TOI_DA", () => {
  const s = truyenCoBan();
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: -1, buoc: 4 }] })];
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b").tinTuong, 1, "5 - 4 = 1");
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: -1, buoc: 50 }] })];
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b").tinTuong, 0, "kẹp dưới là 0, không âm");
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 50 }] })];
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b").tinTuong, TOI_DA, "kẹp trên là TOI_DA");
});

test("tinhTrangThai: đính chính của Đạo diễn phủ lên SAU CÙNG", () => {
  const s = truyenCoBan();
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 3 }] })];
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b").tinTuong, 8, "chưa đính chính: 5 + 3");
  s.daoDien = {
    bat: true,
    dinhChinh: [
      { id: "dc1", bat: true, loai: "quanhe", tu: "nv_a", den: "nv_b", chieu: "tinTuong", muc: 2 },
      { id: "dc2", bat: true, loai: "nhanvat", nvId: "nv_b", truong: "camXuc", moi: "bình tĩnh hơn" },
      { id: "dc3", bat: false, loai: "quanhe", tu: "nv_a", den: "nv_b", chieu: "ganGui", muc: 0 },
      { id: "dc4", bat: true, xoa: true, loai: "quanhe", tu: "nv_a", den: "nv_b", chieu: "tinTuong", muc: 0 },
    ],
    huong: [],
  };
  const tt = tinhTrangThai(s, s.hoiThoais[0]);
  eq(quanHeCua(tt, "nv_a", "nv_b").tinTuong, 2, "đính chính đè lên kết quả tính từ cảnh");
  eq(quanHeCua(tt, "nv_a", "nv_b").ganGui, MAC_DINH.ganGui, "đính chính đã tắt thì không áp");
  eq(tt.nv.nv_b.camXuc, "bình tĩnh hơn", "đính chính nội tâm cũng được áp");
  eq(tt.dinhChinh.length, 2, "chỉ hai đính chính còn hiệu lực được áp");
  eq(dinhChinhHieuLuc(s).length, 2, "danh sách hiệu lực cũng đúng hai");
});

test("mốc tin nhắn: mocBatDau / tinNhanChuaKhep", () => {
  const s = truyenCoBan();
  const msgs = [
    taoTinNhan("m1", "nguoi", "Bạn", "câu 1"),
    taoTinNhan("m2", "ai", "Duy", "câu 2"),
    taoTinNhan("m3", "ai", "Duy", "câu 3"),
    taoTinNhan("m4", "nguoi", "Bạn", "câu 4"),
  ];
  const conv = s.hoiThoais[0];
  eq(mocBatDau(s, conv, msgs), 0, "chưa khép cảnh nào thì bắt đầu từ 0");
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { luc: 100, denMsgId: "m2" })];
  eq(mocBatDau(s, conv, msgs), 2, "khép tới m2 thì phần chưa khép bắt đầu ở m3");
  eq(tinNhanChuaKhep(s, conv, msgs).map((m) => m.id).join(","), "m3,m4", "còn đúng hai tin nhắn chưa khép");
  eq(canhCuoi(s, conv).id, "c1", "cảnh cuối của hội thoại");
  eq(mocCanhCua(s, "ht_1"), "", "cảnh không có mốc thì trả rỗng");
  eq(timIdx(msgs, "m3"), 2, "tìm chỉ số tin nhắn");
  eq(timIdx(msgs, "khong-co"), -1, "không thấy thì trả -1");
  conv.khepGoc = 4;
  eq(mocBatDau(s, conv, msgs), 4, "mốc gốc kéo lên tới hết danh sách");
  eq(tinNhanChuaKhep(s, conv, msgs).length, 0, "không còn tin nhắn chưa khép");
});

test("cảnh cũ sau điểm cắt: canhSauDiem + voHieuCanh", () => {
  const s = truyenCoBan();
  const msgs = [
    taoTinNhan("m1", "nguoi", "Bạn", "câu 1"),
    taoTinNhan("m2", "ai", "Duy", "câu 2"),
    taoTinNhan("m3", "ai", "Duy", "câu 3"),
  ];
  s.canhDaKhep = [
    taoCanhDaKhep("c1", "ht_1", { luc: 100, denMsgId: "m1" }),
    taoCanhDaKhep("c2", "ht_1", { luc: 200, denMsgId: "m3" }),
    taoCanhDaKhep("c3", "ht_1", { luc: 300, denMsgId: "khong-con" }),
  ];
  eqSau(canhSauDiem(s, "ht_1", msgs, 2).map((c) => c.id), ["c2", "c3"], "cảnh kết thúc từ m3 trở đi là bị ảnh hưởng");
  eqSau(canhSauDiem(s, "ht_1", msgs, 0).map((c) => c.id), ["c1", "c2", "c3"], "cắt từ đầu thì mọi cảnh đều bị ảnh hưởng");
  eq(voHieuCanh(s, []), 0, "không truyền id thì không làm gì");
  eq(voHieuCanh(s, ["c2", "c3"]), 2, "vô hiệu hai cảnh");
  ok(s.canhDaKhep[1].huy === true, "c2 đã bị đánh dấu huỷ");
  ok(s.canhDaKhep[1].huyLuc > 0, "có dấu thời gian huỷ");
  eq(canhHopLe(s).length, 1, "chỉ còn một cảnh hiệu lực");
  eq(voHieuCanh(s, ["c2"]), 0, "vô hiệu lần hai thì không đếm lại");
});

test("taoCanh: chỉ nhận dữ liệu hợp lệ", () => {
  const s = truyenCoBan();
  s.nhanVats = [taoNhanVat("nv_a", "Duy")];
  const conv = s.hoiThoais[0];
  const canh = taoCanh(s, conv, {
    tomTat: "  Hai người nói chuyện.  ",
    moc: "  Gợi ý cảnh sau.  ",
    kyUc: [
      { noiDung: "  Ký ức thật  ", biet: [ID_NGUOI, "nv_a", "nv_b", "nv_khong_co"] },
      { noiDung: "   " },
      { noiDung: "Ký ức không có người biết", biet: [] },
    ],
    quanHe: [
      { tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 2 },
      { tu: ID_NGUOI, den: "nv_b", chieu: "tinTuong", huong: 1 },
      { tu: "nv_a", chieu: "tinTuong", huong: 1 },
      { tu: "nv_a", den: "nv_b", chieu: "khong-co-chieu-nay", huong: 1 },
      { tu: "nv_a", den: "nv_b", chieu: "chuaNoi", moi: "   " },
      { tu: "nv_a", den: "nv_b", chieu: "chuaNoi", moi: "điều giữ trong lòng" },
      { tu: "nv_a", den: "nv_b", chieu: "cangThang", huong: -1, buoc: 0 },
    ],
    nhanVat: [
      { nvId: "nv_a", truong: "camXuc", moi: "  dịu hơn  " },
      { nvId: "nv_a", truong: "camXuc" },
      { nvId: "", truong: "camXuc", moi: "x" },
    ],
  });
  ok(canh.id.indexOf("canh_") === 0, "cảnh có id riêng");
  eq(canh.htId, "ht_1", "gắn với hội thoại");
  eqSau(canh.htIds, ["ht_1"], "danh sách hội thoại của cảnh");
  eq(canh.tomTat, "Hai người nói chuyện.", "tóm tắt được cắt khoảng trắng");
  eq(canh.moc, "Gợi ý cảnh sau.", "mốc được cắt khoảng trắng");
  eq(canh.huy, false, "cảnh mới không bị huỷ");
  eq(canh.kyUc.length, 2, "bỏ ký ức rỗng");
  eqSau(canh.kyUc[0].biet, [ID_NGUOI, "nv_a"], "lọc người biết không còn là nhân vật");
  eq(canh.kyUc[1].noiDung, "Ký ức không có người biết", "ký ức không ghi ai biết vẫn được giữ");
  eq(canh.quanHe.length, 3, "bỏ quan hệ thiếu đầu/cuối, sai chiều, và chưaNói rỗng");
  eq(canh.quanHe[0].buoc, 2, "bước giữ nguyên khi hợp lệ");
  eq(canh.quanHe[2].buoc, 1, "bước 0 bị kéo về 1");
  eq(canh.quanHe[2].huong, -1, "chiều âm được giữ");
  eq(canh.quanHe[1].chieu, "chuaNoi", "mục chưa nói được giữ khi có nội dung");
  eq(canh.quanHe[1].moi, "điều giữ trong lòng", "nội dung chưa nói");
  eq(canh.nhanVat.length, 1, "bỏ dòng nhân vật thiếu dữ liệu");
  eq(canh.nhanVat[0].moi, "dịu hơn", "nội tâm được cắt khoảng trắng");
});

test("tinhTrangThai: có thể tính lại sau khi cảnh bị vô hiệu", () => {
  const s = truyenCoBan();
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { quanHe: [{ tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: 1, buoc: 2 }] })];
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b").tinTuong, 7, "trước khi vô hiệu");
  voHieuCanh(s, ["c1"]);
  eq(quanHeCua(tinhTrangThai(s, s.hoiThoais[0]), "nv_a", "nv_b"), null, "vô hiệu rồi thì quan hệ biến mất");
});

test("aiBietMacDinh: theo người lên tiếng, hoặc theo cảnh riêng", () => {
  const msgs = [
    taoTinNhan("m1", "nguoi", "Bạn", "câu 1"),
    taoTinNhan("m2", "ai", "Duy", "câu 2", { nvIds: ["nv_a"] }),
    taoTinNhan("m3", "ai", "Minh Quân", "câu 3", { nvId: "nv_b" }),
  ];
  eqSau(aiBietMacDinh(msgs, ""), [ID_NGUOI, "nv_a", "nv_b"], "gom mọi nhân vật đã lên tiếng");
  eqSau(aiBietMacDinh(msgs, "nv_c"), [ID_NGUOI, "nv_c"], "cảnh riêng thì chỉ người chơi và người đó");
  eqSau(aiBietMacDinh([], ""), [ID_NGUOI], "chưa có tin nhắn thì chỉ người chơi");
});

test("nhan nhip & nhãn: luôn có nhãn, không lộ id", () => {
  eq(nhipCua(taoTruyen({ nhip: "kichTinh" })).buoc, 2, "nhịp kịch tính bước 2");
  eq(nhipCua(taoTruyen({ nhip: "cham" })).buoc, 1, "nhịp chậm bước 1");
  eq(nhipCua(taoTruyen({ nhip: "la-hoac" })).id, "cham", "nhịp lạ thì rơi về mặc định");
  eq(nhanPhamVi("quanhe"), "Một mối quan hệ", "nhãn phạm vi");
  eq(nhanPhamVi("la-hoac"), "", "phạm vi lạ thì rỗng");
  eq(nhanTienDo("chuaCham"), "Chưa chạm tới", "nhãn tiến độ");
  eq(nhanTrangThaiHuong("hoatDong"), "Đang hoạt động", "nhãn trạng thái hướng");
  eq(nhanNhipHuong("vua"), "Vừa", "nhãn nhịp hướng");
  eq(tenGoi(taoTruyen(), ID_NGUOI), "Bạn", "người chơi hiển thị là Bạn");
});
