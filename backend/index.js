// Nạp các biến môi trường từ file .env (như DATABASE_URL, SUPABASE_URL, PORT) vào hệ thống
require('dotenv').config();

// Gọi thư viện path và fs để quản lý thư mục chứa file báo cáo và giao diện web
const path = require('path');
const fs = require('fs');

// Gọi thư viện express để tạo máy chủ (giống như xây một quầy tiếp tân)
const express = require('express');

// Gọi thư viện cors để cho phép giao diện React gửi yêu cầu sang Backend
const cors = require('cors');

// Gọi Prisma để nói chuyện với Database (giống như thuê phiên dịch viên tiếng cơ sở dữ liệu)
const { PrismaClient } = require('@prisma/client');

// Gọi bộ định tuyến chứa toàn bộ đường dẫn API chuẩn RESTful của hệ thống
const apiRoutes = require('./src/routes/apiRoutes');

// Khởi tạo máy chủ và phiên dịch viên
const app = express();
// Khởi tạo đối tượng kết nối cơ sở dữ liệu thông qua Prisma Client
const prisma = new PrismaClient();

// Đảm bảo thư mục lưu trữ file báo cáo vật lý (uploads) luôn tồn tại
const thuMucUploads = path.join(__dirname, 'uploads');
if (!fs.existsSync(thuMucUploads)) {
  fs.mkdirSync(thuMucUploads, { recursive: true });
}

// Bật tính năng CORS để trình duyệt không chặn các yêu cầu từ giao diện Frontend
app.use(cors());

// Bật tính năng đọc dữ liệu định dạng JSON với giới hạn 25MB để hỗ trợ tải tài liệu lớn
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Phục vụ trực tiếp các tệp báo cáo PDF / DOCX đã tải lên tại đường dẫn /uploads
app.use('/uploads', express.static(thuMucUploads));

// Tạo đường dẫn kiểm tra sức khỏe máy chủ tại địa chỉ GET /api/health
app.get('/api/health', function (req, res) {
  // Trả về mã 200 kèm thông báo xác nhận máy chủ đang hoạt động tốt
  return res.status(200).json({
    // Đánh dấu trạng thái thành công
    success: true,
    // Tin nhắn phản hồi tiếng Việt rõ ràng
    message: 'Máy chủ Quản lý NCKH Sinh viên Văn Lang đang hoạt động ổn định!',
  });
});

// Gắn toàn bộ các đường dẫn API nghiệp vụ vào tiền tố gốc /api
app.use('/api', apiRoutes);

// Phục vụ trực tiếp giao diện Website (Frontend đã đóng gói tại ../frontend/dist) trên cùng 1 đường link duy nhất
const thuMucFrontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(thuMucFrontendDist)) {
  app.use(express.static(thuMucFrontendDist));
  app.use(function (req, res, next) {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(thuMucFrontendDist, 'index.html'));
    }
    return next();
  });
}

// Viết một hàm thử gõ cửa kho dữ liệu
async function checkDatabase() {
  try {
    // Yêu cầu Prisma thử kết nối vào Supabase
    await prisma.$connect();
    // In thông báo kết nối thành công ra màn hình Terminal
    console.log("✅ Tuyệt vời! Đã kết nối thành công với cơ sở dữ liệu Supabase!");
  } catch (error) {
    // Nếu sai link hoặc sai mật khẩu sẽ văng ra báo lỗi ở đây
    console.log("ℹ️ Máy chủ đang vận hành với kho lưu trữ trực tiếp. Chi tiết CSDL:", error.message);
  }
}

// Chạy hàm kiểm tra ngay khi file này được gọi
checkDatabase();

// Lấy cổng chạy máy chủ từ biến môi trường PORT, nếu không có thì mặc định dùng cổng 5000
const CONG_MAY_CHU = process.env.PORT || 5000;

// Mở cửa quầy tiếp tân ở cổng số 5000 để phục vụ cả Giao diện Web + API + Xem/Tải File trên 1 link duy nhất
app.listen(CONG_MAY_CHU, function () {
  // Hiển thị đường dẫn máy chủ đang chạy trên cửa sổ dòng lệnh
  console.log("🚀 Website & Máy chủ Quản lý NCKH đang hoạt động tại: http://localhost:" + CONG_MAY_CHU);
});
