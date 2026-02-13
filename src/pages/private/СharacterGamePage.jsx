import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getRoomByCustomId, listenToPlayerCharacter } from "../../services/gameService";
import { rememberPlayerSession } from "../../utils/playerSession";

const CharacterGamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const gameIdRef = useRef(null);
  const userId = searchParams.get("userId");
  const gameId = searchParams.get("gameId");
  const [playerData, setPlayerData] = useState(null);

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

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506] px-2"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-full sm:w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative">
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />

        {!playerData || !playerData.character ? (
          <h1 className="text-3xl font-bold">ЖДИТЕ!</h1>
        ) : (
          <>
            <CharacterList character={playerData.character} />

            {playerData.eliminated && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                ВЫ ВЫБЫЛИ ИЗ ИГРЫ
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CharacterGamePage;
