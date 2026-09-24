// Truyện Vai — tầng kiểm thử Node: GIAI ĐOẠN 4 (src/store.js).
//
// Ba cụm hàm THUẦN của Giai đoạn 4 — không đụng DOM, không đọc kv — nên kiểm được ở đây:
//   • mốc sao lưu + quyết định nhắc: `mocSaoLuu`, `danhDauSaoLuu`, `danhDauDaDoi`, `nenNhacSaoLuu`
//   • vòng đệm nhật ký parse: `catTho`, `dungLuongTho`, `themVaoVong`
//   • tự kiểm tra bất biến: `kiemTraBatBien`
//
// Vì sao đáng kiểm: cả ba đều là LƯỚI AN TOÀN dữ liệu người dùng, và cả ba đều hỏng theo kiểu
// IM LẶNG. `nenNhacSaoLuu` sai thì hoặc app nhắc phiền mỗi lần mở, hoặc người dùng không bao
// giờ được nhắc; `themVaoVong` sai thì nhật ký phình vô hạn, hoặc xoá nhầm mục mới nhất;
// `kiemTraBatBien` bỏ sót một nhóm lỗi thì màn "Tự kiểm tra" báo lành trong khi dữ liệu đã
// mồ côi. Giao diện của ba thứ này được kiểm ở tầng trình duyệt (gd4-*.js), còn LUẬT thì ở đây.
//
// Luật tệp: không dùng biểu thức chính quy (xem tests/README.md), không ghi kv.

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau } from "../lib/h.js";
import {
  catTho, dungLuongTho, themVaoVong, TOI_DA_MUC_NHAT_KY, TOI_DA_BYTE_NHAT_KY, DO_DAI_THO_MOI_MUC,
  NGAY_MS, mocSaoLuu, danhDauSaoLuu, danhDauDaDoi, nenNhacSaoLuu,
  kiemTraBatBien, store, loadSettings, PHIEN_BAN_TRUYEN,
} from "../../src/store.js";
import { thamChieuMo } from "../../src/ngoaiHinh.js";

const G = NGAY_MS;
const NOW = 1758000000000;
const CAT = "…[cắt]";

// Khung mốc sao lưu rỗng (mọi mốc = 0 = "chưa từng xảy ra"), để mỗi ca chỉ nêu đúng mốc
// mình quan tâm.
function mocSaoLuuGia(o) {
  return Object.assign({ batDauLuc: 0, xuatLuc: 0, daDoiLuc: 0, hoanLuc: 0, nhacLuc: 0 }, o || {});
}

// ---------------------------------------------------------------- vòng đệm nhật ký parse

test("catTho: cắt phần thô quá dài, giữ nguyên phần ngắn", () => {
  eq(catTho("ngắn"), "ngắn", "chuỗi ngắn không bị đụng");
  eq(catTho(""), "", "chuỗi rỗng");
  eq(catTho(null), "", "null thành chuỗi rỗng");
  eq(catTho(undefined), "", "undefined thành chuỗi rỗng");
  eq(catTho(123), "123", "số thành chuỗi");
  const dai = "x".repeat(DO_DAI_THO_MOI_MUC + 50);
  const cat = catTho(dai);
  eq(cat.length, DO_DAI_THO_MOI_MUC + CAT.length, "cắt đúng ở trần mặc định + dấu báo cắt");
  eq(cat.slice(0, DO_DAI_THO_MOI_MUC), "x".repeat(DO_DAI_THO_MOI_MUC), "phần giữ lại là phần ĐẦU");
  eq(cat.slice(DO_DAI_THO_MOI_MUC), CAT, "dấu báo cắt nằm ở cuối");
  eq(catTho(dai, 10).length, 10 + CAT.length, "trần truyền vào được tôn trọng");
  eq(catTho("abcdef", 10), "abcdef", "ngắn hơn trần truyền vào ⇒ nguyên vẹn");
  eq(catTho(dai, 10.7), dai.slice(0, 10) + CAT, "trần lẻ được làm tròn XUỐNG (không cắt quá trần)");
  // Trần ≤ 0 / thiếu / không phải số đều nghĩa là "dùng trần mặc định" — MỘT luật duy nhất,
  // không có trường hợp nào cắt sạch ngoài ý muốn.
  eq(catTho("abcdef", 0), "abcdef", "trần 0 = dùng mặc định, không cắt");
  eq(catTho(dai, 0).length, DO_DAI_THO_MOI_MUC + CAT.length, "trần 0 ⇒ dài đúng mặc định");
  eq(catTho(dai, -5), dai.slice(0, DO_DAI_THO_MOI_MUC) + CAT, "trần âm cũng về mặc định (không cắt sạch)");
  eq(catTho(dai, "khong-phai-so").length, DO_DAI_THO_MOI_MUC + CAT.length, "trần không phải số ⇒ mặc định");
});

