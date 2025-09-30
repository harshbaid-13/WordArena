/**
 * WordService - Dictionary Management
 * 
 * Handles loading and accessing the word dictionaries:
 * - answers.json: Target words that can be solutions (~2300 words)
 * - valid_guesses.json: All valid guesses including answers (~12000 words)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WordService {
  static answers = [];
  static validGuesses = new Set();
  static initialized = false;

  /**
   * Initialize the word dictionaries
   * Call this once on server startup
   */
  static async initialize() {
    if (this.initialized) return;

    const dataDir = path.join(__dirname, '../data');

    try {
      // Load answer words
      const answersPath = path.join(dataDir, 'answers.json');
      const answersData = await fs.readFile(answersPath, 'utf-8');
      this.answers = JSON.parse(answersData).map(w => w.toUpperCase());

      // Load valid guesses
      const guessesPath = path.join(dataDir, 'valid_guesses.json');
      const guessesData = await fs.readFile(guessesPath, 'utf-8');
      const guesses = JSON.parse(guessesData).map(w => w.toUpperCase());
      
      // Valid guesses includes all answers + additional valid words
      this.validGuesses = new Set([...guesses, ...this.answers]);
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load word dictionaries:', error);
      throw error;
    }
  }

  /**
   * Get a random target word for a game
   * @returns {string} Random answer word (uppercase)
   */
  static getRandomAnswer() {
    if (!this.initialized) {
      throw new Error('WordService not initialized');
    }
    const index = Math.floor(Math.random() * this.answers.length);
    return this.answers[index];
  }

  /**
   * Check if a guess is valid
   * @param {string} word - The word to validate
   * @returns {boolean} True if word is in valid guesses list
   */
  static isValidGuess(word) {
    if (!this.initialized) {
      throw new Error('WordService not initialized');
    }
    return this.validGuesses.has(word.toUpperCase());
  }

  /**
   * Check if a word is a valid answer
   * @param {string} word - The word to check
   * @returns {boolean} True if word can be a target answer
   */
  static isValidAnswer(word) {
    if (!this.initialized) {
      throw new Error('WordService not initialized');
    }
    return this.answers.includes(word.toUpperCase());
  }

  /**
   * Evaluate a guess against the target word
   * Returns color pattern: 'green', 'yellow', 'grey'
   * 
   * @param {string} guess - The guessed word
   * @param {string} target - The target word
   * @returns {Array<{letter: string, color: string}>} Color pattern
   * 
   * @example
   * evaluateGuess('CRANE', 'REACT')
   * // Returns: [
   * //   { letter: 'C', color: 'yellow' },
   * //   { letter: 'R', color: 'yellow' },
   * //   { letter: 'A', color: 'yellow' },
   * //   { letter: 'N', color: 'grey' },
   * //   { letter: 'E', color: 'yellow' }
   * // ]
   */
  static evaluateGuess(guess, target) {
    guess = guess.toUpperCase();
    target = target.toUpperCase();
    
    const result = new Array(5).fill(null);
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    
    // Track which target letters have been matched
    const matched = new Array(5).fill(false);
    
    // First pass: Mark greens (exact matches)
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = { letter: guessLetters[i], color: 'green' };
        matched[i] = true;
      }
    }
    
    // Second pass: Mark yellows and greys
    for (let i = 0; i < 5; i++) {
      if (result[i]) continue; // Already marked green
      
      // Look for unmatched occurrence of this letter in target
      let found = false;
      for (let j = 0; j < 5; j++) {
        if (!matched[j] && guessLetters[i] === targetLetters[j]) {
          result[i] = { letter: guessLetters[i], color: 'yellow' };
          matched[j] = true;
          found = true;
          break;
        }
      }
      
      if (!found) {
        result[i] = { letter: guessLetters[i], color: 'grey' };
      }
    }
    
    return result;
  }

  /**
   * Check if a guess is the correct answer
   * @param {string} guess - The guessed word
   * @param {string} target - The target word
   * @returns {boolean} True if guess matches target
   */
  static isCorrectGuess(guess, target) {
    return guess.toUpperCase() === target.toUpperCase();
  }

  /**
   * Get all possible answers (for bot calculations)
   * @returns {Array<string>} All answer words
   */
  static getAllAnswers() {
    return [...this.answers];
  }

  /**
   * Get all valid guesses (for bot calculations)
   * @returns {Array<string>} All valid guess words
   */
  static getAllValidGuesses() {
    return [...this.validGuesses];
  }

  /**
   * Get count of answer words
   */
  static getAnswerCount() {
    return this.answers.length;
  }

  /**
   * Get count of valid guesses
   */
  static getValidGuessCount() {
    return this.validGuesses.size;
  }
}

export default WordService;


