// Truyện Vai — thời gian vắng mặt & tương tác chủ động.
//
// RÀNG BUỘC NỀN TẢNG: Perchance KHÔNG chạy khi tab đã đóng. Mọi "thời gian đã trôi"
// và sự kiện vắng mặt chỉ được TÍNH ra khi người dùng mở lại app/truyện. Không có gì
// chạy nền, không có backend, không có thông báo đẩy.
//
// File này giữ hai thứ:
//   (a) SCHEMA + chuẩn hoá dữ liệu của tính năng (thời gian theo truyện, phiên vắng
//       mặt, sổ sự kiện ngoài màn hình) — store.js dùng lại các hàm này;
//   (b) LOGIC THUẦN: khi nào được phép mô phỏng, cảnh nào đang dang dở, dữ liệu cho
//       thẻ "Nhịp trước đó", ai biết sự kiện nào.
//
// SỔ HÉ LỘ: mỗi lần một sự kiện ẩn được kể ra trong một tin nhắn, app ghi lại NGUỒN
// (hội thoại + tin nhắn + người kể) chứ không chỉ ghi kết quả. Mức "đã lộ" và danh sách
// "ai biết" vì thế luôn TÍNH LẠI ĐƯỢC từ mức gốc (`mucGoc`) + các lần hé lộ mà tin nhắn
// nguồn còn tồn tại — xoá tin nhắn, cắt lịch sử, tạo nhánh hay xoá hội thoại đều trả
// trạng thái biết về đúng những gì còn lại trong lịch sử.
// Việc gọi AI (ai.js) và ghi dữ liệu (app.js) nằm ngoài file này.
//
// Chỉ import `trangThai.js` — file đó cũng không import gì, nên không có vòng import.
import { ID_NGUOI, CHIEU, TRUONG, canhHopLe, canhCuoi, tinhTrangThai } from "./trangThai.js";

// ------------------------------------------------------------------ hằng số
export const CHE_DO = [
  {
    id: "tamDung",
    ten: "Tạm dừng",
    moTa: "Không sinh sự kiện; thời gian truyện không tự trôi.",
    dan: "Người chơi đang nghỉ. Không gọi AI, không mô phỏng gì thêm.",
  },
  {
    id: "theoCanh",
    ten: "Theo cảnh",
    moTa: "Chỉ khi cảnh gần nhất đã Khép cảnh: tối đa MỘT nhịp chuyển tiếp, dù bạn rời 1 giờ hay 3 ngày.",
    dan: "Thời gian thật KHÔNG quyết định độ dài. Chỉ một nhịp chuyển tiếp hợp lý giữa hai cảnh, không ánh xạ tuổi/lịch/thời lượng.",
  },
  {
    id: "thoiGianThat",
    ten: "Theo thời gian thật",
    moTa: "Dùng khoảng vắng mặt thật làm gợi ý cho thời gian truyện, nhưng vẫn tối đa 3 sự kiện.",
    dan: "Khoảng vắng mặt thật là dữ kiện gợi ý, không phải mệnh lệnh: không kể tắt hàng loạt biến cố lớn, phần còn lại là khoảng trống hợp lý.",
  },
];

export const NGUONG_MAC_DINH = 30; // phút
export const NGUONG_CHON = [15, 30, 60, 120, 240, 480, 1440];
export const TOI_DA_SU_KIEN = 3;

export const LOAI = [
  { id: "lienLac", ten: "Liên lạc nhìn thấy", moTa: "Nhân vật chủ động gửi tới — hiện thành tin nhắn trong hội thoại." },
  { id: "dauHieu", ten: "Dấu hiệu / tình huống khi trở lại", moTa: "Một thay đổi nhỏ người chơi thấy ngay khi quay lại." },
  { id: "ngoaiManHinh", ten: "Ngoài màn hình", moTa: "Chuyện giữa các nhân vật AI với nhau; người chơi chỉ biết nếu được kể lại." },
];

export const MUC = [
  { id: "an", ten: "Ẩn", moTa: "Chưa ai ngoài người trong cuộc biết." },
  { id: "heLo", ten: "Hé lộ một phần", moTa: "Có dấu hiệu lộ ra, nhưng chưa thành sự thật ai cũng biết." },
  { id: "daLo", ten: "Đã lộ", moTa: "Người chơi đã biết." },
];

export const TT_PHIEN = [
  { id: "dangXuLy", ten: "Đang xử lý" },
  { id: "xong", ten: "Đã xử lý" },
  { id: "thuLai", ten: "Cần thử lại" },
  { id: "boQua", ten: "Đã bỏ qua" },
];

export function nhan(list, id, macDinh = "") {
  const x = (list || []).find((v) => v.id === id);
  return x ? x.ten : macDinh;
}
export const nhanCheDo = (id) => nhan(CHE_DO, id, "Tạm dừng");
export const nhanLoai = (id) => nhan(LOAI, id, "Ngoài màn hình");
export const nhanMuc = (id) => nhan(MUC, id, "Ẩn");
export const nhanPhien = (id) => nhan(TT_PHIEN, id, "");
export const moTaLoai = (id) => ((LOAI.find((v) => v.id === id) || {}).moTa || "");

function ma(tien) {
  return tien + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function maSuKien() {
  return ma("vg");
}
export function maPhien() {
  return ma("vgp");
}

function so(v, macDinh) {
  const n = Number(v);
  return isFinite(n) ? n : macDinh;
}
function cat(s, n) {
  const t = String(s === undefined || s === null ? "" : s).trim();
  return t.length > n ? t.slice(0, n) : t;
}
function laIdNv(story, id) {
  return id === ID_NGUOI || (story && Array.isArray(story.nhanVats) && story.nhanVats.some((c) => c.id === id));
}
function locIdNv(story, arr, choNguoi) {
  const ra = [];
  for (const id of Array.isArray(arr) ? arr : []) {
    if (typeof id !== "string" || !id) continue;
    if (id === ID_NGUOI && !choNguoi) continue;
    if (!laIdNv(story, id)) continue;
    if (ra.indexOf(id) < 0) ra.push(id);
  }
  return ra;
}

// ------------------------------------------------------------------ thời gian theo truyện
export function thoiGianMacDinh() {
  return {
    cheDo: "tamDung",
    nguongPhut: NGUONG_MAC_DINH,
    chuDong: true,
    hoatDongLuc: 0, // mốc hoạt động / rời app gần nhất (ms)
    daXuLyLuc: 0, // mốc kết thúc của phiên vắng mặt đã xử lý gần nhất
    phien: null, // phiên đang xử lý / cần thử lại / vừa xong
  };
}

export function chuanHoaPhien(raw) {
  const d = raw && typeof raw === "object" ? raw : null;
  if (!d) return null;
  const trangThai = TT_PHIEN.some((x) => x.id === d.trangThai) ? d.trangThai : "thuLai";
  const batDau = Math.max(0, so(d.batDau, 0));
  const ketThuc = Math.max(batDau, so(d.ketThuc, batDau));
  return {
    id: String(d.id || maPhien()),
    batDau,
    ketThuc,
    phut: Math.max(0, Math.round(so(d.phut, Math.round((ketThuc - batDau) / 60000)))),
    cheDo: CHE_DO.some((x) => x.id === d.cheDo) ? d.cheDo : "tamDung",
    trangThai,
    soSuKien: Math.max(0, Math.round(so(d.soSuKien, 0))),
    luc: Math.max(0, so(d.luc, 0)),
    loiNhan: cat(d.loiNhan, 200),
  };
}

// Thiếu trường nào thì bù mặc định trường đó; KHÔNG bao giờ xoá cờ người dùng đã bật.
export function chuanHoaThoiGian(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    cheDo: CHE_DO.some((x) => x.id === d.cheDo) ? d.cheDo : "tamDung",
    nguongPhut: Math.max(0, Math.round(so(d.nguongPhut, NGUONG_MAC_DINH))),
    chuDong: d.chuDong !== false,
    hoatDongLuc: Math.max(0, so(d.hoatDongLuc, 0)),
    daXuLyLuc: Math.max(0, so(d.daXuLyLuc, 0)),
    phien: chuanHoaPhien(d.phien),
  };
}

// Bù mặc định cho bản lưu cũ / file nhập thiếu (giống `daoDienOf`).
export function thoiGianOf(story) {
  if (!story) return thoiGianMacDinh();
  if (!story.thoiGian || typeof story.thoiGian !== "object") story.thoiGian = thoiGianMacDinh();
  const t = story.thoiGian;
  if (!CHE_DO.some((x) => x.id === t.cheDo)) t.cheDo = "tamDung";
  if (!(Number(t.nguongPhut) >= 0)) t.nguongPhut = NGUONG_MAC_DINH;
  t.nguongPhut = Math.round(Number(t.nguongPhut));
  t.chuDong = t.chuDong !== false;
  t.hoatDongLuc = Math.max(0, so(t.hoatDongLuc, 0));
  t.daXuLyLuc = Math.max(0, so(t.daXuLyLuc, 0));
  if (t.phien && typeof t.phien !== "object") t.phien = null;
  // Chuẩn hoá TẠI CHỖ (giữ nguyên danh tính đối tượng): app.js cầm tham chiếu tới
  // `tg.phien` qua nhiều bước async, nếu mỗi lần gọi lại tạo đối tượng mới thì các
  // thay đổi ghi vào tham chiếu cũ sẽ biến mất.
  if (t.phien) {
    const ch = chuanHoaPhien(t.phien);
    for (const k in ch) t.phien[k] = ch[k];
  }
  return t;
}

// ------------------------------------------------------------------ sự kiện ngoài màn hình
export function newSuKien(data = {}) {
  return Object.assign(
    {
      id: maSuKien(),
      luc: Date.now(), // thời điểm MÔ PHỎNG (nằm trong khoảng vắng mặt)
      loai: "ngoaiManHinh",
      hinhThuc: "",
      noiDung: "",
      thamGia: [],
      biet: [],
      muc: "an",
      heLo: [],
      phatHien: "",
      htId: "",
      tnIds: [],
      anhHuong: { quanHe: [], noiTam: [] },
      phienId: "",
      phutVangMat: 0, // độ dài khoảng vắng mặt đã sinh ra sự kiện (phút)
      cheDoVangMat: "tamDung", // chế độ thời gian lúc đó — divider chỉ ghi thời lượng ở chế độ "thời gian thật"
      suaLuc: Date.now(),
    },
    data
  );
}

function chuanHoaAnhHuong(raw, story) {
  const d = raw && typeof raw === "object" ? raw : {};
  const quanHe = (Array.isArray(d.quanHe) ? d.quanHe : [])
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      tu: laIdNv(story, x.tu) ? x.tu : "",
      den: laIdNv(story, x.den) ? x.den : "",
      chieu: x.chieu === "chuaNoi" ? "chuaNoi" : (CHIEU.some((c) => c.id === x.chieu) ? x.chieu : ""),
      huong: Number(x.huong) < 0 ? -1 : 1,
      buoc: Math.max(1, Math.abs(Number(x.buoc)) || 1),
      moi: cat(x.moi, 240),
      lyDo: cat(x.lyDo, 200),
    }))
    .filter((x) => x.tu && x.den && x.tu !== ID_NGUOI && x.chieu && (x.chieu !== "chuaNoi" || x.moi));
  const noiTam = (Array.isArray(d.noiTam) ? d.noiTam : [])
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      nvId: laIdNv(story, x.nvId) && x.nvId !== ID_NGUOI ? x.nvId : "",
      truong: TRUONG.some((t) => t.id === x.truong) ? x.truong : "",
      moi: cat(x.moi, 240),
      lyDo: cat(x.lyDo, 200),
    }))
    .filter((x) => x.nvId && x.truong && x.moi);
  return { quanHe, noiTam };
}

// ------------------------------------------------------------------ sổ hé lộ
// Một lần "hé lộ" = một sự kiện đang ẩn được kể/lộ ra NGAY TRONG một tin nhắn. Ta lưu
// NGUỒN của lần hé lộ (hội thoại + tin nhắn + người kể), vì đó là thứ duy nhất còn kiểm
// chứng được về sau: nội dung tin nhắn đã bị cắt dấu hiệu, còn tin nhắn thì có thể bị
// xoá, bị cắt khỏi lịch sử, bị bỏ lại phía sau điểm rẽ của một nhánh, hoặc bị xoá cùng
// cả hội thoại.
export function chuanHoaHeLo(raw, story) {
  return (Array.isArray(raw) ? raw : [])
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      htId: String(x.htId || ""),
      tnId: String(x.tnId || ""),
      nvId: laIdNv(story, x.nvId) && x.nvId !== ID_NGUOI ? x.nvId : "",
      luc: Math.max(0, so(x.luc, 0)),
    }))
    .filter((x) => x.htId && x.tnId);
}

