import React, { createContext, useContext, useState, useCallback } from "react";

type Mode = "citizen" | "professional";

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
  isCitizen: boolean;
  isProfessional: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("citizen");

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "citizen" ? "professional" : "citizen"));
  }, []);

  return (
    <ModeContext.Provider
      value={{
        mode,
        toggleMode,
        isCitizen: mode === "citizen",
        isProfessional: mode === "professional",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) throw new Error("useMode must be used within ModeProvider");
  return context;
}
