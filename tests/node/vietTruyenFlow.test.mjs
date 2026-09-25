// Truyện Vai — tầng kiểm thử Node: logic THUẦN của màn "Viết thành truyện" (Giai đoạn 8).
//
// Tệp này kiểm bảy việc của tính năng `vietTruyen`: sáu việc quyết định TRƯỚC khi gọi model, cộng
// LUỒNG CHẠY THẬT (đợt 5) — chạy cả một lượt với model GIẢ để ghim số lần gọi, thứ tự khối prompt,
// cách nối prose, lỗi giữa chừng, dừng giữa chừng và lúc kích hoạt nén:
//   (1) nguồn để viết (log thô / cảnh đã khép) — đúng lọc, đúng thứ tự;
//   (2) chia nguồn thành các lô vừa một lượt gọi AI — KHÔNG mất chữ, không lô nào vượt ngưỡng;
//   (3) khi nào phải nén phần prose đã viết (mốc 0,6 — đo token, không phải đo ký tự);
//   (4) cắt chỗ nào để giữ nguyên phần cuối (nối liền mạch văn);
//   (5) khối nguyên tắc ở ĐẦU prompt (tĩnh, cache-able) + ghi chú khi truyện ở chế độ người lớn;
//   (6) cổng 18+ trước khi chạy — qua cửa chặn DÙNG CHUNG, và KHÔNG hỏi lại 18+.
//   (7) `chayVietTruyen` — lô nào gọi model nào, prompt lắp thế nào, prose nối ra sao, hỏng/dừng thì
//       giữ được gì;
//
// Mọi dữ liệu ở đây là HƯ CẤU, id có tiền tố test (`zz`). Không có DOM, không kv, không gọi AI —
// `countTokens`/`idealMaxTokens` được cắm bằng hàm giả để kiểm ĐÚNG ngưỡng.
//
// Phần cổng 18+ cố tình dùng `chanNoiDungNguoiLon` THẬT (import từ store.js) làm mốc so sánh: ca
// kiểm không được phép tự đoán lý do, nó phải chứng minh kết quả bằng ĐÚNG hàm dùng chung của app.

import { test, ok, eq, eqSau } from "../lib/h.js";
import {
  LOAI_NGUON, TY_LE_NGAN_SACH_NGUON, TY_LE_CAN_NEN, TY_LE_GIU_CUOI,
  layNguonVietTruyen, chiaLoNguon, gioiHanKyTuChoLo, canNenProse,
  cutProseGiuMachVan, phanDauProseCanNen,
  layNguyenTacVietTruyen, GHI_CHU_MUC_DO_NGUOI_LON, layNguyenTacVietTruyenCho,
  kiemVietTruyenTruocKhiChay,
  NHAN_DA_VIET, NHAN_TOM_TAT, NHAN_DUOI, NHAN_NGUON, nhanTaskLo, dungPromptVietLo, dungPromptNenProse,
  demDoanDaDoc, dsVietRa, noiDungDeXuat, chayVietTruyen,
} from "../../src/ui/vietTruyen/vietTruyenFlow.js";
import { chanNoiDungNguoiLon } from "../../src/store.js";

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

// --------------------------------------------------------------- nguyên tắc + cổng 18+ (Đợt 3)
// Bốn truyện hư cấu cho phần này — bốn tình trạng khác nhau của lớp nội dung người lớn. Cửa chặn
// dùng chung (`chanNoiDungNguoiLon`) phán định theo TỪNG nhân vật, nên tuổi ở đây chỉ có ý nghĩa
// qua chính hàm đó; id đều mang tiền tố test (`zz`).
function truyenThuong() {
  return { id: "ct_zzvt", ten: "ZZ Viết thành truyện", giaoKeo: { bat: false }, nhanVats: [] };
}

function truyenNguoiLon() {
  return {
    id: "ct_zzvt", ten: "ZZ Viết thành truyện", giaoKeo: { bat: true },
    nhanVats: [
      { id: "nv_zzvt1", ten: "ZZ Fixture A", tuoi: 31, nguoiLon: true },
      { id: "nv_zzvt2", ten: "ZZ Fixture B", tuoi: 29, nguoiLon: true },
    ],
  };
}

function truyenChuaXacNhan() {
  return {
    id: "ct_zzvt", ten: "ZZ Viết thành truyện", giaoKeo: { bat: true },
    nhanVats: [
      { id: "nv_zzvt1", ten: "ZZ Fixture A", tuoi: 31, nguoiLon: true },
      { id: "nv_zzvt2", ten: "ZZ Fixture B", tuoi: 29 },
    ],
  };
}

