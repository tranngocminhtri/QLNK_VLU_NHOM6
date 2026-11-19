# Nội dung bổ sung cho Đề cương ver 0.2 (Nhóm 6)

Các mục dưới đây còn trống hoặc mới là ghi chú trong `Nhom6_DeCuong_ver_0.2.docx`. Chép vào đúng vị trí trong file Word và chỉnh lại lời văn nếu cần.

---

## Sửa lỗi hình thức

- Mục lục: thêm mục **4.3 Xây dựng chương trình** và **4.7 Những khó khăn trong quá trình thực tập**; cập nhật lại số trang (chương 3–5 đang cùng ghi trang 28) bằng *References > Update Table > Update entire table*.
- Sửa chính tả: "THUẬT NGHỮ" → **THUẬT NGỮ**; "DANH MỤC SÁCH CÁC HÌNH VẼ" → **DANH MỤC CÁC HÌNH VẼ**.
- Danh mục bảng/hình: hiện chỉ có Bảng 2.1, Hình 2.1 → chèn lại bằng *References > Insert Table of Figures* (đủ Bảng 2.1–2.3, Hình 2.1–2.7 và các sơ đồ chương 4).
- Bảng 2.3 – cột "Vai trò trong nhóm" đang trống (nhóm tự điền, ví dụ):

| Họ và tên | MSSV | Vai trò trong nhóm |
|---|---|---|
| Trần Phước Đường | 2374802010121 | Trưởng nhóm – Phân tích yêu cầu, Backend, quản lý tiến độ |
| Trần Ngọc Minh Trí | 2274802010926 | Thiết kế CSDL, triển khai Supabase/Render |
| Nguyễn Tiến Dũng | 2274802010102 | Frontend ReactJS, thiết kế giao diện |

- Kế hoạch thực tập: "năm 2025" → **2026**; tiêu đề ghi "12 tuần" nhưng bảng có 11 tuần → thống nhất một con số.
- Mục 4.4.2: xóa câu "Giải thích thuật ngữ cơ bản để bạn dễ nhớ khi báo cáo" (câu ghi chú nội bộ).
- Mục 4.4.3 (DDL): cột `role` ghi chú "STUDENT, LECTURER, ADMIN" – thống nhất với mục 4.1.1: thành viên Hội đồng là Giảng viên được gán vào bảng `council_members`, không phải một vai trò riêng. Bổ sung các cột đã dùng trong hệ thống: `users.is_locked`, `topics.field_id`, `topics.created_by_role`, `topics.is_frozen`, `topics.created_at`, `documents.file_size`, `comments.created_at`, `notifications.created_at` (xem `backend/prisma/schema.prisma`).
- Bảng API 4.2.5: bổ sung `PUT /api/topics/:id/confirm` (UC10), `GET /api/documents/:id/file` (xem/tải file có kiểm tra quyền), `POST /api/auth/google` (SSO).

## Danh mục từ viết tắt và thuật ngữ

| STT | Từ viết tắt | Diễn giải |
|---|---|---|
| 1 | NCKH | Nghiên cứu khoa học |
| 2 | GVHD | Giảng viên hướng dẫn |
| 3 | HĐ | Hội đồng (khoa học / nghiệm thu) |
| 4 | CNTT | Công nghệ thông tin |
| 5 | VLU | Van Lang University – Trường Đại học Văn Lang |
| 6 | CSDL | Cơ sở dữ liệu |
| 7 | API | Application Programming Interface – Giao diện lập trình ứng dụng |
| 8 | REST | Representational State Transfer – Kiến trúc dịch vụ web |
| 9 | SPA | Single Page Application – Ứng dụng web một trang |
| 10 | ORM | Object-Relational Mapping – Ánh xạ đối tượng – quan hệ |
| 11 | JWT | JSON Web Token – Chuỗi xác thực phiên đăng nhập |
| 12 | RBAC | Role-Based Access Control – Phân quyền theo vai trò |
| 13 | SSO | Single Sign-On – Đăng nhập một lần |
| 14 | SMTP | Simple Mail Transfer Protocol – Giao thức gửi thư điện tử |
| 15 | UC | Use Case – Ca sử dụng |
| 16 | ERD | Entity Relationship Diagram – Sơ đồ thực thể – quan hệ |
| 17 | DDL | Data Definition Language – Ngôn ngữ định nghĩa dữ liệu |
| 18 | UI/UX | User Interface / User Experience – Giao diện / Trải nghiệm người dùng |
| 19 | CI/CD | Continuous Integration / Continuous Deployment – Tích hợp và triển khai liên tục |

---

## 4.3.2 Các chức năng đã xây dựng được

*(Chụp màn hình website thật cho mỗi dòng bên dưới và chèn vào; mỗi hình kèm 1–2 câu giải thích.)*

PHẦN NÀY SẼ ĐƯỢC CẬP NHẬT SAU KHI CHẠY KIỂM THỬ.

## 4.3.3 Các chức năng trong dự kiến nhưng chưa xây dựng được

PHẦN NÀY SẼ ĐƯỢC CẬP NHẬT SAU KHI CHẠY KIỂM THỬ.

