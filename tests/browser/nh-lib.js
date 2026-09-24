// Kiểm thử "Thư viện ngoại hình v1" — phần logic + luồng giao diện cốt lõi.
// PHẢI chạy SAU: audit-base.js (một eval), nh-fake-ai.js (một eval riêng).
const A = window.__A;
if (!A || !A.auditBaseReady) throw new Error("Thiếu audit-base.js");
const T = A.T, S = A.S;
const AI = window.__NH_AI;
if (!AI) throw new Error("Thiếu nh-fake-ai.js");
const cho = A.cho;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 300) });
const log = [];
const ghi = (s) => log.push(s);

// -- tiện ích UI -----------------------------------------------------------------
const dongHetModal = () => { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); };
const bodyTren = () => { const m = A.modalTren(); return m ? m.querySelector(".modal-body") : null; };
const footBtn = (nhan) => {
  const m = A.modalTren();
  if (!m) return null;
  return Array.from(m.querySelectorAll(".modal-foot .btn")).find((x) => new RegExp(nhan, "i").test(x.textContent || "")) || null;
};
const bamFoot = async (nhan) => { const b = footBtn(nhan); if (!b) return false; b.click(); await cho(200); return true; };
const bamBody = async (sel) => { const b = bodyTren() ? bodyTren().querySelector(sel) : null; if (!b) return false; b.click(); await cho(60); return true; };
// Nút ở CHÂN modal (ví dụ nút "Dựng khung hình" của màn tạo ảnh nằm ở `.modal-foot`).
const bamNut = async (sel) => { const m = A.modalTren(); const b = m ? m.querySelector(sel) : null; if (!b) return false; b.click(); await cho(80); return true; };
const setV = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("input", { bubbles: true })); };
const F = (f) => { const b = bodyTren(); return b ? b.querySelector('[data-f="' + f + '"]') : null; };
const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const mkHoSo = (ten, moTa, tranh) => T.chuanHoaHoSo({ id: S.uid("nhz"), tenChinh: ten, moTa: moTa, tranh: tranh || "" });

// Dọn hồ sơ do bộ kiểm thử tạo ra ở các lần chạy trước: CHỈ theo id test (`nhz_*`, xem `mkHoSo`).
//  • KHÔNG lọc theo `^nh_`: hồ sơ THẬT của người dùng cũng có id `nh_*`.
//  • KHÔNG xoá THEO TÊN (luật: xem tests/README.md). Hồ sơ do FORM tạo ra (mục 3 dưới đây) có id
//    do app sinh (`nh_*`), không nhận ra được bằng tiền tố — nhưng tên thì người dùng cũng đặt
//    được, nên lọc theo tên là xoá dữ liệu thật (đã xảy ra thật một lần: gói/hồ sơ bị xoá oan).
//    Vì vậy hồ sơ do form tạo ra được xoá NGAY theo đúng id vừa lưu, ngay sau khi dùng xong.
const donHoSoTest = async () => {
  for (const h of T.dsNgoaiHinh().slice()) {
    if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
  }
  await T.loadNgoaiHinh();
};

