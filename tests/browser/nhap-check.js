// Kiểm tra tính toàn vẹn của mọi bản "ZZ Nhập" trong thư viện: ID riêng biệt và
// mọi tham chiếu chéo đều trỏ tới thứ có thật TRONG CHÍNH bản đó.
const S = await import("/src/store.js");
const TS = await import("/src/trangThai.js");
await S.loadStories();
const ds = S.store.stories.filter((s) => /^ZZ Nhập/.test(s.ten || ""));
const loi = [];
const tnAll = await root.kv.tinNhan.entries();
const anhAll = await root.kv.thuVienAnh.entries();
const tnKeys = {};
for (const [k, v] of tnAll) tnKeys[k] = v;
const anhKeys = {};
for (const [k] of anhAll) anhKeys[k] = true;

const tatCa = { nv: {}, ht: {}, canh: {}, tn: {}, anh: {}, ch: {}, bn: {}, dc: {}, hd: {}, td: {}, lb: {}, ku: {}, qh: {}, nvz: {} };
const giu = (nhom, id, nhan) => {
  if (!id || id === "nguoi") return;
  if (tatCa[nhom][id]) loi.push(nhan + ": ID dùng chung giữa hai bản — " + nhom + " " + id);
  tatCa[nhom][id] = true;
};

if (ds.length < 4) loi.push("cần ít nhất 4 bản \"ZZ Nhập\" (1 gốc + 3 bản do nhap-setup nhập vào) — đang có " + ds.length + "; xem tests/browser/nhap-setup.js");

// Quy mọi id RIÊNG của một bản về nhãn theo VỊ TRÍ, để so nội dung trạng thái giữa các bản.
// Các bản phải có id khác nhau — đó chính là việc bản nhập phải làm — nên so thẳng JSON sẽ
// luôn báo khác, và đã từng báo oan đúng như vậy. Cái phải GIỐNG nhau là nội dung.
function bangId(s) {
  const b = {};
  s.nhanVats.forEach((c, i) => (b[c.id] = "nv#" + i));
  s.hoiThoais.forEach((c, i) => (b[c.id] = "ht#" + i));
  s.chuongs.forEach((c, i) => (b[c.id] = "ch#" + i));
  s.canhDaKhep.forEach((c, i) => (b[c.id] = "canh#" + i));
  s.bienNienSu.forEach((c, i) => (b[c.id] = "bn#" + i));
  s.anh.forEach((a, i) => (b[a.id] = "anh#" + i));
  ((s.lorebook && s.lorebook.entries) || []).forEach((e, i) => (b[e.id] = "lb#" + i));
  s.canhDaKhep.forEach((c, ci) => {
    (c.kyUc || []).forEach((x, i) => (b[x.id] = "canh#" + ci + ".ku#" + i));
    (c.quanHe || []).forEach((x, i) => (b[x.id] = "canh#" + ci + ".qh#" + i));
    (c.nhanVat || []).forEach((x, i) => (b[x.id] = "canh#" + ci + ".nvz#" + i));
  });
  s.daoDien.dinhChinh.forEach((x, i) => (b[x.id] = "dc#" + i));
  s.daoDien.huong.forEach((x, ix) => {
    b[x.id] = "hd#" + ix;
    (x.tienDo || []).forEach((e, i) => (b[e.id] = "hd#" + ix + ".td#" + i));
  });
  return b;
}
// Bỏ mốc thời gian và các trường trỏ tới id — chúng khác nhau giữa các bản là đúng.
const BO_QUA = { id: 1, luc: 1, suaLuc: 1, taoLuc: 1, canhId: 1, tuMsgId: 1, denMsgId: 1, phienId: 1, daXuLyLuc: 1, hoatDongLuc: 1 };
// Khoá của trạng thái cũng có thể là id (ví dụ quan hệ khoá theo "tu|den") — quy cả khoá.
function doiKhoa(k, b) {
  if (Object.prototype.hasOwnProperty.call(b, k)) return b[k];
  if (k.indexOf("|") < 0) return k;
  return k.split("|").map((x) => (Object.prototype.hasOwnProperty.call(b, x) ? b[x] : x)).join("|");
}
function rutId(x, b) {
  if (Array.isArray(x)) return x.map((v) => rutId(v, b));
  if (x && typeof x === "object") {
    const ra = {};
    for (const k of Object.keys(x)) {
      if (BO_QUA[k]) continue;
      ra[doiKhoa(k, b)] = rutId(x[k], b);
    }
    return ra;
  }
  if (typeof x === "string") return Object.prototype.hasOwnProperty.call(b, x) ? b[x] : x;
  return x;
}

