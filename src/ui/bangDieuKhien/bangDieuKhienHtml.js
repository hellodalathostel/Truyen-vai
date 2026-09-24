// Màn "Bảng điều khiển" (dashboard) — CHUỖI HTML của từng khối (Đợt 6d).
//
// Tệp này chỉ ghép chuỗi: không đọc DOM, không ghi dữ liệu. Mọi câu chữ suy ra từ dữ liệu nằm ở
// `bangDieuKhienFlow.js`; những gì cần app cung cấp (vẽ avatar, thẻ tuyến hội thoại, khung ảnh,
// thanh quay lại, tên người chơi) đi qua bảng phụ thuộc `D`.
import { esc, fmt, icon } from "../../dom.js";
import { R, anhCua, convsOfChapter, daoDienOf, giaoKeoOf, looseConversations, storyStats } from "../../store.js";
import { loreCua } from "../../lore.js";
import * as TS from "../../trangThai.js";
import {
  coKhungQuanHe, gopKhungQuanHe, gopNhipNgonNgu, gopSoThich, gopVaiNhanVat, meoTongQuan, nhanCheDo,
  nhanVaiGiaoKeo, soChuongXong,
} from "./bangDieuKhienFlow.js";

export function htmlHero(story, D) {
  return (
    '<div class="hero">' +
      '<div class="hero-emoji">' + esc(story.emoji || "✦") + "</div>" +
      "<div>" +
        '<h1 class="hero-title">' + esc(story.ten) + "</h1>" +
        '<div class="hero-tags">' +
          (story.theLoaiTen ? '<span class="badge">' + esc(story.theLoaiTen) + "</span>" : "") +
          '<span class="badge">' + nhanCheDo(story) + "</span>" +
          '<span class="badge">' + esc(D.layNguoiChoi(story)) + "</span>" +
        "</div>" +
      "</div>" +
      '<div class="hero-actions">' +
        '<button class="btn" data-act="story-menu">' + icon("sliders", 15) + " Tuỳ chọn</button>" +
        '<button class="btn btn-primary" data-act="new-conv">' + icon("plus", 15) + " Hội thoại mới</button>" +
      "</div>" +
    "</div>" +
    (story.boiCanh ? '<div class="panel prose">' + fmt(story.boiCanh) + "</div>" : "")
  );
}

export function htmlNhanVat(story, D) {
  return (
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("users", 16) + " Nhân vật</h3>" +
      '<button class="btn btn-sm" data-act="new-char">' + icon("plus", 14) + " Thêm</button></div>" +
      (story.nhanVats.length
        ? '<div class="char-grid">' + story.nhanVats.map((c) =>
            '<button class="char-card" data-act="edit-char" data-id="' + esc(c.id) + '">' +
              D.avatarHtml(story, c, 44) +
              '<div class="char-info"><div class="char-name">' + esc(c.ten) + "</div>" +
              '<div class="char-role">' + esc(c.vaiTro || "nhân vật") + "</div></div>" +
            "</button>").join("") + "</div>"
        : '<div class="hint">Chưa có nhân vật nào. Hãy thêm nhân vật để bắt đầu trò chuyện — bạn có thể để AI gợi ý từ một ý tưởng ngắn.</div>') +
    "</div>"
  );
}

