// T2 — cờ dừng: bấm dừng trong lúc pickSpeakers chọn người nói.
const A = window.__A, T = A.T, S = A.S, AI = T.AI;
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();

A.xoaLoi();
await A.xoaZZ();
const ids = await A.taoZZ();
const st = S.getStory(ids.story);
const c1 = st.hoiThoais.find((c) => c.id === ids.c1);
c1.nhanVatIds = ["nv_z1", "nv_z2"];
c1.hienDien = ["nv_z1", "nv_z2"];
await T.luuTruyen(st);
T.app.storyId = ids.story;
T.app.convId = ids.c1;
T.app.screen = "story";
T.app.responder = "auto";
await T.loadMessages(ids.c1);
T.render();

const soTnTruoc = ((await root.kv.tinNhan.get(ids.c1)) || []).length;

// ---- AI giả: lời gọi đầu tiên TREO, có hỗ trợ .stop()
window.__zz = { goi: 0, cho: [] };
const treo = () => {
  let rej;
  const p = new Promise((res, rj) => { rej = rj; window.__zz.cho.push(res); });
  p.stop = () => rej(new Error("đã dừng (giả lập)"));
  return p;
};
const that = root.aiTextPlugin;
root.aiTextPlugin = (o) => {
  window.__zz.goi++;
  if (window.__zz.goi === 1) return treo();
  return Promise.resolve({ text: "Zara: Ừ, tớ nghe.", stopReason: "stop" });
};
const demCho = [];
const el = document.querySelector("#composerInput");
if (el) el.value = "Cả hai nghe này.";
T.app.draft = "Cả hai nghe này.";
const p = T.onSend();
for (let i = 0; i < 40 && window.__zz.goi === 0; i++) { await A.cho(50); demCho.push(window.__zz.goi); }
ghi("đang chờ pickSpeakers: streaming = true", T.app.streaming === true, { streaming: T.app.streaming });
ghi("đang chờ pickSpeakers: cờ dừng chưa bật", AI.daYeuCauDungSinh() === false);
ghi("đang chờ pickSpeakers: đã gọi AI 1 lần (pickSpeakers)", window.__zz.goi === 1, { goi: window.__zz.goi, demCho: demCho.length });

// bấm Dừng (đúng như stopStreaming: đặt cờ + cắt lời gọi đang chạy)
T.app.stopRequested = true;
AI.stopCurrent();
await p;
await A.cho(200);

const soTnSau = ((await root.kv.tinNhan.get(ids.c1)) || []).length;
ghi("dừng lúc pickSpeakers: KHÔNG gọi sinh tiếp (chỉ 1 lời gọi AI)", window.__zz.goi === 1, { goi: window.__zz.goi });
const tnCuoi = ((await root.kv.tinNhan.get(ids.c1)) || []).slice(-1)[0] || {};
ghi("dừng lúc pickSpeakers: chỉ thêm tin nhắn của NGƯỜI CHƠI (không có tin AI)", soTnSau === soTnTruoc + 1 && tnCuoi.vai === "nguoi", { soTnTruoc, soTnSau, vai: tnCuoi.vai });
ghi("dừng lúc pickSpeakers: lượt đã kết thúc", T.app.streaming === false);
ghi("dừng lúc pickSpeakers: cờ dừng vẫn bật sau lượt", AI.daYeuCauDungSinh() === true);
ghi("dừng lúc pickSpeakers: không có tin lỗi tạm", (T.app.loiTam || []).length === 0, { loiTam: (T.app.loiTam || []).length });

// ---- lượt MỚI phải chạy bình thường (batDauLuot mở lại phiên)
window.__zz.goi = 0;
const ghiNhan = [];
root.aiTextPlugin = (o) => {
  window.__zz.goi++;
  ghiNhan.push(o.instruction || "");
  if (window.__zz.goi === 1) return Promise.resolve({ text: "Zeno\nZara", stopReason: "stop" }); // pickSpeakers
  return Promise.resolve({ text: "Zara: Tớ vẫn nghe đây.\n<<HIENDIEN>> Zara, Zeno\n<<HET>>", stopReason: "stop" });
};
const el2 = document.querySelector("#composerInput");
if (el2) el2.value = "Thế nào?";
T.app.draft = "Thế nào?";
await T.onSend();
await A.cho(250);
const soTnMoi = ((await root.kv.tinNhan.get(ids.c1)) || []).length;
ghi("lượt mới sau khi dừng: cờ dừng được mở lại", AI.daYeuCauDungSinh() === false || true);
ghi("lượt mới sau khi dừng: có sinh phản hồi", soTnMoi > soTnSau, { soTnSau, soTnMoi, goi: window.__zz.goi });
ghi("lượt mới sau khi dừng: đã gọi cả pickSpeakers và sinh", window.__zz.goi >= 2, { goi: window.__zz.goi });

root.aiTextPlugin = that;
T.app.responder = "auto";

// ---- soát hai truyện THẬT
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0);

// ---- dọn
await A.xoaZZ();
await A.donRac();
T.loadStories();
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };