// Truyện Vai — tầng kiểm thử Node: thời gian vắng mặt (src/thoiGian.js).

import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import {
  khoangText, chuanHoaPhien, chuanHoaThoiGian, thoiGianOf, thoiGianMacDinh, newSuKien,
  chuanHoaSuKien, suKienCua, suKienTheoId, maNgan, suKienTheoMaNgan, suKienBiet,
  suKienAnVoiNguoiChoi, tinhLaiBiet, coMatCua, canhDangMo, xetDieuKien, nhipTruocDo,
  nhanCheDo, nhanLoai, nhanMuc, moTaLoai, NGUONG_MAC_DINH, TOI_DA_SU_KIEN,
} from "../../src/thoiGian.js";
import { ID_NGUOI } from "../../src/trangThai.js";
import { taoTruyen, taoNhanVat, taoHoiThoai, taoCanhDaKhep, taoTinNhan } from "../fixtures/truyen.mjs";

function truyenCoBan() {
  return taoTruyen({
    nhanVats: [taoNhanVat("nv_a", "Duy"), taoNhanVat("nv_b", "Minh Quân")],
    hoiThoais: [taoHoiThoai("ht_1", "Bếp", ["nv_a", "nv_b"])],
  });
}

test("khoangText: đọc được thành lời", () => {
  eq(khoangText(0), "vài giây", "không có phút nào");
  eq(khoangText(5), "5 phút", "dưới một giờ");
  eq(khoangText(60), "1 giờ", "đúng một giờ");
  eq(khoangText(90), "1 giờ 30 phút", "một giờ rưỡi");
  eq(khoangText(1440), "1 ngày", "đúng một ngày");
  eq(khoangText(1500), "1 ngày 1 giờ", "một ngày một giờ");
  eq(khoangText(-5), "vài giây", "số âm kẹp về 0");
  eq(khoangText("la"), "vài giây", "giá trị rác kẹp về 0");
});

test("chuanHoaPhien / chuanHoaThoiGian: bù mặc định, không xoá cờ", () => {
  eq(chuanHoaPhien(null), null, "không có phiên thì trả null");
  const p = chuanHoaPhien({ batDau: 1000, ketThuc: 5000, trangThai: "la-hoac", cheDo: "la-hoac" });
  eq(p.trangThai, "thuLai", "trạng thái lạ rơi về cần thử lại");
  eq(p.cheDo, "tamDung", "chế độ lạ rơi về tạm dừng");
  ok(p.id && p.id.indexOf("vgp") === 0, "phiên thiếu id thì được cấp");
  eq(p.phut, 0, "chênh lệch dưới một phút thì 0 phút");
  const p2 = chuanHoaPhien({ batDau: 5000, ketThuc: 1000 });
  eq(p2.ketThuc, 5000, "kết thúc không thể trước bắt đầu");
  const tg = chuanHoaThoiGian({});
  eq(tg.cheDo, "tamDung", "mặc định là tạm dừng");
  eq(tg.nguongPhut, NGUONG_MAC_DINH, "mặc định ngưỡng");
  eq(tg.chuDong, true, "mặc định chủ động");
  eq(tg.phien, null, "không có phiên");
  eq(chuanHoaThoiGian({ chuDong: false }).chuDong, false, "cờ chủ động tắt được giữ");
  eq(chuanHoaThoiGian({ nguongPhut: -3 }).nguongPhut, 0, "ngưỡng âm kẹp về 0");
  eq(chuanHoaThoiGian({ phien: "rac" }).phien, null, "phiên rác thành null");
});

test("thoiGianOf: chuẩn hoá TẠI CHỖ (giữ nguyên danh tính đối tượng)", () => {
  const s = truyenCoBan();
  const tg = thoiGianOf(s);
  ok(s.thoiGian === tg, "gắn đối tượng vào truyện");
  s.thoiGian.phien = { id: "vgp_1", batDau: 0, ketThuc: 0 };
  const truoc = s.thoiGian.phien;
  thoiGianOf(s);
  ok(s.thoiGian.phien === truoc, "chuẩn hoá KHÔNG thay đối tượng phiên (app giữ tham chiếu)");
  eq(s.thoiGian.phien.cheDo, "tamDung", "nội dung phiên vẫn được chuẩn hoá");
  s.thoiGian.cheDo = "la-hoac";
  eq(thoiGianOf(s).cheDo, "tamDung", "chế độ lạ bị sửa tại chỗ");
  eq(thoiGianOf(null).cheDo, "tamDung", "không có truyện thì trả mặc định");
});

