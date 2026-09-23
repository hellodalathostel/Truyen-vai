// T4 — ảnh nhập không được chèn mã qua innerHTML (và mọi đường bật BDSM của file nhập).
const A = window.__A, T = A.T, S = A.S;
const NLC = String.fromCharCode(10);
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ...(ct ? { ct } : {}) });
const chot = await A.chotThat();
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
delete window.__x;

const DOC = 'x" onerror="window.__x=1';
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

// ---------- 1. laDataUrlAnh
ghi("laDataUrlAnh: nhận data URL PNG hợp lệ", !!S.laDataUrlAnh(PNG));
ghi("laDataUrlAnh: nhận https sạch", !!S.laDataUrlAnh("https://example.com/a.jpg"));
ghi("laDataUrlAnh: chặn chuỗi chèn thuộc tính", !S.laDataUrlAnh(DOC));
ghi("laDataUrlAnh: chặn javascript:", !S.laDataUrlAnh("javascript:alert(1)"));
ghi("laDataUrlAnh: chặn data:text/html", !S.laDataUrlAnh("data:text/html;base64,PHNjcmlwdD4="));
ghi("laDataUrlAnh: chặn data:image/svg+xml", !S.laDataUrlAnh("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="));
ghi("laDataUrlAnh: chặn URL có nháy", !S.laDataUrlAnh('https://e.com/a"onerror="x'));
ghi("laDataUrlAnh: chặn URL có khoảng trắng", !S.laDataUrlAnh("https://e.com/a b.jpg"));

// ---------- 2. chuanHoaTruyen xoá avatar nhân vật không hợp lệ
const rawA = { id: "ct_zz4", ten: "ZZ nhap 4", mode: "songSong", giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }), nhanVats: [ S.newCharacter({ id: "nv_z4", ten: "Zed", vaiTro: "bạn", tuoi: "30", nguoiLon: true, anh: DOC }) ] };
const stA = S.chuanHoaTruyen(rawA, { choNhap: true, dongY18: false });
ghi("chuanHoaTruyen: xoá avatar nhân vật không hợp lệ", stA.nhanVats[0].anh === "", { anh: stA.nhanVats[0].anh });
ghi("chuanHoaTruyen (choNhap, chưa xác nhận 18+): giao kèo bị khoá", stA.giaoKeo.bat === false, { bat: stA.giaoKeo.bat });
const stA2 = S.chuanHoaTruyen(JSON.parse(JSON.stringify(rawA)), { choNhap: true, dongY18: true });
ghi("chuanHoaTruyen (choNhap, đã xác nhận 18+): giữ avatar hợp lệ & giao kèo", stA2.giaoKeo.bat === true);

// ---------- 3. file nhập: ảnh sai bị BỎ khỏi lô ghi
const rawStory = { id: "ct_zz4", ten: "ZZ nhap 4", mode: "songSong", giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }), nguoiChoi: { ten: "Bạn", moTa: "" }, nhanVats: [ S.newCharacter({ id: "nv_z4", ten: "Zed", vaiTro: "bạn", tuoi: "30", nguoiLon: true, anh: DOC }) ], hoiThoais: [ S.newConversation({ id: "ht_z4", tieuDe: "Zed", nhanVatIds: ["nv_z4"], hienDien: ["nv_z4"] }) ], anh: [ { id: "anh_z4", chuThich: "x", convId: "ht_z4", luc: 0, prompt: "", loaiTru: "", phongCach: "", kichThuoc: "" } ] };
const f = { toanBo: false, list: [rawStory], messages: { ht_z4: [ S.makeMessage("nguoi", "Chào.", { id: "tn_z4a", luc: 1 }), S.makeMessage("anh", "Ảnh", { id: "tn_z4b", nvId: "nv_z4", ten: "Zed", anhId: "anh_z4", luc: 2 }) ] }, anh: { anh_z4: { id: "anh_z4", dataUrl: DOC, chuThich: "x", convId: "ht_z4", luc: 0 } } };
const chuan = await T.chuanNhap(JSON.parse(JSON.stringify(f)), "banSao", {});
ghi("chuanNhap (bản sao): BỎ ảnh có dataUrl không hợp lệ", Object.keys(chuan.viec[0].anh).length === 0, { k: Object.keys(chuan.viec[0].anh) });
const chuan2 = await T.chuanNhap(JSON.parse(JSON.stringify(f)), "ghiDe", {});
ghi("chuanNhap (ghi đè): BỎ ảnh có dataUrl không hợp lệ", Object.keys(chuan2.viec[0].anh).length === 0, { k: Object.keys(chuan2.viec[0].anh) });
const fOk = JSON.parse(JSON.stringify(f));
fOk.anh.anh_z4.dataUrl = PNG;
const chuan3 = await T.chuanNhap(fOk, "banSao", {});
ghi("đối chứng: dataUrl hợp lệ vẫn được giữ", Object.keys(chuan3.viec[0].anh).length === 1, { k: Object.keys(chuan3.viec[0].anh) });

