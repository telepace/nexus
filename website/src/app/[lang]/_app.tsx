'use client'

import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'

/**
 * Global App component, handling Nextra style hydration and loading issues.
 *
 * This component addresses style-related problems during page loading by removing specific styles that interfere with hydration.
 * It uses a `useEffect` hook to execute initial cleanup and set up a `MutationObserver` to continuously monitor and clean up new styles added to the document head.
 *
 * @param {AppProps} props - The component's property object, containing Component and pageProps.
 */
export default function App({ Component, pageProps }: AppProps) {
  // Handle style fixes during page loading
  useEffect(() => {
    // Remove any styles that affect hydration
    /**
     * Removes styles from the document that contain specific CSS properties.
     *
     * This function iterates over all `<style>` elements in the document and removes those
     * that include transitions on the body or are associated with the unresolved state.
     */
    const cleanupStyles = () => {
      document.querySelectorAll('style').forEach(style => {
        if (style.textContent?.includes('body {transition:')
          || style.textContent?.includes('body[unresolved]')) {
          style.remove()
        }
      })
    }

    // Execute cleanup
    cleanupStyles()

    // Set up an observer to continuously monitor style injections
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          cleanupStyles()
        }
      })
    })

    observer.observe(document.head, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
