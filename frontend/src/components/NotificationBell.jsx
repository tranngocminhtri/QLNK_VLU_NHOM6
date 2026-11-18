import { useState, useEffect, useRef } from 'react';
import { IconBell } from './Icons';

export default function NotificationBell({ notifications = [], onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0 && onMarkAllRead) {
      onMarkAllRead();
    }
  };

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`topbar-icon-btn ${open ? 'active' : ''}`}
        onClick={handleToggle}
        title="Thông báo hệ thống"
      >
        <IconBell />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="popover-card notif-popover">
          <div className="popover-header">
            <div>
              <strong>Thông báo của bạn</strong>
              <span className="popover-sub">{notifications.length} tin nhắn</span>
            </div>
            <button type="button" className="btn-close-sm" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">Bạn chưa có thông báo nào mới.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={`notif-item ${n.is_read ? '' : 'notif-unread'}`}
                >
                  <div className="notif-dot" />
                  <div className="notif-content">{n.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
