// ============================================================================
// UC01, UC02, UC03 - XÁC THỰC & HỒ SƠ CÁ NHÂN
// ============================================================================
const prisma = require('../config/prisma');
const { GOOGLE_CLIENT_ID, EMAIL_DOMAIN } = require('../config/auth');
const { capToken, thuHoiToken } = require('../middlewares/authMiddleware');
const { verifyPassword } = require('../utils/password');
const { ApiError, assertValid } = require('../utils/apiError');
const { validateVluEmail, validatePhone } = require('../utils/validators');
const { layDuLieuHeThong, layDuLieuCongKhai } = require('../services/dataService');

const THONG_BAO_TU_CHOI_EMAIL = 'Truy cập bị từ chối. Vui lòng dùng email do trường cấp (@vanlanguni.vn).';

function chanNeuBiKhoa(user) {
  if (user.is_locked) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa bởi Quản trị viên Khoa. Vui lòng liên hệ Giáo vụ Khoa CNTT.');
  }
}

function phanHoiDangNhap(res, user) {
  const { password_hash, ...thongTin } = user;
  return res.json({ token: capToken(user), user: thongTin, message: 'Đăng nhập thành công!' });
}

// POST /api/auth/google - UC01: Đăng nhập một chạm bằng tài khoản Google Workspace của trường
async function dangNhapGoogle(req, res) {
  if (!GOOGLE_CLIENT_ID) {
    throw new ApiError(501, 'Máy chủ chưa cấu hình Google SSO (GOOGLE_CLIENT_ID).');
  }
  const credential = String(req.body.credential || '');
  if (!credential) throw new ApiError(400, 'Thiếu mã xác thực từ Google.');

  // Bước 4-5: Nhờ Google xác minh chữ ký và thời hạn của ID Token
  const phanHoi = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const thongTin = await phanHoi.json().catch(() => ({}));
  const hopLe =
    phanHoi.ok &&
    thongTin.aud === GOOGLE_CLIENT_ID &&
    ['accounts.google.com', 'https://accounts.google.com'].includes(thongTin.iss) &&
    thongTin.email_verified === 'true';
  if (!hopLe) throw new ApiError(401, 'Xác thực Google không thành công, vui lòng thử lại.');

  // Luồng thay thế 3a: chặn email cá nhân (@gmail.com...)
  const email = String(thongTin.email).toLowerCase();
  if (!email.endsWith(EMAIL_DOMAIN)) throw new ApiError(403, THONG_BAO_TU_CHOI_EMAIL);

  let user = await prisma.user.findUnique({ where: { email }, include: { department: true } });

  // Luồng thay thế 5a: đăng nhập lần đầu -> tự tạo tài khoản với quyền Sinh viên mặc định
  if (!user) {
    const phanTen = email.split('@')[0];
    const maTuEmail = (phanTen.match(/\d{6,}/) || [phanTen])[0];
    const daTrungMa = await prisma.user.findUnique({ where: { user_code: maTuEmail } });
    user = await prisma.user.create({
      data: {
        email,
        full_name: thongTin.name || phanTen,
        user_code: daTrungMa ? phanTen : maTuEmail,
        role: 'STUDENT',
      },
      include: { department: true },
    });
  }

  chanNeuBiKhoa(user);
  return phanHoiDangNhap(res, user);
}

// POST /api/auth/login - Đăng nhập bằng email trường + mật khẩu (mật khẩu được kiểm tra qua mã băm scrypt)
async function dangNhapMatKhau(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  assertValid(validateVluEmail(email));

  const user = await prisma.user.findUnique({ where: { email }, include: { department: true } });
  if (!user) {
    throw new ApiError(403, 'Tài khoản chưa được cấp phép trên hệ thống. Vui lòng đăng nhập bằng Google hoặc liên hệ Quản trị viên Khoa.');
  }
  chanNeuBiKhoa(user);
  if (!verifyPassword(req.body.password || '', user.password_hash)) {
    throw new ApiError(401, 'Email hoặc mật khẩu không đúng.');
  }
  return phanHoiDangNhap(res, user);
}

// POST /api/auth/logout - UC02: vô hiệu hóa Token hiện tại
async function dangXuat(req, res) {
  thuHoiToken(req.tokenPayload);
  return res.json({ message: 'Đăng xuất thành công' });
}

// GET /api/users/profile - UC03: Xem hồ sơ của chính mình
async function xemHoSo(req, res) {
  return res.json(req.user);
}

// PUT /api/users/profile - UC03: Cập nhật họ tên, số điện thoại, chuyên ngành
async function capNhatHoSo(req, res) {
  const fullName = String(req.body.full_name || '').trim();
  const phone = String(req.body.phone || '').trim();
  assertValid(validatePhone(phone));
  if (!fullName) throw new ApiError(400, 'Dữ liệu không hợp lệ: Họ và tên không được để trống.');

  const { password_hash, ...user } = await prisma.user.update({
    where: { user_id: req.user.user_id },
    data: { full_name: fullName, phone, department_id: req.body.department_id || req.user.department_id },
    include: { department: true },
  });
  return res.json({ user, message: 'Cập nhật thành công' });
}

// GET /api/data - Toàn bộ dữ liệu giao diện cần, đã lọc theo vai trò người dùng
async function layDuLieu(req, res) {
  return res.json(await layDuLieuHeThong(req.user));
}

// GET /api/public/overview - Số liệu tổng quan cho Trang chủ (chưa đăng nhập)
async function layTongQuanCongKhai(req, res) {
  return res.json(await layDuLieuCongKhai());
}

module.exports = {
  dangNhapGoogle,
  dangNhapMatKhau,
  dangXuat,
  xemHoSo,
  capNhatHoSo,
  layDuLieu,
  layTongQuanCongKhai,
};
