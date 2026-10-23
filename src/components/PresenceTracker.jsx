import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { subscribeAuthState } from "../services/authService";
import { setPresenceInGame, startPresence } from "../services/presenceService";
import { ensureNick } from "../services/socialService";

const IN_GAME_PATH_PREFIXES = ["/create/", "/gamestart/", "/character"];

/** Keeps a registered user's online / in-game status and nick in place. Renders nothing. */
const PresenceTracker = () => {
  const { pathname } = useLocation();
  const [uid, setUid] = useState(null);

  useEffect(
    () => subscribeAuthState((user) => setUid(user && !user.isAnonymous ? user.uid : null)),
    []
  );

  const isInGame = IN_GAME_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    setPresenceInGame(isInGame);
  }, [isInGame]);

  useEffect(() => (uid ? startPresence(uid) : undefined), [uid]);

  useEffect(() => {
    if (uid) ensureNick().catch((error) => console.error("Ensure nick error:", error));
  }, [uid]);

  return null;
};

export default PresenceTracker;
