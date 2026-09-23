// Truyện Vai — tầng kiểm thử Node: TOÀN VẸN GÓI.
// Chạy: node --test tests/node/
//
// Mục đích: gói này là thứ được đóng zip và đưa cho người khác. Những ca dưới đây bắt
// các lỗi im lặng: thiếu tệp, tệp kiểm thử lọt vào src/ (src/ là mã công khai, có tính
// quota), bộ kiểm thử có mặt mà không ai chạy, import trỏ sai, hoặc cổng an toàn tuổi
// bị gỡ mất.
//
// Vì sao tệp này không dùng biểu thức chính quy: nó phải sống sót qua mọi tầng trung
// gian (viết tệp, đóng zip, chuyển máy). Toàn bộ việc đọc chuỗi ở đây làm bằng
// indexOf/slice và String.fromCharCode.
//
// Bộ đọc tệp: tầng Node dùng node:fs. Tầng không có node:fs (ví dụ worker không DOM)
// có thể cắm sẵn globalThis.__TV_BO_DOC = { doc, lietKe, co } với các hàm bất đồng bộ.

import { test, ok, eq } from "../lib/h.js";

const NH = String.fromCharCode(34);
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

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

// Mọi đoạn nằm giữa hai dấu nháy kép của một dòng.
function catNhay(dong) {
  const ra = [];
  let i = 0;
  while (true) {
    const a = dong.indexOf(NH, i);
    if (a < 0) break;
    const b = dong.indexOf(NH, a + 1);
    if (b < 0) break;
    ra.push(dong.slice(a + 1, b));
    i = b + 1;
  }
  return ra;
}

// Mọi đường dẫn import trong một tệp nguồn (chỉ những dòng bắt đầu bằng "import ").
function dsImport(text) {
  const ra = [];
  for (const dong of String(text).split(NL)) {
    if (dong.trim().indexOf("import ") !== 0) continue;
    const q = catNhay(dong).filter(Boolean);
    if (q.length) ra.push(q[0]);
  }
  return ra;
}

// Mọi giá trị của một trường dạng  truong: "giá trị"  trong một tệp nguồn.
// Phải lấy đoạn nháy kép NGAY SAU tên trường, không phải đoạn đầu dòng — vì một dòng
// của DANH_MUC có nhiều trường (ten, loai, ghiChu).
function giaTriTruong(text, truong) {
  const ra = [];
  for (const dong of String(text).split(NL)) {
    let i = 0;
    while ((i = dong.indexOf(truong, i)) >= 0) {
      const q = catNhay(dong.slice(i + truong.length)).filter(Boolean);
      if (q.length) {
        ra.push(q[0]);
        break;
      }
      i += truong.length;
    }
  }
  return ra;
}

const MODULE_SRC = ["ai.js", "app.js", "dom.js", "lore.js", "ngoaiHinh.js", "schema.js", "store.js", "thoiGian.js", "trangThai.js"];
const TEP_NODE = [
  "ai-parse.test.mjs", "dom.test.mjs", "gd4.test.mjs", "goi-chung.test.mjs", "khong-ro-ri.test.mjs",
  "lore.test.mjs", "ngoaiHinh.test.mjs", "schema.test.mjs", "store.test.mjs", "thoiGian.test.mjs", "trangThai.test.mjs",
];
const TEP_FIXTURE = ["ke-hoach.mjs", "phien-ban-cu.mjs", "phieu.mjs", "truyen.mjs", "vang-mat.mjs"];
const SRC_CHO_PHEP = MODULE_SRC.concat(["styles.css", "README.md", "CONTEXT.md"]);
const GOC_CHO_PHEP = ["main.pjs", "index.html", "package.json", "README.md", "LICENSE", ".git", ".gitignore", ".github", "src", "tests"];

// Chạy một ca có cần đọc tệp; tự bỏ qua khi môi trường không đọc được tệp.
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

ca("gói có đủ tệp bắt buộc", async (bd) => {
  const oGoc = ["main.pjs", "index.html", "package.json", "tests/README.md", ".github/workflows/test.yml"];
  const oLib = ["tests/lib/h.js", "tests/lib/moi-truong.js", "tests/browser/runner.js"];
  for (const f of oGoc.concat(oLib)) ok(await bd.co(f), "có: " + f);
  for (const m of MODULE_SRC) ok(await bd.co("src/" + m), "có: src/" + m);
  ok(await bd.co("src/styles.css"), "có: src/styles.css");
  for (const f of TEP_FIXTURE) ok(await bd.co("tests/fixtures/" + f), "có: tests/fixtures/" + f);
  for (const f of TEP_NODE) ok(await bd.co("tests/node/" + f), "có: tests/node/" + f);
});

