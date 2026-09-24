// Truyện Vai — Giai đoạn 6: LOGIC THUẦN của màn "Dựng ảnh cho cảnh này".
//
// Vì sao tách ra: `openTaoAnh` từng là một hàm 566 dòng trộn lẫn quyết định và DOM, nên
// không kiểm được ở tầng Node và mỗi lần sửa là một lần mò. Tệp này giữ TOÀN BỘ quyết định
// (chọn hồ sơ nào được ghép, cổng 18+ cho ảnh, trạng thái nút, prompt gửi máy vẽ, bản ghi
// ảnh đem đi lưu) dưới dạng hàm thuần — có ca kiểm thử trong `tests/node/taoAnhFlow.test.mjs`.
//
// LUẬT CỦA TỆP NÀY: KHÔNG import DOM (không `dom.js`, không `document`, không `window`).
// Chỉ được import lõi. Chiều import: `src/ui/*` ĐƯỢC import lõi (store/ngoaiHinh/schema/…),
// còn lõi KHÔNG BAO GIỜ import `src/ui/*` — `goi-chung.test.mjs` ghim điều đó.

import { laNguoiLon, laCheDoNguoiLon, laDataUrlAnh } from "../../store.js";
import {
  nhanDienNgoaiHinh, tachNgoaiHinh, ghepPromptNgoaiHinh, gopLoaiTruNgoaiHinh,
} from "../../ngoaiHinh.js";

// Danh sách luôn là mảng — dữ liệu người dùng có thể là thứ khác (bản ghi cũ/nhập file).
const danh = (x) => (Array.isArray(x) ? x : []);

// ---------------------------------------------------------------- chọn nhân vật trong khung
// Hồ sơ SẼ được ghép: mọi thứ nhận diện ra hoặc thêm tay, TRỪ những gì người dùng đã bỏ
// chọn. Thứ tự: hồ sơ của ứng viên (theo thứ tự ứng viên) → hồ sơ trong thư viện → thêm tay.
export function chonHoSo({ ungVien, dsHoSo, tuDongIds, themIds, boQuaIds, hoSoMap }) {
  const ra = [];
  const da = new Set();
  const day = (id) => {
    if (!id || da.has(id) || boQuaIds.has(id)) return;
    const h = hoSoMap[id];
    if (!h) return;
    da.add(id);
    ra.push(h);
  };
  for (const u of danh(ungVien)) if (tuDongIds.has(u.hoSoId)) day(u.hoSoId);
  for (const h of danh(dsHoSo)) if (tuDongIds.has(h.id)) day(h.id);
  for (const id of themIds) day(id);
  return ra;
}

// Nhận diện lại tên nhân vật từ ô mô tả + ô yêu cầu thêm, rồi tự thêm những người gần như
// chắc chắn có trong khung: nhân vật ĐANG CÓ MẶT trong cảnh, và người chơi (nếu đã liên kết
// hồ sơ). Người dùng bỏ chip nếu không muốn — đây chỉ là mặc định.
export function nhanDienTrongKhung({ moTa, ghiChu, ungVien, hoSoMap, dsNhanVatCoMat, hoSoNguoiChoi: hnc }) {
  const text = tachNgoaiHinh(moTa || "") + "\n" + tachNgoaiHinh(ghiChu || "");
  const kq = nhanDienNgoaiHinh(text, ungVien);
  const tuDongIds = new Set(kq.chon);
  for (const c of danh(dsNhanVatCoMat)) if (c.ngoaiHinhId && hoSoMap[c.ngoaiHinhId]) tuDongIds.add(c.ngoaiHinhId);
  if (hnc) tuDongIds.add(hnc.id);
  return { tuDongIds, trungTen: kq.trung };
}

