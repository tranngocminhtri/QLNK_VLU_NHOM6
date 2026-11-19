// Nạp các biến môi trường từ file .env (DATABASE_URL, JWT_SECRET, SUPABASE_URL, ...) vào hệ thống
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const prisma = require('./src/config/prisma');
const apiRoutes = require('./src/routes/apiRoutes');
const { ghiLogLoi } = require('./src/services/notificationService');

const app = express();

// Chỉ cho phép giao diện React (Vercel) gọi API; để trống FRONTEND_URL thì cho phép mọi nguồn (chạy thử cục bộ)
const nguonChoPhep = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(nguonChoPhep.length ? { origin: nguonChoPhep } : undefined));
app.use(express.json({ limit: '1mb' }));

// Kiểm tra sức khỏe máy chủ (Render dùng đường dẫn này để biết máy chủ còn sống)
app.get('/api/health', function (req, res) {
  res.json({ success: true, message: 'Máy chủ Quản lý NCKH Sinh viên Văn Lang đang hoạt động ổn định!' });
});

app.use('/api', apiRoutes);

// Khi chạy chung 1 máy chủ: phục vụ luôn giao diện React đã build tại ../frontend/dist
const thuMucFrontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(thuMucFrontendDist)) {
  app.use(express.static(thuMucFrontendDist));
  app.use(function (req, res, next) {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(thuMucFrontendDist, 'index.html'));
    }
    return next();
  });
}

app.use('/api', function (req, res) {
  res.status(404).json({ message: 'Không tìm thấy đường dẫn API.' });
});

// Bộ xử lý lỗi chung: chuyển mọi lỗi nghiệp vụ / CSDL thành JSON { message } cho giao diện
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Chỉ hỗ trợ file PDF/DOCX dưới 20MB.' });
  }
  if (err.code === 'P2025') return res.status(404).json({ message: 'Không tìm thấy dữ liệu cần thao tác.' });
  if (err.code === 'P2002') return res.status(400).json({ message: 'Dữ liệu bị trùng lặp với bản ghi đã có.' });
  if (err.code === 'P2003') return res.status(400).json({ message: 'Dữ liệu liên kết không hợp lệ.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không đúng định dạng JSON.' });

  console.error(err);
  ghiLogLoi(`${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
  return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau.' });
});

const CONG_MAY_CHU = process.env.PORT || 5000;

prisma
  .$connect()
  .then(() => console.log('✅ Đã kết nối thành công với cơ sở dữ liệu PostgreSQL!'))
  .catch((err) => console.error('❌ Không kết nối được cơ sở dữ liệu:', err.message));

app.listen(CONG_MAY_CHU, function () {
  console.log('🚀 Máy chủ Quản lý NCKH đang hoạt động tại: http://localhost:' + CONG_MAY_CHU);
});
