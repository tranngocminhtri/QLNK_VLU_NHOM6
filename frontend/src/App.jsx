// Nhập các hook của React để lưu trữ dữ liệu và chạy tác vụ khi giao diện thay đổi
import { useCallback, useEffect, useState } from 'react';
// Nhập khung bố cục chính MainLayout (gồm thanh danh mục bên trái thu gọn/mở rộng và góc phải thông báo + hồ sơ)
import MainLayout from './layouts/MainLayout';
// Nhập Trang chủ giới thiệu tổng quan Trường ĐH Văn Lang, Thành tựu & Hệ thống Quản lý NCKH
import HomePage from './pages/HomePage';
// Nhập trang Đăng nhập chính thức bằng email Văn Lang (UC01)
import LoginPage from './pages/LoginPage';
// Nhập trang Quản lý hồ sơ cá nhân (UC03)
import ProfilePage from './pages/ProfilePage';
// Nhập phân hệ dành cho Sinh viên (UC04, UC05, UC06, UC07, UC22)
import StudentPage from './pages/StudentPage';
// Nhập phân hệ dành cho Giảng viên hướng dẫn (UC08, UC09, UC10, UC11, UC12)
import LecturerPage from './pages/LecturerPage';
// Nhập phân hệ dành cho Quản lý Khoa CNTT (UC13, UC14, UC15, UC16, UC17, UC18)
import AdminPage from './pages/AdminPage';
// Nhập phân hệ dành cho Hội đồng nghiệm thu (UC19, UC20, UC21)
import CouncilPage from './pages/CouncilPage';
// Nhập toàn bộ các hàm gọi RESTful API từ tầng dịch vụ api.js
import {
  getCurrentSession,
  onSessionExpired,
  apiLoadData,
  apiLoadPublicOverview,
  apiGetProfile,
  apiLoginWithGoogleSSO,
  apiLoginWithPassword,
  apiLogout,
  apiUpdateProfile,
  apiCreateTopic,
  apiApplyToTopic,
  apiReviewApplicant,
  apiFinalizeRecruitingGroup,
  apiAdminReviewAndAssignTopic,
  apiLecturerConfirmAssignment,
  apiUploadDocument,
  apiUpdateTaskAndComment,
  apiSubmitProcessScore,
  apiCreateCouncilAndAssignTopics,
  apiAssignTopicToExistingCouncil,
  apiSubmitCouncilScore,
  apiFinalizeTopicDefense,
  apiCreateOrUpdateTimeline,
  apiDeleteTimeline,
  apiCreateCategory,
  apiDeleteCategory,
  apiToggleUserLock,
  apiCreateUserByAdmin,
  apiUpdateUserRoleByAdmin,
  apiDeleteUserByAdmin,
  apiMarkNotificationsRead,
  apiResetSampleData,
} from './services/api';
// Nhập file định dạng giao diện CSS tổng thể của ứng dụng
import './App.css';

// Bảng quy định tab màn hình mặc định sẽ mở ra tương ứng với từng vai trò người dùng
const TAB_MAC_DINH_THEO_VAI_TRO = {
  STUDENT: 'BOARD',
  LECTURER: 'KANBAN',
  ADMIN: 'DASHBOARD',
};

// Dữ liệu rỗng ban đầu trong lúc chờ máy chủ trả về
const DU_LIEU_TRONG = { users: [], topics: [], councils: [], categories: [], timelines: [], notifications: [] };

// UC02 luồng 1a: tự đăng xuất khi người dùng không thao tác quá 30 phút
const THOI_GIAN_CHO_TOI_DA_MS = 30 * 60 * 1000;

// Lấy dữ liệu mới nhất: đã đăng nhập thì lấy dữ liệu theo vai trò + hồ sơ, chưa thì lấy số liệu Trang chủ
async function layDuLieuMoi() {
  if (!getCurrentSession()) {
    return { duLieu: { ...DU_LIEU_TRONG, ...(await apiLoadPublicOverview()) }, user: null };
  }
  const [duLieu, user] = await Promise.all([apiLoadData(), apiGetProfile()]);
  return { duLieu, user };
}

