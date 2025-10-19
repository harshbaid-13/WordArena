/**
 * EloService - ELO Rating System Implementation
 *
 * Implements the standard ELO rating system using logistic distribution.
 *
 * Mathematical Foundation:
 * 1. Expected Score: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 * 2. Rating Update:  R_A' = R_A + K * (S_A - E_A)
 *
 * Where:
 * - R_A, R_B = Current ratings of players A and B
 * - E_A = Expected score (probability of winning) for player A
 * - S_A = Actual score (1 for win, 0 for loss, 0.5 for draw)
 * - K = K-factor determining rating volatility
 */

import { prisma } from "../config/prisma.js";

class EloService {
  /**
   * K-Factor: Controls rating volatility
   * - Higher K = Larger rating changes per game
   * - 32 is standard for active competition
   * - Could be dynamic based on games played (e.g., K=40 for new players)
   */
  static K_FACTOR = 32;

  /**
   * Minimum rating floor to prevent negative ratings
   */
  static MIN_RATING = 100;

  /**
   * Default starting rating for new players
   */
  static DEFAULT_RATING = 1200;

  /**
   * Scaling factor for ELO calculation
   * Standard is 400, meaning ~76% win probability for 200 point difference
   */
  static SCALE_FACTOR = 400;

  /**
   * Calculate the expected score (win probability) for a player
   *
   * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
   *
   * @param {number} playerRating - The rating of the player
   * @param {number} opponentRating - The rating of the opponent
   * @returns {number} Expected score between 0 and 1
   *
   * @example
   * // Equal ratings = 50% expected
   * calculateExpectedScore(1200, 1200) // Returns 0.5
   *
   * // 200 point advantage ≈ 76% expected
   * calculateExpectedScore(1400, 1200) // Returns ~0.76
   */
  static calculateExpectedScore(playerRating, opponentRating) {
    const exponent = (opponentRating - playerRating) / this.SCALE_FACTOR;
    return 1 / (1 + Math.pow(10, exponent));
  }

  /**
   * Calculate the new rating after a match
   *
   * Formula: R_A' = R_A + K * (S_A - E_A)
   *
   * @param {number} currentRating - Player's current rating
   * @param {number} expectedScore - Expected score (from calculateExpectedScore)
   * @param {number} actualScore - Actual score (1 = win, 0 = loss, 0.5 = draw)
   * @param {number} kFactor - Optional custom K-factor (default: 32)
   * @returns {number} New rating (floored at MIN_RATING)
   *
   * @example
   * // Underdog wins (gains more points)
   * const expected = calculateExpectedScore(1000, 1400); // ~0.09
   * calculateNewRating(1000, expected, 1) // 1000 + 32 * (1 - 0.09) ≈ 1029
   *
   * // Favorite loses (loses more points)
   * const expected = calculateExpectedScore(1400, 1000); // ~0.91
   * calculateNewRating(1400, expected, 0) // 1400 + 32 * (0 - 0.91) ≈ 1371
   */
  static calculateNewRating(
    currentRating,
    expectedScore,
    actualScore,
    kFactor = this.K_FACTOR
  ) {
    const ratingDelta = kFactor * (actualScore - expectedScore);
    const newRating = currentRating + ratingDelta;

    // Enforce minimum rating floor
    return Math.max(Math.round(newRating), this.MIN_RATING);
  }

  /**
   * Calculate rating changes for both players after a match
   *
   * @param {number} winnerRating - Current rating of the winner
   * @param {number} loserRating - Current rating of the loser
   * @returns {Object} Rating changes for both players
   *
   * @example
   * const result = calculateMatchResult(1200, 1300);
   * // result = {
   * //   winner: { oldRating: 1200, newRating: 1218, delta: +18 },
   * //   loser:  { oldRating: 1300, newRating: 1282, delta: -18 }
   * // }
   */
  static calculateMatchResult(winnerRating, loserRating) {
    // Calculate expected scores
    const winnerExpected = this.calculateExpectedScore(
      winnerRating,
      loserRating
    );
    const loserExpected = this.calculateExpectedScore(
      loserRating,
      winnerRating
    );

    // Calculate new ratings (winner gets 1, loser gets 0)
    const winnerNewRating = this.calculateNewRating(
      winnerRating,
      winnerExpected,
      1
    );
    const loserNewRating = this.calculateNewRating(
      loserRating,
      loserExpected,
      0
    );

    return {
      winner: {
        oldRating: winnerRating,
        newRating: winnerNewRating,
        delta: winnerNewRating - winnerRating,
      },
      loser: {
        oldRating: loserRating,
        newRating: loserNewRating,
        delta: loserNewRating - loserRating,
      },
    };
  }

