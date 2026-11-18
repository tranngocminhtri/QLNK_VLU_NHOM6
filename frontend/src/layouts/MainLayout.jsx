// Nhập các hook quản lý trạng thái và sự kiện từ thư viện React
import { useState, useEffect, useRef } from 'react';
// Nhập thành phần quả chuông thông báo ở góc phải
import NotificationBell from '../components/NotificationBell';
// Nhập bộ biểu tượng SVG dùng cho thanh danh mục và menu tài khoản
import {
  IconChevronLeft,
  IconChevronDown,
  IconCompass,
  IconKanban,
  IconSparkles,
  IconAward,
  IconInbox,
  IconUsers,
  IconCheckCircle,
  IconPlusCircle,
  IconChart,
  IconShieldCheck,
  IconCalendar,
  IconFolder,
  IconUser,
  IconLogOut,
} from '../components/Icons';
// Nhập hàm định dạng ngày tháng chuẩn tiếng Việt
import { formatDateVN } from '../utils/validators';

// Bảng cấu hình nhãn hiển thị và màu sắc đại diện cho từng vai trò trong hệ thống
const ROLE_META = {
  STUDENT: { label: 'Sinh viên', badgeCls: 'role-tag-student', dotColor: '#3b82f6' },
  LECTURER: { label: 'Giảng viên', badgeCls: 'role-tag-lecturer', dotColor: '#8b5cf6' },
  ADMIN: { label: 'Quản lý Khoa', badgeCls: 'role-tag-admin', dotColor: '#e11d48' },
};

