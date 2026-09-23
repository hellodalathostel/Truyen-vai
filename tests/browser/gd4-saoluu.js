// Bộ kiểm thử: GIAI ĐOẠN 4 — SAO LƯU: CẢNH BÁO ĐỔI TÊN, TRẠNG THÁI, LỜI NHẮC.
//
// Vì sao cần: đây là lưới an toàn chống MẤT DỮ LIỆU (dữ liệu nằm theo origin của trang, nên
// đổi tên generator / fork là mất đường tới dữ liệu cũ). Ba thứ phải đúng CÙNG LÚC:
//   • mặt tiền (Cài đặt + chân thư viện) luôn nói được "bạn đang giữ dữ liệu chưa sao lưu".
//   • nút xuất bản sao lưu thật sự tải file VÀ đóng dấu mốc "đã xuất".
//   • lời nhắc chỉ hiện khi dữ liệu THẬT SỰ đổi sau lần xuất gần nhất và đã quá N ngày,
//     tối đa một lần mỗi ngày, và "để sau" hoãn đúng một ngày.
//
// Bộ này ghi vào `localStorage["truyenVai.caiDat"]` (mốc sao lưu nằm ở đó) nên CHỤP LẠI chuỗi
// ban đầu và TRẢ NGUYÊN cả bản lưu lẫn bản trong RAM ở cuối — chủ dự án không được thấy đổi.
const S = await import("/src/store.js");
const T = window.__tv_test;
const G = 24 * 60 * 60 * 1000;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const ca = [];
const chk = (ten, ok, ct) => ca.push({ ten, ok: !!ok, ct: ct === undefined || ct === null ? "" : String(ct).slice(0, 200) });
const doi = async (fn, n) => {
  for (let i = 0; i < (n || 80); i++) {
    let v = null;
    try { v = await fn(); } catch (e) { v = null; }
    if (v) return v;
    await cho(50);
  }
  return null;
};
const hopCuoi = () => { const ds = document.querySelectorAll("#modalRoot .modal-backdrop"); return ds.length ? ds[ds.length - 1] : null; };
const dongHet = () => { try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {} };
const toastEl = () => document.querySelector("#toastRoot .toast");
const bamToast = (chu) => { const t = toastEl(); if (!t) return false; const b = [...t.querySelectorAll("[data-toast-act]")].find((x) => (x.textContent || "").indexOf(chu) >= 0); if (!b) return false; b.click(); return true; };

const CAI_DAT_GOC = localStorage.getItem("truyenVai.caiDat");
const moc = () => S.store.settings.saoLuu || {};
// Đặt lại toàn bộ mốc sao lưu (không cần API mới: chỉ gán vào settings rồi lưu).
const datMoc = (o) => {
  const now = Date.now();
  S.store.settings.saoLuu = Object.assign({ batDauLuc: now - 30 * G, xuatLuc: 0, daDoiLuc: 0, hoanLuc: 0, nhacLuc: 0 }, o);
  S.saveSettings();
};

// Bắt file "tải về" (chỉ trong bộ nhớ; không ghi đĩa).
let batBlob = null, batTen = null;
const gocCreate = URL.createObjectURL.bind(URL);
const gocClick = HTMLAnchorElement.prototype.click;
URL.createObjectURL = (b) => { if (b instanceof Blob) batBlob = b; return gocCreate(new Blob([""])); };
HTMLAnchorElement.prototype.click = function () { if (this.download) { batTen = this.download; return; } return gocClick.apply(this, arguments); };

// Điều hướng về thư viện ĐÚNG cách app làm (không phụ thuộc hash mà bộ trước để lại).
const veThuVien = async () => {
  dongHet();
  T.app.storyId = null; T.app.convId = null; T.app.screen = "home";
  T.render();
  return await doi(() => document.querySelector(".lib-foot"), 60);
};
// Mở Cài đặt từ thư viện; trả về phần thân hộp thoại khi mục sao lưu đã dựng xong.
const moCaiDat = async () => {
  dongHet();
  const b = await doi(() => document.querySelector('[data-act="open-settings"]'), 60);
  if (b) b.click();
  return await doi(() => document.querySelector(".set-sao-luu"), 60);
};
const docTrangThai = async (o) => {
  datMoc(o);
  await moCaiDat();
  const el = document.querySelector("[data-sao-luu-trang-thai]");
  return el ? el.textContent : "";
};

