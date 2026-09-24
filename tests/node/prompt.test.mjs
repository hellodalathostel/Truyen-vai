// Truyện Vai — tầng kiểm thử Node: SNAPSHOT PROMPT + MỐC PREFIX-CACHE (Giai đoạn 7a).
// Chạy: node --test tests/node/
//
// Sáu việc của tệp này:
//   1. Prompt dựng ra phải KHỚP FIXTURE TỪNG BYTE (3 truyện mẫu × 5 lượt liên tiếp). Muốn
//      đổi prompt thì phải chạy `node tests/lib/tao-prompt-fixture.mjs` và commit fixture
//      mới + moc.json mới CÙNG LÚC, kèm lý do — không được sửa fixture cho khớp một cách
//      im lặng, cũng không được để ca này đỏ rồi bỏ qua.
//   2. Tỉ lệ tiền tố chung của mỗi mẫu không được TỤT quá 5 điểm phần trăm so với mốc. Phần
//      đầu prompt dùng chung giữa hai lượt liền nhau chính là thứ máy chủ cache được; tụt
//      nghĩa là có nội dung động trôi lên đầu prompt và mỗi lượt lại phải tính lại từ đó.
//   3. CẤU TRÚC (không phụ thuộc độ dài): với mọi cặp lượt liền nhau không có sự kiện lạ, điểm
//      lệch đầu tiên phải nằm ở hoặc sau chỗ tin nhắn cũ cuối cùng kết thúc trong khối DIỄN
//      BIẾN. Tỉ lệ phần trăm phụ thuộc độ dài truyện mẫu, nên ca này mới là ca bắt hồi quy
//      "có thứ gì đó động trôi lên ĐẦU prompt". Cặp có Khép cảnh / vào-rời cảnh là NGOẠI LỆ
//      có chủ đích, khai trong moc.json, VÀ ngoại lệ đó phải là vi phạm thật.
//   4. Đối chứng âm cho ca cấu trúc: chèn một chuỗi động vào khối CỐT TRUYỆN thì ca cấu trúc
//      PHẢI ĐỎ — nếu không thì ca cấu trúc chỉ là ca trang trí.
//   5. Chạy lại phải ra Y HỆT (mẫu không được lén dùng giờ hệ thống hay ngẫu nhiên).
//   6. Bộ fixture phải đủ và đúng hình dạng (3 × 5 tệp + moc.json).
//
// Luật: KHÔNG dùng dấu gạch chéo ngược. Mọi tên/id trong fixture là HƯ CẤU (xem
// tests/lib/prompt.mjs và luật 4 ở tests/README.md).

import "../lib/moi-truong.js";
import { test, ok, eq } from "../lib/h.js";
import { chayTatCa, chayMau, dungDoiChungAm, doCotPrompt, MAU_KEY, SO_LUOT } from "../lib/prompt.mjs";

const NL = String.fromCharCode(10);
const NGACH = 0.05; // 5 điểm phần trăm
const DIR = "tests/fixtures/prompt/";
const MOC_TEP = DIR + "moc.json";

// Bộ đọc tệp: tầng Node dùng node:fs; tầng không có node:fs cắm sẵn
// globalThis.__TV_BO_DOC = { doc } (xem tests/node/goi-chung.test.mjs).
let docNode = null;
try {
  const fsMod = await import("node:fs");
  const pathMod = await import("node:path");
  const urlMod = await import("node:url");
  const GOC = pathMod.dirname(pathMod.dirname(pathMod.dirname(urlMod.fileURLToPath(import.meta.url))));
  docNode = (rel) => fsMod.readFileSync(pathMod.join(GOC, rel), "utf8");
} catch (e) {
  docNode = null;
}

function layBoDoc() {
  if (globalThis.__TV_BO_DOC && typeof globalThis.__TV_BO_DOC.doc === "function") return globalThis.__TV_BO_DOC.doc;
  return docNode;
}

async function doc0(doc, rel) {
  try {
    return await doc(rel);
  } catch (e) {
    return null;
  }
}

const tenFix = (key, i) => DIR + key + "-" + (i + 1) + ".txt";
const pt = (x) => (Number(x) * 100).toFixed(1) + "%";

let dungSan = null;
async function ketQuaDungSan() {
  if (!dungSan) dungSan = await chayTatCa();
  return dungSan;
}

// Chỗ khác nhau đầu tiên, tính theo KÝ TỰ (so sánh trong bộ nhớ; fixture đọc theo cùng một
// bảng mã nên chỉ số này khớp với byte ở mọi ranh giới thực tế).
function viTriKhac(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}
function nhanNgan(s, i) {
  return JSON.stringify(s.slice(Math.max(0, i - 24), i + 24));
}
function soSanh(ten, thuc, mong) {
  if (thuc === mong) return ok(true, ten + " — khớp từng byte (" + thuc.length + " ký tự)");
  const i = viTriKhac(thuc, mong);
  const dong = thuc.slice(0, i).split(NL).length;
  return ok(
    false,
    ten + " — LỆCH từ ký tự " + i + " (dòng " + dong + " của prompt): prompt " + nhanNgan(thuc, i) +
      " nhưng fixture " + nhanNgan(mong, i)
  );
}

