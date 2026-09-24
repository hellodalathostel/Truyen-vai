// Truyện Vai — tầng kiểm thử Node: LOGIC THUẦN của màn tạo ảnh (Giai đoạn 6).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `openTaoAnh` từng là một hàm 566 dòng trộn DOM với quyết định, nên
// không kiểm được gì ở tầng Node. Sau khi tách, mọi quyết định nằm ở
// `src/ui/taoAnh/taoAnhFlow.js` — tệp này ghim chúng lại.
//
// Hai ca quan trọng nhất:
//   • SNAPSHOT PROMPT — prompt gửi máy vẽ cho một đầu vào cố định phải GIỐNG TỪNG BYTE.
//     Đổi chuỗi đó nghĩa là đổi thứ máy vẽ nhận được (một thay đổi HÀNH VI, không phải
//     thay đổi kỹ thuật), nên nó phải là một quyết định có ý thức.
//   • HAI ĐƯỜNG GHÉP PROMPT PHẢI TRÙNG NHAU — đường "Dựng khung hình" và đường dự phòng
//     của "Đưa vào truyện" phải cho ra đúng một chuỗi.

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const F = await import("../../src/ui/taoAnh/taoAnhFlow.js");

// ---------------------------------------------------------------- dữ liệu mẫu (HƯ CẤU)
const ZARA = {
  id: "nho_zz1",
  tenChinh: "Zara",
  tuoi: "24",
  moTa: "tóc đen dài",
  moTaEn: "long black hair",
  tranh: "kính",
  tranhEn: "glasses",
};
const ZENO = {
  id: "nho_zz2",
  tenChinh: "Zeno",
  tuoi: "31",
  moTa: "tóc ngắn",
  moTaEn: "short hair",
  tranh: "",
  tranhEn: "",
};
const HO_SO = [ZARA, ZENO];
const MAP = { nho_zz1: ZARA, nho_zz2: ZENO };
const UV = [
  { nvId: "nv_zz1", hoSoId: "nho_zz1", ten: ["Zara"] },
  { nvId: "nv_zz2", hoSoId: "nho_zz2", ten: ["Zeno"] },
];
const PHONG_CACH = [
  { id: "dien-anh", them: "cinematic film still, 35mm lens" },
  { id: "anime", them: "anime key visual" },
];
const KHONG = (x) => ({ has: (k) => x.indexOf(k) >= 0, size: x.length });

// Bộ ba Set trạng thái của khu chọn.
const bo = (tuDong, them, boQua) => ({
  tuDongIds: new Set(tuDong),
  themIds: new Set(them),
  boQuaIds: new Set(boQua),
});

// =============================================================== chọn hồ sơ
test("chonHoSo: lấy theo thứ tự ứng viên → thư viện → thêm tay, không lặp", () => {
  const s = bo(["nho_zz2"], ["nho_zz1"], []);
  const ra = F.chonHoSo({ ungVien: UV, dsHoSo: HO_SO, hoSoMap: MAP, ...s });
  eqSau(ra.map((h) => h.id), ["nho_zz2", "nho_zz1"], "ứng viên trước, thêm tay sau");
});

test("chonHoSo: bỏ chọn thắng cả nhận diện lẫn thêm tay; id lạ bị bỏ qua", () => {
  const s = bo(["nho_zz1", "nho_zz2"], ["nho_zz1", "khong_ton_tai"], ["nho_zz2"]);
  const ra = F.chonHoSo({ ungVien: UV, dsHoSo: HO_SO, hoSoMap: MAP, ...s });
  eqSau(ra.map((h) => h.id), ["nho_zz1"], "bỏ chọn bị loại, id lạ bị bỏ qua");
});

test("chonHoSo: danh sách rỗng thì trả mảng rỗng (không ném)", () => {
  eqSau(F.chonHoSo({ ungVien: null, dsHoSo: null, hoSoMap: {}, ...bo([], [], []) }), [], "rỗng");
});

