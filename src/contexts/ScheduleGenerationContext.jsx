import { createContext, useContext, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import api from "../services/api";
import { queryClient } from "../lib/queryClient";
import { useUnscheduledCheck } from "./UnscheduledCheckContext";

const STORAGE_KEY = "scheduleGenerationResult";

const ScheduleGenerationContext = createContext();

export function useScheduleGeneration() {
  const context = useContext(ScheduleGenerationContext);
  if (!context) {
    throw new Error(
      "useScheduleGeneration must be used within ScheduleGenerationProvider"
    );
  }
  return context;
}

function loadFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.completedAt === "number") {
      return parsed;
    }
  } catch (_) {
    // ignore
  }
  return null;
}

function saveToStorage(value) {
  try {
    if (value) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {
    // ignore
  }
}

export function ScheduleGenerationProvider({ children }) {
  const [lastGeneration, setLastGeneration] = useState(loadFromStorage);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) setLastGeneration(stored);
  }, []);

  const runGeneration = (careReceiverIds, startDate, endDate) => {
    if (isGenerating) return;
    if (!careReceiverIds?.length) {
      toast.error("Please select at least one care receiver");
      return;
    }
    setIsGenerating(true);

    const finishWithPayload = (payload) => {
      setLastGeneration(payload);
      saveToStorage(payload);
      setIsGenerating(false);
    };

    api
      .post("/schedule/generate", {
        careReceiverIds,
        startDate,
        endDate,
      })
      .then((response) => {
        const jobId = response.data?.data?.jobId;
        const isQueued = response.status === 202 && jobId;

        if (isQueued) {
          const POLL_INTERVAL_MS = 2500;
          const pollJob = () => {
            api
              .get(`/schedule/jobs/${jobId}`)
              .then((jobRes) => {
                const data = jobRes.data?.data;
                const status = data?.status;
                if (status === "completed") {
                  const summary = data?.resultSummary ?? {};
                  const payload = {
                    completedAt: Date.now(),
                    careReceiverIds,
                    startDate,
                    endDate,
                    success: true,
                    summary: {
                      totalScheduled: summary.totalScheduled ?? 0,
                      totalFailed: summary.totalFailed ?? 0,
                      careReceiversProcessed: summary.careReceiversProcessed ?? 0,
                    },
                    results: summary.results ?? [],
                    error: null,
                  };
                  finishWithPayload(payload);
                  const scheduled = payload.summary.totalScheduled;
                  const failed = payload.summary.totalFailed;
                  toast.success(
                    `Schedule generation complete – ${scheduled} scheduled` +
                      (failed > 0 ? `, ${failed} could not be scheduled` : "") + ".",
                    { autoClose: 5000 }
                  );
                  return;
                }
                if (status === "failed") {
                  const errorMessage = data?.errorMessage ?? "Generation failed";
                  const payload = {
                    completedAt: Date.now(),
                    careReceiverIds,
                    startDate,
                    endDate,
                    success: false,
                    summary: null,
                    results: null,
                    error: errorMessage,
                  };
                  finishWithPayload(payload);
                  toast.error(`Schedule generation failed. ${errorMessage}`, {
                    autoClose: 5000,
                  });
                  return;
                }
                setTimeout(pollJob, POLL_INTERVAL_MS);
              })
              .catch((err) => {
                const message =
                  err.response?.data?.error?.message ||
                  err.response?.data?.message ||
                  "Failed to get job status";
                finishWithPayload({
                  completedAt: Date.now(),
                  careReceiverIds,
                  startDate,
                  endDate,
                  success: false,
                  summary: null,
                  results: null,
                  error: message,
                });
                toast.error("Schedule generation – could not get status.");
              });
          };
          pollJob();
          return;
        }

        if (response.data.success) {
          const summary = response.data.data.summary ?? {};
          const payload = {
            completedAt: Date.now(),
            careReceiverIds,
            startDate,
            endDate,
            success: true,
            summary: {
              totalScheduled: summary.totalScheduled ?? 0,
              totalFailed: summary.totalFailed ?? 0,
              careReceiversProcessed: summary.careReceiversProcessed ?? 0,
            },
            results: response.data.data.results ?? [],
            error: null,
          };
          finishWithPayload(payload);
          const scheduled = payload.summary.totalScheduled;
          const failed = payload.summary.totalFailed;
          toast.success(
            `Schedule generation complete – ${scheduled} scheduled` +
              (failed > 0 ? `, ${failed} could not be scheduled` : "") + ".",
            { autoClose: 5000 }
          );
        } else {
          const summary = response.data.data?.summary ?? {};
          const errorMessage =
            response.data.error ??
            response.data.message ??
            "Generation failed";
          const payload = {
            completedAt: Date.now(),
            careReceiverIds,
            startDate,
            endDate,
            success: false,
            summary: {
              totalScheduled: summary.totalScheduled ?? 0,
              totalFailed: summary.totalFailed ?? 0,
              careReceiversProcessed: summary.careReceiversProcessed ?? 0,
            },
            results: response.data.data?.results ?? [],
            error: errorMessage,
          };
          finishWithPayload(payload);
          toast.error(`Schedule generation failed. ${errorMessage}`, {
            autoClose: 5000,
          });
        }
      })
      .catch((err) => {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to generate schedule";
        finishWithPayload({
          completedAt: Date.now(),
          careReceiverIds,
          startDate,
          endDate,
          success: false,
          summary: null,
          results: null,
          error: message,
        });
        toast.error("Schedule generation failed – try again.");
      });
  };

  const value = {
    lastGeneration,
    isGenerating,
    runGeneration,
    clearLastGeneration: () => {
      setLastGeneration(null);
      saveToStorage(null);
    },
  };

  return (
    <ScheduleGenerationContext.Provider value={value}>
      <ScheduleGenerationRevalidate />
      <ScheduleSocketSync />
      {children}
    </ScheduleGenerationContext.Provider>
  );
}

