// Truyện Vai — lớp trạng thái nhập vai (nội tâm, quan hệ, ký ức, nhịp phát triển).
//
// NGUỒN SỰ THẬT DUY NHẤT là `story.canhDaKhep`: mỗi cảnh người chơi đã duyệt lưu lại
// tóm tắt, ký ức và các delta (thay đổi quan hệ, phát triển nhân vật). Trạng thái
// hiện tại được TÍNH RA từ danh sách đó chứ không lưu song song. Nhờ vậy:
//   • ghi = một thao tác append duy nhất ⇒ không bao giờ có trạng thái nửa vời;
//   • vô hiệu một cảnh = đánh dấu `huy`, mọi delta của nó biến mất khỏi trạng thái;
//   • "trạng thái" và "nguồn" không thể lệch nhau.
// Không có con số nào được hiển thị cho người dùng: số chỉ dùng để tính hướng thay
// đổi (lên/xuống) và để biết mức hiện tại khi viết prompt.
//
// File này KHÔNG import gì (không phụ thuộc store/ai) để tránh vòng import.

// Id của "người chơi" trong mọi cặp quan hệ. Id nhân vật luôn có tiền tố "nv_".
export const ID_NGUOI = "nguoi";

// Mức nội bộ 0..10. Chỉ dùng cho logic; UI chỉ hiện nhãn + mũi tên.
export const MAC_DINH = { tinTuong: 5, ganGui: 5, cangThang: 0, quyenLuc: 5, chuaNoi: "" };
export const TOI_DA = 10;

export const CHIEU = [
  { id: "tinTuong", ten: "Tin tưởng" },
  { id: "ganGui", ten: "Gần gũi" },
  { id: "cangThang", ten: "Căng thẳng" },
  { id: "quyenLuc", ten: "Ảnh hưởng" },
];
export const CHIEU_CHU = { id: "chuaNoi", ten: "Điều chưa nói" };

export const TRUONG = [
  { id: "mucTieu", ten: "Mục tiêu hiện tại" },
  { id: "camXuc", ten: "Cảm xúc còn đọng lại" },
  { id: "mauThuan", ten: "Mâu thuẫn nội tâm" },
  { id: "dongCo", ten: "Động cơ" },
  { id: "cheGiau", ten: "Đang che giấu" },
  { id: "huongThayDoi", ten: "Khuynh hướng thay đổi" },
];

// Nhịp phát triển theo từng truyện. `buoc` = mức dịch chuyển nội bộ mỗi lần duyệt.
export const NHIP = [
  {
    id: "cham",
    ten: "Chậm & thực tế",
    moTa: "Đa số cảnh không đổi gì; quan hệ chỉ nhích khi có bằng chứng rõ.",
    buoc: 1,
    dan: "- Nhịp CHẬM & THỰC TẾ: phần lớn cảnh KHÔNG có thay đổi quan hệ hay tính cách nào. " +
      "Chỉ đề xuất khi bằng chứng thật rõ và đã tích luỹ qua nhiều cảnh. Thà bỏ sót còn hơn đổi vô cớ.",
  },
  {
    id: "thichUng",
    ten: "Thích ứng",
    moTa: "Thay đổi theo cường độ thật của cảnh.",
    buoc: 1,
    dan: "- Nhịp THÍCH ỨNG: thay đổi tương xứng với cường độ thật của cảnh — cảnh nhẹ thì gần như không đổi, " +
      "cảnh có biến cố rõ thì được phép đề xuất.",
  },
  {
    id: "kichTinh",
    ten: "Kịch tính",
    moTa: "Thay đổi nhanh hơn, nhưng vẫn phải có nguyên nhân.",
    buoc: 2,
    dan: "- Nhịp KỊCH TÍNH: được phép thay đổi nhanh hơn và mạnh hơn, nhưng TUYỆT ĐỐI vẫn phải có nguyên nhân " +
      "cụ thể trong cảnh; không lật tính cách vô cớ.",
  },
];

export function nhipCua(story) {
  const id = story && story.nhip;
  return NHIP.find((x) => x.id === id) || NHIP[0];
}

