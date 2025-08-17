/* eslint-disable react-hooks/exhaustive-deps */
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import CharacterListCard from "../../components/CharactersListCard";

const GameStartPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [games, setGames] = useState([]);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minut
  const timerRef = useRef(null);
  const gameIdRef = useRef(null); // found.id saqlash uchun
  const [isStarting, setIsStarting] = useState(false);

  // Xonani yopish funksiyasi
  const closeRoom = async () => {
    setIsStarting(true);
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
      console.error("Xona yopishda xatolik:", error);
    }
  };

  // Vaqtni boshqarish
  const startTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closeRoom, 900000); // 15 minut
    setTimeLeft(900);
  };

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

      const res = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${found.id}/USERS`
      );
      const data = await res.json();
      setGames(data);

      startTimer();
    };

    fetchData();

    return () => clearTimeout(timerRef.current);
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

  const deleteCharacter = (userId) => {
    setGames((prev) => prev.filter((c) => c.id !== userId));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <div className="flex justify-between mx-5 rounded-3xl mt-5 px-5 py-1 bg-[#DBD0C0] items-center">
        <button onClick={backBtn}>
          <img src="/mafia-logo.png" className="w-11 h-11" alt="" />
        </button>

        <h2 className="font-black lg:text-3xl md:text-2xl text-xl">
          {id ? `ID: ${id}` : "Нет ID"}
        </h2>

        <button onClick={backBtn}>back</button>
      </div>

      <div
        className="flex justify-around items-center flex-col lg:flex-row gap-5 my-5 mx-5 lg:my-0 h-[100vh] text-[#250506]"
        id="global-page"
      >
        <div className="bg-[#DBD0C0] w-[100%] h-130 rounded-2xl flex flex-col items-center justify-center gap-5">
          <h1 className="text-4xl font-black">{formatTime(timeLeft)}</h1>
          <button
            className={`border rounded-md text-xl font-bold px-3 py-2 w-60 md:w-80 hover:bg-[#250506] hover:text-[#DBD0C0] ${
              isStarting
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
        </div>

        <div className="bg-[#DBD0C0] w-[100%] h-130 rounded-2xl overflow-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-cols-fr items-center justify-center gap-2">
          {games && games.length > 0 ? (
            games.map((character, index) => (
              <CharacterListCard
                key={index}
                character={character.character}
                onDelete={() => deleteCharacter(character.id)}
              />
            ))
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
