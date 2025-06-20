export interface ContentItemPublic {
  id: string
  type: string
  source_uri?: string | null
  title?: string | null
  summary?: string | null
  user_id: string
  processing_status: string
  created_at: string
  updated_at: string
  ai_analysis?: {
    summarizer?: {
      summary?: {
        main_thesis?: string
        key_insights?: string[]
        conclusion?: string
      }
      raw_text?: string
    }
    key_points_extractor?: {
      key_points?: {
        core_concepts?: Array<{ point: string; explanation?: string }>
        important_facts?: Array<{ fact: string; context?: string }>
        actionable_insights?: Array<{ insight: string; application?: string }>
      }
      raw_text?: string
    }
    [key: string]: unknown
  } | null
} 