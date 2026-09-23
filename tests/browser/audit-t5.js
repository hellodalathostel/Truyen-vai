// T5 — sự kiện toàn truyện chỉ có MỘT bản chuẩn; nhánh không nhân đôi tác động;
//      lớp hé lộ riêng theo nhánh (trước / sau lần hé lộ).
const A = window.__A, T = A.T, S = A.S, TS = A.TG, TT = A.TT;
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}

const ids = await A.taoZZ();
const t0 = Date.now() - 3600000;
const K = TT.khoaQuanHe("nv_z1", "nv_z2");
let st = S.getStory(ids.story);
st.ngoaiManHinh = [{
  id: "vg_b1", luc: t0 + 500, loai: "ngoaiManHinh",
  noiDung: "Hai người họ cãi nhau sau lưng người chơi.",
  thamGia: ["nv_z1", "nv_z2"], biet: ["nv_z1", "nv_z2"], muc: "an", htId: "",
  anhHuong: { quanHe: [{ tu: "nv_z1", den: "nv_z2", chieu: "tinTuong", buoc: 2, huong: 1 }], noiTam: [] },
}];
await T.luuTruyen(st);
await T.loadStories();
st = S.getStory(ids.story);
const c1 = st.hoiThoais[0];
const EV = "vg_b1";
const tin = (story, conv) => {
  const tt = TT.tinhTrangThai(story, conv);
  const q = tt.quanHe[K];
  return q ? q.tinTuong : null;
};
const evCua = (story) => TS.suKienCua(story).find((e) => e.id === EV);
const soEvToan = (story) => TS.suKienCua(story).filter((e) => !e.htId).length;

const tinGoc1 = tin(st, c1);
ghi("dựng xong: sự kiện toàn truyện cộng +2 (tin tưởng 5 → 7)", tinGoc1 === 7, { tinGoc1 });
ghi("mã ngắn của sự kiện là S1", TS.maNgan(st, EV) === "S1", { ma: TS.maNgan(st, EV) });
ghi("ban đầu sự kiện đang ẩn", TS.mucTrong(st, c1, evCua(st)) === "an", { muc: TS.mucTrong(st, c1, evCua(st)) });

// ---------- tạo nhánh TỪ TRƯỚC lần hé lộ
T.app.storyId = ids.story; T.app.convId = c1.id; T.app.screen = "story";
await T.loadMessages(c1.id);
const that = root.aiTextPlugin;
root.aiTextPlugin = () => Promise.resolve({ text: "Nhánh mới đây.", stopReason: "stop" });
await T.taoNhanhVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 2, [S.getStory(ids.story).nhanVats[0]]);
let s2 = S.getStory(ids.story);
const nhanh1 = s2.hoiThoais.filter((c) => TS.laNhanh(c))[0];
ghi("tạo được nhánh", !!nhanh1, { tds: s2.hoiThoais.map((c) => c.tieuDe) });
ghi("sổ truyện vẫn chỉ MỘT sự kiện toàn truyện", soEvToan(s2) === 1, { toan: soEvToan(s2), tong: TS.suKienCua(s2).length });
ghi("nhánh KHÔNG nhân đôi tác động (vẫn 7, không phải 9)", !!nhanh1 && tin(s2, nhanh1) === 7, { nhanh: !!nhanh1 && tin(s2, nhanh1) });
ghi("bản gốc vẫn 7 sau khi tách nhánh", tin(s2, s2.hoiThoais[0]) === 7, { goc: tin(s2, s2.hoiThoais[0]) });
ghi("nhánh tạo TRƯỚC lần hé lộ: sự kiện vẫn ẩn trong nhánh", !!nhanh1 && TS.mucTrong(s2, nhanh1, evCua(s2)) === "an", { muc: !!nhanh1 && TS.mucTrong(s2, nhanh1, evCua(s2)) });

// ---------- hé lộ trong mạch chính
await T.loadMessages(c1.id);
await T.apDungHeLo(S.getStory(ids.story), "<<HELO: S1>>", { htId: c1.id, tnId: "tn_z2", nvId: "nv_z1", luc: t0 + 1200 });
let s3 = S.getStory(ids.story);
const c1b = s3.hoiThoais[0];
ghi("hé lộ ở mạch chính: sự kiện đã lộ", TS.mucTrong(s3, c1b, evCua(s3)) === "daLo", { muc: TS.mucTrong(s3, c1b, evCua(s3)) });
ghi("hé lộ xong vẫn chỉ MỘT sự kiện toàn truyện", soEvToan(s3) === 1, { toan: soEvToan(s3) });
ghi("nhánh tạo TRƯỚC vẫn không thừa hưởng hé lộ", !!nhanh1 && TS.mucTrong(s3, s3.hoiThoais.find((c) => c.id === nhanh1.id), evCua(s3)) === "an", { muc: !!nhanh1 && TS.mucTrong(s3, s3.hoiThoais.find((c) => c.id === nhanh1.id), evCua(s3)) });
ghi("hé lộ KHÔNG cộng thêm tác động quan hệ (vẫn 7)", tin(s3, c1b) === 7, { tin: tin(s3, c1b) });

// ---------- tạo nhánh TỪ SAU lần hé lộ (tin nhắn nguồn tn_z2 nằm trong đoạn mang sang)
await T.loadMessages(c1.id);
T.app.convId = c1.id;
await T.taoNhanhVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 4, [S.getStory(ids.story).nhanVats[0]]);
root.aiTextPlugin = that;
let s4 = S.getStory(ids.story);
const nhanh2 = s4.hoiThoais.filter((c) => TS.laNhanh(c)).find((c) => !nhanh1 || c.id !== nhanh1.id);
ghi("tạo được nhánh thứ hai", !!nhanh2, { tds: s4.hoiThoais.map((c) => c.tieuDe) });
ghi("nhánh tạo SAU lần hé lộ: thừa hưởng hé lộ", !!nhanh2 && TS.mucTrong(s4, nhanh2, evCua(s4)) === "daLo", { muc: !!nhanh2 && TS.mucTrong(s4, nhanh2, evCua(s4)) });
ghi("nhánh thứ hai cũng không nhân đôi tác động (7)", !!nhanh2 && tin(s4, nhanh2) === 7, { tin: !!nhanh2 && tin(s4, nhanh2) });
ghi("sau hai nhánh: vẫn đúng MỘT sự kiện toàn truyện", soEvToan(s4) === 1 && TS.suKienCua(s4).length === 1, { toan: soEvToan(s4), tong: TS.suKienCua(s4).length });
ghi("lớp hé lộ riêng nằm trên nhánh thứ hai", !!nhanh2 && (nhanh2.vgHeLo || []).length === 1, { vg: nhanh2 && nhanh2.vgHeLo });

// ---------- soát hai truyện THẬT
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));

// ---------- dọn
root.aiTextPlugin = that;
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };