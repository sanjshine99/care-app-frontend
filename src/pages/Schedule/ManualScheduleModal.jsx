// frontend/src/pages/Schedule/ManualScheduleModal.jsx
// COMPLETE - Always fetches fresh data (skills, availability, address, coordinates, everything!)

import { useState, useEffect } from "react";
import {
  X,
  User,
  MapPin,
  Award,
  CheckCircle,
  AlertCircle,
  Users,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { getSkillLabel } from "../../constants/skills";

function ManualScheduleModal({
  careReceiver: initialCareReceiver,
  visit: initialVisit,
  date,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableCareGivers, setAvailableCareGivers] = useState([]);
  const [careReceiver, setCareReceiver] = useState(initialCareReceiver);
  const [visit, setVisit] = useState(initialVisit);
  const [selectedCareGiver, setSelectedCareGiver] = useState(null);
  const [selectedSecondaryCareGiver, setSelectedSecondaryCareGiver] =
    useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    loadAllFreshData();
  }, []);

  const loadAllFreshData = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
        toast.info("🔄 Refreshing all data...");
      } else {
        setLoading(true);
      }

      setError(null);

      console.log("=== LOADING FRESH DATA ===");
      console.log("Care Receiver ID:", careReceiver.id);
      console.log("Date:", date);
      console.log("Visit:", visit);

      // STEP 1: Get FRESH care receiver data from database
      console.log("\n--- Fetching FRESH care receiver data ---");
      const crResponse = await api.get(
        `/schedule/care-receiver/${careReceiver.id}/fresh`,
      );

      if (crResponse.data.success) {
        const freshCareReceiver = crResponse.data.data.careReceiver;
        console.log("Fresh care receiver loaded:", freshCareReceiver);
        setCareReceiver({
          id: freshCareReceiver._id,
          name: freshCareReceiver.name,
          genderPreference: freshCareReceiver.genderPreference,
          address: freshCareReceiver.address,
          coordinates: freshCareReceiver.coordinates,
          dailyVisits: freshCareReceiver.dailyVisits,
        });

        // Update visit with fresh care receiver data
        const freshVisit = freshCareReceiver.dailyVisits?.find(
          (v) => v.visitNumber === visit.visitNumber,
        );
        if (freshVisit) {
          console.log("Found fresh visit data:", freshVisit);
          setVisit(freshVisit);
        }
      }

      // STEP 2: Calculate end time
      const currentVisit = visit; // Use current visit for calculation
      const [hours, minutes] = currentVisit.preferredTime
        .split(":")
        .map(Number);
      const endMinutes = minutes + currentVisit.duration;
      const endTime = `${hours + Math.floor(endMinutes / 60)}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      console.log("\n--- Searching for available care givers ---");
      console.log("Requirements:", currentVisit.requirements);
      console.log("Time:", currentVisit.preferredTime, "-", endTime);
      console.log("Double-handed:", currentVisit.doubleHanded);

      // STEP 3: Get FRESH available care givers (backend will query database)
      const response = await api.post("/schedule/find-available", {
        careReceiverId: careReceiver.id,
        date,
        startTime: currentVisit.preferredTime,
        endTime,
        requirements: currentVisit.requirements || [],
        doubleHanded: currentVisit.doubleHanded || false,
      });

      console.log("Available care givers response:", response.data);

      if (response.data.success) {
        const careGivers = response.data.data.availableCareGivers || [];
        console.log(`Found ${careGivers.length} available care givers`);

        setAvailableCareGivers(careGivers);
        setLastRefreshed(new Date());

        if (careGivers.length === 0) {
          setError(
            "No available care givers found. This could be because:\n" +
              "• No care givers have the required skills\n" +
              "• All care givers are busy at this time\n" +
              "• Care givers are on time off\n" +
              "• Care givers are not working on this day\n\n" +
              "Try refreshing or check care giver availability.",
          );
        }

        if (showToast) {
          toast.success(
            ` Refreshed! Found ${careGivers.length} available care givers`,
          );
        }
      }
    } catch (error) {
      console.error("Error loading fresh data:", error);
      const message =
        error.response?.data?.error?.message || "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    // Clear selections when refreshing
    setSelectedCareGiver(null);
    setSelectedSecondaryCareGiver(null);
    loadAllFreshData(true); // Show toast
  };

  const handleSchedule = async () => {
    if (!selectedCareGiver) {
      toast.error("Please select a care giver");
      return;
    }

    if (visit.doubleHanded && !selectedSecondaryCareGiver) {
      toast.error(
        "Please select a secondary care giver for double-handed care",
      );
      return;
    }

    try {
      setScheduling(true);

      const [hours, minutes] = visit.preferredTime.split(":").map(Number);
      const endMinutes = minutes + visit.duration;
      const endTime = `${hours + Math.floor(endMinutes / 60)}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      await api.post("/schedule/appointments/manual", {
        careReceiverId: careReceiver.id,
        careGiverId: selectedCareGiver._id,
        secondaryCareGiverId: visit.doubleHanded
          ? selectedSecondaryCareGiver._id
          : undefined,
        date,
        startTime: visit.preferredTime,
        endTime,
        duration: visit.duration,
        visitNumber: visit.visitNumber,
        requirements: visit.requirements || [],
        doubleHanded: visit.doubleHanded || false,
        priority: visit.priority || 3,
        notes: visit.notes || "",
      });

      toast.success(" Appointment scheduled successfully!");
      onSuccess();
    } catch (error) {
      console.error("Scheduling error:", error);
      const message =
        error.response?.data?.error?.message ||
        "Failed to schedule appointment";
      toast.error(message);
    } finally {
      setScheduling(false);
    }
  };

  // Calculate match score
  const getMatchScore = (careGiver) => {
    let score = 0;
    const reasons = [];

    // Skills match (50 points)
    const requirements = visit.requirements || [];
    if (requirements.length === 0) {
      score += 50;
      reasons.push("No specific skills required");
    } else {
      const normalizedCGSkills = careGiver.skills.map((s) =>
        s.toLowerCase().replace(/ /g, "_"),
      );
      const normalizedRequirements = requirements.map((r) =>
        r.toLowerCase().replace(/ /g, "_"),
      );

      const matchingSkills = normalizedRequirements.filter((req) =>
        normalizedCGSkills.includes(req),
      );

      const hasAllSkills =
        matchingSkills.length === normalizedRequirements.length;

      if (hasAllSkills) {
        score += 50;
        reasons.push("✓ Has all required skills");
      } else {
        score += (matchingSkills.length / normalizedRequirements.length) * 50;
        reasons.push(
          `Has ${matchingSkills.length}/${normalizedRequirements.length} skills`,
        );
      }
    }

    // Gender preference (30 points)
    if (
      careReceiver.genderPreference &&
      careReceiver.genderPreference !== "No Preference"
    ) {
      if (careGiver.gender === careReceiver.genderPreference) {
        score += 30;
        reasons.push(
          `✓ Matches gender preference (${careReceiver.genderPreference})`,
        );
      } else {
        reasons.push(
          `✗ Gender: ${careGiver.gender} (prefers ${careReceiver.genderPreference})`,
        );
      }
    } else {
      score += 30;
      reasons.push("No gender preference");
    }

    // Distance (20 points)
    if (careGiver.distance !== undefined && careGiver.distance !== null) {
      if (careGiver.distance < 5) {
        score += 20;
        reasons.push("✓ Very close (<5 km)");
      } else if (careGiver.distance < 10) {
        score += 15;
        reasons.push("Close (<10 km)");
      } else if (careGiver.distance < 15) {
        score += 10;
        reasons.push("Moderate distance (<15 km)");
      } else {
        score += 5;
        reasons.push("Far distance");
      }
    } else {
      score += 10;
      reasons.push("Distance unavailable");
    }

    return { score, reasons };
  };

  // Sort care givers by match score
  const rankedCareGivers = availableCareGivers
    .map((cg) => ({
      ...cg,
      matchData: getMatchScore(cg),
    }))
    .sort((a, b) => b.matchData.score - a.matchData.score);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Manual Scheduling</h2>
            <p className="text-gray-600">
              Select care giver(s) for this appointment
            </p>
            {lastRefreshed && (
              <p className="text-xs text-gray-500 mt-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className={`p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${
                refreshing ? "bg-blue-50" : ""
              }`}
              title="Refresh all data (care givers, skills, availability, coordinates)"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading || refreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">Appointment Details</h3>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              ✓ Fresh Data
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Care Receiver</p>
              <p className="font-medium">{careReceiver.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p className="font-medium">{date}</p>
            </div>
            <div>
              <p className="text-gray-600">Time</p>
              <p className="font-medium">
                {visit.preferredTime} ({visit.duration} min)
              </p>
            </div>
            <div>
              <p className="text-gray-600">Visit Number</p>
              <p className="font-medium">Visit {visit.visitNumber}</p>
            </div>
          </div>

          {/* Requirements */}
          {visit.requirements && visit.requirements.length > 0 && (
            <div className="mt-3">
              <p className="text-gray-600 text-sm mb-2">Required Skills:</p>
              <div className="flex flex-wrap gap-2">
                {visit.requirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded font-medium"
                  >
                    {getSkillLabel(req)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Gender Preference */}
          {careReceiver.genderPreference &&
            careReceiver.genderPreference !== "No Preference" && (
              <div className="mt-3">
                <p className="text-gray-600 text-sm">
                  Gender Preference:{" "}
                  <span className="font-medium text-blue-800">
                    {careReceiver.genderPreference}
                  </span>
                </p>
              </div>
            )}

          {/* Address */}
          {careReceiver.address && (
            <div className="mt-3">
              <p className="text-gray-600 text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {careReceiver.address.full || careReceiver.address.street}
              </p>
            </div>
          )}

          {/* Double-Handed */}
          {visit.doubleHanded && (
            <div className="mt-3 bg-pink-100 border border-pink-300 rounded p-2">
              <p className="text-pink-800 font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Double-Handed Care (requires 2 care givers)
              </p>
            </div>
          )}
        </div>

        {/* Available Care Givers */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">
              Available Care Givers ({availableCareGivers.length})
            </h3>
            {!loading && !refreshing && (
              <button
                onClick={handleRefresh}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh List
              </button>
            )}
          </div>

          {loading || refreshing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mb-4" />
              <p className="text-gray-600 font-medium">
                {refreshing
                  ? "Refreshing all data..."
                  : "Loading care givers..."}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Getting latest skills, availability, and coordinates...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
              <p className="text-red-800 font-medium mb-2">
                No Available Care Givers
              </p>
              <p className="text-sm text-red-600 whitespace-pre-line max-w-md mx-auto mb-4">
                {error}
              </p>
              <button
                onClick={handleRefresh}
                className="btn-secondary flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh All Data
              </button>
            </div>
          ) : availableCareGivers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2 font-medium">
                No available care givers found
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Possible reasons:
                <br />
                • Care givers don't have required skills
                <br />
                • Care givers are not working at this time
                <br />
                • Care givers are on time off
                <br />• All care givers have conflicting appointments
              </p>
              <button
                onClick={handleRefresh}
                className="btn-secondary flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh All Data
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {rankedCareGivers.map((careGiver) => {
                const isPrimarySelected =
                  selectedCareGiver?._id === careGiver._id;
                const isSecondarySelected =
                  selectedSecondaryCareGiver?._id === careGiver._id;
                const isSelected = isPrimarySelected || isSecondarySelected;

                const requirements = visit.requirements || [];
                const normalizedCGSkills = careGiver.skills.map((s) =>
                  s.toLowerCase().replace(/ /g, "_"),
                );
                const normalizedRequirements = requirements.map((r) =>
                  r.toLowerCase().replace(/ /g, "_"),
                );
                const hasAllSkills =
                  requirements.length === 0 ||
                  normalizedRequirements.every((req) =>
                    normalizedCGSkills.includes(req),
                  );

                const matchesGender =
                  !careReceiver.genderPreference ||
                  careReceiver.genderPreference === "No Preference" ||
                  careGiver.gender === careReceiver.genderPreference;

                return (
                  <div
                    key={careGiver._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary-500 bg-primary-50 shadow-md"
                        : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection */}
                      <div className="flex flex-col gap-2 pt-1">
                        {!visit.doubleHanded ? (
                          <input
                            type="radio"
                            name="careGiver"
                            checked={isPrimarySelected}
                            onChange={() => setSelectedCareGiver(careGiver)}
                            className="mt-1"
                          />
                        ) : (
                          <>
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="radio"
                                name="primaryCareGiver"
                                checked={isPrimarySelected}
                                onChange={() => setSelectedCareGiver(careGiver)}
                              />
                              Primary
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="radio"
                                name="secondaryCareGiver"
                                checked={isSecondarySelected}
                                onChange={() =>
                                  setSelectedSecondaryCareGiver(careGiver)
                                }
                                disabled={
                                  selectedCareGiver?._id === careGiver._id
                                }
                              />
                              Secondary
                            </label>
                          </>
                        )}
                      </div>

                      {/* Care Giver Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {careGiver.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {careGiver.email}
                            </p>
                            <p className="text-sm text-gray-600">
                              {careGiver.phone}
                            </p>
                          </div>

                          {/* Match Score */}
                          <div className="text-right">
                            <div
                              className={`text-2xl font-bold ${
                                careGiver.matchData.score >= 80
                                  ? "text-green-600"
                                  : careGiver.matchData.score >= 60
                                    ? "text-blue-600"
                                    : careGiver.matchData.score >= 40
                                      ? "text-orange-600"
                                      : "text-red-600"
                              }`}
                            >
                              {Math.round(careGiver.matchData.score)}%
                            </div>
                            <p className="text-xs text-gray-500">Match Score</p>
                          </div>
                        </div>

                        {/* Skills */}
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 mb-1">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {careGiver.skills.map((skill, idx) => {
                              const normalizedSkill = skill
                                .toLowerCase()
                                .replace(/ /g, "_");
                              const isRequired =
                                normalizedRequirements.includes(
                                  normalizedSkill,
                                );
                              return (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 text-xs rounded ${
                                    isRequired
                                      ? "bg-green-100 text-green-800 font-medium"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {isRequired && "✓ "}
                                  {getSkillLabel(skill)}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Gender & Distance */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div
                            className={`flex items-center gap-1 ${
                              matchesGender
                                ? "text-green-600"
                                : "text-orange-600"
                            }`}
                          >
                            <User className="h-4 w-4" />
                            <span>{careGiver.gender}</span>
                            {matchesGender && (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>

                          {careGiver.distance !== undefined &&
                            careGiver.distance !== null && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <MapPin className="h-4 w-4" />
                                <span>{careGiver.distance.toFixed(1)} km</span>
                                {careGiver.travelTime && (
                                  <span className="text-xs text-gray-500">
                                    (~{careGiver.travelTime} min)
                                  </span>
                                )}
                              </div>
                            )}

                          {careGiver.canDrive && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              Can Drive
                            </span>
                          )}

                          {careGiver.address?.city && (
                            <span className="text-xs text-gray-500">
                              {careGiver.address.city}
                            </span>
                          )}
                        </div>

                        {/* Match Reasons */}
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {careGiver.matchData.reasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  reason.startsWith("✓")
                                    ? "bg-green-50 text-green-700"
                                    : reason.startsWith("✗")
                                      ? "bg-orange-50 text-orange-700"
                                      : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Warnings */}
                        {!hasAllSkills && requirements.length > 0 && (
                          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-xs text-yellow-800 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Missing some required skills
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing || scheduling}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All Data
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={scheduling}
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={
                scheduling ||
                !selectedCareGiver ||
                (visit.doubleHanded && !selectedSecondaryCareGiver)
              }
              className="btn-primary flex items-center gap-2"
            >
              {scheduling ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Schedule Appointment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManualScheduleModal;
