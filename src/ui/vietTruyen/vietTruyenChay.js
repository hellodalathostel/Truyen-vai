// Truyện Vai — Giai đoạn 8 · Đợt 5: phần CHẠY của màn "Viết thành truyện".
//
// Ba việc của tệp này, tất cả đều là "chạm ra ngoài" (thứ logic thuần không được làm):
//   · VẼ vào modal: dựng lại thân màn, cập nhật riêng khối tiến độ, đẩy văn xuôi chạy dần vào thẻ
//     đang viết. Chuỗi HTML lấy từ `vietTruyenHtml.js`; ở đây chỉ đọc DOM.
//   · GỌI MODEL: hai hàm bọc `streamText` của `ai.js` (đúng dạng kết quả mà `vietTruyenFlow.js`
//     nhận qua tham số — nhờ vậy tầng Node chạy trọn một lượt với model giả).
//   · ÁP KẾT QUẢ của một lượt vào mục `truyenVietRa` + lưu tiến độ, kèm thông báo cho người dùng.

import { el, toast } from "../../dom.js";
import * as AI from "../../ai.js";
import { dsVietRa, noiDungDeXuat } from "./vietTruyenFlow.js";
import { htmlThan, htmlDem, htmlTienDo } from "./vietTruyenHtml.js";

// ---------------------------------------------------------------- vẽ vào modal
export function ctxCua(s) {
  return { ds: s.ds, loaiNguon: s.loaiNguon, tongDoan: s.tongDoan, chan: s.chan, chay: s.chay, tenHoiThoai: s.bangTen };
}
export function veThan(s) { s.body.innerHTML = htmlThan(ctxCua(s)); }

// Cập nhật TẠI CHỖ khi chỉ tiến độ đổi — không dựng lại cả màn (giữ vị trí cuộn của khối kết quả).
export function veDem(s) {
  const dem = s.body.querySelector("[data-vt-dem]");
  const td = s.body.querySelector("[data-vt-tien-do]");
  if (dem) dem.outerHTML = htmlDem(ctxCua(s));
  if (td) td.outerHTML = htmlTienDo(ctxCua(s));
}

// Văn xuôi chạy dần vào THẲNG thẻ đang viết. Gộp các mẩu chữ đến dồn dập (tối đa ~8 lần/giây); cuối
// mỗi lô vỏ màn vẽ lại từ dữ liệu nên không sợ sót mẩu cuối.
export function veVan(s, text) {
  const the = s.chay && s.body.querySelector('[data-vt-muc="' + s.chay.id + '"]');
  if (!the) return;
  const now = Date.now();
  if (now - (s.veLuc || 0) < 120) return;
  s.veLuc = now;
  let van = the.querySelector(".vt-van");
  if (!van) { van = el("div", { class: "vt-van" }); the.insertBefore(van, the.querySelector(".vt-loi")); }
  van.textContent = text;
  van.scrollTop = van.scrollHeight;
}

// ---------------------------------------------------------------- gọi model thật
// Đúng dạng `streamText` của `ai.js`: trả `{text, stopReason}`. `khiChunk` nhận phần chữ VỪA sinh
// thêm (đúng `data.textChunk` của plugin).
export function goiAI(prompt, khiChunk, loai) {
  const res = AI.streamText({ instruction: prompt, loai, onChunk: khiChunk ? (d) => khiChunk(d && d.textChunk) : undefined });
  return res.then((r) => ({ text: r && r.text, stopReason: r && r.stopReason }));
}
export function vietBangAI(prompt, khiChunk) { return goiAI(prompt, khiChunk, "viết thành truyện"); }
export function nenBangAI(prompt) { return goiAI(prompt, undefined, "viết thành truyện · nén phần đã viết"); }

// ---------------------------------------------------------------- áp kết quả một lượt
// Mục RỖNG thì bỏ hẳn (chưa có gì của người dùng); mục có chữ thì LUÔN giữ, kể cả khi lỗi hay dừng —
// người dùng vẫn xem và xuất được phần đã có. Lý do của lượt hỏng được hiện ngay trên khối nguồn
// (`.vt-chan`) để lần sau bấm nút là thấy, không phải mở lại màn.
export function ketThucLuot(s, muc, kq) {
  s.chay = null;
  s.dungYeuCau = false;
  const ds = Array.isArray(s.story.truyenVietRa) ? s.story.truyenVietRa : [];
  const coChu = noiDungDeXuat({ noiDung: kq.proseDaViet }) !== "";
  muc.noiDung = kq.proseDaViet || "";
  muc.trangThai = kq.trangThai === "loi" ? "loi" : "xong";
  muc.loiNeu = kq.trangThai === "loi" ? kq.loiNeu : "";
  if (kq.daDung) muc.daDung = true;
  if (!coChu) {
    s.story.truyenVietRa = ds.filter((m) => m.id !== muc.id);
    s.chan = muc.loiNeu || "Không viết được gì cho hội thoại này.";
    toast(s.chan, "error");
  } else if (kq.trangThai === "loi") {
    toast(muc.loiNeu, "error");
  } else if (kq.daDung) {
    toast("Đã dừng sau lô " + kq.soLoDaXong + "/" + kq.soLo + " — phần đã viết được giữ lại.");
  } else {
    toast("Đã viết xong " + kq.soLoDaXong + "/" + kq.soLo + " lô. Bản văn xuôi nằm ở khối dưới.");
  }
  s.ds = dsVietRa(s.story);
  veThan(s);
  s.D.henLuuVietTruyen(s.story);
}
