// ============================================================================
// TIẾN ĐỘ, TÀI LIỆU & ĐIỂM QUÁ TRÌNH (UC06, UC11, UC12)
// ============================================================================
const prisma = require('../config/prisma');
const { ApiError, assertValid } = require('../utils/apiError');
const { validateDocumentFile, validateScoreValue } = require('../utils/validators');
const { thongBao, layMaAdmin } = require('../services/notificationService');
const { luuTep, docTep } = require('../services/storageService');
const { layDeTai, layMaThanhVien, coQuyenVoiDeTai, chanNeuDaDongBang } = require('../services/topicService');

const TRANG_THAI_THE = ['Chờ đánh giá', 'Hoàn thành'];

async function laThanhVienChinhThuc(topicId, userId) {
  const banGhi = await prisma.topicMember.findFirst({ where: { topic_id: topicId, student_id: userId, status: 'APPROVED' } });
  return Boolean(banGhi);
}

// POST /api/documents/upload - UC06: Sinh viên nộp báo cáo (multipart/form-data, trường "file")
async function nopTaiLieu(req, res) {
  const tep = req.file;
  assertValid(validateDocumentFile(tep ? { name: tep.originalname, size: tep.size } : null));
  const moTa = String(req.body.description || '').trim();
  if (!moTa) throw new ApiError(400, 'Vui lòng nhập mô tả ngắn gọn cho tệp báo cáo.');

  const deTai = await layDeTai(prisma, req.body.topic_id);
  if (!(await laThanhVienChinhThuc(deTai.topic_id, req.user.user_id))) {
    throw new ApiError(403, 'Chỉ thành viên chính thức của nhóm mới được nộp tài liệu cho đề tài này.');
  }
  // UC12 bước 5: sau khi GVHD chốt hồ sơ, đề tài rời trạng thái IN_PROGRESS nên cổng nộp bị khóa
  if (deTai.status !== 'IN_PROGRESS') {
    throw new ApiError(400, 'Chỉ có thể tải lên tài liệu khi đề tài đang ở trạng thái Đang thực hiện (IN_PROGRESS).');
  }

  // Luồng thay thế 4b UC06: nộp sau hạn chót của mốc Timeline cuối -> gắn cờ LATE
  const mocCuoi = await prisma.timeline.findFirst({ orderBy: { end_date: 'desc' } });
  const submitStatus = mocCuoi && mocCuoi.end_date < new Date() ? 'LATE' : 'ON_TIME';

  const fileUrl = await luuTep({
    buffer: tep.buffer,
    tenGoc: tep.originalname,
    mimetype: tep.mimetype,
    topicId: deTai.topic_id,
  });

  const document = await prisma.$transaction(async (tx) => {
    const moi = await tx.document.create({
      data: {
        topic_id: deTai.topic_id,
        file_name: tep.originalname,
        file_size: tep.size,
        file_url: fileUrl,
        description: moTa,
        submit_status: submitStatus,
      },
    });
    const tenThe = String(req.body.createTaskTitle || '').trim();
    if (tenThe) {
      await tx.task.create({ data: { topic_id: deTai.topic_id, title: tenThe, status: 'Chờ đánh giá' } });
    }
    await thongBao(
      tx,
      deTai.lecturer_id,
      `Nhóm sinh viên đề tài [${deTai.topic_id}] vừa tải lên tệp báo cáo mới: "${tep.originalname}" (${submitStatus === 'LATE' ? 'Nộp trễ' : 'Đúng hạn'}).`
    );
    return moi;
  });

  const { file_url, ...thongTin } = document;
  return res.status(201).json({
    document: thongTin,
    message:
      submitStatus === 'LATE'
        ? 'Đã tải tệp báo cáo lên thành công (Ghi nhận trạng thái Nộp trễ hạn - LATE).'
        : 'Đã tải tệp báo cáo lên thành công! Bạn có thể bấm Xem file hoặc Tải về ngay bên dưới.',
  });
}

// GET /api/documents/:id/file - Xem/tải file; chỉ người liên quan tới đề tài mới được đọc (chống xem trộm)
async function taiTep(req, res) {
  const tep = await prisma.document.findUnique({ where: { document_id: req.params.id }, include: { topic: true } });
  if (!tep) throw new ApiError(404, 'Không tìm thấy tài liệu.');
  if (!(await coQuyenVoiDeTai(prisma, tep.topic, req.user))) {
    throw new ApiError(403, 'Bạn không có quyền xem tài liệu của nhóm này.');
  }
  const noiDung = await docTep(tep.file_url);
  const laPdf = tep.file_name.toLowerCase().endsWith('.pdf');
  res.setHeader('Content-Type', laPdf ? 'application/pdf' : 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(tep.file_name)}`);
  return res.send(noiDung);
}

// POST /api/tasks - Thêm thẻ công việc mới vào bảng Kanban (thành viên nhóm hoặc GVHD)
async function taoThe(req, res) {
  const deTai = await layDeTai(prisma, req.body.topic_id);
  chanNeuDaDongBang(deTai);
  const laGvhd = deTai.lecturer_id === req.user.user_id;
  if (!laGvhd && !(await laThanhVienChinhThuc(deTai.topic_id, req.user.user_id))) {
    throw new ApiError(403, 'Bạn không thuộc nhóm thực hiện đề tài này.');
  }
  const title = String(req.body.title || '').trim();
  if (!title) throw new ApiError(400, 'Vui lòng nhập tên công việc.');
  const task = await prisma.task.create({ data: { topic_id: deTai.topic_id, title, status: 'Chờ đánh giá' } });
  return res.status(201).json({ task, message: 'Đã thêm thẻ công việc mới vào bảng Kanban.' });
}

async function batBuocGvhdCuaDeTai(topicId, user) {
  const deTai = await layDeTai(prisma, topicId);
  chanNeuDaDongBang(deTai);
  if (user.role !== 'ADMIN' && deTai.lecturer_id !== user.user_id) {
    throw new ApiError(403, 'Chỉ Giảng viên hướng dẫn của đề tài mới được đánh giá tiến độ.');
  }
  return deTai;
}

// PUT /api/tasks/:id - UC11: GVHD kéo thả thẻ Kanban (kèm nhận xét nếu có)
async function capNhatThe(req, res) {
  const the = await prisma.task.findUnique({ where: { task_id: req.params.id } });
  if (!the) throw new ApiError(404, 'Không tìm thấy thẻ tiến độ.');
  const deTai = await batBuocGvhdCuaDeTai(the.topic_id, req.user);
  if (!TRANG_THAI_THE.includes(req.body.status)) throw new ApiError(400, 'Trạng thái thẻ không hợp lệ.');

  const binhLuan = String(req.body.comment || '').trim();
  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { task_id: the.task_id }, data: { status: req.body.status } });
    if (binhLuan) await tx.comment.create({ data: { topic_id: deTai.topic_id, user_id: req.user.user_id, content: binhLuan } });
    await thongBao(
      tx,
      await layMaThanhVien(tx, deTai.topic_id),
      `GVHD ${req.user.full_name} vừa cập nhật đánh giá tiến độ / nhận xét cho đề tài [${deTai.topic_id}].`
    );
  });
  return res.json({ message: 'Đã cập nhật bảng tiến độ Kanban & lưu phản hồi chuyên môn.' });
}

// POST /api/topics/:id/comments - UC11 bước 4: GVHD gửi góp ý chuyên môn
async function themBinhLuan(req, res) {
  const deTai = await batBuocGvhdCuaDeTai(req.params.id, req.user);
  const content = String(req.body.content || '').trim();
  if (!content) throw new ApiError(400, 'Vui lòng nhập nội dung góp ý.');
  await prisma.$transaction(async (tx) => {
    await tx.comment.create({ data: { topic_id: deTai.topic_id, user_id: req.user.user_id, content } });
    await thongBao(
      tx,
      await layMaThanhVien(tx, deTai.topic_id),
      `GVHD ${req.user.full_name} vừa cập nhật đánh giá tiến độ / nhận xét cho đề tài [${deTai.topic_id}].`
    );
  });
  return res.status(201).json({ message: 'Đã cập nhật bảng tiến độ Kanban & lưu phản hồi chuyên môn.' });
}

// POST /api/scores/process - UC12: GVHD chốt điểm quá trình & xác nhận đủ điều kiện bảo vệ (Rule 4)
async function chotDiemQuaTrinh(req, res) {
  const { value: diem } = assertValid(validateScoreValue(req.body.score));
  const deTai = await batBuocGvhdCuaDeTai(req.body.topic_id, req.user);
  if (deTai.status !== 'IN_PROGRESS') throw new ApiError(400, 'Chỉ chốt điểm quá trình khi đề tài đang thực hiện.');
  const soTaiLieu = await prisma.document.count({ where: { topic_id: deTai.topic_id } });
  if (soTaiLieu === 0) {
    throw new ApiError(400, 'Sinh viên chưa nộp tệp báo cáo lên hệ thống. Chưa thể chốt hồ sơ bảo vệ (Tiền điều kiện UC12).');
  }

  // Luồng thay thế 4a UC12: điểm < 5.0 -> không đủ điều kiện, đề tài Không đạt
  const duDieuKien = diem >= 5.0 && Boolean(req.body.is_eligible);
  const trangThaiMoi = duDieuKien ? 'PENDING_COUNCIL' : 'FAILED';
  const nhanXet = String(req.body.comment || '').trim() || 'Đánh giá quá trình của Giảng viên hướng dẫn.';

  await prisma.$transaction(async (tx) => {
    const cu = await tx.score.findFirst({ where: { topic_id: deTai.topic_id, score_type: 'PROCESS' } });
    const data = { topic_id: deTai.topic_id, user_id: req.user.user_id, score_value: diem, comment: nhanXet, score_type: 'PROCESS' };
    if (cu) await tx.score.update({ where: { score_id: cu.score_id }, data });
    else await tx.score.create({ data });

    await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: trangThaiMoi } });
    const thanhVien = await layMaThanhVien(tx, deTai.topic_id);
    if (duDieuKien) {
      await thongBao(
        tx,
        thanhVien,
        `Chúc mừng! GVHD đã chốt điểm quá trình (${diem}/10) và xác nhận đề tài [${deTai.topic_id}] ĐỦ ĐIỀU KIỆN BẢO VỆ trước Hội đồng Khoa học.`
      );
      await thongBao(tx, await layMaAdmin(tx), `Đề tài [${deTai.topic_id}] đã đủ điều kiện bảo vệ, chờ Khoa phân bổ Hội đồng.`);
    } else {
      await thongBao(
        tx,
        thanhVien,
        `Đề tài [${deTai.topic_id}] đạt ${diem}/10 điểm quá trình: Không đủ điều kiện ra Hội đồng bảo vệ (Trạng thái: Không đạt).`
      );
    }
  });

  return res.json({
    eligible: duDieuKien,
    status: trangThaiMoi,
    message: duDieuKien
      ? `Đã chốt điểm quá trình (${diem}/10) và chuyển đề tài sang trạng thái Chờ bảo vệ (PENDING_COUNCIL)!`
      : 'Sinh viên không đủ điểm bảo vệ (< 5.0) hoặc chưa được xác nhận đủ điều kiện. Đề tài chuyển sang trạng thái Không đạt (FAILED).',
  });
}

module.exports = { nopTaiLieu, taiTep, taoThe, capNhatThe, themBinhLuan, chotDiemQuaTrinh };
