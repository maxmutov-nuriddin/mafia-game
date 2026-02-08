/* eslint-disable react-hooks/exhaustive-deps */
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import CharacterListCard from "../../components/CharactersListCard";
import { LoaderCircle, Undo2, Eye } from 'lucide-react';
import { toast } from "react-toastify";
import { getRoomByCustomId, listenToRoomPlayers, deleteRoom, deletePlayer } from "../../services/gameService";


const GameStartPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [games, setGames] = useState([]);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minut
  const timerRef = useRef(null);
  const gameIdRef = useRef(null); // found.id saqlash uchun
  const [isStarting, setIsStarting] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]); // Selected players for kicking

  // Toggle player selection
  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  // Kick selected players
  const kickSelectedPlayers = async () => {
    if (selectedPlayers.length === 0) {
      toast.warn("Выберите игроков для выгона");
      return;
    }

    try {
      setIsStarting(true);

      // Delete all selected players
      for (const playerId of selectedPlayers) {
        await deletePlayer(gameIdRef.current, playerId);
      }

      toast.success(`Выгнано игроков: ${selectedPlayers.length}`);
      setSelectedPlayers([]); // Clear selection
    } catch (error) {
      console.error("Error kicking players:", error);
      toast.error("Ошибка при выгоне игроков");
    } finally {
      setIsStarting(false);
    }
  };

  // Xonani yopish funksiyasi
  const closeRoom = async () => {
    setIsStarting(true);
    try {
      if (!gameIdRef.current) return;

      // Delete room (cascades to all players)
      await deleteRoom(gameIdRef.current);

      // Navigate to home
      navigate("/");
    } catch (error) {
      toast.error("Xona yopishda xatolik:", error);
    }
  };

  // Vaqtni boshqarish
  const startTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closeRoom, 900000); // 15 minut
    setTimeLeft(900);
    toast.success("Xonaga vaqt qo‘shildi");
  };

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      const room = await getRoomByCustomId(id);
      if (!room) return;

      gameIdRef.current = room.id;

      // Set up real-time listener for players
      const unsubscribe = listenToRoomPlayers(room.id, (players) => {
        setGames(players);

        // Auto-delete room if all players left
        if (players.length === 0) {
          console.log("🗑️ All players left, deleting room...");
          deleteRoom(room.id).then(() => {
            console.log("✅ Room deleted");
            clearTimeout(timerRef.current);
            navigate("/");
          }).catch(err => {
            console.error("❌ Error deleting room:", err);
          });
        }
      });

      startTimer();

      // Return cleanup function
      return unsubscribe;
    };

    const cleanup = fetchData();

    return () => {
      clearTimeout(timerRef.current);
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(unsub => unsub && unsub());
      }
    };
  }, [id, navigate]);

  // 🕒 Sekund sanash
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const backBtn = () => {
    navigate("/");
  };

  const deleteCharacter = async (userId) => {
    try {
      await deletePlayer(gameIdRef.current, userId);
      setGames((prev) => prev.filter((c) => c.id !== userId));
    } catch (error) {
      toast.error("O'yinchini o'chirishda xatolik:", error);
    }
  };

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

  const seeGamerName = (name) => {
    toast.info(`Gamer: ${name}`)
  }


  return (
    <>
      <div className="mx-5 rounded-3xl mt-5 bg-[#DBD0C0] overflow-hidden">
        {/* Header with logo, scrolling names, ID, and close button */}
        <div className="flex justify-between px-5 py-2 items-center gap-4">
          <button onClick={backBtn} className="flex-shrink-0">
            <img src="/mafia-logo.png" className="w-11 h-11" alt="" />
          </button>

          {/* Scrolling player names banner - seamless loop */}
          <div className="bg-[#250506] overflow-hidden mx-2 h-9 flex items-center rounded-2xl" >
            <div
              className="flex whitespace-nowrap w-full"
              style={{
                animation: 'marquee 20s linear infinite',
              }}
            >
              {[1, 2].map((set) => (
                <div key={`set-${set}`} className="flex gap-12 px-6">
                  {games
                    .filter(player => !player.eliminated)
                    .map((player, index) => (
                      <span key={`mq-${set}-${index}`} className="text-[#DBD0C0] text-sm font-bold">
                        👤 {player.name}
                      </span>
                    ))}
                </div>
              ))}
            </div>
          </div>

          <button className="text-[#250506] flex-shrink-0" onClick={closeRoom}><Undo2 /></button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}} />

      <div
        className="flex justify-around items-center flex-col lg:flex-row gap-5 my-5 mx-5 lg:my-0 h-[90vh] text-[#250506]"
        id="global-page"
      >
        <div className="bg-[#DBD0C0] w-[100%] h-170 rounded-2xl flex flex-col items-center justify-center gap-5">
          <h1 className="text-4xl font-black">{formatTime(timeLeft)}</h1>
          <button
            className={`border rounded-md text-xl font-bold px-3 py-2 w-60 md:w-80 hover:bg-[#250506] hover:text-[#DBD0C0] ${isStarting
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#250506] hover:text-[#DBD0C0]"
              }`}
            onClick={closeRoom}
            disabled={isStarting}
          >
            {isStarting ? "Комната закрывается..." : "Закрыть Комнату"}
          </button>
          <button
            className="border rounded-md text-xl font-bold px-3 py-2 w-60 md:w-80 hover:bg-[#250506] hover:text-[#DBD0C0]"
            onClick={startTimer}
          >
            Продлить Комнату
          </button>

          {/* Kick selected players button */}
          {selectedPlayers.length > 0 && (
            <button
              className="border rounded-md text-xl font-bold px-3 py-2 w-60 md:w-80 bg-red-500 text-white hover:bg-red-600"
              onClick={kickSelectedPlayers}
              disabled={isStarting}
            >
              {isStarting ? "Выгоняем..." : `Выгнать выбранных (${selectedPlayers.length})`}
            </button>
          )}
        </div>

        <div className="bg-[#DBD0C0] w-[100%] h-170 rounded-2xl overflow-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-cols-fr items-center justify-center gap-2">
          {Array.isArray(games) && games.length > 0 ? (
            games.map((character, index) => {
              const isSelected = selectedPlayers.includes(character.id);

              return (
                <div
                  key={index}
                  onClick={() => togglePlayerSelection(character.id)}
                  className={`h-full relative transition-all duration-300 cursor-pointer ${character.eliminated
                    ? 'opacity-40'
                    : isSelected
                      ? 'opacity-100 ring-4 ring-red-500'
                      : 'opacity-100 hover:opacity-70'
                    }`}
                >
                  <button className="absolute right-7 top-6 z-10" onClick={(e) => { e.stopPropagation(); seeGamerName(character.name); }}>
                    <Eye />
                  </button>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ✓ Выбран
                    </div>
                  )}

                  <CharacterListCard
                    character={character.character}
                    onDelete={() => { }}
                  />
                </div>
              );
            })
          ) : (
            <h2 className="font-black lg:text-3xl md:text-2xl text-xl">
              Нет Персонажей
            </h2>
          )}

        </div>
      </div>
    </>
  );
};

export default GameStartPage;
