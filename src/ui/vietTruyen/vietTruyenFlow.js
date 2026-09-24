// Truyện Vai — màn "Viết thành truyện" (`vietTruyen`): LOGIC THUẦN.
//
// Vì sao tách riêng: mọi QUYẾT ĐỊNH của tính năng này — chọn nguồn nào, cắt log thành mấy lô, khi
// nào phải nén phần prose đã viết, cắt ở đâu để mạch văn nối liền — đều là biến đổi dữ liệu thuần:
// không DOM, không kv, không gọi AI. Để ở đây thì kiểm được ở tầng Node (nhanh, không tốn quota,
// chạy trên CI), còn `index.js` chỉ còn phần giao diện + gọi model thật.
//
// Tệp này KHÔNG import gì — kể cả `ai.js`. Mọi phụ thuộc được TRUYỀN VÀO (`countTokens`,
// `idealMaxTokens`) nên tầng Node cắm được hàm giả để kiểm đúng ngưỡng, và tầng trình duyệt truyền
// đúng hàm thật của app. Đây cũng là lý do không có hằng số ký tự nào bị đóng cứng: ngân sách ký tự
// của một lô được ĐO từ chính `countTokens` (xem `gioiHanKyTuChoLo`).
//
// Bất biến của tệp này:
//   · Nguồn (`layNguonVietTruyen`) chỉ ĐỌC dữ liệu nhập vai. Không chỗ nào trong tính năng này ghi
//     ngược vào `canhDaKhep`/`hoiThoais` — văn xuôi là dữ liệu DẪN XUẤT, lưu riêng ở `truyenVietRa`.
//   · `chiaLoNguon` KHÔNG bao giờ mất chữ: tổng ký tự các lô = tổng ký tự nguồn (đoạn được cắt nhỏ
//     vẫn giữ nguyên từng ký tự, chỉ đổi chỗ ngắt), và không lô nào vượt ngưỡng.

export const LOAI_NGUON = ["tho", "canhKhep"];

// Phần ngân sách token của một lượt gọi dành cho ĐOẠN NGUỒN cần viết (phần còn lại: nguyên tắc +
// tóm tắt + phần cuối prose giữ nguyên + TASK). 0,6 ngân sách kia là mức kích hoạt nén prose
// (`TY_LE_CAN_NEN`) — hai con số này cộng lại là 1, tức là "phần đã viết" và "phần sắp viết"
// không bao giờ tranh nhau quá nửa cửa sổ ngữ cảnh.
export const TY_LE_NGAN_SACH_NGUON = 0.4;

// Prose đã viết vượt 60% ngân sách thì phải nén phần đầu trước khi gọi lượt kế tiếp. Thấp hơn mức
// 0,88 của cơ chế tóm tắt nhập vai là CÓ CHỦ ĐÍCH: prompt ở đây còn phải chứa đoạn nguồn kế tiếp
// (0,4 ngân sách) cộng các nguyên tắc ở mục 4 của bản chỉ đạo.
export const TY_LE_CAN_NEN = 0.6;

// Khi nén: giữ nguyên khoảng 20% CUỐI của prose để lượt sau nối liền mạch với câu gần nhất.
export const TY_LE_GIU_CUOI = 0.2;

// Tỉ lệ ký tự/token chỉ dùng khi KHÔNG đo được (countTokens không có, hoặc trả về 0/không hợp lệ).
// 3,6 đúng bằng mặc định của `countTokens` trong `ai.js`, nên đường dự phòng không lệch với app.
export const TY_LE_CHU_MOI_TOKEN = 3.6;

// ------------------------------------------------------------------ 1. nguồn
// Ghép "nguồn" cho một lượt viết:
//   · "tho"      — tin nhắn của MỘT hội thoại, chỉ `vai` là "nguoi"/"ai" (bỏ "he"/"anh"), theo `luc`
//                  tăng dần. Tin nhắn nằm ở kv riêng (không nằm trong bản ghi truyện), nên phải
//                  truyền vào — cùng quy ước với `buildLog(story, conv, messages)` của `ai.js`.
//   · "canhKhep" — `tomTat` của những cảnh đã khép thuộc hội thoại đó và chưa bị huỷ, theo `luc`.
// Bỏ những đoạn rỗng (không có chữ nào để viết). Không có gì ⇒ mảng rỗng.
export function layNguonVietTruyen(story, hoiThoaiId, loaiNguon, tinNhan) {
  if (!story || typeof story !== "object") return [];
  const id = chuoi(hoiThoaiId === undefined || hoiThoaiId === null ? "" : hoiThoaiId);
  if (!id) return [];
  return loaiNguon === "canhKhep" ? doanTuCanhKhep(story, id) : doanTuTinNhan(tinNhan);
}

function doanTuTinNhan(tinNhan) {
  const ds = (Array.isArray(tinNhan) ? tinNhan : [])
    .map((m, i) => ({ m: m, i: i }))
    .filter((x) => x.m && typeof x.m === "object" && (x.m.vai === "nguoi" || x.m.vai === "ai"))
    .map((x) => ({ noiDung: chuoi(x.m.noiDung), luc: Number(x.m.luc) || 0, i: x.i }))
    .filter((x) => x.noiDung.trim() !== "")
    .sort((a, b) => a.luc - b.luc || a.i - b.i);
  return ds.map((x) => x.noiDung);
}

function doanTuCanhKhep(story, id) {
  const ds = (Array.isArray(story.canhDaKhep) ? story.canhDaKhep : [])
    .map((c, i) => ({ c: c, i: i }))
    .filter((x) => x.c && typeof x.c === "object")
    // `huy: true` = cảnh đã bị người dùng bỏ; `chuanHoaTruyen` đã ép trường này về true/false.
    .filter((x) => (x.c.htId === id || (Array.isArray(x.c.htIds) && x.c.htIds.indexOf(id) >= 0)) && x.c.huy !== true)
    .map((x) => ({ noiDung: chuoi(x.c.tomTat), luc: Number(x.c.luc) || 0, i: x.i }))
    .filter((x) => x.noiDung.trim() !== "")
    .sort((a, b) => a.luc - b.luc || a.i - b.i);
  return ds.map((x) => x.noiDung);
}

// ------------------------------------------------------------------ 2. chia lô
// Chia nguồn thành các lô sao cho mỗi lô vừa một lượt gọi AI. `gioiHanKyTu` là ngân sách ký tự của
// MỘT lô khi ghép nối bằng "\n\n" (xem `gioiHanKyTuChoLo` để biết cách tính từ token).
//
// Luật: không lô nào vượt ngưỡng; không đoạn nào bị bỏ; đoạn dài hơn ngưỡng bị cắt thành nhiều mảnh
// giữ NGUYÊN từng ký tự (chỉ đổi chỗ ngắt — ưu tiên ranh giới câu/đoạn, cắt thẳng chỉ là phương án
// cuối) nên tổng ký tự trước và sau khi chia luôn bằng nhau. `gioiHanKyTu` không hợp lệ (≤ 0, không
// phải số) ⇒ một lô duy nhất, vì cắt được còn hơn mất chữ.
export function chiaLoNguon(doanNguon, gioiHanKyTu) {
  const goc = (Array.isArray(doanNguon) ? doanNguon : []).map(chuoi).filter((t) => t.length > 0);
  if (!goc.length) return [];
  const gh = Math.floor(Number(gioiHanKyTu));
  if (!Number.isFinite(gh) || gh <= 0) return [goc];
  const manh = [];
  for (const t of goc) for (const m of catDoan(t, gh)) manh.push(m);
  const lo = [];
  let cur = [];
  let dai = 0; // độ dài lô hiện tại nếu nối các đoạn bằng "\n\n"
  for (const t of manh) {
    const them = (cur.length ? 2 : 0) + t.length;
    if (cur.length && dai + them > gh) {
      lo.push(cur);
      cur = [];
      dai = 0;
    }
    cur.push(t);
    dai += (cur.length > 1 ? 2 : 0) + t.length;
  }
  if (cur.length) lo.push(cur);
  return lo;
}

// Cắt một đoạn dài thành các mảnh ≤ `gh`, giữ nguyên từng ký tự (nối lại đúng bằng đoạn gốc).
function catDoan(t, gh) {
  if (t.length <= gh) return [t];
  const ra = [];
  let i = 0;
  while (i < t.length) {
    if (t.length - i <= gh) {
      ra.push(t.slice(i));
      break;
    }
    const cat = mocCat(t, i, i + gh);
    ra.push(t.slice(i, cat));
    i = cat;
  }
  return ra;
}

// Chỗ ngắt gần cuối nhất mà vẫn ≤ `den`: ưu tiên sau dấu câu, rồi sau khoảng trắng, cuối cùng là
// cắt thẳng tại `den`. Luôn trả về chỉ số > `tu` để vòng lặp không kẹt.
function mocCat(t, tu, den) {
  for (let p = den; p > tu; p--) {
    const truoc = t[p - 1];
    const sau = t[p];
    const sauCau = (truoc === "." || truoc === "!" || truoc === "?" || truoc === "…" || truoc === "\n") &&
      (sau === undefined || sau === " " || sau === "\n");
    if (sauCau) return p;
  }
  for (let p = den; p > tu; p--) if (t[p - 1] === " ") return p;
  return den;
}

