import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { careReceiverService } from '../../services/careReceiverService';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';

const SCHEDULE_POLL_INTERVAL_MS = 4000;
const SCHEDULE_POLL_DURATION_MS = 90000;

function CareReceiversList() {
  const navigate = useNavigate();
  const location = useLocation();
  const confirmDialog = useConfirmDialog();
  const [careReceivers, setCareReceivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const schedulePollTimeoutRef = useRef(null);

  useEffect(() => { loadCareReceivers(1); }, [search]);

  useEffect(() => {
    const state = location.state;
    const careReceiverId = state?.careReceiverId;
    const queued = state?.scheduleGenerationQueued === true;
    if (!queued || !careReceiverId) return;

    const idStr = String(careReceiverId);
    let elapsed = 0;

    const poll = async () => {
      if (elapsed >= SCHEDULE_POLL_DURATION_MS) return;
      try {
        const res = await api.get('/notifications', {
          params: { limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
        });
        const list = res?.data?.data?.notifications ?? [];
        const match = list.find(
          (n) => String(n.metadata?.details?.careReceiverId) === idStr &&
            (n.metadata?.action === 'schedule_generated' || n.metadata?.action === 'schedule_generation_failed')
        );
        if (match) {
          if (match.metadata?.action === 'schedule_generation_failed') {
            toast.error(
              `Auto-scheduling failed: ${match.message || 'Please check notifications.'}`
            );
          } else {
            const scheduled = match.metadata?.details?.scheduled ?? 0;
            const failed = match.metadata?.details?.failed ?? 0;
            toast.success(
              `${scheduled} appointments assigned successfully, ${failed} could not be assigned.`
            );
          }
          navigate('/carereceivers', { replace: true, state: {} });
          return;
        }
      } catch (_) {
        // ignore
      }
      elapsed += SCHEDULE_POLL_INTERVAL_MS;
      schedulePollTimeoutRef.current = setTimeout(poll, SCHEDULE_POLL_INTERVAL_MS);
    };

    schedulePollTimeoutRef.current = setTimeout(poll, SCHEDULE_POLL_INTERVAL_MS);
    return () => {
      if (schedulePollTimeoutRef.current) {
        clearTimeout(schedulePollTimeoutRef.current);
      }
    };
  }, [location.state?.scheduleGenerationQueued, location.state?.careReceiverId, navigate]);

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
    const ok = await confirmDialog.confirm({
      title: 'Delete care receiver?',
      message: `Are you sure you want to delete ${name}?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await careReceiverService.delete(id);
      toast.success('Care receiver deleted successfully');
      loadCareReceivers(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete care receiver');
    }
  };

  return (
    <div className="p-6 flex flex-col">
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
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
          <span className="flex items-center justify-center pl-3 text-gray-400" aria-hidden="true">
            <Search className="h-5 w-5 shrink-0" />
          </span>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 py-2 pr-3 border-0 bg-transparent text-gray-900 placeholder:text-gray-400 focus:ring-0 focus:outline-none"
          />
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
