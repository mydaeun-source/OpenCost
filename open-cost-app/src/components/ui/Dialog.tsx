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
}

export function Dialog({ isOpen, onClose, title, description, children }: DialogProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
                    {description && (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>

                <div>
                    {children}
                </div>
            </div>
        </div>
    )
}
