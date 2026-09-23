// Bộ tiêu thụ cho khung dựng "thời gian vắng mặt" (vg-base).
//
// Khung này dựng một truyện ở trạng thái xác định rồi cho phép giả lập "vừa vắng mặt N
// phút". Bộ này chạy ĐÚNG luồng thật của app — ghiNhanVangMat → kiemTraVangMat → gọi AI →
// ghi sổ sự kiện + tin nhắn nhìn thấy được → đóng phiên — và phủ ba nhánh:
//   • đủ ngưỡng: có sự kiện, có tin nhắn, có dải phân cách, phiên đóng, và KHÔNG mô phỏng lại;
//   • đang tạm dừng vắng mặt: không gọi AI, không ghi gì;
//   • AI lỗi: giữ phiên ở "thử lại", không ghi gì, có dòng báo lỗi cho người dùng.
// Tầng Node chỉ kiểm được hàm thuần (xetDieuKien, docKeHoachVangMat…); phần NỐI này chỉ có
// ở đây.
const S = await import("/src/store.js");
const NL = String.fromCharCode(10);
const kq = {};
const soLanGoiKeHoach = () => (window.__vgFake ? window.__vgFake.calls.filter((c) => c.indexOf("vừa quay lại") >= 0).length : -1);

const PLAN = [
  "SỰ KIỆN 1:",
  "LOẠI: Liên lạc",
  "SAU KHI RỜI: 1.5 giờ",
  "HÌNH THỨC: Tin nhắn",
  "NHÂN VẬT: Aria",
  "HỘI THOẠI: Aria",
  "NỘI DUNG: Aria nhắn hỏi người chơi đang ở đâu.",
  "AI BIẾT: Aria",
  "MỨC HIỂN THỊ: Đã lộ",
  "PHÁT HIỆN: Người chơi mở điện thoại và thấy tin nhắn.",
  "ẢNH HƯỞNG: Aria -> Borin: gần gũi lên | VÌ: chủ động nhắn trước",
  "",
  "SỰ KIỆN 2:",
  "LOẠI: Ngoài màn hình",
  "SAU KHI RỜI: 3 giờ",
  "NỘI DUNG: Borin ghé qua bến tàu nhưng không gặp ai.",
  "MỨC HIỂN THỊ:",
].join(NL);

if (typeof window.__vgBase !== "function" || typeof window.__vgQuayLai !== "function") {
  return { coKhung: false, soLoi: 1, loi: ["vg-base chưa cài __vgBase/__vgQuayLai — bước dựng chưa chạy?"] };
}
kq.coKhung = true;

// ------------------------------------------------- pha 1: vắng mặt đủ ngưỡng
const b1 = await window.__vgBase({ thoiGian: { cheDo: "thoiGianThat", nguongPhut: 30 } });
kq.dungDuocTruyen = b1.story === "ct_zzbase" && b1.cheDo === "thoiGianThat";
const truoc1 = await window.__vgTrangThai();
window.__vgInstallFake(PLAN);
const sau1 = await window.__vgQuayLai(240);
kq.goiKeHoachDungMotLan = soLanGoiKeHoach() === 1;
kq.themHaiSuKien = sau1.ngoai.length === truoc1.ngoai.length + 2;
const e0 = sau1.ngoai[0] || {};
const e1 = sau1.ngoai[1] || {};
kq.suKien1LaLienLac = e0.loai === "lienLac" && e0.htId === "ht_za" && e0.muc === "daLo";
kq.suKien1DoAria = (e0.thamGia || []).indexOf("nv_za") >= 0;
kq.suKien1GanDungHoiThoai = e0.hinhThuc === "Tin nhắn";
kq.suKien2NgoaiManHinh = e1.loai === "ngoaiManHinh" && e1.muc === "an" && e1.htId === "";
kq.haiSuKienCungPhien = !!e0.phienId && e0.phienId === e1.phienId;
kq.suKienSapTheoThoiGian = Number(e0.luc) < Number(e1.luc);
kq.themMotTinNhan = sau1.m1.length === truoc1.m1.length + 1;
const tn = sau1.m1[sau1.m1.length - 1] || {};
kq.tinNhanGanDungSuKien = tn.vangMat === e0.id && (tn.nvIds || []).indexOf("nv_za") >= 0;
kq.hoiThoaiKiaKhongDoi = sau1.m2 === truoc1.m2;
kq.coDaiPhanCach = sau1.dom.divider > truoc1.dom.divider;
kq.phienDaDong = !!sau1.tg.phien && sau1.tg.phien.trangThai === "xong";
kq.mocDaTien = Number(sau1.tg.daXuLy) > 0;
kq.khongConLoi = sau1.dom.loi === false;
// Cùng một khoảng vắng mặt không được mô phỏng lần thứ hai: chạy lại mà không lùi đồng hồ.
const soLanTruoc = soLanGoiKeHoach();
await window.__tv_vg.kiemTraVangMat(S.getStory("ct_zzbase"));
const sauLai = await window.__vgTrangThai();
kq.khongMoPhongLai = soLanGoiKeHoach() === soLanTruoc && sauLai.ngoai.length === sau1.ngoai.length;

// ------------------------------------------- pha 2: đang tạm dừng vắng mặt
const b2 = await window.__vgBase({ ten: "ZZ base tam dung", thoiGian: { cheDo: "tamDung" } });
kq.dungDuocTruyenTamDung = b2.cheDo === "tamDung";
const truoc2 = await window.__vgTrangThai();
window.__vgInstallFake(PLAN);
const sau2 = await window.__vgQuayLai(240);
kq.tamDungKhongGoiAI = soLanGoiKeHoach() === 0;
kq.tamDungKhongThemSuKien = sau2.ngoai.length === 0;
kq.tamDungKhongThemTinNhan = sau2.m1.length === truoc2.m1.length;

// ------------------------------------------------------- pha 3: AI trả lỗi
const b3 = await window.__vgBase({ ten: "ZZ base loi", thoiGian: { cheDo: "thoiGianThat", nguongPhut: 30 } });
kq.dungDuocTruyenLoi = b3.cheDo === "thoiGianThat";
const truoc3 = await window.__vgTrangThai();
window.__vgInstallFake(PLAN, { loi: true });
const sau3 = await window.__vgQuayLai(240);
kq.loiCoGoiAI = soLanGoiKeHoach() === 1;
kq.loiKhongThemSuKien = sau3.ngoai.length === 0;
kq.loiKhongThemTinNhan = sau3.m1.length === truoc3.m1.length;
kq.loiGiuPhienThuLai = !!sau3.tg.phien && sau3.tg.phien.trangThai === "thuLai";
kq.loiBaoChoNguoiDung = sau3.dom.loi === true;

return kq;
