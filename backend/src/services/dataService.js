// ============================================================================
// TỔNG HỢP DỮ LIỆU HIỂN THỊ CHO GIAO DIỆN (thay cho kho dữ liệu LocalStorage cũ)
// Trả về cùng cấu trúc mà các trang React đang dùng: { users, topics, councils, categories, timelines, notifications }
// và lọc bớt dữ liệu theo vai trò (RBAC) để sinh viên không xem được hồ sơ nhóm khác.
// ============================================================================
const prisma = require('../config/prisma');

// Các cột công khai của người dùng (không bao giờ trả về password_hash)
const COT_NGUOI_DUNG = {
  user_id: true,
  email: true,
  full_name: true,
  user_code: true,
  role: true,
  title_info: true,
  department_id: true,
  is_locked: true,
};

async function layDuLieuHeThong(user) {
  const laAdmin = user.role === 'ADMIN';
  const cotNguoiDung = laAdmin ? { ...COT_NGUOI_DUNG, phone: true } : COT_NGUOI_DUNG;

  const [categories, users, timelines, councils, topics, notifications] = await Promise.all([
    prisma.category.findMany({ orderBy: { category_id: 'asc' } }),
    prisma.user.findMany({ select: { ...cotNguoiDung, department: true }, orderBy: { full_name: 'asc' } }),
    prisma.timeline.findMany({ orderBy: { start_date: 'asc' } }),
    prisma.council.findMany({
      orderBy: { created_at: 'desc' },
      include: { council_members: { include: { lecturer: { select: COT_NGUOI_DUNG } } } },
    }),
    prisma.topic.findMany({
      orderBy: [{ created_at: 'desc' }, { topic_id: 'asc' }],
      include: {
        lecturer: { select: COT_NGUOI_DUNG },
        council: true,
        field: true,
        members: { include: { student: { select: COT_NGUOI_DUNG } } },
        documents: { orderBy: { created_at: 'desc' } },
        tasks: true,
        comments: { orderBy: { created_at: 'asc' }, include: { user: { select: COT_NGUOI_DUNG } } },
        scores: { include: { user: { select: COT_NGUOI_DUNG } } },
      },
    }),
    prisma.notification.findMany({ where: { user_id: user.user_id }, orderBy: { created_at: 'desc' } }),
  ]);

  const topicsHienThi = topics.map((t) => {
    // Đường dẫn file nội bộ không gửi ra ngoài; giao diện tải file qua /api/documents/:id/file (có kiểm tra quyền)
    const documents = t.documents.map(({ file_url, ...doc }) => doc);
    if (user.role !== 'STUDENT') return { ...t, documents };

    const laThanhVien = t.members.some((m) => m.student_id === user.user_id);
    if (laThanhVien) return { ...t, documents };
    // Sinh viên chỉ xem thông tin công khai của đề tài nhóm khác (Sàn đề tài), không xem tài liệu/điểm/nhận xét
    return {
      ...t,
      members: t.members.map(({ cover_letter, ...m }) => m),
      documents: [],
      comments: [],
      scores: [],
    };
  });

  return { categories, users, timelines, councils, topics: topicsHienThi, notifications };
}

// Dữ liệu tối thiểu cho Trang chủ khi chưa đăng nhập (không chứa thông tin cá nhân)
async function layDuLieuCongKhai() {
  const [categories, timelines, topics, soGiangVien] = await Promise.all([
    prisma.category.findMany(),
    prisma.timeline.findMany({ orderBy: { start_date: 'asc' } }),
    prisma.topic.findMany({ select: { topic_id: true, status: true } }),
    prisma.user.count({ where: { role: { in: ['LECTURER', 'ADMIN'] } } }),
  ]);
  // HomePage chỉ đếm số giảng viên, nên trả về danh sách rút gọn chỉ có vai trò
  const users = Array.from({ length: soGiangVien }, () => ({ role: 'LECTURER' }));
  return { categories, timelines, topics, users };
}

module.exports = { layDuLieuHeThong, layDuLieuCongKhai, COT_NGUOI_DUNG };
