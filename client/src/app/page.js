'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUserStore } from '@/stores/userStore'

export default function Home() {
  const { user, isLoading, checkAuth } = useUserStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-arena-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tile-green/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        {/* Logo */}
        <motion.h1 
          className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-white via-arena-accent to-tile-green bg-clip-text text-transparent"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          WordArena
        </motion.h1>

        <motion.p 
          className="text-xl md:text-2xl text-gray-400 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Real-Time Multiplayer Speed Wordle
        </motion.p>

        {/* Sample tiles */}
        <motion.div 
          className="flex justify-center gap-2 mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {['W', 'O', 'R', 'D', 'S'].map((letter, i) => (
            <motion.div
              key={i}
              className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-bold rounded-lg border-2 ${
                i === 0 ? 'bg-tile-green border-tile-green' :
                i === 2 ? 'bg-tile-yellow border-tile-yellow' :
                'bg-tile-grey border-tile-grey'
              }`}
              initial={{ rotateX: 90 }}
              animate={{ rotateX: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
            >
              {letter}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {user ? (
            <>
              <Link href="/lobby">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-arena-accent hover:bg-arena-accent/90 rounded-xl font-bold text-lg transition-colors"
                >
                  🎮 Play Now
                </motion.button>
              </Link>
              <Link href="/profile">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-arena-card hover:bg-arena-border border border-arena-border rounded-xl font-bold text-lg transition-colors"
                >
                  👤 Profile
                </motion.button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-arena-accent hover:bg-arena-accent/90 rounded-xl font-bold text-lg transition-colors"
                >
                  Sign In
                </motion.button>
              </Link>
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-arena-card hover:bg-arena-border border border-arena-border rounded-xl font-bold text-lg transition-colors"
                >
                  Create Account
                </motion.button>
              </Link>
            </>
          )}
        </motion.div>

        {/* Features */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <FeatureCard 
            icon="⚡" 
            title="Real-Time Racing" 
            description="Compete head-to-head in real-time speed matches"
          />
          <FeatureCard 
            icon="📊" 
            title="ELO Ranking" 
            description="Climb the leaderboard with skill-based matchmaking"
          />
          <FeatureCard 
            icon="🤖" 
            title="AI Opponents" 
            description="Practice against entropy-optimized bots"
          />
        </motion.div>
      </motion.div>
    </main>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 bg-arena-card/50 backdrop-blur border border-arena-border rounded-xl"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </motion.div>
  )
}


