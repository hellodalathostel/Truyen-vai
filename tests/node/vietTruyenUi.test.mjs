// Truyện Vai — tầng kiểm thử Node: MÀN "Viết thành truyện" (Giai đoạn 8 · Đợt 4).
// Chạy: node --test tests/node/
//
// Đợt 4 chỉ dựng KHUNG + trạng thái GIẢ, nên ca kiểm phải ghim đúng ba thứ dễ hỏng của một khung:
//
//   1. VỎ ≤ 150 dòng và KHÔNG tự gắn listener (§7.2, §7.3) — nút của màn này phải đi qua bảng sự
//      kiện toàn cục, kể cả nút nằm trong modal của chính nó.
//   2. BA KHỐI render đúng ở cả ba trạng thái (`dangChay` / `xong` / `loi`) và trạng thái lạ KHÔNG
//      được rơi về "đang viết" (giao diện sẽ quay vô hạn — quy ước của `store.js`).
//   3. MỌI giá trị động đi qua `esc()`: payload phá ngữ cảnh phải thành CHỮ, không được thành phần
//      tử hay thuộc tính thật (bất biến §2.5).
//
// Dữ liệu ở đây là HƯ CẤU, id có tiền tố test (`zz…`), không có tên người thật (luật §8).
// Không dùng biểu thức chính quy ở tệp này khi quét chuỗi (xem luật ở tests/README.md).

import { test, ok, eq } from "../lib/h.js";
import "../lib/moi-truong.js";

const NL = String.fromCharCode(10);
const NH = String.fromCharCode(34);

const H = await import("../../src/ui/vietTruyen/vietTruyenHtml.js");

// Payload phá ngữ cảnh: nếu chèn thẳng vào HTML thì nó tạo ra PHẦN TỬ thật (id) và THUỘC TÍNH thật.
const P = "TVX & " + NH + " tvxprobe=" + NH + "1><i id=" + NH + "vtprobe" + NH + "></i> " + String.fromCharCode(39);
// Id test: thân bắt đầu bằng "z" (luật tự động của khong-ro-ri.test.mjs).
const DS = [
  { id: "vt_zzdang", hoiThoaiId: "ht_zz1", loaiNguon: "tho", taoLuc: 1700000000000, trangThai: "dangChay", noiDung: P + " phần đang viết", loiNeu: "" },
  { id: "vt_zzxong", hoiThoaiId: "ht_zz1", loaiNguon: "canhKhep", taoLuc: 1700000000000, trangThai: "xong", noiDung: P, loiNeu: "" },
  { id: "vt_zzloi", hoiThoaiId: "ht_zz9", loaiNguon: "tho", taoLuc: 0, trangThai: "loi", noiDung: "", loiNeu: "Không gọi được model: " + P },
  { id: "vt_zzla", hoiThoaiId: "ht_zz1", loaiNguon: "la", taoLuc: 0, trangThai: "la", noiDung: P, loiNeu: "" },
];
const CHAY = { id: "vt_zzdang", lo: 2, tongLo: 4, daDoc: 3, tongDoan: 5, ten: "hội thoại " + P, dang: true, hen: null };
const BANG_TEN = { ht_zz1: "Hội thoại " + P };
function ctx(them) {
  return Object.assign({ ds: DS, loaiNguon: "tho", tongDoan: 5, chan: "", chay: CHAY, tenHoiThoai: BANG_TEN }, them || {});
}

