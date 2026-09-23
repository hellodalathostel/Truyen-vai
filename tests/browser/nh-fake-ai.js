// AI giả cho kiểm thử "Thư viện ngoại hình".
// PHẢI nạp ở MỘT page_eval RIÊNG (xem ghi chú trong gy-fake-ai.js).
// Ghi lại: số lần gọi, `instruction` cuối (đã ghép chuỗi), có phải mảng không, và số Blob
// ảnh được đính kèm — để kiểm tra AI có thật sự nhận ảnh tham chiếu hay không.
window.__NH_AI = window.__NH_AI || { mode: "ok", text: "", delay: 0, calls: 0, last: "", lastArr: false, blobCount: 0 };
const FAKE = window.__NH_AI;
if (!FAKE.__da) {
  FAKE.__da = true;
  const f = (opts) => {
    if (opts && opts.getMetaObject) {
      return { countTokens: (t) => Math.ceil(String(t || "").length / 3.6), idealMaxContextTokens: 6000 };
    }
    FAKE.calls++;
    FAKE.lastArr = Array.isArray(opts && opts.instruction);
    FAKE.blobCount = 0;
    if (FAKE.lastArr) {
      for (const p of opts.instruction) if (p && typeof p === "object" && p.size !== undefined && p.type) FAKE.blobCount++;
    }
    FAKE.last = FAKE.lastArr
      ? opts.instruction.map((x) => (x && typeof x === "object" && x.size !== undefined && x.type ? "[ANH]" : String(x))).join("")
      : String((opts && opts.instruction) || "");
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
  // Máy vẽ ảnh GIẢ: ghi lại prompt + loại trừ đã nhận, trả về một ảnh 1px hợp lệ.
  // Dùng để kiểm tra prompt cuối thật sự gửi tới máy vẽ (ngoại hình đã ghép, trang phục
  // theo cảnh, "điều cần tránh" của hồ sơ có trong prompt loại trừ).
  const ANH_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  window.__NH_VE = window.__NH_VE || { calls: 0, last: "", lastLoaiTru: "", lastKichThuoc: "", mode: "ok" };
  const VE = window.__NH_VE;
  root.textToImagePlugin = (prompt, opts) => {
    VE.calls++;
    VE.last = String(prompt || "");
    VE.lastLoaiTru = String((opts && opts.negativePrompt) || "");
    VE.lastKichThuoc = String((opts && opts.resolution) || "");
    if (VE.mode === "error") return Promise.reject(new Error("máy vẽ giả gặp lỗi"));
    return Promise.resolve({ dataUrl: ANH_1PX });
  };
  VE.calls = 0;
}
return { da: true, kieu: typeof root.aiTextPlugin, ve: typeof root.textToImagePlugin };
