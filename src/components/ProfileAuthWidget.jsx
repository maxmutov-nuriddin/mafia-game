import { useEffect, useMemo, useState } from "react";
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

const ProfileAuthWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextUser) => {
      setUser(nextUser || null);
    });

    return () => unsubscribe();
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-3 right-3 z-[120] border-2 border-[#250506] bg-[#DBD0C0] text-[#250506] rounded-full px-4 py-2 font-semibold shadow transition-all duration-200 flex items-center gap-2 hover:bg-[#250506] hover:text-[#DBD0C0] hover:border-[#DBD0C0] hover:ring-2 hover:ring-[#DBD0C0]/35"
      >
        <UserRound size={16} />
        <span className="max-w-[120px] truncate">{profileLabel}</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[130] bg-[#250506]/45"
            aria-label="Close auth modal"
          />

          <div className="fixed top-16 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-3 z-[140] w-[min(360px,calc(100vw-1.25rem))] rounded-2xl border-2 border-[#250506]/25 bg-[#f6eee2] shadow-[0_20px_48px_rgba(0,0,0,0.32)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#250506] text-[#DBD0C0]">
              <h3 className="text-lg font-black">
                {hasAccountUser ? "Профиль" : mode === "login" ? "Вход" : "Регистрация"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 hover:bg-[#DBD0C0] hover:text-[#250506] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 text-[#250506]">
              {hasAccountUser ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-white border border-[#250506]/15 p-3">
                    <p className="text-sm opacity-75">Вы вошли как</p>
                    <p className="font-bold break-all">{user.email || profileLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full border border-[#250506] rounded-md py-2 font-bold flex items-center justify-center gap-2 hover:bg-[#250506] hover:text-[#DBD0C0] transition-colors"
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
                      className={`border rounded-md py-2 font-bold transition-colors ${
                        mode === "login"
                          ? "bg-[#250506] text-[#DBD0C0] border-[#250506]"
                          : "bg-white text-[#250506] border-[#250506]/40 hover:bg-[#250506] hover:text-[#DBD0C0]"
                      }`}
                    >
                      Вход
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className={`border rounded-md py-2 font-bold transition-colors ${
                        mode === "register"
                          ? "bg-[#250506] text-[#DBD0C0] border-[#250506]"
                          : "bg-white text-[#250506] border-[#250506]/40 hover:bg-[#250506] hover:text-[#DBD0C0]"
                      }`}
                    >
                      Регистрация
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className={`w-full border border-[#250506]/35 rounded-md py-2.5 bg-white text-[#250506] font-bold flex items-center justify-center gap-2 transition-colors ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#250506] hover:text-[#DBD0C0]"
                    }`}
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
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#250506]/65" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full border border-[#250506]/25 rounded-md pl-9 pr-3 py-2.5 bg-white text-[#250506] placeholder:text-[#8a7a66]"
                      />
                    </div>

                    <label className="text-sm font-semibold">Пароль</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#250506]/65" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="******"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        className="w-full border border-[#250506]/25 rounded-md pl-9 pr-3 py-2.5 bg-white text-[#250506] placeholder:text-[#8a7a66]"
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
                          className="w-full border border-[#250506]/25 rounded-md px-3 py-2.5 bg-white text-[#250506] placeholder:text-[#8a7a66]"
                        />
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`mt-1 w-full rounded-md py-2.5 font-black transition-colors ${
                        isLoading
                          ? "opacity-50 cursor-not-allowed bg-[#250506] text-[#DBD0C0]"
                          : "bg-[#250506] text-[#DBD0C0] hover:bg-[#402021]"
                      }`}
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
