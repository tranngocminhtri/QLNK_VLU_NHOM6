import { useState, useMemo } from 'react';
import { TopicStatusBadge } from '../components/StatusBadge';
import SimilarityBadge from '../components/SimilarityBadge';
import ConfirmModal from '../components/ConfirmModal';
import { exportTopicsToExcel } from '../utils/exportExcel';
import { formatDateTimeVN } from '../utils/validators';

export default function AdminPage({
  currentUser,
  topics = [],
  users = [],
  councils = [],
  categories = [],
  timelines = [],
  activeTab = 'DASHBOARD',
  onReviewAndAssignTopic,
  onCreateCouncil,
  onAssignTopicToCouncil,
  onSaveTimeline,
  onDeleteTimeline,
  onCreateCategory,
  onDeleteCategory,
  onToggleUserLock,
  onCreateUser,
  onUpdateUserRole,
  onDeleteUser,
  onResetSampleData,
}) {
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const lecturers = useMemo(
    () => users.filter((u) => u.role === 'LECTURER'),
    [users]
  );
  const allFaculty = useMemo(
    () => users.filter((u) => u.role === 'LECTURER' || u.role === 'ADMIN'),
    [users]
  );

  const lecturerTopicCount = useMemo(() => {
    const map = new Map();
    topics.forEach((t) => {
      if (t.lecturer_id && t.status !== 'FAILED') {
        map.set(t.lecturer_id, (map.get(t.lecturer_id) || 0) + 1);
      }
    });
    return map;
  }, [topics]);

  const pendingAdminTopics = useMemo(
    () => topics.filter((t) => t.status === 'PENDING_ADMIN'),
    [topics]
  );
  const pendingCouncilTopics = useMemo(
    () => topics.filter((t) => t.status === 'PENDING_COUNCIL'),
    [topics]
  );

  const [selectedLecturerByTopic, setSelectedLecturerByTopic] = useState({});
  const [rejectReasonByTopic, setRejectReasonByTopic] = useState({});
  const [rejectingId, setRejectingId] = useState(null);

  const [councilName, setCouncilName] = useState('');
  const [chairmanId, setChairmanId] = useState('usr-hd-bao');
  const [secretaryId, setSecretaryId] = useState('usr-gv-duy');
  const [memberId, setMemberId] = useState('usr-gv-viet');
  const [selectedCouncilTopics, setSelectedCouncilTopics] = useState([]);

  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState('2026-11-10T08:00');
  const [endDate, setEndDate] = useState('2026-12-20T17:00');

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('FIELD');

  // State tạo tài khoản mới & xác nhận xóa tài khoản
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCode, setNewUserCode] = useState('');
  const [newUserRole, setNewUserRole] = useState('STUDENT');
  const [userToDelete, setUserToDelete] = useState(null);

  const stats = useMemo(() => {
    const total = topics.length;
    const completed = topics.filter((t) => t.status === 'COMPLETED').length;
    const inProgress = topics.filter((t) => t.status === 'IN_PROGRESS').length;
    const pendingDefense = topics.filter((t) => t.status === 'PENDING_COUNCIL').length;
    const waitingReview = topics.filter(
      (t) => t.status === 'PENDING_ADMIN' || t.status === 'PENDING_LECTURER'
    ).length;
    const recruiting = topics.filter((t) => t.status === 'RECRUITING').length;
    return { total, completed, inProgress, pendingDefense, waitingReview, recruiting };
  }, [topics]);

  const handleToggleTopicForCouncil = (tid) => {
    setSelectedCouncilTopics((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    );
  };

  return (
    <div className="page-wrapper">
      {feedback.text && (
        <div className={feedback.type === 'error' ? 'alert-error' : 'alert-success'}>
          {feedback.type === 'error' ? '⛔ ' : '✅ '}
          {feedback.text}
        </div>
      )}

      {/* TAB 1: DASHBOARD THỐNG KÊ & XUẤT BÁO CÁO */}
      {activeTab === 'DASHBOARD' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Tổng số đề tài NCKH</span>
              <strong className="kpi-value">{stats.total}</strong>
              <small>Toàn Khoa Công nghệ Thông tin</small>
            </div>
            <div className="kpi-card kpi-blue">
              <span className="kpi-label">Đang thực hiện</span>
              <strong className="kpi-value">{stats.inProgress}</strong>
              <small>+ {stats.recruiting} đề tài đang tuyển SV</small>
            </div>
            <div className="kpi-card kpi-amber">
              <span className="kpi-label">Chờ duyệt / Phân công</span>
              <strong className="kpi-value">{stats.waitingReview}</strong>
              <small>+ {stats.pendingDefense} đề tài chờ bảo vệ</small>
            </div>
            <div className="kpi-card kpi-green">
              <span className="kpi-label">Đã nghiệm thu hoàn thành</span>
              <strong className="kpi-value">{stats.completed}</strong>
              <small>
                Tỷ lệ đạt: {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </small>
            </div>
          </div>

          <div className="dashboard-charts-grid">
            <div className="section-card">
              <h3>Khối lượng hướng dẫn theo Giảng viên</h3>
              <p className="muted-text">Tối đa khuyến nghị 5 nhóm đề tài / Giảng viên</p>
              <div className="bar-chart-list">
                {lecturers.map((gv) => {
                  const count = lecturerTopicCount.get(gv.user_id) || 0;
                  const pct = Math.min(100, (count / 5) * 100);
                  return (
                    <div key={gv.user_id} className="bar-chart-row">
                      <div className="bar-chart-label">
                        <strong>{gv.full_name}</strong>
                        <span>
                          {count} / 5 nhóm {count > 5 ? '⚠️ Quá tải' : ''}
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${count > 5 ? 'fill-danger' : 'fill-primary'}`}
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="section-card">
              <h3>Phân bổ đề tài theo Lĩnh vực nghiên cứu</h3>
              <p className="muted-text">Tỷ lệ đề tài đăng ký theo từng hướng chuyên sâu</p>
              <div className="bar-chart-list">
                {categories
                  .filter((c) => c.type === 'FIELD')
                  .map((field) => {
                    const count = topics.filter((t) => t.field_id === field.category_id).length;
                    const pct = topics.length ? Math.round((count / topics.length) * 100) : 0;
                    return (
                      <div key={field.category_id} className="bar-chart-row">
                        <div className="bar-chart-label">
                          <strong>{field.name}</strong>
                          <span>
                            {count} đề tài ({pct}%)
                          </span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill fill-safe" style={{ width: `${Math.max(8, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <div>
                <h2>Danh sách tổng hợp đề tài toàn Khoa ({topics.length})</h2>
                <p className="muted-text">Tra cứu nhanh trạng thái, giảng viên hướng dẫn và xuất báo cáo Excel</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {onResetSampleData && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      const res = onResetSampleData();
                      setFeedback({
                        type: 'success',
                        text: res?.message || 'Đã khôi phục dữ liệu mẫu ban đầu!',
                      });
                    }}
                  >
                    🔄 Khôi phục dữ liệu mẫu
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    exportTopicsToExcel(topics, users, councils);
                    setFeedback({
                      type: 'success',
                      text: 'Đã tải xuống tệp báo cáo Excel (.xls) thành công!',
                    });
                  }}
                >
                  📥 Xuất báo cáo Excel (.xls)
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã đề tài</th>
                    <th>Tên đề tài nghiên cứu</th>
                    <th>Sinh viên thực hiện</th>
                    <th>Giảng viên HD</th>
                    <th>Độ trùng lặp</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.topic_id}>
                      <td>
                        <code>{t.topic_id}</code>
                      </td>
                      <td>
                        <strong>{t.title}</strong>
                      </td>
                      <td>
                        {(t.members || [])
                          .filter((m) => m.status === 'APPROVED')
                          .map((m) => m.student?.full_name)
                          .join(', ') || 'Đang mở tuyển'}
                      </td>
                      <td>{t.lecturer?.full_name || 'Chưa phân công'}</td>
                      <td>
                        <SimilarityBadge result={t.similarity_score} compact />
                      </td>
                      <td>
                        <TopicStatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: XÉT DUYỆT SƠ BỘ & PHÂN CÔNG GVHD */}
      {activeTab === 'APPROVAL' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Xét duyệt đề cương & Phân công Giảng viên ({pendingAdminTopics.length})</h2>
              <p className="muted-text">Rà soát tính hợp lệ của các đề tài tự đề xuất và chỉ định Giảng viên hướng dẫn phù hợp</p>
            </div>
          </div>

          {pendingAdminTopics.length === 0 ? (
            <div className="empty-state">
              <p>Tất cả đề tài chờ Khoa duyệt đã được xử lý xong.</p>
            </div>
          ) : (
            <div className="topics-grid">
              {pendingAdminTopics.map((topic) => {
                const chosenLecturerId =
                  selectedLecturerByTopic[topic.topic_id] ||
                  topic.lecturer_id ||
                  lecturers[0]?.user_id ||
                  '';
                const chosenCount = lecturerTopicCount.get(chosenLecturerId) || 0;

                return (
                  <div key={topic.topic_id} className="topic-card">
                    <div className="topic-card-top">
                      <span className="topic-code">{topic.topic_id}</span>
                      <div className="topic-badges">
                        <TopicStatusBadge status={topic.status} />
                        <SimilarityBadge result={topic.similarity_score} compact />
                      </div>
                    </div>

                    <h3>{topic.title}</h3>
                    <p>{topic.summary}</p>

                    <div className="topic-info-box">
                      <div>
                        <strong>Nguyện vọng của nhóm:</strong>{' '}
                        {topic.preferred_lecturer_note || 'Theo phân công của Khoa'}
                      </div>
                      <div>
                        <strong>Sinh viên thực hiện:</strong>{' '}
                        {(topic.members || [])
                          .filter((m) => m.status === 'APPROVED')
                          .map((m) => `${m.student?.full_name} (${m.student?.user_code})`)
                          .join(', ')}
                      </div>
                      {topic.lecturer_reject_note && (
                        <div className="text-danger">
                          ⚠️ Phản hồi từ GVHD trước: {topic.lecturer_reject_note}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Phân công Giảng viên hướng dẫn:</label>
                      <select
                        className="form-input"
                        value={chosenLecturerId}
                        onChange={(e) =>
                          setSelectedLecturerByTopic((prev) => ({
                            ...prev,
                            [topic.topic_id]: e.target.value,
                          }))
                        }
                      >
                        {lecturers.map((gv) => {
                          const cnt = lecturerTopicCount.get(gv.user_id) || 0;
                          return (
                            <option key={gv.user_id} value={gv.user_id}>
                              {gv.full_name} (Đang nhận {cnt} nhóm)
                            </option>
                          );
                        })}
                      </select>
                      {chosenCount >= 5 && (
                        <small className="text-danger">
                          ⚠️ Cảnh báo: Giảng viên này đang hướng dẫn từ 5 nhóm trở lên.
                        </small>
                      )}
                    </div>

                    {rejectingId === topic.topic_id ? (
                      <div className="apply-inline-form">
                        <textarea
                          rows={2}
                          className="form-input"
                          placeholder="Nhập lý do từ chối đề tài để thông báo cho sinh viên..."
                          value={rejectReasonByTopic[topic.topic_id] || ''}
                          onChange={(e) =>
                            setRejectReasonByTopic((prev) => ({
                              ...prev,
                              [topic.topic_id]: e.target.value,
                            }))
                          }
                        />
                        <div className="apply-btn-group">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              try {
                                const res = onReviewAndAssignTopic(topic.topic_id, {
                                  action: 'REJECT',
                                  reject_reason: rejectReasonByTopic[topic.topic_id],
                                });
                                setFeedback({ type: 'success', text: res.message });
                                setRejectingId(null);
                              } catch (err) {
                                setFeedback({ type: 'error', text: err.message });
                              }
                            }}
                          >
                            Xác nhận từ chối
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setRejectingId(null)}
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
                              const res = onReviewAndAssignTopic(topic.topic_id, {
                                action: 'APPROVE',
                                lecturer_id: chosenLecturerId,
                              });
                              setFeedback({ type: 'success', text: res.message });
                            } catch (err) {
                              setFeedback({ type: 'error', text: err.message });
                            }
                          }}
                        >
                          Duyệt & Phân công GVHD
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setRejectingId(topic.topic_id)}
                        >
                          Từ chối đề tài
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: THÀNH LẬP HỘI ĐỒNG KHOA HỌC */}
      {activeTab === 'COUNCIL' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Thành lập Hội đồng Khoa học & Phân bổ đề tài</h2>
              <p className="muted-text">
                Giảng viên được phân công sẽ tự động hiển thị thêm mục &ldquo;Hội đồng Khoa học&rdquo; trong danh mục cá nhân của họ (không cần tạo tài khoản riêng). Hệ thống tự động kiểm tra chống xung đột lợi ích.
              </p>
            </div>
          </div>

          <form
            className="form-grid sub-card"
            onSubmit={(e) => {
              e.preventDefault();
              setFeedback({ type: '', text: '' });
              try {
                const res = onCreateCouncil({
                  name: councilName,
                  chairman_id: chairmanId,
                  secretary_id: secretaryId,
                  member_id: memberId,
                  topic_ids: selectedCouncilTopics,
                });
                setFeedback({ type: 'success', text: res.message });
                setSelectedCouncilTopics([]);
              } catch (err) {
                setFeedback({ type: 'error', text: err.message });
              }
            }}
          >
            <div className="form-group full-width">
              <label>Tên Hội đồng nghiệm thu *</label>
              <input
                type="text"
                className="form-input"
                value={councilName}
                onChange={(e) => setCouncilName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Chủ tịch Hội đồng *</label>
              <select
                className="form-input"
                value={chairmanId}
                onChange={(e) => setChairmanId(e.target.value)}
              >
                {allFaculty.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.user_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Thư ký Hội đồng *</label>
              <select
                className="form-input"
                value={secretaryId}
                onChange={(e) => setSecretaryId(e.target.value)}
              >
                {allFaculty.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.user_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ủy viên phản biện *</label>
              <select
                className="form-input"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                {allFaculty.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.user_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Chọn các đề tài đủ điều kiện bảo vệ để phân vào Hội đồng:</label>
              <div className="checkbox-topic-list">
                {pendingCouncilTopics.map((t) => (
                  <label key={t.topic_id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedCouncilTopics.includes(t.topic_id)}
                      onChange={() => handleToggleTopicForCouncil(t.topic_id)}
                    />
                    <span>
                      <b>[{t.topic_id}]</b> {t.title} — <i>GVHD: {t.lecturer?.full_name}</i>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary">
                Thành lập Hội đồng & Phân bổ đề tài
              </button>
            </div>
          </form>

          <h3 style={{ marginTop: '24px' }}>Danh sách Hội đồng đã thành lập ({councils.length})</h3>
          <div className="topics-grid" style={{ marginTop: '12px' }}>
            {councils.map((c) => {
              const assignedTopics = topics.filter((t) => t.council_id === c.council_id);
              return (
                <div key={c.council_id} className="topic-card">
                  <div className="topic-card-top">
                    <span className="topic-code">{c.council_id}</span>
                    <span className="status-badge badge-pending-council">
                      {assignedTopics.length} đề tài
                    </span>
                  </div>
                  <h3>{c.name}</h3>
                  <div className="topic-info-box">
                    {(c.council_members || []).map((cm) => (
                      <div key={cm.id}>
                        <strong>
                          {cm.role_in_council === 'CHUTICH'
                            ? 'Chủ tịch'
                            : cm.role_in_council === 'THUKY'
                            ? 'Thư ký'
                            : 'Ủy viên'}
                          :
                        </strong>{' '}
                        {cm.lecturer?.full_name}
                      </div>
                    ))}
                  </div>
                  <div>
                    <strong>Đề tài phân công:</strong>
                    <ul style={{ margin: '6px 0', paddingLeft: '18px' }}>
                      {assignedTopics.map((at) => (
                        <li key={at.topic_id}>
                          [{at.topic_id}] {at.title}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pendingCouncilTopics.length > 0 && (
                    <div className="apply-btn-group" style={{ marginTop: '8px' }}>
                      {pendingCouncilTopics.map((pt) => (
                        <button
                          key={pt.topic_id}
                          type="button"
                          className="btn-xs btn-preview"
                          onClick={() => {
                            try {
                              const res = onAssignTopicToCouncil(pt.topic_id, c.council_id);
                              setFeedback({ type: 'success', text: res.message });
                            } catch (err) {
                              setFeedback({ type: 'error', text: err.message });
                            }
                          }}
                        >
                          + Gán [{pt.topic_id}] vào HĐ này
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CẤU HÌNH LỊCH TRÌNH TIMELINE */}
      {activeTab === 'TIMELINE' && (
        <div className="section-card">
          <div className="section-header">
            <div>
              <h2>Cấu hình Lịch trình & Mốc thời gian (Timeline)</h2>
              <p className="muted-text">Thiết lập thời gian mở cổng đăng ký đề tài và hạn chót nộp báo cáo cho từng giai đoạn</p>
            </div>
          </div>

          <form
            className="form-grid sub-card"
            onSubmit={(e) => {
              e.preventDefault();
              setFeedback({ type: '', text: '' });
              try {
                const res = onSaveTimeline({
                  event_name: eventName,
                  start_date: startDate,
                  end_date: endDate,
                });
                setFeedback({ type: 'success', text: res.message });
                setEventName('');
              } catch (err) {
                setFeedback({ type: 'error', text: err.message });
              }
            }}
          >
            <div className="form-group full-width">
              <label>Tên giai đoạn / Mốc sự kiện *</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Đợt bổ sung: Nộp báo cáo tổng kết và slide bảo vệ..."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Thời gian bắt đầu *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Hạn chót kết thúc (Deadline) *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary">
                Thêm mốc thời gian mới
              </button>
            </div>
          </form>

          <div className="table-responsive" style={{ marginTop: '20px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên sự kiện / Giai đoạn</th>
                  <th>Ngày mở cổng</th>
                  <th>Hạn chót (Deadline)</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {timelines.map((tl) => (
                  <tr key={tl.timeline_id}>
                    <td>
                      <strong>{tl.event_name}</strong>
                    </td>
                    <td>{formatDateTimeVN(tl.start_date)}</td>
                    <td>{formatDateTimeVN(tl.end_date)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-xs btn-move"
                        onClick={() => {
                          const res = onDeleteTimeline(tl.timeline_id);
                          setFeedback({ type: 'success', text: res.message });
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TÀI KHOẢN & DANH MỤC */}
      {activeTab === 'CATALOG' && (
        <div className="dashboard-charts-grid">
          <div className="section-card">
            <h3>Danh mục Lĩnh vực & Chuyên ngành</h3>
            <p className="muted-text">Quản lý các chuyên ngành đào tạo và hướng nghiên cứu của Khoa</p>

            <form
              style={{ marginTop: '14px' }}
              onSubmit={(e) => {
                e.preventDefault();
                setFeedback({ type: '', text: '' });
                try {
                  const res = onCreateCategory({ name: catName, type: catType });
                  setFeedback({ type: 'success', text: res.message });
                  setCatName('');
                } catch (err) {
                  setFeedback({ type: 'error', text: err.message });
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label>Tên danh mục mới *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập tên chuyên ngành hoặc lĩnh vực..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Phân loại</label>
                <select
                  className="form-input"
                  value={catType}
                  onChange={(e) => setCatType(e.target.value)}
                >
                  <option value="FIELD">Lĩnh vực nghiên cứu (FIELD)</option>
                  <option value="MAJOR">Chuyên ngành đào tạo (MAJOR)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                + Thêm danh mục
              </button>
            </form>

            <div className="cat-chip-list" style={{ marginTop: '18px' }}>
              {categories.map((c) => (
                <div key={c.category_id} className="cat-chip-item">
                  <span>
                    <b>[{c.type === 'MAJOR' ? 'Chuyên ngành' : 'Lĩnh vực'}]</b> {c.name}
                  </span>
                  <button
                    type="button"
                    className="btn-text-xs"
                    onClick={() => onDeleteCategory(c.category_id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h3>Quản trị Tài khoản hệ thống ({users.length})</h3>
            <p className="muted-text">
              Thêm mới tài khoản, phân quyền vai trò, khóa hoặc xóa vĩnh viễn tài khoản người dùng
            </p>

            {/* Biểu mẫu tạo tài khoản mới dành cho Quản trị viên Khoa */}
            <form
              className="sub-card"
              style={{ marginTop: '14px', marginBottom: '16px' }}
              onSubmit={(e) => {
                e.preventDefault();
                setFeedback({ type: '', text: '' });
                try {
                  const res = onCreateUser({
                    full_name: newUserName,
                    email: newUserEmail,
                    user_code: newUserCode,
                    role: newUserRole,
                  });
                  setFeedback({ type: 'success', text: res.message });
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserCode('');
                } catch (err) {
                  setFeedback({ type: 'error', text: err.message });
                }
              }}
            >
              <h4 style={{ marginBottom: '10px' }}>+ Cấp tài khoản mới</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Nguyễn Văn A"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Mã số (MSSV / MGV) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 2374802010999"
                    value={newUserCode}
                    onChange={(e) => setNewUserCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Văn Lang (@vanlanguni.vn) *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="ten.mssv@vanlanguni.vn"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phân quyền (Role) *</label>
                  <select
                    className="form-input"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                  >
                    <option value="STUDENT">Sinh viên (STUDENT)</option>
                    <option value="LECTURER">Giảng viên (LECTURER)</option>
                    <option value="ADMIN">Quản lý Khoa (ADMIN)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>
                + Tạo tài khoản
              </button>
            </form>

            <div className="user-admin-list" style={{ marginTop: '12px' }}>
              {users.map((u) => {
                const isSelf = currentUser && u.user_id === currentUser.user_id;
                return (
                  <div key={u.user_id} className="user-admin-row">
                    <div>
                      <strong>
                        {u.full_name} ({u.user_code}) {isSelf ? '— (Bạn)' : ''}
                      </strong>
                      <div className="muted-text">
                        {u.email} • Trạng thái:{' '}
                        <b style={{ color: u.is_locked ? '#e11d48' : '#10b981' }}>
                          {u.is_locked ? 'Đã khóa' : 'Đang hoạt động'}
                        </b>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Cho phép đổi vai trò tài khoản */}
                      <select
                        className="form-input"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => {
                          try {
                            const res = onUpdateUserRole(u.user_id, e.target.value);
                            setFeedback({ type: 'success', text: res.message });
                          } catch (err) {
                            setFeedback({ type: 'error', text: err.message });
                          }
                        }}
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="LECTURER">LECTURER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>

                      {!isSelf && (
                        <>
                          <button
                            type="button"
                            className={`btn-xs ${u.is_locked ? 'btn-preview' : 'btn-move'}`}
                            onClick={() => {
                              try {
                                const res = onToggleUserLock(u.user_id);
                                setFeedback({ type: 'success', text: res.message });
                              } catch (err) {
                                setFeedback({ type: 'error', text: err.message });
                              }
                            }}
                          >
                            {u.is_locked ? 'Mở khóa' : 'Khóa TK'}
                          </button>

                          <button
                            type="button"
                            className="btn-xs"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              fontWeight: 600,
                            }}
                            onClick={() => setUserToDelete(u)}
                          >
                            🗑️ Xóa TK
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận trước khi xóa vĩnh viễn tài khoản */}
      <ConfirmModal
        open={Boolean(userToDelete)}
        title="Xác nhận xóa vĩnh viễn tài khoản"
        message={
          userToDelete
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${userToDelete.full_name}" (${userToDelete.email}) khỏi hệ thống không? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa vĩnh viễn tài khoản"
        cancelText="Hủy bỏ"
        danger
        onConfirm={() => {
          if (!userToDelete) return;
          try {
            const res = onDeleteUser(userToDelete.user_id);
            setFeedback({ type: 'success', text: res.message });
          } catch (err) {
            setFeedback({ type: 'error', text: err.message });
          } finally {
            setUserToDelete(null);
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
