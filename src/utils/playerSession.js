export const LAST_PLAYER_SESSION_KEY = "mafia_last_player_session";
const PLAYER_SESSION_PREFIX = "mafia_player_session_";

const normalizeName = (name) => String(name || "").trim().toLowerCase();

const getSessionByNameKey = (gameId, playerName) => {
  const cleanGameId = String(gameId || "").trim();
  const normalizedName = normalizeName(playerName);
  return `${PLAYER_SESSION_PREFIX}${cleanGameId}_${normalizedName}`;
};

export const rememberPlayerSession = ({ gameId, userId, playerName }) => {
  const cleanGameId = String(gameId || "").trim();
  const cleanUserId = String(userId || "").trim();
  const cleanName = String(playerName || "").trim();
  const normalizedName = normalizeName(cleanName);

  if (!cleanGameId || !cleanUserId || !normalizedName) return;

  const payload = {
    gameId: cleanGameId,
    userId: cleanUserId,
    playerName: cleanName,
    normalizedName,
    updatedAt: Date.now(),
  };

  localStorage.setItem(LAST_PLAYER_SESSION_KEY, JSON.stringify(payload));
  localStorage.setItem(getSessionByNameKey(cleanGameId, cleanName), cleanUserId);
};

export const getRememberedPlayerId = (gameId, playerName) => {
  const key = getSessionByNameKey(gameId, playerName);
  const value = localStorage.getItem(key);
  return value ? String(value).trim() : "";
};

export const forgetRememberedPlayer = (gameId, playerName) => {
  const key = getSessionByNameKey(gameId, playerName);
  localStorage.removeItem(key);
};

export const getLastRememberedPlayerSession = () => {
  const raw = localStorage.getItem(LAST_PLAYER_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.gameId || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearLastRememberedPlayerSession = () => {
  localStorage.removeItem(LAST_PLAYER_SESSION_KEY);
};

export const clearAllRememberedPlayerSessions = () => {
  const keysToDelete = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === LAST_PLAYER_SESSION_KEY || key.startsWith(PLAYER_SESSION_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => localStorage.removeItem(key));
};
