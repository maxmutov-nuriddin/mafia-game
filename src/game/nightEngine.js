import { ROLE, getAbilities, getRoleId, isMafiaRole } from "./abilities";
import { expandDeaths } from "./dayEngine";

const BLOCKING_ABILITIES = ["block", "arrest"];

const toTargetList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

/**
 * Keep only actions the player may actually use: alive targets, right number of picks,
 * no self-target unless allowed.
 * @returns {Record<string, Record<string, string[]>>} playerId -> abilityKey -> target ids
 */
export function sanitizeActions({ players, actions, state, round }) {
  const aliveIds = new Set(players.filter((p) => !p.eliminated).map((p) => p.id));
  const result = {};

  players.forEach((player) => {
    const submitted = actions?.[player.id];
    if (!submitted) return;

    const valid = {};
    getAbilities(player, { players, state, round }).forEach((abilityDef) => {
      const targets = toTargetList(submitted[abilityDef.key]);
      const hasValidTargets =
        targets.length === abilityDef.picks &&
        new Set(targets).size === targets.length &&
        targets.every(
          (targetId) => aliveIds.has(targetId) && (abilityDef.allowSelf || targetId !== player.id)
        );

      if (hasValidTargets) valid[abilityDef.key] = targets;
    });

    if (Object.keys(valid).length > 0) result[player.id] = valid;
  });

  return result;
}

/** Most voted target; a tie goes to the Don's pick, otherwise the first of the tied. */
function pickMafiaTarget(votes) {
  if (votes.length === 0) return null;

  const counts = new Map();
  votes.forEach(({ targetId }) => counts.set(targetId, (counts.get(targetId) || 0) + 1));
  const best = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, count]) => count === best).map(([id]) => id);

  if (tied.length === 1) return tied[0];
  const donVote = votes.find((vote) => vote.isDon && tied.includes(vote.targetId));
  return donVote ? donVote.targetId : tied[0];
}

/**
 * Resolve one night. Pure: returns new state, never mutates the input.
 * @returns {{
 *   deaths: string[],
 *   silencedId: string|null,
 *   privateResults: Record<string, object>,
 *   nextState: object,
 * }}
 */
export function resolveNight({ players, actions, state, round }) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const roleOf = (id) => getRoleId(byId[id]);
  const submitted = sanitizeActions({ players, actions, state, round });

  const blockerIds = new Set(
    Object.entries(submitted)
      .filter(([, abilityMap]) => BLOCKING_ABILITIES.some((key) => abilityMap[key]))
      .map(([playerId]) => playerId)
  );
  const blockedIds = new Set();
  blockerIds.forEach((blockerId) => {
    BLOCKING_ABILITIES.forEach((key) => {
      (submitted[blockerId][key] || []).forEach((targetId) => blockedIds.add(targetId));
    });
  });

  const privateResults = {};
  const effective = {};
  Object.entries(submitted).forEach(([playerId, abilityMap]) => {
    if (blockedIds.has(playerId) && !blockerIds.has(playerId)) {
      privateResults[playerId] = { key: "blocked" };
      return;
    }
    effective[playerId] = abilityMap;
  });

  const withAbility = (key) =>
    Object.entries(effective)
      .filter(([, abilityMap]) => abilityMap[key])
      .map(([playerId, abilityMap]) => ({ playerId, targets: abilityMap[key] }));

  const sniperUsed = { ...state.sniperUsed };
  const immortalUsed = { ...state.immortalUsed };

  const mafiaVotes = withAbility("kill").map(({ playerId, targets }) => ({
    targetId: targets[0],
    isDon: roleOf(playerId) === ROLE.DON,
  }));
  const attempts = [
    pickMafiaTarget(mafiaVotes),
    ...withAbility("maniacKill").map(({ targets }) => targets[0]),
    ...withAbility("snipe").map(({ playerId, targets }) => {
      sniperUsed[playerId] = true;
      return targets[0];
    }),
  ].filter(Boolean);

  const healedIds = new Set(withAbility("heal").map(({ targets }) => targets[0]));
  const killedIds = [];
  attempts.forEach((targetId) => {
    if (healedIds.has(targetId)) return;
    if (roleOf(targetId) === ROLE.IMMORTAL && !immortalUsed[targetId]) {
      immortalUsed[targetId] = true;
      return;
    }
    killedIds.push(targetId);
  });

  let lovers = state.lovers;
  withAbility("link").forEach(({ targets }) => {
    lovers = targets;
    targets.forEach((memberId) => {
      const partnerId = targets.find((id) => id !== memberId);
      privateResults[memberId] = { key: "lovers", targetId: partnerId };
    });
  });

  [...withAbility("check"), ...withAbility("arrest")].forEach(({ playerId, targets }) => {
    privateResults[playerId] = {
      key: "check",
      targetId: targets[0],
      isMafia: isMafiaRole(roleOf(targets[0])),
    };
  });

  withAbility("donCheck").forEach(({ playerId, targets }) => {
    privateResults[playerId] = {
      key: "donCheck",
      targetId: targets[0],
      isCommissioner: roleOf(targets[0]) === ROLE.COMMISSIONER,
    };
  });

  withAbility("watch").forEach(({ playerId, targets }) => {
    const watchedActions = effective[targets[0]];
    const visitedId = watchedActions ? Object.values(watchedActions)[0][0] : null;
    privateResults[playerId] = { key: "watch", targetId: targets[0], visitedId };
  });

  const silenced = withAbility("silence")[0];
  const protectedAction = withAbility("protect")[0];

  const deaths = expandDeaths(killedIds, lovers, players);

  return {
    deaths,
    silencedId: silenced ? silenced.targets[0] : null,
    privateResults,
    nextState: {
      ...state,
      lovers,
      sniperUsed,
      immortalUsed,
      protectedId: protectedAction ? protectedAction.targets[0] : null,
    },
  };
}
