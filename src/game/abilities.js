export const ROLE = Object.freeze({
  MAFIA: 1,
  DON: 2,
  ADVOCATE: 3,
  COMMISSIONER: 4,
  DOCTOR: 5,
  SHERIFF: 6,
  PSYCHOLOGIST: 7,
  ESCORT: 8,
  SNIPER: 9,
  JOURNALIST: 10,
  SERGEANT: 11,
  CIVILIAN: 12,
  MANIAC: 13,
  CUPID: 14,
  LOVER: 15,
  BLONDE: 16,
  IMMORTAL: 17,
  EXECUTIONER: 18,
});

export const MAFIA_ROLE_IDS = Object.freeze([ROLE.MAFIA, ROLE.DON, ROLE.ADVOCATE]);

export const getRoleId = (player) => Number(player?.character?.id);

export const isMafiaRole = (roleId) => MAFIA_ROLE_IDS.includes(Number(roleId));

const ability = (key, options = {}) => ({
  key,
  picks: 1,
  allowSelf: false,
  ...options,
});

const ABILITIES_BY_ROLE = {
  [ROLE.MAFIA]: [ability("kill")],
  [ROLE.DON]: [ability("kill"), ability("donCheck")],
  [ROLE.ADVOCATE]: [ability("protect")],
  [ROLE.COMMISSIONER]: [ability("check")],
  [ROLE.DOCTOR]: [ability("heal", { allowSelf: true })],
  [ROLE.SHERIFF]: [ability("arrest")],
  [ROLE.PSYCHOLOGIST]: [ability("silence")],
  [ROLE.ESCORT]: [ability("block")],
  [ROLE.SNIPER]: [ability("snipe")],
  [ROLE.JOURNALIST]: [ability("watch")],
  [ROLE.MANIAC]: [ability("maniacKill")],
};

/**
 * Night abilities a player can use right now.
 * @param {{id: string, eliminated?: boolean, character?: {id: number}}} player
 * @param {{players: object[], state: object, round: number}} context
 * @returns {{key: string, picks: number, allowSelf: boolean}[]}
 */
export function getAbilities(player, { players, state, round }) {
  if (!player || player.eliminated) return [];
  const roleId = getRoleId(player);

  if (roleId === ROLE.SNIPER && state.sniperUsed?.[player.id]) return [];

  if (roleId === ROLE.CUPID) {
    return round === 1 ? [ability("link", { picks: 2 })] : [];
  }

  if (roleId === ROLE.SERGEANT) {
    const commissionerAlive = players.some(
      (other) => !other.eliminated && getRoleId(other) === ROLE.COMMISSIONER
    );
    return commissionerAlive ? [] : [ability("check")];
  }

  return ABILITIES_BY_ROLE[roleId] || [];
}