// =============================================================== nhận diện trong khung
test("nhanDienTrongKhung: nhận tên trong mô tả + yêu cầu thêm", () => {
  const kq = F.nhanDienTrongKhung({ moTa: "Zara đứng dưới mưa", ghiChu: "", ungVien: UV, hoSoMap: MAP, dsNhanVatCoMat: [], hoSoNguoiChoi: null });
  ok(kq.tuDongIds.has("nho_zz1"), "nhận ra Zara");
  eq(kq.tuDongIds.size, 1, "chỉ một người");
  eqSau(kq.trungTen, [], "không có tên trùng");
});

test("nhanDienTrongKhung: quét CẢ ô yêu cầu thêm", () => {
  const kq = F.nhanDienTrongKhung({ moTa: "", ghiChu: "thêm Zeno vào khung", ungVien: UV, hoSoMap: MAP, dsNhanVatCoMat: [], hoSoNguoiChoi: null });
  ok(kq.tuDongIds.has("nho_zz2"), "nhận ra Zeno từ ô ghi chú");
});

test("nhanDienTrongKhung: nhân vật CÓ MẶT mặc định được chọn (chỉ khi có hồ sơ)", () => {
  const kq = F.nhanDienTrongKhung({
    moTa: "",
    ghiChu: "",
    ungVien: UV,
    hoSoMap: MAP,
    dsNhanVatCoMat: [{ id: "nv_zz2", ngoaiHinhId: "nho_zz2" }, { id: "nv_zz9", ngoaiHinhId: "" }],
    hoSoNguoiChoi: null,
  });
  ok(kq.tuDongIds.has("nho_zz2"), "người có mặt có hồ sơ được chọn");
  eq(kq.tuDongIds.size, 1, "người không có hồ sơ không được thêm");
});

test("nhanDienTrongKhung: hồ sơ của NGƯỜI CHƠI luôn được thêm", () => {
  const kq = F.nhanDienTrongKhung({ moTa: "", ghiChu: "", ungVien: UV, hoSoMap: MAP, dsNhanVatCoMat: [], hoSoNguoiChoi: { id: "nho_zz1" } });
  ok(kq.tuDongIds.has("nho_zz1"), "người chơi được thêm");
});

test("nhanDienTrongKhung: tên trùng nhiều hồ sơ thì KHÔNG tự chọn, chỉ báo", () => {
  const uv = [
    { nvId: "nv_zz1", hoSoId: "nho_zz1", ten: ["Minh"] },
    { nvId: "nv_zz2", hoSoId: "nho_zz2", ten: ["Minh"] },
  ];
  const kq = F.nhanDienTrongKhung({ moTa: "Minh tới", ghiChu: "", ungVien: uv, hoSoMap: MAP, dsNhanVatCoMat: [], hoSoNguoiChoi: null });
  eq(kq.tuDongIds.size, 0, "không tự đoán");
  eq(kq.trungTen.length, 1, "báo một tên trùng");
  eq(kq.trungTen[0].ten, "Minh", "đúng tên");
  eqSau(kq.trungTen[0].ids.slice().sort(), ["nho_zz1", "nho_zz2"], "đủ hai hồ sơ");
});

test("nhanDienTrongKhung: khối ngoại hình cũ trong ô mô tả bị CẮT trước khi nhận diện", () => {
  const moTa = "Zara đứng dưới mưa\n\n" + "[NGOẠI HÌNH CỐ ĐỊNH — TRUYỆN VAI — giữ đúng từng người, không trộn đặc điểm giữa các nhân vật]\n- Zeno: tóc ngắn";
  const kq = F.nhanDienTrongKhung({ moTa, ghiChu: "", ungVien: UV, hoSoMap: MAP, dsNhanVatCoMat: [], hoSoNguoiChoi: null });
  ok(kq.tuDongIds.has("nho_zz1"), "vẫn nhận ra Zara ở phần mô tả");
  ok(!kq.tuDongIds.has("nho_zz2"), "KHÔNG nhận ra Zeno từ khối đã cắt bỏ");
});

