// Truyện Vai — Giai đoạn 8 · Đợt 4: bảng sự kiện toàn cục của tính năng "Viết thành truyện".
//
// Thân màn nằm ở `src/ui/vietTruyen/`; ở đây chỉ có các nút. Chúng đi qua ĐÚNG một điểm đăng ký sự
// kiện toàn cục (`bindGlobalEvents` → `gopBangSuKien`), vì luật §7.3 cấm màn tự gắn listener — kể cả
// nút nằm trong modal của chính màn đó.
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js` cho quy ước. Tệp này KHÔNG tự đăng ký sự kiện.

import { bamVietTruyen, chepVietTruyen, chonNguonVietTruyen, dungVietTruyen, xuatVietTruyen } from "../vietTruyen/index.js";

export function bangVietTruyen(D) {
  return {
    "viet-truyen": () => D.openVietTruyen(),
    "vt-chay": () => bamVietTruyen(),
    "vt-dung": () => dungVietTruyen(),
    "vt-nguon": ({ t }) => chonNguonVietTruyen(t.dataset.loai),
    "vt-xuat": ({ t }) => xuatVietTruyen(t.dataset.id),
    "vt-chep": ({ t }) => chepVietTruyen(t.dataset.id),
  };
}
