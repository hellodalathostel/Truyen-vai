// Bộ kiểm thử: BẤT BIẾN 5 — mọi giá trị động phải qua `esc()` khi chèn vào HTML.
//
// Cách làm: dựng một truyện mà MỌI trường văn bản (tên, mô tả, nội dung AI, ghi chú, chú
// thích ảnh, dữ liệu Đạo diễn, giao kèo…) mang một payload phá vỡ ngữ cảnh, rồi rà từng
// màn/hộp thoại. Nếu chỗ nào chèn thẳng vào HTML thì payload sẽ tạo ra một PHẦN TỬ thật
// (`<i id="tvxprobe">`) hoặc một thuộc tính thật (`tvxattr`) — đó là dấu hiệu rò rỉ.
// Payload có cả `"` để bắt cả trường hợp chèn vào trong một thuộc tính đang mở.
//
// Bộ này cố tình KHÔNG kiểm tra "có thấy payload trong DOM không" là đạt: nó kiểm tra
// payload chỉ được tồn tại dưới dạng CHỮ (đã escape), không được thành phần tử/thuộc tính.
const GOC = new URL("/src/", document.baseURI).href;
const S = await import(GOC + "store.js");
const TS = await import(GOC + "trangThai.js");
const L = await import(GOC + "lore.js");

const P = 'TVX" tvxattr="1><i id="tvxprobe"></i>';
const TEN = "ZZ Esc Probe";
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

