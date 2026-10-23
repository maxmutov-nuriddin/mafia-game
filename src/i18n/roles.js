import { characters } from "../services/data";
import { getLanguage } from "./LanguageContext";

// Russian names/descriptions stay canonical in services/data.js (stored in Firestore).
// Other languages are looked up by role id.
const ROLE_TEXT = {
  uz: {
    1: ["Mafiya", "Har kecha bitta tinch o'yinchini o'ldiradi. Ko'pchilikda qolsa g'alaba qozonadi."],
    2: ["Don", "Mafiya boshlig'i. O'yinchilarni Komissar roliga tekshiradi."],
    3: ["Mafiya advokati", "Kunduzgi ovoz berishda mafiyani himoya qila oladi."],
    4: ["Komissar", "Har kecha tanlangan o'yinchi mafiya yoki yo'qligini tekshiradi."],
    5: ["Doktor", "Har kecha bitta o'yinchini davolaydi. O'limdan qutqarishi mumkin."],
    6: ["Sherif", "Komissarning kuchaytirilgan versiyasi. O'yinchini hibsga olishi mumkin."],
    7: ["Psixolog", "Bitta o'yinchini ertasi kuni jim turishga majburlay oladi."],
    8: ["Go'zal (Putana)", "Har kecha o'yinchini chalg'itadi — u tungi qobiliyatini yo'qotadi."],
    9: ["Snayper", "O'yin davomida bir marta istalgan o'yinchini o'ldira oladi."],
    10: ["Jurnalist", "O'yinchi o'tgan kecha nima qilganini biladi."],
    11: ["Serjant", "Komissarning yashirin yordamchisi. U o'lgach faollashadi."],
    12: ["Tinch aholi", "Qobiliyati yo'q, lekin kunduzgi ovoz berishda qatnashadi."],
    13: ["Manyak", "Yolg'iz o'ynaydi. Har kecha bitta o'yinchini o'ldiradi."],
    14: ["Kupidon", "O'yin boshida ikki o'yinchini oshiq qiladi. Biri o'lsa, ikkinchisi ham o'ladi."],
    15: ["Oshiq", "Juftlikdan biri o'lsa, ikkinchisi ham o'ladi. Sevgisi uchun o'ynaydi."],
    16: ["Sarg'ish", "Hech narsa qilmaydi. Shunchaki chiroyli. Chalg'itishi mumkin."],
    17: ["O'lmas", "Birinchi suiqasddan omon qoladi. Keyin oddiy o'yinchiga aylanadi."],
    18: ["Jallod", "Yolg'iz o'ynaydi. Maqsadi — muayyan o'yinchini osish."],
  },
  en: {
    1: ["Mafia", "Kills a civilian every night. Wins if the mafia reaches the majority."],
    2: ["Don", "Head of the mafia. Checks players for the Commissioner role."],
    3: ["Mafia Lawyer", "Can protect the mafia from the daytime vote."],
    4: ["Commissioner", "Checks every night whether the chosen player is mafia."],
    5: ["Doctor", "Heals one player every night. Can save them from death."],
    6: ["Sheriff", "Upgraded Commissioner. Can arrest a player."],
    7: ["Psychologist", "Can force one player to stay silent the next day."],
    8: ["Escort", "Distracts a player every night — they lose their night ability."],
    9: ["Sniper", "Once per game can kill any player."],
    10: ["Journalist", "Learns what a player did last night."],
    11: ["Sergeant", "Secret helper of the Commissioner. Activates after their death."],
    12: ["Civilian", "No abilities, but takes part in the daytime vote."],
    13: ["Maniac", "Plays alone. Kills one player every night."],
    14: ["Cupid", "At the start of the game makes two players fall in love. If one dies, so does the other."],
    15: ["Lover", "If one of the pair dies, the other dies too. Plays for their love."],
    16: ["Blonde", "Does nothing. Just pretty. Can confuse others."],
    17: ["Immortal", "Survives the first assassination attempt, then becomes a regular player."],
    18: ["Executioner", "Plays alone. Their goal is to hang a specific player."],
  },
};

const baseById = new Map(characters.map((character) => [Number(character.id), character]));

/** @param {{id?: number|string, name?: string, description?: string}|string|null} character */
const resolve = (character, index, language) => {
  if (!character || typeof character === "string") return character || "";
  const fallback = index === 0 ? character.name : character.description;
  const entry = ROLE_TEXT[language]?.[Number(character.id)];
  if (entry) return entry[index];
  return baseById.get(Number(character.id))?.[index === 0 ? "name" : "description"] || fallback || "";
};

export const getRoleName = (character, language = getLanguage()) => resolve(character, 0, language);

export const getRoleDescription = (character, language = getLanguage()) =>
  resolve(character, 1, language);
