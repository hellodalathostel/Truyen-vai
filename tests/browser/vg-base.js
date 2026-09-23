// Dựng lại truyện ZZ base ở trạng thái xác định + tiện ích cho các ca kiểm thử
// "thời gian vắng mặt". Gọi window.__vgBase({...}) trước mỗi ca.
const S = await import("/src/store.js");
const TS = await import("/src/trangThai.js");
const TG = await import("/src/thoiGian.js");
window.__vgS = S; window.__vgTS = TS; window.__vgTG = TG;

window.__vgFake = { calls: [], plans: [], plan: "", loi: false };
window.__vgInstallFake = (plan, opts) => {
  const o = opts || {};
  window.__vgFake = { calls: [], plans: [].concat(plan || []), plan: "", loi: false, ...o };
  window.root.aiTextPlugin = (oo) => {
    window.__vgFake.calls.push(oo.instruction || "");
    if (window.__vgFake.loi) return Promise.reject(new Error("AI hỏng (giả lập)"));
    const idx = window.__vgFake.calls.length - 1;
    const p = window.__vgFake.plans.length ? (window.__vgFake.plans[idx] !== undefined ? window.__vgFake.plans[idx] : window.__vgFake.plans[window.__vgFake.plans.length - 1]) : "";
    return Promise.resolve({ text: p || "", stopReason: "stop" });
  };
  return window.__vgFake;
};

window.__vgBase = async (opts) => {
  const o = opts || {};
  const t0 = Date.now() - 5 * 3600000;
  const st = {
    id: "ct_zzbase",
    ten: o.ten || "ZZ base",
    moTa: "", theLoaiId: "", theLoaiTen: "", emoji: "✦",
    boiCanh: o.boiCanh || "Học viện ven biển hiện đại; có điện thoại, email.",
    luatTheGioi: o.luatTheGioi || "Thế giới hiện đại, có smartphone.",
    mode: "songSong",
    giaoKeo: S.giaoKeoMacDinh(),
    nguoiChoi: { ten: "Người chơi", moTa: "một người trẻ sống ở thành phố ven biển" },
    nhanVats: [
      S.newCharacter({ id: "nv_za", ten: "Aria", vaiTro: "bạn thân", moTa: "cô gái 22 tuổi, thẳng thắn, hay lo", mau: "#ec4899" }),
      S.newCharacter({ id: "nv_zb", ten: "Borin", vaiTro: "huấn luyện viên", moTa: "người đàn ông 35 tuổi, kín đáo", mau: "#3b82f6" }),
    ],
    chuongs: [], hoiThoais: [], bienNienSu: [], anh: [],
    nhip: "cham", canhDaKhep: [], daoDien: S.daoDienMacDinh(),
    thoiGian: Object.assign(TG.thoiGianMacDinh(), o.thoiGian || {}),
    ngoaiManHinh: (o.ngoaiManHinh || []).slice(),
    taoLuc: t0, suaLuc: Date.now(), phienBan: 6,
  };
  st.daoDien.bat = o.daoDien === false ? false : true;
  const c1 = S.newConversation({ id: "ht_za", tieuDe: "Aria", nhanVatIds: ["nv_za"], hienDien: ["nv_za"] });
  const c2 = S.newConversation({ id: "ht_zb", tieuDe: "Borin", nhanVatIds: ["nv_zb"], hienDien: ["nv_zb"] });
  st.hoiThoais = [c1, c2];
  const msgs = [
    S.makeMessage("nguoi", "Tớ ra bến tàu trước nhé.", { id: "tn_zz0", luc: t0 }),
    S.makeMessage("ai", "Tớ vẫn đang chờ cậu ở bến tàu. Đừng lâu quá.", { id: "tn_zz1", nvId: "nv_za", ten: "Aria", luc: t0 + 60000 }),
  ];
  if (o.themTinMo) msgs.push(S.makeMessage("ai", o.themTinMo, { id: "tn_zz2", nvId: "nv_za", ten: "Aria", luc: t0 + 120000 }));
  if (!o.khongKhep) {
    st.canhDaKhep = [TS.taoCanh(st, c1, {
      tuMsgId: "tn_zz0", denMsgId: o.themTinMo ? "tn_zz1" : "tn_zz1", tuLuc: t0, denLuc: t0 + 60000,
      tomTat: o.tomTat || "Aria hẹn gặp ở bến tàu; cô ấy đang chờ.",
      moc: o.moc || "Aria đang đợi ở bến tàu, cô ấy khó chịu vì bị bỏ hẹn.",
      kyUc: [{ noiDung: "Aria nói cô ấy vẫn đang chờ ở bến tàu.", biet: ["nv_za", "nguoi"] }],
      nhanVat: [{ nvId: "nv_za", truong: "camXuc", moi: "sốt ruột vì bị bỏ hẹn", lyDo: "người chơi tới muộn" }],
    })];
  }
  try { await S.deleteStory(st.id); } catch (e) {}
  S.store.messagesCache = {};
  S.store.anhCache = {};
  await window.root.kv.cotTruyen.set(st.id, st);
  await window.root.kv.tinNhan.set(c1.id, S.chuanHoaTinNhan(msgs));
  await window.root.kv.tinNhan.set(c2.id, []);
  await S.loadStories();
  window.__vgIds = { story: st.id, c1: c1.id, c2: c2.id, m0: "tn_zz0", m1: "tn_zz1" };
  // Điều hướng lại để app thật sự mở truyện này (openStory → render màn truyện).
  location.hash = "#ct=ct_khac";
  await new Promise((r) => setTimeout(r, 60));
  location.hash = "#ct=ct_zzbase&ht=ht_za";
  await new Promise((r) => setTimeout(r, 700));
  return {
    story: st.id, c1: c1.id, c2: c2.id,
    screen: document.querySelector(".chat") ? "chat" : (document.querySelector(".library") ? "library" : "?"),
    cheDo: TG.thoiGianOf(S.getStory(st.id)).cheDo,
  };
};

