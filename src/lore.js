// Truyện Vai — sổ tri thức (lorebook).
//
// Người dùng tải lên file JSON theo chuẩn World Info / SillyTavern (cũng nhận file
// thẻ nhân vật có `character_book`). Mỗi mục gồm một danh sách từ khoá và một đoạn
// nội dung; chỉ những mục có từ khoá xuất hiện trong cảnh đang diễn ra mới được gửi
// kèm cho AI — nên sổ dài bao nhiêu cũng không làm phình ngữ cảnh.
//
// Khối này nằm ở CUỐI prompt (ngay trước TASK) chứ không nằm trong tiền tố tĩnh:
// nó đổi theo từng lượt, còn tiền tố thì giữ nguyên nên vẫn tận dụng prefix cache.

import { CFG, uid } from "./store.js";

// ------------------------------------------------------------------ dữ liệu
function mang(x) {
  if (x === undefined || x === null) return [];
  const raw = Array.isArray(x) ? x : String(x).split(",");
  return raw.map((s) => String(s).trim()).filter((s) => s !== "");
}

function so(x, macDinh) {
  if (x === undefined || x === null || x === "") return macDinh;
  const n = Number(x);
  return isFinite(n) ? n : macDinh;
}

export function newLoreEntry(data = {}) {
  const e = Object.assign(
    {
      id: "",
      ghiChu: "",
      keys: [],
      keys2: [],
      noiDung: "",
      bat: true,
      hangSo: false, // luôn gửi, không cần từ khoá
      chonLoc: false, // phải khớp thêm một từ khoá phụ mới gửi
      thuTu: 100, // số nhỏ được xếp trước
      doSau: 0, // số tin nhắn gần nhất để dò (0 = dùng mặc định của truyện)
      phanBietHoa: false,
      khopTronTu: false,
      khongDeQuy: false, // không cho mục khác kéo mục này vào
    },
    data || {}
  );
  e.id = data && data.id ? String(data.id) : uid("lb");
  e.ghiChu = String(e.ghiChu || "").trim();
  e.noiDung = String(e.noiDung || "").trim();
  e.keys = mang(e.keys);
  e.keys2 = mang(e.keys2);
  e.bat = e.bat !== false;
  e.hangSo = e.hangSo === true;
  e.chonLoc = e.chonLoc === true;
  e.phanBietHoa = e.phanBietHoa === true;
  e.khopTronTu = e.khopTronTu === true;
  e.khongDeQuy = e.khongDeQuy === true;
  e.thuTu = so(e.thuTu, 100);
  e.doSau = so(e.doSau, 0);
  return e;
}

export function newLorebook(data = {}) {
  return {
    ten: String((data && data.ten) || ""),
    phienBan: Date.now(),
    entries: ((data && data.entries) || []).map((e) => newLoreEntry(e)),
  };
}

// Bù mặc định cho truyện tạo trước khi có sổ tri thức — không cần migrate.
export function loreCua(story) {
  if (!story) return newLorebook();
  if (!story.lorebook || typeof story.lorebook !== "object") story.lorebook = newLorebook();
  const lb = story.lorebook;
  if (!Array.isArray(lb.entries)) lb.entries = [];
  if (!lb.phienBan) lb.phienBan = Date.now();
  for (const e of lb.entries) {
    if (!e.id) e.id = uid("lb");
    if (!Array.isArray(e.keys)) e.keys = mang(e.keys);
    if (!Array.isArray(e.keys2)) e.keys2 = mang(e.keys2);
    if (typeof e.noiDung !== "string") e.noiDung = String(e.noiDung || "");
    if (e.bat === undefined) e.bat = true;
  }
  return lb;
}

// Gọi sau mỗi lần sửa sổ để bộ đệm "mục đang khớp" biết dữ liệu đã đổi.
export function chamLore(story) {
  const lb = loreCua(story);
  lb.phienBan = Date.now();
  return lb;
}

