import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { LoaderCircle, Undo2 } from 'lucide-react';
import { toast } from "react-toastify";
import { getRoomByCustomId, getPlayersInRoom, addPlayerToRoom } from "../../services/gameService";

const JoinGamePage = () => {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");
  const [username, setUsername] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();

    if (isJoining) return;
    setIsJoining(true);

    try {
      // 1. Find room by customId
      const room = await getRoomByCustomId(gameId);

      if (!room) {
        toast.warn("Bunday ID ga ega o'yin topilmadi!");
        setIsJoining(false);
        return;
      }

      // 2. Get all players in the room
      const players = await getPlayersInRoom(room.id);

      // 3. Check for duplicate name (case-insensitive)
      const exists = players.some(
        (p) =>
          p.name.trim().toLowerCase() ===
          (username || "Player").trim().toLowerCase()
      );

      if (exists) {
        toast.info(
          "Bu ism bilan user allaqachon mavjud! Iltimos, boshqa ism tanlang."
        );
        setIsJoining(false);
        return;
      }

      // 4. Add player to room
      const playerId = await addPlayerToRoom(room.id, username || "Player");

      // 5. Navigate to character page
      const cleanUserId = String(playerId).trim();
      const cleanGameId = String(gameId).trim();
      navigate(`/character?userId=${cleanUserId}&gameId=${cleanGameId}`);

    } catch (error) {
      toast.error("Xatolik:", error);
      toast.error("O'yinga qo'shilish jarayonida xatolik yuz berdi!");
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
    <div className="flex justify-center items-center flex-col h-[100vh] text-[#250506] px-2">
      <div className="bg-[#DBD0C0] w-full sm:w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 px-2 relative">
        <button onClick={backBtn} className="absolute top-5 left-5">
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
            className="border rounded-md w-full sm:w-80 h-8 text-center font-black text-xl"
          />
          <input
            type="text"
            placeholder="Имя игрока"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded-md w-full sm:w-80 h-8 text-center font-black text-xl"
          />
          <button
            disabled={isJoining}
            type="submit"
            className={`border rounded-md text-xl font-bold px-3 py-2 w-full sm:w-80 ${isJoining
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#250506] hover:text-[#DBD0C0]"
              }`}
          >
            Присоединиться к комнате!
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGamePage;
