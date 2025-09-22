import Redis from "ioredis";

let redis = null;

export async function initializeRedis() {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
  });

  await redis.connect();
  await redis.ping();
  return redis;
}

export function getRedis() {
  if (!redis) {
    throw new Error("Redis not initialized. Call initializeRedis() first.");
  }
  return redis;
}

// ============================================
// Game State Operations
// ============================================

/**
 * Store game state in Redis
 */
export async function setGameState(gameId, state, ttlSeconds = 3600) {
  const redis = getRedis();
  await redis.setex(`game:${gameId}`, ttlSeconds, JSON.stringify(state));
}

/**
 * Get game state from Redis
 */
export async function getGameState(gameId) {
  const redis = getRedis();
  const data = await redis.get(`game:${gameId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete game state
 */
export async function deleteGameState(gameId) {
  const redis = getRedis();
  await redis.del(`game:${gameId}`);
}

// ============================================
// Win Lock Operations (Concurrency Control)
// ============================================

/**
 * Attempt to acquire win lock for a game
 * Returns true if lock acquired, false if someone else won
 */
export async function acquireWinLock(gameId, playerId) {
  const redis = getRedis();
  const lockKey = `game:${gameId}:winner`;
  const result = await redis.set(
    lockKey,
    JSON.stringify({
      playerId,
      timestamp: Date.now(),
    }),
    "NX",
    "EX",
    60
  );
  return result === "OK";
}

/**
 * Get winner info if exists
 */
export async function getWinner(gameId) {
  const redis = getRedis();
  const data = await redis.get(`game:${gameId}:winner`);
  return data ? JSON.parse(data) : null;
}

// ============================================
// Matchmaking Queue Operations
// ============================================

/**
 * Add player to matchmaking queue
 */
export async function addToMatchmakingQueue(playerId, elo, socketId) {
  const redis = getRedis();
  const queueData = JSON.stringify({
    playerId,
    elo,
    socketId,
    timestamp: Date.now(),
  });
  await redis.zadd("matchmaking:queue", elo, queueData);
  await redis.setex(`matchmaking:player:${playerId}`, 30, queueData);
}

/**
 * Remove player from matchmaking queue
 */
export async function removeFromMatchmakingQueue(playerId) {
  const redis = getRedis();
  const playerData = await redis.get(`matchmaking:player:${playerId}`);
  if (playerData) {
    await redis.zrem("matchmaking:queue", playerData);
    await redis.del(`matchmaking:player:${playerId}`);
  }
}

/**
 * Find match within ELO range
 */
export async function findMatch(playerId, elo, range = 100) {
  const redis = getRedis();
  const candidates = await redis.zrangebyscore(
    "matchmaking:queue",
    elo - range,
    elo + range
  );

  for (const candidate of candidates) {
    const data = JSON.parse(candidate);
    if (data.playerId !== playerId) {
      return data;
    }
  }

  return null;
}
