// =========================================================================
// TIỆN ÍCH XỬ LÝ XEM TRỰC TIẾP & TẢI XUỐNG TỆP BÁO CÁO VẬT LÝ (.PDF, .DOCX)
// Hỗ trợ chuyển đổi Base64 Data URL sang Blob nhị phân và tải tệp thật về máy
// =========================================================================

// Hàm chuyển đổi chuỗi Base64 Data URL sang đối tượng Blob nhị phân thật để trình duyệt hiển thị PDF mượt mà
export function chuyenDataUrlSangBlob(dataUrl) {
  try {
    // Tách phần thông tin định dạng (header) và phần dữ liệu mã hóa (base64)
    const cacPhan = dataUrl.split(',');
    // Lấy kiểu MIME của file (ví dụ: application/pdf)
    const kieuMimeMatch = cacPhan[0].match(/:(.*?);/);
    const kieuMime = kieuMimeMatch ? kieuMimeMatch[1] : 'application/pdf';
    // Giải mã chuỗi base64 thành chuỗi nhị phân
    const chuoiNhiPhan = atob(cacPhan[1]);
    // Tạo mảng byte có độ dài bằng chuỗi nhị phân
    const mangByte = new Uint8Array(chuoiNhiPhan.length);
    // Duyệt qua từng ký tự để gán mã ASCII vào mảng byte
    for (let i = 0; i < chuoiNhiPhan.length; i++) {
      mangByte[i] = chuoiNhiPhan.charCodeAt(i);
    }
    // Trả về đối tượng Blob nhị phân hoàn chỉnh
    return new Blob([mangByte], { type: kieuMime });
  } catch {
    return null;
  }
}

// Hàm tiện ích: Tải trực tiếp tệp báo cáo thật (.PDF, .DOC, .DOCX) về máy tính của người dùng
export function downloadRealDocument(documentItem) {
  // Nếu không có thông tin tài liệu thì dừng lại
  if (!documentItem) {
    return;
  }

  // Trường hợp 1: Nếu tài liệu có lưu dữ liệu nhị phân (file_data_url) khi tải lên
  if (documentItem.file_data_url && documentItem.file_data_url.startsWith('data:')) {
    // Chuyển Data URL thành đối tượng Blob thật
    const doiTuongBlob = chuyenDataUrlSangBlob(documentItem.file_data_url);
    if (doiTuongBlob) {
      // Tạo đường dẫn tải tạm thời từ Blob
      const blobUrl = URL.createObjectURL(doiTuongBlob);
      // Tạo thẻ <a> ẩn để kích hoạt trình duyệt tải file về máy
      const theTai = document.createElement('a');
      theTai.href = blobUrl;
      theTai.setAttribute('download', documentItem.file_name || 'Bao_Cao_NCKH.pdf');
      document.body.appendChild(theTai);
      theTai.click();
      document.body.removeChild(theTai);
      // Giải phóng bộ nhớ sau 2 giây
      setTimeout(function () {
        URL.revokeObjectURL(blobUrl);
      }, 2000);
      return;
    }
  }

  // Trường hợp 2: Tải trực tiếp từ máy chủ Backend qua đường dẫn /api/documents/download hoặc /uploads
  const duongDanTai = documentItem.download_url || documentItem.file_url;
  if (duongDanTai) {
    const theTai = document.createElement('a');
    theTai.href = duongDanTai;
    theTai.setAttribute('download', documentItem.file_name || 'Bao_Cao_NCKH.pdf');
    theTai.target = '_blank';
    document.body.appendChild(theTai);
    theTai.click();
    document.body.removeChild(theTai);
  }
}
