// Truyện Vai — công cụ SNAPSHOT prompt + mốc prefix-cache (Giai đoạn 7a).
// Chạy: node tests/lib/tao-prompt-fixture.mjs
//
// Đây KHÔNG phải ca kiểm thử (không gọi `test(`) nên `node --test tests/node/` không nhặt.
// Chỉ chạy khi prompt ĐỔI CÓ CHỦ ĐÍCH — khi đó phải commit CÙNG LÚC: fixture mới, moc.json
// mới, và một dòng lý do trong tests/README.md (hoặc trong thông điệp commit).
//
// Tệp này KHÔNG dùng dấu gạch chéo ngược.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./moi-truong.js";
import { chayTatCa, mocTuKetQua, SO_LUOT } from "./prompt.mjs";

const NL = String.fromCharCode(10);
const GOC = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const DIR = path.join(GOC, "tests", "fixtures", "prompt");

fs.mkdirSync(DIR, { recursive: true });

const kq = await chayTatCa();
let soTep = 0;
for (const key of Object.keys(kq)) {
  kq[key].prompts.forEach((p, i) => {
    fs.writeFileSync(path.join(DIR, key + "-" + (i + 1) + ".txt"), p, "utf8");
    soTep += 1;
  });
}
fs.writeFileSync(path.join(DIR, "moc.json"), JSON.stringify(mocTuKetQua(kq), null, 2) + NL, "utf8");

console.log("đã ghi " + soTep + " tệp prompt + moc.json vào tests/fixtures/prompt/");
for (const key of Object.keys(kq)) {
  console.log(
    "  " + key + ": " + SO_LUOT + " lượt · tiền tố chung nhỏ nhất " + kq[key].nhoNhat +
      " · trung bình " + kq[key].trungBinh
  );
}
