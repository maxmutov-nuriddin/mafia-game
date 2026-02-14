import { useEffect, useMemo, useRef, useState } from "react";
import { Chrome, Lock, LogOut, Mail, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getAuthErrorMessage,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  subscribeAuthState,
} from "../services/authService";

const LANGUAGE_STORAGE_KEY = "mafia-ui-language";
const LANGUAGE_OPTIONS = ["uz", "ru", "en"];

const ProfileAuthWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "ru";
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGE_OPTIONS.includes(savedLanguage) ? savedLanguage : "ru";
  });
  const langMenuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextUser) => {
      setUser(nextUser || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!langMenuRef.current?.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const hasAccountUser = !!user && !user.isAnonymous;

  const profileLabel = useMemo(() => {
    if (!hasAccountUser) return "Профиль";
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "Пользователь";
  }, [hasAccountUser, user]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email.trim() || !password.trim()) {
      toast.info("Введите email и пароль.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      toast.warn("Пароли не совпадают.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "register") {
        await registerWithEmail(email.trim(), password);
        toast.success("Регистрация выполнена.");
      } else {
        await loginWithEmail(email.trim(), password);
        toast.success("Вход выполнен.");
      }
      resetForm();
      setIsOpen(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Вход через Google выполнен.");
      setIsOpen(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.info("Вы вышли из аккаунта.");
      setIsOpen(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    }
  };

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    setIsLangMenuOpen(false);
  };

  return (
    <>
      <div className="fixed top-3 right-3 z-[120] flex items-center gap-2">
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setIsLangMenuOpen((prev) => !prev)}
            className="mafia-btn mafia-btn--icon !rounded-xl !px-3 !py-2 uppercase"
            aria-haspopup="menu"
            aria-expanded={isLangMenuOpen}
            aria-label="Language switcher"
          >
            {language}
          </button>

          {isLangMenuOpen && (
            <div className="mafia-panel absolute right-0 mt-1 p-1.5 min-w-[64px] flex flex-col gap-1">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleLanguageChange(option)}
                  className={`mafia-btn mafia-btn--tiny uppercase ${
                    language === option ? "mafia-btn--primary" : ""
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsLangMenuOpen(false);
            setIsOpen(true);
          }}
          className="mafia-btn mafia-btn--icon"
        >
          <UserRound size={16} />
          <span className="max-w-[120px] truncate">{profileLabel}</span>
        </button>
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[130] bg-[#250506]/45"
            aria-label="Close auth modal"
          />

          <div className="mafia-shell fixed top-16 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-3 z-[140] w-[min(360px,calc(100vw-1.25rem))] shadow-[0_20px_48px_rgba(0,0,0,0.32)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#250506] text-[#DBD0C0]">
              <h3 className="text-lg font-black">
                {hasAccountUser ? "Профиль" : mode === "login" ? "Вход" : "Регистрация"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mafia-btn mafia-btn--sm"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 text-[#250506]">
              {hasAccountUser ? (
                <div className="flex flex-col gap-3">
                  <div className="mafia-panel bg-white p-3">
                    <p className="text-sm opacity-75">Вы вошли как</p>
                    <p className="font-bold break-all">{user.email || profileLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mafia-btn w-full"
                  >
                    <LogOut size={16} />
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className={`mafia-btn w-full ${
                        mode === "login"
                          ? "mafia-btn--primary"
                          : ""
                      }`}
                    >
                      Вход
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className={`mafia-btn w-full ${
                        mode === "register"
                          ? "mafia-btn--primary"
                          : ""
                      }`}
                    >
                      Регистрация
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="mafia-btn w-full"
                  >
                    <Chrome size={16} />
                    Продолжить через Google
                  </button>

                  <div className="flex items-center gap-2 text-[#250506]/55">
                    <div className="h-px flex-1 bg-[#250506]/25" />
                    <span className="text-xs font-semibold">или</span>
                    <div className="h-px flex-1 bg-[#250506]/25" />
                  </div>

                  <form className="flex flex-col gap-2" onSubmit={handleEmailAuth}>
                    <label className="text-sm font-semibold">Email</label>
                    <div className="relative">
                      <Mail size={16} className="mafia-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="mafia-input mafia-input--icon bg-white"
                      />
                    </div>

                    <label className="text-sm font-semibold">Пароль</label>
                    <div className="relative">
                      <Lock size={16} className="mafia-input-icon" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="******"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        className="mafia-input mafia-input--icon bg-white"
                      />
                    </div>

                    {mode === "register" && (
                      <>
                        <label className="text-sm font-semibold">Подтвердите пароль</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="******"
                          autoComplete="new-password"
                          className="mafia-input bg-white"
                        />
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mafia-btn mafia-btn--primary mt-1 w-full"
                    >
                      {isLoading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ProfileAuthWidget;
