import { off, onDisconnect, onValue, ref, remove, set, update } from "firebase/database";
import { database } from "./firebase";

let isInGame = false;
let activeUid = null;
let isConnected = false;

const presenceRef = (uid) => ref(database, `presence/${uid}`);

/**
 * Mark a registered user online while the app is open. The record disappears by itself
 * when the connection drops (`onDisconnect`), so a closed tab shows as offline.
 * @returns {() => void} stop (marks the user offline)
 */
export function startPresence(uid) {
  activeUid = uid;
  const connectedRef = ref(database, ".info/connected");

  const listener = onValue(connectedRef, async (snapshot) => {
    isConnected = snapshot.val() === true;
    if (!isConnected) return;

    try {
      await onDisconnect(presenceRef(uid)).remove();
      await set(presenceRef(uid), { online: true, inGame: isInGame });
    } catch (error) {
      console.error("Presence error:", error);
    }
  });

  return () => {
    off(connectedRef, "value", listener);
    activeUid = null;
    isConnected = false;
    remove(presenceRef(uid)).catch((error) => console.error("Presence cleanup error:", error));
  };
}

/** Tell friends the user is (or is no longer) inside a game. */
export function setPresenceInGame(inGame) {
  isInGame = inGame;
  if (!activeUid || !isConnected) return;

  update(presenceRef(activeUid), { inGame }).catch((error) =>
    console.error("Presence update error:", error)
  );
}

/**
 * Listen to a user's presence record ({online, inGame}) or null when offline.
 * @returns {() => void} unsubscribe
 */
export function listenToPresence(uid, callback) {
  const recordRef = presenceRef(uid);
  const listener = onValue(recordRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  return () => off(recordRef, "value", listener);
}