const RECENT_MS = 5 * 60 * 1000;

function ScheduleGenerationRevalidate() {
  const { lastGeneration } = useScheduleGeneration();
  const { runCheck } = useUnscheduledCheck();
  const revalidatedForCompletedAtRef = useRef(null);

  useEffect(() => {
    if (
      !lastGeneration?.success ||
      !lastGeneration?.startDate ||
      !lastGeneration?.endDate
    )
      return;
    if (Date.now() - lastGeneration.completedAt > RECENT_MS) return;
    if (revalidatedForCompletedAtRef.current === lastGeneration.completedAt)
      return;
    revalidatedForCompletedAtRef.current = lastGeneration.completedAt;
    runCheck(lastGeneration.startDate, lastGeneration.endDate, {
      silent: true,
    });
    // runCheck intentionally omitted from deps to avoid re-running when
    // provider re-renders after runCheck completes (would cause revalidation storm).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lastGeneration?.completedAt,
    lastGeneration?.success,
    lastGeneration?.startDate,
    lastGeneration?.endDate,
  ]);

  return null;
}

const PROGRESS_REFETCH_DEBOUNCE_MS = 5000;

function getSocketUrl() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  try {
    const u = new URL(base);
    u.pathname = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:5000";
  }
}

function ScheduleSocketSync() {
  const { runCheck } = useUnscheduledCheck();
  const progressRefetchTimerRef = useRef(null);
  const progressDateRangeRef = useRef({ startDate: null, endDate: null });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const clearProgressTimer = () => {
      if (progressRefetchTimerRef.current) {
        clearTimeout(progressRefetchTimerRef.current);
        progressRefetchTimerRef.current = null;
      }
    };

    const invalidateAndRunCheck = (startDate, endDate) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["needs-reassignment"] });
      if (startDate && endDate) {
        runCheck(startDate, endDate, { silent: true });
      }
    };

    const scheduleDebouncedRefetch = (startDate, endDate) => {
      progressDateRangeRef.current = { startDate, endDate };
      clearProgressTimer();
      progressRefetchTimerRef.current = setTimeout(() => {
        progressRefetchTimerRef.current = null;
        const { startDate: s, endDate: e } = progressDateRangeRef.current;
        invalidateAndRunCheck(s, e);
      }, PROGRESS_REFETCH_DEBOUNCE_MS);
    };

    socket.on("schedule_job_completed", (payload) => {
      clearProgressTimer();
      const startDate = payload?.startDate ?? null;
      const endDate = payload?.endDate ?? null;
      invalidateAndRunCheck(startDate, endDate);
      toast.success("Schedule updated.", { autoClose: 3000 });
    });

    socket.on("schedule_progress", (payload) => {
      const startDate = payload?.startDate ?? null;
      const endDate = payload?.endDate ?? null;
      scheduleDebouncedRefetch(startDate, endDate);
    });

    return () => {
      clearProgressTimer();
      socket.removeAllListeners("schedule_job_completed");
      socket.removeAllListeners("schedule_progress");
      socket.disconnect();
    };
  }, [runCheck]);

  return null;
}
