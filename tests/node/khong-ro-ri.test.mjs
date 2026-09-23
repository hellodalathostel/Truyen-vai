// Truyện Vai — tầng kiểm thử Node: CHỐNG RÒ RỈ DỮ LIỆU THẬT.
// Chạy: node --test tests/node/
//
// LUẬT CỦA DỰ ÁN: dữ liệu thật của người dùng chỉ được ĐỐI CHIẾU TRONG BỘ NHỚ lúc chạy,
// không bao giờ được ghi vào bất kỳ tệp nào của gói (gói này được đóng zip và đưa cho
// người khác). Một đợt trước đã từng để lọt id truyện, id hội thoại và tên nhân vật/hồ sơ
// thật vào chính tệp ghi chép của bộ kiểm thử.
//
// Tệp này chặn ĐÚNG DẠNG của dữ liệu thật, không cần biết nội dung:
//
//   • Id thật do `uid()` (src/store.js) sinh ra:  tiền tố + "_" + Date.now().toString(36)
//     + 6 ký tự ngẫu nhiên ⇢ thân dài 14–15 ký tự chữ-số.
//   • Id test luôn NGẮN và có nghĩa (ct_zzfixture, ht_be, nv_a, nhz_nhap_loi_1…), thân dài
//     nhất trong gói là 9 ký tự.
//
// Nên: mọi token có thân từ 10 ký tự trở lên bị coi là dữ liệu thật. Phép đo này KHÔNG
// phụ thuộc vào việc đọc kv, nên chạy được cả trên CI. Việc đối chiếu với dữ liệu thật
// đang có trong máy người dùng làm ở tầng trình duyệt (xem tests/browser/nh-io.js, mục
// "cách ly dữ liệu thật"), vì chỉ ở đó mới có `root.kv`.
//
// Giới hạn đã biết: tên người là chuỗi ngắn và hay trùng với từ thường (ví dụ "Phú" nằm
// trong "ngưỡngPhút", "Toàn" nằm trong "Toàn bộ"), nên KHÔNG thể tự động khẳng định "tệp
// này không chứa tên thật" chỉ bằng quét chuỗi — sẽ báo lỗi giả liên tục. Vì vậy luật ở
// đây là luật về DẠNG ID; còn tên thì phải tự soát tay khi viết tài liệu.
//
// Không dùng biểu thức chính quy ở tệp này (xem luật ở tests/README.md) — mọi phép so
// chuỗi làm bằng tay để tệp sống sót qua mọi tầng trung gian.

import { test, ok, eq } from "../lib/h.js";

const NH = String.fromCharCode(34);
const NL = String.fromCharCode(10);

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

async function boDoc() {
  if (globalThis.__TV_BO_DOC) return globalThis.__TV_BO_DOC;
  if (!fsMod || !GOC) return null;
  return {
    doc: async (rel) => fsMod.readFileSync(pathMod.join(GOC, rel), "utf8"),
    lietKe: async (rel) => fsMod.readdirSync(pathMod.join(GOC, rel)).sort(),
    co: async (rel) => fsMod.existsSync(pathMod.join(GOC, rel)),
  };
}

// ---------------------------------------------------------------- phép quét token id
// Tiền tố id của app, lấy từ các lời gọi `uid(...)` trong src/ (store, app, lore) và
// `TT.ma(...)` trong src/trangThai.js, cộng thêm tiền tố riêng của dữ liệu test.
const TIEN = [
  "ct", "ht", "nh", "anh", "nv", "ch", "tn", "dc", "hd", "td", "canh", "bn", "lb", "ku",
  "qh", "vg", "nvz", "kq", "nhz", "tv", "hs", "st", "dk", "gy",
];

// Ký tự coi là "nằm trong một từ dài hơn" — dùng để bỏ qua token lồng trong chữ khác.
function laChu(c) {
  if (!c) return false;
  const k = c.charCodeAt(0);
  if (k > 127) return c.toLowerCase() !== c.toUpperCase();
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_";
}

// Ký tự của THÂN id: chỉ chữ thường và chữ số (id thật là base36 chữ thường).
function laThanId(c) {
  if (!c) return false;
  return (c >= "a" && c <= "z") || (c >= "0" && c <= "9");
}

