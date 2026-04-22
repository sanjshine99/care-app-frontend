// frontend/src/pages/CareReceivers/CareReceiverDetail.jsx
// View care receiver details and find suitable care givers

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Ban,
  Plus,
  Pencil,
} from "lucide-react";
import { careReceiverService } from "../../services/careReceiverService";
import api from "../../services/api";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

const SNR_REASON_LABELS = {
  hospitalised: "Hospitalised",
  unwell: "Unwell",
  other: "Other",
};

function isoToDateInput(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 10);
}

function CareReceiverDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const confirmDialog = useConfirmDialog();
  const [careReceiver, setCareReceiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuitableCareGivers, setShowSuitableCareGivers] = useState(false);
  const [suitableCareGivers, setSuitableCareGivers] = useState([]);
  const [loadingCareGivers, setLoadingCareGivers] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [snrPeriods, setSnrPeriods] = useState([]);
  const [snrLoading, setSnrLoading] = useState(false);
  const [snrModalOpen, setSnrModalOpen] = useState(false);
  const [snrEditingId, setSnrEditingId] = useState(null);
  const [snrForm, setSnrForm] = useState({
    startDate: "",
    endDate: "",
    reasonType: "hospitalised",
    comment: "",
  });
  const [snrSaving, setSnrSaving] = useState(false);

  useEffect(() => {
    loadCareReceiver();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadSnrPeriods();
  }, [id]);

  const loadCareReceiver = async () => {
    try {
      setLoading(true);
      const response = await careReceiverService.getById(id);
      if (response.success) {
        setCareReceiver(response.data.careReceiver);
      }
    } catch (error) {
      toast.error("Failed to load care receiver");
      navigate("/carereceivers");
    } finally {
      setLoading(false);
    }
  };

  const loadSnrPeriods = async () => {
    try {
      setSnrLoading(true);
      const response = await careReceiverService.listServiceNotRequired(id);
      if (response.success) {
        setSnrPeriods(response.data.periods || []);
      }
    } catch {
      toast.error("Failed to load service-not-required periods");
    } finally {
      setSnrLoading(false);
    }
  };

  const openSnrModal = (period = null) => {
    if (period) {
      setSnrEditingId(period._id);
      setSnrForm({
        startDate: isoToDateInput(period.startDate),
        endDate: isoToDateInput(period.endDate),
        reasonType: period.reasonType,
        comment: period.comment || "",
      });
    } else {
      setSnrEditingId(null);
      setSnrForm({
        startDate: "",
        endDate: "",
        reasonType: "hospitalised",
        comment: "",
      });
    }
    setSnrModalOpen(true);
  };

  const closeSnrModal = () => {
    setSnrModalOpen(false);
    setSnrEditingId(null);
  };

  const submitSnrModal = async () => {
    if (!snrForm.startDate || !snrForm.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (snrForm.reasonType === "other" && !snrForm.comment.trim()) {
      toast.error("Comment is required when reason is Other");
      return;
    }
    try {
      setSnrSaving(true);
      const body = {
        startDate: snrForm.startDate,
        endDate: snrForm.endDate,
        reasonType: snrForm.reasonType,
        comment: snrForm.comment.trim(),
      };
      let res;
      if (snrEditingId) {
        res = await careReceiverService.updateServiceNotRequired(id, snrEditingId, body);
      } else {
        res = await careReceiverService.createServiceNotRequired(id, body);
      }
      if (res.success) {
        const n = res.data?.cancelledCount ?? 0;
        toast.success(
          n > 0
            ? `Saved. ${n} appointment(s) cancelled for this range.`
            : "Saved.",
        );
        closeSnrModal();
        await loadSnrPeriods();
      }
    } catch (error) {
      const msg =
        error.response?.data?.error?.message || "Could not save period";
      toast.error(msg);
    } finally {
      setSnrSaving(false);
    }
  };

  const deleteSnrPeriod = async (period) => {
    const ok = await confirmDialog.confirm({
      title: "Remove service-not-required period?",
      message:
        "This does not restore cancelled appointments. You can regenerate the schedule later if needed.",
      variant: "danger",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      const res = await careReceiverService.deleteServiceNotRequired(id, period._id);
      if (res.success) {
        toast.success("Period removed");
        await loadSnrPeriods();
      }
    } catch (error) {
      const msg =
        error.response?.data?.error?.message || "Could not remove period";
      toast.error(msg);
    }
  };

  const findSuitableCareGivers = async (visitNumber) => {
    try {
      setLoadingCareGivers(true);
      setSelectedVisit(visitNumber);

      const response = await api.get(
        `/carereceivers/${id}/suitable-caregivers`,
        {
          params: { visitNumber },
        }
      );

      if (response.data.success && response.data.data.results.length > 0) {
        setSuitableCareGivers(response.data.data.results[0].suitableCareGivers);
        setShowSuitableCareGivers(true);
      } else {
        toast.info("No suitable care givers found");
      }
    } catch (error) {
      toast.error("Failed to find suitable care givers");
    } finally {
      setLoadingCareGivers(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog.confirm({
      title: "Delete care receiver?",
      message: `Are you sure you want to delete ${careReceiver.name}?`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await careReceiverService.delete(id);
      toast.success("Care receiver deleted successfully");
      navigate("/carereceivers");
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        "Failed to delete care receiver";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px] py-12">
        <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" aria-hidden="true" />
      </div>
    );
  }

  if (!careReceiver) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px] py-12">
        <p className="text-gray-600">Care receiver not found</p>
      </div>
    );
  }

  const age = careReceiver.age || "N/A";

  return (
    <div className="p-6 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate("/carereceivers")}
          className="btn-secondary flex items-center gap-2 mb-4"
          aria-label="Back to Care Receivers"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Care Receivers
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {careReceiver.name}
            </h1>
            <p className="text-gray-600 mt-2">
              Age {age} • {careReceiver.gender || "Not specified"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/carereceivers/${id}/edit`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="h-5 w-5" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Contact Information</h2>
            <div className="space-y-3">
              {careReceiver.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{careReceiver.phone}</span>
                </div>
              )}

              {careReceiver.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{careReceiver.email}</span>
                </div>
              )}

              {careReceiver.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <span>{careReceiver.address.full}</span>
                </div>
              )}
            </div>
          </div>

          {/* Daily Visits */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Daily Visits</h2>

            {careReceiver.dailyVisits && careReceiver.dailyVisits.length > 0 ? (
              <div className="space-y-4">
                {careReceiver.dailyVisits.map((visit) => (
                  <div
                    key={visit.visitNumber}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          Visit {visit.visitNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {visit.preferredTime} • {visit.duration} minutes •
                          Priority {visit.priority}
                        </p>
                      </div>
                      {visit.doubleHanded && (
                        <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-semibold rounded">
                          DOUBLE-HANDED
                        </span>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Requirements:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {visit.requirements.map((req, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {req.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    {visit.notes && (
                      <p className="text-sm text-gray-600 mb-3">
                        {visit.notes}
                      </p>
                    )}

                    <button
                      onClick={() => findSuitableCareGivers(visit.visitNumber)}
                      disabled={loadingCareGivers}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      {loadingCareGivers &&
                      selectedVisit === visit.visitNumber ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                          Finding...
                        </>
                      ) : (
                        <>
                          <Users className="h-4 w-4" />
                          Find Suitable Care Givers
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No daily visits configured</p>
                <button
                  onClick={() => navigate(`/carereceivers/${id}/edit`)}
                  className="text-primary-600 hover:underline mt-2"
                >
                  Add daily visits
                </button>
              </div>
            )}
          </div>

          {/* Service not required */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Ban className="h-5 w-5 text-amber-600" aria-hidden />
                Service not required
              </h2>
              <button
                type="button"
                onClick={() => openSnrModal(null)}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add period
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Mark dates when no visits are needed (e.g. hospital). Existing
              scheduled visits in that range are cancelled automatically.
            </p>
            {snrLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : snrPeriods.length === 0 ? (
              <p className="text-sm text-gray-500">No periods recorded.</p>
            ) : (
              <ul className="space-y-3">
                {snrPeriods.map((p) => (
                  <li
                    key={p._id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-wrap justify-between gap-2 items-start"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {isoToDateInput(p.startDate)} → {isoToDateInput(p.endDate)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {SNR_REASON_LABELS[p.reasonType] || p.reasonType}
                        {p.comment ? (
                          <span className="text-gray-500">
                            {" "}
                            — {p.comment.length > 80 ? `${p.comment.slice(0, 80)}…` : p.comment}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openSnrModal(p)}
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSnrPeriod(p)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes */}
          {careReceiver.notes && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {careReceiver.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status */}
          <div className="card">
            <h3 className="font-semibold mb-3">Status</h3>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded ${
                careReceiver.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {careReceiver.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Preferences */}
          {careReceiver.genderPreference &&
            careReceiver.genderPreference !== "No Preference" && (
              <div className="card">
                <h3 className="font-semibold mb-3">Preferences</h3>
                <div className="text-sm">
                  <p className="text-gray-600">Care Giver Gender:</p>
                  <p className="font-medium">{careReceiver.genderPreference}</p>
                </div>
              </div>
            )}

          {/* Emergency Contact */}
          {careReceiver.emergencyContact && (
            <div className="card">
              <h3 className="font-semibold mb-3">Emergency Contact</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-medium">
                    {careReceiver.emergencyContact.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Relationship:</p>
                  <p className="font-medium">
                    {careReceiver.emergencyContact.relationship}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Phone:</p>
                  <p className="font-medium">
                    {careReceiver.emergencyContact.phone}
                  </p>
                </div>
                {careReceiver.emergencyContact.email && (
                  <div>
                    <p className="text-gray-600">Email:</p>
                    <p className="font-medium">
                      {careReceiver.emergencyContact.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Visits:</span>
                <span className="font-medium">
                  {careReceiver.dailyVisits?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Daily Care:</span>
                <span className="font-medium">
                  {careReceiver.totalDailyCareTime || 0} min
                </span>
              </div>
              {careReceiver.dailyVisits?.some((v) => v.doubleHanded) && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Requires double-handed care</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suitable Care Givers Modal */}
      {snrModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg"
            role="dialog"
            aria-labelledby="snr-modal-title"
          >
            <h2 id="snr-modal-title" className="text-lg font-bold mb-4">
              {snrEditingId ? "Edit period" : "Service not required"}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="snr-start" className="block text-sm font-medium text-gray-700 mb-1">
                  Start date
                </label>
                <input
                  id="snr-start"
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={snrForm.startDate}
                  onChange={(e) =>
                    setSnrForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="snr-end" className="block text-sm font-medium text-gray-700 mb-1">
                  End date
                </label>
                <input
                  id="snr-end"
                  type="date"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={snrForm.endDate}
                  onChange={(e) =>
                    setSnrForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="snr-reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  id="snr-reason"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={snrForm.reasonType}
                  onChange={(e) =>
                    setSnrForm((f) => ({ ...f, reasonType: e.target.value }))
                  }
                >
                  <option value="hospitalised">Hospitalised</option>
                  <option value="unwell">Unwell</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="snr-comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comment {snrForm.reasonType === "other" ? "(required)" : "(optional)"}
                </label>
                <textarea
                  id="snr-comment"
                  rows={3}
                  maxLength={280}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={snrForm.comment}
                  onChange={(e) =>
                    setSnrForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  placeholder="Short note for staff records"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {snrForm.comment.length}/280
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSnrModal}
                className="btn-secondary"
                disabled={snrSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSnrModal}
                className="btn-primary"
                disabled={snrSaving}
              >
                {snrSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuitableCareGivers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Suitable Care Givers for Visit {selectedVisit}
              </h2>
              <button
                onClick={() => setShowSuitableCareGivers(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {suitableCareGivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No suitable care givers found</p>
                <p className="text-sm mt-2">
                  Try adjusting requirements or distance
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suitableCareGivers.map((cg) => (
                  <div
                    key={cg._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{cg.name}</h3>
                        <p className="text-sm text-gray-600">{cg.email}</p>
                        <p className="text-sm text-gray-600">{cg.phone}</p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {cg.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {skill.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">
                            {cg.distance} km
                          </span>
                        </div>
                        {cg.canDrive && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Can Drive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSuitableCareGivers(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareReceiverDetail;
