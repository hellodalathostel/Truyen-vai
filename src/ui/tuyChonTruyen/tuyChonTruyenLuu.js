// Truyện Vai — Đợt 6c: ĐỌC FORM + LƯU của màn "Tuỳ chọn truyện".
//
// Một điểm dễ sai: mở Giao kèo / Sổ tri thức / Đạo diễn là mở MODAL CON — nên phải lưu những
// gì đang gõ dở TRƯỚC khi mở, kẻo mất chữ. Và nếu ghi xuống kv hỏng thì phải trả về đúng
// trạng thái cũ rồi trả `false` (chỗ gọi KHÔNG được đóng bảng, không được coi như đã lưu).
//
// Mọi quyết định nằm ở `tuyChonTruyenFlow.js` (thuần, có ca Node); tệp này chỉ đọc DOM + áp.

import { getNgoaiHinh, newChapter } from "../../store.js";
import * as TS from "../../trangThai.js";
import { CHE_DO } from "../../thoiGian.js";
import { chupTrangThai, giaTriSapLuu, khoiPhucTrangThai } from "./tuyChonTruyenFlow.js";

// Giá trị thô của mọi ô trong form (chuỗi). Ô không tồn tại ⇒ chuỗi rỗng, y như `F(...).value`
// trong bản cũ đối với ô luôn có mặt.
export function docForm(body) {
  const o = (f) => {
    const e = body.querySelector('[data-f="' + f + '"]');
    return e ? e.value : "";
  };
  return {
    ten: o("ten"), emoji: o("emoji"), boiCanh: o("boiCanh"),
    nguoiChoiTen: o("nguoiChoiTen"), nguoiChoiMoTa: o("nguoiChoiMoTa"),
    nguoiChoiNgoaiHinhId: o("nguoiChoiNgoaiHinhId"),
    mode: o("mode"), nhip: o("nhip"), daoDien: o("daoDien"),
    vgCheDo: o("vgCheDo"), vgNguong: o("vgNguong"), vgChuDong: o("vgChuDong"),
  };
}

const HOP_LE = { nhip: TS.NHIP.map((x) => x.id), cheDo: CHE_DO.map((x) => x.id) };

export async function luuNhapNhay(ctx) {
  const { body, story, tgv, daoDien, D } = ctx;
  const truoc = chupTrangThai(story, tgv, daoDien.bat);
  const gia = docForm(body);
  const gt = giaTriSapLuu(gia, story, HOP_LE);
  // Lưu ngay những gì đang gõ dở, để mở Giao kèo / Sổ tri thức (modal khác) không làm mất.
  story.ten = gt.ten;
  story.emoji = gt.emoji;
  story.boiCanh = gt.boiCanh;
  story.nguoiChoi.ten = gt.nguoiChoiTen;
  story.nguoiChoi.moTa = gt.nguoiChoiMoTa;
  story.nguoiChoi.ngoaiHinhId = gia.nguoiChoiNgoaiHinhId;
  // Chỉ giữ liên kết tới hồ sơ CÒN tồn tại (thư viện có thể đã bị xoá ở tab khác).
  if (story.nguoiChoi.ngoaiHinhId && !getNgoaiHinh(story.nguoiChoi.ngoaiHinhId)) story.nguoiChoi.ngoaiHinhId = "";
  if (gt.canTaoChuong) story.chuongs.push(newChapter(1, { tieuDe: "Chương 1" }));
  story.mode = gt.mode;
  story.nhip = gt.nhip;
  daoDien.bat = gt.daoDienBat;
  tgv.cheDo = gt.cheDo;
  tgv.nguongPhut = gt.nguongPhut;
  tgv.chuDong = gt.chuDong;
  if (!(await D.luuTruyen(story, "tuỳ chọn truyện"))) {
    khoiPhucTrangThai(story, tgv, truoc, daoDien);
    return false;
  }
  return true;
}