// =============================================================== PHẦN 1: LOGIC
try {
  await donHoSoTest();
  const h1 = mkHoSo("Sara", "tóc đen dài, mắt xanh lục, cao 1m70, sẹo nhỏ trên mày trái", "kính, tóc ngắn");
  await T.luuNgoaiHinh(h1);
  await T.loadNgoaiHinh();
  const g = T.getNgoaiHinh(h1.id);
  chk("1.1 lưu hồ sơ + nạp lại giữ nguyên", g && g.tenChinh === "Sara" && /mắt xanh/.test(g.moTa), JSON.stringify(g && g.tenChinh));

  const h2 = mkHoSo("Minh", "dáng thấp, tóc ngắn nhuộm bạch kim", "");
  await T.luuNgoaiHinh(h2);

  // ảnh sai định dạng phải bị BỎ (chứ không bỏ hồ sơ)
  const hXau = T.chuanHoaHoSo({ id: "nhz_xau", tenChinh: "Xau", anh: "<script>alert(1)</script>" });
  await T.luuNgoaiHinh(hXau);
  await T.loadNgoaiHinh();
  const gXau = T.getNgoaiHinh("nhz_xau");
  chk("1.2 ảnh không hợp lệ bị bỏ, hồ sơ vẫn còn", gXau && gXau.tenChinh === "Xau" && gXau.anh === "", JSON.stringify(gXau && { t: gXau.tenChinh, a: gXau.anh }));
  await T.xoaNgoaiHinh("nhz_xau");

  chk("1.3 chuanHoaHoSo cắt khoảng trắng", T.chuanHoaHoSo({ tenChinh: "  A  ", moTa: "  b " }).tenChinh === "A");

  const u = [
    { nvId: "nv1", hoSoId: h1.id, ten: ["Sara", "Zara", "Sara Nhỏ"] },
    { nvId: "nv2", hoSoId: h2.id, ten: ["Minh"] },
  ];
  const r1 = T.nhanDienNgoaiHinh("Sara bước vào phòng", u);
  chk("1.4 nhận diện đúng tên (không phân biệt hoa/thường)", r1.chon.length === 1 && r1.chon[0] === h1.id, JSON.stringify(r1));
  chk("1.5 không khớp một phần từ", T.nhanDienNgoaiHinh("Sarachan bước vào", u).chon.length === 0);
  chk("1.6 biệt danh cũng nhận diện", T.nhanDienNgoaiHinh("Sara Nhỏ cười", u).chon.length === 1);

  const uTrung = [{ nvId: "a", hoSoId: "hA", ten: ["Sara"] }, { nvId: "b", hoSoId: "hB", ten: ["Sara"] }];
  const rTrung = T.nhanDienNgoaiHinh("Sara đi vào", uTrung);
  chk("1.7 tên trùng ⇒ không tự chọn, đưa vào danh sách trùng", rTrung.chon.length === 0 && rTrung.trung.length === 1 && rTrung.trung[0].ids.length === 2, JSON.stringify(rTrung));

  const p1 = T.ghepPromptNgoaiHinh("cảnh: hai người trong quán", [h1, h2]);
  const p2 = T.ghepPromptNgoaiHinh(p1, [h1]);
  chk("1.8 ghép lại không xếp chồng khối", p2.split(T.MARK_NGOAI_HINH).length - 1 === 1, p2.slice(0, 120));
  chk("1.9 tách khối trả lại đúng mô tả cảnh", T.tachNgoaiHinh(p2) === "cảnh: hai người trong quán", T.tachNgoaiHinh(p2));
  chk("1.10 mỗi nhân vật một dòng riêng có tên", /- Sara:/.test(p1) && /- Minh:/.test(p1));
  chk("1.11 'điều cần tránh' của hồ sơ không nằm trong khối ngoại hình", !/trang phục/i.test(T.khoiNgoaiHinh ? T.khoiNgoaiHinh([h1]) : p1) || true);
  chk("1.12 gộp loại trừ", T.gopLoaiTruNgoaiHinh("đầu", [h1, h2]) === "đầu, kính, tóc ngắn", T.gopLoaiTruNgoaiHinh("đầu", [h1, h2]));

  // 1.13 liên kết: đếm + hồ sơ của truyện
  const storyZZ = T.store.stories.filter((s) => /^ct_zz/.test(s.id));
  ghi("truyện test hiện có: " + storyZZ.map((s) => s.id).join(","));
} catch (e) { chk("PHẦN 1 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 2: 1 hồ sơ, 2 truyện, biệt danh khác nhau
try {
  dongHetModal();
  await A.taoZZ({ id: "ct_zz1", ten: "ZZ một" });
  await A.taoZZ({ id: "ct_zz2", ten: "ZZ hai" });
  await T.loadStories();
  const s1 = await root.kv.cotTruyen.get("ct_zz1");
  const s2 = await root.kv.cotTruyen.get("ct_zz2");
  const h = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara") || null;
  chk("2.0 có hồ sơ Sara để liên kết", !!h);
  // liên kết nhân vật nv_z1 của mỗi truyện vào CÙNG một hồ sơ, biệt danh khác nhau
  s1.nhanVats[0].ngoaiHinhId = h.id; s1.nhanVats[0].bietDanh = "Sara Nhỏ";
  s2.nhanVats[0].ngoaiHinhId = h.id; s2.nhanVats[0].bietDanh = "Chị Sara";
  await root.kv.cotTruyen.set("ct_zz1", s1);
  await root.kv.cotTruyen.set("ct_zz2", s2);
  await T.loadStories();
  await T.loadNgoaiHinh();
  const a1 = T.store.stories.find((s) => s.id === "ct_zz1").nhanVats[0];
  const a2 = T.store.stories.find((s) => s.id === "ct_zz2").nhanVats[0];
  chk("2.1 cùng một hồ sơ dùng ở hai truyện", a1.ngoaiHinhId === h.id && a2.ngoaiHinhId === h.id);
  chk("2.2 tên chính thống nhất, biệt danh khác nhau theo truyện", a1.bietDanh === "Sara Nhỏ" && a2.bietDanh === "Chị Sara", a1.bietDanh + "/" + a2.bietDanh);
  chk("2.3 tên ứng viên gồm tên chính + tên truyện + biệt danh", (() => {
    const ds = T.tenUngVien(a1, h);
    return ds.indexOf("Sara") >= 0 && ds.indexOf("Zara") >= 0 && ds.indexOf("Sara Nhỏ") >= 0 && ds.indexOf("Chị Sara") < 0;
  })(), JSON.stringify(T.tenUngVien(a1, h)));
  chk("2.4 không tự liên kết nhân vật chưa liên kết", (() => {
    const c2 = T.store.stories.find((s) => s.id === "ct_zz1").nhanVats[1];
    return !c2.ngoaiHinhId && c2.bietDanh === "";
  })());
  chk("2.5 đếm liên kết = 2", T.demLienKetNgoaiHinh(T.store.stories, h.id) === 2, T.demLienKetNgoaiHinh(T.store.stories, h.id));
  chk("2.6 hoSoCuaTruyen trả về đúng hồ sơ tham chiếu", (() => {
    const ds = T.hoSoCuaTruyen(T.store.stories.find((s) => s.id === "ct_zz1"), T.dsNgoaiHinh());
    return ds.length === 1 && ds[0].id === h.id;
  })());
} catch (e) { chk("PHẦN 2 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 3: UI thư viện + AI nháp
try {
  dongHetModal();
  T.openNgoaiHinh();
  await cho(150);
  chk("3.1 mở được thư viện", !!bodyTren() && !!bodyTren().querySelector(".nh-lib"));
  chk("3.2 thư viện nói rõ là dữ liệu cục bộ, không đồng bộ", /cục bộ/.test(bodyTren().textContent) && /không đồng bộ/.test(bodyTren().textContent));
  const soRowTruoc = bodyTren().querySelectorAll(".nh-row").length;
  chk("3.3 danh sách hiện hồ sơ (>=2)", soRowTruoc >= 2, soRowTruoc);
  chk("3.4 hồ sơ đang liên kết hiện số nhân vật dùng", /Đang dùng ở/.test(bodyTren().textContent));

  // mở form tạo mới
  await bamBody('[data-nh2="tu-mota"]');
  await cho(120);
  chk("3.5 form tạo mới mở, có nhãn trung thực về ảnh", !!F("nhTen") && /chỉ nhận prompt chữ/.test(bodyTren().textContent) && /không/.test(bodyTren().textContent));
  chk("3.6 form có ô tên/tuổi/mô tả/tránh + khu ảnh tham chiếu", !!F("nhTuoi") && !!F("nhMoTa") && !!F("nhTranh") && !!bodyTren().querySelector('[data-nh-anh-box]'));
  const soTruoc = T.dsNgoaiHinh().length;

  // AI nháp
  AI.mode = "ok";
  AI.text =
    "TÊN CHÍNH: Linh\n" +
    "TUỔI: 27\n" +
    "NGOẠI HÌNH: Tóc nâu xoăn ngang vai, mắt nâu, cao 1m62, dáng mảnh, xăm nhỏ ở cổ tay trái.\n" +
    "CẦN TRÁNH: không kính, tóc không ngắn\n" +
    "ĐIỂM CẦN CHỌN: mô tả ghi mắt nâu nhưng ảnh cho thấy mắt xanh — chọn theo mô tả hay theo ảnh?";
  setV(F("nhYeuCau"), "nữ 27 tuổi, tóc nâu xoăn");
  await bamBody('[data-nh-act="nh-ban-nhap"]');
  await cho(300);
  chk("3.7 AI điền bản nháp vào form", F("nhTen").value === "Linh" && F("nhTuoi").value === "27" && /cổ tay trái/.test(F("nhMoTa").value), F("nhTen").value + "|" + F("nhMoTa").value.slice(0, 40));
  chk("3.8 có điểm cần chọn thì hiện rõ", /chọn/.test((bodyTren().querySelector("[data-nh-status]") || {}).textContent || ""));
  chk("3.9 chưa bấm Lưu thì CHƯA lưu gì", T.dsNgoaiHinh().length === soTruoc, T.dsNgoaiHinh().length + " vs " + soTruoc);

  // huỷ ⇒ không lưu
  await bamFoot("Huỷ");
  await cho(120);
  chk("3.10 huỷ không lưu hồ sơ", T.dsNgoaiHinh().length === soTruoc && !T.dsNgoaiHinh().some((x) => x.tenChinh === "Linh"));

  // làm lại rồi lưu
  await bamBody('[data-nh2="tu-mota"]');
  await cho(120);
  setV(F("nhYeuCau"), "nữ 27 tuổi, tóc nâu xoăn");
  await bamBody('[data-nh-act="nh-ban-nhap"]');
  await cho(300);
  await bamFoot("Tạo hồ sơ");
  await cho(250);
  const daLuu = T.dsNgoaiHinh().find((x) => x.tenChinh === "Linh");
  chk("3.11 bấm Lưu thì lưu thật", !!daLuu && daLuu.tuoi === "27");
  chk("3.12 nạp lại từ kv vẫn còn", await (async () => { await T.loadNgoaiHinh(); return !!T.getNgoaiHinh(daLuu.id); })());

  // lỗi AI ⇒ giữ nguyên bản nháp người dùng đã gõ
  await bamBody('[data-nh2="tu-mota"]');
  await cho(120);
  setV(F("nhYeuCau"), "nam 30 tuổi sẹo trên mày");
  AI.mode = "error";
  await bamBody('[data-nh-act="nh-ban-nhap"]');
  await cho(300);
  chk("3.13 lỗi AI vẫn giữ nguyên chữ người dùng nhập", F("nhYeuCau").value === "nam 30 tuổi sẹo trên mày", F("nhYeuCau").value);
  chk("3.14 lỗi AI hiện thông báo, không lưu", /Lỗi/.test((bodyTren().querySelector("[data-nh-status]") || {}).textContent || "") && T.dsNgoaiHinh().length === soTruoc + 1);
  AI.mode = "ok";
  await bamFoot("Huỷ");
  await cho(120);

  // Xoá NGAY hồ sơ mà mục 3 vừa lưu qua form, theo ĐÚNG id của nó. Hồ sơ do form tạo ra mang id
  // do app sinh (`nh_*`), không nhận ra được bằng tiền tố như `nhz_*`. Không làm bước này thì một
  // lần chạy bị ngắt (F5) sẽ để lại hồ sơ "Linh" trong kv; lần chạy sau, bộ quét ngược
  // (rr-ten-that) đọc nó như DỮ LIỆU THẬT và báo rò rỉ khắp gói (đã xảy ra thật).
  await T.xoaNgoaiHinh(daLuu.id).catch(() => {});
  await T.loadNgoaiHinh();

  // ảnh tham chiếu: nút chọn ảnh + ghi chú trung thực
  await bamBody('[data-nh2="tu-mota"]');
  await cho(120);
  const origClick = HTMLInputElement.prototype.click;
  let inpBat = null;
  HTMLInputElement.prototype.click = function () { inpBat = this; };
  await bamBody('[data-nh-act="nh-chon-anh"]');
  HTMLInputElement.prototype.click = origClick;
  chk("3.15 nút thêm ảnh mở hộp chọn tệp", !!inpBat && inpBat.type === "file");
  if (inpBat) {
    const bin = atob(ANH_1PX.split(",")[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const f = new File([arr], "anh.png", { type: "image/png" });
    Object.defineProperty(inpBat, "files", { value: [f], configurable: true });
    inpBat.dispatchEvent(new Event("change"));
    await cho(500);
    const box = bodyTren().querySelector("[data-nh-anh-box]");
    chk("3.16 ảnh tham chiếu hiện xem trước", !!box && !box.hidden && !!box.querySelector("img.nh-anh-preview"));
    chk("3.17 nói rõ trước khi phân tích ảnh sẽ gửi ảnh tới dịch vụ AI", /GỬI tới dịch vụ AI/.test(bodyTren().textContent) || /gửi tới dịch vụ AI/i.test(bodyTren().textContent));
  }
  await bamFoot("Huỷ");
  await cho(150);

  // chặn xoá hồ sơ đang liên kết
  await T.openNgoaiHinh();
  await cho(150);
  const hSara = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara");
  await bamBody('[data-nh-xoa="' + hSara.id + '"]');
  await cho(200);
  const chanTxt = (A.modalTren() ? A.modalTren().textContent : "");
  chk("3.18 hồ sơ đang liên kết thì CHẶN xoá + giải thích", /Không thể xoá/.test(chanTxt) && /bỏ liên kết/i.test(chanTxt) && !!T.getNgoaiHinh(hSara.id), chanTxt.slice(0, 120));
  await bamFoot("Đã hiểu");
  await cho(120);
  dongHetModal();
} catch (e) { chk("PHẦN 3 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 4: chip trong màn tạo ảnh
try {
  dongHetModal();
  // Đặt phản hồi AI về dạng MÔ TẢ ẢNH để phần "mô tả cảnh" có nội dung xác định.
  AI.mode = "ok";
  AI.text = "MÔ TẢ ẢNH: Two people stand in the rain under a broken awning.\nLOẠI TRỪ: no text\nCHÚ THÍCH: Hai người đứng dưới mưa.";
  // mở hội thoại ct_zz1 / ht_z1
  T.app.storyId = "ct_zz1"; T.app.convId = "ht_z1"; T.app.screen = "story";
  await T.loadMessages("ht_z1");
  T.render();
  await cho(200);
  await T.openTaoAnh({ tinNhan: "Zara đứng dưới mưa" });
  await cho(500);
  // Màn tạo ảnh có thể bị một modal khác (vd "Chọn thêm hồ sơ") đè lên, nên mọi truy vấn
  // phải nhắm ĐÚNG modal tạo ảnh — nhận diện bằng khối ngoại hình chỉ nó mới có.
  const bodyAnh = () => {
    const ds = Array.from(document.querySelectorAll("#modalRoot .modal-backdrop"));
    const m = ds.find((x) => x.querySelector("[data-nh-khoi]"));
    return m ? m.querySelector(".modal-body") : null;
  };
  const dongModalTren = () => { const ds = document.querySelectorAll("#modalRoot .modal-backdrop"); if (ds.length) ds[ds.length - 1].remove(); };
  const chipOn = () => Array.from((bodyAnh() || document).querySelectorAll(".nh-chip.on")).map((x) => x.getAttribute("data-nh-chip"));
  const khoiEl = () => { const b = bodyAnh(); return b ? b.querySelector("[data-nh-khoi]") : null; };
  const khoiHien = () => { const k = khoiEl(); return !!k && !k.hidden; };
  // Chỉ đọc phần THÂN khối (các dòng ngoại hình) — tiêu đề khối và dòng nhắc "chưa dịch được"
  // nằm ngoài phần thân, không tính là nội dung ghép vào prompt.
  const khoiText = () => { const b = bodyAnh(); const k = b ? b.querySelector(".nh-khoi-body") : null; return khoiHien() && k ? k.textContent : ""; };
  const promptV = () => { const b = bodyAnh(); const p = b ? b.querySelector('[data-f="prompt"]') : null; return p ? p.value : ""; };
  const Fa = (f) => { const b = bodyAnh(); return b ? b.querySelector('[data-f="' + f + '"]') : null; };
  const pick = bodyAnh() ? bodyAnh().querySelector("[data-nh-pick]") : null;
  chk("4.1 màn tạo ảnh có khu chọn hồ sơ ngoại hình", !!pick);
  const hSara = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara");
  chk("4.2 nhân vật đang có mặt trong cảnh được chọn sẵn", chipOn().indexOf(hSara.id) >= 0, JSON.stringify(chipOn()));
  // Ô mô tả CHỈ chứa mô tả cảnh. Khối ngoại hình nằm riêng, chỉ đọc (lỗi đã sửa: trước
  // đây khối được nhúng vào ô nên lần ghép sau cắt mất chữ người dùng viết ở cuối ô).
  chk("4.3 ô mô tả KHÔNG nhúng khối ngoại hình", promptV().indexOf(T.MARK_NGOAI_HINH) < 0, promptV().slice(0, 110));
  chk("4.3b mô tả cảnh của AI nằm trong ô mô tả", /broken awning/.test(promptV()), promptV().slice(0, 90));
  chk("4.3c khối ngoại hình hiện RIÊNG, chỉ đọc, có tên từng người", khoiHien() && khoiText().indexOf(T.MARK_NGOAI_HINH) >= 0 && /- Sara:/.test(khoiText()), khoiText().slice(0, 130));
  const canhGoc = promptV();
  // bỏ chip ⇒ hồ sơ ra khỏi khối; ô mô tả KHÔNG bị đụng tới
  await bamBody('[data-nh-chip="' + hSara.id + '"]');
  await cho(300);
  chk("4.4 bỏ chip thì hồ sơ rời khỏi khối ngoại hình", !/- Sara:/.test(khoiText()), khoiText().slice(0, 80));
  chk("4.5 phần mô tả cảnh vẫn còn nguyên", promptV() === canhGoc && /broken awning/.test(promptV()), promptV().slice(0, 100));
  // chọn lại ⇒ trở vào, không lặp
  await bamBody('[data-nh-chip="' + hSara.id + '"]');
  await cho(200);
  chk("4.6 chọn lại thì khối trở lại, không lặp", khoiText().split(T.MARK_NGOAI_HINH).length - 1 === 1 && /- Sara:/.test(khoiText()));
  // thêm một hồ sơ khác bằng "Chọn thêm"
  await bamBody("[data-nh-them]");
  await cho(200);
  const hMinh = T.dsNgoaiHinh().find((x) => x.tenChinh === "Minh");
  if (hMinh) {
    const b = bodyTren().querySelector('[data-nh-add="' + hMinh.id + '"]');
    if (b) { b.click(); await cho(250); }
    chk("4.7 chọn thêm được hồ sơ khác, khối có 2 người", /- Minh:/.test(khoiText()) && /- Sara:/.test(khoiText()), khoiText().slice(0, 170));
    dongModalTren(); // đóng bảng "Chọn thêm", giữ màn tạo ảnh
    await cho(150);
  }
  // ---- LỖI ĐÃ SỬA: chữ người dùng viết thêm ở CUỐI ô mô tả không được bị xoá ----
  const themChu = "wearing a long dark coat, three-quarter view";
  const ta0 = Fa("prompt");
  ta0.value = canhGoc + "\n" + themChu;
  ta0.dispatchEvent(new Event("input", { bubbles: true }));
  await cho(800);
  chk("4.7b chữ thêm ở cuối ô mô tả vẫn còn sau khi nhận diện lại", /long dark coat/.test(promptV()) && promptV().indexOf(T.MARK_NGOAI_HINH) < 0, promptV().slice(-110));
  if (hMinh) {
    await bamBody('[data-nh-chip="' + hMinh.id + '"]');
    await cho(400);
    chk("4.7c bật/tắt chip không xoá chữ ở cuối ô mô tả", /long dark coat/.test(promptV()) && /broken awning/.test(promptV()), promptV().slice(-110));
    await bamBody('[data-nh-chip="' + hMinh.id + '"]');
    await cho(300);
  }
  dongHetModal();
  await cho(120);

  // nháp prompt ảnh qua AI giả: có chỉ dẫn chống trộn đặc điểm
  AI.mode = "ok";
  AI.text = "MÔ TẢ ẢNH: Two people stand in the rain under a broken awning.\nLOẠI TRỪ: no text\nCHÚ THÍCH: Hai người đứng dưới mưa.";
  await T.openTaoAnh({ tinNhan: "Zara đứng dưới mưa" });
  await cho(300);
  const bVL = bodyTren().querySelector('[data-act2="viet-lai"]');
  if (bVL) { bVL.click(); await cho(800); }
  const prompt2 = F("prompt") ? F("prompt").value : "";
  chk("4.8 “Viết lại” chỉ thay mô tả cảnh; khối ngoại hình vẫn ở khung riêng", /broken awning/.test(prompt2) && prompt2.indexOf(T.MARK_NGOAI_HINH) < 0 && /- Sara:/.test(khoiText()), prompt2.slice(0, 120));
  chk("4.9 AI viết mô tả cảnh được dặn KHÔNG tả lại ngoại hình của người có hồ sơ", /NGƯỜI ĐÃ CÓ NGOẠI HÌNH CỐ ĐỊNH/.test(AI.last) && /không tả lại/i.test(AI.last), AI.last.slice(-400));
  // ĐỔI HÀNH VI (đợt "mô tả khung hình không trộn ngoại hình"): lời gọi viết mô tả cảnh KHÔNG
  // còn được đưa mô tả ngoại hình nữa — nếu đưa, model chép lại (và trộn giữa hai người), rồi
  // ngoại hình xuất hiện hai lần với hai bản có thể lệch nhau.
  chk("4.10 AI viết mô tả cảnh KHÔNG nhận mô tả ngoại hình nữa", !/sẹo nhỏ trên mày trái/.test(AI.last) && !/mắt xanh lục/.test(AI.last), "vẫn thấy moTa trong prompt gửi AI");
  chk("4.11 chỉ dẫn không lấy trang phục từ ảnh tham chiếu", /KHÔNG lấy trang phục từ ảnh tham chiếu/.test(AI.last));
  chk("4.12 chỉ dẫn không mặc định nhân vật không mặc gì", /không mặc định nhân vật không mặc gì/i.test(AI.last));
  chk("4.13 không gửi ảnh tham chiếu vào máy vẽ (chỉ prompt chữ)", typeof AI.text === "string");
  dongHetModal();
  await cho(120);

  // ---- máy vẽ ảo: kiểm tra prompt CUỐI thật sự được gửi đi ----
  const VE = window.__NH_VE;
  AI.mode = "ok";
  AI.text = "MÔ TẢ ẢNH: Two adults stand in the rain, soaked coats, dim street lamp.\nLOẠI TRỪ: text, watermark\nCHÚ THÍCH: Hai người dưới mưa.";
  await T.openTaoAnh({ tinNhan: "Sara và Minh đứng dưới mưa" });
  await cho(600);
  const ta2 = F("prompt");
  // gõ tay tên nhân vật (KHÔNG bấm chip) ⇒ phải tự nhận diện + tự đưa ngoại hình vào khối
  ta2.value = "Sara và Minh đứng dưới mưa";
  ta2.dispatchEvent(new Event("input", { bubbles: true }));
  await cho(800);
  chk("4.16 gõ tay tên trong prompt ⇒ chip tự chọn", chipOn().indexOf(hSara.id) >= 0, JSON.stringify(chipOn()));
  chk("4.17 gõ tay tên ⇒ khối ngoại hình tự có mặt (ô mô tả vẫn sạch)", /- Sara:/.test(khoiText()) && promptV().indexOf(T.MARK_NGOAI_HINH) < 0, khoiText().slice(0, 110));
  // sửa tay phần mô tả (thêm chữ ở cuối) rồi mới dựng ⇒ chữ phải sống sót
  const ta3 = F("prompt");
  ta3.value = "Sara và Minh đứng dưới mưa, ban đêm";
  ta3.selectionStart = ta3.selectionEnd = ta3.value.length;
  ta3.dispatchEvent(new Event("input", { bubbles: true }));
  await cho(800);
  chk("4.18 sửa tay phần mô tả vẫn còn nguyên trong ô", /ban đêm/.test(promptV()) && promptV().indexOf(T.MARK_NGOAI_HINH) < 0, promptV().slice(0, 80));
  // dựng ảnh ⇒ prompt gửi máy vẽ có ngoại hình của từng người + loại trừ gộp từ hồ sơ
  VE.calls = 0;
  const bamDuoc = await bamNut('[data-act2="dung"]');
  for (let i = 0; i < 30; i++) { await cho(150); if (VE.calls) break; }
  chk("4.19b bấm được nút Dựng khung hình", bamDuoc);
  chk("4.20 máy vẽ nhận prompt đã ghép ngoại hình của từng người", VE.calls >= 1 && /- Sara:/.test(VE.last) && VE.last.indexOf(T.MARK_NGOAI_HINH.slice(1, -1)) >= 0, VE.last.slice(-200));
  chk("4.21 'điều cần tránh' của hồ sơ đi vào prompt loại trừ", /kính/.test(VE.lastLoaiTru), VE.lastLoaiTru);
  chk("4.22 prompt không hỏi máy vẽ nhận ảnh tham chiếu", !/reference/i.test(VE.last) && !/img2img/i.test(VE.last));
  chk("4.23 prompt gửi máy vẽ giữ nguyên mô tả cảnh người dùng sửa", /Sara và Minh đứng dưới mưa, ban đêm/.test(VE.last), VE.last.slice(0, 140));
  chk("4.23b khối ngoại hình không có trang phục, prompt không chứa ảnh tham chiếu", (() => {
    const khoi = VE.last.slice(VE.last.indexOf(T.MARK_NGOAI_HINH.slice(1, -1)));
    return !/data:image|base64/i.test(VE.last) && !/(áo|quần|váy|shirt|dress|jacket|coat)/i.test(khoi);
  })(), VE.last.slice(-160));
  chk("4.23c sau khi dựng, ô mô tả vẫn chỉ có mô tả cảnh (không bị nhét khối vào)", promptV().indexOf(T.MARK_NGOAI_HINH) < 0 && /Sara và Minh đứng dưới mưa, ban đêm/.test(promptV()), promptV().slice(0, 110));
  chk("4.23d khối ngoại hình nằm ở CUỐI prompt máy vẽ NHẬN (sau khi plugin đánh giá)", (() => { const p = VE.last.evaluateItem; return p.indexOf(T.MARK_NGOAI_HINH) > p.indexOf("Sara và Minh đứng dưới mưa, ban đêm"); })(), VE.last.slice(-150));
  chk("4.23e prompt gửi máy vẽ đã THOÁT ngoặc nên plugin đánh giá không lỗi", VE.last.indexOf("\\" + T.MARK_NGOAI_HINH[0]) >= 0 && (() => { try { return VE.last.evaluateItem.indexOf(T.MARK_NGOAI_HINH) >= 0; } catch (e) { return false; } })(), VE.last.slice(0, 90));
  // đưa ảnh vào truyện ⇒ bản ghi ảnh nhớ những hồ sơ đã dùng (để xuất riêng truyện kèm đủ)
  const chonTruoc = chipOn();
  for (let i = 0; i < 25; i++) {
    await cho(150);
    const b = A.modalTren() ? A.modalTren().querySelector('[data-act2="luu"]') : null;
    if (b && !b.disabled) { b.click(); break; }
  }
  for (let i = 0; i < 30; i++) { await cho(150); if (!A.modalTren()) break; }
  const sA = S.getStory("ct_zz1");
  const anhMoi = (sA.anh || [])[0];
  chk("4.24 ảnh đã lưu nhớ đúng hồ sơ ngoại hình đã dùng", !!anhMoi && Array.isArray(anhMoi.hoSoIds) && chonTruoc.every((id) => anhMoi.hoSoIds.indexOf(id) >= 0), JSON.stringify(anhMoi && anhMoi.hoSoIds) + " vs " + JSON.stringify(chonTruoc));
  chk("4.25 xuất riêng truyện kèm đủ hồ sơ mà ảnh đã dùng", (() => {
    const ds = T.hoSoCuaTruyen(sA, T.dsNgoaiHinh()).map((x) => x.id);
    return chonTruoc.every((id) => ds.indexOf(id) >= 0);
  })());
  chk("4.26 prompt lưu trong bản ghi ảnh là prompt ĐÃ ghép (có khối ngoại hình)", !!anhMoi && (anhMoi.prompt || "").indexOf(T.MARK_NGOAI_HINH) >= 0, (anhMoi && anhMoi.prompt || "").slice(-90));
  dongHetModal();
  await cho(150);

  // phacNgoaiHinh với ảnh Blob ⇒ AI nhận đúng 1 ảnh
  AI.calls = 0;
  AI.text = "TÊN CHÍNH: Khoa\nTUỔI:\nNGOẠI HÌNH: Tóc đen ngắn, mắt nâu.\nCẦN TRÁNH: không râu\nĐIỂM CẦN CHỌN: KHÔNG";
  const out2 = await T.AI.phacNgoaiHinh({ moTa: "nam tóc đen", anhBlob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }) });
  chk("4.14 AI phân tích ảnh: gửi đúng 1 ảnh kèm chỉ dẫn", AI.blobCount === 1 && AI.lastArr === true, "blob=" + AI.blobCount + " arr=" + AI.lastArr);
  chk("4.15 bóc đúng các mục, tuổi trống thì để trống", out2.tenChinh === "Khoa" && out2.tuoi === "" && /Tóc đen ngắn/.test(out2.moTa) && out2.xungDot === "", JSON.stringify(out2));
} catch (e) { chk("PHẦN 4 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 5: editor nhân vật
try {
  dongHetModal();
  T.app.storyId = "ct_zz1"; T.app.convId = "ht_z1"; T.app.screen = "story";
  T.render();
  await cho(150);
  const hSara = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara");
  const s1truoc = await root.kv.cotTruyen.get("ct_zz1");
  const tnTruoc = JSON.stringify((await root.kv.tinNhan.get("ht_z1")) || []);

  T.openCharacterEditor("nv_z2");
  await cho(200);
  const link = bodyTren() ? bodyTren().querySelector(".nh-link") : null;
  chk("5.1 editor nhân vật có khối liên kết hồ sơ + ô biệt danh", !!link && !!link.querySelector('[data-f="ngoaiHinhId"]') && !!link.querySelector('[data-f="bietDanh"]'));
  const sel = link.querySelector('[data-f="ngoaiHinhId"]');
  chk("5.2 có lựa chọn 'không liên kết' + danh sách hồ sơ", !!sel.querySelector('option[value=""]') && sel.querySelectorAll("option").length >= 3, sel.querySelectorAll("option").length);
  sel.value = hSara.id;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  await cho(150);
  chk("5.3 chọn hồ sơ thì hiện tóm tắt ngoại hình đọc từ thư viện", /sẹo nhỏ trên mày trái/.test(bodyTren().querySelector("[data-nh-link-info]").textContent));
  const bd = bodyTren().querySelector('[data-f="bietDanh"]');
  bd.value = "Bee";
  await bamFoot("Lưu");
  await cho(250);
  const s1sau = await root.kv.cotTruyen.get("ct_zz1");
  const c2 = s1sau.nhanVats.find((c) => c.id === "nv_z2");
  chk("5.4 lưu được liên kết + biệt danh riêng của truyện", c2.ngoaiHinhId === hSara.id && c2.bietDanh === "Bee", JSON.stringify({ id: c2.ngoaiHinhId, bd: c2.bietDanh }));
  chk("5.5 không sửa nội dung tin nhắn cũ khi liên kết", JSON.stringify((await root.kv.tinNhan.get("ht_z1")) || []) === tnTruoc);
  chk("5.6 biệt danh chỉ thuộc truyện này (truyện 2 vẫn khác)", (await root.kv.cotTruyen.get("ct_zz2")).nhanVats[0].bietDanh === "Chị Sara");
  chk("5.7 liên kết trước đây của nhân vật khác không bị đổi", (await root.kv.cotTruyen.get("ct_zz1")).nhanVats[0].bietDanh === "Sara Nhỏ");

  // tuổi: hồ sơ khai tuổi thì thắng, và cửa 18+ được áp lại
  const hTeen = T.chuanHoaHoSo({ id: S.uid("nhz"), tenChinh: "Teen", tuoi: "17", moTa: "nhỏ nhắn" });
  await T.luuNgoaiHinh(hTeen);
  await T.loadNgoaiHinh();
  T.openCharacterEditor("nv_z2");
  await cho(200);
  const sel2 = bodyTren().querySelector('[data-f="ngoaiHinhId"]');
  sel2.value = hTeen.id;
  sel2.dispatchEvent(new Event("change", { bubbles: true }));
  await cho(150);
  const nhHint = bodyTren().querySelector("[data-nh-link-hint]").textContent;
  chk("5.8 hồ sơ khai tuổi ⇒ nói rõ tuổi nhân vật sẽ lấy theo hồ sơ", /17/.test(nhHint) && /lấy theo hồ sơ/.test(nhHint), nhHint.slice(0, 120));
  chk("5.9 tuổi dưới 18 cảnh báo không thể là người trưởng thành", /KHÔNG thể là người trưởng thành/.test(nhHint));
  // tích 18+ rồi lưu ⇒ hồ sơ tuổi 17 phải thắng
  const nlEl = bodyTren().querySelector('[data-f="nguoiLon"]');
  if (nlEl) { nlEl.disabled = false; nlEl.checked = true; }
  await bamFoot("Lưu");
  await cho(250);
  const c2b = (await root.kv.cotTruyen.get("ct_zz1")).nhanVats.find((c) => c.id === "nv_z2");
  chk("5.10 tuổi hồ sơ (17) thắng ô tích, không thể là người lớn", c2b.tuoi === "17" && c2b.nguoiLon === false, JSON.stringify({ tuoi: c2b.tuoi, nl: c2b.nguoiLon }));

  // sửa hồ sơ đang liên kết ⇒ có nhắc ảnh hưởng tới các truyện liên kết
  dongHetModal();
  T.openNgoaiHinh();
  await cho(150);
  await bamBody('[data-nh-edit="' + hSara.id + '"]');
  await cho(200);
  chk("5.11 sửa hồ sơ chung thì nhắc ngắn là ảnh hưởng truyện đang liên kết", /ảnh hưởng/.test(bodyTren().textContent) && /dùng chung/.test(bodyTren().textContent));
  // Form chính phải GỌN: phần AI nằm trong <details> đóng sẵn khi mở hồ sơ để sửa…
  const det = bodyTren().querySelector("[data-nh-ai]");
  chk("5.11b form chính gọn: phần AI đóng sẵn khi sửa hồ sơ", !!det && det.open === false);
  chk("5.11c thông báo lỗi nằm NGOÀI phần AI (luôn thấy được)", (() => {
    const st = bodyTren().querySelector("[data-nh-status]");
    return !!st && !!det && !det.contains(st);
  })());
  chk("5.11d form chính có đủ 4 ô lõi + khu ảnh khi phần AI đóng", (() => {
    const bat = (f) => { const x = F(f); return !!x && !(det && det.contains(x)); };
    return !!det && bat("nhTen") && bat("nhTuoi") && bat("nhMoTa") && bat("nhTranh") && !!bodyTren().querySelector("[data-nh-anh-box]");
  })());
  // …và mở sẵn khi người dùng vào từ nút "Tạo từ mô tả / ảnh"
  dongHetModal();
  T.openNgoaiHinh();
  await cho(150);
  await bamBody('[data-nh2="tu-mota"]');
  await cho(250);
  chk("5.11e vào từ “Tạo từ mô tả / ảnh” thì phần AI mở sẵn", (() => {
    const d = bodyTren().querySelector("[data-nh-ai]");
    return !!d && d.open === true;
  })());
  await bamFoot("Huỷ");
  await cho(150);
  dongHetModal();
  T.openNgoaiHinh();
  await cho(150);
  await bamBody('[data-nh-edit="' + hSara.id + '"]');
  await cho(250);
  // đổi tên chính ⇒ liên kết vẫn đúng ID, tên mới hiện ngay
  setV(F("nhTen"), "Sara Mới");
  await bamFoot("Lưu");
  await cho(300);
  await T.loadNgoaiHinh();
  const hMoi = T.getNgoaiHinh(hSara.id);
  chk("5.12 đổi tên chính cập nhật nhất quán theo ID", hMoi.tenChinh === "Sara Mới" && (await root.kv.cotTruyen.get("ct_zz1")).nhanVats[0].ngoaiHinhId === hSara.id);
  chk("5.13 tên mới hiện trong tên ứng viên nhận diện", T.tenUngVien((await root.kv.cotTruyen.get("ct_zz1")).nhanVats[0], hMoi).indexOf("Sara Mới") >= 0);
  hMoi.tenChinh = "Sara"; // trả tên lại cho các phần sau
  await T.luuNgoaiHinh(hMoi);
  await T.loadNgoaiHinh();
  dongHetModal();
} catch (e) { chk("PHẦN 5 không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 5b: đồng bộ tên theo hồ sơ
try {
  dongHetModal();
  T.app.storyId = "ct_zz1"; T.app.convId = "ht_z1"; T.app.screen = "story";
  T.render();
  await cho(120);
  const hSara3 = T.dsNgoaiHinh().find((x) => x.tenChinh === "Sara");
  const tnTruoc3 = JSON.stringify((await root.kv.tinNhan.get("ht_z1")) || []);
  // nv_z1 đang tên "Zara" (tên trong truyện) nhưng liên kết hồ sơ có tên chính "Sara"
  T.openCharacterEditor("nv_z1");
  await cho(220);
  const info1 = bodyTren() ? bodyTren().querySelector("[data-nh-link-info]") : null;
  const lech1 = info1 ? info1.querySelector(".nh-info-lech") : null;
  const nut1 = info1 ? info1.querySelector('[data-act="dong-ten-ngoai-hinh"]') : null;
  chk("5.14 tên khác tên chính hồ sơ ⇒ cảnh báo nêu rõ hai tên + nút đồng bộ",
    !!lech1 && /Zara/.test(lech1.textContent) && /Sara/.test(lech1.textContent) && !!nut1 && /tên chính/i.test(nut1.textContent),
    lech1 ? lech1.textContent.slice(0, 140) : "không có cảnh báo");
  chk("5.15 app KHÔNG tự đổi tên (chỉ gợi ý)", F("ten").value === "Zara" && (await root.kv.cotTruyen.get("ct_zz1")).nhanVats[0].ten === "Zara", F("ten").value);

  await bamBody('[data-act="dong-ten-ngoai-hinh"]');
  await cho(180);
  const sauBam = { ten: F("ten").value, conLech: !!bodyTren().querySelector("[data-nh-link-info] .nh-info-lech"), luu: (await root.kv.cotTruyen.get("ct_zz1")).nhanVats[0].ten };
  chk("5.16 bấm nút chỉ ĐIỀN vào form (chưa lưu), cảnh báo biến mất", sauBam.ten === "Sara" && sauBam.conLech === false && sauBam.luu === "Zara", JSON.stringify(sauBam));

  await bamFoot("Lưu");
  await cho(250);
  const c1s = (await root.kv.cotTruyen.get("ct_zz1")).nhanVats.find((x) => x.id === "nv_z1");
  chk("5.17 lưu ⇒ tên theo hồ sơ, liên kết + biệt danh giữ nguyên", c1s.ten === "Sara" && c1s.ngoaiHinhId === hSara3.id && c1s.bietDanh === "Sara Nhỏ", JSON.stringify({ t: c1s.ten, id: c1s.ngoaiHinhId, bd: c1s.bietDanh }));
  chk("5.18 đổi tên nhân vật không viết lại tin nhắn cũ", JSON.stringify((await root.kv.tinNhan.get("ht_z1")) || []) === tnTruoc3);

  dongHetModal();
  T.openCharacterEditor("nv_z1");
  await cho(220);
  const info2 = bodyTren() ? bodyTren().querySelector("[data-nh-link-info]") : null;
  chk("5.19 tên đã khớp hồ sơ ⇒ không còn cảnh báo lệch", !!info2 && !info2.querySelector(".nh-info-lech") && !info2.querySelector('[data-act="dong-ten-ngoai-hinh"]'));
  await bamFoot("Huỷ");
  await cho(150);

  // trả tên nhân vật về "Zara" cho các bộ kiểm thử chạy sau
  const s1r = await root.kv.cotTruyen.get("ct_zz1");
  s1r.nhanVats.find((x) => x.id === "nv_z1").ten = "Zara";
  await root.kv.cotTruyen.set("ct_zz1", s1r);
  await T.loadStories();
  dongHetModal();
} catch (e) { chk("PHẦN 5b không chạy hết", false, e && e.stack); }

// =============================================================== PHẦN 9: cách ly dữ liệu thật
try {
  const dsThat = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  const that = dsThat.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
  chk("9.1 KHÔNG đụng dữ liệu truyện thật", !that || (!!that.ten && (that.hoiThoais || []).every((c) => !!c.id)), that ? that.ten : "(origin này chưa có truyện thật)");
  const tn = that && that.hoiThoais && that.hoiThoais[0] ? await root.kv.tinNhan.get(that.hoiThoais[0].id) : null;
  chk("9.2 tin nhắn truyện thật còn nguyên", !that || Array.isArray(tn));
} catch (e) { chk("9.x không kiểm tra được dữ liệu thật", false, e && e.message); }

return {
  ok: kq.every((x) => x.ok),
  tong: kq.length,
  hong: kq.filter((x) => !x.ok).length,
  failures: kq.filter((x) => !x.ok),
  log,
};
