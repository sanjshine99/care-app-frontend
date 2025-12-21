// frontend/src/pages/Notifications/Notifications.jsx
// Complete notification center with filtering, sorting, and bulk actions

import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCircle,
  Archive,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    priority: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [filters, pagination.page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const response = await api.get("/notifications", { params });

      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get("/notifications/stats");
      if (response.data.success) {
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/mark-read`);
      loadNotifications();
      toast.success("Marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      loadNotifications();
      loadStats();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.put(`/notifications/${id}/archive`);
      loadNotifications();
      loadStats();
      toast.success("Notification archived");
    } catch (error) {
      toast.error("Failed to archive");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      await api.delete(`/notifications/${id}`);
      loadNotifications();
      loadStats();
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast.error("No notifications selected");
      return;
    }

    try {
      await api.post("/notifications/bulk-action", {
        action,
        notificationIds: selectedIds,
      });

      setSelectedIds([]);
      loadNotifications();
      loadStats();
      toast.success(`Bulk action completed`);
    } catch (error) {
      toast.error("Bulk action failed");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n._id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (notification.status === "unread") {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to action URL if present
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const classes = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${classes[priority]}`}
      >
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary-600" />
              Notifications
            </h1>
            <p className="text-gray-600 mt-2">
              Stay updated with system events and important updates
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/notifications/test")}
              className="btn-secondary flex items-center gap-2"
              title="Create test notification"
            >
              <Bell className="h-5 w-5" />
              Test
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            <button
              onClick={loadNotifications}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Unread</p>
            <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Read</p>
            <p className="text-2xl font-bold text-green-600">{stats.read}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Archived</p>
            <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Action Required</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.actionRequired}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="input"
              >
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="input"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="input"
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({ status: "", type: "", priority: "" })
                }
                className="btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-center">
            <p className="font-medium text-blue-800">
              {selectedIds.length} notification(s) selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("mark_read")}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Check className="h-4 w-4" />
                Mark Read
              </button>
              <button
                onClick={() => handleBulkAction("archive")}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {stats && stats.unread > 0 && (
        <div className="mb-6">
          <button
            onClick={handleMarkAllRead}
            className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Mark all as read ({stats.unread})
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No notifications</p>
            <p className="text-gray-500 text-sm mt-2">
              {filters.status || filters.type || filters.priority
                ? "Try changing your filters"
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-3 pb-4 border-b mb-4">
              <input
                type="checkbox"
                checked={selectedIds.length === notifications.length}
                onChange={handleSelectAll}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>

            {/* Notification Items */}
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                    notification.status === "unread"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  } ${selectedIds.includes(notification._id) ? "ring-2 ring-primary-500" : ""}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(notification._id)}
                    onChange={() => handleToggleSelect(notification._id)}
                    className="mt-1"
                  />

                  {/* Icon */}
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>

                  {/* Content */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          {notification.title}
                          {notification.status === "unread" && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getPriorityBadge(notification.priority)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      {notification.actionRequired && (
                        <span className="text-orange-600 font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Action Required
                        </span>
                      )}
                      {notification.actionUrl && (
                        <span className="text-primary-600 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {notification.actionLabel || "View"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {notification.status === "unread" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4 text-blue-600" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(notification._id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4 text-gray-600" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification._id);
                      }}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page - 1,
                      })
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page + 1,
                      })
                    }
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Notifications;
