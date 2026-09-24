// Truyện Vai — BA TRUYỆN MẪU HƯ CẤU + ĐƯỜNG DỰNG PROMPT THẬT (AI GIẢ) — Giai đoạn 7a.
//
// Vì sao có tệp này: chi phí mỗi lượt nhập vai phụ thuộc mạnh vào việc PHẦN ĐẦU prompt có
// ổn định hay không (máy chủ cache tiền tố dùng chung). Muốn biết prompt có "thân thiện
// cache" không thì phải ĐO trên chuỗi thật, và muốn thấy hồi quy thì phải có mốc. Tệp này
// dựng 3 truyện mẫu (nhóm thường · cảnh riêng · chế độ Đạo diễn), chạy 5 lượt liên tiếp cho
// mỗi truyện qua ĐÚNG đường dựng prompt của app, rồi trả về prompt từng lượt + phép đo tiền
// tố chung của từng cặp lượt liền nhau.
//
// Vì sao lấy prompt bằng AI GIẢ cắm vào `aiTextPlugin` chứ không gọi thẳng `buildPrompt`:
// đường thật đi qua `replyAs`/`replyAsGroup` — chúng ghép TASK, cập nhật danh sách người có
// mặt, chọn nhân vật lên tiếng… Gọi thẳng `buildPrompt` là tự chế lại đường đó, nên snapshot
// sẽ đúng với bản chế tay chứ không đúng với thứ app thật sự gửi đi.
//
// LUẬT CỦA TỆP NÀY
//   • KHÔNG dùng dấu gạch chéo ngược (xem tests/README.md).
//   • Mọi tên/id là HƯ CẤU: id test có tiền tố riêng, tên truyện/hội thoại bắt đầu bằng "ZZ"
//     (luật 4) — không bao giờ lấy từ dữ liệu thật của chủ dự án.
//   • KHÔNG `Date.now`/`Math.random`: mọi mốc thời gian là hằng số, nên chạy lại phải ra y
//     hệt TỪNG BYTE (đó chính là điều kiện để so fixture được).
//   • AI giả chỉ trả văn bản thuần, KHÔNG kèm khối điều khiển (<<HIENDIEN>>/<<KHEP>>/<<HET>>):
//     đường có marker đã có ca riêng ở tầng khác; ở đây cần ít biến số và tất định.

import { replyAs, replyAsGroup } from "../../src/ai.js";
import { newLoreEntry } from "../../src/lore.js";
import { taoHoiThoai, taoNhanVat, taoTinNhan, taoTruyen } from "../fixtures/truyen.mjs";

export const SO_LUOT = 5;
export const MAU_KEY = ["nhom", "rieng", "daodien"];

// Một mốc thời gian duy nhất cho mọi dữ liệu mẫu. Không lấy giờ hệ thống: snapshot phải
// giống nhau ở mọi máy, mọi lần chạy.
const LUC = 1700000000000;

function nv(id, ten, them) {
  return taoNhanVat(id, ten, them);
}

function tin(id, vai, ten, noiDung, rieng) {
  const them = { luc: LUC };
  if (rieng) them.rieng = rieng;
  return taoTinNhan(id, vai, ten, noiDung, them);
}

// `conv` trong app là một khung nhìn gọn của hội thoại (xem `currentConv`). Dựng đúng những
// trường mà đường dựng prompt đọc tới.
function convCua(ht) {
  return {
    id: ht.id,
    tieuDe: ht.tieuDe,
    nhanVatIds: ht.nhanVatIds.slice(),
    hienDien: ht.hienDien.slice(),
    chuongId: ht.chuongId,
    canhRieng: ht.canhRieng,
    daCoCanhRieng: ht.daCoCanhRieng === true,
    goiY: ht.goiY || "",
    tomTat: ht.tomTat || "",
    tomTatDen: 0,
    goiKhep: false,
  };
}

