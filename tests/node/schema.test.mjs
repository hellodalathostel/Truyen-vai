// Truyện Vai — tầng kiểm thử Node: TẦNG SCHEMA + MIGRATION TẬP TRUNG (Giai đoạn 5).
//
// Vì sao cần tệp này: Giai đoạn 5 đụng vào ĐƯỜNG NẠP DỮ LIỆU — chỗ có rủi ro mất dữ liệu cao
// nhất của cả app. Ba câu hỏi phải trả lời được bằng máy, không bằng niềm tin:
//
//   1. CHẠY BÓNG: `migrate(raw)` (đường nạp mới) có ra ĐÚNG kết quả mà `chuanHoa*` (đường nạp
//      cũ) vẫn ra không? Tệp này so SÂU hai kết quả trên mọi hình dạng cũ. Tầng trình duyệt
//      (tests/browser/gd5-schema.js) làm lại phép so đó trên DỮ LIỆU THẬT, trong bộ nhớ.
//   2. IDEMPOTENT: nâng cấp hai lần phải giống hệt nâng cấp một lần — nếu không, mỗi lần mở
//      app dữ liệu lại dịch chuyển thêm một chút.
//   3. HÌNH DẠNG CŨ: mỗi phiên bản trong sổ đăng ký phải có một mẫu hư cấu đúng hình dạng
//      thật của nó (tests/fixtures/phien-ban-cu.mjs — KHÔNG lấy từ dữ liệu người dùng).
//
// Ngoài ra: kiểm hình dạng không được báo oan bản ghi tốt, bản ghi dị dạng chỉ được BÁO (không
// xoá, không ném lỗi, không chặn mở app), và hai nhật ký vận hành phải nằm gọn trong bộ nhớ.

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import * as S from "../../src/schema.js";
import {
  chuanHoaTruyen, chuanHoaTinNhan, PHIEN_BAN_TRUYEN,
  migrate, migrateTruyen, migrateTinNhan, migrateHoSo, migrateAnh, napBanGhi,
  docNhatKyMigrate, xoaNhatKyMigrate, tomTatMigrate,
} from "../../src/store.js";
import { chuanHoaHoSo, PHIEN_BAN_HO_SO } from "../../src/ngoaiHinh.js";
import { taoTruyen, taoHoSo } from "../fixtures/truyen.mjs";
import { TRUYEN_CU, HO_SO_CU, TIN_NHAN_CU, ANH_CU, banSao } from "../fixtures/phien-ban-cu.mjs";

// ---------------------------------------------------------------- đồng hồ & ngẫu nhiên CỐ ĐỊNH
// `chuanHoa*` bù mặc định bằng `uid()` (dựa vào Date.now + Math.random) và `Date.now()`. Muốn
// so SÂU hai lần chạy thì hai lần chạy phải thấy cùng một đồng hồ. Cách này KHÔNG che lỗi
// idempotent: nó chỉ bỏ đi phần ngẫu nhiên của mặc định, còn lại vẫn so từng trường.
const NOW_GOC = Date.now;
const RANDOM_GOC = Math.random;
function khoaDong() {
  Date.now = () => 1700000000000;
  Math.random = () => 0.5;
}
function moDong() {
  Date.now = NOW_GOC;
  Math.random = RANDOM_GOC;
}

// Bản ghi "đã đúng phiên bản hiện tại" để làm mốc so — dựng từ fixture hiện có, không dùng hàm
// sinh id của app cho id chính (id đã có sẵn trong fixture).
const TRUYEN_MOI = TRUYEN_CU[TRUYEN_CU.length - 1].raw;

test("sổ đăng ký migration: tăng dần, không lỗ, phủ tới phiên bản hiện tại", () => {
  const so = S.MIGRATION_TRUYEN;
  ok(Array.isArray(so) && so.length >= 8, "sổ đăng ký truyện có ít nhất 8 mục (" + so.length + ")");
  eq(so[0].phienBan, 1, "sổ bắt đầu từ phiên bản 1");
  for (let i = 1; i < so.length; i++) {
    ok(so[i].phienBan > so[i - 1].phienBan, "phiên bản tăng dần: " + so[i - 1].phienBan + " → " + so[i].phienBan);
  }
  eq(so[so.length - 1].phienBan, PHIEN_BAN_TRUYEN, "mục cuối bằng PHIEN_BAN_TRUYEN");
  for (let v = 1; v <= PHIEN_BAN_TRUYEN; v++) {
    ok(so.some((m) => m.phienBan === v), "có mục cho mọi phiên bản, không lỗ: v" + v);
  }
  for (const m of so) {
    ok(String(m.ten || "").length > 2, "v" + m.phienBan + " có tên bước");
    ok(String(m.moTa || "").length > 10, "v" + m.phienBan + " mô tả đã đổi cái gì");
  }
  const hs = S.MIGRATION_HO_SO;
  ok(Array.isArray(hs) && hs.length >= 1, "sổ hồ sơ có mục");
  eq(hs[hs.length - 1].phienBan, PHIEN_BAN_HO_SO, "sổ hồ sơ khớp PHIEN_BAN_HO_SO");
  ok(String(hs[hs.length - 1].moTa || "").length > 10, "mục hồ sơ có mô tả");
  // Bước riêng của phiên bản (`lam`) là hàm khi có — và hiện KHÔNG mục nào cần, vì mọi khác
  // biệt giữa các phiên bản đều là "thiếu trường ⇒ bù mặc định" ở `chuanHoa*`.
  for (const m of so) {
    if (m.lam !== undefined) ok(typeof m.lam === "function", "v" + m.phienBan + ": `lam` phải là hàm");
  }
});