ca("gốc gói không có tệp lạ, và không nhét bản zip cũ vào trong", async (bd) => {
  const ds = await bd.lietKe(".");
  for (const f of ds) ok(GOC_CHO_PHEP.indexOf(f) >= 0, "tệp gốc hợp lệ: " + f);
  ok(ds.indexOf("tests-browser.zip") < 0, "không có bản zip lồng trong gói");
  ok(ds.indexOf("node_modules") < 0, "không có node_modules");
});

ca("src/ chỉ chứa mã thật của app, không có tệp kiểm thử", async (bd) => {
  const ds = await bd.lietKe("src");
  for (const f of ds) ok(SRC_CHO_PHEP.indexOf(f) >= 0, "src/ chỉ chứa tệp app: " + f);
  for (const f of ds) {
    const l = f.toLowerCase();
    const xau = l.indexOf("test") >= 0 || l.indexOf("spec") >= 0 || l.indexOf("fixture") >= 0 ||
      l.indexOf(".zip") >= 0 || l.indexOf(".json") >= 0 || l.indexOf(".mjs") >= 0;
    eq(xau, false, "src/" + f + " không phải tệp kiểm thử/dữ liệu mẫu");
  }
  ok(ds.indexOf("README.md") >= 0, "src/README.md là điểm vào cho người đọc sau");
});

ca("import trong src/ đều tương đối và trỏ đúng tệp có thật", async (bd) => {
  let soImport = 0;
  for (const m of MODULE_SRC) {
    const text = await bd.doc("src/" + m);
    for (const s of dsImport(text)) {
      soImport += 1;
      ok(s.indexOf(".") === 0, "src/" + m + " chỉ import tương đối: " + s);
      if (s.indexOf("./") === 0) {
        ok(await bd.co("src/" + s.slice(2)), "src/" + m + " trỏ đúng tệp: " + s);
      }
    }
  }
  ok(soImport > 0, "đọc được import của src/ (" + soImport + " dòng)");
});

ca("tests/lib/h.js giữ luật riêng: không dùng dấu gạch chéo ngược", async (bd) => {
  const h = await bd.doc("tests/lib/h.js");
  ok(h.indexOf(BS) < 0, "h.js không có dấu gạch chéo ngược");
});

ca("runner.js và thư mục tests/browser khớp nhau từng bộ một", async (bd) => {
  const run = await bd.doc("tests/browser/runner.js");
  const trongDanhMuc = giaTriTruong(run, "ten:");
  const dsTep = (await bd.lietKe("tests/browser")).filter((f) => f.slice(-3) === ".js" && f !== "runner.js").map((f) => f.slice(0, -3));
  ok(trongDanhMuc.length > 0, "đọc được DANH_MUC (" + trongDanhMuc.length + " mục)");
  for (const t of dsTep) ok(trongDanhMuc.indexOf(t) >= 0, "có tệp nhưng chưa khai báo trong DANH_MUC: " + t);
  for (const t of trongDanhMuc) ok(dsTep.indexOf(t) >= 0, "khai báo nhưng thiếu tệp: " + t);
  eq(trongDanhMuc.length, dsTep.length, "số mục trong DANH_MUC bằng số tệp bộ kiểm thử");
  ok(run.indexOf("không trả về ca nào") >= 0, "còn cảnh báo bộ không trả về ca nào");
});

ca("DANH_MUC chỉ dùng bốn loại đã định", async (bd) => {
  const run = await bd.doc("tests/browser/runner.js");
  const dsLoai = giaTriTruong(run, "loai:");
  ok(dsLoai.length > 0, "đọc được loại của các bộ (" + dsLoai.length + ")");
  for (const l of dsLoai) ok(["nen", "dung", "bo", "phu"].indexOf(l) >= 0, "loại hợp lệ: " + l);
});