test("dungLuongTho: chỉ cộng phần thô dạng chuỗi", () => {
  eq(dungLuongTho([{ tho: "abc" }, { tho: "de" }]), 5, "cộng độ dài phần thô");
  eq(dungLuongTho([]), 0, "mảng rỗng");
  eq(dungLuongTho(null), 0, "null");
  eq(dungLuongTho(undefined), 0, "undefined");
  eq(dungLuongTho("khong-phai-mang"), 0, "không phải mảng");
  eq(dungLuongTho([{}, { tho: 123 }, { tho: "x" }, null]), 1, "bỏ qua mục thiếu/không phải chuỗi");
});

test("themVaoVong: mới nhất lên đầu, cắt theo số mục VÀ theo dung lượng", () => {
  const goc = [];
  const v1 = themVaoVong(goc, { id: "a" }, 3, 1000);
  eqSau(v1.map((x) => x.id), ["a"], "mục đầu tiên");
  eq(goc.length, 0, "không sửa mảng gốc");
  const v2 = themVaoVong(v1, { id: "b" }, 3, 1000);
  eqSau(v2.map((x) => x.id), ["b", "a"], "mục mới lên ĐẦU");
  const v3 = themVaoVong(v2, { id: "c" }, 3, 1000);
  const v4 = themVaoVong(v3, { id: "d" }, 3, 1000);
  eqSau(v4.map((x) => x.id), ["d", "c", "b"], "quá số mục thì bỏ mục CŨ nhất");
  eq(themVaoVong([{ id: "a" }], { id: "b" }, 1, 1000).length, 1, "trần số mục được tôn trọng");
  eq(themVaoVong([{ id: "a" }], { id: "b" }, 1, 1000)[0].id, "b", "mục còn lại là mục mới");

  let v = [];
  for (let i = 0; i < 30; i++) v = themVaoVong(v, { id: "m" + i }, undefined, 1000000);
  eq(v.length, TOI_DA_MUC_NHAT_KY, "mặc định giữ đúng 20 mục");
  eq(v.length, 20, "và 20 là con số đã hứa với người dùng");
  eq(v[0].id, "m29", "mục đầu là mới nhất");
  eq(v[v.length - 1].id, "m10", "mục cuối là cũ nhất còn lại");

  v = [];
  for (let i = 0; i < 5; i++) v = themVaoVong(v, { id: "k" + i, tho: "0123456789" }, 20, 25);
  eq(v.length, 2, "trần dung lượng cắt còn 2 mục (20 byte ≤ 25)");
  eq(v[0].id, "k4", "mục MỚI NHẤT không bao giờ bị cắt vì dung lượng");
  ok(dungLuongTho(v) <= 25, "tổng thô không vượt trần");
  eq(v.length > 1, true, "không cắt quá tay tới mức chỉ còn một mục");

  const mucLon = { id: "lon", tho: "x".repeat(100) };
  const to = themVaoVong([], mucLon, 20, 24);
  eq(to.length, 1, "một mục quá khổ thì vẫn được giữ");
  eq(to[0].id, "lon", "giữ phần metadata (để biết đã có lượt nào)");
  eq(to[0].tho, "", "bỏ phần thô để không vượt trần");
  eq(mucLon.tho.length, 100, "không sửa mục truyền vào");
  eq(TOI_DA_BYTE_NHAT_KY, 12 * 1024, "trần thô mặc định là 12 KB");
  // Hai trần phải ĂN KHỚP: nếu 20 mục × trần mỗi mục mà vẫn nhỏ hơn trần tổng thì trần
  // tổng không bao giờ chạm tới — tức là nhật ký chỉ còn bị chặn bởi số mục.
  ok(
    TOI_DA_MUC_NHAT_KY * DO_DAI_THO_MOI_MUC > TOI_DA_BYTE_NHAT_KY,
    "trần dung lượng THẬT SỰ có tác dụng (số mục × trần mỗi mục > trần tổng)"
  );
  let day = [];  for (let i = 0; i < TOI_DA_MUC_NHAT_KY; i++) day = themVaoVong(day, { id: "b" + i, tho: "y".repeat(DO_DAI_THO_MOI_MUC) }, TOI_DA_MUC_NHAT_KY, TOI_DA_BYTE_NHAT_KY);
  const soGiu = Math.floor(TOI_DA_BYTE_NHAT_KY / DO_DAI_THO_MOI_MUC);
  eq(day.length, soGiu, "đầy nhật ký bằng mục dài nhất ⇒ còn đúng " + soGiu + " mục (trần dung lượng thắng trần số mục)");
  ok(dungLuongTho(day) <= TOI_DA_BYTE_NHAT_KY, "tổng thô nằm trong trần");
  ok(dungLuongTho(day) + DO_DAI_THO_MOI_MUC > TOI_DA_BYTE_NHAT_KY, "và không cắt quá tay (thêm một mục nữa là vượt)");
});