// Hồ sơ hiện lên dưới dạng chip: ứng viên đã chạm tới (tự động / thêm tay / bỏ chọn), hồ sơ
// thêm tay, và mọi hồ sơ có TÊN TRÙNG (để người dùng tự chọn đúng người).
export function hoSoHienChip({ ungVien, tuDongIds, themIds, boQuaIds, hoSoMap, trungTen }) {
  const ra = [];
  const da = new Set();
  const them = (id) => {
    if (!id || da.has(id) || !hoSoMap[id]) return;
    da.add(id);
    ra.push(id);
  };
  for (const u of danh(ungVien)) if (tuDongIds.has(u.hoSoId) || themIds.has(u.hoSoId) || boQuaIds.has(u.hoSoId)) them(u.hoSoId);
  for (const id of themIds) them(id);
  for (const t of danh(trungTen)) for (const id of danh(t.ids)) them(id);
  return ra;
}

// Hồ sơ còn lại để "Chọn thêm": chưa xuất hiện ở bất kỳ chip nào.
export function hoSoConLai({ dsHoSo, ungVien, tuDongIds, themIds, boQuaIds }) {
  const daCo = new Set();
  for (const u of danh(ungVien)) if (tuDongIds.has(u.hoSoId) || themIds.has(u.hoSoId) || boQuaIds.has(u.hoSoId)) daCo.add(u.hoSoId);
  for (const id of themIds) daCo.add(id);
  return danh(dsHoSo).filter((h) => !daCo.has(h.id));
}

// Bấm một chip: trả về thao tác cần làm, KHÔNG tự đụng vào trạng thái (nơi gọi áp dụng).
// Chip đang bật ⇒ bỏ chọn (đồng thời rút khỏi danh sách thêm tay). Chip đang tắt ⇒ chọn lại;
// chỉ ghi vào danh sách "thêm tay" khi hồ sơ KHÔNG phải do nhận diện mà ra.
export function thaoTacChip({ id, dangChon, laTuDong }) {
  return { id, boQua: !!dangChon, boChon: !dangChon, themTay: !dangChon && !laTuDong };
}

// ---------------------------------------------------------------- cổng người lớn cho ảnh
// Truyện đang ở chế độ người lớn mà trong cảnh có nhân vật CHƯA thoả `laNguoiLon()` ⇒ chặn
// hẳn màn tạo ảnh (không có nhánh "ép về khung an toàn"). Truyện KHÔNG ở chế độ người lớn ⇒
// luôn rỗng, tức không chặn gì — giống hệt hành vi cũ.
export function nvChuaXacNhanChoTaoAnh(story, dsNhanVatCoMat) {
  return laCheDoNguoiLon(story) ? danh(dsNhanVatCoMat).filter((c) => !laNguoiLon(c)) : [];
}

// Hai câu thông báo của cổng chặn. Tách ra đây để ca kiểm thử ghim NGUYÊN VĂN: người dùng
// phải đọc được cách sửa, và chữ này từng bị sửa nhầm một lần.
export function loiChanTaoAnh(ds) {
  const ten = danh(ds).map((c) => c.ten).join(", ");
  return {
    ten,
    trangThai:
      "Chặn tạo ảnh: " + ten + " chưa được xác nhận là người trưởng thành, mà truyện này đang ở chế độ người lớn. " +
      "Cách sửa: mở từng nhân vật, tích “Người trưởng thành (18+)”, hoặc sửa lại tuổi/mô tả cho đúng (nhân vật có dấu hiệu dưới 18 phải sửa mô tả/tuổi trước). Rồi thử lại.",
    toast:
      "Chặn tạo ảnh: " + ten + " chưa xác nhận 18+ — mở nhân vật và tích “Người trưởng thành (18+)”, hoặc sửa lại tuổi/mô tả, rồi thử lại.",
  };
}

