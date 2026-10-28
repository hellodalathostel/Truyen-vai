# Truyện Vai

Ứng dụng nhập vai tiếng Việt trên Perchance: một người chơi, nhiều nhân vật AI, cảnh nhóm,
chương, ký ức, Đạo diễn và ảnh cảnh. Dữ liệu được lưu trên trình duyệt qua kv-plugin.

- Luật làm việc và bản đồ mã: [src/CONTEXT.md](src/CONTEXT.md).
- Tài liệu và lịch sử: [src/README.md](src/README.md).
- Kiểm thử và đóng gói: [tests/README.md](tests/README.md).
- Kế hoạch tính năng: [src/TINH-NANG.md](src/TINH-NANG.md).

## Kiểm thử

Node 20 trở lên, không cần cài thư viện npm:

```sh
npm test
node --test tests/node/reliability.test.mjs
```

index.html là phần thân trang Perchance, cần root và các plugin khai báo trong main.pjs.
Mở riêng tệp HTML chưa tạo ra môi trường chạy đầy đủ. Bộ trình duyệt dùng
tests/browser/runner.js trong preview Perchance; xem hướng dẫn trong tests/README.md.

## TV-01/TV-02 — độ tin cậy dữ liệu

- Giữ toàn bộ tin nhắn khi lưu; bỏ ngưỡng cắt 4.000 tin. Cửa sổ ngữ cảnh AI vẫn được giới hạn riêng.
- Cô lập truyện sai hình dạng vào store.truyenCanPhucHoi trong RAM; giữ nguyên KV, cho các truyện tốt tiếp tục mở.
- Thư viện có nút xem và xuất tệp cứu dữ liệu gốc. Khi có bản cần phục hồi, sao lưu toàn bộ chuyển sang màn cứu dữ liệu; tạm dừng dọn tự động và xoá hồ sơ dùng chung.
- Tệp truyen-vai-rescue dành cho phục hồi thủ công, gồm các cặp khoá/giá trị gốc của bốn kho dữ liệu; không nhập như tệp sao lưu thường.
- Không đổi hình dạng dữ liệu đã lưu: PHIEN_BAN_TRUYEN vẫn là 8. Không tự phục hồi phần lịch sử đã bị bản cũ cắt; phần đó cần bản sao lưu có sẵn.

Kiểm thử mới: tests/node/reliability.test.mjs và tests/browser/tv01-tv02.js.
Việc phân trang lịch sử, điều phối tác vụ AI và journal phục hồi thuộc các đợt tiếp theo.
