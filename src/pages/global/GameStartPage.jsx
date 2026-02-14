/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import CharacterListCard from "../../components/CharactersListCard";
import { Check, Eye, EyeOff, LoaderCircle, Undo2, UserRound, Users } from "lucide-react";
import { toast } from "react-toastify";
import {
  deleteRoom,
  eliminatePlayer,
  getRoomByCustomId,
  listenToRoomPlayers,
} from "../../services/gameService";
import { clearAllRememberedPlayerSessions } from "../../utils/playerSession";

const ROOM_LIFETIME_SECONDS = 900;

const sortPlayers = (players = []) => {
  return [...players].sort((a, b) => Number(!!a.eliminated) - Number(!!b.eliminated));
};

const GameStartPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [games, setGames] = useState([]);
  const [timeLeft, setTimeLeft] = useState(ROOM_LIFETIME_SECONDS);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [flippedPlayers, setFlippedPlayers] = useState({});

  const timerRef = useRef(null);
  const gameIdRef = useRef(null);

  const activePlayers = useMemo(() => games.filter((player) => !player.eliminated), [games]);
  const characterStats = useMemo(() => {
    const statsMap = new Map();

    activePlayers
      .map((player) => player.character)
      .filter(Boolean)
      .forEach((character) => {
        const key =
          typeof character === "object"
            ? String(character.id || character.name || "")
            : String(character);

        if (!key) return;

        const name = typeof character === "string" ? character : character.name || "Без названия";
        const existing = statsMap.get(key);

        if (existing) {
          existing.count += 1;
        } else {
          statsMap.set(key, { id: key, name, count: 1 });
        }
      });

    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [activePlayers]);
  const duplicateCharactersCount = useMemo(
    () => characterStats.reduce((acc, character) => acc + Math.max(character.count - 1, 0), 0),
    [characterStats]
  );

  const togglePlayerSelection = (playerId, isEliminated) => {
    if (isEliminated) return;

    setSelectedPlayers((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((idValue) => idValue !== playerId);
      }
      return [...prev, playerId];
    });
  };

  const toggleCardFlip = (playerId, isEliminated) => {
    if (isEliminated) return;

    setFlippedPlayers((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  const closeRoom = async () => {
    setIsStarting(true);
    try {
      if (!gameIdRef.current) return;

      await deleteRoom(gameIdRef.current);
      clearAllRememberedPlayerSessions();
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при закрытии комнаты");
      setIsStarting(false);
    }
  };

  const startTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closeRoom, ROOM_LIFETIME_SECONDS * 1000);
    setTimeLeft(ROOM_LIFETIME_SECONDS);
    toast.success("Время комнаты продлено");
  };

  const eliminateSelectedPlayers = async () => {
    if (selectedPlayers.length === 0) {
      toast.warn("Выберите игроков для выбытия");
      return;
    }

    try {
      setIsStarting(true);

      for (const playerId of selectedPlayers) {
        await eliminatePlayer(gameIdRef.current, playerId);
      }

      setGames((prev) =>
        sortPlayers(
          prev.map((player) =>
            selectedPlayers.includes(player.id) ? { ...player, eliminated: true } : player
          )
        )
      );

      setFlippedPlayers((prev) => {
        const next = { ...prev };
        selectedPlayers.forEach((playerId) => {
          delete next[playerId];
        });
        return next;
      });

      toast.success(`Выбыло игроков: ${selectedPlayers.length}`);
      setSelectedPlayers([]);
    } catch (error) {
      console.error("Error eliminating players:", error);
      toast.error("Ошибка при отметке выбывших");
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    let unsubscribe;

    const fetchData = async () => {
      const room = await getRoomByCustomId(id);
      if (!room) return;

      gameIdRef.current = room.id;

      unsubscribe = listenToRoomPlayers(room.id, (players) => {
        const sortedPlayers = sortPlayers(players);
        setGames(sortedPlayers);

        const playersById = Object.fromEntries(sortedPlayers.map((player) => [String(player.id), player]));

        setSelectedPlayers((prev) =>
          prev.filter((playerId) => {
            const player = playersById[playerId];
            return player && !player.eliminated;
          })
        );

        setFlippedPlayers((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([playerId]) => {
              const player = playersById[playerId];
              return player && !player.eliminated;
            })
          )
        );

        if (sortedPlayers.length === 0) {
          deleteRoom(room.id)
            .then(() => {
              clearTimeout(timerRef.current);
              clearAllRememberedPlayerSessions();
              navigate("/");
            })
            .catch((error) => {
              console.error("Error deleting room:", error);
            });
        }
      });

      startTimer();
    };

    fetchData();

    return () => {
      clearTimeout(timerRef.current);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [id, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (isStarting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  const hasPlayers = Array.isArray(games) && games.length > 0;
  const isTimerCritical = timeLeft <= 60;
  const showDuplicateSummary = duplicateCharactersCount > 1;

  return (
    <>
      <div className="mafia-shell mx-5 rounded-3xl mt-5 overflow-hidden">
        <div className="flex justify-between px-4 py-2 items-center gap-3">
          <button onClick={() => navigate("/")} className="flex-shrink-0">
            <img src="/mafia-logo.png" className="w-12 h-12 object-contain" alt="Mafia" />
          </button>

          <div className="bg-[#250506] overflow-hidden mx-2 h-9 flex flex-1 min-w-0 items-center rounded-2xl">
            {activePlayers.length > 0 ? (
              <div
                className="inline-flex min-w-max whitespace-nowrap will-change-transform"
                style={{ animation: "marquee 18s linear infinite" }}
              >
                {[1, 2].map((set) => (
                  <div key={`set-${set}`} className="flex gap-12 px-6">
                    {activePlayers.map((player) => (
                      <span
                        key={`mq-${set}-${player.id}`}
                        className="text-[#DBD0C0] text-sm font-bold inline-flex items-center gap-1.5"
                      >
                        <UserRound size={14} />
                        {player.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[#DBD0C0] text-sm font-bold px-4">Нет активных игроков</span>
            )}
          </div>

          <button className="mafia-btn mafia-btn--icon flex-shrink-0" onClick={closeRoom}>
            <Undo2 />
          </button>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
          `,
        }}
      />

      <div className="mafia-shell my-4 mx-5 rounded-3xl p-4 text-[#250506]" id="global-page">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 h-[70vh] lg:h-[calc(100vh-190px)] min-h-[360px]">
          <div className="mafia-panel game-start-sidebar w-full h-full p-3">
            <div className="h-full grid grid-rows-[1.12fr_0.88fr] gap-3">
              <div className="mafia-panel-strong game-start-timer-card rounded-2xl px-4 py-5 flex flex-col items-center justify-center text-center">
                <p className="game-start-timer-label">Таймер</p>
                <h1 className={`game-start-timer-value ${isTimerCritical ? "text-[#8f1d1f]" : ""}`}>
                  {formatTime(timeLeft)}
                </h1>
                <div className="game-start-meta">
                  <span>{activePlayers.length} игроков</span>
                  <span>{characterStats.length} ролей</span>
                </div>
                <div className="w-full max-w-[270px] mx-auto flex flex-col gap-3 mt-3">
                  <button className="mafia-btn" onClick={closeRoom} disabled={isStarting}>
                    {isStarting ? "Комната закрывается..." : "Закрыть комнату"}
                  </button>

                  <button className="mafia-btn" onClick={startTimer}>
                    Продлить комнату
                  </button>

                  {selectedPlayers.length > 0 && (
                    <button
                      className="mafia-btn mafia-btn--primary"
                      onClick={eliminateSelectedPlayers}
                      disabled={isStarting}
                    >
                      {isStarting ? "Отмечаем выбывших..." : `Выбить выбранных (${selectedPlayers.length})`}
                    </button>
                  )}
                </div>
              </div>

              <div className="mafia-panel-strong game-start-roles-card rounded-2xl p-3 flex flex-col gap-3 min-h-0">
                <div className="game-card mafia-panel game-start-roles-list p-3 flex-1 min-h-0">
                  {characterStats.length > 0 ? (
                    <>
                      <div className="game-start-roles-head">
                        <div className="game-start-roles-title-wrap">
                          <p className="game-start-roles-kicker">Роли</p>
                          <p className="game-start-roles-title">Персонажи в игре</p>
                        </div>
                        <div className="game-start-roles-badges">
                          <span className="game-start-roles-pill">
                            <strong>{characterStats.length}</strong>
                            <small>Ролей</small>
                          </span>
                        </div>
                      </div>
                      <div className="game-start-roles-grid">
                        {characterStats.map((character) => (
                          <span
                            key={character.id}
                            className="game-start-role-chip inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                          >
                            <span className="game-start-role-chip-name">{character.name}</span>
                            {character.count > 1 && (
                              <span className="game-start-role-chip-count">x{character.count}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="game-start-roles-empty h-full flex items-center justify-center text-center text-xs font-semibold">
                      Персонажи пока не назначены
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`mafia-panel w-full min-w-0 overflow-y-auto overflow-x-hidden p-3 ${hasPlayers ? "grid auto-rows-[420px] gap-3 content-start" : "flex items-center justify-center"
              }`}
            style={
              hasPlayers
                ? { gridTemplateColumns: "repeat(auto-fit, minmax(260px, 280px))", justifyContent: "center" }
                : undefined
            }
          >
            {hasPlayers ? (
              games.map((player) => {
                const isEliminated = !!player.eliminated;
                const isSelected = selectedPlayers.includes(player.id);
                const isFlipped = isEliminated || !!flippedPlayers[player.id];
                const playerName = player.name || "Игрок";

                return (
                  <div
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id, isEliminated)}
                    className={`w-[280px] h-[420px] self-start relative rounded-xl transition-all duration-200 cursor-pointer ${isEliminated
                      ? "opacity-50"
                      : isSelected
                        ? "opacity-100 ring-2 ring-[#250506] bg-[#efe4d3]"
                        : "opacity-100 hover:bg-[#efe4d3]"
                      }`}
                  >
                    <button
                      className={`mafia-eye-btn absolute right-6 top-5 z-20 ${isEliminated ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCardFlip(player.id, isEliminated);
                      }}
                      disabled={isEliminated}
                    >
                      {isFlipped ? <EyeOff /> : <Eye />}
                    </button>

                    {isSelected && (
                      <div className="absolute top-4 left-4 z-10 bg-[#250506] text-[#DBD0C0] w-7 h-7 rounded-full flex items-center justify-center shadow">
                        <Check size={16} />
                      </div>
                    )}

                    {isEliminated && (
                      <div className="absolute top-4 left-4 z-10 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                        Выбыл
                      </div>
                    )}

                    <div className="relative h-full w-full p-2" style={{ perspective: "1200px" }}>
                      <div
                        className="relative h-full w-full transition-transform duration-500"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <div
                            id="card-bg-imgs"
                            className="mafia-role-card w-full h-full flex flex-col items-center justify-center px-4 text-center"
                          >
                            <p className="text-sm font-semibold opacity-70">Игрок</p>
                            <p className="mt-2 text-3xl font-black break-words">{playerName}</p>
                            <p className="mt-4 text-xs font-semibold opacity-80">Нажмите глаз, чтобы увидеть роль</p>
                          </div>
                        </div>

                        <div
                          className="absolute inset-0"
                          style={{
                            transform: "rotateY(180deg)",
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <CharacterListCard character={player.character} onDelete={() => { }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="mafia-panel-strong max-w-[460px] w-full p-8 md:p-10 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-[#250506]/20 bg-[#f4ede1] flex items-center justify-center">
                  <Users size={30} className="text-[#250506]/80" />
                </div>
                <h2 className="font-black text-3xl md:text-4xl leading-tight">Нет персонажей</h2>
                <p className="text-sm md:text-base font-semibold opacity-75">
                  Комната пока пуста. Дождитесь подключения игроков.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameStartPage;
