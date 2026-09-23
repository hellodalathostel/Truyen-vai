// Truyện Vai — logic THUẦN của "Thư viện ngoại hình nhân vật".
//
// Đây là thư viện ngoại hình dùng chung cho nhiều truyện: mỗi hồ sơ là một con người
// với tên chính, tuổi do người dùng khai báo, mô tả ngoại hình, điều cần tránh khi
// tạo ảnh và (không bắt buộc) một ảnh tham chiếu. Thư viện KHÔNG thay thế tính cách,
// quan hệ, ký ức hay lorebook của truyện — nhân vật trong truyện chỉ LIÊN KẾT tới hồ
// sơ bằng `ngoaiHinhId` (ID ổn định, không dùng tên làm khoá), và có thể có `bietDanh`
// riêng cho từng truyện.
//
// File này KHÔNG import gì (giống trangThai.js / thoiGian.js) để tránh vòng import:
// lớp lưu trữ nằm ở store.js, phần gọi AI nằm ở ai.js, giao diện nằm ở app.js.

export const PHIEN_BAN_HO_SO = 1;

// Nhãn mở đầu khối ngoại hình ghép vào prompt tạo ảnh. Khối này LUÔN được ghép ở CUỐI
// prompt, nên tách lại chỉ cần cắt từ nhãn tới hết — nhờ vậy bật/tắt chip không xếp
// chồng khối, và sửa tay phần mô tả cảnh vẫn được giữ.
//
// Nhãn là TIẾNG ANH vì nó nằm chung một prompt với phần mô tả khung hình (cũng tiếng Anh) —
// máy vẽ đọc tiếng Anh tốt hơn hẳn. `MARK_NGOAI_HINH_CU` là nhãn tiếng Việt của những bản
// ghi ảnh đã lưu TRƯỚC khi đổi: `tachNgoaiHinh()` vẫn phải cắt được cả hai, nếu không khối
// ngoại hình cũ sẽ trôi ngược vào ô "Mô tả khung hình" khi mở lại ảnh đã lưu.
export const MARK_NGOAI_HINH =
  "[FIXED CHARACTER APPEARANCE — TRUYỆN VAI — keep each person's features exactly as written, never blend traits between characters]";
export const MARK_NGOAI_HINH_CU =
  "[NGOẠI HÌNH CỐ ĐỊNH — TRUYỆN VAI — giữ đúng từng người, không trộn đặc điểm giữa các nhân vật]";

// ------------------------------------------------------------------ người chơi
// NGƯỜI CHƠI cũng là một người trong khung hình, nhưng họ KHÔNG nằm trong
// `story.nhanVats` — họ là `story.nguoiChoi` (không có id riêng, không có biệt danh).
// Vì vậy chỗ nào nhận một "nhân vật" thì ở đây bọc người chơi thành một đối tượng
// tương đương, dùng đúng id quy ước của lớp trạng thái (`trangThai.js`: ID_NGUOI =
// "nguoi") để mọi nơi trong app nói về cùng một người. Liên kết của người chơi nằm ở
// `story.nguoiChoi.ngoaiHinhId`, cùng luật với nhân vật: ID ổn định, không tự liên kết
// theo tên, và không có liên kết thì không ghép ngoại hình nào.
export const ID_NGUOI_CHOI = "nguoi";

export function laNguoiChoi(id) {
  return id === ID_NGUOI_CHOI;
}

// Người chơi ở dạng "một nhân vật" để dùng lại mọi hàm vốn nhận nhân vật.
export function nguoiChoiNhuNhanVat(story) {
  const nc = (story && story.nguoiChoi) || {};
  return {
    id: ID_NGUOI_CHOI,
    ten: String(nc.ten || "Bạn"),
    bietDanh: "",
    ngoaiHinhId: typeof nc.ngoaiHinhId === "string" ? nc.ngoaiHinhId : "",
    laNguoiChoi: true,
  };
}

// Hồ sơ mà NGƯỜI CHƠI đang liên kết (null nếu chưa liên kết / hồ sơ đã biến mất).
export function hoSoNguoiChoi(story, dsHoSo) {
  const id = nguoiChoiNhuNhanVat(story).ngoaiHinhId;
  return id ? hoSoTheoId(dsHoSo)[id] || null : null;
}

