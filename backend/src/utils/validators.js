// Bản CommonJS sinh từ frontend/src/utils/validators.js để Backend và Frontend dùng chung một logic.
// Khi sửa thuật toán/luật kiểm tra, sửa cả hai file.
// =========================================================================
// BỘ HÀM KIỂM TRA DỮ LIỆU ĐẦU VÀO (VALIDATION) BÁM SÁT ĐẶC TẢ USE CASE
// Giúp kiểm tra email Văn Lang, số điện thoại, file báo cáo, điểm số và ngày tháng
// =========================================================================

// Hàm 1 (UC01 & BR01): Kiểm tra email phải thuộc tên miền trường Đại học Văn Lang (@vanlanguni.vn)
function validateVluEmail(email = '') {
  // Chuyển email về dạng chuỗi, cắt khoảng trắng hai đầu và đổi sang chữ thường
  const emailChuanHoa = String(email).trim().toLowerCase();

  // Nếu người dùng để trống ô nhập email
  if (emailChuanHoa.length === 0) {
    // Trả về kết quả không hợp lệ kèm câu thông báo nhắc nhở
    return { valid: false, message: 'Vui lòng nhập địa chỉ email.' };
  }

  // Kiểm tra email có chứa ký tự @ và dấu chấm hay không
  if (emailChuanHoa.includes('@') === false || emailChuanHoa.includes('.') === false) {
    // Trả về thông báo sai định dạng email cơ bản
    return { valid: false, message: 'Định dạng email không hợp lệ.' };
  }

  // Kiểm tra bắt buộc đuôi email phải kết thúc bằng @vanlanguni.vn theo quy tắc BR01
  if (emailChuanHoa.endsWith('@vanlanguni.vn') === false) {
    // Từ chối truy cập nếu dùng Gmail cá nhân hoặc email khác
    return {
      valid: false,
      message: 'Truy cập bị từ chối. Vui lòng dùng email do trường cấp (@vanlanguni.vn).',
    };
  }

  // Nếu vượt qua mọi bước kiểm tra thì trả về hợp lệ
  return { valid: true, message: '' };
}

// Hàm 2 (UC03): Kiểm tra số điện thoại liên hệ (bắt đầu bằng số 0, dài từ 9 đến 11 chữ số, không chứa chữ cái)
function validatePhone(phone = '') {
  // Cắt bỏ khoảng trắng thừa ở 2 đầu chuỗi số điện thoại
  const soDienThoai = String(phone).trim();

  // Nếu người dùng chưa nhập số điện thoại
  if (soDienThoai.length === 0) {
    // Báo lỗi yêu cầu nhập
    return { valid: false, message: 'Vui lòng nhập số điện thoại liên hệ.' };
  }

  // Kiểm tra chữ số đầu tiên phải là số '0' và độ dài từ 9 đến 11 ký tự
  if (soDienThoai.startsWith('0') === false || soDienThoai.length < 9 || soDienThoai.length > 11) {
    // Báo lỗi chi tiết cho người dùng sửa lại
    return {
      valid: false,
      message: 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại (SĐT phải bắt đầu bằng số 0, gồm 9-11 chữ số và không chứa chữ cái).',
    };
  }

  // Duyệt qua từng ký tự để đảm bảo tất cả đều là chữ số từ 0 đến 9
  for (let i = 0; i < soDienThoai.length; i++) {
    // Lấy ký tự tại vị trí i
    const kyTu = soDienThoai[i];
    // Nếu ký tự nhỏ hơn '0' hoặc lớn hơn '9' thì tức là có lẫn chữ cái hoặc ký tự lạ
    if (kyTu < '0' || kyTu > '9') {
      // Báo lỗi không hợp lệ
      return {
        valid: false,
        message: 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại (SĐT phải bắt đầu bằng số 0, gồm 9-11 chữ số và không chứa chữ cái).',
      };
    }
  }

  // Trả về kết quả số điện thoại hợp lệ
  return { valid: true, message: '' };
}

// Hàm 3 (UC06 & BR03): Kiểm tra tệp báo cáo đính kèm (Chỉ nhận đuôi .pdf, .doc, .docx và dung lượng <= 20MB)
function validateDocumentFile(file) {
  // Nếu người dùng chưa chọn tệp nào
  if (!file) {
    // Báo lỗi nhắc chọn tệp
    return { valid: false, message: 'Vui lòng chọn tệp báo cáo để tải lên.' };
  }

  // Quy đổi 20MB ra đơn vị Bytes (20 * 1024 KB * 1024 Bytes)
  const dungLuongToiDa = 20 * 1024 * 1024;
  // Lấy tên file và chuyển về chữ thường để kiểm tra phần mở rộng
  const tenFile = String(file.name || '').toLowerCase();

  // Kiểm tra xem tên file có kết thúc bằng .pdf, .doc hoặc .docx hay không
  const laDuoiHopLe =
    tenFile.endsWith('.pdf') || tenFile.endsWith('.doc') || tenFile.endsWith('.docx');

  // Kiểm tra xem dung lượng file có vượt quá 20MB hay không
  const biVuotDungLuong = file.size && file.size > dungLuongToiDa;

  // Nếu sai định dạng đuôi file hoặc vượt quá 20MB thì chặn lại
  if (laDuoiHopLe === false || biVuotDungLuong) {
    // Trả về đúng thông báo lỗi theo đặc tả UC06
    return {
      valid: false,
      message: 'Chỉ hỗ trợ file PDF/DOCX dưới 20MB.',
    };
  }

  // Nếu tệp tin đạt chuẩn thì cho phép tải lên
  return { valid: true, message: '' };
}

