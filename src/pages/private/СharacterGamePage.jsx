import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getRoomByCustomId, listenToPlayerCharacter } from "../../services/gameService";


const CharacterGamePage = () => {
  const Navigate = useNavigate();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const gameIdRef = useRef(null); // found.id saqlash uchun
  const userId = searchParams.get("userId");
  const gameId = searchParams.get("gameId");
  const [playerData, setPlayerData] = useState(null); // Store full player data including eliminated status
  const oldDataRef = useRef(null);

  useEffect(() => {
    if (!gameId || !userId) return;

    const fetchData = async () => {
      console.log("🎭 CharacterGamePage: Fetching room with customId:", gameId);
      console.log("👤 User ID:", userId);

      const room = await getRoomByCustomId(gameId);
      if (!room) {
        console.warn("⚠️ Room not found");
        return;
      }

      console.log("✅ Room found:", room);
      gameIdRef.current = room.id;

      // Set up real-time listener for this player's character
      console.log("👂 Setting up character listener for player:", userId);
      const unsubscribe = listenToPlayerCharacter(room.id, userId, (data) => {
        console.log("📥 Player data received:", data);

        if (!data) {
          // Player was deleted, navigate home
          console.log("❌ Player deleted, navigating home");
          navigate("/");
          return;
        }

        console.log("🎭 Player data:", data);
        setPlayerData(data); // Store full player data
      });

      // Return cleanup function
      return unsubscribe;
    };

    const cleanup = fetchData();

    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(unsub => unsub && unsub());
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

            {/* Show elimination status */}
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
