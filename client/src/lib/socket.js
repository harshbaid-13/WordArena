import { io } from 'socket.io-client'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

let socket = null
let currentUserData = null
let isRegistered = false

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    // Set up connection handlers once
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      isRegistered = false // Reset on new connection
      // Re-register on connect/reconnect
      if (currentUserData && !isRegistered) {
        socket.emit('register', currentUserData)
        isRegistered = true
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      isRegistered = false
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
  }
  return socket
}

export function connectSocket(token, userData) {
  const sock = getSocket()
  
  // Update auth and user data
  if (token) {
    sock.auth = { token }
  }
  
  // Only update userData if it's different (by id)
  const userChanged = !currentUserData || currentUserData.id !== userData?.id
  if (userChanged) {
    currentUserData = userData
    isRegistered = false
  }
  
  // Only connect if not already connected
  if (!sock.connected) {
    sock.connect()
  } else if (userData && !isRegistered) {
    // Already connected but not registered, register now
    sock.emit('register', userData)
    isRegistered = true
  }

  return sock
}

export function disconnectSocket() {
  // Don't disconnect during gameplay - let the socket persist
  // Only disconnect on logout or explicit cleanup
}

export function forceDisconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
    currentUserData = null
    isRegistered = false
  }
}


