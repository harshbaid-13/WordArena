/**
 * Application Constants
 */

export const CONSTANTS = {
  // Game settings
  WORD_LENGTH: 5,
  MAX_GUESSES: 6,
  
  // ELO settings
  DEFAULT_ELO: 1200,
  MIN_ELO: 100,
  K_FACTOR: 32,
  
  // Matchmaking
  MATCHMAKING_TIMEOUT_MS: 15000,
  INITIAL_ELO_RANGE: 100,
  MAX_ELO_RANGE: 400,
  
  // Bot settings
  BOT_DELAY_MIN_MS: 1000,
  BOT_DELAY_MAX_MS: 3000,
  
  BOT_DIFFICULTIES: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    IMPOSSIBLE: 'impossible'
  },
  
  // Game states
  GAME_STATES: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    FINISHED: 'finished'
  },
  
  // Tile colors
  COLORS: {
    GREEN: 'green',
    YELLOW: 'yellow',
    GREY: 'grey'
  },
  
  // Redis key prefixes
  REDIS_KEYS: {
    GAME: 'game:',
    WINNER: 'game:winner:',
    MATCHMAKING_QUEUE: 'matchmaking:queue',
    MATCHMAKING_PLAYER: 'matchmaking:player:'
  },
  
  // JWT settings
  JWT_EXPIRES_IN: '7d',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

export default CONSTANTS;


