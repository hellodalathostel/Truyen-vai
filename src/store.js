// Truyện Vai — lớp dữ liệu (IndexedDB qua kv-plugin). Không đụng tới DOM.

import { thoiGianMacDinh, chuanHoaThoiGian, suKienCua, chuanHoaVgHeLo, tinhLaiBiet } from "./thoiGian.js";
import { chuanHoaHoSo, PHIEN_BAN_HO_SO } from "./ngoaiHinh.js";
// Tầng schema (hình dạng + sổ đăng ký migration). Cố ý KHÔNG import gì nên nằm dưới cùng
// DAG; chiều import vẫn một chiều: store.js → schema.js.
import {
  MIGRATION_TRUYEN,
  MIGRATION_HO_SO,
  migrateTheo,
  kiemTheoLoai,
  kiemTraTruyen,
  kiemTraTinNhan,
  kiemTraAnh,
  kiemTraHoSo,
  ghiMigrate,
  ghiLoiHinhDang,
  docLoiHinhDang,
  xoaLoiHinhDang,
  docNhatKyMigrate,
  xoaNhatKyMigrate,
  tomTatMigrate,
  soPhienBan,
  moTaHinhDang,
  nhanLoaiBanGhi,
  laDoiTuong,
} from "./schema.js";

// Bảng gỡ lỗi / màn Tự kiểm tra đọc qua `store.js` (một cửa vào cho tầng giao diện).
export { docLoiHinhDang, xoaLoiHinhDang, docNhatKyMigrate, xoaNhatKyMigrate, tomTatMigrate, soPhienBan, moTaHinhDang, kiemTheoLoai, nhanLoaiBanGhi, migrateTheo };

// Gốc perchance (`root`). Dùng `typeof window` để module này NẠP ĐƯỢC trong Node
// (tầng kiểm thử logic thuần) — khi đó `R === null`, và mọi hàm cần kv/DOM sẽ báo lỗi
// lúc GỌI, chứ không phải lúc nạp module.
export const R =
  (typeof window !== "undefined" && (window.TRUYEN_VAI_ROOT || window.root)) || null;

const FALLBACK_CFG = {
  soTinNhanGiuNguyenVan: 36,
  tyLeNguongTomTat: 0.7,
  soNguoiTraLoiToiDa: 3,
  soTuGoiY: 3,
  doDaiMoTaNhanVatKhac: 90,
  luuToiDaTinNhan: 4000,
};

export const CFG = (() => {
  try {
    const c = R && R.CauHinh && R.CauHinh();
    return Object.assign({}, FALLBACK_CFG, c || {});
  } catch (e) {
    console.error("Không đọc được CauHinh(), dùng mặc định.", e);
    return Object.assign({}, FALLBACK_CFG);
  }
})();

export function uid(prefix = "id") {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------- lỗi lưu dữ liệu
// Lỗi lưu KHÔNG được nuốt ở tầng này: nếu IndexedDB đầy hoặc bị chặn mà hàm vẫn
// trả về bình thường, giao diện sẽ báo "đã lưu" trong khi dữ liệu đã mất.
export class LoiLuu extends Error {
  constructor(viec, nguyenNhan, dongTu = "lưu") {
    super("Không " + dongTu + " được " + viec + ".");
    this.name = "LoiLuu";
    this.viec = viec;
    this.dongTu = dongTu;
    this.nguyenNhan = nguyenNhan;
  }
}

function loiLuu(viec, e, dongTu = "lưu") {
  return e instanceof LoiLuu ? e : new LoiLuu(viec, e, dongTu);
}

export function laLoiHetCho(e) {
  const goc = (e && e.nguyenNhan) || e;
  const s = String((goc && ((goc.name || "") + " " + (goc.message || goc))) || "").toLowerCase();
  return /quota|exceeded|storage|full|disk|space/.test(s);
}

// Câu thông báo cho người dùng, nói rõ việc gì chưa xong và cần làm gì tiếp.
export function thongDiepLuu(e, viec) {
  const dongTu = (e && e.dongTu) || "lưu";
  const chung = "Không " + dongTu + " được " + (viec || (e && e.viec) || "dữ liệu") + ".";
  if (laLoiHetCho(e))
    return chung + " Bộ nhớ trình duyệt đã đầy — hãy xuất bản sao lưu rồi xoá bớt ảnh cũ trong thư viện ảnh.";
  return chung + (dongTu === "lưu" ? " Thay đổi vừa rồi chưa được ghi lại, hãy thử lại." : " Hãy tải lại trang rồi thử lại.");
}

// Dung lượng trình duyệt đang dùng (ước tính) — để cảnh báo trước khi hết chỗ.
export async function dungLuongUocTinh() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    const e = await navigator.storage.estimate();
    return { dung: e.usage || 0, tong: e.quota || 0 };
  } catch (e) {
    return null;
  }
}

// ==========================================================================
//  SAO LƯU — mốc thời gian + quyết định có nhắc hay không
// ==========================================================================
// Bốn mốc (ms) nằm trong `store.settings` (localStorage) — không phải dữ liệu truyện,
// nên không tính vào kv và không đi theo file xuất:
//   batDauLuc — lần đầu app chạy trên trình duyệt này (mốc gốc khi chưa từng xuất)
//   xuatLuc   — lần xuất bản sao lưu gần nhất
//   daDoiLuc  — lần gần nhất DỮ LIỆU THẬT SỰ ĐỔI (truyện / tin nhắn / ảnh / hồ sơ)
//   hoanLuc   — lần người dùng bấm "Để sau"
//   nhacLuc   — lần gần nhất đã hiện lời nhắc (để không nhắc quá một lần mỗi ngày)
export const NGAY_MS = 24 * 60 * 60 * 1000;

export function mocSaoLuu(now) {
  const s = store.settings;
  const moi = !s.saoLuu || typeof s.saoLuu !== "object";
  if (moi) s.saoLuu = {};
  const m = s.saoLuu;
  const luc = Number(now) || Date.now();
  const datBatDau = !Number(m.batDauLuc);
  m.batDauLuc = Number(m.batDauLuc) || luc;
  m.xuatLuc = Number(m.xuatLuc) || 0;
  m.daDoiLuc = Number(m.daDoiLuc) || 0;
  m.hoanLuc = Number(m.hoanLuc) || 0;
  m.nhacLuc = Number(m.nhacLuc) || 0;
  // Mốc "bắt đầu dùng" phải được GHI XUỐNG ngay lần đầu, nếu không nó sẽ trôi theo mỗi
  // lần mở app và lời nhắc sao lưu không bao giờ đến hạn.
  if (moi || datBatDau) saveSettings();
  return m;
}

export function danhDauSaoLuu(khoa, now) {
  const m = mocSaoLuu(now);
  m[khoa] = Number(now) || Date.now();
  saveSettings();
  return m[khoa];
}

// Gọi ở MỌI đường ghi/xoá dữ liệu thật (truyện, tin nhắn, ảnh, hồ sơ ngoại hình).
// Chỉ là một mốc thời gian, không lưu nội dung, và không chặn đường ghi.
export function danhDauDaDoi(now) {
  try {
    const m = mocSaoLuu(now);
    m.daDoiLuc = Number(now) || Date.now();
    saveSettings();
  } catch (e) {
    console.error(e);
  }
}

// Quyết định CÓ NHẮC hay không. Hàm thuần (nhận `now` và `soNgay`) để kiểm thử được.
// Nguyên tắc: chỉ nhắc khi dữ liệu ĐÃ ĐỔI sau lần xuất gần nhất, và đã quá `soNgay`
// ngày kể từ mốc gần nhất (lần xuất, hoặc lần đầu dùng nếu chưa từng xuất). "Để sau"
// hoãn đúng một ngày; mỗi ngày nhắc tối đa một lần.
export function nenNhacSaoLuu(m, now, soNgay) {
  const luc = Number(now) || Date.now();
  const n = Math.max(1, Math.round(Number(soNgay) || 7));
  const moc = Number(m && (m.xuatLuc || m.batDauLuc)) || 0;
  const daDoi = Number(m && m.daDoiLuc) || 0;
  if (!moc) return { nhac: false, ly: "chua-co-moc" };
  if (!daDoi) return { nhac: false, ly: "chua-tung-doi" };
  if (Number(m.xuatLuc) && daDoi <= Number(m.xuatLuc)) return { nhac: false, ly: "da-xuat-sau-khi-doi" };
  if (luc - moc < n * NGAY_MS) return { nhac: false, ly: "chua-du-ngay", ngayTuMoc: Math.floor((luc - moc) / NGAY_MS), soNgay: n };
  if (Number(m.hoanLuc) && luc - Number(m.hoanLuc) < NGAY_MS) return { nhac: false, ly: "dang-hoan" };
  if (Number(m.nhacLuc) && luc - Number(m.nhacLuc) < NGAY_MS) return { nhac: false, ly: "vua-nhac" };
  return {
    nhac: true,
    ly: Number(m.xuatLuc) ? "da-doi-sau-lan-xuat" : "chua-tung-xuat",
    soNgay: n,
    ngayTuMoc: Math.floor((luc - moc) / NGAY_MS),
    coLanXuat: !!Number(m.xuatLuc),
  };
}

// ==========================================================================
//  NHẬT KÝ PARSE LLM — vòng đệm, chỉ nằm trên máy người dùng
// ==========================================================================
// Mỗi lượt gọi AI ghi MỘT mục: loại lệnh, thời điểm, ok/lỗi + lý do, độ dài đầu ra.
// Mục "phân tích" (parse) kèm đầu ra thô để soi khi parse hỏng.
// Vòng đệm bị chặn hai đầu: số mục (20) VÀ tổng dung lượng phần thô — nên dù model trả
// về văn bản rất dài thì nhật ký vẫn nhỏ. KHÔNG bao giờ đi vào file xuất truyện; chỉ đi
// vào "gói gỡ lỗi" khi người dùng tự chọn kèm đầu ra thô.
//
// BA HẰNG NÀY PHẢI ĂN KHỚP VỚI NHAU: trần dung lượng chỉ có tác dụng khi
// TOI_DA_MUC_NHAT_KY * DO_DAI_THO_MOI_MUC > TOI_DA_BYTE_NHAT_KY. Nếu ai đó nâng
// DO_DAI_THO_MOI_MUC mà không hạ trần byte (hoặc ngược lại), trần dung lượng thành vô
// nghĩa và ta lại có một nhật ký chỉ bị chặn bởi số mục — đúng thứ đã bị bỏ.
export const TOI_DA_MUC_NHAT_KY = 20;
export const TOI_DA_BYTE_NHAT_KY = 12 * 1024;
export const DO_DAI_THO_MOI_MUC = 1000;