// Một lần hé lộ còn hiệu lực = tin nhắn nguồn CÒN nằm trong hội thoại đó. Hội thoại
// KHÔNG có trong `msgsByHt` là hội thoại chưa được nạp — thiếu dữ liệu không phải là
// mất, nên vẫn tính. Chỉ khi biết chắc tin nhắn đã biến mất (hội thoại có trong bản đồ
// mà không còn tin nhắn đó) thì lần hé lộ mới hết hiệu lực.
function conTinNhan(msgsByHt, r) {
  if (!Object.prototype.hasOwnProperty.call(msgsByHt, r.htId)) return true;
  const arr = msgsByHt[r.htId] || [];
  return arr.some((m) => m && m.id === r.tnId);
}
function heLoCon(e, msgsByHt) {
  const ds = Array.isArray(e.heLo) ? e.heLo : [];
  if (!ds.length) return ds;
  return ds.filter((r) => conTinNhan(msgsByHt, r));
}

// ---------------------------------------------------------------- sổ hé lộ theo nhánh
// Sự kiện TOÀN TRUYỆN (`htId === ""`) chỉ có MỘT bản chuẩn trong sổ của truyện: mọi
// nhánh dùng chung bản đó. Nếu mỗi nhánh sao chép nó thành một sự kiện thứ hai thì
// cùng một tác động bị áp hai lần (xem `tinhTrangThai` — nó cộng dồn `anhHuong`).
//
// Cái mỗi nhánh cần là lớp HÉ LỘ riêng: chuyện đã lộ ở nhánh này không lộ sang nhánh
// khác, và nhánh sinh ra TRƯỚC một lần hé lộ thì không thừa hưởng lần hé lộ đó. Lớp đó
// nằm ngay trên hội thoại nhánh: `conv.vgHeLo = [{ vgId, htId, tnId, nvId, luc }]`,
// tự-đủ (được vật chất hoá lúc tách nhánh từ sổ hiệu lực của hội thoại cha).
export function laNhanh(conv) {
  return !!(conv && conv.vgMocLuc !== undefined && conv.vgMocLuc !== null);
}

export function chuanHoaVgHeLo(raw, story) {
  const ds = Array.isArray(raw) ? raw : [];
  return ds
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      vgId: String(x.vgId || ""),
      htId: String(x.htId || ""),
      tnId: String(x.tnId || ""),
      nvId: laIdNv(story, x.nvId) && x.nvId !== ID_NGUOI ? x.nvId : "",
      luc: Math.max(0, so(x.luc, 0)),
    }))
    .filter((x) => x.vgId && x.htId && x.tnId);
}

// Sổ hé lộ HIỆU LỰC cho một sự kiện, trong ngữ cảnh một hội thoại.
//   • sự kiện gắn hội thoại: sổ của chính nó (`heLo` — bản sao ở nhánh đã được dịch ID);
//   • sự kiện toàn truyện: ở nhánh thì dùng lớp riêng (`conv.vgHeLo`), ở mạch chính thì
//     dùng sổ chuẩn của truyện (`e.heLo`).
export function nguonHieuLuc(story, conv, e) {
  if (!e) return [];
  if (e.htId) return e.heLo || [];
  const rieng = conv && Array.isArray(conv.vgHeLo) ? conv.vgHeLo.filter((r) => r.vgId === e.id) : [];
  return laNhanh(conv) ? rieng : (e.heLo || []);
}

// Mức hiệu lực của một sự kiện trong ngữ cảnh hội thoại `conv` ("" = mạch chính).
export function mucTrong(story, conv, e) {
  const goc = MUC.some((x) => x.id === e.mucGoc) ? e.mucGoc : "an";
  return (nguonHieuLuc(story, conv, e) || []).length ? "daLo" : goc;
}

export function bietTrong(story, conv, e) {
  const biet = (e.biet || []).filter((id) => id !== ID_NGUOI);
  if (mucTrong(story, conv, e) === "daLo") biet.push(ID_NGUOI);
  return biet;
}

