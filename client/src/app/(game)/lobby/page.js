'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useUserStore } from '@/stores/userStore'
import { useGameStore, GAME_STATUS } from '@/stores/gameStore'
import { useSocket } from '@/hooks/useSocket'

export default function LobbyPage() {
  const router = useRouter()
  const { user, checkAuth } = useUserStore()
  const { status, opponent, startSearching, cancelSearch, resetGame } = useGameStore()
  const { startMatchmaking, cancelMatchmaking } = useSocket()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  // Navigate to play page when game starts
  useEffect(() => {
    if (status === GAME_STATUS.PLAYING) {
      router.push('/play')
    }
  }, [status, router])

  const handleFindMatch = () => {
    startSearching()
    startMatchmaking()
  }

  const handleCancel = () => {
    cancelSearch()
    cancelMatchmaking()
  }

  if (!user) return null

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* User info */}
        <div className="mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-block bg-arena-card border border-arena-border rounded-2xl p-6"
          >
            <div className="text-2xl font-bold mb-1">{user.username}</div>
            <div className="flex items-center justify-center gap-4 text-gray-400">
              <span className="flex items-center gap-1">
                <span className="text-arena-accent font-mono">{user.elo}</span> ELO
              </span>
              <span>•</span>
              <span>{user.wins || 0}W / {user.losses || 0}L</span>
            </div>
          </motion.div>
        </div>

        {/* Matchmaking UI */}
        {status === GAME_STATUS.IDLE && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFindMatch}
              className="px-12 py-6 bg-arena-accent hover:bg-arena-accent/90 rounded-2xl font-bold text-2xl transition-colors glow-accent"
            >
              🎮 Find Match
            </motion.button>
            
            <p className="text-gray-500 mt-4">
              You'll be matched with a player of similar skill
            </p>
          </motion.div>
        )}

        {status === GAME_STATUS.SEARCHING && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-arena-accent border-t-transparent rounded-full mx-auto"
              />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Searching for opponent...</h2>
            <p className="text-gray-400 mb-6">
              Looking for players in your ELO range
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="px-8 py-3 bg-arena-card hover:bg-arena-border border border-arena-border rounded-xl font-bold transition-colors"
            >
              Cancel
            </motion.button>

            <p className="text-gray-500 text-sm mt-4">
              A bot will be assigned if no match is found in 15 seconds
            </p>
          </motion.div>
        )}

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
        >
          <div className="bg-arena-card/50 rounded-xl p-4 border border-arena-border">
            <div className="text-2xl font-bold text-tile-green">{user.wins || 0}</div>
            <div className="text-sm text-gray-400">Wins</div>
          </div>
          <div className="bg-arena-card/50 rounded-xl p-4 border border-arena-border">
            <div className="text-2xl font-bold text-tile-yellow">{user.gamesPlayed || 0}</div>
            <div className="text-sm text-gray-400">Games</div>
          </div>
          <div className="bg-arena-card/50 rounded-xl p-4 border border-arena-border">
            <div className="text-2xl font-bold text-arena-accent">
              {user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </motion.div>
      </motion.div>
    </main>
  )
}


