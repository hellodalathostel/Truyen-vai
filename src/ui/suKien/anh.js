// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần ẢNH (màn tạo ảnh, xem/tải/lại ảnh).
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js`. Tệp này KHÔNG tự đăng ký sự kiện.

import { getMessages } from "../../store.js";

export function bangAnh(D) {
  return {
    "tao-anh": () => D.openTaoAnh({}),
    "tao-anh-msg": ({ t }) => {
      const msgs = getMessages(D.app.convId);
      const mm = msgs.find((x) => x.id === t.dataset.mid);
      D.openTaoAnh({ tinNhan: mm ? mm.noiDung : "", sauMsgId: t.dataset.mid });
    },
    "anh-xem": async ({ t }) => { await D.moXemAnh(t.dataset.mid); },
    "anh-tai": async ({ t }) => { await D.taiAnhTuMsg(t.dataset.mid); },
    "anh-lai": async ({ t }) => { await D.openTaoAnh({ suaMsgId: t.dataset.mid }); },
    "open-anh-lib": async ({ t, story }) => {
      if (t.dataset.id && story) await D.moXemAnhId(story, t.dataset.id, "");
      else D.moThuVienAnh();
    },
  };
}
