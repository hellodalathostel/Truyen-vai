// Truyện Vai — tầng kiểm thử Node: SỰ KIỆN TOÀN CỤC (Đợt 6c).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `bindGlobalEvents` từng là một hàm 319 dòng với một `switch (act)` ~66
// nhánh. Sau khi tách, việc xử lý nằm trong các BẢNG theo tính năng ở `src/ui/suKien/*`, còn
// `bindGlobalEvents` chỉ gộp bảng rồi tra theo `data-act`. Bốn luật của đợt này:
//
//   1. MỘT điểm đăng ký duy nhất — chỉ `bindGlobalEvents` (app.js) gọi `addEventListener`
//      trên `document`; không tệp nào trong `src/ui/suKien/` tự đăng ký sự kiện.
//   2. Bảng chia THEO TÍNH NĂNG, và KHÔNG hành động nào trùng tên giữa hai bảng. Trùng tên
//      nghĩa là một hàm xử lý bị ghi đè IM LẶNG lúc gộp — lỗi chỉ lộ ra khi người dùng bấm nút.
//   3. Mọi `data-act` xuất hiện trong mã app phải có hàm xử lý (bảng toàn cục, hoặc bảng cục
//      bộ của một màn — nhận ra qua `=== "…"`, `closest(…)`, `querySelector(…)`).
//   4. Bảng gộp KHÔNG có prototype: `data-act="toString"` không được chạm vào
//      `Object.prototype`.
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq } from "../lib/h.js";
import "../lib/moi-truong.js";

const NL = String.fromCharCode(10);
const NH = String.fromCharCode(34);
const NHAY = String.fromCharCode(39);

const SU_KIEN = "src/ui/suKien";
const TEP_BANG = ["anh.js", "canh.js", "chat.js", "chung.js", "lorebook.js", "nguoiLon.js", "vangMat.js"];

// ------------------------------------------------------------------ đọc tệp (giống goi-chung)
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

// ------------------------------------------------------------------ tiện ích tĩnh (không regex)
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

// Khoá của một bảng sự kiện, đọc theo QUY ƯỚC TRÌNH BÀY của dự án: mỗi khoá là một dòng bắt
// đầu bằng hai khoảng trắng và một dấu nháy kép, theo sau là dấu hai chấm.
function khoaTrongBang(text) {
  const ra = [];
  for (const dong of String(text).split(NL)) {
    const t = dong.trim();
    if (t.slice(0, 1) !== NH) continue;
    const haiCham = t.indexOf(NH + ":");
    if (haiCham <= 0) continue;
    const k = t.slice(1, haiCham);
    if (k) ra.push(k);
  }
  return ra;
}

// Mọi tệp trong một thư mục (đi đệ quy), trả về đường dẫn tính từ gốc gói.
async function dsTep(bd, rel) {
  const ra = [];
  const di = async (duong) => {
    let con = [];
    try {
      con = await bd.lietKe(duong);
    } catch (e) {
      return;
    }
    for (const f of con) {
      const p = duong + "/" + f;
      if (await bd.co(p)) {
        let laThuMuc = false;
        try {
          const con2 = await bd.lietKe(p);
          laThuMuc = con2.length > 0 || f.indexOf(".") < 0;
        } catch (e) {
          laThuMuc = false;
        }
        if (laThuMuc) await di(p);
        else ra.push(p);
      }
    }
  };
  await di(rel);
  return ra;
}

// Mọi `data-act="…"` trong một đoạn mã.
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
    if (act) ra.push(act);
    i = t.indexOf(moc, b);
  }
  return ra;
}

// Dấu hiệu "chỗ này là hàm xử lý" đứng ngay trước tên hành động. Cố tình chỉ nhận những dạng
// có thật trong mã dự án, để một cái tên chỉ nằm trong HTML thôi thì KHÔNG được coi là có xử lý.
const DAU_HIEU = ["=== ", "!== ", "closest(", "querySelector(", "querySelectorAll(", "matches(", "case "];

// Hành động này có được XỬ LÝ ở đâu đó (không chỉ được vẽ ra trong HTML) không?
function coXuLy(text, act) {
  for (const q of [NH + act + NH, NHAY + act + NHAY]) {
    let i = text.indexOf(q);
    while (i >= 0) {
      const cua = text.slice(Math.max(0, i - 40), i);
      for (const d of DAU_HIEU) if (cua.indexOf(d) >= 0) return true;
      i = text.indexOf(q, i + 1);
    }
  }
  return false;
}

// ------------------------------------------------------------------ luật 2: bảng theo tính năng
test("bảy bảng sự kiện chia theo tính năng, không hành động nào trùng tên", async () => {
  const bd = await boDoc();
  if (!bd) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  const ds = await bd.lietKe(SU_KIEN);
  ok(ds.indexOf("index.js") >= 0, "có điểm vào " + SU_KIEN + "/index.js");
  const mapFiles = ds.filter((f) => f !== "index.js" && f.slice(-3) === ".js");
  eq(mapFiles.length, TEP_BANG.length, "số tệp bảng sự kiện");
  for (const f of TEP_BANG) ok(mapFiles.indexOf(f) >= 0, "có tệp bảng: " + f);
  for (const f of mapFiles) ok(f === "index.js" || TEP_BANG.indexOf(f) >= 0, "không có tệp bảng lạ: " + f);

  const tatCa = [];
  const theoBang = new Map();
  for (const f of TEP_BANG) {
    const text = await bd.doc(SU_KIEN + "/" + f);
    const khoa = khoaTrongBang(text);
    ok(khoa.length >= 1, f + " có ít nhất một hành động (" + khoa.length + ")");
    theoBang.set(f, khoa);
    for (const k of khoa) tatCa.push(k);
  }
  ok(tatCa.length >= 60, "tổng số hành động toàn cục ≥ 60 (đang " + tatCa.length + ")");

  // Trùng tên giữa hai bảng = một hàm xử lý bị che. Bắt ở đây, đừng để người dùng phát hiện.
  const dem = new Map();
  for (const k of tatCa) dem.set(k, (dem.get(k) || 0) + 1);
  for (const [k, n] of dem) eq(n, 1, "hành động không trùng tên giữa các bảng: " + k);

  // Tên hành động phải là dạng `data-act` hợp lệ (chữ thường, số, gạch ngang).
  for (const k of tatCa) {
    let hopLe = k.length > 0;
    for (const c of k) {
      const chu = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-";
      if (!chu) hopLe = false;
    }
    ok(hopLe, "tên hành động đúng dạng data-act: " + k);
  }

  // Mỗi tệp bảng phải XUẤT một hàm dựng bảng, và tệp gộp phải nạp đủ bảy bảng đó.
  const index = await bd.doc(SU_KIEN + "/index.js");
  for (const f of TEP_BANG) {
    const text = await bd.doc(SU_KIEN + "/" + f);
    ok(text.indexOf("export function ") >= 0, f + " xuất hàm dựng bảng");
    ok(index.indexOf(NH + "./" + f + NH) >= 0 || index.indexOf(NHAY + "./" + f + NHAY) >= 0, "index.js nạp " + f);
  }
});

// ------------------------------------------------------------------ luật 1: một điểm đăng ký
test("chỉ MỘT điểm đăng ký sự kiện toàn cục; tầng suKien không tự đăng ký", async () => {
  const bd = await boDoc();
  if (!bd) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  const app = await bd.doc("src/app.js");
  const moc = "document.addEventListener(" + NH + "click" + NH;
  const dem = app.split(moc).length - 1;
  eq(dem, 1, "app.js có ĐÚNG một listener click toàn cục (đang " + dem + ")");
  ok(app.indexOf("function bindGlobalEvents(") >= 0, "còn hàm bindGlobalEvents");
  ok(app.indexOf("gopBangSuKien(SU_KIEN_DEPS)") >= 0, "bindGlobalEvents gộp bảng rồi tra theo data-act");
  // Nhánh `switch (act)` cũ phải BIẾN MẤT khỏi vùng bindGlobalEvents: nếu còn, hai nguồn sự
  // thật cùng tồn tại và bảng có thể lệch khỏi switch.
  const dau = app.indexOf("function bindGlobalEvents(");
  const than = app.slice(dau, app.indexOf(NL + "}" + NL, dau) + 3);
  ok(than.indexOf("case " + NH) < 0, "vùng bindGlobalEvents không còn nhánh switch cũ");
  ok(than.indexOf("bangSuKien[") >= 0, "bindGlobalEvents tra bảng theo hành động");
  ok(than.split(NL).length <= 150, "bindGlobalEvents ≤ 150 dòng (đang " + than.split(NL).length + ")");

  for (const f of TEP_BANG) {
    const text = await bd.doc(SU_KIEN + "/" + f);
    // MỘT điểm đăng ký duy nhất: không tệp nào trong đây được tự gắn listener.
    ok(text.indexOf("addEventListener(") < 0, SU_KIEN + "/" + f + " KHÔNG tự đăng ký sự kiện");
    // Cấu trúc: mỗi tệp XUẤT đúng MỘT hàm dựng bảng, trả về một object literal các hàm xử lý.
    eq(text.split("export function ").length - 1, 1, SU_KIEN + "/" + f + " xuất đúng một hàm dựng bảng");
    ok(text.indexOf("return {") >= 0, SU_KIEN + "/" + f + " trả về bảng các hàm xử lý");
  }
  // `index.js` là chỗ GỘP: không chứa hành động nào (nếu chứa, lại có hai nguồn sự thật).
  const index = await bd.doc(SU_KIEN + "/index.js");
  ok(index.indexOf("addEventListener(") < 0, SU_KIEN + "/index.js KHÔNG tự đăng ký sự kiện");
  eq(index.split("export function ").length - 1, 1, "index.js xuất đúng một hàm gộp");
  eq(index.split("export const ").length - 1, 1, "index.js xuất đúng một hằng BANG_CON");
  ok(index.indexOf("return ra;") >= 0, "index.js trả về bảng đã gộp");
  eq(khoaTrongBang(index).length, 0, "index.js không chứa hành động nào");
  // Và chỉ có app.js được nối vào bảng sự kiện.
  const appNhap = app.indexOf('from "./ui/suKien/index.js"');
  ok(appNhap >= 0, "app.js nạp bảng sự kiện từ src/ui/suKien/index.js");
  const ui = await dsTep(bd, "src/ui");
  for (const f of ui) {
    if (f.indexOf(SU_KIEN) === 0) continue;
    const text = await bd.doc(f);
    ok(text.indexOf("suKien/index.js") < 0, f + " KHÔNG được nạp bảng sự kiện (chỉ app.js nối)");
  }
});

// ------------------------------------------------------------------ luật 3: phủ hết data-act
test("mọi data-act trong mã app đều có hàm xử lý", async () => {
  const bd = await boDoc();
  if (!bd) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  // Chỉ đọc mã (không đọc README/CSS): một cái tên `data-act` nhắc trong tài liệu không được
  // tính là "đã có hàm xử lý".
  const laMa = (p) => p.slice(-3) === ".js" || p.slice(-5) === ".html" || p.slice(-4) === ".pjs";
  const tatCaTep = (await dsTep(bd, "src")).concat(["index.html", "main.pjs"]).filter(laMa);
  const jsTep = tatCaTep.filter((p) => p.slice(-3) === ".js");

  const canCo = new Map();
  for (const p of tatCaTep) {
    const text = await bd.doc(p);
    for (const a of dsDataAct(text)) if (!canCo.has(a)) canCo.set(a, p);
  }
  ok(canCo.size >= 90, "đọc được danh sách data-act của app (" + canCo.size + ")");

  // Bảng toàn cục.
  const toanCuc = new Set();
  for (const f of TEP_BANG) for (const k of khoaTrongBang(await bd.doc(SU_KIEN + "/" + f))) toanCuc.add(k);
  ok(toanCuc.size >= 60, "bảng toàn cục có ≥ 60 hành động (đang " + toanCuc.size + ")");

  // Còn lại: bảng CỤC BỘ của từng màn (listener gắn trên thân modal, không phải document).
  const man = new Map();
  for (const p of jsTep) if (p.indexOf(SU_KIEN) !== 0) man.set(p, await bd.doc(p));

  const chuaXuLy = [];
  for (const [a, p] of canCo) {
    if (toanCuc.has(a)) continue;
    let co = false;
    for (const [, text] of man) if (coXuLy(text, a)) { co = true; break; }
    if (!co) chuaXuLy.push(a + " (khai ở " + p + ")");
  }
  eq(chuaXuLy.length, 0, "data-act không có hàm xử lý: " + chuaXuLy.join(", "));

  // Vế ngược lại: bảng toàn cục không được chứa hành động không hề xuất hiện trong mã.
  const la = [];
  for (const a of toanCuc) if (!canCo.has(a)) la.push(a);
  eq(la.length, 0, "hành động trong bảng toàn cục nhưng không có trong mã: " + la.join(", "));
});

// ------------------------------------------------------------------ luật 4: gộp bảng
test("gopBangSuKien: gộp đúng hợp của các bảng, không prototype, NÉM LỖI khi trùng tên", async () => {
  const bd = await boDoc();
  const SK = await import("../../src/ui/suKien/index.js");
  const D = { app: {} };

  const bang = SK.gopBangSuKien(D);
  const khoa = Object.keys(bang);
  ok(khoa.length >= 60, "bảng gộp có ≥ 60 hành động (đang " + khoa.length + ")");
  for (const k of khoa) eq(typeof bang[k], "function", "hành động " + k + " là một hàm");
  eq(Object.getPrototypeOf(bang), null, "bảng gộp KHÔNG có prototype (Object.create(null))");
  eq(bang.toString, undefined, "data-act=\"toString\" không chạm Object.prototype");
  eq(bang.constructor, undefined, "data-act=\"constructor\" không chạm Object.prototype");

  // Bảng gộp phải khớp CHÍNH XÁC hợp của các bảng con khai trong mã.
  if (bd) {
    const trongMa = new Set();
    for (const f of TEP_BANG) for (const k of khoaTrongBang(await bd.doc(SU_KIEN + "/" + f))) trongMa.add(k);
    const thua = khoa.filter((k) => !trongMa.has(k));
    const thieu = [...trongMa].filter((k) => khoa.indexOf(k) < 0);
    eq(thua.length, 0, "bảng gộp không có hành động lạ: " + thua.join(", "));
    eq(thieu.length, 0, "bảng gộp không thiếu hành động nào: " + thieu.join(", "));
  }

  // Gộp hai bảng giả trùng tên ⇒ phải ồn ào, không được im lặng ghi đè.
  let nem = null;
  try {
    SK.gopBangSuKien(D, [() => ({ "trung-ten": () => 1 }), () => ({ "trung-ten": () => 2 })]);
  } catch (e) {
    nem = String((e && e.message) || e);
  }
  ok(nem !== null, "gộp hai bảng trùng tên ⇒ ném lỗi");
  ok(nem !== null && nem.indexOf("trung-ten") >= 0, "thông báo lỗi nêu đúng tên hành động bị trùng");
  // Hai bảng KHÔNG trùng thì gộp bình thường.
  const hai = SK.gopBangSuKien(D, [() => ({ a: () => 1 }), () => ({ b: () => 2 })]);
  eq(Object.keys(hai).length, 2, "hai bảng không trùng gộp được");
  eq(hai.a(), 1, "hàm của bảng một");
  eq(hai.b(), 2, "hàm của bảng hai");
  ok(SK.BANG_CON.length === TEP_BANG.length, "BANG_CON có đúng " + TEP_BANG.length + " bảng con");
});

// ------------------------------------------------------------------ luật: cửa 18+ đi qua cong18
test("bảng sự kiện KHÔNG tự dựng lại logic tuổi — mọi đường 18+ đi qua hàm dùng chung", async () => {
  const bd = await boDoc();
  if (!bd) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  // `bangNguoiLon` chỉ được ĐIỀU HƯỚNG tới modal/hàm dùng chung của app; phán định tuổi nằm ở
  // `src/ui/cong18.js` + `src/store.js`. Chép lại câu chữ 18+ ở đây là tạo nguồn thứ hai.
  const nl = await bd.doc(SU_KIEN + "/nguoiLon.js");
  for (const c of ["Chưa xác nhận 18+", "Bạn đang bật giao kèo BDSM cho truyện này.", "không thể đánh dấu là người trưởng thành"]) {
    ok(nl.indexOf(c) < 0, "nguoiLon.js không chép lại câu chữ 18+: " + c);
  }
  ok(nl.indexOf("cong18.js" + NH) < 0, "nguoiLon.js không tự import cong18 (app.js vẫn là chỗ nối duy nhất)");
  ok(nl.indexOf("cong18.js" + NHAY) < 0, "nguoiLon.js không tự import cong18 (nháy đơn)");
  ok(nl.indexOf("open-giao-keo") >= 0, "nguoiLon.js vẫn xử lý nút mở Giao kèo");
  const gk = await bd.doc(SU_KIEN + "/chung.js");
  ok(gk.indexOf("story-menu") >= 0, "chung.js xử lý nút Tuỳ chọn truyện");
});