// ------------------------------------------------------------------ hồ sơ
export function chuanHoaHoSo(raw) {
  const h = Object.assign({}, raw || {});
  h.tenChinh = String(h.tenChinh === undefined || h.tenChinh === null ? "" : h.tenChinh).trim();
  h.tuoi =
    h.tuoi === undefined || h.tuoi === null || h.tuoi === ""
      ? ""
      : String(h.tuoi).trim();
  h.moTa = String(h.moTa === undefined || h.moTa === null ? "" : h.moTa).trim();
  h.tranh = String(h.tranh === undefined || h.tranh === null ? "" : h.tranh).trim();
  // Bản TIẾNG ANH của mô tả (dữ liệu dẫn xuất — xem `canDichNgoaiHinh`). Chỉ dùng cho
  // prompt tạo ảnh; thư viện vẫn hiển thị bản người dùng gõ.
  h.moTaEn = String(h.moTaEn === undefined || h.moTaEn === null ? "" : h.moTaEn).trim();
  h.tranhEn = String(h.tranhEn === undefined || h.tranhEn === null ? "" : h.tranhEn).trim();
  h.anh = typeof h.anh === "string" ? h.anh.trim() : "";
  h.luc = Number(h.luc) || 0;
  h.suaLuc = Number(h.suaLuc) || 0;
  h.phienBan = PHIEN_BAN_HO_SO;
  return h;
}

// Các tên có thể dùng để nhận diện một nhân vật trong prompt: tên chính của hồ sơ
// (khi đã liên kết), tên nhân vật trong truyện, và biệt danh riêng của truyện đó.
export function tenUngVien(c, hoSo) {
  const ds = [];
  const them = (s) => {
    const t = String(s === undefined || s === null ? "" : s).trim();
    if (t.length < 2) return;
    if (ds.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    ds.push(t);
  };
  if (hoSo && hoSo.tenChinh) them(hoSo.tenChinh);
  if (c) {
    // Nhân vật có hồ sơ vẫn dùng tên nhân vật của truyện làm một cách gọi khác — người
    // dùng thường gõ đúng tên đang thấy trong chat.
    them(c.ten);
    them(c.bietDanh);
  }
  return ds;
}

// Danh sách ứng viên cho một hội thoại: chỉ những nhân vật CỦA HỘI THOẠI đã liên kết
// hồ sơ. Nhân vật chưa liên kết không có ngoại hình để ghép nên không thành ứng viên.
// NGƯỜI CHƠI là ngoại lệ: họ luôn có mặt trong mọi cảnh (không phụ thuộc
// `conv.nhanVatIds`), nên chỉ cần có hồ sơ là thành ứng viên — xếp CUỐI danh sách để
// khối ngoại hình đọc theo thứ tự nhân vật → người chơi.
export function ungVienNgoaiHinh(story, conv, dsHoSo) {
  const map = hoSoTheoId(dsHoSo);
  const ids = (conv && conv.nhanVatIds) || [];
  const out = [];
  for (const c of (story && story.nhanVats) || []) {
    if (ids.indexOf(c.id) < 0) continue;
    const hoSo = c.ngoaiHinhId ? map[c.ngoaiHinhId] : null;
    if (!hoSo) continue;
    out.push({ nvId: c.id, hoSoId: hoSo.id, ten: tenUngVien(c, hoSo) });
  }
  const nc = nguoiChoiNhuNhanVat(story);
  const hoSoNc = nc.ngoaiHinhId ? map[nc.ngoaiHinhId] : null;
  if (hoSoNc) out.push({ nvId: ID_NGUOI_CHOI, hoSoId: hoSoNc.id, ten: tenUngVien(nc, hoSoNc), laNguoiChoi: true });
  return out;
}

export function hoSoTheoId(dsHoSo) {
  const map = Object.create(null);
  for (const h of Array.isArray(dsHoSo) ? dsHoSo : []) if (h && h.id) map[h.id] = h;
  return map;
}

// Biên từ theo ký tự chữ/số Unicode (không dùng lookbehind để chạy được cả Safari cũ).
function reTen(s) {
  const esc = String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + esc + "($|[^\\p{L}\\p{N}])", "iu");
}

