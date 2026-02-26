import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getCurrentWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const todayStr = now.toISOString().split("T")[0];
  return DAYS_OF_WEEK.map((dayName, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const monthShort = d.toLocaleDateString("en-GB", { month: "short" });
    const dayNum = d.getDate();
    const fullDateLabel = `${dayName}, ${monthShort} ${dayNum}`;
    const shortLabel = `${dayName.substring(0, 3)} ${dayNum} ${monthShort}`;
    return {
      dayName,
      date: d,
      dateStr,
      fullDateLabel,
      shortLabel,
      isToday: dateStr === todayStr,
    };
  });
}

const PRESET_SCHEDULES = {
  standard: {
    name: "9-5 Weekdays",
    schedule: {
      Monday: [{ startTime: "09:00", endTime: "17:00" }],
      Tuesday: [{ startTime: "09:00", endTime: "17:00" }],
      Wednesday: [{ startTime: "09:00", endTime: "17:00" }],
      Thursday: [{ startTime: "09:00", endTime: "17:00" }],
      Friday: [{ startTime: "09:00", endTime: "17:00" }],
    },
  },
  fullTime: {
    name: "8-6 All Week",
    schedule: {
      Monday: [{ startTime: "08:00", endTime: "18:00" }],
      Tuesday: [{ startTime: "08:00", endTime: "18:00" }],
      Wednesday: [{ startTime: "08:00", endTime: "18:00" }],
      Thursday: [{ startTime: "08:00", endTime: "18:00" }],
      Friday: [{ startTime: "08:00", endTime: "18:00" }],
      Saturday: [{ startTime: "08:00", endTime: "18:00" }],
      Sunday: [{ startTime: "08:00", endTime: "18:00" }],
    },
  },
  morning: {
    name: "Morning Shifts",
    schedule: {
      Monday: [{ startTime: "07:00", endTime: "13:00" }],
      Tuesday: [{ startTime: "07:00", endTime: "13:00" }],
      Wednesday: [{ startTime: "07:00", endTime: "13:00" }],
      Thursday: [{ startTime: "07:00", endTime: "13:00" }],
      Friday: [{ startTime: "07:00", endTime: "13:00" }],
    },
  },
  evening: {
    name: "Evening Shifts",
    schedule: {
      Monday: [{ startTime: "14:00", endTime: "22:00" }],
      Tuesday: [{ startTime: "14:00", endTime: "22:00" }],
      Wednesday: [{ startTime: "14:00", endTime: "22:00" }],
      Thursday: [{ startTime: "14:00", endTime: "22:00" }],
      Friday: [{ startTime: "14:00", endTime: "22:00" }],
    },
  },
  flexible: {
    name: "Split Shifts",
    schedule: {
      Monday: [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      Tuesday: [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      Wednesday: [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      Thursday: [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      Friday: [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
    },
  },
};

function AvailabilityManager({ careGiver, onSave }) {
  const [availability, setAvailability] = useState({});
  const [timeOff, setTimeOff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (careGiver?.availability) {
      // Convert array to object for easier management
      const availObj = {};
      careGiver.availability.forEach((day) => {
        availObj[day.dayOfWeek] = day.slots || [];
      });
      setAvailability(availObj);
    }

    if (careGiver?.timeOff) {
      setTimeOff(careGiver.timeOff || []);
    }
  }, [careGiver]);

  const addSlot = (day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { startTime: "09:00", endTime: "17:00" }],
    }));
  };

  const removeSlot = (day, index) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  const updateSlot = (day, index, field, value) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    }));
  };

  const applyPreset = (presetKey) => {
    const preset = PRESET_SCHEDULES[presetKey];
    setAvailability(preset.schedule);
    setShowPresets(false);
    toast.success(`Applied ${preset.name} schedule`);
  };

  const clearDay = (day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [],
    }));
  };

  const copyDay = (fromDay, toDay) => {
    setAvailability((prev) => ({
      ...prev,
      [toDay]: [...(prev[fromDay] || [])],
    }));
    toast.success(`Copied ${fromDay} schedule to ${toDay}`);
  };

  const addTimeOff = () => {
    const today = new Date().toISOString().split("T")[0];
    setTimeOff((prev) => [
      ...prev,
      {
        startDate: today,
        endDate: today,
        reason: "",
      },
    ]);
  };

  const removeTimeOff = (index) => {
    setTimeOff((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTimeOff = (index, field, value) => {
    setTimeOff((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const validateAvailability = () => {
    const errors = [];

    // Check for overlapping slots
    Object.entries(availability).forEach(([day, slots]) => {
      if (slots.length > 1) {
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const slot1 = slots[i];
            const slot2 = slots[j];

            if (
              (slot1.startTime >= slot2.startTime && slot1.startTime < slot2.endTime) ||
              (slot2.startTime >= slot1.startTime && slot2.startTime < slot1.endTime)
            ) {
              errors.push(`${day}: Overlapping time slots detected`);
            }
          }
        }
      }

      // Check start < end
      slots.forEach((slot, index) => {
        if (slot.startTime >= slot.endTime) {
          errors.push(`${day} slot ${index + 1}: Start time must be before end time`);
        }
      });
    });

    return errors;
  };

  const handleSave = async () => {
    const errors = validateAvailability();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setSaving(true);
    try {
      // Convert object back to array format for API
      const availabilityArray = Object.entries(availability)
        .filter(([_, slots]) => slots.length > 0)
        .map(([dayOfWeek, slots]) => ({
          dayOfWeek,
          slots,
        }));

      await onSave({
        availability: availabilityArray,
        timeOff,
      });

      toast.success("Availability saved successfully");
    } catch (error) {
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  const getTotalHours = () => {
    let total = 0;
    Object.values(availability).forEach((slots) => {
      slots.forEach((slot) => {
        const start = parseTime(slot.startTime);
        const end = parseTime(slot.endTime);
        total += (end - start) / 60;
      });
    });
    return total.toFixed(1);
  };

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const weekDates = getCurrentWeekDates();

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Availability Management</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Availability
            </>
          )}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card">
          <p className="text-sm text-gray-600">Total Weekly Hours</p>
          <p className="text-2xl font-bold text-primary-600">{getTotalHours()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Working Days</p>
          <p className="text-2xl font-bold text-green-600">
            {Object.values(availability).filter((slots) => slots.length > 0).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Time Off Periods</p>
          <p className="text-2xl font-bold text-orange-600">{timeOff.length}</p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="card">
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium"
        >
          <Clock className="h-5 w-5" />
          {showPresets ? "Hide" : "Show"} Quick Schedule Presets
        </button>

        {showPresets && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(PRESET_SCHEDULES).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className="text-sm px-3 py-1.5 min-h-[36px] bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Availability */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-600" />
          Weekly Availability
        </h3>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const weekDay = weekDates[dayIndex];
            return (
              <div key={day} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">
                      {weekDay.fullDateLabel}
                    </h4>
                    {weekDay.isToday && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-700 shrink-0">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      className="btn-primary flex items-center justify-center gap-2 text-sm h-[38px] px-3 w-full min-w-36"
                    >
                      <Plus className="h-4 w-4" />
                      Add Slot
                    </button>
                    {availability[day]?.length > 0 && (
                      <>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              copyDay(day, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="input w-auto min-w-32 h-[38px] text-sm py-2 px-3"
                          aria-label={`Copy ${day} to another day`}
                        >
                          <option value="">Copy to...</option>
                          {DAYS_OF_WEEK.filter((d) => d !== day).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => clearDay(day)}
                          className="h-[38px] px-3 text-red-600 hover:bg-red-50 rounded font-medium text-sm"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {availability[day]?.length > 0 ? (
                  <div className="space-y-2">
                    {availability[day].map((slot, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-2"
                      >
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(day, index, "startTime", e.target.value)}
                          className="input w-full min-w-0"
                          aria-label={`${day} slot ${index + 1} start`}
                        />
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(day, index, "endTime", e.target.value)}
                          className="input w-full min-w-0"
                          aria-label={`${day} slot ${index + 1} end`}
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          ({((parseTime(slot.endTime) - parseTime(slot.startTime)) / 60).toFixed(1)}{" "}
                          hrs)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(day, index)}
                          className="p-2 h-[38px] w-[38px] flex items-center justify-center text-red-600 hover:bg-red-50 rounded shrink-0"
                          aria-label={`Remove slot ${index + 1}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-0">Not available on this day</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Off */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Time Off
          </h3>
          <button
            type="button"
            onClick={addTimeOff}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Time Off
          </button>
        </div>

        {timeOff.length > 0 ? (
          <div className="space-y-3">
            {timeOff.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={item.startDate.split("T")[0]}
                      onChange={(e) => updateTimeOff(index, "startDate", e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={item.endDate.split("T")[0]}
                      onChange={(e) => updateTimeOff(index, "endDate", e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={item.reason || ""}
                        onChange={(e) => updateTimeOff(index, "reason", e.target.value)}
                        placeholder="Vacation, Sick, etc."
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeOff(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded shrink-0"
                        aria-label="Remove time off period"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No time off periods scheduled</p>
        )}
      </div>

      {/* Weekly Summary */}
      <div className="card bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-lg font-semibold mb-2 text-blue-900">Weekly Summary</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((weekDay) => {
            const day = weekDay.dayName;
            const slotCount = availability[day]?.length ?? 0;
            return (
              <div
                key={day}
                className={`flex flex-col items-center rounded-lg p-1.5 gap-0.5 ${
                  weekDay.isToday ? "ring-2 ring-primary-500 bg-primary-50/80" : ""
                }`}
              >
                <div className="text-xs font-medium text-gray-700">{weekDay.shortLabel}</div>
                <div className="min-h-[1.25rem] flex items-center justify-center">
                  {weekDay.isToday && (
                    <span className="text-xs font-medium text-primary-600">Today</span>
                  )}
                </div>
                <div
                  className={`w-full h-10 rounded shrink-0 ${
                    slotCount > 0 ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div className="text-xs text-gray-600">
                  {slotCount > 0 ? `${slotCount} slot${slotCount > 1 ? "s" : ""}` : "Off"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AvailabilityManager;
