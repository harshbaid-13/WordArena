/**
 * Match Model
 *
 * Database operations for matches table
 */

import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

class Match {
  /**
   * Find match by ID
   */
  static async findById(id) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        winner: { select: { username: true } },
        loser: { select: { username: true } },
      },
    });

    if (!match) return null;

    return {
      ...match,
      winner_username: match.winner?.username || null,
      loser_username: match.loser?.username || null,
    };
  }

  /**
   * Create new match record
   */
  static async create(matchData) {
    const {
      winnerId,
      loserId,
      winnerEloBefore,
      winnerEloAfter,
      loserEloBefore,
      loserEloAfter,
      targetWord,
      replayLog,
      durationMs,
      isBotMatch = false,
      botDifficulty = null,
    } = matchData;

    const result = await prisma.match.create({
      data: {
        winnerId,
        loserId,
        winnerEloBefore,
        winnerEloAfter,
        loserEloBefore,
        loserEloAfter,
        targetWord,
        replayLog,
        durationMs,
        isBotMatch,
        botDifficulty,
      },
      select: { id: true, playedAt: true },
    });

    return {
      id: result.id,
      played_at: result.playedAt,
    };
  }

  /**
   * Get matches for a user
   */
  static async findByUserId(userId, limit = 20, offset = 0) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ winnerId: userId }, { loserId: userId }],
      },
      include: {
        winner: { select: { username: true } },
        loser: { select: { username: true } },
      },
      orderBy: { playedAt: "desc" },
      take: limit,
      skip: offset,
    });

    return matches.map((m) => ({
      ...m,
      winner_username: m.winner?.username || null,
      loser_username: m.loser?.username || null,
    }));
  }

  /**
   * Get match count for a user
   */
  static async countByUserId(userId) {
    return prisma.match.count({
      where: {
        OR: [{ winnerId: userId }, { loserId: userId }],
      },
    });
  }

  /**
   * Get recent matches
   */
  static async getRecent(limit = 10) {
    const matches = await prisma.match.findMany({
      include: {
        winner: { select: { username: true } },
        loser: { select: { username: true } },
      },
      orderBy: { playedAt: "desc" },
      take: limit,
    });

    return matches.map((m) => ({
      ...m,
      winner_username: m.winner?.username || null,
      loser_username: m.loser?.username || null,
    }));
  }

  /**
   * Get statistics for a time period
   */
  static async getStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalGames, botGames, avg] = await Promise.all([
      prisma.match.count({ where: { playedAt: { gte: since } } }),
      prisma.match.count({
        where: { isBotMatch: true, playedAt: { gte: since } },
      }),
      prisma.match.aggregate({
        _avg: { durationMs: true },
        where: { playedAt: { gte: since } },
      }),
    ]);

    return {
      total_games: totalGames,
      bot_games: botGames,
      avg_duration: avg._avg.durationMs,
    };
  }
}

export default Match;
