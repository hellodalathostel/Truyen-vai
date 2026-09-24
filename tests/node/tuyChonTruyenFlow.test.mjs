// Truyện Vai — tầng kiểm thử Node: LOGIC THUẦN của màn "Tuỳ chọn truyện" (Đợt 6c).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `openStoryMenu` từng là một hàm 245 dòng trộn DOM với quyết định (giá trị
// mặc định khi ô để trống, mã nhịp/chế độ hợp lệ, số phút, ảnh chụp + hoàn tác). Sau khi tách,
// mọi quyết định nằm ở `src/ui/tuyChonTruyen/tuyChonTruyenFlow.js` — tệp này ghim chúng lại.
//
// Ba nhóm dễ sai nhất:
//   • GIÁ TRỊ MẶC ĐỊNH — ô để trống KHÔNG được ghi chuỗi rỗng xuống dữ liệu thật.
//   • MÃ LẠ — mã nhịp / mã chế độ vắng mặt không có trong danh sách hợp lệ phải quay về mặc
//     định, không được ghi thẳng mã lạ vào truyện.
//   • ĐỐI XỨNG CỦA HOÀN TÁC — `chupTrangThai` rồi `khoiPhucTrangThai` phải trả về ĐÚNG trạng
//     thái cũ (nếu thiếu một trường, người dùng thấy dữ liệu nửa mới nửa cũ sau khi ghi hỏng).
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const F = await import("../../src/ui/tuyChonTruyen/tuyChonTruyenFlow.js");

const HOP_LE = { nhip: ["cham", "vua", "nhanh"], cheDo: ["tamDung", "tiepDien"] };

// Truyện giả tối thiểu: đủ trường mà `giaTriSapLuu` / ảnh chụp chạm tới.
function truyenGia(them) {
  return Object.assign(
    {
      ten: "Tên cũ",
      emoji: "🌙",
      boiCanh: "Bối cảnh cũ",
      mode: "songSong",
      nhip: "vua",
      nguoiChoi: { ten: "Nam", moTa: "Cao", ngoaiHinhId: "" },
      chuongs: [],
    },
    them || {}
  );
}

// =============================================================== ngưỡng hiển thị
test("nguongChonDuoc: danh sách chuẩn + ngưỡng lạ đang có của truyện, xếp tăng dần", () => {
  eqSau(F.nguongChonDuoc(0, [30, 60]), [30, 60], "ngưỡng 0 (tắt) không được thêm vào");
  eqSau(F.nguongChonDuoc(45, [30, 60]), [30, 45, 60], "ngưỡng lạ chèn đúng chỗ");
  eqSau(F.nguongChonDuoc(45, [60, 30]), [30, 45, 60], "mảng chuẩn lộn xộn vẫn xếp lại");
  eqSau(F.nguongChonDuoc(60, [30, 60]), [30, 60], "đã có sẵn thì KHÔNG thêm trùng");
  eqSau(F.nguongChonDuoc(-5, [30]), [30], "ngưỡng âm bị bỏ");
  eqSau(F.nguongChonDuoc("abc", [30]), [30], "không phải số thì bỏ");
  eqSau(F.nguongChonDuoc(undefined, [30, 60]), [30, 60], "undefined vẫn an toàn");
  // Trả về MẢNG MỚI: sửa kết quả không được đụng vào mảng truyền vào.
  const chuan = [30, 60];
  const ra = F.nguongChonDuoc(45, chuan);
  ra.push(999);
  eqSau(chuan, [30, 60], "không sửa mảng truyền vào");
});

// =============================================================== nhãn nút
test("nhanNutGiaoKeo / nhanNutLorebook: câu chữ chỉ có MỘT nguồn", () => {
  eq(F.nhanNutGiaoKeo(true), "Đang bật — chỉnh giao kèo", "khi đang bật");
  eq(F.nhanNutGiaoKeo(false), "Thiết lập giao kèo", "khi đang tắt");
  eq(F.nhanNutGiaoKeo(0), "Thiết lập giao kèo", "giá trị giả ⇒ nhãn tắt");
  eq(F.nhanNutGiaoKeo(undefined), "Thiết lập giao kèo", "undefined ⇒ nhãn tắt");
  eq(F.nhanNutLorebook(0), "Nạp file lorebook", "sổ trống");
  eq(F.nhanNutLorebook(1), "Đang có 1 mục — mở sổ", "một mục");
  eq(F.nhanNutLorebook(7), "Đang có 7 mục — mở sổ", "nhiều mục");
  eq(F.nhanNutLorebook(undefined), "Nạp file lorebook", "undefined ⇒ sổ trống");
});

