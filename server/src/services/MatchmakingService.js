/**
 * MatchmakingService - ELO-based Player Matching
 * 
 * Handles the matchmaking queue and pairing logic:
 * - Adds players to queue with ELO score
 * - Finds matches within ELO range
 * - Spawns bots after timeout
 */

import { v4 as uuidv4 } from 'uuid';
import {
  addToMatchmakingQueue,
  removeFromMatchmakingQueue,
  findMatch
} from '../config/redis.js';

class MatchmakingService {
  /**
   * Matchmaking timeout in milliseconds
   * After this time, spawn a bot opponent
   */
  static MATCHMAKING_TIMEOUT = parseInt(process.env.MATCHMAKING_TIMEOUT) || 15000;

  /**
   * Initial ELO range for matching
   */
  static INITIAL_ELO_RANGE = 100;

  /**
   * Maximum ELO range (expands over time)
   */
  static MAX_ELO_RANGE = 400;

  /**
   * Active matchmaking requests (playerId -> timeout handle)
   */
  static activeSearches = new Map();

  /**
   * Start matchmaking for a player
   * 
   * @param {Object} player - Player info
   * @param {string} player.id - Player UUID
   * @param {string} player.username - Player username
   * @param {number} player.elo - Player ELO rating
   * @param {string} player.socketId - Socket.io socket ID
   * @param {Function} onMatchFound - Callback when match is found
   * @param {Function} onBotSpawn - Callback when bot should be spawned
   */
  static async startMatchmaking(player, onMatchFound, onBotSpawn) {
    // Cancel any existing search
    this.cancelMatchmaking(player.id);

    // Add to queue
    await addToMatchmakingQueue(player.id, player.elo, player.socketId);

    // Try to find immediate match
    const match = await this.tryFindMatch(player);
    if (match) {
      await removeFromMatchmakingQueue(player.id);
      await removeFromMatchmakingQueue(match.playerId);
      onMatchFound(match);
      return;
    }

    // Set up timeout for bot spawn
    const timeoutHandle = setTimeout(async () => {
      await this.cancelMatchmaking(player.id);
      onBotSpawn(this.createBotOpponent(player.elo));
    }, this.MATCHMAKING_TIMEOUT);

    this.activeSearches.set(player.id, {
      timeoutHandle,
      player,
      onMatchFound,
      startTime: Date.now()
    });

    // Start periodic matching attempts with expanding range
    this.scheduleMatchAttempt(player.id);
  }

  /**
   * Try to find a match for a player
   * 
   * @param {Object} player - Player info
   * @returns {Object|null} Matched player or null
   */
  static async tryFindMatch(player) {
    const search = this.activeSearches.get(player.id);
    const elapsed = search ? Date.now() - search.startTime : 0;
    
    // Expand range over time (100 -> 400 over 15 seconds)
    const rangeExpansion = Math.min(
      this.MAX_ELO_RANGE - this.INITIAL_ELO_RANGE,
      (elapsed / this.MATCHMAKING_TIMEOUT) * (this.MAX_ELO_RANGE - this.INITIAL_ELO_RANGE)
    );
    const currentRange = this.INITIAL_ELO_RANGE + rangeExpansion;

    return await findMatch(player.id, player.elo, currentRange);
  }

  /**
   * Schedule periodic match attempts
   * 
   * @param {string} playerId - Player ID to match
   */
  static scheduleMatchAttempt(playerId) {
    const search = this.activeSearches.get(playerId);
    if (!search) return;

    // Check every 2 seconds
    setTimeout(async () => {
      const currentSearch = this.activeSearches.get(playerId);
      if (!currentSearch) return;

      const match = await this.tryFindMatch(currentSearch.player);
      if (match) {
        await this.cancelMatchmaking(playerId);
        await removeFromMatchmakingQueue(match.playerId);
        
        // Also cancel the matched player's search
        const matchedSearch = this.activeSearches.get(match.playerId);
        if (matchedSearch) {
          clearTimeout(matchedSearch.timeoutHandle);
          this.activeSearches.delete(match.playerId);
        }

        currentSearch.onMatchFound(match);
      } else {
        // Continue searching
        this.scheduleMatchAttempt(playerId);
      }
    }, 2000);
  }

  /**
   * Cancel matchmaking for a player
   * 
   * @param {string} playerId - Player ID
   */
  static async cancelMatchmaking(playerId) {
    const search = this.activeSearches.get(playerId);
    if (search) {
      clearTimeout(search.timeoutHandle);
      this.activeSearches.delete(playerId);
    }
    await removeFromMatchmakingQueue(playerId);
  }

  /**
   * Create a bot opponent based on player's ELO
   * 
   * @param {number} playerElo - Player's ELO rating
   * @returns {Object} Bot player object
   */
  static createBotOpponent(playerElo) {
    // Select bot difficulty based on player ELO
    let difficulty, botElo, botName;

    if (playerElo < 900) {
      difficulty = 'easy';
      botElo = 800;
      botName = 'WordBot Easy';
    } else if (playerElo < 1200) {
      difficulty = 'medium';
      botElo = 1100;
      botName = 'WordBot Medium';
    } else if (playerElo < 1500) {
      difficulty = 'hard';
      botElo = 1400;
      botName = 'WordBot Hard';
    } else {
      difficulty = 'impossible';
      botElo = 1800;
      botName = 'WordBot Impossible';
    }

    return {
      id: `bot_${uuidv4()}`,
      username: botName,
      elo: botElo,
      socketId: null,
      isBot: true,
      botDifficulty: difficulty
    };
  }

  /**
   * Get current queue size
   * 
   * @returns {number} Number of players in queue
   */
  static getQueueSize() {
    return this.activeSearches.size;
  }

  /**
   * Check if player is in matchmaking
   * 
   * @param {string} playerId - Player ID
   * @returns {boolean} True if player is searching
   */
  static isSearching(playerId) {
    return this.activeSearches.has(playerId);
  }
}

export default MatchmakingService;


