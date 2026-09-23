// Bộ kiểm thử: GIAI ĐOẠN 4 — NHẬT KÝ PARSE + GÓI GỠ LỖI.
//
// Vì sao cần: nhật ký và gói gỡ lỗi là chỗ DUY NHẤT trong app có thể mang nội dung truyện của
// người dùng ra khỏi máy (đầu ra thô của AI có thể là nội dung riêng tư, kể cả người lớn). Ba
// điều luật phải chứng minh được ở đây chứ không chỉ nằm trong tài liệu:
//   1. Mặc định gói gỡ lỗi CHỈ có metadata; đầu ra thô chỉ đi kèm khi người dùng tự tích.
//   2. Trước khi tải: hộp xác nhận nói rõ gói chứa gì (kể cả cảnh báo khi có đầu ra thô).
//   3. Nhật ký KHÔNG BAO GIỜ đi vào file xuất truyện / bản sao lưu thường.
// Kèm theo: vòng đệm bị chặn cả số mục (20) lẫn tổng dung lượng phần thô (12 KB), và có nút
// xoá nhật ký.
//
// Nhật ký thật trong máy (nếu chủ dự án đã dùng app) được CHỤP LẠI và TRẢ NGUYÊN ở cuối bộ.
const S = await import("/src/store.js");
const T = window.__tv_test;
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const ca = [];
const chk = (ten, ok, ct) => ca.push({ ten, ok: !!ok, ct: ct === undefined || ct === null ? "" : String(ct).slice(0, 200) });
const doi = async (fn, n) => {
  for (let i = 0; i < (n || 80); i++) {
    let v = null;
    try { v = await fn(); } catch (e) { v = null; }
    if (v) return v;
    await cho(50);
  }
  return null;
};
const hopCuoi = () => { const ds = document.querySelectorAll("#modalRoot .modal-backdrop"); return ds.length ? ds[ds.length - 1] : null; };
const thanCuoi = () => { const h = hopCuoi(); return h ? h.querySelector(".modal-body") : null; };
const nutCuoi = (chu) => { const h = hopCuoi(); return h ? [...h.querySelectorAll(".modal-foot button")].find((x) => (x.textContent || "").indexOf(chu) >= 0) || null : null; };
const dongHet = () => { try { document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove()); } catch (e) {} };

// Bắt file "tải về" mà không ghi gì lên đĩa (chỉ giữ trong bộ nhớ của lượt chạy).
let batBlob = null, batTen = null;
const gocCreate = URL.createObjectURL.bind(URL);
const gocClick = HTMLAnchorElement.prototype.click;
URL.createObjectURL = (b) => { if (b instanceof Blob) batBlob = b; return gocCreate(new Blob([""])); };
HTMLAnchorElement.prototype.click = function () { if (this.download) { batTen = this.download; return; } return gocClick.apply(this, arguments); };
const layFile = async (fn) => {
  batBlob = null; batTen = null;
  const p = fn();
  for (let i = 0; i < 80; i++) {
    await cho(80);
    const b = nutCuoi("Vẫn xuất");
    if (b) { b.click(); continue; }
    if (batBlob) break;
  }
  await p;
  await cho(250);
  return { ten: batTen, txt: batBlob ? await batBlob.text() : null };
};

const MOC = "ZZGOLOIMARK";
const TEN = "ZZ Nhật ký";
const HT = "ht_zzgl";
const logGoc = await T.docNhatKyLlm();
// `xuatTatCa` đóng dấu mốc "đã xuất" vào cài đặt — chụp lại để TRẢ NGUYÊN cuối bộ.
const CAI_DAT_GOC = localStorage.getItem("truyenVai.caiDat");

// ---------------------------------------------------------------- dựng truyện để thử xuất
await S.loadStories();
for (const s of S.store.stories.slice()) if ((s.ten || "").indexOf(TEN) === 0) await S.deleteStory(s.id);
const nv = S.newCharacter({ id: "nv_zzgl", ten: "Kai", tuoi: "30", nguoiLon: true });
const st = await S.createStory({ ten: TEN, mode: "chuong", boiCanh: "Bối cảnh.", nhanVats: [nv] });
st.hoiThoais.push(S.newConversation({ id: HT, tieuDe: "Hội thoại", nhanVatIds: [nv.id], hienDien: [nv.id] }));
await S.saveStory(st);
await S.replaceMessages(HT, [S.makeMessage("nguoi", "Nội dung thử.", { id: "tn_zzgl" })]);
await S.loadStories();

