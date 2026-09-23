// Kiểm thử LOGIC sổ hé lộ (chạy trong page_eval; file không kết thúc bằng return).
const S = await import("/src/store.js");
const TG = await import("/src/thoiGian.js");
const kq = [];
const ck = (ten, ok, them) => kq.push({ ten, ok: !!ok, them: them === undefined ? "" : them });
const sao = (x) => JSON.parse(JSON.stringify(x));

const mk = (ev) => {
  const raw = {
    id: "ct_zzhelo",
    ten: "ZZ helo",
    mode: "songSong",
    nhanVats: [{ id: "nv_za", ten: "Aria" }, { id: "nv_zb", ten: "Borin" }],
    hoiThoais: [
      { id: "ht_za", tieuDe: "A", nhanVatIds: ["nv_za", "nv_zb"], hienDien: ["nv_za", "nv_zb"] },
      { id: "ht_zb", tieuDe: "B", nhanVatIds: ["nv_za"], hienDien: ["nv_za"] },
    ],
    ngoaiManHinh: [ev],
  };
  return S.chuanHoaTruyen(raw);
};
const evGoc = (them) => Object.assign({
  id: "vg_z1",
  luc: 1000,
  loai: "ngoaiManHinh",
  noiDung: "Aria và Borin cãi nhau sau lưng người chơi.",
  thamGia: ["nv_za", "nv_zb"],
  biet: ["nv_za", "nv_zb"],
  muc: "an",
  htId: "ht_za",
}, them || {});
const MSGS = [{ id: "tn_zz0" }, { id: "tn_zz1" }];

// 1. Mặc định: ẩn, chưa có nguồn nào
let st = mk(evGoc());
let e = TG.suKienCua(st)[0];
ck("1 mức gốc 'an', chưa có hé lộ", e.muc === "an" && e.mucGoc === "an" && (e.heLo || []).length === 0, { muc: e.muc, mucGoc: e.mucGoc, heLo: e.heLo, biet: e.biet });

// 2. Ghi nguồn hé lộ (tin nhắn còn) → đã lộ, người chơi biết
e.heLo.push({ htId: "ht_za", tnId: "tn_zz1", nvId: "nv_za", luc: 2000 });
let doi = TG.tinhLaiBiet(st, { ht_za: MSGS });
e = TG.suKienCua(st)[0];
// Chuẩn hoá đã tự suy ra "đã lộ" từ sổ hé lộ, nên tinhLaiBiet không cần sửa gì (doi = false).
ck("2 có nguồn → đã lộ + người chơi biết", e.muc === "daLo" && e.biet.indexOf("nguoi") >= 0 && e.biet.indexOf("nv_za") >= 0, { muc: e.muc, biet: e.biet, doi });

// 3. Xoá tin nhắn nguồn → về mức gốc, nguồn chết bị dọn
doi = TG.tinhLaiBiet(st, { ht_za: [{ id: "tn_zz0" }] });
e = TG.suKienCua(st)[0];
ck("3 mất tin nhắn nguồn → về 'an'", doi && e.muc === "an" && (e.heLo || []).length === 0 && e.biet.indexOf("nguoi") < 0 && e.biet.indexOf("nv_za") >= 0, { muc: e.muc, heLo: e.heLo, biet: e.biet });

// 4. Không hồi sinh sau khi chuẩn hoá lại (dữ liệu đã lưu)
let st2 = S.chuanHoaTruyen(sao(st));
let e2 = TG.suKienCua(st2)[0];
ck("4 chuẩn hoá lại vẫn 'an' (không hồi sinh)", e2.muc === "an" && (e2.heLo || []).length === 0, { muc: e2.muc });