// =============================================================== giá trị sắp lưu
test("giaTriSapLuu: ô để trống ⇒ mặc định, KHÔNG ghi chuỗi rỗng xuống dữ liệu", () => {
  const story = truyenGia();
  const ra = F.giaTriSapLuu({}, story, HOP_LE);
  eq(ra.ten, "Tên cũ", "tên trống ⇒ giữ tên cũ của truyện");
  eq(ra.emoji, "✦", "emoji trống ⇒ về mặc định");
  eq(ra.nguoiChoiTen, "Bạn", "tên người chơi trống ⇒ Bạn");
  eq(ra.boiCanh, "", "bối cảnh trống ⇒ chuỗi rỗng (hợp lệ)");
  eq(ra.nguoiChoiMoTa, "", "mô tả trống ⇒ chuỗi rỗng");
  eq(ra.nhip, "cham", "thiếu/không hợp lệ ⇒ nhịp mặc định");
  eq(ra.cheDo, "tamDung", "thiếu/không hợp lệ ⇒ chế độ mặc định");
  eq(ra.daoDienBat, false, "không chọn ⇒ Đạo diễn tắt");
  eq(ra.chuDong, false, "không chọn ⇒ tương tác chủ động tắt");
  eq(ra.nguongPhut, 0, "thiếu ⇒ 0 phút");
  eq(ra.canTaoChuong, false, "chưa chọn chế độ chương ⇒ không tạo chương");
  eq(F.giaTriSapLuu({ ten: "   " }, story, HOP_LE).ten, "Tên cũ", "toàn khoảng trắng cũng là trống");
  eq(F.giaTriSapLuu({ emoji: "   " }, story, HOP_LE).emoji, "✦", "emoji toàn khoảng trắng ⇒ mặc định");
});

test("giaTriSapLuu: chuỗi có chữ được cắt khoảng trắng hai đầu", () => {
  const ra = F.giaTriSapLuu(
    { ten: "  Tên mới  ", emoji: "  🌸  ", boiCanh: "  B  ", nguoiChoiTen: "  Lan  ", nguoiChoiMoTa: "  M  " },
    truyenGia(),
    HOP_LE
  );
  eq(ra.ten, "Tên mới", "tên");
  eq(ra.emoji, "🌸", "emoji");
  eq(ra.boiCanh, "B", "bối cảnh");
  eq(ra.nguoiChoiTen, "Lan", "tên người chơi");
  eq(ra.nguoiChoiMoTa, "M", "mô tả người chơi");
});

test("giaTriSapLuu: mã nhịp / mã chế độ LẠ không lọt vào dữ liệu", () => {
  const story = truyenGia();
  eq(F.giaTriSapLuu({ nhip: "vua" }, story, HOP_LE).nhip, "vua", "mã hợp lệ thì giữ");
  eq(F.giaTriSapLuu({ nhip: "sieu-nhanh" }, story, HOP_LE).nhip, "cham", "mã lạ ⇒ mặc định");
  eq(F.giaTriSapLuu({ nhip: "" }, story, HOP_LE).nhip, "cham", "mã rỗng ⇒ mặc định");
  eq(F.giaTriSapLuu({ vgCheDo: "tiepDien" }, story, HOP_LE).cheDo, "tiepDien", "mã hợp lệ thì giữ");
  eq(F.giaTriSapLuu({ vgCheDo: "khong-co" }, story, HOP_LE).cheDo, "tamDung", "mã lạ ⇒ mặc định");
  eq(F.giaTriSapLuu({ vgCheDo: null }, story, HOP_LE).cheDo, "tamDung", "null ⇒ mặc định");
});

