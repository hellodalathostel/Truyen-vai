// Bộ tiêu thụ cho khung dựng chế độ Đạo diễn — NHÁNH AI TRẢ LỖI (dd-fake-ai-loi).
//
// Khi máy chủ AI hỏng, việc "Lập cầu nối" phải HỎNG ÊM: báo rõ ngay trong hộp thoại, giữ
// nguyên nội dung người chơi đã gõ, không tạo hướng nào, không đóng hộp thoại, và trả lại
// nút để người chơi thử lại. Cả HAI dạng lỗi của plugin đều phải được chặn:
//   • promise bị từ chối (máy chủ không phản hồi) — dd-fake-ai-loi cài sẵn;
//   • promise trả về stopReason là "error" — cài tại chỗ ở lượt B.
const S = await import("/src/store.js");
const T = window.__tv_test;
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
const oNhapMong = () => than() && than().querySelector("[data-f=" + JSON.stringify("mongMuon") + "]");
const chuLoi = () => {
  const o = than() && than().querySelector("[data-k=" + JSON.stringify("cho") + "] .confirm-text");
  return o ? o.textContent || "" : "";
};
const coTheKeHoach = () => !!(than() && than().querySelector("[data-k=" + JSON.stringify("buoc") + "]"));
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
const MONG = "Kai dần cho Aric cơ hội giải thích và bớt canh chừng.";

// Một lượt "thử lập cầu nối khi AI lỗi", dùng chung cho cả hai dạng lỗi.
const motLuot = async (tien) => {
  await T.openTaoHuong(story, conv);
  const o = await doi(oNhapMong);
  kq["moDuocHopThoai_" + tien] = !!o;
  if (!o) { dong(); return; }
  o.value = MONG;
  const bam = nut("Lập cầu nối");
  kq["coNutLap_" + tien] = !!bam;
  if (!bam) { dong(); return; }
  bam.click();
  kq["hienLoi_" + tien] = !!(await doi(() => chuLoi().length > 0, 200));
  kq["loiNoiRoMayChuAI_" + tien] = chuLoi().indexOf("Máy chủ AI") >= 0;
  kq["khongHienTheKeHoach_" + tien] = !coTheKeHoach();
  const kich = nut("Kích hoạt hướng");
  kq["nutKichHoatAn_" + tien] = !!kich && kich.hidden === true;
  const oSau = oNhapMong();
  kq["giuNguyenBanNhap_" + tien] = !!oSau && oSau.value === MONG;
  kq["vanThuLaiDuoc_" + tien] = !!bam && bam.disabled === false;
  kq["hoThoaiVanMo_" + tien] = !!document.querySelector("#modalRoot .modal-backdrop");
  dong();
  kq["khongThemHuong_" + tien] = soHuong() === truoc;
};

// ------------------------------------------------- lượt A: plugin TỪ CHỐI promise
await motLuot("tuChoi");

// ------------------------------- lượt B: plugin trả về stopReason là "error"
root.aiTextPlugin = (o) => {
  o = o || {};
  if (o.getMetaObject) return { countTokens: (t) => Math.ceil((t || "").length / 3.6), idealMaxContextTokens: 6000 };
  const hong = String(o.instruction || "").indexOf("KẾ HOẠCH CẦU NỐI") >= 0;
  const p = Promise.resolve({ text: hong ? "" : "Kai gật đầu.", stopReason: hong ? "error" : "" });
  p.stop = () => {};
  return p;
};
await motLuot("stopReasonError");

return kq;
