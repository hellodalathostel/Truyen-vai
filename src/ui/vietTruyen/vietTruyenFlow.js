// Truyện Vai — màn "Viết thành truyện" (`vietTruyen`): LOGIC THUẦN.
//
// Vì sao tách riêng: mọi QUYẾT ĐỊNH của tính năng này — chọn nguồn nào, cắt log thành mấy lô, khi
// nào phải nén phần prose đã viết, cắt ở đâu để mạch văn nối liền — đều là biến đổi dữ liệu thuần:
// không DOM, không kv, không gọi AI. Để ở đây thì kiểm được ở tầng Node (nhanh, không tốn quota,
// chạy trên CI), còn `index.js` chỉ còn phần giao diện + gọi model thật.
//
// Phụ thuộc: `countTokens`/`idealMaxTokens` được TRUYỀN VÀO (tầng Node cắm hàm giả để kiểm đúng
// ngưỡng, tầng trình duyệt truyền đúng hàm thật của app). Cũng vì thế không có hằng số ký tự nào bị
// đóng cứng: ngân sách ký tự của một lô được ĐO từ chính `countTokens` (xem `gioiHanKyTuChoLo`).
//
// Ngoại lệ DUY NHẤT: cổng 18+ lấy THẲNG từ `store.js` chứ không nhận qua tham số. Cửa chặn nội
// dung người lớn phải là MỘT nguồn duy nhất (luật §2.6 — và tầng Node có ca ghim "câu chữ 18+ chỉ
// có một nguồn"); nhận nó qua tham số là mở đường cho bản sao thứ hai lệch câu chữ. Mọi thứ còn lại
// của tệp này vẫn thuần: không DOM, không kv, không gọi AI.
//
// Bất biến của tệp này:
//   · Nguồn (`layNguonVietTruyen`) chỉ ĐỌC dữ liệu nhập vai. Không chỗ nào trong tính năng này ghi
//     ngược vào `canhDaKhep`/`hoiThoais` — văn xuôi là dữ liệu DẪN XUẤT, lưu riêng ở `truyenVietRa`.
//   · `chiaLoNguon` KHÔNG bao giờ mất chữ: tổng ký tự các lô = tổng ký tự nguồn (đoạn được cắt nhỏ
//     vẫn giữ nguyên từng ký tự, chỉ đổi chỗ ngắt), và không lô nào vượt ngưỡng.

import { chanNoiDungNguoiLon, laCheDoNguoiLon } from "../../store.js";

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

// ------------------------------------------------------------------ 4. nguyên tắc prompt
// Khối nguyên tắc TĨNH — KHÔNG tham số, KHÔNG phụ thuộc truyện. Đây là phần ĐẦU của prompt nên phải
// ổn định từ lượt này sang lượt khác: đó chính là điều kiện để prefix cache dùng lại được, đúng
// nguyên tắc "đầu ổn định, cuối TASK thay đổi" của `ai.js`. (Vì vậy ghi chú người lớn ở dưới nằm
// NGOÀI hàm này chứ không phải một tham số của nó.)
//
// Ba nguyên tắc không phải ba câu khẩu hiệu suông: mỗi cái chặn đúng một kiểu hỏng đã gặp khi viết
// lại log nhập vai thành văn xuôi — (1) model tự sáng tác thêm cảnh không ai diễn, (2) model coi
// một dòng tóm tắt cảnh khép là việc đã kể xong nên nhảy cóc, (3) model coi đoạn sau là "cùng cảnh
// với đoạn trước" nên gộp hai đoạn làm một và bỏ luôn đoạn sau.
export function layNguyenTacVietTruyen() {
  return [
    "BA NGUYÊN TẮC BẮT BUỘC KHI VIẾT LẠI THÀNH VĂN XUÔI:",
    "1. Không tự bịa thêm. Nguồn (log thô, hoặc tóm tắt cảnh đã khép) là SỰ THẬT đã diễn ra trong buổi nhập vai. Chỉ được viết lại đúng những gì có trong nguồn: cấm thêm tình huống, nhân vật, địa điểm hay chi tiết không có trong nguồn.",
    "2. Mỗi đoạn nguồn phải thành một cảnh THẬT trong prose, không phải một câu tóm lược. Kể cả một dòng tóm tắt cảnh khép ngắn cũng phải được viết ra thành đoạn văn có hành động và lời nói cụ thể.",
    "3. Đoạn nguồn sau dùng chung nhân vật hoặc địa điểm với đoạn trước KHÔNG có nghĩa là đoạn trước đã xong. Mỗi đoạn trong lô đang xử lý phải xuất hiện đầy đủ và riêng biệt trong prose.",
  ].join("\n");
}

// Ghi chú CHỈ dành cho truyện đang ở chế độ người lớn. Viết lại thành văn xuôi là ĐỔI HÌNH THỨC, không
// phải đổi MỨC ĐỘ: nguồn đã rõ ràng tới đâu thì prose ra tới đó. Một dòng, tách riêng khỏi khối tĩnh
// để `layNguyenTacVietTruyen()` vẫn tĩnh tuyệt đối.
export const GHI_CHU_MUC_DO_NGUOI_LON =
  "GHI CHÚ (truyện đang ở chế độ người lớn): giữ ĐÚNG mức độ rõ ràng của nguồn, không tự làm nhẹ, không tự lược bỏ khi viết lại thành văn xuôi.";

// Khối nguyên tắc dùng THẬT cho một truyện: phần tĩnh ở đầu (cache-able), cộng ghi chú người lớn khi
// lớp nội dung người lớn của truyện đó đang bật. Phần tĩnh luôn là TIỀN TỐ của kết quả, nên truyện
// thường và truyện người lớn vẫn chia sẻ được đúng đoạn prefix đó.
export function layNguyenTacVietTruyenCho(story) {
  const goc = layNguyenTacVietTruyen();
  return laCheDoNguoiLon(story) ? goc + "\n" + GHI_CHU_MUC_DO_NGUOI_LON : goc;
}

// ------------------------------------------------------------------ 5. cổng 18+ trước khi chạy
// Viết lại thành truyện đưa nguyên văn nguồn vào prompt rồi yêu cầu model viết ở ĐÚNG mức độ rõ ràng
// của nguồn, nên đây là một ĐƯỜNG VÀO nội dung người lớn nữa: phải đi qua đúng cửa chặn dùng chung
// `chanNoiDungNguoiLon` (luật §2.6), không được tự suy từ `c.tuoi`.
//
// Cửa này KHÔNG hỏi lại 18+ — đây không phải luồng tạo mới: truyện đã tồn tại và người dùng đã đi
// qua cửa 18+ từ trước. Nếu dữ liệu hiện tại không còn hợp lệ (có nhân vật ghi tuổi dưới 18, hoặc
// nhân vật chưa được xác nhận trưởng thành khi lớp người lớn đang bật) thì chỉ còn một việc đúng:
// CHẶN và trả lại nguyên văn lý do của cửa dùng chung để giao diện hiện cho người dùng, kèm cách sửa.
//
// Thuần: chỉ ĐỌC truyện, không sửa gì (không tự bật/tắt giao kèo, không tự ghi cờ `nguoiLon`).
export function kiemVietTruyenTruocKhiChay(story) {
  const loiNeu = chuoi(chanNoiDungNguoiLon(story));
  return { choPhep: loiNeu === "", loiNeu };
}

// ==========================================================================
// 6. LẮP PROMPT TỪNG LÔ (Đợt 5)
// ==========================================================================
// Thứ tự các khối là BẮT BUỘC, theo đúng nguyên tắc "đầu ổn định, cuối TASK thay đổi" của `ai.js`:
//   [nguyên tắc tĩnh] → [văn đã viết (hoặc bản đã nén + đoạn đuôi giữ nguyên)] → [TASK + nguồn lô]
// Nhờ vậy phần đầu dùng chung giữa mọi lô (prefix cache dùng lại được), còn phần đổi theo lô nằm ở
// cuối. KHÔNG đảo thứ tự này, kể cả khi thấy "đọc tự nhiên hơn" — đảo là mất cache và làm model
// bám theo đoạn nguồn cũ.
export const NHAN_DA_VIET = "VĂN XUÔI ĐÃ VIẾT (nối tiếp mạch văn này, KHÔNG viết lại phần đã có):";
export const NHAN_TOM_TAT = "TÓM TẮT PHẦN XA ĐÃ VIẾT TRƯỚC ĐÓ (phần này đã được nén lại, vẫn là sự thật đã kể):";
export const NHAN_DUOI = "PHẦN VĂN VỪA VIẾT (giữ nguyên, bản viết tiếp phải nối liền ngay sau đây):";
export const NHAN_NGUON = "NGUỒN CỦA LÔ NÀY (viết lại thành văn xuôi, chỉ được dùng đúng sự thật trong đây):";