// ---------------------------------------------------------------- thông số từ main.pjs
chk("CauHinh() của main.pjs có soNgayNhacSaoLuu", "soNgayNhacSaoLuu" in S.CFG, JSON.stringify(S.CFG.soNgayNhacSaoLuu));
// Ngưỡng thật sự đang dùng = 7 ngày: 7 ngày thì nhắc, 6 ngày thì chưa. Kiểm bằng HÀNH VI chứ
// không bằng cách đọc số, vì `CauHinh()` của perchance trả về giá trị dạng danh sách.
const mocThu = (ngay) => ({ batDauLuc: 1, xuatLuc: Date.now() - ngay * G, daDoiLuc: Date.now() - G, hoanLuc: 0, nhacLuc: 0 });
chk("ngưỡng nhắc đang dùng là 7 ngày (7 ngày ⇒ nhắc)", T.nenNhacSaoLuu(mocThu(7), Date.now(), S.CFG.soNgayNhacSaoLuu).nhac === true);
chk("ngưỡng nhắc đang dùng là 7 ngày (6 ngày ⇒ chưa nhắc)", T.nenNhacSaoLuu(mocThu(6), Date.now(), S.CFG.soNgayNhacSaoLuu).nhac === false);

// ---------------------------------------------------------------- mặt tiền: chân thư viện
const coThuVien = await veThuVien();
chk("về được màn thư viện", !!coThuVien);
const chanThu = document.querySelector(".lib-foot .canh-bao-sao-luu");
chk("chân thư viện có cảnh báo đổi tên generator", !!chanThu);
chk("cảnh báo nói rõ vì sao (dữ liệu theo địa chỉ trang)", !!chanThu && chanThu.textContent.indexOf("địa chỉ") >= 0, chanThu ? chanThu.textContent.slice(0, 90) : "");
chk("cảnh báo nói rõ hậu quả (không thấy dữ liệu cũ)", !!chanThu && chanThu.textContent.indexOf("không thấy") >= 0);
chk("cảnh báo chỉ đúng việc cần làm trước (xuất bản sao lưu)", !!chanThu && chanThu.textContent.indexOf("Xuất bản sao lưu") >= 0);

// ---------------------------------------------------------------- mặt tiền: Cài đặt
datMoc({ daDoiLuc: 0 });
const coMuc = await moCaiDat();
chk("Cài đặt có mục Sao lưu & an toàn dữ liệu", !!coMuc);
chk("Cài đặt cũng có cảnh báo đổi tên", !!document.querySelector(".set-sao-luu .canh-bao-sao-luu"));
const elTT = document.querySelector("[data-sao-luu-trang-thai]");
// Dòng dung lượng được điền BẤT ĐỒNG BỘ (đọc `navigator.storage.estimate()`), nên phải chờ.
const elDL = await doi(() => {
  const e = document.querySelector("[data-dung-luong-cd]");
  return e && (e.textContent.indexOf("Bộ nhớ") >= 0 || e.textContent.indexOf("Không đọc được") >= 0) ? e : null;
}, 60);
chk("có dòng trạng thái sao lưu", !!elTT && elTT.textContent.length > 10, elTT ? elTT.textContent.slice(0, 90) : "(không có)");
chk("có dòng dung lượng trình duyệt", !!elDL, elDL ? elDL.textContent.slice(0, 70) : "(không có)");
chk("có nút Xuất bản sao lưu", !!document.querySelector('[data-s-act="sao-luu"]'));
chk("có nút Bảng gỡ lỗi", !!document.querySelector('[data-s-act="go-loi"]'));
chk("có nút Tự kiểm tra dữ liệu", !!document.querySelector('[data-s-act="tu-kiem-tra"]'));
chk("trạng thái: chưa đổi gì thì nói rõ chưa có gì để sao lưu", !!elTT && elTT.textContent.indexOf("Chưa có dữ liệu nào thay đổi") >= 0, elTT ? elTT.textContent : "");

