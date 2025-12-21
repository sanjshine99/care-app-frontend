import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
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
    setTimeOff((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
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
              (slot1.startTime >= slot2.startTime &&
                slot1.startTime < slot2.endTime) ||
              (slot2.startTime >= slot1.startTime &&
                slot2.startTime < slot1.endTime)
            ) {
              errors.push(`${day}: Overlapping time slots detected`);
            }
          }
        }
      }

      // Check start < end
      slots.forEach((slot, index) => {
        if (slot.startTime >= slot.endTime) {
          errors.push(
            `${day} slot ${index + 1}: Start time must be before end time`
          );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Availability Management
          </h2>
          <p className="text-gray-600 mt-1">
            Set weekly schedule and time-off periods
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Availability</span>
            </>
          )}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Weekly Hours</p>
          <p className="text-3xl font-bold text-primary-600">
            {getTotalHours()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Working Days</p>
          <p className="text-3xl font-bold text-green-600">
            {
              Object.values(availability).filter((slots) => slots.length > 0)
                .length
            }
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Time Off Periods</p>
          <p className="text-3xl font-bold text-orange-600">{timeOff.length}</p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="card">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium"
        >
          <Clock className="h-5 w-5" />
          {showPresets ? "Hide" : "Show"} Quick Schedule Presets
        </button>

        {showPresets && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(PRESET_SCHEDULES).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="px-4 py-2 bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded transition-colors text-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Availability */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary-600" />
          Weekly Availability
        </h3>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-lg">{day}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => addSlot(day)}
                    className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
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
                        className="text-sm px-2 py-1 border rounded"
                      >
                        <option value="">Copy to...</option>
                        {DAYS_OF_WEEK.filter((d) => d !== day).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => clearDay(day)}
                        className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
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
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) =>
                          updateSlot(day, index, "startTime", e.target.value)
                        }
                        className="input"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) =>
                          updateSlot(day, index, "endTime", e.target.value)
                        }
                        className="input"
                      />
                      <button
                        onClick={() => removeSlot(day, index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-600 ml-2">
                        (
                        {(
                          (parseTime(slot.endTime) -
                            parseTime(slot.startTime)) /
                          60
                        ).toFixed(1)}{" "}
                        hrs)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Not available on this day
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Off */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            Time Off
          </h3>
          <button
            onClick={addTimeOff}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Time Off
          </button>
        </div>

        {timeOff.length > 0 ? (
          <div className="space-y-3">
            {timeOff.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={item.startDate.split("T")[0]}
                      onChange={(e) =>
                        updateTimeOff(index, "startDate", e.target.value)
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={item.endDate.split("T")[0]}
                      onChange={(e) =>
                        updateTimeOff(index, "endDate", e.target.value)
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Reason
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={item.reason || ""}
                        onChange={(e) =>
                          updateTimeOff(index, "reason", e.target.value)
                        }
                        placeholder="Vacation, Sick, etc."
                        className="input flex-1"
                      />
                      <button
                        onClick={() => removeTimeOff(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
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
          <p className="text-gray-400 text-center py-8">
            No time off periods scheduled
          </p>
        )}
      </div>

      {/* Visual Summary */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          Weekly Summary
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">
                {day.substring(0, 3)}
              </div>
              <div
                className={`h-16 rounded ${
                  availability[day]?.length > 0 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <div className="text-xs text-gray-600 mt-1">
                {availability[day]?.length > 0
                  ? `${availability[day].length} slot${availability[day].length > 1 ? "s" : ""}`
                  : "Off"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AvailabilityManager;