// ------------------------------------------------------------------ mẫu 1: nhóm thường
function dungNhom() {
  const story = taoTruyen({
    id: "ct_zz7a1",
    ten: "ZZ Đêm ở bến",
    theLoaiTen: "đời thường",
    moTa: "Ba người quen cũ gặp lại nhau ở một bến tàu nhỏ.",
    boiCanh: "Bến tàu ven sông, cuối thu, mưa lất phất từ chiều.",
    luatTheGioi: "Không có yếu tố siêu nhiên. Ai cũng biết bơi.",
    nguoiChoi: { ten: "Bạn", moTa: "Người vừa trở về sau nhiều năm đi xa.", ngoaiHinhId: "" },
    nhanVats: [
      nv("nv_z1", "An", {
        vaiTro: "người trông bến",
        moTa: "Người trông bến tàu đã hai mươi năm.",
        tinhCach: "điềm tĩnh, kín đáo, ngại nói về mình",
        cachNoi: "nói ngắn, hay dừng giữa câu",
      }),
      nv("nv_z2", "Linh", {
        vaiTro: "bạn cũ",
        moTa: "Bạn cũ của người chơi, giờ làm ở xưởng ven sông.",
        tinhCach: "thẳng thắn, nóng, không giữ trong lòng",
        cachNoi: "nói nhanh, hay vặn lại",
      }),
      nv("nv_z3", "Khang", {
        vaiTro: "thợ máy",
        moTa: "Thợ sửa máy ở bến, em họ của Linh.",
        tinhCach: "tò mò, thích nghe chuyện",
        cachNoi: "nói nhiều, hay hỏi dồn",
      }),
    ],
    chuongs: [
      { id: "ch_zz7a1", so: 1, tieuDe: "Chương đầu", mucTieu: "Bạn nhận ra bến đã khác xưa.", tomTat: "", daKetThuc: false, taoLuc: LUC },
    ],
    bienNienSu: [{ id: "bn_zz7a1", noiDung: "Bến tàu đóng cửa hai năm rồi mở lại.", nguon: "", luc: LUC }],
    lorebook: {
      ten: "Sổ bến",
      phienBan: 1,
      entries: [
        newLoreEntry({
          id: "lb_zz7a1",
          keys: ["bến"],
          noiDung: "Bến tàu do ông của An đóng, giờ chỉ còn một cầu tàu dùng được.",
          hangSo: true,
          thuTu: 10,
        }),
      ],
    },
    nhip: "cham",
  });
  const ht = taoHoiThoai("ht_z7a1", "ZZ Bến tàu", ["nv_z1", "nv_z2", "nv_z3"], {
    hienDien: ["nv_z1", "nv_z2"],
    chuongId: "ch_zz7a1",
    goiY: "Mưa bắt đầu nặng hạt, đèn bến vừa bật.",
    taoLuc: LUC,
    suaLuc: LUC,
  });
  story.hoiThoais = [ht];
  return {
    key: "nhom",
    ten: "nhóm thường",
    mode: "nhom",
    story,
    conv: convCua(ht),
    messages: [],
    luot: [
      {
        moDau: true,
        nguoi: null,
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "Mưa quất xuống mái tôn của bến tàu thành một nhịp đều đều, không vội. An đứng sau quầy, lau chiếc cốc đã sạch từ lâu, mắt không nhìn lên. Linh tựa lưng vào cột gỗ, hất cằm về phía bạn như thể vừa nhận ra một điều gì cũ. Bến này giờ chỉ còn hai người trông, Linh nói, giọng không rõ là đang kể hay đang trách. Ngoài kia nước đã lên tới bậc thềm thứ hai.",
      },
      {
        nguoi: "Tôi đứng ở cửa, gấp ô lại rồi để xuống cạnh thùng gỗ.",
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "An đặt chiếc cốc xuống, lần đầu tiên nhìn thẳng về phía cửa. Vẫn cái dáng ngồi ấy, nhưng vai đã xuôi hơn trước. Mưa to thế mà vẫn ra đây được à, Linh nói trước, tay vẫn nghịch sợi dây thừng quấn ở cột. Trong quầy, An đẩy một chiếc ghế nhỏ về phía bạn bằng mũi chân, không nói gì thêm.",
      },
      {
        nguoi: "Tôi kéo chiếc ghế ra và ngồi xuống, hỏi thăm chuyện bến tàu.",
        nhanVats: ["nv_z1"],
        traLoi:
          "An rót nước ra chiếc cốc vừa lau, đặt xuống mép quầy chứ không đưa hẳn cho ai. Hai năm trước nước lên một trận, cầu tàu ngoài kia gãy mất một đoạn, An nói. Sửa lại thì tốn, mà bến này cũng chẳng còn ai gửi hàng. An nhìn ra phía cửa một lúc lâu rồi mới nhớ ra là mình đang nói chuyện với ai.",
      },
      {
        nguoi: "Tôi hỏi Linh có còn làm ở xưởng không.",
        nhanVats: ["nv_z2"],
        traLoi:
          "Linh bật cười, một tiếng ngắn như bị cắt. Xưởng dẹp từ mùa hè, giờ Linh chạy hàng cho mấy nhà trong xóm. Linh nói nhanh, không nhìn bạn, và mỗi câu lại kéo sợi dây thừng chặt thêm một nhịp. Có điều gì đó trong cách nói ấy khiến người ta biết câu chuyện còn dài hơn thế.",
      },
      {
        nguoi: "Tôi nhắc lại chuyện cũ, hỏi cả hai người còn nhớ không.",
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "Cả hai cùng im một nhịp, và tiếng mưa bỗng nghe rõ hơn hẳn. Nhớ chứ, Linh nói, giọng hạ xuống, nhưng cái nhớ ấy đã khác rồi. An đứng dậy, đi tới cửa sổ, tay đặt lên khung gỗ đã mục một góc. Nếu bạn muốn kể thì kể, An nói, còn tôi thì không chắc mình còn giữ được đúng như bạn nhớ đâu.",
      },
    ],
  };
}

