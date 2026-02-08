import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LoaderCircle, Undo2 } from 'lucide-react';
import { toast } from "react-toastify";
import { getRoomByCustomId, listenToRoomPlayers, deleteRoom } from "../../services/gameService";


const CreateGamePage = ({ startGame }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const gameIdRef = useRef(null);
  const [isStarting, setIsStarting] = useState(false);
  const [delet, setIsDeleting] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      console.log("🔍 CreateGamePage: Fetching room with customId:", id);

      // Retry logic - sometimes Firebase needs a moment to sync
      let room = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (!room && attempts < maxAttempts) {
        room = await getRoomByCustomId(id);

        if (!room) {
          attempts++;
          console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Room not found yet, retrying in 500ms...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!room) {
        console.error("❌ Room not found after", maxAttempts, "attempts");
        toast.error("Комната не найдена. Попробуйте снова.");
        navigate("/");
        return;
      }

      console.log("✅ Room found:", room);
      gameIdRef.current = room.id;

      // Set up real-time listener for players
      console.log("👂 Setting up Firebase listener for room:", room.id);
      const unsubscribe = listenToRoomPlayers(room.id, (players) => {
        console.log("📥 Players updated:", players);
        setUsers(players);
        // Note: Don't auto-delete here - this is the waiting room before game starts
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
  }, [id, navigate]);

  const closeRoom = async () => {
    setIsDeleting(true);
    try {
      if (!gameIdRef.current) return;

      // Delete room (this will cascade delete all players in Firebase)
      await deleteRoom(gameIdRef.current);

      // Navigate to home
      navigate("/");
    } catch (error) {
      toast.error("Xona yopishda xatolik:", error);
    }
  };

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await startGame(id);
      navigate(`/gamestart/${id}`);
    } catch (error) {
      toast.error("Xatolik:", error);
    } finally {
      setIsStarting(false);
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
          className={`absolute top-5 left-5 ${delet
            ? "opacity-50 cursor-not-allowed"
            : "text-[#250506]"
            }`}
        >
          {delet ? (<LoaderCircle className="w-10 h-10 animate-spin text-[#250506]" />
          ) : (<Undo2 />)}
        </button>
        <p className="absolute top-5 right-5">Gamers: {users.length}</p>

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-3xl sm:text-5xl font-black">ID {id}</h1>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={`border rounded-md text-xl font-bold px-3 py-2 sm:w-[100%] 
              ${isStarting
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
