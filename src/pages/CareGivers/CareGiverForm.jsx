import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { careGiverService } from '../../services/careGiverService';
import { toast } from 'react-toastify';

const skillOptions = [
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'medication_management', label: 'Medication Management' },
  { value: 'dementia_care', label: 'Dementia Care' },
  { value: 'mobility_assistance', label: 'Mobility Assistance' },
  { value: 'meal_preparation', label: 'Meal Preparation' },
  { value: 'companionship', label: 'Companionship' },
  { value: 'household_tasks', label: 'Household Tasks' },
  { value: 'specialized_medical', label: 'Specialized Medical' },
];

function CareGiverForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postcode: '',
    },
    gender: 'Female',
    dateOfBirth: '',
    skills: [],
    canDrive: false,
    maxCareReceivers: 10,
    singleHandedOnly: false,
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadCareGiver();
    }
  }, [id]);

  const loadCareGiver = async () => {
    try {
      setLoading(true);
      const response = await careGiverService.getById(id);
      if (response.success) {
        const cg = response.data.careGiver;
        setFormData({
          name: cg.name || '',
          email: cg.email || '',
          phone: cg.phone || '',
          address: {
            street: cg.address?.street || '',
            city: cg.address?.city || '',
            postcode: cg.address?.postcode || '',
          },
          gender: cg.gender || 'Female',
          dateOfBirth: cg.dateOfBirth ? cg.dateOfBirth.split('T')[0] : '',
          skills: cg.skills || [],
          canDrive: cg.canDrive || false,
          maxCareReceivers: cg.maxCareReceivers || 10,
          singleHandedOnly: cg.singleHandedOnly || false,
          notes: cg.notes || '',
        });
      }
    } catch (error) {
      toast.error('Failed to load care giver');
      navigate('/caregivers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.skills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    try {
      setSaving(true);
      
      if (isEdit) {
        await careGiverService.update(id, formData);
        toast.success('Care giver updated successfully');
      } else {
        await careGiverService.create(formData);
        toast.success('Care giver created successfully');
      }
      
      navigate('/caregivers');
    } catch (error) {
      const message = error.response?.data?.error?.message || 
        `Failed to ${isEdit ? 'update' : 'create'} care giver`;
      toast.error(message);
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/caregivers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Care Givers
        </button>
        <h1 className="text-3xl font-bold text-gray-800">
          {isEdit ? 'Edit Care Giver' : 'Add New Care Giver'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Personal Information */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                pattern="^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$"
                className="input"
                placeholder="07123456789"
              />
              <p className="text-xs text-gray-500 mt-1">UK format: 07123456789</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Address</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                required
                className="input"
                placeholder="10 Downing Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  required
                  className="input"
                  placeholder="London"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode *
                </label>
                <input
                  type="text"
                  name="address.postcode"
                  value={formData.address.postcode}
                  onChange={handleChange}
                  required
                  pattern="^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$"
                  className="input"
                  placeholder="SW1A 1AA"
                />
                <p className="text-xs text-gray-500 mt-1">UK postcode format</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Skills & Capabilities *</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skillOptions.map((skill) => (
              <label
                key={skill.value}
                className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.skills.includes(skill.value)}
                  onChange={() => handleSkillToggle(skill.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">{skill.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold mb-4">Additional Settings</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="canDrive"
                checked={formData.canDrive}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium">Can drive</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="singleHandedOnly"
                checked={formData.singleHandedOnly}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium">Single-handed care only</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Care Receivers
              </label>
              <input
                type="number"
                name="maxCareReceivers"
                value={formData.maxCareReceivers}
                onChange={handleChange}
                min="1"
                max="20"
                className="input w-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                maxLength="500"
                className="input"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>{isEdit ? 'Update' : 'Create'} Care Giver</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/caregivers')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CareGiverForm;