// 5. Hội thoại khác chưa nạp → nguồn vẫn tính (thiếu dữ liệu ≠ mất)
st = mk(evGoc());
e = TG.suKienCua(st)[0];
e.heLo.push({ htId: "ht_zb", tnId: "tn_zz9", nvId: "nv_za", luc: 1 });
TG.tinhLaiBiet(st, { ht_za: MSGS });
e = TG.suKienCua(st)[0];
ck("5 nguồn ở hội thoại chưa nạp vẫn tính", e.muc === "daLo" && e.heLo.length === 1, { muc: e.muc, heLo: e.heLo });

// 6. Chỉnh tay (Đạo diễn) thắng sổ hé lộ: ghi mức gốc + bỏ nguồn
e.mucGoc = "an";
e.heLo = [];
TG.suKienCua(st);
e = TG.suKienCua(st)[0];
ck("6 chỉnh tay chốt mức, bỏ nguồn tự động", e.muc === "an" && e.biet.indexOf("nguoi") < 0, { muc: e.muc, biet: e.biet });

// 7. Mức gốc "đã lộ" (kế hoạch AI) không cần nguồn — tương thích dữ liệu cũ
st = mk(evGoc({ muc: "daLo", biet: ["nv_za", "nv_zb"] }));
e = TG.suKienCua(st)[0];
ck("7 kế hoạch đặt 'đã lộ' giữ nguyên", e.muc === "daLo" && e.mucGoc === "daLo" && e.biet.indexOf("nguoi") >= 0, { muc: e.muc, mucGoc: e.mucGoc, biet: e.biet });
// và nguồn chết không kéo nó về ẩn (vì mức gốc đã là "đã lộ")
e.heLo.push({ htId: "ht_za", tnId: "tn_zz1", nvId: "nv_za", luc: 2 });
TG.tinhLaiBiet(st, { ht_za: [{ id: "tn_zz0" }] });
e = TG.suKienCua(st)[0];
ck("7b nguồn chết nhưng mức gốc 'đã lộ' vẫn 'đã lộ'", e.muc === "daLo" && e.heLo.length === 0, { muc: e.muc, heLo: e.heLo });

// 8. Mức gốc "hé lộ một phần": lộ ra → đã lộ, mất nguồn → về "hé lộ một phần"
st = mk(evGoc({ muc: "heLo" }));
e = TG.suKienCua(st)[0];
e.heLo.push({ htId: "ht_za", tnId: "tn_zz1", nvId: "nv_za", luc: 2 });
TG.tinhLaiBiet(st, { ht_za: MSGS });
const sauKhiLo = TG.suKienCua(st)[0].muc;
TG.tinhLaiBiet(st, { ht_za: [{ id: "tn_zz0" }] });
e = TG.suKienCua(st)[0];
ck("8 'heLo' → 'daLo' → về 'heLo'", sauKhiLo === "daLo" && e.muc === "heLo" && e.biet.indexOf("nguoi") < 0, { sauKhiLo, muc: e.muc });

// 9. Sổ hé lộ lọc nguồn rác khi chuẩn hoá (thiếu htId/tnId)
st = mk(evGoc({ heLo: [{ tnId: "tn_zz1" }, { htId: "ht_za" }, { htId: "ht_za", tnId: "tn_zz1", nvId: "nv_za" }, null] }));
e = TG.suKienCua(st)[0];
ck("9 bỏ nguồn rác, giữ nguồn hợp lệ", e.heLo.length === 1 && e.muc === "daLo", { heLo: e.heLo, muc: e.muc });

// 10. tinhLaiBiet không đụng gì khi đã đúng (không đánh dấu sửa vô cớ)
st = mk(evGoc());
e = TG.suKienCua(st)[0];
const doiLan1 = TG.tinhLaiBiet(st, { ht_za: MSGS });
const suaLuc1 = TG.suKienCua(st)[0].suaLuc;
const doiLan2 = TG.tinhLaiBiet(st, { ht_za: MSGS });
ck("10 gọi lại không thay đổi gì", doiLan1 === false && doiLan2 === false && TG.suKienCua(st)[0].suaLuc === suaLuc1, { doiLan1, doiLan2 });

window.__hlKq = kq;
return kq;
