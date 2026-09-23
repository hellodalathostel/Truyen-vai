// T1 — giao dịch nhiều khoá: cưỡng bức lỗi ở từng bước ghi/xoá.
const A = window.__A, T = A.T, S = A.S;
const kq = [];
const ghi = (ten, dat, chiTiet) => kq.push({ ca: ten, dat: !!dat, ...(chiTiet ? { ct: chiTiet } : {}) });
A.caiChan();
const chot = await A.chotThat();

// ---------- 1. deleteStory: lỗi khi xoá bản ghi truyện (bước CUỐI)
let ids = await A.taoZZ();
A.datLoi({ folder: "cotTruyen", method: "delete", lan: 1, loi: "lỗi giả lập khi xoá cốt truyện" });
let nem = null;
try { await S.deleteStory(ids.story); } catch (e) { nem = String(e && e.message || e); }
A.xoaLoi();
let d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("deleteStory: lỗi bước cuối → ném lỗi", !!nem, nem);
ghi("deleteStory: truyện còn trên kv", d.co === true, d);
ghi("deleteStory: tin nhắn c1 còn (3)", d.tn1 === 3, d);
ghi("deleteStory: tin nhắn c2 còn (2)", d.tn2 === 2, d);
ghi("deleteStory: ảnh còn", d.anh === true, d);
ghi("deleteStory: truyện vẫn ở RAM", S.store.stories.some((s) => s.id === ids.story) === true);

// ---------- 2. deleteStory: lỗi khi xoá tin nhắn của hội thoại thứ 2
A.datLoi({ folder: "tinNhan", method: "delete", lan: 2, loi: "lỗi giả lập khi xoá tin nhắn" });
nem = null;
try { await S.deleteStory(ids.story); } catch (e) { nem = String(e && e.message || e); }
A.xoaLoi();
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("deleteStory: lỗi giữa chừng → ném lỗi", !!nem, nem);
ghi("deleteStory: tin nhắn hội thoại 1 được trả lại", d.tn1 === 3, d);
ghi("deleteStory: tin nhắn hội thoại 2 được trả lại", d.tn2 === 2, d);
ghi("deleteStory: bản ghi truyện còn", d.co === true);

// ---------- 3. deleteStory thành công (đối chứng)
await S.deleteStory(ids.story);
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("deleteStory: xoá thật thành công", d.co === false && d.tn1 === 0 && d.tn2 === 0 && d.anh === false, d);

