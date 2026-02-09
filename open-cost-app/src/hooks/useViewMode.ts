"use client"

import { useState, useEffect } from "react"

type ViewMode = 'grid' | 'list'

export function useViewMode(key: string, defaultMode: ViewMode = 'grid') {
    const [mode, setMode] = useState<ViewMode>(defaultMode)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem(key) as ViewMode | null
        if (saved && (saved === 'grid' || saved === 'list')) {
            setMode(saved)
        }
    }, [key])

    const setViewMode = (newMode: ViewMode) => {
        setMode(newMode)
        localStorage.setItem(key, newMode)
    }

    // Return mounted state to verify hydration if needed, 
    // though usually defaulting to 'grid' first is fine.
    return { viewMode: mode, setViewMode, mounted }
}