  /**
   * Update ratings and create match record in a single transaction
   *
   * This ensures data consistency - either both ratings update AND
   * the match record is created, or neither happens.
   *
   * @param {Object} matchData - Match information
   * @param {string} matchData.winnerId - UUID of the winning player
   * @param {string} matchData.loserId - UUID of the losing player
   * @param {number} matchData.winnerRating - Current rating of winner
   * @param {number} matchData.loserRating - Current rating of loser
   * @param {string} matchData.targetWord - The word that was being guessed
   * @param {Object} matchData.replayLog - JSONB replay data
   * @param {number} matchData.durationMs - Match duration in milliseconds
   * @returns {Object} Match result with new ratings
   */
  static async updateRatingsAfterMatch(matchData) {
    const {
      winnerId,
      loserId,
      winnerRating,
      loserRating,
      targetWord,
      replayLog,
      durationMs,
    } = matchData;

    // Calculate rating changes
    const ratingResult = this.calculateMatchResult(winnerRating, loserRating);

    // Execute all updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: winnerId },
        data: {
          elo: ratingResult.winner.newRating,
          wins: { increment: 1 },
          gamesPlayed: { increment: 1 },
        },
      });

      await tx.user.update({
        where: { id: loserId },
        data: {
          elo: ratingResult.loser.newRating,
          losses: { increment: 1 },
          gamesPlayed: { increment: 1 },
        },
      });

      const matchResult = await tx.match.create({
        data: {
          winnerId,
          loserId,
          winnerEloBefore: winnerRating,
          winnerEloAfter: ratingResult.winner.newRating,
          loserEloBefore: loserRating,
          loserEloAfter: ratingResult.loser.newRating,
          targetWord,
          replayLog,
          durationMs,
        },
        select: { id: true, playedAt: true },
      });

      return {
        matchId: matchResult.id,
        playedAt: matchResult.playedAt,
        ratings: ratingResult,
      };
    });

    return result;
  }

  /**
   * Update rating after a bot match (only human player's rating changes)
   * Bot matches give reduced ELO to prevent farming
   *
   * @param {Object} matchData - Match information
   * @param {string} matchData.playerId - UUID of the human player
   * @param {number} matchData.playerRating - Current rating of player
   * @param {boolean} matchData.playerWon - Whether the player won
   * @param {string} matchData.botDifficulty - Bot difficulty level
   * @param {string} matchData.targetWord - The word that was being guessed
   * @param {Object} matchData.replayLog - JSONB replay data
   */
  static async updateRatingAfterBotMatch(matchData) {
    const {
      playerId,
      playerRating,
      playerWon,
      botDifficulty,
      targetWord,
      replayLog,
      durationMs,
    } = matchData;

    // Bot ELO based on difficulty (for calculation purposes)
    const BOT_RATINGS = {
      easy: 800,
      medium: 1100,
      hard: 1400,
      impossible: 1800,
    };

    const botRating = BOT_RATINGS[botDifficulty] || BOT_RATINGS.medium;

    // Reduced K-factor for bot matches (50% of normal)
    const botMatchKFactor = this.K_FACTOR * 0.5;

    // Calculate expected score
    const expectedScore = this.calculateExpectedScore(playerRating, botRating);
    const actualScore = playerWon ? 1 : 0;

    // Calculate new rating with reduced K-factor
    const newRating = this.calculateNewRating(
      playerRating,
      expectedScore,
      actualScore,
      botMatchKFactor
    );
    const ratingDelta = newRating - playerRating;

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: playerId },
        data: {
          elo: newRating,
          wins: playerWon ? { increment: 1 } : undefined,
          losses: playerWon ? undefined : { increment: 1 },
          gamesPlayed: { increment: 1 },
        },
      });

      const matchResult = await tx.match.create({
        data: {
          winnerId: playerWon ? playerId : null,
          loserId: playerWon ? null : playerId,
          winnerEloBefore: playerWon ? playerRating : botRating,
          winnerEloAfter: playerWon ? newRating : botRating,
          loserEloBefore: playerWon ? botRating : playerRating,
          loserEloAfter: playerWon ? botRating : newRating,
          targetWord,
          replayLog,
          durationMs,
          isBotMatch: true,
          botDifficulty,
        },
        select: { id: true, playedAt: true },
      });

      return {
        matchId: matchResult.id,
        playedAt: matchResult.playedAt,
        player: {
          oldRating: playerRating,
          newRating: newRating,
          delta: ratingDelta,
        },
      };
    });

    return result;
  }

  /**
   * Get dynamic K-factor based on player's experience
   * New players have higher K to quickly find their true rating
   *
   * @param {number} gamesPlayed - Number of games the player has played
   * @returns {number} Adjusted K-factor
   */
  static getDynamicKFactor(gamesPlayed) {
    if (gamesPlayed < 10) return 40; // Provisional period
    if (gamesPlayed < 30) return 32; // Standard active
    return 24; // Established player
  }
}

export default EloService;
