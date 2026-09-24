// Truyện Vai — đường NHẬP truyện: cấp ID mới cho một bản sao và dịch lại mọi tham chiếu chéo.
//
// Vì sao tách khỏi `app.js` (Đợt 6d): đây là **logic THUẦN** của đường nhập file — không đụng
// DOM, không đọc kv, chỉ biến đổi dữ liệu. Tách ra đây thì kiểm được ở tầng Node (hàm chạy trong
// môi trường không có `document`), còn `app.js` chỉ giữ phần ghi xuống kv + giao diện.
//
// Luồng nhập KHÔNG đổi: `app.js → chayNhap()` vẫn dựng dữ liệu thô, vẫn gọi `napBanGhi` của tầng
// schema (Giai đoạn 5) để validate/migrate y như trước, rồi mới tới `capIdMoi` ở đây khi chọn chế
// độ "nhập thành bản sao".
//
// Hai luật riêng của hàm này (giữ nguyên như trước khi tách):
//   • Ảnh: CHỈ lấy ảnh thuộc truyện này (theo chỉ mục `anh` và `anhId` trong tin nhắn) — file sao
//     lưu toàn thư viện chứa ảnh của MỌI truyện.
//   • Hồ sơ ngoại hình: CHỈ lấy hồ sơ mà truyện này tham chiếu (nhân vật, người chơi, ảnh cảnh) và
//     có trong file — không ôm cả thư viện của người gửi. Liên kết trỏ tới hồ sơ không đi kèm thì
//     bị BỎ (không để trỏ ra ngoài bản sao).
import { uid, laDataUrlAnh } from "./store.js";
import { ID_NGUOI } from "./trangThai.js";
import { tinhLaiBiet } from "./thoiGian.js";

// Cấp ID mới cho một truyện (đã chuẩn hoá) và dịch lại mọi tham chiếu chéo.
// `msgsByConv` = { [convId]: [tin nhắn…] }, `anhMap` = { [anhId]: bản ghi đầy đủ },
// `hoSoMap` = { [hoSoId]: hồ sơ ngoại hình đầy đủ }.
export function capIdMoi(story0, msgsByConv, anhMap, hoSoMap) {
  const s = JSON.parse(JSON.stringify(story0));
  const hsMap = hoSoMap && typeof hoSoMap === "object" ? hoSoMap : {};
  const doi = Object.create(null);
  const dat = (id, tien) => {
    const k = String(id === undefined || id === null ? "" : id);
    if (!k || k === ID_NGUOI || doi[k]) return;
    doi[k] = uid(tien);
  };
  // Tin nhắn: chỉ lấy cho những hội thoại CÒN trong truyện (khoá tin nhắn không gắn được với hội
  // thoại nào thì bỏ qua, đúng như luồng nhập trước đây).
  const cuHt = s.hoiThoais.map((c) => c.id);
  const dsMsgs = (id) => (Array.isArray(msgsByConv[id]) ? msgsByConv[id] : []);
  const ctx = {
    s, doi, dat, cuHt, dsMsgs, anhMap, hsMap,
    canAnh: Object.create(null), canHoSo: Object.create(null),
  };
  gomId(ctx);
  const R = (id) => {
    const k = String(id === undefined || id === null ? "" : id);
    return k && doi[k] ? doi[k] : id;
  };
  dichThamChieu(ctx, R);
  const messages = dichTinNhan(ctx, R);
  const anh = dichAnh(ctx, R);
  const ngoaiHinh = dichHoSo(ctx, R);
  // Tính lại "ai biết gì" theo đúng bộ tin nhắn vừa được mang sang.
  tinhLaiBiet(s, messages);
  return { story: s, messages, anh, ngoaiHinh };
}