const ketQua = [];
for (const s of ds) {
  await S.loadMessages(s.hoiThoais[0] ? s.hoiThoais[0].id : "x").catch(() => {});
  for (const c of s.hoiThoais) await S.loadMessages(c.id);
  const nvIds = {}; s.nhanVats.forEach((c) => (nvIds[c.id] = true));
  const htIds = {}; s.hoiThoais.forEach((c) => (htIds[c.id] = true));
  const canhIds = {}; s.canhDaKhep.forEach((c) => (canhIds[c.id] = true));
  const anhIds = {}; s.anh.forEach((a) => (anhIds[a.id] = true));
  const chIds = {}; s.chuongs.forEach((c) => (chIds[c.id] = true));

  s.nhanVats.forEach((c) => giu("nv", c.id, s.id));
  s.hoiThoais.forEach((c) => giu("ht", c.id, s.id));
  s.canhDaKhep.forEach((c) => giu("canh", c.id, s.id));
  s.chuongs.forEach((c) => giu("ch", c.id, s.id));
  s.bienNienSu.forEach((b) => giu("bn", b.id, s.id));
  s.anh.forEach((a) => giu("anh", a.id, s.id));

  for (const c of s.hoiThoais) {
    if (c.chuongId && !chIds[c.chuongId]) loi.push(s.id + ": hội thoại " + c.tieuDe + " trỏ tới chương không tồn tại");
    c.nhanVatIds.forEach((id) => { if (!nvIds[id]) loi.push(s.id + ": nhanVatIds có id lạ " + id); });
    (c.hienDien || []).forEach((id) => { if (!nvIds[id]) loi.push(s.id + ": hienDien có id lạ " + id); });
    if (c.canhRieng && c.canhRieng.nvId && !nvIds[c.canhRieng.nvId]) loi.push(s.id + ": canhRieng trỏ tới nhân vật lạ");
    if (!tnKeys[c.id]) loi.push(s.id + ": hội thoại " + c.tieuDe + " không có bản ghi tinNhan");
    const msgs = tnKeys[c.id] || [];
    const mIds = {};
    msgs.forEach((m) => (mIds[m.id] = true));
    msgs.forEach((m) => {
      if (m.nvId && !nvIds[m.nvId]) loi.push(s.id + ": tin nhắn có nvId lạ " + m.nvId);
      (m.nvIds || []).forEach((id) => { if (!nvIds[id]) loi.push(s.id + ": tin nhắn có nvIds lạ " + id); });
      if (m.rieng && !nvIds[m.rieng]) loi.push(s.id + ": tin nhắn có rieng lạ " + m.rieng);
      if (m.anhId && !anhIds[m.anhId]) loi.push(s.id + ": tin nhắn trỏ tới ảnh lạ " + m.anhId);
      if (m.anhId && !anhKeys[m.anhId]) loi.push(s.id + ": ảnh " + m.anhId + " không có trong thuVienAnh");
      if (m.khep && !canhIds[m.khep]) loi.push(s.id + ": tin nhắn trỏ tới cảnh lạ " + m.khep);
      giu("tn", m.id, s.id);
    });
    for (const c2 of s.canhDaKhep) {
      if (c2.htIds.indexOf(c.id) >= 0) {
        if (c2.tuMsgId && !mIds[c2.tuMsgId]) loi.push(s.id + ": cảnh " + c2.id + " tuMsgId không thuộc hội thoại");
        if (c2.denMsgId && !mIds[c2.denMsgId]) loi.push(s.id + ": cảnh " + c2.id + " denMsgId không thuộc hội thoại");
      }
    }
  }
  for (const c of s.canhDaKhep) {
    if (!htIds[c.htId]) loi.push(s.id + ": cảnh " + c.id + " htId lạ");
    (c.htIds || []).forEach((id) => { if (!htIds[id]) loi.push(s.id + ": cảnh " + c.id + " htIds lạ " + id); });
    for (const k of c.kyUc || []) {
      giu("ku", k.id, s.id);
      (k.biet || []).forEach((id) => { if (id !== "nguoi" && !nvIds[id]) loi.push(s.id + ": ký ức biết id lạ " + id); });
      if (k.rieng && !nvIds[k.rieng]) loi.push(s.id + ": ký ức rieng lạ " + k.rieng);
    }
    for (const x of c.quanHe || []) { giu("qh", x.id, s.id); if (!nvIds[x.tu]) loi.push(s.id + ": quanHe.tu lạ"); if (x.den !== "nguoi" && !nvIds[x.den]) loi.push(s.id + ": quanHe.den lạ"); }
    for (const x of c.nhanVat || []) { giu("nvz", x.id, s.id); if (!nvIds[x.nvId]) loi.push(s.id + ": nhanVat.nvId lạ"); }
  }
  for (const a of s.anh) {
    if (!anhKeys[a.id]) loi.push(s.id + ": chỉ mục ảnh " + a.id + " không có bản ghi thuVienAnh");
    if (a.convId && !htIds[a.convId]) loi.push(s.id + ": ảnh trỏ tới hội thoại lạ");
  }
  for (const x of s.daoDien.dinhChinh) {
    giu("dc", x.id, s.id);
    if (x.nvId && !nvIds[x.nvId]) loi.push(s.id + ": đính chính nvId lạ");
    if (x.tu && x.tu !== "nguoi" && !nvIds[x.tu]) loi.push(s.id + ": đính chính tu lạ");
    if (x.den && x.den !== "nguoi" && !nvIds[x.den]) loi.push(s.id + ": đính chính den lạ");
    (x.nguonCanh || []).forEach((id) => { if (!canhIds[id]) loi.push(s.id + ": đính chính nguonCanh lạ " + id); });
  }
  for (const h of s.daoDien.huong) {
    giu("hd", h.id, s.id);
    if (h.nvId && !nvIds[h.nvId]) loi.push(s.id + ": hướng nvId lạ");
    if (h.tu && h.tu !== "nguoi" && !nvIds[h.tu]) loi.push(s.id + ": hướng tu lạ");
    if (h.den && h.den !== "nguoi" && !nvIds[h.den]) loi.push(s.id + ": hướng den lạ");
    for (const e of h.tienDo || []) {
      giu("td", e.id, s.id);
      if (e.htId && !htIds[e.htId]) loi.push(s.id + ": tiến độ htId lạ");
      if (e.canhId && !canhIds[e.canhId]) loi.push(s.id + ": tiến độ canhId lạ");
    }
  }
  for (const e of (s.lorebook && s.lorebook.entries) || []) giu("lb", e.id, s.id);

  const c0 = s.hoiThoais.find((c) => c.tieuDe === "Căn hộ");
  let tt = null;
    try { tt = rutId(JSON.parse(JSON.stringify(TS.tinhTrangThai(s, c0))), bangId(s)); } catch (e) { loi.push(s.id + ": tinhTrangThai lỗi " + e.message); }
  ketQua.push({ id: s.id, tt });
}

// So NỘI DUNG trạng thái giữa các bản (id đã quy về nhãn theo vị trí).
let cungTt = true;
for (let i = 1; i < ketQua.length; i++) {
  if (JSON.stringify(ketQua[i].tt) !== JSON.stringify(ketQua[0].tt)) {
    cungTt = false;
    loi.push("trạng thái khác nhau giữa bản đầu và bản " + i + " ở mục: " + tenKhac(ketQua[0].tt, ketQua[i].tt));
  }
}
function tenKhac(a, b) {
  for (const k of Object.keys(a || {})) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return k;
  return "(không rõ)";
}

// các khoá tinNhan/thuVienAnh không được dùng chung
const demHt = {};
for (const [k] of tnAll) demHt[k] = (demHt[k] || 0) + 1;

return { soBan: ds.length, loi: loi.slice(0, 40), soLoi: loi.length, cungTt,
  tt0: ketQua[0] ? ketQua[0].tt.nv : null };
