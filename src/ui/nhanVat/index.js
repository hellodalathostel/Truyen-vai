// Truyện Vai — Đợt 6b: màn "Thêm/Sửa nhân vật" (bản vỏ).
//
// Vì sao tách: `openCharacterEditor` từng là một hàm 537 dòng. Nay nó chỉ DỰNG KHUNG + NỐI:
//
//   nhanVatForm.js    quyết định THUẦN (tuổi khoá ô 18+, tuổi thắng ô tích, tuổi theo hồ sơ,
//                     câu chữ lời nhắc — KHÔNG DOM, có test Node riêng)
//   nhanVatHtml.js    chuỗi HTML của form (gồm hai dạng khối giao kèo)
//   ../cong18.js      cửa 18+ dùng chung (câu chữ, danh sách được ghi cờ / bị chặn)
//   nhanVatAvatar.js  ảnh đại diện (chữ / biểu tượng / ảnh tải lên / ảnh AI)
//   nhanVatLienKet.js khối liên kết hồ sơ ngoại hình + lời nhắc tuổi
//   nhanVatMau.js     nút "bắt đầu từ một mẫu có sẵn"
//   nhanVatAi.js      "Tạo bằng AI" (nghĩ hướng → chọn → viết chi tiết)
//   nhanVatGiaoKeo.js nút "Bật giao kèo cho truyện này" (qua cửa 18+)
//   nhanVatLuu.js     bấm Lưu (áp cửa 18+ lần cuối, ghi hỏng thì trả nguyên trạng)
//   nhanVatThe.js     thẻ nhân vật SillyTavern: nhập/xuất + điền form (Giai đoạn 9)
//
// DAG: tệp này (và mọi tệp trong `src/ui/`) ĐƯỢC import lõi; lõi KHÔNG BAO GIỜ import
// `src/ui/*`. `tests/node/goi-chung.test.mjs` ghim luật đó.
//
// `deps` (D) chỉ chứa những hàm CÒN LẠI của `app.js` (điều hướng, ghi dữ liệu, giao kèo,
// tiện ích). Mọi thứ khác lấy thẳng từ lõi.

import { el, modal, toast } from "../../dom.js";
import { getNgoaiHinh, tuoiSo, newCharacter, charById, giaoKeoOf } from "../../store.js";
import { htmlThan, htmlMauNhanVat } from "./nhanVatHtml.js";
import { khoaNguoiLonTheoTuoi, soThichTuChuoi, doiSoThich } from "./nhanVatForm.js";
import { lapAvatar, taoAnhDaiDien } from "./nhanVatAvatar.js";
import { lapLienKet } from "./nhanVatLienKet.js";
import { lapAi } from "./nhanVatAi.js";
import { apMauNhanVat } from "./nhanVatMau.js";
import { batGiaoKeo } from "./nhanVatGiaoKeo.js";
import { luuNhanVat } from "./nhanVatLuu.js";
import { dienForm, lapThe } from "./nhanVatThe.js";

