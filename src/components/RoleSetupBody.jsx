import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { toast } from "react-toastify";
import { characters } from "../services/data";
import { useLanguage } from "../i18n/LanguageContext";
import { getRoleName } from "../i18n/roles";
import RoomOptionsPanel from "./RoomOptionsPanel";
import { DEFAULT_SETTINGS } from "../game/phases";

const CIVILIAN_ROLE_ID = 12;
const PROFILE_ROLE_COUNTS_STORAGE_KEY = "mafia-profile-role-counts";

const getStoredRoleCounts = () => {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(PROFILE_ROLE_COUNTS_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") return {};

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        ([key, value]) => Number(key) > 0 && Number(value) > 0
      )
    );
  } catch {
    return {};
  }
};

const getFactionByRoleId = (roleId, t) => {
  const id = Number(roleId);
  if (id >= 1 && id <= 3) return { label: t("faction.mafia"), tone: "mafia" };
  if (id >= 13) return { label: t("faction.neutral"), tone: "neutral" };
  return { label: t("faction.city"), tone: "city" };
};

/** Role picker + room options + create button (used by the profile page and the setup page). */
const RoleSetupBody = ({ generateId }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [options, setOptions] = useState({ ...DEFAULT_SETTINGS });
  const [selectedRoleCounts, setSelectedRoleCounts] = useState(getStoredRoleCounts);

  const selectableCharacters = useMemo(
    () => characters.filter((character) => Number(character.id) !== CIVILIAN_ROLE_ID),
    []
  );

  const selectedRolesCount = useMemo(
    () => Object.values(selectedRoleCounts).reduce((acc, value) => acc + Number(value || 0), 0),
    [selectedRoleCounts]
  );
  const hasSelectedRoles = selectedRolesCount > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (Object.keys(selectedRoleCounts).length === 0) {
      window.localStorage.removeItem(PROFILE_ROLE_COUNTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PROFILE_ROLE_COUNTS_STORAGE_KEY,
      JSON.stringify(selectedRoleCounts)
    );
  }, [selectedRoleCounts]);

  const addRole = (characterId) => {
    setSelectedRoleCounts((prev) => ({
      ...prev,
      [characterId]: Number(prev[characterId] || 0) + 1,
    }));
  };

  const removeRole = (characterId) => {
    setSelectedRoleCounts((prev) => {
      const nextCount = Number(prev[characterId] || 0) - 1;
      if (nextCount <= 0) {
        const { [characterId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [characterId]: nextCount,
      };
    });
  };

  const handleCreateRoom = async () => {
    if (isCreatingRoom) return;
    if (!hasSelectedRoles) {
      toast.warn(t("setup.pickRoleFirst"));
      return;
    }
    if (typeof generateId !== "function") {
      toast.error(t("setup.createUnavailable"));
      return;
    }

    setIsCreatingRoom(true);
    try {
      const newId = await generateId(options);
      if (!newId) {
        toast.error(t("setup.createFailed"));
        return;
      }

      navigate(`/create/${newId}?source=profile`, {
        state: { selectedRoleCounts },
      });
    } catch (error) {
      toast.error(t("setup.createError", { message: error?.message || "" }));
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleClearRoles = () => {
    if (!hasSelectedRoles) return;
    setSelectedRoleCounts({});
  };

  if (isCreatingRoom) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#250506]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
        <div className="profile-setup-panel mafia-panel">
          <p className="profile-setup-description">{t("setup.step1")}</p>

          <div className="profile-setup-list" role="list">
            {selectableCharacters.map((character) => {
              const count = Number(selectedRoleCounts[character.id] || 0);
              const imageSrc = String(character.img || "").replace("./", "/");
              const faction = getFactionByRoleId(character.id, t);
              const roleName = getRoleName(character, language);

              return (
                <div key={character.id} className="profile-setup-role mafia-panel" role="listitem">
                  <div className="profile-setup-role-media">
                    <img src={imageSrc} alt={roleName} className="profile-setup-role-img" />
                  </div>

                  <div className="profile-setup-role-main">
                    <p className="profile-setup-role-name">{roleName}</p>
                    <span className={`profile-setup-role-tag profile-setup-role-tag--${faction.tone}`}>
                      {faction.label}
                    </span>
                  </div>

                  <div className="profile-setup-counter" aria-label={t("setup.roleCount", { name: roleName })}>
                    <button
                      type="button"
                      onClick={() => removeRole(character.id)}
                      disabled={count === 0}
                      className="profile-setup-counter-btn"
                    >
                      -
                    </button>
                    <span className="profile-setup-counter-value">{count}</span>
                    <button
                      type="button"
                      onClick={() => addRole(character.id)}
                      className="profile-setup-counter-btn"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <RoomOptionsPanel value={options} onChange={setOptions} layout="grid" />
          </div>

          <div className="profile-setup-summary mafia-panel-strong">
            <div>
              <p className="profile-setup-summary-label">{t("setup.selected")}</p>
              <p className="profile-setup-summary-value">{selectedRolesCount}</p>
            </div>
            <p className="profile-setup-summary-note">{t("setup.step2")}</p>
          </div>
        </div>

        <div className="profile-setup-actions">
          <button
            type="button"
            onClick={handleClearRoles}
            disabled={!hasSelectedRoles}
            className="mafia-btn profile-setup-clear"
          >
            {t("setup.clear")}
          </button>

          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={!hasSelectedRoles}
            className="mafia-btn mafia-btn--primary profile-setup-submit"
          >
            {t("setup.create")}
          </button>
        </div>
    </div>
  );
};

export default RoleSetupBody;
