// Truyện Vai — Đợt 6c: CHUỖI HTML của màn "Sổ tri thức (lorebook)".
//
// Không quyết định gì: con số, nhãn, câu thông báo đều được tính ở `lorebookFlow.js` (thuần)
// hoặc đọc từ lõi. Ba khối dưới đây chép NGUYÊN từ `app.js` (Đợt 6c) — không sửa một ký tự.

import { esc, icon } from "../../dom.js";

// Thân modal.
export function htmlThan() {
  return (
    '<div class="hint lb-note">Sổ tri thức giữ những thông tin nền cố định (địa danh, tổ chức, nhân vật phụ, luật lệ…). ' +
      "AI <b>chỉ đọc</b> những mục có <b>từ khoá</b> xuất hiện trong bối cảnh truyện, tên hội thoại hoặc vài tin nhắn gần nhất — " +
      "nên bạn nạp cả một quyển cũng không tốn ngữ cảnh.</div>" +
    '<details class="lb-help"><summary>Định dạng file được nhận</summary><div>' +
      "File JSON theo chuẩn <b>World Info / SillyTavern</b>: <code>{ \"entries\": { \"0\": { \"key\": [\"từ khoá\"], \"content\": \"…\" } } }</code>, " +
      "dạng mảng <code>{ \"entries\": [ … ] }</code> (character book), sổ nằm trong thẻ nhân vật (<code>data.character_book</code>), hoặc một mục đơn lẻ. " +
      "Các trường được đọc: <code>key/keys</code>, <code>keysecondary/secondary_keys</code>, <code>content</code>, <code>comment/name</code>, " +
      "<code>constant</code>, <code>selective</code>, <code>disable</code>/<code>enabled</code>, <code>order/insertion_order</code>, " +
      "<code>caseSensitive</code>, <code>matchWholeWords</code>, <code>preventRecursion</code>, <code>scanDepth</code>. " +
      "Mục thiếu nội dung bị bỏ qua; mục thiếu từ khoá được nhập ở trạng thái tắt để bạn sửa sau." +
      '<div class="row-gap"><button class="btn btn-sm" data-lb-vidu>Xem ví dụ JSON</button></div>' +
    "</div></details>" +
    '<div class="lb-nhap">' +
      '<div class="row-gap">' +
        '<button class="btn btn-sm" data-lb-file>' + icon("upload", 14) + " Chọn file lorebook (.json)</button>" +
        '<button class="btn btn-sm" data-lb-them>' + icon("plus", 14) + " Thêm mục trống</button>" +
      "</div>" +
      '<label class="field-label">Hoặc dán JSON vào đây</label>' +
      '<textarea class="input" data-lb-json rows="3" spellcheck="false" placeholder=\'{ "entries": { "0": { "key": ["hội đồng"], "content": "Hội đồng gồm năm người…" } } }\'></textarea>' +
      '<div class="row-gap">' +
        '<button class="btn btn-sm btn-primary" data-lb-nhap-them>Thêm vào sổ</button>' +
        '<button class="btn btn-sm" data-lb-nhap-thay>Thay thế toàn bộ sổ</button>' +
      "</div>" +
    "</div>" +
    '<div class="lb-thongke" data-lb-thongke></div>' +
    '<div class="lb-list" data-lb-list></div>'
  );
}

// Một mục trong danh sách: tiêu đề, nhãn, từ khoá, đoạn nội dung rút gọn, và form sửa (ẩn).
export function htmlMuc(e, kb) {
  const khop = kb ? kb.get(e.id) : null;
  return (
    '<div class="lb-muc' + (e.bat ? "" : " off") + (khop ? " khop" : "") + '" data-lb-muc="' + esc(e.id) + '">' +
      '<div class="lb-muc-head">' +
        '<label class="lb-switch" title="Bật / tắt mục"><input type="checkbox" data-lb-bat="' + esc(e.id) + '"' + (e.bat ? " checked" : "") + "></label>" +
        '<span class="lb-muc-ten">' + esc(e.ghiChu) + "</span>" +
        (e.hangSo ? '<span class="lb-badge">cố định</span>' : "") +
        (e.chonLoc ? '<span class="lb-badge">cần khoá phụ</span>' : "") +
        (khop ? '<span class="lb-badge khop">đang khớp' + (khop.ly === "liên quan" ? " (kéo theo)" : "") + "</span>" : "") +
        '<span class="lb-muc-meta">' + (e.keys.length ? e.keys.length + " từ khoá" : "không từ khoá") + " · ưu tiên " + esc(String(e.thuTu)) + "</span>" +
        '<span class="lb-muc-nut">' +
          '<button class="btn btn-sm" data-lb-sua="' + esc(e.id) + '" title="Sửa mục">' + icon("edit", 12) + "</button>" +
          '<button class="btn btn-sm btn-danger" data-lb-xoa="' + esc(e.id) + '" title="Xoá mục">' + icon("trash", 12) + "</button>" +
        "</span>" +
      "</div>" +
      (e.keys.length ? '<div class="lb-keys">' + e.keys.map((k) => '<span class="lb-key">' + esc(k) + "</span>").join("") + "</div>" : "") +
      '<div class="lb-noi">' + esc(e.noiDung.slice(0, 240)) + (e.noiDung.length > 240 ? "…" : "") + "</div>" +
      htmlForm(e) +
    "</div>"
  );
}