function truyenCoTre() {
  return {
    id: "ct_zzvt", ten: "ZZ Viết thành truyện", giaoKeo: { bat: true },
    nhanVats: [{ id: "nv_zzvt3", ten: "ZZ Fixture C", tuoi: 15, nguoiLon: true }],
  };
}

test("layNguyenTacVietTruyen · đủ BA nguyên tắc, khối TĨNH không phụ thuộc truyện", () => {
  const t = layNguyenTacVietTruyen();
  ok(typeof t === "string" && t.length > 0, "trả về chuỗi khối prompt");
  eq(layNguyenTacVietTruyen.length, 0, "KHÔNG nhận tham số ⇒ cắm thẳng vào ĐẦU prompt (phần cache-able)");
  // Nguyên tắc 1 — nguồn là sự thật đã roleplay, cấm tự bịa thêm.
  ok(t.indexOf("Không tự bịa thêm") >= 0, "P1: nêu đích danh “không tự bịa thêm”");
  ok(t.indexOf("SỰ THẬT") >= 0, "P1: nói rõ nguồn là SỰ THẬT đã diễn ra");
  ok(t.indexOf("cấm thêm") >= 0, "P1: có chữ “cấm thêm”");
  ok(t.indexOf("tình huống") >= 0 && t.indexOf("nhân vật") >= 0 && t.indexOf("địa điểm") >= 0,
    "P1: cấm thêm CẢ tình huống, nhân vật lẫn địa điểm không có trong nguồn");
  ok(t.indexOf("log thô") >= 0 && t.indexOf("tóm tắt cảnh") >= 0, "P1: chỉ đích danh hai LOẠI nguồn");
  // Nguyên tắc 2 — mỗi đoạn nguồn phải thành CẢNH THẬT, không phải câu tóm lược.
  ok(t.indexOf("cảnh THẬT") >= 0, "P2: đòi viết thành “cảnh THẬT”");
  ok(t.indexOf("không phải một câu tóm lược") >= 0, "P2: loại trừ đúng kiểu “câu tóm lược”");
  ok(t.indexOf("tóm tắt cảnh khép") >= 0, "P2: nói tới cả dòng tóm tắt cảnh khép ngắn");
  ok(t.indexOf("hành động") >= 0 && t.indexOf("lời nói") >= 0, "P2: cảnh phải có hành động và lời nói cụ thể");
  // Nguyên tắc 3 — chung nhân vật/địa điểm KHÔNG có nghĩa đoạn trước đã xong.
  ok(t.indexOf("chung nhân vật") >= 0, "P3: nêu đúng điều kiện “chung nhân vật/địa điểm”");
  ok(t.indexOf("KHÔNG có nghĩa là đoạn trước đã xong") >= 0, "P3: phủ định đúng trực giác sai đó");
  ok(t.indexOf("riêng biệt") >= 0, "P3: mỗi đoạn phải xuất hiện riêng biệt");
  ok(t.indexOf("đầy đủ") >= 0, "P3: và đầy đủ");
  // TĨNH: gọi lại ra y hệt, và khối tĩnh KHÔNG chứa ghi chú người lớn (ghi chú nằm ở phần nối thêm).
  eq(layNguyenTacVietTruyen(), t, "gọi lại ra ĐÚNG chuỗi đó (không phụ thuộc trạng thái nào)");
  eq(t.indexOf(GHI_CHU_MUC_DO_NGUOI_LON), -1, "khối tĩnh KHÔNG chứa ghi chú người lớn");
});

