// Truyện Vai — HÌNH DẠNG DỮ LIỆU CỦA TỪNG PHIÊN BẢN CŨ (Giai đoạn 5).
//
// Vì sao có tệp này: `src/schema.js` khai một sổ đăng ký phiên bản (MIGRATION_TRUYEN 1..7,
// MIGRATION_HO_SO 1). Bộ kiểm thử cần một bản ghi ĐÚNG HÌNH DẠNG của mỗi phiên bản đó để
// chứng minh: (a) nâng cấp từ bản cũ nào cũng ra hình dạng hiện tại, (b) nâng cấp KHÔNG phụ
// thuộc dữ liệu thật, (c) nâng cấp chạy hai lần cho kết quả như chạy một lần.
//
// LUẬT CỦA DỰ ÁN (tests/README.md): dữ liệu ở đây là HƯ CẤU, dựng tay theo đúng hình dạng
// cũ đọc ra từ logic `chuanHoa*`/`newCharacter`/`newConversation`/`chuanHoaThoiGian` và các
// mô tả trong `src/schema.js` + `src/README.md`. TUYỆT ĐỐI không lấy từ dữ liệu thật của
// người dùng — kể cả "chỉ lấy một trường". Mọi id đều có tiền tố riêng của bộ test (`zz`).
//
// Hình dạng từng phiên bản (xem `MIGRATION_TRUYEN` để có mô tả gốc):
//   v1  truyện + người chơi + nhân vật + chương/hội thoại + biên niên sử + lorebook + giao kèo
//   v2  không có ghi chú trong mã nguồn (đường chuẩn hoá xử lý y như v1) — ở đây dựng y hệt
//       v1, chỉ khác nội dung chữ, để ca kiểm vẫn có một mẫu riêng cho v2
//   v3  + `hienDien` / `canhRieng` trên hội thoại, tin nhắn AI có `nvIds` / `rieng`
//   v4  + `nhip` + `canhDaKhep` trên truyện, tin nhắn `he` có thể có `khep`
//   v5  + `daoDien` (`dinhChinh` + `huong`)
//   v6  + `thoiGian` + `ngoaiManHinh`
//   v7  + liên kết hồ sơ ngoại hình: `ngoaiHinhId`/`bietDanh` trên nhân vật, `ngoaiHinhId`
//       trên người chơi, `hoSoIds` trên ảnh cảnh
//   v0  không có trường `phienBan` (bản lưu trước khi có ghi chép phiên bản)
//
// Trường `khongCo` của mỗi mục là danh sách tên trường KHÔNG được xuất hiện trong bản ghi đó
// (những trường ra đời ở phiên bản sau) — bộ kiểm dùng nó để bắt lỗi "fixture lỡ chứa hình
// dạng mới", tức là tự kiểm chính mình thay vì tin vào mắt người viết.

export function banSao(x) {
  return JSON.parse(JSON.stringify(x));
}

function giaoKeo() {
  return {
    bat: true,
    vaiNguoiChoi: "sub",
    tuKhoaDung: "đỏ",
    kieuQuanHe: "the-gioi-mo",
    mucDo: 3,
    nhipDo: "theo-dien-bien",
    doDai: "vua",
    ngonNgu: "tu-nhien",
    soThich: [],
    gioiHanCung: "",
    gioiHanMem: "",
    khongKhi: "",
    nguoiLon: true,
    danhXung: "",
    luatCanh: "",
    chamSocSau: "",
    luuY: "",
  };
}

// Nhân vật đúng hình dạng do `newCharacter()` sinh ra ở các phiên bản đầu: CHƯA có
// `ngoaiHinhId` và `bietDanh` (hai trường này chỉ có từ v7).
function nhanVat(id, ten) {
  return {
    id: id,
    ten: ten,
    vaiTro: "",
    moTa: "Một nhân vật hư cấu.",
    tinhCach: "điềm đạm",
    cachNoi: "câu ngắn",
    ghiChu: "",
    tuoi: "31",
    nguoiLon: true,
    vaiBdsm: "",
    kinhNghiem: "",
    phongCach: "",
    khauVi: "",
    soThich: [],
    gioiHan: "",
    gioiHanCung: "",
    danhXung: "",
    luatRieng: "",
    chamSocSau: "",
    tinHieuRieng: "",
    avatarStyle: "chu",
    emoji: "o",
    anh: "",
    mau: "#8b5cf6",
  };
}

function nguoiChoi() {
  return { ten: "Bạn", moTa: "Người chơi." };
}

