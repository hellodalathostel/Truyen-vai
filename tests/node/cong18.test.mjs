// Truyện Vai — tầng kiểm thử Node: CỬA 18+ DÙNG CHUNG (Đợt 6b).
// Chạy: node --test tests/node/
//
// Vì sao có tệp này: ba màn đều có đường vào nội dung người lớn — nút "Bật giao kèo" và ô
// tích "Người trưởng thành (18+)" ở màn Sửa nhân vật, và wizard/Tạo nhanh ở màn Cốt truyện
// mới. Trước Đợt 6b mỗi màn tự viết lại câu chữ và tự quyết định ai được ghi cờ, nên tầng
// Node không kiểm được gì. Nay mọi QUYẾT ĐỊNH và mọi CÂU CHỮ nằm ở `src/ui/cong18.js`.
//
// Hai ca quan trọng nhất:
//   • CÂU CHỮ ĐƯỢC GHIM NGUYÊN VĂN — đổi một chữ trong lời hỏi/từ chối là đổi thứ người
//     dùng đọc khi quyết định nội dung người lớn, nên phải là thay đổi có ý thức.
//   • DANH SÁCH GHI CỜ — nhân vật ghi tuổi dưới 18 (số hoặc chữ) KHÔNG BAO GIỜ được lọt
//     vào danh sách ghi cờ, kể cả khi người dùng vừa xác nhận 18+.
//
// Không dùng dấu gạch chéo ngược ở tệp này (xem luật ở tests/README.md).

import { test, ok, eq, eqSau } from "../lib/h.js";
import "../lib/moi-truong.js";

const C = await import("../../src/ui/cong18.js");

// ---------------------------------------------------------------- dữ liệu mẫu (HƯ CẤU)
const A = { id: "nv_zz1", ten: "An", tuoi: "30" };
const TRE = { id: "nv_zz2", ten: "Be", tuoi: "16" };
const CO_ROI = { id: "nv_zz3", ten: "Cu", tuoi: "25", nguoiLon: true };
const KHONG_RO = { id: "nv_zz4", ten: "Du" };
const TUOI_CHU = { id: "nv_zz5", ten: "Em", moTa: "mot cau be 12 tuổi" };

// =============================================================== câu chữ được ghim
test("câu chữ của cửa 18+ giữ nguyên từng ký tự", () => {
  eq(C.LY_DO_BAT_GIAO_KEO, "Bạn đang bật giao kèo BDSM cho truyện này.", "lý do khi bật giao kèo");
  eq(C.LY_DO_NHANH_DUNG_BAN_NHAP, "Bản nháp bạn sắp dựng có giao kèo BDSM.", "lý do khi dựng bản nháp");
  eq(C.LY_DO_NHANH_TAO_TRUYEN, "Truyện bạn sắp tạo sẽ bật giao kèo BDSM.", "lý do khi tạo truyện");
  eq(
    C.LOI_TU_CHOI_DANH_SACH,
    "Chưa xác nhận 18+ cho đúng danh sách nhân vật nên truyện được tạo KHÔNG kèm lớp giao kèo.",
    "lời từ chối theo danh sách"
  );
  eq(C.LOI_TU_CHOI_BAT_GIAO_KEO, "Chưa xác nhận 18+ nên giao kèo chưa được bật.", "lời từ chối khi bật giao kèo");
  eq(
    C.GHI_CHU_NHANH_KHONG_BDSM,
    "Chưa xác nhận 18+ nên bản nháp được dựng KHÔNG kèm lớp BDSM.",
    "ghi chú khi bản nháp bị bỏ lớp BDSM"
  );
  eq(
    C.LOI_NHANH_THE_LOAI_BDSM,
    "Chưa xác nhận 18+ nên không tạo được truyện với thể loại BDSM này — hãy chọn thể loại khác hoặc xác nhận.",
    "lời từ chối khi thể loại là BDSM"
  );
  eq(
    C.LOI_NHANH_CHUA_XAC_NHAN,
    "Chưa xác nhận 18+ nên chưa tạo truyện. Bỏ tích giao kèo, hoặc xác nhận, rồi bấm “Tạo cốt truyện” lại.",
    "lời từ chối chung của Tạo nhanh"
  );
});

// =============================================================== ai đang đòi nội dung người lớn
test("coBdsm: thể loại BDSM tự nó đã đòi, kể cả khi ô tích chưa được tích", () => {
  eq(C.coBdsm({ theLoai: { bdsm: true }, tich: false }), true, "thể loại bdsm ⇒ đòi");
  eq(C.coBdsm({ theLoai: { bdsm: true }, tich: true }), true, "cả hai ⇒ đòi");
  eq(C.coBdsm({ theLoai: { bdsm: false }, tich: true }), true, "chỉ ô tích ⇒ đòi");
  eq(C.coBdsm({ theLoai: { bdsm: false }, tich: false }), false, "không gì cả ⇒ không đòi");
  eq(C.coBdsm({ theLoai: {}, tich: false }), false, "thể loại rỗng ⇒ không đòi");
  eq(C.coBdsm({}), false, "thiếu hết ⇒ không đòi");
  eq(C.coBdsm({ theLoai: null, tich: 0 }), false, "0 không phải là tích");
  eq(C.coBdsm({ theLoai: null, tich: "x" }), true, "giá trị thật ⇒ đòi");
});

// =============================================================== danh sách sẽ được ghi cờ
test("danhSachGhiCo: bỏ qua nhân vật đã có cờ và nhân vật có dấu hiệu vị thành niên", () => {
  const ds = [A, TRE, CO_ROI, KHONG_RO, TUOI_CHU];
  eqSau(C.danhSachGhiCo(ds).map((c) => c.id), ["nv_zz1", "nv_zz4"], "chỉ người lớn chưa có cờ");
  eqSau(C.danhSachGhiCo([]), [], "danh sách rỗng");
  eqSau(C.danhSachGhiCo(null), [], "null vẫn an toàn");
  eqSau(C.danhSachGhiCo(undefined), [], "undefined vẫn an toàn");
});

test("danhSachBiChan: kèm lý do cho TỪNG nhân vật bị chặn", () => {
  const chan = C.danhSachBiChan([A, TRE, CO_ROI, KHONG_RO, TUOI_CHU]);
  eq(chan.length, 2, "đúng hai nhân vật bị chặn");
  eq(chan[0].id, "nv_zz2", "chặn theo tuổi số");
  eq(chan[0].ten, "Be", "kèm tên để hộp xác nhận liệt kê được");
  ok(chan[0].lyDo.indexOf("dưới 18") >= 0, "lý do nói rõ dưới 18");
  eq(chan[1].id, "nv_zz5", "chặn theo tuổi viết bằng chữ");
  ok(chan[1].lyDo.length > 0, "vẫn có lý do");
  eqSau(C.danhSachBiChan([]), [], "danh sách rỗng");
  eqSau(C.danhSachBiChan(null), [], "null vẫn an toàn");
});

// =============================================================== mã danh sách + hỏi lại
test("maDanhSach: dấu vân tay của ĐÚNG danh sách sẽ được ghi cờ", () => {
  eq(C.maDanhSach([{ ten: "An" }, { ten: "Binh" }]), "An|Binh", "ghép bằng dấu gạch đứng");
  eq(C.maDanhSach([{ ten: "An" }]), "An", "một người");
  eq(C.maDanhSach([]), "", "danh sách rỗng cho mã rỗng");
  eq(C.maDanhSach(null), "", "null cho mã rỗng");
});

