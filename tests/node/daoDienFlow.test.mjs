// Truyện Vai — tầng kiểm thử Node: màn "Chế độ Đạo diễn" (src/ui/daoDien/).
//
// Hai nhóm luật:
//   (1) QUYẾT ĐỊNH + CÂU CHỮ nằm ở `daoDienFlow.js` (thuần) — ghim NGUYÊN VĂN, vì sửa một chữ
//       trong đó là đổi hành vi (người dùng đọc đúng những câu này khi xác nhận).
//   (2) BẢNG HÀNH ĐỘNG: mọi `data-act` mà màn Đạo diễn phát ra trong HTML đều PHẢI có hàm xử lý
//       trong `daoDienNut.js` — thiếu một cái là nút bấm không làm gì (im lặng), đúng loại lỗi
//       khó thấy khi chỉ nhìn màn hình.
//
// Tệp này KHÔNG dùng dữ liệu thật: mọi chuỗi đều là hư cấu.

import "../lib/moi-truong.js";
import { test, ok, eq } from "../lib/h.js";
import {
  THONG_BAO_CHAY_LAI, THONG_BAO_HOAN_TAT, THONG_BAO_HUY, THONG_BAO_TAM_DUNG,
  cauHoiHoanTat, cauHoiHuy, mucGocSau, tenHienThi, thongBaoTrangThai, trangThaiSau, trangThaiKhoiPhuc,
} from "../../src/ui/daoDien/daoDienFlow.js";
import { BANG_NUT } from "../../src/ui/daoDien/daoDienNut.js";

// ---------------------------------------------------------------- đọc tệp (như các ca gói)
let fsMod = null, pathMod = null, urlMod = null;
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
  return { doc: (rel) => fsMod.readFileSync(pathMod.join(GOC, rel), "utf8"), co: (rel) => fsMod.existsSync(pathMod.join(GOC, rel)) };
}

test("daoDienFlow: trạng thái mới của bốn nút đổi trạng thái hướng", () => {
  eq(trangThaiSau("dd-hd-tamdung"), "tamDung", "tạm dừng ⇒ tamDung");
  eq(trangThaiSau("dd-hd-tieptuc"), "hoatDong", "tiếp tục ⇒ hoatDong");
  eq(trangThaiSau("dd-hd-hoantat"), "hoanTat", "hoàn tất ⇒ hoanTat");
  eq(trangThaiSau("dd-hd-huy"), "huy", "huỷ ⇒ huy");
  eq(trangThaiSau("dd-dc-bat"), "", "nút khác ⇒ không đổi trạng thái hướng");
});

test("daoDienFlow: câu báo sau khi đổi trạng thái (nguyên văn)", () => {
  eq(thongBaoTrangThai("tamDung"), THONG_BAO_TAM_DUNG, "tạm dừng ⇒ câu tạm dừng");
  eq(thongBaoTrangThai("hoatDong"), THONG_BAO_CHAY_LAI, "chạy lại ⇒ câu chạy lại");
  eq(THONG_BAO_TAM_DUNG, "Đã tạm dừng hướng — lượt sau nó không còn vào prompt.", "nguyên văn câu tạm dừng");
  eq(THONG_BAO_CHAY_LAI, "Đã cho hướng chạy lại.", "nguyên văn câu chạy lại");
  eq(THONG_BAO_HOAN_TAT, "Đã đánh dấu hoàn tất.", "nguyên văn câu hoàn tất");
  eq(THONG_BAO_HUY, "Đã huỷ hướng.", "nguyên văn câu huỷ");
});

test("daoDienFlow: câu hỏi xác nhận hoàn tất / huỷ (nguyên văn + nút)", () => {
  const ht = cauHoiHoanTat("Hướng A");
  eq(ht[0], "Hoàn tất hướng", "tiêu đề hộp hoàn tất");
  eq(ht[1], "Đánh dấu “Hướng A” là đã hoàn tất? Hướng sẽ ngừng được bơm vào prompt, nhưng lịch sử tiến độ vẫn được giữ nguyên.", "nội dung hộp hoàn tất");
  eq(ht[2].yesLabel, "Hoàn tất", "nhãn nút hoàn tất");
  ok(!ht[2].danger, "hoàn tất không phải nút nguy hiểm");
  const huy = cauHoiHuy("Hướng B");
  eq(huy[0], "Huỷ hướng", "tiêu đề hộp huỷ");
  eq(huy[1], "Huỷ “Hướng B”? Hướng sẽ ngừng vào prompt ngay từ lượt sau. Lịch sử tiến độ vẫn được giữ để bạn hiểu điều gì từng được định hướng.", "nội dung hộp huỷ");
  eq(huy[2].yesLabel, "Huỷ hướng", "nhãn nút huỷ");
  eq(huy[2].danger, true, "huỷ là nút nguy hiểm");
});

test("daoDienFlow: tên hiển thị của hướng chịu được hướng cũ thiếu tên", () => {
  eq(tenHienThi({ ten: "Tên", mongMuon: "Mong" }), "Tên", "ưu tiên `ten`");
  eq(tenHienThi({ mongMuon: "Mong" }), "Mong", "hướng cũ chỉ có `mongMuon`");
  eq(tenHienThi({}), "", "không có gì ⇒ chuỗi rỗng");
  eq(tenHienThi(null), "", "null ⇒ chuỗi rỗng");
});

test("daoDienFlow: mức hé lộ chỉ nhận mã mức có thật, còn lại là ẩn", () => {
  const dsMuc = [{ id: "an" }, { id: "mot" }, { id: "hai" }];
  eq(mucGocSau("hai", dsMuc), "hai", "mức có thật thì giữ");
  eq(mucGocSau("an", dsMuc), "an", "ẩn thì giữ");
  eq(mucGocSau("bịa", dsMuc), "an", "mức không có thật ⇒ ẩn");
  eq(mucGocSau("", dsMuc), "an", "rỗng ⇒ ẩn");
  eq(mucGocSau("hai", []), "an", "danh sách rỗng ⇒ ẩn");
});

test("daoDienFlow: khôi phục đính chính xoá cả cờ xoá lẫn mốc xoá", () => {
  const tt = trangThaiKhoiPhuc();
  eq(tt.xoa, false, "bỏ cờ xoá");
  eq(tt.xoaLuc, 0, "bỏ mốc xoá");
});

test("daoDienNut: bảng hành động chỉ chứa hàm, khoá đúng dạng act của màn", () => {
  const khoa = Object.keys(BANG_NUT);
  ok(khoa.length >= 14, "có đủ nút của màn (đang " + khoa.length + ")");
  for (const k of khoa) {
    ok(typeof BANG_NUT[k] === "function", "hành động " + k + " phải là hàm");
    ok(k.indexOf("dd-") === 0 || k === "vg-muc", "khoá thuộc màn Đạo diễn: " + k);
  }
});

test("daoDienNut: mọi data-act của màn Đạo diễn trong app.js đều có hàm xử lý", async () => {
  const bd = await boDoc();
  if (!bd) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  const app = await bd.doc("src/app.js");
  // Mọi `data-act="…"` xuất hiện trong app.js, rồi lọc ra những cái thuộc màn Đạo diễn.
  const dsl = [];
  let i = 0;
  while (i < app.length) {
    const j = app.indexOf('data-act="', i);
    if (j < 0) break;
    const k = app.indexOf('"', j + 10);
    if (k < 0) break;
    const act = app.slice(j + 10, k);
    if (dsl.indexOf(act) < 0) dsl.push(act);
    i = k + 1;
  }
  const cuaMan = dsl.filter((a) => a.indexOf("dd-") === 0 || a === "vg-muc");
  ok(cuaMan.length >= 14, "đọc được act của màn Đạo diễn (" + cuaMan.length + ")");
  for (const a of cuaMan) {
    if (a === "dd-doi-ht") {
      // Ô chọn hội thoại do sự kiện "change" lo, không phải nút bấm.
      ok(BANG_NUT[a] === undefined, "dd-doi-ht không nằm trong bảng nút (do sự kiện change lo)");
      continue;
    }
    ok(typeof BANG_NUT[a] === "function", "act " + a + " có hàm xử lý");
  }
  // Và bảng không được khai thừa: mọi khoá đều là act có thật trong app.js.
  for (const k of Object.keys(BANG_NUT)) {
    ok(dsl.indexOf(k) >= 0, "khoá " + k + " có thật trong app.js");
  }
});