// Dòng TASK — phần ĐỔI theo lô nên nằm CUỐI prompt. Nhắc lại ba việc dễ hỏng nhất của một lô (nối
// mạch, không sót đoạn, không viết lại) và luật chương của bản văn xuôi (mục 5 của bản chỉ đạo):
// heading chương là của BẢN PROSE NÀY, không đụng `story.chuongs` của phần nhập vai.
export function nhanTaskLo(lo, tongLo) {
  const n = Math.max(0, Math.floor(Number(tongLo) || 0));
  const i = Math.max(0, Math.floor(Number(lo) || 0));
  return (
    "TASK: Viết tiếp thành văn xuôi kể chuyện cho " +
    (n > 1 ? "lô nguồn thứ " + i + "/" + n + " ở dưới" : "toàn bộ nguồn ở dưới") +
    ".\n" +
    "- Viết nối liền mạch với phần văn phía trên; KHÔNG viết lại và KHÔNG tóm tắt lại phần đã viết.\n" +
    "- Viết đủ MỌI đoạn nguồn trong lô này thành cảnh thật (có hành động, lời nói, cảm xúc cụ thể), không bỏ sót đoạn nào.\n" +
    '- Khi nội dung đã dài hoặc chuyển sang bối cảnh lớn khác, tự chèn heading chương theo mẫu "## Chương <số>: <tiêu đề ngắn>" — đây là chương của BẢN VĂN XUÔI NÀY (không phải chương của bản nhập vai).\n' +
    "- Chỉ trả về phần văn xuôi, không lời dẫn, không ghi chú, không giải thích."
  );
}

// Prompt đầy đủ của MỘT lô. `tomTat` chỉ có khi lô này dùng bản đã nén (khi đó `duoi` là phần văn
// giữ nguyên để nối mạch); nếu không nén thì đưa TOÀN BỘ văn đã viết (`proseDaViet`) — hai đường
// loại trừ nhau, không bao giờ đưa cả hai (đưa cả hai là nhân đôi ngữ cảnh).
export function dungPromptVietLo({ nguyenTac, proseDaViet, tomTat, duoi, doanLo, lo, tongLo }) {
  const parts = [chuoi(nguyenTac).trim()];
  const tt = chuoi(tomTat).trim();
  const cuoi = chuoi(duoi).trim();
  if (tt) parts.push(NHAN_TOM_TAT + "\n" + tt + (cuoi ? "\n\n" + NHAN_DUOI + "\n" + cuoi : ""));
  else if (chuoi(proseDaViet).trim()) parts.push(NHAN_DA_VIET + "\n" + chuoi(proseDaViet).trim());
  parts.push(nhanTaskLo(lo, tongLo) + "\n\n" + NHAN_NGUON + "\n" + (Array.isArray(doanLo) ? doanLo : []).map(chuoi).join("\n\n"));
  return parts.filter((x) => x.trim() !== "").join("\n\n");
}

// Prompt của lượt gọi AI PHỤ dùng để nén phần đầu văn đã viết (mục 3 của bản chỉ đạo). Đây là dữ
// liệu TẠM trong lúc sinh — bản tóm tắt KHÔNG được lưu vào truyện.
export function dungPromptNenProse(phanDau) {
  return (
    "TÓM TẮT PHẦN VĂN XUÔI Ở DƯỚI thành MỘT đoạn ngắn 4-6 câu, tiếng Việt tự nhiên.\n" +
    "- Giữ lại: tên riêng, sự kiện đã xảy ra, lời hứa, bí mật đã lộ, cảm xúc dai dẳng, thay đổi trong quan hệ.\n" +
    "- Không thêm chi tiết không có trong phần văn đó; không nhận xét, không mở bài, không kết luận.\n" +
    "- Chỉ trả về đoạn tóm tắt.\n\n" +
    "PHẦN VĂN XUÔI CẦN NÉN:\n" + chuoi(phanDau)
  );
}

// Nội dung xuất/copy của một mục `truyenVietRa`. Thuần: chỉ ĐỌC mục và trả CHUỖI (rỗng nếu chưa có
// gì) — phần gọi clipboard/tải tệp mới cần DOM, nằm ở vỏ màn.
export function noiDungDeXuat(muc) {
  return chuoi(muc && muc.noiDung).trim();
}

// Danh sách mục để HIỆN: mới nhất lên đầu (bản vừa viết xong nằm ngay trên, không phải cuộn xuống
// đáy), và là bản SAO của mảng trong truyện — màn không được cầm một mảng có thể bị `store.js` thay
// thế trong lúc đang chạy.
export function dsVietRa(story) {
  return (Array.isArray(story && story.truyenVietRa) ? story.truyenVietRa : [])
    .filter((m) => m && typeof m === "object")
    .slice()
    .sort((a, b) => (Number(b.taoLuc) || 0) - (Number(a.taoLuc) || 0));
}

// Số ĐOẠN NGUỒN đã đọc HẾT sau khi xử lý xong các mảnh `manhDaXong`. Vì `chiaLoNguon` chỉ CẮT chứ
// không đảo chữ, mỗi mảnh luôn là một phần ĐẦU của đoạn đang đọc — nên chỉ cần bám con trỏ: hết
// đoạn khi tổng số ký tự đã lấy bằng đúng phần còn lại của đoạn đó. (Đếm theo mảnh là SAI: một
// đoạn dài bị cắt thành nhiều mảnh sẽ bị tính thành nhiều đoạn.)
export function demDoanDaDoc(nguon, manhDaXong) {
  const goc = (Array.isArray(nguon) ? nguon : []).map(chuoi).filter((t) => t !== "");
  if (!goc.length) return 0;
  let i = 0;
  let con = goc[0].length;
  let n = 0;
  for (const m of Array.isArray(manhDaXong) ? manhDaXong : []) {
    let dai = chuoi(m).length;
    while (dai > 0 && i < goc.length) {
      if (dai >= con) {
        dai -= con;
        i += 1;
        n += 1;
        con = i < goc.length ? goc[i].length : 0;
      } else {
        con -= dai;
        dai = 0;
      }
    }
    if (i >= goc.length) break;
  }
  return n;
}

// ==========================================================================
// 7. LUỒNG CHẠY THẬT (Đợt 5)
// ==========================================================================
// Chạy cả một lượt "viết thành truyện": cổng 18+ → chia lô → với mỗi lô: (nén nếu cần) → lắp prompt
// → gọi AI → nối prose → báo tiến độ → kiểm xem người dùng có xin dừng không.
//
// Vì sao hai lời gọi AI được TRUYỀN VÀO (`viet`/`nen`) chứ không import `ai.js`: cùng lý do như
// `countTokens` — tầng Node cắm bản GIẢ nên kiểm được ĐÚNG số lần gọi, ĐÚNG thứ tự khối prompt và
// ĐÚNG cách nối prose, mà không tốn quota (mục 9 của bản chỉ đạo). Hàm này KHÔNG đụng DOM, không
// đọc kv, không ghi truyện: nó chỉ trả về kết quả, còn vỏ màn lo phần lưu/hiện.
//
//      viet(prompt, khiChunk, thongTin) → Promise<{ text, stopReason }>   (dạng `streamText` ai.js)
//      nen(prompt)                      → Promise<{ text }>
//      choPhepDung()                    → boolean  (đọc giữa hai lô, KHÔNG cắt ngang lô đang gọi)
//      khiChunk(vanTinhDenDay, {lo, tongLo}) — văn xuôi cập nhật dần trong lúc model trả chữ
//      khiMoiLo({lo, tongLo, proseDaViet, daDoc, tongDoan}) — xong một lô (vỏ màn lưu tiến độ ở đây)
//
// Kết quả: `trangThai` chỉ nhận "xong" hoặc "loi" (đúng ba giá trị của schema, KHÔNG bao giờ để mục
// kẹt ở "dangChay"), `daDung` = người dùng bấm dừng giữa hai lô, `loiNeu` = lý do cho giao diện.
export async function chayVietTruyen(opts) {
  const o = opts || {};
  const kq = {
    choPhep: true, trangThai: "xong", daDung: false, loiNeu: "", proseDaViet: "",
    soLo: 0, soLoDaXong: 0, soLanViet: 0, soLanNen: 0, daDoc: 0, tongDoan: 0,
  };
  const cong = kiemVietTruyenTruocKhiChay(o.story);
  kq.choPhep = cong.choPhep;
  if (!cong.choPhep) {
    kq.trangThai = "loi";
    kq.loiNeu = cong.loiNeu;
    return kq;
  }
  const nguon = layNguonVietTruyen(o.story, o.hoiThoaiId, o.loaiNguon, o.tinNhan);
  const dsLo = chiaLoNguon(nguon, gioiHanKyTuChoLo(o.countTokens, o.idealMaxTokens, nguon.join("\n\n")));
  kq.soLo = dsLo.length;
  kq.tongDoan = nguon.length;
  if (!dsLo.length) {
    kq.trangThai = "loi";
    kq.loiNeu = "Hội thoại này chưa có đoạn nguồn nào để viết.";
    return kq;
  }
  const nguyenTac = layNguyenTacVietTruyenCho(o.story);
  const manhDaXong = [];
  let prose = "";
  for (let i = 0; i < dsLo.length; i++) {
    // (a) nén phần xa nếu cần — lô đầu thì chưa có gì để nén.
    let tomTat = "";
    let duoi = "";
    if (i > 0 && canNenProse(prose, o.idealMaxTokens, o.countTokens)) {
      const nen = typeof o.nen === "function" ? o.nen : null;
      try {
        if (!nen) throw new Error("thiếu hàm nén");
        kq.soLanNen += 1;
        const r = await nen(dungPromptNenProse(phanDauProseCanNen(prose, TY_LE_GIU_CUOI)));
        tomTat = chuoi(r && r.text).trim();
        if (!tomTat) throw new Error("model trả về bản tóm tắt rỗng");
        duoi = cutProseGiuMachVan(prose, TY_LE_GIU_CUOI);
      } catch (e) {
        kq.trangThai = "loi";
        kq.loiNeu = loiChay("Không nén được phần văn đã viết", i + 1, dsLo.length, e);
        break;
      }
    }
    // (b) lô này: giữ cả phần chữ đã sinh dở nếu lượt gọi hỏng giữa chừng — người dùng đã nhìn thấy
    // nó trên màn hình, xoá đi là mất chữ (cùng quy ước với lượt nhập vai bị dừng).
    let dangViet = "";
    let res = null;
    try {
      kq.soLanViet += 1;
      res = await o.viet(
        dungPromptVietLo({ nguyenTac, proseDaViet: prose, tomTat, duoi, doanLo: dsLo[i], lo: i + 1, tongLo: dsLo.length }),
        o.khiChunk ? (c) => { dangViet += chuoi(c); o.khiChunk(noiThem(prose, dangViet), { lo: i + 1, tongLo: dsLo.length }); } : undefined,
        { lo: i + 1, tongLo: dsLo.length }
      );
      if (!res || res.stopReason === "error") throw new Error("model trả lỗi");
      if (chuoi(res.text).trim() === "") throw new Error("model không trả về chữ nào");
    } catch (e) {
      prose = noiThem(prose, chuoi(res && res.text) || dangViet);
      kq.trangThai = "loi";
      kq.loiNeu = loiChay("Không viết được", i + 1, dsLo.length, e);
      break;
    }
    prose = noiThem(prose, res.text);
    for (const m of dsLo[i]) manhDaXong.push(m);
    kq.soLoDaXong = i + 1;
    kq.proseDaViet = prose;
    kq.daDoc = demDoanDaDoc(nguon, manhDaXong);
    if (typeof o.khiMoiLo === "function") {
      o.khiMoiLo({ lo: i + 1, tongLo: dsLo.length, proseDaViet: prose, daDoc: kq.daDoc, tongDoan: kq.tongDoan });
    }
    if (typeof o.choPhepDung === "function" && o.choPhepDung()) {
      kq.daDung = true;
      break;
    }
  }
  kq.proseDaViet = prose;
  if (kq.trangThai !== "xong") kq.daDung = false;
  return kq;
}

function noiThem(prose, them) {
  const t = chuoi(them).trim();
  if (!t) return prose;
  return prose ? prose + "\n\n" + t : t;
}

// Lý do cho giao diện. Nói rõ phần đã viết KHÔNG bị xoá — đây là điều người dùng cần biết trước
// tiên khi một lô hỏng (họ vẫn xem/xuất được phần đã có).
function loiChay(viec, lo, tongLo, e) {
  const ly = chuoi(e && e.message).trim();
  return (
    viec + " ở lô " + lo + "/" + tongLo + (ly ? " (" + ly + ")" : "") +
    ". Phần văn đã viết vẫn được giữ nguyên — bạn xem và xuất được ngay."
  );
}
