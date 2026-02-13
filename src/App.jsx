/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import StartGamePage from "./pages/global/StartGamePage";
import CreateGamePage from "./pages/global/CreateGamePage";
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

// ====== 🔥 Firebase Service Import
import {
  getRoomStats,
  deleteAllRoomsAndPlayers,
  createRoom,
  getRoomByCustomId,
  getPlayersInRoom,
  assignCharactersToPlayers
} from "./services/gameService";

// ====== 🔥 ДАННЫЕ ДЛЯ ТГ-БОТА
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

// Asosiy rollar qoidasi
function getMainRoleNames(count) {
  if (count >= 5 && count <= 6) {
    return ["Мафия", "Доктор", "Комиссар"];
  } else if (count >= 7 && count <= 8) {
    return ["Мафия", "Мафия", "Доктор", "Комиссар", "Красотка (Путана)"];
  } else if (count >= 9 && count <= 10) {
    return [
      "Дон",
      "Мафия",
      "Мафия",
      "Доктор",
      "Комиссар",
      "Красотка (Путана)",
      "Психолог",
    ];
  } else if (count >= 11 && count <= 12) {
    return [
      "Дон",
      "Мафия",
      "Мафия",
      "Адвокат мафии",
      "Доктор",
      "Комиссар",
      "Красотка (Путана)",
      "Снайпер",
      "Психолог",
    ];
  } else if (count >= 13 && count <= 14) {
    return [
      "Дон",
      "Мафия",
      "Мафия",
      "Адвокат мафии",
      "Доктор",
      "Комиссар",
      "Красотка (Путана)",
      "Снайпер",
      "Психолог",
      "Маньяк",
      "Купидон",
    ];
  } else if (count >= 15) {
    return [
      "Дон",
      "Мафия",
      "Мафия",
      "Адвокат мафии",
      "Доктор",
      "Комиссар",
      "Красотка (Путана)",
      "Снайпер",
      "Психолог",
      "Маньяк",
      "Купидон",
      "Журналист",
      "Бессмертный",
    ];
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
      console.log("🔍 Starting Firebase stats fetch...");

      // Get room statistics from Firebase
      const { totalRooms, totalPlayers } = await getRoomStats();

      console.log("✅ Firebase stats received:", { totalRooms, totalPlayers });

      const isFullRoom = totalRooms >= 100;
      const isFullGamer = totalPlayers >= 100;

      setIsFullRoom(isFullRoom);
      setIsFullGamer(isFullGamer);

      // 🔹 Telegram сообщение один раз
      if (isFullRoom || isFullGamer) {
        try {
          await sendMessage(
            MY_TELEGRAM_ID,
            `❗ DB to'ldi!\n\n📊 Xonalar soni: ${totalRooms}\n👥 O'yinchilar soni: ${totalPlayers}\n\n👉 Iltimos, tozalab bering.`
          );
          toast.info(
            `Hozirda barcha joylar bandligi sababli tizimga qo'shilish imkoni mavjud emas. Iltimos, biroz kuting va 1 daqiqadan so'ng sahifani yangilab ko'ring.`
          );
        } catch (err) {
          console.error("Admin uchun xato:", err);
          toast.error("❌ Admin ga yuborishda xato");
        }
      }

    } catch (e) {
      console.error("❌ Analizda xatolik:", e);
      toast.error("Analizda xatolik: " + e.message);
    } finally {
      console.log("✅ Analysis complete");
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
        toast.error("Ошибка гостевого входа. Обновите страницу.");
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

  // ===== 🔥 Функция очистки Firebase
  const clearAllGamesAndUsers = async () => {
    try {
      const stats = await deleteAllRoomsAndPlayers();
      return { games: stats.rooms, users: stats.players };
    } catch (error) {
      toast.error("❌ Ошибка при очистке:", error);
      return { games: 0, users: 0 };
    }
  };



  let lastUpdateId = 0;

  // ✅ Функция для отправки простых сообщений
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
      toast.error("Ошибка при отправке сообщения:", err);
    }
  }

  // 🔹 Основная логика long polling
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

          // ✅ При получении команды /clearmvmafia
          if (
            message &&
            String(message.from.id) === MY_TELEGRAM_ID &&
            message.text === "/clearmvmafia"
          ) {
            const stats = await clearAllGamesAndUsers();

            await sendMessage(
              MY_TELEGRAM_ID,
              `✅ Все комнаты и игроки успешно очищены!\n\n📊 Удалено комнат: ${stats.games}\n👥 Удалено игроков: ${stats.users}`
            );
          }

          // ✅ Если отправишь /start → появится кнопка
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
                  text: "Выберите действие:",
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
        toast.error("Ошибка в Telegram-поллинге:", err);
      }
    }, 5000); // каждые 5 сек

    return () => clearInterval(interval);
  }, []);

  const generateId = async () => {
    const newId = generateUnique6DigitNumber(generatedIds.current);
    console.log("🎲 Generated new room ID:", newId);
    setId(newId);

    try {
      console.log("📤 Creating room in Firebase...");
      await createRoom(newId);
      console.log("✅ Room created successfully in Firebase");
      toast.success(`Комната создана! ID: ${newId}`);
    } catch (error) {
      console.error("❌ Error creating room:", error);
      toast.error("Ошибка создания комнаты: " + error.message);
    }

    return newId;
  };

  const startGame = async (roomId) => {
    try {
      console.log("🎮 Starting game for room:", roomId);

      // 1) Find room by customId
      const room = await getRoomByCustomId(roomId);

      if (!room) {
        toast.warn("Bunday roomId ega o'yin topilmadi.");
        return;
      }

      console.log("✅ Room found:", room);

      // 2) Get all players in the room
      const players = await getPlayersInRoom(room.id);

      if (!players || players.length === 0) {
        toast.warn("Bu roomdagi userlar topilmadi!");
        return;
      }

      console.log("👥 Players in room:", players);

      // 3) Random character assignment logic (same as before)
      const shuffled = [...characters].sort(() => 0.5 - Math.random());

      const mainRoleNames = getMainRoleNames(players.length);

      // Asosiy rollar obyektini topamiz
      let mainRoles = mainRoleNames.map((roleName) =>
        shuffled.find((c) => c.name === roleName)
      );

      // Qolganini Мирный житель bilan to'ldiramiz
      const citizenRole = shuffled.find((c) => c.name === "Мирный житель");
      while (mainRoles.length < players.length) {
        mainRoles.push({ ...citizenRole });
      }

      // Aralashtiramiz
      const finalRoles = [...mainRoles].sort(() => 0.5 - Math.random());

      // 4) Prepare assignments
      const assignments = players.map((player, index) => ({
        playerId: player.id,
        character: finalRoles[index % finalRoles.length]
      }));

      console.log("🎭 Character assignments:", assignments);

      // 5) Assign characters to all players
      await assignCharactersToPlayers(room.id, assignments);

      console.log("✅ Characters assigned successfully!");
      toast.success("Barcha userlarga random character biriktirildi!");
    } catch (error) {
      toast.error("Xatolik:", error);
      toast.error("Characterlar biriktirishda xatolik yuz berdi.");
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
