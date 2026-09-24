// Truyện Vai — Đợt 6b: khối "liên kết hồ sơ ngoại hình" của màn "Sửa nhân vật".
//
// Khối này được DỰNG LẠI mỗi khi thư viện ngoại hình đổi (thêm/sửa hồ sơ) để danh sách
// <option> luôn khớp thư viện hiện tại. Vì dựng lại là tạo DOM mới, phải giữ lại biệt danh
// người dùng đang gõ dở.
//
// Quyết định đáng chú ý (ở `nhanVatForm.js`): hồ sơ đã khai tuổi thì tuổi nhân vật sẽ lấy
// theo hồ sơ lúc LƯU — khối này nói trước điều đó, ngay tại chỗ, thay vì để người dùng phát
// hiện sau khi bấm Lưu.

import { el } from "../../dom.js";
import { dsNgoaiHinh, getNgoaiHinh, tuoiSo } from "../../store.js";
import { tenHoSo } from "../../ngoaiHinh.js";
import { goiYTuoiText } from "./nhanVatForm.js";

export function lapLienKet(S) {
  const D = S.D;
  const F = S.F;

  S.capNhatGoiYTuoi = () => {
    const hint = S.body.querySelector("[data-nh-link-hint]");
    if (!hint) return;
    const sel = S.body.querySelector('[data-f="ngoaiHinhId"]');
    const h = sel && sel.value ? getNgoaiHinh(sel.value) : null;
    hint.textContent = goiYTuoiText({
      tenHoSo: h ? tenHoSo(h) : "",
      tuoiHoSo: h ? tuoiSo({ tuoi: h.tuoi }) : null,
      tuoiForm: tuoiSo({ tuoi: F("tuoi") ? F("tuoi").value : "" }),
      coThuVien: dsNgoaiHinh().length > 0,
    });
  };

  S.lamMoiLienKet = () => {
    const cu = S.body.querySelector(".nh-link");
    // Dựng lại khối liên kết là tạo DOM mới ⇒ phải giữ lại biệt danh đang gõ dở.
    // (Không nhúng biệt danh vào htmlLienKetNgoaiHinh vì mỗi lần đổi hồ sơ lại dựng
    // lại, nhúng vào thì chữ người dùng vừa gõ sẽ bị ghi đè.)
    const bdCu = cu ? cu.querySelector('[data-f="bietDanh"]') : null;
    const bietDanhCu = bdCu ? bdCu.value : "";
    const tmp = el("div");
    tmp.innerHTML = D.htmlLienKetNgoaiHinh(S.nhap);
    if (cu) cu.replaceWith(tmp.firstElementChild);
    else S.body.insertBefore(tmp.firstElementChild, S.body.querySelector('[data-f="tinhCach"]'));
    const bdMoi = S.body.querySelector('[data-f="bietDanh"]');
    if (bdMoi) bdMoi.value = bietDanhCu;
    D.dienLienKetNgoaiHinh(S.body, S.nhap);
    S.capNhatGoiYTuoi();
    const sel = S.body.querySelector('[data-f="ngoaiHinhId"]');
    if (sel) {
      sel.addEventListener("change", () => {
        // Chỉ đổi LIÊN KẾT TRÊN BẢN NHÁP. Nhân vật trong truyện chỉ được cập nhật khi
        // bấm Lưu thành công — bấm Huỷ không được để lại thay đổi nào.
        S.nhap.ngoaiHinhId = sel.value;
        D.dienLienKetNgoaiHinh(S.body, S.nhap);
        S.capNhatGoiYTuoi();
      });
    }
  };
}
