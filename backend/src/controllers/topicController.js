// ============================================================================
// QUẢN LÝ ĐỀ TÀI (UC04, UC05, UC08, UC09, UC10, UC14, UC15, UC22)
// ============================================================================
const prisma = require('../config/prisma');
const { ApiError } = require('../utils/apiError');
const { checkTopicSimilarity } = require('../services/similarity');
const { thongBao, layMaAdmin } = require('../services/notificationService');
const {
  layDeTai,
  layMaThanhVien,
  layDeTaiDangThamGia,
  taoMaDeTai,
  moKhoaKanban,
} = require('../services/topicService');

// Số đề tài tối đa một GVHD nên nhận trước khi hệ thống cảnh báo mềm (UC15 1a)
const GIOI_HAN_DE_TAI_GVHD = 5;

const KANBAN_SAU_KHI_KHOA_DUYET = [
  'Tuần 1-2: Hoàn thiện đề cương chi tiết & Kế hoạch thực hiện',
  'Tuần 3-7: Xây dựng sản phẩm & Báo cáo tiến độ định kỳ',
];
const KANBAN_SAU_KHI_GVHD_NHAN = [
  'Tuần 1-2: Nộp đề cương chi tiết & Lập kế hoạch thực hiện',
  'Tuần 3-7: Triển khai nghiên cứu, lập trình & Báo cáo tiến độ',
  'Tuần 8-10: Hoàn thiện báo cáo tổng kết & Chuẩn bị bảo vệ',
];

function batBuocNhap(value, thongBaoLoi) {
  const text = String(value || '').trim();
  if (!text) throw new ApiError(400, thongBaoLoi);
  return text;
}

// UC22 - Kiểm tra trùng lặp Cosine Similarity, chặn nếu >= 30%
async function kiemTraTrungLap(title, summary) {
  const deTaiCu = await prisma.topic.findMany({ select: { topic_id: true, title: true, summary: true, status: true } });
  const ketQua = checkTopicSimilarity(title, summary, deTaiCu);
  if (!ketQua.isSafe) {
    throw new ApiError(
      400,
      `Đề tài trùng lặp nội dung (${ketQua.percentage}% >= 30% so với đề tài "${ketQua.matchedTopic?.title}"), vui lòng đổi Tên/Tóm tắt.`
    );
  }
  return ketQua;
}

function chiGiangVienCuaDeTai(deTai, user) {
  if (user.role !== 'ADMIN' && deTai.lecturer_id !== user.user_id) {
    throw new ApiError(403, 'Chỉ Giảng viên hướng dẫn của đề tài này mới được thực hiện thao tác.');
  }
}

