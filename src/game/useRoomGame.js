import { useEffect, useMemo, useState } from "react";
import { listenToGame } from "../services/gameService";
import { normalizeGameState } from "./phases";

/**
 * Live game flow of a room.
 * @param {string|null} roomId Firebase room id
 * @returns {{isLoaded: boolean, state: object|null, actions: object, votes: object, results: object}}
 */
export function useRoomGame(roomId) {
  const [snapshot, setSnapshot] = useState({ isLoaded: false, raw: null });

  useEffect(() => {
    if (!roomId) return undefined;
    return listenToGame(roomId, (raw) => setSnapshot({ isLoaded: true, raw }));
  }, [roomId]);

  return useMemo(
    () => ({
      isLoaded: snapshot.isLoaded,
      state: normalizeGameState(snapshot.raw),
      actions: snapshot.raw?.actions || {},
      votes: snapshot.raw?.votes || {},
      results: snapshot.raw?.results || {},
    }),
    [snapshot]
  );
}

/** Seconds left until `endsAt` (epoch ms), ticking every second. */
export function useSecondsLeft(endsAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [endsAt]);

  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

export const formatClock = (seconds) => {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};
