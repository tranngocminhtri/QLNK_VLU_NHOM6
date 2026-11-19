// =========================================================================
// DỮ LIỆU MẪU ĐẦY ĐỦ ĐỂ KIỂM THỬ TOÀN BỘ CHỨC NĂNG HỆ THỐNG (UC01 -> UC23)
// Bao phủ đầy đủ 4 góc nhìn (Sinh viên, Giảng viên, Hội đồng, Admin Khoa)
// và tất cả 7 trạng thái vòng đời đề tài NCKH Khoa CNTT - ĐH Văn Lang
// =========================================================================

// Tạo tệp PDF 1.4 hợp lệ (nhẹ ~1KB) dưới dạng Base64 Data URL để xem trực tiếp và tải về thật trên trình duyệt
function escapePdfText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createSamplePdfDataUrl(headerTitle, bodyLines = []) {
  const commands = [
    'BT',
    '/F1 15 Tf',
    '50 760 Td',
    `(${escapePdfText(headerTitle)}) Tj`,
    '/F1 11 Tf',
    '0 -28 Td',
  ];

  bodyLines.forEach((line, idx) => {
    if (idx > 0) commands.push('0 -18 Td');
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push('ET');

  const streamContent = commands.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  if (typeof btoa === 'function') {
    return `data:application/pdf;base64,${btoa(pdf)}`;
  }
  return '';
}

const PDF_DT_001 = createSamplePdfDataUrl(
  'VLU SCIRES - DE CUONG CHI TIET NCKH (DT-2026-001)',
  [
    'Truong Dai hoc Van Lang - Khoa Cong nghe Thong tin',
    'De tai: He thong Quan ly NCKH Sinh vien ung dung Cosine Similarity',
    'Nhom SV: Tran Ngoc Minh Tri (2274802010926), Nguyen Tien Dung (2274802010102)',
    'GVHD: TS. Nguyen Tri Hai',
    '----------------------------------------------------------------',
    '1. Muc tieu: So hoa quy trinh quan ly NCKH tu dang ky den nghiem thu.',
    '2. Phuong phap: ReactJS, Node.js, PostgreSQL (Prisma) & Cosine Similarity.',
    '3. Tien do: Da hoan thanh phan tich yeu cau, thiet ke CSDL va module API.',
  ]
);

const PDF_DT_007 = createSamplePdfDataUrl(
  'VLU SCIRES - BAO CAO TONG KET NCKH (DT-2026-007)',
  [
    'Truong Dai hoc Van Lang - Khoa Cong nghe Thong tin',
    'De tai: Ung dung Blockchain truy xuat nguon goc chuoi cung ung nong san',
    'Sinh vien: Tran Khanh Vy (2174802010205)',
    'GVHD: TS. Dang Khanh Hung - Diem qua trinh: 8.8/10',
    '----------------------------------------------------------------',
    '1. Kien truc: Smart Contract Solidity tren mang thu nghiem Ethereum Sepolia.',
    '2. Ket qua: Giam thoi gian doi soat lo hang tu 2 ngay xuong 3 giay qua QR Code.',
    '3. Ket luan: San pham san sang bao ve truoc Hoi dong Khoa hoc So 01.',
  ]
);

const PDF_DT_008 = createSamplePdfDataUrl(
  'VLU SCIRES - BAO CAO TONG KET NCKH (DT-2026-008)',
  [
    'Truong Dai hoc Van Lang - Khoa Cong nghe Thong tin',
    'De tai: He thong Phat hien Xam nhap Mang (IDS) su dung Hoc may',
    'Sinh vien: Ly Hoai Nam (2174802010309)',
    'GVHD: TS. Pham Ngoc Duy - Diem qua trinh: 8.2/10',
    '----------------------------------------------------------------',
    '1. Tap du lieu: CIC-IDS2017 & UNSW-NB15 voi 78 dac trung luu luong mang.',
    '2. Mo hinh: Random Forest & XGBoost dat F1-Score 97.4% tren tap kiem thu.',
    '3. Trang thai nop: Nop tre han (LATE) - De nghi xep Hoi dong bao ve.',
  ]
);

const PDF_DT_009 = createSamplePdfDataUrl(
  'VLU SCIRES - BAO CAO NGHIEM THU CHINH THUC (DT-2026-009)',
  [
    'Truong Dai hoc Van Lang - Khoa Cong nghe Thong tin',
    'De tai: Toi uu hoa Lich trinh Giao hang Do thi bang Thuat toan Di truyen',
    'Sinh vien: Phan Minh Thu (2174802010412)',
    'GVHD: TS. Ngo Hoang Tu - Hoi dong Nghiem thu So 01',
    '----------------------------------------------------------------',
    '1. Ket qua thuc nghiem: Giam 18.6% tong quang duong giao hang noi thanh TP.HCM.',
    '2. Diem qua trinh: 9.2/10 | Diem trung binh Hoi dong: 9.00/10.',
    '3. Quyet dinh Hoi dong: DAT (COMPLETED) - Ho so da dong bang.',
  ]
);

export const INITIAL_DB = {
  // 1. Bảng Categories (Danh mục Chuyên ngành & Lĩnh vực nghiên cứu Khoa CNTT Văn Lang)
  categories: [
    { category_id: 'cat-major-1', name: 'Công nghệ phần mềm', type: 'MAJOR' },
    { category_id: 'cat-major-2', name: 'Trí tuệ nhân tạo & Khoa học dữ liệu', type: 'MAJOR' },
    { category_id: 'cat-major-3', name: 'An ninh mạng & IoT', type: 'MAJOR' },
    { category_id: 'cat-major-4', name: 'Hệ thống thông tin', type: 'MAJOR' },
    { category_id: 'cat-field-1', name: 'Kỹ thuật phần mềm & Chuyển đổi số giáo dục', type: 'FIELD' },
    { category_id: 'cat-field-2', name: 'Trí tuệ nhân tạo (AI) & Thị giác máy tính', type: 'FIELD' },
    { category_id: 'cat-field-3', name: 'Mạng máy tính, IoT & Blockchain', type: 'FIELD' },
    { category_id: 'cat-field-4', name: 'Hệ thống thông tin quản lý & Phân tích dữ liệu', type: 'FIELD' },
  ],

  // 2. Bảng Users (Quản lý Khoa, Giảng viên Khoa CNTT & Sinh viên đủ các kịch bản test)
  users: [
    // --- Quản trị viên Khoa (ADMIN) ---
    {
      user_id: 'usr-admin-chau',
      email: 'chau.lth@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'ThS. Lý Thị Huyền Châu',
      user_code: 'GV00103',
      phone: '0903112233',
      role: 'ADMIN',
      department_id: 'cat-major-1',
      title_info: 'Phó Trưởng Bộ môn Kỹ thuật Phần mềm - Quản lý Khoa CNTT',
      is_locked: false,
    },
    // --- Giảng viên (LECTURER) ---
    {
      user_id: 'usr-hd-bao',
      email: 'bao.vnq@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'GS. TS. Võ Nguyễn Quốc Bảo',
      user_code: 'GV00101',
      phone: '0909888777',
      role: 'LECTURER',
      department_id: 'cat-major-1',
      title_info: 'Phụ trách Khoa CNTT - Phó Hiệu trưởng Trường ĐH Văn Lang',
      is_locked: false,
    },
    {
      user_id: 'usr-gv-hai',
      email: 'hai.nt@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'TS. Nguyễn Trí Hải',
      user_code: 'GV00102',
      phone: '0908223344',
      role: 'LECTURER',
      department_id: 'cat-major-1',
      title_info: 'Phó Trưởng Bộ môn, phụ trách Bộ môn Kỹ thuật Phần mềm',
      is_locked: false,
    },
    {
      user_id: 'usr-gv-hung',
      email: 'hung.dk@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'TS. Đặng Khánh Hưng',
      user_code: 'GV00104',
      phone: '0918334455',
      role: 'LECTURER',
      department_id: 'cat-major-3',
      title_info: 'Phó Trưởng Bộ môn Mạng máy tính và IoT - Giám đốc Blockchain LAB',
      is_locked: false,
    },
    {
      user_id: 'usr-gv-duy',
      email: 'duy.pn@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'TS. Phạm Ngọc Duy',
      user_code: 'GV00106',
      phone: '0907556677',
      role: 'LECTURER',
      department_id: 'cat-major-2',
      title_info: 'Giảng viên Khoa Công nghệ thông tin',
      is_locked: false,
    },
    {
      user_id: 'usr-gv-viet',
      email: 'viet.tn@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'TS. Trần Ngọc Việt',
      user_code: 'GV00107',
      phone: '0906667788',
      role: 'LECTURER',
      department_id: 'cat-major-1',
      title_info: 'Giảng viên Khoa Công nghệ thông tin',
      is_locked: false,
    },
    {
      user_id: 'usr-gv-tu',
      email: 'tu.nh@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'TS. Ngô Hoàng Tú',
      user_code: 'GV00108',
      phone: '0905778899',
      role: 'LECTURER',
      department_id: 'cat-major-2',
      title_info: 'Giảng viên Khoa Công nghệ thông tin',
      is_locked: false,
    },
    // --- Sinh viên CHƯA CÓ NHÓM CHÍNH THỨC (Dùng để test Ứng tuyển UC05 & Đề xuất đề tài mới UC04) ---
    {
      user_id: 'usr-sv-duong',
      email: 'duong.2374802010121@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Trần Phước Đường',
      user_code: '2374802010121',
      phone: '0938121121',
      role: 'STUDENT',
      department_id: 'cat-major-1',
      title_info: 'Sinh viên Khoa CNTT (Chưa tham gia đề tài)',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-khang',
      email: 'khang.2374802010666@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Lê Minh Khang',
      user_code: '2374802010666',
      phone: '0938666111',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT (Chưa tham gia đề tài)',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-an',
      email: 'an.2374802010455@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Lê Hoàng An',
      user_code: '2374802010455',
      phone: '0938455001',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT (Đang chờ duyệt đơn ứng tuyển)',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-linh',
      email: 'linh.2374802010512@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Nguyễn Thảo Linh',
      user_code: '2374802010512',
      phone: '0938512002',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT (Đang chờ duyệt đơn ứng tuyển)',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-khoa',
      email: 'khoa.2374802010701@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Võ Đăng Khoa',
      user_code: '2374802010701',
      phone: '0938701003',
      role: 'STUDENT',
      department_id: 'cat-major-3',
      title_info: 'Sinh viên Khoa CNTT (Đang chờ duyệt đơn ứng tuyển)',
      is_locked: false,
    },
    // --- Sinh viên ĐANG THAM GIA ĐỀ TÀI (Test Kanban, Nộp báo cáo UC06, Xem điểm UC07, Rule 2) ---
    {
      user_id: 'usr-sv-tri',
      email: 'tri.2274802010926@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Trần Ngọc Minh Trí',
      user_code: '2274802010926',
      phone: '0938926926',
      role: 'STUDENT',
      department_id: 'cat-major-1',
      title_info: 'Sinh viên Khoa CNTT - Nhóm trưởng DT-2026-001',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-dung',
      email: 'dung.2274802010102@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Nguyễn Tiến Dũng',
      user_code: '2274802010102',
      phone: '0938102102',
      role: 'STUDENT',
      department_id: 'cat-major-1',
      title_info: 'Sinh viên Khoa CNTT - Thành viên DT-2026-001',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-minh',
      email: 'minh.2274802010311@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Phạm Gia Minh',
      user_code: '2274802010311',
      phone: '0938311311',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-huy',
      email: 'huy.2274802010408@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Đặng Quốc Huy',
      user_code: '2274802010408',
      phone: '0938408408',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-ngoc',
      email: 'ngoc.2274802010520@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Bùi Bảo Ngọc',
      user_code: '2274802010520',
      phone: '0938520520',
      role: 'STUDENT',
      department_id: 'cat-major-4',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-phat',
      email: 'phat.2274802010615@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Huỳnh Tấn Phát',
      user_code: '2274802010615',
      phone: '0938615615',
      role: 'STUDENT',
      department_id: 'cat-major-2',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-vy',
      email: 'vy.2174802010205@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Trần Khánh Vy',
      user_code: '2174802010205',
      phone: '0938205205',
      role: 'STUDENT',
      department_id: 'cat-major-3',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-nam',
      email: 'nam.2174802010309@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Lý Hoài Nam',
      user_code: '2174802010309',
      phone: '0938309309',
      role: 'STUDENT',
      department_id: 'cat-major-3',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-thu',
      email: 'thu.2174802010412@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Phan Minh Thư',
      user_code: '2174802010412',
      phone: '0938412412',
      role: 'STUDENT',
      department_id: 'cat-major-4',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    {
      user_id: 'usr-sv-cuong',
      email: 'cuong.2274802010777@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Ngô Mạnh Cường',
      user_code: '2274802010777',
      phone: '0938777777',
      role: 'STUDENT',
      department_id: 'cat-major-1',
      title_info: 'Sinh viên Khoa CNTT',
      is_locked: false,
    },
    // --- Tài khoản đang bị khóa (Dùng test UC01 chặn đăng nhập & UC19 mở khóa) ---
    {
      user_id: 'usr-sv-locked',
      email: 'khoatk.2274802010999@vanlanguni.vn',
      password_hash: 'vlu_sso_authenticated',
      full_name: 'Nguyễn Văn Khóa (Test Lock)',
      user_code: '2274802010999',
      phone: '0938999000',
      role: 'STUDENT',
      department_id: 'cat-major-1',
      title_info: 'Tài khoản mẫu trạng thái bị khóa',
      is_locked: true,
    },
  ],

  // 3. Bảng Timelines (Các mốc thời gian học kỳ 1 năm học 2026 - 2027)
  timelines: [
    {
      timeline_id: 'tl-2026-reg',
      event_name: 'Giai đoạn 1: Đăng ký đề tài & Xét duyệt phân công GVHD (HK1 2026-2027)',
      start_date: '2026-10-12T08:00:00.000Z',
      end_date: '2026-11-05T17:00:00.000Z',
    },
    {
      timeline_id: 'tl-2026-mid',
      event_name: 'Giai đoạn 2: Triển khai nghiên cứu & Báo cáo tiến độ định kỳ',
      start_date: '2026-11-06T08:00:00.000Z',
      end_date: '2026-12-10T23:59:00.000Z',
    },
    {
      timeline_id: 'tl-2026-final',
      event_name: 'Giai đoạn 3: Nộp báo cáo tổng kết & Bảo vệ trước Hội đồng Khoa học',
      start_date: '2026-12-11T08:00:00.000Z',
      end_date: '2026-12-31T23:59:00.000Z',
    },
  ],

  // 4. Bảng Councils (Hội đồng Khoa học đã thành lập)
  councils: [
    {
      council_id: 'council-hd-01',
      name: 'Hội đồng Nghiệm thu NCKH Số 01 - Khoa CNTT (Đợt 1 - 2026)',
      created_at: '2026-11-10T09:00:00.000Z',
    },
  ],

  // 5. Bảng CouncilMembers (Chủ tịch: GS.TS. Bảo, Thư ký: TS. Duy, Ủy viên: TS. Việt)
  council_members: [
    { id: 'cm-hd01-1', council_id: 'council-hd-01', lecturer_id: 'usr-hd-bao', role_in_council: 'CHUTICH' },
    { id: 'cm-hd01-2', council_id: 'council-hd-01', lecturer_id: 'usr-gv-duy', role_in_council: 'THUKY' },
    { id: 'cm-hd01-3', council_id: 'council-hd-01', lecturer_id: 'usr-gv-viet', role_in_council: 'UYVIEN' },
  ],

  // 6. Bảng Topics (10 đề tài phủ đủ toàn bộ 7 trạng thái vòng đời)
  topics: [
    {
      topic_id: 'DT-2026-001',
      title: 'Xây dựng Hệ thống Quản lý Nghiên cứu Khoa học Sinh viên ứng dụng Kiểm tra Trùng lặp Cosine Similarity',
      summary: 'Thiết kế và xây dựng nền tảng web số hóa quy trình đăng ký đề tài, phân công giảng viên, theo dõi tiến độ Kanban, nộp báo cáo trực tuyến và tích hợp thuật toán Cosine Similarity kiểm tra trùng lặp nội dung.',
      requirements: 'ReactJS, Node.js, Express, PostgreSQL, Prisma ORM',
      max_members: 3,
      status: 'IN_PROGRESS',
      similarity_score: 8.4,
      lecturer_id: 'usr-gv-hai',
      council_id: null,
      field_id: 'cat-field-1',
      preferred_lecturer_note: 'TS. Nguyễn Trí Hải',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-002',
      title: 'Ứng dụng Thị giác Máy tính và YOLOv8 nhận diện biển báo giao thông thông minh theo thời gian thực',
      summary: 'Huấn luyện mô hình học sâu YOLOv8 trên bộ dữ liệu biển báo giao thông Việt Nam, tối ưu hóa tốc độ suy luận trên thiết bị biên Jetson Nano hỗ trợ cảnh báo tài xế.',
      requirements: 'Python, PyTorch, OpenCV, kiến thức cơ bản về Deep Learning',
      max_members: 3,
      status: 'RECRUITING',
      similarity_score: 5.2,
      lecturer_id: 'usr-gv-hai',
      council_id: null,
      field_id: 'cat-field-2',
      created_by_role: 'LECTURER',
    },
    {
      topic_id: 'DT-2026-003',
      title: 'Thiết kế Hệ thống Giám sát Chất lượng Không khí IoT tích hợp Cảnh báo Sớm qua LoRaWAN và MQTT',
      summary: 'Xây dựng mạng cảm biến đo bụi mịn PM2.5, CO2 và nhiệt độ độ ẩm trong khuôn viên trường học, truyền dữ liệu tầm xa bằng giao thức LoRaWAN và hiển thị biểu đồ thời gian thực.',
      requirements: 'ESP32, Arduino/C++, MQTT, Node-RED hoặc Dashboard Web',
      max_members: 4,
      status: 'RECRUITING',
      similarity_score: 4.1,
      lecturer_id: 'usr-gv-hung',
      council_id: null,
      field_id: 'cat-field-3',
      created_by_role: 'LECTURER',
    },
    {
      topic_id: 'DT-2026-004',
      title: 'Xây dựng Trợ lý Ảo Tư vấn Học vụ Đại học sử dụng Mô hình Ngôn ngữ Lớn và Kỹ thuật RAG',
      summary: 'Phát triển chatbot hỏi đáp tự động về quy chế đào tạo, học bổng và kế hoạch học tập cho sinh viên dựa trên cơ sở dữ liệu vector kết hợp kỹ thuật Retrieval-Augmented Generation.',
      requirements: 'Python, FastAPI, LangChain, Vector Database (Qdrant/pgvector)',
      max_members: 3,
      status: 'PENDING_ADMIN',
      similarity_score: 11.6,
      lecturer_id: null,
      council_id: null,
      field_id: 'cat-field-2',
      preferred_lecturer_note: 'TS. Phạm Ngọc Duy',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-005',
      title: 'Phân tích Hành vi Mua sắm Thương mại Điện tử bằng Thuật toán Phân cụm K-Means và Trực quan hóa BI',
      summary: 'Thu thập và tiền xử lý dữ liệu giao dịch bán lẻ trực tuyến, áp dụng mô hình RFM kết hợp phân cụm K-Means để phân khúc khách hàng và xây dựng báo cáo trực quan hỗ trợ ra quyết định.',
      requirements: 'Python (Pandas, Scikit-learn), SQL, Power BI',
      max_members: 3,
      status: 'PENDING_ADMIN',
      similarity_score: 9.3,
      lecturer_id: null,
      council_id: null,
      field_id: 'cat-field-4',
      preferred_lecturer_note: 'TS. Trần Ngọc Việt',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-006',
      title: 'Phát triển Ứng dụng Di động Hỗ trợ Nhận diện Bệnh Lá Cây Nông nghiệp bằng Mạng Nơ-ron Tích chập',
      summary: 'Xây dựng ứng dụng Flutter tích hợp mô hình MobileNetV3 chạy trực tiếp trên điện thoại giúp nông dân chụp ảnh và chẩn đoán sớm các bệnh phổ biến trên lá lúa và cà phê.',
      requirements: 'Flutter/Dart, TensorFlow Lite, REST API',
      max_members: 3,
      status: 'PENDING_LECTURER',
      similarity_score: 12.8,
      lecturer_id: 'usr-gv-hai',
      council_id: null,
      field_id: 'cat-field-2',
      preferred_lecturer_note: 'TS. Nguyễn Trí Hải',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-007',
      title: 'Nghiên cứu Ứng dụng Công nghệ Blockchain trong Truy xuất Nguồn gốc Chuỗi Cung ứng Nông sản Sạch',
      summary: 'Triển khai hợp đồng thông minh Solidity lưu vết minh bạch toàn bộ công đoạn trồng trọt, kiểm định, vận chuyển và phân phối nông sản sạch tích hợp quét mã QR xác thực cho người tiêu dùng.',
      requirements: 'Solidity, Hardhat, Web3.js, ReactJS, IPFS',
      max_members: 3,
      status: 'PENDING_COUNCIL',
      similarity_score: 6.7,
      lecturer_id: 'usr-gv-hung',
      council_id: 'council-hd-01',
      field_id: 'cat-field-3',
      preferred_lecturer_note: 'TS. Đặng Khánh Hưng',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-008',
      title: 'Xây dựng Hệ thống Phát hiện Xâm nhập Mạng (IDS) sử dụng Học máy trên Tập dữ liệu Lưu lượng Hiện đại',
      summary: 'Đánh giá và kết hợp thuật toán Random Forest cùng XGBoost nhằm phân loại các cuộc tấn công DDoS, PortScan và Brute Force trong thời gian thực với tỷ lệ cảnh báo giả thấp.',
      requirements: 'Python, Scikit-learn, XGBoost, Wireshark, Elasticsearch',
      max_members: 3,
      status: 'PENDING_COUNCIL',
      similarity_score: 7.5,
      lecturer_id: 'usr-gv-duy',
      council_id: null, // Chưa phân Hội đồng: Dùng để test UC16 Tạo HĐ mới & test Xung đột lợi ích với council-hd-01 (có TS. Phạm Ngọc Duy)
      field_id: 'cat-field-3',
      preferred_lecturer_note: 'TS. Phạm Ngọc Duy',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-009',
      title: 'Tối ưu hóa Lịch trình Giao hàng Đô thị bằng Thuật toán Di truyền Kết hợp Bản đồ Số OpenStreetMap',
      summary: 'Giải quyết bài toán định tuyến phương tiện có ràng buộc khung giờ giao hàng (VRPTW) bằng thuật toán di truyền cải tiến kết hợp dữ liệu giao thông thực tế từ OpenStreetMap.',
      requirements: 'Python, Genetic Algorithm, OSRM, Leaflet Maps',
      max_members: 3,
      status: 'COMPLETED',
      is_frozen: true,
      similarity_score: 4.9,
      lecturer_id: 'usr-gv-tu',
      council_id: 'council-hd-01',
      field_id: 'cat-field-4',
      preferred_lecturer_note: 'TS. Ngô Hoàng Tú',
      created_by_role: 'STUDENT',
    },
    {
      topic_id: 'DT-2026-010',
      title: 'Xây dựng Website Thương mại Điện tử Bán Hàng Thời Trang Cơ Bản',
      summary: 'Thiết kế trang web giới thiệu sản phẩm thời trang có chức năng giỏ hàng, thanh toán cơ bản và quản lý đơn hàng cho cửa hàng nhỏ.',
      requirements: 'HTML, CSS, JavaScript, PHP',
      max_members: 3,
      status: 'FAILED',
      similarity_score: 18.2,
      lecturer_id: null,
      council_id: null,
      field_id: 'cat-field-1',
      reject_reason: 'Đề tài mang tính ứng dụng cơ bản, chưa thể hiện rõ tính mới và hàm lượng nghiên cứu khoa học theo tiêu chuẩn của Khoa CNTT.',
      created_by_role: 'STUDENT',
    },
  ],

  // 7. Bảng TopicMembers (Đảm bảo đúng Rule 2: mỗi SV chỉ APPROVED tối đa 1 đề tài đang hoạt động)
  topic_members: [
    // DT-2026-001 (IN_PROGRESS)
    {
      id: 'tm-001-1',
      topic_id: 'DT-2026-001',
      student_id: 'usr-sv-tri',
      cover_letter: 'Nhóm trưởng đề xuất đề tài, phụ trách kiến trúc hệ thống và thuật toán Cosine Similarity.',
      status: 'APPROVED',
    },
    {
      id: 'tm-001-2',
      topic_id: 'DT-2026-001',
      student_id: 'usr-sv-dung',
      cover_letter: 'Thành viên nhóm phụ trách thiết kế CSDL PostgreSQL và giao diện Frontend ReactJS.',
      status: 'APPROVED',
    },
    // DT-2026-002 (RECRUITING - có 1 APPROVED + 2 PENDING để TS. Hải test duyệt ứng viên UC09)
    {
      id: 'tm-002-1',
      topic_id: 'DT-2026-002',
      student_id: 'usr-sv-minh',
      cover_letter: 'Em đã có kinh nghiệm làm đồ án OpenCV và huấn luyện mô hình YOLO nhận diện đối tượng.',
      status: 'APPROVED',
    },
    {
      id: 'tm-002-2',
      topic_id: 'DT-2026-002',
      student_id: 'usr-sv-an',
      cover_letter: 'Em nắm vững Python, PyTorch và đạt điểm A môn Trí tuệ nhân tạo. Em rất mong được tham gia nhóm nghiên cứu của Thầy.',
      status: 'PENDING',
    },
    {
      id: 'tm-002-3',
      topic_id: 'DT-2026-002',
      student_id: 'usr-sv-linh',
      cover_letter: 'Em có kỹ năng gán nhãn dữ liệu, đánh giá mô hình và viết báo cáo khoa học tốt. Rất mong Thầy xem xét duyệt đơn.',
      status: 'PENDING',
    },
    // DT-2026-003 (RECRUITING - có 1 PENDING cho TS. Hưng)
    {
      id: 'tm-003-1',
      topic_id: 'DT-2026-003',
      student_id: 'usr-sv-khoa',
      cover_letter: 'Em đam mê lập trình nhúng ESP32 và đã từng triển khai đồ án nhà thông minh sử dụng giao thức MQTT.',
      status: 'PENDING',
    },
    // DT-2026-004 (PENDING_ADMIN)
    {
      id: 'tm-004-1',
      topic_id: 'DT-2026-004',
      student_id: 'usr-sv-huy',
      cover_letter: 'Nhóm trưởng đề xuất đề tài Trợ lý ảo RAG tư vấn học vụ.',
      status: 'APPROVED',
    },
    // DT-2026-005 (PENDING_ADMIN)
    {
      id: 'tm-005-1',
      topic_id: 'DT-2026-005',
      student_id: 'usr-sv-ngoc',
      cover_letter: 'Nhóm trưởng đề xuất đề tài phân tích hành vi khách hàng bằng K-Means.',
      status: 'APPROVED',
    },
    // DT-2026-006 (PENDING_LECTURER)
    {
      id: 'tm-006-1',
      topic_id: 'DT-2026-006',
      student_id: 'usr-sv-phat',
      cover_letter: 'Nhóm trưởng đề xuất đề tài nhận diện bệnh lá cây trên di động.',
      status: 'APPROVED',
    },
    // DT-2026-007 (PENDING_COUNCIL)
    {
      id: 'tm-007-1',
      topic_id: 'DT-2026-007',
      student_id: 'usr-sv-vy',
      cover_letter: 'Sinh viên thực hiện đề tài Blockchain truy xuất nguồn gốc nông sản.',
      status: 'APPROVED',
    },
    // DT-2026-008 (PENDING_COUNCIL)
    {
      id: 'tm-008-1',
      topic_id: 'DT-2026-008',
      student_id: 'usr-sv-nam',
      cover_letter: 'Sinh viên thực hiện đề tài Hệ thống phát hiện xâm nhập mạng IDS.',
      status: 'APPROVED',
    },
    // DT-2026-009 (COMPLETED)
    {
      id: 'tm-009-1',
      topic_id: 'DT-2026-009',
      student_id: 'usr-sv-thu',
      cover_letter: 'Sinh viên thực hiện đề tài tối ưu hóa lịch trình giao hàng bằng thuật toán di truyền.',
      status: 'APPROVED',
    },
    // DT-2026-010 (FAILED)
    {
      id: 'tm-010-1',
      topic_id: 'DT-2026-010',
      student_id: 'usr-sv-cuong',
      cover_letter: 'Sinh viên đề xuất website thương mại điện tử.',
      status: 'APPROVED',
    },
  ],

  // 8. Bảng Documents (Có PDF thật nhúng Base64 xem trực tiếp & tải xuống được ngay)
  documents: [
    {
      document_id: 'doc-001-1',
      topic_id: 'DT-2026-001',
      file_name: 'Bao_Cao_De_Cuong_DT-2026-001.pdf',
      file_size: 1420,
      file_url: '/uploads/DT-2026-001_Bao_Cao_De_Cuong_DT-2026-001.pdf',
      download_url: '/api/documents/download/DT-2026-001_Bao_Cao_De_Cuong_DT-2026-001.pdf',
      file_data_url: PDF_DT_001,
      description: 'Đề cương chi tiết & Thiết kế kiến trúc hệ thống tuần 1-4 (Bản chính thức).',
      submit_status: 'ON_TIME',
      created_at: '2026-11-10T09:15:00.000Z',
    },
    {
      document_id: 'doc-001-2',
      topic_id: 'DT-2026-001',
      file_name: 'Bao_Cao_Tien_Do_Tuan_5_DT-2026-001.docx',
      file_size: 28640,
      file_url: '/uploads/DT-2026-001_Bao_Cao_Tien_Do_Tuan_5_DT-2026-001.docx',
      download_url: '/api/documents/download/DT-2026-001_Bao_Cao_Tien_Do_Tuan_5_DT-2026-001.docx',
      file_data_url: '',
      description: 'Báo cáo tiến độ tuần 5: Kết quả kiểm thử thuật toán Cosine Similarity & API.',
      submit_status: 'ON_TIME',
      created_at: '2026-11-16T14:30:00.000Z',
    },
    {
      document_id: 'doc-007-1',
      topic_id: 'DT-2026-007',
      file_name: 'Bao_Cao_Tong_Ket_Blockchain_DT-2026-007.pdf',
      file_size: 1510,
      file_url: '/uploads/DT-2026-007_Bao_Cao_Tong_Ket_Blockchain_DT-2026-007.pdf',
      download_url: '/api/documents/download/DT-2026-007_Bao_Cao_Tong_Ket_Blockchain_DT-2026-007.pdf',
      file_data_url: PDF_DT_007,
      description: 'Báo cáo tổng kết đề tài NCKH nộp bảo vệ trước Hội đồng Số 01.',
      submit_status: 'ON_TIME',
      created_at: '2026-11-12T10:00:00.000Z',
    },
    {
      document_id: 'doc-008-1',
      topic_id: 'DT-2026-008',
      file_name: 'Bao_Cao_Tong_Ket_IDS_DT-2026-008.pdf',
      file_size: 1490,
      file_url: '/uploads/DT-2026-008_Bao_Cao_Tong_Ket_IDS_DT-2026-008.pdf',
      download_url: '/api/documents/download/DT-2026-008_Bao_Cao_Tong_Ket_IDS_DT-2026-008.pdf',
      file_data_url: PDF_DT_008,
      description: 'Báo cáo tổng kết Hệ thống phát hiện xâm nhập mạng (Nộp bổ sung sau hạn).',
      submit_status: 'LATE',
      created_at: '2026-11-14T21:45:00.000Z',
    },
    {
      document_id: 'doc-009-1',
      topic_id: 'DT-2026-009',
      file_name: 'Bao_Cao_Nghiem_Thu_DT-2026-009.pdf',
      file_size: 1530,
      file_url: '/uploads/DT-2026-009_Bao_Cao_Nghiem_Thu_DT-2026-009.pdf',
      download_url: '/api/documents/download/DT-2026-009_Bao_Cao_Nghiem_Thu_DT-2026-009.pdf',
      file_data_url: PDF_DT_009,
      description: 'Báo cáo nghiệm thu chính thức sau khi chỉnh sửa theo góp ý Hội đồng.',
      submit_status: 'ON_TIME',
      created_at: '2026-11-08T15:20:00.000Z',
    },
  ],

  // 9. Bảng Tasks (Thẻ tiến độ Kanban cho các đề tài đang thực hiện & hoàn thành)
  tasks: [
    // DT-2026-001 (IN_PROGRESS - 1 Hoàn thành, 2 Chờ đánh giá để GVHD test kéo thả UC11)
    {
      task_id: 'tsk-001-1',
      topic_id: 'DT-2026-001',
      title: 'Tuần 1-2: Phân tích đặc tả SRS, Use Case & Thiết kế lược đồ CSDL 12 bảng',
      status: 'Hoàn thành',
    },
    {
      task_id: 'tsk-001-2',
      topic_id: 'DT-2026-001',
      title: 'Tuần 3-6: Cài đặt thuật toán kiểm tra đạo văn Cosine Similarity & RESTful API',
      status: 'Chờ đánh giá',
    },
    {
      task_id: 'tsk-001-3',
      topic_id: 'DT-2026-001',
      title: 'Tuần 7-10: Kiểm thử toàn hệ thống, hoàn thiện báo cáo tổng kết & slide bảo vệ',
      status: 'Chờ đánh giá',
    },
    // DT-2026-007 (PENDING_COUNCIL)
    {
      task_id: 'tsk-007-1',
      topic_id: 'DT-2026-007',
      title: 'Thiết kế Smart Contract truy xuất lô nông sản trên mạng Sepolia',
      status: 'Hoàn thành',
    },
    {
      task_id: 'tsk-007-2',
      topic_id: 'DT-2026-007',
      title: 'Hoàn thiện giao diện quét mã QR & Báo cáo tổng kết bảo vệ',
      status: 'Hoàn thành',
    },
    // DT-2026-009 (COMPLETED)
    {
      task_id: 'tsk-009-1',
      topic_id: 'DT-2026-009',
      title: 'Thu thập dữ liệu mạng lưới đường bộ OpenStreetMap TP.HCM',
      status: 'Hoàn thành',
    },
    {
      task_id: 'tsk-009-2',
      topic_id: 'DT-2026-009',
      title: 'Cài đặt thuật toán di truyền VRPTW & Đánh giá thực nghiệm',
      status: 'Hoàn thành',
    },
    {
      task_id: 'tsk-009-3',
      topic_id: 'DT-2026-009',
      title: 'Bảo vệ & Nộp hồ sơ nghiệm thu hoàn chỉnh',
      status: 'Hoàn thành',
    },
  ],

  // 10. Bảng Comments (Trao đổi & góp ý chuyên môn từ GVHD)
  comments: [
    {
      comment_id: 'cmt-001-1',
      topic_id: 'DT-2026-001',
      user_id: 'usr-gv-hai',
      content: 'Phần phân tích đặc tả và thiết kế 12 bảng CSDL rất chặt chẽ. Nhóm triển khai tiếp module Cosine Similarity và bổ sung danh sách stop-words tiếng Việt nhé.',
      created_at: '2026-11-11T10:20:00.000Z',
    },
    {
      comment_id: 'cmt-001-2',
      topic_id: 'DT-2026-001',
      user_id: 'usr-gv-hai',
      content: 'Thầy đã xem báo cáo tuần 5. Kết quả kiểm thử trùng lặp khá ổn, tuần tới nhóm hoàn thiện thêm phần xuất báo cáo Excel và kiểm thử bảo vệ hội đồng.',
      created_at: '2026-11-17T08:45:00.000Z',
    },
    {
      comment_id: 'cmt-007-1',
      topic_id: 'DT-2026-007',
      user_id: 'usr-gv-hung',
      content: 'Demo Smart Contract chạy mượt mà, phí gas tối ưu tốt. Em chuẩn bị slide ngắn gọn khoảng 15 phút cho buổi bảo vệ trước Hội đồng.',
      created_at: '2026-11-12T16:10:00.000Z',
    },
  ],

  // 11. Bảng Scores (Điểm quá trình PROCESS & Điểm bảo vệ Hội đồng FINAL)
  scores: [
    // DT-2026-007: Có điểm quá trình + 1 điểm của Thư ký (để GS.TS. Bảo vào chấm thêm và chốt nghiệm thu)
    {
      score_id: 'scr-007-proc',
      topic_id: 'DT-2026-007',
      user_id: 'usr-gv-hung',
      score_value: 8.8,
      comment: 'Sinh viên chủ động nghiên cứu, hoàn thành tốt hợp đồng thông minh và báo cáo đúng tiến độ.',
      score_type: 'PROCESS',
    },
    {
      score_id: 'scr-007-final-1',
      topic_id: 'DT-2026-007',
      user_id: 'usr-gv-duy',
      score_value: 8.5,
      comment: 'Ý tưởng ứng dụng thực tiễn cao, cần bổ sung phân tích thêm về chi phí vận hành trên mainnet.',
      score_type: 'FINAL',
    },
    // DT-2026-008: Đã chốt điểm quá trình 8.2, chờ Admin xếp Hội đồng
    {
      score_id: 'scr-008-proc',
      topic_id: 'DT-2026-008',
      user_id: 'usr-gv-duy',
      score_value: 8.2,
      comment: 'Kết quả thực nghiệm trên tập dữ liệu CIC-IDS2017 đạt độ chính xác cao, đủ điều kiện ra Hội đồng.',
      score_type: 'PROCESS',
    },
    // DT-2026-009: Đã hoàn thành nghiệm thu đầy đủ 1 điểm quá trình + 3 điểm Hội đồng
    {
      score_id: 'scr-009-proc',
      topic_id: 'DT-2026-009',
      user_id: 'usr-gv-tu',
      score_value: 9.2,
      comment: 'Đề tài có hàm lượng thuật toán tốt, kết quả thử nghiệm rõ ràng và thuyết phục.',
      score_type: 'PROCESS',
    },
    {
      score_id: 'scr-009-final-1',
      topic_id: 'DT-2026-009',
      user_id: 'usr-hd-bao',
      score_value: 9.0,
      comment: 'Đề tài giải quyết tốt bài toán thực tế, phương pháp thực nghiệm khoa học, trả lời phản biện sắc sảo.',
      score_type: 'FINAL',
    },
    {
      score_id: 'scr-009-final-2',
      topic_id: 'DT-2026-009',
      user_id: 'usr-gv-duy',
      score_value: 9.2,
      comment: 'Thuật toán di truyền cải tiến cho thấy mức giảm quãng đường đáng kể so với phương pháp tham lam.',
      score_type: 'FINAL',
    },
    {
      score_id: 'scr-009-final-3',
      topic_id: 'DT-2026-009',
      user_id: 'usr-gv-viet',
      score_value: 8.8,
      comment: 'Báo cáo trình bày đúng chuẩn học thuật, đề xuất phát triển thêm bài báo khoa học sinh viên.',
      score_type: 'FINAL',
    },
  ],

  // 12. Bảng Notifications (Thông báo In-app cho các tài khoản đăng nhập nhanh)
  notifications: [
    {
      notification_id: 'notif-sample-1',
      user_id: 'usr-sv-tri',
      content: 'GVHD TS. Nguyễn Trí Hải vừa gửi nhận xét mới cho báo cáo tuần 5 của đề tài [DT-2026-001].',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-2',
      user_id: 'usr-sv-tri',
      content: 'Thẻ công việc "Tuần 1-2: Phân tích đặc tả SRS" đã được GVHD đánh dấu Hoàn thành.',
      is_read: true,
    },
    {
      notification_id: 'notif-sample-3',
      user_id: 'usr-gv-hai',
      content: 'Khoa CNTT vừa phân công Thầy hướng dẫn đề tài [DT-2026-006]. Vui lòng xác nhận tiếp nhận.',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-4',
      user_id: 'usr-gv-hai',
      content: 'Có 02 sinh viên (Lê Hoàng An, Nguyễn Thảo Linh) vừa nộp đơn ứng tuyển vào đề tài [DT-2026-002].',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-5',
      user_id: 'usr-hd-bao',
      content: 'Thầy đã được phân công làm Chủ tịch "Hội đồng Nghiệm thu NCKH Số 01" với đề tài [DT-2026-007] đang chờ chấm điểm bảo vệ.',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-6',
      user_id: 'usr-admin-chau',
      content: 'Có 02 đề tài tự đề xuất mới ([DT-2026-004], [DT-2026-005]) đang chờ Khoa xét duyệt sơ bộ và phân công GVHD.',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-7',
      user_id: 'usr-admin-chau',
      content: 'Đề tài [DT-2026-008] đã đủ điểm quá trình (8.2/10) và đang chờ phân bổ vào Hội đồng bảo vệ.',
      is_read: false,
    },
    {
      notification_id: 'notif-sample-8',
      user_id: 'usr-sv-duong',
      content: 'Cổng đăng ký NCKH Học kỳ 1 (2026-2027) đang mở! Bạn có thể ứng tuyển các đề tài đang tuyển sinh hoặc tự đề xuất ý tưởng mới.',
      is_read: false,
    },
  ],
};
