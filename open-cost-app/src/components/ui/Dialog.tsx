import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./Button"

interface DialogProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    maxWidth?: string
}

export function Dialog({ isOpen, onClose, title, description, children, maxWidth = "max-w-lg" }: DialogProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={cn(
                    "relative w-full rounded-2xl border bg-background p-6 shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]",
                    maxWidth
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex flex-col space-y-1 sm:text-left mb-4 flex-none">
                    <h2 className="text-xl font-black leading-none tracking-tight">{title}</h2>
                    {description && (
                        <p className="text-xs font-black text-slate-400 italic">
                            {description}
                        </p>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>

                <div className="overflow-y-auto pr-2 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    )
}
