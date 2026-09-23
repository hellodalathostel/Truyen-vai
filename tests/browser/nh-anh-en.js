// Kiểm thử đợt "mô tả khung hình không trộn ngoại hình + khối ngoại hình tiếng Anh".
// Chạy MỘT LẦN trong một lần tải trang (fake AI/plugin nằm sau biến cục bộ của lần chạy).
// Bao: logic thuần (nhãn tiếng Anh, tách khối cũ, gộp loại trừ, cờ cần dịch, bỏ bản dịch cũ),
// bóc kết quả dịch, và luồng thật trong màn tạo ảnh (khối + prompt gửi máy vẽ).
const T = window.__tv_test;
const S = await import("/src/store.js");
const N = await import("/src/ngoaiHinh.js");
const AI = await import("/src/ai.js");

const kq = [];
const chk = (ten, ok, them) => kq.push({ ten, ok: !!ok, them: them === undefined ? "" : String(them).slice(0, 200) });
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const doi = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { if (f()) return true; await cho(50); } return false; };

// ---------------------------------------------------------- mốc dữ liệu THẬT (chỉ ĐỌC)
let THAT_CT = null, THAT_HT = null;
const timThat = async () => {
  const ds = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  const s = ds.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
  THAT_CT = s ? s.id : null;
  THAT_HT = s && s.hoiThoais && s.hoiThoais[0] ? s.hoiThoais[0].id : null;
  return s;
};
await timThat();
const moc = async () => {
  const s = THAT_CT ? await root.kv.cotTruyen.get(THAT_CT) : null;
  const tn = THAT_HT ? await root.kv.tinNhan.get(THAT_HT) : [];
  const hs = [];
  for (const [k, v] of await root.kv.thuVienNgoaiHinh.entries()) hs.push(k + ":" + JSON.stringify(v));
  return JSON.stringify([s && s.suaLuc, s && s.nguoiChoi, s && (s.bienNienSu || []).length, (tn || []).length, hs.sort()]);
};
const mocTruoc = await moc();

// ---------------------------------------------------------- AI GIẢ + MÁY VẼ GIẢ
const SCENE =
  "MÔ TẢ ẢNH: A dim motel room at night, one warm lamp on the left, rain on the window.\n" +
  "Minh Quân — wearing a white silk shirt, standing by the window, hands in pockets.\n" +
  "Duy — wearing only an oversized white shirt, kneeling on the rug.\n" +
  "LOẠI TRỪ: daylight, crowd\n" +
  "CHÚ THÍCH: Trong phòng trọ, Quân đứng bên cửa sổ còn Duy quỳ dưới sàn.";
const DICH =
  "ID: nhz_ae_a\nAPPEARANCE: Scholarly look, thin-rimmed glasses, short black hair\nAVOID: beard\n\n" +
  "ID: nhz_ae_b\nAPPEARANCE: Short black hair, brown eyes, a small scar on the left eyebrow\nAVOID: glasses";
const FAKE = { calls: [], dichCalls: 0, vietCalls: 0, mode: "ok", dichText: DICH };
const gocPlugin = root.aiTextPlugin;
root.aiTextPlugin = (opts) => {
  if (opts && opts.getMetaObject) return { countTokens: (t) => Math.ceil(String(t || "").length / 3.6), idealMaxContextTokens: 6000 };
  const ins = String((opts && opts.instruction) || "");
  const laDich = ins.indexOf("Dịch mô tả NGOẠI HÌNH") >= 0;
  FAKE.calls.push({ laDich, ins });
  if (laDich) FAKE.dichCalls++; else FAKE.vietCalls++;
  let dung = false;
  const p = new Promise((res) => setTimeout(() => {
    if (FAKE.mode === "error") return res({ text: "", stopReason: "error" });
    res({ text: laDich ? FAKE.dichText : SCENE, stopReason: dung ? "user" : "stop" });
  }, 5));
  p.stop = () => { dung = true; };
  return p;
};
const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const VE = { calls: 0, last: "", lt: "" };
const gocVe = root.textToImagePlugin;
root.textToImagePlugin = (prompt, opts) => {
  VE.calls++; VE.last = String(prompt || ""); VE.lt = String((opts && opts.negativePrompt) || "");
  return Promise.resolve({ dataUrl: ANH_1PX });
};

let st = null;
try {
  // ---------------------------------------------------------- logic thuần
  const hsA0 = N.chuanHoaHoSo({ id: "nhz_ae_a", tenChinh: "Minh Quân", tuoi: "45", moTa: "Vẻ thư sinh, đeo kính gọng mảnh", tranh: "Không râu" });
  const hsB0 = N.chuanHoaHoSo({ id: "nhz_ae_b", tenChinh: "Duy", tuoi: "22", moTa: "Sẹo nhỏ trên mày trái", tranh: "Không kính" });
  const enA = Object.assign({}, hsA0, { moTaEn: "Scholarly look, thin-rimmed glasses", tranhEn: "glasses" });
  const enB = Object.assign({}, hsB0, { moTaEn: "Small scar on the left eyebrow", tranhEn: "glasses, beard" });
  const khoiChuaDich = N.khoiNgoaiHinh([hsA0, hsB0]);
  const promptEn = N.ghepPromptNgoaiHinh("A dim room.", [enA, enB]);

  chk("U1 nhãn khối là TIẾNG ANH", N.MARK_NGOAI_HINH.indexOf("FIXED CHARACTER APPEARANCE") >= 0 && N.MARK_NGOAI_HINH.indexOf("NGOẠI HÌNH CỐ ĐỊNH") < 0, N.MARK_NGOAI_HINH.slice(0, 46));
  chk("U2 khối mỗi người một dòng, có avoid tiếng Anh", promptEn.indexOf("- Minh Quân (age 45): Scholarly look") >= 0 && promptEn.indexOf("| avoid: glasses") >= 0);
  chk("U3 chưa có bản dịch ⇒ rơi về chữ gốc (không vỡ khối)", khoiChuaDich.indexOf("Vẻ thư sinh") > 0 && khoiChuaDich.indexOf("FIXED CHARACTER APPEARANCE") >= 0 && khoiChuaDich.indexOf("Sẹo nhỏ") > 0);
  chk("U4 ghép lại nhiều lần vẫn MỘT khối", N.ghepPromptNgoaiHinh(promptEn, [enA, enB]) === promptEn);
  chk("U5 cắt khối theo nhãn tiếng Anh", N.tachNgoaiHinh(promptEn) === "A dim room.");
  const cu = "Cảnh cũ.\n\n" + N.MARK_NGOAI_HINH_CU + "\n- Duy: mô tả cũ tiếng Việt";
  chk("U6 ảnh CŨ (nhãn tiếng Việt) vẫn cắt được khối", N.tachNgoaiHinh(cu) === "Cảnh cũ.");
  chk("U7 ghép lại ảnh cũ KHÔNG để lại nhãn cũ", N.ghepPromptNgoaiHinh(cu, [enA]).indexOf(N.MARK_NGOAI_HINH_CU) < 0);
  chk("U8 prompt không có khối ⇒ giữ nguyên chữ", N.tachNgoaiHinh("Chỉ có mô tả cảnh.") === "Chỉ có mô tả cảnh.");
  chk("U9 loại trừ gộp bản tiếng Anh", N.gopLoaiTruNgoaiHinh("lowres", [enA, enB]) === "lowres, glasses, glasses, beard");
  chk("U10 cần dịch: có dấu tiếng Việt, chưa có bản Anh", N.canDichNgoaiHinh({ id: "x", moTa: "Tóc đen ngắn" }) === true);
  chk("U11 chữ đã là tiếng Anh ⇒ không tốn lượt gọi AI", N.canDichNgoaiHinh({ id: "x", moTa: "Tall man, grey eyes, short beard" }) === false);
  chk("U12 đã có bản dịch ⇒ không dịch lại", N.canDichNgoaiHinh({ id: "x", moTa: "Tóc đen", moTaEn: "Black hair" }) === false);
  chk("U13 chỉ thiếu phần 'cần tránh' ⇒ vẫn cần dịch", N.canDichNgoaiHinh({ id: "x", moTa: "x", moTaEn: "x", tranh: "Không râu" }) === true);
  chk("U14 sửa ngoại hình ⇒ bỏ bản dịch cũ", N.boBanDichCu({ moTa: "Tóc đen" }, { moTa: "Tóc bạc", moTaEn: "Black hair" }).moTaEn === "");
  chk("U15 không sửa gì ⇒ giữ bản dịch", N.boBanDichCu({ moTa: "Tóc đen" }, { moTa: "Tóc đen", moTaEn: "Black hair" }).moTaEn === "Black hair");

  // ---------------------------------------------------------- bóc kết quả dịch
  const rP = await AI.dichNgoaiHinh([
    { id: "nhz_ae_a", moTa: "Vẻ thư sinh", tranh: "Không râu" },
    { id: "nhz_ae_b", moTa: "Sẹo nhỏ", tranh: "" },
    { id: "nhz_ae_z", moTa: "Không có trong câu trả lời", tranh: "" },
  ]);
  chk("P1 bóc đúng theo TỪNG người (không trộn)", rP[0].moTaEn.indexOf("thin-rimmed glasses") >= 0 && rP[1].moTaEn.indexOf("scar") >= 0, JSON.stringify([rP[0].moTaEn, rP[1].moTaEn]));
  chk("P2 bóc đúng phần cần tránh", rP[0].tranhEn === "beard" && rP[1].tranhEn === "glasses", JSON.stringify([rP[0].tranhEn, rP[1].tranhEn]));
  chk("P3 model bỏ sót hồ sơ ⇒ trả rỗng, không ném", rP.length === 3 && rP[2].moTaEn === "" && rP[2].tranhEn === "");
  FAKE.dichText = "ID: nhz_ae_a\nAPPEARANCE: Short black hair\nAVOID: (trống)";
  const rT = await AI.dichNgoaiHinh([{ id: "nhz_ae_a", moTa: "Tóc đen", tranh: "" }]);
  chk("P4 phần trống ⇒ chuỗi rỗng (không dính chữ '(trống)')", rT[0].moTaEn === "Short black hair" && rT[0].tranhEn === "");
  FAKE.dichText = DICH;
  FAKE.mode = "error";
  let loiDich = "";
  try { await AI.dichNgoaiHinh([{ id: "nhz_ae_a", moTa: "Tóc đen", tranh: "" }]); } catch (e) { loiDich = String((e && e.message) || e); }
  FAKE.mode = "ok";
  chk("P5 máy chủ AI lỗi ⇒ ném ra (chỗ gọi giữ bản gốc)", /Máy chủ AI/.test(loiDich), loiDich);

  // ---------------------------------------------------------- luồng thật trong màn tạo ảnh
  for (const [, h] of await root.kv.thuVienNgoaiHinh.entries()) void h;
  for (const s of S.store.stories.slice()) if (/^ZZ anh-en/.test(s.ten || "")) await S.deleteStory(s.id);
  for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
  await T.loadNgoaiHinh();
  await S.luuNgoaiHinh(hsA0);
  await S.luuNgoaiHinh(hsB0);
  await T.loadNgoaiHinh();
  st = await S.createStory({
    ten: "ZZ anh-en", mode: "songSong",
    nhanVats: [
      S.newCharacter({ id: "nv_ae_a", ten: "Minh Quân", vaiTro: "chủ", tuoi: "45", nguoiLon: true }),
      S.newCharacter({ id: "nv_ae_b", ten: "Duy", vaiTro: "khách", tuoi: "22", nguoiLon: true }),
    ],
  });
  st.nhanVats[0].ngoaiHinhId = "nhz_ae_a";
  st.nhanVats[1].ngoaiHinhId = "nhz_ae_b";
  st.hoiThoais = [S.newConversation({ id: "ht_ae1", tieuDe: "Phòng trọ", nhanVatIds: ["nv_ae_a", "nv_ae_b"], hienDien: ["nv_ae_a", "nv_ae_b"] })];
  await S.saveStory(st);
  await S.replaceMessages("ht_ae1", [
    S.makeMessage("nguoi", "*Bước vào phòng* Chủ nhân, em tới rồi."),
    S.makeMessage("ai", "*Quân tựa lưng vào cửa sổ, tay đút túi quần* Cởi áo khoác ra. Quỳ xuống.", { nvId: "nv_ae_a", ten: "Minh Quân" }),
  ]);
  await T.loadStories();
  T.app.storyId = st.id; T.app.convId = "ht_ae1"; T.app.screen = "story"; T.render();

  const bd = () => document.querySelector("#modalRoot .modal-backdrop");
  const dichTruocMo = FAKE.dichCalls;
  await T.openTaoAnh();
  await cho(300);
  chk("M1 màn tạo ảnh mở được", !!bd() && !!bd().querySelector("[data-nh-khoi]"));
  const chips = bd() ? [...bd().querySelectorAll(".nh-chip")].map((c) => c.querySelector(".nh-chip-ten").textContent) : [];
  chk("M2 nhận diện đủ 2 hồ sơ trong khung", chips.length === 2 && chips.indexOf("Minh Quân") >= 0 && chips.indexOf("Duy") >= 0, chips.join(" / "));

  const thanhEn = await doi(() => {
    const k = bd() && bd().querySelector(".nh-khoi-body");
    return k && k.textContent.indexOf("FIXED CHARACTER APPEARANCE") >= 0;
  }, 6000);
  const khoiText = bd() ? (bd().querySelector(".nh-khoi-body") || {}).textContent || "" : "";
  chk("M3 khối TỰ dịch sang tiếng Anh khi mở (không cần bấm gì)", thanhEn, khoiText.slice(0, 150));
  chk("M4 khối tiếng Anh có đúng ngoại hình của từng người", khoiText.indexOf("Scholarly look, thin-rimmed glasses") >= 0 && khoiText.indexOf("small scar on the left eyebrow") >= 0);
  chk("M5 khối KHÔNG còn chữ ngoại hình tiếng Việt", !/Vẻ thư sinh|Sẹo nhỏ/i.test(khoiText));
  const hA = await root.kv.thuVienNgoaiHinh.get("nhz_ae_a");
  const hB = await root.kv.thuVienNgoaiHinh.get("nhz_ae_b");
  chk("M6 bản dịch được LƯU xuống hồ sơ (không chỉ trong RAM)", hA.moTaEn === "Scholarly look, thin-rimmed glasses, short black hair" && hB.tranhEn === "glasses", JSON.stringify([hA.moTaEn, hB.tranhEn]).slice(0, 160));
  const dichSauMo = FAKE.dichCalls;
  chk("M7 mở màn tạo ảnh chỉ tốn ĐÚNG MỘT lượt dịch cho cả hai", dichSauMo === dichTruocMo + 1, "dich=" + dichSauMo);

  // ---- "Viết lại": mô tả khung hình KHÔNG được chứa ngoại hình
  bd().querySelector('[data-act2="viet-lai"]').click();
  await doi(() => FAKE.vietCalls > 0, 5000);
  await cho(200);
  const oNhap = (bd().querySelector('[data-f="prompt"]') || {}).value || "";
  const insViet = (FAKE.calls.filter((c) => !c.laDich).slice(-1)[0] || {}).ins || "";
  chk("V1 ô 'Mô tả khung hình' chỉ có mô tả cảnh", oNhap.indexOf("motel room") >= 0 && !/sẹo|thư sinh|gọng mảnh/i.test(oNhap) && oNhap.indexOf("FIXED CHARACTER") < 0, oNhap.slice(0, 120));
  chk("V2 lời gọi viết mô tả KHÔNG được đưa ngoại hình vào", !/sẹo|thư sinh|Không râu|gọng mảnh/i.test(insViet));
  chk("V3 lời gọi viết mô tả nêu tên 2 người làm nhãn", insViet.indexOf("Minh Quân") >= 0 && insViet.indexOf("Duy") >= 0);
  chk("V4 lời gọi viết mô tả có luật cấm tả lại ngoại hình", /không tả lại/i.test(insViet) && insViet.indexOf("NGƯỜI ĐÃ CÓ NGOẠI HÌNH CỐ ĐỊNH") >= 0);
  chk("V5 'Viết lại' KHÔNG tốn thêm lượt dịch", FAKE.dichCalls === dichSauMo, "dich=" + FAKE.dichCalls + " (lúc mở=" + dichSauMo + ")");

  // ---- "Dựng khung hình": prompt gửi máy vẽ
  const dichTruoc = FAKE.dichCalls;
  bd().querySelector('[data-act2="dung"]').click();
  const coVe = await doi(() => VE.calls > 0, 8000);
  await cho(300);
  chk("D1 gọi được máy vẽ", coVe && VE.calls === 1);
  chk("D2 prompt gửi máy vẽ có khối ngoại hình TIẾNG ANH", VE.last.indexOf("FIXED CHARACTER APPEARANCE") >= 0 && VE.last.indexOf("Scholarly look") >= 0 && VE.last.indexOf("small scar") >= 0);
  chk("D3 prompt KHÔNG còn chữ ngoại hình tiếng Việt", !/sẹo|Vẻ thư sinh|gọng mảnh|Không râu/i.test(VE.last));
  chk("D4 prompt loại trừ có bản tiếng Anh của cả hai", VE.lt.indexOf("glasses") >= 0 && VE.lt.indexOf("beard") >= 0, VE.lt);
  chk("D5 mô tả cảnh vẫn nằm trong prompt", /motel room/i.test(VE.last));
  chk("D6 prompt không chứa ảnh/base64", VE.last.indexOf("data:image") < 0 && VE.last.indexOf("base64") < 0);
  chk("D7 đã có bản dịch ⇒ dựng lại không dịch lại", FAKE.dichCalls === dichTruoc, "dich=" + FAKE.dichCalls);

  const nutLai = bd().querySelector('[data-act2="dung-lai"]');
  if (nutLai) {
    const d2 = FAKE.dichCalls;
    nutLai.click();
    await doi(() => VE.calls > 1, 8000);
    await cho(200);
    chk("D8 'Dựng lại' vẫn không dịch lại và prompt y nguyên", FAKE.dichCalls === d2 && VE.calls > 1 && VE.last.indexOf("FIXED CHARACTER APPEARANCE") >= 0);
  }

  // ---- dịch hỏng ⇒ vẫn dựng được, nói rõ là chưa dịch
  FAKE.mode = "error";
  await S.luuNgoaiHinh(N.chuanHoaHoSo({ id: "nhz_ae_c", tenChinh: "Dũng", tuoi: "30", moTa: "Dáng cao gầy, tóc nâu", tranh: "Không râu" }));
  await T.loadNgoaiHinh();
  const st3 = S.getStory(st.id);
  st3.nhanVats.push(S.newCharacter({ id: "nv_ae_c", ten: "Dũng", vaiTro: "bạn", tuoi: "30", nguoiLon: true }));
  st3.nhanVats[2].ngoaiHinhId = "nhz_ae_c";
  st3.hoiThoais[0].nhanVatIds.push("nv_ae_c");
  st3.hoiThoais[0].hienDien.push("nv_ae_c");
  await S.saveStory(st3);
  await T.loadStories();
  T.render();
  document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove());
  await T.openTaoAnh();
  await cho(400);
  const veTruoc = VE.calls;
  bd().querySelector('[data-act2="dung"]').click();
  const coVe2 = await doi(() => VE.calls > veTruoc, 9000);
  await cho(400);
  const khieuEl = bd() ? bd().querySelector(".nh-khoi-thieu") : null;
  chk("E1 dịch hỏng vẫn DỰNG được ảnh", coVe2);
  chk("E2 prompt vẫn có khối (dùng chữ gốc) và không vỡ", VE.last.indexOf("FIXED CHARACTER APPEARANCE") >= 0 && VE.last.indexOf("Dáng cao gầy") >= 0);
  chk("E3 khối NÓI RÕ là chưa dịch được", !!khieuEl && /Chưa dịch được sang tiếng Anh/.test(khieuEl.textContent) && /Dũng/.test(khieuEl.textContent), khieuEl ? khieuEl.textContent.slice(0, 160) : "(không có dòng nhắc)");
  chk("E4 hồ sơ dịch hỏng KHÔNG bị bịa bản dịch", ((await root.kv.thuVienNgoaiHinh.get("nhz_ae_c")) || {}).moTaEn === "");
  FAKE.mode = "ok";
} catch (e) {
  chk("BỘ KIỂM THỬ chạy hết", false, (e && e.stack) || e);
} finally {
  document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove());
  try { if (st && st.id) await S.deleteStory(st.id); } catch (e) { chk("dọn truyện test", false, e && e.message); }
  try {
    for (const h of T.dsNgoaiHinh().slice()) if (/^nhz/.test(h.id)) await T.xoaNgoaiHinh(h.id).catch(() => {});
    for (const [k] of await root.kv.tinNhan.entries()) if (/^ht_ae/.test(k)) { await root.kv.tinNhan.delete(k); delete S.store.messagesCache[k]; }
  } catch (e) { chk("dọn dữ liệu test", false, e && e.message); }
  root.aiTextPlugin = gocPlugin;
  root.textToImagePlugin = gocVe;
  try {
    await T.loadStories();
    await T.loadNgoaiHinh();
    T.app.storyId = null; T.app.convId = null; T.app.screen = "home"; T.render();
  } catch (e) {}
}

