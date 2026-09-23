// T3 — cửa 18+ cho mọi đường bật BDSM (Tạo nhanh, thể loại BDSM, nút "Bật giao kèo", nhân vật).
const A = window.__A, T = A.T, S = A.S;
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const bam1 = async (el, nhan, ms) => {
  if (!el) { kq.push({ ca: "KHÔNG TÌM THẤY: " + nhan, dat: false }); return false; }
  el.click();
  await A.cho(ms || 150);
  return true;
};
const modalNu = () => { const m = A.modalTren(); return m && m.querySelector(".modal-title"); };
const nutTrong = (re) => { const m = A.modalTren(); return m ? Array.from(m.querySelectorAll(".modal-foot .btn")).find((b) => re.test(b.textContent || "")) : null; };
const than = () => { const m = A.modalTren(); const mb = m && m.querySelector(".modal-body"); return mb && (mb.firstElementChild || mb); };
const dongHet = async () => {
  for (let i = 0; i < 8; i++) {
    const m = A.modalTren();
    if (!m) return;
    const c = m.querySelector(".icon-btn");
    if (!c) return;
    c.click();
    await A.cho(90);
  }
};

const chot = await A.chotThat();
A.xoaLoi();
// dọn mọi truyện test còn sót (tên bắt đầu bằng ZZ) trước khi bắt đầu
for (const s of S.store.stories.slice()) {
  if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
}
await A.donRac();
await A.xoaZZ();

const that = root.aiTextPlugin;
let goi = [];
root.aiTextPlugin = (o) => {
  goi.push(o.instruction || "");
  return Promise.resolve({ text: "TÊN TRUYỆN: ZZ nháp\nMÔ TẢ: m\nBỐI CẢNH: b\nLUẬT: l\nNGƯỜI CHƠI TÊN: Bạn\nNGƯỜI CHƠI MÔ TẢ: n\nMỤC TIÊU CHƯƠNG 1: g\nNHÂN VẬT:\n- TÊN: A | VAI TRÒ: x | MÔ TẢ: m | TÍNH CÁCH: t | CÁCH NÓI: c | BÍ MẬT: s\n- TÊN: B | VAI TRÒ: y | MÔ TẢ: m | CÁCH NÓI: c | BÍ MẬT: s", stopReason: "stop" });
};

