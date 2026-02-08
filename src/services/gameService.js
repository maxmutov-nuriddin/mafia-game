import { database } from './firebase';
import {
   ref,
   set,
   get,
   push,
   remove,
   onValue,
   off,
   query,
   orderByChild,
   equalTo,
   update
} from 'firebase/database';

/**
 * Create a new game room
 * @param {string} customId - 6-digit room ID
 * @returns {Promise<string>} - Firebase generated game ID
 */
export async function createRoom(customId) {
   try {
      console.log("🔥 Firebase createRoom called with customId:", customId);
      const gamesRef = ref(database, 'games');
      console.log("📍 Firebase reference created:", gamesRef);

      const newGameRef = push(gamesRef);
      console.log("🆕 New game reference created:", newGameRef.key);

      await set(newGameRef, {
         customId: String(customId),
         createdAt: Date.now(),
         players: {}
      });

      console.log("✅ Room data written to Firebase successfully");
      return newGameRef.key;
   } catch (error) {
      console.error("❌ Firebase createRoom error:", error);
      throw error;
   }
}

/**
 * Find a room by its custom 6-digit ID
 * @param {string} customId - 6-digit room ID
 * @returns {Promise<{id: string, data: object} | null>}
 */
export async function getRoomByCustomId(customId) {
   console.log("🔍 getRoomByCustomId called with:", customId);
   const gamesRef = ref(database, 'games');
   const snapshot = await get(gamesRef);

   if (!snapshot.exists()) {
      console.log("⚠️ No games found in Firebase");
      return null;
   }

   const games = snapshot.val();
   console.log("📊 Total games in Firebase:", Object.keys(games).length);
   console.log("🎮 All game customIds:", Object.values(games).map(g => g.customId));

   const gameId = Object.keys(games).find(
      key => String(games[key].customId) === String(customId)
   );

   if (!gameId) {
      console.log("❌ No game found with customId:", customId);
      return null;
   }

   console.log("✅ Found game with Firebase ID:", gameId);
   return {
      id: gameId,
      data: games[gameId]
   };
}

/**
 * Get all rooms
 * @returns {Promise<Array>}
 */
export async function getAllRooms() {
   const gamesRef = ref(database, 'games');
   const snapshot = await get(gamesRef);

   if (!snapshot.exists()) return [];

   const games = snapshot.val();
   return Object.keys(games).map(id => ({
      id,
      ...games[id]
   }));
}

/**
 * Add a player to a room
 * @param {string} gameId - Firebase game ID
 * @param {string} playerName - Player's name
 * @returns {Promise<string>} - Player ID
 */
export async function addPlayerToRoom(gameId, playerName) {
   const playersRef = ref(database, `games/${gameId}/players`);
   const newPlayerRef = push(playersRef);

   await set(newPlayerRef, {
      name: playerName,
      character: null,
      eliminated: false // New field to track if player is eliminated
   });

   return newPlayerRef.key;
}

/**
 * Get all players in a room
 * @param {string} gameId - Firebase game ID
 * @returns {Promise<Array>}
 */
export async function getPlayersInRoom(gameId) {
   const playersRef = ref(database, `games/${gameId}/players`);
   const snapshot = await get(playersRef);

   if (!snapshot.exists()) return [];

   const players = snapshot.val();
   return Object.keys(players).map(id => ({
      id,
      ...players[id]
   }));
}

/**
 * Assign characters to players
 * @param {string} gameId - Firebase game ID
 * @param {Array} assignments - Array of {playerId, character}
 */
export async function assignCharactersToPlayers(gameId, assignments) {
   const updates = {};

   assignments.forEach(({ playerId, character }) => {
      updates[`games/${gameId}/players/${playerId}/character`] = character;
   });

   await update(ref(database), updates);
}

/**
 * Mark a player as eliminated (for game mechanics)
 * @param {string} gameId - Firebase game ID
 * @param {string} playerId - Player ID to eliminate
 */
export async function eliminatePlayer(gameId, playerId) {
   const playerRef = ref(database, `games/${gameId}/players/${playerId}/eliminated`);
   await set(playerRef, true);
}

/**
 * Delete a specific player from a room (admin kick)
 * @param {string} gameId - Firebase game ID
 * @param {string} playerId - Player ID to delete
 */
export async function deletePlayer(gameId, playerId) {
   const playerRef = ref(database, `games/${gameId}/players/${playerId}`);
   await remove(playerRef);
}

/**
 * Delete a room and all its players
 * @param {string} gameId - Firebase game ID
 */
export async function deleteRoom(gameId) {
   const gameRef = ref(database, `games/${gameId}`);
   await remove(gameRef);
}

/**
 * Listen to real-time updates for players in a room
 * @param {string} gameId - Firebase game ID
 * @param {Function} callback - Callback function with players array
 * @returns {Function} - Unsubscribe function
 */
export function listenToRoomPlayers(gameId, callback) {
   const playersRef = ref(database, `games/${gameId}/players`);

   const listener = onValue(playersRef, (snapshot) => {
      if (!snapshot.exists()) {
         callback([]);
         return;
      }

      const players = snapshot.val();
      const playersArray = Object.keys(players).map(id => ({
         id,
         ...players[id]
      }));

      callback(playersArray);
   });

   // Return unsubscribe function
   return () => off(playersRef, 'value', listener);
}

/**
 * Listen to real-time updates for a specific player's character
 * @param {string} gameId - Firebase game ID
 * @param {string} playerId - Player ID
 * @param {Function} callback - Callback function with player data
 * @returns {Function} - Unsubscribe function
 */
export function listenToPlayerCharacter(gameId, playerId, callback) {
   const playerRef = ref(database, `games/${gameId}/players/${playerId}`);

   const listener = onValue(playerRef, (snapshot) => {
      if (!snapshot.exists()) {
         callback(null);
         return;
      }

      callback(snapshot.val());
   });

   // Return unsubscribe function
   return () => off(playerRef, 'value', listener);
}

/**
 * Get statistics about rooms and players
 * @returns {Promise<{totalRooms: number, totalPlayers: number}>}
 */
export async function getRoomStats() {
   const gamesRef = ref(database, 'games');
   const snapshot = await get(gamesRef);

   if (!snapshot.exists()) {
      return { totalRooms: 0, totalPlayers: 0 };
   }

   const games = snapshot.val();
   const totalRooms = Object.keys(games).length;
   let totalPlayers = 0;

   Object.values(games).forEach(game => {
      if (game.players) {
         const playerCount = Object.keys(game.players).length;
         if (playerCount < 100) {
            totalPlayers += playerCount;
         }
      }
   });

   return { totalRooms, totalPlayers };
}

/**
 * Delete all rooms and players (for admin cleanup)
 * @returns {Promise<{rooms: number, players: number}>}
 */
export async function deleteAllRoomsAndPlayers() {
   const gamesRef = ref(database, 'games');
   const snapshot = await get(gamesRef);

   if (!snapshot.exists()) {
      return { rooms: 0, players: 0 };
   }

   const games = snapshot.val();
   let totalRooms = 0;
   let totalPlayers = 0;

   Object.entries(games).forEach(([gameId, game]) => {
      totalRooms++;
      if (game.players) {
         totalPlayers += Object.keys(game.players).length;
      }
   });

   // Delete all games (this will cascade delete all players)
   await remove(gamesRef);

   return { rooms: totalRooms, players: totalPlayers };
}
