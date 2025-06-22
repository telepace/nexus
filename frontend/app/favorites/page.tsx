"use client";

import React from 'react'
import { Star, Heart, Clock, FileText, Link as LinkIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FavoriteButton } from '@/components/actions/FavoriteButton'
import { useFavoritesList } from '@/lib/hooks/useFavorites'
import { cn } from '@/lib/utils'

function FavoriteItemCard({ item }: { item: any }) {
  const { content_item } = item
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'url':
        return <LinkIcon className="h-4 w-4 text-green-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon(content_item.type)}
              <Badge variant="secondary" className="text-xs">
                {content_item.type}
              </Badge>
              <Badge 
                variant={content_item.processing_status === 'completed' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {content_item.processing_status}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {content_item.title || 'Untitled'}
            </h3>
          </div>
          <FavoriteButton 
            itemId={content_item.id} 
            size="sm"
            className="opacity-60 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {content_item.content_text && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
            {content_item.content_text}
          </p>
        )}
        
        {content_item.source_uri && (
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">
              {content_item.source_uri}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Added {formatDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            <span>Favorited {formatDate(content_item.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function FavoritesPage() {
  const { data, isLoading, error } = useFavoritesList()

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <Heart className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Failed to load favorites
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please try again later
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
              <Star className="h-6 w-6 text-amber-600 dark:text-amber-400 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Your Favorites
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Content you've starred for easy access
              </p>
            </div>
          </div>
          
          {data && (
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{data.total} items favorited</span>
              <span>•</span>
              <span>Updated just now</span>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <FavoritesSkeleton />
        ) : data?.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Star className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No favorites yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start favoriting content to see it here
            </p>
            <Button asChild>
              <a href="/content-library">
                Browse Content Library
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items.map((item) => (
              <FavoriteItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