// Nhận diện hồ sơ được nhắc tới trong prompt. Chỉ TỰ CHỌN những tên chỉ ứng với MỘT
// hồ sơ; tên trùng nhiều người bị coi là mơ hồ và trả về ở `trung` để người dùng tự
// chọn qua chip — không tự đoán.
export function nhanDienNgoaiHinh(text, dsUngVien) {
  const t = String(text || "");
  const ra = { chon: [], trung: [] };
  if (!t.trim()) return ra;
  const theo = Object.create(null); // tên (thường hoá) → Set(hồ sơ id)
  const hienThi = Object.create(null);
  for (const u of Array.isArray(dsUngVien) ? dsUngVien : []) {
    if (!u || !u.hoSoId) continue;
    for (const ten of u.ten || []) {
      const k = ten.toLowerCase();
      if (!theo[k]) {
        theo[k] = new Set();
        hienThi[k] = ten;
      }
      theo[k].add(u.hoSoId);
    }
  }
  const chon = new Set();
  const trung = [];
  for (const k in theo) {
    if (!reTen(hienThi[k]).test(t)) continue;
    const ids = Array.from(theo[k]);
    if (ids.length === 1) chon.add(ids[0]);
    else trung.push({ ten: hienThi[k], ids });
  }
  ra.chon = Array.from(chon);
  ra.trung = trung;
  return ra;
}

// Tên hiển thị của hồ sơ khi ghép vào prompt ảnh.
export function tenHoSo(h) {
  return (h && h.tenChinh) || "nhân vật";
}

// Ngoại hình dùng trong PROMPT ẢNH: bản tiếng Anh nếu đã có, không thì tạm dùng bản người
// dùng gõ (app tự dịch khi cần — xem `canDichNgoaiHinh`). Thư viện/hồ sơ vẫn hiển thị bản
// gốc; chỉ prompt ảnh đi qua hai hàm này.
export function ngoaiHinhEn(h) {
  const en = h && String(h.moTaEn || "").trim();
  return en || String((h && h.moTa) || "");
}

export function tranhEn(h) {
  const en = h && String(h.tranhEn || "").trim();
  return en || String((h && h.tranh) || "");
}

// Khối ngoại hình cố định: mỗi nhân vật MỘT dòng riêng, gắn tên với ngoại hình và
// điều cần tránh. Trang phục/hành động KHÔNG nằm ở đây — chúng thuộc cảnh hiện tại
// hoặc yêu cầu tạo ảnh, do phần mô tả cảnh của AI viết.
// Khối là TIẾNG ANH (nhãn + từ nối) để khớp với phần mô tả khung hình; phần chữ bên trong
// lấy từ bản dịch của hồ sơ, chưa dịch thì rơi về bản gốc.
export function khoiNgoaiHinh(dsHoSo) {
  const ds = (Array.isArray(dsHoSo) ? dsHoSo : []).filter((h) => h && (ngoaiHinhEn(h) || tranhEn(h)));
  if (!ds.length) return "";
  const dong = ds.map((h) => {
    const phan = [];
    phan.push(ngoaiHinhEn(h) || "(no appearance description)");
    const tr = tranhEn(h).trim();
    if (tr) phan.push("avoid: " + tr);
    return "- " + tenHoSo(h) + (h.tuoi ? " (age " + h.tuoi + ")" : "") + ": " + phan.join(" | ");
  });
  return MARK_NGOAI_HINH + "\n" + dong.join("\n");
}

// Cắt khối ngoại hình đã ghép (nếu có) để lấy lại đúng phần mô tả cảnh. Phải nhận CẢ nhãn
// tiếng Việt cũ: ảnh đã lưu từ trước chứa khối đó, và cắt hụt nghĩa là khối trôi ngược vào
// ô "Mô tả khung hình".
export function tachNgoaiHinh(text) {
  const t = String(text || "");
  let i = -1;
  for (const nhan of [MARK_NGOAI_HINH, MARK_NGOAI_HINH_CU]) {
    const p = t.indexOf(nhan);
    if (p >= 0 && (i < 0 || p < i)) i = p;
  }
  return (i >= 0 ? t.slice(0, i) : t).replace(/\s+$/, "");
}