// ------------------------------------------------------------- Chế độ Đạo diễn
// Hai thứ HOÀN TOÀN KHÁC NHAU, đừng trộn:
//   • ĐÍNH CHÍNH (`story.daoDien.dinhChinh`) = "AI rút ra sai, sự thật hiện tại là
//     thế này". Là lớp phủ có thể đảo ngược, KHÔNG phải cảnh giả: `tinhTrangThai()`
//     vẫn tính từ `canhDaKhep` trước, rồi mới phủ đính chính đang bật lên sau cùng.
//   • HƯỚNG (`story.daoDien.huong`) = "tương lai nên đi về đâu". Chỉ là ý định, KHÔNG
//     bao giờ được tính như ký ức/quan hệ/tính cách đã thay đổi; chỉ vào prompt dưới
//     dạng đích tương lai, và chỉ được ghi tiến độ khi người chơi duyệt ở Khép cảnh.
export const PHAM_VI = [
  { id: "truyen", ten: "Toàn truyện" },
  { id: "nhanvat", ten: "Một nhân vật" },
  { id: "quanhe", ten: "Một mối quan hệ" },
];

export const NHIP_HUONG = [
  { id: "cham", ten: "Chậm", dan: "mỗi cảnh chỉ một dấu hiệu rất nhỏ; vài cảnh liền không nhích gì là bình thường" },
  { id: "vua", ten: "Vừa", dan: "mỗi cảnh một bước nhỏ, rõ nhưng vẫn phải có lý do trong cảnh" },
  { id: "nhanh", ten: "Nhanh", dan: "mỗi cảnh một bước rõ hơn, nhưng tuyệt đối không lật tính cách" },
];

export const TT_HUONG = [
  { id: "hoatDong", ten: "Đang hoạt động" },
  { id: "tamDung", ten: "Tạm dừng" },
  { id: "hoanTat", ten: "Hoàn tất" },
  { id: "huy", ten: "Đã huỷ" },
];

export const TT_TIEN_DO = [
  { id: "chuaCham", ten: "Chưa chạm tới" },
  { id: "dangTienTrien", ten: "Đang tiến triển" },
  { id: "biCan", ten: "Bị cản" },
  { id: "canDoiHuong", ten: "Cần đổi hướng" },
  { id: "coTheHoanTat", ten: "Có thể hoàn tất" },
];

// Năm mức chọn khi đính chính một chiều quan hệ (nhãn tự nhiên, không có số trong UI).
export const MUC_LUA_CHON = [
  { v: 0, ten: "rất thấp", tenCang: "không đáng kể" },
  { v: 2, ten: "thấp", tenCang: "hơi căng" },
  { v: 5, ten: "vừa", tenCang: "căng" },
  { v: 8, ten: "khá", tenCang: "rất căng" },
  { v: 10, ten: "cao", tenCang: "cực căng" },
];

export function nhanMucChon(chieu, v) {
  const m = MUC_LUA_CHON.find((x) => Number(x.v) === kep(v)) || MUC_LUA_CHON[2];
  return chieu === "cangThang" ? m.tenCang : m.ten;
}

export function nhanPhamVi(id) {
  const x = PHAM_VI.find((p) => p.id === id);
  return x ? x.ten : "";
}

export function nhanTrangThaiHuong(id) {
  const x = TT_HUONG.find((p) => p.id === id);
  return x ? x.ten : "";
}

export function nhanTienDo(id) {
  const x = TT_TIEN_DO.find((p) => p.id === id);
  return x ? x.ten : "";
}

export function nhanNhipHuong(id) {
  const x = NHIP_HUONG.find((p) => p.id === id);
  return x ? x.ten : "";
}

// Đính chính đang bật (đã bỏ những cái bị xoá mềm).
export function dinhChinhHieuLuc(story) {
  const d = story && story.daoDien;
  const ds = d && Array.isArray(d.dinhChinh) ? d.dinhChinh : [];
  return ds.filter((x) => x && x.bat !== false && !x.xoa);
}

export function huongCua(story) {
  const d = story && story.daoDien;
  return d && Array.isArray(d.huong) ? d.huong.filter(Boolean) : [];
}

export function huongHoatDong(story) {
  return huongCua(story).filter((h) => h.trangThai === "hoatDong");
}

// Cảnh đã duyệt còn hiệu lực (dùng để phát hiện "cơ sở đã thay đổi").
export function canhConHieuLuc(story, canhId) {
  if (!canhId) return true;
  return (story && Array.isArray(story.canhDaKhep) ? story.canhDaKhep : []).some((c) => c && c.id === canhId && !c.huy);
}

