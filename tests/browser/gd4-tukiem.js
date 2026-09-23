// Bộ kiểm thử: GIAI ĐOẠN 4 — TỰ KIỂM TRA BẤT BIẾN + "SỬA LỖI AN TOÀN".
//
// Vì sao cần: tầng Node kiểm được LUẬT của `kiemTraBatBien` trên dữ liệu dựng sẵn, nhưng không
// kiểm được ĐƯỜNG NỐI: quét kv thật để lấy khoá tin nhắn/ảnh, đổ báo cáo lên hộp thoại, rồi
// sửa trong MỘT giao dịch. Đây là màn hình duy nhất trong app có quyền XOÁ dữ liệu thay người
// dùng, nên nó phải chứng minh được hai điều cùng lúc: sửa hết cái sửa được, và KHÔNG đụng
// tới cái không được phép sửa (chương đã mất, cảnh đã khép trỏ hội thoại đã mất — hai nhóm
// này chỉ được BÁO, không được tự xoá).
//
// Truyện ZZ dựng ở đây hỏng đúng 8 nhóm lỗi: thiếu hồ sơ ngoại hình · hội thoại trỏ nhân vật
// mất · người có mặt trỏ nhân vật mất · cảnh riêng trỏ nhân vật mất · hội thoại trỏ chương mất
// · cảnh đã khép trỏ hội thoại mất · tin nhắn mồ côi · ảnh mồ côi.
const S = await import("/src/store.js");
const T = window.__tv_test;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const ca = [];
const chk = (ten, ok, ct) => ca.push({ ten, ok: !!ok, ct: ct === undefined || ct === null ? "" : String(ct).slice(0, 200) });
const doi = async (fn, n) => {
  for (let i = 0; i < (n || 80); i++) {
    let v = null;
    try { v = await fn(); } catch (e) { v = null; }
    if (v) return v;
    await cho(50);
  }
  return null;
};
const trong = (v) => v === null || v === undefined;
const hopCuoi = () => { const ds = document.querySelectorAll("#modalRoot .modal-backdrop"); return ds.length ? ds[ds.length - 1] : null; };
const thanCuoi = () => { const h = hopCuoi(); return h ? h.querySelector(".modal-body") : null; };
const nutCuoi = (chu) => { const h = hopCuoi(); return h ? [...h.querySelectorAll(".modal-foot button")].find((x) => (x.textContent || "").indexOf(chu) >= 0) || null : null; };
const dongHet = () => { try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {} };

const TEN = "ZZ Bất biến";
const HT = "ht_zzg4";
const TN_MO_COI = "tn_zzg4m";
const ANH_MO_COI = "anh_zzg4m";
const NV_MA = "nv_zzg4c";
const CH_MA = "ch_zzg4x";

// Dọn dấu vết của chính bộ này trước khi dựng (chạy lại bao nhiêu lần vẫn sạch).
await S.loadStories();
for (const s of S.store.stories.slice()) if ((s.ten || "").indexOf(TEN) === 0) await S.deleteStory(s.id);
await S.loadNgoaiHinh();
try { await S.xoaNgoaiHinh("nhz_zzg4"); } catch (e) {}
await S.loadNgoaiHinh();
try { await root.kv.tinNhan.delete(TN_MO_COI); } catch (e) {}
try { await root.kv.thuVienAnh.delete(ANH_MO_COI); } catch (e) {}

