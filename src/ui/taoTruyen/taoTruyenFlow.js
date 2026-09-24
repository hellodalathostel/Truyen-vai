// Truyện Vai — Đợt 6b: logic THUẦN của màn "Cốt truyện mới" (wizard + Tạo nhanh).
//
// KHÔNG import DOM. Mọi quyết định ở đây test được bằng Node:
//   • thể loại nào ⇒ lớp người lớn nào (hợp nhất với `src/ui/cong18.js`)
//   • suy ra tên truyện từ bối cảnh do AI viết
//   • ghép bối cảnh + luật thế giới
//   • hình dạng bản nháp trước khi tạo truyện thật (bỏ nhân vật không tên, mặc định "Bạn")
// Phần hộp thoại/bấm nút nằm ở `index.js`, `taoTruyenWizard.js`, `taoTruyenNhanh.js`.

// Bước 1: chưa chọn gì thì mặc định là cách dựng đầu tiên trong danh sách, không có danh
// sách thì "chuong".
export function cheDoMacDinh(modes) {
  return modes && modes.length ? modes[0].id : "chuong";
}

export function theLoaiHienThi(tl) {
  return tl ? tl.emoji + " " + tl.ten : "";
}

export function emojiTheLoai(tl) {
  return tl ? tl.emoji : "✦";
}

export function tenNguoiChoi(v) {
  return v || "Bạn";
}

// Bối cảnh hiển thị = bối cảnh + (nếu có) khối luật thế giới do AI viết.
export function ghepBoiCanhVaLuat({ boiCanh, luat }) {
  return (boiCanh || "") + (luat ? "\n\nLuật thế giới:\n" + luat : "");
}

// Tên truyện suy ra từ bối cảnh AI viết: lấy câu đầu tiên rồi cắt còn 60 ký tự.
export function datTenTuBoiCanh(boiCanh) {
  const ten = (String(boiCanh || "").split(/[.!?\n]/)[0] || "").trim();
  return ten ? ten.slice(0, 60) : "";
}

// Nhân vật chỉ được giữ nếu có tên — bản nháp AI có thể trả về thẻ rỗng.
export function locNhanVatCoTen(nhanVats) {
  return (nhanVats || []).filter((c) => c.ten);
}

// Truyện "nháp" để đưa cho AI khi nhờ nó nghĩ hướng nhân vật (wizard). Đây không phải bản
// ghi thật — chỉ đủ trường cho prompt, và `nhanVats`/`bienNienSu` để rỗng có chủ ý.
export function stubTruyen({ ten, boiCanh, tl, giaoKeo }) {
  return {
    ten: ten || "Cốt truyện mới",
    boiCanh: boiCanh || "",
    theLoaiTen: tl ? tl.ten : "",
    nhanVats: [],
    bienNienSu: [],
    giaoKeo,
  };
}

// Đối số cho `createStory` của đường WIZARD (Thiết lập nâng cao).
export function payloadWizard({ ten, moTa, theLoaiId, tl, boiCanh, mode, nguoiChoiTen, nguoiChoiMoTa, nhanVats, giaoKeo }) {
  return {
    ten,
    moTa,
    theLoaiId,
    theLoaiTen: theLoaiHienThi(tl),
    boiCanh,
    mode,
    nguoiChoiTen: tenNguoiChoi(nguoiChoiTen),
    nguoiChoiMoTa,
    emoji: emojiTheLoai(tl),
    nhanVats,
    giaoKeo,
    mucTieuChuong1: "",
  };
}

// Đối số cho `createStory` của đường TẠO NHANH (từ bản nháp AI đã sửa tay).
export function payloadTaoNhanh({ q, tl, giaoKeo, nhanVats }) {
  return {
    ten: q.ten,
    moTa: q.moTa,
    theLoaiId: tl ? tl.id : "",
    theLoaiTen: theLoaiHienThi(tl),
    boiCanh: ghepBoiCanhVaLuat({ boiCanh: q.boiCanh, luat: q.luat }),
    mode: "chuong",
    nguoiChoiTen: tenNguoiChoi(q.nguoiChoiTen),
    nguoiChoiMoTa: q.nguoiChoiMoTa,
    emoji: emojiTheLoai(tl),
    nhanVats,
    giaoKeo,
    mucTieuChuong1: q.mucTieu,
  };
}
