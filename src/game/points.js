import { ROLE, getRoleId, isMafiaRole } from "./abilities";

/** @param {"mafia"|"city"|"maniac"} winner */
export function didPlayerWin(player, winner) {
  const roleId = getRoleId(player);
  if (winner === "mafia") return isMafiaRole(roleId);
  if (winner === "maniac") return roleId === ROLE.MANIAC;
  if (winner === "city") return !isMafiaRole(roleId) && roleId !== ROLE.MANIAC;
  return false;
}
