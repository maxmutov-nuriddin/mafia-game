import { describe, expect, it } from "vitest";
import { ROLE } from "../abilities";
import { SKIP_VOTE, checkWinner, expandDeaths, resolveVote } from "../dayEngine";
import { PHASE, createInitialGameState, getNextPhase, normalizeGameState, normalizeSettings } from "../phases";

const player = (id, roleId, extra = {}) => ({
  id,
  name: id,
  eliminated: false,
  character: { id: roleId },
  ...extra,
});

const state = (extra = {}) => ({ ...createInitialGameState({ actions: true, discussion: true }), ...extra });

describe("resolveVote", () => {
  const players = [player("a", ROLE.CIVILIAN), player("b", ROLE.CIVILIAN), player("c", ROLE.MAFIA)];

  it("eliminates the most voted player", () => {
    const result = resolveVote({ players, votes: { a: "c", b: "c", c: "a" }, state: state() });

    expect(result.eliminatedId).toBe("c");
    expect(result.tally).toEqual({ c: 2, a: 1 });
  });

  it("eliminates nobody on a tie", () => {
    const result = resolveVote({ players, votes: { a: "b", b: "a" }, state: state() });

    expect(result.eliminatedId).toBeNull();
  });

  it("eliminates nobody when skip wins", () => {
    const result = resolveVote({ players, votes: { a: SKIP_VOTE, b: SKIP_VOTE, c: "a" }, state: state() });

    expect(result.eliminatedId).toBeNull();
  });

  it("protects the advocate's player from the vote", () => {
    const result = resolveVote({ players, votes: { a: "c", b: "c" }, state: state({ protectedId: "c" }) });

    expect(result.eliminatedId).toBeNull();
    expect(result.wasProtected).toBe(true);
  });

  it("ignores votes from dead players and votes for dead players", () => {
    const withDead = [...players, player("d", ROLE.CIVILIAN, { eliminated: true })];

    const result = resolveVote({ players: withDead, votes: { d: "a", a: "d", b: "c" }, state: state() });

    expect(result.eliminatedId).toBe("c");
    expect(result.tally).toEqual({ c: 1 });
  });
});

describe("expandDeaths", () => {
  it("adds the partner of a dead lover once", () => {
    const players = [player("a", ROLE.CIVILIAN), player("b", ROLE.CIVILIAN)];

    expect(expandDeaths(["a"], ["a", "b"], players)).toEqual(["a", "b"]);
    expect(expandDeaths(["a", "b"], ["a", "b"], players)).toEqual(["a", "b"]);
  });

  it("leaves deaths alone without lovers", () => {
    expect(expandDeaths(["a"], [], [player("a", ROLE.CIVILIAN)])).toEqual(["a"]);
  });
});

describe("checkWinner", () => {
  it("is a city win when no mafia or maniac remains", () => {
    const players = [player("a", ROLE.CIVILIAN), player("m", ROLE.MAFIA, { eliminated: true })];

    expect(checkWinner(players)).toBe("city");
  });

  it("is a mafia win when mafia equals the rest", () => {
    const players = [player("m", ROLE.MAFIA), player("a", ROLE.CIVILIAN)];

    expect(checkWinner(players)).toBe("mafia");
  });

  it("is a maniac win when only the maniac and one player are left", () => {
    const players = [player("x", ROLE.MANIAC), player("a", ROLE.CIVILIAN)];

    expect(checkWinner(players)).toBe("maniac");
  });

  it("continues the game otherwise", () => {
    const players = [player("m", ROLE.MAFIA), player("a", ROLE.CIVILIAN), player("b", ROLE.DOCTOR)];

    expect(checkWinner(players)).toBeNull();
  });

  it("ignores players that have no role yet", () => {
    expect(checkWinner([{ id: "a", eliminated: false, character: null }])).toBeNull();
  });
});

describe("phases", () => {
  const full = { actions: true, discussion: true, discussionSeconds: 120 };

  it("cycles night, morning, discussion, voting with discussion on", () => {
    expect(getNextPhase(PHASE.NIGHT, full)).toBe(PHASE.MORNING);
    expect(getNextPhase(PHASE.MORNING, full)).toBe(PHASE.DISCUSSION);
    expect(getNextPhase(PHASE.DISCUSSION, full)).toBe(PHASE.VOTING);
    expect(getNextPhase(PHASE.VOTING, full)).toBe(PHASE.NIGHT);
  });

  it("skips discussion when it is off", () => {
    expect(getNextPhase(PHASE.MORNING, { ...full, discussion: false })).toBe(PHASE.VOTING);
  });

  it("toggles idle and discussion when only discussion is on", () => {
    const onlyDiscussion = { ...full, actions: false };

    expect(getNextPhase(PHASE.IDLE, onlyDiscussion)).toBe(PHASE.DISCUSSION);
    expect(getNextPhase(PHASE.DISCUSSION, onlyDiscussion)).toBe(PHASE.IDLE);
  });

  it("ends the game once there is a winner", () => {
    expect(getNextPhase(PHASE.VOTING, full, true)).toBe(PHASE.ENDED);
  });

  it("treats rooms without settings as having the flow off", () => {
    expect(normalizeSettings(undefined)).toMatchObject({ actions: false, discussion: false });
    expect(normalizeSettings({ actions: true, discussion: true, discussionSeconds: 999 }).discussionSeconds).toBe(120);
  });

  it("restores arrays and objects Firebase drops", () => {
    const restored = normalizeGameState({ phase: PHASE.MORNING, round: 2, morning: {} });

    expect(restored.lovers).toEqual([]);
    expect(restored.sniperUsed).toEqual({});
    expect(restored.morning.deaths).toEqual([]);
    expect(normalizeGameState(null)).toBeNull();
  });
});
