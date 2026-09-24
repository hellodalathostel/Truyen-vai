// Truyện Vai — Giai đoạn 6: khu "Nhân vật trong khung hình" của màn tạo ảnh.
//
// Gồm: trạng thái chọn (nhận diện / thêm tay / bỏ chọn), vẽ khu chọn, khối ngoại hình cố
// định, hộp thoại "Chọn thêm", và việc dịch ngoại hình sang tiếng Anh (một lần mỗi hồ sơ).
// Mọi QUYẾT ĐỊNH nằm ở `taoAnhFlow.js`; ở đây chỉ còn trạng thái + DOM + gọi AI.
//
// Trạng thái dùng chung được truyền qua `S` (xem `index.js`) — không có biến rời nào ở
// phạm vi tệp, nên mở hai lần màn tạo ảnh không đụng nhau.
//
// `lapChon` chỉ là chỗ LẮP: nó gắn các hàm con lên `S` rồi gọi phần nối sự kiện. Thân của
// từng hàm con nằm ở phạm vi tệp (`damBaoNgoaiHinhEn`, `moChonThem`, `ganSuKienChon`) để
// không hàm nào phình quá 150 dòng.

import * as AI from "../../ai.js";
import { dsNgoaiHinh, getNgoaiHinh, luuBanDichNgoaiHinh } from "../../store.js";
import { tenHoSo, canDichNgoaiHinh, hoSoNguoiChoi, khoiNgoaiHinh } from "../../ngoaiHinh.js";
import { el, modal, toast, debounce } from "../../dom.js";
import {
  chonHoSo, nhanDienTrongKhung, hoSoHienChip, hoSoConLai, thaoTacChip,
} from "./taoAnhFlow.js";
import { htmlKhuChon, htmlKhoiNgoaiHinh, htmlChonThem } from "./taoAnhHtml.js";

export function lapChon(S, D) {
  // Hồ sơ sẽ được ghép vào prompt (đã trừ những cái người dùng bỏ chọn).
  S.dsChon = () =>
    chonHoSo({
      ungVien: S.ungVien,
      dsHoSo: dsNgoaiHinh(),
      tuDongIds: S.tuDongIds,
      themIds: S.themIds,
      boQuaIds: S.boQuaIds,
      hoSoMap: S.hoSoMap,
    });

  // Nhận diện lại từ chữ trong ô mô tả + ô yêu cầu thêm.
  S.nhanDienLai = () => {
    const kq = nhanDienTrongKhung({
      moTa: S.F("prompt") ? S.F("prompt").value : "",
      ghiChu: S.F("ghiChu") ? S.F("ghiChu").value : "",
      ungVien: S.ungVien,
      hoSoMap: S.hoSoMap,
      dsNhanVatCoMat: D.nvtsCoMat(S.story, S.conv),
      hoSoNguoiChoi: hoSoNguoiChoi(S.story, dsNgoaiHinh()),
    });
    S.tuDongIds = kq.tuDongIds;
    S.trungTen = kq.trungTen;
  };

  // Vẽ lại khu chọn. `trungTen` được hiện riêng để người dùng tự chọn đúng người.
  S.paintPick = () => {
    if (!S.pickEl) return;
    const hienThi = hoSoHienChip({
      ungVien: S.ungVien,
      tuDongIds: S.tuDongIds,
      themIds: S.themIds,
      boQuaIds: S.boQuaIds,
      hoSoMap: S.hoSoMap,
      trungTen: S.trungTen,
    });
    const chon = new Set(S.dsChon().map((h) => h.id));
    const cuaNguoiChoi = new Set(S.ungVien.filter((u) => u.laNguoiChoi).map((u) => u.hoSoId));
    S.pickEl.innerHTML = htmlKhuChon({ dsHienThi: hienThi, hoSoMap: S.hoSoMap, chon, cuaNguoiChoi, trungTen: S.trungTen });
  };

  // Khối ngoại hình cố định: chỉ đọc, KHÔNG bao giờ ghi vào ô mô tả. Ô mô tả chỉ nhận chữ do
  // người dùng (hoặc AI) viết, nên yêu cầu thêm ở cuối ô không bị nuốt mất mỗi lần đổi chip.
  S.veKhoiNgoaiHinh = () => {
    const box = S.body.querySelector("[data-nh-khoi]");
    if (!box) return;
    const ds = S.dsChon();
    const khoi = khoiNgoaiHinh(ds);
    if (!khoi) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    const thieuTen = ds.filter((h) => S.thieuDich.has(h.id)).map(tenHoSo);
    box.innerHTML = htmlKhoiNgoaiHinh({ khoi, thieuTen, mayVe: AI.LUAT_NGON_NGU.mayVe });
  };

  S.damBaoNgoaiHinhEn = (thuLai) => damBaoNgoaiHinhEn(S, thuLai);

  S.capNhatKhoiNgoaiHinh = () => {
    S.veKhoiNgoaiHinh();
    // Hồ sơ còn chữ tiếng Việt ⇒ dịch nền (một lần cho mỗi hồ sơ). Không chờ: người dùng vẫn
    // thấy khối ngay, khối tự đổi sang tiếng Anh khi bản dịch xong.
    if (S.dsChon().some((h) => canDichNgoaiHinh(h) && !S.daThuDich.has(h.id))) S.damBaoNgoaiHinhEn(false);
  };

  ganSuKienChon(S);
}

