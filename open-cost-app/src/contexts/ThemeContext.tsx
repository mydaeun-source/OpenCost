"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "vibe" | "clean"

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("vibe")

    useEffect(() => {
        const savedTheme = localStorage.getItem("app-theme") as Theme | null
        if (savedTheme) {
            setThemeState(savedTheme)
        }
    }, [])

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("theme-vibe", "theme-clean")
        root.classList.add(`theme-${theme}`)

        // Also sync with tailwind's dark mode if necessary
        if (theme === 'vibe') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("app-theme", newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}
