// Truyện Vai — tầng kiểm thử Node: logic THUẦN của màn "Viết thành truyện" (Giai đoạn 8).
//
// Tệp này kiểm bốn việc mà tính năng `vietTruyen` quyết định TRƯỚC khi gọi model:
//   (1) nguồn để viết (log thô / cảnh đã khép) — đúng lọc, đúng thứ tự;
//   (2) chia nguồn thành các lô vừa một lượt gọi AI — KHÔNG mất chữ, không lô nào vượt ngưỡng;
//   (3) khi nào phải nén phần prose đã viết (mốc 0,6 — đo token, không phải đo ký tự);
//   (4) cắt chỗ nào để giữ nguyên phần cuối (nối liền mạch văn).
//
// Mọi dữ liệu ở đây là HƯ CẤU, id có tiền tố test (`zz`). Không có DOM, không kv, không gọi AI —
// `countTokens`/`idealMaxTokens` được cắm bằng hàm giả để kiểm ĐÚNG ngưỡng.

import { test, ok, eq, eqSau } from "../lib/h.js";
import {
  LOAI_NGUON, TY_LE_NGAN_SACH_NGUON, TY_LE_CAN_NEN, TY_LE_GIU_CUOI,
  layNguonVietTruyen, chiaLoNguon, gioiHanKyTuChoLo, canNenProse,
  cutProseGiuMachVan, phanDauProseCanNen,
} from "../../src/ui/vietTruyen/vietTruyenFlow.js";

const NL = String.fromCharCode(10);
const DOAN = NL + NL;

// Truyện hư cấu tối thiểu: hai hội thoại, hai cảnh đã khép (một cảnh bị huỷ).
function truyen() {
  return {
    id: "ct_zzvt",
    ten: "ZZ Viết thành truyện",
    hoiThoais: [{ id: "ht_zz1" }, { id: "ht_zz2" }],
    canhDaKhep: [
      { id: "canh_zz1", htId: "ht_zz1", htIds: ["ht_zz1"], tomTat: "Cảnh một đã khép.", luc: 30, huy: false },
      { id: "canh_zz2", htId: "ht_zz1", htIds: ["ht_zz1", "ht_zz2"], tomTat: "Cảnh hai đã khép.", luc: 20, huy: false },
      { id: "canh_zz3", htId: "ht_zz1", htIds: ["ht_zz1"], tomTat: "Cảnh bị huỷ.", luc: 10, huy: true },
      { id: "canh_zz4", htId: "ht_zz2", htIds: ["ht_zz2"], tomTat: "Cảnh của hội thoại khác.", luc: 40, huy: false },
      { id: "canh_zz5", htId: "ht_zz1", htIds: ["ht_zz1"], tomTat: "   ", luc: 50, huy: false },
    ],
  };
}

function tinNhan() {
  return [
    { id: "tn_zz1", vai: "he", noiDung: "Đã khép cảnh.", luc: 5 },
    { id: "tn_zz2", vai: "nguoi", noiDung: "Câu của người chơi.", luc: 20 },
    { id: "tn_zz3", vai: "ai", noiDung: "Câu của nhân vật.", luc: 10 },
    { id: "tn_zz4", vai: "anh", noiDung: "Mô tả khung hình.", luc: 15 },
    { id: "tn_zz5", vai: "ai", noiDung: "Tin đến sau, cùng mốc với tin khác.", luc: 30 },
    { id: "tn_zz6", vai: "nguoi", noiDung: "Tin cùng mốc, đứng sau.", luc: 30 },
    { id: "tn_zz7", vai: "ai", noiDung: "   ", luc: 40 },
    { id: "tn_zz8", vai: "ai", noiDung: "", luc: 45 },
  ];
}

test("layNguonVietTruyen · log thô: đúng lọc vai, đúng thứ tự luc, bỏ đoạn rỗng", () => {
  const ra = layNguonVietTruyen(truyen(), "ht_zz1", "tho", tinNhan());
  eqSau(ra, [
    "Câu của nhân vật.",
    "Câu của người chơi.",
    "Tin đến sau, cùng mốc với tin khác.",
    "Tin cùng mốc, đứng sau.",
  ], "chỉ giữ nguoi/ai, theo luc tăng dần, cùng mốc thì giữ thứ tự gốc");
  ok(ra.indexOf("Đã khép cảnh.") < 0, "bỏ dòng `he`");
  ok(ra.indexOf("Mô tả khung hình.") < 0, "bỏ dòng `anh`");
  ok(ra.indexOf("   ") < 0, "bỏ đoạn chỉ có khoảng trắng");
  ok(ra.indexOf("") < 0, "bỏ đoạn rỗng");
  // Không có gì ⇒ mảng rỗng, và không ném lỗi với dữ liệu thiếu.
  eqSau(layNguonVietTruyen(truyen(), "ht_zz1", "tho", []), [], "không có tin nhắn ⇒ rỗng");
  eqSau(layNguonVietTruyen(truyen(), "ht_zz1", "tho"), [], "thiếu danh sách tin nhắn ⇒ rỗng");
  eqSau(layNguonVietTruyen(null, "ht_zz1", "tho", tinNhan()), [], "không có truyện ⇒ rỗng");
  eqSau(layNguonVietTruyen(truyen(), "", "tho", tinNhan()), [], "không có id hội thoại ⇒ rỗng");
  eqSau(layNguonVietTruyen(truyen(), null, "canhKhep"), [], "thiếu id ⇒ rỗng (cả nhánh cảnh khép)");
});

test("layNguonVietTruyen · cảnh đã khép: đúng hội thoại, bỏ cảnh huỷ, theo luc", () => {
  const ra = layNguonVietTruyen(truyen(), "ht_zz1", "canhKhep");
  eqSau(ra, ["Cảnh hai đã khép.", "Cảnh một đã khép."], "theo luc tăng dần, dùng tomTat");
  ok(ra.indexOf("Cảnh bị huỷ.") < 0, "cảnh đã huỷ (huy === true) bị bỏ");
  ok(ra.indexOf("Cảnh của hội thoại khác.") < 0, "cảnh của hội thoại khác bị bỏ");
  ok(ra.indexOf("   ") < 0, "cảnh không có nội dung bị bỏ");
  eqSau(layNguonVietTruyen(truyen(), "ht_zz2", "canhKhep"), ["Cảnh hai đã khép.", "Cảnh của hội thoại khác."], "cảnh trải hai hội thoại (htIds) thuộc về CẢ HAI");
  eqSau(layNguonVietTruyen({ hoiThoais: [] }, "ht_zz1", "canhKhep"), [], "không có cảnh nào ⇒ rỗng");
});

test("layNguonVietTruyen · nguồn lạ rơi về log thô, KHÔNG tự bịa nguồn khác", () => {
  const ra = layNguonVietTruyen(truyen(), "ht_zz1", "khong-co-loai-nay", tinNhan());
  eqSau(ra, layNguonVietTruyen(truyen(), "ht_zz1", "tho", tinNhan()), "loại lạ ⇒ đi đường log thô");
  ok(LOAI_NGUON.indexOf("tho") >= 0 && LOAI_NGUON.indexOf("canhKhep") >= 0, "hằng loại nguồn có đủ hai nguồn");
  // Không được sửa dữ liệu truyện (nguồn chỉ ĐỌC).
  const s = truyen();
  const truoc = JSON.stringify(s);
  layNguonVietTruyen(s, "ht_zz1", "canhKhep");
  layNguonVietTruyen(s, "ht_zz1", "tho", tinNhan());
  eq(JSON.stringify(s), truoc, "truyện không đổi một ký tự");
});

