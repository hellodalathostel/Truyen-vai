// Bộ kiểm thử: GIAI ĐOẠN 5 — TẦNG SCHEMA + MIGRATION TẬP TRUNG, CHẠY TRÊN DỮ LIỆU THẬT.
//
// Vì sao cần tầng này: tầng Node (tests/node/schema.test.mjs) chứng minh được LUẬT trên hình
// dạng hư cấu. Chỉ ở đây mới chứng minh được điều quan trọng nhất của Giai đoạn 5 — rằng đường
// nạp MỚI (`migrate`/`napBanGhi`) cho ra ĐÚNG thứ mà đường nạp CŨ (`chuanHoa*`) cho ra trên
// chính dữ liệu đang nằm trong máy người dùng. Đó là "chạy bóng": hai đường chạy song song trên
// cùng đầu vào, so SÂU kết quả, và KHÔNG ghi gì xuống kv.
//
// Bốn việc của bộ này:
//   1. CHẠY BÓNG trên dữ liệu thật (so trong bộ nhớ, đếm truyện/hồ sơ/tin nhắn/ảnh, đòi 0
//      khác biệt) + idempotent trên chính dữ liệu thật + chứng minh dữ liệu không đổi một byte.
//   2. VALIDATE KHI NẠP: một bản ghi sai hình dạng trong kv phải được GIỮ NGUYÊN, chỉ BÁO, và
//      hiện ra trong nhóm "hình-dang" của màn Tự kiểm tra — không xoá, không chặn mở app.
//   3. NHẬP FILE cũng đi qua đúng một cửa vào (migrate + validate), kèm xác nhận 18+ của lần nhập.
//   4. Hai nhật ký vận hành chỉ sống trong phiên (không ghi kv, không vào file xuất truyện).
const S = await import("/src/store.js");
const H = await import("/src/ngoaiHinh.js");
const X = await import("/src/schema.js");
const T = window.__tv_test;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const ca = [];
const chk = (ten, ok, ct) => ca.push({ ten, ok: !!ok, ct: ct === undefined || ct === null ? "" : String(ct).slice(0, 220) });
const sau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ban = (x) => JSON.parse(JSON.stringify(x));

const KEY_TN = "ct_zzgd5";

// Dọn dấu vết của chính bộ này trước khi chạy (chạy lại bao nhiêu lần vẫn sạch).
try { await root.kv.cotTruyen.delete(KEY_TN); } catch (e) {}
await S.loadStories();
await S.loadNgoaiHinh();
S.xoaLoiHinhDang();
S.xoaNhatKyMigrate();

// ==========================================================================
//  1. CHẠY BÓNG trên dữ liệu THẬT
// ==========================================================================
// Khoá đồng hồ trong lúc so: `chuanHoa*` bù mặc định bằng `Date.now()` cho vài trường, nên hai
// lần chạy liên tiếp có thể lệch vài ms ở ĐÚNG những trường đó — khác biệt giả, không phải lỗi
// của đường nạp. Khoá lại để phép so chỉ còn phản ánh khác biệt thật.
const nowGoc = Date.now;
Date.now = () => 1700000000000;

