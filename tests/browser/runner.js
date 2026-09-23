// Truyện Vai — BỘ CHẠY KIỂM THỬ (bền vững, nằm trong src/ nên không mất giữa các phiên).
//
// Chạy TẤT CẢ trong MỘT lệnh, trong preview thật:
//   const t = await import("./src/tests/runner.js"); return await t.chayTatCa();
//
// Vì sao cần bộ chạy này: các bộ kiểm thử cũ là script rời, phải chạy bằng nhiều page_eval
// riêng và phụ thuộc thứ tự (mỗi bộ tự vá URL.createObjectURL / IDBObjectStore / cài AI giả
// rồi "khoá" bằng một cờ window.* — chạy bộ thứ hai trong cùng lần tải trang là dùng bẫy
// cũ với closure đã chết nên báo lỗi giả). Bộ chạy này:
//   1. nạp từng file bộ kiểm thử bằng fetch + `new Function` ⇒ MỖI BỘ MỘT PHẠM VI HÀM MỚI
//      (closure sạch), nên chạy lại bao nhiêu lần cũng đúng.
//   2. TRẢ LẠI mọi thứ bộ trước đã vá (URL.createObjectURL, HTMLAnchorElement.prototype.click,
//      IDBObjectStore.prototype.put/delete) + xoá các cờ "đã cài" + khôi phục plugin AI/máy vẽ
//      quanh mỗi bước ⇒ thứ tự các bộ không còn ảnh hưởng lẫn nhau.
//   3. Gác dữ liệu THẬT: chụp trước/sau và báo nếu lệch một byte; dọn dữ liệu test còn sót.
//
// Bộ kiểm thử vẫn là các file phẳng trong src/tests/*.js (nguồn của chúng nằm nguyên ở đó,
// đọc/sửa được như tài liệu). Bộ chạy KHÔNG sửa chúng.

const DUONG = "/src/tests/";