// ------------------------------------------------------------------ đọc file
// Nhận: {entries:{...}} (World Info), {entries:[...]} (character book),
// mảng mục, một mục đơn lẻ, hoặc thẻ nhân vật có data.character_book.
export function docLorebook(input) {
  let data = input;
  if (typeof input === "string") {
    const t = input.trim();
    if (!t) throw new Error("Chưa có nội dung để nhập.");
    try {
      data = JSON.parse(t);
    } catch (err) {
      throw new Error("Không đọc được JSON: " + (err.message || err));
    }
  }
  if (!data || typeof data !== "object") throw new Error("File không đúng định dạng lorebook.");

  let src = data;
  if (data.character_book) src = data.character_book;
  else if (data.data && data.data.character_book) src = data.data.character_book;
  const ten = String(src.name || src.ten || "").trim();

  let list = null;
  if (Array.isArray(src.entries)) list = src.entries;
  else if (src.entries && typeof src.entries === "object")
    list = Object.keys(src.entries)
      .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
      .map((k) => src.entries[k]);
  else if (Array.isArray(src)) list = src;
  else if (src.key !== undefined || src.keys !== undefined || src.content !== undefined) list = [src];
  else {
    const ks = Object.keys(src).filter(
      (k) => src[k] && typeof src[k] === "object" && (src[k].content !== undefined || src[k].key !== undefined || src[k].keys !== undefined)
    );
    if (ks.length) list = ks.map((k) => src[k]);
  }
  if (!list) throw new Error("Không tìm thấy danh sách 'entries' trong file.");

  const entries = [];
  const boQua = [];
  let thieuTuKhoa = 0;
  list.forEach((r, i) => {
    const e = chuanMuc(r, i);
    if (!e.noiDung) {
      boQua.push(e.ghiChu);
      return;
    }
    if (e.bat && !e.hangSo && !e.keys.length) {
      e.bat = false;
      thieuTuKhoa++;
    }
    entries.push(e);
  });
  if (!entries.length) {
    throw new Error("Không có mục nào dùng được" + (boQua.length ? " — " + boQua.length + " mục thiếu nội dung." : "."));
  }
  return { ten, entries, boQua, thieuTuKhoa };
}

// Đọc một mục ở mọi cách viết hoa/thường và tên trường khác nhau.
export function chuanMuc(raw, i = 0) {
  const r = raw && typeof raw === "object" ? raw : {};
  const e = newLoreEntry({
    ghiChu: r.comment || r.name || r.ghiChu || r.title || "",
    keys: r.key !== undefined ? r.key : r.keys,
    keys2: r.keysecondary !== undefined ? r.keysecondary : r.secondary_keys,
    noiDung: r.content !== undefined ? r.content : r.noiDung,
    bat: r.enabled !== false && r.disable !== true && r.bat !== false,
    hangSo: r.constant === true || r.hangSo === true,
    chonLoc: r.selective === true || r.chonLoc === true,
    thuTu: so(r.order, so(r.insertion_order, so(r.thuTu, 100))),
    doSau: so(r.scanDepth, so(r.scan_depth, so(r.doSau, 0))),
    phanBietHoa: r.caseSensitive === true || r.case_sensitive === true || r.phanBietHoa === true,
    khopTronTu: r.matchWholeWords === true || r.match_whole_words === true || r.khopTronTu === true,
    khongDeQuy: r.preventRecursion === true || r.khongDeQuy === true,
  });
  if (!e.ghiChu) e.ghiChu = e.keys[0] || "Mục " + (i + 1);
  return e;
}