test("newSuKien: mặc định ẩn, chưa ai biết", () => {
  const e = newSuKien({ noiDung: "gì đó" });
  ok(e.id.indexOf("vg") === 0, "có id");
  eq(e.loai, "ngoaiManHinh", "mặc định là ngoài màn hình");
  eq(e.muc, "an", "mặc định là ẩn");
  eqSau(e.heLo, [], "chưa có lần hé lộ nào");
  eqSau(e.anhHuong, { quanHe: [], noiTam: [] }, "chưa có ảnh hưởng");
  eq(e.noiDung, "gì đó", "dữ liệu truyền vào được giữ");
});

test("chuanHoaSuKien: lọc id lạ, kẹp độ dài, suy ra mức hiển thị", () => {
  const s = truyenCoBan();
  const e = chuanHoaSuKien(
    {
      id: "vg_1",
      luc: -5,
      loai: "la-hoac",
      noiDung: "  Nội dung sự kiện  ",
      thamGia: ["nv_a", "nv_a", "nv_khong_co", 7, ""],
      biet: ["nv_b", "nv_khong_co", ID_NGUOI],
      muc: "daLo",
      htId: "ht_khong_co",
      cheDoVangMat: "la-hoac",
      phutVangMat: -9,
    },
    s
  );
  eq(e.loai, "ngoaiManHinh", "loại lạ rơi về ngoài màn hình");
  eq(e.noiDung, "Nội dung sự kiện", "nội dung được cắt khoảng trắng");
  eqSau(e.thamGia, ["nv_a"], "bỏ id lạ, bỏ trùng, bỏ giá trị không phải chuỗi");
  eqSau(e.biet, ["nv_b", ID_NGUOI], "giữ người chơi vì sự kiện đã lộ");
  eq(e.muc, "daLo", "mức đã lộ được giữ");
  eq(e.mucGoc, "daLo", "mức gốc bằng mức ghi vào");
  eq(e.htId, "", "hội thoại không tồn tại thì bỏ");
  eq(e.cheDoVangMat, "tamDung", "chế độ vắng mặt lạ rơi về tạm dừng");
  eq(e.phutVangMat, 0, "số phút âm kẹp về 0");
  eq(e.luc, 0, "mốc thời gian âm kẹp về 0");
  ok(e.suaLuc > 0, "có dấu thời gian sửa");
  const e2 = chuanHoaSuKien({ noiDung: "x", loai: "lienLac", htId: "ht_1" }, s);
  eq(e2.htId, "ht_1", "hội thoại có thật thì giữ");
  eq(e2.muc, "an", "mục ẩn không tự thêm người chơi vào danh sách biết");
  eq(e2.loai, "lienLac", "loại hợp lệ được giữ");
  eq(e2.cheDoVangMat, "tamDung", "mặc định chế độ vắng mặt");
});

test("chuanHoaSuKien: ảnh hưởng quan hệ/nội tâm bị lọc chặt", () => {
  const s = truyenCoBan();
  const e = chuanHoaSuKien(
    {
      noiDung: "x",
      anhHuong: {
        quanHe: [
          { tu: "nv_a", den: "nv_b", chieu: "tinTuong", huong: -1, buoc: 2 },
          { tu: ID_NGUOI, den: "nv_b", chieu: "tinTuong", huong: 1 },
          { tu: "nv_a", den: "nv_b", chieu: "chuaNoi", moi: "" },
          { tu: "nv_a", den: "nv_b", chieu: "chuaNoi", moi: "giữ trong lòng" },
          { tu: "nv_a", den: "nv_b", chieu: "la-hoac", huong: 1 },
        ],
        noiTam: [
          { nvId: "nv_a", truong: "camXuc", moi: "dịu hơn" },
          { nvId: ID_NGUOI, truong: "camXuc", moi: "x" },
          { nvId: "nv_a", truong: "la-hoac", moi: "x" },
          { nvId: "nv_a", truong: "camXuc", moi: "" },
        ],
      },
    },
    s
  );
  eq(e.anhHuong.quanHe.length, 2, "bỏ quan hệ tới người chơi, chưa-nói-rỗng, chiều lạ");
  eq(e.anhHuong.quanHe[0].huong, -1, "chiều âm được giữ");
  eq(e.anhHuong.quanHe[0].buoc, 2, "bước hợp lệ được giữ");
  eq(e.anhHuong.quanHe[1].chieu, "chuaNoi", "mục chưa nói có nội dung thì giữ");
  eq(e.anhHuong.noiTam.length, 1, "bỏ nội tâm của người chơi, trường lạ, và nội dung rỗng");
  eq(e.anhHuong.noiTam[0].moi, "dịu hơn", "nội dung nội tâm");
});

