// Kiểm thử GIAO DIỆN cho sổ hé lộ (page_eval; AI giả). Dựng truyện ct_zzhelo rồi chạy:
// ghi nguồn hé lộ → xoá tin nhắn nguồn → hé lộ lại → tạo nhánh → viết lại tin nhắn cuối
// → chỉnh mức trong Đạo diễn.
const S = await import("/src/store.js");
const TS = await import("/src/trangThai.js");
const TG = await import("/src/thoiGian.js");
const kq = [];
const ck = (ten, ok, them) => kq.push({ ten, ok: !!ok, them: them === undefined ? "" : (typeof them === "string" ? them : JSON.stringify(them)) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cho = async (fn, n = 80, ms = 250) => { for (let i = 0; i < n; i++) { try { const v = fn(); if (v) return v; } catch (e) {} await wait(ms); } return null; };
const ctSt = () => S.getStory("ct_zzhelo");
const kvSt = () => root.kv.cotTruyen.get("ct_zzhelo");
const evOf = (st, id) => TG.suKienCua(st).find((e) => e.id === id);
const tinNhan = (convId) => S.getMessages(convId).map((m) => ({ id: m.id, vai: m.vai, nvId: m.nvId, noiDung: m.noiDung }));
const cuoiAi = () => tinNhan("ht_za").filter((m) => m.vai === "ai").slice(-1)[0] || null;
const bam = (sel) => { const x = document.querySelector(sel); if (x) x.click(); return !!x; };
const gui = async (text) => {
  const truoc = tinNhan("ht_za").length;
  const ta = document.querySelector("#composerInput");
  if (!ta) return null;
  ta.value = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  bam('[data-act="send"]');
  return await cho(() => { const ds = tinNhan("ht_za"); return ds.length >= truoc + 2 ? ds : null; }, 60, 250);
};
const HELO = (ma) => "<<HELO: " + ma + ">>";

// ---- dọn dẹp & dựng lại
try { await S.deleteStory("ct_zzhelo"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_za"); } catch (e) {}
const st0 = S.chuanHoaTruyen({
  id: "ct_zzhelo",
  ten: "ZZ helo",
  boiCanh: "Một căn hộ nhỏ ở Hà Nội, hai người sống chung.",
  mode: "songSong",
  nguoiChoi: { ten: "Bạn", moTa: "" },
  daoDien: { bat: true, dinhChinh: [], huong: [] },
  nhanVats: [
    { id: "nv_za", ten: "Aria", moTa: "Bạn cùng nhà, kín đáo, hay để ý." },
    { id: "nv_zb", ten: "Borin", moTa: "Bạn cùng nhà, nóng tính, đang giấu nợ." },
  ],
  hoiThoais: [{ id: "ht_za", tieuDe: "Căn hộ", chuongId: null, nhanVatIds: ["nv_za", "nv_zb"], hienDien: ["nv_za"], khepGoc: 0 }],
  ngoaiManHinh: [
    { id: "vg_z1", luc: Date.now() - 3600000, loai: "ngoaiManHinh", hinhThuc: "đọc trộm", noiDung: "Aria lén đọc nhật ký của Borin và biết anh ta đang giấu một món nợ lớn.", thamGia: ["nv_za", "nv_zb"], biet: ["nv_za"], muc: "an", htId: "" },
    { id: "vg_z2", luc: Date.now() - 3500000, loai: "ngoaiManHinh", hinhThuc: "gọi điện", noiDung: "Borin gọi cho một chủ nợ và hứa sẽ bán căn hộ để trả tiền.", thamGia: ["nv_zb"], biet: ["nv_za"], muc: "an", htId: "" },
  ],
});
await root.kv.cotTruyen.set(st0.id, st0);
await root.kv.tinNhan.set("ht_za", [
  S.makeMessage("nguoi", "Anh về muộn thế?"),
  S.makeMessage("ai", "Ừ, anh mệt rồi. Em ngủ trước đi.", { nvId: "nv_za", ten: "Aria" }),
]);
await S.loadStories();

// ---- mở truyện
location.hash = "#ct=ct_zzhelo&ht=ht_za";
window.dispatchEvent(new HashChangeEvent("hashchange"));
const mo = await cho(() => document.querySelector('[data-act="send"]'), 60, 250);
ck("0 mở được truyện kiểm thử", !!mo && !!document.querySelector("#chatScroll"), { hash: location.hash });
ck("0b hai sự kiện gốc đang ẩn, chưa có nguồn", (() => { const a = evOf(ctSt(), "vg_z1"); const b = evOf(ctSt(), "vg_z2"); return a && b && a.muc === "an" && b.muc === "an" && (a.heLo || []).length === 0 && (b.heLo || []).length === 0; })());

// ---- AI giả (trả lời có kể ra chuyện đang ẩn)
window.__rec = { text: "Aria: Có chuyện này anh nên biết. Em đã đọc được cuốn sổ anh giấu. " + HELO("S1"), calls: [] };
root.aiTextPlugin = (o) => { window.__rec.calls.push(String((o && o.instruction) || "").slice(0, 40)); return Promise.resolve({ text: window.__rec.text, stopReason: "stop" }); };

const sau1 = await gui("Em có gì muốn nói với anh không?");
await wait(600);
const e1 = evOf(ctSt(), "vg_z1");
const kv1 = await kvSt();
const mA1 = cuoiAi();
ck("1 lượt gửi sinh được phản hồi AI", !!sau1, { so: sau1 ? sau1.length : -1 });
ck("2 ghi NGUỒN hé lộ: hội thoại + tin nhắn + người kể", !!(e1 && (e1.heLo || []).length === 1 && e1.heLo[0].htId === "ht_za" && e1.heLo[0].tnId === (mA1 && mA1.id) && e1.heLo[0].nvId === "nv_za"), e1 ? { heLo: e1.heLo, mAi: mA1 && mA1.id } : null);
ck("3 mức hiệu lực = đã lộ, người chơi biết", !!(e1 && e1.muc === "daLo" && e1.mucGoc === "an" && e1.biet.indexOf("nguoi") >= 0));
ck("4 dấu hiệu bị cắt khỏi nội dung hiển thị", !!(mA1 && !/HELO/i.test(mA1.noiDung)), mA1 ? mA1.noiDung.slice(0, 80) : null);
const kvEv1 = kv1 && (kv1.ngoaiManHinh || []).find((e) => e.id === "vg_z1");
ck("5 nguồn đã được LƯU xuống kv", !!(kvEv1 && (kvEv1.heLo || []).length === 1 && kvEv1.muc === "daLo"));

// ---- hé lộ LẦN HAI: đã lộ rồi thì không ghi thêm (mỗi sự kiện chỉ lộ một lần)
const sau2 = await gui("Anh xin lỗi, em kể hết đi.");
await wait(600);
const e1b = evOf(ctSt(), "vg_z1");
ck("6 lộ lần hai KHÔNG ghi thêm nguồn", !!(sau2 && (e1b.heLo || []).length === 1 && e1b.heLo[0].tnId === (mA1 && mA1.id)), e1b ? { heLo: e1b.heLo } : null);

// ---- xoá tin nhắn nguồn → mức phải quay về gốc
bam('[data-act="del-msg"][data-mid="' + (mA1 && mA1.id) + '"]');
await cho(() => !tinNhan("ht_za").some((m) => m.id === mA1.id), 40, 250);
await wait(500);
const e2 = evOf(ctSt(), "vg_z1");
const kv2 = await kvSt();
const kvEv2 = kv2 && (kv2.ngoaiManHinh || []).find((e) => e.id === "vg_z1");
ck("7 xoá tin nhắn nguồn → về mức gốc 'an'", !!(e2 && e2.muc === "an" && (e2.heLo || []).length === 0 && e2.biet.indexOf("nguoi") < 0), e2 ? { muc: e2.muc, heLo: e2.heLo, biet: e2.biet } : null);
ck("8 đã lưu lại trạng thái đó xuống kv", !!(kvEv2 && (kvEv2.heLo || []).length === 0 && kvEv2.muc === "an" && kvEv2.mucGoc === "an"));

// ---- hé lộ lại bằng tin nhắn MỚI (nguồn mới), rồi đẩy nó vào GIỮA hội thoại
const sau3 = await gui("Thôi được, em nói đi.");
await wait(700);
const e3 = evOf(ctSt(), "vg_z1");
const mA2 = cuoiAi();
ck("9 hé lộ lại được ghi nguồn MỚI", !!(sau3 && e3 && e3.muc === "daLo" && (e3.heLo || []).length === 1 && e3.heLo[0].tnId === (mA2 && mA2.id) && mA2.id !== (mA1 && mA1.id)), e3 ? { heLo: e3.heLo, mA2: mA2 && mA2.id } : null);
ck("10 tin nhắn hé lộ (tạm) là tin cuối", (() => { const ds = tinNhan("ht_za"); return ds.length >= 5 && ds[ds.length - 1].id === (mA2 && mA2.id); })());
window.__rec.text = "Aria: Không có gì đâu, anh ngủ đi.";
await gui("Ừ, chúc em ngủ ngon.");
await wait(500);
ck("11 tin nhắn hé lộ giờ nằm GIỮA hội thoại", (() => { const ds = tinNhan("ht_za"); const i = ds.findIndex((m) => m.id === (mA2 && mA2.id)); return i >= 0 && i < ds.length - 1; })(), { ds: tinNhan("ht_za").map((m) => m.vai + ":" + m.id.slice(-4)) });

// ---- tạo NHÁNH ngay tại tin nhắn hé lộ (lượt viết lại trong nhánh KHÔNG hé lộ lại)
bam('[data-act="regen-msg"][data-mid="' + (mA2 && mA2.id) + '"]');
const nut = await cho(() => [...document.querySelectorAll(".modal-foot button")].find((b) => /Tạo nhánh mới/.test(b.textContent)), 40, 200);
if (nut) nut.click();
const xong = await cho(() => { const s = ctSt(); return s && s.hoiThoais.length > 1 ? s : null; }, 60, 300);
await wait(1800);
const sNhanh = ctSt();
const convNhanh = sNhanh.hoiThoais.find((c) => /nhánh/.test(c.tieuDe || ""));
const evNhanh = (sNhanh.ngoaiManHinh || []).filter((e) => e.id !== "vg_z1" && e.id !== "vg_z2");
const evGoc = evOf(sNhanh, "vg_z1");
ck("12 tạo được nhánh mới", !!(convNhanh && xong), { soHt: sNhanh.hoiThoais.length });
// ĐỔI KỲ VỌNG (đợt audit phát hành): sự kiện TOÀN TRUYỆN không còn được sao chép sang
// nhánh nữa (sao chép = nhân đôi tác động). Nhánh dùng LỚP HÉ LỘ RIÊNG, nên ngoài hai
// sự kiện chuẩn ra thì nhánh KHÔNG có bản sao nào — và sự kiện vẫn ẩn trong nhánh này.
ck("13 nhánh KHÔNG sao chép sự kiện toàn truyện và KHÔNG thừa hưởng hé lộ sau điểm rẽ", !!(convNhanh && evNhanh.length === 0 && evGoc && TG.mucTrong(sNhanh, convNhanh, evGoc) === "an" && (sNhanh.ngoaiManHinh || []).filter((e) => !e.htId).length === 2), { them: evNhanh.map((e) => ({ id: e.id, muc: e.muc, htId: e.htId })), mucTrong: evGoc && convNhanh ? TG.mucTrong(sNhanh, convNhanh, evGoc) : null, toan: (sNhanh.ngoaiManHinh || []).filter((e) => !e.htId).length });
ck("14 bản gốc vẫn giữ nguyên lần hé lộ", !!(evGoc && evGoc.muc === "daLo" && (evGoc.heLo || []).length === 1 && evGoc.heLo[0].tnId === (mA2 && mA2.id)), evGoc ? { muc: evGoc.muc, heLo: evGoc.heLo } : null);

// ---- viết lại TIN NHẮN CUỐI: tin nhắn cũ mất ⇒ nguồn hé lộ của nó cũng mất
location.hash = "#ct=ct_zzhelo&ht=ht_za";
window.dispatchEvent(new HashChangeEvent("hashchange"));
await cho(() => document.querySelector("#composerInput"), 40, 250);
await wait(700);
window.__rec.text = "Aria: Em gọi cho chủ nợ rồi. Họ cho mình thêm hai tuần. " + HELO("S2");
await gui("Em vừa gọi cho ai à?");
await wait(700);
const mB = cuoiAi();
const truocVietLai = evOf(ctSt(), "vg_z2");
ck("15 hé lộ sự kiện thứ hai (S2) ghi đúng nguồn", !!(mB && truocVietLai && truocVietLai.muc === "daLo" && (truocVietLai.heLo || []).length === 1 && truocVietLai.heLo[0].tnId === mB.id), truocVietLai ? { muc: truocVietLai.muc, heLo: truocVietLai.heLo, mB: mB && mB.id } : null);
window.__rec.text = "Aria: Không có gì đâu anh.";
bam('[data-act="regen-msg"][data-mid="' + (mB && mB.id) + '"]');
await wait(2500);
const mB2 = cuoiAi();
const sauVietLai = evOf(ctSt(), "vg_z2");
const kvSauVietLai = await kvSt();
const kvEvB = kvSauVietLai && (kvSauVietLai.ngoaiManHinh || []).find((e) => e.id === "vg_z2");
ck("16 viết lại tin nhắn cuối → tin nhắn mới (id khác)", !!(mB2 && mB2.id !== mB.id));
ck("17 tin nhắn nguồn bị thay ⇒ sự kiện về lại mức gốc", !!(sauVietLai && sauVietLai.muc === "an" && (sauVietLai.heLo || []).length === 0), sauVietLai ? { muc: sauVietLai.muc, heLo: sauVietLai.heLo } : null);
ck("18 trạng thái đó cũng được lưu xuống kv", !!(kvEvB && (kvEvB.heLo || []).length === 0 && kvEvB.muc === "an"));

// ---- chỉnh mức bằng tay trong Đạo diễn (phải thắng sổ hé lộ)
const sm = await cho(() => document.querySelector('[data-act="story-menu"]'), 20, 200);
if (sm) sm.click();
await wait(400);
// Nút "Mở" nằm TRONG menu truyện vừa mở. Cố ý không lấy nút Đạo diễn ở header chat: nút đó
// đi qua bộ điều phối của màn chat, mà lúc này menu truyện đang che màn chat — đường đúng của
// bước này là nút của menu (đóng menu rồi mở màn Đạo diễn).
const nutDd = await cho(() => {
  const bd = document.querySelector("#modalRoot .modal-backdrop");
  return bd ? bd.querySelector('[data-act="open-dao-dien"]') : null;
}, 20, 200);
if (nutDd) nutDd.click();
await wait(1000);
const nutMuc = await cho(() => document.querySelector('[data-act="vg-muc"][data-id="vg_z1"][data-muc="an"]'), 30, 250);
if (nutMuc) nutMuc.click();
await wait(1000);
const e4 = evOf(ctSt(), "vg_z1");
const kv4 = await kvSt();
const kvEv4 = kv4 && (kv4.ngoaiManHinh || []).find((e) => e.id === "vg_z1");
ck("19 Đạo diễn chỉnh tay → chốt mức gốc, bỏ nguồn", !!(nutMuc && e4 && e4.mucGoc === "an" && e4.muc === "an" && (e4.heLo || []).length === 0), e4 ? { muc: e4.muc, mucGoc: e4.mucGoc, heLo: e4.heLo } : null);
ck("20 chỉnh tay cũng được lưu xuống kv", !!(kvEv4 && kvEv4.mucGoc === "an" && (kvEv4.heLo || []).length === 0));

// ---- dọn dẹp
[...document.querySelectorAll(".modal-backdrop")].forEach((b) => { const x = [...b.querySelectorAll(".modal-foot button")].find((y) => /^(Đóng|Huỷ)$/.test(y.textContent.trim())); if (x) x.click(); });
await wait(300);
try { await S.deleteStory("ct_zzhelo"); } catch (e) {}
try { await root.kv.tinNhan.delete("ht_za"); } catch (e) {}
delete S.store.messagesCache["ht_za"];
await S.loadStories();
window.__hlUiKq = kq;
return { kq: kq.map((x) => (x.ok ? "PASS " : "FAIL ") + x.ten + (x.ok ? "" : " :: " + x.them)), fail: kq.filter((x) => !x.ok).length, total: kq.length };