// ---------------------------------------------------------------- nhắc sao lưu

test("nenNhacSaoLuu: chỉ nhắc khi dữ liệu ĐÃ ĐỔI sau lần xuất gần nhất và đã quá N ngày", () => {
  const N = 7;
  eq(nenNhacSaoLuu(mocSaoLuuGia({}), NOW, N).ly, "chua-co-moc", "chưa có mốc nào ⇒ im");
  eq(nenNhacSaoLuu(null, NOW, N).ly, "chua-co-moc", "khung mốc thiếu hẳn ⇒ im (không vỡ)");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ batDauLuc: NOW - 30 * G }), NOW, N).ly, "chua-tung-doi", "có mốc nhưng chưa từng đổi ⇒ im");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 2 * G }), NOW, N).ly, "chua-tung-doi", "vừa xuất, chưa từng đổi ⇒ im");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 20 * G, daDoiLuc: NOW - 30 * G }), NOW, N).ly, "da-xuat-sau-khi-doi", "đã xuất SAU khi đổi ⇒ im");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 20 * G, daDoiLuc: NOW - 20 * G }), NOW, N).ly, "da-xuat-sau-khi-doi", "mốc xuất và mốc đổi bằng nhau ⇒ coi như đã xuất (không nhắc)");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 30 * G, daDoiLuc: NOW - 20 * G }), NOW, N).nhac, true, "đổi SAU lần xuất ⇒ có việc để nhắc");

  const chuaDu = nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 3 * G, daDoiLuc: NOW - 2 * G }), NOW, N);
  eq(chuaDu.nhac, false, "mới đổi 2 ngày ⇒ chưa nhắc");
  eq(chuaDu.ly, "chua-du-ngay", "lý do là chưa đủ ngày");
  eq(chuaDu.ngayTuMoc, 3, "số ngày tính từ lần xuất gần nhất");
  eq(chuaDu.soNgay, 7, "ngưỡng đang dùng được trả về để giao diện giải thích");

  const denHan = nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 7 * G, daDoiLuc: NOW - 1 * G }), NOW, N);
  eq(denHan.nhac, true, "đúng 7 ngày là đến hạn");
  eq(denHan.ly, "da-doi-sau-lan-xuat", "lý do nói rõ đã đổi sau lần xuất");
  eq(denHan.ngayTuMoc, 7, "số ngày từ lần xuất");
  eq(denHan.coLanXuat, true, "có lần xuất trước đó");
  eq(denHan.soNgay, 7, "ngưỡng");

  const chuaXuat = nenNhacSaoLuu(mocSaoLuuGia({ batDauLuc: NOW - 8 * G, daDoiLuc: NOW - 2 * G }), NOW, N);
  eq(chuaXuat.nhac, true, "CHƯA TỪNG xuất + đã quá N ngày kể từ lần đầu dùng ⇒ nhắc");
  eq(chuaXuat.ly, "chua-tung-xuat", "lý do là chưa từng xuất");
  eq(chuaXuat.coLanXuat, false, "biết là chưa từng xuất (để giao diện đổi lời)");
  eq(chuaXuat.ngayTuMoc, 8, "mốc là lần đầu dùng");
});