// ------------------------------------------------------------------ thứ tự chạy
// loai: "nen" = nền tảng (chạy, bỏ qua kết quả)
//       "dung" = dựng (cài AI giả / dữ liệu mẫu cho các bộ sau; bỏ qua kết quả)
//       "bo"   = bộ kiểm thử (đếm được/không đạt)
//       "phu"  = phụ trợ (KHÔNG chạy mặc định: ca AI THẬT, công cụ soi bố cục, dò lỗi)
export const DANH_MUC = [
  { ten: "audit-base", loai: "nen", ghiChu: "điểm neo __A + dựng/dọn truyện test" },

  { ten: "nh-fake-ai", loai: "dung", ghiChu: "AI giả + máy vẽ giả (thư viện ngoại hình)" },
  { ten: "nh-lib", loai: "bo", ghiChu: "logic + luồng giao diện thư viện ngoại hình" },
  { ten: "nh-io", loai: "bo", ghiChu: "xuất/nhập + lỗi lưu + cách ly dữ liệu thật" },
  { ten: "nh-fix5", loai: "bo", ghiChu: "năm lỗi đã báo của đợt thư viện ngoại hình" },
  { ten: "nh-thoat", loai: "bo", ghiChu: "prompt tạo ảnh bị đọc như mẫu pjs" },
  { ten: "nh-nguoichoi", loai: "bo", ghiChu: "người chơi cũng liên kết được hồ sơ" },
  { ten: "nh-anh-en", loai: "bo", ghiChu: "mô tả khung hình không trộn ngoại hình + khối EN" },

  { ten: "gy-fake-ai", loai: "dung", ghiChu: "AI giả (gợi ý lời đáp)" },
  { ten: "gy-goi-y", loai: "bo", ghiChu: "luồng gợi ý lời đáp" },
  { ten: "dk-loi-thoai", loai: "bo", ghiChu: "phân biệt đối thoại / hành động" },

  { ten: "helo-logic", loai: "bo", ghiChu: "logic sổ hé lộ" },
  { ten: "helo-cut", loai: "bo", ghiChu: "sổ hé lộ khi cắt/xoá lịch sử" },
  { ten: "helo-import", loai: "bo", ghiChu: "sổ hé lộ khi nhập truyện" },
  { ten: "helo-ui", loai: "bo", ghiChu: "giao diện sổ hé lộ" },

  { ten: "audit-t1", loai: "bo", ghiChu: "rà soát phát hành — T1" },
  { ten: "audit-t2", loai: "bo", ghiChu: "rà soát phát hành — T2" },
  { ten: "audit-t3", loai: "bo", ghiChu: "rà soát phát hành — T3" },
  { ten: "audit-t4", loai: "bo", ghiChu: "rà soát phát hành — T4" },
  { ten: "audit-t5", loai: "bo", ghiChu: "rà soát phát hành — T5" },
  { ten: "audit-t6", loai: "bo", ghiChu: "rà soát phát hành — T6" },
  { ten: "audit-t7", loai: "bo", ghiChu: "rà soát phát hành — T7" },
  { ten: "audit-t8", loai: "bo", ghiChu: "rà soát phát hành — T8" },

  { ten: "nhap-setup", loai: "dung", ghiChu: "dựng truyện test đầy đủ cho luồng nhập" },
  { ten: "nhap-check", loai: "bo", ghiChu: "toàn vẹn các bản nhập" },
  { ten: "nhap-isolation", loai: "bo", ghiChu: "tính cô lập giữa các bản nhập" },

  { ten: "gd1-tuoi", loai: "bo", ghiChu: "Giai đoạn 1 — an toàn nhân vật vị thành niên (tuổi/cổng/khung an toàn)" },

  // ---------------------------------------------------------------- phụ trợ (không chạy mặc định)
  { ten: "real-a", loai: "phu", ghiChu: "CA A — AI THẬT (tốn quota, không chạy tự động)" },
  { ten: "real-b", loai: "phu", ghiChu: "CA B — AI THẬT" },
  { ten: "real-c", loai: "phu", ghiChu: "CA C — AI THẬT" },
  { ten: "vg-base", loai: "phu", ghiChu: "khung dựng truyện cho ca thời gian vắng mặt" },
  { ten: "dd-setup", loai: "phu", ghiChu: "dựng truyện test cho chế độ Đạo diễn" },
  { ten: "dd-fake-ai", loai: "phu", ghiChu: "AI giả cho chế độ Đạo diễn" },
  { ten: "dd-fake-ai-loi", loai: "phu", ghiChu: "AI giả 'lỗi' cho chế độ Đạo diễn" },
  { ten: "nh-visual-setup", loai: "phu", ghiChu: "dựng trạng thái để soi bố cục bằng vision" },
  { ten: "lib-build", loai: "phu", ghiChu: "đối chiếu số schema giữa app và store" },
  { ten: "open-dialog", loai: "phu", ghiChu: "mở hộp thoại Nhập để soi bố cục (cần __TXT__)" },
  { ten: "helo-probe", loai: "phu", ghiChu: "dò vì sao lượt hai không ghi nguồn hé lộ" },
  { ten: "dbg-t3c", loai: "phu", ghiChu: "công cụ dò nút hộp thoại" },
  { ten: "nhap-setup-export", loai: "phu", ghiChu: "dựng lại truyện test rồi xuất ra file JSON" },
];

// ------------------------------------------------------------------ hằng số dọn dẹp
const PHAI_TRA = [
  "__NH_DL", "__NH_DL2", // cờ "đã cài bẫy tải file" của các bộ
];
const GIA_TAM = [
  "__NH_AI", "__NH_VE", "__GY_AI", "__vgFake", "__vgIds", "__vgBase", "__vgBaseReady",
  "__hlKq", "__hlUiKq", "__hlImpKq", "__hlCutKq", "__rec", "__lastInstruction", "__fakeAIErr",
  "__fileTxt", "__fileInp", "__x", "__dk_x", "__gy_x", "__rgA", "__rgB", "__rgC", "__nhapTest",
];

