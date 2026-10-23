import { useState } from "react";
import { Info } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { DISCUSSION_SECONDS_OPTIONS } from "../game/phases";

const SECONDS_PER_MINUTE = 60;

const OptionRow = ({ title, info, checked, onToggle }) => {
  const { t } = useLanguage();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <div className="mafia-panel bg-white/90 p-3 text-left">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={onToggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            checked ? "bg-green-600" : "bg-[#250506]/30"
          }`}
        >
          <span
            className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-black leading-tight">{title}</p>
          <p className={`text-xs font-bold ${checked ? "text-green-700" : "opacity-60"}`}>
            {checked ? t("options.on") : t("options.off")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsInfoOpen((prev) => !prev)}
          aria-label={t("options.infoLabel")}
          aria-expanded={isInfoOpen}
          className="mafia-btn mafia-btn--icon mafia-btn--tiny"
        >
          <Info size={14} />
        </button>
      </div>
      {isInfoOpen && (
        <p className="mt-2 text-xs font-semibold leading-relaxed opacity-80">{info}</p>
      )}
    </div>
  );
};

/**
 * @param {{
 *   value: {discussion: boolean, actions: boolean, discussionSeconds: number},
 *   onChange: (next: object) => void,
 *   layout?: "stack" | "grid",
 * }} props
 */
const RoomOptionsPanel = ({ value, onChange, layout = "stack" }) => {
  const { t } = useLanguage();

  return (
    <div
      className={`grid w-full grid-cols-1 gap-2 ${
        layout === "grid" ? "sm:grid-cols-2 sm:items-start" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <OptionRow
          title={t("options.discussion.title")}
          info={t("options.discussion.info")}
          checked={value.discussion}
          onToggle={() => onChange({ ...value, discussion: !value.discussion })}
        />

        {value.discussion && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-sm font-semibold">{t("options.duration")}</span>
            <div className="flex gap-1">
              {DISCUSSION_SECONDS_OPTIONS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => onChange({ ...value, discussionSeconds: seconds })}
                  className={`mafia-btn mafia-btn--tiny ${
                    value.discussionSeconds === seconds ? "mafia-btn--primary" : ""
                  }`}
                >
                  {t("options.minutes", { n: seconds / SECONDS_PER_MINUTE })}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <OptionRow
        title={t("options.actions.title")}
        info={t("options.actions.info")}
        checked={value.actions}
        onToggle={() => onChange({ ...value, actions: !value.actions })}
      />
    </div>
  );
};

export default RoomOptionsPanel;
