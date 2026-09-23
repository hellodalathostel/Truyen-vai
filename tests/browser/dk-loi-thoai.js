// Kiểm thử "Phân biệt đối thoại và hành động" (lớp hiển thị trong bong bóng chat).
// Chạy SAU khi đã nạp scratch/tests/audit-base.js (cần window.__A).
// Mọi so sánh đều so với nội dung GỐC để chắc rằng lớp hiển thị không sửa gì.
const A = window.__A;
if (!A) throw new Error("Thiếu __A — nạp audit-base.js trước");
const T = A.T, S = A.S;
const D = await import("/src/dom.js");
const NL = String.fromCharCode(10);
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ct });

const F = (t, bat) => D.fmtBongBong(t, bat === undefined ? true : bat);
const dem = (html, cls) => (html.match(new RegExp('class="' + cls + '"', "g")) || []).length;
const thuan = (html) => html.indexOf('class="dk-') === -1;

// ---------------------------------------------------------------- 1..7: bộ phân tích
const C1 = 'Anh đứng dậy và nhìn cô ấy. "Chào em."';
let h = F(C1);
ghi("1 chỉ đối thoại: KHÔNG có hành động", dem(h, "dk-hd") === 0, h);
ghi("1 chỉ đối thoại: có đúng 1 đối thoại", dem(h, "dk-dt") === 1, h);
ghi("1 phần thường giữ nguyên chữ", h.indexOf("Anh đứng dậy và nhìn cô ấy.") >= 0, h);

const C2 = "*Anh ta bước vào phòng, đặt chén trà xuống.*";
h = F(C2);
ghi("2 chỉ hành động: đúng 1 hành động", dem(h, "dk-hd") === 1, h);
ghi("2 chỉ hành động: không có đối thoại", dem(h, "dk-dt") === 0, h);
ghi("2 hành động: KHÔNG lộ dấu sao", h.indexOf("*") === -1, h);

const C3 = ['*Cô ấy đặt chén trà xuống bàn.* "Anh uống đi." *Rồi im lặng rất lâu.*'].join("");
h = F(C3);
ghi("3 xen kẽ: 2 hành động", dem(h, "dk-hd") === 2, h);
ghi("3 xen kẽ: 1 đối thoại", dem(h, "dk-dt") === 1, h);
ghi("3 xen kẽ: đúng thứ tự hành động → đối thoại → hành động", h.indexOf("dk-hd") < h.indexOf("dk-dt") && h.indexOf("dk-dt") < h.lastIndexOf("dk-hd"), h);

const C4 = ["- Câu một.", "- Câu hai.", "— Câu ba."].join(NL);
h = F(C4);
ghi("4 gạch ngang: 3 dòng đều là đối thoại", dem(h, "dk-dt") === 3, h);
ghi("4 gạch ngang: không có hành động", dem(h, "dk-hd") === 0, h);

ghi("5 chưa đóng (*): hiển thị như văn bản thường", thuan(F("*Cô ấy đang")), F("*Cô ấy đang"));
ghi("5 chưa đóng (\"): hiển thị như văn bản thường", thuan(F('Anh nói: "Chưa đóng')), F('Anh nói: "Chưa đóng'));
ghi("5 đóng lại thì định dạng ngay", dem(F('Anh nói: "Chưa đóng."'), "dk-dt") === 1, F('Anh nói: "Chưa đóng."'));
ghi("5 đóng lại (*) thì định dạng ngay", dem(F("*Cô ấy đang cười.*"), "dk-hd") === 1);
ghi("5 hành động không vượt dòng trống", thuan(F("*Mở" + NL + NL + "Đóng*")), F("*Mở" + NL + NL + "Đóng*"));

const C6 = ['Anh ấy cao 1m75' + String.fromCharCode(34) + ', nặng 55kg. 2*3*4 = 24.', "Anh ấy dùng * như một dấu * rời.", "_nghiêng_ giữ như cũ."].join(" ");
h = F(C6);
ghi("6 văn thường không bị định dạng nhầm", dem(h, "dk-hd") === 0 && dem(h, "dk-dt") === 0, h);
ghi("6 dấu sao rời không thành <em>", h.indexOf("<em> như một dấu </em>") === -1 && h.indexOf("2*3*4 = 24") >= 0 && h.indexOf("dùng * như một dấu * rời") >= 0, h);
ghi("6 _nghiêng_ của kiểu cũ vẫn chạy", h.indexOf("<em>nghiêng</em>") >= 0, h);

const C7 = ['Tớ thích cậu <3 và 2 < 10 <img src=x onerror=window.__dk_x=1>', '"lời thoại <b>x</b>"'].join(" ");
h = F(C7);
ghi("7 giữ nguyên chuỗi <3 và 2 < 10", h.indexOf("&lt;3") >= 0 && h.indexOf("2 &lt; 10") >= 0, h);
ghi("7 escape HTML độc hại", h.indexOf("<img") === -1 && h.indexOf("&lt;img src=x onerror=") >= 0, h);
ghi("7 payload chưa chạy", typeof window.__dk_x === "undefined");
ghi("7 escape cả trong đối thoại", h.indexOf("&quot;lời thoại &lt;b&gt;x&lt;/b&gt;&quot;") >= 0, h);

// ---------------------------------------------------------------- 8: công tắc
let story = null;
try {
  story = await A.taoZZ({ id: "ct_dk1", ten: "ZZ DK" });
  const NOI = ['*Cô ấy rót trà.* "Anh uống đi."', "- Em chờ lâu rồi.", "*Anh im lặng.*"].join(NL);
  const NOI_HTML = 'Tớ thích cậu <3 và 2 < 10 <img src=x onerror=window.__dk_x2=1>';
  const msgs = await root.kv.tinNhan.get("ht_z1");
  msgs.push(S.makeMessage("nguoi", NOI, { id: "tn_dk1" }));
  msgs.push(S.makeMessage("ai", NOI_HTML, { id: "tn_dk2", nvId: "nv_z1", ten: "Zara" }));
  await root.kv.tinNhan.set("ht_z1", msgs);
  delete S.store.messagesCache["ht_z1"];
  await T.loadStories();
  T.app.storyId = "ct_dk1";
  T.app.convId = "ht_z1";
  T.app.screen = "story";
  await T.loadMessages("ht_z1");
  T.render();
  await A.cho(220);

  const m1 = document.querySelector('[data-mid="tn_dk1"]');
  const m2 = document.querySelector('[data-mid="tn_dk2"]');
  ghi("8 mặc định BẬT: bong bóng có phân đoạn", S.store.settings.phanBietLoiThoai !== false && m1.querySelectorAll(".dk-hd").length === 2 && m1.querySelectorAll(".dk-dt").length === 2, { hd: m1.querySelectorAll(".dk-hd").length, dt: m1.querySelectorAll(".dk-dt").length });
  const cssHd = getComputedStyle(m1.querySelector(".dk-hd"));
  const cssDt = getComputedStyle(m1.querySelector(".dk-dt"));
  const cssThuong = getComputedStyle(m1.querySelector(".msg-text"));
  ghi("8 hành động: nghiêng + màu phụ (khác chữ thường)", cssHd.fontStyle === "italic" && cssHd.color !== cssThuong.color, { hd: cssHd.fontStyle + " " + cssHd.color, thuong: cssThuong.color });
  ghi("8 đối thoại: kiểu thường + màu khác chữ thường", cssDt.fontStyle === "normal" && cssDt.color !== cssThuong.color, { dt: cssDt.fontStyle + " " + cssDt.color, thuong: cssThuong.color });
  ghi("8 ảnh độc hại trong tin: không dựng phần tử", !document.querySelector('[data-mid="tn_dk2"] img') && typeof window.__dk_x2 === "undefined");

  // tắt qua giao diện Cài đặt
  document.querySelector(".chat-more-btn").click();
  await A.cho(120);
  document.querySelector('[data-act="open-settings"]').click();
  await A.cho(300);
  const cb = document.querySelector('#modalRoot [data-s="phanBietLoiThoai"]');
  ghi("8 Cài đặt mở được từ menu ⋯", !!cb);
  ghi("8 công tắc mặc định BẬT", cb && cb.checked === true);
  cb.checked = false;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await A.cho(280);
  ghi("8 tắt: có hiệu lực NGAY (không còn phân đoạn)", document.querySelectorAll(".dk-hd").length === 0 && document.querySelectorAll(".dk-dt").length === 0);
  ghi("8 tắt: vẫn hiển thị đủ nội dung", (m1Again("tn_dk1") || "").indexOf("Em chờ lâu rồi") >= 0 && (m1Again("tn_dk1") || "").indexOf("Anh uống đi") >= 0, m1Again("tn_dk1"));
  ghi("8 tắt: kv vẫn nguyên bản", (await root.kv.tinNhan.get("ht_z1")).find((x) => x.id === "tn_dk1").noiDung === NOI);
  ghi("8 tắt: đã ghi vào cài đặt", JSON.parse(localStorage.getItem("truyenVai.caiDat")).phanBietLoiThoai === false);
  cb.checked = true;
  cb.dispatchEvent(new Event("change", { bubbles: true }));
  await A.cho(280);
  ghi("8 bật lại: có hiệu lực ngay", document.querySelector('[data-mid="tn_dk1"]').querySelectorAll(".dk-hd").length === 2);
  ghi("8 hộp Cài đặt vẫn mở khi đổi công tắc", !!document.querySelector('#modalRoot [data-s="phanBietLoiThoai"]'));
  document.querySelector("#modalRoot .modal-foot .btn").click();
  await A.cho(150);

  // ---------------------------------------------------------------- 9: copy/sửa/xuất nguyên bản
  let copied = null;
  const cw = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (t) => { copied = t; };
  document.querySelector('[data-act="copy-msg"][data-mid="tn_dk1"]').click();
  await A.cho(200);
  ghi("9 sao chép trả nguyên bản", copied === NOI, copied);
  navigator.clipboard.writeText = cw;

  document.querySelector('[data-act="edit-msg"][data-mid="tn_dk1"]').click();
  await A.cho(200);
  const ta = document.querySelector("[data-edit-input]");
  ghi("9 ô sửa chứa nguyên bản", ta && ta.value === NOI);
  document.querySelector('[data-act="cancel-edit"]').click();
  await A.cho(150);

  const blobs = [];
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (b) { blobs.push(b); return orig.call(URL, b); };
  await T.xuatTruyen(S.getStory("ct_dk1"));
  await A.cho(300);
  URL.createObjectURL = orig;
  let xuatDung = false, xuatCoSao = false;
  if (blobs.length) {
    const j = JSON.parse(await blobs[0].text());
    const ex = (j.messages["ht_z1"] || []).find((x) => x.id === "tn_dk1");
    xuatDung = !!ex && ex.noiDung === NOI;
    xuatCoSao = !!ex && ex.noiDung.indexOf("*") === 0;
  }
  ghi("9 xuất truyện trả nguyên bản (còn dấu sao)", xuatDung && xuatCoSao, { soBlob: blobs.length });
  ghi("9 kv vẫn nguyên bản", (await root.kv.tinNhan.get("ht_z1")).find((x) => x.id === "tn_dk1").noiDung === NOI);

  // ---------------------------------------------------------------- 10: bề rộng
  const doRong = () => {
    const m = document.querySelector('[data-mid="tn_dk1"]');
    const sc = document.querySelector(".chat-scroll");
    return { w: Math.round(m.getBoundingClientRect().width), tran: document.documentElement.scrollWidth - innerWidth, tranTrong: sc.scrollWidth - sc.clientWidth };
  };
  const w1 = doRong();
  S.store.settings.phanBietLoiThoai = false; T.render(); await A.cho(220);
  const w0 = doRong();
  S.store.settings.phanBietLoiThoai = true; T.render(); await A.cho(220);
  const w2 = doRong();
  ghi("10 bật/tắt không đổi bề rộng bong bóng", w1.w === w0.w && w2.w === w1.w, { on: w1, off: w0, on2: w2 });
  ghi("10 không tràn ngang (cả trong khung chat)", w1.tran <= 0 && w1.tranTrong <= 0, w1);
} finally {
  if (story) { try { await A.xoaZZ("ct_dk1"); } catch (e) {} }
  for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
  await T.loadStories();
}

function m1Again(mid) {
  const el = document.querySelector('[data-mid="' + mid + '"] .msg-text');
  return el ? el.textContent : null;
}

const dsHong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: dsHong.length, dsHong: dsHong.map((x) => x.ca + " :: " + JSON.stringify(x.ct)), kq };
