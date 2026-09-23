// LỖI THẬT khi dùng app: "There's a problem with the syntax of this expression:
// '[NGOẠI HÌNH CỐ ĐỊNH — TRUYỆN VAI — giữ đúng từng người, không trộn đặc điểm giữa
// các nhân vật]' … Unexpected identifier 'HÌNH'".
//
// Nguyên nhân: `text-to-image-plugin` gọi `.evaluateItem` trên prompt (chuỗi trong trang
// Perchance có sẵn hàm này), nên prompt bị ĐỌC NHƯ MỘT MẪU PJS. Nhãn khối ngoại hình của
// app có ngoặc vuông ⇒ lỗi cú pháp; các ca khác cho thấy ngoặc còn bị THAY ÂM THẦM.
//
// PHẢI chạy sau: page_refresh (code hiện tại) → nh-fake-ai.js (một eval riêng).
// Không cần audit-base.js: bộ này không tạo truyện/hồ sơ trong kv.
const T = window.__tv_test;
if (!T) throw new Error("Thiếu __tv_test — tải lại trang");
const VE = window.__NH_VE;
if (!VE) throw new Error("Thiếu nh-fake-ai.js (máy vẽ giả) — nạp ở eval riêng trước");
const AI = T.AI;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ct === undefined ? "" : String(ct).slice(0, 160) });
const ghi = (s) => kq.push({ ten: "· " + s, ok: true, ct: "" });
const thoat = AI.thoatPerchance;
const ev = (s) => { try { const v = s.evaluateItem; return { v, throw: "" }; } catch (e) { return { v: undefined, throw: e.message }; } };

// ---------------------------------------------------------------- A. hàm thoát
chk("A1 chữ thường giữ nguyên", thoat("một cảnh bình thường, không ngoặc") === "một cảnh bình thường, không ngoặc");
chk("A2 ngoặc vuông bị thoát", thoat("[a]") === "\\[a\\]", thoat("[a]"));
chk("A3 ngoặc nhọn bị thoát", thoat("{a|b}") === "\\{a|b\\}", thoat("{a|b}"));
chk("A4 ngoặc lẻ từng cái", thoat("a ] b [ c } d { e") === "a \\] b \\[ c \\} d \\{ e", thoat("a ] b [ c } d { e"));
const mongNhan = "\\[" + T.MARK_NGOAI_HINH.slice(1, -1) + "\\]";
chk("A5 nhãn khối ngoại hình bị thoát", thoat(T.MARK_NGOAI_HINH) === mongNhan, thoat(T.MARK_NGOAI_HINH).slice(0, 44));
chk("A6 rỗng/null/undefined ⇒ chuỗi rỗng", thoat("") === "" && thoat(null) === "" && thoat(undefined) === "");
chk("A7 số ⇒ chuỗi", thoat(123) === "123");
chk("A8 nhiều dòng giữ nguyên xuống dòng", thoat("dòng 1\n[a]\ndòng 3") === "dòng 1\n\\[a\\]\ndòng 3");
chk("A9 dấu chéo KHÔNG đứng trước ngoặc thì không bị đụng", thoat("a\\b c") === "a\\b c", JSON.stringify(thoat("a\\b c")));
ghi("lưu ý nền tảng: engine tự hiểu '\\n'/''\\t' trong prompt thành xuống dòng/tab — có từ trước, không do thoát ngoặc");

// ------------------------------------------------- B. vòng lặp thoát → đánh giá
const vong = [
  "close-up, ánh nến, ống kính 50mm",
  "[NGOẠI HÌNH CỐ ĐỊNH — TRUYỆN VAI — giữ đúng từng người, không trộn đặc điểm giữa các nhân vật]\n- Sara: tóc đen, sẹo nhỏ bên má",
  "cô ấy [cười] rồi {thì thầm|nói to} điều gì đó",
  "biến [b = 3] phải còn nguyên chữ",
  "dấu chéo ngay trước ngoặc: x\\[ y và z\\{ w",
  "dấu ngoặc lồng [[a]] và {{b}}",
];
let soVong = 0;
for (let i = 0; i < vong.length; i++) {
  const r = ev(thoat(vong[i]));
  const dat = !r.throw && r.v === vong[i];
  if (dat) soVong++;
  chk("B" + (i + 1) + " thoát rồi đánh giá lại đúng chữ gốc", dat, r.throw ? "throw: " + r.throw : JSON.stringify(r.v).slice(0, 100));
}
ghi("vòng lặp thoát→đánh giá đúng: " + soVong + "/" + vong.length);

// ------------------------------------------- C. ĐỐI CHỨNG: không thoát thì hỏng
const raw1 = ev("[NGOẠI HÌNH CỐ ĐỊNH — TRUYỆN VAI — giữ đúng từng người]");
chk(
  "C1 (đối chứng) prompt không thoát ⇒ lỗi cú pháp — tái hiện đúng lỗi người dùng báo",
  raw1.throw !== "" || (typeof raw1.v === "string" && /syntax error/i.test(raw1.v)),
  raw1.throw ? "throw: " + raw1.throw : JSON.stringify(raw1.v)
);
const raw2 = ev("biến [b = 3] còn nguyên");
chk(
  "C2 (đối chứng) không thoát ⇒ ngoặc bị THAY ÂM THẦM, không phải chỉ báo lỗi",
  raw2.v !== "biến [b = 3] còn nguyên",
  JSON.stringify(raw2.v)
);
const raw3 = ev("{mưa|nắng} trên phố");
chk("C3 (đối chứng) không thoát ⇒ '{a|b}' bị chọn ngẫu nhiên", raw3.v === "mưa trên phố" || raw3.v === "nắng trên phố", JSON.stringify(raw3.v));

// ------------------------------------------------- D. đầu-cuối qua máy vẽ giả
chk("D1 thoatPerchance được phơi qua __tv_test.AI", typeof thoat === "function");

const hoSo = { id: "nhz_thoat", tenChinh: "Zara", tuoi: "24", moTa: "tóc đen ngắn, mắt nâu, sẹo nhỏ bên má", tranh: "không đội mũ" };
const khoi = T.khoiNgoaiHinh([hoSo]);
const moTaCanh = "close-up trong quán cà phê, cô ấy [cười] rồi {thì thầm|nói to}";
const goc = moTaCanh + "\n" + khoi;
const loaiTruGoc = "mờ, [nhiễu], {tối|cháy sáng}";

VE.calls = 0;
await AI.taoAnh({ prompt: goc, loaiTru: loaiTruGoc, kichThuoc: "768x512" });
chk("D2 máy vẽ được gọi đúng 1 lần", VE.calls === 1, VE.calls);
chk("D3 prompt gửi máy vẽ ĐÃ được thoát ngoặc", VE.last.includes("\\[") && VE.last !== goc, VE.last.slice(0, 60));
chk("D4 prompt loại trừ cũng được thoát", VE.lastLoaiTru.includes("\\[") && VE.lastLoaiTru.includes("\\{"), VE.lastLoaiTru);

const rD5 = ev(VE.last);
chk("D5 plugin đánh giá prompt KHÔNG lỗi (đây chính là chỗ đã nổ)", !rD5.throw && !/syntax error/i.test(String(rD5.v)), rD5.throw || String(rD5.v).slice(0, 60));
chk("D6 máy vẽ nhận đúng chữ gốc, không mất/không bị thay ký tự", rD5.v === goc, JSON.stringify(rD5.v).slice(0, 120));
chk("D7 nhãn khối ngoại hình tới máy vẽ dạng đọc được", String(rD5.v).indexOf(T.MARK_NGOAI_HINH) >= 0, String(rD5.v).slice(0, 80));
chk("D8 '[cười]' còn nguyên trong prompt máy vẽ nhận", String(rD5.v).includes("[cười]"));
chk("D9 '{thì thầm|nói to}' KHÔNG bị chọn ngẫu nhiên", String(rD5.v).includes("{thì thầm|nói to}"));
chk("D10 tên + mô tả hồ sơ vẫn có trong prompt", String(rD5.v).includes("Zara") && String(rD5.v).includes("sẹo nhỏ bên má"));

const rD11 = ev(VE.lastLoaiTru);
chk("D11 loại trừ đánh giá lại đúng chữ gốc", !rD11.throw && rD11.v === loaiTruGoc, rD11.throw || JSON.stringify(rD11.v));

VE.calls = 0;
const url = await AI.generateAvatar("chân dung [cận mặt] {vui|buồn}");
chk("D12 generateAvatar cũng được thoát ngoặc", VE.calls === 1 && VE.last.includes("\\[") && VE.last.includes("\\{"), VE.last);
const rD13 = ev(VE.last);
chk("D13 avatar: đánh giá lại đúng chữ gốc", rD13.v === "chân dung [cận mặt] {vui|buồn}", JSON.stringify(rD13.v));
chk("D14 generateAvatar vẫn trả ảnh", typeof url === "string" && url.startsWith("data:image/"));

// res dùng lại hàm thật của app để chắc chắn đường ghép prompt vẫn nguyên
chk("D15 ghepPromptNgoaiHinh vẫn ghép khối ở cuối prompt", T.ghepPromptNgoaiHinh(moTaCanh, [hoSo]).trim().endsWith(khoi.trim()));

return { ok: kq.every((x) => x.ok), tong: kq.length, hong: kq.filter((x) => !x.ok).length, failures: kq.filter((x) => !x.ok) };
