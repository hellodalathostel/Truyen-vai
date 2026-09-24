// Màn "Sửa hồ sơ ngoại hình" — CHUỖI HTML của form (Đợt 6d).
//
// Tệp này chỉ ghép chuỗi: không đọc DOM, không ghi dữ liệu. Câu chữ nào suy ra từ dữ liệu nằm ở
// `suaNgoaiHinhFlow.js`; ở đây chỉ còn những chuỗi CỐ ĐỊNH của form (nhãn ô, gợi ý, khối AI).
import { esc, icon } from "../../dom.js";
import { cauGhiChuDungChung, nhanNutAnh } from "./suaNgoaiHinhFlow.js";

export function htmlForm(laMoi, soLienKet, coAnh) {
  return (
    (laMoi ? "" : cauGhiChuDungChung(soLienKet)) +
    '<label class="field-label">Tên chính</label>' +
    '<input class="input" data-f="nhTen" placeholder="Tên dùng chung cho hồ sơ này">' +
    '<label class="field-label">Tuổi (bạn khai báo — để trống nếu không muốn ghi)</label>' +
    '<input class="input" data-f="nhTuoi" inputmode="numeric" placeholder="Ví dụ: 29">' +
    '<label class="field-label">Mô tả ngoại hình</label>' +
    '<textarea class="input" data-f="nhMoTa" rows="5" placeholder="Gương mặt, tóc, da, chiều cao, vóc dáng, tỉ lệ cơ thể, dấu hiệu nhận diện như hình xăm hoặc sẹo…"></textarea>' +
    '<label class="field-label">Đặc điểm cần tránh khi tạo ảnh</label>' +
    '<textarea class="input" data-f="nhTranh" rows="2" placeholder="Ví dụ: không râu, tóc không dài, không đeo kính…"></textarea>' +
    '<div class="nh-anh-hang">' +
      '<div class="nh-anh-side">' +
        '<button class="btn btn-sm" data-nh-act="nh-chon-anh">' + icon("image", 14) + nhanNutAnh(coAnh) + "</button>" +
        '<button class="btn btn-sm btn-danger" data-nh-act="nh-xoa-anh"' + (coAnh ? "" : " hidden") + ">" + icon("trash", 13) + " Bỏ ảnh</button>" +
      "</div>" +
      '<div class="nh-anh-box" data-nh-anh-box></div>' +
    "</div>" +
    '<div class="hint nh-anh-note">Ảnh tham chiếu chỉ dùng để AI phân tích thành <b>mô tả</b> — máy vẽ ảnh của Perchance hiện ' +
      "chỉ nhận prompt chữ, nên ảnh <b>không</b> được gửi trực tiếp vào máy vẽ và app không bảo đảm giữ nguyên khuôn mặt.</div>" +
    // Phần AI nằm trong <details> để form chính vẫn gọn (tên · tuổi · mô tả · cần tránh ·
    // khu vực ảnh) đúng như thiết kế; ai cần thì mở ra. Lối vào "Tạo từ mô tả / ảnh" từ
    // thư viện sẽ tự mở sẵn.
    '<details class="gk-more nh-ai" data-nh-ai>' +
      '<summary>' + esc("Tạo hồ sơ bằng AI (từ mô tả và/hoặc ảnh)") + "</summary>" +
      '<label class="field-label">Mô tả tự do (và/hoặc đính kèm ảnh ở trên)</label>' +
      '<textarea class="input" data-f="nhYeuCau" rows="3" placeholder="Ví dụ: nam 30 tuổi, cao, tóc đen ngắn, sẹo nhỏ trên mày trái, da ngăm…"></textarea>' +
      '<div class="row-gap"><button class="btn btn-sm btn-primary" data-nh-act="nh-ban-nhap">' + icon("sparkle", 15) + " Tạo hồ sơ từ mô tả / ảnh</button></div>" +
      '<div class="hint nh-anh-note" data-nh-canhbao></div>' +
    "</details>" +
    '<div class="hint nh-status" data-nh-status></div>'
  );
}
