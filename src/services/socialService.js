import {
  endAt,
  get,
  limitToFirst,
  off,
  onValue,
  orderByKey,
  query,
  ref,
  remove,
  runTransaction,
  set,
  startAt,
} from "firebase/database";
import { auth, database } from "./firebase";
import { generateRandomNick, nickKey, validateNick } from "../social/nick";

const SEARCH_RESULT_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;
const RANDOM_NICK_ATTEMPTS = 8;
const PREFIX_END_MARK = "";

const getRegisteredUser = () => {
  const user = auth.currentUser;
  return user && !user.isAnonymous ? user : null;
};

/**
 * Take a nick for the signed-in user. Nicks are unique, case-insensitive: the key
 * `usernames/{lowercase}` holds the owner's uid and is claimed in a transaction.
 * @returns {Promise<{ok: true, nick: string} | {ok: false, reason: "auth"|"invalid"|"taken"}>}
 */
export async function claimNick(nick) {
  const user = getRegisteredUser();
  if (!user) return { ok: false, reason: "auth" };

  const checked = validateNick(nick);
  if (!checked.ok) return checked;

  const claim = await runTransaction(ref(database, `usernames/${checked.key}`), (owner) =>
    owner === null || owner === user.uid ? user.uid : undefined
  );
  if (!claim.committed) return { ok: false, reason: "taken" };

  const profileRef = ref(database, `publicProfiles/${user.uid}`);
  const previous = await get(profileRef);
  const previousKey = previous.exists() ? previous.val().nickLower : null;

  await set(profileRef, { nick: checked.value, nickLower: checked.key });
  if (previousKey && previousKey !== checked.key) {
    await remove(ref(database, `usernames/${previousKey}`));
  }

  return { ok: true, nick: checked.value };
}

/** Try random nicks until a free one is taken. Returns the new nick or null. */
export async function claimRandomNick() {
  for (let attempt = 0; attempt < RANDOM_NICK_ATTEMPTS; attempt += 1) {
    const result = await claimNick(generateRandomNick());
    if (result.ok) return result.nick;
    if (result.reason !== "taken") return null;
  }
  return null;
}

/** The signed-in registered user's nick, or null (guest or none yet). */
export async function getMyNick() {
  const user = getRegisteredUser();
  if (!user) return null;

  const snapshot = await get(ref(database, `publicProfiles/${user.uid}`));
  return snapshot.exists() ? snapshot.val().nick || null : null;
}

let ensureNickInFlight = null;

/**
 * Give a registered user a random nick the first time they have none.
 * Concurrent calls share one run, so two nicks are never claimed at once.
 */
export function ensureNick() {
  if (!ensureNickInFlight) {
    ensureNickInFlight = (async () => (await getMyNick()) || claimRandomNick())().finally(() => {
      ensureNickInFlight = null;
    });
  }
  return ensureNickInFlight;
}

/**
 * Listen to a user's public profile ({nick}) or null.
 * @returns {() => void} unsubscribe
 */
export function listenToPublicProfile(uid, callback) {
  const profileRef = ref(database, `publicProfiles/${uid}`);
  const listener = onValue(profileRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  return () => off(profileRef, "value", listener);
}

/**
 * Find users whose nick starts with the text.
 * @returns {Promise<{uid: string, nick: string}[]>}
 */
export async function searchNicks(text) {
  const key = nickKey(text);
  if (key.length < MIN_SEARCH_LENGTH) return [];

  const matches = await get(
    query(
      ref(database, "usernames"),
      orderByKey(),
      startAt(key),
      endAt(key + PREFIX_END_MARK),
      limitToFirst(SEARCH_RESULT_LIMIT)
    )
  );
  if (!matches.exists()) return [];

  const profiles = await Promise.all(
    Object.values(matches.val()).map(async (uid) => {
      const profile = await get(ref(database, `publicProfiles/${uid}`));
      return profile.exists() ? { uid, nick: profile.val().nick } : null;
    })
  );

  return profiles.filter(Boolean);
}

/** Add a user to the signed-in user's friend list. */
export async function addFriend(friendUid) {
  const user = getRegisteredUser();
  if (!user || !friendUid || friendUid === user.uid) return false;

  await set(ref(database, `friends/${user.uid}/${friendUid}`), true);
  return true;
}

export async function removeFriend(friendUid) {
  const user = getRegisteredUser();
  if (!user || !friendUid) return false;

  await remove(ref(database, `friends/${user.uid}/${friendUid}`));
  return true;
}

/**
 * Listen to the uids in a user's friend list.
 * @returns {() => void} unsubscribe
 */
export function listenToFriendIds(uid, callback) {
  const friendsRef = ref(database, `friends/${uid}`);
  const listener = onValue(friendsRef, (snapshot) => {
    callback(snapshot.exists() ? Object.keys(snapshot.val()) : []);
  });
  return () => off(friendsRef, "value", listener);
}
