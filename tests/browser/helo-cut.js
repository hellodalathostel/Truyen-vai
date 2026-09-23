// Hai đường nữa của sổ hé lộ: CẮT lịch sử (catVaLuuLai) và XOÁ HỘI THOẠI (xoaHoiThoai).
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const kq = [];
const ck = (ten, ok, them) => kq.push({ ten, ok: !!ok, them: them === undefined ? "" : (typeof them === "string" ? them : JSON.stringify(them)) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n = 80, ms = 250) => { for (let i = 0; i < (n || 80); i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms || 250); } return null; };
const ID = "ct_zzcut";
const ctSt = () => S.getStory(ID);
const kvSt = () => root.kv.cotTruyen.get(ID);
const ev = () => TG.suKienCua(ctSt()).find((e) => e.id === "vg_x1");
const tn = (c) => S.getMessages(c).map((m) => ({ id: m.id, vai: m.vai, nvId: m.nvId, nd: String(m.noiDung).slice(0, 60) }));
const bam = (sel) => { const x = document.querySelector(sel); if (x) x.click(); return !!x; };
const HELO = "<<HELO: S1>>";

try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_x1"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_x2"); } catch (e) {}

const st0 = S.chuanHoaTruyen({
  id: ID, ten: "ZZ cut", mode: "songSong", boiCanh: "Căn hộ nhỏ.",
  nguoiChoi: { ten: "Bạn", moTa: "" },
  nhanVats: [{ id: "nv_x1", ten: "Aria" }, { id: "nv_x2", ten: "Borin" }],
  hoiThoais: [
    { id: "ht_x1", tieuDe: "Căn hộ", chuongId: null, nhanVatIds: ["nv_x1", "nv_x2"], hienDien: ["nv_x1"], khepGoc: 0 },
    { id: "ht_x2", tieuDe: "Ngoài phố", chuongId: null, nhanVatIds: ["nv_x1"], hienDien: ["nv_x1"], khepGoc: 0 },
  ],
  ngoaiManHinh: [{ id: "vg_x1", luc: Date.now() - 3600000, loai: "ngoaiManHinh", noiDung: "Aria giấu một khoản nợ lớn.", thamGia: ["nv_x1"], biet: ["nv_x1"], muc: "an", htId: "" }],
});
await root.kv.cotTruyen.set(st0.id, st0);
await root.kv.tinNhan.set("ht_x1", [S.makeMessage("nguoi", "Chào em."), S.makeMessage("ai", "Chào anh.", { nvId: "nv_x1", ten: "Aria" })]);
await root.kv.tinNhan.set("ht_x2", [S.makeMessage("nguoi", "Ra ngoài chút nhé.")]);
await S.loadStories();
location.hash = "#ct=" + ID + "&ht=ht_x1";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 60, 300);
await wait(700);

window.__rec = { text: "Aria: Có chuyện này em chưa kể anh. " + HELO, calls: [] };
root.aiTextPlugin = (o) => { window.__rec.calls.push(1); return Promise.resolve({ text: window.__rec.text, stopReason: "stop" }); };
const gui = async (text) => {
  const truoc = S.getMessages("ht_x1").length;
  const ta = document.querySelector("#composerInput");
  ta.value = text; ta.dispatchEvent(new Event("input", { bubbles: true }));
  bam('[data-act="send"]');
  return await cho(() => { const ds = S.getMessages("ht_x1"); return ds.length >= truoc + 2 ? ds : null; }, 60, 250);
};
const cuoiAi = () => tn("ht_x1").filter((m) => m.vai === "ai").slice(-1)[0];

