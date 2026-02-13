"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    children: React.ReactNode
    content: string
    className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false)

    return (
        <div
            className="relative flex items-center justify-center group"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={cn(
                        "absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg",
                        "whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200",
                        className
                    )}
                >
                    {content}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                </div>
            )}
        </div>
    )
}