test("snapshot prompt khớp fixture từng byte (3 mẫu × 5 lượt)", async () => {
  const doc = layBoDoc();
  if (!doc) {
    ok(false, "không đọc được tệp fixture (thiếu cả node:fs lẫn globalThis.__TV_BO_DOC.doc)");
    return;
  }
  const kq = await ketQuaDungSan();
  for (const key of MAU_KEY) {
    const m = kq[key];
    ok(!!m && Array.isArray(m.prompts) && m.prompts.length === SO_LUOT, "mẫu " + key + " chạy đủ " + SO_LUOT + " lượt");
    if (!m) continue;
    for (let i = 0; i < m.prompts.length; i++) {
      const mong = await doc0(doc, tenFix(key, i));
      if (mong === null) {
        ok(false, "thiếu fixture " + tenFix(key, i));
        continue;
      }
      soSanh("mẫu " + key + " · lượt " + (i + 1) + " · " + tenFix(key, i), m.prompts[i], mong);
    }
  }
});

test("prefix-cache: tỉ lệ tiền tố chung không tụt quá 5 điểm phần trăm so với mốc", async () => {
  const doc = layBoDoc();
  if (!doc) {
    ok(false, "không đọc được " + MOC_TEP + " (thiếu bộ đọc tệp)");
    return;
  }
  const raw = await doc0(doc, MOC_TEP);
  if (raw === null) {
    ok(false, "thiếu mốc " + MOC_TEP);
    return;
  }
  let moc = null;
  try {
    moc = JSON.parse(raw);
  } catch (e) {
    moc = null;
  }
  ok(!!moc && !!moc.mau, "moc.json đọc được và có khối mau");
  if (!moc || !moc.mau) return;
  const kq = await ketQuaDungSan();
  for (const key of MAU_KEY) {
    const m = moc.mau[key];
    ok(!!m && typeof m.nhoNhat === "number" && typeof m.trungBinh === "number", "mốc có mẫu " + key);
    if (!m) continue;
    const nho = kq[key].nhoNhat;
    const tb = kq[key].trungBinh;
    ok(
      nho >= m.nhoNhat - NGACH,
      "mẫu " + key + " · tiền tố chung nhỏ nhất " + pt(nho) + " · mốc " + pt(m.nhoNhat) +
        " · ngưỡng tụt 5 điểm phần trăm"
    );
    ok(
      tb >= m.trungBinh - NGACH,
      "mẫu " + key + " · tiền tố chung trung bình " + pt(tb) + " · mốc " + pt(m.trungBinh) +
        " · ngưỡng tụt 5 điểm phần trăm"
    );
    // Phép đo phải có ý nghĩa: đủ số cặp, và mọi tỉ lệ nằm trong khoảng hợp lệ.
    eq(kq[key].cap.length, SO_LUOT - 1, "mẫu " + key + " có đúng " + (SO_LUOT - 1) + " cặp lượt liền nhau");
    for (const c of kq[key].cap) {
      ok(c.chung > 0 && c.tyLe > 0 && c.tyLe <= 1, "mẫu " + key + " · cặp " + c.cap + " có tiền tố chung " + c.chung + " byte (" + pt(c.tyLe) + ")");
    }
  }
});

test("cấu trúc: lượt mới chỉ được NỐI THÊM vào cuối khối DIỄN BIẾN (không phụ thuộc độ dài)", async () => {
  const doc = layBoDoc();
  if (!doc) {
    ok(false, "không đọc được " + MOC_TEP + " (thiếu bộ đọc tệp)");
    return;
  }
  const raw = await doc0(doc, MOC_TEP);
  let moc = null;
  try {
    moc = raw === null ? null : JSON.parse(raw);
  } catch (e) {
    moc = null;
  }
  ok(!!moc && !!moc.mau, "moc.json đọc được để lấy danh sách ngoại lệ");
  if (!moc || !moc.mau) return;
  const kq = await ketQuaDungSan();
  for (const key of MAU_KEY) {
    const m = moc.mau[key] || {};
    const dsMien = Array.isArray(m.ngoaiLe) ? m.ngoaiLe : [];
    const cot = doCotPrompt(kq[key].prompts);
    eq(cot.length, SO_LUOT - 1, "mẫu " + key + " có đúng " + (SO_LUOT - 1) + " cặp để đo cấu trúc");
    let soKiem = 0;
    for (const c of cot) {
      if (dsMien.filter((x) => x && x.cap === c.cap).length) continue;
      soKiem += 1;
      ok(
        c.dat === true,
        "mẫu " + key + " · cặp " + c.cap + " — điểm lệch đầu tiên ở ký tự " + c.chung + ", phải ở hoặc sau mốc " +
          c.neo + " (cuối nhật ký cũ" + (c.nhatKyRong ? " — lượt trước có nhật ký RỖNG" : "") + "), thiếu " + c.thieu + " ký tự"
      );
    }
    eq(soKiem, SO_LUOT - 1 - dsMien.length, "mẫu " + key + " đo " + soKiem + " cặp (đã trừ ngoại lệ có khai)");
    // Ngoại lệ phải là NGOẠI LỆ THẬT: cặp được miễn mà KHÔNG vi phạm nghĩa là ngoại lệ đã cũ và
    // đang che một hồi quy (hoặc cặp đó không còn đo được gì).
    for (const x of dsMien) {
      const c = cot.filter((y) => y.cap === x.cap)[0];
      ok(!!c && c.dat === false, "mẫu " + key + " · ngoại lệ " + x.cap + " vẫn là vi phạm THẬT (nếu không thì gỡ ngoại lệ khỏi moc.json)");
      ok(typeof x.lyDo === "string" && x.lyDo.length > 20, "mẫu " + key + " · ngoại lệ " + x.cap + " có ghi lý do trong moc.json");
    }
  }
});

