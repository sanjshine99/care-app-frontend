// frontend/src/pages/CareReceivers/CareReceiverForm.jsx
// ENHANCED - Flexible visit scheduling with days of week and recurrence patterns

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Save, ArrowLeft, Plus, Trash2, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
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

const NOTES_TEXTAREA_MAX_HEIGHT_PX = 192;
const VISIT_NOTES_TEXTAREA_MAX_HEIGHT_PX = 120;

function adjustTextareaHeight(el, maxHeightPx = NOTES_TEXTAREA_MAX_HEIGHT_PX) {
  if (!el) return;
  el.style.height = "auto";
  const height = Math.min(el.scrollHeight, maxHeightPx);
  el.style.height = `${height}px`;
  el.style.overflowY = el.scrollHeight > maxHeightPx ? "auto" : "hidden";
}

function CareReceiverForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState({});
  const [addressErrors, setAddressErrors] = useState({ street: "", city: "", postcode: "" });
  const [postcodeStatus, setPostcodeStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const notesTextareaRef = useRef(null);
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

  useEffect(() => {
    adjustTextareaHeight(notesTextareaRef.current, NOTES_TEXTAREA_MAX_HEIGHT_PX);
  }, [formData.notes]);

  const loadCareReceiver = async () => {
    try {
      setLoading(true);
      const response = await careReceiverService.getById(id);
      if (response.success) {
        const careReceiver = response.data.careReceiver;

        // Ensure each visit has the new fields (backward compatibility). Keep _id so backend
        // can tell existing vs new visits and only mark reassignment when existing visit schedule changes.
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
        const postcode = careReceiver.address?.postcode?.trim();
        if (postcode) {
          validatePostcode(postcode);
        }
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
    // Auto-uppercase UK postcode as user types
    const processedValue = name === "address.postcode" ? value.toUpperCase() : value;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: processedValue,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: processedValue }));
    }
  };

  const validatePostcode = async (postcode) => {
    if (!postcode) {
      setAddressErrors((prev) => ({ ...prev, postcode: "Postcode is required" }));
      setPostcodeStatus("invalid");
      return;
    }
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/;
    if (!ukPostcodeRegex.test(postcode)) {
      setAddressErrors((prev) => ({ ...prev, postcode: "Invalid UK postcode format (e.g. SW1A 1AA)" }));
      setPostcodeStatus("invalid");
      return;
    }
    setPostcodeStatus("validating");
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}/validate`
      );
      const data = await res.json();
      if (data.result === true) {
        setAddressErrors((prev) => ({ ...prev, postcode: "" }));
        setPostcodeStatus("valid");
      } else {
        setAddressErrors((prev) => ({ ...prev, postcode: "This postcode does not exist in the UK" }));
        setPostcodeStatus("invalid");
      }
    } catch {
      // API unavailable — fall back to format-only validation
      setAddressErrors((prev) => ({ ...prev, postcode: "" }));
      setPostcodeStatus("valid");
    }
  };

  const handleAddressBlur = (e) => {
    const { name, value } = e.target;
    const field = name.split(".")[1];
    if (field === "street") {
      setAddressErrors((prev) => ({
        ...prev,
        street: value.trim() ? "" : "Street address is required",
      }));
    }
    if (field === "city") {
      setAddressErrors((prev) => ({
        ...prev,
        city: value.trim() ? "" : "City is required",
      }));
    }
    if (field === "postcode") {
      validatePostcode(value.trim());
    }
  };

  const toggleVisitExpanded = (index) => {
    setExpandedVisits((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const addDailyVisit = () => {
    const newIndex = formData.dailyVisits.length;
    const newVisit = {
      visitNumber: newIndex + 1,
      preferredTime: "09:00",
      duration: 60,
      requirements: [],
      doubleHanded: false,
      priority: 3,
      notes: "",
      daysOfWeek: DAYS_OF_WEEK,
      recurrencePattern: "weekly",
      recurrenceInterval: 1,
      recurrenceStartDate: null,
    };
    setFormData((prev) => ({
      ...prev,
      dailyVisits: [...prev.dailyVisits, newVisit],
    }));
    // Collapse all other visits and expand only the new one
    setExpandedVisits({ [newIndex]: true });
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

  const handleRecurrencePatternChange = (index, patternValue) => {
    const interval =
      patternValue === "biweekly" ? 2 : patternValue === "monthly" ? 4 : formData.dailyVisits[index].recurrenceInterval || 1;
    const updated = [...formData.dailyVisits];
    updated[index] = {
      ...updated[index],
      recurrencePattern: patternValue,
      recurrenceInterval: patternValue === "biweekly" ? 2 : patternValue === "monthly" ? 4 : interval,
    };
    setFormData((prev) => ({ ...prev, dailyVisits: updated }));
  };

  const toggleRequirement = (visitIndex, requirement) => {
    const visit = formData.dailyVisits[visitIndex];
    const requirements = visit.requirements.includes(requirement)
      ? visit.requirements.filter((r) => r !== requirement)
      : [...visit.requirements, requirement];
    updateDailyVisit(visitIndex, "requirements", requirements);
  };

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

    if (!formData.address.street || !formData.address.city || !formData.address.postcode) {
      toast.error("Please fill in complete address");
      return;
    }

    if (postcodeStatus !== "valid") {
      toast.error("Please enter a valid UK postcode and wait for verification");
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
      if (!visit.daysOfWeek || visit.daysOfWeek.length === 0) {
        toast.error(
          `Visit ${visit.visitNumber}: Please select at least one day of the week`
        );
        return;
      }
    }

    try {
      setSaving(true);

      let response;
      if (isEdit) {
        response = await careReceiverService.update(id, formData);
      } else {
        response = await careReceiverService.create(formData);
      }

      const careReceiver = response?.data?.careReceiver;
      const scheduleGenerationQueued = Boolean(response?.scheduleGenerationQueued);
      const careReceiverId = isEdit ? id : careReceiver?._id;

      if (scheduleGenerationQueued) {
        toast.info(
          "Care receiver saved. Auto-scheduling in progress — you'll get a notification when done."
        );
        navigate("/carereceivers", {
          state: { scheduleGenerationQueued: true, careReceiverId },
        });
      } else {
        toast.success(
          isEdit
            ? "Care receiver updated successfully"
            : "Care receiver created successfully"
        );
        navigate("/carereceivers");
      }

      if (response?.warning) {
        toast.warning(response.warning);
      }
    } catch (error) {
      const message =
        error.response?.data?.error?.message || "Failed to save care receiver";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/carereceivers")}
              className="text-gray-500 hover:text-gray-800"
              title="Back"
              aria-label="Back to care receivers"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              {isEdit ? "Edit Care Receiver" : "New Care Receiver"}
            </h1>
          </div>
        </div>
      </div>

      {/* Content - no inner scroll; main layout scrolls */}
      <div className="px-6">
        {isEdit && loading ? (
          <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[200px] py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" aria-hidden="true" />
          </div>
        ) : (
        <form id="care-receiver-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                  pattern="^[A-Za-z\s'\-]+$"
                  title="Name must contain letters only"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth?.split("T")[0] || ""}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  id="phone"
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
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
                <label htmlFor="genderPreference" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Care Giver Gender
                </label>
                <select
                  id="genderPreference"
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
            <h2 className="text-xl font-semibold mb-4">Address <span className="text-sm font-normal text-blue-600">(UK addresses only)</span></h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="address-street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  id="address-street"
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  onBlur={handleAddressBlur}
                  className={`input ${addressErrors.street ? "border-red-500 focus:ring-red-500" : ""}`}
                  required
                />
                {addressErrors.street && (
                  <p className="text-xs text-red-500 mt-1">{addressErrors.street}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address-city" className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    id="address-city"
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    onBlur={handleAddressBlur}
                    className={`input ${addressErrors.city ? "border-red-500 focus:ring-red-500" : ""}`}
                    required
                  />
                  {addressErrors.city && (
                    <p className="text-xs text-red-500 mt-1">{addressErrors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address-postcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode *
                  </label>
                  <div className="relative">
                    <input
                      id="address-postcode"
                      type="text"
                      name="address.postcode"
                      value={formData.address.postcode}
                      onChange={handleChange}
                      onBlur={handleAddressBlur}
                      placeholder="SW1A 1AA"
                      className={`input pr-10 ${
                        postcodeStatus === "invalid"
                          ? "border-red-500 focus:ring-red-500"
                          : postcodeStatus === "valid"
                          ? "border-green-500 focus:ring-green-500"
                          : ""
                      }`}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {postcodeStatus === "validating" && (
                        <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                      )}
                      {postcodeStatus === "valid" && (
                        <span className="text-green-500 font-bold text-sm">✓</span>
                      )}
                      {postcodeStatus === "invalid" && (
                        <span className="text-red-500 font-bold text-sm">✗</span>
                      )}
                    </div>
                  </div>
                  {addressErrors.postcode ? (
                    <p className="text-xs text-red-500 mt-1">{addressErrors.postcode}</p>
                  ) : postcodeStatus === "valid" ? (
                    <p className="text-xs text-green-600 mt-1">Valid UK postcode</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">UK postcode format (e.g. SW1A 1AA)</p>
                  )}
                </div>

                <div className="flex items-end pb-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-sm" aria-label="Country">United Kingdom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Visits */}
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
              <div className="space-y-3">
                {formData.dailyVisits.map((visit, index) => {
                  const isExpanded = expandedVisits[index] ?? false;
                  return (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-lg bg-gray-50"
                  >
                    {/* Collapsible Header */}
                    <div
                      className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-100 rounded-t-lg"
                      onClick={() => toggleVisitExpanded(index)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary-600" />
                          Visit {visit.visitNumber}
                        </h3>
                        {!isExpanded && (
                          <span className="text-sm text-gray-500">
                            {visit.preferredTime} • {visit.duration}min • {(visit.daysOfWeek || DAYS_OF_WEEK).length} days
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDailyVisit(index);
                        }}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                        title="Remove visit"
                        aria-label={`Remove visit ${visit.visitNumber}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                    <div className="p-5 pt-0" onClick={(e) => e.stopPropagation()}>
                    {/* Time and Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor={`visit-${index}-preferredTime`} className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Time *
                        </label>
                        <input
                          id={`visit-${index}-preferredTime`}
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
                        <label htmlFor={`visit-${index}-duration`} className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (minutes) *
                        </label>
                        <input
                          id={`visit-${index}-duration`}
                          type="number"
                          value={visit.duration}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            const clamped = Number.isNaN(v)
                              ? 15
                              : Math.min(240, Math.max(15, v));
                            updateDailyVisit(index, "duration", clamped);
                          }}
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
                        <label htmlFor={`visit-${index}-priority`} className="block text-sm font-medium text-gray-700 mb-2">
                          Priority
                        </label>
                        <select
                          id={`visit-${index}-priority`}
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

                    <div
                      className="mb-4 p-4 bg-white rounded-lg border border-gray-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Days of Week *
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickSelectDays(index, "all");
                            }}
                            className="text-sm px-3 py-2 min-h-[44px] bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            All Days
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickSelectDays(index, "weekdays");
                            }}
                            className="text-sm px-3 py-2 min-h-[44px] bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Weekdays
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickSelectDays(index, "weekends");
                            }}
                            className="text-sm px-3 py-2 min-h-[44px] bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Weekends
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = (visit.daysOfWeek || DAYS_OF_WEEK).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleDayOfWeek(index, day);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-primary-100 border-2 border-primary-600 text-primary-900 font-semibold"
                                  : "bg-white border-2 border-gray-300 text-gray-600 hover:border-gray-400"
                              }`}
                              aria-pressed={isSelected}
                              aria-label={`${day}, ${isSelected ? "selected" : "not selected"}`}
                            >
                              <span className="text-sm">{day.slice(0, 3)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Visit will occur on{" "}
                        {(visit.daysOfWeek || DAYS_OF_WEEK).length === 7
                          ? "all 7 days"
                          : `${(visit.daysOfWeek || DAYS_OF_WEEK).length} day(s) per week`}.
                      </p>
                    </div>

                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recurrence Pattern *
                      </label>
                      <select
                        value={visit.recurrencePattern || "weekly"}
                        onChange={(e) =>
                          handleRecurrencePatternChange(index, e.target.value)
                        }
                        className="input mb-3"
                      >
                        {RECURRENCE_PATTERNS.map((pattern) => (
                          <option key={pattern.value} value={pattern.value}>
                            {pattern.label}
                          </option>
                        ))}
                      </select>

                      {/* Custom Interval Input - only for custom pattern */}
                      {visit.recurrencePattern === "custom" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interval (weeks) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            value={visit.recurrenceInterval || 1}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              const clamped = Number.isNaN(v)
                                ? 1
                                : Math.min(52, Math.max(1, v));
                              updateDailyVisit(
                                index,
                                "recurrenceInterval",
                                clamped
                              );
                            }}
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
                        ref={(el) =>
                          el &&
                          adjustTextareaHeight(el, VISIT_NOTES_TEXTAREA_MAX_HEIGHT_PX)
                        }
                        value={visit.notes}
                        onChange={(e) => {
                          updateDailyVisit(index, "notes", e.target.value);
                          requestAnimationFrame(() =>
                            adjustTextareaHeight(
                              e.target,
                              VISIT_NOTES_TEXTAREA_MAX_HEIGHT_PX
                            )
                          );
                        }}
                        className="input resize-none overflow-hidden"
                        rows={2}
                        maxLength="300"
                        placeholder="Any special instructions..."
                      />
                    </div>
                    </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="emergencyContact-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  id="emergencyContact-name"
                  type="text"
                  name="emergencyContact.name"
                  value={formData.emergencyContact.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="emergencyContact-relationship" className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <select
                  id="emergencyContact-relationship"
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
                <label htmlFor="emergencyContact-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  id="emergencyContact-phone"
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
                <label htmlFor="emergencyContact-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="emergencyContact-email"
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
            <label htmlFor="notes" className="sr-only">Additional notes</label>
            <textarea
              ref={notesTextareaRef}
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input resize-none overflow-hidden"
              rows={3}
              maxLength="1000"
              placeholder="Any additional information about the care receiver..."
            />
          </div>

        </form>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/carereceivers")}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="care-receiver-form"
            className="btn-primary flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
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
      </div>
    </div>
  );
}

export default CareReceiverForm;
