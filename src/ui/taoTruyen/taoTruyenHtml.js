// Truyện Vai — Đợt 6b: chuỗi HTML của màn "Cốt truyện mới".
//
// Thuần: nhận dữ liệu, trả chuỗi. Không đọc DOM, không giữ trạng thái. Nhờ vậy phần quyết
// định (`taoTruyenFlow.js`) và phần hiển thị (ở đây) tách hẳn khỏi phần bấm nút (index.js).

import { esc, icon } from "../../dom.js";

function htmlCachTao() {
  return (
    '<div class="cach-tao">' +
    '<button type="button" class="create-method-btn on" data-cach="nhanh">' + icon("sparkle", 15) + " Tạo nhanh bằng một prompt</button>" +
    '<button type="button" class="create-method-btn" data-cach="nangcao">' + icon("sliders", 15) + " Thiết lập nâng cao</button>" +
    "</div>"
  );
}

// Bước 4 nhận sẵn HTML khối giao kèo (khối đó thuộc tính năng giao kèo, không thuộc màn này).
export function htmlWizard({ modes, theLoais, giaoKeoHtml }) {
  return (
    '<div class="wizard-block"><div class="wizard-label">Bước 1 · Chọn cách dựng truyện</div>' +
      '<div class="mode-cards">' +
        modes.map((m, i) =>
          '<button class="mode-card' + (i === 0 ? " on" : "") + '" data-mode="' + esc(m.id) + '">' +
            '<div class="mode-emoji">' + esc(m.emoji) + "</div>" +
            '<div class="mode-name">' + esc(m.ten) + "</div>" +
            '<div class="mode-desc">' + esc(m.moTa) + "</div>" +
            "<ul class='mode-list'>" + m.diem.map((d) => "<li>" + esc(d) + "</li>").join("") + "</ul>" +
          "</button>").join("") +
      "</div></div>" +
    '<div class="wizard-block"><div class="wizard-label">Bước 2 · Thông tin cơ bản</div>' +
      '<label class="field-label">Tên cốt truyện</label>' +
      '<input class="input" data-f="ten" placeholder="Ví dụ: Đêm dài ở Tân Sài Gòn">' +
      '<label class="field-label">Thể loại</label>' +
      '<select class="input" data-f="theLoai">' + theLoais.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.emoji + " " + t.ten) + "</option>").join("") + "</select>" +
      '<label class="field-label">Ý tưởng ngắn (không bắt buộc)</label>' +
      '<input class="input" data-f="moTa" placeholder="Một câu về điều bạn muốn trải nghiệm">' +
      '<label class="field-label">Tên nhân vật của bạn (người chơi)</label>' +
      '<input class="input" data-f="nguoiChoiTen" placeholder="Bạn" value="">' +
      '<label class="field-label">Mô tả bạn trong truyện (không bắt buộc)</label>' +
      '<input class="input" data-f="nguoiChoiMoTa" placeholder="Ví dụ: 22 tuổi, thợ sửa chip, hay mất ngủ">' +
    "</div>" +
    '<div class="wizard-block"><div class="wizard-label">Bước 3 · Bối cảnh thế giới</div>' +
      '<textarea class="input" data-f="boiCanh" rows="5" placeholder="Không gian, thời gian, tình hình hiện tại…"></textarea>' +
      '<div class="row-gap"><button class="btn btn-sm" data-act="wiz-suggest">' + icon("sparkle", 15) + " Nhờ AI viết bối cảnh</button>" +
      '<button class="btn btn-sm" data-act="wiz-character">' + icon("sparkle", 15) + " Nhân vật đầu tiên bằng AI</button></div>" +
      '<div class="hint" data-wiz-status></div>' +
      '<div class="nv-opts" data-nv-opts></div>' +
    "</div>" +
    '<div class="wizard-block"><div class="wizard-label">Bước 4 · Giao kèo (không bắt buộc)</div>' +
      giaoKeoHtml +
    "</div>"
  );
}

