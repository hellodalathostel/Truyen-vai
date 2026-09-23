// T8 — đợt rà soát cuối: (A) ảnh cũ nằm sẵn trong IndexedDB, (B) giao dịch sửa/xoá tin nhắn,
//      (C) mốc kết thúc phiên vắng mặt khi lần ghi cuối hỏng.
const A = window.__A, T = A.T, S = A.S, TS = A.TG, TT = A.TT;
const NLC = String.fromCharCode(10);
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();
let hoanPut = null;
let hoanAI = null;
A.caiChan();
A.xoaLoi();
const DOC = 'x" onerror="window.__x=1';
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const K = TT.khoaQuanHe("nv_z1", "nv_z2");
const tinTuong = (st, conv) => { const tt = TT.tinhTrangThai(st, conv); const q = tt.quanHe[K]; return q ? q.tinTuong : null; };
const demSk = (root2) => [...(root2 || document).querySelectorAll("*")].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name))).length;
const demImgXau = () => document.querySelectorAll("img[onerror], img[onload]").length;
const xoaToast = () => { const r = document.querySelector("#toastRoot"); if (r) r.innerHTML = ""; };
const toastSau = () => [...document.querySelectorAll("#toastRoot .toast")].map((t) => t.textContent).join(" | ");
const dongHet = async () => { for (let i = 0; i < 8; i++) { const m = A.modalTren(); if (!m) return; const c = m.querySelector(".icon-btn"); if (!c) return; c.click(); await A.cho(90); } };
const donZZ = async () => {
  for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
  try { await A.xoaZZ(); } catch (e) {}
  try { await A.donRac(); } catch (e) {}
};

// Truyện test: hội thoại ht_z1 có tn_z1/tn_z2/tn_z3(ảnh) + MỘT cảnh đã khép bao tn_z1..tn_z3
// (kèm delta quan hệ) để mọi thao tác sửa/xoá đều đụng cả cảnh đã khép.
async function dung() {
  await donZZ();
  const ids = await A.taoZZ();
  const st = S.getStory(ids.story);
  const c1 = st.hoiThoais[0];
  const canh = TT.taoCanh(st, c1, {
    tuMsgId: "tn_z1", denMsgId: "tn_z3", tomTat: "Hai người nói chuyện ở quán.",
    quanHe: [{ tu: "nv_z1", den: "nv_z2", chieu: "tinTuong", buoc: 2, huong: 1 }],
  });
  st.canhDaKhep = [canh];
  await T.luuTruyen(st);
  await T.loadStories();
  T.app.storyId = ids.story; T.app.convId = ids.c1; T.app.screen = "story";
  await T.loadMessages(ids.c1);
  T.render();
  await A.cho(150);
  return { ids, canh: canh.id, st: S.getStory(ids.story), c1: S.getStory(ids.story).hoiThoais[0] };
}

