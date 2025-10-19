/**
 * BotService - AI Bot Engine using Shannon Entropy Maximization
 *
 * Implements an information-theoretic approach to Wordle:
 * - Calculates Expected Information (entropy) for each possible guess
 * - Selects guesses that maximize information gain
 * - Supports multiple difficulty levels
 *
 * Mathematical Foundation:
 * H(X) = -Σ P(x) * log₂(P(x))
 *
 * For each guess, we calculate the expected entropy (information gain)
 * by considering all possible color patterns and their probabilities.
 */

import WordService from "./WordService.js";

class BotService {
  /**
   * Pre-computed optimal first guesses (saves CPU on game start)
   * These are calculated offline using full entropy analysis
   */
  static OPTIMAL_FIRST_GUESSES = ["SALET", "CRANE", "SLATE", "TRACE", "CRATE"];

  /**
   * Common words filter for Medium difficulty
   * These are more frequently used words that humans would likely guess
   */
  static COMMON_WORDS = new Set([
    "ABOUT",
    "ABOVE",
    "ABUSE",
    "ACTOR",
    "ACUTE",
    "ADMIT",
    "ADOPT",
    "ADULT",
    "AFTER",
    "AGAIN",
    "AGENT",
    "AGREE",
    "AHEAD",
    "ALARM",
    "ALBUM",
    "ALERT",
    "ALIKE",
    "ALIVE",
    "ALLOW",
    "ALONE",
    "ALONG",
    "ALTER",
    "AMONG",
    "ANGER",
    "ANGLE",
    "ANGRY",
    "APART",
    "APPLE",
    "APPLY",
    "ARENA",
    "ARGUE",
    "ARISE",
    "ARMED",
    "ARMOR",
    "ARRAY",
    "ASIDE",
    "ASSET",
    "AVOID",
    "AWARD",
    "AWARE",
    "BADLY",
    "BAKER",
    "BASES",
    "BASIC",
    "BASIN",
    "BASIS",
    "BEACH",
    "BEGAN",
    "BEGIN",
    "BEGUN",
    "BEING",
    "BELOW",
    "BENCH",
    "BIBLE",
    "BIRTH",
    "BLACK",
    "BLADE",
    "BLAME",
    "BLANK",
    "BLAST",
    "BLEND",
    "BLESS",
    "BLIND",
    "BLOCK",
    "BLOOD",
    "BLOOM",
    "BLOWN",
    "BOARD",
    "BOOST",
    "BOOTH",
    "BOUND",
    "BRAIN",
    "BRAND",
    "BREAD",
    "BREAK",
    "BREED",
    "BRICK",
    "BRIDE",
    "BRIEF",
    "BRING",
    "BROAD",
    "BROKE",
    "BROWN",
    "BUILD",
    "BUILT",
    "BUNCH",
    "BURST",
    "BUYER",
    "CABLE",
    "CANDY",
    "CARRY",
    "CATCH",
    "CAUSE",
    "CHAIN",
    "CHAIR",
    "CHAOS",
    "CHARM",
    "CHART",
    "CHASE",
    "CHEAP",
    "CHECK",
    "CHEST",
    "CHIEF",
    "CHILD",
    "CHINA",
    "CHOSE",
    "CIVIL",
    "CLAIM",
    "CLASS",
    "CLEAN",
    "CLEAR",
    "CLIMB",
    "CLOCK",
    "CLOSE",
    "CLOTH",
    "CLOUD",
    "COACH",
    "COAST",
    "COULD",
    "COUNT",
    "COURT",
    "COVER",
    "CRAFT",
    "CRASH",
    "CRAZY",
    "CREAM",
    "CRIME",
    "CROSS",
    "CROWD",
    "CROWN",
    "CURVE",
    "CYCLE",
    "DAILY",
    "DANCE",
    "DATED",
    "DEALT",
    "DEATH",
    "DEBUT",
    "DELAY",
    "DEPTH",
    "DOING",
    "DOUBT",
    "DOZEN",
    "DRAFT",
    "DRAIN",
    "DRAMA",
    "DRANK",
    "DRAWN",
    "DREAM",
    "DRESS",
    "DRIED",
    "DRINK",
    "DRIVE",
    "DROVE",
    "DYING",
    "EAGER",
    "EARLY",
    "EARTH",
    "EIGHT",
    "ELITE",
    "EMPTY",
    "ENEMY",
    "ENJOY",
    "ENTER",
    "ENTRY",
    "EQUAL",
    "ERROR",
    "EVENT",
    "EVERY",
    "EXACT",
    "EXIST",
    "EXTRA",
    "FAITH",
    "FALSE",
    "FAULT",
    "FAVOR",
    "FENCE",
    "FEVER",
    "FIBER",
    "FIELD",
    "FIFTH",
    "FIFTY",
    "FIGHT",
    "FINAL",
    "FIRST",
    "FIXED",
    "FLASH",
    "FLEET",
    "FLESH",
    "FLOAT",
    "FLOOD",
    "FLOOR",
    "FLOUR",
    "FLUID",
    "FOCUS",
    "FORCE",
    "FORGE",
    "FORTH",
    "FORTY",
    "FORUM",
    "FOUND",
    "FRAME",
    "FRANK",
    "FRAUD",
    "FRESH",
    "FRONT",
    "FRUIT",
    "FULLY",
    "FUNNY",
    "GIANT",
    "GIVEN",
    "GLASS",
    "GLOBE",
    "GLORY",
    "GOING",
    "GRACE",
    "GRADE",
    "GRAIN",
    "GRAND",
    "GRANT",
    "GRAPE",
    "GRASP",
    "GRASS",
    "GRAVE",
    "GREAT",
    "GREEN",
    "GREET",
    "GRIEF",
    "GRILL",
    "GROSS",
    "GROUP",
    "GROVE",
    "GROWN",
    "GUARD",
    "GUESS",
    "GUEST",
    "GUIDE",
    "GUILT",
    "HAPPY",
    "HARSH",
    "HEART",
    "HEAVY",
    "HENCE",
    "HERO",
    "HORSE",
    "HOTEL",
    "HOUSE",
    "HUMAN",
    "IDEAL",
    "IMAGE",
    "IMPLY",
    "INDEX",
    "INNER",
    "INPUT",
    "ISSUE",
    "JOINT",
    "JONES",
    "JUDGE",
    "JUICE",
    "KNOWN",
    "LABEL",
    "LABOR",
    "LARGE",
    "LASER",
    "LATER",
    "LAUGH",
    "LAYER",
    "LEARN",
    "LEASE",
    "LEAST",
    "LEAVE",
    "LEGAL",
    "LEMON",
    "LEVEL",
    "LIGHT",
    "LIMIT",
    "LINUX",
    "LIVER",
    "LIVING",
    "LOCAL",
    "LODGE",
    "LOGIC",
    "LOOSE",
    "LORRY",
    "LOSER",
    "LOWER",
    "LUCKY",
    "LUNCH",
    "LYING",
    "MAGIC",
    "MAJOR",
    "MAKER",
    "MARCH",
    "MARRY",
    "MATCH",
    "MAYOR",
    "MEANT",
    "MEDAL",
    "MEDIA",
    "MERCY",
    "MERGE",
    "MERIT",
    "METAL",
    "METER",
    "MIGHT",
    "MINOR",
    "MINUS",
    "MIXED",
    "MODEL",
    "MONEY",
    "MONTH",
    "MORAL",
    "MOTOR",
    "MOUNT",
    "MOUSE",
    "MOUTH",
    "MOVED",
    "MOVIE",
    "MUSIC",
    "NAKED",
    "NEEDS",
    "NERVE",
    "NEVER",
    "NEWER",
    "NIGHT",
    "NOISE",
    "NORTH",
    "NOTED",
    "NOVEL",
    "NURSE",
    "OCCUR",
    "OCEAN",
    "OFFER",
    "OFTEN",
    "OLIVE",
    "ONION",
    "OPERA",
    "ORBIT",
    "ORDER",
    "ORGAN",
    "OTHER",
    "OUGHT",
    "OUTER",
    "OWNED",
    "OWNER",
    "OXIDE",
    "OZONE",
    "PAINT",
    "PANEL",
    "PANIC",
    "PAPER",
    "PARTY",
    "PASTA",
    "PATCH",
    "PAUSE",
    "PEACE",
    "PEARL",
    "PENNY",
    "PHASE",
    "PHONE",
    "PHOTO",
    "PIANO",
    "PIECE",
    "PILOT",
    "PINCH",
    "PITCH",
    "PLACE",
    "PLAIN",
    "PLANE",
    "PLANT",
    "PLATE",
    "PLAZA",
    "POINT",
    "POLAR",
    "POUND",
    "POWER",
    "PRESS",
    "PRICE",
    "PRIDE",
    "PRIME",
    "PRINT",
    "PRIOR",
    "PRIZE",
    "PROBE",
    "PROOF",
    "PROUD",
    "PROVE",
    "PUNCH",
    "PUPIL",
    "QUEEN",
    "QUEST",
    "QUICK",
    "QUIET",
    "QUITE",
    "QUOTA",
    "QUOTE",
    "RADAR",
    "RADIO",
    "RAISE",
    "RANCH",
    "RANGE",
    "RAPID",
    "RATIO",
    "REACH",
    "REACT",
    "READY",
    "REALM",
    "REBEL",
    "REFER",
    "REIGN",
    "RELAX",
    "REPLY",
    "RIDER",
    "RIDGE",
    "RIFLE",
    "RIGHT",
    "RIGID",
    "RISKY",
    "RIVAL",
    "RIVER",
    "ROBOT",
    "ROCKY",
    "ROMAN",
    "ROUGH",
    "ROUND",
    "ROUTE",
    "ROYAL",
    "RUGBY",
    "RULER",
    "RURAL",
    "SADLY",
    "SAINT",
    "SALAD",
    "SALES",
    "SANDY",
    "SAUCE",
    "SAVED",
    "SCALE",
    "SCENE",
    "SCOPE",
    "SCORE",
    "SENSE",
    "SERVE",
    "SEVEN",
    "SHADE",
    "SHAKE",
    "SHALL",
    "SHAME",
    "SHAPE",
    "SHARE",
    "SHARP",
    "SHEEP",
    "SHEER",
    "SHEET",
    "SHELF",
    "SHELL",
    "SHIFT",
    "SHINE",
    "SHIRT",
    "SHOCK",
    "SHOOT",
    "SHORE",
    "SHORT",
    "SHOT",
    "SHOUT",
    "SHOWN",
    "SIGHT",
    "SIGMA",
    "SILLY",
    "SINCE",
    "SIXTH",
    "SIXTY",
    "SIZED",
    "SKILL",
    "SKIRT",
    "SLAVE",
    "SLEEP",
    "SLICE",
    "SLIDE",
    "SLOPE",
    "SMALL",
    "SMART",
    "SMELL",
    "SMILE",
    "SMITH",
    "SMOKE",
    "SNAKE",
    "SOLID",
    "SOLVE",
    "SORRY",
    "SOUND",
    "SOUTH",
    "SPACE",
    "SPARE",
    "SPARK",
    "SPEAK",
    "SPEED",
    "SPELL",
    "SPEND",
    "SPENT",
    "SPICE",
    "SPINE",
    "SPLIT",
    "SPOKE",
    "SPORT",
    "SPRAY",
    "SQUAD",
    "STACK",
    "STAFF",
    "STAGE",
    "STAKE",
    "STAMP",
    "STAND",
    "STARK",
    "START",
    "STATE",
    "STEAM",
    "STEEL",
    "STEEP",
    "STEER",
    "STICK",
    "STILL",
    "STOCK",
    "STONE",
    "STOOD",
    "STORE",
    "STORM",
    "STORY",
    "STRAP",
    "STRAW",
    "STRIP",
    "STUCK",
    "STUDY",
    "STUFF",
    "STYLE",
    "SUGAR",
    "SUITE",
    "SUNNY",
    "SUPER",
    "SURGE",
    "SWEET",
    "SWEPT",
    "SWIFT",
    "SWING",
    "SWISS",
    "SWORD",
    "TABLE",
    "TAKEN",
    "TASTE",
    "TAXES",
    "TEACH",
    "TEETH",
    "TEMPO",
    "TENDS",
    "TENOR",
    "TENSE",
    "TENTH",
    "TERMS",
    "TERRY",
    "TEXAS",
    "THANK",
    "THEFT",
    "THEIR",
    "THEME",
    "THERE",
    "THESE",
    "THICK",
    "THING",
    "THINK",
    "THIRD",
    "THOSE",
    "THREE",
    "THREW",
    "THROW",
    "THUMB",
    "TIGER",
    "TIGHT",
    "TIRED",
    "TITLE",
    "TODAY",
    "TOKEN",
    "TOPIC",
    "TOTAL",
    "TOUCH",
    "TOUGH",
    "TOWER",
    "TRACK",
    "TRADE",
    "TRAIL",
    "TRAIN",
    "TRAIT",
    "TRASH",
    "TREAT",
    "TREND",
    "TRIAL",
    "TRIBE",
    "TRICK",
    "TRIED",
    "TROOP",
    "TRUCK",
    "TRULY",
    "TRUNK",
    "TRUST",
    "TRUTH",
    "TUMOR",
    "TWICE",
    "ULTRA",
    "UNCLE",
    "UNDER",
    "UNION",
    "UNITE",
    "UNITY",
    "UNTIL",
    "UPPER",
    "UPSET",
    "URBAN",
    "USUAL",
    "VALID",
    "VALUE",
    "VIDEO",
    "VIRUS",
    "VISIT",
    "VITAL",
    "VOCAL",
    "VOICE",
    "VOTER",
    "WAGON",
    "WASTE",
    "WATCH",
    "WATER",
    "WEIGH",
    "WEIRD",
    "WHEAT",
    "WHEEL",
    "WHERE",
    "WHICH",
    "WHILE",
    "WHITE",
    "WHOLE",
    "WHOSE",
    "WOMAN",
    "WOMEN",
    "WORLD",
    "WORRY",
    "WORSE",
    "WORST",
    "WORTH",
    "WOULD",
    "WOUND",
    "WRITE",
    "WRONG",
    "WROTE",
    "YIELD",
    "YOUNG",
    "YOUTH",
    "ZEBRA",
    "ZONES",
  ]);

