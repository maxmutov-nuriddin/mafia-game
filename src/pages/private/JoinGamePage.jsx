import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoaderCircle, Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import { getRoomByCustomId, getPlayersInRoom, addPlayerToRoom } from "../../services/gameService";
import {
  ADMIN_LOGIN_ID,
  ADMIN_LOGIN_NAME,
  ADMIN_PERSIST_KEY,
  ADMIN_SESSION_KEY,
} from "../../constants/admin";
import {
  getLastRememberedPlayerSession,
  getRememberedPlayerId,
  rememberPlayerSession,
} from "../../utils/playerSession";

const JoinGamePage = () => {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");
  const [username, setUsername] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const lastSession = getLastRememberedPlayerSession();
    if (!lastSession) return;

    if (lastSession.gameId) {
      setGameId(String(lastSession.gameId));
    }

    if (lastSession.playerName) {
      setUsername(String(lastSession.playerName));
    }
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();

    if (isJoining) return;
    setIsJoining(true);

    try {
      const cleanGameId = String(gameId || "").trim();
      const cleanUsername = String(username || "").trim();
      const playerName = cleanUsername || "Player";

      const isAdminLogin =
        cleanGameId === ADMIN_LOGIN_ID &&
        cleanUsername.toLowerCase() === ADMIN_LOGIN_NAME;

      if (isAdminLogin) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
        localStorage.setItem(ADMIN_PERSIST_KEY, "true");
        navigate("/dashboard");
        return;
      }

      // 1. Find room by customId
      const room = await getRoomByCustomId(cleanGameId);

      if (!room) {
        toast.warn("Комната с таким ID не найдена!");
        return;
      }

      // 2. Get all players in the room
      const players = await getPlayersInRoom(room.id);

      // 3. Restore known player in this room by remembered playerId
      const rememberedPlayerId = getRememberedPlayerId(cleanGameId, playerName);
      const rememberedPlayer = players.find(
        (player) => String(player.id).trim() === rememberedPlayerId
      );

      if (rememberedPlayer) {
        rememberPlayerSession({
          gameId: cleanGameId,
          userId: rememberedPlayer.id,
          playerName: rememberedPlayer.name || playerName,
        });
        navigate(`/character?userId=${rememberedPlayer.id}&gameId=${cleanGameId}`);
        return;
      }

      // 4. Rejoin existing player by name (prevents duplicate on reconnect)
      const existingByName = players.find(
        (p) => p.name?.trim().toLowerCase() === playerName.trim().toLowerCase()
      );

      if (existingByName) {
        rememberPlayerSession({
          gameId: cleanGameId,
          userId: existingByName.id,
          playerName: existingByName.name || playerName,
        });
        toast.info("Вы уже были в этой комнате. Возвращаем к вашей карте.");
        navigate(`/character?userId=${existingByName.id}&gameId=${cleanGameId}`);
        return;
      }

      // 5. Create new player
      const playerId = await addPlayerToRoom(room.id, playerName);

      rememberPlayerSession({
        gameId: cleanGameId,
        userId: playerId,
        playerName,
      });

      // 6. Navigate to character page
      const cleanUserId = String(playerId).trim();
      navigate(`/character?userId=${cleanUserId}&gameId=${cleanGameId}`);
    } catch (error) {
      console.error(error);
      toast.error("Ошибка при подключении к игре!");
    } finally {
      setIsJoining(false);
    }
  };

  const backBtn = () => navigate("/");

  if (isJoining) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div className="mafia-page flex justify-center items-center flex-col px-2">
      <div className="mafia-shell w-full sm:w-100 h-100 flex flex-col items-center justify-center gap-5 px-2 relative">
        <button onClick={backBtn} className="mafia-btn mafia-btn--icon absolute top-5 left-5">
          <Undo2 />
        </button>
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-3xl sm:text-5xl font-black">Введите ID!</h1>
        <form className="flex flex-col gap-4" onSubmit={handleJoin}>
          <input
            type="number"
            placeholder="Game ID"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="mafia-input w-full sm:w-80 h-10 text-center font-black text-xl"
          />
          <input
            type="text"
            placeholder="Имя игрока"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mafia-input w-full sm:w-80 h-10 text-center font-black text-xl"
          />
          <button
            disabled={isJoining}
            type="submit"
            className="mafia-btn w-full sm:w-80"
          >
            Присоединиться к комнате!
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGamePage;
