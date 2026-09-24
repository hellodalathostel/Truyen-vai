// Truyện Vai — Đợt 6b: phần ảnh đại diện của màn "Sửa nhân vật".
//
// Ba kiểu: chữ (chọn màu), biểu tượng (chọn emoji), ảnh (tải lên). Tất cả chỉ sửa BẢN NHÁP
// `S.nhap` rồi vẽ lại — nhân vật trong truyện chỉ đổi khi bấm Lưu.

import { esc, icon } from "../../dom.js";
import { laDataUrlAnh } from "../../store.js";
import * as AI from "../../ai.js";
import { promptAvatarAi } from "./nhanVatForm.js";

export function lapAvatar(S) {
  const D = S.D;

  S.paintAvatar = () => {
    const p = S.body.querySelector("[data-preview]");
    if (p) p.innerHTML = D.avatarHtml(S.story, S.nhap, 72);
    const seg = S.body.querySelectorAll(".seg-btn");
    seg.forEach((b) => b.classList.toggle("on", b.dataset.av === S.nhap.avatarStyle));
    const extra = S.body.querySelector("[data-av-extra]");
    if (!extra) return;
    if (S.nhap.avatarStyle === "chu") {
      extra.innerHTML = '<div class="mau-row">' + D.mauChoices.map((mx) =>
        '<button class="mau-dot' + (S.nhap.mau === mx ? " on" : "") + '" data-mau="' + esc(mx) + '" style="background:' + esc(mx) + '"></button>').join("") + "</div>";
    } else if (S.nhap.avatarStyle === "emoji") {
      extra.innerHTML = '<div class="emoji-row">' + D.emojiChoices.map((e2) =>
        '<button class="emoji-btn' + (S.nhap.emoji === e2 ? " on" : "") + '" data-emoji="' + esc(e2) + '">' + esc(e2) + "</button>").join("") + "</div>";
    } else {
      extra.innerHTML = (laDataUrlAnh(S.nhap.anh) ? '<img class="anh-avatar" src="' + esc(laDataUrlAnh(S.nhap.anh)) + '" alt="">' : "") +
        '<button class="btn btn-sm" data-act="char-upload">' + icon("upload", 14) + " Tải ảnh lên</button>";
    }
  };

  // Trả về true nếu sự kiện đã được xử lý ở đây (`actName` = giá trị `data-act` của nút,
  // rỗng nếu người dùng bấm vào thứ khác).
  S.suKienAvatar = (e, actName) => {
    const seg = e.target.closest("[data-av]");
    if (seg) {
      S.nhap.avatarStyle = seg.dataset.av;
      S.paintAvatar();
      return true;
    }
    const dot = e.target.closest("[data-mau]");
    if (dot) {
      S.nhap.mau = dot.dataset.mau;
      S.paintAvatar();
      return true;
    }
    const em = e.target.closest("[data-emoji]");
    if (em) {
      S.nhap.emoji = em.dataset.emoji;
      S.paintAvatar();
      return true;
    }
    if (actName === "char-upload") {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        const dataUrl = await D.thuNhoAnh(f, 256);
        S.nhap.anh = dataUrl;
        S.nhap.avatarStyle = "anh";
        S.paintAvatar();
      };
      inp.click();
      return true;
    }
    return false;
  };
}

// "Tạo ảnh đại diện" bằng AI — cũng chỉ điền vào bản nháp.
export async function taoAnhDaiDien(S, status) {
  const D = S.D;
  const F = S.F;
  status.textContent = "Đang vẽ ảnh đại diện…";
  try {
    const dataUrl = await AI.generateAvatar(
      promptAvatarAi({ ten: F("ten").value, theLoaiTen: S.story.theLoaiTen, moTa: F("moTa").value })
    );
    S.nhap.anh = dataUrl;
    S.nhap.avatarStyle = "anh";
    S.paintAvatar();
    status.textContent = "Đã tạo ảnh đại diện.";
  } catch (err) {
    status.textContent = "Lỗi: " + (err.message || err);
  }
}
