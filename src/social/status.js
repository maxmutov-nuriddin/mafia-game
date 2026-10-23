export const FRIEND_STATUS = Object.freeze({
  IN_GAME: "inGame",
  ONLINE: "online",
  OFFLINE: "offline",
});

/**
 * Friend status from their presence record (`presence/{uid}`; absent means offline).
 * Green dot: online or in a game. Red dot: offline.
 * @param {{online?: boolean, inGame?: boolean}|null|undefined} presence
 */
export function getFriendStatus(presence) {
  if (!presence?.online) return FRIEND_STATUS.OFFLINE;
  return presence.inGame ? FRIEND_STATUS.IN_GAME : FRIEND_STATUS.ONLINE;
}

export const isFriendOnline = (status) => status !== FRIEND_STATUS.OFFLINE;
