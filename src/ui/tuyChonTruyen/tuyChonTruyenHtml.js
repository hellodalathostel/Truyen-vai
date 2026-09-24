// Truyện Vai — Đợt 6c: CHUỖI HTML của màn "Tuỳ chọn truyện".
//
// Không quyết định gì: mọi giá trị đã được tính ở `tuyChonTruyenFlow.js` (thuần) hoặc đọc từ
// lõi, rồi truyền vào đây. Nhãn hai nút Giao kèo / Sổ tri thức lấy từ Flow để câu chữ chỉ có
// MỘT nguồn.
//
// Phần lớn nội dung dưới đây là chuỗi chép nguyên từ `app.js` (Đợt 6c) — không sửa một ký tự,
// vì "tách hàm = không đổi hành vi" phải chứng minh được bằng so ký tự.

import { esc, icon } from "../../dom.js";
import { dsNgoaiHinh, giaoKeoOf } from "../../store.js";
import { tenHoSo, moTaNguoiDung } from "../../ngoaiHinh.js";
import { loreCua } from "../../lore.js";
import * as TS from "../../trangThai.js";
import { CHE_DO, khoangText } from "../../thoiGian.js";
import { nhanNutGiaoKeo, nhanNutLorebook } from "./tuyChonTruyenFlow.js";

// Toàn bộ thân modal, TRỪ khối liên kết hồ sơ ngoại hình của người chơi (khối đó được vẽ lại
// riêng mỗi khi thư viện đổi — xem `tuyChonTruyenLink.js`).
export function htmlThan({ story, tgv, nguongChon }) {
  return (
    '<label class="field-label">Tên cốt truyện</label><input class="input" data-f="ten">' +
    '<label class="field-label">Biểu tượng</label><input class="input" data-f="emoji" maxlength="4">' +
    '<label class="field-label">Bối cảnh</label><textarea class="input" data-f="boiCanh" rows="4"></textarea>' +
    '<label class="field-label">Tên nhân vật của bạn (người chơi)</label><input class="input" data-f="nguoiChoiTen">' +
    '<label class="field-label">Mô tả bạn trong truyện</label><textarea class="input" data-f="nguoiChoiMoTa" rows="2"></textarea>' +
    '<div class="nh-link" data-nc-link>' +
      '<div class="gk-char-head">' + esc("🧬 Hồ sơ ngoại hình của bạn (người chơi)") + "</div>" +
      '<label class="field-label">Liên kết hồ sơ ngoại hình cho bạn</label>' +
      '<select class="input" data-f="nguoiChoiNgoaiHinhId"><option value="">— không liên kết —</option>' +
        dsNgoaiHinh().map((x) => '<option value="' + esc(x.id) + '">' + esc(tenHoSo(x)) + (x.tuoi ? " (" + esc(x.tuoi) + " tuổi)" : "") + "</option>").join("") +
      "</select>" +
      '<div class="hint">Hồ sơ quyết định ngoại hình <b>CỐ ĐỊNH</b> của bạn trong khung hình — dùng chung một thư viện ' +
        "với nhân vật, không phải thông tin riêng của truyện này. Bỏ liên kết thì ảnh có bạn sẽ chỉ dùng phần mô tả ở trên.</div>" +
      '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="open-ngoai-hinh">' + icon("users", 14) + " Thư viện ngoại hình</button></div>" +
      '<div class="nh-link-info" data-nc-link-info></div>' +
    "</div>" +
    '<label class="field-label">Cách dựng truyện</label>' +
    '<select class="input" data-f="mode">' +
      '<option value="chuong">Một cốt truyện, nhiều chương</option>' +
      '<option value="songSong">Nhiều hội thoại theo cốt truyện</option>' +
    "</select>" +
    '<label class="field-label">Nhịp phát triển (nội tâm & quan hệ)</label>' +
    '<select class="input" data-f="nhip">' +
      TS.NHIP.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.ten + " — " + x.moTa) + "</option>").join("") +
    "</select>" +
    '<label class="field-label">Chế độ Đạo diễn</label>' +
    '<select class="input" data-f="daoDien">' +
      '<option value="0">Tắt</option>' +
      '<option value="1">Bật — xem trạng thái ẩn, đính chính, đặt hướng tương lai</option>' +
    "</select>" +
    '<div class="row-gap"><button class="btn btn-sm" data-act="open-dao-dien">' + icon("clapper", 14) + " Mở màn Đạo diễn</button></div>" +
    '<div class="hint">Tắt chỉ ẩn phần hiển thị — không xoá đính chính hay hướng nào. Hướng chỉ ngừng được bơm vào prompt khi bạn bấm <b>Tạm dừng</b> hoặc <b>Huỷ hướng</b>.</div>' +
    '<label class="field-label">Thời gian khi rời app</label>' +
    '<select class="input" data-f="vgCheDo">' +
      CHE_DO.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.ten + " — " + x.moTa) + "</option>").join("") +
    "</select>" +
    '<label class="field-label">Ngưỡng xử lý</label>' +
    '<select class="input" data-f="vgNguong">' +
      nguongChon.map((p) => '<option value="' + p + '">' + esc(khoangText(p)) + "</option>").join("") +
      '<option value="0">Tắt — không mô phỏng gì</option>' +
    "</select>" +
    '<label class="field-label">Tương tác chủ động</label>' +
    '<select class="input" data-f="vgChuDong">' +
      '<option value="1">Bật — nhân vật có lý do có thể chủ động liên lạc</option>' +
      '<option value="0">Tắt — chỉ diễn biến ngoài màn hình</option>' +
    "</select>" +
    '<div class="hint">Perchance không chạy khi tab đóng; diễn biến được mô phỏng khi bạn quay lại. Mỗi lần quay lại tối đa <b>3 sự kiện cho cả truyện</b>, và <b>không mô phỏng</b> khi còn cảnh đang dang dở.</div>' +
    '<label class="field-label">Giao kèo trao đổi quyền lực (BDSM M/M)</label>' +
    '<button class="btn btn-sm" data-act="open-giao-keo">' + icon("lock", 14) + " " +
      nhanNutGiaoKeo(giaoKeoOf(story).bat) + "</button>" +
    '<label class="field-label">Sổ tri thức (lorebook)</label>' +
    '<button class="btn btn-sm" data-act="open-lorebook">' + icon("book", 14) + " " +
      nhanNutLorebook(loreCua(story).entries.length) + "</button>" +
    '<div class="row-gap">' +
      '<button class="btn btn-sm" data-act="export-story">' + icon("download", 14) + " Xuất truyện</button>" +
      '<button class="btn btn-sm" data-act="import-story">' + icon("upload", 14) + " Nhập truyện</button>" +
      '<button class="btn btn-sm btn-danger" data-act="delete-story">' + icon("trash", 14) + " Xoá truyện</button>" +
    "</div>"
  );
}