test("layNguyenTacVietTruyenCho · ghi chú người lớn thêm ĐÚNG khi lớp người lớn đang bật", () => {
  const goc = layNguyenTacVietTruyen();
  const t1 = layNguyenTacVietTruyenCho(truyenThuong());
  const t2 = layNguyenTacVietTruyenCho(truyenNguoiLon());
  eq(t1, goc, "truyện thường ⇒ đúng khối tĩnh, không thêm gì");
  ok(t2.indexOf(goc) === 0, "truyện người lớn ⇒ khối tĩnh vẫn là TIỀN TỐ (không đổi phần cache-able)");
  eq(t2.slice(goc.length + NL.length), GHI_CHU_MUC_DO_NGUOI_LON, "phần nối thêm là nguyên văn ghi chú");
  eq(t2.length - t1.length, GHI_CHU_MUC_DO_NGUOI_LON.length + NL.length, "chênh ĐÚNG một dòng");
  // Ghi chú nói đúng điều phải nói: đổi hình thức, không đổi mức độ.
  ok(GHI_CHU_MUC_DO_NGUOI_LON.indexOf("mức độ rõ ràng") >= 0, "ghi chú ghim “giữ đúng mức độ rõ ràng của nguồn”");
  ok(GHI_CHU_MUC_DO_NGUOI_LON.indexOf("không tự làm nhẹ") >= 0, "ghi chú ghim “không tự làm nhẹ”");
  // Cờ quyết định: đúng cờ mà `store.js` dùng (`story.giaoKeo.bat`).
  eq(layNguyenTacVietTruyenCho(null), goc, "không có truyện ⇒ không thêm ghi chú");
  eq(layNguyenTacVietTruyenCho({}), goc, "truyện rỗng ⇒ không thêm ghi chú");
  eq(layNguyenTacVietTruyenCho({ giaoKeo: { bat: false } }), goc, "giao kèo TẮT ⇒ không thêm ghi chú");
  eq(layNguyenTacVietTruyenCho({ giaoKeo: { bat: true } }).indexOf(GHI_CHU_MUC_DO_NGUOI_LON), goc.length + NL.length,
    "giao kèo BẬT ⇒ có ghi chú, ngay sau khối tĩnh");
});

test("kiemVietTruyenTruocKhiChay · chặn ĐÚNG theo cửa 18+ DÙNG CHUNG, và không hỏi lại", () => {
  // Cho qua khi cửa dùng chung trả RỖNG.
  eqSau(kiemVietTruyenTruocKhiChay(truyenThuong()), { choPhep: true, loiNeu: "" }, "truyện thường ⇒ cho chạy");
  eqSau(kiemVietTruyenTruocKhiChay(truyenNguoiLon()), { choPhep: true, loiNeu: "" }, "truyện người lớn hợp lệ ⇒ cho chạy");
  eqSau(kiemVietTruyenTruocKhiChay({}), { choPhep: true, loiNeu: "" }, "truyện chưa có nhân vật ⇒ chưa có gì để chặn");
  // Chặn khi cửa dùng chung trả KHÁC RỖNG — và lý do trả về là NGUYÊN VĂN của cửa đó.
  const caChan = [["có nhân vật ghi tuổi dưới 18", truyenCoTre()], ["có nhân vật chưa xác nhận trưởng thành", truyenChuaXacNhan()]];
  for (const cap of caChan) {
    const ly = chanNoiDungNguoiLon(cap[1]);
    ok(ly !== "", "mốc: chanNoiDungNguoiLon THẬT chặn trường hợp " + cap[0]);
    const kq = kiemVietTruyenTruocKhiChay(cap[1]);
    eq(kq.choPhep, false, "bị chặn (" + cap[0] + ")");
    eq(kq.loiNeu, ly, "lý do là nguyên văn của cửa dùng chung (" + cap[0] + ")");
    ok(kq.loiNeu.trim().length > 0, "lý do không rỗng ⇒ giao diện có câu để hiện (" + cap[0] + ")");
  }
  // Bất biến HAI CHIỀU: choPhep ⟺ cửa dùng chung trả rỗng.
  for (const s of [null, {}, truyenThuong(), truyenNguoiLon(), truyenChuaXacNhan(), truyenCoTre()]) {
    eq(kiemVietTruyenTruocKhiChay(s).choPhep, chanNoiDungNguoiLon(s) === "", "choPhep ⟺ lý do rỗng");
  }
  eq(kiemVietTruyenTruocKhiChay(null).choPhep, false, "thiếu truyện ⇒ CHẶN, không im lặng cho qua");
  // Câu chữ chặn là của cửa dùng chung, không phải câu tự chế ở đây.
  ok(chanNoiDungNguoiLon(truyenChuaXacNhan()).indexOf("CHƯA được xác nhận") >= 0, "dùng đúng câu chữ “CHƯA được xác nhận” của store.js");
  // THUẦN: cổng chỉ ĐỌC — không tự bật/tắt giao kèo, không tự ghi cờ `nguoiLon` (tức không hỏi lại 18+).
  for (const s of [truyenThuong(), truyenNguoiLon(), truyenChuaXacNhan(), truyenCoTre()]) {
    const truoc = JSON.stringify(s);
    const kq = kiemVietTruyenTruocKhiChay(s);
    eq(JSON.stringify(s), truoc, "cổng không sửa gì trong truyện");
    eq(typeof kq.choPhep, "boolean", "choPhep là boolean");
    eq(typeof kq.loiNeu, "string", "loiNeu là chuỗi");
  }
});