// ---------------------------------------------------------------- trạng thái theo từng tình huống
const ttChuaXuat = await docTrangThai({ daDoiLuc: Date.now() - 2 * G });
chk("trạng thái: đã đổi mà chưa từng xuất", ttChuaXuat.indexOf("chưa từng xuất") >= 0, ttChuaXuat);
const ttDaXuat = await docTrangThai({ xuatLuc: Date.now() - G, daDoiLuc: Date.now() - 2 * G });
chk("trạng thái: bản sao lưu đã bao gồm mọi thay đổi", ttDaXuat.indexOf("đã bao gồm mọi thay đổi") >= 0, ttDaXuat);
const ttDoiSau = await docTrangThai({ xuatLuc: Date.now() - 3 * G, daDoiLuc: Date.now() - 2 * G });
chk("trạng thái: đã đổi SAU lần xuất", ttDoiSau.indexOf("đã thay đổi sau lần xuất gần nhất") >= 0, ttDoiSau);
const ttDenHan = await docTrangThai({ xuatLuc: Date.now() - 8 * G, daDoiLuc: Date.now() - 2 * G });
chk("trạng thái: nói rõ đã đến hạn nhắc", ttDenHan.indexOf("đến hạn nhắc sao lưu") >= 0, ttDenHan);
const ttHoan = await docTrangThai({ xuatLuc: Date.now() - 8 * G, daDoiLuc: Date.now() - 2 * G, hoanLuc: Date.now() - 1000 });
chk("trạng thái: nói rõ đang được hoãn", ttHoan.indexOf("để sau") >= 0, ttHoan);

// ---------------------------------------------------------------- nút xuất bản sao lưu (trong Cài đặt)
datMoc({ xuatLuc: 0, daDoiLuc: 0 });
await moCaiDat();
const nutSaoLuu = await doi(() => document.querySelector('[data-s-act="sao-luu"]'), 40);
chk("bấm được nút Xuất bản sao lưu trong Cài đặt", !!nutSaoLuu);
batBlob = null; batTen = null;
if (nutSaoLuu) {
  nutSaoLuu.click();
  for (let i = 0; i < 80; i++) {
    await cho(100);
    const h = hopCuoi();
    const b = h ? [...h.querySelectorAll(".modal-foot button")].find((x) => (x.textContent || "").indexOf("Vẫn xuất") >= 0) : null;
    if (b) { b.click(); continue; }
    if (batBlob) break;
  }
  await cho(400);
}
chk("bấm Xuất bản sao lưu ⇒ có file tải về", !!batBlob && !!batTen, String(batTen));
chk("tên file nói rõ là bản sao lưu toàn bộ", String(batTen).indexOf("toan-bo") >= 0, String(batTen));
chk("nội dung file có đủ phần dữ liệu", !!batBlob && String(await batBlob.text()).indexOf("truyen-vai-all") >= 0);
chk("xuất xong ⇒ đóng dấu mốc 'đã xuất'", Number(moc().xuatLuc) > 0, JSON.stringify(moc().xuatLuc));
chk("mốc 'đã xuất' không cũ hơn lúc bắt đầu bộ này", Number(moc().xuatLuc) >= Date.now() - 120000, String(moc().xuatLuc));
// Trạng thái sau khi xuất: mở lại Cài đặt thì phải là "đã bao gồm mọi thay đổi".
const ttSau = await docTrangThai({ xuatLuc: Number(moc().xuatLuc), daDoiLuc: Date.now() - G });
chk("sau khi xuất, trạng thái nói bản sao lưu đã bao gồm thay đổi", ttSau.indexOf("đã bao gồm mọi thay đổi") >= 0, ttSau);