// Tính LẠI mức hé lộ và danh sách "ai biết" cho mọi sự kiện từ mức gốc + các lần hé lộ
// còn hiệu lực. Gọi sau mỗi thao tác đụng vào lịch sử (xoá tin nhắn, cắt, xoá hội thoại,
// tạo nhánh, nhập truyện). Trả về true nếu có gì đó thay đổi.
export function tinhLaiBiet(story, msgsByHt) {
  if (!story) return false;
  const map = msgsByHt && typeof msgsByHt === "object" ? msgsByHt : null;
  let doi = false;
  // Sổ hé lộ riêng của từng nhánh: chỉ dọn nguồn đã chết, KHÔNG gộp vào sự kiện chuẩn
  // (gộp là biến lớp riêng của nhánh thành chuyện toàn truyện).
  for (const conv of story.hoiThoais || []) {
    if (!conv || !Array.isArray(conv.vgHeLo) || !conv.vgHeLo.length) continue;
    const truoc = conv.vgHeLo.length;
    const con = conv.vgHeLo.filter((r) => (r && r.vgId && r.tnId && (!map || conTinNhan(map, r))));
    if (con.length !== truoc) {
      conv.vgHeLo = con;
      doi = true;
    }
  }
  for (const e of suKienCua(story)) {
    const goc = MUC.some((x) => x.id === e.mucGoc) ? e.mucGoc : "an";
    if (map) {
      const con = heLoCon(e, map);
      if (con.length !== (e.heLo || []).length) {
        e.heLo = con;
        doi = true;
      }
    }
    const muc = (e.heLo || []).length ? "daLo" : goc;
    const biet = (e.biet || []).filter((id) => id !== ID_NGUOI);
    if (muc === "daLo") biet.push(ID_NGUOI);
    const khac = muc !== e.muc || biet.length !== (e.biet || []).length || biet.some((x, i) => x !== e.biet[i]);
    if (khac) {
      e.muc = muc;
      e.biet = biet;
      e.suaLuc = Math.max(Number(e.suaLuc) || 0, Date.now());
      doi = true;
    }
  }
  return doi;
}

export function chuanHoaSuKien(raw, story) {
  const d = raw && typeof raw === "object" ? raw : {};
  const mucRaw = MUC.some((x) => x.id === d.muc) ? d.muc : "an";
  const htCoThat = (story && Array.isArray(story.hoiThoais) ? story.hoiThoais : []).some((c) => c.id === d.htId);
  // Hai lớp của mức hé lộ:
  //   • `mucGoc` — mức GỐC, do kế hoạch AI đặt hoặc do bạn chỉnh tay trong Đạo diễn;
  //   • `heLo`   — các lần sự kiện được kể/lộ ra trong văn bản, kèm NGUỒN (hội thoại +
  //                  tin nhắn + người kể) để tính lại được khi lịch sử đổi.
  // Mức hiệu lực = "đã lộ" nếu còn ít nhất một lần hé lộ, ngược lại là mức gốc.
  const mucGoc = MUC.some((x) => x.id === d.mucGoc) ? d.mucGoc : mucRaw;
  const heLo = chuanHoaHeLo(d.heLo, story);
  const muc = heLo.length ? "daLo" : mucGoc;
  // "Ai biết" cũng vậy: danh sách gốc là những gì kế hoạch nói, còn người chơi chỉ được
  // thêm vào khi sự kiện đã lộ. (Mức hiển thị và "ai biết" luôn phải khớp nhau.)
  const biet = locIdNv(story, d.biet, true).filter((id) => id !== ID_NGUOI);
  if (muc === "daLo") biet.push(ID_NGUOI);
  return {
    id: String(d.id || maSuKien()),
    luc: Math.max(0, so(d.luc, Date.now())),
    loai: LOAI.some((x) => x.id === d.loai) ? d.loai : "ngoaiManHinh",
    hinhThuc: cat(d.hinhThuc, 80),
    noiDung: cat(d.noiDung, 600),
    thamGia: locIdNv(story, d.thamGia, false),
    biet,
    muc,
    mucGoc,
    heLo,
    phatHien: cat(d.phatHien, 300),
    htId: htCoThat ? d.htId : "",
    tnIds: (Array.isArray(d.tnIds) ? d.tnIds : []).filter((x) => typeof x === "string" && x),
    anhHuong: chuanHoaAnhHuong(d.anhHuong, story),
    phienId: String(d.phienId || ""),
    phutVangMat: Math.max(0, Math.round(so(d.phutVangMat, 0))),
    cheDoVangMat: CHE_DO.some((x) => x.id === d.cheDoVangMat) ? d.cheDoVangMat : "tamDung",
    suaLuc: Math.max(0, so(d.suaLuc, Date.now())),
  };
}