// ---------------------------------------------------------------- dựng truyện hỏng
const nvA = S.newCharacter({ id: "nv_zzg4a", ten: "Kai", tuoi: "30", nguoiLon: true });
const nvB = S.newCharacter({ id: "nv_zzg4b", ten: "Aric", tuoi: "32", nguoiLon: true });
const st = await S.createStory({ ten: TEN, mode: "chuong", boiCanh: "Bối cảnh kiểm thử.", nhanVats: [nvA, nvB] });
const ch = S.newChapter(1, { tieuDe: "Chương 1" });
st.chuongs.push(ch);
st.hoiThoais.push(
  S.newConversation({
    id: HT, tieuDe: "Hội thoại hỏng", nhanVatIds: [nvA.id, nvB.id, NV_MA],
    hienDien: [nvA.id, NV_MA], chuongId: CH_MA, canhRieng: NV_MA,
  })
);
st.canhDaKhep.push({ id: "canh_zzg4", htIds: ["ht_zzg4x"], tomTat: "cảnh hỏng", luc: Date.now() });
st.nhanVats[0].ngoaiHinhId = "nhz_khong_co"; // hồ sơ không tồn tại
await S.saveStory(st);
await S.replaceMessages(HT, [S.makeMessage("nguoi", "Câu mở đầu còn nguyên vẹn.", { id: "tn_zzg4" })]);
// Hai khoá mồ côi: không hội thoại nào / không truyện nào trỏ tới.
await root.kv.tinNhan.set(TN_MO_COI, [S.makeMessage("ai", "mồ côi", { id: "tn_zzg4m2" })]);
await root.kv.thuVienAnh.set(ANH_MO_COI, { id: ANH_MO_COI, dataUrl: "", prompt: "mồ côi", hoSoIds: [], luc: Date.now() });
await S.loadStories();
const stTuKv = () => S.store.stories.find((x) => x.id === st.id) || null;

// ---------------------------------------------------------------- quét
const bc = await T.chayTuKiemTra();
const cua = (b, k) => (((b && b.nhom) || {})[k] || []).filter((x) => x.truyen === st.id);
chk("quét ra lỗi của truyện hỏng", bc.soLoi >= 8, "soLoi=" + bc.soLoi + " nhóm=" + Object.keys(bc.nhom || {}).join(","));
chk("nhóm: thiếu hồ sơ ngoại hình", cua(bc, "ho-so-mo").length === 1, JSON.stringify(cua(bc, "ho-so-mo")));
chk("nhóm: hội thoại trỏ nhân vật đã mất", cua(bc, "hoi-thoai-tro-nv").length === 1);
chk("nhóm: người có mặt trỏ nhân vật đã mất", cua(bc, "hien-dien-tro-nv").length === 1);
chk("nhóm: cảnh riêng trỏ nhân vật đã mất", cua(bc, "canh-rieng-tro-nv").length === 1);
chk("nhóm: hội thoại trỏ chương đã mất", cua(bc, "hoi-thoai-tro-chuong").length === 1);
chk("nhóm: cảnh đã khép trỏ hội thoại đã mất", cua(bc, "canh-tro-hoi-thoai").length === 1);
chk("nhóm: tin nhắn mồ côi có khoá của bộ này", ((bc.nhom || {})["tin-nhan-mo-coi"] || []).some((x) => x.id === TN_MO_COI));
chk("nhóm: ảnh mồ côi có khoá của bộ này", ((bc.nhom || {})["anh-mo-coi"] || []).some((x) => x.id === ANH_MO_COI));
chk("báo cáo đếm số truyện / hồ sơ đã quét", bc.soTruyen >= 1 && typeof bc.soHoSo === "number", bc.soTruyen + "/" + bc.soHoSo);
chk("mô tả lỗi đủ dài để người dùng hiểu", cua(bc, "hoi-thoai-tro-nv").every((x) => String(x.moTa).length > 15), JSON.stringify(cua(bc, "hoi-thoai-tro-nv")[0]));