// =============================================================== khu chip
test("hoSoHienChip: ứng viên đã chạm tới, hồ sơ thêm tay, và tên trùng — không lặp", () => {
  const s = bo(["nho_zz1"], ["nho_zz2"], []);
  const ra = F.hoSoHienChip({ ungVien: UV, hoSoMap: MAP, trungTen: [{ ten: "Zara", ids: ["nho_zz1"] }], ...s });
  eqSau(ra, ["nho_zz1", "nho_zz2"], "ứng viên trước, thêm tay sau");
});

test("hoSoHienChip: hồ sơ bị bỏ chọn VẪN hiện (để bật lại được)", () => {
  const s = bo([], [], ["nho_zz1"]);
  eqSau(F.hoSoHienChip({ ungVien: UV, hoSoMap: MAP, trungTen: [], ...s }), ["nho_zz1"], "vẫn hiện");
});

test("hoSoConLai: chỉ những hồ sơ chưa xuất hiện ở chip nào", () => {
  const s = bo(["nho_zz1"], [], []);
  eqSau(F.hoSoConLai({ dsHoSo: HO_SO, ungVien: UV, ...s }).map((h) => h.id), ["nho_zz2"], "còn Zeno");
});

test("thaoTacChip: chip đang bật thì bỏ chọn; chip đang tắt thì chọn lại", () => {
  eqSau(F.thaoTacChip({ id: "nho_zz1", dangChon: true, laTuDong: true }), { id: "nho_zz1", boQua: true, boChon: false, themTay: false }, "bỏ chọn");
  eqSau(F.thaoTacChip({ id: "nho_zz1", dangChon: false, laTuDong: true }), { id: "nho_zz1", boQua: false, boChon: true, themTay: false }, "bật lại — không ghi thêm tay");
  eqSau(F.thaoTacChip({ id: "nho_zz2", dangChon: false, laTuDong: false }), { id: "nho_zz2", boQua: false, boChon: true, themTay: true }, "bật hồ sơ chưa nhận diện — ghi thêm tay");
});

// =============================================================== cổng 18+ cho ảnh
test("nvChuaXacNhanChoTaoAnh: truyện KHÔNG ở chế độ người lớn thì không chặn gì", () => {
  const story = { giaoKeo: { bat: false }, nhanVats: [] };
  const ds = [{ id: "nv_zz1", ten: "A", tuoi: "16", nguoiLon: false }];
  eqSau(F.nvChuaXacNhanChoTaoAnh(story, ds), [], "không chặn");
});

test("nvChuaXacNhanChoTaoAnh: chế độ người lớn ⇒ chỉ những người CHƯA xác nhận", () => {
  const story = { giaoKeo: { bat: true }, nhanVats: [] };
  const ds = [
    { id: "nv_zz1", ten: "A", tuoi: "24", nguoiLon: true },
    { id: "nv_zz2", ten: "B", tuoi: "16", nguoiLon: false },
  ];
  eqSau(F.nvChuaXacNhanChoTaoAnh(story, ds).map((c) => c.id), ["nv_zz2"], "đúng người bị chặn");
});

test("nvChuaXacNhanChoTaoAnh: thiếu dữ liệu cũng không ném", () => {
  eqSau(F.nvChuaXacNhanChoTaoAnh({ giaoKeo: { bat: true } }, null), [], "danh sách rỗng");
  eqSau(F.nvChuaXacNhanChoTaoAnh(null, null), [], "truyện rỗng");
});

