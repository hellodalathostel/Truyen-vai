// Truyện Vai — Đợt 6c: GOM các bảng xử lý sự kiện toàn cục.
//
// Vì sao: `bindGlobalEvents()` từng là một hàm 319 dòng, trong đó một `switch (act)` có ~66
// nhánh. Nay `bindGlobalEvents` KHÔNG còn nhánh nào: nó gọi `gopBangSuKien(SU_KIEN_DEPS)` rồi
// tra bảng theo `data-act`. Ba luật của đợt này (đều có ca kiểm thử ghim):
//
//   1. MỘT điểm đăng ký duy nhất. Chỉ `bindGlobalEvents` trong `app.js` được gọi
//      `addEventListener`; không tệp nào trong `src/ui/suKien/` tự đăng ký sự kiện.
//   2. Bảng chia THEO TÍNH NĂNG (mỗi tệp một bảng con). Không hành động nào được trùng tên
//      giữa hai bảng — trùng tên nghĩa là một hàm xử lý bị ghi đè IM LẶNG lúc gộp.
//   3. Mọi `data-act` xuất hiện trong HTML của app đều phải có hàm xử lý.
//
// DAG: tệp này (và mọi tệp trong `src/ui/`) ĐƯỢC import lõi; lõi KHÔNG BAO GIỜ import `src/ui/*`.
// `deps` (D) chỉ chứa những hàm CÒN LẠI của `app.js`; mọi thứ khác (dom/store/thoiGian/trangThai)
// lấy thẳng từ lõi.

import { bangChung } from "./chung.js";
import { bangChat } from "./chat.js";
import { bangAnh } from "./anh.js";
import { bangCanh } from "./canh.js";
import { bangNguoiLon } from "./nguoiLon.js";
import { bangVangMat } from "./vangMat.js";
import { bangLorebook } from "./lorebook.js";

// Bảy bảng con, theo thứ tự gộp. Xuất ra để ca kiểm thử tĩnh soi được TỪNG bảng (trùng tên
// giữa hai bảng, thiếu tệp, tệp lạ không ai gọi).
export const BANG_CON = [bangChung, bangChat, bangAnh, bangCanh, bangNguoiLon, bangVangMat, bangLorebook];

// `dsBang` có giá trị mặc định là `BANG_CON` (app.js gọi `gopBangSuKien(SU_KIEN_DEPS)` như cũ).
// Tham số thứ hai chỉ để ca kiểm thử Node ghim được luật "trùng tên thì phải NÉM LỖI" bằng hai
// bảng giả — không phải để app truyền vào.
export function gopBangSuKien(D, dsBang = BANG_CON) {
  const ra = Object.create(null);
  for (const taoBang of dsBang) {
    const bang = taoBang(D);
    for (const act of Object.keys(bang)) {
      // Trùng tên = một hàm xử lý bị che mất. Phải ồn ào, không được im lặng.
      if (ra[act]) throw new Error("Trùng hành động trong bảng sự kiện: " + act);
      ra[act] = bang[act];
    }
  }
  return ra;
}
