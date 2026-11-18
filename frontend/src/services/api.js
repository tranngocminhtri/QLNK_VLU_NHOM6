/**
 * Dịch vụ giao tiếp RESTful API & Quản lý trạng thái dữ liệu đồng bộ (UC01 -> UC23)
 * Hỗ trợ đầy đủ 15 Endpoints theo Bảng 4.2.5 (Tailieu.pdf) kết hợp LocalStorage DB Persistence.
 */

import { INITIAL_DB } from './mockData';
import { checkTopicSimilarity } from '../utils/similarity';
import {
  validateVluEmail,
  validatePhone,
  validateDocumentFile,
  validateScoreValue,
  validateTimelineDates,
} from '../utils/validators';

const DB_STORAGE_KEY = 'VLU_SCIRES_SAMPLE_TEST_V3';
const AUTH_STORAGE_KEY = 'VLU_SCIRES_AUTH_CLEAN_V2';

export function loadDatabase() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return structuredClone(INITIAL_DB);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.users)) {
      let migrated = false;
      parsed.users.forEach((u) => {
        if (u.role === 'COUNCIL') {
          u.role = 'LECTURER';
          migrated = true;
        }
      });
      if (migrated) {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
    return parsed;
  } catch {
    return structuredClone(INITIAL_DB);
  }
}

export function saveDatabase(db) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Lỗi lưu trữ dữ liệu cục bộ:', e);
  }
}

export function resetDatabaseToDefault() {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(INITIAL_DB));
  return structuredClone(INITIAL_DB);
}

// Helper: Làm giàu dữ liệu Topic với các bảng liên kết giống Prisma include
export function getEnrichedDatabase() {
  const db = loadDatabase();
  const userMap = new Map(db.users.map((u) => [u.user_id, u]));
  const categoryMap = new Map(db.categories.map((c) => [c.category_id, c]));
  const councilMap = new Map(db.councils.map((c) => [c.council_id, c]));

  const enrichedCouncils = db.councils.map((c) => ({
    ...c,
    council_members: db.council_members
      .filter((cm) => cm.council_id === c.council_id)
      .map((cm) => ({
        ...cm,
        lecturer: userMap.get(cm.lecturer_id) || null,
      })),
  }));

  const enrichedTopics = db.topics.map((t) => ({
    ...t,
    lecturer: t.lecturer_id ? userMap.get(t.lecturer_id) || null : null,
    council: t.council_id ? councilMap.get(t.council_id) || null : null,
    field: t.field_id ? categoryMap.get(t.field_id) || null : null,
    members: db.topic_members
      .filter((tm) => tm.topic_id === t.topic_id)
      .map((tm) => ({
        ...tm,
        student: userMap.get(tm.student_id) || null,
      })),
    documents: db.documents.filter((d) => d.topic_id === t.topic_id),
    tasks: db.tasks.filter((tk) => tk.topic_id === t.topic_id),
    comments: db.comments
      .filter((cm) => cm.topic_id === t.topic_id)
      .map((cm) => ({
        ...cm,
        user: userMap.get(cm.user_id) || null,
      })),
    scores: db.scores
      .filter((sc) => sc.topic_id === t.topic_id)
      .map((sc) => ({
        ...sc,
        user: userMap.get(sc.user_id) || null,
      })),
  }));

  const enrichedUsers = db.users.map((u) => ({
    ...u,
    department: u.department_id ? categoryMap.get(u.department_id) || null : null,
  }));

  return {
    ...db,
    users: enrichedUsers,
    topics: enrichedTopics,
    councils: enrichedCouncils,
  };
}

// UC23 - Tự động ghi nhận thông báo In-app
function pushNotification(db, userId, content) {
  if (!userId) return;
  db.notifications.unshift({
    notification_id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    content,
    is_read: false,
  });
}

// Hàm đồng bộ dữ liệu trực tiếp xuống máy chủ Backend Node.js + PostgreSQL qua giao thức HTTP RESTful API
function syncBackendHttp(endpoint, method = 'POST', bodyData = null) {
  try {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (parsedSession && parsedSession.token) {
      headers['Authorization'] = `Bearer ${parsedSession.token}`;
    }
    fetch(`/api${endpoint}`, {
      method,
      headers,
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    }).catch(function () {
      // Tự động duy trì hoạt động mượt mà nếu kết nối mạng đám mây bị gián đoạn tạm thời
    });
  } catch {
    // Bỏ qua lỗi mạng cục bộ
  }
}

// ============================================================================
// 1. XÁC THỰC & HỒ SƠ CÁ NHÂN (UC01, UC02, UC03)
// ============================================================================

export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const db = getEnrichedDatabase();
    const freshUser = db.users.find((u) => u.user_id === parsed.user?.user_id);
    if (!freshUser || freshUser.is_locked) return null;
    return { ...parsed, user: freshUser };
  } catch {
    return null;
  }
}

// POST /api/auth/login (UC01 - Đăng nhập SSO Google @vanlanguni.vn do Admin cấp)
export function apiLoginWithGoogleSSO(emailInput) {
  const check = validateVluEmail(emailInput);
  if (!check.valid) {
    throw new Error(check.message);
  }

  const normalizedEmail = emailInput.trim().toLowerCase();
  const db = loadDatabase();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  // Chỉ cho phép đăng nhập các tài khoản @vanlanguni.vn đã được Admin tạo trong hệ thống
  if (!user) {
    throw new Error(
      'Tài khoản chưa được cấp phép trên hệ thống. Chỉ những tài khoản @vanlanguni.vn do Quản trị viên (Admin) tạo mới được phép đăng nhập.'
    );
  }

  if (user.is_locked) {
    throw new Error('Tài khoản của bạn đã bị khóa bởi Quản trị viên Khoa. Vui lòng liên hệ Giáo vụ Khoa CNTT.');
  }

  const token = `jwt_vlu_${user.user_id}_${user.role}`;
  const enrichedDb = getEnrichedDatabase();
  const enrichedUser = enrichedDb.users.find((u) => u.user_id === user.user_id);

  const session = { token, user: enrichedUser, loginAt: new Date().toISOString() };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  syncBackendHttp('/auth/login', 'POST', { email: normalizedEmail });
  return session;
}