// ---------------------------------------------------------------- màn hình tự kiểm tra
dongHet();
await T.openTuKiemTra();
const coBang = await doi(() => thanCuoi() && thanCuoi().querySelector(".gl-tk"));
chk("mở được màn Tự kiểm tra dữ liệu", !!coBang);
chk("màn hình nêu số vấn đề", !!coBang && (coBang.textContent.indexOf("vấn đề") >= 0 || coBang.textContent.indexOf("Không thấy vấn đề") >= 0), coBang ? coBang.textContent.slice(0, 80) : "");
const dsNhomChu = thanCuoi() ? [...thanCuoi().querySelectorAll(".gl-nhom .gl-head")].map((x) => x.textContent) : [];
chk("màn hình liệt kê nhóm lỗi bằng lời", dsNhomChu.length >= 6, dsNhomChu.slice(0, 3).join(" | "));
chk("nhãn nhóm dễ hiểu (hồ sơ ngoại hình, Hội thoại)", dsNhomChu.some((x) => x.indexOf("hồ sơ ngoại hình") >= 0) && dsNhomChu.some((x) => x.indexOf("Hội thoại") >= 0), dsNhomChu.join(" | ").slice(0, 160));
const nutSua = await doi(() => thanCuoi() && thanCuoi().querySelector('[data-tk-act="sua"]'));
chk("có nút sửa lỗi an toàn", !!nutSua, nutSua ? nutSua.textContent.trim() : "(không có)");
// Số trên nút phải bằng đúng tổng số mục của các nhóm SỬA ĐƯỢC (không tính hai nhóm chỉ báo:
// hội thoại trỏ chương đã mất, cảnh đã khép trỏ hội thoại đã mất).
const NHOM_SUA_DUOC = ["tin-nhan-mo-coi", "anh-mo-coi", "ho-so-mo", "hoi-thoai-tro-nv", "hien-dien-tro-nv", "canh-rieng-tro-nv"];
const soSuaDuoc = NHOM_SUA_DUOC.reduce((a, k) => a + (((bc.nhom || {})[k] || []).length), 0);
chk(
  "nút sửa nêu đúng số lỗi sửa được",
  !!nutSua && Number((nutSua.textContent.match(/\d+/) || [])[0]) === soSuaDuoc,
  (nutSua ? nutSua.textContent.trim() : "") + " (mong " + soSuaDuoc + ")"
);

// ---------------------------------------------------------------- sửa (qua hộp xác nhận)
if (nutSua) {
  nutSua.click();
  const nutXacNhan = await doi(() => nutCuoi("Sửa"));
  chk("hộp xác nhận nói rõ sẽ làm gì", !!nutXacNhan);
  const loiNhac = hopCuoi() && hopCuoi().querySelector(".modal-body") ? hopCuoi().querySelector(".modal-body").textContent : "";
  chk("hộp xác nhận nêu số khoá mồ côi sẽ xoá", loiNhac.indexOf("khoá mồ côi") >= 0, loiNhac.slice(0, 120));
  chk("hộp xác nhận cam kết không đụng nội dung", loiNhac.indexOf("Không đụng tới nội dung") >= 0);
  if (nutXacNhan) {
    nutXacNhan.click();
    const daXoa = await doi(async () => trong(await root.kv.tinNhan.get(TN_MO_COI)) && trong(await root.kv.thuVienAnh.get(ANH_MO_COI)), 120);
    chk("giao dịch sửa đã chạy xong", daXoa === true);
    const to = document.querySelector("#toastRoot .toast");
    chk("có thông báo kết quả sửa", !!to && to.textContent.indexOf("Đã sửa") >= 0, to ? to.textContent.trim() : "(không có toast)");
    await S.loadStories();
  }
}
dongHet();

