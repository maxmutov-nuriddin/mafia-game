import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, CircleHelp, LoaderCircle, LogOut } from "lucide-react";
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
  const [showRoleDescription, setShowRoleDescription] = useState(false);

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

  useEffect(() => {
    setShowRoleDescription(false);
  }, [playerData?.character?.id, playerData?.eliminated]);

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

  const canShowRoleDescription = !!playerData?.character && !playerData?.eliminated;
  const roleDescription = playerData?.character?.description?.trim() || "Описание роли пока недоступно.";

  return (
    <div className="mafia-page flex justify-center items-start sm:items-center flex-col px-2 py-3" id="global-page">
      <div className="mafia-shell relative w-full max-w-[350px] min-h-[400px] flex flex-col gap-4 p-4 sm:p-5">
        <div className="w-full flex items-center justify-between">
          <img src="/mafia-logo.png" className="w-18 h-18 object-contain" alt="Mafia" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRoleDescription((prev) => !prev)}
              disabled={!canShowRoleDescription}
              className="mafia-btn mafia-btn--icon mafia-btn--tiny"
              title={showRoleDescription ? "Скрыть описание роли" : "Показать описание роли"}
              aria-label={showRoleDescription ? "Скрыть описание роли" : "Показать описание роли"}
            >
              <CircleHelp size={16} />
              {showRoleDescription ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="mafia-btn mafia-btn--icon mafia-btn--tiny"
              title="Покинуть комнату"
              aria-label="Покинуть комнату"
            >
              {isLeaving ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
            </button>
          </div>
        </div>

        {showRoleDescription && canShowRoleDescription && (
          <div className="absolute top-[94px] right-4 sm:right-6 z-30 w-[320px] max-w-[calc(100%-2rem)] mafia-panel-strong p-4 shadow-[0_14px_28px_rgba(37,5,6,0.2)]">
            <p className="text-sm font-bold uppercase tracking-wide opacity-70 mb-2">Профессия</p>
            <p className="text-base font-semibold leading-relaxed">{roleDescription}</p>
          </div>
        )}

        <div className="w-full flex items-center justify-center">
          {!playerData || !playerData.character ? (
            <h1 className="text-3xl font-bold">ЖДИТЕ!</h1>
          ) : playerData.eliminated ? (
            <div className="mafia-panel-strong w-full max-w-[380px] min-h-[260px] flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-3xl font-black text-red-600">ВЫ ВЫБЫЛИ</h2>
              <p className="mt-2 text-lg font-semibold">из игры</p>
            </div>
          ) : (
            <CharacterList character={playerData.character} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterGamePage;