ca("bộ chạy còn lưới an toàn cho CÀI ĐẶT (localStorage)", async (bd) => {
  // Cài đặt cũng là dữ liệu thật. Bộ kiểm thử ghi mốc sao lưu (và `danhDauDaDoi` ghi mốc mỗi
  // lần dữ liệu đổi), nên bộ chạy phải chụp cài đặt TRƯỚC và trả nguyên SAU khi dọn dữ liệu
  // test — nếu không, người dùng bị hoãn lời nhắc sao lưu bằng một mốc "đã xuất" giả.
  const run = await bd.doc("tests/browser/runner.js");
  ok(run.indexOf("truyenVai.caiDat") >= 0, "có nhắc tới khoá cài đặt");
  ok(run.indexOf("function ghiCaiDat") >= 0, "có hàm trả cài đặt về nguyên trạng");
  ok(run.indexOf("function soCaiDat") >= 0, "có hàm so cài đặt (bỏ qua khối mốc sao lưu)");
  ok(run.indexOf("CÀI ĐẶT THẬT ĐÃ ĐỔI") >= 0, "có cảnh báo khi cài đặt bị đụng");
  ok(run.indexOf("kq.daDon.caiDat") >= 0, "có báo cáo việc trả cài đặt về nguyên trạng");
});

ca("cổng an toàn tuổi của Giai đoạn 1 còn nguyên trong mã", async (bd) => {
  const ai = await bd.doc("src/ai.js");
  ok(ai.indexOf("KHUNG HÌNH AN TOÀN") < 0, "ai.js đã bỏ hẳn khung hình an toàn");
  ok(ai.indexOf("function laKhongCo") >= 0, "ai.js còn bộ nhận biết mục rỗng");
  const app = await bd.doc("src/app.js");
  ok(app.indexOf("chanViChuaXacNhan") >= 0, "app.js còn cổng chặn tạo ảnh khi chưa xác nhận");
  ok(app.indexOf("xacNhan18Plus") >= 0, "app.js còn hàm xác nhận 18+");
  const store = await bd.doc("src/store.js");
  ok(store.indexOf("xacNhanMoiNguoiLon") >= 0, "store.js còn hàm xác nhận người lớn");
  ok(store.indexOf("dauHieuViThanhNien") >= 0, "store.js còn bộ dò dấu hiệu vị thành niên");
  ok(store.indexOf("dsChanGhiCo") >= 0, "store.js còn danh sách bị chặn ghi cờ");
  ok(store.indexOf("TU_VI_THANH_NIEN") >= 0, "store.js còn danh sách cụm từ vị thành niên");
  const css = await bd.doc("src/styles.css");
  ok(css.indexOf(".confirm-chan") >= 0, "styles.css còn lớp cảnh báo danh sách bị chặn");
  const main = await bd.doc("main.pjs");
  for (const x of ["CauHinh", "SoThichBdsm", "MucDoBdsm", "GiaoKeoMacDinh", "MauNhanVat", "NhipDoBdsm", "DoDaiCanh", "NgonNguBdsm", "KieuQuanHe"]) {
    ok(main.indexOf(x) >= 0, "main.pjs còn danh sách: " + x);
  }
});

ca("index.html nạp app và đặt gốc perchance", async (bd) => {
  const html = await bd.doc("index.html");
  ok(html.indexOf("src/styles.css") >= 0, "nạp styles.css");
  ok(html.indexOf("src/app.js") >= 0, "nạp app.js");
  ok(html.indexOf("TRUYEN_VAI_ROOT") >= 0, "đặt gốc perchance cho app");
  ok(html.indexOf("appRoot") >= 0, "có #appRoot");
  ok(html.indexOf("<html") < 0, "không tự thêm thẻ html");
  ok(html.indexOf("<body") < 0, "không tự thêm thẻ body");
  ok(html.indexOf("<head") < 0, "không tự thêm thẻ head");
});

ca("package.json và workflow CI khai báo đúng", async (bd) => {
  const pj = JSON.parse(await bd.doc("package.json"));
  eq(pj.type, "module", "là gói ES module");
  eq(pj.private, true, "là gói riêng tư, không phát hành lên npm");
  ok(!!(pj.scripts && pj.scripts.test), "có lệnh test");
  ok(String(pj.scripts.test).indexOf("node --test") >= 0, "lệnh test chạy bằng node --test");
  const yml = await bd.doc(".github/workflows/test.yml");
  ok(yml.indexOf("npm test") >= 0, "CI chạy npm test");
  ok(yml.indexOf("setup-node") >= 0, "CI dựng Node");
  ok(yml.indexOf("node-version") >= 0, "CI ghim phiên bản Node");
});

ca("mọi tệp kiểm thử Node đều tự đăng ký ít nhất một ca", async (bd) => {
  for (const f of TEP_NODE) {
    const text = await bd.doc("tests/node/" + f);
    ok(text.indexOf("test(") >= 0, "tests/node/" + f + " có gọi test()");
  }
  for (const f of TEP_FIXTURE) {
    const text = await bd.doc("tests/fixtures/" + f);
    ok(text.indexOf("export ") >= 0, "tests/fixtures/" + f + " có xuất dữ liệu mẫu");
  }
});

