/**
 * GameService - Game State Management
 * 
 * Manages the lifecycle of a WordArena game:
 * - Game creation and initialization
 * - Guess processing and validation
 * - Win condition checking
 * - State persistence in Redis
 */

import { v4 as uuidv4 } from 'uuid';
import WordService from './WordService.js';
import { 
  setGameState, 
  getGameState, 
  deleteGameState,
  acquireWinLock,
  getWinner 
} from '../config/redis.js';

class GameService {
  /**
   * Maximum number of guesses allowed
   */
  static MAX_GUESSES = 6;

  /**
   * Game state constants
   */
  static GAME_STATES = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    FINISHED: 'finished'
  };

  /**
   * Create a new game instance
   * 
   * @param {Object} player1 - First player info
   * @param {Object} player2 - Second player info (or bot)
   * @returns {Object} New game state
   */
  static async createGame(player1, player2) {
    const gameId = uuidv4();
    const targetWord = WordService.getRandomAnswer();
    const startTime = Date.now();

    const gameState = {
      id: gameId,
      targetWord,
      status: this.GAME_STATES.ACTIVE,
      startTime,
      players: {
        [player1.id]: {
          id: player1.id,
          username: player1.username,
          elo: player1.elo,
          socketId: player1.socketId,
          guesses: [],
          isBot: false
        },
        [player2.id]: {
          id: player2.id,
          username: player2.username,
          elo: player2.elo,
          socketId: player2.socketId,
          guesses: [],
          isBot: player2.isBot || false,
          botDifficulty: player2.botDifficulty || null
        }
      },
      replayLog: [],
      winner: null,
      endTime: null
    };

    console.log(`[GameService] Creating game ${gameId} with status: ${gameState.status}`);
    console.log(`[GameService] Player1: ${player1.id}, Player2: ${player2.id}`);

    // Persist to Redis with 1 hour TTL
    await setGameState(gameId, gameState, 3600);

    // Verify it was saved
    const savedGame = await getGameState(gameId);
    console.log(`[GameService] Verified saved game status: ${savedGame?.status}`);

    return gameState;
  }

  /**
   * Get current game state
   * 
   * @param {string} gameId - Game identifier
   * @returns {Object|null} Game state or null if not found
   */
  static async getGame(gameId) {
    return await getGameState(gameId);
  }

  /**
   * Process a player's guess
   * 
   * @param {string} gameId - Game identifier
   * @param {string} playerId - Player making the guess
   * @param {string} guess - The guessed word
   * @returns {Object} Result of the guess
   */
  static async processGuess(gameId, playerId, guess) {
    console.log(`[GameService] processGuess called - gameId: ${gameId}, playerId: ${playerId}, guess: ${guess}`);
    
    const game = await this.getGame(gameId);
    
    console.log(`[GameService] Retrieved game:`, game ? `status=${game.status}, players=${Object.keys(game.players || {}).join(',')}` : 'null');
    
    if (!game) {
      console.log(`[GameService] Game not found!`);
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== this.GAME_STATES.ACTIVE) {
      console.log(`[GameService] Game not active! Status: ${game.status}, Expected: ${this.GAME_STATES.ACTIVE}`);
      return { success: false, error: 'Game is not active' };
    }

    const player = game.players[playerId];
    if (!player) {
      console.log(`[GameService] Player ${playerId} not in game. Players: ${Object.keys(game.players).join(',')}`);
      return { success: false, error: 'Player not in game' };
    }

    // Normalize guess
    guess = guess.toUpperCase().trim();

    // Validate guess length
    if (guess.length !== 5) {
      return { success: false, error: 'Guess must be 5 letters' };
    }

    // Validate guess is a real word
    if (!WordService.isValidGuess(guess)) {
      return { success: false, error: 'Not a valid word' };
    }

    // Check if player has remaining guesses
    if (player.guesses.length >= this.MAX_GUESSES) {
      return { success: false, error: 'No guesses remaining' };
    }

    // Evaluate the guess
    const evaluation = WordService.evaluateGuess(guess, game.targetWord);
    const isCorrect = WordService.isCorrectGuess(guess, game.targetWord);
    const timestamp = Date.now();

    // Create guess record
    const guessRecord = {
      word: guess,
      evaluation,
      timestamp,
      guessNumber: player.guesses.length + 1
    };

    // Add to player's guesses
    player.guesses.push(guessRecord);

    // Add to replay log
    game.replayLog.push({
      playerId,
      type: 'guess',
      data: guessRecord
    });

    let gameEnded = false;
    let winnerInfo = null;

    // Check for win
    if (isCorrect) {
      // Try to acquire win lock (handles race conditions)
      const wonLock = await acquireWinLock(gameId, playerId);
      
      if (wonLock) {
        game.status = this.GAME_STATES.FINISHED;
        game.winner = playerId;
        game.endTime = timestamp;
        gameEnded = true;
        winnerInfo = {
          playerId,
          guessCount: player.guesses.length,
          timeMs: timestamp - game.startTime
        };
      } else {
        // Someone else won first
        const existingWinner = await getWinner(gameId);
        if (existingWinner) {
          game.status = this.GAME_STATES.FINISHED;
          game.winner = existingWinner.playerId;
          game.endTime = existingWinner.timestamp;
          gameEnded = true;
        }
      }
    }

    // Check for loss (both players out of guesses)
    if (!gameEnded) {
      const allPlayersExhausted = Object.values(game.players).every(
        p => p.guesses.length >= this.MAX_GUESSES
      );
      
      if (allPlayersExhausted) {
        game.status = this.GAME_STATES.FINISHED;
        game.winner = null; // Draw
        game.endTime = timestamp;
        gameEnded = true;
      }
    }

    // Update game state in Redis
    await setGameState(gameId, game, 3600);

    return {
      success: true,
      guess: guessRecord,
      isCorrect,
      gameEnded,
      winner: winnerInfo,
      remainingGuesses: this.MAX_GUESSES - player.guesses.length
    };
  }

  /**
   * Get opponent's view of a guess (colors only, no word)
   * This is the "masking" requirement - opponents only see colors
   * 
   * @param {Object} guessRecord - The full guess record
   * @returns {Object} Masked guess for opponent
   */
  static getMaskedGuessForOpponent(guessRecord) {
    return {
      colors: guessRecord.evaluation.map(e => e.color),
      timestamp: guessRecord.timestamp,
      guessNumber: guessRecord.guessNumber
    };
  }

  /**
   * Get full game state for a specific player
   * Masks opponent's words but shows colors
   * 
   * @param {string} gameId - Game identifier
   * @param {string} playerId - Requesting player's ID
   * @returns {Object} Player-specific game view
   */
  static async getPlayerGameView(gameId, playerId) {
    const game = await this.getGame(gameId);
    if (!game) return null;

    const playerIds = Object.keys(game.players);
    const opponentId = playerIds.find(id => id !== playerId);

    return {
      id: game.id,
      status: game.status,
      startTime: game.startTime,
      myGuesses: game.players[playerId]?.guesses || [],
      opponentProgress: game.players[opponentId]?.guesses.map(g => 
        this.getMaskedGuessForOpponent(g)
      ) || [],
      winner: game.winner,
      targetWord: game.status === this.GAME_STATES.FINISHED ? game.targetWord : null
    };
  }

  /**
   * End a game prematurely (player disconnect, forfeit)
   * 
   * @param {string} gameId - Game identifier
   * @param {string} forfeitPlayerId - Player who forfeited
   * @returns {Object} Updated game state
   */
  static async forfeitGame(gameId, forfeitPlayerId) {
    const game = await this.getGame(gameId);
    if (!game || game.status !== this.GAME_STATES.ACTIVE) {
      return null;
    }

    const playerIds = Object.keys(game.players);
    const winnerId = playerIds.find(id => id !== forfeitPlayerId);

    game.status = this.GAME_STATES.FINISHED;
    game.winner = winnerId;
    game.endTime = Date.now();
    game.replayLog.push({
      playerId: forfeitPlayerId,
      type: 'forfeit',
      timestamp: game.endTime
    });

    await setGameState(gameId, game, 3600);
    return game;
  }

  /**
   * Clean up a finished game
   * 
   * @param {string} gameId - Game identifier
   */
  static async cleanupGame(gameId) {
    await deleteGameState(gameId);
  }

  /**
   * Get game duration in milliseconds
   * 
   * @param {Object} game - Game state object
   * @returns {number} Duration in ms
   */
  static getGameDuration(game) {
    const endTime = game.endTime || Date.now();
    return endTime - game.startTime;
  }
}

export default GameService;


