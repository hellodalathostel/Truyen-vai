// Màn "Sửa hồ sơ ngoại hình" — phần QUYẾT ĐỊNH + CÂU CHỮ THUẦN, KHÔNG DOM (Đợt 6d).
//
// Vì sao tách: câu chữ của màn này là thứ người dùng ĐỌC (nhãn nút, cảnh báo gửi ảnh cho AI,
// câu báo lỗi) — sửa một chữ trong đó là đổi hành vi. Gom về một tệp thuần để
// `tests/node/suaNgoaiHinhFlow.test.mjs` ghim NGUYÊN VĂN mà không cần trình duyệt.
//
// Tệp này KHÔNG import gì.

// Cạnh dài tối đa của ảnh tham chiếu lưu trong hồ sơ (ảnh được thu nhỏ trước khi lưu).
export const NH_MAX_ANH = 1024;

export const TIEU_DE_MOI = "Hồ sơ ngoại hình mới";
export const TIEU_DE_SUA = "Sửa hồ sơ ngoại hình";
export const NHAN_NUT_TAO = "Tạo hồ sơ";
export const NHAN_NUT_LUU = "Lưu";
export const NHAN_ANH_THEM = "Thêm ảnh tham chiếu";
export const NHAN_ANH_DOI = "Đổi ảnh tham chiếu";

export const LOI_THIEU_TEN = "Hồ sơ cần có tên chính — đó là tên dùng để nhận diện trong prompt ảnh.";
export const LOI_DOC_ANH = "Không đọc được ảnh này. Thử ảnh png/jpg/webp khác.";
export const DANG_THU_NHO = "Đang thu nhỏ ảnh…";
export const THONG_BAO_BO_ANH = "Đã bỏ ảnh tham chiếu khỏi form (chưa lưu).";
export const LOI_THIEU_MO_TA = "Hãy nhập mô tả, hoặc thêm ảnh tham chiếu, rồi bấm lại.";
export const DANG_SOAN = "Đang soạn bản nháp ngoại hình…";
export const LOI_DOC_ANH_PT = "Không đọc được ảnh để phân tích — chỉ dùng phần mô tả chữ.";
export const TOAST_TAO = "Đã tạo hồ sơ ngoại hình.";
export const TOAST_LUU = "Đã lưu hồ sơ ngoại hình.";

// Ảnh trong form sẽ được gửi cho dịch vụ AI của Perchance để phân tích ⇒ phải nói rõ cho người dùng.
export const CANH_BAO_ANH_GUI_AI =
  "Ảnh có trong form sẽ được GỬI tới dịch vụ AI của Perchance để phân tích khi bạn bấm “Tạo hồ sơ từ mô tả / ảnh”.";

export function tieuDeModal(laMoi) {
  return laMoi ? TIEU_DE_MOI : TIEU_DE_SUA;
}

export function nhanNutChinh(laMoi) {
  return laMoi ? NHAN_NUT_TAO : NHAN_NUT_LUU;
}

// Nhãn nút ảnh, kèm khoảng trắng đứng sau biểu tượng (khớp nguyên văn HTML cũ).
export function nhanNutAnh(coAnh) {
  return " " + (coAnh ? NHAN_ANH_DOI : NHAN_ANH_THEM);
}

// Ghi chú "hồ sơ dùng chung" chỉ hiện khi SỬA, và phải nói đúng hậu quả theo số nhân vật đang liên kết.
export function cauGhiChuDungChung(soLienKet) {
  return (
    '<div class="hint nh-note">Đây là hồ sơ <b>dùng chung</b>: sửa ngoại hình ở đây sẽ ảnh hưởng tới ' +
    (soLienKet ? "<b>" + soLienKet + "</b> nhân vật đang liên kết" : "mọi nhân vật liên kết sau này") +
    ". Tin nhắn cũ không bị sửa.</div>"
  );
}

// Câu báo sau khi AI điền bản nháp — phải nhắc đúng nhãn nút chính của lần mở này.
export function cauDaDienBanNhap(laMoi) {
  return "Đã điền bản nháp — đọc lại và sửa tuỳ ý, rồi bấm “" + nhanNutChinh(laMoi) + "”. Chưa có gì được lưu.";
}

// Khi AI trả về điểm cần người dùng tự chọn, câu này thay vào dòng trạng thái…
export function cauDiemCanChon(xungDot) {
  return "Đã điền bản nháp. Có điểm cần bạn tự chọn: " + xungDot;
}

// … và câu này vào dòng cảnh báo trong khối AI.
export function cauDiemCanhBao(xungDot) {
  return "Điểm cần bạn chọn: " + xungDot;
}

export function cauLoiAi(e) {
  return "Lỗi: " + (e.message || e) + " — nội dung bạn đã nhập vẫn còn nguyên.";
}

// Hộp hỏi trước khi ghi đè ô mô tả người dùng đã gõ tay: tiêu đề, nội dung, nút.
export function hoiGhiDeMoTa() {
  return [
    "Ghi đè mô tả ngoại hình?",
    "Ô mô tả ngoại hình đang có chữ. Ghi đè bằng bản nháp AI vừa soạn?",
    { yesLabel: "Ghi đè" },
  ];
}

// AI chỉ được điền thêm vào ô ĐANG TRỐNG; ô có chữ thì giữ nguyên (null = không đổi).
export function giaTriDienThem(dangCo, giaTriAi) {
  if (String(dangCo || "").trim()) return null;
  return giaTriAi || null;
}
