import { didPlayerWin } from "./points";

/**
 * Tuning knobs. A typical win is ~33 points, a loss ~13, so the cheapest skin is
 * 2 games away and the top skin takes a few weeks. The daily cap stops farming.
 */
export const ECONOMY = Object.freeze({
  MIN_PLAYERS: 5,
  PARTICIPATION: 10,
  WIN_BONUS: 15,
  SURVIVAL_BONUS: 5,
  HOST_BONUS: 10,
  SIZE_BONUS_PER_PLAYER: 1,
  SIZE_BONUS_CAP: 10,
  DAILY_FIRST_GAME_BONUS: 20,
  STREAK_BONUS_PER_DAY: 5,
  STREAK_CAP_DAYS: 7,
  DAILY_EARN_CAP: 250,
  LEVEL_POINTS_UNIT: 50,
});

const pad = (value) => String(value).padStart(2, "0");

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function previousDayKey(day) {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return dayKey(new Date(year, month - 1, dayOfMonth - 1));
}

/** Bigger rooms pay more, up to a cap. */
export const getSizeBonus = (playerCount) =>
  Math.min(
    Math.max(playerCount - ECONOMY.MIN_PLAYERS, 0) * ECONOMY.SIZE_BONUS_PER_PLAYER,
    ECONOMY.SIZE_BONUS_CAP
  );

/**
 * Base reward for playing a finished game (before daily bonus and cap).
 * @returns {{basePoints: number, won: boolean, breakdown: Record<string, number>}}
 */
export function calculatePlayerReward({ player, winner, playerCount }) {
  const won = didPlayerWin(player, winner);
  if (playerCount < ECONOMY.MIN_PLAYERS) return { basePoints: 0, won, breakdown: {} };

  const breakdown = {
    participation: ECONOMY.PARTICIPATION,
    win: won ? ECONOMY.WIN_BONUS : 0,
    survival: player.eliminated ? 0 : ECONOMY.SURVIVAL_BONUS,
    size: getSizeBonus(playerCount),
  };

  return {
    basePoints: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    won,
    breakdown,
  };
}

/** Base reward for hosting a finished game. */
export function calculateHostReward(playerCount) {
  if (playerCount < ECONOMY.MIN_PLAYERS) return { basePoints: 0, won: false, breakdown: {} };

  const breakdown = { host: ECONOMY.HOST_BONUS, size: getSizeBonus(playerCount) };
  return { basePoints: breakdown.host + breakdown.size, won: false, breakdown };
}

/**
 * Apply one award to a profile: daily first-game bonus, streak, daily cap, stats.
 * Pure. Returns null when the award was already claimed or is worth nothing.
 * @param {object|null} profile current `users/{uid}` value
 * @param {{awardKey: string, basePoints: number, won: boolean, kind: "player"|"host"}} award
 * @param {string} today dayKey of the claiming day
 */
export function applyAward(profile, award, today) {
  const current = profile || {};
  if (award.basePoints <= 0 || current.awards?.[award.awardKey] !== undefined) return null;

  const isFirstGameToday = current.streak?.lastDay !== today;
  const continuesStreak = current.streak?.lastDay === previousDayKey(today);
  const streakCount = isFirstGameToday
    ? (continuesStreak ? Number(current.streak?.count || 0) + 1 : 1)
    : Number(current.streak?.count || 1);

  const dailyBonus = isFirstGameToday
    ? ECONOMY.DAILY_FIRST_GAME_BONUS +
      ECONOMY.STREAK_BONUS_PER_DAY * (Math.min(streakCount, ECONOMY.STREAK_CAP_DAYS) - 1)
    : 0;

  const earnedToday = current.daily?.day === today ? Number(current.daily.earned || 0) : 0;
  const roomLeftToday = Math.max(ECONOMY.DAILY_EARN_CAP - earnedToday, 0);
  const gross = award.basePoints + dailyBonus;
  const granted = Math.min(gross, roomLeftToday);
  const previousTotal = Number(current.totalEarned ?? current.points ?? 0);

  return {
    granted,
    dailyBonus,
    streakCount,
    wasCapped: granted < gross,
    profile: {
      ...current,
      points: Number(current.points || 0) + granted,
      totalEarned: previousTotal + granted,
      gamesPlayed: Number(current.gamesPlayed || 0) + (award.kind === "player" ? 1 : 0),
      gamesHosted: Number(current.gamesHosted || 0) + (award.kind === "host" ? 1 : 0),
      wins: Number(current.wins || 0) + (award.won ? 1 : 0),
      awards: { ...current.awards, [award.awardKey]: granted },
      streak: { lastDay: today, count: streakCount },
      daily: { day: today, earned: earnedToday + granted },
    },
  };
}

/**
 * Level from lifetime earnings (spending never lowers it). Level n starts at 50 * (n-1)^2.
 * @returns {{level: number, currentXp: number, neededXp: number, progress: number}}
 */
export function getLevel(totalEarned) {
  const total = Math.max(Number(totalEarned) || 0, 0);
  const level = Math.floor(Math.sqrt(total / ECONOMY.LEVEL_POINTS_UNIT)) + 1;
  const levelStart = (level - 1) ** 2 * ECONOMY.LEVEL_POINTS_UNIT;
  const nextLevelStart = level ** 2 * ECONOMY.LEVEL_POINTS_UNIT;
  const neededXp = nextLevelStart - levelStart;
  const currentXp = total - levelStart;

  return { level, currentXp, neededXp, progress: currentXp / neededXp };
}