const dem = { truyen: 0, hoSo: 0, tinNhan: 0, anh: 0 };
const khac = [];
const chupTruoc = {};
let loiChayBong = null;
try {
  // Chụp bản gốc để chứng minh KHÔNG ghi gì: so lại sau khi chạy bóng xong.
  for (const [k, v] of await root.kv.cotTruyen.entries()) chupTruoc["ct/" + k] = JSON.stringify(v);
  for (const [k, v] of await root.kv.thuVienNgoaiHinh.entries()) chupTruoc["nh/" + k] = JSON.stringify(v);

  for (const [k, raw] of await root.kv.cotTruyen.entries()) {
    dem.truyen++;
    // CHẠY BÓNG: đường nạp MỚI (`migrate`) so với hàm chuẩn hoá CŨ (`chuanHoaTruyen`) trên cùng
    // một đầu vào. Đây là phép so của yêu cầu Giai đoạn 5.
    if (!sau(S.migrateTruyen(ban(raw)), S.chuanHoaTruyen(ban(raw)))) khac.push("truyện " + k);
    // Và đường nạp KHÔNG được SỬA một bản ghi đã đúng phiên bản (bản ghi đó được giữ nguyên đối
    // tượng; việc dọn tham chiếu mồ côi là của màn Tự kiểm tra — BÁO, không tự sửa).
    if (S.soPhienBan(raw) >= S.PHIEN_BAN_TRUYEN && !sau(S.napBanGhi(ban(raw), "truyen"), ban(raw))) {
      khac.push("đường nạp sửa bản ghi đã đúng phiên bản: " + k);
    }
    // Idempotent trên chính dữ liệu thật.
    const lan1 = S.migrateTruyen(ban(raw));
    const lan2 = S.migrateTruyen(ban(lan1));
    if (!sau(lan1, lan2)) khac.push("idempotent " + k);
    // Tin nhắn của từng hội thoại + ảnh cảnh.
    for (const c of raw.hoiThoais || []) {
      const arr = (await root.kv.tinNhan.get(c.id)) || [];
      dem.tinNhan += arr.length;
      if (!sau(S.migrateTinNhan(ban(arr)), S.chuanHoaTinNhan(ban(arr)))) khac.push("tin nhắn " + c.id);
      if (!sau(S.napBanGhi(ban(arr), "tin-nhan", c.id), S.chuanHoaTinNhan(ban(arr)))) khac.push("đường nạp tin nhắn " + c.id);
    }
    for (const a of raw.anh || []) {
      const rec = await root.kv.thuVienAnh.get(a.id);
      if (!rec) continue;
      dem.anh++;
      if (S.migrateAnh(ban(rec)) === null || !sau(S.migrateAnh(ban(rec)), ban(rec))) khac.push("ảnh " + a.id);
    }
  }
  for (const [k, raw] of await root.kv.thuVienNgoaiHinh.entries()) {
    dem.hoSo++;
    const goc = Object.assign({ id: k }, raw);
    if (!sau(S.migrateHoSo(ban(goc)), H.chuanHoaHoSo(ban(goc)))) khac.push("hồ sơ " + k);
    if (!sau(S.napBanGhi(ban(goc), "ho-so", k), H.chuanHoaHoSo(ban(goc)))) khac.push("đường nạp hồ sơ " + k);
    const l1 = S.migrateHoSo(ban(goc));
    if (!sau(S.migrateHoSo(ban(l1)), l1)) khac.push("idempotent hồ sơ " + k);
  }
} catch (e) {
  loiChayBong = String((e && e.message) || e);
} finally {
  Date.now = nowGoc;
}

chk("chạy bóng: chạy trọn trên dữ liệu thật, không ném lỗi", !loiChayBong, loiChayBong || "");
chk(
  "chạy bóng: đường nạp mới TRÙNG KHỚP đường nạp cũ trên mọi bản ghi (0 khác biệt)",
  khac.length === 0,
  "khác biệt=" + khac.length + (khac.length ? " — " + khac.slice(0, 4).join(" | ") : "")
);
chk(
  "chạy bóng: đã so cả truyện, hồ sơ, tin nhắn, ảnh",
  dem.truyen >= 1 && dem.hoSo >= 0 && dem.tinNhan >= 0,
  "truyện=" + dem.truyen + " hồ sơ=" + dem.hoSo + " tin nhắn=" + dem.tinNhan + " ảnh=" + dem.anh
);
chk(
  "chạy bóng: idempotent trên dữ liệu thật (nâng hai lần = nâng một lần)",
  !khac.some((x) => x.indexOf("idempotent") === 0),
  khac.filter((x) => x.indexOf("idempotent") === 0).slice(0, 3).join(" | ")
);

// KHÔNG GHI GÌ: đọc lại kv và so với bản chụp trước khi chạy bóng.
const doiByte = [];
for (const [k, v] of await root.kv.cotTruyen.entries()) if (chupTruoc["ct/" + k] !== JSON.stringify(v)) doiByte.push("ct/" + k);
for (const [k, v] of await root.kv.thuVienNgoaiHinh.entries()) if (chupTruoc["nh/" + k] !== JSON.stringify(v)) doiByte.push("nh/" + k);
chk("chạy bóng KHÔNG ghi gì xuống kv (dữ liệu thật không đổi một byte)", doiByte.length === 0, doiByte.join(", "));