// ==========================================================================
// Đợt 5 — LUỒNG CHẠY THẬT (chayVietTruyen) với model GIẢ
// ==========================================================================
// Không tốn quota: hai hàm gọi model được cắm bằng bản giả, nên kiểm được ĐÚNG số lần gọi, ĐÚNG thứ
// tự khối trong prompt và ĐÚNG cách nối prose — thứ mà chỉ chạy thật mới thấy và không kiểm lại được.

// Nguồn giả 9 đoạn, mỗi đoạn 100 ký tự. Với countTokens giả ở dưới (10 ký tự = 1 token, trần 100
// token) ngân sách một lô là 400 ký tự ⇒ 3 đoạn một lô, đúng 3 lô.
function nguonDai(soDoan) {
  const ra = [];
  for (let i = 0; i < soDoan; i++) ra.push("ZZ đoạn " + (i + 1) + " " + "x".repeat(80) + " kết thúc.");
  return ra;
}
const DEM_KY_TU = (s) => Math.ceil(String(s || "").length / 10);
const TRAN_TOKEN = () => 100;
function tinNhanTuNguon(nguon) {
  return nguon.map((t, i) => ({ id: "tn_zzvt" + i, vai: i % 2 === 0 ? "nguoi" : "ai", noiDung: t, luc: i + 1 }));
}
// Model giả: ghi lại MỌI prompt theo thứ tự, trả về chữ do ca kiểm quyết định.
function modelGia(dsTra) {
  const goi = [];
  let dangGoi = false;
  const viet = async (prompt, khiChunk) => {
    dangGoi = true;
    goi.push({ loai: "viet", prompt });
    const ra = typeof dsTra === "function" ? dsTra(goi.length - 1, prompt) : dsTra[goi.length - 1];
    if (khiChunk && ra.text) khiChunk(ra.text);
    dangGoi = false;
    return ra;
  };
  const nen = async (prompt) => {
    dangGoi = true;
    goi.push({ loai: "nen", prompt });
    dangGoi = false;
    return { text: "TÓM TẮT GIẢ ĐỊNH" };
  };
  return { goi, viet, nen, dangGoiFn: () => dangGoi };
}
function truyenCoNguon(nguon) {
  const s = truyenThuong();
  s.hoiThoais = [{ id: "ht_zz1", tieuDe: "ZZ hội thoại" }];
  s.tinNhan = tinNhanTuNguon(nguon);
  return s;
}
function chay(opts) {
  return chayVietTruyen(Object.assign({
    hoiThoaiId: "ht_zz1", loaiNguon: "tho", countTokens: DEM_KY_TU, idealMaxTokens: TRAN_TOKEN,
  }, opts));
}

