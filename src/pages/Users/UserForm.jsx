import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Copy, X } from 'lucide-react';
import { userService } from '../../services/userService';
import { toast } from 'react-toastify';

function buildCredentialMessage(email, temporaryPassword) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const loginUrl = `${baseUrl}/login`;
  return `You have access to the Care Scheduling System. Sign in at ${loginUrl} with:\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\nPlease change your password after first login.`;
}

function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [credentialMessage, setCredentialMessage] = useState(null);

  useEffect(() => {
    if (isEdit) {
      loadUser();
    }
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await userService.getById(id);
      if (response?.success && response?.data?.user) {
        const u = response.data.user;
        setFormData({ name: u.name || '', email: u.email || '' });
      }
    } catch (error) {
      toast.error('Failed to load user');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await userService.update(id, formData);
        toast.success('User updated successfully');
        navigate('/users');
      } else {
        const response = await userService.create(formData);
        if (response?.success && response?.data?.temporaryPassword) {
          const message = buildCredentialMessage(
            response.data.user.email,
            response.data.temporaryPassword
          );
          setCredentialMessage(message);
          toast.success('User created. Copy the credentials below and send them to the user.');
        } else {
          toast.error('Failed to create user');
        }
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || `Failed to ${isEdit ? 'update' : 'create'} user`;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Could not copy')
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-center min-h-[200px] py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="text-gray-500 hover:text-gray-800"
            title="Back"
            aria-label="Back to users"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isEdit ? 'Edit User' : 'Add User'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEdit ? 'Update name and email.' : 'A temporary password will be generated. Share the credentials with the user.'}
            </p>
          </div>
        </div>

        {credentialMessage ? (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Send these credentials to the user</h2>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap break-words mb-4 max-h-64 overflow-y-auto">
              {credentialMessage}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(credentialMessage)}
                className="btn-primary flex items-center gap-2"
              >
                <Copy className="h-5 w-5" />
                Copy to clipboard
              </button>
              <button onClick={() => navigate('/users')} className="btn-secondary">
                Back to list
              </button>
              <button
                onClick={() => {
                  setCredentialMessage(null);
                  setFormData({ name: '', email: '' });
                }}
                className="btn-secondary"
              >
                Add another user
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder="jane@example.com"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    {isEdit ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {isEdit ? 'Save changes' : 'Create user'}
                  </>
                )}
              </button>
              <button type="button" onClick={() => navigate('/users')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default UserForm;
