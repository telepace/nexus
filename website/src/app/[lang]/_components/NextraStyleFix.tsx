'use client'

// Added missing import
import { useEffect } from 'react'

/**
 * Fixes Nextra style hydration issues by removing conflicting style elements.
 *
 * This function addresses potential conflicts during client-side rendering by identifying
 * and removing `<style>` tags that contain specific patterns in their text content.
 * It also sets up a MutationObserver to dynamically handle styles added after initial load.
 */
export function NextraStyleFix() {
  useEffect(() => {
    // Handle potential style conflicts
    /**
     * Handles the removal of specific `<style>` tags from the document.
     *
     * This function searches through all `<style>` elements in the document and removes those
     * that contain either 'body {transition:' or 'body[unresolved]' in their text content.
     */
    const handleStyleFix = () => {
      // Find and remove style tags containing body transition
      document.querySelectorAll('style').forEach(styleEl => {
        if (styleEl.textContent?.includes('body {transition:')
          || styleEl.textContent?.includes('body[unresolved]')) {
          styleEl.remove()
        }
      })
    }

    // Execute cleanup
    handleStyleFix()

    // For dynamically loaded styles, an observer can be set
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          handleStyleFix()
        }
      })
    })

    observer.observe(document.head, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return null
}

/**
 * A React functional component that wraps content with specific styling and layout for documentation purposes.
 */
export const NextraContentWrapper: React.FC<{
  children: React.ReactNode
  toc?: any
  metadata?: any
}> = ({ children, toc: _toc, metadata: _metadata }) => { // _toc and _metadata are the actual prop names available here
  // const { theme } = useTheme(); // Removed as it's unused

  return (
    <div className="nextra-content-container nx-mx-auto nx-max-w-[90rem]">
      <article className="nextra-content nx-min-h-[calc(100vh-var(--nextra-navbar-height))] nx-w-full nx-px-6 nx-pb-8 md:nx-pl-[max(env(safe-area-inset-left),1.5rem)] md:nx-pr-[max(env(safe-area-inset-right),1.5rem)]">
        <main className="nextra-body nx-w-full nx-break-words">
          {children}
        </main>
      </article>
    </div>
  )
}
