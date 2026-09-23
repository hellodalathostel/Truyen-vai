// Dựng một truyện test đầy đủ (nhân vật, chương, hội thoại, tin nhắn, cảnh đã khép,
// ảnh, sổ tri thức, biên niên sử, dữ liệu Đạo diễn) để thử luồng nhập truyện.
const S = await import("/src/store.js");
const TS = await import("/src/trangThai.js");
await S.loadStories();
for (const s of S.store.stories.slice()) if (/^ZZ /.test(s.ten || "")) await S.deleteStory(s.id);

const nv1 = S.newCharacter({ ten: "Kai", tinhCach: "cứng đầu nhưng giữ lời", emoji: "🜂" });
const nv2 = S.newCharacter({ ten: "Aric", tinhCach: "dịu nhưng thiếu quyết đoán", emoji: "🜄" });
const st = await S.createStory({
  ten: "ZZ Nhập", mode: "songSong", boiCanh: "Một căn hộ ở Sài Gòn.", nguoiChoiTen: "Minh",
  nhanVats: [nv1, nv2],
});
const ch = S.newChapter(1, { tieuDe: "Chương 1" });
st.chuongs.push(ch);

const c1 = S.newConversation({ tieuDe: "Căn hộ", nhanVatIds: [nv1.id, nv2.id], chuongId: ch.id });
c1.hienDien = [nv1.id, nv2.id];
const c2 = S.newConversation({ tieuDe: "Ban công", nhanVatIds: [nv1.id] });
c2.hienDien = [nv1.id];
st.hoiThoais.push(c1, c2);
st.chuongs[0].id = ch.id;
st.hoiThoais[0].chuongId = ch.id;
st.hoiThoais[1].chuongId = null;

// tin nhắn hội thoại 1
const m1 = S.makeMessage("ai", "Aric hứa sẽ đứng về phía Kai.", { nvId: nv2.id, ten: "Aric" });
const m2 = S.makeMessage("nguoi", "Minh gật đầu.", { ten: "Minh" });
const m3 = S.makeMessage("ai", "Kai im lặng rất lâu rồi mới đáp.", { nvIds: [nv1.id], nvId: nv1.id, ten: "Kai" });
const m4 = S.makeMessage("anh", "", { anhId: "" });
const arr1 = [m1, m2, m3];
await S.replaceMessages(c1.id, arr1);
const arr2 = [S.makeMessage("nguoi", "Minh ra ban công hút thuốc.", { ten: "Minh" })];
await S.replaceMessages(c2.id, arr2);

// cảnh đã khép cho hội thoại 1
const canh = TS.taoCanh(st, c1, {
  tomTat: "Aric hứa đứng về phía Kai; Kai chưa tin nhưng vẫn ở lại.",
  moc: "Sáng hôm sau Aric hỏi Kai về món đồ cũ",
  tuMsgId: m1.id, denMsgId: m3.id,
  kyUc: [{ id: TS.ma("ku"), noiDung: "Aric đã hứa đứng về phía Kai.", biet: [nv1.id, nv2.id, TS.ID_NGUOI], rieng: "" }],
  quanHe: [{ id: TS.ma("qh"), tu: nv2.id, den: nv1.id, chieu: "tinTuong", huong: 1, buoc: 1, moi: "", lyDo: "Aric đã hứa trước mặt Minh" }],
  nhanVat: [{ id: TS.ma("nvz"), nvId: nv1.id, truong: "camXuc", cu: "dè chừng", moi: "vẫn đề phòng nhưng đã ở lại", lyDo: "ở lại thay vì rời đi" }],
});
st.canhDaKhep.push(canh);

// biên niên sử + sổ tri thức
st.bienNienSu.push({ id: S.uid("bn"), noiDung: "Nhóm ba người cùng giữ một bí mật nhỏ.", nguon: "thủ công", luc: Date.now() });
if (!st.lorebook || !Array.isArray(st.lorebook.entries)) st.lorebook = { ten: "Sổ thử", phienBan: Date.now(), entries: [] };
st.lorebook.entries.push((await import("/src/lore.js")).newLoreEntry({ ghiChu: "Căn hộ", keys: ["căn hộ"], noiDung: "Tầng 12, ban công hướng đông." }));

