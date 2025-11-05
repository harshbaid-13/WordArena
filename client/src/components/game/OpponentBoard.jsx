'use client'

import { MiniTile } from './Tile'
import { useGameStore } from '@/stores/gameStore'

const MAX_GUESSES = 6
const WORD_LENGTH = 5

export function OpponentBoard() {
  const { opponentProgress, opponent } = useGameStore()

  // Build rows from opponent progress
  const rows = []
  
  // Add opponent's guesses (colors only)
  opponentProgress.forEach((guess) => {
    rows.push({ colors: guess.colors })
  })

  // Add empty rows
  while (rows.length < MAX_GUESSES) {
    rows.push({ colors: null })
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-2 font-medium">
        {opponent?.username || 'Opponent'}
        {opponent?.isBot && <span className="ml-1 text-arena-accent">🤖</span>}
      </div>
      
      <div className="flex flex-col gap-1">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {Array(WORD_LENGTH).fill(null).map((_, colIndex) => (
              <MiniTile
                key={`${rowIndex}-${colIndex}`}
                color={row.colors?.[colIndex]}
                delay={row.colors ? colIndex * 0.05 : 0}
              />
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        {opponentProgress.length} / 6 guesses
      </div>
    </div>
  )
}


