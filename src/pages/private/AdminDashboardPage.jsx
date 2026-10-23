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
import { useLanguage } from "../../i18n/LanguageContext";
import { getRoleName } from "../../i18n/roles";

const formatCreatedAt = (value, language, t) => {
  const ts = Number(value);
  if (!ts) return t("common.unknown");
  return new Date(ts).toLocaleString(language);
};

const getCharacterLabel = (character, language, t) => {
  if (!character) return t("admin.notAssigned");
  if (typeof character === "string") return character;
  if (typeof character === "object" && character.name) return getRoleName(character, language);
  return t("common.unknown");
};

const hasAssignedRoles = (players) => players.some((player) => !!player.character);

const AdminDashboardPage = () => {
  const { t, language } = useLanguage();
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
      toast.error(t("admin.loadError"));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
      toast.success(t("admin.roomDeleted", { id: room.customId }));
      await fetchRooms();
    } catch (error) {
      toast.error(t("admin.roomDeleteError"));
      console.error(error);
    } finally {
      setBusyKey("");
    }
  };

  const handleDeletePlayer = async (roomId, playerId) => {
    setBusyKey(`player-${playerId}`);
    try {
      await deletePlayer(roomId, playerId);
      toast.success(t("admin.playerDeleted"));
      await fetchRooms();
    } catch (error) {
      toast.error(t("admin.playerDeleteError"));
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
            <img src="/mafia-logo.png" className="w-14 h-14" alt={t("admin.logoAlt")} />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">{t("admin.title")}</h1>
              <p className="font-semibold">
                {t("admin.totals", { rooms: rooms.length, players: totalPlayers })}
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
              {t("admin.refresh")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="mafia-btn mafia-btn--icon"
            >
              <LogOut size={18} />
              {t("admin.logout")}
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="mafia-shell p-8 text-center font-black text-2xl">
            {t("admin.noRooms")}
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
              const isInGame = hasAssignedRoles(players);
              const roomStatus = isInGame ? t("admin.inGame") : t("admin.lobby");
              const assignedRolesCount = players.filter((player) => !!player.character).length;
              const alivePlayers = players.filter((player) => !player.eliminated).length;
              const eliminatedPlayers = players.length - alivePlayers;
              const roomBusy = busyKey === `room-${room.id}`;

              return (
                <div key={room.id} className="mafia-shell p-4 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xl font-black">{t("admin.roomId", { id: room.customId })}</p>
                      <p
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          isInGame
                            ? "bg-green-600 text-white"
                            : "bg-yellow-400 text-[#250506]"
                        }`}
                      >
                        {t("admin.status", { status: roomStatus })}
                      </p>
                      <p className="font-semibold flex items-center gap-2">
                        <Users size={16} />
                        {t("admin.playersLine", { count: players.length })}
                      </p>
                      <p className="text-sm font-medium">
                        {t("admin.joinedLine", {
                          joined: players.length,
                          assigned: assignedRolesCount,
                        })}
                      </p>
                      <p className="text-sm font-medium">{t("admin.firebaseId", { id: room.id })}</p>
                      <p className="text-sm font-medium">
                        {t("admin.created", { date: formatCreatedAt(room.createdAt, language, t) })}
                      </p>
                      <p className="text-sm font-medium">
                        {t("admin.aliveLine", { alive: alivePlayers, out: eliminatedPlayers })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/gamestart/${room.customId}`)}
                        className="mafia-btn mafia-btn--icon"
                      >
                        <Play size={16} />
                        {t("admin.open")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        disabled={roomBusy}
                        className="mafia-btn mafia-btn--danger mafia-btn--icon"
                      >
                        {roomBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {t("admin.delete")}
                      </button>
                    </div>
                  </div>

                  {players.length === 0 ? (
                    <p className="font-semibold">{t("admin.noPlayers")}</p>
                  ) : (
                    <div className="mafia-panel-strong p-3 flex flex-col gap-2 max-h-72 overflow-auto">
                      {players.map((player) => {
                        const playerBusy = busyKey === `player-${player.id}`;

                        return (
                          <div key={player.id} className="mafia-panel bg-white p-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold truncate">{player.name || t("common.player")}</p>
                              <p className="text-xs opacity-80 truncate">
                                {t("admin.playerId", { id: player.id })}
                              </p>
                              <p className="text-xs opacity-80 truncate">
                                {t("admin.role", {
                                  role: getCharacterLabel(player.character, language, t),
                                })}
                              </p>
                              <p className="text-xs opacity-80 truncate">
                                {t("admin.eliminated", {
                                  value: player.eliminated ? t("common.yes") : t("common.no"),
                                })}
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
                              {t("common.kick")}
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
