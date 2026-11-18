import { useState, useMemo } from 'react';
import { TopicStatusBadge } from '../components/StatusBadge';
import SimilarityBadge from '../components/SimilarityBadge';
import KanbanBoard from '../components/KanbanBoard';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { checkTopicSimilarity } from '../utils/similarity';
import { formatDateTimeVN } from '../utils/validators';

export default function StudentPage({
  currentUser,
  topics = [],
  categories = [],
  activeTab = 'BOARD',
  onSelectTab,
  onCreateStudentTopic,
  onApplyToTopic,
  onUploadDocument,
  onCreateTask,
}) {
  const myActiveTopic = useMemo(() => {
    return topics.find((t) =>
      (t.members || []).some(
        (m) => m.student_id === currentUser.user_id && m.status === 'APPROVED'
      )
    );
  }, [topics, currentUser.user_id]);

  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form đề xuất đề tài mới
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [requirements, setRequirements] = useState('');
  const [preferredLecturer, setPreferredLecturer] = useState('TS. Nguyễn Trí Hải');
  const [fieldId, setFieldId] = useState('cat-field-1');
  const [memberCodesInput, setMemberCodesInput] = useState('');

  // Form ứng tuyển đề tài
  const [applyingTopicId, setApplyingTopicId] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [filterField, setFilterField] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form tải lên báo cáo thực tế
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [newTaskForDoc, setNewTaskForDoc] = useState('');

  // Hàm đọc nội dung nhị phân của tệp khi sinh viên chọn file từ máy tính
  const handleSelectRealFile = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (!file) {
      setSelectedFileDataUrl('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const liveSimilarity = useMemo(() => {
    if (!title.trim() && !summary.trim()) return null;
    return checkTopicSimilarity(title, summary, topics);
  }, [title, summary, topics]);

  const recruitingTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return topics.filter((t) => {
      if (t.status !== 'RECRUITING') return false;
      if (filterField !== 'ALL' && t.field_id !== filterField) return false;
      if (q) {
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchLecturer = t.lecturer?.full_name?.toLowerCase().includes(q);
        const matchCode = t.topic_id?.toLowerCase().includes(q);
        if (!matchTitle && !matchLecturer && !matchCode) return false;
      }
      return true;
    });
  }, [topics, filterField, searchQuery]);

  const fieldCategories = categories.filter((c) => c.type === 'FIELD');

  const handleProposeSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      const codes = memberCodesInput
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = onCreateStudentTopic({
        title,
        summary,
        requirements,
        preferred_lecturer_note: preferredLecturer,
        field_id: fieldId,
        memberCodes: codes,
      });
      setFeedback({ type: 'success', text: res.message });
      setTitle('');
      setSummary('');
      setRequirements('');
      setMemberCodesInput('');
      if (onSelectTab) onSelectTab('MY_TOPIC');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleApplySubmit = (e, topicId) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      const res = onApplyToTopic(topicId, coverLetter);
      setFeedback({ type: 'success', text: res.message });
      setApplyingTopicId(null);
      setCoverLetter('');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    if (!myActiveTopic) return;
    try {
      const res = onUploadDocument({
        topic_id: myActiveTopic.topic_id,
        file: selectedFile,
        fileDataUrl: selectedFileDataUrl,
        description: docDesc,
        createTaskTitle: newTaskForDoc,
      });
      setFeedback({ type: 'success', text: res.message });
      setSelectedFile(null);
      setSelectedFileDataUrl('');
      setDocDesc('');
      setNewTaskForDoc('');
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="page-wrapper">
      {/* Thẻ tóm tắt trạng thái đề tài hiện tại của sinh viên */}
      <div className="welcome-summary-card">
        <div>
          <span className="greeting-chip">👋 Xin chào, {currentUser.full_name}</span>
          {myActiveTopic ? (
            <div className="active-topic-highlight">
              <h3>Đề tài của bạn: {myActiveTopic.title}</h3>
              <p>
                Mã đề tài: <code>{myActiveTopic.topic_id}</code> • Giảng viên hướng dẫn:{' '}
                <b>{myActiveTopic.lecturer?.full_name || 'Đang chờ Khoa phân công'}</b>
              </p>
            </div>
          ) : (
            <div className="active-topic-highlight">
              <h3>Bạn chưa tham gia nhóm đề tài nào trong học kỳ này</h3>
              <p>Hãy chọn một đề tài đang tuyển thành viên bên dưới hoặc tự đề xuất ý tưởng mới của nhóm bạn.</p>
            </div>
          )}
        </div>
        {myActiveTopic && (
          <div className="welcome-summary-right">
            <TopicStatusBadge status={myActiveTopic.status} />
            {activeTab !== 'MY_TOPIC' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onSelectTab && onSelectTab('MY_TOPIC')}
              >
                Mở bảng tiến độ →
              </button>
            )}
          </div>
        )}
      </div>

      {feedback.text && (
        <div className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}>
          {feedback.type === 'error' ? '⛔ ' : '✅ '}
          {feedback.text}
        </div>
      )}

      {/* TAB 1: KHÁM PHÁ & ỨNG TUYỂN ĐỀ TÀI */}
      {activeTab === 'BOARD' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Đề tài do Giảng viên công bố tuyển sinh ({recruitingTopics.length})</h2>
              <p className="muted-text">Tìm hiểu định hướng nghiên cứu của các thầy cô và gửi đơn đăng ký tham gia nhóm</p>
            </div>
            <div className="filter-toolbar">
              <input
                type="search"
                className="form-input search-input"
                placeholder="🔍 Tìm tên đề tài, mã số hoặc giảng viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="form-input select-auto"
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
              >
                <option value="ALL">Tất cả lĩnh vực nghiên cứu</option>
                {fieldCategories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="topics-grid">
            {recruitingTopics.map((topic) => {
              const approvedCount = (topic.members || []).filter(
                (m) => m.status === 'APPROVED'
              ).length;
              const myApplication = (topic.members || []).find(
                (m) => m.student_id === currentUser.user_id
              );

              return (
                <div key={topic.topic_id} className="topic-card">
                  <div className="topic-card-top">
                    <span className="topic-code">{topic.topic_id}</span>
                    <TopicStatusBadge status={topic.status} />
                  </div>

                  <h3 className="topic-title">{topic.title}</h3>
                  <p className="topic-summary">{topic.summary}</p>

                  <div className="topic-info-box">
                    <div>
                      <strong>👨‍🏫 Giảng viên hướng dẫn:</strong> {topic.lecturer?.full_name || 'Khoa CNTT'}
                    </div>
                    <div>
                      <strong>🎯 Yêu cầu:</strong> {topic.requirements || 'Sinh viên Khoa CNTT'}
                    </div>
                    <div>
                      <strong>👥 Số lượng:</strong> Đã nhận {approvedCount} / {topic.max_members} sinh viên
                    </div>
                  </div>

                  <div className="topic-card-footer">
                    {myApplication ? (
                      <span className="status-badge badge-pending-lecturer">
                        ⏳ Đã gửi đơn ứng tuyển ({myApplication.status === 'PENDING' ? 'Đang chờ duyệt' : myApplication.status})
                      </span>
                    ) : myActiveTopic ? (
                      <span className="muted-text">
                        Bạn đã là thành viên của đề tài [{myActiveTopic.topic_id}]
                      </span>
                    ) : applyingTopicId === topic.topic_id ? (
                      <form
                        className="apply-inline-form"
                        onSubmit={(e) => handleApplySubmit(e, topic.topic_id)}
                      >
                        <textarea
                          rows={2}
                          className="form-input"
                          placeholder="Giới thiệu ngắn gọn về kỹ năng, điểm mạnh và mong muốn của bạn..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                        />
                        <div className="apply-btn-group">
                          <button type="submit" className="btn btn-primary btn-sm">
                            Gửi đơn ứng tuyển
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setApplyingTopicId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={() => {
                          setApplyingTopicId(topic.topic_id);
                          setCoverLetter('');
                        }}
                      >
                        Ứng tuyển tham gia đề tài
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ĐỀ XUẤT ĐỀ TÀI MỚI */}
      {activeTab === 'PROPOSE' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Đăng ký đề tài tự đề xuất</h2>
              <p className="muted-text">
                Hệ thống sẽ tự động kiểm tra mức độ trùng lặp với các đề tài khóa trước ngay khi bạn nhập thông tin
              </p>
            </div>
          </div>

          {myActiveTopic && (
            <div className="alert-warning">
              💡 Tài khoản <b>{currentUser.full_name}</b> hiện đã tham gia đề tài <b>[{myActiveTopic.topic_id}] {myActiveTopic.title}</b>. Theo quy định của Khoa CNTT, mỗi sinh viên chỉ tham gia tối đa 01 đề tài trong học kỳ.
            </div>
          )}

          {liveSimilarity && <SimilarityBadge result={liveSimilarity} />}

          <form className="form-grid" onSubmit={handleProposeSubmit}>
            <div className="form-group full-width">
              <label>Tên đề tài nghiên cứu *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập tên đề tài nghiên cứu dự kiến..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>Tóm tắt nội dung & Mục tiêu đề tài *</label>
              <textarea
                rows={4}
                className="form-input"
                placeholder="Trình bày bối cảnh, mục tiêu nghiên cứu, phạm vi và hướng giải quyết..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div className="form-group">
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

            <div className="form-group">
              <label>Nguyện vọng Giảng viên hướng dẫn</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: TS. Nguyễn Trí Hải"
                value={preferredLecturer}
                onChange={(e) => setPreferredLecturer(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Công nghệ & Công cụ dự kiến sử dụng</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: ReactJS, Node.js, PostgreSQL..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Mã số sinh viên (MSSV) các thành viên cùng nhóm</label>
              <input
                type="text"
                className="form-input"
                placeholder="Cách nhau bằng dấu phẩy, VD: 2374802010666"
                value={memberCodesInput}
                onChange={(e) => setMemberCodesInput(e.target.value)}
              />
            </div>

            <div className="form-actions full-width">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={liveSimilarity && !liveSimilarity.isSafe}
              >
                Gửi đề xuất đề tài
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TIẾN ĐỘ & NỘP BÁO CÁO */}
      {activeTab === 'MY_TOPIC' && (
        <div className="section-card">
          {!myActiveTopic ? (
            <div className="empty-state">
              <h3>Bạn chưa có đề tài đang thực hiện</h3>
              <p>Hãy ứng tuyển đề tài của Giảng viên hoặc gửi đề xuất đề tài mới ở menu bên trái.</p>
            </div>
          ) : (
            <>
              <div className="section-header">
                <div>
                  <h2>Tiến độ thực hiện & Nộp tài liệu báo cáo</h2>
                  <p className="muted-text">
                    Đề tài: <b>[{myActiveTopic.topic_id}] {myActiveTopic.title}</b>
                  </p>
                </div>
                <TopicStatusBadge status={myActiveTopic.status} />
              </div>

              {myActiveTopic.status === 'IN_PROGRESS' && !myActiveTopic.is_frozen ? (
                <form className="upload-panel" onSubmit={handleUploadSubmit}>
                  <div className="upload-panel-header">
                    <h4>☁️ Tải lên báo cáo tuần hoặc tài liệu nghiệm thu (.PDF, .DOCX dưới 20MB)</h4>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Tệp tin đính kèm (.PDF, .DOC, .DOCX) *</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="form-input"
                        onChange={handleSelectRealFile}
                      />
                    </div>

                    <div className="form-group">
                      <label>Mô tả ngắn gọn nội dung báo cáo *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="VD: Báo cáo tiến độ tuần 9..."
                        value={docDesc}
                        onChange={(e) => setDocDesc(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="upload-actions">
                    <span className="muted-text">
                      Tệp đã chọn: <b>{selectedFile ? selectedFile.name : 'Chưa chọn tệp'}</b>
                    </span>
                    <button type="submit" className="btn btn-primary">
                      Nộp báo cáo
                    </button>
                  </div>
                </form>
              ) : (
                <div className="alert-warning">
                  🔒 Cổng nộp tài liệu chỉ mở khi đề tài đang ở giai đoạn <b>Đang thực hiện</b>.
                </div>
              )}

              <KanbanBoard
                topic={myActiveTopic}
                canEditStatus={false}
                onCreateTask={(taskTitle) =>
                  onCreateTask(myActiveTopic.topic_id, taskTitle)
                }
                onPreviewDocument={(doc) => setPreviewDoc(doc)}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 4: KẾT QUẢ & ĐIỂM SỐ */}
      {activeTab === 'RESULTS' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Kết quả đánh giá & Bảng điểm</h2>
              <p className="muted-text">Theo dõi điểm quá trình từ GVHD và kết quả nghiệm thu từ Hội đồng Khoa học</p>
            </div>
          </div>

          {!myActiveTopic ? (
            <div className="empty-state">
              <p>Bạn chưa tham gia đề tài nào để xem điểm số.</p>
            </div>
          ) : (
            <div className="results-grid">
              <div className="sub-card">
                <h4>Điểm đánh giá quá trình (Giảng viên hướng dẫn)</h4>
                {myActiveTopic.scores?.filter((s) => s.score_type === 'PROCESS').length === 0 ? (
                  <p className="muted-text">Chưa có điểm đánh giá quá trình.</p>
                ) : (
                  myActiveTopic.scores
                    .filter((s) => s.score_type === 'PROCESS')
                    .map((s) => (
                      <div key={s.score_id} className="score-card-item">
                        <div className="score-big">{s.score_value.toFixed(1)}</div>
                        <div>
                          <strong>{s.user?.full_name || 'Giảng viên hướng dẫn'}</strong>
                          <p>{s.comment}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="sub-card">
                <h4>Điểm bảo vệ (Hội đồng Khoa học)</h4>
                {myActiveTopic.scores?.filter((s) => s.score_type === 'FINAL').length === 0 ? (
                  <p className="muted-text">Chưa có điểm chấm bảo vệ từ Hội đồng Khoa học.</p>
                ) : (
                  myActiveTopic.scores
                    .filter((s) => s.score_type === 'FINAL')
                    .map((s) => (
                      <div key={s.score_id} className="score-card-item">
                        <div className="score-big">{s.score_value.toFixed(1)}</div>
                        <div>
                          <strong>{s.user?.full_name || 'Thành viên Hội đồng'}</strong>
                          <p>{s.comment}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="sub-card full-width">
                <h4>Lịch sử nhận xét & góp ý chuyên môn ({myActiveTopic.comments?.length || 0})</h4>
                {(myActiveTopic.comments || []).length === 0 ? (
                  <p className="muted-text">Chưa có nhận xét nào.</p>
                ) : (
                  <div className="comment-list">
                    {myActiveTopic.comments.map((c) => (
                      <div key={c.comment_id} className="comment-bubble">
                        <div className="comment-meta">
                          <strong>{c.user?.full_name || 'Giảng viên'}</strong>
                          <span>{formatDateTimeVN(c.created_at)}</span>
                        </div>
                        <p>{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <DocumentPreviewModal
        documentItem={previewDoc}
        topic={myActiveTopic}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
