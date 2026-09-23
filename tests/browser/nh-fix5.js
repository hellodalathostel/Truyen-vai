// NĂM LỖI của đợt "Thư viện ngoại hình v1" — kiểm thử ĐÚNG tình huống đã báo.
// PHẢI chạy SAU: audit-base.js (một eval), nh-fake-ai.js (một eval riêng).
//
//  A. Bấm Huỷ vẫn làm đổi liên kết hồ sơ  → form dùng BẢN NHÁP.
//  B. Khôi phục toàn thư viện bỏ sót hồ sơ chưa gắn vào truyện → nhập cả thư viện.
//  C. Chữ người dùng thêm cuối prompt tạo ảnh bị xoá → ô mô tả chỉ chứa mô tả cảnh.
//  D. Lỗi đọc thư viện bị coi thành thư viện rỗng → giữ bộ đệm + chặn xuất thiếu.
//  E. Vẫn xoá được hồ sơ mà ẢNH đã lưu đang tham chiếu → đếm cả `anh[].hoSoIds`.
const A = window.__A;
if (!A || !A.auditBaseReady) throw new Error("Thiếu audit-base.js");
const T = A.T, S = A.S;
const cho = A.cho;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 320) });
const log = [];
const ghi = (s) => log.push(s);

const dongHetModal = () => { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); };
const bodyTren = () => { const m = A.modalTren(); return m ? m.querySelector(".modal-body") : null; };
const footBtn = (nhan) => {
  const m = A.modalTren();
  if (!m) return null;
  return Array.from(m.querySelectorAll(".modal-foot .btn")).find((x) => new RegExp(nhan, "i").test(x.textContent || "")) || null;
};
const bamFoot = async (nhan) => { const b = footBtn(nhan); if (!b) return false; b.click(); await cho(250); return true; };
const F = (f) => { const b = bodyTren(); return b ? b.querySelector('[data-f="' + f + '"]') : null; };
const setV = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("input", { bubbles: true })); };
const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const mk = (ten, moTa, tranh) => T.chuanHoaHoSo({ id: S.uid("nhz"), tenChinh: ten, moTa: moTa || "mô tả kiểm thử", tranh: tranh || "" });

const TEN_T = ["Fix A1", "Fix A2", "Fix B dùng", "Fix B chưa dùng", "Fix C", "Fix E"];
const donHoSoTest = async () => {
  for (const h of T.dsNgoaiHinh().slice()) {
    // CHỈ xoá hồ sơ kiểm thử (`nhz_*`). Id hồ sơ THẬT là `nh_*` — không bao giờ lọc `^nh_`.
    if (/^nhz/.test(h.id) || TEN_T.indexOf(h.tenChinh) >= 0) await T.xoaNgoaiHinh(h.id).catch(() => {});
  }
  await T.loadNgoaiHinh();
};
const donTruyenTest = async () => {
  for (const s of S.store.stories.slice()) if (/^ct_zz/.test(s.id)) { try { await S.deleteStory(s.id); } catch (e) {} }
  await T.loadStories();
};

// Bắt nội dung file "xuất" mà không tải thật (giống nh-io.js).
let batBlob = null, batTen = null;
if (!window.__NH_DL2) {
  window.__NH_DL2 = true;
  const gocCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { if (b instanceof Blob) { batBlob = b; batTen = null; } return gocCreate(new Blob([""])); };
  const gocClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { batTen = this.download; return; } return gocClick.apply(this, arguments); };
}