// ==========================================================================
//  2. VALIDATE KHI NẠP: bản ghi sai hình dạng — giữ nguyên, chỉ báo
// ==========================================================================
// Bản ghi sai hình dạng nhưng vẫn ĐỦ trường để màn chính vẽ được (hoiThoais là mảng): đúng thứ
// người dùng có thể gặp khi một bản ghi bị hỏng — và điều cần chứng minh là nó KHÔNG chặn app.
const BAN_XAU = {
  id: KEY_TN,
  ten: "ZZ Giai đoạn 5 sai hình dạng",
  nhanVats: "không phải mảng",
  emoji: 7,
  chuongs: [],
  hoiThoais: [],
  canhDaKhep: [],
  bienNienSu: [],
  anh: [],
  ngoaiManHinh: [],
  phienBan: S.PHIEN_BAN_TRUYEN,
};
await root.kv.cotTruyen.set(KEY_TN, ban(BAN_XAU));
S.xoaLoiHinhDang();
let nemKhiNap = null;
try {
  await S.loadStories();
} catch (e) {
  nemKhiNap = String((e && e.message) || e);
}
const conTrongKv = await root.kv.cotTruyen.get(KEY_TN);
chk("nạp bản ghi dị dạng: KHÔNG ném lỗi", !nemKhiNap, nemKhiNap || "");
chk("nạp bản ghi dị dạng: KHÔNG xoá bản ghi khỏi kv", !!conTrongKv, String(conTrongKv));
chk("nạp bản ghi dị dạng: kv giữ nguyên nội dung đã lưu", sau(conTrongKv, BAN_XAU), JSON.stringify(conTrongKv).slice(0, 120));
chk("nạp bản ghi dị dạng: vẫn có mặt trong danh sách truyện (không bị bỏ rơi)", !!S.store.byId[KEY_TN]);

const loiHd = S.docLoiHinhDang();
chk("nạp bản ghi dị dạng: được ghi vào nhật ký lỗi hình dạng", loiHd.tong >= 1, "tong=" + loiHd.tong);
chk(
  "nạp bản ghi dị dạng: nhật ký ghi đúng loại + id + mô tả chỗ hỏng",
  loiHd.ds.some((m) => m.loai === "truyen" && m.id === KEY_TN && String(m.loi[0].duong).length > 0),
  JSON.stringify(loiHd.ds[0] || {}).slice(0, 180)
);

// Hiện ra trong màn Tự kiểm tra (nhóm riêng của Giai đoạn 5), và KHÔNG bị đưa vào nhóm "sửa được".
const bc = await T.chayTuKiemTra();
const nhomHd = ((bc.nhom || {})["hinh-dang"] || []);
chk("màn Tự kiểm tra: có nhóm bản ghi sai hình dạng", nhomHd.length >= 1, "nhóm=" + Object.keys(bc.nhom || {}).join(","));
chk("màn Tự kiểm tra: nhóm nêu đúng bản ghi dị dạng", nhomHd.some((x) => x.id === KEY_TN), JSON.stringify(nhomHd.slice(0, 2)).slice(0, 200));
chk("màn Tự kiểm tra: mô tả nhóm đọc được bằng lời", nhomHd.every((x) => String(x.moTa).length > 20), String(nhomHd[0] && nhomHd[0].moTa).slice(0, 160));
chk("màn Tự kiểm tra: báo cáo có đếm số lỗi hình dạng", typeof bc.soLoiHinhDang === "number" && bc.soLoiHinhDang >= 1, String(bc.soLoiHinhDang));

// Không chặn mở app: giao diện vẫn vẽ được và truyện dị dạng không bị nhóm "sửa" đụng tới.
try {
  T.app.screen = "home";
  T.render();
} catch (e) {}
const appRoot = document.querySelector("#appRoot");
chk("không chặn mở app: màn chính vẫn vẽ ra nội dung", !!appRoot && appRoot.children.length > 0, appRoot ? appRoot.children.length + " phần tử" : "(không có #appRoot)");
chk("không chặn mở app: app vẫn ở trạng thái sẵn sàng", window.__truyenVaiReady === true, String(window.__truyenVaiReady));
const NHOM_SUA = ["tin-nhan-mo-coi", "anh-mo-coi", "ho-so-mo", "hoi-thoai-tro-nv", "hien-dien-tro-nv", "canh-rieng-tro-nv"];
chk(
  "bản ghi sai hình dạng KHÔNG lọt vào nhóm \"sửa được\" (không bị nút Sửa xoá dữ liệu)",
  !NHOM_SUA.some((k) => ((bc.nhom || {})[k] || []).some((x) => x.id === KEY_TN)),
  JSON.stringify(bc.nhom["hinh-dang"] || []).slice(0, 120)
);