test("chiaLoNguon · không mất chữ, không lô nào vượt ngưỡng, giữ nguyên thứ tự", () => {
  const doan = ["Đoạn một có mấy chữ.", "Đoạn hai dài hơn một chút, có dấu phẩy, và chữ.", "Đoạn ba.", "Đoạn bốn cũng có chữ ở đây."];
  const tong = doan.join("").length;
  for (const gh of [1, 2, 3, 7, 12, 20, 33, 60, 200, 10000]) {
    const lo = chiaLoNguon(doan, gh);
    let soManh = 0, soKyTu = 0, vuot = 0;
    for (const l of lo) {
      let dai = (l.length - 1) * 2; // các mảnh trong một lô được nối bằng dòng trống
      for (const t of l) { soManh += 1; dai += t.length; soKyTu += t.length; }
      if (dai > gh) vuot += 1;
    }
    eq(soKyTu, tong, "gh=" + gh + ": tổng ký tự giữ nguyên");
    ok(vuot === 0, "gh=" + gh + ": không lô nào vượt ngưỡng");
    eq(lo.map((l) => l.join("")).join(""), doan.join(""), "gh=" + gh + ": nối các mảnh ra đúng nguồn gốc");
    ok(soManh >= doan.length, "gh=" + gh + ": không mất đoạn nào (" + soManh + " mảnh)");
  }
  eq(chiaLoNguon(doan, 10000).length, 1, "ngưỡng rộng ⇒ đúng một lô");
  ok(chiaLoNguon(doan, 1).length >= 4, "ngưỡng 1 ký tự ⇒ tách hết mức có thể");
});

test("chiaLoNguon · đoạn dài hơn ngưỡng bị cắt ở ranh giới câu, giữ nguyên từng ký tự", () => {
  const doan = ["Câu một ở đây. Câu hai ở đây. Câu ba ở đây. Câu bốn ở đây."];
  const lo = chiaLoNguon(doan, 30);
  ok(lo.length >= 2, "đoạn dài bị cắt thành nhiều lô");
  for (const l of lo) ok(l.join("").length <= 30, "mỗi lô ≤ ngưỡng");
  eq(lo.map((l) => l.join("")).join(""), doan[0], "nối lại đúng đoạn gốc");
  const manh = [];
  for (const l of lo) for (const t of l) manh.push(t);
  ok(manh.filter((t) => t.slice(-1) === ".").length >= 2, "cắt sau dấu chấm khi có thể");
  ok(manh.slice(0, -1).every((t) => t.slice(-1) === "." || t.slice(-1) === " "), "không cắt giữa từ");
  // Đoạn KHÔNG có dấu câu và không có khoảng trắng: vẫn phải cắt thẳng để không vượt ngưỡng.
  const lienTuc = "a".repeat(25);
  const lo2 = chiaLoNguon([lienTuc], 10);
  ok(lo2.length >= 3, "chuỗi liền một khối vẫn bị cắt");
  for (const l of lo2) ok(l.join("").length <= 10, "mỗi lô ≤ ngưỡng (cắt thẳng)");
  eq(lo2.map((l) => l.join("")).join(""), lienTuc, "cắt thẳng vẫn không mất ký tự");
});

test("chiaLoNguon · biên: rỗng, ngưỡng vô lý, mục rỗng", () => {
  eqSau(chiaLoNguon([], 100), [], "nguồn rỗng ⇒ không lô nào");
  eqSau(chiaLoNguon(null, 100), [], "không phải mảng ⇒ không lô nào");
  for (const gh of [0, -5, NaN, Infinity, "khong-phai-so"]) {
    const lo = chiaLoNguon(["a", "b"], gh);
    eq(lo.length, 1, "ngưỡng " + String(gh) + " ⇒ một lô duy nhất (không mất chữ)");
    eqSau(lo[0], ["a", "b"], "và giữ đủ đoạn");
  }
  eqSau(chiaLoNguon(["", "a", "", "b"], 100), [["a", "b"]], "đoạn rỗng bị bỏ (không có chữ để viết)");
  eqSau(chiaLoNguon(["a", 5, null, "b"], 100), [["a", "5", "b"]], "mục không phải chuỗi được ép về chuỗi");
});

