// Thử tính cô lập: sửa bản B, xoá bản C — bản A phải y nguyên; B chỉ đổi đúng phần đã sửa.
const S = await import("/src/store.js");
await S.loadStories();
const snap = async (id) => {
  const s = JSON.parse(JSON.stringify(S.getStory(id)));
  const msgs = {};
  for (const c of s.hoiThoais) msgs[c.id] = (await root.kv.tinNhan.get(c.id)) || [];
  const anh = {};
  for (const a of s.anh) anh[a.id] = await root.kv.thuVienAnh.get(a.id);
  const msgsStr = JSON.stringify(msgs), anhStr = JSON.stringify(anh);
  return { story: JSON.stringify(s), msgs, msgsStr, anh, anhStr, convIds: s.hoiThoais.map((c) => c.id), anhIds: s.anh.map((a) => a.id) };
};
const ds = S.store.stories.filter((s) => /^ZZ Nhập/.test(s.ten || ""));
if (ds.length < 3) {
  // Trả về kết quả ĐẾM ĐƯỢC: nếu chỉ trả một khoá lạ thì bộ chạy coi như 0 ca và bộ này
  // LẶNG LẼ được tính là đạt — đúng cái bẫy đã xảy ra trước đây.
  return { soBan: ds.length, cungTt: false, A_nguyenVen: false, soLoi: 1, loi: ["cần 3 bản \"ZZ Nhập\" — đang có " + ds.length] };
}
const [A, B, C] = ds.map((s) => s.id);
const before = { A: await snap(A), B: await snap(B), C: await snap(C) };

// --- sửa bản B: thêm một tin nhắn + một ảnh mới
const b = S.getStory(B);
const convB = b.hoiThoais[0].id;
const arr = await S.loadMessages(convB);
arr.push(S.makeMessage("ai", "Kai thử một câu mới chỉ thuộc bản B.", { nvId: b.nhanVats[0].id, ten: b.nhanVats[0].ten }));
await S.persistMessages(convB);
const anhMoi = S.newAnh({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", prompt: "của B", chuThich: "ảnh riêng của B", convId: convB });
await S.luuAnh(b, anhMoi);
await S.saveStory(b);

// --- xoá bản C
await S.deleteStory(C);
await S.loadStories();

const afterA = await snap(A);
const afterB = await snap(B);
const conLai = S.store.stories.filter((s) => /^ZZ Nhập/.test(s.ten || "")).map((s) => s.id);
const tnKeys = (await root.kv.tinNhan.entries()).map(([k]) => k);
const anhKeys = (await root.kv.thuVienAnh.entries()).map(([k]) => k);
return {
  conLai,
  A_nguyenVen: afterA.story === before.A.story && afterA.msgsStr === before.A.msgsStr && afterA.anhStr === before.A.anhStr,
  A_msgCon: afterA.convIds.every((k) => tnKeys.indexOf(k) >= 0),
  A_anhCon: afterA.anhIds.every((k) => anhKeys.indexOf(k) >= 0),
  B_doiTinNhan: afterB.msgsStr !== before.B.msgsStr,
  B_doiAnh: afterB.anhStr !== before.B.anhStr,
  B_storyChiDoiAnh: (() => {
    const x = JSON.parse(before.B.story), y = JSON.parse(afterB.story);
    x.anh = y.anh; x.suaLuc = y.suaLuc;
    return JSON.stringify(x) === JSON.stringify(y);
  })(),
  B_giuNguyenTinNhanCu: before.B.msgs[before.B.convIds[0]].every((m) => afterB.msgs[before.B.convIds[0]].some((n) => n.id === m.id)),
  C_convDaXoa: before.C.convIds.every((k) => tnKeys.indexOf(k) < 0),
  C_anhDaXoa: before.C.anhIds.every((k) => anhKeys.indexOf(k) < 0),
  C_khongConTrongThuVien: !S.store.stories.some((s) => s.id === C),
  B_anhMoiCoThat: !!S.getStory(B).anh.find((a) => a.id === anhMoi.id),
  A_anhMoiKhongCo: !S.getStory(A).anh.some((a) => a.id === anhMoi.id),
};
