'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '@/stores/userStore'
import { useGameStore, GAME_STATUS } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'
import { Board } from '@/components/game/Board'
import { OpponentBoard } from '@/components/game/OpponentBoard'
import { Keyboard } from '@/components/game/Keyboard'

export default function PlayPage() {
  const router = useRouter()
  const { user } = useUserStore()
  const { 
    status, 
    opponent, 
    result, 
    targetWord, 
    eloChange, 
    newElo,
    error,
    clearError,
    resetGame 
  } = useGameStore()
  const { submitGuess, forfeitGame } = useSocket()
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for hydration before making routing decisions
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Redirect if not in a game (but only after hydration)
  useEffect(() => {
    if (isHydrated && status === GAME_STATUS.IDLE) {
      router.push('/lobby')
    }
  }, [isHydrated, status, router])

  const handlePlayAgain = () => {
    resetGame()
    router.push('/lobby')
  }

  // Show loading while hydrating or if we're in an unknown state
  if (!isHydrated || (status === GAME_STATUS.IDLE && !isHydrated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-arena-accent animate-pulse">
          Loading game...
        </div>
      </div>
    )
  }

  // Only return null after hydration confirms we have no game
  if (isHydrated && status === GAME_STATUS.IDLE) return null

  return (
    <main className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            <span className="font-bold text-white">{user?.username}</span>
            <span className="ml-2 text-arena-accent font-mono">{user?.elo}</span>
          </div>
        </div>
        
        <h1 className="text-xl font-bold">WordArena</h1>
        
        <div className="flex items-center gap-4">
          {status === GAME_STATUS.PLAYING && (
            <button
              onClick={forfeitGame}
              className="text-sm text-gray-500 hover:text-arena-error transition-colors"
            >
              Forfeit
            </button>
          )}
        </div>
      </header>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-arena-error/90 text-white px-6 py-3 rounded-lg font-medium z-50"
            onClick={clearError}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game area */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        {/* Player's board */}
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-400 mb-4 font-medium">You</div>
          <Board />
        </div>

        {/* VS divider */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-600">VS</div>
        </div>

        {/* Opponent's board (masked) */}
        <div className="flex flex-col items-center">
          <OpponentBoard />
        </div>
      </div>

      {/* Keyboard */}
      {status === GAME_STATUS.PLAYING && (
        <div className="mt-4">
          <Keyboard onSubmit={submitGuess} />
        </div>
      )}

      {/* Game end modal */}
      <AnimatePresence>
        {status === GAME_STATUS.FINISHED && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-arena-card border border-arena-border rounded-2xl p-8 max-w-md w-full text-center"
            >
              {/* Result */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={`text-6xl mb-4 ${result === 'win' ? 'winner-celebration' : ''}`}
              >
                {result === 'win' ? '🏆' : result === 'loss' ? '😔' : '🤝'}
              </motion.div>

              <h2 className="text-3xl font-bold mb-2">
                {result === 'win' ? 'Victory!' : result === 'loss' ? 'Defeat' : 'Draw'}
              </h2>

              <p className="text-gray-400 mb-6">
                The word was{' '}
                <span className="font-mono font-bold text-white">{targetWord}</span>
              </p>

              {/* ELO change */}
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    eloChange > 0 ? 'text-tile-green' : eloChange < 0 ? 'text-arena-error' : 'text-gray-400'
                  }`}>
                    {eloChange > 0 ? '+' : ''}{eloChange}
                  </div>
                  <div className="text-sm text-gray-500">ELO Change</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-arena-accent">{newElo}</div>
                  <div className="text-sm text-gray-500">New Rating</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlayAgain}
                  className="flex-1 py-3 bg-arena-accent hover:bg-arena-accent/90 rounded-xl font-bold transition-colors"
                >
                  Play Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 bg-arena-card hover:bg-arena-border border border-arena-border rounded-xl font-bold transition-colors"
                >
                  Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}