// Hàm 4 (UC12, UC20 & BR04): Kiểm tra điểm số nhập vào phải nằm trong thang điểm từ 0.0 đến 10.0
function validateScoreValue(rawScore) {
  // Kiểm tra nếu ô điểm bị bỏ trống
  if (rawScore === '' || rawScore === null || rawScore === undefined) {
    // Báo lỗi yêu cầu nhập điểm
    return { valid: false, message: 'Vui lòng nhập điểm số.' };
  }

  // Ép kiểu dữ liệu sang kiểu số thực (Number)
  const giaTriDiem = Number(rawScore);

  // Kiểm tra nếu không phải là số hợp lệ hoặc nhỏ hơn 0 hoặc lớn hơn 10
  if (Number.isNaN(giaTriDiem) || giaTriDiem < 0 || giaTriDiem > 10) {
    // Báo lỗi vi phạm thang điểm quy định
    return { valid: false, message: 'Thang điểm không hợp lệ (Chỉ chấp nhận từ 0.0 đến 10.0).' };
  }

  // Làm tròn đến 2 chữ số thập phân và trả về kết quả hợp lệ
  return { valid: true, value: Math.round(giaTriDiem * 100) / 100, message: '' };
}

// Hàm 5 (UC13): Kiểm tra logic thời gian đóng/mở đợt đăng ký (Ngày bắt đầu phải nhỏ hơn Ngày kết thúc)
function validateTimelineDates(startDate, endDate) {
  // Nếu thiếu 1 trong 2 mốc ngày
  if (!startDate || !endDate) {
    // Yêu cầu người dùng chọn đủ cả 2 ngày
    return { valid: false, message: 'Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc.' };
  }

  // Chuyển chuỗi ngày bắt đầu thành đối tượng thời gian Date
  const mocBatDau = new Date(startDate);
  // Chuyển chuỗi ngày kết thúc thành đối tượng thời gian Date
  const mocKetThuc = new Date(endDate);

  // Nếu ngày không hợp lệ hoặc ngày bắt đầu diễn ra sau (hoặc trùng) ngày kết thúc
  if (
    Number.isNaN(mocBatDau.getTime()) ||
    Number.isNaN(mocKetThuc.getTime()) ||
    mocBatDau >= mocKetThuc
  ) {
    // Trả về lỗi theo đặc tả UC13
    return {
      valid: false,
      message: 'Ngày kết thúc không hợp lệ (Ngày bắt đầu phải nhỏ hơn Ngày kết thúc).',
    };
  }

  // Trả về hợp lệ nếu ngày bắt đầu nhỏ hơn ngày kết thúc
  return { valid: true, message: '' };
}

// Hàm 6: Định dạng chuỗi thời gian ISO sang ngày giờ chuẩn tiếng Việt (VD: 15/10/2026, 08:30)
function formatDateTimeVN(isoStr) {
  // Nếu không có dữ liệu ngày giờ thì trả về dấu gạch ngang
  if (!isoStr) {
    return '—';
  }
  // Khởi tạo đối tượng Date từ chuỗi ISO
  const ngayGio = new Date(isoStr);
  // Nếu không đọc được ngày hợp lệ thì trả về nguyên chuỗi gốc
  if (Number.isNaN(ngayGio.getTime())) {
    return isoStr;
  }
  // Định dạng sang chuẩn ngày tháng năm và giờ phút của Việt Nam
  return ngayGio.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Hàm 7: Định dạng chuỗi thời gian ISO sang ngày tháng năm tiếng Việt (VD: 15/10/2026)
function formatDateVN(isoStr) {
  // Nếu không có dữ liệu thì trả về dấu gạch ngang
  if (!isoStr) {
    return '—';
  }
  // Khởi tạo đối tượng Date
  const ngay = new Date(isoStr);
  // Nếu chuỗi ngày bị lỗi thì trả về nguyên gốc
  if (Number.isNaN(ngay.getTime())) {
    return isoStr;
  }
  // Định dạng ngày/tháng/năm chuẩn Việt Nam
  return ngay.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

module.exports = { validateVluEmail, validatePhone, validateDocumentFile, validateScoreValue, validateTimelineDates, formatDateTimeVN, formatDateVN };
