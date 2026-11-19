// ============================================================================
// UC23 - TỰ ĐỘNG GỬI THÔNG BÁO (In-app + Email qua NodeMailer/SMTP)
// ============================================================================
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const prisma = require('../config/prisma');

const THU_MUC_LOG = path.join(__dirname, '../../logs');

// Chỉ tạo bộ gửi mail khi đã cấu hình SMTP trong .env; nếu chưa thì hệ thống chỉ lưu thông báo In-app
const boGuiMail = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

// Luồng thay thế 4a UC23: lỗi SMTP chỉ ghi vào logs/error.log để Admin kiểm tra, không làm gián đoạn người dùng
function ghiLogLoi(noiDung) {
  try {
    fs.mkdirSync(THU_MUC_LOG, { recursive: true });
    fs.appendFileSync(path.join(THU_MUC_LOG, 'error.log'), `[${new Date().toISOString()}] ${noiDung}\n`);
  } catch (err) {
    console.error('Không ghi được error.log:', err.message);
  }
}

async function guiEmail(userIds, noiDung) {
  try {
    const nguoiNhan = await prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: { email: true, full_name: true },
    });
    for (const nguoi of nguoiNhan) {
      await boGuiMail.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: nguoi.email,
        subject: '[NCKH Văn Lang] Thông báo mới từ hệ thống',
        text: `Chào ${nguoi.full_name},\n\n${noiDung}\n\nTrân trọng,\nHệ thống Quản lý NCKH Sinh viên - Khoa CNTT, ĐH Văn Lang`,
      });
    }
  } catch (err) {
    ghiLogLoi(`Lỗi gửi email SMTP: ${err.message}`);
  }
}

// Ghi thông báo In-app (biểu tượng chuông) cho 1 hoặc nhiều người, sau đó gửi email chạy nền.
// `db` có thể là prisma hoặc transaction `tx` để thông báo được lưu cùng lúc với thao tác chính.
async function thongBao(db, userIds, noiDung) {
  const danhSach = [...new Set([].concat(userIds).filter(Boolean))];
  if (danhSach.length === 0) return;
  await db.notification.createMany({
    data: danhSach.map((user_id) => ({ user_id, content: noiDung })),
  });
  // shortcut: email được gửi ngay cả khi transaction sau đó bị hủy; mọi kiểm tra đều chạy trước khi ghi nên hiếm xảy ra
  if (boGuiMail) setImmediate(() => guiEmail(danhSach, noiDung));
}

// Lấy danh sách mã các Quản trị viên Khoa để báo tin
async function layMaAdmin(db) {
  const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { user_id: true } });
  return admins.map((a) => a.user_id);
}

module.exports = { thongBao, layMaAdmin, ghiLogLoi };