test("soPhienBan + buocCanChay: bản không rõ phiên bản coi như 0", () => {
  eq(S.soPhienBan({ phienBan: 6 }), 6, "đọc được phiên bản");
  eq(S.soPhienBan({}), 0, "thiếu trường ⇒ 0");
  eq(S.soPhienBan(null), 0, "null ⇒ 0");
  eq(S.soPhienBan("x"), 0, "chuỗi ⇒ 0");
  eq(S.soPhienBan({ phienBan: "abc" }), 0, "chuỗi không phải số ⇒ 0");
  eq(S.soPhienBan({ phienBan: -3 }), 0, "số âm ⇒ 0");
  eq(S.soPhienBan({ phienBan: 6.9 }), 6, "lấy phần nguyên");
  eq(S.buocCanChay(S.MIGRATION_TRUYEN, 6).length, 2, "từ v6 còn đúng hai bước (v7, v8)");
  eq(S.buocCanChay(S.MIGRATION_TRUYEN, PHIEN_BAN_TRUYEN).length, 0, "đã mới nhất ⇒ không bước nào");
  eq(S.buocCanChay(S.MIGRATION_TRUYEN, 0).length, S.MIGRATION_TRUYEN.length, "không rõ phiên bản ⇒ đi hết");
  eqSau(S.buocCanChay(S.MIGRATION_TRUYEN, 3).map((b) => b.phienBan), [4, 5, 6, 7, 8], "đúng các bước còn thiếu");
});

test("mô tả hình dạng phủ ĐÚNG bản ghi đã chuẩn hoá (không thừa, không thiếu)", () => {
  // Không thiếu: mọi trường được mô tả phải tồn tại trong bản ghi đã chuẩn hoá ⇒ không có mô
  // tả "trên giấy" cho trường mà app không hề sinh ra.
  const s = chuanHoaTruyen(taoTruyen({}), {});
  for (const k of Object.keys(S.MO_TA_TRUYEN)) ok(s[k] !== undefined, "truyện: trường được mô tả phải có thật — " + k);
  // Không thừa: bản ghi chuẩn hoá không được mang trường lạ ngoài mô tả ⇒ hình dạng có một
  // nguồn duy nhất (thêm trường mà quên khai báo thì ca này đỏ).
  for (const k of Object.keys(s)) ok(S.MO_TA_TRUYEN[k] !== undefined, "truyện: trường chưa được khai báo trong mô tả — " + k);
  const h = chuanHoaHoSo(taoHoSo("nhz_zzshape", "Người mẫu"));
  for (const k of Object.keys(S.MO_TA_HO_SO)) ok(h[k] !== undefined, "hồ sơ: trường được mô tả phải có thật — " + k);
  for (const k of Object.keys(h)) ok(S.MO_TA_HO_SO[k] !== undefined, "hồ sơ: trường chưa được khai báo — " + k);
  // Trường bắt buộc của tin nhắn: kiểu và danh sách giá trị hợp lệ.
  eq(S.MO_TA_TIN_NHAN.id.batBuoc, true, "tin nhắn: id là bắt buộc");
  eq(S.MO_TA_TIN_NHAN.vai.batBuoc, true, "tin nhắn: vai là bắt buộc");
  eqSau(S.MO_TA_TIN_NHAN.vai.trong, ["nguoi", "ai", "anh", "he"], "tin nhắn: bốn vai hợp lệ");
  ok(S.MO_TA_TRUYEN.id.batBuoc === true && S.MO_TA_ANH.id.batBuoc === true && S.MO_TA_HO_SO.id.batBuoc === true, "mọi loại đều bắt buộc có id");
});

