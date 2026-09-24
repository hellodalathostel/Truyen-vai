// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần CHAT (gửi, dừng, sửa/xoá tin nhắn, gợi ý).
//
// Đây là nhóm hành động nặng nhất của `switch (act)` cũ: ba thao tác ghi dữ liệu nhiều khoá
// (`save-edit`, `del-msg`, và móc cảnh) đều đi qua `giaoDichApp` và giữ nguyên trạng khi hỏng.
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js` cho quy ước. Tệp này KHÔNG tự đăng ký
// sự kiện; luật chung ở `index.js`.

import { $, $$, toast } from "../../dom.js";
import { getMessages, persistMessages, xoaAnh, saveStory as ghiCotTruyen } from "../../store.js";
import { tinhLaiBiet } from "../../thoiGian.js";
import * as TS from "../../trangThai.js";

export function bangChat(D) {
  return {
    "send": async () => { await D.onSend(); },
    "stop": async () => { await D.stopStreaming(); },
    "continue-ai": () => D.onContinueAi(),
    "suggest": () => D.onSuggest(),
    "opening": () => D.onOpening(),
    "use-suggestion": ({ t }) => {
      // Chỉ ĐIỀN vào ô nhập — không gửi, không ghi tin nhắn, không đóng khối gợi ý.
      const i = Number(t.dataset.i);
      D.app.draft = D.app.suggestions[i] || "";
      const ta = $("#composerInput");
      if (ta) { ta.value = D.app.draft; ta.focus(); D.autoGrow(ta); }
      // Highlight chỉ thể hiện gợi ý được chọn GẦN NHẤT; sửa bản nháp không làm mất nó.
      D.app.suggChon = i;
      $$(".goi-y-card").forEach((c) => {
        const on = Number(c.dataset.i) === i;
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
    },
    "copy-msg": ({ t }) => {
      const msgs = getMessages(D.app.convId);
      const m = msgs.find((x) => x.id === t.dataset.mid);
      if (m) { navigator.clipboard.writeText(m.noiDung); toast("Đã sao chép."); }
    },
    "edit-msg": ({ t }) => { D.app.editingMsgId = t.dataset.mid; D.render(); },
    "cancel-edit": () => { D.app.editingMsgId = null; D.render(); },
    "save-edit": async ({ t, story, conv }) => {
      const box = t.closest(".msg-edit");
      const ta = box ? box.querySelector("textarea") : null;
      const msgs = getMessages(D.app.convId);
      const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
      const m = idx >= 0 ? msgs[idx] : null;
      if (m && ta) {
        if (!(await D.hoiVoHieuCanh(story, conv, msgs, idx, "Sửa tin nhắn này"))) { D.app.editingMsgId = null; D.render(); return; }
        // Sửa tin nhắn đụng CẢ HAI khoá: bản ghi tin nhắn và bản ghi truyện (cảnh đã khép
        // bị vô hiệu + bản tóm tắt cũ bị bỏ). Hỏng ở bước nào cũng phải trả về nguyên
        // trạng — không được để mất chữ cũ mà trạng thái truyện chưa đổi.
        const kq = await D.giaoDichApp([["cotTruyen", story.id], ["tinNhan", D.app.convId]], async () => {
          m.noiDung = ta.value.trim();
          m.sua = true;
          // Sửa tin nhắn nằm trong vùng đã tóm tắt → bản tóm tắt đó không còn đúng.
          const boTomTat = D.voHieuTomTat(conv, idx);
          const soCanhHuy = D.voHieuCanhTuDiem(story, conv, msgs, idx);
          D.capNhatConv(conv, msgs);
          await persistMessages(D.app.convId);
          await ghiCotTruyen(story);
          return { boTomTat, soCanhHuy };
        }, "sửa tin nhắn");
        if (!kq.ok) {
          // Giữ hộp sửa MỞ và giữ đúng chữ vừa gõ: giao dịch đã trả nội dung cũ về, người
          // dùng không phải gõ lại. Giao diện chỉ đóng khi lưu thành công.
          const chuDangGo = ta.value;
          D.render();
          const nut2 = document.querySelector('[data-act="save-edit"][data-mid="' + m.id + '"]');
          const inp = nut2 && nut2.closest(".msg-edit") ? nut2.closest(".msg-edit").querySelector("textarea") : null;
          if (inp) inp.value = chuDangGo;
          return;
        }
        const boTomTat = kq.kq.boTomTat;
        const soCanhHuy = kq.kq.soCanhHuy;
        if (soCanhHuy) toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
        if (boTomTat) {
          toast("Tin nhắn này đã nằm trong phần tóm tắt cũ — bản tóm tắt đã được bỏ để AI không nhớ sai.");
          D.maybeCompact(story, conv);
        }
      }
      D.app.editingMsgId = null;
      D.render();
    },
    "del-msg": async ({ t, story, conv }) => {
      const msgs = getMessages(D.app.convId);
      const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
      if (idx >= 0) {
        if (!(await D.hoiVoHieuCanh(story, conv, msgs, idx, "Xoá tin nhắn này"))) return;
        const bo = msgs[idx];
        // Xoá tin nhắn đụng ba khoá: tin nhắn, bản ghi truyện (cảnh đã khép + sổ hé lộ) và
        // ẢNH riêng của tin nhắn đó (nếu có) — phải là một giao dịch, kẻo ảnh mất mà
        // trạng thái truyện chưa đổi.
        const ds = [["cotTruyen", story.id], ["tinNhan", D.app.convId]];
        if (bo.anhId) ds.push(["thuVienAnh", bo.anhId]);
        const kq = await D.giaoDichApp(ds, async () => {
          const boTomTat = D.voHieuTomTat(conv, idx);
          msgs.splice(idx, 1);
          if (bo.anhId) await xoaAnh(story, bo.anhId);
          const soCanhHuy = D.voHieuCanhTuDiem(story, conv, msgs, idx);
          D.capNhatConv(conv, msgs);
          // Tin nhắn vừa bị xoá có thể là NGUỒN của một lần hé lộ — tính lại "ai biết gì".
          tinhLaiBiet(story, { [D.app.convId]: msgs });
          await persistMessages(D.app.convId);
          await ghiCotTruyen(story);
          return { boTomTat, soCanhHuy };
        }, "xoá tin nhắn");
        if (!kq.ok) { D.render(); return; }
        const boTomTat = kq.kq.boTomTat;
        const soCanhHuy = kq.kq.soCanhHuy;
        if (soCanhHuy) toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
        if (boTomTat) {
          toast("Tin nhắn này đã nằm trong phần tóm tắt cũ — bản tóm tắt đã được bỏ.");
          D.maybeCompact(story, conv);
        }
        D.render();
      }
    },
    "thu-lai-loi": async () => {
      D.app.loiTam = [];
      D.render();
      const s2 = D.currentStory();
      const c2 = D.currentConv();
      if (s2 && c2) await D.generateTurn(s2, c2, { auto: true });
    },
    "bo-loi": ({ t }) => {
      D.app.loiTam.splice(Number(t.dataset.i) || 0, 1);
      D.render();
    },
    "regen-msg": async ({ t, story, conv }) => {
      const msgs = getMessages(D.app.convId);
      const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
      if (idx < 0) return;
      const old = msgs[idx];
      const nvts = D.nvtsCuaTin(story, old);
      if (!nvts.length) { toast("Không xác định được nhân vật.", "error"); return; }
      if (msgs.length - 1 - idx > 0) {
        D.moVietLaiTinGiua(story, conv, idx, nvts);
        return;
      }
      await D.vietLaiTinCuoi(story, conv, idx, nvts);
    },
    "dung-moc": ({ story, conv }) => {
      const cuoi = conv ? TS.canhCuoi(story, conv) : null;
      if (cuoi && cuoi.moc) {
        const ta = $("#composerInput");
        D.app.draft = (D.app.draft ? D.app.draft + "\n" : "") + cuoi.moc;
        if (ta) { ta.value = D.app.draft; ta.focus(); D.autoGrow(ta); }
        toast("Đã chèn móc cảnh vào ô nhập — sửa rồi gửi nếu muốn.");
      }
    },
    "facts-msg": ({ t }) => D.factsFromMessage(t.dataset.mid),
  };
}
