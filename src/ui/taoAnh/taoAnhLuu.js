// Truyện Vai — Giai đoạn 6: nút "Đưa vào truyện" của màn tạo ảnh.
//
// Ba đường ghi (thay ảnh cũ / chèn sau một tin nhắn / thêm vào cuối) nay nằm trong một hàm
// duy nhất, và bản ghi ảnh đem đi lưu do `taoAnhFlow.thongSoBanGhiAnh()` dựng — nhờ vậy ca
// kiểm thử Node ghim được TỪNG TRƯỜNG của bản ghi mà không cần trình duyệt.

import {
  store, getMessages, newAnh, luuAnh, xoaAnh, anhCua, makeMessage, replaceMessages,
} from "../../store.js";
import { toast } from "../../dom.js";
import { thongSoBanGhiAnh } from "./taoAnhFlow.js";

export function lapLuu(S, D) {
  S.luuVaoHoiThoai = async () => {
    if (S.busy || !S.url) return;
    S.setBusy(true);
    const anhTruoc = anhCua(S.story).slice();
    const tnTruoc = getMessages(S.conv.id).slice();
    const suaCu = S.suaMsg ? { anhId: S.suaMsg.anhId, chuThich: S.suaMsg.chuThich } : null;
    try {
      const meta = newAnh(
        thongSoBanGhiAnh({
          url: S.url,
          // Prompt lưu vào bản ghi ảnh là prompt ĐÃ ghép thật sự gửi cho máy vẽ, không phải
          // phần mô tả cảnh trong ô nhập.
          promptDaDung: S.promptDaDung,
          moTa: S.F("prompt") ? S.F("prompt").value : "",
          dsHoSo: S.dsChon(),
          loaiTru: S.F("loaiTru") ? S.F("loaiTru").value : "",
          phongCach: S.F("phongCach") ? S.F("phongCach").value : "",
          kichThuoc: S.F("kichThuoc") ? S.F("kichThuoc").value : "",
          chuThich: S.chuThich,
          convId: S.conv.id,
        })
      );
      await luuAnh(S.story, meta);
      if (S.suaMsg) {
        const cu = S.suaMsg.anhId;
        const cuChu = S.suaMsg.chuThich;
        S.suaMsg.anhId = meta.id;
        S.suaMsg.chuThich = meta.chuThich;
        const ok = await D.luuTinNhan(S.conv.id, () => {
          S.suaMsg.anhId = cu;
          S.suaMsg.chuThich = cuChu;
        });
        if (!ok) {
          S.setBusy(false);
          return;
        }
        D.capNhatConv(S.conv, getMessages(S.conv.id));
        if (cu && cu !== meta.id) {
          try {
            await xoaAnh(S.story, cu);
          } catch (e) {
            D.baoLoiLuu(e, "ảnh cũ");
          }
        }
      } else if (S.opts.sauMsgId) {
        const msg = makeMessage("anh", "🖼️ Ảnh cảnh", { anhId: meta.id, chuThich: meta.chuThich });
        const arr = getMessages(S.conv.id).slice();
        const idx = arr.findIndex((x) => x.id === S.opts.sauMsgId);
        if (idx >= 0) arr.splice(idx + 1, 0, msg);
        else arr.push(msg);
        try {
          await replaceMessages(S.conv.id, arr);
        } catch (e) {
          D.baoLoiLuu(e, "tin nhắn");
          S.setBusy(false);
          return;
        }
        D.capNhatConv(S.conv, arr);
      } else {
        const msg = makeMessage("anh", "🖼️ Ảnh cảnh", { anhId: meta.id, chuThich: meta.chuThich });
        const arr = await D.themTinNhan(S.conv.id, msg);
        if (!arr) {
          S.setBusy(false);
          return;
        }
        D.capNhatConv(S.conv, arr);
      }
      const daLuu = await D.luuTruyen(S.story);
      if (!daLuu) {
        // Ghi hỏng ⇒ KHÔNG đóng bảng và KHÔNG báo "đã thêm": trả tin nhắn + chỉ mục ảnh về
        // nguyên trạng, dọn bản ghi ảnh vừa ghi (nếu không sẽ thành ảnh mồ côi), và để người
        // dùng bấm lại — ảnh vẫn còn trên bảng.
        S.story.anh = anhTruoc;
        store.messagesCache[S.conv.id] = tnTruoc;
        if (suaCu && S.suaMsg) {
          S.suaMsg.anhId = suaCu.anhId;
          S.suaMsg.chuThich = suaCu.chuThich;
        }
        D.capNhatConv(S.conv, tnTruoc);
        if (!S.suaAnh) {
          try {
            await xoaAnh(S.story, meta.id);
          } catch (e) {
            console.error(e);
          }
        }
        S.setStatus("Chưa ghi được xuống máy nên khung hình chưa vào truyện. Bấm “Đưa vào truyện” để thử lại.");
        S.setBusy(false);
        return;
      }
      S.m.close();
      D.render();
      toast(S.suaMsg ? "Đã thay khung hình." : "Đã thêm khung hình vào hội thoại.");
    } catch (e) {
      S.setStatus("Lỗi: " + (e.message || e));
      S.setBusy(false);
    }
  };
}
