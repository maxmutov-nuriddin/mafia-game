import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Undo2 } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import { subscribeAuthState } from "../../services/authService";
import { listenToUserProfile } from "../../services/profileService";
import { DEFAULT_SKIN_ID } from "../../game/skins";
import RoleSetupBody from "../../components/RoleSetupBody";
import SkinShop from "../../components/SkinShop";
import FriendsPanel from "../../components/FriendsPanel";
import OverviewTab from "../../components/profile/OverviewTab";
import { listenToPublicProfile } from "../../services/socialService";

const TABS = ["overview", "create", "shop", "friends"];

const EMPTY_PROFILE = {
  points: 0,
  totalEarned: 0,
  gamesPlayed: 0,
  gamesHosted: 0,
  wins: 0,
  ownedSkins: {},
  skin: DEFAULT_SKIN_ID,
  streak: 0,
  earnedToday: 0,
};

/** Registered user's profile: stats, role setup for a new game, and the skin shop. */
const ProfilePage = ({ generateId }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [nick, setNick] = useState(null);

  const uid = user && !user.isAnonymous ? user.uid : null;

  useEffect(() => subscribeAuthState((nextUser) => setUser(nextUser || null)), []);

  useEffect(() => {
    if (user === undefined || uid) return;
    navigate("/", { replace: true });
  }, [user, uid, navigate]);

  useEffect(() => {
    if (!uid) return undefined;
    const stopProfile = listenToUserProfile(uid, setProfile);
    const stopNick = listenToPublicProfile(uid, (publicProfile) => setNick(publicProfile?.nick || null));
    return () => {
      stopProfile();
      stopNick();
    };
  }, [uid]);

  if (!uid) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div className="mafia-page profile-setup-page flex flex-col items-center px-2 py-4">
      <div className="mafia-shell profile-setup-shell relative w-full max-w-[980px] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label={t("profile.back")}
            title={t("profile.back")}
            className="mafia-btn mafia-btn--icon"
          >
            <Undo2 />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black sm:text-3xl">{t("profile.title")}</h1>
            <p className="truncate text-sm font-semibold opacity-75">
              {nick || user.displayName || user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
          {TABS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={tab === tabId}
              onClick={() => setTab(tabId)}
              className={`mafia-btn mafia-btn--sm ${tab === tabId ? "mafia-btn--primary" : ""}`}
            >
              {t(`profile.tab.${tabId}`)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab profile={profile} nick={nick} fallbackName={user.displayName || user.email} />
        )}

        {tab === "create" && <RoleSetupBody generateId={generateId} />}

        {tab === "shop" && <SkinShop profile={profile} />}

        {tab === "friends" && <FriendsPanel uid={uid} />}
      </div>
    </div>
  );
};

export default ProfilePage;