// POST /api/topics - UC04 (Sinh viên đề xuất) & UC08 (Giảng viên công bố)
async function taoDeTai(req, res) {
  const user = req.user;
  const title = batBuocNhap(req.body.title, 'Vui lòng nhập đầy đủ Tên đề tài và Tóm tắt nội dung.');
  const summary = batBuocNhap(req.body.summary, 'Vui lòng nhập đầy đủ Tên đề tài và Tóm tắt nội dung.');
  const requirements = String(req.body.requirements || '').trim();
  const fieldId = req.body.field_id || null;

  if (user.role === 'LECTURER') {
    const simResult = await kiemTraTrungLap(title, summary);
    const topic = await prisma.topic.create({
      data: {
        topic_id: await taoMaDeTai(prisma),
        title,
        summary,
        requirements,
        max_members: Math.min(5, Math.max(1, Number(req.body.max_members) || 3)),
        status: 'RECRUITING',
        similarity_score: simResult.percentage,
        lecturer_id: user.user_id,
        field_id: fieldId,
        created_by_role: 'LECTURER',
      },
    });
    return res.status(201).json({ topic, similarity: simResult, message: 'Công bố đề tài tuyển sinh thành công!' });
  }

  if (user.role !== 'STUDENT') throw new ApiError(403, 'Chỉ Sinh viên hoặc Giảng viên mới được tạo đề tài.');

  // Rule 2: Sinh viên đăng ký chưa thuộc nhóm nào
  const deTaiHienTai = await layDeTaiDangThamGia(prisma, user.user_id);
  if (deTaiHienTai) {
    throw new ApiError(
      400,
      `Bạn đã tham gia đề tài [${deTaiHienTai.topic_id}] "${deTaiHienTai.title}". Mỗi sinh viên chỉ được tham gia tối đa 01 đề tài trong kỳ.`
    );
  }

  // Luồng thay thế 3a UC04: kiểm tra từng MSSV thành viên đi kèm
  const thanhVienKhac = [];
  const memberCodes = Array.isArray(req.body.memberCodes) ? req.body.memberCodes : [];
  for (const raw of memberCodes) {
    const code = String(raw).trim();
    if (!code || code.toLowerCase() === user.user_code.toLowerCase()) continue;
    const sv = await prisma.user.findFirst({
      where: { role: 'STUDENT', user_code: { equals: code, mode: 'insensitive' } },
    });
    if (!sv) throw new ApiError(400, `Không tìm thấy sinh viên có MSSV [${code}] trong hệ thống.`);
    const xungDot = await layDeTaiDangThamGia(prisma, sv.user_id);
    if (xungDot) {
      throw new ApiError(400, `Sinh viên ${sv.full_name} [${code}] đã tham gia đề tài khác (${xungDot.topic_id}).`);
    }
    if (!thanhVienKhac.some((s) => s.user_id === sv.user_id)) thanhVienKhac.push(sv);
  }

  const simResult = await kiemTraTrungLap(title, summary);

  const topic = await prisma.$transaction(async (tx) => {
    const topicId = await taoMaDeTai(tx);
    const moi = await tx.topic.create({
      data: {
        topic_id: topicId,
        title,
        summary,
        requirements,
        max_members: Math.max(3, thanhVienKhac.length + 1),
        status: 'PENDING_ADMIN', // Rule 1: Chờ Khoa duyệt
        similarity_score: simResult.percentage,
        field_id: fieldId,
        preferred_lecturer_note: String(req.body.preferred_lecturer_note || '').trim(),
        created_by_role: 'STUDENT',
      },
    });
    await tx.topicMember.createMany({
      data: [
        { topic_id: topicId, student_id: user.user_id, cover_letter: 'Nhóm trưởng đề xuất đề tài.', status: 'APPROVED' },
        ...thanhVienKhac.map((sv) => ({
          topic_id: topicId,
          student_id: sv.user_id,
          cover_letter: `Thành viên cùng nhóm với ${user.full_name}.`,
          status: 'APPROVED',
        })),
      ],
    });
    await thongBao(
      tx,
      thanhVienKhac.map((s) => s.user_id),
      `Bạn đã được thêm vào nhóm đề tài tự đề xuất [${topicId}] "${title}" (Trạng thái: Chờ Khoa duyệt).`
    );
    await thongBao(
      tx,
      await layMaAdmin(tx),
      `Sinh viên ${user.full_name} (${user.user_code}) vừa đăng ký đề tài mới [${topicId}] chờ Khoa xét duyệt sơ bộ.`
    );
    return moi;
  });

  return res.status(201).json({ topic, similarity: simResult, message: 'Đăng ký thành công, chờ Khoa duyệt' });
}

// POST /api/topics/:id/apply - UC05: Sinh viên ứng tuyển đề tài của Giảng viên
async function ungTuyen(req, res) {
  const user = req.user;
  const coverLetter = batBuocNhap(req.body.cover_letter, 'Vui lòng nhập lời tự giới thiệu năng lực (Cover Letter) khi ứng tuyển.');

  const deTaiHienTai = await layDeTaiDangThamGia(prisma, user.user_id);
  if (deTaiHienTai) {
    throw new ApiError(400, `Bạn đã là thành viên chính thức của đề tài [${deTaiHienTai.topic_id}]. Không thể ứng tuyển thêm.`);
  }
  const deTai = await layDeTai(prisma, req.params.id);
  if (deTai.status !== 'RECRUITING') throw new ApiError(400, 'Đề tài này hiện không còn trong trạng thái mở tuyển sinh.');

  const daNop = await prisma.topicMember.findFirst({ where: { topic_id: deTai.topic_id, student_id: user.user_id } });
  if (daNop) throw new ApiError(400, 'Bạn đã gửi đơn ứng tuyển vào đề tài này trước đó (Đang chờ duyệt).');

  await prisma.$transaction(async (tx) => {
    await tx.topicMember.create({
      data: { topic_id: deTai.topic_id, student_id: user.user_id, cover_letter: coverLetter, status: 'PENDING' },
    });
    await thongBao(
      tx,
      deTai.lecturer_id,
      `Sinh viên ${user.full_name} (${user.user_code}) vừa nộp đơn ứng tuyển vào đề tài [${deTai.topic_id}] "${deTai.title}".`
    );
  });
  return res.status(201).json({ message: 'Gửi ứng tuyển thành công' });
}

