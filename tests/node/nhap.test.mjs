// Truyện Vai — tầng kiểm thử Node: đường NHẬP thành bản sao (src/nhap.js).
//
// `capIdMoi` là hàm THUẦN đứng sau chế độ "nhập thành bản sao": nó cấp ID mới cho mọi bản ghi và
// dịch lại toàn bộ tham chiếu chéo, để bản sao không dùng chung ID với bản gốc. Tách khỏi `app.js`
// (Đợt 6d) chính là để kiểm được ở đây — trước đó chỉ kiểm được bằng trình duyệt.
//
// Ba nhóm luật được ghim ở tệp này:
//   (1) ID: mọi bản ghi có ID mới, duy nhất; bản GỐC không bị đụng.
//   (2) Tham chiếu chéo: mọi chỗ trỏ sang bản ghi khác đều dịch theo — kể cả hội thoại ↔ chương,
//       tin nhắn ↔ nhân vật/ảnh, sổ hé lộ, đính chính/hướng/tiến độ, phiên vắng mặt.
//   (3) Đi kèm: chỉ mang theo thứ bản sao THẬT SỰ dùng (ảnh có nguồn ảnh hợp lệ + thuộc truyện
//       này; hồ sơ ngoại hình được tham chiếu) — liên kết trỏ ra ngoài thì bỏ.
//
// Dữ liệu ở đây là HƯ CẤU (tests/fixtures/truyen.mjs), không lấy từ truyện thật.

import "../lib/moi-truong.js";
import { test, ok, eq, eqSau } from "../lib/h.js";
import { chuanHoaTruyen, chuanHoaTinNhan, laDataUrlAnh } from "../../src/store.js";
import { kiemTraTruyen, kiemTraTinNhan } from "../../src/schema.js";
import { capIdMoi } from "../../src/nhap.js";
import {
  ID_NGUOI, taoTruyen, taoNhanVat, taoHoiThoai, taoCanhDaKhep, taoTinNhan, taoHoSo, taoGiaoKeo,
} from "../fixtures/truyen.mjs";

const ANH_OK = "data:image/png;base64,AAAA";
// `laDataUrlAnh()` nhận cả `data:` lẫn `http(s)://`, chỉ loại chuỗi rác/rỗng ⇒ ảnh "không hợp lệ"
// ở đây là chuỗi rác, đúng loại dữ liệu một file nhập méo mó có thể chứa.
const ANH_RAC = "khong-phai-anh";

