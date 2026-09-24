// Truyện Vai — Đợt 6c: bảng sự kiện toàn cục phần NỘI DUNG NGƯỜI LỚN (giao kèo, mức độ, tín hiệu).
//
// QUAN TRỌNG: tệp này KHÔNG chứa một phán định tuổi nào. Nó chỉ mở màn/gọi hàm của app —
// `openGiaoKeo()` tự đi qua cửa 18+ (`xacNhan18PlusTruyen` + `chanNoiDungNguoiLon`), và mọi
// câu chữ + quyết định "ai được ghi cờ" nằm ở `src/ui/cong18.js`. Có ca kiểm thử ghim rằng
// tầng này không tự dựng lại logic tuổi (không `laNguoiLon`, không câu chữ 18+).
//
// Hàm xử lý nhận `{ t, story, conv }` — xem `chung.js`. Tệp này KHÔNG tự đăng ký sự kiện.

export function bangNguoiLon(D) {
  return {
    "open-giao-keo": () => D.openGiaoKeo(),
    "safeword": async () => { await D.tinHieuCanh("safeword"); },
    "aftercare": async () => { await D.tinHieuCanh("aftercare"); },
    "thuong-luong": async () => { await D.tinHieuCanh("thuongLuong"); },
    "set-mucdo": async ({ t }) => { await D.doiMucDo(t.dataset.so); },
  };
}
