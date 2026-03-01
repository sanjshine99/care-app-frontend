import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, KeyRound, Copy, X } from 'lucide-react';
import { userService } from '../../services/userService';
import { toast } from 'react-toastify';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';

function buildCredentialMessage(email, temporaryPassword) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const loginUrl = `${baseUrl}/login`;
  return `You have access to the Care Scheduling System. Sign in at ${loginUrl} with:\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease change your password after first login.`;
}

function UsersList() {
  const navigate = useNavigate();
  const confirmDialog = useConfirmDialog();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [credentialModal, setCredentialModal] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });

      if (response?.success && response?.data) {
        setUsers(response.data.users || []);
        setPagination(
          response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        );
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, pagination.page]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetPassword = async (user) => {
    const ok = await confirmDialog.confirm({
      title: 'Generate temporary password?',
      message: `Generate a new temporary password for ${user.name}? They will need to be sent the new credentials.`,
      confirmLabel: 'Generate password',
    });
    if (!ok) return;
    try {
      const response = await userService.resetPassword(user._id);
      if (response?.success && response?.data?.temporaryPassword) {
        const message = buildCredentialMessage(user.email, response.data.temporaryPassword);
        setCredentialModal({ message, title: 'Password reset – send to user' });
      } else {
        toast.error('Failed to reset password');
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || 'Failed to reset password';
      toast.error(msg);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Could not copy')
    );
  };

  const goToPage = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-600 mt-2">Manage system users</p>
        </div>
        <button
          onClick={() => navigate('/users/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add User
        </button>
      </div>

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

      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No users found</p>
            {search && (
              <button
                onClick={() => setSearch('')}
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
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
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
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{u.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/users/${u._id}/edit`)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="text-amber-600 hover:text-amber-900"
                          title="Reset password"
                        >
                          <KeyRound className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
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

      {credentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{credentialModal.title}</h3>
              <button
                onClick={() => setCredentialModal(null)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap break-words mb-4 max-h-64 overflow-y-auto">
              {credentialModal.message}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(credentialModal.message)}
                className="btn-primary flex items-center gap-2"
              >
                <Copy className="h-5 w-5" />
                Copy to clipboard
              </button>
              <button
                onClick={() => setCredentialModal(null)}
                className="btn-secondary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersList;
