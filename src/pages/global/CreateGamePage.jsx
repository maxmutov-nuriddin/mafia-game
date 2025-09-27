import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { LoaderCircle } from 'lucide-react';
import { toast } from "react-toastify";


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
      const allRes = await fetch(
        "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
      );
      const allGames = await allRes.json();

      const found = allGames.find((g) => String(g.customId) === String(id));
      if (!found) return;

      gameIdRef.current = found.id;
    };

    fetchData();
  }, [id, navigate]);

  const closeRoom = async () => {
    setIsDeleting(true);
    try {
      if (!gameIdRef.current) return;

      // 1️⃣ Barcha userlarni olish
      const usersRes = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${gameIdRef.current}/USERS`
      );
      const users = await usersRes.json();

      // 2️⃣ Har bir userni o‘chirish
      for (let i = 0; i < users.length; i++) {
        await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${gameIdRef.current}/USERS/${users[i].id}`,
          { method: "DELETE" }
        );
      }

      // 3️⃣ Xonani o‘chirish
      await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${gameIdRef.current}`,
        { method: "DELETE" }
      );

      // 4️⃣ Bosh sahifaga qaytarish
      navigate("/");
    } catch (error) {
      toast.error("Xona yopishda xatolik:", error);
    }
  };

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
        toast.error("Xatolik:", err);
      }
    };

    fetchUsers();
    interval = setInterval(fetchUsers, 3500);

    return () => clearInterval(interval);
  }, [id]);

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
    <div className="flex justify-center items-center flex-col h-[100vh] text-[#250506]">
      <div className="bg-[#DBD0C0] rounded-2xl flex flex-col items-center justify-center gap-5 relative p-6">
        <button
          onClick={closeRoom}
          disabled={delet}
          className={`absolute top-5 left-5 ${delet
            ? "opacity-50 cursor-not-allowed"
            : "text-[#250506]"
            }`}
        >
          {delet ? "backing..." : "back!"}
        </button>
        <p className="absolute top-5 right-5">Gamers: {users.length}</p>

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-5xl font-black">ID {id}</h1>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={`border rounded-md text-xl font-bold px-3 py-2 w-80 
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