  /**
   * Difficulty configurations
   */
  static DIFFICULTIES = {
    impossible: {
      topN: 1,
      useCommonFilter: false,
      minSolveGuess: 1,
      delayMin: 10000,
      delayMax: 20000,
      noise: 0,
    },
    hard: {
      topN: 5,
      useCommonFilter: false,
      minSolveGuess: 2,
      delayMin: 18000,
      delayMax: 22000,
      noise: 0.05,
    },
    medium: {
      topN: 20,
      useCommonFilter: true,
      minSolveGuess: 3,
      delayMin: 22000,
      delayMax: 30000,
      noise: 0.1,
      wasteWordChance: 0.1,
    },
    easy: {
      topN: null, // Greedy/random
      useCommonFilter: true,
      minSolveGuess: 4,
      delayMin: 30000,
      delayMax: 35000,
      noise: 0.2,
      wasteWordChance: 0.2, // Sometimes burn a lettery word
    },
  };

  /**
   * Calculate color pattern for a guess against a target
   * Returns a pattern string like "GGYGG" for comparison
   *
   * @param {string} guess - The guessed word
   * @param {string} target - The target word
   * @returns {string} Pattern string (G=green, Y=yellow, X=grey)
   */
  static getPattern(guess, target) {
    const result = new Array(5).fill("X");
    const targetChars = target.split("");
    const guessChars = guess.split("");
    const matched = new Array(5).fill(false);

    // First pass: greens
    for (let i = 0; i < 5; i++) {
      if (guessChars[i] === targetChars[i]) {
        result[i] = "G";
        matched[i] = true;
      }
    }

    // Second pass: yellows
    for (let i = 0; i < 5; i++) {
      if (result[i] === "G") continue;
      for (let j = 0; j < 5; j++) {
        if (!matched[j] && guessChars[i] === targetChars[j]) {
          result[i] = "Y";
          matched[j] = true;
          break;
        }
      }
    }

    return result.join("");
  }

  /**
   * Check if a word matches the constraints from previous guesses
   *
   * @param {string} word - Word to check
   * @param {Array} constraints - Array of {guess, pattern} objects
   * @returns {boolean} True if word satisfies all constraints
   */
  static matchesConstraints(word, constraints) {
    for (const { guess, pattern } of constraints) {
      if (this.getPattern(guess, word) !== pattern) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter remaining possible answers based on constraints
   *
   * @param {Array<string>} possibleAnswers - Current possible answers
   * @param {Array} constraints - Previous guess constraints
   * @returns {Array<string>} Filtered possible answers
   */
  static filterPossibleAnswers(possibleAnswers, constraints) {
    return possibleAnswers.filter((word) =>
      this.matchesConstraints(word, constraints)
    );
  }

  /**
   * Calculate Shannon Entropy (Expected Information) for a guess
   *
   * H(X) = -Σ P(pattern) * log₂(P(pattern))
   *
   * Higher entropy = more information gain = better guess
   *
   * @param {string} guess - The word to evaluate
   * @param {Array<string>} possibleAnswers - Remaining possible answers
   * @returns {number} Entropy score (higher is better)
   */
  static calculateEntropy(guess, possibleAnswers) {
    if (possibleAnswers.length === 0) return 0;
    if (possibleAnswers.length === 1) return 0;

    // Count pattern frequencies
    const patternCounts = new Map();

    for (const answer of possibleAnswers) {
      const pattern = this.getPattern(guess, answer);
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }

    // Calculate entropy
    const total = possibleAnswers.length;
    let entropy = 0;

    for (const count of patternCounts.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Get the best guesses ranked by entropy
   *
   * @param {Array<string>} possibleAnswers - Remaining possible answers
   * @param {Array<string>} validGuesses - All valid guesses to consider
   * @param {number} topN - Number of top guesses to return
   * @returns {Array<{word: string, entropy: number}>} Top guesses with scores
   */
  static getBestGuessesByEntropy(
    possibleAnswers,
    validGuesses,
    topN = 10,
    noise = 0
  ) {
    const scores = [];

    for (const guess of validGuesses) {
      // Add small noise to make bots less robotic
      const entropy =
        this.calculateEntropy(guess, possibleAnswers) +
        (noise ? (Math.random() - 0.5) * noise : 0);
      scores.push({ word: guess, entropy });
    }

    // Sort by entropy descending
    scores.sort((a, b) => b.entropy - a.entropy);

    return scores.slice(0, topN);
  }

  /**
   * Select a guess based on difficulty level
   *
   * @param {string} difficulty - Bot difficulty level
   * @param {Array<string>} possibleAnswers - Remaining possible answers
   * @param {Array} constraints - Previous guess constraints
   * @param {number} guessNumber - Current guess number (1-6)
   * @returns {string} Selected guess word
   */
  static selectGuess(difficulty, possibleAnswers, constraints, guessNumber) {
    const config = this.DIFFICULTIES[difficulty] || this.DIFFICULTIES.medium;
    const allValidGuesses = WordService.getAllValidGuesses();

    // Filter to common words for easy/medium when requested
    let filteredAnswers = possibleAnswers;
    if (config.useCommonFilter) {
      filteredAnswers = possibleAnswers.filter((w) => this.COMMON_WORDS.has(w));
      // Fallback to originals if filter became empty
      if (filteredAnswers.length === 0) {
        filteredAnswers = possibleAnswers;
      }
    }

    // First guess optimization: use pre-computed optimal starter
    if (guessNumber === 1 && constraints.length === 0) {
      if (difficulty === "easy") {
        // Easy bot picks random common word
        const commonArray = Array.from(this.COMMON_WORDS);
        return commonArray[Math.floor(Math.random() * commonArray.length)];
      }
      // Other difficulties use optimal first guess
      return this.OPTIMAL_FIRST_GUESSES[
        Math.floor(Math.random() * this.OPTIMAL_FIRST_GUESSES.length)
      ];
    }

    // If only one answer remains, guess it
    if (filteredAnswers.length === 1) {
      // Respect minimum solve guess: if too early, burn a waste word
      if (guessNumber < config.minSolveGuess) {
        return this.chooseWasteWord(
          allValidGuesses,
          constraints,
          config.useCommonFilter
        );
      }
      return filteredAnswers[0];
    }

    // If two answers remain, pick one randomly
    if (filteredAnswers.length === 2) {
      if (guessNumber < config.minSolveGuess) {
        return this.chooseWasteWord(
          allValidGuesses,
          constraints,
          config.useCommonFilter
        );
      }
      return filteredAnswers[Math.floor(Math.random() * 2)];
    }

    // EASY mode: Greedy - pick random word that fits constraints
    if (difficulty === "easy" || config.topN === null) {
      const pool = filteredAnswers.length ? filteredAnswers : possibleAnswers;
      let guess = pool[Math.floor(Math.random() * pool.length)];

      // Occasionally pick a waste / non-optimal word to feel human
      if (config.wasteWordChance && Math.random() < config.wasteWordChance) {
        guess = this.chooseWasteWord(allValidGuesses, constraints, true);
      }

      // Respect minimum solve guess
      if (guessNumber < config.minSolveGuess) {
        guess = this.chooseWasteWord(allValidGuesses, constraints, true);
      }

      return guess;
    }

    // Calculate entropy for remaining guesses
    // For efficiency, only consider possible answers + some valid guesses
    let candidates = [...filteredAnswers];

    // Add some random valid guesses for diversity (helps find better patterns)
    const sampleSize = Math.min(500, allValidGuesses.length);
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * allValidGuesses.length);
      if (!candidates.includes(allValidGuesses[idx])) {
        candidates.push(allValidGuesses[idx]);
      }
    }

    // Get top guesses by entropy
    const topGuesses = this.getBestGuessesByEntropy(
      filteredAnswers,
      candidates,
      config.topN,
      config.noise
    );

    // Apply common word filter for medium difficulty
    if (config.useCommonFilter) {
      const commonMatches = topGuesses.filter((g) =>
        this.COMMON_WORDS.has(g.word)
      );
      if (commonMatches.length > 0) {
        return commonMatches[Math.floor(Math.random() * commonMatches.length)]
          .word;
      }
    }

    // Pick randomly from top N for hard, or best for impossible
    if (difficulty === "impossible") {
      return topGuesses[0].word;
    }

    let guess = topGuesses[Math.floor(Math.random() * topGuesses.length)].word;

    // Occasionally pick a waste / non-optimal word for medium
    if (config.wasteWordChance && Math.random() < config.wasteWordChance) {
      guess = this.chooseWasteWord(
        allValidGuesses,
        constraints,
        config.useCommonFilter
      );
    }

    // Respect minimum solve guess
    if (guessNumber < config.minSolveGuess && filteredAnswers.includes(guess)) {
      guess = this.chooseWasteWord(
        allValidGuesses,
        constraints,
        config.useCommonFilter
      );
    }

    return guess;
  }

  /**
   * Pick a "waste" word to look more human (diverse letters, still fits constraints)
   */
  static chooseWasteWord(validGuesses, constraints, useCommonFilter = false) {
    let pool = useCommonFilter
      ? validGuesses.filter((w) => this.COMMON_WORDS.has(w))
      : [...validGuesses];

    // Keep words that still satisfy constraints so we don't break logic
    pool = this.filterPossibleAnswers(pool, constraints);
    if (pool.length === 0) {
      pool = validGuesses;
    }

    // Prefer words with many unique letters to gather info
    pool.sort((a, b) => {
      const ua = new Set(a).size;
      const ub = new Set(b).size;
      return ub - ua;
    });

    const top = pool.slice(0, Math.min(50, pool.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  /**
   * Create a bot player instance for a game
   *
   * @param {string} difficulty - Bot difficulty level
   * @param {string} targetWord - The target word (bot doesn't know this directly)
   * @returns {Object} Bot instance
   */
  static createBotInstance(difficulty, targetWord) {
    return {
      difficulty,
      targetWord,
      possibleAnswers: WordService.getAllAnswers(),
      constraints: [],
      guessCount: 0,
    };
  }

  /**
   * Get bot's next guess
   *
   * @param {Object} botInstance - Bot instance from createBotInstance
   * @returns {Promise<{guess: string, delayMs: number}>} Guess with artificial delay
   */
  static async getNextGuess(botInstance) {
    const { difficulty, possibleAnswers, constraints, guessCount } =
      botInstance;
    const config = this.DIFFICULTIES[difficulty] || this.DIFFICULTIES.medium;

    // Select the guess
    const guess = this.selectGuess(
      difficulty,
      possibleAnswers,
      constraints,
      guessCount + 1
    );

    // Calculate artificial delay to seem human (per difficulty)
    const delayMs = Math.floor(
      Math.random() * (config.delayMax - config.delayMin) + config.delayMin
    );

    return { guess, delayMs };
  }

  /**
   * Update bot state after a guess result
   *
   * @param {Object} botInstance - Bot instance
   * @param {string} guess - The guess made
   * @param {string} pattern - The pattern received (GGGGG, GXYYX, etc.)
   */
  static updateBotState(botInstance, guess, pattern) {
    botInstance.constraints.push({ guess, pattern });
    botInstance.guessCount++;
    botInstance.possibleAnswers = this.filterPossibleAnswers(
      botInstance.possibleAnswers,
      botInstance.constraints
    );
  }

  /**
   * Simulate a full bot game (for testing)
   *
   * @param {string} targetWord - The word to guess
   * @param {string} difficulty - Bot difficulty
   * @returns {Array<{guess: string, pattern: string}>} Guess history
   */
  static simulateGame(targetWord, difficulty = "hard") {
    const botInstance = this.createBotInstance(difficulty, targetWord);
    const history = [];

    for (let i = 0; i < 6; i++) {
      const guess = this.selectGuess(
        difficulty,
        botInstance.possibleAnswers,
        botInstance.constraints,
        i + 1
      );

      const pattern = this.getPattern(guess, targetWord);
      history.push({ guess, pattern });

      if (pattern === "GGGGG") break;

      this.updateBotState(botInstance, guess, pattern);
    }

    return history;
  }
}

export default BotService;
