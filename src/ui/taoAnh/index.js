// Truyện Vai — Giai đoạn 6: màn "Dựng ảnh cho cảnh này" (bản vỏ).
//
// Vì sao tách: `openTaoAnh` từng là một hàm 566 dòng — quá dài để đọc, không kiểm được ở
// tầng Node, và mỗi lần sửa là một lần mò. Nay nó chỉ còn DỰNG KHUNG + NỐI CÁC MẢNH:
//
//   taoAnhFlow.js   quyết định thuần (chọn hồ sơ, cổng 18+, nút, prompt, bản ghi ảnh)
//   taoAnhHtml.js   chuỗi HTML của từng khối
//   taoAnhChon.js   khu "Nhân vật trong khung hình" + dịch ngoại hình
//   taoAnhDung.js   "Viết lại" + "Dựng khung hình"
//   taoAnhLuu.js    "Đưa vào truyện"
//
// DAG: tệp này (và mọi tệp trong `src/ui/`) ĐƯỢC import lõi; lõi KHÔNG BAO GIỜ import
// `src/ui/*`. `tests/node/goi-chung.test.mjs` ghim luật đó.
//
// `deps` (D) chỉ chứa những hàm CÒN LẠI của `app.js` (điều hướng, ghi dữ liệu, tiện ích
// của app). Mọi thứ khác lấy thẳng từ lõi để `deps` không phình thành một túi đồ nghề.

import * as AI from "../../ai.js";
import { laDataUrlAnh, getMessages, getAnhMem, dsNgoaiHinh } from "../../store.js";
import { tachNgoaiHinh, hoSoTheoId, ungVienNgoaiHinh } from "../../ngoaiHinh.js";
import { el, modal } from "../../dom.js";
import { nutTaoAnh } from "./taoAnhFlow.js";
import { htmlThan, htmlNut } from "./taoAnhHtml.js";
import { lapChon } from "./taoAnhChon.js";
import { lapDung } from "./taoAnhDung.js";
import { lapLuu } from "./taoAnhLuu.js";

