// Truyện Vai — mẫu kế hoạch VẮNG MẶT do mô hình trả về.

const NL = String.fromCharCode(10);
const dong = (...xs) => xs.join(NL);

export const VANG_MAT_HAI_SU_KIEN = dong(
  "SỰ KIỆN 1:",
  "LOẠI: Liên lạc",
  "SAU KHI RỜI: 1.5 giờ",
  "HÌNH THỨC: Tin nhắn",
  "NHÂN VẬT: Duy",
  "HỘI THOẠI: Bếp",
  "NỘI DUNG: Duy nhắn hỏi người chơi đang ở đâu.",
  "AI BIẾT: Duy",
  "MỨC HIỂN THỊ: Đã lộ",
  "PHÁT HIỆN: Người chơi mở điện thoại và thấy tin nhắn.",
  "ẢNH HƯỞNG: Duy -> Minh Quân: gần gũi lên | VÌ: chủ động nhắn trước",
  "",
  "SỰ KIỆN 2:",
  "LOẠI: Ngoài màn hình",
  "SAU KHI RỜI: 3 giờ",
  "NỘI DUNG: Minh Quân ghé qua nhà Duy nhưng không gặp ai.",
  "MỨC HIỂN THỊ:"
);

export const VANG_MAT_KHONG_CO = dong(
  "KHONG CO SU KIEN"
);

export const VANG_MAT_RAC = dong(
  "Toi khong nghi co gi xay ra trong luc ban vang mat.",
  "Moi thu van nhu cu."
);