// ---- CẮT LỊCH SỬ
await gui("Em nói đi.");
await wait(600);
const mR = cuoiAi();
ck("1 nguồn hé lộ được ghi (tin nhắn cuối)", !!(mR && (ev().heLo || []).length === 1 && ev().heLo[0].tnId === mR.id && ev().muc === "daLo"), ev() ? { heLo: ev().heLo } : null);
window.__rec.text = "Aria: Không có gì đâu anh.";
await gui("Ừ. Thôi em nghỉ đi.");
await wait(500);
const dsTruoc = tn("ht_x1");
bam('[data-act="regen-msg"][data-mid="' + mR.id + '"]');
const nutCat = await cho(() => [...document.querySelectorAll(".modal-foot button")].find((b) => /Cắt và viết lại/.test(b.textContent)), 40, 200);
if (nutCat) nutCat.click();
await cho(() => !tn("ht_x1").some((m) => m.id === mR.id), 60, 300);
await wait(1200);
const evSauCat = ev();
const kvSauCat = await kvSt();
const kvEvCat = kvSauCat && (kvSauCat.ngoaiManHinh || []).find((e) => e.id === "vg_x1");
ck("2 cắt lịch sử: tin nhắn nguồn bị bỏ", !!(nutCat && !tn("ht_x1").some((m) => m.id === mR.id)), { truoc: dsTruoc.length, sau: tn("ht_x1").length });
ck("3 cắt lịch sử ⇒ sự kiện về mức gốc", !!(evSauCat && evSauCat.muc === "an" && (evSauCat.heLo || []).length === 0 && evSauCat.biet.indexOf("nguoi") < 0), evSauCat ? { muc: evSauCat.muc, heLo: evSauCat.heLo, biet: evSauCat.biet } : null);
ck("4 trạng thái sau khi cắt được lưu xuống kv", !!(kvEvCat && (kvEvCat.heLo || []).length === 0 && kvEvCat.muc === "an"));

// ---- XOÁ HỘI THOẠI
window.__rec.text = "Aria: Em giấu anh chuyện tiền nong. " + HELO;
await gui("Em kể hết đi.");
await wait(700);
const mR2 = cuoiAi();
ck("5 hé lộ lại sau khi cắt (nguồn mới)", !!(mR2 && (ev().heLo || []).length === 1 && ev().heLo[0].tnId === mR2.id && ev().muc === "daLo"), ev() ? { heLo: ev().heLo, mR2: mR2 && mR2.id } : null);
bam('[data-act="delete-conv"]');
const nutXoa = await cho(() => { const b = [...document.querySelectorAll(".modal-foot button")].find((x) => /^(Xoá|Đồng ý|Vô hiệu)/.test(x.textContent.trim())); return b; }, 40, 250);
if (nutXoa) nutXoa.click();
await cho(() => { const s = ctSt(); return s && !s.hoiThoais.some((c) => c.id === "ht_x1"); }, 60, 300);
await wait(900);
const evSauXoa = ev();
const kvSauXoa = await kvSt();
const kvEvXoa = kvSauXoa && (kvSauXoa.ngoaiManHinh || []).find((e) => e.id === "vg_x1");
const tinKv = await root.kv.tinNhan.get("ht_x1");
ck("6 xoá được hội thoại", !!(nutXoa && !ctSt().hoiThoais.some((c) => c.id === "ht_x1")), { convs: ctSt().hoiThoais.map((c) => c.id) });
ck("7 hội thoại khác không bị đụng", ctSt().hoiThoais.some((c) => c.id === "ht_x2"));
ck("8 xoá hội thoại ⇒ sự kiện về mức gốc", !!(evSauXoa && evSauXoa.muc === "an" && (evSauXoa.heLo || []).length === 0), evSauXoa ? { muc: evSauXoa.muc, heLo: evSauXoa.heLo } : null);
ck("9 trạng thái sau khi xoá hội thoại được lưu xuống kv", !!(kvEvXoa && (kvEvXoa.heLo || []).length === 0 && kvEvXoa.muc === "an" && !tinKv));

// ---- dọn dẹp
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_x1"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_x2"); } catch (e) {}
delete S.store.messagesCache["ht_x1"];
delete S.store.messagesCache["ht_x2"];
await S.loadStories();
history.replaceState(null, "", location.pathname);
window.__hlCutKq = kq;
return { kq: kq.map((x) => (x.ok ? "PASS " : "FAIL ") + x.ten + (x.ok ? "" : " :: " + x.them)), fail: kq.filter((x) => !x.ok).length, total: kq.length };
