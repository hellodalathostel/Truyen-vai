// Truyện Vai — mẫu văn bản do mô hình trả về, dùng cho tầng kiểm thử Node.
// Mọi tên ở đây là HƯ CẤU, cố tình trung tính (không dùng tên/id truyện thật).

const NL = String.fromCharCode(10);
const dong = (...xs) => xs.join(NL);

// Phiếu Khép cảnh ĐẦY ĐỦ (đúng định dạng app yêu cầu).
export const PHIEU_DAY_DU = dong(
  "TÓM TẮT: Hai người nói chuyện trong bếp và hứa sẽ gặp lại ở bến tàu.",
  "KÝ ỨC:",
  "- Lời hứa gặp lại ở bến tàu | BIẾT: Minh Quân, Duy",
  "- Một chuyện riêng tư không ai khác biết",
  "QUAN HỆ:",
  "- Minh Quân -> Duy: tin tưởng lên | VÌ: đã giữ lời | CHƯA NÓI: vẫn còn giận chuyện cũ",
  "- Duy -> Minh Quân: căng thẳng xuống | VÌ: đã xin lỗi",
  "NHÂN VẬT:",
  "- Duy: cảm xúc | CŨ: lạnh nhạt | MỚI: dịu hơn | VÌ: được quan tâm",
  "- Minh Quân: mục tiêu | MỚI: giữ lời hứa",
  "MÓC: Cảnh sau nên mở ở bến tàu, lúc trời vừa tối."
);

// Phiếu chỉ có tóm tắt, các mục còn lại ghi KHONG CO.
export const PHIEU_TOI_THIEU = dong(
  "TÓM TẮT: Một buổi trò chuyện nhẹ nhàng, không có gì đổi thay.",
  "KÝ ỨC: KHONG CO",
  "QUAN HỆ: KHONG CO",
  "NHÂN VẬT: KHONG CO",
  "MÓC: KHONG CO"
);

// Phiếu rác: mô hình không theo định dạng — KHÔNG được làm app vỡ.
export const PHIEU_RAC = dong(
  "Xin chào, tôi đã viết xong cảnh này rồi.",
  "Tôi nghĩ mọi thứ ổn.",
  "- một dòng gạch đầu dòng không có nhãn"
);

// Mục quan hệ chỉ có CHƯA NÓI (không có chiều lên/xuống).
export const PHIEU_CHUA_NOI = dong(
  "TÓM TẮT: Im lặng kéo dài.",
  "QUAN HỆ:",
  "- Duy -> Minh Quân: gần gũi | CHƯA NÓI: định nói ra nhưng thôi"
);
