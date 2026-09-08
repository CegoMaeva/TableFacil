import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const API_BASE_URL = 'http://127.0.0.1:5000';

interface Notification {
  id: string;
  type: 'order' | 'delivery' | 'message' | 'alert' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sender?: string;
  senderId?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  userType: 'driver' | 'kitchen' | 'manager' | 'service' | 'client';
  userId: string;
  userName: string;
  onActionClick?: (notification: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userType,
  userId,
  userName,
  onActionClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousNotifCountRef = useRef(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, userType]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    
    // Notification pour nouvelles notifications
    if (count > previousNotifCountRef.current) {
      const newNotifs = notifications.filter(n => !n.read).slice(0, count - previousNotifCountRef.current);
      newNotifs.forEach(n => {
        toast(n.title, { description: n.message, duration: 4000 });
      });
    }
    
    previousNotifCountRef.current = count;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/notifications/${userType}/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 404) return;
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data || []);
    } catch (error) {
      console.warn('Notifications unavailable:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (onActionClick) {
      onActionClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-600/30"
      >
        <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 w-[420px] bg-slate-900 border border-slate-700/50 rounded-lg shadow-2xl z-50 flex flex-col max-h-[600px]">
          <div className="p-3 border-b border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-100 font-semibold text-sm">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-12 h-12 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-slate-400 text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-2.5 rounded-md cursor-pointer transition-all ${
                      notif.read 
                        ? 'bg-slate-800/30 hover:bg-slate-800/50' 
                        : 'bg-blue-900/20 border border-blue-500/30 hover:bg-blue-900/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 text-xs font-medium leading-tight">{notif.message}</p>
                        <span className="text-slate-500 text-[10px] mt-1 block">
                          {new Date(notif.timestamp).toLocaleString('fr-FR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-700/50">
              <button
                onClick={() => {
                  notifications.forEach(n => !n.read && markAsRead(n.id));
                  toast.success('Tout marqué comme lu', { duration: 2000 });
                }}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
              >
                Tout marquer comme lu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