// ---------------------------------------------------------------- ghi nhật ký
await T.xoaNhatKyLlm();
chk("xoá nhật ký ⇒ rỗng", (await T.docNhatKyLlm()).length === 0);
await T.ghiNhatKyLlm({ l: "gọi AI · viết tiếp cảnh", ok: 1, ly: "", d: 2311, tho: "RAW-" + MOC + "-1" });
await T.ghiNhatKyLlm({ l: "gọi AI · khép cảnh", ok: 1, ly: "model không ghi tín hiệu khép cảnh", d: 355 });
await T.ghiNhatKyLlm({ l: "gọi AI · kế hoạch", ok: 0, ly: "lỗi mạng", d: 0 });
let vong = await T.docNhatKyLlm();
chk("ghi 3 mục nhật ký", vong.length === 3, vong.length);
chk("mục mới nhất nằm đầu vòng đệm", vong[0].l.indexOf("kế hoạch") >= 0, vong[0] && vong[0].l);
chk("mục lỗi được đánh dấu ok=0", vong[0].ok === 0 || vong[0].ok === false, JSON.stringify(vong[0]));
chk("nhật ký giữ được đầu ra thô của lượt parse", vong[2].tho.indexOf(MOC) >= 0, String(vong[2].tho).slice(0, 40));
chk("nhật ký KHÔNG giữ nội dung tin nhắn", JSON.stringify(vong).indexOf("Nội dung thử.") < 0);

// ---------------------------------------------------------------- vòng đệm: số mục
for (let i = 0; i < 25; i++) await T.ghiNhatKyLlm({ l: "gọi AI · lượt " + i, ok: 1, d: i });
vong = await T.docNhatKyLlm();
chk("vòng đệm chặn ở 20 mục", vong.length === 20, vong.length);
chk("mục cũ nhất bị bỏ (giữ mục mới nhất)", vong[0].l.indexOf("lượt 24") >= 0, vong[0] && vong[0].l);
chk("nút xoá vẫn xoá được cả vòng đệm đầy", vong.length === 20 && vong[vong.length - 1].l.indexOf("lượt 5") >= 0, vong[vong.length - 1] && vong[vong.length - 1].l);

// ---------------------------------------------------------------- vòng đệm: tổng dung lượng
await T.xoaNhatKyLlm();
const dai = new Array(S.DO_DAI_THO_MOI_MUC + 1).join("y");
for (let i = 0; i < 20; i++) await T.ghiNhatKyLlm({ l: "gọi AI · dài " + i, ok: 1, tho: dai });
vong = await T.docNhatKyLlm();
const soGiu = Math.floor(S.TOI_DA_BYTE_NHAT_KY / S.DO_DAI_THO_MOI_MUC);
chk("trần dung lượng THẬT SỰ cắt (không chỉ trần số mục)", vong.length === soGiu && soGiu < S.TOI_DA_MUC_NHAT_KY, vong.length + " mục, soGiu=" + soGiu);
chk("tổng phần thô nằm trong trần", S.dungLuongTho(vong) <= S.TOI_DA_BYTE_NHAT_KY, S.dungLuongTho(vong) + " / " + S.TOI_DA_BYTE_NHAT_KY);
chk("phần thô của MỘT mục cũng bị cắt theo trần mỗi mục", vong[0].tho.length === S.DO_DAI_THO_MOI_MUC, vong[0] && vong[0].tho.length);

