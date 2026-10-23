import { describe, expect, it } from "vitest";
import { ROLE } from "../abilities";
import {
  ECONOMY,
  applyAward,
  calculateHostReward,
  calculatePlayerReward,
  dayKey,
  getLevel,
  getSizeBonus,
  previousDayKey,
} from "../economy";

const player = (roleId, eliminated = false) => ({ id: "p", eliminated, character: { id: roleId } });

describe("calculatePlayerReward", () => {
  const playerCount = ECONOMY.MIN_PLAYERS;

  it("pays participation, win and survival to a surviving winner", () => {
    const reward = calculatePlayerReward({ player: player(ROLE.MAFIA), winner: "mafia", playerCount });

    expect(reward.basePoints).toBe(
      ECONOMY.PARTICIPATION + ECONOMY.WIN_BONUS + ECONOMY.SURVIVAL_BONUS
    );
    expect(reward.won).toBe(true);
  });

  it("pays only participation to an eliminated loser", () => {
    const reward = calculatePlayerReward({
      player: player(ROLE.CIVILIAN, true),
      winner: "mafia",
      playerCount,
    });

    expect(reward.basePoints).toBe(ECONOMY.PARTICIPATION);
    expect(reward.won).toBe(false);
  });

  it("pays nothing in a room below the minimum size", () => {
    const reward = calculatePlayerReward({
      player: player(ROLE.MAFIA),
      winner: "mafia",
      playerCount: ECONOMY.MIN_PLAYERS - 1,
    });

    expect(reward.basePoints).toBe(0);
  });

  it("adds a size bonus for bigger rooms", () => {
    const small = calculatePlayerReward({ player: player(ROLE.CIVILIAN), winner: "city", playerCount: 5 });
    const big = calculatePlayerReward({ player: player(ROLE.CIVILIAN), winner: "city", playerCount: 8 });

    expect(big.basePoints - small.basePoints).toBe(3 * ECONOMY.SIZE_BONUS_PER_PLAYER);
  });
});

describe("getSizeBonus", () => {
  it("is zero at the minimum and capped for huge rooms", () => {
    expect(getSizeBonus(ECONOMY.MIN_PLAYERS)).toBe(0);
    expect(getSizeBonus(100)).toBe(ECONOMY.SIZE_BONUS_CAP);
  });
});

describe("calculateHostReward", () => {
  it("pays the host bonus plus the size bonus", () => {
    expect(calculateHostReward(7).basePoints).toBe(ECONOMY.HOST_BONUS + 2);
  });

  it("pays nothing for a tiny room", () => {
    expect(calculateHostReward(2).basePoints).toBe(0);
  });
});

describe("day keys", () => {
  it("formats the local day and finds the previous one across a month boundary", () => {
    expect(dayKey(new Date(2026, 2, 5))).toBe("2026-03-05");
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
  });
});

