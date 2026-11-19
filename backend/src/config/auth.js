// Cấu hình xác thực: khóa ký JWT, thời hạn phiên và Google OAuth Client ID
const crypto = require('crypto');

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu biến môi trường JWT_SECRET. Không thể chạy máy chủ production.');
  }
  // Chạy thử trên máy cá nhân: tự sinh khóa tạm, mọi phiên đăng nhập mất hiệu lực khi khởi động lại
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  Chưa đặt JWT_SECRET trong .env - đang dùng khóa tạm thời.');
}

module.exports = {
  JWT_SECRET: jwtSecret,
  // Thời hạn tối đa của 1 phiên đăng nhập (Token)
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  // Đuôi email được phép đăng nhập (BR01)
  EMAIL_DOMAIN: '@vanlanguni.vn',
};
