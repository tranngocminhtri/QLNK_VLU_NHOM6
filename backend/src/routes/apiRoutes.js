// Nhập thư viện express để tạo bộ định tuyến (Router) quản lý các đường dẫn API
const express = require('express');
// Khởi tạo đối tượng router từ thư viện express
const router = express.Router();
// Nhập thư viện multer để hỗ trợ nhận file đính kèm (PDF, DOCX) từ người dùng gửi lên
const multer = require('multer');

// Cấu hình multer lưu trữ file tạm thời trên bộ nhớ RAM trước khi đẩy lên đám mây Supabase Storage
const boNhoTam = multer.memoryStorage();
// Khởi tạo công cụ upload với giới hạn dung lượng tối đa là 20MB (20 * 1024 * 1024 bytes) theo quy tắc BR03
const congCuUpload = multer({
  // Gắn bộ nhớ tạm đã cấu hình ở trên vào công cụ upload
  storage: boNhoTam,
  // Thiết lập giới hạn kích thước tệp tin tải lên
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Nhập các hàm kiểm tra đăng nhập và phân quyền RBAC từ file authMiddleware.js
const { kiemTraDangNhap, kiemTraQuyen } = require('../middlewares/authMiddleware');
// Nhập toàn bộ 15 hàm xử lý nghiệp vụ từ file apiController.js
const apiController = require('../controllers/apiController');

// =========================================================================
// NHÓM 1: ĐỊNH TUYẾN XÁC THỰC & TÀI KHOẢN CÁ NHÂN (UC01, UC02, UC03)
// =========================================================================

// Đường dẫn số 1: Đăng nhập hệ thống và nhận mã Token JWT (UC01)
router.post('/auth/login', apiController.dangNhapHeThong);

// Đường dẫn số 2: Đăng xuất khỏi hệ thống (UC02) - yêu cầu đã đăng nhập
router.post('/auth/logout', kiemTraDangNhap, apiController.dangXuatHeThong);

// Đường dẫn số 3: Xem thông tin hồ sơ cá nhân của chính mình (UC03)
router.get('/users/profile', kiemTraDangNhap, apiController.xemHoSoCaNhan);

// Đường dẫn số 4: Cập nhật số điện thoại và thông tin cá nhân (UC03)
router.put('/users/profile', kiemTraDangNhap, apiController.capNhatHoSoCaNhan);

// Đường dẫn quản trị: Quản trị viên Khoa (ADMIN) xóa vĩnh viễn tài khoản người dùng
router.delete(
  '/users/:id',
  kiemTraDangNhap,
  kiemTraQuyen(['ADMIN']),
  apiController.xoaTaiKhoanNguoiDung
);

// =========================================================================
// NHÓM 2: ĐỊNH TUYẾN QUẢN LÝ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC (UC04, UC05, UC08, UC09, UC10, UC14, UC15, UC22)
// =========================================================================

// Đường dẫn số 5: Lấy danh sách đề tài NCKH kèm bộ lọc trạng thái và từ khóa (UC05)
router.get('/topics', apiController.layDanhSachDeTai);

// Đường dẫn số 6: Đăng ký hoặc đề xuất đề tài mới kèm kiểm tra trùng lặp Cosine Similarity (UC04, UC08, UC22)
router.post(
  '/topics',
  kiemTraDangNhap,
  kiemTraQuyen(['STUDENT', 'LECTURER', 'ADMIN']),
  apiController.taoDeTaiMoi
);

// Đường dẫn số 7: Sinh viên ứng tuyển xin tham gia đề tài do Giảng viên đề xuất (UC05)
router.post(
  '/topics/:id/apply',
  kiemTraDangNhap,
  kiemTraQuyen(['STUDENT']),
  apiController.ungTuyenDeTai
);

// Đường dẫn số 8: Giảng viên duyệt hoặc từ chối sinh viên vào nhóm nghiên cứu (UC09)
router.put(
  '/topics/:id/approve',
  kiemTraDangNhap,
  kiemTraQuyen(['LECTURER', 'ADMIN']),
  apiController.duyetUngVienVaChotNhom
);

// Đường dẫn số 9: Quản lý Khoa xét duyệt thuyết minh đề tài và phân công Giảng viên hướng dẫn (UC10, UC14, UC15)
router.put(
  '/topics/:id/assign',
  kiemTraDangNhap,
  kiemTraQuyen(['ADMIN', 'LECTURER']),
  apiController.phanCongGiangVien
);

// =========================================================================
// NHÓM 3: ĐỊNH TUYẾN QUẢN LÝ TIẾN ĐỘ KANBAN, TÀI LIỆU & CHẤM ĐIỂM QUÁ TRÌNH (UC06, UC11, UC12)
// =========================================================================

// Đường dẫn số 10: Sinh viên tải tệp báo cáo (.pdf, .docx) lên máy chủ và đám mây Supabase Storage (UC06)
router.post(
  '/documents/upload',
  kiemTraDangNhap,
  congCuUpload.single('file'),
  apiController.nopTaiLieuBaoCao
);

// Đường dẫn tải xuống trực tiếp tệp báo cáo vật lý về máy tính người dùng
router.get('/documents/download/:filename', apiController.taiXuongTaiLieu);

// Đường dẫn số 11: Cập nhật trạng thái thẻ công việc trên bảng tiến độ Kanban (UC11)
router.put('/tasks/:id', kiemTraDangNhap, apiController.capNhatTienDoKanban);

// Đường dẫn số 12: Giảng viên hướng dẫn chấm điểm quá trình theo các tiêu chí rubric (UC12)
router.post(
  '/scores/process',
  kiemTraDangNhap,
  kiemTraQuyen(['LECTURER', 'ADMIN']),
  apiController.chotDiemQuaTrinh
);

// =========================================================================
// NHÓM 4: ĐỊNH TUYẾN HỘI ĐỒNG NGHIỆM THU & CÔNG BỐ KẾT QUẢ (UC16, UC20, UC21)
// =========================================================================

// Đường dẫn số 13: Quản lý Khoa thành lập Hội đồng nghiệm thu và gán thành viên (UC16)
router.post(
  '/councils',
  kiemTraDangNhap,
  kiemTraQuyen(['ADMIN']),
  apiController.thanhLapHoiDong
);

// Đường dẫn số 14: Thành viên Hội đồng chấm điểm nghiệm thu độc lập (UC20)
router.post(
  '/scores/council',
  kiemTraDangNhap,
  kiemTraQuyen(['COUNCIL', 'LECTURER', 'ADMIN']),
  apiController.hoiDongChamDiem
);

// Đường dẫn số 15: Tự động tính điểm trung bình cộng và chốt kết quả nghiệm thu cuối cùng (UC21)
router.put(
  '/topics/:id/finalize',
  kiemTraDangNhap,
  kiemTraQuyen(['ADMIN', 'LECTURER', 'COUNCIL']),
  apiController.chotNghiemThuDeTai
);

// Xuất đối tượng router ra ngoài để file index.js chính của Backend sử dụng
module.exports = router;
