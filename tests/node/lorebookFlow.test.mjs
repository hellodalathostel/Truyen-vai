// Truyện Vai — tầng kiểm thử Node: LOGIC THUẦN của màn "Sổ tri thức (lorebook)" (Đợt 6c).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `openLorebook` từng là một hàm 299 dòng trộn DOM với quyết định. Sau khi
// tách, phần quyết định nằm ở `src/ui/lorebook/lorebookFlow.js` — tệp này ghim chúng lại.
//
// PHẦN PARSE / XẾP / LỌC mục lore KHÔNG nằm ở đây: nó ở lõi (`src/lore.js`) và đã có
// `tests/node/lore.test.mjs` phủ `docLorebook` / `chuanMuc` / `buildLore` / `mucKhop`.
// Tệp này chỉ kiểm phần quyết định CÒN LẠI của màn.
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const F = await import("../../src/ui/lorebook/lorebookFlow.js");

// =============================================================== đếm + lọc
test("soBat: đếm số mục đang bật", () => {
  eq(F.soBat([]), 0, "sổ trống");
  eq(F.soBat([{ bat: true }, { bat: false }, { bat: true }]), 2, "hai trong ba");
  eq(F.soBat([{ bat: false }, {}]), 0, "thiếu cờ coi như tắt");
  eq(F.soBat([{ bat: 1 }, { bat: "x" }, { bat: null }]), 2, "cờ không phải boolean vẫn tính theo độ thật");
});

test("bangKhop: bản đồ id mục ⇒ chi tiết khớp (để tô đậm trong danh sách)", () => {
  const a = { entry: { id: "e1" }, ly: "từ khoá" };
  const b = { entry: { id: "e2" }, ly: "liên quan" };
  const m = F.bangKhop([a, b]);
  eq(m.size, 2, "đủ hai mục");
  eq(m.get("e1"), a, "tra đúng mục 1");
  eq(m.get("e2"), b, "tra đúng mục 2");
  eq(m.get("e3"), undefined, "mục không khớp ⇒ undefined");
  eq(F.bangKhop([]).size, 0, "rỗng ⇒ bản đồ rỗng");
  // Trùng id thì bản ghi SAU thắng (không được để hai nguồn sự thật cho cùng một id).
  const c = { entry: { id: "e1" }, ly: "sau" };
  eq(F.bangKhop([a, c]).get("e1").ly, "sau", "trùng id ⇒ bản sau thắng");
});

// =============================================================== hỏi lại khi thay sổ
test("coHoiThayThe: chỉ hỏi khi ĐANG có mục VÀ người dùng chọn thay thế", () => {
  eq(F.coHoiThayThe(0, true), false, "sổ trống ⇒ thay thế không mất gì, khỏi hỏi");
  eq(F.coHoiThayThe(3, true), true, "có 3 mục ⇒ phải hỏi");
  eq(F.coHoiThayThe(3, false), false, "không chọn thay thế ⇒ thêm vào");
  eq(F.coHoiThayThe(3, undefined), false, "thiếu cờ ⇒ thêm vào");
  eq(F.coHoiThayThe(0, false), false, "rỗng và không thay thế");
});

// =============================================================== câu hỏi / câu lỗi
test("câu hỏi xác nhận: giữ nguyên chuỗi người dùng thấy", () => {
  eq(F.cauHoiThayThe(4, 9), "Xoá 4 mục hiện có và thay bằng 9 mục vừa đọc?", "câu hỏi thay thế");
  eq(F.cauHoiXoaSo(7), "Xoá toàn bộ 7 mục của sổ tri thức? Không thể hoàn tác.", "câu hỏi xoá cả sổ");
  eq(F.cauHoiXoaMuc("Hội đồng"), "Xoá mục “Hội đồng” khỏi sổ tri thức?", "câu hỏi xoá một mục");
  eq(F.cauHoiXoaMuc(""), "Xoá mục “” khỏi sổ tri thức?", "mục không tên vẫn ra câu hỏi dùng được");
});

test("loiDocFile / loiNhapFile: hai câu lỗi khác nhau, đều nêu được lý do", () => {
  eq(F.loiDocFile({ message: "JSON hỏng" }), "Không đọc được file: JSON hỏng", "lỗi đọc file");
  eq(F.loiNhapFile({ message: "mạng lỗi" }), "Nhập thất bại: mạng lỗi", "lỗi nhập");
  eq(F.loiDocFile("chuỗi"), "Không đọc được file: chuỗi", "lỗi không phải Error vẫn in ra");
  eq(F.loiDocFile(null), "Không đọc được file: null", "null an toàn");
  eq(F.loiNhapFile(undefined), "Nhập thất bại: undefined", "undefined an toàn");
  ok(F.loiDocFile({}) !== F.loiNhapFile({}), "hai đường lỗi nói hai câu khác nhau");
});

