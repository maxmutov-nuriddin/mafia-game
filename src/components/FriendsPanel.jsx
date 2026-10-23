import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Dices, Search, UserMinus, UserPlus } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useFriends } from "../social/useFriends";
import { isFriendOnline } from "../social/status";
import { NICK_MAX_LENGTH, NICK_MIN_LENGTH } from "../social/nick";
import {
  addFriend,
  claimNick,
  claimRandomNick,
  listenToPublicProfile,
  removeFriend,
  searchNicks,
} from "../services/socialService";

const NICK_ERROR_KEY = {
  invalid: "friends.nickInvalid",
  taken: "friends.nickTaken",
};

const StatusDot = ({ status }) => (
  <span
    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
      isFriendOnline(status) ? "bg-green-500" : "bg-red-500"
    }`}
    aria-hidden="true"
  />
);

/**
 * Nick editor, nick search and the friend list with online status.
 * @param {{uid: string}} props signed-in registered user
 */
const FriendsPanel = ({ uid }) => {
  const { t } = useLanguage();
  const friends = useFriends(uid);
  const [myNick, setMyNick] = useState(null);
  const [nickInput, setNickInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    return listenToPublicProfile(uid, (profile) => setMyNick(profile?.nick || null));
  }, [uid]);

  useEffect(() => {
    if (myNick) setNickInput(myNick);
  }, [myNick]);

  const friendIds = new Set(friends.map((friend) => friend.uid));

  const run = async (action) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      console.error("Friends action error:", error);
      toast.error(t("friends.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNick = () =>
    run(async () => {
      const result = await claimNick(nickInput);
      if (result.ok) toast.success(t("friends.nickSaved"));
      else toast.warn(t(NICK_ERROR_KEY[result.reason] || "friends.error"));
    });

  const handleRandomNick = () =>
    run(async () => {
      const nick = await claimRandomNick();
      if (nick) toast.success(t("friends.nickSaved"));
      else toast.error(t("friends.error"));
    });

  const handleSearch = (event) => {
    event.preventDefault();
    run(async () => {
      const found = await searchNicks(searchText);
      setResults(found.filter((user) => user.uid !== uid));
    });
  };

  const handleAdd = (friendUid) =>
    run(async () => {
      if (await addFriend(friendUid)) toast.success(t("friends.added"));
    });

  const handleRemove = (friendUid) => run(() => removeFriend(friendUid));

  return (
    <div className="flex flex-col gap-4">
      <div className="mafia-panel flex flex-col gap-2 bg-white/90 p-3">
        <p className="font-black">{t("friends.nickTitle")}</p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <input
            value={nickInput}
            onChange={(event) => setNickInput(event.target.value)}
            maxLength={NICK_MAX_LENGTH}
            placeholder={t("friends.nickPlaceholder")}
            className="mafia-input min-w-0"
          />
          <button
            type="button"
            onClick={handleSaveNick}
            disabled={isBusy || nickInput.trim() === myNick}
            className="mafia-btn mafia-btn--sm mafia-btn--primary"
          >
            {t("friends.save")}
          </button>
          <button
            type="button"
            onClick={handleRandomNick}
            disabled={isBusy}
            title={t("friends.random")}
            aria-label={t("friends.random")}
            className="mafia-btn mafia-btn--icon"
          >
            <Dices size={16} />
          </button>
        </div>
        <p className="text-xs font-semibold opacity-70">
          {t("friends.nickRules", { min: NICK_MIN_LENGTH, max: NICK_MAX_LENGTH })}
        </p>
      </div>

      <div className="mafia-panel flex flex-col gap-2 bg-white/90 p-3">
        <p className="font-black">{t("friends.searchTitle")}</p>
        <form onSubmit={handleSearch} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t("friends.searchPlaceholder")}
            className="mafia-input min-w-0"
          />
          <button type="submit" disabled={isBusy} className="mafia-btn mafia-btn--icon" aria-label={t("friends.search")}>
            <Search size={16} />
          </button>
        </form>

        {results && results.length === 0 && (
          <p className="text-sm font-semibold opacity-75">{t("friends.noResults")}</p>
        )}
        {results && results.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {results.map((user) => (
              <li key={user.uid} className="mafia-panel flex items-center justify-between gap-2 bg-white p-2">
                <span className="truncate text-sm font-black">{user.nick}</span>
                {friendIds.has(user.uid) ? (
                  <span className="text-xs font-semibold opacity-70">{t("friends.alreadyFriend")}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(user.uid)}
                    disabled={isBusy}
                    className="mafia-btn mafia-btn--tiny"
                  >
                    <UserPlus size={14} />
                    {t("friends.add")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mafia-panel flex flex-col gap-2 bg-white/90 p-3">
        <p className="font-black">{t("friends.listTitle", { count: friends.length })}</p>
        {friends.length === 0 && (
          <p className="text-sm font-semibold opacity-75">{t("friends.empty")}</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {friends.map((friend) => (
            <li key={friend.uid} className="mafia-panel flex items-center gap-2 bg-white p-2">
              <StatusDot status={friend.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{friend.nick}</p>
                <p className="text-xs font-semibold opacity-70">{t(`friends.status.${friend.status}`)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(friend.uid)}
                disabled={isBusy}
                title={t("friends.remove")}
                aria-label={t("friends.remove")}
                className="mafia-btn mafia-btn--icon mafia-btn--tiny"
              >
                <UserMinus size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FriendsPanel;