test("canHoiLaiDanhSach: chưa đồng ý thì luôn hỏi; đổi danh sách thì hỏi lại", () => {
  const ds = [{ ten: "An" }, { ten: "Binh" }];
  eq(C.canHoiLaiDanhSach({ dongY18: false, maDaXacNhan: "An|Binh", nhanVats: ds }), true, "chưa đồng ý ⇒ phải hỏi");
  eq(C.canHoiLaiDanhSach({ dongY18: true, maDaXacNhan: "An|Binh", nhanVats: ds }), false, "đúng danh sách ⇒ không hỏi");
  eq(C.canHoiLaiDanhSach({ dongY18: true, maDaXacNhan: "An", nhanVats: ds }), true, "danh sách đổi ⇒ hỏi lại");
  eq(C.canHoiLaiDanhSach({ dongY18: true, maDaXacNhan: "", nhanVats: [] }), false, "cùng rỗng ⇒ không hỏi");
  // Chưa từng ghi mã nào (`undefined`) KHÁC với "đã xác nhận danh sách rỗng" (`""`) — và
  // phía AN TOÀN là hỏi lại, nên undefined phải cho ra true.
  eq(C.canHoiLaiDanhSach({ dongY18: true, maDaXacNhan: undefined, nhanVats: undefined }), true, "chưa có mã ⇒ hỏi lại (phía an toàn)");
  eq(C.canHoiLaiDanhSach({ dongY18: true, maDaXacNhan: "", nhanVats: undefined }), false, "đã xác nhận danh sách rỗng ⇒ không hỏi");
  eq(C.canHoiLaiDanhSach({ dongY18: false, maDaXacNhan: "", nhanVats: [] }), true, "chưa đồng ý thì vẫn hỏi dù rỗng");
});

// =============================================================== phần vá giao kèo
test("patchGiaoKeoTaoNhanh: chỉ vá khi bật, và chỉ lấy trường thể loại có thật", () => {
  eqSau(
    C.patchGiaoKeoTaoNhanh({ bat: true, theLoai: { khongKhi: "im lặng", kieuQuanHe: "doi-dau" } }),
    { bat: true, nguoiLon: true, khongKhi: "im lặng", kieuQuanHe: "doi-dau" },
    "bật ⇒ kèm cờ người lớn + gợi ý thể loại"
  );
  eqSau(C.patchGiaoKeoTaoNhanh({ bat: true, theLoai: null }), { bat: true, nguoiLon: true, khongKhi: "", kieuQuanHe: "" }, "thiếu thể loại ⇒ chuỗi rỗng");
  eqSau(C.patchGiaoKeoTaoNhanh({ bat: false, theLoai: { khongKhi: "x" } }), {}, "không bật ⇒ không vá gì");
  eqSau(C.patchGiaoKeoTaoNhanh({}), {}, "thiếu hết ⇒ không vá gì");
});

test("patchGiaoKeoBanNhap: bản nháp CHƯA biết nhân vật nên không đặt kieuQuanHe", () => {
  eqSau(
    C.patchGiaoKeoBanNhap({ bat: true, theLoai: { khongKhi: "im lặng", kieuQuanHe: "doi-dau" } }),
    { bat: true, nguoiLon: true, khongKhi: "im lặng" },
    "không có trường kieuQuanHe"
  );
  eqSau(C.patchGiaoKeoBanNhap({ bat: true, theLoai: null }), { bat: true, nguoiLon: true, khongKhi: "" }, "thiếu thể loại ⇒ chuỗi rỗng");
  eq(C.patchGiaoKeoBanNhap({ bat: false, theLoai: { khongKhi: "x" } }), null, "không bật ⇒ null (không gửi lớp giao kèo)");
  eq(C.patchGiaoKeoBanNhap({}), null, "thiếu hết ⇒ null");
});

test("loiTuChoiTaoNhanh: thể loại BDSM thì nói rõ chọn thể loại khác", () => {
  eq(C.loiTuChoiTaoNhanh({ bdsm: true }), C.LOI_NHANH_THE_LOAI_BDSM, "thể loại BDSM ⇒ lời riêng");
  eq(C.loiTuChoiTaoNhanh({ bdsm: false }), C.LOI_NHANH_CHUA_XAC_NHAN, "thể loại thường ⇒ lời chung");
  eq(C.loiTuChoiTaoNhanh(null), C.LOI_NHANH_CHUA_XAC_NHAN, "không có thể loại ⇒ lời chung");
  eq(C.loiTuChoiTaoNhanh(undefined), C.LOI_NHANH_CHUA_XAC_NHAN, "undefined ⇒ lời chung");
});
