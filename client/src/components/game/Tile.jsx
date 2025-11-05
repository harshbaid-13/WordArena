'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

const colorClasses = {
  green: 'bg-tile-green border-tile-green',
  yellow: 'bg-tile-yellow border-tile-yellow',
  grey: 'bg-tile-grey border-tile-grey',
  empty: 'bg-tile-empty border-tile-border'
}

export function Tile({ letter, color, delay = 0, isCurrentRow = false }) {
  const hasLetter = letter && letter.trim() !== ''
  const hasColor = color && color !== 'empty'

  return (
    <motion.div
      initial={hasColor ? { rotateX: 0 } : false}
      animate={hasColor ? { rotateX: [0, 90, 0] } : false}
      transition={{ 
        duration: 0.5, 
        delay,
        times: [0, 0.5, 1]
      }}
      className={clsx(
        'w-14 h-14 md:w-16 md:h-16 flex items-center justify-center',
        'text-2xl md:text-3xl font-bold rounded-lg border-2',
        'transition-all duration-150',
        hasColor ? colorClasses[color] : colorClasses.empty,
        hasLetter && !hasColor && 'border-gray-500',
        isCurrentRow && hasLetter && 'scale-105'
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.span
        initial={hasLetter && !hasColor ? { scale: 0 } : false}
        animate={hasLetter && !hasColor ? { scale: 1 } : false}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {letter?.toUpperCase()}
      </motion.span>
    </motion.div>
  )
}

// Mini tile for opponent view (smaller, no letters)
export function MiniTile({ color, delay = 0 }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 500 }}
      className={clsx(
        'w-6 h-6 md:w-8 md:h-8 rounded',
        color ? colorClasses[color] : colorClasses.empty
      )}
    />
  )
}


