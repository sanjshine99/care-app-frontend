// frontend/src/pages/Schedule/UnscheduledList.jsx
// FIXED - Uses correct endpoints and opens ManualScheduleModal

import { useState } from "react";
import { AlertTriangle, User, Clock, X } from "lucide-react";
import moment from "moment";
import api from "../../services/api";
import { toast } from "react-toastify";
import ManualScheduleModal from "./ManualScheduleModal";

function UnscheduledList({ unscheduled, onScheduleSuccess, loading }) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManualScheduleModal, setShowManualScheduleModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // View full details with correct endpoint
  const handleViewDetails = async (detail, careReceiver) => {
    try {
      setAnalyzing(true);

      console.log("\n=== Analyzing Unscheduled Appointment ===");

      // Build payload
      const payload = {
        careReceiver: careReceiver.id,
        visit: {
          visitNumber: detail.visitNumber,
          preferredTime: detail.preferredTime,
          duration: detail.duration,
          requirements: detail.requirements || [],
          doubleHanded: detail.doubleHanded || false,
          priority: detail.priority || 3,
          notes: detail.notes || "",
        },
        date: detail.date,
      };

      console.log("Payload:", payload);

      // Call analyze endpoint
      const response = await api.post("/schedule/analyze-unscheduled", payload);

      console.log("Analysis response:", response.data);

      setSelectedAppointment({
        ...detail,
        careReceiver: careReceiver,
        analysisResults: response.data.data,
      });
      setShowDetailsModal(true);
      setAnalyzing(false);
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage =
        error.response?.data?.error?.message ||
        "Failed to load detailed analysis";
      toast.error(errorMessage);
      setAnalyzing(false);
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
    toast.success("✅ Appointment scheduled successfully!");
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
        unscheduled.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            {/* Care Receiver Header */}
            <div className="font-semibold text-lg text-gray-800 flex items-center gap-2">
              <User className="h-5 w-5 text-primary-600" />
              {group.careReceiver?.name || "Unknown Care Receiver"}
              <span className="text-sm text-gray-500 font-normal">
                ({group.missing} unscheduled visit
                {group.missing !== 1 ? "s" : ""})
              </span>
            </div>

            {/* Details */}
            {group.details &&
              group.details.map((detail, detailIndex) => (
                <div
                  key={`${groupIndex}-${detailIndex}`}
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
                            ⚠️ {detail.reason}
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
                                  {skill.replace(/_/g, " ")}
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
                        disabled={analyzing}
                        className="btn-secondary text-xs flex items-center gap-2"
                      >
                        {analyzing ? "Loading..." : "Full Analysis"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))
      )}

      {/* Analysis Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">
                Unscheduled Appointment Analysis
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
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
                          {skill.replace(/_/g, " ")}
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
                            {cg.canAssign ? "✓ Can Assign" : "✗ Cannot Assign"}
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
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>⚠️ All care givers are unavailable</p>
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
            preferredTime: selectedAppointment.preferredTime,
            duration: selectedAppointment.duration,
            requirements: selectedAppointment.requirements || [],
            doubleHanded: selectedAppointment.doubleHanded || false,
            priority: selectedAppointment.priority || 3,
            notes: selectedAppointment.notes || "",
          }}
          date={selectedAppointment.date}
          onClose={() => setShowManualScheduleModal(false)}
          onSuccess={handleManualScheduleSuccess}
        />
      )}
    </div>
  );
}

export default UnscheduledList;
