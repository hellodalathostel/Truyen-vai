// Truyện Vai — Đợt 6b: nút "Bật giao kèo cho truyện này" trong màn "Sửa nhân vật".
//
// Đây là một trong hai đường vào nội dung người lớn của màn này (đường kia là ô tích "Người
// trưởng thành" khi lưu nhân vật). Bật giao kèo = bật lớp BDSM, nên:
//   1. phải qua hộp xác nhận 18+ liệt kê ĐÚNG danh sách nhân vật sẽ được ghi cờ;
//   2. chỉ sau khi xác nhận mới ghi cờ `nguoiLon` cho những nhân vật đủ điều kiện;
//   3. rồi mới kiểm tra cổng chặn (`chanNoiDungNguoiLon`) — cổng này là chốt cuối, có thể
//      vẫn chặn (ví dụ nhân vật trong truyện có dấu hiệu vị thành niên);
//   4. ghi xuống kv HỎNG thì trả giao kèo về nguyên trạng ba trường vừa đụng.
//
// Không thể "bật nhanh" bằng một cú bấm: câu chữ và danh sách ở `nhanVatForm.js` +
// `../cong18.js`, phần dưới đây chỉ chạy đúng thứ tự đó.

import { toast } from "../../dom.js";
import { chanNoiDungNguoiLon, giaoKeoOf, xacNhanMoiNguoiLon } from "../../store.js";
import { LY_DO_BAT_GIAO_KEO, LOI_TU_CHOI_BAT_GIAO_KEO } from "../cong18.js";

export async function batGiaoKeo(S, nut) {
  const D = S.D;
  const xac = await D.xacNhan18PlusTruyen(LY_DO_BAT_GIAO_KEO, S.story.nhanVats || []);
  if (!xac.dongY) {
    toast(LOI_TU_CHOI_BAT_GIAO_KEO, "error");
    return;
  }
  // Người dùng vừa xác nhận 18+ cho cả truyện ⇒ ghi cờ tường minh cho từng nhân vật TRƯỚC
  // khi mở cổng, nếu không cổng sẽ chặn đúng cái nút vừa xác nhận.
  xacNhanMoiNguoiLon(S.story);
  const lyDo = chanNoiDungNguoiLon(S.story);
  if (lyDo) {
    toast(lyDo, "error");
    return;
  }
  const g = giaoKeoOf(S.story);
  const truocBat = g.bat;
  const truocNl = g.nguoiLon;
  const truocTk = g.tuKhoaDung;
  g.bat = true;
  g.nguoiLon = true;
  if (!g.tuKhoaDung) g.tuKhoaDung = "đỏ";
  if (!(await D.luuTruyen(S.story, "giao kèo"))) {
    g.bat = truocBat;
    g.nguoiLon = truocNl;
    g.tuKhoaDung = truocTk;
    return;
  }
  const d = S.body.querySelector("[data-gk-off]");
  if (d) {
    d.open = true;
    const s = d.querySelector("summary");
    if (s) s.textContent = "⛓️ Vai trong giao kèo (BDSM M/M)";
    const hint = d.querySelector("[data-gk-off-hint]");
    if (hint) hint.textContent = "Đã bật giao kèo cho truyện này — các mục dưới đây sẽ được gửi cho AI ở mọi tin nhắn.";
  }
  if (nut) nut.hidden = true;
  toast("Đã bật giao kèo cho truyện này.");
}
