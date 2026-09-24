// Truyện Vai — Đợt 6b: nửa "Thiết lập nâng cao" (wizard 4 bước) của màn Cốt truyện mới.
//
// Gồm: đổi thể loại ⇒ gợi ý lớp giao kèo, nhờ AI viết bối cảnh, nhân vật đầu tiên bằng AI,
// và tạo truyện từ các ô đã điền.
//
// CỬA 18+ Ở ĐÂY chỉ có MỘT lối: nút "Tạo cốt truyện" khi khối giao kèo đang bật. Khác với
// Tạo nhanh, danh sách nhân vật đã biết ngay tại chỗ (tối đa một nhân vật vừa sinh bằng AI),
// nên chỉ hỏi một lần — nhưng vẫn phải liệt kê đúng danh sách sẽ được ghi cờ. Quyết định +
// câu chữ nằm ở `../cong18.js`; ở đây chỉ đọc/ghi DOM và gọi.

import * as AI from "../../ai.js";
import { toast } from "../../dom.js";
import { createStory, giaoKeoMacDinh, newCharacter, xacNhanMoiNguoiLon } from "../../store.js";
import { datTenTuBoiCanh, stubTruyen, payloadWizard } from "./taoTruyenFlow.js";
import { coBdsm, LY_DO_BAT_GIAO_KEO, LOI_TU_CHOI_DANH_SACH } from "../cong18.js";

export function lapWizard(S) {
  const D = S.D;

  S.wizStub = () => stubTruyen({
    ten: S.val("ten"),
    boiCanh: S.val("boiCanh"),
    tl: S.theLoaiWizard(),
    giaoKeo: D.docGiaoKeo(S.body, "wiz", giaoKeoMacDinh()),
  });

  S.wizBdsm = () =>
    coBdsm({ theLoai: S.theLoaiWizard(), tich: !!((S.body.querySelector('[data-f="wizbat"]') || {}).checked) });

  // Thể loại BDSM được chọn ⇒ mở sẵn khối giao kèo và điền gợi ý của thể loại, nhưng KHÔNG
  // tự bật giao kèo thay người dùng: chỉ tích ô và mở khối, cửa 18+ vẫn hỏi lúc tạo truyện.
  // `change` chứ không `input`: đổi thể loại bằng bàn phím cũng phải kích hoạt.
  const chonTheLoai = S.body.querySelector('[data-f="theLoai"]');
  if (chonTheLoai) {
    chonTheLoai.addEventListener("change", () => {
      const tl = S.theLoais.find((t) => t.id === chonTheLoai.value);
      if (!tl || !tl.bdsm) return;
      const bat = S.body.querySelector('[data-f="wizbat"]');
      if (bat && !bat.checked) {
        bat.checked = true;
        const fields = S.body.querySelector("[data-gk-fields]");
        if (fields) fields.hidden = false;
      }
      const kk = S.body.querySelector('[data-f="wizkhongKhi"]');
      if (kk && !kk.value.trim() && tl.khongKhi) kk.value = tl.khongKhi;
      const kq = S.body.querySelector('[data-f="wizkieuQuanHe"]');
      if (kq && !kq.value && tl.kieuQuanHe) {
        kq.value = tl.kieuQuanHe;
        D.paintGiaoKeo(S.body, "wiz");
      }
    });
  }

  // "Nhờ AI viết bối cảnh" — chỉ điền vào ô, người dùng vẫn sửa được trước khi tạo.
  S.goiYBoiCanh = async (status) => {
    status.textContent = "Đang nhờ AI viết bối cảnh…";
    try {
      const seed = await AI.generateStorySeed({
        theLoai: S.theLoaiWizard(),
        yTuong: S.val("moTa"),
        giaoKeo: D.docGiaoKeo(S.body, "wiz", giaoKeoMacDinh()),
      });
      S.setVal("boiCanh", seed.boiCanh + (seed.luat ? "\n\nLuật thế giới:\n" + seed.luat : ""));
      if (!S.val("ten")) {
        const ten = datTenTuBoiCanh(seed.boiCanh);
        if (ten) S.setVal("ten", ten);
      }
      status.textContent = "Đã viết xong bối cảnh. Bạn có thể sửa lại tuỳ ý.";
    } catch (err) {
      status.textContent = "Lỗi: " + (err.message || err);
    }
  };

  S.wizNhanVatDauTien = async (status) => {
    await D.sinhHuongNhanVat({ story: S.wizStub(), yTuong: S.val("moTa"), bdsm: S.wizBdsm(), scope: S.body, status });
  };

  S.chonHuongWizard = async (i, status) => {
    await D.chonHuongNhanVat({
      scope: S.body,
      i,
      story: S.wizStub(),
      bdsm: S.wizBdsm(),
      yTuongGoc: S.val("moTa"),
      status,
      onXong: async (c) => {
        S.body.dataset.pendingCharacter = JSON.stringify(c);
        return "Nhân vật đầu tiên: " + c.ten + " — " + (c.vaiTro || "nhân vật") + ". Sẽ được thêm khi bạn tạo truyện.";
      },
    });
  };

  S.taoTruyenWizard = async (m) => {
    const ten = S.val("ten");
    if (!ten) {
      toast("Hãy đặt tên cho cốt truyện.", "error");
      return;
    }
    const tl = S.theLoaiWizard();
    const nhanVats = [];
    if (S.body.dataset.pendingCharacter) {
      try {
        const c = JSON.parse(S.body.dataset.pendingCharacter);
        nhanVats.push(newCharacter(Object.assign({}, c, { mau: D.mauChoices[Math.floor(Math.random() * D.mauChoices.length)] })));
      } catch (e) {}
    }
    const giaoKeo = D.docGiaoKeo(S.body, "wiz", giaoKeoMacDinh());
    if (giaoKeo.bat) {
      // Cửa 18+ cấp truyện PHẢI liệt kê TÊN từng nhân vật sẽ được ghi cờ — không xác nhận
      // đúng danh sách thì lớp giao kèo không được ghi vào truyện.
      const xac = await D.xacNhan18PlusTruyen(LY_DO_BAT_GIAO_KEO, nhanVats);
      if (!xac.dongY) {
        giaoKeo.bat = false;
        toast(LOI_TU_CHOI_DANH_SACH, "error");
      } else xacNhanMoiNguoiLon({ nhanVats });
    }
    const story = await createStory(payloadWizard({
      ten,
      moTa: S.val("moTa"),
      theLoaiId: S.val("theLoai"),
      tl,
      boiCanh: S.val("boiCanh"),
      mode: S.mode,
      nguoiChoiTen: S.val("nguoiChoiTen"),
      nguoiChoiMoTa: S.val("nguoiChoiMoTa"),
      nhanVats,
      giaoKeo,
    }));
    m.close();
    toast("Đã tạo cốt truyện “" + ten + "”.");
    await D.openStory(story.id, null);
  };
}
