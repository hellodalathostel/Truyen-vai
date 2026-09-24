// Truyện Vai — Đợt 6b: nửa "Tạo nhanh" của màn Cốt truyện mới (một prompt ⇒ AI dựng bản nháp).
//
// Ba việc: dựng bản nháp (AI), vẽ bản nháp thành form sửa được, và tạo truyện từ bản nháp.
//
// CỬA 18+ LÀ PHẦN QUAN TRỌNG NHẤT CỦA TỆP NÀY — Tạo nhanh không được là đường vòng qua cửa
// 18+. Cả hai lối vào đều hỏi trước khi ghi lớp BDSM: (1) chọn thể loại BDSM / tích ô "giao
// kèo" rồi bấm "Dựng bản nháp"; (2) lúc bấm "Tạo cốt truyện" (vì người dùng có thể vừa tích
// ô đó SAU khi bản nháp đã dựng xong). Mọi quyết định + câu chữ nằm ở `../cong18.js` và
// `taoTruyenFlow.js`; ở đây chỉ đọc/ghi DOM và gọi.

import * as AI from "../../ai.js";
import { toast } from "../../dom.js";
import { createStory, newCharacter, giaoKeoMacDinh, chanNoiDungNguoiLon, xacNhanMoiNguoiLon } from "../../store.js";
import { htmlBanNhap } from "./taoTruyenHtml.js";
import { locNhanVatCoTen, payloadTaoNhanh } from "./taoTruyenFlow.js";
import {
  coBdsm, patchGiaoKeoBanNhap, patchGiaoKeoTaoNhanh, LY_DO_NHANH_DUNG_BAN_NHAP,
  LY_DO_NHANH_TAO_TRUYEN, LOI_TU_CHOI_DANH_SACH, GHI_CHU_NHANH_KHONG_BDSM,
  maDanhSach, canHoiLaiDanhSach, loiTuChoiTaoNhanh,
} from "../cong18.js";

