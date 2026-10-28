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
// ---------------------------------------------------------------- quét
// MÃ BĂM DÒNG (FNV-1a 32 bit, hex 8 ký tự) — khoá của ngoại lệ theo vị trí. Phải là đúng
// hàm này (đã dùng lúc rà soát bản chuẩn) thì mã trong `VI_TRI_MIEN` mới khớp dòng đó.
function bamDong(tep, dong) {
  let h = 0x811c9dc5;
  const s = tep + NL + dong;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

// NGOẠI LỆ THEO VỊ TRÍ (chủ dự án duyệt từng vị trí, Giai đoạn 9 sửa Đợt 1):
// mỗi mục là "tệp|mã dòng" của ĐÚNG DÒNG đã rà soát trong bản chuẩn — không chứa chuỗi thật
// nào (mã là một chiều). Một mẫu trùng ở dòng KHÁC (tệp khác, hoặc cùng tệp nhưng dòng đã
// sửa) VẪN ĐỎ. Không có ngoại lệ theo tần suất: chép một chuỗi sang ba tệp không chứng minh
// được đó là dữ liệu mẫu.
// Bản chất các dòng đã rà soát (chỉ nêu vị trí, không nêu chuỗi):
//   • văn bản thể loại trong main.pjs + ví dụ tên trong src/README.md: từ thường;
//   • giao diện + tài liệu + chú thích test (9 dòng): từ thường;
//   • prompt Đạo diễn + văn bản thể loại + snapshot prompt (8 dòng): từ thường;
//   • nhãn mặc định của app (10 dòng);
//   • tiêu đề mục trong hai tệp tài liệu (3 dòng).
const VI_TRI_MIEN = new Set([
  "main.pjs|b54244ac", "src/README.md|6b21190e",
  "tests/node/khong-ro-ri.test.mjs|4b85db80", "tests/node/goi-chung.test.mjs|fc689199",
  "tests/README.md|1ca5b150", "src/ui/vietTruyen/vietTruyenHtml.js|b6442c40",
  "src/ui/tuyChonTruyen/tuyChonTruyenHtml.js|700fbfc7", "src/trangThai.js|d2f5ef9c",
  "src/app.js|4327daf0", "src/README.md|fcd9fce8", "src/README.md|46678830", "main.pjs|7ccece12",
  "tests/fixtures/prompt/daodien-1.txt|1b741650", "tests/fixtures/prompt/daodien-2.txt|8cf942ac",
  "tests/fixtures/prompt/daodien-3.txt|5fcaeff2", "tests/fixtures/prompt/daodien-4.txt|7eead586",
  "tests/fixtures/prompt/daodien-5.txt|c2748b38", "src/ai.js|425d7254",
  "main.pjs|1a56e90c", "main.pjs|b6649f00",
  "tests/node/bangDieuKhienFlow.test.mjs|3de0f1ac",
  "src/ui/bangDieuKhien/bangDieuKhienHtml.js|d2589de8",
  "src/ui/bangDieuKhien/bangDieuKhienHtml.js|25b954d8",
  "src/ui/bangDieuKhien/bangDieuKhienHtml.js|c807e2dc",
  "src/ui/bangDieuKhien/bangDieuKhienFlow.js|a19a8bf1", "src/store.js|6ed22794",
  "src/app.js|b4d56806", "src/app.js|ce5307f0", "src/app.js|4b8cc314", "src/app.js|88456898",
  "tests/README.md|7436b3e0", "src/README.md|210b8d8b", "src/README.md|a1fbf038",
]);

// Quét MỌI vị trí trùng (không dừng ở lần khớp đầu tiên, và KHÔNG giới hạn số lần gặp
// trên mỗi tệp — giới hạn cũ `dem < 50` từng bỏ sót im lặng: 50 lần nằm trong từ dài hơn
// rồi một tên đứng riêng ở lần thứ 51 vẫn xanh. Vì mỗi lần gặp phải suy số dòng nên mốc
// dòng được dựng MỘT lần cho mỗi tệp rồi tra bằng tìm kiếm nhị phân).
// Ngân sách: nếu một gói quái đản khiến số lần gặp vượt ngân sách, lượt quét DỪNG HẲN và
// báo CHƯA HOÀN TẤT (đỏ) — không bao giờ kết luận "đạt" trên kết quả quét dở.
const NGAN_SACH_QUET = 2000000; // số lần gặp mẫu được xem xét tối đa cho cả lượt quét
let soBuocQuet = 0;
let quetDoDang = ""; // tệp nơi hết ngân sách (nếu có)
const hit = [];
const mienDaDung = new Set();
let soBoQua = 0;
// Quét một tệp, trả { hit, boQua, xong } — `xong=false` nghĩa là đã hết ngân sách giữa
// chừng, lượt quét phải dừng và báo chưa hoàn tất.
function quetTep(f) {
  const hitTep = [];
  let boQuaTep = 0;
  const moc = [0];
  for (let k = 0; k < f.text.length; k++) if (f.text[k] === NL) moc.push(k + 1);
  const dong = f.text.split(NL);
  const soDongCua = (i) => {
    let d = 0, c = moc.length - 1;
    while (d < c) { const g = (d + c + 1) >> 1; if (moc[g] <= i) d = g; else c = g - 1; }
    return d + 1;
  };
  for (const p of PAT) {
    let i = f.text.indexOf(p);
    while (i >= 0) {
      soBuocQuet++;
      if (soBuocQuet > NGAN_SACH_QUET) { quetDoDang = f.tep; return { hit: hitTep, boQua: boQuaTep, xong: false }; }
      const truoc = i > 0 ? f.text[i - 1] : "";
      const sau = i + p.length < f.text.length ? f.text[i + p.length] : "";
      if (!laChu(truoc) && !laChu(sau)) {
        const soDong = soDongCua(i);
        const khoa = f.tep + "|" + bamDong(f.tep, dong[soDong - 1]);
        if (VI_TRI_MIEN.has(khoa)) {
          boQuaTep += 1;
          mienDaDung.add(khoa);
        } else {
          hitTep.push({ tep: f.tep, dong: soDong });
        }
      }
      i = f.text.indexOf(p, i + 1);
    }
  }
  return { hit: hitTep, boQua: boQuaTep, xong: true };
}
let soTepDaQuet = 0;
for (const f of canQuet) {
  const r = quetTep(f);
  soBoQua += r.boQua;
  for (const h of r.hit) hit.push(h);
  if (!r.xong) break;
  soTepDaQuet++;
}
const soBuocQuetThat = soBuocQuet; // chốt trước khi các ca tự kiểm tra chạy thêm lượt quét giả
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
// Hồi quy lỗi từng gặp: giới hạn 50 lần gặp/tệp/mẫu bỏ sót im lặng. Dựng đúng tình huống
// đó — 50 lần mẫu nằm trong từ dài hơn, lần 51 đứng riêng — trên một "tệp" giả với một
// mẫu tổng hợp (thêm/tạm vào PAT rồi gỡ, không in ra đâu) rồi đòi phép quét bắt được
// đúng MỘT lần (mã cũ dừng ở 50 nên được 0).
{
  const MAU_GIA = "QqZzKkWwVv";
  PAT.add(MAU_GIA);
  const gia = [];
  for (let k = 0; k < 50; k++) gia.push("xq" + MAU_GIA + "zq");
  gia.push(" " + MAU_GIA + " ");
  let r51 = null;
  try {
    r51 = quetTep({ tep: "__gia__", text: gia.join(" ") });
  } finally {
    PAT.delete(MAU_GIA);
  }
  chk("quét ngược: tự kiểm tra — 50 lần trong từ dài hơn không che được lần 51 đứng riêng",
    !!r51 && r51.xong && r51.hit.length === 1 && r51.hit[0].tep === "__gia__");
}
// Cơ chế miễn theo vị trí phải TỰ BẢO VỆ: (a) hàm băm ổn định (đúng hàm đã dùng lúc rà soát
// bản chuẩn — đổi hàm là mọi mã trong `VI_TRI_MIEN` thành rác); (b) mọi mục đúng định dạng
// "tệp|mã hex 8 ký tự" và khoá giả không được miễn; (c) mọi mục miễn đều trỏ đúng một dòng
// đang có trong gói (sửa/xoá/dời dòng là mã cũ thành mồ côi — phải rà soát lại, không được
// lặng lẽ giữ). Kiểm (c) độc lập với kv: đối chiếu mã với từng dòng của tệp trong gói, nên
// kv thêm/bớt truyện không làm nó báo oan. Chỉ chạy khi có bản tiêm đầy đủ (`window.__tvGoi`).
chk("quét ngược: tự kiểm tra — bamDong ổn định (đúng hàm đã dùng lúc rà soát)",
  bamDong("a", "b") === "28e4c710" && bamDong("a", "b") !== bamDong("a", "c"));
chk("quét ngược: tự kiểm tra — VI_TRI_MIEN đúng định dạng tệp|mã, khoá giả không được miễn",
  VI_TRI_MIEN.size > 0 &&
  Array.from(VI_TRI_MIEN).every((k) => /^[^|]+\|[0-9a-f]{8}$/.test(k)) &&
  !VI_TRI_MIEN.has("tep-gia-khong-co|00000000"));
if (window.__tvGoi) {
  const moiChet = [];
  for (const khoa of VI_TRI_MIEN) {
    const i = khoa.indexOf("|");
    const tep = khoa.slice(0, i), ma = khoa.slice(i + 1);
    const f = canQuet.find((x) => x.tep === tep);
    const conDong = f ? f.text.split(NL).some((d) => bamDong(tep, d) === ma) : false;
    if (!conDong) moiChet.push(khoa);
  }
  chk("quét ngược: tự kiểm tra — mọi mục miễn đều trỏ đúng một dòng đang có trong gói" +
    (moiChet.length ? " — mồ côi: " + moiChet.slice(0, 5).join(", ") : ""),
    moiChet.length === 0);
}
if (soBoQua > 0) chk("quét ngược: đã miễn " + soBoQua + " lượt trùng ở vị trí đã rà soát", true);

chk("quét ngược: quét HẾT mọi vị trí (" + soBuocQuetThat + " lượt gặp trên " + soTepDaQuet + "/" + canQuet.length + " tệp)" +
  (quetDoDang ? " — DỞ DANG ở " + quetDoDang + ", chưa quét hết nên KHÔNG kết luận đạt" : ""),
  !quetDoDang && soTepDaQuet === canQuet.length);

chk("quét ngược: đã quét tệp sẽ vào gói (" + nguonTep + ") — " + canQuet.length + " tệp", canQuet.length >= 30);
for (const h of hit) chk("quét ngược: RÒ RỈ dữ liệu thật trong " + h.tep + " (dòng " + h.dong + ")", false, "tệp này chứa một chuỗi lấy từ kv");
chk("quét ngược: không tệp nào trong gói chứa tên/id thật" + (tepBi.length ? " — đang bị " + tepBi.length + " tệp" : "") +
  (quetDoDang ? " (lượt quét DỞ DANG — chưa đủ cơ sở kết luận)" : ""), hit.length === 0 && !quetDoDang);
if (!window.__tvGoi) {
  chk("quét ngược: PHẢI tiêm window.__tvGoi (danh sách tệp + nội dung của gói) trước khi đóng gói", false, "chưa tiêm nên chưa quét được tests/**");
}

T.app.screen = "home";
T.render();
await new Promise((r) => setTimeout(r, 30));

return ca;
