// CA A (AI THẬT): khoảng vắng mặt NGẮN & yên ắng → kỳ vọng AI trả về KHÔNG có sự kiện.
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n, ms) => { for (let i = 0; i < (n || 80); i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms || 500); } return null; };
const ID = "ct_zzra";
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_ra"); } catch (e) {}

const st = S.chuanHoaTruyen({
  id: ID, ten: "ZZ real A", mode: "songSong",
  boiCanh: "Căn hộ nhỏ ở Đà Nẵng, ba giờ sáng. Khang và Linh sống chung đã hai năm. Đêm nay cả hai đi ngủ sớm, không có việc gì đang chờ, không ai nhắn gì cho ai.",
  nguoiChoi: { ten: "Khang", moTa: "27 tuổi, nhân viên kỹ thuật, sống chung với Linh." },
  thoiGian: { cheDo: "thoiGianThat", nguongPhut: 30, chuDong: true, hoatDongLuc: 0, daXuLyLuc: 0, phien: null },
  nhanVats: [
    { id: "nv_ra", ten: "Linh", moTa: "Bạn gái của Khang, 26 tuổi, làm ở tiệm hoa, ngủ rất say." },
    { id: "nv_rb", ten: "Mai", moTa: "Chị gái của Khang, sống ở Huế, ít khi nhắn tin đêm." },
  ],
  hoiThoais: [{ id: "ht_ra", tieuDe: "Căn hộ", chuongId: null, nhanVatIds: ["nv_ra", "nv_rb"], hienDien: ["nv_ra"], khepGoc: 3 }],
});
await root.kv.cotTruyen.set(st.id, st);
await root.kv.tinNhan.set("ht_ra", [
  S.makeMessage("nguoi", "Mai anh phải đi làm sớm, em ngủ trước nhé."),
  S.makeMessage("ai", "Linh: Vâng, anh ngủ ngon nhé. Em buồn ngủ lắm rồi.", { nvId: "nv_ra", ten: "Linh" }),
  S.makeMessage("ai", "Linh: Em tắt đèn đây. Mai gọi em dậy lúc sáu giờ nhé.", { nvId: "nv_ra", ten: "Linh" }),
]);
await S.loadStories();
location.hash = "#ct=" + ID + "&ht=ht_ra";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 60, 300);
await wait(800);

// ghi lại lời gọi AI THẬT (không thay bằng AI giả)
const real = root.aiTextPlugin;
window.__rgA = [];
const w = (o) => {
  const p = real(o);
  Promise.resolve(p).then((r) => {
    window.__rgA.push({ instr: String((o && o.instruction) || "").slice(0, 400), out: String((r && r.text) || "").slice(0, 900), stop: r && r.stopReason });
  }).catch((e) => window.__rgA.push({ err: String((e && e.message) || e) }));
  return p;
};
for (const k in real) { try { w[k] = real[k]; } catch (e) {} }
root.aiTextPlugin = w;

const story = S.getStory(ID);
const truoc = S.getMessages("ht_ra").length;
window.__tv_vg.gapVangMat(story, 35);
const tg0 = TG.thoiGianOf(story);
const mocTruoc = { hoatDong: tg0.hoatDongLuc, daXuLy: tg0.daXuLyLuc, cheDo: tg0.cheDo, nguong: tg0.nguongPhut, phut: 35 };
await window.__tv_vg.kiemTraVangMat(story);
await cho(() => { const t = TG.thoiGianOf(S.getStory(ID)); return t.phien && t.phien.trangThai !== "dangXuLy"; }, 90, 1000);
await wait(1200);

const t1 = TG.thoiGianOf(S.getStory(ID));
const kvAfter = await root.kv.cotTruyen.get(ID);
const out = {
  moc: mocTruoc,
  phien: t1.phien ? { trangThai: t1.phien.trangThai, phut: t1.phien.phut, soSuKien: t1.phien.soSuKien, loiNhan: t1.phien.loiNhan, cheDo: t1.phien.cheDo } : null,
  daXuLyLuc: t1.daXuLyLuc,
  hoatDongLuc: t1.hoatDongLuc,
  soSuKienTrongTruyen: TG.suKienCua(S.getStory(ID)).length,
  soSuKienTrongKv: (kvAfter.ngoaiManHinh || []).length,
  msgsTruoc: truoc, msgsSau: S.getMessages("ht_ra").length,
  msgsMoi: S.getMessages("ht_ra").slice(truoc).map((m) => ({ vai: m.vai, nvId: m.nvId, vangMat: m.vangMat, nd: String(m.noiDung).slice(0, 200) })),
  divider: document.querySelectorAll(".vg-divider").length,
  status: (document.querySelector(".vg-status") || {}).textContent || "",
  goiAI: window.__rgA.length,
  ai: window.__rgA,
};

// dọn dẹp
root.aiTextPlugin = real;
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_ra"); } catch (e) {}
delete S.store.messagesCache["ht_ra"];
await S.loadStories();
history.replaceState(null, "", location.pathname);
return out;