// ---------------------------------------------------------------- đọc tệp nguồn (như các bộ khác)
let fsMod = null;
let pathMod = null;
let urlMod = null;
try {
  fsMod = await import("node:fs");
  pathMod = await import("node:path");
  urlMod = await import("node:url");
} catch (e) {
  fsMod = null;
}
let GOC = "";
if (fsMod) {
  try {
    GOC = pathMod.dirname(pathMod.dirname(pathMod.dirname(urlMod.fileURLToPath(import.meta.url))));
  } catch (e) {
    GOC = "";
  }
}
async function doc(rel) {
  const bd = globalThis.__TV_BO_DOC;
  if (bd && typeof bd.doc === "function") return await bd.doc(rel);
  if (!fsMod || !GOC) return null;
  return fsMod.readFileSync(pathMod.join(GOC, rel), "utf8");
}
function demDong(text) {
  return String(text).split(NL).length;
}
// Mọi `data-act="…"` trong một đoạn mã (quét tay, không dùng biểu thức chính quy).
function dsDataAct(text) {
  const ra = [];
  const t = String(text);
  const moc = "data-act=" + NH;
  let i = t.indexOf(moc);
  while (i >= 0) {
    const a = i + moc.length;
    const b = t.indexOf(NH, a);
    if (b < 0) break;
    const act = t.slice(a, b);
    if (act && ra.indexOf(act) < 0) ra.push(act);
    i = t.indexOf(moc, b);
  }
  return ra;
}
// Khoá của bảng sự kiện, theo quy ước trình bày: dòng bắt đầu bằng `"` và có `":`.
function khoaBang(text) {
  const ra = [];
  for (const dong of String(text).split(NL)) {
    const t = dong.trim();
    if (t.slice(0, 1) !== NH) continue;
    const c = t.indexOf(NH + ":");
    if (c <= 0) continue;
    ra.push(t.slice(1, c));
  }
  return ra;
}

// =============================================================== 1. vỏ màn
test("vỏ màn ≤ 150 dòng, nối đúng ba mảnh, KHÔNG tự gắn listener", async () => {
  const text = await doc("src/ui/vietTruyen/index.js");
  ok(text !== null, "đọc được src/ui/vietTruyen/index.js");
  if (text === null) return;
  // Cùng cách đếm với ca \"vỏ ≤ 150 dòng\" của goi-chung.test.mjs (split theo xuống dòng).
  ok(demDong(text) <= 150, "vỏ ≤ 150 dòng (đang " + demDong(text) + ")");
  ok(text.indexOf("addEventListener") < 0, "vỏ KHÔNG tự gắn listener (luật §7.3)");
  ok(text.indexOf("document.querySelector(") >= 0, "vỏ vẫn tự chống mở hai lần bằng lớp modal");
  for (const x of ["htmlThan", "htmlDem", "htmlTienDo", "vietTruyenFlow.js", "vietTruyenHtml.js"]) {
    ok(text.indexOf(x) >= 0, "vỏ nối vào " + x);
  }
  // Không hard-code câu chữ 18+: cổng chặn của màn này là kết quả của hàm dùng chung.
  ok(text.indexOf("kiemVietTruyenTruocKhiChay") >= 0, "cổng chặn lấy từ hàm thuần dùng chung");
  for (const c of ["Chưa xác nhận 18+", "Bạn đang bật giao kèo BDSM cho truyện này."]) {
    ok(text.indexOf(c) < 0, "vỏ không chép lại câu chữ 18+: " + c);
  }
});

