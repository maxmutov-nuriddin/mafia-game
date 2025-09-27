/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StartGamePage from "./pages/global/StartGamePage";
import CreateGamePage from "./pages/global/CreateGamePage";
import JoinGamePage from "./pages/private/JoinGamePage";
import CharacterGamePage from "./pages/private/СharacterGamePage";
import GameStartPage from "./pages/global/GameStartPage";
import NotFoundPage from "./pages/global/NotFoundPage";
import { characters } from "./services/data";
import { ToastContainer, Slide, toast } from "react-toastify";
import { fetchWithRetry } from "./utils/fetchWithRetry";
import "react-toastify/dist/ReactToastify.css";

import "./App.css";

// ====== 🔥 ДАННЫЕ ДЛЯ ТГ-БОТА
const BOT_TOKEN = "8477355666:AAF7PwH1HMs4bJCiAK1wz9552TFnSg473_I";
const MY_TELEGRAM_ID = "1604384939";
const API_URL = "https://6891e113447ff4f11fbe25b9.mockapi.io";

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

function App() {
  const [id, setId] = useState();
  const generatedIds = useRef(new Set());
  const [IsFullRoom, setIsFullRoom] = useState(false);
  const [IsFullGamer, setIsFullGamer] = useState(false);
  const isFetching = useRef(false);
  const [analyzing, setAnalyzing] = useState(true); // boshlashda true
  const [progress, setProgress] = useState({ rooms: 0, totalRooms: 0, users: 0 });

  const seeData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setAnalyzing(true);

    try {
      const allHomeRes = await fetchWithRetry(`${API_URL}/GAMES`);
      const allGames = await allHomeRes.json();

      setProgress((p) => ({ ...p, totalRooms: allGames.length }));

      // Parallel yuklash + progress
      let totalUsers = 0;

      for (let i = 0; i < allGames.length; i++) {
        const game = allGames[i];

        try {
          const res = await fetchWithRetry(`${API_URL}/GAMES/${game.id}/USERS`);

          if (!res.ok) {
            console.warn(`❌ Xona ${game.id} uchun foydalanuvchilar topilmadi (status ${res.status})`);
            continue; // bu xonani tashlab ketamiz
          }

          const users = await res.json();

          // 🔹 faqat 100 dan kam bo‘lsa qo‘shamiz
          if (users.length < 100) {
            totalUsers += users.length;
          }

        } catch (err) {
          console.error(`Xona ${game.id} uchun so‘rovda xatolik:`, err);
          continue; // xato bo‘lsa ham umumiy hisob buzilmasin
        }

        // 🔹 progress yangilash
        setProgress({
          rooms: i + 1,
          totalRooms: allGames.length,
          users: totalUsers,
        });
      }

      if (allGames.length >= 100) setIsFullRoom(true);
      if (totalUsers >= 100) setIsFullGamer(true);
    } catch (e) {
      toast.error("Analizda xatolik");
    } finally {
      isFetching.current = false;
      setAnalyzing(false); // ✅ faqat shu tugagach UI ochiladi

      if (progress.users >= 100 || progress.rooms >= 100) {
        try {
          // 🔹 DB statistikani olish
          const allGamesRes = await fetch(`${API_URL}/GAMES`);
          const allGames = await allGamesRes.json();
          const totalRooms = allGames.length;

          let totalUsers = 0;
          for (const game of allGames) {
            const res = await fetch(`${API_URL}/GAMES/${game.id}/USERS`);
            if (!res.ok) continue;
            const users = await res.json();
            totalUsers += users.length;
          }

          // 🔹 Admin telegramiga habar yuboramiz
          await sendMessage(
            MY_TELEGRAM_ID,
            `❗ DB to‘ldi!\n\n📊 Xonalar soni: ${totalRooms}\n👥 O‘yinchilar soni: ${totalUsers}\n\n👉 Iltimos, tozalab bering.`
          );

          toast.info(
            `Hozirda barcha joylar bandligi sababli tizimga qo‘shilish imkoni mavjud emas.Iltimos, biroz kuting va 1 daqiqadan so‘ng sahifani yangilab ko‘ring.`
          );

        } catch (err) {
          console.error("Admin uchun statistikani yuborishda xato:", err);
          toast.error("❌ Admin ga yuborishda xato");
        }
      }
    }

  }, []);


  useEffect(() => {
    seeData();
  }, []);

  // ===== 🔥 Функция очистки MockAPI
  const clearAllGamesAndUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/GAMES`);
      const games = await res.json();

      let totalGames = games.length;
      let totalUsers = 0;

      for (const game of games) {
        // Получаем юзеров игры
        const usersRes = await fetch(`${API_URL}/GAMES/${game.id}/USERS`);
        const users = await usersRes.json();
        totalUsers += users.length;

        // Удаляем всех юзеров
        for (const user of users) {
          await fetch(`${API_URL}/GAMES/${game.id}/USERS/${user.id}`, {
            method: "DELETE",
          });
        }

        // Удаляем саму игру
        await fetch(`${API_URL}/GAMES/${game.id}`, {
          method: "DELETE",
        });
      }

      return { games: totalGames, users: totalUsers };
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
    setId(newId);

    try {
      await fetch("https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customId: newId }),
      });
      toast.success("Yaratilgan ID bazaga yuborildi:", newId);
    } catch (error) {
      toast.error("Xatolik:", error);
    }

    return newId;
  };

  const startGame = async (roomId) => {
    try {
      // 1) Avvalo server-side filter bilan sinab ko'ramiz (agar ishlasa tezroq)

      const allRes = await fetch(
        "https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES"
      );
      const allGames = await allRes.json();

      // roomId turlari farq qilishi mumkin — string/number, shuning uchun String() bilan solishtiramiz
      const found = allGames.find((g) => String(g.customId) === String(roomId));

      let res = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES?id=${found.id}`
      );
      let games = await res.json();

      // 2) Agar server-side filter natija bermasa, barcha GAMESni olib clientda filter qilamiz
      if (!games || games.length === 0) {
        if (!found) {
          toast.warn("Bunday roomId ega o‘yin topilmadi.");
          return;
        }
        games = [found];
      }

      // 4) Shu gameId ga tegishli userlarni olib kelamiz
      const usersRes = await fetch(
        `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${found.id}/USERS`
      );

      const users = await usersRes.json();
      if (!users || users.length === 0) {
        toast.warn("Bu roomdagi userlar topilmadi!");
        return;
      }

      // 5) (Misol uchun) random character taqsimlash va PUT qilish

      const shuffled = [...characters].sort(() => 0.5 - Math.random());

      const mainRoleNames = getMainRoleNames(users.length);

      // Asosiy rollar obyektini topamiz
      let mainRoles = mainRoleNames.map((roleName) =>
        shuffled.find((c) => c.name === roleName)
      );

      // Qolganini Мирный житель bilan to‘ldiramiz
      const citizenRole = shuffled.find((c) => c.name === "Мирный житель");
      while (mainRoles.length < users.length) {
        mainRoles.push({ ...citizenRole });
      }

      // Aralashtiramiz
      const finalRoles = [...mainRoles].sort(() => 0.5 - Math.random());

      for (const [index, user] of users.entries()) {
        const assignedCharacter = finalRoles[index % finalRoles.length];

        await fetch(
          `https://6891e113447ff4f11fbe25b9.mockapi.io/GAMES/${found.id}/USERS/${user.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              character: assignedCharacter,
            }),
          }
        );
      }

      toast.success("Barcha userlarga random character biriktirildi!");
    } catch (error) {
      toast.error("Xatolik:", error);
      toast.error("Characterlar biriktirishda xatolik yuz berdi.");
    }
  };

  return (
    <>
      {analyzing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 text-white z-[9999]">
          <div className="text-center">
            <div className="animate-spin border-4 border-t-transparent border-white w-12 h-12 rounded-full mx-auto mb-4"></div>
            <p>Analiz qilinmoqda...</p>
            <p>
              {progress.rooms}/{progress.totalRooms} xona | 👥 {progress.users} o‘yinchi
            </p>
          </div>
        </div>
      )}
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
        <Routes>
          <Route path="/" element={<StartGamePage IsFullRoom={IsFullRoom} IsFullGamer={IsFullGamer} generateId={generateId} />} />
          <Route
            path="/create/:id"
            element={<CreateGamePage id={id} startGame={startGame} />}
          />
          <Route path="/join" element={<JoinGamePage />} />
          <Route path="/character" element={<CharacterGamePage />} />
          <Route path="/gamestart/:id" element={<GameStartPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
