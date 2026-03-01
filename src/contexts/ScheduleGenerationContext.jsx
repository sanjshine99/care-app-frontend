import { createContext, useContext, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
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

    api
      .post("/schedule/generate", {
        careReceiverIds,
        startDate,
        endDate,
      })
      .then((response) => {
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
          setLastGeneration(payload);
          saveToStorage(payload);
          const scheduled = payload.summary.totalScheduled;
          const failed = payload.summary.totalFailed;
          toast.success(
            `Schedule generation complete – ${scheduled} scheduled` +
              (failed > 0 ? `, ${failed} could not be scheduled` : "") + ".",
            { autoClose: 5000 }
          );
        }
      })
      .catch((err) => {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Failed to generate schedule";
        const payload = {
          completedAt: Date.now(),
          careReceiverIds,
          startDate,
          endDate,
          success: false,
          summary: null,
          results: null,
          error: message,
        };
        setLastGeneration(payload);
        saveToStorage(payload);
        toast.error("Schedule generation failed – try again.");
      })
      .finally(() => {
        setIsGenerating(false);
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
