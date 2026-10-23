import { get, off, onValue, ref, runTransaction } from "firebase/database";
import { auth, database } from "./firebase";
import { applyAward, dayKey, previousDayKey } from "../game/economy";
import { DEFAULT_SKIN_ID, SKINS, getPurchaseBlock, isSkinOwned } from "../game/skins";

const getRegisteredUser = () => {
  const user = auth.currentUser;
  return user && !user.isAnonymous ? user : null;
};

/**
 * Add a finished game's reward to the signed-in registered user's profile.
 * Idempotent per award key; applies the daily bonus, streak and daily cap.
 * @param {{awardKey: string, basePoints: number, won: boolean, kind: "player"|"host"}} award
 * @returns {Promise<{granted: number, dailyBonus: number, streakCount: number, wasCapped: boolean}|null>}
 *   null when nothing was added (not registered, already claimed, or worth nothing)
 */
export async function claimGamePoints(award) {
  const user = getRegisteredUser();
  if (!user || award.basePoints <= 0) return null;

  const today = dayKey();
  let outcome = null;
  const result = await runTransaction(ref(database, `users/${user.uid}`), (current) => {
    outcome = applyAward(current, award, today);
    return outcome ? outcome.profile : undefined;
  });

  return result.committed ? outcome : null;
}

/** Streak shown to the user: still alive only if the last game was today or yesterday. */
const visibleStreak = (streak) => {
  const today = dayKey();
  const isAlive = streak?.lastDay === today || streak?.lastDay === previousDayKey(today);
  return isAlive ? Number(streak.count || 0) : 0;
};

/**
 * Listen to a user's points, level progress, streak and skins.
 * @param {string} uid
 * @param {(profile: object) => void} callback
 * @returns {() => void} unsubscribe
 */
export function listenToUserProfile(uid, callback) {
  const profileRef = ref(database, `users/${uid}`);

  const listener = onValue(profileRef, (snapshot) => {
    const value = snapshot.exists() ? snapshot.val() : {};
    const points = Number(value.points || 0);
    callback({
      points,
      totalEarned: Number(value.totalEarned ?? points),
      gamesPlayed: Number(value.gamesPlayed || 0),
      gamesHosted: Number(value.gamesHosted || 0),
      wins: Number(value.wins || 0),
      ownedSkins: value.ownedSkins || {},
      skin: value.skin || DEFAULT_SKIN_ID,
      streak: visibleStreak(value.streak),
      earnedToday: value.daily?.day === dayKey() ? Number(value.daily.earned || 0) : 0,
    });
  });

  return () => off(profileRef, "value", listener);
}

/**
 * Skin the signed-in user currently wears (the default for guests or on error).
 * @returns {Promise<string>}
 */
export async function getEquippedSkinId() {
  const user = getRegisteredUser();
  if (!user) return DEFAULT_SKIN_ID;

  try {
    const snapshot = await get(ref(database, `users/${user.uid}/skin`));
    return snapshot.exists() ? snapshot.val() : DEFAULT_SKIN_ID;
  } catch (error) {
    console.error("Could not read the equipped skin:", error);
    return DEFAULT_SKIN_ID;
  }
}

/**
 * Buy a skin with profile points. Price and level rules come from the skin list,
 * never from the caller. Spending does not lower the level.
 * @param {string} skinId
 * @returns {Promise<boolean>} true when bought
 */
export async function purchaseSkin(skinId) {
  const user = getRegisteredUser();
  const skin = SKINS.find((candidate) => candidate.id === skinId);
  if (!user || !skin || skin.price <= 0) return false;

  const result = await runTransaction(ref(database, `users/${user.uid}`), (current) => {
    const profile = current || {};
    if (getPurchaseBlock(profile, skin)) return undefined;

    const points = Number(profile.points || 0);
    return {
      ...profile,
      points: points - skin.price,
      totalEarned: Number(profile.totalEarned ?? points),
      ownedSkins: { ...profile.ownedSkins, [skinId]: true },
    };
  });

  return result.committed;
}

/**
 * Wear an owned skin on the card.
 * @param {string} skinId
 * @returns {Promise<boolean>} true when changed
 */
export async function equipSkin(skinId) {
  const user = getRegisteredUser();
  if (!user) return false;

  const result = await runTransaction(ref(database, `users/${user.uid}`), (current) => {
    const profile = current || {};
    if (!isSkinOwned(profile, skinId)) return undefined;
    return { ...profile, skin: skinId };
  });

  return result.committed;
}
