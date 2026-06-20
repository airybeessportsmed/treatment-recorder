import React, { createContext, useContext, useState, useEffect } from "react";

type AppMode = "treatment" | "training";

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get initial mode from localStorage or path
  const getInitialMode = (): AppMode => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/training")) {
        return "training";
      }
      const saved = localStorage.getItem("appMode");
      if (saved === "treatment" || saved === "training") {
        return saved;
      }
    }
    return "treatment";
  };

  const [appMode, setAppModeState] = useState<AppMode>(getInitialMode);

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    localStorage.setItem("appMode", mode);
  };

  // Sync mode with pathname on history navigation (e.g. back button)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path.startsWith("/training") && appMode !== "training") {
        setAppModeState("training");
      } else if (!path.startsWith("/training") && path !== "/" && path !== "/404" && appMode !== "treatment") {
        // Only switch to treatment if not home/404, or define behavior
        // Actually, if path starts with other than /training, default to treatment
        if (!path.startsWith("/training")) {
          setAppModeState("treatment");
        }
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    // Periodically check or hook into wouter's location updates if needed, 
    // but popstate covers back/forward. We'll also handle manual transitions.
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, [appMode]);

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
};