// ---------------------------------------------------------------- truyện, từng phiên bản
function truyenV1() {
  return {
    id: "ct_zzv1",
    ten: "ZZ Truyện bản 1",
    moTa: "Mô tả hư cấu.",
    boiCanh: "Bối cảnh hư cấu.",
    luatTheGioi: "",
    theLoaiId: "",
    theLoaiTen: "",
    emoji: "*",
    mode: "chuong",
    nguoiChoi: nguoiChoi(),
    nhanVats: [nhanVat("nv_zzv1a", "An")],
    chuongs: [{ id: "ch_zzv1", so: 1, tieuDe: "Chương 1", mucTieu: "", tomTat: "", daKetThuc: false, taoLuc: 1000 }],
    hoiThoais: [
      { id: "ht_zzv1", tieuDe: "Hội thoại mở đầu", nhanVatIds: ["nv_zzv1a"], chuongId: "ch_zzv1", tomTatDen: 0, goiY: "", taoLuc: 1000, suaLuc: 1000 },
    ],
    bienNienSu: ["Một dòng biên niên sử."],
    lorebook: { ten: "", phienBan: 1000, entries: [] },
    giaoKeo: giaoKeo(),
    taoLuc: 1000,
    suaLuc: 1000,
    phienBan: 1,
  };
}

function truyenV2() {
  const s = truyenV1();
  s.id = "ct_zzv2";
  s.ten = "ZZ Truyện bản 2";
  s.boiCanh = "Bối cảnh hư cấu (bản 2).";
  s.phienBan = 2;
  return s;
}

function truyenV3() {
  const s = truyenV2();
  s.id = "ct_zzv3";
  s.ten = "ZZ Truyện bản 3";
  s.phienBan = 3;
  s.hoiThoais[0].hienDien = ["nv_zzv1a"];
  s.hoiThoais[0].canhRieng = null;
  return s;
}

function truyenV4() {
  const s = truyenV3();
  s.id = "ct_zzv4";
  s.ten = "ZZ Truyện bản 4";
  s.phienBan = 4;
  s.nhip = "thichUng";
  s.canhDaKhep = [
    {
      id: "canh_zzv4",
      htId: "ht_zzv1",
      htIds: ["ht_zzv1"],
      tomTat: "Một cảnh đã khép.",
      moc: "trước cổng",
      kyUc: [],
      quanHe: [],
      nhanVat: [],
      luc: 1000,
      huy: false,
      huyLuc: 0,
    },
  ];
  return s;
}

function truyenV5() {
  const s = truyenV4();
  s.id = "ct_zzv5";
  s.ten = "ZZ Truyện bản 5";
  s.phienBan = 5;
  s.daoDien = {
    bat: true,
    dinhChinh: [
      {
        id: "dc_zzv5",
        loai: "nhanvat",
        nvId: "nv_zzv1a",
        truong: "tinhCach",
        tu: "",
        den: "",
        chieu: "",
        muc: null,
        cu: "điềm đạm",
        moi: "ít nói hơn",
        lyDo: "hướng dẫn của người chơi",
        nguonCanh: [],
        luc: 1000,
        bat: true,
        xoa: false,
        xoaLuc: 0,
      },
    ],
    huong: [],
  };
  return s;
}

function truyenV6() {
  const s = truyenV5();
  s.id = "ct_zzv6";
  s.ten = "ZZ Truyện bản 6";
  s.phienBan = 6;
  s.thoiGian = {
    cheDo: "tamDung",
    nguongPhut: 180,
    chuDong: true,
    hoatDongLuc: 1000,
    daXuLyLuc: 0,
    phien: null,
  };
  s.ngoaiManHinh = [];
  return s;
}

// Hình dạng HIỆN TẠI (v7) — dùng làm mốc "đã đúng phiên bản thì không đổi gì".
function truyenV7() {
  const s = truyenV6();
  s.id = "ct_zzv7";
  s.ten = "ZZ Truyện bản 7";
  s.phienBan = 7;
  s.nguoiChoi.ngoaiHinhId = "nhz_zzv7";
  s.nhanVats[0].ngoaiHinhId = "nhz_zzv7";
  s.nhanVats[0].bietDanh = "An nhỏ";
  s.anh = [];
  return s;
}

// v0 = bản lưu TRƯỚC khi có trường phiên bản: cùng hình dạng v1 nhưng KHÔNG có `phienBan`.
function truyenV0() {
  const s = truyenV1();
  s.id = "ct_zzv0";
  s.ten = "ZZ Truyện không rõ phiên bản";
  delete s.phienBan;
  return s;
}

