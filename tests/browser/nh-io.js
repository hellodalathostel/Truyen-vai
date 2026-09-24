// Kiểm thử "Thư viện ngoại hình v1" — xuất/nhập, lỗi lưu, cách ly dữ liệu thật.
// PHẢI chạy SAU: audit-base.js (eval riêng), nh-fake-ai.js (eval riêng), và PHẢI CÙNG MỘT
// LẦN TẢI TRANG với nh-lib.js (bộ này dùng dữ liệu thử do nh-lib dựng: hồ sơ "Sara" +
// truyện ct_zz1/ct_zz2). Các bộ audit-t* xoá mọi truyện có tiêu đề bắt đầu bằng "ZZ"
// nên chúng phải chạy ở lần tải trang KHÁC, hoặc trước cặp nh-lib → nh-io.
const A = window.__A;
if (!A || !A.auditBaseReady) throw new Error("Thiếu audit-base.js");
const T = A.T, S = A.S;
const cho = A.cho;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 300) });
const dongHetModal = () => { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); };
const bodyTren = () => { const m = A.modalTren(); return m ? m.querySelector(".modal-body") : null; };
const footBtn = (nhan) => {
  const m = A.modalTren();
  if (!m) return null;
  return Array.from(m.querySelectorAll(".modal-foot .btn")).find((x) => new RegExp(nhan, "i").test(x.textContent || "")) || null;
};
const bamFoot = async (nhan) => { const b = footBtn(nhan); if (!b) return false; b.click(); await cho(250); return true; };
const bamBody = async (sel) => { const b = bodyTren() ? bodyTren().querySelector(sel) : null; if (!b) return false; b.click(); await cho(90); return true; };
const setV = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("input", { bubbles: true })); };
const F = (f) => { const b = bodyTren(); return b ? b.querySelector('[data-f="' + f + '"]') : null; };
const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

// Bắt nội dung file "xuất" mà không tải thật.
let batBlob = null, batTen = null;
if (!window.__NH_DL) {
  window.__NH_DL = true;
  const gocCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => {
    if (b instanceof Blob) { batBlob = b; batTen = null; }
    return gocCreate(new Blob([""]));
  };
  const gocClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { batTen = this.download; return; }
    return gocClick.apply(this, arguments);
  };
}
const docBlob = async () => (batBlob ? JSON.parse(await batBlob.text()) : null);
// Chạy một hàm "xuất" (async, có thể bật hộp xác nhận nếu thiếu ảnh) và lấy nội dung file.
const chayXuat = async (fn) => {
  batBlob = null; batTen = null;
  const p = fn();
  for (let i = 0; i < 50; i++) {
    await cho(100);
    const b = footBtn("Vẫn xuất");
    if (b) { b.click(); continue; }
    if (batBlob) break;
  }
  await p;
  await cho(250);
  return docBlob();
};

// Mốc dữ liệu THẬT (chỉ đọc, không bao giờ ghi).
window.__DH = window.__DH || { that: null };
const chotThat = async () => {
  const muc = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  const s = muc.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
  const ds = [];
  for (const c of (s && s.hoiThoais) || []) ds.push(c.id + ":" + ((await root.kv.tinNhan.get(c.id)) || []).length);
  return (s ? s.ten + "#" + (s.nhanVats || []).length : "MẤT") + "|" + ds.join(",");
};

