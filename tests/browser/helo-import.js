// Kiểm thử NHẬP TRUYỆN: sổ hé lộ phải được dịch ID sang bản sao, và những lần hé lộ
// mất tin nhắn nguồn (không có trong file) phải bị bỏ → sự kiện về mức gốc.
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const kq = [];
const ck = (ten, ok, them) => kq.push({ ten, ok: !!ok, them: them === undefined ? "" : (typeof them === "string" ? them : JSON.stringify(them)) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n = 80, ms = 250) => { for (let i = 0; i < n; i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms); } return null; };

// ---- dọn dẹp
for (const s of S.store.stories.slice()) if (/^ZZ imp/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }

// ---- file sao lưu: 2 sự kiện, 1 nguồn có tin nhắn trong file, 1 nguồn trỏ tin nhắn không có
const backup = {
  type: "truyen-vai",
  version: 6,
  story: {
    id: "ct_zzimp",
    ten: "ZZ imp",
    mode: "songSong",
    boiCanh: "Một tiệm sách nhỏ.",
    nguoiChoi: { ten: "Bạn", moTa: "" },
    nhanVats: [{ id: "nv_ia", ten: "Kim" }, { id: "nv_ib", ten: "Tú" }],
    chuongs: [],
    hoiThoais: [{ id: "ht_ia", tieuDe: "Tiệm sách", chuongId: null, nhanVatIds: ["nv_ia", "nv_ib"], hienDien: ["nv_ia"], khepGoc: 0 }],
    ngoaiManHinh: [
      { id: "vg_i1", luc: 1000, loai: "ngoaiManHinh", noiDung: "Kim giấu số tiền lãi tháng này.", thamGia: ["nv_ia"], biet: ["nv_ia", "nguoi"], muc: "daLo", htId: "", heLo: [{ htId: "ht_ia", tnId: "tn_i1", nvId: "nv_ia", luc: 2000 }], mucGoc: "an" },
      { id: "vg_i2", luc: 1500, loai: "ngoaiManHinh", noiDung: "Tú đã nói với chủ nợ về tiệm sách.", thamGia: ["nv_ib"], biet: ["nv_ib", "nguoi"], muc: "daLo", htId: "", heLo: [{ htId: "ht_ia", tnId: "tn_khong_co", nvId: "nv_ib", luc: 2500 }], mucGoc: "an" },
    ],
  },
  messages: {
    ht_ia: [
      { id: "tn_i0", vai: "nguoi", noiDung: "Tiệm hôm nay đông không em?", luc: 500 },
      { id: "tn_i1", vai: "ai", noiDung: "Kim: Em có chuyện muốn kể.", nvId: "nv_ia", ten: "Kim", luc: 900 },
    ],
  },
  anh: {},
};
window.__fileTxt = JSON.stringify(backup);

// ---- mở một truyện tạm để vào được menu truyện
const stTmp = S.chuanHoaTruyen({ id: "ct_zzimp0", ten: "ZZ imp0", mode: "songSong", boiCanh: "x", nhanVats: [{ id: "nv_ia", ten: "Kim" }], hoiThoais: [{ id: "ht_i0", tieuDe: "A", nhanVatIds: ["nv_ia"], hienDien: ["nv_ia"] }] });
await root.kv.cotTruyen.set(stTmp.id, stTmp);
await root.kv.tinNhan.set("ht_i0", [S.makeMessage("nguoi", "Chào.")]);
await S.loadStories();
location.hash = "#ct=ct_zzimp0&ht=ht_i0";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector('[data-act="story-menu"]'), 60, 250);
await wait(500);

// ---- bắt input file rồi chạy luồng nhập (chế độ bản sao)
window.__fileInp = null;
const origCreate = document.createElement.bind(document);
document.createElement = function (tag, ...rest) {
  const el = origCreate(tag, ...rest);
  if (String(tag).toLowerCase() === "input") {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "type");
    Object.defineProperty(el, "type", {
      set(v) { d.set.call(el, v); if (el.type === "file") window.__fileInp = el; },
      get() { return d.get.call(el); }, configurable: true,
    });
  }
  return el;
};
document.querySelector('[data-act="story-menu"]').click();
await wait(400);
[...document.querySelectorAll('[data-act="import-story"]')].pop().click();
await wait(300);
document.createElement = origCreate;
const inp = window.__fileInp;
ck("1 bắt được ô chọn file của luồng nhập", !!inp);
if (inp) {
  const dt = new DataTransfer();
  dt.items.add(new File([window.__fileTxt], "nhap-helo.json", { type: "application/json" }));
  inp.files = dt.files;
  inp.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(900);
  const nut = await cho(() => [...document.querySelectorAll(".modal-foot button")].find((b) => b.textContent.trim() === "Nhập"), 30, 250);
  ck("2 mở được hộp thoại nhập và có nút Nhập", !!nut);
  if (nut) nut.click();
  await wait(2500);
}
[...document.querySelectorAll(".modal-backdrop")].forEach((b) => { const x = [...b.querySelectorAll(".modal-foot button")].find((y) => /^(Đóng|Huỷ)$/.test(y.textContent.trim())); if (x) x.click(); });
await wait(400);
await S.loadStories();

const nhap = S.store.stories.find((s) => /^ZZ imp/.test(s.ten || "") && s.id !== "ct_zzimp0");
ck("3 nhập được bản sao", !!nhap, { ids: S.store.stories.map((s) => s.id + ":" + (s.ten || "").slice(0, 12)) });
if (nhap) {
  const ev = TG.suKienCua(nhap);
  const e1 = ev.find((e) => /tiền lãi/.test(e.noiDung || ""));
  const e2 = ev.find((e) => /chủ nợ/.test(e.noiDung || ""));
  const msgs = S.getMessages(nhap.hoiThoais[0].id);
  ck("4 ID sự kiện được cấp mới", !!(e1 && e2 && e1.id !== "vg_i1" && e2.id !== "vg_i2"), { e1: e1 && e1.id, e2: e2 && e2.id });
  ck("5 nguồn hé lộ sống sót được dịch sang ID mới của bản sao", !!(e1 && e1.heLo.length === 1 && e1.heLo[0].htId === nhap.hoiThoais[0].id && e1.heLo[0].tnId === (msgs[1] || {}).id && e1.heLo[0].nvId === (nhap.nhanVats[0] || {}).id && e1.muc === "daLo" && e1.mucGoc === "an"), e1 ? { heLo: e1.heLo, muc: e1.muc, mucGoc: e1.mucGoc, ht: nhap.hoiThoais[0].id, tn: msgs[1] && msgs[1].id } : null);
  ck("6 nguồn mất tin nhắn (không có trong file) bị bỏ → về mức gốc", !!(e2 && (e2.heLo || []).length === 0 && e2.muc === "an" && e2.mucGoc === "an" && e2.biet.indexOf("nguoi") < 0), e2 ? { heLo: e2.heLo, muc: e2.muc, mucGoc: e2.mucGoc, biet: e2.biet } : null);
}

// ---- dọn dẹp
for (const s of S.store.stories.slice()) if (/^ZZ imp/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await root.kv.tinNhan.delete("ht_i0"); } catch (e) {}
delete S.store.messagesCache["ht_i0"];
await S.loadStories();
history.replaceState(null, "", location.pathname);
window.__hlImpKq = kq;
return { kq: kq.map((x) => (x.ok ? "PASS " : "FAIL ") + x.ten + (x.ok ? "" : " :: " + x.them)), fail: kq.filter((x) => !x.ok).length, total: kq.length };