test("nenNhacSaoLuu: 'để sau' hoãn đúng một ngày; mỗi ngày nhắc tối đa một lần", () => {
  const N = 7;
  const hoan = nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 8 * G, daDoiLuc: NOW - 2 * G, hoanLuc: NOW - 1000 }), NOW, N);
  eq(hoan.nhac, false, "vừa bấm 'để sau' ⇒ im");
  eq(hoan.ly, "dang-hoan", "lý do là đang hoãn");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 8 * G, daDoiLuc: NOW - 2 * G, hoanLuc: NOW - G + 1 }), NOW, N).nhac, false, "chưa đủ một ngày hoãn");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 8 * G, daDoiLuc: NOW - 2 * G, hoanLuc: NOW - G }), NOW, N).nhac, true, "hết đúng một ngày hoãn ⇒ nhắc lại");

  const vuaNhac = nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 9 * G, daDoiLuc: NOW - 2 * G, nhacLuc: NOW - 1000 }), NOW, N);
  eq(vuaNhac.nhac, false, "vừa nhắc xong ⇒ không nhắc lại trong cùng ngày");
  eq(vuaNhac.ly, "vua-nhac", "lý do là vừa nhắc");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 9 * G, daDoiLuc: NOW - 2 * G, nhacLuc: NOW - G }), NOW, N).nhac, true, "sang ngày mới ⇒ nhắc lại được");
  // Hoãn và nhắc độc lập: hoãn đã hết nhưng vẫn còn trong ngày đã nhắc ⇒ vẫn im.
  const caHai = nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 9 * G, daDoiLuc: NOW - 2 * G, hoanLuc: NOW - 2 * G, nhacLuc: NOW - 1000 }), NOW, N);
  eq(caHai.nhac, false, "đã nhắc trong ngày thì im dù hoãn đã hết");
  eq(caHai.ly, "vua-nhac", "ưu tiên lý do 'vừa nhắc'");
});

test("nenNhacSaoLuu: ngưỡng N lấy từ CauHinh, giá trị hỏng thì về mặc định 7", () => {
  const daDoi = NOW - 1 * G;
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 2 * G, daDoiLuc: daDoi }), NOW, 1).nhac, true, "N=1 ⇒ 2 ngày là đến hạn");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 29 * G, daDoiLuc: daDoi }), NOW, 30).nhac, false, "N=30 ⇒ 29 ngày chưa đến hạn");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 30 * G, daDoiLuc: daDoi }), NOW, 30).nhac, true, "N=30 và đúng 30 ngày ⇒ đến hạn");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 7 * G, daDoiLuc: daDoi }), NOW, undefined).nhac, true, "thiếu N ⇒ mặc định 7");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 6 * G, daDoiLuc: daDoi }), NOW, undefined).nhac, false, "6 ngày < 7 mặc định");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 7 * G, daDoiLuc: daDoi }), NOW, 0).nhac, true, "N=0 ⇒ về mặc định 7 (không phải 0 ngày)");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 7 * G, daDoiLuc: daDoi }), NOW, "7").nhac, true, "N viết dạng chuỗi vẫn đọc được");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 2 * G, daDoiLuc: daDoi }), NOW, -5).nhac, true, "N âm bị kẹp về 1 (không bao giờ thành ngưỡng 0 hoặc âm)");
  eq(nenNhacSaoLuu(mocSaoLuuGia({ xuatLuc: NOW - 7 * G, daDoiLuc: daDoi }), NOW, 7.6).nhac, false, "N lẻ được làm tròn (7.6 ⇒ 8 ngày)");
});

