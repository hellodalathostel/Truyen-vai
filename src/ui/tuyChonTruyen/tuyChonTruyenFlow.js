// Truyện Vai — Đợt 6c: QUYẾT ĐỊNH THUẦN của màn "Tuỳ chọn truyện".
//
// KHÔNG import gì, KHÔNG đọc DOM ⇒ chạy được ở tầng Node (tests/node/tuyChonTruyenFlow.test.mjs)
// và không thể lặng lẽ phụ thuộc vào giao diện. Tầng DOM (`tuyChonTruyenLuu.js`, `index.js`)
// chỉ ĐỌC form thành một túi giá trị rồi gọi những hàm dưới đây.
//
// Điểm dễ sai đã được ghim bằng ca kiểm thử:
//   - giá trị mặc định khi ô để trống (tên truyện giữ tên cũ, emoji về "✦", tên người chơi về "Bạn")
//   - mã nhịp / mã chế độ vắng mặt ⇒ quay về mặc định ("cham", "tamDung"), KHÔNG ghi mã lạ vào dữ liệu
//   - số phút: `Math.max(0, Math.round(Number(x) || 0))`
//   - đổi sang chế độ "chuong" mà truyện chưa có chương nào ⇒ phải tạo Chương 1
//   - ảnh chụp + hoàn tác phải đối xứng (ghi hỏng thì trả về ĐÚNG trạng thái cũ)
//
// CỬA 18+ KHÔNG NẰM Ở ĐÂY. Màn này chỉ mở hộp Giao kèo bằng hàm dùng chung của app
// (`openGiaoKeo`), và mọi phán định tuổi + câu chữ nằm ở `src/ui/cong18.js` / `store.js`.

// Mã mặc định khi ô chọn không có giá trị hợp lệ (trùng với mã trong `trangThai.js` /
// `thoiGian.js`; để ở đây vì tầng thuần không import lõi).
export const NHIP_MAC_DINH = "cham";
export const CHE_DO_MAC_DINH = "tamDung";
export const EMOJI_MAC_DINH = "✦";
export const TEN_NGUOI_CHOI_MAC_DINH = "Bạn";

// Danh sách ngưỡng hiển thị: các ngưỡng chuẩn, cộng ngưỡng đang có của truyện nếu là số lạ
// (người dùng từng chọn bằng tay) — xếp tăng dần. Trả về mảng MỚI, không sửa mảng truyền vào.
export function nguongChonDuoc(nguongPhut, dsChuan) {
  const ra = dsChuan.slice();
  const p = Number(nguongPhut) || 0;
  if (p > 0 && ra.indexOf(p) < 0) ra.push(p);
  ra.sort((a, b) => a - b);
  return ra;
}

// Nhãn hai nút của màn — câu chữ chỉ có một nguồn ở đây, tầng DOM không được chép lại.
export function nhanNutGiaoKeo(bat) {
  return bat ? "Đang bật — chỉnh giao kèo" : "Thiết lập giao kèo";
}

export function nhanNutLorebook(soMuc) {
  return soMuc ? "Đang có " + soMuc + " mục — mở sổ" : "Nạp file lorebook";
}

// Một túi giá trị form ⇒ những gì sẽ ghi vào truyện. `hopLe` = { nhip: [mã…], cheDo: [mã…] }
// lấy từ lõi (`trangThai.NHIP`, `thoiGian.CHE_DO`) ở tầng DOM.
export function giaTriSapLuu(gia, story, hopLe) {
  const chu = (x) => String(x === undefined || x === null ? "" : x).trim();
  const mode = gia.mode;
  return {
    ten: chu(gia.ten) || story.ten,
    emoji: chu(gia.emoji) || EMOJI_MAC_DINH,
    boiCanh: chu(gia.boiCanh),
    nguoiChoiTen: chu(gia.nguoiChoiTen) || TEN_NGUOI_CHOI_MAC_DINH,
    nguoiChoiMoTa: chu(gia.nguoiChoiMoTa),
    mode,
    nhip: hopLe.nhip.indexOf(gia.nhip) >= 0 ? gia.nhip : NHIP_MAC_DINH,
    daoDienBat: gia.daoDien === "1",
    cheDo: hopLe.cheDo.indexOf(gia.vgCheDo) >= 0 ? gia.vgCheDo : CHE_DO_MAC_DINH,
    nguongPhut: Math.max(0, Math.round(Number(gia.vgNguong) || 0)),
    chuDong: gia.vgChuDong === "1",
    // Chế độ "một cốt truyện, nhiều chương" mà truyện chưa có chương nào ⇒ phải có Chương 1,
    // nếu không màn hình chat sẽ trỏ vào một chương không tồn tại.
    canTaoChuong: mode === "chuong" && !story.chuongs.length,
  };
}

// Ảnh chụp những gì sắp bị đổi — ghi hỏng thì trả lại đúng trạng thái cũ và báo `false` để
// chỗ gọi KHÔNG đóng bảng / không coi như đã lưu.
export function chupTrangThai(story, tgv, daoDienBat) {
  return {
    ten: story.ten, emoji: story.emoji, boiCanh: story.boiCanh, mode: story.mode, nhip: story.nhip,
    ncTen: story.nguoiChoi.ten, ncMoTa: story.nguoiChoi.moTa, ncNgoaiHinh: story.nguoiChoi.ngoaiHinhId,
    soChuong: story.chuongs.length, ddBat: daoDienBat,
    cheDo: tgv.cheDo, nguong: tgv.nguongPhut, chuDong: tgv.chuDong,
  };
}

export function khoiPhucTrangThai(story, tgv, truoc, daoDien) {
  story.ten = truoc.ten;
  story.emoji = truoc.emoji;
  story.boiCanh = truoc.boiCanh;
  story.mode = truoc.mode;
  story.nhip = truoc.nhip;
  story.nguoiChoi.ten = truoc.ncTen;
  story.nguoiChoi.moTa = truoc.ncMoTa;
  story.nguoiChoi.ngoaiHinhId = truoc.ncNgoaiHinh;
  story.chuongs.length = truoc.soChuong;
  if (daoDien) daoDien.bat = truoc.ddBat;
  tgv.cheDo = truoc.cheDo;
  tgv.nguongPhut = truoc.nguong;
  tgv.chuDong = truoc.chuDong;
}

// Liên kết hồ sơ ngoại hình của NGƯỜI CHƠI: lựa chọn đang gõ CHƯA được lưu, nên phép đếm
// chưa tính người chơi — cộng vào để con số không nói thiếu so với những gì sắp xảy ra.
export function demNguoiDung(dung, sapDung) {
  return { nhanVat: dung.nhanVat, nguoiChoi: dung.nguoiChoi + sapDung, anh: dung.anh };
}

// Tên người chơi khác tên chính của hồ sơ ⇒ hiện gợi ý "dùng tên chính" (chỉ điền vào ô tên).
export function lechTen(tenNc, tenChinh) {
  return String(tenNc).toLowerCase() !== String(tenChinh).toLowerCase();
}

// Ô chọn chỉ giữ được hồ sơ CÒN tồn tại (thư viện có thể đã bị xoá ở tab khác).
export function chonConSong(muon, conSong) {
  return muon && conSong ? muon : "";
}
