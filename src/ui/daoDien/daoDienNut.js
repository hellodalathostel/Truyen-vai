// Màn "Chế độ Đạo diễn" — BẢNG HÀNH ĐỘNG: mỗi `data-act` trong màn ⇒ một hàm xử lý (Đợt 6d).
//
// Khuôn giống `src/ui/suKien/*`: bảng `"data-act" ⇒ hàm`, chỉ KHÁC là các hành động này chỉ sống
// trong modal Đạo diễn nên chúng gắn vào thân modal (`body.addEventListener`) chứ không vào điểm
// đăng ký toàn cục. Nhờ vậy `index.js` chỉ còn là vỏ: dựng modal + tra bảng.
//
// Mọi câu chữ/hỏi lại/trạng thái mới nằm ở `daoDienFlow.js` (thuần, có ca Node ghim nguyên văn);
// tệp này chỉ ĐỌC/GHI dữ liệu và vẽ lại.
import { toast } from "../../dom.js";
import { MUC, suKienCua } from "../../thoiGian.js";
import {
  THONG_BAO_HOAN_TAT, THONG_BAO_HUY, cauHoiHoanTat, cauHoiHuy, mucGocSau, tenHienThi, thongBaoTrangThai,
  trangThaiSau, trangThaiKhoiPhuc,
} from "./daoDienFlow.js";

// Mọi handler nhận CÙNG một `ctx`: { D (bảng phụ thuộc), story, convXem, ve, b (nút vừa bấm) }.
export const BANG_NUT = {
  "dd-dinh-chinh-nv": async ({ D, story, convXem, ve, b }) => {
    await D.openSuaDinhChinh(story, convXem, { loai: "nhanvat", nvId: b.dataset.id, truong: b.dataset.truong }, ve);
  },
  "dd-dinh-chinh-qh": async ({ D, story, convXem, ve, b }) => {
    await D.openSuaDinhChinh(story, convXem, { loai: "quanhe", tu: b.dataset.tu, den: b.dataset.den }, ve);
  },
  "dd-dinh-chinh-moi": async ({ D, story, convXem, ve }) => {
    await D.openSuaDinhChinh(story, convXem, {}, ve);
  },
  "dd-dc-sua": async ({ D, story, convXem, ve, b }) => {
    const dc = D.ddOf(story).dinhChinh.find((x) => x.id === b.dataset.id);
    if (dc) await D.openSuaDinhChinh(story, convXem, { dc }, ve);
  },
  "dd-dc-bat": async ({ D, story, ve, b }) => {
    const dc = D.ddOf(story).dinhChinh.find((x) => x.id === b.dataset.id);
    if (!dc) return;
    const t = D.ddTruoc(story);
    dc.bat = dc.bat === false;
    if (!(await D.ddLuu(story, "bật/tắt đính chính", t))) dc.bat = !dc.bat;
    ve();
  },
  "dd-dc-hoi": async ({ D, story, ve, b }) => {
    const dc = D.ddOf(story).dinhChinh.find((x) => x.id === b.dataset.id);
    if (!dc) return;
    const t = D.ddTruoc(story);
    const tt = trangThaiKhoiPhuc();
    dc.xoa = tt.xoa;
    dc.xoaLuc = tt.xoaLuc;
    if (!(await D.ddLuu(story, "khôi phục đính chính", t))) dc.xoa = true;
    ve();
  },
  "dd-dc-xoa": async ({ D, story, ve, b }) => {
    const dc = D.ddOf(story).dinhChinh.find((x) => x.id === b.dataset.id);
    if (!dc) return;
    const t = D.ddTruoc(story);
    dc.xoa = true;
    dc.xoaLuc = Date.now();
    if (!(await D.ddLuu(story, "xoá đính chính", t))) dc.xoa = false;
    ve();
  },
  // Mức hé lộ của một sự kiện vắng mặt: chỉnh tay = CHỐT mức (ghi vào mức gốc rồi bỏ các dấu hé lộ
  // tự động, nếu không sổ hé lộ sẽ tính lại thành "đã lộ" ngay sau đó và lựa chọn vừa bấm không dính).
  "vg-muc": async ({ D, story, ve, b }) => {
    const id = b.dataset.id;
    const e = suKienCua(story).find((x) => x.id === id);
    if (!e) return;
    const truoc = JSON.parse(JSON.stringify(e));
    e.mucGoc = mucGocSau(b.dataset.muc, MUC);
    e.heLo = [];
    e.suaLuc = Date.now();
    // suKienCua ép lại quy tắc: đã lộ thì người chơi phải có trong danh sách biết.
    suKienCua(story);
    if (!(await D.luuTruyen(story, "mức hé lộ sự kiện"))) {
      const e2 = suKienCua(story).find((x) => x.id === id);
      if (e2) Object.assign(e2, truoc);
    }
    ve();
  },
  "dd-huong-moi": async ({ D, story, convXem, ve }) => {
    await D.openTaoHuong(story, convXem, ve);
  },
  "dd-hd-sua": async ({ D, story, convXem, ve, b }) => {
    const h = D.ddOf(story).huong.find((x) => x.id === b.dataset.id);
    if (h) await D.openSuaHuong(story, convXem, h, ve);
  },
  "dd-hd-tamdung": async (ctx) => { await doiTrangThai(ctx, "dd-hd-tamdung"); },
  "dd-hd-tieptuc": async (ctx) => { await doiTrangThai(ctx, "dd-hd-tieptuc"); },
  "dd-hd-hoantat": async (ctx) => { await doiTrangThai(ctx, "dd-hd-hoantat"); },
  "dd-hd-huy": async (ctx) => { await doiTrangThai(ctx, "dd-hd-huy"); },
};

// Bốn nút cuối chỉ khác nhau ở trạng thái mới, câu hỏi lại và câu báo — nên dùng chung một hàm.
async function doiTrangThai({ D, story, ve, b }, act) {
  const h = D.ddOf(story).huong.find((x) => x.id === b.dataset.id);
  if (!h) return;
  const moi = trangThaiSau(act);
  if (act === "dd-hd-tamdung" || act === "dd-hd-tieptuc") {
    const cu = h.trangThai;
    const t = D.ddTruoc(story);
    h.trangThai = moi;
    h.suaLuc = Date.now();
    if (!(await D.ddLuu(story, "tạm dừng/tiếp tục hướng", t))) h.trangThai = cu;
    else toast(thongBaoTrangThai(h.trangThai));
    ve();
    return;
  }
  const cauHoi = act === "dd-hd-hoantat" ? cauHoiHoanTat(tenHienThi(h)) : cauHoiHuy(tenHienThi(h));
  const ok = await D.hoiXacNhan(cauHoi[0], cauHoi[1], cauHoi[2]);
  if (!ok) return;
  const cu = h.trangThai;
  const t = D.ddTruoc(story);
  h.trangThai = moi;
  h.suaLuc = Date.now();
  if (!(await D.ddLuu(story, act === "dd-hd-hoantat" ? "hoàn tất hướng" : "huỷ hướng", t))) h.trangThai = cu;
  else toast(act === "dd-hd-hoantat" ? THONG_BAO_HOAN_TAT : THONG_BAO_HUY);
  ve();
}
