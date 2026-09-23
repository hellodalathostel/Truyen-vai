// Truyện Vai — tiện ích DOM dùng chung (không phụ thuộc file nào khác)

export function esc(s) {
  if (s === undefined || s === null) return "";
  return (s + "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Định dạng nội tuyến trên chuỗi ĐÃ escape: *nghiêng* **đậm** `mã` xuống dòng, link.
// (Tách riêng để lớp hiển thị chat dùng lại được cho từng đoạn.)
// `coNghieng = false` khi gọi từ bong bóng chat: ở đó `*...*` đã mang nghĩa HÀNH ĐỘNG,
// nên dấu sao không hợp lệ phải để nguyên chứ không quay về `<em>` như kiểu cũ.
function dinhDangInline(s, coNghieng = true) {
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  if (coNghieng) s = s.replace(/(^|[\s(«"“])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[\s(«"“])_([^_\n]+)_/g, "$1<em>$2</em>");
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\n/g, "<br>");
  return s;
}

// Định dạng nội dung tin nhắn: *nghiêng* **đậm** `mã` xuống dòng, link
export function fmt(text) {
  return dinhDangInline(esc(text));
}

// ------------------------------------------------------- lời thoại / hành động
// LUẬT NHẬN DIỆN (cố tình đơn giản, không đoán thêm khi thiếu dấu hiệu):
//  - `*...*`                          → hành động / miêu tả
//  - `"..."`, `“...”`                 → đối thoại
//  - dòng bắt đầu bằng `-` hoặc `—`   → đối thoại (cả dòng)
// Một đoạn chỉ được coi là có dấu hiệu khi dấu ĐÓNG đã có VÀ đoạn đó không vượt qua
// dòng trống — nên khi đang stream, một dấu mở chưa có dấu đóng vẫn nằm nguyên trong
// văn bản thường, và tự được định dạng lại ngay khi dấu đóng xuất hiện.
// Dấu `*` chỉ mở hành động khi đứng đầu chuỗi hoặc sau khoảng trắng/dấu câu (để `2*3*4`
// hay `a*b` không bị hiểu nhầm), và phần trong không được bắt đầu/kết thúc bằng khoảng
// trắng. Dấu `"` không mở đối thoại khi đứng ngay sau chữ/số (để `cao 1m75"` yên).
const SAU_DAU_MO_HANH_DONG = /[\s(«“"—–]/;
const TRUOC_CHU_SO = /[\p{L}\p{N}]/u;

function moHanhDongHopLe(t, i) {
  return i === 0 || SAU_DAU_MO_HANH_DONG.test(t[i - 1]);
}
function moNgoacHopLe(t, i) {
  return i === 0 || !TRUOC_CHU_SO.test(t[i - 1]);
}
// Dấu đóng gần nhất, KHÔNG tính nếu ở khác đoạn văn (có dòng trống ở giữa).
function timDauDong(t, from, ...dsDau) {
  let kq = -1;
  for (const d of dsDau) {
    const k = t.indexOf(d, from);
    if (k === -1) continue;
    if (t.slice(from, k).indexOf("\n\n") !== -1) continue;
    if (kq === -1 || k < kq) kq = k;
  }
  return kq;
}

export function phanTichDoanThoai(t) {
  t = t === undefined || t === null ? "" : String(t);
  const n = t.length;
  const ds = [];
  let buf = "";
  const xa = (loai, text) => {
    if (buf) { ds.push({ loai: "thuong", text: buf }); buf = ""; }
    ds.push({ loai, text });
  };
  let i = 0;
  while (i < n) {
    const c = t[i];
    const dauDong = i === 0 || t[i - 1] === "\n";
    // `**đậm**` là một khối nguyên vẹn — không cắt vào giữa.
    if (c === "*" && t[i + 1] === "*") {
      const k = t.indexOf("**", i + 2);
      if (k > i) { buf += t.slice(i, k + 2); i = k + 2; continue; }
      buf += c; i++; continue;
    }
    if (c === "*" && moHanhDongHopLe(t, i)) {
      const k = timDauDong(t, i + 1, "*");
      if (k !== -1) {
        const trong = t.slice(i + 1, k);
        if (trong && !/^\s/.test(trong) && !/\s$/.test(trong)) { xa("hanh-dong", trong); i = k + 1; continue; }
      }
      buf += c; i++; continue;
    }
    if (dauDong && (c === "-" || c === "—" || c === "–")) {
      const k = t.indexOf("\n", i);
      const het = k === -1 ? n : k;
      xa("doi-thoai", t.slice(i, het));
      i = het;
      continue;
    }
    if (c === '"' || c === "“") {
      if (moNgoacHopLe(t, i)) {
        const k = timDauDong(t, i + 1, '"', "”");
        if (k !== -1) { xa("doi-thoai", t.slice(i, k + 1)); i = k + 1; continue; }
      }
      buf += c; i++; continue;
    }
    buf += c; i++;
  }
  if (buf) ds.push({ loai: "thuong", text: buf });
  return ds;
}

// Lớp HIỂN THỊ cho bong bóng chat: bọc lời thoại / hành động vào span để dễ theo dõi.
// Chỉ ĐỌC `text` và trả HTML — không bao giờ sửa nội dung gốc (copy, sửa tin, xuất/nhập,
// tóm tắt và prompt gửi AI vẫn dùng nguyên văn). Mọi đoạn đều được `esc()` trước khi
// ghép HTML, nên chuỗi người dùng không bao giờ đi thẳng vào `innerHTML`.
export function fmtBongBong(text, phanBiet) {
  if (!phanBiet) return fmt(text);
  return phanTichDoanThoai(text)
    .map((dc) => {
      if (dc.loai === "hanh-dong") return '<span class="dk-hd">' + dinhDangInline(esc(dc.text), false) + "</span>";
      if (dc.loai === "doi-thoai") return '<span class="dk-dt">' + dinhDangInline(esc(dc.text), false) + "</span>";
      return dinhDangInline(esc(dc.text), false);
    })
    .join("");
}

const RAW = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8z"/>',
  scroll: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  copy: '<path d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  pin: '<path d="M12 22s7-4.6 7-11a7 7 0 10-14 0c0 6.4 7 11 7 11z"/><circle cx="12" cy="11" r="2.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  forward: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  heart: '<path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 21l8.8-8.3a5 5 0 000-7.1z"/>',
  clapper: '<path d="M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 10l1.4-6.2 15.7 3.4-.6 2.8"/><path d="M7.6 6.4l1.3 3.3M12.4 7.4l1.2 3.2M17.2 8.5l1.1 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.9 17.9A10.4 10.4 0 0112 19C5 19 1 12 1 12a18 18 0 015.1-5.9M9.9 4.2A10.4 10.4 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.1 3.2M1 1l22 22"/>',
};

export function icon(name, size = 18) {
  return (
    '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (RAW[name] || "") +
    "</svg>"
  );
}

let toastTimer = null;
export function toast(message, kind = "info") {
  const root = document.getElementById("toastRoot");
  if (!root) return;
  root.innerHTML = "";
  const t = document.createElement("div");
  t.className = "toast toast-" + kind;
  t.innerHTML = esc(message);
  root.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add("toast-out");
    setTimeout(() => t.remove(), 320);
  }, kind === "error" ? 5200 : 3000);
}

// opts: { title, subtitle, body (element or html), actions:[{label, onClick, primary, danger}], wide, onClose, dismissable }
export function modal(opts) {
  const rootEl = document.getElementById("modalRoot");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  const box = document.createElement("div");
  box.className = "modal-box" + (opts.wide ? " modal-wide" : "") + (opts.full ? " modal-full" : "");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  if (opts.title) box.setAttribute("aria-label", opts.title);
  box.tabIndex = -1;
  wrap.appendChild(box);

  const head = document.createElement("div");
  head.className = "modal-head";
  head.innerHTML =
    '<div class="modal-titles"><div class="modal-title">' + esc(opts.title || "") + "</div>" +
    (opts.subtitle ? '<div class="modal-subtitle">' + esc(opts.subtitle) + "</div>" : "") + "</div>";
  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn";
  closeBtn.innerHTML = icon("close", 18);
  closeBtn.title = "Đóng";
  closeBtn.setAttribute("aria-label", "Đóng");
  head.appendChild(closeBtn);
  box.appendChild(head);

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  if (opts.body instanceof Node) bodyEl.appendChild(opts.body);
  else if (typeof opts.body === "string") bodyEl.innerHTML = opts.body;
  box.appendChild(bodyEl);
  // Nhiều trường chỉ có một nhãn đứng trước mà không nối bằng `for`/`id` — gắn
  // aria-label để trình đọc màn hình vẫn đọc được tên trường.
  try {
    Array.from(bodyEl.querySelectorAll("label.field-label")).forEach((lb) => {
      const tiep = lb.nextElementSibling;
      if (!tiep) return;
      const ds = ["input", "textarea", "select"].indexOf(tiep.tagName.toLowerCase()) >= 0 ? [tiep] : Array.from(tiep.querySelectorAll("input, textarea, select"));
      const ten = (lb.textContent || "").replace(/\s*\(.*?\)\s*$/, "").trim();
      if (!ten) return;
      ds.forEach((f) => { if (!f.getAttribute("aria-label") && !f.id) f.setAttribute("aria-label", ten); });
    });
  } catch (e) { /* không quan trọng tới mức chặn modal */ }

  const foot = document.createElement("div");
  foot.className = "modal-foot";
  box.appendChild(foot);

  const api = {
    wrap,
    box,
    bodyEl,
    footEl: foot,
    close() {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
      if (opts.onClose) opts.onClose();
    },
  };

  (opts.actions || []).forEach((a) => {
    const b = document.createElement("button");
    b.className = "btn" + (a.primary ? " btn-primary" : "") + (a.danger ? " btn-danger" : "");
    b.innerHTML = esc(a.label);
    b.onclick = () => a.onClick(api);
    if (a.disabled) b.disabled = true;
    foot.appendChild(b);
  });
  if (!opts.actions || !opts.actions.length) foot.remove();

  function onKey(e) {
    if (e.key === "Escape") {
      // chỉ đóng modal trên cùng — Escape không được đóng cả chồng modal cùng lúc
      if (rootEl.lastElementChild === wrap) api.close();
      return;
    }
    if (e.key === "Tab") {
      // giữ tiêu điểm bên trong modal đang mở trên cùng
      if (rootEl.lastElementChild !== wrap) return;
      const ds = box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!ds.length) return;
      const dau = ds[0];
      const cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) {
        e.preventDefault();
        cuoi.focus();
      } else if (!e.shiftKey && document.activeElement === cuoi) {
        e.preventDefault();
        dau.focus();
      }
    }
  }
  closeBtn.onclick = () => api.close();
  wrap.addEventListener("mousedown", (e) => {
    if (e.target === wrap && opts.dismissable !== false) api.close();
  });
  document.addEventListener("keydown", onKey);

  rootEl.appendChild(wrap);
  ganAriaNhan(wrap);
  const focusEl = box.querySelector("[data-autofocus]");
  if (focusEl) setTimeout(() => focusEl.focus(), 40);
  else setTimeout(() => box.focus(), 40);
  return api;
}

