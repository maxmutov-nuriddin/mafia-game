import { describe, expect, it } from "vitest";
import { ROLE } from "../abilities";
import { didPlayerWin } from "../points";

const withRole = (roleId) => ({ id: "p", character: { id: roleId } });

describe("didPlayerWin", () => {
  it("counts the whole mafia team as winners when the mafia wins", () => {
    expect(didPlayerWin(withRole(ROLE.MAFIA), "mafia")).toBe(true);
    expect(didPlayerWin(withRole(ROLE.ADVOCATE), "mafia")).toBe(true);
    expect(didPlayerWin(withRole(ROLE.DOCTOR), "mafia")).toBe(false);
  });

  it("counts everyone except mafia and maniac as city winners", () => {
    expect(didPlayerWin(withRole(ROLE.CIVILIAN), "city")).toBe(true);
    expect(didPlayerWin(withRole(ROLE.DON), "city")).toBe(false);
    expect(didPlayerWin(withRole(ROLE.MANIAC), "city")).toBe(false);
  });

  it("lets only the maniac win a maniac game", () => {
    expect(didPlayerWin(withRole(ROLE.MANIAC), "maniac")).toBe(true);
    expect(didPlayerWin(withRole(ROLE.CIVILIAN), "maniac")).toBe(false);
  });

  it("is false for an unknown winner", () => {
    expect(didPlayerWin(withRole(ROLE.CIVILIAN), null)).toBe(false);
  });
});
