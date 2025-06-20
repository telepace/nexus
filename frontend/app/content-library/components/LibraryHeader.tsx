"use client"

import { FC } from 'react'
import { useAuth } from '@/lib/auth'

export const LibraryHeader: FC = () => {
  const { user } = useAuth()

  return (
    <header className="flex shrink-0 items-center gap-2  bg-background px-4 md:px-6">
      {/* Title */}
      <h1 className="text-lg font-semibold">内容库</h1>
    </header>
  )
} 