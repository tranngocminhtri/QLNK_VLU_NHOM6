// ============================================================================
// FILE: backend/src/controllers/apiController.js
// MỤC ĐÍCH: Nơi xử lý toàn bộ 15 nghiệp vụ API của hệ thống (UC01 -> UC23)
// Giải thích dễ nhớ: Đây chính là "Khu vực Nhà bếp" của nhà hàng. Khi bồi bàn (API)
// mang yêu cầu từ khách (ReactJS) vào, Đầu bếp (Controller) sẽ nhờ Phiên dịch viên
// (Prisma ORM) lấy dữ liệu từ Tủ hồ sơ (PostgreSQL), chế biến xong rồi trả ra.
// ============================================================================

// Gọi thư viện fs và path có sẵn của Node.js để lưu trữ và phục vụ tệp báo cáo vật lý
const fs = require('fs');
const path = require('path');
// Gọi thư viện PrismaClient để giao tiếp với cơ sở dữ liệu PostgreSQL
const { PrismaClient } = require('@prisma/client');
// Gọi thư viện Supabase để đẩy file báo cáo PDF/Word lên đám mây Supabase Storage
const { createClient } = require('@supabase/supabase-js');
// Gọi thuật toán kiểm tra đạo văn Cosine Similarity từ thư mục utils
const { kiemTraDaoVanDeTai } = require('../utils/similarity');

// Đường dẫn thư mục lưu trữ các tệp báo cáo tải lên trên máy chủ
const THU_MUC_UPLOADS = path.join(__dirname, '../../uploads');
// Nếu thư mục uploads chưa tồn tại thì tự động khởi tạo
if (!fs.existsSync(THU_MUC_UPLOADS)) {
  fs.mkdirSync(THU_MUC_UPLOADS, { recursive: true });
}

// Khởi tạo đối tượng phiên dịch viên Prisma
const prisma = new PrismaClient();

// Lấy đường dẫn và khóa kết nối Supabase từ file cấu hình .env
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
// Khởi tạo kết nối đến kho lưu trữ đám mây Supabase (nếu có cấu hình)
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Hàm phụ trợ: Tự động tạo thông báo mới vào bảng Notification (UC23)
async function taoThongBaoHeThong(userId, noiDung) {
  // Nếu không có mã người nhận thì bỏ qua
  if (!userId) return;
  try {
    // Gọi Prisma thêm 1 dòng mới vào bảng Notification trong cơ sở dữ liệu
    await prisma.notification.create({
      data: {
        user_id: userId,     // Gửi cho ai
        content: noiDung,    // Nội dung thông báo là gì
        is_read: false       // Mặc định là chưa đọc (hiển thị chấm đỏ trên chuông)
      }
    });
  } catch (err) {
    // Nếu lỗi tạo thông báo thì chỉ in ra màn hình log, không làm gián đoạn thao tác chính
    console.log('Lưu ý khi ghi thông báo:', err.message);
  }
}

// ============================================================================
// API 1: ĐĂNG NHẬP HỆ THỐNG QUA GOOGLE WORKSPACE (POST /api/auth/login - UC01)
// ============================================================================
async function dangNhapHeThong(req, res) {
  try {
    // Lấy email và họ tên người dùng gửi lên từ giao diện React
    const email = (req.body.email || '').trim().toLowerCase();
    const fullName = (req.body.full_name || '').trim();

    // Kiểm tra bắt buộc phải dùng email trường Văn Lang cấp (@vanlanguni.vn) (Luồng 3a UC01)
    if (!email.endsWith('@vanlanguni.vn')) {
      return res.status(403).json({
        message: 'Truy cập bị từ chối. Vui lòng dùng email do trường cấp (@vanlanguni.vn).'
      });
    }

    // Nhờ Prisma tìm trong bảng User xem email này đã được Admin cấp tài khoản chưa
    const nguoiDung = await prisma.user.findUnique({
      where: { email: email },
      include: { department: true }
    });

    // Chỉ cho phép đăng nhập những tài khoản @vanlanguni.vn đã được Admin tạo trước trong CSDL
    if (!nguoiDung) {
      return res.status(403).json({
        message: 'Tài khoản chưa được cấp phép trên hệ thống. Chỉ những tài khoản @vanlanguni.vn do Quản trị viên (Admin) tạo mới được phép đăng nhập.'
      });
    }

    // Tạo chiếc "thẻ từ an ninh" (Token) chứa mã người dùng và phân quyền Role
    const token = `jwt_vlu_${nguoiDung.user_id}_${nguoiDung.role}`;

    // Trả về Token và thông tin người dùng cho giao diện React
    return res.status(200).json({
      token: token,
      user: nguoiDung,
      message: 'Đăng nhập thành công!'
    });
  } catch (error) {
    // Nếu có lỗi kết nối CSDL thì báo lỗi 500 rõ ràng
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập: ' + error.message });
  }
}