// ---------------------------------------------------------------- dựng một truyện đủ loại
function dungTruyen() {
  const nvA = taoNhanVat("nv_a", "Aaa", { ngoaiHinhId: "nh_a" });
  const nvB = taoNhanVat("nv_b", "Bbb", { ngoaiHinhId: "nh_khong_co" });
  const ht1 = taoHoiThoai("ht_1", "Tuyến một", ["nv_a", "nv_b"], { chuongId: "ch_1" });
  const ht2 = taoHoiThoai("ht_2", "Tuyến hai", ["nv_a"], {
    chuongId: null,
    canhRieng: { nvId: "nv_a", doDai: "vua" },
    vgHeLo: [
      { vgId: "vge_1", htId: "ht_1", tnId: "tn_1", nvId: "nv_a", luc: 5 },
      { vgId: "vge_1", htId: "ht_1", tnId: "tn_khong_co", nvId: "nv_a", luc: 6 },
    ],
  });
  const canh = taoCanhDaKhep("canh_1", "ht_1", {
    htIds: ["ht_1", "ht_2"],
    tuMsgId: "tn_1",
    denMsgId: "tn_2",
    kyUc: [{ id: "ku_1", noiDung: "k", biet: ["nv_a", "nv_b"], rieng: "nv_a" }],
    quanHe: [{ id: "qh_1", tu: "nv_a", den: "nv_b", loai: "quen" }],
    nhanVat: [{ id: "nvz_1", nvId: "nv_a", tamTrang: "bình thường" }],
  });
  const truyen = taoTruyen({
    id: "ct_zznhap",
    ten: "ZZ Nhập",
    giaoKeo: taoGiaoKeo({ bat: false }),
    nguoiChoi: { ten: "Bạn", moTa: "", ngoaiHinhId: "nh_a" },
    nhanVats: [nvA, nvB],
    chuongs: [{ id: "ch_1", so: 1, tieuDe: "Chương một", mucTieu: "", tomTat: "", daKetThuc: false, taoLuc: 1, suaLuc: 1 }],
    hoiThoais: [ht1, ht2],
    canhDaKhep: [canh],
    bienNienSu: [{ id: "bn_1", noiDung: "sự kiện", luc: 3 }],
    anh: [
      { id: "anh_1", convId: "ht_1", hoSoIds: ["nh_a", "nh_khong_co"], chuThich: "trong truyện" },
      { id: "anh_2", convId: "ht_khac", hoSoIds: ["nh_a"], chuThich: "của truyện khác" },
    ],
    lorebook: { ten: "sổ", phienBan: 1, entries: [{ id: "lb_1", ghiChu: "mục", keys: ["x"], noiDung: "n", bat: true }] },
    daoDien: {
      bat: true,
      dinhChinh: [{ id: "dc_1", nvId: "nv_a", truong: "tinhCach", giaTri: "điềm", bat: true, xoa: false, xoaLuc: 0, nguonCanh: ["canh_1"], luc: 2, suaLuc: 2 }],
      huong: [{ id: "hd_1", nvId: "nv_b", ten: "hướng", mongMuon: "m", trangThai: "hoatDong", tu: 1, den: 2, luc: 1, suaLuc: 1, tienDo: [{ id: "td_1", htId: "ht_1", canhId: "canh_1", trangThai: "giữa", ghiChu: "", luc: 4 }] }],
    },
    thoiGian: { phien: { id: "vgp_1", tuLuc: 1, denLuc: 2, cheDo: "tamDung", trangThai: "xong", suKienIds: ["vge_1"] }, vangLuc: 2, nguongPhut: 60, cheDo: "tamDung" },
    ngoaiManHinh: [
      { id: "vge_1", htId: "ht_1", phienId: "vgp_1", noiDung: "việc", mucGoc: "an", thamGia: ["nv_a"], biet: ["nv_a"], tnIds: ["tn_1"], heLo: [{ htId: "ht_1", tnId: "tn_1", nvId: "nv_a", luc: 5 }, { htId: "ht_1", tnId: "tn_khong_co", nvId: "nv_a", luc: 6 }], luc: 5, suaLuc: 5 },
    ],
  });
  return { truyen, msgs: {
    ht_1: [
      taoTinNhan("tn_1", "nguoi", "Bạn", "xin chào", { nvId: "nv_a", nvIds: ["nv_a", "nv_b"], rieng: "nv_a", khep: "canh_1", vangMatPhien: "vgp_1" }),
      taoTinNhan("tn_2", "ai", "Aaa", "chào lại", { anhId: "anh_1", vangMat: "vge_1" }),
    ],
    ht_2: [taoTinNhan("tn_3", "ai", "Aaa", "riêng", { rieng: "nv_a" })],
    ht_khac: [taoTinNhan("tn_9", "ai", "X", "của truyện khác")],
  } };
}

function dungAnhMap() {
  return {
    anh_1: { id: "anh_1", dataUrl: ANH_OK, convId: "ht_1", hoSoIds: ["nh_a"], chuThich: "a" },
    anh_2: { id: "anh_2", dataUrl: ANH_OK, convId: "ht_khac", hoSoIds: ["nh_a"], chuThich: "b" },
    anh_rac: { id: "anh_rac", dataUrl: ANH_RAC, convId: "ht_1", hoSoIds: [], chuThich: "c" },
  };
}

