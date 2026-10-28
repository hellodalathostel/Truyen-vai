// Truyện Vai — Giai đoạn 9 · Đợt 1: THẺ NHÂN VẬT (chara_card_v2 / v3 của SillyTavern).
//
// Vì sao có tệp này: thẻ nhân vật là định dạng trao đổi phổ biến nhất của cộng đồng nhập vai
// (SillyTavern, chub.ai, Pygmalion…). Nhập được thẻ nghĩa là người dùng mang được nhân vật của
// mình sang đây; xuất được thẻ nghĩa là họ không bị khoá trong app này.
//
// Ba luật của tệp:
//   1. THUẦN. Không import gì, không DOM, không kv, không `Date.now()`. Mọi thứ vào qua tham số.
//      Nhờ vậy tầng Node kiểm được cả phần đọc PNG mà không cần trình duyệt.
//   2. KHÔNG LÀM MẤT DỮ LIỆU. Thẻ gốc được giữ nguyên trong trường `theGoc` của nhân vật (trường
//      lạ không vào prompt — `buildContext` chỉ đọc các trường nó biết). Xuất lại thì lấy từ
//      `theGoc` những gì app không có chỗ dùng (`first_mes`, `system_prompt`,
//      `character_book`, `tags`, mọi trường lạ như `assets`…); `scenario` đi theo `ghiChu`
//      hiện tại của app, `creator_notes` gốc được giữ nguyên.
//   3. 18+ KHÔNG BAO GIỜ ĐƯỢC SUY RA TỪ THẺ. Thẻ ngoài không có khái niệm "người lớn"; `nguoiLon`
//      chỉ được khôi phục khi chính app này đã xuất nó ra (khối `extensions.truyenVai`), và vẫn
//      phải qua luật tuổi của `store.js` (tuổi số dưới 18 luôn thắng).

const CHU_KY_PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const KHOA_CHU = ["chara", "ccv3"]; // "chara" = v2 (và v1), "ccv3" = v3
const TOI_DA_JSON = 1024 * 1024; // thẻ thật hiếm khi quá vài chục KB

// ------------------------------------------------------------------ tiện ích byte
function laMang(u8) {
  return u8 && typeof u8.length === "number" && typeof u8 !== "string";
}

export function base64SangBytes(b64) {
  const s = String(b64 || "").replace(/[\s]+/g, "");
  if (!s) return new Uint8Array(0);
  const bang = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const ra = [];
  let dem = 0;
  let bit = 0;
  for (const ch of s) {
    if (ch === "=") break;
    const v = bang.indexOf(ch);
    if (v < 0) throw new Error("Chuỗi base64 hỏng.");
    dem = (dem << 6) | v;
    bit += 6;
    if (bit >= 8) {
      bit -= 8;
      ra.push((dem >> bit) & 0xff);
    }
  }
  return new Uint8Array(ra);
}

export function bytesSangBase64(u8) {
  const bang = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let ra = "";
  const a = u8 || new Uint8Array(0);
  for (let i = 0; i < a.length; i += 3) {
    const b0 = a[i];
    const b1 = i + 1 < a.length ? a[i + 1] : 0;
    const b2 = i + 2 < a.length ? a[i + 2] : 0;
    ra += bang[b0 >> 2] + bang[((b0 & 3) << 4) | (b1 >> 4)];
    ra += i + 1 < a.length ? bang[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    ra += i + 2 < a.length ? bang[b2 & 63] : "=";
  }
  return ra;
}

let BANG_CRC = null;
export function crc32(u8) {
  if (!BANG_CRC) {
    BANG_CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      BANG_CRC[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = BANG_CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function docU32(u8, at) {
  return ((u8[at] << 24) | (u8[at + 1] << 16) | (u8[at + 2] << 8) | u8[at + 3]) >>> 0;
}

function ghiU32(u8, at, v) {
  u8[at] = (v >>> 24) & 0xff;
  u8[at + 1] = (v >>> 16) & 0xff;
  u8[at + 2] = (v >>> 8) & 0xff;
  u8[at + 3] = v & 0xff;
}

function noi(a, b) {
  const ra = new Uint8Array(a.length + b.length);
  ra.set(a, 0);
  ra.set(b, a.length);
  return ra;
}

// ------------------------------------------------------------------ PNG: đọc khung
export function laPng(u8) {
  if (!laMang(u8) || u8.length < 33) return false;
  for (let i = 0; i < 8; i++) if (u8[i] !== CHU_KY_PNG[i]) return false;
  return true;
}

// Danh sách khung: { loai, dau, cuoi } với `dau` = vị trí trường độ dài, `cuoi` = sau CRC.
function khungPng(u8) {
  const ra = [];
  let at = 8;
  while (at + 12 <= u8.length) {
    const len = docU32(u8, at);
    const cuoi = at + 12 + len;
    if (cuoi > u8.length) break;
    ra.push({ loai: String.fromCharCode(u8[at + 4], u8[at + 5], u8[at + 6], u8[at + 7]), dau: at, cuoi, len, dataDau: at + 8 });
    at = cuoi;
    if (ra[ra.length - 1].loai === "IEND") break;
  }
  return ra;
}

function laChuKhung(loai) {
  return loai === "tEXt" || loai === "iTXt";
}

// Phần chữ của một khung tEXt/iTXt, trả { khoa, chuoi } hoặc null.
function docKhungChu(u8, k) {
  const d = u8.subarray(k.dataDau, k.dataDau + k.len);
  let i = 0;
  while (i < d.length && d[i] !== 0) i++;
  if (i >= d.length || i > 79) return null; // khoá PNG tối đa 79 byte
  let khoa = "";
  for (let k = 0; k < i; k++) khoa += String.fromCharCode(d[k]);
  khoa = khoa.toLowerCase();
  if (k.loai === "tEXt") {
    return { khoa, chuoi: new TextDecoder("utf-8").decode(d.subarray(i + 1)) };
  }
  // iTXt: cờ nén(1) + cách nén(1) + ngôn ngữ(0 kết) + khoá dịch(0 kết) + chữ
  let p = i + 1;
  const nen = d[p];
  p += 2;
  while (p < d.length && d[p] !== 0) p++;
  p++;
  while (p < d.length && d[p] !== 0) p++;
  p++;
  if (nen === 1) return { khoa, chuoi: "", nen: true };
  return { khoa, chuoi: new TextDecoder("utf-8").decode(d.subarray(p)) };
}

// ------------------------------------------------------------------ thẻ: đọc & chuẩn hoá
function chuoi(x) {
  return x === undefined || x === null ? "" : String(x);
}

function gon(x) {
  return chuoi(x).replace(/[\r]+/g, "").trim();
}

function cat(x, n) {
  const s = gon(x);
  return s.length > n ? s.slice(0, n).trim() : s;
}

function soNguyen(x) {
  const m = chuoi(x).match(/\d{1,3}/);
  return m ? Number(m[0]) : null;
}

// Thẻ nhân vật là một đối tượng JSON: v2/v3 bọc trong `{spec, spec_version, data}`, v1 thì
// phẳng. Hàm này chỉ LOOK, không ném lỗi.
export function laTheNhanVat(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const d = x.data && typeof x.data === "object" ? x.data : x;
  return !!(gon(d.name) || gon(d.description) || gon(d.first_mes) || gon(d.mes_example));
}

// Chuẩn hoá về MỘT hình dạng `{spec, spec_version, data}` để phần còn lại khỏi phải biết v1/v2/v3.
export function chuanThe(obj) {
  if (!laTheNhanVat(obj)) throw new Error("Tệp này không phải thẻ nhân vật (thiếu tên/mô tả).");
  const laV2 = obj.data && typeof obj.data === "object" && !Array.isArray(obj.data);
  if (laV2) {
    return {
      spec: gon(obj.spec) || "chara_card_v2",
      spec_version: gon(obj.spec_version) || "2.0",
      data: obj.data,
    };
  }
  return { spec: "chara_card_v1", spec_version: "1.0", data: obj };
}

export function docTheTuChuoi(text) {
  const t = gon(text);
  if (!t) throw new Error("Thẻ rỗng.");
  if (t.length > TOI_DA_JSON) throw new Error("Thẻ quá lớn (hơn 1 MB) — không đọc.");
  let obj;
  try {
    obj = JSON.parse(t);
  } catch (e) {
    throw new Error("Không đọc được JSON của thẻ: " + ((e && e.message) || e));
  }
  return chuanThe(obj);
}

// Đọc thẻ nhúng trong PNG: khối chữ `chara` (v2/v1) hoặc `ccv3` (v3). Ưu tiên `ccv3`.
export function docTheTuPng(u8) {
  if (!laPng(u8)) throw new Error("Tệp này không phải ảnh PNG.");
  const ung = [];
  for (const k of khungPng(u8)) {
    if (!laChuKhung(k.loai)) continue;
    const c = docKhungChu(u8, k);
    if (!c || KHOA_CHU.indexOf(c.khoa) < 0) continue;
    ung.push(c);
  }
  if (!ung.length) throw new Error("PNG này không có thẻ nhân vật (thiếu khối chữ “chara”).");
  // ccv3 trước; trong cùng một khoá thì lấy khối ĐẦU (đúng quy ước của SillyTavern).
  ung.sort((a, b) => KHOA_CHU.indexOf(b.khoa) - KHOA_CHU.indexOf(a.khoa));
  let loi = "";
  for (const c of ung) {
    if (c.nen) {
      loi = "Thẻ trong PNG bị nén (iTXt) — chưa đọc được.";
      continue;
    }
    for (const cach of ["base64", "tho"]) {
      try {
        const text =
          cach === "base64"
            ? new TextDecoder("utf-8").decode(base64SangBytes(c.chuoi))
            : c.chuoi;
        return docTheTuChuoi(text);
      } catch (e) {
        loi = (e && e.message) || String(e);
      }
    }
  }
  throw new Error("Không đọc được thẻ trong PNG: " + loi);
}

// Cửa vào duy nhất cho tầng giao diện: nhận mọi thứ người dùng có thể đưa vào.
export function docTheNguon(nguon) {
  if (nguon && typeof nguon === "object" && !laMang(nguon)) return chuanThe(nguon);
  if (typeof nguon === "string") {
    const t = nguon.trim();
    const dau = "data:";
    if (t.slice(0, dau.length).toLowerCase() === dau) {
      const phay = t.indexOf(",");
      if (phay < 0) throw new Error("Chuỗi data URL hỏng.");
      if (t.slice(0, phay).indexOf("base64") < 0) throw new Error("Chỉ nhận data URL dạng base64.");
      return docTheNguon(base64SangBytes(t.slice(phay + 1)));
    }
    return docTheTuChuoi(t);
  }
  if (laMang(nguon)) {
    const u8 = nguon instanceof Uint8Array ? nguon : new Uint8Array(nguon);
    return laPng(u8) ? docTheTuPng(u8) : docTheTuChuoi(new TextDecoder("utf-8").decode(u8));
  }
  throw new Error("Không có nội dung thẻ để đọc.");
}

// Làm sạch khối ví dụ lời thoại: bỏ mốc `<START>`, thay macro bằng chữ thật.
function lamSachViDu(x, ten) {
  const nv = ten || "nhân vật";
  return chuoi(x)
    .split("\n")
    .map((dong) => dong.replace(/<START>/gi, "").replace(/\{\{char\}\}/gi, nv).replace(/\{\{user\}\}/gi, "người chơi"))
    .map((dong) => dong.trim())
    .filter((dong) => dong !== "")
    .join("\n");
}

// Thẻ ⇒ các trường của NHÂN VẬT trong app. `goc` = bản nháp hiện có (giữ id/màu/emoji…).
// Chỉ trả về những trường ĐỌC TỪ THẺ; phần khác của `goc` giữ nguyên.
export function nhanVatTuThe(the, goc) {
  const t = the && the.data ? the : chuanThe(the);
  const d = t.data || {};
  const ext = (d.extensions && d.extensions.truyenVai) || {};
  const ten = cat(d.name, 120);
  const ra = Object.assign({}, goc || {});
  if (ten) ra.ten = ten;
  ra.moTa = cat(d.description, 20000);
  ra.tinhCach = cat(d.personality, 8000);
  // `mes_example` là ví dụ lời thoại ⇒ đúng nghĩa "cách nói" của app. `scenario` là bối cảnh
  // luôn đúng của nhân vật ⇒ `ghiChu`. Hai trường còn lại của app không có chỗ tương ứng.
  ra.cachNoi = cat(lamSachViDu(d.mes_example, ten), 4000);
  // Trường riêng của app: chỉ khôi phục khi THẺ DO APP NÀY XUẤT (khối extensions.truyenVai).
  const rieng = ["vaiTro", "danhXung", "vaiBdsm", "kinhNghiem", "phongCach", "khauVi", "gioiHan", "gioiHanCung", "luatRieng", "chamSocSau", "tinHieuRieng"];
  for (const k of rieng) if (gon(ext[k])) ra[k] = cat(ext[k], 2000);
  // `ghiChu` đi ra ngoài bằng `scenario` (xem `theTuNhanVat`), nên khi thẻ CÓ khối riêng của
  // app thì khối đó thắng; thẻ ngoài chỉ có `scenario` thì lấy `scenario`.
  ra.ghiChu = cat(gon(ext.ghiChu) !== "" ? ext.ghiChu : d.scenario, 2000);
  if (ext.tuoi !== undefined && ext.tuoi !== null) {
    const n = soNguyen(ext.tuoi);
    if (n !== null) ra.tuoi = String(n);
  }
  // Cờ 18+ KHÔNG được suy ra từ thẻ ngoài; chỉ đọc đúng cờ app đã ghi ra (chỗ gọi còn phải
  // cho qua `laNguoiLon` để luật tuổi của app thắng).
  ra.nguoiLon = ext.nguoiLon === true;
  ra.theGoc = { spec: t.spec, spec_version: t.spec_version, data: saoChep(d) };
  return ra;
}

// Bản sao sâu: nhân vật phải sống ĐỘC LẬP với đối tượng thẻ mà người gọi còn cầm (sửa nhân vật
// không được sửa ngược thẻ gốc).
export function saoChep(x) {
  try {
    return JSON.parse(JSON.stringify(x));
  } catch (e) {
    const ra = {};
    for (const k in x || {}) ra[k] = x[k];
    return ra;
  }
}

// ------------------------------------------------------------------ nhân vật ⇒ thẻ
// Xuất ra chara_card_v2 (bản mọi công cụ đều đọc). Những gì app không có chỗ dùng
// (`first_mes`, `system_prompt`, `character_book`, `tags`…) lấy lại từ `theGoc` nếu có.
// Hai luật bảo toàn (hồi quy Đợt 1, theo yêu cầu của chủ dự án):
//   1. `scenario` đi theo `ghiChu` HIỆN TẠI của app — sửa ghiChu rồi xuất thì trường chuẩn
//      cũng đổi; `ghiChu` rỗng ⇒ `scenario` rỗng (không dựng lại chữ đã xoá).
//   2. Mọi trường ngoài danh sách dựng sẵn (`assets`, `depth_prompt`…) được giữ nguyên từ
//      thẻ gốc; `creator_notes` gốc được giữ, tem xuất chỉ đóng MỘT lần (xuất→nhập→xuất
//      không dài thêm).
export function theTuNhanVat(nv) {
  const c = nv || {};
  const goc = (c.theGoc && c.theGoc.data) || {};
  // Bắt đầu từ BẢN SAO của thẻ gốc để không rơi trường lạ, rồi đắp các trường app quản lý
  // lên trên.
  const data = Object.assign(saoChep(goc), {
    name: gon(c.ten),
    description: chuoi(c.moTa),
    personality: chuoi(c.tinhCach),
    scenario: chuoi(c.ghiChu),
    first_mes: chuoi(goc.first_mes),
    mes_example: chuoi(c.cachNoi),
    creator_notes: temXuat(goc, c),
    system_prompt: chuoi(goc.system_prompt),
    post_history_instructions: chuoi(goc.post_history_instructions),
    alternate_greetings: Array.isArray(goc.alternate_greetings) ? goc.alternate_greetings.slice() : [],
    tags: Array.isArray(goc.tags) ? goc.tags.slice() : [],
    creator: chuoi(goc.creator),
    character_version: chuoi(goc.character_version),
    extensions: Object.assign({}, goc.extensions && typeof goc.extensions === "object" ? goc.extensions : {}, {
      truyenVai: {
        phienBan: 1,
        tuoi: chuoi(c.tuoi),
        nguoiLon: c.nguoiLon === true,
        vaiTro: chuoi(c.vaiTro),
        ghiChu: chuoi(c.ghiChu),
        danhXung: chuoi(c.danhXung),
        vaiBdsm: chuoi(c.vaiBdsm),
        kinhNghiem: chuoi(c.kinhNghiem),
        phongCach: chuoi(c.phongCach),
        khauVi: chuoi(c.khauVi),
        gioiHan: chuoi(c.gioiHan),
        gioiHanCung: chuoi(c.gioiHanCung),
        luatRieng: chuoi(c.luatRieng),
        chamSocSau: chuoi(c.chamSocSau),
        tinHieuRieng: chuoi(c.tinHieuRieng),
      },
    }),
  });
  // Thẻ gốc không có sổ tri thức thì đừng bịa ra `null` (bản sao giữ nguyên hình dạng gốc).
  if (!goc.character_book) delete data.character_book;
  return { spec: "chara_card_v2", spec_version: "2.0", data };
}

// Tem "Xuất từ Truyện Vai.": giữ nguyên ghi chú gốc của tác giả, chỉ đóng tem MỘT lần.
function temXuat(goc, c) {
  const tem = "Xuất từ Truyện Vai." + (c.nguoiLon === true ? " Nhân vật người lớn (18+)." : "");
  const cu = chuoi(goc.creator_notes);
  if (!cu) return tem;
  return cu.indexOf("Xuất từ Truyện Vai.") >= 0 ? cu : cu + "\n" + tem;
}

function khungChu(loai, duLieu) {
  const ra = new Uint8Array(12 + duLieu.length);
  ghiU32(ra, 0, duLieu.length);
  for (let i = 0; i < 4; i++) ra[4 + i] = loai.charCodeAt(i);
  ra.set(duLieu, 8);
  ghiU32(ra, 8 + duLieu.length, crc32(ra.subarray(4, 8 + duLieu.length)));
  return ra;
}

// Nhúng thẻ vào ảnh đại diện PNG (cách SillyTavern/chub.ai phân phối thẻ). Khung `chara` cũ
// bị gỡ trước khi chèn để trình đọc không gặp hai thẻ trong một ảnh.
export function pngNhungThe(png, the) {
  const u8 = png instanceof Uint8Array ? png : new Uint8Array(png);
  if (!laPng(u8)) throw new Error("Ảnh đại diện không phải PNG nên không nhúng được thẻ.");
  const ds = khungPng(u8);
  if (!ds.length || ds[0].loai !== "IHDR") throw new Error("Ảnh PNG hỏng (thiếu khối IHDR).");
  const giu = [];
  for (const k of ds) {
    if (laChuKhung(k.loai)) {
      const c = docKhungChu(u8, k);
      if (c && KHOA_CHU.indexOf(c.khoa) >= 0) continue; // bỏ thẻ cũ
    }
    giu.push(k);
  }
  const json = JSON.stringify(the);
  const b64 = bytesSangBase64(new TextEncoder().encode(json));
  const noiDung = new TextEncoder().encode("chara"); // khoá
  const duLieu = new Uint8Array(noiDung.length + 1 + b64.length);
  duLieu.set(noiDung, 0);
  duLieu[noiDung.length] = 0;
  for (let i = 0; i < b64.length; i++) duLieu[noiDung.length + 1 + i] = b64.charCodeAt(i) & 0xff;
  const moi = khungChu("tEXt", duLieu);
  // Chèn ngay sau IHDR (khung đầu tiên), phần còn lại ráp lại theo danh sách khung ĐÃ LỌC —
  // ráp theo khoảng byte gốc là thẻ cũ vẫn nằm trong ảnh.
  const phan = [u8.subarray(0, giu[0].cuoi), moi];
  for (let i = 1; i < giu.length; i++) phan.push(u8.subarray(giu[i].dau, giu[i].cuoi));
  let tong = 0;
  for (const p of phan) tong += p.length;
  const ra = new Uint8Array(tong);
  let at = 0;
  for (const p of phan) {
    ra.set(p, at);
    at += p.length;
  }
  return ra;
}

export function tenTepThe(nv, duoi) {
  const raw = gon(nv && nv.ten) || "nhan-vat";
  let ra = "";
  for (const ch of raw) {
    if (/[\w\u00C0-\u024F\u1EA0-\u1EF9.-]/i.test(ch)) ra += ch;
    else if (ra.slice(-1) !== "-") ra += "-";
  }
  ra = ra.replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 60);
  return (ra || "nhan-vat") + "-the." + (duoi || "json");
}
