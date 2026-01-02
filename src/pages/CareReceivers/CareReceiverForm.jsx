// frontend/src/pages/CareReceivers/CareReceiverForm.jsx
// ENHANCED - Flexible visit scheduling with days of week and recurrence patterns

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Save, X, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { careReceiverService } from "../../services/careReceiverService";

const SKILLS = [
  { value: "personal_care", label: "Personal Care" },
  { value: "medication_management", label: "Medication Management" },
  { value: "dementia_care", label: "Dementia Care" },
  { value: "mobility_assistance", label: "Mobility Assistance" },
  { value: "meal_preparation", label: "Meal Preparation" },
  { value: "companionship", label: "Companionship" },
  { value: "household_tasks", label: "Household Tasks" },
  { value: "specialized_medical", label: "Specialized Medical" },
];

const RELATIONSHIPS = [
  "Spouse/Partner",
  "Child",
  "Parent",
  "Sibling",
  "Friend",
  "Neighbor",
  "Other Family",
  "Other",
];

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const RECURRENCE_PATTERNS = [
  { value: "weekly", label: "Weekly (Every week)" },
  { value: "biweekly", label: "Biweekly (Every 2 weeks)" },
  { value: "monthly", label: "Monthly (Every 4 weeks)" },
  { value: "custom", label: "Custom Interval" },
];

function CareReceiverForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      postcode: "",
    },
    dateOfBirth: "",
    gender: "",
    genderPreference: "No Preference",
    dailyVisits: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    },
    notes: "",
  });

  useEffect(() => {
    if (isEdit) {
      loadCareReceiver();
    }
  }, [id]);

  const loadCareReceiver = async () => {
    try {
      setLoading(true);
      const response = await careReceiverService.getById(id);
      if (response.success) {
        const careReceiver = response.data.careReceiver;

        // Ensure each visit has the new fields (backward compatibility)
        if (careReceiver.dailyVisits) {
          careReceiver.dailyVisits = careReceiver.dailyVisits.map((visit) => ({
            ...visit,
            daysOfWeek: visit.daysOfWeek || DAYS_OF_WEEK, // Default to all days
            recurrencePattern: visit.recurrencePattern || "weekly",
            recurrenceInterval: visit.recurrenceInterval || 1,
            recurrenceStartDate: visit.recurrenceStartDate || null,
          }));
        }

        setFormData(careReceiver);
      }
    } catch (error) {
      toast.error("Failed to load care receiver");
      navigate("/carereceivers");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const addDailyVisit = () => {
    const newVisit = {
      visitNumber: formData.dailyVisits.length + 1,
      preferredTime: "09:00",
      duration: 60,
      requirements: [],
      doubleHanded: false,
      priority: 3,
      notes: "",
      // NEW FIELDS:
      daysOfWeek: DAYS_OF_WEEK, // Default to all days
      recurrencePattern: "weekly",
      recurrenceInterval: 1,
      recurrenceStartDate: null,
    };
    setFormData((prev) => ({
      ...prev,
      dailyVisits: [...prev.dailyVisits, newVisit],
    }));
  };

  const removeDailyVisit = (index) => {
    const updated = formData.dailyVisits.filter((_, i) => i !== index);
    updated.forEach((visit, i) => {
      visit.visitNumber = i + 1;
    });
    setFormData((prev) => ({ ...prev, dailyVisits: updated }));
  };

  const updateDailyVisit = (index, field, value) => {
    const updated = [...formData.dailyVisits];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, dailyVisits: updated }));
  };

  const toggleRequirement = (visitIndex, requirement) => {
    const visit = formData.dailyVisits[visitIndex];
    const requirements = visit.requirements.includes(requirement)
      ? visit.requirements.filter((r) => r !== requirement)
      : [...visit.requirements, requirement];
    updateDailyVisit(visitIndex, "requirements", requirements);
  };

  // NEW: Toggle day of week
  const toggleDayOfWeek = (visitIndex, day) => {
    const visit = formData.dailyVisits[visitIndex];
    const daysOfWeek = visit.daysOfWeek || DAYS_OF_WEEK;
    const newDays = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];

    // Don't allow empty selection
    if (newDays.length === 0) {
      toast.error("At least one day must be selected");
      return;
    }

    updateDailyVisit(visitIndex, "daysOfWeek", newDays);
  };

  // NEW: Quick select for days
  const quickSelectDays = (visitIndex, selection) => {
    let days = [];
    switch (selection) {
      case "all":
        days = DAYS_OF_WEEK;
        break;
      case "weekdays":
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        break;
      case "weekends":
        days = ["Saturday", "Sunday"];
        break;
      case "none":
        toast.error("At least one day must be selected");
        return;
      default:
        days = DAYS_OF_WEEK;
    }
    updateDailyVisit(visitIndex, "daysOfWeek", days);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.dateOfBirth) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (
      !formData.address.street ||
      !formData.address.city ||
      !formData.address.postcode
    ) {
      toast.error("Please fill in complete address");
      return;
    }

    if (!formData.emergencyContact.name || !formData.emergencyContact.phone) {
      toast.error("Please fill in emergency contact details");
      return;
    }

    // Validate visits
    for (const visit of formData.dailyVisits) {
      if (visit.duration < 15 || visit.duration > 240) {
        toast.error(
          `Visit ${visit.visitNumber}: Duration must be between 15 and 240 minutes`
        );
        return;
      }
      if (visit.requirements.length === 0) {
        toast.error(
          `Visit ${visit.visitNumber}: Please select at least one requirement`
        );
        return;
      }
      // NEW: Validate days of week
      if (!visit.daysOfWeek || visit.daysOfWeek.length === 0) {
        toast.error(
          `Visit ${visit.visitNumber}: Please select at least one day of the week`
        );
        return;
      }
    }

    try {
      setLoading(true);

      if (isEdit) {
        await careReceiverService.update(id, formData);
        toast.success("Care receiver updated successfully");
      } else {
        await careReceiverService.create(formData);
        toast.success("Care receiver created successfully");
      }

      navigate("/carereceivers");
    } catch (error) {
      const message =
        error.response?.data?.error?.message || "Failed to save care receiver";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            {isEdit ? "Edit Care Receiver" : "New Care Receiver"}
          </h1>
          <button
            onClick={() => navigate("/carereceivers")}
            className="btn-secondary flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth?.split("T")[0] || ""}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="07700900000"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Care Giver Gender
                </label>
                <select
                  name="genderPreference"
                  value={formData.genderPreference}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="No Preference">No Preference</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode *
                  </label>
                  <input
                    type="text"
                    name="address.postcode"
                    value={formData.address.postcode}
                    onChange={handleChange}
                    placeholder="SW1A 1AA"
                    className="input"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Visits - ENHANCED */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Recurring Care Visits</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Define visit schedules with specific days and recurrence
                  patterns
                </p>
              </div>
              <button
                type="button"
                onClick={addDailyVisit}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Visit
              </button>
            </div>

            {formData.dailyVisits.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-1">No visits defined yet</p>
                <p className="text-sm text-gray-500">
                  Add visits with flexible scheduling options
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.dailyVisits.map((visit, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary-600" />
                        Visit {visit.visitNumber}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeDailyVisit(index)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                        title="Remove visit"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Time and Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Time *
                        </label>
                        <input
                          type="time"
                          value={visit.preferredTime}
                          onChange={(e) =>
                            updateDailyVisit(
                              index,
                              "preferredTime",
                              e.target.value
                            )
                          }
                          className="input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes) *
                        </label>
                        <input
                          type="number"
                          value={visit.duration}
                          onChange={(e) =>
                            updateDailyVisit(
                              index,
                              "duration",
                              parseInt(e.target.value)
                            )
                          }
                          min="15"
                          max="240"
                          className="input"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          15-240 minutes
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>
                        <select
                          value={visit.priority}
                          onChange={(e) =>
                            updateDailyVisit(
                              index,
                              "priority",
                              parseInt(e.target.value)
                            )
                          }
                          className="input"
                        >
                          <option value="1">1 - Low</option>
                          <option value="2">2</option>
                          <option value="3">3 - Medium</option>
                          <option value="4">4</option>
                          <option value="5">5 - High</option>
                        </select>
                      </div>
                    </div>

                    {/* ========== NEW: Days of Week Selector ========== */}
                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Days of Week *
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => quickSelectDays(index, "all")}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            All Days
                          </button>
                          <button
                            type="button"
                            onClick={() => quickSelectDays(index, "weekdays")}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Weekdays
                          </button>
                          <button
                            type="button"
                            onClick={() => quickSelectDays(index, "weekends")}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Weekends
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <label
                            key={day}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                              (visit.daysOfWeek || DAYS_OF_WEEK).includes(day)
                                ? "bg-primary-100 border-2 border-primary-600 text-primary-900 font-semibold"
                                : "bg-white border-2 border-gray-300 text-gray-600 hover:border-gray-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={(
                                visit.daysOfWeek || DAYS_OF_WEEK
                              ).includes(day)}
                              onChange={() => toggleDayOfWeek(index, day)}
                              className="sr-only"
                            />
                            <span className="text-sm">{day.slice(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                      {(visit.daysOfWeek || DAYS_OF_WEEK).length === 7 && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Visit will occur every day
                        </p>
                      )}
                      {(visit.daysOfWeek || DAYS_OF_WEEK).length < 7 && (
                        <p className="text-xs text-blue-600 mt-2">
                          ✓ Visit will occur on{" "}
                          {(visit.daysOfWeek || DAYS_OF_WEEK).length} day(s) per
                          week
                        </p>
                      )}
                    </div>

                    {/* ========== NEW: Recurrence Pattern ========== */}
                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurrence Pattern *
                      </label>
                      <select
                        value={visit.recurrencePattern || "weekly"}
                        onChange={(e) =>
                          updateDailyVisit(
                            index,
                            "recurrencePattern",
                            e.target.value
                          )
                        }
                        className="input mb-3"
                      >
                        {RECURRENCE_PATTERNS.map((pattern) => (
                          <option key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </option>
                        ))}
                      </select>

                      {/* Custom Interval Input */}
                      {(visit.recurrencePattern === "custom" ||
                        visit.recurrencePattern === "biweekly" ||
                        visit.recurrencePattern === "monthly") && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interval (weeks) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            value={visit.recurrenceInterval || 1}
                            onChange={(e) =>
                              updateDailyVisit(
                                index,
                                "recurrenceInterval",
                                parseInt(e.target.value)
                              )
                            }
                            className="input"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Visit repeats every {visit.recurrenceInterval || 1}{" "}
                            week(s)
                          </p>
                        </div>
                      )}

                      {/* Pattern Explanation */}
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        {visit.recurrencePattern === "weekly" && (
                          <p>
                            <strong>Weekly:</strong> Visit occurs every week on
                            the selected days
                          </p>
                        )}
                        {visit.recurrencePattern === "biweekly" && (
                          <p>
                            <strong>Biweekly:</strong> Visit occurs every 2
                            weeks on the selected days
                          </p>
                        )}
                        {visit.recurrencePattern === "monthly" && (
                          <p>
                            <strong>Monthly:</strong> Visit occurs every 4 weeks
                            on the selected days
                          </p>
                        )}
                        {visit.recurrencePattern === "custom" && (
                          <p>
                            <strong>Custom:</strong> Visit occurs every{" "}
                            {visit.recurrenceInterval || 1} week(s) on the
                            selected days
                          </p>
                        )}
                      </div>
                    </div>
                    {/* ========================================== */}

                    {/* Requirements */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requirements *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {SKILLS.map((skill) => (
                          <label
                            key={skill.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visit.requirements.includes(skill.value)}
                              onChange={() =>
                                toggleRequirement(index, skill.value)
                              }
                              className="rounded"
                            />
                            <span className="text-sm">{skill.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Double-Handed */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visit.doubleHanded}
                          onChange={(e) =>
                            updateDailyVisit(
                              index,
                              "doubleHanded",
                              e.target.checked
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-sm font-medium">
                          Double-Handed Care (Requires 2 care givers)
                        </span>
                      </label>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={visit.notes}
                        onChange={(e) =>
                          updateDailyVisit(index, "notes", e.target.value)
                        }
                        className="input"
                        rows="2"
                        maxLength="300"
                        placeholder="Any special instructions..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="emergencyContact.name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <select
                  name="emergencyContact.relationship"
                  value={formData.emergencyContact.relationship}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="emergencyContact.phone"
                  value={formData.emergencyContact.phone}
                  onChange={handleChange}
                  placeholder="07700900000"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="emergencyContact.email"
                  value={formData.emergencyContact.email}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows="4"
              maxLength="1000"
              placeholder="Any additional information about the care receiver..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/carereceivers")}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isEdit ? "Update" : "Create"} Care Receiver
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CareReceiverForm;
