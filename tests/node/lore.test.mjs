// Truyện Vai — tầng kiểm thử Node: sổ tri thức (src/lore.js).

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import {
  newLoreEntry, newLorebook, loreCua, chamLore, docLorebook, chuanMuc, xuatLorebook,
  mucKhop, buildLore, viDuLorebook,
} from "../../src/lore.js";
import { taoTruyen, taoTinNhan, taoHoiThoai } from "../fixtures/truyen.mjs";

const co = (s, x) => String(s).indexOf(x) >= 0;
const NH = String.fromCharCode(10);

// Mỗi ca dựng truyện với id RIÊNG: bộ đệm "mục đang khớp" khoá theo nội dung + id truyện,
// nên id riêng bảo đảm các ca không dùng chung kết quả đệm.
function truyenLore(id, entries) {
  return taoTruyen({ id: id, ten: "ZZ Lore", lorebook: { ten: "", phienBan: 1, entries: entries } });
}
function tin(noiDung) {
  return [taoTinNhan("m1", "nguoi", "Bạn", noiDung)];
}

test("newLoreEntry: mặc định bật, có id, mảng từ khoá được chuẩn hoá", () => {
  const e = newLoreEntry({ keys: "a, b" });
  ok(e.id && e.id.indexOf("lb") === 0, "mục mới được cấp id");
  eq(e.bat, true, "mặc định bật");
  eq(e.hangSo, false, "mặc định không cố định");
  eq(e.thuTu, 100, "thứ tự mặc định");
  eqSau(e.keys, ["a", "b"], "từ khoá dạng chuỗi được tách");
  eqSau(e.keys2, [], "chưa có từ khoá phụ");
  eq(e.noiDung, "", "nội dung rỗng");
  const e2 = newLoreEntry({ id: "lb_x", bat: false, hangSo: 1 });
  eq(e2.id, "lb_x", "id truyền vào được giữ");
  eq(e2.bat, false, "tắt được giữ");
  eq(e2.hangSo, false, "giá trị không phải true thì không thành cố định");
  eq(newLorebook({ entries: [{ keys: ["k"], noiDung: "n" }] }).entries.length, 1, "dựng sổ từ danh sách mục");
});

test("chuanMuc: đọc được mọi cách viết tên trường", () => {
  const e = chuanMuc({
    comment: "Ghi chú", key: "a", keysecondary: ["b"], content: "Nội dung",
    constant: true, selective: true, order: 5, scanDepth: 3,
    caseSensitive: true, matchWholeWords: true, preventRecursion: true, enabled: true,
  });
  eq(e.ghiChu, "Ghi chú", "comment thành ghi chú");
  eqSau(e.keys, ["a"], "key đơn thành mảng");
  eqSau(e.keys2, ["b"], "keysecondary");
  eq(e.noiDung, "Nội dung", "content");
  eq(e.hangSo, true, "constant");
  eq(e.chonLoc, true, "selective");
  eq(e.thuTu, 5, "order");
  eq(e.doSau, 3, "scanDepth");
  eq(e.phanBietHoa, true, "caseSensitive");
  eq(e.khopTronTu, true, "matchWholeWords");
  eq(e.khongDeQuy, true, "preventRecursion");
  eq(e.bat, true, "enabled");
  const e2 = chuanMuc({ name: "Tên", keys: ["k"], noiDung: "N", disable: true }, 4);
  eq(e2.ghiChu, "Tên", "name thành ghi chú");
  eq(e2.bat, false, "disable tắt mục");
  const e3 = chuanMuc({ keys: ["từ khoá đầu"], noiDung: "N" }, 0);
  eq(e3.ghiChu, "từ khoá đầu", "thiếu ghi chú thì lấy từ khoá đầu");
  eq(chuanMuc({ noiDung: "N" }, 6).ghiChu, "Mục 7", "không có gì thì đánh số");
  eq(chuanMuc("rác", 0).noiDung, "", "giá trị rác thành mục rỗng");
});

test("docLorebook: nhận nhiều chuẩn file, báo lỗi rõ ràng", () => {
  const tuChuoi = docLorebook(JSON.stringify({ name: "Sổ", entries: { 0: { key: ["a"], content: "A" }, 1: { key: ["b"], content: "B" } } }));
  eq(tuChuoi.ten, "Sổ", "đọc được tên sổ");
  eq(tuChuoi.entries.length, 2, "đọc được hai mục từ dạng đối tượng");
  eq(tuChuoi.entries[1].noiDung, "B", "thứ tự khoá số được giữ");
  const tuMang = docLorebook([{ key: ["a"], content: "A" }]);
  eq(tuMang.entries.length, 1, "nhận mảng mục");
  const theNhanVat = docLorebook({ data: { character_book: { name: "CB", entries: [{ keys: ["a"], content: "A" }] } } });
  eq(theNhanVat.ten, "CB", "nhận character_book lồng trong data");
  const motMuc = docLorebook({ key: ["a"], content: "A" });
  eq(motMuc.entries.length, 1, "nhận một mục đơn lẻ");
  const kq2 = docLorebook({ entries: [{ key: ["a"], content: "A" }, { key: ["b"], content: "" }, { key: [], content: "C", enabled: true }] });
  eq(kq2.entries.length, 2, "bỏ mục thiếu nội dung");
  eq(kq2.boQua.length, 1, "ghi lại mục đã bỏ");
  eq(kq2.thieuTuKhoa, 1, "đếm mục bật nhưng thiếu từ khoá");
  eq(kq2.entries[1].bat, false, "mục thiếu từ khoá bị tắt thay vì gửi vô điều kiện");
  bao(() => docLorebook(""), "chuỗi rỗng thì báo lỗi");
  bao(() => docLorebook("{ khong-phai-json"), "JSON hỏng thì báo lỗi");
  bao(() => docLorebook(5), "không phải đối tượng thì báo lỗi");
  bao(() => docLorebook({ entries: [{ content: "" }] }), "không mục nào dùng được thì báo lỗi");
  bao(() => docLorebook({ khongCo: 1 }), "không có entries thì báo lỗi");
  ok(viDuLorebook().entries, "có sổ mẫu để người dùng tham khảo");
});

test("xuatLorebook: xuất ngược ra chuẩn World Info và đọc lại được", () => {
  const s = truyenLore("ct_zzlo1", [
    { id: "lb_1", ghiChu: "A", keys: ["a"], keys2: ["a2"], noiDung: "Nội dung A", hangSo: true, chonLoc: true, thuTu: 7, doSau: 2, phanBietHoa: true, khopTronTu: true, khongDeQuy: true },
    { id: "lb_2", ghiChu: "B", keys: ["b"], noiDung: "Nội dung B", bat: false },
  ]);
  const txt = xuatLorebook(s);
  ok(co(txt, "\"key\""), "có trường key");
  ok(co(txt, "\"keysecondary\""), "có trường keysecondary");
  ok(co(txt, "\"disable\": true"), "mục đã tắt được đánh dấu");
  const lai = docLorebook(txt);
  eq(lai.entries.length, 2, "đọc lại đủ hai mục");
  const a = lai.entries[0];
  eq(a.ghiChu, "A", "ghi chú đi và về");
  eqSau(a.keys, ["a"], "từ khoá đi và về");
  eqSau(a.keys2, ["a2"], "từ khoá phụ đi và về");
  eq(a.hangSo, true, "cố định đi và về");
  eq(a.chonLoc, true, "chọn lọc đi và về");
  eq(a.thuTu, 7, "thứ tự đi và về");
  eq(a.doSau, 2, "độ sâu dò đi và về");
  eq(a.phanBietHoa, true, "phân biệt hoa thường đi và về");
  eq(a.khopTronTu, true, "khớp trọn từ đi và về");
  eq(a.khongDeQuy, true, "không đệ quy đi và về");
  eq(lai.entries[1].bat, false, "mục tắt vẫn tắt sau khi đọc lại");
});

test("mucKhop: khớp từ khoá, mục cố định luôn gửi, mục tắt không bao giờ gửi", () => {
  const s = truyenLore("ct_zzlo2", [
    { id: "lb_1", ghiChu: "Bến tàu", keys: ["bến tàu"], noiDung: "Bến tàu đã đóng.", thuTu: 1 },
    { id: "lb_2", ghiChu: "Thời tiết", keys: [], noiDung: "Thế giới này luôn mưa.", hangSo: true, thuTu: 2 },
    { id: "lb_3", ghiChu: "Tắt", keys: ["bến tàu"], noiDung: "Mục đã tắt.", bat: false, thuTu: 3 },
  ]);
  const khi = mucKhop(s, null, tin("chúng ta ra bến tàu nhé"));
  eqSau(khi.map((x) => x.entry.id), ["lb_1", "lb_2"], "khớp từ khoá cộng mục cố định");
  eq(khi[0].ly, "từ khoá", "lý do khớp");
  eq(khi[1].ly, "cố định", "lý do gửi mục cố định");
  const khong = mucKhop(s, null, tin("chúng ta ở nhà"));
  eqSau(khong.map((x) => x.entry.id), ["lb_2"], "không nhắc tới thì chỉ còn mục cố định");
  eqSau(mucKhop(taoTruyen({ id: "ct_zzlo3", lorebook: { entries: [] } }), null, tin("x")), [], "sổ rỗng thì không gửi gì");
});

test("mucKhop: chọn lọc cần thêm từ khoá phụ", () => {
  const s = truyenLore("ct_zzlo4", [
    { id: "lb_1", ghiChu: "Sẹo", keys: ["quân"], keys2: ["sẹo"], chonLoc: true, noiDung: "Vết sẹo cũ." },
  ]);
  eq(mucKhop(s, null, tin("Quân đến chơi")).length, 0, "chỉ có từ khoá chính thì chưa gửi");
  eq(mucKhop(s, null, tin("Quân có vết sẹo trên tay")).length, 1, "có thêm từ khoá phụ thì gửi");
  eq(mucKhop(s, null, tin("chỉ nói tới sẹo")).length, 0, "thiếu từ khoá chính thì không gửi");
});

test("mucKhop: phân biệt hoa thường và khớp trọn từ", () => {
  const s1 = truyenLore("ct_zzlo5", [{ id: "lb_1", ghiChu: "Hoa", keys: ["Duy"], phanBietHoa: true, noiDung: "Nội dung." }]);
  eq(mucKhop(s1, null, tin("Duy đứng đó")).length, 1, "đúng hoa thường thì khớp");
  eq(mucKhop(s1, null, tin("duy đứng đó")).length, 0, "sai hoa thường thì không khớp");
  const s2 = truyenLore("ct_zzlo6", [{ id: "lb_1", ghiChu: "Từ", keys: ["an"], khopTronTu: true, noiDung: "Nội dung." }]);
  eq(mucKhop(s2, null, tin("gặp an nhé")).length, 1, "khớp trọn từ");
  eq(mucKhop(s2, null, tin("anh ấy đứng đó")).length, 0, "không khớp khi nằm trong từ khác");
});

test("mucKhop: mục vừa khớp kéo theo mục liên quan, trừ khi đánh dấu không đệ quy", () => {
  const s = truyenLore("ct_zzlo7", [
    { id: "lb_1", ghiChu: "Chìa khoá", keys: ["chìa khoá"], noiDung: "Nhắc tới từ HẦM.", thuTu: 1 },
    { id: "lb_2", ghiChu: "Không đệ quy", keys: ["hầm"], khongDeQuy: true, noiDung: "Không được kéo theo.", thuTu: 2 },
    { id: "lb_3", ghiChu: "Đệ quy", keys: ["hầm"], noiDung: "Được kéo theo.", thuTu: 3 },
  ]);
  const kq = mucKhop(s, null, tin("tôi cầm chìa khoá"));
  eqSau(kq.map((x) => x.entry.id), ["lb_1", "lb_3"], "mục liên quan được kéo theo, mục không đệ quy thì không");
  eq(kq[1].ly, "liên quan", "lý do là liên quan chứ không phải từ khoá");
});

test("buildLore: khối văn bản chèn vào prompt", () => {
  const s = truyenLore("ct_zzlo8", [
    { id: "lb_1", ghiChu: "Bến tàu", keys: ["bến tàu"], noiDung: "Bến tàu đã đóng từ lâu." },
  ]);
  eq(buildLore(s, null, tin("ở nhà")), "", "không khớp gì thì prompt không đổi");
  const khoi = buildLore(s, null, tin("ra bến tàu"));
  ok(co(khoi, "SỔ TRI THỨC"), "có tiêu đề khối");
  ok(co(khoi, "## Bến tàu"), "có tiêu đề mục");
  ok(co(khoi, "Bến tàu đã đóng từ lâu."), "có nội dung mục");
  const s2 = truyenLore("ct_zzlo9", [{ id: "lb_1", ghiChu: "Không có", keys: [], noiDung: "", hangSo: true }]);
  eq(buildLore(s2, null, tin("x")), "", "mục rỗng thì không tạo khối");
  const s3 = truyenLore("ct_zzlo10", [{ id: "lb_1", ghiChu: "Dài", keys: [], noiDung: "x".repeat(2000), hangSo: true }]);
  ok(co(buildLore(s3, null, tin("x")), "[…]"), "nội dung quá dài bị cắt và đánh dấu");
});

test("loreCua: bù mặc định cho truyện cũ, không mất dữ liệu", () => {
  const s = taoTruyen({ lorebook: undefined });
  const lb = loreCua(s);
  eqSau(lb.entries, [], "truyện chưa có sổ thì được cấp sổ rỗng");
  ok(lb.phienBan > 0, "có phiên bản");
  const s2 = taoTruyen({ lorebook: { entries: [{ ghiChu: "A", noiDung: "N" }] } });
  const lb2 = loreCua(s2);
  ok(lb2.entries[0].id && lb2.entries[0].id.indexOf("lb") === 0, "mục thiếu id được cấp id");
  s2.lorebook.phienBan = 1;
  chamLore(s2);
  ok(s2.lorebook.phienBan > 1, "chạm sổ thì phiên bản đổi (bộ đệm khớp hết hiệu lực)");
});