## 4.3.4 Các sản phẩm khác

- **Mã nguồn** trên GitHub: `https://github.com/tranngocminhtri/QLNK_VLU_NHOM6` (Frontend `frontend/`, Backend `backend/`).
- **Bộ kiểm thử API tự động** (`backend/tests/api.test.js`, chạy bằng `npm test`): kiểm tra các luồng UC01–UC23 và các quy tắc nghiệp vụ Rule 1–5 qua HTTP thật, gồm cả các trường hợp bị chặn (sai mật khẩu, token giả, xem trộm file nhóm khác, xung đột lợi ích Hội đồng...).
- **Tài liệu hướng dẫn cài đặt & triển khai** (`README.md`): chạy trên máy cá nhân, triển khai Supabase – Render – Vercel, cấu hình Google SSO.
- **Script dữ liệu mẫu** (`backend/prisma/seed.js`): 23 tài khoản, 10 đề tài phủ đủ 7 trạng thái vòng đời, phục vụ demo và kiểm thử.

## 4.5 Nhận xét, đánh giá: so sánh giữa lý thuyết và thực tiễn

### 4.5.1 Mặt lý thuyết

Kiến thức từ các học phần Công nghệ phần mềm, Cơ sở dữ liệu, Lập trình Web và An toàn thông tin là nền tảng trực tiếp cho đề tài. Quy trình phân tích – thiết kế (đặc tả Use Case, sơ đồ tuần tự, ERD) giúp nhóm xác định rõ 23 Use Case và 5 quy tắc nghiệp vụ trước khi lập trình, nhờ đó cấu trúc CSDL 12 bảng gần như không phải thay đổi lớn khi viết mã. Lý thuyết chuẩn hóa dữ liệu và ràng buộc khóa ngoại được áp dụng để CSDL tự bảo vệ tính toàn vẹn (ví dụ xóa một đề tài sẽ tự xóa tài liệu, thẻ tiến độ, điểm số liên quan). Kiến trúc Client – Server và RESTful API giúp tách biệt giao diện với nghiệp vụ, cho phép hai phần được phát triển và triển khai độc lập.

### 4.5.2 Mặt thực tiễn

Khi xây dựng thật, nhóm gặp nhiều vấn đề mà bài học trên lớp chưa đề cập:

- **Kiểm tra dữ liệu phải làm ở máy chủ**: phiên bản đầu kiểm tra mọi quy tắc trên trình duyệt; thực tế người dùng có thể gửi yêu cầu trực tiếp tới API, nên mọi quy tắc (Rule 2, kiểm tra trùng lặp, giới hạn thành viên, quyền chấm điểm) phải được kiểm tra lại ở Backend.
- **Phân quyền chi tiết hơn vai trò**: RBAC theo vai trò là chưa đủ – một giảng viên chỉ được duyệt đề tài mình hướng dẫn, chỉ Chủ tịch/Thư ký mới được chốt nghiệm thu. Nhóm phải bổ sung kiểm tra quyền theo từng bản ghi.
- **Bảo vệ file đính kèm**: lưu file trên Supabase Storage và chỉ trả file qua API có kiểm tra quyền, thay vì để đường link công khai, nhằm đáp ứng yêu cầu "sinh viên nhóm này không xem được file của nhóm khác".
- **Quản lý khóa bí mật**: thực tế cho thấy việc vô tình đưa mật khẩu CSDL lên GitHub là rủi ro có thật; nhóm chuyển toàn bộ cấu hình nhạy cảm sang biến môi trường và tài liệu hóa bằng file `.env.example`.
- **Thuật toán trùng lặp**: Cosine Similarity trên tiếng Việt cần tiền xử lý (bỏ dấu câu, từ dừng) và gán trọng số cao hơn cho tên đề tài thì kết quả mới sát với đánh giá của con người.

## 4.6 Đề xuất các giải pháp cải thiện tình hình thực tế

**Áp dụng vào quy trình của Khoa CNTT:**

1. Triển khai thí điểm cho một đợt NCKH sinh viên của Khoa, song song với quy trình giấy trong đợt đầu để đối chiếu.
2. Giáo vụ Khoa nhập danh sách đề tài các khóa trước vào hệ thống để thuật toán kiểm tra trùng lặp có dữ liệu đối chiếu.
3. Thống nhất mẫu đề cương, mẫu báo cáo tiến độ dạng file mẫu tải về ngay trên hệ thống.
4. Dùng mục Timeline để công bố toàn bộ mốc thời gian đợt NCKH; hệ thống tự gắn cờ nộp trễ, giảm việc nhắc nhở thủ công.

**Vận hành và bảo trì máy chủ:**

1. Frontend trên Vercel tự triển khai lại mỗi khi nhánh `main` được cập nhật; Backend trên Render dùng đường dẫn `/api/health` để tự phát hiện máy chủ lỗi.
2. Gói miễn phí của Render tạm ngừng máy chủ khi không có truy cập (khởi động lại mất khoảng 30–60 giây) – khi đưa vào sử dụng chính thức nên nâng lên gói trả phí hoặc dùng máy chủ của trường.
3. Bật sao lưu tự động CSDL trên Supabase; định kỳ kiểm tra `logs/error.log` để phát hiện lỗi gửi email.
4. Mọi khóa bí mật (mật khẩu CSDL, JWT_SECRET, khóa Supabase) chỉ đặt trong biến môi trường, đổi định kỳ và đổi ngay khi nghi ngờ bị lộ.