// ---------------------------------------------------------------- bảng gỡ lỗi
await T.xoaNhatKyLlm();
await T.ghiNhatKyLlm({ l: "gọi AI · viết tiếp cảnh", ok: 1, d: 2311, tho: "RAW-" + MOC + "-1" });
await T.ghiNhatKyLlm({ l: "gọi AI · khép cảnh", ok: 0, ly: "model không ghi tín hiệu khép cảnh", d: 355 });
dongHet();
await T.openGoLoi();
const coBang = await doi(() => thanCuoi() && thanCuoi().querySelector(".gl-list"));
chk("mở được bảng gỡ lỗi", !!coBang);
const dongLog = coBang ? [...coBang.querySelectorAll(".gl-dong")] : [];
chk("bảng liệt kê đủ số mục nhật ký", dongLog.length === 2, dongLog.length);
chk("mỗi dòng có giờ + chip ok/lỗi + loại lệnh", dongLog.length >= 1 && !!dongLog[0].querySelector(".gl-gio") && !!dongLog[0].querySelector(".chip") && !!dongLog[0].querySelector(".gl-loai"), dongLog[0] ? dongLog[0].textContent.replace(/\s+/g, " ").slice(0, 90) : "");
chk("dòng lỗi hiện lý do", dongLog.some((x) => x.textContent.indexOf("không ghi tín hiệu") >= 0));
const chiTietTho = coBang ? coBang.querySelectorAll(".gl-tho") : [];
chk("đầu ra thô nằm trong khối thu gọn (không phơi sẵn)", chiTietTho.length === 1 && chiTietTho[0].tagName === "DETAILS", chiTietTho.length + " khối");
const dauTrang = thanCuoi() ? [...thanCuoi().querySelectorAll(".gl-head")][0] : null;
chk("tiêu đề nói rõ trần 20 mục / 12 KB", !!dauTrang && dauTrang.textContent.indexOf("20") >= 0 && dauTrang.textContent.indexOf("12 KB") >= 0, dauTrang ? dauTrang.textContent.slice(0, 100) : "");
chk("có nút xuất gói gỡ lỗi", !!thanCuoi().querySelector('[data-gl-act="xuat"]'));
chk("có nút xoá nhật ký", !!thanCuoi().querySelector('[data-gl-act="xoa"]'));
chk("có nút mở tự kiểm tra dữ liệu", !!thanCuoi().querySelector('[data-gl-act="tukiem"]'));

// ---------------------------------------------------------------- gói gỡ lỗi: mặc định chỉ metadata
const goiMac = await T.dungGoLoi({});
const m1 = goiMac.nhatKy[0] || {};
chk("gói gỡ lỗi có loại/phiên bản", goiMac.type === "truyen-vai-go-loi" && goiMac.version > 0, goiMac.type + "/" + goiMac.version);
chk("mặc định KHÔNG kèm đầu ra thô", goiMac.kemDauRaTho === false && m1.dauRaTho === undefined);
chk("mặc định vẫn có metadata của lượt", typeof m1.loai === "string" && typeof m1.luc === "number" && typeof m1.ok === "boolean" && typeof m1.doDaiDauRa === "number", JSON.stringify(m1));
chk("metadata có lý do lỗi", goiMac.nhatKy.some((x) => String(x.lyDo).indexOf("không ghi tín hiệu") >= 0));
chk("gói mặc định KHÔNG chứa nội dung truyện", JSON.stringify(goiMac).indexOf(MOC) < 0);
chk("gói KHÔNG chứa mốc sao lưu riêng tư", goiMac.app.caiDat.saoLuu === undefined, JSON.stringify(goiMac.app.caiDat.saoLuu));
chk("gói nêu số mục nhật ký", goiMac.soMucNhatKy === 2, goiMac.soMucNhatKy);
chk("gói KHÔNG tự đánh dấu là đã dọn nhật ký", goiMac.daDonNhatKy === false);

const goiTho = await T.dungGoLoi({ kemTho: true });
const mucCoTho = goiTho.nhatKy.filter((x) => String(x.loai).indexOf("viết tiếp") >= 0)[0] || {};
const mucKhongTho = goiTho.nhatKy.filter((x) => String(x.loai).indexOf("khép cảnh") >= 0)[0] || {};
chk("khi xin kèm: có đầu ra thô", goiTho.kemDauRaTho === true && String(mucCoTho.dauRaTho).indexOf(MOC) >= 0, String(mucCoTho.dauRaTho).slice(0, 60));
chk("khi xin kèm: mục không có thô vẫn để chuỗi rỗng", mucKhongTho.dauRaTho === "", JSON.stringify(mucKhongTho.dauRaTho));
chk("khi xin kèm: giữ nguyên số mục", goiTho.nhatKy.length === goiMac.nhatKy.length, goiTho.nhatKy.length + "/" + goiMac.nhatKy.length);

const goiTk = await T.dungGoLoi({ kemTuKiemTra: true });
chk("gói có báo cáo tự kiểm tra khi được xin", !!goiTk.tuKiemTra && typeof goiTk.tuKiemTra.soLoi === "number", JSON.stringify(goiTk.tuKiemTra && goiTk.tuKiemTra.soLoi));

// ---------------------------------------------------------------- mô tả gói + hộp xác nhận
const moTa = T.moTaGoLoi(false, false);
chk("mô tả nói rõ KHÔNG kèm đầu ra thô", moTa.some((x) => x.indexOf("Không kèm đầu ra thô") >= 0));
chk("mô tả cam kết không chứa nội dung truyện", moTa.some((x) => x.indexOf("KHÔNG chứa") >= 0));
chk("mô tả bản có đầu ra thô thì CẢNH BÁO", T.moTaGoLoi(true, false).some((x) => x.indexOf("⚠") >= 0 && x.indexOf("NỘI DUNG TRUYỆN") >= 0));
chk("mô tả bản có tự kiểm tra thì nói có tên truyện", T.moTaGoLoi(false, true).some((x) => x.indexOf("TÊN TRUYỆN") >= 0));

dongHet();
T.openXuatGoLoi();
const coChon = await doi(() => thanCuoi() && thanCuoi().querySelector('[data-gl="tho"]'));
chk("hộp xuất gói mở được", !!coChon);
chk("mặc định KHÔNG tích ô đầu ra thô", !!coChon && coChon.checked === false);
chk("hộp nói rõ vì sao đầu ra thô là nhạy cảm", !!coChon && thanCuoi().textContent.indexOf("nội dung người lớn") >= 0);
const nutXuatFile = nutCuoi("Xuất file");
chk("có nút Xuất file", !!nutXuatFile);
let huyDuoc = false;
if (nutXuatFile) {
  nutXuatFile.click();
  const chuHop = () => (hopCuoi() ? hopCuoi().textContent : "");
  const coXacNhan = await doi(() => chuHop().indexOf("Gói gỡ lỗi sẽ chứa") >= 0);
  chk("có hộp xác nhận nói rõ gói chứa gì", !!coXacNhan);
  const chu = chuHop();
  chk("xác nhận liệt kê từng phần", chu.indexOf("Thông tin chung") >= 0 && chu.indexOf("Nhật ký AI") >= 0, chu.slice(0, 140));
  chk("xác nhận nói rõ lần này KHÔNG có đầu ra thô", chu.indexOf("Không kèm đầu ra thô") >= 0);
  const nutHuy = nutCuoi("Huỷ");
  if (nutHuy) { nutHuy.click(); huyDuoc = true; }
  await cho(300);
  chk("huỷ được (không tải file nào)", huyDuoc && batBlob === null, String(batTen));
}
dongHet();

// ---------------------------------------------------------------- xuất gói có đầu ra thô
T.openXuatGoLoi();
const coChon2 = await doi(() => thanCuoi() && thanCuoi().querySelector('[data-gl="tho"]'));
if (coChon2) {
  coChon2.checked = true;
  const nutXuat2 = nutCuoi("Xuất file");
  nutXuat2.click();
  const chuHop2 = () => (hopCuoi() ? hopCuoi().textContent : "");
  const coXN2 = await doi(() => chuHop2().indexOf("Đầu ra thô") >= 0);
  chk("xác nhận CẢNH BÁO khi có đầu ra thô", !!coXN2 && chuHop2().indexOf("CÓ THỂ CHỨA NỘI DUNG TRUYỆN") >= 0, coXN2 ? chuHop2().slice(0, 140) : "(không thấy)");
  const nutTai = nutCuoi("Tải file");
  chk("nút xác nhận nói rõ là bản có đầu ra thô", !!nutTai && nutTai.textContent.indexOf("có đầu ra thô") >= 0, nutTai ? nutTai.textContent.trim() : "");
  if (nutTai) {
    batBlob = null; batTen = null;
    nutTai.click();
    const coFile = await doi(() => batBlob !== null, 60);
    chk("tải được file gói gỡ lỗi", coFile === true && !!batTen, String(batTen));
    chk("tên file nói rõ là gói gỡ lỗi", String(batTen).indexOf("go-loi") >= 0, String(batTen));
    if (batBlob) {
      const j = JSON.parse(await batBlob.text());
      chk("gói tải về có đầu ra thô", j.kemDauRaTho === true && j.nhatKy.some((x) => String(x.dauRaTho).indexOf(MOC) >= 0));
      chk("gói tải về vẫn có metadata", typeof j.nhatKy[0].loai === "string" && typeof j.nhatKy[0].doDaiDauRa === "number");
    }
    const to = document.querySelector("#toastRoot .toast");
    chk("có thông báo sau khi tải", !!to && to.textContent.indexOf("có kèm đầu ra thô") >= 0, to ? to.textContent.trim() : "(không có toast)");
  }
}
dongHet();

// ---------------------------------------------------------------- xuất TRUYỆN không mang nhật ký
const fTruyen = await layFile(() => T.xuatTruyen(st));
const jTruyen = fTruyen.txt ? JSON.parse(fTruyen.txt) : {};
chk("xuất được truyện để đối chiếu", !!fTruyen.txt && JSON.stringify(jTruyen).indexOf(TEN) >= 0, String(fTruyen.ten));
chk("file xuất TRUYỆN không có mục nhật ký nào", Object.keys(jTruyen).map((x) => x.toLowerCase()).join(",").indexOf("nhat") < 0, Object.keys(jTruyen).join(","));
chk("file xuất TRUYỆN không chứa đầu ra thô", String(fTruyen.txt).indexOf(MOC) < 0);
chk("file xuất TRUYỆN không nhắc tới folder nhật ký", String(fTruyen.txt).indexOf("nhatKyLlm") < 0);
// Bản sao lưu toàn app cũng vậy (chỉ dựng chuỗi trong bộ nhớ, không ghi ra đĩa).
const fAll = await layFile(() => T.xuatTatCa());
const jAll = fAll.txt ? JSON.parse(fAll.txt) : {};
chk("xuất được bản sao lưu toàn bộ", !!fAll.txt && fAll.txt.indexOf("truyen-vai-all") >= 0, String(fAll.ten));
chk("bản sao lưu vẫn có đủ phần dữ liệu truyện", !!jAll.stories && !!jAll.messages && !!jAll.ngoaiHinh);
chk("bản sao lưu không có mục nhật ký nào", Object.keys(jAll).map((x) => x.toLowerCase()).join(",").indexOf("nhat") < 0, Object.keys(jAll).join(","));
chk("bản sao lưu KHÔNG chứa đầu ra thô", String(fAll.txt).indexOf(MOC) < 0);

// ---------------------------------------------------------------- nút xoá nhật ký
dongHet();
await T.openGoLoi();
await doi(() => thanCuoi() && thanCuoi().querySelector('[data-gl-act="xoa"]'));
const nutXoa = thanCuoi().querySelector('[data-gl-act="xoa"]');
nutXoa.click();
const nutXoaThat = await doi(() => nutCuoi("Xoá nhật ký"));
chk("nút xoá hỏi lại trước khi xoá", !!nutXoaThat);
chk("lời hỏi nói rõ xoá không ảnh hưởng truyện", !!nutXoaThat && hopCuoi().querySelector(".modal-body").textContent.indexOf("không ảnh hưởng truyện") >= 0);
if (nutXoaThat) {
  nutXoaThat.click();
  const daXoa = await doi(async () => (await T.docNhatKyLlm()).length === 0, 60);
  chk("xoá sạch nhật ký", daXoa === true);
  const baoRong = await doi(() => thanCuoi() && thanCuoi().textContent.indexOf("Chưa có lượt AI nào") >= 0, 60);
  chk("bảng hiện trạng thái rỗng sau khi xoá", !!baoRong);
}
dongHet();

// ---------------------------------------------------------------- trả nhật ký THẬT về nguyên trạng
try { await root.kv.nhatKyLlm.set("vong", logGoc); } catch (e) {}
const tra = await T.docNhatKyLlm();
chk("nhật ký thật trong máy được trả nguyên trạng", JSON.stringify(tra) === JSON.stringify(logGoc), tra.length + " / " + logGoc.length);
if (CAI_DAT_GOC === null) localStorage.removeItem("truyenVai.caiDat");
else localStorage.setItem("truyenVai.caiDat", CAI_DAT_GOC);
chk("cài đặt trong máy được trả nguyên trạng", localStorage.getItem("truyenVai.caiDat") === CAI_DAT_GOC);
S.loadSettings();

// ---------------------------------------------------------------- dọn dấu vết truyện thử
try {
  await S.deleteStory(st.id);
  await root.kv.tinNhan.delete(HT);
  await S.loadStories();
} catch (e) {}
dongHet();

return ca;
