# [iCon-Tool](https://dammeiosvn.github.io/iCon-Tool/iConTool.mobileconfig)
Công cụ tạo icon trên ios 15-27.
<img width="828" height="1792" alt="IMG_0497" src="https://github.com/user-attachments/assets/eb59b1fa-f9d4-4b45-83ad-632764c9a327" />

## Bản sửa editor v37

- Nền bao gồm màu, bo góc, kính và viền sáng màu đơn / gradient 2–3 màu.
- Chữ, ảnh, SVG cùng một bảng; chọn lớp trước khi chỉnh. Kéo để di chuyển, hai ngón để phóng và xoay, dùng ↑/↓ để đổi thứ tự lớp.
- Thanh **Đậm / nhạt** bên dưới mỗi ô màu: kéo trái để giảm độ đậm, kéo phải để tăng độ đậm (0–100%). Màu RGB được giữ nguyên; chỉ thay độ trong suốt. Đổ bóng dùng duy nhất thanh Độ đậm sẵn có.
- **Lấy màu**: chọn đích trong “Gắn vào”, bấm nút, rồi chạm vào điểm có màu trên canvas. Có thông báo kết quả và nút hủy.
- Nền **Trong suốt** giữ alpha khi xuất PNG / SVG / ZIP / mobileconfig; noise và kính không phủ nền ở chế độ này. Viền và bóng chủ động thêm vẫn được giữ.
- Layer, ảnh/SVG, kho thiết kế và lịch sử Undo/Redo lưu bằng IndexedDB trên thiết bị. `localStorage` chỉ giữ cài đặt nhỏ như style / tên phím tắt.
- Bộ ZIP dùng ảnh riêng của từng ô và hiệu ứng nền chung; không lấy composition đang chỉnh. Tên trùng được thêm hậu tố.

### Chạy và kiểm tra

Ứng dụng vẫn là HTML/CSS/JS tĩnh, không cần bước build. Mở bằng web server, ví dụ `python3 -m http.server 8080`.

```sh
npm ci
npm test
```

Kiểm thử dùng DOM, canvas raster và IndexedDB giả lập: alpha của PNG, SVG, thao tác layer, zoom, xoay, lật, Undo/Redo, tải lại thiết kế, mở kho, ZIP nhiều ảnh, chuyển dữ liệu cũ, UUID fallback và cache offline. Bộ kiểm thử không thay thế thử cảm ứng / chia sẻ file trực tiếp trên Safari iPhone.

Thiết kế cũ chỉ có thumbnail và không từng lưu nguồn ảnh/SVG sẽ không thể phục hồi nguồn đã mất. Bản này chuyển được thông số và lớp chữ/ký hiệu còn lưu trong dữ liệu cũ.


## Bố cục v38

Lấy màu nằm đầu bảng Nền. Kiểu nền có nút Màu đơn / 2 màu / 3 màu / Trong suốt. Các ô màu là nút tròn, tên bên dưới; màu viền sáng nằm cuối bảng. Hàng thao tác Chữ/Ảnh gồm Màu theo nền → Chụp ảnh → Căn giữa.

Bố cục dựa trên độ rộng viewport: dưới 768px dùng bảng dưới canvas; từ 768px dùng bảng bên cạnh, nút rail lớn hơn và ô màu 64px. Đổi hướng và Split View tự cập nhật theo kích thước hiện tại.