export function suKienCua(story) {
  if (!story) return [];
  if (!Array.isArray(story.ngoaiManHinh)) story.ngoaiManHinh = [];
  story.ngoaiManHinh = story.ngoaiManHinh.filter(Boolean).map((e) => chuanHoaSuKien(e, story));
  return story.ngoaiManHinh;
}

export function suKienTheoId(story) {
  const ra = {};
  for (const e of suKienCua(story)) ra[e.id] = e;
  return ra;
}

// Mã ngắn để nói chuyện với AI (S1, S2, …) — ánh xạ ổn định theo đúng thứ tự trong sổ,
// nhờ vậy prompt và tín hiệu hé lộ nói cùng một ngôn ngữ.
export function maNgan(story, id) {
  const i = suKienCua(story).findIndex((e) => e.id === id);
  return i >= 0 ? "S" + (i + 1) : "";
}

export function suKienTheoMaNgan(story) {
  const ra = {};
  suKienCua(story).forEach((e, i) => { ra["S" + (i + 1)] = e.id; });
  return ra;
}

// Sự kiện mà một trong các nhân vật `ids` biết (để đưa vào prompt của đúng người biết).
// `conv` (tuỳ chọn) cho biết đang kể trong ngữ cảnh hội thoại nào — sự kiện toàn truyện
// ở một nhánh có thể đã/ chưa lộ khác với mạch chính.
export function suKienBiet(story, ids, conv) {
  const co = Array.isArray(ids) ? ids : [];
  if (!co.length) return [];
  return suKienCua(story)
    .filter((e) => bietTrong(story, conv || null, e).some((id) => co.indexOf(id) >= 0))
    .slice(-8);
}

// Những điều ĐANG ẨN với người chơi nhưng có nhân vật trong cảnh biết — AI phải giữ kín
// và chỉ được để lộ qua dấu hiệu.
export function suKienAnVoiNguoiChoi(story, ids, conv) {
  return suKienBiet(story, ids, conv).filter((e) => mucTrong(story, conv || null, e) !== "daLo");
}

// ------------------------------------------------------------------ thời lượng
export function khoangText(phut) {
  const p = Math.max(0, Math.round(Number(phut) || 0));
  if (p < 1) return "vài giây";
  if (p < 60) return p + " phút";
  const h = Math.floor(p / 60);
  const m = p % 60;
  if (h < 24) return h + " giờ" + (m ? " " + m + " phút" : "");
  const ng = Math.floor(h / 24);
  const h2 = h % 24;
  return ng + " ngày" + (h2 ? " " + h2 + " giờ" : "");
}

// ------------------------------------------------------------------ cảnh đang dang dở
// Nhân vật đang có mặt trong cảnh (bản sao nhỏ của `hienDienCua` ở store.js, để file này
// không phải import store — tránh vòng import).
export function coMatCua(story, conv) {
  if (!story || !conv) return [];
  const ds = Array.isArray(conv.hienDien) ? conv.hienDien : (conv.nhanVatIds || []);
  return (story.nhanVats || []).filter((c) => ds.indexOf(c.id) >= 0);
}

// Một cảnh đang MỞ = còn tin nhắn chưa được Khép cảnh (kể từ cảnh đã khép gần nhất của
// hội thoại đó), hoặc đang mở một cảnh riêng. Đây là điều kiện chặn mọi mô phỏng vắng
// mặt: không được để thời gian trôi vượt qua một mạch cảm xúc còn dang dở.
export function canhDangMo(story, msgsByHt) {
  const map = msgsByHt && typeof msgsByHt === "object" ? msgsByHt : {};
  for (const conv of story.hoiThoais || []) {
    if (!conv) continue;
    const msgs = map[conv.id] || [];
    if (conv.canhRieng && conv.canhRieng.nvId) return { conv, soTin: msgs.length, vi: "canhRieng" };
    const cuoi = canhCuoi(story, conv);
    let tu = Math.max(0, Number(conv.khepGoc) || 0);
    if (cuoi) {
      const i = msgs.findIndex((m) => m && m.id === cuoi.denMsgId);
      if (i >= 0) tu = Math.max(tu, i + 1);
    }
    const con = msgs.slice(tu).filter((m) => m && String(m.noiDung || "").trim() !== "");
    if (con.length) return { conv, soTin: con.length, vi: "tinNhan" };
  }
  return null;
}