// =============================================================== A. BẤM HUỶ (lỗi 1)
try {
  dongHetModal();
  await donHoSoTest();
  await donTruyenTest();
  const hsA = mk("Fix A1", "tóc đỏ, mắt nâu");
  const hsB = mk("Fix A2", "tóc bạc, mắt xám");
  await T.luuNgoaiHinh(hsA);
  await T.luuNgoaiHinh(hsB);
  await T.loadNgoaiHinh();
  await A.taoZZ({ id: "ct_zza1", ten: "ZZ A" });
  await T.loadStories();
  {
    const s0 = await root.kv.cotTruyen.get("ct_zza1");
    s0.nhanVats[0].ngoaiHinhId = hsA.id;
    s0.nhanVats[0].bietDanh = "Biệt danh gốc";
    s0.nhanVats[0].ten = "Zara";
    await root.kv.cotTruyen.set("ct_zza1", s0);
    await T.loadStories();
  }
  T.app.storyId = "ct_zza1"; T.app.convId = "ht_z1"; T.app.screen = "story";
  T.render();
  await cho(200);

  const doc = async () => (await root.kv.cotTruyen.get("ct_zza1")).nhanVats.find((c) => c.id === "nv_z1");
  const truoc = await doc();

  // --- Đổi liên kết + tên + biệt danh trong form rồi bấm HUỶ ---
  T.openCharacterEditor("nv_z1");
  await cho(280);
  chk("A1 form mở với đúng liên kết hiện tại", !!F("ngoaiHinhId") && F("ngoaiHinhId").value === hsA.id, F("ngoaiHinhId") && F("ngoaiHinhId").value);
  F("ngoaiHinhId").value = hsB.id;
  F("ngoaiHinhId").dispatchEvent(new Event("change", { bubbles: true }));
  await cho(200);
  F("bietDanh").value = "Biệt danh nháp";
  setV(F("ten"), "Tên nháp");
  await cho(100);
  chk("A2 form đã đổi (nháp) trước khi huỷ", F("ngoaiHinhId").value === hsB.id && F("ten").value === "Tên nháp");
  const huy = await bamFoot("Huỷ");
  await cho(250);
  chk("A3 bấm được nút Huỷ", huy);
  const sauHuy = await doc();
  chk("A4 Huỷ ⇒ liên kết hồ sơ KHÔNG đổi trong truyện", sauHuy.ngoaiHinhId === hsA.id, sauHuy.ngoaiHinhId);
  chk("A5 Huỷ ⇒ tên và biệt danh KHÔNG đổi", sauHuy.ten === "Zara" && sauHuy.bietDanh === "Biệt danh gốc", sauHuy.ten + " / " + sauHuy.bietDanh);

  // --- Lần lưu truyện TIẾP THEO (một thao tác khác) cũng không được ghi thay đổi đã huỷ ---
  await T.luuTruyen(S.getStory("ct_zza1"), "kiểm thử");
  const sauLuu = await doc();
  chk("A6 lần lưu truyện sau đó cũng không ghi thay đổi đã huỷ", sauLuu.ngoaiHinhId === hsA.id && sauLuu.ten === "Zara", sauLuu.ngoaiHinhId + " / " + sauLuu.ten);

  // --- Bấm LƯU thì thay đổi phải được ghi thật ---
  T.openCharacterEditor("nv_z1");
  await cho(280);
  F("ngoaiHinhId").value = hsB.id;
  F("ngoaiHinhId").dispatchEvent(new Event("change", { bubbles: true }));
  await cho(200);
  await bamFoot("Lưu");
  await cho(350);
  const sauLuu2 = await doc();
  chk("A7 bấm Lưu thì liên kết mới được ghi thật", sauLuu2.ngoaiHinhId === hsB.id, sauLuu2.ngoaiHinhId);

  // --- Ghi hỏng ⇒ nhân vật trong truyện vẫn nguyên trạng, modal vẫn mở với chữ đã gõ ---
  A.caiChan();
  A.datLoi({ folder: "cotTruyen", method: "set", lan: 1 });
  T.openCharacterEditor("nv_z1");
  await cho(280);
  F("ngoaiHinhId").value = hsA.id;
  F("ngoaiHinhId").dispatchEvent(new Event("change", { bubbles: true }));
  await cho(200);
  setV(F("ten"), "Tên không lưu được");
  await cho(100);
  await bamFoot("Lưu");
  await cho(500);
  A.xoaLoi();
  const sauHong = await doc();
  chk("A8 ghi hỏng ⇒ nhân vật trong truyện vẫn nguyên trạng", sauHong.ngoaiHinhId === hsB.id && sauHong.ten === "Zara", sauHong.ngoaiHinhId + " / " + sauHong.ten);
  chk("A9 ghi hỏng ⇒ modal vẫn mở và chữ đã gõ còn nguyên", !!F("ten") && F("ten").value === "Tên không lưu được", F("ten") ? F("ten").value : "modal đã đóng");
  dongHetModal();
  await cho(150);
} catch (e) { chk("PHẦN A không chạy hết", false, e && e.stack); }