// ===================================================================== A
try {
  delete window.__x;
  const d = await dung();
  ghi("A0 đối chứng: cảnh đã khép cộng +2 (tin tưởng 7)", tinTuong(S.getStory(d.ids.story), S.getStory(d.ids.story).hoiThoais[0]) === 7, { t: tinTuong(S.getStory(d.ids.story), S.getStory(d.ids.story).hoiThoais[0]) });
  // Bản ghi ảnh ĐÃ NẰM SẴN trong IndexedDB với payload độc hại (mô phỏng bản lưu cũ).
  await root.kv.thuVienAnh.set("anh_z1", S.newAnh({ id: "anh_z1", chuThich: "Ảnh cảnh", convId: d.ids.c1, dataUrl: DOC }));
  delete S.store.anhCache["anh_z1"];
  T.render();
  await A.cho(400);
  ghi("A1 ảnh cũ: thẻ ảnh trong hội thoại KHÔNG dựng <img>", document.querySelectorAll(".anh-holder img").length === 0, { n: document.querySelectorAll(".anh-holder img").length });
  ghi("A2 ảnh cũ: không có <img> mang thuộc tính sự kiện", demImgXau() === 0, { n: demImgXau() });
  ghi("A3 ảnh cũ: không phần tử nào có thuộc tính sự kiện", demSk() === 0, { n: demSk() });
  ghi("A4 ảnh cũ: payload chưa chạy", window.__x === undefined, { x: window.__x });
  const nx = document.querySelector('[data-act="anh-xem"][data-mid="tn_z3"]');
  if (nx) nx.click();
  await A.cho(500);
  const mv = A.modalTren();
  ghi("A5 khung XEM LỚN mở được", !!mv && !!(mv.querySelector("[data-anh-view-img]")));
  ghi("A6 khung XEM LỚN không dựng <img> từ payload", mv ? mv.querySelectorAll("img").length === 0 : false, { n: mv ? mv.querySelectorAll("img").length : -1 });
  ghi("A7 khung XEM LỚN: payload chưa chạy", window.__x === undefined);
  await dongHet();
  const thatAI = root.aiTextPlugin;
  hoanAI = thatAI;
  root.aiTextPlugin = () => Promise.resolve({ text: "A quiet cafe at dusk.", stopReason: "stop" });
  const nl = document.querySelector('[data-act="anh-lai"][data-mid="tn_z3"]');
  if (nl) nl.click();
  await A.cho(600);
  const mod = A.modalTren();
  const pv = mod && mod.querySelector("[data-preview]");
  ghi("A8 bảng Dựng lại khung hình mở được", !!pv);
  ghi("A9 bảng Dựng lại: KHÔNG dựng <img> từ payload (chỗ vừa vá)", pv ? pv.querySelectorAll("img").length === 0 : false, { n: pv ? pv.querySelectorAll("img").length : -1, html: pv ? pv.innerHTML.slice(0, 140) : null });
  ghi("A10 bảng Dựng lại: hiện khung trống", !!(pv && pv.querySelector(".anh-empty")));
  ghi("A11 bảng Dựng lại: modal không có thuộc tính sự kiện", mod ? demSk(mod) === 0 : false, { n: mod ? demSk(mod) : -1 });
  ghi("A12 bảng Dựng lại: payload chưa chạy", window.__x === undefined);
  await dongHet();
  // Đối chứng: ảnh HỢP LỆ vẫn phải hiện trong bảng Dựng lại (bản vá không làm mất ảnh).
  await root.kv.thuVienAnh.set("anh_z1", S.newAnh({ id: "anh_z1", chuThich: "Ảnh cảnh", convId: d.ids.c1, dataUrl: PNG }));
  delete S.store.anhCache["anh_z1"];
  T.render();
  await A.cho(300);
  ghi("A13 đối chứng: thẻ ảnh hiện <img> với dataUrl hợp lệ", document.querySelectorAll(".anh-holder img").length === 1, { n: document.querySelectorAll(".anh-holder img").length });
  const nl2 = document.querySelector('[data-act="anh-lai"][data-mid="tn_z3"]');
  if (nl2) nl2.click();
  await A.cho(600);
  const pv2 = A.modalTren() && A.modalTren().querySelector("[data-preview]");
  const img2 = pv2 && pv2.querySelector("img");
  ghi("A14 đối chứng: bảng Dựng lại dựng ảnh cũ hợp lệ vào khung xem trước", !!img2, { n: pv2 ? pv2.querySelectorAll("img").length : -1 });
  ghi("A15 đối chứng: <img> dựng bằng DOM + gán .src", !!(img2 && /^data:image\/png/.test(img2.getAttribute("src") || "")), { src: img2 ? String(img2.getAttribute("src")).slice(0, 30) : null });
  root.aiTextPlugin = thatAI;
  await dongHet();
} catch (e) { ghi("NGOẠI LỆ (A): " + ((e && e.message) || e), false); }

