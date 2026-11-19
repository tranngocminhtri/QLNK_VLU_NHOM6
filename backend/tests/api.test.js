// =========================================================================
// KIỂM THỬ API (chạy thật qua HTTP) theo các Use Case và Business Rule trong đề cương.
// Yêu cầu: máy chủ đang chạy với CSDL vừa nạp dữ liệu mẫu (npm run prisma:seed).
// Chạy: npm test   (đổi địa chỉ bằng biến API_URL, mặc định http://localhost:5000/api)
// Các bước chạy tuần tự và làm thay đổi dữ liệu -> nạp lại dữ liệu mẫu trước mỗi lần chạy.
// =========================================================================
const { test } = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API_URL || 'http://localhost:5000/api';
const MAT_KHAU = process.env.SEED_PASSWORD || 'vlu@2026';

async function goi(duongDan, { token, method = 'GET', body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + duongDan, {
    method,
    headers,
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const laJson = (res.headers.get('content-type') || '').includes('json');
  return { status: res.status, data: laJson ? await res.json() : await res.arrayBuffer() };
}

async function dangNhap(email) {
  const { status, data } = await goi('/auth/login', { method: 'POST', body: { email, password: MAT_KHAU } });
  assert.equal(status, 200, `Đăng nhập ${email} thất bại: ${data.message}`);
  return data.token;
}

const tk = {};

test('UC01: đăng nhập bằng mật khẩu băm, chặn sai mật khẩu, email ngoài trường và tài khoản bị khóa', async () => {
  tk.sv = await dangNhap('tri.2274802010926@vanlanguni.vn');
  tk.svKhac = await dangNhap('khang.2374802010666@vanlanguni.vn');
  tk.gvHai = await dangNhap('hai.nt@vanlanguni.vn');
  tk.gvHung = await dangNhap('hung.dk@vanlanguni.vn');
  tk.chuTich = await dangNhap('bao.vnq@vanlanguni.vn');
  tk.uyVien = await dangNhap('viet.tn@vanlanguni.vn');
  tk.admin = await dangNhap('chau.lth@vanlanguni.vn');

  const saiMk = await goi('/auth/login', { method: 'POST', body: { email: 'hai.nt@vanlanguni.vn', password: 'sai' } });
  assert.equal(saiMk.status, 401);
  const gmail = await goi('/auth/login', { method: 'POST', body: { email: 'a@gmail.com', password: MAT_KHAU } });
  assert.equal(gmail.status, 400);
  const biKhoa = await goi('/auth/login', {
    method: 'POST',
    body: { email: 'khoatk.2274802010999@vanlanguni.vn', password: MAT_KHAU },
  });
  assert.equal(biKhoa.status, 403);
});

test('JWT/RBAC: chặn token giả, chặn sinh viên gọi API của Admin', async () => {
  assert.equal((await goi('/data')).status, 401);
  assert.equal((await goi('/data', { token: 'jwt_vlu_usr-admin-chau_ADMIN' })).status, 401);
  const svGoiAdmin = await goi('/categories', { token: tk.sv, method: 'POST', body: { name: 'X', type: 'FIELD' } });
  assert.equal(svGoiAdmin.status, 403);
});

test('Dữ liệu theo vai trò: không lộ mật khẩu, sinh viên không xem tài liệu/điểm nhóm khác', async () => {
  const { status, data } = await goi('/data', { token: tk.sv });
  assert.equal(status, 200);
  assert.ok(data.users.every((u) => !('password_hash' in u)));
  const deTaiMinh = data.topics.find((t) => t.topic_id === 'DT-2026-001');
  const deTaiKhac = data.topics.find((t) => t.topic_id === 'DT-2026-009');
  assert.ok(deTaiMinh.documents.length > 0);
  assert.ok(deTaiMinh.documents.every((d) => !('file_url' in d)));
  assert.equal(deTaiKhac.documents.length, 0);
  assert.equal(deTaiKhac.scores.length, 0);
  assert.ok(data.notifications.every((n) => n.user_id === 'usr-sv-tri'));

  const congKhai = await goi('/public/overview');
  assert.equal(congKhai.status, 200);
  assert.ok(congKhai.data.topics.length >= 10);
});

test('Tải file: thành viên nhóm xem được, sinh viên nhóm khác bị chặn (không xem trộm)', async () => {
  const cuaMinh = await goi('/documents/doc-001-1/file', { token: tk.sv });
  assert.equal(cuaMinh.status, 200);
  assert.equal(Buffer.from(cuaMinh.data).subarray(0, 4).toString(), '%PDF');
  assert.equal((await goi('/documents/doc-001-1/file', { token: tk.svKhac })).status, 403);
});

test('UC03: cập nhật hồ sơ, chặn số điện thoại chứa chữ', async () => {
  const sai = await goi('/users/profile', { token: tk.svKhac, method: 'PUT', body: { full_name: 'A', phone: '09abc' } });
  assert.equal(sai.status, 400);
  const dung = await goi('/users/profile', {
    token: tk.svKhac,
    method: 'PUT',
    body: { full_name: 'Lê Minh Khang', phone: '0901234567' },
  });
  assert.equal(dung.status, 200);
  assert.equal(dung.data.user.phone, '0901234567');
});

test('UC04 + Rule 2 + UC22: chặn sinh viên đã có nhóm, chặn đề tài trùng >= 30%, cho phép đề tài mới', async () => {
  const daCoNhom = await goi('/topics', { token: tk.sv, method: 'POST', body: { title: 'Đề tài mới hoàn toàn', summary: 'abc' } });
  assert.equal(daCoNhom.status, 400);

  const trung = await goi('/topics', {
    token: tk.svKhac,
    method: 'POST',
    body: {
      title: 'Xây dựng Hệ thống Quản lý Nghiên cứu Khoa học Sinh viên ứng dụng Kiểm tra Trùng lặp Cosine Similarity',
      summary: 'Số hóa quy trình đăng ký đề tài',
    },
  });
  assert.equal(trung.status, 400);
  assert.match(trung.data.message, /trùng lặp/);

  const moi = await goi('/topics', {
    token: tk.svKhac,
    method: 'POST',
    body: { title: 'Ứng dụng học tăng cường điều khiển đèn tín hiệu giao thông', summary: 'Mô phỏng SUMO, tối ưu thời gian chờ tại nút giao.' },
  });
  assert.equal(moi.status, 201, moi.data.message);
  assert.equal(moi.data.topic.status, 'PENDING_ADMIN');
  tk.deTaiMoi = moi.data.topic.topic_id;
});

test('UC14 + UC15 + UC10: Admin phân công GVHD, GVHD nhận hướng dẫn -> IN_PROGRESS và mở Kanban', async () => {
  const phanCong = await goi(`/topics/${tk.deTaiMoi}/assign`, {
    token: tk.admin,
    method: 'PUT',
    body: { action: 'APPROVE', lecturer_id: 'usr-gv-hai' },
  });
  assert.equal(phanCong.status, 200, phanCong.data.message);

  const nguoiKhac = await goi(`/topics/${tk.deTaiMoi}/confirm`, { token: tk.gvHung, method: 'PUT', body: { accept: true } });
  assert.equal(nguoiKhac.status, 403);

  const nhan = await goi(`/topics/${tk.deTaiMoi}/confirm`, { token: tk.gvHai, method: 'PUT', body: { accept: true } });
  assert.equal(nhan.status, 200);
  const { data } = await goi('/data', { token: tk.svKhac });
  const deTai = data.topics.find((t) => t.topic_id === tk.deTaiMoi);
  assert.equal(deTai.status, 'IN_PROGRESS');
  assert.ok(deTai.tasks.length >= 3);
  assert.ok(data.notifications.some((n) => n.content.includes('chấp nhận đề tài')));
});

test('UC06: nộp file PDF thật, chặn sai định dạng, chặn người ngoài nhóm', async () => {
  const pdf = () => new Blob([Buffer.from('%PDF-1.4\n%%EOF')], { type: 'application/pdf' });
  const form = (ten, noiDung) => {
    const f = new FormData();
    f.append('file', noiDung, ten);
    f.append('topic_id', tk.deTaiMoi);
    f.append('description', 'Báo cáo tuần 1');
    return f;
  };
  const exe = await goi('/documents/upload', { token: tk.svKhac, method: 'POST', formData: form('virus.exe', new Blob(['x'])) });
  assert.equal(exe.status, 400);
  const nguoiNgoai = await goi('/documents/upload', { token: tk.sv, method: 'POST', formData: form('bc.pdf', pdf()) });
  assert.equal(nguoiNgoai.status, 403);
  const ok = await goi('/documents/upload', { token: tk.svKhac, method: 'POST', formData: form('bc.pdf', pdf()) });
  assert.equal(ok.status, 201, ok.data.message);
  const tai = await goi(`/documents/${ok.data.document.document_id}/file`, { token: tk.gvHai });
  assert.equal(tai.status, 200);
});

test('UC11 + UC12: GVHD góp ý, kéo thẻ Kanban, chốt điểm quá trình -> PENDING_COUNCIL', async () => {
  const { data } = await goi('/data', { token: tk.gvHai });
  const the = data.topics.find((t) => t.topic_id === tk.deTaiMoi).tasks[0];
  const keo = await goi(`/tasks/${the.task_id}`, { token: tk.gvHai, method: 'PUT', body: { status: 'Hoàn thành', comment: 'Tốt' } });
  assert.equal(keo.status, 200);
  const gvKhac = await goi(`/tasks/${the.task_id}`, { token: tk.gvHung, method: 'PUT', body: { status: 'Hoàn thành' } });
  assert.equal(gvKhac.status, 403);

  const diemSai = await goi('/scores/process', { token: tk.gvHai, method: 'POST', body: { topic_id: tk.deTaiMoi, score: 11, is_eligible: true } });
  assert.equal(diemSai.status, 400);
  const chot = await goi('/scores/process', {
    token: tk.gvHai,
    method: 'POST',
    body: { topic_id: tk.deTaiMoi, score: 8.5, is_eligible: true },
  });
  assert.equal(chot.status, 200, chot.data.message);
  assert.equal(chot.data.status, 'PENDING_COUNCIL');
});

test('UC16: chặn xung đột lợi ích (GVHD ngồi trong Hội đồng chấm đề tài của mình)', async () => {
  const xungDot = await goi('/councils', {
    token: tk.admin,
    method: 'POST',
    body: { name: 'HĐ thử', chairman_id: 'usr-gv-hai', secretary_id: 'usr-gv-viet', member_id: 'usr-gv-tu', topic_ids: [tk.deTaiMoi] },
  });
  assert.equal(xungDot.status, 400);
  assert.match(xungDot.data.message, /xung đột lợi ích/);
  const ok = await goi('/councils', {
    token: tk.admin,
    method: 'POST',
    body: { name: 'HĐ thử', chairman_id: 'usr-hd-bao', secretary_id: 'usr-gv-viet', member_id: 'usr-gv-tu', topic_ids: [tk.deTaiMoi] },
  });
  assert.equal(ok.status, 201, ok.data.message);
});

test('UC20 + UC21: Hội đồng chấm điểm; Ủy viên không được chốt; Chủ tịch chốt -> COMPLETED và đóng băng', async () => {
  const ngoaiHD = await goi('/scores/council', { token: tk.gvHai, method: 'POST', body: { topic_id: 'DT-2026-007', score: 9, comment: 'x' } });
  assert.equal(ngoaiHD.status, 403);
  const cham = await goi('/scores/council', {
    token: tk.uyVien,
    method: 'POST',
    body: { topic_id: 'DT-2026-007', score: 8.7, comment: 'Sản phẩm hoàn thiện.' },
  });
  assert.equal(cham.status, 201, cham.data.message);

  const uyVienChot = await goi('/topics/DT-2026-007/finalize', { token: tk.uyVien, method: 'PUT', body: { final_decision: 'COMPLETED' } });
  assert.equal(uyVienChot.status, 403);
  const chuTichChot = await goi('/topics/DT-2026-007/finalize', { token: tk.chuTich, method: 'PUT', body: { final_decision: 'COMPLETED' } });
  assert.equal(chuTichChot.status, 200, chuTichChot.data.message);

  const sauKhiDong = await goi('/scores/council', {
    token: tk.uyVien,
    method: 'POST',
    body: { topic_id: 'DT-2026-007', score: 1, comment: 'sửa' },
  });
  assert.equal(sauKhiDong.status, 400);
});

test('UC13 + UC17: Timeline sai ngày bị chặn, danh mục trùng bị chặn, khóa tài khoản có hiệu lực ngay', async () => {
  const timelineSai = await goi('/timelines', {
    token: tk.admin,
    method: 'POST',
    body: { event_name: 'Đợt 2', start_date: '2027-02-10', end_date: '2027-01-01' },
  });
  assert.equal(timelineSai.status, 400);
  const danhMucTrung = await goi('/categories', { token: tk.admin, method: 'POST', body: { name: 'công nghệ phần mềm', type: 'MAJOR' } });
  assert.equal(danhMucTrung.status, 400);

  const khoa = await goi('/users/usr-sv-tri/lock', { token: tk.admin, method: 'PUT' });
  assert.equal(khoa.status, 200);
  assert.equal((await goi('/data', { token: tk.sv })).status, 401);
  await goi('/users/usr-sv-tri/lock', { token: tk.admin, method: 'PUT' });
});

test('UC02: sau khi đăng xuất, token cũ không dùng được nữa', async () => {
  const token = await dangNhap('duong.2374802010121@vanlanguni.vn');
  assert.equal((await goi('/auth/logout', { token, method: 'POST' })).status, 200);
  assert.equal((await goi('/data', { token })).status, 401);
});
