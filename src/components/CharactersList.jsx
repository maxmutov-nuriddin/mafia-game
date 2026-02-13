import { useEffect, useRef, useState } from "react";

const REVEAL_DURATION_MS = 500;

const CharacterList = ({ character }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsRevealed(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, [character?.id]);

  const revealTemporarily = () => {
    if (isRevealed) return;

    setIsRevealed(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
      hideTimerRef.current = null;
    }, REVEAL_DURATION_MS);
  };

  return (
    <div className="w-full flex justify-center p-2 sm:p-3">
      <button
        type="button"
        onClick={revealTemporarily}
        className="w-full max-w-[230px] md:max-w-[245px] cursor-pointer select-none"
        aria-label="Открыть карту на 1 секунду"
      >
        <div className="relative h-[295px] md:h-[315px]" style={{ perspective: "1200px" }}>
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <div
                className="mafia-role-card w-full h-full p-3 flex flex-col items-center justify-center text-center"
                style={{
                  backgroundImage: "url('/card-bg-gamer.png')",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <p className="text-sm font-semibold opacity-75">Карта игрока</p>
                <p className="mt-2 text-xl font-black leading-tight">Нажмите на карту</p>
              </div>
            </div>

            <div
              className="absolute inset-0"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <div
                className="mafia-role-card w-full h-full p-2.5 flex flex-col"
                style={{
                  backgroundImage: "url('/card-bg-gamer.png')",
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div className="h-[220px] md:h-[235px] p-2 flex-shrink-0 flex items-center justify-center">
                  <img
                    src={character.img}
                    alt={character.name}
                    className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                  />
                </div>

                <div className="mt-2 rounded-lg border border-[#250506]/20 bg-[#f4ede1]/85 px-3 py-2 text-center">
                  <h3 className="text-xl font-black leading-tight">{character.name}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};

export default CharacterList;
