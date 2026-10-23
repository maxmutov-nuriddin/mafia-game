import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { translate } from "../i18n/LanguageContext";

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

export const ensureAnonymousAuth = async () => {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
};

const AUTH_ERROR_KEYS = {
  "auth/invalid-email": "authErr.invalidEmail",
  "auth/user-not-found": "authErr.userNotFound",
  "auth/wrong-password": "authErr.wrongPassword",
  "auth/invalid-credential": "authErr.invalidCredential",
  "auth/email-already-in-use": "authErr.emailInUse",
  "auth/weak-password": "authErr.weakPassword",
  "auth/popup-closed-by-user": "authErr.popupClosed",
  "auth/popup-blocked": "authErr.popupBlocked",
  "auth/operation-not-allowed": "authErr.operationNotAllowed",
  "auth/unauthorized-domain": "authErr.unauthorizedDomain",
  "auth/configuration-not-found": "authErr.configNotFound",
  "auth/network-request-failed": "authErr.network",
  "auth/too-many-requests": "authErr.tooManyRequests",
  "auth/web-storage-unsupported": "authErr.webStorage",
  "auth/internal-error": "authErr.internal",
  "auth/invalid-api-key": "authErr.invalidApiKey",
  "auth/app-not-authorized": "authErr.appNotAuthorized",
};

export const getAuthErrorMessage = (error) => {
  const code = error?.code || "";
  const message = String(error?.message || "");

  if (AUTH_ERROR_KEYS[code]) return translate(AUTH_ERROR_KEYS[code]);

  // Some browsers/providers return this only in message text
  if (message.includes("CONFIGURATION_NOT_FOUND")) {
    return translate("authErr.configMissingMessage");
  }

  if (code) return translate("authErr.withCode", { code });
  return translate("authErr.generic");
};