// ---------------------------------------------------------------- hậu quả trên dữ liệu
const sau = stTuKv();
chk("truyện vẫn còn sau khi sửa", !!sau);
if (sau) {
  chk("gỡ liên kết hồ sơ ngoại hình đã mất", sau.nhanVats[0].ngoaiHinhId === "", JSON.stringify(sau.nhanVats[0].ngoaiHinhId));
  const h2 = (sau.hoiThoais || [])[0] || {};
  chk("gỡ nhân vật đã mất khỏi danh sách tham gia", (h2.nhanVatIds || []).indexOf(NV_MA) < 0 && (h2.nhanVatIds || []).indexOf("nv_zzg4a") >= 0, JSON.stringify(h2.nhanVatIds));
  chk("gỡ nhân vật đã mất khỏi danh sách có mặt", (h2.hienDien || []).indexOf(NV_MA) < 0 && (h2.hienDien || []).indexOf("nv_zzg4a") >= 0, JSON.stringify(h2.hienDien));
  chk("đóng cảnh riêng trỏ nhân vật đã mất", !h2.canhRieng, String(h2.canhRieng));
  chk("KHÔNG tự xoá chương đã mất của hội thoại", h2.chuongId === CH_MA, String(h2.chuongId));
  chk("KHÔNG đụng tới cảnh đã khép", (sau.canhDaKhep || []).length === 1 && (sau.canhDaKhep[0].htIds || []).indexOf("ht_zzg4x") >= 0);
  chk("giữ nguyên tên nhân vật và tên truyện", sau.nhanVats[0].ten === "Kai" && sau.ten === TEN);
  const tin = (await root.kv.tinNhan.get(HT)) || [];
  chk("KHÔNG đụng tới nội dung tin nhắn", tin.length === 1 && String(tin[0].noiDung).indexOf("Câu mở đầu") >= 0, JSON.stringify(tin.map((x) => x.noiDung)));
}
chk("đã xoá hẳn khoá tin nhắn mồ côi", trong(await root.kv.tinNhan.get(TN_MO_COI)));
chk("đã xoá hẳn ảnh mồ côi", trong(await root.kv.thuVienAnh.get(ANH_MO_COI)));
chk("truyện khác trong máy không bị xoá", S.store.stories.length >= 1);

// ------------------------------------ quét lại: cái sửa được đã hết, cái không sửa được VẪN được báo
const bc2 = await T.chayTuKiemTra();
chk("quét lại: hết nhóm thiếu hồ sơ ngoại hình", cua(bc2, "ho-so-mo").length === 0, JSON.stringify(cua(bc2, "ho-so-mo")));
chk("quét lại: hết nhóm hội thoại trỏ nhân vật mất", cua(bc2, "hoi-thoai-tro-nv").length === 0);
chk("quét lại: hết nhóm người có mặt trỏ nhân vật mất", cua(bc2, "hien-dien-tro-nv").length === 0);
chk("quét lại: hết nhóm cảnh riêng trỏ nhân vật mất", cua(bc2, "canh-rieng-tro-nv").length === 0);
chk("quét lại: không còn khoá mồ côi của bộ này", !((bc2.nhom || {})["tin-nhan-mo-coi"] || []).some((x) => x.id === TN_MO_COI) && !((bc2.nhom || {})["anh-mo-coi"] || []).some((x) => x.id === ANH_MO_COI));
chk("quét lại: nhóm KHÔNG sửa được vẫn được báo (chương đã mất)", cua(bc2, "hoi-thoai-tro-chuong").length === 1, JSON.stringify(cua(bc2, "hoi-thoai-tro-chuong")));
chk("quét lại: nhóm KHÔNG sửa được vẫn được báo (cảnh khép)", cua(bc2, "canh-tro-hoi-thoai").length === 1);

// ---------------------------------------------------------------- sửa khi không có gì để sửa
const rong = await T.suaBatBien({ soLoi: 0, nhom: {} });
chk("sửa trên báo cáo rỗng: không lỗi, sửa 0 mục", !!rong && rong.ok === true && rong.soSua === 0, JSON.stringify(rong));

// ---------------------------------------------------------------- dọn dấu vết
try {
  await S.deleteStory(st.id);
  await root.kv.tinNhan.delete(TN_MO_COI);
  await root.kv.thuVienAnh.delete(ANH_MO_COI);
  await S.loadStories();
  await S.loadNgoaiHinh();
} catch (e) {}
dongHet();

return ca;