## 4.7 Những khó khăn trong quá trình thực tập

**Khó khăn kỹ thuật:**
- Xử lý bất đồng bộ trong Node.js và giao diện React: mọi thao tác phải chờ máy chủ phản hồi, cần xử lý trạng thái đang tải, lỗi mạng và phiên đăng nhập hết hạn.
- Đảm bảo nhiều thao tác ghi CSDL xảy ra đồng thời (đổi trạng thái đề tài + tạo thẻ Kanban + gửi thông báo) bằng transaction để không bị dữ liệu nửa vời.
- Viết thuật toán so sánh chuỗi tiếng Việt để phát hiện trùng lặp đề tài với độ chính xác chấp nhận được.
- Tích hợp đăng nhập Google Workspace (OAuth) và xác minh mã Google trả về phía máy chủ.

**Khó khăn nghiệp vụ:**
- Chưa nắm hết quy trình cấp biểu mẫu, chữ ký và lưu trữ hồ sơ thực tế của Khoa; một số quy tắc (giới hạn số nhóm mỗi GVHD, cách tính điểm Hội đồng) nhóm phải tự giả định và cần Khoa xác nhận.
- Thời gian thực tập ngắn nên chưa khảo sát được số lượng lớn người dùng cuối.

---

## CHƯƠNG 5: KẾT LUẬN VÀ ĐỀ XUẤT

### 5.1 Tóm tắt kết quả của quá trình thực tập

PHẦN NÀY SẼ ĐƯỢC CẬP NHẬT SAU KHI CHẠY KIỂM THỬ.

### 5.2 Các kiến nghị rút ra từ kết quả của đợt thực tập

**Đối với hệ thống (hướng phát triển):**
- Mở rộng cho đề tài NCKH cấp giảng viên và cấp trường; thêm nhiều đợt đăng ký trong năm học.
- Nâng cấp kiểm tra trùng lặp: so sánh cả nội dung file báo cáo, dùng mô hình ngôn ngữ (embedding) thay cho Cosine trên từ khóa.
- Ký số điện tử cho quyết định nghiệm thu; xuất biên bản Hội đồng ra PDF.
- Thêm thống kê theo học kỳ/khóa, xuất báo cáo theo mẫu của Phòng Quản lý khoa học.
- Ứng dụng di động hoặc thông báo đẩy cho sinh viên.

**Đối với Khoa và nhà trường:**
- Ban hành quy trình NCKH sinh viên thống nhất dạng số, làm căn cứ để hệ thống áp dụng chính thức.
- Cấp Client ID Google Workspace của trường và tài nguyên máy chủ để vận hành lâu dài.

**Đối với sinh viên thực tập khóa sau:**
- Khảo sát người dùng thật sớm, chốt đặc tả trước khi lập trình.
- Quản lý mã nguồn bằng Git theo nhánh, không đưa khóa bí mật lên kho mã.

---

## TÀI LIỆU THAM KHẢO

[1] Bộ Giáo dục và Đào tạo, *Thông tư 26/2021/TT-BGDĐT Quy định về hoạt động nghiên cứu khoa học của sinh viên trong cơ sở giáo dục đại học*, 2021.
[2] I. Sommerville, *Software Engineering*, 10th ed. Pearson, 2016.
[3] R. Elmasri, S. B. Navathe, *Fundamentals of Database Systems*, 7th ed. Pearson, 2016.
[4] Meta Open Source, "React Documentation". [Online]. Available: https://react.dev
[5] OpenJS Foundation, "Node.js Documentation". [Online]. Available: https://nodejs.org/docs
[6] OpenJS Foundation, "Express 5.x API Reference". [Online]. Available: https://expressjs.com
[7] Prisma Data, "Prisma ORM Documentation". [Online]. Available: https://www.prisma.io/docs
[8] The PostgreSQL Global Development Group, "PostgreSQL Documentation". [Online]. Available: https://www.postgresql.org/docs
[9] Supabase, "Supabase Docs – Database & Storage". [Online]. Available: https://supabase.com/docs
[10] M. Jones, J. Bradley, N. Sakimura, *RFC 7519: JSON Web Token (JWT)*, IETF, 2015.
[11] Google, "Sign in with Google for Web – Verify the Google ID token". [Online]. Available: https://developers.google.com/identity/gsi/web
[12] D. F. Ferraiolo, D. R. Kuhn, "Role-Based Access Controls", *15th National Computer Security Conference*, 1992.
[13] C. D. Manning, P. Raghavan, H. Schütze, *Introduction to Information Retrieval*, Cambridge University Press, 2008 (chương 6 – mô hình không gian vector và độ đo Cosine).
[14] Vercel, "Vercel Documentation"; Render, "Render Docs". [Online]. Available: https://vercel.com/docs, https://render.com/docs
