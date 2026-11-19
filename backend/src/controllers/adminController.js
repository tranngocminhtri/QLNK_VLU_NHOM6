// ============================================================================
// QUẢN TRỊ KHOA (UC13 Timeline, UC17 Danh mục & Tài khoản) + Thông báo
// ============================================================================
const prisma = require('../config/prisma');
const { ApiError, assertValid } = require('../utils/apiError');
const { validateVluEmail, validateTimelineDates } = require('../utils/validators');
const { hashPassword } = require('../utils/password');
const { COT_NGUOI_DUNG } = require('../services/dataService');

const VAI_TRO = ['STUDENT', 'LECTURER', 'ADMIN'];

// POST /api/timelines (tạo) và PUT /api/timelines/:id (sửa) - UC13
async function luuTimeline(req, res) {
  const eventName = String(req.body.event_name || '').trim();
  if (!eventName) throw new ApiError(400, 'Vui lòng nhập tên sự kiện / đợt đăng ký.');
  assertValid(validateTimelineDates(req.body.start_date, req.body.end_date));
  const data = { event_name: eventName, start_date: new Date(req.body.start_date), end_date: new Date(req.body.end_date) };

  if (req.params.id) {
    await prisma.timeline.update({ where: { timeline_id: req.params.id }, data });
  } else {
    await prisma.timeline.create({ data });
  }
  return res.json({ message: 'Đã lưu cấu hình mốc thời gian (Timeline) thành công!' });
}

async function xoaTimeline(req, res) {
  await prisma.timeline.delete({ where: { timeline_id: req.params.id } });
  return res.json({ message: 'Đã xóa mốc thời gian.' });
}

// POST /api/categories - UC17 (luồng 4a: chặn trùng tên danh mục)
async function taoDanhMuc(req, res) {
  const name = String(req.body.name || '').trim();
  if (!name) throw new ApiError(400, 'Vui lòng nhập tên danh mục.');
  if (name.length > 255) throw new ApiError(400, 'Tên danh mục quá dài (tối đa 255 ký tự).');
  const type = req.body.type === 'FIELD' ? 'FIELD' : 'MAJOR';
  const trung = await prisma.category.findFirst({ where: { type, name: { equals: name, mode: 'insensitive' } } });
  if (trung) throw new ApiError(400, 'Tên danh mục đã tồn tại.');
  const category = await prisma.category.create({ data: { name, type } });
  return res.status(201).json({ category, message: 'Đã thêm danh mục mới thành công!' });
}

async function xoaDanhMuc(req, res) {
  await prisma.category.delete({ where: { category_id: req.params.id } });
  return res.json({ message: 'Đã xóa danh mục.' });
}

async function timNguoiDung(userId) {
  const user = await prisma.user.findUnique({ where: { user_id: userId }, select: COT_NGUOI_DUNG });
  if (!user) throw new ApiError(404, 'Không tìm thấy tài khoản người dùng.');
  return user;
}

// PUT /api/users/:id/lock - UC17: Khóa / mở khóa tài khoản
async function khoaTaiKhoan(req, res) {
  const user = await timNguoiDung(req.params.id);
  if (user.role === 'ADMIN') throw new ApiError(400, 'Không thể khóa tài khoản Quản trị viên Khoa.');
  const capNhat = await prisma.user.update({
    where: { user_id: user.user_id },
    data: { is_locked: !user.is_locked },
    select: COT_NGUOI_DUNG,
  });
  return res.json({
    user: capNhat,
    message: capNhat.is_locked ? `Đã khóa tài khoản ${capNhat.full_name}.` : `Đã mở khóa tài khoản ${capNhat.full_name}.`,
  });
}

