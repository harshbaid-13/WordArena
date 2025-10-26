'use client'

import { useEffect, useCallback, useRef } from 'react'
import { getSocket, connectSocket } from '@/lib/socket'
import { useUserStore } from '@/stores/userStore'
import { useGameStore, GAME_STATUS } from '@/stores/gameStore'

// Module-level flag to ensure listeners are only set up once globally
let globalListenersSetup = false

export function useSocket() {
  const { user, token } = useUserStore()

  // Connect socket on mount
  useEffect(() => {
    if (!user || !token) return

    const socket = connectSocket(token, user)

    // Only set up listeners once globally (not per component instance)
    if (!globalListenersSetup) {
      globalListenersSetup = true

      // Matchmaking events
      socket.on('matchmaking:searching', () => {
        useGameStore.getState().setStatus(GAME_STATUS.SEARCHING)
      })

      socket.on('matchmaking:cancelled', () => {
        useGameStore.getState().setStatus(GAME_STATUS.IDLE)
      })

      // Game events
      socket.on('game:start', (data) => {
        console.log('game:start received:', data)
        useGameStore.getState().startGame(data.gameId, data.opponent)
      })

      socket.on('game:guess:result', (data) => {
        useGameStore.getState().addGuessResult(data)
      })

      socket.on('game:guess:invalid', (data) => {
        useGameStore.getState().setError(data.error)
      })

      socket.on('game:opponent:guess', (data) => {
        useGameStore.getState().addOpponentGuess(data)
      })

      socket.on('game:end', (data) => {
        const { endGame } = useGameStore.getState()
        endGame(data.result, data.targetWord, data.eloChange, data.newElo)
      })

      socket.on('error', (data) => {
        useGameStore.getState().setError(data.message)
      })

      // Handle reconnection - rejoin game if we have an active gameId
      socket.on('connect', () => {
        const { gameId, status } = useGameStore.getState()
        if (gameId && status === GAME_STATUS.PLAYING) {
          console.log('Reconnected, rejoining game:', gameId)
          socket.emit('game:rejoin', { gameId })
        }
      })

      // Handle game rejoin response
      socket.on('game:rejoined', (data) => {
        console.log('Game rejoined:', data)
        
        // Rebuild letter states from guesses
        const letterStates = {}
        if (data.guesses) {
          data.guesses.forEach(guess => {
            guess.word.split('').forEach((letter, i) => {
              const color = guess.colors[i]
              const currentState = letterStates[letter]
              
              if (color === 'green') {
                letterStates[letter] = 'green'
              } else if (color === 'yellow' && currentState !== 'green') {
                letterStates[letter] = 'yellow'
              } else if (!currentState) {
                letterStates[letter] = 'grey'
              }
            })
          })
        }
        
        // Sync full game state from server
        useGameStore.setState({
          status: GAME_STATUS.PLAYING,
          gameId: data.gameId,
          opponent: data.opponent,
          guesses: data.guesses || [],
          opponentProgress: data.opponentProgress || [],
          letterStates,
          currentGuess: ''
        })
      })

      // Handle case where game no longer exists
      socket.on('game:notfound', () => {
        console.log('Game not found, resetting')
        useGameStore.getState().resetGame()
      })
    }

    // No cleanup - keep socket alive during gameplay
  }, [user?.id, token]) // Only re-run if user ID or token changes

  // Start matchmaking
  const startMatchmaking = useCallback(() => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('matchmaking:start', user)
    }
  }, [user])

  // Cancel matchmaking
  const cancelMatchmaking = useCallback(() => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('matchmaking:cancel')
    }
  }, [])

  // Submit guess
  const submitGuess = useCallback((guess) => {
    const socket = getSocket()
    const { gameId } = useGameStore.getState()
    
    if (socket.connected && gameId) {
      socket.emit('game:guess', { gameId, guess })
    }
  }, [])

  // Forfeit game
  const forfeitGame = useCallback(() => {
    const socket = getSocket()
    const { gameId } = useGameStore.getState()
    
    if (socket.connected && gameId) {
      socket.emit('game:forfeit', { gameId })
    }
  }, [])

  return {
    startMatchmaking,
    cancelMatchmaking,
    submitGuess,
    forfeitGame
  }
}