export function lapTaoNhanh(S) {
  const D = S.D;
  const oTichBdsm = () => S.body.querySelector('[data-f="qcbdsm"]');
  const doiBdsm = () => coBdsm({ theLoai: S.theLoaiNhanh(), tich: !!(oTichBdsm() || {}).checked });

  S.paintQcKetQua = () => {
    const box = S.body.querySelector("[data-qc-kq]");
    const q = S.body.__qcKq;
    if (!box) return;
    if (!q) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = htmlBanNhap(q);
  };

  S.docQcKetQua = () => {
    const q = S.body.__qcKq || {};
    const nhanVats = locNhanVatCoTen(
      (q.nhanVats || []).map((c, i) => {
        const card = S.body.querySelector('[data-qc-nv="' + i + '"]');
        if (!card) return c;
        const g = (f) => {
          const e = card.querySelector('[data-qc-nv-f="' + f + '"]');
          return e ? e.value.trim() : c[f] || "";
        };
        return Object.assign({}, c, { ten: g("ten"), vaiTro: g("vaiTro"), moTa: g("moTa"), tinhCach: g("tinhCach") });
      })
    );
    return Object.assign({}, q, {
      ten: S.qcVal("ten") || q.ten,
      moTa: S.qcVal("moTa"),
      boiCanh: S.qcVal("boiCanh"),
      luat: S.qcVal("luat"),
      nguoiChoiTen: S.qcVal("nguoiChoiTen") || "Bạn",
      nguoiChoiMoTa: S.qcVal("nguoiChoiMoTa"),
      mucTieu: S.qcVal("mucTieu"),
      nhanVats,
    });
  };

  S.dungBanNhap = async () => {
    const st = S.body.querySelector("[data-qc-status]");
    const nut = S.body.querySelector('[data-act="qc-dung"]');
    const tl = S.theLoaiNhanh();
    const doi = doiBdsm();
    let dungBdsm = doi;
    let ghiChu18 = "";
    if (doi && !S.body.__qc18) {
      const dongY = await D.xacNhan18Plus(LY_DO_NHANH_DUNG_BAN_NHAP);
      S.body.__qc18 = dongY;
      S.body.__qc18Ds = ""; // bản nháp chưa biết tên nhân vật ⇒ lúc TẠO sẽ liệt kê lại
      if (!dongY) {
        dungBdsm = false;
        const cb = oTichBdsm();
        if (cb) cb.checked = false;
        ghiChu18 = GHI_CHU_NHANH_KHONG_BDSM;
      }
    }
    if (!doi) S.body.__qc18 = false;
    st.textContent = "Đang dựng bản nháp…";
    if (nut) nut.disabled = true;
    try {
      const kq = await AI.generateQuickStory({
        yTuong: S.val("qcYTuong"),
        theLoai: tl,
        soNhanVat: Number(S.val("qcSoNv")) || 3,
        bdsm: dungBdsm,
        giaoKeo: dungBdsm ? Object.assign(giaoKeoMacDinh(), patchGiaoKeoBanNhap({ bat: true, theLoai: tl })) : null,
      });
      S.body.__qcKq = kq;
      S.paintQcKetQua();
      const kqBox = S.body.querySelector("[data-qc-kq]");
      if (kqBox && kqBox.scrollIntoView) kqBox.scrollIntoView({ block: "start" });
      st.textContent = ghiChu18 || "Xong — đọc lại và sửa nếu muốn.";
    } catch (e) {
      st.textContent = "";
      toast(e.message || "Không dựng được bản nháp.", "error");
    }
    if (nut) nut.disabled = false;
  };

  S.taoTruyenNhanh = async (m) => {
    if (!S.body.__qcKq) {
      toast("Hãy bấm “Dựng bản nháp” trước.", "error");
      return;
    }
    const q = S.docQcKetQua();
    if (!q.ten) {
      toast("Bản nháp chưa có tên truyện.", "error");
      return;
    }
    const tl = S.theLoaiNhanh();
    const doi = doiBdsm();
    let dongY18 = !!S.body.__qc18;
    if (doi && !dongY18) {
      dongY18 = await D.xacNhan18Plus(LY_DO_NHANH_TAO_TRUYEN);
      S.body.__qc18 = dongY18;
    }
    // Từ chối cửa 18+ ⇒ KHÔNG tạo truyện (giữ hộp mở để người dùng bỏ tích hoặc xác nhận lại).
    if (doi && !dongY18) {
      toast(loiTuChoiTaoNhanh(tl), "error");
      return;
    }
    const giaoKeo = Object.assign(giaoKeoMacDinh(), patchGiaoKeoTaoNhanh({ bat: doi && dongY18, theLoai: tl }));
    const nhanVats = (q.nhanVats || []).map((c) =>
      newCharacter(Object.assign({}, c, { mau: D.mauChoices[Math.floor(Math.random() * D.mauChoices.length)] }))
    );
    if (giaoKeo.bat && !(await xinXacNhanGhiCo(S, nhanVats, giaoKeo))) return;
    const lyDoKhoa = chanNoiDungNguoiLon({ nhanVats });
    if (lyDoKhoa) {
      giaoKeo.bat = false;
      toast(lyDoKhoa, "error");
    }
    let story;
    try {
      story = await createStory(payloadTaoNhanh({ q, tl, giaoKeo, nhanVats }));
    } catch (e) {
      D.baoLoiLuu(e, "cốt truyện mới");
      return;
    }
    m.close();
    toast("Đã tạo cốt truyện “" + story.ten + "” với " + nhanVats.length + " nhân vật.");
    await D.openStory(story.id, null);
  };
}

// Người dùng vừa xác nhận 18+ cho cả truyện ⇒ ghi cờ tường minh cho từng nhân vật TRƯỚC khi
// mở cổng — nhưng phải liệt kê ĐÚNG danh sách sẽ được ghi (xác nhận ở bước dựng bản nháp
// chưa biết tên nhân vật, nên lúc TẠO phải hỏi lại nếu danh sách khác). Trả về false khi
// người dùng từ chối — chỗ gọi phải DỪNG, không được tạo truyện.
async function xinXacNhanGhiCo(S, nhanVats, giaoKeo) {
  const D = S.D;
  const phaiHoiLai = canHoiLaiDanhSach({ dongY18: !!S.body.__qc18, maDaXacNhan: S.body.__qc18Ds, nhanVats });
  if (phaiHoiLai) {
    const xac = await D.xacNhan18PlusTruyen(LY_DO_NHANH_TAO_TRUYEN, nhanVats);
    if (!xac.dongY) {
      giaoKeo.bat = false;
      toast(LOI_TU_CHOI_DANH_SACH, "error");
      return false;
    }
    S.body.__qc18 = true;
    S.body.__qc18Ds = maDanhSach(nhanVats);
  }
  xacNhanMoiNguoiLon({ nhanVats });
  return true;
}
