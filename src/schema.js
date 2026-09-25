// Truyện Vai — TẦNG SCHEMA + SỔ ĐĂNG KÝ MIGRATION.
//
// Vì sao có tệp này: trước Giai đoạn 5, việc "dữ liệu cũ được nâng lên hình dạng hiện tại"
// nằm rải ở các `chuanHoa*` (store.js, ngoaiHinh.js, thoiGian.js) và không có chỗ nào trả lời
// được ba câu hỏi: (1) bản ghi này đang ở phiên bản nào, (2) đã đi qua những bước nâng cấp
// nào, (3) hình dạng của nó có đúng không. Tệp này gom cả ba lại:
//
//   · MÔ TẢ HÌNH DẠNG (`MO_TA_*`) + hàm kiểm (`kiemTra*`) — chỉ soi HÌNH DẠNG (kiểu dữ liệu,
//     trường bắt buộc), KHÔNG phán xét giá trị và KHÔNG sửa gì. Dùng khi nạp dữ liệu để báo
//     cho người dùng biết có bản ghi dị dạng, thay vì im lặng xoá.
//   · SỔ ĐĂNG KÝ MIGRATION (`MIGRATION_TRUYEN`, `MIGRATION_HO_SO`) — mỗi phiên bản một mục,
//     kèm mô tả đã đổi cái gì. Đây là chỗ DUY NHẤT ghi lại lịch sử hình dạng dữ liệu.
//   · BỘ ĐI `migrateTheo` — đi từ phiên bản của bản ghi tới phiên bản hiện tại rồi gọi hàm
//     chuẩn hoá CUỐI (`chuanHoa*`). Tệp này KHÔNG chứa logic chuẩn hoá: mọi trường được bù
//     ở `chuanHoa*` như trước, nên chỉ có MỘT nguồn sự thật cho hình dạng hiện tại.
//
// Bất biến của tệp này: KHÔNG import gì (nằm dưới cùng của DAG) — nhờ vậy `store.js`,
// `ngoaiHinh.js` đều dùng được mà không tạo vòng import. Mọi thứ ở đây là hàm thuần, trừ
// nhật ký trong bộ nhớ (bị chặn cả số mục lẫn dung lượng, không ghi xuống kv, không đi vào
// file xuất truyện).

// ---------------------------------------------------------------- kiểu cho mô tả
export const KIEU = {
  CHUOI: "chuỗi",
  SO: "số",
  MANG: "mảng",
  DOI_TUONG: "đối tượng",
  BOOL: "true/false",
  BAT_KY: "bất kỳ",
};

export const laDoiTuong = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const laMang = (x) => Array.isArray(x);

// ---------------------------------------------------------------- mô tả hình dạng
// Quy ước: `batBuoc: true` = thiếu trường này là DỮ LIỆU HỎNG (không phải "bản cũ"); mọi
// trường còn lại là tuỳ chọn, thiếu thì `chuanHoa*` bù mặc định. Cố ý KHÔNG đánh dấu bắt buộc
// những trường mà bản lưu cũ có thể thiếu (đó là việc của sổ migration, không phải lỗi).
export const MO_TA_TRUYEN = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  ten: { kieu: KIEU.CHUOI },
  moTa: { kieu: KIEU.CHUOI },
  boiCanh: { kieu: KIEU.CHUOI },
  luatTheGioi: { kieu: KIEU.CHUOI },
  theLoaiId: { kieu: KIEU.CHUOI },
  theLoaiTen: { kieu: KIEU.CHUOI },
  emoji: { kieu: KIEU.CHUOI },
  mode: { kieu: KIEU.CHUOI },
  nguoiChoi: { kieu: KIEU.DOI_TUONG },
  nhanVats: { kieu: KIEU.MANG },
  chuongs: { kieu: KIEU.MANG },
  hoiThoais: { kieu: KIEU.MANG },
  canhDaKhep: { kieu: KIEU.MANG },
  truyenVietRa: { kieu: KIEU.MANG },
  bienNienSu: { kieu: KIEU.MANG },
  anh: { kieu: KIEU.MANG },
  lorebook: { kieu: KIEU.DOI_TUONG },
  giaoKeo: { kieu: KIEU.DOI_TUONG },
  daoDien: { kieu: KIEU.DOI_TUONG },
  thoiGian: { kieu: KIEU.DOI_TUONG },
  ngoaiManHinh: { kieu: KIEU.MANG },
  nhip: { kieu: KIEU.CHUOI },
  taoLuc: { kieu: KIEU.SO },
  suaLuc: { kieu: KIEU.SO },
  phienBan: { kieu: KIEU.SO },
};

export const MO_TA_NHAN_VAT = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  ten: { kieu: KIEU.CHUOI },
  moTa: { kieu: KIEU.CHUOI },
  tuoi: { kieu: KIEU.BAT_KY },
  nguoiLon: { kieu: KIEU.BOOL },
  ngoaiHinhId: { kieu: KIEU.CHUOI },
  bietDanh: { kieu: KIEU.CHUOI },
  anh: { kieu: KIEU.CHUOI },
};

export const MO_TA_CHUONG = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  so: { kieu: KIEU.SO },
  tieuDe: { kieu: KIEU.CHUOI },
};

export const MO_TA_HOI_THOAI = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  tieuDe: { kieu: KIEU.CHUOI },
  chuongId: { kieu: KIEU.CHUOI },
  nhanVatIds: { kieu: KIEU.MANG },
  hienDien: { kieu: KIEU.MANG },
  canhRieng: { kieu: KIEU.DOI_TUONG },
  vgHeLo: { kieu: KIEU.MANG },
  vgMocLuc: { kieu: KIEU.SO },
  khepGoc: { kieu: KIEU.SO },
};

export const MO_TA_TIN_NHAN = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  vai: { kieu: KIEU.CHUOI, batBuoc: true, trong: ["nguoi", "ai", "anh", "he"] },
  noiDung: { kieu: KIEU.CHUOI },
  luc: { kieu: KIEU.SO },
  nvId: { kieu: KIEU.CHUOI },
  nvIds: { kieu: KIEU.MANG },
  rieng: { kieu: KIEU.CHUOI },
  khep: { kieu: KIEU.CHUOI },
};

export const MO_TA_ANH = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  prompt: { kieu: KIEU.CHUOI },
  dataUrl: { kieu: KIEU.CHUOI },
  hoSoIds: { kieu: KIEU.MANG },
  luc: { kieu: KIEU.SO },
};

export const MO_TA_HO_SO = {
  id: { kieu: KIEU.CHUOI, batBuoc: true },
  tenChinh: { kieu: KIEU.CHUOI },
  tuoi: { kieu: KIEU.BAT_KY },
  moTa: { kieu: KIEU.CHUOI },
  tranh: { kieu: KIEU.CHUOI },
  moTaEn: { kieu: KIEU.CHUOI },
  tranhEn: { kieu: KIEU.CHUOI },
  anh: { kieu: KIEU.CHUOI },
  luc: { kieu: KIEU.SO },
  suaLuc: { kieu: KIEU.SO },
  phienBan: { kieu: KIEU.SO },
};

const NHAN_LOAI = {
  truyen: "truyện",
  "tin-nhan": "tin nhắn",
  anh: "ảnh",
  "ho-so": "hồ sơ ngoại hình",
  "nhan-vat": "nhân vật",
  chuong: "chương",
  "hoi-thoai": "hội thoại",
};

export function nhanLoaiBanGhi(loai) {
  return NHAN_LOAI[loai] || loai;
}