test("chayVietTruyen · gọi model ĐÚNG số lô, prompt đúng thứ tự khối, prose nối đúng thứ tự", async () => {
  const nguon = nguonDai(9);
  const story = truyenCoNguon(nguon);
  const m = modelGia([{ text: "LÔ MỘT." }, { text: "LÔ HAI." }, { text: "LÔ BA." }]);
  const moiLo = [];
  const chunk = [];
  const kq = await chay({
    story, tinNhan: story.tinNhan, viet: m.viet, nen: m.nen,
    khiChunk: (text, o) => chunk.push(o.lo + ":" + text),
    khiMoiLo: (o) => moiLo.push(o),
  });
  eq(m.goi.length, 3, "gọi model ĐÚNG số lô (3)");
  eq(kq.soLo, 3, "soLo = 3");
  eq(kq.soLanViet, 3, "soLanViet = 3");
  eq(kq.soLanNen, 0, "chưa cần nén");
  eq(kq.trangThai, "xong", "chạy hết ⇒ xong");
  eq(kq.daDung, false, "không ai bấm dừng");
  eq(kq.proseDaViet, "LÔ MỘT." + DOAN + "LÔ HAI." + DOAN + "LÔ BA.", "prose nối đúng thứ tự, không trùng/thiếu lô");
  eqSau(moiLo.map((o) => o.lo), [1, 2, 3], "báo tiến độ sau từng lô");
  eq(moiLo[2].proseDaViet, kq.proseDaViet, "mốc cuối bằng đúng prose trả về");
  eqSau(moiLo.map((o) => o.daDoc), [3, 6, 9], "số đoạn nguồn đã đọc tăng theo lô");
  eq(moiLo[2].tongDoan, 9, "tổng số đoạn nguồn là 9");
  eq(chunk[chunk.length - 1], "3:LÔ MỘT." + DOAN + "LÔ HAI." + DOAN + "LÔ BA.", "chữ chạy dần kết thúc đúng bằng cả prose");
  // Thứ tự khối: khối nguyên tắc TĨNH phải là TIỀN TỐ của MỌI prompt (điều kiện của prefix cache),
  // rồi tới phần đã viết, rồi TASK, rồi nguồn của lô.
  const nguyenTac = layNguyenTacVietTruyenCho(story);
  for (let i = 0; i < m.goi.length; i++) {
    const p = m.goi[i].prompt;
    eq(p.indexOf(nguyenTac), 0, "prompt lô " + (i + 1) + ": khối nguyên tắc tĩnh đứng ĐẦU");
    ok(p.indexOf(NHAN_NGUON) > p.indexOf("TASK:"), "prompt lô " + (i + 1) + ": TASK trước nguồn");
    if (i === 0) ok(p.indexOf(NHAN_DA_VIET) < 0, "prompt lô 1: chưa có gì để nối ⇒ không có khối đã viết");
    else ok(p.indexOf(NHAN_DA_VIET) < p.indexOf("TASK:"), "prompt lô " + (i + 1) + ": phần đã viết nằm TRƯỚC TASK");
  }
  ok(m.goi[0].prompt.indexOf(nguon[0]) > 0, "prompt lô 1 mang đúng đoạn nguồn của lô 1");
  ok(m.goi[1].prompt.indexOf("LÔ MỘT.") > 0, "prompt lô 2 mang prose đã viết");
  ok(m.goi[1].prompt.indexOf(nguon[3]) > 0 && m.goi[1].prompt.indexOf(nguon[0]) < 0, "prompt lô 2 chỉ mang nguồn của lô 2");
  ok(m.goi[1].prompt.indexOf(nguon[3]) > m.goi[1].prompt.indexOf("TASK:"), "nguồn lô nằm CUỐI prompt");
});

test("chayVietTruyen · lô giữa hỏng: trangThai loi, lô 1 KHÔNG mất, chữ sinh dở vẫn giữ", async () => {
  const nguon = nguonDai(9);
  const story = truyenCoNguon(nguon);
  const m = modelGia((i) => (i === 0 ? { text: "LÔ MỘT." } : { text: "DỞ DANG", stopReason: "error" }));
  const kq = await chay({ story, tinNhan: story.tinNhan, viet: m.viet, nen: m.nen });
  eq(m.goi.length, 2, "dừng ngay ở lô hỏng, không gọi lô 3");
  eq(kq.trangThai, "loi", "có lô hỏng ⇒ trangThai loi");
  eq(kq.daDung, false, "lỗi không phải là dừng");
  eq(kq.soLoDaXong, 1, "mới xong 1 lô");
  ok(kq.proseDaViet.indexOf("LÔ MỘT.") === 0, "nội dung lô 1 còn NGUYÊN (không rollback về rỗng)");
  ok(kq.proseDaViet.indexOf("DỞ DANG") > 0, "giữ cả chữ đã sinh dở của lô hỏng (người dùng đã nhìn thấy nó)");
  ok(kq.loiNeu.indexOf("lô 2/3") > 0, "lý do nói rõ hỏng ở lô nào");
  ok(kq.loiNeu.indexOf("giữ nguyên") > 0, "lý do nói rõ phần đã viết được giữ");
  // Không có chữ nào (hỏng ngay lô đầu) ⇒ prose rỗng, vẫn là loi và vẫn có lý do.
  const m2 = modelGia([{ text: "", stopReason: "error" }]);
  const kq2 = await chay({ story, tinNhan: story.tinNhan, viet: m2.viet, nen: m2.nen });
  eq(kq2.trangThai, "loi", "hỏng ngay từ lô đầu ⇒ loi");
  eq(kq2.proseDaViet, "", "không có chữ nào ⇒ prose rỗng (vỏ màn bỏ mục rỗng)");
  ok(kq2.loiNeu.trim().length > 0, "vẫn có lý do để hiện");
});