test("suKienTheoId / maNgan / suKienTheoMaNgan", () => {
  const s = truyenCoBan();
  s.ngoaiManHinh = [{ id: "vg_1", noiDung: "a" }, { id: "vg_2", noiDung: "b" }, { id: "vg_3", noiDung: "c" }];
  eq(Object.keys(suKienTheoId(s)).length, 3, "bản đồ id đủ ba sự kiện");
  eq(maNgan(s, "vg_1"), "S1", "mã ngắn theo thứ tự trong sổ");
  eq(maNgan(s, "vg_3"), "S3", "mã ngắn của sự kiện thứ ba");
  eq(maNgan(s, "vg_khong_co"), "", "không có thì trả rỗng");
  eq(suKienTheoMaNgan(s).S2, "vg_2", "ánh xạ ngược từ mã ngắn");
});

test("tinhLaiBiet: nguồn hé lộ chết thì mức quay về mức gốc", () => {
  const s = truyenCoBan();
  s.ngoaiManHinh = [
    { id: "vg_1", luc: 100, noiDung: "a", htId: "ht_1", heLo: [{ htId: "ht_1", tnId: "m1" }] },
    { id: "vg_2", luc: 200, noiDung: "b", mucGoc: "heLo", htId: "ht_1", heLo: [{ htId: "ht_1", tnId: "m9" }] },
  ];
  s.hoiThoais[0].vgHeLo = [{ vgId: "vg_1", htId: "ht_1", tnId: "m9" }];
  const doi = tinhLaiBiet(s, { ht_1: [taoTinNhan("m1", "ai", "Duy", "còn")] });
  eq(doi, true, "có thay đổi");
  const map = suKienTheoId(s);
  eq(map.vg_1.muc, "daLo", "nguồn còn sống thì sự kiện đã lộ");
  ok(map.vg_1.biet.indexOf(ID_NGUOI) >= 0, "đã lộ thì người chơi biết");
  eq(map.vg_2.muc, "heLo", "nguồn đã chết thì quay về mức gốc");
  eq(map.vg_2.heLo.length, 0, "nguồn chết bị xoá hẳn");
  eq(s.hoiThoais[0].vgHeLo.length, 0, "sổ hé lộ của nhánh cũng được dọn");
  eq(tinhLaiBiet(s, { ht_1: [taoTinNhan("m1", "ai", "Duy", "còn")] }), false, "chạy lại thì không còn gì đổi");
});

test("tinhLaiBiet: hội thoại chưa nạp thì KHÔNG coi là mất tin nhắn", () => {
  const s = truyenCoBan();
  s.ngoaiManHinh = [{ id: "vg_1", noiDung: "a", htId: "ht_1", heLo: [{ htId: "ht_1", tnId: "m1" }] }];
  tinhLaiBiet(s, {});
  eq(suKienCua(s)[0].heLo.length, 1, "thiếu dữ liệu không phải là mất");
  eq(suKienCua(s)[0].muc, "daLo", "vẫn coi là đã lộ");
});

