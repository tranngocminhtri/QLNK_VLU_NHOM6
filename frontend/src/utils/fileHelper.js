// =========================================================================
// TIỆN ÍCH TẢI XUỐNG TỆP BÁO CÁO (.PDF, .DOCX)
// File được lấy qua API có kèm JWT, máy chủ kiểm tra quyền trước khi trả nội dung.
// =========================================================================
import { apiFetchDocumentBlob } from '../services/api';

// Tải trực tiếp tệp báo cáo thật về máy tính của người dùng
export async function downloadRealDocument(documentItem) {
  if (!documentItem) return;
  try {
    const blobUrl = URL.createObjectURL(await apiFetchDocumentBlob(documentItem.document_id));
    const theTai = document.createElement('a');
    theTai.href = blobUrl;
    theTai.setAttribute('download', documentItem.file_name || 'Bao_Cao_NCKH.pdf');
    document.body.appendChild(theTai);
    theTai.click();
    document.body.removeChild(theTai);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    window.alert(err.message);
  }
}
