// Truyện Vai — Giai đoạn 8 · Đợt 5: màn "Viết thành truyện" (VỎ ≤ 150 dòng) — NỐI LUỒNG THẬT.
//
// Bốn mảnh: `vietTruyenFlow.js` — quyết định THUẦN + luồng chạy (chia lô, lắp prompt, gọi model tuần
// tự, nén phần xa) · `vietTruyenHtml.js` — chuỗi HTML ba khối · `vietTruyenChay.js` — phần vẽ vào
// modal + gọi model thật + áp kết quả · tệp này — dựng modal, giữ trạng thái màn, nối các nút.
// Không tự gắn listener: nút nằm ở `ui/suKien/vietTruyen.js` (luật §7.3).
import { el, modal, toast } from "../../dom.js";
import { getMessages, uid } from "../../store.js";
import * as AI from "../../ai.js";
import {
  LOAI_NGUON, layNguonVietTruyen, chiaLoNguon, gioiHanKyTuChoLo, chayVietTruyen, kiemVietTruyenTruocKhiChay,
  dsVietRa, noiDungDeXuat,
} from "./vietTruyenFlow.js";
import { tenTepMd } from "./vietTruyenHtml.js";
import { veThan, veDem, veVan, ketThucLuot, vietBangAI, nenBangAI } from "./vietTruyenChay.js";

let S = null; // màn đang mở — chống mở hai lần bằng lớp `.vt-modal`

function nguonCua(s) { return layNguonVietTruyen(s.story, s.conv.id, s.loaiNguon, getMessages(s.conv.id)); }
function soLo(nguon) { return chiaLoNguon(nguon, gioiHanKyTuChoLo(AI.countTokens, AI.idealMaxTokens, nguon.join("\n\n"))).length || 1; }

export function openVietTruyen(D) {
  const story = D.currentStory();
  if (!story || document.querySelector(".vt-modal")) return;
  const conv = D.currentConv() || (story.hoiThoais || []).slice().sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0))[0] || null;
  if (!conv) { toast("Chưa có hội thoại nào để viết thành truyện.", "error"); return; }
  const bangTen = {};
  for (const c of story.hoiThoais || []) bangTen[c.id] = c.tieuDe;
  const s = {
    D, story, conv, bangTen, ds: dsVietRa(story), loaiNguon: "tho", nguon: [], tongDoan: 0,
    chay: null, dungYeuCau: false, veLuc: 0,
    chan: String((kiemVietTruyenTruocKhiChay(story) || {}).loiNeu || ""),
  };
  S = s;
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  s.body = el("div", { class: "vt-modal" });
  modal({
    title: "Viết thành truyện",
    subtitle: "Từ hội thoại đã nhập vai, viết lại thành văn xuôi kể chuyện — dữ liệu dẫn xuất, không sửa bản nhập vai.",
    wide: true,
    body: s.body,
    // Đóng màn giữa chừng KHÔNG cắt ngang lô đang gọi model: nó xin dừng sau lô đó (phần đã viết được
    // giữ nguyên, đã lưu) — cùng quy ước với nút Dừng.
    onClose: () => { if (S === s) { if (s.chay) { s.chay.dungYeuCau = true; s.dungYeuCau = true; } S = null; } },
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });
  veThan(s);
}

