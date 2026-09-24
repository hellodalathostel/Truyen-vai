// Truyện Vai — Giai đoạn 6: các mảnh HTML của màn "Dựng ảnh cho cảnh này".
//
// Tách khỏi `index.js` để mỗi hàm chỉ lo MỘT khối giao diện, và để phần dựng chuỗi kiểm
// được ở tầng Node (chỉ dùng `esc`/`icon` của `dom.js` — thuần, không đụng `document`).
// KHÔNG hàm nào ở đây tự chạm vào DOM: nhận dữ liệu, trả chuỗi.

import { esc, icon } from "../../dom.js";
import { tenHoSo } from "../../ngoaiHinh.js";

// Thân hộp thoại. Khung xem trước KHÔNG ghép `dataUrl` vào chuỗi HTML: một bản ghi ảnh cũ
// nằm sẵn trong IndexedDB cũng là dữ liệu không đáng tin. Ảnh (kể cả ảnh đang sửa) được
// dựng bằng DOM ở `paintPreview()` của `index.js`.
export function htmlThan({ tinNhan, mayVe, pcs, kts }) {
  return (
    '<div class="anh-preview" data-preview><span class="anh-empty">Khung hình sẽ hiện ở đây</span></div>' +
    '<div class="hint anh-status" data-status></div>' +
    (tinNhan ? '<div class="anh-quote">' + esc(tinNhan.slice(0, 220)) + "</div>" : "") +
    '<label class="field-label">Mô tả khung hình (' + mayVe + " — máy vẽ đọc phần này)</label>" +
    '<div class="hint anh-prompt-note">Ô này CHỈ chứa mô tả cảnh. Ngoại hình cố định của nhân vật ' +
      "được ghép tự động vào cuối prompt lúc bấm “Dựng khung hình” — cứ viết thêm yêu cầu ở đây, không bị ghi đè.</div>" +
    '<textarea class="input" data-f="prompt" rows="5" placeholder="Đang đọc hội thoại để viết mô tả…"></textarea>' +
    '<div class="nh-pick" data-nh-pick></div>' +
    '<div class="anh-ngoai-hinh" data-nh-khoi hidden></div>' +
    '<label class="field-label">Yêu cầu thêm cho lần dựng này</label>' +
    '<input class="input" data-f="ghiChu" placeholder="Ví dụ: góc nhìn qua vai, trời đang mưa, cận cảnh bàn tay…">' +
    '<div class="grid-2">' +
      '<div><label class="field-label">Phong cách</label><select class="input" data-f="phongCach">' +
        pcs.map((p) => '<option value="' + esc(p.id) + '">' + esc((p.emoji ? p.emoji + " " : "") + p.ten) + "</option>").join("") +
      "</select></div>" +
      '<div><label class="field-label">Khung hình</label><select class="input" data-f="kichThuoc">' +
        kts.map((k) => '<option value="' + esc(k.id) + '">' + esc(k.ten) + "</option>").join("") +
      "</select></div>" +
    "</div>" +
    '<details class="anh-det"><summary>Nâng cao: những thứ cần loại trừ</summary>' +
      '<textarea class="input" data-f="loaiTru" rows="2"></textarea></details>'
  );
}

// Một chip hồ sơ. Hồ sơ của NGƯỜI CHƠI được đánh dấu riêng: cùng một hồ sơ có thể vừa là của
// một nhân vật vừa là của người chơi, nên nhãn này chỉ nói "hồ sơ này cũng là của bạn".
export function htmlChip({ h, on, cuaNguoiChoi }) {
  return (
    '<button type="button" class="nh-chip' + (on ? " on" : "") + '" data-nh-chip="' + esc(h.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
    '<span class="nh-chip-ten">' + esc(tenHoSo(h)) + "</span>" +
    (cuaNguoiChoi ? '<span class="nh-chip-nguoi">bạn</span>' : "") +
    (h.tuoi ? '<span class="nh-chip-tuoi">' + esc(h.tuoi) + "</span>" : "") +
    (on ? icon("check", 12) : "") +
    "</button>"
  );
}

// Khu "Nhân vật trong khung hình": chip đang hiện + nút "Chọn thêm" + hai dòng gợi ý.
export function htmlKhuChon({ dsHienThi, hoSoMap, chon, cuaNguoiChoi, trungTen }) {
  return (
    '<div class="nh-pick-head"><span class="nh-pick-title">Nhân vật trong khung hình</span>' +
      '<button type="button" class="btn btn-sm" data-nh-them>' + icon("plus", 13) + " Chọn thêm</button></div>" +
    (dsHienThi.length
      ? '<div class="nh-chips">' +
        dsHienThi.map((id) => htmlChip({ h: hoSoMap[id], on: chon.has(id), cuaNguoiChoi: cuaNguoiChoi.has(id) })).join("") +
        "</div>"
      : '<div class="hint">Chưa nhận diện được hồ sơ ngoại hình nào. Nhắc tên nhân vật trong mô tả, hoặc bấm “Chọn thêm”.</div>') +
    (trungTen.length
      ? '<div class="hint nh-trung">Tên trùng nhiều nhân vật (' + esc(trungTen.map((t) => t.ten).join(", ")) + ") — hãy tự chọn đúng người; app không tự đoán.</div>"
      : "") +
    '<div class="hint nh-pick-note">Ngoại hình cố định lấy từ hồ sơ đã duyệt. Trang phục, tư thế và biểu cảm lấy từ cảnh / yêu cầu của bạn — không lấy từ ảnh tham chiếu.</div>'
  );
}

// Khối ngoại hình cố định (chỉ đọc). Hồ sơ đã THỬ dịch nhưng vẫn chưa có bản tiếng Anh thì
// phải NÓI RA, đừng để người dùng tưởng prompt đã là tiếng Anh.
export function htmlKhoiNgoaiHinh({ khoi, thieuTen, mayVe }) {
  return (
    '<div class="nh-khoi-head">Ngoại hình cố định — ghép tự động vào cuối prompt khi dựng (' + mayVe + ")</div>" +
    '<div class="nh-khoi-body">' + esc(khoi) + "</div>" +
    (thieuTen.length
      ? '<div class="hint nh-khoi-thieu">Chưa dịch được sang ' + mayVe + ": " + esc(thieuTen.join(", ")) +
        " — khối trên vẫn dùng đúng chữ bạn đã gõ. Bấm “Dựng khung hình” để thử dịch lại.</div>"
      : "")
  );
}

// Danh sách hồ sơ còn lại trong hộp thoại "Chọn thêm hồ sơ ngoại hình".
export function htmlChonThem(dsHoSo) {
  return (
    '<div class="hint">Chọn hồ sơ để ghép ngoại hình vào khung hình này:</div>' +
    '<div class="nh-chips">' +
    dsHoSo.map((h) => '<button type="button" class="nh-chip" data-nh-add="' + esc(h.id) + '">' +
      '<span class="nh-chip-ten">' + esc(tenHoSo(h)) + "</span>" +
      (h.tuoi ? '<span class="nh-chip-tuoi">' + esc(h.tuoi) + "</span>" : "") + "</button>").join("") +
    "</div>"
  );
}

// Một nút ở chân màn (`.modal-foot`).
export function htmlNut(nut) {
  return (
    '<button class="btn btn-sm' + (nut.cls ? " " + nut.cls : "") + '" data-act2="' + nut.id + '"' +
    (nut.dis ? " disabled" : "") + ">" + icon(nut.icon, 14) + " " + esc(nut.nhan) + "</button>"
  );
}
