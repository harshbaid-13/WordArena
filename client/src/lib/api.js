const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

/**
 * Fetch wrapper with auth token
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('wordarena-user') || '{}')?.state?.token
    : null

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

/**
 * API methods
 */
export const api = {
  // Auth
  login: (email, password) => 
    fetchWithAuth('/api/auth/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password }) 
    }),

  register: (username, email, password) => 
    fetchWithAuth('/api/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ username, email, password }) 
    }),

  getMe: () => fetchWithAuth('/api/auth/me'),

  // Users
  getLeaderboard: (limit = 50, offset = 0) => 
    fetchWithAuth(`/api/users/leaderboard?limit=${limit}&offset=${offset}`),

  getProfile: (userId) => 
    fetchWithAuth(`/api/users/${userId}/profile`),

  getMatchHistory: (userId, limit = 20, offset = 0) => 
    fetchWithAuth(`/api/users/${userId}/matches?limit=${limit}&offset=${offset}`),

  // Game
  getGameStats: () => 
    fetchWithAuth('/api/game/stats'),

  getReplay: (matchId) => 
    fetchWithAuth(`/api/game/${matchId}/replay`),
}