// Danh sách <option> của thư viện ngoại hình (dùng cho cả lúc dựng form lẫn lúc vẽ lại).
export function htmlHoSoOptions() {
  return (
    '<option value="">— không liên kết —</option>' +
    dsNgoaiHinh().map((x) => '<option value="' + esc(x.id) + '">' + esc(tenHoSo(x)) + (x.tuoi ? " (" + esc(x.tuoi) + " tuổi)" : "") + "</option>").join("")
  );
}

// Khối tóm tắt khi CHƯA liên kết hồ sơ nào.
export function htmlNcChuaLienKet({ tenNc }) {
  return  '<div class="hint">Chưa liên kết: khung hình có bạn sẽ chỉ dùng mô tả “' + esc(tenNc) + "” ở trên.</div>";
}

// Khối tóm tắt khi ĐANG liên kết: số người dùng, mô tả rút gọn, cảnh báo lệch tên, nút sửa hồ sơ.
export function htmlNcThongTin({ h, tenNc, demHien, lech }) {
  return (
      '<div class="hint">Đang liên kết <b>' + esc(tenHoSo(h)) + "</b>" + (h.tuoi ? " · " + esc(h.tuoi) + " tuổi" : "") +
      (h.anh ? " · có ảnh tham chiếu" : "") + ". Hồ sơ này đang được dùng bởi " +
      esc(moTaNguoiDung(demHien) || "chưa ai") + ".</div>" +
      '<div class="nh-info-mota">' + esc((h.moTa || "Chưa có mô tả ngoại hình.").slice(0, 220)) + "</div>" +
      (h.tranh ? '<div class="nh-info-tranh">Tránh: ' + esc(h.tranh.slice(0, 160)) + "</div>" : "") +
      (lech
        ? '<div class="nh-info-lech">Bạn đang tên “' + esc(tenNc) + '”, khác tên chính của hồ sơ (“' + esc(h.tenChinh) +
          '”). Hồ sơ vẫn nhận diện được cả hai tên khi tạo ảnh. Nếu muốn dùng đúng tên hồ sơ thì bấm nút dưới — nút chỉ ' +
          "điền vào ô tên (chưa lưu), tin nhắn cũ <b>không</b> bị sửa.</div>" +
          '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="dong-ten-nguoi-choi">' +
          icon("check", 13) + " Dùng tên chính của hồ sơ</button></div>"
        : "") +
      '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="sua-ngoai-hinh" data-id="' + esc(h.id) + '">' +
      icon("edit", 13) + " Sửa hồ sơ</button></div>"
  );
}
