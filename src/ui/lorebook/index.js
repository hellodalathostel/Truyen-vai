// Truyện Vai — Đợt 6c: màn "Sổ tri thức (lorebook)" (bản vỏ).
//
// Vì sao tách: `openLorebook` từng là một hàm 299 dòng (một biểu thức HTML ~28 dòng + năm hàm
// con + hai listener). Nay nó chỉ DỰNG KHUNG + NỐI:
//
//   lorebookFlow.js   quyết định THUẦN (đọc kết quả parse, dựng mục từ form, câu hỏi/thông báo,
//                     tên file xuất) — KHÔNG DOM, có ca Node
//   lorebookHtml.js   chuỗi HTML (thân modal, một mục, form sửa, dòng thống kê, danh sách trống)
//   lorebookVe.js     dòng thống kê + danh sách + ghi thứ tự + hoàn tác
//   lorebookNhap.js   hai đường nạp (dán JSON, chọn file)
//   lorebookNut.js    các nút + hộp bật/tắt + ba nút chân modal
//
// Phần PARSE / XẾP / LỌC mục đã ở lõi từ trước: `docLorebook` / `chuanMuc` / `buildLore` /
// `mucKhop` trong `src/lore.js` (có `tests/node/lore.test.mjs`). Tệp này không parse gì.
//
// Listener ở đây là listener của RIÊNG modal này (gắn trên thân modal); điểm đăng ký sự kiện
// TOÀN CỤC duy nhất của app vẫn là `bindGlobalEvents` + `src/ui/suKien/*`.

import { el, modal } from "../../dom.js";
import { store } from "../../store.js";
import { loreCua } from "../../lore.js";
import { lapVe } from "./lorebookVe.js";
import { lapNhap } from "./lorebookNhap.js";
import { lapNut } from "./lorebookNut.js";
import { htmlThan } from "./lorebookHtml.js";

export function openLorebook(D) {
  const story = D.currentStory();
  if (!story) return;
  if (document.querySelector(".lb-modal")) return;
  const lb = loreCua(story);
  // Đang ở trong chat thì lấy hội thoại đó; ở bảng điều khiển thì lấy hội thoại mở gần nhất.
  const conv = (() => {
    const id = D.app.convId || store.lastConvId;
    return id ? story.hoiThoais.find((c) => c.id === id) || null : null;
  })();
  const body = el("div", { class: "lb-modal" });
  body.innerHTML = htmlThan();
  let moId = "";
  const ctx = { body, story, conv, lb, D, getMoId: () => moId, setMoId: (x) => { moId = x; } };
  const ve = lapVe(ctx);
  const nhap = lapNhap(Object.assign({}, ctx, { ve }));
  const nut = lapNut(Object.assign({}, ctx, { ve, nhap }));

  modal({
    title: "Sổ tri thức (lorebook)",
    subtitle: "Tải file World Info / SillyTavern, hoặc tự viết từng mục.",
    wide: true,
    body,
    actions: [
      { label: "Đóng", onClick: (mm) => mm.close() },
      { label: "Xuất JSON", onClick: () => nut.xuatJson() },
      { label: "Xoá cả sổ", danger: true, onClick: (mm) => nut.xoaSo(mm) },
    ],
  });

  ve.veDanhSach();
  body.addEventListener("change", (e) => { nut.onChange(e); });
  body.addEventListener("click", (e) => { nut.onClick(e); });
}
