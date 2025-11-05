'use client'

import { useEffect, useState } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useGameStore, GAME_STATUS } from '@/stores/gameStore'

export function AuthProvider({ children }) {
  const { token, user, checkAuth } = useUserStore()
  const { status, gameId } = useGameStore()
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration - wait for stores to rehydrate from localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Check auth on mount if we have a token but no user
  useEffect(() => {
    if (isHydrated && token && !user) {
      checkAuth()
    }
  }, [isHydrated, token, user, checkAuth])

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-bold text-arena-accent animate-pulse">
          Loading...
        </div>
      </div>
    )
  }

  return children
}

