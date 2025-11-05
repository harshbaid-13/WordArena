'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useGameStore, GAME_STATUS } from '@/stores/gameStore'

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
]

export function Keyboard({ onSubmit }) {
  const { letterStates, addLetter, removeLetter, currentGuess, status } = useGameStore()
  const submittingRef = useRef(false)

  const handleKeyPress = useCallback((key) => {
    const { status: currentStatus, currentGuess: guess } = useGameStore.getState()
    if (currentStatus !== GAME_STATUS.PLAYING) return

    if (key === 'ENTER') {
      if (guess.length === 5 && !submittingRef.current) {
        submittingRef.current = true
        onSubmit(guess)
        // Reset after a short delay to allow for server response
        setTimeout(() => {
          submittingRef.current = false
        }, 500)
      }
    } else if (key === 'BACK') {
      useGameStore.getState().removeLetter()
    } else {
      useGameStore.getState().addLetter(key)
    }
  }, [onSubmit])

  // Physical keyboard support - single listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.repeat) return
      
      const key = e.key.toUpperCase()
      
      if (key === 'ENTER') {
        e.preventDefault()
        handleKeyPress('ENTER')
      } else if (key === 'BACKSPACE') {
        e.preventDefault()
        handleKeyPress('BACK')
      } else if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyPress])

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map((key) => (
            <Key
              key={key}
              letter={key}
              state={letterStates[key]}
              onClick={() => handleKeyPress(key)}
              disabled={status !== GAME_STATUS.PLAYING}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function Key({ letter, state, onClick, disabled }) {
  const isWide = letter === 'ENTER' || letter === 'BACK'
  
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center justify-center rounded-md font-bold text-sm',
        'transition-colors duration-150',
        isWide ? 'px-3 py-4 text-xs' : 'w-9 h-14 md:w-11 md:h-14',
        state === 'green' && 'bg-tile-green',
        state === 'yellow' && 'bg-tile-yellow',
        state === 'grey' && 'bg-tile-grey',
        !state && 'bg-gray-600 hover:bg-gray-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {letter === 'BACK' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
        </svg>
      ) : letter}
    </motion.button>
  )
}


