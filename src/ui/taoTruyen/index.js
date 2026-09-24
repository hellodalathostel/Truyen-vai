// Truyện Vai — Đợt 6b: màn "Cốt truyện mới" (bản vỏ).
//
// Vì sao tách: `openNewStoryModal` từng là một hàm 416 dòng. Nay nó chỉ DỰNG KHUNG + NỐI:
//
//   taoTruyenFlow.js    quyết định THUẦN (chế độ mặc định, ghép bối cảnh, dựng payload tạo truyện)
//   taoTruyenHtml.js    chuỗi HTML của ba khối
//   taoTruyenNhanh.js   nửa Tạo nhanh (dựng bản nháp → sửa → tạo truyện)
//   taoTruyenWizard.js  nửa Thiết lập nâng cao (4 bước)
//   ../cong18.js        cửa 18+ dùng chung (khi nào hỏi, câu chữ, mã danh sách đã xác nhận)
//
// DAG: tệp này (và mọi tệp trong `src/ui/`) ĐƯỢC import lõi; lõi KHÔNG BAO GIỜ import
// `src/ui/*`. `tests/node/goi-chung.test.mjs` ghim luật đó.
//
// `deps` (D) chỉ chứa những hàm CÒN LẠI của `app.js` (điều hướng, ghi dữ liệu, giao kèo,
// tiện ích). Mọi thứ khác lấy thẳng từ lõi để `deps` không phình thành một túi đồ nghề.

import { el, modal } from "../../dom.js";
import { giaoKeoMacDinh } from "../../store.js";
import { htmlThan } from "./taoTruyenHtml.js";
import { cheDoMacDinh } from "./taoTruyenFlow.js";
import { lapTaoNhanh } from "./taoTruyenNhanh.js";
import { lapWizard } from "./taoTruyenWizard.js";

export function openNewStoryModal(opts = {}, D) {
  const modes = (D.mauCotTruyen && D.mauCotTruyen()) || [];
  const theLoais = (D.theLoai && D.theLoai()) || [];
  const body = el("div", { class: "wizard" });
  body.innerHTML = htmlThan({ modes, theLoais, giaoKeoHtml: D.htmlGiaoKeo(giaoKeoMacDinh(), "wiz") });
  body.dataset.cachTao = "nhanh";

  const S = {
    D,
    body,
    modes,
    theLoais,
    mode: cheDoMacDinh(modes),
    val: (f) => {
      const e = body.querySelector('[data-f="' + f + '"]');
      return e ? e.value.trim() : "";
    },
    setVal: (f, v) => {
      const e = body.querySelector('[data-f="' + f + '"]');
      if (e) e.value = v;
    },
    // Bản nháp AI dùng tiền tố riêng (`data-qc-f`) để không lẫn với ô của wizard.
    qcVal: (f) => {
      const e = body.querySelector('[data-qc-f="' + f + '"]');
      return e ? e.value.trim() : "";
    },
    theLoaiNhanh: () => theLoais.find((t) => t.id === S.val("qcTheLoai")),
    theLoaiWizard: () => theLoais.find((t) => t.id === S.val("theLoai")),
  };

  const m = modal({
    title: "Cốt truyện mới",
    wide: true,
    body,
    dismissable: true,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: "Tạo cốt truyện", primary: true, onClick: (mm) => (body.dataset.cachTao === "nhanh" ? S.taoTruyenNhanh(mm) : S.taoTruyenWizard(mm)) },
    ],
  });

  // Khối giao kèo là tính năng riêng của app (không thuộc màn này) — chỉ gắn sự kiện cho nó.
  D.ganSuKienGiaoKeo(body, "wiz");
  lapTaoNhanh(S);
  lapWizard(S);

  body.addEventListener("click", async (e) => {
    const status = body.querySelector("[data-wiz-status]");
    const cach = e.target.closest(".create-method-btn[data-cach]");
    if (cach) {
      body.dataset.cachTao = cach.dataset.cach;
      D.$$(".cach-tao .create-method-btn", body).forEach((b) => b.classList.toggle("on", b === cach));
      D.$$("[data-pane]", body).forEach((p) => { p.hidden = p.dataset.pane !== cach.dataset.cach; });
      return;
    }
    if (e.target.closest('[data-act="qc-dung"]')) {
      await S.dungBanNhap();
      return;
    }
    const card = e.target.closest(".mode-card");
    if (card) {
      S.mode = card.dataset.mode;
      D.$$(".mode-card", body).forEach((c) => c.classList.toggle("on", c === card));
      return;
    }
    const optChon = e.target.closest("[data-nv-opt-chon]");
    if (optChon) {
      await S.chonHuongWizard(Number(optChon.dataset.nvOptChon), status);
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "wiz-suggest") {
      await S.goiYBoiCanh(status);
    }
    if (act.dataset.act === "wiz-character") {
      await S.wizNhanVatDauTien(status);
      return;
    }
  });
}