// Một lần "quay lại app sau khi vắng N phút".
window.__vgQuayLai = async (phut, opts) => {
  const o = opts || {};
  const st = window.__vgS.getStory(window.__vgIds.story);
  if (o.thoiGian) Object.assign(window.__vgTG.thoiGianOf(st), o.thoiGian);
  window.__tv_vg.gapVangMat(st, phut);
  await window.__tv_vg.kiemTraVangMat(st);
  return window.__vgTrangThai();
};

window.__vgTrangThai = () => {
  const S2 = window.__vgS;
  const st = S2.getStory(window.__vgIds.story);
  const tg = window.__vgTG.thoiGianOf(st);
  const msgs = S2.getMessages(window.__vgIds.c1);
  const msgs2 = S2.getMessages(window.__vgIds.c2);
  return {
    ngoai: st.ngoaiManHinh.map((e) => ({ id: e.id, loai: e.loai, muc: e.muc, htId: e.htId, hinhThuc: e.hinhThuc, luc: e.luc, tnIds: e.tnIds, thamGia: e.thamGia, biet: e.biet, phienId: e.phienId, noiDung: e.noiDung.slice(0, 70), phutVangMat: e.phutVangMat, cheDoVangMat: e.cheDoVangMat, anhHuong: e.anhHuong })),
    tg: { cheDo: tg.cheDo, nguongPhut: tg.nguongPhut, chuDong: tg.chuDong, phien: tg.phien, daXuLy: tg.daXuLyLuc, hoatDong: tg.hoatDongLuc },
    m1: msgs.map((m) => ({ id: m.id, vai: m.vai, nvIds: m.nvIds, vangMat: m.vangMat, vangMatPhien: m.vangMatPhien, luc: m.luc, noiDung: m.noiDung.slice(0, 60) })),
    m2: msgs2.length,
    dom: {
      divider: document.querySelectorAll(".vg-divider").length,
      dividerText: (document.querySelector(".vg-divider-txt") || {}).textContent || "",
      status: (document.querySelector(".vg-status") || {}).textContent || "",
      loi: !!document.querySelector(".vg-status.vg-loi"),
      nhip: document.querySelectorAll(".vg-nhip").length,
      nhipOpen: !!document.querySelector(".vg-nhip.mo"),
      bubbleVg: [...document.querySelectorAll(".msg")].filter((m) => /Trong lúc bạn vắng mặt/.test(m.parentElement ? "" : "")).length,
    },
    calls: window.__vgFake ? window.__vgFake.calls.length : -1,
    screen: document.querySelector(".chat") ? "chat" : (document.querySelector(".library") ? "library" : "?"),
  };
};
window.__vgBaseReady = true;