test("loiChanTaoAnh: NGUYÊN VĂN hai câu thông báo (người dùng phải đọc được cách sửa)", () => {
  const loi = F.loiChanTaoAnh([{ ten: "B" }, { ten: "C" }]);
  eq(loi.ten, "B, C", "ghép tên bằng dấu phẩy");
  eq(
    loi.trangThai,
    "Chặn tạo ảnh: B, C chưa được xác nhận là người trưởng thành, mà truyện này đang ở chế độ người lớn. " +
      "Cách sửa: mở từng nhân vật, tích “Người trưởng thành (18+)”, hoặc sửa lại tuổi/mô tả cho đúng (nhân vật có dấu hiệu dưới 18 phải sửa mô tả/tuổi trước). Rồi thử lại.",
    "câu trạng thái"
  );
  eq(
    loi.toast,
    "Chặn tạo ảnh: B, C chưa xác nhận 18+ — mở nhân vật và tích “Người trưởng thành (18+)”, hoặc sửa lại tuổi/mô tả, rồi thử lại.",
    "câu toast"
  );
});

test("loiChanTaoAnh: danh sách rỗng vẫn ghép ra chuỗi (nơi gọi tự kiểm độ dài trước)", () => {
  const loi = F.loiChanTaoAnh(null);
  eq(loi.ten, "", "tên rỗng");
  ok(loi.trangThai.indexOf("Chặn tạo ảnh:  chưa") >= 0, "không ném, chỉ ra chuỗi lạ");
});

// =============================================================== nút ở chân màn
test("nutTaoAnh: chưa có ảnh ⇒ Viết lại + Dựng khung hình", () => {
  eqSau(
    F.nutTaoAnh({ busy: false, coAnh: false }),
    [
      { id: "viet-lai", nhan: "Viết lại", icon: "sparkle", cls: "", dis: false },
      { id: "dung", nhan: "Dựng khung hình", icon: "image", cls: "btn-primary", dis: false },
    ],
    "trạng thái rảnh"
  );
});

test("nutTaoAnh: có ảnh ⇒ Viết lại + Dựng lại + Đưa vào truyện", () => {
  eqSau(
    F.nutTaoAnh({ busy: false, coAnh: true }),
    [
      { id: "viet-lai", nhan: "Viết lại", icon: "sparkle", cls: "", dis: false },
      { id: "dung-lai", nhan: "Dựng lại", icon: "refresh", cls: "", dis: false },
      { id: "luu", nhan: "Đưa vào truyện", icon: "check", cls: "btn-primary", dis: false },
    ],
    "có ảnh"
  );
});

test("nutTaoAnh: đang bận thì khoá lại — nhưng Viết lại chỉ khoá khi CHƯA có ảnh", () => {
  eqSau(F.nutTaoAnh({ busy: true, coAnh: false }).map((n) => n.dis), [true, true], "bận, chưa có ảnh");
  eqSau(F.nutTaoAnh({ busy: true, coAnh: true }).map((n) => n.dis), [false, true, true], "bận, đã có ảnh");
});

// =============================================================== prompt gửi máy vẽ
// SNAPSHOT: chuỗi dưới đây là thứ máy vẽ thật sự nhận được cho đầu vào này.
const MO_TA = "Hai người đứng dưới mưa";
const MARK = "[FIXED CHARACTER APPEARANCE — TRUYỆN VAI — keep each person's features exactly as written, never blend traits between characters]";
const KHOI_1 = MARK + "\n- Zara (age 24): long black hair | avoid: glasses";
const KHOI_2 = KHOI_1 + "\n- Zeno (age 31): short hair";

test("promptGuiMayVe: SNAPSHOT — đúng từng byte cho một đầu vào cố định", () => {
  const pr = F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [ZARA], phongCach: "dien-anh", dsPhongCach: PHONG_CACH });
  eq(pr.nen, MO_TA + "\n\n" + KHOI_1, "bản NÉN (không hậu tố phong cách)");
  eq(pr.gui, MO_TA + "\n\n" + KHOI_1 + ", cinematic film still, 35mm lens", "bản GỬI máy vẽ");
});