// ---------------------------------------------------------------- hàm kiểm hình dạng
// Trả về `{ ok, soLoi, loi: [{ duong, moTa }] }`. KHÔNG ném lỗi, KHÔNG sửa dữ liệu, KHÔNG
// đụng kv. `duong` là đường dẫn kiểu `hoiThoais[2].nhanVatIds` để tìm được chỗ hỏng.
function kiemTheoMo(mo, raw, duong, ra, sau) {
  if (!laDoiTuong(raw)) {
    ra.push({ duong: duong || "(gốc)", moTa: (duong || "giá trị gốc") + " phải là đối tượng (đang là " + kieuThat(raw) + ")" });
    return;
  }
  for (const truong in mo) {
    const mt = mo[truong];
    const v = raw[truong];
    const d = duong ? duong + "." + truong : truong;
    if (v === undefined || v === null) {
      if (mt.batBuoc) ra.push({ duong: d, moTa: "thiếu trường bắt buộc “" + truong + "”" });
      continue;
    }
    if (mt.kieu === KIEU.BAT_KY) continue;
    if (mt.kieu === KIEU.CHUOI && typeof v !== "string") { ra.push({ duong: d, moTa: truong + " phải là chuỗi (đang là " + kieuThat(v) + ")" }); continue; }
    if (mt.kieu === KIEU.SO && !Number.isFinite(Number(v))) { ra.push({ duong: d, moTa: truong + " phải là số (đang là " + kieuThat(v) + ")" }); continue; }
    if (mt.kieu === KIEU.BOOL && typeof v !== "boolean") { ra.push({ duong: d, moTa: truong + " phải là true/false (đang là " + kieuThat(v) + ")" }); continue; }
    if (mt.kieu === KIEU.MANG && !laMang(v)) { ra.push({ duong: d, moTa: truong + " phải là mảng (đang là " + kieuThat(v) + ")" }); continue; }
    if (mt.kieu === KIEU.DOI_TUONG && !laDoiTuong(v)) { ra.push({ duong: d, moTa: truong + " phải là đối tượng (đang là " + kieuThat(v) + ")" }); continue; }
    if (mt.trong && mt.trong.indexOf(v) < 0) { ra.push({ duong: d, moTa: truong + " phải là một trong " + mt.trong.join(" / ") + " (đang là “" + String(v).slice(0, 30) + "”)" }); continue; }
    if (sau) sau(truong, v, d, ra);
  }
}

export function kieuThat(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "mảng";
  return typeof v === "object" ? "đối tượng" : typeof v;
}

function ket(ra) {
  return { ok: ra.length === 0, soLoi: ra.length, loi: ra.slice(0, 20) };
}

const laMangChuoi = (v) => laMang(v) && v.every((x) => typeof x === "string");

export function kiemTraTruyen(raw) {
  const ra = [];
  kiemTheoMo(MO_TA_TRUYEN, raw, "", ra, (truong, v, d, out) => {
    if (truong === "nhanVats") v.forEach((c, i) => kiemTheoMo(MO_TA_NHAN_VAT, c, d + "[" + i + "]", out));
    if (truong === "chuongs") v.forEach((c, i) => kiemTheoMo(MO_TA_CHUONG, c, d + "[" + i + "]", out));
    if (truong === "hoiThoais") v.forEach((c, i) => kiemTheoMo(MO_TA_HOI_THOAI, c, d + "[" + i + "]", out));
    if (truong === "ngoaiManHinh") v.forEach((e, i) => { if (!laDoiTuong(e)) out.push({ duong: d + "[" + i + "]", moTa: "sự kiện phải là đối tượng" }); });
    if (truong === "canhDaKhep") v.forEach((k, i) => { if (!laDoiTuong(k)) out.push({ duong: d + "[" + i + "]", moTa: "cảnh đã khép phải là đối tượng" }); });
    if (truong === "truyenVietRa") v.forEach((k, i) => { if (!laDoiTuong(k)) out.push({ duong: d + "[" + i + "]", moTa: "bản viết thành truyện phải là đối tượng" }); });
    if (truong === "anh") v.forEach((a, i) => kiemTheoMo(MO_TA_ANH, a, d + "[" + i + "]", out));
  });
  return ket(ra);
}