// =============================================================== PHẦN 6: xuất / nhập
try {
  dongHetModal();
  if (!window.__DH.that) window.__DH.that = await chotThat();
  const hSara = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara");
  chk("6.0 có hồ sơ Sara để xuất", !!hSara && !!hSara.id);

  // 6A. xuất RIÊNG thư viện
  const fLib = await chayXuat(() => T.xuatNgoaiHinh([hSara], "truyen-vai-ngoai-hinh.json"));
  chk("6.1 xuất riêng thư viện: đúng một hồ sơ", !!fLib && !!fLib.ngoaiHinh && Object.keys(fLib.ngoaiHinh).length === 1 && fLib.ngoaiHinh[hSara.id].tenChinh === "Sara", JSON.stringify(fLib && Object.keys(fLib.ngoaiHinh || {})));
  chk("6.2 file thư viện có type/version + tên tệp", fLib && fLib.type === "truyen-vai-ngoai-hinh" && !!fLib.version && /ngoai-hinh/.test(batTen || ""), batTen);

  // 6B. xuất MỘT TRUYỆN ⇒ kèm đúng hồ sơ truyện tham chiếu, KHÔNG kèm cả thư viện
  const storyZZ = await root.kv.cotTruyen.get("ct_zz1");
  const linkIds = new Set();
  for (const c of storyZZ.nhanVats) if (c.ngoaiHinhId) linkIds.add(c.ngoaiHinhId);
  for (const a of storyZZ.anh || []) for (const id of a.hoSoIds || []) linkIds.add(id);
  const fStory = await chayXuat(() => T.xuatTruyen(storyZZ));
  chk("6.3 xuất truyện có kèm hồ sơ ngoại hình được tham chiếu", !!fStory && !!fStory.ngoaiHinh && Object.keys(fStory.ngoaiHinh).length >= 1, JSON.stringify(fStory && Object.keys(fStory.ngoaiHinh || {})));
  chk("6.4 kèm ĐÚNG những hồ sơ truyện dùng, không ôm cả thư viện", !!fStory && Object.keys(fStory.ngoaiHinh).every((id) => linkIds.has(id)) && Object.keys(fStory.ngoaiHinh).length <= T.dsNgoaiHinh().length, JSON.stringify({ file: Object.keys(fStory && fStory.ngoaiHinh || {}).length, ram: T.dsNgoaiHinh().length }));
  chk("6.5 mọi liên kết trong file đều có hồ sơ trong file", !!fStory && (() => {
    for (const c of fStory.story.nhanVats) if (c.ngoaiHinhId && !fStory.ngoaiHinh[c.ngoaiHinhId]) return false;
    return true;
  })());

  // 6C. xuất TOÀN BỘ app ⇒ có cả thư viện
  const fAll = await chayXuat(() => T.xuatTatCa());
  chk("6.6 sao lưu toàn app kèm cả thư viện ngoại hình", !!fAll && !!fAll.ngoaiHinh && Object.keys(fAll.ngoaiHinh).length === T.dsNgoaiHinh().length, JSON.stringify({ file: Object.keys(fAll && fAll.ngoaiHinh || {}).length, ram: T.dsNgoaiHinh().length }));
  chk("6.6b sao lưu toàn app có đủ truyện", !!fAll && fAll.stories && fAll.stories.length === S.store.stories.length);

  // 6D. nhập: xem trước + mặc định KHÔNG ghi đè + trùng tên ≠ cùng người
  const truoc = T.dsNgoaiHinh().length;
  const dsFile = Object.keys(fAll.ngoaiHinh).map((k) => Object.assign({ id: k }, fAll.ngoaiHinh[k]));
  T.openNhapNgoaiHinh(dsFile, "toan-bo.json");
  await cho(250);
  chk("6.7 nhập có màn xem trước + tuỳ chọn ghi đè (mặc định TẮT)", !!bodyTren() && !!bodyTren().querySelector('[data-f="nhGhiDe"]') && bodyTren().querySelector('[data-f="nhGhiDe"]').checked === false);
  chk("6.8 xem trước nói rõ trùng tên không phải cùng người", /Trùng tên KHÔNG được coi là cùng một người/.test(bodyTren().textContent));
  await bamFoot("Nhập");
  await cho(500);
  chk("6.9 nhập trùng ID mặc định BỎ QUA (không ghi đè)", T.dsNgoaiHinh().length === truoc, T.dsNgoaiHinh().length + " vs " + truoc);

  // hồ sơ mới hoàn toàn được thêm; trùng TÊN vẫn là hai người
  const kqNhap = await T.nhapHoSoNgoaiHinh([T.chuanHoaHoSo({ id: "nhz_moi_1", tenChinh: "Sara", moTa: "cùng tên nhưng khác người", anh: ANH_1PX })], { ghiDe: false });
  await T.loadNgoaiHinh();
  chk("6.10 thêm hồ sơ mới khi id chưa có", kqNhap.them === 1 && T.dsNgoaiHinh().length === truoc + 1, JSON.stringify(kqNhap));
  chk("6.11 trùng TÊN vẫn là hai người khác nhau", T.dsNgoaiHinh().filter((x) => x.tenChinh === "Sara").length >= 2);
  chk("6.12 ảnh tham chiếu đi kèm khi nhập", !!(T.getNgoaiHinh("nhz_moi_1") || {}).anh);

  // ghi đè khi bật tuỳ chọn
  await T.nhapHoSoNgoaiHinh([Object.assign({}, T.getNgoaiHinh("nhz_moi_1"), { moTa: "bản ghi đè" })], { ghiDe: true });
  await T.loadNgoaiHinh();
  chk("6.13 bật ghi đè thì thay hồ sơ trùng ID", T.getNgoaiHinh("nhz_moi_1").moTa === "bản ghi đè");

  // 6E. nhập truyện "bản sao" ⇒ cấp ID mới + dịch lại liên kết
  const fileTruyen = JSON.parse(JSON.stringify(fStory));
  const doc = T.docFileNhap(fileTruyen);
  chk("6.14 đọc file truyện nhận đúng hồ sơ kèm theo", Object.keys(doc.ngoaiHinh).length >= 1, JSON.stringify(Object.keys(doc.ngoaiHinh)));
  const ctTruoc = S.store.stories.length;
  const hoSoTruoc = T.dsNgoaiHinh().length;
  const kqBS = await T.chuanNhap(T.docFileNhap(fileTruyen), "banSao", {});
  const vBS = kqBS.viec[0];
  const idMoi = Object.keys(vBS.ngoaiHinh);
  chk("6.15 bản sao tạo hồ sơ MỚI có id mới", idMoi.length >= 1 && idMoi[0] !== hSara.id, JSON.stringify(idMoi));
  chk("6.16 liên kết nhân vật trỏ sang id hồ sơ MỚI", (() => {
    const nvIds = vBS.story.nhanVats.map((c) => c.ngoaiHinhId).filter(Boolean);
    return nvIds.length >= 1 && nvIds.every((id) => !!vBS.ngoaiHinh[id]);
  })(), JSON.stringify(vBS.story.nhanVats.map((c) => c.ngoaiHinhId)));
  chk("6.17 bản sao có id truyện mới, không trùng bản gốc", vBS.story.id !== storyZZ.id);
  chk("6.18 bản sao KHÔNG dùng chung khoá tin nhắn với bản gốc", Object.keys(vBS.messages)[0] !== "ht_z1", JSON.stringify(Object.keys(vBS.messages)));

  // 6F. hồ sơ không có trong file ⇒ BỎ liên kết (không trỏ ra ngoài)
  const fThieu = JSON.parse(JSON.stringify(fStory));
  for (const c of fThieu.story.nhanVats) c.ngoaiHinhId = "nh_khong_ton_tai";
  fThieu.ngoaiHinh = {};
  const kqThieu = await T.chuanNhap(T.docFileNhap(fThieu), "banSao", {});
  chk("6.19 hồ sơ thiếu trong file ⇒ bỏ liên kết, không trỏ ra ngoài", kqThieu.viec[0].story.nhanVats.every((c) => !c.ngoaiHinhId), JSON.stringify(kqThieu.viec[0].story.nhanVats.map((c) => c.ngoaiHinhId)));

  // 6G. mặc định KHÔNG ghi đè hồ sơ đang có khi khôi phục ghi đè
  const fGD = JSON.parse(JSON.stringify(fStory));
  const idDau = Object.keys(fGD.ngoaiHinh)[0];
  fGD.ngoaiHinh[idDau] = Object.assign({}, fGD.ngoaiHinh[idDau], { moTa: "TỪ FILE" });
  const kqGD1 = await T.chuanNhap(T.docFileNhap(fGD), "ghiDe", { xoaThua: false, dongY18: false });
  chk("6.20 khôi phục ghi đè MẶC ĐỊNH giữ nguyên hồ sơ đang có", !kqGD1.viec[0].ngoaiHinh[idDau], JSON.stringify(Object.keys(kqGD1.viec[0].ngoaiHinh)));
  const kqGD2 = await T.chuanNhap(T.docFileNhap(fGD), "ghiDe", { xoaThua: false, dongY18: false, ghiDeHoSo: true });
  chk("6.21 bật ghiDeHoSo thì hồ sơ trùng ID được thay bằng bản trong file", (kqGD2.viec[0].ngoaiHinh[idDau] || {}).moTa === "TỪ FILE", JSON.stringify((kqGD2.viec[0].ngoaiHinh[idDau] || {}).moTa));

  // 6H. chuẩn bị nhập là THUẦN ĐỌC ⇒ không đụng gì khi chưa bấm Nhập
  await S.loadStories();
  await T.loadNgoaiHinh();
  chk("6.22 chuẩn bị nhập không đổi thư viện/truyện", S.store.stories.length === ctTruoc && T.dsNgoaiHinh().length === hoSoTruoc, S.store.stories.length + "/" + T.dsNgoaiHinh().length + " vs " + ctTruoc + "/" + hoSoTruoc);
  chk("6.23 không đụng dữ liệu truyện thật", (await chotThat()) === window.__DH.that, await chotThat());
} catch (e) { chk("PHẦN 6 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 7: lỗi lưu
try {
  dongHetModal();
  A.caiChan();
  const truoc = T.dsNgoaiHinh().length;
  T.openNgoaiHinh();
  await cho(200);
  await bamBody('[data-nh2="tu-mota"]');
  await cho(200);
  setV(F("nhTen"), "Khong Luu Duoc");
  setV(F("nhMoTa"), "mô tả quan trọng không được mất");
  A.datLoi({ folder: "thuVienNgoaiHinh", method: "set", lan: 1 });
  const daBam = await bamFoot("Tạo hồ sơ");
  await cho(500);
  const conMo = !!F("nhTen");
  chk("7.0a bấm được nút lưu của form tạo mới", daBam);
  chk("7.1 ghi hỏng ⇒ form vẫn mở, không đóng", conMo);
  chk("7.2 nội dung đã gõ vẫn còn nguyên (không mất bản nháp)", conMo && F("nhTen").value === "Khong Luu Duoc" && F("nhMoTa").value === "mô tả quan trọng không được mất", conMo ? F("nhTen").value : "(form đã đóng)");
  chk("7.3 có thông báo lỗi lưu", /không lưu được|Chưa lưu|Lỗi/i.test((bodyTren().querySelector("[data-nh-status]") || {}).textContent || ""), (bodyTren().querySelector("[data-nh-status]") || {}).textContent);
  chk("7.4 bộ đệm RAM không lệch đĩa (không có hồ sơ ma)", T.dsNgoaiHinh().length === truoc && !T.dsNgoaiHinh().some((x) => x.tenChinh === "Khong Luu Duoc"), T.dsNgoaiHinh().length + " vs " + truoc);
  A.xoaLoi();
  await bamFoot("Huỷ");
  await cho(200);
  dongHetModal();

  // lỗi khi NHẬP nhiều hồ sơ ⇒ trả nguyên trạng
  await T.loadNgoaiHinh();
  const truoc2 = T.dsNgoaiHinh().map((x) => x.id).sort().join(",");
  A.datLoi({ folder: "thuVienNgoaiHinh", method: "set", lan: 2 });
  let nem = false;
  try {
    await T.nhapHoSoNgoaiHinh([T.chuanHoaHoSo({ id: "nhz_nhap_loi_1", tenChinh: "A1" }), T.chuanHoaHoSo({ id: "nhz_nhap_loi_2", tenChinh: "A2" })], { ghiDe: true });
  } catch (e) { nem = true; }
  A.xoaLoi();
  await T.loadNgoaiHinh();
  chk("7.5 nhập hỏng giữa chừng ⇒ ném lỗi + trả thư viện nguyên trạng", nem && T.dsNgoaiHinh().map((x) => x.id).sort().join(",") === truoc2, nem + " | " + T.dsNgoaiHinh().length);
  chk("7.6 không còn hồ sơ nửa chừng sau khi nhập hỏng", !T.dsNgoaiHinh().some((x) => /^nhz_nhap_loi/.test(x.id)));

  // 7.7 xoá hỏng ⇒ hồ sơ vẫn còn (RAM không lệch đĩa)
  const hX = T.dsNgoaiHinh()[0];
  A.datLoi({ folder: "thuVienNgoaiHinh", method: "delete", lan: 1 });
  let nemXoa = false;
  try { await T.xoaNgoaiHinh(hX.id); } catch (e) { nemXoa = true; }
  A.xoaLoi();
  chk("7.7 xoá hỏng ⇒ ném lỗi và hồ sơ vẫn còn nguyên", nemXoa && !!T.getNgoaiHinh(hX.id), nemXoa + " | " + !!T.getNgoaiHinh(hX.id));

  // dọn hồ sơ test + truyện test — CHỈ xoá theo id test (`nhz_*`), KHÔNG bao giờ xoá theo TÊN
  // (tên do người dùng đặt có thể trùng tên kiểm thử ⇒ xoá mất dữ liệu thật; xem tests/README.md).
  for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
  await T.loadNgoaiHinh();
  for (const id of ["ct_zz1", "ct_zz2"]) await A.xoaZZ(id).catch(() => {});
} catch (e) { chk("PHẦN 7 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 9: cách ly dữ liệu thật
try {
  A.xoaLoi();
  chk("9.1 dữ liệu truyện thật còn nguyên sau mọi thao tác", (await chotThat()) === window.__DH.that, (await chotThat()) + " vs " + window.__DH.that);
  dongHetModal();
} catch (e) { chk("9.x không kiểm tra được dữ liệu thật", false, e && e.message); }

return { ok: kq.every((x) => x.ok), tong: kq.length, hong: kq.filter((x) => !x.ok).length, failures: kq.filter((x) => !x.ok) };
