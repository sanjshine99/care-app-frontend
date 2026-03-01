import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

const STORAGE_KEY = "unscheduledCheckResult";

const UnscheduledCheckContext = createContext();

export function useUnscheduledCheck() {
  const context = useContext(UnscheduledCheckContext);
  if (!context) {
    throw new Error("useUnscheduledCheck must be used within UnscheduledCheckProvider");
  }
  return context;
}

function loadFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.completedAt === "number" && parsed.data) {
      return parsed;
    }
  } catch (_) {
    // ignore
  }
  return null;
}

function saveToStorage(lastCheck) {
  try {
    if (lastCheck) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lastCheck));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {
    // ignore
  }
}

export function UnscheduledCheckProvider({ children }) {
  const [lastCheck, setLastCheck] = useState(loadFromStorage);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) setLastCheck(stored);
  }, []);

  const runCheck = useCallback((startDate, endDate, options = {}) => {
    if (isChecking) return;
    setIsChecking(true);
    const silent = options.silent === true;

    api
      .get("/schedule/unscheduled", {
        params: { startDate, endDate, summaryOnly: "true" },
      })
      .then((response) => {
        if (response.data.success) {
          const unscheduled = response.data.data?.unscheduled ?? [];
          const totalAppointments = unscheduled.reduce(
            (sum, item) => sum + (item.missing || 0),
            0
          );
          const payload = {
            startDate,
            endDate,
            completedAt: Date.now(),
            data: {
              unscheduled,
              total: unscheduled.length,
            },
          };
          setLastCheck(payload);
          saveToStorage(payload);
          if (!silent) {
            if (totalAppointments > 0) {
              toast.success(
                `Unscheduled check complete – ${totalAppointments} appointment${totalAppointments !== 1 ? "s" : ""} found`
              );
            } else {
              toast.info("Unscheduled check complete – no unscheduled appointments in range.");
            }
          }
        }
      })
      .catch(() => {
        toast.error("Unscheduled check failed – try again.");
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [isChecking]);

  const value = {
    lastCheck,
    isChecking,
    runCheck,
    clearLastCheck: () => {
      setLastCheck(null);
      saveToStorage(null);
    },
  };

  return (
    <UnscheduledCheckContext.Provider value={value}>
      {children}
    </UnscheduledCheckContext.Provider>
  );
}
