import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

const CreateGamePage = ({ startGame }) => {
  const navigate = useNavigate();
  const {id} = useParams(); // URL-dan ID olish
  const [isStarting, setIsStarting] = useState(false); // 🔹 yangi state

  const handleStart = async () => {
    if (isStarting) return; // 🔹 qayta bosishni bloklash
    setIsStarting(true);

    try {
      await startGame(id); // 🔹 startGame tugaguncha kutamiz
    } catch (error) {
      console.error("Xatolik:", error);
    } finally {
      setIsStarting(false); // 🔹 ishlash tugagach blokni yechamiz
    }
    navigate(`/gamestart/${id}`); // ✅ bu path param
  };

  const backBtn = () => {
    navigate("/");
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
        <h1 className="text-5xl font-black">ID {id}</h1>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleStart}
            disabled={isStarting} // 🔹 tugmani bloklash
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