// POST /api/auth/logout (UC02 - Đăng xuất hệ thống)
export function apiLogout() {
  syncBackendHttp('/auth/logout', 'POST');
  localStorage.removeItem(AUTH_STORAGE_KEY);
  return { message: 'Đăng xuất thành công' };
}

// PUT /api/users/profile (UC03 - Quản lý hồ sơ cá nhân)
export function apiUpdateProfile(userId, { full_name, phone, department_id }) {
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) {
    throw new Error(phoneCheck.message);
  }
  if (!full_name || !full_name.trim()) {
    throw new Error('Dữ liệu không hợp lệ: Họ và tên không được để trống.');
  }

  const db = loadDatabase();
  const idx = db.users.findIndex((u) => u.user_id === userId);
  if (idx === -1) throw new Error('Không tìm thấy tài khoản người dùng.');

  db.users[idx] = {
    ...db.users[idx],
    full_name: full_name.trim(),
    phone: phone.trim(),
    department_id: department_id || db.users[idx].department_id,
  };
  saveDatabase(db);

  const enrichedDb = getEnrichedDatabase();
  const updatedUser = enrichedDb.users.find((u) => u.user_id === userId);
  const currentSession = getCurrentSession();
  if (currentSession && currentSession.user.user_id === userId) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...currentSession, user: updatedUser }));
  }
  return updatedUser;
}

// ============================================================================
// 2. KHỞI TẠO & QUẢN LÝ ĐỀ TÀI (UC04, UC05, UC08, UC09, UC10, UC14, UC15, UC22)
// ============================================================================

// Helper kiểm tra Rule 2: 1 Sinh viên chỉ được tham gia tối đa 1 đề tài NCKH trong kỳ
export function getStudentActiveTopic(db, studentId) {
  const activeMembership = db.topic_members.find((tm) => {
    if (tm.student_id !== studentId || tm.status !== 'APPROVED') return false;
    const topic = db.topics.find((t) => t.topic_id === tm.topic_id);
    return topic && topic.status !== 'FAILED';
  });
  if (!activeMembership) return null;
  return db.topics.find((t) => t.topic_id === activeMembership.topic_id) || null;
}

// POST /api/topics (UC04 - Sinh viên đề xuất đề tài mới & UC22 - Kiểm tra đạo văn)
export function apiCreateStudentTopic(studentUser, { title, summary, requirements, preferred_lecturer_note, field_id, memberCodes = [] }) {
  if (!title?.trim() || !summary?.trim()) {
    throw new Error('Vui lòng nhập đầy đủ Tên đề tài và Tóm tắt nội dung.');
  }

  const db = loadDatabase();

  // Kiểm tra chính sinh viên đăng ký đã có nhóm chưa (Rule 2)
  const existingTopic = getStudentActiveTopic(db, studentUser.user_id);
  if (existingTopic) {
    throw new Error(`Bạn đã tham gia đề tài [${existingTopic.topic_id}] "${existingTopic.title}". Mỗi sinh viên chỉ được tham gia tối đa 01 đề tài trong kỳ.`);
  }

  // Kiểm tra danh sách MSSV thành viên cùng nhóm (Luồng thay thế 3a UC04)
  const extraStudents = [];
  for (const rawCode of memberCodes) {
    const code = rawCode.trim();
    if (!code || code === studentUser.user_code) continue;
    const foundStudent = db.users.find(
      (u) => u.role === 'STUDENT' && u.user_code.toLowerCase() === code.toLowerCase()
    );
    if (!foundStudent) {
      throw new Error(`Không tìm thấy sinh viên có MSSV [${code}] trong hệ thống.`);
    }
    const conflictTopic = getStudentActiveTopic(db, foundStudent.user_id);
    if (conflictTopic) {
      throw new Error(`Sinh viên ${foundStudent.full_name} [${code}] đã tham gia đề tài khác (${conflictTopic.topic_id}).`);
    }
    if (!extraStudents.some((s) => s.user_id === foundStudent.user_id)) {
      extraStudents.push(foundStudent);
    }
  }

  // UC22 - Kiểm tra trùng lặp Cosine Similarity (Chặn nếu >= 30%)
  const simResult = checkTopicSimilarity(title, summary, db.topics);
  if (!simResult.isSafe) {
    throw new Error(
      `Đề tài trùng lặp nội dung (${simResult.percentage}% >= 30% so với đề tài "${simResult.matchedTopic?.title}"), vui lòng đổi Tên/Tóm tắt.`
    );
  }

  const newTopicId = `DT-2026-${String(db.topics.length + 1).padStart(3, '0')}`;
  const newTopic = {
    topic_id: newTopicId,
    title: title.trim(),
    summary: summary.trim(),
    requirements: (requirements || '').trim(),
    max_members: Math.max(3, extraStudents.length + 1),
    status: 'PENDING_ADMIN', // Rule 1: Mặc định Chờ Khoa duyệt
    similarity_score: simResult.percentage,
    lecturer_id: null,
    council_id: null,
    field_id: field_id || 'cat-field-1',
    preferred_lecturer_note: (preferred_lecturer_note || '').trim(),
    created_by_role: 'STUDENT',
  };

  db.topics.unshift(newTopic);

  // Thêm trưởng nhóm
  db.topic_members.push({
    id: `tm-${Date.now()}-leader`,
    topic_id: newTopicId,
    student_id: studentUser.user_id,
    cover_letter: 'Nhóm trưởng đề xuất đề tài.',
    status: 'APPROVED',
  });

  // Thêm các thành viên đi kèm
  extraStudents.forEach((st, idx) => {
    db.topic_members.push({
      id: `tm-${Date.now()}-${idx}`,
      topic_id: newTopicId,
      student_id: st.user_id,
      cover_letter: `Thành viên cùng nhóm với ${studentUser.full_name}.`,
      status: 'APPROVED',
    });
    pushNotification(
      db,
      st.user_id,
      `Bạn đã được thêm vào nhóm đề tài tự đề xuất [${newTopicId}] "${newTopic.title}" (Trạng thái: Chờ Khoa duyệt).`
    );
  });

  // Báo cho Admin Khoa
  db.users
    .filter((u) => u.role === 'ADMIN')
    .forEach((admin) => {
      pushNotification(
        db,
        admin.user_id,
        `Sinh viên ${studentUser.full_name} (${studentUser.user_code}) vừa đăng ký đề tài mới [${newTopicId}] chờ Khoa xét duyệt sơ bộ.`
      );
    });

  saveDatabase(db);
  return { topic: newTopic, similarity: simResult, message: 'Đăng ký thành công, chờ Khoa duyệt' };
}

