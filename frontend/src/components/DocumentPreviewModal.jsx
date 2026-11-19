// Nhập hook useEffect, useState từ React để tải nội dung tệp PDF từ máy chủ
import { useEffect, useState } from 'react';
// Nhập huy hiệu hiển thị trạng thái nộp đúng hạn hay trễ hạn
import { SubmitStatusBadge } from './StatusBadge';
// Nhập hàm tải xuống tệp thật từ fileHelper
import { downloadRealDocument } from '../utils/fileHelper';
// Nhập hàm tải nội dung file (kèm JWT) từ máy chủ
import { apiFetchDocumentBlob } from '../services/api';
// Nhập hàm định dạng ngày giờ chuẩn tiếng Việt
import { formatDateTimeVN } from '../utils/validators';

// Thành phần Modal Xem trực tiếp (Preview) và Tải xuống tệp báo cáo thật (UC06, UC11, UC19)
export default function DocumentPreviewModal({ documentItem, topic, onClose }) {
  // Đường dẫn Blob tạm thời của file PDF để nhúng vào khung iframe
  const [iframeSrc, setIframeSrc] = useState('');
  const [loiTaiTep, setLoiTaiTep] = useState('');

  const tenFileThuong = (documentItem?.file_name || '').toLowerCase();
  const isPdf = tenFileThuong.endsWith('.pdf');
  const documentId = documentItem?.document_id;

  // Tải nội dung PDF qua API (máy chủ kiểm tra quyền xem) rồi tạo Blob URL để trình duyệt hiển thị
  useEffect(
    function () {
      if (!documentId || !isPdf) return undefined;
      let blobUrl = '';
      let daHuy = false;
      apiFetchDocumentBlob(documentId)
        .then(function (blob) {
          if (daHuy) return;
          blobUrl = URL.createObjectURL(blob);
          setIframeSrc(blobUrl);
          setLoiTaiTep('');
        })
        .catch((err) => !daHuy && setLoiTaiTep(err.message));
      return function () {
        daHuy = true;
        setIframeSrc('');
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      };
    },
    [documentId, isPdf]
  );

  // Nếu chưa chọn tài liệu nào thì không hiển thị cửa sổ
  if (!documentItem) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-lg"
        style={{ maxWidth: '960px', width: '95%' }}
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {/* Phần đầu cửa sổ: Tên file và nút đóng */}
        <div className="modal-header">
          <div>
            <span className="modal-tag">
              {isPdf ? '📄 Trình đọc tài liệu PDF trực tiếp' : '📝 Tài liệu Word (.DOC / .DOCX)'}
            </span>
            <h3>{documentItem.file_name}</h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Phần thân cửa sổ: Thông tin tệp và khung hiển thị nội dung file thật */}
        <div className="modal-body">
          <div className="doc-meta-grid">
            <div>
              <span className="meta-label">Thuộc đề tài:</span>
              <strong>{topic ? `[${topic.topic_id}] ${topic.title}` : documentItem.topic_id}</strong>
            </div>
            <div>
              <span className="meta-label">Thời gian nộp:</span>
              <strong>{formatDateTimeVN(documentItem.created_at)}</strong>
            </div>
            <div>
              <span className="meta-label">Trạng thái hạn nộp:</span>
              <SubmitStatusBadge status={documentItem.submit_status} />
            </div>
            <div>
              <span className="meta-label">Mô tả của người nộp:</span>
              <strong>{documentItem.description || 'Báo cáo tiến độ đề tài'}</strong>
            </div>
          </div>

          {loiTaiTep && (
            <div className="alert-warning" style={{ marginTop: '14px' }}>
              {loiTaiTep}
            </div>
          )}

          {/* Nếu là file PDF và có đường dẫn hợp lệ -> Nhúng trình đọc PDF thật vào khung iframe */}
          {isPdf && iframeSrc ? (
            <div style={{ marginTop: '14px' }}>
              <iframe
                src={iframeSrc}
                title={documentItem.file_name}
                style={{
                  width: '100%',
                  height: '540px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                }}
              />
            </div>
          ) : (
            /* Nếu là file Word (.doc/.docx) -> Hiển thị thông tin tệp và nút tải xuống mở bằng Microsoft Word */
            <div className="doc-preview-sheet" style={{ marginTop: '14px' }}>
              <h4>📝 Tệp tài liệu định dạng Microsoft Word ({documentItem.file_name})</h4>
              <p className="sheet-desc" style={{ marginTop: '8px' }}>
                <b>Mô tả đính kèm:</b> {documentItem.description || 'Không có mô tả.'}
              </p>
              <p style={{ marginTop: '12px', color: '#475569' }}>
                💡 Trình duyệt hỗ trợ đọc trực tiếp tệp PDF ngay trong khung xem trước. Đối với tệp Word (<code>.doc</code> / <code>.docx</code>), vui lòng bấm nút <b>&ldquo;⬇️ Tải tệp về máy tính&rdquo;</b> bên dưới để tải tệp gốc về mở bằng Microsoft Word.
              </p>
            </div>
          )}
        </div>

        {/* Chân cửa sổ: Nút Mở tab mới, Nút Tải file thật về máy và Nút Đóng */}
        <div className="modal-footer">
          {iframeSrc && (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
            >
              ↗️ Mở tệp trong tab mới
            </a>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={function () {
              downloadRealDocument(documentItem);
            }}
          >
            ⬇️ Tải tệp về máy tính ({documentItem.file_name})
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
