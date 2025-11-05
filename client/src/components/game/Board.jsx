'use client'

import { Tile } from './Tile'
import { useGameStore } from '@/stores/gameStore'

const MAX_GUESSES = 6
const WORD_LENGTH = 5

export function Board() {
  const { guesses, currentGuess } = useGameStore()

  // Build rows: completed guesses + current guess + empty rows
  const rows = []
  
  // Add completed guesses
  guesses.forEach((guess, rowIndex) => {
    rows.push({
      letters: guess.word.split(''),
      colors: guess.colors,
      isComplete: true
    })
  })

  // Add current guess row (if still playing)
  if (guesses.length < MAX_GUESSES) {
    const currentLetters = currentGuess.split('')
    while (currentLetters.length < WORD_LENGTH) {
      currentLetters.push('')
    }
    rows.push({
      letters: currentLetters,
      colors: null,
      isComplete: false,
      isCurrent: true
    })
  }

  // Add empty rows
  while (rows.length < MAX_GUESSES) {
    rows.push({
      letters: Array(WORD_LENGTH).fill(''),
      colors: null,
      isComplete: false
    })
  }

  return (
    <div className="board-container flex flex-col gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.letters.map((letter, colIndex) => (
            <Tile
              key={`${rowIndex}-${colIndex}`}
              letter={letter}
              color={row.colors?.[colIndex]}
              delay={row.isComplete ? colIndex * 0.1 : 0}
              isCurrentRow={row.isCurrent}
            />
          ))}
        </div>
      ))}
    </div>
  )
}