// Xuất ngược ra đúng chuẩn World Info để người dùng mang sang nơi khác.
export function xuatLorebook(story) {
  const lb = loreCua(story);
  const entries = {};
  lb.entries.forEach((e, i) => {
    entries[String(i)] = {
      uid: i,
      key: e.keys.slice(),
      keysecondary: e.keys2.slice(),
      comment: e.ghiChu,
      content: e.noiDung,
      constant: !!e.hangSo,
      selective: !!e.chonLoc,
      disable: !e.bat,
      order: Number(e.thuTu) || 0,
      caseSensitive: !!e.phanBietHoa,
      matchWholeWords: !!e.khopTronTu,
      preventRecursion: !!e.khongDeQuy,
      scanDepth: Number(e.doSau) || null,
    };
  });
  return JSON.stringify({ name: lb.ten || "Sổ tri thức", entries }, null, 2);
}

export function viDuLorebook() {
  return {
    name: "Sổ tri thức mẫu",
    entries: {
      0: {
        uid: 0,
        key: ["thành phố", "phố cổ"],
        comment: "Bối cảnh: phố cổ",
        content: "Phố cổ nằm ven sông, chỉ rộng vài con hẻm, đêm nào cũng có sương. Chợ đêm họp từ chín giờ tới gần sáng.",
        constant: false,
        selective: false,
        order: 100,
      },
      1: {
        uid: 1,
        key: ["Hội đồng", "hội đồng thành phố"],
        comment: "Tổ chức: Hội đồng",
        content: "Hội đồng gồm năm người, họp kín mỗi tuần một lần. Không ai ngoài Hội đồng từng thấy mặt đủ cả năm người.",
        keysecondary: ["quyền lực", "bỏ phiếu"],
        selective: true,
        order: 110,
      },
      2: {
        uid: 2,
        key: ["cơn mưa"],
        comment: "Luật thế giới: mưa đổi tính cách",
        content: "Trong thế giới này, người ta nói thật lòng hơn khi trời mưa — nhưng cũng dễ nổi nóng hơn.",
        constant: false,
        order: 90,
      },
    },
  };
}

// ------------------------------------------------------------------ dò từ khoá
const cacheKhop = new Map();

