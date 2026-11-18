export default function SimilarityBadge({ result, compact = false }) {
  if (!result) return null;

  const pct = Number(result.percentage ?? result ?? 0);
  const isDanger = pct >= 30;

  if (compact) {
    return (
      <span
        className={`sim-pill ${isDanger ? 'sim-pill-danger' : 'sim-pill-safe'}`}
        title="Tỷ lệ trùng lặp nội dung so với các đề tài khóa trước"
      >
        Trùng lặp: {pct}%
      </span>
    );
  }

  return (
    <div className={`similarity-panel ${isDanger ? 'sim-danger' : 'sim-safe'}`}>
      <div className="sim-header">
        <div>
          <strong>Kiểm tra độ trùng lặp đề tài tự động: </strong>
          <span className="sim-score-value">{pct}%</span>
        </div>
        <span className={`status-badge ${isDanger ? 'badge-failed' : 'badge-completed'}`}>
          {isDanger ? 'Trùng lặp cao (>= 30%)' : 'Hợp lệ (< 30%)'}
        </span>
      </div>
      <div className="sim-progress-track">
        <div
          className={`sim-progress-fill ${isDanger ? 'fill-danger' : 'fill-safe'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {result.matchedTopic && pct > 0 && (
        <div className="sim-match-detail">
          Đề tài tương đồng nhất: <b>{result.matchedTopic.title}</b>
          {isDanger && (
            <div className="sim-error-msg">
              ⚠️ Nội dung trùng lặp vượt mức cho phép (30%). Vui lòng điều chỉnh lại Tên hoặc Tóm tắt đề tài.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
