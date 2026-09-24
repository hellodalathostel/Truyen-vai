// Truyện Vai — Đợt 6b: nút "bắt đầu từ một mẫu có sẵn" của màn "Sửa nhân vật".
//
// Mẫu chỉ ĐIỀN VÀO FORM (bản nháp); người dùng vẫn phải bấm Lưu. Mẫu BDSM khi truyện chưa
// bật giao kèo thì mở sẵn khối giao kèo ra và nói rõ — nhưng KHÔNG tự bật, và KHÔNG tự ghi
// cờ người lớn: cửa 18+ chỉ mở bằng nút "Bật giao kèo cho truyện này" (xem `nhanVatGiaoKeo.js`).
//
// Danh sách trường được sao chép để ở dạng dữ liệu (một chỗ) thay vì 14 dòng `if` lặp lại.

import { giaoKeoOf } from "../../store.js";

const TRUONG_MAU = [
  "vaiTro", "tinhCach", "cachNoi", "moTa", "vaiBdsm", "danhXung", "kinhNghiem",
  "phongCach", "khauVi", "gioiHan", "gioiHanCung", "luatRieng", "chamSocSau", "tinHieuRieng",
];

export const GHI_CHU_MAU_BDSM =
  " Truyện chưa bật giao kèo — bấm “Bật giao kèo cho truyện này” ở phần bên trên để AI dùng hết phần BDSM.";

export function apMauNhanVat(S, mauNv) {
  const D = S.D;
  const F = S.F;
  const maus = (D.mauNhanVat && D.mauNhanVat()) || [];
  const t2 = maus.find((x) => x.id === mauNv.dataset.mauNv);
  const batGk = giaoKeoOf(S.story).bat;
  if (t2 && t2.vaiBdsm && !batGk) {
    const d0 = S.body.querySelector("[data-gk-off]");
    if (d0) d0.open = true;
  }
  if (!t2) return;
  for (const f of TRUONG_MAU) {
    const el2 = F(f);
    if (el2 && t2[f]) el2.value = t2[f];
  }
  const soThichEl = S.body.querySelector('[data-f="soThich"]');
  if (soThichEl && Array.isArray(t2.soThich)) soThichEl.value = t2.soThich.slice();
  D.paintNvThich(S.body);
  const sl = S.body.querySelector("[data-suggest]");
  if (sl) {
    const note = document.createElement("div");
    note.className = "hint mau-nv-note";
    note.textContent = "Đã điền mẫu “" + t2.ten + "”. Đặt tên và sửa lại theo ý bạn." +
      (t2.vaiBdsm && !batGk ? GHI_CHU_MAU_BDSM : "");
    sl.prepend(note);
  }
}
