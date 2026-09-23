// AI giả cho kiểm thử "Gợi ý lời đáp".
// PHẢI nạp ở MỘT page_eval RIÊNG (root phơi plugin qua proxy nên gán trong cùng eval có
// thể chưa "ăn" ngay ở lời gọi kế tiếp). Trạng thái đọc LIVE từ window.__GY_AI nên bộ
// kiểm thử chỉ cần đổi .mode/.text/.delay giữa các lời gọi.
window.__GY_AI = window.__GY_AI || { mode: "ok", text: "", delay: 0, calls: 0, last: "" };
const FAKE = window.__GY_AI;
if (!FAKE.__da) {
  FAKE.__da = true;
  const f = (opts) => {
    if (opts && opts.getMetaObject) {
      return { countTokens: (t) => Math.ceil(String(t || "").length / 3.6), idealMaxContextTokens: 6000 };
    }
    FAKE.calls++;
    if (opts && opts.instruction) FAKE.last = String(opts.instruction);
    let stopped = false;
    const p = new Promise((res) => {
      setTimeout(() => {
        if (FAKE.mode === "error") return res({ text: "", stopReason: "error" });
        if (opts && typeof opts.onChunk === "function") opts.onChunk({ fullTextSoFar: FAKE.text });
        res({ text: FAKE.text, stopReason: stopped ? "user" : "stop" });
      }, FAKE.delay || 0);
    });
    p.stop = () => { stopped = true; };
    return p;
  };
  root.aiTextPlugin = f;
  FAKE.calls = 0;
}
return { da: true, goi: FAKE.calls, kieu: typeof root.aiTextPlugin };