export function confirmModal(title, message, onYes, opts = {}) {
  return modal({
    title,
    body: '<div class="confirm-text">' + esc(message) + "</div>",
    onClose: opts.onClose,
    actions: [
      { label: opts.cancelLabel || "Huỷ", onClick: (m) => { m.close(); if (opts.onCancel) opts.onCancel(); } },
      {
        label: opts.yesLabel || "Đồng ý",
        primary: !opts.danger,
        danger: opts.danger,
        onClick: (m) => {
          m.close();
          onYes();
        },
      },
    ],
  });
}

export function promptModal(title, { label, value = "", multiline = false, placeholder = "", subtitle, onSave } = {}) {
  const holder = document.createElement("div");
  holder.innerHTML =
    (label ? '<label class="field-label">' + esc(label) + "</label>" : "") +
    (multiline
      ? '<textarea class="input" data-autofocus rows="5" placeholder="' + esc(placeholder) + '"></textarea>'
      : '<input class="input" data-autofocus type="text" placeholder="' + esc(placeholder) + '">');
  const input = holder.querySelector("[data-autofocus]");
  input.value = value;
  const m = modal({
    title,
    subtitle,
    body: holder,
    actions: [
      { label: "Huỷ", onClick: (mm) => mm.close() },
      {
        label: "Lưu",
        primary: true,
        onClick: (mm) => {
          const v = input.value.trim();
          mm.close();
          onSave(v);
        },
      },
    ],
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      const v = input.value.trim();
      m.close();
      onSave(v);
    }
  });
  return m;
}

// Nút chỉ có icon vẫn cần một cái tên cho trình đọc màn hình. Rất nhiều nút trong app
// chỉ có `title` (title KHÔNG phải nhãn truy cập được), nên lấy `title` làm aria-label.
export function ganAriaNhan(scope) {
  const root = scope || document;
  try {
    root.querySelectorAll("button.icon-btn, button.tool, button.chat-more-btn").forEach((b) => {
      if (b.getAttribute("aria-label")) return;
      if ((b.textContent || "").trim()) return;
      const ten = b.getAttribute("title");
      if (ten) b.setAttribute("aria-label", ten);
    });
  } catch (e) { /* không quan trọng tới mức chặn giao diện */ }
}

export function initials(text) {
  const s = (text || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeAgo(ts) {
  if (!ts) return "";
  const d = Date.now() - ts;
  if (d < 60000) return "vừa xong";
  if (d < 3600000) return Math.floor(d / 60000) + " phút trước";
  if (d < 86400000) return Math.floor(d / 3600000) + " giờ trước";
  if (d < 86400000 * 30) return Math.floor(d / 86400000) + " ngày trước";
  return new Date(ts).toLocaleDateString("vi-VN");
}

export function hexToRgba(hex, alpha) {
  const h = (hex || "#8b5cf6").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

export function el(tag, attrs = {}, html) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") e.className = attrs[k];
    else if (k === "dataset") Object.assign(e.dataset, attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
