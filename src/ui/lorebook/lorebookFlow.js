// Truyện Vai — Đợt 6c: QUYẾT ĐỊNH THUẦN của màn "Sổ tri thức (lorebook)".
//
// KHÔNG import gì, KHÔNG đọc DOM ⇒ chạy được ở tầng Node (tests/node/lorebookFlow.test.mjs).
//
// Phần PARSE / XẾP / LỌC mục lore đã nằm ở lõi từ trước và đã có ca Node riêng:
//   - `docLorebook()` (parse JSON chuẩn World Info / SillyTavern)     → src/lore.js, lore.test.mjs
//   - `chuanMuc()` (chuẩn hoá một mục)                                → src/lore.js
//   - `buildLore()` (XẾP theo `thuTu`, lọc mục tắt)                   → src/lore.js
//   - `mucKhop()`  (LỌC theo từ khoá của vài tin nhắn gần nhất)       → src/lore.js
// Tệp này giữ phần quyết định còn lại của MÀN: đọc kết quả parse ra sao, dựng một mục từ form,
// câu hỏi/thông báo, và tên file xuất.

export const SO_TRONG = "Sổ đang trống.";
export const LOI_MUC_TRONG = "Mục chưa có nội dung.";
export const LOI_FILE_RONG = "File không có mục nào dùng được.";

// Số mục đang bật (dòng thống kê).
export function soBat(entries) {
  return entries.filter((e) => e.bat).length;
}

// Bản đồ "mục nào đang khớp hội thoại này" để tô đậm trong danh sách.
export function bangKhop(dsKhop) {
  const m = new Map();
  for (const x of dsKhop) m.set(x.entry.id, x);
  return m;
}

// Đọc kết quả `docLorebook()`: có phải HỎI LẠI không (thay thế một sổ đang có mục), hay là
// THÊM VÀO. Thay thế sổ trống thì không cần hỏi (chẳng mất gì).
export function coHoiThayThe(soMucHienCo, thayThe) {
  return !!(thayThe && soMucHienCo);
}

export function cauHoiThayThe(soCu, soMoi) {
  return "Xoá " + soCu + " mục hiện có và thay bằng " + soMoi + " mục vừa đọc?";
}

export function cauHoiXoaSo(soMuc) {
  return "Xoá toàn bộ " + soMuc + " mục của sổ tri thức? Không thể hoàn tác.";
}

export function cauHoiXoaMuc(ghiChu) {
  return "Xoá mục “" + ghiChu + "” khỏi sổ tri thức?";
}

export function loiDocFile(err) {
  return "Không đọc được file: " + ((err && err.message) || err);
}

export function loiNhapFile(err) {
  return "Nhập thất bại: " + ((err && err.message) || err);
}

// Câu thông báo sau khi nạp: phần "bỏ qua" / "thiếu từ khoá" dùng CHUNG cho cả ba đường
// (dán JSON + thêm, dán JSON + thay, chọn file).
export function thongBaoNhap(kq, dau) {
  return (
    dau +
    (kq.boQua.length ? " Bỏ qua " + kq.boQua.length + " mục thiếu nội dung." : "") +
    (kq.thieuTuKhoa ? " " + kq.thieuTuKhoa + " mục thiếu từ khoá đã được tắt." : "")
  );
}

export function thongBaoNhapFile(kq, tenFile) {
  return thongBaoNhap(kq, "Đã nạp " + kq.entries.length + " mục từ “" + tenFile + "”.");
}

// File chỉ toàn mục bị bỏ qua ⇒ không có gì để thêm, phải báo chứ không được "nạp thành công".
export function fileKhongDungDuoc(kq) {
  return !!(kq.boQua.length && !kq.entries.length);
}

// Một túi giá trị form ⇒ những gì ghi vào mục. `thuTu` 0 và `doSau` 0 là giá trị hợp lệ
// ("mặc định"), nên chỉ chuỗi rỗng mới rơi về 0; `ghiChu` rỗng thì lấy từ khoá đầu, cuối cùng
// là "Mục" (không được để mục không tên).
export function mucTuForm(gia) {
  const ds = (s) => String(s === undefined || s === null ? "" : s).split(",").map((x) => x.trim()).filter(Boolean);
  const keys = ds(gia.keys);
  return {
    ghiChu: String(gia.ghiChu || "").trim() || keys[0] || "Mục",
    keys,
    keys2: ds(gia.keys2),
    noiDung: String(gia.noiDung || "").trim(),
    thuTu: Number(gia.thuTu) || 0,
    doSau: Math.max(0, Number(gia.doSau) || 0),
    hangSo: !!gia.hangSo,
    chonLoc: !!gia.chonLoc,
    phanBietHoa: !!gia.phanBietHoa,
    khopTronTu: !!gia.khopTronTu,
    khongDeQuy: !!gia.khongDeQuy,
  };
}

export function thieuNoiDung(nd) {
  return !String(nd === undefined || nd === null ? "" : nd).trim();
}

// Tên file xuất: bỏ mọi ký tự không phải chữ/số (giữ chữ có dấu), nối bằng gạch ngang.
export function tenFileXuat(ten) {
  return "lorebook-" + String(ten || "so").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() + ".json";
}