test("mốc sao lưu: ghi xuống ngay lần đầu, và chỉ là mốc thời gian", () => {
  store.settings.saoLuu = null;
  localStorage.removeItem("truyenVai.caiDat");

  const m = mocSaoLuu(NOW);
  eq(m.batDauLuc, NOW, "lần đầu: mốc bắt đầu = now");
  eq(m.xuatLuc, 0, "chưa từng xuất");
  eq(m.daDoiLuc, 0, "chưa từng đổi");
  const luu = JSON.parse(localStorage.getItem("truyenVai.caiDat"));
  eq(luu.saoLuu.batDauLuc, NOW, "mốc bắt đầu được GHI XUỐNG ngay (không trôi theo mỗi lần mở app)");
  eq(mocSaoLuu(NOW + 5 * G).batDauLuc, NOW, "lần sau không ghi đè mốc bắt đầu");

  eq(danhDauSaoLuu("xuatLuc", NOW + G), NOW + G, "dấu xuất: hàm trả mốc vừa đặt");
  eq(store.settings.saoLuu.xuatLuc, NOW + G, "dấu xuất được đặt");
  danhDauSaoLuu("hoanLuc", NOW + 2 * G);
  eq(store.settings.saoLuu.hoanLuc, NOW + 2 * G, "dấu hoãn được đặt");
  danhDauDaDoi(NOW + 3 * G);
  eq(store.settings.saoLuu.daDoiLuc, NOW + 3 * G, "dấu 'đã đổi' được đặt");
  eq(loadSettings().saoLuu.xuatLuc, NOW + G, "đọc lại từ localStorage vẫn còn");

  store.settings.saoLuu = null;
  eq(danhDauSaoLuu("nhacLuc", NOW + 4 * G), NOW + 4 * G, "chưa có khung mốc thì hàm tự tạo");
  eq(store.settings.saoLuu.batDauLuc, NOW + 4 * G, "mốc bắt đầu được tạo cùng lúc");

  eqSau(
    Object.keys(store.settings.saoLuu).sort(),
    ["batDauLuc", "daDoiLuc", "hoanLuc", "nhacLuc", "xuatLuc"],
    "khung mốc chỉ có 5 mốc thời gian — KHÔNG chứa nội dung truyện"
  );

  store.settings.saoLuu = null;
  localStorage.removeItem("truyenVai.caiDat");
});

// ---------------------------------------------------------------- tự kiểm tra bất biến

const HS_A = { id: "nhz_1", tenChinh: "Hồ sơ A" };
const HS_B = { id: "nhz_2", tenChinh: "Hồ sơ B" };

function truyen(z) {
  return Object.assign(
    {
      id: "ct_z1",
      ten: "ZZ Kiểm thử",
      nhanVats: [{ id: "nv_a", ten: "Kai", ngoaiHinhId: "nhz_1" }],
      hoiThoais: [
        { id: "ht_1", tieuDe: "Hội thoại 1", nhanVatIds: ["nv_a"], hienDien: ["nv_a"], chuongId: "ch_1", canhRieng: null },
      ],
      chuongs: [{ id: "ch_1" }],
      anh: [{ id: "anh_z1", hoSoIds: ["nhz_2"] }],
      canhDaKhep: [],
    },
    z || {}
  );
}
const KHOA_TN = ["ht_1"];
const KHOA_ANH = ["anh_z1"];
const soi = (s, tn, anh) => kiemTraBatBien([s], [HS_A, HS_B], tn || KHOA_TN, anh || KHOA_ANH, thamChieuMo);

