import { prisma } from "../config/prisma.js";
import Match from "../models/Match.js";

export async function getStats(req, res) {
  try {
    const now = Date.now();
    const last24 = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [totalGames, botGames, pvpGames, avgDuration, recentMatches] =
      await Promise.all([
        prisma.match.count({ where: { playedAt: { gte: last24 } } }),
        prisma.match.count({
          where: { isBotMatch: true, playedAt: { gte: last24 } },
        }),
        prisma.match.count({
          where: {
            playedAt: { gte: last24 },
            OR: [{ isBotMatch: false }, { isBotMatch: null }],
          },
        }),
        prisma.match.aggregate({
          _avg: { durationMs: true },
          where: { playedAt: { gte: last24 } },
        }),
        prisma.match.findMany({
          where: { playedAt: { gte: last24 } },
          select: { winnerId: true, loserId: true },
        }),
      ]);

    const uniquePlayers = new Set();
    recentMatches.forEach((m) => {
      if (m.winnerId) uniquePlayers.add(m.winnerId);
      if (m.loserId) uniquePlayers.add(m.loserId);
    });

    const topWords = await prisma.match.groupBy({
      by: ["targetWord"],
      where: { playedAt: { gte: last7d } },
      _count: { targetWord: true },
      orderBy: { _count: { targetWord: "desc" } },
      take: 10,
    });

    res.json({
      last24Hours: {
        totalGames,
        botGames,
        pvpGames,
        avgDurationMs: Math.round(avgDuration._avg.durationMs || 0),
        uniquePlayers: uniquePlayers.size,
      },
      popularWords: topWords.map((w) => ({
        word: w.targetWord,
        count: w._count.targetWord,
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}

export async function getReplay(req, res) {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({
      id: match.id,
      playedAt: match.played_at || match.playedAt,
      targetWord: match.target_word || match.targetWord,
      durationMs: match.duration_ms ?? match.durationMs,
      winner: {
        id: match.winner_id ?? match.winnerId,
        username: match.winner_username,
      },
      loser: {
        id: match.loser_id ?? match.loserId,
        username: match.loser_username,
      },
      isBotMatch: match.is_bot_match ?? match.isBotMatch,
      botDifficulty: match.bot_difficulty ?? match.botDifficulty,
      replayLog: match.replay_log ?? match.replayLog,
    });
  } catch (error) {
    console.error("Replay error:", error);
    res.status(500).json({ error: "Failed to fetch replay" });
  }
}

