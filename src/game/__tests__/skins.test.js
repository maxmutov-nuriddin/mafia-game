import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKIN_ID,
  SKINS,
  TIER_MIN_LEVEL,
  getPurchaseBlock,
  getSkin,
  getSkinCardStyle,
  getSkinClassName,
  getSkinMinLevel,
  isSkinOwned,
} from "../skins";

describe("getSkin", () => {
  it("falls back to the default skin for an unknown id", () => {
    expect(getSkin("does-not-exist").id).toBe(DEFAULT_SKIN_ID);
    expect(getSkin(undefined).id).toBe(DEFAULT_SKIN_ID);
  });

  it("returns the requested skin", () => {
    expect(getSkin("gold").price).toBeGreaterThan(0);
  });
});

describe("isSkinOwned", () => {
  it("always owns the default skin", () => {
    expect(isSkinOwned({}, DEFAULT_SKIN_ID)).toBe(true);
    expect(isSkinOwned(null, DEFAULT_SKIN_ID)).toBe(true);
  });

  it("owns a paid skin only after buying it", () => {
    expect(isSkinOwned({ ownedSkins: {} }, "gold")).toBe(false);
    expect(isSkinOwned({ ownedSkins: { gold: true } }, "gold")).toBe(true);
  });
});

describe("getPurchaseBlock", () => {
  const noir = getSkin("noir");
  const holo = getSkin("holo");

  it("allows buying a cheap skin with enough points", () => {
    expect(getPurchaseBlock({ points: noir.price, totalEarned: noir.price }, noir)).toBeNull();
  });

  it("blocks a skin that is already owned", () => {
    const profile = { points: 999, totalEarned: 999, ownedSkins: { noir: true } };

    expect(getPurchaseBlock(profile, noir)).toBe("owned");
  });

  it("blocks when points are short", () => {
    expect(getPurchaseBlock({ points: noir.price - 1, totalEarned: 500 }, noir)).toBe("points");
  });

  it("blocks a high tier skin below the required level even with enough points", () => {
    expect(getPurchaseBlock({ points: 99999, totalEarned: 100 }, holo)).toBe("level");
  });

  it("allows a high tier skin at the required level with enough points", () => {
    const needed = 50 * (TIER_MIN_LEVEL.legendary - 1) ** 2;

    expect(getPurchaseBlock({ points: holo.price, totalEarned: needed }, holo)).toBeNull();
  });
});

describe("getSkinCardStyle", () => {
  it("gives the default skin the plain card image and no frame", () => {
    const style = getSkinCardStyle(DEFAULT_SKIN_ID);

    expect(style.backgroundImage).toContain("card-bg-gamer.png");
    expect(style.borderColor).toBeUndefined();
  });

  it("layers patterns over the card image and frames the card", () => {
    const style = getSkinCardStyle("casino");

    expect(style.backgroundImage).toContain("radial-gradient");
    expect(style.backgroundImage.endsWith("card-bg-gamer.png')")).toBe(true);
    expect(style.borderColor).toBe("#8f1d1f");
  });

  it("keeps one size and one position per background layer", () => {
    SKINS.forEach((entry) => {
      const style = getSkinCardStyle(entry.id);
      const layerCount = entry.layers.length + 1;

      expect(style.backgroundSize.split(/,(?![^(]*\))/)).toHaveLength(layerCount);
      expect(style.backgroundPosition.split(/,(?![^(]*\))/)).toHaveLength(layerCount);
    });
  });
});

describe("getSkinClassName", () => {
  it("names a class only for animated skins", () => {
    expect(getSkinClassName("neon")).toBe("skin-neon");
    expect(getSkinClassName("noir")).toBe("");
    expect(getSkinClassName(DEFAULT_SKIN_ID)).toBe("");
  });
});

describe("SKINS", () => {
  it("has unique ids, a free default and a known tier for each skin", () => {
    const ids = SKINS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(getSkin(DEFAULT_SKIN_ID).price).toBe(0);
    SKINS.forEach((entry) => expect(getSkinMinLevel(entry)).toBeGreaterThanOrEqual(1));
  });

  it("never prices a higher tier below a lower one", () => {
    const cheapestOfTier = (tier) =>
      Math.min(...SKINS.filter((entry) => entry.tier === tier && entry.price > 0).map((entry) => entry.price));

    expect(cheapestOfTier("rare")).toBeGreaterThan(cheapestOfTier("common"));
    expect(cheapestOfTier("epic")).toBeGreaterThan(cheapestOfTier("rare"));
    expect(cheapestOfTier("legendary")).toBeGreaterThan(cheapestOfTier("epic"));
  });
});
