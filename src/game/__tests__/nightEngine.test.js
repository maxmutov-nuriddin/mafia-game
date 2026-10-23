import { describe, expect, it } from "vitest";
import { ROLE } from "../abilities";
import { resolveNight, sanitizeActions } from "../nightEngine";
import { createInitialGameState } from "../phases";

const player = (id, roleId, extra = {}) => ({
  id,
  name: id,
  eliminated: false,
  character: { id: roleId },
  ...extra,
});

const baseState = () => createInitialGameState({ actions: true, discussion: true });

const run = (players, actions, { state = baseState(), round = 1 } = {}) =>
  resolveNight({ players, actions, state, round });

describe("resolveNight", () => {
  it("kills the player the mafia chose", () => {
    const players = [player("m", ROLE.MAFIA), player("c", ROLE.CIVILIAN), player("d", ROLE.DOCTOR)];

    const result = run(players, { m: { kill: "c" } });

    expect(result.deaths).toEqual(["c"]);
  });

  it("does not kill when the doctor heals the mafia target", () => {
    const players = [player("m", ROLE.MAFIA), player("c", ROLE.CIVILIAN), player("d", ROLE.DOCTOR)];

    const result = run(players, { m: { kill: "c" }, d: { heal: "c" } });

    expect(result.deaths).toEqual([]);
  });

  it("lets the doctor heal themselves", () => {
    const players = [player("m", ROLE.MAFIA), player("d", ROLE.DOCTOR), player("c", ROLE.CIVILIAN)];

    const result = run(players, { m: { kill: "d" }, d: { heal: "d" } });

    expect(result.deaths).toEqual([]);
  });

  it("ignores the mafia kill when the mafia is blocked by the escort", () => {
    const players = [player("m", ROLE.MAFIA), player("e", ROLE.ESCORT), player("c", ROLE.CIVILIAN)];

    const result = run(players, { m: { kill: "c" }, e: { block: "m" } });

    expect(result.deaths).toEqual([]);
    expect(result.privateResults.m).toEqual({ key: "blocked" });
  });

  it("resolves a mafia tie in favour of the Don", () => {
    const players = [
      player("m", ROLE.MAFIA),
      player("don", ROLE.DON),
      player("a", ROLE.CIVILIAN),
      player("b", ROLE.CIVILIAN),
    ];

    const result = run(players, { m: { kill: "a" }, don: { kill: "b" } });

    expect(result.deaths).toEqual(["b"]);
  });

  it("kills the player with the most mafia votes", () => {
    const players = [
      player("m1", ROLE.MAFIA),
      player("m2", ROLE.MAFIA),
      player("don", ROLE.DON),
      player("a", ROLE.CIVILIAN),
      player("b", ROLE.CIVILIAN),
    ];

    const result = run(players, { m1: { kill: "a" }, m2: { kill: "a" }, don: { kill: "b" } });

    expect(result.deaths).toEqual(["a"]);
  });

  it("lets the maniac and the mafia kill different players the same night", () => {
    const players = [
      player("m", ROLE.MAFIA),
      player("x", ROLE.MANIAC),
      player("a", ROLE.CIVILIAN),
      player("b", ROLE.CIVILIAN),
    ];

    const result = run(players, { m: { kill: "a" }, x: { maniacKill: "b" } });

    expect(result.deaths.sort()).toEqual(["a", "b"]);
  });

  it("kills the lover's partner too", () => {
    const players = [player("m", ROLE.MAFIA), player("a", ROLE.CIVILIAN), player("b", ROLE.CIVILIAN)];
    const state = { ...baseState(), lovers: ["a", "b"] };

    const result = run(players, { m: { kill: "a" } }, { state });

    expect(result.deaths).toEqual(["a", "b"]);
  });

  it("links lovers on the first night and tells both of them", () => {
    const players = [player("q", ROLE.CUPID), player("a", ROLE.CIVILIAN), player("b", ROLE.MAFIA)];

    const result = run(players, { q: { link: ["a", "b"] } });

    expect(result.nextState.lovers).toEqual(["a", "b"]);
    expect(result.privateResults.a).toEqual({ key: "lovers", targetId: "b" });
    expect(result.privateResults.b).toEqual({ key: "lovers", targetId: "a" });
    expect(result.privateResults.q).toBeUndefined();
  });

  it("ignores cupid after the first night", () => {
    const players = [player("q", ROLE.CUPID), player("a", ROLE.CIVILIAN), player("b", ROLE.MAFIA)];

    const result = run(players, { q: { link: ["a", "b"] } }, { round: 2 });

    expect(result.nextState.lovers).toEqual([]);
  });

  it("makes the immortal survive the first attempt only", () => {
    const players = [player("m", ROLE.MAFIA), player("i", ROLE.IMMORTAL), player("c", ROLE.CIVILIAN)];

    const first = run(players, { m: { kill: "i" } });
    const second = run(players, { m: { kill: "i" } }, { state: first.nextState, round: 2 });

    expect(first.deaths).toEqual([]);
    expect(second.deaths).toEqual(["i"]);
  });

  it("lets the sniper shoot once per game", () => {
    const players = [player("s", ROLE.SNIPER), player("a", ROLE.CIVILIAN), player("b", ROLE.CIVILIAN)];

    const first = run(players, { s: { snipe: "a" } });
    const secondRound = run(
      players.map((p) => (p.id === "a" ? { ...p, eliminated: true } : p)),
      { s: { snipe: "b" } },
      { state: first.nextState, round: 2 }
    );

    expect(first.deaths).toEqual(["a"]);
    expect(secondRound.deaths).toEqual([]);
  });

  it("tells the commissioner whether the target is mafia", () => {
    const players = [player("k", ROLE.COMMISSIONER), player("m", ROLE.MAFIA), player("c", ROLE.CIVILIAN)];

    const asMafia = run(players, { k: { check: "m" } });
    const asCivilian = run(players, { k: { check: "c" } });

    expect(asMafia.privateResults.k).toEqual({ key: "check", targetId: "m", isMafia: true });
    expect(asCivilian.privateResults.k.isMafia).toBe(false);
  });

  it("gives the sergeant the check only after the commissioner dies", () => {
    const sergeant = player("s", ROLE.SERGEANT);
    const alive = [player("k", ROLE.COMMISSIONER), sergeant, player("m", ROLE.MAFIA)];
    const commissionerDead = alive.map((p) => (p.id === "k" ? { ...p, eliminated: true } : p));

    const withCommissioner = run(alive, { s: { check: "m" } });
    const withoutCommissioner = run(commissionerDead, { s: { check: "m" } });

    expect(withCommissioner.privateResults.s).toBeUndefined();
    expect(withoutCommissioner.privateResults.s.isMafia).toBe(true);
  });

  it("lets the Don look for the commissioner", () => {
    const players = [player("don", ROLE.DON), player("k", ROLE.COMMISSIONER), player("c", ROLE.CIVILIAN)];

    const result = run(players, { don: { donCheck: "k" } });

    expect(result.privateResults.don).toEqual({ key: "donCheck", targetId: "k", isCommissioner: true });
  });

  it("arrest blocks the target and reveals whether they are mafia", () => {
    const players = [player("h", ROLE.SHERIFF), player("m", ROLE.MAFIA), player("c", ROLE.CIVILIAN)];

    const result = run(players, { h: { arrest: "m" }, m: { kill: "c" } });

    expect(result.deaths).toEqual([]);
    expect(result.privateResults.h).toEqual({ key: "check", targetId: "m", isMafia: true });
  });

  it("shows the journalist who the watched player visited", () => {
    const players = [player("j", ROLE.JOURNALIST), player("d", ROLE.DOCTOR), player("c", ROLE.CIVILIAN)];

    const result = run(players, { j: { watch: "d" }, d: { heal: "c" } });

    expect(result.privateResults.j).toEqual({ key: "watch", targetId: "d", visitedId: "c" });
  });

  it("reports the silenced player and the advocate's protected player", () => {
    const players = [
      player("p", ROLE.PSYCHOLOGIST),
      player("a", ROLE.ADVOCATE),
      player("m", ROLE.MAFIA),
      player("c", ROLE.CIVILIAN),
    ];

    const result = run(players, { p: { silence: "c" }, a: { protect: "m" } });

    expect(result.silencedId).toBe("c");
    expect(result.nextState.protectedId).toBe("m");
  });

  it("does not mutate its inputs", () => {
    const players = [player("m", ROLE.MAFIA), player("c", ROLE.CIVILIAN)];
    const state = baseState();
    const snapshot = JSON.stringify({ players, state });

    run(players, { m: { kill: "c" } }, { state });

    expect(JSON.stringify({ players, state })).toBe(snapshot);
  });
});

describe("sanitizeActions", () => {
  it("drops actions that target dead players, the player themselves or use a missing ability", () => {
    const players = [
      player("m", ROLE.MAFIA),
      player("c", ROLE.CIVILIAN, { eliminated: true }),
      player("z", ROLE.CIVILIAN),
    ];

    const result = sanitizeActions({
      players,
      actions: { m: { kill: "c", heal: "z" }, z: { kill: "m" } },
      state: baseState(),
      round: 1,
    });

    expect(result).toEqual({});
  });

  it("requires two distinct targets for cupid", () => {
    const players = [player("q", ROLE.CUPID), player("a", ROLE.CIVILIAN), player("b", ROLE.CIVILIAN)];

    const same = sanitizeActions({ players, actions: { q: { link: ["a", "a"] } }, state: baseState(), round: 1 });
    const valid = sanitizeActions({ players, actions: { q: { link: ["a", "b"] } }, state: baseState(), round: 1 });

    expect(same).toEqual({});
    expect(valid.q.link).toEqual(["a", "b"]);
  });
});