// =============================================================== B. KHÔI PHỤC CẢ THƯ VIỆN (lỗi 2)
try {
  dongHetModal();
  const hsDung = mk("Fix B dùng", "ngoại hình đang dùng");
  const hsChua = mk("Fix B chưa dùng", "ngoại hình chưa gắn vào đâu");
  await T.luuNgoaiHinh(hsDung);
  await T.luuNgoaiHinh(hsChua);
  await T.loadNgoaiHinh();
  await A.taoZZ({ id: "ct_zzb1", ten: "ZZ B" });
  await T.loadStories();
  {
    const s0 = await root.kv.cotTruyen.get("ct_zzb1");
    s0.nhanVats[0].ngoaiHinhId = hsDung.id;
    await root.kv.cotTruyen.set("ct_zzb1", s0);
    await T.loadStories();
  }
  const sB = await root.kv.cotTruyen.get("ct_zzb1");
  const msgs = {};
  for (const c of sB.hoiThoais) msgs[c.id] = (await root.kv.tinNhan.get(c.id)) || [];
  const fileToanBo = {
    toanBo: true,
    list: [JSON.parse(JSON.stringify(sB))],
    messages: msgs,
    anh: {},
    ngoaiHinh: { [hsDung.id]: Object.assign({}, T.getNgoaiHinh(hsDung.id)), [hsChua.id]: Object.assign({}, T.getNgoaiHinh(hsChua.id)) },
  };
  const fileMotTruyen = { toanBo: false, list: [JSON.parse(JSON.stringify(sB))], messages: msgs, anh: {}, ngoaiHinh: fileToanBo.ngoaiHinh };

  // Xoá CẢ HAI hồ sơ khỏi thư viện (như thể vừa cài lại trình duyệt) rồi mới xem kế hoạch
  // khôi phục: đây chính là chỗ lỗi — trước đây chỉ hồ sơ truyện tham chiếu được nhận.
  await T.xoaNgoaiHinh(hsDung.id);
  await T.xoaNgoaiHinh(hsChua.id);
  await T.loadNgoaiHinh();
  chk("B4 đã xoá sạch hai hồ sơ trước khi khôi phục", !T.getNgoaiHinh(hsDung.id) && !T.getNgoaiHinh(hsChua.id));

  // Kế hoạch (thuần đọc, chưa ghi gì).
  const plan = await T.chuanNhap(fileToanBo, "ghiDe", {});
  const idTrongKeHoach = new Set();
  for (const v of plan.viec) for (const k in v.ngoaiHinh || {}) idTrongKeHoach.add(k);
  for (const k in plan.hoSoToanBo || {}) idTrongKeHoach.add(k);
  chk("B1 kế hoạch khôi phục file TOÀN BỘ có cả hồ sơ CHƯA dùng", idTrongKeHoach.has(hsDung.id) && idTrongKeHoach.has(hsChua.id), JSON.stringify(Array.from(idTrongKeHoach)));
  chk("B2 ảnh chụp để trả lại nguyên trạng có đủ khoá của cả hai hồ sơ", Object.prototype.hasOwnProperty.call(plan.snap.nh, hsDung.id) && Object.prototype.hasOwnProperty.call(plan.snap.nh, hsChua.id), Object.keys(plan.snap.nh).join(","));
  const plan1 = await T.chuanNhap(fileMotTruyen, "ghiDe", {});
  const ids1 = new Set();
  for (const v of plan1.viec) for (const k in v.ngoaiHinh || {}) ids1.add(k);
  for (const k in plan1.hoSoToanBo || {}) ids1.add(k);
  chk("B3 file MỘT TRUYỆN thì chỉ kèm hồ sơ truyện tham chiếu", ids1.has(hsDung.id) && !ids1.has(hsChua.id), JSON.stringify(Array.from(ids1)));
  chk("B3b thư viện không bị đụng khi chỉ XEM kế hoạch", !T.getNgoaiHinh(hsDung.id) && !T.getNgoaiHinh(hsChua.id));
  const dsThat = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  const chotThat = dsThat.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
  window.__FIX5_THAT = (chotThat ? chotThat.id + "|" + chotThat.ten : "MẤT") + "|" + ((chotThat && chotThat.hoiThoais) || []).length;

  T.openNhapTruyen(fileToanBo, "toan-bo.json");
  await cho(350);
  const radio = bodyTren() ? bodyTren().querySelector('input[name="nhapCheDo"][value="ghiDe"]') : null;
  chk("B5 hộp thoại nhập có nói rõ cả thư viện sẽ được khôi phục", !!bodyTren() && /cả thư viện được khôi phục/.test(bodyTren().textContent));
  if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
  await cho(120);
  const nutNhap = footBtn("^Nhập$");
  if (nutNhap) { nutNhap.click(); } else { chk("B5b có nút Nhập", false); }
  for (let i = 0; i < 20; i++) { await cho(150); if (footBtn("Ghi đè")) break; }
  const xacNhan = footBtn("Ghi đè");
  chk("B6 chế độ khôi phục ghi đè hỏi xác nhận trước khi ghi", !!xacNhan);
  if (xacNhan) xacNhan.click();
  for (let i = 0; i < 60; i++) { await cho(200); if (!A.modalTren()) break; }
  await T.loadNgoaiHinh();
  await T.loadStories();
  chk("B7 khôi phục xong ⇒ hồ sơ ĐANG DÙNG có lại", !!T.getNgoaiHinh(hsDung.id), JSON.stringify(T.dsNgoaiHinh().map((h) => h.tenChinh)));
  chk("B8 khôi phục xong ⇒ hồ sơ CHƯA DÙNG cũng có lại", !!T.getNgoaiHinh(hsChua.id), JSON.stringify(T.dsNgoaiHinh().map((h) => h.tenChinh)));
  chk("B9 liên kết của nhân vật vẫn trỏ đúng hồ sơ", (await root.kv.cotTruyen.get("ct_zzb1")).nhanVats[0].ngoaiHinhId === hsDung.id);
  dongHetModal();
  await cho(150);
} catch (e) { chk("PHẦN B không chạy hết", false, e && e.stack); }

