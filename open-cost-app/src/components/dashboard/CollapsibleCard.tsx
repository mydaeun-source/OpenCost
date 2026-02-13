"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Tooltip } from "@/components/ui/Tooltip"
import { cn } from "@/lib/utils"

interface CollapsibleCardProps {
    title: string
    description?: string
    icon?: React.ReactNode
    children: React.ReactNode
    storageKey: string
    className?: string
    headerAction?: React.ReactNode
    defaultCollapsed?: boolean
    // Drag and Drop props
    draggable?: boolean
    onDragStart?: (e: React.DragEvent) => void
    onDragOver?: (e: React.DragEvent) => void
    onDrop?: (e: React.DragEvent) => void
    onDragEnd?: (e: React.DragEvent) => void
}

export function CollapsibleCard({
    title,
    description,
    icon,
    children,
    storageKey,
    className,
    headerAction,
    defaultCollapsed = false,
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
}: CollapsibleCardProps) {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isDragEnabled, setIsDragEnabled] = useState(false)

    // Sync with localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem(`dash_collapse_${storageKey}`)
        if (savedState !== null) {
            setIsCollapsed(savedState === "true")
        }
        setIsLoaded(true)
    }, [storageKey])

    // Update localStorage when state changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(`dash_collapse_${storageKey}`, String(isCollapsed))
        }
    }, [isCollapsed, storageKey, isLoaded])

    const toggleCollapse = () => setIsCollapsed(!isCollapsed)

    return (
        <Card
            draggable={draggable && isDragEnabled}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                "transition-all duration-300 ease-in-out border-none shadow-none bg-transparent relative group/card",
                draggable && isDragEnabled ? "cursor-grabbing" : "cursor-default",
                className
            )}
        >
            <CardHeader className={cn(
                "p-4 flex flex-row items-center justify-between group cursor-pointer select-none transition-colors rounded-2xl",
                "hover:bg-white/5",
                !isCollapsed ? "pb-4" : "pb-4"
            )} onClick={toggleCollapse}>
                <div className="flex items-center gap-4">
                    {draggable && (
                        <div
                            className="p-1 -ml-1 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => setIsDragEnabled(true)}
                            onMouseLeave={() => setIsDragEnabled(false)}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                    )}
                    {icon && (
                        <Tooltip content={description || title}>
                            <div className={cn(
                                "h-10 w-10 flex items-center justify-center transition-all duration-300",
                                isCollapsed
                                    ? "text-muted-foreground"
                                    : "text-primary scale-110 drop-shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                            )}>
                                {icon}
                            </div>
                        </Tooltip>
                    )}
                    <div className="flex flex-col">
                        <CardTitle className={cn(
                            "text-lg font-black tracking-tight transition-colors duration-300",
                            "text-foreground"
                        )}>
                            {title}
                        </CardTitle>
                        {description && !isCollapsed && (
                            <CardDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">
                                {description}
                            </CardDescription>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {headerAction && !isCollapsed && (
                        <div className="mr-2" onClick={(e) => e.stopPropagation()}>
                            {headerAction}
                        </div>
                    )}
                    <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                        "bg-transparent hover:bg-muted",
                        isCollapsed ? "text-muted-foreground" : "text-primary"
                    )}>
                        <div className={cn(
                            "transition-transform duration-500",
                            isCollapsed ? "rotate-0" : "rotate-180"
                        )}>
                            <ChevronDown className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </CardHeader>

            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100 p-4"
            )}>
                {children}
            </div>
        </Card>
    )
}
