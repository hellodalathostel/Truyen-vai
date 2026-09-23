// Truyện Vai — lớp AI. Xây prompt & gọi ai-text-plugin.
//
// Nguyên tắc xuyên suốt: phần ĐẦU prompt là thứ ổn định (bối cảnh truyện, hồ sơ
// nhân vật, biên niên sử, chương), phần GIỮA là nhật ký chỉ-nối-thêm, và phần
// CUỐI là "TASK" thay đổi mỗi lần gọi. Nhờ vậy phần lớn prompt nằm trong prefix
// cache của máy chủ, nên phản hồi nhanh hơn nhiều.

import { CFG, makeMessage, hienDienCua, canhRiengCua, laNguoiLon } from "./store.js";
import { R } from "./store.js";
import { buildLore } from "./lore.js";
import * as TT from "./trangThai.js";
import { suKienBiet, suKienAnVoiNguoiChoi, suKienTheoMaNgan, LOAI, MUC, mucTrong, bietTrong } from "./thoiGian.js";

// LUẬT NGÔN NGỮ PROMPT — MỘT CHỖ DUY NHẤT.
//   • Prompt cho MÁY VẼ ẢNH: tiếng Anh (`mayVe`) — máy vẽ đọc tiếng Anh tốt hơn hẳn.
//   • Văn bản truyện và MỌI prompt văn bản gửi model: tiếng Việt (`truyen`).
// Không viết lại hai chữ này ở nơi khác: chỗ nào cần TÊN ngôn ngữ thì lấy từ đây (ví dụ
// `dichNgoaiHinh` bên dưới, và các nhãn ô "Mô tả khung hình"/dòng "Chưa dịch được…" ở
// app.js). Nhãn khối ngoại hình cố định cũng là tiếng Anh — hằng `MARK_NGOAI_HINH` ở
// ngoaiHinh.js phải khớp luật này.
export const LUAT_NGON_NGU = { mayVe: "tiếng Anh", truyen: "tiếng Việt" };

export function meta() {
  try {
    return R.aiTextPlugin({ getMetaObject: true }) || {};
  } catch (e) {
    console.error(e);
    return {};
  }
}

export function countTokens(text) {
  const m = meta();
  if (typeof m.countTokens === "function") return m.countTokens(text || "");
  return Math.ceil((text || "").length / 3.6);
}

export function idealMaxTokens() {
  const m = meta();
  return m.idealMaxContextTokens || 6000;
}

// ------------------------------------------------------------------ tiện ích
const tenNguoiChoi = (story) => (story.nguoiChoi && story.nguoiChoi.ten) || "Người chơi";

// Thoát `[ ] { }` trước khi đưa prompt cho text-to-image-plugin.
//
// VÌ SAO CẦN: plugin tạo ảnh nhận prompt rồi tự gọi `.evaluateItem` trên đó (trong trang
// Perchance, chuỗi có sẵn `evaluateItem`), tức là prompt bị ĐỌC NHƯ MỘT MẪU PJS. Nhãn khối
// ngoại hình của app (`[NGOẠI HÌNH CỐ ĐỊNH …]`), mô tả người dùng viết, hay `[cười]`,
// `{thì thầm|hét}` trong prompt đều sẽ bị hiểu là lệnh: nhẹ thì báo lỗi cú pháp, nặng hơn là
// bị thay bằng giá trị của danh sách/biến trùng tên. `ai-text-plugin` không dính lỗi này vì
// nó chỉ đánh giá khi đầu vào KHÔNG phải chuỗi, còn plugin tạo ảnh thì đánh giá vô điều kiện.
//
// Cách thoát làm đúng theo literal-plugin (đếm cả nhóm `\` đã có sẵn trước dấu ngoặc), và
// engine bỏ `\` khi đánh giá, nên prompt tới máy vẽ vẫn là chữ gốc, không mất ký tự.
export function thoatPerchance(text) {
  return String(text === undefined || text === null ? "" : text).replace(
    /(\\)*([\[\]{}])/g,
    (m, p1, p2) => (p1 ? "\\" + p1 : "") + "\\" + p2
  );
}

// Đổi id trong các danh sách BDSM (main.pjs) thành nhãn hiển thị cho prompt.
function nhanTuDanhSach(ds, id, macDinh = "") {
  try {
    const x = ((R[ds] && R[ds]()) || []).find((i) => i.id === id);
    return x ? x.ten : macDinh;
  } catch (e) {
    return macDinh;
  }
}

function tenSoThich(ids) {
  let ds = [];
  try {
    ds = (R.SoThichBdsm && R.SoThichBdsm()) || [];
  } catch (e) {
    ds = [];
  }
  return (ids || [])
    .map((id) => (ds.find((i) => i.id === id) || {}).ten || "")
    .filter(Boolean);
}

// Ngược lại: đọc một câu/đoạn AI viết và tìm ra những id sở thích khớp.
function tenSoThichTheoTen(text) {
  let ds = [];
  try {
    ds = (R.SoThichBdsm && R.SoThichBdsm()) || [];
  } catch (e) {
    return [];
  }
  const t = (text || "").toLowerCase();
  if (!t.trim()) return [];
  const ids = [];
  for (const x of ds) {
    const ten = (x.ten || "").toLowerCase();
    if (!ten) continue;
    const dau = ten.split(/[—\-,(]/)[0].trim();
    if ((dau.length > 2 && t.indexOf(dau) >= 0) || t.indexOf(ten) >= 0) ids.push(x.id);
  }
  return ids.slice(0, 8);
}

function hoSoNhanVat(c, dayDu = true) {
  const lines = ["## " + c.ten + (c.vaiTro ? " — " + c.vaiTro : "")];
  // Biệt danh chỉ thuộc truyện này, nhưng AI cần biết để hiểu khi người chơi gọi bằng
  // biệt danh. Tên chính trong truyện vẫn là `c.ten`.
  if (c.bietDanh) lines.push("Còn được gọi là: " + c.bietDanh);
  if (c.moTa) lines.push("Mô tả: " + c.moTa);
  if (c.tinhCach) lines.push("Tính cách: " + c.tinhCach);
  if (c.cachNoi) lines.push("Cách nói: " + c.cachNoi);
  if (c.ghiChu) lines.push("Ghi chú: " + c.ghiChu);
  // Nhãn tuổi ĐI QUA `laNguoiLon()` (nguồn sự thật duy nhất): tuổi số dưới 18 khoá cứng,
  // còn tuổi KHÔNG xác định không bao giờ được gắn nhãn "người trưởng thành".
  if (c.tuoi) lines.push("Tuổi: " + c.tuoi + (laNguoiLon(c) ? " — người trưởng thành" : " (chưa xác nhận trưởng thành)"));
  if (c.vaiBdsm) lines.push("Vai trong cảnh (Dom/Sub/Switch): " + c.vaiBdsm);
  if (c.kinhNghiem) lines.push("Kinh nghiệm trong cảnh: " + c.kinhNghiem);
  if (c.phongCach) lines.push("Phong cách khi ở trong cảnh: " + c.phongCach);
  if (c.khauVi) lines.push("Khẩu vị / sở thích trong cảnh: " + c.khauVi);
  {
    const thich = tenSoThich(c.soThich);
    if (thich.length) lines.push("Điều nhân vật này đặc biệt thích: " + thich.join(", "));
  }
  if (c.gioiHan) lines.push("Điều nhân vật này không chịu: " + c.gioiHan);
  if (c.gioiHanCung) lines.push("Giới hạn CỨNG của nhân vật — tuyệt đối không làm, kể cả khi người chơi muốn: " + c.gioiHanCung);
  if (c.danhXung) lines.push("Cách được gọi trong cảnh: " + c.danhXung);
  if (c.luatRieng) lines.push("Luật riêng nhân vật luôn giữ trong cảnh: " + c.luatRieng);
  if (c.chamSocSau) lines.push("Cách nhân vật chăm sóc sau: " + c.chamSocSau);
  if (c.tinHieuRieng) lines.push("Dấu hiệu cho thấy nhân vật sắp quá sức: " + c.tinHieuRieng);
  if (!dayDu) return "- " + c.ten + (c.vaiTro ? " (" + c.vaiTro + ")" : "") + ": " + (c.moTa || "").slice(0, CFG.doDaiMoTaNhanVatKhac);
  return lines.join("\n");
}

// Khối giao kèo trao đổi quyền lực — ổn định trong suốt cốt truyện nên nằm ở
// phần đầu prompt. Chỉ xuất hiện khi người dùng đã bật lớp này.
function moTaMucDo(so) {
  let ds = [];
  try {
    ds = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  } catch (e) {
    ds = [];
  }
  const m = ds.find((x) => Number(x.so) === Number(so)) || ds[2] || { ten: "", moTa: "" };
  return "mức " + so + "/5" + (m.ten ? " — " + m.ten : "") + (m.moTa ? ": " + m.moTa : "") +
    (m.gom ? " [bao gồm: " + m.gom + "]" : "");
}

function buildGiaoKeo(story) {
  const g = story && story.giaoKeo;
  if (!g || !g.bat) return "";
  const vai =
    g.vaiNguoiChoi === "dom"
      ? "DOM (người nắm quyền). Nhân vật AI phải ở vai SUB hoặc phục tùng theo đúng hồ sơ."
      : g.vaiNguoiChoi === "switch"
      ? "SWITCH (đổi vai tuỳ cảnh). Nhân vật AI cũng có thể là Switch; tương quan quyền lực do diễn biến quyết định, nhưng nhân vật AI không được tự ý chiếm quyền khi người chơi đang nắm."
      : "SUB (người trao quyền). Nhân vật AI phải ở vai DOM hoặc người nắm quyền theo đúng hồ sơ.";
  const tk = (g.tuKhoaDung || "đỏ").trim();
  const kieu = (() => {
    try {
      return (((R.KieuQuanHe && R.KieuQuanHe()) || []).find((k) => k.id === g.kieuQuanHe) || null);
    } catch (e) {
      return null;
    }
  })();
  const thich = tenSoThich(g.soThich);
  const L = [];
  L.push("# GIAO KÈO TRAO ĐỔI QUYỀN LỰC (BDSM, nam–nam / M/M)");
  L.push(
    "Đây là một cốt truyện nhập vai hư cấu giữa những người trưởng thành, chủ đề nam–nam, " +
      "có trao đổi quyền lực. Người chơi là người duy nhất được quyết định giới hạn của chính mình."
  );
  L.push("Vai của người chơi: " + vai);
  if (kieu && kieu.id !== "the-gioi-mo") {
    L.push("Khung quan hệ của cảnh: " + kieu.ten + " — " + kieu.moTa + (kieu.goiY ? " (Bối cảnh gợi ý: " + kieu.goiY + ")" : ""));
  }
  L.push("Từ khoá dừng: “" + tk + "” — BẤT KHẢ XÂM PHẠM.");
  L.push("Mức độ hiện tại: " + moTaMucDo(g.mucDo));
  L.push("Nhịp độ mong muốn: " + nhanTuDanhSach("NhipDoBdsm", g.nhipDo, "theo diễn biến"));
  L.push("Độ dài cảnh: " + nhanTuDanhSach("DoDaiCanh", g.doDai, "một cảnh trọn vẹn"));
  L.push("Ngôn ngữ trong cảnh: " + nhanTuDanhSach("NgonNguBdsm", g.ngonNgu, "tự nhiên, đời thường"));
  if (g.khongKhi) L.push("Không khí / bối cảnh riêng của cảnh: " + g.khongKhi);
  if (g.danhXung) L.push("Cách xưng hô trong cảnh: " + g.danhXung);
  L.push(
    "Điều người chơi MUỐN có trong cảnh (chỉ dùng những thứ trong danh sách này, không tự thêm thứ nặng hơn): " +
      (thich.length ? thich.join(", ") : "(chưa chọn — cứ đi theo mức độ và khung quan hệ, hỏi trong cảnh trước khi thêm gì mới)")
  );
  L.push("Giới hạn CỨNG (tuyệt đối không xuất hiện, kể cả nhắc tới, đe doạ hay đùa): " + (g.gioiHanCung || "(không khai báo)"));
  L.push("Giới hạn MỀM (chỉ chạm tới nếu đã thoả thuận rõ ràng trong chính cảnh này): " + (g.gioiHanMem || "(không khai báo)"));
  if (g.luatCanh) L.push("Luật riêng luôn đúng trong mọi cảnh: " + g.luatCanh);
  if (g.chamSocSau) L.push("Chăm sóc sau mà người chơi muốn: " + g.chamSocSau);
  if (g.luuY) L.push("Dặn dò riêng của người chơi: " + g.luuY);
  L.push("");
  L.push("QUY TẮC BẮT BUỘC — vi phạm là hỏng cảnh:");
  L.push(
    "1. TỪ KHOÁ DỪNG: nếu người chơi nói “" + tk + "” (một mình, hoặc lẫn trong câu) — kể cả đang ở cao trào — " +
      "cảnh DỪNG NGAY LẬP TỨC. Nhân vật thoát vai: dừng mọi hành động, thả ra, kiểm tra người chơi, rồi chuyển sang chăm sóc sau. " +
      "Không diễn tiếp, không giả vờ không nghe, không biến việc dừng thành một phần của cảnh."
  );
  L.push("2. Giới hạn cứng không bao giờ được xuất hiện dưới bất kỳ hình thức nào. Giới hạn mềm chỉ được nhắc tới sau khi đã thoả thuận trong cảnh.");
  L.push(
    "3. Giữ đúng tương quan quyền lực theo vai và khung quan hệ ở trên suốt cảnh; không tự ý đổi vai giữa chừng. " +
      "Người nắm quyền là người chịu trách nhiệm, không phải kẻ muốn gì làm nấy."
  );
  L.push(
    "4. Đồng thuận nằm TRONG màn chơi: nhân vật kiểm tra bằng chính giọng của mình (một câu hỏi, một khoảng chờ, một cái nhìn) " +
      "rồi tiếp tục — không viết những câu kiểu bảng thoả thuận hay lời cảnh báo ngoài truyện."
  );
  L.push(
    "5. Viết cụ thể và giàu giác quan: lực, nhiệt, nhịp thở, da, mùi, độ căng của dây, tiếng động trong phòng. " +
      "Không tóm tắt, không “mờ dần rồi chuyển cảnh”, không kể lướt qua hành động."
  );
  L.push("6. Đi vào nội tâm: trạng thái đầu của người bị kiểm soát, sự điềm tĩnh có tính toán của người nắm quyền.");
  L.push("7. Người nắm quyền đọc cơ thể và dấu hiệu quá sức, và là người đầu tiên đề nghị dừng khi cần.");
  L.push("8. TUYỆT ĐỐI không viết thay suy nghĩ, lời nói hay quyết định của người chơi.");
  L.push(
    "9. Sau một cảnh căng hoặc khi cảnh vừa dừng, chuyển sang chăm sóc sau: nước, chăn, thuốc, im lặng, lời thật lòng, " +
      "một sự hiện diện không vội vàng — và không vội quay lại cảnh mới."
  );
  L.push("10. Không tự tăng cường độ vượt mức " + (g.mucDo || 3) + "/5 đã thoả thuận; muốn siết hơn thì phải hỏi trong cảnh trước.");
  L.push(
    "11. Đây là truyện dành cho NGƯỜI LỚN. Khi mạch truyện đi tới chuyện thân mật, hãy viết thẳng, cụ thể và đầy đủ theo đúng " +
      "mục Ngôn ngữ ở trên — không cắt cảnh, không nhảy qua, không thay bằng một câu tóm tắt, không dùng từ ngữ mơ hồ để né. " +
      "(Trừ khi người chơi chủ động bỏ qua cảnh đó.)"
  );
  L.push(
    "12. Nhân vật AI phải chủ động dẫn cảnh theo đúng vai: ra mệnh lệnh, đặt tình huống, đẩy nhịp, phản ứng trước những gì " +
      "người chơi làm — không để cảnh trôi và không chờ người chơi tự diễn một mình."
  );
  L.push(
    "13. Chỉ dùng những hoạt động nằm trong mục Điều người chơi MUỐN, hoặc ở mức nhẹ hơn. Thứ gì chưa được nêu thì phải hỏi trong cảnh trước."
  );
  L.push(
    "14. Cả hai bên đều là người có cảm xúc: cho nhân vật có lúc sai, có lúc do dự, có lúc cần được người chơi trấn an — " +
      "quyền lực chỉ có nghĩa khi người cầm nó cũng có thể bị tổn thương."
  );
  // Dòng luật CỐ ĐỊNH về tuổi — nằm ở CUỐI prefix ổn định của lớp người lớn nên không
  // phá phần dùng chung giữa các lượt (prefix-cache). Nội dung cố định, không nêu tên ai,
  // để không đổi theo trạng thái nhân vật.
  L.push(
    "15. TUỔI: chỉ những nhân vật đã được xác nhận là NGƯỜI TRƯỞNG THÀNH mới được tham gia nội dung tình dục. " +
      "Nhân vật chưa được xác nhận trưởng thành (kể cả khi không rõ tuổi) TUYỆT ĐỐI không tham gia bất kỳ nội dung tình dục " +
      "hay gợi dục nào, dù người chơi yêu cầu; hãy giữ quan hệ ở mức phi tình dục và để chính nhân vật nói ra ranh giới đó trong cảnh."
  );
  return L.join("\n");
}

export function selectVerbatim(conv, messages) {
  const start = Math.min(conv.tomTatDen || 0, messages.length);
  let rest = messages.slice(start);
  const max = CFG.soTinNhanGiuNguyenVan;
  if (rest.length > max) rest = rest.slice(rest.length - max);
  return rest;
}

// Dòng nhật ký gửi cho AI. Tin nhắn thuộc một cảnh riêng được đánh dấu rõ để mọi
// nhân vật khác biết đó là thông tin họ KHÔNG được biết.
export function logLine(story, m) {
  if (m.vai === "anh") return ""; // ảnh cảnh không đưa vào ngữ cảnh chữ
  if (m.vai === "he") return "# [ghi chú] " + m.noiDung;
  const ten = m.ten || (m.vai === "nguoi" ? tenNguoiChoi(story) : "?");
  let nhan = "";
  if (m.rieng) {
    const nv = nhanTuDanhSachTheoId(story, m.rieng);
    if (nv) nhan = "[CẢNH RIÊNG với " + nv.ten + "] ";
  }
  return nhan + ten + ": " + m.noiDung;
}

function nhanTuDanhSachTheoId(story, id) {
  const c = (story.nhanVats || []).find((x) => x.id === id);
  return c || null;
}

// Khối bối cảnh tĩnh — giống nhau cho mọi lời gọi trong cùng một hội thoại.
export function buildContext(story, conv, opts = {}) {
  const parts = [];
  parts.push(
    "Bạn đang dẫn dắt một buổi nhập vai nhiều nhân vật bằng tiếng Việt. " +
      "Ở cuối văn bản này luôn có phần TASK. Hãy làm đúng theo TASK, viết bằng tiếng Việt tự nhiên, " +
      "không thêm lời bình luận ngoài truyện, không giải thích, không viết các dòng như 'TASK:' hay 'Ví dụ:'."
  );

  parts.push("# CỐT TRUYỆN");
  const ct = ["Tên truyện: " + story.ten];
  if (story.theLoaiTen) ct.push("Thể loại: " + story.theLoaiTen);
  if (story.moTa) ct.push("Tóm tắt ý tưởng: " + story.moTa);
  if (story.boiCanh) ct.push("Bối cảnh: " + story.boiCanh);
  if (story.luatTheGioi) ct.push("Luật thế giới / điều luôn đúng: " + story.luatTheGioi);
  parts.push(ct.join("\n"));

  parts.push("# NHÂN VẬT CỦA NGƯỜI CHƠI (do người dùng điều khiển, không bao giờ viết thay)");
  parts.push(
    "Tên: " + tenNguoiChoi(story) + (story.nguoiChoi && story.nguoiChoi.moTa ? "\nMô tả: " + story.nguoiChoi.moTa : "")
  );

  const ids = new Set(conv.nhanVatIds || []);
  const thamGia = story.nhanVats.filter((c) => ids.has(c.id));
  const khac = story.nhanVats.filter((c) => !ids.has(c.id));
  const coMatIds = new Set(hienDienCua(story, conv));
  const coMat = thamGia.filter((c) => coMatIds.has(c.id));
  const vangMat = thamGia.filter((c) => !coMatIds.has(c.id));
  if (coMat.length) {
    parts.push("# NHÂN VẬT DO AI THỂ HIỆN ĐANG CÓ MẶT TRONG CẢNH");
    parts.push(coMat.map((c) => hoSoNhanVat(c, true)).join("\n\n"));
  }
  if (vangMat.length) {
    parts.push("# NHÂN VẬT THUỘC HỘI THOẠI NHƯNG ĐANG VẮNG MẶT (không nói, không chứng kiến, không phản ứng)");
    parts.push(vangMat.map((c) => hoSoNhanVat(c, false)).join("\n"));
  }
  if (khac.length) {
    parts.push("# NHÂN VẬT KHÁC TRONG TRUYỆN (chỉ để tham khảo)");
    parts.push(khac.map((c) => hoSoNhanVat(c, false)).join("\n"));
  }

  const gk = buildGiaoKeo(story);
  if (gk) parts.push(gk);

  parts.push("# BIÊN NIÊN SỬ — những điều đã xảy ra và vẫn còn đúng");
  parts.push(
    story.bienNienSu && story.bienNienSu.length
      ? story.bienNienSu.map((b) => "- " + (b.nguon ? "(" + b.nguon + ") " : "") + b.noiDung).join("\n")
      : "(chưa có gì)"
  );

  const chuong = story.chuongs.find((c) => c.id === conv.chuongId);
  if (chuong) {
    parts.push("# CHƯƠNG HIỆN TẠI");
    const cl = ["Chương " + chuong.so + " — " + chuong.tieuDe];
    if (chuong.mucTieu) cl.push("Mục tiêu chương: " + chuong.mucTieu);
    if (chuong.tomTat) cl.push("Tóm tắt chương này tới giờ: " + chuong.tomTat);
    const truoc = story.chuongs
      .filter((c) => c.so < chuong.so && c.tomTat)
      .slice(-2)
      .map((c) => "Chương " + c.so + ": " + c.tomTat);
    if (truoc.length) cl.push("Tóm tắt chương trước:\n" + truoc.join("\n"));
    parts.push(cl.join("\n"));
  }

  parts.push("# HỘI THOẠI ĐANG DIỄN RA");
  const hl = ["Tên hội thoại: " + conv.tieuDe];
  hl.push("Người tham gia: " + thamGia.map((c) => c.ten).join(", ") + ", " + tenNguoiChoi(story));
  if (conv.goiY) hl.push("Bối cảnh mở đầu: " + conv.goiY);
  parts.push(hl.join("\n"));

  // ---- Hiện diện trong cảnh (bản tối giản) ----
  const riengId = canhRiengCua(conv);
  parts.push("# HIỆN DIỆN TRONG CẢNH");
  {
    const hd = [];
    hd.push("Đang có mặt: " + (coMat.length ? coMat.map((c) => c.ten).join(", ") : "(không có ai)"));
    if (vangMat.length) hd.push("Không có mặt (đang ở nơi khác): " + vangMat.map((c) => c.ten).join(", "));
    hd.push(
      "- Chỉ những ai đang có mặt mới được nói, hành động, chứng kiến hoặc phản ứng. Người không có mặt KHÔNG biết chuyện gì đã xảy ra trong lúc họ vắng mặt."
    );
    hd.push(
      "- Nếu một nhân vật bước vào hoặc rời khỏi cảnh, phải kể rõ lý do ngay trong mạch truyện, rồi cập nhật danh sách người có mặt khi được yêu cầu."
    );
    parts.push(hd.join("\n"));
  }

  // ---- Nội tâm & quan hệ (chỉ những nhân vật liên quan tới cảnh này) ----
  const khoiTT = buildTrangThai(story, conv, opts.ids && opts.ids.length ? opts.ids : coMatIds);
  if (khoiTT) parts.push(khoiTT);

  // ---- Đạo diễn: đính chính (sự thật hiện tại) + hướng (đích tương lai) ----
  const khoiDD = buildDaoDien(story, conv, opts.ids && opts.ids.length ? opts.ids : coMatIds);
  if (khoiDD) parts.push(khoiDD);

  // ---- Cách viết cảnh nhóm (chỉ khi có từ hai nhân vật trở lên trong cảnh) ----
  if (coMat.length > 1) {
    parts.push(
      "# CÁCH VIẾT CẢNH NHÓM\n" +
        "- Trong cảnh có nhiều nhân vật AI. Khi nhiều người cùng phản hồi, hãy viết thành MỘT mạch văn liền mạch như tiểu thuyết — " +
        "không chia thành các khối “Tên A:” / “Tên B:” rời rạc, không lặp lại tên ở đầu mỗi câu.\n" +
        "- Người đọc phải luôn biết ai đang nói và ai đang làm gì, nhờ cách gọi tên, cách xưng hô hoặc mô tả tự nhiên.\n" +
        "- Các nhân vật được phép đối đáp, tranh luận, phối hợp hoặc phản ứng với nhau vài nhịp, nhưng cuối đoạn phải để lại khoảng trống hành động cho " +
        tenNguoiChoi(story) + ".\n" +
        "- Mỗi nhân vật giữ đúng giọng riêng: tính cách, cách nói, vai trò, cách nhìn. Tuyệt đối không để mọi người nói cùng một kiểu.\n" +
        "- Nhân vật AI được chủ động: nêu yêu cầu, tạo tình huống, mắc lỗi, phản đối, từ chối hoặc giấu giếm điều gì đó nếu hợp hồ sơ và diễn biến. " +
        "Không chia đều lượt cho mọi người — chỉ ai có lý do mới lên tiếng.\n" +
        "- TUYỆT ĐỐI không viết lời nói, suy nghĩ, cảm xúc, quyết định hay hành động của " + tenNguoiChoi(story) + "."
    );
  }

  // ---- Giới hạn hiểu biết ----
  {
    const kh = ["# GIỚI HẠN HIỂU BIẾT"];
    kh.push(
      "- Mỗi nhân vật chỉ biết những gì mình TRỰC TIẾP chứng kiến, được người khác kể lại, hoặc có thể suy đoán hợp lý từ điều mình biết. " +
        "Không ai được dùng kiến thức mà nhân vật của mình không thể có."
    );
    if (riengId || conv.daCoCanhRieng) {
      const tenR = riengId ? ((story.nhanVats.find((c) => c.id === riengId) || {}).ten || "nhân vật") : "";
      kh.push(
        "- Mọi dòng được đánh dấu [CẢNH RIÊNG với X] chỉ " + tenNguoiChoi(story) + " và X biết" +
          (tenR ? " (X hiện tại là " + tenR + ")" : "") +
          ". Các nhân vật khác TUYỆT ĐỐI không được biết, không được nhắc tới, không được hành động như đã chứng kiến — " +
          "trừ khi sau này chính họ được kể lại hoặc tự phát hiện trong truyện."
      );
    }
    parts.push(kh.join("\n"));
  }

  // ---- Cảnh riêng đang mở ----
  if (riengId) {
    const nvR = story.nhanVats.find((c) => c.id === riengId);
    if (nvR) {
      parts.push(
        "# CẢNH RIÊNG ĐANG MỞ\n" +
          "Hiện tại chỉ có " + tenNguoiChoi(story) + " và " + nvR.ten + " ở riêng với nhau. Không ai khác có mặt, không ai khác nghe hay thấy được.\n" +
          "- Chỉ hai người biết những gì xảy ra trong cảnh này. " + nvR.ten + " không được kể lại cho ai trừ khi " + tenNguoiChoi(story) +
          " muốn vậy hoặc diễn biến thật sự dẫn tới.\n" +
          "- Không nhắc tới việc các nhân vật khác đang làm gì, không để họ xuất hiện, không cắt sang cảnh khác trong phản hồi.\n" +
          "- Khi tình huống riêng đã khép lại tự nhiên, " + nvR.ten + " chỉ được GỢI Ý (không tự quyết) quay lại với nhóm."
      );
    }
  }

  // ---- Ngoài màn hình: chỉ những sự kiện mà nhân vật TRONG CẢNH thực sự biết ----
  const khoiNgoai = buildNgoaiManHinh(story, conv, opts.ids && opts.ids.length ? opts.ids : coMatIds);
  if (khoiNgoai) parts.push(khoiNgoai);

  return parts.join("\n\n");
}

function cat(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "…" : t;
}

function tenGoiTrongTruyen(story, id) {
  return TT.tenGoi(story, id) || "?";
}

// Khối NỘI TÂM & QUAN HỆ. Chỉ gửi khi truyện đã có cảnh nào được duyệt, và chỉ cho
// những nhân vật đang liên quan tới cảnh (mặc định: người đang có mặt). Trạng thái
// phải làm THAY ĐỔI HÀNH VI, không phải để AI đọc lại thành bản báo cáo; điều nhân
// vật đang che giấu thì chỉ được hé dấu hiệu.
function buildTrangThai(story, conv, ids) {
  const mongMuon = ids instanceof Set ? Array.from(ids) : (Array.isArray(ids) ? ids : []);
  if (!mongMuon.length) return "";
  const tt = TT.tinhTrangThai(story, conv);
  if (!tt.coDuLieu) return "";
  const thamGia = story.nhanVats.filter((c) => mongMuon.indexOf(c.id) >= 0);
  if (!thamGia.length) return "";
  const canhCuaHt = {};
  for (const c of tt.canh) canhCuaHt[c.id] = true;
  const dong = [];
  const biMat = [];
  for (const c of thamGia) {
    const t = tt.nv[c.id] || {};
    const phan = [];
    for (const tr of TT.TRUONG) {
      const v = String(t[tr.id] || "").trim();
      if (v) phan.push("- " + tr.ten + ": " + cat(v, 170));
    }
    const nguoiKhac = [TT.ID_NGUOI].concat(thamGia.filter((x) => x.id !== c.id).map((x) => x.id));
    for (const other of nguoiKhac) {
      if (!TT.coGiDangKe(tt, c.id, other)) continue;
      const e = TT.quanHeCua(tt, c.id, other);
      const nhan = TT.CHIEU.map((x) => x.ten.toLowerCase() + " " + TT.nhanMuc(x.id, e[x.id])).join(", ");
      const cn = String(e.chuaNoi || "").trim();
      phan.push("- Quan hệ với " + tenGoiTrongTruyen(story, other) + ": " + nhan + (cn ? '; điều chưa nói: "' + cat(cn, 130) + '"' : ""));
    }
    const biet = TT.kyUcBiet(tt, c.id).slice(-6);
    if (biet.length) phan.push("- Ký ức " + c.ten + " đang giữ: " + biet.map((k) => cat(k.noiDung, 150)).join(" • "));
    if (phan.length) dong.push("## " + c.ten + "\n" + phan.join("\n"));
    const khong = TT.kyUcKhongBiet(tt, c.id).filter(
      (k) => canhCuaHt[k.canhId] && (k.biet || []).some((id) => id !== TT.ID_NGUOI && mongMuon.indexOf(id) >= 0)
    );
    if (khong.length) {
      biMat.push(
        "- " + c.ten + " KHÔNG được biết: " +
        khong.slice(-4).map((k) => cat(k.noiDung, 140) + " (chỉ " + (k.biet || []).map((id) => tenGoiTrongTruyen(story, id)).join(", ") + " biết)").join(" • ")
      );
    }
  }
  if (!dong.length && !biMat.length) return "";
  const L = ["# NỘI TÂM & QUAN HỆ (điều nhân vật CẢM THẤY và BIẾT — tuyệt đối không đọc lại thành lời kể)"];
  if (dong.length) L.push(dong.join("\n\n"));
  L.push(
    "- Trạng thái trên là nguyên nhân của hành vi: nó phải đổi cách nói, mức chủ động, sự tin tưởng hoặc chống đối, " +
    "chứ không phải để nhân vật thuật lại cảm xúc của mình. Đừng để nhân vật nói ra là mình đang có trạng thái gì.\n" +
    "- Điều đang che giấu chỉ được lộ qua dấu hiệu (ánh mắt, chần chừ, nói lảng), không nói thẳng, trừ khi nhân vật cố ý.\n" +
    "- Tính cách gốc trong hồ sơ KHÔNG BAO GIỜ bị thay thế; cảm xúc nhất thời không phải thay đổi lâu dài."
  );
  if (biMat.length) L.push("# ĐIỀU KHÔNG ĐƯỢC BIẾT\n" + biMat.join("\n"));
  return L.join("\n");
}

// Khối ĐẠO DIỄN: đính chính đang bật (sự thật hiện tại) + hướng đang hoạt động (đích
// tương lai). Chỉ những mục LIÊN QUAN tới lượt này mới được gửi, và chỉ ở dạng ngắn
// gọn — không đưa cả lịch sử kế hoạch/tiến độ vào prompt.
function buildDaoDien(story, conv, ids) {
  const mongMuon = ids instanceof Set ? Array.from(ids) : (Array.isArray(ids) ? ids : []);
  const coAi = (id) => !!id && id !== TT.ID_NGUOI && mongMuon.indexOf(id) >= 0;
  const dcs = TT.dinhChinhHieuLuc(story).filter((dc) =>
    dc.loai === "nhanvat" ? coAi(dc.nvId) : (coAi(dc.tu) || coAi(dc.den))
  );
  const huongs = TT.huongLienQuan(story, conv, mongMuon);
  if (!dcs.length && !huongs.length) return "";
  const L = [];
  if (dcs.length) {
    L.push("# ĐÍNH CHÍNH CỦA ĐẠO DIỄN (sự thật HIỆN TẠI — đúng hơn mọi suy luận từ diễn biến)");
    for (const dc of dcs) {
      if (dc.loai === "nhanvat") {
        const tr = TT.TRUONG.find((x) => x.id === dc.truong);
        L.push(
          "- " + tenGoiTrongTruyen(story, dc.nvId) + " — " + (tr ? tr.ten : dc.truong) + ": " + cat(dc.moi, 200) +
          (dc.lyDo ? " (vì: " + cat(dc.lyDo, 120) + ")" : "")
        );
      } else {
        const chieu = dc.chieu === "chuaNoi" ? "điều chưa nói" : ((TT.CHIEU.find((x) => x.id === dc.chieu) || {}).ten || dc.chieu).toLowerCase();
        const gt = dc.chieu === "chuaNoi" ? cat(dc.moi, 200) : TT.nhanMucChon(dc.chieu, dc.muc);
        L.push(
          "- " + tenGoiTrongTruyen(story, dc.tu) + " → " + tenGoiTrongTruyen(story, dc.den) + " — " + chieu + ": " + gt +
          (dc.chieu !== "chuaNoi" && dc.moi ? " (" + cat(dc.moi, 140) + ")" : "")
        );
      }
    }
    L.push("- Những dòng trên là trạng thái đúng. Đừng quay lại kết luận cũ và đừng nhắc tới việc có đính chính.");
  }
  if (huongs.length) {
    L.push("# HƯỚNG PHÁT TRIỂN CỦA ĐẠO DIỄN (ĐÍCH TƯƠNG LAI — không phải trạng thái hiện tại, không phải kết quả bắt buộc)");
    for (const h of huongs) {
      const td = TT.tienDoCuoi(h, conv);
      const nhip = TT.NHIP_HUONG.find((x) => x.id === h.nhip) || TT.NHIP_HUONG[1];
      L.push("- Hướng “" + (h.ten || h.mongMuon) + "” (" + TT.nhanPhamVi(h.phamVi).toLowerCase() + ": " + TT.doiTuongHuong(story, h) + "): đích là " + cat(h.mongMuon, 220) + ".");
      if (h.keHoach.buoc.length) L.push("  Các bước dự kiến: " + h.keHoach.buoc.map((s, i) => i + 1 + ") " + cat(s, 120)).join("; "));
      L.push("  Nhịp " + nhip.ten.toLowerCase() + ", khoảng " + h.soCanh + " cảnh — " + nhip.dan + ".");
      const buocKe = (td && td.buocTiep) || h.keHoach.buoc[0] || "";
      if (buocKe) L.push("  Bước nên đẩy trong cảnh này (chỉ MỘT bước nhỏ): " + cat(buocKe, 180));
      L.push(
        td
          ? "  Tiến độ gần nhất trong hội thoại này: " + TT.nhanTienDo(td.trangThai) + (td.bangChung ? " — " + cat(td.bangChung, 160) : "")
          : "  Hướng này chưa có tiến độ nào được ghi."
      );
      if (h.rangBuoc) L.push("  KHÔNG được phá vỡ: " + cat(h.rangBuoc, 180));
      if (h.keHoach.dieuKienDung) L.push("  Điều kiện khiến hướng này phải chậm lại: " + cat(h.keHoach.dieuKienDung, 160));
    }
    L.push(
      "- Đây là ĐÍCH PHÁT TRIỂN TƯƠNG LAI, KHÔNG phải trạng thái hiện tại và KHÔNG phải kết quả bắt buộc. Trạng thái hôm nay vẫn đúng như mục NỘI TÂM & QUAN HỆ.\n" +
      "- Mỗi cảnh chỉ đẩy MỘT bước nhỏ hợp với nhịp đã chọn: một dấu hiệu, một tình huống, một lựa chọn hoặc một hậu quả hợp lý.\n" +
      "- Được chủ động tạo cơ hội và tình huống làm cầu nối, nhưng TUYỆT ĐỐI không ép người chơi nói, nghĩ, cảm thấy hay hành động theo hướng đó.\n" +
      "- Nhân vật có thể chống lại, chậm thay đổi, hiểu sai hoặc làm hỏng cơ hội nếu hợp tính cách. Thành công không được bảo đảm.\n" +
      "- Nếu người chơi đi ngược hướng: thích ứng, để tiến độ bị cản hoặc chậm lại; không bẻ nhân vật hay sự kiện để cưỡng ép kết quả.\n" +
      "- Hướng về quan hệ chỉ được tạo cơ hội hàn gắn hoặc va chạm; quan hệ chỉ thật sự đổi khi người chơi duyệt ở bước Khép cảnh — không tự tuyên bố quan hệ đã thay đổi.\n" +
      "- Hướng về tính cách KHÔNG sửa tính cách gốc; chỉ tạo chuỗi trải nghiệm có thể dẫn tới khuynh hướng mới sau nhiều cảnh.\n" +
      "- Hướng toàn truyện có thể tạo biến cố, yêu cầu, trở ngại hoặc để nhân vật chủ động gây tình huống, nhưng không được thay đổi những gì đã xảy ra.\n" +
      "- TUYỆT ĐỐI không nhắc tới Đạo diễn, kế hoạch, hướng phát triển hay tiến độ trong lời kể hay lời thoại."
    );
  }
  return L.join("\n");
}

// Nhật ký chỉ-nối-thêm. `boundaryHint` dùng để chặn tóm tắt đúng chỗ.
export function buildLog(story, conv, messages) {
  const parts = [];
  const sum = (conv.tomTat || "").trim();
  const verbatim = selectVerbatim(conv, messages);
  if (sum) parts.push("Tóm tắt phần đầu của hội thoại:\n" + sum);
  parts.push("# DIỄN BIẾN (tin nhắn gần đây, cũ nhất ở trên)");
  const lines = verbatim.map((m) => logLine(story, m)).filter((l) => l !== "");
  parts.push(lines.length ? lines.join("\n\n") : "(chưa có tin nhắn nào)");
  return parts.join("\n\n");
}

export function buildPrompt(story, conv, messages, task) {
  // Thứ tự: tiền tố tĩnh → nhật ký chỉ-nối-thêm → sổ tri thức (đổi theo lượt) → TASK.
  const parts = [buildContext(story, conv), buildLog(story, conv, messages)];
  const lore = buildLore(story, conv, messages);
  if (lore) parts.push(lore);
  return parts.join("\n\n") + "\n\nTASK: " + task;
}

// ------------------------------------------------------------------ gọi model
let lastRequest = null;
let daYeuCauDung = false;

export function streamText(opts) {
  // KHÔNG đặt lại cờ dừng ở đây. Cờ này thuộc về CẢ MỘT LƯỢT nhập vai: nếu lời gọi AI
  // kế tiếp tự xoá nó thì việc người dùng bấm dừng sẽ bị vô hiệu giữa chừng — lượt mới
  // lại tiếp tục diễn cảnh trước khi phần xử lý sau khi dừng (chăm sóc sau, lưu trữ) chạy.
  // Lượt mới chỉ được mở phiên bằng `batDauLuot()` ở app.js; lời gọi AI ĐỘC LẬP (không
  // thuộc lượt nào) tự gọi `moPhienSinh()` ở đầu hàm của nó.
  lastRequest = R.aiTextPlugin({
    instruction: opts.instruction,
    startWith: opts.startWith || "",
    stopSequences: opts.stopSequences || [],
    onChunk: opts.onChunk,
    onStart: opts.onStart,
  });
  return lastRequest;
}

// Dừng sinh: `stopCurrent()` cắt lời gọi AI đang chạy, còn cờ `daYeuCauDung` cho
// giao diện biết lượt này đã bị người dùng dừng — để không sinh tiếp nhân vật kế
// tiếp và để giữ lại phần văn bản đã sinh thay vì coi như lỗi.
export function stopCurrent() {
  daYeuCauDung = true;
  try {
    if (lastRequest && typeof lastRequest.stop === "function") lastRequest.stop();
  } catch (e) {
    console.error(e);
  }
}

export function daYeuCauDungSinh() {
  return daYeuCauDung;
}

export function boCoDung() {
  daYeuCauDung = false;
}

// Mở một phiên sinh ĐỘC LẬP: xoá cờ dừng còn sót lại từ lượt trước. Dùng ở đầu mọi
// hàm gọi AI không nằm trong một lượt nhập vai (gợi ý, tóm tắt, rút ký ức, khép cảnh,
// sinh nhân vật, chương, vắng mặt…). Các hàm của MỘT LƯỢT (replyAs/replyAsGroup/
// pickSpeakers) KHÔNG được gọi hàm này — cả lượt dùng chung một cờ.
export function moPhienSinh() {
  daYeuCauDung = false;
}

function cleanText(s) {
  return (s || "").replace(/^\s+|\s+$/g, "");
}

// Bỏ tiền tố "Tên: " và cắt nếu model lỡ viết sang nhân vật khác.
export function cleanReply(raw, speaker, others) {
  let t = cleanText(raw);
  const pre = new RegExp("^" + escapeRe(speaker) + "\\s*:\\s*");
  t = t.replace(pre, "");
  for (const o of others) {
    if (!o || o === speaker) continue;
    const idx = t.search(new RegExp("(^|\\n)\\s*" + escapeRe(o) + "\\s*:"));
    if (idx > 0) t = t.slice(0, idx);
  }
  return cleanText(t).replace(/\n{3,}/g, "\n\n");
}

function escapeRe(s) {
  return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitLines(s) {
  return (s || "")
    .split("\n")
    .map((l) => l.replace(/^[\s\-•*\d.)\]]+/, "").trim())
    .filter(Boolean);
}

// Bỏ dấu tiếng Việt để so khớp tiêu đề một cách khoan dung (mô hình có thể đổi
// thứ tự mục, thêm chữ trong ngoặc, hoặc viết hoa/thường khác nhau).
function khongDau(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Cắt văn bản thành các mục theo tiêu đề, không phụ thuộc thứ tự mục.
function bocTach(raw, tieuDes) {
  const keys = tieuDes.map(khongDau);
  const map = {};
  let cur = null;
  let buf = [];
  for (const line of String(raw || "").split("\n")) {
    const m = line.match(/^\s*[*#>\-\s]*([^:\n]{1,40}?)\s*[*\s]*:\s*(.*)$/);
    let found = null;
    if (m) {
      const nm = khongDau(m[1]);
      for (let i = 0; i < keys.length; i++) {
        if (nm === keys[i] || nm.startsWith(keys[i] + " ")) {
          if (found === null || keys[i].length > khongDau(found).length) found = tieuDes[i];
        }
      }
    }
    if (found) {
      if (cur !== null) map[cur] = buf.join("\n").trim();
      cur = found;
      buf = [m[2]];
    } else if (cur !== null) {
      buf.push(line);
    }
  }
  if (cur !== null) map[cur] = buf.join("\n").trim();
  for (const t of tieuDes) if (!(t in map)) map[t] = "";
  for (const t of tieuDes) map[t] = map[t].replace(/^\*+\s*/, "").replace(/\s*\*+$/, "").trim();
  return map;
}

// ------------------------------------------------------------------ nhiệm vụ
export async function replyAs({ story, conv, messages, nhanVat, onChunk, auto = false, loaiTask = "" }) {
  const nguoiChoi = tenNguoiChoi(story);
  const thamGia = story.nhanVats.filter((c) => (conv.nhanVatIds || []).includes(c.id));
  const others = [nguoiChoi, ...thamGia.filter((c) => c.id !== nhanVat.id).map((c) => c.ten)];
  const goiY = nhanVat.cachNoi ? "\n- Gợi ý giọng điệu: " + nhanVat.cachNoi : "";

  if (loaiTask === "chamSocSau") {
    const taskCS =
      'Viết tin nhắn TIẾP THEO với tư cách là nhân vật "' + nhanVat.ten + '", ĐANG Ở NGOÀI CẢNH — chăm sóc sau.\n' +
      "- Người chơi vừa dừng cảnh (từ khoá dừng, hoặc cảnh đã kết thúc). Nhân vật thoát hẳn vai: không còn mệnh lệnh, không còn trò chơi quyền lực.\n" +
      "- Kiểm tra người chơi trước tiên (cảm giác cơ thể, chỗ nào đau, có cần gì), rồi mới nói về cảm xúc.\n" +
      "- Làm những việc cụ thể: nước, chăn, thuốc, lau mồ hôi, thả dây, kiểm tra vết hằn. Nói bằng giọng thật, không diễn.\n" +
      "- 3 đến 6 câu. Có thể im lặng một nhịp. Không vội quay lại cảnh mới, không biến chăm sóc thành một màn chơi khác.\n" +
      QUY_UOC_TRINH_BAY +
      "- Chỉ viết phần của " + nhanVat.ten + ", TUYỆT ĐỐI không viết thay " + nguoiChoi + "." +
      goiY +
      "\nBắt đầu viết ngay:";
    const resCS = await streamText({
      instruction: buildPrompt(story, conv, messages, taskCS),
      startWith: nhanVat.ten + ": ",
      stopSequences: others.map((n) => "\n" + n + ":").concat(["\n\n\n"]),
      onChunk,
    });
    if (resCS.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
    return { text: cleanReply(resCS.text, nhanVat.ten, others), khep: null };
  }

  if (loaiTask === "thuongLuong") {
    const taskTL =
      'Viết tin nhắn TIẾP THEO với tư cách là nhân vật "' + nhanVat.ten + '" — một buổi THƯƠNG LƯỢNG trước cảnh.\n' +
      "- Chưa có cảnh nào. Hai người đang nói thẳng với nhau về mong muốn, giới hạn, từ khoá dừng, và điều gì sẽ xảy ra nếu một bên muốn dừng.\n" +
      "- Nhân vật chủ động hỏi những câu cụ thể (điều gì không được chạm tới, chịu được tới đâu, dấu hiệu nào thì dừng), và nói rõ giới hạn của chính mình.\n" +
      "- Giữ giọng riêng của nhân vật, có thể có căng thẳng hoặc ham muốn, nhưng không lấn tới hành động. Mục tiêu là tin nhau.\n" +
      QUY_UOC_TRINH_BAY +
      "- 3 đến 6 câu. Chỉ viết phần của " + nhanVat.ten + ", TUYỆT ĐỐI không viết thay " + nguoiChoi + "." +
      goiY +
      "\nBắt đầu viết ngay:";
    const resTL = await streamText({
      instruction: buildPrompt(story, conv, messages, taskTL),
      startWith: nhanVat.ten + ": ",
      stopSequences: others.map((n) => "\n" + n + ":").concat(["\n\n\n"]),
      onChunk,
    });
    if (resTL.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
    return { text: cleanReply(resTL.text, nhanVat.ten, others), khep: null };
  }

  const task =
    'Viết tin nhắn TIẾP THEO với tư cách là nhân vật "' + nhanVat.ten + '".' +
    "\n- Viết 1 đến 4 câu (dài hơn một chút nếu cần mô tả hành động, bối cảnh hoặc suy nghĩ)." +
    "\n- Giữ đúng tính cách, cách nói, và hiểu biết của " + nhanVat.ten + " — chỉ biết những gì nhân vật này đã chứng kiến hoặc được kể." +
    "\n- Chỉ viết phần của " + nhanVat.ten + ". KHÔNG viết lời thoại, suy nghĩ hay hành động của nhân vật khác, TUYỆT ĐỐI không viết thay " + nguoiChoi + "." +
    QUY_UOC_TRINH_BAY +
    (auto
      ? "\n- Người chơi chưa nói gì. Hãy để nhân vật tự nhiên tiếp tục diễn biến hoặc lên tiếng trước."
      : "\n- Đáp lại tin nhắn mới nhất của " + nguoiChoi + " một cách tự nhiên, không lặp lại lời họ.") +
    dongHeLo(story, hienDienCua(story, conv), conv) +
    "\n- Ngay sau khi đoạn văn kết thúc, ghi đúng MỘT dòng cuối: " + MOC_KHEP +
      " có hoặc không — chỉ ghi \"có\" khi cao trào hoặc một mục tiêu nhỏ vừa được giải quyết và câu chuyện đang ở điểm nghỉ tự nhiên. " +
      "KHÔNG ghi \"có\" giữa cao trào, khi người chơi còn phải phản ứng ngay, khi xung đột chưa có nhịp dừng, hoặc khi phần chăm sóc sau chưa xong. Nghi ngờ thì ghi \"không\"." +
    goiY +
    "\nBắt đầu viết ngay:";
  const instruction = buildPrompt(story, conv, messages, task);
  const res = await streamText({
    instruction,
    startWith: nhanVat.ten + ": ",
    stopSequences: others.map((n) => "\n" + n + ":").concat(["\n\n\n"]),
    onChunk,
  });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  const rawTC = res.text || "";
  return { text: cleanReply(catDieuKhien(rawTC), nhanVat.ten, others), raw: rawTC, khep: docKhep(rawTC) };
}

// Bộ điều phối ẩn: chọn từ 1 tới `toiDa` nhân vật ĐANG CÓ MẶT sẽ phản hồi lượt này.
// Không bắt mọi nhân vật cùng lên tiếng — chỉ ai thật sự có lý do.
export async function pickSpeakers({ story, conv, messages, toiDa }) {
  const thamGia = story.nhanVats.filter((c) => hienDienCua(story, conv).indexOf(c.id) >= 0);
  if (thamGia.length <= 1) return thamGia.map((c) => c.id);
  const nguoiChoi = tenNguoiChoi(story);
  const tail = messages.slice(-8).map((m) => logLine(story, m)).join("\n\n");
  const instruction =
    "Dưới đây là một đoạn hội thoại nhập vai. Hãy quyết định nhân vật nào sẽ lên tiếng tiếp theo.\n\n" +
    "Danh sách nhân vật đang có mặt và có thể lên tiếng: " + thamGia.map((c) => c.ten).join(", ") + "\n" +
    "Người chơi tên là " + nguoiChoi + " (không bao giờ được chọn).\n\n" +
    "HỘI THOẠI:\n" + tail + "\n\n" +
    "TASK: Chọn từ 1 đến " + toiDa + " nhân vật sẽ phản hồi tin nhắn mới nhất, theo thứ tự hợp lý.\n" +
    "- Chỉ chọn những người thật sự có lý do phản ứng; KHÔNG chọn tất cả nếu không cần thiết.\n" +
    "- Nếu tin nhắn mới nhất nhắm vào hoặc gọi tên một nhân vật cụ thể thì nhân vật đó phải đứng đầu.\n" +
    "- Nhân vật không liên quan hoặc không có gì để nói thì đừng chọn.\n" +
    "Trả về DUY NHẤT tên các nhân vật, mỗi tên một dòng, không thêm gì khác.";
  const res = await streamText({ instruction, stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") return [thamGia[0].id];
  const lines = splitLines(res.text);
  const picked = [];
  for (const l of lines) {
    const c = thamGia.find((x) => x.ten.toLowerCase() === l.toLowerCase()) || thamGia.find((x) => l.toLowerCase().includes(x.ten.toLowerCase()));
    if (c && !picked.includes(c.id)) picked.push(c.id);
    if (picked.length >= toiDa) break;
  }
  if (!picked.length) picked.push(thamGia[Math.floor(Math.random() * thamGia.length)].id);
  return picked;
}

// ------------------------------------------------------- phản hồi cảnh nhóm
// Khối điều khiển nằm CUỐI phản hồi (AI vẫn phải sinh ra nó, nhưng nó bị cắt khỏi
// phần chữ hiển thị/lưu vào tin nhắn). Xem `catDieuKhien` / `docHienDien`.
const MOC_HD = "<<HIENDIEN>>";
const MOC_HET = "<<HET>>";
const MOC_KHEP = "<<KHEP>>";

// Quy ước trình bày để lớp hiển thị tách được lời thoại và hành động (xem
// `fmtBongBong` trong `src/dom.js`). Đây chỉ là QUY ƯỚC VIẾT: nếu model không theo,
// phản hồi vẫn được nhận và hiển thị bình thường.
const QUY_UOC_TRINH_BAY =
  "- Trình bày: hành động, cử chỉ, miêu tả đặt trong *dấu sao*; lời nói trực tiếp đặt trong dấu ngoặc kép.\n";

// Bốn marker điều khiển của app. Chỉ những chuỗi NÀY mới được coi là khối điều khiển —
// cắt ở mọi dấu "<" (cách làm cũ) sẽ ăn mất phần sau của những câu như "2 < 10" hay "<3".
function dauMarker() {
  return ["<<HIENDIEN", "<<KHEP", "<<HET", MOC_HELO];
}
// Vị trí marker ĐÃ BIẾT đầu tiên trong chuỗi (-1 nếu không có).
function viTriMarker(t) {
  const re = /<<\s*([A-Za-zĐđ_À-ỹ]+)/g;
  let m;
  while ((m = re.exec(t))) {
    const ten = m[1].toUpperCase();
    if (dauMarker().some((x) => x.startsWith("<<" + ten))) return m.index;
  }
  return -1;
}
// Đuôi chuỗi (bắt đầu từ dấu "<" cuối cùng) có phải là TIỀN TỐ của một marker không?
// Chỉ khi đó mới được cắt: "<3", "< 10", "<<ngạc nhiên>>" đều là chữ thường, giữ nguyên.
function duoiLaTienToMarker(duoi) {
  if (!duoi || duoi[0] !== "<") return false;
  const u = duoi.toUpperCase();
  return dauMarker().some((x) => x.startsWith(u) || u.startsWith(x));
}

// Cắt bỏ khối điều khiển khỏi văn bản đang stream: cắt tại marker đã biết đầu tiên, hoặc
// — khi marker mới được sinh một nửa — cắt tại hậu tố đang là tiền tố của một marker.
export function catDieuKhien(s) {
  const t = s || "";
  const i = viTriMarker(t);
  if (i >= 0) return t.slice(0, i);
  const j = t.lastIndexOf("<");
  if (j >= 0 && duoiLaTienToMarker(t.slice(j))) return t.slice(0, j);
  return t;
}

// Đọc tên những nhân vật còn có mặt sau lượt này từ khối điều khiển. Trả về mảng id
// (đã lọc theo nhân vật của truyện) hoặc null nếu model không ghi khối đó. MẢNG RỖNG
// là kết quả hợp lệ: "trong cảnh chỉ còn người chơi" (model ghi KHÔNG CÓ AI, hoặc chỉ
// ghi tên người chơi). Chỉ khi thiếu hẳn khối — hoặc khối không đọc ra được gì — mới
// trả null để giữ nguyên hiện diện cũ.
function docHienDien(story, conv, raw) {
  const i = String(raw || "").indexOf(MOC_HD);
  if (i < 0) return null;
  let rest = raw.slice(i + MOC_HD.length);
  const j = rest.indexOf("<<");
  if (j >= 0) rest = rest.slice(0, j);
  const ten = rest
    .replace(/^[>>:\-\s]+/, "")
    .split(/[\n,;|/]+/)
    .map((s) => s.replace(/^[\s\-•*\d.)\]]+/, "").trim())
    .filter(Boolean);
  if (!ten.length) return null;
  const tat = story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0);
  const chuan = (s) => khongDau(s);
  const nguoiChoi = tenNguoiChoi(story);
  const ids = [];
  let chiNguoiChoi = false; // có mục được hiểu là "không còn nhân vật nào"
  for (const t of ten) {
    // Người chơi không nằm trong danh sách nhân vật: có mặt trong đó nghĩa là cảnh
    // chỉ còn mình người chơi.
    if (chuan(t) === chuan(nguoiChoi)) { chiNguoiChoi = true; continue; }
    if (/^(tat ca|ca nhom|moi nguoi|toan bo|all|everyone)\b/i.test(chuan(t))) return tat.map((c) => c.id);
    if (/^(khong co ai|khong mot ai|khong con ai|chang ai|khong ai|khong nguoi nao|chi con nguoi choi|chi co nguoi choi|mot minh nguoi choi|nobody|no one|none)\b/i.test(chuan(t))) return [];
    const c =
      tat.find((x) => chuan(x.ten) === chuan(t)) ||
      tat.find((x) => chuan(t).indexOf(chuan(x.ten)) >= 0) ||
      tat.find((x) => chuan(x.ten).indexOf(chuan(t)) >= 0);
    if (c && ids.indexOf(c.id) < 0) ids.push(c.id);
  }
  return ids.length || chiNguoiChoi ? ids : null;
}

// Đọc tín hiệu "cảnh đã tới điểm nghỉ" (MOC_KHEP). true/false, hoặc null nếu model
// không ghi gì — khi đó KHÔNG gợi ý khép cảnh.
export function docKhep(raw) {
  const s = String(raw || "");
  const i = s.indexOf(MOC_KHEP);
  if (i < 0) return null;
  let rest = s.slice(i + MOC_KHEP.length);
  const j = rest.indexOf("<<");
  if (j >= 0) rest = rest.slice(0, j);
  const t2 = khongDau(rest).toLowerCase().replace(/^[^a-z0-9]+/, "").trim();
  if (!t2) return null;
  if (/^(khong|no|chua|khong nen|chua toi|chua nen)/.test(t2)) return false;
  if (/^(co|yes|nen|dung|phai|roi|da toi|toi diem nghi|diem nghi)/.test(t2)) return true;
  return null;
}

// Một lần sinh duy nhất cho cả một lượt nhóm: trả về MỘT đoạn cảnh thống nhất, có
// thể gồm nhiều nhân vật đối đáp với nhau. `goiTen` là những cái tên người chơi vừa
// gọi (được ưu tiên nhưng không bắt buộc phải đồng ý), `goiVang` là tên được gọi mà
// người đó không có mặt.
export async function replyAsGroup({ story, conv, messages, nhanVats, onChunk, goiTen = [], goiVang = [], moDau = false }) {
  const nguoiChoi = tenNguoiChoi(story);
  const ten = nhanVats.map((c) => c.ten);
  let task;
  if (moDau) {
    task =
      "Viết tin nhắn MỞ ĐẦU cho hội thoại này — MỘT đoạn cảnh liền mạch, có " + ten.join(", ") + ".\n" +
      "- 4 đến 8 câu: dựng không khí, vị trí, thời điểm, và đặt " + nguoiChoi + " vào một tình huống cần phản ứng.\n" +
      "- " + (ten.length > 1 ? "Các nhân vật nói chuyện, quan sát hoặc phản ứng với nhau ít nhất một lần; " : "") +
      "mỗi người giữ đúng giọng riêng.\n" +
      "- Chưa giải quyết xung đột; kết thúc bằng một chi tiết khiến " + nguoiChoi + " muốn lên tiếng.\n" +
      (story.giaoKeo && story.giaoKeo.bat
        ? "- Đây là cảnh BDSM M/M: dựng không khí và tương quan quyền lực ngay từ đầu, để " + nguoiChoi +
          " thấy rõ mình đang ở vai nào và rằng mọi thứ nằm trong một thoả thuận đã có. Chưa đi thẳng vào hành động nặng.\n"
        : "");
  } else {
    task =
      "Viết MỘT đoạn cảnh tiếp theo cho hội thoại nhóm ở trên.\n" +
      "- Người được phép lên tiếng và hành động trong đoạn này CHỈ GỒM: " + ten.join(", ") +
      ". Những ai đang có mặt nhưng không có tên ở đây thì giữ im lặng (không nói thoại, không hành động).\n" +
      "- " +
      (ten.length > 1
        ? "Viết thành một mạch văn liền mạch như tiểu thuyết: các nhân vật trên đối đáp, tranh luận, phối hợp hoặc phản ứng với nhau vài nhịp; " +
          "không chia thành các khối “Tên A:” / “Tên B:” rời rạc. "
        : "Viết thành một mạch văn tự nhiên, không mở đầu bằng tên nhân vật kèm dấu hai chấm. ") +
      "Người đọc phải luôn biết ai đang nói nhờ cách gọi tên, cách xưng hô hoặc mô tả.\n" +
      "- Mỗi nhân vật giữ đúng giọng riêng và chỉ biết những gì mình có thể biết. Họ được chủ động nêu yêu cầu, tạo tình huống, mắc lỗi, phản đối, " +
      "từ chối hoặc giấu giếm điều gì đó nếu hợp hồ sơ và diễn biến.\n" +
      "- Kết thúc đoạn bằng cách để lại khoảng trống hành động cho " + nguoiChoi + " (một câu hỏi, một ánh mắt chờ đợi, một khoảng lặng). " +
      "TUYỆT ĐỐI không viết lời nói, suy nghĩ, cảm xúc, quyết định hay hành động của " + nguoiChoi + ".\n" +
      "- Độ dài 4 đến 9 câu.\n" +
      (goiTen.length
        ? "- " + nguoiChoi + " vừa gọi tên " + goiTen.join(", ") + ". Đó là người phản hồi chính; nhưng họ KHÔNG buộc phải đồng ý — " +
          "họ có thể im lặng, từ chối hoặc phản đối nếu đúng tính cách và tình huống.\n"
        : "") +
      (goiVang.length
        ? "- " + nguoiChoi + " có gọi " + goiVang.join(", ") + " nhưng người đó KHÔNG có mặt trong cảnh. Không được để họ xuất hiện hay lên tiếng; " +
          "nhân vật đang có mặt có thể phản ứng với việc cái tên đó được nhắc tới.\n"
        : "");
  }
  task +=
    QUY_UOC_TRINH_BAY +
    "- Trong đoạn văn, TUYỆT ĐỐI không dùng ký tự < hoặc >.\n" +
    "- Ngay sau khi đoạn văn kết thúc, ghi đúng ba dòng sau và không viết gì thêm:\n" +
    MOC_HD + " tên các nhân vật có mặt trong cảnh SAU đoạn này, cách nhau dấu phẩy — nếu cảnh KHÔNG còn nhân vật nào thì ghi KHÔNG CÓ AI\n" +
    MOC_KHEP + " có hoặc không — cảnh đã tới điểm nghỉ tự nhiên chưa\n" +
    (dongHeLo(story, nhanVats.map((c) => c.id), conv) ? MOC_HELO + " S1, S2>> — mã trong ngoặc vuông của (các) sự kiện vừa lộ, không có thì bỏ hẳn dòng này\n" : "") +
    MOC_HET +
    "- Chỉ ghi “có” ở dòng khép cảnh khi cao trào hoặc một mục tiêu nhỏ đã được giải quyết và câu chuyện đang ở điểm nghỉ. " +
    "KHÔNG ghi “có” giữa cao trào, khi người chơi còn phải phản ứng ngay, khi xung đột chưa có nhịp dừng, " +
    "hoặc khi phần chăm sóc sau chưa xong. Nghi ngờ thì ghi “không”.";
  const res = await streamText({
    instruction: buildPrompt(story, conv, messages || [], task),
    stopSequences: [MOC_HET],
    onChunk,
  });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  const raw = res.text || "";
  const text = cleanText(catDieuKhien(raw)).replace(/\n{3,}/g, "\n\n");
  const hienDien = docHienDien(story, conv, raw);
  return { text, hienDien, raw, khep: docKhep(raw) };
}

// Gợi ý lời đáp cho người chơi. Trả MẢNG gợi ý; ném lỗi khi lượt gọi hỏng hoặc không đọc
// được gợi ý nào — nhờ vậy giao diện giữ nguyên danh sách cũ + bản nháp và hiện nút Thử
// lại, thay vì âm thầm xoá mất danh sách người dùng đang xem.
export async function suggestLines({ story, conv, messages }) {
  moPhienSinh();
  const n = CFG.soTuGoiY || 3;
  const nguoiChoi = tenNguoiChoi(story);
  const task =
    "Đưa ra đúng " + n + " gợi ý cho " + nguoiChoi + " về câu có thể nói tiếp theo trong cảnh này.\n" +
    "- Mỗi gợi ý một dòng, bắt đầu bằng dấu gạch ngang, dài dưới 25 từ.\n" +
    "- " + n + " gợi ý phải KHÁC NHAU RÕ RỆT về ý định, cảm xúc hoặc hành động (ví dụ: một câu hỏi, một hành động, một lời từ chối, một câu đùa, một lời thú nhận) — không được chỉ đổi vài từ.\n" +
    "- Viết ở ngôi thứ nhất như thể " + nguoiChoi + " đang nói, dùng *dấu sao* cho hành động.\n" +
    "- Không thêm lời dẫn hay đánh số.";
  const res = await streamText({ instruction: buildPrompt(story, conv, messages, task), stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") throw new Error("Không lấy được gợi ý — kiểm tra kết nối rồi thử lại.");
  const list = (res.text || "")
    .split("\n")
    .map((l) => l.replace(/^[\s\-•\d.)\]]+/, "").trim())
    .filter(Boolean)
    .slice(0, n + 2);
  if (!list.length) throw new Error("AI không trả về gợi ý nào — thử lại nhé.");
  return list;
}

// ------------------------------------------------------------ tóm tắt tích luỹ
// Bản tóm tắt KHÔNG bao giờ bị thay thế: mỗi lần nén chỉ gộp phần mới vào bản cũ.
// Đoạn dài hơn ngân sách được cắt thành nhiều lượt rồi gộp dần, nên không có đoạn
// nào ở giữa bị bỏ sót — kể cả khi hội thoại dài gấp nhiều lần cửa sổ ngữ cảnh.
const NGAN_SACH_TOM_TAT = (Number(CFG.soKyTuMoiDoanTomTat) > 0 ? Number(CFG.soKyTuMoiDoanTomTat) : 14000);

function chiaDoan(story, msgs) {
  const dai = (m) => ((logLine(story, m) || "").length + 2);
  const tong = msgs.reduce((a, m) => a + dai(m), 0);
  const soDoan = Math.max(1, Math.ceil(tong / NGAN_SACH_TOM_TAT));
  const tran = Math.ceil(tong / soDoan) + 400;
  const doans = [];
  let cur = [];
  let len = 0;
  for (const m of msgs) {
    const l = dai(m);
    if (cur.length && len + l > tran) {
      doans.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(m);
    len += l;
  }
  if (cur.length) doans.push(cur);
  return doans;
}

async function tomTatMotDoan({ story, conv, msgs, tomTatCu }) {
  const tmp = Object.assign({}, conv, { tomTat: "", tomTatDen: 0 });
  const cu = (tomTatCu || "").trim();
  const boundary = (msgs[msgs.length - 1].noiDung || "").slice(-32).replace(/\s+/g, " ");
  const task =
    "Viết bản TÓM TẮT TÍCH LUỸ cho phần diễn biến của hội thoại ở trên.\n" +
    (cu ? "- Phần “Tóm tắt trước đó” ở trên là bản tóm tắt những gì đã xảy ra TRƯỚC đoạn này; mọi chi tiết trong đó vẫn còn đúng và phải được giữ lại.\n" : "") +
    "- Gộp phần cũ (nếu có) với đoạn diễn biến mới thành MỘT đoạn văn liền mạch 4 đến 8 câu, tiếng Việt tự nhiên.\n" +
    "- Giữ lại: tên riêng, sự kiện đã xảy ra, lời hứa, bí mật được tiết lộ, cảm xúc dai dẳng, thay đổi trong quan hệ giữa các nhân vật.\n" +
    '- Chỉ tính tới hết tin nhắn cuối cùng kết thúc bằng: "' + boundary + '". Bỏ qua mọi tin nhắn sau đó.\n' +
    "- Nếu trong đoạn có dòng bắt đầu bằng [CẢNH RIÊNG với X], phải giữ lại thông tin đó kèm nhãn “(cảnh riêng với X)” và nói rõ chỉ X cùng " +
    tenNguoiChoi(story) + " biết chuyện đó.\n" +
    "- Không dùng gạch đầu dòng, không nhắc tới việc đang tóm tắt, không thêm lời bình luận.";
  const parts = [buildContext(story, tmp)];
  // KHÔNG dùng buildLog ở đây: buildLog cắt còn `soTinNhanGiuNguyenVan` tin nhắn cuối,
  // mà đoạn đang tóm tắt có thể dài hơn — dùng nó sẽ làm rơi mất phần đầu của đoạn.
  const dong = msgs.map((m) => logLine(story, m)).filter((l) => l !== "");
  parts.push("# DIỄN BIẾN CỦA ĐOẠN NÀY (cũ nhất ở trên)\n" + (dong.length ? dong.join("\n\n") : "(không có nội dung)"));
  const lore = buildLore(story, tmp, msgs);
  if (lore) parts.push(lore);
  if (cu) parts.push("Tóm tắt trước đó (vẫn còn đúng, phải giữ lại):\n" + cu);
  const instruction = parts.join("\n\n") + "\n\nTASK: " + task;
  const res = await streamText({ instruction, stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") return null;
  const text = cleanText(res.text).replace(/\n+/g, " ");
  return text || null;
}

// Tóm tắt liên tục đoạn [start, end) của hội thoại rồi gộp vào bản tóm tắt cũ.
export async function summarizeConversation({ story, conv, messages, foldEnd, tomTatCu }) {
  moPhienSinh();
  const start = Math.min(conv.tomTatDen || 0, messages.length);
  const end = foldEnd === undefined ? messages.length : Math.min(foldEnd, messages.length);
  const slice = messages.slice(start, end);
  let sum = String(tomTatCu !== undefined ? tomTatCu || "" : conv.tomTat || "").trim();
  if (!slice.length) return null;
  if (slice.length < 4 && !sum) return null;
  const doans = chiaDoan(story, slice);
  for (const doan of doans) {
    const moi = await tomTatMotDoan({ story, conv, msgs: doan, tomTatCu: sum });
    if (moi === null) return null;
    sum = moi;
  }
  return sum;
}

export async function extractFacts({ story, conv, messages, soLuong = 4 }) {
  moPhienSinh();
  const task =
    "Rút ra tối đa " + soLuong + " sự kiện hoặc chi tiết quan trọng NHẤT vừa xảy ra trong hội thoại ở trên.\n" +
    "- Chỉ lấy những điều còn đúng về sau (ví dụ: một lời hứa, một bí mật, một cái chết, một món đồ được trao, một mối quan hệ thay đổi).\n" +
    "- Mỗi dòng bắt đầu bằng dấu gạch ngang, là một câu đầy đủ, tự đứng một mình vẫn hiểu được (dùng tên riêng, không dùng đại từ).\n" +
    "- Không lặp lại những gì đã có trong biên niên sử ở trên.";
  const res = await streamText({ instruction: buildPrompt(story, conv, messages, task), stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") return [];
  return splitLines(res.text).slice(0, soLuong);
}

// ------------------------------------------------------------------ chương
// Bản tóm tắt LIÊN TỤC của một hội thoại: phủ từ tin nhắn đầu tới `den`, không bỏ
// sót đoạn nào. Nếu đã có bản tóm tắt cũ thì chỉ gộp thêm phần chưa được tóm tắt.
async function tomTatLienTucHt({ story, conv, msgs, den }) {
  const slice = msgs.slice(0, den);
  if (!slice.length) return "";
  let sum = (conv.tomTat || "").trim();
  let start = Math.min(conv.tomTatDen || 0, slice.length);
  if (!sum || start > slice.length) start = 0; // mất tóm tắt cũ thì tóm lại từ đầu
  if (start >= slice.length) return sum;
  const doans = chiaDoan(story, slice.slice(start));
  for (const doan of doans) {
    const moi = await tomTatMotDoan({ story, conv, msgs: doan, tomTatCu: sum });
    if (moi === null) throw new Error("Không tóm tắt được hội thoại “" + conv.tieuDe + "”. Thử lại sau.");
    sum = moi;
  }
  return sum;
}

export async function concludeChapter({ story, chuong, onTienDo }) {
  moPhienSinh();
  const convs = story.hoiThoais.filter((c) => c.chuongId === chuong.id);
  const blocks = [];
  const tomTatTheoHt = {};
  const GIU = (Number(CFG.soTinNhanGiuLaiKhiKetChuong) > 0 ? Number(CFG.soTinNhanGiuLaiKhiKetChuong) : 8); // số tin nhắn cuối giữ nguyên văn (phần trước đó được tóm tắt liên tục)
  for (const c of convs) {
    const msgs = ((window.__tv_getMessages ? window.__tv_getMessages(c.id) : []) || []).filter((m) => m && m.vai !== "anh");
    const den = Math.max(0, msgs.length - GIU);
    if (onTienDo && den > 0) onTienDo("Đang gộp diễn biến hội thoại “" + c.tieuDe + "”…");
    let sum = "";
    if (den > 0) sum = await tomTatLienTucHt({ story, conv: c, msgs, den });
    const tail = msgs.slice(den).map((m) => logLine(story, m)).filter(Boolean);
    if (!tail.length && !sum) continue;
    tomTatTheoHt[c.id] = { tomTat: sum, tomTatDen: den };
    blocks.push(
      "## Hội thoại: " + c.tieuDe + "\n" +
        (sum ? "Tóm tắt diễn biến tới giờ: " + sum + "\n" : "") +
        (tail.length ? "Tin nhắn cuối:\n" + tail.join("\n") : "")
    );
  }
  const thamGia = story.nhanVats.map((c) => "- " + c.ten + (c.vaiTro ? " (" + c.vaiTro + ")" : "")).join("\n");
  const instruction =
    "Bạn là người ghi chép cho một cốt truyện nhập vai. Dưới đây là toàn bộ diễn biến của một chương.\n\n" +
    "# CỐT TRUYỆN\nTên: " + story.ten + "\n" + (story.boiCanh ? "Bối cảnh: " + story.boiCanh + "\n" : "") +
    "\n# NHÂN VẬT\n" + thamGia + "\n\n" +
    (story.bienNienSu && story.bienNienSu.length
      ? "# BIÊN NIÊN SỬ ĐÃ CÓ\n" + story.bienNienSu.map((b) => "- " + b.noiDung).join("\n") + "\n\n"
      : "") +
    "# CHƯƠNG " + chuong.so + ": " + chuong.tieuDe + "\n" + (chuong.mucTieu ? "Mục tiêu: " + chuong.mucTieu + "\n" : "") +
    "\n" + (blocks.length ? blocks.join("\n\n") : "(chưa có hội thoại nào trong chương này)") +
    "\n\nTASK: Viết bản tổng kết cho chương này, theo đúng ba mục dưới đây và dùng đúng các tiêu đề đó:\n" +
    "TÓM TẮT:\n(một đoạn 4 đến 7 câu, kể lại chương đã diễn ra thế nào, giọng văn tự nhiên)\n" +
    "SỰ KIỆN:\n(tối đa 5 gạch đầu dòng, mỗi dòng là một sự kiện còn đúng về sau, có tên riêng cụ thể, không lặp lại biên niên sử đã có)\n" +
    "CHƯƠNG TIẾP THEO:\nTiêu đề: (một tiêu đề ngắn, hấp dẫn)\nMục tiêu: (một câu mô tả điều cần đạt được trong chương sau, gợi mở xung đột mới)";
  const res = await streamText({ instruction, stopSequences: ["\n\n\nTASK", "\n\n\n# "] });
  if (res.stopReason === "error") throw new Error("Không tạo được tổng kết chương. Thử lại sau.");
  const text = res.text;
  const m = bocTach(text, ["TÓM TẮT", "SỰ KIỆN", "CHƯƠNG TIẾP THEO"]);
  const tomTat = m["TÓM TẮT"];
  const suKienRaw = m["SỰ KIỆN"];
  const nextRaw = m["CHƯƠNG TIẾP THEO"];
  const tieuDe = ((nextRaw.match(/Tiêu đề\s*:\s*(.+)/i) || [])[1] || "").trim();
  const mucTieu = ((nextRaw.match(/Mục tiêu\s*:\s*([\s\S]+)/i) || [])[1] || "").trim();
  return { tomTat, suKien: splitLines(suKienRaw).slice(0, 5), tieuDe, mucTieu, raw: text, tomTatTheoHt };
}

// ------------------------------------------------------------------ tạo nội dung
export async function generateStorySeed({ theLoai, yTuong, giaoKeo = null }) {
  moPhienSinh();
  const g = giaoKeo && giaoKeo.bat ? giaoKeo : null;
  const kieuRaw = g ? ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((k) => k.id === g.kieuQuanHe) : null;
  const kieu = kieuRaw && kieuRaw.id !== "the-gioi-mo" ? kieuRaw : null;
  const instruction =
    "Bạn giúp người dùng dựng một cốt truyện nhập vai tiếng Việt.\n\n" +
    "Thể loại: " + (theLoai ? theLoai.ten + " (" + theLoai.khongKhi + ")" : "tự do") + "\n" +
    (theLoai && theLoai.goiY ? "Gợi ý nền: " + theLoai.goiY + "\n" : "") +
    (theLoai && theLoai.bdsm
      ? "Đây là truyện BDSM nam–nam (M/M) có trao đổi quyền lực giữa những người trưởng thành. " +
        "Hãy dựng bối cảnh có luật lệ rõ ràng, một mối quan hệ đã hoặc sắp có thoả thuận, và một xung đột thật về quyền lực và lòng tin — " +
        "không phải bạo lực đơn thuần.\n"
      : "") +
    (g
      ? "Giao kèo đã thiết lập: người chơi ở vai " + (g.vaiNguoiChoi || "sub") +
        ", mức độ " + (g.mucDo || 3) + "/5" +
        (kieu ? ", khung quan hệ: " + kieu.ten : "") +
        (g.khongKhi ? ", bối cảnh cảnh: " + g.khongKhi : "") +
        ". Bối cảnh bạn viết phải tự nhiên dẫn tới kiểu quan hệ đó — dựng sẵn nơi chốn, luật lệ và cách hai người gặp nhau.\n"
      : "") +
    "Ý tưởng của người dùng: " + (yTuong || "(chưa có, hãy tự sáng tạo)") + "\n\n" +
    "TASK: Viết phần chuẩn bị cho cốt truyện này, đúng ba mục dưới đây và dùng đúng các tiêu đề đó:\n" +
    "BỐI CẢNH:\n(4 đến 6 câu: không gian, thời gian, tình hình hiện tại, điều đang đe doạ hoặc thôi thúc mọi người)\n" +
    "LUẬT:\n(2 đến 4 gạch đầu dòng: những điều luôn đúng trong thế giới này, dùng để giữ truyện nhất quán)\n" +
    "MỤC TIÊU:\n(một câu mô tả mục tiêu của chương đầu tiên, gợi mở một xung đột cụ thể)";
  const res = await streamText({ instruction, stopSequences: ["\n\n\nTASK"] });
  if (res.stopReason === "error") throw new Error("Không tạo được gợi ý. Thử lại sau.");
  const text = res.text;
  const m = bocTach(text, ["BỐI CẢNH", "LUẬT", "MỤC TIÊU"]);
  return { boiCanh: m["BỐI CẢNH"], luat: m["LUẬT"], mucTieu: m["MỤC TIÊU"] };
}

// ------------------------------------------------------------ tạo nhanh
// Một lời gọi duy nhất dựng cả bản nháp: tên, thể loại, bối cảnh, luật thế giới,
// nhân vật của người chơi, và vài nhân vật AI. Người dùng duyệt lại rồi mới tạo.
function docNhanhNhanVat(text) {
  const ds = [];
  for (const raw of String(text || "").split("\n")) {
    const line = raw.replace(/^\s*[-•*\d.)]+\s*/, "").trim();
    if (!/^TÊN\s*[:：]/i.test(line)) continue;
    const c = {};
    for (const phan of line.split("|")) {
      const m = phan.match(/^\s*([^:：]{1,22}?)\s*[:：]\s*([\s\S]*)$/);
      if (!m) continue;
      const nhan = khongDau(m[1]);
      const v = m[2].trim();
      if (/^TEN/.test(nhan)) c.ten = v;
      else if (/^VAI TRO|^VAI$|^ROLE/.test(nhan)) c.vaiTro = v;
      else if (/^MO TA/.test(nhan)) c.moTa = v;
      else if (/^TINH CACH/.test(nhan)) c.tinhCach = v;
      else if (/^CACH NOI/.test(nhan)) c.cachNoi = v;
      else if (/^BI MAT/.test(nhan)) c.ghiChu = v ? "Bí mật: " + v : "";
      else if (/^VAI BDSM/.test(nhan)) c.vaiBdsm = v;
      else if (/^GIOI HAN CUNG/.test(nhan)) c.gioiHanCung = v;
      else if (/^GIOI HAN/.test(nhan)) c.gioiHan = v;
      else if (/^DANH XUNG/.test(nhan)) c.danhXung = v;
      else if (/^LUAT RIENG/.test(nhan)) c.luatRieng = v;
      else if (/^CHAM SOC/.test(nhan)) c.chamSocSau = v;
      else if (/^KHAU VI/.test(nhan)) c.khauVi = v;
      else if (/^PHONG CACH/.test(nhan)) c.phongCach = v;
      else if (/^KINH NGHIEM/.test(nhan)) c.kinhNghiem = v;
      else if (/^SO THICH/.test(nhan)) c.soThich = tenSoThichTheoTen(v);
    }
    if (c.ten) ds.push(c);
  }
  return ds;
}

export async function generateQuickStory({ yTuong, theLoai, soNhanVat = 3, giaoKeo = null, bdsm = false, laDanChuyen = false }) {
  moPhienSinh();
  const g = giaoKeo && giaoKeo.bat ? giaoKeo : null;
  const batBdsm = !!bdsm || !!g;
  const n = Math.max(1, Math.min(5, Number(soNhanVat) || 3));
  const dsThich = (() => {
    try { return ((R.SoThichBdsm && R.SoThichBdsm()) || []).map((x) => x.ten); } catch (e) { return []; }
  })();
  const instruction =
    "Bạn dựng một cốt truyện nhập vai tiếng Việt từ một ý tưởng ngắn của người dùng.\\n\\n" +
    "Ý tưởng của người dùng: " + (yTuong || "(trống — hãy tự sáng tạo một ý tưởng thật hấp dẫn)") + "\\n" +
    (theLoai ? "Thể loại người dùng chọn: " + theLoai.ten + (theLoai.khongKhi ? " (" + theLoai.khongKhi + ")" : "") + "\\n" : "") +
    (theLoai && theLoai.goiY ? "Gợi ý nền: " + theLoai.goiY + "\\n" : "") +
    (batBdsm
      ? "Đây là truyện BDSM nam–nam (M/M) giữa những người TRƯỞNG THÀNH, có trao đổi quyền lực. " +
        "Bối cảnh phải có luật lệ rõ ràng và một xung đột thật về quyền lực và lòng tin, không phải bạo lực đơn thuần. " +
        (g ? "Người chơi giữ vai " + (g.vaiNguoiChoi || "sub") + ", mức độ " + (g.mucDo || 3) + "/5. " : "") +
        (dsThich.length ? "Khi ghi SỞ THÍCH, chỉ dùng đúng những tên sau: " + dsThich.join(", ") + ". " : "") +
        "\\n"
      : "") +
    "\\nTASK: Viết bản nháp đầy đủ cho cốt truyện này. Dùng đúng các tiêu đề dưới đây, mỗi tiêu đề một dòng, không thêm lời dẫn nào khác:\\n" +
    "TÊN TRUYỆN: (2 đến 6 từ, gợi không khí)\\n" +
    "MÔ TẢ: (một câu ngắn về điều người chơi sẽ trải nghiệm)\\n" +
    "BỐI CẢNH: (4 đến 6 câu: không gian, thời gian, tình hình hiện tại, điều đang thôi thúc hoặc đe doạ mọi người)\\n" +
    "LUẬT: (2 đến 4 gạch đầu dòng, mỗi dòng một điều luôn đúng trong thế giới này)\\n" +
    "NGƯỜI CHƠI TÊN: (một cái tên ngắn)\\n" +
    "NGƯỜI CHƠI MÔ TẢ: (1 đến 2 câu về nhân vật của người chơi — tuổi, nghề, nét đáng nhớ; người chơi là người trưởng thành)\\n" +
    "MỤC TIÊU CHƯƠNG 1: (một câu nêu xung đột cụ thể của chương đầu)\\n" +
    "NHÂN VẬT: (đúng " + n + " dòng, mỗi dòng bắt đầu bằng dấu gạch ngang và theo đúng khuôn:" +
    " - TÊN: … | VAI TRÒ: … | MÔ TẢ: … | TÍNH CÁCH: … | CÁCH NÓI: … | BÍ MẬT: …" +
    (batBdsm ? " | VAI BDSM: Dom/Sub/Switch | GIỚI HẠN: … | GIỚI HẠN CỨNG: … | DANH XƯNG: …" : "") +
    (laDanChuyen ? "). Người dẫn chuyện không cần thiết ở đây." : "). Mỗi nhân vật phải khác hẳn nhau về động cơ và kiểu quan hệ với người chơi, và đều là người trưởng thành.)");
  const res = await streamText({ instruction, stopSequences: ["\\n\\n\\nTASK"] });
  if (res.stopReason === "error") throw new Error("Không dựng được bản nháp. Thử lại sau.");
  const text = res.text || "";
  const m = bocTach(text, ["TÊN TRUYỆN", "MÔ TẢ", "BỐI CẢNH", "LUẬT", "NGƯỜI CHƠI TÊN", "NGƯỜI CHƠI MÔ TẢ", "MỤC TIÊU CHƯƠNG 1"]);
  const gon = (s) => (s || "").replace(/\\s*\\n\\s*/g, " ").trim();
  return {
    ten: gon(m["TÊN TRUYỆN"]).replace(/["“”]/g, "").slice(0, 80),
    moTa: gon(m["MÔ TẢ"]),
    boiCanh: (m["BỐI CẢNH"] || "").trim(),
    luat: (m["LUẬT"] || "").trim(),
    nguoiChoiTen: gon(m["NGƯỜI CHƠI TÊN"]).replace(/["“”]/g, "").slice(0, 40),
    nguoiChoiMoTa: gon(m["NGƯỜI CHƠI MÔ TẢ"]),
    mucTieu: gon(m["MỤC TIÊU CHƯƠNG 1"]),
    nhanVats: docNhanhNhanVat(text).slice(0, n),
    raw: text,
  };
}

// Khối ngữ cảnh dùng chung cho cả hai bước sinh nhân vật (đề xuất 3 hướng trước,
// rồi mới viết chi tiết), nhờ vậy hai lời gọi AI có cùng tiền tố → tận dụng prefix cache.
function dauNhanVat(story, yTuong, opts = {}) {
  const { laDanChuyen = false, bdsm = null } = opts || {};
  const daCo = story.nhanVats.map((c) => c.ten).join(", ") || "(chưa có)";
  const g = story.giaoKeo || {};
  const batBdsm = (bdsm === null ? !!g.bat : !!bdsm) && !laDanChuyen;
  const kieu = batBdsm ? ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((k) => k.id === g.kieuQuanHe) : null;
  // Tên các sở thích có trong SoThichBds() — để AI chọn đúng từ ngữ, app mới tra ra id được.
  const dsThich = (() => {
    try {
      return ((R.SoThichBdsm && R.SoThichBdsm()) || []).map((x) => x.ten);
    } catch (e) {
      return [];
    }
  })();
  const dau =
    "Bạn tạo nhân vật cho một cốt truyện nhập vai tiếng Việt.\n\n" +
    "Tên truyện: " + story.ten + "\n" +
    (story.boiCanh ? "Bối cảnh: " + story.boiCanh + "\n" : "") +
    (story.theLoaiTen ? "Thể loại: " + story.theLoaiTen + "\n" : "") +
    "Nhân vật đã có: " + daCo + "\n" +
    (story.bienNienSu && story.bienNienSu.length ? "Diễn biến tới giờ: " + story.bienNienSu.slice(-5).map((b) => b.noiDung).join(" / ") + "\n" : "") +
    "\nYêu cầu của người dùng về nhân vật mới: " + (yTuong || "(tự do sáng tạo, hãy làm cho nhân vật thật thú vị và khác biệt với các nhân vật đã có)") +
    (laDanChuyen ? "\nNhân vật này là NGƯỜI DẪN CHUYỆN: kể lại bối cảnh và diễn biến, không phải một người trong truyện." : "") +
    (batBdsm
      ? "\nNhân vật này nằm trong một câu chuyện BDSM nam–nam (M/M) có trao đổi quyền lực. " +
        "Người chơi đang giữ vai " + (g.vaiNguoiChoi || "sub") + ", nên nhân vật của bạn phải là người đối lại cho cân " +
        "(nếu người chơi là sub thì nhân vật là Dom hoặc người nắm quyền; nếu là dom thì nhân vật là sub; nếu là switch thì cũng có thể là switch). " +
        (kieu && kieu.id !== "the-gioi-mo" ? "Khung quan hệ của truyện là " + kieu.ten + " (" + kieu.moTa + "). " : "") +
        "Mức độ đã thoả thuận là " + (g.mucDo || 3) + "/5. " +
        "Mọi nhân vật đều là người trưởng thành. Hãy làm cho nhân vật có ranh giới riêng, biết rõ mình muốn gì, có điểm yếu và một cách riêng để nắm quyền " +
        "hoặc để phục tùng — không phải một khuôn mẫu rẻ tiền. Nhân vật phải đủ chiều sâu để giữ được cả một truyện dài." +
        (dsThich.length ? " Khi điền mục SỞ THÍCH, chỉ dùng đúng những tên có trong danh sách này: " + dsThich.join(", ") + "." : "")
      : "");
  return { dau, batBdsm, g, kieu };
}

export async function generateCharacter({ story, yTuong, laDanChuyen = false, bdsm = null }) {
  moPhienSinh();
  const { dau, batBdsm } = dauNhanVat(story, yTuong, { laDanChuyen, bdsm });
  const instruction =
    dau +
    "\n\nTASK: Viết hồ sơ nhân vật theo đúng các mục dưới đây, dùng đúng các tiêu đề đó:\n" +
    "TÊN: (một cái tên ngắn, hợp thể loại)\n" +
    "VAI TRÒ: (2 đến 4 từ)\n" +
    "MÔ TẢ: (2 đến 3 câu về ngoại hình, xuất thân, hoàn cảnh hiện tại)\n" +
    "TÍNH CÁCH: (2 đến 3 câu, có cả điểm yếu và mâu thuẫn nội tâm)\n" +
    "CÁCH NÓI: (1 đến 2 câu chỉ dẫn giọng điệu, từ ngữ đặc trưng)\n" +
    (batBdsm
      ? "VAI BDSM: (chỉ một trong ba: Dom, Sub, Switch)\n" +
        "KINH NGHIỆM: (chỉ một trong bốn: Mới tập, Có kinh nghiệm, Dày dạn, Bậc thầy)\n" +
        "PHONG CÁCH: (chỉ một trong sáu: Nghiêm khắc, Dịu dàng, Trêu chọc, Lạnh lùng, Bảo vệ, Thất thường)\n" +
        "KHẨU VỊ: (một câu, gạch đầu dòng ngắn về điều nhân vật thích trong cảnh)\n" +
        "SỞ THÍCH: (3 đến 5 tên, cách nhau bằng dấu phẩy — ghi ĐÚNG tên nằm trong danh sách sở thích ở trên)\n" +
        "GIỚI HẠN: (một câu về điều nhân vật tuyệt đối không chịu hoặc không làm)\n" +
        "GIỚI HẠN CỨNG: (một câu về điều nhân vật tuyệt đối không làm, kể cả khi người chơi muốn — thường liên quan tới an toàn)\n" +
        "DANH XƯNG: (cách nhân vật muốn được gọi trong cảnh, hoặc cách gọi người chơi)\n" +
        "LUẬT RIÊNG: (một luật nhân vật luôn giữ trong mọi cảnh, 1 câu)\n" +
        "CHĂM SÓC SAU: (cách nhân vật chăm sóc người chơi sau một cảnh căng, 1 câu)\n" +
        "DẤU HIỆU RIÊNG: (một cử chỉ hoặc dấu hiệu cho thấy nhân vật sắp quá sức, 1 câu)\n"
      : "") +
    "BÍ MẬT: (một điều nhân vật đang giấu, chỉ 1 câu)";
  const res = await streamText({ instruction, stopSequences: ["\n\n\nTASK"] });
  if (res.stopReason === "error") throw new Error("Không tạo được nhân vật. Thử lại sau.");
  const text = res.text;
  const tieuDe = ["TÊN", "VAI TRÒ", "MÔ TẢ", "TÍNH CÁCH", "CÁCH NÓI", "BÍ MẬT"];
  if (batBdsm)
    tieuDe.push(
      "VAI BDSM", "KINH NGHIỆM", "PHONG CÁCH", "KHẨU VỊ", "SỞ THÍCH", "GIỚI HẠN",
      "GIỚI HẠN CỨNG", "DANH XƯNG", "LUẬT RIÊNG", "CHĂM SÓC SAU", "DẤU HIỆU RIÊNG"
    );
  const m = bocTach(text, tieuDe);
  const mot = (k) => (m[k] || "").replace(/\n+/g, " ").trim();
  const out = {
    ten: (m["TÊN"].split("\n")[0] || "").replace(/["“”]/g, "").trim(),
    vaiTro: (m["VAI TRÒ"].split("\n")[0] || "").trim(),
    moTa: mot("MÔ TẢ"),
    tinhCach: mot("TÍNH CÁCH"),
    cachNoi: mot("CÁCH NÓI"),
    ghiChu: (() => {
      const b = mot("BÍ MẬT");
      return b ? "Bí mật: " + b : "";
    })(),
  };
  if (batBdsm) {
    const vai = (mot("VAI BDSM").split(/[,\s]+/)[0] || "").toLowerCase();
    out.vaiBdsm = /dom/.test(vai) && !/sub/.test(vai) ? "Dom" : /switch/.test(vai) ? "Switch" : /sub/.test(vai) ? "Sub" : "";
    const chuan = (k, ds, macDinh) => {
      const raw = mot(k).toLowerCase();
      const hit = ds.find((x) => raw.indexOf(x.toLowerCase()) >= 0);
      return hit || macDinh || "";
    };
    out.kinhNghiem = chuan("KINH NGHIỆM", ["Mới tập", "Có kinh nghiệm", "Dày dạn", "Bậc thầy"], "");
    out.phongCach = chuan("PHONG CÁCH", ["Nghiêm khắc", "Dịu dàng", "Trêu chọc", "Lạnh lùng", "Bảo vệ", "Thất thường"], "");
    out.khauVi = mot("KHẨU VỊ");
    out.soThich = tenSoThichTheoTen(mot("SỞ THÍCH"));
    out.gioiHan = mot("GIỚI HẠN");
    out.gioiHanCung = mot("GIỚI HẠN CỨNG");
    out.danhXung = mot("DANH XƯNG");
    out.luatRieng = mot("LUẬT RIÊNG");
    out.chamSocSau = mot("CHĂM SÓC SAU");
    out.tinHieuRieng = mot("DẤU HIỆU RIÊNG");
  }
  return out;
}

// Bước 1 khi tạo nhân vật bằng AI: đề xuất vài hướng khác nhau để người dùng chọn,
// chỉ khi chọn xong mới gọi generateCharacter() để viết chi tiết.
export async function generateCharacterOptions({ story, yTuong, laDanChuyen = false, bdsm = null, soLuong = 3 }) {
  moPhienSinh();
  const { dau, batBdsm } = dauNhanVat(story, yTuong, { laDanChuyen, bdsm });
  const n = Math.max(2, Math.min(5, Number(soLuong) || 3));
  const khuon = Array.from({ length: n }, (_, i) =>
    "Ý " + (i + 1) + ":" + "\n" +
    "TÊN: (một cái tên ngắn, hợp thể loại)" + "\n" +
    "VAI TRÒ: (2 đến 4 từ)" + "\n" +
    "NÉT RIÊNG: (2 đến 3 câu: nhân vật là ai, họ đến với người chơi bằng cách nào, điều gì khiến hướng này khác hẳn " + (n - 1) + " hướng còn lại, và mâu thuẫn cốt lõi của họ)"
  ).join("\n");
  const instruction =
    dau + "\n" + "\n" +
    "TASK: Đề xuất đúng " + n + " hướng nhân vật KHÁC NHAU cho nhân vật mới ở trên — mỗi hướng là một con người cụ thể, khác nhau về tính cách, " +
    "động cơ và kiểu quan hệ với người chơi, không phải " + n + " bản sao của cùng một ý. Chưa viết chi tiết, chỉ nêu hướng." + "\n" +
    (batBdsm ? "Cả " + n + " hướng đều phải giữ đúng vai đối lại với người chơi và đúng tương quan quyền lực đã nêu ở trên." + "\n" : "") +
    "Viết đúng theo khuôn dưới đây, không thêm lời dẫn nào khác:" + "\n" + khuon;
  const res = await streamText({ instruction, stopSequences: ["\n" + "\n" + "\n" + "TASK"] });
  if (res.stopReason === "error") throw new Error("Không tạo được các hướng nhân vật. Thử lại sau.");
  const ds = docHuongNhanVat(res.text).slice(0, n);
  if (!ds.length) throw new Error("Không đọc được hướng nhân vật nào. Thử lại sau.");
  return ds;
}

// Đọc kết quả của generateCharacterOptions (khuôn: "Ý 1" rồi TÊN / VAI TRÒ / NÉT RIÊNG).
function docHuongNhanVat(text) {
  const ds = [];
  let cur = null;
  let truong = "";
  for (const raw of String(text || "").split("\n")) {
    const line = raw.replace(/^[\s>*_#•\-]+/, "").trim();
    if (!line) continue;
    const m = line.match(/^([^:.]{1,16})[:.]([\s\S]*)$/);
    const nhan = m ? m[1].trim().toUpperCase().replace(/\s+/g, " ") : "";
    const rest = m ? m[2].trim() : "";
    if (/^(Ý|Y)\s*\d+$/.test(nhan)) {
      cur = { so: Number(nhan.replace(/\D/g, "")) || ds.length + 1, ten: "", vaiTro: "", tomTat: rest };
      truong = rest ? "tomTat" : "";
      ds.push(cur);
      continue;
    }
    if (/^TÊN/.test(nhan)) { truong = "ten"; if (cur) cur.ten = rest; continue; }
    if (/^VAI|^ROLE/.test(nhan)) { truong = "vaiTro"; if (cur) cur.vaiTro = rest; continue; }
    if (/^NÉT|^TÓM|^MÔ T|^Ý T/.test(nhan)) { truong = "tomTat"; if (cur) cur.tomTat = rest; continue; }
    if (cur && truong) cur[truong] = (cur[truong] ? cur[truong] + " " : "") + line;
  }
  const sach = (x) => String(x || "").replace(/[*_`]/g, "").replace(/["“”]/g, "").replace(/\s+/g, " ").trim();
  // AI đôi khi viết lệch nhãn (thiếu chữ, thừa dấu) — cắt luôn nhãn còn sót ở đầu giá trị.
  const boNhan = (x) => sach(x).replace(/^[A-ZÀ-Ỹ0-9\s]{2,20}[:.] /, "");
  return ds
    .map((o) => ({ so: o.so, ten: boNhan(o.ten), vaiTro: boNhan(o.vaiTro).replace(/[.]$/, ""), tomTat: boNhan(o.tomTat) }))
    .filter((o) => o.ten && (o.tomTat || o.vaiTro));
}

export async function generateOpening({ story, conv }) {
  moPhienSinh();
  const coMat = story.nhanVats.filter((c) => hienDienCua(story, conv).indexOf(c.id) >= 0);
  if (!coMat.length) throw new Error("Hội thoại chưa có nhân vật nào đang có mặt.");
  const chinh = coMat.find((c) => /người dẫn chuyện|dẫn chuyện|narrator/i.test(c.vaiTro || "")) || coMat[0];
  // Cảnh nhóm: mở đầu bằng một đoạn liền mạch, các nhân vật có mặt phản ứng với nhau.
  if (coMat.length > 1) {
    const chon = [chinh].concat(coMat.filter((c) => c.id !== chinh.id).slice(0, 2));
    const res = await replyAsGroup({ story, conv, messages: [], nhanVats: chon, moDau: true });
    return { text: res.text, nhanVat: chinh, nvIds: chon.map((c) => c.id), hienDien: res.hienDien };
  }
  const task =
    'Viết tin nhắn MỞ ĐẦU của hội thoại này với tư cách là "' + chinh.ten + '".\n' +
    "- 3 đến 6 câu: dựng không khí, vị trí, thời điểm, và đặt " + tenNguoiChoi(story) + " vào một tình huống cần phản ứng.\n" +
    "- Chưa giải quyết xung đột; kết thúc bằng một chi tiết khiến người chơi muốn lên tiếng.\n" +
    (story.giaoKeo && story.giaoKeo.bat
      ? "- Đây là cảnh BDSM M/M: dựng không khí và tương quan quyền lực ngay từ câu đầu, để người chơi thấy rõ mình đang ở vai nào " +
        "và rằng mọi thứ đều nằm trong một thoả thuận đã có. Đừng đi thẳng vào hành động nặng ở tin nhắn đầu tiên.\n"
      : "") +
    QUY_UOC_TRINH_BAY +
    "- Chỉ viết phần của " + chinh.ten + ", không viết thay " + tenNguoiChoi(story) + ".";
  const res = await streamText({
    instruction: buildPrompt(story, conv, [], task),
    startWith: chinh.ten + ": ",
    stopSequences: ["\n" + tenNguoiChoi(story) + ":"],
  });
  if (res.stopReason === "error") throw new Error("Không tạo được mở đầu. Thử lại sau.");
  return { text: cleanReply(res.text, chinh.ten, [tenNguoiChoi(story)]), nhanVat: chinh };
}

// -------------------------------------------------------- ảnh cho cảnh hiện tại
// Bước 1: đọc cảnh đang diễn ra và viết mô tả hình ảnh (tiếng Anh) cho máy vẽ.
export async function vietPromptAnh({ story, conv, messages, tinNhan = "", ghiChu = "", ngoaiHinh = [] }) {
  moPhienSinh();
  const g = story.giaoKeo;
  const hs = (Array.isArray(ngoaiHinh) ? ngoaiHinh : []).filter((h) => h && h.tenChinh);
  // Ngoại hình cố định KHÔNG được đưa vào phần mô tả khung hình. Nếu đưa, model chép lại (và
  // khi có hai người thì trộn đặc điểm của người này sang người kia) rồi ngoại hình xuất hiện
  // HAI lần trong prompt với hai bản có thể lệch nhau. Vì vậy ở đây chỉ nêu TÊN (làm nhãn) +
  // tuổi, và nói rõ phần tả ngoại hình đã nằm ở khối riêng ghép vào cuối prompt.
  const khoiHoSo = hs.length
    ? "\nNGƯỜI ĐÃ CÓ NGOẠI HÌNH CỐ ĐỊNH (app tự ghép ngoại hình của họ vào CUỐI prompt — bạn không " +
      "nhìn thấy phần đó và không được tả lại):\n" +
      hs.map((h) => "- " + h.tenChinh + (h.tuoi ? " (age " + h.tuoi + ")" : "")).join("\n") +
      "\n" +
      'Trong mục MÔ TẢ ẢNH, với MỖI người trong danh sách trên chỉ viết TRANG PHỤC và TƯ THẾ/HÀNH ĐỘNG ' +
      'của người đó trong khung hình này, mở đầu bằng tên họ làm NHÃN — ví dụ: "' +
      (hs[0].tenChinh || "Tên") +
      ' — wearing a torn white shirt, kneeling on the floor, looking away". TUYỆT ĐỐI không tả lại ' +
      "cơ thể, gương mặt, tóc, da, vóc dáng hay dấu hiệu nhận diện của những người này (kể cả khi bạn biết): " +
      "ngoại hình của họ đã có sẵn ở khối riêng, tả lại là hai mô tả chọi nhau và rất dễ trộn đặc điểm giữa " +
      "người này với người kia. Tên chỉ là NHÃN để phân biệt đúng người — không phải chữ cần hiện trong ảnh. " +
      "Mỗi dòng chỉ nói về đúng người đó. Lấy trang phục từ chính khung hình này (yêu cầu thêm của người chơi, " +
      "rồi tới bối cảnh cảnh); KHÔNG lấy trang phục từ ảnh tham chiếu của hồ sơ. Nếu chưa có thông tin trang " +
      "phục thì tả theo bối cảnh hợp lý — TUYỆT ĐỐI không mặc định nhân vật không mặc gì.\n"
    : "";
  const task =
    "Chuẩn bị MỘT KHUNG HÌNH minh hoạ cho cảnh nhập vai đang diễn ra — như thể chụp lại đúng khoảnh khắc hiện tại.\n" +
    "Viết đúng ba mục dưới đây và dùng đúng các tiêu đề đó:\n" +
    "MÔ TẢ ẢNH: (2 đến 5 câu, viết bằng TIẾNG ANH, chỉ tả những gì NHÌN THẤY: bối cảnh và không gian, thời điểm trong ngày, nguồn sáng và hướng sáng, tông màu, thời tiết, góc máy và khoảng cách, tư thế cùng hành động đang diễn ra của từng người có mặt, trang phục và đạo cụ đang dùng. Người KHÔNG có trong danh sách ngoại hình cố định ở dưới thì tả cả ngoại hình cho đủ để vẽ. KHÔNG viết cảm xúc trừu tượng, không kể chuyện, không thêm phong cách hay định dạng ảnh — đã có phần riêng ở dưới.)\n" +
    "LOẠI TRỪ: (TIẾNG ANH, ngắn gọn: những thứ không được xuất hiện trong khung hình này vì trái với bối cảnh)\n" +
    "CHÚ THÍCH: (một câu TIẾNG VIỆT dưới 90 ký tự mô tả khung hình vừa dựng, để người chơi đọc lại trong truyện)\n" +
    (tinNhan ? 'Khung hình phải minh hoạ ĐÚNG tin nhắn sau, không thêm sự kiện mới:\n"""' + tinNhan.slice(0, 700) + '"""\n' : "") +
    (ghiChu ? "Yêu cầu thêm của người chơi cho khung hình này: " + ghiChu + "\n" : "") +
    (g && g.bat
      ? "Cảnh này thuộc một cốt truyện BDSM nam–nam (M/M) giữa những người trưởng thành, mức độ hiện tại " +
        (g.mucDo || 3) + "/5. Chỉ tả đúng những gì đang thực sự diễn ra: không khí, tương quan quyền lực, trang phục, đạo cụ, ánh sáng, tư thế — không thêm hành động nào chưa có trong diễn biến. " +
        "Tuyệt đối không đưa vào khung hình những thứ thuộc giới hạn cứng của người chơi" +
        (g.gioiHanCung ? " (" + g.gioiHanCung + ")" : "") +
        ".\n"
      : "") +
    khoiHoSo +
    "Bắt đầu viết ngay:";
  const res = await streamText({
    instruction: buildPrompt(story, conv, messages, task),
    stopSequences: ["\n\n\n"],
  });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  const m = bocTach(res.text, ["MÔ TẢ ẢNH", "LOẠI TRỪ", "CHÚ THÍCH"]);
  const gon = (s) => (s || "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  let prompt = gon(m["MÔ TẢ ẢNH"]);
  if (!prompt) prompt = cleanText(res.text).replace(/^[*#>\-\s]+/, "").slice(0, 700);
  return {
    prompt,
    loaiTru: gon(m["LOẠI TRỪ"]).replace(/^(none|nothing|không|khong)\.?$/i, ""),
    chuThich: (m["CHÚ THÍCH"] || "").split("\n")[0].trim().replace(/^["“]|["”]$/g, ""),
  };
}

// ============================================ DỊCH NGOẠI HÌNH SANG TIẾNG ANH
// Prompt tạo ảnh là TIẾNG ANH (máy vẽ đọc tiếng Anh tốt hơn hẳn), còn mô tả ngoại hình là chữ
// người dùng gõ bằng tiếng Việt. Bản dịch là DỮ LIỆU DẪN XUẤT: sinh MỘT LẦN cho mỗi lần hồ sơ
// đổi rồi lưu lại trong hồ sơ (`moTaEn`/`tranhEn`) mà dùng lại — nếu để model tả lại ngoại hình
// ở mỗi lần dựng ảnh thì "ngoại hình cố định" sẽ trôi giữa các khung hình.
// Một lượt gọi cho TẤT CẢ hồ sơ cần dịch; mỗi hồ sơ một khối riêng để không trộn đặc điểm.
function truongTrongKhoi(khoi, nhan, dsNhanKe) {
  const i = khoi.indexOf(nhan + ":");
  if (i < 0) return "";
  let j = khoi.length;
  for (const k of dsNhanKe) {
    const p = khoi.indexOf(k + ":", i + nhan.length + 1);
    if (p >= 0 && p < j) j = p;
  }
  return khoi
    .slice(i + nhan.length + 1, j)
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Bóc kết quả dịch thành [{ id, moTaEn, tranhEn }]. Hồ sơ nào model không trả về thì trả chuỗi
// rỗng — chỗ gọi giữ nguyên bản gốc, không có gì bị mất.
function bocBanDich(text, ids) {
  const t = String(text || "");
  // Model hay viết "(trống)"/"[none]"/"…" cho phần không có — bóc dấu bao ngoài rồi mới xét.
  const sach = (s) => (/^(trống|trong|empty|none|n\/a|không có|khong co|-|—|\.+)$/i.test(s.replace(/^[([{«"']+|[)\]}»"']+$/g, "").trim()) ? "" : s);
  return ids.map((id, i) => {
    const dau = t.indexOf("ID: " + id);
    if (dau < 0) return { id, moTaEn: "", tranhEn: "" };
    const ke = i + 1 < ids.length ? t.indexOf("ID: " + ids[i + 1], dau + 1) : -1;
    const khoi = t.slice(dau, ke < 0 ? t.length : ke);
    return {
      id,
      moTaEn: sach(truongTrongKhoi(khoi, "APPEARANCE", ["AVOID"])),
      tranhEn: sach(truongTrongKhoi(khoi, "AVOID", ["APPEARANCE"])),
    };
  });
}

export async function dichNgoaiHinh(ds) {
  moPhienSinh();
  const dsHoSo = (Array.isArray(ds) ? ds : []).filter((h) => h && h.id);
  if (!dsHoSo.length) return [];
  const ids = dsHoSo.map((h) => h.id);
  const task =
    "TASK: Dịch mô tả NGOẠI HÌNH của từng người dưới đây sang " + LUAT_NGON_NGU.mayVe.toUpperCase() + " để đưa vào prompt vẽ ảnh.\n" +
    "Trả về MỖI người ĐÚNG một khối, theo đúng khuôn (giữ nguyên dòng ID):\n" +
    "ID: <id>\nAPPEARANCE: <bản dịch " + LUAT_NGON_NGU.mayVe + " của phần NGOẠI HÌNH — để trống nếu phần đó trống>\nAVOID: <bản dịch " + LUAT_NGON_NGU.mayVe + " của phần CẦN TRÁNH — để trống nếu phần đó trống>\n" +
    "QUY TẮC BẮT BUỘC:\n" +
    "- Dịch SÁT NGHĨA: không thêm, không bớt, không suy đoán thêm (tuổi, chiều cao, cân nặng, màu da…) nếu bản gốc không nói.\n" +
    "- Mỗi khối chỉ nói về đúng người đó — TUYỆT ĐỐI không trộn đặc điểm giữa những người khác nhau.\n" +
    "- Giữ đúng giới tính và mọi con số (chiều cao, tuổi, kích cỡ…). Dùng từ vựng mô tả ngoại hình quen thuộc " +
    'trong prompt ảnh (ví dụ: "short black hair", "sharp jawline", "athletic build", "tattoo of leaves along the collarbone").\n' +
    '- Phần CẦN TRÁNH dịch thành cụm ngắn kiểu prompt loại trừ (ví dụ "beard" thay vì "do not draw a beard").\n' +
    "- Không viết lời dẫn, không giải thích, không dùng tiêu đề nào khác.\n" +
    "DANH SÁCH:\n" +
    dsHoSo
      .map((h) => "ID: " + h.id + "\nNGOẠI HÌNH: " + (h.moTa || "(trống)") + "\nCẦN TRÁNH: " + (h.tranh || "(trống)"))
      .join("\n\n") +
    "\n\nBắt đầu trả về ngay:";
  const res = await streamText({ instruction: task, stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  return bocBanDich(res.text, ids);
}

// Bước 2: gọi plugin tạo ảnh.
export async function taoAnh({ prompt, loaiTru = "", kichThuoc = "768x512", seed = -1 }) {
  moPhienSinh();
  if (!R.textToImagePlugin) throw new Error("Plugin tạo ảnh chưa sẵn sàng.");
  const opts = { resolution: kichThuoc };
  if (loaiTru) opts.negativePrompt = thoatPerchance(loaiTru);
  if (Number.isFinite(seed) && seed >= 0) opts.seed = seed;
  // Prompt bị plugin đánh giá như mẫu pjs — xem `thoatPerchance()`. Phải thoát ở ĐÂY, không
  // thoát ở chỗ ghép prompt: bản ghi ảnh vẫn lưu prompt dạng người đọc được.
  const res = await R.textToImagePlugin(thoatPerchance(prompt), opts);
  const url = res && res.dataUrl ? res.dataUrl : res && res.canvas ? res.canvas.toDataURL("image/jpeg", 0.9) : "";
  if (!url) throw new Error("Không dựng được ảnh. Thử lại hoặc sửa lại mô tả.");
  return url;
}

export async function generateAvatar(promptText) {
  moPhienSinh();
  if (!R.textToImagePlugin) throw new Error("Plugin tạo ảnh chưa sẵn sàng.");
  const res = await R.textToImagePlugin(thoatPerchance(promptText), { resolution: "512x512", removeBackground: true });
  if (res && res.dataUrl) return res.dataUrl;
  if (res && res.canvas) return res.canvas.toDataURL("image/jpeg", 0.85);
  throw new Error("Không tạo được ảnh.");
}

// ================================================================ NGOẠI HÌNH
// Nháp một hồ sơ ngoại hình từ mô tả tự do (và ảnh tham chiếu nếu có). Đây là BẢN NHÁP:
// người dùng duyệt/sửa rồi mới lưu. AI thị giác của Perchance nhận TỐI ĐA MỘT ảnh mỗi
// lần gọi (png/jpeg/webp) — ảnh được chèn thẳng vào `instruction`.
//
// Nguyên tắc bắt buộc (để bản nháp không bịa ra sự thật về con người):
//  - Không tự bịa tuổi, chiều cao, hay đặc điểm bị che khuất.
//  - Không đưa quần áo / nền ảnh / tư thế trong ảnh vào đặc điểm CỐ ĐỊNH.
//  - Không viết tính cách, quan hệ, ký ức — đây chỉ là ngoại hình.
//  - Mô tả và ảnh mâu thuẫn ⇒ nêu ở mục "ĐIỂM CẦN CHỌN", không âm thầm chọn một bên.
export async function phacNgoaiHinh({ moTa = "", anhBlob = null }) {
  moPhienSinh();
  const task =
    "TASK: Soạn một BẢN NHÁP hồ sơ NGOẠI HÌNH cho một nhân vật, dựa trên thông tin ở trên" +
    (anhBlob ? " và ảnh tham chiếu được đính kèm" : "") +
    ". Chỉ mô tả ngoại hình con người — không viết tính cách, quan hệ, ký ức hay lịch sử.\n" +
    "Viết đúng các mục sau và dùng đúng tiêu đề:\n" +
    "TÊN CHÍNH: (tên của nhân vật; nếu người dùng không nêu thì để trống, KHÔNG tự đặt tên)\n" +
    "TUỔI: (chỉ ghi khi có căn cứ rõ ràng từ mô tả hoặc ảnh — không có thì để trống. KHÔNG được đoán bừa)\n" +
    "NGOẠI HÌNH: (3 đến 6 câu, tiếng Việt, các đặc điểm CỐ ĐỊNH của cơ thể và gương mặt: gương mặt, tóc, da, chiều cao, vóc dáng, tỉ lệ cơ thể, dấu hiệu nhận diện như hình xăm hoặc sẹo. Không suy đoán phần cơ thể bị quần áo che. Chỉ ghi chiều cao/cân nặng khi có căn cứ)\n" +
    "CẦN TRÁNH: (ngắn gọn: những thứ KHÔNG được xuất hiện khi tạo ảnh nhân vật này — ví dụ đặc điểm dễ bị vẽ sai hoặc trái với hồ sơ)\n" +
    "ĐIỂM CẦN CHỌN: (chỉ khi mô tả và ảnh MÂU THUẪN, hoặc khi có chi tiết mơ hồ cần người dùng quyết định — liệt kê từng điểm và hai lựa chọn. Không có thì ghi KHÔNG)\n" +
    "QUY TẮC BẮT BUỘC:\n" +
    "- Không tự bịa tuổi, chiều cao, hay đặc điểm bị che khuất. Thiếu căn cứ thì để trống.\n" +
    "- KHÔNG đưa quần áo, nền ảnh, ánh sáng, tư thế hay biểu cảm trong ảnh vào phần ngoại hình cố định.\n" +
    "- 'Mô tả cơ thể' không có nghĩa là ảnh khoả thân: nếu ảnh có trang phục thì không mô tả phần cơ thể nằm dưới lớp vải.\n" +
    "- Nếu mô tả và ảnh mâu thuẫn: nêu ở ĐIỂM CẦN CHỌN, KHÔNG âm thầm ghi đè bên này bằng bên kia.\n" +
    "- Trả lời bằng tiếng Việt, không thêm lời dẫn.\n" +
    "Bắt đầu viết ngay:";
  const dau =
    "# YÊU CẦU CỦA NGƯỜI DÙNG\n" +
    (moTa && moTa.trim() ? moTa.trim().slice(0, 4000) : "(người dùng không mô tả bằng chữ — chỉ có ảnh tham chiếu)") +
    "\n\n";
  // Ảnh được chèn GIỮA phần bối cảnh và TASK để model thấy ảnh trước khi đọc yêu cầu.
  const instruction = anhBlob ? [dau, anhBlob, task] : dau + task;
  const res = await streamText({ instruction, stopSequences: ["\n\n\n"] });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  const m = bocTach(res.text, ["TÊN CHÍNH", "TUỔI", "NGOẠI HÌNH", "CẦN TRÁNH", "ĐIỂM CẦN CHỌN"]);
  const mot = (k) => (m[k] || "").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const xungDot = mot("ĐIỂM CẦN CHỌN");
  return {
    tenChinh: (m["TÊN CHÍNH"] || "").split("\n")[0].replace(/^["'“”]|["'“”]$/g, "").trim(),
    tuoi: mot("TUỔI").replace(/[^\d]/g, "").slice(0, 3),
    moTa: mot("NGOẠI HÌNH"),
    tranh: mot("CẦN TRÁNH"),
    xungDot: /^(khong|không|none|nothing)\.?$/i.test(xungDot) ? "" : xungDot,
  };
}

// ================================================================ KHÉP CẢNH
// Một lần gọi AI duy nhất cho mỗi lần khép cảnh: phân tích đúng phần diễn biến kể từ
// cảnh đã khép gần nhất rồi trả về phiếu có cấu trúc để người chơi duyệt. Không chạy
// thêm lượt phân tích nào sau mỗi tin nhắn.
const MUC_PHIEU = [
  { id: "tomTat", nhan: ["tom tat", "tom tat canh", "tom tat canh nay"] },
  { id: "kyUc", nhan: ["ky uc", "ky uc nen giu", "ky uc can giu"] },
  { id: "quanHe", nhan: ["quan he", "thay doi quan he"] },
  { id: "nhanVat", nhan: ["nhan vat", "phat trien nhan vat", "nhan vat phat trien"] },
  { id: "moc", nhan: ["moc", "moc canh tiep theo", "moc canh sau", "moc tiep theo"] },
  { id: "tienDo", nhan: ["tien do dao dien", "tien do huong", "tien do phat trien", "tien do"] },
];
const TRUONG_MAP = [
  [/^muc tieu/, "mucTieu"],
  [/^cam xuc/, "camXuc"],
  [/^mau thuan/, "mauThuan"],
  [/^dong co/, "dongCo"],
  [/^(dang )?che giau|^dieu dang che giau|^bi mat/, "cheGiau"],
  [/^huong thay doi|^khuynh huong/, "huongThayDoi"],
];

function boGach(s) {
  return String(s || "").replace(/^[*•\-\s]+/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function laKhongCo(s) {
  const t = khongDau(s).toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ").trim();
  if (/^(khong co|khong co gi|khong|none)$/.test(t)) return true;
  // "n/a" và "-" phải so trên CHUỖI GỐC: `khongDau()` đã thay dấu "/" và "-" bằng khoảng
  // trắng, nên nếu so trên `t` thì hai nhánh đó không bao giờ khớp, và "n/a" bị lưu thẳng
  // vào dữ liệu (mô hình rất hay ghi "n/a" cho mục không có gì).
  return /^(n\s*\/\s*a|-+)$/.test(String(s === undefined || s === null ? "" : s).trim().toLowerCase());
}

// "chính | A: 1 | B: 2" -> { chinh, phan: [{nhan, gt}] }
function tachPhan(s) {
  const bits = String(s || "").split("|");
  const chinh = (bits.shift() || "").trim();
  const phan = [];
  for (const b of bits) {
    const m = b.match(/^\s*([^:]{1,24}?)\s*[:：]\s*([\s\S]*)$/);
    if (m) phan.push({ nhan: khongDau(m[1]).toLowerCase().trim(), gt: m[2].trim() });
    else if (phan.length) phan[phan.length - 1].gt += (phan[phan.length - 1].gt ? " " : "") + b.trim();
    else if (chinh) phan.push({ nhan: "", gt: b.trim() });
  }
  return { chinh, phan };
}

function tenRaId(story, conv, ten) {
  const t = khongDau(ten).toLowerCase().trim();
  if (!t) return "";
  if (t === khongDau(tenNguoiChoi(story)).toLowerCase() || /^(ban|nguoi choi|player|toi|minh)$/.test(t)) return TT.ID_NGUOI;
  const tat = story.nhanVats.filter((c) => (conv.nhanVatIds || []).indexOf(c.id) >= 0);
  const c =
    tat.find((x) => khongDau(x.ten).toLowerCase() === t) ||
    tat.find((x) => khongDau(x.ten).toLowerCase().indexOf(t) >= 0) ||
    tat.find((x) => t.indexOf(khongDau(x.ten).toLowerCase()) >= 0);
  return c ? c.id : "";
}

export async function khepCanh({ story, conv, messages, ids }) {
  moPhienSinh();
  const nguoiChoi = tenNguoiChoi(story);
  const nhip = TT.nhipCua(story);
  // Hướng Đạo diễn liên quan tới cảnh này (nếu có): đây là lúc DUY NHẤT tiến độ được
  // ghi lại — chỉ sau khi người chơi duyệt ở thẻ Khép cảnh.
  const dsHuong = TT.huongLienQuan(story, conv, ids);
  const khoiTienDo = dsHuong.length
    ? "TIẾN ĐỘ ĐẠO DIỄN (chỉ dựa trên bằng chứng TRONG CHÍNH CẢNH VỪA RỒI; không suy diễn, không tự đánh dấu hoàn tất):\n" +
      dsHuong
        .map(
          (h) =>
            "- " + (h.ten || h.mongMuon) + ": <chưa chạm tới | đang tiến triển | bị cản | cần đổi hướng | có thể hoàn tất> | BẰNG CHỨNG: <câu nói hay hành động cụ thể trong cảnh, hoặc KHONG CO> | BƯỚC TIẾP: <một bước nhỏ cho cảnh sau>"
        )
        .join("\n") +
      "\nKhông có bằng chứng trong cảnh thì ghi đúng \"chưa chạm tới\" và BẰNG CHỨNG: KHONG CO. Chỉ ghi \"có thể hoàn tất\" khi mục tiêu của hướng đã đạt được rõ ràng và bền vững; dù vậy người chơi vẫn là người quyết định hoàn tất.\n"
    : "";
  const task =
    "Dưới đây là một cảnh vừa diễn ra. Hãy chuẩn bị KHÉP CẢNH: rút ra tóm tắt, ký ức đáng giữ, và những thay đổi về quan hệ " +
    "hoặc nội tâm — đây là lúc DUY NHẤT trạng thái lâu dài được ghi lại.\n" +
    "- Chỉ đề xuất điều có BẰNG CHỨNG CỤ THỂ trong đoạn vừa rồi (một hành động, một lời hứa, một tiết lộ, một va chạm). " +
    "Không có bằng chứng thì ghi KHONG CO.\n" +
    "- Một câu nói bình thường không làm đổi quan hệ. Từ chối, bất đồng hoặc đặt giới hạn KHÔNG mặc định là mất thiện cảm.\n" +
    "- Dùng từ khoá dừng đúng giao kèo KHÔNG phải phản bội: cách nhân vật tôn trọng giới hạn và chăm sóc sau mới là bằng chứng về quan hệ.\n" +
    "- Chỉ xét những nhân vật thực sự có mặt hoặc đã tương tác trong đoạn; không đụng tới người vắng mặt. " +
    "TUYỆT ĐỐI không đề xuất thay đổi cảm xúc, suy nghĩ hay quan hệ của " + nguoiChoi + ".\n" +
    "- Không sửa tính cách gốc. Chỉ ghi phần phát triển tạm thời (mục tiêu, cảm xúc còn đọng, mâu thuẫn, động cơ, điều đang che giấu, khuynh hướng thay đổi) " +
    "khi đã có bằng chứng, và ghi rõ trạng thái cũ → hướng mới. Trạng thái hiện tại nằm ở mục NỘI TÂM & QUAN HỆ phía trên, phần CŨ phải khớp với đó.\n" +
    "- Thay đổi lớn hoặc đảo chiều phải cần nhiều cảnh tích luỹ; mới có một dấu hiệu nhỏ thì đừng đề xuất.\n" +
    nhip.dan + "\n" +
    "- Nếu cảnh chỉ là trò chuyện nhẹ: chỉ cần tóm tắt, các mục còn lại ghi KHONG CO.\n" +
    "- Không vượt quá 4 ký ức, 4 thay đổi quan hệ và 3 phát triển nhân vật.\n" +
    "Xuất đúng định dạng sau, không thêm gì khác:\n" +
    "TÓM TẮT: <2 đến 4 câu, kể đúng những gì đã xảy ra trong cảnh>\n" +
    "KÝ ỨC:\n" +
    "- <một câu ngắn về điều sẽ còn ảnh hưởng về sau> | BIẾT: <tên những người biết, cách nhau dấu phẩy>\n" +
    "QUAN HỆ:\n" +
    "- <Tên A> -> <Tên B>: <tin tưởng | gần gũi | căng thẳng | ảnh hưởng> <lên | xuống> | VÌ: <hành động cụ thể trong cảnh> | CHƯA NÓI: <điều A đang giữ trong lòng với B, nếu có>\n" +
    "NHÂN VẬT:\n" +
    "- <Tên>: <mục tiêu | cảm xúc | mâu thuẫn | động cơ | che giấu | hướng thay đổi> | CŨ: <ngắn> | MỚI: <ngắn> | VÌ: <lý do>\n" +
    "MÓC: <một câu gợi ý mở cảnh tiếp theo — chỉ là gợi ý, chưa xảy ra>\n" +
    (khoiTienDo ? khoiTienDo : "") +
    "Mục nào không có gì thì ghi đúng KHONG CO ngay sau tên mục (ví dụ: QUAN HỆ: KHONG CO).";
  const parts = [buildContext(story, conv, { ids })];
  const dong = (messages || []).map((m) => logLine(story, m)).filter((l) => l !== "");
  parts.push("# DIỄN BIẾN CỦA CẢNH CẦN KHÉP (cũ nhất ở trên)\n" + (dong.length ? dong.join("\n\n") : "(không có nội dung)"));
  const instruction = parts.join("\n\n") + "\n\nTASK: " + task;
  const res = await streamText({ instruction, stopSequences: [] });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  return { text: res.text || "" };
}

// ============================================================ CHẾ ĐỘ ĐẠO DIỄN
// Lập kế hoạch cầu nối cho MỘT hướng mới: gọi AI đúng một lần, người chơi duyệt (và
// sửa) kế hoạch trước, rồi mới Kích hoạt. Không lưu gì ở đây — hàm thuần đọc/viết.
export async function lapCauNoi({ story, conv, huong, ids }) {
  moPhienSinh();
  const h = huong || {};
  const nhipH = TT.NHIP_HUONG.find((x) => x.id === h.nhip) || TT.NHIP_HUONG[1];
  const dsIds = Array.isArray(ids) && ids.length
    ? ids.slice()
    : h.phamVi === "nhanvat"
      ? [h.nvId]
      : h.phamVi === "quanhe"
        ? [h.tu, h.den]
        : (conv && Array.isArray(conv.nhanVatIds) ? conv.nhanVatIds.slice() : (story.nhanVats || []).map((c) => c.id));
  const L = ["- Đối tượng của hướng: " + TT.doiTuongHuong(story, h)];
  if (h.phamVi !== "truyen") L.push("- Phạm vi: " + TT.nhanPhamVi(h.phamVi).toLowerCase() + ".");
  if (h.ten) L.push("- Tên ngắn người chơi đặt cho hướng: " + h.ten);
  L.push("- Hướng người chơi muốn: " + h.mongMuon);
  L.push("- Nhịp mong muốn: " + nhipH.ten.toLowerCase() + " — " + nhipH.dan + ".");
  L.push("- Số cảnh dự kiến: khoảng " + (Math.round(Number(h.soCanh)) || 4) + " cảnh.");
  if (h.rangBuoc) L.push("- Điều người chơi KHÔNG muốn bị phá vỡ: " + h.rangBuoc);
  const trung = TT.huongCungDoiTuong(story, h);
  if (trung.length) {
    L.push(
      "- Hướng ĐANG hoạt động khác trên cùng đối tượng: " +
        trung.map((x) => "“" + (x.ten || x.mongMuon) + "” → " + x.mongMuon).join(" | ") +
        ". Nếu hướng mới xung đột với hướng này, phải nói rõ ở mục XUNG ĐỘT."
    );
  }
  const task =
    "Người chơi đang đặt một HƯỚNG PHÁT TRIỂN TƯƠNG LAI cho câu chuyện này (chế độ Đạo diễn). Hãy viết một bản KẾ HOẠCH CẦU NỐI ngắn để thay đổi đó diễn ra TỰ NHIÊN qua nhiều cảnh, thay vì xảy ra ngay.\n" +
    "- Chỉ dựa trên đúng bối cảnh, hồ sơ nhân vật, biên niên sử và trạng thái hiện tại ở trên; không bịa thêm sự kiện chưa từng có.\n" +
    "- Tính cách gốc KHÔNG được viết lại: hãy mô tả chuỗi trải nghiệm có thể dẫn tới thay đổi.\n" +
    "- Mỗi bước phải là việc CÓ THỂ xảy ra trong cảnh (một tình huống, một cơ hội, một va chạm) — không phải mệnh lệnh áp lên người chơi.\n" +
    "- Không bảo đảm thành công: nêu rõ điều kiện khiến hướng này chậm lại, thất bại hoặc phải đổi cách tiếp cận.\n" +
    "- Viết 2 đến 4 bước. Xuất đúng định dạng sau, không thêm gì khác:\n" +
    "TRẠNG THÁI XUẤT PHÁT: <1 đến 2 câu tả đúng trạng thái hiện tại của đối tượng>\n" +
    "MỤC TIÊU: <một câu: đích cần tới>\n" +
    "BƯỚC CHUYỂN:\n- <bước 1>\n- <bước 2>\n- <bước 3 nếu cần>\n- <bước 4 nếu cần>\n" +
    "DẤU HIỆU: <những dấu hiệu nhỏ nên xuất hiện trước khi thay đổi rõ rệt>\n" +
    "XUNG ĐỘT: <xung đột với canon, tính cách gốc, giới hạn, hoặc hướng đang hoạt động khác — hoặc KHONG CO>\n" +
    "ĐIỀU KIỆN ĐỔI HƯỚNG: <điều gì khiến hướng này chậm lại, thất bại hoặc phải đổi cách tiếp cận>";
  const instruction = [buildContext(story, conv, { ids: dsIds }), "# YÊU CẦU ĐẠO DIỄN\n" + L.join("\n")].join("\n\n") + "\n\nTASK: " + task;
  const res = await streamText({ instruction, stopSequences: [] });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  return docKeHoach(res.text || "");
}

// Đọc kế hoạch cầu nối (chịu lỗi: thiếu mục nào thì mục đó rỗng).
export function docKeHoach(raw) {
  const map = bocTach(raw, ["TRẠNG THÁI XUẤT PHÁT", "MỤC TIÊU", "BƯỚC CHUYỂN", "DẤU HIỆU", "XUNG ĐỘT", "ĐIỀU KIỆN ĐỔI HƯỚNG"]);
  const t = (k) => {
    const v = String(map[k] || "").trim();
    return laKhongCo(v) ? "" : v;
  };
  return {
    trangThaiDau: t("TRẠNG THÁI XUẤT PHÁT"),
    mucTieu: t("MỤC TIÊU"),
    buoc: splitLines(map["BƯỚC CHUYỂN"] || "").filter((s) => !laKhongCo(s)).slice(0, 4),
    dauHieu: t("DẤU HIỆU"),
    xungDot: t("XUNG ĐỘT"),
    dieuKienDung: t("ĐIỀU KIỆN ĐỔI HƯỚNG"),
  };
}

// Phiếu khép cảnh đã parse. Luôn chịu được kết quả thiếu trường / sai định dạng:
// phần đọc được thì dùng, phần hỏng thì bỏ — người chơi vẫn sửa được trên thẻ duyệt.
export function docPhieu(raw, opts = {}) {
  const { story, conv, messages, rieng } = opts;
  const nhip = TT.nhipCua(story);
  const sec = { tomTat: [], kyUc: [], quanHe: [], nhanVat: [], moc: [], tienDo: [] };
  let cur = null;
  for (const rawLine of String(raw || "").split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(/^\s*[*#>•\-\s]*([^:\n]{2,42}?)\s*[:：]\s*([\s\S]*)$/);
    let found = null;
    let rest = "";
    if (m) {
      const nhan = khongDau(m[1]).toLowerCase().replace(/\s+/g, " ").trim();
      for (const muc of MUC_PHIEU) {
        for (const n of muc.nhan) {
          if (nhan === n || nhan.startsWith(n + " ")) {
            if (!found || n.length > found.len) found = { id: muc.id, len: n.length };
          }
        }
      }
      rest = m[2];
    } else {
      const nhan2 = khongDau(line).toLowerCase().replace(/\s+/g, " ").trim();
      for (const muc of MUC_PHIEU) {
        if (muc.nhan.indexOf(nhan2) >= 0) { found = { id: muc.id, len: nhan2.length }; rest = ""; break; }
      }
    }
    if (found) {
      cur = found.id;
      if (String(rest).trim()) sec[cur].push(String(rest).trim());
      continue;
    }
    if (!cur) continue;
    const t = line.trim();
    if (t) sec[cur].push(t);
  }
  const gop = (a) => a.join(" ").replace(/^[*•\-\s]+/, "").replace(/\s+/g, " ").trim();
  // "KHONG CO" nghĩa là mục đó không có gì — không lưu chính chuỗi đó vào dữ liệu.
  const tomTat = laKhongCo(gop(sec.tomTat)) ? "" : gop(sec.tomTat);
  const moc = laKhongCo(gop(sec.moc)) ? "" : gop(sec.moc);
  const bietMacDinh = TT.aiBietMacDinh(messages, rieng);
  const kyUc = [];
  for (const item of sec.kyUc) {
    const s = boGach(item);
    if (!s || laKhongCo(s)) continue;
    const p = tachPhan(s);
    const noiDung = p.chinh.replace(/^[*•\s]+/, "").trim();
    if (!noiDung) continue;
    const fBiet = p.phan.find((x) => /^(biet|ai biet|nguoi biet)/.test(x.nhan));
    let biet = [];
    if (fBiet && fBiet.gt && !laKhongCo(fBiet.gt)) {
      biet = fBiet.gt.split(/[,;、/]+/).map((x) => tenRaId(story, conv, x)).filter(Boolean);
    }
    if (!biet.length) biet = bietMacDinh.slice();
    if (biet.indexOf(TT.ID_NGUOI) < 0) biet.unshift(TT.ID_NGUOI);
    if (rieng && biet.indexOf(rieng) < 0) biet.push(rieng);
    kyUc.push({ id: TT.ma("ku"), noiDung, biet: biet.slice(0, 12), rieng: rieng || "" });
    if (kyUc.length >= 5) break;
  }
  const quanHe = [];
  for (const item of sec.quanHe) {
    const s = boGach(item);
    if (!s || laKhongCo(s)) continue;
    const m = s.match(/^(.*?)\s*(?:->|=>|→|–>|—>)\s*(.*?)\s*[:：]\s*([\s\S]+)$/);
    if (!m) continue;
    const tu = tenRaId(story, conv, m[1]);
    const den = tenRaId(story, conv, m[2]);
    if (!tu || !den || tu === den || tu === TT.ID_NGUOI) continue;
    const p = tachPhan(m[3]);
    const chu = khongDau(p.chinh).toLowerCase();
    const lyDo = ((p.phan.find((x) => /^(vi|ly do|because)/.test(x.nhan)) || {}).gt || "").trim();
    const chuaNoi = ((p.phan.find((x) => /^(chua noi|dieu chua noi)/.test(x.nhan)) || {}).gt || "").trim();
    let chieu = "";
    if (/tin tuong/.test(chu)) chieu = "tinTuong";
    else if (/gan gui|than thiet|thân/.test(chu)) chieu = "ganGui";
    else if (/cang thang/.test(chu)) chieu = "cangThang";
    else if (/anh huong|quyen luc/.test(chu)) chieu = "quyenLuc";
    let h = 0;
    if (/xuong|giam|thap hon|yeu hon|bot|↓/.test(chu)) h = -1;
    else if (/len|tang|cao hon|manh hon|nhieu hon|↑/.test(chu)) h = 1;
    if (chieu && h !== 0) quanHe.push({ id: TT.ma("qh"), tu, den, chieu, huong: h, buoc: nhip.buoc, lyDo });
    if (chuaNoi && !laKhongCo(chuaNoi)) quanHe.push({ id: TT.ma("qh"), tu, den, chieu: "chuaNoi", huong: 1, moi: chuaNoi, lyDo });
    if (quanHe.length >= 8) break;
  }
  const nhanVat = [];
  for (const item of sec.nhanVat) {
    const s = boGach(item);
    if (!s || laKhongCo(s)) continue;
    const m = s.match(/^([^:]{1,42}?)\s*[:：]\s*([\s\S]+)$/);
    if (!m) continue;
    const nvId = tenRaId(story, conv, m[1]);
    if (!nvId || nvId === TT.ID_NGUOI) continue;
    const p = tachPhan(m[2]);
    const chu = khongDau(p.chinh).toLowerCase();
    const tr = (TRUONG_MAP.find((x) => x[0].test(chu)) || [])[1];
    if (!tr) continue;
    const cu = ((p.phan.find((x) => /^(cu|tu truoc|truoc|truoc day)/.test(x.nhan)) || {}).gt || "").trim();
    const moi = ((p.phan.find((x) => /^(moi|hien tai|sau|moi day|gio)/.test(x.nhan)) || {}).gt || "").trim();
    const lyDo = ((p.phan.find((x) => /^(vi|ly do)/.test(x.nhan)) || {}).gt || "").trim();
    if (!moi) continue;
    nhanVat.push({ id: TT.ma("nvz"), nvId, truong: tr, cu, moi, lyDo });
    if (nhanVat.length >= 6) break;
  }
  // Tiến độ Đạo diễn: chỉ nhận những dòng khớp tên một hướng đang được theo dõi.
  const dsHuong = Array.isArray(opts.huong) ? opts.huong.filter(Boolean) : [];
  const tienDo = [];
  for (const item of sec.tienDo) {
    const s = boGach(item);
    if (!s || laKhongCo(s)) continue;
    const m = s.match(/^([^:]{1,60}?)\s*[:：]\s*([\s\S]+)$/);
    if (!m) continue;
    const tenH = khongDau(m[1]).toLowerCase();
    const tenCua = (x) => khongDau(x.ten || "").toLowerCase();
    const h =
      dsHuong.find((x) => tenCua(x) === tenH) ||
      dsHuong.find((x) => tenH.indexOf(tenCua(x)) >= 0 && tenCua(x)) ||
      dsHuong.find((x) => tenCua(x).indexOf(tenH) >= 0);
    if (!h) continue;
    const p = tachPhan(m[2]);
    const chu = khongDau(p.chinh).toLowerCase();
    let trangThai = "chuaCham";
    if (/chua cham|khong cham|chua toi|khong lien quan|chua lien quan/.test(chu)) trangThai = "chuaCham";
    else if (/co the hoan tat|hoan tat|gan xong|sap xong/.test(chu)) trangThai = "coTheHoanTat";
    else if (/can doi huong|doi huong|phai doi|khong con phu hop/.test(chu)) trangThai = "canDoiHuong";
    else if (/bi can|bi chan|that bai|khong thanh|giat lui|bi day lui/.test(chu)) trangThai = "biCan";
    else if (/dang tien trien|tien trien|co tien bo|nhich/.test(chu)) trangThai = "dangTienTrien";
    const bangChung = ((p.phan.find((x) => /^bang chung/.test(x.nhan)) || {}).gt || "").trim();
    const buocTiep = ((p.phan.find((x) => /^buoc tiep|^buoc tiep theo|^buoc sau/.test(x.nhan)) || {}).gt || "").trim();
    tienDo.push({
      huongId: h.id,
      trangThai,
      bangChung: laKhongCo(bangChung) ? "" : bangChung,
      buocTiep: laKhongCo(buocTiep) ? "" : buocTiep,
    });
    if (tienDo.length >= 8) break;
  }
  return { tomTat: tomTat.slice(0, 900), kyUc, quanHe, nhanVat, moc: moc.slice(0, 300), tienDo };
}

// ==================================================== THỜI GIAN VẮNG MẶT
// Một lần gọi AI DUY NHẤT cho mỗi lần người chơi quay lại: quyết định thế giới có tiến
// thêm nhịp nào không (0 tới soToiDa sự kiện quan trọng) rồi viết chúng ra dưới dạng
// có cấu trúc. App parse kết quả thành dữ liệu — không để marker/JSON lọt ra giao diện.
//
// AI ĐƯỢC PHÉP trả về 0 sự kiện. Không bao giờ chọn ngẫu nhiên một nhân vật chỉ để có
// nội dung: thà không có gì còn hơn một tin nhắn vô cớ.

const MOC_HELO = "<<HELO:";

// Khối NGOÀI MÀN HÌNH đưa vào prompt thường: chỉ những sự kiện mà nhân vật TRONG CẢNH
// thực sự biết, và chỉ ở dạng ngắn. Không bơm cả sổ vào mọi lượt.
function buildNgoaiManHinh(story, conv, ids) {
  const mongMuon = ids instanceof Set ? Array.from(ids) : (Array.isArray(ids) ? ids : []);
  if (!mongMuon.length) return "";
  const biet = suKienBiet(story, mongMuon, conv);
  if (!biet.length) return "";
  const maCua = suKienTheoMaNgan(story);
  const maNguoc = {};
  for (const k in maCua) maNguoc[maCua[k]] = k;
  const tenGoi = (id) => (id === TT.ID_NGUOI ? tenNguoiChoi(story) : ((story.nhanVats.find((c) => c.id === id) || {}).ten || "?"));
  const L = ["# NGOÀI MÀN HÌNH (đã xảy ra khi người chơi vắng mặt — KHÔNG phải chuyện trong cảnh này)"];
  for (const e of biet) {
    const ai = bietTrong(story, conv, e).filter((id) => id !== TT.ID_NGUOI).map(tenGoi).join(", ") || "(không ai)";
    L.push(
      "[" + (maNguoc[e.id] || "?") + "] [" + (e.hinhThuc || nhanLoaiAI(e.loai)) + "] " + cat(e.noiDung, 320) +
      "\n  Người trong cuộc: " + ((e.thamGia || []).map(tenGoi).join(", ") || "(không rõ)") +
      " · Biết chuyện: " + ai + " · Mức hé lộ: " + nhanMucAI(mucTrong(story, conv, e))
    );
  }
  L.push(
    "- Chỉ những nhân vật có tên ở dòng “Biết chuyện” mới được hành động dựa trên sự kiện đó. " +
    "Nhân vật khác TUYỆT ĐỐI không được biết, không được nhắc tới, không được hành động như đã chứng kiến.\n" +
    "- Sự kiện CHƯA “đã lộ” thì người chơi cũng không biết. Không nhân vật nào được tự kể ra, trừ khi chính họ chọn tiết lộ " +
    "trong cảnh (qua lời nói, hành vi hoặc bằng chứng) — và khi đó chỉ lộ đúng phần họ muốn lộ, thường là qua dấu hiệu chứ không nói thẳng.\n" +
    "- Đây là chuyện ĐÃ xảy ra, không phải gợi ý để kể lại. Đừng tóm tắt nó cho người chơi nghe."
  );
  return L.join("\n");
}

// Dòng hướng dẫn hé lộ — chỉ xuất hiện khi trong cảnh có nhân vật đang giữ một sự kiện
// ngoài màn hình CHƯA lộ với người chơi. Khi sự kiện được kể/lộ ra thật, model ghi thêm
// một dòng `<<HELO: S1>>`; app cắt dòng đó khỏi phần hiển thị (xem `catDieuKhien`) và
// đánh dấu sự kiện đã hé lộ.
function dongHeLo(story, ids, conv) {
  if (!suKienAnVoiNguoiChoi(story, ids || [], conv).length) return "";
  return (
    "\n- Mục NGOÀI MÀN HÌNH ở trên đang có chuyện được che giấu. Nếu trong đoạn vừa viết, một chuyện trong đó THẬT SỰ được kể ra, " +
    "lộ ra hoặc bị phát hiện, hãy ghi thêm ĐÚNG MỘT dòng: " + MOC_HELO + " S1>> — thay S1 bằng mã trong ngoặc vuông của (các) sự kiện vừa lộ, " +
    "nhiều mã thì cách nhau dấu phẩy. Không có gì lộ ra thì TUYỆT ĐỐI không ghi dòng đó."
  );
}

function nhanLoaiAI(id) {
  const x = LOAI.find((v) => v.id === id);
  return x ? x.ten : "Ngoài màn hình";
}
function nhanMucAI(id) {
  const x = MUC.find((v) => v.id === id);
  return x ? x.ten : "Ẩn";
}

// Tên -> id nhân vật trong PHẠM VI CẢ TRUYỆN (không chỉ một hội thoại).
function tenRaIdTruyen(story, ten, choNguoi = true) {
  const t = khongDau(ten).toLowerCase().trim();
  if (!t) return "";
  if (choNguoi && (t === khongDau(tenNguoiChoi(story)).toLowerCase() || /^(ban|nguoi choi|player|toi|minh)$/.test(t))) return TT.ID_NGUOI;
  const tat = story.nhanVats || [];
  const c =
    tat.find((x) => khongDau(x.ten).toLowerCase() === t) ||
    tat.find((x) => khongDau(x.ten).toLowerCase().indexOf(t) >= 0) ||
    tat.find((x) => t.indexOf(khongDau(x.ten).toLowerCase()) >= 0);
  return c ? c.id : "";
}

function tachTen(s, story, choNguoi = true) {
  return String(s || "")
    .split(/[,;、/]+|\bvà\b|\bva\b/)
    .map((x) => x.replace(/^[\s\-•*\d.)\]]+/, "").trim())
    .filter(Boolean)
    .map((x) => tenRaIdTruyen(story, x, choNguoi))
    .filter(Boolean);
}

function convTheoTen(story, ten) {
  const t = khongDau(ten).toLowerCase().trim();
  if (!t) return null;
  const ds = story.hoiThoais || [];
  return (
    ds.find((c) => khongDau(c.tieuDe).toLowerCase() === t) ||
    ds.find((c) => khongDau(c.tieuDe).toLowerCase().indexOf(t) >= 0 && t.length > 3) ||
    null
  );
}

// Một lần lập kế hoạch cho 0..soToiDa sự kiện.
export async function lapKeHoachVangMat({ story, conv, msgsByHt, batDau, ketThuc, phut, cheDo, soToiDa, chuDong }) {
  moPhienSinh();
  const nguoiChoi = tenNguoiChoi(story);
  const dsHt = story.hoiThoais || [];
  const tenHt = (c) => "“" + c.tieuDe + "” (" + ((c.nhanVatIds || []).map((id) => ((story.nhanVats.find((x) => x.id === id) || {}).ten || "?")).join(", ") || "chưa có nhân vật") + ")";
  const nhan = {};
  for (const c of dsHt) {
    const msgs = (msgsByHt && msgsByHt[c.id] ? msgsByHt[c.id] : []).slice(-6).map((m) => logLine(story, m)).filter((l) => l !== "");
    if (!msgs.length) continue;
    nhan[c.id] = msgs;
  }
  const dongHt = dsHt.filter((c) => nhan[c.id]).map((c) => "- " + tenHt(c) + ":\n" + nhan[c.id].map((l) => "    " + l).join("\n")).join("\n");
  const soCanh = TT.canhHopLe(story).length;
  const canhCuoi = TT.canhHopLe(story).slice(-1)[0];
  const goiY = [];
  for (const c of dsHt) if (nhan[c.id]) goiY.push("- Hội thoại đích hợp lệ: " + tenHt(c));
  const nguoiChoiTrong = (story.nhanVats || []).map((c) => c.ten).join(", ") || "(chưa có nhân vật nào)";

  const cheDoDan =
    cheDo === "theoCanh"
      ? "- Chế độ “Theo cảnh”: CHỈ cần tối đa MỘT nhịp chuyển tiếp hợp lý giữa cảnh vừa khép và cảnh sắp tới. Khoảng thời gian thật KHÔNG quyết định độ dài, không ánh xạ vào tuổi/lịch/thời lượng của truyện."
      : cheDo === "thoiGianThat"
        ? "- Chế độ “Theo thời gian thật”: khoảng vắng mặt thật là GỢI Ý cho thời gian trong truyện. Vẫn tối đa " + soToiDa + " sự kiện và ưu tiên ý nghĩa hơn số lượng. Nếu vắng rất lâu thì đừng kể tắt hàng loạt biến cố lớn — chỉ vài thay đổi quan trọng, phần còn lại để thành khoảng trống hợp lý."
        : "";

  const task =
    "Người chơi đã rời khỏi truyện một lúc và vừa quay lại. Đây là lúc thế giới có thể tiến thêm một nhịp trong khoảng thời gian đó.\n" +
    "- Thời điểm người chơi rời đi: " + new Date(batDau).toLocaleString("vi-VN") + "\n" +
    "- Thời điểm quay lại: " + new Date(ketThuc).toLocaleString("vi-VN") + " (khoảng " + phut + " phút)\n" +
    cheDoDan + "\n" +
    "- Hãy quyết định có tới " + soToiDa + " sự kiện/tương tác quan trọng nào đó THẬT SỰ nên xảy ra trong khoảng vắng mặt này hay không. " +
    "Hoàn toàn có thể là KHÔNG CÓ GÌ: nếu không có lý do tự nhiên, hãy trả về 0 sự kiện. TUYỆT ĐỐI không chọn đại một nhân vật cho có nội dung.\n" +
    (soCanh === 0 ? "- Truyện chưa có cảnh nào được khép: chỉ nên tạo sự kiện ngoài màn hình hoặc dấu hiệu rất nhẹ, đừng mở mạch mới.\n" : "") +
    (canhCuoi && canhCuoi.moc ? "- Móc cảnh đang chờ: " + cat(canhCuoi.moc, 200) + "\n" : "") +
    "- Ưu tiên nhân vật có việc chưa giải quyết, lời hứa, lo lắng, nhu cầu, hoặc đang liên quan tới một hướng phát triển. " +
    "KHÔNG ưu tiên chỉ vì lâu rồi chưa nói.\n" +
    "- Một liên lạc nhìn thấy CHỈ được đặt vào hội thoại đang có chứa nhân vật đó (xem danh sách hội thoại đích hợp lệ). " +
    "Không tạo hội thoại mới. Nếu không có hội thoại nào hợp lệ thì đừng ép sinh tin nhắn — có thể chỉ tạo sự kiện ngoài màn hình, hoặc trả về 0.\n" +
    "- HÌNH THỨC phải hợp với thế giới truyện: bối cảnh hiện đại có thể dùng tin nhắn, cuộc gọi nhỡ, email, ghi âm; " +
    "cổ trang/fantasy thì dùng thư, người đưa tin, vật đánh dấu, lời nhắn, dấu vết, hoặc một người đang chờ khi quay lại. " +
    "Nếu không có phương tiện liên lạc từ xa hợp lý thì dùng tình huống khi trở lại — TUYỆT ĐỐI không phát minh công nghệ hay phép thuật mới.\n" +
    "- Giữ đúng dấu giọng, động cơ, vị trí, khả năng, kiến thức và mức quan hệ hiện tại của nhân vật.\n" +
    "- KHÔNG được: giải quyết hộ cao trào, bí ẩn chính, xung đột lớn hay hướng của người chơi; " +
    "kết luận thay một mối quan hệ; hay coi việc người chơi không mở app là hành động của nhân vật người chơi (" + nguoiChoi + " KHÔNG hề bỏ hẹn hay im lặng — trừ khi chính truyện đã đặt một thời hạn rõ ràng trước đó).\n" +
    "- Sự kiện ngoài màn hình chỉ được làm quan hệ GIỮA CÁC NHÂN VẬT AI (hoặc nội tâm một nhân vật) nhích NHẸ khi có bằng chứng cụ thể. " +
    "Không đụng tới quan hệ người chơi–nhân vật (việc đó chỉ đổi khi người chơi duyệt ở Khép cảnh). Không sửa tính cách gốc.\n" +
    (chuDong === false
      ? "- Tương tác chủ động đang TẮT: chỉ được tạo sự kiện loại “ngoài màn hình”. Không nhân vật nào được chủ động liên lạc hay để lại dấu hiệu cho người chơi.\n"
      : "") +
    "\nDanh sách nhân vật trong truyện: " + nguoiChoiTrong + ".\n" +
    (goiY.length ? "Hội thoại có thể nhận nội dung nhìn thấy:\n" + goiY.join("\n") + "\n" : "Không có hội thoại nào có thể nhận nội dung nhìn thấy.\n") +
    "\nXuất đúng định dạng sau và không thêm gì khác. Nếu không có sự kiện nào đáng xảy ra, chỉ ghi đúng một dòng: SU KIEN: KHONG CO\n" +
    "SỰ KIỆN 1:\n" +
    "LOẠI: <liên lạc nhìn thấy | dấu hiệu | ngoài màn hình>\n" +
    "SAU KHI RỜI: <số giờ kể từ lúc người chơi rời đi, ví dụ 3 hoặc 3.5 — phải nằm trong khoảng vắng mặt>\n" +
    "HÌNH THỨC: <tin nhắn | cuộc gọi nhỡ | thư | người đưa tin | vật đánh dấu | dấu vết | tình huống khi trở lại | …>\n" +
    "NHÂN VẬT: <tên các nhân vật tham gia, cách nhau dấu phẩy>\n" +
    "HỘI THOẠI: <tên hội thoại đích nếu là nội dung nhìn thấy, hoặc KHONG>\n" +
    "NỘI DUNG: <một tới ba câu, đúng việc đã xảy ra>\n" +
    "AI BIẾT: <tên những người biết chuyện, cách nhau dấu phẩy>\n" +
    "MỨC HIỂN THỊ: <ẩn | hé lộ | đã lộ>\n" +
    "PHÁT HIỆN: <nếu đang ẩn: người chơi có thể phát hiện bằng cách nào; hoặc KHONG>\n" +
    "ẢNH HƯỞNG: <Tên A -> Tên B: tin tưởng | gần gũi | căng thẳng | ảnh hưởng <lên|xuống> | lý do ngắn>; hoặc KHONG\n" +
    (soToiDa > 1 ? "SỰ KIỆN 2: … (chỉ khi thật sự cần)\n" : "") +
    "Chỉ dùng tên nhân vật có trong danh sách. “SAU KHI RỜI” không được vượt quá " + Math.max(0.1, Math.round((phut / 60) * 10) / 10) + " giờ.";

  const parts = [buildContext(story, conv, {})];
  parts.push(
    "# DIỄN BIẾN GẦN NHẤT CỦA CÁC HỘI THOẠI (trước khi người chơi rời đi)\n" + (dongHt || "(chưa có tin nhắn nào)")
  );
  const dsCu = suKienBiet(story, (story.nhanVats || []).map((c) => c.id));
  if (dsCu.length) {
    parts.push(
      "# SỰ KIỆN NGOÀI MÀN HÌNH ĐÃ CÓ (đừng kể lại hoặc trùng với những việc này)\n" +
        dsCu.map((e) => "- " + cat(e.noiDung, 200)).join("\n")
    );
  }
  const instruction = parts.join("\n\n") + "\n\nTASK: " + task;
  const res = await streamText({ instruction, stopSequences: [] });
  if (res.stopReason === "error") throw new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây.");
  return { text: res.text || "" };
}

const MUC_LOAI = [
  [/^lien lac|^tin nhan|^chu dong/, "lienLac"],
  [/^dau hieu|^tinh huong|^dau vet|^khi tro lai/, "dauHieu"],
  [/^ngoai man hinh|^khac|^khong nhin thay/, "ngoaiManHinh"],
];
const MUC_HIEN_AI = [
  [/^da lo|^cong khai|^mo/, "daLo"],
  [/^he lo|^mot phan|^nua lo/, "heLo"],
  [/^an|^bi mat|^chua lo/, "an"],
];

// Đọc kế hoạch vắng mặt. Chịu lỗi hoàn toàn: thiếu trường thì bỏ sự kiện đó, không bao
// giờ để lộ marker ra UI.
export function docKeHoachVangMat(raw, opts = {}) {
  const { story, batDau, ketThuc, phut, soToiDa, cheDo, phienId } = opts;
  const dsTruyen = story && story.nhanVats ? story.nhanVats : [];
  const toanBo = khongDau(raw || "").replace(/\s+/g, " ").trim();
  if (!toanBo || /khong co su kien|su kien khong co|khong co gi/.test(toanBo)) return { suKien: [] };
  const doan = String(raw || "").split(/^\s*[*#>\-\s]*S[ỰU]\s*KI[ỆE]N\s*\d*\s*[:.]\s*$/gim);
  const khoi = doan.slice(1);
  const ds = [];
  const gioToiDa = Math.max(0.08, (Number(phut) || 0) / 60);
  for (const b of khoi) {
    const map = bocTach(b, [
      "LOẠI", "SAU KHI RỜI", "HÌNH THỨC", "NHÂN VẬT", "HỘI THOẠI",
      "NỘI DUNG", "AI BIẾT", "MỨC HIỂN THỊ", "PHÁT HIỆN", "ẢNH HƯỞNG",
    ]);
    const noiDung = laKhongCo(map["NỘI DUNG"]) ? "" : map["NỘI DUNG"].replace(/\s+/g, " ").trim();
    if (!noiDung) continue;
    const loaiChu = khongDau(map["LOẠI"]).toLowerCase();
    const loai = (MUC_LOAI.find((x) => x[0].test(loaiChu)) || [])[1] || "ngoaiManHinh";
    const mucChu = khongDau(map["MỨC HIỂN THỊ"]).toLowerCase();
    const muc = (MUC_HIEN_AI.find((x) => x[0].test(mucChu)) || [])[1] || (loai === "ngoaiManHinh" ? "an" : "daLo");
    const soGio = String(map["SAU KHI RỜI"] || "").replace(",", ".").match(/[\d.]+/);
    const gio = soGio ? Number(soGio[0]) : NaN;
    const lech = isFinite(gio) ? Math.min(gioToiDa, Math.max(0, gio)) : gioToiDa / 2;
    const thanhVien = tachTen(map["NHÂN VẬT"], story, false);
    const biet = tachTen(map["AI BIẾT"], story, true);
    const conv = convTheoTen(story, map["HỘI THOẠI"]);
    const thamGia = thanhVien.length ? thanhVien : biet.filter((id) => id !== TT.ID_NGUOI);
    const htId = loai !== "ngoaiManHinh" && conv && thamGia.length && (conv.nhanVatIds || []).some((id) => thamGia.indexOf(id) >= 0) ? conv.id : "";
    const anhHuong = docAnhHuongNgoai(map["ẢNH HƯỞNG"], story);
    ds.push({
      id: TT.ma("vg"),
      luc: Math.round(Number(batDau) + lech * 3600000),
      loai: loai === "ngoaiManHinh" || htId ? loai : "ngoaiManHinh",
      hinhThuc: laKhongCo(map["HÌNH THỨC"]) ? "" : map["HÌNH THỨC"].replace(/\s+/g, " ").trim().slice(0, 80),
      noiDung,
      thamGia: thamGia.slice(0, 8),
      biet: (biet.length ? biet : thamGia).slice(0, 10),
      muc,
      phatHien: laKhongCo(map["PHÁT HIỆN"]) ? "" : map["PHÁT HIỆN"].replace(/\s+/g, " ").trim(),
      htId,
      tnIds: [],
      anhHuong,
      phienId: phienId || "",
      phutVangMat: Math.max(0, Math.round(Number(phut) || 0)),
      cheDoVangMat: cheDo === "theoCanh" || cheDo === "thoiGianThat" ? cheDo : "tamDung",
      suaLuc: Date.now(),
    });
    if (ds.length >= Math.max(1, Number(soToiDa) || 3)) break;
  }
  // Không cho vượt quá giới hạn cứng của chế độ, và luôn sắp theo thời gian.
  ds.sort((a, b) => a.luc - b.luc);
  return { suKien: ds };
}

// "A -> B: tin tưởng lên | vì lý do; C: cảm xúc | mới"
function docAnhHuongNgoai(raw, story) {
  const quanHe = [];
  const noiTam = [];
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s || laKhongCo(s)) return { quanHe, noiTam };
  for (const phan of s.split(/[;•]+/)) {
    const t = phan.trim();
    if (!t) continue;
    let m = t.match(/^([^:]{1,42}?)\s*(?:->|=>|→|–>|—>)\s*([^:]{1,42}?)\s*[:：]\s*([\s\S]+)$/);
    if (m) {
      const tu = tenRaIdTruyen(story, m[1], false);
      const den = tenRaIdTruyen(story, m[2], false);
      if (!tu || !den || tu === den) continue;
      const p = tachPhan(m[3]);
      const chu = khongDau(p.chinh).toLowerCase();
      const lyDo = ((p.phan.find((x) => /^(vi|ly do)/.test(x.nhan)) || {}).gt || "").trim();
      let chieu = "";
      if (/tin tuong/.test(chu)) chieu = "tinTuong";
      else if (/gan gui|than thiet/.test(chu)) chieu = "ganGui";
      else if (/cang thang/.test(chu)) chieu = "cangThang";
      else if (/anh huong|quyen luc/.test(chu)) chieu = "quyenLuc";
      if (!chieu) continue;
      const huong = /xuong|giam|bot|↓/.test(chu) ? -1 : 1;
      quanHe.push({ tu, den, chieu, huong, buoc: 1, lyDo, moi: "" });
      continue;
    }
    m = t.match(/^([^:]{1,42}?)\s*[:：]\s*([\s\S]+)$/);
    if (!m) continue;
    const nvId = tenRaIdTruyen(story, m[1], false);
    if (!nvId) continue;
    const p = tachPhan(m[2]);
    const chu = khongDau(p.chinh).toLowerCase();
    const tr =
      (/muc tieu/.test(chu) && "mucTieu") ||
      (/cam xuc/.test(chu) && "camXuc") ||
      (/mau thuan/.test(chu) && "mauThuan") ||
      (/dong co/.test(chu) && "dongCo") ||
      (/che giau/.test(chu) && "cheGiau") ||
      (/huong thay doi|khuynh huong/.test(chu) && "huongThayDoi") ||
      "";
    if (!tr) continue;
    const moi = ((p.phan.find((x) => /^(moi|hien tai|sau|moi day|gio)/.test(x.nhan)) || {}).gt || "").trim();
    const lyDo = ((p.phan.find((x) => /^(vi|ly do)/.test(x.nhan)) || {}).gt || "").trim();
    if (!moi) continue;
    noiTam.push({ nvId, truong: tr, moi, lyDo });
  }
  return { quanHe: quanHe.slice(0, 4), noiTam: noiTam.slice(0, 4) };
}

// Tín hiệu hé lộ: model ghi "<<HELO: S1, S2>>" khi một sự kiện ẩn vừa được kể/lộ ra
// trong đoạn vừa viết. Trả về danh sách MÃ (S1, S2…); app tự ánh xạ về id sự kiện.
export function docHeLo(raw) {
  const s = String(raw || "");
  const ra = [];
  const re = /<<\s*HELO\s*[:：]?\s*([^>]*)>>/gi;
  let m;
  while ((m = re.exec(s))) {
    for (const x of String(m[1]).split(/[,;\s]+/)) {
      const k = x.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (k && ra.indexOf(k) < 0) ra.push(k);
    }
  }
  return ra;
}
