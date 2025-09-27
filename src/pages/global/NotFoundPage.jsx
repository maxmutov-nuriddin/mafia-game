import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center flex-col h-[100vh] ">
      <StyledWrapper>
        <div className="tooltip-container bg-[#DBD0C0] rounded-4xl">
          <div className="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={50}
              height={50}
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 
              12 12 12 12-5.373 12-12S18.627 0 
              12 0zm0 22c-5.518 0-10-4.482-10-10s4.482-10 
              10-10 10 4.482 10 10-4.482 10-10 
              10zm-1-16h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <div className="tooltip bg-[#DBD0C0]">
            <p className="text-[#250506] text-xl">Страница не найдена</p>
            <button
              onClick={() => navigate("/")}
              className="mt-8 px-6 py-1 rounded-lg font-bold text-white text-lg shadow-md shadow-black/30 
                   bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 
                   hover:shadow-xl hover:shadow-black/50 transition-all"
            >
              <Undo2 />
            </button>
          </div>
        </div>
      </StyledWrapper>
    </div>
  );
};

const StyledWrapper = styled.div`
  .tooltip-container {
    position: relative;
    display: inline-block;
    margin: 20px;
  }
  .icon {
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.3s ease, filter 0.3s ease;
  }
  .icon svg {
    transition: transform 0.5s ease-in-out;
  }
  .icon:hover svg {
    transform: rotate(360deg) scale(1.2);
  }
  .tooltip {
    visibility: hidden;
    width: 200px;
    background-color: #DBD0C0;
    color: #fff;
    text-align: center;
    border-radius: 5px;
    padding: 10px;
    position: absolute;
    bottom: 125%;
    left: 50%;
    margin-left: -100px;
    opacity: 0;
    transition: opacity 0.5s, transform 0.5s;
    transform: translateY(10px);
  }
  .tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #fffafa transparent transparent transparent;
  }
  .tooltip-container:hover .tooltip {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
    animation: bounce 0.6s ease;
  }
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-30px); }
    60% { transform: translateY(-15px); }
  }
`;

export default NotFoundPage;
