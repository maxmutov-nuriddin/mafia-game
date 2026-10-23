import { toast } from "react-toastify";
import { ECONOMY } from "../../game/economy";

/**
 * Tell the user what a claimed award gave them.
 * @param {{granted: number, dailyBonus: number, streakCount: number, wasCapped: boolean}|null} outcome
 * @param {(key: string, params?: object) => string} t
 */
export function announceAward(outcome, t) {
  if (!outcome) return;

  if (outcome.granted > 0) toast.success(t("points.earned", { n: outcome.granted }));
  if (outcome.dailyBonus > 0 && !outcome.wasCapped) {
    toast.info(t("points.dailyBonus", { n: outcome.dailyBonus, streak: outcome.streakCount }));
  }
  if (outcome.wasCapped) toast.warn(t("points.capped", { cap: ECONOMY.DAILY_EARN_CAP }));
}
