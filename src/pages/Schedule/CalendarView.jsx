// frontend/src/pages/Schedule/CalendarView.jsx
// Google Calendar-style view with caregiver availability visualization

import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import moment from "moment";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";
import CalendarCell from "./CalendarCell";
import AppointmentDetailModal from "./AppointmentDetailModal";

function idString(ref) {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  return ref._id != null ? String(ref._id) : String(ref);
}

function CalendarView({
  appointments,
  startDate,
  endDate,
  onRefresh,
  loading,
  entityFilter = { mode: "all" },
}) {
  const confirmDialog = useConfirmDialog();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [allCareGivers, setAllCareGivers] = useState([]);
  const [loadingCareGivers, setLoadingCareGivers] = useState(true);

  const scrollContainerRef = useRef(null);
  const todayColumnRef = useRef(null);

  // Fetch ALL care givers from API (including availability & timeOff)
  useEffect(() => {
    const fetchAllCareGivers = async () => {
      try {
        setLoadingCareGivers(true);
        const response = await api.get("/caregivers?limit=200&isActive=true");

        if (response.data.success) {
          const careGivers = response.data.data.careGivers.map((cg) => ({
            id: cg._id,
            name: cg.name,
            email: cg.email,
            phone: cg.phone,
            availability: cg.availability || [],
            timeOff: cg.timeOff || [],
          }));

          setAllCareGivers(careGivers);
        }
      } catch (error) {
        console.error("Failed to load care givers:", error);
        toast.error("Failed to load care givers");
      } finally {
        setLoadingCareGivers(false);
      }
    };

    fetchAllCareGivers();
  }, []);

  // Auto-scroll to today's column
  useEffect(() => {
    if (todayColumnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayEl = todayColumnRef.current;
      const scrollLeft =
        todayEl.offsetLeft - container.clientWidth / 2 + todayEl.clientWidth / 2;
      // Small delay to ensure layout is computed
      requestAnimationFrame(() => {
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      });
    }
  }, [loadingCareGivers, startDate, endDate]);

  const dates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const result = [];
    const start = moment(startDate);
    const end = moment(endDate);
    while (start.isSameOrBefore(end)) {
      result.push(start.format("YYYY-MM-DD"));
      start.add(1, "day");
    }
    return result;
  }, [startDate, endDate]);

  // Pre-compute appointments by careGiver+date for performance
  const appointmentIndex = useMemo(() => {
    const index = {};
    appointments.forEach((apt) => {
      const dateKey = moment(apt.date).format("YYYY-MM-DD");
      if (apt.careGiver) {
        const key = `${apt.careGiver._id}_${dateKey}`;
        if (!index[key]) index[key] = [];
        index[key].push(apt);
      }
      if (apt.secondaryCareGiver) {
        const key = `${apt.secondaryCareGiver._id}_${dateKey}`;
        if (!index[key]) index[key] = [];
        index[key].push(apt);
      }
    });
    // Sort each cell's appointments by time
    Object.values(index).forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
    return index;
  }, [appointments]);

  const getAppointmentsForCell = useCallback(
    (careGiverId, date) => {
      return appointmentIndex[`${careGiverId}_${date}`] || [];
    },
    [appointmentIndex],
  );

  const handleAppointmentClick = useCallback((appointment) => {
    setSelectedEvent(appointment);
    setShowModal(true);
  }, []);

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

  const careGivers = useMemo(() => {
    if (entityFilter.mode === "all") {
      return allCareGivers;
    }
    if (entityFilter.mode === "care_giver" && entityFilter.careGiverId) {
      const id = entityFilter.careGiverId;
      const match = allCareGivers.filter((cg) => cg.id === id);
      return match;
    }
    if (entityFilter.mode === "care_receiver" && entityFilter.careReceiverId) {
      const ids = new Set();
      appointments.forEach((apt) => {
        if (apt.careGiver) ids.add(idString(apt.careGiver));
        if (apt.secondaryCareGiver) ids.add(idString(apt.secondaryCareGiver));
      });
      const filtered = allCareGivers.filter((cg) => ids.has(cg.id));
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      return filtered;
    }
    return allCareGivers;
  }, [allCareGivers, appointments, entityFilter]);

  const emptyReceiverFilter =
    entityFilter.mode === "care_receiver" &&
    entityFilter.careReceiverId &&
    !loading &&
    !loadingCareGivers &&
    allCareGivers.length > 0 &&
    careGivers.length === 0;

  const emptyCareGiverRow =
    entityFilter.mode === "care_giver" &&
    entityFilter.careGiverId &&
    !loading &&
    !loadingCareGivers &&
    allCareGivers.length > 0 &&
    careGivers.length === 0;

  return (
    <div className="space-y-4">
      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading || loadingCareGivers ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-10 w-10 border-[3px] border-primary-600 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-500 text-sm">
              Loading {loadingCareGivers ? "care givers" : "appointments"}...
            </span>
          </div>
        ) : allCareGivers.length === 0 ? (
          <div className="text-center py-16">
            <CalendarIcon className="h-14 w-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-1 text-gray-700">
              No Care Givers Found
            </h3>
            <p className="text-gray-400 text-sm">
              Please add care givers to the system first.
            </p>
          </div>
        ) : emptyCareGiverRow ? (
          <div className="text-center py-16 px-4">
            <Users className="h-14 w-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-1 text-gray-700">Care giver not in list</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              The selected care giver was not found in the loaded list (up to 200 active). Adjust
              filters or widen the care giver query if needed.
            </p>
          </div>
        ) : emptyReceiverFilter ? (
          <div className="text-center py-16 px-4">
            <CalendarIcon className="h-14 w-14 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-1 text-gray-700">No appointments in this range</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              There are no appointments for this care receiver between the selected dates. Try a
              different date range or clear the filter.
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Header Row */}
              <thead>
                <tr>
                  <th className="border-b border-r border-gray-200 bg-white p-3 text-left sticky left-0 z-30 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      Care Givers
                    </span>
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">
                      ({careGivers.length})
                    </span>
                  </th>
                  {dates.map((date) => {
                    const isToday = moment(date).isSame(moment(), "day");
                    const isWeekend = [0, 6].includes(moment(date).day());
                    return (
                      <th
                        key={date}
                        ref={isToday ? todayColumnRef : null}
                        className={`border-b border-gray-200 px-2 py-3 text-center min-w-[160px] sticky top-0 z-20 transition-colors ${
                          isToday
                            ? "bg-blue-600"
                            : isWeekend
                              ? "bg-gray-50"
                              : "bg-white"
                        }`}
                      >
                        <div
                          className={`text-[11px] uppercase tracking-wider font-medium ${
                            isToday ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          {moment(date).format("ddd")}
                        </div>
                        <div
                          className={`text-lg font-bold mt-0.5 ${
                            isToday ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {moment(date).format("D")}
                        </div>
                        <div
                          className={`text-[10px] ${
                            isToday ? "text-blue-200" : "text-gray-400"
                          }`}
                        >
                          {moment(date).format("MMM")}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {careGivers.map((careGiver, index) => (
                  <tr
                    key={careGiver.id}
                    className={`group ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    {/* Care Giver Name - Sticky Column */}
                    <td className="border-b border-r border-gray-100 p-3 bg-white sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar circle */}
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {careGiver.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {careGiver.name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {careGiver.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date Cells */}
                    {dates.map((date) => {
                      const isToday = moment(date).isSame(moment(), "day");
                      const cellAppointments = getAppointmentsForCell(
                        careGiver.id,
                        date,
                      );
                      return (
                        <CalendarCell
                          key={date}
                          date={date}
                          caregiver={careGiver}
                          appointments={cellAppointments}
                          onAppointmentClick={handleAppointmentClick}
                          isToday={isToday}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {!loading && !loadingCareGivers && careGivers.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-600">
              <span className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                Status:
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-50 border-l-[3px] border-l-blue-500"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-50 border-l-[3px] border-l-amber-500"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-50 border-l-[3px] border-l-emerald-500"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-50 border-l-[3px] border-l-red-400"></div>
                <span>Cancelled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-gray-500" />
                <span>Double-Handed</span>
              </div>

              <span className="text-gray-300">|</span>

              <span className="text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                Availability:
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200"></div>
                <span>Not Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm time-off-stripes bg-red-50 border border-red-200"></div>
                <span>Time Off</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {showModal && selectedEvent && (
        <AppointmentDetailModal
          event={selectedEvent}
          onClose={() => setShowModal(false)}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default memo(CalendarView);
