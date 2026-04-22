import { memo } from "react";
import { Users } from "lucide-react";

const statusStyles = {
  primary: {
    scheduled: "border-l-[3px] border-l-blue-500 bg-blue-50 text-blue-900",
    in_progress: "border-l-[3px] border-l-amber-500 bg-amber-50 text-amber-900",
    completed: "border-l-[3px] border-l-emerald-500 bg-emerald-50 text-emerald-900",
    cancelled: "border-l-[3px] border-l-red-400 bg-red-50 text-red-800 opacity-60",
    missed: "border-l-[3px] border-l-red-400 bg-red-50 text-red-800 opacity-60",
    default: "border-l-[3px] border-l-gray-400 bg-gray-50 text-gray-800",
  },
  secondary: {
    scheduled: "border-l-[3px] border-l-blue-400 bg-blue-50/60 text-blue-800 border border-dashed border-blue-300",
    in_progress: "border-l-[3px] border-l-amber-400 bg-amber-50/60 text-amber-800 border border-dashed border-amber-300",
    completed: "border-l-[3px] border-l-emerald-400 bg-emerald-50/60 text-emerald-800 border border-dashed border-emerald-300",
    cancelled: "border-l-[3px] border-l-red-300 bg-red-50/60 text-red-700 border border-dashed border-red-300 opacity-60",
    missed: "border-l-[3px] border-l-red-300 bg-red-50/60 text-red-700 border border-dashed border-red-300 opacity-60",
    default: "border-l-[3px] border-l-gray-300 bg-gray-50/60 text-gray-700 border border-dashed border-gray-300",
  },
};

function AppointmentCard({ appointment, careGiverId, onClick }) {
  const isPrimary =
    appointment.careGiver && appointment.careGiver._id === careGiverId;
  const isSecondary =
    appointment.secondaryCareGiver &&
    appointment.secondaryCareGiver._id === careGiverId;

  const role = isPrimary ? "primary" : isSecondary ? "secondary" : "primary";
  const styles = statusStyles[role];
  const cardStyle = styles[appointment.status] || styles.default;

  return (
    <div
      onClick={() => onClick(appointment)}
      className={`px-2 py-1.5 rounded-md cursor-pointer text-xs transition-all duration-150 hover:shadow-md hover:-translate-y-px ${cardStyle}`}
    >
      <div className="flex items-center gap-1">
        {appointment.doubleHanded && (
          <Users className="h-3 w-3 flex-shrink-0 opacity-70" />
        )}
        <span className="font-semibold text-[11px]">
          {appointment.startTime}
          {appointment.endTime ? ` - ${appointment.endTime}` : ""}
        </span>
      </div>
      <p className="truncate font-medium mt-0.5">
        {appointment.careReceiver?.name || "Unknown"}
      </p>

      {isSecondary && (
        <span className="inline-block text-[9px] mt-1 px-1 py-0.5 rounded bg-white/60 font-medium opacity-80">
          2nd CG
        </span>
      )}

      {appointment.doubleHanded && (
        <p className="text-[10px] mt-0.5 opacity-70 truncate">
          {isPrimary && appointment.secondaryCareGiver
            ? `+ ${appointment.secondaryCareGiver.name}`
            : isSecondary && appointment.careGiver
              ? `+ ${appointment.careGiver.name}`
              : ""}
        </p>
      )}
    </div>
  );
}

export default memo(AppointmentCard);
