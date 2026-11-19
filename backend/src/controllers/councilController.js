// ============================================================================
// HỘI ĐỒNG KHOA HỌC (UC16, UC19, UC20, UC21)
// ============================================================================
const prisma = require('../config/prisma');
const { ApiError, assertValid } = require('../utils/apiError');
const { validateScoreValue } = require('../utils/validators');
const { thongBao } = require('../services/notificationService');
const { layDeTai, layMaThanhVien, layVaiTroHoiDong, chanNeuDaDongBang } = require('../services/topicService');

// Rule 4 + UC16 luồng 6a: chỉ gán đề tài Chờ bảo vệ, và GVHD của đề tài không được ngồi trong Hội đồng chấm đề tài đó
async function kiemTraGanDeTai(db, topicIds, maGiangVienHoiDong, tenHoiDong) {
  const deTais = await db.topic.findMany({ where: { topic_id: { in: topicIds } }, include: { lecturer: true } });
  if (deTais.length !== topicIds.length) throw new ApiError(404, 'Không tìm thấy một số đề tài được chọn.');
  for (const deTai of deTais) {
    if (deTai.status !== 'PENDING_COUNCIL') {
      throw new ApiError(400, `Đề tài [${deTai.topic_id}] chưa được GVHD xác nhận "Đủ điều kiện bảo vệ" (Rule 4).`);
    }
    if (deTai.lecturer_id && maGiangVienHoiDong.has(deTai.lecturer_id)) {
      throw new ApiError(
        400,
        `Vi phạm xung đột lợi ích (UC16): Không thể gán! ${deTai.lecturer?.full_name || 'GVHD'} là GVHD của đề tài [${deTai.topic_id}] và là thành viên của "${tenHoiDong}".`
      );
    }
  }
}

// POST /api/councils - UC16: Thành lập Hội đồng (Chủ tịch, Thư ký, Ủy viên) và phân bổ đề tài
async function thanhLapHoiDong(req, res) {
  const name = String(req.body.name || '').trim();
  const { chairman_id: chuTich, secretary_id: thuKy, member_id: uyVien } = req.body;
  const topicIds = Array.isArray(req.body.topic_ids) ? req.body.topic_ids : [];
  if (!name) throw new ApiError(400, 'Vui lòng nhập Tên Hội đồng Khoa học.');
  if (!chuTich || !thuKy || !uyVien) {
    throw new ApiError(400, 'Vui lòng chọn đầy đủ 3 vị trí: Chủ tịch, Thư ký và Ủy viên Hội đồng.');
  }
  const thanhVien = new Set([chuTich, thuKy, uyVien]);
  if (thanhVien.size < 3) {
    throw new ApiError(400, 'Ba vị trí Chủ tịch, Thư ký và Ủy viên trong một Hội đồng phải là 3 giảng viên khác nhau.');
  }
  const soGiangVien = await prisma.user.count({ where: { user_id: { in: [...thanhVien] }, role: { in: ['LECTURER', 'ADMIN'] } } });
  if (soGiangVien !== 3) throw new ApiError(400, 'Thành viên Hội đồng phải là Giảng viên của Khoa.');

  await kiemTraGanDeTai(prisma, topicIds, thanhVien, name);

  const council = await prisma.$transaction(async (tx) => {
    const moi = await tx.council.create({ data: { name } });
    await tx.councilMember.createMany({
      data: [
        { council_id: moi.council_id, lecturer_id: chuTich, role_in_council: 'CHUTICH' },
        { council_id: moi.council_id, lecturer_id: thuKy, role_in_council: 'THUKY' },
        { council_id: moi.council_id, lecturer_id: uyVien, role_in_council: 'UYVIEN' },
      ],
    });
    await tx.topic.updateMany({ where: { topic_id: { in: topicIds } }, data: { council_id: moi.council_id } });
    await thongBao(tx, [...thanhVien], `Thầy/Cô đã được phân công tham gia "${name}" với ${topicIds.length} đề tài chờ chấm bảo vệ.`);
    return moi;
  });

  return res.status(201).json({ council, message: 'Thành lập Hội đồng Khoa học và phân bổ đề tài thành công!' });
}

// PUT /api/councils/:id/topics - Gán bổ sung đề tài vào Hội đồng đã có
async function ganDeTaiVaoHoiDong(req, res) {
  const council = await prisma.council.findUnique({
    where: { council_id: req.params.id },
    include: { council_members: true },
  });
  if (!council) throw new ApiError(404, 'Không tìm thấy Hội đồng.');
  const topicId = String(req.body.topic_id || '');
  await kiemTraGanDeTai(prisma, [topicId], new Set(council.council_members.map((cm) => cm.lecturer_id)), council.name);

  await prisma.$transaction(async (tx) => {
    await tx.topic.update({ where: { topic_id: topicId }, data: { council_id: council.council_id } });
    await thongBao(
      tx,
      council.council_members.map((cm) => cm.lecturer_id),
      `Đề tài [${topicId}] vừa được phân bổ thêm vào "${council.name}" để chấm bảo vệ.`
    );
  });
  return res.json({ message: `Đã phân bổ đề tài [${topicId}] vào "${council.name}".` });
}

async function batBuocThanhVienHoiDong(topicId, user) {
  const deTai = await layDeTai(prisma, topicId);
  const vaiTro = await layVaiTroHoiDong(prisma, deTai, user.user_id);
  if (!vaiTro) throw new ApiError(403, 'Thầy/Cô không thuộc Hội đồng được phân công chấm đề tài này.');
  chanNeuDaDongBang(deTai);
  if (deTai.status !== 'PENDING_COUNCIL') throw new ApiError(400, 'Đề tài không ở trạng thái Chờ bảo vệ.');
  return { deTai, vaiTro };
}

// POST /api/scores/council - UC20: Thành viên Hội đồng nhập điểm bảo vệ và nhận xét phản biện
async function chamDiemBaoVe(req, res) {
  const { value: diem } = assertValid(validateScoreValue(req.body.score));
  const comment = String(req.body.comment || '').trim();
  if (!comment) throw new ApiError(400, 'Vui lòng nhập nhận xét phản biện chuyên môn đi kèm điểm số.');
  const { deTai } = await batBuocThanhVienHoiDong(req.body.topic_id, req.user);

  const cu = await prisma.score.findFirst({
    where: { topic_id: deTai.topic_id, user_id: req.user.user_id, score_type: 'FINAL' },
  });
  const data = { topic_id: deTai.topic_id, user_id: req.user.user_id, score_value: diem, comment, score_type: 'FINAL' };
  const score = cu
    ? await prisma.score.update({ where: { score_id: cu.score_id }, data })
    : await prisma.score.create({ data });
  return res.status(201).json({ score, message: 'Đã lưu điểm bảo vệ và nhận xét phản biện vào CSDL.' });
}

// PUT /api/topics/:id/finalize - UC21: Thư ký/Chủ tịch chốt quyết định nghiệm thu, đóng băng dữ liệu (Rule 5)
async function chotNghiemThu(req, res) {
  const quyetDinh = req.body.final_decision;
  if (!['COMPLETED', 'FAILED'].includes(quyetDinh)) throw new ApiError(400, 'Quyết định nghiệm thu không hợp lệ.');
  const { deTai, vaiTro } = await batBuocThanhVienHoiDong(req.params.id, req.user);
  if (!['CHUTICH', 'THUKY'].includes(vaiTro)) {
    throw new ApiError(403, 'Chỉ Chủ tịch hoặc Thư ký Hội đồng mới được chốt quyết định nghiệm thu.');
  }

  const diemBaoVe = await prisma.score.findMany({ where: { topic_id: deTai.topic_id, score_type: 'FINAL' } });
  if (diemBaoVe.length === 0) {
    throw new ApiError(400, 'Hội đồng cần nhập ít nhất 01 đầu điểm bảo vệ trước khi chốt quyết định nghiệm thu.');
  }
  const diemTB = (diemBaoVe.reduce((tong, s) => tong + s.score_value, 0) / diemBaoVe.length).toFixed(2);

  await prisma.$transaction(async (tx) => {
    await tx.topic.update({ where: { topic_id: deTai.topic_id }, data: { status: quyetDinh, is_frozen: true } });
    await thongBao(
      tx,
      [...(await layMaThanhVien(tx, deTai.topic_id)), deTai.lecturer_id],
      `Hội đồng Khoa học đã chốt nghiệm thu đề tài [${deTai.topic_id}] "${deTai.title}": ${
        quyetDinh === 'COMPLETED' ? 'ĐẠT (COMPLETED)' : 'KHÔNG ĐẠT (FAILED)'
      } — Điểm TB Bảo vệ: ${diemTB}/10.`
    );
  });

  return res.json({
    message: `Đã chốt quyết định nghiệm thu (${quyetDinh === 'COMPLETED' ? 'Hoàn thành - Đạt' : 'Không đạt'}) và đóng băng toàn bộ dữ liệu đề tài!`,
  });
}

module.exports = { thanhLapHoiDong, ganDeTaiVaoHoiDong, chamDiemBaoVe, chotNghiemThu };
