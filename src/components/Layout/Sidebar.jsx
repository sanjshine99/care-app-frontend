import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import logoSvg from "../../assets/better-at-home-logo.svg";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

function Sidebar({ collapsed, onToggle }) {
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
    <div
      className={`relative h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-gray-700 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-800 overflow-hidden">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-sm mx-auto">
            B
          </div>
        ) : (
          <img src={logoSvg} alt="Better at Home" className="h-9 w-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <div className="relative flex-shrink-0">
              <item.icon className="h-5 w-5" />
              {item.showBadge && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="font-medium whitespace-nowrap">{item.label}</span>
                {item.showBadge && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-gray-800">
        <div className={`flex items-center gap-3 px-3 py-3 mb-1 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || "A"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{user?.name || "Admin"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={collapsed ? "Logout" : undefined}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
