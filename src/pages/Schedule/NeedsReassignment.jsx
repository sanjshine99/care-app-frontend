// frontend/src/pages/Schedule/NeedsReassignment.jsx
// Shows appointments that need reassignment due to conflicts

import { useState } from "react";
import {
  AlertTriangle,
  User,
  Clock,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import moment from "moment";
import { toast } from "react-toastify";
import ManualScheduleModal from "./ManualScheduleModal";
import api from "../../services/api";
import { getSkillLabel } from "../../constants/skills";

function NeedsReassignment({ appointments, onReassignSuccess, loading }) {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  // Handle reassign button click
  const handleReassign = (appointment) => {
    setSelectedAppointment(appointment);
    setShowReassignModal(true);
  };

  // Handle cancel appointment
  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    setCancelling(appointmentId);
    try {
      await api.patch(`/schedule/appointments/${appointmentId}/status`, {
        status: "cancelled",
        cancellationReason: "Cancelled due to scheduling conflict",
      });

      toast.success("Appointment cancelled");
      if (onReassignSuccess) onReassignSuccess();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    } finally {
      setCancelling(null);
    }
  };

  // Handle successful reassignment
  const handleReassignSuccess = async () => {
    // First, cancel the old appointment
    if (selectedAppointment) {
      try {
        await api.patch(
          `/schedule/appointments/${selectedAppointment._id}/status`,
          {
            status: "cancelled",
            cancellationReason: "Reassigned to different care giver",
          },
        );
      } catch (error) {
        console.error("Error cancelling old appointment:", error);
      }
    }

    setShowReassignModal(false);
    setSelectedAppointment(null);
    toast.success(" Appointment reassigned successfully!");

    if (onReassignSuccess) onReassignSuccess();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-800">
          All Appointments Valid!
        </h3>
        <p className="text-gray-600">No appointments need reassignment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">
              {appointments.length} Appointment
              {appointments.length !== 1 ? "s" : ""} Need
              {appointments.length === 1 ? "s" : ""} Reassignment
            </h3>
            <p className="text-sm text-red-700 mt-1">
              These appointments have conflicts due to changes in availability
              or requirements. Please reassign or cancel them.
            </p>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {appointments.map((apt) => (
          <div
            key={apt._id}
            className="border-2 border-red-300 bg-red-50 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              {/* Appointment Details */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {apt.careReceiver?.name || "Unknown Care Receiver"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Assigned to: {apt.careGiver?.name || "Unknown Care Giver"}
                    </p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4" />
                    <span>{moment(apt.date).format("MMM D, YYYY")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-4 w-4" />
                    <span>
                      {apt.startTime} - {apt.endTime}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">Visit:</span> #
                    {apt.visitNumber}
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">Duration:</span>{" "}
                    {apt.duration} min
                  </div>
                </div>

                {/* Invalidation Reasons */}
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Conflicts Detected:
                  </p>
                  <div className="space-y-1">
                    {apt.invalidationReason?.split(";").map((reason, idx) => (
                      <p
                        key={idx}
                        className="text-sm text-red-700 flex items-start gap-2"
                      >
                        <span className="font-bold mt-0.5">•</span>
                        <span>{reason.trim()}</span>
                      </p>
                    ))}
                  </div>
                  {apt.invalidatedAt && (
                    <p className="text-xs text-red-600 mt-2">
                      Detected on:{" "}
                      {moment(apt.invalidatedAt).format("MMM D, YYYY h:mm A")}
                    </p>
                  )}
                </div>

                {/* Requirements */}
                {apt.requirements && apt.requirements.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">
                      Required Skills:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {apt.requirements.map((skill, i) => (
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

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => handleReassign(apt)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reassign
                </button>
                <button
                  onClick={() => handleCancel(apt._id)}
                  disabled={cancelling === apt._id}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  {cancelling === apt._id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reassign Modal */}
      {showReassignModal && selectedAppointment && (
        <ManualScheduleModal
          careReceiver={{
            id: selectedAppointment.careReceiver._id,
            name: selectedAppointment.careReceiver.name,
            genderPreference: selectedAppointment.careReceiver.genderPreference,
            address: selectedAppointment.careReceiver.address,
            coordinates: selectedAppointment.careReceiver.coordinates,
          }}
          visit={{
            visitNumber: selectedAppointment.visitNumber,
            preferredTime: selectedAppointment.startTime,
            duration: selectedAppointment.duration,
            requirements: selectedAppointment.requirements || [],
            doubleHanded: selectedAppointment.doubleHanded || false,
            priority: selectedAppointment.priority || 3,
            notes: selectedAppointment.notes || "",
          }}
          date={selectedAppointment.date}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedAppointment(null);
          }}
          onSuccess={handleReassignSuccess}
        />
      )}
    </div>
  );
}

export default NeedsReassignment;
