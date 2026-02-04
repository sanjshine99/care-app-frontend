// frontend/src/pages/CareGivers/CareGiverDetail.jsx
// View care giver details

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Edit,
  Trash2,
  ArrowLeft,
  Car,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { careGiverService } from "../../services/careGiverService";

function CareGiverDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [careGiver, setCareGiver] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCareGiver();
  }, [id]);

  const loadCareGiver = async () => {
    try {
      setLoading(true);
      const response = await careGiverService.getById(id);
      if (response.success) {
        setCareGiver(response.data.careGiver);
      }
    } catch (error) {
      toast.error("Failed to load care giver");
      navigate("/caregivers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${careGiver.name}?`)) {
      return;
    }

    try {
      await careGiverService.delete(id);
      toast.success("Care giver deleted successfully");
      navigate("/caregivers");
    } catch (error) {
      const message =
        error.response?.data?.error?.message || "Failed to delete care giver";
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

  if (!careGiver) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Care giver not found</p>
      </div>
    );
  }

  const age = careGiver.age || "N/A";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/caregivers")}
          className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Care Givers
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {careGiver.name}
            </h1>
            <p className="text-gray-600 mt-2">
              Age {age} • {careGiver.gender || "Not specified"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/caregivers/${id}/availability`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              Availability
            </button>
            <button
              onClick={() => navigate(`/caregivers/${id}/edit`)}
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
              {careGiver.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{careGiver.phone}</span>
                </div>
              )}

              {careGiver.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{careGiver.email}</span>
                </div>
              )}

              {careGiver.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <span>
                    {careGiver.address.full ||
                      `${careGiver.address.street}, ${careGiver.address.city}, ${careGiver.address.postcode}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Skills & Qualifications</h2>

            {careGiver.skills && careGiver.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {careGiver.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
                  >
                    {skill.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No skills recorded</p>
            )}
          </div>

          {/* Availability Summary */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Availability</h2>
              <button
                onClick={() => navigate(`/caregivers/${id}/availability`)}
                className="text-primary-600 hover:underline text-sm"
              >
                Manage Availability
              </button>
            </div>

            {careGiver.availability && careGiver.availability.length > 0 ? (
              <div className="space-y-2">
                {careGiver.availability.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="font-medium">{day.dayOfWeek}</span>
                    <div className="flex gap-2">
                      {day.slots && day.slots.length > 0 ? (
                        day.slots.map((slot, slotIndex) => (
                          <span
                            key={slotIndex}
                            className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded"
                          >
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">
                          Not available
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No availability set</p>
                <button
                  onClick={() => navigate(`/caregivers/${id}/availability`)}
                  className="text-primary-600 hover:underline mt-2"
                >
                  Set availability
                </button>
              </div>
            )}
          </div>

          {/* Time Off */}
          {careGiver.timeOff && careGiver.timeOff.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Scheduled Time Off</h2>
              <div className="space-y-2">
                {careGiver.timeOff.map((timeOff, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-orange-50 border border-orange-200 rounded"
                  >
                    <div>
                      <p className="font-medium text-orange-800">
                        {new Date(timeOff.startDate).toLocaleDateString()} -{" "}
                        {new Date(timeOff.endDate).toLocaleDateString()}
                      </p>
                      {timeOff.reason && (
                        <p className="text-sm text-orange-600">
                          {timeOff.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {careGiver.notes && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {careGiver.notes}
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
                careGiver.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {careGiver.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Capabilities */}
          <div className="card">
            <h3 className="font-semibold mb-3">Capabilities</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Can Drive
                </span>
                {careGiver.canDrive ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Single-Handed Only</span>
                {careGiver.singleHandedOnly ? (
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="card">
            <h3 className="font-semibold mb-3">Capacity</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Max Care Receivers:</span>
                <span className="font-medium">
                  {careGiver.maxCareReceivers || "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Skills:</span>
                <span className="font-medium">
                  {careGiver.skills?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Working Days:</span>
                <span className="font-medium">
                  {careGiver.availability?.filter(
                    (a) => a.slots && a.slots.length > 0
                  ).length || 0}
                </span>
              </div>
              {careGiver.timeOff && careGiver.timeOff.length > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Scheduled Time Off:</span>
                  <span className="font-medium">
                    {careGiver.timeOff.length} period(s)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareGiverDetail;
