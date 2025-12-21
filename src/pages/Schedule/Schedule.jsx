// frontend/src/pages/Schedule/Schedule.jsx
// Complete schedule management with calendar and manual scheduling

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, List, RefreshCw, Plus } from "lucide-react";
import { toast } from "react-toastify";
import CalendarView from "./CalendarView";
import UnscheduledList from "./UnscheduledList";
import api from "../../services/api";

function Schedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("calendar"); // 'calendar' or 'unscheduled'
  const [appointments, setAppointments] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, [dateRange, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAppointments(), loadUnscheduled()]);
    setLoading(false);
  };

  const loadAppointments = async () => {
    try {
      const response = await api.get("/schedule/appointments", {
        params: {
          startDate: dateRange.start.toISOString().split("T")[0],
          endDate: dateRange.end.toISOString().split("T")[0],
          limit: 1000,
        },
      });

      if (response.data.success) {
        setAppointments(response.data.data.appointments || []);
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
    }
  };

  const loadUnscheduled = async () => {
    try {
      const response = await api.get("/schedule/unscheduled", {
        params: {
          startDate: dateRange.start.toISOString().split("T")[0],
          endDate: dateRange.end.toISOString().split("T")[0],
        },
      });

      if (response.data.success) {
        setUnscheduled(response.data.data.unscheduled || []);
      }
    } catch (error) {
      console.error("Error loading unscheduled:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.success("Refreshed schedule data");
  };

  const handleManualScheduleSuccess = () => {
    // Refresh data after manual scheduling
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRangeChange = (start, end) => {
    setDateRange({ start, end });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary-600" />
              Schedule Management
            </h1>
            <p className="text-gray-600 mt-2">
              View appointments, manage unscheduled visits, and assign care
              givers
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => navigate("/schedule/generate")}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Generate Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Appointments</p>
          <p className="text-2xl font-bold text-gray-800">
            {appointments.length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Scheduled</p>
          <p className="text-2xl font-bold text-green-600">
            {appointments.filter((a) => a.status === "scheduled").length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-blue-600">
            {appointments.filter((a) => a.status === "completed").length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Unscheduled</p>
          <p className="text-2xl font-bold text-red-600">
            {unscheduled.reduce((sum, u) => sum + u.missing, 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-4 px-4 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "calendar"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarIcon className="h-5 w-5" />
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab("unscheduled")}
            className={`pb-4 px-4 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "unscheduled"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="h-5 w-5" />
            Unscheduled ({unscheduled.reduce((sum, u) => sum + u.missing, 0)})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "calendar" ? (
        <CalendarView
          appointments={appointments}
          onRangeChange={handleRangeChange}
          onRefresh={handleRefresh}
          loading={loading}
        />
      ) : (
        <UnscheduledList
          unscheduled={unscheduled}
          onScheduleSuccess={handleManualScheduleSuccess}
          loading={loading}
        />
      )}
    </div>
  );
}

export default Schedule;