test("kiemTraBatBien: dữ liệu lành mạnh ⇒ không có nhóm lỗi nào", () => {
  const bc = soi(truyen());
  eq(bc.soLoi, 0, "không có lỗi nào");
  eqSau(Object.keys(bc.nhom), [], "không nhóm nào xuất hiện");
  eq(bc.soTruyen, 1, "đếm đúng số truyện đã quét");
  eq(bc.soHoSo, 2, "đếm đúng số hồ sơ ngoại hình");
  const bc2 = kiemTraBatBien([], [], [], [], thamChieuMo);
  eq(bc2.soLoi, 0, "dữ liệu rỗng ⇒ lành");
  eq(kiemTraBatBien(null, null, null, null, null).soLoi, 0, "đầu vào thiếu hẳn ⇒ không vỡ, không báo lỗi");
});

test("kiemTraBatBien: bắt được khoá mồ côi (tin nhắn, ảnh)", () => {
  const bcTn = soi(truyen(), ["ht_1", "tn_z1"]);
  eq(bcTn.soLoi, 1, "một khoá tin nhắn mồ côi");
  eq(bcTn.nhom["tin-nhan-mo-coi"].length, 1, "đúng nhóm tin nhắn mồ côi");
  eq(bcTn.nhom["tin-nhan-mo-coi"][0].id, "tn_z1", "nêu đúng khoá");
  ok(String(bcTn.nhom["tin-nhan-mo-coi"][0].moTa).indexOf("tn_z1") >= 0, "mô tả có khoá để người dùng tìm được");

  const bcAnh = soi(truyen(), KHOA_TN, ["anh_z1", "anh_z2"]);
  eq(bcAnh.soLoi, 1, "một ảnh mồ côi");
  eq(bcAnh.nhom["anh-mo-coi"][0].id, "anh_z2", "nêu đúng ảnh");
  eq(soi(truyen(), ["ht_1", "tn_z1"], ["anh_z1", "anh_z2"]).soLoi, 2, "cả hai nhóm cùng lúc");
});

test("kiemTraBatBien: bắt được tham chiếu mồ trong một truyện", () => {
  const a = truyen();
  a.nhanVats[0].ngoaiHinhId = "nhz_x";
  const bcHs = soi(a);
  eq(bcHs.nhom["ho-so-mo"].length, 1, "thiếu hồ sơ ngoại hình");
  eq(bcHs.nhom["ho-so-mo"][0].hoSoId, "nhz_x", "nêu đúng hồ sơ đang thiếu");
  eq(bcHs.nhom["ho-so-mo"][0].id, "nv_a", "nêu đúng mục đang trỏ vào đó");
  eq(bcHs.nhom["ho-so-mo"][0].truyen, "ct_z1", "nêu đúng truyện");

  const b = truyen();
  b.hoiThoais[0].nhanVatIds = ["nv_a", "nv_b"];
  eq(soi(b).nhom["hoi-thoai-tro-nv"].length, 1, "hội thoại trỏ tới nhân vật đã mất");
  const c = truyen();
  c.hoiThoais[0].hienDien = ["nv_a", "nv_b"];
  eq(soi(c).nhom["hien-dien-tro-nv"].length, 1, "người có mặt trỏ tới nhân vật đã mất");
  const d = truyen();
  d.hoiThoais[0].chuongId = "ch_9";
  eq(soi(d).nhom["hoi-thoai-tro-chuong"].length, 1, "hội thoại trỏ tới chương đã mất");
  const e = truyen();
  e.hoiThoais[0].canhRieng = "nv_b";
  eq(soi(e).nhom["canh-rieng-tro-nv"].length, 1, "cảnh riêng trỏ tới nhân vật đã mất");
  const f = truyen();
  f.canhDaKhep = [{ id: "canh_1", htIds: ["ht_9"] }];
  eq(soi(f).nhom["canh-tro-hoi-thoai"].length, 1, "cảnh đã khép trỏ tới hội thoại đã mất");
  // Cảnh khép trỏ tới hội thoại CÒN tồn tại thì không được báo.
  const g = truyen();
  g.canhDaKhep = [{ id: "canh_1", htIds: ["ht_1"] }];
  eq(soi(g).soLoi, 0, "cảnh khép lành ⇒ không báo");
  // `htId` (schema cũ) vẫn được soi như `htIds`.
  const h = truyen();
  h.canhDaKhep = [{ id: "canh_1", htId: "ht_9" }];
  eq(soi(h).nhom["canh-tro-hoi-thoai"].length, 1, "cảnh khép kiểu cũ (htId) vẫn được soi");
});

