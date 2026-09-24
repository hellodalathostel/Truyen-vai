// Truyện Vai — Đợt 6b: cửa 18+ DÙNG CHUNG cho những màn có nội dung người lớn.
//
// Vì sao có tệp này: ba màn (tạo truyện bằng wizard, Tạo nhanh, sửa nhân vật) đều hỏi cùng
// một câu hỏi 18+, cùng ghi cờ `nguoiLon`, cùng chặn cùng kiểu. Trước đây mỗi màn tự viết
// lại chuỗi thông điệp — sửa một chỗ là lệch ba chỗ. Nay mọi QUYẾT ĐỊNH và mọi CÂU CHỮ nằm
// ở đây, thuần, không DOM, nên test được bằng Node.
//
// Cái gì ở đây: khi nào phải hỏi, ai được ghi cờ, ai bị chặn (kèm lý do), mã danh sách để
// biết "đã xác nhận đúng danh sách này chưa", và thông điệp khi người dùng từ chối.
// Cái gì KHÔNG ở đây: hộp thoại, nút bấm, thứ tự DOM — phần đó do màn hình lo.

import { dsSeGhiCoNguoiLon, dsChanGhiCo } from "../store.js";

// ------------------------------------------------------------------ lời hỏi (lý do)
export const LY_DO_BAT_GIAO_KEO = "Bạn đang bật giao kèo BDSM cho truyện này.";
export const LY_DO_NHANH_DUNG_BAN_NHAP = "Bản nháp bạn sắp dựng có giao kèo BDSM.";
export const LY_DO_NHANH_TAO_TRUYEN = "Truyện bạn sắp tạo sẽ bật giao kèo BDSM.";

// ------------------------------------------------------------------ câu chữ khi TỪ CHỐI
export const LOI_TU_CHOI_DANH_SACH =
  "Chưa xác nhận 18+ cho đúng danh sách nhân vật nên truyện được tạo KHÔNG kèm lớp giao kèo.";
export const LOI_TU_CHOI_BAT_GIAO_KEO = "Chưa xác nhận 18+ nên giao kèo chưa được bật.";
export const GHI_CHU_NHANH_KHONG_BDSM = "Chưa xác nhận 18+ nên bản nháp được dựng KHÔNG kèm lớp BDSM.";
export const LOI_NHANH_THE_LOAI_BDSM =
  "Chưa xác nhận 18+ nên không tạo được truyện với thể loại BDSM này — hãy chọn thể loại khác hoặc xác nhận.";
export const LOI_NHANH_CHUA_XAC_NHAN =
  "Chưa xác nhận 18+ nên chưa tạo truyện. Bỏ tích giao kèo, hoặc xác nhận, rồi bấm “Tạo cốt truyện” lại.";

// Thể loại có `bdsm` ⇒ TỰ ĐỘNG coi như đang đòi lớp người lớn, kể cả khi ô tích chưa được
// tích (người dùng có thể vừa đổi thể loại xong).
export function coBdsm({ theLoai, tich }) {
  return !!((theLoai || {}).bdsm) || !!tich;
}

// Danh sách nhân vật SẼ được ghi cờ `nguoiLon` khi người dùng xác nhận (chỉ những người
// không có dấu hiệu vị thành niên), và danh sách KHÔNG được ghi kèm lý do.
export function danhSachGhiCo(nhanVats) {
  return dsSeGhiCoNguoiLon({ nhanVats: nhanVats || [] });
}

export function danhSachBiChan(nhanVats) {
  return dsChanGhiCo({ nhanVats: nhanVats || [] });
}

// "Mã danh sách" = dấu vân tay của ĐÚNG danh sách sẽ được ghi cờ. Hộp xác nhận ở bước dựng
// bản nháp chưa biết tên nhân vật, nên lúc TẠO phải so lại: danh sách đã đổi thì phải hỏi
// lại, nếu không người dùng đã xác nhận một danh sách khác với danh sách thật sự được ghi.
export function maDanhSach(nhanVats) {
  return (nhanVats || []).map((c) => c.ten).join("|");
}

export function canHoiLaiDanhSach({ dongY18, maDaXacNhan, nhanVats }) {
  if (!dongY18) return true;
  return maDaXacNhan !== maDanhSach(nhanVats);
}

// Phần vá thêm vào giao kèo mặc định khi tạo truyện bằng Tạo nhanh. Tách khỏi
// `giaoKeoMacDinh()` (hàm của lõi) để chỗ này thuần và test được.
export function patchGiaoKeoTaoNhanh({ bat, theLoai }) {
  if (!bat) return {};
  return {
    bat: true,
    nguoiLon: true,
    khongKhi: (theLoai && theLoai.khongKhi) || "",
    kieuQuanHe: (theLoai && theLoai.kieuQuanHe) || "",
  };
}

export function loiTuChoiTaoNhanh(theLoai) {
  return theLoai && theLoai.bdsm ? LOI_NHANH_THE_LOAI_BDSM : LOI_NHANH_CHUA_XAC_NHAN;
}

// Phần vá cho bản nháp AI (Tạo nhanh, bước "Dựng bản nháp"): Ở bước này CHƯA biết tên nhân
// vật nên không đặt `kieuQuanHe`; lúc TẠO mới vá đủ (xem `patchGiaoKeoTaoNhanh`).
export function patchGiaoKeoBanNhap({ bat, theLoai }) {
  if (!bat) return null;
  return { bat: true, nguoiLon: true, khongKhi: (theLoai && theLoai.khongKhi) || "" };
}
