// Màn "Bảng điều khiển" (dashboard) — phần QUYẾT ĐỊNH THUẦN, KHÔNG DOM (Đợt 6d).
//
// Cả màn này chỉ DỰNG CHUỖI HTML (không đụng DOM), nên phần "logic" của nó là những phép suy ra
// nhỏ: nhãn chế độ, nhãn vai trong giao kèo, câu gộp "nhịp & ngôn ngữ", câu mẹo theo chế độ…
// Tách ra đây để `tests/node/bangDieuKhienFlow.test.mjs` ghim NGUYÊN VĂN mà không cần trình duyệt.
//
// Tệp này KHÔNG import gì.

export function nhanCheDo(story) {
  return story.mode === "chuong" ? "📖 nhiều chương" : "🧵 nhiều hội thoại";
}

export function nhanVaiGiaoKeo(g) {
  return g.vaiNguoiChoi === "dom"
    ? "Dom — bạn nắm quyền"
    : g.vaiNguoiChoi === "switch"
      ? "Switch — đổi vai"
      : "Sub — bạn trao quyền";
}

// Khung quan hệ "thế giới mở" là mặc định ⇒ không hiện dòng nào cho nó.
export function coKhungQuanHe(kq) {
  return !!kq && kq.id !== "the-gioi-mo";
}

export function gopKhungQuanHe(kq) {
  return kq.emoji + " " + kq.ten;
}

export function gopNhipNgonNgu(nhip, ngon) {
  return [nhip ? "nhịp: " + nhip.ten : "", ngon ? "ngôn ngữ: " + ngon.ten : ""].filter(Boolean).join(" · ");
}

export function gopVaiNhanVat(coVai) {
  return coVai.map((c) => c.ten + " (" + c.vaiBdsm + ")").join(", ");
}

export function gopSoThich(thich) {
  return thich.map((x) => x.ten).join(", ");
}

export function soChuongXong(story) {
  return story.chuongs.filter((c) => c.daKetThuc).length;
}

export function meoTongQuan(story) {
  return story.mode === "chuong"
    ? "Mẹo: khi một chương đã đi đủ xa, bấm “Kết thúc chương” — AI sẽ tóm tắt diễn biến và gợi ý chương kế tiếp cho bạn."
    : "Mẹo: bạn có thể trò chuyện riêng với từng nhân vật, rồi mở “Hội thoại mới” và chọn nhiều người để tạo group chat dùng chung bối cảnh.";
}
