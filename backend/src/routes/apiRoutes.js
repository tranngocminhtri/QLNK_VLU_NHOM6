// ============================================================================
// ĐỊNH TUYẾN API RESTful (Bảng 4.2.5 trong đề cương + các API quản trị bổ sung)
// Mỗi đường dẫn đi qua: kiểm tra đăng nhập (JWT) -> kiểm tra vai trò (RBAC) -> Controller
// ============================================================================
const express = require('express');
const multer = require('multer');
const { kiemTraDangNhap, kiemTraQuyen } = require('../middlewares/authMiddleware');
const auth = require('../controllers/authController');
const topic = require('../controllers/topicController');
const progress = require('../controllers/progressController');
const council = require('../controllers/councilController');
const admin = require('../controllers/adminController');

const router = express.Router();

// Nhận file báo cáo vào RAM (tối đa 20MB - BR03) trước khi đẩy lên Supabase Storage
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const chiAdmin = [kiemTraDangNhap, kiemTraQuyen(['ADMIN'])];

// ---------------- NHÓM 1: XÁC THỰC & HỒ SƠ (UC01, UC02, UC03) ----------------
router.get('/public/overview', auth.layTongQuanCongKhai);
router.post('/auth/google', auth.dangNhapGoogle); // [1] UC01 - SSO Google Workspace
router.post('/auth/login', auth.dangNhapMatKhau); // [1] UC01 - Email trường + mật khẩu (dự phòng)
router.post('/auth/logout', kiemTraDangNhap, auth.dangXuat); // [2] UC02
router.get('/users/profile', kiemTraDangNhap, auth.xemHoSo); // [3] UC03
router.put('/users/profile', kiemTraDangNhap, auth.capNhatHoSo); // [4] UC03
router.get('/data', kiemTraDangNhap, auth.layDuLieu); // Dữ liệu tổng hợp cho giao diện (lọc theo vai trò)

// ---------------- NHÓM 2: ĐỀ TÀI (UC04, UC05, UC08, UC09, UC10, UC14, UC15, UC22) ----------------
router.get('/topics', kiemTraDangNhap, topic.danhSachDeTai); // [5] UC05
router.post('/topics', kiemTraDangNhap, kiemTraQuyen(['STUDENT', 'LECTURER']), topic.taoDeTai); // [6] UC04, UC08, UC22
router.post('/topics/:id/apply', kiemTraDangNhap, kiemTraQuyen(['STUDENT']), topic.ungTuyen); // [7] UC05
router.put('/topics/:id/approve', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), topic.duyetUngVien); // [8] UC09
router.put('/topics/:id/assign', ...chiAdmin, topic.khoaDuyetVaPhanCong); // [9] UC14, UC15
router.put('/topics/:id/confirm', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), topic.gvXacNhanPhanCong); // UC10

// ---------------- NHÓM 3: TÀI LIỆU, TIẾN ĐỘ, ĐIỂM QUÁ TRÌNH (UC06, UC11, UC12) ----------------
router.post('/documents/upload', kiemTraDangNhap, kiemTraQuyen(['STUDENT']), upload.single('file'), progress.nopTaiLieu); // [10] UC06
router.get('/documents/:id/file', kiemTraDangNhap, progress.taiTep); // UC07, UC11, UC19 - xem/tải file có kiểm tra quyền
router.post('/tasks', kiemTraDangNhap, progress.taoThe);
router.put('/tasks/:id', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), progress.capNhatThe); // [11] UC11
router.post('/topics/:id/comments', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), progress.themBinhLuan); // UC11
router.post('/scores/process', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), progress.chotDiemQuaTrinh); // [12] UC12

// ---------------- NHÓM 4: HỘI ĐỒNG KHOA HỌC (UC16, UC20, UC21) ----------------
router.post('/councils', ...chiAdmin, council.thanhLapHoiDong); // [13] UC16
router.put('/councils/:id/topics', ...chiAdmin, council.ganDeTaiVaoHoiDong); // UC16
router.post('/scores/council', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), council.chamDiemBaoVe); // [14] UC20
router.put('/topics/:id/finalize', kiemTraDangNhap, kiemTraQuyen(['LECTURER', 'ADMIN']), council.chotNghiemThu); // [15] UC21

// ---------------- NHÓM 5: QUẢN TRỊ KHOA (UC13, UC17) & THÔNG BÁO (UC23) ----------------
router.post('/timelines', ...chiAdmin, admin.luuTimeline);
router.put('/timelines/:id', ...chiAdmin, admin.luuTimeline);
router.delete('/timelines/:id', ...chiAdmin, admin.xoaTimeline);
router.post('/categories', ...chiAdmin, admin.taoDanhMuc);
router.delete('/categories/:id', ...chiAdmin, admin.xoaDanhMuc);
router.post('/users', ...chiAdmin, admin.taoTaiKhoan);
router.put('/users/:id/role', ...chiAdmin, admin.doiVaiTro);
router.put('/users/:id/lock', ...chiAdmin, admin.khoaTaiKhoan);
router.delete('/users/:id', ...chiAdmin, admin.xoaTaiKhoan);
router.post('/admin/reset-sample-data', ...chiAdmin, admin.napLaiDuLieuMau);
router.put('/notifications/read', kiemTraDangNhap, admin.danhDauDaDoc);

module.exports = router;
