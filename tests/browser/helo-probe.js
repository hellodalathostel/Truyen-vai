// Probe: gửi hai lượt, kiểm tra vì sao lượt thứ hai không ghi nguồn hé lộ.
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const AI = await import("/src/ai.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n = 60, ms = 250) => { for (let i = 0; i < n; i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms); } return null; };
const ds = () => S.getMessages("ht_za").map((m) => ({ id: m.id, vai: m.vai, nd: m.noiDung.slice(0, 40) }));

try { await S.deleteStory("ct_zzprobe"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_za"); } catch (e) {}
const st = S.chuanHoaTruyen({
  id: "ct_zzprobe", ten: "ZZ probe", mode: "songSong", boiCanh: "Căn hộ nhỏ.",
  nhanVats: [{ id: "nv_za", ten: "Aria" }],
  hoiThoais: [{ id: "ht_za", tieuDe: "Căn hộ", nhanVatIds: ["nv_za"], hienDien: ["nv_za"], khepGoc: 0 }],
  ngoaiManHinh: [{ id: "vg_p1", luc: Date.now() - 3600000, loai: "ngoaiManHinh", noiDung: "Aria biết Borin đang giấu nợ.", thamGia: ["nv_za"], biet: ["nv_za"], muc: "an", htId: "" }],
});
await root.kv.cotTruyen.set(st.id, st);
await root.kv.tinNhan.set("ht_za", [S.makeMessage("nguoi", "Chào em."), S.makeMessage("ai", "Chào anh.", { nvId: "nv_za", ten: "Aria" })]);
await S.loadStories();
location.hash = "#ct=ct_zzprobe&ht=ht_za";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 40, 250);
await wait(600);

const ra = { map: TG.suKienTheoMaNgan(S.getStory("ct_zzprobe")), docHeLo: AI.docHeLo("abc <<HELO: S1>> xyz") };
window.__rec = { calls: [] };
root.aiTextPlugin = (o) => { window.__rec.calls.push({ instr: String((o && o.instruction) || "").slice(0, 200), sys: String((o && o.systemPrompt) || "").slice(0, 60) }); return Promise.resolve({ text: "Aria: Em đã đọc trộm sổ của anh. <<HELO: S1>>", stopReason: "stop" }); };

const gui = async () => {
  const ta = document.querySelector("#composerInput");
  ta.value = "Em kể anh nghe đi.";
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  const b = document.querySelector('[data-act="send"]');
  b.click();
  await wait(2500);
};
await gui();
ra.sauLan1 = { msgs: ds(), heLo: (TG.suKienCua(S.getStory("ct_zzprobe")).find((e) => e.id === "vg_p1") || {}).heLo, calls: window.__rec.calls.length, coHeloTrongPrompt: window.__rec.calls.filter((c) => /HELO/.test(c.instr)).length };
await gui();
ra.sauLan2 = { msgs: ds(), heLo: (TG.suKienCua(S.getStory("ct_zzprobe")).find((e) => e.id === "vg_p1") || {}).heLo, calls: window.__rec.calls.length };

// dọn dẹp
try { await S.deleteStory("ct_zzprobe"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_za"); } catch (e) {}
delete S.store.messagesCache["ht_za"];
await S.loadStories();
return ra;