// =============================================================== 2. nút đi qua bảng sự kiện
test("mọi data-act của màn đều có hàm xử lý ở bảng sự kiện toàn cục, và ngược lại", async () => {
  const html = await doc("src/ui/vietTruyen/vietTruyenHtml.js");
  const bang = await doc("src/ui/suKien/vietTruyen.js");
  const app = await doc("src/app.js");
  ok(html !== null && bang !== null && app !== null, "đọc được tệp HTML của màn + bảng sự kiện + app.js");
  if (html === null || bang === null || app === null) return;
  const khoa = khoaBang(bang);
  // Nút MỞ màn nằm ở app.js (menu ⋯ của khung chat), các nút còn lại ở thân màn. app.js có hàng chục
  // `data-act` của các màn KHÁC (mỗi màn một bảng riêng), nên chỉ soi nút của màn này ở app.js.
  const actsMan = dsDataAct(html);
  const actsApp = dsDataAct(app);
  ok(actsApp.indexOf("viet-truyen") >= 0, "app.js có nút mở màn (menu ⋯ của chat)");
  ok(actsMan.indexOf("vt-chay") >= 0, "có nút chạy");
  ok(actsMan.indexOf("vt-dung") >= 0, "có nút dừng");
  ok(actsMan.indexOf("vt-nguon") >= 0, "có nút chọn nguồn");
  ok(actsMan.indexOf("vt-xuat") >= 0, "có nút xuất .md");
  ok(actsMan.indexOf("vt-chep") >= 0, "có nút sao chép");
  for (const a of actsMan) ok(khoa.indexOf(a) >= 0, "data-act có hàm xử lý: " + a);
  for (const k of khoa) ok(actsMan.indexOf(k) >= 0 || actsApp.indexOf(k) >= 0, "khoá bảng có nút thật trong mã: " + k);
  ok(khoa.length >= 6, "bảng có đủ hành động của màn (đang " + khoa.length + ")");
  // Bảng phải xuất ĐÚNG một hàm dựng bảng, và bảng gộp trong `src/ui/suKien/index.js` phải nạp nó.
  eq(bang.split("export function ").length - 1, 1, "bảng xuất đúng một hàm dựng");
  ok(bang.indexOf("addEventListener") < 0, "bảng KHÔNG tự đăng ký sự kiện");
  const gop = await doc("src/ui/suKien/index.js");
  ok(gop.indexOf("vietTruyen.js") >= 0, "bảng gộp nạp bảng của màn này");
  ok(gop.indexOf("bangVietTruyen") >= 0, "bảng gộp gọi hàm dựng bảng của màn này");
});

