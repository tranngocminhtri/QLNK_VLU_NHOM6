// ============================================================================
// FILE: backend/src/middlewares/authMiddleware.js
// MỤC ĐÍCH: Kiểm tra "Thẻ từ an ninh" (Token) và Phân quyền theo vai trò (RBAC)
// Giải thích dễ nhớ: Giống như bảo vệ đứng ở cửa phòng Khoa, kiểm tra xem người
// vào có đeo thẻ sinh viên/giảng viên hợp lệ không và có đúng quyền vào phòng đó không.
// ============================================================================

// 1. Hàm kiểm tra người dùng đã đăng nhập hay chưa (Authentication)
function kiemTraDangNhap(req, res, next) {
  // Lấy thông tin thẻ Token từ phần Header 'authorization' mà React gửi lên
  const authHeader = req.headers['authorization'];

  // Nếu không gửi kèm thẻ Token thì chặn lại và báo lỗi 401 (Chưa xác thực)
  if (!authHeader) {
    return res.status(401).json({
      message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập bằng email trường cấp (@vanlanguni.vn).'
    });
  }

  // Cắt bỏ chữ "Bearer " ở đầu để lấy đúng mã Token bên trong
  const token = authHeader.replace('Bearer ', '').trim();

  // Kiểm tra định dạng mã Token của hệ thống (có dạng: jwt_vlu_<userId>_<role>)
  if (!token.startsWith('jwt_vlu_')) {
    return res.status(401).json({
      message: 'Phiên làm việc không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại.'
    });
  }

  // Tách chuỗi Token bằng dấu gạch dưới '_' để lấy mã người dùng (userId) và quyền (role)
  const cacPhan = token.split('_');
  // Gắn thông tin người dùng đã giải mã vào biến req.user để các bước sau sử dụng
  req.user = {
    user_id: cacPhan[2] || '',
    role: cacPhan[3] || 'STUDENT'
  };

  // Cho phép đi tiếp vào hàm xử lý chính (Controller)
  next();
}

// 2. Hàm kiểm tra quyền hạn theo vai trò (Authorization - RBAC)
function kiemTraQuyen(danhSachQuyenChoPhep) {
  // Trả về một hàm kiểm tra trung gian của Express
  return function (req, res, next) {
    // Lấy quyền hiện tại của người dùng đã được giải mã ở bước trên
    const quyenHienTai = req.user ? req.user.role : '';

    // Nếu quyền của người dùng không nằm trong danh sách được phép thì chặn lại (Lỗi 403)
    if (!danhSachQuyenChoPhep.includes(quyenHienTai)) {
      return res.status(403).json({
        message: 'Truy cập bị từ chối! Tài khoản của bạn không có quyền thực hiện chức năng này.'
      });
    }

    // Nếu đúng quyền thì cho phép đi tiếp
    next();
  };
}

// Xuất 2 hàm bảo vệ ra để gắn vào các đường dẫn API (Routes)
module.exports = {
  kiemTraDangNhap,
  kiemTraQuyen
};