// Form sửa của một mục (ẩn cho tới khi bấm bút chì).
export function htmlForm(e) {
  const ck = (k, nhan) => '<label class="lb-check"><input type="checkbox" data-lb-f="' + k + '"' + (e[k] ? " checked" : "") + "> " + nhan + "</label>";
  return (
    '<div class="lb-form" hidden>' +
      '<label class="field-label">Tên mục (chỉ để bạn nhận ra — không gửi cho AI)</label>' +
      '<input class="input" data-lb-f="ghiChu" value="' + esc(e.ghiChu) + '">' +
      '<label class="field-label">Từ khoá — cách nhau bằng dấu phẩy</label>' +
      '<input class="input" data-lb-f="keys" value="' + esc(e.keys.join(", ")) + '" placeholder="ví dụ: hội đồng, năm người">' +
      '<label class="field-label">Từ khoá phụ (chỉ dùng khi bật “cần khoá phụ”)</label>' +
      '<input class="input" data-lb-f="keys2" value="' + esc(e.keys2.join(", ")) + '" placeholder="ví dụ: quyền lực, bỏ phiếu">' +
      '<label class="field-label">Nội dung gửi cho AI khi mục này khớp</label>' +
      '<textarea class="input" data-lb-f="noiDung" rows="5">' + esc(e.noiDung) + "</textarea>" +
      '<div class="grid-2">' +
        '<div><label class="field-label">Ưu tiên (số nhỏ xếp trước)</label>' +
        '<input class="input" data-lb-f="thuTu" type="number" value="' + esc(String(e.thuTu)) + '"></div>' +
        '<div><label class="field-label">Số tin nhắn để dò (0 = mặc định)</label>' +
        '<input class="input" data-lb-f="doSau" type="number" min="0" value="' + esc(String(e.doSau)) + '"></div>' +
      "</div>" +
      '<div class="lb-checks">' +
        ck("hangSo", "Luôn gửi") +
        ck("chonLoc", "Cần khoá phụ") +
        ck("phanBietHoa", "Phân biệt hoa/thường") +
        ck("khopTronTu", "Khớp trọn từ") +
        ck("khongDeQuy", "Không cho kéo theo") +
      "</div>" +
      '<div class="row-gap">' +
        '<button class="btn btn-sm btn-primary" data-lb-luu="' + esc(e.id) + '">' + icon("check", 13) + " Lưu mục</button>" +
        '<button class="btn btn-sm" data-lb-dong="' + esc(e.id) + '">Đóng</button>' +
      "</div>" +
    "</div>"
  );
}

// Danh sách trống.
export function htmlTrong() {
  return '<div class="hint">Chưa có mục nào. Nạp một file lorebook, dán JSON, hoặc bấm “Thêm mục trống” để tự viết.</div>';
}

// Dòng thống kê trên đầu sổ: số mục, số đang bật, số đang khớp với hội thoại này (nếu có),
// và tên sổ (nếu file lorebook có đặt).
export function htmlThongKe({ n, bat, khop, coConv, ten }) {
  return (
    "<b>" + n + "</b> mục · <b>" + bat + "</b> đang bật" +
    (coConv ? ' · <b class="lb-khop-num">' + khop + "</b> đang khớp với hội thoại này" : "") +
    (ten ? " · " + esc(ten) : "")
  );
}
