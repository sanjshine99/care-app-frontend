import { useRef, useEffect, useCallback } from "react";
import moment from "moment";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatDateForAPI } from "../../utils/dateUtils";

const PANEL_ID = "schedule-filters-dialog";

function ScheduleFiltersPopover({
  open,
  onOpenChange,
  dateRange,
  setDateRange,
  activeQuickRange,
  onQuickRange,
  onApplyDateRange,
  onPreviousMonth,
  onNextMonth,
  calendarFilterType,
  onFilterTypeChange,
  calendarFilterCareGiverId,
  onCareGiverIdChange,
  calendarFilterCareReceiverId,
  onCareReceiverIdChange,
  careGiverOptions,
  careReceiverOptions,
  appointmentsCount,
}) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, close]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, close]);

  const handleClearEntityFilters = () => {
    onFilterTypeChange("all");
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary inline-flex items-center gap-2"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={PANEL_ID}
        onClick={() => onOpenChange(!open)}
      >
        <Filter className="h-4 w-4" aria-hidden />
        Filters
      </button>

      {open && (
        <div
          id={PANEL_ID}
          role="dialog"
          aria-label="Schedule filters"
          className="absolute right-0 mt-2 z-50 w-[calc(100vw-2rem)] max-w-md min-w-[280px] max-h-[min(85vh,640px)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="p-4 sm:p-5 space-y-6">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <h3 className="font-semibold text-gray-900">Schedule filters</h3>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onPreviousMonth}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  title="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-xs font-medium text-gray-600 px-1 whitespace-nowrap">
                  {moment(dateRange.start).format("MMM YYYY")}
                </span>
                <button
                  type="button"
                  onClick={onNextMonth}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  title="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <section aria-labelledby="schedule-filters-date-heading">
              <h4 id="schedule-filters-date-heading" className="text-sm font-semibold text-gray-800 mb-3">
                Date range
              </h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { key: "today", label: "Today" },
                  { key: "this_week", label: "This Week" },
                  { key: "this_month", label: "This Month" },
                  { key: "last_month", label: "Last Month" },
                  { key: "all_time", label: "Last 90 Days" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onQuickRange(key)}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded transition-colors ${
                      activeQuickRange === key
                        ? "bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-1"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
                  <input
                    type="date"
                    value={formatDateForAPI(dateRange.start)}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, start: new Date(e.target.value) }))
                    }
                    className="input w-full text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[140px] w-full sm:w-auto">
                  <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
                  <input
                    type="date"
                    value={formatDateForAPI(dateRange.end)}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: new Date(e.target.value) }))
                    }
                    min={formatDateForAPI(dateRange.start)}
                    className="input w-full text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApplyDateRange();
                  }}
                  disabled={!dateRange.start || !dateRange.end}
                  className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Apply
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Showing{" "}
                <strong>{moment(dateRange.start).format("MMM D, YYYY")}</strong> –{" "}
                <strong>{moment(dateRange.end).format("MMM D, YYYY")}</strong>
                {typeof appointmentsCount === "number" ? (
                  <>
                    {" "}
                    · {appointmentsCount} appointment{appointmentsCount !== 1 ? "s" : ""}
                  </>
                ) : null}
              </p>
            </section>

            <section className="border-t border-gray-100 pt-5" aria-labelledby="schedule-filters-entity-heading">
              <h4 id="schedule-filters-entity-heading" className="text-sm font-semibold text-gray-800 mb-3">
                Calendar view
              </h4>
              <p className="text-xs text-gray-500 mb-3">Show appointments for everyone, one care giver, or one care receiver.</p>
              <div className="flex flex-wrap gap-4 items-center mb-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleFiltersEntity"
                    checked={calendarFilterType === "all"}
                    onChange={() => onFilterTypeChange("all")}
                    className="text-primary-600"
                  />
                  All
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleFiltersEntity"
                    checked={calendarFilterType === "care_giver"}
                    onChange={() => onFilterTypeChange("care_giver")}
                    className="text-primary-600"
                  />
                  Care giver
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="scheduleFiltersEntity"
                    checked={calendarFilterType === "care_receiver"}
                    onChange={() => onFilterTypeChange("care_receiver")}
                    className="text-primary-600"
                  />
                  Care receiver
                </label>
              </div>
              {calendarFilterType === "care_giver" && (
                <div>
                  <label htmlFor="schedule-popover-filter-cg" className="block text-xs font-medium text-gray-600 mb-1">
                    Care giver
                  </label>
                  <select
                    id="schedule-popover-filter-cg"
                    className="input w-full text-sm"
                    value={calendarFilterCareGiverId}
                    onChange={(e) => onCareGiverIdChange(e.target.value)}
                  >
                    <option value="">Select care giver…</option>
                    {careGiverOptions.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {calendarFilterType === "care_receiver" && (
                <div>
                  <label htmlFor="schedule-popover-filter-cr" className="block text-xs font-medium text-gray-600 mb-1">
                    Care receiver
                  </label>
                  <select
                    id="schedule-popover-filter-cr"
                    className="input w-full text-sm"
                    value={calendarFilterCareReceiverId}
                    onChange={(e) => onCareReceiverIdChange(e.target.value)}
                  >
                    <option value="">Select care receiver…</option>
                    {careReceiverOptions.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
              <button type="button" className="btn-secondary text-sm" onClick={handleClearEntityFilters}>
                Clear calendar filter
              </button>
              <button type="button" className="btn-primary text-sm" onClick={close}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleFiltersPopover;
