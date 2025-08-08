import { useNavigate } from "react-router-dom";

const CreateGamePage = ({ id, startGame }) => {
  const navigate = useNavigate();
  const handleStart = () => {
    startGame(id);
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
            className="border rounded-md text-xl font-bold px-3 py-2 w-80 hover:bg-[#250506] hover:text-[#DBD0C0]"
          >
            Начать игру!
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGamePage;
