import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { toast } from "react-toastify";

const StartGamePage = ({ IsFullRoom, IsFullGamer, generateId }) => {
  const [isStarting, setIsStarting] = useState(false);

  const createNavigate = useNavigate();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      const newId = await generateId();
      createNavigate(`/create/${newId}`);
    } catch (error) {
      console.error("Create room error:", error);
      toast.error("Ошибка создания комнаты: " + error.message);
      setIsStarting(false);
    }
  };

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
      className="mafia-page flex justify-center items-center flex-col px-2"
      id="global-page"
    >
      <div className="mafia-shell px-4 sm:px-0 w-full sm:w-100 h-100 flex flex-col items-center justify-center gap-5 relative ">
        <img src="/mafia-logo.png" className="w-20 h-20" alt="" />
        <h2 className="text-3xl sm:text-5xl font-black">Начать игру</h2>
        <div className="flex flex-col gap-4 ">
          <button
            onClick={handleStart}
            disabled={isStarting || IsFullRoom}
            className="mafia-btn w-full sm:w-80"
          >
            {isStarting ? "Создаем комнату..." : "Создать комнату!"}
          </button>
          <button
            disabled={IsFullGamer}
            onClick={handleJoin}
            className="mafia-btn w-full sm:w-80"
          >
            Присоединиться к комнате!
          </button>
        </div>
      </div>
      <h1 className="absolute text-sm font-black text-center bottom-1 text-[#dbd0c0]">
        MVMAFIA - играть в оффлайн Мафию бесплатно
      </h1>
    </div>
  );
};

export default StartGamePage;
