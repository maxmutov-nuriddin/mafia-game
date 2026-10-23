import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "../../i18n/LanguageContext";
import RoomOptionsPanel from "../../components/RoomOptionsPanel";
import { DEFAULT_SETTINGS } from "../../game/phases";

const StartGamePage = ({ IsFullRoom, IsFullGamer, generateId }) => {
  const { t } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState({ ...DEFAULT_SETTINGS });

  const createNavigate = useNavigate();
  const navigate = useNavigate();

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      const newId = await generateId(options);
      createNavigate(`/create/${newId}`);
    } catch (error) {
      console.error("Create room error:", error);
      toast.error(t("app.roomCreateError", { message: error.message }));
      setIsStarting(false);
    }
  };

  // Options always start from the defaults (everything on), whatever was chosen last time
  const openOptions = () => {
    setOptions({ ...DEFAULT_SETTINGS });
    setShowOptions(true);
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

  if (showOptions) {
    return (
      <div className="mafia-page flex justify-center items-center flex-col px-2 py-3">
        <div className="mafia-shell relative w-full sm:w-[420px] p-5 sm:p-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setShowOptions(false)}
            aria-label={t("common.back")}
            title={t("common.back")}
            className="mafia-btn mafia-btn--icon absolute top-5 left-5"
          >
            <Undo2 />
          </button>
          <img src="/mafia-logo.png" className="w-16 h-16" alt="" />
          <h2 className="text-2xl sm:text-3xl font-black text-center">{t("options.title")}</h2>
          <RoomOptionsPanel value={options} onChange={setOptions} />
          <button onClick={handleStart} disabled={IsFullRoom} className="mafia-btn w-full">
            {t("options.create")}
          </button>
        </div>
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
        <h2 className="text-3xl sm:text-5xl font-black">{t("start.title")}</h2>
        <div className="flex flex-col gap-4 ">
          <button
            onClick={openOptions}
            disabled={isStarting || IsFullRoom}
            className="mafia-btn w-full sm:w-80"
          >
            {isStarting ? t("start.creating") : t("start.create")}
          </button>
          <button
            disabled={IsFullGamer}
            onClick={handleJoin}
            className="mafia-btn w-full sm:w-80"
          >
            {t("start.join")}
          </button>
        </div>
      </div>
      <h1 className="absolute text-sm font-black text-center bottom-8 px-3 text-[#dbd0c0]">
        MVMAFIA {t("app.version")} - {t("app.tagline")}
      </h1>
    </div>
  );
};

export default StartGamePage;
