// Truyện Vai — Giai đoạn 8 · Đợt 4: màn "Viết thành truyện" (VỎ ≤ 150 dòng).
//
// Ba mảnh: `vietTruyenFlow.js` — quyết định THUẦN (xong ở đợt 1–3) · `vietTruyenHtml.js` — chuỗi HTML
// của ba khối, kèm khối "GIẢ" (dữ liệu mẫu để kiểm bố cục) · tệp này — dựng modal, giữ trạng thái
// màn, xuất hàm xử lý cho bảng sự kiện.
//
// ĐỢT 4 CHƯA NỐI LUỒNG GỌI AI THẬT: mọi thứ GIẢ nằm ở khối tên "GIẢ" trong `vietTruyenHtml.js` và bị
// xoá ở đợt 5. Riêng phần ĐẾM là thật — số đoạn nguồn và số lô tính bằng hàm thuần của Flow trên
// chính hội thoại đang mở. Không tự gắn listener: `data-act` nằm ở `src/ui/suKien/vietTruyen.js`;
// điểm đăng ký sự kiện toàn cục DUY NHẤT vẫn là `bindGlobalEvents` (luật §7.3).

import { el, modal, toast } from "../../dom.js";
import { getMessages } from "../../store.js";
import * as AI from "../../ai.js";
import { LOAI_NGUON, layNguonVietTruyen, chiaLoNguon, gioiHanKyTuChoLo, kiemVietTruyenTruocKhiChay } from "./vietTruyenFlow.js";
import { htmlThan, htmlDem, htmlTienDo, tenTepMd, mucGia, TOC_GIA, VAN_GIA_MOI } from "./vietTruyenHtml.js";

let S = null; // màn đang mở — mỗi lúc một màn, chống mở hai lần bằng lớp `.vt-modal`

// Nguồn THẬT của nguồn đang chọn, và số lô THẬT mà lượt tới sẽ chia (đợt 4 chưa gọi AI).
function nguonCua(s) { return layNguonVietTruyen(s.story, s.conv.id, s.loaiNguon, getMessages(s.conv.id)); }
function soLo(nguon) {
  return chiaLoNguon(nguon, gioiHanKyTuChoLo(AI.countTokens, AI.idealMaxTokens, nguon.join("\n\n"))).length || 1;
}
function ctxCua(s) { return { ds: s.ds, loaiNguon: s.loaiNguon, tongDoan: s.tongDoan, chan: s.chan, chay: s.chay, tenHoiThoai: s.bangTen }; }
function veThan(s) { s.body.innerHTML = htmlThan(ctxCua(s)); }
// Cập nhật TẠI CHỖ khi chỉ tiến độ đổi — không dựng lại cả màn (giữ vị trí cuộn khối kết quả).
function veDem(s) {
  const dem = s.body.querySelector("[data-vt-dem]");
  const td = s.body.querySelector("[data-vt-tien-do]");
  if (dem) dem.outerHTML = htmlDem(ctxCua(s));
  if (td) td.outerHTML = htmlTienDo(ctxCua(s));
}
function mucTrong(s, id) { return s.ds.find((m) => m.id === id) || null; }

export function openVietTruyen(D) {
  const story = D.currentStory();
  if (!story || document.querySelector(".vt-modal")) return;
  const conv = D.currentConv() || (story.hoiThoais || []).slice().sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0))[0] || null;
  if (!conv) { toast("Chưa có hội thoại nào để viết thành truyện.", "error"); return; }
  const bangTen = {};
  for (const c of story.hoiThoais || []) bangTen[c.id] = c.tieuDe;
  const s = {
    D, story, conv, bangTen, ds: mucGia(conv.id),
    loaiNguon: "tho", nguon: [], tongDoan: 0, dem: 0, chay: null,
    chan: String((kiemVietTruyenTruocKhiChay(story) || {}).loiNeu || ""),
  };
  S = s;
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  // Mở màn ở trạng thái NGHỈ: nút chính là "Viết thành truyện", khối tiến độ ẩn. Lượt chạy (GIẢ) chỉ
  // sinh ra khi bấm nút — đúng luồng sẽ nối ở đợt 5. `s.ds` vẫn có sẵn mục mẫu ở cả ba trạng thái để
  // nhìn thấy ngay ba kiểu thẻ (đang viết / đã xong / lỗi).
  s.body = el("div", { class: "vt-modal" });
  modal({
    title: "Viết thành truyện",
    subtitle: "Từ hội thoại đã nhập vai, viết lại thành văn xuôi kể chuyện — dữ liệu dẫn xuất, không sửa bản nhập vai.",
    wide: true,
    body: s.body,
    onClose: () => { if (S === s) { if (s.chay && s.chay.hen) clearTimeout(s.chay.hen); S = null; } },
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });
  veThan(s);
}

