// Nhập hook useState từ thư viện React để lưu trữ và cập nhật dữ liệu trên giao diện
import { useState } from 'react';
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
// Nhập phân hệ dành cho Quản lý Khoa CNTT (UC13, UC14, UC15, UC16, UC17, UC18, UC19)
import AdminPage from './pages/AdminPage';
// Nhập phân hệ dành cho Hội đồng nghiệm thu (UC20, UC21)
import CouncilPage from './pages/CouncilPage';
// Nhập toàn bộ các hàm xử lý dữ liệu và nghiệp vụ từ tầng dịch vụ api.js
import {
  getEnrichedDatabase,
  getCurrentSession,
  apiLoginWithGoogleSSO,
  apiLogout,
  apiUpdateProfile,
  apiCreateStudentTopic,
  apiCreateLecturerTopic,
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
  resetDatabaseToDefault,
} from './services/api';
// Nhập file định dạng giao diện CSS tổng thể của ứng dụng
import './App.css';

// Bảng quy định tab màn hình mặc định sẽ mở ra tương ứng với từng vai trò người dùng
const TAB_MAC_DINH_THEO_VAI_TRO = {
  // Sinh viên mặc định vào Sàn Đề Tài NCKH
  STUDENT: 'BOARD',
  // Giảng viên mặc định vào Quản lý tiến độ Kanban
  LECTURER: 'KANBAN',
  // Quản lý Khoa mặc định vào Bảng điều khiển thống kê Dashboard
  ADMIN: 'DASHBOARD',
};

