// Mở hộp thoại Nhập truyện và DỪNG lại (không bấm Nhập) để soi bố cục.
window.__fileTxt = __TXT__;
window.__fileInp = null;
const origCreate = document.createElement.bind(document);
document.createElement = function (tag, ...rest) {
  const el = origCreate(tag, ...rest);
  if (String(tag).toLowerCase() === "input") {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "type");
    Object.defineProperty(el, "type", {
      set(v) { d.set.call(el, v); if (el.type === "file") window.__fileInp = el; },
      get() { return d.get.call(el); }, configurable: true,
    });
  }
  return el;
};
if (!document.querySelector('[data-act="story-menu"]')) {
  const card = document.querySelector('[data-act="open-story"]');
  if (card) { card.click(); await new Promise((r) => setTimeout(r, 900)); }
}
let menuBtn = document.querySelector('[data-act="story-menu"]');
if (!menuBtn) {
  const b = document.querySelector('[data-act="go-library"]');
  if (b) { b.click(); await new Promise((r) => setTimeout(r, 600)); const c2 = document.querySelector('[data-act="open-story"]'); if (c2) { c2.click(); await new Promise((r) => setTimeout(r, 900)); } menuBtn = document.querySelector('[data-act="story-menu"]'); }
}
if (!menuBtn) return { err: "khong mo duoc tuy chon truyen" };
menuBtn.click();
await new Promise((r) => setTimeout(r, 400));
[...document.querySelectorAll('[data-act="import-story"]')].pop().click();
await new Promise((r) => setTimeout(r, 300));
document.createElement = origCreate;
const inp = window.__fileInp;
if (!inp) return { err: "khong bat duoc input" };
const dt = new DataTransfer();
dt.items.add(new File([window.__fileTxt], "nhap-file.json", { type: "application/json" }));
inp.files = dt.files;
inp.dispatchEvent(new Event("change", { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
const box = [...document.querySelectorAll(".modal-backdrop")].pop();
if (!box || !box.querySelector(".nhap-tk")) return { err: "khong mo duoc hop thoai" };
return { ok: true, soChuDe: box.querySelectorAll(".nhap-mode").length, coXoa: !!box.querySelector('[data-f="xoaThua"]') };
