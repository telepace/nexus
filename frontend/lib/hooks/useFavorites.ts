import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCookie } from '@/lib/utils'

interface FavoriteItem {
  id: string
  user_id: string
  content_item_id: string
  created_at: string
  content_item: {
    id: string
    title: string
    type: string
    source_uri?: string
    content_text?: string
    created_at: string
    updated_at: string
    processing_status: string
  }
}

interface FavoritesResponse {
  items: FavoriteItem[]
  total: number
  skip: number
  limit: number
}

const fetcher = async (url: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const token = getCookie('accessToken')

  if (!token) {
    throw new Error('No access token found')
  }

  const response = await fetch(`${baseUrl}/api/v1${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch')
  }

  return response.json()
}

export function useFavorites() {
  const { data, error, isLoading } = useQuery<string[]>({
    queryKey: ['favorites', 'content-ids'],
    queryFn: () => fetcher('/favorites/content-ids'),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  const queryClient = useQueryClient()

  const mutate = () => {
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
  }

  return {
    data,
    isLoading,
    error,
    mutate,
  }
}

export function useFavoritesList(skip = 0, limit = 100) {
  const { data, error, isLoading } = useQuery<FavoritesResponse>({
    queryKey: ['favorites', 'list', skip, limit],
    queryFn: () => fetcher(`/favorites?skip=${skip}&limit=${limit}`),
    refetchOnWindowFocus: false,
  })

  const queryClient = useQueryClient()

  const mutate = () => {
    queryClient.invalidateQueries({ queryKey: ['favorites'] })
  }

  return {
    data,
    isLoading,
    error,
    mutate,
  }
} 