/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import StartGamePage from "./pages/global/StartGamePage";
import CreateGamePage from "./pages/global/CreateGamePage";
import ProfileRoleSetupPage from "./pages/global/ProfileRoleSetupPage";
import ProfilePage from "./pages/private/ProfilePage";
import JoinGamePage from "./pages/private/JoinGamePage";
import AdminDashboardPage from "./pages/private/AdminDashboardPage";
import CharacterGamePage from "./pages/private/СharacterGamePage";
import GameStartPage from "./pages/global/GameStartPage";
import NotFoundPage from "./pages/global/NotFoundPage";
import { characters } from "./services/data";
import { ToastContainer, Slide, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./App.css";
import Animated from "./pages/animated/Animated";
import ProfileAuthWidget from "./components/ProfileAuthWidget";
import { LoaderCircle } from "lucide-react";
import { ensureAnonymousAuth, subscribeAuthState } from "./services/authService";
import FortisWebCredit from "./components/FortisWebCredit";
import PresenceTracker from "./components/PresenceTracker";
import { translate as t } from "./i18n/LanguageContext";
import { getEquippedSkinId } from "./services/profileService";

// Firebase service imports
import {
  getRoomStats,
  createRoom,
  getRoomByCustomId,
  getPlayersInRoom,
  assignCharactersToPlayers
} from "./services/gameService";

function generateUnique6DigitNumber(existingIds) {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000);
  } while (existingIds.has(id));
  existingIds.add(id);
  return id;
}

// Base standard-mode lineup by player count (role ids from services/data.js)
function getMainRoleIds(count) {
  if (count >= 5 && count <= 6) {
    return [1, 5, 4];
  } else if (count >= 7 && count <= 8) {
    return [1, 1, 5, 4, 8];
  } else if (count >= 9 && count <= 10) {
    return [2, 1, 1, 5, 4, 8, 7];
  } else if (count >= 11 && count <= 12) {
    return [2, 1, 1, 3, 5, 4, 8, 9, 7];
  } else if (count >= 13 && count <= 14) {
    return [2, 1, 1, 3, 5, 4, 8, 9, 7, 13, 14];
  } else if (count >= 15) {
    return [2, 1, 1, 3, 5, 4, 8, 9, 7, 13, 14, 10, 17];
  }
  return [];
}

function ProfileWidgetByRoute({ showWhenReady }) {
  const location = useLocation();
  const isGameRoute =
    location.pathname.startsWith("/gamestart/") ||
    location.pathname === "/character" ||
    location.pathname === "/profile";

  if (!showWhenReady || isGameRoute) return null;
  return <ProfileAuthWidget />;
}

