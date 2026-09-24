// Truyện Vai — Đợt 6c: màn "Tuỳ chọn truyện" (bản vỏ).
//
// Vì sao tách: `openStoryMenu` từng là một hàm 245 dòng (một biểu thức HTML ~60 dòng + ba hàm
// con + một listener riêng). Nay nó chỉ DỰNG KHUNG + NỐI:
//
//   tuyChonTruyenFlow.js   quyết định THUẦN (giá trị sắp lưu, mã hợp lệ, ảnh chụp/hoàn tác,
//                          nhãn nút, phép đếm người dùng) — KHÔNG DOM, có ca Node
//   tuyChonTruyenHtml.js   chuỗi HTML của thân modal + khối liên kết ngoại hình
//   tuyChonTruyenLink.js   khối liên kết hồ sơ ngoại hình của NGƯỜI CHƠI
//   tuyChonTruyenLuu.js    đọc form ⇒ lưu (kèm trả nguyên trạng khi ghi hỏng)
//
// CỬA 18+ KHÔNG NẰM Ở ĐÂY: nút Giao kèo chỉ gọi hàm dùng chung của app (`D.openGiaoKeo`), và
// `openGiaoKeo` tự đi qua `xacNhan18PlusTruyen` + `chanNoiDungNguoiLon`. Tệp này không có một
// phán định tuổi nào, cũng không chép lại câu chữ 18+ (có ca kiểm thử ghim).
//
// Listener ở đây là listener của RIÊNG modal này (gắn trên thân modal, không phải `document`):
// điểm đăng ký sự kiện TOÀN CỤC duy nhất của app vẫn là `bindGlobalEvents` + `src/ui/suKien/*`.

import { el, modal, confirmModal, toast } from "../../dom.js";
import { deleteStory, getNgoaiHinh, daoDienOf } from "../../store.js";
import { thoiGianOf, NGUONG_CHON } from "../../thoiGian.js";
import * as TS from "../../trangThai.js";
import { EMOJI_MAC_DINH, nguongChonDuoc } from "./tuyChonTruyenFlow.js";
import { htmlThan } from "./tuyChonTruyenHtml.js";
import { lapNcLink } from "./tuyChonTruyenLink.js";
import { luuNhapNhay } from "./tuyChonTruyenLuu.js";

export function openTuyChonTruyen(D) {
  const story = D.currentStory();
  if (!story) return;
  const body = el("div");
  const tgv = thoiGianOf(story);
  const nguongChon = nguongChonDuoc(tgv.nguongPhut, NGUONG_CHON);
  body.innerHTML = htmlThan({ story, tgv, nguongChon });
  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  F("ten").value = story.ten;
  F("emoji").value = story.emoji || EMOJI_MAC_DINH;
  F("boiCanh").value = story.boiCanh || "";
  F("nguoiChoiTen").value = story.nguoiChoi.ten || "";
  F("nguoiChoiMoTa").value = story.nguoiChoi.moTa || "";
  const daoDien = daoDienOf(story);
  const link = lapNcLink({ body, F, story });
  link.lamMoi(story.nguoiChoi.ngoaiHinhId || "");
  F("nguoiChoiNgoaiHinhId").addEventListener("change", link.paint);
  F("nguoiChoiTen").addEventListener("input", link.paint);
  F("mode").value = story.mode;
  F("nhip").value = TS.nhipCua(story).id;
  F("daoDien").value = daoDien.bat ? "1" : "0";
  F("vgCheDo").value = tgv.cheDo;
  F("vgNguong").value = String(tgv.nguongPhut);
  F("vgChuDong").value = tgv.chuDong ? "1" : "0";
  const luu = () => luuNhapNhay({ body, story, tgv, daoDien, D });

  const m = modal({
    title: "Tuỳ chọn truyện",
    wide: true,
    body,
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() },
      { label: "Lưu", primary: true, onClick: async (mm) => {
        if (await luu()) { mm.close(); D.render(); }
      } }],
  });
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "export-story") D.xuatTruyen(story);
    if (act === "import-story") D.nhapTruyen();
    // Liên kết ngoại hình của NGƯỜI CHƠI: thư viện / sửa hồ sơ là modal con, mở xong quay
    // lại dựng lại khối liên kết để danh sách và phần tóm tắt luôn khớp thư viện hiện tại.
    if (act === "open-ngoai-hinh") { e.stopPropagation(); D.openNgoaiHinh(link.lamMoi); }
    if (act === "sua-ngoai-hinh") {
      e.stopPropagation();
      D.openSuaNgoaiHinh(b.dataset.id, link.lamMoi);
    }
    if (act === "dong-ten-nguoi-choi") {
      const h = getNgoaiHinh(F("nguoiChoiNgoaiHinhId").value);
      // CHỈ điền vào form — người chơi tự bấm Lưu, và tin nhắn cũ không bị sửa.
      if (h) F("nguoiChoiTen").value = h.tenChinh;
      link.paint();
    }
    // Modal con mở lên trên, modal này vẫn giữ nguyên — không mất thay đổi chưa lưu.
    if (act === "open-giao-keo") { e.stopPropagation(); await luu(); D.openGiaoKeo(); }
    if (act === "open-lorebook") { e.stopPropagation(); await luu(); D.openLorebook(); }
    if (act === "open-dao-dien") {
      e.stopPropagation();
      await luu();
      if (!daoDien.bat) {
        const bat = await D.hoiXacNhan(
          "Chế độ Đạo diễn đang tắt",
          "Bật Chế độ Đạo diễn cho truyện này rồi mở màn Đạo diễn? Đây là màn riêng của bạn — nó không hiện gì trong chat.",
          { yesLabel: "Bật & mở" }
        );
        if (!bat) return;
        const t = D.ddTruoc(story);
        daoDien.bat = true;
        F("daoDien").value = "1";
        if (!(await D.ddLuu(story, "bật Chế độ Đạo diễn", t))) return;
      }
      m.close();
      D.openDaoDien();
    }
    if (act === "delete-story") {
      m.close();
      confirmModal("Xoá cốt truyện", "Xoá vĩnh viễn “" + story.ten + "” cùng toàn bộ hội thoại? Không thể hoàn tác.", async () => {
        try {
          await deleteStory(story.id);
        } catch (err) {
          // Xoá là giao dịch: hỏng thì truyện vẫn còn nguyên. Không được báo "đã xoá".
          D.baoLoiLuu(err, "cốt truyện");
          D.goLibrary();
          return;
        }
        toast("Đã xoá cốt truyện.");
        D.goLibrary();
      }, { danger: true, yesLabel: "Xoá vĩnh viễn" });
    }
  });
}