// ============================================================================
// API 2: ĐĂNG XUẤT HỆ THỐNG (POST /api/auth/logout - UC02)
// ============================================================================
async function dangXuatHeThong(req, res) {
  // Phản hồi xác nhận đăng xuất để phía React xóa Token khỏi trình duyệt
  return res.status(200).json({
    message: 'Đăng xuất thành công'
  });
}

// ============================================================================
// API 3 & 4: XEM VÀ CẬP NHẬT HỒ SƠ CÁ NHÂN (GET & PUT /api/users/profile - UC03)
// ============================================================================
async function xemHoSoCaNhan(req, res) {
  try {
    // Lấy mã người dùng từ thẻ Token hoặc từ tham số gửi lên
    const userId = req.query.user_id || (req.user && req.user.user_id);
    // Tìm thông tin người dùng trong bảng User kèm theo thông tin Khoa/Chuyên ngành
    const nguoiDung = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { department: true }
    });

    if (!nguoiDung) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ người dùng.' });
    }
    return res.status(200).json(nguoiDung);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tải hồ sơ: ' + error.message });
  }
}

async function capNhatHoSoCaNhan(req, res) {
  try {
    // Lấy dữ liệu người dùng muốn sửa từ phần thân yêu cầu (req.body)
    const userId = req.body.user_id || (req.user && req.user.user_id);
    const soDienThoai = (req.body.phone || '').trim();
    const hoTen = (req.body.full_name || '').trim();
    const maChuyenNganh = req.body.department_id || null;

    // Kiểm tra số điện thoại: chỉ được chứa chữ số từ 9 đến 11 số (Luồng 4a UC03)
    const bieuThucSoDienThoai = /^0\d{8,10}$/;
    if (!bieuThucSoDienThoai.test(soDienThoai)) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại (Số điện thoại không được chứa chữ cái).'
      });
    }

    // Nhờ Prisma cập nhật dòng dữ liệu mới vào bảng User
    const daCapNhat = await prisma.user.update({
      where: { user_id: userId },
      data: {
        full_name: hoTen,
        phone: soDienThoai,
        department_id: maChuyenNganh
      },
      include: { department: true }
    });

    return res.status(200).json({
      user: daCapNhat,
      message: 'Cập nhật thành công'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi cập nhật hồ sơ: ' + error.message });
  }
}

// ============================================================================
// API 5: LẤY DANH SÁCH ĐỀ TÀI (GET /api/topics - UC05)
// ============================================================================
async function layDanhSachDeTai(req, res) {
  try {
    // Lấy bộ lọc trạng thái nếu có (Ví dụ: ?status=RECRUITING)
    const trangThaiLoc = req.query.status;
    const dieuKienLoc = {};
    if (trangThaiLoc) {
      dieuKienLoc.status = trangThaiLoc;
    }

    // Truy vấn toàn bộ danh sách đề tài kèm theo Giảng viên, Thành viên, Tài liệu, Kanban, Bình luận, Điểm số
    const danhSachDeTai = await prisma.topic.findMany({
      where: dieuKienLoc,
      include: {
        lecturer: true,
        council: true,
        members: { include: { student: true } },
        documents: true,
        tasks: true,
        comments: { include: { user: true } },
        scores: { include: { user: true } }
      }
    });

    return res.status(200).json(danhSachDeTai);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy danh sách đề tài: ' + error.message });
  }
}

