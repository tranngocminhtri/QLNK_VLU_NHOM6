# Website hỗ trợ quản lý hoạt động NCKH sinh viên – Khoa CNTT, ĐH Văn Lang (Nhóm 6)

| Tầng | Công nghệ | Triển khai |
|---|---|---|
| Frontend | ReactJS (Vite) – thư mục `frontend/` | Vercel |
| Backend | Node.js + Express + Prisma ORM – thư mục `backend/` | Render (`render.yaml`) |
| CSDL & File | PostgreSQL + Storage trên Supabase | Supabase |

Đăng nhập bằng Google Workspace `@vanlanguni.vn` (SSO) hoặc email + mật khẩu (băm scrypt). Phiên làm việc dùng JWT, phân quyền theo vai trò (RBAC): Sinh viên, Giảng viên (kiêm thành viên Hội đồng), Quản lý Khoa.

## Chạy trên máy cá nhân

Cần Node.js 20 trở lên và một CSDL PostgreSQL (Supabase, hoặc chạy thử bằng Docker:
`docker run -d --name qlnk-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=qlnk -p 55432:5432 postgres:16-alpine`).

```bash
# 1. Backend
cd backend
cp .env.example .env        # điền DATABASE_URL, JWT_SECRET...; chạy thử có thể để trống phần Supabase/SMTP/Google
npm install
npx prisma db push          # tạo bảng theo prisma/schema.prisma
npm run prisma:seed         # nạp dữ liệu mẫu (XÓA dữ liệu cũ) - mật khẩu mọi tài khoản mẫu: vlu@2026
npm run dev                 # http://localhost:5000

# 2. Frontend (cửa sổ dòng lệnh khác)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173 (tự chuyển /api sang backend)
```

Tài khoản mẫu: `chau.lth@vanlanguni.vn` (Admin), `hai.nt@vanlanguni.vn` (GVHD), `bao.vnq@vanlanguni.vn` (Chủ tịch HĐ), `tri.2274802010926@vanlanguni.vn` (Sinh viên).

Chưa cấu hình Supabase Storage thì file báo cáo được lưu tạm ở `backend/uploads/`; chưa cấu hình SMTP thì chỉ có thông báo trong web.

## Kiểm thử

```bash
cd backend
npm run prisma:seed && npm run dev   # nạp lại dữ liệu mẫu rồi chạy máy chủ
npm test                             # cửa sổ khác: kiểm thử API theo các Use Case
```

## Triển khai

1. **Supabase**: tạo project, lấy chuỗi kết nối PostgreSQL; vào Storage tạo bucket **riêng tư** tên `reports`.
2. **Render** (Backend): New > Blueprint, chọn repo (đọc `render.yaml`), điền các biến môi trường theo `backend/.env.example`.
3. **Vercel** (Frontend): Import repo, Root Directory = `frontend`, đặt `VITE_API_URL=https://<backend>.onrender.com/api` và `VITE_GOOGLE_CLIENT_ID`.
4. **Google Cloud Console**: tạo OAuth Client ID (Web), thêm domain Vercel vào *Authorized JavaScript origins*; dùng cùng Client ID cho `GOOGLE_CLIENT_ID` (backend) và `VITE_GOOGLE_CLIENT_ID` (frontend).
5. Đặt `FRONTEND_URL` của backend = domain Vercel để chỉ giao diện của nhóm được gọi API.

> Không commit file `.env`. Mọi khóa bí mật chỉ đặt trong biến môi trường của Render/Vercel.

## Cấu trúc Backend (theo mục 4.2.5 đề cương)

```
backend/
  prisma/        schema.prisma (12 bảng), seed.js, sampleData.mjs
  src/config/       kết nối Prisma, Supabase, cấu hình JWT/Google
  src/controllers/  auth, topic, progress, council, admin
  src/middlewares/  xác thực JWT + phân quyền RBAC
  src/routes/       danh sách API RESTful
  src/services/     Cosine Similarity, thông báo/email, lưu file, nghiệp vụ đề tài
  src/utils/        kiểm tra dữ liệu, băm mật khẩu
  tests/            kiểm thử API
```
