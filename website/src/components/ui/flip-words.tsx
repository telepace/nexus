'use client'

import type { TargetAndTransition } from 'framer-motion'
import { useBreakpoint } from '@/hooks'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * A React component that flips through a list of words with animation effects.
 *
 * The `FlipWords` component uses React hooks such as `useState`, `useEffect`, and `useCallback`
 * to manage the current word, animation state, and animation triggers. It leverages Framer Motion for smooth transitions
 * between words. The component also adapts its exit animations based on screen size using a custom hook.
 *
 * @param words - An array of strings representing the words to flip through.
 * @param duration - Optional duration in milliseconds for each word's display time, defaulting to 3000ms.
 * @param className - Optional additional CSS class name(s) to apply to the component.
 */
export const FlipWords = ({
  words,
  duration = 3000,
  className,
}: {
  words: string[]
  duration?: number
  className?: string
}) => {
  const [currentWord, setCurrentWord] = useState(words[0])
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  // thanks for the fix Julian - https://github.com/Julian-AT
  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0]
    setCurrentWord(word)
    setIsAnimating(true)
  }, [currentWord, words])

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined
    if (!isAnimating) {
      timerId = setTimeout(() => {
        startAnimation()
      }, duration)
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [isAnimating, duration, startAnimation])

  const { isMd } = useBreakpoint()

  const motionExit = useMemo<TargetAndTransition>(() => {
    if (isMd) {
      return {
        opacity: 0,
        filter: 'blur(0px)',
        position: 'absolute',
      }
    }
    return {
      opacity: 0,
      y: -40,
      x: 40,
      filter: 'blur(8px)',
      scale: 2,
      position: 'absolute',
    }
  }, [isMd])

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsAnimating(false)
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 10,
        }}
        exit={motionExit}
        className={cn(
          'inline-block relative font-bold text-neutral-700 dark:text-neutral-200',
          className,
        )}
        key={currentWord}
      >
        {currentWord.split('').map((letter, index) => (
          <motion.span
            key={currentWord + index}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              delay: index * 0.08,
              duration: 0.4,
            }}
            className="inline-block"
          >
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
