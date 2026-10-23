import { getLevel } from "./economy";

export const DEFAULT_SKIN_ID = "classic";

/** Level needed to buy a skin of each rarity. */
export const TIER_MIN_LEVEL = Object.freeze({ common: 1, rare: 3, epic: 5, legendary: 8 });

const CARD_IMAGE = "url('/card-bg-gamer.png')";

const layer = (image, size = "auto", position = "0 0") => ({ image, size, position });
const tint = (color) => layer(`linear-gradient(${color}, ${color})`);

const skin = (id, tier, price, border, glow, layers, animated = false) => ({
  id,
  tier,
  price,
  border,
  glow,
  layers,
  animated,
});

/**
 * Cosmetic card styles bought with profile points. Names live in i18n as `skin.<id>`.
 * Animated skins also need their `.skin-<id>` rules in index.css.
 */
export const SKINS = Object.freeze([
  skin(DEFAULT_SKIN_ID, "common", 0, null, null, []),

  skin("noir", "common", 60, "#b8a77a", "rgba(184, 167, 122, 0.45)", [
    layer("repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.24) 0 6px, transparent 6px 14px)"),
    tint("rgba(37, 5, 6, 0.28)"),
  ]),
  skin("casino", "common", 150, "#8f1d1f", "rgba(143, 29, 31, 0.5)", [
    layer("radial-gradient(circle, rgba(255, 255, 255, 0.2) 0 3px, transparent 3.5px)", "22px 22px"),
    tint("rgba(16, 94, 56, 0.5)"),
  ]),
  skin("newspaper", "common", 150, "#5b4a32", "rgba(91, 74, 50, 0.4)", [
    layer("radial-gradient(rgba(0, 0, 0, 0.3) 1px, transparent 1.5px)", "6px 6px"),
    tint("rgba(160, 130, 80, 0.3)"),
  ]),

  skin("crimson", "rare", 400, "#8f1d1f", "rgba(200, 0, 0, 0.55)", [
    layer("radial-gradient(ellipse at 50% 0%, rgba(200, 0, 0, 0.6), transparent 65%)"),
    layer("radial-gradient(ellipse at 50% 100%, rgba(60, 0, 0, 0.55), transparent 70%)"),
  ]),
  skin("ocean", "rare", 400, "#2980b9", "rgba(41, 128, 185, 0.5)", [
    layer("repeating-radial-gradient(circle at 50% 130%, rgba(255, 255, 255, 0.2) 0 6px, transparent 6px 14px)"),
    tint("rgba(20, 90, 160, 0.38)"),
  ]),
  skin("cyber", "rare", 450, "#00e0b0", "rgba(0, 224, 176, 0.5)", [
    layer("linear-gradient(rgba(0, 255, 200, 0.2) 1px, transparent 1px)", "16px 16px"),
    layer("linear-gradient(90deg, rgba(0, 255, 200, 0.2) 1px, transparent 1px)", "16px 16px"),
    tint("rgba(10, 10, 40, 0.45)"),
  ], true),

  skin("neon", "epic", 800, "#ff2bd6", "rgba(255, 43, 214, 0.6)", [
    layer("radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(255, 43, 214, 0.35))"),
    tint("rgba(30, 0, 60, 0.5)"),
  ], true),
  skin("gold", "epic", 900, "#d4af37", "rgba(212, 175, 55, 0.6)", [
    layer("linear-gradient(135deg, rgba(255, 230, 140, 0.6), rgba(190, 140, 30, 0.5) 50%, rgba(255, 226, 130, 0.6))"),
  ], true),
  skin("ice", "epic", 800, "#8fd3ff", "rgba(143, 211, 255, 0.55)", [
    layer("radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 1.2px, transparent 1.8px)", "34px 34px"),
    layer("linear-gradient(160deg, rgba(210, 240, 255, 0.6), rgba(120, 190, 235, 0.38))"),
  ], true),

  skin("holo", "legendary", 1500, "#c9d6ff", "rgba(201, 214, 255, 0.6)", [
    layer("linear-gradient(135deg, rgba(255, 0, 150, 0.2), rgba(0, 200, 255, 0.2), rgba(130, 255, 0, 0.2))"),
  ], true),
  skin("inferno", "legendary", 1500, "#ff6a00", "rgba(255, 106, 0, 0.6)", [
    layer("linear-gradient(0deg, rgba(255, 90, 0, 0.65), rgba(255, 170, 0, 0.28) 40%, rgba(60, 0, 0, 0.38))"),
  ], true),
  skin("royal", "legendary", 2000, "#d4af37", "rgba(212, 175, 55, 0.6)", [
    layer("radial-gradient(circle, rgba(212, 175, 55, 0.38) 0 4px, transparent 5px)", "26px 26px"),
    layer("radial-gradient(circle at 0 0, rgba(212, 175, 55, 0.28) 0 6px, transparent 7px)", "26px 26px", "13px 13px"),
    tint("rgba(80, 20, 110, 0.5)"),
  ], true),
]);

export const getSkin = (skinId) =>
  SKINS.find((candidate) => candidate.id === skinId) || SKINS[0];

export const getSkinMinLevel = (skinToCheck) => TIER_MIN_LEVEL[skinToCheck.tier] || 1;

/** The default skin is always owned. */
export const isSkinOwned = (profile, skinId) =>
  skinId === DEFAULT_SKIN_ID || Boolean(profile?.ownedSkins?.[skinId]);

/**
 * Why a skin cannot be bought right now, or null when it can.
 * @returns {"owned"|"level"|"points"|null}
 */
export function getPurchaseBlock(profile, skinToBuy) {
  if (isSkinOwned(profile, skinToBuy.id)) return "owned";

  const { level } = getLevel(profile?.totalEarned ?? profile?.points);
  if (level < getSkinMinLevel(skinToBuy)) return "level";
  if (Number(profile?.points || 0) < skinToBuy.price) return "points";
  return null;
}

/** Inline style for a role card face wearing the given skin. */
export function getSkinCardStyle(skinId) {
  const wanted = getSkin(skinId);
  const layers = [...wanted.layers, layer(CARD_IMAGE, "cover", "center")];
  const baseStyle = {
    backgroundImage: layers.map((item) => item.image).join(", "),
    backgroundSize: layers.map((item) => item.size).join(", "),
    backgroundPosition: layers.map((item) => item.position).join(", "),
  };

  if (!wanted.border) return baseStyle;

  return {
    ...baseStyle,
    borderColor: wanted.border,
    boxShadow: `0 0 0 2px ${wanted.border}, 0 10px 26px ${wanted.glow}`,
  };
}

/** Extra CSS class (animations) for a skin; empty for static skins. */
export const getSkinClassName = (skinId) => {
  const wanted = getSkin(skinId);
  return wanted.animated ? `skin-${wanted.id}` : "";
};