// Băm nội dung thành một chuỗi ngắn — dùng làm khoá bộ đệm.
function bam(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + "." + s.length.toString(36);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function khopMotTu(k, vanThuong, e) {
  const k0 = String(k).trim();
  if (!k0) return false;
  const k1 = e.phanBietHoa ? k0 : k0.toLowerCase();
  if (!e.khopTronTu) return vanThuong.indexOf(k1) >= 0;
  const re = new RegExp("(^|[^\\p{L}\\p{N}_])" + escapeRe(k1) + "($|[^\\p{L}\\p{N}_])", "u");
  return re.test(vanThuong);
}

function khopMuc(e, van) {
  const vanThuong = e.phanBietHoa ? van : van.toLowerCase();
  const coTuKhoa = (ds) => (ds || []).some((k) => khopMotTu(k, vanThuong, e));
  if (!coTuKhoa(e.keys)) return false;
  if (e.chonLoc && e.keys2.length && !coTuKhoa(e.keys2)) return false;
  return true;
}

// Các mục nên gửi cho AI ở lượt này (kèm lý do, để giao diện hiển thị).
export function mucKhop(story, conv, messages) {
  const lb = loreCua(story);
  const bat = lb.entries.filter((e) => e.bat);
  if (!bat.length) return [];
  const msgs = (messages || []).filter((m) => m && m.vai !== "anh" && m.noiDung);
  const macDinh = Number(CFG.soTinNhanQuetLore) > 0 ? Number(CFG.soTinNhanQuetLore) : 8;
  const sauNhat = bat.reduce((a, e) => Math.max(a, Number(e.doSau) > 0 ? Number(e.doSau) : macDinh), macDinh);
  const nen =
    [story.ten, story.boiCanh, conv ? conv.tieuDe : "", conv ? conv.goiY : ""].filter(Boolean).join("\n") + "\n";
  const vanTin = msgs.map((m) => (m.ten ? m.ten + ": " : "") + m.noiDung);
  // Khoá bộ đệm dựa trên NỘI DUNG chứ không chỉ số lượng hay độ dài tin nhắn: sửa
  // một tin nhắn mà giữ nguyên độ dài cũng phải làm kết quả khớp cũ hết hiệu lực.
  const khoa = bam(
    [
      story.id,
      lb.phienBan,
      bam(nen + vanTin.slice(Math.max(0, vanTin.length - sauNhat)).join("\n")),
      bat.length,
      bam(
        bat
          .map((e) =>
            [e.id, e.keys.join("\u0001"), e.keys2.join("\u0001"), e.noiDung, e.hangSo, e.chonLoc, e.thuTu, e.doSau, e.phanBietHoa, e.khopTronTu, e.khongDeQuy].join("\u0002")
          )
          .join("\u0003")
      ),
    ].join("|")
  );
  const daCo = cacheKhop.get(khoa);
  if (daCo) return daCo;

  const vanTheo = (d) => nen + vanTin.slice(Math.max(0, vanTin.length - d)).join("\n");

  const loc = [];
  const daChon = new Set();
  const noiDungDaChon = [];
  const them = (e, ly) => {
    if (daChon.has(e.id)) return false;
    daChon.add(e.id);
    loc.push({ entry: e, ly });
    noiDungDaChon.push(e.noiDung);
    return true;
  };
  for (const e of bat) if (e.hangSo) them(e, "cố định");

  // Quét nhiều vòng: mục vừa khớp có thể kéo theo mục khác (recursive scanning).
  for (let vong = 0; vong < 3; vong++) {
    let coThem = false;
    for (const e of bat) {
      if (daChon.has(e.id)) continue;
      if (vong > 0 && e.khongDeQuy) continue;
      const d = Number(e.doSau) > 0 ? Number(e.doSau) : macDinh;
      let van = vanTheo(d);
      if (vong > 0 && noiDungDaChon.length) van += "\n" + noiDungDaChon.join("\n");
      if (khopMuc(e, van)) {
        const ly = vong === 0 ? "từ khoá" : "liên quan";
        if (them(e, ly)) coThem = true;
      }
    }
    if (!coThem) break;
  }

  loc.sort(
    (a, b) =>
      (Number(a.entry.thuTu) || 0) - (Number(b.entry.thuTu) || 0) ||
      String(a.entry.ghiChu).localeCompare(String(b.entry.ghiChu), "vi")
  );
  cacheKhop.set(khoa, loc);
  if (cacheKhop.size > 80) cacheKhop.delete(cacheKhop.keys().next().value);
  return loc;
}

// Khối văn bản chèn vào prompt. Rỗng nghĩa là không có gì khớp → prompt y như cũ.
export function buildLore(story, conv, messages) {
  const loc = mucKhop(story, conv, messages);
  if (!loc.length) return "";
  const nganSach = Number(CFG.nganSachKyTuLore) > 0 ? Number(CFG.nganSachKyTuLore) : 4000;
  const toiDaMuc = Number(CFG.soKyTuMoiMucLore) > 0 ? Number(CFG.soKyTuMoiMucLore) : 1500;
  const phan = [];
  let dung = 0;
  for (const it of loc) {
    let nd = String(it.entry.noiDung || "").trim();
    if (!nd) continue;
    if (nd.length > toiDaMuc) nd = nd.slice(0, toiDaMuc).trim() + " […]";
    if (dung + nd.length > nganSach) continue;
    dung += nd.length;
    phan.push("## " + (it.entry.ghiChu || it.entry.keys[0] || "Mục") + "\n" + nd);
  }
  if (!phan.length) return "";
  return (
    "# SỔ TRI THỨC — thông tin nền đã định trước\n" +
    "Các mục dưới đây là sự thật cố định của thế giới này. Hãy dùng cho đúng, không mâu thuẫn với chúng, " +
    "và chỉ nhắc tới khi câu chuyện cần — đừng liệt kê lại.\n\n" +
    phan.join("\n\n")
  );
}
