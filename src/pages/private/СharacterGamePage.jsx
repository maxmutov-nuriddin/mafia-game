import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoaderCircle, Undo2 } from 'lucide-react';
import { toast } from "react-toastify";


const CharacterGamePage = () => {
  const Navigate = useNavigate();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [delet, setIsDeleting] = useState(false);
  const gameIdRef = useRef(null); // found.id saqlash uchun
  const userId = searchParams.get("userId");
  const gameId = searchParams.get("gameId");
  const [character, setCharacter] = useState(null);
  const oldDataRef = useRef(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchData = async () => {
      const allRes = await fetch(
        "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
      );
      const allGames = await allRes.json();

      const found = allGames.find((g) => String(g.customId) === String(gameId));
      if (!found) return;

      gameIdRef.current = found.id;
    };

    fetchData();
  }, [gameId, navigate]);

  const closeRoom = async () => {
    setIsDeleting(true);
    try {
      if (!gameId) return;

      // Har bir userni o‘chirish
      await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${gameIdRef.current}/USERS/${userId}`,
        { method: "DELETE" }
      );

      // 4️⃣ Bosh sahifaga qaytarish
      navigate("/");
    } catch (error) {
      toast.error("Oyinchini ochirishda xatolik:", error);
    }
  };

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/USERS/${userId}`
        );

        if (!res.ok) {
          // Agar 500 xato bo‘lsa va oldin data bo‘lsa → qaytaramiz
          if (res.status === 500 && oldDataRef.current) {
            toast.warn("Oldin data bor edi, lekin server 500 xato berdi.");
            Navigate("/");
            return;
          }
          throw new Error(`Server xatosi: ${res.status}`);
        }

        const userData = await res.json();
        oldDataRef.current = userData;
        setCharacter(userData.character);
      } catch (err) {
        toast.error("Failed to fetch character:", err);
      }
    };

    fetchCharacter();
    const interval = setInterval(fetchCharacter, 5000);

    return () => clearInterval(interval);
  }, [userId, Navigate]);

  if (delet) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
      </div>
    );
  }

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506] px-2"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-full sm:w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative">
        <button
          onClick={closeRoom}
          disabled={delet}
          className={`absolute top-5 left-5 ${delet ? "opacity-50 cursor-not-allowed" : "text-[#250506]"
            }`}
        >
          {delet ? (<LoaderCircle className="w-10 h-10 animate-spin text-[#250506]" />
          ) : (<Undo2 />)}
        </button>

        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />

        {!character ? (
          <h1 className="text-3xl font-bold">ЖДИТЕ!</h1>
        ) : (
          <CharacterList character={character} />
        )}
      </div>
    </div>
  );
};

export default CharacterGamePage;
