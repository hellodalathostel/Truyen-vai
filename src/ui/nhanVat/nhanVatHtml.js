// Truyện Vai — Đợt 6b: chuỗi HTML của màn "Sửa nhân vật".
//
// Thuần: nhận dữ liệu, trả chuỗi. Không đọc DOM, không giữ trạng thái.
//
// Khối "Vai trong giao kèo (BDSM M/M)" có HAI dạng, và việc chọn dạng nào là quyết định
// của người gọi (`gkBat`): truyện đã bật giao kèo ⇒ mở sẵn; chưa bật ⇒ gấp lại kèm nút
// "Bật giao kèo cho truyện này" (nút đó đi qua cửa 18+, xem `index.js`).

import { esc, icon } from "../../dom.js";

export function htmlKhoiGiaoKeo({ gkBat, thichChips }) {
  const gkNoiDung =
    '<div class="grid-2">' +
      '<div><label class="field-label">Vai BDSM</label><select class="input" data-f="vaiBdsm">' +
        '<option value="">— chưa chọn —</option><option value="Dom">Dom — nắm quyền</option>' +
        '<option value="Sub">Sub — phục tùng</option><option value="Switch">Switch — đổi vai</option></select></div>' +
      '<div><label class="field-label">Cách gọi trong cảnh</label><input class="input" data-f="danhXung" placeholder="Ví dụ: gọi tôi là “chủ nhân”"></div>' +
    "</div>" +
    '<div class="grid-2">' +
      '<div><label class="field-label">Kinh nghiệm</label><select class="input" data-f="kinhNghiem">' +
        '<option value="">— chưa chọn —</option><option>Mới tập</option><option>Có kinh nghiệm</option>' +
        "<option>Dày dạn</option><option>Bậc thầy</option></select></div>" +
      '<div><label class="field-label">Phong cách</label><select class="input" data-f="phongCach">' +
        '<option value="">— chưa chọn —</option><option>Nghiêm khắc</option><option>Dịu dàng</option>' +
        "<option>Trêu chọc</option><option>Lạnh lùng</option><option>Bảo vệ</option><option>Thất thường</option></select></div>" +
    "</div>" +
    '<label class="field-label">Khẩu vị trong cảnh</label>' +
    '<textarea class="input" data-f="khauVi" rows="2" placeholder="Điều nhân vật thích: trói, mệnh lệnh, kiểm soát nhịp thở…"></textarea>' +
    '<label class="field-label">Điều nhân vật này đặc biệt thích</label>' +
    thichChips +
    '<label class="field-label">Giới hạn của nhân vật</label>' +
    '<textarea class="input" data-f="gioiHan" rows="2" placeholder="Điều nhân vật không chịu, kể cả khi người chơi muốn"></textarea>' +
    '<label class="field-label">Giới hạn cứng — tuyệt đối không làm</label>' +
    '<textarea class="input" data-f="gioiHanCung" rows="2" placeholder="Ví dụ: không gây chảy máu, không đụng vào mặt, không dùng lời về gia đình"></textarea>' +
    '<details class="gk-more"><summary>Mở rộng: luật riêng · chăm sóc sau · dấu hiệu riêng</summary>' +
      '<label class="field-label">Luật riêng nhân vật luôn giữ trong cảnh</label>' +
      '<textarea class="input" data-f="luatRieng" rows="2" placeholder="Ví dụ: không bao giờ để người chơi một mình khi còn bị trói"></textarea>' +
      '<label class="field-label">Cách nhân vật chăm sóc sau</label>' +
      '<textarea class="input" data-f="chamSocSau" rows="2" placeholder="Ví dụ: bôi thuốc, giữ thật lâu, nói rõ buổi này tốt ở chỗ nào"></textarea>' +
      '<label class="field-label">Dấu hiệu cho thấy nhân vật sắp quá sức</label>' +
      '<input class="input" data-f="tinHieuRieng" placeholder="Ví dụ: ngón tay gõ hai lần vào dây">' +
    "</details>";

  if (gkBat) {
    return '<div class="gk-char"><div class="gk-char-head">' + esc("⛓️ Vai trong giao kèo (BDSM M/M)") + "</div>" + gkNoiDung + "</div>";
  }
  return (
    '<div class="gk-char"><details data-gk-off>' +
      '<summary class="gk-char-head">' + esc("⛓️ Vai trong giao kèo (BDSM M/M) — truyện chưa bật giao kèo") + "</summary>" +
      '<div class="hint" data-gk-off-hint>Phần này chỉ được gửi cho AI khi truyện đã bật giao kèo. Điền trước cũng được — hoặc bật ngay:</div>' +
      '<button type="button" class="btn btn-sm" data-act="enable-giao-keo">' + icon("lock", 14) + " Bật giao kèo cho truyện này</button>" +
      '<div class="row-gap"></div>' + gkNoiDung + "</details></div>"
  );
}