// ---------- 4. xoaHoiThoai: lỗi khi ghi cốt truyện (bước cuối)
ids = await A.taoZZ();
A.datLoi({ folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập khi ghi cốt truyện" });
T.xoaHoiThoai(ids.c2);
await A.cho(60);
await A.bam("Xoá");
A.xoaLoi();
d = await A.doc(ids.story, ids.c1, ids.c2);
const st4 = S.getStory(ids.story);
ghi("xoaHoiThoai: hỏng bước cuối → hội thoại vẫn còn nguyên", st4 && st4.hoiThoais.some((c) => c.id === ids.c2) === true, { hts: st4 && st4.hoiThoais.length });
ghi("xoaHoiThoai: tin nhắn không mất", d.tn2 === 2, d);
ghi("xoaHoiThoai: RAM cũng còn hội thoại", d.ramHts === 2, d);
ghi("xoaHoiThoai: không báo 'đã xoá'", !(document.body.textContent || "").includes("Đã xoá hội thoại."));

// ---------- 5. xoaHoiThoai thành công
T.xoaHoiThoai(ids.c2);
await A.cho(60);
await A.bam("Xoá");
d = await A.doc(ids.story, ids.c1, ids.c2);
const st5 = S.getStory(ids.story);
ghi("xoaHoiThoai: xoá thật thành công", st5 && st5.hoiThoais.length === 1 && d.tn2 === 0, { hts: st5 && st5.hoiThoais.length, tn2: d.tn2 });

// ---------- 6. xoaAnhKhoiTruyen: lỗi khi ghi cốt truyện
ids = await A.taoZZ();
A.datLoi({ folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập khi ghi cốt truyện" });
let okAnh = await T.xoaAnhKhoiTruyen(S.getStory(ids.story), ids.anh);
A.xoaLoi();
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("xoaAnhKhoiTruyen: trả về false khi hỏng", okAnh === false, { okAnh });
ghi("xoaAnhKhoiTruyen: ảnh còn", d.anh === true, d);
ghi("xoaAnhKhoiTruyen: tin nhắn chứa ảnh còn (3)", d.tn1 === 3, d);
ghi("xoaAnhKhoiTruyen: bộ đệm RAM tin nhắn được trả lại (3)", d.cacheTn1 === 3, d);
ghi("xoaAnhKhoiTruyen: bộ đệm ảnh được trả lại", d.cacheAnh === true, d);

// ---------- 7. xoaAnhKhoiTruyen thành công
okAnh = await T.xoaAnhKhoiTruyen(S.getStory(ids.story), ids.anh);
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("xoaAnhKhoiTruyen: xoá thật thành công", okAnh === true && d.anh === false && d.tn1 === 2, { okAnh, tn1: d.tn1, anh: d.anh });

// ---------- 8. catVaLuuLai: lỗi khi ghi cốt truyện
ids = await A.taoZZ();
T.app.storyId = ids.story; T.app.convId = ids.c1; T.app.screen = "story";
await T.loadMessages(ids.c1);
A.datLoi({ folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập khi ghi cốt truyện" });
await T.catVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 2, [S.getStory(ids.story).nhanVats[0]]);
A.xoaLoi();
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("catVaLuuLai: hỏng → tin nhắn không bị cắt", d.tn1 === 3, d);
ghi("catVaLuuLai: bộ đệm RAM cũng không bị cắt", d.cacheTn1 === 3, d);
ghi("catVaLuuLai: không tạo tin nhắn mới", ((await root.kv.tinNhan.get(ids.c1)) || []).length === 3);

// ---------- 9. catVaLuuLai thành công (có AI giả)
A.xoaZZ();
ids = await A.taoZZ();
T.app.storyId = ids.story; T.app.convId = ids.c1;
const that = root.aiTextPlugin;
root.aiTextPlugin = () => Promise.resolve({ text: "Ừ, tớ vẫn ở đây.", stopReason: "stop" });
await T.catVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 2, [S.getStory(ids.story).nhanVats[0]]);
root.aiTextPlugin = that;
d = await A.doc(ids.story, ids.c1, ids.c2);
ghi("catVaLuuLai: cắt thật rồi viết lại (3 = 2 cũ + 1 mới)", d.tn1 === 3, { tn1: d.tn1, cache: d.cacheTn1 });

// ---------- 10. taoNhanhVaLuuLai: lỗi khi ghi cốt truyện → KHÔNG để lại khoá tin nhắn mồ côi
A.xoaZZ();
ids = await A.taoZZ();
T.app.storyId = ids.story; T.app.convId = ids.c1;
const htTruoc = (await root.kv.cotTruyen.get(ids.story)).hoiThoais.map((c) => c.id);
A.datLoi({ folder: "cotTruyen", method: "set", lan: 1, loi: "lỗi giả lập khi ghi cốt truyện" });
await T.taoNhanhVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 2, [S.getStory(ids.story).nhanVats[0]]);
A.xoaLoi();
const st10 = await root.kv.cotTruyen.get(ids.story);
const htSau = st10.hoiThoais.map((c) => c.id);
const moiCon = htSau.filter((x) => htTruoc.indexOf(x) < 0);
const moCoi = [];
for (const x of moiCon) {
  const v = await root.kv.tinNhan.get(x);
  if (v !== null && v !== undefined) moCoi.push(x);
}
ghi("taoNhanh: nhánh không được ghi vào truyện", moiCon.length === 0, { htSau });
ghi("taoNhanh: không để lại khoá tin nhắn mồ côi", moCoi.length === 0, { moCoi });
ghi("taoNhanh: bản gốc nguyên vẹn", (await A.doc(ids.story, ids.c1, ids.c2)).tn1 === 3);

// ---------- 11. taoNhanhVaLuuLai thành công
root.aiTextPlugin = () => Promise.resolve({ text: "Nhánh mới đây.", stopReason: "stop" });
await T.taoNhanhVaLuuLai(S.getStory(ids.story), S.getStory(ids.story).hoiThoais[0], 2, [S.getStory(ids.story).nhanVats[0]]);
root.aiTextPlugin = that;
const st11 = await root.kv.cotTruyen.get(ids.story);
const nhanh = st11.hoiThoais.filter((c) => /nhánh/.test(c.tieuDe || ""));
ghi("taoNhanh: tạo được nhánh", nhanh.length === 1, { tds: st11.hoiThoais.map((c) => c.tieuDe) });
if (nhanh.length) {
  const tn = await root.kv.tinNhan.get(nhanh[0].id);
  ghi("taoNhanh: nhánh có tin nhắn riêng", Array.isArray(tn) && tn.length >= 2, { n: tn && tn.length });
  ghi("taoNhanh: bản gốc vẫn còn tin nhắn", ((await root.kv.tinNhan.get(ids.c1)) || []).length === 3);
}

// ---------- soát hai truyện THẬT
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));

// ---------- dọn
A.xoaLoi();
await A.xoaZZ();
A.T.loadStories();
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };