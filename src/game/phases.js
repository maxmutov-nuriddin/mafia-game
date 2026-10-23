import { DEFAULT_SKIN_ID } from "./skins";

export const PHASE = Object.freeze({
  IDLE: "idle",
  NIGHT: "night",
  MORNING: "morning",
  DISCUSSION: "discussion",
  VOTING: "voting",
  ENDED: "ended",
});

/** Firebase turns objects with small integer keys into arrays, so prefix round keys. */
export const roundKey = (round) => `r${round}`;

export const DISCUSSION_SECONDS_OPTIONS = Object.freeze([60, 120, 180]);

export const DEFAULT_SETTINGS = Object.freeze({
  discussion: false,
  actions: false,
  discussionSeconds: 120,
  skin: DEFAULT_SKIN_ID,
});

/** Fill missing/invalid fields (older rooms have no settings at all). */
export function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      discussion: false,
      actions: false,
      discussionSeconds: DEFAULT_SETTINGS.discussionSeconds,
      skin: DEFAULT_SKIN_ID,
    };
  }

  const seconds = Number(raw.discussionSeconds);
  return {
    discussion: raw.discussion === true,
    actions: raw.actions === true,
    discussionSeconds: DISCUSSION_SECONDS_OPTIONS.includes(seconds)
      ? seconds
      : DEFAULT_SETTINGS.discussionSeconds,
    skin: typeof raw.skin === "string" ? raw.skin : DEFAULT_SKIN_ID,
  };
}

export const isGameFlowEnabled = (settings) => settings.actions || settings.discussion;

export function createInitialGameState(settings) {
  return {
    phase: settings.actions ? PHASE.NIGHT : PHASE.IDLE,
    round: 1,
    endsAt: null,
    lovers: [],
    sniperUsed: {},
    immortalUsed: {},
    protectedId: null,
    silencedId: null,
    morning: null,
    lastVote: null,
    winner: null,
  };
}

/** Firebase drops empty arrays/objects and nulls; restore them. */
export function normalizeGameState(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    phase: raw.phase || PHASE.IDLE,
    round: Number(raw.round) || 1,
    endsAt: raw.endsAt || null,
    lovers: Array.isArray(raw.lovers) ? raw.lovers : [],
    sniperUsed: raw.sniperUsed || {},
    immortalUsed: raw.immortalUsed || {},
    protectedId: raw.protectedId || null,
    silencedId: raw.silencedId || null,
    morning: raw.morning
      ? { ...raw.morning, deaths: Array.isArray(raw.morning.deaths) ? raw.morning.deaths : [] }
      : null,
    lastVote: raw.lastVote
      ? { ...raw.lastVote, deaths: Array.isArray(raw.lastVote.deaths) ? raw.lastVote.deaths : [] }
      : null,
    winner: raw.winner || null,
  };
}

/** Next phase in the cycle, or ENDED once there is a winner. */
export function getNextPhase(phase, settings, hasWinner = false) {
  if (hasWinner) return PHASE.ENDED;

  if (!settings.actions) {
    if (phase === PHASE.IDLE) return settings.discussion ? PHASE.DISCUSSION : PHASE.IDLE;
    return PHASE.IDLE;
  }

  switch (phase) {
    case PHASE.NIGHT:
      return PHASE.MORNING;
    case PHASE.MORNING:
      return settings.discussion ? PHASE.DISCUSSION : PHASE.VOTING;
    case PHASE.DISCUSSION:
      return PHASE.VOTING;
    case PHASE.VOTING:
      return PHASE.NIGHT;
    default:
      return phase;
  }
}

export const getPhaseEndsAt = (phase, settings, now = Date.now()) =>
  phase === PHASE.DISCUSSION ? now + settings.discussionSeconds * 1000 : null;
