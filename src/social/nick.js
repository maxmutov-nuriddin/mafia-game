export const NICK_MIN_LENGTH = 3;
export const NICK_MAX_LENGTH = 16;

const NICK_PATTERN = /^[A-Za-z0-9_]+$/;
const RANDOM_NUMBER_RANGE = 90;
const RANDOM_NUMBER_OFFSET = 10;

// Short words so adjective + noun + 2 digits always fits NICK_MAX_LENGTH
const ADJECTIVES = ["Silent", "Shadow", "Lucky", "Sneaky", "Crimson", "Clever", "Brave", "Wild", "Frosty", "Sly"];
const NOUNS = ["Wolf", "Fox", "Raven", "Don", "Ghost", "Owl", "Tiger", "Viper", "Falcon", "Shark"];

/** Case-insensitive key a nick is stored (and kept unique) under. */
export const nickKey = (nick) => String(nick || "").trim().toLowerCase();

/**
 * @returns {{ok: true, value: string, key: string} | {ok: false, reason: "invalid"}}
 */
export function validateNick(nick) {
  const value = String(nick || "").trim();
  const isValid =
    value.length >= NICK_MIN_LENGTH && value.length <= NICK_MAX_LENGTH && NICK_PATTERN.test(value);

  return isValid ? { ok: true, value, key: value.toLowerCase() } : { ok: false, reason: "invalid" };
}

/** Random nick like "SilentWolf42". `random` is injectable for tests. */
export function generateRandomNick(random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const number = Math.floor(random() * RANDOM_NUMBER_RANGE) + RANDOM_NUMBER_OFFSET;
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${number}`;
}