// Thành phần (Component) gốc điều phối toàn bộ ứng dụng React
export default function App() {
  // Toàn bộ dữ liệu hệ thống do máy chủ trả về (đã lọc theo vai trò)
  const [db, setDb] = useState(DU_LIEU_TRONG);
  // Phiên đăng nhập hiện tại (JWT + thông tin người dùng)
  const [session, setSession] = useState(getCurrentSession);
  // Trạng thái đang tải và lỗi tải dữ liệu lần đầu
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState('');
  // Điều khiển hiển thị Trang chủ hay Trang đăng nhập khi chưa đăng nhập
  const [showLoginPage, setShowLoginPage] = useState(false);
  // Thông báo hiển thị trên trang đăng nhập (VD: phiên làm việc đã hết hạn)
  const [loginNotice, setLoginNotice] = useState('');
  // Tab đang được người dùng chọn
  const [activeTab, setActiveTab] = useState(function () {
    const vaiTro = getCurrentSession()?.user?.role || '';
    return TAB_MAC_DINH_THEO_VAI_TRO[vaiTro] || 'BOARD';
  });

  const token = session?.token;

  // Đưa dữ liệu mới từ máy chủ vào state
  const apDungDuLieu = useCallback(function ({ duLieu, user }) {
    setDb(duLieu);
    if (user) setSession(getCurrentSession() && { ...getCurrentSession(), user });
  }, []);

  // Tải lại dữ liệu mới nhất từ máy chủ sau mỗi lần thêm, sửa, xóa
  const refreshState = useCallback(
    async function () {
      apDungDuLieu(await layDuLieuMoi());
    },
    [apDungDuLieu]
  );

  // Kết thúc phiên: về trang đăng nhập kèm lý do
  const ketThucPhien = useCallback(function (lyDo) {
    setSession(null);
    setShowLoginPage(true);
    setLoginNotice(lyDo);
  }, []);

  // Máy chủ báo 401 (Token hết hạn / bị khóa) -> tự đăng xuất
  useEffect(
    function () {
      onSessionExpired(ketThucPhien);
    },
    [ketThucPhien]
  );

  // Tải dữ liệu mỗi khi đăng nhập / đăng xuất
  useEffect(
    function () {
      layDuLieuMoi()
        .then(function (ketQua) {
          apDungDuLieu(ketQua);
          setLoiTai('');
        })
        .catch((err) => setLoiTai(err.message))
        .finally(() => setDangTai(false));
    },
    [apDungDuLieu, token]
  );

  // UC02 luồng 1a: đếm thời gian không thao tác, quá hạn thì gỡ Token và đẩy về màn hình Đăng nhập
  useEffect(
    function () {
      if (!token) return undefined;
      let henGio;
      const datLaiHenGio = function () {
        clearTimeout(henGio);
        henGio = setTimeout(function () {
          apiLogout().catch(() => {});
          ketThucPhien('Phiên làm việc đã hết hạn, vui lòng đăng nhập lại.');
        }, THOI_GIAN_CHO_TOI_DA_MS);
      };
      const suKien = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      suKien.forEach((ten) => window.addEventListener(ten, datLaiHenGio, { passive: true }));
      datLaiHenGio();
      return function () {
        clearTimeout(henGio);
        suKien.forEach((ten) => window.removeEventListener(ten, datLaiHenGio));
      };
    },
    [token, ketThucPhien]
  );

  // Gọi một nghiệp vụ trên máy chủ rồi làm mới giao diện; lỗi được ném lại để trang con hiển thị
  async function thucHien(goiApi) {
    const ketQua = await goiApi();
    await refreshState();
    return ketQua;
  }

  // Sau khi đăng nhập thành công (UC01): lưu phiên và chuyển tới màn hình theo vai trò
  function vaoHeThong(phienMoi) {
    setSession(phienMoi);
    setLoginNotice('');
    setShowLoginPage(false);
    setActiveTab(TAB_MAC_DINH_THEO_VAI_TRO[phienMoi.user.role] || 'BOARD');
  }

  // Đăng xuất (UC02)
  async function handleLogout() {
    await apiLogout().catch(() => {});
    setSession(null);
    setShowLoginPage(false);
  }

  if (dangTai) {
    return <div className="page-wrapper"><p className="muted-text">Đang tải dữ liệu từ máy chủ...</p></div>;
  }

  // Chưa đăng nhập: Trang chủ, bấm nút Đăng nhập góc phải sẽ hiện LoginPage
  if (!session || !session.user) {
    if (showLoginPage) {
      return (
        <LoginPage
          notice={loginNotice}
          onLoginGoogle={async (credential) => vaoHeThong(await apiLoginWithGoogleSSO(credential))}
          onLoginPassword={async (email, password) => vaoHeThong(await apiLoginWithPassword(email, password))}
          onBackHome={() => setShowLoginPage(false)}
        />
      );
    }
    return (
      <HomePage
        topics={db.topics}
        users={db.users}
        categories={db.categories}
        timelines={db.timelines}
        onOpenLogin={() => setShowLoginPage(true)}
      />
    );
  }

  if (loiTai) {
    return (
      <div className="page-wrapper">
        <div className="alert-warning">{loiTai}</div>
        <button type="button" className="btn btn-primary" onClick={() => refreshState().then(() => setLoiTai('')).catch((e) => setLoiTai(e.message))}>
          Thử lại
        </button>
      </div>
    );
  }

  // Người dùng đang đăng nhập hiện tại, truyền xuống các màn hình con
  const currentUser = session.user;

  // Màn hình Hội đồng Khoa học (UC19, UC20, UC21) dùng chung cho mọi giảng viên được phân công
  const councilPage = (
    <CouncilPage
      key={currentUser.user_id}
      currentUser={currentUser}
      topics={db.topics}
      councils={db.councils}
      onSubmitCouncilScore={(payload) => thucHien(() => apiSubmitCouncilScore(payload))}
      onFinalizeTopicDefense={(topicId, decision) => thucHien(() => apiFinalizeTopicDefense(topicId, decision))}
    />
  );

  // Chọn đúng màn hình nội dung dựa theo tab đang chọn và vai trò người dùng
  function hienThiManHinhTheoVaiTro() {
    if (activeTab === 'PROFILE') {
      return (
        <ProfilePage
          key={currentUser.user_id}
          currentUser={currentUser}
          categories={db.categories}
          onSaveProfile={(payload) => thucHien(() => apiUpdateProfile(payload))}
        />
      );
    }

    if (activeTab === 'COUNCIL_MAIN') return councilPage;

    if (currentUser.role === 'STUDENT') {
      return (
        <StudentPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          categories={db.categories}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCreateStudentTopic={(payload) => thucHien(() => apiCreateTopic(payload))}
          onApplyToTopic={(topicId, coverLetter) => thucHien(() => apiApplyToTopic(topicId, coverLetter))}
          onUploadDocument={(payload) => thucHien(() => apiUploadDocument(payload))}
          onCreateTask={(topicId, taskTitle) =>
            thucHien(() => apiUpdateTaskAndComment({ topic_id: topicId, new_task_title: taskTitle }))
          }
        />
      );
    }

    if (currentUser.role === 'LECTURER') {
      return (
        <LecturerPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          categories={db.categories}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCreateLecturerTopic={(payload) => thucHien(() => apiCreateTopic(payload))}
          onReviewApplicant={(topicId, memberId, status) => thucHien(() => apiReviewApplicant(topicId, memberId, status))}
          onFinalizeGroup={(topicId) => thucHien(() => apiFinalizeRecruitingGroup(topicId))}
          onConfirmAssignment={(topicId, payload) => thucHien(() => apiLecturerConfirmAssignment(topicId, payload))}
          onUpdateTaskAndComment={(payload) => thucHien(() => apiUpdateTaskAndComment(payload))}
          onSubmitProcessScore={(payload) => thucHien(() => apiSubmitProcessScore(payload))}
        />
      );
    }

    if (currentUser.role === 'ADMIN') {
      return (
        <AdminPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          users={db.users}
          councils={db.councils}
          categories={db.categories}
          timelines={db.timelines}
          activeTab={activeTab}
          onReviewAndAssignTopic={(topicId, payload) => thucHien(() => apiAdminReviewAndAssignTopic(topicId, payload))}
          onCreateCouncil={(payload) => thucHien(() => apiCreateCouncilAndAssignTopics(payload))}
          onAssignTopicToCouncil={(topicId, councilId) => thucHien(() => apiAssignTopicToExistingCouncil(topicId, councilId))}
          onSaveTimeline={(payload) => thucHien(() => apiCreateOrUpdateTimeline(payload))}
          onDeleteTimeline={(timelineId) => thucHien(() => apiDeleteTimeline(timelineId))}
          onCreateCategory={(payload) => thucHien(() => apiCreateCategory(payload))}
          onDeleteCategory={(catId) => thucHien(() => apiDeleteCategory(catId))}
          onToggleUserLock={(userId) => thucHien(() => apiToggleUserLock(userId))}
          onCreateUser={(payload) => thucHien(() => apiCreateUserByAdmin(payload))}
          onUpdateUserRole={(targetUserId, newRole) => thucHien(() => apiUpdateUserRoleByAdmin(targetUserId, newRole))}
          onDeleteUser={(targetUserId) => thucHien(() => apiDeleteUserByAdmin(targetUserId))}
          onResetSampleData={() => thucHien(() => apiResetSampleData())}
        />
      );
    }

    return councilPage;
  }

  return (
    <MainLayout
      currentUser={currentUser}
      topics={db.topics}
      councils={db.councils}
      timelines={db.timelines}
      notifications={db.notifications}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onMarkNotificationsRead={() => thucHien(() => apiMarkNotificationsRead()).catch(() => {})}
      onLogout={handleLogout}
    >
      {hienThiManHinhTheoVaiTro()}
    </MainLayout>
  );
}