test("chayVietTruyen · dừng giữa chừng: KHÔNG cắt ngang lô đang gọi, giữ phần đã viết", async () => {
  const nguon = nguonDai(9);
  const story = truyenCoNguon(nguon);
  const m = modelGia([{ text: "LÔ MỘT." }, { text: "LÔ HAI." }, { text: "LÔ BA." }]);
  let xong = 0;
  const kq = await chay({
    story, tinNhan: story.tinNhan, viet: m.viet, nen: m.nen,
    khiMoiLo: () => { xong += 1; },
    // Điều kiện dừng được hỏi GIỮA hai lô: lúc đó không lời gọi model nào đang chạy.
    choPhepDung: () => {
      eq(m.dangGoiFn(), false, "hỏi dừng khi KHÔNG có lời gọi model nào đang chạy");
      return xong >= 1;
    },
  });
  eq(m.goi.length, 1, "lô đang gọi vẫn chạy tới xong rồi mới dừng (không cắt ngang)");
  eq(kq.daDung, true, "có cờ daDung");
  eq(kq.trangThai, "xong", "dừng theo ý người dùng ⇒ mục không kẹt ở dangChay");
  eq(kq.soLoDaXong, 1, "ghi nhận 1 lô đã xong");
  eq(kq.proseDaViet, "LÔ MỘT.", "phần đã viết được GIỮ NGUYÊN (đợt 5 đổi quyết định tạm của đợt 4)");
});

test("chayVietTruyen · nén kích hoạt: lô kế dùng bản ĐÃ NÉN, không dùng lại cả prose dài", async () => {
  const nguon = nguonDai(9);
  const story = truyenCoNguon(nguon);
  // Lô 1 trả về văn dài quá 60% trần token ⇒ lô 2 và lô 3 phải đi qua bước nén.
  const dauMoc = "MỐC-ĐẦU-XA";
  const cuoiMoc = "MỐC-CUỐI-GẦN";
  const dai = dauMoc + "." + "y".repeat(880) + "." + cuoiMoc + ".";
  const m = modelGia((i) => (i === 0 ? { text: dai } : { text: "LÔ " + (i + 1) + "." }));
  const kq = await chay({ story, tinNhan: story.tinNhan, viet: m.viet, nen: m.nen });
  const nenGoi = m.goi.filter((g) => g.loai === "nen");
  const vietGoi = m.goi.filter((g) => g.loai === "viet");
  ok(canNenProse(dai, TRAN_TOKEN, DEM_KY_TU), "mốc: văn của lô 1 THẬT SỰ vượt ngưỡng nén");
  eq(vietGoi.length, 3, "vẫn gọi model viết đúng số lô");
  eq(kq.soLanNen, 2, "nén trước lô 2 và trước lô 3 (kiểm lại mỗi lô, theo mục 3)");
  eq(nenGoi.length, 2, "mỗi lần nén là một lời gọi phụ");
  ok(nenGoi[0].prompt.indexOf(dauMoc) > 0, "prompt nén mang PHẦN ĐẦU của prose");
  ok(nenGoi[0].prompt.indexOf(cuoiMoc) < 0, "prompt nén KHÔNG mang phần đuôi giữ nguyên");
  const p2 = vietGoi[1].prompt;
  ok(p2.indexOf(NHAN_TOM_TAT) > 0 && p2.indexOf("TÓM TẮT GIẢ ĐỊNH") > 0, "lô 2 dùng bản tóm tắt của lượt nén");
  ok(p2.indexOf(NHAN_DUOI) > 0 && p2.indexOf(cuoiMoc) > 0, "lô 2 vẫn giữ nguyên đoạn đuôi để nối mạch");
  ok(p2.indexOf(dauMoc) < 0, "lô 2 KHÔNG nhét lại toàn bộ prose cũ (phần xa đã được nén)");
  eq(p2.indexOf(NHAN_DA_VIET), -1, "khi có bản nén thì KHÔNG đưa thêm khối đã viết (tránh nhân đôi ngữ cảnh)");
  eq(kq.proseDaViet.indexOf(dauMoc), 0, "prose trả về vẫn là văn ĐẦY ĐỦ, không phải bản nén");
  eq(kq.soLoDaXong, 3, "xong cả 3 lô");
});

