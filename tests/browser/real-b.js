// CA B (AI THẬT): vắng mặt 5 tiếng trong bối cảnh có lý do để LIÊN LẠC → kỳ vọng có
// ít nhất một sự kiện "liên lạc nhìn thấy" và một tin nhắn kèm dải phân cách thời gian.
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n, ms) => { for (let i = 0; i < (n || 80); i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms || 500); } return null; };
const ID = "ct_zzrb";
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_rb"); } catch (e) {}

const st = S.chuanHoaTruyen({
  id: ID, ten: "ZZ real B", mode: "songSong",
  boiCanh: "Đà Nẵng, tám giờ sáng một ngày thường. Khang đi làm ở công ty, Linh ở nhà nghỉ ốm. Buổi sáng hôm nay họ chỉ nhắn nhau vài câu ngắn trước khi Khang lên xe buýt.",
  nguoiChoi: { ten: "Khang", moTa: "27 tuổi, nhân viên kỹ thuật, đi làm 8h-13h, điện thoại để trong túi." },
  thoiGian: { cheDo: "thoiGianThat", nguongPhut: 30, chuDong: true, hoatDongLuc: 0, daXuLyLuc: 0, phien: null },
  nhanVats: [
    { id: "nv_rb1", ten: "Linh", moTa: "Bạn gái của Khang, đang sốt nhẹ ở nhà, hay nhắn tin cho anh." },
    { id: "nv_rb2", ten: "Trung", moTa: "Đồng nghiệp cùng phòng của Khang ở công ty." },
  ],
  hoiThoais: [{ id: "ht_rb", tieuDe: "Buổi sáng", chuongId: null, nhanVatIds: ["nv_rb1", "nv_rb2"], hienDien: ["nv_rb1"], khepGoc: 2 }],
});
await root.kv.cotTruyen.set(st.id, st);
await root.kv.tinNhan.set("ht_rb", [
  S.makeMessage("nguoi", "Anh lên xe buýt đây, em nhớ ăn cháo nhé."),
  S.makeMessage("ai", "Linh: Vâng, anh đi làm đi. Em chỉ hơi mệt thôi.", { nvId: "nv_rb1", ten: "Linh" }),
]);
await S.loadStories();
location.hash = "#ct=" + ID + "&ht=ht_rb";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 60, 300);
await wait(800);

const real = root.aiTextPlugin;
window.__rgB = [];
const w = (o) => {
  const p = real(o);
  Promise.resolve(p).then((r) => { window.__rgB.push({ instr: String((o && o.instruction) || "").slice(0, 400), out: String((r && r.text) || "").slice(0, 900), stop: r && r.stopReason }); }).catch((e) => window.__rgB.push({ err: String((e && e.message) || e) }));
  return p;
};
for (const k in real) { try { w[k] = real[k]; } catch (e) {} }
root.aiTextPlugin = w;

const story = S.getStory(ID);
const truoc = S.getMessages("ht_rb").length;
window.__tv_vg.gapVangMat(story, 300); // 5 tiếng
await window.__tv_vg.kiemTraVangMat(story);
await cho(() => { const t = TG.thoiGianOf(S.getStory(ID)); return t.phien && t.phien.trangThai !== "dangXuLy"; }, 150, 1000);
await wait(1500);

const s2 = S.getStory(ID);
const t1 = TG.thoiGianOf(s2);
const kvAfter = await root.kv.cotTruyen.get(ID);
const ev = TG.suKienCua(s2);
const out = {
  phien: t1.phien ? { trangThai: t1.phien.trangThai, phut: t1.phien.phut, soSuKien: t1.phien.soSuKien, loiNhan: t1.phien.loiNhan } : null,
  soSuKienTrongTruyen: ev.length,
  soSuKienTrongKv: (kvAfter.ngoaiManHinh || []).length,
  suKien: ev.map((e) => ({ id: e.id, loai: e.loai, hinhThuc: e.hinhThuc, muc: e.muc, htId: e.htId, tnIds: e.tnIds, phutVangMat: e.phutVangMat, phienId: e.phienId, thamGia: e.thamGia, biet: e.biet, nd: String(e.noiDung).slice(0, 300), lucTruoc: (Number(e.luc) || 0) > 0 && (Number(e.luc) || 0) <= Date.now() })),
  msgsTruoc: truoc, msgsSau: S.getMessages("ht_rb").length,
  msgsMoi: S.getMessages("ht_rb").slice(truoc).map((m) => ({ vai: m.vai, nvId: m.nvId, vangMat: m.vangMat, vangMatPhien: m.vangMatPhien, nd: String(m.noiDung).slice(0, 400) })),
  divider: document.querySelectorAll(".vg-divider").length,
  dividerText: (document.querySelector(".vg-divider-txt") || {}).textContent || "",
  status: (document.querySelector(".vg-status") || {}).textContent || "",
  goiAI: window.__rgB.length,
  ai: window.__rgB,
};

root.aiTextPlugin = real;
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_rb"); } catch (e) {}
delete S.store.messagesCache["ht_rb"];
await S.loadStories();
history.replaceState(null, "", location.pathname);
return out;