// =============================================================== thông báo sau khi nạp
const KQ_RONG = { entries: [{}, {}], boQua: [], thieuTuKhoa: 0 };
test("thongBaoNhap: câu đuôi dùng chung cho cả ba đường nạp", () => {
  eq(F.thongBaoNhap(KQ_RONG, "Đã thêm 2 mục vào sổ."), "Đã thêm 2 mục vào sổ.", "không có gì bị bỏ ⇒ chỉ có câu đầu");
  eq(
    F.thongBaoNhap({ entries: [{}], boQua: [{}, {}, {}], thieuTuKhoa: 0 }, "Đã thêm 1 mục vào sổ."),
    "Đã thêm 1 mục vào sổ. Bỏ qua 3 mục thiếu nội dung.",
    "có mục bị bỏ qua"
  );
  eq(
    F.thongBaoNhap({ entries: [{}], boQua: [], thieuTuKhoa: 2 }, "Đã thêm 1 mục vào sổ."),
    "Đã thêm 1 mục vào sổ. 2 mục thiếu từ khoá đã được tắt.",
    "có mục thiếu từ khoá"
  );
  eq(
    F.thongBaoNhap({ entries: [{}], boQua: [{}], thieuTuKhoa: 3 }, "Thêm xong."),
    "Thêm xong. Bỏ qua 1 mục thiếu nội dung. 3 mục thiếu từ khoá đã được tắt.",
    "cả hai phần, đúng thứ tự"
  );
});

test("thongBaoNhapFile: nêu số mục và TÊN file vừa nạp", () => {
  eq(
    F.thongBaoNhapFile({ entries: [{}, {}], boQua: [], thieuTuKhoa: 0 }, "so.json"),
    "Đã nạp 2 mục từ “so.json”.",
    "đủ câu"
  );
  eq(
    F.thongBaoNhapFile({ entries: [{}], boQua: [{}], thieuTuKhoa: 1 }, "a.json"),
    "Đã nạp 1 mục từ “a.json”. Bỏ qua 1 mục thiếu nội dung. 1 mục thiếu từ khoá đã được tắt.",
    "kèm hai phần cảnh báo"
  );
});

test("fileKhongDungDuoc: file chỉ toàn mục bỏ qua ⇒ KHÔNG được báo nạp thành công", () => {
  eq(F.fileKhongDungDuoc({ entries: [], boQua: [{}] }), true, "toàn mục thiếu nội dung");
  eq(F.fileKhongDungDuoc({ entries: [{}], boQua: [{}] }), false, "còn mục dùng được");
  eq(F.fileKhongDungDuoc({ entries: [], boQua: [] }), false, "file rỗng hoàn toàn ⇒ để lõi báo lỗi khác");
  eq(F.fileKhongDungDuoc({ entries: [{}], boQua: [] }), false, "sạch trơn");
});

// =============================================================== dựng mục từ form
test("mucTuForm: tách từ khoá theo dấu phẩy, bỏ phần rỗng", () => {
  const ra = F.mucTuForm({ keys: "hội đồng, năm người ,,  tháp ", keys2: "quyền lực" });
  eqSau(ra.keys, ["hội đồng", "năm người", "tháp"], "từ khoá chính");
  eqSau(ra.keys2, ["quyền lực"], "từ khoá phụ");
  eqSau(F.mucTuForm({ keys: "" }).keys, [], "chuỗi rỗng ⇒ mảng rỗng");
  eqSau(F.mucTuForm({}).keys, [], "thiếu trường ⇒ mảng rỗng");
});

test("mucTuForm: tên mục rỗng thì lấy từ khoá đầu, cuối cùng là \"Mục\"", () => {
  eq(F.mucTuForm({ ghiChu: "Tên", keys: "a" }).ghiChu, "Tên", "có tên thì giữ");
  eq(F.mucTuForm({ ghiChu: "   ", keys: "a, b" }).ghiChu, "a", "tên trống ⇒ từ khoá đầu");
  eq(F.mucTuForm({ ghiChu: "", keys: "" }).ghiChu, "Mục", "không còn gì để lấy ⇒ \"Mục\"");
  eq(F.mucTuForm({}).ghiChu, "Mục", "thiếu hết ⇒ \"Mục\"");
  eq(F.mucTuForm({ ghiChu: "  Tên  ", keys: "a" }).ghiChu, "Tên", "tên được cắt khoảng trắng");
  eq(F.mucTuForm({ ghiChu: "  ", keys: "  a  " }).ghiChu, "a", "từ khoá đầu đã được cắt khoảng trắng");
});

