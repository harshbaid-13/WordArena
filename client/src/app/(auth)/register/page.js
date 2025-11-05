'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useUserStore } from '@/stores/userStore'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useUserStore()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    const success = await register(username, email, password)
    if (success) {
      router.push('/lobby')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
          <p className="text-gray-400 text-center mb-8">Join the arena</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-arena-bg border border-arena-border rounded-lg focus:outline-none focus:border-arena-accent transition-colors"
                placeholder="WordMaster"
                minLength={3}
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-arena-bg border border-arena-border rounded-lg focus:outline-none focus:border-arena-accent transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-arena-bg border border-arena-border rounded-lg focus:outline-none focus:border-arena-accent transition-colors"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-arena-bg border border-arena-border rounded-lg focus:outline-none focus:border-arena-accent transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {(error || localError) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-arena-error text-sm text-center"
              >
                {error || localError}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-arena-accent hover:bg-arena-accent/90 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-arena-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <Link href="/" className="block text-center text-gray-500 mt-4 hover:text-white transition-colors">
          ← Back to home
        </Link>
      </motion.div>
    </main>
  )
}


