import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import { characters } from "../../services/data";

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

const getFactionByRoleId = (roleId) => {
  const id = Number(roleId);
  if (id >= 1 && id <= 3) return { label: "Мафия", tone: "mafia" };
  if (id >= 13) return { label: "Нейтрал", tone: "neutral" };
  return { label: "Город", tone: "city" };
};

const ProfileRoleSetupPage = ({ generateId }) => {
  const navigate = useNavigate();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
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
      toast.warn("Сначала выберите хотя бы одну роль.");
      return;
    }
    if (typeof generateId !== "function") {
      toast.error("Функция создания комнаты недоступна.");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const newId = await generateId();
      if (!newId) {
        toast.error("Не удалось создать комнату.");
        return;
      }

      navigate(`/create/${newId}?source=profile`, {
        state: { selectedRoleCounts },
      });
    } catch (error) {
      toast.error("Ошибка при создании комнаты: " + (error?.message || ""));
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
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div className="mafia-page profile-setup-page flex justify-center items-center flex-col px-2 py-4">
      <div className="mafia-shell profile-setup-shell w-full max-w-[980px] relative p-5 sm:p-6">
        <div className="profile-setup-head">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mafia-btn mafia-btn--icon profile-setup-back"
          >
            <Undo2 />
          </button>

          <div className="profile-setup-brand">
            <img src="/mafia-logo.png" className="w-16 h-16 sm:w-18 sm:h-18" alt="Mafia" />
            <span className="profile-setup-kicker">Профильный режим</span>
          </div>
        </div>

        <h1 className="profile-setup-title">Настройка ролей</h1>

        <div className="profile-setup-panel mafia-panel">
          <p className="profile-setup-description">
            Шаг 1: выберите специальные роли. После создания комнаты мирные жители будут добавлены автоматически.
          </p>

          <div className="profile-setup-list" role="list">
            {selectableCharacters.map((character) => {
              const count = Number(selectedRoleCounts[character.id] || 0);
              const imageSrc = String(character.img || "").replace("./", "/");
              const faction = getFactionByRoleId(character.id);

              return (
                <div key={character.id} className="profile-setup-role mafia-panel" role="listitem">
                  <div className="profile-setup-role-media">
                    <img src={imageSrc} alt={character.name} className="profile-setup-role-img" />
                  </div>

                  <div className="profile-setup-role-main">
                    <p className="profile-setup-role-name">{character.name}</p>
                    <span className={`profile-setup-role-tag profile-setup-role-tag--${faction.tone}`}>
                      {faction.label}
                    </span>
                  </div>

                  <div className="profile-setup-counter" aria-label={`Количество роли ${character.name}`}>
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

          <div className="profile-setup-summary mafia-panel-strong">
            <div>
              <p className="profile-setup-summary-label">Выбрано спецролей</p>
              <p className="profile-setup-summary-value">{selectedRolesCount}</p>
            </div>
            <p className="profile-setup-summary-note">Шаг 2: создайте комнату и ждите подключение игроков.</p>
          </div>
        </div>

        <div className="profile-setup-actions">
          <button
            type="button"
            onClick={handleClearRoles}
            disabled={!hasSelectedRoles}
            className="mafia-btn profile-setup-clear"
          >
            Очистить все
          </button>

          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={!hasSelectedRoles}
            className="mafia-btn mafia-btn--primary profile-setup-submit"
          >
            Создать комнату
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileRoleSetupPage;
