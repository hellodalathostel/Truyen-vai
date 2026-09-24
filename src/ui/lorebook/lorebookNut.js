// Truyện Vai — Đợt 6c: NÚT của màn "Sổ tri thức (lorebook)" — các nút trong thân modal, hộp
// bật/tắt từng mục, và ba nút ở chân modal (Đóng / Xuất JSON / Xoá cả sổ).
//
// Tách khỏi `index.js` để phần vỏ chỉ còn việc dựng khung + nối. Quyết định nằm ở
// `lorebookFlow.js`; ở đây chỉ đọc DOM rồi gọi.

import { toast, confirmModal, download } from "../../dom.js";
import { newLoreEntry, viDuLorebook, xuatLorebook, chamLore } from "../../lore.js";
import { cauHoiXoaMuc, cauHoiXoaSo, mucTuForm, tenFileXuat, thieuNoiDung, LOI_MUC_TRONG, SO_TRONG } from "./lorebookFlow.js";

export function lapNut(ctx) {
  const { body, story, lb, D, ve, nhap } = ctx;
  const lay = (id) => body.querySelector('[data-lb-muc="' + id + '"]');

  const onChange = async (e) => {
    const cb = e.target.closest("[data-lb-bat]");
    if (!cb) return;
    const e2 = lb.entries.find((x) => x.id === cb.dataset.lbBat);
    if (!e2) return;
    e2.bat = cb.checked;
    await ve.luuSapXep();
  };

  const onClick = async (e) => {
    const b = e.target.closest("[data-lb-file],[data-lb-them],[data-lb-nhap-them],[data-lb-nhap-thay],[data-lb-vidu],[data-lb-xoa],[data-lb-sua],[data-lb-dong],[data-lb-luu]");
    if (!b) return;
    if (b.dataset.lbVidu !== undefined) {
      body.querySelector("[data-lb-json]").value = JSON.stringify(viDuLorebook(), null, 2);
      toast("Đã dán ví dụ — bấm “Thêm vào sổ” để thử.");
      return;
    }
    if (b.dataset.lbFile !== undefined) {
      nhap.chonFile();
      return;
    }
    if (b.dataset.lbThem !== undefined) {
      const e2 = newLoreEntry({ ghiChu: "Mục mới", keys: [], noiDung: "Nội dung gửi cho AI khi mục này khớp." });
      lb.entries.push(e2);
      ctx.setMoId(e2.id);
      await ve.luuSapXep();
      const node = lay(e2.id);
      if (node) node.scrollIntoView({ block: "center" });
      return;
    }
    if (b.dataset.lbNhapThem !== undefined || b.dataset.lbNhapThay !== undefined) {
      await nhap.nhapTu(body.querySelector("[data-lb-json]").value, b.dataset.lbNhapThay !== undefined);
      return;
    }
    if (b.dataset.lbXoa !== undefined) {
      const e2 = lb.entries.find((x) => x.id === b.dataset.lbXoa);
      if (!e2) return;
      confirmModal("Xoá mục", cauHoiXoaMuc(e2.ghiChu), async () => {
        lb.entries = lb.entries.filter((x) => x.id !== e2.id);
        if (await ve.luuSapXep()) toast("Đã xoá mục.");
      }, { yesLabel: "Xoá", danger: true });
      return;
    }
    if (b.dataset.lbSua !== undefined) {
      ctx.setMoId(b.dataset.lbSua);
      const node = lay(b.dataset.lbSua);
      if (node) {
        node.querySelector(".lb-form").hidden = false;
        node.scrollIntoView({ block: "center" });
      }
      return;
    }
    if (b.dataset.lbDong !== undefined) {
      const node = lay(b.dataset.lbDong);
      if (node) node.querySelector(".lb-form").hidden = true;
      return;
    }
    if (b.dataset.lbLuu !== undefined) {
      const e2 = lb.entries.find((x) => x.id === b.dataset.lbLuu);
      const node = e2 ? lay(e2.id) : null;
      if (!e2 || !node) return;
      const g = (f) => node.querySelector('[data-lb-f="' + f + '"]');
      const gt = mucTuForm({
        ghiChu: g("ghiChu").value,
        keys: g("keys").value,
        keys2: g("keys2").value,
        noiDung: g("noiDung").value,
        thuTu: g("thuTu").value,
        doSau: g("doSau").value,
        hangSo: g("hangSo").checked,
        chonLoc: g("chonLoc").checked,
        phanBietHoa: g("phanBietHoa").checked,
        khopTronTu: g("khopTronTu").checked,
        khongDeQuy: g("khongDeQuy").checked,
      });
      if (thieuNoiDung(gt.noiDung)) {
        toast(LOI_MUC_TRONG, "error");
        return;
      }
      e2.ghiChu = gt.ghiChu;
      e2.keys = gt.keys;
      e2.keys2 = gt.keys2;
      e2.noiDung = gt.noiDung;
      e2.thuTu = gt.thuTu;
      e2.doSau = gt.doSau;
      e2.hangSo = gt.hangSo;
      e2.chonLoc = gt.chonLoc;
      e2.phanBietHoa = gt.phanBietHoa;
      e2.khopTronTu = gt.khopTronTu;
      e2.khongDeQuy = gt.khongDeQuy;
      ctx.setMoId("");
      if (await ve.luuSapXep()) toast("Đã lưu mục.");
    }
  };

  const xuatJson = () => {
    download(tenFileXuat(story.ten), xuatLorebook(story));
    toast("Đã xuất file lorebook (chuẩn World Info).");
  };

  const xoaSo = async (mm) => {
    if (!lb.entries.length) {
      toast(SO_TRONG);
      return;
    }
    confirmModal(
      "Xoá sổ tri thức",
      cauHoiXoaSo(lb.entries.length),
      async () => {
        lb.entries = [];
        chamLore(story);
        if (!(await D.luuTruyen(story, "sổ tri thức"))) {
          await ve.hoanTacSo();
          return;
        }
        mm.close();
        D.render();
        toast("Đã xoá sổ tri thức.");
      },
      { yesLabel: "Xoá tất cả", danger: true }
    );
  };

  return { onChange, onClick, xuatJson, xoaSo };
}
