// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần CẢNH (khép cảnh, Đạo diễn, hiện diện, cảnh riêng).
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js`. Tệp này KHÔNG tự đăng ký sự kiện.

export function bangCanh(D) {
  return {
    "khep-canh": async () => { await D.openKhepCanh(); },
    "open-dao-dien": () => D.openDaoDien(),
    "open-hien-dien": () => D.openHienDien(),
    "chon-canh-rieng": () => D.openChonCanhRieng(),
    "dong-canh-rieng": async ({ story, conv }) => { if (conv) await D.dongCanhRieng(story, conv); },
  };
}
