// Giai đoạn 9 Đợt 1 — hồi quy XUẤT THẺ: những gì sửa trên form phải ra thẻ.
// Ba lỗi đã gặp (theo yêu cầu của chủ dự án, phải có kiểm thử trước khi đóng gói lại):
//   1. sửa tên/mô tả/tuổi trên form rồi bấm Xuất vẫn nhận dữ liệu cũ (`xuatThe` chưa đọc
//      lại form — nay đã gọi `docForm` trước khi dựng thẻ);
//   2. sửa `ghiChu` rồi xuất thì `scenario` vẫn là bản cũ (nay đi theo `ghiChu` hiện tại);
//   3. `creator_notes` gốc bị ghi đè, trường lạ (`assets`) bị bỏ (nay giữ nguyên).
// Lỗi 2+3 còn có ca Node trong `tests/node/theNhanVat.test.mjs`; ở đây kiểm TRỌN LUỒNG
// form ⇒ bản nháp ⇒ tệp xuất (lỗi 1 chỉ lộ ở tầng trình duyệt).
const A = window.__A;
if (!A || !A.auditBaseReady) throw new Error("Thiếu audit-base.js");
const T = A.T;
const cho = A.cho;
const kq = [];
const chk = (ten, ok, ct) => kq.push({ ten, ok: !!ok, ct: ok ? "" : String(ct === undefined ? "" : ct).slice(0, 300) });
const NL = String.fromCharCode(10);

// Bắt tệp "xuất" mà không tải thật (cùng cách với nh-io.js) — TỰ cài/gỡ hook trong mỗi
// lượt chạy, không dùng cờ "đã cài": runner trả `URL.createObjectURL` về bản gốc trước
// mỗi bước, nên cờ còn sót từ lượt trước sẽ khiến lượt sau bỏ qua cài bẫy và `batBlob`
// rỗng (lỗi từng gặp: chạy lần hai trên cùng trang không bắt được tệp xuất).
let batBlob = null;
const gocCreate = URL.createObjectURL;
const gocClick = HTMLAnchorElement.prototype.click;
URL.createObjectURL = function (b) {
  if (b instanceof Blob) batBlob = b;
  return gocCreate.call(URL, new Blob([""]));
};
HTMLAnchorElement.prototype.click = function () {
  if (this.download) return;
  return gocClick.apply(this, arguments);
};

// Thẻ ngoài (không có khối riêng của app) — tên mẫu tổng hợp, rõ ràng không phải dữ liệu thật.
const THE_NGOAI = {
  spec: "chara_card_v2",
  spec_version: "2.0",
  data: {
    name: "Zz The Xuat",
    description: "Mô tả từ thẻ ngoài.",
    personality: "Trầm.",
    scenario: "Bối cảnh gốc của thẻ.",
    first_mes: "Chào cậu.",
    mes_example: "Chào.",
    creator_notes: "Ghi chú gốc của tác giả.",
    tags: ["zz"],
    assets: [{ type: "icon", uri: "embeded://goc" }],
    extensions: {},
  },
};

const F = (f) => document.querySelector('.char-editor [data-f="' + f + '"]');
const setV = (el2, v) => { el2.value = v; el2.dispatchEvent(new Event("input", { bubbles: true })); };
// Nhét tệp vào khe <input type=file> mà màn tự tạo (cách đã dùng khi kiểm bằng tay).
async function nhapQuaKhe(file) {
  const taoGoc = document.createElement.bind(document);
  document.createElement = function (tag, opt) {
    const el2 = taoGoc(tag, opt);
    if (tag === "input") {
      setTimeout(() => {
        if (el2.type === "file" && el2.onchange) {
          Object.defineProperty(el2, "files", { value: [file], configurable: true });
          el2.onchange();
        }
      }, 0);
    }
    return el2;
  };
  try {
    document.querySelector('.char-editor [data-act="the-nhap"]').click();
    for (let i = 0; i < 100; i++) {
      await cho(60);
      if (F("ten") && F("ten").value === "Zz The Xuat") return true;
    }
    return false;
  } finally {
    document.createElement = taoGoc;
  }
}

try {
  await A.taoZZ({ id: "ct_zzthe", ten: "ZZ THE XUAT" });
  T.openCharacterEditor("nv_z1");
  await cho(500);
  chk("mở được màn sửa nhân vật", !!document.querySelector(".char-editor"));

  const vao = await nhapQuaKhe(new File([JSON.stringify(THE_NGOAI)], "zz-the-xuat.json", { type: "application/json" }));
  chk("nhập thẻ: form điền đúng tên từ thẻ", vao && F("ghiChu").value === "Bối cảnh gốc của thẻ.");

  // Sửa trên form rồi bấm Xuất NGAY (không Lưu) — lỗi 1 cũ là thẻ ra vẫn là chữ cũ.
  setV(F("ten"), "Zz The Sua");
  setV(F("moTa"), "Mô tả đã sửa trên form.");
  setV(F("tuoi"), "29");
  setV(F("ghiChu"), "Ghi chú đã sửa trên form.");
  batBlob = null;
  document.querySelector('.char-editor [data-act="the-xuat"]').click();
  for (let i = 0; i < 100 && !batBlob; i++) await cho(60);
  chk("bấm Xuất thì có tệp ra", !!batBlob);
  const the = JSON.parse(await batBlob.text());

  chk("lỗi 1: tên sửa trên form ra thẻ", the.data.name === "Zz The Sua", the.data.name);
  chk("lỗi 1: mô tả sửa trên form ra thẻ", the.data.description === "Mô tả đã sửa trên form.", the.data.description);
  chk("lỗi 1: tuổi sửa trên form ra khối riêng", the.data.extensions.truyenVai.tuoi === "29", the.data.extensions.truyenVai.tuoi);
  chk("lỗi 2: scenario đi theo ghiChu hiện tại", the.data.scenario === "Ghi chú đã sửa trên form.", the.data.scenario);
  chk("lỗi 3: giữ creator_notes gốc", the.data.creator_notes.indexOf("Ghi chú gốc của tác giả.") === 0, the.data.creator_notes.slice(0, 60));
  chk("lỗi 3: giữ trường lạ assets", JSON.stringify(the.data.assets) === JSON.stringify([{ type: "icon", uri: "embeded://goc" }]), JSON.stringify(the.data.assets));
  chk("giữ first_mes của thẻ gốc", the.data.first_mes === "Chào cậu.", the.data.first_mes);
  chk("thẻ ra đọc lại được", the.spec === "chara_card_v2" && the.data.name === "Zz The Sua");
} finally {
  try { URL.createObjectURL = gocCreate; } catch (e) {}
  try { HTMLAnchorElement.prototype.click = gocClick; } catch (e) {}
  document.querySelectorAll("#modalRoot .modal-backdrop").forEach((x) => x.remove());
  T.app.screen = "home";
  T.render();
  await cho(60);
}

return kq;