const GOC = { da: false };
function giuGoc() {
  if (GOC.da) return;
  GOC.createObjectURL = URL.createObjectURL;
  GOC.click = HTMLAnchorElement.prototype.click;
  GOC.idbPut = IDBObjectStore.prototype.put;
  GOC.idbDel = IDBObjectStore.prototype.delete;
  GOC.ai = root.aiTextPlugin;
  GOC.ve = root.textToImagePlugin;
  GOC.da = true;
}

// Trả mọi thứ về nguyên trạng trước khi chạy một bước: gỡ bẫy đã vá + xoá cờ "đã cài".
function traLaiVaLamSach() {
  giuGoc();
  try { URL.createObjectURL = GOC.createObjectURL; } catch (e) {}
  try { HTMLAnchorElement.prototype.click = GOC.click; } catch (e) {}
  try { IDBObjectStore.prototype.put = GOC.idbPut; } catch (e) {}
  try { IDBObjectStore.prototype.delete = GOC.idbDel; } catch (e) {}
  for (const k of PHAI_TRA) { try { delete window[k]; } catch (e) {} }
  const A = window.__A;
  if (A) { A.__daCai = false; A.fault = null; A.dem = {}; }
}

function xoaGiaTam() {
  for (const k of GIA_TAM) { try { delete window[k]; } catch (e) {} }
  root.aiTextPlugin = GOC.ai;
  root.textToImagePlugin = GOC.ve;
}

function donModal() {
  try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {}
}

// ------------------------------------------------------------------ nạp & chạy một file bộ
async function napNguon(ten) {
  // Nguồn có thể được TIÊM SẴN (window.__tvNguon[ten] = mã nguồn) — cần cho lúc bộ kiểm thử
  // không nằm trong src/ (src/ là public + tính quota nên test không được ở đó). Khi có bản
  // tiêm sẵn thì không cần fetch, nên bộ chạy dùng được với repo ngoài.
  const bang = typeof window !== "undefined" ? window.__tvNguon : null;
  if (bang && typeof bang[ten] === "string") return bang[ten];
  const url = DUONG + ten + ".js";
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Không nạp được " + url + " (HTTP " + r.status + ")");
  return await r.text();
}

// Gốc URL tuyệt đối của src/ — trang preview có <base href> trỏ về perchance.org, và khi mã
// bộ kiểm thử được chạy qua `new Function` (không có URL script thật) thì `import("/src/…")`
// không phân giải được. Đổi mọi `import("/src/…")` thành URL tuyệt đối.
function gocSrc() {
  const tuNgoai = typeof window !== "undefined" && window.__tvSrcBase;
  if (typeof tuNgoai === "string") return tuNgoai;
  try {
    if (typeof document !== "undefined" && document.baseURI) return new URL("src/", new URL("/", document.baseURI)).href;
  } catch (e) {}
  return "/src/";
}

async function chayFile(ten) {
  let src = await napNguon(ten);
  src = src.replace(/(import|fetch)\(\s*(["'])\/src\//g, "$1($2" + gocSrc());
  // Bọc trong một hàm async MỚI mỗi lần gọi ⇒ phạm vi/closure sạch; `return` trong file
  // chính là giá trị trả về; `await` cấp cao nhất chạy được trong async này.
  const f = new Function(
    "return (async () => {\n" + src + "\n})();\n//# sourceURL=" + DUONG + ten + ".js"
  );
  return await f();
}

// ------------------------------------------------------------------ chuẩn hoá kết quả trả về
// Các bộ trả về nhiều hình dạng khác nhau (do viết qua nhiều đợt). Nhận hết:
//   { tong, hong, log }  |  [ { ten|tenCa, ok, them|ct } ]  |  { ok, ... }  |  undefined
const tenCa = (x) => (x && (x.ten || x.tenCa || x.ca || x.name)) || "(không tên)";
const themCa = (x) => (x && (x.them || x.ct) !== undefined ? " — " + String(x.them || x.ct).slice(0, 160) : "");

function chuanHoaKetQua(kq, ten) {
  const ra = { ten, tong: 0, hong: 0, hongChi: [], log: [] };
  if (kq == null) return ra;

  // dạng mảng ca: [{ ten|tenCa|ca, ok|dat, them|ct }]
  if (Array.isArray(kq)) {
    ra.tong = kq.length;
    for (const x of kq) {
      const ok = !!(x && ((x.ok !== undefined ? x.ok : x.dat) !== false));
      if (!ok) { ra.hong++; ra.hongChi.push(tenCa(x) + themCa(x)); }
      ra.log.push((ok ? "✓ " : "✗ ") + tenCa(x));
    }
    return ra;
  }
  if (typeof kq !== "object") return ra;

  // dạng bảng: { tong|total, hong|fail, dsHong|failures, kq|log }
  if (typeof kq.tong === "number") ra.tong = kq.tong;
  else if (typeof kq.total === "number") ra.tong = kq.total;
  if (typeof kq.hong === "number") ra.hong = kq.hong;
  else if (typeof kq.fail === "number") ra.hong = kq.fail;
  const dsHong = kq.dsHong || kq.failures;
  if (Array.isArray(dsHong)) ra.hongChi = dsHong.map((x) => (typeof x === "string" ? x : tenCa(x) + themCa(x)));
  const logNguon = kq.log || kq.kq;
  if (Array.isArray(logNguon)) ra.log = logNguon.map(String);
  if (!ra.tong && ra.log.length) ra.tong = ra.log.length;
  if (typeof kq.ok === "boolean" && !ra.tong && !ra.hong) { ra.tong = 1; ra.hong = kq.ok ? 0 : 1; }

  // Dạng "cờ boolean": { A_nguyenVen: true, B_doiTinNhan: false, ... } — nếu không nhận ra thì
  // bộ kiểm thử trả về 0 ca và LẶNG LẼ được coi là đạt (đã từng xảy ra với nhap-check /
  // nhap-isolation). Mỗi khoá boolean là một ca.
  if (!ra.tong && !ra.log.length) {
    const co = Object.keys(kq).filter((k) => typeof kq[k] === "boolean");
    for (const k of co) {
      ra.tong++;
      if (!kq[k]) { ra.hong++; ra.hongChi.push(k); }
      ra.log.push((kq[k] ? "✓ " : "✗ ") + k);
    }
    if (typeof kq.soLoi === "number") {
      ra.tong++;
      const dat = kq.soLoi === 0;
      if (!dat) { ra.hong++; ra.hongChi.push("soLoi=" + kq.soLoi + " " + JSON.stringify(kq.loi || []).slice(0, 140)); }
      ra.log.push((dat ? "✓ " : "✗ ") + "toàn vẹn (soLoi=" + kq.soLoi + ")");
    }
  }
  return ra;
}

// ------------------------------------------------------------------ gác dữ liệu THẬT
// Dữ liệu THẬT = mọi thứ KHÔNG phải dữ liệu test (truyện "ZZ…"/"ct_zz…", hồ sơ "nhz…").
// Dữ liệu test được phép sinh ra và biến mất trong lúc chạy, nên không tính vào phép so.
async function chupThat() {
  const ban = {};
  const khoaTn = new Set(), khoaAnh = new Set();
  try {
    for (const [k, v] of await root.kv.cotTruyen.entries()) {
      const hts = {};
      for (const c of v.hoiThoais || []) hts[c.id] = ((await root.kv.tinNhan.get(c.id)) || []).length;
      if (laTruyenTest(v)) continue;
      ban[k] = JSON.stringify({ ten: v.ten, suaLuc: v.suaLuc, nv: (v.nhanVats || []).length, hts, anh: (v.anh || []).length, bns: (v.bienNienSu || []).length });
    }
    const hs = [];
    for (const [k, v] of await root.kv.thuVienNgoaiHinh.entries()) if (!laHsoTest(v)) hs.push(k + ":" + JSON.stringify(v));
    ban["__thuVienNgoaiHinh"] = hs.sort().join("|");
    for (const [k] of await root.kv.tinNhan.entries()) khoaTn.add(k);
    for (const [k] of await root.kv.thuVienAnh.entries()) khoaAnh.add(k);
  } catch (e) { ban.__loi = String((e && e.message) || e); }
  return { ban, khoaTn, khoaAnh };
}
function soThat(truoc, sau) {
  const loi = [];
  for (const k of Object.keys(truoc)) if (truoc[k] !== sau[k]) loi.push(k);
  for (const k of Object.keys(sau)) if (!(k in truoc)) loi.push("(mới) " + k);
  return loi;
}

// ------------------------------------------------------------------ dọn dữ liệu test còn sót
function laTruyenTest(s) {
  return /^ZZ/.test((s && s.ten) || "") || /^ct_zz/.test((s && s.id) || "");
}
function laHsoTest(h) {
  return /^nhz/.test((h && h.id) || "");
}
async function donTest(moc) {
  const T = window.__tv_test;
  const S = window.__A && window.__A.S;
  const don = { truyen: [], hoSo: [], tinNhan: 0, anh: 0, moCoi: 0 };
  const giuTn = (moc && moc.khoaTn) || new Set();
  const giuAnh = (moc && moc.khoaAnh) || new Set();
  try {
    for (const [k, v] of await root.kv.cotTruyen.entries()) {
      if (!laTruyenTest(v)) continue;
      for (const c of v.hoiThoais || []) { await root.kv.tinNhan.delete(c.id); don.tinNhan++; }
      for (const a of v.anh || []) { await root.kv.thuVienAnh.delete(a.id); don.anh++; }
      await root.kv.cotTruyen.delete(k);
      don.truyen.push(v.ten || k);
    }
    for (const [k, v] of await root.kv.thuVienNgoaiHinh.entries()) {
      if (!laHsoTest(v)) continue;
      await root.kv.thuVienNgoaiHinh.delete(k);
      don.hoSo.push(v.tenChinh || k);
    }
    // Dọn "mồ côi" do kiểm thử sinh ra: khoá tin nhắn/ảnh KHÔNG có trước lượt chạy và
    // không truyện nào trỏ tới. Chỉ đụng vào khoá MỚI nên dữ liệu người dùng an toàn.
    const dungTn = new Set(), dungAnh = new Set();
    for (const [, v] of await root.kv.cotTruyen.entries()) {
      for (const c of v.hoiThoais || []) dungTn.add(c.id);
      for (const a of v.anh || []) dungAnh.add(a.id);
    }
    for (const [k] of await root.kv.tinNhan.entries()) {
      if (dungTn.has(k) || giuTn.has(k)) continue;
      await root.kv.tinNhan.delete(k); don.moCoi++;
    }
    for (const [k] of await root.kv.thuVienAnh.entries()) {
      if (dungAnh.has(k) || giuAnh.has(k)) continue;
      await root.kv.thuVienAnh.delete(k); don.moCoi++;
    }
    if (T) { await T.loadStories(); await T.loadNgoaiHinh(); }
    else if (S) { await S.loadStories(); await S.loadNgoaiHinh(); }
  } catch (e) { don.loi = String((e && e.message) || e); }
  return don;
}

// ------------------------------------------------------------------ chạy một bước
async function chayBuoc(buoc, kq) {
  const T = window.__tv_test;
  traLaiVaLamSach();
  if (buoc.loai === "dung" || buoc.loai === "nen") xoaGiaTam();
  donModal();
  const aiTruoc = root.aiTextPlugin, veTruoc = root.textToImagePlugin;
  const t0 = Date.now();
  let kqt = null, loi = null;
  try {
    kqt = await chayFile(buoc.ten);
  } catch (e) {
    loi = String((e && (e.stack || e.message)) || e).slice(0, 600);
  } finally {
    if (buoc.loai === "bo" || buoc.loai === "nen") { root.aiTextPlugin = aiTruoc; root.textToImagePlugin = veTruoc; }
    donModal();
  }
  const kqChuan = chuanHoaKetQua(kqt, buoc.ten);
  const dong = {
    ten: buoc.ten, loai: buoc.loai, ghiChu: buoc.ghiChu || "",
    tong: kqChuan.tong, hong: kqChuan.hong, hongChi: kqChuan.hongChi,
    loi, ms: Date.now() - t0,
  };
  if (buoc.loai === "bo") {
    if (loi) { kq.hong++; dong.tong = dong.tong || 1; dong.hong = dong.hong || 1; }
    else {
      kq.tong += dong.tong; kq.hong += dong.hong;
      // Bộ kiểm thử trả về 0 ca ⇒ gần như chắc chắn là hình dạng kết quả lạ. Không được để nó
      // lặng lẽ "đạt".
      if (!dong.tong) kq.canhBao.push("bộ " + buoc.ten + " không trả về ca nào (kiểm tra hình dạng kết quả)");
    }
  }
  kq.buoc.push(dong);
  return dong;
}

// ------------------------------------------------------------------ API chính
export async function chayTatCa(opts) {
  const o = opts || {};
  const chi = o.chi ? new Set(o.chi) : null;
  const boQua = new Set(o.boQua || []);
  const gomPhu = !!o.gomPhu;
  giuGoc();

  // chờ app sẵn sàng
  for (let i = 0; i < 40 && !window.__truyenVaiReady; i++) await new Promise((r) => setTimeout(r, 250));
  if (!window.__truyenVaiReady) return { ok: false, loi: "app chưa sẵn sàng (window.__truyenVaiReady === false)" };

  const kq = { tong: 0, hong: 0, buoc: [], canhBao: [] };
  const thatTruoc = await chupThat();
  const dsBuoc = DANH_MUC.filter((b) => (gomPhu || b.loai !== "phu") && (!chi || chi.has(b.ten)) && !boQua.has(b.ten));

  for (const b of dsBuoc) {
    const dong = await chayBuoc(b, kq);
    const nhan = dong.loi ? "LỖI CHẠY" : dong.loai === "bo" ? dong.hong + "/" + dong.tong + " ca không đạt" : "(bước " + dong.loai + ")";
    console.log("[tv-test] " + b.ten.padEnd(16) + " " + String(dong.ms + "ms").padEnd(8) + " " + nhan);
    if (dong.loi) console.log("          ↳ " + dong.loi.split("\n")[0]);
    if (b.loai === "bo" && dong.hong) for (const c of dong.hongChi.slice(0, 6)) console.log("          ✗ " + c.slice(0, 160));
  }

  const thatSau = await chupThat();
  const lech = soThat(thatTruoc.ban, thatSau.ban);
  if (lech.length) kq.canhBao.push("DỮ LIỆU THẬT ĐÃ ĐỔI: " + lech.join(", "));

  let donDep = null;
  if (o.don !== false) {
    donDep = await donTest(thatTruoc);
    // Dọn dữ liệu test có tiêu tố nhận ra được là bình thường (bộ kiểm thử tự tạo rồi để lại
    // cho bộ sau dùng). Chỉ CẢNH BÁO khi có "mồ côi" — tức khoá mới không truyện nào trỏ tới.
    kq.daDon = donDep;
    if (donDep.moCoi) kq.canhBao.push("có khoá mồ côi do kiểm thử sinh ra: " + JSON.stringify(donDep));
  }
  try {
    const T = window.__tv_test;
    if (T) { T.app.storyId = null; T.app.convId = null; T.app.screen = "home"; T.render(); }
  } catch (e) {}
  donModal();

  kq.ok = kq.hong === 0 && !kq.canhBao.length;
  kq.donDep = donDep;
  kq.tomTat = (kq.hong ? "✗ " : "✓ ") + (kq.tong - kq.hong) + "/" + kq.tong + " ca đạt · " +
    kq.buoc.filter((b) => b.loai === "bo").length + " bộ" + (kq.canhBao.length ? " · " + kq.canhBao.length + " cảnh báo" : "");
  console.log("[tv-test] " + kq.tomTat);
  for (const c of kq.canhBao) console.log("[tv-test] ⚠ " + c);
  return kq;
}

export async function chay(ten, opts) {
  return await chayTatCa(Object.assign({}, opts, { chi: [ten], gomPhu: true, don: false }));
}

export function danhSach() {
  return DANH_MUC.map((b) => b.loai + "  " + b.ten.padEnd(18) + (b.ghiChu || ""));
}

if (typeof window !== "undefined") {
  window.__tvTests = { chayTatCa, chay, danhSach, DANH_MUC };
}
