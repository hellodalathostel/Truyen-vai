// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần ĐIỀU HƯỚNG & KHUNG MÀN HÌNH.
//
// Đây là 28 hành động đầu tiên của `switch (act)` cũ trong `bindGlobalEvents`: đổi màn, mở
// sidebar, mở các màn con (nhân vật, biên niên, hội thoại, chương, cài đặt, nhập/xuất).
//
// Hàm xử lý nhận MỘT tham số: `{ t, story, conv }`
//   t     = phần tử có `[data-act]` (đọc `t.dataset.*` để biết bấm vào cái gì)
//   story = `currentStory()` tại thời điểm bấm (có thể null)
//   conv  = `currentConv()` tại thời điểm bấm (có thể null)
//
// Luật chung của `src/ui/suKien/*` ở `index.js`. Tệp này KHÔNG tự đăng ký sự kiện.

import { $, $$, toast } from "../../dom.js";
import { store, saveSettings } from "../../store.js";

export function bangChung(D) {
  return {
    "new-story": () => D.openNewStoryModal(),
    "open-story": async ({ t }) => { await D.openStory(t.dataset.id); },
    "go-library": () => D.goLibrary(),
    "go-dashboard": () => D.goDashboard(),
    "toggle-sidebar": () => {
      if (D.app.tapTrung) return;
      D.app.sidebarOpen = !D.app.sidebarOpen;
      $(".sidebar").classList.toggle("open", D.app.sidebarOpen);
      $(".sidebar-scrim").classList.toggle("on", D.app.sidebarOpen);
    },
    "close-sidebar": () => {
      D.app.sidebarOpen = false;
      $(".sidebar").classList.remove("open");
      $(".sidebar-scrim").classList.remove("on");
    },
    "toggle-scene-bar": () => {
      // Đổi thẳng trên DOM để không mất vị trí cuộn của mạch truyện.
      const sb = $(".scene-bar");
      if (!sb) return;
      const mo = sb.classList.toggle("mo");
      const tg = sb.querySelector(".scene-bar-toggle");
      if (tg) tg.setAttribute("aria-expanded", mo ? "true" : "false");
      D.app.thanhCanhMo = mo;
    },
    "toggle-msg-tools": ({ t }) => {
      const hang = t.closest(".msg-tools");
      if (!hang) return;
      const mo = hang.classList.toggle("open");
      t.setAttribute("aria-expanded", mo ? "true" : "false");
    },
    "toggle-focus": () => {
      D.app.tapTrung = !D.app.tapTrung;
      store.settings.tapTrung = D.app.tapTrung;
      saveSettings();
      const ap = $(".app");
      if (ap) ap.classList.toggle("tap-trung", D.app.tapTrung);
      if (D.app.tapTrung) {
        D.app.sidebarOpen = false;
        const side = $(".sidebar");
        if (side) side.classList.remove("open");
        const scrim = $(".sidebar-scrim");
        if (scrim) scrim.classList.remove("on");
        const sb = $(".scene-bar");
        if (sb) {
          sb.classList.remove("mo");
          const tg = sb.querySelector(".scene-bar-toggle");
          if (tg) tg.setAttribute("aria-expanded", "false");
        }
      }
      toast(D.app.tapTrung ? "Chế độ tập trung: đã ẩn sidebar và thu gọn thanh trạng thái." : "Đã tắt chế độ tập trung.");
    },
    "toggle-chat-menu": () => {
      const menu = $(".chat-menu");
      const nut = $(".chat-more-btn");
      if (menu) {
        menu.hidden = !menu.hidden;
        if (nut) nut.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
      }
    },
    "open-chars": () => D.openCharacterList(),
    "new-char": () => D.openCharacterEditor(null, { focusTen: true }),
    "edit-char": ({ t }) => D.openCharacterEditor(t.dataset.id),
    "open-chronicle": () => D.openChronicle(),
    "story-menu": () => D.openStoryMenu(),
    "open-settings": () => D.openSettings(),
    "import-all": () => D.nhapTatCa(),
    "export-all": async () => { await D.xuatTatCa(); },
    "new-conv": ({ t }) => D.openConvEditor(null, { chuongId: t.dataset.chuong }),
    "open-conv": async ({ t }) => { await D.openConv(t.dataset.id); },
    "edit-conv": ({ conv }) => { if (conv) D.openConvEditor(conv.id); },
    "delete-conv": ({ conv }) => { if (conv) D.xoaHoiThoai(conv.id); },
    "chronicle-from-conv": () => D.chronicleFromConv(),
    "new-chapter": () => D.openChapterEditor(null, true),
    "edit-chapter": ({ t }) => D.openChapterEditor(t.dataset.id, false),
    "end-chapter": ({ t }) => D.endChapter(t.dataset.id),
    "open-chapter": ({ t }) => D.openChapterEditor(t.dataset.id, false),
    "set-responder": ({ t }) => {
      D.app.responder = t.dataset.id;
      $$(".responder-row .chip").forEach((c) => c.classList.toggle("on", c === t));
    },
  };
}