// data-act="vt-chay" — chạy THẬT: mục được thêm vào truyện NGAY khi bắt đầu để mỗi lô xong là lưu được
// tiến độ dở dang (mục 8 của chỉ đạo), rồi giao việc cho luồng thuần của Flow.
export async function bamVietTruyen() {
  const s = S;
  if (!s || !s.body.isConnected || s.chay) return;
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  if (s.chan) { toast(s.chan, "error"); return; }
  if (!s.tongDoan) { toast("Hội thoại này chưa có đoạn nguồn nào để viết.", "error"); return; }
  const muc = { id: uid("vt"), hoiThoaiId: s.conv.id, loaiNguon: s.loaiNguon, taoLuc: Date.now(), trangThai: "dangChay", noiDung: "", loiNeu: "" };
  s.story.truyenVietRa = (Array.isArray(s.story.truyenVietRa) ? s.story.truyenVietRa : []).concat([muc]);
  s.ds = dsVietRa(s.story);
  s.dungYeuCau = false;
  s.veLuc = 0;
  s.chay = { id: muc.id, lo: 0, tongLo: soLo(s.nguon), daDoc: 0, tongDoan: s.tongDoan, ten: s.conv.tieuDe, dang: true, dungYeuCau: false };
  veThan(s);
  AI.moPhienSinh(); // phiên sinh ĐỘC LẬP: xoá cờ dừng còn sót của lượt nhập vai trước (luật của ai.js)
  const kq = await chayVietTruyen({
    story: s.story, hoiThoaiId: s.conv.id, loaiNguon: s.loaiNguon, tinNhan: getMessages(s.conv.id),
    countTokens: AI.countTokens, idealMaxTokens: AI.idealMaxTokens, viet: vietBangAI, nen: nenBangAI,
    choPhepDung: () => s.dungYeuCau,
    khiChunk: (text) => { muc.noiDung = text; veVan(s, text); },
    khiMoiLo: (o) => {
      muc.noiDung = o.proseDaViet;
      s.chay.lo = o.lo;
      s.chay.daDoc = o.daDoc;
      veVan(s, o.proseDaViet);
      veDem(s);
      s.D.henLuuVietTruyen(s.story); // lưu TIẾN ĐỘ DỞ DANG sau mỗi lô
    },
  });
  ketThucLuot(s, muc, kq);
}

// data-act="vt-dung" — KHÔNG cắt ngang lô đang gọi model: chỉ xin dừng, luồng dừng ở ranh giới lô kế
// tiếp rồi giữ nguyên phần đã viết (khác bản tạm của đợt 4 — nay đã có cơ chế lưu dở dang).
export function dungVietTruyen() {
  const s = S;
  if (!s || !s.chay || s.chay.dungYeuCau) return;
  s.chay.dungYeuCau = true;
  s.dungYeuCau = true;
  veDem(s);
  toast("Sẽ dừng sau khi lô đang viết xong — phần đã viết được giữ lại.");
}

// data-act="vt-nguon" — đổi nguồn; dòng "đã đọc X/Y đoạn nguồn" đếm lại bằng nguồn THẬT vừa chọn.
export function chonNguonVietTruyen(loai) {
  const s = S;
  if (!s || LOAI_NGUON.indexOf(loai) < 0 || s.loaiNguon === loai || s.chay) return;
  s.loaiNguon = loai;
  s.nguon = nguonCua(s);
  s.tongDoan = s.nguon.length;
  veThan(s);
}

// data-act="vt-xuat" — tải bản văn xuôi thành tệp .md (tên tệp lấy từ tên truyện + mốc tạo bản đó).
export function xuatVietTruyen(id) {
  const muc = mucTrong(id);
  const text = noiDungDeXuat(muc);
  if (!text) return;
  S.D.taiXuong(tenTepMd(S.story.ten, muc), text);
  toast("Đã tải bản văn xuôi thành tệp .md.");
}

// data-act="vt-chep" — sao chép vào clipboard. Phần LẤY nội dung là hàm thuần của Flow
// (`noiDungDeXuat`); ở đây chỉ còn việc gọi API của trình duyệt.
export function chepVietTruyen(id) {
  const text = noiDungDeXuat(mucTrong(id));
  if (!text) return;
  const loi = "Trình duyệt không cho sao chép tự động — hãy bôi đen văn bản rồi copy tay.";
  if (!navigator.clipboard) { toast(loi, "error"); return; }
  navigator.clipboard.writeText(text).then(() => toast("Đã sao chép bản văn xuôi."), () => toast(loi, "error"));
}

function mucTrong(id) { return (S && S.ds.find((m) => m.id === id)) || null; }
