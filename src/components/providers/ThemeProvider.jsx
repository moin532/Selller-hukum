"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { applyLang, applyTheme, getStoredLang, getStoredTheme } from "@/lib/theme";

const ThemeCtx = createContext({
  theme: "dark",
  lang: "en",
  setTheme: () => {},
  setLang: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const [lang, setLangState] = useState("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(applyTheme(getStoredTheme()));
    setLangState(applyLang(getStoredLang()));
    setReady(true);
  }, []);

  function setTheme(next) {
    setThemeState(applyTheme(next));
  }

  function setLang(next) {
    setLangState(applyLang(next));
  }

  if (!ready) {
    return <div className="min-h-screen bg-bg" />;
  }

  return (
    <ThemeCtx.Provider value={{ theme, lang, setTheme, setLang }}>{children}</ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
