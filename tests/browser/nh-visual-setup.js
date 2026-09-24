// Dựng trạng thái cho kiểm tra BỐ CỤC/HÌNH ẢNH của "Thư viện ngoại hình v1".
// Chạy SAU audit-base.js. Tạo: 1 truyện test + 3 hồ sơ (một có ảnh tham chiếu) và liên
// kết cả ba vào ba nhân vật của cảnh ht_z1 để màn tạo ảnh có đủ 3 chip.
const A = window.__A, T = A.T, S = A.S;
const cho = A.cho;
A.dongHet = () => { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); };
const ANH = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
// Ảnh tham chiếu "thật" để khung xem trước trông đúng như khi người dùng tải ảnh lên
// (ảnh 1 điểm ảnh sẽ chỉ hiện một chấm, không kiểm tra được gì).
function anhMau(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2b3a55"); g.addColorStop(0.5, "#8a6a4a"); g.addColorStop(1, "#1b2333");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = "rgba(240,220,190,0.85)";
  x.beginPath(); x.arc(w * 0.5, h * 0.38, Math.min(w, h) * 0.2, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(20,20,28,0.75)";
  x.beginPath(); x.ellipse(w * 0.5, h * 0.95, w * 0.34, h * 0.42, 0, 0, Math.PI * 2); x.fill();
  return cv.toDataURL("image/jpeg", 0.7);
}
const mkH = (ten, tuoi, moTa, tranh, anh) =>
  T.chuanHoaHoSo({ id: T.newNgoaiHinh().id.replace(/^nh_/, "nhz_"), tenChinh: ten, tuoi: tuoi, moTa: moTa, tranh: tranh, anh: anh });

// Dọn hồ sơ do các lần chạy trước để lại: CHỈ theo id test (`nhz_*`). Không lọc `^nh_` (id hồ sơ
// THẬT cũng là `nh_*`) và không xoá theo TÊN (tên người dùng có thể trùng tên kiểm thử).
for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
await T.loadNgoaiHinh();

await A.taoZZ({ id: "ct_zz1", ten: "ZZ bố cục" });
await T.loadStories();
const s1 = await root.kv.cotTruyen.get("ct_zz1");
const h1 = mkH("Sara Nguyễn", "29", "Tóc đen dài ngang lưng, mắt xanh lục, xương quai hàm rõ, cao 1m72, sẹo nhỏ trên mày trái, xăm hình sóng ở cổ tay phải.", "không kính, tóc không ngắn", anhMau(1200, 900));
const h2 = mkH("Minh Trần", "31", "Dáng thấp đậm, tóc ngắn nhuộm bạch kim, mắt nâu, vai rộng, cổ tay to.", "không râu");
const h3 = mkH("Khoa Phạm", "27", "Mảnh khảnh, tóc nâu xoăn ngang vai, mắt nâu nhạt, cao 1m78.", "");
// Hồ sơ thứ tư KHÔNG liên kết nhân vật nào trong cảnh — để nút "Chọn thêm" có việc làm
// và để thấy trạng thái "chưa liên kết với nhân vật nào" trong thư viện.
const h4 = mkH("Đức Lê", "34", "Cao lớn, vai rộng, tóc đen cắt sát, râu quai nón tỉa gọn.", "không kính");
for (const h of [h1, h2, h3, h4]) await T.luuNgoaiHinh(h);
await T.loadNgoaiHinh();
s1.nhanVats[0].ngoaiHinhId = h1.id; s1.nhanVats[0].bietDanh = "Sara Nhỏ";
s1.nhanVats[1].ngoaiHinhId = h2.id;
const c3 = S.newCharacter({ id: "nv_z3", ten: "Khoa", vaiTro: "bạn", tuoi: "27", nguoiLon: true });
c3.ngoaiHinhId = h3.id;
s1.nhanVats.push(c3);
s1.hoiThoais[0].nhanVatIds = ["nv_z1", "nv_z2", "nv_z3"];
s1.hoiThoais[0].hienDien = ["nv_z1", "nv_z2", "nv_z3"];
await root.kv.cotTruyen.set("ct_zz1", s1);
await T.loadStories();
T.app.storyId = "ct_zz1"; T.app.convId = "ht_z1"; T.app.screen = "story";
await T.loadMessages("ht_z1");
T.render();
await cho(250);
A.dongHet();
window.__LH = { h1: h1.id, h2: h2.id, h3: h3.id };
return "đã dựng trạng thái bố cục";