// PUT /api/topics/:id/approve - UC09: GVHD duyệt từng ứng viên ({member_id, status}) hoặc chốt nhóm ({finalize_group: true})
async function duyetUngVien(req, res) {
  const deTai = await layDeTai(prisma, req.params.id);
  chiGiangVienCuaDeTai(deTai, req.user);
  if (deTai.status !== 'RECRUITING') throw new ApiError(400, 'Đề tài không còn ở giai đoạn tuyển sinh viên.');

  if (req.body.finalize_group) {
    const daDuyet = await layMaThanhVien(prisma, deTai.topic_id);
    if (daDuyet.length === 0) throw new ApiError(400, 'Cần duyệt ít nhất 01 sinh viên vào nhóm trước khi chốt danh sách.');
    await prisma.$transaction(async (tx) => {
      // Từ chối các đơn còn đang chờ và chuyển đề tài sang Chờ Khoa duyệt cuối (UC09 bước 6)
      await tx.topicMember.updateMany({
        where: { topic_id: deTai.topic_id, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: 'PENDING_ADMIN' } });
      await thongBao(
        tx,
        daDuyet,
        `Giảng viên hướng dẫn đã chốt danh sách nhóm đề tài [${deTai.topic_id}] "${deTai.title}" và gửi lên Khoa phê duyệt.`
      );
    });
    return res.json({ message: 'Đã chốt danh sách nhóm và gửi lên Khoa duyệt!' });
  }

  const trangThai = req.body.status;
  if (!['APPROVED', 'REJECTED'].includes(trangThai)) throw new ApiError(400, 'Trạng thái duyệt không hợp lệ.');
  const banGhi = await prisma.topicMember.findFirst({ where: { id: String(req.body.member_id || ''), topic_id: deTai.topic_id } });
  if (!banGhi) throw new ApiError(404, 'Không tìm thấy hồ sơ ứng tuyển.');

  if (trangThai === 'APPROVED') {
    // Luồng thay thế 3a UC09: chặn duyệt quá số lượng tối đa
    const soDaDuyet = await prisma.topicMember.count({ where: { topic_id: deTai.topic_id, status: 'APPROVED' } });
    if (soDaDuyet >= deTai.max_members) {
      throw new ApiError(400, `Nhóm đã đạt số lượng tối đa (${deTai.max_members} sinh viên). Không thể duyệt thêm.`);
    }
    // Rule 2: ứng viên chưa thuộc nhóm khác
    const xungDot = await layDeTaiDangThamGia(prisma, banGhi.student_id);
    if (xungDot && xungDot.topic_id !== deTai.topic_id) {
      throw new ApiError(400, `Sinh viên này đã được duyệt vào đề tài khác (${xungDot.topic_id}).`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.topicMember.update({ where: { id: banGhi.id }, data: { status: trangThai } });
    await thongBao(
      tx,
      banGhi.student_id,
      trangThai === 'APPROVED'
        ? `Chúc mừng! Đơn ứng tuyển của bạn vào đề tài [${deTai.topic_id}] "${deTai.title}" đã được Giảng viên ĐỒNG Ý.`
        : `Đơn ứng tuyển của bạn vào đề tài [${deTai.topic_id}] "${deTai.title}" chưa phù hợp trong đợt này.`
    );
  });
  return res.json({ message: 'Đã cập nhật trạng thái ứng viên.' });
}

// PUT /api/topics/:id/assign - UC14 & UC15: Admin duyệt sơ bộ / từ chối / phân công GVHD
async function khoaDuyetVaPhanCong(req, res) {
  const deTai = await layDeTai(prisma, req.params.id);
  if (deTai.status !== 'PENDING_ADMIN') throw new ApiError(400, 'Đề tài không ở trạng thái Chờ Khoa duyệt.');
  const thanhVien = await layMaThanhVien(prisma, deTai.topic_id);
  const { action, lecturer_id: lecturerId } = req.body;

  // UC14 luồng 3a: Từ chối kèm lý do
  if (action === 'REJECT') {
    const lyDo = batBuocNhap(req.body.reject_reason, 'Vui lòng nhập lý do từ chối đề tài để thông báo cho sinh viên (UC14 3a).');
    await prisma.$transaction(async (tx) => {
      await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: 'FAILED', reject_reason: lyDo } });
      await thongBao(tx, thanhVien, `Đề tài [${deTai.topic_id}] "${deTai.title}" bị Khoa từ chối sơ bộ. Lý do: ${lyDo}`);
    });
    return res.json({ message: 'Đã từ chối đề tài và gửi thông báo cho nhóm sinh viên.' });
  }

  // Đề tài do GVHD tuyển sinh đã chốt nhóm -> Khoa duyệt cho chạy luôn
  if (deTai.created_by_role === 'LECTURER' && deTai.lecturer_id && !lecturerId) {
    await prisma.$transaction(async (tx) => {
      await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: 'IN_PROGRESS' } });
      await moKhoaKanban(tx, deTai.topic_id, KANBAN_SAU_KHI_KHOA_DUYET);
      await thongBao(tx, thanhVien, `Khoa đã phê duyệt chính thức đề tài [${deTai.topic_id}] "${deTai.title}". Bảng tiến độ Kanban đã mở!`);
    });
    return res.json({ message: 'Đã phê duyệt chính thức đề tài vào giai đoạn Đang thực hiện (IN_PROGRESS).' });
  }

  // UC15: Phân công GVHD cho đề tài sinh viên tự đề xuất
  if (!lecturerId) throw new ApiError(400, 'Vui lòng chọn Giảng viên hướng dẫn để phân công cho đề tài.');
  const giangVien = await prisma.user.findUnique({ where: { user_id: lecturerId } });
  if (!giangVien || !['LECTURER', 'ADMIN'].includes(giangVien.role)) {
    throw new ApiError(400, 'Người được chọn không phải Giảng viên.');
  }
  const soDangHuongDan = await prisma.topic.count({
    where: { lecturer_id: lecturerId, status: { notIn: ['COMPLETED', 'FAILED'] } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.topic.update({
      where: { topic_id: deTai.topic_id },
      data: { lecturer_id: lecturerId, status: 'PENDING_LECTURER' },
    });
    await thongBao(
      tx,
      lecturerId,
      `Khoa CNTT vừa phân công Thầy/Cô hướng dẫn đề tài [${deTai.topic_id}] "${deTai.title}". Vui lòng xác nhận tiếp nhận.`
    );
    await thongBao(
      tx,
      thanhVien,
      `Đề tài [${deTai.topic_id}] đã được Khoa duyệt sơ bộ và phân công GVHD. Đang chờ GVHD xác nhận tiếp nhận.`
    );
  });

  // UC15 luồng 1a: cảnh báo mềm, vẫn cho phép lưu
  const canhBao =
    soDangHuongDan >= GIOI_HAN_DE_TAI_GVHD
      ? ` Lưu ý: ${giangVien.full_name} đang hướng dẫn ${soDangHuongDan} nhóm (vượt mức khuyến nghị ${GIOI_HAN_DE_TAI_GVHD}).`
      : '';
  return res.json({ message: `Đã duyệt sơ bộ và phân công Giảng viên hướng dẫn (Chờ GVHD xác nhận).${canhBao}` });
}