export const TRUYEN_CU = [
  { phienBan: 0, ten: "không có trường phienBan", moTa: "Bản lưu trước khi có ghi chép phiên bản.", khongCo: ["hienDien", "canhRieng", "nhip", "canhDaKhep", "daoDien", "thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV0() },
  { phienBan: 1, ten: "Bản đầu", moTa: "Truyện + nhân vật + chương/hội thoại + biên niên sử + người chơi.", khongCo: ["hienDien", "canhRieng", "nhip", "canhDaKhep", "daoDien", "thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV1() },
  { phienBan: 2, ten: "Chưa có ghi chú trong mã", moTa: "Không mô tả trong mã nguồn; đường chuẩn hoá xử lý y như bản 1.", khongCo: ["hienDien", "canhRieng", "nhip", "canhDaKhep", "daoDien", "thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV2() },
  { phienBan: 3, ten: "Hiện diện & cảnh riêng", moTa: "Hội thoại có hienDien và canhRieng.", khongCo: ["nhip", "canhDaKhep", "daoDien", "thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV3() },
  { phienBan: 4, ten: "Nhịp phát triển & cảnh đã khép", moTa: "Truyện có nhip và canhDaKhep.", khongCo: ["daoDien", "thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV4() },
  { phienBan: 5, ten: "Chế độ Đạo diễn", moTa: "Truyện có daoDien (dinhChinh + huong).", khongCo: ["thoiGian", "ngoaiManHinh", "ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV5() },
  { phienBan: 6, ten: "Thời gian vắng mặt", moTa: "Truyện có thoiGian và ngoaiManHinh.", khongCo: ["ngoaiHinhId", "bietDanh", "hoSoIds"], raw: truyenV6() },
  { phienBan: 7, ten: "Liên kết hồ sơ ngoại hình", moTa: "Nhân vật/người chơi có ngoaiHinhId + bietDanh, ảnh có hoSoIds.", khongCo: [], raw: truyenV7() },
];

// ---------------------------------------------------------------- hồ sơ ngoại hình
// Hình dạng CŨ (trước khi hồ sơ có `phienBan`/`moTaEn`/`tranhEn`): chỉ tên, tuổi, mô tả,
// điều cần tránh, ảnh tham chiếu, hai mốc thời gian.
export const HO_SO_CU = [
  {
    phienBan: 0,
    ten: "không có trường phienBan",
    moTa: "Hồ sơ trước khi có phienBan và bản dịch EN.",
    khongCo: ["phienBan", "moTaEn", "tranhEn"],
    raw: {
      id: "nhz_zzv0",
      tenChinh: "Người mẫu",
      tuoi: "34",
      moTa: "Mô tả ngoại hình hư cấu.",
      tranh: "điều cần tránh",
      anh: "",
      luc: 1000,
      suaLuc: 1000,
    },
  },
  {
    phienBan: 1,
    ten: "Hồ sơ có phiên bản + bản dịch EN",
    moTa: "Hình dạng hiện tại: có phienBan, moTaEn, tranhEn.",
    khongCo: [],
    raw: {
      id: "nhz_zzv1",
      tenChinh: "Người mẫu hai",
      tuoi: "40",
      moTa: "Mô tả ngoại hình hư cấu (bản 1).",
      tranh: "",
      moTaEn: "A fictional appearance description.",
      tranhEn: "",
      anh: "",
      luc: 1000,
      suaLuc: 1000,
      phienBan: 1,
    },
  },
];

// ---------------------------------------------------------------- tin nhắn & ảnh
// Tin nhắn KHÔNG mang phiên bản riêng: chúng đi theo phiên bản của truyện chứa chúng. Bản cũ
// chỉ có `nvId` (một nhân vật); bản mới dùng `nvIds` (nhiều người) và `rieng` (cảnh riêng).
export const TIN_NHAN_CU = [
  { ten: "tin người chơi", moTa: "Tin của người chơi, không gắn nhân vật.", raw: { id: "tn_zzv1", vai: "nguoi", noiDung: "Một câu của người chơi.", luc: 1000 } },
  { ten: "tin AI một nhân vật (nvId)", moTa: "Tin AI thời chưa có nvIds.", raw: { id: "tn_zzv2", vai: "ai", nvId: "nv_zzv1a", noiDung: "Một câu của nhân vật.", luc: 1000 } },
  { ten: "tin AI nhiều nhân vật (nvIds)", moTa: "Tin AI có nhiều người tham gia.", raw: { id: "tn_zzv3", vai: "ai", nvIds: ["nv_zzv1a", "nv_zzv1b"], noiDung: "Hai người cùng nói.", luc: 1000 } },
  { ten: "tin hệ thống có khep", moTa: "Dòng `he` đánh dấu cảnh đã khép.", raw: { id: "tn_zzv4", vai: "he", noiDung: "Đã khép cảnh.", luc: 1000, khep: "canh_zzv4" } },
  { ten: "tin thuộc cảnh riêng", moTa: "Tin sinh ra trong cảnh riêng.", raw: { id: "tn_zzv5", vai: "ai", noiDung: "Chỉ hai người nghe thấy.", luc: 1000, rieng: "nv_zzv1a" } },
];

// Ảnh cảnh thời chưa có `hoSoIds` (danh sách hồ sơ ngoại hình ghép vào prompt).
export const ANH_CU = {
  ten: "ảnh cảnh chưa có hoSoIds",
  moTa: "Ảnh lưu trước khi có liên kết hồ sơ ngoại hình.",
  raw: { id: "anh_zzv1", prompt: "Một khung hình hư cấu.", dataUrl: "data:image/png;base64,AAAA", luc: 1000 },
};
