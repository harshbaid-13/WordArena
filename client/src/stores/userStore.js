import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Check if user is authenticated
      checkAuth: async () => {
        const token = get().token
        if (!token) return

        set({ isLoading: true })
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (res.ok) {
            const user = await res.json()
            set({ user, isLoading: false })
          } else {
            set({ user: null, token: null, isLoading: false })
          }
        } catch (error) {
          set({ user: null, token: null, isLoading: false })
        }
      },

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })

          const data = await res.json()

          if (!res.ok) {
            set({ error: data.error, isLoading: false })
            return false
          }

          set({ user: data.user, token: data.token, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Login failed', isLoading: false })
          return false
        }
      },

      // Register
      register: async (username, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
          })

          const data = await res.json()

          if (!res.ok) {
            set({ error: data.error, isLoading: false })
            return false
          }

          set({ user: data.user, token: data.token, isLoading: false })
          return true
        } catch (error) {
          set({ error: 'Registration failed', isLoading: false })
          return false
        }
      },

      // Logout
      logout: () => {
        set({ user: null, token: null, error: null })
      },

      // Update user data (after ELO change)
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }))
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'wordarena-user',
      // Persist both token and user data
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
)


