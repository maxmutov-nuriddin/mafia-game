import { useEffect, useRef, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useNavigate, useSearchParams } from "react-router-dom";

const CharacterGamePage = () => {
  const Navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  const [character, setCharacter] = useState(null);
  const oldDataRef = useRef(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/USERS/${userId}`
        );

        if (!res.ok) {
          // Agar 500 xato bo‘lsa va oldin data bo‘lsa → qaytaramiz
          if (res.status === 500 && oldDataRef.current) {
            console.warn("Oldin data bor edi, lekin server 500 xato berdi.");
            Navigate("/");
            return;
          }
          throw new Error(`Server xatosi: ${res.status}`);
        }

        const userData = await res.json();
        oldDataRef.current = userData;
        setCharacter(userData.character);
      } catch (err) {
        console.error("Failed to fetch character:", err);
      }
    };

    fetchCharacter();
    const interval = setInterval(fetchCharacter, 5000);

    return () => clearInterval(interval);
  }, [userId, Navigate]);

  const backBtn = () => {
    Navigate("/");
  };

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506]"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative">
        <button onClick={backBtn} className="absolute top-5 left-5">
          back
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