ca("src/CONTEXT.md nằm trong hạn ≤ 10240 byte và vẫn giữ đủ LUẬT", async (bd) => {
  // CONTEXT.md là tệp được đọc ĐẦU TIÊN mỗi phiên làm việc, nên nó phải ngắn. Đã từng phình
  // lên 12.976 byte vì chi tiết lịch sử/giải thích dài được viết thẳng vào đây; chi tiết đó
  // giờ nằm ở src/README.md và tests/README.md. Ca này giữ cho nó không phình lại.
  const t = await bd.doc("src/CONTEXT.md");
  const so = new TextEncoder().encode(t).length;
  ok(so <= 10240, "src/CONTEXT.md ≤ 10240 byte (đang " + so + " byte)");
  // Rút gọn mà mất luật thì coi như hỏng: những mục dưới đây PHẢI còn.
  for (const x of [
    "## 1. Module + chiều import",
    "## 2. Bất biến dữ liệu",
    "## 4. Muốn sửa X",
    "## 6. `PHIEN_BAN_*`",
    "## 7. Luật làm việc",
    "esc()",
    "laNguoiLon()",
    "schema.js",
    "migrate",
  ]) {
    ok(t.indexOf(x) >= 0, "src/CONTEXT.md còn giữ: " + x);
  }
  // Và phải trỏ tới hai tệp chứa phần chi tiết đã chuyển đi.
  ok(t.indexOf("src/README.md") >= 0, "CONTEXT.md trỏ tới src/README.md");
  ok(t.indexOf("tests/README.md") >= 0, "CONTEXT.md trỏ tới tests/README.md");
  const readme = await bd.doc("src/README.md");
  ok(new TextEncoder().encode(readme).length > so, "CONTEXT.md phải ngắn hơn src/README.md");
});

ca("đường nạp dữ liệu đi qua MỘT cửa vào duy nhất (migrate/napBanGhi)", async (bd) => {
  // Giai đoạn 5 gom mọi đường nạp về `napBanGhi`/`migrate` (kiểm hình dạng + nâng phiên bản).
  // Nếu có chỗ nào tự gọi thẳng `chuanHoa*` thì chỗ đó LẶNG LẼ bỏ qua việc kiểm hình dạng, và
  // người dùng sẽ không bao giờ thấy bản ghi dị dạng trong màn Tự kiểm tra.
  const app = await bd.doc("src/app.js");
  const store = await bd.doc("src/store.js");
  ok(store.indexOf("export function migrate(") >= 0, "store.js có điểm vào migrate");
  ok(store.indexOf("export function napBanGhi(") >= 0, "store.js có napBanGhi");
  ok(store.indexOf("export function chuanHoaTruyen(") >= 0, "store.js vẫn là nguồn duy nhất của hình dạng (chuanHoaTruyen)");
  // Bốn đường nạp của store.js.
  ok(store.indexOf('napBanGhi(raw, "truyen")') >= 0, "loadStories đi qua napBanGhi (truyện)");
  ok(store.indexOf('napBanGhi(raw, "ho-so")') >= 0, "loadNgoaiHinh đi qua napBanGhi (hồ sơ)");
  ok(store.indexOf('napBanGhi(arr, "tin-nhan", convId)') >= 0, "loadMessages đi qua napBanGhi (tin nhắn)");
  ok(store.indexOf("const kq = kiemTraAnh(rec);") >= 0, "getAnh kiểm hình dạng ảnh rồi mới trả về");
  // Ba đường nạp của app.js (hồ sơ nhập tay, tin nhắn trong file nhập, truyện trong file nhập).
  ok(app.indexOf('napBanGhi(goc, "ho-so", goc.id)') >= 0, "app.js: hồ sơ nhập tay đi qua napBanGhi");
  ok(app.indexOf('napBanGhi(messages[c.id] || [], "tin-nhan", c.id)') >= 0, "app.js: tin nhắn trong file nhập đi qua napBanGhi");
  ok(app.indexOf('napBanGhi(raw, "truyen", "", { choNhap: true, dongY18:') >= 0, "app.js: nhập truyện đi qua napBanGhi kèm choNhap + xác nhận 18+");
  ok(app.indexOf("chuanHoaTruyen(") < 0, "app.js KHÔNG gọi thẳng chuanHoaTruyen (sẽ bỏ qua kiểm hình dạng)");
});