// Mọi token dạng <tiền tố>_<thân> trong một chuỗi. Thân dừng ở ký tự không phải chữ
// thường/chữ số, nên "nh_khong_ton_tai" cho thân "khong" (không phải "khong_ton_tai").
function quetToken(text) {
  const t = String(text);
  const ra = [];
  for (const tien of TIEN) {
    const khoa = tien + "_";
    let i = 0;
    while (i < t.length) {
      i = t.indexOf(khoa, i);
      if (i < 0) break;
      const truoc = i === 0 ? "" : t[i - 1];
      if (laChu(truoc)) { i += 1; continue; }
      let j = i + khoa.length;
      while (j < t.length && laThanId(t[j])) j += 1;
      ra.push({ tien, than: t.slice(i + khoa.length, j), viTri: i });
      i = j > i + khoa.length ? j : i + khoa.length;
    }
  }
  return ra;
}

// Thân id thật dài bao nhiêu? Xem phần đầu tệp. 10 là ngưỡng: id test dài nhất là 9.
const NGUONG_THAN = 10;

function tokenDai(text) {
  return quetToken(text).filter((x) => x.than.length >= NGUONG_THAN);
}

const MODULE_SRC = ["ai.js", "app.js", "dom.js", "lore.js", "ngoaiHinh.js", "schema.js", "store.js", "thoiGian.js", "trangThai.js"];

function ca(ten, fn) {
  test(ten, async () => {
    const bd = await boDoc();
    if (!bd) {
      ok(true, "(bỏ qua — môi trường không đọc được tệp) " + ten);
      return;
    }
    await fn(bd);
  });
}

// ---------------------------------------------------------------- tự kiểm tra phép quét
test("phép quét token: bắt đúng dạng id thật, bỏ qua id test và từ thường", () => {
  // Bắt được: id thật = tiền tố + thân dài. Thân được để RỜI rồi ghép tại chỗ, vì nếu
  // viết liền thì chính tệp này cũng thành một tệp chứa token dài và luật bên dưới sẽ bắt nó.
  const thanDai = ["mub4swfvxidgmv", "mub55ik0djc9k1"];
  for (const tien of ["ct", "ht", "nh", "nv", "anh", "vg", "nhz", "tn"]) {
    for (const than of thanDai) {
      const s = tien + "_" + than;
      eq(tokenDai("truyen " + s + " con").length, 1, "phải bắt: " + tien + "_<thân dài>");
    }
  }
  // Bỏ qua: id test ngắn, id test có dấu gạch dưới, tên hàm viết hoa, từ thường.
  const boQua = [
    "ct_zzfixture", "ct_zzstore", "ct_zzlo10", "ct_zznc1", "ht_be", "ht_z1", "ht_gd1anh",
    "nv_a", "nv_8b", "nv_gd1", "nh_a", "nh_khong_ton_tai", "nhz_nhap_loi_1", "nhz_nhap",
    "anh_1", "anh_z4", "vg_p1", "vg_z2", "lb_1", "ku_1", "tn_zz9", "tn_dk1", "canh_1",
    "recursive_scanning", "secondary_keys", "character_book", "insertion_order",
    "case_sensitive", "page_refresh", "page_eval", "node_modules", "pull_request",
    "tv_getMessages", "tv_test", "A_msgCon", "MOC_KHEP", "ID_NGUOI", "TEP_NODE",
  ];
  for (const s of boQua) {
    eq(tokenDai("doan " + s + " tiep").length, 0, "không được bắt: " + s);
  }
  // Không bắt token nằm lồng trong một từ dài hơn.
  const dai = "ct_" + thanDai[0];
  eq(tokenDai("x" + dai + "y").length, 0, "token lồng trong từ dài hơn thì bỏ qua");
  // Bắt được nhiều token trong cùng một dòng.
  eq(tokenDai("a " + dai + " b ht_" + thanDai[1]).length, 2, "bắt cả hai token trên một dòng");
  // Thân dừng ở dấu gạch dưới, nên id test có dấu gạch dưới không bị bắt oan.
  eq(tokenDai("nhz_nhap_loi_1").length, 0, "gạch dưới chia thân thành đoạn ngắn");
  eq(quetToken("nhz_nhap_loi_1")[0].than, "nhap", "thân là đoạn đầu tiên");
});

// ---------------------------------------------------------------- luật trên gói
ca("mặt hàng phát hành (src/, main.pjs, index.html) không có id dữ liệu chạy", async (bd) => {
  const tep = [];
  for (const m of MODULE_SRC) tep.push("src/" + m);
  tep.push("src/styles.css");
  tep.push("src/README.md");
  tep.push("main.pjs");
  tep.push("index.html");
  for (const f of tep) {
    const text = await bd.doc(f);
    for (const x of quetToken(text)) {
      const than = x.than;
      const hopLe = than.length === 0 || than[0] === "z";
      ok(hopLe, f + ": token id phải trống hoặc bắt đầu bằng z (ký hiệu riêng của bộ test) — gặp " + x.tien + "_" + than);
    }
  }
});