test("chiaLoNguon · ĐỐI CHỨNG ÂM: đoạn lặp ở hai chỗ vẫn là HAI đoạn, không gộp không bỏ", () => {
  // Lỗi thật cần chặn: gộp/khử trùng đoạn trùng nhau (nhân vật lặp lại bối cảnh ở hai đoạn khác
  // nhau là chuyện thường trong log thật) — gộp là mất một đoạn của người dùng.
  const lap = "Cùng một câu y hệt như nhau.";
  const doan = [lap, "Ở giữa có đoạn khác.", lap];
  for (const gh of [3, 20, 40, 1000]) {
    const lo = chiaLoNguon(doan, gh);
    const ghep = lo.map((l) => l.join("")).join("");
    eq(ghep, doan.join(""), "gh=" + gh + ": nối mọi mảnh ra đúng nguồn gốc");
    // Cắt lại theo độ dài BA đoạn gốc: phải ra đúng ba đoạn, đúng thứ tự (đoạn lặp hai lần).
    const lai = [];
    let i = 0;
    for (const d of doan) {
      lai.push(ghep.slice(i, i + d.length));
      i += d.length;
    }
    eqSau(lai, doan, "gh=" + gh + ": đủ ba đoạn, đúng thứ tự, đoạn lặp không bị gộp");
  }
  const lo = chiaLoNguon(doan, 1000);
  eq(lo.length, 1, "ngưỡng rộng ⇒ một lô");
  eq(lo[0].length, 3, "và lô đó có đủ BA đoạn");
  eq(lo[0].filter((t) => t === lap).length, 2, "đoạn lặp xuất hiện hai lần");
});

test("gioiHanKyTuChoLo · ngân sách ký tự ĐO từ countTokens, không hard-code", () => {
  const dem4 = (t) => Math.ceil(String(t === undefined || t === null ? "" : t).length / 4); // 1 token ≈ 4 ký tự
  const mau = "x".repeat(400);
  const nganSach = Math.floor(1000 * TY_LE_NGAN_SACH_NGUON);
  eq(gioiHanKyTuChoLo(dem4, () => 1000, mau), nganSach * 4, "đo trên chính văn bản mẫu: 4 ký tự/token");
  eq(gioiHanKyTuChoLo(dem4, 250, mau), Math.floor(250 * TY_LE_NGAN_SACH_NGUON) * 4, "nhận cả số cho ngân sách token");
  // Đo lại bằng chính `countTokens`: ngân sách ký tự trả về phải đúng ~ngân sách token cho phép.
  const gh = gioiHanKyTuChoLo(dem4, () => 1000, mau);
  ok(dem4("x".repeat(gh)) <= nganSach, "đo lại bằng countTokens vẫn nằm trong ngân sách token");
  ok(dem4("x".repeat(gh + 4)) > nganSach, "và đúng là mức tối đa có thể (không bị hụt)");
  // Bộ đếm khác cách đo ⇒ ngưỡng đổi theo, KHÔNG có hằng số ký tự nào cố định trong hàm.
  const dem1 = (t) => String(t === undefined || t === null ? "" : t).length;
  eq(gioiHanKyTuChoLo(dem1, () => 1000, mau), nganSach, "1 ký tự/token ⇒ ngưỡng bằng ngân sách token");
  // Đường dự phòng: không đo được thì dùng tỉ lệ mặc định (bằng mặc định của countTokens trong ai.js).
  const duPhong = Math.floor(nganSach * 3.6);
  eq(gioiHanKyTuChoLo(null, () => 1000, mau), duPhong, "thiếu bộ đếm ⇒ dùng tỉ lệ mặc định");
  eq(gioiHanKyTuChoLo(dem4, () => 1000, ""), duPhong, "không có văn bản để đo ⇒ dùng tỉ lệ mặc định");
  eq(gioiHanKyTuChoLo(() => 0, () => 1000, mau), duPhong, "bộ đếm trả 0 ⇒ dùng tỉ lệ mặc định");
  eq(gioiHanKyTuChoLo(() => NaN, () => 1000, mau), duPhong, "bộ đếm trả không hợp lệ ⇒ dùng tỉ lệ mặc định");
  for (const x of [0, -100, NaN, undefined, "khong-phai-so"]) {
    eq(gioiHanKyTuChoLo(dem4, () => x, mau), 0, "ngân sách " + String(x) + " ⇒ 0 = không giới hạn");
  }
  // Và ngưỡng đó dùng được ngay với `chiaLoNguon`: mọi lô đều nằm trong ngân sách token.
  const doan = [];
  for (let i = 0; i < 200; i++) doan.push("Đoạn " + i + " có vài chữ ở đây và dài hơn một chút để vượt ngưỡng.");
  const lo = chiaLoNguon(doan, gh);
  ok(lo.length > 1, "nguồn dài bị chia thành nhiều lô (" + lo.length + ")");
  for (const l of lo) ok(dem4(l.join(DOAN)) <= nganSach, "mỗi lô nằm trong ngân sách token");
  eq(lo.map((l) => l.join("")).join(""), doan.join(""), "và không mất chữ nào");
});

