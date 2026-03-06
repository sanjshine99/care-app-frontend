// frontend/src/pages/Schedule/UnscheduledList.jsx
// FIXED - Uses correct endpoints and opens ManualScheduleModal

import { memo, useState, useMemo } from "react";
import { AlertTriangle, User, Clock, X, RefreshCw, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";
import api from "../../services/api";
import { toast } from "react-toastify";
import { getSkillLabel } from "../../constants/skills";
import ManualScheduleModal from "./ManualScheduleModal";

function formatTimeToHHMM(timeStr) {
  if (!timeStr) return timeStr;
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getAnalyzingKey(detail, careReceiver) {
  if (!detail || !careReceiver?.id) return null;
  const dateStr =
    typeof detail.date === "string"
      ? detail.date
      : moment(detail.date).format("YYYY-MM-DD");
  return `${careReceiver.id}-${dateStr}-${detail.visitNumber}`;
}

function UnscheduledList({ unscheduled, schedulingInProgress = [], onScheduleSuccess, loading }) {
  const inProgressSet = useMemo(
    () => new Set((schedulingInProgress || []).map((p) => String(p.careReceiverId))),
    [schedulingInProgress]
  );
  const [expandedIds, setExpandedIds] = useState(() =>
    new Set((unscheduled || []).map((g) => g.careReceiver?.id ?? g.careReceiver?._id))
  );
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManualScheduleModal, setShowManualScheduleModal] = useState(false);
  const [analyzingKey, setAnalyzingKey] = useState(null);

  const refreshAnalysis = async () => {
    if (!selectedAppointment?.careReceiver) return;
    const key = getAnalyzingKey(selectedAppointment, selectedAppointment.careReceiver);
    if (!key) return;
    try {
      setAnalyzingKey(key);
      const dateStr =
        typeof selectedAppointment.date === "string"
          ? selectedAppointment.date
          : moment(selectedAppointment.date).format("YYYY-MM-DD");
      const payload = {
        careReceiver: selectedAppointment.careReceiver.id,
        visit: {
          visitNumber: selectedAppointment.visitNumber,
          preferredTime: formatTimeToHHMM(selectedAppointment.preferredTime),
          duration: selectedAppointment.duration,
          requirements: selectedAppointment.requirements || [],
          doubleHanded: selectedAppointment.doubleHanded || false,
          priority: selectedAppointment.priority || 3,
          notes: selectedAppointment.notes || "",
        },
        date: dateStr,
      };
      const response = await api.post("/schedule/analyze-unscheduled", payload);
      setSelectedAppointment((prev) => ({
        ...prev,
        analysisResults: response.data.data,
      }));
      toast.success("Analysis refreshed");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || "Failed to refresh analysis";
      toast.error(errorMessage);
    } finally {
      setAnalyzingKey(null);
    }
  };

  const handleViewDetails = async (detail, careReceiver) => {
    const key = getAnalyzingKey(detail, careReceiver);
    if (!key) return;
    try {
      setAnalyzingKey(key);

      const payload = {
        careReceiver: careReceiver.id,
        visit: {
          visitNumber: detail.visitNumber,
          preferredTime: formatTimeToHHMM(detail.preferredTime),
          duration: detail.duration,
          requirements: detail.requirements || [],
          doubleHanded: detail.doubleHanded || false,
          priority: detail.priority || 3,
          notes: detail.notes || "",
        },
        date: detail.date,
      };

      const response = await api.post("/schedule/analyze-unscheduled", payload);

      setSelectedAppointment({
        ...detail,
        careReceiver: careReceiver,
        analysisResults: response.data.data,
      });
      setShowDetailsModal(true);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        "Failed to load detailed analysis";
      toast.error(errorMessage);
    } finally {
      setAnalyzingKey(null);
    }
  };

  // Open manual schedule modal
  const handleAttemptManualSchedule = () => {
    if (!selectedAppointment) return;

    // Close analysis modal
    setShowDetailsModal(false);

    // Open manual schedule modal
    setShowManualScheduleModal(true);
  };

  // Handle successful manual scheduling
  const handleManualScheduleSuccess = () => {
    setShowManualScheduleModal(false);
    setSelectedAppointment(null);
    toast.success(" Appointment scheduled successfully!");
    if (onScheduleSuccess) onScheduleSuccess();
  };

  return (
    <div className="space-y-3">
      {!unscheduled || unscheduled.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No unscheduled appointments</p>
        </div>
      ) : (
        unscheduled.map((group) => {
          const crId = group.careReceiver?.id ?? group.careReceiver?._id;
          const isSchedulingInProgress = crId && inProgressSet.has(String(crId));

          const isExpanded = expandedIds.has(crId);

          return (
          <div key={crId} className="space-y-2">
            {/* Care Receiver Header - Accordion Toggle */}
            <button
              type="button"
              onClick={() => toggleExpand(crId)}
              className="w-full font-semibold text-lg text-gray-800 flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
              )}
              <User className="h-5 w-5 text-primary-600 shrink-0" />
              <span className="text-left">{group.careReceiver?.name || "Unknown Care Receiver"}</span>
              {isSchedulingInProgress ? (
                <span className="text-sm text-blue-600 font-normal flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling in progress…
                </span>
              ) : (
                <span className="text-sm text-gray-500 font-normal">
                  ({group.missing} unscheduled visit
                  {group.missing !== 1 ? "s" : ""})
                </span>
              )}
            </button>

            {isExpanded && (
            <>
            {isSchedulingInProgress ? (
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 ml-8 text-sm text-blue-800">
                Appointments for this care receiver are being generated. They will appear in the calendar when ready.
              </div>
            ) : (
            <>
            {/* Details */}
            {group.details &&
              group.details.map((detail) => {
                const rowKey = getAnalyzingKey(detail, group.careReceiver);
                const isAnalyzing = analyzingKey === rowKey;
                return (
                  <div
                    key={`${group.careReceiver?.id || group.careReceiver?._id}-${detail.date}-${detail.visitNumber}`}
                    className="border border-amber-300 bg-amber-50 rounded-lg p-4 ml-8"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="space-y-1 text-sm text-gray-700">
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {moment(detail.date).format("YYYY-MM-DD")} - Visit{" "}
                            {detail.visitNumber}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Time: {detail.preferredTime} ({detail.duration}{" "}
                            minutes)
                          </p>
                          {detail.reason && (
                            <p className="text-amber-700 font-medium mt-2">
                              {detail.reason}
                            </p>
                          )}
                        </div>

                        {detail.requirements &&
                          detail.requirements.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 mb-1">
                                Required Skills:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {detail.requirements.map((skill, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
                                  >
                                    {getSkillLabel(skill)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() =>
                            handleViewDetails(detail, group.careReceiver)
                          }
                          disabled={isAnalyzing}
                          className="btn-secondary text-xs flex items-center gap-2"
                        >
                          {isAnalyzing ? "Loading..." : "Full Analysis"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
            )}
            </>
            )}
          </div>
        );
        })
      )}

      {/* Analysis Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">
                Unscheduled Appointment Analysis
              </h2>
              <div className="flex items-center gap-2">
                {(() => {
                  const selectedKey = getAnalyzingKey(
                    selectedAppointment,
                    selectedAppointment?.careReceiver,
                  );
                  const isRefreshing = analyzingKey === selectedKey;
                  return (
                    <button
                      onClick={refreshAnalysis}
                      disabled={isRefreshing}
                      className="btn-secondary text-sm flex items-center gap-2"
                      title="Refresh analysis with latest data"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                      />
                      Refresh analysis
                    </button>
                  );
                })()}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Appointment Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Care Receiver:</p>
                  <p className="font-medium">
                    {selectedAppointment.careReceiver?.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Date & Time:</p>
                  <p className="font-medium">
                    {moment(selectedAppointment.date).format("MMM D, YYYY")} at{" "}
                    {selectedAppointment.preferredTime}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Duration:</p>
                  <p className="font-medium">
                    {selectedAppointment.duration} minutes
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Visit Number:</p>
                  <p className="font-medium">
                    Visit {selectedAppointment.visitNumber}
                  </p>
                </div>
              </div>

              {selectedAppointment.requirements &&
                selectedAppointment.requirements.length > 0 && (
                  <div className="mt-3">
                    <p className="text-gray-600 text-sm mb-1">
                      Required Skills:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAppointment.requirements.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                        >
                          {getSkillLabel(skill)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Care Giver Analysis */}
            <div>
              <h3 className="font-semibold text-lg mb-4">
                Why Each Care Giver Couldn't Be Assigned:
              </h3>

              {selectedAppointment.analysisResults?.careGiverAnalysis ? (
                <div className="space-y-3">
                  {selectedAppointment.analysisResults.careGiverAnalysis.map(
                    (cg, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          cg.canAssign
                            ? "border-green-300 bg-green-50"
                            : "border-red-300 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {cg.name}
                            </h4>
                            <p className="text-sm text-gray-600">{cg.email}</p>
                          </div>
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded ${
                              cg.canAssign
                                ? "bg-green-200 text-green-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {cg.canAssign ? (
                              <><Check className="h-3.5 w-3.5 inline mr-1" />Can Assign</>
                            ) : (
                              <><X className="h-3.5 w-3.5 inline mr-1" />Cannot Assign</>
                            )}
                          </span>
                        </div>

                        {cg.rejectionReasons &&
                          cg.rejectionReasons.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {cg.rejectionReasons.map((reason, i) => (
                                <p
                                  key={i}
                                  className="text-sm text-red-700 flex items-start gap-2"
                                >
                                  <span className="font-bold">•</span>
                                  <span>{reason}</span>
                                </p>
                              ))}
                            </div>
                          )}

                        {cg.matchScore !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                Match Score:
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                                <div
                                  className={`h-2 rounded-full ${
                                    cg.matchScore >= 80
                                      ? "bg-green-500"
                                      : cg.matchScore >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${cg.matchScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {cg.matchScore}%
                              </span>
                            </div>
                          </div>
                        )}

                        {cg.distance !== undefined && cg.distance !== null && (
                          <p className="text-sm text-gray-600 mt-2">
                            Distance: {cg.distance.toFixed(2)} km
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p> All care givers are unavailable</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleAttemptManualSchedule}
                className="btn-primary"
              >
                Attempt Manual Schedule
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Schedule Modal */}
      {showManualScheduleModal && selectedAppointment && (
        <ManualScheduleModal
          careReceiver={{
            id: selectedAppointment.careReceiver.id,
            name: selectedAppointment.careReceiver.name,
            genderPreference: selectedAppointment.careReceiver.genderPreference,
            address: selectedAppointment.careReceiver.address,
            coordinates: selectedAppointment.careReceiver.coordinates,
          }}
          visit={{
            visitNumber: selectedAppointment.visitNumber,
            preferredTime: formatTimeToHHMM(selectedAppointment.preferredTime),
            duration: selectedAppointment.duration,
            requirements: selectedAppointment.requirements || [],
            doubleHanded: selectedAppointment.doubleHanded || false,
            priority: selectedAppointment.priority || 3,
            notes: selectedAppointment.notes || "",
          }}
          date={
            typeof selectedAppointment.date === "string"
              ? selectedAppointment.date
              : moment(selectedAppointment.date).format("YYYY-MM-DD")
          }
          onClose={() => setShowManualScheduleModal(false)}
          onSuccess={handleManualScheduleSuccess}
        />
      )}
    </div>
  );
}

export default memo(UnscheduledList);
