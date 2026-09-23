// Truyện Vai — mẫu kế hoạch cầu nối do mô hình trả về (chế độ Đạo diễn).

const NL = String.fromCharCode(10);
const dong = (...xs) => xs.join(NL);

export const KE_HOACH_DAY_DU = dong(
  "TRẠNG THÁI XUẤT PHÁT: Duy đang đứng ở cửa, tay còn cầm chìa khoá.",
  "MỤC TIÊU: Duy tin tưởng người chơi đủ để kể chuyện cũ.",
  "BƯỚC CHUYỂN:",
  "- Một buổi nói chuyện ngắn trong bếp",
  "- Một lần Duy giữ lời trước mặt người khác",
  "- Một lần Duy thú nhận chuyện cũ",
  "- Một lần Duy chủ động nhờ người chơi giúp",
  "- Bước thứ năm này phải bị cắt bỏ",
  "DẤU HIỆU: Duy chủ động nhắn tin trước.",
  "XUNG ĐỘT: KHONG CO",
  "ĐIỀU KIỆN ĐỔI HƯỚNG: Nếu người chơi phá lời hứa đã nói trong cảnh đầu."
);

export const KE_HOACH_RONG = dong(
  "TRẠNG THÁI XUẤT PHÁT: KHONG CO",
  "MỤC TIÊU: KHONG CO",
  "BƯỚC CHUYỂN: KHONG CO",
  "DẤU HIỆU: n/a",
  "XUNG ĐỘT: -",
  "ĐIỀU KIỆN ĐỔI HƯỚNG: none"
);

// Mô hình đổi thứ tự mục và bỏ dấu — bộ đọc phải chịu được.
export const KE_HOACH_DAO_THU_TU = dong(
  "MUC TIEU: Nguoi choi tin tuong Duy.",
  "TRANG THAI XUAT PHAT: Duy dang ngoi o ben tau.",
  "DIEU KIEN DOI HUONG: Khi Duy bi bo roi giua duong.",
  "BUOC CHUYEN:",
  "- buoc mot",
  "- buoc hai"
);
