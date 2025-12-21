// frontend/src/pages/Schedule/UnscheduledList.jsx
// List of unscheduled appointments with manual scheduling capability

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ManualScheduleModal from "./ManualScheduleModal";

function UnscheduledList({ unscheduled, onScheduleSuccess, loading }) {
  const [expandedCareReceiver, setExpandedCareReceiver] = useState(null);
  const [selectedForScheduling, setSelectedForScheduling] = useState(null);

  const toggleExpand = (careReceiverId) => {
    setExpandedCareReceiver(
      expandedCareReceiver === careReceiverId ? null : careReceiverId
    );
  };

  const handleScheduleClick = (careReceiver, visit, date) => {
    setSelectedForScheduling({
      careReceiver,
      visit,
      date,
    });
  };

  const handleScheduleSuccess = () => {
    setSelectedForScheduling(null);
    onScheduleSuccess();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (unscheduled.length === 0) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          All Appointments Scheduled!
        </h3>
        <p className="text-gray-600">
          There are no unscheduled appointments in the selected date range.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {unscheduled.map((item) => (
          <div key={item.careReceiver.id} className="card">
            {/* Care Receiver Header */}
            <button
              onClick={() => toggleExpand(item.careReceiver.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-primary-600" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">
                    {item.careReceiver.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {item.careReceiver.dailyVisits} daily visit
                    {item.careReceiver.dailyVisits !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Missing Appointments</p>
                  <p className="text-2xl font-bold text-red-600">
                    {item.missing}
                  </p>
                </div>
                {expandedCareReceiver === item.careReceiver.id ? (
                  <ChevronUp className="h-6 w-6 text-gray-400" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedCareReceiver === item.careReceiver.id && (
              <div className="border-t mt-4 pt-4">
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Expected:</span>{" "}
                    {item.expected}
                  </div>
                  <div>
                    <span className="font-medium">Actual:</span> {item.actual}
                  </div>
                  <div>
                    <span className="font-medium text-red-600">Missing:</span>{" "}
                    {item.missing}
                  </div>
                </div>

                {/* Show detailed breakdown if available */}
                {item.details && item.details.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Unscheduled Appointments:
                    </h4>
                    {item.details.map((detail, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="h-5 w-5 text-red-600" />
                              <p className="font-medium text-gray-800">
                                {detail.date} - Visit {detail.visitNumber}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Time:</span>{" "}
                              {detail.preferredTime} ({detail.duration} minutes)
                            </p>
                            <p className="text-sm text-red-600">
                              <span className="font-medium">Reason:</span>{" "}
                              {detail.reason}
                            </p>
                            {detail.requirements &&
                              detail.requirements.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1">
                                    Required Skills:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {detail.requirements.map((req, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-white text-gray-700 text-xs rounded"
                                      >
                                        {req.replace(/_/g, " ")}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          <button
                            onClick={() =>
                              handleScheduleClick(
                                item.careReceiver,
                                detail,
                                detail.date
                              )
                            }
                            className="btn-primary text-sm whitespace-nowrap"
                          >
                            Schedule Manually
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manual Schedule Modal */}
      {selectedForScheduling && (
        <ManualScheduleModal
          careReceiver={selectedForScheduling.careReceiver}
          visit={selectedForScheduling.visit}
          date={selectedForScheduling.date}
          onClose={() => setSelectedForScheduling(null)}
          onSuccess={handleScheduleSuccess}
        />
      )}
    </>
  );
}

export default UnscheduledList;
