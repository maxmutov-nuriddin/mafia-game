import { useEffect, useMemo, useState } from "react";
import { listenToPresence } from "../services/presenceService";
import { listenToFriendIds, listenToPublicProfile } from "../services/socialService";
import { getFriendStatus } from "./status";

const UNKNOWN_NICK = "...";

/**
 * Live friend list with nick and online status.
 * @param {string|null} uid signed-in registered user
 * @returns {{uid: string, nick: string, status: string}[]}
 */
export function useFriends(uid) {
  const [friendIds, setFriendIds] = useState([]);
  const [details, setDetails] = useState({});

  useEffect(() => {
    if (!uid) return undefined;
    return listenToFriendIds(uid, setFriendIds);
  }, [uid]);

  useEffect(() => {
    const patch = (friendId, fields) =>
      setDetails((previous) => ({ ...previous, [friendId]: { ...previous[friendId], ...fields } }));

    const unsubscribers = friendIds.flatMap((friendId) => [
      listenToPublicProfile(friendId, (profile) => patch(friendId, { nick: profile?.nick })),
      listenToPresence(friendId, (presence) => patch(friendId, { presence })),
    ]);

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [friendIds]);

  return useMemo(
    () =>
      friendIds.map((friendId) => ({
        uid: friendId,
        nick: details[friendId]?.nick || UNKNOWN_NICK,
        status: getFriendStatus(details[friendId]?.presence),
      })),
    [friendIds, details]
  );
}
