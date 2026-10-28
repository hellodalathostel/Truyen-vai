// TV-01/TV-02 — dữ liệu hư cấu; KV giả được trả nguyên sau mỗi ca.
import "../lib/moi-truong.js";
import assert from "node:assert/strict";
import { test } from "../lib/h.js";
import * as S from "../../src/store.js";
import { selectVerbatim } from "../../src/ai.js";
import { capIdMoi } from "../../src/nhap.js";

async function voiKV(chay) {
  const kvCu = S.R.kv;
  const ramCu = Object.assign({}, S.store);
  const kho = Object.fromEntries(["cotTruyen", "tinNhan", "thuVienAnh", "thuVienNgoaiHinh"].map((k) => [k, new Map()]));
  const loi = { doc: false, ghi: false };
  let soGhi = 0;
  S.R.kv = Object.fromEntries(Object.entries(kho).map(([ten, map]) => [ten, {
    get: async (id) => structuredClone(map.get(id)),
    entries: async () => { if (loi.doc) throw new Error("đọc lỗi giả"); return structuredClone(Array.from(map)); },
    set: async (id, v) => { if (loi.ghi) throw new Error("QuotaExceededError"); soGhi++; map.set(id, structuredClone(v)); },
    delete: async (id) => { soGhi++; map.delete(id); },
  }]));
  S.store.messagesCache = {};
  S.store.stories = [];
  S.store.byId = {};
  S.store.truyenCanPhucHoi = [];
  S.store.settings = {};
  S.xoaLoiHinhDang();
  try { await chay({ kho, loi, soGhi: () => soGhi }); }
  finally { S.R.kv = kvCu; Object.assign(S.store, ramCu); S.xoaLoiHinhDang(); }
}

function tin(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "tn_zzrel_" + i, vai: i % 2 ? "ai" : "nguoi", noiDung: "ZZ Nội dung " + i, luc: i + 1 }));
}
function truyen(id = "ct_zzrel_tot") {
  return S.chuanHoaTruyen({ id, ten: "ZZ Truyện thử", nhanVats: [], hoiThoais: [], chuongs: [] });
}

test("TV-01: ghi và nạp lại giữ đủ 3999, 4000, 4001 và 10000 tin", () => voiKV(async () => {
  for (const n of [3999, 4000, 4001, 10000]) {
    const id = "ht_zzrel_" + n;
    const arr = tin(n);
    await S.replaceMessages(id, arr);
    delete S.store.messagesCache[id];
    const doc = await S.loadMessages(id);
    assert.equal(doc.length, n);
    assert.deepEqual(doc.map((m) => [m.id, m.noiDung]), arr.map((m) => [m.id, m.noiDung]));
  }
}));

test("TV-01: thêm tin sau 4000 không dịch mốc tóm tắt hoặc bỏ tin chưa tóm tắt", () => voiKV(async () => {
  const id = "ht_zzrel_moc";
  const conv = { tomTat: "ZZ Tóm tắt phần đầu", tomTatDen: 3992, ghinhoDen: 3990, khepGoc: 3980 };
  await S.replaceMessages(id, tin(4000));
  const arr = await S.pushMessage(id, { id: "tn_zzrel_4000", vai: "nguoi", noiDung: "ZZ Tin mới", luc: 4001 });
  assert.equal(arr.length, 4001);
  assert.equal(arr[0].id, "tn_zzrel_0");
  assert.equal(selectVerbatim(conv, arr)[0].id, "tn_zzrel_3992");
  assert.deepEqual([conv.tomTatDen, conv.ghinhoDen, conv.khepGoc], [3992, 3990, 3980]);
}));

test("TV-01: lỗi quota giữ lịch sử và chỉ bỏ tin vừa thêm", () => voiKV(async ({ loi, kho }) => {
  const id = "ht_zzrel_quota";
  await S.replaceMessages(id, tin(4000));
  loi.ghi = true;
  await assert.rejects(S.pushMessage(id, { id: "tn_zzrel_chua_luu", vai: "nguoi", noiDung: "ZZ Chưa lưu" }));
  assert.equal(S.getMessages(id).length, 4000);
  assert.equal(S.getMessages(id)[0].id, "tn_zzrel_0");
  assert.equal(kho.tinNhan.get(id).length, 4000);
}));

test("TV-01: vòng JSON và nhập bản sao giữ 10000 tin cùng mốc tóm tắt", () => voiKV(async () => {
  const story = truyen();
  const id = "ht_zzrel_nhap";
  story.hoiThoais = [S.newConversation({ id, tomTatDen: 9992, tomTat: "ZZ Tóm tắt", khepGoc: 9980 })];
  const goi = JSON.parse(JSON.stringify({ story, messages: { [id]: tin(10000) } }));
  const ban = capIdMoi(S.napBanGhi(goi.story, "truyen"), goi.messages, {}, {});
  const moi = ban.story.hoiThoais[0];
  await S.replaceMessages(moi.id, S.napBanGhi(ban.messages[moi.id], "tin-nhan", moi.id));
  delete S.store.messagesCache[moi.id];
  const doc = await S.loadMessages(moi.id);
  assert.equal(doc.length, 10000);
  assert.deepEqual(doc.map((m) => m.noiDung), goi.messages[id].map((m) => m.noiDung));
  assert.equal(moi.tomTatDen, 9992);
  assert.equal(selectVerbatim(moi, doc)[0].noiDung, "ZZ Nội dung 9992");
}));

test("TV-02: bản hỏng được cách ly, KV nguyên vẹn, truyện tốt vẫn dùng được", () => voiKV(async ({ kho, soGhi }) => {
  kho.cotTruyen.set("ct_zzrel_tot", truyen());
  const hong = [null, "ZZ bản hỏng", 12, [], { id: "ct_zzrel_thieu", phienBan: S.PHIEN_BAN_TRUYEN }];
  hong.forEach((raw, i) => kho.cotTruyen.set("ct_zzrel_hong_" + i, raw));
  kho.cotTruyen.set("ct_zzrel_sai_mang", Object.assign(truyen("ct_zzrel_sai_mang"), { hoiThoais: "ZZ sai kiểu" }));
  const truoc = structuredClone(Array.from(kho.cotTruyen));
  const ds = await S.loadStories();
  assert.equal(ds.length, 1);
  assert.equal(S.storyStats(ds[0]).convs, 0);
  assert.equal(S.store.truyenCanPhucHoi.length, 6);
  assert.equal(S.getStory("ct_zzrel_hong_1"), null);
  assert.deepEqual(Array.from(kho.cotTruyen), truoc);
  assert.equal(soGhi(), 0);
  assert.ok(S.docLoiHinhDang().tong >= 6);
}));

test("TV-02: bản hiện tại thiếu mảng, mục con hỏng và khoá lệch id không được render", () => voiKV(async ({ kho }) => {
  const thieu = truyen("ct_zzrel_thieu"); delete thieu.hoiThoais;
  kho.cotTruyen.set(thieu.id, thieu);
  kho.cotTruyen.set("ct_zzrel_con", Object.assign(truyen("ct_zzrel_con"), { nhanVats: [null] }));
  kho.cotTruyen.set("ct_zzrel_khoa", truyen("ct_zzrel_id_khac"));
  await S.loadStories();
  assert.equal(S.store.stories.length, 0);
  assert.equal(S.store.truyenCanPhucHoi.length, 3);
  assert.ok(S.store.truyenCanPhucHoi.every((x) => x.lyDo.length > 0));
}));

test("TV-02: truyện đúng hình dạng có tham chiếu mất vẫn mở để tự kiểm tra", () => voiKV(async ({ kho }) => {
  const id = "ct_zzrel_tham_chieu";
  const s = truyen(id);
  s.hoiThoais = [S.newConversation({ id: "ht_zzrel_tham_chieu", nhanVatIds: ["nv_zzrel_mat"], canhRieng: { nvId: "nv_zzrel_mat", moLuc: 1 } })];
  kho.cotTruyen.set(id, s);
  await S.loadStories();
  assert.equal(S.store.stories.length, 1);
  assert.equal(S.store.truyenCanPhucHoi.length, 0);
  const bc = S.kiemTraBatBien(S.store.stories, [], [], []);
  assert.ok(bc.nhom["hoi-thoai-tro-nv"].length > 0);
  assert.deepEqual(kho.cotTruyen.get(id), s);
}));

test("TV-02: truyện cũ hợp lệ vẫn được nâng cấp mà không ghi ngược KV", () => voiKV(async ({ kho, soGhi }) => {
  const raw = { id: "ct_zzrel_cu", ten: "ZZ Truyện cũ", phienBan: 1 };
  kho.cotTruyen.set(raw.id, raw);
  await S.loadStories();
  assert.equal(S.store.stories.length, 1);
  assert.equal(S.store.stories[0].phienBan, S.PHIEN_BAN_TRUYEN);
  assert.equal(S.store.truyenCanPhucHoi.length, 0);
  assert.deepEqual(kho.cotTruyen.get(raw.id), raw);
  assert.equal(soGhi(), 0);
}));

test("TV-02: nạp lại bỏ cách ly bản đã sửa; lỗi đọc giữ trạng thái trước đó", () => voiKV(async ({ kho, loi }) => {
  const id = "ct_zzrel_sua";
  kho.cotTruyen.set(id, "ZZ Hỏng"); await S.loadStories();
  assert.equal(S.store.truyenCanPhucHoi.length, 1);
  kho.cotTruyen.set(id, truyen(id)); await S.loadStories();
  assert.equal(S.store.truyenCanPhucHoi.length, 0);
  assert.equal(S.store.stories.length, 1);
  const cu = S.store.stories;
  loi.doc = true;
  await assert.rejects(S.loadStories());
  assert.equal(S.store.stories, cu);
}));
