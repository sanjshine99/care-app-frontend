import { memo, useMemo } from "react";
import moment from "moment";
import AppointmentCard from "./AppointmentCard";

// Get availability slots for a specific date based on day of week
function getAvailabilityForDate(caregiver, dateString) {
  if (!caregiver.availability || caregiver.availability.length === 0) return [];
  const dayOfWeek = moment(dateString).format("dddd"); // "Monday", "Tuesday", etc.
  const dayAvailability = caregiver.availability.find(
    (a) => a.dayOfWeek === dayOfWeek,
  );
  return dayAvailability?.slots || [];
}

// Check if a date falls within any time-off period
function getTimeOffInfo(caregiver, dateString) {
  if (!caregiver.timeOff || caregiver.timeOff.length === 0) return null;
  const date = moment(dateString);
  const timeOff = caregiver.timeOff.find((to) =>
    date.isBetween(
      moment(to.startDate).startOf("day"),
      moment(to.endDate).endOf("day"),
      "day",
      "[]",
    ),
  );
  return timeOff || null;
}

// Format time slot for display (e.g., "09:00" -> "9a", "17:00" -> "5p")
function formatShortTime(time) {
  const m = moment(time, "HH:mm");
  const hour = m.hour();
  const min = m.minute();
  const suffix = hour >= 12 ? "p" : "a";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return min > 0 ? `${displayHour}:${String(min).padStart(2, "0")}${suffix}` : `${displayHour}${suffix}`;
}

function CalendarCell({
  date,
  caregiver,
  appointments,
  onAppointmentClick,
  isToday,
}) {
  const slots = useMemo(
    () => getAvailabilityForDate(caregiver, date),
    [caregiver, date],
  );
  const timeOff = useMemo(
    () => getTimeOffInfo(caregiver, date),
    [caregiver, date],
  );

  const hasAvailability = slots.length > 0;
  const isOnTimeOff = !!timeOff;

  // Determine cell background
  let cellBg = "";
  if (isOnTimeOff) {
    cellBg = "time-off-stripes bg-red-50/40";
  } else if (hasAvailability) {
    cellBg = "bg-emerald-50/20";
  } else {
    cellBg = "bg-gray-100/40";
  }

  if (isToday) {
    cellBg += " ring-1 ring-inset ring-blue-300";
  }

  return (
    <td
      className={`border border-gray-100 p-1.5 align-top min-w-[160px] transition-colors ${cellBg}`}
    >
      {/* Availability indicator */}
      <div className="mb-1">
        {isOnTimeOff ? (
          <span className="inline-flex items-center text-[9px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
            Time Off{timeOff.reason ? ` - ${timeOff.reason}` : ""}
          </span>
        ) : hasAvailability ? (
          <span className="text-[9px] text-emerald-500/80 font-medium">
            {slots
              .map((s) => `${formatShortTime(s.startTime)}-${formatShortTime(s.endTime)}`)
              .join(", ")}
          </span>
        ) : (
          <span className="text-[9px] text-gray-400">Not Available</span>
        )}
      </div>

      {/* Appointments */}
      {appointments.length > 0 ? (
        <div className="space-y-1">
          {appointments.map((apt) => (
            <AppointmentCard
              key={apt._id}
              appointment={apt}
              careGiverId={caregiver.id}
              onClick={onAppointmentClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-300 text-xs py-3">&mdash;</div>
      )}
    </td>
  );
}

export default memo(CalendarCell);
