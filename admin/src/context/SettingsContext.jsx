import { createContext, useContext, useMemo, useState } from "react";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState("id");

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }

  return context;
}