// POST /api/topics (UC08 - Giảng viên công bố đề tài nghiên cứu mới & UC22)
export function apiCreateLecturerTopic(lecturerUser, { title, summary, requirements, max_members, field_id }) {
  if (!title?.trim() || !summary?.trim()) {
    throw new Error('Vui lòng nhập đầy đủ Tên đề tài và Tóm tắt nội dung.');
  }

  const db = loadDatabase();
  const simResult = checkTopicSimilarity(title, summary, db.topics);
  if (!simResult.isSafe) {
    throw new Error(
      `Cảnh báo trùng lặp cao (${simResult.percentage}% >= 30% so với đề tài "${simResult.matchedTopic?.title}"). Vui lòng điều chỉnh Tên hoặc Tóm tắt đề tài.`
    );
  }

  const newTopicId = `DT-2026-${String(db.topics.length + 1).padStart(3, '0')}`;
  const newTopic = {
    topic_id: newTopicId,
    title: title.trim(),
    summary: summary.trim(),
    requirements: (requirements || '').trim(),
    max_members: Math.min(5, Math.max(1, Number(max_members) || 3)),
    status: 'RECRUITING',
    similarity_score: simResult.percentage,
    lecturer_id: lecturerUser.user_id,
    council_id: null,
    field_id: field_id || 'cat-field-1',
    created_by_role: 'LECTURER',
  };

  db.topics.unshift(newTopic);
  saveDatabase(db);
  return { topic: newTopic, similarity: simResult, message: 'Công bố đề tài tuyển sinh thành công!' };
}

// POST /api/topics/:id/apply (UC05 - Sinh viên ứng tuyển đề tài của Giảng viên)
export function apiApplyToTopic(studentUser, topicId, coverLetter = '') {
  if (!coverLetter || !coverLetter.trim()) {
    throw new Error('Vui lòng nhập lời tự giới thiệu năng lực (Cover Letter) khi ứng tuyển.');
  }

  const db = loadDatabase();
  const existingTopic = getStudentActiveTopic(db, studentUser.user_id);
  if (existingTopic) {
    throw new Error(`Bạn đã là thành viên chính thức của đề tài [${existingTopic.topic_id}]. Không thể ứng tuyển thêm.`);
  }

  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic || topic.status !== 'RECRUITING') {
    throw new Error('Đề tài này hiện không còn trong trạng thái mở tuyển sinh.');
  }

  const alreadyApplied = db.topic_members.find(
    (tm) => tm.topic_id === topicId && tm.student_id === studentUser.user_id
  );
  if (alreadyApplied) {
    throw new Error('Bạn đã gửi đơn ứng tuyển vào đề tài này trước đó (Đang chờ duyệt).');
  }

  db.topic_members.push({
    id: `tm-${Date.now()}`,
    topic_id: topicId,
    student_id: studentUser.user_id,
    cover_letter: coverLetter.trim(),
    status: 'PENDING',
  });

  if (topic.lecturer_id) {
    pushNotification(
      db,
      topic.lecturer_id,
      `Sinh viên ${studentUser.full_name} (${studentUser.user_code}) vừa nộp đơn ứng tuyển vào đề tài [${topic.topic_id}] "${topic.title}".`
    );
  }

  saveDatabase(db);
  return { message: 'Gửi ứng tuyển thành công' };
}

// PUT /api/topics/:id/approve (UC09 - GVHD xét duyệt ứng viên & chốt nhóm)
export function apiReviewApplicant(topicId, memberRecordId, decisionStatus) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const memberIdx = db.topic_members.findIndex((tm) => tm.id === memberRecordId && tm.topic_id === topicId);
  if (memberIdx === -1) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');

  const applicantId = db.topic_members[memberIdx].student_id;

  if (decisionStatus === 'APPROVED') {
    const currentApprovedCount = db.topic_members.filter(
      (tm) => tm.topic_id === topicId && tm.status === 'APPROVED'
    ).length;
    // Luồng thay thế 3a UC09: Chặn duyệt quá số lượng tối đa
    if (currentApprovedCount >= topic.max_members) {
      throw new Error(`Nhóm đã đạt số lượng tối đa (${topic.max_members} sinh viên). Không thể duyệt thêm.`);
    }

    // Kiểm tra ứng viên đã vào nhóm khác chưa (Rule 2)
    const conflict = getStudentActiveTopic(db, applicantId);
    if (conflict && conflict.topic_id !== topicId) {
      throw new Error(`Sinh viên này đã được duyệt vào đề tài khác (${conflict.topic_id}).`);
    }
  }

  db.topic_members[memberIdx].status = decisionStatus;
  pushNotification(
    db,
    applicantId,
    decisionStatus === 'APPROVED'
      ? `Chúc mừng! Đơn ứng tuyển của bạn vào đề tài [${topic.topic_id}] "${topic.title}" đã được Giảng viên ĐỒNG Ý.`
      : `Đơn ứng tuyển của bạn vào đề tài [${topic.topic_id}] "${topic.title}" chưa phù hợp trong đợt này.`
  );

  saveDatabase(db);
  return { message: 'Đã cập nhật trạng thái ứng viên.' };
}

