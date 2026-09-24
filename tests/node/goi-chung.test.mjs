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
// Tầng giao diện tách riêng (Giai đoạn 6): `src/ui/**`. Lõi KHÔNG bao giờ import ngược
// vào đây — có ca "DAG" ở cuối tệp ghim luật đó.
const MODULE_UI_GOC = "src/ui";
const TEP_NODE = [
  "ai-parse.test.mjs", "cong18.test.mjs", "dom.test.mjs", "gd4.test.mjs", "goi-chung.test.mjs",
  "khong-ro-ri.test.mjs", "lore.test.mjs", "lorebookFlow.test.mjs", "ngoaiHinh.test.mjs", "nhanVatForm.test.mjs",
  "schema.test.mjs", "store.test.mjs", "suKien.test.mjs", "taoAnhFlow.test.mjs", "taoTruyenFlow.test.mjs",
  "thoiGian.test.mjs", "trangThai.test.mjs", "tuyChonTruyenFlow.test.mjs",
];
const TEP_FIXTURE = ["ke-hoach.mjs", "phien-ban-cu.mjs", "phieu.mjs", "truyen.mjs", "vang-mat.mjs"];
const SRC_CHO_PHEP = MODULE_SRC.concat(["styles.css", "README.md", "CONTEXT.md", "ui"]);
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
  ok(app.indexOf("xacNhan18Plus") >= 0, "app.js còn hàm xác nhận 18+");
  // Cổng chặn tạo ảnh khi chưa xác nhận: từ Giai đoạn 6 nó nằm ở tầng giao diện tạo ảnh
  // (`src/ui/taoAnh/`). Phải còn cả TÊN HÀM, cả câu giải thích, và chỉ MỘT chỗ định nghĩa
  // dùng chung cho mọi đường vào màn tạo ảnh.
  const dung = await bd.doc("src/ui/taoAnh/taoAnhDung.js");
  const demGoi = dung.split("chanViChuaXacNhan").length - 1;
  ok(demGoi >= 3, "còn cổng chặn tạo ảnh khi chưa xác nhận, gọi ở cả hai đường (" + demGoi + " lần)");
  const flow = await bd.doc("src/ui/taoAnh/taoAnhFlow.js");
  ok(flow.indexOf("nvChuaXacNhanChoTaoAnh") >= 0, "quyết định cổng nằm ở tầng logic thuần");
  ok(flow.indexOf("chưa được xác nhận là người trưởng thành") >= 0, "còn câu giải thích cách sửa");
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

