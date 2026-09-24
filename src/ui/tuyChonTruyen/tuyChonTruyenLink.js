// Truyện Vai — Đợt 6c: khối LIÊN KẾT HỒ SƠ NGOẠI HÌNH CỦA NGƯỜI CHƠI (trong màn Tuỳ chọn truyện).
//
// Người chơi không nằm trong `nhanVats` nên không có editor nhân vật để liên kết; khối này là
// chỗ duy nhất. Cùng luật với nhân vật: đổi ô chọn chỉ đổi trên FORM, chỉ được ghi vào truyện
// khi bấm Lưu thành công (`tuyChonTruyenLuu.js` → `luuNhapNhay`).
//
// Quyết định nằm ở `tuyChonTruyenFlow.js`; câu chữ ở `tuyChonTruyenHtml.js`. Tệp này chỉ đọc
// DOM của form rồi nối hai thứ đó lại.

import { getNgoaiHinh, store } from "../../store.js";
import { demDungNgoaiHinh } from "../../ngoaiHinh.js";
import { htmlHoSoOptions, htmlNcChuaLienKet, htmlNcThongTin } from "./tuyChonTruyenHtml.js";
import { TEN_NGUOI_CHOI_MAC_DINH, chonConSong, demNguoiDung, lechTen } from "./tuyChonTruyenFlow.js";

function paintNcLink({ body, F, story }) {
  const sel = F("nguoiChoiNgoaiHinhId");
  const info = body.querySelector("[data-nc-link-info]");
  if (!sel || !info) return;
  const h = sel.value ? getNgoaiHinh(sel.value) : null;
  const tenNc = String(F("nguoiChoiTen").value || "").trim() || TEN_NGUOI_CHOI_MAC_DINH;
  if (!h) {
    info.innerHTML = htmlNcChuaLienKet({ tenNc });
    return;
  }
  const dung = demDungNgoaiHinh(store.stories, h.id);
  // Lựa chọn đang gõ CHƯA được lưu, nên nếu truyện này chưa trỏ tới hồ sơ thì phép đếm
  // chưa tính người chơi — cộng vào để con số không nói thiếu so với những gì sắp xảy ra.
  const sapDung = story.nguoiChoi.ngoaiHinhId !== h.id ? 1 : 0;
  info.innerHTML = htmlNcThongTin({
    h,
    tenNc,
    demHien: demNguoiDung(dung, sapDung),
    lech: lechTen(tenNc, h.tenChinh),
  });
}

// Dựng lại danh sách <option> từ thư viện HIỆN TẠI (hồ sơ có thể vừa được tạo/xoá ở màn thư
// viện) rồi vẽ lại phần tóm tắt. `muon` = giá trị muốn chọn (mặc định: giữ nguyên lựa chọn
// đang có trên form). Lựa chọn chỉ được GIỮ nếu hồ sơ đó còn tồn tại.
function lamMoiNcLink(ctx, muon) {
  const sel = ctx.F("nguoiChoiNgoaiHinhId");
  if (sel) {
    const dangChon = muon === undefined ? sel.value : String(muon || "");
    sel.innerHTML = htmlHoSoOptions();
    sel.value = chonConSong(dangChon, getNgoaiHinh(dangChon));
  }
  paintNcLink(ctx);
}

// Trả về hai thao tác cho `index.js`: `paint` (vẽ lại tóm tắt) và `lamMoi` (dựng lại cả danh
// sách) — `lamMoi` cũng là callback mà thư viện ngoại hình gọi khi đóng.
export function lapNcLink(ctx) {
  return {
    paint: () => paintNcLink(ctx),
    lamMoi: (muon) => lamMoiNcLink(ctx, muon),
  };
}
