// frontend/src/pages/Schedule/CalendarView.jsx
// ENHANCED - Date range picker + shows both care receiver and care giver names

import { useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Calendar as CalendarIcon,
  Filter,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

const localizer = momentLocalizer(moment);

function CalendarView({ appointments, onRangeChange, onRefresh, loading }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Date range filter
  const [startDate, setStartDate] = useState(
    moment().startOf("week").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(
    moment().endOf("week").format("YYYY-MM-DD")
  );

  // Transform appointments to calendar events
  const events = appointments.map((apt) => {
    const date = new Date(apt.date);
    const [startHour, startMin] = apt.startTime.split(":").map(Number);
    const [endHour, endMin] = apt.endTime.split(":").map(Number);

    const start = new Date(date);
    start.setHours(startHour, startMin, 0);

    const end = new Date(date);
    end.setHours(endHour, endMin, 0);

    // NEW: Show both care receiver and care giver names
    const careReceiverName = apt.careReceiver?.name || "Unknown CR";
    const careGiverName = apt.careGiver?.name || "No CG";

    return {
      id: apt._id,
      // Format: "John Smith → Mary Johnson (Visit 1)"
      title: `${careReceiverName} → ${careGiverName} (V${apt.visitNumber})`,
      start,
      end,
      resource: apt,
    };
  });

  // Event style based on status
  const eventStyleGetter = (event) => {
    const appointment = event.resource;
    let backgroundColor = "#3b82f6"; // Default blue

    switch (appointment.status) {
      case "scheduled":
        backgroundColor = "#3b82f6"; // Blue
        break;
      case "in_progress":
        backgroundColor = "#f59e0b"; // Orange
        break;
      case "completed":
        backgroundColor = "#10b981"; // Green
        break;
      case "cancelled":
        backgroundColor = "#ef4444"; // Red
        break;
      case "missed":
        backgroundColor = "#991b1b"; // Dark red
        break;
      case "needs_review":
        backgroundColor = "#8b5cf6"; // Purple
        break;
      default:
        backgroundColor = "#6b7280"; // Gray
    }

    // Double-handed care
    if (appointment.doubleHanded) {
      backgroundColor = "#ec4899"; // Pink
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setShowModal(true);
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  const handleRangeChange = (range) => {
    if (Array.isArray(range)) {
      // Week or Day view
      onRangeChange(range[0], range[range.length - 1]);
    } else {
      // Month view
      onRangeChange(range.start, range.end);
    }
  };

  // NEW: Handle date range filter
  const handleApplyDateRange = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (moment(startDate).isAfter(moment(endDate))) {
      toast.error("Start date must be before end date");
      return;
    }

    // Update calendar to show selected range
    const start = moment(startDate).toDate();
    const end = moment(endDate).endOf("day").toDate();

    setCurrentDate(start);
    onRangeChange(start, end);

    toast.success(
      `Showing appointments from ${moment(startDate).format("MMM D")} to ${moment(endDate).format("MMM D, YYYY")}`
    );
  };

  // NEW: Quick date range buttons
  const handleQuickRange = (range) => {
    let start, end;

    switch (range) {
      case "today":
        start = moment().startOf("day");
        end = moment().endOf("day");
        break;

      case "tomorrow":
        start = moment().add(1, "day").startOf("day");
        end = moment().add(1, "day").endOf("day");
        break;

      case "this_week":
        start = moment().startOf("week").startOf("day");
        end = moment().endOf("week").endOf("day");
        break;

      case "next_week":
        start = moment().add(1, "week").startOf("week").startOf("day");
        end = moment().add(1, "week").endOf("week").endOf("day");
        break;

      case "this_month":
        start = moment().startOf("month").startOf("day");
        end = moment().endOf("month").endOf("day");
        break;

      case "next_month":
        start = moment().add(1, "month").startOf("month").startOf("day");
        end = moment().add(1, "month").endOf("month").endOf("day");
        break;

      default:
        return;
    }

    setStartDate(start.format("YYYY-MM-DD"));
    setEndDate(end.format("YYYY-MM-DD"));
    setCurrentDate(start.toDate());
    onRangeChange(start.toDate(), end.toDate());
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
    if (!window.confirm("Are you sure you want to delete this appointment?")) {
      return;
    }

    try {
      await api.delete(`/schedule/appointments/${selectedEvent._id}`);
      toast.success("Appointment deleted");
      setShowModal(false);
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete appointment");
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-lg">Filter by Date Range</h3>
        </div>

        {/* Quick Range Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleQuickRange("today")}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Today
          </button>
          <button
            onClick={() => handleQuickRange("tomorrow")}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Tomorrow
          </button>
          <button
            onClick={() => handleQuickRange("this_week")}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            This Week
          </button>
          <button
            onClick={() => handleQuickRange("next_week")}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Next Week
          </button>
          <button
            onClick={() => handleQuickRange("this_month")}
            className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            This Month
          </button>
          <button
            onClick={() => handleQuickRange("next_month")}
            className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            Next Month
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="input w-full"
            />
          </div>

          <button
            onClick={handleApplyDateRange}
            disabled={!startDate || !endDate}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <CalendarIcon className="h-5 w-5" />
            Apply Filter
          </button>
        </div>

        {/* Current Range Display */}
        <div className="mt-3 text-sm text-gray-600">
          <p>
            Showing: <strong>{moment(startDate).format("MMM D, YYYY")}</strong>{" "}
            to <strong>{moment(endDate).format("MMM D, YYYY")}</strong> (
            {appointments.length} appointments)
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div style={{ height: "700px" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onRangeChange={handleRangeChange}
              view={currentView}
              date={currentDate}
              views={["month", "week", "day", "agenda"]}
              min={new Date(0, 0, 0, 7, 0, 0)} // 7 AM
              max={new Date(0, 0, 0, 22, 0, 0)} // 10 PM
              step={15}
              timeslots={4}
              popup
              showMultiDayTimes
            />
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Status Legend:
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Scheduled</span>
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
              <div className="w-4 h-4 rounded bg-pink-500"></div>
              <span>Double-Handed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
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
                {/* Primary Care Giver */}
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

                {/* Secondary Care Giver (if double-handed) */}
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

            {/* Requirements */}
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

            {/* Double-Handed Indicator */}
            {selectedEvent.doubleHanded && (
              <div className="mb-6">
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-pink-800 font-medium">
                    🤝 Double-Handed Care Required
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedEvent.notes && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Notes</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedEvent.notes}
                </p>
              </div>
            )}

            {/* Status */}
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

            {/* Actions */}
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
