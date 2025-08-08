import { useNavigate } from "react-router-dom";
import { useState } from "react";

const JoinGamePage = () => {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");
  const [username, setUsername] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();

    try {
      // 1. GAMES ni olib kelamiz
      const res = await fetch(
        "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
      );
      const games = await res.json();

      // 2. customId bo‘yicha topamiz
      const foundGame = games.find((game) => game.customId === Number(gameId));

      if (!foundGame) {
        alert("Bunday ID ga ega o'yin topilmadi!");
        return;
      }

      // 3. GAMES/:id/USERS ga user qo‘shamiz
      const userRes = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${foundGame.id}/USERS`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: username || "Player",
          }),
        }
      );

      if (userRes.ok) {
        const newUser = await userRes.json(); // yangi yaratilgan userni olamiz
        navigate(`/character?userId=${newUser.id}`); // userId query orqali uzatish
      } else {
        alert("User qo‘shishda xatolik yuz berdi!");
      }
    } catch (error) {
      console.error("Xatolik:", error);
    }
  };

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506]"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5">
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h1 className="text-5xl font-black">Введите ID!</h1>
        <form className="flex flex-col gap-4" onSubmit={handleJoin}>
          <input
            type="number"
            placeholder="Game ID"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="border rounded-md w-80 h-8 text-center font-black text-xl"
          />
          <input
            type="text"
            placeholder="Имя игрока"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded-md w-80 h-8 text-center font-black text-xl"
          />
          <button
            type="submit"
            className="border rounded-md text-xl font-bold px-3 py-2 w-80 hover:bg-[#250506] hover:text-[#DBD0C0]"
          >
            Присоединиться к комнате!
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinGamePage;
