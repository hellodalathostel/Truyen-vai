// Truyện Vai — Giai đoạn 6: hai nút sinh nội dung của màn tạo ảnh ("Viết lại" và "Dựng khung
// hình"), cùng cổng chặn người lớn. Mọi quyết định (cổng nào chặn, prompt ghép ra sao, nén
// cỡ nào) nằm ở `taoAnhFlow.js`; ở đây chỉ còn thứ tự gọi, trạng thái nút và giao diện.

import * as AI from "../../ai.js";
import { getMessages } from "../../store.js";
import { tachNgoaiHinh, canDichNgoaiHinh, tenHoSo } from "../../ngoaiHinh.js";
import { toast } from "../../dom.js";
import {
  nvChuaXacNhanChoTaoAnh, loiChanTaoAnh, promptGuiMayVe, loaiTruGuiMayVe, xuLyKetQuaMayVe,
} from "./taoAnhFlow.js";

export function lapDung(S, D) {
  // Cổng người lớn cho ảnh: đọc trạng thái SỐNG mỗi lần gọi.
  S.nvChuaXacNhan = () => nvChuaXacNhanChoTaoAnh(S.story, D.nvtsCoMat(S.story, S.conv));

  S.chanViChuaXacNhan = () => {
    const ds = S.nvChuaXacNhan();
    if (!ds.length) return false;
    const loi = loiChanTaoAnh(ds);
    S.setStatus(loi.trangThai);
    toast(loi.toast);
    return true;
  };

  S.vietLai = async () => {
    if (S.busy) return;
    // "Viết lại mô tả" cũng là một bước của việc tạo ảnh: cùng một cổng chặn.
    if (S.chanViChuaXacNhan()) return;
    S.setBusy(true);
    S.setStatus("Đang đọc hội thoại và viết mô tả…");
    try {
      const out = await AI.vietPromptAnh({
        story: S.story,
        conv: S.conv,
        messages: getMessages(S.conv.id),
        tinNhan: S.opts.tinNhan || "",
        ghiChu: S.F("ghiChu") ? S.F("ghiChu").value.trim() : "",
        ngoaiHinh: S.dsChon(),
      });
      // Ô nhập chỉ nhận MÔ TẢ CẢNH của AI; khối ngoại hình cố định nằm ở khung chỉ-đọc
      // bên dưới và chỉ được ghép vào prompt lúc dựng ảnh. Nhờ vậy viết lại mô tả không
      // nuốt mất chữ người dùng đã thêm.
      if (out.prompt) S.dat("prompt", tachNgoaiHinh(out.prompt));
      if (out.loaiTru) S.dat("loaiTru", out.loaiTru);
      if (out.chuThich) S.chuThich = out.chuThich;
      S.nhanDienLai();
      S.paintPick();
      S.capNhatKhoiNgoaiHinh();
      const dsHien = S.dsChon();
      S.setStatus(
        (out.chuThich ? "Khung hình: " + out.chuThich + " " : "Đã có mô tả — sửa lại tuỳ ý rồi bấm “Dựng khung hình”. ") +
          (dsHien.length ? "Đã ghép ngoại hình: " + dsHien.map(tenHoSo).join(", ") + "." : "")
      );
    } catch (e) {
      S.setStatus("Lỗi: " + (e.message || e));
    }
    S.setBusy(false);
  };

  S.dungAnh = async () => {
    if (S.busy) return;
    // Cổng người lớn của ảnh: CHẶN hẳn khi truyện đang ở chế độ người lớn mà trong khung
    // có nhân vật chưa thoả `laNguoiLon()` — không dựng ảnh, không "hạ" về khung an toàn.
    if (S.chanViChuaXacNhan()) return;
    // Khối ngoại hình phải là TIẾNG ANH cho khớp với mô tả khung hình: chờ nốt bản dịch nếu
    // hồ sơ còn chữ tiếng Việt (một lượt gọi, kết quả được lưu lại và dùng cho mọi lần sau).
    if (S.dsChon().some(canDichNgoaiHinh)) {
      S.setStatus("Đang dịch ngoại hình sang tiếng Anh…");
      await S.damBaoNgoaiHinhEn(true);
    }
    const chuaDich = S.dsChon().filter(canDichNgoaiHinh);
    if (chuaDich.length) console.warn("[Truyện Vai] chưa dịch được ngoại hình:", chuaDich.map((h) => h.id));
    const dsHoSo = S.dsChon();
    // Ghép prompt NGAY TRƯỚC KHI DỰNG: lấy đúng chữ trong ô mô tả (kể cả phần người dùng vừa
    // viết thêm ở cuối) rồi nối khối ngoại hình của những hồ sơ đang chọn vào cuối. KHÔNG ghi
    // ngược prompt đã ghép vào ô — prompt đã ghép là dữ liệu DẪN XUẤT, chỉ đi theo lệnh gửi
    // máy vẽ và bản ghi ảnh.
    const moTa = S.F("prompt") ? S.F("prompt").value : "";
    const pc = S.F("phongCach") ? S.F("phongCach").value : "";
    const kt = S.F("kichThuoc") ? S.F("kichThuoc").value : "768x512";
    const ltGoc = S.F("loaiTru") ? S.F("loaiTru").value.trim() : "";
    // "Điều cần tránh" của hồ sơ ngoại hình được GỘP vào prompt loại trừ ngay tại đây —
    // deterministic, không phụ thuộc việc model có nhắc lại trong mô tả hay không.
    const lt = loaiTruGuiMayVe(ltGoc, dsHoSo);
    const pr = promptGuiMayVe({ moTa, dsHoSo, phongCach: pc, dsPhongCach: D.dsPhongCach() });
    if (!pr.gui) {
      S.setStatus("Chưa có mô tả. Bấm “Viết lại mô tả”, hoặc tự viết một mô tả tiếng Anh.");
      return;
    }
    S.promptDaDung = pr.nen;
    const c = D.anhChon();
    c.phongCach = pc;
    c.kichThuoc = kt;
    D.luuAnhChon();
    S.setBusy(true);
    S.setStatus(
      "Đang dựng khung hình… mất vài giây, đừng đóng bảng này." +
        (dsHoSo.length ? " Đang áp dụng ngoại hình: " + dsHoSo.map(tenHoSo).join(", ") + "." : "") +
        (chuaDich.length
          ? " Chưa dịch được sang " + AI.LUAT_NGON_NGU.mayVe + ": " + chuaDich.map(tenHoSo).join(", ") + " — phần đó vẫn dùng chữ gốc."
          : "")
    );
    if (S.previewEl) S.previewEl.innerHTML = D.anhLoading("lg");
    try {
      const raw = await AI.taoAnh({ prompt: pr.gui, loaiTru: lt, kichThuoc: kt });
      S.url = await xuLyKetQuaMayVe(raw, kt, D.nenAnhDataUrl);
      S.paintPreview(S.url);
      S.setStatus("Xong. “Đưa vào hội thoại” để chèn vào mạch truyện, hoặc “Dựng lại” nếu chưa vừa ý.");
    } catch (e) {
      S.paintPreview("");
      S.setStatus("Lỗi: " + (e.message || e));
    }
    S.setBusy(false);
  };
}
