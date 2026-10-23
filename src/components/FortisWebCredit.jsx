import { useLanguage } from "../i18n/LanguageContext";

const FORTISWEB_URL = "https://fortisweb.netlify.app/";

const FortisWebCredit = () => {
  const { t } = useLanguage();

  return (
    <a
      href={FORTISWEB_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ bottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      className="fixed right-2 z-[60] text-[10px] leading-none text-[#dbd0c0]/70 hover:text-[#dbd0c0] transition-colors no-underline select-none"
    >
      {t("credit.createdBy")} <span className="font-bold">FortisWeb</span>
    </a>
  );
};

export default FortisWebCredit;