test("giaTriSapLuu: ngưỡng phút là số nguyên không âm", () => {
  const story = truyenGia();
  const p = (x) => F.giaTriSapLuu({ vgNguong: x }, story, HOP_LE).nguongPhut;
  eq(p("30"), 30, "chuỗi số");
  eq(p(30), 30, "số");
  eq(p("12.6"), 13, "làm tròn lên");
  eq(p("12.4"), 12, "làm tròn xuống");
  eq(p("-5"), 0, "số âm ⇒ 0");
  eq(p("abc"), 0, "không phải số ⇒ 0");
  eq(p(""), 0, "chuỗi rỗng ⇒ 0");
  eq(p("0"), 0, "0 ⇒ 0");
  eq(p(undefined), 0, "undefined ⇒ 0");
});

test("giaTriSapLuu: cờ chỉ bật khi ô chọn đúng \"1\"", () => {
  const story = truyenGia();
  eq(F.giaTriSapLuu({ daoDien: "1" }, story, HOP_LE).daoDienBat, true, "Đạo diễn \"1\"");
  eq(F.giaTriSapLuu({ daoDien: "0" }, story, HOP_LE).daoDienBat, false, "Đạo diễn \"0\"");
  eq(F.giaTriSapLuu({ daoDien: true }, story, HOP_LE).daoDienBat, false, "true (không phải chuỗi) ⇒ tắt");
  eq(F.giaTriSapLuu({ vgChuDong: "1" }, story, HOP_LE).chuDong, true, "chủ động \"1\"");
  eq(F.giaTriSapLuu({ vgChuDong: "0" }, story, HOP_LE).chuDong, false, "chủ động \"0\"");
});

test("giaTriSapLuu: chế độ chương mà truyện chưa có chương nào ⇒ phải tạo Chương 1", () => {
  eq(F.giaTriSapLuu({ mode: "chuong" }, truyenGia({ chuongs: [] }), HOP_LE).canTaoChuong, true, "chưa có chương nào");
  eq(F.giaTriSapLuu({ mode: "chuong" }, truyenGia({ chuongs: [{ id: "c1" }] }), HOP_LE).canTaoChuong, false, "đã có chương");
  eq(F.giaTriSapLuu({ mode: "songSong" }, truyenGia({ chuongs: [] }), HOP_LE).canTaoChuong, false, "chế độ hội thoại không cần chương");
  eq(F.giaTriSapLuu({}, truyenGia({ chuongs: [{ id: "c1" }] }), HOP_LE).canTaoChuong, false, "chưa chọn gì");
});

// =============================================================== ảnh chụp / hoàn tác
test("chupTrangThai + khoiPhucTrangThai: đối xứng từng trường", () => {
  const story = truyenGia({ chuongs: [{ id: "c1" }, { id: "c2" }] });
  const tgv = { cheDo: "tiepDien", nguongPhut: 30, chuDong: true };
  const dd = { bat: true };
  const truoc = F.chupTrangThai(story, tgv, dd.bat);
  eqSau(
    truoc,
    {
      ten: "Tên cũ", emoji: "🌙", boiCanh: "Bối cảnh cũ", mode: "songSong", nhip: "vua",
      ncTen: "Nam", ncMoTa: "Cao", ncNgoaiHinh: "", soChuong: 2, ddBat: true,
      cheDo: "tiepDien", nguong: 30, chuDong: true,
    },
    "ảnh chụp đúng mọi trường"
  );
  // Đổi HẾT rồi hoàn tác.
  story.ten = "Tên mới";
  story.emoji = "🌸";
  story.boiCanh = "B";
  story.mode = "chuong";
  story.nhip = "nhanh";
  story.nguoiChoi.ten = "Lan";
  story.nguoiChoi.moTa = "M";
  story.nguoiChoi.ngoaiHinhId = "hs1";
  story.chuongs.push({ id: "c3" });
  dd.bat = false;
  tgv.cheDo = "tamDung";
  tgv.nguongPhut = 0;
  tgv.chuDong = false;
  F.khoiPhucTrangThai(story, tgv, truoc, dd);
  eq(story.ten, "Tên cũ", "tên về như cũ");
  eq(story.emoji, "🌙", "emoji về như cũ");
  eq(story.boiCanh, "Bối cảnh cũ", "bối cảnh về như cũ");
  eq(story.mode, "songSong", "chế độ dựng về như cũ");
  eq(story.nhip, "vua", "nhịp về như cũ");
  eq(story.nguoiChoi.ten, "Nam", "tên người chơi về như cũ");
  eq(story.nguoiChoi.moTa, "Cao", "mô tả người chơi về như cũ");
  eq(story.nguoiChoi.ngoaiHinhId, "", "liên kết hồ sơ về như cũ");
  eq(story.chuongs.length, 2, "số chương cắt về như cũ");
  eq(dd.bat, true, "cờ Đạo diễn về như cũ");
  eq(tgv.cheDo, "tiepDien", "chế độ vắng mặt về như cũ");
  eq(tgv.nguongPhut, 30, "ngưỡng về như cũ");
  eq(tgv.chuDong, true, "tương tác chủ động về như cũ");
});

