// Bộ tiêu thụ cho khung dựng "chế độ Đạo diễn" (dd-setup + dd-fake-ai).
//
// Vì sao cần: tầng Node chỉ kiểm được TỪNG MẢNH RỜI của chế độ Đạo diễn (docKeHoach,
// docPhieu, taoHuong…). Phần NỐI thì không: dựng prompt, gọi AI, bóc kế hoạch, đổ lên thẻ
// duyệt, kích hoạt rồi ghi xuống kv. Bộ này chạy ĐÚNG luồng thật của người dùng trên một
// truyện do dd-setup dựng, nên nếu dây nối đứt thì nó đỏ.
//
// Hai lượt:
//   • Lượt ĐỦ — kế hoạch 3 bước, XUNG ĐỘT ghi KHONG CO ⇒ phải thành rỗng.
//   • Lượt RỖNG — BƯỚC CHUYỂN ghi KHONG CO ⇒ phải là MẢNG RỖNG, không phải một bước tên
//     là "KHONG CO" (đây là hành vi sai cũ; ca này không được để nó quay lại).
const S = await import("/src/store.js");
const T = window.__tv_test;
const NL = String.fromCharCode(10);
await S.loadStories();

const TEN = "ZZ Test Đạo diễn";
const story = S.store.stories.find((s) => s.ten === TEN);
const kq = {};
const doi = async (fn, n) => {
  for (let i = 0; i < (n || 80); i++) {
    let v = null;
    try { v = fn(); } catch (e) { v = null; }
    if (v) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
};
const than = () => document.querySelector("#modalRoot .modal-body");
const nut = (chu) => [...document.querySelectorAll("#modalRoot .modal-foot button")].find((b) => (b.textContent || "").indexOf(chu) >= 0);
const dong = () => { const b = nut("Huỷ"); if (b) b.click(); };
const gt = (k) => { const e = than() && than().querySelector("[data-k=" + JSON.stringify(k) + "]"); return e ? e.value : null; };
const oNhapMong = () => than() && than().querySelector("[data-f=" + JSON.stringify("mongMuon") + "]");
const soHuong = () => (S.daoDienOf(story).huong || []).length;

if (!story || typeof T.openTaoHuong !== "function") {
  return {
    coTruyenDung: !!story,
    coDiemNeo: typeof T.openTaoHuong === "function",
    soLoi: 1,
    loi: [story ? "app.js thiếu điểm neo openTaoHuong trong __tv_test" : "không thấy truyện " + TEN + " — dd-setup chưa chạy?"],
  };
}
const conv = story.hoiThoais[0];
const truoc = soHuong();
const MONG_DU = "Kai dần cho Aric cơ hội giải thích và bớt canh chừng.";
const MONG_RONG = "BƯỚC CHUYỂN RỖNG — hướng này chưa có bước nào.";
const tenNvDau = (story.nhanVats[0] || {}).id;

// ---------------------------------------------------------- lượt 1: kế hoạch đầy đủ
await T.openTaoHuong(story, conv);
const oNhap = await doi(oNhapMong);
kq.moDuocHopThoai = !!oNhap;
if (oNhap) {
  oNhap.value = MONG_DU;
  const bamLap = nut("Lập cầu nối");
  kq.coNutLapCauNoi = !!bamLap;
  if (bamLap) {
    bamLap.click();
    kq.hienTheKeHoach = !!(await doi(() => than() && than().querySelector("[data-k=" + JSON.stringify("buoc") + "]"), 200));
    kq.buocDung3 = (gt("buoc") || "").split(NL).filter(Boolean).length === 3;
    kq.buocDocDuoc = (gt("buoc") || "").indexOf("vật nhỏ") >= 0;
    kq.xungDotRong = gt("xungDot") === "";
    kq.mucTieuDocDuoc = (gt("mucTieu") || "").indexOf("cơ hội giải thích") >= 0;
    kq.trangThaiDauDocDuoc = (gt("trangThaiDau") || "").indexOf("dè chừng") >= 0;
    const bamKich = nut("Kích hoạt hướng");
    kq.nutKichHoatHien = !!bamKich && !bamKich.hidden;
    if (bamKich) {
      bamKich.click();
      const moi = await doi(() => (S.daoDienOf(story).huong || []).find((h) => h.mongMuon === MONG_DU) || null, 200);
      kq.taoDuocHuong = !!moi;
      if (moi) {
        const kh = moi.keHoach || {};
        kq.keHoach3Buoc = Array.isArray(kh.buoc) && kh.buoc.length === 3;
        kq.keHoachXungDotRong = kh.xungDot === "";
        kq.keHoachCoMucTieu = String(kh.mucTieu || "").indexOf("cơ hội giải thích") >= 0;
        kq.dungDoiTuong = moi.phamVi === "nhanvat" && moi.nvId === tenNvDau;
        kq.trangThaiHoatDong = moi.trangThai === "hoatDong";
        kq.mongMuonGiuNguyen = moi.mongMuon === MONG_DU;
        const luu = await root.kv.cotTruyen.get(story.id);
        const hl = luu && luu.daoDien ? (luu.daoDien.huong || []).find((h) => h.id === moi.id) : null;
        kq.daLuuXuongKv = !!hl && Array.isArray(hl.keHoach.buoc) && hl.keHoach.buoc.length === 3;
      }
    }
  }
}
dong();
kq.tangDungMotHuong = soHuong() === truoc + 1;

// ------------------------------------------- lượt 2: kế hoạch RỖNG (không có bước nào)
await T.openTaoHuong(story, conv);
const oNhap2 = await doi(oNhapMong);
kq.moDuocHopThoaiLan2 = !!oNhap2;
if (oNhap2) {
  oNhap2.value = MONG_RONG;
  const bamLap2 = nut("Lập cầu nối");
  kq.coNutLapLan2 = !!bamLap2;
  if (bamLap2) {
    bamLap2.click();
    kq.hienTheKeHoachRong = !!(await doi(() => than() && than().querySelector("[data-k=" + JSON.stringify("buoc") + "]"), 200));
    kq.buocRongThat = gt("buoc") === "";
    kq.khongCoChuKHONGCO = (gt("buoc") || "").indexOf("KHONG CO") < 0;
    kq.mucTieuRongDocDuoc = (gt("mucTieu") || "").length > 0;
    const bamKich2 = nut("Kích hoạt hướng");
    kq.vanKichHoatDuoc = !!bamKich2 && !bamKich2.hidden;
  }
}
dong();
kq.khongThemHuongNao = soHuong() === truoc + 1;
kq.dongDuocHopThoai = !document.querySelector("#modalRoot .modal-backdrop");

return kq;
