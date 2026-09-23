// AI giả "lỗi": lập kế hoạch cầu nối thì ném lỗi; các việc khác vẫn chạy.
const KH = {
  group: "Kai gật đầu rất khẽ.\n<<HIENDIEN>> Kai, Aric\n<<KHEP>> không\n<<HET>>",
  phieu: [
    "TÓM TẮT: Một cảnh ngắn.",
    "KÝ ỨC: KHONG CO",
    "QUAN HỆ: KHONG CO",
    "NHÂN VẬT: KHONG CO",
    "MÓC: KHONG CO",
  ].join("\n"),
  don: "Kai im lặng.\n<<KHEP>> không",
};
window.__lastInstruction = "";
const fake = function (opts) {
  opts = opts || {};
  if (opts.getMetaObject) return { countTokens: (t) => Math.ceil((t || "").length / 3.6), idealMaxContextTokens: 6000 };
  window.__lastInstruction = opts.instruction || "";
  const s = String(opts.instruction || "");
  if (s.indexOf("KẾ HOẠCH CẦU NỐI") >= 0) {
    const p = Promise.reject(new Error("Máy chủ AI không phản hồi. Thử lại sau vài giây."));
    p.stop = () => {};
    return p;
  }
  const text = s.indexOf("KHÉP CẢNH") >= 0 ? KH.phieu : s.indexOf("<<HIENDIEN>>") >= 0 ? KH.group : KH.don;
  const p = Promise.resolve({ text, stopReason: "" });
  p.stop = () => {};
  if (opts.onChunk) setTimeout(() => opts.onChunk({ textChunk: text, fullTextSoFar: text }), 1);
  return p;
};
window.__fakeAIErr = "";
try { root.aiTextPlugin = fake; } catch (e) { window.__fakeAIErr = String(e); }
return window.__fakeAIErr || "installed-loi";