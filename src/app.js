// Truyện Vai — giao diện & luồng hoạt động chính.

import {
  R, CFG, store, uid, loadSettings, saveSettings, loadStories, getStory, saveStory as ghiCotTruyen, deleteStory,
  createStory, newCharacter, newChapter, newConversation, loadMessages, getMessages, persistMessages,
  replaceMessages, makeMessage, pushMessage, charById, convsOfChapter, looseConversations, storyStats,
  giaoKeoOf, giaoKeoMacDinh, newAnh, luuAnh, getAnh, getAnhMem, xoaAnh, anhMeta, anhCua,
  LoiLuu, thongDiepLuu, dungLuongUocTinh, chuanHoaTruyen, chuanHoaTinNhan, PHIEN_BAN_TRUYEN,
  mocSaoLuu, danhDauSaoLuu, nenNhacSaoLuu, docNhatKyLlm, ghiNhatKyLlm, xoaNhatKyLlm,
  kiemTraBatBien, TOI_DA_MUC_NHAT_KY, TOI_DA_BYTE_NHAT_KY, catTho, danhDauDaDoi, themVaoVong, dungLuongTho,
  hienDienCua, hienDienNhom, canhRiengCua, daoDienOf, daoDienMacDinh, luuMoC,
  chupNhieuKhoa, traNhieuKhoa, laNguoiLon, tuoiSo, chanGiaoKeo, chanNoiDungNguoiLon,
  laCheDoNguoiLon, xacNhanMoiNguoiLon, laDataUrlAnh,
  dauHieuViThanhNien, dsSeGhiCoNguoiLon, dsChanGhiCo,
  newNgoaiHinh, loadNgoaiHinh, getNgoaiHinh, dsNgoaiHinh, luuNgoaiHinh, xoaNgoaiHinh, giaoDichKV,
  coLoiDocNgoaiHinh, luuBanDichNgoaiHinh,
  // Giai đoạn 5 — tầng schema + migration tập trung (đường nạp dùng `migrate`/`napBanGhi`).
  migrate, napBanGhi, migrateTruyen, migrateTinNhan, migrateHoSo, docLoiHinhDang, xoaLoiHinhDang,
  tomTatMigrate, docNhatKyMigrate, xoaNhatKyMigrate, moTaHinhDang, nhanLoaiBanGhi,
} from "./store.js";
// Sổ đăng ký phiên bản + hàm kiểm hình dạng: tầng giao diện chỉ ĐỌC chúng (hiện trong bảng gỡ
// lỗi / màn tự kiểm tra và điểm neo kiểm thử), không tự nâng cấp bản ghi ở đây.
import {
  MIGRATION_TRUYEN, MIGRATION_HO_SO, MO_TA_TRUYEN, MO_TA_TIN_NHAN, MO_TA_ANH, MO_TA_HO_SO,
  kiemTraTruyen, kiemTraTinNhan, kiemTraAnh, kiemTraHoSo,
} from "./schema.js";
import {
  PHIEN_BAN_HO_SO, MARK_NGOAI_HINH, MARK_NGOAI_HINH_CU, ungVienNgoaiHinh, nhanDienNgoaiHinh, tenUngVien,
  hoSoTheoId, ghepPromptNgoaiHinh, tachNgoaiHinh, gopLoaiTruNgoaiHinh, demLienKetNgoaiHinh,
  demDungNgoaiHinh, hoSoCuaTruyen, chuanHoaHoSo, tenHoSo, khoiNgoaiHinh, thamChieuMo,
  ID_NGUOI_CHOI, laNguoiChoi, nguoiChoiNhuNhanVat, hoSoNguoiChoi, moTaNguoiDung,
  ngoaiHinhEn, tranhEn, canDichNgoaiHinh, boBanDichCu,
} from "./ngoaiHinh.js";
import {
  thoiGianOf, xetDieuKien, nhipTruocDo, khoangText, nhanCheDo, nhanLoai, nhanMuc, nhanPhien,
  CHE_DO, NGUONG_CHON, NGUONG_MAC_DINH, LOAI, MUC, TT_PHIEN, TOI_DA_SU_KIEN,
  suKienCua, suKienTheoId, suKienTheoMaNgan, maNgan, newSuKien, maPhien, tinhLaiBiet,
  nguonHieuLuc, laNhanh, chuanHoaVgHeLo, mucTrong,
} from "./thoiGian.js";
import * as AI from "./ai.js";
import * as TS from "./trangThai.js";
import {
  loreCua, chamLore, newLoreEntry, docLorebook, xuatLorebook, viDuLorebook, mucKhop,
} from "./lore.js";
import {
  esc, fmt, fmtBongBong, icon, toast, modal, confirmModal, promptModal, initials, timeAgo, hexToRgba, el, download, ganAriaNhan, debounce,
} from "./dom.js";
// Giai đoạn 6 — thân màn tạo ảnh nằm ở `src/ui/taoAnh/`. Chiều import một chiều: `src/ui/*`
// được import lõi; lõi không bao giờ import `src/ui/*` (xem `tests/node/goi-chung.test.mjs`).
import { openTaoAnh as moTaoAnh } from "./ui/taoAnh/index.js";
import { openNewStoryModal as moTaoTruyen } from "./ui/taoTruyen/index.js";
import { openCharacterEditor as moNhanVat } from "./ui/nhanVat/index.js";

const app = {
  screen: "library",
  storyId: null,
  convId: null,
  responder: "auto",
  suggestions: [],
  // Khối "Gợi ý lời đáp" chỉ là TRẠNG THÁI TẠM trong RAM (không vào schema truyện):
  //  - suggChon: chỉ số gợi ý được chọn gần nhất (chỉ để tô sáng)
  //  - suggDangTao: đang nhờ AI tạo bộ mới (chỉ nút "Tạo hướng khác" đổi sang loading)
  //  - suggLoi: lỗi của lần tạo gần nhất (giữ nguyên danh sách cũ + bản nháp)
  suggChon: -1,
  suggDangTao: false,
  suggLoi: "",
  streaming: false,
  stopRequested: false,
  streamDone: null,
  loiTam: [],
  thanhCanhMo: false,
  tapTrung: false,
  daoDienDangMo: false,
  editingMsgId: null,
  sidebarOpen: false,
  loadingMsg: "",
  draft: "",
  anhChon: null,
  // ----- thời gian vắng mặt
  vangMatDangXet: false, // đang có một phiên vắng mặt chạy (chặn chạy trùng)
  trangThaiVangMat: "", // dòng trạng thái nhẹ khi đang xử lý
  loiVangMat: null, // { phien, thongDiep } khi lỗi — hiện Thử lại / Bỏ qua
  vangMat: null, // { batDau, ketThuc, phut } của khoảng vắng mặt vừa chụp lúc quay lại
  vangMatDuNguong: false, // khoảng vắng mặt này đã đủ ngưỡng (điều kiện hiện "Nhịp trước đó")
  nhipConvId: "", // hội thoại đang dang dở — nơi thẻ "Nhịp trước đó" thuộc về
  nhipMo: {}, // convId → thẻ "Nhịp trước đó" đang mở
  daKiemTraVg: "", // id truyện đã chụp xong khoảng vắng mặt lúc mở (xem ghiMocHoatDong)
  dongNhip: {}, // convId → đã đóng thẻ "Nhịp trước đó" trong lần vắng mặt này
  ghiMocLuc: 0, // lần cuối ghi mốc hoạt động xuống kv (chống ghi liên tục)
};

const EMOJI_CHOICES = ["🙂","😈","😎","🥰","😭","🤔","😤","🫣","👑","🧙","🧝","🧛","🦸","🕵️","👩‍🎤","🎭","⚔️","🗡️","🏹","🔮","📜","🕯️","🌙","🌘","🐉","🐺","🦊","🐈","🦉","🐍","🤖","👾","🛸","🌊","🔥","❄️","🌸","🍂","⭐","✦"];

const MAU_CHOICES = ["#8b5cf6","#ec4899","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#6366f1","#ef4444","#a855f7","#0ea5e9","#84cc16"];

// ---------------------------------------------------------------- ảnh cảnh
const ANH_FALLBACK = {
  phongCach: [{ id: "dien-anh", emoji: "🎬", ten: "Điện ảnh", them: "cinematic film still, dramatic lighting, shallow depth of field, highly detailed" }, { id: "khong", emoji: "✦", ten: "Không chỉ định", them: "" }],
  kichThuoc: [{ id: "768x512", ten: "Ngang — 768×512" }, { id: "512x768", ten: "Dọc — 512×768" }, { id: "768x768", ten: "Vuông — 768×768" }, { id: "512x512", ten: "Vuông nhỏ — 512×512" }],
  phongCachMacDinh: "dien-anh",
  kichThuocMacDinh: "768x512",
  loaiTru: "low quality, blurry, watermark, text, logo, extra fingers, deformed hands, bad anatomy, child",
};
const dsPhongCach = () => { try { const l = R.PhongCachAnh && R.PhongCachAnh(); return Array.isArray(l) && l.length ? l : ANH_FALLBACK.phongCach; } catch (e) { return ANH_FALLBACK.phongCach; } };
const dsKichThuoc = () => { try { const l = R.KichThuocAnh && R.KichThuocAnh(); return Array.isArray(l) && l.length ? l : ANH_FALLBACK.kichThuoc; } catch (e) { return ANH_FALLBACK.kichThuoc; } };
const anhMacDinh = () => { let d = null; try { d = R.AnhMacDinh && R.AnhMacDinh(); } catch (e) {} return Object.assign({}, ANH_FALLBACK, d || {}); };
const tenPhongCach = (id) => { const x = dsPhongCach().find((p) => p.id === id); return x ? x.ten : ""; };
const themPhongCach = (id) => { const x = dsPhongCach().find((p) => p.id === id); return x ? x.them : ""; };
function anhChon() {
  if (!app.anhChon) {
    const md = anhMacDinh();
    app.anhChon = {
      phongCach: store.settings.anhPhongCach || md.phongCach || ANH_FALLBACK.phongCachMacDinh,
      kichThuoc: store.settings.anhKichThuoc || md.kichThuoc || ANH_FALLBACK.kichThuocMacDinh,
      loaiTru: md.loaiTru || ANH_FALLBACK.loaiTru,
    };
  }
  return app.anhChon;
}
function luuAnhChon() {
  const c = anhChon();
  store.settings.anhPhongCach = c.phongCach;
  store.settings.anhKichThuoc = c.kichThuoc;
  saveSettings();
}

// ==========================================================================
//  TIỆN ÍCH CHUNG
// ==========================================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function currentStory() {
  return getStory(app.storyId);
}
function currentConv() {
  const s = currentStory();
  if (!s) return null;
  return s.hoiThoais.find((c) => c.id === app.convId) || null;
}
function layNguoiChoi(story) {
  return (story && story.nguoiChoi && story.nguoiChoi.ten) || "Bạn";
}

// Công tắc "Phân biệt đối thoại và hành động" (Cài đặt). Mặc định BẬT: chỉ khi người
// dùng tự tắt (`false`) mới dùng lại kiểu hiển thị cũ. Đây CHỈ là lớp render — không
// đụng tới `noiDung`.
function batPhanBiet() {
  return store.settings.phanBietLoiThoai !== false;
}

// ------------------------------------------------------- hiện diện & cảnh riêng
function nvtsCoMat(story, conv) {
  const ids = hienDienCua(story, conv);
  return story.nhanVats.filter((c) => ids.indexOf(c.id) >= 0);
}
function nvCuaId(story, id) {
  return (id && charById(story, id)) || null;
}
// Nhân vật tham gia một tin nhắn AI (tin nhóm có `nvIds`, tin cũ chỉ có `nvId`).
function nvtsCuaTin(story, m) {
  if (!m) return [];
  const ids = Array.isArray(m.nvIds) && m.nvIds.length ? m.nvIds : (m.nvId ? [m.nvId] : []);
  return ids.map((id) => charById(story, id)).filter(Boolean);
}

// Tìm những nhân vật được người chơi gọi tên trong một tin nhắn: dùng "@Tên" hoặc
// nhắc đúng tên. Chỉ áp dụng cho nhân vật của hội thoại; tách riêng ai đang có mặt
// và ai vắng mặt (vắng mặt thì không được lên tiếng).
function timNhanVatDuocGoi(story, conv, text) {
  const t = String(text || "");
  const kq = { coMat: [], vangMat: [] };
  if (!t.trim()) return kq;
  const thamGia = story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0);
  if (thamGia.length < 2) return kq;
  const coMat = hienDienCua(story, conv);
  const bien = (s) => new RegExp("(^|[^\\p{L}\\p{N}])" + escapeReg(s.trim()) + "($|[^\\p{L}\\p{N}])", "iu");
  for (const c of thamGia) {
    const ten = (c.ten || "").trim();
    if (ten.length < 2) continue;
    if (!bien(ten).test(t) && t.indexOf("@" + ten) < 0) continue;
    if (coMat.indexOf(c.id) >= 0) kq.coMat.push(c.id);
    else kq.vangMat.push(ten);
  }
  return kq;
}
function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================================================
//  LƯU DỮ LIỆU — lỗi phải tới được người dùng
// ==========================================================================
function baoLoiLuu(e, viec) {
  console.error("[Truyện Vai] lỗi lưu:", e);
  toast(thongDiepLuu(e, viec), "error");
}

// Lưu cốt truyện; trả về false nếu ghi thất bại (đã hiện thông báo).
async function luuTruyen(story, viec) {
  // Cổng người lớn ngay trước khi ghi: có nhân vật ghi tuổi dưới 18, HOẶC có nhân vật chưa
  // được xác nhận là người trưởng thành ⇒ khoá cứng lớp giao kèo và nói rõ lý do, thay vì
  // lặng lẽ ghi một trạng thái không được phép.
  if (story && story.giaoKeo && story.giaoKeo.bat) {
    const lyDo = chanNoiDungNguoiLon(story);
    if (lyDo) {
      story.giaoKeo.bat = false;
      toast(lyDo, "error");
    }
  }
  try {
    await ghiCotTruyen(story);
    return true;
  } catch (e) {
    baoLoiLuu(e, viec || "cốt truyện");
    return false;
  }
}

// Ghi lại bộ đệm tin nhắn sau khi sửa/xoá. `hoanTac` khôi phục giá trị cũ.
async function luuTinNhan(convId, hoanTac) {
  try {
    await persistMessages(convId);
    return true;
  } catch (e) {
    if (hoanTac) {
      try { hoanTac(); } catch (x) { console.error(x); }
      try { await persistMessages(convId); } catch (x) {}
    }
    baoLoiLuu(e, "tin nhắn");
    return false;
  }
}

async function themTinNhan(convId, msg) {
  try {
    return await pushMessage(convId, msg);
  } catch (e) {
    baoLoiLuu(e, "tin nhắn");
    return null;
  }
}

// ------------------------------------------------------------------ giao dịch cấp app
// Một thao tác chạm nhiều khoá KV (xoá truyện, xoá hội thoại, xoá ảnh, cắt lịch sử,
// tạo nhánh, nhập truyện) phải là MỘT giao dịch: hỏng ở bất kỳ bước nào thì mọi khoá
// đã chụp phải quay về nguyên trạng, và bộ đệm RAM cũng vậy — nếu không, lần đọc sau sẽ
// tưởng hội thoại trống rồi ghi đè mất dữ liệu thật.
//   ds   = [["cotTruyen", id], ["tinNhan", convId], ["thuVienAnh", anhId], …]
//   chay = async () => …   (dùng `ghiCotTruyen` để lỗi ghi NÉM RA thay vì bị nuốt)
// Trả về { ok, kq, loi, hong } — KHÔNG ném ra ngoài, để chỗ gọi tự quyết định có đóng
// modal / báo "đã lưu" hay không.
async function giaoDichApp(ds, chay, viec) {
  const khoa = Array.isArray(ds) ? ds.filter(Boolean) : [];
  let snap;
  try {
    snap = await chupNhieuKhoa(khoa);
  } catch (e) {
    baoLoiLuu(e, viec || "dữ liệu");
    return { ok: false, kq: null, loi: e, hong: 0 };
  }
  const tnTruoc = {};
  const anhTruoc = {};
  // Sao chép NÔNG từng phần tử: giao dịch có thể `splice()` chính mảng đang nằm trong bộ
  // đệm, nên giữ nguyên tham chiếu là vô nghĩa — khôi phục phải trả lại NỘI DUNG cũ.
  const saoChep = (v) => (Array.isArray(v)
    ? v.map((x) => (x && typeof x === "object" ? Object.assign({}, x) : x))
    : (v && typeof v === "object" ? Object.assign({}, v) : v));
  for (const k of khoa) {
    if (k[0] === "tinNhan" && !(k[1] in tnTruoc)) tnTruoc[k[1]] = saoChep(store.messagesCache[k[1]]);
    if (k[0] === "thuVienAnh" && !(k[1] in anhTruoc)) anhTruoc[k[1]] = saoChep(store.anhCache[k[1]]);
  }
  try {
    return { ok: true, kq: await chay(), loi: null, hong: 0 };
  } catch (e) {
    const hong = await traNhieuKhoa(snap);
    for (const k in tnTruoc) {
      if (tnTruoc[k] === undefined) delete store.messagesCache[k];
      else store.messagesCache[k] = tnTruoc[k];
    }
    for (const k in anhTruoc) {
      if (anhTruoc[k] === undefined) delete store.anhCache[k];
      else store.anhCache[k] = anhTruoc[k];
    }
    if (khoa.some((k) => k[0] === "cotTruyen")) {
      try { await loadStories(); } catch (x) { console.error(x); }
    }
    baoLoiLuu(e, viec || "dữ liệu");
    return { ok: false, kq: null, loi: e, hong };
  }
}

// ==========================================================================
//  ĐIỀU KHIỂN SINH PHẢN HỒI — dừng phải luôn hoạt động
// ==========================================================================
function batDauLuot() {
  app.streaming = true;
  app.stopRequested = false;
  AI.boCoDung();
  app.streamDone = new Promise((r) => { app.__xongLuot = r; });
}

function ketThucLuot() {
  app.streaming = false;
  const r = app.__xongLuot;
  app.__xongLuot = null;
  app.streamDone = null;
  if (r) r();
}

// Dừng lượt đang chạy và CHỜ nó kết thúc (phần văn bản đã sinh vẫn được giữ lại),
// để các luồng như từ khoá dừng có thể chạy ngay sau đó.
async function dungSinhVaLuu() {
  if (!app.streaming) return false;
  app.stopRequested = true;
  AI.stopCurrent();
  if (app.streamDone) await app.streamDone;
  return true;
}

// Bản tóm tắt cũ hết hiệu lực khi tin nhắn nằm trong vùng đã được tóm tắt bị sửa/xoá.
function voHieuTomTat(conv, idx) {
  if (!conv || !conv.tomTat) return false;
  if (idx === undefined || idx === null || idx >= (conv.tomTatDen || 0)) return false;
  conv.tomTat = "";
  conv.tomTatDen = 0;
  return true;
}

function avatarHtml(story, char, size = 34) {
  const s = size;
  if (!char) {
    return (
      '<span class="avatar" style="--sz:' + s + "px;background:#5b6172\">" + esc(initials(layNguoiChoi(story))) + "</span>"
    );
  }
  if (char.avatarStyle === "anh" && char.anh) {
    const url = laDataUrlAnh(char.anh);
    if (url) return '<span class="avatar avatar-img" style="--sz:' + s + 'px"><img src="' + esc(url) + '" alt=""></span>';
  }
  if (char.avatarStyle === "emoji") {
    return (
      '<span class="avatar avatar-emoji" style="--sz:' + s + "px;background:" + hexToRgba(char.mau || "#8b5cf6", 0.16) +
      ";border-color:" + hexToRgba(char.mau || "#8b5cf6", 0.35) + '">' + esc(char.emoji || "🙂") + "</span>"
    );
  }
  return '<span class="avatar" style="--sz:' + s + "px;background:" + esc(char.mau || "#8b5cf6") + '">' + esc(initials(char.ten)) + "</span>";
}

function avatarStack(story, ids, size = 26) {
  const list = (ids || []).map((id) => charById(story, id)).filter(Boolean).slice(0, 4);
  if (!list.length) return "";
  return '<span class="stack">' + list.map((c) => avatarHtml(story, c, size)).join("") + "</span>";
}

function setHash() {
  const parts = [];
  if (app.storyId) parts.push("ct=" + app.storyId);
  if (app.convId) parts.push("ht=" + app.convId);
  const h = parts.length ? "#" + parts.join("&") : "";
  try {
    history.replaceState(null, "", h || location.pathname + location.search);
  } catch (e) {}
}
function parseHash() {
  const h = (location.hash || "").replace(/^#/, "");
  const p = new URLSearchParams(h);
  return { ct: p.get("ct"), ht: p.get("ht") };
}

let themeMedia = null;
function giaoDienSang() {
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
}
function apDungDataTheme() {
  const chon = store.settings.theme || "toi";
  const thuc = chon === "hethong" ? (giaoDienSang() ? "sang" : "toi") : chon;
  document.documentElement.setAttribute("data-theme", thuc);
  document.documentElement.setAttribute("data-theme-chon", chon);
  if (chon === "hethong") {
    if (!themeMedia && window.matchMedia) {
      themeMedia = window.matchMedia("(prefers-color-scheme: light)");
      const onDoi = () => apDungDataTheme();
      if (themeMedia.addEventListener) themeMedia.addEventListener("change", onDoi);
      else if (themeMedia.addListener) themeMedia.addListener(onDoi);
    }
  }
}
function applyTheme() {
  apDungDataTheme();
}

function setScreen(s) {
  app.screen = s;
  render();
}

// ==========================================================================
//  ĐIỀU HƯỚNG
// ==========================================================================
async function openStory(id, convId = null) {
  app.storyId = id;
  app.convId = convId;
  app.responder = "auto";
  xoaGoiY();
  app.screen = "story";
  app.sidebarOpen = false;
  app.dongNhip = {};
  app.nhipMo = {};
  app.nhipConvId = "";
  app.daKiemTraVg = "";
  const story = currentStory();
  if (story && convId) await loadMessages(convId);
  // Chụp khoảng vắng mặt TRƯỚC khi vẽ, để thẻ "Nhịp trước đó" biết mình có cần hiện không.
  if (story) ghiNhanVangMat(story);
  setHash();
  render();
  if (story) kiemTraVangMat(story);
}

async function openConv(convId) {
  app.convId = convId;
  app.editingMsgId = null;
  xoaGoiY();
  app.draft = "";
  app.sidebarOpen = false;
  await loadMessages(convId);
  setHash();
  render();
}

function goDashboard() {
  app.convId = null;
  xoaGoiY();
  app.editingMsgId = null;
  setHash();
  render();
}

function goLibrary() {
  app.screen = "library";
  app.storyId = null;
  app.convId = null;
  setHash();
  render();
}

// ==========================================================================
//  RENDER: THƯ VIỆN
// ==========================================================================
function renderLibrary() {
  const root = $("#appRoot");
  const stories = store.stories;
  const cards = stories.map((s) => {
    const st = storyStats(s);
    const ten = esc(s.ten);
    return (
      '<button class="story-card" data-act="open-story" data-id="' + esc(s.id) + '">' +
        '<div class="story-card-glow" style="background:' + hexToRgba(s.mau || "#8b5cf6", 0.5) + '"></div>' +
        '<div class="story-card-top"><span class="story-emoji">' + esc(s.emoji || "✦") + "</span>" +
        '<span class="badge">' + (s.mode === "chuong" ? "📖 nhiều chương" : "🧵 nhiều hội thoại") + "</span></div>" +
        '<div class="story-card-name">' + ten + "</div>" +
        '<div class="story-card-desc">' + esc(s.moTa || s.boiCanh || "Chưa có mô tả").slice(0, 150) + "</div>" +
        '<div class="story-card-foot">' +
          '<span class="story-stat">' + icon("users", 14) + " " + st.chars + "</span>" +
          '<span class="story-stat">' + icon("chat", 14) + " " + st.convs + "</span>" +
          '<span class="story-stat">' + icon("scroll", 14) + " " + st.msgs + "</span>" +
          '<span class="story-stat muted">' + timeAgo(s.suaLuc) + "</span>" +
        "</div>" +
      "</button>"
    );
  });

  root.innerHTML =
    '<div class="library">' +
      '<header class="lib-head">' +
        '<div class="lib-brand"><span class="brand-mark">✦</span><div><div class="brand-name">Truyện Vai</div>' +
        '<div class="brand-sub">Sổ tay nhập vai của bạn — bạn là người chơi duy nhất, các nhân vật là của bạn</div></div></div>' +
        '<div class="lib-actions">' +
          '<button class="btn" data-act="export-all" title="Tải về một file JSON chứa toàn bộ thư viện">' + icon("download", 16) + " Sao lưu</button>" +
          '<button class="btn" data-act="open-settings">' + icon("sliders", 16) + " Cài đặt</button>" +
          '<button class="btn" data-act="import-all">' + icon("upload", 16) + " Nhập</button>" +
          '<button class="btn btn-primary" data-act="new-story">' + icon("plus", 16) + " Cốt truyện mới</button>" +
        "</div>" +
      "</header>" +
      (stories.length
        ? '<div class="story-grid">' + cards.join("") + "</div>"
        : '<div class="empty-big">' +
            '<div class="empty-art">📖</div>' +
            "<h2>Chưa có cốt truyện nào</h2>" +
            "<p>Tạo cốt truyện đầu tiên: chọn đi theo từng chương, hoặc mở một thế giới với nhiều tuyến hội thoại song song.</p>" +
            '<button class="btn btn-primary btn-lg" data-act="new-story">' + icon("plus", 18) + " Bắt đầu</button>" +
          "</div>") +
      '<footer class="lib-foot">' +
        khoiCanhBaoDoiTen() +
        '<div class="lib-privacy">' + icon("lock", 13) +
          " Truyện và ảnh của bạn được lưu <b>cục bộ trên trình duyệt này</b> (IndexedDB) — không có tài khoản, không có máy chủ lưu truyện. " +
          "Riêng khi bạn gọi các tính năng AI (viết phản hồi, tạo nhân vật, dựng ảnh, tổng kết chương, gợi ý), phần ngữ cảnh liên quan của truyện sẽ được gửi tới dịch vụ AI của Perchance để xử lý." +
        "</div>" +
        '<div class="lib-dung" data-dung-luong></div>' +
      "</footer>" +
    "</div>";
  hienDungLuong();
}

// Hiện dung lượng trình duyệt đang dùng cho app (IndexedDB), cảnh báo khi gần đầy.
async function hienDungLuong() {
  await thanhDungLuong($("[data-dung-luong]"));
}

// Đọc lại thư viện ngoại hình ngay trước khi xuất bản sao lưu, rồi HỎI nếu vẫn còn lỗi
// đọc. Một file sao lưu thiếu hồ sơ mà vẫn báo thành công là kiểu mất dữ liệu tệ nhất:
// người dùng chỉ phát hiện khi đã quá muộn. Trả về true nếu được phép xuất.
async function choXuatKhiThieuHoSo(nguCanh) {
  try { await loadNgoaiHinh(); } catch (e) { console.error(e); }
  if (!coLoiDocNgoaiHinh()) return true;
  return hoiXacNhan(
    "Không đọc được thư viện ngoại hình",
    "Lần đọc thư viện ngoại hình gần nhất bị lỗi, nên " + nguCanh +
      " có thể THIẾU hồ sơ ngoại hình — kể cả hồ sơ đang được nhân vật hoặc ảnh cảnh dùng. " +
      "Dữ liệu trên máy vẫn còn: hãy tải lại trang rồi xuất lại. Vẫn xuất?",
    { yesLabel: "Vẫn xuất (có thể thiếu hồ sơ)", danger: true }
  );
}

// Xuất toàn bộ thư viện (mọi truyện + tin nhắn + ảnh) thành một file JSON.
async function xuatTatCa() {
  const all = { type: "truyen-vai-all", version: PHIEN_BAN_TRUYEN, stories: [], messages: {}, anh: {}, ngoaiHinh: {} };
  const thieu = [];
  try {
    for (const s of store.stories) {
      all.stories.push(s);
      for (const c of s.hoiThoais) {
        await loadMessages(c.id);
        all.messages[c.id] = getMessages(c.id);
      }
      for (const a of anhCua(s)) {
        const rec = await getAnh(a.id);
        if (rec && laDataUrlAnh(rec.dataUrl)) all.anh[a.id] = rec;
        else thieu.push((s.ten || "?") + " · " + (a.chuThich || a.id));
      }
    }
  } catch (e) {
    baoLoiLuu(e, "bản sao lưu");
    toast("Bản sao lưu đã DỪNG: có dữ liệu không đọc được nên file chưa được tải. Dữ liệu vẫn còn trên máy — thử lại sau.", "error");
    return;
  }
  // Cả thư viện ngoại hình đi kèm bản sao lưu toàn app (hồ sơ dùng chung, không thuộc
  // riêng truyện nào, nên phải nằm ở cấp này).
  if (!(await choXuatKhiThieuHoSo("file sao lưu toàn bộ"))) return;
  for (const h of dsNgoaiHinh()) all.ngoaiHinh[h.id] = h;
  if (thieu.length) {
    const ok = await hoiXacNhan(
      "Bản sao lưu thiếu " + thieu.length + " ảnh",
      "Những ảnh sau không còn dữ liệu nên sẽ KHÔNG có trong file: " + thieu.slice(0, 5).join("; ") +
        (thieu.length > 5 ? " …" : "") + ". File vẫn dùng được nhưng khi khôi phục sẽ thiếu đúng những ảnh này. Vẫn xuất?",
      { yesLabel: "Vẫn xuất", danger: true }
    );
    if (!ok) return;
  }
  download("truyen-vai-toan-bo.json", JSON.stringify(all));
  // Mốc "đã xuất" — dùng cho lời nhắc sao lưu (chỉ tính file sao lưu TOÀN BỘ, vì đó là
  // thứ khôi phục được cả thư viện lẫn hồ sơ ngoại hình).
  danhDauSaoLuu("xuatLuc");
  toast(
    "Đã xuất toàn bộ thư viện (" + all.stories.length + " truyện, " + Object.keys(all.anh).length + " ảnh, " +
      Object.keys(all.ngoaiHinh).length + " hồ sơ ngoại hình)" +
      (thieu.length ? " — THIẾU " + thieu.length + " ảnh không đọc được." : ".")
  );
}

// ==========================================================================
//  RENDER: MÀN HÌNH TRUYỆN (sidebar + nội dung)
// ==========================================================================
function renderStory() {
  const story = currentStory();
  const root = $("#appRoot");
  if (!story) {
    goLibrary();
    return;
  }
  root.innerHTML =
    '<div class="app' + (app.tapTrung ? " tap-trung" : "") + '">' +
      '<div class="sidebar-scrim' + (app.sidebarOpen ? " on" : "") + '" data-act="close-sidebar"></div>' +
      renderSidebar(story) +
      '<main class="main">' + renderMain(story) + "</main>" +
    "</div>";
  afterRender(story);
}

function renderSidebar(story) {
  const convItem = (c) => {
    const on = c.id === app.convId;
    const nv = story.nhanVats.filter((x) => (c.nhanVatIds || []).includes(x.id));
    return (
      '<button class="conv-item' + (on ? " on" : "") + '" data-act="open-conv" data-id="' + esc(c.id) + '">' +
        avatarStack(story, c.nhanVatIds, 22) +
        '<span class="conv-title">' + esc(c.tieuDe) + "</span>" +
        (nv.length > 1 ? '<span class="conv-tag">nhóm</span>' : "") +
      "</button>"
    );
  };

  let body = "";
  if (story.mode === "chuong" && story.chuongs.length) {
    body += story.chuongs
      .slice()
      .sort((a, b) => a.so - b.so)
      .map((ch) => {
        const convs = convsOfChapter(story, ch.id);
        return (
          '<div class="side-chapter">' +
            '<button class="chapter-head' + (ch.daKetThuc ? " done" : "") + '" data-act="open-chapter" data-id="' + esc(ch.id) + '">' +
              '<span class="chapter-no">' + (ch.daKetThuc ? icon("check", 13) : ch.so) + "</span>" +
              '<span class="chapter-name">' + esc(ch.tieuDe) + "</span>" +
            "</button>" +
            (convs.length ? '<div class="chapter-convs">' + convs.map(convItem).join("") + "</div>" : "") +
            '<button class="side-add" data-act="new-conv" data-chuong="' + esc(ch.id) + '">' + icon("plus", 13) + " hội thoại</button>" +
          "</div>"
        );
      })
      .join("");
    const loose = looseConversations(story);
    if (loose.length) {
      body += '<div class="side-sep">Chưa xếp chương</div>' + loose.map(convItem).join("");
    }
    body += '<button class="side-add" data-act="new-chapter">' + icon("plus", 13) + " thêm chương</button>";
  } else {
    if (story.hoiThoais.length) body += '<div class="chapter-convs">' + story.hoiThoais.map(convItem).join("") + "</div>";
    body += '<button class="side-add" data-act="new-conv">' + icon("plus", 13) + " hội thoại mới</button>";
  }

  return (
    '<aside class="sidebar' + (app.sidebarOpen ? " open" : "") + '">' +
      '<div class="side-top">' +
        '<button class="icon-btn" data-act="go-library" title="Về thư viện">' + icon("back", 18) + "</button>" +
        '<div class="side-title"><div class="side-name">' + esc(story.emoji || "✦") + " " + esc(story.ten) + "</div>" +
        '<div class="side-mode">' + (story.mode === "chuong" ? "Truyện nhiều chương" : "Nhiều hội thoại song song") + "</div></div>" +
        '<button class="icon-btn" data-act="story-menu" title="Tuỳ chọn truyện">' + icon("sliders", 18) + "</button>" +
      "</div>" +
      '<div class="side-scroll">' +
        '<button class="side-link' + (app.convId ? "" : " on") + '" data-act="go-dashboard">' + icon("globe", 15) + " Bảng điều khiển</button>" +
        '<button class="side-link" data-act="open-chars">' + icon("users", 15) + " Nhân vật (" + story.nhanVats.length + ")</button>" +
        '<button class="side-link" data-act="open-chronicle">' + icon("scroll", 15) + " Biên niên sử (" + (story.bienNienSu || []).length + ")</button>" +
        '<div class="side-sep">' + (story.mode === "chuong" ? "Chương & hội thoại" : "Hội thoại") + "</div>" +
        body +
      "</div>" +
    "</aside>"
  );
}

function renderMain(story) {
  if (!app.convId) return renderDashboard(story);
  const conv = currentConv();
  if (!conv) return renderDashboard(story);
  return renderChat(story, conv);
}

// -------------------------------------------------------------- bảng điều khiển
function threadCard(story, c) {
  const soNv = (c.nhanVatIds || []).length;
  return '<button class="thread-card" data-act="open-conv" data-id="' + esc(c.id) + '">' +
    avatarStack(story, c.nhanVatIds, 28) +
    '<div class="thread-info"><div class="thread-name">' + esc(c.tieuDe) +
      (soNv > 1 ? ' <span class="thread-tag">nhóm ' + soNv + '</span>' : "") + "</div>" +
    '<div class="thread-last">' + esc(c.tinNhanCuoi ? c.tinNhanCuoi : (c.goiY || "Chưa có tin nhắn nào")) + "</div></div>" +
    '<span class="thread-count">' + (c.soTinNhan || 0) + "</span></button>";
}

function navQuayLai(story) {
  return (
    '<div class="dash-nav">' +
      '<button class="icon-btn dash-menu" data-act="toggle-sidebar" title="Danh sách hội thoại">' + icon("menu", 18) + "</button>" +
      '<button class="btn btn-sm" data-act="go-library" title="Quay lại thư viện">' + icon("back", 14) + " Thư viện</button>" +
      '<span class="dash-crumb">' + esc(story.emoji || "✦") + " " + esc(story.ten) + "</span>" +
    "</div>"
  );
}

function renderDashboard(story) {
  const hero =
    '<div class="hero">' +
      '<div class="hero-emoji">' + esc(story.emoji || "✦") + "</div>" +
      "<div>" +
        '<h1 class="hero-title">' + esc(story.ten) + "</h1>" +
        '<div class="hero-tags">' +
          (story.theLoaiTen ? '<span class="badge">' + esc(story.theLoaiTen) + "</span>" : "") +
          '<span class="badge">' + (story.mode === "chuong" ? "📖 nhiều chương" : "🧵 nhiều hội thoại") + "</span>" +
          '<span class="badge">' + esc(layNguoiChoi(story)) + "</span>" +
        "</div>" +
      "</div>" +
      '<div class="hero-actions">' +
        '<button class="btn" data-act="story-menu">' + icon("sliders", 15) + " Tuỳ chọn</button>" +
        '<button class="btn btn-primary" data-act="new-conv">' + icon("plus", 15) + " Hội thoại mới</button>" +
      "</div>" +
    "</div>" +
    (story.boiCanh ? '<div class="panel prose">' + fmt(story.boiCanh) + "</div>" : "");

  const nhanVat =
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("users", 16) + " Nhân vật</h3>" +
      '<button class="btn btn-sm" data-act="new-char">' + icon("plus", 14) + " Thêm</button></div>" +
      (story.nhanVats.length
        ? '<div class="char-grid">' + story.nhanVats.map((c) =>
            '<button class="char-card" data-act="edit-char" data-id="' + esc(c.id) + '">' +
              avatarHtml(story, c, 44) +
              '<div class="char-info"><div class="char-name">' + esc(c.ten) + "</div>" +
              '<div class="char-role">' + esc(c.vaiTro || "nhân vật") + "</div></div>" +
            "</button>").join("") + "</div>"
        : '<div class="hint">Chưa có nhân vật nào. Hãy thêm nhân vật để bắt đầu trò chuyện — bạn có thể để AI gợi ý từ một ý tưởng ngắn.</div>') +
    "</div>";

  const loose = looseConversations(story);
  let hanhTrinh = "";
  if (story.mode === "chuong") {
    const sorted = story.chuongs.slice().sort((a, b) => a.so - b.so);
    hanhTrinh =
      '<div class="panel">' +
        '<div class="panel-head"><h3>' + icon("book", 16) + " Hành trình</h3>" +
        '<button class="btn btn-sm" data-act="new-chapter">' + icon("plus", 14) + " Chương mới</button></div>" +
        '<div class="timeline">' +
        sorted.map((ch) => {
          const convs = convsOfChapter(story, ch.id);
          return (
            '<div class="tl-item' + (ch.daKetThuc ? " done" : "") + '">' +
              '<div class="tl-dot">' + (ch.daKetThuc ? icon("check", 13) : ch.so) + "</div>" +
              '<div class="tl-body">' +
                '<div class="tl-head"><span class="tl-title">' + esc(ch.tieuDe) + "</span>" +
                '<span class="tl-badge">' + convs.length + " hội thoại</span></div>" +
                (ch.mucTieu ? '<div class="tl-goal">🎯 ' + esc(ch.mucTieu) + "</div>" : "") +
                (ch.tomTat ? '<div class="tl-sum">' + esc(ch.tomTat) + "</div>" : "") +
                '<div class="tl-convs">' +
                  convs.map((c) =>
                    '<button class="mini-conv" data-act="open-conv" data-id="' + esc(c.id) + '">' +
                    avatarStack(story, c.nhanVatIds, 20) + "<span>" + esc(c.tieuDe) + "</span></button>"
                  ).join("") +
                  '<button class="mini-conv add" data-act="new-conv" data-chuong="' + esc(ch.id) + '">' + icon("plus", 13) + " hội thoại</button>" +
                "</div>" +
                '<div class="tl-actions">' +
                  (ch.daKetThuc
                    ? ""
                    : '<button class="btn btn-sm btn-primary" data-act="end-chapter" data-id="' + esc(ch.id) + '">' + icon("flag", 14) + " Kết thúc chương</button>") +
                  '<button class="btn btn-sm" data-act="edit-chapter" data-id="' + esc(ch.id) + '">' + icon("edit", 13) + " Sửa</button>" +
                "</div>" +
              "</div>" +
            "</div>"
          );
        }).join("") +
        "</div>" +
      "</div>";
  } else {
    hanhTrinh =
      '<div class="panel">' +
        '<div class="panel-head"><h3>' + icon("chat", 16) + " Các tuyến hội thoại</h3>" +
        '<button class="btn btn-sm" data-act="new-conv">' + icon("plus", 14) + " Hội thoại mới</button></div>" +
        (loose.length
          ? '<div class="thread-list">' + loose.map((c) => threadCard(story, c)).join("") + "</div>"
          : '<div class="hint">Chế độ này để bạn mở nhiều tuyến hội thoại song song trong cùng một thế giới — ví dụ trò chuyện riêng với từng nhân vật, rồi ghép họ lại thành một nhóm khi câu chuyện chín. Tất cả các tuyến dùng chung bối cảnh và biên niên sử.</div>') +
      "</div>";
  }

  let roiChuong = "";
  if (story.mode === "chuong" && loose.length) {
    roiChuong =
      '<div class="panel">' +
        '<div class="panel-head"><h3>' + icon("chat", 16) + " Chưa xếp chương (" + loose.length + ")</h3>" +
        '<button class="btn btn-sm" data-act="new-conv">' + icon("plus", 14) + " Hội thoại mới</button></div>" +
        '<div class="thread-list">' + loose.map((c) => threadCard(story, c)).join("") + "</div>" +
        '<div class="hint">Các hội thoại này chưa gắn vào chương nào (mở “Sửa” trong hội thoại để chọn chương). Chúng vẫn dùng chung bối cảnh và biên niên sử với cả truyện.</div>' +
      "</div>";
  }

  const tk = storyStats(story);
  const soChuong = story.chuongs.length;
  const soSuKien = (story.bienNienSu || []).length;
  const tongQuan =
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("sliders", 16) + " Tổng quan</h3></div>" +
      '<div class="dashboard-stat-grid">' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + soChuong + "</span><span class=\"dashboard-stat-lb\">chương</span></div>" +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.convs + "</span><span class=\"dashboard-stat-lb\">hội thoại</span></div>" +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.chars + "</span><span class=\"dashboard-stat-lb\">nhân vật</span></div>" +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + soSuKien + "</span><span class=\"dashboard-stat-lb\">sự kiện</span></div>" +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.msgs + "</span><span class=\"dashboard-stat-lb\">tin nhắn</span></div>" +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + story.chuongs.filter((c) => c.daKetThuc).length + "</span><span class=\"dashboard-stat-lb\">chương xong</span></div>" +
      "</div>" +
      '<div class="stat-tip">' + (story.mode === "chuong"
        ? "Mẹo: khi một chương đã đi đủ xa, bấm “Kết thúc chương” — AI sẽ tóm tắt diễn biến và gợi ý chương kế tiếp cho bạn."
        : "Mẹo: bạn có thể trò chuyện riêng với từng nhân vật, rồi mở “Hội thoại mới” và chọn nhiều người để tạo group chat dùng chung bối cảnh.") + "</div>" +
    "</div>";

  const gkPanel = (() => {
    const g = giaoKeoOf(story);
    if (!g.bat) return "";
    const ds = (R.MucDoBdsm && R.MucDoBdsm()) || [];
    const so = Number(g.mucDo) || 3;
    const m = ds.find((x) => Number(x.so) === so) || {};
    const vaiTen = g.vaiNguoiChoi === "dom" ? "Dom — bạn nắm quyền" : g.vaiNguoiChoi === "switch" ? "Switch — đổi vai" : "Sub — bạn trao quyền";
    const coVai = story.nhanVats.filter((c) => c.vaiBdsm);
    const kq = ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((x) => x.id === g.kieuQuanHe);
    const nhip = ((R.NhipDoBdsm && R.NhipDoBdsm()) || []).find((x) => x.id === g.nhipDo);
    const ngon = ((R.NgonNguBdsm && R.NgonNguBdsm()) || []).find((x) => x.id === g.ngonNgu);
    const thich = ((R.SoThichBdsm && R.SoThichBdsm()) || []).filter((x) => (g.soThich || []).indexOf(x.id) >= 0);
    return (
      '<div class="panel gk-panel">' +
        '<div class="panel-head"><h3>' + icon("lock", 16) + " Giao kèo (BDSM M/M)</h3>" +
        '<button class="btn btn-sm" data-act="open-giao-keo">' + icon("edit", 13) + " Chỉnh</button></div>" +
        '<div class="gk-line"><span class="gk-key">Vai của bạn</span><span>' + esc(vaiTen) + "</span></div>" +
        '<div class="gk-line"><span class="gk-key">Từ khoá dừng</span><span class="gk-swear">' + esc(g.tuKhoaDung || "đỏ") + "</span></div>" +
        '<div class="gk-line"><span class="gk-key">Mức độ</span><span>' + so + "/5 · " + esc(m.ten || "") + "</span></div>" +
        (kq && kq.id !== "the-gioi-mo" ? '<div class="gk-line"><span class="gk-key">Khung quan hệ</span><span>' + esc(kq.emoji + " " + kq.ten) + "</span></div>" : "") +
        (nhip || ngon ? '<div class="gk-line"><span class="gk-key">Nhịp &amp; ngôn ngữ</span><span>' + esc([nhip ? "nhịp: " + nhip.ten : "", ngon ? "ngôn ngữ: " + ngon.ten : ""].filter(Boolean).join(" · ")) + "</span></div>" : "") +
        (thich.length ? '<div class="gk-line"><span class="gk-key">Muốn có trong cảnh</span><span>' + esc(thich.map((x) => x.ten).join(", ")) + "</span></div>" : "") +
        (g.luatCanh ? '<div class="gk-line"><span class="gk-key">Luật riêng</span><span>' + esc(g.luatCanh) + "</span></div>" : "") +
        (g.danhXung ? '<div class="gk-line"><span class="gk-key">Xưng hô</span><span>' + esc(g.danhXung) + "</span></div>" : "") +
        (g.gioiHanCung ? '<div class="gk-line"><span class="gk-key">Giới hạn cứng</span><span class="gk-hard">' + esc(g.gioiHanCung) + "</span></div>" : "") +
        (g.gioiHanMem ? '<div class="gk-line"><span class="gk-key">Giới hạn mềm</span><span>' + esc(g.gioiHanMem) + "</span></div>" : "") +
        (g.khongKhi ? '<div class="gk-line"><span class="gk-key">Bối cảnh</span><span>' + esc(g.khongKhi) + "</span></div>" : "") +
        (g.chamSocSau ? '<div class="gk-line"><span class="gk-key">Chăm sóc sau</span><span>' + esc(g.chamSocSau) + "</span></div>" : "") +
        (coVai.length
          ? '<div class="gk-line"><span class="gk-key">Vai của nhân vật</span><span>' + esc(coVai.map((c) => c.ten + " (" + c.vaiBdsm + ")").join(", ")) + "</span></div>"
          : '<div class="hint">Chưa nhân vật nào được ghi vai Dom/Sub — mở nhân vật để ghi cho rõ.</div>') +
      "</div>"
    );
  })();

  const dsLore = loreCua(story).entries;
  const lbPanel =
    '<div class="panel lb-panel">' +
      '<div class="panel-head"><h3>' + icon("book", 16) + " Sổ tri thức (" + dsLore.length + ")</h3>" +
      (dsLore.length
        ? '<button class="btn btn-sm" data-act="open-lorebook">Mở sổ</button>'
        : '<button class="btn btn-sm btn-primary" data-act="open-lorebook">' + icon("upload", 13) + " Nạp lorebook</button>") +
      "</div>" +
      (dsLore.length
        ? '<ul class="lb-mini">' + dsLore.slice(0, 5).map((e) =>
            '<li class="' + (e.bat ? "" : "off") + '">' + esc(e.ghiChu) +
            '<span class="lb-mini-keys">' + esc(e.keys.slice(0, 3).join(", ")) + "</span></li>").join("") +
          "</ul>" +
          (dsLore.length > 5 ? '<div class="hint">… và ' + (dsLore.length - 5) + " mục nữa.</div>" : "") +
          '<div class="hint">AI chỉ đọc những mục có từ khoá xuất hiện trong cảnh đang diễn ra.</div>'
        : '<div class="hint">Nạp một file lorebook (JSON, chuẩn World Info / SillyTavern) để AI có sẵn kiến thức nền: địa danh, tổ chức, nhân vật phụ, luật lệ… Chỉ những mục khớp từ khoá mới được gửi kèm, nên sổ dài cũng không tốn ngữ cảnh.</div>') +
    "</div>";

  const ddNow = daoDienOf(story);
  const ddPanel = ddNow.bat
    ? (() => {
        const dsH = ddNow.huong.filter((h) => h.trangThai !== "huy");
        const dangChay = dsH.filter((h) => h.trangThai === "hoatDong").length;
        const soDC = ddNow.dinhChinh.filter((x) => !x.xoa && x.bat !== false).length;
        const cuoi = dsH
          .map((h) => TS.tienDoCuoi(h, null))
          .filter(Boolean)
          .sort((a, b) => (b.luc || 0) - (a.luc || 0))[0];
        return (
          '<div class="panel dd-panel">' +
            '<div class="panel-head"><h3>' + icon("clapper", 16) + " Chế độ Đạo diễn</h3>" +
            '<button class="btn btn-sm" data-act="open-dao-dien">' + icon("sliders", 13) + " Mở</button></div>" +
            '<div class="dd-line"><span class="dd-key">Hướng đang hoạt động</span><span class="dd-val">' + dangChay + "/" + dsH.length + "</span></div>" +
            '<div class="dd-line"><span class="dd-key">Đính chính đang bật</span><span class="dd-val">' + soDC + "</span></div>" +
            (cuoi ? '<div class="dd-line"><span class="dd-key">Tiến độ gần nhất</span><span class="dd-val">' + esc(TS.nhanTienDo(cuoi.trangThai)) + "</span></div>" : "") +
            '<div class="hint">Chỉ mình bạn thấy màn này. Đính chính sửa nhận định AI rút ra sai mà không viết lại lịch sử; hướng phát triển chỉ là đích tương lai, và tiến độ chỉ được ghi khi bạn duyệt ở Khép cảnh.</div>' +
          "</div>"
        );
      })()
    : "";

  const dsAnh = anhCua(story);
  const thuVienAnh =
    '<div class="panel anh-panel">' +
      '<div class="panel-head"><h3>' + icon("image", 16) + " Thư viện ảnh (" + dsAnh.length + ")</h3>" +
      (dsAnh.length ? '<button class="btn btn-sm" data-act="open-anh-lib">Mở tất cả</button>' : "") + "</div>" +
      (dsAnh.length
        ? '<div class="anh-grid">' + dsAnh.slice(0, 6).map((a) =>
            '<button class="anh-thumb" data-act="open-anh-lib" data-id="' + esc(a.id) + '" title="' + esc(a.chuThich || "Ảnh cảnh") + '">' +
            anhHolder(a, "thumb") + "</button>").join("") + "</div>" +
          '<div class="hint anh-note">Bấm vào một khung hình để mở thư viện. Muốn dựng thêm, mở một hội thoại và bấm nút ảnh ở thanh trên cùng.</div>'
        : '<div class="hint">Mở một hội thoại, rồi bấm nút ảnh ở thanh trên cùng — AI sẽ đọc cảnh đang diễn ra và dựng một khung hình cho đúng khoảnh khắc đó. Ảnh được lưu ngay trong máy bạn.</div>') +
    "</div>";

  const bns = (story.bienNienSu || []).slice(-6).reverse();

  const bienNien =
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("scroll", 16) + " Biên niên sử</h3>" +
      '<button class="btn btn-sm" data-act="open-chronicle">Mở tất cả</button></div>' +
      (bns.length
        ? '<ul class="chronicle">' + bns.map((b) => "<li>" + esc(b.noiDung) + "</li>").join("") + "</ul>"
        : '<div class="hint">Những sự kiện quan trọng sẽ được ghi vào đây — chúng luôn được gửi kèm cho AI ở mọi hội thoại, giúp cả thế giới nhớ chung một câu chuyện.</div>') +
    "</div>";

  return '<div class="dashboard">' + navQuayLai(story) + hero +
    '<div class="dash-grid">' +
      '<div class="dash-col">' + hanhTrinh + roiChuong + tongQuan + "</div>" +
      '<div class="dash-col">' + nhanVat + ddPanel + lbPanel + gkPanel + thuVienAnh + bienNien + "</div>" +
    "</div></div>";
}

// -------------------------------------------------------------- khung chat
// ==========================================================================
//  KHÉP CẢNH — AI đọc lại cảnh MỘT lần, người chơi duyệt rồi mới ghi
// ==========================================================================
function catNgan(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
}

// Những nhân vật "liên quan" tới đoạn cần khép: người đang có mặt, nhân vật của cảnh
// riêng, và những ai đã lên tiếng trong đoạn.
function idsCuaDoan(story, conv, doan) {
  const ra = [];
  const them = (id) => {
    if (id && id !== TS.ID_NGUOI && story.nhanVats.some((c) => c.id === id) && ra.indexOf(id) < 0) ra.push(id);
  };
  for (const id of hienDienCua(story, conv)) them(id);
  them(canhRiengCua(conv));
  for (const m of doan || []) {
    if (!m || m.vai !== "ai") continue;
    const ids = Array.isArray(m.nvIds) && m.nvIds.length ? m.nvIds : (m.nvId ? [m.nvId] : []);
    for (const id of ids) them(id);
  }
  return ra;
}

function tenChieu(chieu) {
  const x = TS.CHIEU.find((c) => c.id === chieu);
  return x ? x.ten : "";
}

function tenTruong(tr) {
  const x = TS.TRUONG.find((c) => c.id === tr);
  return x ? x.ten : "";
}

function chipBietHtml(story, conv, biet) {
  const ds = [{ id: TS.ID_NGUOI, ten: layNguoiChoi(story) }].concat(
    story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0)
  );
  return (
    '<div class="khep-biet"><span class="khep-biet-lbl">Ai biết:</span>' +
    ds.map((x) => '<button type="button" class="chip khep-biet-chip' + ((biet || []).indexOf(x.id) >= 0 ? " on" : "") + '" data-nv="' + esc(x.id) + '">' + esc(x.ten) + "</button>").join("") +
    "</div>"
  );
}

function mucKyUcHtml(story, conv, k, rieng) {
  return (
    '<div class="khep-muc" data-loai="kyuc" data-id="' + esc(k.id || TS.ma("ku")) + '">' +
      '<label class="khep-chon" title="Giữ ký ức này"><input type="checkbox" data-k="chon" checked></label>' +
      '<div class="khep-muc-body">' +
        '<textarea class="input" data-k="noidung" rows="2" placeholder="Một câu ngắn về điều sẽ còn ảnh hưởng về sau">' + esc(k.noiDung || "") + "</textarea>" +
        chipBietHtml(story, conv, (k.biet || []).length ? k.biet : TS.aiBietMacDinh([], rieng)) +
      "</div>" +
    "</div>"
  );
}

function mucQuanHeHtml(story, conv, x) {
  const laChu = x.chieu === "chuaNoi";
  return (
    '<div class="khep-muc" data-loai="quanhe" data-id="' + esc(x.id || TS.ma("qh")) + '"' +
      ' data-tu="' + esc(x.tu) + '" data-den="' + esc(x.den) + '" data-chieu="' + esc(x.chieu) + '"' +
      ' data-huong="' + (Number(x.huong) < 0 ? -1 : 1) + '" data-buoc="' + (Math.abs(Number(x.buoc)) || 1) + '">' +
      '<label class="khep-chon" title="Duyệt thay đổi này"><input type="checkbox" data-k="chon" checked></label>' +
      '<div class="khep-muc-body">' +
        '<div class="khep-head">' +
          '<span class="khep-cap">' + esc(TS.tenGoi(story, x.tu)) + " → " + esc(TS.tenGoi(story, x.den)) + "</span>" +
          '<span class="khep-chip' + (laChu ? " khep-chua-noi" : "") + '">' +
            (laChu ? "Điều chưa nói" : esc(tenChieu(x.chieu)) + " " + (Number(x.huong) < 0 ? "↓" : "↑")) +
          "</span>" +
        "</div>" +
        (laChu ? '<textarea class="input" data-k="moi" rows="2" placeholder="Điều người này đang giữ trong lòng">' + esc(x.moi || "") + "</textarea>" : "") +
        '<input class="input" data-k="lydo" value="' + esc(x.lyDo || "") + '" placeholder="Vì… (hành động cụ thể trong cảnh)">' +
      "</div>" +
    "</div>"
  );
}

function mucNhanVatHtml(story, conv, x) {
  return (
    '<div class="khep-muc" data-loai="nhanvat" data-id="' + esc(x.id || TS.ma("nvz")) + '" data-nv="' + esc(x.nvId) + '" data-truong="' + esc(x.truong) + '">' +
      '<label class="khep-chon" title="Duyệt thay đổi này"><input type="checkbox" data-k="chon" checked></label>' +
      '<div class="khep-muc-body">' +
        '<div class="khep-head"><span class="khep-cap">' + esc(TS.tenGoi(story, x.nvId)) + '</span><span class="khep-truong">' + esc(tenTruong(x.truong)) + "</span></div>" +
        (x.cu ? '<div class="khep-cu">Cũ: ' + esc(x.cu) + "</div>" : "") +
        '<textarea class="input" data-k="moi" rows="2" placeholder="Hướng mới">' + esc(x.moi || "") + "</textarea>" +
        '<input class="input" data-k="lydo" value="' + esc(x.lyDo || "") + '" placeholder="Vì… (bằng chứng trong cảnh)">' +
      "</div>" +
    "</div>"
  );
}

function theKhepHtml(story, conv, phieu, rieng, huongLQ) {
  const mucKyUc = (phieu.kyUc || []).map((k) => mucKyUcHtml(story, conv, k, rieng)).join("");
  const mucQuanHe = (phieu.quanHe || []).map((x) => mucQuanHeHtml(story, conv, x)).join("");
  const mucNhanVat = (phieu.nhanVat || []).map((x) => mucNhanVatHtml(story, conv, x)).join("");
  const dsHuong = Array.isArray(huongLQ) ? huongLQ : [];
  const mucTienDoHtml2 = dsHuong
    .map((h) => mucTienDoHtml(story, conv, h, (phieu.tienDo || []).find((x) => x.huongId === h.id)))
    .join("");
  return (
    '<div class="khep-the">' +
      '<div class="confirm-text">Chỉ những gì bạn duyệt ở đây mới trở thành sự thật lâu dài. Bạn sửa được mọi dòng, ' +
        "bỏ chọn từng mục, hoặc huỷ toàn bộ. Đây chỉ là kết thúc một nhịp cảnh — không kết thúc chương hay hội thoại.</div>" +
      '<label class="field-label">Tóm tắt cảnh</label>' +
      '<textarea class="input" data-k="tomTat" rows="3" placeholder="Cảnh này đã xảy ra chuyện gì">' + esc(phieu.tomTat || "") + "</textarea>" +
      '<label class="field-label">Ký ức nên giữ' + ((phieu.kyUc || []).length ? "" : " — AI không thấy điều gì đáng giữ") + "</label>" +
      '<div class="khep-list" data-k="ds-kyuc">' + mucKyUc + "</div>" +
      '<button type="button" class="btn btn-sm" data-k="them-kyuc">' + icon("plus", 13) + " Thêm ký ức</button>" +
      '<label class="field-label">Thay đổi quan hệ' + ((phieu.quanHe || []).length ? "" : " — không có bằng chứng nào") + "</label>" +
      '<div class="khep-list" data-k="ds-quanhe">' + (mucQuanHe || '<div class="hint">Không đề xuất thay đổi quan hệ.</div>') + "</div>" +
      '<label class="field-label">Phát triển nhân vật' + ((phieu.nhanVat || []).length ? "" : " — không có bằng chứng nào") + "</label>" +
      '<div class="khep-list" data-k="ds-nhanvat">' + (mucNhanVat || '<div class="hint">Không đề xuất thay đổi nội tâm.</div>') + "</div>" +
      '<label class="field-label">Móc cảnh tiếp theo (gợi ý, để trống nếu không cần)</label>' +
      '<input class="input" data-k="moc" value="' + esc(phieu.moc || "") + '" placeholder="Ví dụ: sáng hôm sau, một người lạ gõ cửa">' +
      (dsHuong.length
        ? '<label class="field-label">Tiến độ Đạo diễn' +
          ((phieu.tienDo || []).length ? "" : " — cảnh này chưa cho thấy bước tiến nào") + "</label>" +
          '<div class="khep-list" data-k="ds-tiendo">' + mucTienDoHtml2 + "</div>" +
          '<div class="hint">Tiến độ là lịch sử riêng của chỉ đạo, không phải ký ức của nhân vật. Chỉ những dòng bạn giữ lại mới được ghi, và chỉ sau khi bấm <b>Duyệt &amp; khép cảnh</b>.</div>'
        : "") +
    "</div>"
  );
}

// Đọc lại đúng những gì người chơi đã sửa/bỏ chọn trên thẻ.
function docTheKhep(scope, rieng) {
  const mot = (n, sel) => n.querySelector(sel);
  const ds = (sel) => Array.from(scope.querySelectorAll(sel));
  const tomTat = catNgan((mot(scope, '[data-k="tomTat"]') || {}).value, 1200);
  const moc = String((mot(scope, '[data-k="moc"]') || {}).value || "").trim();
  const kyUc = ds('[data-loai="kyuc"]')
    .filter((n) => mot(n, '[data-k="chon"]').checked)
    .map((n) => ({
      id: n.dataset.id,
      noiDung: String((mot(n, '[data-k="noidung"]') || {}).value || "").trim(),
      biet: Array.from(n.querySelectorAll(".khep-biet-chip.on")).map((b) => b.dataset.nv),
      rieng: rieng || "",
    }))
    .filter((k) => k.noiDung);
  const quanHe = ds('[data-loai="quanhe"]')
    .filter((n) => mot(n, '[data-k="chon"]').checked)
    .map((n) => {
      const o = {
        id: n.dataset.id || TS.ma("qh"),
        tu: n.dataset.tu,
        den: n.dataset.den,
        chieu: n.dataset.chieu,
        huong: Number(n.dataset.huong) < 0 ? -1 : 1,
        buoc: Math.abs(Number(n.dataset.buoc)) || 1,
        moi: "",
        lyDo: String((mot(n, '[data-k="lydo"]') || {}).value || "").trim(),
      };
      const ta = mot(n, '[data-k="moi"]');
      if (ta) o.moi = String(ta.value || "").trim();
      return o;
    })
    .filter((x) => x.tu && x.den && x.chieu && (x.chieu !== "chuaNoi" || x.moi));
  const nhanVat = ds('[data-loai="nhanvat"]')
    .filter((n) => mot(n, '[data-k="chon"]').checked)
    .map((n) => ({
      id: n.dataset.id || TS.ma("nvz"),
      nvId: n.dataset.nv,
      truong: n.dataset.truong,
      cu: String((mot(n, ".khep-cu") || {}).textContent || "").replace(/^Cũ:\s*/, "").trim(),
      moi: String((mot(n, '[data-k="moi"]') || {}).value || "").trim(),
      lyDo: String((mot(n, '[data-k="lydo"]') || {}).value || "").trim(),
    }))
    .filter((x) => x.nvId && x.truong && x.moi);
  const tienDo = ds('[data-loai="tiendo"]')
    .map((n) => ({
      huongId: n.dataset.id,
      chon: !!(mot(n, '[data-k="chon"]') || {}).checked,
      trangThai: String((mot(n, '[data-k="trangthai"]') || {}).value || "chuaCham"),
      bangChung: String((mot(n, '[data-k="bangchung"]') || {}).value || "").trim(),
      buocTiep: String((mot(n, '[data-k="buoctiep"]') || {}).value || "").trim(),
      hoanTat: !!(mot(n, '[data-k="hoantat"]') || {}).checked,
    }))
    .filter((x) => x.chon && x.huongId);
  return { tomTat, moc, kyUc, quanHe, nhanVat, tienDo };
}

// Mở thẻ duyệt khép cảnh. Gọi AI đúng MỘT lần, cho phần tin nhắn kể từ cảnh đã khép
// gần nhất; sau đó mọi thứ nằm trong tay người chơi.
async function openKhepCanh() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  if (app.streaming) {
    toast("AI đang viết — dừng lại rồi hãy khép cảnh.", "error");
    return;
  }
  if (app.khepDangMo) return;
  const msgs = getMessages(conv.id).slice();
  const tu = TS.mocBatDau(story, conv, msgs);
  const doan = msgs.slice(tu);
  if (!doan.length) {
    toast("Chưa có gì mới để khép kể từ cảnh trước.", "error");
    return;
  }
  const rieng = canhRiengCua(conv);
  const ids = idsCuaDoan(story, conv, doan);
  // Hướng Đạo diễn liên quan tới cảnh này: chỉ những hướng này mới được AI đề xuất
  // tiến độ, và chỉ khi người chơi giữ lại dòng đó thì tiến độ mới được ghi.
  const huongLQ = TS.huongLienQuan(story, conv, ids);
  app.khepDangMo = true;
  const body = el("div");
  body.innerHTML =
    '<div class="khep-loading"><span class="typing"><i></i><i></i><i></i></span> Đang đọc lại cảnh để chuẩn bị khép…</div>';
  const m = modal({
    title: "Khép cảnh",
    subtitle: doan.length + " tin nhắn kể từ cảnh đã khép gần nhất",
    wide: true,
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  let phieu = null;
  try {
    const res = await AI.khepCanh({ story, conv, messages: doan, ids });
    phieu = AI.docPhieu(res.text, { story, conv, messages: doan, rieng, huong: huongLQ });
  } catch (e) {
    console.error(e);
    app.khepDangMo = false;
    body.innerHTML = '<div class="confirm-text">' + esc((e && e.message) || "Không đọc được cảnh này.") + "</div>";
    const thu = document.createElement("button");
    thu.className = "btn btn-primary";
    thu.style.marginTop = "0.6rem";
    thu.textContent = "Thử lại";
    thu.onclick = () => { m.close(); openKhepCanh(); };
    body.appendChild(thu);
    return;
  }
  app.khepDangMo = false;
  body.innerHTML = theKhepHtml(story, conv, phieu, rieng, huongLQ);
  body.addEventListener("change", (e) => {
    // "Có thể hoàn tất" mới mở ô xác nhận hoàn tất — AI không bao giờ tự hoàn tất.
    const sel = e.target.closest('[data-k="trangthai"]');
    if (!sel) return;
    const muc = sel.closest('[data-loai="tiendo"]');
    const lb = muc ? muc.querySelector(".khep-hoantat") : null;
    if (lb) lb.hidden = sel.value !== "coTheHoanTat";
  });
  body.addEventListener("click", (e) => {
    const chip = e.target.closest(".khep-biet-chip");
    if (chip) { chip.classList.toggle("on"); return; }
    if (e.target.closest('[data-k="them-kyuc"]')) {
      const list = body.querySelector('[data-k="ds-kyuc"]');
      if (!list) return;
      const holder = el("div");
      holder.innerHTML = mucKyUcHtml(story, conv, { id: TS.ma("ku"), noiDung: "", biet: TS.aiBietMacDinh([], rieng) }, rieng);
      const item = holder.firstElementChild;
      list.appendChild(item);
      const ta = item.querySelector('[data-k="noidung"]');
      if (ta) ta.focus();
    }
  });
  const nut = document.createElement("button");
  nut.className = "btn btn-primary";
  nut.textContent = "Duyệt & khép cảnh";
  nut.onclick = async () => {
    const duyet = docTheKhep(body, rieng);
    if (!duyet.tomTat && !duyet.kyUc.length && !duyet.quanHe.length && !duyet.nhanVat.length && !duyet.tienDo.length) {
      toast("Chưa có gì để lưu — hãy giữ ít nhất một mục hoặc viết tóm tắt.", "error");
      return;
    }
    nut.disabled = true;
    nut.textContent = "Đang lưu…";
    const ok = await apDungKhep(story, conv, duyet, msgs, tu);
    if (!ok) {
      // Không lưu được: giữ nguyên thẻ và mọi nội dung người chơi vừa duyệt.
      nut.disabled = false;
      nut.textContent = "Duyệt & khép cảnh";
      toast("Không lưu được cảnh đã khép — nội dung bạn duyệt vẫn còn nguyên.", "error");
      return;
    }
    m.close();
    toast("Đã khép cảnh.");
    render();
  };
  m.footEl.appendChild(nut);
}

// Ghi một cảnh đã duyệt: append bản ghi cảnh + dòng "Đã khép cảnh" vào dòng thời gian,
// rồi lưu MỘT lần. Trạng thái nhập vai được tính ra từ bản ghi này nên không có
// trạng thái nửa vời: lưu lỗi thì trả lại nguyên trạng.
async function apDungKhep(story, conv, duyet, msgs, tu) {
  const doan = (msgs || []).slice(tu);
  const dau = doan[0] || null;
  const cuoi = doan[doan.length - 1] || null;
  const canh = TS.taoCanh(story, conv, Object.assign({}, duyet, {
    tuMsgId: dau ? dau.id : "",
    denMsgId: cuoi ? cuoi.id : "",
    tuLuc: dau ? dau.luc : Date.now(),
    denLuc: cuoi ? cuoi.luc : Date.now(),
  }));
  const snap = JSON.parse(JSON.stringify({
    canhDaKhep: story.canhDaKhep || [],
    goiKhep: conv.goiKhep,
    daoDien: story.daoDien || null,
  }));
  const khoiPhuc = () => {
    story.canhDaKhep = snap.canhDaKhep;
    conv.goiKhep = snap.goiKhep;
    if (snap.daoDien) story.daoDien = snap.daoDien;
    else delete story.daoDien;
  };
  story.canhDaKhep = (story.canhDaKhep || []).concat([canh]);
  conv.goiKhep = false;
  // Tiến độ Đạo diễn: chỉ ghi những dòng người chơi đã giữ lại trên thẻ, gắn với đúng
  // cảnh vừa khép. AI không bao giờ tự đánh dấu hoàn tất — phải có ô xác nhận.
  const dd = daoDienOf(story);
  for (const x of duyet.tienDo || []) {
    const h = dd.huong.find((y) => y.id === x.huongId);
    if (!h) continue;
    h.tienDo = (Array.isArray(h.tienDo) ? h.tienDo : []).concat([
      TS.taoTienDo({ htId: conv.id, canhId: canh.id, trangThai: x.trangThai, bangChung: x.bangChung, buocTiep: x.buocTiep }),
    ]);
    if (h.tienDo.length > 60) h.tienDo = h.tienDo.slice(-60);
    if (x.hoanTat) h.trangThai = "hoanTat";
    h.suaLuc = Date.now();
  }
  const dong = "⏸ Đã khép cảnh — " + (canh.tomTat ? catNgan(canh.tomTat, 240) : "(không có tóm tắt)");
  const msg = makeMessage("he", dong, { khep: canh.id });
  const arr = await themTinNhan(conv.id, msg);
  if (!arr) {
    khoiPhuc();
    return false;
  }
  capNhatConv(conv, arr);
  if (!(await luuTruyen(story, "cảnh đã khép"))) {
    khoiPhuc();
    const msgs2 = getMessages(conv.id).filter((x) => x.id !== msg.id);
    try { await replaceMessages(conv.id, msgs2); } catch (e) { /* đã báo lỗi chính */ }
    capNhatConv(conv, msgs2);
    return false;
  }
  return true;
}

// Cảnh đã khép bị ảnh hưởng khi sửa/xoá/cắt lịch sử (để cảnh báo trước và vô hiệu sau).
function demCanhAnhHuong(story, conv, msgs, idx) {
  try { return TS.canhSauDiem(story, conv.id, msgs, idx).length; } catch (e) { return 0; }
}

// Cảnh báo ngắn trước một thao tác sẽ làm mất hiệu lực cảnh đã duyệt.
async function hoiVoHieuCanh(story, conv, msgs, idx, viec) {
  const ds = TS.canhSauDiem(story, conv.id, msgs, idx);
  if (!ds.length) return true;
  const list = ds.slice(0, 3).map((c) => "“" + catNgan(c.tomTat || "(không có tóm tắt)", 50) + "”").join(", ");
  const them = ds.length > 3 ? " và " + (ds.length - 3) + " cảnh nữa" : "";
  return await hoiXacNhan(
    "Ảnh hưởng tới cảnh đã khép",
    viec + " sẽ vô hiệu và hoàn tác " + ds.length + " cảnh đã khép (" + list + them +
      ") cùng mọi thay đổi quan hệ, ký ức và nội tâm sinh ra từ đó. Tiếp tục?",
    { yesLabel: "Vô hiệu & tiếp tục", danger: true }
  );
}

function hoiXacNhan(title, message, opts = {}) {
  return new Promise((res) => {
    let xongRoi = false;
    const xong = (v) => { if (!xongRoi) { xongRoi = true; res(v); } };
    confirmModal(title, message, () => xong(true), Object.assign({}, opts, {
      onCancel: () => xong(false),
      onClose: () => setTimeout(() => xong(false), 0),
    }));
  });
}

// Xác nhận 18+ dùng CHUNG cho mọi đường bật lớp BDSM (giao kèo, Tạo nhanh, thể loại
// BDSM, file nhập, nút "Bật giao kèo"). Cửa này phải đi qua HỘP THOẠI, không được chỉ
// dựa vào một ô checkbox sẵn có hay một cờ nằm trong dữ liệu (file nhập / bản lưu cũ).
//
// `thongTin` (tuỳ chọn) = { seGhi: [nhân vật], chan: [{ten, lyDo}], moTa: "…" }.
// Khi biết danh sách nhân vật, hộp PHẢI liệt kê TÊN từng nhân vật sẽ được ghi cờ
// `nguoiLon`, và nêu RIÊNG những nhân vật không được ghi cờ kèm lý do — người dùng xác
// nhận đúng danh sách đó.
function xacNhan18Plus(lyDo, thongTin) {
  const tt = thongTin || {};
  const seGhi = Array.isArray(tt.seGhi) ? tt.seGhi : [];
  const chan = Array.isArray(tt.chan) ? tt.chan : [];
  let them = "";
  if (seGhi.length) {
    them +=
      '<div class="confirm-text"><b>Sẽ ghi cờ “Người trưởng thành (18+)” cho ' + seGhi.length + " nhân vật:</b><br>" +
      esc(seGhi.map((c) => (c && c.ten) || "(không tên)").join(", ")) +
      "<br>Bạn xác nhận ĐÚNG danh sách này đều là người trưởng thành?</div>";
  } else if (tt.daCoDanhSach) {
    them += '<div class="confirm-text">Không có nhân vật nào mới cần ghi cờ.</div>';
  }
  if (chan.length) {
    them +=
      '<div class="confirm-text confirm-chan"><b>KHÔNG ghi cờ cho ' + chan.length + " nhân vật (phải sửa trước):</b><br>" +
      chan.map((x) => esc(x.ten) + " — " + esc(x.lyDo)).join("<br>") +
      "<br>Hãy sửa tuổi hoặc mô tả của những nhân vật này, rồi bật lại lớp nội dung người lớn.</div>";
  }
  if (tt.moTa) them += '<div class="confirm-text">' + esc(tt.moTa) + "</div>";
  return new Promise((res) => {
    let xongRoi = false;
    const xong = (v) => { if (!xongRoi) { xongRoi = true; res(v); } };
    modal({
      title: "Nội dung dành cho người lớn",
      body:
        '<div class="confirm-text">' +
        esc((lyDo ? lyDo + " " : "") + "Giao kèo là lớp nội dung BDSM dành cho người lớn. Trước khi bật, bạn cần xác nhận rằng mọi nhân vật trong truyện này đều là người trưởng thành (18+), và bạn cũng là người trưởng thành.") +
        "</div>" + them,
      dismissable: true,
      onClose: () => setTimeout(() => xong(false), 0),
      actions: [
        { label: "Huỷ", onClick: (m2) => { m2.close(); xong(false); } },
        { label: "Tôi xác nhận 18+", primary: true, onClick: (m2) => { m2.close(); xong(true); } },
      ],
    });
  });
}

// Cửa 18+ cấp TRUYỆN có liệt kê tên: gọi khi ĐÃ biết danh sách nhân vật (lúc tạo truyện,
// lúc bật giao kèo từ hộp nhân vật, lúc lưu giao kèo, lúc nhập file). Trả về lời xác nhận
// và danh sách đã chốt để người gọi ghi cờ đúng những người vừa được liệt kê.
async function xacNhan18PlusTruyen(lyDo, nhanVats, moTa) {
  const seGhi = dsSeGhiCoNguoiLon({ nhanVats });
  const chan = dsChanGhiCo({ nhanVats });
  const dongY = await xacNhan18Plus(lyDo, { seGhi, chan, daCoDanhSach: true, moTa });
  return { dongY, seGhi, chan };
}

// Vô hiệu + hoàn tác mọi cảnh đã khép nằm ở/ sau điểm vừa sửa. Trả về số cảnh bị vô hiệu.
function voHieuCanhTuDiem(story, conv, msgs, idx) {
  const ds = TS.canhSauDiem(story, conv.id, msgs, idx);
  if (!ds.length) return 0;
  const ids = ds.map((c) => c.id);
  TS.voHieuCanh(story, ids);
  // bỏ luôn dòng "Đã khép cảnh" của những cảnh vừa bị vô hiệu
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i] && msgs[i].khep && ids.indexOf(msgs[i].khep) >= 0) msgs.splice(i, 1);
  }
  return ds.length;
}

// ==========================================================================
//  CHẾ ĐỘ ĐẠO DIỄN — xem trạng thái ẩn, đính chính, đặt hướng tương lai
// ==========================================================================
// Ba thứ PHẢI tách bạch, cả trong dữ liệu lẫn trên màn hình:
//   • SỰ THẬT HIỆN TẠI = kết quả `TS.tinhTrangThai()` (cảnh đã duyệt + đính chính đang bật).
//   • ĐÍNH CHÍNH       = lớp phủ tắt/xoá được, KHÔNG sửa lịch sử và không phải cảnh giả.
//   • HƯỚNG TƯƠNG LAI  = chỉ đạo kể chuyện, không phải sự thật, chỉ vào prompt như một đích.
// Mọi thao tác ghi đi qua `ddLuu()`: người gọi chụp `ddTruoc(story)` TRƯỚC khi sửa rồi
// truyền vào; ghi hỏng thì trả lại nguyên trạng — không bao giờ để lại dữ liệu nửa chừng.
function ddOf(story) {
  return daoDienOf(story);
}

function ddTenNv(story, id) {
  if (id === TS.ID_NGUOI) return layNguoiChoi(story);
  const c = nvCuaId(story, id);
  return c ? c.ten : "?";
}

async function ddLuu(story, viec, truoc) {
  const ok = await luuTruyen(story, viec || "Chế độ Đạo diễn");
  if (!ok && truoc) story.daoDien = truoc;
  return ok;
}

// Chụp trạng thái Đạo diễn TRƯỚC khi sửa. Phải chụp trước, vì khi ghi hỏng thì khôi
// phục bằng chính ảnh chụp này — ảnh chụp lúc đã sửa xong thì khôi phục vô nghĩa.
function ddTruoc(story) {
  return JSON.parse(JSON.stringify(story.daoDien || {}));
}

function ddSoCanhMacDinh(story) {
  const n = TS.nhipCua(story).id;
  return n === "cham" ? 5 : n === "kichTinh" ? 3 : 4;
}

function ddChipBiet(story, biet) {
  const ds = (biet || []).filter(Boolean);
  const ai = ds.filter((id) => id !== TS.ID_NGUOI);
  const ra = [];
  if (!ai.length) ra.push('<span class="chip dd-biet dd-biet-dao">Chỉ Đạo diễn biết</span>');
  else for (const id of ai) ra.push('<span class="chip dd-biet">' + esc(ddTenNv(story, id)) + " biết</span>");
  if (ds.indexOf(TS.ID_NGUOI) >= 0) ra.push('<span class="chip dd-biet dd-biet-nguoi">Người chơi đã biết</span>');
  return ra.join("");
}

function ddChipHuong(h) {
  return '<span class="chip dd-tt dd-tt-' + esc(h.trangThai) + '">' + esc(TS.nhanTrangThaiHuong(h.trangThai)) + "</span>";
}

// ------------------------------------------------------------------ tổng quan
function ddNhanVatHtml(story, conv, tt) {
  if (!story.nhanVats.length) return '<div class="hint">Chưa có nhân vật nào.</div>';
  return (
    '<div class="dd-grid">' +
    story.nhanVats
      .map((c) => {
        const t = tt.nv[c.id] || {};
        const dong = TS.TRUONG.map((tr) => {
          const v = String(t[tr.id] || "").trim();
          return (
            '<div class="dd-line"><span class="dd-key">' + esc(tr.ten) + '</span><span class="dd-val">' +
            (v ? fmt(catNgan(v, 240)) : '<span class="dd-empty">Chưa hình thành rõ</span>') +
            '</span><button class="dd-mini" data-act="dd-dinh-chinh-nv" data-id="' + esc(c.id) + '" data-truong="' + esc(tr.id) +
            '" title="Đính chính trường này — dùng khi AI rút ra sai">' + icon("edit", 12) + "</button></div>"
          );
        }).join("");
        const ky = TS.kyUcBiet(tt, c.id).slice(-3).reverse();
        return (
          '<div class="dd-card">' +
            '<div class="dd-card-head">' + avatarHtml(story, c, 26) + '<span class="dd-card-ten">' + esc(c.ten) + "</span></div>" +
            '<div class="dd-line"><span class="dd-key">Tính cách gốc</span><span class="dd-val">' +
              (c.tinhCach ? fmt(catNgan(c.tinhCach, 240)) : '<span class="dd-empty">chưa ghi</span>') + "</span></div>" +
            '<div class="dd-note">Tính cách gốc sửa ở editor nhân vật — đính chính không sửa được dòng này.</div>' +
            dong +
            (ky.length
              ? '<details class="dd-more"><summary>Ký ức gần nhất (' + ky.length + ")</summary>" +
                ky.map((k) => '<div class="dd-ky">' + fmt(catNgan(k.noiDung, 220)) + "<div>" + ddChipBiet(story, k.biet) + "</div></div>").join("") +
                "</details>"
              : "") +
          "</div>"
        );
      })
      .join("") +
    "</div>"
  );
}

function ddQuanHeHtml(story, conv, tt) {
  const ds = Object.keys(tt.quanHe)
    .map((k) => tt.quanHe[k])
    .filter((e) => e && e.tu && e.den && TS.coGiDangKe(tt, e.tu, e.den));
  if (!ds.length) {
    return '<div class="hint">Chưa có quan hệ nào khác mặc định. Quan hệ chỉ hình thành sau khi bạn duyệt ở Khép cảnh — hoặc sau khi bạn thêm một đính chính.</div>';
  }
  return (
    '<div class="dd-grid">' +
    ds.map((e) => {
      const nguoc = TS.quanHeCua(tt, e.den, e.tu);
      const chip = TS.CHIEU
        .filter((x) => TS.nhanMuc(x.id, e[x.id]) !== TS.nhanMuc(x.id, TS.MAC_DINH[x.id]))
        .map((x) => '<span class="chip dd-qh-chip">' + esc(x.ten + " " + TS.nhanMuc(x.id, e[x.id])) + "</span>");
      if (e.cangThang >= 3) chip.push('<span class="chip dd-qh-chip dd-qh-cang">Căng thẳng còn lại</span>');
      if (String(e.chuaNoi || "").trim()) chip.push('<span class="chip dd-qh-chip dd-qh-chua">Điều chưa nói</span>');
      if (nguoc) {
        const lech = TS.CHIEU.filter((x) => Number(nguoc[x.id]) !== Number(e[x.id]));
        if (lech.length) {
          const a = lech.find((x) => Number(e[x.id]) > Number(nguoc[x.id]));
          const b = lech.find((x) => Number(nguoc[x.id]) > Number(e[x.id]));
          const ve = a ? ddTenNv(story, e.tu) : ddTenNv(story, e.den);
          chip.push('<span class="chip dd-qh-chip dd-qh-lech">' + esc("Bất đối xứng · " + (a ? a.ten : b.ten).toLowerCase() + " nghiêng về " + ve) + "</span>");
        }
      }
      const bang = tt.canh
        .filter((c) => (c.quanHe || []).some((d) => d && d.tu === e.tu && d.den === e.den))
        .slice(-3)
        .reverse();
      return (
        '<div class="dd-card">' +
          '<div class="dd-card-head"><span class="dd-card-ten">' + esc(ddTenNv(story, e.tu) + " → " + ddTenNv(story, e.den)) + "</span>" +
            '<button class="dd-mini dd-mini-qh" data-act="dd-dinh-chinh-qh" data-tu="' + esc(e.tu) + '" data-den="' + esc(e.den) +
            '" title="Đính chính quan hệ này — dùng khi AI rút ra sai">' + icon("edit", 12) + "</button></div>" +
          '<div class="dd-chips-row">' + (chip.length ? chip.join("") : '<span class="dd-empty">chưa khác mặc định</span>') + "</div>" +
          (String(e.chuaNoi || "").trim() ? '<div class="dd-note">Điều chưa nói: ' + fmt(catNgan(e.chuaNoi, 200)) + "</div>" : "") +
          (bang.length
            ? '<details class="dd-more"><summary>Cơ sở: ' + bang.length + " cảnh đã duyệt</summary>" +
              bang.map((c) => {
                const d = (c.quanHe || []).find((x) => x && x.tu === e.tu && x.den === e.den) || {};
                return '<div class="dd-ky">' + fmt(catNgan(c.tomTat || "(không có tóm tắt)", 200)) +
                  (d.lyDo ? '<div class="dd-note">Vì: ' + fmt(catNgan(d.lyDo, 160)) + "</div>" : "") + "</div>";
              }).join("") +
              "</details>"
            : "") +
        "</div>"
      );
    }).join("") +
    "</div>"
  );
}

function ddBiMatHtml(story, tt, conv) {
  // Cố ý gom ký ức của TOÀN truyện (không chỉ hội thoại đang mở): đây là màn của
  // người viết, và ai-đang-biết-cái-gì không phải phép cộng nên không bị trùng khi
  // có nhánh. Mục đến từ tuyến khác được gắn nhãn để không gây nhầm lẫn.
  const cid = conv ? conv.id : "";
  const ds = [];
  for (const c of TS.canhHopLe(story)) {
    const ids = Array.isArray(c.htIds) && c.htIds.length ? c.htIds : (c.htId ? [c.htId] : []);
    const khac = !!cid && ids.indexOf(cid) < 0;
    const tenHt = khac ? ((story.hoiThoais.find((x) => x.id === ids[0]) || {}).tieuDe || "tuyến khác") : "";
    for (const k of c.kyUc || []) {
      if (!k || !String(k.noiDung || "").trim()) continue;
      ds.push({
        noiDung: String(k.noiDung).trim(),
        biet: Array.isArray(k.biet) ? k.biet : [TS.ID_NGUOI],
        rieng: k.rieng || "",
        tomTat: c.tomTat || "",
        luc: Number(c.luc) || 0,
        khac,
        tenHt,
      });
    }
  }
  ds.sort((a, b) => b.luc - a.luc);
  if (!ds.length) return '<div class="hint">Chưa có ký ức nào được duyệt.</div>';
  const mot = (k) =>
    '<div class="dd-ky">' + fmt(catNgan(k.noiDung, 240)) +
    (k.rieng ? '<span class="chip dd-biet dd-biet-rieng">' + icon("lock", 10) + " cảnh riêng</span>" : "") +
    (k.khac ? '<span class="chip dd-biet">tuyến khác: ' + esc(k.tenHt) + "</span>" : "") +
    "<div>" + ddChipBiet(story, k.biet) + "</div>" +
    (k.tomTat ? '<div class="dd-note">Từ cảnh: ' + fmt(catNgan(k.tomTat, 120)) + "</div>" : "") +
    "</div>";
  const dau = ds.slice(0, 5).map(mot).join("");
  const sau = ds.slice(5);
  return (
    '<div class="dd-note">Xem ở đây KHÔNG làm người chơi hay bất kỳ nhân vật nào tự biết bí mật. Bí mật vẫn chỉ vào prompt của người đã biết.</div>' +
    dau +
    (sau.length ? '<details class="dd-more"><summary>' + sau.length + " ký ức cũ hơn</summary>" + sau.map(mot).join("") + "</details>" : "")
  );
}

function ddDinhChinhHtml(story, conv) {
  const dd = ddOf(story);
  const ds = dd.dinhChinh || [];
  const bat = ds.filter((x) => !x.xoa && x.bat !== false);
  const tat = ds.filter((x) => x.xoa || x.bat === false);
  const mot = (dc) => {
    const ten =
      dc.loai === "nhanvat"
        ? ddTenNv(story, dc.nvId) + " — " + (TS.TRUONG.find((x) => x.id === dc.truong) || {}).ten
        : ddTenNv(story, dc.tu) + " → " + ddTenNv(story, dc.den) + " — " +
          (dc.chieu === "chuaNoi" ? "điều chưa nói" : (TS.CHIEU.find((x) => x.id === dc.chieu) || {}).ten);
    const canhBao = TS.canhBaoCoSo(story, dc)
      ? '<div class="dd-canh-bao">' + icon("alert", 12) + " Cơ sở đã thay đổi — cảnh gốc của nhận định này đã bị vô hiệu. Đính chính vẫn được giữ; xem lại rồi tắt nếu không còn đúng.</div>"
      : "";
    return (
      '<div class="dd-dc' + (dc.xoa || dc.bat === false ? " dd-dc-off" : "") + '">' +
        '<div class="dd-dc-head"><span class="dd-key">' + esc(ten) + "</span>" +
          (dc.xoa ? '<span class="chip dd-tt dd-tt-huy">đã xoá</span>' : dc.bat === false ? '<span class="chip dd-tt dd-tt-tamDung">đang tắt</span>' : "") + "</div>" +
        '<div class="dd-dc-moi">' + fmt(catNgan(dc.moi, 300)) + "</div>" +
        (dc.cu ? '<div class="dd-note">Cũ: ' + fmt(catNgan(dc.cu, 200)) + "</div>" : "") +
        (dc.lyDo ? '<div class="dd-note">Vì: ' + fmt(catNgan(dc.lyDo, 160)) + "</div>" : "") +
        canhBao +
        '<div class="dd-acts">' +
          (dc.xoa
            ? '<button class="btn btn-sm" data-act="dd-dc-hoi" data-id="' + esc(dc.id) + '">Khôi phục</button>'
            : '<button class="btn btn-sm" data-act="dd-dc-bat" data-id="' + esc(dc.id) + '">' + (dc.bat === false ? "Bật lại" : "Tắt") + "</button>") +
          '<button class="btn btn-sm" data-act="dd-dc-sua" data-id="' + esc(dc.id) + '">' + icon("edit", 12) + " Sửa</button>" +
          (dc.xoa ? "" : '<button class="btn btn-sm btn-danger" data-act="dd-dc-xoa" data-id="' + esc(dc.id) + '">' + icon("trash", 12) + " Xoá</button>") +
        "</div>" +
      "</div>"
    );
  };
  return (
    '<div class="dd-note">Đính chính chỉ sửa NHẬN ĐỊNH AI rút ra sai — không sửa tin nhắn, không sửa cảnh đã khép, không viết lại lịch sử. ' +
    "Muốn đổi tính cách gốc thì mở editor nhân vật; muốn đổi sự kiện đã xảy ra thì sửa tin nhắn hoặc tạo nhánh ở khung chat.</div>" +
    (bat.length ? bat.map(mot).join("") : '<div class="hint">Chưa có đính chính nào đang bật.</div>') +
    (tat.length ? '<details class="dd-more"><summary>Đã tắt / đã xoá (' + tat.length + ")</summary>" + tat.map(mot).join("") + "</details>" : "")
  );
}

function ddHuongHtml(story, conv) {
  const ds = TS.huongCua(story).filter((h) => h.trangThai !== "huy");
  const huy = TS.huongCua(story).filter((h) => h.trangThai === "huy");
  const mot = (h) => {
    const td = TS.tienDoCua(h, conv);
    const cuoi = td.length ? td[td.length - 1] : null;
    const canhBao = TS.tienDoCoCanhBao(story, h)
      ? '<div class="dd-canh-bao">' + icon("alert", 12) + " Cơ sở đã thay đổi — một cảnh ghi tiến độ đã bị vô hiệu. Tiến độ vẫn được giữ để bạn xem lại.</div>"
      : "";
    const dangChay = h.trangThai === "hoatDong";
    return (
      '<div class="dd-hd dd-hd-' + esc(h.trangThai) + '">' +
        '<div class="dd-hd-head"><span class="dd-card-ten">' + esc(h.ten || catNgan(h.mongMuon, 60)) + "</span>" + ddChipHuong(h) + "</div>" +
        '<div class="dd-chips-row">' +
          '<span class="chip dd-qh-chip">' + esc(TS.nhanPhamVi(h.phamVi)) + "</span>" +
          (h.phamVi !== "truyen" ? '<span class="chip dd-qh-chip">' + esc(TS.doiTuongHuong(story, h)) + "</span>" : "") +
          '<span class="chip dd-qh-chip">Nhịp ' + esc(TS.nhanNhipHuong(h.nhip).toLowerCase()) + " · ~" + h.soCanh + " cảnh</span>" +
          '<span class="chip dd-qh-chip">' + td.length + " bước đã ghi</span>" +
        "</div>" +
        '<div class="dd-hd-dich">' + fmt(catNgan(h.mongMuon, 300)) + "</div>" +
        (h.rangBuoc ? '<div class="dd-note">Không được phá vỡ: ' + fmt(catNgan(h.rangBuoc, 200)) + "</div>" : "") +
        (cuoi
          ? '<div class="dd-td-cuoi"><span class="chip dd-tt dd-tt-' + esc(cuoi.trangThai) + '">' + esc(TS.nhanTienDo(cuoi.trangThai)) + "</span>" +
            (cuoi.bangChung ? '<span class="dd-td-bc">' + fmt(catNgan(cuoi.bangChung, 200)) + "</span>" : "") + "</div>"
          : '<div class="dd-note">Chưa có bước tiến nào được ghi.</div>') +
        '<details class="dd-more"><summary>Kế hoạch cầu nối</summary>' +
          (h.keHoach.trangThaiDau ? '<div class="dd-note">Xuất phát: ' + fmt(catNgan(h.keHoach.trangThaiDau, 240)) + "</div>" : "") +
          (h.keHoach.mucTieu ? '<div class="dd-note">Mục tiêu: ' + fmt(catNgan(h.keHoach.mucTieu, 200)) + "</div>" : "") +
          (h.keHoach.buoc.length ? "<ol class=\"dd-buoc\">" + h.keHoach.buoc.map((s) => "<li>" + fmt(catNgan(s, 200)) + "</li>").join("") + "</ol>" : "") +
          (h.keHoach.dauHieu ? '<div class="dd-note">Dấu hiệu nhỏ: ' + fmt(catNgan(h.keHoach.dauHieu, 200)) + "</div>" : "") +
          (h.keHoach.dieuKienDung ? '<div class="dd-note">Điều kiện đổi hướng: ' + fmt(catNgan(h.keHoach.dieuKienDung, 200)) + "</div>" : "") +
          (h.keHoach.xungDot ? '<div class="dd-canh-bao">Xung đột: ' + fmt(catNgan(h.keHoach.xungDot, 240)) + "</div>" : "") +
        "</details>" +
        (td.length
          ? '<details class="dd-more"><summary>Lịch sử tiến độ (' + td.length + ")</summary>" +
            td.slice().reverse().map((e) => '<div class="dd-ky"><span class="chip dd-tt dd-tt-' + esc(e.trangThai) + '">' + esc(TS.nhanTienDo(e.trangThai)) + "</span> " +
              (e.bangChung ? fmt(catNgan(e.bangChung, 200)) : '<span class="dd-empty">không có bằng chứng</span>') +
              (e.buocTiep ? '<div class="dd-note">Bước tiếp: ' + fmt(catNgan(e.buocTiep, 160)) + "</div>" : "") +
              (!TS.canhConHieuLuc(story, e.canhId) ? '<div class="dd-note">(cảnh ghi bước này đã bị vô hiệu)</div>' : "") +
              "</div>").join("") +
            "</details>"
          : "") +
        canhBao +
        '<div class="dd-acts">' +
          '<button class="btn btn-sm" data-act="dd-hd-sua" data-id="' + esc(h.id) + '">' + icon("edit", 12) + " Sửa kế hoạch</button>" +
          (dangChay
            ? '<button class="btn btn-sm" data-act="dd-hd-tamdung" data-id="' + esc(h.id) + '">' + icon("pause", 12) + " Tạm dừng</button>"
            : h.trangThai === "tamDung"
              ? '<button class="btn btn-sm" data-act="dd-hd-tieptuc" data-id="' + esc(h.id) + '">' + icon("forward", 12) + " Tiếp tục</button>"
              : "") +
          (h.trangThai !== "hoanTat" ? '<button class="btn btn-sm" data-act="dd-hd-hoantat" data-id="' + esc(h.id) + '">' + icon("check", 12) + " Hoàn tất</button>" : "") +
          '<button class="btn btn-sm btn-danger" data-act="dd-hd-huy" data-id="' + esc(h.id) + '">' + icon("trash", 12) + " Huỷ hướng</button>" +
        "</div>" +
      "</div>"
    );
  };
  return (
    (ds.length ? ds.map(mot).join("") : '<div class="hint">Chưa có hướng nào. Bấm “Hướng mới” để đặt một đích phát triển tương lai — AI sẽ lập kế hoạch cầu nối để bạn duyệt trước.</div>') +
    (huy.length ? '<details class="dd-more"><summary>Hướng đã huỷ (' + huy.length + ")</summary>" + huy.map((h) => '<div class="dd-ky">' + esc(h.ten || h.mongMuon) + "</div>").join("") + "</details>" : "")
  );
}

function ddTongQuanHtml(story, conv) {
  const tt = TS.tinhTrangThai(story, conv);
  const dd = ddOf(story);
  const soHoatDong = dd.huong.filter((h) => h.trangThai === "hoatDong").length;
  const dsHt = story.hoiThoais || [];
  return (
    '<div class="dd-scope">' +
      '<label class="field-label">Xem theo hội thoại</label>' +
      (dsHt.length > 1
        ? '<select class="input" data-act="dd-doi-ht">' +
          dsHt.map((c) => '<option value="' + esc(c.id) + '"' + (conv && conv.id === c.id ? " selected" : "") + ">" + esc(c.tieuDe) + "</option>").join("") +
          "</select>"
        : '<div class="dd-note">' + esc(conv ? conv.tieuDe : "chưa có hội thoại nào") + "</div>") +
      '<div class="dd-note">Trạng thái nhân vật và quan hệ bên dưới tính từ cảnh đã duyệt của hội thoại này. Bí mật thì liệt kê cả truyện.</div>' +
    "</div>" +
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-fact">Sự thật hiện tại</span><h4>Nhân vật</h4></div>' +
      ddNhanVatHtml(story, conv, tt) +
    "</div>" +
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-fact">Sự thật hiện tại</span><h4>Quan hệ</h4></div>' +
      ddQuanHeHtml(story, conv, tt) +
    "</div>" +
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-fact">Sự thật hiện tại</span><h4>Bí mật &amp; ai đang biết</h4></div>' +
      ddBiMatHtml(story, tt, conv) +
    "</div>" +
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-dc">Đính chính</span><h4>Sửa nhận định sai</h4>' +
        '<button class="btn btn-sm" data-act="dd-dinh-chinh-moi">' + icon("plus", 13) + " Thêm</button></div>" +
      ddDinhChinhHtml(story, conv) +
    "</div>" +
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-huong">Hướng tương lai</span><h4>Hướng phát triển (' + soHoatDong + " đang hoạt động)</h4>" +
        '<button class="btn btn-sm btn-primary" data-act="dd-huong-moi">' + icon("plus", 13) + " Hướng mới</button></div>" +
      ddHuongHtml(story, conv) +
    "</div>" +
    vgNgoaiManHinhHtml(story)
  );
}

function openDaoDien() {
  const story = currentStory();
  if (!story) return;
  if (app.daoDienDangMo) return;
  app.daoDienDangMo = true;
  const convMo = currentConv();
  let convXem =
    convMo ||
    (story.hoiThoais || []).slice().sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0))[0] ||
    null;
  const body = el("div");
  const ve = () => {
    body.innerHTML = ddTongQuanHtml(story, convXem);
  };
  ve();
  const m = modal({
    title: "Chế độ Đạo diễn",
    subtitle: (convXem ? convXem.tieuDe : "cả truyện") + " · chỉ mình bạn thấy — không lộ ra chat",
    full: true,
    body,
    onClose: () => { app.daoDienDangMo = false; },
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });
  const veLai = () => { ve(); };
  body.addEventListener("change", (e) => {
    const sel = e.target.closest('select[data-act="dd-doi-ht"]');
    if (!sel) return;
    convXem = story.hoiThoais.find((c) => c.id === sel.value) || convXem;
    ve();
  });
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    const dd = ddOf(story);
    const tim = (id) => dd.huong.find((h) => h.id === id);
    if (act === "dd-dinh-chinh-nv") {
      await openSuaDinhChinh(story, convXem, { loai: "nhanvat", nvId: b.dataset.id, truong: b.dataset.truong }, veLai);
      return;
    }
    if (act === "dd-dinh-chinh-qh") {
      await openSuaDinhChinh(story, convXem, { loai: "quanhe", tu: b.dataset.tu, den: b.dataset.den }, veLai);
      return;
    }
    if (act === "dd-dinh-chinh-moi") {
      await openSuaDinhChinh(story, convXem, {}, veLai);
      return;
    }
    if (act === "dd-dc-sua") {
      const dc = dd.dinhChinh.find((x) => x.id === b.dataset.id);
      if (dc) await openSuaDinhChinh(story, convXem, { dc }, veLai);
      return;
    }
    if (act === "dd-dc-bat") {
      const dc = dd.dinhChinh.find((x) => x.id === b.dataset.id);
      if (dc) { const t = ddTruoc(story); dc.bat = dc.bat === false; if (!(await ddLuu(story, "bật/tắt đính chính", t))) dc.bat = !dc.bat; ve(); }
      return;
    }
    if (act === "dd-dc-hoi") {
      const dc = dd.dinhChinh.find((x) => x.id === b.dataset.id);
      if (dc) { const t = ddTruoc(story); dc.xoa = false; dc.xoaLuc = 0; if (!(await ddLuu(story, "khôi phục đính chính", t))) dc.xoa = true; ve(); }
      return;
    }
    if (act === "dd-dc-xoa") {
      const dc = dd.dinhChinh.find((x) => x.id === b.dataset.id);
      if (dc) { const t = ddTruoc(story); dc.xoa = true; dc.xoaLuc = Date.now(); if (!(await ddLuu(story, "xoá đính chính", t))) dc.xoa = false; ve(); }
      return;
    }
    if (act === "vg-muc") {
      const id = b.dataset.id;
      const muc = b.dataset.muc;
      const e = suKienCua(story).find((x) => x.id === id);
      if (e) {
        const truoc = JSON.parse(JSON.stringify(e));
        // Chỉnh tay = CHỐT mức: ghi vào mức gốc rồi bỏ các dấu hé lộ tự động, nếu không
        // sổ hé lộ sẽ tính lại thành "đã lộ" ngay sau đó và lựa chọn vừa bấm không dính.
        e.mucGoc = MUC.some((x) => x.id === muc) ? muc : "an";
        e.heLo = [];
        e.suaLuc = Date.now();
        // suKienCua ép lại quy tắc: đã lộ thì người chơi phải có trong danh sách biết.
        suKienCua(story);
        if (!(await luuTruyen(story, "mức hé lộ sự kiện"))) {
          const e2 = suKienCua(story).find((x) => x.id === id);
          if (e2) Object.assign(e2, truoc);
        }
        ve();
      }
      return;
    }
    if (act === "dd-huong-moi") {
      await openTaoHuong(story, convXem, veLai);
      return;
    }
    if (act === "dd-hd-sua") {
      const h = tim(b.dataset.id);
      if (h) await openSuaHuong(story, convXem, h, veLai);
      return;
    }
    if (act === "dd-hd-tamdung" || act === "dd-hd-tieptuc") {
      const h = tim(b.dataset.id);
      if (h) {
        const cu = h.trangThai;
        const t = ddTruoc(story);
        h.trangThai = act === "dd-hd-tamdung" ? "tamDung" : "hoatDong";
        h.suaLuc = Date.now();
        if (!(await ddLuu(story, "tạm dừng/tiếp tục hướng", t))) h.trangThai = cu;
        else toast(h.trangThai === "tamDung" ? "Đã tạm dừng hướng — lượt sau nó không còn vào prompt." : "Đã cho hướng chạy lại.");
        ve();
      }
      return;
    }
    if (act === "dd-hd-hoantat") {
      const h = tim(b.dataset.id);
      if (h) {
        const ok = await hoiXacNhan(
          "Hoàn tất hướng",
          "Đánh dấu “" + (h.ten || h.mongMuon) + "” là đã hoàn tất? Hướng sẽ ngừng được bơm vào prompt, nhưng lịch sử tiến độ vẫn được giữ nguyên.",
          { yesLabel: "Hoàn tất" }
        );
        if (ok) {
          const cu = h.trangThai;
          const t = ddTruoc(story);
          h.trangThai = "hoanTat";
          h.suaLuc = Date.now();
          if (!(await ddLuu(story, "hoàn tất hướng", t))) h.trangThai = cu;
          else toast("Đã đánh dấu hoàn tất.");
          ve();
        }
      }
      return;
    }
    if (act === "dd-hd-huy") {
      const h = tim(b.dataset.id);
      if (h) {
        const ok = await hoiXacNhan(
          "Huỷ hướng",
          "Huỷ “" + (h.ten || h.mongMuon) + "”? Hướng sẽ ngừng vào prompt ngay từ lượt sau. Lịch sử tiến độ vẫn được giữ để bạn hiểu điều gì từng được định hướng.",
          { yesLabel: "Huỷ hướng", danger: true }
        );
        if (ok) {
          const cu = h.trangThai;
          const t = ddTruoc(story);
          h.trangThai = "huy";
          h.suaLuc = Date.now();
          if (!(await ddLuu(story, "huỷ hướng", t))) h.trangThai = cu;
          else toast("Đã huỷ hướng.");
          ve();
        }
      }
      return;
    }
  });
}

// -------------------------------------------------------- form: đính chính
function ddGiaTriDienDat(tt, muc) {
  if (muc.loai === "nhanvat") {
    const t = tt.nv[muc.nvId] || {};
    return String(t[muc.truong] || "").trim();
  }
  const e = TS.quanHeCua(tt, muc.tu, muc.den);
  if (!e) return "";
  if (muc.chieu === "chuaNoi") return String(e.chuaNoi || "").trim();
  return TS.nhanMuc(muc.chieu, e[muc.chieu]);
}

function ddFormDinhChinhHtml(story, conv, muc) {
  const tt = TS.tinhTrangThai(story, conv || null);
  const loai = muc.loai === "quanhe" ? "quanhe" : "nhanvat";
  const nvOpts = (sel, themNguoi) =>
    (themNguoi ? [{ id: TS.ID_NGUOI, ten: layNguoiChoi(story) }] : [])
      .concat(story.nhanVats)
      .map((c) => '<option value="' + esc(c.id) + '"' + (sel === c.id ? " selected" : "") + ">" + esc(c.ten) + "</option>")
      .join("");
  const laChu = muc.chieu === "chuaNoi";
  const e = loai === "quanhe" ? TS.quanHeCua(tt, muc.tu, muc.den) : null;
  const coMucRieng = muc.muc !== null && muc.muc !== undefined && muc.muc !== "";
  const mucChon = coMucRieng
    ? Number(muc.muc)
    : e && !laChu && e[muc.chieu] !== undefined
      ? Number(e[muc.chieu])
      : (TS.MAC_DINH[muc.chieu] !== undefined ? Number(TS.MAC_DINH[muc.chieu]) : 5);
  let ganNhat = TS.MUC_LUA_CHON[0].v;
  for (const x of TS.MUC_LUA_CHON) if (Math.abs(x.v - mucChon) < Math.abs(ganNhat - mucChon)) ganNhat = x.v;
  return (
    '<div class="dd-form">' +
      '<label class="field-label">Loại nhận định cần sửa</label>' +
      '<div class="dd-chips">' +
        '<button type="button" class="chip dd-chip-loai' + (loai === "nhanvat" ? " on" : "") + '" data-v="nhanvat">Nội tâm nhân vật</button>' +
        '<button type="button" class="chip dd-chip-loai' + (loai === "quanhe" ? " on" : "") + '" data-v="quanhe">Quan hệ</button>' +
      "</div>" +
      '<div class="dd-loai-nv"' + (loai === "nhanvat" ? "" : " hidden") + ">" +
        '<label class="field-label">Nhân vật</label><select class="input" data-f="nvId">' + nvOpts(muc.nvId) + "</select>" +
        '<label class="field-label">Trường trạng thái</label><select class="input" data-f="truong">' +
          TS.TRUONG.map((x) => '<option value="' + esc(x.id) + '"' + (muc.truong === x.id ? " selected" : "") + ">" + esc(x.ten) + "</option>").join("") +
        "</select>" +
      "</div>" +
      '<div class="dd-loai-qh"' + (loai === "quanhe" ? "" : " hidden") + ">" +
        '<label class="field-label">Cặp quan hệ (người cảm nhận → người được cảm nhận)</label>' +
        '<div class="dd-pair"><select class="input" data-f="tu">' + nvOpts(muc.tu) + '</select><span class="dd-pair-x">→</span><select class="input" data-f="den">' + nvOpts(muc.den, true) + "</select></div>" +
        '<label class="field-label">Chiều quan hệ</label><select class="input" data-f="chieu">' +
          TS.CHIEU.map((x) => '<option value="' + esc(x.id) + '"' + (muc.chieu === x.id ? " selected" : "") + ">" + esc(x.ten) + "</option>").join("") +
          '<option value="chuaNoi"' + (laChu ? " selected" : "") + ">Điều chưa nói</option>" +
        "</select>" +
        '<div class="dd-muc"' + (laChu ? " hidden" : "") + ">" +
          '<label class="field-label">Mức đúng (nhãn tự nhiên, không có số)</label>' +
          '<select class="input" data-f="muc">' +
            TS.MUC_LUA_CHON.map((x) => {
              const nhan = muc.chieu === "cangThang" ? x.tenCang : x.ten;
              return '<option value="' + x.v + '"' + (Number(ganNhat) === x.v ? " selected" : "") + ">" + esc(nhan) + "</option>";
            }).join("") +
          "</select>" +
        "</div>" +
      "</div>" +
      '<div class="dd-cu"><span class="dd-key">Trạng thái AI đang suy ra</span><span class="dd-val">' +
        (ddGiaTriDienDat(tt, muc) ? fmt(ddGiaTriDienDat(tt, muc)) : '<span class="dd-empty">(chưa có gì)</span>') + "</span></div>" +
      '<label class="field-label">' +
        (laChu ? "Điều người này thật ra đang giữ trong lòng" : "Nhận định ĐÚNG là gì") + "</label>" +
      '<textarea class="input" data-f="moi" rows="3" placeholder="' +
        (laChu ? "Ví dụ: A thật ra vẫn còn sợ B" : "Ví dụ: A không căm ghét B — A đang sợ B") + '">' + esc(muc.moi || "") + "</textarea>" +
      '<label class="field-label">Vì sao AI suy ra sai / vì sao đúng là vậy (không bắt buộc)</label>' +
      '<input class="input" data-f="lyDo" value="' + esc(muc.lyDo || "") + '">' +
      '<div class="dd-note">Đính chính không sửa tin nhắn, không sửa cảnh đã khép và không thêm cảnh giả. Nó chỉ là lớp phủ có thể tắt/xoá.</div>' +
    "</div>"
  );
}

function ddDocFormDinhChinh(scope, loaiCu) {
  const V = (k) => String((scope.querySelector('[data-f="' + k + '"]') || {}).value || "").trim();
  const loai = scope.querySelector(".dd-chip-loai.on");
  const l = loai ? loai.dataset.v : loaiCu;
  const ra = { loai: l === "quanhe" ? "quanhe" : "nhanvat", lyDo: V("lyDo") };
  if (ra.loai === "nhanvat") {
    ra.nvId = V("nvId");
    ra.truong = V("truong");
    ra.moi = V("moi");
  } else {
    ra.tu = V("tu");
    ra.den = V("den");
    ra.chieu = V("chieu");
    ra.moi = V("moi");
    if (ra.chieu !== "chuaNoi") ra.muc = Number(V("muc"));
  }
  return ra;
}

async function openSuaDinhChinh(story, conv, muc, onXong) {
  const dc = muc && muc.dc ? muc.dc : null;
  const draft = dc
    ? {
        loai: dc.loai, nvId: dc.nvId, truong: dc.truong, tu: dc.tu, den: dc.den, chieu: dc.chieu,
        muc: dc.muc, moi: dc.moi, lyDo: dc.lyDo,
      }
    : Object.assign({ loai: "nhanvat" }, muc || {});
  if (draft.loai === "quanhe" && !draft.chieu) draft.chieu = "tinTuong";
  if (draft.loai === "nhanvat" && !draft.truong) draft.truong = "mucTieu";
  if (draft.loai === "nhanvat" && !draft.nvId) draft.nvId = (story.nhanVats[0] || {}).id || "";
  const body = el("div");
  const ve = () => {
    body.innerHTML = ddFormDinhChinhHtml(story, conv, draft);
  };
  ve();
  const m = modal({
    title: dc ? "Sửa đính chính" : "Đính chính nhận định",
    subtitle: "Chỉ sửa điều AI rút ra sai — không viết lại lịch sử",
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  body.addEventListener("click", (e) => {
    const chip = e.target.closest(".dd-chip-loai");
    if (chip) {
      Object.assign(draft, ddDocFormDinhChinh(body, draft.loai));
      draft.loai = chip.dataset.v;
      ve();
    }
  });
  body.addEventListener("change", (e) => {
    if (e.target.closest('[data-f="chieu"]')) {
      Object.assign(draft, ddDocFormDinhChinh(body, draft.loai));
      ve();
    }
  });
  const nut = document.createElement("button");
  nut.className = "btn btn-primary";
  nut.textContent = dc ? "Lưu đính chính" : "Thêm đính chính";
  nut.onclick = async () => {
    const du = ddDocFormDinhChinh(body, draft.loai);
    if (du.loai === "nhanvat" && (!du.nvId || !du.truong)) { toast("Chọn nhân vật và trường cần đính chính.", "error"); return; }
    if (du.loai === "quanhe" && (!du.tu || !du.den || du.tu === du.den)) { toast("Chọn đủ hai phía của cặp quan hệ.", "error"); return; }
    if (!String(du.moi || "").trim()) { toast("Hãy ghi nhận định đúng.", "error"); return; }
    nut.disabled = true;
    nut.textContent = "Đang lưu…";
    const ttCu = TS.tinhTrangThai(story, conv || null);
    const cuText = ddGiaTriDienDat(ttCu, du);
    const dd = ddOf(story);
    const nguonCanh = TS.nguonCua(story, conv ? conv.id : "", du);
    const t = ddTruoc(story);
    let xong = false;
    if (dc) {
      Object.assign(dc, du, { cu: cuText, nguonCanh, suaLuc: Date.now() });
      xong = await ddLuu(story, "sửa đính chính", t);
    } else {
      const moi = TS.taoDinhChinh(Object.assign({}, du, { cu: cuText, nguonCanh }));
      dd.dinhChinh.push(moi);
      xong = await ddLuu(story, "thêm đính chính", t);
    }
    nut.disabled = false;
    nut.textContent = dc ? "Lưu đính chính" : "Thêm đính chính";
    if (!xong) {
      toast("Không lưu được đính chính — nội dung bạn vừa ghi vẫn còn nguyên.", "error");
      return;
    }
    toast("Đã lưu đính chính — trạng thái tính lại ngay.");
    m.close();
    if (onXong) onXong();
  };
  m.footEl.appendChild(nut);
  body.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) nut.click();
  });
}

// -------------------------------------------------- form: hướng phát triển
function ddFormHuongHtml(story, d) {
  const dd = d || {};
  const phamVi = dd.phamVi || "nhanvat";
  const nvOpts = (sel, themNguoi) =>
    (themNguoi ? [{ id: TS.ID_NGUOI, ten: layNguoiChoi(story) }] : [])
      .concat(story.nhanVats)
      .map((c) => '<option value="' + esc(c.id) + '"' + (sel === c.id ? " selected" : "") + ">" + esc(c.ten) + "</option>")
      .join("");
  return (
    '<div class="dd-form">' +
      '<label class="field-label">Phạm vi</label>' +
      '<div class="dd-chips">' +
        TS.PHAM_VI.map((x) => '<button type="button" class="chip dd-chip-pv' + (phamVi === x.id ? " on" : "") + '" data-v="' + esc(x.id) + '">' + esc(x.ten) + "</button>").join("") +
      "</div>" +
      '<div class="dd-pv-nv"' + (phamVi === "nhanvat" ? "" : " hidden") + ">" +
        '<label class="field-label">Nhân vật</label><select class="input" data-f="nvId">' + nvOpts(dd.nvId) + "</select>" +
      "</div>" +
      '<div class="dd-pv-qh"' + (phamVi === "quanhe" ? "" : " hidden") + ">" +
        '<label class="field-label">Cặp quan hệ</label>' +
        '<div class="dd-pair"><select class="input" data-f="tu">' + nvOpts(dd.tu) + '</select><span class="dd-pair-x">→</span><select class="input" data-f="den">' + nvOpts(dd.den, true) + "</select></div>" +
      "</div>" +
      '<label class="field-label">Hướng mong muốn</label>' +
      '<textarea class="input" data-f="mongMuon" rows="3" placeholder="Ví dụ: A dần bớt kiểm soát và học cách tin B">' + esc(dd.mongMuon || "") + "</textarea>" +
      '<div class="dd-2col">' +
        '<div><label class="field-label">Nhịp chuyển</label><select class="input" data-f="nhip">' +
          TS.NHIP_HUONG.map((x) => '<option value="' + esc(x.id) + '"' + ((dd.nhip || "vua") === x.id ? " selected" : "") + ">" + esc(x.ten) + " — " + esc(x.dan) + "</option>").join("") +
        "</select></div>" +
        '<div><label class="field-label">Số cảnh dự kiến</label><input class="input" type="number" min="1" max="20" data-f="soCanh" value="' +
          (Math.round(Number(dd.soCanh)) || ddSoCanhMacDinh(story)) + '"></div>' +
      "</div>" +
      '<label class="field-label">Điều không được phá vỡ (không bắt buộc)</label>' +
      '<textarea class="input" data-f="rangBuoc" rows="2" placeholder="Ví dụ: A vẫn là người không bao giờ nói lời xin lỗi trước">' + esc(dd.rangBuoc || "") + "</textarea>" +
      '<label class="field-label">Tên ngắn của hướng</label>' +
      '<input class="input" data-f="ten" value="' + esc(dd.ten || "") + '" placeholder="Để trống sẽ lấy từ mục tiêu trong kế hoạch">' +
    "</div>"
  );
}

function ddDocFormHuong(scope) {
  const V = (k) => String((scope.querySelector('[data-f="' + k + '"]') || {}).value || "").trim();
  const chip = scope.querySelector(".dd-chip-pv.on");
  const soCanh = Number(V("soCanh"));
  return {
    phamVi: chip ? chip.dataset.v : "nhanvat",
    nvId: V("nvId"),
    tu: V("tu"),
    den: V("den"),
    mongMuon: V("mongMuon"),
    nhip: V("nhip"),
    soCanh: isFinite(soCanh) && soCanh > 0 ? Math.min(20, Math.round(soCanh)) : 4,
    rangBuoc: V("rangBuoc"),
    ten: V("ten"),
  };
}

function ddFormKeHoachHtml(k) {
  const kk = k || {};
  return (
    '<div class="dd-form dd-form-kh">' +
      '<div class="dd-kh-head">' + icon("sparkle", 13) + " Kế hoạch cầu nối — đọc rồi sửa trước khi kích hoạt</div>" +
      '<label class="field-label">Trạng thái xuất phát</label><textarea class="input" data-k="trangThaiDau" rows="2">' + esc(kk.trangThaiDau || "") + "</textarea>" +
      '<label class="field-label">Mục tiêu</label><input class="input" data-k="mucTieu" value="' + esc(kk.mucTieu || "") + '">' +
      '<label class="field-label">Các bước chuyển (mỗi dòng một bước, 2–4 bước)</label>' +
      '<textarea class="input" data-k="buoc" rows="4">' + esc((kk.buoc || []).join("\n")) + "</textarea>" +
      '<label class="field-label">Dấu hiệu nhỏ nên xuất hiện trước</label><textarea class="input" data-k="dauHieu" rows="2">' + esc(kk.dauHieu || "") + "</textarea>" +
      '<label class="field-label">Xung đột (với canon, tính cách gốc, giới hạn, hoặc hướng đang chạy)</label>' +
      '<textarea class="input' + (kk.xungDot ? " dd-xd" : "") + '" data-k="xungDot" rows="2" placeholder="KHONG CO nếu không có">' + esc(kk.xungDot || "") + "</textarea>" +
      '<label class="field-label">Điều kiện đổi hướng / chậm lại</label><textarea class="input" data-k="dieuKienDung" rows="2">' + esc(kk.dieuKienDung || "") + "</textarea>" +
    "</div>"
  );
}

function ddDocFormKeHoach(scope) {
  const V = (k) => String((scope.querySelector('[data-k="' + k + '"]') || {}).value || "").trim();
  return {
    trangThaiDau: V("trangThaiDau"),
    mucTieu: V("mucTieu"),
    buoc: V("buoc").split("\n").map((s) => s.replace(/^[\s\-•*\d.)]+/, "").trim()).filter(Boolean).slice(0, 6),
    dauHieu: V("dauHieu"),
    xungDot: V("xungDot"),
    dieuKienDung: V("dieuKienDung"),
  };
}

function ddIdsCuaHuong(story, conv, h) {
  if (h.phamVi === "nhanvat") return [h.nvId].filter((id) => id && id !== TS.ID_NGUOI);
  if (h.phamVi === "quanhe") return [h.tu, h.den].filter((id) => id && id !== TS.ID_NGUOI);
  return conv && Array.isArray(conv.nhanVatIds) ? conv.nhanVatIds.slice() : story.nhanVats.map((c) => c.id);
}

function ddKiemTraHuong(draft) {
  if (!String(draft.mongMuon || "").trim()) return "Hãy viết hướng bạn muốn.";
  if (draft.phamVi === "nhanvat" && !draft.nvId) return "Chọn nhân vật cho hướng này.";
  if (draft.phamVi === "quanhe" && (!draft.tu || !draft.den || draft.tu === draft.den)) return "Chọn đủ hai phía khác nhau của cặp quan hệ.";
  return "";
}

// Kích hoạt: kiểm tra trùng đối tượng (không để hai chỉ đạo trái nhau cùng vào prompt),
// ghi nguyên tử (hỏng thì trả lại), và chỉ gọi AI khi người chơi đã duyệt kế hoạch.
async function ddKichHoat(story, conv, du) {
  const trung = TS.huongCungDoiTuong(story, du);
  let chon = "";
  if (trung.length) {
    chon = await new Promise((res) => {
      let xongRoi = false;
      const fin = (v) => { if (!xongRoi) { xongRoi = true; res(v); } };
      modal({
        title: "Đã có hướng cho đúng đối tượng này",
        body:
          '<div class="confirm-text">' + esc(
            "Đang có " + trung.length + " hướng hoạt động cho cùng đối tượng: " +
            trung.map((x) => "“" + (x.ten || x.mongMuon) + "”").join(", ") +
            ". Hai chỉ đạo trái nhau không được cùng nằm trong prompt — chọn cách xử lý."
          ) + "</div>" +
          (du.keHoach && du.keHoach.xungDot ? '<div class="dd-canh-bao">' + icon("alert", 12) + " Kế hoạch mới báo xung đột: " + fmt(catNgan(du.keHoach.xungDot, 240)) + "</div>" : ""),
        onClose: () => setTimeout(() => fin(""), 0),
        actions: [
          { label: "Quay lại", onClick: (mm) => { mm.close(); fin(""); } },
          { label: "Tạm dừng hướng cũ", onClick: (mm) => { mm.close(); fin("tamDung"); } },
          { label: "Huỷ hướng cũ", danger: true, onClick: (mm) => { mm.close(); fin("huy"); } },
        ],
      });
    });
    if (!chon) return false;
  }
  const dd = ddOf(story);
  const snap = JSON.parse(JSON.stringify(dd));
  if (chon === "tamDung") for (const x of trung) { x.trangThai = "tamDung"; x.suaLuc = Date.now(); }
  else if (chon === "huy") for (const x of trung) { x.trangThai = "huy"; x.suaLuc = Date.now(); }
  const h = TS.taoHuong(Object.assign({}, du, { trangThai: "hoatDong" }));
  dd.huong.push(h);
  if (!(await ddLuu(story, "kích hoạt hướng", snap))) return false;
  toast(chon === "tamDung" ? "Đã kích hoạt hướng mới và tạm dừng hướng cũ." : chon === "huy" ? "Đã kích hoạt hướng mới và huỷ hướng cũ." : "Đã kích hoạt hướng.");
  return true;
}

async function openTaoHuong(story, conv, onXong) {
  if (!story.nhanVats.length) {
    toast("Cần ít nhất một nhân vật trước khi đặt hướng phát triển.", "error");
    return;
  }
  const draft = { phamVi: "nhanvat", nhip: "vua", soCanh: ddSoCanhMacDinh(story), nvId: (story.nhanVats[0] || {}).id };
  const state = { keHoach: null, loi: "", dangLap: false };
  const body = el("div");
  const ve = () => {
    body.innerHTML =
      ddFormHuongHtml(story, draft) +
      (state.keHoach
        ? ddFormKeHoachHtml(state.keHoach)
        : '<div class="dd-form"><div class="dd-plan" data-k="cho">' +
          (state.loi
            ? '<div class="confirm-text">' + esc(state.loi) + "</div><div class=\"dd-note\">Nội dung bạn đã điền vẫn còn nguyên — sửa rồi bấm “Lập cầu nối” lại.</div>"
            : '<div class="hint">Kế hoạch cầu nối sẽ hiện ở đây sau khi bạn bấm “Lập cầu nối”. Kế hoạch chỉ là đề xuất — chưa có gì được đặt vào truyện cho tới khi bạn bấm “Kích hoạt hướng”.</div>') +
          "</div></div>");
    nutKich.hidden = !state.keHoach;
  };
  const m = modal({
    title: "Hướng phát triển mới",
    subtitle: "AI lập kế hoạch cầu nối trước — bạn duyệt rồi mới kích hoạt",
    wide: true,
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  const nutLap = document.createElement("button");
  nutLap.className = "btn";
  nutLap.innerHTML = icon("sparkle", 14) + " Lập cầu nối";
  const nutKich = document.createElement("button");
  nutKich.className = "btn btn-primary";
  nutKich.textContent = "Kích hoạt hướng";
  nutKich.hidden = true;
  m.footEl.appendChild(nutLap);
  m.footEl.appendChild(nutKich);
  ve();

  const doc = () => {
    Object.assign(draft, ddDocFormHuong(body));
    if (state.keHoach) state.keHoach = ddDocFormKeHoach(body);
  };
  body.addEventListener("click", (e) => {
    const chip = e.target.closest(".dd-chip-pv");
    if (!chip) return;
    doc();
    draft.phamVi = chip.dataset.v;
    ve();
  });
  nutLap.onclick = async () => {
    if (state.dangLap) return;
    doc();
    const loi = ddKiemTraHuong(draft);
    if (loi) { toast(loi, "error"); return; }
    state.dangLap = true;
    const nhanCu = nutLap.innerHTML;
    nutLap.disabled = true;
    nutLap.innerHTML = anhLoading() + " Đang lập cầu nối…";
    try {
      state.keHoach = await AI.lapCauNoi({ story, conv, huong: Object.assign({}, draft), ids: ddIdsCuaHuong(story, conv, draft) });
      state.loi = "";
      if (!draft.ten && state.keHoach.mucTieu) draft.ten = catNgan(state.keHoach.mucTieu, 60);
      toast("Đọc kế hoạch rồi sửa nếu cần — chưa có gì được đặt vào truyện.");
    } catch (e) {
      console.error(e);
      state.keHoach = null;
      state.loi = (e && e.message) || "Không lập được kế hoạch.";
      toast("Lập kế hoạch thất bại — nội dung bạn đã điền vẫn còn nguyên.", "error");
    } finally {
      state.dangLap = false;
      nutLap.disabled = false;
      nutLap.innerHTML = nhanCu;
      ve();
    }
  };
  nutKich.onclick = async () => {
    doc();
    if (!state.keHoach) return;
    const loi = ddKiemTraHuong(draft);
    if (loi) { toast(loi, "error"); return; }
    nutKich.disabled = true;
    nutKich.textContent = "Đang lưu…";
    const ok = await ddKichHoat(story, conv, Object.assign({}, draft, { keHoach: state.keHoach }));
    nutKich.disabled = false;
    nutKich.textContent = "Kích hoạt hướng";
    if (!ok) { toast("Không kích hoạt được — kế hoạch vẫn còn nguyên để bạn thử lại.", "error"); return; }
    m.close();
    if (onXong) onXong();
  };
}

async function openSuaHuong(story, conv, h, onXong) {
  const draft = {
    phamVi: h.phamVi, nvId: h.nvId, tu: h.tu, den: h.den, mongMuon: h.mongMuon,
    nhip: h.nhip, soCanh: h.soCanh, rangBuoc: h.rangBuoc, ten: h.ten,
  };
  const state = { keHoach: JSON.parse(JSON.stringify(h.keHoach || {})), loi: "", dangLap: false };
  const body = el("div");
  const ve = () => {
    body.innerHTML = ddFormHuongHtml(story, draft) + ddFormKeHoachHtml(state.keHoach) +
      (state.loi ? '<div class="dd-canh-bao">' + esc(state.loi) + "</div>" : "");
  };
  ve();
  const m = modal({
    title: "Sửa kế hoạch hướng",
    subtitle: h.ten || catNgan(h.mongMuon, 60),
    wide: true,
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  const doc = () => {
    Object.assign(draft, ddDocFormHuong(body));
    state.keHoach = ddDocFormKeHoach(body);
  };
  body.addEventListener("click", (e) => {
    const chip = e.target.closest(".dd-chip-pv");
    if (!chip) return;
    doc();
    draft.phamVi = chip.dataset.v;
    ve();
  });
  const nutLap = document.createElement("button");
  nutLap.className = "btn";
  nutLap.innerHTML = icon("sparkle", 14) + " Lập lại bằng AI";
  const nutLuu = document.createElement("button");
  nutLuu.className = "btn btn-primary";
  nutLuu.textContent = "Lưu";
  m.footEl.appendChild(nutLap);
  m.footEl.appendChild(nutLuu);
  nutLap.onclick = async () => {
    if (state.dangLap) return;
    doc();
    const loi = ddKiemTraHuong(draft);
    if (loi) { toast(loi, "error"); return; }
    state.dangLap = true;
    const nhanCu = nutLap.innerHTML;
    nutLap.disabled = true;
    nutLap.innerHTML = anhLoading() + " Đang lập lại…";
    try {
      state.keHoach = await AI.lapCauNoi({ story, conv, huong: Object.assign({}, draft), ids: ddIdsCuaHuong(story, conv, draft) });
      state.loi = "";
      toast("Đã lập lại kế hoạch — xem rồi lưu nếu ưng.");
    } catch (e) {
      console.error(e);
      state.loi = (e && e.message) || "Không lập lại được kế hoạch.";
      toast("Lập lại kế hoạch thất bại — kế hoạch cũ vẫn còn nguyên.", "error");
    } finally {
      state.dangLap = false;
      nutLap.disabled = false;
      nutLap.innerHTML = nhanCu;
      ve();
    }
  };
  nutLuu.onclick = async () => {
    doc();
    const loi = ddKiemTraHuong(draft);
    if (loi) { toast(loi, "error"); return; }
    nutLuu.disabled = true;
    nutLuu.textContent = "Đang lưu…";
    const t = ddTruoc(story);
    Object.assign(h, draft, { keHoach: state.keHoach, suaLuc: Date.now() });
    const ok = await ddLuu(story, "sửa hướng", t);
    nutLuu.disabled = false;
    nutLuu.textContent = "Lưu";
    if (!ok) { toast("Không lưu được — kế hoạch bạn vừa sửa vẫn còn nguyên.", "error"); return; }
    toast("Đã lưu kế hoạch hướng.");
    m.close();
    if (onXong) onXong();
  };
}

// Thẻ tiến độ trong thẻ Khép cảnh (chỉ hiện khi có hướng liên quan).
function mucTienDoHtml(story, conv, h, td) {
  const cur = (td && td.trangThai) || "chuaCham";
  const bc = td ? td.bangChung : "";
  const bt = td ? td.buocTiep : "";
  return (
    '<div class="khep-muc" data-loai="tiendo" data-id="' + esc(h.id) + '">' +
      '<label class="khep-chon" title="Ghi tiến độ này cho hướng"><input type="checkbox" data-k="chon"' + (bc ? " checked" : "") + "></label>" +
      '<div class="khep-muc-body">' +
        '<div class="khep-head"><span class="khep-cap">' + esc(h.ten || catNgan(h.mongMuon, 60)) + "</span>" +
          '<span class="chip dd-tt dd-tt-' + esc(h.trangThai) + '">' + esc(TS.nhanTrangThaiHuong(h.trangThai)) + "</span>" +
          '<span class="chip dd-qh-chip">' + esc(TS.doiTuongHuong(story, h)) + "</span></div>" +
        '<select class="input" data-k="trangthai">' +
          TS.TT_TIEN_DO.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === cur ? " selected" : "") + ">" + esc(x.ten) + "</option>").join("") +
        "</select>" +
        '<input class="input" data-k="bangchung" value="' + esc(bc) + '" placeholder="Bằng chứng cụ thể trong cảnh này…">' +
        '<input class="input" data-k="buoctiep" value="' + esc(bt) + '" placeholder="Bước tiếp theo (chỉ là gợi ý)">' +
        '<label class="khep-hoantat"' + (cur === "coTheHoanTat" ? "" : " hidden") + '><input type="checkbox" data-k="hoantat"> Đánh dấu hướng này HOÀN TẤT (bạn quyết định)</label>' +
      "</div>" +
    "</div>"
  );
}

function renderChat(story, conv) {
  const nguoiChoi = layNguoiChoi(story);
  const msgs = getMessages(conv.id);
  const nvts = story.nhanVats.filter((c) => (conv.nhanVatIds || []).includes(c.id));

  const lbItem = (() => {
    const lb = loreCua(story);
    if (!lb.entries.length) return "";
    const n = mucKhop(story, conv, msgs).length;
    return (
      '<button class="chat-menu-item" role="menuitem" data-act="open-lorebook" title="Sổ tri thức: ' + lb.entries.length + " mục" +
      (n ? " · " + n + " mục đang khớp cảnh này" : "") + '">' + icon("book", 15) +
      "<span>Sổ tri thức</span>" +
      '<span class="chat-menu-num">' + n + "/" + lb.entries.length + "</span></button>"
    );
  })();

  // Header hội thoại chỉ giữ hai thao tác chính (Đạo diễn, Khép cảnh) — phần còn lại
  // nằm trong menu ⋯ để hàng tiêu đề không bị dàn icon.
  const head =
    '<div class="chat-head">' +
      '<button class="icon-btn chat-menu-btn" data-act="toggle-sidebar" aria-label="Mở danh sách hội thoại" title="Mở danh sách hội thoại">' + icon("menu", 18) + "</button>" +
      '<button class="icon-btn" data-act="go-dashboard" aria-label="Bảng điều khiển" title="Bảng điều khiển">' + icon("back", 18) + "</button>" +
      '<div class="chat-title">' +
        '<div class="chat-name">' + esc(conv.tieuDe) + "</div>" +
        '<div class="chat-sub">' +
          avatarStack(story, conv.nhanVatIds, 20) +
          "<span>" + (nvts.length ? nvts.map((c) => esc(c.ten)).join(" · ") : "chưa có nhân vật") + " · với " + esc(nguoiChoi) + "</span>" +
        "</div>" +
      "</div>" +
      '<div class="chat-actions">' +
        (daoDienOf(story).bat
          ? '<button class="icon-btn" data-act="open-dao-dien" aria-label="Chế độ Đạo diễn" title="Chế độ Đạo diễn — màn riêng của bạn: trạng thái ẩn, đính chính, hướng phát triển">' + icon("clapper", 16) + "</button>"
          : "") +
        '<button class="icon-btn" data-act="khep-canh" aria-label="Khép cảnh" title="Khép cảnh — chốt lại điều đã xảy ra trong cảnh">' + icon("pause", 16) + "</button>" +
        '<button class="icon-btn chat-more-btn" data-act="toggle-chat-menu" aria-label="Thao tác khác" aria-haspopup="menu" aria-expanded="false" title="Thao tác khác">' + icon("menu", 18) + "</button>" +
        '<div class="chat-menu" role="menu" hidden>' +
          '<button class="chat-menu-item" role="menuitem" data-act="tao-anh">' + icon("image", 15) + "<span>Dựng ảnh cho cảnh này</span></button>" +
          '<button class="chat-menu-item" role="menuitem" data-act="edit-conv">' + icon("edit", 15) + "<span>Sửa hội thoại</span></button>" +
          '<button class="chat-menu-item" role="menuitem" data-act="chronicle-from-conv">' + icon("pin", 15) + "<span>Ghi vào biên niên sử</span></button>" +
          lbItem +
          '<button class="chat-menu-item" role="menuitem" data-act="toggle-focus">' + icon("eyeOff", 15) +
            "<span>Chế độ tập trung</span>" + '<span class="chat-menu-check">' + icon("check", 14) + "</span></button>" +
          '<button class="chat-menu-item" role="menuitem" data-act="open-settings">' + icon("sliders", 15) + "<span>Cài đặt hiển thị</span></button>" +
          '<button class="chat-menu-item danger" role="menuitem" data-act="delete-conv">' + icon("trash", 15) + "<span>Xoá hội thoại</span></button>" +
        "</div>" +
      "</div>" +
    "</div>";

  let list = "";
  if (!msgs.length) {
    list =
      '<div class="chat-empty">' +
        '<div class="empty-art">' + (nvts.length ? "🎬" : "👤") + "</div>" +
        (nvts.length
          ? "<h3>Sẵn sàng bắt đầu</h3><p>Nhấn “Viết mở đầu” để nhân vật dựng cảnh, hoặc tự bạn nói câu đầu tiên.</p>" +
            '<button class="btn btn-primary" data-act="opening">' + icon("sparkle", 16) + " Viết mở đầu</button>"
          : "<h3>Hội thoại chưa có nhân vật</h3><p>Thêm ít nhất một nhân vật để AI có thể nhập vai.</p>" +
            '<button class="btn btn-primary" data-act="edit-conv">' + icon("users", 16) + " Chọn nhân vật</button>") +
      "</div>";
  } else {
    // Divider "Trong lúc bạn vắng mặt" chỉ hiện MỘT LẦN trước nhóm tin đầu tiên của mỗi
    // lần vắng mặt (gộp theo phiên), không lặp cho từng tin liên tiếp. Bảng tra sự kiện
    // được tính một lần cho cả hội thoại, không tính lại cho từng tin nhắn.
    const mapVg = msgs.some((m) => m.vangMat) ? suKienTheoId(story) : null;
    list = msgs
      .map((m, i) => {
        const truoc = i > 0 ? msgs[i - 1] : null;
        const dauNhom = m.vangMat && (!truoc || !truoc.vangMat || truoc.vangMatPhien !== m.vangMatPhien);
        return (dauNhom ? dividerVangMatHtml(story, m, mapVg) : "") + messageHtml(story, conv, m);
      })
      .join("") + app.loiTam.map((l, i) => loiBubbleHtml(story, l, i)).join("");
  }

  return (
    '<div class="chat">' +
      head +
      '<div class="chat-scroll" id="chatScroll">' + khoiVangMatHtml(story, conv) + list + "</div>" +
      thanhCanhBar(story, conv) +
      goiYkhoiHtml() +
      renderComposer(story, conv) +
    "</div>"
  );
}

// Xoá danh sách gợi ý + lựa chọn đang có (dùng khi đổi truyện/hội thoại, khi gửi tin…).
function xoaGoiY() {
  app.suggestions = [];
  app.suggChon = -1;
  app.suggLoi = "";
}

// Khối "Gợi ý lời đáp" — MỘT khối riêng, nằm NGOÀI thanh Trạng thái cảnh (nên không bị
// thu gọn hay Chế độ tập trung ẩn mất), xếp dọc và hiện đủ chữ. Đây chỉ là lớp hiển thị:
// gợi ý không phải tin nhắn, không vào lịch sử cho tới khi người dùng bấm Gửi.
function goiYkhoiHtml() {
  if (!app.suggestions.length && !app.suggLoi && !app.suggDangTao) return "";
  const dau = app.suggDangTao
    ? '<button class="btn btn-sm goi-y-more" disabled><span class="typing"><i></i><i></i><i></i></span> Đang tạo…</button>'
    : '<button class="btn btn-sm goi-y-more" data-act="suggest">' + icon("refresh", 14) + " Tạo hướng khác</button>";
  const cards = app.suggestions
    .map((s, i) => {
      const chon = i === app.suggChon;
      return (
        '<button class="goi-y-card' + (chon ? " on" : "") + '" data-act="use-suggestion" data-i="' + i + '" aria-pressed="' + (chon ? "true" : "false") + '">' +
        '<span class="goi-y-text">' + fmtBongBong(s, batPhanBiet()) + "</span></button>"
      );
    })
    .join("");
  const loi = app.suggLoi
    ? '<div class="goi-y-loi">' + esc(app.suggLoi) +
      ' <button class="btn btn-sm" data-act="suggest">' + icon("refresh", 13) + " Thử lại</button></div>"
    : "";
  return (
    '<div class="goi-y">' +
      '<div class="goi-y-head"><span class="goi-y-title">Gợi ý lời đáp</span>' + dau + "</div>" +
      (cards ? '<div class="goi-y-list">' + cards + "</div>" : "") +
      loi +
    "</div>"
  );
}

function messageHtml(story, conv, m) {
  if (m.vai === "anh") return anhMessageHtml(story, conv, m);
  if (m.vai === "he") {
    return '<div class="msg msg-he" data-mid="' + esc(m.id) + '"><div class="he-text">' + fmt(m.noiDung) + "</div></div>";
  }
  const isUser = m.vai === "nguoi";
  const chars = nvtsCuaTin(story, m);
  const char = chars[0] || null;
  const laNhom = chars.length > 1;
  const editing = app.editingMsgId === m.id;
  const name = isUser ? layNguoiChoi(story) : (chars.length ? chars.map((c) => c.ten).join(" · ") : (m.ten || "Nhân vật"));
  const streaming = m.__streaming;
  const khoaRieng = m.rieng ? '<span class="msg-rieng" title="Chỉ bạn và nhân vật này biết chuyện trong cảnh riêng">' + icon("lock", 10) + " cảnh riêng</span>" : "";
  const vaiTro = laNhom ? "cảnh nhóm" : (char && char.vaiTro ? char.vaiTro : "");
  return (
    '<div class="msg ' + (isUser ? "msg-user" : "msg-ai") + '" data-mid="' + esc(m.id) + '">' +
      '<div class="msg-avatar">' + (laNhom ? avatarStack(story, m.nvIds, 34) : avatarHtml(story, isUser ? null : char, 34)) + "</div>" +
      '<div class="msg-body">' +
        '<div class="msg-head"><span class="msg-name"' + (char ? ' style="color:' + esc(char.mau || "#8b5cf6") + '"' : "") + ">" + esc(name) + "</span>" +
        khoaRieng +
        (vaiTro ? '<span class="msg-role">' + esc(vaiTro) + "</span>" : "") +
        '<span class="msg-time">' + timeAgo(m.luc) + "</span></div>" +
        (editing
          ? '<div class="msg-edit"><textarea class="input" data-edit-input rows="5">' + esc(m.noiDung) + "</textarea>" +
            '<div class="msg-edit-actions"><button class="btn btn-sm" data-act="cancel-edit" data-mid="' + esc(m.id) + '">Huỷ</button>' +
            '<button class="btn btn-sm btn-primary" data-act="save-edit" data-mid="' + esc(m.id) + '">Lưu</button></div></div>'
          : '<div class="msg-text' + (streaming ? " streaming" : "") + '">' + fmtBongBong(m.noiDung, batPhanBiet()) +
            (streaming ? '<span class="caret"></span>' : "") + "</div>") +
        (streaming
          ? '<div class="msg-tools"><span class="typing"><i></i><i></i><i></i></span><button class="btn btn-sm" data-act="stop">' + icon("stop", 13) + " Dừng</button></div>"
          : '<div class="msg-tools">' +
              (m.daDung ? '<span class="msg-dung" title="Người chơi đã dừng giữa lúc sinh">' + icon("stop", 11) + " đã dừng</span>" : "") +
              // Trên màn hình hẹp, các công cụ dưới đây bị ẩn sau nút ⋯ này cho gọn.
              '<button class="tool msg-more" data-act="toggle-msg-tools" aria-label="Thao tác với tin nhắn" aria-expanded="false" title="Thao tác khác">' + icon("menu", 16) + "</button>" +
              '<button class="tool" data-act="copy-msg" data-mid="' + esc(m.id) + '" aria-label="Sao chép tin nhắn" title="Sao chép">' + icon("copy", 14) + "</button>" +
              (isUser ? "" : '<button class="tool" data-act="regen-msg" data-mid="' + esc(m.id) + '" aria-label="Viết lại tin nhắn" title="Viết lại">' + icon("refresh", 14) + "</button>") +
              '<button class="tool" data-act="edit-msg" data-mid="' + esc(m.id) + '" aria-label="Sửa tin nhắn" title="Sửa">' + icon("edit", 14) + "</button>" +
              (isUser ? "" : '<button class="tool" data-act="tao-anh-msg" data-mid="' + esc(m.id) + '" aria-label="Dựng ảnh cho đoạn này" title="Dựng ảnh cho đoạn này">' + icon("image", 14) + "</button>") +
              (isUser ? "" : '<button class="tool" data-act="facts-msg" data-mid="' + esc(m.id) + '" aria-label="Ghi vào biên niên sử" title="Ghi vào biên niên sử">' + icon("pin", 14) + "</button>") +
              '<button class="tool danger" data-act="del-msg" data-mid="' + esc(m.id) + '" aria-label="Xoá tin nhắn" title="Xoá">' + icon("trash", 14) + "</button>" +
            "</div>") +
      "</div>" +
    "</div>"
  );
}

// Phản hồi lỗi chỉ sống trong phiên này: không ghi vào bản ghi truyện (AI sẽ đọc
// nhầm nó ở lượt sau), nhưng người dùng vẫn thấy chuyện gì đã xảy ra và thử lại được.
function loiBubbleHtml(story, l, i) {
  const chars = nvtsCuaTin(story, l);
  const char = chars[0] || null;
  const laNhom = chars.length > 1;
  return (
    '<div class="msg msg-ai msg-loi">' +
      '<div class="msg-avatar">' + (laNhom ? avatarStack(story, l.nvIds, 34) : avatarHtml(story, char, 34)) + "</div>" +
      '<div class="msg-body">' +
        '<div class="msg-head"><span class="msg-name">' + esc(l.ten || "AI") + '</span><span class="msg-role">lỗi</span></div>' +
        '<div class="msg-text">' + fmt(l.noiDung) + "</div>" +
        '<div class="msg-tools">' +
          '<button class="btn btn-sm" data-act="thu-lai-loi" data-i="' + i + '">' + icon("refresh", 13) + " Thử lại</button>" +
          '<button class="tool" data-act="bo-loi" data-i="' + i + '" title="Bỏ qua">' + icon("close", 14) + "</button>" +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

// ==========================================================================
//  ẢNH CẢNH — dựng khung hình cho cảnh đang diễn ra
// ==========================================================================
function kichThuocWh(kt) {
  const m = /^(\d+)x(\d+)$/.exec(kt || "");
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

function anhLoading(cls) {
  return '<span class="anh-load' + (cls ? " " + cls : "") + '"><i></i><i></i><i></i></span>';
}

// Gắn một ảnh vào khung bằng DOM (KHÔNG ghép dataUrl vào innerHTML). Dữ liệu ảnh có thể
// đến từ file nhập, nên chỉ những chuỗi qua được `laDataUrlAnh` mới được gán vào `.src`.
function ganAnhVao(node, dataUrl, cls, lazy) {
  if (!node) return;
  node.innerHTML = "";
  const url = laDataUrlAnh(dataUrl);
  if (!url) return;
  const img = document.createElement("img");
  img.alt = "";
  if (cls) img.className = cls;
  if (lazy) img.loading = "lazy";
  img.src = url;
  node.appendChild(img);
}

function anhHolder(meta, kind) {
  const id = typeof meta === "string" ? meta : (meta && meta.id) || "";
  const kt = typeof meta === "object" && meta ? meta.kichThuoc : "";
  const wh = kichThuocWh(kt);
  let st = "";
  if (wh) {
    st = "aspect-ratio:" + wh.w + " / " + wh.h;
    if (kind !== "thumb") st += ";max-width:min(100%," + Math.round((62 * wh.w) / wh.h) + "vh)";
  }
  return (
    '<span class="anh-holder' + (kind ? " anh-holder-" + kind : "") + '" data-anh="' + esc(id) + '"' +
    (st ? ' style="' + st + '"' : "") + ">" + anhLoading() + "</span>"
  );
}

async function dienAnhTrong(scope) {
  const nodes = $$(".anh-holder[data-anh]", scope || document).filter((n) => !n.dataset.done);
  for (const n of nodes) {
    const id = n.dataset.anh;
    if (!id) continue;
    n.dataset.done = "1";
    let rec = null;
    try {
      rec = await getAnh(id);
    } catch (e) {
      rec = null;
    }
    if (!n.isConnected) continue;
    if (rec && rec.dataUrl) {
      n.classList.add("anh-co");
      ganAnhVao(n, rec.dataUrl, "", true);
    } else {
      n.innerHTML = '<span class="anh-missing">' + icon("image", 20) + "<span>Ảnh không còn trong máy</span></span>";
    }
  }
}

async function nenAnhDataUrl(url, max, chatLuong) {
  try {
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    const scale = Math.min(1, (max || 768) / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(bmp.width * scale));
    cv.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = cv.getContext("2d");
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    if (bmp.close) bmp.close();
    const out = cv.toDataURL("image/jpeg", chatLuong || 0.9);
    return out && out.length < url.length ? out : url;
  } catch (e) {
    return url;
  }
}

function taiAnh(dataUrl, ten) {
  const url = laDataUrlAnh(dataUrl);
  if (!url) {
    toast("Ảnh không hợp lệ hoặc không còn trong máy.", "error");
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = ten || "truyen-vai-anh-" + Date.now() + ".jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function anhMessageHtml(story, conv, m) {
  const meta = anhMeta(story, m.anhId) || {};
  const chu = m.chuThich || meta.chuThich || "Ảnh cảnh";
  return (
    '<div class="msg msg-anh" data-mid="' + esc(m.id) + '">' +
      '<div class="anh-body">' +
        '<button class="anh-frame" data-act="anh-xem" data-mid="' + esc(m.id) + '" title="Xem lớn">' +
          anhHolder(meta) +
        "</button>" +
        '<div class="anh-meta">' +
          '<span class="anh-cap">' + esc(chu) + "</span>" +
          (meta.phongCach ? '<span class="anh-badge">' + esc(tenPhongCach(meta.phongCach) || meta.phongCach) + "</span>" : "") +
          '<span class="anh-time">' + timeAgo(m.luc) + "</span>" +
          '<div class="msg-tools anh-tools">' +
            '<button class="tool" data-act="anh-xem" data-mid="' + esc(m.id) + '" title="Xem lớn">' + icon("search", 14) + "</button>" +
            '<button class="tool" data-act="anh-tai" data-mid="' + esc(m.id) + '" title="Tải ảnh">' + icon("download", 14) + "</button>" +
            '<button class="tool" data-act="anh-lai" data-mid="' + esc(m.id) + '" title="Dựng lại từ mô tả này">' + icon("refresh", 14) + "</button>" +
            '<button class="tool danger" data-act="del-msg" data-mid="' + esc(m.id) + '" title="Xoá khung hình">' + icon("trash", 14) + "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>"
  );
}

async function moXemAnhId(story, id, convFallback) {
  // Đường CHỈ HIỂN THỊ: đọc hỏng coi như không có ảnh.
  const rec = await getAnhMem(id);
  if (!rec || !rec.dataUrl) {
    toast("Ảnh không còn trong máy.", "error");
    return;
  }
  const conv = story.hoiThoais.find((c) => c.id === (rec.convId || convFallback));
  const body = el("div", { class: "anh-view" });
  body.innerHTML =
    '<div class="anh-view-img" data-anh-view-img></div>' +
    '<div class="anh-view-meta">' +
      (rec.chuThich ? '<div class="anh-view-cap">' + esc(rec.chuThich) + "</div>" : "") +
      '<div class="hint">' +
        esc([tenPhongCach(rec.phongCach), rec.kichThuoc, timeAgo(rec.luc)].filter(Boolean).join(" · ")) +
        (conv ? " · " + esc(conv.tieuDe) : "") +
      "</div>" +
      '<details class="anh-det"><summary>Mô tả ảnh đã gửi cho máy vẽ</summary>' +
        '<div class="anh-det-body">' + esc(rec.prompt || "") +
        (rec.loaiTru ? '<div class="hint">Loại trừ: ' + esc(rec.loaiTru) + "</div>" : "") +
        "</div></details>" +
    "</div>";
  ganAnhVao(body.querySelector("[data-anh-view-img]"), rec.dataUrl, "", false);
  modal({
    title: "Khung hình",
    wide: true,
    body,
    actions: [
      { label: "Tải ảnh", onClick: () => taiAnh(rec.dataUrl, "truyen-vai-" + rec.id + ".jpg") },
      { label: "Đóng", primary: true, onClick: (mm) => mm.close() },
    ],
  });
}

async function moXemAnh(mid) {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const m = getMessages(conv.id).find((x) => x.id === mid);
  if (!m || !m.anhId) return;
  await moXemAnhId(story, m.anhId, conv.id);
}

async function taiAnhTuMsg(mid) {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const m = getMessages(conv.id).find((x) => x.id === mid);
  if (!m || !m.anhId) return;
  const rec = await getAnhMem(m.anhId);
  if (!rec || !rec.dataUrl) {
    toast("Ảnh không còn trong máy.", "error");
    return;
  }
  taiAnh(rec.dataUrl, "truyen-vai-" + m.anhId + ".jpg");
}

// Bảng dựng ảnh: AI đọc cảnh hiện tại -> mô tả -> plugin tạo ảnh -> đưa vào hội thoại.
// ---------------------------------------------------------------------------
// Màn tạo ảnh — Giai đoạn 6: thân màn nằm ở `src/ui/taoAnh/`.
//
// `openTaoAnh` nay chỉ còn là VỎ: nó nối các mảnh trong `src/ui/taoAnh/` với những hàm
// SỐNG TRONG TỆP NÀY (điều hướng, ghi dữ liệu, tiện ích ảnh) qua `TAO_ANH_DEPS`. Chiều
// import là MỘT CHIỀU: `src/ui/*` được import lõi; lõi KHÔNG BAO GIỜ import `src/ui/*`.
// Danh sách dưới đây cố ý chỉ chứa thứ không import được từ lõi (dom/store/ngoaiHinh/ai) —
// đừng biến nó thành một túi đồ nghề chung.
const TAO_ANH_DEPS = {
  currentStory, currentConv, nvtsCoMat, render, capNhatConv,
  luuTinNhan, themTinNhan, luuTruyen, baoLoiLuu,
  dsPhongCach, dsKichThuoc, anhChon, luuAnhChon, anhLoading, ganAnhVao, nenAnhDataUrl,
};

async function openTaoAnh(opts = {}) {
  return await moTaoAnh(opts, TAO_ANH_DEPS);
}

function moThuVienAnh(focusId) {
  const story = currentStory();
  if (!story) return;
  const body = el("div", { class: "anh-lib" });
  const paint = () => {
    const list = anhCua(story);
    if (!list.length) {
      body.innerHTML = '<div class="hint">Chưa có khung hình nào. Mở một hội thoại và bấm nút ảnh ở thanh trên cùng để dựng khung hình đầu tiên.</div>';
      return;
    }
    body.innerHTML =
      '<div class="anh-lib-grid">' +
      list.map((a) => {
        const conv = story.hoiThoais.find((c) => c.id === a.convId);
        return (
          '<div class="anh-card" data-id="' + esc(a.id) + '">' +
            '<button class="anh-thumb" data-lib="xem" title="Xem lớn">' + anhHolder(a, "thumb") + "</button>" +
            '<div class="anh-card-meta">' +
              '<div class="anh-card-cap">' + esc(a.chuThich || "Ảnh cảnh") + "</div>" +
              '<div class="hint">' + esc([tenPhongCach(a.phongCach), timeAgo(a.luc), conv ? conv.tieuDe : ""].filter(Boolean).join(" · ")) + "</div>" +
              '<div class="anh-card-acts">' +
                (conv ? '<button class="btn btn-sm" data-lib="toi">' + icon("chat", 13) + " Tới cảnh</button>" : "") +
                '<button class="btn btn-sm" data-lib="tai" title="Tải ảnh">' + icon("download", 13) + "</button>" +
                '<button class="btn btn-sm btn-danger" data-lib="xoa" title="Xoá">' + icon("trash", 13) + "</button>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>";
    dienAnhTrong(body);
  };
  paint();

  const m = modal({
    title: "Thư viện ảnh",
    subtitle: "Mọi khung hình đã dựng cho truyện này — ảnh nằm trong máy bạn.",
    full: true,
    body,
    actions: [{ label: "Đóng", primary: true, onClick: (mm) => mm.close() }],
  });

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-lib]");
    const card = e.target.closest(".anh-card");
    if (!b || !card) return;
    const id = card.dataset.id;
    const rec = await getAnhMem(id);
    if (b.dataset.lib === "xem") {
      await moXemAnhId(story, id, (rec && rec.convId) || "");
      return;
    }
    if (b.dataset.lib === "tai") {
      if (rec && rec.dataUrl) taiAnh(rec.dataUrl, "truyen-vai-" + id + ".jpg");
      else toast("Ảnh không còn trong máy.", "error");
      return;
    }
    if (b.dataset.lib === "toi") {
      const conv = story.hoiThoais.find((c) => c.id === ((rec && rec.convId) || ""));
      if (!conv) return;
      m.close();
      await openConv(conv.id);
      return;
    }
    if (b.dataset.lib === "xoa") {
      confirmModal("Xoá khung hình", "Xoá khung hình này khỏi truyện? Tin nhắn chứa nó cũng sẽ bị gỡ.", async () => {
        const ok = await xoaAnhKhoiTruyen(story, id);
        paint();
        render();
        if (ok) toast("Đã xoá khung hình.");
      }, { danger: true, yesLabel: "Xoá" });
    }
  });
}

// Xoá ảnh và mọi tin nhắn đang dùng nó — MỘT giao dịch: hỏng ở bất kỳ bước nào thì ảnh,
// tin nhắn của mọi hội thoại bị đụng tới, và bản ghi truyện đều quay về nguyên trạng.
async function xoaAnhKhoiTruyen(story, id) {
  const ds = [["cotTruyen", story.id], ["thuVienAnh", id]];
  const viec = [];
  for (const c of story.hoiThoais) {
    const arr = await loadMessages(c.id);
    const giu = arr.filter((x) => x.anhId !== id);
    if (giu.length !== arr.length) {
      ds.push(["tinNhan", c.id]);
      viec.push({ conv: c, giu });
    }
  }
  const kq = await giaoDichApp(ds, async () => {
    for (const v of viec) {
      await replaceMessages(v.conv.id, v.giu);
      capNhatConv(v.conv, v.giu);
    }
    await xoaAnh(story, id);
    await ghiCotTruyen(story);
  }, "khung hình");
  return kq.ok;
}

function gkBar(story, conv) {
  const g = giaoKeoOf(story);
  if (!g.bat) return "";
  const ds = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  const so = Number(g.mucDo) || 3;
  const m = ds.find((x) => Number(x.so) === so) || {};
  const vaiTen = g.vaiNguoiChoi === "dom" ? "Dom" : g.vaiNguoiChoi === "switch" ? "Switch" : "Sub";
  const roles = nvtsCoMat(story, conv).filter((c) => c.vaiBdsm);
  const kq = ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((x) => x.id === g.kieuQuanHe);
  const soThich = (g.soThich || []).length;
  const nhan = "Bạn: " + vaiTen + (kq && kq.id !== "the-gioi-mo" ? " · " + kq.ten : "") +
    (roles.length ? " · " + roles.map((c) => c.ten + " (" + c.vaiBdsm + ")").join(", ") : "") +
    (soThich ? " · " + soThich + " sở thích" : "");
  // Phần thân của thanh giao kèo: nút Từ khoá dừng và việc thu gọn giờ do thanh trạng
  // thái cảnh đảm nhiệm, nên ở đây chỉ còn nội dung chi tiết.
  return (
    '<div class="gk-bar">' +
      '<div class="gk-bar-left">' +
        '<button class="gk-chip gk-chip-role" data-act="open-giao-keo" title="Mở giao kèo">' +
          icon("lock", 13) +
          '<span class="gk-chip-text">' + esc(nhan) + "</span>" +
        "</button>" +
        '<div class="gk-mucdo-set">' +
          "<span class=\"gk-mucdo-label\">Mức " + so + " · " + esc(m.ten || "") + "</span>" +
          '<div class="gk-mucdo-chips">' +
            ds.map((x) => '<button class="gk-chip gk-num' + (Number(x.so) === so ? " on" : "") + '" data-act="set-mucdo" data-so="' + esc(x.so) + '" aria-label="Đặt mức ' + esc(x.so) + '" title="' + esc(x.moTa) + '">' + esc(x.so) + "</button>").join("") +
          "</div>" +
        "</div>" +
        '<span class="gk-chip gk-chip-tk" title="Nói từ này là cảnh dừng ngay">' + icon("shield", 13) + " " + esc(g.tuKhoaDung || "đỏ") + "</span>" +
      "</div>" +
      '<div class="gk-bar-right">' +
        '<button class="gk-btn" data-act="thuong-luong" title="Hai bên nói rõ mong muốn và giới hạn trước cảnh">' + icon("chat", 14) + " Thương lượng</button>" +
        '<button class="gk-btn" data-act="aftercare" title="Chuyển sang chăm sóc sau">' + icon("heart", 14) + " Chăm sóc sau</button>" +
      "</div>" +
    "</div>"
  );
}

// Thanh hiện diện: cho biết ai đang ở trong cảnh, và là chỗ mở/đóng cảnh riêng.
// Hàng chip mỏng cho Khép cảnh: chỉ hiện khi AI báo cảnh đã tới điểm nghỉ, hoặc khi
// cảnh vừa khép còn để lại một "móc" gợi ý mở cảnh sau. Không chiếm thêm dòng nào của
// ô nhập và không tự mở gì cả.
function khepBar(story, conv) {
  const cuoi = TS.canhCuoi(story, conv);
  const chips = [];
  if (conv.goiKhep) {
    chips.push(
      '<button class="khep-chip khep-goi" data-act="khep-canh" title="Cảnh đang ở điểm nghỉ — mở thẻ khép cảnh">' +
      icon("pause", 12) + " Có thể khép cảnh</button>"
    );
  }
  if (cuoi && cuoi.moc) {
    chips.push(
      '<button class="khep-chip khep-moc" data-act="dung-moc" title="Chèn gợi ý này vào ô nhập để mở cảnh sau">' +
      icon("sparkle", 12) + '<span class="khep-moc-text">' + esc(cuoi.moc) + "</span></button>"
    );
  }
  if (!chips.length) return "";
  return '<div class="khep-bar">' + chips.join("") + "</div>";
}

function presenceBar(story, conv) {
  const rieng = canhRiengCua(conv);
  const nhom = (conv.nhanVatIds || []).length > 1;
  if (rieng) {
    const nv = charById(story, rieng);
    if (nv) {
      return (
        '<div class="presence-bar presence-rieng">' +
          '<span class="presence-lbl">' + icon("lock", 13) + " Cảnh riêng với</span>" +
          '<span class="presence-chip on">' + avatarHtml(story, nv, 18) + " " + esc(nv.ten) + "</span>" +
          '<span class="presence-note">chỉ hai người biết chuyện ở đây</span>' +
          '<button class="presence-btn" data-act="chon-canh-rieng" title="Nói riêng với người khác">' + icon("users", 13) + " Đổi người</button>" +
          '<button class="presence-btn" data-act="dong-canh-rieng">' + icon("back", 13) + " Quay lại nhóm</button>" +
        "</div>"
      );
    }
  }
  if (!nhom) return "";
  const coMat = nvtsCoMat(story, conv);
  // Cảnh không còn ai: thanh vẫn phải hiện để người chơi gọi người trở lại.
  if (!coMat.length) {
    return (
      '<div class="presence-bar presence-trong">' +
        '<span class="presence-lbl">' + icon("users", 13) + " Đang có mặt</span>" +
        '<span class="presence-note">chưa có nhân vật nào trong cảnh — chỉ còn bạn</span>' +
        '<div class="presence-acts">' +
          '<button class="presence-btn" data-act="open-hien-dien" title="Gọi nhân vật trở lại cảnh">' + icon("edit", 13) + " Sửa</button>" +
        "</div>" +
      "</div>"
    );
  }
  return (
    '<div class="presence-bar">' +
      '<span class="presence-lbl">' + icon("users", 13) + " Đang có mặt</span>" +
      '<span class="presence-chips">' +
        coMat.map((c) => '<span class="presence-chip">' + avatarHtml(story, c, 18) + " " + esc(c.ten) + "</span>").join("") +
      "</span>" +
      '<div class="presence-acts">' +
        '<button class="presence-btn" data-act="open-hien-dien" title="Thêm hoặc bớt người đang có mặt">' + icon("edit", 13) + " Sửa</button>" +
        '<button class="presence-btn" data-act="chon-canh-rieng" title="Nói riêng với một nhân vật — những người khác sẽ không biết">' + icon("lock", 13) + " Cảnh riêng</button>" +
      "</div>" +
    "</div>"
  );
}

// Hàng chọn người trả lời: nằm trong thanh trạng thái cảnh nên không chiếm thêm dòng
// nào của ô nhập.
function responderRow(story, nvts) {
  return (
    '<div class="responder-row">' +
      '<span class="responder-label">Ai trả lời</span>' +
      '<button class="chip' + (app.responder === "auto" ? " on" : "") + '" data-act="set-responder" data-id="auto">' + icon("sparkle", 13) + " Tự động</button>" +
      nvts.map((c) =>
        '<button class="chip' + (app.responder === c.id ? " on" : "") + '" data-act="set-responder" data-id="' + esc(c.id) + '">' +
        avatarHtml(story, c, 18) + " " + esc(c.ten) + "</button>").join("") +
      '<button class="chip' + (app.responder === "all" ? " on" : "") + '" data-act="set-responder" data-id="all">' + icon("users", 13) + " Tất cả</button>" +
    "</div>"
  );
}

// Thanh trạng thái cảnh: gom giao kèo · khép cảnh · hiện diện · chọn người trả lời vào
// MỘT chỗ, thu gọn được. Dòng tóm tắt trên đầu luôn cho biết cảnh đang thế nào, và nút
// Từ khoá dừng thì không bao giờ nằm trong phần bị thu gọn.
// LƯU Ý: khối "Gợi ý lời đáp" KHÔNG nằm ở đây — nó là một khối riêng bên dưới thanh này,
// nên thu gọn thanh (hoặc bật Chế độ tập trung) không bao giờ làm mất gợi ý.
function thanhCanhBar(story, conv) {
  const nvts = nvtsCoMat(story, conv);
  const rieng = canhRiengCua(conv);
  const group = !rieng && nvts.length > 1;
  const hopLe = app.responder === "auto" || app.responder === "all" || nvts.some((c) => c.id === app.responder);
  if (!hopLe) app.responder = "auto";
  const g = giaoKeoOf(story);
  const gk = gkBar(story, conv);
  const khep = khepBar(story, conv);
  const pres = presenceBar(story, conv);
  const rep = group ? responderRow(story, nvts) : "";
  if (!gk && !khep && !pres && !rep && !app.loadingMsg) return "";
  const tomTat = [];
  if (rieng) tomTat.push("cảnh riêng với " + tenNv(story, rieng));
  else if (nvts.length) tomTat.push(nvts.length + " người");
  if (g.bat) tomTat.push("giao kèo mức " + (Number(g.mucDo) || 3));
  if (conv.goiKhep) tomTat.push("có thể khép cảnh");
  if (group) tomTat.push("người trả lời: " + (app.responder === "auto" ? "tự động" : app.responder === "all" ? "tất cả" : tenNv(story, app.responder)));
  const mo = app.thanhCanhMo && !app.tapTrung;
  return (
    '<div class="scene-bar' + (mo ? " mo" : "") + '">' +
      '<div class="scene-bar-head">' +
        '<button class="scene-bar-toggle" data-act="toggle-scene-bar" aria-expanded="' + (mo ? "true" : "false") + '">' +
          icon("sliders", 13) +
          '<span class="scene-bar-lbl">Trạng thái cảnh</span>' +
          (tomTat.length ? '<span class="scene-bar-sum">· ' + esc(tomTat.join(" · ")) + "</span>" : "") +
          (app.loadingMsg
            ? '<span class="scene-bar-loading"><span class="typing"><i></i><i></i><i></i></span>' + esc(app.loadingMsg) + "</span>"
            : "") +
          '<span class="scene-bar-chev">' + icon("chevronDown", 14) + "</span>" +
        "</button>" +
        (g.bat
          ? '<button class="scene-bar-tk" data-act="safeword" aria-label="Từ khoá dừng — dừng cảnh ngay lập tức" title="Dừng cảnh ngay lập tức">' + icon("alert", 14) + " Từ khoá dừng</button>"
          : "") +
      "</div>" +
      '<div class="scene-bar-body">' + rep + gk + khep + pres + "</div>" +
    "</div>"
  );
}

function renderComposer(story, conv) {
  const nvts = nvtsCoMat(story, conv);
  const rieng = canhRiengCua(conv);
  const disabled = app.streaming || !nvts.length;
  const nhomScope = (conv.nhanVatIds || []).length > 1;
  const nutGui = app.streaming
    ? '<button class="btn btn-danger send" data-act="stop" title="Dừng sinh phản hồi — phần đã viết vẫn được giữ">' + icon("stop", 16) + " Dừng</button>"
    : '<button class="btn btn-primary send" data-act="send"' + (disabled ? ' disabled title="Chưa có nhân vật nào trong cảnh"' : "") + ">" + icon("send", 16) + " Gửi</button>";
  return (
    '<div class="composer">' +
      '<div class="input-row">' +
        '<textarea id="composerInput" class="composer-input" rows="1" placeholder="' +
          (app.streaming ? "AI đang viết… bấm Dừng nếu muốn ngắt" : !nvts.length ? (nhomScope ? "Cảnh chưa có ai — bấm “Sửa” ở trên để gọi người vào…" : "Hãy thêm nhân vật trước…") :
            rieng ? "Nói riêng với " + esc(tenNv(story, rieng)) + "…" : nvts.length > 1 ? "Bạn nói hoặc làm gì… (gõ @Tên để gọi một người)" : "Bạn nói hoặc làm gì…") + '"' +
          (disabled ? " disabled" : "") + ">" +
          esc(app.draft) + "</textarea>" +
        '<div class="input-side">' +
          '<button class="icon-btn" data-act="suggest" aria-label="Gợi ý lời thoại" title="Gợi ý lời thoại"' + (disabled ? " disabled" : "") + ">" + icon("sparkle", 17) + "</button>" +
          '<button class="icon-btn" data-act="continue-ai" aria-label="Để AI viết tiếp" title="Để AI viết tiếp"' + (disabled ? " disabled" : "") + ">" + icon("forward", 17) + "</button>" +
          nutGui +
        "</div>" +
      "</div>" +
      '<div class="composer-hint">Enter để gửi · Shift + Enter xuống dòng · dùng *dấu sao* cho hành động</div>' +
    "</div>"
  );
}

function tenNv(story, id) {
  const c = nvCuaId(story, id);
  return c ? c.ten : "nhân vật";
}

function afterRender(story) {
  ganAriaNhan(document);
  ganComposer();
  const sc = $("#chatScroll");
  if (sc) sc.scrollTop = sc.scrollHeight;
  const editInput = $("[data-edit-input]");
  if (editInput) {
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }
  dienAnhTrong(document);
}

function ganComposer() {
  const ta = $("#composerInput");
  if (!ta) return;
  autoGrow(ta);
  ta.addEventListener("input", () => {
    app.draft = ta.value;
    autoGrow(ta);
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  });
  if (!app.streaming) ta.focus();
}

function autoGrow(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
}

function render() {
  if (app.screen === "library") renderLibrary();
  else renderStory();
}

// ==========================================================================
//  HIỆN DIỆN & CẢNH RIÊNG
// ==========================================================================
// Bắt đầu cảnh riêng với một nhân vật: hai người ở riêng, những người khác không
// nghe không thấy — tin nhắn sinh ra trong lúc này được đánh dấu `rieng` để các
// nhân vật khác không bao giờ biết.
async function moCanhRieng(story, conv, nvId) {
  const nv = charById(story, nvId);
  if (!nv) return;
  if ((conv.nhanVatIds || []).indexOf(nvId) < 0) {
    toast("Nhân vật này không thuộc hội thoại.", "error");
    return;
  }
  conv.canhRieng = { nvId, moLuc: Date.now() };
  conv.daCoCanhRieng = true;
  try {
    const arr = await themTinNhan(conv.id, makeMessage("he", "🔒 Cảnh riêng với " + nv.ten + " — chỉ bạn và " + nv.ten + " biết chuyện ở đây."));
    if (arr) capNhatConv(conv, arr);
  } catch (e) {
    console.error(e);
  }
  if (!(await luuTruyen(story))) return;
  render();
  toast("Đang ở cảnh riêng với " + nv.ten + ".");
}

async function dongCanhRieng(story, conv) {
  const nvId = canhRiengCua(conv);
  if (!nvId) return;
  const nv = charById(story, nvId);
  conv.canhRieng = null;
  try {
    const arr = await themTinNhan(conv.id, makeMessage("he", "↩️ Quay lại nhóm." + (nv ? " " + nv.ten + " trở lại cùng mọi người." : "")));
    if (arr) capNhatConv(conv, arr);
  } catch (e) {
    console.error(e);
  }
  if (!(await luuTruyen(story))) return;
  render();
  toast("Đã quay lại nhóm.");
}

// Câu lệnh nhanh trong ô nhập: "Cảnh riêng: Tên" và "Quay lại nhóm".
function xuLyLenhCanh(story, conv, text) {
  const t = String(text || "").trim();
  if (!t) return false;
  const m = /^c[aả]nh\s*ri[eê]ng\s*[:：\-]\s*(.+)$/i.exec(t);
  if (m) {
    const nv = timNvTheoTen(story, conv, m[1]);
    if (!nv) toast("Không tìm thấy nhân vật “" + m[1].trim() + "” trong hội thoại này.", "error");
    else moCanhRieng(story, conv, nv.id);
    return true;
  }
  if (canhRiengCua(conv) && /^(quay l[aạ]i nh[oó]m|tr[oở] l[aạ]i nh[oó]m|k[eế]t th[uú]c c[aả]nh ri[eê]ng|h[eế]t c[aả]nh ri[eê]ng)$/i.test(t)) {
    dongCanhRieng(story, conv);
    return true;
  }
  return false;
}

function timNvTheoTen(story, conv, ten) {
  const t = String(ten || "").trim().toLowerCase();
  if (!t) return null;
  const tat = story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0);
  return (
    tat.find((c) => (c.ten || "").trim().toLowerCase() === t) ||
    tat.find((c) => (c.ten || "").trim().toLowerCase().indexOf(t) >= 0) ||
    tat.find((c) => t.indexOf((c.ten || "").trim().toLowerCase()) >= 0) ||
    null
  );
}

// Chọn nhân vật để nói riêng (danh sách = người đang có mặt trong cảnh).
function openChonCanhRieng() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const dangMo = canhRiengCua(conv);
  // Khi đang ở cảnh riêng, cho phép chuyển sang bất kỳ nhân vật nào của hội thoại;
  // bình thường chỉ liệt kê những người đang có mặt trong cảnh.
  const coMat = dangMo
    ? story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0)
    : nvtsCoMat(story, conv);
  if (!coMat.length) {
    toast("Cảnh này chưa có nhân vật nào đang có mặt.", "error");
    return;
  }
  const body = el("div");
  body.innerHTML =
    '<div class="confirm-text">Nói riêng với một nhân vật trong cùng dòng thời gian. Khi cảnh riêng đang mở, chỉ bạn và nhân vật đó biết chuyện gì xảy ra — ' +
    "những nhân vật khác sẽ không biết, trừ khi sau này được kể lại hoặc tự phát hiện.</div>" +
    '<div class="pick-list">' +
      coMat.map((c) =>
        '<button class="pick' + (canhRiengCua(conv) === c.id ? " on" : "") + '" data-nv="' + esc(c.id) + '">' + avatarHtml(story, c, 24) + "<span>" + esc(c.ten) + "</span>" +
        "<span class='pick-role'>" + esc(c.vaiTro || "") + "</span></button>").join("") +
    "</div>";
  const m = modal({
    title: "Cảnh riêng",
    subtitle: dangMo ? "Đang ở cảnh riêng — chọn người khác để chuyển, hoặc quay lại nhóm" : "Chọn nhân vật bạn muốn nói riêng",
    body,
    actions: dangMo
      ? [
          { label: "Quay lại nhóm", primary: true, onClick: (mm) => { mm.close(); dongCanhRieng(story, conv); } },
          { label: "Đóng", onClick: (mm) => mm.close() },
        ]
      : [{ label: "Đóng", onClick: (mm) => mm.close() }],
  });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-nv]");
    if (!b) return;
    m.close();
    moCanhRieng(story, conv, b.dataset.nv);
  });
}

// Sửa danh sách người đang có mặt (chỉnh tay khi cần thiết).
function openHienDien() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const tat = story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0);
  if (tat.length < 2) {
    toast("Hội thoại này chỉ có một nhân vật.", "error");
    return;
  }
  const chon = new Set(hienDienCua(story, conv));
  const body = el("div");
  const htmlPick = () =>
    '<div class="pick-list">' +
      tat.map((c) =>
        '<button class="pick' + (chon.has(c.id) ? " on" : "") + '" data-nv-hd="' + esc(c.id) + '">' + avatarHtml(story, c, 24) +
        "<span>" + esc(c.ten) + "</span><span class='pick-role'>" + (chon.has(c.id) ? "đang có mặt" : "vắng mặt") + "</span></button>").join("") +
    "</div>";
  body.innerHTML =
    '<div class="confirm-text">Người có mặt mới được nói, hành động và chứng kiến trong cảnh. Người vắng mặt không biết chuyện gì xảy ra. ' +
    "Bạn có thể để cảnh không còn ai — khi đó chỉ còn bạn trong cảnh, và bạn gọi người trở lại bằng chính bảng này.</div>" +
    htmlPick();
  const m = modal({
    title: "Người đang có mặt",
    wide: true,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: "Lưu", primary: true, onClick: async (mm) => {
        conv.hienDien = tat.filter((c) => chon.has(c.id)).map((c) => c.id);
        if (!(await luuTruyen(story))) return;
        mm.close();
        render();
        toast(conv.hienDien.length ? "Đã cập nhật người có mặt." : "Cảnh giờ chỉ còn mình bạn.");
      } },
    ],
  });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-nv-hd]");
    if (!b) return;
    const id = b.dataset.nvHd;
    if (chon.has(id)) chon.delete(id);
    else chon.add(id);
    b.classList.toggle("on");
    const role = b.querySelector(".pick-role");
    if (role) role.textContent = chon.has(id) ? "đang có mặt" : "vắng mặt";
  });
}

// ==========================================================================
//  GỬI TIN NHẮN & SINH PHẢN HỒI
// ==========================================================================
async function onSend() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv || app.streaming) return;
  const ta = $("#composerInput");
  const text = (ta ? ta.value : app.draft).trim();
  if (!text) return;
  // Câu lệnh nhanh ngay trong ô nhập: "Cảnh riêng: Tên" / "Quay lại nhóm".
  if (xuLyLenhCanh(story, conv, text)) {
    app.draft = "";
    if (ta) ta.value = "";
    return;
  }
  app.draft = "";
  xoaGoiY();
  app.loiTam = [];
  const extra = { ten: layNguoiChoi(story) };
  const rieng = canhRiengCua(conv);
  if (rieng) extra.rieng = rieng;
  const msg = makeMessage("nguoi", text, extra);
  const arr = await themTinNhan(conv.id, msg);
  if (!arr) {
    app.draft = text;
    render();
    return;
  }
  capNhatConv(conv, arr);
  await luuTruyen(story);
  render();
  await generateTurn(story, conv);
}

async function generateTurn(story, conv, { auto = false } = {}) {
  const coMat = nvtsCoMat(story, conv);
  if (!coMat.length) {
    toast("Cảnh này chưa có nhân vật nào đang có mặt.", "error");
    return;
  }
  const rieng = canhRiengCua(conv);
  // Cảnh riêng: chỉ người chơi và một nhân vật biết chuyện gì đang diễn ra.
  if (rieng) {
    const nv = charById(story, rieng);
    if (!nv) return;
    batDauLuot();
    updateComposerState();
    await streamOneReply(story, conv, nv, { auto });
    ketThucLuot();
    await luuTruyen(story);
    render();
    maybeCompact(story, conv);
    maybeAutoChronicle(story, conv);
    return;
  }
  conv.goiKhep = false; // lượt mới thì gợi ý khép cảnh cũ không còn giá trị
  const nhom = coMat.length > 1;
  // Hội thoại nhóm vẫn đi theo "đường cảnh nhóm" kể cả khi trong cảnh chỉ còn MỘT
  // nhân vật, để AI còn cách kể người cuối cùng rời cảnh (hoặc người khác bước
  // vào): đường nhập vai đơn không có khối điều khiển hiện diện.
  const theoDoiHienDien = nhom || (conv.nhanVatIds || []).length > 1;
  const msgs = getMessages(conv.id);
  const cuoi = msgs[msgs.length - 1];
  const goi = cuoi && cuoi.vai === "nguoi" ? timNhanVatDuocGoi(story, conv, cuoi.noiDung) : { coMat: [], vangMat: [] };
  const toiDa = Math.max(1, Math.min(Number(CFG.soNguoiTraLoiToiDa) || 3, coMat.length));
  let ids = [];
  batDauLuot();
  updateComposerState();
  try {
    if (!nhom) ids = [coMat[0].id];
    else if (app.responder === "all") ids = coMat.map((c) => c.id);
    else if (goi.coMat.length) ids = goi.coMat.slice(0, toiDa); // người chơi gọi tên → ưu tiên đúng người đó
    else if (app.responder !== "auto" && coMat.some((c) => c.id === app.responder)) ids = [app.responder];
    else {
      app.loadingMsg = "Đang cân nhắc ai sẽ lên tiếng…";
      ids = await AI.pickSpeakers({ story, conv, messages: msgs, toiDa });
      ids = ids.filter((id) => coMat.some((c) => c.id === id)).slice(0, toiDa);
      app.loadingMsg = "";
    }
  } catch (e) {
    console.error(e);
    ids = [coMat[0].id];
  }
  // Bấm dừng trong lúc chờ `pickSpeakers` ⇒ KHÔNG sinh thêm gì. Trước đây chỗ này chỉ
  // cắt danh sách người nói rồi vẫn gọi `streamGroupReply()`, và lời gọi AI mới lại xoá
  // cờ dừng trong `streamText()` — nên cảnh cứ thế diễn tiếp trong khi người dùng đã
  // yêu cầu dừng, và phần xử lý sau khi dừng (chăm sóc sau, lưu trữ) bị chạy sau đó.
  if (app.stopRequested || AI.daYeuCauDungSinh()) {
    ketThucLuot();
    updateComposerState();
    render();
    return;
  }
  if (theoDoiHienDien) {
    const chon = ids.map((id) => charById(story, id)).filter(Boolean);
    if (!chon.length) chon.push(coMat[0]);
    const goiTen = goi.coMat
      .filter((id) => chon.some((c) => c.id === id))
      .map((id) => charById(story, id).ten);
    await streamGroupReply(story, conv, chon, { auto, goiTen, goiVang: goi.vangMat });
  } else {
    await streamOneReply(story, conv, coMat[0], { auto });
  }
  ketThucLuot();
  await luuTruyen(story);
  render();
  maybeCompact(story, conv);
  maybeAutoChronicle(story, conv);
}

// Một lượt nhóm = MỘT lần sinh duy nhất cho cả đoạn cảnh (không sinh rời rạc từng
// nhân vật), nên các nhân vật thật sự đối đáp được với nhau. Sau khi sinh, danh
// sách người có mặt được cập nhật theo khối điều khiển ở cuối phản hồi.
async function streamGroupReply(story, conv, nvts, opts = {}) {
  // Đã có yêu cầu dừng thì tuyệt đối không mở một lời gọi AI mới.
  if (app.stopRequested || AI.daYeuCauDungSinh()) return null;
  const history = opts.history ? opts.history.slice() : getMessages(conv.id).slice();
  const truoc = hienDienCua(story, conv).slice();
  const placeholder = makeMessage("ai", "", {
    nvId: nvts[0].id,
    nvIds: nvts.map((c) => c.id),
    ten: nvts.map((c) => c.ten).join(" · "),
    __streaming: true,
  });
  const node = appendStreamingBubble(story, placeholder);
  let acc = "";
  let raf = 0;
  let loi = null;
  let hienDienMoi = null;
  let rawAI = ""; // văn bản gốc (còn marker) — dùng để đọc tín hiệu hé lộ
  try {
    const res = await AI.replyAsGroup({
      story, conv, messages: history, nhanVats: nvts,
      goiTen: opts.goiTen || [], goiVang: opts.goiVang || [], moDau: !!opts.moDau,
      onChunk: (d) => {
        acc = d.fullTextSoFar;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            // Khối điều khiển ở cuối phản hồi không bao giờ lọt vào phần đang hiện.
            paintStreaming(node, story, AI.catDieuKhien(acc));
          });
        }
      },
    });
    hienDienMoi = res.hienDien;
    if (res && res.raw) rawAI = res.raw;
  // Tín hiệu ẩn: cảnh đang ở điểm nghỉ tự nhiên (chỉ là gợi ý cho người chơi).
  conv.goiKhep = res.khep === true;
    placeholder.noiDung = res.text || (AI.daYeuCauDungSinh() ? "(đã dừng — cảnh chưa kịp diễn ra)" : "…");
  } catch (e) {
    console.error(e);
    loi = e;
    placeholder.noiDung = (e && e.message) || "Có lỗi khi gọi AI.";
  }
  if (AI.daYeuCauDungSinh()) placeholder.daDung = true;
  delete placeholder.__streaming;
  if (raf) cancelAnimationFrame(raf);
  if (loi) {
    app.loiTam.push({ nvId: nvts[0].id, nvIds: nvts.map((c) => c.id), ten: placeholder.ten, noiDung: placeholder.noiDung });
    toast("Không sinh được phản hồi nhóm.", "error");
    render();
    return null;
  }
  const arr = await themTinNhan(conv.id, placeholder);
  if (!arr) {
    render();
    return null;
  }
  capNhatConv(conv, arr);
  if (rawAI) await apDungHeLo(story, rawAI, { htId: conv.id, tnId: placeholder.id, nvId: placeholder.nvId || (placeholder.nvIds || [])[0] || "" });
  // Cập nhật danh sách người có mặt nếu AI đã kể rõ ai vào/ai rời cảnh. Mảng rỗng
  // là thông tin hợp lệ: cảnh giờ chỉ còn người chơi.
  if (hienDienMoi) {
    conv.hienDien = hienDienMoi;
    const di = truoc.filter((id) => hienDienMoi.indexOf(id) < 0);
    const den = hienDienMoi.filter((id) => truoc.indexOf(id) < 0);
    const phan = [];
    if (di.length) phan.push("🚪 " + di.map((id) => tenNv(story, id)).join(", ") + " rời khỏi cảnh.");
    if (den.length) phan.push("➡️ " + den.map((id) => tenNv(story, id)).join(", ") + " bước vào cảnh.");
    if (phan.length) {
      const arr2 = await themTinNhan(conv.id, makeMessage("he", phan.join(" ")));
      if (arr2) capNhatConv(conv, arr2);
    }
  }
  render();
  return arr;
}

async function streamOneReply(story, conv, nv, opts = {}) {
  // Đã có yêu cầu dừng thì tuyệt đối không mở một lời gọi AI mới.
  if (app.stopRequested || AI.daYeuCauDungSinh()) return null;
  const history = opts.history ? opts.history.slice() : getMessages(conv.id).slice();
  const rieng = canhRiengCua(conv);
  const extra = { nvId: nv.id, ten: nv.ten, __streaming: true };
  if (rieng) extra.rieng = rieng;
  const placeholder = makeMessage("ai", "", extra);
  const node = appendStreamingBubble(story, placeholder);
  let acc = "";
  let raf = 0;
  let loi = null;
  let rawAI = ""; // văn bản gốc (còn marker) — dùng để đọc tín hiệu hé lộ
  try {
    const res = await AI.replyAs({
      story, conv, messages: history, nhanVat: nv, auto: !!opts.auto, loaiTask: opts.loaiTask || "",
      onChunk: (d) => {
        acc = d.fullTextSoFar;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            paintStreaming(node, story, AI.catDieuKhien(acc));
          });
        }
      },
    });
    const text = res && typeof res === "object" ? res.text : res;
    if (res && typeof res === "object" && res.raw) rawAI = res.raw;
    // Tín hiệu "đã tới điểm nghỉ" từ model (chỉ có ở lượt thường, không có ở chăm sóc sau).
    if (res && typeof res === "object" && !opts.loaiTask) conv.goiKhep = res.khep === true;
    placeholder.noiDung = text || (AI.daYeuCauDungSinh() ? "(đã dừng — nhân vật chưa kịp nói gì)" : "…");
  } catch (e) {
    console.error(e);
    loi = e;
    placeholder.noiDung = (e && e.message) || "Có lỗi khi gọi AI.";
  }
  const daDung = AI.daYeuCauDungSinh();
  if (daDung) placeholder.daDung = true;
  delete placeholder.__streaming;
  if (raf) cancelAnimationFrame(raf);
  // Phản hồi lỗi không được ghi vào bản ghi truyện (AI sẽ đọc nhầm nó ở lượt sau),
  // nên chỉ hiện tạm trong giao diện kèm nút thử lại.
  if (loi) {
    app.loiTam.push({ nvId: nv.id, ten: nv.ten, noiDung: placeholder.noiDung });
    toast("Không sinh được phản hồi từ " + nv.ten + ".", "error");
    render();
    return null;
  }
  const arr = await themTinNhan(conv.id, placeholder);
  if (!arr) {
    render();
    return null;
  }
  capNhatConv(conv, arr);
  if (rawAI) await apDungHeLo(story, rawAI, { htId: conv.id, tnId: placeholder.id, nvId: placeholder.nvId || (placeholder.nvIds || [])[0] || "" });
  render();
  return arr;
}

function appendStreamingBubble(story, m) {
  const sc = $("#chatScroll");
  if (!sc) return null;
  const empty = $(".chat-empty", sc);
  if (empty) empty.remove();
  const wrap = document.createElement("div");
  wrap.innerHTML = messageHtml(story, currentConv(), m);
  const node = wrap.firstElementChild;
  sc.appendChild(node);
  sc.scrollTop = sc.scrollHeight;
  return node;
}

function paintStreaming(node, story, text) {
  if (!node) return;
  const t = node.querySelector(".msg-text");
  if (!t) return;
  t.innerHTML = fmtBongBong(text, batPhanBiet()) + '<span class="caret"></span>';
  const sc = $("#chatScroll");
  if (sc) {
    const nearBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160;
    if (nearBottom) sc.scrollTop = sc.scrollHeight;
  }
}

async function stopStreaming() {
  if (!app.streaming) {
    AI.stopCurrent();
    return;
  }
  app.stopRequested = true;
  AI.stopCurrent();
  toast("Đang dừng… phần đã viết sẽ được giữ lại.");
}

function updateComposerState() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv || app.screen !== "story") return;
  const box = $(".composer");
  if (box) {
    const tmp = document.createElement("div");
    tmp.innerHTML = renderComposer(story, conv);
    box.replaceWith(tmp.firstElementChild);
  }
  // Thanh trạng thái cảnh và khối "Gợi ý lời đáp" cũng phải vẽ lại (gợi ý mới, dòng
  // "đang nghĩ…"), nhưng tuyệt đối không đụng tới vị trí cuộn của mạch truyện.
  thayKhoiChat(".scene-bar", thanhCanhBar(story, conv));
  thayKhoiChat(".goi-y", goiYkhoiHtml());
  ganComposer();
}

// Thay một khối trong khu chat (vẽ lại tại chỗ, hoặc chèn mới ngay trước ô nhập).
function thayKhoiChat(selector, html) {
  const cu = $(selector);
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const moi = tmp.firstElementChild;
  if (cu) {
    if (moi) cu.replaceWith(moi);
    else cu.remove();
    return moi;
  }
  const box = $(".composer");
  if (moi && box && box.parentNode) box.parentNode.insertBefore(moi, box);
  return moi;
}

async function onContinueAi() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv || app.streaming) return;
  xoaGoiY();
  app.loiTam = [];
  await generateTurn(story, conv, { auto: true });
}

// Nhờ AI tạo bộ gợi ý. Bấm "Tạo hướng khác" khi đã có danh sách thì giữ nguyên danh sách
// cũ + bản nháp trong lúc chờ; chỉ nút tạo lại chuyển sang trạng thái loading. Xong thì
// thay CẢ danh sách, bỏ highlight cũ, và KHÔNG đụng vào ô nhập (chỉ khi người dùng bấm
// một gợi ý thì nội dung ô nhập mới được thay). Lỗi thì giữ nguyên mọi thứ và hiện lỗi.
async function onSuggest() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv || app.streaming || app.suggDangTao) return;
  const nvts = nvtsCoMat(story, conv);
  if (!nvts.length) return;
  const htId = conv.id;
  app.suggDangTao = true;
  app.suggLoi = "";
  batDauLuot();
  updateComposerState();
  try {
    const list = await AI.suggestLines({ story, conv, messages: getMessages(conv.id) });
    if (app.convId === htId) {
      app.suggestions = list;
      app.suggChon = -1;
    }
  } catch (e) {
    if (app.convId === htId) app.suggLoi = (e && e.message) || "Không lấy được gợi ý.";
  }
  app.suggDangTao = false;
  ketThucLuot();
  render();
}

async function onOpening() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv || app.streaming) return;
  batDauLuot();
  updateComposerState();
  try {
    const { text, nhanVat, nvIds, hienDien } = await AI.generateOpening({ story, conv });
    const extra = { nvId: nhanVat.id, ten: nhanVat.ten };
    if (nvIds && nvIds.length > 1) {
      extra.nvIds = nvIds;
      extra.ten = (nvIds.map((id) => nvCuaId(story, id)).filter(Boolean).map((c) => c.ten).join(" · ")) || nhanVat.ten;
    }
    const msg = makeMessage("ai", text, extra);
    const arr = await themTinNhan(conv.id, msg);
    if (arr) {
      capNhatConv(conv, arr);
      if (hienDien) conv.hienDien = hienDien;
      await luuTruyen(story);
    }
  } catch (e) {
    toast(e.message || "Không viết được mở đầu.", "error");
  }
  ketThucLuot();
  render();
}

function capNhatConv(conv, msgs) {
  msgs = Array.isArray(msgs) ? msgs : getMessages(conv.id);
  conv.soTinNhan = msgs.length;
  const last = msgs[msgs.length - 1];
  conv.tinNhanCuoi = last ? last.noiDung.slice(0, 120) : "";
  conv.suaLuc = Date.now();
}

// -------------------------------------------------------------- nén ngữ cảnh
async function maybeCompact(story, conv) {
  if (conv.__compacting) return;
  const msgs = getMessages(conv.id);
  const unsum = msgs.length - (conv.tomTatDen || 0);
  const GIU = 8;
  const promptLen = AI.countTokens(AI.buildPrompt(story, conv, msgs, ""));
  const quaNguong = promptLen > AI.idealMaxTokens() * (CFG.tyLeNguongTomTat || 0.7);
  const quaNhieu = unsum >= (CFG.soTinNhanGiuNguyenVan || 36) - 4;
  if (!quaNguong && !quaNhieu) return;
  const foldEnd = msgs.length - GIU;
  if (foldEnd <= (conv.tomTatDen || 0)) return;
  conv.__compacting = true;
  const cuTomTat = conv.tomTat || "";
  const cuDen = conv.tomTatDen || 0;
  try {
    // Tóm tắt TÍCH LUỸ: bản cũ được gộp vào bản mới, không bao giờ bị thay thế.
    const sum = await AI.summarizeConversation({ story, conv, messages: msgs, foldEnd, tomTatCu: cuTomTat });
    if (sum && sum !== cuTomTat) {
      conv.tomTat = sum;
      conv.tomTatDen = foldEnd;
      const ok = await luuTruyen(story, "bộ nhớ hội thoại");
      if (!ok) {
        conv.tomTat = cuTomTat;
        conv.tomTatDen = cuDen;
      } else {
        console.log("[Truyện Vai] đã nén ngữ cảnh tới tin nhắn #" + foldEnd);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    delete conv.__compacting;
  }
}

async function maybeAutoChronicle(story, conv) {
  if (!store.settings.autoChronicle) return;
  const msgs = getMessages(conv.id);
  const from = conv.ghinhoDen || 0;
  if (msgs.length - from < 12) return;
  try {
    const facts = await AI.extractFacts({
      story, conv, messages: msgs.slice(Math.max(0, msgs.length - 14)),
    });
    if (facts.length) {
      const cuBn = (story.bienNienSu || []).length;
      story.bienNienSu = story.bienNienSu || [];
      for (const f of facts) story.bienNienSu.push({ id: uid("bn"), noiDung: f, nguon: conv.tieuDe, luc: Date.now() });
      const cuDen = conv.ghinhoDen || 0;
      conv.ghinhoDen = msgs.length;
      if (!(await luuTruyen(story, "biên niên sử"))) {
        story.bienNienSu.length = cuBn;
        conv.ghinhoDen = cuDen;
        return;
      }
      toast("Đã ghi " + facts.length + " sự kiện vào biên niên sử.");
    }
  } catch (e) {
    console.error(e);
  }
}

// ==========================================================================
//  LỚP GIAO KÈO (BDSM / trao đổi quyền lực) — dùng chung cho wizard & modal
// ==========================================================================
function htmlThichChips(g, p) {
  const ds = (R.SoThichBdsm && R.SoThichBdsm()) || [];
  const chon = Array.isArray(g.soThich) ? g.soThich : [];
  const nhoms = [];
  ds.forEach((x) => { if (nhoms.indexOf(x.nhom) < 0) nhoms.push(x.nhom); });
  return (
    '<div class="gk-thich-box">' +
    nhoms.map((n) =>
      '<div class="gk-thich-nhom"><div class="gk-thich-ten">' + esc(n) + "</div>" +
      '<div class="gk-thich-row">' +
      ds.filter((x) => x.nhom === n).map((x) =>
        '<button type="button" class="gk-thich' + (chon.indexOf(x.id) >= 0 ? " on" : "") + '" data-gk-thich="' + esc(x.id) + '" title="' + esc(x.moTa || "") + '">' +
        esc((x.emoji ? x.emoji + " " : "") + x.ten) + "</button>").join("") +
      "</div></div>").join("") +
    "</div>" +
    '<input type="hidden" data-f="' + p + 'soThich" value="' + esc(chon.join(",")) + '">'
  );
}

function htmlMauGiaoKeo(p) {  const maus = (R.MauGiaoKeo && R.MauGiaoKeo()) || [];
  if (!maus.length) return "";
  return (
    '<div class="gk-sec">Mẫu dựng sẵn — bấm để điền hết các mục bên dưới, rồi sửa lại theo ý bạn</div>' +
    '<div class="gk-mau-row">' +
    maus.map((m) =>
      '<button type="button" class="gk-mau" data-gk-mau="' + esc(m.id) + '" title="' + esc(m.moTa || "") + '">' +
      '<span class="gk-mau-emoji">' + esc(m.emoji || "✦") + "</span>" +
      '<span class="gk-mau-ten">' + esc(m.ten) + "</span></button>").join("") +
    "</div>"
  );
}

// Chip chọn sở thích cho MỘT nhân vật (khác với giao kèo của cả truyện).
function htmlThichChipsNv(g) {
  const ds = (R.SoThichBdsm && R.SoThichBdsm()) || [];
  const chon = g && Array.isArray(g.soThich) ? g.soThich : [];
  const nhoms = [];
  ds.forEach((x) => { if (nhoms.indexOf(x.nhom) < 0) nhoms.push(x.nhom); });
  return (
    '<div class="gk-thich-box">' +
    nhoms.map((n) =>
      '<div class="gk-thich-nhom"><div class="gk-thich-ten">' + esc(n) + "</div>" +
      '<div class="gk-thich-row">' +
      ds.filter((x) => x.nhom === n).map((x) =>
        '<button type="button" class="gk-thich' + (chon.indexOf(x.id) >= 0 ? " on" : "") + '" data-nv-thich="' + esc(x.id) + '" title="' + esc(x.moTa || "") + '">' +
        esc((x.emoji ? x.emoji + " " : "") + x.ten) + "</button>").join("") +
      "</div></div>").join("") +
    "</div>" +
    '<input type="hidden" data-f="soThich" value="' + esc(chon.join(",")) + '">'
  );
}

function paintNvThich(scope) {
  const hidden = scope.querySelector('[data-f="soThich"]');
  if (!hidden) return;
  const chon = String(hidden.value || "").split(",").filter(Boolean);
  scope.querySelectorAll("[data-nv-thich]").forEach((x) => x.classList.toggle("on", chon.indexOf(x.dataset.nvThich) >= 0));
}

function htmlGiaoKeo(g, p) {
  const mucDos = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  const canhs = (R.CanhBdsm && R.CanhBdsm()) || [];
  const kieuQH = (R.KieuQuanHe && R.KieuQuanHe()) || [];
  const nhips = (R.NhipDoBdsm && R.NhipDoBdsm()) || [];
  const dois = (R.DoDaiCanh && R.DoDaiCanh()) || [];
  const ngons = (R.NgonNguBdsm && R.NgonNguBdsm()) || [];
  const dangChon = mucDos.find((x) => Number(x.so) === Number(g.mucDo)) || mucDos[2] || {};
  const kieuChon = kieuQH.find((x) => x.id === g.kieuQuanHe) || null;
  const o = (ds, id, macDinh) =>
    ds.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === id ? " selected" : "") + ">" + esc(x.ten) + "</option>").join("") ||
    '<option value="' + esc(macDinh || "") + '">—</option>';
  return (
    '<div class="gk-toggle">' +
      '<input type="checkbox" class="gk-check" id="' + p + 'Bat" data-f="' + p + 'bat"' + (g.bat ? " checked" : "") + ">" +
      '<label for="' + p + 'Bat"><span class="gk-toggle-name">' + esc("Bật giao kèo trao đổi quyền lực (BDSM M/M)") + "</span>" +
      '<span class="hint">AI sẽ viết sâu về quyền lực, đồng thuận, giới hạn và chăm sóc sau — và luôn tôn trọng từ khoá dừng.</span></label>' +
    "</div>" +
    '<div class="gk-fields" data-gk-fields' + (g.bat ? "" : " hidden") + ">" +
      '<div class="hint gk-tuoi">' +
        '<label class="lb-check"><input type="checkbox" data-f="' + p + 'nguoiLon"' + (g.nguoiLon ? " checked" : "") + "> Tôi xác nhận mọi nhân vật trong truyện này đều là người trưởng thành (18+)</label>" +
      "</div>" +
      htmlMauGiaoKeo(p) +

      '<div class="gk-sec">Vai &amp; cường độ</div>' +
      '<div class="grid-2">' +
        '<div><label class="field-label">Vai của bạn</label><select class="input" data-f="' + p + 'vaiNguoiChoi">' +
          '<option value="sub">Sub — trao quyền cho nhân vật</option>' +
          '<option value="dom">Dom — nắm quyền</option>' +
          '<option value="switch">Switch — đổi vai</option>' +
        "</select></div>" +
        '<div><label class="field-label">Từ khoá dừng</label><input class="input" data-f="' + p + 'tuKhoaDung" placeholder="đỏ"></div>' +
      "</div>" +
      '<label class="field-label">Mức độ</label>' +
      '<div class="mucdo-row">' +
        mucDos.map((m) =>
          '<button type="button" class="mucdo' + (Number(m.so) === Number(g.mucDo) ? " on" : "") + '" data-mucdo="' + esc(m.so) + '" title="' + esc(m.moTa) + '">' +
          "<b>" + esc(m.so) + "</b><span>" + esc(m.ten) + "</span></button>").join("") +
      "</div>" +
      '<input type="hidden" data-f="' + p + 'mucDo" value="' + esc(g.mucDo || 3) + '">' +
      '<div class="hint" data-mucdo-mota>' + esc(dangChon.moTa || "") + "</div>" +

      '<div class="gk-sec">Khung quan hệ &amp; nhịp cảnh</div>' +
      '<label class="field-label">Khung quan hệ</label>' +
      '<select class="input" data-f="' + p + 'kieuQuanHe"><option value="">— không đặt khung trước —</option>' +
        kieuQH.map((k) => '<option value="' + esc(k.id) + '"' + (k.id === g.kieuQuanHe ? " selected" : "") + ">" + esc(k.emoji + " " + k.ten) + "</option>").join("") +
      "</select>" +
      '<div class="hint" data-kieu-mota>' + esc(kieuChon ? kieuChon.moTa : "") + "</div>" +
      '<div class="grid-2">' +
        '<div><label class="field-label">Nhịp độ</label><select class="input" data-f="' + p + 'nhipDo">' + o(nhips, g.nhipDo) + "</select></div>" +
        '<div><label class="field-label">Độ dài cảnh</label><select class="input" data-f="' + p + 'doDai">' + o(dois, g.doDai) + "</select></div>" +
      "</div>" +
      '<label class="field-label">Ngôn ngữ trong cảnh</label>' +
      '<select class="input" data-f="' + p + 'ngonNgu">' + o(ngons, g.ngonNgu) + "</select>" +

      '<div class="gk-sec">Điều bạn muốn có trong cảnh</div>' +
      '<div class="hint">Chọn bao nhiêu cũng được. Chỉ những thứ được chọn (hoặc nhẹ hơn) mới xuất hiện — thứ khác phải hỏi trong cảnh trước.</div>' +
      htmlThichChips(g, p) +
      '<label class="field-label">Không khí / bối cảnh của cảnh</label>' +
      '<select class="input" data-f="' + p + 'canh"><option value="">— chọn nhanh một bối cảnh —</option>' +
        canhs.map((c) => '<option value="' + esc(c.moTa) + '">' + esc(c.ten) + "</option>").join("") +
      "</select>" +
      '<textarea class="input" data-f="' + p + 'khongKhi" rows="2" placeholder="Phòng riêng, đạo cụ, không khí…"></textarea>' +

      '<div class="gk-sec">Giới hạn &amp; an toàn</div>' +
      '<label class="field-label">Giới hạn cứng — tuyệt đối không xuất hiện</label>' +
      '<textarea class="input" data-f="' + p + 'gioiHanCung" rows="2" placeholder="Ví dụ: không máu, không dao, không nhắc tới gia đình…"></textarea>' +
      '<label class="field-label">Giới hạn mềm — chỉ chạm tới nếu đã thoả thuận trong cảnh</label>' +
      '<textarea class="input" data-f="' + p + 'gioiHanMem" rows="2"></textarea>' +
      '<label class="field-label">Luật riêng luôn đúng trong mọi cảnh</label>' +
      '<textarea class="input" data-f="' + p + 'luatCanh" rows="2" placeholder="Ví dụ: mọi hình phạt đều được đếm; không bao giờ để người chơi một mình khi còn bị trói…"></textarea>' +

      '<div class="gk-sec">Xưng hô &amp; chăm sóc sau</div>' +
      '<label class="field-label">Cách xưng hô trong cảnh</label>' +
      '<input class="input" data-f="' + p + 'danhXung" placeholder="Ví dụ: gọi tôi là “chủ nhân”, tôi gọi bạn là “em”">' +
      '<label class="field-label">Chăm sóc sau</label>' +
      '<textarea class="input" data-f="' + p + 'chamSocSau" rows="2" placeholder="Bạn muốn được chăm sóc thế nào sau mỗi cảnh?"></textarea>' +
      '<label class="field-label">Dặn dò riêng cho AI</label>' +
      '<textarea class="input" data-f="' + p + 'luuY" rows="2"></textarea>' +
    "</div>"
  );
}

function dienGiaoKeo(scope, p, g) {
  const F = (f) => scope.querySelector('[data-f="' + p + f + '"]');
  const set = (f, v) => { const e = F(f); if (e) e.value = v == null ? "" : v; };
  if (F("bat")) F("bat").checked = !!g.bat;
  if (F("nguoiLon")) F("nguoiLon").checked = !!g.bat || g.nguoiLon === true;
  set("vaiNguoiChoi", g.vaiNguoiChoi || "sub");
  set("tuKhoaDung", g.tuKhoaDung || "đỏ");
  set("mucDo", g.mucDo || 3);
  set("kieuQuanHe", g.kieuQuanHe || "");
  set("nhipDo", g.nhipDo || "theo-dien-bien");
  set("doDai", g.doDai || "vua");
  set("ngonNgu", g.ngonNgu || "tu-nhien");
  set("soThich", Array.isArray(g.soThich) ? g.soThich.join(",") : "");
  set("khongKhi", g.khongKhi || "");
  set("gioiHanCung", g.gioiHanCung || "");
  set("gioiHanMem", g.gioiHanMem || "");
  set("luatCanh", g.luatCanh || "");
  set("danhXung", g.danhXung || "");
  set("chamSocSau", g.chamSocSau || "");
  set("luuY", g.luuY || "");
  paintGiaoKeo(scope, p);
}

// Đồng bộ lại phần nhìn (chip mức độ, chip sở thích, gợi ý khung quan hệ) theo giá trị hiện có.
function paintGiaoKeo(scope, p) {
  const F = (f) => scope.querySelector('[data-f="' + p + f + '"]');
  const mucDos = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  const so = Number((F("mucDo") || {}).value) || 3;
  scope.querySelectorAll("[data-mucdo]").forEach((x) => x.classList.toggle("on", Number(x.dataset.mucdo) === so));
  const m = mucDos.find((x) => Number(x.so) === so);
  const mo = scope.querySelector("[data-mucdo-mota]");
  if (mo && m) mo.textContent = m.moTa || "";
  const chon = String((F("soThich") || {}).value || "").split(",").filter(Boolean);
  scope.querySelectorAll("[data-gk-thich]").forEach((x) => x.classList.toggle("on", chon.indexOf(x.dataset.gkThich) >= 0));
  const kieuEl = F("kieuQuanHe");
  const kq = ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((x) => x.id === (kieuEl ? kieuEl.value : ""));
  const km = scope.querySelector("[data-kieu-mota]");
  if (km) km.textContent = kq ? kq.moTa : "";
}

function docGiaoKeo(scope, p, g) {
  const F = (f) => scope.querySelector('[data-f="' + p + f + '"]');
  const val = (f) => { const e = F(f); return e ? (e.value || "").trim() : ""; };
  const batYeuCau = !!(F("bat") && F("bat").checked);
  const xacNhan18 = !!(F("nguoiLon") && F("nguoiLon").checked);
  // Lớp BDSM chỉ được bật khi người dùng đã xác nhận mọi nhân vật là người trưởng thành.
  g.bat = batYeuCau && xacNhan18;
  g.nguoiLon = xacNhan18;
  if (batYeuCau && !xacNhan18) {
    toast("Hãy xác nhận mọi nhân vật là người trưởng thành (18+) để bật giao kèo.", "error");
  }
  g.vaiNguoiChoi = val("vaiNguoiChoi") || "sub";
  g.tuKhoaDung = val("tuKhoaDung") || "đỏ";
  g.mucDo = Math.max(1, Math.min(5, Number(val("mucDo")) || 3));
  g.kieuQuanHe = val("kieuQuanHe");
  g.nhipDo = val("nhipDo") || "theo-dien-bien";
  g.doDai = val("doDai") || "vua";
  g.ngonNgu = val("ngonNgu") || "tu-nhien";
  g.soThich = val("soThich").split(",").map((s) => s.trim()).filter(Boolean);
  g.khongKhi = val("khongKhi");
  g.gioiHanCung = val("gioiHanCung");
  g.gioiHanMem = val("gioiHanMem");
  g.luatCanh = val("luatCanh");
  g.danhXung = val("danhXung");
  g.chamSocSau = val("chamSocSau");
  g.luuY = val("luuY");
  return g;
}

function ganSuKienGiaoKeo(scope, p) {
  const F = (f) => scope.querySelector('[data-f="' + p + f + '"]');
  const fields = scope.querySelector("[data-gk-fields]");
  const bat = F("bat");
  if (bat) {
    bat.addEventListener("change", () => {
      const nl = F("nguoiLon");
      if (!bat.checked) {
        if (fields) fields.hidden = true;
        return;
      }
      if (!nl || nl.checked) {
        if (fields) fields.hidden = false;
        return;
      }
      modal({
        title: "Nội dung dành cho người lớn",
        body:
          '<div class="confirm-text">' +
          esc("Giao kèo là lớp nội dung BDSM dành cho người lớn. Trước khi bật, bạn cần xác nhận rằng mọi nhân vật trong truyện này đều là người trưởng thành (18+), và bạn cũng là người trưởng thành.") +
          "</div>",
        dismissable: true,
        onClose: () => {
          if (!nl.checked) {
            bat.checked = false;
            if (fields) fields.hidden = true;
          }
        },
        actions: [
          { label: "Huỷ", onClick: (m2) => m2.close() },
          {
            label: "Tôi xác nhận 18+",
            primary: true,
            onClick: (m2) => {
              nl.checked = true;
              m2.close();
              if (fields) fields.hidden = false;
            },
          },
        ],
      });
    });
  }
  const maus = (R.MauGiaoKeo && R.MauGiaoKeo()) || [];
  scope.addEventListener("click", (e) => {
    const mauBtn = e.target.closest("[data-gk-mau]");
    if (mauBtn && scope.contains(mauBtn)) {
      e.preventDefault();
      const m = maus.find((x) => x.id === mauBtn.dataset.gkMau);
      if (!m) return;
      const hienTai = docGiaoKeo(scope, p, giaoKeoMacDinh());
      const next = Object.assign({}, hienTai, m.ap || {});
      if (Array.isArray(m.ap && m.ap.soThich)) next.soThich = m.ap.soThich.slice();
      dienGiaoKeo(scope, p, next);
      if (fields && m.ap && !("bat" in m.ap)) fields.hidden = false;
      const b = F("bat");
      if (b) b.checked = true;
      return;
    }
    const thich = e.target.closest("[data-gk-thich]");
    if (thich && scope.contains(thich)) {
      e.preventDefault();
      const hidden = F("soThich");
      if (!hidden) return;
      const ds = String(hidden.value || "").split(",").filter(Boolean);
      const id = thich.dataset.gkThich;
      const i = ds.indexOf(id);
      if (i >= 0) ds.splice(i, 1);
      else ds.push(id);
      hidden.value = ds.join(",");
      thich.classList.toggle("on", i < 0);
      return;
    }
    const b = e.target.closest("[data-mucdo]");
    if (!b || !scope.contains(b)) return;
    e.preventDefault();
    const so = Number(b.dataset.mucdo);
    const hidden = F("mucDo");
    if (hidden) hidden.value = so;
    paintGiaoKeo(scope, p);
  });
  const kieu = F("kieuQuanHe");
  if (kieu) kieu.addEventListener("change", () => paintGiaoKeo(scope, p));
  const canh = F("canh");
  if (canh) {
    canh.addEventListener("change", () => {
      if (!canh.value) return;
      const ta = F("khongKhi");
      if (ta) ta.value = ta.value.trim() ? ta.value.trim() + "\n" + canh.value : canh.value;
      canh.value = "";
    });
  }
}

// ==========================================================================
//  MODAL: CỐT TRUYỆN MỚI
// ==========================================================================
// Màn "Cốt truyện mới" — Đợt 6b: thân màn nằm ở `src/ui/taoTruyen/`.
//
// `openNewStoryModal` nay chỉ còn là VỎ: nó nối các mảnh trong `src/ui/taoTruyen/` với
// những hàm SỐNG TRONG TỆP NÀY (điều hướng, tạo truyện, khối giao kèo, cửa 18+) qua
// `TAO_TRUYEN_DEPS`. Cùng luật một chiều như `src/ui/nhanVat/`.
const TAO_TRUYEN_DEPS = {
  $$,
  mauCotTruyen: () => (R.MauCotTruyen ? R.MauCotTruyen() : null),
  theLoai: () => (R.TheLoai ? R.TheLoai() : null),
  docGiaoKeo, htmlGiaoKeo, paintGiaoKeo, ganSuKienGiaoKeo,
  xacNhan18Plus, xacNhan18PlusTruyen,
  openStory, baoLoiLuu,
  sinhHuongNhanVat, chonHuongNhanVat, mauChoices: MAU_CHOICES,
};

function openNewStoryModal(opts = {}) {
  return moTaoTruyen(opts, TAO_TRUYEN_DEPS);
}

// ==========================================================================
//  MODAL: NHÂN VẬT
// ==========================================================================
// --- Tạo nhân vật bằng AI theo hai bước: nghĩ ra vài hướng → người dùng chọn → mới viết chi tiết ---
function htmlHuongNhanVat(ds) {
  return (
    '<div class="nv-opt-head">' + ds.length + " hướng khác nhau — chọn một hướng để AI viết chi tiết:</div>" +
    ds
      .map(
        (o, i) =>
          '<div class="nv-opt" data-nv-opt="' + i + '">' +
          '<div class="nv-opt-top"><span class="nv-opt-so">' + (i + 1) + "</span>" +
          '<span class="nv-opt-ten">' + esc(o.ten) + "</span>" +
          (o.vaiTro ? '<span class="nv-opt-vai">' + esc(o.vaiTro) + "</span>" : "") +
          "</div>" +
          '<div class="nv-opt-tom">' + esc(o.tomTat) + "</div>" +
          '<button type="button" class="btn btn-sm btn-primary" data-nv-opt-chon="' + i + '">' + icon("check", 14) + " Chọn hướng này</button>" +
          "</div>"
      )
      .join("")
  );
}

function danhDauHuongDaChon(scope, i) {
  $$("[data-nv-opt]", scope).forEach((n) => n.classList.toggle("chon", Number(n.dataset.nvOpt) === i));
  $$("[data-nv-opt-chon]", scope).forEach((n) => { n.disabled = true; });
}

function yTuongTheoHuong(o, goc) {
  return (
    "Hướng đã chọn — TÊN: " + o.ten + "; VAI TRÒ: " + o.vaiTro + "; NÉT RIÊNG: " + o.tomTat +
    (goc ? ". Yêu cầu gốc của người dùng: " + goc : "") +
    ". Viết chi tiết cho ĐÚNG hướng này, không đổi sang hướng khác."
  );
}

// Bước 1: nhờ AI nghĩ vài hướng rồi vẽ vào [data-nv-opts] của `scope`.
async function sinhHuongNhanVat({ story, yTuong, bdsm, scope, status }) {
  const ctn = scope.querySelector("[data-nv-opts]");
  if (ctn) {
    ctn.innerHTML = "";
    delete ctn.dataset.huong;
  }
  status.innerHTML = anhLoading() + " Đang nghĩ các hướng nhân vật…";
  let ds = [];
  try {
    ds = await AI.generateCharacterOptions({ story, yTuong, bdsm });
  } catch (err) {
    status.textContent = "Lỗi: " + (err.message || err);
    return;
  }
  if (ctn) {
    ctn.dataset.huong = JSON.stringify(ds);
    ctn.innerHTML = htmlHuongNhanVat(ds);
    try { ctn.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
  }
  status.textContent = "Chọn một hướng ở dưới — AI sẽ viết chi tiết cho hướng đó.";
}

// Bước 2: đã chọn hướng — viết chi tiết rồi giao lại cho `onXong(gen, huong)` (trả về câu thông báo nếu muốn).
async function chonHuongNhanVat({ scope, i, story, bdsm, yTuongGoc, status, onXong }) {
  const ctn = scope.querySelector("[data-nv-opts]");
  if (!ctn) return;
  let ds = [];
  try { ds = JSON.parse(ctn.dataset.huong || "[]"); } catch (err) { ds = []; }
  const o = ds[i];
  if (!o) return;
  const nut = scope.querySelector('[data-nv-opt-chon="' + i + '"]');
  danhDauHuongDaChon(scope, i);
  if (nut) nut.textContent = "Đang viết chi tiết…";
  status.innerHTML = anhLoading() + " Đang viết chi tiết nhân vật…";
  try {
    const gen = await AI.generateCharacter({ story, yTuong: yTuongTheoHuong(o, yTuongGoc), bdsm });
    const msg = await onXong(gen, o);
    status.textContent = msg || ("Đã viết chi tiết theo hướng “" + o.ten + "”. Chưa ưng thì bấm “Tạo bằng AI” để đổi hướng khác.");
  } catch (err) {
    status.textContent = "Lỗi: " + (err.message || err);
    if (nut) { nut.disabled = false; nut.textContent = "Chọn hướng này"; }
  }
}

// Màn "Thêm/Sửa nhân vật" — Đợt 6b: thân màn nằm ở `src/ui/nhanVat/`.
//
// `openCharacterEditor` nay chỉ còn là VỎ: nó nối các mảnh trong `src/ui/nhanVat/` với
// những hàm SỐNG TRONG TỆP NÀY (điều hướng, ghi dữ liệu, thư viện ngoại hình) qua
// `NHAN_VAT_DEPS`. Chiều import là MỘT CHIỀU: `src/ui/*` được import lõi; lõi KHÔNG BAO GIỜ
// import `src/ui/*`. Danh sách dưới đây cố ý chỉ chứa thứ không import được từ lõi
// (dom/store/ngoaiHinh/ai) — đừng biến nó thành một túi đồ nghề chung.
const NHAN_VAT_DEPS = {
  currentStory, luuTruyen, render, xoaNhanVat, thuNhoAnh,
  xacNhan18PlusTruyen, openNgoaiHinh, openSuaNgoaiHinh,
  sinhHuongNhanVat, chonHuongNhanVat,
  avatarHtml, htmlLienKetNgoaiHinh, dienLienKetNgoaiHinh, htmlThichChipsNv, paintNvThich,
  mauChoices: MAU_CHOICES, emojiChoices: EMOJI_CHOICES,
  mauNhanVat: () => (R.MauNhanVat ? R.MauNhanVat() : null),
};

function openCharacterEditor(charId, opts = {}) {
  return moNhanVat(charId, opts, NHAN_VAT_DEPS);
}

function xoaNhanVat(charId) {
  const story = currentStory();
  const c = charById(story, charId);
  if (!c) return;
  confirmModal("Xoá nhân vật", "Xoá “" + c.ten + "”? Nhân vật sẽ bị gỡ khỏi mọi hội thoại. Tin nhắn cũ vẫn được giữ.", async () => {
    const truoc = JSON.parse(JSON.stringify(story));
    story.nhanVats = story.nhanVats.filter((x) => x.id !== charId);
    for (const conv of story.hoiThoais) {
      conv.nhanVatIds = (conv.nhanVatIds || []).filter((id) => id !== charId);
      conv.hienDien = hienDienNhom(conv);
      if (canhRiengCua(conv)) conv.canhRieng = null;
    }
    if (!(await luuTruyen(story, "xoá nhân vật"))) {
      story.nhanVats = truoc.nhanVats;
      story.hoiThoais = truoc.hoiThoais;
      render();
      return;
    }
    toast("Đã xoá nhân vật.");
    render();
  }, { danger: true, yesLabel: "Xoá" });
}

async function thuNhoAnh(file, max) {
  const dataUrl = await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(file);
  });
  try {
    const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * scale);
    cv.height = Math.round(bmp.height * scale);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.82);
  } catch (e) {
    return dataUrl;
  }
}

function openCharacterList() {
  const story = currentStory();
  if (!story) return;
  const body = el("div");
  const renderList = () => {
    body.innerHTML = story.nhanVats.length
      ? '<div class="char-list">' + story.nhanVats.map((c) =>
          '<div class="char-row"><div class="char-row-main">' + avatarHtml(story, c, 40) +
          '<div><div class="char-name">' + esc(c.ten) + "</div>" +
          '<div class="char-role">' + esc(c.vaiTro || "nhân vật") + "</div>" +
          '<div class="char-snip">' + esc((c.moTa || c.tinhCach || "").slice(0, 120)) + "</div></div></div>" +
          '<div class="char-row-actions">' +
            '<button class="btn btn-sm" data-act="edit-char" data-id="' + esc(c.id) + '">' + icon("edit", 13) + "</button>" +
            '<button class="btn btn-sm btn-danger" data-act="del-char" data-id="' + esc(c.id) + '">' + icon("trash", 13) + "</button>" +
          "</div></div>").join("") + "</div>"
      : '<div class="hint">Chưa có nhân vật nào trong truyện này.</div>';
  };
  renderList();
  const m = modal({
    title: "Nhân vật trong truyện",
    subtitle: "Bạn là người chơi duy nhất — mọi nhân vật ở đây đều do AI thể hiện.",
    wide: true,
    body,
    actions: [{ label: "Thêm nhân vật", primary: true, onClick: (mm) => { mm.close(); openCharacterEditor(null, { focusTen: true }); } }],
  });
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "edit-char") {
      m.close();
      openCharacterEditor(b.dataset.id);
    }
    if (b.dataset.act === "del-char") {
      m.close();
      xoaNhanVat(b.dataset.id);
    }
  });
}

// ==========================================================================
//  MODAL: BIÊN NIÊN SỬ
// ==========================================================================
function openChronicle() {
  const story = currentStory();
  if (!story) return;
  story.bienNienSu = story.bienNienSu || [];
  const body = el("div");
  let m = null;
  const capNhatSub = () => {
    if (!m) return;
    const s = m.box.querySelector(".modal-subtitle");
    if (s) s.textContent = story.bienNienSu.length + " mục";
  };
  const paint = () => {
    body.innerHTML =
      '<div class="hint">Biên niên sử là ký ức chung của cả cốt truyện: mọi sự kiện ở đây luôn được gửi kèm cho AI trong tất cả hội thoại, không phụ thuộc vào việc hội thoại đó có nhớ hay không.</div>' +
      (story.bienNienSu.length
        ? '<div class="bn-list">' + story.bienNienSu.map((b) =>
            '<div class="bn-row"><span class="bn-text">' + esc(b.noiDung) + "</span>" +
            (b.nguon ? '<span class="bn-src">' + esc(b.nguon) + "</span>" : "") +
            '<button class="tool" data-act="edit-bn" data-id="' + esc(b.id) + '">' + icon("edit", 14) + "</button>" +
            '<button class="tool danger" data-act="del-bn" data-id="' + esc(b.id) + '">' + icon("trash", 14) + "</button></div>").join("") + "</div>"
        : '<div class="hint">Chưa có mục nào.</div>');
    capNhatSub();
  };
  paint();
  m = modal({
    title: "Biên niên sử",
    subtitle: (story.bienNienSu.length || 0) + " mục",
    wide: true,
    body,
    actions: [
      { label: "Thêm mục", onClick: (mm) => { mm.close(); themBn(); } },
      { label: "Đóng", primary: true, onClick: (mm) => mm.close() },
    ],
  });
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const item = story.bienNienSu.find((x) => x.id === b.dataset.id);
    if (!item) return;
    if (b.dataset.act === "del-bn") {
      const cu = story.bienNienSu;
      story.bienNienSu = story.bienNienSu.filter((x) => x.id !== item.id);
      if (!(await luuTruyen(story, "biên niên sử"))) {
        story.bienNienSu = cu;
        paint();
        return;
      }
      paint();
      render();
    }
    if (b.dataset.act === "edit-bn") {
      promptModal("Sửa mục biên niên sử", {
        value: item.noiDung, multiline: true,
        onSave: async (v) => {
          const cu = item.noiDung;
          if (v) item.noiDung = v;
          if (!(await luuTruyen(story, "biên niên sử"))) {
            item.noiDung = cu;
            paint();
            return;
          }
          paint();
          render();
        },
      });
    }
  });

  function themBn() {
    promptModal("Thêm mục biên niên sử", {
      label: "Sự kiện / chi tiết cần ghi nhớ", multiline: true,
      subtitle: "Hãy viết đủ ngữ cảnh để đọc riêng vẫn hiểu, dùng tên riêng thay vì đại từ.",
      onSave: async (v) => {
        if (!v) return;
        story.bienNienSu.push({ id: uid("bn"), noiDung: v, nguon: "thủ công", luc: Date.now() });
        if (!(await luuTruyen(story, "biên niên sử"))) {
          story.bienNienSu.pop();
          return;
        }
        render();
        openChronicle();
      },
    });
  }
}

async function chronicleFromConv() {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const msgs = getMessages(conv.id);
  if (msgs.length < 2) {
    toast("Hội thoại chưa có đủ nội dung.", "error");
    return;
  }
  batDauLuot();
  updateComposerState();
  try {
    const facts = await AI.extractFacts({ story, conv, messages: msgs.slice(-20) });
    if (!facts.length) {
      toast("Không tìm thấy sự kiện mới.");
    } else {
      const cuBn = (story.bienNienSu || []).length;
      story.bienNienSu = story.bienNienSu || [];
      for (const f of facts) story.bienNienSu.push({ id: uid("bn"), noiDung: f, nguon: conv.tieuDe, luc: Date.now() });
      if (!(await luuTruyen(story, "biên niên sử"))) {
        story.bienNienSu.length = cuBn;
        render();
        return;
      }
      toast("Đã ghi " + facts.length + " sự kiện vào biên niên sử.");
      render();
    }
  } catch (e) {
    toast(e.message || "Lỗi khi trích xuất.", "error");
  } finally {
    ketThucLuot();
    updateComposerState();
  }
}

async function factsFromMessage(mid) {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const msgs = getMessages(conv.id);
  const idx = msgs.findIndex((x) => x.id === mid);
  if (idx < 0) return;
  batDauLuot();
  updateComposerState();
  let daThem = false;
  try {
    const facts = await AI.extractFacts({ story, conv, messages: msgs.slice(Math.max(0, idx - 8), idx + 1), soLuong: 3 });
    if (facts.length) {
      const cuBn = (story.bienNienSu || []).length;
      story.bienNienSu = story.bienNienSu || [];
      for (const f of facts) story.bienNienSu.push({ id: uid("bn"), noiDung: f, nguon: conv.tieuDe, luc: Date.now() });
      if (!(await luuTruyen(story, "biên niên sử"))) story.bienNienSu.length = cuBn;
      else {
        daThem = true;
        toast("Đã ghi " + facts.length + " sự kiện vào biên niên sử.");
      }
    } else toast("Không có gì mới để ghi.");
  } catch (e) {
    toast(e.message || "Lỗi.", "error");
  }
  ketThucLuot();
  updateComposerState();
  if (daThem) render();
}

// ==========================================================================
//  HỘI THOẠI (tạo / sửa / xoá)
// ==========================================================================
function openConvEditor(convId, opts = {}) {
  const story = currentStory();
  if (!story) return;
  const isNew = !convId;
  const conv = isNew ? newConversation({ chuongId: opts.chuongId || null }) : story.hoiThoais.find((c) => c.id === convId);
  if (!conv) return;
  const body = el("div");
  const htmlPick = () =>
    '<div class="pick-list">' +
      (story.nhanVats.length
        ? story.nhanVats.map((c) =>
            '<button class="pick' + ((conv.nhanVatIds || []).includes(c.id) ? " on" : "") + '" data-nv="' + esc(c.id) + '">' +
            avatarHtml(story, c, 24) + "<span>" + esc(c.ten) + "</span>" + "<span class='pick-role'>" + esc(c.vaiTro || "") + "</span></button>").join("")
        : '<div class="hint">Truyện chưa có nhân vật nào — hãy thêm nhân vật trước.</div>') +
    "</div>";
  body.innerHTML =
    '<label class="field-label">Tên hội thoại</label>' +
    '<input class="input" data-f="tieuDe" placeholder="Ví dụ: Cuộc gặp ở bến tàu">' +
    '<label class="field-label">Bối cảnh mở đầu (không bắt buộc)</label>' +
    '<textarea class="input" data-f="goiY" rows="3" placeholder="Chuyện gì đang diễn ra khi cảnh này bắt đầu?"></textarea>' +
    (story.chuongs.length
      ? '<label class="field-label">Thuộc chương</label><select class="input" data-f="chuong">' +
        '<option value="">(không thuộc chương nào)</option>' +
        story.chuongs.slice().sort((a, b) => a.so - b.so).map((c) =>
          '<option value="' + esc(c.id) + '">Chương ' + esc(c.so) + " — " + esc(c.tieuDe) + "</option>").join("") + "</select>"
      : "") +
    '<label class="field-label">Nhân vật tham gia (chọn từ 2 người trở lên để thành group chat)</label>' +
    htmlPick() +
    '<div class="row-gap"><button class="btn btn-sm" data-act="conv-new-char">' + icon("plus", 14) + " Nhân vật mới</button></div>";

  const m = modal({
    title: isNew ? "Hội thoại mới" : "Sửa hội thoại",
    subtitle: isNew && (opts.chuongId ? "" : "Để chọn 2 nhân vật trở lên thì đây sẽ là một group chat."),
    wide: true,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: isNew ? "Tạo hội thoại" : "Lưu", primary: true, onClick: async (mm) => { await luu(mm); } },
    ],
  });

  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  F("tieuDe").value = conv.tieuDe && conv.tieuDe !== "Hội thoại mới" ? conv.tieuDe : "";
  F("goiY").value = conv.goiY || "";
  if (F("chuong")) F("chuong").value = conv.chuongId || "";

  body.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-nv]");
    if (pick) {
      const id = pick.dataset.nv;
      const set = new Set(conv.nhanVatIds || []);
      const hd = new Set(hienDienNhom(conv));
      if (set.has(id)) { set.delete(id); hd.delete(id); }
      else { set.add(id); hd.add(id); }
      conv.nhanVatIds = [...set];
      conv.hienDien = conv.nhanVatIds.filter((x) => hd.has(x));
      conv.canhRieng = canhRiengCua(conv) ? conv.canhRieng : null;
      pick.classList.toggle("on");
      return;
    }
    const b = e.target.closest("[data-act]");
    if (b && b.dataset.act === "conv-new-char") {
      // KHÔNG đóng modal này: mở trình soạn nhân vật lên trên để không mất tên/bối cảnh
      // người dùng đã nhập, và tự chọn sẵn nhân vật vừa tạo.
      openCharacterEditor(null, {
        focusTen: true,
        onSaved: (c) => {
          if (!c) return;
          const ids = new Set(conv.nhanVatIds || []);
          ids.add(c.id);
          conv.nhanVatIds = [...ids];
          if (hienDienNhom(conv).indexOf(c.id) < 0) conv.hienDien = hienDienNhom(conv).concat([c.id]);
          const list = body.querySelector(".pick-list");
          if (list) list.outerHTML = htmlPick();
          toast("Đã thêm “" + c.ten + "” vào hội thoại.");
        },
      });
    }
  });

  async function luu(mm) {
    const truoc = { tieuDe: conv.tieuDe, goiY: conv.goiY, chuongId: conv.chuongId };
    conv.tieuDe = F("tieuDe").value.trim() || (isNew ? "Hội thoại mới" : conv.tieuDe);
    conv.goiY = F("goiY").value.trim();
    conv.chuongId = F("chuong") ? (F("chuong").value || null) : (conv.chuongId || null);
    if (isNew) {
      story.hoiThoais.push(conv);
      if (!(await luuTruyen(story, "hội thoại mới"))) {
        story.hoiThoais = story.hoiThoais.filter((c) => c !== conv);
        return;
      }
      mm.close();
      await openConv(conv.id);
      if ((conv.nhanVatIds || []).length) autoMoDau(conv);
      return;
    }
    if (!(await luuTruyen(story, "hội thoại"))) {
      Object.assign(conv, truoc);
      return;
    }
    mm.close();
    render();
  }

  async function autoMoDau(c2) {
    if (!store.settings.autoOpening) return;
    if (app.convId !== c2.id) return;
    await onOpening();
  }
}

function xoaHoiThoai(convId) {
  const story = currentStory();
  const conv = story.hoiThoais.find((c) => c.id === convId);
  if (!conv) return;
  const soCanhKhep = TS.canhHopLe(story).filter((c) => (Array.isArray(c.htIds) && c.htIds.length ? c.htIds : [c.htId]).indexOf(convId) >= 0).length;
  confirmModal(
    "Xoá hội thoại",
    "Xoá “" + conv.tieuDe + "” và toàn bộ tin nhắn trong đó?" +
      (soCanhKhep ? " Hội thoại này có " + soCanhKhep + " cảnh đã khép — xoá nó sẽ vô hiệu và hoàn tác mọi thay đổi quan hệ, ký ức và nội tâm sinh ra từ đó." : ""),
    async () => {
    const canhLienQuan = TS.canhHopLe(story).filter((c) => (Array.isArray(c.htIds) && c.htIds.length ? c.htIds : [c.htId]).indexOf(convId) >= 0);
    // Xoá hội thoại là một giao dịch: bản ghi truyện, tin nhắn của hội thoại, và nhật ký
    // cảnh đã khép đều phải cùng sống hoặc cùng chết. Hỏng bước cuối mà tin nhắn đã bay
    // thì hội thoại trở thành cái xác rỗng — đó chính là kiểu mất dữ liệu phải chặn.
    const kq = await giaoDichApp([["cotTruyen", story.id], ["tinNhan", convId]], async () => {
      story.hoiThoais = story.hoiThoais.filter((c) => c.id !== convId);
      TS.voHieuCanh(story, canhLienQuan.map((c) => c.id));
      delete store.messagesCache[convId];
      await R.kv.tinNhan.delete(convId);
      // Hội thoại này biến mất ⇒ mọi lần hé lộ xảy ra trong nó cũng hết hiệu lực.
      tinhLaiBiet(story, { [convId]: [] });
      await ghiCotTruyen(story);
    }, "hội thoại");
    if (!kq.ok) { render(); return; }
    if (app.convId === convId) app.convId = null;
    setHash();
    toast("Đã xoá hội thoại.");
    render();
  }, { danger: true, yesLabel: "Xoá" });
}

// ==========================================================================
//  CHƯƠNG
// ==========================================================================
function openChapterEditor(chapterId, isNew = false) {
  const story = currentStory();
  if (!story) return;
  const ch = isNew
    ? newChapter((story.chuongs.reduce((a, c) => Math.max(a, c.so), 0) || 0) + 1)
    : story.chuongs.find((c) => c.id === chapterId);
  if (!ch) return;
  const body = el("div");
  body.innerHTML =
    '<label class="field-label">Tiêu đề chương</label>' +
    '<input class="input" data-f="tieuDe" data-autofocus>' +
    '<label class="field-label">Mục tiêu của chương (AI sẽ dùng để dẫn dắt diễn biến)</label>' +
    '<textarea class="input" data-f="mucTieu" rows="3" placeholder="Điều gì cần đạt được hoặc được hé lộ trong chương này?"></textarea>' +
    '<label class="field-label">Tóm tắt chương (tuỳ chọn — AI tự viết khi bạn kết chương)</label>' +
    '<textarea class="input" data-f="tomTat" rows="4"></textarea>';
  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  F("tieuDe").value = ch.tieuDe || "";
  F("mucTieu").value = ch.mucTieu || "";
  F("tomTat").value = ch.tomTat || "";
  const m = modal({
    title: isNew ? "Chương mới" : "Sửa chương " + ch.so,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: "Lưu", primary: true, onClick: async (mm) => {
          const truoc = { tieuDe: ch.tieuDe, mucTieu: ch.mucTieu, tomTat: ch.tomTat };
          ch.tieuDe = F("tieuDe").value.trim() || ch.tieuDe;
          ch.mucTieu = F("mucTieu").value.trim();
          ch.tomTat = F("tomTat").value.trim();
          if (isNew) story.chuongs.push(ch);
          if (!(await luuTruyen(story, "chương"))) {
            Object.assign(ch, truoc);
            if (isNew) story.chuongs = story.chuongs.filter((c) => c !== ch);
            return;
          }
          mm.close();
          render();
        } },
    ],
  });
}

async function endChapter(chapterId) {
  const story = currentStory();
  const ch = story.chuongs.find((c) => c.id === chapterId);
  if (!ch) return;
  const convs = convsOfChapter(story, ch.id);
  if (!convs.length) {
    toast("Chương này chưa có hội thoại nào.", "error");
    return;
  }
  for (const c of convs) await loadMessages(c.id);
  app.loadingMsg = "Đang gộp diễn biến chương " + ch.so + "…";
  render();
  try {
    const res = await AI.concludeChapter({
      story,
      chuong: ch,
      onTienDo: (t) => {
        app.loadingMsg = t;
        render();
      },
    });
    app.loadingMsg = "";
    // Bản tóm tắt liên tục vừa dựng cũng được lưu vào từng hội thoại, để bộ nhớ của
    // hội thoại khớp với những gì AI vừa đọc (không mất đoạn nào).
    const theoHt = res.tomTatTheoHt || {};
    for (const id in theoHt) {
      const c = story.hoiThoais.find((x) => x.id === id);
      if (!c) continue;
      if (theoHt[id].tomTat) c.tomTat = theoHt[id].tomTat;
      c.tomTatDen = Math.max(c.tomTatDen || 0, theoHt[id].tomTatDen || 0);
    }
    openChapterResult(ch, res);
  } catch (e) {
    app.loadingMsg = "";
    toast(e.message || "Không tạo được tổng kết.", "error");
    render();
  }
}

function openChapterResult(ch, res) {
  const story = currentStory();
  const body = el("div");
  body.innerHTML =
    '<label class="field-label">Tóm tắt chương</label>' +
    '<textarea class="input" data-f="tomTat" rows="5"></textarea>' +
    '<label class="field-label">Sự kiện ghi vào biên niên sử (mỗi dòng một sự kiện)</label>' +
    '<textarea class="input" data-f="suKien" rows="5"></textarea>' +
    '<label class="field-label">Chương tiếp theo — tiêu đề</label>' +
    '<input class="input" data-f="tieuDe">' +
    '<label class="field-label">Chương tiếp theo — mục tiêu</label>' +
    '<textarea class="input" data-f="mucTieu" rows="2"></textarea>';
  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  F("tomTat").value = res.tomTat || "";
  F("suKien").value = (res.suKien || []).join("\n");
  F("tieuDe").value = res.tieuDe || "Chương " + (ch.so + 1);
  F("mucTieu").value = res.mucTieu || "";

  modal({
    title: "Kết chương " + ch.so + " — " + ch.tieuDe,
    subtitle: "AI đã đọc lại toàn bộ hội thoại trong chương. Bạn có thể sửa trước khi ghi vào biên niên sử.",
    wide: true,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: "Ghi nhận & mở chương mới", primary: true, onClick: async (mm) => {
          const soChTruoc = story.chuongs.length;
          const soHtTruoc = story.hoiThoais.length;
          const soBnTruoc = (story.bienNienSu || []).length;
          const truocDaKetThuc = ch.daKetThuc;
          const truocTomTat = ch.tomTat;
          ch.daKetThuc = true;
          ch.tomTat = F("tomTat").value.trim();
          const suKien = F("suKien").value.split("\n").map((l) => l.replace(/^[\s\-•*]+/, "").trim()).filter(Boolean);
          story.bienNienSu = story.bienNienSu || [];
          for (const s of suKien) story.bienNienSu.push({ id: uid("bn"), noiDung: s, nguon: "Chương " + ch.so, luc: Date.now() });
          const tieuDe = F("tieuDe").value.trim() || "Chương " + (ch.so + 1);
          const daCo = story.chuongs.some((c) => c.so === ch.so + 1);
          if (!daCo) {
            const nch = newChapter(ch.so + 1, { tieuDe, mucTieu: F("mucTieu").value.trim() });
            story.chuongs.push(nch);
            const conv = newConversation({ tieuDe, chuongId: nch.id, nhanVatIds: (story.hoiThoais[0] && story.hoiThoais[0].nhanVatIds) || [] });
            story.hoiThoais.push(conv);
          }
          if (!(await luuTruyen(story, "kết chương"))) {
            // Ghi hỏng ⇒ cắt đúng những gì vừa thêm (không thay mảng để giữ nguyên tham
            // chiếu) và KHÔNG đóng bảng, KHÔNG báo "đã kết chương".
            story.chuongs.length = soChTruoc;
            story.hoiThoais.length = soHtTruoc;
            story.bienNienSu.length = soBnTruoc;
            ch.daKetThuc = truocDaKetThuc;
            ch.tomTat = truocTomTat;
            render();
            return;
          }
          mm.close();
          toast("Đã kết chương " + ch.so + " và mở chương " + (ch.so + 1) + ".");
          render();
        } },
    ],
  });
}

// ==========================================================================
//  MENU TRUYỆN / XUẤT NHẬP / CÀI ĐẶT
// ==========================================================================
// ==========================================================================
//  CÀI ĐẶT CỦA APP (không thuộc về một truyện nào)
// ==========================================================================
// Ghi bằng `store.settings` + `saveSettings()` — cùng cơ chế với theme (localStorage),
// nên KHÔNG thêm schema nào vào bản ghi truyện.
// ==========================================================================
//  THƯ VIỆN NGOẠI HÌNH — hồ sơ dùng chung cho nhiều truyện (cấp app)
//
//  Đây KHÔNG phải lorebook và không thay tính cách/quan hệ/ký ức của truyện: nó chỉ
//  giữ ngoại hình để ghép vào prompt tạo ảnh. Nhân vật trong truyện liên kết tới hồ sơ
//  bằng `ngoaiHinhId` (ID ổn định) và có `bietDanh` riêng cho từng truyện.
//
//  GIỚI HẠN THẬT của ảnh tham chiếu (đã kiểm tra plugin trước khi làm):
//   • ai-text-plugin ĐỌC được ảnh: `instruction` là mảng có tối đa MỘT ảnh png/jpeg/webp
//     (< 20MB) — dùng để AI phân tích ảnh thành MÔ TẢ đã duyệt.
//   • text-to-image-plugin CHỈ nhận prompt chữ. Tham số `referenceImage` của plugin đã
//     bị tắt phía máy chủ và hiện KHÔNG có tác dụng, nên app không gửi ảnh vào máy vẽ.
//     Vì vậy giao diện luôn nói "Dùng mô tả từ ảnh" và KHÔNG hứa giữ nguyên khuôn mặt.
// ==========================================================================
const NH_MAX_ANH = 1024; // cạnh dài tối đa của ảnh tham chiếu lưu trong hồ sơ

function nhThumbHtml(h) {
  const url = laDataUrlAnh(h && h.anh);
  if (url) return '<span class="nh-thumb"><img data-nh-anh="' + esc(h.id) + '" alt=""></span>';
  return '<span class="nh-thumb nh-thumb-chu">' + esc(initials(tenHoSo(h)) || "?") + "</span>";
}

// Ảnh tham chiếu là dữ liệu không đáng tin ⇒ luôn gán qua `.src`, không ghép vào HTML.
function dienAnhNgoaiHinh(scope) {
  $$("[data-nh-anh]", scope).forEach((img) => {
    const h = getNgoaiHinh(img.getAttribute("data-nh-anh"));
    const url = h ? laDataUrlAnh(h.anh) : "";
    if (url) img.src = url;
    else img.remove();
  });
}

function nhCard(h) {
  // Hiện ĐỦ cả ba loại tham chiếu (nhân vật + người chơi + ảnh cảnh) — cửa chặn xoá cũng
  // dựa trên cùng phép đếm này, nên thẻ không được nói thiếu.
  const dung = demDungNgoaiHinh(store.stories, h.id);
  const so = dung.nhanVat;
  const moTa = (h.moTa || "").replace(/\s+/g, " ").trim();
  return (
    '<div class="nh-row" data-nh-row="' + esc(h.id) + '">' +
      nhThumbHtml(h) +
      '<div class="nh-info">' +
        '<div class="nh-ten">' + esc(tenHoSo(h)) +
          (h.tuoi ? '<span class="nh-tuoi">' + esc(h.tuoi) + " tuổi</span>" : "") +
          (h.anh ? '<span class="nh-tag">có ảnh tham chiếu</span>' : "") +
        "</div>" +
        '<div class="nh-mota">' + esc(moTa.slice(0, 180) || "Chưa có mô tả ngoại hình.") + "</div>" +
        '<div class="nh-meta">' +
          (so || dung.nguoiChoi || dung.anh
            ? (so ? "Đang dùng ở <b>" + so + "</b> nhân vật" : "Chưa liên kết nhân vật nào") +
              (dung.nguoiChoi ? " · <b>" + dung.nguoiChoi + "</b> người chơi" : "") +
              (dung.anh ? " · <b>" + dung.anh + "</b> ảnh cảnh" : "")
            : "Chưa liên kết với nhân vật nào") +
        "</div>" +
      "</div>" +
      '<div class="nh-row-acts">' +
        '<button class="btn btn-sm" data-nh-edit="' + esc(h.id) + '">' + icon("edit", 13) + " Sửa</button>" +
        '<button class="btn btn-sm" data-nh-xuat="' + esc(h.id) + '">' + icon("download", 13) + "</button>" +
        '<button class="btn btn-sm btn-danger" data-nh-xoa="' + esc(h.id) + '">' + icon("trash", 13) + "</button>" +
      "</div>" +
    "</div>"
  );
}

function openNgoaiHinh(onXong) {
  const body = el("div", { class: "nh-lib" });
  const m = modal({
    title: "Thư viện ngoại hình",
    subtitle: "Hồ sơ ngoại hình dùng chung cho mọi truyện trên trình duyệt này.",
    wide: true,
    body,
    // `onXong` để nơi gọi (editor nhân vật) dựng lại danh sách sau khi thư viện đổi.
    onClose: () => { if (onXong) onXong(); },
    actions: [
      { label: "Tạo hồ sơ", primary: true, onClick: () => openSuaNgoaiHinh(null, paint) },
      { label: "Đóng", onClick: (mm) => mm.close() },
    ],
  });
  function paint() {
    const ds = dsNgoaiHinh();
    body.innerHTML =
      (coLoiDocNgoaiHinh()
        ? '<div class="nh-loi-doc">Không đọc được thư viện ngoại hình ở lần đọc gần nhất, nên danh sách dưới đây ' +
          "có thể đang <b>thiếu hồ sơ</b> (dữ liệu trên máy vẫn còn). Bản sao lưu sẽ hỏi lại trước khi xuất." +
          '<div class="nh-loi-doc-acts"><button type="button" class="btn btn-sm" data-nh2="doc-lai">' +
          icon("refresh", 14) + " Thử đọc lại</button></div></div>"
        : "") +
      '<div class="hint nh-note">Hồ sơ ngoại hình là dùng chung: một người có thể xuất hiện trong nhiều truyện. ' +
        "Thư viện <b>chỉ</b> giữ ngoại hình — tính cách, quan hệ và ký ức vẫn thuộc từng truyện. " +
        "Dữ liệu lưu <b>cục bộ trên trình duyệt này</b>, không đồng bộ giữa các thiết bị.</div>" +
      '<div class="row-gap nh-lib-acts">' +
        '<button class="btn btn-sm" data-nh2="tu-mota">' + icon("sparkle", 14) + " Tạo từ mô tả / ảnh</button>" +
        '<button class="btn btn-sm" data-nh2="xuat">' + icon("download", 14) + " Xuất JSON</button>" +
        '<button class="btn btn-sm" data-nh2="nhap">' + icon("upload", 14) + " Nhập JSON</button>" +
      "</div>" +
      (ds.length
        ? '<div class="nh-list">' + ds.map(nhCard).join("") + "</div>"
        : '<div class="hint">Chưa có hồ sơ nào. Bấm <b>Tạo hồ sơ</b> để nhập tay, hoặc <b>Tạo từ mô tả / ảnh</b> để AI soạn bản nháp cho bạn duyệt.</div>');
    dienAnhNgoaiHinh(body);
  }
  paint();
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-nh-edit],[data-nh-xoa],[data-nh-xuat],[data-nh2]");
    if (!b) return;
    if (b.dataset.nhEdit) return openSuaNgoaiHinh(b.dataset.nhEdit, paint);
    if (b.dataset.nhXuat) return xuatNgoaiHinh([getNgoaiHinh(b.dataset.nhXuat)].filter(Boolean), "truyen-vai-ngoai-hinh-1.json");
    if (b.dataset.nhXoa) return xoaHoSoNgoaiHinh(b.dataset.nhXoa, paint);
    if (b.dataset.nh2 === "tu-mota") return openSuaNgoaiHinh(null, paint, { focusYeuCau: true });
    if (b.dataset.nh2 === "xuat") {
      const ds2 = dsNgoaiHinh();
      if (!ds2.length) return toast("Chưa có hồ sơ nào để xuất.", "error");
      return xuatNgoaiHinh(ds2, "truyen-vai-ngoai-hinh.json");
    }
    if (b.dataset.nh2 === "nhap") return chonFileNgoaiHinh();
    if (b.dataset.nh2 === "doc-lai") {
      await loadNgoaiHinh();
      paint();
      toast(coLoiDocNgoaiHinh() ? "Vẫn không đọc được thư viện ngoại hình." : "Đã đọc lại thư viện ngoại hình.", coLoiDocNgoaiHinh() ? "error" : "info");
      return;
    }
  });
}

function xoaHoSoNgoaiHinh(id, onXong) {
  const h = getNgoaiHinh(id);
  if (!h) return;
  // Đếm CẢ nhân vật liên kết LẪN ảnh cảnh đã dựng có dùng hồ sơ này. Chỉ đếm nhân vật
  // thì người dùng chỉ cần gỡ liên kết ở nhân vật là xoá được hồ sơ, để lại những bản
  // ghi ảnh (`anh[].hoSoIds`) trỏ tới một ID không còn tồn tại.
  const dung = demDungNgoaiHinh(store.stories, id);
  if (dung.nhanVat || dung.nguoiChoi || dung.anh) {
    // v1 CHẶN xoá hồ sơ đang được dùng — nói ngắn gọn lý do và cách gỡ.
    const dsTen = [];
    const dsNc = [];
    const dsAnh = [];
    for (const s of store.stories) {
      for (const c of s.nhanVats || []) if (c.ngoaiHinhId === id) dsTen.push(s.ten + " · " + c.ten);
      if (s.nguoiChoi && s.nguoiChoi.ngoaiHinhId === id) dsNc.push(s.ten + " · người chơi");
      for (const a of anhCua(s)) if (Array.isArray(a.hoSoIds) && a.hoSoIds.indexOf(id) >= 0) dsAnh.push(s.ten + " · " + (a.chuThich || "ảnh cảnh"));
    }
    const phan = [];
    if (dung.nhanVat) phan.push("<b>" + esc(dung.nhanVat) + "</b> nhân vật liên kết");
    if (dung.nguoiChoi) phan.push("<b>" + dung.nguoiChoi + "</b> người chơi liên kết");
    if (dung.anh) phan.push("<b>" + dung.anh + "</b> ảnh cảnh đã dựng");
    const cachGo = [];
    if (dung.nhanVat) cachGo.push("bỏ liên kết ở những nhân vật đó (mở nhân vật → <b>Liên kết hồ sơ ngoại hình</b> → “— không liên kết —”)");
    if (dung.nguoiChoi) cachGo.push("bỏ liên kết của người chơi (mở <b>Tuỳ chọn truyện</b> → <b>Hồ sơ ngoại hình của bạn</b> → “— không liên kết —”)");
    if (dung.anh) cachGo.push("gỡ ảnh đang dùng hồ sơ này (mở ảnh trong truyện → <b>Dựng lại</b> rồi bỏ chip của hồ sơ, hoặc xoá ảnh)");
    modal({
      title: "Không thể xoá hồ sơ này",
      body:
        '<div class="hint">“' + esc(tenHoSo(h)) + "” đang được " + phan.join(" và ") +
        (dsTen.length ? " (" + esc(dsTen.slice(0, 3).join("; ")) + (dsTen.length > 3 ? " …" : "") + ")" : "") +
        (dsNc.length ? " (" + esc(dsNc.slice(0, 3).join("; ")) + (dsNc.length > 3 ? " …" : "") + ")" : "") +
        (dsAnh.length ? " (" + esc(dsAnh.slice(0, 3).join("; ")) + (dsAnh.length > 3 ? " …" : "") + ")" : "") +
        ". Hãy " + cachGo.join(", và ") +
        ", rồi xoá hồ sơ. Cách này giữ cho mọi tham chiếu không bao giờ trỏ vào hồ sơ đã biến mất.</div>",
      actions: [{ label: "Đã hiểu", primary: true, onClick: (mm) => mm.close() }],
    });
    return;
  }
  confirmModal("Xoá hồ sơ ngoại hình", "Xoá “" + tenHoSo(h) + "” khỏi thư viện? Ảnh tham chiếu của hồ sơ cũng bị xoá.", async () => {
    try {
      await xoaNgoaiHinh(id);
      toast("Đã xoá hồ sơ.");
      if (onXong) onXong();
      else render();
    } catch (e) {
      baoLoiLuu(e, "hồ sơ ngoại hình");
    }
  }, { danger: true, yesLabel: "Xoá" });
}

function xuatNgoaiHinh(ds, tenFile) {
  const map = {};
  for (const h of ds) map[h.id] = h;
  const data = { type: "truyen-vai-ngoai-hinh", version: PHIEN_BAN_TRUYEN, ngoaiHinh: map };
  download(tenFile, JSON.stringify(data));
  toast("Đã xuất " + ds.length + " hồ sơ ngoại hình" + (ds.some((h) => h.anh) ? " (kèm ảnh tham chiếu)." : "."));
}

function docHoSoNhap(data) {
  const d = data && typeof data === "object" ? data : {};
  const raw = d.ngoaiHinh && typeof d.ngoaiHinh === "object" && !Array.isArray(d.ngoaiHinh)
    ? Object.keys(d.ngoaiHinh).map((k) => Object.assign({ id: k }, d.ngoaiHinh[k]))
    : Array.isArray(d.ngoaiHinh)
    ? d.ngoaiHinh
    : Array.isArray(d.hoSo)
    ? d.hoSo
    : [];
  return raw.filter((x) => x && typeof x === "object" && (x.tenChinh || x.moTa));
}

function chonFileNgoaiHinh() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json,.json";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch (e) {
      toast("File không phải JSON hợp lệ.", "error");
      return;
    }
    const ds = docHoSoNhap(data);
    if (!ds.length) {
      toast("File không có hồ sơ ngoại hình nào.", "error");
      return;
    }
    openNhapNgoaiHinh(ds, f.name);
  };
  inp.click();
}

// Nhập hồ sơ: xem trước, mặc định KHÔNG ghi đè hồ sơ đang có, và trùng TÊN không bao
// giờ bị coi là cùng một người (chỉ ID mới quyết định).
function openNhapNgoaiHinh(ds, tenFile) {
  const chuan = ds.map((x) => nhanHoSoNhap(x));
  const trung = chuan.filter((h) => h.id && getNgoaiHinh(h.id));
  const body = el("div");
  body.innerHTML =
    '<div class="nhap-tk">' +
      '<div class="nhap-tk-line"><span class="dd-key">File</span><span class="dd-val">' + esc(tenFile || "(không rõ tên)") + "</span></div>" +
      '<div class="nhap-tk-line"><span class="dd-key">Nội dung</span><span class="dd-val">' + chuan.length + " hồ sơ ngoại hình · " +
        chuan.filter((h) => h.anh).length + " ảnh tham chiếu</span></div>" +
      '<div class="nhap-tk-line"><span class="dd-key">Trùng ID</span><span class="dd-val">' + trung.length + " hồ sơ đã có trong thư viện</span></div>" +
    "</div>" +
    '<div class="nh-mini">' + chuan.slice(0, 8).map((h) => "<div>" + esc(tenHoSo(h)) + (h.tuoi ? " · " + esc(h.tuoi) + " tuổi" : "") + "</div>").join("") +
      (chuan.length > 8 ? '<div class="hint">… và ' + (chuan.length - 8) + " hồ sơ nữa.</div>" : "") + "</div>" +
    '<label class="lb-check nh-doc"><input type="checkbox" data-f="nhGhiDe"> Ghi đè hồ sơ trùng ID bằng bản trong file ' +
      '(mặc định: giữ nguyên hồ sơ đang có, chỉ thêm hồ sơ mới)</label>' +
    '<div class="dd-note">Trùng tên KHÔNG được coi là cùng một người — chỉ ID mới quyết định. Hồ sơ thêm mới sẽ giữ nguyên ngoại hình và ảnh trong file.</div>';
  const m = modal({
    title: "Nhập hồ sơ ngoại hình",
    wide: true,
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  const nut = document.createElement("button");
  nut.className = "btn btn-primary";
  nut.textContent = "Nhập";
  nut.onclick = async () => {
    const ghiDe = !!(body.querySelector('[data-f="nhGhiDe"]') || {}).checked;
    nut.disabled = true;
    nut.textContent = "Đang nhập…";
    try {
      const kq = await nhapHoSoNgoaiHinh(chuan, { ghiDe });
      m.close();
      toast("Đã nhập " + kq.them + " hồ sơ" + (kq.boQua ? ", bỏ qua " + kq.boQua + " hồ sơ trùng ID đang có." : "."));
      openNgoaiHinh();
    } catch (e) {
      console.error(e);
      nut.disabled = false;
      nut.textContent = "Nhập";
      toast("Nhập thất bại: " + ((e && e.message) || e) + " — thư viện đã được trả về nguyên trạng.", "error");
    }
  };
  m.footEl.appendChild(nut);
}

// Chuẩn hoá một hồ sơ đến từ file: ảnh sai định dạng thì bỏ ẢNH chứ không bỏ hồ sơ.
// Đi qua `napBanGhi` (kiểm hình dạng + migrate) như mọi đường nạp khác.
function nhanHoSoNhap(raw) {
  const goc = Object.assign({ id: typeof raw.id === "string" ? raw.id.trim() : "" }, raw);
  const h = napBanGhi(goc, "ho-so", goc.id);
  if (!h.id) h.id = uid("nh");
  if (h.anh && !laDataUrlAnh(h.anh)) h.anh = "";
  return h;
}

// Ghi nhiều hồ sơ trong MỘT giao dịch: hỏng ở bất kỳ bước nào thì trả thư viện về đúng
// trạng thái trước khi nhập (không để lại dữ liệu nửa chừng).
async function nhapHoSoNgoaiHinh(ds, opts) {
  const ghiDe = !!(opts && opts.ghiDe);
  const dungId = new Set(store.ngoaiHinh.map((h) => h.id));
  const seGhi = [];
  let boQua = 0;
  for (const h of ds) {
    if (dungId.has(h.id)) {
      if (!ghiDe) {
        boQua++;
        continue;
      }
    }
    dungId.add(h.id);
    seGhi.push(Object.assign({}, h, { suaLuc: Date.now(), luc: h.luc || Date.now() }));
  }
  if (!seGhi.length) return { them: 0, boQua };
  await giaoDichKV(
    seGhi.map((h) => ["thuVienNgoaiHinh", h.id]),
    async () => {
      for (const h of seGhi) await R.kv.thuVienNgoaiHinh.set(h.id, h);
    }
  );
  await loadNgoaiHinh();
  return { them: seGhi.length, boQua };
}

// -------------------------------------------------------------- form hồ sơ
function openSuaNgoaiHinh(id, onXong, opts = {}) {
  const h = id ? getNgoaiHinh(id) : newNgoaiHinh();
  if (!h) return;
  const laMoi = !id;
  const soLienKet = laMoi ? 0 : demLienKetNgoaiHinh(store.stories, h.id);
  let anhTam = laDataUrlAnh(h.anh); // ảnh tham chiếu đang giữ trong form (chưa lưu)

  const body = el("div", { class: "nh-form" });
  body.innerHTML =
    (laMoi
      ? ""
      : '<div class="hint nh-note">Đây là hồ sơ <b>dùng chung</b>: sửa ngoại hình ở đây sẽ ảnh hưởng tới ' +
        (soLienKet ? "<b>" + soLienKet + "</b> nhân vật đang liên kết" : "mọi nhân vật liên kết sau này") +
        ". Tin nhắn cũ không bị sửa.</div>") +
    '<label class="field-label">Tên chính</label>' +
    '<input class="input" data-f="nhTen" placeholder="Tên dùng chung cho hồ sơ này">' +
    '<label class="field-label">Tuổi (bạn khai báo — để trống nếu không muốn ghi)</label>' +
    '<input class="input" data-f="nhTuoi" inputmode="numeric" placeholder="Ví dụ: 29">' +
    '<label class="field-label">Mô tả ngoại hình</label>' +
    '<textarea class="input" data-f="nhMoTa" rows="5" placeholder="Gương mặt, tóc, da, chiều cao, vóc dáng, tỉ lệ cơ thể, dấu hiệu nhận diện như hình xăm hoặc sẹo…"></textarea>' +
    '<label class="field-label">Đặc điểm cần tránh khi tạo ảnh</label>' +
    '<textarea class="input" data-f="nhTranh" rows="2" placeholder="Ví dụ: không râu, tóc không dài, không đeo kính…"></textarea>' +
    '<div class="nh-anh-hang">' +
      '<div class="nh-anh-side">' +
        '<button class="btn btn-sm" data-nh-act="nh-chon-anh">' + icon("image", 14) +
          (anhTam ? " Đổi ảnh tham chiếu" : " Thêm ảnh tham chiếu") + "</button>" +
        '<button class="btn btn-sm btn-danger" data-nh-act="nh-xoa-anh"' + (anhTam ? "" : " hidden") + ">" + icon("trash", 13) + " Bỏ ảnh</button>" +
      "</div>" +
      '<div class="nh-anh-box" data-nh-anh-box></div>' +
    "</div>" +
    '<div class="hint nh-anh-note">Ảnh tham chiếu chỉ dùng để AI phân tích thành <b>mô tả</b> — máy vẽ ảnh của Perchance hiện ' +
      "chỉ nhận prompt chữ, nên ảnh <b>không</b> được gửi trực tiếp vào máy vẽ và app không bảo đảm giữ nguyên khuôn mặt.</div>" +
    // Phần AI nằm trong <details> để form chính vẫn gọn (tên · tuổi · mô tả · cần tránh ·
    // khu vực ảnh) đúng như thiết kế; ai cần thì mở ra. Lối vào "Tạo từ mô tả / ảnh" từ
    // thư viện sẽ tự mở sẵn.
    '<details class="gk-more nh-ai" data-nh-ai>' +
      '<summary>' + esc("Tạo hồ sơ bằng AI (từ mô tả và/hoặc ảnh)") + "</summary>" +
      '<label class="field-label">Mô tả tự do (và/hoặc đính kèm ảnh ở trên)</label>' +
      '<textarea class="input" data-f="nhYeuCau" rows="3" placeholder="Ví dụ: nam 30 tuổi, cao, tóc đen ngắn, sẹo nhỏ trên mày trái, da ngăm…"></textarea>' +
      '<div class="row-gap"><button class="btn btn-sm btn-primary" data-nh-act="nh-ban-nhap">' + icon("sparkle", 15) + " Tạo hồ sơ từ mô tả / ảnh</button></div>" +
      '<div class="hint nh-anh-note" data-nh-canhbao></div>' +
    "</details>" +
    '<div class="hint nh-status" data-nh-status></div>';

  const m = modal({
    title: laMoi ? "Hồ sơ ngoại hình mới" : "Sửa hồ sơ ngoại hình",
    wide: true,
    body,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      { label: laMoi ? "Tạo hồ sơ" : "Lưu", primary: true, onClick: async (mm) => { if (await luuForm()) mm.close(); } },
    ],
  });

  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  const statusEl = body.querySelector("[data-nh-status]");
  const canhBaoEl = body.querySelector("[data-nh-canhbao]");
  let busy = false;
  F("nhTen").value = h.tenChinh || "";
  F("nhTuoi").value = h.tuoi || "";
  F("nhMoTa").value = h.moTa || "";
  F("nhTranh").value = h.tranh || "";

  function paintAnh() {
    const box = body.querySelector("[data-nh-anh-box]");
    if (!box) return;
    // Nhãn nút phải khớp trạng thái hiện tại (thêm ↔ đổi) sau mỗi lần chọn/bỏ ảnh.
    const nutChon = body.querySelector('[data-nh-act="nh-chon-anh"]');
    if (nutChon) nutChon.innerHTML = icon("image", 14) + (anhTam ? " Đổi ảnh tham chiếu" : " Thêm ảnh tham chiếu");
    box.innerHTML = "";
    if (!anhTam) {
      box.hidden = true;
      const nutXoa = body.querySelector('[data-nh-act="nh-xoa-anh"]');
      if (nutXoa) nutXoa.hidden = true;
      return;
    }
    box.hidden = false;
    const img = document.createElement("img");
    img.className = "nh-anh-preview";
    img.alt = "";
    img.src = anhTam; // đã qua laDataUrlAnh()
    box.appendChild(img);
    const nutXoa = body.querySelector('[data-nh-act="nh-xoa-anh"]');
    if (nutXoa) nutXoa.hidden = false;
    canhBaoEl.textContent = "Ảnh có trong form sẽ được GỬI tới dịch vụ AI của Perchance để phân tích khi bạn bấm “Tạo hồ sơ từ mô tả / ảnh”.";
  }
  paintAnh();

  function setStatus(s) {
    if (statusEl) statusEl.textContent = s || "";
  }
  function setBusy(b) {
    busy = b;
    $$("[data-nh-act]", body).forEach((x) => { x.disabled = b; });
    $$('input, textarea', body).forEach((x) => { x.disabled = b; });
  }

  async function luuForm() {
    if (busy) return false;
    const ten = F("nhTen").value.trim();
    if (!ten) {
      setStatus("Hồ sơ cần có tên chính — đó là tên dùng để nhận diện trong prompt ảnh.");
      F("nhTen").focus();
      return false;
    }
    // Sửa ngoại hình ⇒ bản dịch tiếng Anh cũ không còn đúng nữa, bỏ đi để dịch lại
    // (`boBanDichCu`). Không bỏ thì prompt ảnh sẽ dùng bản dịch của chữ người dùng vừa xoá.
    const ban = boBanDichCu(
      h,
      Object.assign({}, h, {
        tenChinh: ten,
        tuoi: F("nhTuoi").value.trim(),
        moTa: F("nhMoTa").value.trim(),
        tranh: F("nhTranh").value.trim(),
        anh: anhTam || "",
      })
    );
    try {
      await luuNgoaiHinh(ban);
    } catch (e) {
      // Ghi hỏng ⇒ GIỮ NGUYÊN form (nội dung vừa nhập vẫn còn) để bấm lại.
      setStatus(thongDiepLuu(e, "hồ sơ ngoại hình"));
      return false;
    }
    toast(laMoi ? "Đã tạo hồ sơ ngoại hình." : "Đã lưu hồ sơ ngoại hình.");
    if (onXong) onXong();
    else render();
    return true;
  }

  async function chonAnh() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      setStatus("Đang thu nhỏ ảnh…");
      const url = await thuNhoAnh(f, NH_MAX_ANH);
      const ok = laDataUrlAnh(url);
      if (!ok) {
        setStatus("Không đọc được ảnh này. Thử ảnh png/jpg/webp khác.");
        return;
      }
      anhTam = ok;
      paintAnh();
      setStatus("");
    };
    inp.click();
  }

  async function taoBanNhap() {
    if (busy) return;
    const moTa = F("nhYeuCau").value.trim();
    if (!moTa && !anhTam) {
      setStatus("Hãy nhập mô tả, hoặc thêm ảnh tham chiếu, rồi bấm lại.");
      return;
    }
    setBusy(true);
    setStatus("Đang soạn bản nháp ngoại hình…");
    try {
      let blob = null;
      if (anhTam) {
        try {
          blob = await (await fetch(anhTam)).blob();
        } catch (e) {
          blob = null;
          setStatus("Không đọc được ảnh để phân tích — chỉ dùng phần mô tả chữ.");
        }
      }
      const out = await AI.phacNgoaiHinh({ moTa, anhBlob: blob });
      if (out.tenChinh && !F("nhTen").value.trim()) F("nhTen").value = out.tenChinh;
      if (out.tuoi && !F("nhTuoi").value.trim()) F("nhTuoi").value = out.tuoi;
      // Mô tả ngoại hình: hỏi trước khi ghi đè nội dung người dùng đã gõ tay.
      if (out.moTa) {
        if (F("nhMoTa").value.trim()) {
          const dongY = await hoiXacNhan(
            "Ghi đè mô tả ngoại hình?",
            "Ô mô tả ngoại hình đang có chữ. Ghi đè bằng bản nháp AI vừa soạn?",
            { yesLabel: "Ghi đè" }
          );
          if (dongY) F("nhMoTa").value = out.moTa;
        } else {
          F("nhMoTa").value = out.moTa;
        }
      }
      if (out.tranh && !F("nhTranh").value.trim()) F("nhTranh").value = out.tranh;
      setStatus(
        "Đã điền bản nháp — đọc lại và sửa tuỳ ý, rồi bấm “" + (laMoi ? "Tạo hồ sơ" : "Lưu") +
          "”. Chưa có gì được lưu."
      );
      if (out.xungDot) {
        setStatus("Đã điền bản nháp. Có điểm cần bạn tự chọn: " + out.xungDot);
        canhBaoEl.textContent = "Điểm cần bạn chọn: " + out.xungDot;
      }
    } catch (e) {
      // Lỗi AI ⇒ KHÔNG mất bản nháp người dùng đang có.
      setStatus("Lỗi: " + (e.message || e) + " — nội dung bạn đã nhập vẫn còn nguyên.");
    }
    setBusy(false);
  }

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-nh-act]");
    if (!b || busy) return;
    const a = b.dataset.nhAct;
    if (a === "nh-chon-anh") chonAnh();
    else if (a === "nh-xoa-anh") {
      anhTam = "";
      paintAnh();
      setStatus("Đã bỏ ảnh tham chiếu khỏi form (chưa lưu).");
    } else if (a === "nh-ban-nhap") taoBanNhap();
  });

  if (opts.focusYeuCau) {
    const d = body.querySelector("[data-nh-ai]");
    if (d) d.open = true;
    setTimeout(() => { const y = F("nhYeuCau"); if (y) y.focus(); }, 80);
  } else if (opts.focusAnh) {
    const d = body.querySelector("[data-nh-ai]");
    if (d) d.open = false;
  }
}

// -------------------------------------------------------------- liên kết nhân vật
// Khối "Liên kết hồ sơ ngoại hình" trong editor nhân vật. Trả về HTML; phần đọc/ghi
// do `docLienKetNgoaiHinh()` / `dienLienKetNgoaiHinh()` đảm nhiệm.
function htmlLienKetNgoaiHinh(c) {
  const ds = dsNgoaiHinh();
  const h = c.ngoaiHinhId ? getNgoaiHinh(c.ngoaiHinhId) : null;
  const o = ['<option value="">— không liên kết —</option>']
    .concat(ds.map((x) => '<option value="' + esc(x.id) + '">' + esc(tenHoSo(x)) + (x.tuoi ? " (" + esc(x.tuoi) + " tuổi)" : "") + "</option>"))
    .join("");
  return (
    '<div class="nh-link">' +
      '<div class="gk-char-head">' + esc("🧬 Hồ sơ ngoại hình (dùng chung)") + "</div>" +
      '<label class="field-label">Liên kết hồ sơ ngoại hình</label>' +
      '<select class="input" data-f="ngoaiHinhId">' + o + "</select>" +
      '<label class="field-label">Biệt danh trong truyện này</label>' +
      '<input class="input" data-f="bietDanh" placeholder="Chỉ có hiệu lực trong truyện này — để trống nếu không có">' +
      '<div class="hint" data-nh-link-hint>' +
        (ds.length
          ? "Hồ sơ quyết định ngoại hình CỐ ĐỊNH dùng khi tạo ảnh. Trang phục, tư thế và biểu cảm vẫn lấy từ cảnh hiện tại."
          : "Chưa có hồ sơ nào trong thư viện ngoại hình.") +
      "</div>" +
      '<div class="row-gap">' +
        '<button type="button" class="btn btn-sm" data-act="open-ngoai-hinh">' + icon("users", 14) + " Thư viện ngoại hình</button>" +
        (h ? '<button type="button" class="btn btn-sm" data-act="edit-ngoai-hinh" data-id="' + esc(h.id) + '">' + icon("edit", 13) + " Sửa hồ sơ</button>" : "") +
      "</div>" +
      '<div class="nh-link-info" data-nh-link-info></div>' +
    "</div>"
  );
}

// Hiện tóm tắt ngoại hình của hồ sơ đang chọn (đọc lại từ thư viện, không nhúng vào
// bản ghi nhân vật ⇒ sửa hồ sơ là mọi liên kết thấy ngay).
function dienLienKetNgoaiHinh(body, c) {
  const sel = body.querySelector('[data-f="ngoaiHinhId"]');
  const info = body.querySelector("[data-nh-link-info]");
  if (sel) sel.value = c.ngoaiHinhId || "";
  const id = sel ? sel.value : "";
  if (!info) return;
  const h = id ? getNgoaiHinh(id) : null;
  if (!h) {
    info.innerHTML = '<div class="hint">Chưa liên kết: ảnh dựng cho nhân vật này sẽ chỉ dùng mô tả trong hồ sơ truyện.</div>';
    return;
  }
  const so = demLienKetNgoaiHinh(store.stories, h.id);
  const dung = demDungNgoaiHinh(store.stories, h.id);
  // Nhân vật liên kết hồ sơ thì DÙNG CHUNG tên chính của hồ sơ. Nếu tên đang gõ trong
  // form khác tên hồ sơ thì nói rõ và cho một nút đồng bộ — KHÔNG tự đổi tên (tin nhắn cũ
  // giữ nguyên tên cũ, và tên nhân vật có thể là tên riêng trong truyện).
  const tenEl = body.querySelector('[data-f="ten"]');
  const tenNv = String((tenEl && tenEl.value) || c.ten || "").trim();
  const lech = !!tenNv && tenNv.toLowerCase() !== h.tenChinh.toLowerCase();
  info.innerHTML =
    '<div class="hint">Đang liên kết <b>' + esc(tenHoSo(h)) + "</b>" + (h.tuoi ? " · " + esc(h.tuoi) + " tuổi" : "") +
    (h.anh ? " · có ảnh tham chiếu" : "") + ". Hồ sơ này đang được dùng bởi " +
    esc(moTaNguoiDung(dung) || so + " người") + ".</div>" +
    '<div class="nh-info-mota">' + esc((h.moTa || "Chưa có mô tả ngoại hình.").slice(0, 220)) + "</div>" +
    (h.tranh ? '<div class="nh-info-tranh">Tránh: ' + esc(h.tranh.slice(0, 160)) + "</div>" : "") +
    (lech
      ? '<div class="nh-info-lech">Nhân vật này đang tên “' + esc(tenNv) + '”, khác tên chính của hồ sơ (“' +
        esc(h.tenChinh) + '”). Hồ sơ vẫn nhận diện được cả hai tên khi tạo ảnh. Nếu muốn dùng đúng tên hồ sơ thì bấm nút dưới — ' +
        "tin nhắn cũ <b>không</b> bị sửa.</div>" +
        '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="dong-ten-ngoai-hinh">' +
        icon("check", 13) + " Dùng tên chính của hồ sơ</button></div>"
      : "");
}

function openSettings() {
  const body = el("div");
  const c = anhChon();
  const oPhongCach = dsPhongCach().map((p) => '<option value="' + esc(p.id) + '">' + esc(p.ten) + "</option>").join("");
  const oKichThuoc = dsKichThuoc().map((k) => '<option value="' + esc(k.id) + '">' + esc(k.ten) + "</option>").join("");
  body.innerHTML =
    '<div class="set-sec">Hiển thị</div>' +
    '<label class="set-check"><input type="checkbox" data-s="phanBietLoiThoai">' +
      "<span><b>Phân biệt đối thoại và hành động</b>" +
      '<span class="hint">Trong bong bóng chat: hành động/miêu tả trong <b>*dấu sao*</b> hiện nghiêng và nhạt hơn, ' +
      "lời thoại trong dấu ngoặc kép hiện sáng hơn. Đây chỉ là cách hiển thị — nội dung gốc không đổi, nên " +
      "sao chép, sửa tin và xuất truyện vẫn giữ nguyên văn.</span></span></label>" +
    '<label class="field-label">Giao diện</label>' +
    '<select class="input" data-s="theme">' +
      '<option value="toi">Tối</option><option value="sang">Sáng</option><option value="hethong">Theo hệ thống</option>' +
    "</select>" +
    '<div class="set-sec">Tự động</div>' +
    '<label class="set-check"><input type="checkbox" data-s="autoOpening">' +
      '<span><b>Tự viết mở đầu</b><span class="hint">Hội thoại mới có nhân vật sẽ được AI viết sẵn tin mở đầu.</span></span></label>' +
    '<label class="set-check"><input type="checkbox" data-s="autoChronicle">' +
      '<span><b>Tự ghi biên niên sử</b><span class="hint">Khi hội thoại đã dài thêm 12 tin, tự rút ra sự kiện đáng nhớ và ghi vào biên niên sử của truyện.</span></span></label>' +
    '<div class="set-sec">Ảnh cảnh mặc định</div>' +
    '<label class="field-label">Phong cách</label><select class="input" data-s="anhPhongCach">' + oPhongCach + "</select>" +
    '<label class="field-label">Cỡ khung</label><select class="input" data-s="anhKichThuoc">' + oKichThuoc + "</select>" +
    '<div class="set-sec">Thư viện ngoại hình</div>' +
    '<div class="hint">Hồ sơ ngoại hình dùng chung cho mọi truyện: tên chính, tuổi khai báo, mô tả ngoại hình, ' +
      "điều cần tránh và ảnh tham chiếu. Khi bạn tạo ảnh, app nhận diện tên nhân vật trong prompt rồi ghép đúng " +
      "ngoại hình của hồ sơ đã duyệt. Dữ liệu lưu cục bộ trên trình duyệt này — không đồng bộ giữa các thiết bị.</div>" +
    '<div class="row-gap"><button class="btn btn-sm" data-s-act="open-ngoai-hinh">' + icon("users", 15) +
      " Thư viện ngoại hình (" + dsNgoaiHinh().length + ")</button></div>" +
    '<div class="set-sec">Sao lưu & an toàn dữ liệu</div>' +
    '<div class="set-sao-luu">' +
      khoiCanhBaoDoiTen() +
      '<div class="hint" data-sao-luu-trang-thai></div>' +
      '<div class="hint" data-dung-luong-cd></div>' +
      '<div class="row-gap">' +
        '<button class="btn btn-sm btn-primary" data-s-act="sao-luu">' + icon("download", 15) + " Xuất bản sao lưu</button>" +
        '<button class="btn btn-sm" data-s-act="go-loi">' + icon("alert", 15) + " Bảng gỡ lỗi</button>" +
        '<button class="btn btn-sm" data-s-act="tu-kiem-tra">' + icon("check", 15) + " Tự kiểm tra dữ liệu</button>" +
      "</div>" +
    "</div>";

  const F = (k) => body.querySelector('[data-s="' + k + '"]');
  F("phanBietLoiThoai").checked = batPhanBiet();
  F("theme").value = store.settings.theme || "toi";
  F("autoOpening").checked = !!store.settings.autoOpening;
  F("autoChronicle").checked = !!store.settings.autoChronicle;
  F("anhPhongCach").value = c.phongCach;
  F("anhKichThuoc").value = c.kichThuoc;
  // Trạng thái sao lưu + dung lượng: đây là "mặt tiền" để người dùng thấy ngay mình có
  // đang giữ dữ liệu mà chưa sao lưu hay không.
  const elTT = body.querySelector("[data-sao-luu-trang-thai]");
  if (elTT) elTT.textContent = chuTrangThaiSaoLuu(Date.now());
  thanhDungLuong(body.querySelector("[data-dung-luong-cd]"), { khiKhongCo: "Không đọc được dung lượng trình duyệt." });

  F("phanBietLoiThoai").addEventListener("change", function () {
    store.settings.phanBietLoiThoai = this.checked;
    saveSettings();
    // Hiệu lực NGAY: vẽ lại để tin cũ, tin mới và phần đang stream đổi theo.
    render();
  });
  F("theme").addEventListener("change", function () {
    store.settings.theme = this.value;
    saveSettings();
    applyTheme();
  });
  F("autoOpening").addEventListener("change", function () { store.settings.autoOpening = this.checked; saveSettings(); });
  F("autoChronicle").addEventListener("change", function () { store.settings.autoChronicle = this.checked; saveSettings(); });
  F("anhPhongCach").addEventListener("change", function () {
    store.settings.anhPhongCach = this.value;
    saveSettings();
    if (app.anhChon) app.anhChon.phongCach = this.value;
  });
  F("anhKichThuoc").addEventListener("change", function () {
    store.settings.anhKichThuoc = this.value;
    saveSettings();
    if (app.anhChon) app.anhChon.kichThuoc = this.value;
  });

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-s-act]");
    if (!b) return;
    if (b.dataset.sAct === "open-ngoai-hinh") openNgoaiHinh();
    else if (b.dataset.sAct === "sao-luu") xuatTatCa();
    else if (b.dataset.sAct === "go-loi") openGoLoi();
    else if (b.dataset.sAct === "tu-kiem-tra") openTuKiemTra();
  });

  modal({
    title: "Cài đặt",
    subtitle: "Áp dụng cho mọi truyện trên trình duyệt này.",
    body,
    actions: [{ label: "Đóng", primary: true, onClick: (m) => m.close() }],
  });
}

// ==========================================================================
//  SAO LƯU — cảnh báo đổi tên, trạng thái, lời nhắc
// ==========================================================================
// Vì sao cần nói rõ: dữ liệu nằm theo ORIGIN của trang. Đổi tên generator (hoặc fork) là
// thành origin khác ⇒ app ở địa chỉ mới không thấy dữ liệu cũ, và người dùng tưởng mất
// sạch. Chỉ có một cách phòng: xuất bản sao lưu TRƯỚC khi đổi tên.
function khoiCanhBaoDoiTen() {
  return (
    '<div class="canh-bao-sao-luu">' + icon("alert", 14) +
      " <b>Đừng đổi tên generator (hay tạo bản fork) khi chưa sao lưu.</b> " +
      "Truyện, tin nhắn, ảnh và hồ sơ ngoại hình được lưu theo <b>địa chỉ của trang này</b> trong trình duyệt. " +
      "Đổi tên hoặc fork tạo ra một địa chỉ khác, và app ở địa chỉ mới <b>không thấy</b> dữ liệu cũ — trông như mất sạch, " +
      "trong khi dữ liệu vẫn nằm ở địa chỉ cũ. Hãy bấm <b>Xuất bản sao lưu</b> rồi mới đổi tên (đổi lại tên cũ là thấy lại dữ liệu)." +
    "</div>"
  );
}

// Dòng dung lượng vào MỘT phần tử bất kỳ (thư viện + Cài đặt dùng chung).
async function thanhDungLuong(el2, opts = {}) {
  if (!el2) return null;
  const dl = await dungLuongUocTinh();
  if (!dl || !dl.tong) {
    el2.textContent = opts.khiKhongCo || "";
    return null;
  }
  const mb = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + " MB";
  const pt = Math.round((dl.dung / dl.tong) * 100);
  el2.innerHTML =
    "Bộ nhớ trình duyệt đã dùng: <b>" + esc(mb(dl.dung)) + "</b> / " + esc(mb(dl.tong)) + " (" + pt + "%)" +
    (pt >= 80 ? ' · <span class="lib-canhbao">gần đầy — hãy xuất bản sao lưu rồi xoá bớt ảnh cũ</span>' : "");
  return { dung: dl.dung, tong: dl.tong, phanTram: pt };
}

// Trạng thái sao lưu dạng chữ, dùng cho mục Cài đặt.
function chuTrangThaiSaoLuu(now) {
  const m = mocSaoLuu(now);
  const qd = nenNhacSaoLuu(m, now, CFG.soNgayNhacSaoLuu);
  const ngay = (t) => Math.max(0, Math.floor((now - t) / 86400000));
  if (!m.daDoiLuc) return "Chưa có dữ liệu nào thay đổi kể từ khi bắt đầu dùng trên trình duyệt này.";
  if (m.xuatLuc && m.daDoiLuc <= m.xuatLuc) {
    return "Bản sao lưu gần nhất đã bao gồm mọi thay đổi (" + ngay(m.xuatLuc) + " ngày trước).";
  }
  if (!m.xuatLuc) return "Bạn chưa từng xuất bản sao lưu. Dữ liệu đã thay đổi " + ngay(m.daDoiLuc) + " ngày trước.";
  return (
    "Dữ liệu đã thay đổi sau lần xuất gần nhất (" + ngay(m.xuatLuc) + " ngày trước)" +
    (qd.ly === "dang-hoan" ? " — bạn đã chọn “để sau”." : qd.nhac ? " — đến hạn nhắc sao lưu." : ".")
  );
}

// Lời nhắc khi mở app: chỉ hiện khi dữ liệu đã đổi sau lần xuất gần nhất VÀ đã quá N
// ngày (N = CauHinh().soNgayNhacSaoLuu), và tối đa một lần mỗi ngày. Không tự tải file —
// chỉ mời người dùng bấm.
function nhacSaoLuuKhiMo() {
  const now = Date.now();
  const m = mocSaoLuu(now);
  const qd = nenNhacSaoLuu(m, now, CFG.soNgayNhacSaoLuu);
  if (!qd.nhac) return qd;
  danhDauSaoLuu("nhacLuc", now);
  setTimeout(() => {
    toast(
      (qd.coLanXuat
        ? "Đã " + qd.ngayTuMoc + " ngày kể từ lần xuất bản sao lưu gần nhất"
        : "Bạn chưa từng xuất bản sao lưu") +
        ", và dữ liệu đã thay đổi. Dữ liệu chỉ nằm trong trình duyệt này — nên xuất một file dự phòng.",
      "info",
      [
        { nhan: "Xuất bản sao lưu", primary: true, onClick: () => { xuatTatCa(); } },
        {
          nhan: "Để sau",
          onClick: () => {
            danhDauSaoLuu("hoanLuc");
            toast("Đã hoãn — sẽ nhắc lại sau một ngày.", "info");
          },
        },
      ]
    );
  }, 1200);
  return qd;
}

// ==========================================================================
//  GỠ LỖI — nhật ký parse LLM + gói gỡ lỗi + tự kiểm tra bất biến
// ==========================================================================
// Gói gỡ lỗi: MẶC ĐỊNH chỉ có metadata (loại lệnh, thời điểm, ok/lỗi, lý do, độ dài đầu
// ra). Đầu ra thô — thứ có thể chứa nội dung truyện riêng tư hoặc nội dung người lớn —
// CHỈ được kèm khi người dùng tự tích. Hàm này thuần dữ liệu để kiểm thử được.
async function dungGoLoi(opts = {}) {
  const kemTho = !!opts.kemTho;
  const kemTuKiemTra = !!opts.kemTuKiemTra;
  const nhat = await docNhatKyLlm();
  const dl = await dungLuongUocTinh();
  let dem = { tinNhan: 0, anh: 0 };
  try {
    dem.tinNhan = (await R.kv.tinNhan.entries()).length;
    dem.anh = (await R.kv.thuVienAnh.entries()).length;
  } catch (e) {
    console.error(e);
  }
  const goi = {
    type: "truyen-vai-go-loi",
    version: PHIEN_BAN_TRUYEN,
    luc: Date.now(),
    lucChu: new Date().toISOString(),
    app: {
      phienBanTruyen: PHIEN_BAN_TRUYEN,
      phienBanHoSo: PHIEN_BAN_HO_SO,
      generator: typeof window !== "undefined" ? window.generatorName || "" : "",
      soTruyen: store.stories.length,
      soHoSoNgoaiHinh: dsNgoaiHinh().length,
      soTinNhan: dem.tinNhan,
      soAnh: dem.anh,
      dungLuong: dl ? { dung: dl.dung, tong: dl.tong, phanTram: Math.round((dl.dung / dl.tong) * 100) } : null,
      manHinh: typeof navigator !== "undefined" ? navigator.userAgent : "",
      caiDat: Object.assign({}, store.settings, { saoLuu: undefined }),
      soNgayNhacSaoLuu: CFG.soNgayNhacSaoLuu,
    },
    // Nhật ký: bỏ hẳn trường `tho` khi không xin kèm đầu ra thô.
    nhatKy: nhat.map((x) => {
      const m = { loai: x.l, luc: x.t, ok: !!x.ok, lyDo: x.ly || "", doDaiDauRa: x.d || 0 };
      if (kemTho) m.dauRaTho = x.tho || "";
      return m;
    }),
    soMucNhatKy: nhat.length,
    kemDauRaTho: kemTho,
    daDonNhatKy: false,
  };
  if (kemTuKiemTra) {
    try {
      goi.tuKiemTra = await chayTuKiemTra();
      goi.tuKiemTra = { soLoi: goi.tuKiemTra.soLoi, nhom: goi.tuKiemTra.nhom, soTruyen: goi.tuKiemTra.soTruyen, soHoSo: goi.tuKiemTra.soHoSo };
    } catch (e) {
      goi.tuKiemTra = { soLoi: -1, loi: String((e && e.message) || e) };
    }
  }
  return goi;
}

// Một câu mô tả ĐÚNG những gì file sắp tải sẽ chứa — dùng cho hộp xác nhận.
function moTaGoLoi(kemTho, kemTuKiemTra) {
  const phan = [
    "Thông tin chung: phiên bản dữ liệu, số truyện / tin nhắn / ảnh / hồ sơ ngoại hình, dung lượng trình duyệt, tên generator, và cài đặt hiển thị.",
    "Nhật ký AI: loại lệnh, thời điểm, thành công hay lỗi, lý do, độ dài đầu ra — KHÔNG có nội dung truyện.",
  ];
  if (kemTho) phan.push("⚠ Đầu ra thô của AI — phần này CÓ THỂ CHỨA NỘI DUNG TRUYỆN của bạn (kể cả nội dung người lớn riêng tư).");
  else phan.push("(Không kèm đầu ra thô — bạn chưa tích ô đó.)");
  if (kemTuKiemTra) phan.push("Báo cáo tự kiểm tra bất biến — có id và TÊN TRUYỆN của bạn.");
  phan.push("Gói KHÔNG chứa: nội dung tin nhắn, ảnh, hồ sơ ngoại hình, hay bất kỳ thứ gì trong thư viện truyện.");
  return phan;
}

function taiGoLoi(goi) {
  const ten = "truyen-vai-go-loi-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";
  download(ten, JSON.stringify(goi, null, 1));
  return ten;
}

// Bảng gỡ lỗi: xem nhật ký + mở gói gỡ lỗi + mở màn tự kiểm tra.
async function openGoLoi() {
  const body = el("div", { class: "gl-modal" });
  body.innerHTML = '<div class="hint">Đang đọc nhật ký…</div>';
  const m = modal({
    title: "Gỡ lỗi",
    subtitle: "Chỉ nằm trên máy này — không gửi đi đâu cả.",
    body: body,
    wide: true,
    actions: [{ label: "Đóng", primary: true, onClick: (mm) => mm.close() }],
  });

  async function veLai() {
    const nhat = await docNhatKyLlm();
    const dl = await dungLuongUocTinh();
    const lh = docLoiHinhDang();
    const mb = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1) + " MB";
    const dong = nhat
      .map((x, i) => {
        const gio = new Date(x.t || 0);
        const hh = String(gio.getHours()).padStart(2, "0") + ":" + String(gio.getMinutes()).padStart(2, "0");
        return (
          '<div class="gl-dong">' +
            '<span class="gl-gio">' + esc(hh) + "</span>" +
            '<span class="chip ' + (x.ok ? "gl-ok" : "gl-loi") + '">' + (x.ok ? "ok" : "lỗi") + "</span>" +
            '<span class="gl-loai">' + esc(x.l || "?") + "</span>" +
            '<span class="gl-ct">' + (x.ly ? esc(x.ly) : "") + (x.d ? ' <span class="muted">(' + x.d + " ký tự)</span>" : "") + "</span>" +
            (x.tho
              ? '<details class="gl-tho"><summary>đầu ra thô</summary><pre>' + esc(x.tho) + "</pre></details>"
              : "") +
          "</div>"
        );
      })
      .join("");
    body.innerHTML =
      '<div class="gl-tk">' +
        '<div><span class="muted">Phiên bản dữ liệu</span> <b>' + esc(PHIEN_BAN_TRUYEN) + "</b> · <span class=\"muted\">hồ sơ ngoại hình</span> <b>" + esc(PHIEN_BAN_HO_SO) + "</b></div>" +
        '<div><span class="muted">Truyện</span> <b>' + store.stories.length + "</b> · <span class=\"muted\">hồ sơ</span> <b>" + dsNgoaiHinh().length + "</b></div>" +
        (dl && dl.tong ? "<div>" + esc(mb(dl.dung)) + " / " + esc(mb(dl.tong)) + "</div>" : "") +
        // Giai đoạn 5: bản ghi cũ được nâng lên phiên bản hiện tại ngay khi nạp. Nói ra để
        // người dùng biết dữ liệu của mình đã đổi hình dạng (chỉ trên máy này).
        "<div><span class=\"muted\">Nâng cấp dữ liệu</span> " + esc(tomTatMigrate()) + "</div>" +
        (lh.tong ? '<div class="gl-loi"><b>' + lh.tong + "</b> cảnh báo hình dạng — xem “Tự kiểm tra dữ liệu”.</div>" : "") +
      "</div>" +
      '<div class="row-gap">' +
        '<button class="btn btn-sm" data-gl-act="xuat">' + icon("download", 15) + " Xuất gói gỡ lỗi</button>" +
        '<button class="btn btn-sm" data-gl-act="xoa">' + icon("trash", 15) + " Xoá nhật ký</button>" +
        '<button class="btn btn-sm" data-gl-act="tukiem">' + icon("check", 15) + " Tự kiểm tra dữ liệu</button>" +
      "</div>" +
      '<div class="gl-head">' + icon("alert", 13) + " Nhật ký AI (" + nhat.length + " mục gần nhất · tối đa " + TOI_DA_MUC_NHAT_KY + " mục / " + Math.round(TOI_DA_BYTE_NHAT_KY / 1024) + " KB phần thô)</div>" +
      (nhat.length ? '<div class="gl-list">' + dong + "</div>" : '<div class="hint">Chưa có lượt AI nào kể từ khi bật nhật ký.</div>');
  }

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-gl-act]");
    if (!b) return;
    const viec = b.dataset.glAct;
    if (viec === "xoa") {
      const ok = await hoiXacNhan("Xoá nhật ký AI", "Xoá toàn bộ " + (await docNhatKyLlm()).length + " mục nhật ký trên máy này? Nhật ký chỉ dùng để gỡ lỗi — xoá không ảnh hưởng truyện.", { yesLabel: "Xoá nhật ký", danger: true });
      if (!ok) return;
      await xoaNhatKyLlm();
      toast("Đã xoá nhật ký AI.");
      await veLai();
      return;
    }
    if (viec === "xuat") { openXuatGoLoi(); return; }
    if (viec === "tukiem") { openTuKiemTra(); return; }
  });

  await veLai();
  return m;
}

// Hộp chọn nội dung gói gỡ lỗi → hộp xác nhận nói rõ gói chứa gì → tải file.
function openXuatGoLoi() {
  const body = el("div");
  body.innerHTML =
    '<label class="set-check"><input type="checkbox" data-gl="tho">' +
      "<span><b>Kèm đầu ra thô của AI</b>" +
      '<span class="hint">Mặc định KHÔNG kèm. Đầu ra thô có thể chứa nội dung truyện của bạn (kể cả nội dung người lớn riêng tư) — ' +
      "chỉ tích khi bạn thật sự cần người khác soi giúp phần parse hỏng.</span></span></label>" +
    '<label class="set-check"><input type="checkbox" data-gl="tukiem">' +
      "<span><b>Kèm báo cáo tự kiểm tra dữ liệu</b>" +
      '<span class="hint">Danh sách lỗi bất biến (mồ côi, tham chiếu mồ) — có id và tên truyện của bạn.</span></span></label>' +
    '<div class="gl-head">Gói gỡ lỗi luôn chứa</div>' +
    '<div class="hint">' + esc(moTaGoLoi(false, false).slice(0, 2).join(" ")) + "</div>";
  const F = (k) => body.querySelector('[data-gl="' + k + '"]');
  F("tho").checked = false;
  F("tukiem").checked = false;
  modal({
    title: "Xuất gói gỡ lỗi",
    subtitle: "Một file JSON để soi lỗi. Không tự gửi đi đâu.",
    body: body,
    actions: [
      { label: "Huỷ", onClick: (m) => m.close() },
      {
        label: "Xuất file…",
        primary: true,
        onClick: async (m) => {
          const kemTho = F("tho").checked;
          const kemTuKiemTra = F("tukiem").checked;
          m.close();
          const ds = moTaGoLoi(kemTho, kemTuKiemTra);
          const ok = await hoiXacNhan(
            "Gói gỡ lỗi sẽ chứa",
            ds.map((x, i) => i + 1 + ". " + x).join("  ") + "  Tải file về máy?",
            { yesLabel: kemTho ? "Tải file (có đầu ra thô)" : "Tải file", danger: kemTho }
          );
          if (!ok) return;
          const goi = await dungGoLoi({ kemTho: kemTho, kemTuKiemTra: kemTuKiemTra });
          const ten = taiGoLoi(goi);
          toast("Đã tải " + ten + (kemTho ? " (có kèm đầu ra thô)" : " (chỉ metadata)") + ".");
        },
      },
    ],
  });
}

// ---- tự kiểm tra bất biến -------------------------------------------------
async function chayTuKiemTra() {
  await loadStories();
  let khoaTn = [];
  let khoaAnh = [];
  try {
    khoaTn = (await R.kv.tinNhan.entries()).map((e) => e[0]);
    khoaAnh = (await R.kv.thuVienAnh.entries()).map((e) => e[0]);
  } catch (e) {
    console.error(e);
  }
  // Giai đoạn 5: quét TRÊN CẢ bản ghi sai hình dạng — một bản ghi sai hình dạng vẫn có thể chứa tham
  // chiếu mồ côi đáng báo, và bị chôn ở đó mới chính là rủi ro thật. Việc chịu được dữ liệu sai kiểu
  // nằm ở `mang()` trong src/store.js.
  const bc = kiemTraBatBien(store.stories, dsNgoaiHinh(), khoaTn, khoaAnh, thamChieuMo);
  // Giai đoạn 5: bản ghi SAI HÌNH DẠNG gặp lúc nạp là một nhóm vấn đề riêng. Chỉ BÁO CÁO —
  // không xoá, không tự sửa (hình dạng là chuyện của đường nạp, không phải của nút "Sửa").
  const hd = docLoiHinhDang();
  bc.soLoiHinhDang = hd.tong;
  if (hd.ds.length) {
    bc.nhom["hinh-dang"] = hd.ds.map((m) => ({
      loai: "hinh-dang",
      moTa:
        nhanLoaiBanGhi(m.loai) + " “" + (m.ten || m.id || "(không tên)") + "” sai hình dạng: " +
        (m.loi || []).map((x) => x.duong + " — " + x.moTa).join("; ") +
        (m.soLoi > (m.loi || []).length ? " … (+" + (m.soLoi - m.loi.length) + " lỗi nữa)" : ""),
      id: m.id,
    }));
    bc.soLoi += bc.nhom["hinh-dang"].length;
  }
  return bc;
}

function nhanNhomKiemTra(loai) {
  const ten = {
    "tin-nhan-mo-coi": "Tin nhắn mồ côi (không hội thoại nào dùng)",
    "anh-mo-coi": "Ảnh mồ côi (không truyện nào dùng)",
    "ho-so-mo": "Thiếu hồ sơ ngoại hình mà nhân vật / ảnh đang trỏ tới",
    "hoi-thoai-tro-nv": "Hội thoại trỏ tới nhân vật đã mất",
    "hien-dien-tro-nv": "Người có mặt trỏ tới nhân vật đã mất",
    "hoi-thoai-tro-chuong": "Hội thoại trỏ tới chương đã mất",
    "canh-rieng-tro-nv": "Cảnh riêng trỏ tới nhân vật đã mất",
    "canh-tro-hoi-thoai": "Cảnh đã khép trỏ tới hội thoại đã mất",
    "trung-id": "Id trùng trong cùng một truyện",
    "hinh-dang": "Bản ghi sai hình dạng gặp lúc nạp (chỉ báo cáo — xem ghi chú hình dạng)",
  };
  return ten[loai] || loai;
}

const NHOM_SUA_DUOC = ["tin-nhan-mo-coi", "anh-mo-coi", "ho-so-mo", "hoi-thoai-tro-nv", "hien-dien-tro-nv", "canh-rieng-tro-nv"];

async function openTuKiemTra() {
  const body = el("div", { class: "gl-modal" });
  body.innerHTML = '<div class="hint">Đang quét dữ liệu…</div>';
  modal({
    title: "Tự kiểm tra dữ liệu",
    subtitle: "Chỉ báo cáo. Không tự sửa gì khi bạn chưa xác nhận.",
    body: body,
    wide: true,
    actions: [{ label: "Đóng", primary: true, onClick: (m) => m.close() }],
  });

  async function veLai() {
    const bc = await chayTuKiemTra();
    const dsNhom = Object.keys(bc.nhom);
    const suaDuoc = dsNhom.filter((k) => NHOM_SUA_DUOC.indexOf(k) >= 0).reduce((a, k) => a + bc.nhom[k].length, 0);
    body.innerHTML =
      '<div class="gl-tk">' +
        "<div><span class=\"muted\">Đã quét</span> <b>" + bc.soTruyen + "</b> truyện · <b>" + bc.soHoSo + "</b> hồ sơ ngoại hình</div>" +
        "<div>" + (bc.soLoi ? '<b class="gl-loi">' + bc.soLoi + " vấn đề</b>" : '<b class="gl-ok">Không thấy vấn đề nào</b>') + "</div>" +
      "</div>" +
      '<div class="hint">Bất biến được soi: mọi tham chiếu phải trỏ tới thứ còn tồn tại; không có khoá tin nhắn / ảnh mồ côi; không có id trùng trong một truyện; và hình dạng bản ghi lúc nạp (bản ghi dị dạng chỉ được BÁO, không bị xoá).</div>' +
      (dsNhom.length
        ? dsNhom
            .map((k) =>
              '<div class="gl-nhom"><div class="gl-head">' + esc(nhanNhomKiemTra(k)) + " (" + bc.nhom[k].length + ")</div>" +
              bc.nhom[k].slice(0, 40).map((x) => '<div class="gl-dong">' + esc(x.moTa) + "</div>").join("") +
              (bc.nhom[k].length > 40 ? '<div class="hint">… và ' + (bc.nhom[k].length - 40) + " mục nữa.</div>" : "") +
              "</div>"
            )
            .join("")
        : "") +
      (suaDuoc
        ? '<div class="row-gap"><button class="btn btn-sm btn-danger" data-tk-act="sua">Sửa ' + suaDuoc + " lỗi an toàn</button></div>"
        : "");
    return bc;
  }

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-tk-act]");
    if (!b || b.dataset.tkAct !== "sua") return;
    const bc = await chayTuKiemTra();
    const ok = await hoiXacNhan(
      "Sửa lỗi bất biến",
      "Sẽ chỉ làm những việc sau, trong MỘT giao dịch (hỏng ở bước nào thì trả lại nguyên trạng): " +
        "xoá " + ((bc.nhom["tin-nhan-mo-coi"] || []).length + (bc.nhom["anh-mo-coi"] || []).length) + " khoá mồ côi (tin nhắn / ảnh không ai dùng); " +
        "gỡ " + ((bc.nhom["ho-so-mo"] || []).length) + " tham chiếu tới hồ sơ ngoại hình đã mất; " +
        "gỡ " + ((bc.nhom["hoi-thoai-tro-nv"] || []).length + (bc.nhom["hien-dien-tro-nv"] || []).length + (bc.nhom["canh-rieng-tro-nv"] || []).length) + " liên kết tới nhân vật đã mất. " +
        "Không đụng tới nội dung tin nhắn, ảnh, hay hồ sơ ngoại hình. Tiếp tục?",
      { yesLabel: "Sửa & lưu", danger: true }
    );
    if (!ok) return;
    const kq = await suaBatBien(bc);
    if (kq.ok) toast("Đã sửa " + kq.soSua + " lỗi an toàn.");
    else toast("Không sửa được: " + kq.loi + " — dữ liệu đã được trả lại nguyên trạng.", "error");
    await veLai();
  });

  await veLai();
}

// Sửa các lỗi "an toàn": xoá khoá mồ côi + gỡ liên kết trỏ vào thứ đã mất. Chạy trong
// giaoDichKV nên lỗi giữa chừng sẽ trả mọi khoá về nguyên trạng.
async function suaBatBien(bc) {
  const xoaTn = (bc.nhom["tin-nhan-mo-coi"] || []).map((x) => x.id);
  const xoaAnh = (bc.nhom["anh-mo-coi"] || []).map((x) => x.id);
  const truyenIds = ["ho-so-mo", "hoi-thoai-tro-nv", "hien-dien-tro-nv", "canh-rieng-tro-nv"]
    .map((k) => (bc.nhom[k] || []).map((x) => x.truyen))
    .reduce((a, b) => a.concat(b), [])
    .filter((x) => x);
  const ds = []
    .concat(xoaTn.map((k) => ["tinNhan", k]))
    .concat(xoaAnh.map((k) => ["thuVienAnh", k]))
    .concat(Array.from(new Set(truyenIds)).map((k) => ["cotTruyen", k]));
  const soSua = xoaTn.length + xoaAnh.length + truyenIds.length;
  try {
    await giaoDichKV(ds, async () => {
      for (const k of xoaTn) {
        delete store.messagesCache[k];
        await R.kv.tinNhan.delete(k);
      }
      for (const k of xoaAnh) {
        delete store.anhCache[k];
        await R.kv.thuVienAnh.delete(k);
      }
      for (const id of Array.from(new Set(truyenIds))) {
        const s = getStory(id);
        if (!s) continue;
        for (const c of s.nhanVats || []) if (c && c.ngoaiHinhId && !getNgoaiHinh(c.ngoaiHinhId)) c.ngoaiHinhId = "";
        if (s.nguoiChoi && s.nguoiChoi.ngoaiHinhId && !getNgoaiHinh(s.nguoiChoi.ngoaiHinhId)) s.nguoiChoi.ngoaiHinhId = "";
        for (const a of s.anh || []) if (a && Array.isArray(a.hoSoIds)) a.hoSoIds = a.hoSoIds.filter((x) => getNgoaiHinh(x));
        const nvIds = new Set((s.nhanVats || []).map((c) => c && c.id).filter(Boolean));
        for (const c of s.hoiThoais || []) {
          if (!c) continue;
          c.nhanVatIds = (c.nhanVatIds || []).filter((x) => nvIds.has(x));
          c.hienDien = (c.hienDien || []).filter((x) => nvIds.has(x));
          if (c.canhRieng && !nvIds.has(c.canhRieng)) c.canhRieng = null;
        }
        await ghiCotTruyen(s);
      }
    });
  } catch (e) {
    return { ok: false, soSua: 0, loi: String((e && e.message) || e) };
  }
  await loadStories();
  await loadNgoaiHinh();
  return { ok: true, soSua: soSua, xoaTn: xoaTn.length, xoaAnh: xoaAnh.length, truyen: Array.from(new Set(truyenIds)).length };
}

function openStoryMenu() {
  const story = currentStory();
  if (!story) return;
  const body = el("div");
  const tgv = thoiGianOf(story);
  const nguongChon = NGUONG_CHON.slice();
  if (tgv.nguongPhut > 0 && nguongChon.indexOf(tgv.nguongPhut) < 0) nguongChon.push(tgv.nguongPhut);
  nguongChon.sort((a, b) => a - b);
  body.innerHTML =
    '<label class="field-label">Tên cốt truyện</label><input class="input" data-f="ten">' +
    '<label class="field-label">Biểu tượng</label><input class="input" data-f="emoji" maxlength="4">' +
    '<label class="field-label">Bối cảnh</label><textarea class="input" data-f="boiCanh" rows="4"></textarea>' +
    '<label class="field-label">Tên nhân vật của bạn (người chơi)</label><input class="input" data-f="nguoiChoiTen">' +
    '<label class="field-label">Mô tả bạn trong truyện</label><textarea class="input" data-f="nguoiChoiMoTa" rows="2"></textarea>' +
    '<div class="nh-link" data-nc-link>' +
      '<div class="gk-char-head">' + esc("🧬 Hồ sơ ngoại hình của bạn (người chơi)") + "</div>" +
      '<label class="field-label">Liên kết hồ sơ ngoại hình cho bạn</label>' +
      '<select class="input" data-f="nguoiChoiNgoaiHinhId"><option value="">— không liên kết —</option>' +
        dsNgoaiHinh().map((x) => '<option value="' + esc(x.id) + '">' + esc(tenHoSo(x)) + (x.tuoi ? " (" + esc(x.tuoi) + " tuổi)" : "") + "</option>").join("") +
      "</select>" +
      '<div class="hint">Hồ sơ quyết định ngoại hình <b>CỐ ĐỊNH</b> của bạn trong khung hình — dùng chung một thư viện ' +
        "với nhân vật, không phải thông tin riêng của truyện này. Bỏ liên kết thì ảnh có bạn sẽ chỉ dùng phần mô tả ở trên.</div>" +
      '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="open-ngoai-hinh">' + icon("users", 14) + " Thư viện ngoại hình</button></div>" +
      '<div class="nh-link-info" data-nc-link-info></div>' +
    "</div>" +
    '<label class="field-label">Cách dựng truyện</label>' +
    '<select class="input" data-f="mode">' +
      '<option value="chuong">Một cốt truyện, nhiều chương</option>' +
      '<option value="songSong">Nhiều hội thoại theo cốt truyện</option>' +
    "</select>" +
    '<label class="field-label">Nhịp phát triển (nội tâm & quan hệ)</label>' +
    '<select class="input" data-f="nhip">' +
      TS.NHIP.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.ten + " — " + x.moTa) + "</option>").join("") +
    "</select>" +
    '<label class="field-label">Chế độ Đạo diễn</label>' +
    '<select class="input" data-f="daoDien">' +
      '<option value="0">Tắt</option>' +
      '<option value="1">Bật — xem trạng thái ẩn, đính chính, đặt hướng tương lai</option>' +
    "</select>" +
    '<div class="row-gap"><button class="btn btn-sm" data-act="open-dao-dien">' + icon("clapper", 14) + " Mở màn Đạo diễn</button></div>" +
    '<div class="hint">Tắt chỉ ẩn phần hiển thị — không xoá đính chính hay hướng nào. Hướng chỉ ngừng được bơm vào prompt khi bạn bấm <b>Tạm dừng</b> hoặc <b>Huỷ hướng</b>.</div>' +
    '<label class="field-label">Thời gian khi rời app</label>' +
    '<select class="input" data-f="vgCheDo">' +
      CHE_DO.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.ten + " — " + x.moTa) + "</option>").join("") +
    "</select>" +
    '<label class="field-label">Ngưỡng xử lý</label>' +
    '<select class="input" data-f="vgNguong">' +
      nguongChon.map((p) => '<option value="' + p + '">' + esc(khoangText(p)) + "</option>").join("") +
      '<option value="0">Tắt — không mô phỏng gì</option>' +
    "</select>" +
    '<label class="field-label">Tương tác chủ động</label>' +
    '<select class="input" data-f="vgChuDong">' +
      '<option value="1">Bật — nhân vật có lý do có thể chủ động liên lạc</option>' +
      '<option value="0">Tắt — chỉ diễn biến ngoài màn hình</option>' +
    "</select>" +
    '<div class="hint">Perchance không chạy khi tab đóng; diễn biến được mô phỏng khi bạn quay lại. Mỗi lần quay lại tối đa <b>3 sự kiện cho cả truyện</b>, và <b>không mô phỏng</b> khi còn cảnh đang dang dở.</div>' +
    '<label class="field-label">Giao kèo trao đổi quyền lực (BDSM M/M)</label>' +
    '<button class="btn btn-sm" data-act="open-giao-keo">' + icon("lock", 14) + " " +
      (giaoKeoOf(story).bat ? "Đang bật — chỉnh giao kèo" : "Thiết lập giao kèo") + "</button>" +
    '<label class="field-label">Sổ tri thức (lorebook)</label>' +
    '<button class="btn btn-sm" data-act="open-lorebook">' + icon("book", 14) + " " +
      (loreCua(story).entries.length ? "Đang có " + loreCua(story).entries.length + " mục — mở sổ" : "Nạp file lorebook") + "</button>" +
    '<div class="row-gap">' +
      '<button class="btn btn-sm" data-act="export-story">' + icon("download", 14) + " Xuất truyện</button>" +
      '<button class="btn btn-sm" data-act="import-story">' + icon("upload", 14) + " Nhập truyện</button>" +
      '<button class="btn btn-sm btn-danger" data-act="delete-story">' + icon("trash", 14) + " Xoá truyện</button>" +
    "</div>";
  const F = (f) => body.querySelector('[data-f="' + f + '"]');
  F("ten").value = story.ten;
  F("emoji").value = story.emoji || "✦";
  F("boiCanh").value = story.boiCanh || "";
  F("nguoiChoiTen").value = story.nguoiChoi.ten || "";
  F("nguoiChoiMoTa").value = story.nguoiChoi.moTa || "";
  // ---- Liên kết hồ sơ ngoại hình của NGƯỜI CHƠI ----
  // Người chơi không nằm trong `nhanVats` nên không có editor nhân vật để liên kết; khối
  // này là chỗ duy nhất. Cùng luật với nhân vật: đổi ô chọn chỉ đổi trên FORM, chỉ được
  // ghi vào truyện khi bấm Lưu thành công (`luuNhapNhay`).
  function paintNcLink() {
    const sel = F("nguoiChoiNgoaiHinhId");
    const info = body.querySelector("[data-nc-link-info]");
    if (!sel || !info) return;
    const h = sel.value ? getNgoaiHinh(sel.value) : null;
    const tenNc = String(F("nguoiChoiTen").value || "").trim() || "Bạn";
    if (!h) {
      info.innerHTML = '<div class="hint">Chưa liên kết: khung hình có bạn sẽ chỉ dùng mô tả “' + esc(tenNc) + "” ở trên.</div>";
      return;
    }
    const dung = demDungNgoaiHinh(store.stories, h.id);
    // Lựa chọn đang gõ CHƯA được lưu, nên nếu truyện này chưa trỏ tới hồ sơ thì phép đếm
    // chưa tính người chơi — cộng vào để con số không nói thiếu so với những gì sắp xảy ra.
    const sapDung = story.nguoiChoi.ngoaiHinhId !== h.id ? 1 : 0;
    const demHien = { nhanVat: dung.nhanVat, nguoiChoi: dung.nguoiChoi + sapDung, anh: dung.anh };
    const lech = tenNc.toLowerCase() !== h.tenChinh.toLowerCase();
    info.innerHTML =
      '<div class="hint">Đang liên kết <b>' + esc(tenHoSo(h)) + "</b>" + (h.tuoi ? " · " + esc(h.tuoi) + " tuổi" : "") +
      (h.anh ? " · có ảnh tham chiếu" : "") + ". Hồ sơ này đang được dùng bởi " +
      esc(moTaNguoiDung(demHien) || "chưa ai") + ".</div>" +
      '<div class="nh-info-mota">' + esc((h.moTa || "Chưa có mô tả ngoại hình.").slice(0, 220)) + "</div>" +
      (h.tranh ? '<div class="nh-info-tranh">Tránh: ' + esc(h.tranh.slice(0, 160)) + "</div>" : "") +
      (lech
        ? '<div class="nh-info-lech">Bạn đang tên “' + esc(tenNc) + '”, khác tên chính của hồ sơ (“' + esc(h.tenChinh) +
          '”). Hồ sơ vẫn nhận diện được cả hai tên khi tạo ảnh. Nếu muốn dùng đúng tên hồ sơ thì bấm nút dưới — nút chỉ ' +
          "điền vào ô tên (chưa lưu), tin nhắn cũ <b>không</b> bị sửa.</div>" +
          '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="dong-ten-nguoi-choi">' +
          icon("check", 13) + " Dùng tên chính của hồ sơ</button></div>"
        : "") +
      '<div class="row-gap"><button type="button" class="btn btn-sm" data-act="sua-ngoai-hinh" data-id="' + esc(h.id) + '">' +
      icon("edit", 13) + " Sửa hồ sơ</button></div>";
  }
  // Dựng lại danh sách <option> từ thư viện HIỆN TẠI (hồ sơ có thể vừa được tạo/xoá ở màn
  // thư viện) rồi vẽ lại phần tóm tắt. `muon` = giá trị muốn chọn (mặc định: giữ nguyên
  // lựa chọn đang có trên form). Lựa chọn chỉ được GIỮ nếu hồ sơ đó còn tồn tại.
  function lamMoiNcLink(muon) {
    const sel = F("nguoiChoiNgoaiHinhId");
    if (sel) {
      const dangChon = muon === undefined ? sel.value : String(muon || "");
      sel.innerHTML =
        '<option value="">— không liên kết —</option>' +
        dsNgoaiHinh().map((x) => '<option value="' + esc(x.id) + '">' + esc(tenHoSo(x)) + (x.tuoi ? " (" + esc(x.tuoi) + " tuổi)" : "") + "</option>").join("");
      sel.value = dangChon && getNgoaiHinh(dangChon) ? dangChon : "";
    }
    paintNcLink();
  }
  {
    lamMoiNcLink(story.nguoiChoi.ngoaiHinhId || "");
    F("nguoiChoiNgoaiHinhId").addEventListener("change", paintNcLink);
    F("nguoiChoiTen").addEventListener("input", paintNcLink);
  }
  F("mode").value = story.mode;
  F("nhip").value = TS.nhipCua(story).id;
  F("daoDien").value = daoDienOf(story).bat ? "1" : "0";
  F("vgCheDo").value = tgv.cheDo;
  F("vgNguong").value = String(tgv.nguongPhut);
  F("vgChuDong").value = tgv.chuDong ? "1" : "0";
  async function luuNhapNhay() {
    // Ảnh chụp các giá trị sắp sửa đổi — ghi hỏng thì trả lại đúng trạng thái cũ và trả
    // về false để chỗ gọi KHÔNG đóng bảng / không coi như đã lưu.
    const truoc = {
      ten: story.ten, emoji: story.emoji, boiCanh: story.boiCanh, mode: story.mode, nhip: story.nhip,
      ncTen: story.nguoiChoi.ten, ncMoTa: story.nguoiChoi.moTa, ncNgoaiHinh: story.nguoiChoi.ngoaiHinhId,
      soChuong: story.chuongs.length, ddBat: daoDienOf(story).bat,
      cheDo: tgv.cheDo, nguong: tgv.nguongPhut, chuDong: tgv.chuDong,
    };
    // Lưu ngay những gì đang gõ dở, để mở Giao kèo / Sổ tri thức (modal khác) không làm mất.
    story.ten = F("ten").value.trim() || story.ten;
    story.emoji = F("emoji").value.trim() || "✦";
    story.boiCanh = F("boiCanh").value.trim();
    story.nguoiChoi.ten = F("nguoiChoiTen").value.trim() || "Bạn";
    story.nguoiChoi.moTa = F("nguoiChoiMoTa").value.trim();
    story.nguoiChoi.ngoaiHinhId = F("nguoiChoiNgoaiHinhId") ? F("nguoiChoiNgoaiHinhId").value : "";
    // Chỉ giữ liên kết tới hồ sơ CÒN tồn tại (thư viện có thể đã bị xoá ở tab khác).
    if (story.nguoiChoi.ngoaiHinhId && !getNgoaiHinh(story.nguoiChoi.ngoaiHinhId)) story.nguoiChoi.ngoaiHinhId = "";
    const newMode = F("mode").value;
    if (newMode === "chuong" && !story.chuongs.length) story.chuongs.push(newChapter(1, { tieuDe: "Chương 1" }));
    story.mode = newMode;
    const nhipMoi = F("nhip").value;
    story.nhip = TS.NHIP.some((x) => x.id === nhipMoi) ? nhipMoi : "cham";
    daoDienOf(story).bat = F("daoDien").value === "1";
    const cdMoi = F("vgCheDo").value;
    tgv.cheDo = CHE_DO.some((x) => x.id === cdMoi) ? cdMoi : "tamDung";
    tgv.nguongPhut = Math.max(0, Math.round(Number(F("vgNguong").value) || 0));
    tgv.chuDong = F("vgChuDong").value === "1";
    if (!(await luuTruyen(story, "tuỳ chọn truyện"))) {
      story.ten = truoc.ten;
      story.emoji = truoc.emoji;
      story.boiCanh = truoc.boiCanh;
      story.mode = truoc.mode;
      story.nhip = truoc.nhip;
      story.nguoiChoi.ten = truoc.ncTen;
      story.nguoiChoi.moTa = truoc.ncMoTa;
      story.nguoiChoi.ngoaiHinhId = truoc.ncNgoaiHinh;
      story.chuongs.length = truoc.soChuong;
      daoDienOf(story).bat = truoc.ddBat;
      tgv.cheDo = truoc.cheDo;
      tgv.nguongPhut = truoc.nguong;
      tgv.chuDong = truoc.chuDong;
      return false;
    }
    return true;
  }
  const m = modal({
    title: "Tuỳ chọn truyện",
    wide: true,
    body,
    actions: [{ label: "Đóng", onClick: (mm) => mm.close() },
      { label: "Lưu", primary: true, onClick: async (mm) => {
        if (await luuNhapNhay()) { mm.close(); render(); }
      } }],
  });
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "export-story") xuatTruyen(story);
    if (b.dataset.act === "import-story") nhapTruyen();
    // Liên kết ngoại hình của NGƯỜI CHƠI: thư viện / sửa hồ sơ là modal con, mở xong quay
    // lại dựng lại khối liên kết để danh sách và phần tóm tắt luôn khớp thư viện hiện tại.
    if (b.dataset.act === "open-ngoai-hinh") { e.stopPropagation(); openNgoaiHinh(lamMoiNcLink); }
    if (b.dataset.act === "sua-ngoai-hinh") {
      e.stopPropagation();
      openSuaNgoaiHinh(b.dataset.id, lamMoiNcLink);
    }
    if (b.dataset.act === "dong-ten-nguoi-choi") {
      const h = getNgoaiHinh(F("nguoiChoiNgoaiHinhId").value);
      // CHỈ điền vào form — người chơi tự bấm Lưu, và tin nhắn cũ không bị sửa.
      if (h) F("nguoiChoiTen").value = h.tenChinh;
      paintNcLink();
    }
    // Modal con mở lên trên, modal này vẫn giữ nguyên — không mất thay đổi chưa lưu.
    if (b.dataset.act === "open-giao-keo") { e.stopPropagation(); await luuNhapNhay(); openGiaoKeo(); }
    if (b.dataset.act === "open-lorebook") { e.stopPropagation(); await luuNhapNhay(); openLorebook(); }
    if (b.dataset.act === "open-dao-dien") {
      e.stopPropagation();
      await luuNhapNhay();
      if (!daoDienOf(story).bat) {
        const bat = await hoiXacNhan(
          "Chế độ Đạo diễn đang tắt",
          "Bật Chế độ Đạo diễn cho truyện này rồi mở màn Đạo diễn? Đây là màn riêng của bạn — nó không hiện gì trong chat.",
          { yesLabel: "Bật & mở" }
        );
        if (!bat) return;
        const t = ddTruoc(story);
        daoDienOf(story).bat = true;
        F("daoDien").value = "1";
        if (!(await ddLuu(story, "bật Chế độ Đạo diễn", t))) return;
      }
      m.close();
      openDaoDien();
    }
    if (b.dataset.act === "delete-story") {
      m.close();
      confirmModal("Xoá cốt truyện", "Xoá vĩnh viễn “" + story.ten + "” cùng toàn bộ hội thoại? Không thể hoàn tác.", async () => {
        try {
          await deleteStory(story.id);
        } catch (e) {
          // Xoá là giao dịch: hỏng thì truyện vẫn còn nguyên. Không được báo "đã xoá".
          baoLoiLuu(e, "cốt truyện");
          goLibrary();
          return;
        }
        toast("Đã xoá cốt truyện.");
        goLibrary();
      }, { danger: true, yesLabel: "Xoá vĩnh viễn" });
    }
  });
}

// -------------------------------------------------------------- sổ tri thức
function lbMucHtml(e, kb) {
  const khop = kb ? kb.get(e.id) : null;
  return (
    '<div class="lb-muc' + (e.bat ? "" : " off") + (khop ? " khop" : "") + '" data-lb-muc="' + esc(e.id) + '">' +
      '<div class="lb-muc-head">' +
        '<label class="lb-switch" title="Bật / tắt mục"><input type="checkbox" data-lb-bat="' + esc(e.id) + '"' + (e.bat ? " checked" : "") + "></label>" +
        '<span class="lb-muc-ten">' + esc(e.ghiChu) + "</span>" +
        (e.hangSo ? '<span class="lb-badge">cố định</span>' : "") +
        (e.chonLoc ? '<span class="lb-badge">cần khoá phụ</span>' : "") +
        (khop ? '<span class="lb-badge khop">đang khớp' + (khop.ly === "liên quan" ? " (kéo theo)" : "") + "</span>" : "") +
        '<span class="lb-muc-meta">' + (e.keys.length ? e.keys.length + " từ khoá" : "không từ khoá") + " · ưu tiên " + esc(String(e.thuTu)) + "</span>" +
        '<span class="lb-muc-nut">' +
          '<button class="btn btn-sm" data-lb-sua="' + esc(e.id) + '" title="Sửa mục">' + icon("edit", 12) + "</button>" +
          '<button class="btn btn-sm btn-danger" data-lb-xoa="' + esc(e.id) + '" title="Xoá mục">' + icon("trash", 12) + "</button>" +
        "</span>" +
      "</div>" +
      (e.keys.length ? '<div class="lb-keys">' + e.keys.map((k) => '<span class="lb-key">' + esc(k) + "</span>").join("") + "</div>" : "") +
      '<div class="lb-noi">' + esc(e.noiDung.slice(0, 240)) + (e.noiDung.length > 240 ? "…" : "") + "</div>" +
      lbFormHtml(e) +
    "</div>"
  );
}

function lbFormHtml(e) {
  const ck = (k, nhan) => '<label class="lb-check"><input type="checkbox" data-lb-f="' + k + '"' + (e[k] ? " checked" : "") + "> " + nhan + "</label>";
  return (
    '<div class="lb-form" hidden>' +
      '<label class="field-label">Tên mục (chỉ để bạn nhận ra — không gửi cho AI)</label>' +
      '<input class="input" data-lb-f="ghiChu" value="' + esc(e.ghiChu) + '">' +
      '<label class="field-label">Từ khoá — cách nhau bằng dấu phẩy</label>' +
      '<input class="input" data-lb-f="keys" value="' + esc(e.keys.join(", ")) + '" placeholder="ví dụ: hội đồng, năm người">' +
      '<label class="field-label">Từ khoá phụ (chỉ dùng khi bật “cần khoá phụ”)</label>' +
      '<input class="input" data-lb-f="keys2" value="' + esc(e.keys2.join(", ")) + '" placeholder="ví dụ: quyền lực, bỏ phiếu">' +
      '<label class="field-label">Nội dung gửi cho AI khi mục này khớp</label>' +
      '<textarea class="input" data-lb-f="noiDung" rows="5">' + esc(e.noiDung) + "</textarea>" +
      '<div class="grid-2">' +
        '<div><label class="field-label">Ưu tiên (số nhỏ xếp trước)</label>' +
        '<input class="input" data-lb-f="thuTu" type="number" value="' + esc(String(e.thuTu)) + '"></div>' +
        '<div><label class="field-label">Số tin nhắn để dò (0 = mặc định)</label>' +
        '<input class="input" data-lb-f="doSau" type="number" min="0" value="' + esc(String(e.doSau)) + '"></div>' +
      "</div>" +
      '<div class="lb-checks">' +
        ck("hangSo", "Luôn gửi") +
        ck("chonLoc", "Cần khoá phụ") +
        ck("phanBietHoa", "Phân biệt hoa/thường") +
        ck("khopTronTu", "Khớp trọn từ") +
        ck("khongDeQuy", "Không cho kéo theo") +
      "</div>" +
      '<div class="row-gap">' +
        '<button class="btn btn-sm btn-primary" data-lb-luu="' + esc(e.id) + '">' + icon("check", 13) + " Lưu mục</button>" +
        '<button class="btn btn-sm" data-lb-dong="' + esc(e.id) + '">Đóng</button>' +
      "</div>" +
    "</div>"
  );
}

function openLorebook() {
  const story = currentStory();
  if (!story) return;
  if (document.querySelector(".lb-modal")) return;
  // `let` vì khi ghi hỏng ta phải nạp lại truyện từ máy và trỏ `lb` sang bản ghi mới.
  let lb = loreCua(story);
  // Đang ở trong chat thì lấy hội thoại đó; ở bảng điều khiển thì lấy hội thoại mở gần nhất.
  const conv = (() => {
    const id = app.convId || store.lastConvId;
    return id ? story.hoiThoais.find((c) => c.id === id) || null : null;
  })();
  const body = el("div", { class: "lb-modal" });
  body.innerHTML =
    '<div class="hint lb-note">Sổ tri thức giữ những thông tin nền cố định (địa danh, tổ chức, nhân vật phụ, luật lệ…). ' +
      "AI <b>chỉ đọc</b> những mục có <b>từ khoá</b> xuất hiện trong bối cảnh truyện, tên hội thoại hoặc vài tin nhắn gần nhất — " +
      "nên bạn nạp cả một quyển cũng không tốn ngữ cảnh.</div>" +
    '<details class="lb-help"><summary>Định dạng file được nhận</summary><div>' +
      "File JSON theo chuẩn <b>World Info / SillyTavern</b>: <code>{ \"entries\": { \"0\": { \"key\": [\"từ khoá\"], \"content\": \"…\" } } }</code>, " +
      "dạng mảng <code>{ \"entries\": [ … ] }</code> (character book), sổ nằm trong thẻ nhân vật (<code>data.character_book</code>), hoặc một mục đơn lẻ. " +
      "Các trường được đọc: <code>key/keys</code>, <code>keysecondary/secondary_keys</code>, <code>content</code>, <code>comment/name</code>, " +
      "<code>constant</code>, <code>selective</code>, <code>disable</code>/<code>enabled</code>, <code>order/insertion_order</code>, " +
      "<code>caseSensitive</code>, <code>matchWholeWords</code>, <code>preventRecursion</code>, <code>scanDepth</code>. " +
      "Mục thiếu nội dung bị bỏ qua; mục thiếu từ khoá được nhập ở trạng thái tắt để bạn sửa sau." +
      '<div class="row-gap"><button class="btn btn-sm" data-lb-vidu>Xem ví dụ JSON</button></div>' +
    "</div></details>" +
    '<div class="lb-nhap">' +
      '<div class="row-gap">' +
        '<button class="btn btn-sm" data-lb-file>' + icon("upload", 14) + " Chọn file lorebook (.json)</button>" +
        '<button class="btn btn-sm" data-lb-them>' + icon("plus", 14) + " Thêm mục trống</button>" +
      "</div>" +
      '<label class="field-label">Hoặc dán JSON vào đây</label>' +
      '<textarea class="input" data-lb-json rows="3" spellcheck="false" placeholder=\'{ "entries": { "0": { "key": ["hội đồng"], "content": "Hội đồng gồm năm người…" } } }\'></textarea>' +
      '<div class="row-gap">' +
        '<button class="btn btn-sm btn-primary" data-lb-nhap-them>Thêm vào sổ</button>' +
        '<button class="btn btn-sm" data-lb-nhap-thay>Thay thế toàn bộ sổ</button>' +
      "</div>" +
    "</div>" +
    '<div class="lb-thongke" data-lb-thongke></div>' +
    '<div class="lb-list" data-lb-list></div>';

  let moId = "";

  function veThongKe() {
    const ctn = body.querySelector("[data-lb-thongke]");
    const n = lb.entries.length;
    const bat = lb.entries.filter((e) => e.bat).length;
    if (!n) {
      ctn.textContent = "Sổ đang trống.";
      return;
    }
    const khop = conv ? mucKhop(story, conv, getMessages(conv.id)).length : 0;
    ctn.innerHTML =
      "<b>" + n + "</b> mục · <b>" + bat + "</b> đang bật" +
      (conv ? ' · <b class="lb-khop-num">' + khop + "</b> đang khớp với hội thoại này" : "") +
      (lb.ten ? " · " + esc(lb.ten) : "");
  }

  function veDanhSach() {
    const ctn = body.querySelector("[data-lb-list]");
    const kb = conv ? new Map(mucKhop(story, conv, getMessages(conv.id)).map((x) => [x.entry.id, x])) : null;
    ctn.innerHTML = lb.entries.length
      ? lb.entries.map((e) => lbMucHtml(e, kb)).join("")
      : '<div class="hint">Chưa có mục nào. Nạp một file lorebook, dán JSON, hoặc bấm “Thêm mục trống” để tự viết.</div>';
    if (moId) {
      const node = ctn.querySelector('[data-lb-muc="' + moId + '"]');
      if (node) node.querySelector(".lb-form").hidden = false;
    }
    veThongKe();
  }

  async function luuSapXep() {
    chamLore(story);
    if (!(await luuTruyen(story, "sổ tri thức"))) {
      await hoanTacSo();
      return false;
    }
    veDanhSach();
    return true;
  }

  // Ghi hỏng ⇒ đọc lại từ máy và dựng lại danh sách, để bảng không hiển thị một trạng
  // thái chưa từng được lưu.
  async function hoanTacSo() {
    try { await loadStories(); } catch (e) { console.error(e); }
    const s2 = getStory(story.id);
    const moi = s2 ? loreCua(s2) : null;
    if (moi) {
      lb.ten = moi.ten;
      lb.entries = moi.entries;
    }
    veDanhSach();
  }

  async function nhapTu(text, thayThe) {
    let kq;
    try {
      kq = docLorebook(text);
    } catch (err) {
      toast("Không đọc được file: " + (err.message || err), "error");
      return;
    }
    const bao = (dau) =>
      dau +
      (kq.boQua.length ? " Bỏ qua " + kq.boQua.length + " mục thiếu nội dung." : "") +
      (kq.thieuTuKhoa ? " " + kq.thieuTuKhoa + " mục thiếu từ khoá đã được tắt." : "");
    const nhan = async () => {
      const cuTen = lb.ten;
      if (kq.ten) lb.ten = kq.ten;
      chamLore(story);
      if (!(await luuTruyen(story, "sổ tri thức"))) {
        lb.ten = cuTen;
        await hoanTacSo();
        return false;
      }
      veDanhSach();
      return true;
    };
    if (thayThe && lb.entries.length) {
      confirmModal(
        "Thay thế sổ tri thức",
        "Xoá " + lb.entries.length + " mục hiện có và thay bằng " + kq.entries.length + " mục vừa đọc?",
        async () => {
          lb.entries = kq.entries;
          if (await nhan()) toast(bao("Đã thay sổ tri thức."));
        },
        { yesLabel: "Thay thế", danger: true }
      );
      return;
    }
    lb.entries = lb.entries.concat(kq.entries);
    if (await nhan()) toast(bao("Đã thêm " + kq.entries.length + " mục vào sổ."));
  }

  function chonFile() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const kq = docLorebook(await f.text());
        if (kq.boQua.length && !kq.entries.length) {
          toast("File không có mục nào dùng được.", "error");
          return;
        }
        lb.entries = lb.entries.concat(kq.entries);
        if (kq.ten) lb.ten = kq.ten;
        chamLore(story);
        if (!(await luuTruyen(story, "sổ tri thức"))) {
          await hoanTacSo();
          return;
        }
        veDanhSach();
        toast(
          "Đã nạp " + kq.entries.length + " mục từ “" + f.name + "”." +
            (kq.boQua.length ? " Bỏ qua " + kq.boQua.length + " mục thiếu nội dung." : "") +
            (kq.thieuTuKhoa ? " " + kq.thieuTuKhoa + " mục thiếu từ khoá đã được tắt." : "")
        );
      } catch (err) {
        toast("Nhập thất bại: " + (err.message || err), "error");
      }
    };
    inp.click();
  }

  const m = modal({
    title: "Sổ tri thức (lorebook)",
    subtitle: "Tải file World Info / SillyTavern, hoặc tự viết từng mục.",
    wide: true,
    body,
    actions: [
      { label: "Đóng", onClick: (mm) => mm.close() },
      {
        label: "Xuất JSON",
        onClick: () => {
          download(
            "lorebook-" + String(story.ten || "so").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() + ".json",
            xuatLorebook(story)
          );
          toast("Đã xuất file lorebook (chuẩn World Info).");
        },
      },
      {
        label: "Xoá cả sổ",
        danger: true,
        onClick: async (mm) => {
          if (!lb.entries.length) {
            toast("Sổ đang trống.");
            return;
          }
          confirmModal(
            "Xoá sổ tri thức",
            "Xoá toàn bộ " + lb.entries.length + " mục của sổ tri thức? Không thể hoàn tác.",
            async () => {
              lb.entries = [];
              chamLore(story);
              if (!(await luuTruyen(story, "sổ tri thức"))) {
                await hoanTacSo();
                return;
              }
              mm.close();
              render();
              toast("Đã xoá sổ tri thức.");
            },
            { yesLabel: "Xoá tất cả", danger: true }
          );
        },
      },
    ],
  });

  veDanhSach();

  body.addEventListener("change", async (e) => {
    const cb = e.target.closest("[data-lb-bat]");
    if (!cb) return;
    const e2 = lb.entries.find((x) => x.id === cb.dataset.lbBat);
    if (!e2) return;
    e2.bat = cb.checked;
    await luuSapXep();
  });

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-lb-file],[data-lb-them],[data-lb-nhap-them],[data-lb-nhap-thay],[data-lb-vidu],[data-lb-xoa],[data-lb-sua],[data-lb-dong],[data-lb-luu]");
    if (!b) return;
    const lay = (id) => body.querySelector('[data-lb-muc="' + id + '"]');
    if (b.dataset.lbVidu !== undefined) {
      body.querySelector("[data-lb-json]").value = JSON.stringify(viDuLorebook(), null, 2);
      toast("Đã dán ví dụ — bấm “Thêm vào sổ” để thử.");
      return;
    }
    if (b.dataset.lbFile !== undefined) {
      chonFile();
      return;
    }
    if (b.dataset.lbThem !== undefined) {
      const e2 = newLoreEntry({ ghiChu: "Mục mới", keys: [], noiDung: "Nội dung gửi cho AI khi mục này khớp." });
      lb.entries.push(e2);
      moId = e2.id;
      await luuSapXep();
      const node = lay(e2.id);
      if (node) node.scrollIntoView({ block: "center" });
      return;
    }
    if (b.dataset.lbNhapThem !== undefined || b.dataset.lbNhapThay !== undefined) {
      await nhapTu(body.querySelector("[data-lb-json]").value, b.dataset.lbNhapThay !== undefined);
      return;
    }
    if (b.dataset.lbXoa !== undefined) {
      const e2 = lb.entries.find((x) => x.id === b.dataset.lbXoa);
      if (!e2) return;
      confirmModal("Xoá mục", "Xoá mục “" + e2.ghiChu + "” khỏi sổ tri thức?", async () => {
        lb.entries = lb.entries.filter((x) => x.id !== e2.id);
        if (await luuSapXep()) toast("Đã xoá mục.");
      }, { yesLabel: "Xoá", danger: true });
      return;
    }
    if (b.dataset.lbSua !== undefined) {
      moId = b.dataset.lbSua;
      const node = lay(moId);
      if (node) {
        node.querySelector(".lb-form").hidden = false;
        node.scrollIntoView({ block: "center" });
      }
      return;
    }
    if (b.dataset.lbDong !== undefined) {
      const node = lay(b.dataset.lbDong);
      if (node) node.querySelector(".lb-form").hidden = true;
      return;
    }
    if (b.dataset.lbLuu !== undefined) {
      const e2 = lb.entries.find((x) => x.id === b.dataset.lbLuu);
      const node = e2 ? lay(e2.id) : null;
      if (!e2 || !node) return;
      const g = (f) => node.querySelector('[data-lb-f="' + f + '"]');
      const ds = (f) => String(g(f).value || "").split(",").map((s) => s.trim()).filter(Boolean);
      const nd = g("noiDung").value.trim();
      if (!nd) {
        toast("Mục chưa có nội dung.", "error");
        return;
      }
      e2.ghiChu = g("ghiChu").value.trim() || ds("keys")[0] || "Mục";
      e2.keys = ds("keys");
      e2.keys2 = ds("keys2");
      e2.noiDung = nd;
      e2.thuTu = Number(g("thuTu").value) || 0;
      e2.doSau = Math.max(0, Number(g("doSau").value) || 0);
      e2.hangSo = g("hangSo").checked;
      e2.chonLoc = g("chonLoc").checked;
      e2.phanBietHoa = g("phanBietHoa").checked;
      e2.khopTronTu = g("khopTronTu").checked;
      e2.khongDeQuy = g("khongDeQuy").checked;
      moId = "";
      if (await luuSapXep()) toast("Đã lưu mục.");
    }
  });
}

// ------------------------------------------------------------------ giao kèo
function openGiaoKeo() {
  const story = currentStory();
  if (!story) return;
  if (document.querySelector(".gk-modal")) return;
  const g = giaoKeoOf(story);
  const body = el("div", { class: "gk-modal" });
  body.innerHTML =
    htmlGiaoKeo(g, "gk") +
    '<div class="hint gk-note">Giao kèo này là thứ AI đọc trước mỗi tin nhắn. Càng cụ thể, cảnh càng sâu và càng an toàn. ' +
    "Bấm một mẫu dựng sẵn để điền nhanh toàn bộ, rồi sửa lại theo ý bạn — mức độ, khung quan hệ, sở thích và giới hạn đều đổi được giữa các cảnh.</div>";

  const m = modal({
    title: "Giao kèo — trao đổi quyền lực",
    subtitle: "Thoả thuận trước: vai, từ khoá dừng, giới hạn, mức độ, chăm sóc sau.",
    wide: true,
    body,
    actions: [
      { label: "Đóng", onClick: (mm) => mm.close() },
      { label: "Lưu giao kèo", primary: true, onClick: async (mm) => {
        const truoc = !!g.bat;
        const truocNl = g.nguoiLon;
        docGiaoKeo(body, "gk", g);
        // Ô "mọi nhân vật trong truyện này đều là người trưởng thành" ⇒ ghi cờ tường minh
        // cho từng nhân vật — nhưng phải LIỆT KÊ danh sách đó để người dùng xác nhận đúng.
        if (g.bat && !truoc) {
          const xac = await xacNhan18PlusTruyen("Bạn đang bật giao kèo BDSM cho truyện này.", story.nhanVats || []);
          if (!xac.dongY) {
            toast("Chưa xác nhận 18+ cho đúng danh sách nhân vật nên giao kèo chưa được bật.", "error");
            g.bat = false;
            g.nguoiLon = truocNl;
            render();
            return;
          }
        }
        if (g.bat) xacNhanMoiNguoiLon(story);
        if (!(await luuTruyen(story, "giao kèo"))) {
          // Ghi hỏng ⇒ trả cờ về như cũ và KHÔNG đóng bảng, KHÔNG báo "đã lưu".
          g.bat = truoc;
          g.nguoiLon = truocNl;
          render();
          return;
        }
        mm.close();
        render();
        if (g.bat && !truoc) {
          toast("Đã bật giao kèo. Nên mở từng nhân vật để ghi vai Dom/Sub của họ.");
        } else {
          toast(g.bat ? "Đã lưu giao kèo." : "Đã tắt giao kèo cho truyện này.");
        }
      } },
    ],
  });
  dienGiaoKeo(body, "gk", g);
  ganSuKienGiaoKeo(body, "gk");
}

// ------------------------------------------------------------------ an toàn cảnh
// Từ khoá dừng / chăm sóc sau / thương lượng: đẩy một "tín hiệu" vào hội thoại
// rồi để từng nhân vật đang tham gia phản hồi bằng đúng loại nhiệm vụ.
async function tinHieuCanh(loai) {
  const story = currentStory();
  const conv = currentConv();
  if (!story || !conv) return;
  const g = giaoKeoOf(story);
  if (!g.bat) {
    toast("Truyện này chưa bật giao kèo.", "error");
    return;
  }
  const nvts = nvtsCoMat(story, conv);
  if (!nvts.length) {
    toast("Cảnh này chưa có nhân vật nào đang có mặt.", "error");
    return;
  }
  // Sau một tín hiệu dừng/chăm sóc sau, gợi ý "có thể khép cảnh" cũ không còn đúng:
  // cảnh vừa đổi nhịp, và chỉ nên khép khi chăm sóc sau đã xong.
  conv.goiKhep = false;
  // Tín hiệu dừng phải hoạt động NGAY CẢ KHI AI đang viết: dừng lượt đang chạy,
  // giữ lại phần đã viết, rồi mới đẩy tín hiệu và chuyển sang chăm sóc sau.
  if (app.streaming) {
    await dungSinhVaLuu();
    toast("Đã dừng phản hồi đang viết để xử lý tín hiệu.");
  }
  const tk = (g.tuKhoaDung || "đỏ").trim();
  let tinNhanNguoi = "";
  let ghiChu = "";
  if (loai === "safeword") {
    tinNhanNguoi = tk;
    ghiChu =
      "🛑 TỪ KHOÁ DỪNG — người chơi vừa nói “" + tk + "”. Cảnh dừng ngay lập tức, không diễn tiếp, " +
      "không biến việc dừng thành một phần của cảnh. Nhân vật thoát vai, kiểm tra người chơi, rồi chuyển sang chăm sóc sau.";
  } else if (loai === "aftercare") {
    ghiChu = "🕯️ CHĂM SÓC SAU — cảnh đã kết thúc. Chuyển hẳn sang chăm sóc: nước, chăn, kiểm tra cơ thể, lời thật lòng. Không quay lại cảnh mới.";
  } else {
    ghiChu = "📜 THƯƠNG LƯỢNG — chưa có cảnh nào. Hai bên nói thẳng với nhau về mong muốn, giới hạn, từ khoá dừng và điều gì xảy ra nếu một bên muốn dừng.";
  }
  if (tinNhanNguoi) {
    const arr1 = await themTinNhan(conv.id, makeMessage("nguoi", tinNhanNguoi, { ten: layNguoiChoi(story) }));
    if (!arr1) return;
    capNhatConv(conv, arr1);
  }
  const arr2 = await themTinNhan(conv.id, makeMessage("he", ghiChu, {}));
  if (!arr2) return;
  capNhatConv(conv, arr2);
  // Tín hiệu dừng phải được ghi xuống máy TRƯỚC khi gọi AI: nếu không ghi được thì đừng
  // đốt một lượt sinh trên một trạng thái sẽ biến mất khi tải lại.
  if (!(await luuTruyen(story, "tín hiệu cảnh"))) {
    render();
    return;
  }
  render();

  batDauLuot();
  updateComposerState();
  for (let i = 0; i < nvts.length; i++) {
    await streamOneReply(story, conv, nvts[i], { loaiTask: loai === "safeword" || loai === "aftercare" ? "chamSocSau" : "thuongLuong" });
    if (app.stopRequested) break;
    if (i < nvts.length - 1) await new Promise((r) => setTimeout(r, 220));
  }
  ketThucLuot();
  await luuTruyen(story);
  render();
}

async function doiMucDo(so) {
  const story = currentStory();
  if (!story) return;
  const g = giaoKeoOf(story);
  const n = Math.max(1, Math.min(5, Number(so) || 3));
  if (n === Number(g.mucDo)) return;
  const cu = Number(g.mucDo);
  g.mucDo = n;
  if (!(await luuTruyen(story, "mức độ"))) {
    g.mucDo = cu;
    render();
    return;
  }
  render();
  const ds = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  const m = ds.find((x) => Number(x.so) === n) || {};
  toast("Mức độ " + n + "/5" + (m.ten ? " — " + m.ten : ""));
}

async function xuatTruyen(story) {
  const data = { type: "truyen-vai", version: PHIEN_BAN_TRUYEN, story, messages: {}, anh: {}, ngoaiHinh: {} };
  const thieu = [];
  try {
    for (const c of story.hoiThoais) {
      await loadMessages(c.id);
      data.messages[c.id] = getMessages(c.id);
    }
    for (const a of anhCua(story)) {
      // Đọc ảnh hỏng thì `getAnh` NÉM LỖI (không nuốt) — bản sao lưu không được lặng lẽ
      // thiếu ảnh rồi vẫn báo thành công.
      const rec = await getAnh(a.id);
      if (rec && laDataUrlAnh(rec.dataUrl)) data.anh[a.id] = rec;
      else thieu.push(a.chuThich || a.id);
    }
  } catch (e) {
    baoLoiLuu(e, "bản sao lưu");
    toast("Bản sao lưu đã DỪNG: có ảnh không đọc được nên file chưa được tải. Dữ liệu vẫn còn trên máy — thử lại sau.", "error");
    return;
  }
  // Kèm những HỒ SƠ NGOẠI HÌNH mà truyện này tham chiếu (qua nhân vật và qua ảnh cảnh),
  // để nhập sang nơi khác không bị mất liên kết. Không kèm cả thư viện.
  // Thư viện đọc hỏng thì dừng lại hỏi trước — nếu không, file sẽ thiếu hồ sơ mà vẫn báo
  // "đã xuất file truyện" như thường.
  if (!(await choXuatKhiThieuHoSo("file sao lưu truyện này"))) return;
  for (const h of hoSoCuaTruyen(story, dsNgoaiHinh())) data.ngoaiHinh[h.id] = h;
  const soHoSo = Object.keys(data.ngoaiHinh).length;
  if (thieu.length) {
    const ok = await hoiXacNhan(
      "Bản sao lưu thiếu " + thieu.length + " ảnh",
      "Những ảnh sau không còn dữ liệu nên sẽ KHÔNG có trong file: " + thieu.slice(0, 5).join("; ") +
        (thieu.length > 5 ? " …" : "") + ". File vẫn dùng được nhưng khi khôi phục sẽ thiếu đúng những ảnh này. Vẫn xuất?",
      { yesLabel: "Vẫn xuất", danger: true }
    );
    if (!ok) return;
  }
  download("truyen-vai-" + story.ten.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() + ".json", JSON.stringify(data));
  toast(
    (thieu.length ? "Đã xuất file truyện — THIẾU " + thieu.length + " ảnh (không đọc được)." : "Đã xuất file truyện.") +
      (soHoSo ? " Kèm " + soHoSo + " hồ sơ ngoại hình được truyện tham chiếu." : "")
  );
}

// ==========================================================================
//  NHẬP TRUYỆN — hai chế độ tách bạch
//
//  • "Khôi phục ghi đè": dùng ĐÚNG ID trong file. Đây là cách khôi phục một bản
//    sao lưu của chính thư viện này: truyện trùng ID bị thay thế hoàn toàn (tin
//    nhắn + ảnh cũ của nó bị xoá trước, nên không còn dữ liệu mồ côi), truyện
//    không trùng được thêm vào, truyện khác trong thư viện giữ nguyên.
//  • "Nhập thành bản sao": cấp ID mới cho MỌI thứ — truyện, chương, nhân vật, hội
//    thoại, tin nhắn, cảnh đã khép, ảnh, sổ tri thức, dữ liệu Đạo diễn — rồi dịch
//    lại toàn bộ tham chiếu chéo. Nhờ vậy hai truyện KHÔNG BAO GIỜ dùng chung
//    khoá `tinNhan`/`thuVienAnh`, và sửa/xoá một bản không ảnh hưởng bản kia.
// ==========================================================================

// Đọc file xuất thành dữ liệu thuần (nhận cả file một truyện lẫn file toàn thư viện).
function docFileNhap(data) {
  const d = data && typeof data === "object" ? data : {};
  const list = Array.isArray(d.stories) ? d.stories : d.story ? [d.story] : d.ten ? [d] : [];
  // Hồ sơ ngoại hình: chuẩn hoá về map { id: hồ sơ } và bắt `id` khớp khoá — nhờ vậy
  // liên kết trong file luôn trỏ tới đúng hồ sơ đi kèm.
  const ngoaiHinh = {};
  const nhRaw = d.ngoaiHinh && typeof d.ngoaiHinh === "object" && !Array.isArray(d.ngoaiHinh) ? d.ngoaiHinh : {};
  for (const k in nhRaw) {
    const rec = nhRaw[k];
    if (!rec || typeof rec !== "object") continue;
    const h = nhanHoSoNhap(Object.assign({ id: k }, rec));
    if (h.tenChinh || h.moTa) ngoaiHinh[k] = h;
  }
  return {
    toanBo: Array.isArray(d.stories),
    list: list.filter((x) => x && typeof x === "object" && x.ten),
    messages: d.messages && typeof d.messages === "object" ? d.messages : {},
    anh: d.anh && typeof d.anh === "object" ? d.anh : {},
    ngoaiHinh,
  };
}

function thongKeNhap(f) {
  const ra = { truyen: f.list.length, ht: 0, tn: 0, canh: 0, nv: 0, dc: 0, huong: 0, anh: Object.keys(f.anh).length, hoSo: Object.keys(f.ngoaiHinh || {}).length };
  for (const s of f.list) {
    ra.nv += (s.nhanVats || []).length;
    ra.canh += (s.canhDaKhep || []).length;
    for (const c of s.hoiThoais || []) {
      ra.ht++;
      ra.tn += ((f.messages || {})[c.id] || []).length;
    }
    const dd = s.daoDien || {};
    ra.dc += (dd.dinhChinh || []).length;
    ra.huong += (dd.huong || []).length;
  }
  return ra;
}

// Số hội thoại trong file có ID trùng với một hội thoại của truyện KHÁC đang giữ
// lại (tức là sẽ bị ghi đè tin nhắn nếu nhập ở chế độ ghi đè). Chỉ để cảnh báo.
function demTrungHoiThoai(f) {
  const idTrong = f.list.map((s) => s.id);
  const dangDung = Object.create(null);
  for (const s of store.stories) {
    if (idTrong.indexOf(s.id) >= 0) continue;
    for (const c of s.hoiThoais || []) dangDung[c.id] = true;
  }
  let n = 0;
  for (const s of f.list) for (const c of s.hoiThoais || []) if (dangDung[c.id]) n++;
  return n;
}

// Cấp ID mới cho một truyện (đã chuẩn hoá) và dịch lại mọi tham chiếu chéo.
// `msgsByConv` = { [convId]: [tin nhắn…] }, `anhMap` = { [anhId]: bản ghi đầy đủ },
// `hoSoMap` = { [hoSoId]: hồ sơ ngoại hình đầy đủ }.
function capIdMoi(story0, msgsByConv, anhMap, hoSoMap) {
  const s = JSON.parse(JSON.stringify(story0));
  const hsMap = hoSoMap && typeof hoSoMap === "object" ? hoSoMap : {};
  const doi = Object.create(null);
  const dat = (id, tien) => {
    const k = String(id === undefined || id === null ? "" : id);
    if (!k || k === TS.ID_NGUOI || doi[k]) return;
    doi[k] = uid(tien);
  };
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
  // Tin nhắn: chỉ lấy cho những hội thoại CÒN trong truyện (khoá tin nhắn không
  // gắn được với hội thoại nào thì bỏ qua, đúng như luồng nhập trước đây).
  const cuHt = s.hoiThoais.map((c) => c.id);
  const dsMsgs = (id) => (Array.isArray(msgsByConv[id]) ? msgsByConv[id] : []);
  for (const cuId of cuHt) for (const m of dsMsgs(cuId)) dat(m && m.id, "tn");
  // Ảnh: CHỈ lấy ảnh thuộc truyện này (theo chỉ mục `anh` và các `anhId` trong tin
  // nhắn). File sao lưu toàn thư viện chứa ảnh của MỌI truyện — nếu lấy cả `anhMap`
  // thì mỗi bản sao sẽ ôm trọn ảnh của các truyện khác, và `convId` của chúng trỏ ra
  // ngoài truyện.
  const canAnh = Object.create(null);
  // Chỉ nhận ảnh có `dataUrl` hợp lệ — file nhập là dữ liệu không đáng tin.
  const themAnh = (id) => { if (id && anhMap[id] && laDataUrlAnh(anhMap[id].dataUrl)) canAnh[id] = anhMap[id]; };
  for (const a of s.anh || []) themAnh(a.id);
  for (const cuId of cuHt) for (const m of dsMsgs(cuId)) themAnh(m && m.anhId);
  for (const k in canAnh) dat(canAnh[k].id || k, "anh");
  // Hồ sơ ngoại hình: chỉ lấy những hồ sơ truyện này THAM CHIẾU (qua nhân vật và qua ảnh
  // cảnh) và có trong file — không ôm cả thư viện của người gửi.
  const canHoSo = Object.create(null);
  const themHoSo = (id) => { if (id && hsMap[id]) canHoSo[id] = hsMap[id]; };
  for (const c of s.nhanVats) themHoSo(c.ngoaiHinhId);
  // Người chơi cũng có thể liên kết hồ sơ — phải nằm trong tập "hồ sơ đi kèm", nếu không
  // bản sao sẽ mất liên kết của người chơi dù file có hồ sơ đó.
  themHoSo(s.nguoiChoi && s.nguoiChoi.ngoaiHinhId);
  for (const a of s.anh || []) for (const id of (a && Array.isArray(a.hoSoIds) ? a.hoSoIds : [])) themHoSo(id);
  for (const k in canHoSo) dat(k, "nh");
  for (const e of (s.lorebook && s.lorebook.entries) || []) dat(e.id, "lb");
  for (const x of s.daoDien.dinhChinh) dat(x.id, "dc");
  for (const h of s.daoDien.huong) {
    dat(h.id, "hd");
    for (const e of h.tienDo || []) dat(e.id, "td");
  }
  // Sổ sự kiện vắng mặt + phiên đang chờ: cấp ID mới cho chúng nữa, nếu không bản sao
  // sẽ dùng chung ID sự kiện và chung phiên với bản gốc.
  for (const e of s.ngoaiManHinh || []) dat(e && e.id, "vge");
  if (s.thoiGian && s.thoiGian.phien) dat(s.thoiGian.phien.id, "vgp");
  const R = (id) => {
    const k = String(id === undefined || id === null ? "" : id);
    return k && doi[k] ? doi[k] : id;
  };

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
    // Lớp hé lộ riêng của nhánh cũng là tham chiếu chéo (sự kiện + tin nhắn + nhân vật):
    // không dịch lại thì bản sao trỏ về dữ liệu của bản gốc. Bỏ những lần hé lộ mà tin
    // nhắn nguồn không được mang sang — thiếu nó thì sự kiện trở về đúng mức gốc.
    c.vgHeLo = (c.vgHeLo || [])
      .filter((r) => r && r.tnId && doi[r.tnId])
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
    // Sổ hé lộ: dịch lại nguồn sang ID mới, và BỎ những lần hé lộ mà tin nhắn nguồn
    // không được mang sang bản sao (thiếu nó thì sự kiện phải trở về mức gốc).
    e.heLo = (e.heLo || [])
      .filter((r) => r && r.tnId && doi[r.tnId])
      .map((r) => ({ htId: R(r.htId), tnId: R(r.tnId), nvId: R(r.nvId), luc: Number(r.luc) || 0 }))
      .filter((r) => r.htId && r.tnId);
    for (const d of (e.anhHuong && e.anhHuong.quanHe) || []) { d.tu = R(d.tu); d.den = R(d.den); }
    for (const d of (e.anhHuong && e.anhHuong.noiTam) || []) { d.nvId = R(d.nvId); }
  }
  if (s.thoiGian && s.thoiGian.phien) s.thoiGian.phien.id = R(s.thoiGian.phien.id);

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
  const anh = {};
  for (const k in canAnh) {
    const rec = Object.assign({}, canAnh[k]);
    rec.id = R(rec.id || k);
    rec.convId = cuHt.indexOf(rec.convId) >= 0 ? R(rec.convId) : "";
    rec.hoSoIds = (Array.isArray(rec.hoSoIds) ? rec.hoSoIds : []).filter((id) => id && canHoSo[id]).map(R);
    anh[rec.id] = rec;
  }
  const ngoaiHinh = {};
  for (const k in canHoSo) {
    const h = Object.assign({}, canHoSo[k]);
    h.id = R(k);
    ngoaiHinh[h.id] = h;
  }
  // Tính lại "ai biết gì" theo đúng bộ tin nhắn vừa được mang sang.
  tinhLaiBiet(s, messages);
  return { story: s, messages, anh, ngoaiHinh };
}

// Ghi một truyện nhập xuống kv: thân truyện + tin nhắn theo hội thoại + ảnh + hồ sơ
// ngoại hình được truyện tham chiếu.
// Ghi hỏng ở bất kỳ bước nào thì dọn sạch phần đã ghi — không để truyện nửa vời.
async function ghiTruyenNhap(story, messages, anhMap, hoSoMap) {
  const daGhiHt = [];
  const daGhiAnh = [];
  const daGhiHoSo = [];
  const don = async () => {
    for (const id of daGhiHt) { delete store.messagesCache[id]; await R.kv.tinNhan.delete(id).catch(() => {}); }
    for (const id of daGhiAnh) { delete store.anhCache[id]; await R.kv.thuVienAnh.delete(id).catch(() => {}); }
    for (const id of daGhiHoSo) await R.kv.thuVienNgoaiHinh.delete(id).catch(() => {});
    await R.kv.cotTruyen.delete(story.id).catch(() => {});
    await loadStories();
    try { await loadNgoaiHinh(); } catch (x) { /* đã báo lỗi chính */ }
  };
  story.anh = [];
  store.stories = store.stories.filter((s) => s.id !== story.id);
  store.stories.unshift(story);
  try {
    // Hồ sơ ngoại hình ghi TRƯỚC để liên kết của truyện luôn trỏ tới dữ liệu đã tồn tại.
    const hs = hoSoMap && typeof hoSoMap === "object" ? hoSoMap : {};
    for (const id in hs) {
      await R.kv.thuVienNgoaiHinh.set(id, hs[id]);
      daGhiHoSo.push(id);
    }
    for (const c of story.hoiThoais) {
      const arr = napBanGhi(messages[c.id] || [], "tin-nhan", c.id);
      await R.kv.tinNhan.set(c.id, arr);
      store.messagesCache[c.id] = arr;
      daGhiHt.push(c.id);
    }
    const thuTu = [];
    for (const id in anhMap) {
      const light = await luuAnh(story, anhMap[id]);
      daGhiAnh.push(light.id);
      thuTu.push(light);
    }
    if (thuTu.length) story.anh = thuTu; // giữ đúng thứ tự trong file (luuAnh chèn đầu)
    await R.kv.cotTruyen.set(story.id, story);
  } catch (e) {
    try { await don(); } catch (x) { /* đã báo lỗi chính */ }
    throw e;
  }
  return story;
}

// Ghi những hồ sơ ngoại hình cấp APP — thư viện đi kèm bản sao lưu TOÀN BỘ, gồm cả hồ
// sơ không truyện nào tham chiếu. Gọi bên trong giao dịch của `chayNhap`, sau khi mọi
// truyện đã ghi xong: hỏng ở bước nào thì `traLaiNhap(snap)` trả tất cả về nguyên trạng
// (các id này đã nằm trong `snap.nh`).
async function ghiHoSoNhap(hoSoMap) {
  const hs = hoSoMap && typeof hoSoMap === "object" ? hoSoMap : {};
  for (const id in hs) await R.kv.thuVienNgoaiHinh.set(id, hs[id]);
}

// Những id hồ sơ ngoại hình một truyện THAM CHIẾU (nhân vật + ảnh cảnh).
function idHoSoCuaTruyen(story) {
  const ids = new Set();
  for (const c of (story && story.nhanVats) || []) if (c && c.ngoaiHinhId) ids.add(c.ngoaiHinhId);
  for (const a of (story && story.anh) || []) {
    for (const id of (a && Array.isArray(a.hoSoIds) ? a.hoSoIds : [])) if (id) ids.add(id);
  }
  return Array.from(ids);
}

// --- Giao dịch nhập truyện ---------------------------------------------------
// Một lần nhập — dù là một truyện hay cả thư viện, dù là bản sao hay ghi đè — là
// MỘT giao dịch. Việc "ghi đè" phải XOÁ bản cũ trước khi ghi bản mới, và "xoá thừa"
// phải xoá những truyện không có trong file; cả hai đều là mất dữ liệu thật, nên
// không thể dựa vào việc dọn dẹp tại chỗ của từng bước.
//
// Trước khi đụng vào bất cứ thứ gì, ta liệt kê TOÀN BỘ bản ghi có thể bị đọc/ghi/xoá
// rồi chụp lại nguyên văn (đúng giá trị đang nằm trong IndexedDB). Hỏng ở bất kỳ
// bước nào — kể cả bước xoá thừa cuối cùng — thì `traLaiNhap()` trả thư viện về đúng
// trạng thái trước khi nhập, từng byte. Không có đường nào để mất dữ liệu cũ vì một
// lần nhập hỏng.

// Dựng danh sách việc sẽ làm + chụp lại nguyên văn mọi bản ghi liên quan.
// Sau khi nhập bản sao / khôi phục, mốc hoạt động phải đặt về HIỆN TẠI: nếu không, app
// sẽ tưởng người dùng vừa vắng mặt suốt khoảng thời gian kể từ lúc tạo file backup, rồi
// mô phỏng một khoảng vắng mặt chưa từng xảy ra.
function datLaiMocNhap(story) {
  const tg = thoiGianOf(story);
  tg.hoatDongLuc = Date.now();
  tg.daXuLyLuc = tg.hoatDongLuc;
  tg.phien = null;
}

async function chuanBiNhap(f, cheDo, tuyChon) {
  const viec = [];
  // Thư viện ngoại hình là cấp APP, không thuộc truyện nào — nên nó phải được xử lý NGOÀI
  // vòng lặp truyện. File bản sao lưu TOÀN BỘ mang theo cả thư viện, kể cả những hồ sơ
  // chưa gắn vào nhân vật/ảnh nào. Nếu chỉ lấy hồ sơ mà truyện tham chiếu thì khôi phục
  // xong sẽ thiếu đúng những hồ sơ chưa dùng, mà không có cảnh báo nào.
  const hoSoToanBo = {};
  if (f.toanBo) {
    for (const id in f.ngoaiHinh) {
      const rec = f.ngoaiHinh[id];
      if (!rec) continue;
      if (getNgoaiHinh(id) && !(tuyChon && tuyChon.ghiDeHoSo)) continue;
      hoSoToanBo[id] = rec;
    }
  }
  for (const raw of f.list) {
    // Đường nhập file đi qua ĐÚNG cửa vào của Giai đoạn 5: kiểm hình dạng (báo qua màn Tự
    // kiểm tra, không xoá) rồi nâng lên hình dạng hiện tại. Cờ xác nhận 18+ của lần nhập này
    // vẫn được truyền vào như trước.
    const story0 = napBanGhi(raw, "truyen", "", { choNhap: true, dongY18: !!(tuyChon && tuyChon.dongY18) });
    if (cheDo === "ghiDe") {
      const messages = {};
      for (const c of story0.hoiThoais) messages[c.id] = f.messages[c.id] || [];
      const anh = {};
      for (const a of story0.anh || []) {
        const rec = f.anh[a.id];
        if (!rec) continue;
        // Ảnh trong file nhập là dữ liệu KHÔNG đáng tin: chỉ nhận khi `dataUrl` đúng là
        // một data URL ảnh (hoặc URL http(s) sạch). Bỏ hẳn bản ghi sai thay vì ghi vào
        // thư viện rồi hiển thị.
        if (!laDataUrlAnh(rec.dataUrl)) {
          console.warn("[Truyện Vai] bỏ ảnh nhập có dữ liệu không hợp lệ: " + a.id);
          continue;
        }
        anh[a.id] = rec;
      }
      datLaiMocNhap(story0);
      tinhLaiBiet(story0, messages);
      // Hồ sơ ngoại hình đi kèm file: MẶC ĐỊNH không ghi đè hồ sơ đang có (liên kết của
      // truyện cứ trỏ tới hồ sơ cũ — đúng người vì khoá là ID, không phải tên).
      // Hồ sơ của file TOÀN BỘ đã được gom một lần ở trên (`hoSoToanBo`); ở đây chỉ lấy
      // những hồ sơ mà CHÍNH truyện này tham chiếu (file một truyện, hoặc hồ sơ chỉ
      // riêng truyện này dùng mà file toàn bộ không có).
      const ngoaiHinh = {};
      if (!f.toanBo) {
        for (const id of idHoSoCuaTruyen(story0)) {
          const rec = f.ngoaiHinh[id];
          if (!rec) continue;
          if (getNgoaiHinh(id) && !(tuyChon && tuyChon.ghiDeHoSo)) continue;
          ngoaiHinh[id] = rec;
        }
      }
      viec.push({ story: story0, messages, anh, ngoaiHinh });
    } else {
      const v = capIdMoi(story0, f.messages, f.anh, f.ngoaiHinh);
      datLaiMocNhap(v.story);
      viec.push(v);
    }
  }
  const idTrong = viec.map((v) => v.story.id);
  const xoaIds = cheDo === "ghiDe" && tuyChon && tuyChon.xoaThua && f.toanBo
    ? store.stories.filter((s) => idTrong.indexOf(s.id) < 0).map((s) => s.id)
    : [];

  // Tập khoá sẽ chạm tới: khoá mới ghi + khoá của những truyện bị thay thế/xoá
  // (tin nhắn và ảnh của chúng cũng bị xoá theo).
  const tapCot = Object.create(null), tapTn = Object.create(null), tapAnh = Object.create(null), tapHoSo = Object.create(null);
  // Khoá của MỌI truyện sẽ được ghi — kể cả truyện hoàn toàn mới (chế độ bản sao, hoặc
  // truyện trong file mà thư viện chưa có). Thiếu bước này thì khi ghi hỏng, bản ghi
  // của những truyện đã ghi xong sẽ nằm lại làm rác.
  for (const v of viec) tapCot[v.story.id] = true;
  for (const v of viec) for (const k in v.messages) tapTn[k] = true;
  for (const v of viec) for (const k in v.anh) tapAnh[k] = true;
  for (const v of viec) for (const k in v.ngoaiHinh || {}) tapHoSo[k] = true;
  for (const k in hoSoToanBo) tapHoSo[k] = true;
  for (const s of store.stories) {
    const biDung = xoaIds.indexOf(s.id) >= 0 || idTrong.indexOf(s.id) >= 0;
    if (!biDung) continue;
    tapCot[s.id] = true;
    for (const c of s.hoiThoais || []) tapTn[c.id] = true;
    for (const a of anhCua(s)) tapAnh[a.id] = true;
  }

  // Đọc thẳng từ kv (không qua bộ đệm) để bản chụp đúng là thứ đang nằm trên đĩa.
  // Nếu đọc không được thì NÉM LỖI luôn — chưa ghi gì cả, an toàn tuyệt đối.
  const snap = { cot: {}, tn: {}, anh: {}, nh: {} };
  for (const id in tapCot) snap.cot[id] = await R.kv.cotTruyen.get(id);
  for (const id in tapTn) snap.tn[id] = await R.kv.tinNhan.get(id);
  for (const id in tapAnh) snap.anh[id] = await R.kv.thuVienAnh.get(id);
  for (const id in tapHoSo) snap.nh[id] = await R.kv.thuVienNgoaiHinh.get(id);
  return { viec, xoaIds, snap, hoSoToanBo };
}

// Trả mọi bản ghi đã chạm về đúng giá trị đã chụp. Xoá hết trước rồi mới ghi lại —
// như vậy bộ nhớ được giải phóng trước khi khôi phục (quan trọng khi lỗi là hết chỗ).
// Trả về số bản ghi KHÔNG khôi phục được (0 = hoàn hảo).
async function traLaiNhap(snap) {
  const khoa = (folder, id) => folder.delete(id).catch(() => {});
  for (const id in snap.tn) await khoa(R.kv.tinNhan, id);
  for (const id in snap.anh) await khoa(R.kv.thuVienAnh, id);
  for (const id in snap.nh || {}) await khoa(R.kv.thuVienNgoaiHinh, id);
  for (const id in snap.cot) await khoa(R.kv.cotTruyen, id);
  let hong = 0;
  const dat = async (folder, id, v) => {
    if (v === undefined || v === null) return;
    try { await folder.set(id, v); } catch (e) { hong++; console.error("Không khôi phục được bản ghi " + id, e); }
  };
  for (const id in snap.anh) await dat(R.kv.thuVienAnh, id, snap.anh[id]);
  for (const id in snap.nh || {}) await dat(R.kv.thuVienNgoaiHinh, id, snap.nh[id]);
  for (const id in snap.tn) await dat(R.kv.tinNhan, id, snap.tn[id]);
  for (const id in snap.cot) await dat(R.kv.cotTruyen, id, snap.cot[id]);
  for (const id in snap.tn) delete store.messagesCache[id];
  for (const id in snap.anh) delete store.anhCache[id];
  await loadStories();
  try { await loadNgoaiHinh(); } catch (e) { console.error(e); }
  return hong;
}

// Chạy trọn một lần nhập. Ném lỗi (đã khôi phục xong) nếu ghi hỏng giữa chừng.
async function chayNhap(f, cheDo, tuyChon) {
  const { viec, xoaIds, snap, hoSoToanBo } = await chuanBiNhap(f, cheDo, tuyChon);
  const soThay = cheDo === "ghiDe" ? viec.filter((v) => getStory(v.story.id)).length : 0;
  try {
    // Thư viện ngoại hình của file TOÀN BỘ ghi TRƯỚC tiên — trong cùng giao dịch, kể cả
    // hồ sơ không truyện nào dùng — để liên kết của truyện luôn trỏ tới dữ liệu đã tồn
    // tại. Hỏng ở đây cũng được `traLaiNhap(snap)` trả lại nguyên trạng.
    if (hoSoToanBo) await ghiHoSoNhap(hoSoToanBo);
    for (const v of viec) {
      // Thay thế hoàn toàn bản cũ cùng ID (tin nhắn + ảnh của nó bị xoá trước), nên
      // không còn tin nhắn/ảnh mồ côi của lần lưu trước.
      if (cheDo === "ghiDe" && getStory(v.story.id)) await deleteStory(v.story.id);
      await ghiTruyenNhap(v.story, v.messages, v.anh, v.ngoaiHinh);
    }
    for (const id of xoaIds) if (getStory(id)) await deleteStory(id);
  } catch (e) {
    const hong = await traLaiNhap(snap);
    if (hong) {
      const loi = new LoiLuu(
        "nhập truyện — đã trả lại trạng thái cũ nhưng còn " + hong + " bản ghi chưa khôi phục được",
        (e && e.nguyenNhan) || e
      );
      loi.goc = e;
      throw loi;
    }
    throw e;
  }
  // Hồ sơ ngoại hình vừa ghi đi thẳng xuống kv, nên phải nạp lại chỉ mục trong RAM.
  try { await loadNgoaiHinh(); } catch (e) { console.error(e); }
  return {
    truyen: viec.length,
    ghiDe: soThay,
    xoa: xoaIds.length,
    hoSo: viec.reduce((n, v) => n + Object.keys(v.ngoaiHinh || {}).length, 0) + Object.keys(hoSoToanBo || {}).length,
  };
}

// Chế độ "bản sao": cấp ID mới toàn bộ nên hai truyện không dùng chung khoá nào.
// Không truyền xác nhận 18+ ⇒ lớp giao kèo trong file bị bỏ (mặc định an toàn).
function nhapBanSao(f, dongY18) {
  return chayNhap(f, "banSao", { dongY18: !!dongY18 });
}

// Chế độ "khôi phục ghi đè": giữ nguyên ID trong file.
function nhapGhiDe(f, tuyChon) {
  return chayNhap(f, "ghiDe", tuyChon);
}

// Hộp thoại chọn chế độ — hiện thông tin file TRƯỚC khi ghi bất cứ thứ gì.
function openNhapTruyen(f, tenFile) {
  const tk = thongKeNhap(f);
  const trung = f.list.filter((s) => s.id && getStory(s.id)).length;
  const trungHt = demTrungHoiThoai(f);
  // File có mang lớp giao kèo (BDSM) hay không — quyết định có bắt xác nhận 18+ không.
  const coBdsm = (f.list || []).some((s) => !!(s && s.giaoKeo && s.giaoKeo.bat));
  // Nhân vật sẽ được GHI CỜ `nguoiLon` khi nhập, theo từng truyện trong file — hộp xác
  // nhận 18+ phải liệt kê đúng danh sách này để người dùng xác nhận.
  const dsNvTheoTruyen = (f.list || [])
    .filter((s) => s && s.giaoKeo && s.giaoKeo.bat)
    .map((s) => ({ ten: s.ten || "(không tên)", nv: s.nhanVats || [] }));
  const demTatCaNv = dsNvTheoTruyen.reduce((n, x) => n + x.nv.length, 0);
  const tomTatNv = dsNvTheoTruyen
    .slice(0, 6)
    .map((x) => "“" + x.ten + "”: " + (x.nv.map((c) => (c && c.ten) || "?").join(", ") || "(chưa có nhân vật)"))
    .join(" · ") + (dsNvTheoTruyen.length > 6 ? " · +" + (dsNvTheoTruyen.length - 6) + " truyện nữa" : "");
  const body = el("div");
  body.innerHTML =
    '<div class="nhap-tk">' +
      '<div class="nhap-tk-line"><span class="dd-key">File</span><span class="dd-val">' + esc(tenFile || "(không rõ tên)") + "</span></div>" +
      '<div class="nhap-tk-line"><span class="dd-key">Nội dung</span><span class="dd-val">' + (f.toanBo ? "Bản sao lưu toàn bộ thư viện" : "Một truyện") + "</span></div>" +
      '<div class="nhap-tk-line"><span class="dd-key">Truyện</span><span class="dd-val">' + tk.truyen + " · " + tk.nv + " nhân vật · " + tk.ht + " hội thoại</span></div>" +
      '<div class="nhap-tk-line"><span class="dd-key">Kèm theo</span><span class="dd-val">' + tk.tn + " tin nhắn · " + tk.anh + " ảnh · " + tk.canh + " cảnh đã khép · " + tk.dc + " đính chính · " + tk.huong + " hướng" +
        (tk.hoSo ? " · " + tk.hoSo + " hồ sơ ngoại hình" : "") + "</span></div>" +
      (trung ? '<div class="nhap-tk-line"><span class="dd-key">Trùng ID</span><span class="dd-val">' + trung + " truyện đang có trong thư viện</span></div>" : "") +
    "</div>" +
    '<label class="field-label">Cách nhập</label>' +
    '<div class="nhap-chon">' +
      '<label class="nhap-mode on"><input type="radio" name="nhapCheDo" value="banSao" checked>' +
        '<span class="nhap-mode-body"><b>Nhập thành bản sao</b><span class="dd-note">Cấp ID mới cho mọi thứ rồi dịch lại mọi tham chiếu — truyện nhập vào là một bản độc lập. Dữ liệu đang có không bị đụng tới, và sửa/xoá bản này không ảnh hưởng bản kia.</span></span></label>' +
      '<label class="nhap-mode"><input type="radio" name="nhapCheDo" value="ghiDe">' +
        '<span class="nhap-mode-body"><b>Khôi phục ghi đè</b><span class="dd-note">Dùng đúng ID trong file. ' +
          (trung ? trung + " truyện trùng ID sẽ bị thay thế hoàn toàn (tin nhắn và ảnh cũ của chúng bị xoá trước). " : "") +
          "Dành cho việc khôi phục bản sao lưu của chính thư viện này.</span></span></label>" +
    "</div>" +
    (f.toanBo
      ? '<label class="nhap-xoa"><input type="checkbox" data-f="xoaThua"> Xoá những truyện không có trong file — khôi phục đúng nguyên trạng lúc sao lưu (không thể hoàn tác)</label>'
      : "") +
    (f.toanBo && tk.hoSo
      ? '<div class="dd-note">File này mang theo <b>' + tk.hoSo + "</b> hồ sơ ngoại hình. Chọn <b>Khôi phục ghi đè</b> thì cả thư viện được khôi phục — kể cả hồ sơ chưa gắn vào truyện hay ảnh nào. Hồ sơ trùng ID vẫn được <b>giữ nguyên</b> trừ khi bạn tích ô bên dưới.</div>"
      : "") +
    (tk.hoSo
      ? '<label class="nhap-xoa"><input type="checkbox" data-f="ghiDeHoSo"> Ghi đè cả hồ sơ ngoại hình trùng ID bằng bản trong file — mặc định <b>giữ nguyên</b> hồ sơ đang có, chỉ thêm hồ sơ mới (trùng tên không được coi là cùng người)</label>'
      : "") +
    (coBdsm
      ? '<label class="lb-check"><input type="checkbox" data-f="dongY18"> Tôi xác nhận 18+ — mọi nhân vật trong file đều là người trưởng thành và tôi cũng vậy. Không xác nhận thì lớp giao kèo BDSM trong file sẽ bị bỏ.</label>' +
        (demTatCaNv
          ? '<div class="dd-note">Sẽ ghi cờ “Người trưởng thành (18+)” cho <b>' + demTatCaNv + "</b> nhân vật — " + esc(tomTatNv) + " — và KHÔNG ghi cho nhân vật có dấu hiệu vị thành niên (bạn phải sửa tuổi/mô tả của họ trước).</div>"
          : "")
      : "") +
    '<div class="dd-note">Không có gì được ghi cho tới khi bạn bấm <b>Nhập</b>. Ghi hỏng giữa chừng sẽ được dọn sạch, không để lại truyện nửa vời.</div>';
  const m = modal({
    title: "Nhập truyện",
    wide: true,
    body,
    actions: [{ label: "Huỷ", onClick: (mm) => mm.close() }],
  });
  body.addEventListener("change", (e) => {
    if (!e.target.closest('input[name="nhapCheDo"]')) return;
    const ds = Array.from(body.querySelectorAll(".nhap-mode"));
    ds.forEach((n) => n.classList.toggle("on", !!(n.querySelector("input") || {}).checked));
  });
  const nut = document.createElement("button");
  nut.className = "btn btn-primary";
  nut.textContent = "Nhập";
  nut.onclick = async () => {
    const cheDo = (body.querySelector('input[name="nhapCheDo"]:checked') || {}).value || "banSao";
    const xoaThua = !!(body.querySelector('[data-f="xoaThua"]') || {}).checked;
    const ghiDeHoSo = !!(body.querySelector('[data-f="ghiDeHoSo"]') || {}).checked;
    // Cửa 18+ cho lớp giao kèo: file nhập KHÔNG được tự bật lại lớp BDSM bằng cờ nằm
    // trong file — phải có lời xác nhận của người đang nhập.
    let dongY18 = !!(body.querySelector('[data-f="dongY18"]') || {}).checked;
    if (coBdsm && !dongY18) {
      const xac = await xacNhan18PlusTruyen(
        "File bạn đang nhập có lớp giao kèo BDSM.",
        dsNvTheoTruyen.reduce((a, x) => a.concat(x.nv), []),
        demTatCaNv ? "Theo từng truyện trong file — " + tomTatNv : ""
      );
      dongY18 = xac.dongY;
      if (!dongY18) toast("Chưa xác nhận 18+ nên lớp giao kèo trong file sẽ bị bỏ.", "error");
    }
    if (cheDo === "ghiDe") {
      const them = tk.truyen - trung;
      const ok = await hoiXacNhan(
        "Khôi phục ghi đè",
        "Ghi đè bằng đúng ID trong file: " + trung + " truyện trùng ID sẽ bị THAY THẾ hoàn toàn, " + them + " truyện được thêm mới" +
        (xoaThua ? ", và mọi truyện không có trong file sẽ bị XOÁ" : "; các truyện khác trong thư viện giữ nguyên") +
        (trungHt ? ". CẢNH BÁO: " + trungHt + " hội thoại trong file trùng ID với hội thoại của một truyện KHÁC không bị ghi đè — tin nhắn của truyện kia sẽ bị thay bằng tin nhắn trong file." : "") + ".",
        { yesLabel: "Ghi đè", danger: true }
      );
      if (!ok) return;
    }
    nut.disabled = true;
    nut.textContent = "Đang nhập…";
    try {
      const kq = cheDo === "ghiDe" ? await nhapGhiDe(f, { xoaThua, dongY18, ghiDeHoSo }) : await nhapBanSao(f, dongY18);
      await loadStories();
      m.close();
      toast(
        "Đã nhập " + kq.truyen + " truyện " + (cheDo === "ghiDe" ? "(khôi phục ghi đè)." : "thành bản sao.") +
        (kq.hoSo ? " Kèm " + kq.hoSo + " hồ sơ ngoại hình." : "") +
        (kq.xoa ? " Đã xoá " + kq.xoa + " truyện không có trong file." : "")
      );
      goLibrary();
    } catch (e) {
      console.error(e);
      nut.disabled = false;
      nut.textContent = "Nhập";
      toast("Nhập thất bại: " + ((e && e.message) || e) + " — thư viện đã được trả về nguyên trạng trước khi nhập.", "error");
    }
  };
  m.footEl.appendChild(nut);
}

// Hai lối vào cũ (Tuỳ chọn truyện · Cài đặt → thư viện) dùng chung một luồng.
function chonFileNhap() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "application/json,.json";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch (e) {
      toast("File không phải JSON hợp lệ.", "error");
      return;
    }
    const doc = docFileNhap(data);
    if (!doc.list.length) {
      // File xuất RIÊNG thư viện ngoại hình (không có truyện nào) — đi luồng nhập hồ sơ.
      const dsHoSo = docHoSoNhap(data);
      if (dsHoSo.length) {
        openNhapNgoaiHinh(dsHoSo, f.name);
        return;
      }
      toast("File không đúng định dạng truyện Vai.", "error");
      return;
    }
    openNhapTruyen(doc, f.name);
  };
  inp.click();
}

function nhapTruyen() { chonFileNhap(); }
function nhapTatCa() { chonFileNhap(); }

// ==========================================================================
//  SỰ KIỆN
// ==========================================================================
function bindGlobalEvents() {
  // Menu ⋯ của hội thoại: chỉ hai thao tác chính ở lại header, phần còn lại nằm trong đây.
  const dongMenuChat = () => {
    const menu = $(".chat-menu");
    if (menu) menu.hidden = true;
    const nut = $(".chat-more-btn");
    if (nut) nut.setAttribute("aria-expanded", "false");
  };
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) {
      if (!e.target.closest(".chat-actions")) dongMenuChat();
      return;
    }
    if (t.dataset.act !== "toggle-chat-menu") {
      // bấm bất kỳ thao tác nào (kể cả trong menu ⋯) thì đóng menu lại
      dongMenuChat();
    }
    const act = t.dataset.act;
    const story = currentStory();
    const conv = currentConv();
    switch (act) {
      case "new-story": openNewStoryModal(); break;
      case "open-story": await openStory(t.dataset.id); break;
      case "go-library": goLibrary(); break;
      case "go-dashboard": goDashboard(); break;
      case "toggle-sidebar":
        if (app.tapTrung) break;
        app.sidebarOpen = !app.sidebarOpen;
        $(".sidebar").classList.toggle("open", app.sidebarOpen);
        $(".sidebar-scrim").classList.toggle("on", app.sidebarOpen);
        break;
      case "close-sidebar":
        app.sidebarOpen = false;
        $(".sidebar").classList.remove("open");
        $(".sidebar-scrim").classList.remove("on");
        break;
      case "toggle-scene-bar": {
        // Đổi thẳng trên DOM để không mất vị trí cuộn của mạch truyện.
        const sb = $(".scene-bar");
        if (!sb) break;
        const mo = sb.classList.toggle("mo");
        const tg = sb.querySelector(".scene-bar-toggle");
        if (tg) tg.setAttribute("aria-expanded", mo ? "true" : "false");
        app.thanhCanhMo = mo;
        break;
      }
      case "toggle-msg-tools": {
        const hang = t.closest(".msg-tools");
        if (!hang) break;
        const mo = hang.classList.toggle("open");
        t.setAttribute("aria-expanded", mo ? "true" : "false");
        break;
      }
      case "toggle-focus": {
        app.tapTrung = !app.tapTrung;
        store.settings.tapTrung = app.tapTrung;
        saveSettings();
        const ap = $(".app");
        if (ap) ap.classList.toggle("tap-trung", app.tapTrung);
        if (app.tapTrung) {
          app.sidebarOpen = false;
          const side = $(".sidebar");
          if (side) side.classList.remove("open");
          const scrim = $(".sidebar-scrim");
          if (scrim) scrim.classList.remove("on");
          const sb = $(".scene-bar");
          if (sb) {
            sb.classList.remove("mo");
            const tg = sb.querySelector(".scene-bar-toggle");
            if (tg) tg.setAttribute("aria-expanded", "false");
          }
        }
        toast(app.tapTrung ? "Chế độ tập trung: đã ẩn sidebar và thu gọn thanh trạng thái." : "Đã tắt chế độ tập trung.");
        break;
      }
      case "toggle-chat-menu": {
        const menu = $(".chat-menu");
        const nut = $(".chat-more-btn");
        if (menu) {
          menu.hidden = !menu.hidden;
          if (nut) nut.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        }
        break;
      }
      case "open-chars": openCharacterList(); break;
      case "new-char": openCharacterEditor(null, { focusTen: true }); break;
      case "edit-char": openCharacterEditor(t.dataset.id); break;
      case "open-chronicle": openChronicle(); break;
      case "story-menu": openStoryMenu(); break;
      case "open-settings": openSettings(); break;
      case "import-all": nhapTatCa(); break;
      case "export-all": await xuatTatCa(); break;
      case "new-conv": openConvEditor(null, { chuongId: t.dataset.chuong }); break;
      case "open-conv": await openConv(t.dataset.id); break;
      case "edit-conv": if (conv) openConvEditor(conv.id); break;
      case "delete-conv": if (conv) xoaHoiThoai(conv.id); break;
      case "chronicle-from-conv": chronicleFromConv(); break;
      case "new-chapter": openChapterEditor(null, true); break;
      case "edit-chapter": openChapterEditor(t.dataset.id, false); break;
      case "end-chapter": endChapter(t.dataset.id); break;
      case "open-chapter": openChapterEditor(t.dataset.id, false); break;
      case "send": await onSend(); break;
      case "stop": await stopStreaming(); break;
      case "continue-ai": onContinueAi(); break;
      case "suggest": onSuggest(); break;
      case "opening": onOpening(); break;
      case "set-responder":
        app.responder = t.dataset.id;
        $$(".responder-row .chip").forEach((c) => c.classList.toggle("on", c === t));
        break;
      case "use-suggestion": {
        // Chỉ ĐIỀN vào ô nhập — không gửi, không ghi tin nhắn, không đóng khối gợi ý.
        const i = Number(t.dataset.i);
        app.draft = app.suggestions[i] || "";
        const ta = $("#composerInput");
        if (ta) { ta.value = app.draft; ta.focus(); autoGrow(ta); }
        // Highlight chỉ thể hiện gợi ý được chọn GẦN NHẤT; sửa bản nháp không làm mất nó.
        app.suggChon = i;
        $$(".goi-y-card").forEach((c) => {
          const on = Number(c.dataset.i) === i;
          c.classList.toggle("on", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        break;
      }
      case "copy-msg": {
        const msgs = getMessages(app.convId);
        const m = msgs.find((x) => x.id === t.dataset.mid);
        if (m) { navigator.clipboard.writeText(m.noiDung); toast("Đã sao chép."); }
        break;
      }
      case "edit-msg": app.editingMsgId = t.dataset.mid; render(); break;
      case "cancel-edit": app.editingMsgId = null; render(); break;
      case "save-edit": {
        const box = t.closest(".msg-edit");
        const ta = box ? box.querySelector("textarea") : null;
        const msgs = getMessages(app.convId);
        const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
        const m = idx >= 0 ? msgs[idx] : null;
        if (m && ta) {
          if (!(await hoiVoHieuCanh(story, conv, msgs, idx, "Sửa tin nhắn này"))) { app.editingMsgId = null; render(); break; }
          // Sửa tin nhắn đụng CẢ HAI khoá: bản ghi tin nhắn và bản ghi truyện (cảnh đã khép
          // bị vô hiệu + bản tóm tắt cũ bị bỏ). Hỏng ở bước nào cũng phải trả về nguyên
          // trạng — không được để mất chữ cũ mà trạng thái truyện chưa đổi.
          const kq = await giaoDichApp([["cotTruyen", story.id], ["tinNhan", app.convId]], async () => {
            m.noiDung = ta.value.trim();
            m.sua = true;
            // Sửa tin nhắn nằm trong vùng đã tóm tắt → bản tóm tắt đó không còn đúng.
            const boTomTat = voHieuTomTat(conv, idx);
            const soCanhHuy = voHieuCanhTuDiem(story, conv, msgs, idx);
            capNhatConv(conv, msgs);
            await persistMessages(app.convId);
            await ghiCotTruyen(story);
            return { boTomTat, soCanhHuy };
          }, "sửa tin nhắn");
          if (!kq.ok) {
            // Giữ hộp sửa MỞ và giữ đúng chữ vừa gõ: giao dịch đã trả nội dung cũ về, người
            // dùng không phải gõ lại. Giao diện chỉ đóng khi lưu thành công.
            const chuDangGo = ta.value;
            render();
            const nut2 = document.querySelector('[data-act="save-edit"][data-mid="' + m.id + '"]');
            const inp = nut2 && nut2.closest(".msg-edit") ? nut2.closest(".msg-edit").querySelector("textarea") : null;
            if (inp) inp.value = chuDangGo;
            break;
          }
          const boTomTat = kq.kq.boTomTat;
          const soCanhHuy = kq.kq.soCanhHuy;
          if (soCanhHuy) toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
          if (boTomTat) {
            toast("Tin nhắn này đã nằm trong phần tóm tắt cũ — bản tóm tắt đã được bỏ để AI không nhớ sai.");
            maybeCompact(story, conv);
          }
        }
        app.editingMsgId = null;
        render();
        break;
      }
      case "del-msg": {
        const msgs = getMessages(app.convId);
        const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
        if (idx >= 0) {
          if (!(await hoiVoHieuCanh(story, conv, msgs, idx, "Xoá tin nhắn này"))) break;
          const bo = msgs[idx];
          // Xoá tin nhắn đụng ba khoá: tin nhắn, bản ghi truyện (cảnh đã khép + sổ hé lộ) và
          // ẢNH riêng của tin nhắn đó (nếu có) — phải là một giao dịch, kẻo ảnh mất mà
          // trạng thái truyện chưa đổi.
          const ds = [["cotTruyen", story.id], ["tinNhan", app.convId]];
          if (bo.anhId) ds.push(["thuVienAnh", bo.anhId]);
          const kq = await giaoDichApp(ds, async () => {
            const boTomTat = voHieuTomTat(conv, idx);
            msgs.splice(idx, 1);
            if (bo.anhId) await xoaAnh(story, bo.anhId);
            const soCanhHuy = voHieuCanhTuDiem(story, conv, msgs, idx);
            capNhatConv(conv, msgs);
            // Tin nhắn vừa bị xoá có thể là NGUỒN của một lần hé lộ — tính lại "ai biết gì".
            tinhLaiBiet(story, { [app.convId]: msgs });
            await persistMessages(app.convId);
            await ghiCotTruyen(story);
            return { boTomTat, soCanhHuy };
          }, "xoá tin nhắn");
          if (!kq.ok) { render(); break; }
          const boTomTat = kq.kq.boTomTat;
          const soCanhHuy = kq.kq.soCanhHuy;
          if (soCanhHuy) toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
          if (boTomTat) {
            toast("Tin nhắn này đã nằm trong phần tóm tắt cũ — bản tóm tắt đã được bỏ.");
            maybeCompact(story, conv);
          }
          render();
        }
        break;
      }
      case "thu-lai-loi": {
        app.loiTam = [];
        render();
        const s2 = currentStory();
        const c2 = currentConv();
        if (s2 && c2) await generateTurn(s2, c2, { auto: true });
        break;
      }
      case "bo-loi": {
        app.loiTam.splice(Number(t.dataset.i) || 0, 1);
        render();
        break;
      }
      case "tao-anh": openTaoAnh({}); break;
      case "tao-anh-msg": {
        const msgs = getMessages(app.convId);
        const mm = msgs.find((x) => x.id === t.dataset.mid);
        openTaoAnh({ tinNhan: mm ? mm.noiDung : "", sauMsgId: t.dataset.mid });
        break;
      }
      case "anh-xem": await moXemAnh(t.dataset.mid); break;
      case "anh-tai": await taiAnhTuMsg(t.dataset.mid); break;
      case "anh-lai": await openTaoAnh({ suaMsgId: t.dataset.mid }); break;
      case "open-anh-lib":
        if (t.dataset.id && story) await moXemAnhId(story, t.dataset.id, "");
        else moThuVienAnh();
        break;
      case "regen-msg": {
        const msgs = getMessages(app.convId);
        const idx = msgs.findIndex((x) => x.id === t.dataset.mid);
        if (idx < 0) break;
        const old = msgs[idx];
        const nvts = nvtsCuaTin(story, old);
        if (!nvts.length) { toast("Không xác định được nhân vật.", "error"); break; }
        if (msgs.length - 1 - idx > 0) {
          moVietLaiTinGiua(story, conv, idx, nvts);
          break;
        }
        await vietLaiTinCuoi(story, conv, idx, nvts);
        break;
      }
      case "khep-canh": await openKhepCanh(); break;
      case "open-dao-dien": openDaoDien(); break;
      case "dung-moc": {
        const cuoi = conv ? TS.canhCuoi(story, conv) : null;
        if (cuoi && cuoi.moc) {
          const ta = $("#composerInput");
          app.draft = (app.draft ? app.draft + "\n" : "") + cuoi.moc;
          if (ta) { ta.value = app.draft; ta.focus(); autoGrow(ta); }
          toast("Đã chèn móc cảnh vào ô nhập — sửa rồi gửi nếu muốn.");
        }
        break;
      }
      case "open-hien-dien": openHienDien(); break;
      case "chon-canh-rieng": openChonCanhRieng(); break;
      case "dong-canh-rieng": { if (conv) await dongCanhRieng(story, conv); break; }
      case "facts-msg": factsFromMessage(t.dataset.mid); break;
      case "open-giao-keo": openGiaoKeo(); break;
      case "open-lorebook": openLorebook(); break;
      case "safeword": await tinHieuCanh("safeword"); break;
      case "aftercare": await tinHieuCanh("aftercare"); break;
      case "thuong-luong": await tinHieuCanh("thuongLuong"); break;
      case "set-mucdo": await doiMucDo(t.dataset.so); break;
      case "vg-thu-lai": if (story) await thuLaiVangMat(story); break;
      case "vg-bo-qua": if (story) await boQuaVangMat(story); break;
      case "vg-mo-nhip":
        app.nhipMo[t.dataset.ht] = !app.nhipMo[t.dataset.ht];
        render();
        break;
      case "vg-dong-nhip":
        app.dongNhip[t.dataset.ht] = true;
        render();
        break;
      case "vg-mo-ht":
        if (t.dataset.ht) await openConv(t.dataset.ht);
        break;
    }
  });

  // ---- Mốc hoạt động & mốc rời app cho tính năng thời gian vắng mặt.
  // Perchance không chạy khi tab đóng: đây là cách duy nhất để biết "đã vắng bao lâu".
  const cham = () => {
    const s = currentStory();
    if (s) ghiMocHoatDong(s, false);
  };
  document.addEventListener("pointerdown", cham);
  document.addEventListener("keydown", cham);
  document.addEventListener("visibilitychange", () => {
    const s = currentStory();
    if (!s) return;
    if (document.visibilityState === "hidden") {
      app.daKiemTraVg = "";
      ghiMocHoatDong(s, true);
      return;
    }
    ghiNhanVangMat(s);
    render();
    kiemTraVangMat(s);
  });
  window.addEventListener("pagehide", () => {
    const s = currentStory();
    if (!s) return;
    app.daKiemTraVg = "";
    ghiMocHoatDong(s, true);
  });
}

// Viết lại ngay tại chỗ, dùng đúng lịch sử phía trước (một nhân vật hoặc cả một
// đoạn cảnh nhóm — tuỳ tin nhắn gốc).
async function sinhLaiVaoLichSu(story, conv, nvts, history) {
  if (!nvts.length) return null;
  if (nvts.length > 1) return await streamGroupReply(story, conv, nvts, { history });
  return await streamOneReply(story, conv, nvts[0], { history });
}

// Viết lại tin nhắn cuối cùng — không làm lệch thứ tự hội thoại.
async function vietLaiTinCuoi(story, conv, idx, nvts) {
  const msgs = getMessages(conv.id);
  if (!(await hoiVoHieuCanh(story, conv, msgs, idx, "Viết lại tin nhắn này"))) return;
  const history = msgs.slice(0, idx);
  const bo = msgs[idx];
  const boTomTat = voHieuTomTat(conv, idx);
  msgs.splice(idx, 1);
  const ok = await luuTinNhan(conv.id, () => {
    msgs.splice(idx, 0, bo);
    if (boTomTat) { conv.tomTat = ""; conv.tomTatDen = 0; }
  });
  if (!ok) return;
  const soCanhHuy = voHieuCanhTuDiem(story, conv, msgs, idx);
  if (soCanhHuy) {
    await luuTinNhan(conv.id);
    capNhatConv(conv, msgs);
    toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
  }
  // Tin nhắn cũ bị thay bằng một tin nhắn MỚI (id khác): mọi lần hé lộ lấy tin nhắn cũ
  // làm nguồn không còn hiệu lực nữa, trừ khi lượt viết lại tự hé lộ lại.
  tinhLaiBiet(story, { [conv.id]: msgs });
  batDauLuot();
  render();
  await sinhLaiVaoLichSu(story, conv, nvts, history);
  ketThucLuot();
  await luuTruyen(story);
  render();
}

// Tin nhắn nằm giữa hội thoại: viết lại sẽ làm lệch phần sau, nên phải chọn giữa
// "tạo nhánh mới" (an toàn) và "cắt rồi viết lại" (mất phần sau).
function moVietLaiTinGiua(story, conv, idx, nvts) {
  const msgs = getMessages(conv.id);
  const soSau = msgs.length - 1 - idx;
  const body = el("div");
  body.innerHTML =
    '<div class="confirm-text">' +
      esc("Đây là tin nhắn ở giữa hội thoại (" + (idx + 1) + "/" + msgs.length + "). Viết lại nó sẽ làm lệch toàn bộ phần sau, nên hãy chọn một trong hai cách:") +
    "</div>" +
    '<ul class="hint-list">' +
      "<li><b>Tạo nhánh mới</b> — giữ nguyên hội thoại hiện tại, mở một hội thoại mới chứa " + idx + " tin nhắn trước đó rồi viết lại ở đó. Bản cũ không mất.</li>" +
      "<li><b>Cắt và viết lại</b> — xoá " + soSau + " tin nhắn phía sau rồi viết lại từ đây. Không thể hoàn tác.</li>" +
      (demCanhAnhHuong(story, conv, msgs, idx)
        ? "<li><b>Cảnh đã khép</b> — " + demCanhAnhHuong(story, conv, msgs, idx) + " cảnh đã duyệt nằm ở hoặc sau điểm này. Cắt sẽ vô hiệu và hoàn tác chúng; tạo nhánh chỉ mang theo những cảnh nằm trọn trước điểm rẽ.</li>"
        : "") +
    "</ul>";
  modal({
    title: "Viết lại tin nhắn ở giữa",
    subtitle: nvts.map((c) => c.ten).join(" · "),
    body,
    actions: [
      { label: "Huỷ", onClick: (m) => m.close() },
      { label: "Cắt và viết lại", danger: true, onClick: (m) => { m.close(); catVaLuuLai(story, conv, idx, nvts); } },
      { label: "Tạo nhánh mới", primary: true, onClick: (m) => { m.close(); taoNhanhVaLuuLai(story, conv, idx, nvts); } },
    ],
  });
}

async function catVaLuuLai(story, conv, idx, nvts) {
  const msgs = getMessages(conv.id);
  if (!(await hoiVoHieuCanh(story, conv, msgs, idx, "Cắt phần sau từ tin nhắn này"))) return;
  const boTomTat = voHieuTomTat(conv, idx);
  const tien = msgs.slice(0, idx);
  let soCanhHuy = 0;
  // Cắt lịch sử đụng cả tin nhắn lẫn bản ghi truyện (cảnh đã khép bị vô hiệu) — phải là
  // một giao dịch, nếu không ta có thể mất phần đuôi mà chưa kịp hoàn tác trạng thái.
  const kq = await giaoDichApp([["cotTruyen", story.id], ["tinNhan", conv.id]], async () => {
    msgs.splice(idx);
    soCanhHuy = voHieuCanhTuDiem(story, conv, msgs, idx);
    // Phần vừa cắt có thể chứa NGUỒN của một lần hé lộ — tính lại "ai biết gì".
    tinhLaiBiet(story, { [conv.id]: msgs });
    capNhatConv(conv, msgs);
    await persistMessages(conv.id);
    await ghiCotTruyen(story);
  }, "cắt lịch sử");
  if (!kq.ok) { render(); return; }
  if (soCanhHuy) {
    toast("Đã vô hiệu " + soCanhHuy + " cảnh đã khép bị ảnh hưởng — đã hoàn tác quan hệ/ký ức sinh ra từ đó.");
  }
  batDauLuot();
  render();
  await sinhLaiVaoLichSu(story, conv, nvts, tien.slice());
  ketThucLuot();
  await luuTruyen(story);
  render();
}

async function taoNhanhVaLuuLai(story, conv, idx, nvts) {
  const goc = getMessages(conv.id);
  const tien = goc.slice(0, idx);
  const doiId = {};
  const saoChep = (m) => {
    const x = makeMessage(m.vai, m.noiDung, {
      ten: m.ten, nvId: m.nvId, nvIds: m.nvIds ? m.nvIds.slice() : undefined,
      rieng: m.rieng, anhId: m.anhId, chuThich: m.chuThich, sua: m.sua, daDung: m.daDung,
      khep: m.khep,
    });
    for (const k in x) if (x[k] === undefined) delete x[k];
    x.luc = m.luc || Date.now();
    doiId[m.id] = x.id;
    return x;
  };
  const ban = tien.map(saoChep);
  const gocTen = conv.tieuDe || "Hội thoại";
  // Thời điểm điểm rẽ: sự kiện vắng mặt xảy ra SAU mốc này không thuộc về nhánh.
  const diemLuc = tien.length ? Number(tien[tien.length - 1].luc) || 0 : 0;
  const soNhanh = story.hoiThoais.filter((c) => (c.tieuDe || "").indexOf(gocTen + " · nhánh") === 0).length + 1;
  const moi = newConversation({
    tieuDe: gocTen + " · nhánh " + soNhanh,
    chuongId: conv.chuongId,
    nhanVatIds: (conv.nhanVatIds || []).slice(),
    // Giữ nguyên ngữ nghĩa: hội thoại chưa từng ghi `hienDien` thì nhánh cũng vậy
    // (dùng danh sách mặc định), còn mảng rỗng thì giữ đúng là rỗng.
    ...(Array.isArray(conv.hienDien) ? { hienDien: conv.hienDien.slice() } : {}),
    daCoCanhRieng: !!conv.daCoCanhRieng,
    goiY: conv.goiY || "",
    tomTat: conv.tomTat || "",
    tomTatDen: Math.min(conv.tomTatDen || 0, tien.length),
    // Phần chưa khép của nhánh bắt đầu đúng từ điểm rẽ: không phân tích lại đoạn
    // đã khép của hội thoại gốc.
    khepGoc: idx,
    // Thời điểm điểm rẽ — xem cách dùng ở src/trangThai.js (lọc sự kiện vắng mặt).
    vgMocLuc: diemLuc,
  });
  // Chỉ mang theo những cảnh NẰM TRỌN trước điểm rẽ (bản sao, id tin nhắn đã đổi),
  // nên nhánh không thừa hưởng delta nào từ tương lai của nhánh cũ.
  const canhGoc = TS.canhHopLe(story).filter((c) => (Array.isArray(c.htIds) && c.htIds.length ? c.htIds : [c.htId]).indexOf(conv.id) >= 0);
  const doiCanh = {};
  for (const c of canhGoc) {
    const iDen = TS.timIdx(goc, c.denMsgId);
    if (iDen < 0 || iDen >= idx) continue;
    const b = JSON.parse(JSON.stringify(c));
    b.id = TS.ma("canh");
    b.htId = moi.id;
    b.htIds = [moi.id];
    b.tuMsgId = doiId[c.tuMsgId] || "";
    b.denMsgId = doiId[c.denMsgId] || "";
    doiCanh[c.id] = b.id;
    story.canhDaKhep = (story.canhDaKhep || []).concat([b]);
  }
  for (const m of ban) if (m.khep && doiCanh[m.khep]) m.khep = doiCanh[m.khep];
  // Sự kiện vắng mặt — hai luật khác nhau cho hai loại:
  //   • Sự kiện TOÀN TRUYỆN (`htId === ""`) chỉ có MỘT bản chuẩn trong sổ của truyện.
  //     Sao chép nó thành bản thứ hai là nhân đôi tác động cho MỌI hội thoại (xem
  //     `tinhTrangThai`). Nhánh không cần bản sao — nó cần LỚP HÉ LỘ riêng, vật chất
  //     hoá ngay trên hội thoại nhánh (`moi.vgHeLo`) từ sổ hiệu lực của hội thoại cha.
  //     Lần hé lộ nhờ một tin nhắn nằm sau điểm rẽ thì không đi theo nhánh.
  //   • Sự kiện GẮN HỘI THOẠI thì đi theo nhánh (bản sao, ID mới) — nhưng chỉ khi sự
  //     kiện nằm trọn trước điểm rẽ; sự kiện của tương lai ở lại bản gốc.
  const vgHeLo = [];
  for (const e of suKienCua(story)) {
    if (e.htId) continue;
    for (const r of nguonHieuLuc(story, conv, e)) {
      if (r.htId === conv.id) {
        if (!doiId[r.tnId]) continue;
        vgHeLo.push({ vgId: e.id, htId: moi.id, tnId: doiId[r.tnId], nvId: r.nvId, luc: r.luc });
      } else {
        vgHeLo.push({ vgId: e.id, htId: r.htId, tnId: r.tnId, nvId: r.nvId, luc: r.luc });
      }
    }
  }
  moi.vgHeLo = chuanHoaVgHeLo(vgHeLo, story);
  const doiSuKien = {};
  for (const e of suKienCua(story)) {
    if (e.htId !== conv.id) continue;
    const trong = (e.tnIds || []).length
      ? (e.tnIds || []).every((id) => doiId[id])
      : (Number(e.luc) || 0) <= diemLuc;
    if (!trong) continue;
    const b = JSON.parse(JSON.stringify(e));
    b.id = TS.ma("vge");
    b.htId = moi.id;
    b.tnIds = (e.tnIds || []).map((id) => doiId[id]).filter(Boolean);
    // Sổ hé lộ đi theo TIN NHẮN: lần hé lộ xảy ra trong hội thoại đang tách nhánh chỉ
    // sang nhánh nếu tin nhắn nguồn cũng được mang sang; hé lộ ở hội thoại khác (nhánh
    // dùng chung hội thoại đó với bản gốc) thì giữ nguyên.
    b.heLo = (e.heLo || [])
      .filter((r) => r.htId !== conv.id || doiId[r.tnId])
      .map((r) => (r.htId === conv.id
        ? { htId: moi.id, tnId: doiId[r.tnId], nvId: r.nvId, luc: r.luc }
        : { htId: r.htId, tnId: r.tnId, nvId: r.nvId, luc: r.luc }));
    doiSuKien[e.id] = b.id;
    story.ngoaiManHinh = (story.ngoaiManHinh || []).concat([b]);
  }
  for (const m of ban) if (m.vangMat && doiSuKien[m.vangMat]) m.vangMat = doiSuKien[m.vangMat];
  // Tiến độ Đạo diễn: mỗi mục tiến độ gắn với hội thoại đã khép cảnh đó, nên nhánh chỉ
  // được sao chép những bước xảy ra TRƯỚC điểm rẽ (cảnh của chúng đã sang nhánh). Tiến
  // độ tương lai của nhánh cũ KHÔNG đi theo.
  for (const h of daoDienOf(story).huong) {
    const cu = Array.isArray(h.tienDo) ? h.tienDo : [];
    const them = [];
    for (const e of cu) {
      if (!e || (e.htId && e.htId !== conv.id)) continue;
      const canhMoi = e.canhId ? doiCanh[e.canhId] : "";
      if (e.canhId && !canhMoi) continue;
      them.push(TS.taoTienDo({ htId: moi.id, canhId: canhMoi || "", trangThai: e.trangThai, bangChung: e.bangChung, buocTiep: e.buocTiep }));
    }
    if (them.length) h.tienDo = cu.concat(them);
  }
  // Tính lại "ai biết gì" theo đúng bộ tin nhắn của nhánh (hé lộ bị bỏ lại phía sau
  // điểm rẽ thì sự kiện trở về mức gốc trong nhánh này).
  tinhLaiBiet(story, { [moi.id]: ban });
  capNhatConv(moi, ban);
  story.hoiThoais.push(moi);
  // Tin nhắn của nhánh và bản ghi truyện phải cùng thành công: bản ghi hỏng mà tin nhắn
  // đã ghi thì sẽ còn lại một khoá tin nhắn MỒ CÔI (không hội thoại nào trỏ tới).
  const kqNhanh = await giaoDichApp([["cotTruyen", story.id], ["tinNhan", moi.id]], async () => {
    await replaceMessages(moi.id, ban);
    await ghiCotTruyen(story);
  }, "nhánh hội thoại");
  if (!kqNhanh.ok) { render(); return; }
  toast("Đã tạo nhánh mới và giữ nguyên bản cũ.");
  await openConv(moi.id);
  batDauLuot();
  render();
  await sinhLaiVaoLichSu(story, moi, nvts, ban);
  ketThucLuot();
  await luuTruyen(story);
  render();
}


// ==========================================================================
//  THỜI GIAN VẮNG MẶT & TƯƠNG TÁC CHỦ ĐỘNG
//
//  RÀNG BUỘC NỀN TẢNG: Perchance không chạy khi tab đã đóng. Toàn bộ phần dưới đây
//  chỉ chạy LÚC NGƯỜI DÙNG QUAY LẠI. Mốc "vừa rời app" được ghi bằng
//  visibilitychange/pagehide; mỗi lần mở truyện ta so mốc đó với hiện tại để biết đã
//  vắng bao lâu. Không có thông báo đẩy, không có gì chạy nền.
//
//  Ba tầng chặn, theo thứ tự:
//    1. chế độ Tạm dừng, hoặc ngưỡng = 0        → không làm gì;
//    2. chưa đủ ngưỡng phút                     → không làm gì;
//    3. còn CẢNH ĐANG MỞ ở bất kỳ hội thoại nào → không mô phỏng, chỉ hiện "Nhịp trước đó".
//  Cả ba nằm trong `xetDieuKien()` (src/thoiGian.js) để chỉ có một nguồn sự thật.
//
//  Chống trùng: phiên vắng mặt lưu `batDau`/`ketThuc`/`trangThai`; mốc `daXuLyLuc` chỉ
//  được ghi SAU khi toàn bộ sự kiện + tin nhắn ghi thành công. Ghi hỏng thì trả về
//  nguyên trạng và giữ phiên ở trạng thái "cần thử lại".
// ==========================================================================

function tenNvg(story, id) {
  if (id === TS.ID_NGUOI) return layNguoiChoi(story);
  const c = charById(story, id);
  return c ? c.ten : "";
}
function tenDsNv(story, ids) {
  return (ids || []).map((id) => tenNvg(story, id)).filter(Boolean).join(" · ");
}

// Đọc tin nhắn của MỌI hội thoại, không chỉ hội thoại đang mở: điều kiện "cảnh đang
// mở" phải xét cả truyện, nếu không ta sẽ mô phỏng vượt qua một mạch cảm xúc còn dang
// dở ở hội thoại khác. Đọc hỏng thì trả null và KHÔNG mô phỏng gì (thà bỏ lỡ một lần
// còn hơn đi tiếp trên dữ liệu khuyết).
async function taiTinNhanTatCa(story) {
  const map = {};
  for (const c of story.hoiThoais || []) {
    try {
      map[c.id] = await loadMessages(c.id);
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return map;
}

function convHoatDongNhat(story, map) {
  let chon = null;
  for (const c of story.hoiThoais || []) {
    if (!(map[c.id] || []).length) continue;
    if (!chon || (c.suaLuc || 0) > (chon.suaLuc || 0)) chon = c;
  }
  return chon || (story.hoiThoais || [])[0] || null;
}

// Chụp khoảng vắng mặt NGAY LÚC QUAY LẠI, TRƯỚC khi mốc hoạt động bị đẩy lên hiện tại.
// Không ghi xuống kv ở đây: nếu phiên chạy hỏng giữa chừng, mốc cũ còn nguyên thì lần
// mở sau vẫn còn cơ hội xử lý.
function ghiNhanVangMat(story) {
  const tg = thoiGianOf(story);
  const nay = Date.now();
  const batDau = Number(tg.hoatDongLuc) || 0;
  if (batDau && batDau < nay) {
    app.vangMat = { batDau, ketThuc: nay, phut: Math.floor((nay - batDau) / 60000) };
    app.dongNhip = {};
    app.nhipMo = {};
    app.vangMatDuNguong = !!(tg.cheDo !== "tamDung" && tg.nguongPhut > 0 && app.vangMat.phut >= tg.nguongPhut);
  } else {
    app.vangMat = null;
    app.vangMatDuNguong = false;
  }
  if (nay > tg.hoatDongLuc) tg.hoatDongLuc = nay;
  app.daKiemTraVg = story.id;
  return app.vangMat;
}

// Mốc hoạt động: cập nhật trong bộ nhớ mỗi lần người dùng thật sự tương tác, nhưng chỉ
// ghi xuống kv tối đa một lần mỗi phút. `buoc = true` ghi ngay — dùng khi tab bị ẩn
// hoặc đóng, vì đó CHÍNH LÀ mốc "rời app".
async function ghiMocHoatDong(story, buoc = false) {
  if (!story) return;
  const tg = thoiGianOf(story);
  const nay = Date.now();
  if (nay <= tg.hoatDongLuc) return;
  // Trước khi khoảng vắng mặt được chụp (lúc mở truyện / lúc tab hiện lại), một cú chạm
  // chuột không được phép đẩy mốc lên — nếu không thì chính cái chạm đầu tiên khi quay
  // lại sẽ xoá mất khoảng vắng mặt vừa rồi.
  if (!buoc && app.daKiemTraVg !== story.id) return;
  tg.hoatDongLuc = nay;
  if (!buoc && nay - app.ghiMocLuc < 60000) return;
  app.ghiMocLuc = nay;
  await luuMoC(story);
}

// Quyết định có mô phỏng hay không, rồi chạy. Đây là điểm vào duy nhất từ luồng UI.
async function kiemTraVangMat(story) {
  if (!story || app.vangMatDangXet) return;
  const tg = thoiGianOf(story);
  // Phiên bị bỏ dở (tab đóng giữa lúc gọi AI) không được kẹt ở "đang xử lý" mãi.
  if (tg.phien && tg.phien.trangThai === "dangXuLy") tg.phien.trangThai = "thuLai";
  if (tg.cheDo === "tamDung" || !(tg.nguongPhut > 0)) return;

  const map = await taiTinNhanTatCa(story);
  if (!map) return;

  const cho = tg.phien && tg.phien.trangThai === "thuLai" ? tg.phien : null;
  const moc = cho && cho.batDau ? cho.batDau : (app.vangMat ? app.vangMat.batDau : 0);
  // Xét điều kiện trên ĐÚNG khoảng vắng mặt đang chờ (nếu có), không phải trên mốc hoạt
  // động mới nhất — nếu không, một phiên hỏng sẽ bị "trôi" mất khoảng thời gian của nó.
  const giuPhien = tg.phien;
  const giuDa = tg.daXuLyLuc;
  tg.phien = null;
  // CHỈ bỏ qua mốc "đã xử lý" khi đang thử lại một phiên cũ chưa ghi gì. Với đường
  // thường, mốc này phải được tôn trọng — nếu không, cùng một khoảng vắng mặt sẽ bị
  // mô phỏng lần thứ hai.
  if (cho) tg.daXuLyLuc = 0;
  let xet;
  try {
    xet = xetDieuKien(story, Date.now(), map, moc);
  } finally {
    tg.phien = giuPhien;
    tg.daXuLyLuc = giuDa;
  }

  const phutXet = xet.phut || (app.vangMat ? app.vangMat.phut : 0);
  if (phutXet >= tg.nguongPhut) {
    app.vangMatDuNguong = true;
    // Thẻ "Nhịp trước đó" thuộc về hội thoại đang dang dở — hoặc hội thoại vừa dùng.
    const ht = xet.thua ? xet.thua.conv : convHoatDongNhat(story, map);
    app.nhipConvId = (ht && ht.id) || "";
  }

  if (!xet.ok) {
    if (cho && xet.lyDo !== "canhDangMo" && xet.lyDo !== "dangChay") {
      // Phiên cũ không còn hợp lệ (ngưỡng đổi, dữ liệu đổi…) — bỏ để không kẹt ở "thử lại".
      tg.phien = null;
      await luuMoC(story);
    }
    render();
    return;
  }
  await chayPhienVangMat(story, xet, map, cho);
}

async function chayPhienVangMat(story, xet, map, cho) {
  if (app.vangMatDangXet) return;
  const tg = thoiGianOf(story);
  const cung = !!(cho && cho.trangThai === "thuLai" && cho.batDau === xet.batDau);
  const phien = cung
    ? Object.assign(cho, { ketThuc: xet.ketThuc, phut: xet.phut, cheDo: xet.cheDo })
    : {
        id: maPhien(),
        batDau: xet.batDau,
        ketThuc: xet.ketThuc,
        phut: xet.phut,
        cheDo: xet.cheDo,
        trangThai: "dangXuLy",
        soSuKien: 0,
        luc: Date.now(),
        loiNhan: "",
      };

  // Chốt chống trùng: nếu sổ đã có sự kiện của CHÍNH phiên này thì lần ghi trước đã
  // thành công (app bị đóng sau khi ghi, trước khi kịp lưu trạng thái) — chỉ hoàn tất
  // trạng thái, tuyệt đối không gọi AI và không ghi thêm.
  const daGhi = suKienCua(story).filter((e) => e.phienId && e.phienId === phien.id);
  if (daGhi.length || phien.trangThai === "xong") {
    await ketThucPhien(story, phien, daGhi.length, tg);
    return;
  }

  app.vangMatDangXet = true;
  app.loiVangMat = null;
  app.trangThaiVangMat = "Đang xem điều gì đã xảy ra…";
  phien.trangThai = "dangXuLy";
  phien.loiNhan = "";
  phien.soSuKien = 0;
  phien.luc = Date.now();
  tg.phien = phien;
  render();
  await luuMoC(story); // ghi "đang xử lý" TRƯỚC khi gọi AI

  let suKien = [];
  let loi = null;
  try {
    const res = await AI.lapKeHoachVangMat({
      story,
      conv: convHoatDongNhat(story, map),
      msgsByHt: map,
      batDau: xet.batDau,
      ketThuc: xet.ketThuc,
      phut: xet.phut,
      cheDo: xet.cheDo,
      soToiDa: xet.soToiDa,
      chuDong: xet.chuDong,
    });
    suKien = AI.docKeHoachVangMat(res.text, {
      story,
      batDau: xet.batDau,
      ketThuc: xet.ketThuc,
      phut: xet.phut,
      soToiDa: xet.soToiDa,
      cheDo: xet.cheDo,
      phienId: phien.id,
    }).suKien;
    // Tương tác chủ động đang tắt: chỉ giữ sự kiện ngoài màn hình, không ai được chủ
    // động liên lạc hay để lại dấu hiệu cho người chơi.
    if (!xet.chuDong) suKien = suKien.filter((e) => e.loai === "ngoaiManHinh" && !e.htId);
    suKien = suKien.slice(0, Math.max(1, Number(xet.soToiDa) || TOI_DA_SU_KIEN));
  } catch (e) {
    console.error(e);
    loi = e;
  }

  if (loi) {
    app.vangMatDangXet = false;
    app.trangThaiVangMat = "";
    phien.trangThai = "thuLai";
    phien.loiNhan = String((loi && loi.message) || "lỗi không rõ").slice(0, 200);
    phien.luc = Date.now();
    tg.phien = phien;
    app.loiVangMat = { phien: phien.id, thongDiep: phien.loiNhan };
    await luuMoC(story);
    render();
    return;
  }

  try {
    await luuPhienVangMat(story, phien, suKien, map);
  } catch (e) {
    console.error(e);
    app.vangMatDangXet = false;
    app.trangThaiVangMat = "";
    phien.trangThai = "thuLai";
    phien.loiNhan = String((e && e.message) || "không ghi được").slice(0, 200);
    phien.luc = Date.now();
    tg.phien = phien;
    app.loiVangMat = { phien: phien.id, thongDiep: phien.loiNhan };
    await luuMoC(story);
    render();
    return;
  }

  const xongPhien = await ketThucPhien(story, phien, suKien.length, tg);
  if (xongPhien && suKien.length) toast("Trong lúc bạn vắng mặt có " + suKien.length + " diễn biến mới.");
}

// Ghi sổ sự kiện + tin nhắn nhìn thấy được, TẤT CẢ hoặc KHÔNG GÌ. Chụp trước mọi thứ
// sẽ đụng tới; hỏng ở bất kỳ bước nào thì trả về nguyên trạng rồi ném lỗi để phiên
// được giữ ở trạng thái thử lại.
async function luuPhienVangMat(story, phien, suKien, map) {
  const tg = thoiGianOf(story);
  const truoc = {
    suKien: JSON.parse(JSON.stringify(story.ngoaiManHinh || [])),
    thoiGian: JSON.stringify(tg),
    suaLuc: story.suaLuc,
    msgs: {},
  };
  const them = {};
  for (const e of suKien) {
    if (!e.htId) continue; // sự kiện ngoài màn hình: chỉ nằm trong sổ, không thành tin nhắn
    const nvts = (e.thamGia || []).map((id) => charById(story, id)).filter(Boolean);
    const extra = { ten: tenDsNv(story, e.thamGia) || "Người kể chuyện", luc: e.luc, vangMat: e.id, vangMatPhien: e.phienId };
    if (nvts.length) {
      extra.nvId = nvts[0].id;
      extra.nvIds = nvts.map((c) => c.id);
    }
    const m = makeMessage("ai", e.noiDung, extra);
    e.tnIds = [m.id];
    (them[e.htId] || (them[e.htId] = [])).push(m);
  }
  for (const id in them) truoc.msgs[id] = (map[id] || getMessages(id)).slice();
  try {
    for (const id in them) {
      await replaceMessages(id, (map[id] || getMessages(id)).concat(them[id]));
    }
    story.ngoaiManHinh = (story.ngoaiManHinh || []).concat(suKien);
    suKienCua(story);
    if (!(await luuTruyen(story, "diễn biến lúc bạn vắng mặt"))) throw new Error("Không ghi được cốt truyện.");
  } catch (e) {
    for (const id in truoc.msgs) {
      try {
        await replaceMessages(id, truoc.msgs[id]);
      } catch (x) {
        console.error(x);
      }
    }
    story.ngoaiManHinh = truoc.suKien;
    story.suaLuc = truoc.suaLuc;
    Object.assign(tg, JSON.parse(truoc.thoiGian));
    throw e;
  }
}

// Đóng phiên: mốc hoạt động = mốc đã xử lý = thời điểm quay lại. Nhờ vậy cùng một
// khoảng vắng mặt không bao giờ được mô phỏng hai lần, và khoảng vắng tiếp theo được
// tính từ lúc này. Trả về `true` khi mốc đã được GHI xuống đĩa; ghi hỏng thì phiên phải
// quay về "thử lại" — không được coi khoảng vắng mặt này đã xử lý xong.
async function ketThucPhien(story, phien, soSuKien, tg) {
  const t = tg || thoiGianOf(story);
  const truoc = {
    trangThai: phien.trangThai,
    soSuKien: phien.soSuKien,
    loiNhan: phien.loiNhan,
    luc: phien.luc,
    phien: t.phien,
    hoatDongLuc: t.hoatDongLuc,
    daXuLyLuc: t.daXuLyLuc,
    ghiMocLuc: app.ghiMocLuc,
    loiVangMat: app.loiVangMat,
  };
  phien.trangThai = "xong";
  phien.soSuKien = Math.max(0, Number(soSuKien) || 0);
  phien.loiNhan = "";
  phien.luc = Date.now();
  t.phien = phien;
  t.hoatDongLuc = Math.max(Number(t.daXuLyLuc) || 0, Number(phien.ketThuc) || 0);
  t.daXuLyLuc = t.hoatDongLuc;
  app.ghiMocLuc = t.hoatDongLuc;
  app.trangThaiVangMat = "";
  app.loiVangMat = null;
  app.vangMatDangXet = false;
  if (await luuTruyen(story, "trạng thái thời gian vắng mặt")) {
    render();
    return true;
  }
  // Ghi hỏng: trả các mốc trong RAM về đúng giá trị trước đó (khớp với kv) và giữ phiên ở
  // "thử lại" kèm thông báo, để người dùng còn đường bấm Thử lại — KHÔNG đóng giao diện
  // như thể phiên đã xong.
  phien.trangThai = "thuLai";
  phien.soSuKien = truoc.soSuKien;
  phien.loiNhan = "Không ghi được mốc kết thúc phiên — thử lại.";
  phien.luc = truoc.luc;
  t.phien = truoc.phien;
  t.hoatDongLuc = truoc.hoatDongLuc;
  t.daXuLyLuc = truoc.daXuLyLuc;
  app.ghiMocLuc = truoc.ghiMocLuc;
  // Giao diện chuyển sang dòng báo lỗi + nút Thử lại (giống hai đường lỗi khác trong
  // `chayPhienVangMat`), không còn giữ dòng "đang xem điều gì đã xảy ra…".
  app.trangThaiVangMat = "";
  app.loiVangMat = { phien: phien.id, thongDiep: phien.loiNhan };
  render();
  return false;
}

async function thuLaiVangMat(story) {
  if (!story || app.vangMatDangXet) return;
  const tg = thoiGianOf(story);
  if (tg.phien) tg.phien.trangThai = "thuLai";
  app.loiVangMat = null;
  app.trangThaiVangMat = "";
  render();
  await kiemTraVangMat(story);
}

// Bỏ qua lần này: KHÔNG đụng vào quan hệ, sổ sự kiện hay tin nhắn — chỉ đánh dấu khoảng
// vắng mặt này đã được xử lý để không hỏi lại.
async function boQuaVangMat(story) {
  if (!story) return;
  const tg = thoiGianOf(story);
  if (tg.phien) {
    tg.phien.trangThai = "boQua";
    tg.phien.luc = Date.now();
    tg.hoatDongLuc = Math.max(Number(tg.hoatDongLuc) || 0, Number(tg.phien.ketThuc) || 0, Date.now());
    tg.daXuLyLuc = tg.hoatDongLuc;
    app.ghiMocLuc = tg.hoatDongLuc;
  }
  app.loiVangMat = null;
  app.trangThaiVangMat = "";
  app.vangMatDangXet = false;
  render();
  if (await luuTruyen(story, "bỏ qua lần vắng mặt")) toast("Đã bỏ qua lần này — không có gì thay đổi.");
}

// Tín hiệu hé lộ: model ghi "«HELO: S1»" khi một sự kiện đang ẩn thật sự được kể ra
// trong đoạn vừa viết. KHÔNG hiện toast — hé lộ phải xảy ra bằng lời kể trong cảnh,
// thông báo sẽ làm lộ bí mật cho người chơi.
async function apDungHeLo(story, raw, nguon) {
  if (!story || !raw) return false;
  const dsMa = AI.docHeLo(raw);
  if (!dsMa.length) return false;
  const map = suKienTheoMaNgan(story);
  const htId = (nguon && nguon.htId) || "";
  const tnId = (nguon && nguon.tnId) || "";
  const nvId = (nguon && nguon.nvId) || "";
  const conv = htId ? (story.hoiThoais || []).find((c) => c.id === htId) || null : null;
  let doi = false;
  for (const k of dsMa) {
    const id = map[k];
    if (!id) continue;
    const e = suKienCua(story).find((x) => x.id === id);
    if (!e) continue;
    // "Đã lộ" rồi thì lần hé lộ thứ hai (model lặp lại dấu hiệu) không tính nữa — mỗi
    // sự kiện chỉ lộ MỘT lần, xét theo ĐÚNG ngữ cảnh hội thoại đang kể.
    if (mucTrong(story, conv, e) === "daLo") continue;
    if (htId && tnId) {
      const rec = { htId: htId, tnId: tnId, nvId: nvId, luc: (nguon && Number(nguon.luc)) || Date.now() };
      // Sự kiện TOÀN TRUYỆN kể ra ở một NHÁNH: lớp hé lộ phải là của RIÊNG nhánh — nhánh
      // sinh ra trước một lần hé lộ không được thừa hưởng nó, và chuyện lộ ở nhánh này
      // không lộ sang nhánh khác. Sự kiện gắn hội thoại và mạch chính vẫn dùng `e.heLo`.
      if (!e.htId && laNhanh(conv)) {
        conv.vgHeLo = chuanHoaVgHeLo((conv.vgHeLo || []).concat([Object.assign({ vgId: e.id }, rec)]), story);
      } else {
        e.heLo = (e.heLo || []).concat([rec]);
      }
      doi = true;
    } else if (e.htId || !laNhanh(conv)) {
      // Không rõ nguồn (dữ liệu cũ): chốt thẳng mức gốc. Không làm vậy cho sự kiện toàn
      // truyện ở nhánh — ghi vào sự kiện chuẩn là để nó lộ ra toàn truyện; thiếu nguồn
      // thì thà bỏ qua một lần hé lộ còn hơn phá vỡ ranh giới giữa các nhánh.
      e.mucGoc = "daLo";
      doi = true;
    }
  }
  if (!doi) return false;
  tinhLaiBiet(story, htId ? { [htId]: getMessages(htId) } : null);
  return await luuTruyen(story, "mức hé lộ sự kiện");
}

// ---------------------------------------------------------------- hiển thị trong chat
function dividerVangMatHtml(story, m, mapSuKien) {
  const e = (mapSuKien || suKienTheoId(story))[m.vangMat];
  const kem = e && e.cheDoVangMat === "thoiGianThat" && e.phutVangMat > 0 ? " · " + khoangText(e.phutVangMat) : "";
  return (
    '<div class="vg-divider"><span class="vg-divider-line"></span>' +
      '<span class="vg-divider-txt">' + icon("clock", 12) + " Trong lúc bạn vắng mặt" + esc(kem) + "</span>" +
      '<span class="vg-divider-line"></span></div>'
  );
}

// Thẻ "Nhịp trước đó": dựng từ dữ liệu đã có (tinhTrangThai + tin nhắn gần nhất), KHÔNG
// gọi AI, KHÔNG chèn vào message và KHÔNG gửi lại cho AI như một sự kiện mới.
function theNhipTruocHtml(story, conv) {
  if (!conv || !app.vangMatDuNguong) return "";
  if (app.dongNhip[conv.id]) return "";
  // Nội dung lấy từ hội thoại ĐANG DANG DỞ (nếu có), nhưng thẻ hiện ngay trong hội thoại
  // người dùng đang mở — kèm nút nhảy tới đúng mạch, để không bị bỏ sót một cảnh chưa khép
  // ở tuyến khác.
  const ht = (story.hoiThoais || []).find((c) => c.id === app.nhipConvId) || conv;
  const nhip = nhipTruocDo(story, ht, getMessages(ht.id));
  if (!nhip || !nhip.co) return "";
  const khac = ht.id !== conv.id;
  const mo = !!app.nhipMo[conv.id];
  const dong = (nhan, ds) =>
    ds && ds.length
      ? '<div class="vg-nhip-line"><span class="vg-nhip-k">' + esc(nhan) + "</span><span>" +
        ds.map((x) => (x.ten ? "<b>" + esc(x.ten) + ":</b> " : "") + esc(x.noiDung)).join(" · ") + "</span></div>"
      : "";
  return (
    '<div class="vg-nhip' + (mo ? " mo" : "") + '">' +
      '<div class="vg-nhip-head">' +
        '<button class="vg-nhip-toggle" data-act="vg-mo-nhip" data-ht="' + esc(conv.id) + '">' +
          icon("clock", 12) + " <b>Nhịp trước đó</b>" +
          (mo ? "" : '<span class="vg-dim">chạm để xem bạn đang ở đâu</span>') +
        "</button>" +
        '<button class="vg-nhip-x" data-act="vg-dong-nhip" data-ht="' + esc(conv.id) + '" title="Đóng">' + icon("close", 12) + "</button>" +
      "</div>" +
      (mo
        ? '<div class="vg-nhip-body">' +
            (nhip.viTri
              ? '<div class="vg-nhip-line"><span class="vg-nhip-k">' + (nhip.viTri.vai === "nguoi" ? "Bạn vừa nói" : esc(nhip.viTri.ten) + " vừa nói") +
                '</span><span class="vg-nhip-quote">' + esc(catNgan(nhip.viTri.noiDung, 220)) + "</span></div>"
              : "") +
            dong("Cảm xúc còn đọng", nhip.camXuc) +
            dong("Đang chờ", nhip.choDo) +
            (nhip.hienDien.length ? '<div class="vg-nhip-line"><span class="vg-nhip-k">Đang hiện diện</span><span>' + esc(nhip.hienDien.join(" · ")) + "</span></div>" : "") +
            (nhip.moc ? '<div class="vg-nhip-line"><span class="vg-nhip-k">Móc cảnh</span><span>' + esc(catNgan(nhip.moc, 220)) + "</span></div>" : "") +
            (khac
              ? '<div class="vg-nhip-line"><span class="vg-nhip-k">Mạch dang dở</span><span>' +
                '<button class="btn btn-sm" data-act="vg-mo-ht" data-ht="' + esc(ht.id) + '">' + icon("chat", 12) + " Mở “" + esc(catNgan(ht.tieuDe, 40)) + "”</button></span></div>"
              : "") +
          "</div>"
        : "") +
    "</div>"
  );
}

// Khối đầu phần hội thoại: dòng trạng thái (đang xử lý / lỗi + Thử lại-Bỏ qua) và thẻ
// "Nhịp trước đó". Dòng trạng thái KHÔNG khoá app và KHÔNG được đẩy composer khỏi màn hình.
function khoiVangMatHtml(story, conv) {
  let html = "";
  if (app.loiVangMat) {
    html +=
      '<div class="vg-status vg-loi">' +
        "<span>" + icon("clock", 13) + " Không xem được diễn biến lúc bạn vắng mặt: " + esc(app.loiVangMat.thongDiep || "lỗi không rõ") + "</span>" +
        '<span class="vg-status-acts">' +
          '<button class="btn btn-sm" data-act="vg-thu-lai">' + icon("refresh", 12) + " Thử lại</button>" +
          '<button class="btn btn-sm" data-act="vg-bo-qua">Bỏ qua lần này</button>' +
        "</span>" +
      "</div>";
  } else if (app.vangMatDangXet || app.trangThaiVangMat) {
    html +=
      '<div class="vg-status">' +
        '<span class="typing"><i></i><i></i><i></i></span> ' +
        "<span>" + esc(app.trangThaiVangMat || "Đang xem điều gì đã xảy ra…") + "</span>" +
      "</div>";
  }
  return html + theNhipTruocHtml(story, conv);
}

// ---------------------------------------------------------------- mục Đạo diễn
function vgDongAnhHuong(story, e) {
  const qh = ((e.anhHuong && e.anhHuong.quanHe) || [])
    .map((d) => tenNvg(story, d.tu) + " → " + tenNvg(story, d.den) + ": " + tenChieu(d.chieu) + (Number(d.huong) < 0 ? " ↓" : " ↑") + (d.lyDo ? " (" + d.lyDo + ")" : ""))
    .join(" · ");
  const nt = ((e.anhHuong && e.anhHuong.noiTam) || [])
    .map((d) => tenNvg(story, d.nvId) + ": " + tenTruong(d.truong) + " → " + d.moi)
    .join(" · ");
  return [qh, nt].filter(Boolean).join(" · ");
}

function vgSuKienDdHtml(story, e) {
  const ht = e.htId ? ((story.hoiThoais || []).find((c) => c.id === e.htId) || {}).tieuDe || "" : "";
  const anhHuong = vgDongAnhHuong(story, e);
  return (
    '<div class="vg-dd-ev">' +
      '<div class="vg-dd-ev-head">' +
        '<span class="dd-tag ' + (e.muc === "daLo" ? "dd-tag-fact" : "dd-tag-dc") + '">' + esc(nhanMuc(e.muc)) + "</span>" +
        '<b>' + esc(nhanLoai(e.loai)) + "</b>" +
        (e.hinhThuc ? '<span class="vg-dim">' + esc(e.hinhThuc) + "</span>" : "") +
        '<span class="vg-dim vg-dd-time">' + esc(new Date(Number(e.luc) || Date.now()).toLocaleString("vi-VN")) + "</span>" +
      "</div>" +
      '<div class="vg-dd-ev-body">' + esc(e.noiDung) + "</div>" +
      '<div class="vg-dd-ev-meta">' +
        '<span class="dd-key">Trong cuộc</span><span class="dd-val">' + esc(tenDsNv(story, e.thamGia) || "—") + "</span>" +
        '<span class="dd-key">Biết chuyện</span><span class="dd-val">' + esc(tenDsNv(story, e.biet) || "—") + "</span>" +
        (ht ? '<span class="dd-key">Hội thoại</span><span class="dd-val">' + esc(ht) + "</span>" : "") +
        (e.phatHien ? '<span class="dd-key">Cách phát hiện</span><span class="dd-val">' + esc(e.phatHien) + "</span>" : "") +
        (anhHuong ? '<span class="dd-key">Tác động</span><span class="dd-val">' + esc(anhHuong) + "</span>" : "") +
      "</div>" +
      '<div class="vg-dd-ev-muc">' +
        MUC.map((x) => '<button class="btn btn-sm' + (e.muc === x.id ? " btn-primary" : "") + '" data-act="vg-muc" data-id="' + esc(e.id) + '" data-muc="' + esc(x.id) + '" title="' + esc(x.moTa) + '">' + esc(x.ten) + "</button>").join("") +
      "</div>" +
    "</div>"
  );
}

function vgNgoaiManHinhHtml(story) {
  const ds = suKienCua(story).slice().sort((a, b) => (Number(b.luc) || 0) - (Number(a.luc) || 0));
  const an = ds.filter((e) => e.muc !== "daLo").length;
  return (
    '<div class="dd-sec">' +
      '<div class="dd-sec-head"><span class="dd-tag dd-tag-ngoai">Ngoài màn hình</span>' +
        "<h4>Chuyện xảy ra khi bạn vắng mặt (" + ds.length + (an ? " · " + an + " còn ẩn" : "") + ")</h4></div>" +
      '<div class="dd-note">Sự kiện “ngoài màn hình” chỉ đi vào prompt của nhân vật có tên ở dòng <b>Biết chuyện</b>. Mức <b>Đã lộ</b> nghĩa là người chơi đã biết chuyện; đổi mức ở đây không tự kể gì trong chat.</div>' +
      (ds.length ? ds.map((e) => vgSuKienDdHtml(story, e)).join("") : '<div class="dd-empty">Chưa có sự kiện vắng mặt nào.</div>') +
    "</div>"
  );
}


// ==========================================================================
//  KHỞI ĐỘNG
// ==========================================================================
async function boot() {
  loadSettings();
  applyTheme();
  app.tapTrung = !!store.settings.tapTrung;
  window.__tv_getMessages = (id) => store.messagesCache[id] || [];

  try {
    await loadStories();
  } catch (e) {
    console.error(e);
    $("#appRoot").innerHTML = '<div class="empty-big"><h2>Không mở được dữ liệu</h2><p>' + esc(e.message || e) + "</p></div>";
    $("#bootScreen").remove();
    return;
  }
  // Thư viện ngoại hình là cấp APP (dùng chung giữa các truyện). Đọc hỏng thì app vẫn
  // chạy — chỉ là chưa có hồ sơ nào để ghép vào prompt ảnh.
  try {
    await loadNgoaiHinh();
  } catch (e) {
    console.error(e);
  }
  // Đọc hỏng KHÁC với "thư viện rỗng": phải nói ra, nếu không người dùng sẽ tưởng hồ sơ
  // của mình đã mất (hoặc xuất bản sao lưu thiếu hồ sơ mà không biết).
  if (coLoiDocNgoaiHinh()) {
    toast("Không đọc được thư viện ngoại hình — thư viện có thể đang thiếu hồ sơ. Mở Thư viện ngoại hình để thử đọc lại.", "error");
  }
  // Nhật ký parse LLM: `ai.js` chỉ giữ một hàm hook (nên vẫn thuần khi chạy ở tầng Node);
  // app cắm hàm ghi vào kv ở đây. Ghi lỗi cũng không được làm hỏng lượt chơi.
  AI.datHookNhatKy((muc) => {
    ghiNhatKyLlm(muc).catch(() => {});
  });
  bindGlobalEvents();
  window.addEventListener("hashchange", async () => {
    const h = parseHash();
    if (h.ct && h.ct !== app.storyId) await openStory(h.ct, h.ht);
    else if (h.ct && h.ht !== app.convId) await openConv(h.ht);
  });

  const h = parseHash();
  if (h.ct && getStory(h.ct)) {
    app.storyId = h.ct;
    app.convId = h.ht || null;
    app.screen = "story";
    if (app.convId) await loadMessages(app.convId);
    ghiNhanVangMat(getStory(h.ct));
  }
  render();
  $("#bootScreen").remove();
  window.__truyenVaiReady = true;
  const s0 = currentStory();
  if (s0) kiemTraVangMat(s0);
  // Nhắc sao lưu (nếu đến hạn): chỉ khi dữ liệu đã đổi sau lần xuất gần nhất, quá N ngày,
  // và tối đa một lần mỗi ngày. Không tự tải file.
  nhacSaoLuuKhiMo();
  // Điểm neo cho kiểm thử trên preview: cho phép giả lập "vừa vắng mặt" mà không phải
  // chờ đủ thời gian thật. KHÔNG phải API của ứng dụng.
  // Điểm neo cho KIỂM THỬ trên preview (không phải API của ứng dụng): mở một số hàm nội
  // bộ để kiểm thử tự động gọi thẳng luồng thao tác nhiều khoá mà không phải bấm qua UI.
  window.__tv_test = {
    app, AI, store,
    currentStory, currentConv, loadStories, getMessages, loadMessages, render,
    luuTruyen, giaoDichApp, xoaHoiThoai, xoaAnhKhoiTruyen, capNhatConv,
    catVaLuuLai, taoNhanhVaLuuLai, apDungHeLo, capIdMoi, vietLaiTinCuoi,
    xuatTruyen, xuatTatCa, openNhapTruyen, chuanHoaTruyen, chuanNhap: chuanBiNhap,
    openNewStoryModal, giaoKeoOf, xacNhan18Plus, chanGiaoKeo, laNguoiLon, tuoiSo, laDataUrlAnh,
    xacNhan18PlusTruyen, chanNoiDungNguoiLon, laCheDoNguoiLon, dsSeGhiCoNguoiLon, dsChanGhiCo, dauHieuViThanhNien,
    newNgoaiHinh, loadNgoaiHinh, getNgoaiHinh, dsNgoaiHinh, luuNgoaiHinh, xoaNgoaiHinh,
    ghepPromptNgoaiHinh, tachNgoaiHinh, gopLoaiTruNgoaiHinh, nhanDienNgoaiHinh, ungVienNgoaiHinh,
    demLienKetNgoaiHinh, demDungNgoaiHinh, coLoiDocNgoaiHinh, hoSoCuaTruyen, tenUngVien,
    hoSoTheoId, chuanHoaHoSo, tenHoSo, MARK_NGOAI_HINH, MARK_NGOAI_HINH_CU, PHIEN_BAN_HO_SO, thamChieuMo,
    ID_NGUOI_CHOI, laNguoiChoi, nguoiChoiNhuNhanVat, hoSoNguoiChoi, moTaNguoiDung,
    ngoaiHinhEn, tranhEn, canDichNgoaiHinh, boBanDichCu, luuBanDichNgoaiHinh,
    openStoryMenu,
    openNgoaiHinh, openSuaNgoaiHinh, nhapHoSoNgoaiHinh, xuatNgoaiHinh, openNhapNgoaiHinh,
    docFileNhap, nhanHoSoNhap, chonFileNgoaiHinh, idHoSoCuaTruyen, xoaHoSoNgoaiHinh,
    openTaoAnh, openCharacterEditor, gopLoaiTruNgoaiHinh, khoiNgoaiHinh, ungVienNgoaiHinh,
    openTaoHuong, ddKichHoat,
    onSend, generateTurn, streamGroupReply, streamOneReply, batDauLuot, ketThucLuot,
    // Giai đoạn 4 — sao lưu, nhật ký parse, gỡ lỗi, tự kiểm tra bất biến
    openGoLoi, openXuatGoLoi, openTuKiemTra, dungGoLoi, moTaGoLoi, taiGoLoi,
    chayTuKiemTra, suaBatBien, nhanNhomKiemTra, chuTrangThaiSaoLuu, nhacSaoLuuKhiMo, thanhDungLuong,
    docNhatKyLlm, ghiNhatKyLlm, xoaNhatKyLlm, kiemTraBatBien, catTho, themVaoVong, dungLuongTho,
    mocSaoLuu, danhDauSaoLuu, danhDauDaDoi, nenNhacSaoLuu,
    // Giai đoạn 5 — tầng schema + migration tập trung (kiểm hình dạng, sổ đăng ký phiên bản,
    // nhật ký nâng cấp). `chuanHoa*` vẫn mở ra để bộ kiểm thử so "chạy bóng" với `migrate`.
    migrate, napBanGhi, migrateTruyen, migrateTinNhan, migrateHoSo, chuanHoaTinNhan,
    docLoiHinhDang, xoaLoiHinhDang, tomTatMigrate, docNhatKyMigrate, xoaNhatKyMigrate, moTaHinhDang,
    MIGRATION_TRUYEN, MIGRATION_HO_SO, MO_TA_TRUYEN, MO_TA_TIN_NHAN, MO_TA_ANH, MO_TA_HO_SO,
    kiemTraTruyen, kiemTraTinNhan, kiemTraAnh, kiemTraHoSo,
  };
  window.__tv_vg = {
    app,
    ghiNhanVangMat,
    kiemTraVangMat,
    thuLaiVangMat,
    boQuaVangMat,
    taiTinNhanTatCa,
    gapVangMat(story, phut) {
      const tg = thoiGianOf(story);
      const batDau = Date.now() - Math.round(phut) * 60000;
      // Giả lập "vừa rời app rồi quay lại": kéo mốc hoạt động về quá khứ. Mốc "đã xử lý"
      // cũng phải lùi trước đó, vì trong thực tế người dùng đã hoạt động ở một thời điểm
      // nào đó TRƯỚC khi rời đi (mốc chỉ tiến, không lùi).
      tg.daXuLyLuc = Math.min(Number(tg.daXuLyLuc) || 0, batDau - 60000);
      tg.hoatDongLuc = batDau;
      ghiNhanVangMat(story);
    },
  };
}

boot();
