// GIAI ĐOẠN 1 — an toàn nhân vật vị thành niên.
// Bao: (P) nhãn tuổi trong prompt phải LUÔN bằng laNguoiLon(c); (BL) cổng chanNoiDungNguoiLon
// chặn đúng ở MỌI đường vào; (ST) đường ghi/tạo/nhập; (AN) khung hình an toàn của máy vẽ.
// Chạy tạm bằng page_eval (Giai đoạn 2 sẽ chuyển vào tests/browser). Không ghi vào src/.
const T = window.__tv_test;
const S = await import("/src/store.js");
const AI = await import("/src/ai.js");

const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 200) });
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ mốc dữ liệu THẬT
const timThat = async () => {
  const ds = (await root.kv.cotTruyen.entries()).map((e) => e[1]);
  return ds.find((x) => x && x.id && !/^ct_zz/.test(x.id) && !/^ZZ/.test(x.ten || "")) || null;
};
const THAT_S = await timThat();
const mocThat = async () => {
  const s = THAT_S ? await root.kv.cotTruyen.get(THAT_S.id) : null;
  const tn = s && s.hoiThoais && s.hoiThoais[0] ? await root.kv.tinNhan.get(s.hoiThoais[0].id) : [];
  return JSON.stringify([s && s.ten, s && s.suaLuc, s && s.giaoKeo && s.giaoKeo.bat, (s && s.nhanVats || []).map((c) => [c.ten, c.tuoi, c.nguoiLon]), (tn || []).length]);
};
const mocTruoc = await mocThat();

const TEN = "ZZ gd1 tuổi";
const HT = "ht_gd1";
let st = null;
const goAI = root.aiTextPlugin;
const goVe = root.textToImagePlugin;