describe("applyAward", () => {
  const award = (overrides = {}) => ({
    awardKey: "room1",
    basePoints: 30,
    won: true,
    kind: "player",
    ...overrides,
  });

  it("adds the daily first-game bonus on the first game of the day", () => {
    const result = applyAward(null, award(), "2026-03-10");

    expect(result.dailyBonus).toBe(ECONOMY.DAILY_FIRST_GAME_BONUS);
    expect(result.granted).toBe(30 + ECONOMY.DAILY_FIRST_GAME_BONUS);
    expect(result.profile).toMatchObject({
      points: 50,
      totalEarned: 50,
      gamesPlayed: 1,
      wins: 1,
      streak: { lastDay: "2026-03-10", count: 1 },
    });
  });

  it("gives no daily bonus on the second game of the same day", () => {
    const first = applyAward(null, award(), "2026-03-10");
    const second = applyAward(first.profile, award({ awardKey: "room2" }), "2026-03-10");

    expect(second.dailyBonus).toBe(0);
    expect(second.granted).toBe(30);
    expect(second.profile.streak.count).toBe(1);
  });

  it("grows the streak on consecutive days and resets it after a gap", () => {
    const day1 = applyAward(null, award(), "2026-03-10");
    const day2 = applyAward(day1.profile, award({ awardKey: "room2" }), "2026-03-11");
    const afterGap = applyAward(day2.profile, award({ awardKey: "room3" }), "2026-03-14");

    expect(day2.streakCount).toBe(2);
    expect(day2.dailyBonus).toBe(ECONOMY.DAILY_FIRST_GAME_BONUS + ECONOMY.STREAK_BONUS_PER_DAY);
    expect(afterGap.streakCount).toBe(1);
  });

  it("caps the streak bonus", () => {
    const profile = { streak: { lastDay: "2026-03-09", count: 30 } };

    const result = applyAward(profile, award(), "2026-03-10");

    expect(result.dailyBonus).toBe(
      ECONOMY.DAILY_FIRST_GAME_BONUS + ECONOMY.STREAK_BONUS_PER_DAY * (ECONOMY.STREAK_CAP_DAYS - 1)
    );
  });

  it("limits what a player can earn in one day", () => {
    const profile = {
      points: 100,
      totalEarned: 100,
      streak: { lastDay: "2026-03-10", count: 1 },
      daily: { day: "2026-03-10", earned: ECONOMY.DAILY_EARN_CAP - 10 },
    };

    const result = applyAward(profile, award(), "2026-03-10");

    expect(result.granted).toBe(10);
    expect(result.wasCapped).toBe(true);
    expect(result.profile.daily.earned).toBe(ECONOMY.DAILY_EARN_CAP);
  });

  it("still counts the game once the daily cap is reached", () => {
    const profile = {
      streak: { lastDay: "2026-03-10", count: 1 },
      daily: { day: "2026-03-10", earned: ECONOMY.DAILY_EARN_CAP },
    };

    const result = applyAward(profile, award(), "2026-03-10");

    expect(result.granted).toBe(0);
    expect(result.profile.gamesPlayed).toBe(1);
    expect(result.profile.awards.room1).toBe(0);
  });

  it("resets the daily total on a new day", () => {
    const profile = {
      streak: { lastDay: "2026-03-10", count: 1 },
      daily: { day: "2026-03-10", earned: ECONOMY.DAILY_EARN_CAP },
    };

    const result = applyAward(profile, award(), "2026-03-11");

    expect(result.granted).toBeGreaterThan(0);
  });

  it("ignores an award that was already claimed or is worth nothing", () => {
    const claimed = applyAward(null, award(), "2026-03-10").profile;

    expect(applyAward(claimed, award(), "2026-03-10")).toBeNull();
    expect(applyAward(null, award({ basePoints: 0 }), "2026-03-10")).toBeNull();
  });

  it("counts hosted games separately and never as wins", () => {
    const result = applyAward(null, award({ kind: "host", won: false }), "2026-03-10");

    expect(result.profile).toMatchObject({ gamesPlayed: 0, gamesHosted: 1, wins: 0 });
  });

  it("starts lifetime earnings from existing points for older profiles", () => {
    const result = applyAward({ points: 120 }, award(), "2026-03-10");

    expect(result.profile.totalEarned).toBe(120 + result.granted);
  });

  it("does not mutate the profile it was given", () => {
    const profile = { points: 5, awards: {} };
    const snapshot = JSON.stringify(profile);

    applyAward(profile, award(), "2026-03-10");

    expect(JSON.stringify(profile)).toBe(snapshot);
  });
});

describe("getLevel", () => {
  it("follows 50 * (level - 1)^2 thresholds", () => {
    expect(getLevel(0).level).toBe(1);
    expect(getLevel(49).level).toBe(1);
    expect(getLevel(50).level).toBe(2);
    expect(getLevel(200).level).toBe(3);
    expect(getLevel(2450).level).toBe(8);
  });

  it("reports progress inside the level", () => {
    const { currentXp, neededXp, progress } = getLevel(125);

    expect(currentXp).toBe(75);
    expect(neededXp).toBe(150);
    expect(progress).toBeCloseTo(0.5);
  });

  it("treats bad input as zero", () => {
    expect(getLevel(undefined).level).toBe(1);
    expect(getLevel(-5).level).toBe(1);
  });
});
