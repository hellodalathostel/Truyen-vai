// Truyện Vai — Giai đoạn 8 · Đợt 4: CHUỖI HTML của màn "Viết thành truyện".
//
// Ba khối đúng bố cục đã chốt với chủ dự án:
//   (a) chọn nguồn + nút chạy (đổi thành nút "Dừng" khi đang chạy) + dòng "đã đọc X/Y đoạn nguồn";
//   (b) tiến độ khi đang chạy nhiều lượt — thanh tiến độ THẬT + "đang viết lô X/Y" + nút dừng;
//   (c) từng bản trong `truyenVietRa` — xem văn xuôi + xuất .md + sao chép.
//
// Tệp này KHÔNG quyết định gì về DỮ LIỆU: nguồn nào, chia mấy lô, cổng 18+ có chặn không — tất cả
// nằm ở `vietTruyenFlow.js` (thuần, có ca Node riêng). Ở đây chỉ có phần TRÌNH BÀY: nhãn trạng
// thái, thứ tự khối, phần trăm thanh tiến độ. Phần trình bày đó cũng là hàm THUẦN (nhận `ctx`,
// trả chuỗi) nên tầng Node kiểm được: không đọc DOM, không gọi AI, không giữ trạng thái.
//
// Bất biến §2.5: MỌI giá trị động đi qua `esc()` — kể cả số và nhãn do app ghép ra. Chỉ phần khung
// viết cứng trong tệp này mới không cần.
//
// `ctx` của mọi hàm ở đây:
//   ds          mảng bản ghi `truyenVietRa` (đợt 4 dùng dữ liệu GIẢ — xem `index.js`)
//   loaiNguon   "tho" | "canhKhep" (radio đang chọn)
//   tongDoan    số đoạn nguồn của nguồn đang chọn (đếm THẬT bằng hàm thuần của Flow)
//   chan        lý do của cổng 18+ (rỗng = được chạy)
//   chay        lượt đang viết: { id, lo, tongLo, daDoc, tongDoan, ten, dang } | null
//   tenHoiThoai bảng tra id hội thoại ⇒ tiêu đề (esc khi vào HTML)

import { esc, icon, timeAgo } from "../../dom.js";

// Trạng thái của một bản `truyenVietRa` (schema Đợt 1). Trạng thái lạ ⇒ "loi", đúng quy ước chuẩn
// hoá của `store.js` — không được rơi về "dangChay" vì giao diện sẽ quay vô hạn.
export const TRANG_THAI = ["dangChay", "xong", "loi"];
const NHAN_TRANG_THAI = { dangChay: "đang viết", xong: "đã xong", loi: "lỗi" };
const NHAN_NGUON = { tho: "log thô", canhKhep: "cảnh đã khép" };
const MO_TA_NGUON = {
  tho: "Toàn bộ tin nhắn của hội thoại, đúng thứ tự đã diễn ra.",
  canhKhep: "Tóm tắt của những cảnh đã khép trong hội thoại.",
};

// ---------------------------------------------------------------- quyết định trình bày (thuần)
export function trangThaiCua(muc) {
  const tt = muc && muc.trangThai;
  return TRANG_THAI.indexOf(tt) >= 0 ? tt : "loi";
}

// `muc` (tuỳ chọn) để phân biệt một mục NGƯỜI DÙNG BẤM DỪNG giữa chừng: nó đã xong việc theo ý
// người dùng (nên `trangThai` vẫn là một trong ba giá trị của schema) nhưng KHÔNG phải "đã xong" —
// nhãn phải nói đúng chuyện đã xảy ra, cùng quy ước với nhãn "đã dừng" của lượt nhập vai bị dừng.
export function nhanTrangThai(tt, muc) {
  if (muc && muc.daDung === true) return "đã dừng";
  return NHAN_TRANG_THAI[TRANG_THAI.indexOf(tt) >= 0 ? tt : "loi"];
}

export function nhanNguon(loai) {
  return NHAN_NGUON[loai === "canhKhep" ? "canhKhep" : "tho"];
}

export function moTaNguon(loai) {
  return MO_TA_NGUON[loai === "canhKhep" ? "canhKhep" : "tho"];
}

// Phần trăm thanh tiến độ — theo LÔ (lô đang viết / tổng số lô), kẹp trong 0..100.
export function phanTramTienDo(chay) {
  const c = chay || {};
  const lo = Number(c.lo) || 0;
  const tong = Number(c.tongLo) || 0;
  if (tong <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((lo / tong) * 100)));
}

