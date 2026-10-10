import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, Check, Radio } from 'lucide-react';
import { api } from '../utils/api';
import { NotificationItem } from '../types';
import { getSocket } from '../utils/socket';
import { playOrderNotificationSound } from '../utils/sound';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  enableSound: boolean;
  setEnableSound: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, enableSound, setEnableSound }) => {
  const { user, quickSwitch } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // Ignore if not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    const handleNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      if (enableSound) {
        playOrderNotificationSound();
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [enableSound]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {/* Quick Role Switcher (1-Click, Passwordless) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Role:
          </span>
          <select
            value={user?.email || 'owner@grandbistro.com'}
            onChange={async (e) => {
              await quickSwitch(e.target.value);
              showToast('Switched workspace role instantly!', 'info');
            }}
            style={{
              padding: '0.3rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="owner@grandbistro.com">👑 Grand Bistro (Owner)</option>
            <option value="kitchen@grandbistro.com">👨‍🍳 Kitchen Head Chef (KDS)</option>
            <option value="waiter@grandbistro.com">🛎️ Floor Waiter</option>
            <option value="manager@grandbistro.com">📊 Restaurant Manager</option>
            <option value="owner@tokyoramen.com">🍜 Tokyo Ramen (Tenant B)</option>
            <option value="admin@platepulse.com">🛡️ Platform Super Admin</option>
          </select>
        </div>

        {/* Real-time Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: '#047857',
            fontWeight: 500,
          }}
        >
          <Radio size={12} style={{ animation: 'pulse 2s infinite' }} />
          <span>Live Sync</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setEnableSound(!enableSound)}
          title={enableSound ? 'Mute Order Alerts' : 'Unmute Order Alerts'}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.375rem 0.625rem' }}
        >
          {enableSound ? <Volume2 size={16} color="#0284c7" /> : <VolumeX size={16} color="#94a3b8" />}
          <span style={{ fontSize: '0.75rem' }}>{enableSound ? 'Audio On' : 'Muted'}</span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem', position: 'relative' }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '40px',
                width: '320px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        marginBottom: '0.25rem',
                        backgroundColor: n.isRead ? '#ffffff' : '#f8fafc',
                        borderLeft: n.isRead ? '2px solid transparent' : '2px solid #0284c7',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>{n.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{n.message}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