// ===================================================================== B1 del-msg
async function thuDel(nhan, fault) {
  const d = await dung();
  xoaToast();
  const tnTruoc = ((await root.kv.tinNhan.get(d.ids.c1)) || []).length;
  const stateTruoc = tinTuong(S.getStory(d.ids.story), S.getStory(d.ids.story).hoiThoais[0]);
  if (fault) A.datLoi(fault);
  const b = document.querySelector('[data-act="del-msg"][data-mid="tn_z3"]');
  if (b) b.click();
  await A.cho(300);
  await A.bam("Vô hiệu");
  await A.cho(800);
  A.xoaLoi();
  const s = S.getStory(d.ids.story);
  const kv = await root.kv.cotTruyen.get(d.ids.story);
  const tn = (await root.kv.tinNhan.get(d.ids.c1)) || [];
  const canh = (kv.canhDaKhep || []).find((c) => c.id === d.canh);
  return {
    nhan, d, tnTruoc, stateTruoc, s, kv, tn, canh,
    coTin: tn.some((m) => m.id === "tn_z3"),
    coAnh: !!(await root.kv.thuVienAnh.get("anh_z1")),
    huy: !!(canh && canh.huy),
    state: tinTuong(s, s.hoiThoais[0]),
    cache: T.getMessages(d.ids.c1).length,
    toast: toastSau(),
  };
}
try {
  const r = await thuDel("B1", { folder: "tinNhan", method: "set", lan: 1, loi: "lỗi giả lập ghi tin nhắn" });
  ghi("B1 lỗi ghi TIN NHẮN: tin nhắn còn nguyên trong kv", r.tn.length === r.tnTruoc && r.coTin, { n: r.tn.length, truoc: r.tnTruoc });
  ghi("B1 lỗi ghi tin nhắn: ẢNH còn trong thư viện", r.coAnh);
  ghi("B1 lỗi ghi tin nhắn: cảnh đã khép CHƯA bị vô hiệu", r.huy === false);
  ghi("B1 lỗi ghi tin nhắn: trạng thái quan hệ không đổi (7)", r.state === r.stateTruoc && r.state === 7, { truoc: r.stateTruoc, sau: r.state });
  ghi("B1 lỗi ghi tin nhắn: bộ đệm RAM khớp kv", r.cache === r.tn.length, { cache: r.cache, kv: r.tn.length });
  ghi("B1 lỗi ghi tin nhắn: KHÔNG báo thành công", !/Đã vô hiệu/.test(r.toast), { t: r.toast });
} catch (e) { ghi("NGOẠI LỆ (B1): " + ((e && e.message) || e), false); }
try {
  const r = await thuDel("B2", { folder: "thuVienAnh", method: "delete", lan: 1, loi: "lỗi giả lập xoá ảnh" });
  ghi("B2 lỗi XOÁ ẢNH: tin nhắn còn nguyên", r.tn.length === r.tnTruoc && r.coTin, { n: r.tn.length });
  ghi("B2 lỗi xoá ảnh: ẢNH còn trong thư viện", r.coAnh);
  ghi("B2 lỗi xoá ảnh: cảnh đã khép CHƯA bị vô hiệu", r.huy === false);
  ghi("B2 lỗi xoá ảnh: trạng thái quan hệ không đổi (7)", r.state === 7, { sau: r.state });
  ghi("B2 lỗi xoá ảnh: KHÔNG báo thành công", !/Đã vô hiệu/.test(r.toast), { t: r.toast });
} catch (e) { ghi("NGOẠI LỆ (B2): " + ((e && e.message) || e), false); }
try {
  const r = await thuDel("B3", { folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập ghi cốt truyện" });
  ghi("B3 lỗi GHI CỐT TRUYỆN (bước cuối): tin nhắn được trả lại", r.tn.length === r.tnTruoc && r.coTin, { n: r.tn.length, truoc: r.tnTruoc });
  ghi("B3 lỗi ghi cốt truyện: ẢNH được trả lại", r.coAnh);
  ghi("B3 lỗi ghi cốt truyện: cảnh đã khép chưa bị vô hiệu", r.huy === false);
  ghi("B3 lỗi ghi cốt truyện: trạng thái quan hệ không đổi (7)", r.state === 7, { sau: r.state });
  ghi("B3 lỗi ghi cốt truyện: bộ đệm RAM khớp kv", r.cache === r.tn.length, { cache: r.cache, kv: r.tn.length });
  ghi("B3 lỗi ghi cốt truyện: KHÔNG báo thành công", !/Đã vô hiệu/.test(r.toast), { t: r.toast });
} catch (e) { ghi("NGOẠI LỆ (B3): " + ((e && e.message) || e), false); }
try {
  const r = await thuDel("B4", null);
  ghi("B4 đối chứng: xoá thật ⇒ tin nhắn biến mất", !r.coTin && r.tn.length === r.tnTruoc - 1, { n: r.tn.length, truoc: r.tnTruoc });
  ghi("B4 đối chứng: ảnh bị xoá khỏi thư viện", r.coAnh === false);
  ghi("B4 đối chứng: cảnh đã khép bị vô hiệu", r.huy === true);
  ghi("B4 đối chứng: hoàn tác quan hệ (mục về mặc định 5)", r.state === 5 || r.state === null, { sau: r.state });
  ghi("B4 đối chứng: có báo đã vô hiệu cảnh", /Đã vô hiệu/.test(r.toast), { t: r.toast });
  ghi("B4 đối chứng: bộ đệm RAM khớp kv", r.cache === r.tn.length);
} catch (e) { ghi("NGOẠI LỆ (B4): " + ((e && e.message) || e), false); }

// ===================================================================== B2 save-edit
async function thuSua(nhan, fault) {
  const d = await dung();
  xoaToast();
  const st0 = S.getStory(d.ids.story);
  const textCu = (T.getMessages(d.ids.c1).find((m) => m.id === "tn_z2") || {}).noiDung;
  const stateTruoc = tinTuong(st0, st0.hoiThoais[0]);
  const eb = document.querySelector('[data-act="edit-msg"][data-mid="tn_z2"]');
  if (eb) eb.click();
  await A.cho(250);
  const ta = document.querySelector("[data-edit-input]");
  const coTa = !!ta;
  if (ta) ta.value = "Chào, tớ vừa tới quán (đã sửa).";
  if (fault) A.datLoi(fault);
  const sb = document.querySelector('[data-act="save-edit"][data-mid="tn_z2"]');
  if (sb) sb.click();
  await A.cho(300);
  await A.bam("Vô hiệu");
  await A.cho(800);
  A.xoaLoi();
  const s = S.getStory(d.ids.story);
  const kv = await root.kv.cotTruyen.get(d.ids.story);
  const tn = (await root.kv.tinNhan.get(d.ids.c1)) || [];
  const m = tn.find((x) => x.id === "tn_z2") || {};
  const canh = (kv.canhDaKhep || []).find((c) => c.id === d.canh);
  return {
    nhan, d, coTa, textCu, stateTruoc, s, kv, tn, canh,
    text: m.noiDung,
    sua: !!m.sua,
    cacheText: (T.getMessages(d.ids.c1).find((x) => x.id === "tn_z2") || {}).noiDung,
    huy: !!(canh && canh.huy),
    state: tinTuong(s, s.hoiThoais[0]),
    conHopSua: !!document.querySelector("[data-edit-input]"),
    chuTrongHop: (document.querySelector("[data-edit-input]") || {}).value || "",
    toast: toastSau(),
  };
}
try {
  const r = await thuSua("C1", { folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập ghi cốt truyện" });
  ghi("C1 sửa tin / lỗi GHI CỐT TRUYỆN (bước cuối): chữ trong kv KHÔNG đổi", r.coTa && r.text === r.textCu, { truoc: r.textCu, sau: r.text });
  ghi("C1 lỗi ghi cốt truyện: bộ đệm RAM cũng không đổi", r.cacheText === r.textCu, { cache: r.cacheText });
  ghi("C1 lỗi ghi cốt truyện: cảnh đã khép chưa bị vô hiệu", r.huy === false);
  ghi("C1 lỗi ghi cốt truyện: trạng thái quan hệ không đổi (7)", r.state === 7, { sau: r.state });
  ghi("C1 lỗi ghi cốt truyện: KHÔNG báo thành công", !/Đã vô hiệu|bản tóm tắt/.test(r.toast), { t: r.toast });
  ghi("C1 lỗi ghi cốt truyện: hộp sửa vẫn MỞ (không đóng khi hỏng)", r.conHopSua === true);
  ghi("C1 lỗi ghi cốt truyện: chữ vừa gõ còn nguyên trong hộp", r.chuTrongHop === "Chào, tớ vừa tới quán (đã sửa).", { v: r.chuTrongHop });
} catch (e) { ghi("NGOẠI LỆ (C1): " + ((e && e.message) || e), false); }
try {
  const r = await thuSua("C2", { folder: "tinNhan", method: "set", lan: 1, loi: "lỗi giả lập ghi tin nhắn" });
  ghi("C2 sửa tin / lỗi GHI TIN NHẮN: chữ trong kv KHÔNG đổi", r.text === r.textCu, { sau: r.text });
  ghi("C2 lỗi ghi tin nhắn: bộ đệm RAM không đổi", r.cacheText === r.textCu);
  ghi("C2 lỗi ghi tin nhắn: cảnh đã khép chưa bị vô hiệu", r.huy === false);
  ghi("C2 lỗi ghi tin nhắn: trạng thái quan hệ không đổi (7)", r.state === 7, { sau: r.state });
  ghi("C2 lỗi ghi tin nhắn: KHÔNG báo thành công", !/Đã vô hiệu|bản tóm tắt/.test(r.toast), { t: r.toast });
  ghi("C2 lỗi ghi tin nhắn: hộp sửa vẫn MỞ", r.conHopSua === true);
  ghi("C2 lỗi ghi tin nhắn: chữ vừa gõ còn nguyên", r.chuTrongHop === "Chào, tớ vừa tới quán (đã sửa).", { v: r.chuTrongHop });
} catch (e) { ghi("NGOẠI LỆ (C2): " + ((e && e.message) || e), false); }
try {
  const r = await thuSua("C3", null);
  ghi("C3 đối chứng: sửa được chữ trong kv", r.text === "Chào, tớ vừa tới quán (đã sửa)." && r.sua === true, { sau: r.text });
  ghi("C3 đối chứng: bộ đệm RAM khớp kv", r.cacheText === r.text);
  ghi("C3 đối chứng: cảnh đã khép bị vô hiệu", r.huy === true);
  ghi("C3 đối chứng: hoàn tác quan hệ (mục về mặc định 5)", r.state === 5 || r.state === null, { sau: r.state });
  ghi("C3 đối chứng: có báo đã vô hiệu cảnh", /Đã vô hiệu/.test(r.toast), { t: r.toast });
  ghi("C3 đối chứng: lưu xong thì hộp sửa ĐÓNG", r.conHopSua === false);
} catch (e) { ghi("NGOẠI LỆ (C3): " + ((e && e.message) || e), false); }

// ===================================================================== D ketThucPhien
try {
  await donZZ();
  xoaToast();
  const ID = "ct_zz8";
  const st0 = S.chuanHoaTruyen({
    id: ID, ten: "ZZ vang mat 8", mode: "songSong", boiCanh: "Một căn hộ nhỏ ở Hà Nội.",
    nguoiChoi: { ten: "Bạn", moTa: "" },
    thoiGian: { cheDo: "thoiGianThat", nguongPhut: 30, chuDong: true, hoatDongLuc: 0, daXuLyLuc: 0, phien: null },
    nhanVats: [ S.newCharacter({ id: "nv_8a", ten: "Aria", moTa: "Bạn cùng nhà." }), S.newCharacter({ id: "nv_8b", ten: "Borin", moTa: "Bạn cùng nhà." }) ],
    // khepGoc = số tin ⇒ cảnh đang KHÉP (điều kiện để mô phỏng vắng mặt được chạy).
    hoiThoais: [ S.newConversation({ id: "ht_8", tieuDe: "Căn hộ", nhanVatIds: ["nv_8a", "nv_8b"], hienDien: ["nv_8a"], khepGoc: 2 }) ],
  });
  await root.kv.cotTruyen.set(ID, st0);
  await root.kv.tinNhan.set("ht_8", [
    S.makeMessage("nguoi", "Anh về muộn thế?"),
    S.makeMessage("ai", "Aria: Ừ, anh mệt rồi.", { nvId: "nv_8a", ten: "Aria" }),
  ]);
  await S.loadStories();
  T.app.storyId = ID; T.app.convId = "ht_8"; T.app.screen = "story";
  await T.loadMessages("ht_8");
  T.render();
  await A.cho(200);
  const V = window.__tv_vg;
  const thatAI = root.aiTextPlugin;
  hoanAI = thatAI;
  root.aiTextPlugin = () => Promise.resolve({
    text: ["SỰ KIỆN 1:", "LOẠI: ngoài màn hình", "NHÂN VẬT: Aria", "NỘI DUNG: Aria ngồi một mình ở ban công và nghĩ về người chơi.", "AI BIẾT: Aria", "MỨC HIỂN THỊ: ẩn"].join(NLC),
    stopReason: "stop",
  });
  // Chặn ĐÚNG lần ghi cuối: bản ghi cốt truyện có `phien.trangThai === "xong"`.
  const P = IDBObjectStore.prototype;
  const gocPut = P.put;
  hoanPut = gocPut;
  let chanXong = true;
  P.put = function (v, k) {
    const ten = String(this.name || "").replace("-store-kv-plugin", "").replace("-db-kv-plugin", "");
    if (chanXong && ten === "cotTruyen" && v && v.thoiGian && v.thoiGian.phien && v.thoiGian.phien.trangThai === "xong") {
      const e = new Error("lỗi giả lập: ghi mốc kết thúc phiên");
      e.giaLap = true;
      throw e;
    }
    return gocPut.apply(this, arguments);
  };
  const st = S.getStory(ID);
  V.gapVangMat(st, 120);
  await V.kiemTraVangMat(S.getStory(ID));
  await A.cho(1500);
  const s1 = S.getStory(ID);
  const tg1 = TS.thoiGianOf(s1);
  const kv1 = await root.kv.cotTruyen.get(ID);
  ghi("D1 phiên KHÔNG bị coi là xong (RAM)", !!(tg1.phien && tg1.phien.trangThai === "thuLai"), { trangThai: tg1.phien && tg1.phien.trangThai });
  ghi("D2 kv: mốc phiên KHÔNG phải \"xong\" (giữ \"đang xử lý\")", !!(kv1.thoiGian && kv1.thoiGian.phien && kv1.thoiGian.phien.trangThai !== "xong"), { trangThai: kv1.thoiGian && kv1.thoiGian.phien && kv1.thoiGian.phien.trangThai });
  ghi("D3 có thông báo lỗi + nút thử lại hiện trên giao diện", !!T.app.loiVangMat && /Không ghi được mốc kết thúc phiên/.test((T.app.loiVangMat || {}).thongDiep || ""), { loi: T.app.loiVangMat });
  ghi("D4 giao diện KHÔNG còn ở trạng thái 'đang xử lý'", T.app.trangThaiVangMat === "" && T.app.vangMatDangXet === false, { tt: T.app.trangThaiVangMat, dang: T.app.vangMatDangXet });
  ghi("D5 mốc trong RAM khớp với kv (đã trả lại)", Number(tg1.daXuLyLuc) === Number(kv1.thoiGian.daXuLyLuc) && Number(tg1.hoatDongLuc) === Number(kv1.thoiGian.hoatDongLuc), { ram: [tg1.daXuLyLuc, tg1.hoatDongLuc], kv: [kv1.thoiGian.daXuLyLuc, kv1.thoiGian.hoatDongLuc] });
  ghi("D6 sự kiện vắng mặt vẫn nằm trong sổ (không mất dữ liệu)", TS.suKienCua(s1).length >= 1 && (kv1.ngoaiManHinh || []).length >= 1, { ram: TS.suKienCua(s1).length, kv: (kv1.ngoaiManHinh || []).length });
  ghi("D7 KHÔNG báo thành công giả ('có N diễn biến mới')", !/diễn biến mới/.test(toastSau()), { t: toastSau() });
  ghi("D8 giao diện có dòng báo lỗi vắng mặt", /Không xem được diễn biến/.test((document.querySelector(".vg-status") || {}).textContent || ""), { s: (document.querySelector(".vg-status") || {}).textContent || "" });
  // ---- mở lại đường: bỏ chặn rồi THỬ LẠI, phải kết thúc được
  chanXong = false;
  P.put = gocPut;
  xoaToast();
  await V.thuLaiVangMat(S.getStory(ID));
  await A.cho(1500);
  const s2 = S.getStory(ID);
  const tg2 = TS.thoiGianOf(s2);
  const kv2 = await root.kv.cotTruyen.get(ID);
  ghi("D9 thử lại: phiên kết thúc được (RAM)", !!(tg2.phien && tg2.phien.trangThai === "xong"), { trangThai: tg2.phien && tg2.phien.trangThai });
  ghi("D10 thử lại: kv cũng ghi 'xong'", !!(kv2.thoiGian && kv2.thoiGian.phien && kv2.thoiGian.phien.trangThai === "xong"), { trangThai: kv2.thoiGian && kv2.thoiGian.phien && kv2.thoiGian.phien.trangThai });
  ghi("D11 thử lại: không còn trạng thái lỗi", T.app.loiVangMat === null && T.app.vangMatDangXet === false, { loi: T.app.loiVangMat });
  ghi("D12 thử lại: sự kiện không bị nhân đôi", TS.suKienCua(s2).length === TS.suKienCua(s1).length, { truoc: TS.suKienCua(s1).length, sau: TS.suKienCua(s2).length });
  root.aiTextPlugin = thatAI;
  try { await S.deleteStory(ID); } catch (e) {}
  try { await root.kv.tinNhan.delete("ht_8"); } catch (e) {}
  delete S.store.messagesCache["ht_8"];
  await S.loadStories();
} catch (e) { ghi("NGOẠI LỆ (D): " + ((e && e.message) || e), false); }
// trả lại nguyên trạng ngay cả khi ca D ném lỗi giữa chừng
if (hoanPut) IDBObjectStore.prototype.put = hoanPut;
if (hoanAI) root.aiTextPlugin = hoanAI;

// ---------- soát hai truyện THẬT + dọn
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));
A.xoaLoi();
await dongHet();
delete window.__x;
await donZZ();
try { T.loadStories(); } catch (e) {}
try { T.render(); } catch (e) {}
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };
