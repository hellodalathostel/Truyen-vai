// Truyện Vai — tầng kiểm thử Node: các hàm THUẦN của src/dom.js.
// Chạy: node --test tests/node/

import { test, ok, eq, eqSau, bao } from "../lib/h.js";
import { esc, fmt, phanTichDoanThoai, fmtBongBong, initials, timeAgo, hexToRgba } from "../../src/dom.js";

const NL = String.fromCharCode(10);
const NH = String.fromCharCode(34);
const co = (s, x) => String(s).indexOf(x) >= 0;
const THE_B = "<b>a" + NH + "b" + NH + ">";

test("esc: thoát ký tự HTML nguy hiểm", () => {
  eq(esc("&"), "&amp;", "dấu và");
  eq(esc("<"), "&lt;", "dấu nhỏ hơn");
  eq(esc(">"), "&gt;", "dấu lớn hơn");
  eq(esc(THE_B), "&lt;b&gt;a&quot;b&quot;&gt;", "thẻ và nháy kép");
  eq(esc(String.fromCharCode(39)), "&#039;", "nháy đơn thành thực thể số");
  eq(esc(null), "", "null thành rỗng");
  eq(esc(undefined), "", "undefined thành rỗng");
  eq(esc(0), "0", "số 0 vẫn là chuỗi");
});

test("fmt: escape trước, rồi mới định dạng nội tuyến", () => {
  eq(fmt("**đậm**"), "<strong>đậm</strong>", "in đậm");
  eq(fmt("`mã`"), "<code>mã</code>", "mã nội tuyến");
  eq(fmt("*nghiêng*"), "<em>nghiêng</em>", "in nghiêng ở đầu chuỗi");
  eq(fmt("a *nghiêng* b"), "a <em>nghiêng</em> b", "in nghiêng giữa câu");
  eq(fmt("a_b_c"), "a_b_c", "gạch dưới giữa chữ không thành nghiêng");
  eq(fmt("x" + NL + "y"), "x<br>y", "xuống dòng thành br");
  ok(co(fmt("<script>"), "&lt;script&gt;"), "thẻ script bị vô hiệu hoá");
  ok(co(fmt("http://a.b/c"), "href=\"http://a.b/c\""), "URL thành liên kết");
  eq(fmt(""), "", "chuỗi rỗng giữ nguyên");
  eq(fmt(null), "", "null thành rỗng");
});

test("phanTichDoanThoai: tách *hành động* và lời thoại", () => {
  eqSau(phanTichDoanThoai("*Anh cười.*"), [{ loai: "hanh-dong", text: "Anh cười." }], "hành động trọn đoạn");
  eqSau(phanTichDoanThoai(NH + "Xin chào" + NH), [{ loai: "doi-thoai", text: NH + "Xin chào" + NH }], "lời thoại trong nháy kép");
  eqSau(phanTichDoanThoai("- Câu này là thoại"), [{ loai: "doi-thoai", text: "- Câu này là thoại" }], "gạch đầu dòng là thoại");
  eqSau(phanTichDoanThoai("2*3*4"), [{ loai: "thuong", text: "2*3*4" }], "dấu sao giữa chữ số không mở hành động");
  eqSau(phanTichDoanThoai("cao 1m75" + NH), [{ loai: "thuong", text: "cao 1m75" + NH }], "nháy kép sau chữ số không mở thoại");
  eqSau(phanTichDoanThoai("He nói: " + NH + "đi thôi." + NH), [{ loai: "thuong", text: "He nói: " }, { loai: "doi-thoai", text: NH + "đi thôi." + NH }], "thoại nằm sau phần dẫn");
  eqSau(phanTichDoanThoai("**đậm**"), [{ loai: "thuong", text: "**đậm**" }], "khối in đậm không bị cắt đôi");
  ok(co(JSON.stringify(phanTichDoanThoai("*chưa đóng")), "thuong"), "dấu mở chưa có dấu đóng thì giữ nguyên");
});

test("phanTichDoanThoai: không bao giờ mất chữ", () => {
  const mau = [
    "*Anh cười.* " + NH + "Đi thôi." + NH,
    "cau 1" + NL + "- cau 2" + NL + "- cau 3",
    "2*3*4 va 1 < 10",
    "**dam** va *nghieng* xen ke",
  ];
  // Đoạn HÀNH ĐỘNG được trả về PHẦN TRONG dấu sao (việc tô kiểu do lớp hiển thị làm),
  // nên bất biến đúng là: bỏ dấu sao ở hai bên thì phải khớp — không mất ký tự nào khác.
  const boSao = (s) => s.split("*").join("");
  for (const m of mau) {
    const ghep = phanTichDoanThoai(m).map((d) => d.text).join("");
    eq(boSao(ghep), boSao(m), "ghép các đoạn phải giữ đủ chữ: " + m.slice(0, 24));
  }
});

test("fmtBongBong: bọc thoại/hành động, vẫn escape", () => {
  eq(fmtBongBong("xin chào", false), "xin chào", "tắt phân biệt thì như fmt");
  const html = fmtBongBong("*Anh cười.* " + NH + "Đi thôi." + NH, true);
  ok(co(html, "class=\"dk-hd\""), "có span hành động");
  ok(co(html, "class=\"dk-dt\""), "có span đối thoại");
  ok(!co(html, "<script"), "không để lọt thẻ");
});

test("initials / timeAgo / hexToRgba", () => {
  eq(initials("Nguyễn Văn An"), "NA", "chữ đầu và chữ cuối");
  eq(initials("An"), "AN", "một từ thì lấy hai ký tự");
  eq(initials("   "), "?", "khoảng trắng thì hỏi chấm");
  eq(initials(""), "?", "chuỗi rỗng thì hỏi chấm");
  eq(timeAgo(0), "", "không có mốc thì rỗng");
  eq(timeAgo(Date.now()), "vừa xong", "dưới một phút");
  eq(timeAgo(Date.now() - 120000), "2 phút trước", "hai phút");
  eq(timeAgo(Date.now() - 7200000), "2 giờ trước", "hai giờ");
  eq(timeAgo(Date.now() - 3 * 86400000), "3 ngày trước", "ba ngày");
  eq(hexToRgba("#8b5cf6", 0.5), "rgba(139,92,246,0.5)", "mã màu sáu ký tự");
  eq(hexToRgba("#fff", 1), "rgba(255,255,255,1)", "mã màu ba ký tự");
  eq(hexToRgba("", 0.2), "rgba(139,92,246,0.2)", "thiếu mã thì dùng mặc định");
});