// Cảnh đã sinh ra trạng thái mà một đính chính đang nói tới (để biết đính chính còn
// dựa trên cơ sở cũ hay không).
export function nguonCua(story, convId, muc) {
  const ra = [];
  const canh = canhHopLe(story).filter((c) => thuoc(c, convId || ""));
  for (const c of canh) {
    let co = false;
    if (muc.loai === "nhanvat") {
      co = (c.nhanVat || []).some((d) => d && d.nvId === muc.nvId && (!muc.truong || d.truong === muc.truong));
    } else if (muc.loai === "quanhe") {
      co = (c.quanHe || []).some((d) => d && d.tu === muc.tu && d.den === muc.den && (!muc.chieu || d.chieu === muc.chieu));
    }
    if (co) ra.push(c.id);
  }
  return ra;
}

// Đính chính này có còn đứng trên cơ sở cũ không? (`nguonCanh` = cảnh đã sinh ra trạng
// thái lúc tạo đính chính; cảnh bị vô hiệu vì sửa/xoá/cắt ⇒ cơ sở đã thay đổi.)
export function canhBaoCoSo(story, dc) {
  const ds = dc && Array.isArray(dc.nguonCanh) ? dc.nguonCanh : [];
  return ds.some((id) => !canhConHieuLuc(story, id));
}

// Tiến độ của một hướng TRONG một hội thoại: nhánh mới không thừa hưởng tiến độ xảy ra
// sau điểm rẽ, vì mỗi mục tiến độ gắn với hội thoại đã khép cảnh đó.
export function tienDoCua(h, conv) {
  const ds = h && Array.isArray(h.tienDo) ? h.tienDo : [];
  const cid = conv ? conv.id : "";
  if (!cid) return ds.filter(Boolean);
  return ds.filter((e) => e && (!e.htId || e.htId === cid));
}

export function tienDoCuoi(h, conv) {
  const ds = tienDoCua(h, conv);
  return ds.length ? ds[ds.length - 1] : null;
}

export function tienDoCoCanhBao(story, h) {
  return tienDoCua(h, null).some((e) => e && !canhConHieuLuc(story, e.canhId));
}

// Những hướng đang hoạt động và CÓ LIÊN QUAN tới lượt/cảnh này: hướng toàn truyện luôn
// liên quan; hướng nhân vật chỉ khi nhân vật đó có mặt; hướng quan hệ khi một trong hai
// bên có mặt (người chơi luôn được coi là có mặt).
export function huongLienQuan(story, conv, ids) {
  const ds = ids instanceof Set ? Array.from(ids) : (Array.isArray(ids) ? ids : []);
  const co = (id) => !!id && ds.indexOf(id) >= 0;
  return huongHoatDong(story).filter((h) => {
    if (h.phamVi === "truyen") return true;
    if (h.phamVi === "nhanvat") return co(h.nvId);
    if (h.phamVi === "quanhe") {
      const canh = [h.tu, h.den].filter((id) => id && id !== ID_NGUOI);
      return canh.length ? canh.some(co) : false;
    }
    return false;
  });
}

export function taoDinhChinh(muc) {
  const m = muc || {};
  return {
    id: ma("dc"),
    loai: m.loai === "quanhe" ? "quanhe" : "nhanvat",
    nvId: m.nvId || "",
    truong: m.truong || "",
    tu: m.tu || "",
    den: m.den || "",
    chieu: m.chieu || "",
    muc: m.muc === null || m.muc === undefined || m.muc === "" ? null : kep(m.muc),
    cu: String(m.cu || "").trim(),
    moi: String(m.moi || "").trim(),
    lyDo: String(m.lyDo || "").trim(),
    nguonCanh: Array.isArray(m.nguonCanh) ? m.nguonCanh.slice(0, 12) : [],
    luc: Number(m.luc) || Date.now(),
    bat: m.bat === false ? false : true,
    xoa: false,
    xoaLuc: 0,
  };
}

export function taoHuong(data) {
  const d = data || {};
  const k = d.keHoach || {};
  return {
    id: ma("hd"),
    ten: String(d.ten || "").trim(),
    phamVi: PHAM_VI.some((x) => x.id === d.phamVi) ? d.phamVi : "truyen",
    nvId: d.nvId || "",
    tu: d.tu || "",
    den: d.den || "",
    mongMuon: String(d.mongMuon || "").trim(),
    nhip: NHIP_HUONG.some((x) => x.id === d.nhip) ? d.nhip : "vua",
    soCanh: Math.max(1, Math.min(20, Math.round(Number(d.soCanh) || 4))),
    rangBuoc: String(d.rangBuoc || "").trim(),
    keHoach: {
      trangThaiDau: String(k.trangThaiDau || "").trim(),
      mucTieu: String(k.mucTieu || "").trim(),
      buoc: (Array.isArray(k.buoc) ? k.buoc : []).map((s) => String(s || "").trim()).filter(Boolean).slice(0, 4),
      dauHieu: String(k.dauHieu || "").trim(),
      xungDot: String(k.xungDot || "").trim(),
      dieuKienDung: String(k.dieuKienDung || "").trim(),
    },
    trangThai: TT_HUONG.some((x) => x.id === d.trangThai) ? d.trangThai : "hoatDong",
    tienDo: (Array.isArray(d.tienDo) ? d.tienDo : []).slice(-60),
    luc: Number(d.luc) || Date.now(),
    suaLuc: Number(d.suaLuc) || Date.now(),
  };
}

// Một mục tiến độ mới (chỉ được sinh ra khi người chơi duyệt ở Khép cảnh).
export function taoTienDo(data) {
  const d = data || {};
  return {
    id: ma("td"),
    htId: d.htId || "",
    canhId: d.canhId || "",
    luc: Number(d.luc) || Date.now(),
    trangThai: TT_TIEN_DO.some((x) => x.id === d.trangThai) ? d.trangThai : "chuaCham",
    bangChung: String(d.bangChung || "").trim(),
    buocTiep: String(d.buocTiep || "").trim(),
  };
}

// Các hướng đang hoạt động nhắm ĐÚNG cùng đối tượng (dùng để cảnh báo trước khi kích
// hoạt — không để hai chỉ đạo trái nhau cùng được bơm vào prompt).
export function khoaDoiTuongHuong(h) {
  if (!h) return "";
  if (h.phamVi === "truyen") return "truyen";
  if (h.phamVi === "nhanvat") return "nv:" + (h.nvId || "");
  return "qh:" + [h.tu || "", h.den || ""].slice().sort().join("|");
}

export function huongCungDoiTuong(story, muc) {
  const k = khoaDoiTuongHuong(muc);
  return huongHoatDong(story).filter((h) => khoaDoiTuongHuong(h) === k);
}

// Nhãn đối tượng của một hướng, dùng chung cho UI và prompt.
export function doiTuongHuong(story, h) {
  if (!h) return "";
  if (h.phamVi === "nhanvat") return tenGoi(story, h.nvId) || "(chưa chọn nhân vật)";
  if (h.phamVi === "quanhe") return (tenGoi(story, h.tu) || "?") + " → " + (tenGoi(story, h.den) || "?");
  return "cả truyện";
}

let demMa = 0;
export function ma(tien = "x") {
  demMa += 1;
  return tien + "_" + Date.now().toString(36) + demMa.toString(36);
}

export function tenGoi(story, id) {
  if (id === ID_NGUOI) return (story && story.nguoiChoi && story.nguoiChoi.ten) || "Bạn";
  const c = (story && story.nhanVats ? story.nhanVats : []).find((x) => x.id === id);
  return c ? c.ten : "";
}

export function khoaQuanHe(tu, den) {
  return tu + "|" + den;
}

function kep(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(TOI_DA, Math.round(n)));
}

// Nhãn tự nhiên cho một chiều (không bao giờ trả về số).
export function nhanMuc(chieu, n) {
  const v = kep(n);
  if (chieu === "cangThang") {
    if (v <= 1) return "không đáng kể";
    if (v <= 4) return "hơi căng";
    if (v <= 7) return "căng";
    return "rất căng";
  }
  if (v <= 2) return "rất thấp";
  if (v <= 4) return "thấp";
  if (v === 5) return "vừa";
  if (v <= 7) return "khá";
  return "cao";
}

export function huong(chieu, x) {
  const d = (x && x[chieu]) || {};
  if (d.huong === 0) return chieu === "cangThang" ? "không còn căng" : "không đổi";
  if (chieu === "cangThang") return d.huong > 0 ? "căng hơn" : "dịu lại";
  return d.huong > 0 ? "cao hơn" : "thấp hơn";
}

// --------------------------------------------------------------- cảnh & delta
export function canhHopLe(story) {
  return (story && Array.isArray(story.canhDaKhep) ? story.canhDaKhep : [])
    .filter((c) => c && !c.huy)
    .slice()
    .sort((a, b) => (Number(a.luc) || 0) - (Number(b.luc) || 0));
}

function thuoc(c, convId) {
  if (!convId) return true;
  const ids = Array.isArray(c.htIds) && c.htIds.length ? c.htIds : (c.htId ? [c.htId] : []);
  return ids.length === 0 || ids.indexOf(convId) >= 0;
}

// Trạng thái hiện tại của một hội thoại: gộp mọi cảnh đã duyệt thuộc hội thoại đó
// (cảnh được chia sẻ qua nhánh có nhiều `htIds`), theo đúng thứ tự thời gian.
export function tinhTrangThai(story, conv) {
  const convId = conv ? conv.id : "";
  const canh = canhHopLe(story).filter((c) => thuoc(c, convId));
  const quanHe = {};
  const nv = {};
  const kyUc = [];
  for (const c of canh) {
    for (const d of c.quanHe || []) {
      if (!d || !d.tu || !d.den) continue;
      const k = khoaQuanHe(d.tu, d.den);
      const e = quanHe[k] || (quanHe[k] = Object.assign({ tu: d.tu, den: d.den }, MAC_DINH));
      if (d.chieu === "chuaNoi") e.chuaNoi = String(d.moi || "");
      else if (CHIEU.some((x) => x.id === d.chieu)) {
        const b = Math.max(1, Math.abs(Number(d.buoc)) || 1);
        e[d.chieu] = kep((Number(e[d.chieu]) || 0) + (Number(d.huong) < 0 ? -b : b));
      }
    }
    for (const d of c.nhanVat || []) {
      if (!d || !d.nvId || !d.truong) continue;
      const t = nv[d.nvId] || (nv[d.nvId] = {});
      if (String(d.moi || "").trim()) t[d.truong] = String(d.moi).trim();
    }
    for (const k of c.kyUc || []) {
      if (!k || !String(k.noiDung || "").trim()) continue;
      kyUc.push({
        id: k.id || "",
        noiDung: String(k.noiDung).trim(),
        biet: Array.isArray(k.biet) ? k.biet.slice() : [ID_NGUOI],
        rieng: k.rieng || "",
        canhId: c.id,
        tomTat: c.tomTat || "",
        luc: Number(c.luc) || 0,
      });
    }
  }
  // ---- Sự kiện NGOÀI MÀN HÌNH (xảy ra khi người chơi vắng mặt) nhích nhẹ quan hệ giữa
  // các nhân vật AI hoặc nội tâm một nhân vật, theo đúng thứ tự thời gian. Chúng KHÔNG
  // bao giờ đụng tới quan hệ người chơi–nhân vật: việc đó chỉ đổi khi người chơi duyệt ở
  // Khép cảnh. Sự kiện không gắn hội thoại nào được coi là chuyện toàn truyện.
  // Nhánh tạo từ quá khứ đặt vgMocLuc = thời điểm điểm rẽ: sự kiện KHÔNG gắn hội thoại
  // nào xảy ra sau điểm rẽ không thuộc về nhánh này (chúng vẫn nằm trong sổ của truyện và
  // Đạo diễn vẫn xem được, nhưng không được tính vào trạng thái của nhánh).
  const mocNhanh = conv && conv.vgMocLuc !== undefined && conv.vgMocLuc !== null ? Number(conv.vgMocLuc) || 0 : -1;
  const suKien = (story && Array.isArray(story.ngoaiManHinh) ? story.ngoaiManHinh : [])
    .filter((e) => e && e.anhHuong && (!e.htId || e.htId === convId) && (mocNhanh < 0 || e.htId || (Number(e.luc) || 0) <= mocNhanh))
    .slice()
    .sort((a, b) => (Number(a.luc) || 0) - (Number(b.luc) || 0));
  for (const e of suKien) {
    for (const d of e.anhHuong.quanHe || []) {
      if (!d || !d.tu || !d.den || d.tu === ID_NGUOI || d.den === ID_NGUOI) continue;
      const k = khoaQuanHe(d.tu, d.den);
      const q = quanHe[k] || (quanHe[k] = Object.assign({ tu: d.tu, den: d.den }, MAC_DINH));
      if (d.chieu === "chuaNoi") q.chuaNoi = String(d.moi || "");
      else if (CHIEU.some((x) => x.id === d.chieu)) {
        const b = Math.max(1, Math.abs(Number(d.buoc)) || 1);
        q[d.chieu] = kep((Number(q[d.chieu]) || 0) + (Number(d.huong) < 0 ? -b : b));
      }
    }
    for (const d of e.anhHuong.noiTam || []) {
      if (!d || !d.nvId || !d.truong) continue;
      const t = nv[d.nvId] || (nv[d.nvId] = {});
      if (String(d.moi || "").trim()) t[d.truong] = String(d.moi).trim();
    }
  }

  // ---- Lớp phủ đính chính của Đạo diễn: cảnh đã duyệt tính TRƯỚC, đính chính đang
  // bật phủ lên SAU CÙNG. Đính chính không phải cảnh giả: tắt/xoá nó là trạng thái tự
  // quay về đúng kết quả suy ra từ `canhDaKhep`.
  const dcs = dinhChinhHieuLuc(story);
  const daAp = [];
  for (const dc of dcs) {
    if (dc.loai === "quanhe") {
      if (!dc.tu || !dc.den) continue;
      const k = khoaQuanHe(dc.tu, dc.den);
      const e = quanHe[k] || (quanHe[k] = Object.assign({ tu: dc.tu, den: dc.den }, MAC_DINH));
      if (dc.chieu === "chuaNoi") e.chuaNoi = String(dc.moi || "");
      else if (CHIEU.some((x) => x.id === dc.chieu) && dc.muc !== null && isFinite(Number(dc.muc))) e[dc.chieu] = kep(dc.muc);
      else continue;
    } else if (dc.loai === "nhanvat") {
      if (!dc.nvId || !dc.truong) continue;
      const t = nv[dc.nvId] || (nv[dc.nvId] = {});
      if (String(dc.moi || "").trim()) t[dc.truong] = String(dc.moi).trim();
      else continue;
    } else continue;
    daAp.push(dc);
  }
  return { canh, quanHe, nv, kyUc, coDuLieu: canh.length > 0 || suKien.length > 0, nhip: nhipCua(story), dinhChinh: daAp, suKien };
}

export function quanHeCua(tt, tu, den) {
  return tt.quanHe[khoaQuanHe(tu, den)] || null;
}

// Có gì đáng nói về cặp này không (khác mặc định hoặc có điều chưa nói).
export function coGiDangKe(tt, tu, den) {
  const e = quanHeCua(tt, tu, den);
  if (!e) return false;
  if (String(e.chuaNoi || "").trim()) return true;
  return CHIEU.some((x) => kep(e[x.id]) !== MAC_DINH[x.id]);
}

export function kyUcBiet(tt, id) {
  return tt.kyUc.filter((k) => (k.biet || []).indexOf(id) >= 0);
}

export function kyUcKhongBiet(tt, id) {
  return tt.kyUc.filter((k) => (k.biet || []).indexOf(id) < 0);
}

export function mocCanhCua(story, id) {
  const c = canhHopLe(story).filter((x) => x.moc && x.htId === id).pop();
  return c ? String(c.moc) : "";
}

// ------------------------------------------------------- mốc tin nhắn & cảnh cũ
export function timIdx(msgs, id) {
  if (!id || !Array.isArray(msgs)) return -1;
  for (let i = 0; i < msgs.length; i++) if (msgs[i] && msgs[i].id === id) return i;
  return -1;
}

export function canhCuoi(story, conv) {
  const ds = canhHopLe(story).filter((c) => c.htId === (conv && conv.id));
  return ds.length ? ds[ds.length - 1] : null;
}

// Tin nhắn CHƯA được khép (kể từ cảnh đã khép gần nhất của hội thoại này).
export function mocBatDau(story, conv, msgs) {
  const goc = Math.max(0, Number(conv && conv.khepGoc) || 0);
  let tu = goc;
  const cuoi = canhCuoi(story, conv);
  if (cuoi) {
    const i = timIdx(msgs, cuoi.denMsgId);
    if (i >= 0) tu = Math.max(tu, i + 1);
  }
  return Math.max(0, Math.min(tu, (msgs || []).length));
}

export function tinNhanChuaKhep(story, conv, msgs) {
  return (msgs || []).slice(mocBatDau(story, conv, msgs));
}

// Cảnh đã khép KHÔNG nằm trọn trước một điểm cắt/sửa (dùng để cảnh báo + vô hiệu).
export function canhSauDiem(story, convId, msgs, idx) {
  return canhHopLe(story)
    .filter((c) => thuoc(c, convId))
    .filter((c) => {
      const iDen = timIdx(msgs, c.denMsgId);
      return iDen < 0 || iDen >= idx;
    });
}

export function voHieuCanh(story, canhIds) {
  const ds = Array.isArray(canhIds) ? canhIds : [];
  if (!ds.length) return 0;
  let n = 0;
  for (const c of story.canhDaKhep || []) {
    if (c && !c.huy && ds.indexOf(c.id) >= 0) { c.huy = true; c.huyLuc = Date.now(); n++; }
  }
  return n;
}

// ---------------------------------------------- dựng bản ghi cảnh từ phiếu đã duyệt
export function taoCanh(story, conv, duyet) {
  const d = duyet || {};
  const kyUc = (d.kyUc || [])
    .filter((k) => k && String(k.noiDung || "").trim())
    .slice(0, 12)
    .map((k) => ({
      id: k.id || ma("ku"),
      noiDung: String(k.noiDung).trim(),
      biet: (Array.isArray(k.biet) ? k.biet : []).filter((v) => v === ID_NGUOI || (story.nhanVats || []).some((n) => n.id === v)),
      rieng: k.rieng || "",
    }));
  const quanHe = (d.quanHe || [])
    .filter((x) => x && x.tu && x.den && x.tu !== ID_NGUOI)
    .slice(0, 12)
    .map((x) => ({
      id: x.id || ma("qh"),
      tu: x.tu,
      den: x.den,
      chieu: x.chieu === "chuaNoi" ? "chuaNoi" : (CHIEU.some((c) => c.id === x.chieu) ? x.chieu : ""),
      huong: Number(x.huong) < 0 ? -1 : 1,
      buoc: Math.max(1, Math.abs(Number(x.buoc)) || nhipCua(story).buoc),
      moi: String(x.moi || "").trim(),
      lyDo: String(x.lyDo || "").trim(),
    }))
    .filter((x) => x.chieu && (x.chieu === "chuaNoi" ? !!x.moi : true));
  const nhanVat = (d.nhanVat || [])
    .filter((x) => x && x.nvId && x.truong && String(x.moi || "").trim())
    .slice(0, 12)
    .map((x) => ({
      id: x.id || ma("nvz"),
      nvId: x.nvId,
      truong: x.truong,
      cu: String(x.cu || "").trim(),
      moi: String(x.moi || "").trim(),
      lyDo: String(x.lyDo || "").trim(),
    }));
  const htId = conv ? conv.id : "";
  return {
    id: ma("canh"),
    htId,
    htIds: htId ? [htId] : [],
    tuMsgId: d.tuMsgId || "",
    denMsgId: d.denMsgId || "",
    tuLuc: Number(d.tuLuc) || Date.now(),
    denLuc: Number(d.denLuc) || Date.now(),
    tomTat: String(d.tomTat || "").trim(),
    moc: String(d.moc || "").trim(),
    kyUc,
    quanHe,
    nhanVat,
    luc: Date.now(),
    huy: false,
    huyLuc: 0,
  };
}

// Gợi ý mặc định "ai biết" một ký ức của cảnh: những người có mặt/lên tiếng trong cảnh.
export function aiBietMacDinh(msgs, rieng) {
  const ra = [ID_NGUOI];
  if (rieng) {
    if (ra.indexOf(rieng) < 0) ra.push(rieng);
    return ra;
  }
  for (const m of msgs || []) {
    if (!m || m.vai !== "ai") continue;
    const ids = Array.isArray(m.nvIds) && m.nvIds.length ? m.nvIds : (m.nvId ? [m.nvId] : []);
    for (const id of ids) if (ra.indexOf(id) < 0) ra.push(id);
  }
  return ra;
}