// =============================================================== 3. ba khối, ba trạng thái
test("htmlThan render đủ ba khối ở cả ba trạng thái, không ném lỗi", () => {
  let out = "";
  let nem = null;
  try {
    out = H.htmlThan(ctx());
  } catch (e) {
    nem = String((e && e.message) || e);
  }
  eq(nem, null, "htmlThan không ném lỗi ở trạng thái đang chạy");
  ok(out.indexOf("vt-khoi-nguon") >= 0, "khối (a) chọn nguồn");
  ok(out.indexOf("data-vt-tien-do") >= 0 && out.indexOf(" hidden") < 0, "khối (b) tiến độ hiện khi đang chạy");
  ok(out.indexOf("data-vt-muc=" + NH + "vt_zzdang" + NH) >= 0, "khối (c) có thẻ của bản đang viết");
  ok(out.indexOf("data-vt-muc=" + NH + "vt_zzxong" + NH) >= 0, "khối (c) có thẻ bản đã xong");
  ok(out.indexOf("data-vt-muc=" + NH + "vt_zzloi" + NH) >= 0, "khối (c) có thẻ bản lỗi");
  ok(out.indexOf('class="vt-chip vt-chip-dangChay"') >= 0, "nhãn trạng thái đang viết");
  ok(out.indexOf('class="vt-chip vt-chip-xong"') >= 0, "nhãn trạng thái đã xong");
  ok(out.indexOf('class="vt-chip vt-chip-loi"') >= 0, "nhãn trạng thái lỗi");
  // Lượt đang chạy: thanh tiến độ THẬT (phần tử riêng + bề rộng theo lô), không chỉ chữ.
  ok(out.indexOf('class="vt-bar"') >= 0, "có thanh tiến độ (phần tử thật)");
  ok(out.indexOf("width:50%") >= 0, "bề rộng thanh = lô 2/4");
  ok(out.indexOf("Đang viết lô 2/4") >= 0, "dòng \\\"đang viết lô X/Y\\\"");
  ok(out.indexOf("Dừng ngay") >= 0, "nút dừng NGAY trong khối tiến độ");
  ok(out.indexOf("đã đọc 3/5 đoạn nguồn") >= 0, "dòng đếm của khối (a) khớp tiến độ");
  // Nút chạy đổi thành nút dừng, đúng khuôn ▶️/🛑 của app.
  ok(out.indexOf("data-act=" + NH + "vt-dung" + NH) >= 0, "đang chạy ⇒ nút chính là nút Dừng");
  ok(out.indexOf("data-act=" + NH + "vt-chay" + NH) < 0, "đang chạy ⇒ KHÔNG còn nút chạy");
  // Không đang chạy: nút chạy quay lại và khối (b) ẩn hẳn.
  const nghi = H.htmlThan(ctx({ chay: null }));
  ok(nghi.indexOf("data-act=" + NH + "vt-chay" + NH) >= 0, "nghỉ ⇒ nút Viết thành truyện");
  ok(nghi.indexOf("vt-dung") < 0, "nghỉ ⇒ không còn nút dừng nào");
  ok(nghi.indexOf("data-vt-tien-do>") < 0 && nghi.indexOf(" hidden") >= 0, "nghỉ ⇒ khối tiến độ ẩn");
  ok(nghi.indexOf("đã đọc 0/5 đoạn nguồn") >= 0, "nghỉ ⇒ dòng đếm về 0");
  // Trạng thái LẠ không được rơi về \"đang viết\" (không thì giao diện quay vô hạn).
  ok(out.indexOf("vt-muc-la") < 0, "trạng thái lạ không tạo lớp trạng thái lạ");
  ok(H.nhanTrangThai("la") === "lỗi" && H.nhanTrangThai(undefined) === "lỗi", "trạng thái lạ ⇒ coi như lỗi");
  // Nguồn rỗng: nút chạy bị khoá kèm lời giải thích, không có lượt nào.
  const trong = H.htmlThan(ctx({ tongDoan: 0, chay: null }));
  ok(trong.indexOf("chưa có đoạn nguồn nào để viết") >= 0, "nguồn rỗng ⇒ nói rõ chưa có gì để viết");
  ok(trong.indexOf("data-act=" + NH + "vt-chay" + NH + " disabled") >= 0, "nguồn rỗng ⇒ nút chạy bị khoá");
  // Cổng 18+: hiện nguyên văn lý do của cửa dùng chung và khoá nút chạy.
  // Nghỉ (chay: null) — nút "Dừng" thì KHÔNG bao giờ bị khoá, nên phải soi lúc đang nghỉ.
  const chan = H.htmlThan(ctx({ chan: "Chưa xác nhận 18+ cho nhân vật X.", chay: null }));
  ok(chan.indexOf("Chưa xác nhận 18+ cho nhân vật X.") >= 0, "cổng 18+ hiện lý do");
  ok(chan.indexOf('data-act="vt-chay" disabled') >= 0, "cổng 18+ khoá nút chạy");
  ok(chan.indexOf('class="vt-chan"') >= 0, "lý do 18+ nằm trong khối cảnh báo .vt-chan");
  // Đang chạy thì cổng 18+ đã qua từ trước: nút Dừng vẫn phải bấm được.
  const chanChay = H.htmlThan(ctx({ chan: "Chưa xác nhận 18+ cho nhân vật X." }));
  ok(chanChay.indexOf('data-act="vt-dung"') >= 0, "đang chạy ⇒ vẫn còn nút Dừng dù cổng 18+ còn đó");
});

test("htmlThan chịu được đầu vào thiếu/None mà không ném lỗi", () => {
  const ds = [null, 0, "x", {}, { id: "vt_zzx", trangThai: "dangChay" }];
  for (const x of [{}, null, undefined, { ds }, { ds, chay: {} }, { ds, tongDoan: "abc", loaiNguon: "la", chan: null }]) {
    let nem = null;
    try {
      H.htmlThan(x);
    } catch (e) {
      nem = String((e && e.message) || e);
    }
    eq(nem, null, "không ném lỗi với ctx = " + JSON.stringify(x === undefined ? "undefined" : x).slice(0, 60));
  }
  eq(H.htmlMuc(null, {}), H.htmlMuc(null, {}), "htmlMuc(null) ổn định");
  ok(H.htmlKetQua({}).indexOf("Chưa có bản văn xuôi nào") >= 0, "danh sách rỗng có lời nhắc");
});