// ------------------------------------------------------------------ mẫu 2: cảnh riêng
function dungRieng() {
  const story = taoTruyen({
    id: "ct_zz7a2",
    ten: "ZZ Căn gác cuối phố",
    theLoaiTen: "đời thường",
    moTa: "Người chơi ở nhờ căn gác của một người bạn cũ.",
    boiCanh: "Căn gác nhỏ cuối phố, đồ đạc còn nguyên từ nhiều năm trước.",
    luatTheGioi: "Không có yếu tố siêu nhiên.",
    nguoiChoi: { ten: "Bạn", moTa: "Người vừa chuyển về ở nhờ.", ngoaiHinhId: "" },
    nhanVats: [
      nv("nv_z1", "An", {
        vaiTro: "chủ nhà cũ",
        moTa: "Người giữ chìa khoá căn gác.",
        tinhCach: "rụt rè, hay quanh co",
        cachNoi: "nói vòng rồi mới vào ý",
      }),
      nv("nv_z2", "Linh", {
        vaiTro: "bạn cũ",
        moTa: "Bạn cũ của người chơi, đang giữ một chuyện chưa kể.",
        tinhCach: "thẳng nhưng giấu chuyện",
        cachNoi: "nói chậm khi chạm chuyện riêng",
      }),
      nv("nv_z3", "Khang", {
        vaiTro: "hàng xóm",
        moTa: "Hàng xóm ở tầng dưới.",
        tinhCach: "hay để ý",
        cachNoi: "nói to",
      }),
    ],
    chuongs: [
      { id: "ch_zz7a2", so: 1, tieuDe: "Chương đầu", mucTieu: "Bạn tìm hiểu vì sao căn gác còn nguyên đồ.", tomTat: "", daKetThuc: false, taoLuc: LUC },
    ],
    bienNienSu: [{ id: "bn_zz7a2", noiDung: "Người thuê trước dọn đi giữa đêm, không lấy gì.", nguon: "", luc: LUC }],
    lorebook: { ten: "", phienBan: 1, entries: [] },
    nhip: "cham",
  });
  const ht = taoHoiThoai("ht_z7a2", "ZZ Gác xép", ["nv_z1", "nv_z2", "nv_z3"], {
    hienDien: ["nv_z1", "nv_z2"],
    chuongId: "ch_zz7a2",
    goiY: "Đèn hành lang nhấp nháy.",
    daCoCanhRieng: true,
    canhRieng: { nvId: "nv_z2", moLuc: LUC },
    taoLuc: LUC,
    suaLuc: LUC,
  });
  story.hoiThoais = [ht];
  const conv = convCua(ht);
  return {
    key: "rieng",
    ten: "cảnh riêng",
    mode: "rieng",
    story,
    conv,
    rieng: "nv_z2",
    messages: [
      tin("tn_zz7a2_h1", "nguoi", "Bạn", "Tôi lên gác trước, để hành lý ở góc phòng."),
      tin(
        "tn_zz7a2_h2",
        "ai",
        "An",
        "An lên theo, đứng ở ngưỡng cửa khá lâu mới bước vào. Đồ đạc trong phòng phủ một lớp bụi mỏng đều như có người lau qua mỗi tháng: một chồng sách, chiếc đèn bàn còn cắm điện, tấm ảnh úp mặt trên tủ."
      ),
    ],
    luot: [
      {
        nguoi: "Linh, tôi muốn nói riêng một chút.",
        nhanVat: "nv_z2",
        traLoi:
          "Linh khép cánh cửa gác lại, nhẹ tới mức gần như không nghe thấy tiếng. Khi quay vào, mặt Linh đã khác lúc ở dưới nhà: mắt nhìn xuống sàn, hai tay đút vào túi áo khoác. Nói trước đi, Linh nói, giọng chậm hơn hẳn mọi khi, nhưng câu nào cũng đặt xuống rất rõ.",
      },
      {
        nguoi: "Tôi hỏi chuyện tấm ảnh úp trên tủ.",
        nhanVat: "nv_z2",
        traLoi:
          "Linh nhìn theo tay bạn, rồi đi tới tủ, chặn ngay giữa tầm mắt. Không phải chuyện của tôi, Linh nói, nhưng nói xong lại không rời tay khỏi mép tủ. Có những thứ để nguyên như vậy thì dễ sống hơn, cậu hiểu không. Bên ngoài hành lang, tiếng bước chân ai đó đi ngang rồi dừng lại một nhịp.",
      },
      {
        nguoi: "Tôi nói tôi không ép, chỉ muốn biết Linh có ổn không.",
        nhanVat: "nv_z2",
        traLoi:
          "Linh ngồi xuống mép giường, hai tay vẫn trong túi áo. Ổn thì ổn, Linh nói, nhưng cái chữ ấy nói ra nghe như một câu hỏi. Linh kể về buổi chiều mưa ai đó dọn đi mà không mang theo gì, kể tới đó thì dừng, rồi tự cười mình. Một lát sau Linh mới đứng dậy và nói rằng để mai tính.",
      },
      {
        nguoi: "Tôi hỏi người dọn đi là ai.",
        nhanVat: "nv_z2",
        traLoi:
          "Linh im khá lâu, đủ để tiếng đèn hành lang kêu hai lần. Một người mà tôi không muốn nhắc tên, Linh nói, và câu ấy không có vẻ gì là doạ. Linh nhìn thẳng vào bạn lần đầu trong cả buổi, rồi lại quay đi, tay mở hé cánh cửa sổ cho khí lạnh tràn vào.",
      },
      {
        nguoi: "Tôi nói nếu Linh muốn kể lúc nào cũng được.",
        nhanVat: "nv_z2",
        traLoi:
          "Linh gật đầu, chậm. Lúc bước ra tới cửa, Linh dừng lại một nhịp như định nói thêm, rồi chỉ dặn bạn khoá cửa sổ trước khi ngủ. Xuống tới cầu thang, Linh còn đứng lại ở chiếu nghỉ rất lâu trước khi đi tiếp. Trong phòng, tấm ảnh trên tủ vẫn nằm nguyên như cũ.",
      },
    ],
  };
}

