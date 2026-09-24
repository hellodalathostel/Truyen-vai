// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần VẮNG MẶT (thẻ "nhịp trước đó", thử lại, bỏ qua).
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js`. Tệp này KHÔNG tự đăng ký sự kiện.

export function bangVangMat(D) {
  return {
    "vg-thu-lai": async ({ story }) => { if (story) await D.thuLaiVangMat(story); },
    "vg-bo-qua": async ({ story }) => { if (story) await D.boQuaVangMat(story); },
    "vg-mo-nhip": ({ t }) => {
      D.app.nhipMo[t.dataset.ht] = !D.app.nhipMo[t.dataset.ht];
      D.render();
    },
    "vg-dong-nhip": ({ t }) => {
      D.app.dongNhip[t.dataset.ht] = true;
      D.render();
    },
    "vg-mo-ht": async ({ t }) => { if (t.dataset.ht) await D.openConv(t.dataset.ht); },
  };
}