export function htmlThan({ gkBat, thichChips, lienKetHtml, avatarHtml }) {
  return (
    '<div class="char-editor-top">' +
      '<div class="char-preview" data-preview>' + avatarHtml + "</div>" +
      '<div class="char-editor-fields">' +
        '<label class="field-label">Tên nhân vật</label><input class="input" data-f="ten" placeholder="Tên">' +
        '<label class="field-label">Vai trò</label><input class="input" data-f="vaiTro" placeholder="Ví dụ: Đối thủ, Người dẫn chuyện…">' +
      "</div>" +
    "</div>" +
    '<div class="avatar-controls">' +
      '<div class="seg">' +
        '<button class="seg-btn" data-av="chu">Chữ</button>' +
        '<button class="seg-btn" data-av="emoji">Biểu tượng</button>' +
        '<button class="seg-btn" data-av="anh">Ảnh</button>' +
      "</div>" +
      '<div class="avatar-extra" data-av-extra></div>' +
    "</div>" +
    '<label class="field-label">Mô tả (ngoại hình, xuất thân, hoàn cảnh)</label>' +
    '<textarea class="input" data-f="moTa" rows="3"></textarea>' +
    lienKetHtml +
    '<label class="field-label">Tính cách (gồm cả điểm yếu, mâu thuẫn nội tâm)</label>' +
    '<textarea class="input" data-f="tinhCach" rows="3"></textarea>' +
    '<label class="field-label">Cách nói / giọng điệu</label>' +
    '<textarea class="input" data-f="cachNoi" rows="2"></textarea>' +
    '<label class="field-label">Ghi chú thêm (bí mật, điều luôn đúng về nhân vật)</label>' +
    '<textarea class="input" data-f="ghiChu" rows="2"></textarea>' +
    '<div class="grid-2">' +
      '<div><label class="field-label">Tuổi</label><input class="input" data-f="tuoi" placeholder="Ví dụ: 29"></div>' +
      '<div><label class="field-label">Trạng thái</label>' +
        '<label class="lb-check" style="margin-top:0.5rem"><input type="checkbox" data-f="nguoiLon"> Người trưởng thành (18+)</label>' +
      "</div>" +
    "</div>" +
    htmlKhoiGiaoKeo({ gkBat, thichChips }) +
    '<label class="field-label">Bạn muốn nhân vật thế nào? (không bắt buộc — để trống thì AI tự sáng tạo)</label>' +
    '<textarea class="input" data-f="nvYeuCau" rows="2" placeholder="Ví dụ: một huấn luyện viên tàn nhẫn nhưng công bằng, từng là học viên của chính trại này"></textarea>' +
    '<div class="row-gap">' +
      '<button class="btn btn-sm" data-act="char-ai">' + icon("sparkle", 15) + " Tạo bằng AI</button>" +
      '<button class="btn btn-sm" data-act="char-avatar-ai">' + icon("image", 15) + " Tạo ảnh đại diện</button>" +
    "</div>" +
    '<div class="hint" data-status></div>' +
    '<div class="nv-opts" data-nv-opts></div>' +
    '<div class="suggest-list" data-suggest></div>'
  );
}

// Danh sách mẫu nhân vật ("bắt đầu từ một mẫu có sẵn"). Mẫu BDSM hiện riêng một nhóm để
// người dùng biết nó cần giao kèo mới dùng được.
export function htmlMauNhanVat(maus) {
  const thuong = maus.filter((t2) => !t2.vaiBdsm);
  const bdsm = maus.filter((t2) => t2.vaiBdsm);
  const nut = (t2) =>
    '<button type="button" class="mau-nv' + (t2.vaiBdsm ? " mau-nv-bdsm" : "") + '" data-mau-nv="' + esc(t2.id) + '" title="' + esc(t2.khauVi || t2.tinhCach || "") + '">' +
    '<span class="mau-nv-emoji">' + esc(t2.emoji || "✦") + "</span>" +
    '<span class="mau-nv-ten">' + esc(t2.ten) + "</span>" +
    '<span class="mau-nv-vai">' + esc(t2.vaiBdsm || t2.vaiTro || "") + "</span></button>";
  if (!maus.length) return "";
  return (
    '<div class="hint">Hoặc bắt đầu từ một mẫu có sẵn:</div><div class="mau-nv-row">' + thuong.map(nut).join("") + "</div>" +
    (bdsm.length
      ? '<div class="hint mau-nv-sub">Mẫu BDSM (cần bật giao kèo để AI dùng):</div><div class="mau-nv-row">' + bdsm.map(nut).join("") + "</div>"
      : "")
  );
}

