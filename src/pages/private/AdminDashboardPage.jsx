import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CircleX,
  LoaderCircle,
  LogOut,
  Play,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react";
import { deletePlayer, deleteRoom, getAllRooms } from "../../services/gameService";
import { ADMIN_PERSIST_KEY, ADMIN_SESSION_KEY } from "../../constants/admin";

const formatCreatedAt = (value) => {
  const ts = Number(value);
  if (!ts) return "Неизвестно";
  return new Date(ts).toLocaleString();
};

const getCharacterLabel = (character) => {
  if (!character) return "Не назначен";
  if (typeof character === "string") return character;
  if (typeof character === "object" && character.name) return character.name;
  return "Неизвестно";
};

const getRoomStatus = (players) => {
  if (!players.length) return "Лобби";
  const hasAssignedRoles = players.some((player) => !!player.character);
  return hasAssignedRoles ? "В игре" : "Лобби";
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const allRooms = await getAllRooms();
      const sortedRooms = [...allRooms].sort(
        (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
      );
      setRooms(sortedRooms);
    } catch (error) {
      toast.error("Не удалось загрузить комнаты");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasSessionAccess = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
    const hasPersistentAccess = localStorage.getItem(ADMIN_PERSIST_KEY) === "true";
    const hasAccess = hasSessionAccess || hasPersistentAccess;

    if (!hasAccess) {
      navigate("/join", { replace: true });
      return;
    }

    // Keep session active while persistent auth exists
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    fetchRooms();
  }, [fetchRooms, navigate]);

  const totalPlayers = useMemo(() => {
    return rooms.reduce((sum, room) => {
      const playersCount = room.players ? Object.keys(room.players).length : 0;
      return sum + playersCount;
    }, 0);
  }, [rooms]);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_PERSIST_KEY);
    navigate("/join", { replace: true });
  };

  const handleDeleteRoom = async (room) => {
    setBusyKey(`room-${room.id}`);
    try {
      await deleteRoom(room.id);
      toast.success(`Комната ${room.customId} удалена`);
      await fetchRooms();
    } catch (error) {
      toast.error("Не удалось удалить комнату");
      console.error(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleDeletePlayer = async (roomId, playerId) => {
    setBusyKey(`player-${playerId}`);
    try {
      await deletePlayer(roomId, playerId);
      toast.success("Игрок удален");
      await fetchRooms();
    } catch (error) {
      toast.error("Не удалось удалить игрока");
      console.error(error);
    } finally {
      setBusyKey("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div className="mafia-page p-4 sm:p-6" id="global-page">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="mafia-shell p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <img src="/mafia-logo.png" className="w-14 h-14" alt="Логотип Мафии" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">Дашборд</h1>
              <p className="font-semibold">
                Комнат: {rooms.length} | Игроков: {totalPlayers}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchRooms}
              disabled={busyKey.length > 0}
              className="mafia-btn mafia-btn--icon"
            >
              <RefreshCcw size={18} />
              Обновить
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="mafia-btn mafia-btn--icon"
            >
              <LogOut size={18} />
              Выйти
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="mafia-shell p-8 text-center font-black text-2xl">
            Нет активных комнат
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const players = room.players
                ? Object.entries(room.players).map(([id, player]) => ({
                    id,
                    ...player,
                  }))
                : [];
              const roomStatus = getRoomStatus(players);
              const assignedRolesCount = players.filter((player) => !!player.character).length;
              const alivePlayers = players.filter((player) => !player.eliminated).length;
              const eliminatedPlayers = players.length - alivePlayers;
              const roomBusy = busyKey === `room-${room.id}`;

              return (
                <div key={room.id} className="mafia-shell p-4 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xl font-black">ID комнаты: {room.customId}</p>
                      <p
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          roomStatus === "В игре"
                            ? "bg-green-600 text-white"
                            : "bg-yellow-400 text-[#250506]"
                        }`}
                      >
                        Статус: {roomStatus}
                      </p>
                      <p className="font-semibold flex items-center gap-2">
                        <Users size={16} />
                        Игроков: {players.length}
                      </p>
                      <p className="text-sm font-medium">
                        Присоединились: {players.length} | С ролью: {assignedRolesCount}
                      </p>
                      <p className="text-sm font-medium">Firebase ID: {room.id}</p>
                      <p className="text-sm font-medium">Создана: {formatCreatedAt(room.createdAt)}</p>
                      <p className="text-sm font-medium">
                        Живых: {alivePlayers} | Выбыло: {eliminatedPlayers}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/gamestart/${room.customId}`)}
                        className="mafia-btn mafia-btn--icon"
                      >
                        <Play size={16} />
                        Открыть
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        disabled={roomBusy}
                        className="mafia-btn mafia-btn--danger mafia-btn--icon"
                      >
                        {roomBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Удалить
                      </button>
                    </div>
                  </div>

                  {players.length === 0 ? (
                    <p className="font-semibold">В этой комнате нет игроков.</p>
                  ) : (
                    <div className="mafia-panel-strong p-3 flex flex-col gap-2 max-h-72 overflow-auto">
                      {players.map((player) => {
                        const playerBusy = busyKey === `player-${player.id}`;

                        return (
                          <div key={player.id} className="mafia-panel bg-white p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold truncate">{player.name || "Игрок"}</p>
                              <p className="text-xs opacity-80 truncate">ID игрока: {player.id}</p>
                              <p className="text-xs opacity-80 truncate">
                                Роль: {getCharacterLabel(player.character)}
                              </p>
                              <p className="text-xs opacity-80 truncate">
                                Выбыл: {player.eliminated ? "Да" : "Нет"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeletePlayer(room.id, player.id)}
                              disabled={playerBusy}
                              className="mafia-btn mafia-btn--danger mafia-btn--sm"
                            >
                              {playerBusy ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <CircleX size={14} />
                              )}
                              Кик
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
