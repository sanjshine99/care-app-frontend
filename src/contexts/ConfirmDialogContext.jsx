import { createContext, useContext, useState, useRef, useCallback } from "react";
import ConfirmDialog from "../components/ConfirmDialog/ConfirmDialog";

const ConfirmDialogContext = createContext(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return context;
}

const defaultState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "Cancel",
  variant: "default",
};

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    ({ title, message, confirmLabel, cancelLabel, variant }) => {
      return new Promise((resolve) => {
        if (resolveRef.current) {
          resolveRef.current(false);
        }
        resolveRef.current = resolve;
        setState({
          open: true,
          title: title ?? defaultState.title,
          message: message ?? defaultState.message,
          confirmLabel: confirmLabel ?? defaultState.confirmLabel,
          cancelLabel: cancelLabel ?? defaultState.cancelLabel,
          variant: variant ?? defaultState.variant,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setState(defaultState);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setState(defaultState);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmDialogContext.Provider>
  );
}
