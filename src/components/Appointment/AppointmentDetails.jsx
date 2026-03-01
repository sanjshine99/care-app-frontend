// frontend/src/components/AppointmentDetails.jsx
// FIXED - Correct API endpoints (removed double /api/ prefix)

import { useState, useEffect } from "react";
import { X, User, Phone, MapPin, Clock, CheckCircle, Star } from "lucide-react";
import moment from "moment";
import api from "../services/api";
import { toast } from "react-toastify";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

function AppointmentDetails({
  appointment,
  onClose,
  onStatusUpdate,
  onDelete,
}) {
  const confirmDialog = useConfirmDialog();
  const [assignmentReasoning, setAssignmentReasoning] = useState(null);
  const [loadingReasoning, setLoadingReasoning] = useState(true);

  useEffect(() => {
    if (appointment && appointment._id) {
      fetchAssignmentReasoning();
    }
  }, [appointment]);

  const fetchAssignmentReasoning = async () => {
    try {
      setLoadingReasoning(true);

      console.log("Fetching assignment reasoning for:", appointment._id);

      // FIXED: Removed /api/ prefix
      const response = await api.get(
        `/schedule/appointments/${appointment._id}/reasoning`
      );

      console.log("Assignment reasoning response:", response.data);
      setAssignmentReasoning(response.data.data);
      setLoadingReasoning(false);
    } catch (error) {
      console.error("Error fetching assignment reasoning:", error);
      console.error("Error response:", error.response);
      setLoadingReasoning(false);
      // Don't show error toast - reasoning is optional
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      // FIXED: Removed /api/ prefix
      await api.patch(`/schedule/appointments/${appointment._id}/status`, {
        status,
      });
      toast.success("Appointment status updated");
      onStatusUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog.confirm({
      title: "Delete appointment?",
      message: "Are you sure you want to delete this appointment?",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      // FIXED: Removed /api/ prefix
      await api.delete(`/schedule/appointments/${appointment._id}`);
      toast.success("Appointment deleted");
      onDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete appointment"
      );
    }
  };

  if (!appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">Appointment Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Care Receiver Info */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Care Receiver
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-lg">
              {appointment.careReceiver?.name}
            </p>
            {appointment.careReceiver?.phone && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {appointment.careReceiver.phone}
              </p>
            )}
            {appointment.careReceiver?.address && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {appointment.careReceiver.address.full ||
                  appointment.careReceiver.address.street}
              </p>
            )}
          </div>
        </div>

        {/* Care Giver Info + Assignment Reasoning */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Care Giver{appointment.doubleHanded ? "s" : ""}
          </h3>
          <div className="space-y-3">
            {/* Primary Care Giver */}
            <div className="bg-green-50 rounded-lg p-4">
              <p className="font-medium">
                {appointment.careGiver?.name || "Not assigned"}
              </p>
              {appointment.careGiver && (
                <>
                  <p className="text-sm text-gray-600">
                    {appointment.careGiver.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    {appointment.careGiver.phone}
                  </p>

                  {/* Assignment Reasoning */}
                  {loadingReasoning ? (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                        Loading assignment reasoning...
                      </div>
                    </div>
                  ) : assignmentReasoning && assignmentReasoning.reasons ? (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Why This Care Giver Was Assigned:
                      </p>
                      <div className="space-y-1">
                        {assignmentReasoning.reasons.map((reason, index) => (
                          <p
                            key={index}
                            className="text-xs text-gray-700 flex items-start gap-2"
                          >
                            <span className="font-bold mt-0.5">•</span>
                            <span>{reason}</span>
                          </p>
                        ))}
                      </div>
                      {assignmentReasoning.matchScore !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-600">
                            Match Score:
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                            <div
                              className={`h-2 rounded-full ${
                                assignmentReasoning.matchScore >= 80
                                  ? "bg-green-500"
                                  : assignmentReasoning.matchScore >= 60
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${assignmentReasoning.matchScore}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {assignmentReasoning.matchScore}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-gray-600 italic">
                        Assignment reasoning not available
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Secondary Care Giver (if double-handed) */}
            {appointment.doubleHanded && appointment.secondaryCareGiver && (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">
                  Secondary Care Giver
                </p>
                <p className="font-medium">
                  {appointment.secondaryCareGiver.name}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.secondaryCareGiver.email}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.secondaryCareGiver.phone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Schedule
          </h3>
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {moment(appointment.date).format("dddd, MMMM D, YYYY")}
            </p>
            <p>
              <span className="font-medium">Time:</span> {appointment.startTime}{" "}
              - {appointment.endTime}
            </p>
            <p>
              <span className="font-medium">Duration:</span>{" "}
              {appointment.duration} minutes
            </p>
            <p>
              <span className="font-medium">Visit Number:</span>{" "}
              {appointment.visitNumber}
            </p>
          </div>
        </div>

        {/* Requirements */}
        {appointment.requirements && appointment.requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Requirements</h3>
            <div className="flex flex-wrap gap-2">
              {appointment.requirements.map((req, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                >
                  {req.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Double-Handed Indicator */}
        {appointment.doubleHanded && (
          <div className="mb-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
              <p className="text-pink-800 font-medium">
                🤝 Double-Handed Care Required
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {appointment.notes && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Notes</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Status */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-3">Status</h3>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              appointment.status === "scheduled"
                ? "bg-blue-100 text-blue-800"
                : appointment.status === "in_progress"
                  ? "bg-orange-100 text-orange-800"
                  : appointment.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : appointment.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : appointment.status === "missed"
                        ? "bg-red-200 text-red-900"
                        : "bg-gray-100 text-gray-800"
            }`}
          >
            {appointment.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {appointment.status === "scheduled" && (
            <>
              <button
                onClick={() => handleStatusUpdate("in_progress")}
                className="btn-secondary flex-1"
              >
                Start
              </button>
              <button
                onClick={() => handleStatusUpdate("completed")}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Complete
              </button>
            </>
          )}

          {appointment.status === "in_progress" && (
            <button
              onClick={() => handleStatusUpdate("completed")}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Complete
            </button>
          )}

          <button
            onClick={() => handleStatusUpdate("cancelled")}
            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentDetails;
