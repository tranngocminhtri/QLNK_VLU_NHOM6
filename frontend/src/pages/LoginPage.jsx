import { useEffect, useRef, useState } from 'react';

// Google OAuth Client ID (Google Cloud Console). Để trống thì ẩn nút "Đăng nhập với Google"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
// Mật khẩu chung của các tài khoản dữ liệu mẫu (backend/prisma/seed.js), chỉ dùng khi chạy thử cục bộ
const MAT_KHAU_DU_LIEU_MAU = 'vlu@2026';

// Nạp thư viện Google Identity Services một lần duy nhất
let napGoogleScript = null;
function taiThuVienGoogle() {
  napGoogleScript =
    napGoogleScript ||
    new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Không tải được dịch vụ đăng nhập Google.'));
      document.head.appendChild(script);
    });
  return napGoogleScript;
}

export default function LoginPage({ notice, onLoginGoogle, onLoginPassword, onBackHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState(notice || '');
  const [dangXuLy, setDangXuLy] = useState(false);
  const nutGoogleRef = useRef(null);
  const onLoginGoogleRef = useRef(onLoginGoogle);
  useEffect(function () {
    onLoginGoogleRef.current = onLoginGoogle;
  });

  // UC01: hiển thị nút "Đăng nhập với Google"; Google trả về ID Token (credential) để gửi lên máy chủ xác minh
  useEffect(function () {
    if (!GOOGLE_CLIENT_ID) return;
    taiThuVienGoogle()
      .then(function () {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          hd: 'vanlanguni.vn',
          callback: async function (phanHoi) {
            setErrorMsg('');
            try {
              await onLoginGoogleRef.current(phanHoi.credential);
            } catch (err) {
              setErrorMsg(err.message);
            }
          },
        });
        if (nutGoogleRef.current) {
          window.google.accounts.id.renderButton(nutGoogleRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 320,
          });
        }
      })
      .catch((err) => setErrorMsg(err.message));
  }, []);

  async function dangNhap(emailDangNhap, matKhau) {
    setErrorMsg('');
    setDangXuLy(true);
    try {
      await onLoginPassword(emailDangNhap, matKhau);
    } catch (err) {
      setErrorMsg(err.message);
      setDangXuLy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    dangNhap(email, password);
  }

  function handleQuickLogin(targetEmail) {
    setEmail(targetEmail);
    setPassword(MAT_KHAU_DU_LIEU_MAU);
    dangNhap(targetEmail, MAT_KHAU_DU_LIEU_MAU);
  }

  return (
    <div className="modern-auth-page">
      {/* Thanh điều hướng quay lại Trang chủ */}
      <div className="modern-auth-topbar">
        {onBackHome && (
          <button
            type="button"
            className="auth-back-home-btn"
            onClick={onBackHome}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Quay lại Trang chủ</span>
          </button>
        )}
      </div>

      {/* Thẻ đăng nhập trung tâm hiện đại, tối giản, chuyên nghiệp */}
      <div className="modern-auth-card">
        <div className="modern-auth-header">
          <div className="modern-auth-logo">VLU</div>
          <span className="modern-auth-org">VAN LANG UNIVERSITY • VLU SCIRES</span>
          <h1>Đăng nhập Hệ thống</h1>
          <p>Sử dụng tài khoản Google Workspace do nhà trường cấp phép</p>
        </div>

        {errorMsg && (
          <div className="modern-auth-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={nutGoogleRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }} />
            <div className="modern-divider">
              <span>Hoặc đăng nhập bằng mật khẩu</span>
            </div>
          </>
        )}

        <form className="modern-auth-form" onSubmit={handleSubmit}>
          <div className="modern-field">
            <label htmlFor="vlu-email-input">Tài khoản Email (@vanlanguni.vn)</label>
            <div className={`modern-input-wrap ${errorMsg ? 'has-error' : ''}`}>
              <span className="modern-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                id="vlu-email-input"
                type="email"
                placeholder="ten.mssv@vanlanguni.vn"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="modern-field">
            <label htmlFor="vlu-pass-input">Mật khẩu</label>
            <div className="modern-input-wrap">
              <span className="modern-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="vlu-pass-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="modern-pass-toggle"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div className="modern-auth-policy">
            <span>🛡️</span>
            <small>
              Hệ thống chỉ cho phép đăng nhập bằng email <b>@vanlanguni.vn</b> do nhà trường cấp.
            </small>
          </div>

          <button type="submit" className="modern-submit-btn" disabled={dangXuLy}>
            <span>{dangXuLy ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          </button>
        </form>

        {/* Chọn nhanh tài khoản dữ liệu mẫu - chỉ hiện khi chạy thử cục bộ (npm run dev) */}
        {import.meta.env.DEV && (
        <div className="modern-quick-accounts">
          <div className="modern-divider">
            <span>Tài khoản dữ liệu mẫu (mật khẩu: vlu@2026)</span>
          </div>

          <div className="modern-account-pills">
            <button
              type="button"
              className="modern-account-btn"
              onClick={() => handleQuickLogin('tri.2274802010926@vanlanguni.vn')}
            >
              <div className="acc-dot acc-student" />
              <div className="acc-meta">
                <strong>Sinh viên</strong>
                <span>tri.2274802010926@vanlanguni.vn</span>
              </div>
            </button>

            <button
              type="button"
              className="modern-account-btn"
              onClick={() => handleQuickLogin('hai.nt@vanlanguni.vn')}
            >
              <div className="acc-dot acc-lecturer" />
              <div className="acc-meta">
                <strong>Giảng viên (TS. Nguyễn Trí Hải)</strong>
                <span>hai.nt@vanlanguni.vn</span>
              </div>
            </button>

            <button
              type="button"
              className="modern-account-btn"
              onClick={() => handleQuickLogin('bao.vnq@vanlanguni.vn')}
            >
              <div className="acc-dot acc-lecturer" />
              <div className="acc-meta">
                <strong>Giảng viên (GS. TS. Võ Nguyễn Quốc Bảo)</strong>
                <span>bao.vnq@vanlanguni.vn</span>
              </div>
            </button>

            <button
              type="button"
              className="modern-account-btn"
              onClick={() => handleQuickLogin('chau.lth@vanlanguni.vn')}
            >
              <div className="acc-dot acc-admin" />
              <div className="acc-meta">
                <strong>Quản trị viên Khoa (Admin)</strong>
                <span>chau.lth@vanlanguni.vn</span>
              </div>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