// Ngân sách ký tự của một lô, tính từ ngân sách TOKEN — không hard-code "một token bằng mấy ký tự":
// tỉ lệ ký tự/token được ĐO trên chính văn bản nguồn (`mauDo`) bằng `countTokens` của app, nên đổi
// bộ đếm token là ngưỡng tự đổi theo. Trả về 0 = "không giới hạn" (ngân sách token không hợp lệ).
export function gioiHanKyTuChoLo(countTokens, idealMaxTokens, mauDo) {
  const soToken = typeof idealMaxTokens === "function" ? Number(idealMaxTokens()) : Number(idealMaxTokens);
  if (!Number.isFinite(soToken) || soToken <= 0) return 0;
  const nganSach = Math.max(1, Math.floor(soToken * TY_LE_NGAN_SACH_NGUON));
  const mau = chuoi(mauDo);
  let tyLe = TY_LE_CHU_MOI_TOKEN;
  const tk = typeof countTokens === "function" ? Number(countTokens(mau)) : NaN;
  if (mau.length > 0 && Number.isFinite(tk) && tk > 0) tyLe = mau.length / tk;
  return Math.max(1, Math.floor(nganSach * tyLe));
}

// ------------------------------------------------------------------ 3. nén prose
// Prose đã viết có vượt ngưỡng phải nén phần đầu không? `countTokens` và `idealMaxTokens` được
// truyền vào (tầng Node cắm hàm giả để kiểm đúng mốc 0,6).
export function canNenProse(proseDaViet, idealMaxTokens, countTokens) {
  const prose = chuoi(proseDaViet);
  if (prose.trim() === "" || typeof countTokens !== "function") return false;
  const soToken = typeof idealMaxTokens === "function" ? Number(idealMaxTokens()) : Number(idealMaxTokens);
  if (!Number.isFinite(soToken) || soToken <= 0) return false;
  const da = Number(countTokens(prose));
  if (!Number.isFinite(da)) return false;
  return da > TY_LE_CAN_NEN * soToken;
}

// Phần CUỐI của prose cần giữ NGUYÊN để lượt sau nối liền mạch. Cắt ở ranh giới đoạn (dòng trống),
// nếu không có thì ranh giới câu, cuối cùng mới cắt thẳng — và luôn cắt ở mức KHÔNG QUÁ chỉ số yêu
// cầu, nên phần giữ lại không bao giờ ngắn hơn tỉ lệ đã đòi. Kết quả luôn là ĐUÔI NGUYÊN VĂN của
// input (không thêm/bớt ký tự nào bên trong).
export function cutProseGiuMachVan(proseDaViet, tyLeGiuCuoi) {
  const prose = chuoi(proseDaViet);
  if (!prose) return "";
  const ty = tyLeGiuCuoi === undefined || tyLeGiuCuoi === null ? TY_LE_GIU_CUOI : Number(tyLeGiuCuoi);
  if (!Number.isFinite(ty) || ty <= 0) return "";
  if (ty >= 1) return prose;
  const tu = prose.length - Math.ceil(prose.length * ty);
  return prose.slice(mocGiu(prose, tu));
}

// Phần ĐẦU của prose — đúng phần bị nén thành đoạn tóm tắt. Hai hàm này chia prose thành hai phần
// không chồng nhau và không sót ký tự nào (`phanDau + phanCuoi === prose`).
export function phanDauProseCanNen(proseDaViet, tyLeGiuCuoi) {
  const prose = chuoi(proseDaViet);
  const giu = cutProseGiuMachVan(prose, tyLeGiuCuoi);
  return giu ? prose.slice(0, prose.length - giu.length) : prose;
}

function mocGiu(prose, tu) {
  if (tu <= 0) return 0;
  const doan = prose.lastIndexOf("\n\n", tu - 1);
  if (doan >= 0) return doan + 2;
  for (let p = tu; p > 0; p--) {
    const truoc = prose[p - 1];
    const sau = prose[p];
    if ((truoc === "." || truoc === "!" || truoc === "?" || truoc === "…") && (sau === undefined || sau === " " || sau === "\n")) return p;
  }
  return tu;
}

function chuoi(x) {
  return String(x === undefined || x === null ? "" : x);
}