export function kiemTraTinNhan(raw) {
  const ra = [];
  if (!laMang(raw)) return ket(raw === undefined || raw === null ? [] : [{ duong: "(gốc)", moTa: "tin nhắn của hội thoại phải là mảng" }]);
  raw.forEach((m, i) => {
    kiemTheoMo(MO_TA_TIN_NHAN, m, "[" + i + "]", ra, (truong, v, d, out) => {
      if (truong === "nvIds" && !laMangChuoi(v)) out.push({ duong: d, moTa: "nvIds phải là mảng id dạng chuỗi" });
    });
  });
  return ket(ra);
}

export function kiemTraAnh(raw) {
  const ra = [];
  kiemTheoMo(MO_TA_ANH, raw, "", ra, (truong, v, d, out) => {
    if (truong === "hoSoIds" && !laMangChuoi(v)) out.push({ duong: d, moTa: "hoSoIds phải là mảng id dạng chuỗi" });
  });
  return ket(ra);
}

export function kiemTraHoSo(raw) {
  const ra = [];
  kiemTheoMo(MO_TA_HO_SO, raw, "", ra);
  return ket(ra);
}

// Bảng tra: loại bản ghi → hàm kiểm. Dùng chung cho đường nạp kv và đường nhập file.
export const KIEM_THEO_LOAI = {
  truyen: kiemTraTruyen,
  "tin-nhan": kiemTraTinNhan,
  anh: kiemTraAnh,
  "ho-so": kiemTraHoSo,
};

export function kiemTheoLoai(loai, raw) {
  const f = KIEM_THEO_LOAI[loai];
  return f ? f(raw) : { ok: true, soLoi: 0, loi: [] };
}

// ---------------------------------------------------------------- sổ đăng ký migration
// MỘT mục cho MỘT phiên bản, theo đúng thứ tự tăng dần. `phienBan` = hình dạng mà mục này
// tạo ra (tức là bản ghi mang `phienBan` nhỏ hơn thì phải đi qua mục này).
//
// `lam` (tuỳ chọn) là bước biến đổi RIÊNG của phiên bản đó, chỉ dùng khi `chuanHoa*` không
// thể làm thay (ví dụ đổi tên trường). Hiện CHƯA mục nào cần: mọi khác biệt giữa các phiên
// bản đều là "thiếu trường ⇒ bù mặc định", và việc đó nằm ở `chuanHoa*` như trước Giai đoạn 5.
// Ghi rõ ở đây để người sau không tưởng nhầm rằng logic nâng cấp nằm ở hai chỗ.
export const MIGRATION_TRUYEN = [
  { phienBan: 1, ten: "Bản đầu", moTa: "Truyện + nhân vật + chương/hội thoại + biên niên sử + người chơi." },
  { phienBan: 2, ten: "Chưa có ghi chú trong mã", moTa: "Không có mô tả trong mã nguồn; đường chuẩn hoá xử lý y như phiên bản 1." },
  { phienBan: 3, ten: "Hiện diện & cảnh riêng", moTa: "Hội thoại có `hienDien` (ai đang có mặt) và `canhRieng`; tin nhắn AI có thể có `nvIds` (nhiều nhân vật) và `rieng` (thuộc cảnh riêng)." },
  { phienBan: 4, ten: "Nhịp phát triển & cảnh đã khép", moTa: "Truyện có `nhip` + `canhDaKhep` (nhật ký cảnh đã duyệt, kèm ký ức và delta quan hệ); tin nhắn `he` có thể mang `khep`." },
  { phienBan: 5, ten: "Chế độ Đạo diễn", moTa: "Truyện có `daoDien` (`dinhChinh` = lớp phủ đính chính đảo ngược được, `huong` = hướng phát triển kèm tiến độ)." },
  { phienBan: 6, ten: "Thời gian vắng mặt", moTa: "Truyện có `thoiGian` (chế độ/ngưỡng vắng mặt + phiên gần nhất) và `ngoaiManHinh` (sự kiện xảy ra khi người chơi vắng mặt, kèm ai biết và mức hé lộ)." },
  { phienBan: 7, ten: "Liên kết hồ sơ ngoại hình", moTa: "Nhân vật và người chơi có `ngoaiHinhId` + `bietDanh`; ảnh cảnh có `hoSoIds`. Liên kết chỉ theo id, không bao giờ tự suy theo tên." },
  { phienBan: 8, ten: "Bản viết thành truyện", moTa: "Truyện có `truyenVietRa`: các bản văn xuôi dẫn xuất từ một hội thoại (từ log thô hoặc từ cảnh đã khép), lưu riêng và KHÔNG ghi ngược vào dữ liệu nhập vai. Đợt 5 bổ sung (không đổi số phiên bản vì trường tuỳ chọn, bản cũ bỏ qua): mục bị bấm Dừng giữa chừng có thêm cờ `daDung` — phần văn đã viết vẫn được giữ và `trangThai` vẫn là `xong`." },
];

