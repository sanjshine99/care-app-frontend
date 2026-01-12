// frontend/src/pages/Schedule/Schedule.jsx
// FIXED - Timezone bug resolved in date formatting

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import CalendarView from "./CalendarView";
import UnscheduledList from "./UnscheduledList";
import NeedsReassignment from "./NeedsReassignment";
import api from "../../services/api";

// ========================================
// ✅ FIXED: Date formatting helper to prevent timezone offset bug
// ========================================
/**
 * Format date for API calls - prevents timezone offset issues
 *
 * PROBLEM: Using toISOString() converts to UTC, which can shift the date by one day
 * Example: Jan 1, 2026 00:00 in GMT+8 → "2025-12-31T16:00:00Z" → "2025-12-31" ❌
 *
 * SOLUTION: Use local date components without timezone conversion
 * Example: Jan 1, 2026 00:00 in GMT+8 → "2026-01-01" ✅
 */
const formatDateForAPI = (date) => {
  if (!date) return "";

  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};
// ========================================

function Schedule() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [unscheduled, setUnscheduled] = useState([]);
  const [needsReassignment, setNeedsReassignment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unscheduledLoading, setUnscheduledLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ========================================
  // LOAD APPOINTMENTS
  // ========================================
  useEffect(() => {
    console.log("✅ Loading appointments");
    loadAppointments();
  }, [dateRange, refreshTrigger]);

  // ========================================
  // LOAD DATA FOR ACTIVE TAB
  // ========================================
  useEffect(() => {
    if (activeTab === "unscheduled") {
      loadUnscheduled();
    } else if (activeTab === "needs_reassignment") {
      loadNeedsReassignment();
    }
  }, [activeTab, dateRange, refreshTrigger]);

  const loadAppointments = async () => {
    setLoading(true);

    try {
      const response = await api.get("/schedule/appointments", {
        params: {
          startDate: formatDateForAPI(dateRange.start), // ✅ FIXED
          endDate: formatDateForAPI(dateRange.end), // ✅ FIXED
          limit: 1000,
        },
      });

      if (response.data.success) {
        let data = [];
        if (response.data.data?.appointments) {
          data = response.data.data.appointments;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }

        setAppointments(data);
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
      setAppointments([]);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const loadUnscheduled = async () => {
    setUnscheduledLoading(true);

    try {
      const response = await api.get("/schedule/unscheduled", {
        params: {
          startDate: formatDateForAPI(dateRange.start), // ✅ FIXED
          endDate: formatDateForAPI(dateRange.end), // ✅ FIXED
        },
      });

      if (response.data.success) {
        let data = [];
        if (response.data.data?.unscheduled) {
          data = response.data.data.unscheduled;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }

        setUnscheduled(data);
      }
    } catch (error) {
      console.error("Error loading unscheduled:", error);
      setUnscheduled([]);
      toast.error("Failed to load unscheduled appointments");
    } finally {
      setUnscheduledLoading(false);
    }
  };

  const loadNeedsReassignment = async () => {
    setLoading(true);

    try {
      const response = await api.get("/schedule/appointments", {
        params: {
          startDate: formatDateForAPI(dateRange.start), // ✅ FIXED
          endDate: formatDateForAPI(dateRange.end), // ✅ FIXED
          status: "needs_reassignment",
          limit: 1000,
        },
      });

      if (response.data.success) {
        let data = [];
        if (response.data.data?.appointments) {
          data = response.data.data.appointments;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }

        setNeedsReassignment(data);
      }
    } catch (error) {
      console.error("Error loading needs reassignment:", error);
      setNeedsReassignment([]);
      toast.error("Failed to load conflicting appointments");
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // VALIDATE SCHEDULE - DETECT CONFLICTS
  // ========================================
  const handleValidateSchedule = async () => {
    setValidating(true);

    try {
      console.log("🔍 Validating schedule for conflicts...");

      const response = await api.post("/schedule/validate", {
        startDate: formatDateForAPI(dateRange.start), // ✅ FIXED
        endDate: formatDateForAPI(dateRange.end), // ✅ FIXED
      });

      if (response.data.success) {
        const { summary } = response.data.data;

        console.log("Validation results:", summary);

        if (summary.invalid > 0) {
          toast.warning(
            `⚠️ Found ${summary.invalid} appointment${summary.invalid !== 1 ? "s" : ""} with conflicts`,
            { autoClose: 5000 }
          );

          // Refresh data
          setRefreshTrigger((prev) => prev + 1);

          // Switch to needs reassignment tab if conflicts found
          if (activeTab !== "needs_reassignment") {
            setActiveTab("needs_reassignment");
          }
        } else {
          toast.success(
            "✅ All appointments are valid - no conflicts detected!"
          );
        }
      }
    } catch (error) {
      console.error("Error validating schedule:", error);
      toast.error("Failed to validate schedule");
    } finally {
      setValidating(false);
    }
  };

  // ========================================
  // REFRESH
  // ========================================
  const handleRefresh = async () => {
    console.log("🔄 Refresh with validation");

    // First, validate the schedule
    await handleValidateSchedule();

    // Then refresh current tab data
    if (activeTab === "calendar") {
      toast.success("Refreshing appointments...");
    } else if (activeTab === "unscheduled") {
      toast.success("Refreshing...");
    } else {
      toast.success("Refreshing conflicts...");
    }
  };

  const handleRangeChange = (start, end) => {
    console.log("📅 Date range changed");
    setDateRange({ start, end });
  };

  const handleGenerateSchedule = () => {
    navigate("/schedule/generate");
  };

  const handleManualScheduleSuccess = () => {
    console.log("✅ Manual schedule success");
    setRefreshTrigger((prev) => prev + 1);
    toast.success("Appointment scheduled! Refreshing...");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Calculate stats
  const totalCount = appointments.length;
  const scheduledCount = appointments.filter(
    (a) => a.status === "scheduled"
  ).length;
  const inProgressCount = appointments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const completedCount = appointments.filter(
    (a) => a.status === "completed"
  ).length;
  const unscheduledCount = unscheduled.reduce(
    (sum, item) => sum + (item.missing || 0),
    0
  );
  const needsReassignmentCount = needsReassignment.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary-600" />
            Schedule Management
          </h1>
          <p className="text-gray-600 mt-1">View and manage appointments</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh & Validate Button */}
          <button
            onClick={handleRefresh}
            disabled={validating}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`h-5 w-5 ${validating ? "animate-spin" : ""}`}
            />
            {validating ? "Validating..." : "Refresh & Validate"}
          </button>

          {/* Generate Schedule Button */}
          <button
            onClick={handleGenerateSchedule}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Generate Schedule
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Total Appointments
          </h3>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>

        {/* Scheduled */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Scheduled</h3>
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
        </div>

        {/* In Progress */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            In Progress
          </h3>
          <p className="text-2xl font-bold text-orange-600">
            {inProgressCount}
          </p>
        </div>

        {/* Completed */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8" aria-label="Tabs">
            {/* Calendar Tab */}
            <button
              onClick={() => handleTabChange("calendar")}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "calendar"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CalendarIcon className="h-5 w-5" />
              Calendar
              <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                {appointments.length}
              </span>
            </button>

            {/* Unscheduled Tab */}
            <button
              onClick={() => handleTabChange("unscheduled")}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "unscheduled"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <AlertCircle className="h-5 w-5" />
              Unscheduled
              {unscheduledCount > 0 && (
                <span className="bg-amber-100 text-amber-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                  {unscheduledCount}
                </span>
              )}
            </button>

            {/* Needs Reassignment Tab */}
            <button
              onClick={() => handleTabChange("needs_reassignment")}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "needs_reassignment"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
              Needs Reassignment
              {needsReassignmentCount > 0 && (
                <span className="bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                  {needsReassignmentCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <div>
              {appointments.length === 0 && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <CalendarIcon className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        No Appointments Found
                      </h3>
                      <p className="text-gray-700 mb-3">
                        Get started by generating a schedule.
                      </p>
                      <button
                        onClick={handleGenerateSchedule}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Plus className="h-5 w-5" />
                        Generate Schedule Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <CalendarView
                appointments={appointments}
                onRangeChange={handleRangeChange}
                onRefresh={handleRefresh}
                loading={loading}
              />
            </div>
          )}

          {/* Unscheduled Tab */}
          {activeTab === "unscheduled" && (
            <div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-blue-800">
                      Unscheduled Appointments
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      These appointments need care givers assigned.
                    </p>
                  </div>
                </div>
              </div>

              {unscheduledLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Loading unscheduled...</p>
                  </div>
                </div>
              )}

              {!unscheduledLoading && (
                <>
                  {unscheduled.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <svg
                          className="h-8 w-8 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-800">
                        All Caught Up!
                      </h3>
                      <p className="text-gray-600">
                        No unscheduled appointments.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-semibold text-amber-900">
                              {unscheduledCount} Unscheduled Appointment
                              {unscheduledCount !== 1 ? "s" : ""}
                            </p>
                            <p className="text-sm text-amber-700">
                              Click "Generate Schedule" to automatically assign
                              care givers
                            </p>
                          </div>
                        </div>
                      </div>

                      <UnscheduledList
                        unscheduled={unscheduled}
                        onScheduleSuccess={handleManualScheduleSuccess}
                        loading={unscheduledLoading}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Needs Reassignment Tab */}
          {activeTab === "needs_reassignment" && (
            <div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-red-800">
                      Scheduling Conflicts Detected
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      These appointments have conflicts due to changes in
                      availability or requirements. Click "Refresh & Validate"
                      to check for new conflicts.
                    </p>
                  </div>
                </div>
              </div>

              <NeedsReassignment
                appointments={needsReassignment}
                onReassignSuccess={handleManualScheduleSuccess}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedule;