test("kiểm hình dạng: bắt bản ghi hỏng, KHÔNG báo oan bản ghi tốt", () => {
  const tot = chuanHoaTruyen(taoTruyen({}), {});
  eq(S.kiemTraTruyen(tot).ok, true, "truyện đã chuẩn hoá thì hợp lệ");
  eq(S.kiemTraTruyen(null).ok, false, "null không phải truyện");
  eq(S.kiemTraTruyen([]).ok, false, "mảng không phải truyện");
  eq(S.kiemTraTruyen("x").ok, false, "chuỗi không phải truyện");
  const thieuId = banSao(tot);
  delete thieuId.id;
  const k1 = S.kiemTraTruyen(thieuId);
  eq(k1.ok, false, "thiếu id là hỏng");
  eq(k1.soLoi, 1, "chỉ đúng một lỗi");
  eq(k1.loi[0].duong, "id", "chỉ đúng chỗ thiếu: " + JSON.stringify(k1.loi));
  const saiKieu = banSao(tot);
  saiKieu.nhanVats = "không phải mảng";
  const k2 = S.kiemTraTruyen(saiKieu);
  eq(k2.ok, false, "sai kiểu mảng là hỏng");
  ok(k2.loi[0].moTa.indexOf("mảng") >= 0, "mô tả lỗi nói rõ kiểu mong đợi: " + k2.loi[0].moTa);
  const nvHong = banSao(tot);
  nvHong.nhanVats = [{}];
  const k3 = S.kiemTraTruyen(nvHong);
  eq(k3.ok, false, "nhân vật thiếu id là hỏng");
  ok(k3.loi.some((x) => x.duong === "nhanVats[0].id"), "chỉ đúng nhân vật số 0: " + JSON.stringify(k3.loi));
  const htHong = banSao(tot);
  htHong.hoiThoais = [{ tieuDe: "thiếu id" }];
  ok(S.kiemTraTruyen(htHong).loi.some((x) => x.duong === "hoiThoais[0].id"), "chỉ đúng hội thoại số 0");
  // Trần số lỗi: một bản ghi rác không được làm ngập màn Tự kiểm tra.
  const rac = { nhanVats: [] };
  for (let i = 0; i < 40; i++) rac.nhanVats.push({});
  const k4 = S.kiemTraTruyen(rac);
  ok(k4.soLoi >= 40, "đếm đủ số lỗi: " + k4.soLoi);
  ok(k4.loi.length <= 20, "chỉ trả về 20 lỗi đầu: " + k4.loi.length);
  // Tin nhắn: `vai` phải nằm trong danh sách.
  eq(S.kiemTraTinNhan([{ id: "tn_zzshape", vai: "ai" }]).ok, true, "tin nhắn hợp lệ");
  const vaiLa = S.kiemTraTinNhan([{ id: "tn_zzshape", vai: "la" }]);
  eq(vaiLa.ok, false, "vai lạ là hỏng");
  eq(vaiLa.loi[0].duong, "[0].vai", "chỉ đúng vị trí: " + JSON.stringify(vaiLa.loi));
  eq(S.kiemTraTinNhan({ id: "tn_zzshape" }).ok, false, "tin nhắn của hội thoại phải là mảng");
  eq(S.kiemTraTinNhan([]).ok, true, "hội thoại chưa có tin nhắn thì hợp lệ");
  // Ảnh & hồ sơ.
  eq(S.kiemTraAnh(null).ok, false, "ảnh null là hỏng");
  eq(S.kiemTraAnh(ANH_CU.raw).ok, true, "ảnh cũ hợp lệ");
  eq(S.kiemTraAnh({ id: "anh_zzshape", hoSoIds: "x" }).ok, false, "hoSoIds phải là mảng");
  eq(S.kiemTraHoSo({}).ok, false, "hồ sơ thiếu id là hỏng");
  eq(S.kiemTraHoSo(HO_SO_CU[0].raw).ok, true, "hồ sơ cũ hợp lệ");
  // Loại bản ghi lạ: không có hàm kiểm ⇒ coi như chưa có gì để báo (không làm sập đường nạp).
  eq(S.kiemTheoLoai("loai-la", {}).ok, true, "loại lạ không báo lỗi hình dạng");
  // Bảng tra & kiểu hiển thị.
  eq(S.kieuThat(null), "null", "kieuThat(null)");
  eq(S.kieuThat([]), "mảng", "kieuThat([])");
  eq(S.kieuThat({}), "đối tượng", "kieuThat({})");
  eq(S.kieuThat("x"), "string", "kieuThat chuỗi");
  ok(S.laDoiTuong({}) && !S.laDoiTuong([]) && !S.laDoiTuong(null) && !S.laDoiTuong("x"), "laDoiTuong chỉ nhận đối tượng thường");
});

test("CHẠY BÓNG: migrate cho ĐÚNG kết quả của chuanHoa* trên mọi hình dạng cũ", () => {
  khoaDong();
  try {
    for (const f of TRUYEN_CU) {
      const nhan = "v" + f.phienBan + " (" + f.ten + ")";
      eqSau(migrateTruyen(banSao(f.raw)), chuanHoaTruyen(banSao(f.raw)), "truyện " + nhan + ": migrateTruyen = chuanHoaTruyen");
      eqSau(migrate(banSao(f.raw), "truyen"), chuanHoaTruyen(banSao(f.raw)), "truyện " + nhan + ": bộ điều phối = chuanHoaTruyen");
    }
    for (const h of HO_SO_CU) {
      const nhan = "hồ sơ v" + h.phienBan;
      eqSau(migrateHoSo(banSao(h.raw)), chuanHoaHoSo(banSao(h.raw)), nhan + ": migrateHoSo = chuanHoaHoSo");
      eqSau(migrate(banSao(h.raw), "ho-so"), chuanHoaHoSo(banSao(h.raw)), nhan + ": bộ điều phối = chuanHoaHoSo");
    }
    for (const t of TIN_NHAN_CU) {
      eqSau(migrateTinNhan([banSao(t.raw)]), chuanHoaTinNhan([banSao(t.raw)]), "tin nhắn: " + t.ten);
      eqSau(migrate([banSao(t.raw)], "tin-nhan"), chuanHoaTinNhan([banSao(t.raw)]), "tin nhắn qua bộ điều phối: " + t.ten);
    }
    // Tin nhắn của cả hội thoại cũng phải trùng khớp từng phần tử.
    const caHoiThoai = TIN_NHAN_CU.map((t) => banSao(t.raw));
    eqSau(migrateTinNhan(banSao(caHoiThoai)), chuanHoaTinNhan(banSao(caHoiThoai)), "cả mảng tin nhắn");
    // Ảnh chưa từng đổi hình dạng ⇒ đi qua bộ điều phối mà không đổi gì (kể cả tham chiếu).
    eq(migrateAnh(ANH_CU.raw), ANH_CU.raw, "migrateAnh giữ nguyên tham chiếu");
    eq(migrate(ANH_CU.raw, "anh"), ANH_CU.raw, "bộ điều phối giữ nguyên ảnh");
  } finally {
    moDong();
  }
});