test("khoiPhucTrangThai: không có Đạo diễn cũng không vỡ", () => {
  const story = truyenGia();
  const tgv = { cheDo: "tamDung", nguongPhut: 0, chuDong: false };
  const truoc = F.chupTrangThai(story, tgv, false);
  story.ten = "Khác";
  F.khoiPhucTrangThai(story, tgv, truoc, null);
  eq(story.ten, "Tên cũ", "hoàn tác được cả khi không truyền Đạo diễn");
});

// =============================================================== phép đếm + tên + ô chọn
test("demNguoiDung: lựa chọn đang gõ dở của người chơi được cộng vào phép đếm", () => {
  eqSau(F.demNguoiDung({ nhanVat: 2, nguoiChoi: 0, anh: 3 }, 1), { nhanVat: 2, nguoiChoi: 1, anh: 3 }, "chưa dùng ⇒ +1");
  eqSau(F.demNguoiDung({ nhanVat: 2, nguoiChoi: 1, anh: 3 }, 0), { nhanVat: 2, nguoiChoi: 1, anh: 3 }, "đã dùng ⇒ giữ nguyên");
  eqSau(F.demNguoiDung({ nhanVat: 0, nguoiChoi: 0, anh: 0 }, 0), { nhanVat: 0, nguoiChoi: 0, anh: 0 }, "rỗng");
});

test("lechTen: so tên người chơi với tên chính của hồ sơ, không phân biệt hoa thường", () => {
  eq(F.lechTen("Nam", "Nam"), false, "trùng");
  eq(F.lechTen("nam", "NAM"), false, "khác hoa thường vẫn coi là trùng");
  eq(F.lechTen("Bạn", "Nam"), true, "khác thì lệch");
  eq(F.lechTen("", "Nam"), true, "rỗng thì lệch");
});

test("chonConSong: chỉ giữ hồ sơ còn tồn tại trong thư viện", () => {
  eq(F.chonConSong("hs1", { id: "hs1" }), "hs1", "còn sống thì giữ");
  eq(F.chonConSong("hs1", null), "", "đã bị xoá ⇒ bỏ liên kết");
  eq(F.chonConSong("", { id: "hs1" }), "", "không chọn gì ⇒ rỗng");
  eq(F.chonConSong(undefined, { id: "hs1" }), "", "undefined ⇒ rỗng");
  eq(F.chonConSong(null, null), "", "null cả hai vế ⇒ rỗng");
});

// =============================================================== hằng mặc định
test("hằng mặc định khớp với mã mà tầng dữ liệu chấp nhận", () => {
  // `nhip` và chế độ vắng mặt phải là mã CÓ THẬT trong danh sách hợp lệ — lệch là ghi ra
  // dữ liệu một mã mà `trangThai.js`/`thoiGian.js` sẽ không nhận ra.
  ok(HOP_LE.nhip.indexOf(F.NHIP_MAC_DINH) >= 0, "NHIP_MAC_DINH nằm trong danh sách nhịp hợp lệ");
  ok(HOP_LE.cheDo.indexOf(F.CHE_DO_MAC_DINH) >= 0, "CHE_DO_MAC_DINH nằm trong danh sách chế độ hợp lệ");
  eq(F.NHIP_MAC_DINH, "cham", "nhịp mặc định");
  eq(F.CHE_DO_MAC_DINH, "tamDung", "chế độ mặc định");
  eq(F.EMOJI_MAC_DINH, "✦", "emoji mặc định");
  eq(F.TEN_NGUOI_CHOI_MAC_DINH, "Bạn", "tên người chơi mặc định");
});
