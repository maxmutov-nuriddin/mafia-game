import { describe, expect, it } from "vitest";
import { NICK_MAX_LENGTH, generateRandomNick, nickKey, validateNick } from "../nick";
import { FRIEND_STATUS, getFriendStatus, isFriendOnline } from "../status";

describe("validateNick", () => {
  it("accepts letters, digits and underscore and trims spaces", () => {
    expect(validateNick("  Don_42 ")).toEqual({ ok: true, value: "Don_42", key: "don_42" });
  });

  it("rejects too short, too long and unsupported characters", () => {
    expect(validateNick("ab").ok).toBe(false);
    expect(validateNick("a".repeat(NICK_MAX_LENGTH + 1)).ok).toBe(false);
    expect(validateNick("bad nick").ok).toBe(false);
    expect(validateNick("nik!").ok).toBe(false);
    expect(validateNick("слово").ok).toBe(false);
  });

  it("treats empty input as invalid", () => {
    expect(validateNick("")).toEqual({ ok: false, reason: "invalid" });
    expect(validateNick(undefined)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("nickKey", () => {
  it("makes nicks that differ only by case collide", () => {
    expect(nickKey("DonCorleone")).toBe(nickKey(" doncorleone "));
  });
});

describe("generateRandomNick", () => {
  it("is deterministic for a given random source", () => {
    const fixed = () => 0;

    expect(generateRandomNick(fixed)).toBe(generateRandomNick(fixed));
  });

  it("always produces a valid nick", () => {
    for (let index = 0; index < 500; index += 1) {
      expect(validateNick(generateRandomNick()).ok).toBe(true);
    }
  });

  it("works at the extremes of the random range", () => {
    expect(validateNick(generateRandomNick(() => 0)).ok).toBe(true);
    expect(validateNick(generateRandomNick(() => 0.999999)).ok).toBe(true);
  });
});

describe("getFriendStatus", () => {
  it("is offline without a presence record or when not online", () => {
    expect(getFriendStatus(null)).toBe(FRIEND_STATUS.OFFLINE);
    expect(getFriendStatus(undefined)).toBe(FRIEND_STATUS.OFFLINE);
    expect(getFriendStatus({ online: false, inGame: true })).toBe(FRIEND_STATUS.OFFLINE);
  });

  it("is online on the platform and in game while playing", () => {
    expect(getFriendStatus({ online: true })).toBe(FRIEND_STATUS.ONLINE);
    expect(getFriendStatus({ online: true, inGame: true })).toBe(FRIEND_STATUS.IN_GAME);
  });

  it("counts online and in game as online", () => {
    expect(isFriendOnline(FRIEND_STATUS.ONLINE)).toBe(true);
    expect(isFriendOnline(FRIEND_STATUS.IN_GAME)).toBe(true);
    expect(isFriendOnline(FRIEND_STATUS.OFFLINE)).toBe(false);
  });
});
