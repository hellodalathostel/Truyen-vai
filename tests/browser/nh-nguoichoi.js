// Kiểm thử "NGƯỜI CHƠI cũng liên kết được hồ sơ ngoại hình".
//
// Người chơi KHÔNG nằm trong `story.nhanVats` — họ là `story.nguoiChoi`. Bộ này kiểm tra
// họ được đối xử như một người trong khung hình: liên kết được, hiện chip "bạn", mặc định
// được chọn, ngoại hình vào prompt, ảnh nhớ `hoSoIds`, chặn xoá hồ sơ họ đang dùng, xuất
// riêng truyện kèm hồ sơ, và bản sao khi nhập dịch/bỏ liên kết cho đúng.
//
// PHẢI chạy SAU: audit-base.js (eval riêng) + nh-fake-ai.js (eval riêng).
const A = window.__A;
if (!A || !A.auditBaseReady) throw new Error("Thiếu audit-base.js");
const T = A.T, S = A.S;
const AI = window.__NH_AI;
if (!AI) throw new Error("Thiếu nh-fake-ai.js");
const VE = window.__NH_VE;
const cho = A.cho;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 300) });
const ghi = (s) => kq.push({ ten: "· " + s, ok: true, ct: "" });

// -- tiện ích UI -----------------------------------------------------------------
const dongHetModal = () => { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); };
const bodyTren = () => { const m = A.modalTren(); return m ? m.querySelector(".modal-body") : null; };
const footBtn = (nhan) => {
  const m = A.modalTren();
  if (!m) return null;
  return Array.from(m.querySelectorAll(".modal-foot .btn")).find((x) => new RegExp(nhan, "i").test(x.textContent || "")) || null;
};
const bamFoot = async (nhan) => { const b = footBtn(nhan); if (!b) return false; b.click(); await cho(220); return true; };
const setV = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("input", { bubbles: true })); };
const chon = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("change", { bubbles: true })); };
const F = (f) => { const b = bodyTren(); return b ? b.querySelector('[data-f="' + f + '"]') : null; };
const moc = () => {
  const s = S.getStory("ct_zznc1");
  return s ? s.nguoiChoi.ngoaiHinhId || "" : "(mất truyện)";
};