test("mọi giá trị động đi qua esc: payload thành CHỮ, không thành phần tử/thuộc tính", () => {
  const out = H.htmlThan(ctx());
  ok(out.indexOf("vtprobe") >= 0, "payload có mặt trong HTML");
  eq(out.indexOf("<i id=" + NH + "vtprobe"), -1, "payload KHÔNG tạo phần tử thật");
  eq(out.indexOf("tvxprobe=" + NH + "1"), -1, "payload KHÔNG tạo thuộc tính thật");
  ok(out.indexOf("&lt;i id=&quot;vtprobe&quot;&gt;") >= 0, "dấu < > \" đã escape");
  ok(out.indexOf("&amp;") >= 0, "dấu & đã escape");
  ok(out.indexOf("&#039;") >= 0, "dấu nháy đơn đã escape");
  // Tiêu đề hội thoại tra được ⇒ esc; tra không ra ⇒ lời nhắc, không phải chuỗi rỗng.
  ok(H.tenHoiThoai(ctx(), "ht_zz1").indexOf("Hội thoại") === 0, "lấy được tiêu đề hội thoại");
  ok(H.tenHoiThoai(ctx(), "ht_zz1").indexOf("TVX") > 0, "tiêu đề lấy từ bảng tra, không phải chuỗi rỗng");
  eq(H.tenHoiThoai(ctx(), "ht_zz9"), "hội thoại đã xoá", "tham chiếu mồ côi có nhãn riêng");
  ok(out.indexOf(H.tenHoiThoai(ctx(), "ht_zz9")) >= 0, "nhãn mồ côi cũng nằm trong HTML");
});

test("các hàm trình bày thuần: phần trăm tiến độ, nhãn nguồn, tên tệp .md", () => {
  eq(H.phanTramTienDo({ lo: 2, tongLo: 4 }), 50, "2/4 ⇒ 50%");
  eq(H.phanTramTienDo({ lo: 0, tongLo: 0 }), 0, "chưa biết tổng ⇒ 0%");
  eq(H.phanTramTienDo({ lo: 9, tongLo: 4 }), 100, "vượt tổng ⇒ kẹp 100%");
  eq(H.phanTramTienDo(null), 0, "không có lượt ⇒ 0%");
  eq(H.phanTramTienDo({ lo: 1, tongLo: 3 }), 33, "làm tròn tới số nguyên");
  eq(H.nhanNguon("tho"), "log thô", "nhãn nguồn log thô");
  eq(H.nhanNguon("canhKhep"), "cảnh đã khép", "nhãn nguồn cảnh khép");
  eq(H.nhanNguon("la"), "log thô", "nguồn lạ ⇒ mặc định log thô");
  ok(H.moTaNguon("canhKhep").length > 10, "có mô tả ngắn cho nguồn cảnh khép");
  eq(H.TRANG_THAI.length, 3, "đúng ba trạng thái của schema đợt 1");
  eq(H.trangThaiCua({ trangThai: "xong" }), "xong", "giữ nguyên trạng thái hợp lệ");
  const ten = H.tenTepMd("Truyện Vai — thử!", { taoLuc: 1700000000000 });
  ok(ten.indexOf(".md") === ten.length - 3, "tên tệp kết thúc bằng .md");
  ok(ten.indexOf("-") >= 0 && ten.indexOf(" ") < 0, "tên tệp bỏ dấu cách");
  ok(H.tenTepMd("", null).indexOf("truyen-viet-thanh-truyen-") === 0, "thiếu tên truyện vẫn có tên tệp hợp lệ");
});
