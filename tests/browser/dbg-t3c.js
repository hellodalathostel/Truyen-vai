const A = window.__A, T = A.T, S = A.S;
const lg = [];
const nut = (m) => m ? Array.from(m.querySelectorAll('.modal-foot .btn')).map((b) => b.textContent.trim()) : null;
const tieu = (m) => m ? ((m.querySelector('.modal-title') || {}).textContent || '') : null;
const than = () => { const m = A.modalTren(); const mb = m && m.querySelector('.modal-body'); return mb && (mb.firstElementChild || mb); };
const snap = (nhan) => lg.push({ nhan, m: tieu(A.modalTren()), nut: nut(A.modalTren()), so: S.store.stories.length, ten: S.store.stories.map((s)=>s.ten) });
const that = root.aiTextPlugin;
root.aiTextPlugin = (o) => Promise.resolve({ text: 'TÊN TRUYỆN: ZZ nháp' + String.fromCharCode(10) + 'MÔ TẢ: m' + String.fromCharCode(10) + 'BỐI CẢNH: b' + String.fromCharCode(10) + 'LUẬT: l' + String.fromCharCode(10) + 'NGƯỜI CHƠI TÊN: Bạn' + String.fromCharCode(10) + 'NGƯỜI CHƠI MÔ TẢ: n' + String.fromCharCode(10) + 'MỤC TIÊU CHƯƠNG 1: g' + String.fromCharCode(10) + 'NHÂN VẬT:' + String.fromCharCode(10) + '- TÊN: A | VAI TRÒ: x | MÔ TẢ: m | TÍNH CÁCH: t | CÁCH NÓI: c | BÍ MẬT: s', stopReason: 'stop' });
try {
  T.openNewStoryModal(); await A.cho(200);
  let body = than(); snap('mở hộp mới');
  body.querySelector('[data-f="qcbdsm"]').checked = true;
  body.querySelector('[data-act="qc-dung"]').click(); await A.cho(300); snap('sau khi bấm Dựng (18+ chờ)');
  await A.bam('Huỷ'); await A.cho(400); snap('sau khi Huỷ');
  body = than();
  body.__qcKq = { ten: 'ZZ nhanh 18', moTa: '', boiCanh: 'b', luat: '', mucTieu: '', nguoiChoiTen: 'Bạn', nguoiChoiMoTa: '', nhanVats: [{ ten: 'A', vaiTro: 'x', moTa: '', tinhCach: '' }] };
  body.querySelector('[data-f="qcbdsm"]').checked = true; body.__qc18 = false;
  const m2 = A.modalTren();
  const bTao = Array.from(m2.querySelectorAll('.modal-foot .btn')).find((b) => /Tạo cốt truyện/.test(b.textContent || ''));
  lg.push({ nhan: 'tìm nút Tạo cốt truyện', thay: !!bTao, nut: nut(m2) });
  bTao.click(); await A.cho(350); snap('sau khi bấm Tạo cốt truyện');
  const r = await A.bam('xác nhận 18'); lg.push({ nhan: 'bấm xác nhận 18', r });
  await A.cho(1200); snap('sau xác nhận + 1.2s');
  const st = S.store.stories.filter((s) => /ZZ/.test(s.ten || '')).map((s) => ({ id: s.id, ten: s.ten, bat: s.giaoKeo && s.giaoKeo.bat }));
  lg.push({ nhan: 'truyện ZZ', st });
} catch (e) { lg.push({ nhan: 'NGOẠI LỆ: ' + ((e && e.message) || e) }); }
root.aiTextPlugin = that;
try { const m = A.modalTren(); if (m) { const c = m.querySelector('.icon-btn'); if (c) c.click(); } } catch (e) {}
await A.cho(200);
for (const s of S.store.stories.slice()) { if (/^ZZ/.test(s.ten || '')) { try { await S.deleteStory(s.id); } catch (e) {} } }
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
return { lg, stories: S.store.stories.map((s) => s.ten) };