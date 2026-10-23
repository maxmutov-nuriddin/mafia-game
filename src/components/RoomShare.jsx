import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Link2 } from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "../i18n/LanguageContext";

const COPY_FEEDBACK_MS = 1500;

const RoomShare = ({ roomId }) => {
  const { t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);

  if (!roomId) return null;

  const joinUrl = `${window.location.origin}/join?room=${encodeURIComponent(roomId)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(t("share.copyError"));
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl bg-white p-2 border border-[#250506]/20">
        <QRCodeSVG value={joinUrl} size={132} bgColor="#ffffff" fgColor="#250506" />
      </div>
      <p className="text-xs font-semibold opacity-75">{t("share.scan")}</p>
      <button type="button" onClick={handleCopy} className="mafia-btn mafia-btn--sm">
        {isCopied ? <Check size={14} /> : <Link2 size={14} />}
        {isCopied ? t("share.copied") : t("share.copy")}
      </button>
    </div>
  );
};

export default RoomShare;