// =============================================================== C. CHỮ CUỐI PROMPT (lỗi 3)
try {
  dongHetModal();
  const hsC = mk("Fix C", "tóc vàng, mắt xanh");
  await T.luuNgoaiHinh(hsC);
  await T.loadNgoaiHinh();
  await A.taoZZ({ id: "ct_zzc1", ten: "ZZ C" });
  await T.loadStories();
  {
    const s0 = await root.kv.cotTruyen.get("ct_zzc1");
    s0.nhanVats[0].ngoaiHinhId = hsC.id;
    await root.kv.cotTruyen.set("ct_zzc1", s0);
    await T.loadStories();
  }
  const AI2 = window.__NH_AI;
  AI2.mode = "ok";
  AI2.text = "MÔ TẢ ẢNH: A dark alley at night.\nLOẠI TRỪ: text\nCHÚ THÍCH: Ngõ tối.";
  T.app.storyId = "ct_zzc1"; T.app.convId = "ht_z1"; T.app.screen = "story";
  await T.loadMessages("ht_z1");
  T.render();
  await cho(200);
  await T.openTaoAnh({ tinNhan: "Zara trong ngõ" });
  await cho(600);
  const promptV = () => (F("prompt") ? F("prompt").value : "");
  const khoiEl = bodyTren() ? bodyTren().querySelector("[data-nh-khoi]") : null;
  // Chỉ phần THÂN khối — tiêu đề khối và dòng nhắc "chưa dịch được" không phải nội dung ghép.
  const khoiBody = khoiEl ? khoiEl.querySelector(".nh-khoi-body") : null;
  chk("C1 ô mô tả không chứa khối ngoại hình", promptV().indexOf(T.MARK_NGOAI_HINH) < 0, promptV().slice(0, 110));
  chk("C2 khối ngoại hình hiện riêng và có tên nhân vật", !!khoiEl && !khoiEl.hidden && !!khoiBody && /- Fix C:/.test(khoiBody.textContent), khoiBody ? khoiBody.textContent.slice(0, 110) : "không có khối");
  chk("C3 có dòng nói rõ ô mô tả không bị ghi đè", /không bị ghi đè/.test(bodyTren().textContent));
  // Người dùng viết thêm yêu cầu trang phục ở CUỐI ô rồi bấm nhận diện lại (đổi chip).
  const them = "wearing a heavy fur coat and leather gloves";
  const ta = F("prompt");
  ta.value = promptV() + "\n" + them;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  await cho(800);
  chk("C4 chữ thêm ở cuối ô sống sót qua lần tự ghép lại", /heavy fur coat/.test(promptV()), promptV().slice(-120));
  await bamFoot("Đóng");
  await cho(150);
  // mở lại từ ảnh cũ: prompt lưu đã ghép, ô nhập phải chỉ nhận phần mô tả cảnh
  const VE = window.__NH_VE;
  VE.calls = 0;
  await T.openTaoAnh({ tinNhan: "Zara trong ngõ" });
  await cho(500);
  F("prompt").value = "A dark alley at night, moonlight";
  F("prompt").dispatchEvent(new Event("input", { bubbles: true }));
  await cho(600);
  const bDung = A.modalTren() ? A.modalTren().querySelector('[data-act2="dung"]') : null;
  if (bDung) bDung.click();
  for (let i = 0; i < 30; i++) { await cho(150); if (VE.calls) break; }
  chk("C5 prompt gửi máy vẽ có chữ người dùng viết thêm", /moonlight/.test(VE.last), VE.last.slice(0, 140));
  chk("C6 prompt máy vẽ NHẬN vẫn có khối ngoại hình ở cuối (sau khi plugin đánh giá)", (() => { const p = VE.last.evaluateItem; return /- Fix C:/.test(p) && p.indexOf(T.MARK_NGOAI_HINH) > p.indexOf("moonlight"); })(), VE.last.slice(-150));
  chk("C7 sau khi dựng, ô mô tả vẫn KHÔNG bị nhét khối vào", promptV().indexOf(T.MARK_NGOAI_HINH) < 0 && /moonlight/.test(promptV()), promptV().slice(0, 110));
  dongHetModal();
  await cho(150);
} catch (e) { chk("PHẦN C không chạy hết", false, e && e.stack); }