// ------------------------------------------------------------------ mẫu 3: Đạo diễn
function dungDaoDien() {
  const story = taoTruyen({
    id: "ct_zz7a3",
    ten: "ZZ Người giữ đèn",
    theLoaiTen: "đời thường",
    moTa: "Hai người trông coi một trạm đèn bỏ hoang trước khi bị chuyển đi.",
    boiCanh: "Trạm đèn nằm trên doi đất, phải đi thuyền mới ra được.",
    luatTheGioi: "Không có yếu tố siêu nhiên. Sóng điện đài chỉ tới được trong đêm.",
    nguoiChoi: { ten: "Bạn", moTa: "Người mới được điều ra trạm.", ngoaiHinhId: "" },
    nhanVats: [
      nv("nv_z1", "An", {
        vaiTro: "người giữ đèn",
        moTa: "Người đã ở trạm gần mười năm.",
        tinhCach: "kín, che giấu chuyện riêng",
        cachNoi: "nói ít, hay trả lời lệch câu hỏi",
      }),
      nv("nv_z2", "Linh", {
        vaiTro: "kỹ thuật viên",
        moTa: "Người lo máy móc ở trạm.",
        tinhCach: "thực tế, nói thẳng",
        cachNoi: "nói như đọc bảng kê",
      }),
      nv("nv_z3", "Khang", {
        vaiTro: "người chở thuyền",
        moTa: "Người chở hàng ra trạm mỗi tuần.",
        tinhCach: "hiếu kỳ",
        cachNoi: "hay kể chuyện người khác",
      }),
    ],
    chuongs: [
      { id: "ch_zz7a3", so: 1, tieuDe: "Chương đầu", mucTieu: "Bạn dò ra vì sao trạm chỉ đèn trong đêm.", tomTat: "", daKetThuc: false, taoLuc: LUC },
    ],
    bienNienSu: [{ id: "bn_zz7a3", noiDung: "Trạm đèn được chuyển sang chế độ chạy tay đêm.", nguon: "", luc: LUC }],
    lorebook: {
      ten: "Sổ trạm",
      phienBan: 1,
      entries: [
        newLoreEntry({
          id: "lb_zz7a3",
          keys: ["đèn"],
          noiDung: "Đèn đánh dấu doi đất, chỉ bật khi có thuyền qua trong đêm.",
          hangSo: true,
          thuTu: 10,
        }),
      ],
    },
    nhip: "cham",
    daoDien: {
      bat: true,
      dinhChinh: [
        {
          id: "dc_zz7a1",
          loai: "nhanvat",
          nvId: "nv_z1",
          truong: "cheGiau",
          cu: "",
          moi: "An biết ai đã cắt đường điện của trạm, nhưng chưa muốn nói ra.",
          lyDo: "Phải giữ đèn chạy bằng tay cho tới khi có người tới thay.",
          nguonCanh: [],
          luc: LUC,
          bat: true,
          xoa: false,
          xoaLuc: 0,
        },
      ],
      huong: [
        {
          id: "hd_zz7a1",
          ten: "An mở lòng",
          phamVi: "quanhe",
          tu: "nv_z1",
          den: "nguoi",
          mongMuon: "An kể cho người chơi chuyện về lần trạm mất điện mười năm trước.",
          nhip: "vua",
          soCanh: 4,
          rangBuoc: "Không đổi tính cách gốc của An; không hé lộ trước khi có bằng chứng.",
          keHoach: {
            trangThaiDau: "An coi người chơi như người mới, chỉ nói những gì cần cho công việc.",
            mucTieu: "An chủ động kể lại đêm trạm mất điện mà không cần bị hỏi.",
            buoc: [
              "Một buổi trực đêm chung ở phòng máy",
              "Một lần An nhờ người chơi giữ bí mật chuyện nhỏ",
              "An nói lệch đi khi bị hỏi về mười năm trước",
              "An kể đoạn đầu của chuyện cũ",
            ],
            dauHieu: "An bắt đầu hỏi ngược lại về quá khứ của người chơi.",
            xungDot: "An sợ bị nhìn như người đã gây ra sự cố.",
            dieuKienDung: "Nếu người chơi kể chuyện đó cho người khác ở trạm.",
          },
          trangThai: "hoatDong",
          tienDo: [],
          luc: LUC,
          suaLuc: LUC,
        },
      ],
    },
  });
  const ht = taoHoiThoai("ht_z7a3", "ZZ Phòng máy", ["nv_z1", "nv_z2", "nv_z3"], {
    hienDien: ["nv_z1", "nv_z2"],
    chuongId: "ch_zz7a3",
    goiY: "Ca trực đêm đầu tiên.",
    taoLuc: LUC,
    suaLuc: LUC,
  });
  story.hoiThoais = [ht];
  return {
    key: "daodien",
    ten: "chế độ Đạo diễn",
    mode: "nhom",
    story,
    conv: convCua(ht),
    messages: [],
    // Lượt 4 có một sự kiện THẬT của chế độ Đạo diễn: người chơi duyệt Khép cảnh, nên một
    // cảnh được ghi vào `canhDaKhep` (đổi khối NỘI TÂM & QUAN HỆ) và một mục tiến độ được ghi
    // vào hướng đang hoạt động (đổi khối ĐẠO DIỄN). Cả hai khối nằm TRONG `buildContext`, tức
    // là SỚM trong prompt — đúng chỗ phép đo tiền tố chung cần phát hiện.
    luot: [
      {
        moDau: true,
        nguoi: null,
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "Đèn bàn trong phòng máy chỉ đủ soi nửa mặt bảng điện. An ngồi ở ghế quay, tay đặt lên công tắc chính như đã đặt ở đó rất nhiều lần. Linh mở sổ trực, đọc ba dòng rồi ghi thêm một dòng nữa, không nhìn ai. Đêm nay sóng tốt, Linh nói, nhưng tôi không tin mấy cái đồng hồ này lắm. An không đáp, chỉ đẩy cốc nước về phía bạn.",
      },
      {
        nguoi: "Tôi hỏi vì sao đèn phải bật bằng tay.",
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "Linh trả lời trước, tay vẫn ghi sổ: rơ-le tự động hỏng từ lâu, thay thì phải xin vật tư. An ngồi yên, ngón tay gõ nhẹ lên mặt công tắc hai nhịp rồi dừng. Ngoài cửa sổ, ngọn đèn trên cột quét một vòng qua doi đất rồi tối lại. An nói thêm một câu rất ngắn: ở đây thì mọi thứ đều phải tự làm.",
      },
      {
        nguoi: "Tôi ra cột đèn kiểm tra cùng Linh.",
        nhanVats: ["nv_z1", "nv_z2"],
        traLoi:
          "Gió ngoài doi đất mạnh hơn trong phòng máy nhiều. Linh soi đèn pin lên hộp đấu dây, chỉ cho bạn chỗ dây bọc đã cứng lại vì muối biển. An đứng cách đó vài bước, hai tay trong túi áo, không lại gần. Mười năm ở đây mà không thay sợi dây nào à, Linh hỏi vọng lại, và An chỉ nói rằng thay rồi, nhưng không phải sợi này.",
      },
      {
        // Trước lượt này: người chơi duyệt Khép cảnh cho đoạn vừa rồi.
        truoc() {
          story.canhDaKhep = story.canhDaKhep.concat([
            {
              id: "canh_zz7a1",
              htId: "ht_z7a3",
              htIds: ["ht_z7a3"],
              tuMsgId: "",
              denMsgId: "",
              tuLuc: LUC,
              denLuc: LUC + 60000,
              tomTat: "Ca trực đầu tiên ngoài cột đèn; An tránh lại gần hộp đấu dây.",
              moc: "An nhận ra sợi dây đã được thay nhưng không phải bởi Linh.",
              kyUc: [
                {
                  id: "ku_zz7a1",
                  noiDung: "Linh nói rõ rơ-le tự động hỏng từ lâu và chưa xin được vật tư thay.",
                  biet: ["nv_z1", "nv_z2", "nguoi"],
                  rieng: "",
                },
                {
                  id: "ku_zz7a2",
                  noiDung: "An nói đã thay dây nhưng không phải sợi ở hộp đấu dây ngoài cột.",
                  biet: ["nv_z1", "nguoi"],
                  rieng: "",
                },
              ],
              quanHe: [
                { id: "qh_zz7a1", tu: "nv_z1", den: "nv_z2", chieu: "tinTuong", huong: -1, buoc: 1, moi: "", lyDo: "Linh hỏi thẳng về sợi dây trước mặt người mới." },
                { id: "qh_zz7a2", tu: "nv_z1", den: "nguoi", chieu: "tinTuong", huong: 1, buoc: 1, moi: "", lyDo: "Người chơi ra cột đèn giữa đêm mà không kêu ca." },
              ],
              nhanVat: [
                { id: "nvz_zz7a1", nvId: "nv_z1", truong: "mucTieu", cu: "", moi: "Giữ đèn chạy tới khi có người tới thay.", lyDo: "Sự cố mười năm trước vẫn chưa được nói ra." },
              ],
              luc: LUC + 120000,
              huy: false,
              huyLuc: 0,
            },
          ]);
          story.daoDien.huong[0].tienDo = story.daoDien.huong[0].tienDo.concat([
            {
              id: "td_zz7a1",
              htId: "ht_z7a3",
              canhId: "canh_zz7a1",
              luc: LUC + 120000,
              trangThai: "dangTienTrien",
              bangChung: "An tránh lại gần hộp đấu dây và nói lệch khi bị hỏi.",
              buocTiep: "Một lần An nhờ người chơi giữ bí mật chuyện nhỏ.",
            },
          ]);
          story.daoDien.huong[0].suaLuc = LUC + 120000;
        },
        nguoi: "Tôi hỏi An sợi dây đó ai thay.",
        nhanVats: ["nv_z1"],
        traLoi:
          "An im khá lâu, rồi nói rằng bạn đã hỏi đúng chỗ khó nhất của trạm này. Ăn nói vậy xong, An rời khỏi cửa, đi về phía cầu tàu, tay vẫn trong túi áo. Linh nhìn theo rồi nhìn bạn, khẽ lắc đầu như để bảo đừng đẩy thêm. Đèn trên cột lại quét một vòng, và lần này nó dừng lâu hơn ở phía ngoài doi đất.",
      },
      {
        nguoi: "Tôi theo An ra cầu tàu.",
        nhanVats: ["nv_z1"],
        traLoi:
          "An đứng ở đầu cầu, nhìn ra vùng nước tối, chờ cho tới khi bạn tới bên cạnh mới nói. Đêm mười năm trước cũng mưa như thế này, An nói, và ở trạm thì chỉ có một người trực. An dừng ở đó, không kể tiếp, nhưng cũng không bỏ đi. Phía sau, tiếng Linh đóng cửa phòng máy nghe vọng qua doi đất.",
      },
    ],
  };
}

export function dungTatCa() {
  return [dungNhom(), dungRieng(), dungDaoDien()];
}

// ------------------------------------------------------------- chạy mẫu bằng AI giả
// `traLoi` = mảng văn bản AI giả trả về, dùng lần lượt cho từng lời gọi. Một lượt = MỘT lời
// gọi (nhóm cũng vậy: `replyAsGroup` sinh cả đoạn cảnh trong một lần).
async function chayMotMau(mau) {
  const goc = typeof window !== "undefined" ? window.TRUYEN_VAI_ROOT : null;
  if (!goc) throw new Error("thiếu window.TRUYEN_VAI_ROOT (phải import tests/lib/moi-truong.js trước)");
  const cu = goc.aiTextPlugin;
  const daGoi = [];
  const cauHinh = [];
  goc.aiTextPlugin = (yc, cauHinhDem) => {
    daGoi.push(String((yc && yc.instruction) || ""));
    cauHinh.push(cauHinhDem || null);
    const i = Math.min(daGoi.length - 1, mau.luot.length - 1);
    const p = Promise.resolve({ text: mau.luot[i].traLoi, stopReason: "stop" });
    p.stop = () => {};
    return p;
  };
  const prompts = [];
  try {
    for (let i = 0; i < mau.luot.length; i++) {
      const luot = mau.luot[i];
      if (typeof luot.truoc === "function") luot.truoc();
      if (luot.nguoi !== null && luot.nguoi !== undefined) {
        mau.messages.push(
          tin("tn_zz7a_" + mau.key + "_" + (i + 1) + "u", "nguoi", "Bạn", luot.nguoi, mau.rieng || "")
        );
      }
      let res = null;
      if (mau.mode === "nhom") {
        const nhanVats = luot.nhanVats.map((id) => mau.story.nhanVats.filter((c) => c.id === id)[0]);
        res = await replyAsGroup({
          story: mau.story,
          conv: mau.conv,
          messages: mau.messages,
          nhanVats,
          goiTen: [],
          goiVang: [],
          moDau: luot.moDau === true,
        });
        // App cập nhật danh sách người có mặt khi phản hồi có khối điều khiển; AI giả ở đây
        // không phát marker nên `hienDien` giữ nguyên — vẫn đi qua đúng nhánh đó.
        if (res && res.hienDien) mau.conv.hienDien = res.hienDien;
      } else {
        const nhanVat = mau.story.nhanVats.filter((c) => c.id === luot.nhanVat)[0];
        res = await replyAs({ story: mau.story, conv: mau.conv, messages: mau.messages, nhanVat });
      }
      prompts.push(daGoi[daGoi.length - 1]);
      mau.messages.push(
        tin(
          "tn_zz7a_" + mau.key + "_" + (i + 1) + "a",
          "ai",
          mau.mode === "nhom" ? luot.nhanVats.map((id) => mau.story.nhanVats.filter((c) => c.id === id)[0].ten).join(" · ") : mau.story.nhanVats.filter((c) => c.id === luot.nhanVat)[0].ten,
          (res && res.text) || luot.traLoi,
          mau.rieng || ""
        )
      );
    }
  } finally {
    goc.aiTextPlugin = cu;
  }
  return prompts;
}

// Đo tiền tố chung của từng cặp lượt liền nhau. Đơn vị: BYTE (UTF-8), vì đó là thứ máy chủ
// cache và tính tiền. `tyLe` = tiền tố chung chia cho độ dài prompt SAU (prompt thực sự gửi đi).
const enc = new TextEncoder();

export function doTienTo(prompts) {
  const ds = [];
  for (let i = 1; i < prompts.length; i++) {
    const a = enc.encode(prompts[i - 1]);
    const b = enc.encode(prompts[i]);
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
    ds.push({ cap: i + "-" + (i + 1), chung: n, dai: b.length, tyLe: b.length ? n / b.length : 0 });
  }
  return ds;
}

function lamTron(x) {
  return Math.round(x * 10000) / 10000;
}

export async function chayTatCa() {
  const ra = {};
  for (const mau of dungTatCa()) {
    const prompts = await chayMotMau(mau);
    const cap = doTienTo(prompts);
    const tyLe = cap.map((c) => c.tyLe);
    ra[mau.key] = {
      key: mau.key,
      ten: mau.ten,
      prompts,
      cap,
      nhoNhat: lamTron(Math.min.apply(null, tyLe)),
      trungBinh: lamTron(tyLe.reduce((a, b) => a + b, 0) / tyLe.length),
    };
  }
  return ra;
}

// Mốc để so hồi quy. Chỉ giữ số, KHÔNG giữ prompt (prompt đã có ở fixture từng lượt).
export function mocTuKetQua(kq) {
  const mau = {};
  for (const key of MAU_KEY) {
    mau[key] = {
      ten: kq[key].ten,
      nhoNhat: kq[key].nhoNhat,
      trungBinh: kq[key].trungBinh,
      cap: kq[key].cap.map((c) => ({ cap: c.cap, chung: c.chung, dai: c.dai, tyLe: lamTron(c.tyLe) })),
    };
  }
  return {
    phienBan: 1,
    soLuot: SO_LUOT,
    ghiChu:
      "Mốc prefix-cache của 3 truyện mẫu hư cấu (Giai đoạn 7a). Ca Node ĐỎ nếu tỉ lệ tiền tố " +
      "chung nhỏ nhất của bất kỳ mẫu nào giảm quá 5 điểm phần trăm so với mốc. Tạo lại bằng: " +
      "node tests/lib/tao-prompt-fixture.mjs (ghi cả fixture từng lượt).",
    donVi: "byte UTF-8; tyLe = tiền tố chung / độ dài prompt sau",
    mau,
  };
}