// Chốt danh sách nhóm từ đề tài GVHD tuyển sinh (UC09 bước 5-6)
export function apiFinalizeRecruitingGroup(topicId) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const approvedMembers = db.topic_members.filter(
    (tm) => tm.topic_id === topicId && tm.status === 'APPROVED'
  );
  if (approvedMembers.length === 0) {
    throw new Error('Cần duyệt ít nhất 01 sinh viên vào nhóm trước khi chốt danh sách.');
  }

  // Từ chối các đơn còn đang chờ
  db.topic_members.forEach((tm) => {
    if (tm.topic_id === topicId && tm.status === 'PENDING') {
      tm.status = 'REJECTED';
    }
  });

  topic.status = 'PENDING_ADMIN'; // Chuyển sang Chờ Khoa duyệt cuối (UC09 Hậu điều kiện)
  approvedMembers.forEach((m) => {
    pushNotification(
      db,
      m.student_id,
      `Giảng viên hướng dẫn đã chốt danh sách nhóm đề tài [${topic.topic_id}] "${topic.title}" và gửi lên Khoa phê duyệt.`
    );
  });

  saveDatabase(db);
  return { message: 'Đã chốt danh sách nhóm và gửi lên Khoa duyệt!' };
}

// UC14 & UC15 - Admin xét duyệt sơ bộ đề tài & Phân công GVHD (PUT /api/topics/:id/assign)
export function apiAdminReviewAndAssignTopic(topicId, { action, lecturer_id, reject_reason }) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const memberIds = db.topic_members
    .filter((tm) => tm.topic_id === topicId && tm.status === 'APPROVED')
    .map((tm) => tm.student_id);

  if (action === 'REJECT') {
    if (!reject_reason || !reject_reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối đề tài để thông báo cho sinh viên (UC14 3a).');
    }
    topic.status = 'FAILED';
    topic.reject_reason = reject_reason.trim();
    memberIds.forEach((sid) =>
      pushNotification(
        db,
        sid,
        `Đề tài [${topic.topic_id}] "${topic.title}" bị Khoa từ chối sơ bộ. Lý do: ${reject_reason.trim()}`
      )
    );
    saveDatabase(db);
    return { message: 'Đã từ chối đề tài và gửi thông báo cho nhóm sinh viên.' };
  }

  // Nếu đề tài do GVHD tuyển sinh đã có sẵn lecturer_id và chốt nhóm -> Admin duyệt cho chạy IN_PROGRESS luôn
  if (topic.created_by_role === 'LECTURER' && topic.lecturer_id && !lecturer_id) {
    topic.status = 'IN_PROGRESS';
    if (!db.tasks.some((tk) => tk.topic_id === topicId)) {
      db.tasks.push(
        {
          task_id: `tsk-${Date.now()}-1`,
          topic_id: topicId,
          title: 'Tuần 1-2: Hoàn thiện đề cương chi tiết & Kế hoạch thực hiện',
          status: 'Chờ đánh giá',
        },
        {
          task_id: `tsk-${Date.now()}-2`,
          topic_id: topicId,
          title: 'Tuần 3-7: Xây dựng sản phẩm & Báo cáo tiến độ định kỳ',
          status: 'Chờ đánh giá',
        }
      );
    }
    memberIds.forEach((sid) =>
      pushNotification(
        db,
        sid,
        `Khoa đã phê duyệt chính thức đề tài [${topic.topic_id}] "${topic.title}". Bảng tiến độ Kanban đã mở!`
      )
    );
    saveDatabase(db);
    return { message: 'Đã phê duyệt chính thức đề tài vào giai đoạn Đang thực hiện (IN_PROGRESS).' };
  }

  // Đề tài sinh viên tự đề xuất -> Phân công GVHD (UC15)
  if (!lecturer_id) {
    throw new Error('Vui lòng chọn Giảng viên hướng dẫn để phân công cho đề tài.');
  }

  topic.lecturer_id = lecturer_id;
  topic.status = 'PENDING_LECTURER';

  pushNotification(
    db,
    lecturer_id,
    `Khoa CNTT vừa phân công Thầy/Cô hướng dẫn đề tài [${topic.topic_id}] "${topic.title}". Vui lòng xác nhận tiếp nhận.`
  );
  memberIds.forEach((sid) =>
    pushNotification(
      db,
      sid,
      `Đề tài [${topic.topic_id}] đã được Khoa duyệt sơ bộ và phân công GVHD. Đang chờ GVHD xác nhận tiếp nhận.`
    )
  );

  saveDatabase(db);
  return { message: 'Đã duyệt sơ bộ và phân công Giảng viên hướng dẫn (Chờ GVHD xác nhận).' };
}

// UC10 - GVHD xác nhận tiếp nhận hoặc từ chối đề tài do Khoa phân công
export function apiLecturerConfirmAssignment(topicId, { accept, reject_reason }) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const memberIds = db.topic_members
    .filter((tm) => tm.topic_id === topicId && tm.status === 'APPROVED')
    .map((tm) => tm.student_id);

  if (!accept) {
    if (!reject_reason || !reject_reason.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối nhận hướng dẫn để Khoa phân công giảng viên khác (UC10 3a).');
    }
    const prevLecturer = db.users.find((u) => u.user_id === topic.lecturer_id);
    topic.lecturer_id = null;
    topic.status = 'PENDING_ADMIN';
    topic.lecturer_reject_note = `${prevLecturer?.full_name || 'GVHD'} từ chối: ${reject_reason.trim()}`;

    db.users
      .filter((u) => u.role === 'ADMIN')
      .forEach((ad) =>
        pushNotification(
          db,
          ad.user_id,
          `GVHD ${prevLecturer?.full_name || ''} đã từ chối nhận đề tài [${topic.topic_id}] với lý do: "${reject_reason.trim()}". Vui lòng phân công GVHD khác.`
        )
      );
    saveDatabase(db);
    return { message: 'Đã gửi phản hồi từ chối về Khoa để phân công giảng viên khác.' };
  }

  // Đồng ý nhận hướng dẫn -> Chuyển sang IN_PROGRESS & mở khóa Kanban (UC10 bước 4-5)
  topic.status = 'IN_PROGRESS';
  if (!db.tasks.some((tk) => tk.topic_id === topicId)) {
    db.tasks.push(
      {
        task_id: `tsk-${Date.now()}-1`,
        topic_id: topicId,
        title: 'Tuần 1-2: Nộp đề cương chi tiết & Lập kế hoạch thực hiện',
        status: 'Chờ đánh giá',
      },
      {
        task_id: `tsk-${Date.now()}-2`,
        topic_id: topicId,
        title: 'Tuần 3-7: Triển khai nghiên cứu, lập trình & Báo cáo tiến độ',
        status: 'Chờ đánh giá',
      },
      {
        task_id: `tsk-${Date.now()}-3`,
        topic_id: topicId,
        title: 'Tuần 8-10: Hoàn thiện báo cáo tổng kết & Chuẩn bị bảo vệ',
        status: 'Chờ đánh giá',
      }
    );
  }

  memberIds.forEach((sid) =>
    pushNotification(
      db,
      sid,
      `Giảng viên hướng dẫn đã chấp nhận đề tài [${topic.topic_id}] "${topic.title}". Bảng tiến độ Kanban đã được mở khóa!`
    )
  );

  saveDatabase(db);
  return { message: 'Đã xác nhận tiếp nhận hướng dẫn! Bảng theo dõi tiến độ Kanban đã mở.' };
}

