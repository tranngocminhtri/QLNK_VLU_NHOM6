/**
 * Tầng dịch vụ gọi RESTful API tới Backend Node.js (Bảng 4.2.5 trong đề cương).
 * Mọi nghiệp vụ và kiểm tra quyền đều chạy trên máy chủ; giao diện chỉ gửi yêu cầu kèm JWT
 * và hiển thị kết quả. Lỗi từ máy chủ được ném ra dạng Error(message) để các trang hiển thị.
 */

// Địa chỉ API: mặc định '/api' (Vite proxy khi chạy cục bộ); khi deploy Vercel đặt VITE_API_URL = https://<backend>.onrender.com/api
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'VLU_SCIRES_AUTH';

// Hàm do App đăng ký để xử lý khi máy chủ báo phiên hết hạn (401)
let xuLyHetPhien = null;
export function onSessionExpired(handler) {
  xuLyHetPhien = handler;
}

export function getCurrentSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function luuPhien(session) {
  try {
    if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Trình duyệt chặn bộ nhớ (chế độ ẩn danh): phiên chỉ còn trong RAM của trang
  }
}

async function goiApi(duongDan, { method = 'GET', body, formData, raw = false } = {}) {
  const session = getCurrentSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_BASE + duongDan, {
      method,
      headers,
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error('Mạng gián đoạn, không kết nối được máy chủ. Vui lòng thử lại.');
  }

  if (raw && res.ok) return res;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && session?.token) {
    luuPhien(null);
    if (xuLyHetPhien) xuLyHetPhien(data?.message || 'Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.');
  }
  if (!res.ok) throw new Error(data?.message || `Lỗi máy chủ (${res.status}).`);
  return data;
}

// ============================================================================
// 1. XÁC THỰC & HỒ SƠ CÁ NHÂN (UC01, UC02, UC03)
// ============================================================================

function luuPhienDangNhap(ketQua) {
  const session = { token: ketQua.token, user: ketQua.user, loginAt: new Date().toISOString() };
  luuPhien(session);
  return session;
}

// POST /api/auth/google - UC01: Đăng nhập SSO bằng Google Workspace (credential là ID Token Google trả về)
export async function apiLoginWithGoogleSSO(credential) {
  return luuPhienDangNhap(await goiApi('/auth/google', { method: 'POST', body: { credential } }));
}

// POST /api/auth/login - Đăng nhập bằng email trường + mật khẩu
export async function apiLoginWithPassword(email, password) {
  return luuPhienDangNhap(await goiApi('/auth/login', { method: 'POST', body: { email, password } }));
}

// POST /api/auth/logout - UC02
export async function apiLogout() {
  try {
    await goiApi('/auth/logout', { method: 'POST' });
  } finally {
    luuPhien(null);
  }
}

// GET /api/users/profile - UC03 (đồng thời làm mới thông tin người dùng trong phiên)
export async function apiGetProfile() {
  const user = await goiApi('/users/profile');
  const session = getCurrentSession();
  if (session) luuPhien({ ...session, user });
  return user;
}

// PUT /api/users/profile - UC03
export function apiUpdateProfile(payload) {
  return goiApi('/users/profile', { method: 'PUT', body: payload });
}

// GET /api/data - Dữ liệu tổng hợp cho giao diện (đã lọc theo vai trò)
export function apiLoadData() {
  return goiApi('/data');
}

// GET /api/public/overview - Số liệu Trang chủ khi chưa đăng nhập
export function apiLoadPublicOverview() {
  return goiApi('/public/overview');
}

// ============================================================================
// 2. ĐỀ TÀI (UC04, UC05, UC08, UC09, UC10, UC14, UC15, UC22)
// ============================================================================

// POST /api/topics - UC04 (Sinh viên) / UC08 (Giảng viên); máy chủ dựa vào vai trò trong JWT
export function apiCreateTopic(payload) {
  return goiApi('/topics', { method: 'POST', body: payload });
}

// POST /api/topics/:id/apply - UC05
export function apiApplyToTopic(topicId, coverLetter) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/apply`, { method: 'POST', body: { cover_letter: coverLetter } });
}

// PUT /api/topics/:id/approve - UC09 (duyệt từng ứng viên)
export function apiReviewApplicant(topicId, memberId, status) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/approve`, { method: 'PUT', body: { member_id: memberId, status } });
}

// PUT /api/topics/:id/approve - UC09 bước 5-6 (chốt danh sách nhóm)
export function apiFinalizeRecruitingGroup(topicId) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/approve`, { method: 'PUT', body: { finalize_group: true } });
}

// PUT /api/topics/:id/assign - UC14 & UC15
export function apiAdminReviewAndAssignTopic(topicId, payload) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/assign`, { method: 'PUT', body: payload });
}

// PUT /api/topics/:id/confirm - UC10
export function apiLecturerConfirmAssignment(topicId, payload) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/confirm`, { method: 'PUT', body: payload });
}

// ============================================================================
// 3. TÀI LIỆU, TIẾN ĐỘ, ĐIỂM QUÁ TRÌNH (UC06, UC11, UC12)
// ============================================================================

// POST /api/documents/upload - UC06 (gửi file thật qua FormData)
export function apiUploadDocument({ topic_id, file, description, createTaskTitle }) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  formData.append('topic_id', topic_id);
  formData.append('description', description || '');
  if (createTaskTitle) formData.append('createTaskTitle', createTaskTitle);
  return goiApi('/documents/upload', { method: 'POST', formData });
}

// GET /api/documents/:id/file - Tải nội dung file (kèm JWT) về dạng Blob để xem trước / lưu về máy
export async function apiFetchDocumentBlob(documentId) {
  const res = await goiApi(`/documents/${encodeURIComponent(documentId)}/file`, { raw: true });
  return res.blob();
}

// UC11: tạo thẻ mới (POST /api/tasks), kéo thả thẻ (PUT /api/tasks/:id) hoặc gửi góp ý (POST /api/topics/:id/comments)
export function apiUpdateTaskAndComment({ task_id, topic_id, new_status, comment_content, new_task_title }) {
  if (new_task_title) {
    return goiApi('/tasks', { method: 'POST', body: { topic_id, title: new_task_title } });
  }
  if (task_id) {
    return goiApi(`/tasks/${encodeURIComponent(task_id)}`, {
      method: 'PUT',
      body: { status: new_status, comment: comment_content },
    });
  }
  return goiApi(`/topics/${encodeURIComponent(topic_id)}/comments`, { method: 'POST', body: { content: comment_content } });
}

// POST /api/scores/process - UC12
export function apiSubmitProcessScore(payload) {
  return goiApi('/scores/process', { method: 'POST', body: payload });
}

// ============================================================================
// 4. HỘI ĐỒNG KHOA HỌC & QUẢN TRỊ KHOA (UC13, UC16, UC17, UC20, UC21, UC23)
// ============================================================================

// POST /api/councils - UC16
export function apiCreateCouncilAndAssignTopics(payload) {
  return goiApi('/councils', { method: 'POST', body: payload });
}

// PUT /api/councils/:id/topics - UC16 (gán bổ sung)
export function apiAssignTopicToExistingCouncil(topicId, councilId) {
  return goiApi(`/councils/${encodeURIComponent(councilId)}/topics`, { method: 'PUT', body: { topic_id: topicId } });
}

// POST /api/scores/council - UC20
export function apiSubmitCouncilScore(payload) {
  return goiApi('/scores/council', { method: 'POST', body: payload });
}

// PUT /api/topics/:id/finalize - UC21
export function apiFinalizeTopicDefense(topicId, finalDecision) {
  return goiApi(`/topics/${encodeURIComponent(topicId)}/finalize`, { method: 'PUT', body: { final_decision: finalDecision } });
}

// UC13 - Timeline
export function apiCreateOrUpdateTimeline({ timeline_id, ...payload }) {
  return timeline_id
    ? goiApi(`/timelines/${encodeURIComponent(timeline_id)}`, { method: 'PUT', body: payload })
    : goiApi('/timelines', { method: 'POST', body: payload });
}

export function apiDeleteTimeline(timelineId) {
  return goiApi(`/timelines/${encodeURIComponent(timelineId)}`, { method: 'DELETE' });
}

// UC17 - Danh mục & Tài khoản
export function apiCreateCategory(payload) {
  return goiApi('/categories', { method: 'POST', body: payload });
}

export function apiDeleteCategory(categoryId) {
  return goiApi(`/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE' });
}

export function apiToggleUserLock(userId) {
  return goiApi(`/users/${encodeURIComponent(userId)}/lock`, { method: 'PUT' });
}

export function apiCreateUserByAdmin(payload) {
  return goiApi('/users', { method: 'POST', body: payload });
}

export function apiUpdateUserRoleByAdmin(targetUserId, role) {
  return goiApi(`/users/${encodeURIComponent(targetUserId)}/role`, { method: 'PUT', body: { role } });
}

export function apiDeleteUserByAdmin(targetUserId) {
  return goiApi(`/users/${encodeURIComponent(targetUserId)}`, { method: 'DELETE' });
}

export function apiResetSampleData() {
  return goiApi('/admin/reset-sample-data', { method: 'POST' });
}

// UC23 - Đánh dấu đã đọc thông báo
export function apiMarkNotificationsRead() {
  return goiApi('/notifications/read', { method: 'PUT' });
}