test("promptGuiMayVe: nhiều hồ sơ ⇒ mỗi người một dòng, đúng thứ tự", () => {
  const pr = F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [ZARA, ZENO], phongCach: "khong", dsPhongCach: PHONG_CACH });
  eq(pr.nen, MO_TA + "\n\n" + KHOI_2, "hai dòng nhân vật");
  eq(pr.gui, pr.nen, "phong cách lạ ⇒ không thêm hậu tố");
});

test("promptGuiMayVe: chưa có mô tả và không có hồ sơ ⇒ rỗng (nơi gọi báo thiếu mô tả)", () => {
  const pr = F.promptGuiMayVe({ moTa: "   ", dsHoSo: [], phongCach: "dien-anh", dsPhongCach: PHONG_CACH });
  eq(pr.nen, "", "nén rỗng");
  eq(pr.gui, "", "gửi rỗng");
});

test("promptGuiMayVe: chỉ có hồ sơ (ô mô tả trống) vẫn ra khối ngoại hình", () => {
  const pr = F.promptGuiMayVe({ moTa: "", dsHoSo: [ZARA], phongCach: "", dsPhongCach: PHONG_CACH });
  eq(pr.nen, KHOI_1, "chỉ còn khối ngoại hình");
});

test("promptGuiMayVe: khối ngoại hình cũ trong ô mô tả bị cắt, không ghép hai lần", () => {
  const pr = F.promptGuiMayVe({ moTa: MO_TA + "\n\n" + KHOI_1, dsHoSo: [ZARA], phongCach: "", dsPhongCach: PHONG_CACH });
  eq(pr.nen, MO_TA + "\n\n" + KHOI_1, "vẫn đúng MỘT khối");
});

test("promptGuiMayVe: phong cách tra theo bảng; không có bảng thì không thêm gì", () => {
  eq(F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [], phongCach: "anime", dsPhongCach: PHONG_CACH }).gui, MO_TA + ", anime key visual", "hậu tố anime");
  eq(F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [], phongCach: "anime", dsPhongCach: null }).gui, MO_TA, "không có bảng ⇒ không hậu tố");
});

test("loaiTruGuiMayVe: gộp 'điều cần tránh' của hồ sơ vào prompt loại trừ", () => {
  eq(F.loaiTruGuiMayVe("low quality", [ZARA]), "low quality, glasses", "gộp đúng");
  eq(F.loaiTruGuiMayVe("", [ZARA, ZENO]), "glasses", "bỏ phần rỗng");
  eq(F.loaiTruGuiMayVe("low quality", []), "low quality", "không hồ sơ ⇒ giữ nguyên");
  eq(F.loaiTruGuiMayVe("", []), "", "rỗng");
});

// =============================================================== kết quả máy vẽ
test("kichThuocNen: 512 cho khung vuông, 768 cho các khung còn lại", () => {
  eq(F.kichThuocNen("512x512"), 512, "vuông nhỏ");
  eq(F.kichThuocNen("768x512"), 768, "ngang");
  eq(F.kichThuocNen("512x768"), 768, "dọc");
  eq(F.kichThuocNen(""), 768, "thiếu thông tin ⇒ 768 (như cũ)");
});

test("xuLyKetQuaMayVe: nén ở đúng cỡ và chất lượng 0.9", async () => {
  const nen = async (u, max, q) => u + "|" + max + "|" + q;
  eq(await F.xuLyKetQuaMayVe("anh", "512x512", nen), "anh|512|0.9", "vuông");
  eq(await F.xuLyKetQuaMayVe("anh", "768x512", nen), "anh|768|0.9", "ngang");
});