ca("cả gói không có token dài như id thật (>= 10 ký tự thân)", async (bd) => {
  const ds = await bd.lietKe(".");
  const thuMuc = [];
  for (const f of ds) {
    if (f === "src" || f === "tests") thuMuc.push(f);
  }
  const tep = ["main.pjs", "index.html", "package.json", "README.md"];
  for (const d of thuMuc.concat(["tests/lib", "tests/fixtures", "tests/node", "tests/browser", ".github/workflows"])) {
    let con;
    try {
      con = await bd.lietKe(d);
    } catch (e) {
      continue;
    }
    for (const f of con) tep.push(d + "/" + f);
  }
  let soTep = 0;
  for (const f of tep) {
    if (f.slice(-4) === ".zip") continue;
    let text;
    try {
      text = await bd.doc(f);
    } catch (e) {
      continue;
    }
    soTep += 1;
    const d = tokenDai(text);
    for (const x of d) ok(false, f + ": có token dài như id thật — " + x.tien + "_" + x.than);
    if (!d.length) ok(true, f + ": không có token dài");
  }
  ok(soTep >= 50, "đã quét đủ số tệp của gói (" + soTep + " tệp)");
});

ca("bộ nào ghi thẳng vào kv thì phải dùng dấu hiệu dữ liệu test", async (bd) => {
  // Bộ kiểm thử phải tạo dữ liệu để thử, nên nó ghi kv là chuyện bình thường. Điều KHÔNG
  // được phép là ghi kv mà không đánh dấu dữ liệu test — đó là con đường dẫn tới đụng
  // truyện thật của người dùng. Dấu hiệu: tiêu đề truyện bắt đầu bằng ZZ, hoặc id có tiền
  // tố riêng của bộ test.
  const GHI = ["cotTruyen.set", "thuVienAnh.set", "tinNhan.set", "thuVienNgoaiHinh.set"];
  const RIENG = ["ct_zz", "ct_zzn", "nhz_", "ht_z", "anh_zz", "nv_z", "tn_zz", "vg_z", "ku_zz"];
  const store = await bd.doc("src/store.js");
  let soNoiGhi = 0;
  for (const x of GHI) if (store.indexOf(x) >= 0) soNoiGhi += 1;
  ok(soNoiGhi >= 4, "src/store.js vẫn là nơi ghi kv của app (" + soNoiGhi + "/4)");
  const ds = await bd.lietKe("tests/browser");
  let soBoGhi = 0;
  for (const f of ds) {
    if (f.slice(-3) !== ".js") continue;
    const text = await bd.doc("tests/browser/" + f);
    if (!GHI.some((x) => text.indexOf(x) >= 0)) continue;
    soBoGhi += 1;
    const coDau = text.indexOf("ZZ") >= 0 || RIENG.some((x) => text.indexOf(x) >= 0);
    ok(coDau, "tests/browser/" + f + ": ghi kv thì phải có dấu hiệu dữ liệu test (ZZ hoặc tiền tố riêng)");
  }
  ok(soBoGhi >= 10, "đã soát các bộ có ghi kv (" + soBoGhi + " bộ)");
});

ca("tài liệu phát hành không nhúng khoá/API", async (bd) => {
  // Gói là công khai và đi theo generator, nên tài liệu không được mang khoá nhúng.
  // Chỉ soát những tệp CÓ THẬT: bộ đọc tệp có thể ném lỗi (node:fs) hoặc trả undefined
  // (bộ đọc cắm sẵn) khi tệp không tồn tại — cả hai đều phải được bỏ qua êm, không làm
  // vỡ ca kiểm thử.
  const ds = ["src/README.md", "tests/README.md", "package.json"];
  let soTep = 0;
  for (const f of ds) {
    let text = "";
    try { text = await bd.doc(f); } catch (e) { text = ""; }
    if (typeof text !== "string" || !text) continue;
    soTep += 1;
    ok(text.indexOf("sk-") < 0, f + ": không nhúng khoá dạng sk-");
    ok(text.indexOf("Bearer ") < 0, f + ": không nhúng token Bearer");
  }
  ok(soTep >= 2, "đã soát tài liệu phát hành (" + soTep + " tệp)");
});
