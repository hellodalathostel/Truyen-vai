// Truyện Vai — tầng kiểm thử Node: LOGIC THUẦN của màn "Cốt truyện mới" (Đợt 6b).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: `openNewStoryModal` từng là một hàm 416 dòng trộn DOM với quyết định,
// nên không kiểm được gì ở tầng Node. Sau khi tách, mọi quyết định nằm ở
// `src/ui/taoTruyen/taoTruyenFlow.js` — tệp này ghim chúng lại.
//
// Hai ca quan trọng nhất:
//   • PAYLOAD TẠO TRUYỆN — đối số đưa cho `createStory` được ghép ở đây (tên thể loại,
//     bối cảnh + luật thế giới, mặc định người chơi, chế độ dựng). Đổi ghép là đổi thứ
//     được ghi xuống đĩa, nên phải khớp TỪNG KÝ TỰ.
//   • TÊN TRUYỆN SUY TỪ BỐI CẢNH — cắt ở câu đầu tiên và trần 60 ký tự.
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const F = await import("../../src/ui/taoTruyen/taoTruyenFlow.js");

const NL = String.fromCharCode(10);
const HAI_NL = NL + NL;

const TL_BDSM = { id: "bdsm-mm", ten: "BDSM M/M", emoji: "⛓️", bdsm: true };
const TL_THUONG = { id: "tien-hiep", ten: "Tiên hiệp", emoji: "✦" };

// =============================================================== chế độ dựng
test("cheDoMacDinh: chưa chọn gì thì lấy cách dựng đầu tiên, không có thì chuong", () => {
  eq(F.cheDoMacDinh([{ id: "hoiThoai" }, { id: "chuong" }]), "hoiThoai", "lấy mục đầu tiên");
  eq(F.cheDoMacDinh([{ id: "chuong" }]), "chuong", "một mục");
  eq(F.cheDoMacDinh([]), "chuong", "danh sách rỗng ⇒ chuong");
  eq(F.cheDoMacDinh(null), "chuong", "null ⇒ chuong");
  eq(F.cheDoMacDinh(undefined), "chuong", "undefined ⇒ chuong");
});

// =============================================================== nhãn thể loại
test("theLoaiHienThi / emojiTheLoai: nhãn lưu xuống truyện và nhãn trên nút", () => {
  eq(F.theLoaiHienThi(TL_BDSM), "⛓️ BDSM M/M", "nhãn = emoji + khoảng trắng + tên");
  eq(F.theLoaiHienThi(null), "", "không có thể loại ⇒ nhãn rỗng");
  eq(F.theLoaiHienThi(undefined), "", "undefined ⇒ nhãn rỗng");
  eq(F.emojiTheLoai(TL_THUONG), "✦", "emoji của thể loại");
  eq(F.emojiTheLoai(TL_BDSM), "⛓️", "emoji của thể loại BDSM");
  eq(F.emojiTheLoai(null), "✦", "không có thể loại ⇒ emoji mặc định");
  eq(F.emojiTheLoai(undefined), "✦", "undefined ⇒ emoji mặc định");
});

test("tenNguoiChoi: bỏ trống thì người chơi là Bạn", () => {
  eq(F.tenNguoiChoi("Nam"), "Nam", "có tên thì giữ");
  eq(F.tenNguoiChoi(""), "Bạn", "chuỗi rỗng ⇒ Bạn");
  eq(F.tenNguoiChoi(null), "Bạn", "null ⇒ Bạn");
  eq(F.tenNguoiChoi(undefined), "Bạn", "undefined ⇒ Bạn");
});

// =============================================================== bối cảnh + luật
test("ghepBoiCanhVaLuat: luật thế giới được nối vào bối cảnh, có thì mới nối", () => {
  eq(F.ghepBoiCanhVaLuat({ boiCanh: "B", luat: "L" }), "B" + HAI_NL + "Luật thế giới:" + NL + "L", "nối đúng khuôn");
  eq(F.ghepBoiCanhVaLuat({ boiCanh: "B", luat: "" }), "B", "không có luật ⇒ giữ nguyên bối cảnh");
  eq(F.ghepBoiCanhVaLuat({ boiCanh: "B" }), "B", "thiếu luật ⇒ giữ nguyên");
  eq(F.ghepBoiCanhVaLuat({}), "", "thiếu hết ⇒ rỗng");
  eq(F.ghepBoiCanhVaLuat({ boiCanh: null, luat: "L" }), HAI_NL + "Luật thế giới:" + NL + "L", "bối cảnh rỗng vẫn nối luật");
});

test("datTenTuBoiCanh: lấy câu đầu tiên, cắt còn 60 ký tự", () => {
  eq(F.datTenTuBoiCanh("Câu một. Câu hai."), "Câu một", "dừng ở dấu chấm");
  eq(F.datTenTuBoiCanh("Câu một! Câu hai"), "Câu một", "dừng ở dấu chấm than");
  eq(F.datTenTuBoiCanh("Câu một? Câu hai"), "Câu một", "dừng ở dấu hỏi");
  eq(F.datTenTuBoiCanh("A" + NL + "B"), "A", "dừng ở xuống dòng");
  eq(F.datTenTuBoiCanh("  Tên có khoảng trắng  . sau"), "Tên có khoảng trắng", "cắt khoảng trắng hai đầu");
  eq(F.datTenTuBoiCanh(""), "", "rỗng ⇒ rỗng (KHÔNG tự bịa tên)");
  eq(F.datTenTuBoiCanh("   "), "", "toàn khoảng trắng ⇒ rỗng");
  eq(F.datTenTuBoiCanh(null), "", "null ⇒ rỗng");
  eq(F.datTenTuBoiCanh(undefined), "", "undefined ⇒ rỗng");
  const dai = F.datTenTuBoiCanh("x".repeat(100));
  eq(dai.length, 60, "trần 60 ký tự");
  eq(F.datTenTuBoiCanh("x".repeat(60)).length, 60, "đúng 60 thì giữ nguyên");
  eq(F.datTenTuBoiCanh("x".repeat(59)).length, 59, "dưới trần thì giữ nguyên");
});

