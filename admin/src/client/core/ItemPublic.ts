/**
 * Item public model definition
 */
export interface ItemPublic {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
} 