// PUT /api/topics/:id/confirm - UC10: GVHD chấp nhận / từ chối đề tài do Khoa phân công
async function gvXacNhanPhanCong(req, res) {
  const deTai = await layDeTai(prisma, req.params.id);
  if (deTai.lecturer_id !== req.user.user_id) throw new ApiError(403, 'Đề tài này không được phân công cho Thầy/Cô.');
  if (deTai.status !== 'PENDING_LECTURER') throw new ApiError(400, 'Đề tài không ở trạng thái Chờ GVHD xác nhận.');
  const thanhVien = await layMaThanhVien(prisma, deTai.topic_id);

  if (!req.body.accept) {
    const lyDo = batBuocNhap(req.body.reject_reason, 'Vui lòng nhập lý do từ chối nhận hướng dẫn để Khoa phân công giảng viên khác (UC10 3a).');
    await prisma.$transaction(async (tx) => {
      await tx.topic.update({
        where: { topic_id: deTai.topic_id },
        data: { lecturer_id: null, status: 'PENDING_ADMIN', lecturer_reject_note: `${req.user.full_name} từ chối: ${lyDo}` },
      });
      await thongBao(
        tx,
        await layMaAdmin(tx),
        `GVHD ${req.user.full_name} đã từ chối nhận đề tài [${deTai.topic_id}] với lý do: "${lyDo}". Vui lòng phân công GVHD khác.`
      );
    });
    return res.json({ message: 'Đã gửi phản hồi từ chối về Khoa để phân công giảng viên khác.' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: 'IN_PROGRESS' } });
    await moKhoaKanban(tx, deTai.topic_id, KANBAN_SAU_KHI_GVHD_NHAN);
    await thongBao(
      tx,
      thanhVien,
      `Giảng viên hướng dẫn đã chấp nhận đề tài [${deTai.topic_id}] "${deTai.title}". Bảng tiến độ Kanban đã được mở khóa!`
    );
  });
  return res.json({ message: 'Đã xác nhận tiếp nhận hướng dẫn! Bảng theo dõi tiến độ Kanban đã mở.' });
}

// GET /api/topics - UC05: Bảng tin đề tài (lọc theo ?status=)
async function danhSachDeTai(req, res) {
  const where = req.query.status ? { status: String(req.query.status) } : {};
  const topics = await prisma.topic.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { topic_id: 'asc' }],
    include: { lecturer: { select: { user_id: true, full_name: true } }, field: true },
  });
  return res.json(topics);
}

module.exports = {
  danhSachDeTai,
  taoDeTai,
  ungTuyen,
  duyetUngVien,
  khoaDuyetVaPhanCong,
  gvXacNhanPhanCong,
};