// =============================================================== bản nháp
test("locNhanVatCoTen: bỏ nhân vật không tên (thẻ rỗng của AI)", () => {
  eqSau(F.locNhanVatCoTen([{ ten: "A" }, { ten: "" }, { ten: "B" }, {}]).map((c) => c.ten), ["A", "B"], "chỉ giữ người có tên");
  eqSau(F.locNhanVatCoTen([]), [], "danh sách rỗng");
  eqSau(F.locNhanVatCoTen(null), [], "null vẫn an toàn");
  eqSau(F.locNhanVatCoTen(undefined), [], "undefined vẫn an toàn");
  eqSau(F.locNhanVatCoTen([{ ten: "A" }, { ten: null }]).map((c) => c.ten), ["A"], "tên null bị bỏ");
});

test("stubTruyen: truyện giả cho AI chỉ có đủ trường cho prompt", () => {
  eqSau(
    F.stubTruyen({ ten: "T", boiCanh: "B", tl: TL_THUONG, giaoKeo: null }),
    { ten: "T", boiCanh: "B", theLoaiTen: "Tiên hiệp", nhanVats: [], bienNienSu: [], giaoKeo: null },
    "đủ trường, hai mảng cố ý rỗng"
  );
  eqSau(
    F.stubTruyen({ ten: "", boiCanh: "", tl: null, giaoKeo: undefined }),
    { ten: "Cốt truyện mới", boiCanh: "", theLoaiTen: "", nhanVats: [], bienNienSu: [], giaoKeo: undefined },
    "thiếu tên/bối cảnh/thể loại vẫn dựng được"
  );
  eq(F.stubTruyen({}).ten, "Cốt truyện mới", "tên mặc định");
});

// =============================================================== payload tạo truyện
test("payloadWizard: đối số cho createStory của đường Thiết lập nâng cao", () => {
  const ra = F.payloadWizard({
    ten: "T",
    moTa: "M",
    theLoaiId: "tien-hiep",
    tl: TL_THUONG,
    boiCanh: "B",
    mode: "hoiThoai",
    nguoiChoiTen: "",
    nguoiChoiMoTa: "D",
    nhanVats: [{ ten: "An" }],
    giaoKeo: { bat: false },
  });
  eqSau(
    ra,
    {
      ten: "T",
      moTa: "M",
      theLoaiId: "tien-hiep",
      theLoaiTen: "✦ Tiên hiệp",
      boiCanh: "B",
      mode: "hoiThoai",
      nguoiChoiTen: "Bạn",
      nguoiChoiMoTa: "D",
      emoji: "✦",
      nhanVats: [{ ten: "An" }],
      giaoKeo: { bat: false },
      mucTieuChuong1: "",
    },
    "khớp từng trường"
  );
  eq(ra.mucTieuChuong1, "", "wizard không có ô mục tiêu chương 1");
  eq(F.payloadWizard({ ten: "T", theLoaiId: "x", tl: null, mode: "chuong", nguoiChoiTen: "Bạn" }).nguoiChoiTen, "Bạn", "người chơi để trống ⇒ Bạn");
});

test("payloadTaoNhanh: đối số cho createStory của đường Tạo nhanh", () => {
  const q = { ten: "T", moTa: "M", boiCanh: "B", luat: "L", nguoiChoiTen: "", nguoiChoiMoTa: "D", mucTieu: "MT" };
  const ra = F.payloadTaoNhanh({ q, tl: TL_BDSM, giaoKeo: { bat: true }, nhanVats: [{ ten: "An" }] });
  eqSau(
    ra,
    {
      ten: "T",
      moTa: "M",
      theLoaiId: "bdsm-mm",
      theLoaiTen: "⛓️ BDSM M/M",
      boiCanh: "B" + HAI_NL + "Luật thế giới:" + NL + "L",
      mode: "chuong",
      nguoiChoiTen: "Bạn",
      nguoiChoiMoTa: "D",
      emoji: "⛓️",
      nhanVats: [{ ten: "An" }],
      giaoKeo: { bat: true },
      mucTieuChuong1: "MT",
    },
    "khớp từng trường"
  );
  eq(ra.mode, "chuong", "Tạo nhanh luôn dựng theo chương");
  const rong = F.payloadTaoNhanh({ q: { ten: "T" }, tl: null, giaoKeo: null, nhanVats: [] });
  eq(rong.theLoaiId, "", "không có thể loại ⇒ id rỗng");
  eq(rong.theLoaiTen, "", "không có thể loại ⇒ nhãn rỗng");
  eq(rong.emoji, "✦", "không có thể loại ⇒ emoji mặc định");
  eq(rong.nguoiChoiTen, "Bạn", "thiếu tên người chơi ⇒ Bạn");
  eq(rong.boiCanh, "", "thiếu bối cảnh ⇒ rỗng");
});
