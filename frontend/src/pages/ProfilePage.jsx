import { useState } from 'react';

export default function ProfilePage({ currentUser, categories = [], onSaveProfile }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [departmentId, setDepartmentId] = useState(currentUser?.department_id || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const majorCategories = categories.filter((c) => c.type === 'MAJOR');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await onSaveProfile({
        full_name: fullName,
        phone,
        department_id: departmentId,
      });
      setSuccess('Đã lưu thông tin hồ sơ cá nhân thành công!');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section-card profile-card-clean">
        <div className="profile-banner-top">
          <div className="avatar-large">{currentUser?.full_name?.charAt(0) || 'U'}</div>
          <div>
            <h2>{currentUser?.full_name}</h2>
            <p className="muted-text">
              Mã định danh: <b>{currentUser?.user_code}</b> • Email: <b>{currentUser?.email}</b>
            </p>
          </div>
        </div>

        {error && <div className="alert-error">⛔ {error}</div>}
        {success && <div className="alert-success">✅ {success}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mã số (MSSV / Mã Giảng viên)</label>
            <input type="text" className="form-input" value={currentUser?.user_code || ''} disabled />
          </div>

          <div className="form-group">
            <label>Email trường cấp</label>
            <input type="email" className="form-input" value={currentUser?.email || ''} disabled />
          </div>

          <div className="form-group">
            <label>Họ và tên *</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại liên hệ *</label>
            <input
              type="text"
              className={`form-input ${error ? 'input-invalid' : ''}`}
              placeholder="VD: 0908123456"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
            />
          </div>

          <div className="form-group full-width">
            <label>Chuyên ngành / Bộ môn trực thuộc</label>
            <select
              className="form-input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {majorCategories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions full-width">
            <button type="submit" className="btn btn-primary">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