// Tên tệp khi xuất: tên truyện đã bỏ dấu câu + mốc thời gian của bản đó.
export function tenTepMd(tenTruyen, muc) {
  const goc = String(tenTruyen === undefined || tenTruyen === null ? "" : tenTruyen)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (goc || "truyen") + "-viet-thanh-truyen-" + (Number(muc && muc.taoLuc) || 0) + ".md";
}

export function tenHoiThoai(ctx, id) {
  const bang = (ctx && ctx.tenHoiThoai) || {};
  const ten = bang[id];
  return ten === undefined || ten === null || ten === "" ? "hội thoại đã xoá" : String(ten);
}

// ---------------------------------------------------------------- (a) nguồn + nút chạy
export function htmlDem(ctx) {
  const da = Number(ctx && ctx.chay && ctx.chay.daDoc) || 0;
  const tong = Number(ctx && ctx.tongDoan) || 0;
  return '<div class="vt-dem" data-vt-dem>' + esc("đã đọc " + da + "/" + tong + " đoạn nguồn") + "</div>";
}

function htmlNguonO(loai, dangChon, khoa) {
  return (
    '<label class="vt-nguon-o' + (loai === dangChon ? " on" : "") + '" data-act="vt-nguon" data-loai="' + esc(loai) + '">' +
      '<input type="radio" name="vt-nguon" value="' + esc(loai) + '"' + (loai === dangChon ? " checked" : "") + (khoa ? " disabled" : "") + ">" +
      '<span class="vt-nguon-ten">' + esc(nhanNguon(loai)) + "</span>" +
      '<span class="vt-nguon-mo">' + esc(moTaNguon(loai)) + "</span>" +
    "</label>"
  );
}

export function htmlNguon(ctx) {
  const ct = ctx || {};
  const chon = ct.loaiNguon === "canhKhep" ? "canhKhep" : "tho";
  const chan = String(ct.chan || "");
  const coNguon = (Number(ct.tongDoan) || 0) > 0;
  const dangChay = !!ct.chay;
  const dang = !!(ct.chay && ct.chay.dang);
  // Nút "Dừng" KHÔNG bao giờ bị khoá: dừng được NGAY giữa lúc chạy là yêu cầu của màn này.
  const khoaNut = !dangChay && (chan !== "" || !coNguon);
  // Nút chính đổi vai theo trạng thái, giống mẫu ▶️ continue ↔ 🛑 stop của app.js. Hai nhánh viết
  // RỜI nhau để `data-act` luôn là một chuỗi HOÀN CHỈNH trong mã — ca "mọi data-act đều có hàm xử
  // lý" quét mã nguồn theo chuỗi, nên một `data-act` ghép từ biểu thức sẽ bị đọc sai.
  const nut = dangChay
    ? '<button class="btn btn-primary btn-lg vt-chay" data-act="vt-dung">' + icon("stop", 16) + " Dừng</button>"
    : '<button class="btn btn-primary btn-lg vt-chay" data-act="vt-chay"' + (khoaNut ? " disabled" : "") + ">" + icon("sparkle", 16) + " Viết thành truyện</button>";
  return (
    '<section class="vt-khoi vt-khoi-nguon">' +
      '<div class="vt-khoi-head">' + icon("scroll", 15) + "<h3>Nguồn để viết</h3></div>" +
      '<div class="hint">AI viết LẠI nguồn thành văn xuôi kể chuyện — không thêm tình huống nào ngoài nguồn.</div>' +
      '<div class="vt-nguon">' + htmlNguonO("tho", chon, dang) + htmlNguonO("canhKhep", chon, dang) + "</div>" +
      htmlDem(ctx) +
      nut +
      (chan ? '<div class="vt-chan">' + icon("lock", 13) + " " + esc(chan) + "</div>" : "") +
      (!coNguon && !dangChay ? '<div class="vt-rong">Hội thoại này chưa có đoạn nguồn nào để viết — hãy nhập vai thêm, hoặc chọn nguồn cảnh đã khép.</div>' : "") +
    "</section>"
  );
}

