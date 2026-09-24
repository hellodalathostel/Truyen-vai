// Truyện Vai — Đợt 6c: phần VẼ của màn "Sổ tri thức (lorebook)".
//
// Bốn việc, tất cả đều xoay quanh cùng một chỗ: dòng thống kê, danh sách mục, ghi thứ tự mới,
// và HOÀN TÁC khi ghi hỏng. Quyết định (số đang bật, câu chữ) lấy từ `lorebookFlow.js`; chuỗi
// HTML lấy từ `lorebookHtml.js`. Tệp này chỉ đọc DOM + gọi lõi.

import { getMessages, loadStories, getStory } from "../../store.js";
import { loreCua, chamLore, mucKhop } from "../../lore.js";
import { htmlMuc, htmlTrong, htmlThongKe } from "./lorebookHtml.js";
import { SO_TRONG, bangKhop, soBat } from "./lorebookFlow.js";

export function lapVe(ctx) {
  const { body, story, conv, lb, D } = ctx;

  const veThongKe = () => {
    const ctn = body.querySelector("[data-lb-thongke]");
    const n = lb.entries.length;
    if (!n) {
      ctn.textContent = SO_TRONG;
      return;
    }
    const khop = conv ? mucKhop(story, conv, getMessages(conv.id)).length : 0;
    ctn.innerHTML = htmlThongKe({ n, bat: soBat(lb.entries), khop, coConv: !!conv, ten: lb.ten });
  };

  const veDanhSach = () => {
    const ctn = body.querySelector("[data-lb-list]");
    const kb = conv ? bangKhop(mucKhop(story, conv, getMessages(conv.id))) : null;
    ctn.innerHTML = lb.entries.length ? lb.entries.map((e) => htmlMuc(e, kb)).join("") : htmlTrong();
    const moId = ctx.getMoId();
    if (moId) {
      const node = ctn.querySelector('[data-lb-muc="' + moId + '"]');
      if (node) node.querySelector(".lb-form").hidden = false;
    }
    veThongKe();
  };

  const luuSapXep = async () => {
    chamLore(story);
    if (!(await D.luuTruyen(story, "sổ tri thức"))) {
      await hoanTacSo();
      return false;
    }
    veDanhSach();
    return true;
  };

  // Ghi hỏng ⇒ đọc lại từ máy và dựng lại danh sách, để bảng không hiển thị một trạng
  // thái chưa từng được lưu.
  const hoanTacSo = async () => {
    try {
      await loadStories();
    } catch (err) {
      console.error(err);
    }
    const s2 = getStory(story.id);
    const moi = s2 ? loreCua(s2) : null;
    if (moi) {
      lb.ten = moi.ten;
      lb.entries = moi.entries;
    }
    veDanhSach();
  };

  return { veThongKe, veDanhSach, luuSapXep, hoanTacSo };
}
