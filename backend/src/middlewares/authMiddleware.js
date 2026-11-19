// ============================================================================
// FILE: backend/src/middlewares/authMiddleware.js
// MỤC ĐÍCH: Kiểm tra "Thẻ từ an ninh" (JWT) và Phân quyền theo vai trò (RBAC)
// Giải thích dễ nhớ: Giống như bảo vệ đứng ở cửa phòng Khoa, kiểm tra xem người
// vào có đeo thẻ hợp lệ (chữ ký JWT đúng, chưa hết hạn) và có đúng quyền vào phòng đó không.
// ============================================================================
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/auth');

// Danh sách đen các Token đã đăng xuất (UC02 bước 3): mã jti -> thời điểm hết hạn
// shortcut: lưu trong RAM nên mất khi khởi động lại máy chủ; chuyển sang bảng CSDL/Redis nếu chạy nhiều máy chủ
const tokenDaThuHoi = new Map();

// Cấp thẻ JWT chứa mã người dùng và vai trò sau khi đăng nhập thành công (UC01 bước 6)
function capToken(user) {
  return jwt.sign({ sub: user.user_id, role: user.role, jti: crypto.randomUUID() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Vô hiệu hóa Token hiện tại khi người dùng đăng xuất
function thuHoiToken(payload) {
  const bayGio = Date.now() / 1000;
  for (const [jti, exp] of tokenDaThuHoi) if (exp < bayGio) tokenDaThuHoi.delete(jti);
  tokenDaThuHoi.set(payload.jti, payload.exp);
}

// 1. Kiểm tra người dùng đã đăng nhập hay chưa (Authentication)
async function kiemTraDangNhap(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({
      message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập bằng email trường cấp (@vanlanguni.vn).',
    });
  }

  let payload;
  try {
    // Xác minh chữ ký và thời hạn của thẻ; thẻ bị sửa hoặc hết hạn sẽ ném lỗi
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.' });
  }
  if (tokenDaThuHoi.has(payload.jti)) {
    return res.status(401).json({ message: 'Phiên làm việc đã kết thúc, vui lòng đăng nhập lại.' });
  }

  // Luôn đọc vai trò mới nhất từ CSDL để việc Admin đổi quyền / khóa tài khoản có hiệu lực ngay
  const user = await prisma.user.findUnique({
    where: { user_id: payload.sub },
    include: { department: true },
  });
  if (!user || user.is_locked) {
    return res.status(401).json({
      message: 'Tài khoản không tồn tại hoặc đã bị khóa bởi Quản trị viên Khoa.',
    });
  }

  delete user.password_hash;
  req.user = user;
  req.tokenPayload = payload;
  return next();
}

// 2. Kiểm tra quyền hạn theo vai trò (Authorization - RBAC)
function kiemTraQuyen(danhSachQuyenChoPhep) {
  return function (req, res, next) {
    if (!req.user || !danhSachQuyenChoPhep.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Truy cập bị từ chối! Tài khoản của bạn không có quyền thực hiện chức năng này.',
      });
    }
    return next();
  };
}

module.exports = { capToken, thuHoiToken, kiemTraDangNhap, kiemTraQuyen };
