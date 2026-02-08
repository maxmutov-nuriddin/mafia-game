import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from 'lucide-react';


const StartGamePage = ({ IsFullRoom, IsFullGamer, generateId }) => {
  const [isStarting, setIsStarting] = useState(false);

  const createNavigate = useNavigate();

  const handleStart = async () => {
    setIsStarting(true);
    try {
      console.log("🎬 StartGamePage: Creating room...");
      const newId = await generateId();
      console.log("🎬 StartGamePage: Navigating to /create/" + newId);
      createNavigate(`/create/${newId}`);
    } catch (error) {
      console.error("❌ Error in handleStart:", error);
      toast.error("Ошибка создания комнаты: " + error.message);
      setIsStarting(false);
    }
  };

  const navigate = useNavigate();

  const handleJoin = () => {
    navigate("/join");
  };

  if (isStarting) {
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
      <div className="bg-[#DBD0C0] px-4 sm:px-0 w-full sm:w-100 h-100 rounded-2xl flex flex-col items-center justify-center gap-5 relative ">
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h2 className="text-3xl sm:text-5xl font-black">Начать игру</h2>
        <div className="flex flex-col gap-4 ">
          <button
            onClick={handleStart}
            disabled={isStarting || IsFullRoom}
            className={`border rounded-md text-lg sm:text-xl font-bold px-3 py-2 w-full sm:w-80 hover:bg-[#250506] hover:text-[#DBD0C0] ${isStarting || IsFullRoom
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#250506] hover:text-[#DBD0C0]"
              }`}
          >
            {isStarting ? "Создаем комнату..." : "Создать комнату!"}
          </button>
          <button
            disabled={IsFullGamer}
            onClick={handleJoin}
            className={`border rounded-md text-lg sm:text-xl font-bold px-3 py-2 w-full sm:w-80 hover:bg-[#250506] hover:text-[#DBD0C0] ${IsFullGamer ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Присоединиться комнату!
          </button>
        </div>
      </div>
      <h1 className="absolute text-sm font-black text-center bottom-1 text-[#dbd0c0]">
        MVMAFIA — играть в оффлайн Мафию бесплатно
      </h1>
    </div>
  );
};

export default StartGamePage;