// Thành phần Khung Bố cục Chính (MainLayout) của hệ thống
export default function MainLayout({
  currentUser,
  topics = [],
  councils = [],
  timelines = [],
  notifications = [],
  activeTab,
  onSelectTab,
  onMarkNotificationsRead,
  onLogout,
  children,
}) {
  // Khởi tạo state kiểm soát trạng thái thu gọn hay mở rộng của bảng danh mục bên trái
  const [isCollapsed, setIsCollapsed] = useState(function () {
    // Đọc cấu hình thu gọn đã lưu trước đó trong trình duyệt
    return localStorage.getItem('VLU_SIDEBAR_COLLAPSED') === 'true';
  });
  // Khởi tạo state đóng/mở menu trên màn hình điện thoại/máy tính bảng
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Khởi tạo state đóng/mở menu hồ sơ cá nhân ở góc trên bên phải
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Tạo tham chiếu DOM để nhận biết khi người dùng bấm ra ngoài hộp menu góc phải
  const userMenuRef = useRef(null);

  // Lưu trạng thái đóng/mở của thanh danh mục bên trái vào trình duyệt mỗi khi thay đổi
  useEffect(
    function () {
      localStorage.setItem('VLU_SIDEBAR_COLLAPSED', String(isCollapsed));
    },
    [isCollapsed]
  );

  // Tự động đóng menu hồ sơ góc phải khi người dùng click chuột ra vùng bên ngoài
  useEffect(function () {
    function handleOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return function () {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  // Lấy thông tin nhãn và màu sắc của vai trò người dùng hiện tại
  const roleMeta = ROLE_META[currentUser?.role] || ROLE_META.STUDENT;

  // Lọc danh sách thông báo dành riêng cho người dùng đang đăng nhập
  const userNotifications = [];
  for (let i = 0; i < notifications.length; i++) {
    if (notifications[i].user_id === currentUser?.user_id) {
      userNotifications.push(notifications[i]);
    }
  }

  // Lấy mốc thời gian học kỳ hiện tại để hiển thị trên thanh tiêu đề
  const currentTimeline = timelines[0] || null;

  // Kiểm tra xem người dùng hiện tại có được phân công vào Hội đồng Khoa học nào không
  const myCouncils = [];
  const myCouncilIds = new Set();
  for (let i = 0; i < councils.length; i++) {
    const c = councils[i];
    const members = c.council_members || [];
    for (let j = 0; j < members.length; j++) {
      if (members[j].lecturer_id === currentUser?.user_id) {
        myCouncils.push(c);
        myCouncilIds.add(c.council_id);
        break;
      }
    }
  }
  const isAssignedToCouncil = myCouncils.length > 0;

  // Đếm số lượng đề tài theo từng trạng thái để hiển thị con số nhắc việc trên bảng danh mục
  let recruitingCount = 0;
  let pendingAdminCount = 0;
  let pendingCouncilCount = 0;
  let myPendingAssignCount = 0;
  let myCouncilDefenseCount = 0;

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    if (t.status === 'RECRUITING') {
      recruitingCount = recruitingCount + 1;
    }
    if (t.status === 'PENDING_ADMIN') {
      pendingAdminCount = pendingAdminCount + 1;
    }
    if (t.status === 'PENDING_COUNCIL') {
      pendingCouncilCount = pendingCouncilCount + 1;
    }
    if (t.lecturer_id === currentUser?.user_id && t.status === 'PENDING_LECTURER') {
      myPendingAssignCount = myPendingAssignCount + 1;
    }
    if (t.council_id && myCouncilIds.has(t.council_id) && t.status === 'PENDING_COUNCIL') {
      myCouncilDefenseCount = myCouncilDefenseCount + 1;
    }
  }

  // Danh sách các mục chức năng trên bảng danh mục bên trái tương ứng với từng vai trò
  const navConfig = {
    STUDENT: [
      { id: 'BOARD', icon: <IconCompass />, label: 'Khám phá Đề tài', badge: recruitingCount },
      { id: 'MY_TOPIC', icon: <IconKanban />, label: 'Tiến độ & Báo cáo' },
      { id: 'PROPOSE', icon: <IconSparkles />, label: 'Đề xuất Đề tài mới' },
      { id: 'RESULTS', icon: <IconAward />, label: 'Kết quả & Điểm số' },
    ],
    LECTURER: [
      { id: 'KANBAN', icon: <IconKanban />, label: 'Quản lý Tiến độ nhóm' },
      { id: 'ASSIGNMENTS', icon: <IconInbox />, label: 'Đề tài Khoa phân công', badge: myPendingAssignCount },
      { id: 'APPLICANTS', icon: <IconUsers />, label: 'Duyệt SV ứng tuyển' },
      { id: 'SCORE', icon: <IconCheckCircle />, label: 'Chấm điểm Quá trình' },
      { id: 'PUBLISH', icon: <IconPlusCircle />, label: 'Công bố Đề tài mới' },
    ],
    ADMIN: [
      { id: 'DASHBOARD', icon: <IconChart />, label: 'Tổng quan & Thống kê' },
      { id: 'APPROVAL', icon: <IconCheckCircle />, label: 'Duyệt & Phân công GV', badge: pendingAdminCount },
      { id: 'COUNCIL', icon: <IconShieldCheck />, label: 'Thành lập Hội đồng', badge: pendingCouncilCount },
      { id: 'TIMELINE', icon: <IconCalendar />, label: 'Lịch trình & Timeline' },
      { id: 'CATALOG', icon: <IconFolder />, label: 'Tài khoản & Danh mục' },
    ],
  };

  // Lấy danh sách menu của vai trò hiện tại
  const baseNavItems = navConfig[currentUser?.role] || navConfig.STUDENT;
  const navItems = [...baseNavItems];

  // Nếu người dùng được phân công vào Hội đồng Khoa học -> Tự động hiện thêm 1 mục riêng trong danh mục của họ
  if (isAssignedToCouncil) {
    navItems.push({
      id: 'COUNCIL_MAIN',
      icon: <IconShieldCheck />,
      label: 'Hội đồng Khoa học',
      badge: myCouncilDefenseCount || myCouncils.length,
    });
  }

  // Tìm tiêu đề của màn hình đang mở để hiển thị trên thanh Topbar
  let currentNavObj = navItems[0];
  if (activeTab === 'PROFILE') {
    currentNavObj = { label: 'Hồ sơ cá nhân & Cài đặt tài khoản' };
  } else {
    for (let i = 0; i < navItems.length; i++) {
      if (navItems[i].id === activeTab) {
        currentNavObj = navItems[i];
        break;
      }
    }
  }

  return (
    <div className={`app-frame ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Lớp phủ mờ khi mở menu trên màn hình nhỏ */}
      {mobileMenuOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={function () {
            setMobileMenuOpen(false);
          }}
        />
      )}

      {/* BẢNG DANH MỤC BÊN TRÁI (CÓ THỂ BẤM KÉO RA / THU VÀO MƯỢT MÀ) */}
      <aside className={`collapsible-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Nút mũi tên trên cạnh phải của Sidebar để bấm thu gọn / mở rộng */}
        <button
          type="button"
          className="sidebar-edge-toggle"
          onClick={function () {
            setIsCollapsed(!isCollapsed);
          }}
          title={isCollapsed ? 'Mở rộng bảng danh mục' : 'Thu gọn bảng danh mục'}
        >
          <IconChevronLeft rotated={isCollapsed} />
        </button>

        {/* Phần đầu Sidebar: Logo VLU và tên hệ thống */}
        <div
          className="sidebar-header"
          onClick={function () {
            if (navItems[0]) {
              onSelectTab(navItems[0].id);
            }
          }}
          title="Về trang chính"
        >
          <div className="vlu-brand-cube">VLU</div>
          {!isCollapsed && (
            <div className="sidebar-brand-info">
              <span className="sidebar-brand-title">VLU SciRes</span>
              <span className="sidebar-brand-sub">Khoa Công nghệ Thông tin</span>
            </div>
          )}
        </div>

        {/* Tiêu đề nhóm danh mục */}
        <div className="sidebar-group-title">
          {isCollapsed ? '•••' : 'DANH MỤC CHỨC NĂNG'}
        </div>

        {/* Danh sách các nút điều hướng chức năng */}
        <nav className="sidebar-menu">
          {navItems.map(function (item) {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
                onClick={function () {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                data-tooltip={item.label}
              >
                <span className="menu-item-icon">{item.icon}</span>
                {!isCollapsed && <span className="menu-item-text">{item.label}</span>}
                {!isCollapsed && item.badge > 0 && (
                  <span className="menu-item-badge">{item.badge}</span>
                )}
                {isCollapsed && item.badge > 0 && <span className="menu-item-dot" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="main-stage">
        {/* THANH TOPBAR TRÊN CÙNG */}
        <header className="glass-topbar">
          <div className="topbar-left-group">
            <div className="topbar-title-block">
              <h1 className="topbar-title">{currentNavObj?.label}</h1>
              {currentTimeline && (
                <span className="topbar-timeline-tag">
                  📅 {currentTimeline.event_name} ({formatDateVN(currentTimeline.start_date)} –{' '}
                  {formatDateVN(currentTimeline.end_date)})
                </span>
              )}
            </div>
          </div>

          {/* GÓC TRÊN BÊN PHẢI: QUẢ CHUÔNG THÔNG BÁO + HỒ SƠ AVATAR CÁ NHÂN & ĐĂNG XUẤT */}
          <div className="topbar-right-hub">
            <NotificationBell
              notifications={userNotifications}
              onMarkAllRead={function () {
                onMarkNotificationsRead(currentUser.user_id);
              }}
            />

            {/* Hộp Avatar cá nhân kèm Menu thả xuống (Hồ sơ cá nhân & Đăng xuất) */}
            <div className="user-dropdown-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className={`user-avatar-trigger ${userMenuOpen ? 'open' : ''}`}
                onClick={function () {
                  setUserMenuOpen(!userMenuOpen);
                }}
              >
                <div className="avatar-badge">
                  {currentUser?.full_name?.charAt(0) || 'U'}
                  <span
                    className="avatar-status-dot"
                    style={{ backgroundColor: roleMeta.dotColor }}
                  />
                </div>
                <div className="user-trigger-text">
                  <strong>{currentUser?.full_name}</strong>
                  <span>
                    {roleMeta.label}
                    {isAssignedToCouncil ? ' • HĐ Khoa học' : ''} • {currentUser?.user_code}
                  </span>
                </div>
                <IconChevronDown rotated={userMenuOpen} />
              </button>

              {userMenuOpen && (
                <div className="popover-card user-dropdown-menu">
                  {/* Phần đầu menu: Hiển thị thông tin định danh tài khoản */}
                  <div className="user-dropdown-header">
                    <div className="avatar-badge avatar-lg">
                      {currentUser?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="user-dropdown-meta">
                      <strong>{currentUser?.full_name}</strong>
                      <span>{currentUser?.email}</span>
                      <span className={`role-chip-mini ${roleMeta.badgeCls}`}>
                        {roleMeta.label} • Mã số: {currentUser?.user_code}
                      </span>
                    </div>
                  </div>

                  {/* Mục 1: Xem và cập nhật Hồ sơ cá nhân (UC03) */}
                  <div className="dropdown-section">
                    <button
                      type="button"
                      className={`dropdown-action-item ${activeTab === 'PROFILE' ? 'active' : ''}`}
                      onClick={function () {
                        onSelectTab('PROFILE');
                        setUserMenuOpen(false);
                      }}
                    >
                      <IconUser />
                      <div>
                        <strong>Hồ sơ cá nhân & Cài đặt</strong>
                        <small>Cập nhật số điện thoại, đơn vị chuyên môn</small>
                      </div>
                    </button>
                  </div>

                  {/* Mục 2: Đăng xuất khỏi hệ thống (UC02) */}
                  <div className="dropdown-footer">
                    <button
                      type="button"
                      className="dropdown-logout-btn"
                      onClick={function () {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <IconLogOut />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* KHÔNG GIAN LÀM VIỆC CHÍNH */}
        <main className="workspace-body">{children}</main>
      </div>
    </div>
  );
}