// =============================================================== D. LỖI ĐỌC THƯ VIỆN (lỗi 4)
try {
  dongHetModal();
  const hsD = mk("Fix D", "hồ sơ để thử lỗi đọc");
  await T.luuNgoaiHinh(hsD);
  await T.loadNgoaiHinh();
  chk("D0 chưa có lỗi đọc", T.coLoiDocNgoaiHinh() === false);

  // Vá tầng IndexedDB: đọc folder thư viện ngoại hình ⇒ ném lỗi.
  const P = IDBObjectStore.prototype;
  const gocGetAll = P.getAll;
  let daChan = 0;
  P.getAll = function () {
    if (/thuVienNgoaiHinh/.test(String(this.name))) { daChan++; throw new Error("lỗi đọc giả lập"); }
    return gocGetAll.apply(this, arguments);
  };
  const truoc = T.dsNgoaiHinh().length;
  await T.loadNgoaiHinh();
  chk("D1 đọc hỏng ⇒ KHÔNG coi là thư viện rỗng (bộ đệm giữ nguyên)", truoc > 0 && T.dsNgoaiHinh().length === truoc, T.dsNgoaiHinh().length + " vs " + truoc);
  chk("D2 có cờ báo lỗi đọc", T.coLoiDocNgoaiHinh() === true);
  chk("D3 tầng đọc thật sự đã bị chặn để thử (không phải test rỗng)", daChan > 0, daChan);
  chk("D4 hồ sơ vẫn tra cứu được theo id", !!T.getNgoaiHinh(hsD.id));

  T.openNgoaiHinh();
  await cho(300);
  chk("D5 thư viện BÁO lỗi đọc và KHÔNG hiện như thư viện rỗng", !!bodyTren().querySelector(".nh-loi-doc") && /thiếu hồ sơ/.test(bodyTren().textContent));
  chk("D6 có nút thử đọc lại", !!bodyTren().querySelector('[data-nh2="doc-lai"]'));
  dongHetModal();
  await cho(120);

  // Xuất bản sao lưu: phải HỎI trước, không được lặng lẽ xuất thiếu hồ sơ.
  batBlob = null; batTen = null;
  const pXuat = T.xuatTatCa();
  let coHoiDocLoi = false, taiTruocKhiXacNhan = false;
  for (let i = 0; i < 60; i++) {
    await cho(150);
    const txt = A.modalTren() ? A.modalTren().textContent : "";
    if (/Không đọc được thư viện ngoại hình/.test(txt)) { coHoiDocLoi = true; taiTruocKhiXacNhan = !!batBlob; break; }
    const b = footBtn("Vẫn xuất"); // hộp thoại khác (ví dụ thiếu ảnh) — bỏ qua
    if (b) { b.click(); continue; }
    if (batBlob) break;
  }
  chk("D7 đọc hỏng ⇒ xuất bản sao lưu HỎI trước", coHoiDocLoi, A.modalTren() ? A.modalTren().textContent.slice(0, 130) : "không có hộp thoại");
  chk("D8 chưa tải file nào khi chưa xác nhận", taiTruocKhiXacNhan === false);
  const huyXuat = footBtn("^Huỷ$");
  if (huyXuat) huyXuat.click();
  await cho(300);
  await pXuat;
  chk("D9 bỏ qua lời hỏi ⇒ KHÔNG có file được tải", batBlob === null && batTen === null, String(batTen));
  dongHetModal();

  // Bỏ vá ⇒ đọc lại được, hết cờ lỗi, xuất bình thường và file có đủ hồ sơ.
  P.getAll = gocGetAll;
  await T.loadNgoaiHinh();
  chk("D10 đọc lại thành công ⇒ xoá cờ lỗi", T.coLoiDocNgoaiHinh() === false);
  batBlob = null; batTen = null;
  const pXuat2 = T.xuatTatCa();
  for (let i = 0; i < 80; i++) {
    await cho(150);
    if (batBlob) break;
    const b = footBtn("Vẫn xuất");
    if (b) b.click();
  }
  await pXuat2;
  await cho(250);
  const fAll = batBlob ? JSON.parse(await batBlob.text()) : null;
  chk("D11 đọc tốt thì xuất toàn bộ chạy bình thường, kèm hồ sơ", !!fAll && !!fAll.ngoaiHinh && !!fAll.ngoaiHinh[hsD.id], fAll ? Object.keys(fAll.ngoaiHinh || {}).join(",") : "không có file");
  dongHetModal();
  await cho(120);
} catch (e) { chk("PHẦN D không chạy hết", false, e && e.stack); }

