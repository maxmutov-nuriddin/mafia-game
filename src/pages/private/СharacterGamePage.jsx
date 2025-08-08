import { useEffect, useState } from "react";
import CharacterList from "../../components/CharactersList";
import { useSearchParams } from "react-router-dom";

const CharacterGamePage = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");

  console.log("Yuborilgan user ID:", userId);

  const [character, setCharacter] = useState(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/USERS/${userId}`
        );
        const userData = await res.json();
        setCharacter(userData.character);
      } catch (err) {
        console.error("Failed to fetch character:", err);
      }
    };

    fetchCharacter(); // birinchi marta yuklash
    const interval = setInterval(fetchCharacter, 2000); // har 2 sekundda yangilash

    return () => clearInterval(interval); // component unmount bo‘lganda to‘xtatish
  }, [userId]);

  return (
    <div
      className="flex justify-center items-center flex-col h-[100vh] text-[#250506]"
      id="global-page"
    >
      <div className="bg-[#DBD0C0] w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5">
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />

        {!character ? (
          <h1 className="text-3xl font-bold">ЖДИТЕ!</h1>
        ) : (
          <CharacterList char={character} />
        )}
      </div>
    </div>
  );
};

export default CharacterGamePage;
