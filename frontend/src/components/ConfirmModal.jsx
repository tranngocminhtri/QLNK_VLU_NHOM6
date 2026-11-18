/**
 * UC21 - Popup xác nhận đóng băng dữ liệu khi Hội đồng Khoa học chốt quyết định nghiệm thu
 */
export default function ConfirmModal({
  open,
  title = 'Xác nhận thao tác hệ thống',
  message = 'Hành động này sẽ khóa toàn bộ dữ liệu. Bạn có chắc chắn?',
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn-close" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