try {
  // ---------- 1. Tạo nhanh: tích ô BDSM rồi bấm "Dựng bản nháp" → phải hỏi 18+ TRƯỚC
  T.openNewStoryModal();
  await A.cho(150);
  let body = than();
  ghi("mở được hộp 'Cốt truyện mới'", !!body, { t: modalNu() && modalNu().textContent });
  const cb = body && body.querySelector('[data-f="qcbdsm"]');
  ghi("có ô tích BDSM trong Tạo nhanh", !!cb);
  if (cb) cb.checked = true;
  goi = [];
  await bam1(body && body.querySelector('[data-act="qc-dung"]'), "Dựng bản nháp", 300);
  ghi("Tạo nhanh BDSM: hộp xác nhận 18+ hiện ra", /người lớn/i.test((modalNu() || {}).textContent || ""), { t: modalNu() && modalNu().textContent });
  ghi("Tạo nhanh BDSM: CHƯA gọi AI khi chưa xác nhận", goi.length === 0, { n: goi.length });

  await A.bam("Huỷ");
  await A.cho(400);
  ghi("Tạo nhanh BDSM: huỷ xác nhận ⇒ ô tích bị bỏ", !!cb && cb.checked === false);
  ghi("Tạo nhanh BDSM: huỷ xác nhận ⇒ AI gọi KHÔNG kèm BDSM", goi.length === 1 && !/BDSM nam/.test(goi[0]), { n: goi.length, co: goi.length ? /BDSM nam/.test(goi[0]) : null });
  await dongHet();

  // ---------- 2. Tạo nhanh: xác nhận 18+ → lớp BDSM được gửi cho AI
  T.openNewStoryModal();
  await A.cho(150);
  body = than();
  if (body) body.querySelector('[data-f="qcbdsm"]').checked = true;
  goi = [];
  await bam1(body && body.querySelector('[data-act="qc-dung"]'), "Dựng bản nháp", 300);
  await A.bam("xác nhận 18");
  await A.cho(500);
  ghi("Tạo nhanh BDSM: xác nhận ⇒ AI gọi CÓ BDSM", goi.length === 1 && /BDSM nam/.test(goi[0]), { n: goi.length, co: goi.length ? /BDSM nam/.test(goi[0]) : null });

  // ---------- 3. "Tạo cốt truyện" khi chưa xác nhận → vẫn phải hỏi
  body = than();
  if (body) {
    body.__qc18 = false;
    body.__qcKq = { ten: "ZZ nhanh 18", moTa: "", boiCanh: "b", luat: "", mucTieu: "", nguoiChoiTen: "Bạn", nguoiChoiMoTa: "", nhanVats: [{ ten: "A", vaiTro: "x", moTa: "", tinhCach: "" }, { ten: "B", vaiTro: "y", moTa: "", tinhCach: "" }] };
    // bài kiểm thử ghi thẳng __qcKq nên phải đồng bộ luôn ô "Tên truyện" đã vẽ từ lượt trước
    const inTen = body.querySelector('[data-qc-f="ten"]');
    if (inTen) inTen.value = "ZZ nhanh 18";
    body.querySelector('[data-f="qcbdsm"]').checked = true;
  }
  const soTruoc = S.store.stories.length;
  await bam1(nutTrong(/Tạo cốt truyện/), "Tạo cốt truyện", 300);
  ghi("Tạo cốt truyện (nhanh): hộp 18+ hiện ra", /người lớn/i.test((modalNu() || {}).textContent || ""), { t: modalNu() && modalNu().textContent });
  ghi("Tạo cốt truyện (nhanh): chưa tạo truyện nào", S.store.stories.length === soTruoc, { soTruoc, sau: S.store.stories.length });
  await A.bam("Huỷ");
  await A.cho(400);
  ghi("Tạo cốt truyện (nhanh): huỷ 18+ ⇒ không tạo truyện", S.store.stories.length === soTruoc, { sau: S.store.stories.length });

  await bam1(nutTrong(/Tạo cốt truyện/), "Tạo cốt truyện (lần 2)", 300);
  await A.bam("xác nhận 18");
  await A.cho(400);
  // Cửa 18+ LẦN HAI ở đúng bước TẠO: phải LIỆT KÊ tên nhân vật sẽ được ghi cờ (đợt bổ sung).
  const m2 = modalNu();
  ghi(
    "Tạo cốt truyện (nhanh): cửa 18+ lần hai LIỆT KÊ tên nhân vật sẽ ghi cờ",
    !!m2 && (A.modalTren() ? A.modalTren().textContent.indexOf("Sẽ ghi cờ") >= 0 && A.modalTren().textContent.indexOf("A, B") >= 0 : false),
    { t: (A.modalTren() && A.modalTren().textContent || "").slice(0, 200) }
  );
  await A.bam("xác nhận 18");
  await A.cho(800);
  const moi = S.store.stories.find((s) => /ZZ nhanh 18/.test(s.ten || ""));
  ghi("Tạo cốt truyện (nhanh): xác nhận ⇒ truyện có giao kèo bật", !!moi && moi.giaoKeo.bat === true, { co: !!moi, bat: moi && moi.giaoKeo.bat, nl: moi && moi.giaoKeo.nguoiLon });
  ghi("Tạo cốt truyện (nhanh): nhân vật được ghi cờ đúng danh sách đã xác nhận", !!moi && moi.nhanVats.length === 2 && moi.nhanVats.every((c) => c.nguoiLon === true), { nl: moi && moi.nhanVats.map((c) => c.nguoiLon) });
  if (moi) { await S.deleteStory(moi.id); await A.cho(150); }
  await dongHet();

  // ---------- 4. Thể loại BDSM (không tích ô) cũng phải hỏi 18+
  T.openNewStoryModal();
  await A.cho(150);
  body = than();
  const theLoai = (root.TheLoai && root.TheLoai()) || [];
  const tlBdsm = theLoai.find((t) => t.bdsm);
  ghi("có thể loại BDSM trong dữ liệu", !!tlBdsm, { ten: tlBdsm && tlBdsm.ten });
  if (tlBdsm && body) {
    body.querySelector('[data-f="qcTheLoai"]').value = tlBdsm.id;
    body.querySelector('[data-f="qcbdsm"]').checked = false;
    goi = [];
    await bam1(body.querySelector('[data-act="qc-dung"]'), "Dựng bản nháp (thể loại BDSM)", 300);
    ghi("Thể loại BDSM (không tích ô): vẫn phải hỏi 18+", /người lớn/i.test((modalNu() || {}).textContent || ""), { t: modalNu() && modalNu().textContent });
    ghi("Thể loại BDSM: chưa gọi AI", goi.length === 0, { n: goi.length });
    await A.bam("Huỷ");
    await A.cho(400);
    ghi("Thể loại BDSM: huỷ ⇒ AI gọi KHÔNG kèm BDSM", goi.length === 1 && !/BDSM nam/.test(goi[0]), { n: goi.length, co: goi.length ? /BDSM nam/.test(goi[0]) : null });
  }
  await dongHet();

  // ---------- 5. Tuổi & người lớn
  await A.taoZZ();
  ghi("newCharacter mặc định KHÔNG phải người lớn", S.newCharacter({ id: "x", ten: "X" }).nguoiLon === false);
  ghi("laNguoiLon: thiếu tuổi ⇒ false", S.laNguoiLon({ ten: "X" }) === false);
  ghi("laNguoiLon: tuổi 17 (dù có cờ) ⇒ false", S.laNguoiLon({ ten: "X", tuoi: "17", nguoiLon: true }) === false);
  ghi("laNguoiLon: tuổi 31 + cờ ⇒ true", S.laNguoiLon({ ten: "X", tuoi: "31", nguoiLon: true }) === true);
  ghi("chanGiaoKeo: có nhân vật 17 tuổi ⇒ chặn", /dưới 18/.test(S.chanGiaoKeo({ nhanVats: [{ ten: "Trẻ", tuoi: "17" }] })));
  ghi("chanGiaoKeo: toàn người lớn ⇒ cho phép", S.chanGiaoKeo({ nhanVats: [{ ten: "A", tuoi: "31" }, { ten: "B", tuoi: "26" }] }) === "");

  // ---------- 6. Nhân vật 17 tuổi không giữ được cờ người lớn
  const st5 = S.getStory("ct_zz1");
  st5.nhanVats[0].tuoi = "17";
  st5.nhanVats[0].nguoiLon = true;
  await T.luuTruyen(st5);
  await T.loadStories();
  const st6 = S.getStory("ct_zz1");
  ghi("nhân vật 17 tuổi bị hạ cờ người lớn khi đọc lại", S.laNguoiLon(st6.nhanVats[0]) === false, { tuoi: st6.nhanVats[0].tuoi, nl: st6.nhanVats[0].nguoiLon });

  // ---------- 7. Giao kèo bị khoá khi truyện có nhân vật dưới 18
  st6.giaoKeo.bat = true;
  st6.giaoKeo.nguoiLon = true;
  await T.luuTruyen(st6);
  await T.loadStories();
  ghi("giao kèo bị KHOÁ khi truyện có nhân vật ghi tuổi dưới 18", S.getStory("ct_zz1").giaoKeo.bat === false, { bat: S.getStory("ct_zz1").giaoKeo.bat });
} catch (e) {
  kq.push({ ca: "NGOẠI LỆ: " + ((e && e.message) || e), dat: false });
}

root.aiTextPlugin = that;
await dongHet();
try { await A.xoaZZ(); } catch (e) {}
try {
  for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
} catch (e) {}
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0);
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };