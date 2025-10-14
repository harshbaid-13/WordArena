/**
 * Socket.io Event Handlers
 * 
 * Manages real-time communication for:
 * - Matchmaking
 * - Game state updates
 * - Guess processing
 * - Opponent notifications (masked)
 */

import { socketAuthMiddleware } from '../config/socket.js';
import GameService from '../services/GameService.js';
import MatchmakingService from '../services/MatchmakingService.js';
import BotService from '../services/BotService.js';
import EloService from '../services/EloService.js';
import WordService from '../services/WordService.js';

/**
 * Active games mapping: gameId -> game metadata
 */
const activeGames = new Map();

/**
 * Player socket mapping: playerId -> socketId
 */
const playerSockets = new Map();

/**
 * Socket to player mapping: socketId -> playerId
 */
const socketPlayers = new Map();

/**
 * Get all socket IDs for a given player (fallback scan)
 */
function getPlayerSocketIds(playerId) {
  const ids = [];
  const mapped = playerSockets.get(playerId);
  if (mapped) ids.push(mapped);

  for (const [socketId, pid] of socketPlayers.entries()) {
    if (pid === playerId && !ids.includes(socketId)) {
      ids.push(socketId);
    }
  }
  return ids;
}

/**
 * Setup all socket event handlers
 * 
 * @param {Server} io - Socket.io server instance
 */