test("canNenProse · mốc 0,6 theo TOKEN, không phải theo ký tự", () => {
  const ideal = 1000;
  const dung = (n) => (t) => n;
  eq(canNenProse("prose", () => ideal, dung(600)), false, "đúng 0,6 ngân sách ⇒ CHƯA nén");
  eq(canNenProse("prose", () => ideal, dung(601)), true, "vượt 0,6 ngân sách ⇒ phải nén");
  eq(canNenProse("prose", () => ideal, dung(599)), false, "dưới mốc ⇒ chưa nén");
  eq(canNenProse("prose", 1000, dung(900)), true, "nhận cả số thay vì hàm cho ngân sách");
  eq(canNenProse("prose", () => 0, dung(900)), false, "ngân sách 0 ⇒ không kết luận được, không nén");
  eq(canNenProse("prose", () => NaN, dung(900)), false, "ngân sách không hợp lệ ⇒ không nén");
  eq(canNenProse("", () => ideal, dung(900)), false, "chưa viết gì ⇒ không nén");
  eq(canNenProse("   " + NL, () => ideal, dung(900)), false, "chỉ có khoảng trắng ⇒ không nén");
  eq(canNenProse("prose", () => ideal, null), false, "thiếu hàm đếm token ⇒ không nén");
  eq(canNenProse("prose", () => ideal, () => NaN), false, "bộ đếm trả về không hợp lệ ⇒ không nén");
  ok(TY_LE_CAN_NEN === 0.6, "mốc nén là 0,6 (không phải 0,88 của cơ chế tóm tắt nhập vai)");
  // Số lần gọi bộ đếm: chỉ gọi MỘT lần cho mỗi lượt kiểm (không gọi thừa trên chuỗi dài).
  let soLan = 0;
  canNenProse("prose dài", () => ideal, (t) => { soLan += 1; return 700; });
  eq(soLan, 1, "gọi bộ đếm đúng một lần");
});

