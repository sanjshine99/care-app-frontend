// frontend/src/pages/CareReceivers/CareReceiverDetail.jsx
// View care receiver details and find suitable care givers

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Clock,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { careReceiverService } from "../../services/careReceiverService";
import api from "../../services/api";

function CareReceiverDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [careReceiver, setCareReceiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuitableCareGivers, setShowSuitableCareGivers] = useState(false);
  const [suitableCareGivers, setSuitableCareGivers] = useState([]);
  const [loadingCareGivers, setLoadingCareGivers] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  useEffect(() => {
    loadCareReceiver();
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
    if (
      !window.confirm(`Are you sure you want to delete ${careReceiver.name}?`)
    ) {
      return;
    }

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
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!careReceiver) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Care receiver not found</p>
      </div>
    );
  }

  const age = careReceiver.age || "N/A";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/carereceivers")}
          className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2"
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
