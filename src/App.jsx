import { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StartGamePage from "./pages/global/StartGamePage";
import CreateGamePage from "./pages/global/CreateGamePage";
import JoinGamePage from "./pages/private/JoinGamePage";
import CharacterGamePage from "./pages/private/СharacterGamePage";
import { characters } from "./services/data";
import "./App.css";
import GameStartPage from "./pages/global/GameStartPage";
import NotFoundPage from "./pages/global/NotFoundPage";

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
      console.error("❌ Ошибка при очистке:", error);
      return null;
    }
  };

  let lastUpdateId = 0;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${
            lastUpdateId + 1
          }`
        );
        const data = await res.json();

        if (data.result && data.result.length > 0) {
          const lastUpdate = data.result[data.result.length - 1]; // ✅ берем только последний апдейт
          lastUpdateId = lastUpdate.update_id; // ✅ сразу запоминаем его, чтобы не повторялся

          const message = lastUpdate.message;
          if (
            message &&
            String(message.from.id) === MY_TELEGRAM_ID &&
            message.text === "/clearmvmafia"
          ) {
            const stats = await clearAllGamesAndUsers();

            await fetch(
              `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: MY_TELEGRAM_ID,
                  text: `✅ Все комнаты и игроки успешно очищены!\n\n📊 Удалено комнат: ${stats.games}\n👥 Удалено игроков: ${stats.users}`,
                }),
              }
            );
          }
        }
      } catch (err) {
        console.error("Ошибка в Telegram-поллинге:", err);
      }
    }, 10000);

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
      console.log("Yaratilgan ID bazaga yuborildi:", newId);
    } catch (error) {
      console.error("Xatolik:", error);
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
          alert("Bunday roomId ega o‘yin topilmadi.");
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
        alert("Bu roomdagi userlar topilmadi!");
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

      alert("Barcha userlarga random character biriktirildi!");
    } catch (error) {
      console.error("Xatolik:", error);
      alert("Characterlar biriktirishda xatolik yuz berdi.");
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartGamePage generateId={generateId} />} />
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
  );
}

export default App;
