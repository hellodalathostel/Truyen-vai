// Màn "Sửa hồ sơ ngoại hình" — VỎ (Đợt 6d).
//
// Đây là màn DUY NHẤT vừa TẠO vừa SỬA hồ sơ ngoại hình. Ba điểm KHÔNG được đổi:
//   • Ảnh nằm trong form chưa phải là ảnh đã lưu — `anhTam` chỉ là bản tạm cho tới khi bấm nút chính.
//   • Lưu hỏng ⇒ GIỮ NGUYÊN form (nội dung vừa nhập còn nguyên) để người dùng bấm lại.
//   • Lỗi AI ⇒ KHÔNG mất bản nháp người dùng đang có.
// Câu chữ nằm ở `suaNgoaiHinhFlow.js`, chuỗi form ở `suaNgoaiHinhHtml.js`; những hàm CÒN LẠI của
// app (hỏi xác nhận, vẽ lại màn, thu nhỏ ảnh) đi qua bảng phụ thuộc.
import { el, modal, $$, icon, toast } from "../../dom.js";
import { store, getNgoaiHinh, newNgoaiHinh, luuNgoaiHinh, thongDiepLuu, laDataUrlAnh } from "../../store.js";
import { demLienKetNgoaiHinh, boBanDichCu } from "../../ngoaiHinh.js";
import * as AI from "../../ai.js";
import { htmlForm } from "./suaNgoaiHinhHtml.js";
import {
  CANH_BAO_ANH_GUI_AI, DANG_SOAN, DANG_THU_NHO, LOI_DOC_ANH, LOI_DOC_ANH_PT, LOI_THIEU_MO_TA,
  LOI_THIEU_TEN, NH_MAX_ANH, THONG_BAO_BO_ANH, TOAST_LUU, TOAST_TAO,
  cauDaDienBanNhap, cauDiemCanChon, cauDiemCanhBao, cauLoiAi, giaTriDienThem, hoiGhiDeMoTa,
  nhanNutChinh, nhanNutAnh, tieuDeModal,
} from "./suaNgoaiHinhFlow.js";

function setStatus(S, s) {
  if (S.statusEl) S.statusEl.textContent = s || "";
}

function setBusy(S, b) {
  S.busy = b;
  $$("[data-nh-act]", S.body).forEach((x) => { x.disabled = b; });
  $$("input, textarea", S.body).forEach((x) => { x.disabled = b; });
}

// Nhãn nút, khung xem trước và dòng cảnh báo luôn phải khớp trạng thái ảnh hiện tại (thêm ↔ đổi ↔ bỏ).
function paintAnh(S) {
  const box = S.body.querySelector("[data-nh-anh-box]");
  if (!box) return;
  const nutChon = S.body.querySelector('[data-nh-act="nh-chon-anh"]');
  if (nutChon) nutChon.innerHTML = icon("image", 14) + nhanNutAnh(!!S.anhTam);
  box.innerHTML = "";
  if (!S.anhTam) {
    box.hidden = true;
    const nutXoa = S.body.querySelector('[data-nh-act="nh-xoa-anh"]');
    if (nutXoa) nutXoa.hidden = true;
    return;
  }
  box.hidden = false;
  const img = document.createElement("img");
  img.className = "nh-anh-preview";
  img.alt = "";
  img.src = S.anhTam; // đã qua laDataUrlAnh()
  box.appendChild(img);
  const nutXoa = S.body.querySelector('[data-nh-act="nh-xoa-anh"]');
  if (nutXoa) nutXoa.hidden = false;
  S.canhBaoEl.textContent = CANH_BAO_ANH_GUI_AI;
}

async function luuForm(S) {
  if (S.busy) return false;
  const ten = S.F("nhTen").value.trim();
  if (!ten) {
    setStatus(S, LOI_THIEU_TEN);
    S.F("nhTen").focus();
    return false;
  }
  // Sửa ngoại hình ⇒ bản dịch tiếng Anh cũ không còn đúng nữa, bỏ đi để dịch lại
  // (`boBanDichCu`). Không bỏ thì prompt ảnh sẽ dùng bản dịch của chữ người dùng vừa xoá.
  const ban = boBanDichCu(
    S.h,
    Object.assign({}, S.h, {
      tenChinh: ten,
      tuoi: S.F("nhTuoi").value.trim(),
      moTa: S.F("nhMoTa").value.trim(),
      tranh: S.F("nhTranh").value.trim(),
      anh: S.anhTam || "",
    })
  );
  try {
    await luuNgoaiHinh(ban);
  } catch (e) {
    // Ghi hỏng ⇒ GIỮ NGUYÊN form (nội dung vừa nhập vẫn còn) để bấm lại.
    setStatus(S, thongDiepLuu(e, "hồ sơ ngoại hình"));
    return false;
  }
  toast(S.laMoi ? TOAST_TAO : TOAST_LUU);
  if (S.onXong) S.onXong();
  else S.D.render();
  return true;
}

