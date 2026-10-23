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
import { roundKey } from '../game/phases';

/**
 * Create a new game room
 * @param {string} customId - 6-digit room ID
 * @returns {Promise<string>} - Firebase generated game ID
 */
export async function createRoom(customId, settings) {
   try {
      console.log("🔥 Firebase createRoom called with customId:", customId);
      const gamesRef = ref(database, 'games');
      console.log("📍 Firebase reference created:", gamesRef);

      const newGameRef = push(gamesRef);
      console.log("🆕 New game reference created:", newGameRef.key);

      await set(newGameRef, {
         customId: String(customId),
         createdAt: Date.now(),
         players: {},
         ...(settings ? { settings } : {})
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
 * @param {string|null} uid - Auth uid of a registered user (earns points), otherwise null
 * @returns {Promise<string>} - Player ID
 */
export async function addPlayerToRoom(gameId, playerName, uid = null) {
   const playersRef = ref(database, `games/${gameId}/players`);
   const newPlayerRef = push(playersRef);

   await set(newPlayerRef, {
      name: playerName,
      character: null,
      eliminated: false, // New field to track if player is eliminated
      ...(uid ? { uid } : {})
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

/**
 * Listen to the phase state, actions, votes and results of a room's game flow
 * @param {string} gameId - Firebase game ID
 * @param {Function} callback - Called with the raw `game` node, or null when it does not exist
 * @returns {Function} - Unsubscribe function
 */
export function listenToGame(gameId, callback) {
   const gameRef = ref(database, `games/${gameId}/game`);

   const listener = onValue(gameRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
   });

   return () => off(gameRef, 'value', listener);
}

/**
 * Create the game flow state (host only)
 * @param {string} gameId - Firebase game ID
 * @param {object} state - Initial game state
 */
export async function initGame(gameId, state) {
   await set(ref(database, `games/${gameId}/game`), state);
}

/**
 * Merge fields into the game flow state (host only)
 * @param {string} gameId - Firebase game ID
 * @param {object} patch - Fields to merge; null removes a field
 */
export async function updateGameState(gameId, patch) {
   await update(ref(database, `games/${gameId}/game`), patch);
}

/**
 * Save a player's night action for a round
 * @param {string} gameId - Firebase game ID
 * @param {number} round - Round number
 * @param {string} playerId - Acting player
 * @param {object} action - abilityKey -> target id (or [id, id])
 */
export async function submitNightAction(gameId, round, playerId, action) {
   await set(ref(database, `games/${gameId}/game/actions/${roundKey(round)}/${playerId}`), action);
}

/**
 * Save a player's day vote for a round
 * @param {string} gameId - Firebase game ID
 * @param {number} round - Round number
 * @param {string} playerId - Voting player
 * @param {string} targetId - Voted player id or "skip"
 */
export async function submitVote(gameId, round, playerId, targetId) {
   await set(ref(database, `games/${gameId}/game/votes/${roundKey(round)}/${playerId}`), targetId);
}

/**
 * Store each player's private night result for a round (host only)
 * @param {string} gameId - Firebase game ID
 * @param {number} round - Round number
 * @param {Record<string, object>} results - playerId -> result
 */
export async function saveNightResults(gameId, round, results) {
   await set(ref(database, `games/${gameId}/game/results/${roundKey(round)}`), results);
}

/**
 * Link a registered user to an existing player (rejoin after registering)
 * @param {string} gameId - Firebase game ID
 * @param {string} playerId - Player ID
 * @param {string} uid - Auth uid
 */
export async function setPlayerUid(gameId, playerId, uid) {
   await set(ref(database, `games/${gameId}/players/${playerId}/uid`), uid);
}
