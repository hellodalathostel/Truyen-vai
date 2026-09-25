// Bộ kiểm thử: QUÉT NGƯỢC TÊN/ID THẬT — chốt chặn cuối trước khi đóng gói.
//
// Vì sao cần: tests/node/khong-ro-ri.test.mjs chỉ bắt được DẠNG id thật (token dài) và tự nhận
// là KHÔNG bắt được tên người/tên truyện (tên ngắn, hay trùng từ thường). Đợt 6c đã để lọt đúng
// một TÊN TRUYỆN THẬT vào tests/node/lorebookFlow.test.mjs — nếu chỉ có luật-dạng-id thì lỗ đó
// không bao giờ bị bắt. Ca này bù đúng chỗ đó, và làm được việc mà tầng Node không làm được:
// đọc dữ liệu thật trong kv (CHỈ TRONG BỘ NHỚ, không ghi gì) để lấy mẫu.
//
// Ba bước:
//   1. Lấy mẫu THẬT từ kv: mọi tên truyện, tên nhân vật, tiêu đề hội thoại, tên hồ sơ ngoại
//      hình, cùng mọi id (và phần thân id) — bỏ qua dữ liệu test (tiền tố riêng, tiêu đề ZZ),
//      bỏ qua chuỗi < 4 ký tự, bỏ qua từ thông dụng (tránh báo oan).
//   2. Quét MỌI tệp sẽ vào gói. Danh sách tệp + nội dung do lúc đóng gói tiêm vào qua
//      `window.__tvGoi` (không enumerable được `tests/**` từ trong preview nên phải tiêm).
//      Thiếu bản tiêm ⇒ bộ này ĐỎ (đó là chủ ý — bước này BẮT BUỘC trước mỗi lần đóng gói).
//   3. Khớp ⇒ ĐỎ. Chỉ báo TỆP + SỐ DÒNG, TUYỆT ĐỐI KHÔNG in chuỗi khớp ra: log của bộ kiểm thử
//      đi vào tài liệu, ảnh chụp và cửa sổ trò chuyện, nên in ra là lộ thêm một lần nữa.
//
// Bộ này chạy ĐẦU TIÊN trong DANH_MUC: kv lúc đó chỉ còn dữ liệu thật của chủ dự án (các bộ
// sau mới dựng thêm dữ liệu test), nhờ vậy mẫu không bị lẫn đồ giả của chính bộ kiểm thử.
const T = window.__tv_test;
const ca = [];
const chk = (ten, ok, ct) => ca.push({ ten, ok: !!ok, ct: ct === undefined ? "" : String(ct).slice(0, 220) });

// Tiền tố id của dữ liệu TEST (xem tests/README.md, luật 4) — dữ liệu thật không bao giờ có.
const TIEN_TEST = ["ct_zz", "nhz_", "ht_z", "anh_zz", "nv_z", "tn_zz", "vg_z", "ku_zz", "dc_zz", "nh_zz"];
const laTest = (s) => {
  const t = String(s || "");
  for (const p of TIEN_TEST) if (t.indexOf(p) === 0) return true;
  return t.slice(0, 2).toLowerCase() === "zz";
};

// Từ/cụm thông dụng: một mẫu TRÙNG đúng những chuỗi này sẽ bị bỏ qua. Báo oan làm bộ test mất giá
// trị (rồi người ta tắt nó đi), mà tên/hội thoại đặt bằng tiếng Việt hay TRÙNG đúng từ thường —
// đợt 6d gặp thật: vài mẫu trong kv trùng nguyên những chữ nằm sẵn trong câu văn của
// `src/README.md` và `tests/*`. Vì vậy: (a) so ở RANH GIỚI TỪ, (b) danh sách dưới đây chỉ gồm
// từ/cụm thông dụng nói chung — KHÔNG ghi tên riêng nào vào tệp này (ghi vào là lộ thêm một lần).
// Hệ quả đã biết: một tên thật TRÙNG ĐÚNG một cụm trong danh sách này sẽ lọt lưới — chấp nhận có
// ý thức, vì báo oan sẽ khiến cả bộ test bị vô hiệu.
const TU_THUONG = [
  "truyện", "nhân", "vật", "người", "chơi", "cảnh", "chương", "hội", "thoại", "tên", "mô",
  "tả", "ảnh", "sổ", "tri", "thức", "chính", "phụ", "bạn", "của", "trong", "ngoài", "bảng",
  "điều", "khiển", "hồ", "sơ", "theo", "phần", "mục", "nhóm", "thêm", "sửa", "xoá", "xóa",
  "lưu", "mới", "cũ", "test", "story", "truyen", "the", "thể", "loại", "đạo", "diễn", "giao",
  "kèo", "tuổi", "ngày", "giờ", "đêm", "sáng", "chiều", "câu", "chuyện", "dài", "ngắn", "đầu",
  "toàn", "toàn bộ", "phát hiện", "kiểm tra", "rà soát", "ghi chép", "rò rỉ", "bản ghi",
  "bản sao", "sự kiện", "kết quả", "trạng thái", "thời gian", "tính năng", "chi tiết",
  "ghi chú", "ví dụ", "dữ liệu", "đoạn", "bước", "màn", "hộp", "nút", "khối", "dòng", "tệp",
  "thiết lập", "tuỳ chọn", "chọn", "hiển thị", "cài đặt", "thông báo", "đồng ý", "huỷ",
  // NHÃN MẶC ĐỊNH của ứng dụng (đợt 4 gặp thật): dữ liệu thật trong kv có thể TRÙNG NGUYÊN một
  // nhãn do chính app sinh ra — vd một nhóm tin nhắn còn mang tiêu đề mặc định. Chuỗi như vậy nằm
  // sẵn trong mã vì đó là NHÃN, không phải vì rò rỉ, nên phải bỏ qua. Thêm nhãn mặc định mới vào
  // đây khi app có thêm nhãn — KHÔNG thêm tên riêng nào.
  "hội thoại mới", "hội thoại đã xoá", "chưa có tiêu đề", "không có tiêu đề",
];

