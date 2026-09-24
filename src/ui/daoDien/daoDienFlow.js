// Màn "Chế độ Đạo diễn" — phần QUYẾT ĐỊNH THUẦN, KHÔNG DOM (Đợt 6d).
//
// Vì sao tách: các nút trong màn này đều là "đổi trạng thái rồi ghi". Đổi thành gì, hỏi lại bằng
// câu chữ nào, báo lại bằng câu gì — tất cả là quyết định, kiểm được ở tầng Node mà không cần
// trình duyệt. Tệp này KHÔNG import gì (kể cả DOM), nên `tests/node/daoDienFlow.test.mjs` ghim
// được NGUYÊN VĂN câu chữ — sửa một chữ ở đây là đổi hành vi và sẽ làm ca đó đỏ.

// Trạng thái mới của một hướng khi bấm nút tương ứng. "" = không phải nút đổi trạng thái.
export function trangThaiSau(act) {
  if (act === "dd-hd-tamdung") return "tamDung";
  if (act === "dd-hd-tieptuc") return "hoatDong";
  if (act === "dd-hd-hoantat") return "hoanTat";
  if (act === "dd-hd-huy") return "huy";
  return "";
}

// Tên hiển thị của một hướng trong câu hỏi xác nhận (hướng cũ có thể chỉ có `mongMuon`).
export function tenHienThi(h) {
  return (h && (h.ten || h.mongMuon)) || "";
}

export const THONG_BAO_TAM_DUNG = "Đã tạm dừng hướng — lượt sau nó không còn vào prompt.";
export const THONG_BAO_CHAY_LAI = "Đã cho hướng chạy lại.";
export const THONG_BAO_HOAN_TAT = "Đã đánh dấu hoàn tất.";
export const THONG_BAO_HUY = "Đã huỷ hướng.";

export function thongBaoTrangThai(tt) {
  return tt === "tamDung" ? THONG_BAO_TAM_DUNG : THONG_BAO_CHAY_LAI;
}

// Câu hỏi xác nhận khi hoàn tất / huỷ một hướng — trả về đúng bộ ba đối số của `hoiXacNhan`.
export function cauHoiHoanTat(ten) {
  return [
    "Hoàn tất hướng",
    "Đánh dấu “" + ten + "” là đã hoàn tất? Hướng sẽ ngừng được bơm vào prompt, nhưng lịch sử tiến độ vẫn được giữ nguyên.",
    { yesLabel: "Hoàn tất" },
  ];
}

export function cauHoiHuy(ten) {
  return [
    "Huỷ hướng",
    "Huỷ “" + ten + "”? Hướng sẽ ngừng vào prompt ngay từ lượt sau. Lịch sử tiến độ vẫn được giữ để bạn hiểu điều gì từng được định hướng.",
    { yesLabel: "Huỷ hướng", danger: true },
  ];
}

// Mức gốc sau khi người dùng chỉnh tay trong màn Đạo diễn: chỉ nhận mã mức CÓ THẬT, còn lại là "an"
// (chỉnh tay = CHỐT mức; danh sách hé lộ tự động bị bỏ ở phía gọi).
export function mucGocSau(muc, dsMuc) {
  return (dsMuc || []).some((x) => x.id === muc) ? muc : "an";
}

// Bấm "khôi phục" một đính chính đã xoá ⇒ xoá cờ xoá và mốc xoá.
export function trangThaiKhoiPhuc() {
  return { xoa: false, xoaLuc: 0 };
}
