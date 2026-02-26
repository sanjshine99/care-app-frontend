import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserCog,
  Calendar,
  MapPin,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

function Sidebar() {
  const { logout, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch {
      // silently fail
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/caregivers", icon: Users, label: "Care Givers" },
    { to: "/carereceivers", icon: UserCheck, label: "Care Receivers" },
    { to: "/schedule", icon: Calendar, label: "Schedule" },
    { to: "/map", icon: MapPin, label: "Map View" },
    { to: "/notifications", icon: Bell, label: "Notifications", showBadge: true },
    { to: "/users", icon: UserCog, label: "Users" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg">Care System</h2>
            <p className="text-xs text-gray-400">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.showBadge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="font-medium">{item.label}</span>
            {item.showBadge && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center font-bold">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user?.name || "Admin"}</p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
