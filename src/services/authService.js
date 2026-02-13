import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export const registerWithEmail = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const loginWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const subscribeAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getAuthErrorMessage = (error) => {
   const code = error?.code || "";

  if (code === "auth/invalid-email") return "Некорректный email.";
  if (code === "auth/user-not-found") return "Пользователь не найден.";
  if (code === "auth/wrong-password") return "Неверный пароль.";
  if (code === "auth/invalid-credential") return "Неверный email или пароль.";
  if (code === "auth/email-already-in-use") return "Этот email уже используется.";
  if (code === "auth/weak-password") return "Слишком простой пароль (минимум 6 символов).";
  if (code === "auth/popup-closed-by-user") return "Окно входа закрыто.";
  if (code === "auth/popup-blocked") return "Браузер заблокировал popup входа.";
  if (code === "auth/operation-not-allowed") {
    return "Этот способ входа отключен в Firebase Console.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Текущий домен не разрешен в Firebase Authentication.";
  }
  if (code === "auth/configuration-not-found") {
    return "Провайдер входа не настроен в Firebase.";
  }
  if (code === "auth/network-request-failed") {
    return "Ошибка сети. Проверьте интернет и попробуйте снова.";
  }
  if (code === "auth/too-many-requests") {
    return "Слишком много попыток. Попробуйте позже.";
  }
  if (code === "auth/web-storage-unsupported") {
    return "Браузер не поддерживает web storage для авторизации.";
  }
  if (code === "auth/internal-error") {
    return "Внутренняя ошибка Firebase. Попробуйте позже.";
  }
  if (code === "auth/invalid-api-key") {
    return "Неверный API key Firebase.";
  }
  if (code === "auth/app-not-authorized") {
    return "Приложение не авторизовано в Firebase.";
  }

  if (code) return `Ошибка авторизации: ${code}`;
  return "Ошибка авторизации. Попробуйте снова.";
};