// Prompt cuối = phần mô tả cảnh + khối ngoại hình cố định. Luôn tách khối cũ trước
// khi ghép nên gọi nhiều lần vẫn cho đúng một khối.
export function ghepPromptNgoaiHinh(base, dsHoSo) {
  const goc = tachNgoaiHinh(base).replace(/^\s+/, "");
  const khoi = khoiNgoaiHinh(dsHoSo);
  if (!khoi) return goc;
  return (goc ? goc + "\n\n" : "") + khoi;
}

// Gộp "điều cần tránh" của những hồ sơ đang chọn vào prompt loại trừ (bản tiếng Anh nếu có
// — prompt loại trừ cũng là tiếng Anh).
export function gopLoaiTruNgoaiHinh(base, dsHoSo) {
  const ds = (Array.isArray(dsHoSo) ? dsHoSo : [])
    .map((h) => (h ? tranhEn(h).trim() : ""))
    .filter(Boolean);
  const b = String(base || "").trim().replace(/[,\s]+$/, "");
  if (!ds.length) return b;
  return (b ? b + ", " : "") + ds.join(", ");
}

// ------------------------------------------------------- bản dịch tiếng Anh (dẫn xuất)
// Mô tả ngoại hình do người dùng gõ bằng tiếng Việt, còn prompt tạo ảnh là tiếng Anh. Bản
// dịch được sinh MỘT LẦN rồi lưu lại trong hồ sơ (`moTaEn`/`tranhEn`) — nếu để model tả lại
// ngoại hình ở mỗi lần dựng ảnh thì "ngoại hình cố định" sẽ trôi giữa các khung hình.
// Dấu tiếng Việt là cách nhận biết rẻ tiền và đủ dùng: chữ đã là tiếng Anh (hoặc chỉ có
// số/ký hiệu) thì bỏ qua, không tốn một lượt gọi AI.
const RE_DAU_VIET = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

export function coDauTiengViet(s) {
  return RE_DAU_VIET.test(String(s || ""));
}

// Hồ sơ này còn phần chữ CHƯA có bản tiếng Anh ⇒ cần một lượt dịch.
export function canDichNgoaiHinh(h) {
  if (!h || !h.id) return false;
  const thieuMoTa = coDauTiengViet(h.moTa) && !String(h.moTaEn || "").trim();
  const thieuTranh = coDauTiengViet(h.tranh) && !String(h.tranhEn || "").trim();
  return thieuMoTa || thieuTranh;
}

// Lưu hồ sơ mà phần ngoại hình đã đổi ⇒ bản dịch cũ không còn đúng nữa, phải bỏ đi để lần
// dựng ảnh sau dịch lại. (So sánh nguồn là cách duy nhất để biết bản dịch còn khớp không.)
export function boBanDichCu(cu, moi) {
  const ra = Object.assign({}, moi);
  if (String((cu && cu.moTa) || "") !== String((moi && moi.moTa) || "")) ra.moTaEn = "";
  if (String((cu && cu.tranh) || "") !== String((moi && moi.tranh) || "")) ra.tranhEn = "";
  return ra;
}

// ------------------------------------------------------------------ liên kết & xuất/nhập
// Đếm MỌI nơi một hồ sơ được liên kết: nhân vật trong truyện VÀ người chơi
// (`story.nguoiChoi.ngoaiHinhId`). Bỏ sót người chơi thì người dùng có thể xoá hồ sơ
// đang dùng chỉ vì chưa liên kết nó cho nhân vật nào.
export function demLienKetNgoaiHinh(stories, id) {
  let n = 0;
  if (!id) return 0;
  for (const s of Array.isArray(stories) ? stories : []) {
    for (const c of (s && s.nhanVats) || []) if (c && c.ngoaiHinhId === id) n++;
    if (s && s.nguoiChoi && s.nguoiChoi.ngoaiHinhId === id) n++;
  }
  return n;
}