test("cutProseGiuMachVan · giữ đúng tỉ lệ, cắt ở ranh giới đoạn, không cắt giữa câu", () => {
  const doan = [];
  for (let i = 1; i <= 10; i++) doan.push("Đoạn số " + i + " có vài câu. Câu thứ hai của đoạn " + i + " dài hơn một chút.");
  const prose = doan.join(DOAN);
  const giu = cutProseGiuMachVan(prose);
  ok(prose.endsWith(giu), "phần giữ là ĐUÔI NGUYÊN VĂN của prose");
  ok(giu.length >= Math.floor(prose.length * TY_LE_GIU_CUOI), "giữ được ít nhất tỉ lệ đã đòi");
  ok(giu.length < prose.length / 2, "và không giữ quá nửa bài");
  ok(giu.indexOf("Đoạn số 1 ") < 0, "bỏ hẳn phần đầu");
  ok(giu.slice(0, 8) === "Đoạn số ", "cắt đúng ở ĐẦU một đoạn");
  // Không cắt giữa câu: mọi câu còn lại trong phần giữ đều trọn vẹn (kết bằng dấu chấm).
  const cau = giu.split(". ");
  ok(cau.length > 1, "phần giữ có nhiều câu");
  for (let i = 0; i < cau.length - 1; i++) ok(cau[i].length > 0, "không có câu rỗng ở giữa phần giữ");
  // Tỉ lệ khác: tỉ lệ lớn thì giữ nhiều hơn, tỉ lệ nhỏ thì giữ ít hơn.
  const giuNua = cutProseGiuMachVan(prose, 0.5);
  ok(giuNua.length > giu.length, "tỉ lệ 0,5 giữ nhiều hơn 0,2");
  ok(giuNua.length >= Math.floor(prose.length * 0.5), "và vẫn đủ tỉ lệ đã đòi");
  eq(cutProseGiuMachVan(prose, 1), prose, "tỉ lệ 1 ⇒ giữ tất cả");
  eq(cutProseGiuMachVan(prose, 2), prose, "tỉ lệ > 1 ⇒ giữ tất cả");
});

test("cutProseGiuMachVan · biên: rỗng, tỉ lệ vô lý, văn một khối, và phép chia đôi", () => {
  const prose = ["A".repeat(40), "B".repeat(40), "C".repeat(40)].join(DOAN);
  eq(cutProseGiuMachVan("", 0.2), "", "prose rỗng ⇒ chuỗi rỗng");
  eq(cutProseGiuMachVan(null, 0.2), "", "null ⇒ chuỗi rỗng");
  eq(cutProseGiuMachVan(prose, 0), "", "tỉ lệ 0 ⇒ không giữ gì");
  eq(cutProseGiuMachVan(prose, -1), "", "tỉ lệ âm ⇒ không giữ gì");
  eq(cutProseGiuMachVan(prose, NaN), "", "tỉ lệ không hợp lệ ⇒ không giữ gì");
  // Văn MỘT khối liền (không có dòng trống): vẫn giữ đủ tỉ lệ, cắt ở ranh giới câu.
  const mot = "Câu một ở đây. Câu hai ở đây. Câu ba ở đây. Câu bốn ở đây. Câu năm ở đây.";
  const giu = cutProseGiuMachVan(mot, 0.3);
  ok(mot.endsWith(giu), "vẫn là đuôi nguyên văn");
  ok(giu.length >= Math.floor(mot.length * 0.3), "vẫn đủ tỉ lệ");
  ok(giu.slice(0, 7) !== "âu hai", "không bắt đầu giữa từ");
  // Phép chia đôi: phần đầu + phần cuối = prose, không chồng, không sót.
  for (const ty of [0.1, 0.2, 0.33, 0.5, 0.75]) {
    const cuoi = cutProseGiuMachVan(prose, ty);
    const dau = phanDauProseCanNen(prose, ty);
    eq(dau + cuoi, prose, "ty=" + ty + ": hai phần ghép lại đúng prose");
    eq(dau.length + cuoi.length, prose.length, "ty=" + ty + ": không mất ký tự nào");
  }
  ok(TY_LE_GIU_CUOI === 0.2, "tỉ lệ giữ mặc định là 20%");
  ok(TY_LE_NGAN_SACH_NGUON === 0.4 && TY_LE_NGAN_SACH_NGUON + TY_LE_CAN_NEN === 1, "hai ngân sách cộng lại bằng 1");
});
