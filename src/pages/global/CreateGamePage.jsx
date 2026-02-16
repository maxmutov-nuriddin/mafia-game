import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { LoaderCircle, Undo2, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getRoomByCustomId,
  listenToRoomPlayers,
  deleteRoom,
  deletePlayer,
} from "../../services/gameService";
import { characters } from "../../services/data";
import { clearAllRememberedPlayerSessions } from "../../utils/playerSession";

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

const getRoleWord = (count) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return "роль";
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) return "роли";
  return "ролей";
};

const CreateGamePage = ({ startGame }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const gameIdRef = useRef(null);

  const [isStarting, setIsStarting] = useState(false);
  const [delet, setIsDeleting] = useState(false);
  const [users, setUsers] = useState([]);
  const [showPlayers, setShowPlayers] = useState(false);
  const [kickingPlayerId, setKickingPlayerId] = useState("");
  const [selectedRoleCounts, setSelectedRoleCounts] = useState(getStoredRoleCounts);

  const isProfileMode = searchParams.get("source") === "profile";
  const presetRoleCounts = location.state?.selectedRoleCounts || null;

  const selectableCharacters = useMemo(
    () => characters.filter((character) => Number(character.id) !== CIVILIAN_ROLE_ID),
    []
  );

  const charactersById = useMemo(
    () => new Map(selectableCharacters.map((character) => [Number(character.id), character])),
    [selectableCharacters]
  );

  const selectedRolesCount = useMemo(
    () => Object.values(selectedRoleCounts).reduce((acc, value) => acc + Number(value || 0), 0),
    [selectedRoleCounts]
  );

  const selectedCharacters = useMemo(() => {
    return Object.entries(selectedRoleCounts).flatMap(([characterId, count]) => {
      const character = charactersById.get(Number(characterId));
      if (!character || count <= 0) return [];

      return Array.from({ length: count }, () => ({ ...character }));
    });
  }, [charactersById, selectedRoleCounts]);
  const visibleProfileCharacters = useMemo(
    () =>
      selectableCharacters.filter(
        (character) => Number(selectedRoleCounts[character.id] || 0) > 0
      ),
    [selectableCharacters, selectedRoleCounts]
  );

  const missingPlayersForRoles = Math.max(0, selectedRolesCount - users.length);
  const autoCitizenCount = Math.max(0, users.length - selectedRolesCount);

  useEffect(() => {
    if (!isProfileMode || !presetRoleCounts || typeof presetRoleCounts !== "object") return;

    setSelectedRoleCounts((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return {
        ...Object.fromEntries(
          Object.entries(presetRoleCounts).filter(
            ([key, value]) => Number(key) > 0 && Number(value) > 0
          )
        ),
      };
    });
  }, [isProfileMode, presetRoleCounts]);

  useEffect(() => {
    if (!isProfileMode || typeof window === "undefined") return;

    if (Object.keys(selectedRoleCounts).length === 0) {
      window.localStorage.removeItem(PROFILE_ROLE_COUNTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PROFILE_ROLE_COUNTS_STORAGE_KEY,
      JSON.stringify(selectedRoleCounts)
    );
  }, [isProfileMode, selectedRoleCounts]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      let room = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!room && attempts < maxAttempts) {
        room = await getRoomByCustomId(id);

        if (!room) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!room) {
        toast.error("Комната не найдена. Попробуйте снова.");
        navigate("/");
        return;
      }

      gameIdRef.current = room.id;

      const unsubscribe = listenToRoomPlayers(room.id, (players) => {
        setUsers(players);
        if (players.length === 0) {
          setShowPlayers(false);
        }
      });

      return unsubscribe;
    };

    const cleanup = fetchData();

    return () => {
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((unsub) => unsub && unsub());
      }
    };
  }, [id, navigate]);

  const closeRoom = async () => {
    setIsDeleting(true);
    try {
      if (!gameIdRef.current) return;
      await deleteRoom(gameIdRef.current);
      clearAllRememberedPlayerSessions();
      navigate("/");
    } catch (error) {
      toast.error("Ошибка при закрытии комнаты");
      console.error(error);
      setIsDeleting(false);
    }
  };

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

  const handleStart = async () => {
    if (isStarting) return;

    if (isProfileMode) {
      if (selectedRolesCount === 0) {
        toast.warn("Сначала выберите хотя бы одну роль.");
        return;
      }

      if (users.length === 0) {
        toast.warn("Сначала дождитесь хотя бы одного игрока.");
        return;
      }

      if (missingPlayersForRoles > 0) {
        toast.warn(
          `Игроков мало: уберите ${missingPlayersForRoles} ${getRoleWord(missingPlayersForRoles)}.`
        );
        return;
      }
    }

    setIsStarting(true);
    try {
      const started = isProfileMode
        ? await startGame(id, { selectedCharacters })
        : await startGame(id);

      if (!started) return;

      navigate(`/gamestart/${id}`);
    } catch (error) {
      toast.error("Ошибка при старте игры");
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleKickPlayer = async (playerId) => {
    if (!gameIdRef.current || !playerId) return;

    setKickingPlayerId(playerId);
    try {
      await deletePlayer(gameIdRef.current, playerId);
      toast.success("Игрок удален из комнаты");
    } catch (error) {
      toast.error("Не удалось удалить игрока");
      console.error(error);
    } finally {
      setKickingPlayerId("");
    }
  };

  if (isStarting || delet) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div className="mafia-page flex justify-center items-center flex-col px-2 py-3">
      <div className="mafia-shell w-full sm:w-[420px] flex flex-col items-center justify-center gap-5 relative p-6">
        <button
          onClick={closeRoom}
          disabled={delet}
          className="mafia-btn mafia-btn--icon absolute top-5 left-5"
        >
          {delet ? (
            <LoaderCircle className="w-10 h-10 animate-spin text-[#250506]" />
          ) : (
            <Undo2 />
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowPlayers((prev) => !prev)}
          className="mafia-btn mafia-btn--icon absolute top-5 right-5"
        >
          <Users size={16} />
          {users.length}
        </button>

        {showPlayers && (
          <div className="mafia-panel-strong absolute right-4 top-16 z-20 w-[300px] overflow-hidden shadow-[0_12px_24px_rgba(37,5,6,0.18)]">
            <div className="flex items-center justify-between px-4 py-3 bg-[#ede1cf] border-b border-[#250506]/15">
              <p className="font-black text-lg">Игроки ({users.length})</p>
              <button
                type="button"
                onClick={() => setShowPlayers(false)}
                className="mafia-btn mafia-btn--sm"
              >
                <X size={12} />
                Закрыть
              </button>
            </div>

            {users.length === 0 ? (
              <p className="text-sm opacity-80 p-4">Пока никто не присоединился.</p>
            ) : (
              <div className="p-3 max-h-[240px] overflow-auto flex flex-col gap-2">
                {users.map((user) => {
                  const isKicking = kickingPlayerId === user.id;
                  return (
                    <div key={user.id} className="mafia-panel bg-white/95 p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#250506] text-[#DBD0C0] flex items-center justify-center text-xs font-black">
                          {(user.name || "P").slice(0, 1).toUpperCase()}
                        </div>
                        <p className="font-semibold text-sm truncate">
                          {user.name || "Player"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleKickPlayer(user.id)}
                        disabled={isKicking}
                        className="mafia-btn mafia-btn--sm"
                      >
                        {isKicking ? "..." : "Кик"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-3xl sm:text-5xl font-black">ID {id}</h1>

        {isProfileMode ? (
          <div className="w-full mafia-panel p-3 bg-white/90">
            <p className="font-black text-lg">Выбор ролей</p>
            <p className="text-xs opacity-75 mt-1">
              Выбирайте специальные роли. Мирные жители добавляются автоматически.
            </p>

            <div className="mt-3 max-h-[280px] overflow-auto flex flex-col gap-2 pr-1">
              {visibleProfileCharacters.length === 0 ? (
                <div className="mafia-panel p-3 text-sm font-semibold text-center">
                  Нет выбранных ролей. Вернитесь в настройку и выберите персонажей.
                </div>
              ) : (
                visibleProfileCharacters.map((character) => {
                  const count = Number(selectedRoleCounts[character.id] || 0);
                  const imageSrc = String(character.img || "").replace("./", "/");

                  return (
                    <div
                      key={character.id}
                      className="mafia-panel p-2 bg-white flex items-center gap-2"
                    >
                      <img
                        src={imageSrc}
                        alt={character.name}
                        className="w-10 h-10 object-contain"
                      />
                      <p className="font-semibold text-sm flex-1 leading-tight">{character.name}</p>
                      <button
                        type="button"
                        onClick={() => removeRole(character.id)}
                        disabled={count === 0}
                        className="mafia-btn mafia-btn--sm !px-2"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black">{count}</span>
                      <button
                        type="button"
                        onClick={() => addRole(character.id)}
                        className="mafia-btn mafia-btn--sm !px-2"
                      >
                        +
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-sm font-semibold">
              <p>Игроков: {users.length}</p>
              <p>Выбрано спецролей: {selectedRolesCount}</p>
              <p>Авто-мирных жителей: {autoCitizenCount}</p>
            </div>

            {missingPlayersForRoles > 0 && (
              <div className="mt-3 mafia-panel-strong p-2 text-sm font-bold text-[#8f1d1f] bg-[#ffe3e3] border border-[#8f1d1f]/25">
                Игроков мало: уберите {missingPlayersForRoles} {getRoleWord(missingPlayersForRoles)}.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold opacity-75 text-center">
            Стандартный режим: роли распределяются автоматически.
          </p>
        )}

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleStart}
            disabled={
              isStarting ||
              (isProfileMode &&
                (selectedRolesCount === 0 || users.length === 0 || missingPlayersForRoles > 0))
            }
            className="mafia-btn sm:w-[100%]"
          >
            {isStarting ? "Игра начинается..." : "Начать игру!"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGamePage;

