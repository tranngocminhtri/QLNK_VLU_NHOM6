// ============================================================================
// CÁC HÀM NGHIỆP VỤ DÙNG CHUNG CHO ĐỀ TÀI (truy vấn Prisma + kiểm tra quyền theo đề tài)
// ============================================================================
const { ApiError } = require('../utils/apiError');

// Lấy đề tài theo mã, báo lỗi 404 nếu không tồn tại
async function layDeTai(db, topicId) {
  const deTai = await db.topic.findUnique({ where: { topic_id: String(topicId || '') } });
  if (!deTai) throw new ApiError(404, 'Không tìm thấy đề tài.');
  return deTai;
}

// Mã các sinh viên là thành viên chính thức (APPROVED) của đề tài
async function layMaThanhVien(db, topicId) {
  const ds = await db.topicMember.findMany({
    where: { topic_id: topicId, status: 'APPROVED' },
    select: { student_id: true },
  });
  return ds.map((m) => m.student_id);
}

// Rule 2: Đề tài (chưa bị hủy) mà sinh viên đang là thành viên chính thức, nếu có
async function layDeTaiDangThamGia(db, studentId) {
  const banGhi = await db.topicMember.findFirst({
    where: { student_id: studentId, status: 'APPROVED', topic: { status: { not: 'FAILED' } } },
    include: { topic: true },
  });
  return banGhi ? banGhi.topic : null;
}

// Sinh mã đề tài kế tiếp theo năm hiện tại, VD: DT-2026-011
async function taoMaDeTai(db) {
  const tienTo = `DT-${new Date().getFullYear()}-`;
  const ds = await db.topic.findMany({ where: { topic_id: { startsWith: tienTo } }, select: { topic_id: true } });
  const soLonNhat = ds.reduce((max, t) => Math.max(max, Number(t.topic_id.slice(tienTo.length)) || 0), 0);
  return tienTo + String(soLonNhat + 1).padStart(3, '0');
}

// Mở khóa bảng Kanban: tạo các thẻ tiến độ mặc định nếu đề tài chưa có thẻ nào
async function moKhoaKanban(db, topicId, cacTieuDe) {
  const daCo = await db.task.count({ where: { topic_id: topicId } });
  if (daCo > 0) return;
  await db.task.createMany({
    data: cacTieuDe.map((title) => ({ topic_id: topicId, title, status: 'Chờ đánh giá' })),
  });
}

// Vai trò của giảng viên trong Hội đồng chấm đề tài (CHUTICH/THUKY/UYVIEN) hoặc null
async function layVaiTroHoiDong(db, deTai, userId) {
  if (!deTai.council_id) return null;
  const banGhi = await db.councilMember.findFirst({
    where: { council_id: deTai.council_id, lecturer_id: userId },
  });
  return banGhi ? banGhi.role_in_council : null;
}

// Kiểm tra người dùng có liên quan trực tiếp tới đề tài (xem file, chấm điểm...) theo RBAC
async function coQuyenVoiDeTai(db, deTai, user) {
  if (user.role === 'ADMIN') return true;
  if (deTai.lecturer_id === user.user_id) return true;
  if (await layVaiTroHoiDong(db, deTai, user.user_id)) return true;
  const thanhVien = await db.topicMember.findFirst({
    where: { topic_id: deTai.topic_id, student_id: user.user_id, status: 'APPROVED' },
  });
  return Boolean(thanhVien);
}

function chanNeuDaDongBang(deTai) {
  if (deTai.is_frozen || deTai.status === 'COMPLETED') {
    throw new ApiError(400, 'Đề tài này đã chốt nghiệm thu và đóng băng dữ liệu. Không thể chỉnh sửa.');
  }
}

module.exports = {
  layDeTai,
  layMaThanhVien,
  layDeTaiDangThamGia,
  taoMaDeTai,
  moKhoaKanban,
  layVaiTroHoiDong,
  coQuyenVoiDeTai,
  chanNeuDaDongBang,
};