test("IDEMPOTENT: nâng cấp hai lần giống hệt nâng cấp một lần", () => {
  khoaDong();
  try {
    for (const f of TRUYEN_CU) {
      const lan1 = migrateTruyen(banSao(f.raw));
      const lan2 = migrateTruyen(banSao(lan1));
      eqSau(lan2, lan1, "truyện v" + f.phienBan + ": migrate(migrate(x)) = migrate(x)");
      eqSau(migrateTruyen(banSao(banSao(lan2))), lan1, "truyện v" + f.phienBan + ": lần thứ ba vẫn vậy");
      eq(lan1.phienBan, PHIEN_BAN_TRUYEN, "truyện v" + f.phienBan + " sau nâng cấp mang phiên bản hiện tại");
      // Và nâng cấp không làm mất dữ liệu người dùng.
      eq(lan1.id, f.raw.id, "giữ id: " + f.phienBan);
      eq(lan1.ten, f.raw.ten, "giữ tên: " + f.phienBan);
      eq(lan1.nhanVats.length, f.raw.nhanVats.length, "giữ số nhân vật: " + f.phienBan);
      eq(lan1.hoiThoais.length, f.raw.hoiThoais.length, "giữ số hội thoại: " + f.phienBan);
      eq(lan1.nhanVats[0].ten, f.raw.nhanVats[0].ten, "giữ tên nhân vật: " + f.phienBan);
      eq(lan1.phienBan, lan2.phienBan, "phiên bản không nhảy thêm");
    }
    for (const h of HO_SO_CU) {
      const lan1 = migrateHoSo(banSao(h.raw));
      eqSau(migrateHoSo(banSao(lan1)), lan1, "hồ sơ v" + h.phienBan + ": idempotent");
      eqSau(lan1, chuanHoaHoSo(banSao(lan1)), "hồ sơ v" + h.phienBan + ": bản đã nâng đi qua lần nữa không đổi");
    }
    for (const t of TIN_NHAN_CU) {
      const lan1 = migrateTinNhan([banSao(t.raw)]);
      eqSau(migrateTinNhan(banSao(lan1)), lan1, "tin nhắn: " + t.ten + " idempotent");
    }
  } finally {
    moDong();
  }
});

test("mọi hình dạng cũ nâng lên được hình dạng HIỆN TẠI và qua được kiểm hình dạng", () => {
  khoaDong();
  try {
    for (const f of TRUYEN_CU) {
      const ra = migrateTruyen(banSao(f.raw));
      const kq = S.kiemTraTruyen(ra);
      eq(kq.ok, true, "truyện v" + f.phienBan + " sau nâng cấp hợp lệ — lỗi: " + JSON.stringify(kq.loi.slice(0, 3)));
    }
    for (const h of HO_SO_CU) {
      const ra = migrateHoSo(banSao(h.raw));
      const kq = S.kiemTraHoSo(ra);
      eq(kq.ok, true, "hồ sơ v" + h.phienBan + " sau nâng cấp hợp lệ — lỗi: " + JSON.stringify(kq.loi.slice(0, 3)));
      eq(ra.phienBan, PHIEN_BAN_HO_SO, "hồ sơ mang phiên bản hiện tại");
    }
    for (const t of TIN_NHAN_CU) {
      const kq = S.kiemTraTinNhan(migrateTinNhan([banSao(t.raw)]));
      eq(kq.ok, true, "tin nhắn sau nâng cấp hợp lệ: " + t.ten + " — " + JSON.stringify(kq.loi.slice(0, 3)));
    }
    // Tin nhắn cũ chỉ có `nvId` vẫn phải đọc được: giữ nguyên `nvId`, và KHÔNG tự sinh `nvIds`
    // cho tin một nhân vật (danh sách nhiều người chỉ ghi khi thật sự có từ hai người trở lên —
    // xem `chuanHoaTinNhan`).
    const cu = migrateTinNhan([banSao(TIN_NHAN_CU[1].raw)])[0];
    eq(cu.nvId, "nv_zzv1a", "tin cũ (nvId) giữ nguyên người nói");
    eq(cu.nvIds, undefined, "tin một nhân vật không sinh `nvIds`");
    const rieng = migrateTinNhan([banSao(TIN_NHAN_CU[4].raw)])[0];
    eq(rieng.rieng, "nv_zzv1a", "tin cảnh riêng giữ `rieng`");
    const nhieu = migrateTinNhan([banSao(TIN_NHAN_CU[2].raw)])[0];
    eqSau(nhieu.nvIds, ["nv_zzv1a", "nv_zzv1b"], "tin nhiều nhân vật giữ `nvIds`");
    const he = migrateTinNhan([banSao(TIN_NHAN_CU[3].raw)])[0];
    eq(he.khep, "canh_zzv4", "dòng `he` giữ dấu khép cảnh");
    // Hội thoại cũ: `hienDien` thiếu thì mặc định bằng danh sách tham gia (không phải mảng rỗng).
    const v1 = migrateTruyen(banSao(TRUYEN_CU[1].raw));
    eqSau(v1.hoiThoais[0].hienDien, ["nv_zzv1a"], "hội thoại v1 thiếu hienDien ⇒ mặc định danh sách tham gia");
    const v3 = migrateTruyen(banSao(TRUYEN_CU[3].raw));
    eqSau(v3.hoiThoais[0].hienDien, ["nv_zzv1a"], "hội thoại v3 giữ hienDien đã ghi");
    // Liên kết hồ sơ ngoại hình chỉ có từ v7: bản cũ phải ra "" (KHÔNG tự suy theo tên).
    eq(v1.nhanVats[0].ngoaiHinhId, "", "bản cũ: chưa liên kết hồ sơ");
    eq(v1.nhanVats[0].bietDanh, "", "bản cũ: chưa có biệt danh");
    eq(v1.nguoiChoi.ngoaiHinhId, "", "bản cũ: người chơi chưa liên kết hồ sơ");
    eqSau(v1.anh, [], "bản cũ: chưa có ảnh cảnh");
    eq(v1.nhip, "cham", "bản cũ: nhịp mặc định là chậm");
    eqSau(v1.canhDaKhep, [], "bản cũ: chưa có cảnh đã khép");
    eqSau(v1.truyenVietRa, [], "bản cũ: chưa có bản viết thành truyện");
    eq(v1.daoDien.bat, false, "bản cũ: chế độ Đạo diễn tắt");
    eq(v1.thoiGian.cheDo, "tamDung", "bản cũ: vắng mặt tạm dừng");
    eqSau(v1.ngoaiManHinh, [], "bản cũ: chưa có sự kiện ngoài màn hình");
  } finally {
    moDong();
  }
});

test("nạp bản ghi: đã đúng phiên bản thì giữ NGUYÊN đối tượng, còn cũ thì nâng + ghi nhật ký", () => {
  khoaDong();
  try {
    xoaNhatKyMigrate();
    const v7 = chuanHoaTruyen(taoTruyen({}), {});
    eq(napBanGhi(v7, "truyen"), v7, "bản ghi đã đúng phiên bản: trả ĐÚNG đối tượng (không sao chép)");
    eq(docNhatKyMigrate().tong, 0, "không ghi nhật ký khi không phải nâng cấp");
    eq(tomTatMigrate().indexOf("chưa nâng cấp") >= 0, true, "tóm tắt nói rõ chưa nâng cấp gì");
    const cu = banSao(TRUYEN_CU[1].raw);
    const ra = napBanGhi(cu, "truyen");
    ok(ra !== cu, "bản cũ: trả đối tượng MỚI");
    eq(ra.phienBan, PHIEN_BAN_TRUYEN, "bản cũ đã lên phiên bản hiện tại");
    const nk = docNhatKyMigrate();
    eq(nk.tong, 1, "có ghi nhật ký nâng cấp");
    eq(nk.ds[0].loai, "truyen", "nhật ký ghi đúng loại");
    eq(nk.ds[0].tu, 1, "nhật ký ghi đúng phiên bản đầu vào");
    eq(nk.ds[0].den, PHIEN_BAN_TRUYEN, "nhật ký ghi đúng phiên bản đích");
    eq(nk.ds[0].vuotPhienBan, false, "không phải dữ liệu từ tương lai");
    eq(tomTatMigrate().indexOf("v1→v8") >= 0, true, "tóm tắt: " + tomTatMigrate());
    // Bản ghi ĐÚNG phiên bản nhưng CHƯA ở dạng chuẩn (cảnh đã khép trỏ hội thoại không còn) vẫn
    // được giữ NGUYÊN: dọn nó là việc của màn Tự kiểm tra (BÁO), không phải của đường nạp.
    const lech = banSao(TRUYEN_MOI);
    lech.canhDaKhep = [{ id: "canh_zzlech", htId: "ht_zzkhongco", htIds: ["ht_zzkhongco"], tomTat: "x", luc: 1000 }];
    const raLech = napBanGhi(lech, "truyen", "ct_zzlech");
    eq(raLech, lech, "bản ghi đúng phiên bản: giữ nguyên đối tượng (không tự dọn tham chiếu mồ côi)");
    eqSau(raLech.canhDaKhep.map((x) => x.htId), ["ht_zzkhongco"], "tham chiếu mồ côi KHÔNG bị đường nạp xoá");
    // Dữ liệu từ TƯƠNG LAI: giữ nguyên (không hạ phiên bản, không cắt trường lạ) nhưng phải được
    // ĐÁNH DẤU để người dùng biết mà cập nhật app.
    xoaNhatKyMigrate();
    const tuongLai = banSao(TRUYEN_MOI);
    tuongLai.phienBan = PHIEN_BAN_TRUYEN + 5;
    const raTuongLai = napBanGhi(tuongLai, "truyen", "ct_zzv9");
    eq(raTuongLai, tuongLai, "dữ liệu từ tương lai: giữ nguyên đối tượng");
    eq(raTuongLai.phienBan, PHIEN_BAN_TRUYEN + 5, "KHÔNG hạ phiên bản của bản ghi");
    eq(docNhatKyMigrate().ds[0].vuotPhienBan, true, "đánh dấu bản ghi mang phiên bản mới hơn app");
    eq(docNhatKyMigrate().ds[0].tu, PHIEN_BAN_TRUYEN + 5, "nhật ký ghi đúng phiên bản đã đọc được");
    // Tin nhắn & hồ sơ cũng đi qua cùng một cửa vào.
    xoaNhatKyMigrate();
    ok(Array.isArray(napBanGhi([banSao(TIN_NHAN_CU[1].raw)], "tin-nhan", "ht_zzshape")), "tin nhắn nạp qua napBanGhi");
    eq(docNhatKyMigrate().tong, 0, "tin nhắn không mang phiên bản riêng ⇒ không ghi nhật ký nâng cấp");
    const hsCu = napBanGhi(banSao(HO_SO_CU[0].raw), "ho-so", "nhz_zzv0");
    eq(hsCu.phienBan, PHIEN_BAN_HO_SO, "hồ sơ cũ được nâng");
    eq(docNhatKyMigrate().ds[0].loai, "ho-so", "nhật ký ghi loại hồ sơ");
    // Loại bản ghi lạ: phải NÉM LỖI (đây là lỗi lập trình, không phải dữ liệu người dùng).
    bao(() => migrate({}, "loai-la"), "bộ điều phối ném lỗi khi loại bản ghi không rõ");
  } finally {
    moDong();
  }
});

test("nạp bản ghi dị dạng: chỉ BÁO, không ném lỗi, không xoá dữ liệu", () => {
  khoaDong();
  try {
    S.xoaLoiHinhDang();
    // (a) Bản ghi cũ + sai hình dạng ⇒ đi qua nâng cấp (vì còn ở phiên bản cũ) nhưng vẫn được giữ.
    const xauCu = { id: "ct_zzxau", ten: "ZZ bản ghi xấu", nhanVats: "không phải mảng", hoiThoais: [{ tieuDe: "thiếu id" }], phienBan: PHIEN_BAN_TRUYEN - 1 };
    let nem = false;
    let ra = null;
    try {
      ra = napBanGhi(xauCu, "truyen");
    } catch (e) {
      nem = true;
    }
    eq(nem, false, "không ném lỗi khi gặp bản ghi dị dạng");
    ok(ra && ra.id === "ct_zzxau", "vẫn trả về bản ghi (không xoá, không thay bằng bản rỗng)");
    eq(ra.ten, "ZZ bản ghi xấu", "giữ nguyên tên đã lưu");
    let kq = S.docLoiHinhDang();
    ok(kq.tong >= 2, "ghi nhận các lỗi hình dạng: " + kq.tong);
    eq(kq.ds[0].loai, "truyen", "ghi đúng loại bản ghi");
    eq(kq.ds[0].id, "ct_zzxau", "ghi đúng id để tìm được bản ghi");
    ok(String(kq.ds[0].ten).indexOf("ZZ") >= 0, "ghi tên để người dùng nhận ra");
    ok(kq.ds[0].loi.length >= 1 && String(kq.ds[0].loi[0].duong).length >= 1, "có đường dẫn tới chỗ hỏng: " + JSON.stringify(kq.ds[0].loi[0]));
    // (b) Bản ghi ĐÃ đúng phiên bản nhưng sai hình dạng ⇒ giữ NGUYÊN đối tượng (đường nạp không
    // tự sửa dữ liệu đang ở phiên bản hiện tại — việc dọn là của màn Tự kiểm tra), vẫn được báo.
    S.xoaLoiHinhDang();
    const xauMoi = { id: "ct_zzxaumoi", ten: "ZZ bản ghi xấu mới", nhanVats: "không phải mảng", hoiThoais: [], phienBan: PHIEN_BAN_TRUYEN };
    const raMoi = napBanGhi(xauMoi, "truyen");
    eq(raMoi, xauMoi, "bản ghi đúng phiên bản mà sai hình dạng: trả ĐÚNG đối tượng, không sửa");
    eq(raMoi.nhanVats, "không phải mảng", "không tự đổi kiểu dữ liệu đã lưu");
    ok(S.docLoiHinhDang().ds.some((x) => x.id === "ct_zzxaumoi"), "vẫn báo bản ghi sai hình dạng");
    // (c) Bản ghi không phải đối tượng cũng chỉ bị báo.
    napBanGhi("không phải đối tượng", "truyen", "ct_zzchuoi");
    ok(S.docLoiHinhDang().ds.some((x) => x.id === "ct_zzchuoi"), "báo cả bản ghi không phải đối tượng");
    // (d) Ảnh & hồ sơ dị dạng.
    S.xoaLoiHinhDang();
    napBanGhi({ id: "anh_zzxau", hoSoIds: "x" }, "anh", "anh_zzxau");
    eq(S.docLoiHinhDang().ds[0].loai, "anh", "báo lỗi hình dạng của ảnh");
    S.xoaLoiHinhDang();
    napBanGhi({ tenChinh: "thiếu id" }, "ho-so", "nhz_zzxau");
    eq(S.docLoiHinhDang().ds[0].loai, "ho-so", "báo lỗi hình dạng của hồ sơ");
    // Xoá được (màn Tự kiểm tra dùng để dọn sau khi đã xem).
    S.xoaLoiHinhDang();
    eq(S.docLoiHinhDang().tong, 0, "xoá sạch nhật ký lỗi hình dạng");
  } finally {
    moDong();
  }
});

test("nhật ký nâng cấp & lỗi hình dạng: chỉ trong BỘ NHỚ, có trần cả số mục lẫn dung lượng", () => {
  xoaNhatKyMigrate();
  eq(S.docNhatKyMigrate().tong, 0, "xoá được nhật ký nâng cấp");
  for (let i = 0; i < 30; i++) S.ghiMigrate("truyen", 6, 7, false);
  eq(S.docNhatKyMigrate().tong, 30, "đếm đủ tổng số lần nâng cấp");
  eq(S.docNhatKyMigrate().ds.length, 20, "chỉ giữ 20 mục gần nhất");
  eq(S.docNhatKyMigrate().ds[0].tu, 6, "mục mới nhất nằm đầu danh sách");
  xoaNhatKyMigrate();
  eq(S.docNhatKyMigrate().ds.length, 0, "xoá sạch nhật ký nâng cấp");
  S.xoaLoiHinhDang();
  const loiDai = new Array(5).fill(null).map(() => ({ duong: new Array(41).join("d"), moTa: new Array(61).join("m") }));
  for (let i = 0; i < 80; i++) {
    S.ghiLoiHinhDang("truyen", "ct_zz" + i, "ZZ rất dài " + new Array(41).join("x"), { loi: loiDai });
  }
  const k = S.docLoiHinhDang();
  ok(k.ds.length <= 60, "không giữ quá 60 mục: " + k.ds.length);
  ok(k.tong >= 80, "vẫn đếm đủ số lần gặp: " + k.tong);
  let dungLuong = 0;
  for (const m of k.ds) {
    dungLuong += String(m.id || "").length + String(m.ten || "").length;
    for (const l of m.loi || []) dungLuong += String(l.duong || "").length + String(l.moTa || "").length;
  }
  ok(dungLuong <= 4000, "dung lượng phần giữ lại ≤ 4000 ký tự: " + dungLuong);
  S.xoaLoiHinhDang();
  eq(S.docLoiHinhDang().ds.length, 0, "xoá sạch nhật ký lỗi hình dạng");
  // Cả hai nhật ký là thông tin VẬN HÀNH: không được ghi xuống kv (đọc mã nguồn, vì tầng Node
  // không có kv — nếu ai đó thêm một lời gọi kv vào đây thì ca này đỏ ngay trên CI).
  ok(String(S.ghiMigrate).indexOf(".set(") < 0, "ghiMigrate không ghi kv");
  ok(String(S.ghiLoiHinhDang).indexOf(".set(") < 0, "ghiLoiHinhDang không ghi kv");
  ok(String(S.ghiMigrate).indexOf("localStorage") < 0, "ghiMigrate không đụng localStorage");
  ok(String(S.ghiLoiHinhDang).indexOf("localStorage") < 0, "ghiLoiHinhDang không đụng localStorage");
});