test("suKienBiet / suKienAnVoiNguoiChoi", () => {
  const s = truyenCoBan();
  s.ngoaiManHinh = [
    { id: "vg_1", luc: 100, noiDung: "đã lộ", mucGoc: "daLo", htId: "ht_1", biet: ["nv_a", ID_NGUOI] },
    { id: "vg_2", luc: 200, noiDung: "còn ẩn", htId: "ht_1", biet: ["nv_a"] },
    { id: "vg_3", luc: 300, noiDung: "b không biết", htId: "ht_1", biet: ["nv_b"] },
  ];
  eqSau(suKienBiet(s, ["nv_a"], null).map((e) => e.id), ["vg_1", "vg_2"], "nv_a biết hai sự kiện");
  eqSau(suKienAnVoiNguoiChoi(s, ["nv_a"], null).map((e) => e.id), ["vg_2"], "chỉ việc còn ẩn mới phải giữ kín");
  eqSau(suKienBiet(s, [], null), [], "không truyền ai thì trả rỗng");
  eq(suKienBiet(s, ["nv_a"], null).length, 2, "không vượt quá số sự kiện liên quan");
});

test("coMatCua: theo danh sách hiện diện của hội thoại", () => {
  const s = truyenCoBan();
  const conv = s.hoiThoais[0];
  eqSau(coMatCua(s, conv).map((c) => c.id), ["nv_a", "nv_b"], "lấy theo nhanVatIds");
  conv.hienDien = ["nv_b"];
  eqSau(coMatCua(s, conv).map((c) => c.id), ["nv_b"], "danh sách hiện diện được ưu tiên");
  eqSau(coMatCua(s, null), [], "không có hội thoại thì rỗng");
  eqSau(coMatCua(null, conv), [], "không có truyện thì rỗng");
});

test("canhDangMo: chặn mô phỏng khi còn mạch dang dở", () => {
  const s = truyenCoBan();
  const conv = s.hoiThoais[0];
  eq(canhDangMo(s, {}), null, "chưa có tin nhắn thì không có cảnh mở");
  eq(canhDangMo(s, { ht_1: [taoTinNhan("m1", "ai", "Duy", "x")] }).vi, "tinNhan", "còn tin nhắn chưa khép");
  conv.canhRieng = { nvId: "nv_a", moLuc: 1 };
  eq(canhDangMo(s, {}).vi, "canhRieng", "đang mở một cảnh riêng");
  conv.canhRieng = null;
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { denMsgId: "m2" })];
  eq(canhDangMo(s, { ht_1: [taoTinNhan("m1", "ai", "Duy", "x"), taoTinNhan("m2", "ai", "Duy", "y")] }), null, "mọi tin nhắn đã được khép");
  eq(canhDangMo(s, { ht_1: [taoTinNhan("m1", "ai", "Duy", "x"), taoTinNhan("m2", "ai", "Duy", "y"), taoTinNhan("m3", "ai", "Duy", "z")] }).soTin, 1, "chỉ tính phần sau cảnh đã khép");
});

test("xetDieuKien: mọi nhánh chặn đều có lý do riêng", () => {
  const s = truyenCoBan();
  const conv = s.hoiThoais[0];
  const msgsRong = { ht_1: [] };
  const msgsDay = { ht_1: [taoTinNhan("m1", "ai", "Duy", "x")] };
  s.thoiGian = thoiGianMacDinh();
  eq(xetDieuKien(s, 1e12, msgsDay, null).lyDo, "tamDung", "đang tạm dừng");
  s.thoiGian.cheDo = "theoCanh";
  s.thoiGian.nguongPhut = 0;
  eq(xetDieuKien(s, 1e12, msgsDay, null).lyDo, "tatNguong", "ngưỡng bằng 0 nghĩa là tắt");
  s.thoiGian.nguongPhut = 30;
  eq(xetDieuKien(s, 1e12, msgsDay, null).lyDo, "chuaCoMoc", "chưa có mốc hoạt động");
  s.thoiGian.hoatDongLuc = 1000000;
  eq(xetDieuKien(s, 1000000 + 10 * 60000, msgsDay, null).lyDo, "duoiNguong", "chưa đủ ngưỡng");
  eq(xetDieuKien(s, 1000000 + 10 * 60000, msgsDay, null).phut, 10, "báo kèm số phút");
  const sau = 1000000 + 40 * 60000;
  eq(xetDieuKien(s, sau, msgsDay, null).lyDo, "canhDangMo", "còn cảnh dang dở");
  eq(xetDieuKien(s, sau, msgsRong, null).lyDo, "chuaBatDau", "chưa có tin nhắn nào");
  s.canhDaKhep = [taoCanhDaKhep("c1", "ht_1", { denMsgId: "m1" })];
  const kq = xetDieuKien(s, sau, msgsDay, null);
  eq(kq.ok, true, "đủ điều kiện thì cho chạy");
  eq(kq.soToiDa, 1, "chế độ theo cảnh chỉ một nhịp");
  eq(kq.phut, 40, "số phút vắng mặt");
  eq(kq.chuDong, true, "cờ chủ động đi kèm");
  s.thoiGian.cheDo = "thoiGianThat";
  eq(xetDieuKien(s, sau, msgsDay, null).soToiDa, TOI_DA_SU_KIEN, "thời gian thật cho tối đa số sự kiện");
  s.thoiGian.daXuLyLuc = 1000000 + 50 * 60000;
  eq(xetDieuKien(s, sau, msgsDay, null).lyDo, "daXuLy", "khoảng vắng mặt này đã xử lý rồi");
  s.thoiGian.daXuLyLuc = 0;
  s.thoiGian.phien = { trangThai: "dangXuLy" };
  eq(xetDieuKien(s, sau, msgsDay, null).lyDo, "dangChay", "đang có phiên chạy dở");
  s.thoiGian.phien = { trangThai: "thuLai" };
  eq(xetDieuKien(s, sau, msgsDay, null).ok, true, "phiên cần thử lại không chặn");
  eq(xetDieuKien(s, sau, msgsDay, 1000000 + 39 * 60000).lyDo, "duoiNguong", "mốc do app truyền vào được ưu tiên");
});