// ---------------------------------------------------------------- lời nhắc khi mở app
dongHet();
const nhac = async () => {
  const truoc = toastEl();
  const qd = T.nhacSaoLuuKhiMo();
  const to = await doi(() => { const t = toastEl(); return t && t !== truoc ? t : null; }, 60);
  return { qd, to };
};
datMoc({ xuatLuc: Date.now() - 8 * G, daDoiLuc: Date.now() - 2 * G });
const lan1 = await nhac();
chk("đến hạn ⇒ nhắc khi mở app", !!lan1.qd && lan1.qd.nhac === true, JSON.stringify(lan1.qd));
const nutTo = lan1.to ? [...lan1.to.querySelectorAll("[data-toast-act]")].map((x) => x.textContent.trim()) : [];
chk("lời nhắc có đúng hai lựa chọn", nutTo.length === 2 && nutTo[0].indexOf("Xuất") >= 0 && nutTo[1].indexOf("Để sau") >= 0, nutTo.join(" | "));
chk("lời nhắc nói rõ số ngày kể từ lần xuất", !!lan1.to && lan1.to.textContent.indexOf("8 ngày") >= 0, lan1.to ? lan1.to.textContent.trim().slice(0, 90) : "");
chk("lời nhắc nói rõ dữ liệu chỉ nằm trong trình duyệt", !!lan1.to && lan1.to.textContent.indexOf("trình duyệt này") >= 0);
chk("nhắc xong ⇒ ghi mốc 'đã nhắc'", Number(moc().nhacLuc) > 0);
// Nhắc lại ngay trong cùng ngày: KHÔNG được làm phiền.
const lan2 = await nhac();
chk("gọi lại trong cùng ngày ⇒ không nhắc nữa", !!lan2.qd && lan2.qd.nhac === false && lan2.qd.ly === "vua-nhac", JSON.stringify(lan2.qd));
chk("gọi lại trong cùng ngày ⇒ không có toast mới", lan2.to === null);
// "Để sau" hoãn một ngày.
datMoc({ xuatLuc: Date.now() - 8 * G, daDoiLuc: Date.now() - 2 * G });
await nhac();
const daBamHoan = await (async () => { for (let i = 0; i < 40; i++) { if (bamToast("Để sau")) return true; await cho(100); } return false; })();
chk("bấm được 'Để sau'", daBamHoan);
chk("bấm 'Để sau' ⇒ ghi mốc hoãn", Number(moc().hoanLuc) > 0, JSON.stringify(moc().hoanLuc));
const ngayHoan = await (async () => { for (let i = 0; i < 20; i++) { const t = toastEl(); if (t && t.textContent.indexOf("Đã hoãn") >= 0) return t.textContent.trim(); await cho(100); } return null; })();
chk("có phản hồi rõ ràng khi bấm 'Để sau'", !!ngayHoan && ngayHoan.indexOf("một ngày") >= 0, String(ngayHoan));
const lan4 = await nhac();
chk("đang hoãn ⇒ không nhắc lại", !!lan4.qd && lan4.qd.nhac === false && lan4.qd.ly === "dang-hoan", JSON.stringify(lan4.qd));
chk("đang hoãn ⇒ không có toast", lan4.to === null);
// Hết một ngày hoãn thì nhắc lại được.
S.store.settings.saoLuu.hoanLuc = Date.now() - G - 1000;
S.store.settings.saoLuu.nhacLuc = Date.now() - G - 1000;
S.saveSettings();
const lan5 = await nhac();
chk("hết hạn hoãn ⇒ nhắc lại", !!lan5.qd && lan5.qd.nhac === true, JSON.stringify(lan5.qd));
dongHet();

// ---------------------------------------------------------------- dữ liệu chưa đổi thì không nhắc
datMoc({ xuatLuc: Date.now() - G, daDoiLuc: Date.now() - 2 * G });
const ko1 = await nhac();
chk("bản sao lưu đã mới hơn thay đổi ⇒ không nhắc", !!ko1.qd && ko1.qd.nhac === false && ko1.qd.ly === "da-xuat-sau-khi-doi", JSON.stringify(ko1.qd));
chk("không nhắc ⇒ không có toast", ko1.to === null);
datMoc({ xuatLuc: Date.now() - 2 * G, daDoiLuc: Date.now() - G });
const ko2 = await nhac();
chk("mới đổi 1 ngày (< 7) ⇒ chưa nhắc", !!ko2.qd && ko2.qd.nhac === false && ko2.qd.ly === "chua-du-ngay", JSON.stringify(ko2.qd));
datMoc({ xuatLuc: 0, daDoiLuc: 0 });
chk("chưa từng đổi ⇒ không nhắc", T.nhacSaoLuuKhiMo().nhac === false);
dongHet();

// ---------------------------------------------------------------- trả cài đặt THẬT về nguyên trạng
if (CAI_DAT_GOC === null) localStorage.removeItem("truyenVai.caiDat");
else localStorage.setItem("truyenVai.caiDat", CAI_DAT_GOC);
chk("cài đặt trong máy được trả nguyên trạng (bản lưu)", localStorage.getItem("truyenVai.caiDat") === CAI_DAT_GOC);
// Cả bản TRONG RAM: nếu chỉ trả localStorage thì màn Cài đặt vẫn hiện trạng thái giả.
S.loadSettings();
chk(
  "cài đặt trong RAM cũng được trả nguyên trạng",
  JSON.stringify(S.store.settings.saoLuu || null) === JSON.stringify((JSON.parse(CAI_DAT_GOC || "{}") || {}).saoLuu || null),
  JSON.stringify(S.store.settings.saoLuu)
);
dongHet();
await veThuVien();

return ca;