test("fixture hình dạng cũ: đúng phiên bản, không lẫn trường của bản sau, id là hư cấu", () => {
  ok(TRUYEN_CU.length >= 9, "có fixture cho cả bản không rõ phiên bản lẫn v1..v8 (" + TRUYEN_CU.length + ")");
  for (let v = 0; v <= PHIEN_BAN_TRUYEN; v++) {
    ok(TRUYEN_CU.some((x) => x.phienBan === v), "có fixture cho phiên bản v" + v);
  }
  for (const f of TRUYEN_CU) {
    eq(S.soPhienBan(f.raw), f.phienBan, "fixture v" + f.phienBan + ": đọc ra đúng phiên bản");
    const chuoi = JSON.stringify(f.raw);
    for (const k of f.khongCo) {
      eq(chuoi.indexOf('"' + k + '"') < 0, true, "fixture v" + f.phienBan + " không được chứa trường của bản sau: " + k);
    }
    eq(chuoi.indexOf("zz") >= 0, true, "fixture v" + f.phienBan + " có dấu hiệu dữ liệu test (zz)");
    // Id thật do `uid()` sinh có thân 14–15 ký tự; id test ở đây phải NGẮN (xem khong-ro-ri.test.mjs).
    const idDai = chuoi.split('"').filter((s, i) => i % 2 === 1).filter((s) => s.indexOf("_") > 0 && s.split("_")[1].length >= 10);
    eqSau(idDai, [], "fixture v" + f.phienBan + ": không có id dài như dữ liệu thật");
  }
  for (const h of HO_SO_CU) {
    eq(S.soPhienBan(h.raw), h.phienBan, "fixture hồ sơ v" + h.phienBan + ": đọc ra đúng phiên bản");
    const chuoi = JSON.stringify(h.raw);
    for (const k of h.khongCo) eq(chuoi.indexOf('"' + k + '"') < 0, true, "hồ sơ v" + h.phienBan + " không được chứa: " + k);
  }
  // Hình dạng hiện tại dùng làm mốc so: phải có đúng các trường mới nhất.
  eq(TRUYEN_MOI.phienBan, PHIEN_BAN_TRUYEN, "fixture mốc mang phiên bản hiện tại");
  ok(TRUYEN_MOI.nguoiChoi.ngoaiHinhId.length > 0 && TRUYEN_MOI.nhanVats[0].bietDanh.length > 0, "fixture mốc có liên kết hồ sơ + biệt danh");
  ok(Array.isArray(TRUYEN_MOI.truyenVietRa) && TRUYEN_MOI.truyenVietRa.length > 0, "fixture mốc có bản viết thành truyện");
  eq(TRUYEN_MOI.truyenVietRa[0].trangThai, "xong", "fixture mốc: bản viết đã xong");
  ok(String(TRUYEN_MOI.truyenVietRa[0].noiDung).indexOf("Chương 1") >= 0, "fixture mốc: prose có heading chương tự chèn");
  // Hình dạng cũ: các mẫu nhỏ (tin nhắn, ảnh) cũng phải mang dấu hiệu test.
  for (const t of TIN_NHAN_CU) eq(JSON.stringify(t.raw).indexOf("zz") >= 0, true, "tin nhắn test có dấu hiệu zz: " + t.ten);
  eq(JSON.stringify(ANH_CU.raw).indexOf("zz") >= 0, true, "ảnh test có dấu hiệu zz");
});

test("mô tả hình dạng & bảng tra loại bản ghi", () => {
  const m = S.moTaHinhDang();
  for (const k of ["truyen", "tin-nhan", "anh", "ho-so", "nhan-vat", "chuong", "hoi-thoai"]) {
    ok(Array.isArray(m[k]) && m[k].length > 0, "có mô tả cho loại: " + k);
  }
  ok(m.truyen.indexOf("phienBan") >= 0, "mô tả truyện có trường phienBan");
  ok(m.truyen.indexOf("canhDaKhep") >= 0, "mô tả truyện có canhDaKhep");
  ok(m.truyen.indexOf("truyenVietRa") >= 0, "mô tả truyện có truyenVietRa");
  // Bản viết thành truyện: mục KHÔNG phải đối tượng bị BÁO (chỉ báo, không xoá dữ liệu).
  const rawXau = { id: "ct_zzvt", ten: "ZZ xấu", truyenVietRa: [null, { hoiThoaiId: "ht_z" }] };
  const kqVt = S.kiemTraTruyen(rawXau);
  eq(kqVt.ok, false, "mục truyenVietRa không phải đối tượng ⇒ báo lỗi hình dạng");
  ok(String(kqVt.loi[0].duong).indexOf("truyenVietRa") >= 0, "chỉ đúng đường dẫn: " + kqVt.loi[0].duong);
  // Và bản ghi thiếu trường (nhưng đúng đối tượng) KHÔNG bị coi là hỏng hình dạng — đó là việc
  // của chuẩn hoá.
  eq(S.kiemTraTruyen(chuanHoaTruyen({ id: "ct_zzvt2", truyenVietRa: [{ hoiThoaiId: "ht_z" }] })).ok, true, "bản ghi thiếu trường được chuẩn hoá rồi mới kiểm");
  ok(m["ho-so"].indexOf("moTaEn") >= 0, "mô tả hồ sơ có bản dịch EN");
  eq(S.nhanLoaiBanGhi("truyen"), "truyện", "nhãn tiếng Việt của truyện");
  eq(S.nhanLoaiBanGhi("tin-nhan"), "tin nhắn", "nhãn tiếng Việt của tin nhắn");
  eq(S.nhanLoaiBanGhi("ho-so"), "hồ sơ ngoại hình", "nhãn tiếng Việt của hồ sơ");
  eq(S.nhanLoaiBanGhi("loai-la"), "loai-la", "loại lạ trả nguyên chuỗi");
  ok(Object.keys(S.KIEM_THEO_LOAI).length >= 4, "bảng tra có đủ bốn loại bản ghi của đường nạp");
});
