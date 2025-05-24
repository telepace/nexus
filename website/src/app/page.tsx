import { redirect } from 'next/navigation'

/**
 * Root page that redirects to the default language
 */
export default function RootPage() {
  redirect('/zh')
} 