export function htmlNhanh({ theLoais }) {
  return (
    '<div class="wizard-block">' +
      '<div class="wizard-label">Một đoạn mô tả — AI dựng cả bản nháp</div>' +
      '<textarea class="input" data-f="qcYTuong" rows="4" placeholder="Ví dụ: một kiểm lâm ở khu bảo tồn biệt lập, và người mới đến phá vỡ mọi nếp cũ…"></textarea>' +
      '<div class="qc-hang">' +
        '<div><label class="field-label">Thể loại</label><select class="input" data-f="qcTheLoai">' +
          theLoais.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.emoji + " " + t.ten) + "</option>").join("") +
        "</select></div>" +
        '<div><label class="field-label">Số nhân vật</label><select class="input" data-f="qcSoNv">' +
          [1, 2, 3, 4, 5].map((n) => '<option value="' + n + '"' + (n === 3 ? " selected" : "") + ">" + n + "</option>").join("") +
        "</select></div>" +
      "</div>" +
      '<label class="lb-check"><input type="checkbox" data-f="qcbdsm"> Truyện có giao kèo (BDSM M/M, người lớn)</label>' +
      '<div class="row-gap">' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="qc-dung">' + icon("sparkle", 15) + " Dựng bản nháp</button>" +
        '<span class="hint" data-qc-status></span>' +
      "</div>" +
      '<div class="qc-kq" data-qc-kq></div>' +
    "</div>"
  );
}

export function htmlThan({ modes, theLoais, giaoKeoHtml }) {
  return (
    htmlCachTao() +
    '<div data-pane="nhanh">' + htmlNhanh({ theLoais }) + "</div>" +
    '<div data-pane="nangcao" hidden>' + htmlWizard({ modes, theLoais, giaoKeoHtml }) + "</div>"
  );
}

function qcInp(nhan, f, v) {
  return '<label class="field-label">' + esc(nhan) + '</label><input class="input" data-qc-f="' + f + '" value="' + esc(v || "") + '">';
}

function qcArea(nhan, f, v, rows) {
  return '<label class="field-label">' + esc(nhan) + '</label><textarea class="input" data-qc-f="' + f + '" rows="' + (rows || 3) + '">' + esc(v || "") + "</textarea>";
}

// Bản nháp AI trả về được đổ thành form để người dùng sửa tay trước khi tạo truyện.
export function htmlBanNhap(q) {
  return (
    '<div class="qc-the">' + icon("check", 14) + " Bản nháp — sửa lại tuỳ ý rồi bấm “Tạo cốt truyện”</div>" +
    qcInp("Tên truyện", "ten", q.ten) +
    qcInp("Mô tả ngắn", "moTa", q.moTa) +
    qcArea("Bối cảnh", "boiCanh", q.boiCanh, 7) +
    qcArea("Luật thế giới", "luat", q.luat, 4) +
    qcInp("Tên nhân vật của bạn", "nguoiChoiTen", q.nguoiChoiTen || "Bạn") +
    qcArea("Bạn trong truyện", "nguoiChoiMoTa", q.nguoiChoiMoTa, 2) +
    qcInp("Mục tiêu chương 1", "mucTieu", q.mucTieu) +
    '<div class="wizard-label qc-nv-label">' + (q.nhanVats || []).length + " nhân vật</div>" +
    '<div class="qc-nv-list">' +
      (q.nhanVats || [])
        .map(
          (c, i) =>
            '<div class="qc-nv" data-qc-nv="' + i + '">' +
              '<div class="qc-nv-hang">' +
                '<input class="input" data-qc-nv-f="ten" placeholder="Tên" value="' + esc(c.ten || "") + '">' +
                '<input class="input" data-qc-nv-f="vaiTro" placeholder="Vai trò" value="' + esc(c.vaiTro || "") + '">' +
              "</div>" +
              '<textarea class="input" data-qc-nv-f="moTa" rows="2" placeholder="Mô tả">' + esc(c.moTa || "") + "</textarea>" +
              '<textarea class="input" data-qc-nv-f="tinhCach" rows="2" placeholder="Tính cách">' + esc(c.tinhCach || "") + "</textarea>" +
            "</div>"
        )
        .join("") +
    "</div>"
  );
}
