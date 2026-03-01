// frontend/src/pages/Schedule/CalendarView.jsx
// FIXED - Defaults to CURRENT MONTH instead of current week
// Shows all appointments including old ones

import { useState, useEffect } from "react";
import moment from "moment";
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Calendar as CalendarIcon,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

function CalendarView({
  appointments,
  startDate,
  endDate,
  onRefresh,
  loading,
}) {
  const confirmDialog = useConfirmDialog();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [allCareGivers, setAllCareGivers] = useState([]);
  const [loadingCareGivers, setLoadingCareGivers] = useState(true);

  // Fetch ALL care givers from API
  useEffect(() => {
    const fetchAllCareGivers = async () => {
      try {
        setLoadingCareGivers(true);
        const response = await api.get("/caregivers?limit=100&isActive=true");

        if (response.data.success) {
          const careGivers = response.data.data.careGivers.map((cg) => ({
            id: cg._id,
            name: cg.name,
            email: cg.email,
            phone: cg.phone,
          }));

          setAllCareGivers(careGivers);
          console.log(` Loaded ${careGivers.length} care givers for calendar`);
        }
      } catch (error) {
        console.error(" Failed to load care givers:", error);
        toast.error("Failed to load care givers");
      } finally {
        setLoadingCareGivers(false);
      }
    };

    fetchAllCareGivers();
  }, []);

  const getDatesInRange = () => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const start = moment(startDate);
    const end = moment(endDate);

    while (start.isSameOrBefore(end)) {
      dates.push(start.format("YYYY-MM-DD"));
      start.add(1, "day");
    }

    return dates;
  };

  // Get appointments where CG is PRIMARY OR SECONDARY
  const getAppointmentsForCell = (careGiverId, date) => {
    return appointments
      .filter((apt) => {
        const isPrimary = apt.careGiver && apt.careGiver._id === careGiverId;
        const isSecondary =
          apt.secondaryCareGiver && apt.secondaryCareGiver._id === careGiverId;
        const isRelevant = isPrimary || isSecondary;
        const dateMatches = moment(apt.date).format("YYYY-MM-DD") === date;
        return isRelevant && dateMatches;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Check if care giver is primary or secondary
  const getCareGiverRole = (appointment, careGiverId) => {
    if (appointment.careGiver && appointment.careGiver._id === careGiverId) {
      return "primary";
    }
    if (
      appointment.secondaryCareGiver &&
      appointment.secondaryCareGiver._id === careGiverId
    ) {
      return "secondary";
    }
    return null;
  };

  const handleStatusUpdate = async (status) => {
    try {
      await api.patch(`/schedule/appointments/${selectedEvent._id}/status`, {
        status,
      });

      toast.success("Appointment status updated");
      setShowModal(false);
      onRefresh();
    } catch (error) {
      toast.error("Failed to update status");
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
      await api.delete(`/schedule/appointments/${selectedEvent._id}`);
      toast.success("Appointment deleted");
      setShowModal(false);
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete appointment");
    }
  };

  const dates = getDatesInRange();
  const careGivers = allCareGivers;

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <div className="card overflow-x-auto">
        {loading || loadingCareGivers ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">
              Loading {loadingCareGivers ? "care givers" : "appointments"}...
            </span>
          </div>
        ) : careGivers.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">
              No Care Givers Found
            </h3>
            <p className="text-gray-600">
              Please add care givers to the system first.
            </p>
          </div>
        ) : (
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              {/* Header Row - Dates */}
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-3 text-left font-semibold sticky left-0 z-10 min-w-[200px]">
                    Care Giver ({careGivers.length})
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date}
                      className="border border-gray-300 bg-gray-100 p-3 text-center font-semibold min-w-[150px]"
                    >
                      <div className="text-sm">
                        {moment(date).format("ddd")}
                      </div>
                      <div className="text-lg font-bold">
                        {moment(date).format("MMM D")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body - Care Givers and Appointments */}
              <tbody>
                {careGivers.map((careGiver) => (
                  <tr key={careGiver.id} className="hover:bg-gray-50">
                    {/* Care Giver Name Column */}
                    <td className="border border-gray-300 p-3 bg-white sticky left-0 z-10">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {careGiver.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {careGiver.email}
                        </p>
                      </div>
                    </td>

                    {/* Appointment Cells */}
                    {dates.map((date) => {
                      const cellAppointments = getAppointmentsForCell(
                        careGiver.id,
                        date,
                      );

                      return (
                        <td
                          key={date}
                          className={`border border-gray-300 p-2 align-top ${
                            moment(date).isSame(moment(), "day")
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          {cellAppointments.length > 0 ? (
                            <div className="space-y-1">
                              {cellAppointments.map((apt) => {
                                const role = getCareGiverRole(
                                  apt,
                                  careGiver.id,
                                );
                                const isPrimary = role === "primary";
                                const isSecondary = role === "secondary";

                                return (
                                  <div
                                    key={apt._id}
                                    onClick={() => {
                                      setSelectedEvent(apt);
                                      setShowModal(true);
                                    }}
                                    className={`p-2 rounded cursor-pointer text-xs hover:shadow-md transition-shadow ${
                                      isPrimary
                                        ? apt.status === "scheduled"
                                          ? "bg-blue-500 text-white border-l-4 border-blue-700"
                                          : apt.status === "in_progress"
                                            ? "bg-orange-500 text-white border-l-4 border-orange-700"
                                            : apt.status === "completed"
                                              ? "bg-green-500 text-white border-l-4 border-green-700"
                                              : apt.status === "cancelled"
                                                ? "bg-red-500 text-white border-l-4 border-red-700"
                                                : "bg-gray-500 text-white border-l-4 border-gray-700"
                                        : isSecondary
                                          ? apt.status === "scheduled"
                                            ? "bg-blue-200 text-blue-900 border-2 border-dashed border-blue-500"
                                            : apt.status === "in_progress"
                                              ? "bg-orange-200 text-orange-900 border-2 border-dashed border-orange-500"
                                              : apt.status === "completed"
                                                ? "bg-green-200 text-green-900 border-2 border-dashed border-green-500"
                                                : apt.status === "cancelled"
                                                  ? "bg-red-200 text-red-900 border-2 border-dashed border-red-500"
                                                  : "bg-gray-200 text-gray-900 border-2 border-dashed border-gray-500"
                                          : "bg-gray-100 border-l-4 border-gray-500"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 mb-1">
                                      {apt.doubleHanded && (
                                        <Users className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      <p className="font-semibold">
                                        {apt.startTime}
                                      </p>
                                    </div>
                                    <p className="truncate">
                                      {apt.careReceiver?.name || "Unknown"}
                                    </p>

                                    {isSecondary && (
                                      <p className="text-[10px] mt-1 opacity-75 font-medium">
                                        2nd CG
                                      </p>
                                    )}

                                    {apt.doubleHanded && (
                                      <p className="text-[10px] mt-1 opacity-75 truncate">
                                        {isPrimary && apt.secondaryCareGiver
                                          ? `+ ${apt.secondaryCareGiver.name}`
                                          : isSecondary && apt.careGiver
                                            ? `+ ${apt.careGiver.name}`
                                            : ""}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 text-xs py-4">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Legend:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span>Primary (Scheduled)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-200 border-2 border-dashed border-blue-500"></div>
                  <span>Secondary (Scheduled)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Cancelled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span>Double-Handed Care</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal - Same as before */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Appointment Details</h2>
              <button
                onClick={() => setShowModal(false)}
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
                  {selectedEvent.careReceiver?.name}
                </p>
                {selectedEvent.careReceiver?.phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {selectedEvent.careReceiver.phone}
                  </p>
                )}
                {selectedEvent.careReceiver?.address && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.careReceiver.address.full ||
                      selectedEvent.careReceiver.address.street}
                  </p>
                )}
              </div>
            </div>

            {/* Care Giver Info */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Care Giver{selectedEvent.doubleHanded ? "s" : ""}
              </h3>
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-medium">
                    {selectedEvent.careGiver?.name || "Not assigned"}
                  </p>
                  {selectedEvent.careGiver && (
                    <>
                      <p className="text-sm text-gray-600">
                        {selectedEvent.careGiver.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedEvent.careGiver.phone}
                      </p>
                    </>
                  )}
                </div>

                {selectedEvent.doubleHanded &&
                  selectedEvent.secondaryCareGiver && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">
                        Secondary Care Giver
                      </p>
                      <p className="font-medium">
                        {selectedEvent.secondaryCareGiver.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedEvent.secondaryCareGiver.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedEvent.secondaryCareGiver.phone}
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
                  {moment(selectedEvent.date).format("dddd, MMMM D, YYYY")}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{" "}
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </p>
                <p>
                  <span className="font-medium">Duration:</span>{" "}
                  {selectedEvent.duration} minutes
                </p>
                <p>
                  <span className="font-medium">Visit Number:</span>{" "}
                  {selectedEvent.visitNumber}
                </p>
              </div>
            </div>

            {selectedEvent.requirements &&
              selectedEvent.requirements.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Requirements</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.requirements.map((req, index) => (
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

            {selectedEvent.doubleHanded && (
              <div className="mb-6">
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-pink-800 font-medium">
                    🤝 Double-Handed Care Required
                  </p>
                </div>
              </div>
            )}

            {selectedEvent.notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Notes</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedEvent.notes}
                </p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Status</h3>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  selectedEvent.status === "scheduled"
                    ? "bg-blue-100 text-blue-800"
                    : selectedEvent.status === "in_progress"
                      ? "bg-orange-100 text-orange-800"
                      : selectedEvent.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : selectedEvent.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : selectedEvent.status === "missed"
                            ? "bg-red-200 text-red-900"
                            : "bg-gray-100 text-gray-800"
                }`}
              >
                {selectedEvent.status.replace("_", " ").toUpperCase()}
              </span>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              {selectedEvent.status === "scheduled" && (
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

              {selectedEvent.status === "in_progress" && (
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
      )}
    </div>
  );
}

export default CalendarView;
