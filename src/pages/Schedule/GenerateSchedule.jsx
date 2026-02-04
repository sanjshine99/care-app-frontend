// frontend/src/pages/Schedule/GenerateSchedule.jsx
// FIXED - Only loads unscheduled appointments when user clicks button

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

function GenerateSchedule() {
  const navigate = useNavigate();

  // Default: Next month (1 month range)
  const [startDate, setStartDate] = useState(
    moment().add(1, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    moment().add(1, "month").format("YYYY-MM-DD"),
  );

  const [careReceivers, setCareReceivers] = useState([]);
  const [selectedReceivers, setSelectedReceivers] = useState([]);
  const [unscheduledSummary, setUnscheduledSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);

  // ========================================
  // NEW: Track if user has checked for unscheduled
  // ========================================
  const [hasChecked, setHasChecked] = useState(false);
  // ========================================

  // ========================================
  // CHANGED: Only load care receivers on mount, NOT unscheduled
  // ========================================
  useEffect(() => {
    loadCareReceivers();
    // REMOVED: loadUnscheduledSummary() - wait for user to click
  }, []);
  // ========================================

  // Load care receivers
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

  // Load unscheduled summary
  const loadUnscheduledSummary = async () => {
    try {
      setLoading(true);
      setHasChecked(true);

      const response = await api.get("/schedule/unscheduled", {
        params: {
          startDate: startDate,
          endDate: endDate,
        },
      });

      if (response.data.success) {
        const unscheduledData = response.data.data.unscheduled || [];
        const totalUnscheduled = unscheduledData.reduce(
          (sum, item) => sum + (item.missing || 0),
          0,
        );

        setUnscheduledSummary({
          total: totalUnscheduled,
          byCareReceiver: unscheduledData,
        });

        if (totalUnscheduled === 0) {
          toast.info(" No unscheduled appointments found in this date range");
        } else {
          toast.success(`Found ${totalUnscheduled} unscheduled appointments`);
        }
      }
    } catch (error) {
      console.error("Error loading unscheduled:", error);
      toast.error("Failed to check unscheduled appointments");
    } finally {
      setLoading(false);
    }
  };

  // Update date range (max 1 month)
  const handleStartDateChange = (newStart) => {
    const start = moment(newStart);
    const maxEnd = start.clone().add(1, "month");

    setStartDate(start.format("YYYY-MM-DD"));

    // Reset check status when dates change
    setHasChecked(false);
    setUnscheduledSummary(null);

    // If current end date is beyond 1 month, adjust it
    if (moment(endDate).isAfter(maxEnd)) {
      setEndDate(maxEnd.format("YYYY-MM-DD"));
      toast.info("End date adjusted to 1 month maximum");
    }
  };

  const handleEndDateChange = (newEnd) => {
    const start = moment(startDate);
    const end = moment(newEnd);
    const maxEnd = start.clone().add(1, "month");

    // Reset check status when dates change
    setHasChecked(false);
    setUnscheduledSummary(null);

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

  // Generate schedule
  const handleGenerate = async () => {
    if (selectedReceivers.length === 0) {
      toast.error("Please select at least one care receiver");
      return;
    }

    // Confirm
    const unscheduledCount =
      unscheduledSummary?.byCareReceiver
        .filter((item) => selectedReceivers.includes(item.careReceiver.id))
        .reduce((sum, item) => sum + item.missing, 0) || 0;

    if (
      !window.confirm(
        `Generate schedule for ${selectedReceivers.length} care receiver(s)?\n\n` +
          `This will attempt to schedule ${unscheduledCount} unscheduled appointments ` +
          `from ${moment(startDate).format("MMM D, YYYY")} to ${moment(endDate).format("MMM D, YYYY")}.`,
      )
    ) {
      return;
    }

    try {
      setGenerating(true);
      setResults(null);

      console.log("Generating schedule...");
      console.log("Care receivers:", selectedReceivers);
      console.log("Date range:", startDate, "to", endDate);

      const response = await api.post("/schedule/generate", {
        careReceiverIds: selectedReceivers,
        startDate: startDate,
        endDate: endDate,
      });

      if (response.data.success) {
        const summary = response.data.data.summary;

        setResults({
          success: true,
          scheduled: summary.totalScheduled || 0,
          failed: summary.totalFailed || 0,
          details: response.data.data.results || [],
        });

        toast.success(
          ` Scheduled ${summary.totalScheduled} appointments!\n` +
            (summary.totalFailed > 0
              ? ` ${summary.totalFailed} could not be scheduled`
              : ""),
          { autoClose: 5000 },
        );

        // Reload unscheduled summary
        setTimeout(() => {
          loadUnscheduledSummary();
        }, 1000);
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error(
        error.response?.data?.message || "Failed to generate schedule",
      );

      setResults({
        success: false,
        error: error.response?.data?.message || "Generation failed",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Calculate date range info
  const daysBetween = moment(endDate).diff(moment(startDate), "days") + 1;
  const isMaxRange = daysBetween >= 30;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/schedule")}
          className="btn-secondary flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schedule
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Generate Schedule
        </h1>
        <p className="text-gray-600">
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
            NEW: Check Unscheduled Button
            ======================================== */}
        <div className="flex justify-end">
          <button
            onClick={loadUnscheduledSummary}
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
                Check Unscheduled Appointments
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
          <h2 className="text-xl font-semibold mb-4">Generation Results</h2>

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

              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/schedule")}
                  className="btn-primary flex-1"
                >
                  View Schedule
                </button>
                <button
                  onClick={() => {
                    setResults(null);
                    setHasChecked(false);
                    setUnscheduledSummary(null);
                    setSelectedReceivers([]);
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
  );
}

export default GenerateSchedule;