test("cấu trúc: đối chứng âm — chuỗi động trong khối CỐT TRUYỆN phải làm ca cấu trúc ĐỎ", async () => {
  const prompts = await chayMau(dungDoiChungAm());
  eq(prompts.length, SO_LUOT, "mẫu đối chứng âm chạy đủ " + SO_LUOT + " lượt");
  const cot = doCotPrompt(prompts);
  const viPham = cot.filter((c) => c.dat === false);
  eq(
    viPham.length,
    SO_LUOT - 1,
    "mọi cặp lượt đều bị bắt khi khối CỐT TRUYỆN có chuỗi động (bắt được " + viPham.length + ": " +
      viPham.map((c) => c.cap + " (lệch ở ký tự " + c.chung + ", mốc " + c.neo + ")").join(", ") + ")"
  );
});

test("mẫu chạy hai lần ra y hệt nhau (không dùng giờ hệ thống / ngẫu nhiên)", async () => {
  const a = await chayTatCa();
  const b = await chayTatCa();
  for (const key of MAU_KEY) {
    let lech = -1;
    const n = Math.min(a[key].prompts.length, b[key].prompts.length);
    for (let i = 0; i < n; i++) {
      if (a[key].prompts[i] !== b[key].prompts[i]) {
        lech = i;
        break;
      }
    }
    eq(lech, -1, "mẫu " + key + " chạy lại giống hệt từng byte (lượt lệch đầu tiên: " + lech + ")");
    eq(a[key].nhoNhat, b[key].nhoNhat, "mẫu " + key + " đo lại ra cùng tỉ lệ nhỏ nhất");
  }
});

test("bộ fixture prompt đủ tệp và đúng hình dạng mốc", async () => {
  const doc = layBoDoc();
  if (!doc) {
    ok(false, "không đọc được thư mục fixture (thiếu bộ đọc tệp)");
    return;
  }
  let soTep = 0;
  for (const key of MAU_KEY) {
    for (let i = 0; i < SO_LUOT; i++) {
      const t = await doc0(doc, tenFix(key, i));
      ok(typeof t === "string" && t.length > 0, "có fixture " + tenFix(key, i) + " (" + (t ? t.length : 0) + " ký tự)");
      if (typeof t === "string") soTep += 1;
    }
  }
  eq(soTep, MAU_KEY.length * SO_LUOT, "đủ " + MAU_KEY.length * SO_LUOT + " tệp prompt");
  const raw = await doc0(doc, MOC_TEP);
  let moc = null;
  try {
    moc = raw === null ? null : JSON.parse(raw);
  } catch (e) {
    moc = null;
  }
  ok(!!moc, "moc.json là JSON hợp lệ");
  if (!moc) return;
  eq(moc.soLuot, SO_LUOT, "mốc ghi đúng số lượt");
  for (const key of MAU_KEY) {
    ok(!!moc.mau[key], "mốc có mẫu " + key);
    if (!moc.mau[key]) continue;
    eq(moc.mau[key].cap.length, SO_LUOT - 1, "mốc mẫu " + key + " có " + (SO_LUOT - 1) + " cặp");
  }
  // Fixture là VĂN BẢN của prompt, không phải dữ liệu truyện: không được chứa id/tên thật
  // (việc quét ngược toàn gói nằm ở tầng trình duyệt — ca `rr-ten-that`).
  const dauTien = await doc0(doc, tenFix(MAU_KEY[0], 0));
  if (typeof dauTien === "string") {
    ok(dauTien.indexOf("# CỐT TRUYỆN") > 0, "fixture là prompt thật (có khối CỐT TRUYỆN)");
    ok(dauTien.indexOf("TASK:") > 0, "fixture là prompt thật (có dòng TASK)");
  }
});