// Thành phần (Component) gốc điều phối toàn bộ ứng dụng React
export default function App() {
  // Khởi tạo state db lưu trữ toàn bộ cơ sở dữ liệu của hệ thống
  const [db, setDb] = useState(function () {
    // Đọc dữ liệu đã kết nối đầy đủ các bảng từ bộ nhớ hệ thống
    return getEnrichedDatabase();
  });

  // Khởi tạo state session lưu thông tin phiên đăng nhập hiện tại của người dùng
  const [session, setSession] = useState(function () {
    // Lấy phiên đăng nhập hiện hành (nếu có)
    return getCurrentSession();
  });

  // Khởi tạo state điều khiển hiển thị Trang chủ hay Trang đăng nhập khi chưa đăng nhập
  const [showLoginPage, setShowLoginPage] = useState(false);

  // Khởi tạo state activeTab lưu tên mục danh mục đang được người dùng chọn
  const [activeTab, setActiveTab] = useState(function () {
    // Kiểm tra người dùng hiện tại đang giữ vai trò gì
    const phienHienTai = getCurrentSession();
    // Lấy vai trò của người dùng (nếu chưa đăng nhập thì để trống)
    const vaiTro = phienHienTai && phienHienTai.user ? phienHienTai.user.role : '';
    // Trả về tab mặc định của vai trò đó, nếu không có thì mở tab BOARD
    return TAB_MAC_DINH_THEO_VAI_TRO[vaiTro] || 'BOARD';
  });

  // Hàm làm mới lại dữ liệu trên giao diện sau mỗi lần thêm, sửa, xóa thành công
  function refreshState() {
    // Cập nhật lại kho dữ liệu mới nhất vào state db
    setDb(getEnrichedDatabase());
    // Cập nhật lại thông tin phiên đăng nhập mới nhất vào state session
    setSession(getCurrentSession());
  }

  // Hàm xử lý khi người dùng bấm nút Đăng nhập bằng Google SSO Văn Lang (UC01)
  function handleLoginSSO(email) {
    // Gọi hàm đăng nhập để kiểm tra email @vanlanguni.vn do Admin cấp và tạo phiên làm việc
    const phienMoi = apiLoginWithGoogleSSO(email);
    // Lưu phiên làm việc mới vào state
    setSession(phienMoi);
    // Tải lại dữ liệu hệ thống
    setDb(getEnrichedDatabase());
    // Đóng màn hình đăng nhập
    setShowLoginPage(false);
    // Chuyển người dùng đến màn hình chính tương ứng với vai trò của họ
    setActiveTab(TAB_MAC_DINH_THEO_VAI_TRO[phienMoi.user.role] || 'BOARD');
  }

  // Hàm xử lý khi người dùng bấm nút Đăng xuất ở góc phải màn hình (UC02)
  function handleLogout() {
    // Xóa thông tin phiên làm việc
    apiLogout();
    // Đặt state session về null và đưa người dùng về Trang chủ
    setSession(null);
    setShowLoginPage(false);
  }

  // Nếu chưa đăng nhập: Mặc định hiển thị Trang chủ (HomePage), khi bấm nút Đăng nhập góc phải sẽ hiện LoginPage
  if (!session || !session.user) {
    if (showLoginPage) {
      return (
        <LoginPage
          onLoginSSO={handleLoginSSO}
          onBackHome={function () {
            setShowLoginPage(false);
          }}
        />
      );
    }
    return (
      <HomePage
        topics={db.topics}
        users={db.users}
        categories={db.categories}
        timelines={db.timelines}
        onOpenLogin={function () {
          setShowLoginPage(true);
        }}
      />
    );
  }

  // Lấy đối tượng người dùng đang đăng nhập hiện tại để truyền xuống các màn hình con
  const currentUser = session.user;

  // Hàm phụ trợ chọn đúng màn hình nội dung dựa theo tab đang chọn và vai trò người dùng
  function hienThiManHinhTheoVaiTro() {
    // Trường hợp 1: Nếu người dùng bấm vào mục "Hồ sơ cá nhân" ở menu góc phải (UC03)
    if (activeTab === 'PROFILE') {
      return (
        <ProfilePage
          key={currentUser.user_id}
          currentUser={currentUser}
          categories={db.categories}
          onSaveProfile={function (payload) {
            // Lưu số điện thoại và thông tin cá nhân mới rồi làm mới giao diện
            apiUpdateProfile(currentUser.user_id, payload);
            refreshState();
          }}
        />
      );
    }

    // Trường hợp 2: Nếu người dùng được phân công vào Hội đồng Khoa học và chọn mục "Hội đồng Khoa học" trên danh mục
    if (activeTab === 'COUNCIL_MAIN') {
      return (
        <CouncilPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          councils={db.councils}
          onSubmitCouncilScore={function (payload) {
            // Gọi nghiệp vụ chấm điểm nghiệm thu độc lập của từng ủy viên hội đồng (UC20)
            const ketQua = apiSubmitCouncilScore(currentUser, payload);
            refreshState();
            return ketQua;
          }}
          onFinalizeTopicDefense={function (topicId, decision) {
            // Gọi nghiệp vụ chốt điểm trung bình cộng và công bố kết quả nghiệm thu (UC21)
            const ketQua = apiFinalizeTopicDefense(topicId, decision);
            refreshState();
            return ketQua;
          }}
        />
      );
    }

    // Trường hợp 2: Nếu người dùng đang đăng nhập là Sinh viên (STUDENT)
    if (currentUser.role === 'STUDENT') {
      return (
        <StudentPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          categories={db.categories}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCreateStudentTopic={function (payload) {
            // Gọi nghiệp vụ sinh viên đăng ký đề tài mới (UC04)
            const ketQua = apiCreateStudentTopic(currentUser, payload);
            refreshState();
            return ketQua;
          }}
          onApplyToTopic={function (topicId, coverLetter) {
            // Gọi nghiệp vụ sinh viên ứng tuyển vào đề tài của giảng viên (UC05)
            const ketQua = apiApplyToTopic(currentUser, topicId, coverLetter);
            refreshState();
            return ketQua;
          }}
          onUploadDocument={function (payload) {
            // Gọi nghiệp vụ nộp báo cáo tiến độ hoặc báo cáo tổng kết PDF/DOCX (UC06)
            const ketQua = apiUploadDocument(currentUser, payload);
            refreshState();
            return ketQua;
          }}
          onCreateTask={function (topicId, taskTitle) {
            // Gọi nghiệp vụ thêm thẻ công việc mới trên bảng Kanban
            const ketQua = apiUpdateTaskAndComment(currentUser, {
              topic_id: topicId,
              new_task_title: taskTitle,
            });
            refreshState();
            return ketQua;
          }}
        />
      );
    }

    // Trường hợp 3: Nếu người dùng đang đăng nhập là Giảng viên hướng dẫn (LECTURER)
    if (currentUser.role === 'LECTURER') {
      return (
        <LecturerPage
          key={currentUser.user_id}
          currentUser={currentUser}
          topics={db.topics}
          categories={db.categories}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onCreateLecturerTopic={function (payload) {
            // Gọi nghiệp vụ giảng viên đề xuất hướng nghiên cứu mới (UC08)
            const ketQua = apiCreateLecturerTopic(currentUser, payload);
            refreshState();
            return ketQua;
          }}
          onReviewApplicant={function (topicId, memberId, status) {
            // Gọi nghiệp vụ duyệt hoặc từ chối sinh viên ứng tuyển (UC09)
            const ketQua = apiReviewApplicant(topicId, memberId, status);
            refreshState();
            return ketQua;
          }}
          onFinalizeGroup={function (topicId) {
            // Gọi nghiệp vụ chốt danh sách nhóm nghiên cứu để gửi Khoa duyệt
            const ketQua = apiFinalizeRecruitingGroup(topicId);
            refreshState();
            return ketQua;
          }}
          onConfirmAssignment={function (topicId, payload) {
            // Gọi nghiệp vụ xác nhận đồng ý hoặc từ chối hướng dẫn đề tài (UC10)
            const ketQua = apiLecturerConfirmAssignment(topicId, payload);
            refreshState();
            return ketQua;
          }}
          onUpdateTaskAndComment={function (payload) {
            // Gọi nghiệp vụ cập nhật trạng thái Kanban và nhận xét chuyên môn (UC11)
            const ketQua = apiUpdateTaskAndComment(currentUser, payload);
            refreshState();
            return ketQua;
          }}
          onSubmitProcessScore={function (payload) {
            // Gọi nghiệp vụ chấm điểm quá trình theo tiêu chí Rubric (UC12)
            const ketQua = apiSubmitProcessScore(currentUser, payload);
            refreshState();
            return ketQua;
          }}
        />
      );
    }

    // Trường hợp 4: Nếu người dùng đang đăng nhập là Quản lý Khoa CNTT (ADMIN)
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
          onReviewAndAssignTopic={function (topicId, payload) {
            // Gọi nghiệp vụ xét duyệt thuyết minh và gán GVHD (UC14, UC15)
            const ketQua = apiAdminReviewAndAssignTopic(topicId, payload);
            refreshState();
            return ketQua;
          }}
          onCreateCouncil={function (payload) {
            // Gọi nghiệp vụ thành lập Hội đồng nghiệm thu (UC16)
            const ketQua = apiCreateCouncilAndAssignTopics(payload);
            refreshState();
            return ketQua;
          }}
          onAssignTopicToCouncil={function (topicId, councilId) {
            // Gọi nghiệp vụ gán đề tài vào hội đồng nghiệm thu đã có
            const ketQua = apiAssignTopicToExistingCouncil(topicId, councilId);
            refreshState();
            return ketQua;
          }}
          onSaveTimeline={function (payload) {
            // Gọi nghiệp vụ thiết lập mốc thời gian đóng/mở cổng đăng ký (UC13)
            const ketQua = apiCreateOrUpdateTimeline(payload);
            refreshState();
            return ketQua;
          }}
          onDeleteTimeline={function (timelineId) {
            // Gọi nghiệp vụ xóa mốc thời gian
            const ketQua = apiDeleteTimeline(timelineId);
            refreshState();
            return ketQua;
          }}
          onCreateCategory={function (payload) {
            // Gọi nghiệp vụ thêm danh mục lĩnh vực hoặc bộ tiêu chí chấm điểm (UC17)
            const ketQua = apiCreateCategory(payload);
            refreshState();
            return ketQua;
          }}
          onDeleteCategory={function (catId) {
            // Gọi nghiệp vụ xóa danh mục hệ thống
            const ketQua = apiDeleteCategory(catId);
            refreshState();
            return ketQua;
          }}
          onToggleUserLock={function (userId) {
            // Gọi nghiệp vụ khóa hoặc mở khóa tài khoản người dùng (UC19)
            const ketQua = apiToggleUserLock(userId);
            refreshState();
            return ketQua;
          }}
          onCreateUser={function (payload) {
            // Gọi nghiệp vụ cấp tài khoản mới dành cho Quản trị viên Khoa
            const ketQua = apiCreateUserByAdmin(payload);
            refreshState();
            return ketQua;
          }}
          onUpdateUserRole={function (targetUserId, newRole) {
            // Gọi nghiệp vụ thay đổi phân quyền vai trò của tài khoản
            const ketQua = apiUpdateUserRoleByAdmin(currentUser.user_id, targetUserId, newRole);
            refreshState();
            return ketQua;
          }}
          onDeleteUser={function (targetUserId) {
            // Gọi nghiệp vụ xóa vĩnh viễn tài khoản người dùng khỏi hệ thống
            const ketQua = apiDeleteUserByAdmin(currentUser.user_id, targetUserId);
            refreshState();
            return ketQua;
          }}
          onResetSampleData={function () {
            // Khôi phục lại toàn bộ dữ liệu mẫu ban đầu để thuận tiện kiểm thử lại
            resetDatabaseToDefault();
            refreshState();
            return { message: 'Đã khôi phục toàn bộ dữ liệu mẫu ban đầu thành công!' };
          }}
        />
      );
    }

    // Trường hợp 5: Nếu người dùng đang đăng nhập là Thành viên Hội đồng nghiệm thu (COUNCIL)
    return (
      <CouncilPage
        key={currentUser.user_id}
        currentUser={currentUser}
        topics={db.topics}
        councils={db.councils}
        onSubmitCouncilScore={function (payload) {
          // Gọi nghiệp vụ chấm điểm nghiệm thu độc lập của từng ủy viên hội đồng (UC20)
          const ketQua = apiSubmitCouncilScore(currentUser, payload);
          refreshState();
          return ketQua;
        }}
        onFinalizeTopicDefense={function (topicId, decision) {
          // Gọi nghiệp vụ chốt điểm trung bình cộng và công bố kết quả nghiệm thu (UC21)
          const ketQua = apiFinalizeTopicDefense(topicId, decision);
          refreshState();
          return ketQua;
        }}
      />
    );
  }

  // Hiển thị khung giao diện chính MainLayout bao bọc lấy màn hình chức năng bên trong
  return (
    <MainLayout
      currentUser={currentUser}
      topics={db.topics}
      councils={db.councils}
      timelines={db.timelines}
      notifications={db.notifications}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onMarkNotificationsRead={function (uid) {
        // Đánh dấu toàn bộ thông báo của người dùng là đã đọc (UC23)
        apiMarkNotificationsRead(uid);
        refreshState();
      }}
      onLogout={handleLogout}
    >
      {hienThiManHinhTheoVaiTro()}
    </MainLayout>
  );
}
