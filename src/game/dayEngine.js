import { ROLE, getRoleId, isMafiaRole } from "./abilities";

export const SKIP_VOTE = "skip";

/**
 * Add the lovers' partners to a death list (a lover dies with their pair).
 * @returns {string[]} unique ids, original order first
 */
export function expandDeaths(deathIds, lovers, players) {
  const aliveIds = new Set(players.filter((p) => !p.eliminated).map((p) => p.id));
  const result = [...new Set(deathIds)];

  if (lovers.length === 2) {
    const [first, second] = lovers;
    if (result.includes(first) && aliveIds.has(second) && !result.includes(second)) {
      result.push(second);
    }
    if (result.includes(second) && aliveIds.has(first) && !result.includes(first)) {
      result.push(first);
    }
  }

  return result;
}

/**
 * Tally the day vote. A tie, a skip majority or a protected top target eliminates nobody.
 * @param {{players: object[], votes: Record<string,string>, state: {protectedId?: string|null}}} input
 */
export function resolveVote({ players, votes, state }) {
  const aliveIds = new Set(players.filter((p) => !p.eliminated).map((p) => p.id));
  const tally = {};

  Object.entries(votes || {}).forEach(([voterId, targetId]) => {
    if (!aliveIds.has(voterId)) return;
    if (targetId !== SKIP_VOTE && !aliveIds.has(targetId)) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [top, runnerUp] = ranked;

  if (!top || top[0] === SKIP_VOTE || (runnerUp && runnerUp[1] === top[1])) {
    return { eliminatedId: null, tally, wasProtected: false };
  }

  if (top[0] === state.protectedId) {
    return { eliminatedId: null, tally, wasProtected: true };
  }

  return { eliminatedId: top[0], tally, wasProtected: false };
}

/** @returns {"mafia"|"city"|"maniac"|null} */
export function checkWinner(players) {
  const alive = players.filter((p) => !p.eliminated && p.character);
  if (alive.length === 0) return null;

  const mafia = alive.filter((p) => isMafiaRole(getRoleId(p))).length;
  const maniac = alive.filter((p) => getRoleId(p) === ROLE.MANIAC).length;
  const others = alive.length - mafia - maniac;

  if (mafia === 0 && maniac === 0) return "city";
  if (mafia === 0 && maniac > 0 && others <= 1) return "maniac";
  if (mafia > 0 && mafia >= others + maniac) return "mafia";
  return null;
}
