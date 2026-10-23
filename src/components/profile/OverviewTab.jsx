import { Coins, Flame, Gamepad2, Mic, Percent, Trophy } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { ECONOMY, getLevel } from "../../game/economy";
import { getSkinCardStyle, getSkinClassName } from "../../game/skins";

const PERCENT = 100;

const Tile = ({ icon, value, label }) => {
  const Icon = icon;

  return (
    <div className="mafia-panel flex flex-col items-center gap-1.5 bg-white px-2 py-3 text-center last:col-span-2 sm:last:col-span-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#250506] text-[#DBD0C0]">
        <Icon size={17} />
      </span>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="text-xs font-semibold leading-tight opacity-70">{label}</p>
    </div>
  );
};

const ProgressBar = ({ ratio, colorClass = "bg-green-600" }) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-[#250506]/15">
    <div
      className={`h-full rounded-full transition-all ${colorClass}`}
      style={{ width: `${Math.round(Math.min(Math.max(ratio, 0), 1) * PERCENT)}%` }}
    />
  </div>
);

/** Seven pips: one per streak day, filled up to the current streak. */
const StreakPips = ({ streak }) => (
  <div className="flex gap-1.5" aria-hidden="true">
    {Array.from({ length: ECONOMY.STREAK_CAP_DAYS }, (_, index) => (
      <span
        key={index}
        className={`h-2.5 flex-1 rounded-full ${index < streak ? "bg-orange-500" : "bg-[#250506]/15"}`}
      />
    ))}
  </div>
);

/**
 * Profile overview: identity and level, key stats, daily progress and earning rules.
 * @param {{profile: object, nick: string|null, fallbackName: string}} props
 */
const OverviewTab = ({ profile, nick, fallbackName }) => {
  const { t } = useLanguage();
  const level = getLevel(profile.totalEarned);
  const displayName = nick || fallbackName;
  const winRate = profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * PERCENT) : 0;
  const streakDays = Math.min(profile.streak, ECONOMY.STREAK_CAP_DAYS);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="mafia-panel flex items-center gap-4 bg-white p-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#250506] text-2xl font-black text-[#DBD0C0]">
            {displayName.slice(0, 1).toUpperCase()}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black">{displayName}</p>
            <p className="text-sm font-bold">{t("profile.level", { n: level.level })}</p>
            <div className="mt-1.5">
              <ProgressBar ratio={level.progress} />
            </div>
            <p className="mt-1 text-xs font-semibold opacity-70">
              {t("profile.xp", { current: level.currentXp, needed: level.neededXp })}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <div
              className={`mafia-role-card flex h-20 w-14 items-center justify-center p-1 ${getSkinClassName(profile.skin)}`}
              style={getSkinCardStyle(profile.skin)}
            >
              <img src="/mafia.webp" alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <p className="text-xs font-black">{t(`skin.${profile.skin}`)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile icon={Coins} value={profile.points} label={t("points.label")} />
          <Tile icon={Gamepad2} value={profile.gamesPlayed} label={t("points.games")} />
          <Tile icon={Trophy} value={profile.wins} label={t("points.wins")} />
          <Tile icon={Percent} value={`${winRate}%`} label={t("profile.winRate")} />
          <Tile icon={Mic} value={profile.gamesHosted} label={t("profile.hosted")} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="mafia-panel flex flex-col gap-3 bg-white p-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-sm font-black">{t("profile.today")}</p>
              <p className="text-sm font-black">
                {profile.earnedToday} / {ECONOMY.DAILY_EARN_CAP}
              </p>
            </div>
            <ProgressBar ratio={profile.earnedToday / ECONOMY.DAILY_EARN_CAP} colorClass="bg-sky-600" />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-black">
                <Flame size={16} className="text-orange-500" />
                {t("profile.streak")}
              </p>
              <p className="text-sm font-black">{profile.streak}</p>
            </div>
            <StreakPips streak={streakDays} />
          </div>
        </div>

        <details className="mafia-panel bg-white/90 p-3 text-sm font-semibold">
          <summary className="cursor-pointer font-black">{t("earn.title")}</summary>
          <ul className="mt-2 flex flex-col gap-1 opacity-85">
            <li>{t("earn.participation", { n: ECONOMY.PARTICIPATION })}</li>
            <li>{t("earn.win", { n: ECONOMY.WIN_BONUS })}</li>
            <li>{t("earn.survival", { n: ECONOMY.SURVIVAL_BONUS })}</li>
            <li>{t("earn.size", { n: ECONOMY.SIZE_BONUS_PER_PLAYER, cap: ECONOMY.SIZE_BONUS_CAP })}</li>
            <li>{t("earn.host", { n: ECONOMY.HOST_BONUS })}</li>
            <li>
              {t("earn.daily", {
                n: ECONOMY.DAILY_FIRST_GAME_BONUS,
                streak: ECONOMY.STREAK_BONUS_PER_DAY,
                days: ECONOMY.STREAK_CAP_DAYS,
              })}
            </li>
            <li>{t("earn.cap", { n: ECONOMY.DAILY_EARN_CAP })}</li>
            <li>{t("earn.min", { n: ECONOMY.MIN_PLAYERS })}</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default OverviewTab;
