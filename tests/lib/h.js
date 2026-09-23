// Truyện Vai — bộ khung kiểm thử tối giản, dùng chung cho CẢ HAI tầng:
//   • tầng Node: `node --test tests/node/` — mỗi ca được đăng ký thẳng với `node:test`.
//   • tầng trình duyệt (tests/browser/runner.js) — ca được gom vào hàng đợi rồi `chay()`.
//
// Luật của file này: KHÔNG dùng dấu gạch chéo ngược ở bất kỳ đâu, và không import gì
// ngoài `node:test` (được bọc trong try/catch) — nhờ vậy cùng một file chạy được ở cả
// hai môi trường mà không phải rẽ nhánh theo môi trường ở phía bộ kiểm thử.

let nodeTest = null;
try {
  const m = await import("node:test");
  nodeTest = m && typeof m.test === "function" ? m.test : null;
} catch (e) {
  nodeTest = null;
}

export const coNode = !!nodeTest;

export const kq = { tong: 0, hong: 0, dsHong: [], log: [] };
const hangDoi = [];

// Đăng ký một ca. Ở Node thì giao thẳng cho `node:test`; ở trình duyệt thì xếp hàng đợi.
export function test(ten, fn) {
  if (coNode) {
    nodeTest(ten, async () => {
      const truoc = kq.hong;
      await fn();
      if (kq.hong > truoc) throw new Error("có khẳng định không đạt trong ca: " + ten);
    });
    return;
  }
  hangDoi.push({ ten, fn });
}

function ghi(dat, ten) {
  kq.tong += 1;
  if (dat) kq.log.push(chk + " " + ten);
  else {
    kq.hong += 1;
    kq.dsHong.push(ten);
    kq.log.push(x + " " + ten);
  }
  return !!dat;
}
const chk = String.fromCharCode(10003);
const x = String.fromCharCode(10007);

// Một khẳng định. KHÔNG ném lỗi (để một ca còn chạy hết các khẳng định sau).
export function ok(dieuKien, ten) {
  return ghi(!!dieuKien, ten);
}

export function eq(thuc, mong, ten) {
  return ghi(thuc === mong, ten + " — nhận " + JSON.stringify(thuc) + ", mong " + JSON.stringify(mong));
}

export function eqSau(thuc, mong, ten) {
  const a = JSON.stringify(thuc);
  const b = JSON.stringify(mong);
  return ghi(a === b, ten + " — nhận " + a + ", mong " + b);
}

// Gần đúng trong sai số cho phép (thời gian/thực).
export function gan(thuc, mong, saiSo, ten) {
  return ghi(Math.abs(Number(thuc) - Number(mong)) <= saiSo, ten + " — nhận " + thuc + ", mong " + mong);
}

// Khẳng định một hàm NÉM lỗi.
export function bao(fn, ten) {
  let nem = false;
  try { fn(); } catch (e) { nem = true; }
  return ghi(nem, ten);
}

// Chạy hết hàng đợi (chỉ có tác dụng ở tầng trình duyệt; ở Node thì `node:test` lo).
export async function chay() {
  if (coNode) return kq;
  for (const t of hangDoi) {
    const truoc = kq.hong;
    try {
      await t.fn();
    } catch (e) {
      ghi(false, t.ten + " — ném lỗi: " + String((e && e.message) || e));
      continue;
    }
    if (kq.hong > truoc) continue;
  }
  return kq;
}

export function datLai() {
  kq.tong = 0;
  kq.hong = 0;
  kq.dsHong.length = 0;
  kq.log.length = 0;
  hangDoi.length = 0;
}

export function tomTat(tenTep) {
  const dat = kq.tong - kq.hong;
  return (kq.hong ? x : chk) + " " + (tenTep ? tenTep + " — " : "") + dat + "/" + kq.tong + " khẳng định đạt";
}

export function danhSachHong() {
  return kq.dsHong.slice();
}