// Prompt tạo ảnh là tiếng Anh, còn mô tả ngoại hình người dùng gõ bằng tiếng Việt. Bản dịch
// được sinh MỘT LẦN cho mỗi hồ sơ rồi lưu vào chính hồ sơ đó — dùng lại cho mọi khung hình
// (ngoại hình "cố định" phải giống nhau giữa các lần dựng ảnh, không thể tả lại mỗi lần).
// Hỏng thì thôi: prompt vẫn chạy với chữ gốc, chỉ là chưa được tiếng Anh.
async function damBaoNgoaiHinhEn(S, thuLai) {
  if (S.dangDich) return false;
  if (thuLai) {
    S.daThuDich.clear();
    S.dichHong.clear();
  }
  const can = S.dsChon().filter((h) => canDichNgoaiHinh(h) && !S.daThuDich.has(h.id));
  if (!can.length) return false;
  S.dangDich = true;
  for (const h of can) S.daThuDich.add(h.id);
  try {
    const kq = await AI.dichNgoaiHinh(can.map((h) => ({ id: h.id, moTa: h.moTa, tranh: h.tranh })));
    let coMoi = false;
    for (const r of kq) {
      if (!r || !r.id) continue;
      const h = getNgoaiHinh(r.id);
      if (!h) continue;
      // Chỉ điền vào chỗ còn trống: hồ sơ có thể vừa được sửa ở tab khác.
      if (r.moTaEn && !String(h.moTaEn || "").trim()) h.moTaEn = r.moTaEn;
      if (r.tranhEn && !String(h.tranhEn || "").trim()) h.tranhEn = r.tranhEn;
      if (h.moTaEn || h.tranhEn) {
        coMoi = true;
        if (!(await luuBanDichNgoaiHinh(h))) S.dichHong.add(h.id);
      }
    }
    for (const h of can) {
      const ht = getNgoaiHinh(h.id) || h;
      if (canDichNgoaiHinh(ht) || S.dichHong.has(h.id)) S.thieuDich.add(h.id);
      else S.thieuDich.delete(h.id);
    }
    S.veKhoiNgoaiHinh();
    return coMoi;
  } catch (e) {
    console.error("[Truyện Vai] không dịch được ngoại hình:", e);
    for (const h of can) S.thieuDich.add(h.id);
    S.veKhoiNgoaiHinh();
    return false;
  } finally {
    S.dangDich = false;
  }
}

function moChonThem(S) {
  const ds = hoSoConLai({
    dsHoSo: dsNgoaiHinh(),
    ungVien: S.ungVien,
    tuDongIds: S.tuDongIds,
    themIds: S.themIds,
    boQuaIds: S.boQuaIds,
  });
  if (!ds.length) {
    toast("Mọi hồ sơ trong thư viện đã nằm trong danh sách chọn.");
    return;
  }
  const b = el("div", { class: "nh-chon-them" });
  b.innerHTML = htmlChonThem(ds);
  modal({ title: "Chọn thêm hồ sơ ngoại hình", body: b, actions: [{ label: "Xong", primary: true, onClick: (mm) => mm.close() }] });
  b.addEventListener("click", (e) => {
    const t2 = e.target.closest("[data-nh-add]");
    if (!t2) return;
    S.themIds.add(t2.dataset.nhAdd);
    S.boQuaIds.delete(t2.dataset.nhAdd);
    t2.remove();
    S.paintPick();
    S.capNhatKhoiNgoaiHinh();
    S.setStatus("Sẽ ghép ngoại hình của: " + S.dsChon().map(tenHoSo).join(", ") + ".");
  });
}

function ganSuKienChon(S) {
  if (S.pickEl) {
    S.pickEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-nh-them]")) {
        moChonThem(S);
        return;
      }
      const t2 = e.target.closest("[data-nh-chip]");
      if (!t2) return;
      const id = t2.dataset.nhChip;
      const tt = thaoTacChip({ id, dangChon: S.dsChon().some((h) => h.id === id), laTuDong: S.tuDongIds.has(id) });
      if (tt.boQua) {
        S.boQuaIds.add(id);
        S.themIds.delete(id);
      } else {
        S.boQuaIds.delete(id);
        if (tt.themTay) S.themIds.add(id);
      }
      S.nhanDienLai();
      S.paintPick();
      S.capNhatKhoiNgoaiHinh();
      const ds = S.dsChon();
      S.setStatus(ds.length ? "Sẽ ghép ngoại hình của: " + ds.map(tenHoSo).join(", ") + "." : "Không ghép hồ sơ ngoại hình nào vào khung hình này.");
    });
  }

  // Gõ tay tên nhân vật vào ô mô tả ⇒ chip cập nhật NGAY, và khối ngoại hình của những người
  // vừa được nhận diện cũng được ghép vào (nếu khối đang khác). Không có bước này thì người
  // dùng gõ tên mà ngoại hình không bao giờ được áp — trái với mục tiêu.
  const nhanLai = debounce(() => {
    S.nhanDienLai();
    S.paintPick();
    S.capNhatKhoiNgoaiHinh();
  }, 250);
  ["prompt", "ghiChu"].forEach((f) => {
    const e2 = S.F(f);
    if (e2) e2.addEventListener("input", nhanLai);
  });
}