export function htmlHanhTrinh(story, loose, D) {
  if (story.mode !== "chuong") {
    return (
      '<div class="panel">' +
        '<div class="panel-head"><h3>' + icon("chat", 16) + " Các tuyến hội thoại</h3>" +
        '<button class="btn btn-sm" data-act="new-conv">' + icon("plus", 14) + " Hội thoại mới</button></div>" +
        (loose.length
          ? '<div class="thread-list">' + loose.map((c) => D.threadCard(story, c)).join("") + "</div>"
          : '<div class="hint">Chế độ này để bạn mở nhiều tuyến hội thoại song song trong cùng một thế giới — ví dụ trò chuyện riêng với từng nhân vật, rồi ghép họ lại thành một nhóm khi câu chuyện chín. Tất cả các tuyến dùng chung bối cảnh và biên niên sử.</div>') +
      "</div>"
    );
  }
  const sorted = story.chuongs.slice().sort((a, b) => a.so - b.so);
  return (
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("book", 16) + " Hành trình</h3>" +
      '<button class="btn btn-sm" data-act="new-chapter">' + icon("plus", 14) + " Chương mới</button></div>" +
      '<div class="timeline">' +
      sorted.map((ch) => {
        const convs = convsOfChapter(story, ch.id);
        return (
          '<div class="tl-item' + (ch.daKetThuc ? " done" : "") + '">' +
            '<div class="tl-dot">' + (ch.daKetThuc ? icon("check", 13) : ch.so) + "</div>" +
            '<div class="tl-body">' +
              '<div class="tl-head"><span class="tl-title">' + esc(ch.tieuDe) + "</span>" +
              '<span class="tl-badge">' + convs.length + " hội thoại</span></div>" +
              (ch.mucTieu ? '<div class="tl-goal">🎯 ' + esc(ch.mucTieu) + "</div>" : "") +
              (ch.tomTat ? '<div class="tl-sum">' + esc(ch.tomTat) + "</div>" : "") +
              '<div class="tl-convs">' +
                convs.map((c) =>
                  '<button class="mini-conv" data-act="open-conv" data-id="' + esc(c.id) + '">' +
                  D.avatarStack(story, c.nhanVatIds, 20) + "<span>" + esc(c.tieuDe) + "</span></button>"
                ).join("") +
                '<button class="mini-conv add" data-act="new-conv" data-chuong="' + esc(ch.id) + '">' + icon("plus", 13) + " hội thoại</button>" +
              "</div>" +
              '<div class="tl-actions">' +
                (ch.daKetThuc
                  ? ""
                  : '<button class="btn btn-sm btn-primary" data-act="end-chapter" data-id="' + esc(ch.id) + '">' + icon("flag", 14) + " Kết thúc chương</button>") +
                '<button class="btn btn-sm" data-act="edit-chapter" data-id="' + esc(ch.id) + '">' + icon("edit", 13) + " Sửa</button>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>" +
    "</div>"
  );
}

export function htmlRoiChuong(story, loose, D) {
  if (!(story.mode === "chuong" && loose.length)) return "";
  return (
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("chat", 16) + " Chưa xếp chương (" + loose.length + ")</h3>" +
      '<button class="btn btn-sm" data-act="new-conv">' + icon("plus", 14) + " Hội thoại mới</button></div>" +
      '<div class="thread-list">' + loose.map((c) => D.threadCard(story, c)).join("") + "</div>" +
      '<div class="hint">Các hội thoại này chưa gắn vào chương nào (mở “Sửa” trong hội thoại để chọn chương). Chúng vẫn dùng chung bối cảnh và biên niên sử với cả truyện.</div>' +
    "</div>"
  );
}

export function htmlTongQuan(story) {
  const tk = storyStats(story);
  return (
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("sliders", 16) + " Tổng quan</h3></div>" +
      '<div class="dashboard-stat-grid">' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + story.chuongs.length + '</span><span class="dashboard-stat-lb">chương</span></div>' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.convs + '</span><span class="dashboard-stat-lb">hội thoại</span></div>' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.chars + '</span><span class="dashboard-stat-lb">nhân vật</span></div>' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + (story.bienNienSu || []).length + '</span><span class="dashboard-stat-lb">sự kiện</span></div>' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + tk.msgs + '</span><span class="dashboard-stat-lb">tin nhắn</span></div>' +
        '<div class="dashboard-stat"><span class="dashboard-stat-num">' + soChuongXong(story) + '</span><span class="dashboard-stat-lb">chương xong</span></div>' +
      "</div>" +
      '<div class="stat-tip">' + meoTongQuan(story) + "</div>" +
    "</div>"
  );
}

export function htmlGiaoKeo(story) {
  const g = giaoKeoOf(story);
  if (!g.bat) return "";
  const ds = (R.MucDoBdsm && R.MucDoBdsm()) || [];
  const so = Number(g.mucDo) || 3;
  const m = ds.find((x) => Number(x.so) === so) || {};
  const coVai = story.nhanVats.filter((c) => c.vaiBdsm);
  const kq = ((R.KieuQuanHe && R.KieuQuanHe()) || []).find((x) => x.id === g.kieuQuanHe);
  const nhip = ((R.NhipDoBdsm && R.NhipDoBdsm()) || []).find((x) => x.id === g.nhipDo);
  const ngon = ((R.NgonNguBdsm && R.NgonNguBdsm()) || []).find((x) => x.id === g.ngonNgu);
  const thich = ((R.SoThichBdsm && R.SoThichBdsm()) || []).filter((x) => (g.soThich || []).indexOf(x.id) >= 0);
  return (
    '<div class="panel gk-panel">' +
      '<div class="panel-head"><h3>' + icon("lock", 16) + " Giao kèo (BDSM M/M)</h3>" +
      '<button class="btn btn-sm" data-act="open-giao-keo">' + icon("edit", 13) + " Chỉnh</button></div>" +
      '<div class="gk-line"><span class="gk-key">Vai của bạn</span><span>' + esc(nhanVaiGiaoKeo(g)) + "</span></div>" +
      '<div class="gk-line"><span class="gk-key">Từ khoá dừng</span><span class="gk-swear">' + esc(g.tuKhoaDung || "đỏ") + "</span></div>" +
      '<div class="gk-line"><span class="gk-key">Mức độ</span><span>' + so + "/5 · " + esc(m.ten || "") + "</span></div>" +
      (coKhungQuanHe(kq) ? '<div class="gk-line"><span class="gk-key">Khung quan hệ</span><span>' + esc(gopKhungQuanHe(kq)) + "</span></div>" : "") +
      (nhip || ngon ? '<div class="gk-line"><span class="gk-key">Nhịp &amp; ngôn ngữ</span><span>' + esc(gopNhipNgonNgu(nhip, ngon)) + "</span></div>" : "") +
      (thich.length ? '<div class="gk-line"><span class="gk-key">Muốn có trong cảnh</span><span>' + esc(gopSoThich(thich)) + "</span></div>" : "") +
      (g.luatCanh ? '<div class="gk-line"><span class="gk-key">Luật riêng</span><span>' + esc(g.luatCanh) + "</span></div>" : "") +
      (g.danhXung ? '<div class="gk-line"><span class="gk-key">Xưng hô</span><span>' + esc(g.danhXung) + "</span></div>" : "") +
      (g.gioiHanCung ? '<div class="gk-line"><span class="gk-key">Giới hạn cứng</span><span class="gk-hard">' + esc(g.gioiHanCung) + "</span></div>" : "") +
      (g.gioiHanMem ? '<div class="gk-line"><span class="gk-key">Giới hạn mềm</span><span>' + esc(g.gioiHanMem) + "</span></div>" : "") +
      (g.khongKhi ? '<div class="gk-line"><span class="gk-key">Bối cảnh</span><span>' + esc(g.khongKhi) + "</span></div>" : "") +
      (g.chamSocSau ? '<div class="gk-line"><span class="gk-key">Chăm sóc sau</span><span>' + esc(g.chamSocSau) + "</span></div>" : "") +
      (coVai.length
        ? '<div class="gk-line"><span class="gk-key">Vai của nhân vật</span><span>' + esc(gopVaiNhanVat(coVai)) + "</span></div>"
        : '<div class="hint">Chưa nhân vật nào được ghi vai Dom/Sub — mở nhân vật để ghi cho rõ.</div>') +
    "</div>"
  );
}

export function htmlLorebook(story) {
  const dsLore = loreCua(story).entries;
  return (
    '<div class="panel lb-panel">' +
      '<div class="panel-head"><h3>' + icon("book", 16) + " Sổ tri thức (" + dsLore.length + ")</h3>" +
      (dsLore.length
        ? '<button class="btn btn-sm" data-act="open-lorebook">Mở sổ</button>'
        : '<button class="btn btn-sm btn-primary" data-act="open-lorebook">' + icon("upload", 13) + " Nạp lorebook</button>") +
      "</div>" +
      (dsLore.length
        ? '<ul class="lb-mini">' + dsLore.slice(0, 5).map((e) =>
            '<li class="' + (e.bat ? "" : "off") + '">' + esc(e.ghiChu) +
            '<span class="lb-mini-keys">' + esc(e.keys.slice(0, 3).join(", ")) + "</span></li>").join("") +
          "</ul>" +
          (dsLore.length > 5 ? '<div class="hint">… và ' + (dsLore.length - 5) + " mục nữa.</div>" : "") +
          '<div class="hint">AI chỉ đọc những mục có từ khoá xuất hiện trong cảnh đang diễn ra.</div>'
        : '<div class="hint">Nạp một file lorebook (JSON, chuẩn World Info / SillyTavern) để AI có sẵn kiến thức nền: địa danh, tổ chức, nhân vật phụ, luật lệ… Chỉ những mục khớp từ khoá mới được gửi kèm, nên sổ dài cũng không tốn ngữ cảnh.</div>') +
    "</div>"
  );
}

export function htmlDaoDien(story) {
  const ddNow = daoDienOf(story);
  if (!ddNow.bat) return "";
  const dsH = ddNow.huong.filter((h) => h.trangThai !== "huy");
  const dangChay = dsH.filter((h) => h.trangThai === "hoatDong").length;
  const soDC = ddNow.dinhChinh.filter((x) => !x.xoa && x.bat !== false).length;
  const cuoi = dsH
    .map((h) => TS.tienDoCuoi(h, null))
    .filter(Boolean)
    .sort((a, b) => (b.luc || 0) - (a.luc || 0))[0];
  return (
    '<div class="panel dd-panel">' +
      '<div class="panel-head"><h3>' + icon("clapper", 16) + " Chế độ Đạo diễn</h3>" +
      '<button class="btn btn-sm" data-act="open-dao-dien">' + icon("sliders", 13) + " Mở</button></div>" +
      '<div class="dd-line"><span class="dd-key">Hướng đang hoạt động</span><span class="dd-val">' + dangChay + "/" + dsH.length + "</span></div>" +
      '<div class="dd-line"><span class="dd-key">Đính chính đang bật</span><span class="dd-val">' + soDC + "</span></div>" +
      (cuoi ? '<div class="dd-line"><span class="dd-key">Tiến độ gần nhất</span><span class="dd-val">' + esc(TS.nhanTienDo(cuoi.trangThai)) + "</span></div>" : "") +
      '<div class="hint">Chỉ mình bạn thấy màn này. Đính chính sửa nhận định AI rút ra sai mà không viết lại lịch sử; hướng phát triển chỉ là đích tương lai, và tiến độ chỉ được ghi khi bạn duyệt ở Khép cảnh.</div>' +
    "</div>"
  );
}

export function htmlThuVienAnh(story, D) {
  const dsAnh = anhCua(story);
  return (
    '<div class="panel anh-panel">' +
      '<div class="panel-head"><h3>' + icon("image", 16) + " Thư viện ảnh (" + dsAnh.length + ")</h3>" +
      (dsAnh.length ? '<button class="btn btn-sm" data-act="open-anh-lib">Mở tất cả</button>' : "") + "</div>" +
      (dsAnh.length
        ? '<div class="anh-grid">' + dsAnh.slice(0, 6).map((a) =>
            '<button class="anh-thumb" data-act="open-anh-lib" data-id="' + esc(a.id) + '" title="' + esc(a.chuThich || "Ảnh cảnh") + '">' +
            D.anhHolder(a, "thumb") + "</button>").join("") + "</div>" +
          '<div class="hint anh-note">Bấm vào một khung hình để mở thư viện. Muốn dựng thêm, mở một hội thoại và bấm nút ảnh ở thanh trên cùng.</div>'
        : '<div class="hint">Mở một hội thoại, rồi bấm nút ảnh ở thanh trên cùng — AI sẽ đọc cảnh đang diễn ra và dựng một khung hình cho đúng khoảnh khắc đó. Ảnh được lưu ngay trong máy bạn.</div>') +
    "</div>"
  );
}

export function htmlBienNien(story) {
  const bns = (story.bienNienSu || []).slice(-6).reverse();
  return (
    '<div class="panel">' +
      '<div class="panel-head"><h3>' + icon("scroll", 16) + " Biên niên sử</h3>" +
      '<button class="btn btn-sm" data-act="open-chronicle">Mở tất cả</button></div>' +
      (bns.length
        ? '<ul class="chronicle">' + bns.map((b) => "<li>" + esc(b.noiDung) + "</li>").join("") + "</ul>"
        : '<div class="hint">Những sự kiện quan trọng sẽ được ghi vào đây — chúng luôn được gửi kèm cho AI ở mọi hội thoại, giúp cả thế giới nhớ chung một câu chuyện.</div>') +
    "</div>"
  );
}

// Ghép mọi khối — thứ tự cột trái/phải phải giữ NGUYÊN như trước khi tách.
export function htmlDashboard(story, D) {
  const loose = looseConversations(story);
  return '<div class="dashboard">' + D.navQuayLai(story) + htmlHero(story, D) +
    '<div class="dash-grid">' +
      '<div class="dash-col">' + htmlHanhTrinh(story, loose, D) + htmlRoiChuong(story, loose, D) + htmlTongQuan(story) + "</div>" +
      '<div class="dash-col">' + htmlNhanVat(story, D) + htmlDaoDien(story) + htmlLorebook(story) + htmlGiaoKeo(story) + htmlThuVienAnh(story, D) + htmlBienNien(story) + "</div>" +
    "</div></div>";
}