// ============================================================================
// 3. QUẢN LÝ TIẾN ĐỘ KANBAN, TÀI LIỆU & ĐIỂM QUÁ TRÌNH (UC06, UC11, UC12)
// ============================================================================

// POST /api/documents/upload (UC06 - Sinh viên nộp tài liệu & báo cáo tiến độ thực tế)
export function apiUploadDocument(studentUser, { topic_id, file, fileDataUrl, description, createTaskTitle }) {
  const fileCheck = validateDocumentFile(file);
  if (!fileCheck.valid) {
    throw new Error(fileCheck.message);
  }
  if (!description || !description.trim()) {
    throw new Error('Vui lòng nhập mô tả ngắn gọn cho tệp báo cáo.');
  }

  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topic_id);
  if (!topic) throw new Error('Không tìm thấy đề tài.');
  if (topic.status !== 'IN_PROGRESS') {
    throw new Error('Chỉ có thể tải lên tài liệu khi đề tài đang ở trạng thái Đang thực hiện (IN_PROGRESS).');
  }

  // Kiểm tra hạn chót trên Timeline (Luồng thay thế 4b UC06: gắn cờ LATE nếu quá hạn)
  const now = new Date();
  let submitStatus = 'ON_TIME';
  const activeTimelines = db.timelines || [];
  if (activeTimelines.length > 0) {
    const reportTimeline = activeTimelines[activeTimelines.length - 1];
    if (reportTimeline && new Date(reportTimeline.end_date) < now) {
      submitStatus = 'LATE';
    }
  }

  const safeName = file.name.replace(/\s+/g, '_');
  const savedFileName = `${topic_id}_${ safeName }`;
  const newDoc = {
    document_id: `doc-${Date.now()}`,
    topic_id,
    file_name: file.name,
    file_size: file.size || 0,
    file_url: `/uploads/${savedFileName}`,
    download_url: `/api/documents/download/${encodeURIComponent(savedFileName)}`,
    file_data_url: fileDataUrl || '',
    description: description.trim(),
    submit_status: submitStatus,
    created_at: now.toISOString(),
  };

  // Đẩy tệp vật lý thật lên máy chủ Backend (/api/documents/upload) qua FormData
  try {
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('topic_id', topic_id);
    formData.append('description', description.trim());
    formData.append('submit_status', submitStatus);
    formData.append('saved_file_name', savedFileName);

    const headers = {};
    if (parsedSession && parsedSession.token) {
      headers['Authorization'] = `Bearer ${parsedSession.token}`;
    }
    fetch('/api/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    }).catch(function () {});
  } catch {
    // Tiếp tục lưu trữ đồng bộ
  }

  db.documents.unshift(newDoc);

  if (createTaskTitle && createTaskTitle.trim()) {
    db.tasks.push({
      task_id: `tsk-${Date.now()}`,
      topic_id,
      title: createTaskTitle.trim(),
      status: 'Chờ đánh giá',
    });
  }

  if (topic.lecturer_id) {
    pushNotification(
      db,
      topic.lecturer_id,
      `Nhóm sinh viên đề tài [${topic.topic_id}] vừa tải lên tệp báo cáo mới: "${file.name}" (${submitStatus === 'LATE' ? 'Nộp trễ' : 'Đúng hạn'}).`
    );
  }

  saveDatabase(db);
  return {
    document: newDoc,
    message:
      submitStatus === 'LATE'
        ? 'Đã tải tệp báo cáo lên thành công (Ghi nhận trạng thái Nộp trễ hạn - LATE).'
        : 'Đã tải tệp báo cáo lên thành công! Bạn có thể bấm Xem file hoặc Tải về ngay bên dưới.',
  };
}

// PUT /api/tasks/:id (UC11 - GVHD kéo thả thẻ Kanban & Viết góp ý)
export function apiUpdateTaskAndComment(user, { task_id, topic_id, new_status, comment_content, new_task_title }) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topic_id);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  if (new_task_title && new_task_title.trim()) {
    db.tasks.push({
      task_id: `tsk-${Date.now()}`,
      topic_id,
      title: new_task_title.trim(),
      status: 'Chờ đánh giá',
    });
  }

  if (task_id && new_status) {
    const task = db.tasks.find((tk) => tk.task_id === task_id);
    if (task) {
      task.status = new_status;
    }
  }

  if (comment_content && comment_content.trim()) {
    db.comments.push({
      comment_id: `cmt-${Date.now()}`,
      topic_id,
      user_id: user.user_id,
      content: comment_content.trim(),
      created_at: new Date().toISOString(),
    });
  }

  const memberIds = db.topic_members
    .filter((tm) => tm.topic_id === topic_id && tm.status === 'APPROVED')
    .map((tm) => tm.student_id);

  memberIds.forEach((sid) =>
    pushNotification(
      db,
      sid,
      `GVHD ${user.full_name} vừa cập nhật đánh giá tiến độ / nhận xét cho đề tài [${topic.topic_id}].`
    )
  );

  saveDatabase(db);
  return { message: 'Đã cập nhật bảng tiến độ Kanban & lưu phản hồi chuyên môn.' };
}

// POST /api/scores/process (UC12 - GVHD chốt điểm quá trình & Xác nhận đủ điều kiện bảo vệ)
export function apiSubmitProcessScore(lecturerUser, { topic_id, score, comment, is_eligible }) {
  const scoreCheck = validateScoreValue(score);
  if (!scoreCheck.valid) {
    throw new Error(scoreCheck.message);
  }

  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topic_id);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const hasReport = db.documents.some((d) => d.topic_id === topic_id);
  if (!hasReport) {
    throw new Error('Sinh viên chưa nộp tệp báo cáo lên hệ thống. Chưa thể chốt hồ sơ bảo vệ (Tiền điều kiện UC12).');
  }

  const numScore = scoreCheck.value;

  // Cập nhật hoặc thêm mới điểm PROCESS
  const existingIdx = db.scores.findIndex(
    (s) => s.topic_id === topic_id && s.score_type === 'PROCESS'
  );
  const scoreRecord = {
    score_id: existingIdx !== -1 ? db.scores[existingIdx].score_id : `scr-proc-${Date.now()}`,
    topic_id,
    user_id: lecturerUser.user_id,
    score_value: numScore,
    comment: (comment || '').trim() || 'Đánh giá quá trình của Giảng viên hướng dẫn.',
    score_type: 'PROCESS',
  };

  if (existingIdx !== -1) {
    db.scores[existingIdx] = scoreRecord;
  } else {
    db.scores.push(scoreRecord);
  }

  const memberIds = db.topic_members
    .filter((tm) => tm.topic_id === topic_id && tm.status === 'APPROVED')
    .map((tm) => tm.student_id);

  // Luồng thay thế 4a UC12: Điểm < 5.0 -> Tự động bỏ tích đủ điều kiện, báo Không đủ điểm bảo vệ, chuyển sang FAILED
  if (numScore < 5.0 || !is_eligible) {
    topic.status = 'FAILED';
    memberIds.forEach((sid) =>
      pushNotification(
        db,
        sid,
        `Đề tài [${topic.topic_id}] đạt ${numScore}/10 điểm quá trình (< 5.0): Không đủ điều kiện ra Hội đồng bảo vệ (Trạng thái: Không đạt).`
      )
    );
    saveDatabase(db);
    return {
      eligible: false,
      status: 'FAILED',
      message: 'Điểm quá trình < 5.0: Sinh viên không đủ điểm bảo vệ. Đề tài chuyển sang trạng thái Không đạt (FAILED).',
    };
  }

  // Điểm >= 5.0 -> Khóa upload của SV và chuyển sang PENDING_COUNCIL (Rule 4 & UC12)
  topic.status = 'PENDING_COUNCIL';
  memberIds.forEach((sid) =>
    pushNotification(
      db,
      sid,
      `Chúc mừng! GVHD đã chốt điểm quá trình (${numScore}/10) và xác nhận đề tài [${topic.topic_id}] ĐỦ ĐIỀU KIỆN BẢO VỆ trước Hội đồng Khoa học.`
    )
  );

  saveDatabase(db);
  return {
    eligible: true,
    status: 'PENDING_COUNCIL',
    message: `Đã chốt điểm quá trình (${numScore}/10) và chuyển đề tài sang trạng thái Chờ bảo vệ (PENDING_COUNCIL)!`,
  };
}

// ============================================================================
// 4. HỘI ĐỒNG KHOA HỌC & QUẢN TRỊ KHOA (UC13, UC16, UC17, UC20, UC21)
// ============================================================================

// POST /api/councils (UC16 - Thành lập Hội đồng & Phân bổ đề tài kèm kiểm tra xung đột lợi ích)
export function apiCreateCouncilAndAssignTopics({ name, chairman_id, secretary_id, member_id, topic_ids = [] }) {
  if (!name?.trim()) {
    throw new Error('Vui lòng nhập Tên Hội đồng Khoa học.');
  }
  if (!chairman_id || !secretary_id || !member_id) {
    throw new Error('Vui lòng chọn đầy đủ 3 vị trí: Chủ tịch, Thư ký và Ủy viên Hội đồng.');
  }
  const uniqueMembers = new Set([chairman_id, secretary_id, member_id]);
  if (uniqueMembers.size < 3) {
    throw new Error('Ba vị trí Chủ tịch, Thư ký và Ủy viên trong một Hội đồng phải là 3 giảng viên khác nhau.');
  }

  const db = loadDatabase();
  const userMap = new Map(db.users.map((u) => [u.user_id, u]));

  // Luồng thay thế 6a UC16: Kiểm tra Xung đột lợi ích (GVHD không được nằm trong Hội đồng chấm đề tài của chính mình)
  for (const tid of topic_ids) {
    const topic = db.topics.find((t) => t.topic_id === tid);
    if (!topic) continue;
    if (topic.lecturer_id && uniqueMembers.has(topic.lecturer_id)) {
      const conflictLecturer = userMap.get(topic.lecturer_id);
      throw new Error(
        `Vi phạm xung đột lợi ích (UC16): Không thể gán! ${conflictLecturer?.full_name || 'Giảng viên'} là GVHD của đề tài [${topic.topic_id}] "${topic.title}".`
      );
    }
  }

  const newCouncilId = `council-${Date.now()}`;
  const newCouncil = {
    council_id: newCouncilId,
    name: name.trim(),
    created_at: new Date().toISOString(),
  };
  db.councils.unshift(newCouncil);

  db.council_members.push(
    { id: `cm-${Date.now()}-1`, council_id: newCouncilId, lecturer_id: chairman_id, role_in_council: 'CHUTICH' },
    { id: `cm-${Date.now()}-2`, council_id: newCouncilId, lecturer_id: secretary_id, role_in_council: 'THUKY' },
    { id: `cm-${Date.now()}-3`, council_id: newCouncilId, lecturer_id: member_id, role_in_council: 'UYVIEN' }
  );

  for (const tid of topic_ids) {
    const topic = db.topics.find((t) => t.topic_id === tid);
    if (topic) {
      topic.council_id = newCouncilId;
    }
  }

  [chairman_id, secretary_id, member_id].forEach((lid) =>
    pushNotification(
      db,
      lid,
      `Thầy/Cô đã được phân công tham gia "${newCouncil.name}" với ${topic_ids.length} đề tài chờ chấm bảo vệ.`
    )
  );

  saveDatabase(db);
  return { council: newCouncil, message: 'Thành lập Hội đồng Khoa học và phân bổ đề tài thành công!' };
}

// Gán bổ sung đề tài vào Hội đồng đã có (kèm kiểm tra xung đột lợi ích UC16 6a)
export function apiAssignTopicToExistingCouncil(topicId, councilId) {
  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  const council = db.councils.find((c) => c.council_id === councilId);
  if (!topic || !council) throw new Error('Không tìm thấy đề tài hoặc Hội đồng.');

  const councilLecturerIds = new Set(
    db.council_members.filter((cm) => cm.council_id === councilId).map((cm) => cm.lecturer_id)
  );

  if (topic.lecturer_id && councilLecturerIds.has(topic.lecturer_id)) {
    const conflictGv = db.users.find((u) => u.user_id === topic.lecturer_id);
    throw new Error(
      `Không thể gán! ${conflictGv?.full_name || 'GVHD'} là GVHD của đề tài [${topic.topic_id}] và đang là thành viên của "${council.name}" (Vi phạm xung đột lợi ích UC16).`
    );
  }

  topic.council_id = councilId;
  saveDatabase(db);
  return { message: `Đã phân bổ đề tài [${topic.topic_id}] vào "${council.name}".` };
}

// POST /api/scores/council (UC20 - Hội đồng Khoa học chấm điểm & nhận xét phản biện)
export function apiSubmitCouncilScore(councilUser, { topic_id, score, comment }) {
  const scoreCheck = validateScoreValue(score);
  if (!scoreCheck.valid) {
    throw new Error(scoreCheck.message);
  }
  if (!comment || !comment.trim()) {
    throw new Error('Vui lòng nhập nhận xét phản biện chuyên môn đi kèm điểm số.');
  }

  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topic_id);
  if (!topic) throw new Error('Không tìm thấy đề tài.');
  if (topic.status === 'COMPLETED' || topic.status === 'FAILED') {
    throw new Error('Đề tài này đã chốt nghiệm thu và đóng băng dữ liệu. Không thể chỉnh sửa điểm.');
  }

  const existingIdx = db.scores.findIndex(
    (s) => s.topic_id === topic_id && s.user_id === councilUser.user_id && s.score_type === 'FINAL'
  );

  const scoreObj = {
    score_id: existingIdx !== -1 ? db.scores[existingIdx].score_id : `scr-final-${Date.now()}`,
    topic_id,
    user_id: councilUser.user_id,
    score_value: scoreCheck.value,
    comment: comment.trim(),
    score_type: 'FINAL',
  };

  if (existingIdx !== -1) {
    db.scores[existingIdx] = scoreObj;
  } else {
    db.scores.push(scoreObj);
  }

  saveDatabase(db);
  return { score: scoreObj, message: 'Đã lưu điểm bảo vệ và nhận xét phản biện vào CSDL.' };
}

// PUT /api/topics/:id/finalize (UC21 - Hội đồng chốt quyết định nghiệm thu & Đóng băng dữ liệu)
export function apiFinalizeTopicDefense(topicId, finalDecision) {
  if (!['COMPLETED', 'FAILED'].includes(finalDecision)) {
    throw new Error('Quyết định nghiệm thu không hợp lệ.');
  }

  const db = loadDatabase();
  const topic = db.topics.find((t) => t.topic_id === topicId);
  if (!topic) throw new Error('Không tìm thấy đề tài.');

  const finalScores = db.scores.filter((s) => s.topic_id === topicId && s.score_type === 'FINAL');
  if (finalScores.length === 0) {
    throw new Error('Hội đồng cần nhập ít nhất 01 đầu điểm bảo vệ trước khi chốt quyết định nghiệm thu.');
  }

  topic.status = finalDecision;
  topic.is_frozen = true;

  const avgScore = (finalScores.reduce((acc, s) => acc + s.score_value, 0) / finalScores.length).toFixed(2);
  const memberIds = db.topic_members
    .filter((tm) => tm.topic_id === topicId && tm.status === 'APPROVED')
    .map((tm) => tm.student_id);

  memberIds.forEach((sid) =>
    pushNotification(
      db,
      sid,
      `Hội đồng Khoa học đã chốt nghiệm thu đề tài [${topic.topic_id}] "${topic.title}": ${
        finalDecision === 'COMPLETED' ? 'ĐẠT (COMPLETED)' : 'KHÔNG ĐẠT (FAILED)'
      } — Điểm TB Bảo vệ: ${avgScore}/10.`
    )
  );

  saveDatabase(db);
  return {
    message: `Đã chốt quyết định nghiệm thu (${
      finalDecision === 'COMPLETED' ? 'Hoàn thành - Đạt' : 'Không đạt'
    }) và đóng băng toàn bộ dữ liệu đề tài!`,
  };
}

// UC13 - Quản lý Timeline đợt đăng ký
export function apiCreateOrUpdateTimeline({ timeline_id, event_name, start_date, end_date }) {
  if (!event_name || !event_name.trim()) {
    throw new Error('Vui lòng nhập tên sự kiện / đợt đăng ký.');
  }
  const dateCheck = validateTimelineDates(start_date, end_date);
  if (!dateCheck.valid) {
    throw new Error(dateCheck.message);
  }

  const db = loadDatabase();
  if (timeline_id) {
    const idx = db.timelines.findIndex((tl) => tl.timeline_id === timeline_id);
    if (idx !== -1) {
      db.timelines[idx] = {
        ...db.timelines[idx],
        event_name: event_name.trim(),
        start_date: new Date(start_date).toISOString(),
        end_date: new Date(end_date).toISOString(),
      };
    }
  } else {
    db.timelines.push({
      timeline_id: `tl-${Date.now()}`,
      event_name: event_name.trim(),
      start_date: new Date(start_date).toISOString(),
      end_date: new Date(end_date).toISOString(),
    });
  }

  saveDatabase(db);
  return { message: 'Đã lưu cấu hình mốc thời gian (Timeline) thành công!' };
}

export function apiDeleteTimeline(timelineId) {
  const db = loadDatabase();
  db.timelines = db.timelines.filter((tl) => tl.timeline_id !== timelineId);
  saveDatabase(db);
  return { message: 'Đã xóa mốc thời gian.' };
}

