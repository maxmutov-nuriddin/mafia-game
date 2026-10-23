import { useLanguage } from "../i18n/LanguageContext";

const FORTISWEB_URL = "https://fortisweb.netlify.app/";

const FortisWebCredit = () => {
  const { t } = useLanguage();

  return (
    <a
      href={FORTISWEB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-1 right-2 z-[60] text-[10px] leading-none text-[#dbd0c0]/60 hover:text-[#dbd0c0] transition-colors no-underline select-none"
    >
      {t("credit.createdBy")} <span className="font-bold">FortisWeb</span>
    </a>
  );
};

export default FortisWebCredit;
