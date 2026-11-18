// =========================================================================
// TIỆN ÍCH XUẤT BÁO CÁO THỐNG KÊ ĐỀ TÀI NCKH RA FILE EXCEL (.XLS) (UC18)
// Dành cho Quản lý Khoa CNTT tổng hợp danh sách đề tài, nhóm SV, GVHD và điểm số
// =========================================================================

// Bảng tra cứu tên trạng thái tiếng Việt tương ứng với mã trạng thái trong Database
const BANG_TEN_TRANG_THAI = {
  RECRUITING: 'Đang tuyển thành viên',
  PENDING_ADMIN: 'Chờ Khoa duyệt',
  PENDING_LECTURER: 'Chờ GVHD xác nhận',
  IN_PROGRESS: 'Đang thực hiện',
  PENDING_COUNCIL: 'Chờ Hội đồng bảo vệ',
  COMPLETED: 'Hoàn thành (Đạt)',
  FAILED: 'Không đạt / Từ chối',
};

// Hàm phụ trợ giúp làm sạch các ký tự HTML đặc biệt để bảng Excel không bị vỡ cấu trúc
function lamSachChuoiHtml(chuoiDauVao) {
  // Chuyển giá trị về dạng chuỗi (nếu null hoặc undefined thì thành chuỗi rỗng)
  const chuoi = String(chuoiDauVao || '');
  // Thay thế các ký tự đặc biệt bằng mã thực thể HTML an toàn
  return chuoi
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Hàm chính: Tạo và tải xuống file báo cáo Excel (.xls) từ danh sách đề tài
export function exportTopicsToExcel(topics = [], users = [], councils = []) {
  // Khởi tạo chuỗi chứa toàn bộ các dòng <tr> của bảng dữ liệu Excel
  let danhSachDongHtml = '';

  // Duyệt qua từng đề tài nghiên cứu bằng vòng lặp for đơn giản
  for (let i = 0; i < topics.length; i++) {
    // Lấy thông tin đề tài ở vị trí thứ i
    const deTai = topics[i];

    // Tìm thông tin Giảng viên hướng dẫn của đề tài này trong danh sách users
    let tenGiangVien = 'Chưa phân công';
    for (let u = 0; u < users.length; u++) {
      // Nếu mã user trùng với mã giảng viên hướng dẫn của đề tài
      if (users[u].user_id === deTai.lecturer_id) {
        // Lấy họ và tên của giảng viên đó
        tenGiangVien = users[u].full_name;
        // Thoát vòng lặp tìm kiếm giảng viên
        break;
      }
    }

    // Tìm tên Hội đồng nghiệm thu của đề tài này trong danh sách councils
    let tenHoiDong = 'Chưa phân bổ';
    for (let c = 0; c < councils.length; c++) {
      // Nếu mã hội đồng trùng với mã hội đồng của đề tài
      if (councils[c].council_id === deTai.council_id) {
        // Lấy tên hội đồng
        tenHoiDong = councils[c].name;
        // Thoát vòng lặp tìm kiếm hội đồng
        break;
      }
    }

    // Ghép danh sách tên các bạn sinh viên đã được duyệt trong nhóm
    const mangTenSinhVien = [];
    // Lấy mảng thành viên của đề tài (nếu chưa có thì dùng mảng rỗng)
    const danhSachThanhVien = deTai.members || [];
    // Duyệt qua từng thành viên trong nhóm
    for (let m = 0; m < danhSachThanhVien.length; m++) {
      // Lấy bản ghi thành viên thứ m
      const thanhVien = danhSachThanhVien[m];
      // Chỉ lấy những sinh viên có trạng thái đã được chấp thuận (APPROVED)
      if (thanhVien.status === 'APPROVED') {
        // Tìm họ tên và mã số sinh viên trong danh sách users
        let thongTinSv = thanhVien.student_id;
        for (let u = 0; u < users.length; u++) {
          // Nếu khớp mã người dùng
          if (users[u].user_id === thanhVien.student_id) {
            // Ghép Họ tên kèm Mã số sinh viên trong ngoặc đơn
            thongTinSv = users[u].full_name + ' (' + users[u].user_code + ')';
            break;
          }
        }
        // Đưa tên sinh viên vào mảng
        mangTenSinhVien.push(thongTinSv);
      }
    }

    // Nối danh sách sinh viên bằng dấu phẩy, nếu mảng rỗng thì ghi 'Chưa chốt nhóm'
    const chuoiNhomSinhVien =
      mangTenSinhVien.length > 0 ? mangTenSinhVien.join(', ') : 'Chưa chốt nhóm';

    // Tính điểm trung bình quá trình (PROCESS) và điểm trung bình bảo vệ hội đồng (FINAL)
    const danhSachDiem = deTai.scores || [];
    // Biến cộng dồn điểm quá trình
    let tongDiemQuaTrinh = 0;
    // Biến đếm số phiếu điểm quá trình
    let soPhieuQuaTrinh = 0;
    // Biến cộng dồn điểm hội đồng
    let tongDiemHoiDong = 0;
    // Biến đếm số phiếu điểm hội đồng
    let soPhieuHoiDong = 0;

    // Duyệt qua từng phiếu điểm của đề tài
    for (let s = 0; s < danhSachDiem.length; s++) {
      // Lấy phiếu điểm thứ s
      const phieuDiem = danhSachDiem[s];
      // Nếu là điểm quá trình do GVHD chấm
      if (phieuDiem.score_type === 'PROCESS') {
        tongDiemQuaTrinh = tongDiemQuaTrinh + Number(phieuDiem.score_value || 0);
        soPhieuQuaTrinh = soPhieuQuaTrinh + 1;
      }
      // Nếu là điểm bảo vệ cuối kỳ do Hội đồng chấm
      if (phieuDiem.score_type === 'FINAL') {
        tongDiemHoiDong = tongDiemHoiDong + Number(phieuDiem.score_value || 0);
        soPhieuHoiDong = soPhieuHoiDong + 1;
      }
    }

    // Tính trung bình cộng điểm quá trình (làm tròn 2 chữ số thập phân)
    const hienThiDiemQuaTrinh =
      soPhieuQuaTrinh > 0 ? (tongDiemQuaTrinh / soPhieuQuaTrinh).toFixed(2) : 'Chưa chấm';

    // Tính trung bình cộng điểm hội đồng (làm tròn 2 chữ số thập phân)
    const hienThiDiemHoiDong =
      soPhieuHoiDong > 0 ? (tongDiemHoiDong / soPhieuHoiDong).toFixed(2) : 'Chưa chấm';

    // Lấy tên trạng thái tiếng Việt
    const tenTrangThai = BANG_TEN_TRANG_THAI[deTai.status] || deTai.status;
    // Lấy tỷ lệ trùng lặp Cosine Similarity
    const doTrungLap = deTai.similarity_score || 0;

    // Nối thêm 1 dòng <tr> mới vào chuỗi HTML của bảng báo cáo
    danhSachDongHtml =
      danhSachDongHtml +
      '<tr>' +
      '<td style="text-align:center;">' + (i + 1) + '</td>' +
      '<td>' + lamSachChuoiHtml(deTai.topic_id) + '</td>' +
      '<td><b>' + lamSachChuoiHtml(deTai.title) + '</b></td>' +
      '<td>' + lamSachChuoiHtml(chuoiNhomSinhVien) + '</td>' +
      '<td>' + lamSachChuoiHtml(tenGiangVien) + '</td>' +
      '<td>' + lamSachChuoiHtml(tenHoiDong) + '</td>' +
      '<td>' + lamSachChuoiHtml(tenTrangThai) + '</td>' +
      '<td style="text-align:center;">' + doTrungLap + '%</td>' +
      '<td style="text-align:center;">' + hienThiDiemQuaTrinh + '</td>' +
      '<td style="text-align:center;">' + hienThiDiemHoiDong + '</td>' +
      '</tr>';
  }

  // Tạo khung tài liệu HTML chuẩn tương thích với phần mềm Microsoft Excel
  const noiDungFileExcel = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background-color: #C8102E; color: #ffffff; font-weight: bold; border: 1px solid #333; padding: 8px; }
          td { border: 1px solid #666; padding: 6px; vertical-align: top; }
          .header-title { font-size: 15pt; font-weight: bold; color: #C8102E; }
        </style>
      </head>
      <body>
        <div class="header-title">TRƯỜNG ĐẠI HỌC VĂN LANG - KHOA CÔNG NGHỆ THÔNG TIN</div>
        <div><b>BÁO CÁO TỔNG HỢP HOẠT ĐỘNG NGHIÊN CỨU KHOA HỌC SINH VIÊN</b></div>
        <div>Ngày xuất báo cáo: ${new Date().toLocaleString('vi-VN')}</div>
        <br/>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã đề tài</th>
              <th>Tên đề tài NCKH</th>
              <th>Nhóm sinh viên thực hiện</th>
              <th>Giảng viên hướng dẫn</th>
              <th>Hội đồng nghiệm thu</th>
              <th>Trạng thái</th>
              <th>Độ trùng lặp</th>
              <th>Điểm quá trình</th>
              <th>Điểm bảo vệ HĐ</th>
            </tr>
          </thead>
          <tbody>
            ${danhSachDongHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Đóng gói chuỗi HTML kèm ký tự BOM (\ufeff) để hiển thị đúng tiếng Việt có dấu trong Excel
  const doiTuongBlob = new Blob(['\ufeff', noiDungFileExcel], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  // Tạo đường dẫn URL tạm thời trên trình duyệt cho đối tượng Blob vừa tạo
  const duongDanTaiFile = URL.createObjectURL(doiTuongBlob);
  // Tạo thẻ <a> ẩn để kích hoạt hành động tải tệp về máy tính
  const theLinkAo = document.createElement('a');
  // Lấy chuỗi ngày hiện tại (YYYY-MM-DD) để đặt tên file báo cáo
  const ngayHienTai = new Date().toISOString().slice(0, 10);
  // Gán đường dẫn tải cho thẻ <a>
  theLinkAo.href = duongDanTaiFile;
  // Đặt tên file khi tải xuống là Bao_Cao_NCKH_VLU_YYYY-MM-DD.xls
  theLinkAo.setAttribute('download', 'Bao_Cao_NCKH_VLU_' + ngayHienTai + '.xls');
  // Gắn thẻ <a> vào thân trang web
  document.body.appendChild(theLinkAo);
  // Tự động bấm vào thẻ <a> để trình duyệt tải file ngay lập tức
  theLinkAo.click();
  // Xóa thẻ <a> khỏi trang web sau khi đã kích hoạt tải xong
  document.body.removeChild(theLinkAo);
  // Giải phóng bộ nhớ của đường dẫn URL tạm thời
  URL.revokeObjectURL(duongDanTaiFile);
}
