// =========================================================================
// SCRIPT NẠP DỮ LIỆU MẪU VÀO CƠ SỞ DỮ LIỆU POSTGRESQL (PRISMA SEED)
// Chạy lệnh: npm run prisma:seed (trong thư mục backend)
// CẢNH BÁO: Xóa toàn bộ dữ liệu hiện có trước khi nạp dữ liệu mẫu.
// =========================================================================
require('dotenv').config();
const path = require('path');
const { pathToFileURL } = require('url');
const { hashPassword } = require('../src/utils/password');
const { luuTep } = require('../src/services/storageService');

// Mật khẩu dùng chung của các tài khoản mẫu (chỉ để chạy thử, không dùng cho máy chủ thật)
const MAT_KHAU_MAU = process.env.SEED_PASSWORD || 'vlu@2026';

// Lùi thời gian tạo theo thứ tự để bản ghi đầu danh sách hiển thị trước khi sắp xếp "mới nhất trước"
function thoiDiemTheoThuTu(index) {
  return new Date(Date.UTC(2026, 9, 12) - index * 60 * 1000);
}

function dataUrlSangBuffer(dataUrl) {
  return Buffer.from(String(dataUrl).split(',')[1] || '', 'base64');
}

async function napDuLieuMau(prisma) {
  const { INITIAL_DB: db } = await import(pathToFileURL(path.join(__dirname, 'sampleData.mjs')).href);

  // Đẩy các file PDF mẫu lên kho lưu trữ trước, lấy về địa chỉ file để lưu vào bảng documents
  const documents = [];
  for (const { download_url, file_data_url, file_url, ...doc } of db.documents) {
    const fileUrl = file_data_url
      ? await luuTep({
          buffer: dataUrlSangBuffer(file_data_url),
          tenGoc: doc.file_name,
          mimetype: 'application/pdf',
          topicId: doc.topic_id,
        })
      : file_url; // file mẫu không có nội dung thật -> tải xuống sẽ báo "Không tìm thấy tệp"
    documents.push({ ...doc, file_url: fileUrl, created_at: new Date(doc.created_at) });
  }

  const matKhauDaBam = hashPassword(MAT_KHAU_MAU);

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.score.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.document.deleteMany(),
    prisma.topicMember.deleteMany(),
    prisma.councilMember.deleteMany(),
    prisma.topic.deleteMany(),
    prisma.council.deleteMany(),
    prisma.timeline.deleteMany(),
    prisma.user.deleteMany(),
    prisma.category.deleteMany(),

    prisma.category.createMany({ data: db.categories }),
    prisma.user.createMany({ data: db.users.map((u) => ({ ...u, password_hash: matKhauDaBam })) }),
    prisma.timeline.createMany({
      data: db.timelines.map((t) => ({ ...t, start_date: new Date(t.start_date), end_date: new Date(t.end_date) })),
    }),
    prisma.council.createMany({ data: db.councils.map((c) => ({ ...c, created_at: new Date(c.created_at) })) }),
    prisma.councilMember.createMany({ data: db.council_members }),
    prisma.topic.createMany({ data: db.topics.map((t, i) => ({ ...t, created_at: thoiDiemTheoThuTu(i) })) }),
    prisma.topicMember.createMany({ data: db.topic_members }),
    prisma.document.createMany({ data: documents }),
    prisma.task.createMany({ data: db.tasks }),
    prisma.comment.createMany({ data: db.comments.map((c) => ({ ...c, created_at: new Date(c.created_at) })) }),
    prisma.score.createMany({ data: db.scores }),
    prisma.notification.createMany({
      data: db.notifications.map((n, i) => ({ ...n, created_at: thoiDiemTheoThuTu(i) })),
    }),
  ]);
}

module.exports = { napDuLieuMau };

// Khi chạy trực tiếp bằng "node prisma/seed.js"
if (require.main === module) {
  const prisma = require('../src/config/prisma');
  napDuLieuMau(prisma)
    .then(() => console.log(`✅ Đã nạp dữ liệu mẫu. Mật khẩu các tài khoản mẫu: ${MAT_KHAU_MAU}`))
    .catch((err) => {
      console.error('❌ Lỗi nạp dữ liệu mẫu:', err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
