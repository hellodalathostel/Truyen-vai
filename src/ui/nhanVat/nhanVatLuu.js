// Truyện Vai — Đợt 6b: phần LƯU của màn "Sửa nhân vật".
//
// `luuNhanVat` là đường vào nội dung người lớn thứ hai của màn này (ô tích "Người trưởng
// thành (18+)"). Hai luật 18+ được áp ở đây, cả hai đều là hàm thuần trong `nhanVatForm.js`:
//   1. tuổi số dưới 18 LUÔN thắng ô tích; thiếu tuổi KHÔNG phải là người lớn;
//   2. hồ sơ ngoại hình đã khai tuổi ⇒ tuổi nhân vật lấy theo hồ sơ (tuổi khai báo thắng ảnh).
//
// NHÂN VẬT TRONG TRUYỆN KHÔNG BỊ SỬA cho tới khi ghi thành công — kể cả khi đổi liên kết hồ
// sơ ngoại hình. Không có bản nháp (`S.nhap`) thì bấm Huỷ vẫn làm đổi `nhanVats[].ngoaiHinhId`,
// và lần lưu truyện sau đó (một thao tác khác) sẽ ghi luôn thay đổi mà người dùng tưởng đã huỷ.

import { toast } from "../../dom.js";
import { getNgoaiHinh, tuoiSo } from "../../store.js";
import { chotNguoiLon, tenSauKhiLuu, tuoiTheoHoSo, soThichTuChuoi } from "./nhanVatForm.js";

// [tên trường, có cắt khoảng trắng không] — đúng thứ tự và đúng kiểu cắt của bản cũ.
const TRUONG_GIAO_KEO = [
  ["vaiBdsm", false], ["danhXung", true], ["kinhNghiem", false], ["phongCach", false],
  ["khauVi", true], ["gioiHan", true], ["gioiHanCung", true], ["luatRieng", true],
  ["chamSocSau", true], ["tinHieuRieng", true],
];

// Đọc form vào bản nháp `S.nhap`. Trả về bản nháp (đã áp hai luật tuổi ở trên).
export function docForm(S) {
  const F = S.F;
  const nv = S.nhap;
  nv.ten = tenSauKhiLuu(F("ten").value);
  nv.vaiTro = F("vaiTro").value.trim();
  nv.moTa = F("moTa").value.trim();
  nv.tinhCach = F("tinhCach").value.trim();
  nv.cachNoi = F("cachNoi").value.trim();
  nv.ghiChu = F("ghiChu").value.trim();
  if (F("tuoi")) nv.tuoi = F("tuoi").value.trim();
  if (F("nguoiLon")) nv.nguoiLon = F("nguoiLon").checked;
  // Tuổi số dưới 18 luôn THẮNG ô tích. Thiếu tuổi cũng không phải là người lớn: chỉ
  // cờ `nguoiLon` do người dùng tự tích mới tính.
  nv.nguoiLon = chotNguoiLon({ tuoi: tuoiSo(nv), nguoiLon: nv.nguoiLon });
  // Liên kết hồ sơ ngoại hình (ID ổn định) + biệt danh chỉ thuộc truyện này.
  if (F("ngoaiHinhId")) nv.ngoaiHinhId = F("ngoaiHinhId").value;
  if (F("bietDanh")) nv.bietDanh = F("bietDanh").value.trim();
  // Một người chỉ có MỘT tuổi khai báo: hồ sơ đã khai tuổi thì tuổi nhân vật theo hồ
  // sơ (ảnh trông trưởng thành không thay cho tuổi khai báo). Áp lại cửa 18+ ngay.
  {
    const hSo = nv.ngoaiHinhId ? getNgoaiHinh(nv.ngoaiHinhId) : null;
    const tuoiHoSo = tuoiTheoHoSo(hSo);
    if (tuoiHoSo !== null) {
      nv.tuoi = tuoiHoSo;
      if (F("tuoi")) F("tuoi").value = nv.tuoi;
      nv.nguoiLon = chotNguoiLon({ tuoi: tuoiSo(nv), nguoiLon: nv.nguoiLon });
      if (F("nguoiLon")) F("nguoiLon").checked = !!nv.nguoiLon;
    }
  }
  for (const [f, catKhoangTrang] of TRUONG_GIAO_KEO) {
    const el2 = F(f);
    if (el2) nv[f] = catKhoangTrang ? el2.value.trim() : el2.value;
  }
  const soThichEl = S.body.querySelector('[data-f="soThich"]');
  if (soThichEl) nv.soThich = soThichTuChuoi(soThichEl.value, true);
  return nv;
}

export async function luuNhanVat(S) {
  const D = S.D;
  const nv = docForm(S);
  const c = S.c;
  // ---- Chỉ từ đây mới chạm vào nhân vật thật ----
  const banTruoc = S.isNew ? null : JSON.parse(JSON.stringify(c));
  if (S.isNew) S.story.nhanVats.push(nv);
  else {
    for (const k in c) delete c[k];
    Object.assign(c, JSON.parse(JSON.stringify(nv)));
  }
  if (!(await D.luuTruyen(S.story, "nhân vật"))) {
    // Ghi hỏng ⇒ trả nhân vật về đúng trạng thái trước khi sửa, và KHÔNG đóng modal
    // / không báo "đã lưu" (chỗ gọi chỉ đóng khi hàm này trả true). Bản nháp vẫn giữ
    // nguyên chữ người dùng đã gõ để họ bấm Lưu lại.
    if (S.isNew) S.story.nhanVats = S.story.nhanVats.filter((x) => x !== nv);
    else {
      for (const k in c) delete c[k];
      Object.assign(c, banTruoc);
    }
    return false;
  }
  toast(S.isNew ? "Đã thêm nhân vật " + c.ten : "Đã lưu nhân vật.");
  D.render();
  if (S.opts.onSaved) {
    try { S.opts.onSaved(c); } catch (e) { console.error(e); }
  }
  return true;
}
