// Custom hook — encapsulates all state and handlers for GenerateSchedule page
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useUnscheduledCheck } from "../../contexts/UnscheduledCheckContext";
import { useScheduleGeneration } from "../../contexts/ScheduleGenerationContext";
import { useConfirmDialog } from "../../contexts/ConfirmDialogContext";

export function useGenerateSchedule() {
  const navigate = useNavigate();
  const { lastCheck, isChecking, runCheck } = useUnscheduledCheck();
  const { lastGeneration, isGenerating, runGeneration, clearLastGeneration } =
    useScheduleGeneration();
  const confirmDialog = useConfirmDialog();

  const [startDate, setStartDate] = useState(
    moment().add(1, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    moment().add(1, "month").format("YYYY-MM-DD"),
  );
  const [careReceivers, setCareReceivers] = useState([]);
  const [selectedReceivers, setSelectedReceivers] = useState([]);
  const [showFailureDetails, setShowFailureDetails] = useState(false);

  // Derived state
  const results = lastGeneration
    ? {
        success: lastGeneration.success,
        scheduled: lastGeneration.summary?.totalScheduled ?? 0,
        failed: lastGeneration.summary?.totalFailed ?? 0,
        details: lastGeneration.results ?? [],
        error: lastGeneration.error ?? null,
      }
    : null;

  const unscheduledSummary =
    lastCheck?.data?.unscheduled != null
      ? {
          total: lastCheck.data.unscheduled.reduce(
            (sum, item) => sum + (item.missing || 0),
            0,
          ),
          byCareReceiver: lastCheck.data.unscheduled,
          lastCheckedAt: lastCheck.completedAt,
          lastCheckRange: { startDate: lastCheck.startDate, endDate: lastCheck.endDate },
        }
      : null;

  const hasChecked = lastCheck != null;
  const loading = isChecking;
  const generating = isGenerating;
  const rangeMatches =
    lastCheck &&
    lastCheck.startDate === startDate &&
    lastCheck.endDate === endDate;

  const daysBetween = moment(endDate).diff(moment(startDate), "days") + 1;
  const isMaxRange = daysBetween >= 30;

  useEffect(() => {
    api
      .get("/carereceivers", { params: { isActive: true } })
      .then((r) => {
        if (r.data.success) setCareReceivers(r.data.data.careReceivers || []);
      })
      .catch(() => toast.error("Failed to load care receivers"));
  }, []);

  const handleStartDateChange = (newStart) => {
    const start = moment(newStart);
    const maxEnd = start.clone().add(1, "month");
    setStartDate(start.format("YYYY-MM-DD"));
    if (moment(endDate).isAfter(maxEnd)) {
      setEndDate(maxEnd.format("YYYY-MM-DD"));
      toast.info("End date adjusted to 1 month maximum");
    }
  };

  const handleEndDateChange = (newEnd) => {
    const start = moment(startDate);
    const end = moment(newEnd);
    const maxEnd = start.clone().add(1, "month");
    if (end.isAfter(maxEnd)) {
      toast.error("Maximum date range is 1 month");
      setEndDate(maxEnd.format("YYYY-MM-DD"));
    } else if (end.isBefore(start)) {
      toast.error("End date must be after start date");
      setEndDate(start.format("YYYY-MM-DD"));
    } else {
      setEndDate(end.format("YYYY-MM-DD"));
    }
  };

  const toggleCareReceiver = (id) => {
    setSelectedReceivers((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id],
    );
  };

  const selectAllWithUnscheduled = () => {
    if (!unscheduledSummary) return;
    const ids = unscheduledSummary.byCareReceiver
      .filter((item) => item.missing > 0)
      .map((item) => item.careReceiver.id);
    setSelectedReceivers(ids);
    toast.success(`Selected ${ids.length} care receivers with unscheduled appointments`);
  };

  const handleCheckUnscheduled = () => {
    runCheck(startDate, endDate);
  };

  const handleGenerate = async () => {
    if (selectedReceivers.length === 0) {
      toast.error("Please select at least one care receiver");
      return;
    }

    const unscheduledCount =
      unscheduledSummary?.byCareReceiver
        .filter((item) => selectedReceivers.includes(item.careReceiver.id))
        .reduce((sum, item) => sum + item.missing, 0) || 0;

    const ok = await confirmDialog.confirm({
      title: "Generate schedule?",
      message:
        `Generate schedule for ${selectedReceivers.length} care receiver(s)?\n\n` +
        `This will attempt to schedule ${unscheduledCount} unscheduled appointments ` +
        `from ${moment(startDate).format("MMM D, YYYY")} to ${moment(endDate).format("MMM D, YYYY")}. ` +
        `You can leave this page; you will be notified when generation completes.`,
      confirmLabel: "Generate",
    });
    if (!ok) return;

    setShowFailureDetails(false);
    runGeneration(selectedReceivers, startDate, endDate);
  };

  const handleClearResults = () => {
    clearLastGeneration();
    setSelectedReceivers([]);
    setShowFailureDetails(false);
  };

  return {
    // date range
    startDate,
    endDate,
    daysBetween,
    isMaxRange,
    handleStartDateChange,
    handleEndDateChange,
    // care receivers
    careReceivers,
    selectedReceivers,
    toggleCareReceiver,
    selectAllWithUnscheduled,
    // check / generate
    loading,
    generating,
    hasChecked,
    rangeMatches,
    unscheduledSummary,
    results,
    lastGeneration,
    handleCheckUnscheduled,
    handleGenerate,
    handleClearResults,
    // failure details
    showFailureDetails,
    setShowFailureDetails,
    // navigation
    navigate,
  };
}