function setupSocketHandlers(io) {
  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ============================================
    // Connection Management
    // ============================================

    socket.on('register', (userData) => {
      console.log(`[Socket] Register event received:`, userData);
      if (userData && userData.id) {
        playerSockets.set(userData.id, socket.id);
        socketPlayers.set(socket.id, userData.id);
        socket.userId = userData.id;
        socket.userData = userData;
        console.log(`[Socket] User registered: ${userData.username} (${userData.id}) on socket ${socket.id}`);
      } else {
        console.log(`[Socket] Register failed - invalid userData:`, userData);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const playerId = socketPlayers.get(socket.id);
      if (playerId) {
        // Cancel any active matchmaking
        await MatchmakingService.cancelMatchmaking(playerId);
        
        // Handle game forfeit if in active game - but with grace period for reconnects
        const gameId = socket.gameId;
        if (gameId) {
          // Give player 10 seconds to reconnect before forfeiting
          setTimeout(async () => {
            // Check if player reconnected with same game
            const currentSocketId = playerSockets.get(playerId);
            if (currentSocketId) {
              const currentSocket = io.sockets.sockets.get(currentSocketId);
              if (currentSocket && currentSocket.gameId === gameId) {
                // Player reconnected and is in the same game, don't forfeit
                console.log(`[Socket] Player ${playerId} reconnected, not forfeiting game ${gameId}`);
                return;
              }
            }
            
            // Player didn't reconnect to this game, check if game is still active
            const game = await GameService.getGame(gameId);
            if (game && game.status === 'active') {
              // Only forfeit PvP games, not bot games
              const players = Object.values(game.players);
              const isBotGame = players.some(p => p.isBot);
              
              if (!isBotGame) {
                console.log(`[Socket] Forfeiting game ${gameId} due to disconnect`);
                const forfeitedGame = await GameService.forfeitGame(gameId, playerId);
                if (forfeitedGame) {
                  notifyGameEnd(io, forfeitedGame, 'forfeit');
                }
              } else {
                console.log(`[Socket] Bot game ${gameId} - not forfeiting on disconnect`);
              }
            }
          }, 10000); // 10 second grace period
        }

        playerSockets.delete(playerId);
        socketPlayers.delete(socket.id);
      }
    });

    // ============================================
    // Matchmaking Events
    // ============================================

    socket.on('matchmaking:start', async (data) => {
      const player = socket.userData || data;
      
      if (!player || !player.id) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      console.log(`Matchmaking started for: ${player.username}`);
      socket.emit('matchmaking:searching');

      await MatchmakingService.startMatchmaking(
        { ...player, socketId: socket.id },
        // On match found
        async (opponent) => {
          console.log(`Match found: ${player.username} vs ${opponent.username}`);
          await startGame(io, socket, player, opponent);
        },
        // On bot spawn
        async (bot) => {
          console.log(`Bot spawned for ${player.username}: ${bot.username}`);
          await startGame(io, socket, player, bot);
        }
      );
    });

    socket.on('matchmaking:cancel', async () => {
      const playerId = socket.userData?.id;
      if (playerId) {
        await MatchmakingService.cancelMatchmaking(playerId);
        socket.emit('matchmaking:cancelled');
      }
    });

    // ============================================
    // Game Events
    // ============================================

    socket.on('game:guess', async (data) => {
      const { gameId, guess } = data;
      const playerId = socket.userData?.id;

      console.log(`[Socket] game:guess received - gameId: ${gameId}, guess: ${guess}, playerId: ${playerId}`);
      console.log(`[Socket] socket.userData:`, socket.userData);

      if (!playerId || !gameId || !guess) {
        console.log(`[Socket] Invalid guess data - playerId: ${playerId}, gameId: ${gameId}, guess: ${guess}`);
        socket.emit('error', { message: 'Invalid guess data' });
        return;
      }

      try {
        const result = await GameService.processGuess(gameId, playerId, guess);

        if (!result.success) {
          socket.emit('game:guess:invalid', { error: result.error });
          return;
        }

        // Send full result to guesser (includes word)
        socket.emit('game:guess:result', {
          word: result.guess.word,
          colors: result.guess.evaluation.map(e => e.color),
          guessNumber: result.guess.guessNumber,
          isCorrect: result.isCorrect,
          remainingGuesses: result.remainingGuesses
        });

        // Send masked result to opponent (colors only)
        const game = await GameService.getGame(gameId);
        const opponentId = Object.keys(game.players).find(id => id !== playerId);
        const opponentSocketId = playerSockets.get(opponentId);

        if (opponentSocketId) {
          io.to(opponentSocketId).emit('game:opponent:guess', {
            colors: result.guess.evaluation.map(e => e.color),
            guessNumber: result.guess.guessNumber
          });
        }

        // Handle game end
        if (result.gameEnded) {
          await handleGameEnd(io, game, result.winner);
        }

        // If playing against bot, trigger bot response
        const gameMeta = activeGames.get(gameId);
        if (gameMeta?.botInstance && !result.gameEnded) {
          triggerBotGuess(io, gameId, gameMeta.botInstance, game);
        }

      } catch (error) {
        console.error('Guess processing error:', error);
        socket.emit('error', { message: 'Failed to process guess' });
      }
    });

    socket.on('game:forfeit', async (data) => {
      const { gameId } = data;
      const playerId = socket.userData?.id;

      if (playerId && gameId) {
        const game = await GameService.forfeitGame(gameId, playerId);
        if (game) {
          notifyGameEnd(io, game, 'forfeit');
        }
      }
    });

    // ============================================
    // Game Rejoin (for page reload/reconnect)
    // ============================================

    socket.on('game:rejoin', async (data) => {
      const { gameId } = data;
      const playerId = socket.userData?.id;

      console.log(`[Socket] game:rejoin - gameId: ${gameId}, playerId: ${playerId}`);

      if (!playerId || !gameId) {
        socket.emit('game:notfound');
        return;
      }

      try {
        const game = await GameService.getGame(gameId);
        
        if (!game || game.status !== 'active') {
          console.log(`[Socket] Game ${gameId} not found or not active`);
          socket.emit('game:notfound');
          return;
        }

        // Check if player is part of this game
        if (!game.players[playerId]) {
          console.log(`[Socket] Player ${playerId} not part of game ${gameId}`);
          socket.emit('game:notfound');
          return;
        }

        // Re-associate socket with game
        socket.gameId = gameId;
        playerSockets.set(playerId, socket.id);
        socketPlayers.set(socket.id, playerId);

        console.log(`[Socket] Player ${playerId} rejoined game ${gameId}`);

        // Get player's guesses and opponent progress
        const playerData = game.players[playerId];
        const opponentId = Object.keys(game.players).find(id => id !== playerId);
        const opponentData = game.players[opponentId];

        // Send current game state back to player
        socket.emit('game:rejoined', {
          gameId: game.id,
          guesses: playerData.guesses.map(g => ({
            word: g.word,
            colors: g.evaluation.map(e => e.color),
            guessNumber: g.guessNumber
          })),
          opponentProgress: opponentData.guesses.map(g => ({
            colors: g.evaluation.map(e => e.color),
            guessNumber: g.guessNumber
          })),
          opponent: {
            username: opponentData.username,
            elo: opponentData.elo,
            isBot: opponentData.isBot
          }
        });

        // If it's a bot game, make sure the bot keeps playing
        const gameMeta = activeGames.get(gameId);
        if (gameMeta?.botInstance && opponentData.isBot) {
          // Check if bot needs to continue guessing
          if (opponentData.guesses.length < 6) {
            setTimeout(() => {
              triggerBotGuess(io, gameId, gameMeta.botInstance, game);
            }, 1000);
          }
        }

      } catch (error) {
        console.error('[Socket] Error rejoining game:', error);
        socket.emit('game:notfound');
      }
    });
  });
}

/**
 * Start a new game between two players
 */
async function startGame(io, socket, player1, player2) {
  console.log(`[Socket] Starting game for ${player1.username} vs ${player2.username}`);
  
  const game = await GameService.createGame(
    { ...player1, socketId: socket.id },
    player2
  );

  console.log(`[Socket] Game created with id: ${game.id}, status: ${game.status}`);

  socket.gameId = game.id;
  activeGames.set(game.id, { 
    game,
    botInstance: player2.isBot ? BotService.createBotInstance(player2.botDifficulty, game.targetWord) : null
  });

  // Notify player 1
  console.log(`[Socket] Emitting game:start to player1 with gameId: ${game.id}`);
  socket.emit('game:start', {
    gameId: game.id,
    opponent: {
      username: player2.username,
      elo: player2.elo,
      isBot: player2.isBot
    }
  });

  // Notify player 2 if human
  if (!player2.isBot) {
    const player2SocketId = playerSockets.get(player2.id);
    if (player2SocketId) {
      const player2Socket = io.sockets.sockets.get(player2SocketId);
      if (player2Socket) {
        player2Socket.gameId = game.id;
        io.to(player2SocketId).emit('game:start', {
          gameId: game.id,
          opponent: {
            username: player1.username,
            elo: player1.elo,
            isBot: false
          }
        });
      }
    }
  }
}

/**
 * Trigger bot to make a guess
 */
async function triggerBotGuess(io, gameId, botInstance, game) {
  // Get bot's next guess with delay
  const { guess, delayMs } = await BotService.getNextGuess(botInstance);

  setTimeout(async () => {
    const currentGame = await GameService.getGame(gameId);
    if (!currentGame || currentGame.status !== 'active') return;

    const botId = Object.keys(currentGame.players).find(
      id => currentGame.players[id].isBot
    );

    if (!botId) return;

    const result = await GameService.processGuess(gameId, botId, guess);
    
    if (result.success) {
      // Update bot state
      const pattern = result.guess.evaluation.map(e => {
        if (e.color === 'green') return 'G';
        if (e.color === 'yellow') return 'Y';
        return 'X';
      }).join('');
      
      BotService.updateBotState(botInstance, guess, pattern);

      // Notify human player of bot's progress (masked)
      const humanId = Object.keys(currentGame.players).find(id => !currentGame.players[id].isBot);
      const humanSocketIds = getPlayerSocketIds(humanId);
      humanSocketIds.forEach(sid => {
        io.to(sid).emit('game:opponent:guess', {
          colors: result.guess.evaluation.map(e => e.color),
          guessNumber: result.guess.guessNumber
        });
      });

      // Handle game end
      if (result.gameEnded) {
        const updatedGame = await GameService.getGame(gameId);
        await handleGameEnd(io, updatedGame, result.winner);
      } else {
        // Continue bot guessing if game still active
        triggerBotGuess(io, gameId, botInstance, currentGame);
      }
    }
  }, delayMs);
}

/**
 * Handle game end and ELO updates
 */
async function handleGameEnd(io, game, winnerInfo) {
  const players = Object.values(game.players);
  const winner = players.find(p => p.id === game.winner);
  const loser = players.find(p => p.id !== game.winner);

  const isBotGame = players.some(p => p.isBot);
  const duration = GameService.getGameDuration(game);

  try {
    let eloResult;

    if (isBotGame) {
      const humanPlayer = players.find(p => !p.isBot);
      const bot = players.find(p => p.isBot);
      
      eloResult = await EloService.updateRatingAfterBotMatch({
        playerId: humanPlayer.id,
        playerRating: humanPlayer.elo,
        playerWon: game.winner === humanPlayer.id,
        botDifficulty: bot.botDifficulty,
        targetWord: game.targetWord,
        replayLog: game.replayLog,
        durationMs: duration
      });
    } else if (winner && loser) {
      eloResult = await EloService.updateRatingsAfterMatch({
        winnerId: winner.id,
        loserId: loser.id,
        winnerRating: winner.elo,
        loserRating: loser.elo,
        targetWord: game.targetWord,
        replayLog: game.replayLog,
        durationMs: duration
      });
    }

    notifyGameEnd(io, game, 'complete', eloResult);
  } catch (error) {
    console.error('Error updating ELO:', error);
    notifyGameEnd(io, game, 'complete');
  }

  // Cleanup
  activeGames.delete(game.id);
}

/**
 * Notify players of game end
 */
function notifyGameEnd(io, game, reason, eloResult = null) {
  const players = Object.values(game.players);

  for (const player of players) {
    if (player.isBot) continue;

    const socketIds = getPlayerSocketIds(player.id);
    if (socketIds.length === 0) continue;

    const isWinner = game.winner === player.id;
    const opponent = players.find(p => p.id !== player.id);

    socketIds.forEach(socketId => {
      io.to(socketId).emit('game:end', {
        gameId: game.id,
        result: game.winner === null ? 'draw' : (isWinner ? 'win' : 'loss'),
        reason,
        targetWord: game.targetWord,
        opponent: {
          username: opponent.username,
          guesses: opponent.guesses.length
        },
        myGuesses: player.guesses.length,
        eloChange: eloResult ? (
          isWinner ? eloResult.ratings?.winner?.delta || eloResult.player?.delta :
          eloResult.ratings?.loser?.delta || eloResult.player?.delta
        ) : 0,
        newElo: eloResult ? (
          isWinner ? eloResult.ratings?.winner?.newRating || eloResult.player?.newRating :
          eloResult.ratings?.loser?.newRating || eloResult.player?.newRating
        ) : player.elo
      });
    });
  }
}

export { setupSocketHandlers };


