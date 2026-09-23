// Truyện Vai — dựng `window.TRUYEN_VAI_ROOT` giả TỐI THIỂU trước khi nạp src/*.
//
// Vì sao cần: `src/store.js` đọc cấu hình (`CauHinh()`) và các danh sách BDSM từ gốc
// perchance ngay LÚC NẠP MODULE. Không có gốc thì mọi lời gọi `giaoKeoMacDinh()` lại
// rơi vào nhánh lỗi và in ra console — tầng kiểm thử vẫn chạy đúng nhưng ồn ào, và
// không kiểm thử được đường đi thật (đọc danh sách sở thích từ gốc).
//
// Thứ tự import trong file kiểm thử quyết định thứ tự nạp module, nên file này PHẢI
// được import ĐẦU TIÊN (trước mọi import chạm tới src/*). Ở Node, mỗi file kiểm thử
// chạy trong tiến trình riêng nên không có chuyện "file khác đã nạp store.js trước".
//
// Mọi giá trị ở đây là HƯ CẤU (hoặc chép lại từ main.pjs — mã công khai), KHÔNG bao
// giờ lấy từ dữ liệu truyện thật của người dùng.

const CAU_HINH = {
  soTinNhanGiuNguyenVan: 36,
  tyLeNguongTomTat: 0.7,
  soNguoiTraLoiToiDa: 3,
  soTuGoiY: 3,
  doDaiMoTaNhanVatKhac: 90,
  luuToiDaTinNhan: 4000,
  soTinNhanQuetLore: 8,
  nganSachKyTuLore: 4000,
  soKyTuMoiMucLore: 1500,
  soKyTuMoiDoanTomTat: 14000,
  soTinNhanGiuLaiKhiKetChuong: 8,
  soNgayNhacSaoLuu: 7,
};

const SO_THICH = [
  { id: "st_a", ten: "trói nhẹ" },
  { id: "st_b", ten: "bịt mắt" },
];
const MUC_DO = [
  { so: 1, ten: "nhẹ", moTa: "" },
  { so: 3, ten: "vừa", moTa: "mức thường dùng" },
  { so: 5, ten: "mạnh", moTa: "" },
];
const NHIP_DO = [{ id: "theo-dien-bien", ten: "theo diễn biến" }];
const DO_DAI = [{ id: "vua", ten: "một cảnh vừa" }];
const NGON_NGU = [{ id: "tu-nhien", ten: "tự nhiên, đời thường" }];
const KIEU = [{ id: "the-gioi-mo", ten: "Thế giới mở", moTa: "không khung", goiY: "" }];

export const CAU_HINH_GIA = CAU_HINH;

// `localStorage` giả trong bộ nhớ. Ở Node không có localStorage, nên mọi lời gọi
// `saveSettings()` rơi vào nhánh lỗi (được bọc try/catch nên không vỡ, nhưng in ra
// console.error và KHÔNG kiểm thử được đường lưu thật). Có bản giả này thì mốc sao lưu
// (`mocSaoLuu`/`danhDauSaoLuu`/`danhDauDaDoi`) ghi rồi đọc lại được như trên trình duyệt.
// Chỉ cài khi môi trường CHƯA có, nên không đụng gì tới tầng trình duyệt.
if (typeof globalThis.localStorage === "undefined") {
  const KHO = {};
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(KHO, String(k)) ? KHO[String(k)] : null),
    setItem: (k, v) => { KHO[String(k)] = String(v); },
    removeItem: (k) => { delete KHO[String(k)]; },
    clear: () => { for (const k of Object.keys(KHO)) delete KHO[k]; },
    key: (i) => Object.keys(KHO)[Number(i)] || null,
    get length() { return Object.keys(KHO).length; },
  };
}

if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    TRUYEN_VAI_ROOT: {
      CauHinh: () => CAU_HINH,
      SoThichBdsm: () => SO_THICH,
      MucDoBdsm: () => MUC_DO,
      NhipDoBdsm: () => NHIP_DO,
      DoDaiCanh: () => DO_DAI,
      NgonNguBdsm: () => NGON_NGU,
      KieuQuanHe: () => KIEU,
      GiaoKeoMacDinh: () => ({
        bat: false,
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
        nguoiLon: false,
        danhXung: "",
        luatCanh: "",
        chamSocSau: "",
        luuY: "",
      }),
    },
  };
}
