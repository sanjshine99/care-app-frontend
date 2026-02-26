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
  const [addressErrors, setAddressErrors] = useState({ street: '', city: '', postcode: '' });
  const [postcodeStatus, setPostcodeStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid'
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
      // Auto-uppercase UK postcode as user types
      const processedValue = field === 'postcode' ? value.toUpperCase() : value;
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: processedValue,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const validatePostcode = async (postcode) => {
    if (!postcode) {
      setAddressErrors((prev) => ({ ...prev, postcode: 'Postcode is required' }));
      setPostcodeStatus('invalid');
      return;
    }
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/;
    if (!ukPostcodeRegex.test(postcode)) {
      setAddressErrors((prev) => ({ ...prev, postcode: 'Invalid UK postcode format (e.g. SW1A 1AA)' }));
      setPostcodeStatus('invalid');
      return;
    }
    setPostcodeStatus('validating');
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}/validate`
      );
      const data = await res.json();
      if (data.result === true) {
        setAddressErrors((prev) => ({ ...prev, postcode: '' }));
        setPostcodeStatus('valid');
      } else {
        setAddressErrors((prev) => ({ ...prev, postcode: 'This postcode does not exist in the UK' }));
        setPostcodeStatus('invalid');
      }
    } catch {
      // API unavailable — fall back to format-only validation
      setAddressErrors((prev) => ({ ...prev, postcode: '' }));
      setPostcodeStatus('valid');
    }
  };

  const handleAddressBlur = (e) => {
    const { name, value } = e.target;
    const field = name.split('.')[1];
    if (field === 'street') {
      setAddressErrors((prev) => ({
        ...prev,
        street: value.trim() ? '' : 'Street address is required',
      }));
    }
    if (field === 'city') {
      setAddressErrors((prev) => ({
        ...prev,
        city: value.trim() ? '' : 'City is required',
      }));
    }
    if (field === 'postcode') {
      validatePostcode(value.trim());
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

    if (postcodeStatus !== 'valid') {
      toast.error('Please enter a valid UK postcode and wait for verification');
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/caregivers')}
              className="text-gray-500 hover:text-gray-800"
              title="Back"
              aria-label="Back to care givers"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              {isEdit ? 'Edit Care Giver' : 'Add New Care Giver'}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {isEdit && loading ? (
          <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[200px] py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" aria-hidden="true" />
          </div>
        ) : (
      <form id="care-giver-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-6">
        {/* Personal Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          
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
                pattern="^[A-Za-z\s'\-]+$"
                title="Name must contain letters only"
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
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Address <span className="text-sm font-normal text-blue-600">(UK addresses only)</span></h2>

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
                onBlur={handleAddressBlur}
                required
                className={`input ${addressErrors.street ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="10 Downing Street"
              />
              {addressErrors.street && (
                <p className="text-xs text-red-500 mt-1">{addressErrors.street}</p>
              )}
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
                  onBlur={handleAddressBlur}
                  required
                  className={`input ${addressErrors.city ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="London"
                />
                {addressErrors.city && (
                  <p className="text-xs text-red-500 mt-1">{addressErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address.postcode"
                    value={formData.address.postcode}
                    onChange={handleChange}
                    onBlur={handleAddressBlur}
                    required
                    className={`input pr-10 ${
                      postcodeStatus === 'invalid'
                        ? 'border-red-500 focus:ring-red-500'
                        : postcodeStatus === 'valid'
                        ? 'border-green-500 focus:ring-green-500'
                        : ''
                    }`}
                    placeholder="SW1A 1AA"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {postcodeStatus === 'validating' && (
                      <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                    )}
                    {postcodeStatus === 'valid' && (
                      <span className="text-green-500 font-bold text-sm">✓</span>
                    )}
                    {postcodeStatus === 'invalid' && (
                      <span className="text-red-500 font-bold text-sm">✗</span>
                    )}
                  </div>
                </div>
                {addressErrors.postcode ? (
                  <p className="text-xs text-red-500 mt-1">{addressErrors.postcode}</p>
                ) : postcodeStatus === 'valid' ? (
                  <p className="text-xs text-green-600 mt-1">Valid UK postcode</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">UK postcode format (e.g. SW1A 1AA)</p>
                )}
              </div>

              <div className="flex items-end pb-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-sm" aria-label="Country">United Kingdom</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Skills & Capabilities *</h2>
          
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
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Additional Settings</h2>
          
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
      </form>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t bg-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/caregivers')}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="care-giver-form"
            className="btn-primary flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {isEdit ? 'Update' : 'Create'} Care Giver
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CareGiverForm;