// Bước 1 — đăng ký ID mới cho MỌI bản ghi của truyện, theo ĐÚNG thứ tự cũ (thứ tự này quyết định
// dãy ID do `uid()` sinh ra, nên không được đổi).
function gomId(ctx) {
  const { s, dat, cuHt, dsMsgs, anhMap, hsMap, canAnh, canHoSo } = ctx;
  for (const c of s.nhanVats) dat(c.id, "nv");
  for (const c of s.chuongs) dat(c.id, "ch");
  for (const c of s.hoiThoais) dat(c.id, "ht");
  for (const c of s.canhDaKhep) {
    dat(c.id, "canh");
    for (const k of c.kyUc || []) dat(k.id, "ku");
    for (const x of c.quanHe || []) dat(x.id, "qh");
    for (const x of c.nhanVat || []) dat(x.id, "nvz");
  }
  for (const b of s.bienNienSu) dat(b.id, "bn");
  for (const cuId of cuHt) for (const m of dsMsgs(cuId)) dat(m && m.id, "tn");
  // Chỉ nhận ảnh có `dataUrl` hợp lệ — file nhập là dữ liệu không đáng tin.
  const themAnh = (id) => { if (id && anhMap[id] && laDataUrlAnh(anhMap[id].dataUrl)) canAnh[id] = anhMap[id]; };
  for (const a of s.anh || []) themAnh(a.id);
  for (const cuId of cuHt) for (const m of dsMsgs(cuId)) themAnh(m && m.anhId);
  for (const k in canAnh) dat(canAnh[k].id || k, "anh");
  const themHoSo = (id) => { if (id && hsMap[id]) canHoSo[id] = hsMap[id]; };
  for (const c of s.nhanVats) themHoSo(c.ngoaiHinhId);
  // Người chơi cũng có thể liên kết hồ sơ — phải nằm trong tập "hồ sơ đi kèm", nếu không bản sao
  // sẽ mất liên kết của người chơi dù file có hồ sơ đó.
  themHoSo(s.nguoiChoi && s.nguoiChoi.ngoaiHinhId);
  for (const a of s.anh || []) for (const id of (a && Array.isArray(a.hoSoIds) ? a.hoSoIds : [])) themHoSo(id);
  for (const k in canHoSo) dat(k, "nh");
  for (const e of (s.lorebook && s.lorebook.entries) || []) dat(e.id, "lb");
  for (const x of s.daoDien.dinhChinh) dat(x.id, "dc");
  for (const h of s.daoDien.huong) {
    dat(h.id, "hd");
    for (const e of h.tienDo || []) dat(e.id, "td");
  }
  // Sổ sự kiện vắng mặt + phiên đang chờ: cấp ID mới cho chúng nữa, nếu không bản sao sẽ dùng
  // chung ID sự kiện và chung phiên với bản gốc.
  for (const e of s.ngoaiManHinh || []) dat(e && e.id, "vge");
  if (s.thoiGian && s.thoiGian.phien) dat(s.thoiGian.phien.id, "vgp");
}

// Bước 2 — thân truyện: mọi tham chiếu chéo được dịch qua `R()`.
function dichThamChieu(ctx, R) {
  const { s, cuHt, canHoSo } = ctx;
  s.id = uid("ct");
  for (const c of s.nhanVats) {
    c.id = R(c.id);
    // Hồ sơ không đi kèm file ⇒ bỏ liên kết, không để trỏ vào hồ sơ đã biến mất.
    c.ngoaiHinhId = c.ngoaiHinhId && canHoSo[c.ngoaiHinhId] ? R(c.ngoaiHinhId) : "";
  }
  if (s.nguoiChoi) {
    s.nguoiChoi.ngoaiHinhId =
      s.nguoiChoi.ngoaiHinhId && canHoSo[s.nguoiChoi.ngoaiHinhId] ? R(s.nguoiChoi.ngoaiHinhId) : "";
  }
  for (const c of s.chuongs) c.id = R(c.id);
  for (const c of s.hoiThoais) {
    c.id = R(c.id);
    c.chuongId = R(c.chuongId) || null;
    c.nhanVatIds = (c.nhanVatIds || []).map(R);
    c.hienDien = (c.hienDien || []).map(R);
    if (c.canhRieng && c.canhRieng.nvId) c.canhRieng.nvId = R(c.canhRieng.nvId);
    // Lớp hé lộ riêng của nhánh cũng là tham chiếu chéo (sự kiện + tin nhắn + nhân vật): không
    // dịch lại thì bản sao trỏ về dữ liệu của bản gốc. Bỏ những lần hé lộ mà tin nhắn nguồn không
    // được mang sang — thiếu nó thì sự kiện trở về đúng mức gốc.
    c.vgHeLo = (c.vgHeLo || [])
      .filter((r) => r && r.tnId && ctx.doi[r.tnId])
      .map((r) => ({ vgId: R(r.vgId), htId: R(r.htId), tnId: R(r.tnId), nvId: R(r.nvId), luc: Number(r.luc) || 0 }))
      .filter((r) => r.vgId && r.htId && r.tnId);
  }
  for (const c of s.canhDaKhep) {
    c.id = R(c.id);
    c.htId = R(c.htId);
    c.htIds = (c.htIds || []).map(R);
    c.tuMsgId = R(c.tuMsgId);
    c.denMsgId = R(c.denMsgId);
    for (const k of c.kyUc || []) {
      k.id = R(k.id);
      k.biet = (k.biet || []).map(R);
      k.rieng = R(k.rieng) || "";
    }
    for (const x of c.quanHe || []) { x.id = R(x.id); x.tu = R(x.tu); x.den = R(x.den); }
    for (const x of c.nhanVat || []) { x.id = R(x.id); x.nvId = R(x.nvId); }
  }
  for (const b of s.bienNienSu) b.id = R(b.id);
  for (const a of s.anh || []) {
    a.id = R(a.id);
    a.convId = cuHt.indexOf(a.convId) >= 0 ? R(a.convId) : "";
    // Liên kết tới hồ sơ KHÔNG có trong file thì bỏ (không để trỏ ra ngoài bản sao).
    a.hoSoIds = (Array.isArray(a.hoSoIds) ? a.hoSoIds : []).filter((id) => id && canHoSo[id]).map(R);
  }
  for (const e of (s.lorebook && s.lorebook.entries) || []) e.id = R(e.id);
  for (const x of s.daoDien.dinhChinh) {
    x.id = R(x.id);
    x.nvId = R(x.nvId);
    x.tu = R(x.tu);
    x.den = R(x.den);
    x.nguonCanh = (x.nguonCanh || []).map(R);
  }
  for (const h of s.daoDien.huong) {
    h.id = R(h.id);
    h.nvId = R(h.nvId);
    h.tu = R(h.tu);
    h.den = R(h.den);
    for (const e of h.tienDo || []) { e.id = R(e.id); e.htId = R(e.htId); e.canhId = R(e.canhId); }
  }
  for (const e of s.ngoaiManHinh || []) {
    e.id = R(e.id);
    e.htId = R(e.htId);
    e.phienId = R(e.phienId);
    e.thamGia = (e.thamGia || []).map(R);
    e.biet = (e.biet || []).map(R);
    e.tnIds = (e.tnIds || []).map(R);
    // Sổ hé lộ: dịch lại nguồn sang ID mới, và BỎ những lần hé lộ mà tin nhắn nguồn không được
    // mang sang bản sao (thiếu nó thì sự kiện phải trở về mức gốc).
    e.heLo = (e.heLo || [])
      .filter((r) => r && r.tnId && ctx.doi[r.tnId])
      .map((r) => ({ htId: R(r.htId), tnId: R(r.tnId), nvId: R(r.nvId), luc: Number(r.luc) || 0 }))
      .filter((r) => r.htId && r.tnId);
    for (const d of (e.anhHuong && e.anhHuong.quanHe) || []) { d.tu = R(d.tu); d.den = R(d.den); }
    for (const d of (e.anhHuong && e.anhHuong.noiTam) || []) { d.nvId = R(d.nvId); }
  }
  if (s.thoiGian && s.thoiGian.phien) s.thoiGian.phien.id = R(s.thoiGian.phien.id);
}