export function catTho(tho, n) {
  const t = typeof tho === "string" ? tho : String(tho === undefined || tho === null ? "" : tho);
  // Trần ≤ 0 (hoặc thiếu/không phải số) nghĩa là "dùng trần mặc định". Một luật duy nhất
  // cho mọi giá trị hỏng — trước đây 0 thì về mặc định còn -5 thì cắt sạch, hai nghĩa
  // khác nhau cho cùng một ý "không dùng được".
  const so = Number(n);
  const toiDa = so > 0 ? Math.floor(so) : DO_DAI_THO_MOI_MUC;
  if (t.length <= toiDa) return t;
  return t.slice(0, toiDa) + "…[cắt]";
}

export function dungLuongTho(vong) {
  let tong = 0;
  for (const x of Array.isArray(vong) ? vong : []) tong += (x && typeof x.tho === "string" ? x.tho.length : 0);
  return tong;
}

// Vòng đệm thuần: thêm mục mới NHẤT vào đầu, cắt bớt theo số mục và theo tổng dung
// lượng phần thô (bỏ dần mục CŨ nhất). Trả về mảng mới.
export function themVaoVong(vong, muc, toiDaSo, toiDaByte) {
  const so = Math.max(1, Number(toiDaSo) || TOI_DA_MUC_NHAT_KY);
  const byte = Math.max(0, Number(toiDaByte) || TOI_DA_BYTE_NHAT_KY);
  const ra = [muc].concat(Array.isArray(vong) ? vong : []).slice(0, so);
  while (ra.length > 1 && dungLuongTho(ra) > byte) ra.pop();
  if (ra.length === 1 && dungLuongTho(ra) > byte) ra[0] = Object.assign({}, ra[0], { tho: "" });
  return ra;
}

function viTriNhatKy() {
  return R.kv.nhatKyLlm;
}