export const MIGRATION_HO_SO = [
  { phienBan: 1, ten: "Hồ sơ có phiên bản + bản dịch EN", moTa: "Hồ sơ có `phienBan`, `moTaEn`/`tranhEn` (bản tiếng Anh dẫn xuất cho prompt tạo ảnh) và ảnh tham chiếu nhúng thẳng." },
];

// Bản ghi không có `phienBan` (hoặc giá trị vô lý) được coi là phiên bản 0 = "trước khi có
// ghi chú phiên bản", và đi qua mọi bước như một bản cũ.
export function soPhienBan(raw) {
  const n = Number(laDoiTuong(raw) ? raw.phienBan : NaN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function buocCanChay(soDo, tu) {
  return (soDo || []).filter((b) => Number(b.phienBan) > Number(tu));
}

// ---------------------------------------------------------------- bộ đi migration
// Trả về `{ ra, tu, den, buoc, daNang, vuotPhienBan }`:
//   `ra`  = bản ghi ở hình dạng HIỆN TẠI (do `chuanHoaCuoi` dựng — nguồn hình dạng duy nhất)
//   `tu`  = phiên bản đọc được của đầu vào (0 = không rõ)
//   `buoc`= danh sách phiên bản đã đi qua
//   `vuotPhienBan` = true khi bản ghi mang phiên bản MỚI HƠN app (dữ liệu từ tương lai) —
//                    vẫn chuẩn hoá như bình thường, nhưng chỗ gọi phải báo cho người dùng.
export function migrateTheo(raw, soHienTai, soDo, chuanHoaCuoi, ctx) {
  const tu = soPhienBan(raw);
  const buoc = buocCanChay(soDo, tu);
  let x = raw;
  for (const b of buoc) if (typeof b.lam === "function") x = b.lam(x, ctx);
  const ra = chuanHoaCuoi(x, ctx);
  return {
    ra,
    tu,
    den: Number(soHienTai) || 0,
    buoc: buoc.map((b) => Number(b.phienBan)),
    daNang: tu < Number(soHienTai),
    vuotPhienBan: tu > Number(soHienTai),
  };
}

// ---------------------------------------------------------------- nhật ký (trong bộ nhớ)
// Cả hai nhật ký CHỈ sống trong phiên làm việc: không ghi kv, không vào file xuất truyện,
// có trần cả số mục lẫn số ký tự. Bị chặn như vậy vì chúng là thông tin vận hành, không
// phải dữ liệu của người dùng.
const TOI_DA_MIGRATE = 20;
const TOI_DA_LOI_HD = 60;
const TOI_DA_CHU = 4000;

let nhatKyMigrate = [];
let soMigrate = 0;
let nhatKyLoiHinhDang = [];
let soLoiHinhDang = 0;

function catChu(s, n) {
  const t = String(s === undefined || s === null ? "" : s);
  const toiDa = Number(n) > 0 ? Math.floor(Number(n)) : 200;
  return t.length <= toiDa ? t : t.slice(0, toiDa) + "…";
}

export function ghiMigrate(loai, tu, den, vuotPhienBan) {
  soMigrate++;
  nhatKyMigrate.unshift({ loai, tu: Number(tu) || 0, den: Number(den) || 0, vuotPhienBan: !!vuotPhienBan, luc: Date.now() });
  if (nhatKyMigrate.length > TOI_DA_MIGRATE) nhatKyMigrate = nhatKyMigrate.slice(0, TOI_DA_MIGRATE);
  return nhatKyMigrate[0];
}

export function docNhatKyMigrate() {
  return { ds: nhatKyMigrate.slice(), tong: soMigrate };
}

export function xoaNhatKyMigrate() {
  nhatKyMigrate = [];
  soMigrate = 0;
}

// Ghi lại một bản ghi SAI HÌNH DẠNG gặp lúc nạp. Không xoá gì, không sửa gì — chỉ để màn
// Tự kiểm tra và console nói ra.
export function ghiLoiHinhDang(loai, id, ten, kqKiem) {
  const loi = (kqKiem && kqKiem.loi) || [];
  if (!loai) return null;
  soLoiHinhDang += Math.max(1, loi.length);
  const muc = {
    loai,
    id: catChu(id, 60),
    ten: catChu(ten, 80),
    soLoi: loi.length,
    loi: loi.slice(0, 5).map((x) => ({ duong: catChu(x.duong, 120), moTa: catChu(x.moTa, 200) })),
    luc: Date.now(),
  };
  nhatKyLoiHinhDang.unshift(muc);
  if (nhatKyLoiHinhDang.length > TOI_DA_LOI_HD) nhatKyLoiHinhDang = nhatKyLoiHinhDang.slice(0, TOI_DA_LOI_HD);
  while (nhatKyLoiHinhDang.length > 1 && dungLuongLoiHinhDang() > TOI_DA_CHU) nhatKyLoiHinhDang.pop();
  return muc;
}

function dungLuongLoiHinhDang() {
  let tong = 0;
  for (const m of nhatKyLoiHinhDang) {
    tong += (m.id || "").length + (m.ten || "").length;
    for (const x of m.loi || []) tong += (x.duong || "").length + (x.moTa || "").length;
  }
  return tong;
}

export function docLoiHinhDang() {
  return { ds: nhatKyLoiHinhDang.slice(), tong: soLoiHinhDang };
}

export function xoaLoiHinhDang() {
  nhatKyLoiHinhDang = [];
  soLoiHinhDang = 0;
}

// Một dòng tóm tắt cho bảng gỡ lỗi: "nâng cấp: 2 bản ghi (v6→v7 ×2)".
export function tomTatMigrate() {
  const k = docNhatKyMigrate();
  if (!k.ds.length) return "chưa nâng cấp bản ghi nào trong phiên này";
  const dem = {};
  for (const m of k.ds) {
    const khoa = "v" + m.tu + "→v" + m.den;
    dem[khoa] = (dem[khoa] || 0) + 1;
  }
  const phan = Object.keys(dem).map((x) => x + " ×" + dem[x]);
  return k.tong + " bản ghi (" + phan.join(", ") + ")";
}

// Mô tả hình dạng dưới dạng chữ — dùng cho tài liệu và cho ca kiểm thử (không dùng cho UI).
export function moTaHinhDang() {
  return {
    truyen: Object.keys(MO_TA_TRUYEN),
    "tin-nhan": Object.keys(MO_TA_TIN_NHAN),
    anh: Object.keys(MO_TA_ANH),
    "ho-so": Object.keys(MO_TA_HO_SO),
    "nhan-vat": Object.keys(MO_TA_NHAN_VAT),
    chuong: Object.keys(MO_TA_CHUONG),
    "hoi-thoai": Object.keys(MO_TA_HOI_THOAI),
  };
}