function chuanBi() {
  const { truyen, msgs } = dungTruyen();
  const s = chuanHoaTruyen(truyen);
  s.anh = s.anh.concat([{ id: "anh_rac", convId: "ht_1", hoSoIds: [] }]);
  const msgsChuan = {};
  for (const k of Object.keys(msgs)) msgsChuan[k] = chuanHoaTinNhan(msgs[k], k);
  const hoSoMap = { nh_a: taoHoSo("nh_a", "Hồ sơ A") };
  return { s, msgsChuan, hoSoMap, goc: JSON.parse(JSON.stringify(s)) };
}

// --------------------------------------------------------------------------- ca kiểm thử
test("capIdMoi: bản GỐC không bị đụng, mọi ID đều là ID mới", () => {
  const { s, msgsChuan, hoSoMap, goc } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  eqSau(s, goc, "đầu vào không bị sửa một byte");

  const moi = kq.story;
  ok(moi.id !== "ct_zznhap" && moi.id.indexOf("ct_") === 0, "truyện có id mới");
  const idCu = ["nv_a", "nv_b", "ch_1", "ht_1", "ht_2", "canh_1", "ku_1", "qh_1", "nvz_1", "bn_1", "lb_1", "dc_1", "hd_1", "td_1", "vge_1", "vgp_1", "anh_1", "anh_2"];
  const idMoi = [moi.nhanVats[0].id, moi.nhanVats[1].id, moi.chuongs[0].id, moi.hoiThoais[0].id, moi.hoiThoais[1].id,
    moi.canhDaKhep[0].id, moi.canhDaKhep[0].kyUc[0].id, moi.canhDaKhep[0].quanHe[0].id, moi.canhDaKhep[0].nhanVat[0].id,
    moi.bienNienSu[0].id, moi.lorebook.entries[0].id, moi.daoDien.dinhChinh[0].id, moi.daoDien.huong[0].id,
    moi.daoDien.huong[0].tienDo[0].id, moi.ngoaiManHinh[0].id, moi.thoiGian.phien.id, moi.anh[0].id, moi.anh[1].id];
  for (let i = 0; i < idMoi.length; i++) {
    ok(idCu.indexOf(idMoi[i]) < 0, "id đã đổi: vị trí " + i);
    eq(idMoi.filter((x) => x === idMoi[i]).length, 1, "id mới duy nhất: vị trí " + i);
  }
  ok(moi.nhanVats[0].id.indexOf("nv_") === 0, "tiền tố id nhân vật giữ nguyên");
  ok(moi.daoDien.huong[0].tienDo[0].id.indexOf("td_") === 0, "tiền tố id tiến độ giữ nguyên");
  // Người chơi là một "nhân vật" đặc biệt: KHÔNG cấp id mới cho nó.
  eq(moi.hoiThoais[0].nhanVatIds.indexOf(ID_NGUOI) < 0, true, "id người chơi không lọt vào danh sách");
});

