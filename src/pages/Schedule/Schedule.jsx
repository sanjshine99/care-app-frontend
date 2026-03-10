// frontend/src/pages/Schedule/Schedule.jsx
// FIXED - Timezone bug resolved in date formatting

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  AlertCircle,
  AlertTriangle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import CalendarView from "./CalendarView";
import UnscheduledList from "./UnscheduledList";
import NeedsReassignment from "./NeedsReassignment";
import api from "../../services/api";
import { useUnscheduledCheck } from "../../contexts/UnscheduledCheckContext";
import { formatDateForAPI } from "../../utils/dateUtils";

function Schedule() {
  const navigate = useNavigate();
  const { lastCheck, isChecking, runCheck, clearLastCheck } = useUnscheduledCheck();
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [dateRange, setDateRange] = useState(() => ({
    start: moment().startOf("week").toDate(),
    end: moment().endOf("week").toDate(),
  }));

  const currentStartDate = formatDateForAPI(dateRange.start);
  const currentEndDate = formatDateForAPI(dateRange.end);

  const lastCheckMatchesRange =
    lastCheck && lastCheck.startDate === currentStartDate && lastCheck.endDate === currentEndDate;
  const unscheduled = lastCheck?.data?.unscheduled ?? [];
  const schedulingInProgress = lastCheck?.data?.schedulingInProgress ?? [];
  const unscheduledLoading = isChecking || !lastCheckMatchesRange;

  // ========================================
  // FETCH APPOINTMENTS via React Query
  // ========================================
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", currentStartDate, currentEndDate],
    queryFn: () =>
      api
        .get("/schedule/appointments", {
          params: { startDate: currentStartDate, endDate: currentEndDate, limit: 1000 },
        })
        .then((r) => {
          const d = r.data.data;
          return d?.appointments ?? (Array.isArray(d) ? d : []);
        }),
    staleTime: 2 * 60 * 1000,
  });

  // ========================================
  // FETCH NEEDS-REASSIGNMENT (only when tab is active)
  // ========================================
  const { data: needsReassignmentData, isLoading: needsReassignmentLoading } = useQuery({
    queryKey: ["needs-reassignment", currentStartDate, currentEndDate],
    queryFn: () =>
      api
        .get("/schedule/appointments", {
          params: {
            startDate: currentStartDate,
            endDate: currentEndDate,
            status: "needs_reassignment",
            limit: 1000,
          },
        })
        .then((r) => {
          const d = r.data.data;
          return d?.appointments ?? (Array.isArray(d) ? d : []);
        }),
    enabled: activeTab === "needs_reassignment",
    staleTime: 30 * 1000, // Short stale time — data changes frequently
    refetchOnWindowFocus: true,
  });

  const appointments = appointmentsData ?? [];
  const needsReassignment = needsReassignmentData ?? [];

  // ========================================
  // FETCH SCHEDULE STATUS (expiry info)
  // ========================================
  const { data: scheduleStatus } = useQuery({
    queryKey: ["scheduleStatus"],
    queryFn: () => api.get("/schedule/schedule-status").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  // ========================================
  // LOAD UNSCHEDULED WHEN TAB BECOMES ACTIVE
  // ========================================
  useEffect(() => {
    if (activeTab === "unscheduled") {
      runCheck(currentStartDate, currentEndDate);
    }
  }, [activeTab, currentStartDate, currentEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateSchedule = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["appointments", currentStartDate, currentEndDate] });
    queryClient.invalidateQueries({ queryKey: ["needs-reassignment", currentStartDate, currentEndDate] });
    queryClient.invalidateQueries({ queryKey: ["unscheduled"] });
    queryClient.invalidateQueries({ queryKey: ["scheduleStats"] });
  }, [currentStartDate, currentEndDate]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["appointments", currentStartDate, currentEndDate] });
    queryClient.invalidateQueries({ queryKey: ["needs-reassignment", currentStartDate, currentEndDate] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================
  // VALIDATE SCHEDULE - DETECT CONFLICTS
  // ========================================
  const handleValidateSchedule = useCallback(async () => {
    setValidating(true);
    try {
      const response = await api.post("/schedule/validate", {
        startDate: currentStartDate,
        endDate: currentEndDate,
      });

      if (response.data.success) {
        const { summary } = response.data.data;
        const hasConflicts = summary.invalid > 0;
        const hasAutoAssigned = (summary.autoAssigned || 0) > 0;

        if (hasConflicts || hasAutoAssigned) {
          let msg = "";
          if (hasConflicts) {
            msg += `${summary.invalid} appointment${summary.invalid !== 1 ? "s" : ""} with conflicts`;
          }
          if (hasAutoAssigned) {
            if (msg) msg += ". ";
            msg += `${summary.autoAssigned} appointment(s) auto-assigned`;
          }

          const remainingInvalid = summary.invalid - (summary.autoAssigned || 0);
          if (remainingInvalid > 0) {
            toast.warning(msg, { autoClose: 6000 });
            if (activeTab !== "needs_reassignment") {
              setActiveTab("needs_reassignment");
            }
          } else {
            toast.success(msg, { autoClose: 5000 });
          }
          invalidateSchedule();
        } else {
          toast.success("All appointments are valid - no conflicts detected!");
        }
      }
    } catch (error) {
      console.error("Error validating schedule:", error);
      toast.error("Failed to validate schedule");
    } finally {
      setValidating(false);
    }
  }, [currentStartDate, currentEndDate, invalidateSchedule, activeTab]);

  // ========================================
  // REFRESH
  // ========================================
  const handleRefresh = useCallback(async () => {
    await handleValidateSchedule();
    if (activeTab === "unscheduled") {
      runCheck(currentStartDate, currentEndDate);
    }
  }, [handleValidateSchedule, activeTab, currentStartDate, currentEndDate, runCheck]);

  const handleManualScheduleSuccess = useCallback(() => {
    invalidateSchedule();
    clearLastCheck();
    toast.success("Appointment scheduled! Refreshing...");
    runCheck(currentStartDate, currentEndDate, { silent: activeTab !== "unscheduled" });
  }, [invalidateSchedule, clearLastCheck, activeTab, currentStartDate, currentEndDate, runCheck]);

  const handleQuickRange = (range) => {
    let start, end;
    switch (range) {
      case "today":
        start = moment().startOf("day");
        end = moment().endOf("day");
        break;
      case "this_week":
        start = moment().startOf("week");
        end = moment().endOf("week");
        break;
      case "this_month":
        start = moment().startOf("month");
        end = moment().endOf("month");
        break;
      case "last_month":
        start = moment().subtract(1, "month").startOf("month");
        end = moment().subtract(1, "month").endOf("month");
        break;
      case "all_time":
        start = moment().subtract(90, "days").startOf("day");
        end = moment().add(30, "days").endOf("day");
        break;
      default:
        return;
    }
    setDateRange({ start: start.toDate(), end: end.toDate() });
  };

  const handlePreviousMonth = () => {
    setDateRange({
      start: moment(dateRange.start).subtract(1, "month").startOf("month").toDate(),
      end: moment(dateRange.start).subtract(1, "month").endOf("month").toDate(),
    });
  };

  const handleNextMonth = () => {
    setDateRange({
      start: moment(dateRange.start).add(1, "month").startOf("month").toDate(),
      end: moment(dateRange.start).add(1, "month").endOf("month").toDate(),
    });
  };

  const handleApplyDateRange = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (moment(dateRange.start).isAfter(moment(dateRange.end))) {
      toast.error("Start date must be before end date");
      return;
    }
    toast.success(
      `Showing appointments from ${moment(dateRange.start).format("MMM D")} to ${moment(dateRange.end).format("MMM D, YYYY")}`,
    );
  };

  const getQuickRangeForRange = (startDate, endDate) => {
    const start = moment(startDate);
    const end = moment(endDate);
    if (start.isSame(moment().startOf("day"), "day") && end.isSame(moment().endOf("day"), "day"))
      return "today";
    if (start.isSame(moment().startOf("week"), "day") && end.isSame(moment().endOf("week"), "day"))
      return "this_week";
    if (
      start.isSame(moment().startOf("month"), "day") &&
      end.isSame(moment().endOf("month"), "day")
    )
      return "this_month";
    if (
      start.isSame(moment().subtract(1, "month").startOf("month"), "day") &&
      end.isSame(moment().subtract(1, "month").endOf("month"), "day")
    )
      return "last_month";
    if (
      start.isSame(moment().subtract(90, "days").startOf("day"), "day") &&
      end.isSame(moment().add(30, "days").endOf("day"), "day")
    )
      return "all_time";
    return null;
  };

  const activeQuickRange = getQuickRangeForRange(dateRange.start, dateRange.end);

  // Calculate stats
  const totalCount = appointments.length;
  const scheduledCount = appointments.filter((a) => a.status === "scheduled").length;
  const inProgressCount = appointments.filter((a) => a.status === "in_progress").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const unscheduledCount = unscheduled.reduce((sum, item) => sum + (item.missing || 0), 0);
  const needsReassignmentCount = needsReassignment.length;

  return (
    <div className="p-6 flex flex-col">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary-600" />
              Schedule Management
            </h1>
            <p className="text-gray-600 mt-2">View and manage appointments</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={validating}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`h-5 w-5 ${validating ? "animate-spin" : ""}`} />
              {validating ? "Validating..." : "Refresh & Validate"}
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

        {/* Schedule Expiry Warning Banner */}
        {scheduleStatus && scheduleStatus.daysRemaining <= 7 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">Schedule Ending Soon</p>
                <p className="text-sm text-amber-700">
                  {scheduleStatus.daysRemaining > 0
                    ? `Your schedule ends on ${moment(scheduleStatus.lastScheduledDate).format("MMM D, YYYY")} (${scheduleStatus.daysRemaining} day${scheduleStatus.daysRemaining !== 1 ? "s" : ""} remaining).`
                    : "Your schedule has ended."}{" "}
                  {scheduleStatus.nextMonth && `Generate appointments for ${scheduleStatus.nextMonth.name}.`}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/schedule/generate?start=${scheduleStatus.suggestedRange.startDate}&end=${scheduleStatus.suggestedRange.endDate}`,
                )
              }
              className="btn-primary flex items-center gap-2 whitespace-nowrap ml-4"
            >
              <Plus className="h-4 w-4" />
              Schedule Next Month
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Appointments</h3>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Scheduled</h3>
            <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-1">In Progress</h3>
            <p className="text-2xl font-bold text-orange-600">{inProgressCount}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-600 mb-1">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </div>
        </div>

        {/* Filter by Date Range - shared for all tabs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-lg">Filter by Date Range</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 rounded"
                title="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium px-3">
                {moment(dateRange.start).format("MMMM YYYY")}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded"
                title="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleQuickRange("today")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeQuickRange === "today"
                  ? "bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-1"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleQuickRange("this_week")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeQuickRange === "this_week"
                  ? "bg-green-600 text-white ring-2 ring-green-400 ring-offset-1"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleQuickRange("this_month")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeQuickRange === "this_month"
                  ? "bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-1"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickRange("last_month")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeQuickRange === "last_month"
                  ? "bg-orange-600 text-white ring-2 ring-orange-400 ring-offset-1"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => handleQuickRange("all_time")}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeQuickRange === "all_time"
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              }`}
            >
              Last 90 Days
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formatDateForAPI(dateRange.start)}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: new Date(e.target.value) }))
                }
                className="input w-full"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formatDateForAPI(dateRange.end)}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: new Date(e.target.value) }))
                }
                min={formatDateForAPI(dateRange.start)}
                className="input w-full"
              />
            </div>

            <button
              onClick={handleApplyDateRange}
              disabled={!dateRange.start || !dateRange.end}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <CalendarIcon className="h-5 w-5" />
              Apply Filter
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            <p>
              Showing: <strong>{moment(dateRange.start).format("MMM D, YYYY")}</strong> to{" "}
              <strong>{moment(dateRange.end).format("MMM D, YYYY")}</strong> ({appointments.length}{" "}
              appointments)
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8" aria-label="Tabs">
              {/* Calendar Tab */}
              <button
                onClick={() => setActiveTab("calendar")}
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
                onClick={() => setActiveTab("unscheduled")}
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
                onClick={() => setActiveTab("needs_reassignment")}
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
                {appointments.length === 0 && !appointmentsLoading && (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <CalendarIcon className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          No Appointments Found
                        </h3>
                        <p className="text-gray-700 mb-3">Get started by generating a schedule.</p>
                        <button
                          onClick={() => navigate("/schedule/generate")}
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
                  startDate={currentStartDate}
                  endDate={currentEndDate}
                  onRefresh={handleRefresh}
                  loading={appointmentsLoading}
                />
              </div>
            )}

            {/* Unscheduled Tab */}
            {activeTab === "unscheduled" && (
              <div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
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
                        These appointments need caregivers assigned.
                      </p>{" "}
                    </div>
                  </div>
                </div>

                {unscheduledLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-gray-600">Loading unscheduled...</p>
                    </div>
                  </div>
                ) : unscheduled.length === 0 ? (
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
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">All Caught Up!</h3>
                    <p className="text-gray-600">No unscheduled appointments.</p>
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
                            Click "Generate Schedule" to automatically assign care givers
                          </p>
                        </div>
                      </div>
                    </div>

                    <UnscheduledList
                      unscheduled={unscheduled}
                      schedulingInProgress={schedulingInProgress}
                      onScheduleSuccess={handleManualScheduleSuccess}
                      loading={unscheduledLoading}
                    />
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
                        These appointments have conflicts due to changes in availability or
                        requirements. Click "Refresh & Validate" to check for new conflicts.
                      </p>
                    </div>
                  </div>
                </div>

                <NeedsReassignment
                  appointments={needsReassignment}
                  onReassignSuccess={handleManualScheduleSuccess}
                  loading={needsReassignmentLoading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Schedule;