// =============================================================== E. XOÁ HỒ SƠ CÒN ẢNH DÙNG (lỗi 5)
try {
  dongHetModal();
  const hsE = mk("Fix E", "hồ sơ dùng cho ảnh cảnh");
  await T.luuNgoaiHinh(hsE);
  await T.loadNgoaiHinh();
  await A.taoZZ({ id: "ct_zze1", ten: "ZZ E" });
  await T.loadStories();
  const sE = await root.kv.cotTruyen.get("ct_zze1");
  const meta = S.newAnh({ dataUrl: ANH_1PX, prompt: "x", convId: sE.hoiThoais[0].id, hoSoIds: [hsE.id] });
  await S.luuAnh(sE, meta);
  await T.luuTruyen(sE, "kiểm thử");
  await T.loadStories();
  const dem = T.demDungNgoaiHinh(T.store.stories, hsE.id);
  chk("E1 đếm được ảnh đang dùng hồ sơ (không có nhân vật nào liên kết)", dem.nhanVat === 0 && dem.anh === 1, JSON.stringify(dem));

  T.xoaHoSoNgoaiHinh(hsE.id);
  await cho(300);
  const txt = A.modalTren() ? A.modalTren().textContent : "";
  chk("E2 xoá hồ sơ còn ảnh tham chiếu ⇒ BỊ CHẶN", /Không thể xoá/.test(txt), txt.slice(0, 150));
  chk("E3 lời chặn nói rõ là do ảnh cảnh", /ảnh cảnh/.test(txt), txt.slice(0, 200));
  chk("E4 hồ sơ vẫn còn sau khi bị chặn", !!T.getNgoaiHinh(hsE.id));
  const bDaHieu = footBtn("Đã hiểu");
  if (bDaHieu) bDaHieu.click();
  await cho(250);

  // Gỡ ảnh đi ⇒ xoá được (cửa chặn không được cứng hơn sự thật).
  const sE2 = S.getStory("ct_zze1");
  await T.xoaAnhKhoiTruyen(sE2, meta.id);
  await T.loadStories();
  dongHetModal();
  T.xoaHoSoNgoaiHinh(hsE.id);
  await cho(250);
  const xacNhan = footBtn("Xoá");
  if (xacNhan) xacNhan.click();
  await cho(400);
  chk("E5 gỡ ảnh rồi thì xoá hồ sơ được", !T.getNgoaiHinh(hsE.id), JSON.stringify(T.dsNgoaiHinh().map((h) => h.tenChinh)));
  dongHetModal();
  await cho(120);
} catch (e) { chk("PHẦN E không chạy hết", false, e && e.stack); }

