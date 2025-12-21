// frontend/src/pages/CareReceivers/CareReceiverForm.jsx
// Complete form for creating/editing care receivers with daily visits

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Save, X, Plus, Trash2, Clock } from "lucide-react";
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
        setFormData(response.data.careReceiver);
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

    for (const visit of formData.dailyVisits) {
      if (visit.duration < 15 || visit.duration > 120) {
        toast.error(
          `Visit ${visit.visitNumber}: Duration must be between 15 and 120 minutes`
        );
        return;
      }
      if (visit.requirements.length === 0) {
        toast.error(
          `Visit ${visit.visitNumber}: Please select at least one requirement`
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
      <div className="mb-8">
        <button
          onClick={() => navigate("/carereceivers")}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Care Receivers
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEdit ? "Edit Care Receiver" : "Add New Care Receiver"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
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
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="07123456789"
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
                Care Giver Gender Preference
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
          <h2 className="text-xl font-bold mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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

        {/* Daily Visits */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Daily Visits (Recurring Care)</h2>
            <button
              type="button"
              onClick={addDailyVisit}
              className="btn-secondary flex items-center gap-2"
              disabled={formData.dailyVisits.length >= 4}
            >
              <Plus className="h-4 w-4" />
              Add Visit
            </button>
          </div>

          {formData.dailyVisits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No daily visits added yet</p>
              <p className="text-sm mt-1">
                Add recurring care visits that happen every day
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.dailyVisits.map((visit, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">
                      Visit {visit.visitNumber}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeDailyVisit(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

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
                        max="120"
                        className="input"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        15-120 minutes
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

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requirements *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {SKILLS.map((skill) => (
                        <label
                          key={skill.value}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={visit.requirements.includes(skill.value)}
                            onChange={() =>
                              toggleRequirement(index, skill.value)
                            }
                          />
                          <span className="text-sm">{skill.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2">
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
                      />
                      <span className="text-sm font-medium">
                        Double-Handed Care (Requires 2 care givers)
                      </span>
                    </label>
                  </div>

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
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Emergency Contact</h2>
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
                placeholder="07123456789"
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
          <h2 className="text-xl font-bold mb-4">Additional Notes</h2>
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

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/carereceivers")}
            className="btn-secondary flex items-center gap-2"
          >
            <X className="h-5 w-5" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2"
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
  );
}

export default CareReceiverForm;
