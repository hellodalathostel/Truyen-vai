// T7 — xuất bản sao lưu phải DỪNG khi có ảnh không đọc được / thiếu dữ liệu.
const A = window.__A, T = A.T, S = A.S;
const NLC = String.fromCharCode(10);
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}

// ---- vá tạm IDBObjectStore.get để cưỡng bức LỖI ĐỌC (datLoi chỉ vá put/delete)
const IDBP = IDBObjectStore.prototype;
const gocGet = IDBP.get;
const demDoc = {};
let docLoi = null;
const tenKho = (name) => String(name || "").replace("-store-kv-plugin", "").replace("-db-kv-plugin", "");
const caiDocLoi = (c) => {
  for (const k in demDoc) delete demDoc[k];
  docLoi = c;
  IDBP.get = function (...a) {
    const t = tenKho(this.name);
    demDoc[t] = (demDoc[t] || 0) + 1;
    if (docLoi && t === docLoi.folder && demDoc[t] === (docLoi.lan || 1)) {
      const e = new Error(docLoi.loi || "lỗi đọc giả lập");
      e.giaLap = true;
      throw e;
    }
    return gocGet.apply(this, a);
  };
};
const boDocLoi = () => { IDBP.get = gocGet; docLoi = null; };

const gocURL = URL.createObjectURL;
const gocClick = HTMLAnchorElement.prototype.click;
let dem = 0;
const caiDem = () => { dem = 0; URL.createObjectURL = function (...a) { dem++; return gocURL.apply(URL, a); }; HTMLAnchorElement.prototype.click = function () {}; };
const boDem = () => { URL.createObjectURL = gocURL; HTMLAnchorElement.prototype.click = gocClick; };
const toasts = () => Array.from(document.querySelectorAll("#toastRoot .toast")).map((t) => t.textContent);
const toastCuoi = () => { const ds = toasts(); return ds.length ? ds[ds.length - 1] : ""; };
const tieu = () => { const m = A.modalTren(); const t = m && m.querySelector(".modal-title"); return t ? t.textContent : ""; };

const ids = await A.taoZZ();
T.app.storyId = ids.story; T.app.convId = ids.c1; T.app.screen = "story";
await T.loadMessages(ids.c1);
await T.loadMessages(ids.c2);

// ---------- 1. đối chứng: xuất bình thường phải tải file
delete S.store.anhCache["anh_z1"];
caiDem();
await T.xuatTruyen(S.getStory(ids.story));
boDem();
ghi("đối chứng: xuất bình thường TẢI file", dem === 1, { dem });
ghi("đối chứng: báo thành công", /Đã xuất file truyện/.test(toastCuoi()), { t: toastCuoi() });

// ---------- 2. ảnh đọc LỖI → phải DỪNG, không tải file
delete S.store.anhCache["anh_z1"];
caiDocLoi({ folder: "thuVienAnh", lan: 1, loi: "lỗi giả lập đọc ảnh" });
caiDem();
await T.xuatTruyen(S.getStory(ids.story));
boDem();
boDocLoi();
ghi("ảnh đọc lỗi: đã chặn được lượt đọc ảnh", (demDoc.thuVienAnh || 0) >= 1, { demDoc });
ghi("ảnh đọc lỗi: KHÔNG tải file", dem === 0, { dem });
ghi("ảnh đọc lỗi: cảnh báo rõ là DỪNG", /DỪNG/.test(toastCuoi()), { t: toastCuoi() });
ghi("ảnh đọc lỗi: KHÔNG báo 'Đã xuất file truyện.'", !/Đã xuất file truyện/.test(toasts().join(" | ")), { ds: toasts() });

// ---------- 3. ảnh THIẾU dữ liệu → cảnh báo + hỏi trước khi tải
await root.kv.thuVienAnh.set("anh_z1", S.newAnh({ id: "anh_z1", chuThich: "Ảnh test", convId: ids.c1, dataUrl: "" }));
delete S.store.anhCache["anh_z1"];
caiDem();
const pXuat3 = T.xuatTruyen(S.getStory(ids.story));
for (let i = 0; i < 40 && !/Bản sao lưu thiếu/.test(tieu()); i++) await A.cho(100);
ghi("ảnh thiếu dữ liệu: hỏi trước khi xuất", /Bản sao lưu thiếu/.test(tieu()), { t: tieu() });
ghi("ảnh thiếu dữ liệu: chưa tải file khi đang hỏi", dem === 0, { dem });
await A.bam("Huỷ");
await A.cho(300);
await pXuat3;
boDem();
ghi("ảnh thiếu dữ liệu: huỷ ⇒ KHÔNG tải file", dem === 0, { dem });

// ---------- 4. ảnh thiếu dữ liệu + đồng ý → tải file kèm cảnh báo thiếu ảnh
await root.kv.thuVienAnh.set("anh_z1", S.newAnh({ id: "anh_z1", chuThich: "Ảnh test", convId: ids.c1, dataUrl: "" }));
delete S.store.anhCache["anh_z1"];
caiDem();
const pXuat4 = T.xuatTruyen(S.getStory(ids.story));
for (let i = 0; i < 40 && !/Bản sao lưu thiếu/.test(tieu()); i++) await A.cho(100);
await A.bam("Vẫn xuất");
await A.cho(300);
await pXuat4;
boDem();
ghi("thiếu ảnh + đồng ý: có tải file", dem === 1, { dem });
ghi("thiếu ảnh + đồng ý: báo rõ THIẾU bao nhiêu ảnh", /THIẾU 1 ảnh/.test(toastCuoi()), { t: toastCuoi() });

ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));

// ---------- dọn
boDem();
boDocLoi();
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };