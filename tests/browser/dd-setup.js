const st = await import("/src/store.js");
const TS = await import("/src/trangThai.js");
const TEN = "ZZ Test Đạo diễn";
const old = st.store.stories.find((s) => s.ten === TEN);
if (old) await st.deleteStory(old.id);

const story = await st.createStory({
  ten: TEN,
  mode: "songSong",
  nguoiChoiTen: "Minh",
  boiCanh: "Một căn hộ ở Sài Gòn, ba người bạn cùng giữ một bí mật nhỏ.",
});
const kai = st.newCharacter({ ten: "Kai", vaiTro: "người giữ lời", tinhCach: "Cứng đầu nhưng giữ lời" });
const aric = st.newCharacter({ ten: "Aric", vaiTro: "kẻ hay do dự", tinhCach: "Dịu nhưng thiếu quyết đoán" });
const sera = st.newCharacter({ ten: "Sera", vaiTro: "người quan sát", tinhCach: "Lạnh lùng, tinh ý" });
story.nhanVats = [kai, aric, sera];
const ht1 = st.newConversation({ tieuDe: "Căn hộ", nhanVatIds: [kai.id, aric.id] });
const ht2 = st.newConversation({ tieuDe: "Ban công", nhanVatIds: [sera.id] });
story.hoiThoais = [ht1, ht2];
story.daoDien = st.daoDienMacDinh();
story.daoDien.bat = true;

const m1 = st.makeMessage("ai", "Aric hứa sẽ đứng về phía Kai.", { nvId: aric.id, ten: "Aric" });
const m2 = st.makeMessage("nguoi", "Minh gật đầu.", { ten: "Minh" });
const m3 = st.makeMessage("ai", "Kai quay đi, không nói gì.", { nvId: kai.id, ten: "Kai" });
const msgs1 = [m1, m2, m3];
await st.replaceMessages(ht1.id, msgs1);

const canh1 = TS.taoCanh(story, ht1, {
  tuMsgId: m1.id,
  denMsgId: m3.id,
  tomTat: "Aric hứa đứng về phía Kai; Kai im lặng nhưng ở lại.",
  moc: "Sáng hôm sau có người gõ cửa",
  kyUc: [
    { noiDung: "Aric đã giữ lời hứa với Kai", biet: ["nguoi", kai.id, aric.id] },
    { noiDung: "Kai biết Aric từng che giấu một chuyện", biet: ["nguoi"] },
  ],
  quanHe: [
    { tu: aric.id, den: kai.id, chieu: "tinTuong", huong: 1, buoc: 2, lyDo: "Aric đã giữ lời trước mặt Kai" },
    { tu: kai.id, den: aric.id, chieu: "tinTuong", huong: -1, buoc: 1, lyDo: "Kai vẫn còn nghi ngờ" },
    { tu: aric.id, den: kai.id, chieu: "chuaNoi", moi: "Aric sợ Kai sẽ bỏ đi nếu biết hết", huong: 1 },
  ],
  nhanVat: [
    { nvId: kai.id, truong: "mauThuan", cu: "", moi: "muốn tin Aric nhưng sợ bị bỏ rơi", lyDo: "Aric từng che giấu" },
    { nvId: kai.id, truong: "camXuc", cu: "", moi: "im lặng, dè chừng", lyDo: "cuộc nói chuyện vừa rồi" },
    { nvId: aric.id, truong: "mucTieu", cu: "", moi: "giữ được lòng tin của Kai", lyDo: "lời hứa vừa nói" },
  ],
});

const m4 = st.makeMessage("ai", "Sera thú nhận với Minh.", { nvId: sera.id, ten: "Sera" });
const m5 = st.makeMessage("nguoi", "Minh im lặng nghe.", { ten: "Minh" });
const msgs2 = [m4, m5];
await st.replaceMessages(ht2.id, msgs2);

const canh2 = TS.taoCanh(story, ht2, {
  tuMsgId: m4.id,
  denMsgId: m5.id,
  tomTat: "Ở ban công, Sera thú nhận cô đã nói dối cả nhóm.",
  kyUc: [{ noiDung: "Sera thú nhận đã nói dối cả nhóm ở ban công", biet: ["nguoi", sera.id], rieng: sera.id }],
  quanHe: [{ tu: sera.id, den: "nguoi", chieu: "ganGui", huong: 1, buoc: 1, lyDo: "Sera chọn thú nhận với Minh trước" }],
  nhanVat: [{ nvId: sera.id, truong: "cheGiau", cu: "", moi: "đã thú nhận, nhưng còn giữ chuyện của Aric", lyDo: "chỉ nói một nửa" }],
});

story.canhDaKhep = [canh1, canh2];
await st.saveStory(story);
await st.loadStories();
window.location.hash = "#ct=" + story.id + "&ht=" + ht1.id;
return { storyId: story.id, ht1: ht1.id, ht2: ht2.id, nv: { kai: kai.id, aric: aric.id, sera: sera.id }, canh: { c1: canh1.id, c2: canh2.id } };
