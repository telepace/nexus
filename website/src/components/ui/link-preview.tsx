'use client'
import { cn } from '@/lib/utils'
import * as HoverCardPrimitive from '@radix-ui/react-hover-card'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { encode } from 'qss'
import React from 'react'

type LinkPreviewProps = {
  children: React.ReactNode
  url: string
  className?: string
  width?: number
  height?: number
  quality?: number
} & (
  | { isStatic: true, imageSrc: string }
  | { isStatic?: false, imageSrc?: never }
)

/**
 * Generates a link preview component with optional static image support and interactive hover effects.
 *
 * The component uses Microlink API to generate screenshots of URLs if `isStatic` is false.
 * It includes an animated hover card that displays the preview image when the user hovers over the link.
 * The animation effect is subtle, moving the preview slightly based on cursor position.
 *
 * @param children - Content to be displayed as the clickable link.
 * @param url - The URL for which the preview is generated.
 * @param className - Additional CSS classes to apply to the trigger element.
 * @param width - Width of the preview image (default is 200).
 * @param height - Height of the preview image (default is 125).
 * @param quality - Quality of the preview image (default is 50).
 * @param isStatic - Indicates if a static image should be used instead of generating a screenshot.
 * @param imageSrc - Source URL for the static image if `isStatic` is true.
 */
export const LinkPreview = ({
  children,
  url,
  className,
  width = 200,
  height = 125,
  quality = 50,
  isStatic = false,
  imageSrc = '',
}: LinkPreviewProps) => {
  let src
  if (!isStatic) {
    const params = encode({
      url,
      screenshot: true,
      meta: false,
      embed: 'screenshot.url',
      colorScheme: 'dark',
      'viewport.isMobile': true,
      'viewport.deviceScaleFactor': 1,
      'viewport.width': width * 3,
      'viewport.height': height * 3,
    })
    src = `https://api.microlink.io/?${params}`
  }
  else {
    src = imageSrc
  }

  const [isOpen, setOpen] = React.useState(false)

  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true
    // Set the state to true when the component mounts
    if (isMounted) {
      setIsMounted(true)
    }

    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const springConfig = { stiffness: 100, damping: 15 }
  const x = useMotionValue(0)

  const translateX = useSpring(x, springConfig)

  const handleMouseMove = (event: any) => {
    const targetRect = event.target.getBoundingClientRect()
    const eventOffsetX = event.clientX - targetRect.left
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2 // Reduce the effect to make it subtle
    x.set(offsetFromCenter)
  }

  return (
    <>
      {isMounted
        ? (
            <div className="hidden">
              <Image
                src={src}
                width={width}
                height={height}
                quality={quality}
                priority
                alt="hidden image"
              />
            </div>
          )
        : null}

      <HoverCardPrimitive.Root
        openDelay={50}
        closeDelay={100}
        onOpenChange={(open) => {
          setOpen(open)
        }}
      >
        <HoverCardPrimitive.Trigger
          onMouseMove={handleMouseMove}
          className={cn('font-bold bg-clip-text bg-linear-to-br', className)}
          href={url}
          target="_blank"
        >
          {children}
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Content
          className="aa [transform-origin:var(--radix-hover-card-content-transform-origin)]"
          side="top"
          align="center"
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="shadow-xl rounded-xl"
                style={{
                  x: translateX,
                }}
              >
                <Link
                  href={url}
                  target="_blank"
                  className="block p-1 bg-white border-2 border-transparent shadow-sm rounded-xl hover:border-neutral-200 dark:hover:border-neutral-800"
                  style={{ fontSize: 0 }}
                >
                  <Image
                    src={isStatic ? imageSrc : src}
                    width={width}
                    height={height}
                    quality={quality}
                    priority
                    className="rounded-lg"
                    alt="preview image"
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Root>
    </>
  )
}