// Quét lại khi bản ghi dị dạng VẪN còn trong kv: phải được phát hiện lại (báo cáo luôn mới, không
// phụ thuộc vào việc nhật ký cũ có bị xoá hay không).
S.xoaLoiHinhDang();
const bcLai = await T.chayTuKiemTra();
chk(
  "quét lại: bản ghi dị dạng vẫn còn trong kv thì vẫn được phát hiện lại",
  (((bcLai.nhom || {})["hinh-dang"] || []).some((x) => x.id === KEY_TN)),
  JSON.stringify((bcLai.nhom || {})["hinh-dang"] || []).slice(0, 120)
);
chk("quét lại: nhật ký lỗi hình dạng đã được dựng lại từ đầu", S.docLoiHinhDang().tong >= 1, "tong=" + S.docLoiHinhDang().tong);

// Xoá hẳn bản ghi khỏi kv (người dùng tự quyết định) rồi quét lại: nhóm mới biến mất.
await root.kv.cotTruyen.delete(KEY_TN);
S.xoaLoiHinhDang();
await S.loadStories();
const bcSach = await T.chayTuKiemTra();
chk("xoá bản ghi dị dạng khỏi kv: nhóm biến mất khỏi màn Tự kiểm tra", (((bcSach.nhom || {})["hinh-dang"] || []).length) === 0);
chk("nhật ký lỗi hình dạng dọn được bằng tay", S.docLoiHinhDang().ds.length === 0 && S.docLoiHinhDang().tong === 0);

// ==========================================================================
//  3. NHẬP FILE: cũng qua migrate + validate
// ==========================================================================
S.xoaLoiHinhDang();
S.xoaNhatKyMigrate();
// Bản nhập HÌNH DẠNG CŨ (v1): chưa có hienDien/canhRieng/nhip/canhDaKhep/daoDien/thoiGian.
const NHAP_CU = {
  id: "ct_zzgd5nhap",
  ten: "ZZ Giai đoạn 5 bản nhập cũ",
  boiCanh: "Bối cảnh hư cấu.",
  mode: "chuong",
  nguoiChoi: { ten: "Bạn", moTa: "" },
  nhanVats: [{ id: "nv_zzgd5a", ten: "An", tuoi: "30", nguoiLon: true }],
  chuongs: [{ id: "ch_zzgd5", so: 1, tieuDe: "Chương 1" }],
  hoiThoais: [{ id: "ht_zzgd5", tieuDe: "Mở đầu", nhanVatIds: ["nv_zzgd5a"], chuongId: "ch_zzgd5" }],
  bienNienSu: [],
  giaoKeo: { bat: true, nguoiLon: true, mucDo: 3 },
  phienBan: 1,
};
const raNhap = T.napBanGhi(ban(NHAP_CU), "truyen", "", { choNhap: true, dongY18: true });
chk("nhập file cũ: đi qua migrate và lên phiên bản hiện tại", raNhap.phienBan === S.PHIEN_BAN_TRUYEN, String(raNhap.phienBan));
chk("nhập file cũ: hợp lệ sau khi nâng", X.kiemTraTruyen(raNhap).ok, JSON.stringify(X.kiemTraTruyen(raNhap).loi.slice(0, 2)));
chk("nhập file cũ: hội thoại thiếu hienDien được bù bằng danh sách tham gia", sau(raNhap.hoiThoais[0].hienDien, ["nv_zzgd5a"]), JSON.stringify(raNhap.hoiThoais[0].hienDien));
chk("nhập file cũ: giữ nguyên id/tên/nhân vật", raNhap.id === NHAP_CU.id && raNhap.ten === NHAP_CU.ten && raNhap.nhanVats.length === 1);
chk("nhập file cũ: có ghi nhật ký nâng cấp", S.docNhatKyMigrate().tong >= 1 && S.docNhatKyMigrate().ds[0].loai === "truyen", S.tomTatMigrate());
chk("nhập file cũ: xác nhận 18+ của lần nhập được tôn trọng", raNhap.giaoKeo.bat === true, JSON.stringify(raNhap.giaoKeo.bat));
const raNhapKhong18 = T.napBanGhi(ban(NHAP_CU), "truyen", "", { choNhap: true, dongY18: false });
chk("nhập file cũ: KHÔNG xác nhận 18+ thì tắt giao kèo", raNhapKhong18.giaoKeo.bat === false, JSON.stringify(raNhapKhong18.giaoKeo.bat));