// ---------------------------------------------------------------- trạng thái nút ở chân màn
// Thứ tự và nhãn nút là một phần của giao diện: giữ nguyên từng chữ.
export function nutTaoAnh({ busy, coAnh }) {
  const ra = [{ id: "viet-lai", nhan: "Viết lại", icon: "sparkle", cls: "", dis: !!busy && !coAnh }];
  if (coAnh) {
    ra.push({ id: "dung-lai", nhan: "Dựng lại", icon: "refresh", cls: "", dis: !!busy });
    ra.push({ id: "luu", nhan: "Đưa vào truyện", icon: "check", cls: "btn-primary", dis: !!busy });
  } else {
    ra.push({ id: "dung", nhan: "Dựng khung hình", icon: "image", cls: "btn-primary", dis: !!busy });
  }
  return ra;
}

// ---------------------------------------------------------------- prompt gửi máy vẽ
// Prompt CUỐI = mô tả cảnh (đã tách khối ngoại hình cũ + cắt khoảng trắng) + khối ngoại hình
// cố định + hậu tố phong cách.
//
// Trả HAI bản, và đây là chỗ dễ hiểu nhầm nhất của màn tạo ảnh:
//   • `gui` — chuỗi thật sự gửi cho máy vẽ (có hậu tố phong cách).
//   • `nen` — bản KHÔNG có hậu tố phong cách. Đây là thứ được lưu vào bản ghi ảnh
//     (`promptDaDung`), đúng như hành vi từ trước. Giữ nguyên, đừng "sửa cho nhất quán".
// Cả hai rỗng khi không có gì để dựng — nơi gọi báo "chưa có mô tả".
export function promptGuiMayVe({ moTa, dsHoSo, phongCach, dsPhongCach }) {
  const goc = tachNgoaiHinh(moTa || "").trim();
  const prompt = ghepPromptNgoaiHinh(goc, dsHoSo);
  if (!prompt) return { nen: "", gui: "" };
  const pc = danh(dsPhongCach).find((p) => p && p.id === phongCach);
  const them = pc ? pc.them : "";
  return { nen: prompt, gui: prompt + (them ? ", " + them : "") };
}

// Prompt loại trừ = điều người dùng gõ + "điều cần tránh" của những hồ sơ đang chọn.
export function loaiTruGuiMayVe(loaiTru, dsHoSo) {
  return gopLoaiTruNgoaiHinh(loaiTru, dsHoSo);
}

// ---------------------------------------------------------------- kết quả máy vẽ
// Máy vẽ trả về ẢNH dạng chuỗi data URL (`AI.taoAnh` đã chuẩn hoá; lỗi thì ném). Phần quyết
// định ở đây là NÉN CỠ NÀO: 512 cho khung vuông, 768 cho các khung còn lại; chất lượng 0.9.
// `nen` là hàm nén của tầng DOM (canvas) — TIÊM VÀO để tệp này vẫn thuần và kiểm được ở Node.
export function kichThuocNen(kichThuoc) {
  return kichThuoc === "512x512" ? 512 : 768;
}

export async function xuLyKetQuaMayVe(raw, kichThuoc, nen) {
  return await nen(raw, kichThuocNen(kichThuoc), 0.9);
}

// ---------------------------------------------------------------- bản ghi ảnh đem đi lưu
// Prompt lưu vào bản ghi ảnh là prompt ĐÃ ghép thật sự gửi cho máy vẽ (`promptDaDung`), không
// phải phần mô tả cảnh trong ô nhập. Nhánh dự phòng — người dùng bấm "Đưa vào truyện" mà chưa
// từng bấm "Dựng" — ghép lại từ ô mô tả, GIỐNG HỆT đường dựng (đã có ca kiểm thử ghim).
export function thongSoBanGhiAnh({ url, promptDaDung, moTa, dsHoSo, loaiTru, phongCach, kichThuoc, chuThich, convId }) {
  return {
    dataUrl: laDataUrlAnh(url),
    prompt: promptDaDung || ghepPromptNgoaiHinh(moTa || "", dsHoSo).trim(),
    loaiTru: String(loaiTru || "").trim(),
    phongCach: phongCach || "",
    kichThuoc: kichThuoc || "",
    chuThich: chuThich || "",
    convId,
    hoSoIds: danh(dsHoSo).map((h) => h.id),
  };
}
