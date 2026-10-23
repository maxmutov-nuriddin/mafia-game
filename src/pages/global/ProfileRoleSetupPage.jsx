import { useNavigate } from "react-router-dom";
import { Undo2 } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import RoleSetupBody from "../../components/RoleSetupBody";

const ProfileRoleSetupPage = ({ generateId }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="mafia-page profile-setup-page flex justify-center items-center flex-col px-2 py-4">
      <div className="mafia-shell profile-setup-shell w-full max-w-[980px] relative p-5 sm:p-6">
        <div className="profile-setup-head">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mafia-btn mafia-btn--icon profile-setup-back"
          >
            <Undo2 />
          </button>

          <div className="profile-setup-brand">
            <img src="/mafia-logo.png" className="w-16 h-16 sm:w-18 sm:h-18" alt="Mafia" />
            <span className="profile-setup-kicker">{t("setup.kicker")}</span>
          </div>
        </div>

        <h1 className="profile-setup-title">{t("setup.title")}</h1>

        <RoleSetupBody generateId={generateId} />
      </div>
    </div>
  );
};

export default ProfileRoleSetupPage;
