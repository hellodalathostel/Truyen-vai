// T6 — catDieuKhien chỉ cắt marker đã biết; "<3" / "2 < 10" phải sống sót.
const A = window.__A, T = A.T, S = A.S, AI = T.AI;
const NLC = String.fromCharCode(10);
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();
const cd = (s) => AI.catDieuKhien(s);

ghi("giữ 'Tớ thích cậu <3'", cd("Tớ thích cậu <3") === "Tớ thích cậu <3", { r: cd("Tớ thích cậu <3") });
ghi("giữ 'Cậu thích tớ <3' giữa câu", cd("Này, cậu thích tớ <3 đúng không?") === "Này, cậu thích tớ <3 đúng không?", { r: cd("Này, cậu thích tớ <3 đúng không?") });
ghi("giữ '2 < 10'", cd("Chỉ cần 2 < 10 là được") === "Chỉ cần 2 < 10 là được", { r: cd("Chỉ cần 2 < 10 là được") });
ghi("giữ 'a < b'", cd("a < b") === "a < b");
ghi("giữ '<<ngạc nhiên>>'", cd("Anh ấy <<ngạc nhiên>> nhìn tôi") === "Anh ấy <<ngạc nhiên>> nhìn tôi", { r: cd("Anh ấy <<ngạc nhiên>> nhìn tôi") });
ghi("giữ '<<im lặng>>' đầu dòng", cd("<<im lặng>>") === "<<im lặng>>", { r: cd("<<im lặng>>") });
ghi("cắt <<HET>>", cd("Chào cậu." + NLC + "<<HET>>") === "Chào cậu." + NLC, { r: cd("Chào cậu." + NLC + "<<HET>>") });
ghi("cắt <<het>> viết thường", cd("Xong<<het>>") === "Xong", { r: cd("Xong<<het>>") });
ghi("cắt <<HIENDIEN>> (giữ phần trước)", cd("Chào cậu." + NLC + "<<HIENDIEN>> Zara" + NLC + "<<HET>>") === "Chào cậu." + NLC);
ghi("cắt <<KHEP>>", cd("Xong rồi<<KHEP>>") === "Xong rồi");
ghi("cắt <<HELO: S1>>", cd("Tớ biết chuyện đó rồi." + NLC + "<<HELO: S1>>") === "Tớ biết chuyện đó rồi." + NLC, { r: cd("Tớ biết chuyện đó rồi." + NLC + "<<HELO: S1>>") });
ghi("cắt hậu tố đang là tiền tố marker ('<3' thì KHÔNG)", cd("Chào cậu." + NLC + "<3") === "Chào cậu." + NLC + "<3");
ghi("cắt hậu tố '<' trơ (đang gõ dở marker)", cd("Chào cậu.<") === "Chào cậu.", { r: cd("Chào cậu.<") });
ghi("cắt hậu tố '<<HI'", cd("abc<<HI") === "abc", { r: cd("abc<<HI") });

// ---------- tích hợp: phản hồi thật chứa '<3' phải vào tin nhắn nguyên vẹn
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
const ids = await A.taoZZ();
const st = S.getStory(ids.story);
const c1 = st.hoiThoais.find((c) => c.id === ids.c1);
c1.nhanVatIds = ["nv_z1", "nv_z2"];
c1.hienDien = ["nv_z1", "nv_z2"];
await T.luuTruyen(st);
T.app.storyId = ids.story; T.app.convId = ids.c1; T.app.screen = "story"; T.app.responder = "auto";
await T.loadMessages(ids.c1);
T.render();
const that = root.aiTextPlugin;
let goi = 0;
root.aiTextPlugin = () => {
  goi++;
  if (goi === 1) return Promise.resolve({ text: "Zeno" + NLC + "Zara", stopReason: "stop" });
  return Promise.resolve({ text: "Zara: Tớ thích cậu <3" + NLC + "Nhưng đừng nói với ai nhé." + NLC + "<<HIENDIEN>> Zara, Zeno" + NLC + "<<HET>>", stopReason: "stop" });
};
const ci = document.querySelector("#composerInput");
if (ci) ci.value = "Nói thật đi.";
T.app.draft = "Nói thật đi.";
const pTurn = T.onSend();
for (let i = 0; i < 40 && goi === 0; i++) await A.cho(100);
ghi("tích hợp: đã gọi AI", goi >= 1, { goi });
await pTurn;
await A.cho(500);
root.aiTextPlugin = that;
const tn = (await root.kv.tinNhan.get(ids.c1)) || [];
const tinAI = tn.filter((m) => m.vai === "ai");
const cuoi = tinAI[tinAI.length - 1] || {};
ghi("tích hợp: có tin AI mới", tinAI.length > 0 && tinAI.length > 1, { n: tinAI.length, goi });
ghi("tích hợp: tin AI cuối chứa '<3'", /<3/.test(cuoi.noiDung || ""), { nd: cuoi.noiDung });
ghi("tích hợp: khối điều khiển bị cắt khỏi tin nhắn", (cuoi.noiDung || "").indexOf("<<") < 0 && (cuoi.noiDung || "").indexOf("HIENDIEN") < 0 && (cuoi.noiDung || "").indexOf("HET") < 0, { nd: cuoi.noiDung });
T.render();
await A.cho(150);
ghi("tích hợp: DOM hiện '<3' cho người đọc", (document.body.textContent || "").indexOf("<3") >= 0);
ghi("tích hợp: DOM không lộ marker", (document.body.textContent || "").indexOf("<<HET>>") < 0 && (document.body.textContent || "").indexOf("HIENDIEN") < 0);

ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));

A.xoaLoi();
root.aiTextPlugin = that;
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
try { T.render(); } catch (e) {}
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };