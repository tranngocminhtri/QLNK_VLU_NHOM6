import { useState } from 'react';
import { SubmitStatusBadge } from './StatusBadge';
import { downloadRealDocument } from '../utils/fileHelper';
import { formatDateTimeVN } from '../utils/validators';

const KANBAN_COLUMNS = [
  { key: 'Chờ đánh giá', title: '⏳ Đang thực hiện / Chờ đánh giá', headerCls: 'kanban-col-pending' },
  { key: 'Hoàn thành', title: '✅ Đã hoàn thành', headerCls: 'kanban-col-done' },
];

export default function KanbanBoard({
  topic,
  canEditStatus = false,
  onMoveTask,
  onAddComment,
  onCreateTask,
  onPreviewDocument,
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!topic) return null;

  const tasks = topic.tasks || [];
  const documents = topic.documents || [];
  const comments = topic.comments || [];

  const handleDragStart = (e, taskId) => {
    if (!canEditStatus) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e, targetColumnKey) => {
    e.preventDefault();
    if (!canEditStatus) return;
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t.task_id === taskId);
    if (task && task.status !== targetColumnKey && onMoveTask) {
      onMoveTask(taskId, targetColumnKey);
    }
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !onAddComment) return;
    onAddComment(commentInput.trim());
    setCommentInput('');
  };

  const handleCreateTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onCreateTask) return;
    onCreateTask(newTaskTitle.trim());
    setNewTaskTitle('');
  };

  return (
    <div className="kanban-container">
      {onCreateTask && !topic.is_frozen && (
        <form className="kanban-add-bar" onSubmit={handleCreateTaskSubmit}>
          <input
            type="text"
            className="form-input"
            placeholder="Nhập công việc mới hoặc mốc báo cáo tuần để thêm vào bảng..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            + Thêm công việc
          </button>
        </form>
      )}

      <div className="kanban-grid">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((tk) => tk.status === col.key);
          return (
            <div
              key={col.key}
              className={`kanban-column ${col.headerCls}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="kanban-column-header">
                <span>{col.title}</span>
                <span className="kanban-count">{colTasks.length}</span>
              </div>

              <div className="kanban-card-list">
                {colTasks.length === 0 ? (
                  <div className="kanban-empty">
                    {canEditStatus
                      ? 'Kéo thả thẻ vào đây...'
                      : 'Chưa có công việc nào ở mục này.'}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const nextStatus =
                      task.status === 'Chờ đánh giá' ? 'Hoàn thành' : 'Chờ đánh giá';
                    return (
                      <div
                        key={task.task_id}
                        className={`kanban-card ${canEditStatus ? 'draggable' : ''}`}
                        draggable={canEditStatus}
                        onDragStart={(e) => handleDragStart(e, task.task_id)}
                      >
                        <div className="kanban-card-title">{task.title}</div>
                        <div className="kanban-card-actions">
                          {documents.length > 0 && onPreviewDocument && (
                            <button
                              type="button"
                              className="btn-xs btn-preview"
                              onClick={() => onPreviewDocument(documents[0])}
                            >
                              📄 Xem báo cáo
                            </button>
                          )}
                          {canEditStatus && onMoveTask && (
                            <button
                              type="button"
                              className="btn-xs btn-move"
                              onClick={() => onMoveTask(task.task_id, nextStatus)}
                            >
                              {task.status === 'Chờ đánh giá' ? '✓ Đánh dấu Hoàn thành' : '↩ Chuyển về Chờ đánh giá'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="kanban-bottom-split">
        <div className="sub-card">
          <h4>📂 Tài liệu & Báo cáo đã nộp ({documents.length})</h4>
          {documents.length === 0 ? (
            <p className="muted-text">Chưa có tệp báo cáo nào được tải lên.</p>
          ) : (
            <div className="doc-list">
              {documents.map((doc) => (
                <div key={doc.document_id} className="doc-row">
                  <div className="doc-row-info">
                    <strong>📄 {doc.file_name}</strong>
                    <p>{doc.description}</p>
                    <small className="muted-text">Nộp lúc: {formatDateTimeVN(doc.created_at)}</small>
                  </div>
                  <div className="doc-row-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <SubmitStatusBadge status={doc.submit_status} />
                    {onPreviewDocument && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onPreviewDocument(doc)}
                      >
                        👁️ Xem file
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => downloadRealDocument(doc)}
                    >
                      ⬇️ Tải về
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sub-card">
          <h4>💬 Trao đổi & Nhận xét từ Giảng viên ({comments.length})</h4>
          <div className="comment-list">
            {comments.length === 0 ? (
              <p className="muted-text">Chưa có nhận xét nào.</p>
            ) : (
              comments.map((c) => (
                <div key={c.comment_id} className="comment-bubble">
                  <div className="comment-meta">
                    <strong>{c.user?.full_name || 'Giảng viên hướng dẫn'}</strong>
                    <span>{formatDateTimeVN(c.created_at)}</span>
                  </div>
                  <p>{c.content}</p>
                </div>
              ))
            )}
          </div>

          {onAddComment && !topic.is_frozen && (
            <form className="comment-form" onSubmit={handleSendComment}>
              <textarea
                rows={2}
                className="form-input"
                placeholder="Viết nhận xét hoặc góp ý cho nhóm sinh viên..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }}>
                Gửi nhận xét
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
