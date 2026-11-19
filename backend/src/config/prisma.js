// Một kết nối Prisma dùng chung cho toàn bộ Backend (tránh mở quá nhiều kết nối tới PostgreSQL)
const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient();
