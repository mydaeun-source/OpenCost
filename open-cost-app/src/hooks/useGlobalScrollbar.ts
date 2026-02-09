"use client"

import { useEffect } from "react"

/**
 * useGlobalScrollbar
 * 
 * Attaches a global 'scroll' listener (on the capture phase).
 * When an element is scrolled, it adds an 'is-scrolling' class to that element.
 * The class is removed after a short delay (1000ms).
 */
export function useGlobalScrollbar() {
    useEffect(() => {
        const handleGlobalScroll = (event: Event) => {
            let target = event.target as any

            // If the target is the document/window scroll, target both html and body
            if (target === document || target === window || target === document.body || target === document.documentElement) {
                document.documentElement.classList.add("is-scrolling")
                document.body.classList.add("is-scrolling")

                if ((document.documentElement as any)._scrollTimeout) clearTimeout((document.documentElement as any)._scrollTimeout)
                if ((document.body as any)._scrollTimeout) clearTimeout((document.body as any)._scrollTimeout)

                const clear = () => {
                    document.documentElement.classList.remove("is-scrolling")
                    document.body.classList.remove("is-scrolling")
                }

                    ; (document.documentElement as any)._scrollTimeout = setTimeout(clear, 1200)
                    ; (document.body as any)._scrollTimeout = setTimeout(clear, 1200)
                return
            }

            if (!target || !target.classList) return

            // Add the scrolling class
            target.classList.add("is-scrolling")

            // Clear any existing timeout for this element
            if (target._scrollTimeout) {
                clearTimeout(target._scrollTimeout)
            }

            // Set a new timeout to remove the class
            target._scrollTimeout = setTimeout(() => {
                target.classList.remove("is-scrolling")
                delete target._scrollTimeout
            }, 1200)
        }

        // Attach listener to window with capture: true to catch all scroll events
        window.addEventListener("scroll", handleGlobalScroll, { capture: true, passive: true })

        return () => {
            window.removeEventListener("scroll", handleGlobalScroll, { capture: true })
        }
    }, [])
}