try {
  // ================================================================ P — NHÃN TUỔI TRONG PROMPT
  const nv = (c) => S.newCharacter(Object.assign({ id: "nv_gd1_" + c.ten.slice(0, 4), ten: c.ten, vaiTro: "bạn" }, c));
  st = await S.createStory({
    ten: TEN, mode: "chuong",
    nhanVats: [
      nv({ ten: "A17co", tuoi: "17", nguoiLon: true }),      // dưới 18 dù có cờ
      nv({ ten: "B26co", tuoi: "26", nguoiLon: true }),      // 26 + cờ
      nv({ ten: "C26khong", tuoi: "26" }),                   // 26 KHÔNG cờ
      nv({ ten: "Dkhongtuoi", nguoiLon: true }),             // không tuổi + cờ
      nv({ ten: "Echuoi", tuoi: "31 tuổi", nguoiLon: true }),// tuổi dạng chữ + cờ
      nv({ ten: "Fkhong", tuoi: "40" }),                     // 40 KHÔNG cờ
    ],
  });
  st.hoiThoais = [S.newConversation({ id: HT, tieuDe: "gd1", nhanVatIds: st.nhanVats.map((c) => c.id), hienDien: st.nhanVats.map((c) => c.id) })];
  await S.saveStory(st);
  await T.loadStories();

  const prompt = AI.buildPrompt(st, st.hoiThoais[0], [], "TASK KIỂM THỬ");
  const dongTuoi = (ten) => {
    const re = new RegExp("## " + ten + "[^\\n]*\\n(?:[^\\n]*\\n)*?Tuổi: ([^\\n]*)");
    const m = re.exec(prompt);
    return m ? m[1] : "(không thấy)";
  };
  const bang = [
    ["A17co", false, "17"],
    ["B26co", true, "26"],
    ["C26khong", false, "26"],
    ["Dkhongtuoi", true, ""],
    ["Echuoi", true, "31 tuổi"],
    ["Fkhong", false, "40"],
  ];
  for (const [ten, mongDoiNguoiLon, tuoiMongDoi] of bang) {
    const c = st.nhanVats.find((x) => x.ten === ten);
    const dong = dongTuoi(ten);
    const laNguoiLonThat = S.laNguoiLon(c);
    chk("P·" + ten + " cờ laNguoiLon() = " + mongDoiNguoiLon, laNguoiLonThat === mongDoiNguoiLon, String(laNguoiLonThat));
    const coNhan = /người trưởng thành/.test(dong);
    const coChua = /chưa xác nhận trưởng thành/.test(dong);
    chk("P·" + ten + " nhãn prompt KHỚP laNguoiLon()", coNhan === mongDoiNguoiLon && coChua === !mongDoiNguoiLon, dong);
    if (tuoiMongDoi) chk("P·" + ten + " prompt còn nguyên tuổi đã khai", dong.indexOf(tuoiMongDoi) >= 0, dong);
  }
  // LỖI CŨ (cụ thể): tuổi dưới 18 + KHÔNG có cờ ⇒ không được gắn "người trưởng thành"
  const st2 = S.newCharacter({ id: "x1", ten: "Tre", tuoi: "16" });
  const convTre = Object.assign({}, st.hoiThoais[0], { nhanVatIds: ["x1"], hienDien: ["x1"] });
  const promptTre = AI.buildPrompt(Object.assign({}, st, { nhanVats: [st2] }), convTre, [], "T");
  chk("P·LỖI CŨ tuổi 16, thiếu cờ ⇒ prompt ghi 'chưa xác nhận trưởng thành'", /Tuổi: 16 \(chưa xác nhận trưởng thành\)/.test(promptTre), (/Tuổi: 16[^\n]*/.exec(promptTre) || [])[0]);
  const st3 = S.newCharacter({ id: "x2", ten: "KhongTuoi" }); // hoàn toàn không có tuổi
  const convKhong = Object.assign({}, st.hoiThoais[0], { nhanVatIds: ["x2"], hienDien: ["x2"] });
  const promptKhong = AI.buildPrompt(Object.assign({}, st, { nhanVats: [st3] }), convKhong, [], "T");
  chk("P·không có tuổi ⇒ prompt KHÔNG có dòng Tuổi (không bịa)", !/Tuổi:/.test(promptKhong), (/Tuổi:[^\n]*/.exec(promptKhong) || [])[0] || "(không có)");

  // ================================================================ BL — CỔNG DÙNG CHUNG
  chk("BL1 không có nhân vật ⇒ cho phép", S.chanNoiDungNguoiLon({ nhanVats: [] }) === "");
  chk("BL2 toàn người lớn đã xác nhận ⇒ cho phép", S.chanNoiDungNguoiLon({ nhanVats: [{ ten: "A", tuoi: "31", nguoiLon: true }, { ten: "B", tuoi: "26", nguoiLon: true }] }) === "");
  const bl3 = S.chanNoiDungNguoiLon({ nhanVats: [{ ten: "A", tuoi: "31", nguoiLon: true }, { ten: "B", tuoi: "26" }] });
  chk("BL3 một người CHƯA xác nhận ⇒ chặn, nêu tên", /B/.test(bl3) && /CHƯA được xác nhận/.test(bl3), bl3);
  const bl4 = S.chanNoiDungNguoiLon({ nhanVats: [{ ten: "Trẻ", tuoi: "17", nguoiLon: true }] });
  chk("BL4 dưới 18 (dù có cờ) ⇒ chặn bằng thông điệp 'dưới 18' cũ", /dưới 18/.test(bl4), bl4);
  chk("BL5 tuổi không xác định ⇒ vẫn chặn (không coi là người lớn)", S.chanNoiDungNguoiLon({ nhanVats: [{ ten: "VôDanh" }] }) !== "");
  chk("BL6 tuổi không xác định + CÓ cờ xác nhận ⇒ cho phép", S.chanNoiDungNguoiLon({ nhanVats: [{ ten: "VôDanh", nguoiLon: true }] }) === "");
  chk("BL7 laCheDoNguoiLon phản ánh đúng giaoKeo.bat", S.laCheDoNguoiLon({ giaoKeo: { bat: true } }) === true && S.laCheDoNguoiLon({ giaoKeo: { bat: false } }) === false && S.laCheDoNguoiLon(null) === false);
  chk("BL8 chanGiaoKeo vẫn là trường hợp hẹp (không đổi hành vi cũ)", S.chanGiaoKeo({ nhanVats: [{ ten: "A", tuoi: "31" }] }) === "" && /dưới 18/.test(S.chanGiaoKeo({ nhanVats: [{ ten: "Trẻ", tuoi: "17" }] })));

  // ghi cờ hàng loạt
  const bang2 = { nhanVats: [{ ten: "A", tuoi: "31" }, { ten: "B", tuoi: "17" }, { ten: "C" }] };
  S.xacNhanMoiNguoiLon(bang2);
  chk("BL9 ghi cờ cho người không ghi tuổi dưới 18", bang2.nhanVats[0].nguoiLon === true && bang2.nhanVats[2].nguoiLon === true);
  chk("BL10 KHÔNG ghi cờ cho nhân vật ghi tuổi 17", bang2.nhanVats[1].nguoiLon === undefined, String(bang2.nhanVats[1].nguoiLon));

  // ================================================================ ST — ĐƯỜNG VÀO
  // ST1: createStory
  const s1 = await S.createStory({ ten: "ZZ gd1 create", mode: "songSong", nhanVats: [S.newCharacter({ id: "c1", ten: "C1", tuoi: "30" })], giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }) });
  chk("ST1 createStory: nhân vật chưa xác nhận ⇒ giao kèo bị tắt", s1.giaoKeo.bat === false, String(s1.giaoKeo.bat));
  await S.deleteStory(s1.id);
  const s1b = await S.createStory({ ten: "ZZ gd1 create2", mode: "songSong", nhanVats: [S.newCharacter({ id: "c2", ten: "C2", tuoi: "30", nguoiLon: true })], giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }) });
  chk("ST2 createStory: mọi nhân vật đã xác nhận ⇒ giao kèo giữ", s1b.giaoKeo.bat === true, String(s1b.giaoKeo.bat));
  await S.deleteStory(s1b.id);

  // ST3/4: saveStory (dùng truyện riêng, KHÔNG có nhân vật dưới 18 để thử được nhánh "cho phép")
  const rz = await S.createStory({ ten: "ZZ gd1 save", mode: "songSong", nhanVats: [S.newCharacter({ id: "z1", ten: "Z1", tuoi: "30" }), S.newCharacter({ id: "z2", ten: "Z2", tuoi: "28", nguoiLon: true })] });
  rz.giaoKeo = Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true });
  await S.saveStory(rz);
  chk("ST3 saveStory: có nhân vật CHƯA xác nhận ⇒ giao kèo bị tắt", rz.giaoKeo.bat === false, String(rz.giaoKeo.bat));
  S.xacNhanMoiNguoiLon(rz);
  rz.giaoKeo.bat = true;
  rz.giaoKeo.nguoiLon = true;
  await S.saveStory(rz);
  chk("ST4 saveStory: sau khi xác nhận hết ⇒ giao kèo giữ", rz.giaoKeo.bat === true, String(rz.giaoKeo.bat));
  // truyện chính (có A17co 17 tuổi): dù xác nhận hàng loạt, 17 tuổi vẫn khoá
  st.giaoKeo = Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true });
  S.xacNhanMoiNguoiLon(st);
  await S.saveStory(st);
  chk("ST4b saveStory: còn nhân vật ghi tuổi 17 ⇒ giao kèo vẫn bị tắt", st.giaoKeo.bat === false, String(st.giaoKeo.bat));
  await S.deleteStory(rz.id);

  // ST5..8: nhập file (chuanHoaTruyen)
  const rawA = { id: "ct_gd1raw", ten: "ZZ gd1 nhập A", mode: "songSong", giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }), nhanVats: [S.newCharacter({ id: "r1", ten: "R1", tuoi: "29" })], hoiThoais: [], anh: [] };
  const nhapA = S.chuanHoaTruyen(JSON.parse(JSON.stringify(rawA)), { choNhap: true, dongY18: true });
  chk("ST5 nhập + xác nhận 18+ ⇒ ghi cờ cho nhân vật và GIỮ giao kèo", nhapA.giaoKeo.bat === true && nhapA.nhanVats[0].nguoiLon === true, JSON.stringify([nhapA.giaoKeo.bat, nhapA.nhanVats[0].nguoiLon]));
  const rawA2 = JSON.parse(JSON.stringify(rawA));
  rawA2.nhanVats = [S.newCharacter({ id: "r3", ten: "R3" })]; // không khai tuổi
  const nhapA2 = S.chuanHoaTruyen(rawA2, { choNhap: true, dongY18: true });
  chk("ST5b nhập + xác nhận 18+ (nhân vật không khai tuổi) ⇒ giữ giao kèo + ghi cờ", nhapA2.giaoKeo.bat === true && nhapA2.nhanVats[0].nguoiLon === true, JSON.stringify([nhapA2.giaoKeo.bat, nhapA2.nhanVats[0].nguoiLon]));
  const rawB = JSON.parse(JSON.stringify(rawA));
  rawB.nhanVats[0].nguoiLon = true;
  const nhapB = S.chuanHoaTruyen(rawB, { choNhap: true, dongY18: true });
  chk("ST6 nhập + xác nhận 18+ + nhân vật đã xác nhận ⇒ giao kèo giữ", nhapB.giaoKeo.bat === true, String(nhapB.giaoKeo.bat));
  const rawC = JSON.parse(JSON.stringify(rawA));
  rawC.nhanVats[0].nguoiLon = true;
  const nhapC = S.chuanHoaTruyen(rawC, { choNhap: true, dongY18: false });
  chk("ST7 nhập KHÔNG xác nhận 18+ ⇒ giao kèo bị bỏ (dù file có cờ)", nhapC.giaoKeo.bat === false, String(nhapC.giaoKeo.bat));
  const rawD = JSON.parse(JSON.stringify(rawA));
  rawD.nhanVats = [S.newCharacter({ id: "r2", ten: "R2", tuoi: "16", nguoiLon: true })];
  const nhapD = S.chuanHoaTruyen(rawD, { choNhap: true, dongY18: true });
  chk("ST8 nhập + xác nhận 18+ nhưng có nhân vật 16 tuổi ⇒ giao kèo bị bỏ", nhapD.giaoKeo.bat === false, String(nhapD.giaoKeo.bat));

  // ================================================================ AN — MÁY VẼ
  // ĐỔI Ở ĐỢT NÀY: hết nhánh "ép về chân dung an toàn". Truyện ở chế độ người lớn mà
  // trong khung có nhân vật chưa thoả laNguoiLon() ⇒ CHẶN hẳn việc tạo ảnh.
  const NOI = [
    "MÔ TẢ ẢNH: A quiet room with a window.",
    "LOẠI TRỪ: crowd",
    "CHÚ THÍCH: Trong phòng.",
  ].join(String.fromCharCode(10));
  const batAI = (gom) => {
    root.aiTextPlugin = (opts) => {
      if (opts && opts.getMetaObject) return { countTokens: (t) => Math.ceil(String(t || "").length / 3.6), idealMaxContextTokens: 6000 };
      gom.push(String((opts && opts.instruction) || ""));
      const p = Promise.resolve({ text: NOI, stopReason: "stop" });
      p.stop = () => {};
      return p;
    };
  };
  const gom = [];
  batAI(gom);
  st.giaoKeo = Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true, mucDo: 4 });
  const rAnh = await AI.vietPromptAnh({ story: st, conv: st.hoiThoais[0], messages: [], tinNhan: "", ghiChu: "", ngoaiHinh: [] });
  const insAnh = gom[gom.length - 1] || "";
  chk("AN1 chế độ người lớn ⇒ lời gọi viết mô tả CÓ khối BDSM", /BDSM nam.nam/.test(insAnh));
  chk("AN2 KHÔNG còn luật KHUNG HÌNH AN TOÀN nào trong prompt", !/KHUNG HÌNH AN TOÀN/.test(insAnh));
  chk("AN2b ai.js đã bỏ hẳn tham số anToan của vietPromptAnh", String(AI.vietPromptAnh).indexOf("anToan") < 0, String(AI.vietPromptAnh).slice(0, 120));
  chk("AN3 mô tả trả về vẫn đọc được như cũ", rAnh.prompt.indexOf("quiet room") >= 0, rAnh.prompt);
  gom.length = 0;
  await AI.vietPromptAnh({ story: st, conv: st.hoiThoais[0], messages: [], tinNhan: "", ghiChu: "", ngoaiHinh: [], anToan: true });
  chk("AN4 truyền tham số anToan (đã bỏ) KHÔNG làm mất khối BDSM", /BDSM nam.nam/.test(gom[gom.length - 1] || ""));

  const promptBdsm = AI.buildPrompt(Object.assign({}, st, { giaoKeo: Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true }) }), st.hoiThoais[0], [], "T");
  chk("AN6 prefix chế độ người lớn có DÒNG LUẬT TUỔI cố định", /15. TUỔI:/.test(promptBdsm) && /chưa được xác nhận trưởng thành/.test(promptBdsm));
  const promptThuong = AI.buildPrompt(Object.assign({}, st, { giaoKeo: S.giaoKeoMacDinh() }), st.hoiThoais[0], [], "T");
  chk("AN7 truyện KHÔNG ở chế độ người lớn ⇒ không có khối giao kèo", !/15. TUỔI:/.test(promptThuong));

  // ================================================================ VT — DẤU HIỆU VỊ THÀNH NIÊN
  chk("VT1 tuổi bằng CHỮ tiếng Việt đọc được thành số", S.tuoiSo({ tuoi: "mười sáu" }) === 16 && S.tuoiSo({ tuoi: "mười bảy tuổi" }) === 17 && S.tuoiSo({ tuoi: "mười tám" }) === 18, [S.tuoiSo({ tuoi: "mười sáu" }), S.tuoiSo({ tuoi: "mười bảy tuổi" }), S.tuoiSo({ tuoi: "mười tám" })].join("/"));
  chk("VT2 chữ số không đi kèm chữ tuổi KHÔNG bị đọc thành tuổi (tránh bắt oan)", S.tuoiSo({ tuoi: "ba vết sẹo" }) === null && S.tuoiSo({ tuoi: "tư thế" }) === null, String(S.tuoiSo({ tuoi: "ba vết sẹo" })));
  chk("VT3 tuổi 17 viết bằng chữ vẫn KHÔNG phải người lớn (dù có cờ)", S.laNguoiLon({ tuoi: "mười bảy", nguoiLon: true }) === false);
  const VT_CHAN = [
    ["tuổi số dưới 18", { ten: "A", tuoi: "16" }],
    ["tuổi chữ dưới 18", { ten: "B", tuoi: "mười sáu tuổi" }],
    ["học sinh cấp 3 trong mô tả", { ten: "C", moTa: "học sinh cấp 3, hay cười" }],
    ["16 tuổi trong mô tả", { ten: "D", moTa: "16 tuổi, tóc ngắn" }],
    ["nhỏ tuổi trong ghi chú", { ten: "E", ghiChu: "nhỏ tuổi, cần bảo vệ" }],
    ["học lớp 9 trong vai trò", { ten: "F", vaiTro: "học lớp 9" }],
    ["thiếu niên", { ten: "G", moTa: "một thiếu niên gầy gò" }],
    ["vị thành niên", { ten: "H", moTa: "vị thành niên" }],
    ["con nít", { ten: "I", moTa: "như một đứa con nít" }],
  ];
  for (const [nhan, c] of VT_CHAN) chk("VT4 bắt được dấu hiệu: " + nhan, S.dauHieuViThanhNien(c) !== "", S.dauHieuViThanhNien(c));
  const VT_SACH = [
    ["32 tuổi + mô tả người lớn", { ten: "J", tuoi: "32", moTa: "trẻ trung, nhỏ nhắn, ba vết sẹo, tư thế tự tin" }],
    ["45 tuổi", { ten: "K", tuoi: "45", moTa: "vóc dáng đồ sộ, sẹo nhỏ bên má" }],
    ["không tuổi, mô tả bình thường", { ten: "L", moTa: "khuôn mặt lạnh, ít nói, làm nghề sửa xe" }],
    ["tuổi 20 viết bằng chữ", { ten: "M", tuoi: "hai mươi tuổi" }],
  ];
  for (const [nhan, c] of VT_SACH) chk("VT5 KHÔNG bắt oan: " + nhan, S.dauHieuViThanhNien(c) === "", S.dauHieuViThanhNien(c));

  // 3c — ca mấu chốt: dấu hiệu vị thành niên + KHÔNG có trường tuoi
  const vt1 = { nhanVats: [{ id: "v1", ten: "Na", moTa: "học sinh cấp 3, thích bánh ngọt" }, { id: "v2", ten: "Anh", tuoi: "30" }] };
  S.xacNhanMoiNguoiLon(vt1);
  chk("VT6 dấu hiệu vị thành niên + KHÔNG có tuoi ⇒ KHÔNG BAO GIỜ ghi cờ hàng loạt", vt1.nhanVats[0].nguoiLon !== true, String(vt1.nhanVats[0].nguoiLon));
  chk("VT6b nhân vật còn lại vẫn được ghi cờ", vt1.nhanVats[1].nguoiLon === true);
  chk("VT6c cổng người lớn CHẶN khi còn nhân vật này", /Na/.test(S.chanNoiDungNguoiLon(vt1)), S.chanNoiDungNguoiLon(vt1).slice(0, 140));
  const vt2 = { nhanVats: [{ id: "v3", ten: "Người Lớn A", moTa: "từng là học sinh cấp 2, giờ đã lớn" }] };
  const chanVt2 = S.dsChanGhiCo(vt2);
  chk("VT7 dsChanGhiCo nêu TÊN + lý do", chanVt2.length === 1 && chanVt2[0].ten === "Người Lớn A" && /cấp 2/.test(chanVt2[0].lyDo), JSON.stringify(chanVt2));
  chk("VT7b dsSeGhiCoNguoiLon loại đúng người đó ra", S.dsSeGhiCoNguoiLon(vt2).length === 0);
  const stVt = await S.createStory({ ten: "ZZ gd1 dấu hiệu", mode: "songSong", nhanVats: [S.newCharacter({ id: "vv1", ten: "Na", moTa: "học sinh cấp 2" }), S.newCharacter({ id: "vv2", ten: "Anh", tuoi: "30", nguoiLon: true })] });
  stVt.giaoKeo = Object.assign(S.giaoKeoMacDinh(), { bat: true, nguoiLon: true });
  await S.saveStory(stVt);
  chk("VT8 saveStory: còn nhân vật có dấu hiệu vị thành niên ⇒ giao kèo bị tắt", stVt.giaoKeo.bat === false, String(stVt.giaoKeo.bat));
  stVt.nhanVats[0].moTa = "sinh viên năm cuối đại học";
  chk("VT9 sửa mô tả xong thì hết dấu hiệu", S.dauHieuViThanhNien(stVt.nhanVats[0]) === "", S.dauHieuViThanhNien(stVt.nhanVats[0]));
  S.xacNhanMoiNguoiLon(stVt);
  stVt.giaoKeo.bat = true;
  await S.saveStory(stVt);
  chk("VT10 sửa xong ⇒ bật lại được", stVt.giaoKeo.bat === true, String(stVt.giaoKeo.bat));
  await S.deleteStory(stVt.id);

  // ================================================================ HT — HỘP XÁC NHẬN 18+ LIỆT KÊ TÊN
  const dongHet = () => { try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {} };
  const xoaToast = () => { const tr = document.querySelector("#toastRoot"); if (tr) tr.innerHTML = ""; };
  const txtToast = () => ((document.querySelector("#toastRoot") || {}).textContent || "");
  const nhanh = (pr, ms) => Promise.race([pr, new Promise((r) => setTimeout(() => r({ hetGio: true }), ms))]);
  const nutTheoChu = (bd, re) => Array.from((bd || document).querySelectorAll(".modal-foot .btn")).find((b) => re.test(b.textContent));
  const dsHt = [S.newCharacter({ id: "h1", ten: "Anh Bình", tuoi: "35" }), S.newCharacter({ id: "h2", ten: "Cô Na", moTa: "học sinh cấp 3" })];
  dongHet();
  const pHt = T.xacNhan18PlusTruyen("Kiểm thử liệt kê tên.", dsHt);
  await cho(200);
  const bdHt = document.querySelector("#modalRoot .modal-backdrop");
  chk("HT1 hộp xác nhận 18+ cấp truyện mở ra", !!bdHt);
  const nutHt = bdHt ? nutTheoChu(bdHt, /xác nhận 18/i) : null;
  if (bdHt) {
    const txt = bdHt.textContent;
    chk("HT2 hộp LIỆT KÊ TÊN nhân vật sẽ được ghi cờ", /Anh Bình/.test(txt) && /Sẽ ghi cờ/.test(txt), txt.slice(0, 200));
    chk("HT3 hộp nêu RIÊNG nhân vật KHÔNG được ghi cờ kèm lý do", /Cô Na/.test(txt) && /cấp 3/.test(txt) && /KHÔNG ghi cờ/.test(txt), txt.slice(0, 320));
    chk("HT4 hộp có nút xác nhận 18+", !!nutHt);
    if (nutHt) nutHt.click();
    else dongHet();
  }
  const kqHt = await nhanh(pHt, 3000);
  chk("HT5 xác nhận ⇒ seGhi đúng Anh Bình, chan đúng Cô Na", kqHt.dongY === true && (kqHt.seGhi || []).length === 1 && (kqHt.seGhi || [])[0].ten === "Anh Bình" && (kqHt.chan || []).length === 1 && (kqHt.chan || [])[0].ten === "Cô Na", JSON.stringify({ d: kqHt.dongY, se: (kqHt.seGhi || []).map((c) => c.ten), chan: (kqHt.chan || []).map((c) => c.ten) }));
  S.xacNhanMoiNguoiLon({ nhanVats: dsHt });
  chk("HT6 sau khi xác nhận: CHỈ Anh Bình được ghi cờ", dsHt[0].nguoiLon === true && dsHt[1].nguoiLon !== true, JSON.stringify(dsHt.map((c) => c.nguoiLon)));
  dongHet();
  const pHt2 = T.xacNhan18PlusTruyen("Huỷ thử.", dsHt);
  await cho(200);
  const bdHt2 = document.querySelector("#modalRoot .modal-backdrop");
  const nutHuy = bdHt2 ? nutTheoChu(bdHt2, /Huỷ/) : null;
  if (nutHuy) nutHuy.click();
  else dongHet();
  const kqHt2 = await nhanh(pHt2, 3000);
  chk("HT7 bấm Huỷ ⇒ KHÔNG xác nhận (không ghi cờ)", kqHt2.dongY === false, JSON.stringify(kqHt2).slice(0, 120));

  // ================================================================ GK — GIỮ NGUYÊN CẤU HÌNH KHI CỔNG TẮT
  const DS_THICH = (S.R.SoThichBdsm() || []).slice(0, 2);
  const THICH_IDS = DS_THICH.map((x) => x.id);
  const GK_DAY_DU = {
    bat: true, vaiNguoiChoi: "switch", tuKhoaDung: "dừng-ngay", kieuQuanHe: "thay-doi", mucDo: 5,
    nhipDo: "cham", doDai: "dai", ngonNgu: "tho", soThich: THICH_IDS, gioiHanCung: "không máu",
    gioiHanMem: "chỉ khi đã thoả thuận", khongKhi: "phòng riêng", nguoiLon: true,
    danhXung: "gọi tôi là chủ nhân", luatCanh: "luôn đếm", chamSocSau: "uống nước", luuY: "đi chậm",
  };
  const stGk = await S.createStory({ ten: "ZZ gd1 giao kèo", mode: "songSong", nhanVats: [S.newCharacter({ id: "gk1", ten: "GK", tuoi: "30" })] });
  stGk.giaoKeo = Object.assign(S.giaoKeoMacDinh(), GK_DAY_DU);
  await S.saveStory(stGk);
  const gkLai = S.getStory(stGk.id);
  chk("GK1 cổng tắt giaoKeo.bat khi có nhân vật chưa xác nhận", gkLai.giaoKeo.bat === false, String(gkLai.giaoKeo.bat));
  const gkLech = [];
  for (const k of Object.keys(GK_DAY_DU)) {
    if (k === "bat") continue;
    if (JSON.stringify(gkLai.giaoKeo[k]) !== JSON.stringify(GK_DAY_DU[k])) gkLech.push(k + ": " + JSON.stringify(gkLai.giaoKeo[k]) + " ≠ " + JSON.stringify(GK_DAY_DU[k]));
  }
  chk("GK2 MỌI cấu hình giao kèo khác GIỮ NGUYÊN khi cổng tắt bat", gkLech.length === 0, gkLech.join(" | "));
  S.xacNhanMoiNguoiLon(gkLai);
  gkLai.giaoKeo.bat = true;
  await S.saveStory(gkLai);
  const gkLai2 = S.getStory(stGk.id);
  chk("GK3 bật lại sau khi xác nhận ⇒ dùng được ngay, cấu hình vẫn nguyên", gkLai2.giaoKeo.bat === true && JSON.stringify(gkLai2.giaoKeo) === JSON.stringify(gkLai.giaoKeo), String(gkLai2.giaoKeo.bat));
  const promptGk = AI.buildPrompt(gkLai2, S.newConversation({ id: "ht_gk", tieuDe: "gk", nhanVatIds: ["gk1"], hienDien: ["gk1"] }), [], "T");
  const thieu = ["dừng-ngay", "không máu", "chỉ khi đã thoả thuận", "phòng riêng", "gọi tôi là chủ nhân", "luôn đếm", "uống nước", "đi chậm"].concat(DS_THICH.map((x) => x.ten)).filter((x) => promptGk.indexOf(x) < 0);
  chk("GK4 prompt sau khi bật lại DÙNG đúng cấu hình đã giữ (vai/từ khoá/giới hạn/chăm sóc sau)", thieu.length === 0, thieu.join(" | "));

  // ================================================================ AN8+ — GIAO DIỆN MÀN TẠO ẢNH: CHẶN
  const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  const VE2 = { calls: 0, last: "", lt: "" };
  root.textToImagePlugin = (prompt, opts) => {
    VE2.calls++; VE2.last = String(prompt || ""); VE2.lt = String((opts && opts.negativePrompt) || "");
    return Promise.resolve({ dataUrl: ANH_1PX });
  };
  const HT_ANH = "ht_gd1anh";
  const stAnh = await S.createStory({
    ten: "ZZ gd1 ảnh", mode: "songSong",
    nhanVats: [S.newCharacter({ id: "ax1", ten: "DaXacNhan", tuoi: "30", nguoiLon: true }), S.newCharacter({ id: "ax2", ten: "ChuaXacNhan", tuoi: "29" })],
  });
  stAnh.hoiThoais = [S.newConversation({ id: HT_ANH, tieuDe: "ảnh", nhanVatIds: ["ax1", "ax2"], hienDien: ["ax1", "ax2"] })];
  await S.saveStory(stAnh);
  await T.loadStories();
  const moTaoAnh = async () => {
    dongHet();
    T.app.storyId = stAnh.id; T.app.convId = HT_ANH; T.app.screen = "story"; T.render();
    await T.openTaoAnh();
    let bd = null;
    for (let i = 0; i < 30 && !bd; i++) { bd = document.querySelector("#modalRoot .modal-backdrop"); if (!bd) await cho(120); }
    return bd;
  };
  const datPrompt = (bd, chu) => { const o = bd && bd.querySelector(String.fromCharCode(91) + "data-f=" + String.fromCharCode(34) + "prompt" + String.fromCharCode(34) + String.fromCharCode(93)); if (o) o.value = chu; };
  const bamVaDoi = async (bd, act, ms) => {
    const nut = bd.querySelector('[data-act2="' + act + '"]');
    if (!nut) return false;
    nut.click();
    await cho(ms || 700);
    return true;
  };
  const bamChoVe = async (bd, act, truoc, gomCho, gomTruoc) => {
    const nut = bd.querySelector(String.fromCharCode(91) + "data-act2=" + String.fromCharCode(34) + act + String.fromCharCode(34) + String.fromCharCode(93));
    if (!nut) return false;
    nut.click();
    for (let i = 0; i < 40 && VE2.calls === truoc && gomCho.length === gomTruoc; i++) await cho(150);
    await cho(200);
    return true;
  };
  // (a) ĐANG ở chế độ người lớn + có nhân vật chưa xác nhận ⇒ CHẶN
  S.getStory(stAnh.id).giaoKeo.bat = true;
  let bdA = await moTaoAnh();
  chk("AN8 màn tạo ảnh mở được", !!bdA);
  if (bdA) {
    datPrompt(bdA, "A quiet room, two people talking");
    VE2.calls = 0; gom.length = 0; xoaToast();
    await bamVaDoi(bdA, "dung", 400);
    const toastChan = txtToast();
    chk("AN9 CHẶN: không hề gọi máy vẽ", VE2.calls === 0, "calls=" + VE2.calls);
    chk("AN10 toast nêu TÊN nhân vật chưa xác nhận + cách sửa", /ChuaXacNhan/.test(toastChan) && toastChan.indexOf("18+") >= 0, toastChan.slice(0, 180));
    chk("AN11 dòng trạng thái nói rõ CÁCH SỬA", /Cách sửa/.test(bdA.textContent) && /ChuaXacNhan/.test(bdA.textContent), bdA.textContent.slice(-220));
    chk("AN13 KHÔNG còn nhánh khung an toàn cũ", !/AN TOÀN/.test(toastChan));
    await cho(1500);
    chk("AN9b chờ thêm vẫn KHÔNG gọi máy vẽ", VE2.calls === 0, "calls=" + VE2.calls);
    gom.length = 0; xoaToast();
    await bamVaDoi(bdA, "viet-lai", 700);
    chk("AN12 Viết lại mô tả CŨNG bị chặn (không gọi AI)", gom.length === 0, "gom=" + gom.length);
  }
  // (b) xác nhận nốt nhân vật ⇒ hết chặn, KHÔNG ép prompt loại trừ an toàn
  const stAnhB = S.getStory(stAnh.id);
  stAnhB.nhanVats.find((c) => c.id === "ax2").nguoiLon = true;
  stAnhB.giaoKeo.bat = true;
  await S.saveStory(stAnhB);
  await T.loadStories();
  let bdB = await moTaoAnh();
  if (bdB) {
    datPrompt(bdB, "A quiet room, two people talking");
    VE2.calls = 0; VE2.lt = ""; xoaToast(); gom.length = 0;
    await bamChoVe(bdB, "dung", 0, gom, 1);
    chk("AN14 xác nhận đủ ⇒ dựng được ảnh", VE2.calls === 1, "calls=" + VE2.calls);
    chk("AN15 KHÔNG còn ép prompt loại trừ nudity/bondage", !/nudity/.test(VE2.lt) && !/bondage/.test(VE2.lt), VE2.lt.slice(0, 140));
    chk("AN16 không còn toast AN TOÀN", !/AN TOÀN/.test(txtToast()), txtToast().slice(0, 140));
  }
  // (c) truyện KHÔNG ở chế độ người lớn ⇒ giữ nguyên hành vi cũ
  const stAnhC = S.getStory(stAnh.id);
  stAnhC.nhanVats.find((c) => c.id === "ax2").nguoiLon = false;
  stAnhC.giaoKeo.bat = false;
  await S.saveStory(stAnhC);
  await T.loadStories();
  let bdC = await moTaoAnh();
  if (bdC) {
    datPrompt(bdC, "A quiet room, two people talking");
    VE2.calls = 0; xoaToast(); gom.length = 0;
    await bamChoVe(bdC, "dung", 0, gom, 1);
    chk("AN17 truyện KHÔNG ở chế độ người lớn ⇒ không chặn, hành vi cũ giữ nguyên", VE2.calls === 1 && !/Chặn/.test(txtToast()), "calls=" + VE2.calls + " | " + txtToast().slice(0, 120));
  }

} catch (e) {
  chk("BỘ GIAI ĐOẠN 1 chạy hết", false, (e && e.stack) || e);
} finally {
  root.aiTextPlugin = goAI;
  root.textToImagePlugin = goVe;
  try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {}
  try { for (const s of S.store.stories.slice()) if (/^ZZ gd1/.test(s.ten || "")) await S.deleteStory(s.id); } catch (e) {}
  try { await root.kv.tinNhan.delete(HT); delete S.store.messagesCache[HT]; } catch (e) {}
  try { await root.kv.tinNhan.delete("ht_gd1anh"); delete S.store.messagesCache.ht_gd1anh; } catch (e) {}
  try { await root.kv.cotTruyen.delete("ct_gd1raw"); } catch (e) {}
  try { await T.loadStories(); T.app.storyId = null; T.app.convId = null; T.app.screen = "home"; T.render(); } catch (e) {}
}

// ------------------------------------------------------------------ dọn dẹp & dữ liệu thật
try {
  const con = S.store.stories.filter((s) => /^ZZ gd1/.test(s.ten || "")).map((s) => s.ten);
  chk("Z1 không còn truyện test sót", con.length === 0, con.join(", "));
  chk("Z2 dữ liệu THẬT không đổi một byte", mocTruoc === (await mocThat()));
} catch (e) { chk("Z0 kiểm tra dữ liệu thật", false, (e && e.message) || e); }

return {
  ok: kq.every((x) => x.ok),
  tong: kq.length,
  hong: kq.filter((x) => !x.ok).length,
  failures: kq.filter((x) => !x.ok),
  log: kq.map((x) => (x.ok ? "✓ " : "✗ ") + x.ten + (x.ok || !x.ct ? "" : " — " + x.ct)),
};
