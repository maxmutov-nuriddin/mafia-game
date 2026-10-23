import { useState } from "react";
import { toast } from "react-toastify";
import { useLanguage } from "../i18n/LanguageContext";
import { getRoleName } from "../i18n/roles";
import { characters } from "../services/data";
import {
  DEFAULT_SKIN_ID,
  SKINS,
  getPurchaseBlock,
  getSkin,
  getSkinCardStyle,
  getSkinClassName,
  getSkinMinLevel,
  isSkinOwned,
} from "../game/skins";
import { equipSkin, purchaseSkin } from "../services/profileService";

const DEFAULT_PREVIEW_ROLE_ID = 1;

const TIER_BADGE_CLASS = {
  common: "bg-[#e5dccb] text-[#250506]",
  rare: "bg-sky-200 text-sky-900",
  epic: "bg-fuchsia-200 text-fuchsia-900",
  legendary: "bg-amber-300 text-amber-950",
};

const roleImage = (character) => String(character.img || "").replace("./", "/");

/**
 * Skin shop: big preview + role picker on the left, compact skin list on the right.
 * A skin is one style for every role, so the preview can show it on any character.
 * @param {{profile: {points: number, totalEarned: number, ownedSkins: object, skin: string}}} props
 */
const SkinShop = ({ profile }) => {
  const { t, language } = useLanguage();
  const [busySkinId, setBusySkinId] = useState("");
  const [previewSkinId, setPreviewSkinId] = useState(profile.skin || DEFAULT_SKIN_ID);
  const [previewRoleId, setPreviewRoleId] = useState(DEFAULT_PREVIEW_ROLE_ID);

  const previewSkin = getSkin(previewSkinId);
  const previewRole =
    characters.find((character) => Number(character.id) === previewRoleId) || characters[0];

  const runAction = async (skinId, action, successKey) => {
    if (busySkinId) return;
    setBusySkinId(skinId);
    try {
      const didChange = await action(skinId);
      if (!didChange) {
        toast.error(t("shop.error"));
      } else if (successKey) {
        toast.success(t(successKey));
      }
    } catch (error) {
      console.error("Skin action error:", error);
      toast.error(t("shop.error"));
    } finally {
      setBusySkinId("");
    }
  };

  const renderAction = (skin) => {
    const isBusy = busySkinId === skin.id;
    const block = getPurchaseBlock(profile, skin);

    if (profile.skin === skin.id) {
      return (
        <button type="button" disabled className="mafia-btn mafia-btn--tiny whitespace-nowrap">
          {t("shop.equipped")}
        </button>
      );
    }

    if (isSkinOwned(profile, skin.id)) {
      return (
        <button
          type="button"
          onClick={() => runAction(skin.id, equipSkin)}
          disabled={isBusy}
          className="mafia-btn mafia-btn--tiny mafia-btn--primary whitespace-nowrap"
        >
          {t("shop.equip")}
        </button>
      );
    }

    if (block === "level") {
      return (
        <button type="button" disabled className="mafia-btn mafia-btn--tiny whitespace-nowrap">
          {t("shop.needLevel", { n: getSkinMinLevel(skin) })}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() =>
          block === "points"
            ? toast.warn(t("shop.notEnough"))
            : runAction(skin.id, purchaseSkin, "shop.bought")
        }
        disabled={isBusy}
        className={`mafia-btn mafia-btn--tiny whitespace-nowrap ${block === "points" ? "opacity-60" : ""}`}
      >
        {t("shop.buy", { price: skin.price })}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-black">{t("shop.title")}</h2>
        <span className="mafia-panel bg-white px-3 py-1 text-sm font-black">
          {profile.points} {t("points.label")}
        </span>
      </div>
      <p className="text-xs font-semibold opacity-75">
        {t("shop.hint")} {t("shop.previewHint")}
      </p>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2">
          <div
            className={`mafia-role-card flex h-52 w-36 flex-col p-2 sm:h-60 sm:w-44 ${getSkinClassName(previewSkin.id)}`}
            style={getSkinCardStyle(previewSkin.id)}
          >
            <div className="flex min-h-0 flex-1 items-center justify-center p-1">
              <img
                src={roleImage(previewRole)}
                alt={getRoleName(previewRole, language)}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="mt-1 rounded-lg border border-[#250506]/20 bg-[#f4ede1]/85 px-2 py-1 text-center">
              <p className="text-sm font-black leading-tight">{getRoleName(previewRole, language)}</p>
            </div>
          </div>

          <p className="text-sm font-black">{t(`skin.${previewSkin.id}`)}</p>

          <div className="flex w-full gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:justify-center lg:overflow-visible">
            {characters.map((character) => {
              const isSelected = Number(character.id) === previewRoleId;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => setPreviewRoleId(Number(character.id))}
                  aria-pressed={isSelected}
                  aria-label={getRoleName(character, language)}
                  title={getRoleName(character, language)}
                  className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 bg-white/80 p-0.5 ${
                    isSelected ? "border-[#250506]" : "border-transparent opacity-70"
                  }`}
                >
                  <img src={roleImage(character)} alt="" className="h-full w-full object-contain" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex max-h-[44vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[62vh]">
          {SKINS.map((skin) => (
            <div
              key={skin.id}
              onClick={() => setPreviewSkinId(skin.id)}
              className={`mafia-panel flex cursor-pointer items-center gap-3 bg-white/90 p-2 ${
                previewSkinId === skin.id ? "ring-2 ring-[#250506]" : ""
              }`}
            >
              <div
                className={`mafia-role-card flex h-14 w-10 shrink-0 items-center justify-center p-1 ${getSkinClassName(skin.id)}`}
                style={getSkinCardStyle(skin.id)}
              >
                <img src={roleImage(previewRole)} alt="" className="max-h-full max-w-full object-contain" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{t(`skin.${skin.id}`)}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${TIER_BADGE_CLASS[skin.tier]}`}
                >
                  {t(`tier.${skin.tier}`)}
                </span>
                {skin.id === DEFAULT_SKIN_ID && (
                  <span className="ml-2 text-xs font-semibold opacity-70">{t("shop.free")}</span>
                )}
              </div>

              <div onClick={(event) => event.stopPropagation()}>{renderAction(skin)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkinShop;