// =============================================================== F. BẤT BIẾN + DỮ LIỆU THẬT
try {
  dongHetModal();
  const mo = T.thamChieuMo(T.store.stories, T.dsNgoaiHinh());
  chk("F1 không có tham chiếu mồ (hồ sơ bị xoá khi vẫn còn người dùng)", mo.length === 0, JSON.stringify(mo).slice(0, 240));
  const dsThat2 = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  const that2 = dsThat2.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
  const chot2 = (that2 ? that2.id + "|" + that2.ten : "MẤT") + "|" + ((that2 && that2.hoiThoais) || []).length;
  chk("F2 KHÔNG đụng dữ liệu truyện thật", chot2.split("|").slice(0, 2).join("|") === window.__FIX5_THAT.split("|").slice(0, 2).join("|"), chot2 + " vs " + window.__FIX5_THAT);
  chk("F3 dữ liệu thật y nguyên như lúc đầu đợt kiểm thử", !window.__FIX5_THAT || chot2 === window.__FIX5_THAT, chot2 + " vs " + window.__FIX5_THAT);
} catch (e) { chk("PHẦN F không chạy hết", false, e && e.stack); }

// ---- dọn dữ liệu test ----
try {
  for (const s of S.store.stories.slice()) if (/^ct_zz/.test(s.id)) { try { await S.deleteStory(s.id); } catch (e) {} }
  await T.loadStories();
  await donHoSoTest();
  const conLai = T.thamChieuMo(T.store.stories, T.dsNgoaiHinh());
  ghi("tham chiếu mồ sau khi dọn: " + conLai.length);
} catch (e) { ghi("dọn lỗi: " + (e && e.message)); }

return {
  ok: kq.every((x) => x.ok),
  tong: kq.length,
  hong: kq.filter((x) => !x.ok).length,
  failures: kq.filter((x) => !x.ok),
  log,
};
