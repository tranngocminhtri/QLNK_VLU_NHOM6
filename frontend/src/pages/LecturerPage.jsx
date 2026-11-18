import { useState, useMemo } from 'react';
import { TopicStatusBadge } from '../components/StatusBadge';
import SimilarityBadge from '../components/SimilarityBadge';
import KanbanBoard from '../components/KanbanBoard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { checkTopicSimilarity } from '../utils/similarity';

export default function LecturerPage({
  currentUser,
  topics = [],
  categories = [],
  activeTab = 'KANBAN',
  onSelectTab,
  onCreateLecturerTopic,
  onReviewApplicant,
  onFinalizeGroup,
  onConfirmAssignment,
  onUpdateTaskAndComment,
  onSubmitProcessScore,
}) {
  const myTopics = useMemo(
    () => topics.filter((t) => t.lecturer_id === currentUser.user_id),
    [topics, currentUser.user_id]
  );

  const pendingAssignments = useMemo(
    () => myTopics.filter((t) => t.status === 'PENDING_LECTURER'),
    [myTopics]
  );

  const recruitingTopics = useMemo(
    () => myTopics.filter((t) => t.status === 'RECRUITING'),
    [myTopics]
  );

  const activeGuidedTopics = useMemo(
    () =>
      myTopics.filter((t) =>
        ['IN_PROGRESS', 'PENDING_COUNCIL', 'COMPLETED', 'FAILED'].includes(t.status)
      ),
    [myTopics]
  );

  const [selectedTopicId, setSelectedTopicId] = useState(
    activeGuidedTopics[0]?.topic_id || myTopics[0]?.topic_id || ''
  );
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [previewDoc, setPreviewDoc] = useState(null);

  // Công bố đề tài mới
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [requirements, setRequirements] = useState('');
  const [maxMembers, setMaxMembers] = useState(4);
  const [fieldId, setFieldId] = useState('cat-field-2');

  // Lý do từ chối nhận nhóm
  const [rejectingTopicId, setRejectingTopicId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Điểm quá trình
  const [processScore, setProcessScore] = useState('8.5');
  const [processComment, setProcessComment] = useState(
    'Nhóm sinh viên làm việc nghiêm túc, hoàn thành đầy đủ báo cáo và sản phẩm theo đúng đề cương.'
  );
  const [isEligible, setIsEligible] = useState(true);

  const liveSimilarity = useMemo(() => {
    if (!title.trim() && !summary.trim()) return null;
    return checkTopicSimilarity(title, summary, topics);
  }, [title, summary, topics]);

  const selectedTopic = useMemo(
    () =>
      topics.find((t) => t.topic_id === selectedTopicId) ||
      activeGuidedTopics[0] ||
      myTopics[0] ||
      null,
    [topics, selectedTopicId, activeGuidedTopics, myTopics]
  );

  const fieldCategories = categories.filter((c) => c.type === 'FIELD');

  const handleCreateTopic = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      const res = onCreateLecturerTopic({
        title,
        summary,
        requirements,
        max_members: maxMembers,
        field_id: fieldId,
      });
      setFeedback({ type: 'success', text: res.message });
      setTitle('');
      setSummary('');
      setRequirements('');
      if (onSelectTab) onSelectTab('APPLICANTS');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleScoreSubmit = (e) => {
    e.preventDefault();
    if (!selectedTopic) return;
    setFeedback({ type: '', text: '' });
    try {
      const numVal = Number(processScore);
      const autoEligible = !Number.isNaN(numVal) && numVal < 5.0 ? false : isEligible;
      if (!Number.isNaN(numVal) && numVal < 5.0) {
        setIsEligible(false);
      }
      const res = onSubmitProcessScore({
        topic_id: selectedTopic.topic_id,
        score: processScore,
        comment: processComment,
        is_eligible: autoEligible,
      });
      setFeedback({
        type: res.eligible ? 'success' : 'error',
        text: res.message,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="page-wrapper">
      {/* Thẻ tổng quan nhanh của Giảng viên */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Tổng đề tài phụ trách</span>
          <strong className="kpi-value">{myTopics.length}</strong>
          <small>{currentUser.title_info || 'Giảng viên Khoa CNTT'}</small>
        </div>
        <div
          className="kpi-card kpi-blue"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectTab && onSelectTab('KANBAN')}
        >
          <span className="kpi-label">Đang hướng dẫn thực hiện</span>
          <strong className="kpi-value">{activeGuidedTopics.length}</strong>
          <small>Nhấn để xem bảng tiến độ Kanban</small>
        </div>
        <div
          className="kpi-card kpi-amber"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectTab && onSelectTab('ASSIGNMENTS')}
        >
          <span className="kpi-label">Khoa phân công chờ xác nhận</span>
          <strong className="kpi-value">{pendingAssignments.length}</strong>
          <small>Nhấn để xác nhận tiếp nhận</small>
        </div>
        <div
          className="kpi-card kpi-green"
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectTab && onSelectTab('APPLICANTS')}
        >
          <span className="kpi-label">Đề tài đang mở tuyển SV</span>
          <strong className="kpi-value">{recruitingTopics.length}</strong>
          <small>Nhấn để duyệt hồ sơ ứng viên</small>
        </div>
      </div>

      {feedback.text && (
        <div className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}>
          {feedback.type === 'error' ? '⛔ ' : '✅ '}
          {feedback.text}
        </div>
      )}

      {/* TAB 1: QUẢN LÝ TIẾN ĐỘ KANBAN */}
      {activeTab === 'KANBAN' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Theo dõi & Đánh giá tiến độ nhóm sinh viên</h2>
              <p className="muted-text">Kéo thả thẻ công việc, xem báo cáo đính kèm và gửi nhận xét chuyên môn</p>
            </div>
            {activeGuidedTopics.length > 0 && (
              <select
                className="form-input select-auto"
                value={selectedTopic?.topic_id || ''}
                onChange={(e) => setSelectedTopicId(e.target.value)}
              >
                {activeGuidedTopics.map((t) => (
                  <option key={t.topic_id} value={t.topic_id}>
                    [{t.topic_id}] {t.title.slice(0, 60)}...
                  </option>
                ))}
              </select>
            )}
          </div>

          {!selectedTopic ? (
            <div className="empty-state">
              <p>Chưa có đề tài đang hướng dẫn. Hãy kiểm tra mục Đề tài Khoa phân công ở menu trái.</p>
            </div>
          ) : (
            <>
              <div className="topic-summary-banner">
                <div>
                  <h3>
                    [{selectedTopic.topic_id}] {selectedTopic.title}
                  </h3>
                  <p>{selectedTopic.summary}</p>
                  <div className="member-chips-row">
                    <span>👨‍🎓 Sinh viên thực hiện:</span>
                    {(selectedTopic.members || [])
                      .filter((m) => m.status === 'APPROVED')
                      .map((m) => (
                        <span key={m.id} className="member-chip">
                          {m.student?.full_name} ({m.student?.user_code})
                        </span>
                      ))}
                  </div>
                </div>
                <TopicStatusBadge status={selectedTopic.status} />
              </div>

              <KanbanBoard
                topic={selectedTopic}
                canEditStatus={!selectedTopic.is_frozen}
                onMoveTask={(taskId, newStatus) => {
                  try {
                    const res = onUpdateTaskAndComment({
                      task_id: taskId,
                      topic_id: selectedTopic.topic_id,
                      new_status: newStatus,
                    });
                    setFeedback({ type: 'success', text: res.message });
                  } catch (err) {
                    setFeedback({ type: 'error', text: err.message });
                  }
                }}
                onAddComment={(content) => {
                  try {
                    const res = onUpdateTaskAndComment({
                      topic_id: selectedTopic.topic_id,
                      comment_content: content,
                    });
                    setFeedback({ type: 'success', text: res.message });
                  } catch (err) {
                    setFeedback({ type: 'error', text: err.message });
                  }
                }}
                onCreateTask={(taskTitle) => {
                  try {
                    const res = onUpdateTaskAndComment({
                      topic_id: selectedTopic.topic_id,
                      new_task_title: taskTitle,
                    });
                    setFeedback({ type: 'success', text: res.message });
                  } catch (err) {
                    setFeedback({ type: 'error', text: err.message });
                  }
                }}
                onPreviewDocument={(doc) => setPreviewDoc(doc)}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 2: CHẤM ĐIỂM QUÁ TRÌNH & XÁC NHẬN BẢO VỆ */}
      {activeTab === 'SCORE' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Chấm điểm quá trình & Xét điều kiện bảo vệ</h2>
              <p className="muted-text">Đề tài đạt từ 5.0 điểm trở lên sẽ được chuyển sang danh sách chờ Hội đồng bảo vệ</p>
            </div>
            {activeGuidedTopics.length > 0 && (
              <select
                className="form-input select-auto"
                value={selectedTopic?.topic_id || ''}
                onChange={(e) => setSelectedTopicId(e.target.value)}
              >
                {activeGuidedTopics.map((t) => (
                  <option key={t.topic_id} value={t.topic_id}>
                    [{t.topic_id}] {t.title.slice(0, 55)}...
                  </option>
                ))}
              </select>
            )}
          </div>

          {!selectedTopic ? (
            <div className="empty-state">
              <p>Chưa có đề tài để chấm điểm quá trình.</p>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleScoreSubmit}>
              <div className="full-width topic-summary-banner">
                <div>
                  <strong>
                    [{selectedTopic.topic_id}] {selectedTopic.title}
                  </strong>
                  <p className="muted-text">
                    Đã nộp <b>{selectedTopic.documents?.length || 0} tệp báo cáo</b> • Trạng thái:{' '}
                    <TopicStatusBadge status={selectedTopic.status} />
                  </p>
                </div>
                {selectedTopic.documents?.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setPreviewDoc(selectedTopic.documents[0])}
                  >
                    📄 Xem báo cáo tổng kết
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Điểm đánh giá quá trình (Thang điểm 10) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={processScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProcessScore(val);
                    if (val !== '' && Number(val) < 5.0) {
                      setIsEligible(false);
                    } else if (val !== '' && Number(val) >= 5.0) {
                      setIsEligible(true);
                    }
                  }}
                />
              </div>

              <div className="form-group">
                <label>Xác nhận điều kiện bảo vệ trước Hội đồng</label>
                <label className="checkbox-row" style={{ marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={isEligible && Number(processScore) >= 5.0}
                    onChange={(e) => setIsEligible(e.target.checked)}
                    disabled={Number(processScore) < 5.0}
                  />
                  <span>
                    Đồng ý cho phép nhóm sinh viên ra bảo vệ trước Hội đồng Khoa học (Yêu cầu điểm &gt;= 5.0)
                  </span>
                </label>
              </div>

              <div className="form-group full-width">
                <label>Nhận xét quá trình thực hiện đề tài</label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={processComment}
                  onChange={(e) => setProcessComment(e.target.value)}
                />
              </div>

              <div className="form-actions full-width">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={selectedTopic.is_frozen}
                >
                  Chốt điểm quá trình & Hồ sơ bảo vệ
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: ĐỀ TÀI KHOA PHÂN CÔNG */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Đề tài do Khoa phân công chờ xác nhận ({pendingAssignments.length})</h2>
              <p className="muted-text">Xem nội dung đề cương của sinh viên để xác nhận nhận hướng dẫn hoặc phản hồi lại Khoa</p>
            </div>
          </div>

          {pendingAssignments.length === 0 ? (
            <div className="empty-state">
              <p>Hiện không có đề tài nào đang chờ xác nhận.</p>
            </div>
          ) : (
            <div className="topics-grid">
              {pendingAssignments.map((topic) => (
                <div key={topic.topic_id} className="topic-card">
                  <div className="topic-card-top">
                    <span className="topic-code">{topic.topic_id}</span>
                    <TopicStatusBadge status={topic.status} />
                  </div>
                  <h3>{topic.title}</h3>
                  <p>{topic.summary}</p>
                  <div className="topic-info-box">
                    <div>
                      <strong>Nguyện vọng của nhóm SV:</strong>{' '}
                      {topic.preferred_lecturer_note || 'Theo phân công của Khoa'}
                    </div>
                    <div>
                      <strong>Độ trùng lặp kiểm tra:</strong> {topic.similarity_score}%
                    </div>
                  </div>

                  {rejectingTopicId === topic.topic_id ? (
                    <div className="apply-inline-form">
                      <textarea
                        rows={2}
                        className="form-input"
                        placeholder="Nhập lý do từ chối để Khoa phân công giảng viên khác..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="apply-btn-group">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            try {
                              const res = onConfirmAssignment(topic.topic_id, {
                                accept: false,
                                reject_reason: rejectReason,
                              });
                              setFeedback({ type: 'success', text: res.message });
                              setRejectingTopicId(null);
                              setRejectReason('');
                            } catch (err) {
                              setFeedback({ type: 'error', text: err.message });
                            }
                          }}
                        >
                          Gửi phản hồi từ chối
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setRejectingTopicId(null)}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="apply-btn-group">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          try {
                            const res = onConfirmAssignment(topic.topic_id, { accept: true });
                            setFeedback({ type: 'success', text: res.message });
                            setSelectedTopicId(topic.topic_id);
                            if (onSelectTab) onSelectTab('KANBAN');
                          } catch (err) {
                            setFeedback({ type: 'error', text: err.message });
                          }
                        }}
                      >
                        Chấp nhận hướng dẫn
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setRejectingTopicId(topic.topic_id);
                          setRejectReason('');
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DUYỆT SINH VIÊN ỨNG TUYỂN */}
      {activeTab === 'APPLICANTS' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Duyệt sinh viên ứng tuyển & Chốt nhóm ({recruitingTopics.length})</h2>
              <p className="muted-text">Xem hồ sơ tự giới thiệu của sinh viên ứng tuyển vào các đề tài do Thầy/Cô khởi xướng</p>
            </div>
          </div>

          {recruitingTopics.length === 0 ? (
            <div className="empty-state">
              <p>
                Hiện Thầy/Cô chưa có đề tài nào đang mở tuyển sinh viên. Hãy chọn mục &ldquo;Công bố Đề tài mới&rdquo; ở bảng danh mục bên trái để đăng tải đề tài nghiên cứu.
              </p>
            </div>
          ) : (
            <div className="topics-grid">
              {recruitingTopics.map((topic) => {
                const approvedCount = (topic.members || []).filter(
                  (m) => m.status === 'APPROVED'
                ).length;

                return (
                  <div key={topic.topic_id} className="topic-card">
                    <div className="topic-card-top">
                      <span className="topic-code">{topic.topic_id}</span>
                      <span className="status-badge badge-recruiting">
                        Đã nhận {approvedCount} / {topic.max_members} SV
                      </span>
                    </div>
                    <h3>{topic.title}</h3>
                    <p>{topic.summary}</p>

                    <div className="applicant-section">
                      <h5>Danh sách sinh viên ứng tuyển ({topic.members?.length || 0}):</h5>
                      {(topic.members || []).length === 0 ? (
                        <p className="muted-text">Chưa có sinh viên nộp đơn ứng tuyển.</p>
                      ) : (
                        (topic.members || []).map((m) => (
                          <div key={m.id} className="applicant-row">
                            <div>
                              <strong>
                                {m.student?.full_name} ({m.student?.user_code})
                              </strong>
                              <p className="cover-letter-quote">&ldquo;{m.cover_letter}&rdquo;</p>
                            </div>
                            <div className="applicant-actions">
                              <span
                                className={`status-badge ${
                                  m.status === 'APPROVED'
                                    ? 'badge-completed'
                                    : m.status === 'REJECTED'
                                    ? 'badge-failed'
                                    : 'badge-pending-lecturer'
                                }`}
                              >
                                {m.status === 'PENDING' ? 'Chờ duyệt' : m.status === 'APPROVED' ? 'Đã nhận' : 'Từ chối'}
                              </span>
                              {m.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-xs btn-preview"
                                    onClick={() => {
                                      try {
                                        const res = onReviewApplicant(
                                          topic.topic_id,
                                          m.id,
                                          'APPROVED'
                                        );
                                        setFeedback({ type: 'success', text: res.message });
                                      } catch (err) {
                                        setFeedback({ type: 'error', text: err.message });
                                      }
                                    }}
                                  >
                                    Đồng ý
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-xs btn-move"
                                    onClick={() => {
                                      try {
                                        const res = onReviewApplicant(
                                          topic.topic_id,
                                          m.id,
                                          'REJECTED'
                                        );
                                        setFeedback({ type: 'success', text: res.message });
                                      } catch (err) {
                                        setFeedback({ type: 'error', text: err.message });
                                      }
                                    }}
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="topic-card-footer">
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={() => {
                          try {
                            const res = onFinalizeGroup(topic.topic_id);
                            setFeedback({ type: 'success', text: res.message });
                          } catch (err) {
                            setFeedback({ type: 'error', text: err.message });
                          }
                        }}
                      >
                        Chốt danh sách nhóm & Gửi Khoa duyệt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CÔNG BỐ ĐỀ TÀI MỚI */}
      {activeTab === 'PUBLISH' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Công bố đề tài nghiên cứu mới</h2>
              <p className="muted-text">Đăng tải đề tài lên bảng tin để sinh viên Khoa CNTT tìm hiểu và nộp đơn ứng tuyển</p>
            </div>
          </div>

          {liveSimilarity && <SimilarityBadge result={liveSimilarity} />}

          <form className="form-grid" onSubmit={handleCreateTopic}>
            <div className="form-group full-width">
              <label>Tên đề tài nghiên cứu *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập tên đề tài..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Tóm tắt nội dung & Định hướng thực hiện *</label>
              <textarea
                rows={4}
                className="form-input"
                placeholder="Mô tả mục tiêu, nội dung nghiên cứu và kết quả dự kiến..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Yêu cầu đối với sinh viên ứng tuyển</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Nắm vững ReactJS, Node.js hoặc Python..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Số lượng sinh viên tối đa (1 - 5 SV)</label>
              <input
                type="number"
                min={1}
                max={5}
                className="form-input"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Lĩnh vực nghiên cứu</label>
              <select
                className="form-input"
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
              >
                {fieldCategories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions full-width">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={liveSimilarity && !liveSimilarity.isSafe}
              >
                Đăng tải đề tài tuyển sinh
              </button>
            </div>
          </form>
        </div>
      )}

      <DocumentPreviewModal
        documentItem={previewDoc}
        topic={selectedTopic}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