export function openCharacterEditor(charId, opts = {}, D) {
  const story = D.currentStory();
  if (!story) return;
  const isNew = !charId;
  const mauNgauNhien = () => D.mauChoices[Math.floor(Math.random() * D.mauChoices.length)];
  // BẢN NHÁP của form. Nhân vật trong truyện KHÔNG bị sửa cho tới khi lưu thành công —
  // kể cả khi đổi liên kết hồ sơ ngoại hình.
  const c = isNew ? newCharacter({ mau: mauNgauNhien() }) : charById(story, charId);
  if (!c) return;
  const nhap = JSON.parse(JSON.stringify(c));
  const gkBat = !!giaoKeoOf(story).bat;

  const body = el("div", { class: "char-editor" });
  body.innerHTML = htmlThan({
    gkBat,
    thichChips: D.htmlThichChipsNv(nhap),
    lienKetHtml: D.htmlLienKetNgoaiHinh(nhap),
    avatarHtml: D.avatarHtml(story, nhap, 72),
  });

  const S = { D, story, c, nhap, isNew, opts, body, gkBat, F: (f) => body.querySelector('[data-f="' + f + '"]') };
  const F = S.F;

  const m = modal({
    title: isNew ? "Thêm nhân vật" : "Sửa nhân vật",
    wide: true,
    body,
    actions: [
      ...(isNew ? [] : [{ label: "Xoá", danger: true, onClick: (mm) => { mm.close(); D.xoaNhanVat(c.id); } }]),
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: isNew ? "Thêm nhân vật" : "Lưu", primary: true, onClick: async (mm) => { if (await luuNhanVat(S)) mm.close(); } },
    ],
  });
  S.m = m;

  {
    // Tuổi số dưới 18 ⇒ KHOÁ CỨNG: bỏ tích và không cho tích lại. Bỏ trống tuổi thì
    // không mặc định là người lớn — người dùng phải tự xác nhận.
    const tuoiEl = F("tuoi");
    const nlEl = F("nguoiLon");
    const dongBoTuoi = () => {
      if (!nlEl) return;
      const kq = khoaNguoiLonTheoTuoi(tuoiSo({ tuoi: tuoiEl ? tuoiEl.value : "" }));
      if (kq.boTich) nlEl.checked = false;
      nlEl.disabled = kq.tre;
      nlEl.title = kq.title;
    };
    if (tuoiEl) tuoiEl.addEventListener("input", dongBoTuoi);
    dongBoTuoi();
  }
  lapAvatar(S);
  lapLienKet(S);
  lapAi(S);
  lapThe(S);
  // Điền form từ bản nháp — cùng một đường cho lúc mở màn và sau khi nhập thẻ.
  dienForm(S);
  {
    const sl = body.querySelector("[data-suggest]");
    if (sl) sl.innerHTML = htmlMauNhanVat((D.mauNhanVat && D.mauNhanVat()) || []);
  }

  body.addEventListener("click", async (e) => {
    const status = body.querySelector("[data-status]");
    const act = e.target.closest("[data-act]");
    const actName = act ? act.dataset.act : "";

    if (actName === "enable-giao-keo") {
      await batGiaoKeo(S, act);
      return;
    }
    if (await S.suKienThe(e, actName)) return;
    const nvThich = e.target.closest("[data-nv-thich]");
    if (nvThich) {
      bamThich(S, nvThich);
      return;
    }
    const mauNv = e.target.closest("[data-mau-nv]");
    if (mauNv) {
      apMauNhanVat(S, mauNv);
      return;
    }
    if (S.suKienAvatar(e, actName)) return;
    if (await S.suKienAi(e, actName, status)) return;
    if (actName === "open-ngoai-hinh") {
      // Thư viện mở đè lên editor; đóng lại thì dựng lại danh sách liên kết.
      D.openNgoaiHinh(S.lamMoiLienKet);
      return;
    }
    if (actName === "edit-ngoai-hinh") {
      D.openSuaNgoaiHinh(act.dataset.id, S.lamMoiLienKet);
      return;
    }
    if (actName === "dong-ten-ngoai-hinh") {
      dongTenTheoHoSo(S);
      return;
    }
    if (actName === "char-avatar-ai") {
      await taoAnhDaiDien(S, status);
    }
  });

  if (opts.focusTen) setTimeout(() => F("ten").focus(), 60);
}

// Bật/tắt một chip "điều nhân vật thích": ô ẩn `soThich` giữ danh sách id, chip chỉ phản
// ánh trạng thái — nguồn sự thật vẫn là ô ẩn.
function bamThich(S, nut) {
  const hidden = S.body.querySelector('[data-f="soThich"]');
  if (!hidden) return;
  const id = nut.dataset.nvThich;
  const ds = soThichTuChuoi(hidden.value, false);
  hidden.value = doiSoThich(ds, id).join(",");
  nut.classList.toggle("on", ds.indexOf(id) < 0);
}

// Đồng bộ tên nhân vật theo TÊN CHÍNH của hồ sơ — chỉ điền vào form, người dùng vẫn phải
// bấm Lưu; tin nhắn cũ không bị sửa (app không viết lại lịch sử).
function dongTenTheoHoSo(S) {
  const sel = S.F("ngoaiHinhId");
  const h2 = sel && sel.value ? getNgoaiHinh(sel.value) : null;
  if (!h2 || !h2.tenChinh) return;
  S.F("ten").value = h2.tenChinh;
  S.D.dienLienKetNgoaiHinh(S.body, S.nhap);
  toast("Đã điền tên theo hồ sơ — bấm Lưu để áp dụng.");
}
