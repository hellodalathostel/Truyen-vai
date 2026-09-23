// CA C (AI THẬT): một sự kiện ẩn được kể ra trong lượt thường → phải HÉ LỘ ĐÚNG MỘT LẦN.
// Lượt sau (đã lộ) không được ghi thêm nguồn nào, và sự kiện không còn bị coi là đang ẩn.
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n, ms) => { for (let i = 0; i < (n || 80); i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms || 500); } return null; };
const ID = "ct_zzrc";
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_rc"); } catch (e) {}

const st = S.chuanHoaTruyen({
  id: ID, ten: "ZZ real C", mode: "songSong",
  boiCanh: "Căn hộ nhỏ ở Đà Nẵng. Khang và Linh sống chung. Chiếc xe máy của Khang đã biến mất khỏi bãi gửi xe ba ngày nay, Khang chưa biết vì sao.",
  nguoiChoi: { ten: "Khang", moTa: "27 tuổi, nhân viên kỹ thuật, đang rất bực vì mất xe." },
  thoiGian: { cheDo: "tamDung", nguongPhut: 30, chuDong: true, hoatDongLuc: 0, daXuLyLuc: 0, phien: null },
  nhanVats: [
    { id: "nv_rc1", ten: "Linh", moTa: "Bạn gái của Khang, 26 tuổi. Cô đang giấu một chuyện rất nặng: ba ngày trước cô lén bán chiếc xe máy của Khang để trả nợ cho bạn thân, và định sẽ nói ra khi có tiền chuộc lại. Cô sợ Khang biết." },
    { id: "nv_rc2", ten: "Hùng", moTa: "Bạn thân của Khang, không biết gì về chuyện chiếc xe." },
  ],
  hoiThoais: [{ id: "ht_rc", tieuDe: "Căn hộ", chuongId: null, nhanVatIds: ["nv_rc1", "nv_rc2"], hienDien: ["nv_rc1"], khepGoc: 0 }],
  ngoaiManHinh: [{
    id: "vg_rc1", luc: Date.now() - 3 * 86400000, loai: "ngoaiManHinh", hinhThuc: "giấu diếm",
    noiDung: "Ba ngày trước, Linh lén bán chiếc xe máy của Khang cho một tiệm cầm đồ để trả nợ cho bạn thân, và định chuộc lại trước khi Khang phát hiện.",
    thamGia: ["nv_rc1"], biet: ["nv_rc1"], muc: "an", htId: "",
  }],
});
await root.kv.cotTruyen.set(st.id, st);
await root.kv.tinNhan.set("ht_rc", [
  S.makeMessage("nguoi", "Xe của anh biến mất khỏi bãi ba hôm nay rồi. Em có thấy gì không?"),
  S.makeMessage("ai", "Linh: Em... em không để ý. Chắc bảo vệ dời đi đâu đó thôi anh.", { nvId: "nv_rc1", ten: "Linh" }),
]);
await S.loadStories();
location.hash = "#ct=" + ID + "&ht=ht_rc";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 60, 300);
await wait(800);

const real = root.aiTextPlugin;
window.__rgC = [];
const w = (o) => {
  const p = real(o);
  Promise.resolve(p).then((r) => { window.__rgC.push({ len: String((o && o.instruction) || "").length, coHelo: /HELO/.test(String((o && o.instruction) || "")), coNgoai: /NGOÀI MÀN HÌNH/.test(String((o && o.instruction) || "")), out: String((r && r.text) || "").slice(0, 900) }); }).catch((e) => window.__rgC.push({ err: String((e && e.message) || e) }));
  return p;
};
for (const k in real) { try { w[k] = real[k]; } catch (e) {} }
root.aiTextPlugin = w;

const gui = async (text) => {
  const truoc = S.getMessages("ht_rc").length;
  const ta = document.querySelector("#composerInput");
  ta.value = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector('[data-act="send"]').click();
  return await cho(() => { const ds = S.getMessages("ht_rc"); return ds.length >= truoc + 2 ? ds : null; }, 150, 1000);
};
const evC = () => TG.suKienCua(S.getStory(ID)).find((e) => e.id === "vg_rc1");
const dsC = () => S.getMessages("ht_rc").map((m) => ({ id: m.id, vai: m.vai, nvId: m.nvId, nd: String(m.noiDung).slice(0, 220) }));

const lines = ["Có phải em đã bán xe của anh không?", "Em đừng giấu anh nữa. Anh hỏi thật: chuyện cái xe là thế nào?"];
const thu = [];
for (let i = 0; i < lines.length; i++) {
  await gui(lines[i]);
  await wait(800);
  const e = evC();
  thu.push({ lan: i + 1, muc: e.muc, heLo: e.heLo, soTin: S.getMessages("ht_rc").length, goiAI: window.__rgC.length });
  if ((e.heLo || []).length) break;
}
const sauLo = evC();
const dsSauLo = dsC();
const kvLo = await root.kv.cotTruyen.get(ID);
const kvEvLo = kvLo && (kvLo.ngoaiManHinh || []).find((e) => e.id === "vg_rc1");
const mCuoi = dsSauLo.filter((m) => m.vai === "ai").slice(-1)[0];

// lượt thứ hai SAU khi đã lộ: model có lặp dấu hiệu đi nữa cũng không được ghi thêm
const soGoiTruoc = window.__rgC.length;
await gui("Anh vẫn muốn nghe em nói hết. Còn gì giấu anh nữa không?");
await wait(800);
const sauLan2 = evC();
const out = {
  thu: thu,
  mucSauKhiLo: sauLo.muc,
  mucGoc: sauLo.mucGoc,
  biet: sauLo.biet,
  heLo: sauLo.heLo,
  heLoTrongKv: kvEvLo && kvEvLo.heLo,
  mucTrongKv: kvEvLo && kvEvLo.muc,
  mucGocTrongKv: kvEvLo && kvEvLo.mucGoc,
  tinNhanNguon: mCuoi && { id: mCuoi.id, nvId: mCuoi.nvId, nd: mCuoi.nd, coHelo: /HELO/i.test(mCuoi.nd) },
  soTinNhan: dsSauLo.length,
  ds: dsSauLo.map((m) => m.vai + ":" + m.nd.slice(0, 60)),
  lan2: { soGoiAIThem: window.__rgC.length - soGoiTruoc, heLo: sauLan2.heLo, muc: sauLan2.muc, soLanLo: (sauLan2.heLo || []).length },
  ai: window.__rgC,
};

root.aiTextPlugin = real;
try { await S.deleteStory(ID); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_rc"); } catch (e) {}
delete S.store.messagesCache["ht_rc"];
await S.loadStories();
history.replaceState(null, "", location.pathname);
return out;
