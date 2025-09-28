import { useEffect, useRef } from "react";
import "./Animated.css";

export default function Animated({ onFinish }) {
   const buttonRef = useRef(null);
   const svgRef = useRef(null);

   useEffect(() => {
      const letters = svgRef.current.querySelectorAll(".logo__letter");

      letters.forEach((letter, index) => {
         letter.style.animation = "none";
         letter.offsetHeight; // trigger reflow
         letter.style.animation = `draw 0.5s forwards ${index * 0.15}s`;

         letter.addEventListener("animationend", function handler(e) {
            if (e.animationName === "draw") {
               if (index === letters.length - 1) {
                  // последняя буква — добавляем glow ко всему тексту и вызываем onFinish
                  svgRef.current.querySelector("text").classList.add("glow");
                  if (onFinish) onFinish();
               } else {
                  // остальные буквы — просто glow
                  letter.classList.add("glow");
               }
               letter.removeEventListener("animationend", handler);
            }
         });
      });
   }, [onFinish]);


   const text = "Welcome mvmafia";

   return (
      <div className="flex justify-center items-center w-full h-screen">
         <button ref={buttonRef} className="welcome-button">
            <svg
               ref={svgRef}
               className="logo"
               width="70vw"
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
                  {text.split("").map((char, index) => (
                     <tspan key={index} className="logo__letter" dx={index === 0 ? 0 : 20}>
                        {char}
                     </tspan>
                  ))}
               </text>
            </svg>
         </button>
      </div>
   );
}