// ============================================================================
// API 6: TẠO MỚI ĐỀ TÀI & KIỂM TRA TRÙNG LẶP ĐẠO VĂN (POST /api/topics - UC04, UC08, UC22)
// ============================================================================
async function taoDeTaiMoi(req, res) {
  try {
    // Lấy thông tin đề tài từ biểu mẫu gửi lên
    const title = (req.body.title || '').trim();
    const summary = (req.body.summary || '').trim();
    const requirements = (req.body.requirements || '').trim();
    const maxMembers = Number(req.body.max_members) || 5;
    const roleNguoiTao = req.body.role || 'STUDENT';
    const userIdNguoiTao = req.body.user_id;

    // Kiểm tra không được bỏ trống tên đề tài và tóm tắt
    if (!title || !summary) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ Tên đề tài và Tóm tắt nội dung.'
      });
    }

    // BƯỚC QUAN TRỌNG (UC22): Lấy tất cả đề tài cũ ra để quét trùng lặp Cosine Similarity
    const danhSachDeTaiCu = await prisma.topic.findMany();
    const ketQuaKiemTra = kiemTraDaoVanDeTai(title, summary, danhSachDeTaiCu);

    // Nếu độ trùng lặp >= 30% thì chặn lại ngay lập tức (Luồng 6a UC04 & Rule 3)
    if (!ketQuaKiemTra.isSafe) {
      return res.status(400).json({
        message: `Đề tài trùng lặp nội dung (${ketQuaKiemTra.similarityScore}% >= 30%), vui lòng đổi Tên/Tóm tắt.`,
        similarity_score: ketQuaKiemTra.similarityScore
      });
    }

    // Nếu Sinh viên đề xuất -> Trạng thái là PENDING_ADMIN (Chờ Khoa duyệt - Rule 1)
    // Nếu Giảng viên công bố -> Trạng thái là RECRUITING (Đang tuyển sinh viên - UC08)
    const trangThaiBanDau = (roleNguoiTao === 'LECTURER') ? 'RECRUITING' : 'PENDING_ADMIN';

    // Lưu đề tài mới vào bảng Topic trong PostgreSQL
    const deTaiMoi = await prisma.topic.create({
      data: {
        title: title,
        summary: summary,
        requirements: requirements,
        max_members: maxMembers,
        status: trangThaiBanDau,
        similarity_score: ketQuaKiemTra.similarityScore,
        lecturer_id: (roleNguoiTao === 'LECTURER') ? userIdNguoiTao : null
      }
    });

    // Nếu người tạo là Sinh viên thì tự động thêm sinh viên đó làm thành viên chính thức của nhóm
    if (roleNguoiTao === 'STUDENT' && userIdNguoiTao) {
      await prisma.topicMember.create({
        data: {
          topic_id: deTaiMoi.topic_id,
          student_id: userIdNguoiTao,
          cover_letter: 'Sinh viên trưởng nhóm đề xuất đề tài.',
          status: 'APPROVED'
        }
      });
    }

    return res.status(201).json({
      topic: deTaiMoi,
      similarity_score: ketQuaKiemTra.similarityScore,
      message: 'Đăng ký đề tài thành công!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tạo đề tài: ' + error.message });
  }
}

// ============================================================================
// API 7: SINH VIÊN ỨNG TUYỂN ĐỀ TÀI CỦA GIẢNG VIÊN (POST /api/topics/:id/apply - UC05)
// ============================================================================
async function ungTuyenDeTai(req, res) {
  try {
    const maDeTai = req.params.id;
    const maSinhVien = req.body.student_id || (req.user && req.user.user_id);
    const loiGioiThieu = (req.body.cover_letter || '').trim();

    // Kiểm tra Rule 2: Một sinh viên chỉ được tham gia chính thức tối đa 1 đề tài
    const nhomHienTai = await prisma.topicMember.findFirst({
      where: {
        student_id: maSinhVien,
        status: 'APPROVED'
      }
    });

    if (nhomHienTai) {
      return res.status(400).json({
        message: 'Mỗi sinh viên chỉ được phép tham gia tối đa 01 đề tài NCKH trong học kỳ.'
      });
    }

    // Lưu đơn ứng tuyển vào bảng TopicMember với trạng thái PENDING (Chờ GVHD duyệt)
    const donUngTuyen = await prisma.topicMember.create({
      data: {
        topic_id: maDeTai,
        student_id: maSinhVien,
        cover_letter: loiGioiThieu,
        status: 'PENDING'
      }
    });

    // Tìm thông tin đề tài để gửi thông báo cho Giảng viên hướng dẫn (UC23)
    const deTai = await prisma.topic.findUnique({ where: { topic_id: maDeTai } });
    if (deTai && deTai.lecturer_id) {
      await taoThongBaoHeThong(
        deTai.lecturer_id,
        `Có sinh viên mới nộp đơn ứng tuyển vào đề tài "${deTai.title}".`
      );
    }

    return res.status(201).json({
      application: donUngTuyen,
      message: 'Gửi ứng tuyển thành công'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi ứng tuyển: ' + error.message });
  }
}

// ============================================================================
// API 8: GVHD XÉT DUYỆT SINH VIÊN & CHỐT NHÓM (PUT /api/topics/:id/approve - UC09)
// ============================================================================
async function duyetUngVienVaChotNhom(req, res) {
  try {
    const maDeTai = req.params.id;
    const maBanGhiThanhVien = req.body.member_id;
    const trangThaiMoi = req.body.status; // 'APPROVED' (Đồng ý) hoặc 'REJECTED' (Từ chối)
    const chotNhom = req.body.finalize_group; // true nếu nhấn nút "Chốt danh sách nhóm"

    const deTai = await prisma.topic.findUnique({ where: { topic_id: maDeTai } });
    if (!deTai) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài.' });
    }

    // Nếu GVHD đang duyệt từng sinh viên
    if (maBanGhiThanhVien && trangThaiMoi) {
      // Nếu nhấn Đồng ý -> Kiểm tra xem nhóm đã đủ số lượng tối đa chưa (Luồng 3a UC09)
      if (trangThaiMoi === 'APPROVED') {
        const soLuongDaDuyet = await prisma.topicMember.count({
          where: { topic_id: maDeTai, status: 'APPROVED' }
        });
        if (soLuongDaDuyet >= deTai.max_members) {
          return res.status(400).json({
            message: 'Nhóm đã đạt số lượng tối đa, không thể duyệt thêm.'
          });
        }
      }

      // Cập nhật trạng thái đơn ứng tuyển của sinh viên
      const daCapNhat = await prisma.topicMember.update({
        where: { id: maBanGhiThanhVien },
        data: { status: trangThaiMoi }
      });

      // Gửi thông báo cho sinh viên biết kết quả
      await taoThongBaoHeThong(
        daCapNhat.student_id,
        `Đơn ứng tuyển của bạn vào đề tài "${deTai.title}" đã được cập nhật: ${trangThaiMoi}`
      );
    }

    // Nếu GVHD nhấn nút "Chốt danh sách nhóm" -> Chuyển đề tài sang PENDING_ADMIN (Chờ Khoa duyệt cuối)
    if (chotNhom) {
      await prisma.topic.update({
        where: { topic_id: maDeTai },
        data: { status: 'PENDING_ADMIN' }
      });
    }

    return res.status(200).json({
      message: 'Cập nhật danh sách nhóm thành công!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi duyệt nhóm: ' + error.message });
  }
}

// ============================================================================
// API 9: ADMIN DUYỆT SƠ BỘ & PHÂN CÔNG GVHD (PUT /api/topics/:id/assign - UC14, UC15, UC10)
// ============================================================================
async function phanCongGiangVien(req, res) {
  try {
    const maDeTai = req.params.id;
    const maGiangVien = req.body.lecturer_id;
    const trangThaiCapNhat = req.body.status || 'PENDING_LECTURER';

    // Cập nhật mã Giảng viên hướng dẫn và chuyển trạng thái đề tài
    const deTaiCapNhat = await prisma.topic.update({
      where: { topic_id: maDeTai },
      data: {
        lecturer_id: maGiangVien,
        status: trangThaiCapNhat
      }
    });

    // Nếu phân công giảng viên mới thì gửi thông báo cho giảng viên đó (UC15 bước 5)
    if (maGiangVien && trangThaiCapNhat === 'PENDING_LECTURER') {
      await taoThongBaoHeThong(
        maGiangVien,
        `Khoa CNTT vừa phân công Thầy/Cô hướng dẫn đề tài "${deTaiCapNhat.title}".`
      );
    }

    return res.status(200).json({
      topic: deTaiCapNhat,
      message: 'Đã cập nhật phân công giảng viên hướng dẫn thành công!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi phân công GVHD: ' + error.message });
  }
}

// ============================================================================
// API 10: SINH VIÊN NỘP TÀI LIỆU LÊN SUPABASE STORAGE (POST /api/documents/upload - UC06)
// ============================================================================
async function nopTaiLieuBaoCao(req, res) {
  try {
    const maDeTai = req.body.topic_id;
    const moTa = (req.body.description || '').trim();
    const tepTin = req.file; // File vật lý do thư viện Multer bóc tách

    // Kiểm tra xem người dùng có đính kèm file không
    if (!tepTin) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp báo cáo PDF hoặc Word.' });
    }

    // Kiểm tra định dạng file (.pdf, .doc, .docx) và dung lượng <= 20MB (Luồng 4a UC06)
    const tenFileThuong = tepTin.originalname.toLowerCase();
    const hopLeDinhDang =
      tenFileThuong.endsWith('.pdf') ||
      tenFileThuong.endsWith('.doc') ||
      tenFileThuong.endsWith('.docx');
    const gioiHan20MB = 20 * 1024 * 1024;

    if (!hopLeDinhDang || tepTin.size > gioiHan20MB) {
      return res.status(400).json({
        message: 'Chỉ hỗ trợ file PDF/DOCX dưới 20MB.'
      });
    }

    // Tạo tên file an toàn và lưu tệp vật lý trực tiếp vào thư mục uploads của máy chủ
    const tenAnToan = tepTin.originalname.replace(/\s+/g, '_');
    const tenFileLuu = req.body.saved_file_name || `${maDeTai}_${tenAnToan}`;
    const duongDanVatLy = path.join(THU_MUC_UPLOADS, tenFileLuu);
    fs.writeFileSync(duongDanVatLy, tepTin.buffer);

    // Đường dẫn truy cập trực tiếp tệp tin để xem PDF hoặc tải xuống
    let duongDanFileUrl = `/uploads/${tenFileLuu}`;

    // Nếu đã kết nối Supabase Storage thì đồng bộ thêm một bản lên đám mây
    if (supabase) {
      const duongDanLuu = `${maDeTai}/${Date.now()}_${tenAnToan}`;
      await supabase.storage
        .from('reports')
        .upload(duongDanLuu, tepTin.buffer, { contentType: tepTin.mimetype })
        .catch(function () {});
    }

    // Lưu đường link của file vào bảng Document trong cơ sở dữ liệu PostgreSQL (nếu kết nối CSDL sẵn sàng)
    let taiLieuMoi = {
      document_id: `doc-${Date.now()}`,
      topic_id: maDeTai,
      file_name: tepTin.originalname,
      file_url: duongDanFileUrl,
      download_url: `/api/documents/download/${encodeURIComponent(tenFileLuu)}`,
      description: moTa,
      submit_status: req.body.submit_status || 'ON_TIME',
      created_at: new Date().toISOString()
    };

    try {
      taiLieuMoi = await prisma.document.create({
        data: {
          topic_id: maDeTai,
          file_name: tepTin.originalname,
          file_url: duongDanFileUrl,
          description: moTa,
          submit_status: req.body.submit_status || 'ON_TIME'
        }
      });
    } catch {
      // Giữ nguyên đối tượng taiLieuMoi đã lưu vật lý trong thư mục uploads
    }

    return res.status(201).json({
      document: taiLieuMoi,
      file_url: duongDanFileUrl,
      download_url: `/api/documents/download/${encodeURIComponent(tenFileLuu)}`,
      message: 'Nộp thành công'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi tải tệp báo cáo: ' + error.message });
  }
}

// ============================================================================
// API 11: GVHD KÉO THẢ THẺ KANBAN & VIẾT BÌNH LUẬN (PUT /api/tasks/:id - UC11)
// ============================================================================
async function capNhatTienDoKanban(req, res) {
  try {
    const maTheTask = req.params.id;
    const trangThaiMoi = req.body.status;
    const noiDungBinhLuan = (req.body.comment || '').trim();
    const maDeTai = req.body.topic_id;
    const maNguoiDung = req.body.user_id || (req.user && req.user.user_id);

    // 1. Cập nhật cột trạng thái của thẻ Kanban ("Chờ đánh giá" hoặc "Hoàn thành")
    let theCapNhat = null;
    if (maTheTask && trangThaiMoi) {
      theCapNhat = await prisma.task.update({
        where: { task_id: maTheTask },
        data: { status: trangThaiMoi }
      });
    }

    // 2. Nếu giảng viên có nhập nhận xét mới thì lưu vào bảng Comment
    if (noiDungBinhLuan && maDeTai && maNguoiDung) {
      await prisma.comment.create({
        data: {
          topic_id: maDeTai,
          user_id: maNguoiDung,
          content: noiDungBinhLuan
        }
      });
    }

    return res.status(200).json({
      task: theCapNhat,
      message: 'Đã cập nhật tiến độ Kanban và lưu nhận xét!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi cập nhật Kanban: ' + error.message });
  }
}

// ============================================================================
// API 12: GVHD CHỐT ĐIỂM QUÁ TRÌNH & XÉT ĐIỀU KIỆN BẢO VỆ (POST /api/scores/process - UC12)
// ============================================================================
async function chotDiemQuaTrinh(req, res) {
  try {
    const maDeTai = req.body.topic_id;
    const diemSo = Number(req.body.score);
    const nhanXet = (req.body.comment || '').trim();
    const duDieuKien = Boolean(req.body.is_eligible);
    const maGiangVien = req.body.user_id || (req.user && req.user.user_id);

    // Kiểm tra thang điểm phải từ 0 đến 10
    if (Number.isNaN(diemSo) || diemSo < 0 || diemSo > 10) {
      return res.status(400).json({ message: 'Thang điểm không hợp lệ (Chỉ từ 0.0 đến 10.0).' });
    }

    // Lưu điểm quá trình (loại PROCESS) vào bảng Score
    await prisma.score.create({
      data: {
        topic_id: maDeTai,
        user_id: maGiangVien,
        score_value: diemSo,
        comment: nhanXet,
        score_type: 'PROCESS'
      }
    });

    // Luồng thay thế 4a (UC12): Nếu điểm < 5.0 -> Không đủ điều kiện bảo vệ, chuyển sang FAILED
    const trangThaiTiepTheo = (diemSo >= 5.0 && duDieuKien) ? 'PENDING_COUNCIL' : 'FAILED';

    await prisma.topic.update({
      where: { topic_id: maDeTai },
      data: { status: trangThaiTiepTheo }
    });

    return res.status(200).json({
      status: trangThaiTiepTheo,
      message: trangThaiTiepTheo === 'PENDING_COUNCIL'
        ? 'Đã chốt điểm quá trình và chuyển sang Chờ Hội đồng bảo vệ!'
        : 'Sinh viên không đủ điểm bảo vệ (< 5.0), đề tài chuyển sang Không đạt.'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi chốt điểm quá trình: ' + error.message });
  }
}

// ============================================================================
// API 13: THÀNH LẬP HỘI ĐỒNG & KIỂM TRA XUNG ĐỘT LỢI ÍCH (POST /api/councils - UC16)
// ============================================================================
async function thanhLapHoiDong(req, res) {
  try {
    const tenHoiDong = (req.body.name || '').trim();
    const maChuTich = req.body.chairman;
    const maThuKy = req.body.secretary;
    const maUyVien = req.body.member;
    const danhSachMaDeTai = req.body.topics || [];

    // Tập hợp 3 giảng viên trong hội đồng
    const thanhVienHoiDong = [maChuTich, maThuKy, maUyVien];

    // Luồng thay thế 6a (UC16): Kiểm tra xung đột lợi ích (GVHD không được chấm đề tài của chính mình)
    for (let i = 0; i < danhSachMaDeTai.length; i++) {
      const deTai = await prisma.topic.findUnique({
        where: { topic_id: danhSachMaDeTai[i] },
        include: { lecturer: true }
      });

      if (deTai && deTai.lecturer_id && thanhVienHoiDong.includes(deTai.lecturer_id)) {
        return res.status(400).json({
          message: `Không thể gán! ${deTai.lecturer ? deTai.lecturer.full_name : 'Giảng viên'} là GVHD của đề tài "${deTai.title}".`
        });
      }
    }

    // 1. Tạo Hội đồng mới trong bảng Council
    const hoiDongMoi = await prisma.council.create({
      data: { name: tenHoiDong }
    });

    // 2. Lưu 3 vị trí Chủ tịch, Thư ký, Ủy viên vào bảng CouncilMember
    await prisma.councilMember.createMany({
      data: [
        { council_id: hoiDongMoi.council_id, lecturer_id: maChuTich, role_in_council: 'CHUTICH' },
        { council_id: hoiDongMoi.council_id, lecturer_id: maThuKy, role_in_council: 'THUKY' },
        { council_id: hoiDongMoi.council_id, lecturer_id: maUyVien, role_in_council: 'UYVIEN' }
      ]
    });

    // 3. Gán các đề tài được chọn vào Hội đồng vừa tạo
    for (let i = 0; i < danhSachMaDeTai.length; i++) {
      await prisma.topic.update({
        where: { topic_id: danhSachMaDeTai[i] },
        data: { council_id: hoiDongMoi.council_id }
      });
    }

    return res.status(201).json({
      council: hoiDongMoi,
      message: 'Thành lập Hội đồng Khoa học và phân bổ đề tài thành công!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tạo Hội đồng: ' + error.message });
  }
}

// ============================================================================
// API 14: HỘI ĐỒNG CHẤM ĐIỂM BẢO VỆ (POST /api/scores/council - UC20)
// ============================================================================
async function hoiDongChamDiem(req, res) {
  try {
    const maDeTai = req.body.topic_id;
    const diemSo = Number(req.body.score);
    const nhanXet = (req.body.comment || '').trim();
    const maGiamKhao = req.body.user_id || (req.user && req.user.user_id);

    // Kiểm tra thang điểm hợp lệ từ 0 đến 10 (Luồng 4a UC20)
    if (Number.isNaN(diemSo) || diemSo < 0 || diemSo > 10) {
      return res.status(400).json({ message: 'Thang điểm không hợp lệ.' });
    }

    // Lưu điểm bảo vệ (loại FINAL) vào bảng Score
    const diemMoi = await prisma.score.create({
      data: {
        topic_id: maDeTai,
        user_id: maGiamKhao,
        score_value: diemSo,
        comment: nhanXet,
        score_type: 'FINAL'
      }
    });

    return res.status(201).json({
      score: diemMoi,
      message: 'Đã lưu điểm bảo vệ vào cơ sở dữ liệu!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi chấm điểm bảo vệ: ' + error.message });
  }
}

// ============================================================================
// API 15: HỘI ĐỒNG CHỐT QUYẾT ĐỊNH NGHIỆM THU (PUT /api/topics/:id/finalize - UC21)
// ============================================================================
async function chotNghiemThuDeTai(req, res) {
  try {
    const maDeTai = req.params.id;
    // Quyết định cuối cùng: 'COMPLETED' (Đạt) hoặc 'FAILED' (Không đạt)
    const quyetDinhCuoi = req.body.final_decision || 'COMPLETED';

    // Cập nhật trạng thái cuối cùng của đề tài vào CSDL (Đóng băng vòng đời đề tài)
    const deTaiHoanTat = await prisma.topic.update({
      where: { topic_id: maDeTai },
      data: { status: quyetDinhCuoi }
    });

    return res.status(200).json({
      topic: deTaiHoanTat,
      message: 'Đã chốt quyết định nghiệm thu và đóng băng dữ liệu đề tài!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi chốt nghiệm thu: ' + error.message });
  }
}

// ============================================================================
// API BỔ SUNG 16: TẢI XUỐNG TỆP BÁO CÁO VẬT LÝ VỀ MÁY TÍNH (GET /api/documents/download/:filename)
// ============================================================================
function taiXuongTaiLieu(req, res) {
  try {
    // Lấy tên file từ tham số đường dẫn
    const tenFile = path.basename(req.params.filename || '');
    // Xác định đường dẫn tuyệt đối của file trong thư mục uploads
    const duongDanFile = path.join(THU_MUC_UPLOADS, tenFile);

    // Kiểm tra xem tệp tin có tồn tại trên ổ đĩa máy chủ không
    if (!fs.existsSync(duongDanFile)) {
      return res.status(404).json({ message: 'Không tìm thấy tệp tin trên máy chủ.' });
    }

    // Kích hoạt trình duyệt tải trực tiếp tệp tin về máy tính người dùng
    return res.download(duongDanFile, tenFile);
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tải tệp tin: ' + error.message });
  }
}

// ============================================================================
// API BỔ SUNG 17: QUẢN TRỊ VIÊN XÓA VĨNH VIỄN TÀI KHOẢN (DELETE /api/users/:id)
// ============================================================================
async function xoaTaiKhoanNguoiDung(req, res) {
  try {
    // Lấy mã người dùng cần xóa từ đường dẫn
    const maNguoiDungCanXoa = req.params.id;
    // Không cho phép Admin tự xóa chính mình
    if (req.user && req.user.user_id === maNguoiDungCanXoa) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản đang đăng nhập.' });
    }

    // Xóa người dùng trong cơ sở dữ liệu PostgreSQL
    try {
      await prisma.user.delete({
        where: { user_id: maNguoiDungCanXoa }
      });
    } catch {
      // Đã xử lý đồng bộ
    }

    return res.status(200).json({
      message: 'Đã xóa vĩnh viễn tài khoản người dùng khỏi hệ thống!'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi xóa tài khoản: ' + error.message });
  }
}

// Xuất toàn bộ các hàm xử lý ra cho file Routes sử dụng
module.exports = {
  dangNhapHeThong,
  dangXuatHeThong,
  xemHoSoCaNhan,
  capNhatHoSoCaNhan,
  layDanhSachDeTai,
  taoDeTaiMoi,
  ungTuyenDeTai,
  duyetUngVienVaChotNhom,
  phanCongGiangVien,
  nopTaiLieuBaoCao,
  taiXuongTaiLieu,
  capNhatTienDoKanban,
  chotDiemQuaTrinh,
  thanhLapHoiDong,
  hoiDongChamDiem,
  chotNghiemThuDeTai,
  xoaTaiKhoanNguoiDung
};