function chonAnh(S) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    setStatus(S, DANG_THU_NHO);
    const url = await S.D.thuNhoAnh(f, NH_MAX_ANH);
    const ok = laDataUrlAnh(url);
    if (!ok) {
      setStatus(S, LOI_DOC_ANH);
      return;
    }
    S.anhTam = ok;
    paintAnh(S);
    setStatus(S, "");
  };
  inp.click();
}

async function taoBanNhap(S) {
  if (S.busy) return;
  const moTa = S.F("nhYeuCau").value.trim();
  if (!moTa && !S.anhTam) {
    setStatus(S, LOI_THIEU_MO_TA);
    return;
  }
  setBusy(S, true);
  setStatus(S, DANG_SOAN);
  try {
    let blob = null;
    if (S.anhTam) {
      try {
        blob = await (await fetch(S.anhTam)).blob();
      } catch (e) {
        blob = null;
        setStatus(S, LOI_DOC_ANH_PT);
      }
    }
    const out = await AI.phacNgoaiHinh({ moTa, anhBlob: blob });
    // Ô nào ĐANG TRỐNG thì AI được điền thêm; ô có chữ thì giữ nguyên (trừ mô tả, hỏi riêng bên dưới).
    const dien = (o, giaTri) => {
      const v = giaTriDienThem(S.F(o).value, giaTri);
      if (v !== null) S.F(o).value = v;
    };
    dien("nhTen", out.tenChinh);
    dien("nhTuoi", out.tuoi);
    // Mô tả ngoại hình: hỏi trước khi ghi đè nội dung người dùng đã gõ tay.
    if (out.moTa) {
      if (S.F("nhMoTa").value.trim()) {
        const q = hoiGhiDeMoTa();
        const dongY = await S.D.hoiXacNhan(q[0], q[1], q[2]);
        if (dongY) S.F("nhMoTa").value = out.moTa;
      } else {
        S.F("nhMoTa").value = out.moTa;
      }
    }
    dien("nhTranh", out.tranh);
    setStatus(S, cauDaDienBanNhap(S.laMoi));
    if (out.xungDot) {
      setStatus(S, cauDiemCanChon(out.xungDot));
      S.canhBaoEl.textContent = cauDiemCanhBao(out.xungDot);
    }
  } catch (e) {
    // Lỗi AI ⇒ KHÔNG mất bản nháp người dùng đang có.
    setStatus(S, cauLoiAi(e));
  }
  setBusy(S, false);
}

// Mở sẵn / đóng khối AI rồi đưa con trỏ đúng ô, theo lối vào mà app gọi.
function apDungFocus(S, opts) {
  if (opts.focusYeuCau) {
    const d = S.body.querySelector("[data-nh-ai]");
    if (d) d.open = true;
    setTimeout(() => { const y = S.F("nhYeuCau"); if (y) y.focus(); }, 80);
  } else if (opts.focusAnh) {
    const d = S.body.querySelector("[data-nh-ai]");
    if (d) d.open = false;
  }
}

export function openSuaNgoaiHinh(id, onXong, opts = {}, D = {}) {
  const h = id ? getNgoaiHinh(id) : newNgoaiHinh();
  if (!h) return;
  const laMoi = !id;
  const soLienKet = laMoi ? 0 : demLienKetNgoaiHinh(store.stories, h.id);
  const body = el("div", { class: "nh-form" });
  const S = {
    D, h, laMoi, body, onXong,
    anhTam: laDataUrlAnh(h.anh), // ảnh tham chiếu đang giữ trong form (chưa lưu)
    busy: false, statusEl: null, canhBaoEl: null,
  };
  body.innerHTML = htmlForm(laMoi, soLienKet, !!S.anhTam);
  modal({
    title: tieuDeModal(laMoi),
    wide: true,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: nhanNutChinh(laMoi), primary: true, onClick: async (mm) => { if (await luuForm(S)) mm.close(); } },
    ],
  });
  S.F = (f) => body.querySelector('[data-f="' + f + '"]');
  S.statusEl = body.querySelector("[data-nh-status]");
  S.canhBaoEl = body.querySelector("[data-nh-canhbao]");
  S.F("nhTen").value = h.tenChinh || "";
  S.F("nhTuoi").value = h.tuoi || "";
  S.F("nhMoTa").value = h.moTa || "";
  S.F("nhTranh").value = h.tranh || "";
  paintAnh(S);
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-nh-act]");
    if (!b || S.busy) return;
    const a = b.dataset.nhAct;
    if (a === "nh-chon-anh") chonAnh(S);
    else if (a === "nh-xoa-anh") {
      S.anhTam = "";
      paintAnh(S);
      setStatus(S, THONG_BAO_BO_ANH);
    } else if (a === "nh-ban-nhap") taoBanNhap(S);
  });
  apDungFocus(S, opts);
}