ca("cổng 18+ của hai màn mới nằm ở tầng logic THUẦN, câu chữ chỉ có một nguồn", async (bd) => {
  // Điều kiện riêng của Đợt 6b: mọi QUYẾT ĐỊNH của cửa 18+ (khi nào hỏi, ai được ghi cờ, ai
  // bị chặn kèm lý do, mã danh sách) phải nằm trong tệp thuần, còn phần DOM chỉ hiển thị và
  // chuyển lựa chọn của người dùng. Và câu chữ của hộp xác nhận chỉ được định nghĩa MỘT chỗ.
  const cong = await bd.doc("src/ui/cong18.js");
  for (const x of ["danhSachGhiCo", "danhSachBiChan", "maDanhSach", "canHoiLaiDanhSach", "coBdsm"]) {
    ok(cong.indexOf("export function " + x) >= 0, "src/ui/cong18.js xuất " + x);
  }
  for (const x of ["LY_DO_BAT_GIAO_KEO", "LOI_TU_CHOI_DANH_SACH", "LOI_TU_CHOI_BAT_GIAO_KEO", "LOI_NHANH_CHUA_XAC_NHAN"]) {
    ok(cong.indexOf("export const " + x) >= 0, "src/ui/cong18.js xuất câu chữ " + x);
  }
  ok(cong.indexOf("dom.js") < 0, "src/ui/cong18.js KHÔNG import DOM");
  const form = await bd.doc("src/ui/nhanVat/nhanVatForm.js");
  for (const x of ["khoaNguoiLonTheoTuoi", "chotNguoiLon", "tuoiTheoHoSo"]) {
    ok(form.indexOf("export function " + x) >= 0, "nhanVatForm.js xuất " + x);
  }
  ok(form.indexOf("dom.js") < 0, "nhanVatForm.js KHÔNG import DOM");
  ok(form.indexOf("document.") < 0, "nhanVatForm.js KHÔNG đọc DOM");
  const flow = await bd.doc("src/ui/taoTruyen/taoTruyenFlow.js");
  ok(flow.indexOf("dom.js") < 0, "taoTruyenFlow.js KHÔNG import DOM");
  ok(flow.indexOf("document.") < 0, "taoTruyenFlow.js KHÔNG đọc DOM");
  // Phần DOM phải GỌI đúng những hàm thuần đó, và cửa 18+ cấp truyện phải đi qua
  // `xacNhan18PlusTruyen` (hộp liệt kê danh sách) — không được tự viết hộp riêng.
  const gk = await bd.doc("src/ui/nhanVat/nhanVatGiaoKeo.js");
  ok(gk.indexOf("xacNhan18PlusTruyen") >= 0, "nút Bật giao kèo đi qua hộp xác nhận danh sách");
  ok(gk.indexOf("chanNoiDungNguoiLon") >= 0, "nút Bật giao kèo đi qua cổng chặn dùng chung");
  ok(gk.indexOf("LY_DO_BAT_GIAO_KEO") >= 0, "nút Bật giao kèo lấy câu chữ từ cong18.js");
  const luu = await bd.doc("src/ui/nhanVat/nhanVatLuu.js");
  ok(luu.indexOf("chotNguoiLon") >= 0, "lúc LƯU nhân vật áp luật tuổi thuần");
  const nhanh = await bd.doc("src/ui/taoTruyen/taoTruyenNhanh.js");
  ok(nhanh.indexOf("canHoiLaiDanhSach") >= 0, "Tạo nhanh hỏi lại khi danh sách ghi cờ đổi");
  ok(nhanh.indexOf("xacNhan18PlusTruyen") >= 0, "Tạo nhanh liệt kê danh sách trước khi ghi cờ");
  ok(nhanh.indexOf("chanNoiDungNguoiLon") >= 0, "Tạo nhanh đi qua cổng chặn dùng chung");
  const wiz = await bd.doc("src/ui/taoTruyen/taoTruyenWizard.js");
  ok(wiz.indexOf("xacNhan18PlusTruyen") >= 0, "wizard liệt kê danh sách trước khi ghi cờ");
  // Câu chữ không được chép lại trong tầng DOM: chỉ cần một câu chữ bị chép là đã có hai
  // nguồn, và sửa một chỗ sẽ lệch chỗ kia.
  const DOM_18 = [
    "src/ui/nhanVat/nhanVatGiaoKeo.js", "src/ui/nhanVat/nhanVatLuu.js", "src/ui/nhanVat/nhanVatAi.js",
    "src/ui/nhanVat/nhanVatAvatar.js", "src/ui/nhanVat/nhanVatMau.js", "src/ui/nhanVat/index.js",
    "src/ui/taoTruyen/taoTruyenNhanh.js", "src/ui/taoTruyen/taoTruyenWizard.js", "src/ui/taoTruyen/index.js",
  ];
  const CAU = ["Chưa xác nhận 18+", "Bạn đang bật giao kèo BDSM cho truyện này.", "không thể đánh dấu là người trưởng thành"];
  for (const f of DOM_18) {
    const text = await bd.doc(f);
    for (const c of CAU) ok(text.indexOf(c) < 0, f + " không được chép lại câu chữ 18+: " + c);
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

// ---------------------------------------------------------------- tầng giao diện src/ui/
// Mọi đường dẫn module trong một tệp — bắt CẢ import một dòng LẪN nhiều dòng (dãy `from "…"`).
// `dsImport()` ở trên chỉ đọc dòng bắt đầu bằng "import ", nên nó bỏ sót import nhiều dòng;
// ở đây cần chắc chắn không sót, vì một import ngược chiều lọt lưới là luật DAG đã vỡ.
function dsDuongDan(text) {
  const ra = [];
  for (const dong of String(text).split(NL)) {
    const i = dong.indexOf("from ");
    if (i < 0) continue;
    const q = catNhay(dong.slice(i + 5));
    if (q.length) ra.push(q[0]);
  }
  return ra;
}

// Mọi tệp .js trong src/ui/ (đi đệ quy: hiện chỉ một tầng thư mục con, nhưng luật phải
// đúng cả khi sau này có thêm tầng nữa).
async function dsTepUi(bd) {
  const ra = [];
  const di = async (rel) => {
    let con = [];
    try {
      con = await bd.lietKe(rel);
    } catch (e) {
      return;
    }
    for (const f of con) {
      if (f.slice(-3) === ".js") ra.push(rel + "/" + f);
      else await di(rel + "/" + f);
    }
  };
  await di(MODULE_UI_GOC);
  return ra.sort();
}

// `./x.js` / `../../y.js` tính từ một tệp nguồn ⇒ đường dẫn tính từ gốc gói.
function giaiTu(bd, tuTep, spec) {
  const phan = String(tuTep).split("/");
  phan.pop();
  for (const p of String(spec).split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") phan.pop();
    else phan.push(p);
  }
  return phan.join("/");
}

// Một tên định danh JS hợp lệ (viết tay, không dùng biểu thức chính quy — xem đầu tệp).
function laTenDinhDanh(s) {
  const t = String(s || "");
  if (!t.length) return false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c.charCodeAt(0) > 127) return false;
    const chu = (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
    const so = c >= "0" && c <= "9";
    if (!chu && !so) return false;
    if (i === 0 && so) return false;
  }
  return true;
}

// Ký tự có thể nằm trong một tên định danh (kể cả sau ký tự đầu).
function laChuThan(c) {
  if (!c) return false;
  if (c.charCodeAt(0) > 127) return false;
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_" || c === "$";
}

// Mọi tên được gọi qua bảng phụ thuộc: `D.ten`.
function dsGoiQuaDeps(text) {
  const ra = [];
  const t = String(text);
  let i = t.indexOf("D.");
  while (i >= 0) {
    let j = i + 2;
    while (j < t.length && laChuThan(t[j])) j += 1;
    if (j > i + 2) ra.push(t.slice(i + 2, j));
    i = t.indexOf("D.", j > i + 2 ? j : i + 2);
  }
  return ra;
}

ca("DAG: lõi KHÔNG BAO GIỜ import src/ui (một chiều)", async (bd) => {
  // `src/ui/*` được import lõi (store/ngoaiHinh/schema/dom/…). Chiều ngược lại là cấm:
  // một import ngược sẽ kéo DOM vào tầng thuần và làm `src/ui` không còn tách ra được.
  for (const m of MODULE_SRC) {
    if (m === "app.js") continue; // app.js là vỏ nối giao diện — xem ca dưới
    const text = await bd.doc("src/" + m);
    for (const s of dsDuongDan(text)) ok(s.indexOf("ui/") < 0, "src/" + m + " KHÔNG được import src/ui: " + s);
  }
  // app.js là tệp lõi DUY NHẤT được nối vào tầng giao diện (nó là vỏ của app).
  const app = await bd.doc("src/app.js");
  ok(app.indexOf('from "./ui/') >= 0, "app.js là vỏ nối vào src/ui/");
  const ui = await dsTepUi(bd);
  ok(ui.length >= 5, "đọc được các tệp src/ui (" + ui.length + " tệp)");
  ok(ui.indexOf("src/ui/taoAnh/taoAnhFlow.js") >= 0, "có tệp logic thuần của màn tạo ảnh");
  ok(ui.indexOf("src/ui/taoAnh/index.js") >= 0, "có điểm vào của màn tạo ảnh");
});

ca("import trong src/ui/ đều tương đối và trỏ đúng tệp có thật", async (bd) => {
  const ui = await dsTepUi(bd);
  let soImport = 0;
  for (const f of ui) {
    const text = await bd.doc(f);
    for (const s of dsDuongDan(text)) {
      soImport += 1;
      // Tương đối: `./` cùng thư mục, `../` lên một tầng (chỉ `src/ui/cong18.js` dùng),
      // `../../` lên tới lõi.
      const tuongDoi = s.indexOf("./") === 0 || s.indexOf("../") === 0;
      ok(tuongDoi, f + " chỉ được import tương đối: " + s);
      if (tuongDoi) ok(await bd.co(giaiTu(bd, f, s)), f + " trỏ đúng tệp: " + s);
      // Đếm số tầng `../` để chắc chắn import không trỏ ra ngoài gói (giaiTu cắt quá tay
      // vẫn cho ra một đường dẫn trông hợp lệ, nên phải chặn bằng số tầng).
      let con = s;
      let soTang = 0;
      while (con.indexOf("../") === 0) {
        soTang += 1;
        con = con.slice(3);
      }
      ok(soTang <= f.split("/").length - 1, f + " import không được trỏ ra ngoài gói: " + s);
    }
  }
  ok(soImport >= 10, "đọc được import của src/ui/ (" + soImport + " dòng)");
});

// Các màn đã tách khỏi app.js: tạo ảnh (Giai đoạn 6), Cốt truyện mới + Sửa nhân vật (Đợt 6b),
// Tuỳ chọn truyện + Sổ tri thức (Đợt 6c). Mỗi màn là một VỎ ngắn trong app.js + một bảng phụ
// thuộc tường minh, thân nằm ở src/ui/. `tep` = thư mục chứa thân màn (để ca "DEPS hai chiều"
// đối chiếu bảng với ĐÚNG những tệp dùng nó).
const MAN_HINH = [
  { ten: "tạo ảnh", khaiBao: "async function openTaoAnh(opts = {}) {", goi: "moTaoAnh(opts, TAO_ANH_DEPS)", bang: "TAO_ANH_DEPS", nhap: 'from "./ui/taoAnh/index.js"', tep: ["src/ui/taoAnh"] },
  { ten: "Cốt truyện mới", khaiBao: "function openNewStoryModal(opts = {}) {", goi: "moTaoTruyen(opts, TAO_TRUYEN_DEPS)", bang: "TAO_TRUYEN_DEPS", nhap: 'from "./ui/taoTruyen/index.js"', tep: ["src/ui/taoTruyen"] },
  { ten: "Sửa nhân vật", khaiBao: "function openCharacterEditor(charId, opts = {}) {", goi: "moNhanVat(charId, opts, NHAN_VAT_DEPS)", bang: "NHAN_VAT_DEPS", nhap: 'from "./ui/nhanVat/index.js"', tep: ["src/ui/nhanVat"] },
  { ten: "Tuỳ chọn truyện", khaiBao: "function openStoryMenu() {", goi: "moTuyChon(TUY_CHON_TRUYEN_DEPS)", bang: "TUY_CHON_TRUYEN_DEPS", nhap: 'from "./ui/tuyChonTruyen/index.js"', tep: ["src/ui/tuyChonTruyen"] },
  { ten: "Sổ tri thức", khaiBao: "function openLorebook() {", goi: "moLorebook(LOREBOOK_DEPS)", bang: "LOREBOOK_DEPS", nhap: 'from "./ui/lorebook/index.js"', tep: ["src/ui/lorebook"] },
];

// Bảng phụ thuộc của SỰ KIỆN TOÀN CỤC (Đợt 6c): không phải một "màn" mà là bảy bảng con ở
// `src/ui/suKien/*`, gộp bằng `gopBangSuKien`. Vẫn phải theo đúng luật DEPS hai chiều.
const SU_KIEN_DEPS_TEP = ["src/ui/suKien"];

// Mọi bảng phụ thuộc của app.js + thư mục dùng nó — để soi HAI CHIỀU.
const BANG_DEPS = MAN_HINH.map((mh) => ({ ten: mh.ten, bang: mh.bang, tep: mh.tep }))
  .concat([{ ten: "sự kiện toàn cục", bang: "SU_KIEN_DEPS", tep: SU_KIEN_DEPS_TEP }]);

ca("các màn đã tách: thân nằm ở src/ui, app.js chỉ còn vỏ nối", async (bd) => {
  // Nếu ai đó viết thân màn hình trở lại app.js thì vỏ sẽ phình ra — ca này bắt đúng lúc đó.
  const app = await bd.doc("src/app.js");
  for (const mh of MAN_HINH) {
    const i = app.indexOf(mh.khaiBao);
    ok(i >= 0, "app.js còn định nghĩa vỏ của màn " + mh.ten);
    const than = app.slice(i, app.indexOf("\n}\n", i) + 3);
    const soDong = than.split(NL).length;
    ok(soDong <= 150, "vỏ " + mh.ten + " ≤ 150 dòng (đang " + soDong + " dòng)");
    ok(than.indexOf(mh.goi) >= 0, "vỏ " + mh.ten + " gọi thẳng vào src/ui/ bằng bảng phụ thuộc");
    ok(app.indexOf("const " + mh.bang + " = {") >= 0, "màn " + mh.ten + " có bảng phụ thuộc tường minh");
    ok(app.indexOf(mh.nhap) >= 0, "app.js nạp điểm vào của màn " + mh.ten + " (" + mh.nhap + ")");
  }
});

ca("bảng phụ thuộc (DEPS) chỉ chứa thứ KHÔNG import được từ lõi", async (bd) => {
  // Luật của dự án: bảng `*_DEPS` là chỗ nối với những hàm CÒN LẠI của app.js (điều hướng,
  // ghi dữ liệu, tiện ích). Mọi thứ khác phải import thẳng từ lõi — nếu không, bảng biến
  // thành một túi đồ nghề chung và tầng giao diện không còn tách ra được.
  const ten = [];
  for (const x of ["export function ", "export async function ", "export const ", "export let "]) ten.push(x);
  const lõi = ["dom.js", "store.js", "ai.js", "ngoaiHinh.js", "schema.js", "thoiGian.js", "lore.js", "trangThai.js"];
  const xuat = [];
  for (const m of lõi) {
    for (const dong of String(await bd.doc("src/" + m)).split(NL)) {
      const t = dong.trim();
      // Dạng gộp: `export { a, b as c };` — tên dùng được là phần SAU chữ " as ".
      if (t.indexOf("export {") === 0) {
        const mo = t.indexOf("{");
        const dong2 = t.indexOf("}", mo);
        if (dong2 > mo) {
          for (const phan of t.slice(mo + 1, dong2).split(",")) {
            let p = phan.trim();
            if (!p) continue;
            const k = p.indexOf(" as ");
            if (k >= 0) p = p.slice(k + 4).trim();
            xuat.push(p);
          }
        }
        continue;
      }
      for (const x of ten) {
        if (t.indexOf(x) !== 0) continue;
        let con = t.slice(x.length);
        let cat = con.length;
        for (const c of [" ", "=", "(", ";"]) {
          const i = con.indexOf(c);
          if (i >= 0 && i < cat) cat = i;
        }
        xuat.push(con.slice(0, cat));
        break;
      }
    }
  }
  ok(xuat.length >= 100, "đọc được tên hàm/hằng xuất của lõi (" + xuat.length + " tên)");
  const app = await bd.doc("src/app.js");
  const tatCaKhoaDeps = [];
  for (const mh of BANG_DEPS) {
    const dau = app.indexOf("const " + mh.bang + " = {");
    ok(dau >= 0, "có bảng " + mh.bang);
    const cuoi = app.indexOf("\n};", dau);
    const than = app.slice(dau, cuoi);
    let soKhoa = 0;
    for (const dong of than.split(NL)) {
      const t = dong.trim();
      if (!t || t.indexOf("const ") === 0) continue;
      // Một khoá thường viết tắt (`render,`); chỉ những khoá trả về HÀM MỚI mới có giá trị
      // (`mauCotTruyen: () => ...`). Nhiều khoá có thể nằm chung một dòng — nên tách theo dấu
      // phẩy rồi cắt ở dấu hai chấm.
      for (const phan of t.split(",")) {
        let k = phan.trim();
        if (!k) continue;
        const i = k.indexOf(":");
        if (i >= 0) k = k.slice(0, i).trim();
        if (!laTenDinhDanh(k)) continue;
        soKhoa += 1;
        tatCaKhoaDeps.push(k);
        ok(xuat.indexOf(k) < 0, mh.bang + " KHÔNG được chứa thứ lõi đã xuất: " + k);
      }
    }
    ok(soKhoa >= 3, mh.bang + " có khai báo phụ thuộc (" + soKhoa + " khoá)");
  }
  // Và mặt ngược lại: tầng giao diện không được GỌI qua `D.` một thứ lõi đã xuất — làm vậy
  // là vẫn còn đường vòng qua bảng, chỉ khác là nó vỡ lúc chạy (đã từng xảy ra: xoá
  // `giaoKeoMacDinh` khỏi bảng xong `D.giaoKeoMacDinh()` vẫn nằm trong màn Cốt truyện mới).
  for (const f of await dsTepUi(bd)) {
    const text = await bd.doc(f);
    for (const x of dsGoiQuaDeps(text)) {
      ok(xuat.indexOf(x) < 0, f + " KHÔNG được gọi D." + x + " (lõi đã xuất — import thẳng)");
      // Mọi thứ gọi qua `D.` phải CÓ THẬT trong một bảng phụ thuộc. Thiếu khoá là lỗi chỉ
      // hiện ra lúc bấm nút (đã từng xảy ra: `D.promptAvatarAi is not a function` khi bấm
      // "Tạo ảnh đại diện") — tầng Node phải bắt được, không để người dùng phát hiện.
      ok(tatCaKhoaDeps.indexOf(x) >= 0, f + " gọi D." + x + " nhưng bảng phụ thuộc không có khoá đó");
    }
  }
});

ca("bảng phụ thuộc (DEPS) khớp HAI CHIỀU với đúng những tệp dùng nó", async (bd) => {
  // Luật của dự án (Đợt 6c nâng từ một chiều lên hai chiều): một bảng phụ thuộc vừa không được
  // KHAI THỪA (khoá không tệp nào gọi — bảng phình ra thành túi đồ nghề chung), vừa không được
  // THIẾU (tầng giao diện gọi `D.x` mà bảng không có — lỗi chỉ hiện khi bấm nút). Và vì một
  // khoá viết dạng `k: TÊN` bị công cụ đếm thành HAI tên (đúng lỗi đã xảy ra với
  // `mauChoices: MAU_CHOICES`), khoá có giá trị chỉ được nhận giá trị là HÀM.
  const app = await bd.doc("src/app.js");
  const ui = await dsTepUi(bd);
  let soBang = 0;
  for (const mh of BANG_DEPS) {
    soBang += 1;
    const dau = app.indexOf("const " + mh.bang + " = {");
    ok(dau >= 0, "có bảng " + mh.bang);
    const cuoi = app.indexOf("\n};", dau);
    const than = app.slice(dau, cuoi);
    const khoa = [];
    for (const dong of than.split(NL)) {
      const t = dong.trim();
      if (!t || t.indexOf("const ") === 0) continue;
      for (const phan of t.split(",")) {
        let k = phan.trim();
        if (!k) continue;
        let giaTri = "";
        const i = k.indexOf(":");
        if (i >= 0) {
          giaTri = k.slice(i + 1).trim();
          k = k.slice(0, i).trim();
        }
        if (!laTenDinhDanh(k)) continue;
        khoa.push(k);
        if (giaTri) {
          const laHam = giaTri.slice(0, 1) === "(" || giaTri.indexOf("function ") === 0 || giaTri.indexOf("async ") === 0;
          ok(laHam, mh.bang + " · khoá " + k + " có giá trị phải là hàm (trùng tên thì viết tắt)");
        }
      }
    }
    // Những tên mà tầng giao diện của màn này THẬT SỰ gọi qua `D.`.
    const refs = [];
    for (const f of ui) {
      let thuoc = false;
      for (const d of mh.tep) if (f.indexOf(d + "/") === 0) thuoc = true;
      if (!thuoc) continue;
      for (const x of dsGoiQuaDeps(await bd.doc(f))) if (refs.indexOf(x) < 0) refs.push(x);
    }
    ok(refs.length > 0, mh.bang + " được tầng giao diện gọi thật (" + refs.length + " tên)");
    for (const k of khoa) ok(refs.indexOf(k) >= 0, mh.bang + " khai thừa: không tệp nào gọi D." + k);
    for (const x of refs) ok(khoa.indexOf(x) >= 0, mh.bang + " khai thiếu: cần khoá cho D." + x);
  }
  ok(soBang >= 6, "có ≥ 6 bảng phụ thuộc (đang " + soBang + ")");
});

ca("không hàm nào trong src/ui/ dài quá 150 dòng", async (bd) => {
  // Cùng luật 150 dòng với `openTaoAnh`, nhưng áp cho MỌI hàm của tầng giao diện — kể cả
  // hàm con bên trong từng tệp. Không dùng regex: chỉ tìm dòng khai báo ở cột 0 và dòng
  // đóng `}` ở cột 0, đúng quy ước trình bày của dự án.
  const ui = await dsTepUi(bd);
  let soHam = 0;
  for (const f of ui) {
    const dong = String(await bd.doc(f)).split(NL);
    for (let i = 0; i < dong.length; i++) {
      const t = dong[i];
      const laKhaiBao =
        t.indexOf("function ") === 0 ||
        t.indexOf("export function ") === 0 ||
        t.indexOf("async function ") === 0 ||
        t.indexOf("export async function ") === 0;
      if (!laKhaiBao) continue;
      soHam += 1;
      let j = i + 1;
      while (j < dong.length && dong[j] !== "}") j += 1;
      const soDong = (j < dong.length ? j : dong.length - 1) - i + 1;
      ok(soDong <= 150, f + " · " + t.slice(0, 56) + " · " + soDong + " dòng");
    }
  }
  ok(soHam >= 6, "đếm được hàm trong src/ui/ (" + soHam + " hàm)");
});
