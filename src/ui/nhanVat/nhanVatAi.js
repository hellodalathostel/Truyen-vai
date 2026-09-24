// Truyện Vai — Đợt 6b: phần AI của màn "Sửa nhân vật" (nghĩ hướng → chọn → viết chi tiết).
//
// Một quyết định đáng chú ý: có gửi lớp BDSM cho AI hay không. Câu trả lời KHÔNG chỉ dựa
// vào việc truyện đã bật giao kèo hay chưa — nếu người dùng vừa mở khối giao kèo ra thì coi
// như đang muốn dùng (`bdsmTrongEditor` trong `nhanVatForm.js`). Nhưng dù AI có viết phần
// đó, việc ghi cờ `nguoiLon` và bật giao kèo vẫn phải qua cửa 18+ riêng.

import { giaoKeoOf } from "../../store.js";
import { bdsmTrongEditor } from "./nhanVatForm.js";

export function lapAi(S) {
  const D = S.D;
  const F = S.F;

  const yTuong = () => F("nvYeuCau").value.trim() || F("ten").value.trim() || F("moTa").value.trim();
  const bdsmChoAi = () => {
    const khoi = S.body.querySelector("[data-gk-off]");
    return bdsmTrongEditor({ gkBat: !!giaoKeoOf(S.story).bat, moRong: !!(khoi && khoi.open) });
  };

  // Đổ kết quả AI vào form. Ô nào AI không trả về thì GIỮ NGUYÊN chữ người dùng đã gõ.
  S.dienNhanVat = (gen) => {
    if (gen.ten) F("ten").value = gen.ten;
    F("vaiTro").value = gen.vaiTro || F("vaiTro").value;
    F("moTa").value = gen.moTa || F("moTa").value;
    F("tinhCach").value = gen.tinhCach || F("tinhCach").value;
    F("cachNoi").value = gen.cachNoi || F("cachNoi").value;
    F("ghiChu").value = gen.ghiChu || F("ghiChu").value;
    if (gen.vaiBdsm && F("vaiBdsm")) F("vaiBdsm").value = gen.vaiBdsm;
    if (gen.danhXung && F("danhXung")) F("danhXung").value = gen.danhXung;
    if (gen.kinhNghiem && F("kinhNghiem")) F("kinhNghiem").value = gen.kinhNghiem;
    if (gen.phongCach && F("phongCach")) F("phongCach").value = gen.phongCach;
    if (gen.khauVi && F("khauVi")) F("khauVi").value = gen.khauVi;
    if (gen.gioiHan && F("gioiHan")) F("gioiHan").value = gen.gioiHan;
    if (gen.gioiHanCung && F("gioiHanCung")) F("gioiHanCung").value = gen.gioiHanCung;
    if (gen.luatRieng && F("luatRieng")) F("luatRieng").value = gen.luatRieng;
    if (gen.chamSocSau && F("chamSocSau")) F("chamSocSau").value = gen.chamSocSau;
    if (gen.tinHieuRieng && F("tinHieuRieng")) F("tinHieuRieng").value = gen.tinHieuRieng;
    if (Array.isArray(gen.soThich) && gen.soThich.length) {
      const soThichEl = S.body.querySelector('[data-f="soThich"]');
      if (soThichEl) soThichEl.value = gen.soThich.slice();
    }
    D.paintNvThich(S.body);
  };

  S.suKienAi = async (e, actName, status) => {
    const optChon = e.target.closest("[data-nv-opt-chon]");
    if (optChon) {
      await D.chonHuongNhanVat({
        scope: S.body,
        i: Number(optChon.dataset.nvOptChon),
        story: S.story,
        bdsm: bdsmChoAi(),
        yTuongGoc: yTuong(),
        status,
        onXong: async (gen) => { S.dienNhanVat(gen); },
      });
      return true;
    }
    if (actName === "char-ai") {
      await D.sinhHuongNhanVat({ story: S.story, yTuong: yTuong(), bdsm: bdsmChoAi(), scope: S.body, status });
      return true;
    }
    return false;
  };
}