// Mọi nơi đang TRÔNG CẬY vào một hồ sơ: nhân vật liên kết, NGƯỜI CHƠI liên kết, và ảnh
// cảnh đã dựng (`anh[].hoSoIds`). Cửa chặn xoá phải đếm CẢ BA: chỉ đếm nhân vật thì
// người dùng chỉ cần gỡ liên kết ở nhân vật là xoá được hồ sơ, để lại những bản ghi ảnh
// trỏ tới một ID không còn tồn tại — và `hoSoCuaTruyen`/xuất riêng truyện sẽ lặng lẽ bỏ
// qua chúng.
export function demDungNgoaiHinh(stories, id) {
  const ra = { nhanVat: 0, nguoiChoi: 0, anh: 0 };
  if (!id) return ra;
  for (const s of Array.isArray(stories) ? stories : []) {
    for (const c of (s && s.nhanVats) || []) if (c && c.ngoaiHinhId === id) ra.nhanVat++;
    if (s && s.nguoiChoi && s.nguoiChoi.ngoaiHinhId === id) ra.nguoiChoi++;
    for (const a of (s && s.anh) || []) {
      if (a && Array.isArray(a.hoSoIds) && a.hoSoIds.indexOf(id) >= 0) ra.anh++;
    }
  }
  return ra;
}

// Câu mô tả số nơi đang dùng một hồ sơ, dùng chung cho thẻ thư viện và cửa chặn xoá —
// để hai chỗ không bao giờ nói lệch nhau.
export function moTaNguoiDung(dung) {
  const d = dung || {};
  const phan = [];
  if (d.nhanVat) phan.push(d.nhanVat + " nhân vật");
  if (d.nguoiChoi) phan.push(d.nguoiChoi + " người chơi");
  if (d.anh) phan.push(d.anh + " ảnh cảnh");
  return phan.join(" · ");
}

// Những hồ sơ một truyện THAM CHIẾU (qua nhân vật và qua ảnh cảnh đã dựng). Dùng cho
// "xuất riêng một truyện" để nhập sang nơi khác không mất liên kết.
// Bất biến của thư viện: mọi tham chiếu (`nhanVats[].ngoaiHinhId` và `anh[].hoSoIds`) phải
// trỏ tới một hồ sơ CÒN TỒN TẠI. Trả về danh sách tham chiếu mồ (rỗng = lành mạnh) — dùng
// cho kiểm thử và để phát hiện sớm nếu một đường nào đó xoá hồ sơ khi vẫn còn người dùng.
export function thamChieuMo(stories, dsHoSo) {
  const map = hoSoTheoId(dsHoSo);
  const ra = [];
  for (const s of Array.isArray(stories) ? stories : []) {
    for (const c of (s && s.nhanVats) || []) {
      if (c && c.ngoaiHinhId && !map[c.ngoaiHinhId]) ra.push({ truyen: s.id, loai: "nhanVat", id: c.id, hoSoId: c.ngoaiHinhId });
    }
    if (s && s.nguoiChoi && s.nguoiChoi.ngoaiHinhId && !map[s.nguoiChoi.ngoaiHinhId]) {
      ra.push({ truyen: s.id, loai: "nguoiChoi", id: ID_NGUOI_CHOI, hoSoId: s.nguoiChoi.ngoaiHinhId });
    }
    for (const a of (s && s.anh) || []) {
      for (const id of (a && Array.isArray(a.hoSoIds) ? a.hoSoIds : [])) {
        if (id && !map[id]) ra.push({ truyen: s.id, loai: "anh", id: a.id, hoSoId: id });
      }
    }
  }
  return ra;
}

export function hoSoCuaTruyen(story, dsHoSo) {
  const map = hoSoTheoId(dsHoSo);
  const ids = new Set();
  for (const c of (story && story.nhanVats) || []) if (c && c.ngoaiHinhId) ids.add(c.ngoaiHinhId);
  const ncId = nguoiChoiNhuNhanVat(story).ngoaiHinhId;
  if (ncId) ids.add(ncId);
  for (const a of (story && story.anh) || []) {
    for (const id of (a && Array.isArray(a.hoSoIds) ? a.hoSoIds : [])) if (id) ids.add(id);
  }
  return Array.from(ids)
    .map((id) => map[id])
    .filter(Boolean);
}
