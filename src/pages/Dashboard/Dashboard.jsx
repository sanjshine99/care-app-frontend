// frontend/src/pages/Dashboard.jsx
// Dashboard with real statistics

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, Calendar, TrendingUp } from "lucide-react";
import { careGiverService } from "../../services/careGiverService";
import { careReceiverService } from "../../services/careReceiverService";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    careGivers: 0,
    careReceivers: 0,
    appointments: 0,
    completionRate: "0%",
    loading: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get current month date range for appointment stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const [cgResponse, crResponse, scheduleStats] = await Promise.all([
        careGiverService.getAll({ limit: 1 }),
        careReceiverService.getAll({ limit: 1 }),
        api
          .get("/schedule/stats", {
            params: {
              startDate: formatDate(startOfMonth),
              endDate: formatDate(endOfMonth),
            },
          })
          .catch(() => ({ data: { data: { stats: {} } } })),
      ]);

      const scheduleData = scheduleStats.data?.data?.stats || {};

      setStats({
        careGivers: cgResponse.data?.pagination?.total || 0,
        careReceivers: crResponse.data?.pagination?.total || 0,
        appointments: scheduleData.total || 0,
        completionRate: scheduleData.completionRate || "0%",
        loading: false,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const statCards = [
    {
      title: "Care Givers",
      value: stats.careGivers,
      icon: Users,
      color: "bg-blue-500",
      path: "/caregivers",
    },
    {
      title: "Care Receivers",
      value: stats.careReceivers,
      icon: UserCheck,
      color: "bg-green-500",
      path: "/carereceivers",
    },
    {
      title: "Appointments (This Month)",
      value: stats.appointments,
      icon: Calendar,
      color: "bg-purple-500",
      path: "/schedule",
    },
    {
      title: "Completion Rate",
      value: stats.completionRate,
      icon: TrendingUp,
      color: "bg-orange-500",
      path: "/schedule",
    },
  ];

  return (
    <div className="p-6 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.name}! Here's your system overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <button
            key={stat.title}
            onClick={() => navigate(stat.path)}
            className="card hover:shadow-lg transition-shadow cursor-pointer text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats.loading ? (
                    <span className="text-gray-400">...</span>
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-8 w-8 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/caregivers/new")}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">Add Care Giver</p>
          </button>
          <button
            onClick={() => navigate("/carereceivers/new")}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">Add Care Receiver</p>
          </button>
          <button
            onClick={() => navigate("/schedule")}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">View Schedule</p>
          </button>
          <button
            onClick={() => navigate("/schedule/generate")}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
          >
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">Generate Schedule</p>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Users</p>
            <p className="text-2xl font-bold">
              {stats.careGivers + stats.careReceivers}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">This Month's Appointments</p>
            <p className="text-2xl font-bold">{stats.appointments}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">System Health</p>
            <p className="text-2xl font-bold text-green-600">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
