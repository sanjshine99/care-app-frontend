import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { careGiverService } from "../../services/careGiverService";
import { toast } from "react-toastify";
import { Calendar } from "lucide-react";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

function CareGiversList() {
  const navigate = useNavigate();
  const confirmDialog = useConfirmDialog();
  const [careGivers, setCareGivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    loadCareGivers();
  }, [search]); // Remove pagination.page from dependencies to avoid infinite loop

  const loadCareGivers = async () => {
    try {
      setLoading(true);
      const response = await careGiverService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });

      if (response?.success && response?.data) {
        setCareGivers(response.data.careGivers || []);
        setPagination(
          response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        );
      } else {
        setCareGivers([]);
      }
    } catch (error) {
      console.error("Error loading care givers:", error);
      setCareGivers([]);
      toast.error("Failed to load care givers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirmDialog.confirm({
      title: "Delete care giver?",
      message: `Are you sure you want to delete ${name}?`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await careGiverService.delete(id);
      toast.success("Care giver deleted successfully");
      loadCareGivers();
    } catch (error) {
      const message =
        error.response?.data?.error?.message || "Failed to delete care giver";
      toast.error(message);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Care Givers</h1>
          <p className="text-gray-600 mt-2">Manage your care giver team</p>
        </div>
        <button
          onClick={() => navigate("/caregivers/new")}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Care Giver
        </button>
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
          <span className="flex items-center justify-center pl-3 text-gray-400" aria-hidden="true">
            <Search className="h-5 w-5 shrink-0" />
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearchChange}
            className="min-w-0 flex-1 py-2 pr-3 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 mt-4">Loading care givers...</p>
          </div>
        ) : careGivers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No care givers found</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-primary-600 hover:underline mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {careGivers.map((cg) => (
                    <tr key={cg._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {cg.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {cg.address?.postcode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cg.email}</div>
                        <div className="text-sm text-gray-500">{cg.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {cg.skills?.slice(0, 2).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              {skill.replace("_", " ")}
                            </span>
                          ))}
                          {cg.skills?.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              +{cg.skills.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            cg.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cg.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/caregivers/${cg._id}`)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => navigate(`/caregivers/${cg._id}/edit`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/caregivers/${cg._id}/availability`)
                          }
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Manage Availability"
                        >
                          <Calendar className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(cg._id, cg.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newPage = pagination.page - 1;
                      setPagination((prev) => ({ ...prev, page: newPage }));
                      // Manually trigger reload
                      setTimeout(() => loadCareGivers(), 0);
                    }}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = pagination.page + 1;
                      setPagination((prev) => ({ ...prev, page: newPage }));
                      // Manually trigger reload
                      setTimeout(() => loadCareGivers(), 0);
                    }}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CareGiversList;