// =============================================================== bản ghi ảnh đem lưu
test("thongSoBanGhiAnh: đường 'Đưa vào truyện' dùng ĐÚNG prompt đã gửi máy vẽ", () => {
  const pr = F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [ZARA], phongCach: "dien-anh", dsPhongCach: PHONG_CACH });
  const ts = F.thongSoBanGhiAnh({
    url: "data:image/png;base64,AAAA",
    promptDaDung: pr.nen,
    moTa: MO_TA,
    dsHoSo: [ZARA],
    loaiTru: " low quality ",
    phongCach: "dien-anh",
    kichThuoc: "512x768",
    chuThich: "Hai người dưới mưa.",
    convId: "ht_zz1",
  });
  eqSau(ts, {
    dataUrl: "data:image/png;base64,AAAA",
    prompt: pr.nen,
    loaiTru: "low quality",
    phongCach: "dien-anh",
    kichThuoc: "512x768",
    chuThich: "Hai người dưới mưa.",
    convId: "ht_zz1",
    hoSoIds: ["nho_zz1"],
  }, "đủ trường, đúng thứ tự khoá");
  ok(ts.prompt.indexOf("FIXED CHARACTER APPEARANCE") >= 0, "prompt lưu là prompt ĐÃ ghép");
});

test("thongSoBanGhiAnh: NHÁNH DỰ PHÒNG phải trùng đường dựng (byte-for-byte)", () => {
  // Người dùng bấm "Đưa vào truyện" mà chưa từng bấm "Dựng": prompt được ghép lại từ ô mô tả.
  const pr = F.promptGuiMayVe({ moTa: MO_TA, dsHoSo: [ZARA], phongCach: "", dsPhongCach: [] });
  const ts = F.thongSoBanGhiAnh({ url: "data:image/png;base64,AAAA", promptDaDung: "", moTa: MO_TA, dsHoSo: [ZARA], loaiTru: "", phongCach: "", kichThuoc: "", chuThich: "", convId: "ht_zz1" });
  eq(ts.prompt, pr.nen, "hai đường ghép prompt phải cho ra cùng một chuỗi");
});

test("thongSoBanGhiAnh: ảnh không hợp lệ ⇒ dataUrl rỗng (không lưu rác)", () => {
  const ts = F.thongSoBanGhiAnh({ url: "không phải ảnh", promptDaDung: "x", moTa: "", dsHoSo: [], loaiTru: "", phongCach: "", kichThuoc: "", chuThich: "", convId: "ht_zz1" });
  eq(ts.dataUrl, "", "lọc qua laDataUrlAnh");
  eqSau(ts.hoSoIds, [], "không có hồ sơ");
});

test("thongSoBanGhiAnh: thiếu hết dữ liệu cũng không ném", () => {
  const ts = F.thongSoBanGhiAnh({});
  eqSau(ts, { dataUrl: "", prompt: "", loaiTru: "", phongCach: "", kichThuoc: "", chuThich: "", convId: undefined, hoSoIds: [] }, "giá trị rỗng an toàn");
});

// =============================================================== luật của tệp
test("taoAnhFlow.js KHÔNG import DOM (giữ được tầng Node thuần)", async () => {
  const boDoc = globalThis.__TV_BO_DOC;
  if (!boDoc) {
    ok(true, "(bỏ qua — môi trường không đọc được tệp)");
    return;
  }
  const text = await boDoc.doc("src/ui/taoAnh/taoAnhFlow.js");
  // Soát theo DẤU NHÁY ĐÓNG (đường dẫn import), không soát chữ trần: phần chú thích của
  // tệp có nhắc tới `dom.js` để giải thích vì sao KHÔNG được import nó.
  ok(text.indexOf('dom.js"') < 0, "không import dom.js");
  ok(text.indexOf("document.") < 0, "không đụng document");
  ok(text.indexOf("window.") < 0, "không đụng window");
  ok(text.indexOf("../..") >= 0, "chỉ import lõi bằng đường dẫn tương đối");
  ok(KHONG(["a"]).size === 1, "hàm KHONG dùng nội bộ vẫn hợp lệ");
});
