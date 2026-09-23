// Base cho các ca kiểm thử đợt "audit phát hành".
// Cung cấp: __A (điểm neo), __A.taoZZ (dựng truyện test sạch), __A.chan/__A.datLoi
// (chặn lỗi ghi theo từng folder/phương thức/lần gọi), __A.chotThat/__A.soatThat.
const T = window.__tv_test;
if (!T) throw new Error("Thiếu __tv_test — tải lại trang");
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const TT = await import("/src/trangThai.js");
window.__A = Object.assign(window.__A || {}, { T, S, TG, TT });

// Truyện THẬT đang có trong origin này — DÒ RA LÚC CHẠY, trong bộ nhớ.
// LUẬT: id/tên/dữ liệu truyện thật không bao giờ được ghi thành file đóng gói/upload.
window.__A.thatIds = [];
window.__A.doThat = async () => {
  const ds = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  window.__A.thatIds = ds
    .filter((s) => s && s.id && !/^ct_zz/.test(s.id) && !/^ZZ/.test(s.ten || ""))
    .map((s) => s.id)
    .sort();
  return window.__A.thatIds;
};

window.__A.chotThat = async () => {
  if (!window.__A.thatIds.length) await window.__A.doThat();
  const out = {};
  for (const id of window.__A.thatIds) {
    const s = await root.kv.cotTruyen.get(id);
    if (!s) { out[id] = null; continue; }
    const tn = {};
    for (const c of s.hoiThoais || []) tn[c.id] = ((await root.kv.tinNhan.get(c.id)) || []).length;
    out[id] = { hts: (s.hoiThoais || []).length, tn };
  }
  return out;
};

window.__A.soatThat = (truoc, sau) => {
  const bo = [];
  for (const id of window.__A.thatIds) {
    const a = JSON.stringify(truoc[id]);
    const b = JSON.stringify(sau[id]);
    if (a !== b) bo.push(id + ": " + a + " -> " + b);
  }
  return bo;
};

// ---- CHẶN LỖI GHI: vá TẠI CHỖ các phương thức của từng folder kv.
// (Gán `root.kv = Proxy` KHÔNG được: root là proxy của perchance và sẽ ném
// "executeChain is not a function". Vá thẳng thuộc tính thì chạy tốt.)
// `__A.fault` được đọc LIVE nên đặt/bỏ lỗi rất rẻ.
// ---- CHẶN LỖI GHI: vá IDBObjectStore.prototype.put/delete.
// (Gán `root.kv = Proxy` KHÔNG được: root là proxy perchance, ném
// "executeChain is not a function". Vá thuộc tính của `root.kv.<folder>` cũng KHÔNG được:
// mỗi lần đọc `root.kv.<folder>` là một wrapper MỚI nên bản vá không dính.)
// Mọi ghi/xoá của kv-plugin đều đi qua IDBObjectStore nên đây là điểm chặn đúng.
window.__A.caiChan = () => {
  if (window.__A.__daCai) return "đã cài trước đó";
  const P = IDBObjectStore.prototype;
  const gocPut = P.put;
  const gocDel = P.delete;
  window.__A.gocIDB = { gocPut, gocDel };
  const dem = {};
  const ten = (name) => String(name || "").replace("-store-kv-plugin", "").replace("-db-kv-plugin", "");
  const chan = (k) => {
    dem[k] = (dem[k] || 0) + 1;
    const c = window.__A.fault;
    if (c && k === c.folder + "." + c.method && dem[k] === (c.lan || 1)) {
      const e = new Error(c.loi || "lỗi giả lập");
      e.giaLap = true;
      throw e;
    }
  };
  P.put = function (...a) { chan(ten(this.name) + ".set"); return gocPut.apply(this, a); };
  P.delete = function (...a) { chan(ten(this.name) + ".delete"); return gocDel.apply(this, a); };
  window.__A.dem = dem;
  window.__A.__daCai = true;
  return "đã vá IDBObjectStore";
};
window.__A.datLoi = (c) => {
  window.__A.fault = c;
  const d = window.__A.dem || {};
  for (const k in d) delete d[k]; // xoá TẠI CHỖ: hàm đã vá giữ tham chiếu tới object này
  return c;
};

// Dọn khoá mồ côi (tin nhắn / ảnh không truyện nào trỏ tới) — chỉ dùng cho dữ liệu test.
window.__A.donRac = async () => {
  const dung = { tn: new Set(), anh: new Set() };
  for (const s of S.store.stories) {
    for (const c of s.hoiThoais || []) dung.tn.add(c.id);
    for (const a of s.anh || []) dung.anh.add(a.id);
  }
  let tn = 0, anh = 0;
  for (const [k] of await root.kv.tinNhan.entries()) if (!dung.tn.has(k)) { await root.kv.tinNhan.delete(k); tn++; }
  for (const [k] of await root.kv.thuVienAnh.entries()) if (!dung.anh.has(k)) { await root.kv.thuVienAnh.delete(k); anh++; }
  await T.loadStories();
  return { tn, anh };
};
window.__A.xoaLoi = () => { window.__A.fault = null; return "đã bỏ lỗi"; };
window.__A.demGoi = () => window.__A.dem;

// ---- dựng một truyện test sạch, có 2 hội thoại + 1 ảnh
const ANH_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