// ---------- 4. nhập thật qua hộp thoại: cửa 18+ + không có mã chèn
const tieu = () => { const m = A.modalTren(); const t = m && m.querySelector(".modal-title"); return t ? t.textContent : ""; };
const soTruoc = S.store.stories.length;
T.openNhapTruyen(JSON.parse(JSON.stringify(f)), "zz-nhap.json");
await A.cho(250);
ghi("hộp 'Nhập truyện' hiện ra", /Nhập truyện/.test(tieu()), { t: tieu() });
await A.bam("Nhập");
await A.cho(350);
ghi("file có lớp BDSM: hỏi 18+ trước khi ghi", /người lớn/i.test(tieu()), { t: tieu() });
ghi("chưa xác nhận 18+ ⇒ chưa nhập gì", S.store.stories.length === soTruoc, { truoc: soTruoc, sau: S.store.stories.length });
await A.bam("Huỷ");
await A.cho(1000);
const st4 = S.store.stories.find((s) => s.ten === "ZZ nhap 4");
ghi("huỷ 18+ ⇒ vẫn nhập được nhưng BỎ lớp giao kèo", !!st4 && st4.giaoKeo.bat === false, { co: !!st4, bat: st4 && st4.giaoKeo.bat });
ghi("nhân vật trong file: avatar độc hại bị xoá", !!st4 && st4.nhanVats[0].anh === "", { anh: st4 && st4.nhanVats[0].anh });
let coXau = false;
for (const [k, v] of await root.kv.thuVienAnh.entries()) if (v && String(v.dataUrl || "").indexOf("onerror") >= 0) coXau = true;
ghi("thư viện ảnh không có bản ghi chứa payload", coXau === false, { coXau });
if (st4) {
  T.app.storyId = st4.id; T.app.convId = st4.hoiThoais[0].id; T.app.screen = "story";
  await T.loadMessages(st4.hoiThoais[0].id);
  T.render();
  await A.cho(200);
}
ghi("DOM: không có <img> mang thuộc tính sự kiện", document.querySelectorAll("img[onerror], img[onload], img[onerror]").length === 0, { n: document.querySelectorAll("img[onerror]").length });
ghi("DOM: không phần tử nào có thuộc tính sự kiện", [...document.querySelectorAll("#modalRoot *, #app *")].filter((el) => [...el.attributes].some((a) => /^on/i.test(a.name))).length === 0);
ghi("payload KHÔNG chạy (window.__x undefined)", window.__x === undefined, { x: window.__x });
ghi("DOM: không có chữ 'onerror=' lọt vào trang", (document.body.innerHTML || "").indexOf("onerror") < 0);

// ---------- soát hai truyện THẬT
ghi("truyện thật không bị đụng", A.soatThat(chot, await A.chotThat()).length === 0, A.soatThat(chot, await A.chotThat()));

// ---------- dọn
A.xoaLoi();
for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
try { await A.xoaZZ(); } catch (e) {}
try { await A.donRac(); } catch (e) {}
try { T.loadStories(); } catch (e) {}
delete window.__x;
const hong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: hong.length, dsHong: hong, kq };