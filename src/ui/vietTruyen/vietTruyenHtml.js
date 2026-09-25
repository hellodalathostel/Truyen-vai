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

export function nhanTrangThai(tt) {
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

// ---------------------------------------------------------------- (b) tiến độ nhiều lượt
export function htmlTienDo(ctx) {
  const c = ctx && ctx.chay;
  if (!c) return '<section class="vt-khoi vt-tien-do" data-vt-tien-do hidden></section>';
  const lo = Number(c.lo) || 0;
  const tong = Number(c.tongLo) || 0;
  const pt = phanTramTienDo(c);
  return (
    '<section class="vt-khoi vt-tien-do" data-vt-tien-do>' +
      '<div class="vt-khoi-head">' + icon("clock", 15) + "<h3>Tiến độ</h3>" +
        '<span class="vt-tien-do-so">' + esc("lô " + lo + "/" + tong) + "</span></div>" +
      '<div class="vt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + esc(String(pt)) + '">' +
        '<i style="width:' + esc(pt + "%") + '"></i>' +
      "</div>" +
      '<div class="vt-tien-do-dong">' +
        "<span>" + esc("Đang viết lô " + lo + "/" + tong + " của " + c.ten + "…") + "</span>" +
        '<button class="btn btn-sm vt-dung" data-act="vt-dung">' + icon("stop", 13) + " Dừng ngay</button>" +
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
        '<span class="vt-chip vt-chip-' + esc(tt) + '">' + esc(nhanTrangThai(tt)) + "</span>" +
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

// ==========================================================================
//  GIẢ — XOÁ Ở ĐỢT 5 (khi nối luồng gọi AI thật)
// ==========================================================================
// Dữ liệu MẪU để kiểm bố cục: ba bản ở đủ ba trạng thái (để cả ba khối render đúng) cộng nhịp giả
// của một lượt đang chạy. Văn mẫu dùng từ chung, không có tên riêng nào (luật §8: gói không được
// chứa tên/id thật — một cái tên "trông như thật" có thể trùng dữ liệu của chủ dự án).
export const TOC_GIA = 1400;
export const LOI_GIA = "Không gọi được model: bản giả của đợt 4 chưa nối ra ngoài. Nối luồng thật ở đợt 5 rồi thử lại.";
export const VAN_GIA_DANG = "## Chương 1\n\nCăn phòng im đi sau khi cánh cửa khép lại. Người đàn ông đứng yên rất lâu…";
export const VAN_GIA =
  "## Chương 1\n\nCăn phòng im đi sau khi cánh cửa khép lại. Người đàn ông đứng yên rất lâu, tay vẫn giữ lấy " +
  "khung cửa như thể buông ra là mất luôn thứ gì đó.\n\n— Anh không cần phải giải thích. — Cô ấy nói rất khẽ, mắt nhìn xuống sàn.\n\n" +
  "## Chương 2\n\nSáng hôm sau, con hẻm vẫn ướt sau cơn mưa đêm. Hai người đi cạnh nhau, không ai mở lời trước.";
export const VAN_GIA_MOI =
  "## Chương 1\n\nÁnh sáng cuối ngày tràn qua ô cửa sổ, đọng thành một vệt dài trên nền gỗ. Bóng người ngồi lặng " +
  "ở mép giường, hai tay đặt trên đầu gối.\n\n— Nói cho tôi biết anh đang nghĩ gì. — Giọng cô ấy không lớn, nhưng đủ để căn phòng thôi im.\n\n" +
  "## Chương 2\n\nHọ nói với nhau rất nhiều, và không câu nào trong đó là để thoả thuận. Đến khi trời tắt hẳn, " +
  "người đàn ông mới đứng dậy, kéo cửa lại, rồi quay về phía bóng tối.";

export function mucGia(hoiThoaiId) {
  const t = Date.now();
  return [
    { id: "vt_gia_dang", hoiThoaiId, loaiNguon: "tho", taoLuc: t - 45 * 1000, trangThai: "dangChay", noiDung: VAN_GIA_DANG, loiNeu: "" },
    { id: "vt_gia_xong", hoiThoaiId, loaiNguon: "canhKhep", taoLuc: t - 26 * 60 * 60 * 1000, trangThai: "xong", noiDung: VAN_GIA, loiNeu: "" },
    { id: "vt_gia_loi", hoiThoaiId, loaiNguon: "tho", taoLuc: t - 3 * 24 * 60 * 60 * 1000, trangThai: "loi", noiDung: "", loiNeu: LOI_GIA },
  ];
}