// ------------------------------------------------------------------ điều kiện mô phỏng
// Trả về { ok, lyDo, ... }. `lyDo` dùng để chọn thông báo phù hợp (không phải lỗi).
export function xetDieuKien(story, bayGio, msgsByHt, mocBatDau) {
  const tg = thoiGianOf(story);
  const nay = Number(bayGio) || Date.now();
  if (tg.phien && tg.phien.trangThai === "dangXuLy") return { ok: false, lyDo: "dangChay" };
  if (tg.cheDo === "tamDung") return { ok: false, lyDo: "tamDung" };
  if (!(tg.nguongPhut > 0)) return { ok: false, lyDo: "tatNguong" };
  // `mocBatDau` cho phép app truyền mốc rời app ĐÃ CHỤP trước khi ghi đè `hoatDongLuc` —
  // nếu không truyền thì lấy mốc đang lưu.
  const batDau = Number(mocBatDau) || Number(tg.hoatDongLuc) || 0;
  if (!batDau) return { ok: false, lyDo: "chuaCoMoc" };
  if (Number(tg.daXuLyLuc) >= batDau) return { ok: false, lyDo: "daXuLy" };
  const phut = Math.max(0, Math.floor((nay - batDau) / 60000));
  if (phut < tg.nguongPhut) return { ok: false, lyDo: "duoiNguong", phut };
  const thua = canhDangMo(story, msgsByHt);
  if (thua) return { ok: false, lyDo: "canhDangMo", thua, phut };
  const coTin = Object.keys(msgsByHt || {}).some((k) => (msgsByHt[k] || []).length > 0);
  if (!coTin) return { ok: false, lyDo: "chuaBatDau", phut };
  if (tg.cheDo === "theoCanh" && !canhHopLe(story).length) return { ok: false, lyDo: "chuaCoCanh", phut };
  return {
    ok: true,
    cheDo: tg.cheDo,
    chuDong: tg.chuDong !== false,
    batDau,
    ketThuc: nay,
    phut,
    soToiDa: tg.cheDo === "theoCanh" ? 1 : TOI_DA_SU_KIEN,
  };
}

// ------------------------------------------------------------------ thẻ "Nhịp trước đó"
// Dựng từ dữ liệu đã có (trạng thái tính từ cảnh đã duyệt + tin nhắn gần nhất). KHÔNG
// gọi AI. Thẻ chỉ để người chơi bắt lại mạch, không được gửi lại cho AI như sự kiện mới.
export function nhipTruocDo(story, conv, msgs) {
  if (!story || !conv) return null;
  const coMat = coMatCua(story, conv);
  const tt = tinhTrangThai(story, conv);
  const tenNguoi = (story.nguoiChoi && story.nguoiChoi.ten) || "Bạn";
  const ds = (msgs || []).filter((m) => m && String(m.noiDung || "").trim() !== "");
  const cuoi = ds.length ? ds[ds.length - 1] : null;
  let tenCuoi = "";
  if (cuoi) {
    if (cuoi.vai === "nguoi") tenCuoi = tenNguoi;
    else {
      const ids = Array.isArray(cuoi.nvIds) && cuoi.nvIds.length ? cuoi.nvIds : (cuoi.nvId ? [cuoi.nvId] : []);
      tenCuoi = ids.map((id) => ((story.nhanVats.find((c) => c.id === id) || {}).ten || "")).filter(Boolean).join(" · ") || cuoi.ten || "Người kể chuyện";
    }
  }
  const camXuc = [];
  const choDo = [];
  for (const c of coMat) {
    const t = tt.nv[c.id] || {};
    if (t.camXuc) camXuc.push({ ten: c.ten, noiDung: t.camXuc });
    const cho = t.mucTieu || t.dongCo;
    if (cho) choDo.push({ ten: c.ten, noiDung: cho });
  }
  const canh = canhCuoi(story, conv);
  return {
    co: !!(cuoi || camXuc.length || choDo.length || coMat.length),
    viTri: cuoi ? { ten: tenCuoi, noiDung: cuoi.noiDung, luc: cuoi.luc, vai: cuoi.vai } : null,
    camXuc: camXuc.slice(0, 3),
    choDo: choDo.slice(0, 3),
    moc: canh ? String(canh.moc || "") : "",
    tomTatCanh: canh ? String(canh.tomTat || "") : "",
    hienDien: coMat.map((c) => c.ten),
  };
}
