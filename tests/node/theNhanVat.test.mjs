// Truyện Vai — tầng kiểm thử Node: THẺ NHÂN VẬT (Giai đoạn 9, Đợt 1).
//
// Tệp này ghim năm việc:
//   (1) tiện ích byte dùng cho PNG (CRC32, base64) — có mốc chuẩn độc lập;
//   (2) đọc thẻ từ JSON: v1 phẳng, v2/v3 bọc `data`, và mọi đầu vào hỏng đều ra THÔNG BÁO
//       tiếng Việt chứ không phải TypeError;
//   (3) ánh xạ thẻ ⇒ nhân vật: đúng trường nào vào đâu, macro được thay, KHÔNG suy ra 18+;
//   (4) xuất nhân vật ⇒ thẻ v2: giữ được những gì app không có chỗ dùng (qua `theGoc`), và
//       đi vòng xuất→nhập không mất trường của app; `scenario` đi theo `ghiChu` hiện tại,
//       `creator_notes` gốc được giữ (tem xuất một lần), trường lạ (`assets`…) được giữ;
//   (5) thẻ nhúng trong PNG: đọc được `chara`/`ccv3`, nhúng lại thì THAY thẻ cũ (không sinh
//       hai thẻ trong một ảnh), các khung khác giữ nguyên từng byte.
//
// Mọi dữ liệu là HƯ CẤU. Không DOM, không kv, không gọi AI. PNG dựng tại chỗ bằng byte thật.
//
// Ghi chú: tệp này không dùng dấu gạch chéo ngược (quy ước của bộ kiểm thử).

import { test, ok, eq, eqSau } from "../lib/h.js";
import {
  laPng, crc32, base64SangBytes, bytesSangBase64,
  laTheNhanVat, chuanThe, docTheTuChuoi, docTheTuPng, docTheNguon,
  nhanVatTuThe, theTuNhanVat, pngNhungThe, tenTepThe,
} from "../../src/theNhanVat.js";

const NL = String.fromCharCode(10);
const TE = new TextEncoder();
const TD = new TextDecoder();

// ------------------------------------------------------------------ tiện ích byte của test
function noi() {
  const ds = [];
  let n = 0;
  for (let i = 0; i < arguments.length; i++) {
    ds.push(arguments[i]);
    n += arguments[i].length;
  }
  const ra = new Uint8Array(n);
  let at = 0;
  for (const d of ds) {
    ra.set(d, at);
    at += d.length;
  }
  return ra;
}

function ghi32(u8, at, v) {
  u8[at] = (v >>> 24) & 255;
  u8[at + 1] = (v >>> 16) & 255;
  u8[at + 2] = (v >>> 8) & 255;
  u8[at + 3] = v & 255;
}

// Khung PNG dựng ĐỘC LẬP với mã đang kiểm (trừ CRC32, và CRC32 có mốc chuẩn riêng ở ca 1).
function khung(loai, duLieu) {
  const ra = new Uint8Array(12 + duLieu.length);
  ghi32(ra, 0, duLieu.length);
  for (let i = 0; i < 4; i++) ra[4 + i] = loai.charCodeAt(i);
  ra.set(duLieu, 8);
  ghi32(ra, 8 + duLieu.length, crc32(ra.subarray(4, 8 + duLieu.length)));
  return ra;
}

const CHU_KY = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function ihdr() {
  const d = new Uint8Array(13);
  ghi32(d, 0, 2); // rộng
  ghi32(d, 4, 2); // cao
  d[8] = 8; // bit depth
  d[9] = 6; // RGBA
  return d;
}

// PNG 2x2 tối giản: chữ ký + IHDR + IDAT + IEND. Đủ để mọi trình đọc khung đi qua.
function pngGoc() {
  return noi(CHU_KY, khung("IHDR", ihdr()), khung("IDAT", new Uint8Array([1, 2, 3, 4])), khung("IEND", new Uint8Array(0)));
}

function khungChu(loai, khoa, chuoi) {
  const k = TE.encode(khoa);
  const t = TE.encode(chuoi);
  if (loai === "tEXt") return khung("tEXt", noi(k, new Uint8Array([0]), t));
  // iTXt KHÔNG nén: khoá 0 cờ(0) cách(0) ngôn ngữ 0 khoá-dịch 0 chữ
  return khung("iTXt", noi(k, new Uint8Array([0, 0, 0, 0, 0]), t));
}

function pngCoThe(loai, khoa, the) {
  const b64 = bytesSangBase64(TE.encode(JSON.stringify(the)));
  return noi(CHU_KY, khung("IHDR", ihdr()), khungChu(loai, khoa, b64), khung("IDAT", new Uint8Array([9])), khung("IEND", new Uint8Array(0)));
}

// Các khung của một PNG: [loại, số byte] — đọc tay, không dùng hàm của mã đang kiểm.
function dsKhung(u8) {
  const ra = [];
  let at = 8;
  while (at + 12 <= u8.length) {
    const len = ((u8[at] << 24) | (u8[at + 1] << 16) | (u8[at + 2] << 8) | u8[at + 3]) >>> 0;
    const loai = String.fromCharCode(u8[at + 4], u8[at + 5], u8[at + 6], u8[at + 7]);
    ra.push({ loai, len, dau: at, cuoi: at + 12 + len });
    at += 12 + len;
    if (loai === "IEND") break;
  }
  return ra;
}

// ------------------------------------------------------------------ thẻ mẫu
function theV2(ghiDe) {
  return Object.assign(
    {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: "Zz Miêu",
        description: "Một người giữ đèn biển, tóc bạc vì muối.",
        personality: "Lầm lì, kỹ tính, thương người mà không nói ra.",
        scenario: "Ngọn hải đăng đã tắt ba đêm.",
        first_mes: "Cậu lên đây giờ này làm gì?",
        mes_example: "<START>" + NL + "{{char}}: Đứng xa lan can." + NL + "{{user}}: Tôi chỉ muốn nhìn." + NL + "<START>" + NL + "{{char}}: Gió đêm nay độc lắm.",
        system_prompt: "",
        creator_notes: "Thẻ mẫu để kiểm thử.",
        tags: ["zz-the-thu"],
        creator: "zz",
        character_version: "1.0",
        alternate_greetings: ["Chào.", "Lại là cậu."],
        character_book: { name: "Sổ của Miêu", entries: [{ keys: ["đèn"], content: "Ngọn đèn tắt từ đêm thứ ba." }] },
        extensions: { zz: true },
      },
    },
    ghiDe || {}
  );
}

// ================================================================== (1) tiện ích byte
test("crc32 — mốc chuẩn của PNG/zlib", () => {
  // Giá trị kiểm tra công bố của CRC-32/ISO-HDLC cho chuỗi 123456789.
  eq(crc32(TE.encode("123456789")), 0xcbf43926, "CRC32(123456789)");
  eq(crc32(new Uint8Array(0)), 0, "CRC32 của chuỗi rỗng");
  eq(crc32(TE.encode("a")), 0xe8b7be43, "CRC32(a)");
});

test("base64 — đi vòng không mất byte, đúng cả ba độ dài đệm", () => {
  for (const n of [0, 1, 2, 3, 4, 5]) {
    const goc = new Uint8Array(n);
    for (let i = 0; i < n; i++) goc[i] = (i * 37 + 11) & 255;
    eqSau(base64SangBytes(bytesSangBase64(goc)), goc, "base64 đi vòng, độ dài " + n);
  }
  const chu = "Thẻ nhân vật — tiếng Việt có dấu";
  eq(TD.decode(base64SangBytes(bytesSangBase64(TE.encode(chu)))), chu, "base64 giữ nguyên UTF-8");
  let nem = false;
  try {
    base64SangBytes("@@@");
  } catch (e) {
    nem = true;
  }
  ok(nem, "base64 hỏng thì ném lỗi chứ không trả rác");
});

test("laPng — nhận đúng chữ ký, từ chối mọi thứ khác", () => {
  ok(laPng(pngGoc()), "PNG dựng tại chỗ được nhận");
  ok(!laPng(TE.encode("không phải png")), "chuỗi thường không phải PNG");
  ok(!laPng(new Uint8Array(0)), "mảng rỗng không phải PNG");
  ok(!laPng(null) && !laPng(undefined) && !laPng("abc"), "đầu vào không phải mảng cũng không ném");
  const hong = pngGoc().slice();
  hong[1] = 0;
  ok(!laPng(hong), "sai một byte chữ ký là hỏng");
});

// ================================================================== (2) đọc thẻ
test("chuanThe — v1 phẳng và v2/v3 bọc data đều về MỘT hình dạng", () => {
  const v2 = theV2();
  const a = chuanThe(v2);
  eq(a.spec, "chara_card_v2", "giữ spec");
  eq(a.spec_version, "2.0", "giữ spec_version");
  eq(a.data.name, "Zz Miêu", "data giữ nguyên");

  const v1 = { name: "Zz Cũ", description: "Thẻ v1.", personality: "Im lặng." };
  const b = chuanThe(v1);
  eq(b.spec, "chara_card_v1", "thẻ phẳng được nhận là v1");
  eq(b.data.name, "Zz Cũ", "v1 bọc vào data");

  const v3 = theV2({ spec: "chara_card_v3", spec_version: "3.0" });
  eq(chuanThe(v3).spec, "chara_card_v3", "v3 được giữ nguyên nhãn");

  ok(laTheNhanVat(v2) && laTheNhanVat(v1), "cả hai đều là thẻ");
  ok(!laTheNhanVat(null) && !laTheNhanVat([]) && !laTheNhanVat({}) && !laTheNhanVat({ a: 1 }), "rác không phải thẻ");
  ok(!laTheNhanVat({ data: { name: "" } }), "tên rỗng vẫn không phải thẻ");
});

test("docTheTuChuoi — mọi đầu vào hỏng ra lỗi TIẾNG VIỆT, không phải TypeError", () => {
  const hong = [
    ["", "Thẻ rỗng"],
    ["   ", "Thẻ rỗng"],
    ["{không phải json", "Không đọc được JSON"],
    ["[]", "không phải thẻ nhân vật"],
    ["42", "không phải thẻ nhân vật"],
    ['{"a":1}', "không phải thẻ nhân vật"],
  ];
  for (const [vao, manh] of hong) {
    let loi = null;
    try {
      docTheTuChuoi(vao);
    } catch (e) {
      loi = e;
    }
    ok(loi instanceof Error, "ném Error cho đầu vào: " + JSON.stringify(vao).slice(0, 24));
    ok(String(loi && loi.message).indexOf(manh) >= 0, "lời báo khớp (“" + manh + "”)");
  }
  let to = null;
  try {
    docTheTuChuoi("{");
  } catch (e) {
    to = e;
  }
  ok(to && to.message.indexOf("JSON") >= 0, "JSON hỏng nói rõ là JSON");
});

test("docTheNguon — nhận chuỗi, byte, đối tượng và data URL", () => {
  const the = theV2();
  const json = JSON.stringify(the);
  eq(docTheNguon(json).data.name, "Zz Miêu", "chuỗi JSON");
  eq(docTheNguon(TE.encode(json)).data.name, "Zz Miêu", "byte UTF-8 của JSON");
  eq(docTheNguon(the).data.name, "Zz Miêu", "đối tượng đã parse");
  const dataUrl = "data:application/json;base64," + bytesSangBase64(TE.encode(json));
  eq(docTheNguon(dataUrl).data.name, "Zz Miêu", "data URL base64");
  eq(docTheNguon(pngCoThe("tEXt", "chara", the)).data.name, "Zz Miêu", "byte PNG");
  for (const rac of [null, undefined, 7, true]) {
    let nem = false;
    try {
      docTheNguon(rac);
    } catch (e) {
      nem = e instanceof Error;
    }
    ok(nem, "rác " + String(rac) + " ⇒ Error");
  }
});

test("docTheTuPng — chara (v2), ccv3 (v3), iTXt và ưu tiên ccv3", () => {
  const v2 = theV2();
  eq(docTheTuPng(pngCoThe("tEXt", "chara", v2)).data.name, "Zz Miêu", "khối tEXt chara");
  const v3 = theV2({ spec: "chara_card_v3", spec_version: "3.0" });
  eq(docTheTuPng(pngCoThe("tEXt", "ccv3", v3)).spec, "chara_card_v3", "khối ccv3");
  eq(docTheTuPng(pngCoThe("iTXt", "chara", v2)).data.name, "Zz Miêu", "khối iTXt không nén");

  // Ảnh có CẢ hai khối: phải đọc bản v3.
  const ca2 = noi(CHU_KY, khung("IHDR", ihdr()), khungChu("tEXt", "chara", bytesSangBase64(TE.encode(JSON.stringify(v2)))),
    khungChu("tEXt", "ccv3", bytesSangBase64(TE.encode(JSON.stringify(v3)))), khung("IEND", new Uint8Array(0)));
  eq(docTheTuPng(ca2).spec, "chara_card_v3", "có cả hai khối ⇒ chọn ccv3");

  // Ảnh không có thẻ.
  let loi = null;
  try {
    docTheTuPng(pngGoc());
  } catch (e) {
    loi = e;
  }
  ok(loi && loi.message.indexOf("không có thẻ nhân vật") >= 0, "PNG không có thẻ ⇒ nói rõ");

  // iTXt bị nén: chưa hỗ trợ, phải báo rõ chứ không trả rỗng.
  const nen = noi(CHU_KY, khung("IHDR", ihdr()),
    khung("iTXt", noi(TE.encode("chara"), new Uint8Array([0, 1, 0, 0, 0]), TE.encode("rác"))),
    khung("IEND", new Uint8Array(0)));
  let n2 = null;
  try {
    docTheTuPng(nen);
  } catch (e) {
    n2 = e;
  }
  ok(n2 instanceof Error, "iTXt nén ⇒ lỗi");
});

// ================================================================== (3) thẻ ⇒ nhân vật
test("nhanVatTuThe — ánh xạ trường, làm sạch macro, giữ bản nháp cũ", () => {
  const goc = { id: "nv_zzthe", emoji: "✦", mau: "#123456", anh: "", avatarStyle: "chu" };
  const nv = nhanVatTuThe(theV2(), goc);
  eq(nv.ten, "Zz Miêu", "name ⇒ ten");
  ok(nv.moTa.indexOf("giữ đèn biển") >= 0, "description ⇒ moTa");
  ok(nv.tinhCach.indexOf("Lầm lì") >= 0, "personality ⇒ tinhCach");
  ok(nv.ghiChu.indexOf("tắt ba đêm") >= 0, "scenario ⇒ ghiChu");
  ok(nv.cachNoi.indexOf("<START>") < 0, "bỏ mốc <START>");
  ok(nv.cachNoi.indexOf("Zz Miêu: Đứng xa lan can.") >= 0, "thay {{char}} bằng tên nhân vật");
  ok(nv.cachNoi.indexOf("người chơi: Tôi chỉ muốn nhìn.") >= 0, "thay {{user}} bằng chữ trung tính");
  eq(nv.id, "nv_zzthe", "giữ id của bản nháp");
  eq(nv.emoji, "✦", "giữ emoji");
  eq(nv.mau, "#123456", "giữ màu");
  eq(nv.nguoiLon, false, "thẻ ngoài KHÔNG bao giờ tự thành người lớn");
  eq(nv.tuoi, undefined, "thẻ ngoài không có tuổi");
});

test("nhanVatTuThe — 18+ chỉ đến từ khối extensions của CHÍNH app", () => {
  // Thẻ ngoài có đủ dấu hiệu “người lớn” nhưng không có khối của app ⇒ vẫn KHÔNG bật cờ.
  const ngoai = theV2();
  ngoai.data.tags = ["nsfw", "18+", "adult"];
  ngoai.data.creator_notes = "Người lớn. Adult content. NSFW.";
  ngoai.data.extensions = { depth_prompt: "adult" };
  eq(nhanVatTuThe(ngoai, {}).nguoiLon, false, "dấu hiệu trong thẻ ngoài không bật cờ 18+");

  // Thẻ do app xuất: có khối riêng ⇒ khôi phục tuổi + cờ.
  const cua = theV2();
  cua.data.extensions = { truyenVai: { phienBan: 1, tuoi: "34", nguoiLon: true, vaiTro: "Người giữ đèn" } };
  const nv = nhanVatTuThe(cua, {});
  eq(nv.tuoi, "34", "khôi phục tuổi");
  eq(nv.nguoiLon, true, "khôi phục cờ 18+ của app");
  eq(nv.vaiTro, "Người giữ đèn", "khôi phục vai trò");
});

test("nhanVatTuThe — giữ nguyên thẻ gốc (không làm mất dữ liệu)", () => {
  const the = theV2();
  const nv = nhanVatTuThe(the, {});
  eq(nv.theGoc.spec, "chara_card_v2", "ghi lại spec");
  eq(nv.theGoc.data.first_mes, "Cậu lên đây giờ này làm gì?", "giữ first_mes");
  eqSau(nv.theGoc.data.alternate_greetings, ["Chào.", "Lại là cậu."], "giữ lời chào khác");
  eq(nv.theGoc.data.character_book.name, "Sổ của Miêu", "giữ sổ tri thức kèm thẻ");
  eq(nv.theGoc.data.extensions.zz, true, "giữ extension lạ");
  // theGoc là BẢN SAO: sửa nhân vật không được sửa ngược thẻ gốc của chính nó.
  nv.theGoc.data.name = "Đổi rồi";
  eq(the.data.name, "Zz Miêu", "không sửa ngược vào đối tượng thẻ ban đầu");
});

test("nhanVatTuThe — thẻ tối giản vẫn ra nhân vật dùng được", () => {
  const nv = nhanVatTuThe({ name: "Zz Trống", description: "" }, {});
  eq(nv.ten, "Zz Trống", "có tên là đủ");
  eq(nv.moTa, "", "mô tả rỗng");
  eq(nv.cachNoi, "", "cách nói rỗng");
  eq(nv.ghiChu, "", "ghi chú rỗng");
  eq(nv.theGoc.spec, "chara_card_v1", "thẻ phẳng ⇒ v1");
});

// ================================================================== (4) nhân vật ⇒ thẻ
test("theTuNhanVat — ra chara_card_v2 hợp lệ", () => {
  const c = { ten: "Zz Miêu", moTa: "Mô tả.", tinhCach: "Lầm lì.", cachNoi: "Nói ngắn.", tuoi: "34", nguoiLon: true, vaiTro: "Người giữ đèn" };
  const the = theTuNhanVat(c);
  eq(the.spec, "chara_card_v2", "đúng spec");
  eq(the.spec_version, "2.0", "đúng phiên bản");
  eq(the.data.name, "Zz Miêu", "ten ⇒ name");
  eq(the.data.description, "Mô tả.", "moTa ⇒ description");
  eq(the.data.personality, "Lầm lì.", "tinhCach ⇒ personality");
  eq(the.data.mes_example, "Nói ngắn.", "cachNoi ⇒ mes_example");
  ok(the.data.creator_notes.indexOf("18+") >= 0, "ghi chú nói rõ nhân vật người lớn");
  eq(the.data.extensions.truyenVai.tuoi, "34", "tuổi vào khối riêng");
  eq(the.data.extensions.truyenVai.nguoiLon, true, "cờ 18+ vào khối riêng");
  eq(the.data.extensions.truyenVai.vaiTro, "Người giữ đèn", "vai trò vào khối riêng");
  ok(laTheNhanVat(the), "thẻ xuất ra đọc lại được");
});

test("theTuNhanVat — lấy lại từ theGoc những gì app không có chỗ dùng", () => {
  const nv = nhanVatTuThe(theV2(), {});
  nv.ten = "Zz Miêu Đổi Tên";
  const the = theTuNhanVat(nv);
  eq(the.data.first_mes, "Cậu lên đây giờ này làm gì?", "giữ first_mes từ thẻ gốc");
  eq(the.data.scenario, "Ngọn hải đăng đã tắt ba đêm.", "giữ scenario");
  eqSau(the.data.alternate_greetings, ["Chào.", "Lại là cậu."], "giữ lời chào khác");
  eq(the.data.character_book.name, "Sổ của Miêu", "giữ sổ tri thức");
  eqSau(the.data.tags, ["zz-the-thu"], "giữ tags");
  eq(the.data.creator, "zz", "giữ creator");
  eq(the.data.extensions.zz, true, "giữ extension lạ của thẻ gốc");
  eq(the.data.name, "Zz Miêu Đổi Tên", "tên mới thắng");
});

test("theTuNhanVat — scenario đi theo ghiChu HIỆN TẠI, không giữ bản cũ của thẻ gốc", () => {
  const nv = nhanVatTuThe(theV2(), {}); // ghiChu = scenario gốc
  nv.ghiChu = "Ghi chú mới.";
  eq(theTuNhanVat(nv).data.scenario, "Ghi chú mới.", "sửa ghiChu rồi xuất ⇒ scenario mới");
  nv.ghiChu = "";
  eq(theTuNhanVat(nv).data.scenario, "", "xoá ghiChu ⇒ scenario rỗng, không dựng lại chữ cũ");
});

test("theTuNhanVat — giữ creator_notes gốc, tem xuất chỉ đóng một lần", () => {
  const nv = nhanVatTuThe(theV2(), {}); // thẻ mẫu có creator_notes riêng
  const t1 = theTuNhanVat(nv);
  ok(t1.data.creator_notes.indexOf("Thẻ mẫu để kiểm thử.") === 0, "giữ nguyên ghi chú gốc");
  ok(t1.data.creator_notes.indexOf("Xuất từ Truyện Vai.") >= 0, "có tem xuất");
  const dem = (s) => s.split("Xuất từ Truyện Vai.").length - 1;
  eq(dem(t1.data.creator_notes), 1, "tem đóng đúng một lần");
  // Đi vòng xuất→nhập→xuất: tem không dài thêm, ghi chú gốc còn nguyên.
  const nv2 = nhanVatTuThe(chuanThe(t1), {});
  eq(theTuNhanVat(nv2).data.creator_notes, t1.data.creator_notes, "xuất lần hai giống hệt lần một");
});

test("theTuNhanVat — giữ trường lạ ngoài danh sách dựng sẵn (assets…)", () => {
  const the = theV2();
  the.data.assets = [{ type: "icon", uri: "embeded://goc" }];
  the.data.talkativeness = 0.7;
  const ra = theTuNhanVat(nhanVatTuThe(the, {}));
  eqSau(ra.data.assets, [{ type: "icon", uri: "embeded://goc" }], "giữ assets");
  eq(ra.data.talkativeness, 0.7, "giữ trường số lạ");
  eq(ra.data.name, "Zz Miêu", "trường chuẩn vẫn đúng");
  // Sửa nhân vật không được sửa ngược vào thẻ gốc (bản sao sâu cả hai chiều).
  ra.data.assets[0].uri = "đổi";
  eq(the.data.assets[0].uri, "embeded://goc", "không sửa ngược vào thẻ gốc");
});

test("xuất rồi nhập — không mất trường của app", () => {
  const goc = {
    ten: "Zz Vòng", moTa: "Mô tả vòng.", tinhCach: "Điềm.", cachNoi: "Chậm.", ghiChu: "Bí mật.",
    tuoi: "41", nguoiLon: true, vaiTro: "Người canh", danhXung: "gọi là thầy",
    vaiBdsm: "Dom", kinhNghiem: "Dày dạn", phongCach: "Nghiêm khắc", khauVi: "mệnh lệnh",
    gioiHan: "không đau", gioiHanCung: "không máu", luatRieng: "luôn hỏi trước", chamSocSau: "giữ ấm",
    tinHieuRieng: "gõ hai lần",
  };
  const the = theTuNhanVat(goc);
  const lai = nhanVatTuThe(chuanThe(the), {});
  for (const k of ["ten", "moTa", "tinhCach", "cachNoi", "tuoi", "vaiTro", "danhXung", "vaiBdsm",
    "kinhNghiem", "phongCach", "khauVi", "gioiHan", "gioiHanCung", "luatRieng", "chamSocSau", "tinHieuRieng"]) {
    eq(lai[k], goc[k], "đi vòng giữ nguyên: " + k);
  }
  eq(lai.nguoiLon, true, "đi vòng giữ cờ 18+");
  // `ghiChu` xuất ra thành `scenario` nên khi nhập lại cũng về `ghiChu`.
  eq(lai.ghiChu, "Bí mật.", "ghiChu đi vòng qua scenario");
});

// ================================================================== (5) PNG
test("pngNhungThe — nhúng rồi đọc lại đúng thẻ, khung khác giữ nguyên byte", () => {
  const the = theV2();
  const gocPng = pngGoc();
  const ra = pngNhungThe(gocPng, the);
  ok(laPng(ra), "ảnh ra vẫn là PNG");
  eq(docTheTuPng(ra).data.name, "Zz Miêu", "đọc lại được thẻ vừa nhúng");

  const truoc = dsKhung(gocPng);
  const sau = dsKhung(ra);
  eq(sau.length, truoc.length + 1, "thêm đúng MỘT khung");
  eq(sau[0].loai, "IHDR", "IHDR vẫn đứng đầu");
  eq(sau[1].loai, "tEXt", "khung thẻ nằm ngay sau IHDR");
  // Mọi khung còn lại phải giống từng byte.
  for (let i = 1; i < truoc.length; i++) {
    const a = gocPng.subarray(truoc[i].dau, truoc[i].cuoi);
    const b = ra.subarray(sau[i + 1].dau, sau[i + 1].cuoi);
    eqSau(b, a, "khung " + truoc[i].loai + " giữ nguyên");
  }
  eqSau(ra.subarray(0, 8), CHU_KY, "chữ ký PNG giữ nguyên");
});

test("pngNhungThe — nhúng LẦN HAI thì THAY thẻ cũ, không sinh hai thẻ", () => {
  const lan1 = pngNhungThe(pngGoc(), theV2());
  const doi = theV2();
  doi.data.name = "Zz Miêu Lần Hai";
  const lan2 = pngNhungThe(lan1, doi);
  eq(dsKhung(lan2).filter((k) => k.loai === "tEXt").length, 1, "chỉ còn MỘT khối chữ");
  eq(docTheTuPng(lan2).data.name, "Zz Miêu Lần Hai", "đọc ra bản mới nhất");
});

test("pngNhungThe — gỡ cả thẻ cũ nằm trong iTXt", () => {
  const co = noi(CHU_KY, khung("IHDR", ihdr()),
    khungChu("iTXt", "chara", bytesSangBase64(TE.encode(JSON.stringify(theV2())))),
    khung("IDAT", new Uint8Array([7])), khung("IEND", new Uint8Array(0)));
  const ra = pngNhungThe(co, theV2());
  eq(dsKhung(ra).filter((k) => k.loai === "iTXt" || k.loai === "tEXt").length, 1, "iTXt cũ bị gỡ");
  eq(docTheTuPng(ra).data.name, "Zz Miêu", "đọc được thẻ mới");
});

test("pngNhungThe — ảnh không phải PNG thì nói rõ, không làm hỏng gì", () => {
  let loi = null;
  try {
    pngNhungThe(TE.encode("jpeg giả"), theV2());
  } catch (e) {
    loi = e;
  }
  ok(loi instanceof Error && loi.message.indexOf("PNG") >= 0, "báo rõ là cần PNG");
});

// ================================================================== tên tệp
test("tenTepThe — bỏ ký tự nguy hiểm, giữ dấu tiếng Việt, luôn có đuôi json", () => {
  eq(tenTepThe({ ten: "Zz Miêu" }), "Zz-Miêu-the.json", "dấu cách thành gạch ngang");
  eq(tenTepThe({ ten: "a/b:c*d?e" }), "a-b-c-d-e-the.json", "ký tự đường dẫn bị thay");
  eq(tenTepThe({ ten: "  " }), "nhan-vat-the.json", "tên rỗng ⇒ tên dự phòng");
  eq(tenTepThe({}), "nhan-vat-the.json", "thiếu tên ⇒ tên dự phòng");
  ok(tenTepThe({ ten: "Zz".repeat(80) }).length <= 70, "tên dài bị cắt");
});