// `ctx.chay` = lượt đang chạy: `lo` là số lô ĐÃ XONG (thanh tiến độ = lo/tong), `daDoc` là số đoạn
// nguồn đã đọc hết, `dang` = đang trong một lời gọi model, `dungYeuCau` = người dùng đã xin dừng
// (dừng sau khi lô đang viết xong).
export function htmlTienDo(ctx) {
  const c = ctx && ctx.chay;
  if (!c) return '<section class="vt-khoi vt-tien-do" data-vt-tien-do hidden></section>';
  const lo = Number(c.lo) || 0; // số lô ĐÃ XONG (thanh tiến độ = lo/tong); lô đang viết là lo + 1
  const tong = Number(c.tongLo) || 0;
  const pt = phanTramTienDo(c);
  return (
    '<section class="vt-khoi vt-tien-do" data-vt-tien-do>' +
      '<div class="vt-khoi-head">' + icon("clock", 15) + "<h3>Tiến độ</h3>" +
        '<span class="vt-tien-do-so">' + esc("lô " + (lo + 1) + "/" + tong) + "</span></div>" +
      '<div class="vt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + esc(String(pt)) + '">' +
        '<i style="width:' + esc(pt + "%") + '"></i>' +
      "</div>" +
      '<div class="vt-tien-do-dong">' +
        "<span>" + esc(
          c.dungYeuCau
            ? "Sẽ dừng sau khi lô " + (lo + 1) + "/" + tong + " viết xong — không cắt ngang lô đang gọi model."
            : "Đang viết lô " + (lo + 1) + "/" + tong + " của " + c.ten + "…"
        ) + "</span>" +
        (c.dungYeuCau
          ? '<button class="btn btn-sm vt-dung" data-act="vt-dung" disabled>' + icon("stop", 13) + " Đang dừng…</button>"
          : '<button class="btn btn-sm vt-dung" data-act="vt-dung">' + icon("stop", 13) + " Dừng ngay</button>") +
      "</div>" +
    "</section>"
  );
}

// ---------------------------------------------------------------- (c) kết quả từng bản
export function htmlMuc(muc, ctx) {
  const tt = trangThaiCua(muc);
  const noiDung = String((muc && muc.noiDung) || "");
  const loi = String((muc && muc.loiNeu) || "");
  const coVan = noiDung.trim() !== "";
  const meta = [nhanNguon(muc && muc.loaiNguon), timeAgo(muc && muc.taoLuc), coVan ? noiDung.length + " ký tự" : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    '<article class="vt-muc vt-muc-' + esc(tt) + '" data-vt-muc="' + esc(muc && muc.id) + '">' +
      '<div class="vt-muc-head">' +
        '<span class="vt-chip vt-chip-' + esc(tt) + (muc && muc.daDung === true ? " vt-chip-daDung" : "") + '">' + esc(nhanTrangThai(tt, muc)) + "</span>" +
        '<span class="vt-muc-ten">' + esc(tenHoiThoai(ctx, muc && muc.hoiThoaiId)) + "</span>" +
        '<span class="vt-muc-meta">' + esc(meta) + "</span>" +
        '<span class="vt-muc-nut">' +
          (coVan ? '<button class="btn btn-sm" data-act="vt-xuat" data-id="' + esc(muc && muc.id) + '" title="Tải bản văn xuôi thành tệp .md">' + icon("download", 12) + " Xuất .md</button>" : "") +
          (coVan ? '<button class="btn btn-sm" data-act="vt-chep" data-id="' + esc(muc && muc.id) + '" title="Sao chép toàn bộ văn xuôi">' + icon("copy", 12) + " Sao chép</button>" : "") +
          (tt === "loi" ? '<span class="vt-muc-khong">không có gì để xuất</span>' : "") +
        "</span>" +
      "</div>" +
      (coVan ? '<div class="vt-van">' + esc(noiDung) + "</div>" : "") +
      (loi.trim() !== "" ? '<div class="vt-loi">' + icon("alert", 12) + " " + esc(loi) + "</div>" : "") +
    "</article>"
  );
}

export function htmlKetQua(ctx) {
  const ds = Array.isArray(ctx && ctx.ds) ? ctx.ds : [];
  return (
    '<section class="vt-khoi">' +
      '<div class="vt-khoi-head">' + icon("book", 15) + "<h3>Văn xuôi đã viết</h3>" +
        '<span class="vt-tien-do-so">' + esc(ds.length + " bản") + "</span></div>" +
      (ds.length
        ? '<div class="vt-ds">' + ds.map((m) => htmlMuc(m, ctx)).join("") + "</div>"
        : '<div class="vt-rong">Chưa có bản văn xuôi nào. Chọn nguồn rồi bấm “Viết thành truyện”.</div>') +
    "</section>"
  );
}

// ---------------------------------------------------------------- thân modal: ba khối
export function htmlThan(ctx) {
  return '<div class="vt-than">' + htmlNguon(ctx) + htmlTienDo(ctx) + htmlKetQua(ctx) + "</div>";
}