// data-act="vt-chay" — đợt 4 chạy lượt GIẢ: đếm đủ số lô rồi đánh dấu "xong".
export function bamVietTruyen() {
  const s = S;
  if (!s || !s.body.isConnected || s.chay) return;
  if (s.chan) { toast(s.chan, "error"); return; }
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  if (!s.tongDoan) { toast("Hội thoại này chưa có đoạn nguồn nào để viết.", "error"); return; }
  const muc = { id: "vt_gia_moi_" + (s.dem += 1), hoiThoaiId: s.conv.id, loaiNguon: s.loaiNguon, taoLuc: Date.now(), trangThai: "dangChay", noiDung: "", loiNeu: "" };
  s.ds.unshift(muc);
  s.chay = { id: muc.id, lo: 0, tongLo: soLo(s.nguon), daDoc: 0, tongDoan: s.tongDoan, ten: s.conv.tieuDe, dang: true, hen: null };
  veThan(s);
  henLo(s, muc, s.chay);
}

// Một "lô" giả: nhích tiến độ rồi hẹn lô kế; đủ lô thì gắn văn mẫu và đánh dấu "xong".
function henLo(s, muc, c) {
  c.hen = setTimeout(() => {
    if (S !== s || !s.body.isConnected || s.chay !== c) return;
    c.lo += 1;
    c.daDoc = Math.round((c.tongDoan * c.lo) / c.tongLo);
    if (c.lo < c.tongLo) { veDem(s); return; }
    muc.trangThai = "xong";
    muc.noiDung = VAN_GIA_MOI;
    s.chay = null;
    veThan(s);
    toast("Đã viết xong — bản GIẢ của đợt 4; luồng gọi AI thật nối ở đợt 5.");
  }, TOC_GIA);
}

// data-act="vt-dung" — dừng NGAY giữa lúc chạy. Cách xử lý phần đã viết là việc của đợt 5.
export function dungVietTruyen() {
  const s = S;
  if (!s || !s.chay) return;
  if (s.chay.hen) clearTimeout(s.chay.hen);
  const id = s.chay.id;
  s.chay = null;
  s.ds = s.ds.filter((m) => m.id !== id);
  veThan(s);
  toast("Đã dừng. Bản đang viết dở đã bỏ.");
}

// data-act="vt-nguon" — đổi nguồn; lượt đang chạy thuộc nguồn cũ nên bị bỏ theo.
export function chonNguonVietTruyen(loai) {
  const s = S;
  if (!s || LOAI_NGUON.indexOf(loai) < 0 || s.loaiNguon === loai || (s.chay && s.chay.dang)) return;
  if (s.chay) {
    if (s.chay.hen) clearTimeout(s.chay.hen);
    s.ds = s.ds.filter((m) => m.id !== s.chay.id);
    s.chay = null;
  }
  s.loaiNguon = loai;
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  veThan(s);
}

// data-act="vt-xuat" — tải bản văn xuôi thành tệp .md (tên tệp lấy từ tên truyện).
export function xuatVietTruyen(id) {
  const muc = S && mucTrong(S, id);
  if (!muc || !String(muc.noiDung || "").trim()) return;
  S.D.taiXuong(tenTepMd(S.story.ten, muc), muc.noiDung);
  toast("Đã tải bản văn xuôi.");
}

// data-act="vt-chep" — sao chép toàn bộ văn xuôi vào clipboard.
export function chepVietTruyen(id) {
  const muc = S && mucTrong(S, id);
  if (!muc || !String(muc.noiDung || "").trim()) return;
  const loi = "Trình duyệt không cho sao chép tự động — hãy bôi đen văn bản rồi copy tay.";
  const cl = navigator.clipboard;
  if (!cl) { toast(loi, "error"); return; }
  cl.writeText(muc.noiDung).then(() => toast("Đã sao chép bản văn xuôi."), () => toast(loi, "error"));
}
