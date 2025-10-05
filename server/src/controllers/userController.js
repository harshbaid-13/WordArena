import { prisma } from "../config/prisma.js";
import User from "../models/User.js";
import Match from "../models/Match.js";

export async function getLeaderboard(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const users = await prisma.user.findMany({
      where: { gamesPlayed: { gt: 0 } },
      orderBy: { elo: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        username: true,
        elo: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
      },
    });

    const total = await prisma.user.count({
      where: { gamesPlayed: { gt: 0 } },
    });

    res.json({
      players: users.map((u, idx) => ({
        rank: offset + idx + 1,
        id: u.id,
        username: u.username,
        elo: u.elo,
        wins: u.wins,
        losses: u.losses,
        gamesPlayed: u.gamesPlayed,
        winRate:
          u.gamesPlayed > 0 ? Math.round((u.wins / u.gamesPlayed) * 100) : 0,
      })),
      total,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}

export async function getProfile(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        elo: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const rank = await User.getRank(id);
    const matchesResult = await Match.findByUserId(id, 10, 0);

    res.json({
      id: user.id,
      username: user.username,
      elo: user.elo,
      rank: parseInt(rank),
      wins: user.wins,
      losses: user.losses,
      gamesPlayed: user.gamesPlayed,
      winRate:
        user.gamesPlayed > 0
          ? Math.round((user.wins / user.gamesPlayed) * 100)
          : 0,
      createdAt: user.createdAt,
      recentMatches: matchesResult.map((m) => ({
        id: m.id,
        playedAt: m.played_at || m.playedAt,
        targetWord: m.target_word || m.targetWord,
        durationMs: m.duration_ms ?? m.durationMs,
        won: (m.winner_id ?? m.winnerId) === id,
        opponent:
          (m.winner_id ?? m.winnerId) === id
            ? m.loser_username
            : m.winner_username,
        eloChange:
          (m.winner_id ?? m.winnerId) === id
            ? (m.winner_elo_after ?? m.winnerEloAfter) -
              (m.winner_elo_before ?? m.winnerEloBefore)
            : (m.loser_elo_after ?? m.loserEloAfter) -
              (m.loser_elo_before ?? m.loserEloBefore),
        isBotMatch: m.is_bot_match ?? m.isBotMatch,
        botDifficulty: m.bot_difficulty ?? m.botDifficulty,
      })),
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

export async function getMatches(req, res) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const matches = await Match.findByUserId(id, limit, offset);
    const total = await Match.countByUserId(id);

    res.json({
      matches: matches.map((m) => ({
        id: m.id,
        playedAt: m.played_at || m.playedAt,
        targetWord: m.target_word || m.targetWord,
        durationMs: m.duration_ms ?? m.durationMs,
        won: (m.winner_id ?? m.winnerId) === id,
        opponent:
          (m.winner_id ?? m.winnerId) === id
            ? m.loser_username
            : m.winner_username,
        eloChange:
          (m.winner_id ?? m.winnerId) === id
            ? (m.winner_elo_after ?? m.winnerEloAfter) -
              (m.winner_elo_before ?? m.winnerEloBefore)
            : (m.loser_elo_after ?? m.loserEloAfter) -
              (m.loser_elo_before ?? m.loserEloBefore),
        isBotMatch: m.is_bot_match ?? m.isBotMatch,
        botDifficulty: m.bot_difficulty ?? m.botDifficulty,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Match history error:", error);
    res.status(500).json({ error: "Failed to fetch match history" });
  }
}