export async function docNhatKyLlm() {
  try {
    const v = await viTriNhatKy().get("vong");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function ghiNhatKyLlm(muc) {
  try {
    const m = Object.assign(
      { t: Date.now(), ok: 1, ly: "" },
      muc || {}
    );
    m.l = String(m.l || "?").slice(0, 80);
    m.ly = String(m.ly || "").slice(0, 240);
    m.d = Number(m.d) || 0;
    m.tho = typeof m.tho === "string" ? catTho(m.tho) : "";
    const cu = await docNhatKyLlm();
    return await viTriNhatKy().set("vong", themVaoVong(cu, m));
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function xoaNhatKyLlm() {
  try {
    await viTriNhatKy().delete("vong");
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// ==========================================================================
//  TỰ KIỂM TRA BẤT BIẾN — chỉ BÁO CÁO, hàm thuần (kiểm thử được bằng Node)
// ==========================================================================
// `khoaTinNhan` / `khoaAnh` = danh sách khoá đang có trong kv. Hàm chỉ đọc và trả về
// báo cáo; KHÔNG tự sửa gì (việc sửa do giao diện làm, có xác nhận, trong `giaoDichKV`).
export function kiemTraBatBien(stories, dsHoSo, khoaTinNhan, khoaAnh, thamChieuMoFn) {
  const ds = Array.isArray(stories) ? stories : [];
  const nhom = {};
  const them = (loai, moTa, them2) => {
    if (!nhom[loai]) nhom[loai] = [];
    nhom[loai].push(Object.assign({ loai, moTa }, them2 || {}));
  };
  // Phép quét này chạy trên dữ liệu ĐỌC TỪ MÁY, nên nó phải chịu được bản ghi hỏng: một trường
  // đáng lẽ là mảng mà lại là chuỗi/số (dữ liệu sai hình dạng — xem `src/schema.js`) thì coi như
  // RỖNG, chứ không được ném lỗi. Ném lỗi ở đây là làm sập luôn màn Tự kiểm tra — đúng cái màn
  // người dùng mở ra để hiểu chuyện gì đang xảy ra với dữ liệu của mình.
  const mang = (x) => (Array.isArray(x) ? x : []);
  const convDung = new Set();
  const anhDung = new Set();

  for (const s of ds) {
    if (!s || typeof s !== "object") continue;
    const nvIds = new Set(mang(s.nhanVats).map((c) => c && c.id).filter(Boolean));
    const chIds = new Set(mang(s.chuongs).map((c) => c && c.id).filter(Boolean));
    // id trùng trong cùng một truyện: hai phần tử cùng id thì mọi tham chiếu đều mơ hồ.
    for (const [khoa, dsCon] of [["nhanVats", mang(s.nhanVats)], ["chuongs", mang(s.chuongs)], ["hoiThoais", mang(s.hoiThoais)]]) {
      const dem = {};
      for (const x of dsCon) {
        const id = x && x.id;
        if (!id) continue;
        dem[id] = (dem[id] || 0) + 1;
      }
      for (const id in dem) if (dem[id] > 1) them("trung-id", "Truyện “" + (s.ten || s.id) + "” có " + dem[id] + " mục cùng id trong " + khoa + ": " + id, { truyen: s.id, id: id });
    }
    for (const c of mang(s.hoiThoais)) {
      if (!c) continue;
      convDung.add(c.id);
      for (const id of mang(c.nhanVatIds)) {
        if (!nvIds.has(id)) them("hoi-thoai-tro-nv", "Hội thoại “" + (c.tieuDe || c.id) + "” trỏ tới nhân vật không còn trong truyện: " + id, { truyen: s.id, id: c.id });
      }
      for (const id of mang(c.hienDien)) {
        if (!nvIds.has(id)) them("hien-dien-tro-nv", "Người có mặt của hội thoại “" + (c.tieuDe || c.id) + "” có nhân vật không còn trong truyện: " + id, { truyen: s.id, id: c.id });
      }
      if (c.chuongId && !chIds.has(c.chuongId)) them("hoi-thoai-tro-chuong", "Hội thoại “" + (c.tieuDe || c.id) + "” trỏ tới chương đã mất: " + c.chuongId, { truyen: s.id, id: c.id });
      if (c.canhRieng && !nvIds.has(c.canhRieng)) them("canh-rieng-tro-nv", "Cảnh riêng của hội thoại “" + (c.tieuDe || c.id) + "” trỏ tới nhân vật đã mất: " + c.canhRieng, { truyen: s.id, id: c.id });
    }
    for (const a of mang(s.anh)) if (a && a.id) anhDung.add(a.id);
    for (const k of mang(s.canhDaKhep)) {
      for (const ht of mang(k && (k.htIds || (k.htId ? [k.htId] : [])))) {
        if (ht && !convDung.has(ht)) them("canh-tro-hoi-thoai", "Cảnh đã khép trỏ tới hội thoại đã mất: " + ht, { truyen: s.id, id: k.id });
      }
    }
  }

  if (typeof thamChieuMoFn === "function") {
    for (const x of mang(thamChieuMoFn(ds, dsHoSo))) {
      them("ho-so-mo", moTaHoSoMo(x), { truyen: x.truyen, id: x.id, hoSoId: x.hoSoId });
    }
  }

  for (const k of Array.isArray(khoaTinNhan) ? khoaTinNhan : []) {
    if (!convDung.has(k)) them("tin-nhan-mo-coi", "Có tin nhắn trong máy nhưng không hội thoại nào dùng: " + k, { id: k });
  }
  for (const k of Array.isArray(khoaAnh) ? khoaAnh : []) {
    if (!anhDung.has(k)) them("anh-mo-coi", "Có ảnh trong máy nhưng không truyện nào dùng: " + k, { id: k });
  }

  let soLoi = 0;
  for (const k in nhom) soLoi += nhom[k].length;
  return { soLoi: soLoi, nhom: nhom, soTruyen: ds.length, soHoSo: (dsHoSo || []).length };
}

function moTaHoSoMo(x) {
  const nhan = x.loai === "nguoiChoi" ? "hồ sơ của người chơi" : x.loai === "anh" ? "hồ sơ gắn vào ảnh cảnh" : "hồ sơ của nhân vật";
  return "Thiếu " + nhan + " (" + x.hoSoId + ") — mục " + x.id + " đang trỏ vào đó";
}

export const store = {
  stories: [],
  byId: {},
  messagesCache: {},
  anhCache: {},
  // Thư viện ngoại hình: hồ sơ dùng chung giữa MỌI truyện trên cùng trình duyệt này
  // (không phải đồng bộ giữa các thiết bị). Dữ liệu nằm ở kv folder `thuVienNgoaiHinh`.
  ngoaiHinh: [],
  ngoaiHinhById: {},
  settings: {
    theme: "toi",
    autoChronicle: false,
    autoOpening: false,
    tapTrung: false,
    // Lớp hiển thị: tách lời thoại / hành động trong bong bóng chat. Mặc định BẬT —
    // chỉ khi người dùng tự tắt thì mới quay về kiểu cũ.
    phanBietLoiThoai: true,
  },
  lastStoryId: null,
  lastConvId: null,
};

// ---------------------------------------------------------------- cài đặt app
export function loadSettings() {
  try {
    const raw = localStorage.getItem("truyenVai.caiDat");
    if (raw) Object.assign(store.settings, JSON.parse(raw));
  } catch (e) {
    console.error(e);
  }
  return store.settings;
}
export function saveSettings() {
  try {
    localStorage.setItem("truyenVai.caiDat", JSON.stringify(store.settings));
  } catch (e) {
    console.error(e);
  }
}

// ---------------------------------------------------------------- cốt truyện
// Đường NẠP duy nhất của truyện. Mọi bản ghi đọc từ kv đều được KIỂM HÌNH DẠNG và — nếu
// đang ở phiên bản cũ — NÂNG lên hình dạng hiện tại qua `migrate`. Bản ghi dị dạng KHÔNG bị
// xoá, KHÔNG chặn app mở: nó được ghi lại để màn Tự kiểm tra nói ra (xem `napTruyen`).
export async function loadStories() {
  const entries = await R.kv.cotTruyen.entries();
  const ds = [];
  for (const en of entries) {
    const raw = en && en[1];
    if (!laDoiTuong(raw)) {
      // Không phải đối tượng thì không có gì để nâng cấp, và cũng KHÔNG được thay bằng một
      // truyện rỗng (làm vậy là che mất bản ghi hỏng). Giữ nguyên + báo.
      ghiLoiHinhDang("truyen", en && en[0], "", {
        loi: [{ duong: "(gốc)", moTa: "bản ghi truyện phải là đối tượng (đang là " + (raw === null ? "null" : typeof raw) + ")" }],
      });
      ds.push(raw);
      continue;
    }
    ds.push(napTruyen(raw));
  }
  store.stories = ds.filter(Boolean);
  store.stories.sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0));
  reindex();
  return store.stories;
}

function reindex() {
  store.byId = {};
  for (const s of store.stories) store.byId[s.id] = s;
}

export function getStory(id) {
  return store.byId[id] || null;
}

// ==========================================================================
//  THƯ VIỆN NGOẠI HÌNH — hồ sơ dùng chung giữa các truyện
//
//  Mỗi hồ sơ là MỘT con người: tên chính, tuổi khai báo, mô tả ngoại hình, điều cần
//  tránh khi tạo ảnh, và (không bắt buộc) một ảnh tham chiếu. Ảnh tham chiếu được
//  nhúng thẳng vào bản ghi hồ sơ (đã thu nhỏ) nên hồ sơ là một khối tự chứa: xoá hồ
//  sơ là hết ảnh, xuất/nhập hồ sơ không cần thêm khoá nào, và không có ảnh mồ côi.
//  Xoá một truyện KHÔNG bao giờ đụng tới hồ sơ — chúng nằm ở folder kv riêng.
// ==========================================================================
export function newNgoaiHinh(data = {}) {
  return Object.assign(
    {
      id: uid("nh"),
      tenChinh: "",
      tuoi: "",
      moTa: "",
      tranh: "",
      // Bản TIẾNG ANH của `moTa`/`tranh` — dữ liệu dẫn xuất cho prompt tạo ảnh (xem
      // `canDichNgoaiHinh` / `luuBanDichNgoaiHinh`). Thư viện vẫn hiển thị bản gốc.
      moTaEn: "",
      tranhEn: "",
      anh: "",
      luc: Date.now(),
      suaLuc: Date.now(),
    },
    data
  );
}

function reindexNgoaiHinh() {
  store.ngoaiHinhById = {};
  for (const h of store.ngoaiHinh) if (h && h.id) store.ngoaiHinhById[h.id] = h;
}

// Đọc hỏng KHÔNG được coi là "thư viện rỗng". Thư viện rỗng có nghĩa là "người dùng chưa
// tạo hồ sơ nào" — hai chuyện hoàn toàn khác nhau. Nếu nuốt lỗi rồi đặt bộ đệm về `[]`
// thì bản sao lưu xuất ra sau đó sẽ THIẾU hồ sơ mà vẫn báo thành công, và người dùng chỉ
// phát hiện ra khi đã quá muộn. Vì vậy: giữ nguyên bộ đệm cũ, bật cờ báo lỗi để chỗ gọi
// (xuất bản sao lưu) chặn lại.
let loiDocNgoaiHinh = false;

export function coLoiDocNgoaiHinh() {
  return loiDocNgoaiHinh;
}

export async function loadNgoaiHinh() {
  let entries;
  try {
    entries = await R.kv.thuVienNgoaiHinh.entries();
  } catch (e) {
    loiDocNgoaiHinh = true;
    console.error("[Truyện Vai] không đọc được thư viện ngoại hình:", e);
    reindexNgoaiHinh();
    return store.ngoaiHinh;
  }
  loiDocNgoaiHinh = false;
  const ds = [];
  for (const en of entries) {
    const raw = en && en[1];
    if (!raw || typeof raw !== "object") continue;
    ds.push(nhanHoSo(Object.assign({ id: en[0] }, raw)));
  }
  ds.sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0));
  store.ngoaiHinh = ds;
  reindexNgoaiHinh();
  return store.ngoaiHinh;
}

// Hồ sơ đọc từ kv / file nhập là dữ liệu không đáng tin: ảnh tham chiếu phải là một
// data URL (hoặc URL http(s) sạch), nếu không thì bỏ ảnh (không bỏ cả hồ sơ).
function nhanHoSo(raw) {
  const h = napBanGhi(raw, "ho-so");
  if (h.anh && !laDataUrlAnh(h.anh)) h.anh = "";
  return h;
}

export function getNgoaiHinh(id) {
  return (id && store.ngoaiHinhById[id]) || null;
}

export function dsNgoaiHinh() {
  return store.ngoaiHinh;
}

// Ghi một hồ sơ (tạo mới hoặc cập nhật). Lỗi ghi ⇒ trả nguyên trạng, KHÔNG để bộ đệm
// RAM lệch với đĩa.
export async function luuNgoaiHinh(hoSo) {
  const h = nhanHoSo(Object.assign({}, hoSo, { suaLuc: Date.now(), luc: hoSo.luc || Date.now() }));
  const cu = store.ngoaiHinhById[h.id];
  const truoc = cu ? Object.assign({}, cu) : null;
  const idx = store.ngoaiHinh.findIndex((x) => x.id === h.id);
  if (idx >= 0) store.ngoaiHinh[idx] = h;
  else store.ngoaiHinh.unshift(h);
  reindexNgoaiHinh();
  try {
    await R.kv.thuVienNgoaiHinh.set(h.id, h);
    danhDauDaDoi();
  } catch (e) {
    if (truoc) {
      const i2 = store.ngoaiHinh.findIndex((x) => x.id === h.id);
      if (i2 >= 0) store.ngoaiHinh[i2] = truoc;
    } else {
      store.ngoaiHinh = store.ngoaiHinh.filter((x) => x.id !== h.id);
    }
    reindexNgoaiHinh();
    throw loiLuu("hồ sơ ngoại hình", e);
  }
  return h;
}

// Ghi lại hồ sơ mà KHÔNG đụng `suaLuc` và không sắp xếp lại thư viện. Dùng cho bản dịch
// tiếng Anh của ngoại hình — đó là dữ liệu DẪN XUẤT, không phải người dùng vừa sửa hồ sơ,
// nên hồ sơ không được nhảy lên đầu thư viện vì một lần dịch tự động.
export async function luuBanDichNgoaiHinh(hoSo) {
  if (!hoSo || !hoSo.id) return false;
  try {
    await R.kv.thuVienNgoaiHinh.set(hoSo.id, hoSo);
    return true;
  } catch (e) {
    console.error("[Truyện Vai] không ghi được bản dịch ngoại hình:", e);
    return false;
  }
}

export async function xoaNgoaiHinh(id) {
  const cu = store.ngoaiHinhById[id];
  const truoc = store.ngoaiHinh.slice();
  store.ngoaiHinh = store.ngoaiHinh.filter((x) => x.id !== id);
  reindexNgoaiHinh();
  try {
    await R.kv.thuVienNgoaiHinh.delete(id);
    danhDauDaDoi();
  } catch (e) {
    store.ngoaiHinh = truoc;
    reindexNgoaiHinh();
    throw loiLuu("thao tác xoá hồ sơ ngoại hình", e);
  }
  return cu || null;
}


export function newCharacter(data = {}) {
  return Object.assign(
    {
      id: uid("nv"),
      ten: "Nhân vật mới",
      vaiTro: "",
      moTa: "",
      tinhCach: "",
      cachNoi: "",
      ghiChu: "",
      tuoi: "",
      // Người trưởng thành (18+): MẶC ĐỊNH TẮT. Dữ liệu thiếu (bản lưu cũ, file nhập,
      // nhân vật mới) KHÔNG được suy diễn thành người lớn — người dùng phải xác nhận,
      // hoặc ghi tuổi từ 18 trở lên. Cờ này là cửa chặn của lớp giao kèo BDSM.
      nguoiLon: false,
      vaiBdsm: "", // "Dom" | "Sub" | "Switch" | "" (dùng khi bật giao kèo)
      kinhNghiem: "", // "Mới tập" | "Có kinh nghiệm" | "Dày dạn" | "Bậc thầy"
      phongCach: "", // "Nghiêm khắc" | "Dịu dàng" | "Trêu chọc" | "Lạnh lùng" | "Bảo vệ" | "Thất thường"
      khauVi: "",  // sở thích / khẩu vị trong cảnh
      soThich: [], // id trong SoThichBdsm() — điều nhân vật này thích
      gioiHan: "", // điều nhân vật này không chịu / không làm
      gioiHanCung: "", // tuyệt đối không làm, kể cả khi người chơi muốn
      danhXung: "", // cách nhân vật muốn được gọi (trong cảnh)
      luatRieng: "", // luật riêng nhân vật luôn giữ trong cảnh
      chamSocSau: "", // cách nhân vật chăm sóc sau
      tinHieuRieng: "", // dấu hiệu cho biết nhân vật sắp quá sức
      avatarStyle: "chu", // "chu" | "emoji" | "anh"
      emoji: "🙂",
      anh: "",
      mau: "#8b5cf6",
      // Liên kết tới "Thư viện ngoại hình" (hồ sơ dùng chung giữa các truyện). MẶC ĐỊNH
      // RỖNG: không tự liên kết nhân vật cũ khi cập nhật app — người dùng tự chọn.
      ngoaiHinhId: "",
      // Biệt danh CHỈ có hiệu lực trong truyện này; hồ sơ chung vẫn dùng tên chính.
      bietDanh: "",
    },
    data
  );
}

export function newChapter(so, data = {}) {
  return Object.assign(
    {
      id: uid("ch"),
      so,
      tieuDe: "Chương " + so,
      mucTieu: "",
      tomTat: "",
      daKetThuc: false,
      taoLuc: Date.now(),
    },
    data
  );
}

export function newConversation(data = {}) {
  return Object.assign(
    {
      id: uid("ht"),
      tieuDe: "Hội thoại mới",
      chuongId: null,
      nhanVatIds: [],
      // Danh sách nhân vật ĐANG CÓ MẶT trong cảnh (bản tối giản). Mặc định lấy từ
      // nhân vật tham gia hội thoại; AI có thể thêm/bớt sau mỗi lượt kể cả khi có
      // lý do rõ ràng. Mảng rỗng là trạng thái hợp lệ (chỉ còn người chơi trong
      // cảnh); chỉ khi trường này THIẾU/`null` mới dùng danh sách tham gia mặc
      // định. Xem `hienDienCua()` / `hienDienNhom()`.
      hienDien: (Array.isArray(data.nhanVatIds) ? data.nhanVatIds.slice() : []),
      // Cảnh riêng đang mở: { nvId, moLuc }. Chỉ người chơi và nhân vật này biết
      // chuyện xảy ra bên trong. Xem `canhRiengCua()`.
      canhRieng: null,
      daCoCanhRieng: false,
      // Khép cảnh: `goiKhep` = AI vừa báo cảnh đang ở điểm nghỉ (chip "Có thể khép
      // cảnh"); `khepGoc` = mốc tin nhắn mà từ đó phần chưa khép bắt đầu (nhánh mới
      // đặt bằng điểm rẽ để không phân tích lại phần đã khép của nhánh cũ).
      goiKhep: false,
      khepGoc: 0,
      goiY: "",
      tomTat: "",
      tomTatDen: 0,
      soTinNhan: 0,
      tinNhanCuoi: "",
      taoLuc: Date.now(),
      suaLuc: Date.now(),
    },
    data
  );
}

// Nhân vật đang có mặt trong cảnh. Truyện cũ (chưa có `hienDien`) lấy đúng danh
// sách tham gia hội thoại, nên không cần migrate thủ công. Lưu ý: MẢNG RỖNG là
// trạng thái hợp lệ — "trong cảnh chỉ còn người chơi", khác hẳn với `hienDien`
// thiếu/`null` (chưa từng ghi → dùng danh sách tham gia).
export function hienDienCua(story, conv) {
  const rieng = canhRiengCua(conv);
  if (rieng) return [rieng];
  return hienDienNhom(conv);
}

// Danh sách người có mặt của cả nhóm (bỏ qua cảnh riêng đang mở) — dùng khi sửa
// danh sách trong trình soạn hội thoại.
export function hienDienNhom(conv) {
  if (!conv) return [];
  const tat = Array.isArray(conv.nhanVatIds) ? conv.nhanVatIds : [];
  // Thiếu/`null`/không phải mảng = chưa từng ghi → danh sách nhân vật mặc định.
  if (!Array.isArray(conv.hienDien)) return tat.slice();
  // Mảng (kể cả rỗng) là trạng thái đã ghi rõ: lọc theo người tham gia, giữ nguyên
  // mảng rỗng vì nó nghĩa là "chỉ còn người chơi trong cảnh".
  return conv.hienDien.filter((id) => tat.indexOf(id) >= 0);
}

// Cảnh riêng đang mở (id nhân vật), "" nếu không có. Cảnh riêng trỏ tới nhân vật
// không còn thuộc hội thoại thì coi như đã đóng.
export function canhRiengCua(conv) {
  const id = conv && conv.canhRieng && conv.canhRieng.nvId;
  if (!id) return "";
  return (conv.nhanVatIds || []).indexOf(id) >= 0 ? id : "";
}

// ---------------------------------------------------------------- ảnh: dữ liệu hợp lệ
// `dataUrl` đến từ FILE NHẬP (JSON) là dữ liệu KHÔNG đáng tin: nó có thể là bất kỳ chuỗi
// nào, kể cả `x" onerror="…`. Chỉ nhận data URL ảnh hợp lệ (hoặc URL http(s) sạch —
// không khoảng trắng, không dấu nháy, không dấu < >), và mọi chỗ hiển thị phải tạo
// `<img>` bằng DOM rồi gán `.src` chứ không ghép chuỗi vào innerHTML.
const RE_ANH = /^(?:data:image\/(?:png|jpe?g|webp|gif|avif|bmp);base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s"'<>]+)$/i;

// Trả về chuỗi đã cắt khoảng trắng nếu hợp lệ, ngược lại trả "" (không bao giờ ném lỗi).
export function laDataUrlAnh(s) {
  const t = typeof s === "string" ? s.trim() : "";
  return t && RE_ANH.test(t) ? t : "";
}

// ---------------------------------------------------------------- tuổi & 18+
// Bảng số đếm tiếng Việt (1..20) — để đọc tuổi viết bằng CHỮ ("mười sáu tuổi").
const SO_VIET = [
  ["hai mươi", 20], ["mười chín", 19], ["mười tám", 18], ["mười bảy", 17], ["mười sáu", 16],
  ["mười lăm", 15], ["mười bốn", 14], ["mười ba", 13], ["mười hai", 12], ["mười một", 11],
  ["mười", 10], ["chín", 9], ["tám", 8], ["bảy", 7], ["sáu", 6], ["năm", 5],
  ["bốn", 4], ["tư", 4], ["ba", 3], ["hai", 2], ["một", 1],
];

// Tuổi viết bằng CHỮ tiếng Việt ⇒ số. Hai chế độ:
//   • `choTran = true`  — dùng cho TRƯỜNG `tuoi`: chuỗi có thể chỉ là "mười sáu" hoặc
//     "mười sáu tuổi" (cả trường là một biểu thức tuổi).
//   • `choTran = false` — dùng khi quét mô tả/ghi chú/vai trò: BẮT BUỘC chữ số phải đứng
//     ngay trước "tuổi/tổi", nếu không "ba vết sẹo" sẽ thành 3 và "tư thế" thành 4.
export function tuoiVietSangSo(text, choTran = false) {
  const t = String(text === undefined || text === null ? "" : text).toLowerCase().trim();
  if (!t) return null;
  const CHU =
    "hai mươi|mười chín|mười tám|mười bảy|mười sáu|mười lăm|mười bốn|mười ba|mười hai|mười một|mười|chín|tám|bảy|sáu|năm|bốn|tư|ba|hai|một";
  const khop = (m) => {
    if (!m) return null;
    const x = SO_VIET.find((p) => p[0] === m[1]);
    return x ? x[1] : null;
  };
  if (choTran) {
    const to = new RegExp("^(" + CHU + ")\\s*(?:tuổi|tổi)?$", "u").exec(t);
    if (to) return khop(to);
  }
  return khop(new RegExp("(?:^|[^\\p{L}])(" + CHU + ")\\s*(?:tuổi|tổi)", "u").exec(t));
}

// Tuổi đọc được thành số (chấp nhận "26", "26 tuổi", 26.5, và cả CHỮ: "mười sáu tuổi").
// Trả null nếu không suy ra được — thiếu tuổi KHÔNG có nghĩa là người lớn.
export function tuoiSo(c) {
  const raw = c && c.tuoi;
  if (typeof raw === "number" && isFinite(raw)) return raw;
  const s = String(raw === undefined || raw === null ? "" : raw);
  const m = s.match(/\d{1,3}/);
  if (m) {
    const n = Number(m[0]);
    if (isFinite(n) && n > 0) return n;
  }
  // Tuổi viết bằng chữ KHÔNG được lọt cổng người lớn chỉ vì không có chữ số nào.
  const v = tuoiVietSangSo(s, true);
  return v === null ? null : v;
}

// Một nhân vật chỉ được coi là NGƯỜI LỚN khi có tuổi số >= 18, hoặc được người dùng
// xác nhận tường minh bằng cờ `nguoiLon` (và tuổi, nếu có, không nói điều ngược lại).
export function laNguoiLon(c) {
  const tuoi = tuoiSo(c);
  if (tuoi !== null && tuoi < 18) return false; // tuổi số dưới 18 ⇒ khoá cứng
  return !!(c && c.nguoiLon === true);
}

// Lý do KHÔNG thể bật giao kèo (chuỗi rỗng = được phép bật). Cửa chặn dùng chung cho
// mọi đường: hộp Tuỳ chọn truyện, Tạo nhanh, thể loại BDSM, và file nhập.
// Đây là TRƯỜNG HỢP HẸP của `chanNoiDungNguoiLon` (chỉ soi tuổi số < 18). Giữ nguyên
// hành vi/thông điệp cũ vì đã có kiểm thử bám vào chữ "dưới 18".
export function chanGiaoKeo(story) {
  if (!story) return "Chưa có truyện.";
  const tre = (story.nhanVats || []).filter((c) => {
    const tuoi = tuoiSo(c);
    return tuoi !== null && tuoi < 18;
  });
  if (tre.length)
    return "Truyện có " + tre.length + " nhân vật ghi tuổi dưới 18 (" + tre.map((c) => c.ten).join(", ") +
      ") — giao kèo trao đổi quyền lực không thể bật khi còn nhân vật vị thành niên.";
  return "";
}

// ---------------------------------------------------------------- cổng người lớn dùng chung
// Truyện "đang ở chế độ người lớn" khi lớp giao kèo trao đổi quyền lực (BDSM) đang BẬT.
// Đây là dấu hiệu DUY NHẤT được lưu xuống đĩa; thể loại có cờ `bdsm` chỉ dùng lúc tạo.
export function laCheDoNguoiLon(story) {
  return !!(story && story.giaoKeo && story.giaoKeo.bat);
}

// CỔNG CHUNG cho mọi đường vào nội dung người lớn (bật giao kèo, Tạo nhanh, thể loại
// BDSM, file nhập, và cả lúc GHI cốt truyện). Trả chuỗi lý do; rỗng = được phép.
//
// Nguồn sự thật là TỪNG NHÂN VẬT qua `laNguoiLon()`: tuổi số dưới 18 khoá cứng, còn tuổi
// KHÔNG xác định thì KHÔNG được coi là người lớn — chỉ cờ xác nhận tường minh `nguoiLon`
// mới tính. Vì vậy không nhánh nào (kể cả file nhập mang sẵn cờ) tự ý mở lớp người lớn.
//
// Cờ `nguoiLon` hàng loạt được ghi ở DUY NHẤT hàm `xacNhanMoiNguoiLon()` bên dưới, và chỉ
// sau khi người dùng đã xác nhận 18+ tường minh cho cả truyện.
export function chanNoiDungNguoiLon(story) {
  if (!story) return "Chưa có truyện.";
  const ds = story.nhanVats || [];
  if (!ds.length) return ""; // chưa có nhân vật nào ⇒ chưa có gì để vi phạm
  const tre = ds.filter((c) => tuoiSo(c) !== null && tuoiSo(c) < 18);
  if (tre.length) return chanGiaoKeo(story); // giữ nguyên thông điệp "dưới 18" cũ
  const chua = ds.filter((c) => !laNguoiLon(c));
  if (chua.length)
    return "Truyện đang ở chế độ người lớn nhưng có " + chua.length + " nhân vật CHƯA được xác nhận là người trưởng thành (" +
      chua.map((c) => c.ten).join(", ") +
      "). Tuổi không xác định KHÔNG được coi là người lớn — mở từng nhân vật và tích “Người trưởng thành (18+)”, hoặc tích xác nhận 18+ cho cả truyện, rồi bật lại lớp nội dung người lớn.";
  return "";
}

// Từ ngữ chỉ trẻ vị thành niên. Cố tình CỤ THỂ (để không bắt oan "trẻ trung", "nhỏ nhắn",
// "ba vết sẹo", "tư thế"…): chỉ những cụm nói thẳng tới tuổi nhỏ hoặc trường học.
const TU_VI_THANH_NIEN = [
  "vị thành niên", "chưa thành niên", "trẻ vị thành niên", "tuổi vị thành niên",
  "thiếu niên", "thiếu nữ", "trẻ con", "trẻ em", "trẻ nhỏ", "con nít", "đứa trẻ", "đứa nhỏ",
  "em bé", "bé trai", "bé gái", "cô bé", "cậu bé",
  "học sinh cấp 2", "học sinh cấp 3", "học sinh trung học", "học sinh tiểu học",
  "cấp hai", "cấp ba", "trung học cơ sở", "trung học phổ thông", "tiểu học", "mẫu giáo", "nhà trẻ",
  "chưa đủ 18", "chưa đủ tuổi", "dưới 18", "dưới tuổi", "chưa trưởng thành", "nhỏ tuổi", "còn nhỏ",
  "tuổi teen",
];

// DẤU HIỆU vị thành niên của một nhân vật (chuỗi rỗng = không thấy dấu hiệu).
// Quét `tuoi` (số ở MỌI dạng viết, kể cả chữ tiếng Việt), `moTa`, `ghiChu`, `vaiTro`.
// Dùng cho CỜ HÀNG LOẠT: nhân vật có dấu hiệu không bao giờ được ghi cờ tự động.
export function dauHieuViThanhNien(c) {
  if (!c) return "";
  const so = tuoiSo(c);
  if (so !== null && so < 18) return "ghi tuổi " + so + " (dưới 18)";
  for (const k of ["tuoi", "moTa", "ghiChu", "vaiTro"]) {
    const t = String(c[k] === undefined || c[k] === null ? "" : c[k]);
    if (!t.trim()) continue;
    const thap = t.toLowerCase();
    const chu = tuoiVietSangSo(t);
    if (chu !== null && chu < 18) return "trường “" + k + "” ghi tuổi bằng chữ (“" + t.trim().slice(0, 40) + "”)";
    const m = thap.match(/(?:^|[^\p{L}\d])(\d{1,3})\s*(?:tuổi|tổi|t\b)/u);
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n < 18) return "trường “" + k + "” ghi tuổi " + n + " (dưới 18)";
    }
    const lop = thap.match(/học\s*lớp\s*(\d{1,2})/);
    if (lop && Number(lop[1]) <= 12) return "trường “" + k + "” nói tới học lớp " + lop[1];
    for (const cum of TU_VI_THANH_NIEN) if (thap.indexOf(cum) >= 0) return "trường “" + k + "” có cụm “" + cum + "”";
  }
  return "";
}

// Nhân vật SẼ được ghi cờ khi người dùng xác nhận 18+ cho cả truyện: chưa có cờ, và
// KHÔNG có dấu hiệu vị thành niên.
export function dsSeGhiCoNguoiLon(story) {
  return ((story && story.nhanVats) || []).filter((c) => c && c.nguoiLon !== true && !dauHieuViThanhNien(c));
}

// Nhân vật KHÔNG được ghi cờ hàng loạt, kèm lý do — hộp xác nhận phải nêu riêng và người
// dùng phải sửa tuổi/mô tả của họ trước.
export function dsChanGhiCo(story) {
  const ra = [];
  for (const c of (story && story.nhanVats) || []) {
    const lyDo = dauHieuViThanhNien(c);
    if (lyDo) ra.push({ id: c.id, ten: (c && c.ten) || "(không tên)", lyDo });
  }
  return ra;
}

// Ghi cờ `nguoiLon = true` cho những nhân vật ĐỦ ĐIỀU KIỆN (xem `dsSeGhiCoNguoiLon`). Chỉ
// được gọi ngay sau khi người dùng xác nhận 18+ tường minh cho cả truyện — và người dùng
// đã được xem ĐÚNG danh sách này trong hộp xác nhận. Nhân vật ghi tuổi dưới 18 (số hoặc
// chữ) và nhân vật có dấu hiệu vị thành niên KHÔNG BAO GIỜ được ghi cờ hàng loạt.
export function xacNhanMoiNguoiLon(story) {
  for (const c of dsSeGhiCoNguoiLon(story)) c.nguoiLon = true;
  return story;
}

const FALLBACK_GIAOKEO = {
  bat: false,
  vaiNguoiChoi: "sub",
  tuKhoaDung: "đỏ",
  kieuQuanHe: "",
  mucDo: 3,
  nhipDo: "theo-dien-bien",
  doDai: "vua",
  ngonNgu: "tu-nhien",
  soThich: [],
  gioiHanCung: "",
  gioiHanMem: "",
  khongKhi: "",
  nguoiLon: false, // xác nhận 18+: thiếu cờ này thì KHÔNG được bật lớp BDSM
  danhXung: "",
  luatCanh: "",
  chamSocSau: "",
  luuY: "",
};

export function giaoKeoMacDinh() {
  let g = null;
  try {
    g = R.GiaoKeoMacDinh && R.GiaoKeoMacDinh();
  } catch (e) {
    console.error("Không đọc được GiaoKeoMacDinh(), dùng mặc định.", e);
  }
  const out = Object.assign({}, FALLBACK_GIAOKEO, g || {});
  // mảng phải được sao chép, nếu không mọi truyện sẽ dùng chung một tham chiếu
  out.soThich = Array.isArray(out.soThich) ? out.soThich.slice() : [];
  return out;
}

// Truyện tạo trước khi có lớp giao kèo sẽ tự được bù mặc định.
export function giaoKeoOf(story) {
  if (!story) return giaoKeoMacDinh();
  if (!story.giaoKeo) story.giaoKeo = giaoKeoMacDinh();
  else story.giaoKeo = Object.assign(giaoKeoMacDinh(), story.giaoKeo);
  if (!Array.isArray(story.giaoKeo.soThich)) story.giaoKeo.soThich = [];
  return story.giaoKeo;
}

// ---------------------------------------------------------------- Chế độ Đạo diễn
// Mặc định TẮT với mọi truyện (kể cả truyện cũ), và tắt chỉ ẩn phần hiển thị —
// không bao giờ xoá dữ liệu đính chính/hướng người dùng đã tạo.
export function daoDienMacDinh() {
  return { bat: false, dinhChinh: [], huong: [] };
}

// Bù mặc định cho bản lưu cũ / file nhập thiếu. `bat` chỉ là cờ hiển thị.
export function daoDienOf(story) {
  if (!story) return daoDienMacDinh();
  if (!story.daoDien || typeof story.daoDien !== "object") story.daoDien = daoDienMacDinh();
  const d = story.daoDien;
  if (!Array.isArray(d.dinhChinh)) d.dinhChinh = [];
  if (!Array.isArray(d.huong)) d.huong = [];
  d.bat = !!d.bat;
  return d;
}

export async function createStory(data) {
  const mode = data.mode || "chuong";
  const story = {
    id: uid("ct"),
    ten: data.ten || "Cốt truyện chưa đặt tên",
    moTa: data.moTa || "",
    theLoaiId: data.theLoaiId || "",
    theLoaiTen: data.theLoaiTen || "",
    emoji: data.emoji || "✦",
    boiCanh: data.boiCanh || "",
    luatTheGioi: data.luatTheGioi || "",
    mode,
    giaoKeo: Object.assign(giaoKeoMacDinh(), data.giaoKeo || {}),
    nguoiChoi: { ten: data.nguoiChoiTen || "Bạn", moTa: data.nguoiChoiMoTa || "", ngoaiHinhId: "" },
    nhanVats: [],
    chuongs: [],
    hoiThoais: [],
    bienNienSu: [],
    anh: [], // chỉ mục ảnh cảnh (không chứa dữ liệu ảnh — ảnh nằm ở kv.thuVienAnh)
    nhip: "cham", // nhịp phát triển nội tâm & quan hệ (xem src/trangThai.js)
    canhDaKhep: [], // nhật ký cảnh đã duyệt — nguồn sự thật duy nhất của trạng thái
    daoDien: daoDienMacDinh(), // Chế độ Đạo diễn: đính chính (lớp phủ) + hướng tương lai
    thoiGian: thoiGianMacDinh(), // thời gian vắng mặt (xem src/thoiGian.js)
    ngoaiManHinh: [], // sổ chỉ-nối-thêm: sự kiện xảy ra khi người chơi vắng mặt
    taoLuc: Date.now(),
    suaLuc: Date.now(),
    phienBan: PHIEN_BAN_TRUYEN,
  };
  if (data.nhanVats && data.nhanVats.length) story.nhanVats = data.nhanVats;
  // Cổng người lớn ở đúng đường TẠO: thiếu xác nhận 18+ của BẤT KỲ nhân vật nào (hoặc có
  // nhân vật ghi tuổi dưới 18) ⇒ lớp giao kèo không thể bật.
  if (story.giaoKeo.bat && chanNoiDungNguoiLon(story)) story.giaoKeo.bat = false;
  if (mode === "chuong") story.chuongs.push(newChapter(1, { tieuDe: "Chương 1", mucTieu: data.mucTieuChuong1 || "" }));
  store.stories.unshift(story);
  reindex();
  try {
    await R.kv.cotTruyen.set(story.id, story);
    danhDauDaDoi();
  } catch (e) {
    store.stories = store.stories.filter((s) => s.id !== story.id);
    reindex();
    throw loiLuu("cốt truyện mới", e);
  }
  return story;
}

export async function saveStory(story) {
  // Cổng người lớn ở ĐÚNG đường ghi duy nhất của cốt truyện: nếu truyện có nhân vật ghi
  // tuổi dưới 18, hoặc có nhân vật chưa được xác nhận là người trưởng thành, thì lớp giao
  // kèo bị KHOÁ CỨNG — dù ô "người trưởng thành" được tích hay cờ nằm sẵn trong file nhập.
  // Không nhánh nào lách được qua đường này.
  if (story && story.giaoKeo && story.giaoKeo.bat && chanNoiDungNguoiLon(story)) story.giaoKeo.bat = false;
  const truoc = story.suaLuc;
  story.suaLuc = Date.now();
  try {
    await R.kv.cotTruyen.set(story.id, story);
    danhDauDaDoi();
  } catch (e) {
    story.suaLuc = truoc;
    throw loiLuu("cốt truyện “" + (story.ten || "") + "”", e);
  }
  store.stories.sort((a, b) => (b.suaLuc || 0) - (a.suaLuc || 0));
  reindex();
}

// Ghi lại bản ghi truyện mà KHÔNG đụng `suaLuc` và KHÔNG sắp xếp lại thư viện. Dùng cho
// những cập nhật rất thường xuyên của tính năng thời gian vắng mặt (mốc hoạt động gần
// nhất) — nếu dùng `saveStory` thì mỗi lần người dùng gõ phím, truyện lại nhảy lên đầu
// thư viện và bị coi là "vừa sửa".
export async function luuMoC(story) {
  if (!story || !story.id) return false;
  try {
    await R.kv.cotTruyen.set(story.id, story);
    danhDauDaDoi();
    return true;
  } catch (e) {
    console.error("[Truyện Vai] không ghi được mốc hoạt động:", e);
    return false;
  }
}

// ---------------------------------------------------------------- giao dịch nhiều khoá
// Một thao tác chạm nhiều khoá KV (xoá truyện, xoá hội thoại, cắt lịch sử, tạo nhánh)
// phải là MỘT giao dịch. Nếu không, một lỗi ở bước cuối sẽ để lại dữ liệu nửa vời —
// kiểu tệ nhất là truyện còn nguyên trong thư viện nhưng tin nhắn của nó đã bị xoá.
const KHO_KV = {
  cotTruyen: () => R.kv.cotTruyen,
  tinNhan: () => R.kv.tinNhan,
  thuVienAnh: () => R.kv.thuVienAnh,
  thuVienNgoaiHinh: () => R.kv.thuVienNgoaiHinh,
};

// `ds` = [["cotTruyen", id], ["tinNhan", convId], ["thuVienAnh", anhId], ["thuVienNgoaiHinh", hoSoId], …]
export async function chupNhieuKhoa(ds) {
  const snap = { cotTruyen: {}, tinNhan: {}, thuVienAnh: {}, thuVienNgoaiHinh: {} };
  for (const k of Array.isArray(ds) ? ds : []) {
    if (!k) continue;
    const kho = k[0];
    const id = k[1];
    if (!KHO_KV[kho] || !id) continue;
    if (Object.prototype.hasOwnProperty.call(snap[kho], id)) continue;
    // Đọc thẳng từ kv (không qua bộ đệm) để bản chụp đúng là thứ đang nằm trên đĩa.
    // Đọc lỗi ⇒ ném ra TRƯỚC khi động vào bất cứ thứ gì: chưa ghi thì chưa cần khôi phục.
    snap[kho][id] = await KHO_KV[kho]().get(id);
  }
  return snap;
}

// Trả mọi khoá đã chụp về đúng giá trị cũ (giá trị rỗng ⇒ xoá khoá). Trả về số khoá
// không khôi phục được (0 = hoàn hảo).
export async function traNhieuKhoa(snap) {
  let hong = 0;
  for (const kho in snap) {
    const f = KHO_KV[kho] && KHO_KV[kho]();
    if (!f) continue;
    for (const id in snap[kho]) {
      const v = snap[kho][id];
      try {
        if (v === undefined || v === null) await f.delete(id);
        else await f.set(id, v);
      } catch (e) {
        hong++;
        console.error("[Truyện Vai] không trả lại được " + kho + "/" + id, e);
      }
    }
  }
  return hong;
}

// Chạy `chay()` trong một giao dịch trên các khoá đã liệt kê. Hỏng ở bất kỳ bước nào ⇒
// trả mọi khoá về nguyên trạng rồi ném tiếp lỗi gốc.
export async function giaoDichKV(ds, chay) {
  const snap = await chupNhieuKhoa(ds);
  try {
    return await chay();
  } catch (e) {
    const hong = await traNhieuKhoa(snap);
    if (hong) console.error("[Truyện Vai] giao dịch: " + hong + " khoá không khôi phục được");
    throw e;
  }
}

export async function deleteStory(id) {
  const story = getStory(id);
  const hts = story ? (story.hoiThoais || []).map((c) => c.id) : [];
  const anhs = story ? anhCua(story).map((a) => a.id) : [];
  const ds = [["cotTruyen", id]].concat(hts.map((x) => ["tinNhan", x]), anhs.map((x) => ["thuVienAnh", x]));
  // Bộ đệm RAM cũng phải nằm trong giao dịch: khôi phục khoá KV mà bộ đệm vẫn rỗng thì
  // lần đọc sau sẽ tưởng hội thoại trống rồi ghi đè mất dữ liệu thật.
  const cacheTn = {};
  const cacheAnh = {};
  const traRam = () => {
    for (const k in cacheTn) {
      if (cacheTn[k] === undefined) delete store.messagesCache[k];
      else store.messagesCache[k] = cacheTn[k];
    }
    for (const k in cacheAnh) {
      if (cacheAnh[k] === undefined) delete store.anhCache[k];
      else store.anhCache[k] = cacheAnh[k];
    }
  };
  try {
    await giaoDichKV(ds, async () => {
      if (story) {
        for (const c of hts) {
          cacheTn[c] = store.messagesCache[c];
          delete store.messagesCache[c];
          await R.kv.tinNhan.delete(c);
        }
        for (const a of anhs) {
          cacheAnh[a] = store.anhCache[a];
          delete store.anhCache[a];
          await R.kv.thuVienAnh.delete(a);
        }
      }
      await R.kv.cotTruyen.delete(id);
      danhDauDaDoi();
    });
  } catch (e) {
    traRam();
    throw loiLuu("cốt truyện", e);
  }
  store.stories = store.stories.filter((s) => s.id !== id);
  reindex();
}

// ---------------------------------------------------------------- ảnh cảnh
// Dữ liệu ảnh (dataUrl) nằm riêng trong kv.thuVienAnh để thân truyện và mảng
// tin nhắn luôn nhẹ; `story.anh` chỉ giữ chỉ mục mô tả ảnh cho thư viện.
export function newAnh(data = {}) {
  return Object.assign(
    {
      id: uid("anh"),
      dataUrl: "",
      prompt: "",
      loaiTru: "",
      phongCach: "",
      kichThuoc: "",
      chuThich: "",
      convId: "",
      // Hồ sơ ngoại hình đã dùng để ghép prompt cho khung hình này (để xuất riêng một
      // truyện kèm đúng những hồ sơ được tham chiếu, và để biết ảnh có ai trong đó).
      hoSoIds: [],
      luc: Date.now(),
    },
    data
  );
}

export function anhCua(story) {
  if (!story) return [];
  if (!Array.isArray(story.anh)) story.anh = [];
  return story.anh;
}

export function anhMeta(story, id) {
  return anhCua(story).find((a) => a.id === id) || null;
}

// Đọc một bản ghi ảnh. KHÔNG nuốt lỗi đọc: "không đọc được" khác hẳn "không có ảnh".
// Nuốt lỗi ở đây là nguồn của lỗi xuất bản sao lưu thiếu ảnh mà vẫn báo thành công;
// đường chỉ để hiển thị thì dùng `getAnhMem()`.
export async function getAnh(id) {
  if (!id) return null;
  if (store.anhCache[id]) return store.anhCache[id];
  let rec;
  try {
    rec = await R.kv.thuVienAnh.get(id);
  } catch (e) {
    throw loiLuu("ảnh cảnh", e, "đọc");
  }
  if (rec) {
    // Ảnh chưa từng đổi hình dạng nên không có bước nâng cấp nào; vẫn KIỂM để bản ghi dị
    // dạng hiện ra trong màn Tự kiểm tra (không sửa, không xoá).
    const kq = kiemTraAnh(rec);
    if (!kq.ok) ghiLoiHinhDang("anh", id, rec.prompt || rec.chuThich || "", kq);
    store.anhCache[id] = rec;
  }
  return rec || null;
}

// Bản dễ tính cho đường CHỈ HIỂN THỊ (mở ảnh, avatar...): lỗi đọc coi như không có ảnh,
// người dùng chỉ thấy khung ảnh trống chứ không bị chặn cả màn hình.
export async function getAnhMem(id) {
  try {
    return await getAnh(id);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function luuAnh(story, meta) {
  const full = Object.assign({}, meta);
  const anhTruoc = anhCua(story).slice();
  const cacheTruoc = store.anhCache[full.id];
  store.anhCache[full.id] = full;
  const light = Object.assign({}, full);
  delete light.dataUrl;
  // Chỉ mục nhẹ được cập nhật ngay để thư viện phản hồi tức thì; nếu ghi thất bại
  // thì trả lại đúng trạng thái trước đó (cả chỉ mục lẫn bộ đệm) rồi báo lỗi.
  story.anh = [light].concat(anhTruoc.filter((a) => a.id !== full.id));
  try {
    await R.kv.thuVienAnh.set(full.id, full);
    danhDauDaDoi();
  } catch (e) {
    if (cacheTruoc === undefined) delete store.anhCache[full.id];
    else store.anhCache[full.id] = cacheTruoc;
    story.anh = anhTruoc;
    throw loiLuu("ảnh cảnh", e);
  }
  return light;
}

export async function xoaAnh(story, id) {
  const anhTruoc = anhCua(story).slice();
  const cacheTruoc = store.anhCache[id];
  delete store.anhCache[id];
  story.anh = anhTruoc.filter((a) => a.id !== id);
  try {
    await R.kv.thuVienAnh.delete(id);
  } catch (e) {
    if (cacheTruoc !== undefined) store.anhCache[id] = cacheTruoc;
    story.anh = anhTruoc;
    throw loiLuu("thao tác xoá ảnh", e);
  }
}

// ---------------------------------------------------------------- tin nhắn
export async function loadMessages(convId) {
  if (!convId) return [];
  if (store.messagesCache[convId]) return store.messagesCache[convId];
  let arr;
  try {
    arr = (await R.kv.tinNhan.get(convId)) || [];
  } catch (e) {
    // Không đọc được thì KHÔNG được coi như hội thoại trống — nếu không, lần ghi
    // tiếp theo sẽ thay dữ liệu thật bằng một mảng rỗng.
    throw loiLuu("tin nhắn của hội thoại", e, "đọc");
  }
  store.messagesCache[convId] = napBanGhi(arr, "tin-nhan", convId);
  return store.messagesCache[convId];
}

export function getMessages(convId) {
  return store.messagesCache[convId] || [];
}

// Ghi mảng tin nhắn xuống kv. Trả về mảng đã ghi (đã cắt bớt nếu quá dài).
async function ghiTinNhan(convId, arr) {
  const gon = arr.length > CFG.luuToiDaTinNhan ? arr.slice(arr.length - CFG.luuToiDaTinNhan) : arr;
  try {
    await R.kv.tinNhan.set(convId, gon);
  } catch (e) {
    throw loiLuu("tin nhắn của hội thoại", e);
  }
  store.messagesCache[convId] = gon;
  return gon;
}

// Ghi lại bộ đệm hiện tại. Ném lỗi nếu không ghi được — hàm gọi phải tự khôi phục
// giá trị cũ (xem `luuTinNhan` trong app.js) rồi hiện thông báo cho người dùng.
export async function persistMessages(convId) {
  const arr = store.messagesCache[convId] || [];
  return ghiTinNhan(convId, arr);
}

export function makeMessage(vai, noiDung, extra = {}) {
  return Object.assign(
    { id: uid("tn"), vai, noiDung: noiDung || "", luc: Date.now() },
    extra
  );
}

export async function pushMessage(convId, msg) {
  const arr = await loadMessages(convId);
  arr.push(msg);
  try {
    await ghiTinNhan(convId, arr);
    danhDauDaDoi();
  } catch (e) {
    arr.pop();
    throw e;
  }
  return store.messagesCache[convId];
}

export async function replaceMessages(convId, arr) {
  const truoc = store.messagesCache[convId] || [];
  store.messagesCache[convId] = arr;
  try {
    await ghiTinNhan(convId, arr);
    danhDauDaDoi();
  } catch (e) {
    store.messagesCache[convId] = truoc;
    throw e;
  }
  return store.messagesCache[convId];
}

// ---------------------------------------------------------------- truy vấn
export function chapterOfConv(story, conv) {
  if (!conv || !conv.chuongId) return null;
  return story.chuongs.find((c) => c.id === conv.chuongId) || null;
}

export function charById(story, id) {
  return story.nhanVats.find((c) => c.id === id) || null;
}

export function charsOf(story, ids) {
  return (ids || []).map((id) => charById(story, id)).filter(Boolean);
}

export function convsOfChapter(story, chapterId) {
  return story.hoiThoais.filter((c) => c.chuongId === chapterId);
}

export function looseConversations(story) {
  return story.hoiThoais.filter((c) => !c.chuongId || !story.chuongs.some((ch) => ch.id === c.chuongId));
}

export function storyStats(story) {
  const msgCount = story.hoiThoais.reduce((a, c) => a + (c.soTinNhan || 0), 0);
  return { convs: story.hoiThoais.length, chars: story.nhanVats.length, msgs: msgCount };
}

export function isGroupConv(story, conv) {
  return (conv.nhanVatIds || []).length > 1;
}

// ---------------------------------------------------------------- chuẩn hoá dữ liệu
// Dùng khi nhập file (và làm mặc định bù trường thiếu cho bản lưu cũ). Mọi trường
// đều được bù về đúng kiểu để phần còn lại của app không phải kiểm tra lại.
// v3: hội thoại có `hienDien` (người đang có mặt) + `canhRieng`; tin nhắn AI có thể
// có `nvIds` (nhiều nhân vật trong một đoạn) và `rieng` (thuộc cảnh riêng). Mọi
// trường đều có mặc định an toàn nên bản lưu cũ mở lên vẫn chạy đúng.
// v4: truyện có `nhip` (nhịp phát triển) + `canhDaKhep` (nhật ký cảnh đã duyệt, kèm
// ký ức và delta quan hệ/nhân vật — xem `src/trangThai.js`); tin nhắn `he` có thể
// mang `khep` (id cảnh) cho dòng "Đã khép cảnh". Bản lưu cũ (không có các trường
// này) vẫn mở đúng: mọi chỗ đọc đều chịu được dữ liệu thiếu.
// v5: truyện có `daoDien` (Chế độ Đạo diễn: `dinhChinh` = lớp phủ đính chính đảo
// ngược được, `huong` = các hướng phát triển tương lai kèm tiến độ). Mặc định tắt.
// v6: truyện có `thoiGian` (chế độ/ngưỡng thời gian vắng mặt + phiên gần nhất) và
// `ngoaiManHinh` (sổ chỉ-nối-thêm sự kiện xảy ra khi người chơi vắng mặt, kèm ai biết
// và mức hé lộ — xem `src/thoiGian.js`). Mặc định: Tạm dừng, tắt mô phỏng.
export const PHIEN_BAN_TRUYEN = 7;

export function chuanHoaTinNhan(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const vai = ["nguoi", "ai", "anh", "he"].indexOf(m.vai) >= 0 ? m.vai : "ai";
    const x = Object.assign({}, m, {
      id: m.id || uid("tn"),
      vai,
      noiDung: String(m.noiDung === undefined || m.noiDung === null ? "" : m.noiDung),
      luc: Number(m.luc) || Date.now(),
    });
    // Tin nhắn nhiều nhân vật: `nvIds` là danh sách người đã tham gia. Tin cũ chỉ
    // có `nvId` vẫn đọc được bình thường (suy ra `nvIds` một phần tử).
    const nvIds = (Array.isArray(m.nvIds) ? m.nvIds : []).filter((v) => typeof v === "string" && v);
    if (!nvIds.length && typeof m.nvId === "string" && m.nvId) nvIds.push(m.nvId);
    if (nvIds.length > 1) x.nvIds = nvIds;
    else delete x.nvIds;
    // `rieng` = id nhân vật của cảnh riêng đang mở lúc tin nhắn này ra đời.
    if (typeof m.rieng === "string" && m.rieng) x.rieng = m.rieng;
    else delete x.rieng;
    out.push(x);
  }
  return out;
}

// Chuẩn hoá lớp Chế độ Đạo diễn khi nhập file / mở bản lưu cũ. Mọi trường đều có
// mặc định để phần còn lại của app không phải kiểm tra lại; dữ liệu người dùng tạo
// (đính chính, hướng, tiến độ) không bao giờ bị xoá ở đây.
function chuanHoaDaoDien(raw, s) {
  const d = raw && typeof raw === "object" ? raw : {};
  const nvCoThat = (id) => id === "nguoi" || (s.nhanVats || []).some((c) => c.id === id);
  const dinhChinh = (Array.isArray(d.dinhChinh) ? d.dinhChinh : []).filter(Boolean).map((x) =>
    Object.assign(
      {
        id: uid("dc"),
        loai: "nhanvat",
        nvId: "",
        truong: "",
        tu: "",
        den: "",
        chieu: "",
        muc: null,
        cu: "",
        moi: "",
        lyDo: "",
        nguonCanh: [],
        luc: Date.now(),
        bat: true,
        xoa: false,
        xoaLuc: 0,
      },
      x,
      {
        id: x.id || uid("dc"),
        loai: x.loai === "quanhe" ? "quanhe" : "nhanvat",
        nvId: String(x.nvId || ""),
        truong: String(x.truong || ""),
        tu: String(x.tu || ""),
        den: String(x.den || ""),
        chieu: String(x.chieu || ""),
        muc: x.muc === null || x.muc === undefined || x.muc === "" ? null : Number(x.muc),
        cu: String(x.cu || ""),
        moi: String(x.moi || ""),
        lyDo: String(x.lyDo || ""),
        nguonCanh: (Array.isArray(x.nguonCanh) ? x.nguonCanh : []).filter((v) => typeof v === "string" && v),
        luc: Number(x.luc) || Date.now(),
        bat: x.bat !== false,
        xoa: !!x.xoa,
        xoaLuc: Number(x.xoaLuc) || 0,
      }
    )
  );
  const huong = (Array.isArray(d.huong) ? d.huong : []).filter(Boolean).map((x) => {
    const k = x.keHoach && typeof x.keHoach === "object" ? x.keHoach : {};
    return Object.assign({}, x, {
      id: x.id || uid("hd"),
      ten: String(x.ten || ""),
      phamVi: ["truyen", "nhanvat", "quanhe"].indexOf(x.phamVi) >= 0 ? x.phamVi : "truyen",
      nvId: nvCoThat(x.nvId) ? String(x.nvId) : "",
      tu: nvCoThat(x.tu) ? String(x.tu) : "",
      den: nvCoThat(x.den) ? String(x.den) : "",
      mongMuon: String(x.mongMuon || ""),
      nhip: ["cham", "vua", "nhanh"].indexOf(x.nhip) >= 0 ? x.nhip : "vua",
      soCanh: Math.max(1, Math.min(20, Math.round(Number(x.soCanh) || 4))),
      rangBuoc: String(x.rangBuoc || ""),
      keHoach: {
        trangThaiDau: String(k.trangThaiDau || ""),
        mucTieu: String(k.mucTieu || ""),
        buoc: (Array.isArray(k.buoc) ? k.buoc : []).map((v) => String(v || "")).filter(Boolean),
        dauHieu: String(k.dauHieu || ""),
        xungDot: String(k.xungDot || ""),
        dieuKienDung: String(k.dieuKienDung || ""),
      },
      trangThai: ["hoatDong", "tamDung", "hoanTat", "huy"].indexOf(x.trangThai) >= 0 ? x.trangThai : "hoatDong",
      tienDo: (Array.isArray(x.tienDo) ? x.tienDo : []).filter(Boolean).map((e) =>
        Object.assign({}, e, {
          id: e.id || uid("td"),
          htId: String(e.htId || ""),
          canhId: String(e.canhId || ""),
          luc: Number(e.luc) || Date.now(),
          trangThai: ["chuaCham", "dangTienTrien", "biCan", "canDoiHuong", "coTheHoanTat"].indexOf(e.trangThai) >= 0 ? e.trangThai : "chuaCham",
          bangChung: String(e.bangChung || ""),
          buocTiep: String(e.buocTiep || ""),
        })
      ),
      luc: Number(x.luc) || Date.now(),
      suaLuc: Number(x.suaLuc) || Date.now(),
    });
  });
  return { bat: !!d.bat, dinhChinh, huong };
}

// `tuyChon.choNhap` = đang chuẩn hoá một FILE NHẬP (khác với đọc từ kv): khi đó lớp giao
// kèo chỉ được giữ nếu người nhập vừa xác nhận 18+ (`tuyChon.dongY18`).
export function chuanHoaTruyen(raw, tuyChon) {
  const o = tuyChon || {};
  const s = Object.assign({}, raw || {});
  s.id = s.id || uid("ct");
  s.ten = String(s.ten || "Cốt truyện chưa đặt tên");
  s.moTa = String(s.moTa || "");
  s.boiCanh = String(s.boiCanh || "");
  s.luatTheGioi = String(s.luatTheGioi || "");
  s.theLoaiId = String(s.theLoaiId || "");
  s.theLoaiTen = String(s.theLoaiTen || "");
  s.emoji = s.emoji || "✦";
  s.mode = s.mode === "songSong" ? "songSong" : "chuong";
  s.nguoiChoi = Object.assign({ ten: "Bạn", moTa: "" }, s.nguoiChoi || {});
  // Người chơi liên kết hồ sơ ngoại hình y như nhân vật: chỉ giữ id dạng chuỗi, KHÔNG tự
  // liên kết theo tên. Truyện cũ không có trường này ⇒ "" (không liên kết).
  s.nguoiChoi.ngoaiHinhId = typeof s.nguoiChoi.ngoaiHinhId === "string" ? s.nguoiChoi.ngoaiHinhId : "";
  s.nhanVats = (Array.isArray(s.nhanVats) ? s.nhanVats : []).filter(Boolean).map((c) => newCharacter(c));
  // Ảnh đại diện nhân vật đến từ file nhập cũng là dữ liệu không đáng tin.
  for (const c of s.nhanVats) if (c.anh && !laDataUrlAnh(c.anh)) c.anh = "";
  // Liên kết hồ sơ ngoại hình: chỉ giữ id dạng chuỗi. KHÔNG tự liên kết theo tên —
  // trùng tên không có nghĩa là cùng một người.
  for (const c of s.nhanVats) {
    c.ngoaiHinhId = typeof c.ngoaiHinhId === "string" ? c.ngoaiHinhId : "";
    c.bietDanh = String(c.bietDanh === undefined || c.bietDanh === null ? "" : c.bietDanh).trim();
  }
  s.chuongs = (Array.isArray(s.chuongs) ? s.chuongs : []).filter(Boolean).map((c, i) =>
    Object.assign({ id: uid("ch"), so: i + 1, tieuDe: "Chương " + (i + 1), mucTieu: "", tomTat: "", daKetThuc: false, taoLuc: Date.now() }, c, {
      id: c.id || uid("ch"),
      so: Number(c.so) || i + 1,
    })
  );
  s.hoiThoais = (Array.isArray(s.hoiThoais) ? s.hoiThoais : []).filter(Boolean).map((c) => {
    const x = newConversation(c);
    x.nhanVatIds = (Array.isArray(x.nhanVatIds) ? x.nhanVatIds : []).filter((id) => s.nhanVats.some((n) => n.id === id));
    x.chuongId = s.chuongs.some((ch) => ch.id === x.chuongId) ? x.chuongId : null;
    // Hiện diện & cảnh riêng: bù mặc định an toàn cho bản lưu cũ / file nhập thiếu.
    // Thiếu/`null` → danh sách tham gia mặc định; mảng (kể cả rỗng) giữ nguyên ý
    // nghĩa đã ghi, chỉ bỏ những id không còn là người tham gia.
    x.hienDien = Array.isArray(x.hienDien)
      ? x.hienDien.filter((id) => x.nhanVatIds.indexOf(id) >= 0)
      : x.nhanVatIds.slice();
    const cr = x.canhRieng && typeof x.canhRieng === "object" ? x.canhRieng : null;
    x.canhRieng = cr && x.nhanVatIds.indexOf(cr.nvId) >= 0 ? { nvId: cr.nvId, moLuc: Number(cr.moLuc) || Date.now() } : null;
    x.daCoCanhRieng = !!x.daCoCanhRieng || !!x.canhRieng;
    // Khép cảnh: gợi ý của AI là trạng thái tạm, không giữ qua bản lưu.
    x.goiKhep = false;
    x.khepGoc = Math.max(0, Number(x.khepGoc) || 0);
    // Nhánh: `vgMocLuc` (điểm rẽ) + sổ hé lộ riêng của nhánh. Nguồn trỏ tới hội thoại
    // không còn tồn tại thì bỏ — nó vĩnh viễn không còn tin nhắn để chống lưng.
    if (x.vgMocLuc !== undefined && x.vgMocLuc !== null) x.vgMocLuc = Math.max(0, Number(x.vgMocLuc) || 0);
    else delete x.vgMocLuc;
    x.vgHeLo = chuanHoaVgHeLo(x.vgHeLo, s).filter((r) => s.hoiThoais.some((h) => h.id === r.htId));
    return x;
  });
  // Nhịp phát triển + nhật ký cảnh đã khép. Trạng thái nhập vai được TÍNH RA từ
  // `canhDaKhep` (xem `src/trangThai.js`), nên chỉ cần chuẩn hoá danh sách này.
  s.nhip = ["cham", "thichUng", "kichTinh"].indexOf(s.nhip) >= 0 ? s.nhip : "cham";
  s.canhDaKhep = (Array.isArray(s.canhDaKhep) ? s.canhDaKhep : []).filter(Boolean).map((c) => {
    const htIds = (Array.isArray(c.htIds) ? c.htIds : (c.htId ? [c.htId] : []))
      .filter((id) => s.hoiThoais.some((x) => x.id === id));
    const x = Object.assign({}, c, {
      id: c.id || uid("canh"),
      htId: s.hoiThoais.some((h) => h.id === c.htId) ? c.htId : (htIds[0] || ""),
      htIds,
      tomTat: String(c.tomTat || ""),
      moc: String(c.moc || ""),
      kyUc: Array.isArray(c.kyUc) ? c.kyUc : [],
      quanHe: Array.isArray(c.quanHe) ? c.quanHe : [],
      nhanVat: Array.isArray(c.nhanVat) ? c.nhanVat : [],
      luc: Number(c.luc) || Date.now(),
      huy: !!c.huy,
      huyLuc: Number(c.huyLuc) || 0,
    });
    return x;
  })
    // Cảnh không gắn được với hội thoại nào là dữ liệu rác: nếu giữ lại, nó sẽ được
    // tính cho MỌI hội thoại. Bỏ hẳn.
    .filter((x) => x.htId);
  s.bienNienSu = (Array.isArray(s.bienNienSu) ? s.bienNienSu : []).filter(Boolean).map((b) =>
    typeof b === "string"
      ? { id: uid("bn"), noiDung: b, nguon: "", luc: Date.now() }
      : Object.assign({ id: uid("bn"), noiDung: "", nguon: "", luc: Date.now() }, b)
  );
  s.anh = (Array.isArray(s.anh) ? s.anh : []).filter(Boolean).map((a) => {
    const x = Object.assign({}, a);
    x.hoSoIds = (Array.isArray(x.hoSoIds) ? x.hoSoIds : []).filter((id) => typeof id === "string" && id);
    return x;
  });
  s.taoLuc = Number(s.taoLuc) || Date.now();
  s.suaLuc = Number(s.suaLuc) || Date.now();
  // Lớp giao kèo: KHOÁ CỨNG khi truyện có nhân vật ghi tuổi dưới 18. Với file nhập thì
  // còn phải qua xác nhận 18+ của lần nhập đó (`tuyChon.dongY18`) — cờ xác nhận cũ nằm
  // trong file không được thay cho lời xác nhận của người đang nhập.
  s.giaoKeo = Object.assign(giaoKeoMacDinh(), s.giaoKeo || {});
  if (o.choNhap) {
    if (o.dongY18) {
      // Người nhập vừa xác nhận 18+ cho cả file ⇒ ghi cờ tường minh cho từng nhân vật
      // (bỏ qua nhân vật ghi tuổi số dưới 18) để cờ cấp truyện và cấp nhân vật khớp nhau.
      if (s.giaoKeo.bat) { s.giaoKeo.nguoiLon = true; xacNhanMoiNguoiLon(s); }
    } else s.giaoKeo.bat = false;
  }
  // Cổng người lớn chạy SAU cùng, sau khi đã áp lời xác nhận của lần nhập.
  if (chanNoiDungNguoiLon(s)) s.giaoKeo.bat = false;
  if (!s.lorebook || typeof s.lorebook !== "object") s.lorebook = { ten: "", phienBan: Date.now(), entries: [] };
  s.daoDien = chuanHoaDaoDien(s.daoDien, s);
  s.thoiGian = chuanHoaThoiGian(s.thoiGian);
  s.ngoaiManHinh = suKienCua(s);
  // Đọc/ nhập xong thì dọn luôn nguồn hé lộ đã chết (tin nhắn không còn) — trạng thái
  // "ai biết gì" vì thế không bao giờ phụ thuộc vào một tin nhắn đã biến mất.
  tinhLaiBiet(s, null);
  s.phienBan = PHIEN_BAN_TRUYEN;
  return s;
}

// ==========================================================================
//  MIGRATE + KIỂM HÌNH DẠNG — cửa vào duy nhất khi đưa dữ liệu về hình dạng hiện tại
// ==========================================================================
// `migrate(raw, loai)` là điểm vào TẬP TRUNG của Giai đoạn 5: nó tra sổ đăng ký phiên bản
// (`src/schema.js`), đi qua đúng những bước còn thiếu, rồi gọi hàm chuẩn hoá CUỐI. Không có
// logic chuẩn hoá nào được viết lại ở đây — `chuanHoaTruyen`/`chuanHoaTinNhan`/`chuanHoaHoSo`
// vẫn là nguồn duy nhất của hình dạng hiện tại (nhờ vậy "chạy bóng" migrate với `chuanHoa*`
// luôn trùng khớp, và mọi dữ liệu đã đúng phiên bản đi qua đây mà không đổi gì).
export function migrate(raw, loai, tuyChon) {
  if (loai === "truyen") return migrateTruyen(raw, tuyChon);
  if (loai === "tin-nhan") return migrateTinNhan(raw);
  if (loai === "ho-so") return migrateHoSo(raw);
  if (loai === "anh") return migrateAnh(raw);
  throw new Error("migrate: loại bản ghi không rõ — " + String(loai));
}

export function migrateTruyen(raw, tuyChon) {
  const kq = migrateTheo(raw, PHIEN_BAN_TRUYEN, MIGRATION_TRUYEN, chuanHoaTruyen, tuyChon);
  if (kq.daNang || kq.vuotPhienBan) ghiMigrate("truyen", kq.tu, kq.den, kq.vuotPhienBan);
  return kq.ra;
}

// Tin nhắn không mang phiên bản riêng: chúng đi theo phiên bản của TRUYỆN chứa chúng, nên
// không có bước nào phải đi qua — chỉ có đúng một hàm chuẩn hoá.
export function migrateTinNhan(arr) {
  return chuanHoaTinNhan(arr);
}

export function migrateHoSo(raw) {
  const kq = migrateTheo(raw, PHIEN_BAN_HO_SO, MIGRATION_HO_SO, chuanHoaHoSo, undefined);
  if (kq.daNang || kq.vuotPhienBan) ghiMigrate("ho-so", kq.tu, kq.den, kq.vuotPhienBan);
  return kq.ra;
}

// Ảnh chưa từng đổi hình dạng (mọi trường đều do `newAnh()` sinh ra và không đổi tên), nên
// không có bước nâng cấp nào — đi qua đây chỉ để giữ MỘT cửa vào duy nhất.
export function migrateAnh(raw) {
  return raw;
}

// Kiểm hình dạng rồi nâng cấp — dùng cho MỌI đường nạp (kv lẫn file nhập).
//   · sai hình dạng  → ghi lại để màn Tự kiểm tra thấy (KHÔNG sửa, KHÔNG xoá, KHÔNG chặn)
//   · đã đúng hình dạng VÀ đúng phiên bản hiện tại → trả về ĐÚNG đối tượng nhận vào
//     (không sao chép — nhờ vậy đọc lại kv không làm mất tham chiếu mà luồng giao diện đang giữ)
//   · bản cũ / dị dạng → trả về bản đã nâng cấp (đối tượng mới)
export function napBanGhi(raw, loai, id, tuyChon) {
  const kq = kiemTheoLoai(loai, raw);
  const ten = laDoiTuong(raw) ? raw.ten || raw.tenChinh || "" : "";
  if (!kq.ok) ghiLoiHinhDang(loai, id || (laDoiTuong(raw) ? raw.id : ""), ten, kq);
  // Truyện đọc từ kv mà ĐÃ ở phiên bản hiện tại (hoặc mới hơn) thì trả về ĐÚNG đối tượng, không
  // chuẩn hoá lại. Hai lý do, cả hai đều là luật của dự án:
  //
  //   · Đối tượng truyện sống lâu qua các luồng bất đồng bộ (stream, lưu tin nhắn), nên đọc lại
  //     kv không được đổi tham chiếu khi bản ghi vốn đã đúng phiên bản.
  //   · Chuẩn hoá lại một bản ghi đã đúng phiên bản là SỬA dữ liệu (cắt tham chiếu trỏ vào thứ
  //     đã mất, đóng cảnh riêng không còn hợp lệ…) — mà những thứ đó chính là việc màn Tự kiểm
  //     tra phải BÁO, không phải việc đường nạp được phép lặng lẽ dọn. Bản ghi hỏng hình dạng
  //     vẫn được GHI NHẬN ở trên, và vẫn nằm nguyên trong kv.
  //
  // Dữ liệu từ TƯƠNG LAI (phiên bản mới hơn app) cũng giữ nguyên — không hạ phiên bản, không
  // cắt bỏ trường mà bản app này chưa biết — nhưng được ĐÁNH DẤU để người dùng biết mà cập nhật
  // app (xem `vuotPhienBan` trong `src/schema.js`). Tin nhắn, ảnh và hồ sơ ngoại hình luôn đi
  // qua chuẩn hoá như trước Giai đoạn 5 (chúng được sao chép ở mọi lần nạp, không ai giữ tham
  // chiếu — xem `loadMessages`/`nhanHoSo`).
  if (!tuyChon && loai === "truyen" && soPhienBan(raw) >= PHIEN_BAN_TRUYEN) {
    const tu = soPhienBan(raw);
    if (tu > PHIEN_BAN_TRUYEN) ghiMigrate("truyen", tu, PHIEN_BAN_TRUYEN, true);
    return raw;
  }
  return migrate(raw, loai, tuyChon);
}

// Truyện đọc từ kv: đường nạp quen thuộc (dùng `napBanGhi` để giữ nguyên đối tượng khi bản
// ghi đã đúng phiên bản — xem chú thích ở hàm đó).
function napTruyen(raw) {
  return napBanGhi(raw, "truyen");
}
