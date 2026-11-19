import { useState, useMemo } from 'react';
import { TopicStatusBadge } from '../components/StatusBadge';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { downloadRealDocument } from '../utils/fileHelper';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_IN_COUNCIL_LABEL = {
  CHUTICH: 'Chủ tịch Hội đồng',
  THUKY: 'Thư ký Hội đồng',
  UYVIEN: 'Ủy viên phản biện',
};

export default function CouncilPage({
  currentUser,
  topics = [],
  councils = [],
  onSubmitCouncilScore,
  onFinalizeTopicDefense,
}) {
  const myCouncils = useMemo(() => {
    return councils.filter((c) =>
      (c.council_members || []).some((cm) => cm.lecturer_id === currentUser.user_id)
    );
  }, [councils, currentUser.user_id]);

  const myCouncilIds = useMemo(() => {
    return new Set(myCouncils.map((c) => c.council_id));
  }, [myCouncils]);

  const councilTopics = useMemo(() => {
    return topics.filter((t) => t.council_id && myCouncilIds.has(t.council_id));
  }, [topics, myCouncilIds]);

  const [selectedTopicId, setSelectedTopicId] = useState(
    councilTopics[0]?.topic_id || ''
  );
  const [scoreValue, setScoreValue] = useState('9.0');
  const [commentText, setCommentText] = useState(
    'Đề tài giải quyết tốt bài toán thực tiễn của Khoa CNTT, sản phẩm phần mềm hoàn thiện và trình bày báo cáo rõ ràng.'
  );
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, decision: null });

  const selectedTopic = useMemo(
    () =>
      councilTopics.find((t) => t.topic_id === selectedTopicId) ||
      councilTopics[0] ||
      null,
    [councilTopics, selectedTopicId]
  );

  const processScores = useMemo(
    () => (selectedTopic?.scores || []).filter((s) => s.score_type === 'PROCESS'),
    [selectedTopic]
  );
  const finalScores = useMemo(
    () => (selectedTopic?.scores || []).filter((s) => s.score_type === 'FINAL'),
    [selectedTopic]
  );

  const finalAvg = useMemo(() => {
    if (!finalScores.length) return null;
    const sum = finalScores.reduce((acc, s) => acc + s.score_value, 0);
    return (sum / finalScores.length).toFixed(2);
  }, [finalScores]);

  // UC21: chỉ Chủ tịch / Thư ký của Hội đồng chấm đề tài này được chốt nghiệm thu
  const myRoleInTopicCouncil = councils
    .find((c) => c.council_id === selectedTopic?.council_id)
    ?.council_members?.find((cm) => cm.lecturer_id === currentUser.user_id)?.role_in_council;
  const canFinalize = myRoleInTopicCouncil === 'CHUTICH' || myRoleInTopicCouncil === 'THUKY';

  const isFrozen =
    selectedTopic?.is_frozen ||
    selectedTopic?.status === 'COMPLETED' ||
    selectedTopic?.status === 'FAILED';

  const handleSaveScore = async (e) => {
    e.preventDefault();
    if (!selectedTopic) return;
    setFeedback({ type: '', text: '' });
    try {
      const res = await onSubmitCouncilScore({
        topic_id: selectedTopic.topic_id,
        score: scoreValue,
        comment: commentText,
      });
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleConfirmFinalize = async () => {
    if (!selectedTopic || !confirmState.decision) return;
    setFeedback({ type: '', text: '' });
    try {
      const res = await onFinalizeTopicDefense(selectedTopic.topic_id, confirmState.decision);
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setConfirmState({ open: false, decision: null });
    }
  };

  return (
    <div className="page-wrapper">
      {/* Thông tin Hội đồng Khoa học mà giảng viên đang được phân công */}
      <div className="section-card">
        <div className="section-header" style={{ marginBottom: '14px', paddingBottom: '12px' }}>
          <div>
            <h2>Hội đồng Khoa học được phân công ({myCouncils.length})</h2>
            <p className="muted-text">
              Danh mục này tự động hiển thị trên tài khoản của Thầy/Cô khi được Khoa phân công tham gia Hội đồng nghiệm thu
            </p>
          </div>
        </div>

        <div className="topics-grid">
          {myCouncils.map((c) => {
            const myMemberRecord = (c.council_members || []).find(
              (cm) => cm.lecturer_id === currentUser.user_id
            );
            const myRoleLabel =
              ROLE_IN_COUNCIL_LABEL[myMemberRecord?.role_in_council] || 'Thành viên Hội đồng';
            const assignedCount = topics.filter((t) => t.council_id === c.council_id).length;

            return (
              <div key={c.council_id} className="sub-card">
                <div className="topic-card-top" style={{ marginBottom: '8px' }}>
                  <span className="topic-code">{c.council_id}</span>
                  <span className="status-badge badge-pending-council">
                    Vai trò của bạn: {myRoleLabel}
                  </span>
                </div>
                <h3 style={{ marginBottom: '8px' }}>{c.name}</h3>
                <div className="topic-info-box">
                  {(c.council_members || []).map((cm) => (
                    <div key={cm.id}>
                      <strong>{ROLE_IN_COUNCIL_LABEL[cm.role_in_council] || 'Ủy viên'}:</strong>{' '}
                      {cm.lecturer?.full_name}
                      {cm.lecturer_id === currentUser.user_id ? ' (Bạn)' : ''}
                    </div>
                  ))}
                  <div style={{ marginTop: '4px' }}>
                    <strong>Số đề tài phân công:</strong> {assignedCount} đề tài
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {feedback.text && (
        <div className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}>
          {feedback.type === 'error' ? '⛔ ' : '✅ '}
          {feedback.text}
        </div>
      )}

      <div className="council-layout">
        {/* Danh sách đề tài bên trái */}
        <div className="section-card council-sidebar">
          <h3>Đề tài được phân công ({councilTopics.length})</h3>
          <p className="muted-text">Chọn đề tài để xem báo cáo và chấm điểm</p>
          <div className="council-topic-list">
            {councilTopics.map((t) => (
              <button
                key={t.topic_id}
                type="button"
                className={`council-topic-item ${
                  selectedTopic?.topic_id === t.topic_id ? 'active' : ''
                }`}
                onClick={() => setSelectedTopicId(t.topic_id)}
              >
                <div className="topic-card-top">
                  <span className="topic-code">{t.topic_id}</span>
                  <TopicStatusBadge status={t.status} />
                </div>
                <strong>{t.title}</strong>
                <small className="muted-text">GVHD: {t.lecturer?.full_name || '—'}</small>
              </button>
            ))}
          </div>
        </div>

        {/* Chi tiết hồ sơ & Chấm điểm bên phải */}
        <div className="section-card council-main">
          {!selectedTopic ? (
            <div className="empty-state">
              <p>Chọn một đề tài bên trái để xem hồ sơ bảo vệ.</p>
            </div>
          ) : (
            <>
              <div className="section-header">
                <div>
                  <h2>
                    [{selectedTopic.topic_id}] {selectedTopic.title}
                  </h2>
                  <p className="muted-text">{selectedTopic.summary}</p>
                </div>
                <TopicStatusBadge status={selectedTopic.status} />
              </div>

              {isFrozen && (
                <div className="alert-warning">
                  🔒 <b>Hồ sơ đã đóng băng:</b> Đề tài này đã hoàn tất nghiệm thu. Toàn bộ điểm số và tài liệu đã được khóa để đảm bảo tính minh bạch.
                </div>
              )}

              <div className="dashboard-charts-grid">
                <div className="sub-card">
                  <h4>📄 Báo cáo tổng kết của nhóm</h4>
                  {(selectedTopic.documents || []).length === 0 ? (
                    <p className="muted-text">Chưa có tệp báo cáo tổng kết.</p>
                  ) : (
                    selectedTopic.documents.map((doc) => (
                      <div key={doc.document_id} className="doc-row">
                        <div>
                          <strong>{doc.file_name}</strong>
                          <p>{doc.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            👁️ Xem file
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => downloadRealDocument(doc)}
                          >
                            ⬇️ Tải về
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="sub-card">
                  <h4>👨‍🏫 Điểm quá trình (GVHD chấm)</h4>
                  {processScores.length === 0 ? (
                    <p className="muted-text">Chưa có điểm quá trình.</p>
                  ) : (
                    processScores.map((ps) => (
                      <div key={ps.score_id} className="score-card-item">
                        <div className="score-big">{ps.score_value.toFixed(1)}</div>
                        <div>
                          <strong>{ps.user?.full_name || selectedTopic.lecturer?.full_name}</strong>
                          <p>{ps.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form className="sub-card form-grid" onSubmit={handleSaveScore} style={{ marginTop: '18px' }}>
                <div className="full-width">
                  <h4>✍️ Nhập điểm bảo vệ & Nhận xét phản biện</h4>
                </div>

                <div className="form-group">
                  <label>Điểm chấm bảo vệ (Thang điểm 0.0 - 10.0) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    disabled={isFrozen}
                  />
                </div>

                <div className="form-group">
                  <label>Người chấm</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${currentUser.full_name} (${currentUser.title_info || 'Thành viên Hội đồng'})`}
                    disabled
                  />
                </div>

                <div className="form-group full-width">
                  <label>Nhận xét phản biện chuyên môn *</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isFrozen}
                  />
                </div>

                <div className="form-actions full-width">
                  <button type="submit" className="btn btn-primary" disabled={isFrozen}>
                    Lưu điểm bảo vệ
                  </button>
                </div>
              </form>

              <div className="sub-card" style={{ marginTop: '18px' }}>
                <div className="section-header">
                  <div>
                    <h4>⚖️ Tổng hợp điểm Hội đồng & Quyết định nghiệm thu</h4>
                    <p className="muted-text">
                      Điểm trung bình bảo vệ:{' '}
                      <strong className="avg-highlight">
                        {finalAvg ? `${finalAvg} / 10.0` : 'Chưa có điểm'}
                      </strong>
                    </p>
                  </div>

                  {!isFrozen && !canFinalize && (
                    <p className="muted-text">Chỉ Chủ tịch hoặc Thư ký Hội đồng được chốt quyết định nghiệm thu.</p>
                  )}
                  {!isFrozen && canFinalize && (
                    <div className="apply-btn-group">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          setConfirmState({ open: true, decision: 'COMPLETED' })
                        }
                      >
                        Chốt Nghiệm thu: ĐẠT
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() =>
                          setConfirmState({ open: true, decision: 'FAILED' })
                        }
                      >
                        Chốt: KHÔNG ĐẠT
                      </button>
                    </div>
                  )}
                </div>

                {finalScores.length === 0 ? (
                  <p className="muted-text">Chưa có thành viên Hội đồng nào nhập điểm.</p>
                ) : (
                  <div className="results-grid">
                    {finalScores.map((fs) => (
                      <div key={fs.score_id} className="score-card-item">
                        <div className="score-big">{fs.score_value.toFixed(1)}</div>
                        <div>
                          <strong>{fs.user?.full_name || 'Thành viên Hội đồng'}</strong>
                          <p>{fs.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmState.open}
        title="Xác nhận Chốt quyết định Nghiệm thu"
        message="Hành động này sẽ khóa toàn bộ dữ liệu. Bạn có chắc chắn?"
        confirmText="Đồng ý chốt & Khóa hồ sơ"
        cancelText="Hủy bỏ"
        danger={confirmState.decision === 'FAILED'}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setConfirmState({ open: false, decision: null })}
      />

      <DocumentPreviewModal
        documentItem={previewDoc}
        topic={selectedTopic}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
