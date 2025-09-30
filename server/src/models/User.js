/**
 * User Model
 *
 * Database operations for users table
 */

import { prisma } from "../config/prisma.js";
import { Prisma } from "@prisma/client";

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        elo: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        elo: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
      },
    });
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        elo: true,
        wins: true,
        losses: true,
        gamesPlayed: true,
      },
    });
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { username, email, passwordHash, elo = 1200 } = userData;

    return prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
        elo,
      },
      select: {
        id: true,
        username: true,
        email: true,
        elo: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update user ELO
   */
  static async updateElo(id, newElo) {
    return prisma.user.update({
      where: { id },
      data: { elo: newElo },
      select: { id: true, elo: true },
    });
  }

  /**
   * Increment win count
   */
  static async incrementWins(id) {
    return prisma.user.update({
      where: { id },
      data: {
        wins: { increment: 1 },
        gamesPlayed: { increment: 1 },
      },
      select: { id: true, wins: true, gamesPlayed: true },
    });
  }

  /**
   * Increment loss count
   */
  static async incrementLosses(id) {
    return prisma.user.update({
      where: { id },
      data: {
        losses: { increment: 1 },
        gamesPlayed: { increment: 1 },
      },
      select: { id: true, losses: true, gamesPlayed: true },
    });
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit = 50, offset = 0) {
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

    return users.map((u, idx) => ({
      ...u,
      rank: offset + idx + 1,
      games_played: u.gamesPlayed,
    }));
  }

  /**
   * Get user's rank
   */
  static async getRank(userId) {
    // rank = 1 + number of users with higher elo (gamesPlayed > 0)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { elo: true },
    });
    if (!user) return null;

    const higher = await prisma.user.count({
      where: {
        gamesPlayed: { gt: 0 },
        elo: { gt: user.elo },
      },
    });
    return higher + 1;
  }
}

export default User;
