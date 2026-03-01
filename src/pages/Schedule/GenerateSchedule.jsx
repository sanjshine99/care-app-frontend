// frontend/src/pages/Schedule/GenerateSchedule.jsx
// Uses UnscheduledCheckContext: background check, persisted results, toast on completion

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import moment from "moment";
import { useUnscheduledCheck } from "../../contexts/UnscheduledCheckContext";
import { useScheduleGeneration } from "../../contexts/ScheduleGenerationContext";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

function GenerateSchedule() {
  const navigate = useNavigate();
  const { lastCheck, isChecking, runCheck } = useUnscheduledCheck();
  const { lastGeneration, isGenerating, runGeneration, clearLastGeneration } =
    useScheduleGeneration();
  const confirmDialog = useConfirmDialog();

  const [startDate, setStartDate] = useState(
    moment().add(1, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    moment().add(1, "month").format("YYYY-MM-DD"),
  );

  const [careReceivers, setCareReceivers] = useState([]);
  const [selectedReceivers, setSelectedReceivers] = useState([]);
  const [showFailureDetails, setShowFailureDetails] = useState(false);

  const results = lastGeneration
    ? {
        success: lastGeneration.success,
        scheduled: lastGeneration.summary?.totalScheduled ?? 0,
        failed: lastGeneration.summary?.totalFailed ?? 0,
        details: lastGeneration.results ?? [],
        error: lastGeneration.error ?? null,
      }
    : null;
  const generating = isGenerating;

  const unscheduledSummary =
    lastCheck?.data?.unscheduled != null
      ? {
          total: lastCheck.data.unscheduled.reduce(
            (sum, item) => sum + (item.missing || 0),
            0,
          ),
          byCareReceiver: lastCheck.data.unscheduled,
          lastCheckedAt: lastCheck.completedAt,
          lastCheckRange: {
            startDate: lastCheck.startDate,
            endDate: lastCheck.endDate,
          },
        }
      : null;

  const hasChecked = lastCheck != null;
  const loading = isChecking;
  const rangeMatches =
    lastCheck &&
    lastCheck.startDate === startDate &&
    lastCheck.endDate === endDate;

  useEffect(() => {
    loadCareReceivers();
  }, []);

  const loadCareReceivers = async () => {
    try {
      const response = await api.get("/carereceivers", {
        params: { isActive: true },
      });

      if (response.data.success) {
        setCareReceivers(response.data.data.careReceivers || []);
      }
    } catch (error) {
      console.error("Error loading care receivers:", error);
      toast.error("Failed to load care receivers");
    }
  };

  const handleCheckUnscheduled = () => {
    runCheck(startDate, endDate);
  };

  const handleStartDateChange = (newStart) => {
    const start = moment(newStart);
    const maxEnd = start.clone().add(1, "month");

    setStartDate(start.format("YYYY-MM-DD"));

    if (moment(endDate).isAfter(maxEnd)) {
      setEndDate(maxEnd.format("YYYY-MM-DD"));
      toast.info("End date adjusted to 1 month maximum");
    }
  };

  const handleEndDateChange = (newEnd) => {
    const start = moment(startDate);
    const end = moment(newEnd);
    const maxEnd = start.clone().add(1, "month");

    if (end.isAfter(maxEnd)) {
      toast.error("Maximum date range is 1 month");
      setEndDate(maxEnd.format("YYYY-MM-DD"));
    } else if (end.isBefore(start)) {
      toast.error("End date must be after start date");
      setEndDate(start.format("YYYY-MM-DD"));
    } else {
      setEndDate(end.format("YYYY-MM-DD"));
    }
  };

  // ========================================
  // REMOVED: Auto-reload on date change
  // User must click "Check Unscheduled" button
  // ========================================

  // Toggle care receiver selection
  const toggleCareReceiver = (id) => {
    setSelectedReceivers((prev) => {
      if (prev.includes(id)) {
        return prev.filter((rid) => rid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Select all with unscheduled appointments
  const selectAllWithUnscheduled = () => {
    if (!unscheduledSummary) return;

    const idsWithUnscheduled = unscheduledSummary.byCareReceiver
      .filter((item) => item.missing > 0)
      .map((item) => item.careReceiver.id);

    setSelectedReceivers(idsWithUnscheduled);
    toast.success(
      `Selected ${idsWithUnscheduled.length} care receivers with unscheduled appointments`,
    );
  };

  const handleGenerate = async () => {
    if (selectedReceivers.length === 0) {
      toast.error("Please select at least one care receiver");
      return;
    }

    const unscheduledCount =
      unscheduledSummary?.byCareReceiver
        .filter((item) => selectedReceivers.includes(item.careReceiver.id))
        .reduce((sum, item) => sum + item.missing, 0) || 0;

    const message =
      `Generate schedule for ${selectedReceivers.length} care receiver(s)?\n\n` +
      `This will attempt to schedule ${unscheduledCount} unscheduled appointments ` +
      `from ${moment(startDate).format("MMM D, YYYY")} to ${moment(endDate).format("MMM D, YYYY")}. ` +
      `You can leave this page; you will be notified when generation completes.`;
    const ok = await confirmDialog.confirm({
      title: "Generate schedule?",
      message,
      confirmLabel: "Generate",
    });
    if (!ok) return;

    setShowFailureDetails(false);
    runGeneration(selectedReceivers, startDate, endDate);
  };

  // Calculate date range info
  const daysBetween = moment(endDate).diff(moment(startDate), "days") + 1;
  const isMaxRange = daysBetween >= 30;

  return (
    <div className="p-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate("/schedule")}
          className="btn-secondary flex items-center gap-2 mb-4"
          aria-label="Back to Schedule"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schedule
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Generate Schedule
        </h1>
        <p className="text-gray-600 mt-2">
          Automatically schedule unassigned appointments for care receivers
        </p>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">How This Works:</p>
              <ul className="space-y-1">
                <li>
                  • Only schedules <strong>unassigned appointments</strong>
                  (won't duplicate existing appointments)
                </li>
                <li>
                  • Maximum range: <strong>1 month</strong> at a time
                </li>
                <li>
                  • Automatically assigns care givers based on skills,
                  availability, distance, and preferences
                </li>
                <li>• You can manually adjust any assignment afterward</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">
          1. Select Date Range (Max: 1 Month)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={moment(startDate).add(1, "month").format("YYYY-MM-DD")}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm">
              <p className="text-gray-600">Date Range:</p>
              <p className="font-semibold text-gray-800">
                {daysBetween} day{daysBetween !== 1 ? "s" : ""}
              </p>
              {isMaxRange && (
                <p className="text-amber-600 text-xs mt-1">
                  Maximum range (1 month)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================
            Last check info box (when available)
            ======================================== */}
        {unscheduledSummary?.lastCheckedAt && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Last unscheduled check</p>
                <p>
                  Run at{" "}
                  <strong>
                    {moment(unscheduledSummary.lastCheckedAt).format(
                      "h:mm A, D MMM YYYY"
                    )}
                  </strong>{" "}
                  ({moment(unscheduledSummary.lastCheckedAt).fromNow()})
                  {lastCheck?.startDate &&
                    lastCheck?.endDate &&
                    ` · Results for ${moment(lastCheck.startDate).format("MMM D")} – ${moment(lastCheck.endDate).format("MMM D, YYYY")}`}
                  .
                </p>
                {!rangeMatches && (
                  <p className="mt-1 text-amber-700">
                    Date range has changed – check again for current range.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            Check Unscheduled Button
            ======================================== */}
        <div className="flex justify-end items-center gap-3">
          <button
            onClick={handleCheckUnscheduled}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Checking...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                {hasChecked ? "Check Again" : "Check Unscheduled Appointments"}
              </>
            )}
          </button>
        </div>
        {/* ======================================== */}
      </div>

      {/* ========================================
          CHANGED: Show message when not checked yet
          ======================================== */}
      {!hasChecked && !loading ? (
        <div className="card text-center py-12 bg-gray-50">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Ready to Check
          </h3>
          <p className="text-gray-600 mb-4">
            Click "Check Unscheduled Appointments" to see what needs to be
            scheduled
          </p>
          <p className="text-sm text-gray-500">
            Currently viewing: {moment(startDate).format("MMM D")} -{" "}
            {moment(endDate).format("MMM D, YYYY")}
          </p>
        </div>
      ) : loading ? (
        <div className="card text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-600">
            Checking for unscheduled appointments...
          </p>
        </div>
      ) : unscheduledSummary && unscheduledSummary.total > 0 ? (
        /* ======================================== */
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              2. Select Care Receivers ({unscheduledSummary.total} Unscheduled)
            </h2>
            <button
              onClick={selectAllWithUnscheduled}
              className="btn-secondary text-sm"
            >
              Select All with Unscheduled
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unscheduledSummary.byCareReceiver.map((item) => (
              <div
                key={item.careReceiver.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedReceivers.includes(item.careReceiver.id)
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => toggleCareReceiver(item.careReceiver.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedReceivers.includes(item.careReceiver.id)}
                      onChange={() => {}}
                      className="h-5 w-5"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {item.careReceiver.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.careReceiver.address?.city || "No address"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">
                      {item.missing}
                    </p>
                    <p className="text-xs text-gray-500">unscheduled</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedReceivers.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                <strong>{selectedReceivers.length}</strong> care receiver
                {selectedReceivers.length !== 1 ? "s" : ""} selected •{" "}
                <strong>
                  {unscheduledSummary.byCareReceiver
                    .filter((item) =>
                      selectedReceivers.includes(item.careReceiver.id),
                    )
                    .reduce((sum, item) => sum + item.missing, 0)}
                </strong>{" "}
                appointments will be scheduled
              </p>
            </div>
          )}
        </div>
      ) : hasChecked && unscheduledSummary ? (
        <div className="card text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No Unscheduled Appointments
          </h3>
          <p className="text-gray-600">
            All appointments for the selected date range are already scheduled!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {moment(startDate).format("MMM D")} -{" "}
            {moment(endDate).format("MMM D, YYYY")}
          </p>
        </div>
      ) : null}

      {/* Generate Button */}
      {unscheduledSummary && unscheduledSummary.total > 0 && (
        <div className="flex justify-end gap-4">
          <button
            onClick={() => navigate("/schedule")}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || selectedReceivers.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5" />
                Generate Schedule
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-8 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Generation Results</h2>
            {lastGeneration?.completedAt && (
              <span className="text-sm text-gray-500">
                Last run {moment(lastGeneration.completedAt).fromNow()}
              </span>
            )}
          </div>

          {results.success ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600">
                    {results.scheduled}
                  </p>
                  <p className="text-sm text-green-700">Scheduled</p>
                </div>

                {results.failed > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded text-center">
                    <XCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-amber-600">
                      {results.failed}
                    </p>
                    <p className="text-sm text-amber-700">Could Not Schedule</p>
                  </div>
                )}
              </div>

              {results.failed > 0 && results.details?.length > 0 && (
                <div className="mt-4 mb-4">
                  <button
                    onClick={() => setShowFailureDetails((prev) => !prev)}
                    className="text-sm text-amber-700 underline hover:text-amber-900"
                  >
                    {showFailureDetails ? "Hide" : "Show"} failure details (
                    {results.failed} could not be scheduled)
                  </button>
                  {showFailureDetails && (
                    <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                      {results.details
                        .filter((r) => r.failed?.length > 0)
                        .map((r, i) => {
                          const crName =
                            careReceivers.find(
                              (c) => c._id === r.careReceiverId,
                            )?.name || r.careReceiverId;
                          return (
                            <div
                              key={i}
                              className="border border-amber-200 rounded p-3 bg-amber-50"
                            >
                              <p className="font-semibold text-sm text-amber-900 mb-1">
                                {crName}
                              </p>
                              {r.failed.slice(0, 5).map((f, j) => (
                                <p key={j} className="text-xs text-amber-800">
                                  • {f.date} Visit {f.visit?.visitNumber}:{" "}
                                  {f.reason}
                                </p>
                              ))}
                              {r.failed.length > 5 && (
                                <p className="text-xs text-amber-600 mt-1">
                                  ...and {r.failed.length - 5} more
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/schedule")}
                  className="btn-primary flex-1"
                >
                  View Schedule
                </button>
                <button
                  onClick={() => {
                    clearLastGeneration();
                    setSelectedReceivers([]);
                    setShowFailureDetails(false);
                  }}
                  className="btn-secondary"
                >
                  Check Again
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">{results.error}</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default GenerateSchedule;