test("kiemTraBatBien: bắt được id trùng trong cùng một truyện", () => {
  const a = truyen();
  a.nhanVats.push({ id: "nv_a", ten: "Kai thứ hai" });
  const bcNv = soi(a);
  eq(bcNv.nhom["trung-id"].length, 1, "hai nhân vật cùng id");
  eq(bcNv.nhom["trung-id"][0].id, "nv_a", "nêu đúng id trùng");
  const b = truyen();
  b.hoiThoais.push({ id: "ht_1", tieuDe: "Bản sao", nhanVatIds: ["nv_a"], hienDien: ["nv_a"] });
  eq(soi(b).nhom["trung-id"].length, 1, "hai hội thoại cùng id");
  const c = truyen();
  c.chuongs.push({ id: "ch_1" });
  eq(soi(c).nhom["trung-id"].length, 1, "hai chương cùng id");
});

test("kiemTraBatBien: chỉ ĐỌC — không sửa dữ liệu truyền vào", () => {
  const a = truyen();
  a.nhanVats[0].ngoaiHinhId = "nhz_x";
  a.hoiThoais[0].nhanVatIds = ["nv_a", "nv_b"];
  a.hoiThoais[0].chuongId = "ch_9";
  a.canhDaKhep = [{ id: "canh_1", htIds: ["ht_9"] }];
  const truoc = JSON.stringify([a, HS_A, HS_B]);
  const bc = soi(a, ["ht_1", "tn_z1"], ["anh_z1", "anh_z2"]);
  ok(bc.soLoi >= 5, "báo đủ số nhóm lỗi để ca này có nghĩa (" + bc.soLoi + ")");
  eq(JSON.stringify([a, HS_A, HS_B]), truoc, "dữ liệu truyền vào KHÔNG đổi một ký tự");
  const dsTruoc = JSON.stringify(bc.nhom);
  soi(a, ["ht_1", "tn_z1"], ["anh_z1", "anh_z2"]);
  eq(JSON.stringify(bc.nhom), dsTruoc, "chạy lại cho kết quả y hệt (không tích luỹ trạng thái)");
});

test("siêu dữ liệu Giai đoạn 4 KHÔNG đổi hình dạng truyện ⇒ không tăng phiên bản vì nó", () => {
  // Mốc sao lưu nằm trong localStorage (cài đặt), nhật ký parse nằm ở kv folder riêng, và
  // `kiemTraBatBien` chỉ đọc. Không có trường mới nào trong bản ghi truyện, nên không được
  // tăng phiên bản vì những thứ đó: tăng phiên bản mà không có đường nâng cấp chỉ làm hại
  // bản lưu cũ.
  // Con số dưới đây là mốc CỦA TOÀN DỰ ÁN (không phải của riêng Giai đoạn 4): nó chỉ được
  // tăng khi có mục tương ứng trong `MIGRATION_TRUYEN` + đường chuẩn hoá trong `store.js` —
  // ràng buộc đó được ghim ở `tests/node/schema.test.mjs`.
  eq(PHIEN_BAN_TRUYEN, 8, "PHIEN_BAN_TRUYEN hiện là 8 (v8 = bản viết thành truyện)");
  ok(PHIEN_BAN_TRUYEN > 0, "là số dương");
});
