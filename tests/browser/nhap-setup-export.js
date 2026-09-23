// Dựng lại truyện test rồi xuất ra JSON (giống hệt xuatTruyen của app) để làm file nhập.
const S = await import("/src/store.js");
const Src = await (await fetch("/src/app.js")).text();
const mv = /PHIEN_BAN_TRUYEN\s*=\s*(\d+)/.exec(Src);
const version = mv ? Number(mv[1]) : 5;
await S.loadStories();
for (const s of S.store.stories.slice()) if (/^ZZ /.test(s.ten || "")) await S.deleteStory(s.id);
const TS = await import("/src/trangThai.js");
const nv1 = S.newCharacter({ ten: "Kai", tinhCach: "cứng đầu nhưng giữ lời", emoji: "🜂" });
const nv2 = S.newCharacter({ ten: "Aric", tinhCach: "dịu nhưng thiếu quyết đoán", emoji: "🜄" });
const st = await S.createStory({ ten: "ZZ Nhập", mode: "songSong", boiCanh: "Một căn hộ ở Sài Gòn.", nguoiChoiTen: "Minh", nhanVats: [nv1, nv2] });
const ch = S.newChapter(1, { tieuDe: "Chương 1" });
st.chuongs.push(ch);
const c1 = S.newConversation({ tieuDe: "Căn hộ", nhanVatIds: [nv1.id, nv2.id], chuongId: ch.id });
c1.hienDien = [nv1.id, nv2.id];
const c2 = S.newConversation({ tieuDe: "Ban công", nhanVatIds: [nv1.id] });
c2.hienDien = [nv1.id];
st.hoiThoais.push(c1, c2);
st.hoiThoais[1].chuongId = null;
const m1 = S.makeMessage("ai", "Aric hứa sẽ đứng về phía Kai.", { nvId: nv2.id, ten: "Aric" });
const m2 = S.makeMessage("nguoi", "Minh gật đầu.", { ten: "Minh" });
const m3 = S.makeMessage("ai", "Kai im lặng rất lâu rồi mới đáp.", { nvIds: [nv1.id], nvId: nv1.id, ten: "Kai" });
const m4 = S.makeMessage("anh", "", { anhId: "" });
await S.replaceMessages(c1.id, [m1, m2, m3]);
await S.replaceMessages(c2.id, [S.makeMessage("nguoi", "Minh ra ban công hút thuốc.", { ten: "Minh" })]);
const canh = TS.taoCanh(st, c1, {
  tomTat: "Aric hứa đứng về phía Kai; Kai chưa tin nhưng vẫn ở lại.", moc: "Sáng hôm sau Aric hỏi Kai về món đồ cũ",
  tuMsgId: m1.id, denMsgId: m3.id,
  kyUc: [{ id: TS.ma("ku"), noiDung: "Aric đã hứa đứng về phía Kai.", biet: [nv1.id, nv2.id, TS.ID_NGUOI], rieng: "" }],
  quanHe: [{ id: TS.ma("qh"), tu: nv2.id, den: nv1.id, chieu: "tinTuong", huong: 1, buoc: 1, moi: "", lyDo: "Aric đã hứa trước mặt Minh" }],
  nhanVat: [{ id: TS.ma("nvz"), nvId: nv1.id, truong: "camXuc", cu: "dè chừng", moi: "vẫn đề phòng nhưng đã ở lại", lyDo: "ở lại thay vì rời đi" }],
});
st.canhDaKhep.push(canh);
st.bienNienSu.push({ id: S.uid("bn"), noiDung: "Nhóm ba người cùng giữ một bí mật nhỏ.", nguon: "thủ công", luc: Date.now() });
if (!st.lorebook || !Array.isArray(st.lorebook.entries)) st.lorebook = { ten: "Sổ thử", phienBan: Date.now(), entries: [] };
st.lorebook.entries.push((await import("/src/lore.js")).newLoreEntry({ ghiChu: "Căn hộ", keys: ["căn hộ"], noiDung: "Tầng 12, ban công hướng đông." }));
const anhRec = S.newAnh({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", prompt: "test", chuThich: "ảnh thử", convId: c1.id });
await S.luuAnh(st, anhRec);
m4.anhId = anhRec.id;
await S.replaceMessages(c1.id, [m1, m2, m3, m4]);
st.daoDien.bat = true;
st.daoDien.dinhChinh.push(TS.taoDinhChinh({ loai: "quanhe", tu: nv2.id, den: nv1.id, chieu: "tinTuong", muc: 8, cu: "Tin tưởng vừa", moi: "Aric thật ra tin Kai hơn mức hắn dám nói.", lyDo: "cảnh chỉ cho thấy lời hứa", nguonCanh: [canh.id] }));
const huong = TS.taoHuong({ ten: "Kai mở lòng", phamVi: "quanhe", tu: nv1.id, den: nv2.id, mongMuon: "Kai dần cho Aric cơ hội giải thích.", nhip: "vua", soCanh: 4, rangBuoc: "không phá tính cách gốc", keHoach: { trangThaiDau: "Kai chưa tin.", mucTieu: "Kai mở lòng.", buoc: ["Aric để lại vật nhỏ.", "Kai ở lại."], dauHieu: "bớt quay đi", xungDot: "", dieuKienDung: "nếu bị ép tin ngay" } });
huong.tienDo.push(TS.taoTienDo({ htId: c1.id, canhId: canh.id, trangThai: "dangTienTrien", bangChung: "Kai ở lại", buocTiep: "để Aric hỏi thật thà" }));
st.daoDien.huong.push(huong);
await S.saveStory(st);
const data = { type: "truyen-vai", version, story: st, messages: {}, anh: {} };
for (const c of st.hoiThoais) data.messages[c.id] = (await root.kv.tinNhan.get(c.id)) || [];
for (const a of st.anh) { const rec = await root.kv.thuVienAnh.get(a.id); if (rec) data.anh[a.id] = rec; }
return JSON.stringify(data);
