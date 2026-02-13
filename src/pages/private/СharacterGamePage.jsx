import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoaderCircle, LogOut } from "lucide-react";
import { toast } from "react-toastify";
import {
  deletePlayer,
  getRoomByCustomId,
  listenToPlayerCharacter,
} from "../../services/gameService";
import {
  clearLastRememberedPlayerSession,
  forgetRememberedPlayer,
  rememberPlayerSession,
} from "../../utils/playerSession";

const CharacterGamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const gameIdRef = useRef(null);
  const userId = searchParams.get("userId");
  const gameId = searchParams.get("gameId");

  const [playerData, setPlayerData] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!gameId || !userId) return;

    const fetchData = async () => {
      const room = await getRoomByCustomId(gameId);
      if (!room) return;

      gameIdRef.current = room.id;

      const unsubscribe = listenToPlayerCharacter(room.id, userId, (data) => {
        if (!data) {
          navigate("/");
          return;
        }

        setPlayerData(data);
        rememberPlayerSession({
          gameId,
          userId,
          playerName: data.name || "Player",
        });
      });

      return unsubscribe;
    };

    const cleanup = fetchData();

    return () => {
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((unsub) => unsub && unsub());
      }
    };
  }, [gameId, userId, navigate]);

  const handleLeaveRoom = async () => {
    if (isLeaving) return;

    setIsLeaving(true);

    try {
      let roomId = gameIdRef.current;

      if (!roomId && gameId) {
        const room = await getRoomByCustomId(gameId);
        roomId = room?.id || null;
      }

      if (roomId && userId) {
        await deletePlayer(roomId, userId);
      }

      if (playerData?.name) {
        forgetRememberedPlayer(gameId, playerData.name);
      }
      clearLastRememberedPlayerSession();

      toast.info("Вы покинули комнату.");
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось покинуть комнату.");
      setIsLeaving(false);
    }
  };

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506] px-2"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-full sm:w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative">
        <button
          type="button"
          onClick={handleLeaveRoom}
          disabled={isLeaving}
          className={`absolute top-4 right-4 z-10 border-2 border-[#250506] rounded-full px-3.5 py-1.5 font-bold flex items-center gap-2 bg-[#f6eee2] shadow-sm transition-all duration-200 ${
            isLeaving
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-[#250506] hover:text-[#DBD0C0] hover:border-[#DBD0C0] hover:ring-2 hover:ring-[#DBD0C0]/35"
          }`}
        >
          {isLeaving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Покинуть
        </button>

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />

        {!playerData || !playerData.character ? (
          <h1 className="text-3xl font-bold">ЖДИТЕ!</h1>
        ) : playerData.eliminated ? (
          <div className="w-full max-w-[380px] min-h-[260px] rounded-xl border border-[#250506]/20 bg-[#f6eee2] flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-3xl font-black text-red-600">ВЫ ВЫБЫЛИ</h2>
            <p className="mt-2 text-lg font-semibold">из игры</p>
          </div>
        ) : (
          <CharacterList character={playerData.character} />
        )}
      </div>
    </div>
  );
};

export default CharacterGamePage;
