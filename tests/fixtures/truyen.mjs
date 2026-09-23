// Truyện Vai — dựng đối tượng truyện TỐI THIỂU cho tầng kiểm thử Node.
//
// Cố tình KHÔNG import src/store.js: tầng Node kiểm thử các hàm thuần, nên đối tượng ở
// đây được dựng tay với id CỐ ĐỊNH (không sinh id ngẫu nhiên) để khẳng định so sánh được.
// Mọi tên/id trong file này là HƯ CẤU, cố tình trung tính — không bao giờ dùng tên hay id
// của truyện thật (xem luật chống rò rỉ dữ liệu ở tests/README.md).

export const ID_NGUOI = "nguoi";

export function taoNhanVat(id, ten, them) {
  return Object.assign(
    {
      id: id,
      ten: ten,
      vaiTro: "",
      moTa: "",
      tinhCach: "",
      cachNoi: "",
      ghiChu: "",
      tuoi: "",
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
      emoji: "x",
      anh: "",
      mau: "#8b5cf6",
      ngoaiHinhId: "",
      bietDanh: "",
    },
    them || {}
  );
}

export function taoHoiThoai(id, tieuDe, nhanVatIds, them) {
  const ids = (nhanVatIds || []).slice();
  return Object.assign(
    {
      id: id,
      tieuDe: tieuDe,
      nhanVatIds: ids,
      hienDien: ids.slice(),
      chuongId: null,
      canhRieng: null,
      daCoCanhRieng: false,
      goiKhep: false,
      khepGoc: 0,
      tomTatDen: 0,
      goiY: "",
      taoLuc: 1000,
      suaLuc: 1000,
    },
    them || {}
  );
}

export function taoCanhDaKhep(id, htId, o) {
  return Object.assign(
    {
      id: id,
      htId: htId,
      htIds: htId ? [htId] : [],
      tuMsgId: "",
      denMsgId: "",
      tuLuc: 1000,
      denLuc: 1000,
      tomTat: "",
      moc: "",
      kyUc: [],
      quanHe: [],
      nhanVat: [],
      luc: 1000,
      huy: false,
      huyLuc: 0,
    },
    o || {}
  );
}

export function taoTinNhan(id, vai, ten, noiDung, them) {
  return Object.assign({ id: id, vai: vai, ten: ten || "", noiDung: noiDung, luc: 1000 }, them || {});
}

export function taoGiaoKeo(o) {
  return Object.assign(
    {
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
    },
    o || {}
  );
}

export function taoTruyen(o) {
  return Object.assign(
    {
      id: "ct_zzfixture",
      ten: "ZZ Fixture",
      moTa: "",
      boiCanh: "",
      luatTheGioi: "",
      theLoaiId: "",
      theLoaiTen: "",
      emoji: "*",
      mode: "chuong",
      nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "" },
      nhanVats: [],
      chuongs: [],
      hoiThoais: [],
      nhip: "cham",
      canhDaKhep: [],
      bienNienSu: [],
      anh: [],
      lorebook: { ten: "", phienBan: 1, entries: [] },
      giaoKeo: null,
      daoDien: null,
      thoiGian: null,
      ngoaiManHinh: [],
      taoLuc: 1000,
      suaLuc: 1000,
    },
    o || {}
  );
}

export function taoHoSo(id, tenChinh, o) {
  return Object.assign(
    {
      id: id,
      tenChinh: tenChinh,
      tuoi: "",
      moTa: "",
      tranh: "",
      moTaEn: "",
      tranhEn: "",
      anh: "",
      luc: 1000,
      suaLuc: 1000,
    },
    o || {}
  );
}
