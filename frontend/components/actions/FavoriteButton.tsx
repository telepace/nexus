'use client'

import React from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { getCookie } from '@/lib/utils'

interface FavoriteButtonProps {
  itemId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
}

export function FavoriteButton({ 
  itemId, 
  className, 
  size = 'md',
  variant = 'ghost'
}: FavoriteButtonProps) {
  const { data: favoriteIds = [], mutate } = useFavorites()
  const isFavorited = favoriteIds.includes(itemId)

  const handleToggleFavorite = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = getCookie('accessToken')

      if (!token) {
        console.error('No access token found')
        return
      }

      if (isFavorited) {
        // Remove from favorites
        await fetch(`${baseUrl}/api/v1/content/${itemId}/favorite`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      } else {
        // Add to favorites
        await fetch(`${baseUrl}/api/v1/content/${itemId}/favorite`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
      
      // Optimistically update the cache
      mutate()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggleFavorite}
      className={cn(
        'transition-all duration-200 ease-in-out',
        'hover:scale-105 active:scale-95',
        'text-amber-500 hover:text-amber-600',
        'hover:bg-amber-50 dark:hover:bg-amber-950/20',
        'focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        sizeClasses[size],
        className
      )}
      aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
      tabIndex={0}
    >
      <Heart 
        size={iconSizes[size]} 
        className={cn(
          'transition-colors',
          isFavorited 
            ? 'text-amber-500 fill-amber-500 drop-shadow-sm' 
            : 'text-amber-500 hover:text-amber-600'
        )}
      />
    </Button>
  )
} 