// Bước 3 — tin nhắn của những hội thoại được mang sang, khoá theo ID hội thoại MỚI.
function dichTinNhan(ctx, R) {
  const { cuHt, dsMsgs, doi } = ctx;
  const messages = {};
  for (const cuId of cuHt) {
    const ds = dsMsgs(cuId);
    messages[doi[cuId] || cuId] = ds.map((m) => {
      const x = Object.assign({}, m);
      x.id = R(x.id);
      if (x.nvId) x.nvId = R(x.nvId);
      if (Array.isArray(x.nvIds)) x.nvIds = x.nvIds.map(R);
      if (x.rieng) x.rieng = R(x.rieng);
      if (x.anhId) x.anhId = R(x.anhId);
      if (x.khep) x.khep = R(x.khep);
      if (x.vangMat) x.vangMat = R(x.vangMat);
      if (x.vangMatPhien) x.vangMatPhien = R(x.vangMatPhien);
      return x;
    });
  }
  return messages;
}

// Bước 4 — ảnh đi kèm bản sao (chỉ ảnh của truyện này).
function dichAnh(ctx, R) {
  const { canAnh, cuHt, canHoSo } = ctx;
  const anh = {};
  for (const k in canAnh) {
    const rec = Object.assign({}, canAnh[k]);
    rec.id = R(rec.id || k);
    rec.convId = cuHt.indexOf(rec.convId) >= 0 ? R(rec.convId) : "";
    rec.hoSoIds = (Array.isArray(rec.hoSoIds) ? rec.hoSoIds : []).filter((id) => id && canHoSo[id]).map(R);
    anh[rec.id] = rec;
  }
  return anh;
}

// Bước 5 — hồ sơ ngoại hình đi kèm bản sao (chỉ hồ sơ được truyện tham chiếu).
function dichHoSo(ctx, R) {
  const { canHoSo } = ctx;
  const ngoaiHinh = {};
  for (const k in canHoSo) {
    const h = Object.assign({}, canHoSo[k]);
    h.id = R(k);
    ngoaiHinh[h.id] = h;
  }
  return ngoaiHinh;
}
