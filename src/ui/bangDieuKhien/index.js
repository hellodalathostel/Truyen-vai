// Màn "Bảng điều khiển" (dashboard) — VỎ (Đợt 6d).
//
// Cả màn chỉ DỰNG CHUỖI HTML rồi ghép lại, nên vỏ này chỉ có một việc: nối app với thân màn. Câu
// chữ suy ra từ dữ liệu nằm ở `bangDieuKhienFlow.js`; chuỗi HTML nằm ở `bangDieuKhienHtml.js`;
// những gì cần app cung cấp (vẽ avatar, thẻ tuyến hội thoại, khung ảnh, thanh quay lại, tên
// người chơi) đi qua bảng phụ thuộc của app.
//
// Điểm KHÔNG được đổi: `renderDashboard` vẫn nhận ĐÚNG một tham số truyện — mọi chỗ gọi trong
// app.js gọi đúng như vậy (bảng phụ thuộc là tham số thứ hai, do app tự buộc vào).
import { htmlDashboard } from "./bangDieuKhienHtml.js";

export function renderDashboard(story, D) {
  return htmlDashboard(story, D);
}