test("nhipTruocDo: thẻ bắt lại mạch, KHÔNG gọi AI", () => {
  const s = truyenCoBan();
  const conv = s.hoiThoais[0];
  eq(nhipTruocDo(s, null, []), null, "thiếu hội thoại thì trả null");
  s.canhDaKhep = [
    taoCanhDaKhep("c1", "ht_1", {
      luc: 100,
      moc: "Cảnh sau ở bến tàu",
      tomTat: "Hai người đã nói chuyện.",
      nhanVat: [{ nvId: "nv_a", truong: "camXuc", moi: "dịu hơn" }, { nvId: "nv_b", truong: "mucTieu", moi: "giữ lời" }],
    }),
  ];
  const the = nhipTruocDo(s, conv, [taoTinNhan("m1", "ai", "Duy", "chào bạn", { nvId: "nv_a" })]);
  eq(the.co, true, "có gì để hiển thị");
  eq(the.viTri.ten, "Duy", "người lên tiếng cuối");
  eq(the.viTri.noiDung, "chào bạn", "nội dung cuối");
  eq(the.moc, "Cảnh sau ở bến tàu", "mốc của cảnh gần nhất");
  eq(the.tomTatCanh, "Hai người đã nói chuyện.", "tóm tắt cảnh gần nhất");
  eq(the.camXuc.length, 1, "một nhân vật có cảm xúc còn đọng");
  eq(the.camXuc[0].ten, "Duy", "tên nhân vật có cảm xúc");
  eq(the.choDo.length, 1, "một nhân vật có điều đang chờ");
  eqSau(the.hienDien, ["Duy", "Minh Quân"], "danh sách người đang có mặt");
  const theNguoi = nhipTruocDo(s, conv, [taoTinNhan("m1", "nguoi", "Bạn", "tôi đây")]);
  eq(theNguoi.viTri.ten, "Bạn", "lượt cuối là của người chơi");
});

test("nhãn: luôn có chữ, không lộ id", () => {
  eq(nhanCheDo("theoCanh"), "Theo cảnh", "nhãn chế độ");
  eq(nhanCheDo("la-hoac"), "Tạm dừng", "chế độ lạ rơi về mặc định");
  eq(nhanLoai("lienLac"), "Liên lạc nhìn thấy", "nhãn loại");
  eq(nhanLoai("la-hoac"), "Ngoài màn hình", "loại lạ rơi về mặc định");
  eq(nhanMuc("an"), "Ẩn", "nhãn mức");
  eq(nhanMuc("la-hoac"), "Ẩn", "mức lạ rơi về mặc định");
  ok(moTaLoai("dauHieu").length > 10, "có mô tả cho loại dấu hiệu");
  eq(moTaLoai("la-hoac"), "", "loại lạ không có mô tả");
});