// ---------------------------------------------------------- khoá ngoại hình TEST còn sót
try {
  const sot = T.dsNgoaiHinh().filter((h) => /^nhz/.test(h.id)).map((h) => h.id);
  chk("Z1 không còn hồ sơ test nào sót", sot.length === 0, sot.join(", "));
  const ct = []; for (const [k] of await root.kv.cotTruyen.entries()) ct.push(k);
  chk("Z2 không còn truyện test nào sót", ct.every((k) => !/^ct_zz/.test(k)), ct.join(", "));
  const ht = []; for (const [k] of await root.kv.tinNhan.entries()) ht.push(k);
  chk("Z3 không còn hội thoại test nào sót", ht.every((k) => k.indexOf("ht_ae") !== 0), ht.join(", "));
  const mocSau = await moc();
  chk("Z4 dữ liệu THẬT không đổi một byte", mocTruoc === mocSau, mocSau.slice(0, 160));
} catch (e) { chk("Z0 kiểm tra dữ liệu thật", false, (e && e.message) || e); }

return {
  ok: kq.every((x) => x.ok),
  tong: kq.length,
  hong: kq.filter((x) => !x.ok).length,
  failures: kq.filter((x) => !x.ok),
  log: kq.map((x) => (x.ok ? "✓ " : "✗ ") + x.ten + (x.ok || !x.them ? "" : " — " + x.them)),
};
