// frontend/src/pages/Settings/Settings.jsx
// Complete settings page with backend integration

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    scheduling: {
      maxDistanceKm: 20,
      travelTimeBufferMinutes: 15,
      autoScheduleEnabled: true,
      preferLocalCareGivers: true,
      requireSkillMatch: true,
      allowDoubleBooking: false,
      maxAppointmentsPerDay: 8,
      defaultAppointmentDuration: 60,
    },
    notifications: {
      scheduleGeneratedNotify: true,
      unscheduledNotify: true,
      missedAppointmentNotify: true,
      notificationRetentionDays: 90,
    },
    system: {
      workingHoursStart: "07:00",
      workingHoursEnd: "22:00",
      timezone: "Europe/London",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/settings");

      if (response.data.success) {
        setSettings(response.data.data.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/settings", settings);

      if (response.data.success) {
        toast.success(
          " Settings saved successfully! Changes will take effect immediately.",
        );
        setSettings(response.data.data.settings);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      const message =
        error.response?.data?.error?.message || "Failed to save settings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset all settings to defaults?",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const response = await api.post("/settings/reset");

      if (response.data.success) {
        toast.success("Settings reset to defaults");
        setSettings(response.data.data.settings);
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  const updateScheduling = (field, value) => {
    setSettings({
      ...settings,
      scheduling: {
        ...settings.scheduling,
        [field]: value,
      },
    });
  };

  const updateNotifications = (field, value) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [field]: value,
      },
    });
  };

  const updateSystem = (field, value) => {
    setSettings({
      ...settings,
      system: {
        ...settings.system,
        [field]: value,
      },
    });
  };

  return (
    <div className="p-6 flex flex-col">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-primary-600" />
              System Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure system preferences and scheduling parameters
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              disabled={loading || saving}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={handleReset}
              disabled={loading || saving}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <AlertCircle className="h-5 w-5" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px] py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" aria-hidden="true" />
          </div>
        ) : (
        <>
        {/* Scheduling Settings */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Scheduling Settings
              </h2>
              <p className="text-sm text-gray-600">
                Configure how the scheduling algorithm works
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Distance (km) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.scheduling.maxDistanceKm}
                onChange={(e) =>
                  updateScheduling("maxDistanceKm", parseInt(e.target.value))
                }
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum distance between care giver and care receiver (1-100 km)
              </p>
            </div>

            {/* Travel Time Buffer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Travel Time Buffer (minutes) *
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.scheduling.travelTimeBufferMinutes}
                onChange={(e) =>
                  updateScheduling(
                    "travelTimeBufferMinutes",
                    parseInt(e.target.value),
                  )
                }
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Extra time added to travel time between appointments (0-60 min)
              </p>
            </div>

            {/* Max Appointments Per Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Appointments Per Day
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.scheduling.maxAppointmentsPerDay}
                onChange={(e) =>
                  updateScheduling(
                    "maxAppointmentsPerDay",
                    parseInt(e.target.value),
                  )
                }
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum appointments per care giver per day (1-20)
              </p>
            </div>

            {/* Default Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Appointment Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="240"
                step="15"
                value={settings.scheduling.defaultAppointmentDuration}
                onChange={(e) =>
                  updateScheduling(
                    "defaultAppointmentDuration",
                    parseInt(e.target.value),
                  )
                }
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default duration for new appointments (15-240 min)
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="mt-6 space-y-3 border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scheduling.autoScheduleEnabled}
                onChange={(e) =>
                  updateScheduling("autoScheduleEnabled", e.target.checked)
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Enable Auto-Scheduling
                </span>
                <p className="text-xs text-gray-500">
                  Allow system to automatically schedule appointments
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scheduling.preferLocalCareGivers}
                onChange={(e) =>
                  updateScheduling("preferLocalCareGivers", e.target.checked)
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Prefer Local Care Givers
                </span>
                <p className="text-xs text-gray-500">
                  Prioritize care givers closer to care receiver
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scheduling.requireSkillMatch}
                onChange={(e) =>
                  updateScheduling("requireSkillMatch", e.target.checked)
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Require Skill Match
                </span>
                <p className="text-xs text-gray-500">
                  Only schedule care givers with exact required skills
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scheduling.allowDoubleBooking}
                onChange={(e) =>
                  updateScheduling("allowDoubleBooking", e.target.checked)
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Allow Double Booking
                </span>
                <p className="text-xs text-gray-500 text-orange-600">
                  Allow overlapping appointments (not recommended)
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Scheduling Algorithm Impact
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Changes to <strong>Maximum Distance</strong> and{" "}
                  <strong>Travel Time Buffer</strong> will immediately affect
                  the scheduling algorithm when generating new schedules.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Notification Settings
              </h2>
              <p className="text-sm text-gray-600">
                Configure system notifications
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.scheduleGeneratedNotify}
                onChange={(e) =>
                  updateNotifications(
                    "scheduleGeneratedNotify",
                    e.target.checked,
                  )
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Schedule Generation Notifications
                </span>
                <p className="text-xs text-gray-500">
                  Notify when schedules are generated
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.unscheduledNotify}
                onChange={(e) =>
                  updateNotifications("unscheduledNotify", e.target.checked)
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Unscheduled Appointment Notifications
                </span>
                <p className="text-xs text-gray-500">
                  Notify about appointments that couldn't be scheduled
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.missedAppointmentNotify}
                onChange={(e) =>
                  updateNotifications(
                    "missedAppointmentNotify",
                    e.target.checked,
                  )
                }
                className="w-5 h-5 text-primary-600 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Missed Appointment Notifications
                </span>
                <p className="text-xs text-gray-500">
                  Notify about missed appointments
                </p>
              </div>
            </label>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Retention (days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={settings.notifications.notificationRetentionDays}
                onChange={(e) =>
                  updateNotifications(
                    "notificationRetentionDays",
                    parseInt(e.target.value),
                  )
                }
                className="input w-48"
              />
              <p className="text-xs text-gray-500 mt-1">
                Days to keep notifications before auto-delete (7-365)
              </p>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                System Settings
              </h2>
              <p className="text-sm text-gray-600">
                General system configuration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Hours Start
              </label>
              <input
                type="time"
                value={settings.system.workingHoursStart}
                onChange={(e) =>
                  updateSystem("workingHoursStart", e.target.value)
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Hours End
              </label>
              <input
                type="time"
                value={settings.system.workingHoursEnd}
                onChange={(e) =>
                  updateSystem("workingHoursEnd", e.target.value)
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={settings.system.dateFormat}
                onChange={(e) => updateSystem("dateFormat", e.target.value)}
                className="input w-full"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                value={settings.system.timeFormat}
                onChange={(e) => updateSystem("timeFormat", e.target.value)}
                className="input w-full"
              >
                <option value="12h">12 Hour (AM/PM)</option>
                <option value="24h">24 Hour</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <input
                type="text"
                value={settings.system.timezone}
                onChange={(e) => updateSystem("timezone", e.target.value)}
                className="input w-full"
                placeholder="Europe/London"
              />
              <p className="text-xs text-gray-500 mt-1">
                IANA timezone identifier (e.g., Europe/London, America/New_York)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            {saving ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Changes to scheduling settings will take
            effect immediately and will be used the next time schedules are
            generated. Existing appointments will not be affected.
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default Settings;
