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
      loadCareGiver(); // Reload to get fresh data
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          onClick={() => navigate("/caregivers")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Care Givers
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          Availability for {careGiver?.name}
        </h1>
        <p className="text-gray-600 mt-2">
          Manage weekly schedule and time-off periods
        </p>
      </div>

      <AvailabilityManager careGiver={careGiver} onSave={handleSave} />
    </div>
  );
}

export default CareGiverAvailability;