test("capIdMoi: mọi tham chiếu chéo được dịch sang ID mới", () => {
  const { s, msgsChuan, hoSoMap } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  const moi = kq.story;
  const nvA = moi.nhanVats[0].id, nvB = moi.nhanVats[1].id;
  const ht1 = moi.hoiThoais[0].id, ht2 = moi.hoiThoais[1].id;
  const ch1 = moi.chuongs[0].id, canh1 = moi.canhDaKhep[0].id, vge1 = moi.ngoaiManHinh[0].id;

  eq(moi.hoiThoais[0].chuongId, ch1, "hội thoại trỏ tới chương mới");
  eqSau(moi.hoiThoais[0].nhanVatIds, [nvA, nvB], "danh sách nhân vật của hội thoại đã dịch");
  eqSau(moi.hoiThoais[0].hienDien, [nvA, nvB], "danh sách hiện diện đã dịch");
  eq(moi.hoiThoais[1].chuongId, null, "hội thoại không thuộc chương nào vẫn là null");
  eq(moi.hoiThoais[1].canhRieng.nvId, nvA, "cảnh riêng trỏ tới nhân vật mới");

  eq(moi.canhDaKhep[0].htId, ht1, "cảnh khép trỏ tới hội thoại mới");
  eqSau(moi.canhDaKhep[0].htIds, [ht1, ht2], "cảnh khép giữ cả hai hội thoại đã dịch");
  eq(moi.canhDaKhep[0].kyUc[0].rieng, nvA, "ký ức riêng đã dịch");
  eqSau(moi.canhDaKhep[0].kyUc[0].biet, [nvA, nvB], "ai biết trong ký ức đã dịch");
  eq(moi.canhDaKhep[0].quanHe[0].tu, nvA, "quan hệ (từ) đã dịch");
  eq(moi.canhDaKhep[0].quanHe[0].den, nvB, "quan hệ (đến) đã dịch");
  eq(moi.canhDaKhep[0].nhanVat[0].nvId, nvA, "nhân vật trong cảnh đã dịch");

  eq(moi.daoDien.dinhChinh[0].nvId, nvA, "đính chính trỏ tới nhân vật mới");
  eqSau(moi.daoDien.dinhChinh[0].nguonCanh, [canh1], "nguồn cảnh của đính chính đã dịch");
  eq(moi.daoDien.huong[0].nvId, nvB, "hướng trỏ tới nhân vật mới");
  eq(moi.daoDien.huong[0].tienDo[0].htId, ht1, "tiến độ trỏ tới hội thoại mới");
  eq(moi.daoDien.huong[0].tienDo[0].canhId, canh1, "tiến độ trỏ tới cảnh mới");

  eq(moi.ngoaiManHinh[0].htId, ht1, "sự kiện vắng mặt trỏ tới hội thoại mới");
  eq(moi.ngoaiManHinh[0].phienId, moi.thoiGian.phien.id, "sự kiện trỏ tới phiên đã dịch");
  eqSau(moi.ngoaiManHinh[0].thamGia, [nvA], "người tham gia đã dịch");
  eqSau(moi.ngoaiManHinh[0].tnIds, [kq.messages[ht1][0].id], "tin nhắn liên quan đã dịch");
  ok(moi.thoiGian.phien.id !== "vgp_1", "phiên vắng mặt có id mới");

  // Tin nhắn: khoá theo ID hội thoại MỚI, và mọi trường trỏ đi đều đã dịch.
  eqSau(Object.keys(kq.messages).sort(), [ht1, ht2].sort(), "tin nhắn chỉ còn hai hội thoại của truyện");
  const m1 = kq.messages[ht1][0], m2 = kq.messages[ht1][1];
  eq(m1.nvId, nvA, "tin nhắn 1 trỏ tới nhân vật mới");
  eqSau(m1.nvIds, [nvA, nvB], "tin nhắn 1 (nhiều nhân vật) đã dịch");
  eq(m1.rieng, nvA, "tin nhắn 1 (cảnh riêng) đã dịch");
  eq(m1.khep, canh1, "tin nhắn 1 trỏ tới cảnh khép mới");
  eq(m1.vangMatPhien, moi.thoiGian.phien.id, "tin nhắn 1 trỏ tới phiên mới");
  eq(m2.anhId, moi.anh[0].id, "tin nhắn 2 trỏ tới ảnh mới");
  eq(m2.vangMat, vge1, "tin nhắn 2 trỏ tới sự kiện vắng mặt mới");
  ok(m1.id !== "tn_1" && m2.id !== "tn_2", "tin nhắn có id mới");
});

test("capIdMoi: sổ hé lộ bỏ lần trỏ tới tin nhắn không được mang sang", () => {
  const { s, msgsChuan, hoSoMap } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  const ht1 = kq.story.hoiThoais[0].id;
  const tn1 = kq.messages[ht1][0].id;
  eqSau(kq.story.hoiThoais[1].vgHeLo.map((r) => [r.htId, r.tnId]),
    [[ht1, tn1]], "vgHeLo: giữ lần có tin nhắn nguồn, bỏ lần mồ côi");
  eqSau(kq.story.ngoaiManHinh[0].heLo.map((r) => [r.htId, r.tnId]),
    [[ht1, tn1]], "heLo: giữ lần có tin nhắn nguồn, bỏ lần mồ côi");
  eq(kq.story.hoiThoais[1].vgHeLo[0].vgId, kq.story.ngoaiManHinh[0].id, "vgHeLo trỏ tới sự kiện mới");
});

test("capIdMoi: hồ sơ ngoại hình chỉ đi kèm khi được tham chiếu, liên kết thiếu thì bỏ", () => {
  const { s, msgsChuan, hoSoMap } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  const moi = kq.story;
  const dsId = Object.keys(kq.ngoaiHinh);
  eq(dsId.length, 1, "chỉ mang theo đúng một hồ sơ (hồ sơ được tham chiếu)");
  eq(kq.ngoaiHinh[dsId[0]].tenChinh, "Hồ sơ A", "đúng hồ sơ đó");
  eq(moi.nhanVats[0].ngoaiHinhId, dsId[0], "liên kết của nhân vật đã dịch sang hồ sơ mới");
  eq(moi.nhanVats[1].ngoaiHinhId, "", "liên kết tới hồ sơ KHÔNG có trong file thì bị bỏ");
  eq(moi.nguoiChoi.ngoaiHinhId, dsId[0], "liên kết của người chơi cũng được dịch");
  eqSau(moi.anh[0].hoSoIds, [dsId[0]], "hoSoIds: bỏ hồ sơ không đi kèm, giữ hồ sơ đi kèm");
});

test("capIdMoi: ảnh chỉ nhận nguồn hợp lệ và chỉ ảnh thuộc truyện", () => {
  const { s, msgsChuan, hoSoMap } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  const dsAnh = Object.keys(kq.anh);
  eq(dsAnh.length, 2, "ảnh có nguồn không hợp lệ bị loại");
  for (const k of dsAnh) ok(laDataUrlAnh(kq.anh[k].dataUrl), "ảnh giữ lại đều có nguồn hợp lệ");
  const cuaTruyen = kq.story.anh.find((a) => a.chuThich === "trong truyện");
  const cuaTruyenKhac = kq.story.anh.find((a) => a.chuThich === "của truyện khác");
  ok(!!cuaTruyen && !!cuaTruyenKhac, "hai ảnh của truyện vẫn nằm trong chỉ mục");
  eq(cuaTruyen.convId, kq.story.hoiThoais[0].id, "ảnh của hội thoại trong truyện giữ liên kết");
  eq(cuaTruyenKhac.convId, "", "ảnh trỏ tới hội thoại NGOÀI truyện bị bỏ liên kết");
});

test("capIdMoi: kết quả qua được tầng schema (Giai đoạn 5)", () => {
  const { s, msgsChuan, hoSoMap } = chuanBi();
  const kq = capIdMoi(s, msgsChuan, dungAnhMap(), hoSoMap);
  eq(kiemTraTruyen(kq.story).ok, true, "truyện bản sao qua được kiểm hình dạng");
  eq(kiemTraTruyen(kq.story).soLoi, 0, "truyện bản sao không có lỗi hình dạng");
  for (const k of Object.keys(kq.messages)) {
    eq(kiemTraTinNhan(kq.messages[k]).soLoi, 0, "tin nhắn của " + k + " không có lỗi hình dạng");
  }
  // Bản sao phải ĐI QUA được đường nạp chuẩn (idempotent): chuẩn hoá lại không đổi gì.
  eqSau(chuanHoaTruyen(kq.story), kq.story, "chuẩn hoá lại bản sao không đổi gì");
});

test("capIdMoi: không có bản ghi nào thì vẫn trả về bộ rỗng hợp lệ", () => {
  const s = chuanHoaTruyen(taoTruyen({ id: "ct_zznhap2", ten: "ZZ Nhập trống" }));
  const kq = capIdMoi(s, {}, {}, {});
  ok(kq.story.id.indexOf("ct_") === 0 && kq.story.id !== "ct_zznhap2", "truyện trống vẫn có id mới");
  eqSau(Object.keys(kq.messages), [], "không có tin nhắn nào");
  eqSau(Object.keys(kq.anh), [], "không có ảnh nào");
  eqSau(Object.keys(kq.ngoaiHinh), [], "không có hồ sơ nào");
});
