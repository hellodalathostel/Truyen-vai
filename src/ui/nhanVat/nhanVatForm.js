// Truyện Vai — Đợt 6b: logic THUẦN của màn "Sửa nhân vật" (form nhân vật).
//
// KHÔNG import DOM. Đây là chỗ ở của mọi QUYẾT ĐỊNH về cổng 18+ của màn này:
//   • tuổi số dưới 18 ⇒ KHOÁ CỨNG ô "Người trưởng thành (18+)" (bỏ tích + không tích lại được)
//   • lúc lưu: tuổi số dưới 18 LUÔN thắng ô tích; thiếu tuổi KHÔNG phải là người lớn
//   • hồ sơ ngoại hình đã khai tuổi ⇒ tuổi nhân vật theo hồ sơ (tuổi khai báo thắng ảnh)
//   • câu chữ của mọi lời nhắc/cảnh báo liên quan tới tuổi và tới nút "Bật giao kèo"
// Phần DOM (đọc ô, tích ô, gọi hộp xác nhận) nằm ở `index.js` và các tệp cùng thư mục.

import { tuoiSo } from "../../store.js";

export const LY_DO_BAT_GIAO_KEO = "Bạn đang bật giao kèo BDSM cho truyện này.";
export const LOI_TU_CHOI_BAT_GIAO_KEO = "Chưa xác nhận 18+ nên giao kèo chưa được bật.";
export const LY_DO_KHOA_TUOI = "Nhân vật ghi tuổi dưới 18 — không thể đánh dấu là người trưởng thành.";
export const TEN_MAC_DINH = "Nhân vật mới";

// Ô "Người trưởng thành (18+)" khoá cứng khi tuổi số < 18. `tuoi` = tuổi ĐÃ chuẩn hoá
// (`tuoiSo`), không phải chuỗi người dùng gõ.
export function khoaNguoiLonTheoTuoi(tuoi) {
  const tre = tuoi !== null && tuoi < 18;
  return { tre, boTich: tre, title: tre ? LY_DO_KHOA_TUOI : "" };
}

// Lúc LƯU: tuổi số dưới 18 luôn thắng ô tích. Thiếu tuổi cũng không phải là người lớn —
// chỉ cờ `nguoiLon` do người dùng tự tích mới tính.
export function chotNguoiLon({ tuoi, nguoiLon }) {
  return tuoi !== null && tuoi < 18 ? false : !!nguoiLon;
}

// Một người chỉ có MỘT tuổi khai báo: hồ sơ ngoại hình đã khai tuổi thì tuổi nhân vật lấy
// theo hồ sơ — ảnh (dù trông trưởng thành) không bao giờ thay cho tuổi khai báo.
export function tuoiTheoHoSo(hoSo) {
  if (!hoSo) return null;
  const tuoi = tuoiSo({ tuoi: hoSo.tuoi });
  return tuoi === null ? null : String(hoSo.tuoi);
}

// Tên hiển thị trong ô "Tên nhân vật": nhân vật mới chưa có tên thì để trống cho người
// dùng tự đặt, không hiện chữ "Nhân vật mới" như một cái tên thật.
export function tenTrongForm(nv) {
  return nv.ten === TEN_MAC_DINH ? "" : nv.ten || "";
}

export function tenSauKhiLuu(chuoiTen) {
  return String(chuoiTen || "").trim() || TEN_MAC_DINH;
}

// Bật lớp BDSM cho AI khi: truyện đã bật giao kèo, HOẶC người dùng vừa mở khối giao kèo ra
// xem (mở ra = đang muốn dùng). Một chỗ duy nhất, dùng cho cả hai nút AI của màn này.
export function bdsmTrongEditor({ gkBat, moRong }) {
  return !!gkBat || !!moRong;
}

// Chip "điều nhân vật thích": chuỗi trong ô ẩn ⇄ mảng id. Lúc LƯU thì cắt khoảng trắng,
// còn lúc bật/tắt chip thì không (giữ đúng hành vi cũ của hai đường).
export function soThichTuChuoi(v, catKhoangTrang) {
  const ds = String(v || "").split(",");
  return catKhoangTrang ? ds.map((s) => s.trim()).filter(Boolean) : ds.filter(Boolean);
}

export function doiSoThich(ds, id) {
  const ra = (ds || []).slice();
  const i = ra.indexOf(id);
  if (i >= 0) ra.splice(i, 1);
  else ra.push(id);
  return ra;
}

// Lời nhắc dưới khối liên kết hồ sơ: nói trước rằng tuổi KHAI BÁO là thứ quyết định.
export function goiYTuoiText({ tenHoSo, tuoiHoSo, tuoiForm, coThuVien }) {
  if (tuoiHoSo !== null && tuoiHoSo !== undefined) {
    return (
      "Hồ sơ “" + tenHoSo + "” khai " + tuoiHoSo + " tuổi — khi lưu, tuổi nhân vật sẽ lấy theo hồ sơ" +
      (tuoiForm !== null && tuoiForm !== tuoiHoSo ? " (hiện đang ghi " + tuoiForm + ")" : "") +
      ". Tuổi khai báo là thứ quyết định, ảnh không thay thế được." +
      (tuoiHoSo < 18 ? " Hồ sơ ghi tuổi dưới 18 nên nhân vật KHÔNG thể là người trưởng thành." : "")
    );
  }
  return coThuVien
    ? "Hồ sơ quyết định ngoại hình CỐ ĐỊNH dùng khi tạo ảnh. Trang phục, tư thế và biểu cảm vẫn lấy từ cảnh hiện tại — không lấy từ ảnh tham chiếu."
    : "Chưa có hồ sơ nào trong thư viện ngoại hình. Mở Thư viện để tạo một hồ sơ dùng chung.";
}

// Prompt cho "Tạo ảnh đại diện" — giữ nguyên câu chữ cũ.
export function promptAvatarAi({ ten, theLoaiTen, moTa }) {
  return (
    "Chân dung nhân vật " + (ten || "nhân vật") + " trong một câu chuyện " + (theLoaiTen || "viễn tưởng") +
    ". Ngoại hình: " + (moTa || "bí ẩn") + ". Chất lượng cao, ánh sáng điện ảnh, nền đơn giản, cận cảnh khuôn mặt."
  );
}