// Bộ này bấm nhiều nút có thể gọi AI/máy vẽ (khép cảnh, gợi ý, dựng ảnh…). Cài bản GIẢ để
// bấm bao nhiêu cũng không tốn quota và không phụ thuộc mạng; bộ chạy sẽ trả lại bản thật.
const aiThat = root.aiTextPlugin, veThat = root.textToImagePlugin;
root.aiTextPlugin = () => Promise.resolve({ text: "", stopReason: "stop" });
root.textToImagePlugin = () => Promise.resolve({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" });

await S.loadStories();
for (const s of S.store.stories.slice()) if ((s.ten || "").indexOf(TEN) === 0) await S.deleteStory(s.id);
// Dọn hồ sơ còn sót của chính bộ này (id cố định) để không bao giờ để lại tham chiếu mồ.
try { await S.xoaNgoaiHinh("nhz_zzp"); } catch (e) {}
await S.loadNgoaiHinh();

const nv1 = S.newCharacter({
  id: "nv_zzp1", ten: P, vaiTro: P, moTa: P, tinhCach: P, cachNoi: P, ghiChu: P, danhXung: P,
  luatRieng: P, gioiHan: P, gioiHanCung: P, kinhNghiem: P, phongCach: P, khauVi: P,
  chamSocSau: P, tinHieuRieng: P, bietDanh: P, emoji: "X", mau: "#8b5cf6", tuoi: "30", nguoiLon: true,
});
const nv2 = S.newCharacter({ id: "nv_zzp2", ten: P, moTa: P, tinhCach: P, emoji: "Y", mau: "#22d3ee", tuoi: "35", nguoiLon: true });
const st = await S.createStory({
  ten: TEN, mode: "songSong", boiCanh: P, luatTheGioi: P, moTa: P, theLoaiTen: P, nguoiChoiTen: P,
  nhanVats: [nv1, nv2],
});
st.nguoiChoi.moTa = P;
const ch = S.newChapter(1, { tieuDe: P, tomTat: P });
st.chuongs.push(ch);
const c1 = S.newConversation({ id: "ht_zzp1", tieuDe: P, nhanVatIds: [nv1.id, nv2.id], chuongId: ch.id, hienDien: [nv1.id, nv2.id], goiY: P });
const c2 = S.newConversation({ id: "ht_zzp2", tieuDe: P, nhanVatIds: [nv1.id], hienDien: [nv1.id] });
st.hoiThoais.push(c1, c2);
const m1 = S.makeMessage("ai", P, { id: "tn_zzp1", nvId: nv1.id, ten: P });
const m2 = S.makeMessage("nguoi", P, { id: "tn_zzp2", ten: P });
const m3 = S.makeMessage("he", P, { id: "tn_zzp3", ten: P });
const canh = TS.taoCanh(st, c1, {
  tuMsgId: "tn_zzp1", denMsgId: "tn_zzp3", tomTat: P, moc: P,
  kyUc: [{ noiDung: P, biet: [nv1.id], rieng: P }],
  quanHe: [{ tu: nv1.id, den: nv2.id, chieu: "tinTuong", huong: 1, buoc: 1, moi: P, lyDo: P }],
  nhanVat: [{ nvId: nv1.id, truong: "camXuc", cu: P, moi: P, lyDo: P }],
});
st.canhDaKhep.push(canh);
st.bienNienSu.push({ id: S.uid("bn"), noiDung: P, nguon: P, luc: Date.now() });
st.lorebook = { ten: P, phienBan: Date.now(), entries: [L.newLoreEntry({ ghiChu: P, keys: [P], noiDung: P })] };
st.daoDien.bat = true;
st.daoDien.dinhChinh.push(TS.taoDinhChinh({
  loai: "quanhe", tu: nv1.id, den: nv2.id, chieu: "tinTuong", muc: 8, cu: P, moi: P, lyDo: P, nguonCanh: [canh.id],
}));
const huong = TS.taoHuong({
  ten: P, phamVi: "quanhe", tu: nv1.id, den: nv2.id, mongMuon: P, nhip: "vua", soCanh: 4, rangBuoc: P,
  keHoach: { trangThaiDau: P, mucTieu: P, buoc: [P], dauHieu: P, xungDot: P, dieuKienDung: P },
});
huong.tienDo.push(TS.taoTienDo({ htId: c1.id, canhId: canh.id, trangThai: "dangTienTrien", bangChung: P, buocTiep: P }));
st.daoDien.huong.push(huong);
st.giaoKeo = S.giaoKeoMacDinh();
Object.assign(st.giaoKeo, {
  vaiNguoiChoi: "sub", tuKhoaDung: P, soThich: [P], gioiHanCung: P, gioiHanMem: P, khongKhi: P,
  danhXung: P, luatCanh: P, chamSocSau: P, luuY: P,
});
const hs = S.newNgoaiHinh({ id: "nhz_zzp", tenChinh: P, moTa: P, tranh: P, tuoi: P });
await S.luuNgoaiHinh(hs);
st.nhanVats[0].ngoaiHinhId = hs.id;
const anhRec = S.newAnh({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", prompt: P, chuThich: P, convId: c1.id });
await S.luuAnh(st, anhRec);
m3.anhId = anhRec.id;
st.hoiThoais[0].chuongId = ch.id;
await S.saveStory(st);
await S.replaceMessages(c1.id, [m1, m2, m3]);
await S.replaceMessages(c2.id, [S.makeMessage("nguoi", P, { ten: P })]);

location.hash = "#ct=ct_khac";
await cho(60);
location.hash = "#ct=" + st.id + "&ht=" + c1.id;
await cho(900);

const kq = [];
const soi = (nhan) => {
  const html = document.body.innerHTML;
  const co = html.indexOf("tvxprobe") >= 0;
  const el = document.getElementById("tvxprobe");
  const at = document.querySelector("[tvxattr]");
  let canh = "";
  if (el) canh = (el.parentElement ? el.parentElement.outerHTML : el.outerHTML).replace(/\s+/g, " ").slice(0, 180);
  else if (at) canh = at.outerHTML.replace(/\s+/g, " ").slice(0, 140);
  kq.push({ man: nhan, co: co, ro: !!(el || at), canh: canh });
};
// Đóng modal bằng NÚT ĐÓNG của chính nó, KHÔNG gỡ node: app giữ cờ trong bộ nhớ và chỉ xoá
// cờ khi hook `onClose` chạy — vd `app.daoDienDangMo` (màn Đạo diễn). Gỡ node để lại cờ bật,
// và mọi lần mở màn Đạo diễn sau đó bị chặn IM LẶNG (bộ helo-ui từng hỏng 2 ca vì thế, ở
// LƯỢT CHẠY SAU của cùng một lần tải trang). Xem `tests/README.md` luật 7.
const dongHet = () => {
  try {
    const ds = Array.from(document.querySelectorAll("#modalRoot .modal-backdrop"));
    for (let i = ds.length - 1; i >= 0; i--) {
      const nut = Array.from(ds[i].querySelectorAll(".modal-head .icon-btn")).pop();
      if (nut) { try { nut.click(); } catch (e) {} }
      else if (ds[i].isConnected) ds[i].remove();
    }
    Array.from(document.querySelectorAll("#modalRoot .modal-backdrop")).forEach((x) => x.remove());
  } catch (e) {}
};
const man = async (nhan, hash, ms) => { dongHet(); location.hash = hash; await cho(ms || 600); soi(nhan); };
const bam = async (nhan, sel, ms, hash) => {
  dongHet();
  if (hash !== undefined) { location.hash = hash; await cho(550); dongHet(); }
  const b = [...document.querySelectorAll(sel)][0];
  if (!b) { kq.push({ man: nhan, co: null, ro: null, canh: "" }); return; }
  b.click();
  await cho(ms || 350);
  soi(nhan);
  dongHet();
};
const bam2 = async (nhan, sel1, sel2, ms, hash) => {
  dongHet();
  if (hash !== undefined) { location.hash = hash; await cho(550); dongHet(); }
  const b1 = [...document.querySelectorAll(sel1)][0];
  if (!b1) { kq.push({ man: nhan, co: null, ro: null, canh: "" }); return; }
  b1.click();
  await cho(450);
  const b2 = [...document.querySelectorAll(sel2)][0];
  if (!b2) { kq.push({ man: nhan, co: null, ro: null, canh: "" }); dongHet(); return; }
  b2.click();
  await cho(ms || 400);
  soi(nhan);
  dongHet();
};

const H_LIB = "#";
const H_DB = "#ct=" + st.id;
const H_CHAT = H_DB + "&ht=" + c1.id;

await man("thư viện", H_LIB, 600);
await bam("thư viện · cài đặt", '[data-act="open-settings"]', 600, H_LIB);
await bam("thư viện · truyện mới", '[data-act="new-story"]', 800, H_LIB);
await bam("thư viện · nhập tất cả", '[data-act="import-all"]', 800, H_LIB);
await bam("thư viện · xuất tất cả", '[data-act="export-all"]', 500, H_LIB);

await man("bảng điều khiển", H_DB, 800);
await bam("bảng điều khiển · nạp lorebook", '[data-act="open-lorebook"]', 700, H_DB);
await bam("bảng điều khiển · thư viện ảnh", '[data-act="open-anh-lib"]', 700, H_DB);
await bam("bảng điều khiển · nhân vật", '[data-act="open-chars"]', 600, H_DB);
await bam("bảng điều khiển · sửa nhân vật", '[data-act="edit-char"]', 700, H_DB);
await bam("bảng điều khiển · nhân vật mới", '[data-act="new-char"]', 700, H_DB);
await bam("bảng điều khiển · biên niên sử", '[data-act="open-chronicle"]', 700, H_DB);
await bam2("biên niên sử · sửa mục", '[data-act="open-chronicle"]', '[data-act="edit-bn"]', 600, H_DB);
await bam("bảng điều khiển · Đạo diễn", '[data-act="open-dao-dien"]', 800, H_DB);
await bam2("Đạo diễn · hướng mới", '[data-act="open-dao-dien"]', '[data-act="dd-huong-moi"]', 900, H_DB);
await bam2("Đạo diễn · đính chính mới", '[data-act="open-dao-dien"]', '[data-act="dd-dinh-chinh-moi"]', 900, H_DB);
await bam2("Đạo diễn · đính chính nhân vật", '[data-act="open-dao-dien"]', '[data-act="dd-dinh-chinh-nv"]', 900, H_DB);
await bam2("Đạo diễn · đính chính quan hệ", '[data-act="open-dao-dien"]', '[data-act="dd-dinh-chinh-qh"]', 900, H_DB);
await bam2("menu truyện · xuất truyện", '[data-act="story-menu"]', '[data-act="export-story"]', 500, H_DB);
await bam2("menu truyện · thư viện ngoại hình", '[data-act="story-menu"]', '[data-act="open-ngoai-hinh"]', 900, H_DB);

await man("khung chat", H_CHAT, 800);
await bam("chat · cài đặt", '[data-act="open-settings"]', 600, H_CHAT);
await bam("chat · sửa hội thoại", '[data-act="edit-conv"]', 700, H_CHAT);
await bam("chat · nhân vật", '[data-act="open-chars"]', 700, H_CHAT);
await bam("chat · hiện diện", '[data-act="open-hien-dien"]', 800, H_CHAT);
await bam("chat · sửa tin nhắn", '[data-act="edit-msg"]', 700, H_CHAT);
await bam("chat · ghi biên niên", '[data-act="facts-msg"]', 700, H_CHAT);
await bam("chat · khép cảnh", '[data-act="khep-canh"]', 900, H_CHAT);
await bam("chat · dựng ảnh", '[data-act="tao-anh-msg"]', 900, H_CHAT);
await bam("chat · gợi ý lời đáp", '[data-act="suggest"]', 800, H_CHAT);
await bam("chat · viết thành truyện", '[data-act="viet-truyen"]', 800, H_CHAT);
await bam("chat · menu", '[data-act="toggle-chat-menu"]', 500, H_CHAT);

dongHet();
location.hash = H_DB;
await cho(300);

const ca = [];
let soMan = 0, soRo = 0;
for (const x of kq) {
  if (x.co === null) continue;
  if (!x.co) continue;
  soMan++;
  if (x.ro) {
    soRo++;
    ca.push({ ten: "không chèn HTML thô ở: " + x.man, ok: false, ct: x.canh });
  } else {
    ca.push({ ten: "không chèn HTML thô ở: " + x.man, ok: true, ct: "" });
  }
}
ca.push({ ten: "độ phủ: đủ số màn có dữ liệu", ok: soMan >= 24, ct: soMan + " màn có dữ liệu / " + kq.length + " màn đã rà" });

// Dọn sạch dấu vết của bộ kiểm thử (không để lại truyện/hồ sơ/ảnh).
try {
  for (const a of st.anh.slice()) await root.kv.thuVienAnh.delete(a.id);
  for (const c of st.hoiThoais) await root.kv.tinNhan.delete(c.id);
  await S.deleteStory(st.id);
  await S.xoaNgoaiHinh(hs.id);
  await S.loadStories();
  await S.loadNgoaiHinh();
} catch (e) { /* bộ chạy vẫn dọn truyện "ZZ" ở cuối lượt chạy */ }
root.aiTextPlugin = aiThat;
root.textToImagePlugin = veThat;

return ca;
