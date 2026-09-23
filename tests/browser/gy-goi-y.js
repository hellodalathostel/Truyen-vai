// Kiểm thử luồng "Gợi ý lời đáp" (khối riêng, KHÔNG nằm trong Trạng thái cảnh).
// Chạy SAU khi đã nạp scratch/tests/audit-base.js VÀ sau khi đã cài AI giả ở một
// page_eval RIÊNG (scratch/tests/gy-fake-ai.js).
const A = window.__A;
if (!A) throw new Error("Thiếu __A — nạp audit-base.js trước");
const T = A.T, S = A.S;
const FAKE = window.__GY_AI;
if (!FAKE) throw new Error("Thiếu AI giả — nạp gy-fake-ai.js ở eval riêng trước");
const kq = [];
const ghi = (ca, dat, ct) => kq.push({ ca, dat: !!dat, ct: ct === undefined ? null : ct });
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const cho = (ms) => A.cho(ms);
const bam = (sel, nhan) => {
  const el = $(sel);
  if (!el) {
    const g = $(".goi-y");
    throw new Error("không thấy nút " + (nhan || sel) + " || dk=" + (window.__A ? window.__A.T.app.suggDangTao : "?") +
      " stream=" + (window.__A ? window.__A.T.app.streaming : "?") + " || goi-y=" + (g ? g.outerHTML.slice(0, 420) : "KHÔNG CÓ"));
  }
  el.click();
};
const doi = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 6000)) { if (fn()) return true; await cho(60); } return false; };
const doiA = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 6000)) { if (await fn()) return true; await cho(80); } return false; };
// Chờ lượt tạo gợi ý kết thúc HẲN (app.suggDangTao) — dòng lỗi biến mất ngay lúc bắt đầu
// lượt mới nên không thể dùng nó làm dấu hiệu "đã xong".
const choXong = () => doi(() => !T.app.suggDangTao, 10000);
const oThe = () => $$(".goi-y-card").map((c) => c.textContent);
const VW = window.innerWidth;

const NEN =
  "Câu này cố tình viết rất dài để chắc chắn thẻ gợi ý phải tự xuống dòng chứ không được cắt bớt bằng dấu ba chấm.";
const GY = [
  "Tớ đứng dậy rót thêm trà rồi đẩy chén về phía cậu. " + NEN,
  "Tớ lùi lại nửa bước. " + NEN + " (hướng hành động, khác hẳn về ý định và cảm xúc)",
  String.fromCharCode(34) + "Không. Tớ không muốn nghe thêm nữa." + String.fromCharCode(34) + " " + NEN + " (lời từ chối)",
];
const GY2 = [
  "Một câu hỏi mới toanh số một — " + NEN,
  "Một hành động mới toanh số hai — " + NEN,
  "Một lời thú nhận mới toanh số ba — " + NEN,
];
const datGY = (ds) => {
  FAKE.mode = "ok";
  FAKE.delay = 0;
  FAKE.text = ds.map((t) => "- " + t).join(String.fromCharCode(10));
};
const NGUON = JSON.stringify(GY);
const NGUON2 = JSON.stringify(GY2);
const NHAP = "BẢN NHÁP ĐANG GÕ DỞ";

let story = null;
let tapTrungGoc = null;
try {
  story = await A.taoZZ({ id: "ct_gy1", ten: "ZZ GỢI Ý" });
  const APP = T.app;
  // Hội thoại 1 thành cảnh NHÓM (2 nhân vật cùng có mặt) để thanh Trạng thái cảnh thật sự
  // được dựng (có hàng "Ai trả lời") — nhờ vậy kiểm được gợi ý nằm NGOÀI thanh đó.
  const st = await root.kv.cotTruyen.get("ct_gy1");
  st.hoiThoais[0].nhanVatIds = ["nv_z1", "nv_z2"];
  st.hoiThoais[0].hienDien = ["nv_z1", "nv_z2"];
  await root.kv.cotTruyen.set("ct_gy1", st);
  await T.loadStories();
  APP.storyId = "ct_gy1";
  APP.convId = "ht_z1";
  APP.screen = "story";
  APP.thanhCanhMo = false;
  APP.tapTrung = false;
  APP.responder = "auto";
  APP.streaming = false;
  tapTrungGoc = !!S.store.settings.tapTrung;
  await T.loadMessages("ht_z1");
  T.render();
  await cho(150);
  ghi("0 dựng cảnh: có thanh Trạng thái cảnh để đối chiếu", !!$(".scene-bar") && !!$(".scene-bar-body") && $$(".responder-row .chip").length > 0);

  // ------------------------------------------------------------------ tạo lần đầu
  datGY(GY);
  const goi0 = FAKE.calls;
  bam('.composer [data-act="suggest"]');
  const coGY = await doi(() => $$(".goi-y-card").length === 3, 8000);
  ghi("0 tạo lần đầu: AI giả được gọi đúng 1 lần và ra 3 thẻ", coGY && FAKE.calls === goi0 + 1, { goi: FAKE.calls - goi0, the: oThe().length });

  // ---- 1. KHÔNG nằm trong DOM của Trạng thái cảnh
  ghi("1 gợi ý KHÔNG nằm trong Trạng thái cảnh",
    !!$(".goi-y") && !$(".scene-bar .goi-y") && !$(".scene-bar-body .goi-y-card") && $(".goi-y").closest(".scene-bar") === null);
  ghi("1 đã bỏ hẳn hàng gợi ý cũ trong thanh (.sugg-row)", $$(".sugg-row").length === 0 && $$(".sugg").length === 0);
  {
    const y = (s) => { const e = $(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; };
    const o = { chat: y(".chat-scroll"), bar: y(".scene-bar"), gy: y(".goi-y"), nhap: y(".composer") };
    ghi("1 đúng thứ tự: hội thoại → Trạng thái cảnh → Gợi ý → ô nhập", o.chat >= 0 && o.chat < o.bar && o.bar < o.gy && o.gy < o.nhap, o);
  }

  // ---- 2. thu gọn Trạng thái cảnh / Chế độ tập trung không làm mất gợi ý
  if (!$(".scene-bar").classList.contains("mo")) { bam(".scene-bar .scene-bar-toggle"); await cho(150); }
  ghi("2 thanh Trạng thái cảnh mở ra được (thân thanh hiện)", getComputedStyle($(".scene-bar-body")).display !== "none");
  bam(".scene-bar .scene-bar-toggle");
  await cho(150);
  {
    const body = $(".scene-bar-body");
    const an = body ? getComputedStyle(body).display === "none" : false;
    ghi("2 thu gọn Trạng thái cảnh: thân thanh ẩn, gợi ý vẫn hiện đủ 3 thẻ",
      an && !$(".scene-bar").classList.contains("mo") && oThe().length === 3 && $(".goi-y").getBoundingClientRect().height > 0,
      { an, mo: $(".scene-bar").classList.contains("mo"), the: oThe().length });
  }
  bam('[data-act="toggle-focus"]');
  await cho(220);
  ghi("2 Chế độ tập trung: app có class tap-trung và thanh đã thu gọn",
    $(".app").classList.contains("tap-trung") && !$(".scene-bar").classList.contains("mo"));
  ghi("2 Chế độ tập trung: gợi ý vẫn hiện đủ 3 thẻ, không bị ẩn",
    oThe().length === 3 && $(".goi-y").getBoundingClientRect().height > 0 && getComputedStyle($(".goi-y")).display !== "none");
  bam('[data-act="toggle-focus"]');
  await cho(220);

  // ---- 3 + 4. hiện ĐỦ chữ, không ellipsis/cắt dòng/cuộn ngang (theo bề rộng hiện tại)
  {
    const cards = $$(".goi-y-card");
    const css = cards.map((c) => getComputedStyle(c));
    const khongCat = css.every((s) => s.textOverflow !== "ellipsis" && s.whiteSpace !== "nowrap" &&
      (s.webkitLineClamp === "none" || s.webkitLineClamp === "") && (s.overflow === "visible" || s.overflowY === "visible"));
    const duChu = cards.every((c) => c.scrollWidth <= c.clientWidth + 1 && c.scrollHeight <= c.clientHeight + 1);
    const list = $(".goi-y-list");
    const khongCuonNgang = list.scrollWidth <= list.clientWidth + 1;
    const ngang = document.documentElement.scrollWidth - window.innerWidth;
    const barNgang = $(".chat").scrollWidth - $(".chat").clientWidth;
    ghi("3+4 hiện đủ chữ, không ellipsis/cắt dòng/cuộn ngang @" + VW + "px",
      khongCat && duChu && khongCuonNgang && ngang <= 0 && barNgang <= 0,
      { khongCat, duChu, khongCuonNgang, ngang, barNgang, rong: Math.round(cards[0].getBoundingClientRect().width), vw: VW });
    ghi("3 nội dung hiển thị khớp nguyên văn gợi ý @" + VW + "px", JSON.stringify(oThe()) === NGUON, oThe().map((t) => t.length));
    ghi("3 thẻ xếp DỌC (mỗi thẻ một hàng) @" + VW + "px",
      cards.length === 3 && cards.every((c, i) => i === 0 || Math.round(c.getBoundingClientRect().top) >= Math.round(cards[i - 1].getBoundingClientRect().bottom) - 1));
    ghi("3 thẻ chiếm hết bề rộng khối @" + VW + "px",
      cards.every((c) => Math.round(c.getBoundingClientRect().width) >= Math.round(list.getBoundingClientRect().width) - 2));
    ghi("3 khối gợi ý có tiêu đề + nút Tạo hướng khác ở đầu",
      $(".goi-y-title").textContent.trim() === "Gợi ý lời đáp" && !!$(".goi-y-head [data-act='suggest']") &&
      getComputedStyle($(".goi-y-head")).display.indexOf("flex") === 0);
  }

  // ---- 5/6/7. chọn gợi ý: chỉ điền ô nhập, highlight, khối vẫn mở
  const tnTruoc = ((await root.kv.tinNhan.get("ht_z1")) || []).length;
  const callsTruoc = FAKE.calls;
  bam('.goi-y-card[data-i="0"]');
  await cho(180);
  ghi("5 chọn gợi ý: điền NGUYÊN VĂN vào ô nhập", $("#composerInput").value === GY[0], $("#composerInput").value === GY[0]);
  ghi("5 không tự gửi: số tin nhắn không đổi, không gọi thêm AI",
    ((await root.kv.tinNhan.get("ht_z1")) || []).length === tnTruoc && FAKE.calls === callsTruoc,
    { tn: tnTruoc, goi: FAKE.calls - callsTruoc });
  ghi("6 thẻ vừa chọn được highlight", oThe().length === 3 &&
    $('.goi-y-card[data-i="0"]').classList.contains("on") && !$('.goi-y-card[data-i="1"]').classList.contains("on") &&
    $('.goi-y-card[data-i="0"]').getAttribute("aria-pressed") === "true");
  ghi("6 khối gợi ý KHÔNG tự đóng sau khi chọn", oThe().length === 3 && $(".goi-y").getBoundingClientRect().height > 0);
  {
    const t2 = $("#composerInput");
    t2.value = GY[0] + " (tớ tự sửa thêm)";
    t2.dispatchEvent(new Event("input", { bubbles: true }));
    await cho(150);
    ghi("7 sửa bản nháp: highlight vẫn còn, khối vẫn mở",
      APP.draft.indexOf("(tớ tự sửa thêm)") >= 0 && $('.goi-y-card[data-i="0"]').classList.contains("on") && oThe().length === 3,
      { nhap: APP.draft.slice(-30) });
  }
  bam('.goi-y-card[data-i="2"]');
  await cho(180);
  ghi("6 chọn thẻ khác: thay nội dung ô nhập", $("#composerInput").value === GY[2]);
  ghi("6 chọn thẻ khác: chuyển highlight sang thẻ mới",
    $('.goi-y-card[data-i="2"]').classList.contains("on") && !$('.goi-y-card[data-i="0"]').classList.contains("on"));
  ghi("6 chọn thẻ khác: khối vẫn còn đủ 3 thẻ", oThe().length === 3);

  // ---- 8. "Tạo hướng khác": giữ danh sách cũ + bản nháp trong lúc chờ
  {
    const t3 = $("#composerInput");
    t3.value = NHAP;
    t3.dispatchEvent(new Event("input", { bubbles: true }));
    APP.draft = NHAP;
    datGY(GY2);
    FAKE.delay = 400;
    const c0 = FAKE.calls;
    await choXong();
    bam('.goi-y [data-act="suggest"]');
    await cho(140);
    const nutCho = $(".goi-y-more");
    ghi("8 trong lúc chờ: chỉ nút tạo lại ở trạng thái loading",
      !!nutCho && nutCho.disabled && !!$(".goi-y .typing") && $$(".goi-y [data-act='suggest']").length === 0);
    ghi("8 trong lúc chờ: danh sách CŨ còn nguyên", JSON.stringify(oThe()) === NGUON, oThe().map((t) => t.slice(0, 14)));
    ghi("8 trong lúc chờ: bản nháp còn nguyên", $("#composerInput").value === NHAP, $("#composerInput").value);
    ghi("8 trong lúc chờ: chỉ một lời gọi AI", FAKE.calls === c0 + 1, { goi: FAKE.calls - c0 });
    const coMoi = await doi(() => !T.app.suggDangTao && oThe()[0] === GY2[0], 8000);
    ghi("8 xong: thay TOÀN BỘ danh sách bằng bộ mới", coMoi && JSON.stringify(oThe()) === NGUON2, oThe().map((t) => t.slice(0, 14)));
    ghi("8 xong: bỏ highlight cũ", !$(".goi-y-card.on") && APP.suggChon === -1);
    ghi("8 xong: KHÔNG đụng vào ô nhập", $("#composerInput").value === NHAP, $("#composerInput").value);
    ghi("8 xong: nút tạo lại hết loading", !$(".goi-y .typing") && !!$(".goi-y [data-act='suggest']") && !$(".goi-y-more").disabled);
  }

  // ---- 9. AI lỗi: giữ danh sách cũ + bản nháp, hiện lỗi + nút Thử lại
  {
    FAKE.mode = "error";
    await choXong();
    bam('.goi-y [data-act="suggest"]');
    const coLoi = await doi(() => !!$(".goi-y-loi"), 8000);
    ghi("9 lỗi: danh sách cũ còn nguyên", JSON.stringify(oThe()) === NGUON2, oThe().map((t) => t.slice(0, 14)));
    ghi("9 lỗi: bản nháp còn nguyên", $("#composerInput").value === NHAP, $("#composerInput").value);
    ghi("9 lỗi: hiện dòng lỗi + nút Thử lại", coLoi && !!$(".goi-y-loi [data-act='suggest']"), $(".goi-y-loi").textContent.trim());
    datGY(GY2);
    await choXong();
    bam(".goi-y-loi [data-act='suggest']");
    const hetLoi = await doi(() => !T.app.suggDangTao && !$(".goi-y-loi") && oThe().length === 3, 10000);
    ghi("9 Thử lại: bỏ dòng lỗi và có lại đủ 3 thẻ", hetLoi && oThe().length === 3, { hetLoi, the: oThe().length });
    ghi("9 Thử lại: bản nháp vẫn nguyên vẹn qua cả lỗi lẫn thử lại", $("#composerInput").value === NHAP);
  }

  // ---- 10. escape nội dung AI (HTML độc hại)
  {
    const doc = '<img src=x onerror=window.__gy_x=1> "lời thoại" <3 2 < 10 <b>đậm</b> *hành động*';
    FAKE.mode = "ok";
    FAKE.delay = 0;
    FAKE.text = "- " + doc;
    await choXong();
    bam('.goi-y [data-act="suggest"]');
    const co = await doi(() => oThe().length === 1 && oThe()[0].indexOf("<img src=x onerror=") >= 0, 8000);
    const card = $(".goi-y-card");
    ghi("10 payload độc hại không chạy", typeof window.__gy_x === "undefined");
    ghi("10 không dựng phần tử HTML từ nội dung AI", !!card && card.querySelector("img, b, script, iframe, style") === null);
    ghi("10 hiển thị đúng chuỗi thô (<3, 2 < 10, thẻ giả)",
      co && !!card && card.textContent.indexOf("<img src=x onerror=") >= 0 && card.textContent.indexOf("<3") >= 0 && card.textContent.indexOf("2 < 10") >= 0,
      card ? card.textContent : null);
    ghi("10 innerHTML đã escape", !!card && card.innerHTML.indexOf("&lt;img src=x onerror=") >= 0 && card.innerHTML.indexOf("<img") === -1);
  }

  // ---- 11. hồi quy: Từ khoá dừng, streaming, gửi tin
  {
    const st2 = await root.kv.cotTruyen.get("ct_gy1");
    st2.giaoKeo.bat = true;
    await root.kv.cotTruyen.set("ct_gy1", st2);
    await T.loadStories();
    APP.storyId = "ct_gy1";
    APP.convId = "ht_z1";
    APP.screen = "story";
    T.render();
    await cho(180);
    ghi("11 Từ khoá dừng vẫn nằm trong thanh Trạng thái cảnh, không lẫn khối gợi ý",
      $$('[data-act="safeword"]').length === 1 && !!$(".scene-bar [data-act='safeword']") && !$(".goi-y [data-act='safeword']"));
    const c0 = FAKE.calls;
    APP.streaming = true;
    T.render();
    await cho(120);
    bam('.composer [data-act="suggest"]');
    await cho(250);
    APP.streaming = false;
    ghi("11 đang stream: nút gợi ý bị khoá, không sinh thêm gì", FAKE.calls === c0 && APP.suggestions.length > 0, { goi: FAKE.calls - c0 });
    T.render();
    await cho(120);
    // gửi tin thật
    datGY(GY2);
    const ta = $("#composerInput");
    ta.value = "Câu này của người chơi.";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    const tn0 = ((await root.kv.tinNhan.get("ht_z1")) || []).length;
    bam('.composer [data-act="send"]');
    const xong = await doiA(async () => (((await root.kv.tinNhan.get("ht_z1")) || []).length) >= tn0 + 2, 12000);
    const tn1 = ((await root.kv.tinNhan.get("ht_z1")) || []).length;
    ghi("11 gửi tin vẫn chạy (người chơi + phản hồi AI)", xong && tn1 === tn0 + 2, { tn0, tn1 });
    ghi("11 gửi tin xong: danh sách gợi ý được xoá", oThe().length === 0 && APP.suggestions.length === 0 && !$(".goi-y"));
    ghi("11 ô nhập rỗng sau khi gửi", $("#composerInput").value === "");
    ghi("11 tin nhắn mới hiện trong mạch truyện", $$(".chat-scroll .msg").length >= 5, $$(".chat-scroll .msg").length);
  }

  // ---- đổi hội thoại: xoá danh sách + lựa chọn của hội thoại cũ
  {
    datGY(GY);
    bam('.composer [data-act="suggest"]');
    await doi(() => oThe().length === 3, 8000);
    bam('.goi-y-card[data-i="1"]');
    await cho(150);
    const truoc = oThe().length;
    APP.convId = "ht_z1";
    // Đi qua ĐÚNG đường hashchange của app. Đặt trước một hash KHÁC để chắc chắn có sự
    // kiện (nếu hash đang đã là ht_z2 thì gán trùng sẽ không kích hoạt gì).
    location.hash = "#ct=ct_gy1&ht=ht_z1";
    await cho(250);
    location.hash = "#ct=ct_gy1&ht=ht_z2";
    const daDoi = await doi(() => T.app.convId === "ht_z2" && $(".composer"), 6000);
    await cho(250);
    ghi("12 đổi hội thoại: xoá danh sách gợi ý và lựa chọn của hội thoại cũ",
      daDoi && truoc === 3 && oThe().length === 0 && !$(".goi-y") && T.app.suggChon === -1 && T.app.suggestions.length === 0,
      { truoc, sau: oThe().length });
  }
} finally {
  try {
    S.store.settings.tapTrung = tapTrungGoc === null ? false : tapTrungGoc;
    S.saveSettings();
    T.app.tapTrung = false;
    T.app.streaming = false;
    T.app.thanhCanhMo = false;
    T.app.draft = "";
    T.app.suggestions = [];
    T.app.suggChon = -1;
    T.app.suggLoi = "";
    FAKE.delay = 0;
    FAKE.mode = "ok";
  } catch (e) {}
  if (story) { try { await A.xoaZZ("ct_gy1"); } catch (e) {} }
  for (const s of S.store.stories.slice()) if (/^ZZ/.test(s.ten || "")) { try { await S.deleteStory(s.id); } catch (e) {} }
  await T.loadStories();
}

const dsHong = kq.filter((x) => !x.dat);
return { tong: kq.length, hong: dsHong.length, vw: VW, dsHong: dsHong.map((x) => x.ca + " :: " + JSON.stringify(x.ct)), kq: kq.map((x) => (x.dat ? "PASS " : "FAIL ") + x.ca) };