const PAT = new Set();
const themMau = (s) => {
  if (typeof s !== "string") return;
  const t = s.trim();
  if (t.length < 4) return;
  if (TU_THUONG.indexOf(t.toLowerCase()) >= 0) return;
  PAT.add(t);
};
const themId = (s) => {
  if (typeof s !== "string") return;
  const id = s.trim();
  if (!id || laTest(id)) return;
  themMau(id);
  const i = id.lastIndexOf("_");
  const than = i >= 0 ? id.slice(i + 1) : "";
  if (than.length >= 6) themMau(than);
};
// Mọi trường có chữ "ten" trong tên (ten, tenChinh, tenPhu, bietDanh…) đều là trường TÊN.
const themTenTruong = (o) => {
  if (!o || typeof o !== "object") return;
  for (const k of Object.keys(o)) if (String(k).toLowerCase().indexOf("ten") >= 0) themMau(o[k]);
};

let soTruyen = 0, soHoSo = 0, soNhomTin = 0, soAnh = 0;
try {
  for (const [k, s] of await root.kv.cotTruyen.entries()) {
    if (!s || laTest(k) || laTest(s.id) || /^ZZ/i.test(String(s.ten || ""))) continue;
    soTruyen += 1;
    themId(k); themId(s.id);
    themTenTruong(s);
    for (const c of s.nhanVats || []) { themId(c && c.id); themTenTruong(c); }
    for (const h of s.hoiThoais || []) { themId(h && h.id); themMau(h && h.tieuDe); }
    for (const a of s.anh || []) { themId(a && a.id); for (const id of (a && a.hoSoIds) || []) themId(id); }
  }
  for (const [k, h] of await root.kv.thuVienNgoaiHinh.entries()) {
    if (!h || laTest(k) || laTest(h.id)) continue;
    soHoSo += 1;
    themId(k); themId(h.id);
    themTenTruong(h);
  }
  for (const [k, ds] of await root.kv.tinNhan.entries()) {
    if (laTest(k)) continue;
    soNhomTin += 1;
    themId(k);
    for (const m of ds || []) { themId(m && m.id); for (const id of (m && m.hoSoIds) || []) themId(id); }
  }
  for (const [k, a] of await root.kv.thuVienAnh.entries()) {
    if (laTest(k) || laTest(a && a.convId)) continue;
    soAnh += 1;
    themId(k); themId(a && a.id);
    for (const id of (a && a.hoSoIds) || []) themId(id);
  }
} catch (e) {
  chk("quét ngược: đọc được kv để lấy mẫu thật", false, "lỗi đọc kv: " + String((e && e.message) || e));
}
chk("quét ngược: lấy được mẫu THẬT từ kv — " + PAT.size + " chuỗi (" + soTruyen + " truyện · " +
  soHoSo + " hồ sơ · " + soNhomTin + " nhóm tin nhắn · " + soAnh + " ảnh)", PAT.size > 0);

// ---------------------------------------------------------------- danh sách tệp của gói
const gocSrc = () => {
  try {
    if (window.__tvSrcBase) return window.__tvSrcBase;
    if (document && document.baseURI) return new URL("src/", new URL("/", document.baseURI)).href;
  } catch (e) {}
  return "/src/";
};

let canQuet = [];
let nguonTep = "";
if (window.__tvGoi && typeof window.__tvGoi === "object") {
  for (const k of Object.keys(window.__tvGoi)) {
    if (typeof window.__tvGoi[k] === "string") canQuet.push({ tep: k, text: window.__tvGoi[k] });
  }
  nguonTep = "window.__tvGoi";
} else {
  // Không có bản tiêm: chỉ quét được phần enumerable (nguồn bộ kiểm thử đã tiêm + vài tệp gốc).
  nguonTep = "window.__tvNguon + fetch (THIẾU tests/**)";
  const bang = window.__tvNguon || {};
  for (const k of Object.keys(bang)) {
    if (typeof bang[k] === "string") canQuet.push({ tep: "tests/browser/" + k + ".js", text: bang[k] });
  }
  for (const rel of ["main.pjs", "index.html", "src/app.js", "src/ai.js", "src/store.js"]) {
    try {
      const r = await fetch(new URL(rel, new URL("/", document.baseURI)).href, { cache: "no-store" });
      if (r.ok) canQuet.push({ tep: rel, text: await r.text() });
    } catch (e) {}
  }
}

// ---------------------------------------------------------------- quét
const NL = String.fromCharCode(10);
// Ký tự tính là "nằm trong một từ" (chữ/số, kể cả chữ có dấu) — dùng cho phép so RANH GIỚI TỪ.
const laChu = (c) => {
  if (!c) return false;
  const k = c.charCodeAt(0);
  if (k > 127) return c.toLowerCase() !== c.toUpperCase();
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9");
};
const viTriDau = (text, p) => {
  let i = text.indexOf(p);
  while (i >= 0) {
    const truoc = i > 0 ? text[i - 1] : "";
    const sau = i + p.length < text.length ? text[i + p.length] : "";
    if (!laChu(truoc) && !laChu(sau)) return i;
    i = text.indexOf(p, i + 1);
  }
  return -1;
};
const hit = [];
for (const f of canQuet) {
  for (const p of PAT) {
    const i = viTriDau(f.text, p);
    if (i < 0) continue;
    hit.push({ tep: f.tep, dong: f.text.slice(0, i).split(NL).length });
    if (hit.length >= 60) break;
  }
  if (hit.length >= 60) break;
}
const tepBi = [];
for (const h of hit) if (tepBi.indexOf(h.tep) < 0) tepBi.push(h.tep);

// TỰ KIỂM TRA phép quét: đặt một mẫu THẬT vào một "tệp" giả trong bộ nhớ rồi đòi phép quét bắt
// được. Không in gì (kể cả ở đây) — nếu in thì chính bộ test thành chỗ rò rỉ mới.
const mauThu = PAT.size ? Array.from(PAT)[0] : "";
const dongThu = "const x = " + JSON.stringify(mauThu) + ";";
chk("quét ngược: tự kiểm tra — phép quét bắt được mẫu thật đặt trong tệp giả", mauThu.length >= 4 && viTriDau(dongThu, mauThu) >= 0);
// Hai luật lọc phải THẬT SỰ có hiệu lực, chứ không chỉ được viết ra: (a) phép khớp đòi đúng RANH
// GIỚI TỪ (một chuỗi nằm giữa một từ dài hơn thì không tính), và (b) bộ mẫu đã bỏ qua mọi chuỗi
// < 4 ký tự lẫn mọi từ/cụm thông dụng. Kiểm trên chính bộ mẫu đang dùng, không in chuỗi nào.
chk("quét ngược: tự kiểm tra — khớp đúng RANH GIỚI TỪ, và bộ mẫu đã bỏ chuỗi ngắn / từ thông dụng",
  viTriDau("xabcx", "abc") < 0 && viTriDau("x abc", "abc") >= 0 &&
  PAT.size > 0 && Array.from(PAT).every((p) => p.length >= 4 && TU_THUONG.indexOf(p.toLowerCase()) < 0));

chk("quét ngược: đã quét tệp sẽ vào gói (" + nguonTep + ") — " + canQuet.length + " tệp", canQuet.length >= 30);
for (const h of hit) chk("quét ngược: RÒ RỈ dữ liệu thật trong " + h.tep + " (dòng " + h.dong + ")", false, "tệp này chứa một chuỗi lấy từ kv");
chk("quét ngược: không tệp nào trong gói chứa tên/id thật" + (tepBi.length ? " — đang bị " + tepBi.length + " tệp" : ""), hit.length === 0);
if (!window.__tvGoi) {
  chk("quét ngược: PHẢI tiêm window.__tvGoi (danh sách tệp + nội dung của gói) trước khi đóng gói", false, "chưa tiêm nên chưa quét được tests/**");
}

T.app.screen = "home";
T.render();
await new Promise((r) => setTimeout(r, 30));

return ca;