export async function openTaoAnh(opts = {}, D) {
  const story = D.currentStory();
  const conv = D.currentConv();
  if (!story || !conv) return;
  const suaMsg = opts.suaMsgId ? getMessages(conv.id).find((x) => x.id === opts.suaMsgId) || null : null;
  const suaAnh = suaMsg && suaMsg.anhId ? await getAnhMem(suaMsg.anhId) : null;
  const chon = D.anhChon();
  const pcs = D.dsPhongCach();
  const kts = D.dsKichThuoc();

  const body = el("div", { class: "anh-modal" });
  body.innerHTML = htmlThan({ tinNhan: opts.tinNhan, mayVe: AI.LUAT_NGON_NGU.mayVe, pcs, kts });
  const m = modal({
    title: suaAnh ? "Dựng lại khung hình" : "Dựng ảnh cho cảnh này",
    subtitle: "AI đọc hội thoại tới giờ rồi dựng lại đúng khoảnh khắc đang diễn ra.",
    wide: true,
    body,
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });

  const S = {
    story, conv, suaMsg, suaAnh, opts, m, body,
    F: (f) => body.querySelector('[data-f="' + f + '"]'),
    statusEl: body.querySelector("[data-status]"),
    previewEl: body.querySelector("[data-preview]"),
    pickEl: body.querySelector("[data-nh-pick]"),
    hoSoMap: hoSoTheoId(dsNgoaiHinh()),
    ungVien: ungVienNgoaiHinh(story, conv, dsNgoaiHinh()),
    url: suaAnh ? laDataUrlAnh(suaAnh.dataUrl) : "",
    chuThich: (suaAnh && suaAnh.chuThich) || "",
    // Prompt ĐÃ ghép của lần dựng gần nhất (mô tả cảnh + khối ngoại hình). Ô nhập không giữ
    // khối này nữa nên phải nhớ riêng để bản ghi ảnh lưu đúng thứ đã gửi cho máy vẽ.
    promptDaDung: "",
    busy: false,
    themIds: new Set(), // thêm tay (không nhận diện ra)
    boQuaIds: new Set(), // người dùng đã bỏ chọn
    tuDongIds: new Set(), // nhận diện từ prompt + nhân vật đang có mặt trong cảnh
    trungTen: [],
    thieuDich: new Set(),
    dangDich: false,
    daThuDich: new Set(),
    dichHong: new Set(),
  };
  if (suaAnh && Array.isArray(suaAnh.hoSoIds)) for (const id of suaAnh.hoSoIds) if (S.hoSoMap[id]) S.themIds.add(id);

  S.actionsEl = el("div", { class: "row-gap anh-actions", "data-actions": "" });
  m.footEl.prepend(S.actionsEl);

  S.setStatus = (s) => { if (S.statusEl) S.statusEl.textContent = s || ""; };
  // Khung xem trước dựng ảnh bằng DOM + `.src`, không ghép `dataUrl` vào chuỗi HTML.
  S.paintPreview = (u) => {
    if (!S.previewEl) return;
    const ok = laDataUrlAnh(u);
    if (ok) D.ganAnhVao(S.previewEl, ok, "", false);
    else S.previewEl.innerHTML = '<span class="anh-empty">Khung hình sẽ hiện ở đây</span>';
  };
  S.renderActions = () => {
    if (!S.actionsEl) return;
    S.actionsEl.innerHTML = nutTaoAnh({ busy: S.busy, coAnh: !!S.url }).map(htmlNut).join("");
  };
  S.setBusy = (b) => {
    S.busy = b;
    ["prompt", "ghiChu", "phongCach", "kichThuoc", "loaiTru"].forEach((f) => {
      const e2 = S.F(f);
      if (e2) e2.disabled = b;
    });
    S.renderActions();
  };
  S.dat = (f, v) => { const e2 = S.F(f); if (e2) e2.value = v || ""; };
  if (S.url) S.paintPreview(S.url);

  // Ảnh cũ lưu prompt ĐÃ ghép (mô tả cảnh + khối ngoại hình). Ô nhập chỉ nhận phần mô tả
  // cảnh — khối cũ được tách ra, và những hồ sơ đã dùng (qua `hoSoIds`) sẽ tự hiện lại
  // trong khu chọn + khối chỉ-đọc bên dưới.
  S.dat("prompt", suaAnh ? tachNgoaiHinh(suaAnh.prompt) : "");
  S.dat("loaiTru", suaAnh ? suaAnh.loaiTru : chon.loaiTru);
  S.dat("ghiChu", "");
  {
    const pc = S.F("phongCach");
    if (pc) pc.value = (suaAnh && suaAnh.phongCach) || chon.phongCach || (pcs[0] && pcs[0].id) || "";
    if (pc && !pc.value) pc.selectedIndex = 0;
    const kt = S.F("kichThuoc");
    if (kt) kt.value = (suaAnh && suaAnh.kichThuoc) || chon.kichThuoc || (kts[0] && kts[0].id) || "";
    if (kt && !kt.value) kt.selectedIndex = 0;
  }

  lapChon(S, D);
  lapDung(S, D);
  lapLuu(S, D);
  S.nhanDienLai();
  S.paintPick();
  S.capNhatKhoiNgoaiHinh();

  S.actionsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act2]");
    if (!b) return;
    const a = b.dataset.act2;
    if (a === "viet-lai") S.vietLai();
    else if (a === "dung" || a === "dung-lai") S.dungAnh();
    else if (a === "luu") S.luuVaoHoiThoai();
  });

  if (suaAnh) {
    S.paintPreview(S.url);
    S.setStatus("Sửa mô tả rồi bấm “Dựng lại”, hoặc “Đưa vào hội thoại” để dùng lại ảnh này.");
    S.renderActions();
  } else {
    S.paintPreview("");
    S.renderActions();
    S.vietLai();
  }
}
