// frontend/src/pages/Schedule/GenerateSchedule.jsx
// FIXED - Properly handles visit object in failed appointments display

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

function GenerateSchedule() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [careReceivers, setCareReceivers] = useState([]);
  const [selectedCareReceivers, setSelectedCareReceivers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadCareReceivers();

    // Set default dates (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(nextWeek.toISOString().split("T")[0]);
  }, []);

  const loadCareReceivers = async () => {
    try {
      const response = await api.get("/carereceivers", {
        params: { limit: 100, isActive: true },
      });

      if (response.data.success) {
        const crs = response.data.data.careReceivers || [];
        // Only show care receivers with daily visits
        const withVisits = crs.filter(
          (cr) => cr.dailyVisits && cr.dailyVisits.length > 0
        );
        setCareReceivers(withVisits);
      }
    } catch (error) {
      console.error("Error loading care receivers:", error);
      toast.error("Failed to load care receivers");
    }
  };

  const handleSelectAll = () => {
    if (selectedCareReceivers.length === careReceivers.length) {
      setSelectedCareReceivers([]);
    } else {
      setSelectedCareReceivers(careReceivers.map((cr) => cr._id));
    }
  };

  const handleToggleCareReceiver = (id) => {
    if (selectedCareReceivers.includes(id)) {
      setSelectedCareReceivers(
        selectedCareReceivers.filter((crId) => crId !== id)
      );
    } else {
      setSelectedCareReceivers([...selectedCareReceivers, id]);
    }
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (selectedCareReceivers.length === 0) {
      toast.error("Please select at least one care receiver");
      return;
    }

    try {
      setLoading(true);
      setResults(null);

      const response = await api.post("/schedule/generate", {
        careReceiverIds: selectedCareReceivers,
        startDate,
        endDate,
      });

      if (response.data.success) {
        setResults(response.data.data);
        toast.success(
          response.data.message || "Schedule generated successfully"
        );
      }
    } catch (error) {
      console.error("Schedule generation error:", error);
      const message =
        error.response?.data?.error?.message || "Failed to generate schedule";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/schedule")}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Calendar
        </button>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary-600" />
          Generate Schedule
        </h1>
        <p className="text-gray-600 mt-2">
          Automatically schedule care visits for selected care receivers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h2 className="text-xl font-bold mb-4">Date Range</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                  min={startDate}
                />
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-sm text-gray-600 mt-2">
                Scheduling for {calculateDays()} days
              </p>
            )}
          </div>

          {/* Care Receivers Selection */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Select Care Receivers</h2>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {selectedCareReceivers.length === careReceivers.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {careReceivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No care receivers with daily visits found</p>
                <button
                  onClick={() => navigate("/carereceivers/new")}
                  className="text-primary-600 hover:underline mt-2"
                >
                  Add a care receiver
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {careReceivers.map((cr) => (
                  <label
                    key={cr._id}
                    className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCareReceivers.includes(cr._id)}
                      onChange={() => handleToggleCareReceiver(cr._id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{cr.name}</p>
                      <p className="text-sm text-gray-600">
                        {cr.dailyVisits.length} daily visit
                        {cr.dailyVisits.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {cr.dailyVisits.map((visit) => (
                          <span
                            key={visit.visitNumber}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                          >
                            Visit {visit.visitNumber}: {visit.preferredTime} (
                            {visit.duration}min)
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary & Actions */}
        <div className="lg:col-span-1">
          <div className="card sticky top-8">
            <h2 className="text-xl font-bold mb-4">Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Care Receivers:</span>
                <span className="font-semibold">
                  {selectedCareReceivers.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days:</span>
                <span className="font-semibold">{calculateDays()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Visits:</span>
                <span className="font-semibold">
                  {selectedCareReceivers.length > 0
                    ? careReceivers
                        .filter((cr) => selectedCareReceivers.includes(cr._id))
                        .reduce((sum, cr) => sum + cr.dailyVisits.length, 0) *
                      calculateDays()
                    : 0}
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || selectedCareReceivers.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
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

            {results && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Results</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>{results.summary.totalScheduled} scheduled</span>
                  </div>
                  {results.summary.totalFailed > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span>{results.summary.totalFailed} failed</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate("/schedule")}
                  className="btn-secondary w-full mt-4"
                >
                  View Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      {results && (
        <div className="card mt-6">
          <h2 className="text-xl font-bold mb-4">Detailed Results</h2>

          <div className="space-y-4">
            {results.results.map((result, index) => {
              const careReceiver = careReceivers.find(
                (cr) => cr._id === result.careReceiverId
              );

              return (
                <div key={index} className="border rounded p-4">
                  <h3 className="font-semibold mb-2">
                    {careReceiver?.name || "Unknown"}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{result.scheduled?.length || 0} scheduled</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>{result.failed?.length || 0} failed</span>
                    </div>
                  </div>

                  {result.failed && result.failed.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-600 mb-2">
                        Failed Appointments:
                      </p>
                      <div className="space-y-1">
                        {result.failed.slice(0, 5).map((failure, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            {/* FIXED: Use failure.visit.visitNumber instead of failure.visit */}
                            {failure.date} - Visit{" "}
                            {failure.visit?.visitNumber || failure.visit}:{" "}
                            {failure.reason}
                          </p>
                        ))}
                        {result.failed.length > 5 && (
                          <p className="text-xs text-gray-500 italic">
                            ... and {result.failed.length - 5} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerateSchedule;