try {
  dongHetModal();
  // dọn dữ liệu test cũ — CHỈ hồ sơ `nhz_*` (id hồ sơ THẬT là `nh_*`)
  for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
  await T.loadNgoaiHinh();
  await A.xoaZZ("ct_zznc1").catch(() => {});

  // ---- dựng cảnh thử: 1 truyện, 2 hồ sơ, 1 nhân vật liên kết, người chơi tên "Quân"
  await A.taoZZ({ id: "ct_zznc1", ten: "ZZ NC" });
  const st = S.getStory("ct_zznc1");
  st.nguoiChoi = { ten: "Quân", moTa: "sinh viên năm cuối", ngoaiHinhId: "" };
  const hsA = T.chuanHoaHoSo({ id: "nhz_nc_a", tenChinh: "A", tuoi: "24", moTa: "tóc đen, mắt nâu" });
  const hsNC = T.chuanHoaHoSo({ id: "nhz_nc_me", tenChinh: "Minh Quân", tuoi: "45", moTa: "vóc dáng đồ sộ, sẹo nhỏ bên má", tranh: "không mũ" });
  await T.luuNgoaiHinh(hsA);
  await T.luuNgoaiHinh(hsNC);
  await T.loadNgoaiHinh();
  st.nhanVats[0].ngoaiHinhId = hsA.id;
  await T.luuTruyen(st, "kiểm thử");
  await T.loadStories();

  // =========================================================== A. LOGIC THUẦN
  const s0 = S.getStory("ct_zznc1");
  const nc0 = T.nguoiChoiNhuNhanVat(s0);
  chk("A1 người chơi được bọc thành 'nhân vật' với id quy ước của app", nc0.id === T.ID_NGUOI_CHOI && nc0.id === "nguoi" && nc0.ten === "Quân" && nc0.ngoaiHinhId === "", JSON.stringify(nc0));
  chk("A2 laNguoiChoi phân biệt được người chơi với nhân vật", T.laNguoiChoi("nguoi") && !T.laNguoiChoi("nv_z1"));
  chk("A3 chưa liên kết ⇒ hoSoNguoiChoi = null", T.hoSoNguoiChoi(s0, T.dsNgoaiHinh()) === null);
  chk("A3b truyện THIẾU hẳn trường nguoiChoi.ngoaiHinhId vẫn an toàn", T.nguoiChoiNhuNhanVat({ nguoiChoi: { ten: "X" } }).ngoaiHinhId === "" && T.hoSoNguoiChoi({ nguoiChoi: { ten: "X" } }, T.dsNgoaiHinh()) === null);
  chk("A3c liên kết tới hồ sơ không tồn tại ⇒ null, không ném lỗi", T.hoSoNguoiChoi({ nguoiChoi: { ngoaiHinhId: "nh_khong_co" } }, T.dsNgoaiHinh()) === null);

  s0.nguoiChoi.ngoaiHinhId = hsNC.id;
  await T.luuTruyen(s0, "kiểm thử");
  await T.loadStories();
  const s = S.getStory("ct_zznc1");
  chk("A4 đã liên kết ⇒ hoSoNguoiChoi trả đúng hồ sơ", (T.hoSoNguoiChoi(s, T.dsNgoaiHinh()) || {}).id === hsNC.id);
  chk("A4b liên kết được GHI XUỐNG kv (không chỉ trong RAM)", ((await root.kv.cotTruyen.get("ct_zznc1")).nguoiChoi || {}).ngoaiHinhId === hsNC.id);

  const conv = s.hoiThoais[0]; // ht_z1 — nv_z1 (đã liên kết hsA)
  const uv = T.ungVienNgoaiHinh(s, conv, T.dsNgoaiHinh());
  chk("A5 ứng viên gồm nhân vật có hồ sơ + NGƯỜI CHƠI", uv.length === 2 && uv[0].nvId === "nv_z1" && uv[1].nvId === "nguoi", JSON.stringify(uv.map((x) => x.nvId)));
  chk("A6 mục của người chơi có cờ riêng và đứng CUỐI", uv[1].laNguoiChoi === true && uv[1].hoSoId === hsNC.id);
  chk("A7 tên nhận diện gồm cả tên hồ sơ lẫn tên trong truyện", (uv[1].ten || []).indexOf("Minh Quân") >= 0 && (uv[1].ten || []).indexOf("Quân") >= 0, JSON.stringify(uv[1].ten));
  const uv2 = T.ungVienNgoaiHinh(s, s.hoiThoais[1], T.dsNgoaiHinh()); // ht_z2 — nv_z2 chưa liên kết
  chk("A8 hội thoại không có nhân vật liên kết VẪN có người chơi", uv2.length === 1 && uv2[0].laNguoiChoi === true, JSON.stringify(uv2.map((x) => x.nvId)));
  const nhan = T.nhanDienNgoaiHinh("Quân bước vào, Minh Quân đứng dậy", uv);
  chk("A9 gõ tên người chơi ⇒ tự chọn hồ sơ của họ", nhan.chon.indexOf(hsNC.id) >= 0, JSON.stringify(nhan));
  chk("A10 demLienKetNgoaiHinh tính CẢ người chơi", T.demLienKetNgoaiHinh(S.store.stories, hsNC.id) === 1 && T.demLienKetNgoaiHinh(S.store.stories, hsA.id) === 1, T.demLienKetNgoaiHinh(S.store.stories, hsNC.id) + "/" + T.demLienKetNgoaiHinh(S.store.stories, hsA.id));
  const dung = T.demDungNgoaiHinh(S.store.stories, hsNC.id);
  chk("A11 demDungNgoaiHinh có mục nguoiChoi", dung.nguoiChoi === 1 && dung.nhanVat === 0 && dung.anh === 0, JSON.stringify(dung));
  chk("A12 moTaNguoiDung đọc được cả ba loại", T.moTaNguoiDung({ nhanVat: 1, nguoiChoi: 2, anh: 3 }) === "1 nhân vật · 2 người chơi · 3 ảnh cảnh", T.moTaNguoiDung({ nhanVat: 1, nguoiChoi: 2, anh: 3 }));
  const kèm = T.hoSoCuaTruyen(s, T.dsNgoaiHinh()).map((x) => x.id).sort().join(",");
  chk("A13 hoSoCuaTruyen kèm hồ sơ của người chơi", kèm === [hsA.id, hsNC.id].sort().join(","), kèm);
  chk("A14 bất biến: không tham chiếu mồ khi thư viện đủ", T.thamChieuMo(S.store.stories, T.dsNgoaiHinh()).length === 0);
  const mo = T.thamChieuMo(S.store.stories, T.dsNgoaiHinh().filter((h) => h.id !== hsNC.id));
  chk("A15 thiếu hồ sơ của người chơi ⇒ báo mồ đúng loại", mo.length === 1 && mo[0].loai === "nguoiChoi" && mo[0].id === "nguoi" && mo[0].hoSoId === hsNC.id, JSON.stringify(mo));

  // =========================================================== B. DỮ LIỆU
  const ch = S.chuanHoaTruyen({ ten: "x", nguoiChoi: { ten: "A", moTa: "b" } });
  chk("B1 chuẩn hoá thêm ngoaiHinhId rỗng cho truyện cũ", ch.nguoiChoi.ngoaiHinhId === "", JSON.stringify(ch.nguoiChoi));
  const ch2 = S.chuanHoaTruyen({ ten: "x", nguoiChoi: { ten: "A", ngoaiHinhId: 123 } });
  chk("B2 id không phải chuỗi ⇒ bỏ (không tự liên kết)", ch2.nguoiChoi.ngoaiHinhId === "", JSON.stringify(ch2.nguoiChoi.ngoaiHinhId));
  const ch3 = S.chuanHoaTruyen({ ten: "x", nguoiChoi: { ten: "A", ngoaiHinhId: "nhz_giu" } });
  chk("B3 id chuỗi được giữ nguyên (không đổi theo tên)", ch3.nguoiChoi.ngoaiHinhId === "nhz_giu");
  const ns = await S.createStory({ ten: "ZZ NC tạo", nguoiChoiTen: "B" });
  chk("B4 createStory tạo sẵn trường liên kết rỗng", !!ns && ns.nguoiChoi && ns.nguoiChoi.ngoaiHinhId === "");
  try { await S.deleteStory(ns.id); } catch (e) {}

  // =========================================================== C. TUỲ CHỌN TRUYỆN
  T.app.storyId = "ct_zznc1"; T.app.convId = "ht_z1"; T.app.screen = "story"; T.render();
  await cho(200);
  T.openStoryMenu();
  await cho(300);
  let bd = A.modalTren();
  chk("C1 mở Tuỳ chọn truyện có khối liên kết cho người chơi", !!bd && !!bd.querySelector("[data-nc-link]"));
  let sel = bd ? bd.querySelector('[data-f="nguoiChoiNgoaiHinhId"]') : null;
  chk("C2 ô chọn đang trỏ đúng hồ sơ của người chơi", !!sel && sel.value === hsNC.id, sel ? sel.value : "(không có ô)");
  chk("C3 danh sách đủ hồ sơ trong thư viện + mục “không liên kết”", !!sel && sel.querySelectorAll("option").length === T.dsNgoaiHinh().length + 1, sel ? sel.querySelectorAll("option").length : "?");
  let info = bd ? bd.querySelector("[data-nc-link-info]") : null;
  chk("C4 tóm tắt nói rõ ai đang dùng (kể cả người chơi)", !!info && /người chơi/.test(info.textContent) && /Minh Quân/.test(info.textContent), info ? info.textContent.slice(0, 140) : "?");
  chk("C5 cảnh báo lệch tên (bạn “Quân” ≠ “Minh Quân”)", !!info && !!info.querySelector(".nh-info-lech"));
  const nutTen = info ? info.querySelector('[data-act="dong-ten-nguoi-choi"]') : null;
  chk("C6 có nút “Dùng tên chính của hồ sơ”", !!nutTen);
  if (nutTen) nutTen.click();
  await cho(200);
  chk("C7 nút đó ĐIỀN vào ô tên", F("nguoiChoiTen") && F("nguoiChoiTen").value === "Minh Quân", F("nguoiChoiTen") ? F("nguoiChoiTen").value : "?");
  chk("C8 nhưng CHƯA lưu khi chưa bấm Lưu", S.getStory("ct_zznc1").nguoiChoi.ten === "Quân", S.getStory("ct_zznc1").nguoiChoi.ten);
  chon(bd.querySelector('[data-f="nguoiChoiNgoaiHinhId"]'), "");
  await cho(200);
  chk("C9 bỏ liên kết trên form ⇒ tóm tắt nói chưa liên kết", /Chưa liên kết/.test(bd.querySelector("[data-nc-link-info]").textContent), bd.querySelector("[data-nc-link-info]").textContent.slice(0, 100));
  await bamFoot("Đóng");
  await cho(250);
  chk("C10 Đóng mà không Lưu ⇒ liên kết trong kv KHÔNG đổi", (await root.kv.cotTruyen.get("ct_zznc1")).nguoiChoi.ngoaiHinhId === hsNC.id, moc());

  T.openStoryMenu();
  await cho(300);
  bd = A.modalTren();
  sel = bd.querySelector('[data-f="nguoiChoiNgoaiHinhId"]');
  chon(sel, hsA.id);
  await cho(200);
  await bamFoot("Lưu");
  await cho(400);
  let kvNc = (await root.kv.cotTruyen.get("ct_zznc1")).nguoiChoi;
  chk("C11 bấm Lưu ⇒ liên kết mới của người chơi được ghi xuống kv", kvNc.ngoaiHinhId === hsA.id, JSON.stringify(kvNc.ngoaiHinhId) + " vs " + hsA.id);

  // ghi hỏng khi Lưu ⇒ trả nguyên trạng, bảng vẫn mở
  T.openStoryMenu();
  await cho(300);
  bd = A.modalTren();
  chon(bd.querySelector('[data-f="nguoiChoiNgoaiHinhId"]'), hsNC.id);
  await cho(150);
  A.caiChan();
  A.datLoi({ folder: "cotTruyen", method: "set", lan: 1 });
  await bamFoot("Lưu");
  await cho(400);
  A.xoaLoi();
  kvNc = (await root.kv.cotTruyen.get("ct_zznc1")).nguoiChoi;
  chk("C12 ghi hỏng ⇒ liên kết trong kv về nguyên trạng", kvNc.ngoaiHinhId === hsA.id, JSON.stringify(kvNc.ngoaiHinhId));
  chk("C13 ghi hỏng ⇒ bảng vẫn mở (không coi như đã lưu)", !!A.modalTren());
  dongHetModal();
  await cho(150);
  // trả liên kết về hsNC cho các phần sau
  const sBack = S.getStory("ct_zznc1");
  sBack.nguoiChoi.ngoaiHinhId = hsNC.id;
  await T.luuTruyen(sBack, "kiểm thử");
  await T.loadStories();

  // =========================================================== D. MÀN TẠO ẢNH
  AI.text = "";
  T.app.storyId = "ct_zznc1"; T.app.convId = "ht_z1"; T.app.screen = "story"; T.render();
  await cho(200);
  await T.openTaoAnh({});
  await cho(900);
  const bdA = A.modalTren();
  const chip = () => (bdA ? bdA.querySelector('[data-nh-chip="' + hsNC.id + '"]') : null);
  // Chỉ phần THÂN khối — tiêu đề khối và dòng nhắc "chưa dịch được" không phải nội dung ghép.
  const khoiText = () => (bdA && bdA.querySelector(".nh-khoi-body") ? bdA.querySelector(".nh-khoi-body").textContent : "");
  chk("D1 chip hồ sơ của NGƯỜI CHƠI có mặt trong màn tạo ảnh", !!chip());
  chk("D2 chip có nhãn “bạn” để phân biệt với nhân vật", !!chip() && !!chip().querySelector(".nh-chip-nguoi"), chip() ? chip().textContent.trim() : "?");
  chk("D3 chip người chơi mặc định ĐƯỢC CHỌN", !!chip() && chip().classList.contains("on") && chip().getAttribute("aria-pressed") === "true");
  const khoi0 = khoiText();
  chk("D4 khối chỉ-đọc có dòng của người chơi, đúng ở CUỐI", khoi0.indexOf("- A (age 24)") >= 0 && khoi0.indexOf("- Minh Quân (age 45)") > khoi0.indexOf("- A (age 24)"), khoi0.slice(0, 180));
  chip().click();
  await cho(350);
  chk("D5 bỏ chip ⇒ khối bỏ dòng người chơi, nhân vật vẫn còn", khoiText().indexOf("Minh Quân") < 0 && khoiText().indexOf("- A (age 24)") >= 0, khoiText().slice(0, 140));
  chip().click();
  await cho(350);
  chk("D6 bật lại ⇒ dòng người chơi trở về, đúng MỘT lần", (khoiText().match(/Minh Quân/g) || []).length === 1 && chip().classList.contains("on"), khoiText().slice(0, 160));

  const ta = bdA.querySelector('[data-f="prompt"]');
  setV(ta, "A dark room at night, two people standing");
  await cho(600);
  VE.calls = 0;
  bdA.querySelector('[data-act2="dung"]').click();
  for (let i = 0; i < 30; i++) { await cho(150); if (VE.calls) break; }
  chk("D7 máy vẽ được gọi đúng 1 lần", VE.calls === 1, VE.calls);
  const promptNhan = (() => { try { return VE.last.evaluateItem; } catch (e) { return ""; } })();
  chk("D8 prompt gửi máy vẽ có ngoại hình CỐ ĐỊNH của người chơi", /Minh Quân \(age 45\)/.test(promptNhan), promptNhan.slice(-170));
  chk("D9 “điều cần tránh” của hồ sơ người chơi vào prompt loại trừ", /không mũ/.test(VE.lastLoaiTru), VE.lastLoaiTru);
  // đưa ảnh vào truyện ⇒ bản ghi nhớ hồ sơ của người chơi
  for (let i = 0; i < 25; i++) {
    await cho(150);
    const b = A.modalTren() ? A.modalTren().querySelector('[data-act2="luu"]') : null;
    if (b && !b.disabled) { b.click(); break; }
  }
  for (let i = 0; i < 30; i++) { await cho(150); if (!A.modalTren()) break; }
  const sA2 = S.getStory("ct_zznc1");
  const anhMoi = (sA2.anh || []).find((a) => (a.hoSoIds || []).indexOf(hsNC.id) >= 0);
  chk("D10 bản ghi ảnh nhớ người chơi là một hồ sơ đã dùng", !!anhMoi, JSON.stringify((sA2.anh || []).map((a) => a.hoSoIds)));
  chk("D11 prompt LƯU trong ảnh có khối ngoại hình của người chơi", !!anhMoi && /Minh Quân \(age 45\)/.test(anhMoi.prompt || ""), (anhMoi && anhMoi.prompt || "").slice(-120));
  chk("D12 xuất riêng truyện kèm cả hồ sơ của người chơi và của ảnh", (() => {
    const ds = T.hoSoCuaTruyen(sA2, T.dsNgoaiHinh()).map((x) => x.id);
    return ds.indexOf(hsNC.id) >= 0 && ds.indexOf(hsA.id) >= 0;
  })());
  dongHetModal();
  await cho(150);

  // =========================================================== E. XOÁ HỒ SƠ
  const hsE = T.chuanHoaHoSo({ id: "nhz_nc_e", tenChinh: "E", tuoi: "30", moTa: "tóc bạc" });
  await T.luuNgoaiHinh(hsE);
  await T.loadNgoaiHinh();
  const sE = S.getStory("ct_zznc1");
  sE.nguoiChoi.ngoaiHinhId = hsE.id;
  await T.luuTruyen(sE, "kiểm thử");
  await T.loadStories();
  T.xoaHoSoNgoaiHinh(hsE.id);
  await cho(400);
  const txtE = A.modalTren() ? A.modalTren().textContent : "";
  chk("E1 xoá hồ sơ NGƯỜI CHƠI đang dùng ⇒ BỊ CHẶN", /Không thể xoá/.test(txtE), txtE.slice(0, 150));
  chk("E2 lời chặn nói rõ là do người chơi", /người chơi/.test(txtE), txtE.slice(0, 260));
  chk("E3 hồ sơ vẫn còn sau khi bị chặn", !!T.getNgoaiHinh(hsE.id));
  dongHetModal();
  await cho(150);
  const sE2 = S.getStory("ct_zznc1");
  sE2.nguoiChoi.ngoaiHinhId = "";
  await T.luuTruyen(sE2, "kiểm thử");
  await T.loadStories();
  T.xoaHoSoNgoaiHinh(hsE.id);
  await cho(400);
  const daXacNhan = await bamFoot("Xoá");
  await cho(400);
  chk("E4 gỡ liên kết ⇒ hiện hộp xác nhận xoá", daXacNhan, A.modalTren() ? A.modalTren().textContent.slice(0, 90) : "(không có modal)");
  chk("E5 đã xoá được hồ sơ", !T.getNgoaiHinh(hsE.id));

  // =========================================================== F. BẢN SAO KHI NHẬP
  const sF = S.getStory("ct_zznc1");
  sF.nguoiChoi.ngoaiHinhId = hsNC.id;
  const hsMap = {}; for (const h of T.dsNgoaiHinh()) hsMap[h.id] = h;
  const copy = T.capIdMoi(sF, {}, {}, hsMap);
  const ncCopy = copy.story.nguoiChoi.ngoaiHinhId;
  chk("F1 bản sao GIỮ liên kết người chơi nhưng dịch sang ID mới", !!ncCopy && ncCopy !== hsNC.id && !!copy.ngoaiHinh[ncCopy], String(ncCopy));
  chk("F2 hồ sơ đi kèm bản sao vẫn nguyên nội dung", !!copy.ngoaiHinh[ncCopy] && copy.ngoaiHinh[ncCopy].tenChinh === "Minh Quân", JSON.stringify(copy.ngoaiHinh[ncCopy] || {}).slice(0, 90));
  const copy2 = T.capIdMoi(sF, {}, {}, {});
  chk("F3 file THIẾU hồ sơ ⇒ bản sao BỎ liên kết của người chơi", copy2.story.nguoiChoi.ngoaiHinhId === "", JSON.stringify(copy2.story.nguoiChoi.ngoaiHinhId));
  chk("F4 bản sao không đụng bản gốc", S.getStory("ct_zznc1").nguoiChoi.ngoaiHinhId === hsNC.id && copy.story.id !== sF.id);
} catch (e) {
  chk("BỘ KHÔNG CHẠY HẾT", false, e && e.stack);
}

// =========================================================== DỌN DẸP
try {
  dongHetModal();
  for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
  await T.loadNgoaiHinh();
  await A.xoaZZ("ct_zznc1").catch(() => {});
  const con = T.thamChieuMo(S.store.stories, T.dsNgoaiHinh());
  ghi("tham chiếu mồ sau khi dọn: " + con.length + (con.length ? " " + JSON.stringify(con) : ""));
  ghi("hồ sơ test còn lại: " + T.dsNgoaiHinh().filter((h) => /^nhz/.test(h.id)).length);
} catch (e) {
  ghi("dọn lỗi: " + (e && e.message));
}

return { ok: kq.every((x) => x.ok), tong: kq.length, hong: kq.filter((x) => !x.ok).length, failures: kq.filter((x) => !x.ok) };