window.__A.taoZZ = async (opts) => {
  const o = opts || {};
  const id = o.id || "ct_zz1";
  const t0 = Date.now() - 3600000;
  const st = {
    id,
    ten: o.ten || "ZZ test",
    moTa: "",
    theLoaiId: "",
    theLoaiTen: "",
    emoji: "✦",
    boiCanh: "Thế giới hiện đại.",
    luatTheGioi: "",
    mode: "songSong",
    giaoKeo: S.giaoKeoMacDinh(),
    nguoiChoi: { ten: "Người chơi", moTa: "" },
    nhanVats: [
      S.newCharacter({ id: "nv_z1", ten: "Zara", vaiTro: "bạn", tuoi: "24", nguoiLon: true }),
      S.newCharacter({ id: "nv_z2", ten: "Zeno", vaiTro: "đồng nghiệp", tuoi: "31", nguoiLon: true }),
    ],
    chuongs: [],
    hoiThoais: [],
    bienNienSu: [],
    anh: [],
    nhip: "cham",
    canhDaKhep: [],
    daoDien: S.daoDienMacDinh(),
    thoiGian: TG.thoiGianMacDinh(),
    ngoaiManHinh: [],
    taoLuc: t0,
    suaLuc: Date.now(),
    phienBan: S.PHIEN_BAN_TRUYEN,
  };
  const c1 = S.newConversation({ id: "ht_z1", tieuDe: "Zara", nhanVatIds: ["nv_z1"], hienDien: ["nv_z1"] });
  const c2 = S.newConversation({ id: "ht_z2", tieuDe: "Zeno", nhanVatIds: ["nv_z2"], hienDien: ["nv_z2"] });
  st.hoiThoais = [c1, c2];
  const m1 = S.makeMessage("nguoi", "Chào cậu.", { id: "tn_z1", luc: t0 });
  const m2 = S.makeMessage("ai", "Chào, tớ đang ở quán.", { id: "tn_z2", nvId: "nv_z1", ten: "Zara", luc: t0 + 1000 });
  const m3 = S.makeMessage("anh", "🖼️ Ảnh cảnh", { id: "tn_z3", nvId: "nv_z1", ten: "Zara", anhId: "anh_z1", luc: t0 + 2000 });
  const m4 = S.makeMessage("nguoi", "Cậu khoẻ không?", { id: "tn_z4", luc: t0 + 3000 });
  const m5 = S.makeMessage("ai", "Tớ vẫn khoẻ, cảm ơn cậu đã hỏi.", { id: "tn_z5", nvId: "nv_z2", ten: "Zeno", luc: t0 + 4000 });
  const anh = S.newAnh({ id: "anh_z1", dataUrl: o.anhUrl || ANH_1PX, chuThich: "Ảnh test", convId: c1.id, luc: t0 + 2000 });
  st.anh = [{ id: anh.id, chuThich: anh.chuThich, convId: anh.convId, luc: anh.luc, prompt: "", loaiTru: "", phongCach: "", kichThuoc: "" }];
  try { await S.deleteStory(id); } catch (e) {}
  for (const k of [c1.id, c2.id]) delete S.store.messagesCache[k];
  delete S.store.anhCache["anh_z1"];
  await root.kv.cotTruyen.set(id, st);
  await root.kv.tinNhan.set(c1.id, [m1, m2, m3]);
  await root.kv.tinNhan.set(c2.id, [m4, m5]);
  await root.kv.thuVienAnh.set("anh_z1", anh);
  await T.loadStories();
  T.app.storyId = id;
  T.app.convId = c1.id;
  T.app.screen = "story";
  await T.loadMessages(c1.id);
  await T.loadMessages(c2.id);
  T.render();
  return { story: id, c1: c1.id, c2: c2.id, anh: "anh_z1" };
};

window.__A.doc = async (storyId, c1, c2) => {
  const st = await root.kv.cotTruyen.get(storyId);
  const kv = {};
  for (const [k, folder] of [["tn1", root.kv.tinNhan], ["tn2", root.kv.tinNhan], ["anh", root.kv.thuVienAnh]]) void folder;
  kv.tn1 = ((await root.kv.tinNhan.get(c1)) || []).length;
  kv.tn2 = ((await root.kv.tinNhan.get(c2)) || []).length;
  kv.anh = !!(await root.kv.thuVienAnh.get("anh_z1"));
  kv.co = !!st;
  kv.hts = st ? (st.hoiThoais || []).length : 0;
  kv.cacheTn1 = (S.store.messagesCache[c1] || []).length;
  kv.cacheAnh = !!S.store.anhCache["anh_z1"];
  kv.ramHts = (S.getStory(storyId) ? S.getStory(storyId).hoiThoais.length : -1);
  return kv;
};

window.__A.xoaZZ = async (id) => {
  const st = await root.kv.cotTruyen.get(id || "ct_zz1");
  if (st) {
    for (const c of st.hoiThoais || []) { await root.kv.tinNhan.delete(c.id); delete S.store.messagesCache[c.id]; }
    for (const a of st.anh || []) { await root.kv.thuVienAnh.delete(a.id); delete S.store.anhCache[a.id]; }
    await root.kv.cotTruyen.delete(st.id);
  }
  S.store.stories = S.store.stories.filter((s) => s.id !== (id || "ct_zz1"));
  await T.loadStories();
  return "đã dọn";
};

// Modal trên cùng (modal sau chồng lên modal trước) — nút phải tìm trong ĐÚNG modal đó.
window.__A.modalTren = () => {
  const ds = document.querySelectorAll("#modalRoot .modal-backdrop");
  return ds.length ? ds[ds.length - 1] : null;
};
window.__A.bam = async (nhan) => {
  const m = window.__A.modalTren();
  const ds = m ? Array.from(m.querySelectorAll(".modal-foot .btn")) : [];
  const b = ds.find((x) => new RegExp(nhan, "i").test(x.textContent || ""));
  if (!b) return "không thấy nút " + nhan;
  b.click();
  await new Promise((r) => setTimeout(r, 350));
  return "đã bấm " + nhan;
};

window.__A.cho = async (ms) => { await new Promise((r) => setTimeout(r, ms || 120)); };

window.__A.auditBaseReady = true;
