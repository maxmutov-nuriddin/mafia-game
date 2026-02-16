/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import StartGamePage from "./pages/global/StartGamePage";
import CreateGamePage from "./pages/global/CreateGamePage";
import ProfileRoleSetupPage from "./pages/global/ProfileRoleSetupPage";
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

// ====== рџ”Ґ Firebase Service Import
import {
  getRoomStats,
  deleteAllRoomsAndPlayers,
  createRoom,
  getRoomByCustomId,
  getPlayersInRoom,
  assignCharactersToPlayers
} from "./services/gameService";

// ====== рџ”Ґ Р”РђРќРќР«Р• Р”Р›РЇ РўР“-Р‘РћРўРђ
const BOT_TOKEN = "8359878262:AAGv3-QIHp7qdt821Y4Jy1wpR6VyXZuibNU";
const MY_TELEGRAM_ID = "1604384939";

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
    location.pathname.startsWith("/gamestart/") || location.pathname === "/character";

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
      console.log("рџ”Ќ Starting Firebase stats fetch...");

      // Get room statistics from Firebase
      const { totalRooms, totalPlayers } = await getRoomStats();

      console.log("вњ… Firebase stats received:", { totalRooms, totalPlayers });

      const isFullRoom = totalRooms >= 100;
      const isFullGamer = totalPlayers >= 100;

      setIsFullRoom(isFullRoom);
      setIsFullGamer(isFullGamer);

      // рџ”№ Telegram СЃРѕРѕР±С‰РµРЅРёРµ РѕРґРёРЅ СЂР°Р·
      if (isFullRoom || isFullGamer) {
        try {
          await sendMessage(
            MY_TELEGRAM_ID,
            `вќ— DB to'ldi!\n\nрџ“Љ Xonalar soni: ${totalRooms}\nрџ‘Ґ O'yinchilar soni: ${totalPlayers}\n\nрџ‘‰ Iltimos, tozalab bering.`
          );
          toast.info(
            `Hozirda barcha joylar bandligi sababli tizimga qo'shilish imkoni mavjud emas. Iltimos, biroz kuting va 1 daqiqadan so'ng sahifani yangilab ko'ring.`
          );
        } catch (err) {
          console.error("Admin uchun xato:", err);
          toast.error("вќЊ Admin ga yuborishda xato");
        }
      }

    } catch (e) {
      console.error("вќЊ Analizda xatolik:", e);
      toast.error("Analizda xatolik: " + e.message);
    } finally {
      console.log("вњ… Analysis complete");
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
        toast.error("РћС€РёР±РєР° РіРѕСЃС‚РµРІРѕРіРѕ РІС…РѕРґР°. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ.");
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

  // ===== рџ”Ґ Р¤СѓРЅРєС†РёСЏ РѕС‡РёСЃС‚РєРё Firebase
  const clearAllGamesAndUsers = async () => {
    try {
      const stats = await deleteAllRoomsAndPlayers();
      return { games: stats.rooms, users: stats.players };
    } catch (error) {
      toast.error("вќЊ РћС€РёР±РєР° РїСЂРё РѕС‡РёСЃС‚РєРµ:", error);
      return { games: 0, users: 0 };
    }
  };



  let lastUpdateId = 0;

  // вњ… Р¤СѓРЅРєС†РёСЏ РґР»СЏ РѕС‚РїСЂР°РІРєРё РїСЂРѕСЃС‚С‹С… СЃРѕРѕР±С‰РµРЅРёР№
  async function sendMessage(chatId, text) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
        }),
      });
    } catch (err) {
      toast.error("РћС€РёР±РєР° РїСЂРё РѕС‚РїСЂР°РІРєРµ СЃРѕРѕР±С‰РµРЅРёСЏ:", err);
    }
  }

  // рџ”№ РћСЃРЅРѕРІРЅР°СЏ Р»РѕРіРёРєР° long polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1
          }`
        );
        const data = await res.json();

        if (data.result && data.result.length > 0) {
          const lastUpdate = data.result[data.result.length - 1];
          lastUpdateId = lastUpdate.update_id;

          const message = lastUpdate.message;

          // вњ… РџСЂРё РїРѕР»СѓС‡РµРЅРёРё РєРѕРјР°РЅРґС‹ /clearmvmafia
          if (
            message &&
            String(message.from.id) === MY_TELEGRAM_ID &&
            message.text === "/clearmvmafia"
          ) {
            const stats = await clearAllGamesAndUsers();

            await sendMessage(
              MY_TELEGRAM_ID,
              `вњ… Р’СЃРµ РєРѕРјРЅР°С‚С‹ Рё РёРіСЂРѕРєРё СѓСЃРїРµС€РЅРѕ РѕС‡РёС‰РµРЅС‹!\n\nрџ“Љ РЈРґР°Р»РµРЅРѕ РєРѕРјРЅР°С‚: ${stats.games}\nрџ‘Ґ РЈРґР°Р»РµРЅРѕ РёРіСЂРѕРєРѕРІ: ${stats.users}`
            );
          }

          // вњ… Р•СЃР»Рё РѕС‚РїСЂР°РІРёС€СЊ /start в†’ РїРѕСЏРІРёС‚СЃСЏ РєРЅРѕРїРєР°
          if (
            message &&
            String(message.from.id) === MY_TELEGRAM_ID &&
            message.text === "/start"
          ) {
            await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: MY_TELEGRAM_ID,
                  text: "Р’С‹Р±РµСЂРёС‚Рµ РґРµР№СЃС‚РІРёРµ:",
                  reply_markup: {
                    keyboard: [[{ text: "/clearmvmafia" }]],
                    resize_keyboard: true,
                  },
                }),
              }
            );
          }
        }
      } catch (err) {
        toast.error("РћС€РёР±РєР° РІ Telegram-РїРѕР»Р»РёРЅРіРµ:", err);
      }
    }, 5000); // РєР°Р¶РґС‹Рµ 5 СЃРµРє

    return () => clearInterval(interval);
  }, []);

  const generateId = async () => {
    const newId = generateUnique6DigitNumber(generatedIds.current);
    setId(newId);

    try {
      await createRoom(newId);
      toast.success(`Комната создана! ID: ${newId}`);
    } catch (error) {
      console.error("Create room error:", error);
      toast.error("Ошибка создания комнаты: " + error.message);
    }

    return newId;
  };
  const startGame = async (roomId, options = {}) => {
    const { selectedCharacters = [] } = options;

    try {
      const room = await getRoomByCustomId(roomId);

      if (!room) {
        toast.warn("Комната с таким ID не найдена.");
        return false;
      }

      const players = await getPlayersInRoom(room.id);

      if (!players || players.length === 0) {
        toast.warn("В этой комнате пока нет игроков.");
        return false;
      }

      const normalizedSelectedCharacters = Array.isArray(selectedCharacters)
        ? selectedCharacters.filter((character) => character && typeof character === "object")
        : [];

      if (normalizedSelectedCharacters.length > players.length) {
        toast.warn("Игроков меньше, чем выбранных ролей. Уберите лишние роли.");
        return false;
      }

      const shuffled = [...characters].sort(() => 0.5 - Math.random());
      const citizenRole =
        shuffled.find((character) => Number(character.id) === 12) ||
        shuffled.find((character) => character.name === "Мирный житель");

      if (!citizenRole) {
        toast.error("Не найдена роль Мирный житель.");
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
          ? "Роли назначены по выбранному набору."
          : "Роли назначены автоматически."
      );

      return true;
    } catch (error) {
      console.error("Character assignment error:", error);
      toast.error("Ошибка при назначении ролей.");
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