// POST /api/users - Admin cấp tài khoản mới (mật khẩu ban đầu được băm trước khi lưu)
async function taoTaiKhoan(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const fullName = String(req.body.full_name || '').trim();
  const userCode = String(req.body.user_code || '').trim();
  assertValid(validateVluEmail(email));
  if (!fullName) throw new ApiError(400, 'Vui lòng nhập họ và tên người dùng.');
  if (!userCode) throw new ApiError(400, 'Vui lòng nhập Mã số (MSSV hoặc Mã Giảng viên).');
  const role = VAI_TRO.includes(req.body.role) ? req.body.role : 'STUDENT';

  if (await prisma.user.findUnique({ where: { email } })) {
    throw new ApiError(400, `Email "${email}" đã tồn tại trong hệ thống.`);
  }
  if (await prisma.user.findFirst({ where: { user_code: { equals: userCode, mode: 'insensitive' } } })) {
    throw new ApiError(400, `Mã số "${userCode}" đã tồn tại trong hệ thống.`);
  }

  // Không nhập mật khẩu -> tài khoản chỉ đăng nhập được bằng Google SSO
  const matKhau = String(req.body.password || '');
  if (matKhau && matKhau.length < 8) throw new ApiError(400, 'Mật khẩu ban đầu phải có ít nhất 8 ký tự.');

  const user = await prisma.user.create({
    data: {
      email,
      full_name: fullName,
      user_code: userCode,
      phone: String(req.body.phone || '').trim(),
      role,
      department_id: req.body.department_id || null,
      password_hash: matKhau ? hashPassword(matKhau) : '',
    },
    select: COT_NGUOI_DUNG,
  });
  return res.status(201).json({ user, message: `Đã tạo tài khoản "${user.full_name}" (${user.role}) thành công!` });
}

// PUT /api/users/:id/role - Đổi vai trò tài khoản
async function doiVaiTro(req, res) {
  const role = req.body.role;
  if (!VAI_TRO.includes(role)) throw new ApiError(400, 'Vai trò phân quyền không hợp lệ.');
  const user = await timNguoiDung(req.params.id);
  if (user.user_id === req.user.user_id && role !== 'ADMIN') {
    throw new ApiError(400, 'Bạn không thể tự hạ quyền Quản trị viên của chính tài khoản đang đăng nhập.');
  }
  const capNhat = await prisma.user.update({ where: { user_id: user.user_id }, data: { role }, select: COT_NGUOI_DUNG });
  return res.json({ user: capNhat, message: `Đã cập nhật vai trò của "${capNhat.full_name}" thành ${role}.` });
}

// DELETE /api/users/:id - Xóa vĩnh viễn tài khoản; dữ liệu liên quan được CSDL xóa theo (ON DELETE CASCADE)
async function xoaTaiKhoan(req, res) {
  const user = await timNguoiDung(req.params.id);
  if (user.user_id === req.user.user_id) {
    throw new ApiError(400, 'Không thể tự xóa tài khoản Quản trị viên đang đăng nhập hiện tại.');
  }
  await prisma.$transaction(async (tx) => {
    // Đề tài đang chờ giảng viên này xác nhận được trả về Khoa để phân công người khác
    await tx.topic.updateMany({
      where: { lecturer_id: user.user_id, status: 'PENDING_LECTURER' },
      data: { status: 'PENDING_ADMIN' },
    });
    await tx.user.delete({ where: { user_id: user.user_id } });
  });
  return res.json({ message: `Đã xóa vĩnh viễn tài khoản "${user.full_name}" (${user.email}) khỏi hệ thống!` });
}

// PUT /api/notifications/read - UC23: Đánh dấu đã đọc toàn bộ thông báo của chính mình
async function danhDauDaDoc(req, res) {
  await prisma.notification.updateMany({ where: { user_id: req.user.user_id, is_read: false }, data: { is_read: true } });
  return res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
}

// POST /api/admin/reset-sample-data - Nạp lại dữ liệu mẫu để kiểm thử
// Xóa TOÀN BỘ dữ liệu, nên chỉ bật khi .env có ALLOW_SAMPLE_RESET=true (không bật trên máy chủ thật)
async function napLaiDuLieuMau(req, res) {
  if (process.env.ALLOW_SAMPLE_RESET !== 'true') {
    throw new ApiError(403, 'Chức năng khôi phục dữ liệu mẫu đang tắt trên máy chủ này (ALLOW_SAMPLE_RESET).');
  }
  const { napDuLieuMau } = require('../../prisma/seed');
  await napDuLieuMau(prisma);
  return res.json({ message: 'Đã khôi phục toàn bộ dữ liệu mẫu ban đầu thành công!' });
}

module.exports = {
  luuTimeline,
  xoaTimeline,
  taoDanhMuc,
  xoaDanhMuc,
  khoaTaiKhoan,
  taoTaiKhoan,
  doiVaiTro,
  xoaTaiKhoan,
  danhDauDaDoc,
  napLaiDuLieuMau,
};
