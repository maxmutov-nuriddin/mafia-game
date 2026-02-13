import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LoaderCircle, Undo2, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getRoomByCustomId,
  listenToRoomPlayers,
  deleteRoom,
  deletePlayer,
} from "../../services/gameService";

const CreateGamePage = ({ startGame }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const gameIdRef = useRef(null);

  const [isStarting, setIsStarting] = useState(false);
  const [delet, setIsDeleting] = useState(false);
  const [users, setUsers] = useState([]);
  const [showPlayers, setShowPlayers] = useState(false);
  const [kickingPlayerId, setKickingPlayerId] = useState("");

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
      navigate("/");
    } catch (error) {
      toast.error("Ошибка при закрытии комнаты");
      console.error(error);
    }
  };

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await startGame(id);
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
    <div className="flex justify-center items-center flex-col h-[100vh] text-[#250506] px-2">
      <div className="bg-[#DBD0C0] w-full sm:w-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative p-6">
        <button
          onClick={closeRoom}
          disabled={delet}
          className={`absolute top-5 left-5 ${
            delet ? "opacity-50 cursor-not-allowed" : "text-[#250506]"
          }`}
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
          className="absolute top-5 right-5 border-2 border-[#250506] rounded-full px-3 py-1.5 font-semibold flex items-center gap-2 bg-[#f4ede1] hover:bg-[#250506] hover:text-[#DBD0C0] transition-colors"
        >
          <Users size={16} />
          Gamers: {users.length}
        </button>

        {showPlayers && (
          <div className="absolute right-4 top-16 z-20 w-[300px] rounded-2xl border-2 border-[#250506]/20 bg-[#f6eee2] overflow-hidden shadow-[0_12px_24px_rgba(37,5,6,0.18)]">
            <div className="flex items-center justify-between px-4 py-3 bg-[#ede1cf] border-b border-[#250506]/15">
              <p className="font-black text-lg">Игроки ({users.length})</p>
              <button
                type="button"
                onClick={() => setShowPlayers(false)}
                className="border border-[#250506]/40 rounded-lg px-2 py-1 text-xs font-semibold flex items-center gap-1 hover:bg-[#250506] hover:text-[#DBD0C0] transition-colors"
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
                    <div
                      key={user.id}
                      className="rounded-xl border border-[#250506]/15 bg-white/95 p-2.5 flex items-center justify-between gap-2"
                    >
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
                        className={`text-xs rounded-lg border border-[#250506]/50 px-3 py-1.5 font-black transition-colors ${
                          isKicking
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[#250506] hover:text-[#DBD0C0]"
                        }`}
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

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={`border rounded-md text-xl font-bold px-3 py-2 sm:w-[100%] ${
              isStarting
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#250506] hover:text-[#DBD0C0]"
            }`}
          >
            {isStarting ? "Игра начинается..." : "Начать игру!"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGamePage;
