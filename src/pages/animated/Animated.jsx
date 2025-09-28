import { useEffect, useRef } from "react";
import "./Animated.css";

export default function Animated({ onFinish }) {
  const svg = useRef(null);

  useEffect(() => {
    const letters = svg.current.querySelectorAll(".logo__letter");
    letters.forEach((l, i) => {
      l.style.animation = "none";
      l.offsetHeight; // trigger reflow
      l.style.animation = `draw 0.5s forwards ${i * 0.15}s`;
      const handler = (e) => {
        if (e.animationName === "draw") {
          i === letters.length - 1
            ? svg.current.querySelector("text").classList.add("glow")
            : l.classList.add("glow");
          if (i === letters.length - 1 && onFinish) onFinish();
          l.removeEventListener("animationend", handler);
        }
      };
      l.addEventListener("animationend", handler);
    });
  }, [onFinish]);

  const text = "Welcome mvmafia";

  return (
    <div className="flex justify-center items-center w-full h-screen">
      <button className="welcome-button">
        <svg
          ref={svg}
          className="logo"
          width="100vw"
          height="30vh"
          viewBox="0 0 1000 150"
          preserveAspectRatio="xMidYMid meet"
        >
          <text
            x="50%"
            y="70"
            fontSize="80"
            fontFamily="sans-serif"
            fill="none"
            stroke="white"
            strokeWidth="2"
            textAnchor="middle"
          >
            {text.split("").map((c, i) => (
              <tspan key={i} className="logo__letter" dx={i ? 20 : 0}>
                {c}
              </tspan>
            ))}
          </text>
        </svg>
      </button>
    </div>
  );
}
