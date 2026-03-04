import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";
import { queryClient } from "../../lib/queryClient";

const LIMIT = 20;

function Notifications() {
  const navigate = useNavigate();
  const confirmDialog = useConfirmDialog();
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ status: "", type: "", priority: "" });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const buildParams = () => {
    const params = { page, limit: LIMIT };
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (filters.priority) params.priority = filters.priority;
    return params;
  };

  const { data: notifData, isLoading, refetch } = useQuery({
    queryKey: ["notifications", filters, page],
    queryFn: () => api.get("/notifications", { params: buildParams() }).then((r) => r.data.data),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ["notification-stats"],
    queryFn: () => api.get("/notifications/stats").then((r) => r.data.data.stats),
    staleTime: 30 * 1000,
  });

  const notifications = notifData?.notifications ?? [];
  const pagination = notifData?.pagination ?? { page: 1, pages: 0, total: 0, limit: LIMIT };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notification-stats"] });
  };

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/mark-read`),
    onSuccess: () => { toast.success("Marked as read"); invalidateAll(); },
    onError: () => toast.error("Failed to mark as read"),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put("/notifications/mark-all-read"),
    onSuccess: () => { toast.success("All notifications marked as read"); invalidateAll(); },
    onError: () => toast.error("Failed to mark all as read"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/archive`),
    onSuccess: () => { toast.success("Notification archived"); invalidateAll(); },
    onError: () => toast.error("Failed to archive"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => { toast.success("Notification deleted"); invalidateAll(); },
    onError: () => toast.error("Failed to delete"),
  });

  const bulkActionMutation = useMutation({
    mutationFn: ({ action, notificationIds }) =>
      api.post("/notifications/bulk-action", { action, notificationIds }),
    onSuccess: () => {
      setSelectedIds([]);
      toast.success("Bulk action completed");
      invalidateAll();
    },
    onError: () => toast.error("Bulk action failed"),
  });

  const handleDelete = async (id) => {
    if (!confirmDialog?.confirm) {
      toast.error("Unable to confirm action");
      return;
    }
    const ok = await confirmDialog.confirm({
      title: "Delete notification?",
      message: "Are you sure you want to delete this notification?",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    deleteMutation.mutate(id);
  };

  const handleNotificationClick = (notification) => {
    if (notification.status === "unread") {
      markAsReadMutation.mutate(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === notifications.length ? [] : notifications.map((n) => n._id));
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error": return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
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
      <span className={`px-2 py-1 rounded text-xs font-medium ${classes[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const diffMs = Date.now() - d;
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
    <div className="p-6 flex flex-col">
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
            <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
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
            <p className="text-2xl font-bold text-orange-600">{stats.actionRequired}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
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
                onClick={() => {
                  setFilters({ status: "", type: "", priority: "" });
                  setPage(1);
                }}
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
                onClick={() =>
                  bulkActionMutation.mutate({ action: "mark_read", notificationIds: selectedIds })
                }
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Check className="h-4 w-4" />
                Mark Read
              </button>
              <button
                onClick={() =>
                  bulkActionMutation.mutate({ action: "archive", notificationIds: selectedIds })
                }
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
            onClick={() => markAllReadMutation.mutate()}
            className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Mark all as read ({stats.unread})
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="card">
        {isLoading ? (
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
                            <span className="h-2 w-2 bg-blue-600 rounded-full" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      </div>
                      <div className="ml-4">{getPriorityBadge(notification.priority)}</div>
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
                          markAsReadMutation.mutate(notification._id);
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
                        archiveMutation.mutate(notification._id);
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
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === pagination.pages}
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