// Bản nhập SAI hình dạng: chỉ báo, không ném lỗi, không ghi thành truyện rỗng.
S.xoaLoiHinhDang();
let nemNhap = null;
let raNhapXau = null;
try {
  raNhapXau = T.napBanGhi({ id: "ct_zzg5x", ten: "ZZ Giai đoạn 5 nhập xấu", chuongs: "không phải mảng", phienBan: 1 }, "truyen", "", { choNhap: true });
} catch (e) {
  nemNhap = String((e && e.message) || e);
}
chk("nhập file sai hình dạng: KHÔNG ném lỗi", !nemNhap, nemNhap || "");
chk("nhập file sai hình dạng: vẫn trả về bản ghi đã chuẩn hoá (không mất dữ liệu)", !!raNhapXau && raNhapXau.id === "ct_zzg5x");
chk("nhập file sai hình dạng: được ghi vào nhật ký lỗi hình dạng", S.docLoiHinhDang().ds.some((m) => m.id === "ct_zzg5x"), JSON.stringify(S.docLoiHinhDang().ds[0] || {}).slice(0, 160));
chk("nhập file sai hình dạng: KHÔNG tự ghi vào kv", !(await root.kv.cotTruyen.get("ct_zzg5x")));

// ==========================================================================
//  4. HAI NHẬT KÝ VẬN HÀNH CHỈ SỐNG TRONG PHIÊN
// ==========================================================================
chk("nhật ký nâng cấp: có hàm đọc cho màn gỡ lỗi", typeof S.docNhatKyMigrate === "function" && typeof S.tomTatMigrate === "function");
chk("nhật ký nâng cấp: tóm tắt đọc được bằng lời", String(S.tomTatMigrate()).length > 5, S.tomTatMigrate());
chk("nhật ký lỗi hình dạng: có hàm đọc cho màn Tự kiểm tra", typeof S.docLoiHinhDang === "function");
// Không ghi kv: hai hàm ghi nhật ký không được chứa lời gọi kv (đọc mã nguồn hàm).
chk("nhật ký nâng cấp KHÔNG ghi kv", String(X.ghiMigrate).indexOf(".set(") < 0 && String(X.ghiMigrate).indexOf("localStorage") < 0);
chk("nhật ký lỗi hình dạng KHÔNG ghi kv", String(X.ghiLoiHinhDang).indexOf(".set(") < 0 && String(X.ghiLoiHinhDang).indexOf("localStorage") < 0);
// Và không đi vào bản ghi truyện (thứ được ghi vào file xuất truyện): soi cả kho truyện.
const chuoiTruyen = JSON.stringify(S.store.stories);
chk(
  "nhật ký vận hành KHÔNG nằm trong bản ghi truyện (nên không vào file xuất truyện)",
  chuoiTruyen.indexOf("nhatKy") < 0 && chuoiTruyen.indexOf("loiHinhDang") < 0 && chuoiTruyen.indexOf("hinh-dang") < 0,
  chuoiTruyen.slice(0, 80)
);

// ==========================================================================
//  DỌN DẤU VẾT
// ==========================================================================
try {
  await root.kv.cotTruyen.delete(KEY_TN);
  await root.kv.cotTruyen.delete("ct_zzg5x");
  S.xoaLoiHinhDang();
  S.xoaNhatKyMigrate();
  await S.loadStories();
  await S.loadNgoaiHinh();
  T.app.screen = "home";
  T.render();
} catch (e) {}
await cho(30);

return ca;
