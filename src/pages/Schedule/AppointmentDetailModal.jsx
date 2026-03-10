import { memo } from "react";
import moment from "moment";
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Users,
} from "lucide-react";

function AppointmentDetailModal({ event, onClose, onStatusUpdate, onDelete }) {
  if (!event) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Appointment Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {moment(event.date).format("dddd, MMMM D, YYYY")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-5">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              event.status === "scheduled"
                ? "bg-blue-100 text-blue-800"
                : event.status === "in_progress"
                  ? "bg-amber-100 text-amber-800"
                  : event.status === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : event.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : event.status === "missed"
                        ? "bg-red-200 text-red-900"
                        : "bg-gray-100 text-gray-800"
            }`}
          >
            {event.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Info Grid */}
        <div className="space-y-4">
          {/* Schedule */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {event.startTime} - {event.endTime}
              </p>
              <p className="text-gray-500">
                {event.duration} minutes &middot; Visit {event.visitNumber}
              </p>
            </div>
          </div>

          {/* Care Receiver */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <User className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {event.careReceiver?.name}
              </p>
              {event.careReceiver?.phone && (
                <p className="text-gray-500 flex items-center gap-1.5 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {event.careReceiver.phone}
                </p>
              )}
              {event.careReceiver?.address && (
                <p className="text-gray-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.careReceiver.address.full ||
                    event.careReceiver.address.street}
                </p>
              )}
            </div>
          </div>

          {/* Care Giver(s) */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
            <User className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm w-full">
              <p className="font-medium text-gray-900">
                {event.careGiver?.name || "Not assigned"}
              </p>
              {event.careGiver && (
                <p className="text-gray-500 mt-0.5">
                  {event.careGiver.email} &middot; {event.careGiver.phone}
                </p>
              )}

              {event.doubleHanded && event.secondaryCareGiver && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                    Secondary Care Giver
                  </p>
                  <p className="font-medium text-gray-900">
                    {event.secondaryCareGiver.name}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {event.secondaryCareGiver.email} &middot;{" "}
                    {event.secondaryCareGiver.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Double Handed Badge */}
          {event.doubleHanded && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-50 border border-pink-200">
              <Users className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-medium text-pink-800">
                Double-Handed Care Required
              </span>
            </div>
          )}

          {/* Requirements */}
          {event.requirements && event.requirements.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Requirements
              </p>
              <div className="flex flex-wrap gap-1.5">
                {event.requirements.map((req, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200"
                  >
                    {req.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Notes
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                {event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-5 mt-5 border-t border-gray-100">
          {event.status === "scheduled" && (
            <>
              <button
                onClick={() => onStatusUpdate("in_progress")}
                className="btn-secondary flex-1 text-sm"
              >
                Start
              </button>
              <button
                onClick={() => onStatusUpdate("completed")}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </button>
            </>
          )}

          {event.status === "in_progress" && (
            <button
              onClick={() => onStatusUpdate("completed")}
              className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Complete
            </button>
          )}

          <button
            onClick={() => onStatusUpdate("cancelled")}
            className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(AppointmentDetailModal);
