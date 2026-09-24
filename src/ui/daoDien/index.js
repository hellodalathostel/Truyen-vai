// Màn "Chế độ Đạo diễn" — VỎ (Đợt 6d).
//
// Vỏ này chỉ làm bốn việc: lấy truyện đang mở, dựng modal, vẽ lại thân modal khi cần, và tra bảng
// hành động (`daoDienNut.js`) cho mỗi cú bấm. Câu chữ và quyết định nằm ở `daoDienFlow.js`.
//
// Hai điểm KHÔNG được đổi khi sửa tệp này:
//   • `D.app.daoDienDangMo` — cờ chống mở hai lần; chỉ được xoá trong `onClose` (gỡ node modal
//     trực tiếp sẽ để lại cờ bật và lần mở sau bị chặn IM LẶNG).
//   • Sự kiện gắn vào THÂN MODAL, không gắn vào `document` — điểm đăng ký toàn cục duy nhất của
//     app vẫn là `bindGlobalEvents`.
import { el, modal } from "../../dom.js";
import { BANG_NUT } from "./daoDienNut.js";

export function openDaoDien(D) {
  const story = D.currentStory();
  if (!story) return;
  if (D.app.daoDienDangMo) return;
  D.app.daoDienDangMo = true;
  const convMo = D.currentConv();
  // Chưa mở hội thoại nào thì xem theo hội thoại mới sửa gần nhất — cùng thứ tự với màn chat.
  let convXem =
    convMo ||
    (story.hoiThoais || []).slice().sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0))[0] ||
    null;
  const body = el("div");
  const ve = () => {
    body.innerHTML = D.ddTongQuanHtml(story, convXem);
  };
  ve();
  const m = modal({
    title: "Chế độ Đạo diễn",
    subtitle: (convXem ? convXem.tieuDe : "cả truyện") + " · chỉ mình bạn thấy — không lộ ra chat",
    full: true,
    body,
    onClose: () => { D.app.daoDienDangMo = false; },
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });
  const ctx = () => ({ D, story, convXem, ve });
  body.addEventListener("change", (e) => {
    const sel = e.target.closest('select[data-act="dd-doi-ht"]');
    if (!sel) return;
    convXem = story.hoiThoais.find((c) => c.id === sel.value) || convXem;
    ve();
  });
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const xuLy = BANG_NUT[b.dataset.act];
    if (!xuLy) return;
    await xuLy(Object.assign(ctx(), { b }));
  });
  return m;
}
