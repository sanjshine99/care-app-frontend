import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { careReceiverService } from '../../services/careReceiverService';
import { toast } from 'react-toastify';

function CareReceiversList() {
  const navigate = useNavigate();
  const [careReceivers, setCareReceivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  useEffect(() => { loadCareReceivers(1); }, [search]);

  const loadCareReceivers = async (page = pagination.page) => {
    try {
      setLoading(true);
      const response = await careReceiverService.getAll({ page, limit: pagination.limit, search: search || undefined });
      if (response?.success && response?.data) {
        setCareReceivers(response.data.careReceivers || []);
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      } else { setCareReceivers([]); }
    } catch (error) {
      setCareReceivers([]);
      toast.error('Failed to load care receivers');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm('Are you sure you want to delete ' + name + '?')) {
      try {
        await careReceiverService.delete(id);
        toast.success('Care receiver deleted successfully');
        loadCareReceivers(pagination.page);
      } catch (error) {
        toast.error(error.response?.data?.error?.message || 'Failed to delete care receiver');
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Care Receivers</h1>
          <p className="text-gray-600 mt-2">Manage care recipients</p>
        </div>
        <button onClick={() => navigate('/carereceivers/new')} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add Care Receiver
        </button>
      </div>
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        ) : careReceivers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No care receivers found</p>
            {search && <button onClick={() => setSearch('')} className="text-primary-600 hover:underline mt-2">Clear search</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {careReceivers.map((cr) => (
                    <tr key={cr._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{cr.name}</div>
                        <div className="text-sm text-gray-500">{cr.address?.postcode || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cr.email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{cr.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cr.dailyVisits?.length || 0} visits</div>
                        {cr.dailyVisits?.some((v) => v.doubleHanded) && <span className="text-xs text-orange-600">Double-handed</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={'px-2 py-1 text-xs font-semibold rounded ' + (cr.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                          {cr.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => navigate('/carereceivers/' + cr._id)} className="text-primary-600 hover:text-primary-900 mr-3" title="View"><Eye className="h-5 w-5 inline" /></button>
                        <button onClick={() => navigate('/carereceivers/' + cr._id + '/edit')} className="text-blue-600 hover:text-blue-900 mr-3" title="Edit"><Edit className="h-5 w-5 inline" /></button>
                        <button onClick={() => handleDelete(cr._id, cr.name)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="h-5 w-5 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadCareReceivers(pagination.page - 1)} disabled={pagination.page === 1} className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <span className="px-3 py-1">Page {pagination.page} of {pagination.pages}</span>
                  <button onClick={() => loadCareReceivers(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CareReceiversList;
