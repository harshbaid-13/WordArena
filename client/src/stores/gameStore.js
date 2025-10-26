import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const GAME_STATUS = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  PLAYING: 'playing',
  FINISHED: 'finished'
}

export const useGameStore = create(
  persist(
    (set, get) => ({
  // Game state
  status: GAME_STATUS.IDLE,
  gameId: null,
  opponent: null,
  
  // Board state
  guesses: [],
  currentGuess: '',
  opponentProgress: [],
  
  // Result
  result: null, // 'win', 'loss', 'draw'
  targetWord: null,
  eloChange: 0,
  newElo: null,
  
  // Keyboard tracking
  letterStates: {}, // { A: 'green', B: 'yellow', C: 'grey' }
  
  // Error state
  error: null,

  // Actions
  setStatus: (status) => set({ status }),
  
  startSearching: () => set({ 
    status: GAME_STATUS.SEARCHING,
    guesses: [],
    currentGuess: '',
    opponentProgress: [],
    result: null,
    targetWord: null,
    error: null,
    letterStates: {}
  }),

  cancelSearch: () => set({ status: GAME_STATUS.IDLE }),

  startGame: (gameId, opponent) => set({
    status: GAME_STATUS.PLAYING,
    gameId,
    opponent,
    guesses: [],
    currentGuess: '',
    opponentProgress: [],
    result: null,
    letterStates: {}
  }),

  // Input handling
  addLetter: (letter) => {
    const { currentGuess, status } = get()
    if (status !== GAME_STATUS.PLAYING) return
    if (currentGuess.length >= 5) return
    set({ currentGuess: currentGuess + letter.toUpperCase() })
  },

  removeLetter: () => {
    const { currentGuess, status } = get()
    if (status !== GAME_STATUS.PLAYING) return
    set({ currentGuess: currentGuess.slice(0, -1) })
  },

  clearCurrentGuess: () => set({ currentGuess: '' }),

  // Process guess result from server
  addGuessResult: (guessResult) => {
    const { guesses, letterStates } = get()
    
    // Update letter states for keyboard
    const newLetterStates = { ...letterStates }
    guessResult.word.split('').forEach((letter, i) => {
      const color = guessResult.colors[i]
      const currentState = newLetterStates[letter]
      
      // Green overrides all, yellow overrides grey
      if (color === 'green') {
        newLetterStates[letter] = 'green'
      } else if (color === 'yellow' && currentState !== 'green') {
        newLetterStates[letter] = 'yellow'
      } else if (!currentState) {
        newLetterStates[letter] = 'grey'
      }
    })

    set({
      guesses: [...guesses, guessResult],
      currentGuess: '',
      letterStates: newLetterStates
    })
  },

  // Process opponent's guess (masked)
  addOpponentGuess: (opponentGuess) => {
    const { opponentProgress } = get()
    set({ opponentProgress: [...opponentProgress, opponentGuess] })
  },

  // Game end
  endGame: (result, targetWord, eloChange, newElo) => set({
    status: GAME_STATUS.FINISHED,
    result,
    targetWord,
    eloChange,
    newElo
  }),

  // Set error
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Reset game
  resetGame: () => set({
    status: GAME_STATUS.IDLE,
    gameId: null,
    opponent: null,
    guesses: [],
    currentGuess: '',
    opponentProgress: [],
    result: null,
    targetWord: null,
    eloChange: 0,
    newElo: null,
    letterStates: {},
    error: null
  })
}),
    {
      name: 'wordarena-game',
      // Persist game state for reconnection
      partialize: (state) => ({
        status: state.status,
        gameId: state.gameId,
        opponent: state.opponent,
        guesses: state.guesses,
        opponentProgress: state.opponentProgress,
        letterStates: state.letterStates,
        result: state.result,
        targetWord: state.targetWord,
        eloChange: state.eloChange,
        newElo: state.newElo
      })
    }
  )
)


