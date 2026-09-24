// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần SỔ TRI THỨC (một hành động: mở sổ).
//
// Thân màn nằm ở `src/ui/lorebook/`; ở đây chỉ có cái nút.
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js`. Tệp này KHÔNG tự đăng ký sự kiện.

export function bangLorebook(D) {
  return {
    "open-lorebook": () => D.openLorebook(),
  };
}
