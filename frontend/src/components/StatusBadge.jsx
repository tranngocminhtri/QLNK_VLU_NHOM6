const TOPIC_STATUS_MAP = {
  RECRUITING: { label: 'Đang tuyển SV', cls: 'badge-recruiting' },
  PENDING_ADMIN: { label: 'Chờ Khoa duyệt', cls: 'badge-pending-admin' },
  PENDING_LECTURER: { label: 'Chờ GVHD xác nhận', cls: 'badge-pending-lecturer' },
  IN_PROGRESS: { label: 'Đang thực hiện', cls: 'badge-in-progress' },
  PENDING_COUNCIL: { label: 'Chờ bảo vệ HĐ', cls: 'badge-pending-council' },
  COMPLETED: { label: 'Hoàn thành (Đạt)', cls: 'badge-completed' },
  FAILED: { label: 'Không đạt / Hủy', cls: 'badge-failed' },
};

export function TopicStatusBadge({ status }) {
  const info = TOPIC_STATUS_MAP[status] || { label: status || 'Không rõ', cls: 'badge-default' };
  return <span className={`status-badge ${info.cls}`}>{info.label}</span>;
}

export function SubmitStatusBadge({ status }) {
  if (status === 'LATE') {
    return <span className="status-badge badge-failed">LATE • Nộp trễ hạn</span>;
  }
  return <span className="status-badge badge-completed">ON_TIME • Đúng hạn</span>;
}