function App() {
  const [animDesign, setAnimDesign] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [id, setId] = useState();
  const generatedIds = useRef(new Set());
  const [IsFullRoom, setIsFullRoom] = useState(false);
  const [IsFullGamer, setIsFullGamer] = useState(false);
  const isFetching = useRef(false);

  const seeData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      console.log("Starting Firebase stats fetch...");

      // Get room statistics from Firebase
      const { totalRooms, totalPlayers } = await getRoomStats();

      console.log("Firebase stats received:", { totalRooms, totalPlayers });

      const isFullRoom = totalRooms >= 100;
      const isFullGamer = totalPlayers >= 100;

      setIsFullRoom(isFullRoom);
      setIsFullGamer(isFullGamer);

      if (isFullRoom || isFullGamer) {
        toast.info(t("app.fullNoticeText"));
      }

    } catch (e) {
      console.error("Ошибка анализа:", e);
      toast.error(t("app.analysisError", { message: e.message }));
    } finally {
      console.log("Analysis complete");
      isFetching.current = false;
    }


  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeAuthState(async (user) => {
      if (!isMounted) return;

      if (user) {
        setAuthReady(true);
        return;
      }

      try {
        await ensureAnonymousAuth();
      } catch (error) {
        console.error("Anonymous auth error:", error);
        toast.error(t("app.guestLoginError"));
        if (isMounted) {
          setAuthReady(true);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);


  useEffect(() => {
    // Only run analysis after animation is complete
    if (animDesign && authReady) {
      seeData();
    }
  }, [animDesign, authReady, seeData]);

  const generateId = async (options) => {
    const newId = generateUnique6DigitNumber(generatedIds.current);
    setId(newId);

    try {
      // The host skin is applied to every card in the room
      const roomOptions = options ? { ...options, skin: await getEquippedSkinId() } : options;
      await createRoom(newId, roomOptions);
      toast.success(t("app.roomCreated", { id: newId }));
    } catch (error) {
      console.error("Create room error:", error);
      toast.error(t("app.roomCreateError", { message: error.message }));
    }

    return newId;
  };
  const startGame = async (roomId, options = {}) => {
    const { selectedCharacters = [] } = options;

    try {
      const room = await getRoomByCustomId(roomId);

      if (!room) {
        toast.warn(t("app.roomNotFound"));
        return false;
      }

      const players = await getPlayersInRoom(room.id);

      if (!players || players.length === 0) {
        toast.warn(t("app.noPlayers"));
        return false;
      }

      const normalizedSelectedCharacters = Array.isArray(selectedCharacters)
        ? selectedCharacters.filter((character) => character && typeof character === "object")
        : [];

      if (normalizedSelectedCharacters.length > players.length) {
        toast.warn(t("app.tooManyRoles"));
        return false;
      }

      const shuffled = [...characters].sort(() => 0.5 - Math.random());
      const citizenRole =
        shuffled.find((character) => Number(character.id) === 12) ||
        shuffled.find((character) => character.name === "Мирный житель");

      if (!citizenRole) {
        toast.error(t("app.citizenMissing"));
        return false;
      }

      let rolesPool = [];

      if (normalizedSelectedCharacters.length > 0) {
        rolesPool = normalizedSelectedCharacters.map((character) => ({ ...character }));
      } else {
        const mainRoleIds = getMainRoleIds(players.length);
        rolesPool = mainRoleIds
          .map((roleId) => shuffled.find((character) => Number(character.id) === roleId))
          .filter(Boolean);
      }

      while (rolesPool.length < players.length) {
        rolesPool.push({ ...citizenRole });
      }

      const finalRoles = [...rolesPool].sort(() => 0.5 - Math.random());
      const assignments = players.map((player, index) => ({
        playerId: player.id,
        character: finalRoles[index % finalRoles.length],
      }));

      await assignCharactersToPlayers(room.id, assignments);

      toast.success(
        normalizedSelectedCharacters.length > 0
          ? t("app.rolesAssignedCustom")
          : t("app.rolesAssignedAuto")
      );

      return true;
    } catch (error) {
      console.error("Character assignment error:", error);
      toast.error(t("app.rolesAssignError"));
      return false;
    }
  };
  return (
    <>
      <Router>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Slide}
        />
        <ProfileWidgetByRoute showWhenReady={animDesign && authReady} />
        <FortisWebCredit />
        <PresenceTracker />
        {
          !animDesign ? (
            <Animated onFinish={() => setAnimDesign(true)} />

          ) : !authReady ? (
            <div className="flex items-center justify-center h-screen">
              <LoaderCircle className="w-10 h-10 animate-spin text-[#DBD0C0]" />
            </div>

          ) : (
            <Routes>
              <Route path="/" element={<StartGamePage IsFullRoom={IsFullRoom} IsFullGamer={IsFullGamer} generateId={generateId} />} />
              <Route
                path="/create/:id"
                element={<CreateGamePage id={id} startGame={startGame} />}
              />
              <Route path="/profile-role-setup" element={<ProfileRoleSetupPage generateId={generateId} />} />
              <Route path="/profile" element={<ProfilePage generateId={generateId} />} />
              <Route path="/join" element={<JoinGamePage />} />
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/character" element={<CharacterGamePage />} />
              <Route path="/gamestart/:id" element={<GameStartPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          )
        }
      </Router>
    </>
  );
}

export default App;