test("mucTuForm: ưu tiên / độ sâu — 0 là giá trị hợp lệ, chỉ chuỗi rỗng mới về 0", () => {
  eq(F.mucTuForm({ thuTu: "0" }).thuTu, 0, "0 hợp lệ");
  eq(F.mucTuForm({ thuTu: "-3" }).thuTu, -3, "số âm cho ưu tiên được giữ");
  eq(F.mucTuForm({ thuTu: "" }).thuTu, 0, "rỗng ⇒ 0");
  eq(F.mucTuForm({ thuTu: "abc" }).thuTu, 0, "không phải số ⇒ 0");
  eq(F.mucTuForm({}).thuTu, 0, "thiếu ⇒ 0");
  eq(F.mucTuForm({ doSau: "5" }).doSau, 5, "độ sâu 5");
  eq(F.mucTuForm({ doSau: "-2" }).doSau, 0, "độ sâu âm ⇒ 0 (không cho quét lui)");
  eq(F.mucTuForm({ doSau: "" }).doSau, 0, "rỗng ⇒ 0");
});

test("mucTuForm: năm hộp tích chuyển thành cờ boolean thật", () => {
  const ra = F.mucTuForm({
    keys: "a", hangSo: 1, chonLoc: "x", phanBietHoa: true, khopTronTu: 0, khongDeQuy: null,
  });
  eq(ra.hangSo, true, "Luôn gửi");
  eq(ra.chonLoc, true, "Cần khoá phụ");
  eq(ra.phanBietHoa, true, "Phân biệt hoa/thường");
  eq(ra.khopTronTu, false, "Khớp trọn từ");
  eq(ra.khongDeQuy, false, "Không cho kéo theo");
  const rong = F.mucTuForm({});
  eq(rong.hangSo, false, "thiếu ⇒ tắt");
  eq(rong.chonLoc, false, "thiếu ⇒ tắt");
  eq(rong.phanBietHoa, false, "thiếu ⇒ tắt");
  eq(rong.khopTronTu, false, "thiếu ⇒ tắt");
  eq(rong.khongDeQuy, false, "thiếu ⇒ tắt");
});

test("mucTuForm: nội dung được cắt khoảng trắng hai đầu", () => {
  eq(F.mucTuForm({ noiDung: "  Nội dung  " }).noiDung, "Nội dung", "cắt hai đầu");
  eq(F.mucTuForm({ noiDung: "  " }).noiDung, "", "toàn khoảng trắng ⇒ rỗng");
  eq(F.mucTuForm({}).noiDung, "", "thiếu ⇒ rỗng");
  eq(F.mucTuForm({ noiDung: null }).noiDung, "", "null ⇒ rỗng");
});

test("thieuNoiDung: mục không nội dung không được lưu", () => {
  eq(F.thieuNoiDung(""), true, "rỗng");
  eq(F.thieuNoiDung("   "), true, "toàn khoảng trắng");
  eq(F.thieuNoiDung(null), true, "null");
  eq(F.thieuNoiDung(undefined), true, "undefined");
  eq(F.thieuNoiDung("x"), false, "có nội dung");
  eq(F.thieuNoiDung("  x  "), false, "có nội dung quanh khoảng trắng");
});

// =============================================================== tên file xuất
test("tenFileXuat: bỏ ký tự lạ, giữ chữ có dấu, nối bằng gạch ngang", () => {
  eq(F.tenFileXuat("Mưa trên phố cổ"), "lorebook-mưa-trên-phố-cổ.json", "chữ có dấu được giữ");
  eq(F.tenFileXuat("Truyện 2"), "lorebook-truyện-2.json", "chữ số được giữ");
  eq(F.tenFileXuat("a/b:c"), "lorebook-a-b-c.json", "ký tự lạ thành gạch ngang, gộp lại");
  eq(F.tenFileXuat("a  ///  b"), "lorebook-a-b.json", "chuỗi ký tự lạ liền nhau gộp thành MỘT gạch");
  eq(F.tenFileXuat(""), "lorebook-so.json", "tên rỗng ⇒ tên dự phòng");
  eq(F.tenFileXuat(null), "lorebook-so.json", "null ⇒ tên dự phòng");
  eq(F.tenFileXuat(undefined), "lorebook-so.json", "undefined ⇒ tên dự phòng");
  ok(F.tenFileXuat("x").indexOf(".json") === F.tenFileXuat("x").length - 5, "luôn kết thúc bằng .json");
});

// =============================================================== hằng câu chữ
test("hằng câu chữ dùng chung, không chép lại ở tầng DOM", () => {
  eq(F.SO_TRONG, "Sổ đang trống.", "câu sổ trống");
  eq(F.LOI_MUC_TRONG, "Mục chưa có nội dung.", "câu mục trống");
  eq(F.LOI_FILE_RONG, "File không có mục nào dùng được.", "câu file rỗng");
  ok(F.LOI_FILE_RONG !== F.LOI_MUC_TRONG, "hai câu lỗi khác nhau");
});
