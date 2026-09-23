// Cài AI giả vào page. Chạy trong page_eval RIÊNG (root proxy cache), rồi mới gọi tính năng.
const KH = {
  plan: [
    "TRẠNG THÁI XUẤT PHÁT: Aric đã hứa nhưng Kai vẫn dè chừng, tin tưởng hai chiều đang lệch.",
    "MỤC TIÊU: Kai dần cho Aric cơ hội giải thích và bớt canh chừng.",
    "BƯỚC CHUYỂN:",
    "- Aric chủ động để lại một vật nhỏ mà Kai từng nhắc tới, không nói gì thêm.",
    "- Một tình huống nhỏ khiến Kai buộc phải dựa vào Aric trong vài giây.",
    "- Kai tự mình ở lại thay vì rời đi như mọi lần.",
    "DẤU HIỆU: Kai bớt quay đi khi Aric lại gần; Aric không hỏi dồn.",
    "XUNG ĐỘT: KHONG CO",
    "ĐIỀU KIỆN ĐỔI HƯỚNG: Nếu Kai bị đặt vào thế phải tin ngay, hướng này phải chậm lại.",
  ].join("\n"),
  group: "Kai liếc sang Aric rồi cúi xuống, giọng thấp hơn hẳn mọi khi.\n<<HIENDIEN>> Kai, Aric\n<<KHEP>> có\n<<HET>>",
  phieu: [
    "TÓM TẮT: Aric để lại vật nhỏ và Kai không rời đi; hai người im lặng nhưng ở lại cạnh nhau.",
    "KÝ ỨC:",
    "- Aric để lại vật nhỏ mà Kai từng nhắc tới | BIẾT: Kai, Aric",
    "QUAN HỆ:",
    "- Kai -> Aric: tin tưởng lên | VÌ: Kai chọn ở lại thay vì rời đi | CHƯA NÓI: Kai vẫn sợ bị bỏ rơi",
    "NHÂN VẬT:",
    "- Kai: cam xuc | CŨ: dè chừng | MỚI: bớt dè chừng, còn do dự | VÌ: đã ở lại một lần",
    "MÓC: Sáng hôm sau Aric hỏi Kai về món đồ cũ",
    "TIẾN ĐỘ ĐẠO DIỄN:",
    "- Hướng tin nhau: đang tiến triển | BẰNG CHỨNG: Kai ở lại thay vì rời đi | BƯỚC TIẾP: để Aric hỏi một câu thật thà",
    "- Hàn gắn Kai–Aric: bị cản | BẰNG CHỨNG: Kai đứng dậy rời bàn ngay khi Aric lại gần | BƯỚC TIẾP: để Aric chịu đựng mà không đuổi theo",
    "- Hỏi thẳng: có thể hoàn tất | BẰNG CHỨNG: Kai đã hỏi thẳng Aric một câu và chờ trả lời | BƯỚC TIẾP: giữ nguyên, không cần đẩy thêm",
  ].join("\n"),
  don: "Kai im lặng một lúc rồi khẽ gật.\n<<KHEP>> không",
};
function chon(instruction) {
  const s = String(instruction || "");
  if (s.indexOf("KHÉP CẢNH") >= 0) return KH.phieu;
  if (s.indexOf("KẾ HOẠCH CẦU NỐI") >= 0) return KH.plan;
  if (s.indexOf("<<HIENDIEN>>") >= 0) return KH.group;
  return KH.don;
}
window.__lastInstruction = "";
const fake = function (opts) {
  opts = opts || {};
  if (opts.getMetaObject) return { countTokens: (t) => Math.ceil((t || "").length / 3.6), idealMaxContextTokens: 6000 };
  window.__lastInstruction = opts.instruction || "";
  const text = chon(opts.instruction);
  let dung = false;
  const p = new Promise((res) => {
    let i = 0;
    const buoc = () => {
      if (dung) return res({ text, stopReason: "user" });
      const truoc = i;
      i += Math.max(24, Math.round(text.length / 6));
      if (opts.onChunk) opts.onChunk({ textChunk: text.slice(truoc, i), fullTextSoFar: text.slice(0, i) });
      if (i >= text.length) return res({ text, stopReason: "" });
      setTimeout(buoc, 5);
    };
    buoc();
  });
  p.stop = () => { dung = true; };
  return p;
};
window.__fakeAIErr = "";
try { root.aiTextPlugin = fake; } catch (e) { window.__fakeAIErr = String(e); }
return window.__fakeAIErr || "installed";