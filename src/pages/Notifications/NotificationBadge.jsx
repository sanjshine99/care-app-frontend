// frontend/src/components/NotificationBadge.jsx
// Notification bell with dropdown preview

import { useState, useEffect, useRef } from "react";
import { Bell, X, ExternalLink, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function NotificationBadge() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showDropdown) {
      loadRecentNotifications();
    }
  }, [showDropdown]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications", {
        params: { limit: 5, status: "unread" },
      });

      if (response.data.success) {
        setNotifications(response.data.data.notifications);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();

    try {
      await api.put(`/notifications/${id}/mark-read`);
      loadUnreadCount();
      loadRecentNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (notification.status === "unread") {
      await api.put(`/notifications/${notification._id}/mark-read`);
      loadUnreadCount();
    }

    // Close dropdown
    setShowDropdown(false);

    // Navigate
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-orange-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-sm text-gray-800 flex items-center gap-2">
                            {notification.title}
                            {notification.status === "unread" && (
                              <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                            )}
                          </h4>
                          <button
                            onClick={(e) =>
                              handleMarkAsRead(notification._id, e)
                            }
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3 text-blue-600" />
                          </button>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                          {notification.actionUrl && (
                            <span
                              className={`text-xs flex items-center gap-1 ${getTypeColor(notification.type)}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              {notification.actionLabel || "View"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={() => {
                setShowDropdown(false);
                navigate("/notifications");
              }}
              className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBadge;
