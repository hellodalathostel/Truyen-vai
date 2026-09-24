// Truyện Vai — Đợt 6c: hai đường NẠP mục vào sổ (dán JSON, và chọn file .json).
//
// Cả hai đường đi qua cùng một cửa: `docLorebook()` (lõi, thuần) → quyết định ở
// `lorebookFlow.js` → ghi bằng `D.luuTruyen` (ghi hỏng thì `hoanTacSo()` trả về nguyên trạng).

import { toast, confirmModal } from "../../dom.js";
import { docLorebook, chamLore } from "../../lore.js";
import {
  cauHoiThayThe, coHoiThayThe, fileKhongDungDuoc, loiDocFile, loiNhapFile,
  LOI_FILE_RONG, thongBaoNhap, thongBaoNhapFile,
} from "./lorebookFlow.js";

export function lapNhap(ctx) {
  const { story, lb, D, ve } = ctx;

  async function nhapTu(text, thayThe) {
    let kq;
    try {
      kq = docLorebook(text);
    } catch (err) {
      toast(loiDocFile(err), "error");
      return;
    }
    // `nhan`: ghi xuống kv một lần cho cả hai nhánh (thêm / thay thế). Hỏng thì trả tên sổ về
    // như cũ rồi hoàn tác cả danh sách — bảng không được hiển thị trạng thái chưa từng lưu.
    const nhan = async () => {
      const cuTen = lb.ten;
      if (kq.ten) lb.ten = kq.ten;
      chamLore(story);
      if (!(await D.luuTruyen(story, "sổ tri thức"))) {
        lb.ten = cuTen;
        await ve.hoanTacSo();
        return false;
      }
      ve.veDanhSach();
      return true;
    };
    if (coHoiThayThe(lb.entries.length, thayThe)) {
      confirmModal(
        "Thay thế sổ tri thức",
        cauHoiThayThe(lb.entries.length, kq.entries.length),
        async () => {
          lb.entries = kq.entries;
          if (await nhan()) toast(thongBaoNhap(kq, "Đã thay sổ tri thức."));
        },
        { yesLabel: "Thay thế", danger: true }
      );
      return;
    }
    lb.entries = lb.entries.concat(kq.entries);
    if (await nhan()) toast(thongBaoNhap(kq, "Đã thêm " + kq.entries.length + " mục vào sổ."));
  }

  function chonFile() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const kq = docLorebook(await f.text());
        if (fileKhongDungDuoc(kq)) {
          toast(LOI_FILE_RONG, "error");
          return;
        }
        lb.entries = lb.entries.concat(kq.entries);
        if (kq.ten) lb.ten = kq.ten;
        chamLore(story);
        if (!(await D.luuTruyen(story, "sổ tri thức"))) {
          await ve.hoanTacSo();
          return;
        }
        ve.veDanhSach();
        toast(thongBaoNhapFile(kq, f.name));
      } catch (err) {
        toast(loiNhapFile(err), "error");
      }
    };
    inp.click();
  }

  return { nhapTu, chonFile };
}
