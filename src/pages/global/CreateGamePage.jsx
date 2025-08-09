import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";

const CreateGamePage = ({ startGame }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [isStarting, setIsStarting] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let interval;

    const fetchUsers = async () => {
      try {
        // Avval hamma o'yinlarni olish
        const allRes = await fetch(
          "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
        );
        const allGames = await allRes.json();

        if (!Array.isArray(allGames) || allGames.length === 0) return;

        // Shu URL'dagi id ga mos xona topish (customId bo‘yicha)
        const found = allGames.find((g) => String(g.customId) === String(id));
        if (!found) return;

        // Xona ichidagi userlarni olish
        const res = await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${found.id}/USERS`
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Xatolik:", err);
      }
    };

    fetchUsers();
    interval = setInterval(fetchUsers, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await startGame(id);
      navigate(`/gamestart/${id}`);
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const backBtn = () => navigate("/");

  return (
    <div className="flex justify-center items-center flex-col h-[100vh] text-[#250506]">
      <div className="bg-[#DBD0C0] rounded-2xl flex flex-col items-center justify-center gap-5 relative p-6">
        <button onClick={backBtn} className="absolute top-5 left-5">
          back
        </button>
        <p className="absolute top-5 right-5">Gamers: {users.length}</p>

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-5xl font-black">ID {id}</h1>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={`border rounded-md text-xl font-bold px-3 py-2 w-80 
              ${
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
