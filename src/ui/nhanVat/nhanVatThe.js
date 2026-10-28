// Truyện Vai — Giai đoạn 9 · Đợt 1: phần "thẻ nhân vật" của màn Sửa nhân vật.
//
// Hai nút: NHẬP thẻ (JSON của SillyTavern/chub.ai, hoặc PNG có nhúng thẻ) và XUẤT thẻ (v2).
// Tất cả chỉ sửa BẢN NHÁP `S.nhap` — nhân vật trong truyện chỉ đổi khi bấm Lưu, nên nhập nhầm
// thẻ vẫn Huỷ được.
//
// Ảnh đại diện: ảnh trong thẻ PNG chính là ảnh nhân vật, nên nhập thẻ là có luôn ảnh. Khi
// xuất, ảnh đại diện (JPEG/PNG) được vẽ lại thành PNG rồi nhúng thẻ vào — đúng cách các công
// cụ khác phân phối "thẻ nhân vật".

import { toast } from "../../dom.js";
import { laNguoiLon, laDataUrlAnh, tuoiSo } from "../../store.js";
import { laPng, docTheNguon, nhanVatTuThe, theTuNhanVat, pngNhungThe, tenTepThe, base64SangBytes } from "../../theNhanVat.js";
import { tenTrongForm, khoaNguoiLonTheoTuoi } from "./nhanVatForm.js";
import { docForm } from "./nhanVatLuu.js";

// Điền TOÀN BỘ form từ bản nháp. Dùng cả lúc mở màn lẫn sau khi nhập thẻ.
export function dienForm(S) {
  const F = S.F;
  const nv = S.nhap;
  F("ten").value = tenTrongForm(nv);
  const truong = ["vaiTro", "moTa", "tinhCach", "cachNoi", "ghiChu", "tuoi", "bietDanh",
    "vaiBdsm", "danhXung", "kinhNghiem", "phongCach", "khauVi", "gioiHan", "gioiHanCung",
    "luatRieng", "chamSocSau", "tinHieuRieng"];
  for (const k of truong) if (F(k)) F(k).value = nv[k] || "";
  if (F("nguoiLon")) F("nguoiLon").checked = laNguoiLon(nv);
  if (F("tuoi")) {
    const kq = khoaNguoiLonTheoTuoi(tuoiSo(nv));
    if (F("nguoiLon")) {
      if (kq.boTich) F("nguoiLon").checked = false;
      F("nguoiLon").disabled = kq.tre;
      F("nguoiLon").title = kq.title;
    }
  }
  if (S.paintAvatar) S.paintAvatar();
  if (S.lamMoiLienKet) S.lamMoiLienKet();
  S.D.paintNvThich(S.body);
}

export function lapThe(S) {
  S.suKienThe = async (e, actName) => {
    if (actName === "the-nhap") {
      chonTepThe(S);
      return true;
    }
    if (actName === "the-xuat") {
      await xuatThe(S);
      return true;
    }
    return false;
  };
}

// Chỉ giữ những thứ thuộc về "chỗ đứng" của nhân vật trong truyện này; phần nội dung lấy
// HOÀN TOÀN từ thẻ (không để sót chữ của nhân vật cũ trong các ô trống của thẻ mới).
function gocChoThe(S) {
  const nv = S.nhap;
  return {
    id: nv.id,
    emoji: nv.emoji,
    mau: nv.mau,
    anh: nv.anh,
    avatarStyle: nv.avatarStyle,
    ngoaiHinhId: nv.ngoaiHinhId,
    bietDanh: nv.bietDanh,
    soThich: [],
  };
}

function docTep(f) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(new Uint8Array(fr.result));
    fr.onerror = () => rej(new Error("Không đọc được tệp."));
    fr.readAsArrayBuffer(f);
  });
}

async function anhTuTep(S, bytes, tenTep) {
  try {
    const f = new File([bytes], tenTep || "the.png", { type: "image/png" });
    return await S.D.thuNhoAnh(f, 256);
  } catch (e) {
    return "";
  }
}

function chonTepThe(S) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".json,.png,application/json,image/png";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    let the;
    let bytes = null;
    try {
      bytes = await docTep(f);
      the = docTheNguon(bytes);
    } catch (err) {
      toast((err && err.message) || "Không đọc được thẻ.", "error");
      return;
    }
    const moi = nhanVatTuThe(the, gocChoThe(S));
    // Luật tuổi của app vẫn là cửa cuối: cờ 18+ trong thẻ không được đi vòng qua nó.
    moi.nguoiLon = laNguoiLon(moi);
    if (laPng(bytes)) {
      const anh = await anhTuTep(S, bytes, f.name);
      if (anh) {
        moi.anh = anh;
        moi.avatarStyle = "anh";
      }
    }
    S.nhap = moi;
    dienForm(S);
    const coThem = [];
    if (the.data.character_book) coThem.push("sổ tri thức");
    if ((the.data.alternate_greetings || []).length) coThem.push("lời chào khác");
    if (the.data.first_mes) coThem.push("lời mở đầu");
    toast("Đã nhập thẻ “" + (moi.ten || "(không tên)") + "”. Bấm Lưu để thêm vào truyện." +
      (coThem.length ? " Thẻ còn có " + coThem.join(", ") + " — vẫn được giữ nguyên trong thẻ gốc." : ""));
  };
  inp.click();
}

function pngTuAnh(dataUrl, max) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round((img.width || 1) * scale));
        cv.height = Math.max(1, Math.round((img.height || 1) * scale));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL("image/png");
        res(base64SangBytes(url.slice(url.indexOf(",") + 1)));
      } catch (e) {
        rej(e);
      }
    };
    img.onerror = () => rej(new Error("Không đọc được ảnh đại diện."));
    img.src = dataUrl;
  });
}

async function xuatThe(S) {
  // Đọc form vào bản nháp TRƯỚC khi xuất: người dùng sửa tên/mô tả/tuổi rồi bấm Xuất ngay
  // (chưa Lưu) thì thẻ ra vẫn là nội dung mới — cùng luật tuổi/cờ 18+ như lúc Lưu.
  docForm(S);
  const the = theTuNhanVat(S.nhap);
  // Có ảnh đại diện ⇒ xuất PNG kèm thẻ (cách các công cụ khác phân phối). Không có ảnh, hoặc
  // trình duyệt không vẽ được ảnh ⇒ lùi về JSON, không làm hỏng thao tác xuất.
  if (laDataUrlAnh(S.nhap.anh)) {
    try {
      const png = await pngTuAnh(laDataUrlAnh(S.nhap.anh), 512);
      const ra = pngNhungThe(png, the);
      S.D.taiXuong(tenTepThe(S.nhap, "png"), new Blob([ra], { type: "image/png" }));
      toast("Đã xuất thẻ kèm ảnh đại diện (.png).");
      return;
    } catch (e) {
      console.warn("[Truyện Vai] xuất thẻ PNG hỏng, lùi về JSON:", e);
    }
  }
  S.D.taiXuong(tenTepThe(S.nhap), new Blob([JSON.stringify(the, null, 2)], { type: "application/json;charset=utf-8" }));
  toast("Đã xuất thẻ nhân vật (.json).");
}
