// TV-01/TV-02 — KV/DOM thật, dữ liệu hư cấu; không gọi AI.
const S = await import("/src/store.js");
const T = window.__tv_test;
const kq = [];
const chk = (ten, ok) => kq.push({ ten, ok: !!ok });
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const duoi = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const id = "ct_zzrel_" + duoi, ht = "ht_zzrel_" + duoi;
const hongId = "ct_zzrel_hong_" + duoi + '<img id="zzrel-injection">';
const tnHong = "ht_zzrel_hong_" + duoi;
const anhHong = "anh_zzrel_hong_" + duoi;
const truoc = { storyId: T.app.storyId, convId: T.app.convId, screen: T.app.screen };
const createCu = URL.createObjectURL, clickCu = HTMLAnchorElement.prototype.click;
let blob = null;
URL.createObjectURL = (b) => { blob = b; return createCu.call(URL, new Blob([""])); };
HTMLAnchorElement.prototype.click = function () { if (!this.download) return clickCu.apply(this, arguments); };
const dong = () => {
  const ds = Array.from(document.querySelectorAll("#modalRoot .modal-backdrop"));
  for (let i = ds.length - 1; i >= 0; i--) { const b = ds[i].querySelector(".modal-head button"); if (b) b.click(); }
};

try {
  const story = S.chuanHoaTruyen({ id, ten: "ZZ Kiểm tra độ tin cậy", mode: "songSong", nhanVats: [], hoiThoais: [], chuongs: [] });
  story.hoiThoais = [S.newConversation({ id: ht, tieuDe: "ZZ Hội thoại dài", tomTat: "ZZ Phần đã tóm tắt", tomTatDen: 9992 })];
  const tin = Array.from({ length: 10000 }, (_, i) => ({ id: "tn_zzrel_" + duoi + "_" + i, vai: i % 2 ? "ai" : "nguoi", noiDung: "ZZ Nội dung " + i, luc: i + 1 }));
  await root.kv.cotTruyen.set(id, story);
  await S.replaceMessages(ht, tin);
  delete S.store.messagesCache[ht];
  const nap = await S.loadMessages(ht);
  chk("TV-01: KV nạp lại đủ 10000 tin", nap.length === 10000);
  chk("TV-01: giữ đúng tin đầu và cuối", nap[0].noiDung === "ZZ Nội dung 0" && nap[9999].noiDung === "ZZ Nội dung 9999");
  chk("TV-01: mốc tóm tắt không bỏ tin", T.AI.selectVerbatim(story.hoiThoais[0], nap)[0].noiDung === "ZZ Nội dung 9992");
  await S.loadStories();
  blob = null; await T.xuatTruyen(S.getStory(id));
  chk("TV-01: xuất tệp thật có đủ lịch sử", !!blob);
  const xuat = JSON.parse(await blob.text());
  chk("TV-01: JSON xuất chứa đủ 10000 tin", xuat.messages[ht].length === 10000);
  const ban = T.capIdMoi(S.napBanGhi(xuat.story, "truyen"), xuat.messages, xuat.anh, xuat.ngoaiHinh);
  const htMoi = ban.story.hoiThoais[0].id;
  chk("TV-01: bản sao có mã riêng và đủ nội dung", htMoi !== ht && ban.messages[htMoi].length === 10000 && ban.messages[htMoi][0].noiDung === tin[0].noiDung);
  chk("TV-01: bản sao giữ mốc tóm tắt", ban.story.hoiThoais[0].tomTatDen === 9992);

  const hong = Object.assign({}, story, { id: hongId, ten: "ZZ Bản cần phục hồi", nhanVats: "ZZ sai kiểu", hoiThoais: [{ id: tnHong }], anh: [{ id: anhHong }] });
  await root.kv.cotTruyen.set(hongId, hong);
  await root.kv.tinNhan.set(tnHong, [{ id: "tn_zzrel_can_giu", vai: "nguoi", noiDung: "ZZ Cần giữ" }]);
  await root.kv.thuVienAnh.set(anhHong, { id: anhHong, dataUrl: "ZZ dữ liệu hỏng cần giữ" });
  await S.loadStories();
  T.app.storyId = null; T.app.convId = null; T.app.screen = "library"; T.render();
  chk("TV-02: truyện tốt vẫn xuất hiện", !!document.querySelector('[data-act="open-story"][data-id="' + id + '"]'));
  chk("TV-02: có lối mở phục hồi", !!document.querySelector('[data-act="open-recovery"]'));
  chk("TV-02: bản hỏng được cách ly", !S.getStory(hongId) && S.store.truyenCanPhucHoi.some((x) => x.id === hongId));
  document.querySelector('[data-act="open-recovery"]').click(); await cho(30);
  chk("TV-02: modal phục hồi mở được", !!document.querySelector('[role="dialog"][aria-label="Dữ liệu cần phục hồi"]'));
  chk("TV-02: mã bản hỏng được escape", !document.querySelector("#zzrel-injection"));
  const mocCu = S.store.settings.xuatLuc;
  blob = null; await T.xuatTatCa();
  chk("TV-02: không xuất bản sao lưu thường thiếu bản hỏng", blob === null && S.store.settings.xuatLuc === mocCu);
  blob = null; await T.xuatCuuDuLieu();
  const cuu = JSON.parse(await blob.text());
  chk("TV-02: tệp cứu dữ liệu giữ nguyên bản hỏng", cuu.type === "truyen-vai-rescue" && JSON.stringify(cuu.kho.cotTruyen.find((x) => x[0] === hongId)[1]) === JSON.stringify(hong));
  chk("TV-02: cứu cả tin nhắn và ảnh của bản hỏng", cuu.kho.tinNhan.some((x) => x[0] === tnHong) && cuu.kho.thuVienAnh.some((x) => x[0] === anhHong));
  const bc = await T.chayTuKiemTra();
  chk("TV-02: tạm dừng sửa tự động khi có bản hỏng", bc.tamDungSua === true);
  chk("TV-02: không kết luận tin/ảnh của bản hỏng là mồ côi", !(bc.nhom["tin-nhan-mo-coi"] || []).some((x) => x.id === tnHong) && !(bc.nhom["anh-mo-coi"] || []).some((x) => x.id === anhHong));
  const sua = await T.suaBatBien({ nhom: { "tin-nhan-mo-coi": [{ id: tnHong }], "anh-mo-coi": [{ id: anhHong }] } });
  chk("TV-02: gọi sửa trực tiếp cũng không xoá dữ liệu", !sua.ok && !!(await root.kv.tinNhan.get(tnHong)) && !!(await root.kv.thuVienAnh.get(anhHong)));
  chk("TV-02: KV giữ nguyên bản gốc sau mọi thao tác", JSON.stringify(await root.kv.cotTruyen.get(hongId)) === JSON.stringify(hong));
} finally {
  dong(); URL.createObjectURL = createCu; HTMLAnchorElement.prototype.click = clickCu;
  await root.kv.cotTruyen.delete(id); await root.kv.cotTruyen.delete(hongId);
  await root.kv.tinNhan.delete(ht); await root.kv.tinNhan.delete(tnHong); await root.kv.thuVienAnh.delete(anhHong);
  delete S.store.messagesCache[ht]; delete S.store.messagesCache[tnHong]; delete S.store.anhCache[anhHong];
  S.xoaLoiHinhDang(); await S.loadStories();
  Object.assign(T.app, truoc);
  if (T.app.storyId && !S.getStory(T.app.storyId)) { T.app.storyId = null; T.app.convId = null; T.app.screen = "library"; }
  T.render();
}
return kq;
