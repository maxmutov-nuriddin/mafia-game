import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import CharacterListCard from "../../components/CharactersListCard";

const GameStartPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // URL-dan ID olish

  const [games, setGames] = useState([]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const allRes = await fetch(
        "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
      );
      const allGames = await allRes.json();

      const found = allGames.find((g) => String(g.customId) === String(id));

      let res = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${found.id}/USERS`
      );
      const data = await res.json();
      setGames(data);
    };
    fetchData();
  }, [id]);

  const backBtn = () => {
    navigate("/");
  };

  // 🔹 O‘chirish funksiyasi
  const deleteCharacter = (userId) => {
    setGames((prev) => prev.filter((c) => c.id !== userId));
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
          {/* Bu joyga boshqa kontent */}
        </div>

        <div className="bg-[#DBD0C0] w-[100%] h-130 rounded-2xl  overflow-auto grid grid-cols-3 auto-cols-fr  items-center justify-center gap-2">
          {games ? (
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