test("chayVietTruyen · cổng 18+ chặn: KHÔNG gọi model lần nào", async () => {
  const nguon = nguonDai(6);
  const story = truyenCoNguon(nguon);
  story.nhanVats = truyenChuaXacNhan().nhanVats;
  story.giaoKeo = { bat: true };
  const m = modelGia([{ text: "KHÔNG ĐƯỢC GỌI" }]);
  const kq = await chay({ story, tinNhan: story.tinNhan, viet: m.viet, nen: m.nen });
  eq(m.goi.length, 0, "bị cổng chặn ⇒ KHÔNG gọi model lần nào");
  eq(kq.choPhep, false, "choPhep = false");
  eq(kq.trangThai, "loi", "trạng thái để giao diện hiện lý do");
  eq(kq.loiNeu, chanNoiDungNguoiLon(story), "lý do là nguyên văn của cửa dùng chung");
  eq(kq.proseDaViet, "", "không có văn xuôi nào");
  // Hội thoại không có đoạn nguồn nào: cũng không gọi model, nhưng lý do là chuyện khác.
  const m2 = modelGia([{ text: "KHÔNG ĐƯỢC GỌI" }]);
  const kq2 = await chay({ story: truyenCoNguon([]), tinNhan: [], viet: m2.viet, nen: m2.nen });
  eq(m2.goi.length, 0, "nguồn rỗng ⇒ KHÔNG gọi model");
  eq(kq2.trangThai, "loi", "nguồn rỗng ⇒ loi");
  ok(kq2.loiNeu.indexOf("chưa có đoạn nguồn") > 0, "lý do nói rõ chưa có đoạn nguồn");
  ok(kq2.choPhep, "nguồn rỗng không phải chuyện cổng 18+");
});

test("demDoanDaDoc · đếm ĐOẠN nguồn, không đếm mảnh của đoạn bị cắt", () => {
  const nguon = ["A".repeat(10), "B".repeat(30)];
  const lo = chiaLoNguon(nguon, 20);
  eq(lo.length, 3, "đoạn 30 ký tự bị cắt thành 2 mảnh ⇒ 3 lô");
  eq(demDoanDaDoc(nguon, lo[0]), 1, "xong lô 1 (đoạn A) ⇒ 1 đoạn");
  eq(demDoanDaDoc(nguon, lo[0].concat(lo[1])), 1, "mảnh đầu của đoạn B chưa đủ ⇒ vẫn 1 đoạn");
  eq(demDoanDaDoc(nguon, lo[0].concat(lo[1], lo[2])), 2, "đủ hai mảnh ⇒ 2 đoạn");
  eq(demDoanDaDoc(nguon, []), 0, "chưa đọc gì ⇒ 0");
  eq(demDoanDaDoc([], lo[0]), 0, "nguồn rỗng ⇒ 0");
  eq(demDoanDaDoc(nguon, ["A".repeat(5)]), 0, "mảnh ngắn hơn đoạn ⇒ chưa xong đoạn nào");
});

test("dsVietRa · bản mới nhất lên đầu, bỏ phần tử rác, KHÔNG sửa mảng trong truyện", () => {
  const goc = [
    { id: "vt_zz1", taoLuc: 10 },
    null,
    { id: "vt_zz3", taoLuc: 30 },
    { id: "vt_zz2", taoLuc: 20 },
    "rác",
  ];
  const story = { truyenVietRa: goc };
  const ra = dsVietRa(story);
  eqSau(ra.map((m) => m.id), ["vt_zz3", "vt_zz2", "vt_zz1"], "xếp mới nhất lên đầu");
  eqSau(goc.map((m) => (m && m.id) || String(m)), ["vt_zz1", "null", "vt_zz3", "vt_zz2", "rác"], "không được sắp xếp lại mảng gốc");
  ok(ra !== goc, "trả về mảng MỚI (không cầm chung mảng của truyện)");
  eq(dsVietRa({}).length, 0, "truyện chưa có mục nào ⇒ rỗng");
  eq(dsVietRa(null).length, 0, "không có truyện ⇒ rỗng");
  eq(noiDungDeXuat({ noiDung: "  văn  " }), "văn", "nội dung xuất được cắt khoảng trắng thừa");
  eq(noiDungDeXuat({ noiDung: "   " }), "", "chỉ có khoảng trắng ⇒ coi như chưa có gì");
  eq(noiDungDeXuat(null), "", "không có mục ⇒ rỗng");
});
