import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { careGiverService } from "../../services/careGiverService";
import { toast } from "react-toastify";
import AvailabilityManager from "../../components/Availability/AvailabilityManager";

function CareGiverAvailability() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const handleSave = async (data) => {
    try {
      await careGiverService.update(id, data);
      toast.success("Availability updated successfully");
      loadCareGiver();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/caregivers")}
              className="text-gray-500 hover:text-gray-800"
              title="Back"
              aria-label="Back to care givers"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Availability for {careGiver?.name ?? "Care Giver"}
              </h1>
              <p className="text-gray-600 mt-2">
                Manage weekly schedule and time-off periods
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 flex-1 min-h-0">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px] py-12">
              <div
                className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full"
                aria-hidden="true"
              />
            </div>
          ) : (
            <AvailabilityManager careGiver={careGiver} onSave={handleSave} />
          )}
        </div>
      </div>
    </div>
  );
}

export default CareGiverAvailability;
