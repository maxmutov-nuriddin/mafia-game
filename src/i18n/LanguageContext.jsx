/* eslint-disable react-refresh/only-export-components -- context module also exports translate helpers */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  translations,
} from "./translations";

const readStoredLanguage = () => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGE_OPTIONS.includes(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

// Module-level mirror so non-component code (toasts in callbacks, services) can translate too.
let currentLanguage = readStoredLanguage();

export const getLanguage = () => currentLanguage;

export const translate = (key, params = {}, language = currentLanguage) => {
  const template = translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name])
  );
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(currentLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    if (!LANGUAGE_OPTIONS.includes(nextLanguage)) return;
    currentLanguage = nextLanguage;
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    document.title = translate("app.pageTitle", {}, language);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // storage unavailable: language still works for this session
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(key, params, language),
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
};