// ảnh: một bản ghi nhẹ + đầy đủ (dataUrl giả, chỉ để thử remap khoá)
const anhRec = S.newAnh({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", prompt: "test", chuThich: "ảnh thử", convId: c1.id });
await S.luuAnh(st, anhRec);
m4.anhId = anhRec.id;
arr1.push(m4);
await S.replaceMessages(c1.id, arr1);

// dữ liệu Đạo diễn
st.daoDien.bat = true;
st.daoDien.dinhChinh.push(TS.taoDinhChinh({
  loai: "quanhe", tu: nv2.id, den: nv1.id, chieu: "tinTuong", muc: 8,
  cu: "Tin tưởng vừa", moi: "Aric thật ra tin Kai hơn mức hắn dám nói.", lyDo: "cảnh chỉ cho thấy lời hứa",
  nguonCanh: [canh.id],
}));
const huong = TS.taoHuong({
  ten: "Kai mở lòng", phamVi: "quanhe", tu: nv1.id, den: nv2.id,
  mongMuon: "Kai dần cho Aric cơ hội giải thích.", nhip: "vua", soCanh: 4, rangBuoc: "không phá tính cách gốc",
  keHoach: { trangThaiDau: "Kai chưa tin.", mucTieu: "Kai mở lòng.", buoc: ["Aric để lại vật nhỏ.", "Kai ở lại."], dauHieu: "bớt quay đi", xungDot: "", dieuKienDung: "nếu bị ép tin ngay" },
});
huong.tienDo.push(TS.taoTienDo({ htId: c1.id, canhId: canh.id, trangThai: "dangTienTrien", bangChung: "Kai ở lại", buocTiep: "để Aric hỏi thật thà" }));
st.daoDien.huong.push(huong);

await S.saveStory(st);

// ---- Ba bản nhập, đi qua ĐÚNG hộp thoại "Nhập truyện" của app ----------------------
// `nhap-check` và `nhap-isolation` cần nhiều BẢN ĐỘC LẬP để đối chiếu. Nhân bản bằng tay
// sẽ bỏ qua đúng phần mã nguy hiểm nhất: `capIdMoi()` — cấp id mới cho mọi thứ rồi dịch
// lại mọi tham chiếu. Nên ở đây xuất truyện ra JSON rồi nhập lại ba lần qua giao diện.
const T = window.__tv_test;
const TEN_BAN = "ZZ Nhập";
const demBan = () => S.store.stories.filter((s) => s.ten === TEN_BAN).length;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const xuatJson = async () => {
  const data = { type: "truyen-vai", version: S.PHIEN_BAN_TRUYEN, story: st, messages: {}, anh: {} };
  for (const c of st.hoiThoais) data.messages[c.id] = (await root.kv.tinNhan.get(c.id)) || [];
  for (const a2 of st.anh) { const rec = await root.kv.thuVienAnh.get(a2.id); if (rec) data.anh[a2.id] = rec; }
  return JSON.stringify(data);
};
const dongHet = () => { try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {} };
const nhapMotBan = async (json, nhan) => {
  const truoc = demBan();
  T.openNhapTruyen(T.docFileNhap(JSON.parse(json)), nhan);
  const bd = [...document.querySelectorAll("#modalRoot .modal-backdrop")].pop();
  if (!bd) return "không mở được hộp thoại nhập";
  const nut = [...bd.querySelectorAll("button")].find((b) => b.textContent.trim() === "Nhập");
  if (!nut) { dongHet(); return "không thấy nút Nhập"; }
  nut.click();
  for (let i = 0; i < 120; i++) {
    await cho(150);
    try { await S.loadStories(); } catch (e) {}
    if (demBan() > truoc) { dongHet(); return ""; }
  }
  dongHet();
  return "nhập quá lâu mà chưa xong";
};
const jsonXuat = await xuatJson();
const loiNhap = [];
for (const nhan of ["ZZ-nhap-a.json", "ZZ-nhap-b.json", "ZZ-nhap-c.json"]) {
  const l = await nhapMotBan(jsonXuat, nhan);
  if (l) loiNhap.push(nhan + ": " + l);
}
await S.loadStories();
const dsBan = S.store.stories.filter((s) => s.ten === TEN_BAN);

window.__nhapTest = {
  stId: st.id, c1: c1.id, c2: c2.id, nv1: nv1.id, nv2: nv2.id, canh: canh.id, anh: anhRec.id,
  huong: huong.id, dc: st.daoDien.dinhChinh[0].id,
  soBan: dsBan.length, banIds: dsBan.map((s) => s.id), loiNhap,
};
return window.__nhapTest;