// UC17 - Quản lý Danh mục (Category: FIELD / MAJOR) & Tài khoản
export function apiCreateCategory({ name, type }) {
  if (!name || !name.trim()) {
    throw new Error('Vui lòng nhập tên danh mục.');
  }
  const db = loadDatabase();
  const exists = db.categories.some(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.type === type
  );
  // Luồng thay thế 4a UC17: Chặn trùng lặp tên danh mục
  if (exists) {
    throw new Error('Tên danh mục đã tồn tại.');
  }

  const newCat = {
    category_id: `cat-${Date.now()}`,
    name: name.trim(),
    type: type === 'FIELD' ? 'FIELD' : 'MAJOR',
  };
  db.categories.push(newCat);
  saveDatabase(db);
  return { category: newCat, message: 'Đã thêm danh mục mới thành công!' };
}

export function apiDeleteCategory(categoryId) {
  const db = loadDatabase();
  db.categories = db.categories.filter((c) => c.category_id !== categoryId);
  saveDatabase(db);
  return { message: 'Đã xóa danh mục.' };
}

export function apiToggleUserLock(userId) {
  const db = loadDatabase();
  const user = db.users.find((u) => u.user_id === userId);
  if (!user) throw new Error('Không tìm thấy người dùng.');
  if (user.role === 'ADMIN') throw new Error('Không thể khóa tài khoản Quản trị viên Khoa.');
  user.is_locked = !user.is_locked;
  saveDatabase(db);
  return {
    user,
    message: user.is_locked ? `Đã khóa tài khoản ${user.full_name}.` : `Đã mở khóa tài khoản ${user.full_name}.`,
  };
}

// Dành cho người có quyền hạn cao nhất (ADMIN): Tạo tài khoản người dùng mới
export function apiCreateUserByAdmin({ full_name, email, user_code, phone = '', role = 'STUDENT', department_id = 'cat-major-1' }) {
  const emailCheck = validateVluEmail(email);
  if (!emailCheck.valid) {
    throw new Error(emailCheck.message);
  }
  if (!full_name || !full_name.trim()) {
    throw new Error('Vui lòng nhập họ và tên người dùng.');
  }
  if (!user_code || !user_code.trim()) {
    throw new Error('Vui lòng nhập Mã số (MSSV hoặc Mã Giảng viên).');
  }

  const db = loadDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = user_code.trim();

  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error(`Email "${normalizedEmail}" đã tồn tại trong hệ thống.`);
  }
  if (db.users.some((u) => u.user_code.toLowerCase() === normalizedCode.toLowerCase())) {
    throw new Error(`Mã số "${normalizedCode}" đã tồn tại trong hệ thống.`);
  }

  const newUser = {
    user_id: `usr-${Date.now()}`,
    email: normalizedEmail,
    password_hash: 'vlu_sso_authenticated',
    full_name: full_name.trim(),
    user_code: normalizedCode,
    phone: (phone || '').trim(),
    role,
    department_id: department_id || 'cat-major-1',
    is_locked: false,
  };

  db.users.push(newUser);
  saveDatabase(db);
  return {
    user: newUser,
    message: `Đã tạo tài khoản "${newUser.full_name}" (${newUser.role}) thành công!`,
  };
}

// Dành cho người có quyền hạn cao nhất (ADMIN): Thay đổi phân quyền (Role) của tài khoản
export function apiUpdateUserRoleByAdmin(currentAdminId, targetUserId, newRole) {
  if (!['STUDENT', 'LECTURER', 'ADMIN'].includes(newRole)) {
    throw new Error('Vai trò phân quyền không hợp lệ.');
  }
  const db = loadDatabase();
  const user = db.users.find((u) => u.user_id === targetUserId);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản người dùng.');
  }
  if (user.user_id === currentAdminId && newRole !== 'ADMIN') {
    throw new Error('Bạn không thể tự hạ quyền Quản trị viên của chính tài khoản đang đăng nhập.');
  }
  user.role = newRole;
  saveDatabase(db);
  return {
    user,
    message: `Đã cập nhật vai trò của "${user.full_name}" thành ${newRole}.`,
  };
}

// Dành cho người có quyền hạn cao nhất (ADMIN): XÓA VĨNH VIỄN TÀI KHOẢN NGƯỜI DÙNG KHỎI HỆ THỐNG
export function apiDeleteUserByAdmin(currentAdminId, targetUserId) {
  const db = loadDatabase();
  const targetUser = db.users.find((u) => u.user_id === targetUserId);
  if (!targetUser) {
    throw new Error('Không tìm thấy tài khoản cần xóa.');
  }
  if (targetUser.user_id === currentAdminId) {
    throw new Error('Không thể tự xóa tài khoản Quản trị viên đang đăng nhập hiện tại.');
  }

  // Xóa người dùng khỏi bảng users
  db.users = db.users.filter((u) => u.user_id !== targetUserId);

  // Dọn dẹp toàn bộ dữ liệu liên kết của tài khoản bị xóa
  db.topic_members = db.topic_members.filter((tm) => tm.student_id !== targetUserId);
  db.council_members = db.council_members.filter((cm) => cm.lecturer_id !== targetUserId);
  db.comments = db.comments.filter((c) => c.user_id !== targetUserId);
  db.scores = db.scores.filter((s) => s.user_id !== targetUserId);
  db.notifications = db.notifications.filter((n) => n.user_id !== targetUserId);

  // Nếu giảng viên bị xóa đang hướng dẫn đề tài nào thì gỡ giảng viên đó ra để Khoa phân công người khác
  db.topics.forEach((t) => {
    if (t.lecturer_id === targetUserId) {
      t.lecturer_id = null;
      if (t.status === 'PENDING_LECTURER') {
        t.status = 'PENDING_ADMIN';
      }
    }
  });

  saveDatabase(db);
  syncBackendHttp(`/users/${targetUserId}`, 'DELETE');
  return {
    message: `Đã xóa vĩnh viễn tài khoản "${targetUser.full_name}" (${targetUser.email}) khỏi hệ thống!`,
  };
}

export function apiMarkNotificationsRead(userId) {
  const db = loadDatabase();
  db.notifications.forEach((n) => {
    if (n.user_id === userId) n.is_read = true;
  });
  saveDatabase(db);
}
