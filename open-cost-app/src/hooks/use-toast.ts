"use client"

// Simplified version of the toast hook for Zero-Cost philosophy.
// We manage state locally or via a simple context. Here is a basic implementation.

import * as React from "react"

type ToastType = "default" | "success" | "destructive"

export interface Toast {
    id: string
    title?: string
    description?: string
    action?: React.ReactNode
    type?: ToastType
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 1000000 // Just hold it in state management

// Simple event emitter for toast
const listeners: Array<(state: State) => void> = []

interface State {
    toasts: Toast[]
}

let memoryState: State = { toasts: [] }

function dispatch(action: any) {
    switch (action.type) {
        case "ADD_TOAST":
            memoryState = {
                ...memoryState,
                toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
            }
            break
        case "DISMISS_TOAST":
            memoryState = {
                ...memoryState,
                toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
            }
            break
    }
    listeners.forEach((listener) => listener(memoryState))
}

export function toast({ duration = 2000, ...props }: Omit<Toast, "id"> & { duration?: number }) {
    const id = Math.random().toString(36).substring(2, 9)
    dispatch({
        type: "ADD_TOAST",
        toast: { ...props, id },
    })

    if (duration !== Infinity) {
        setTimeout(() => {
            dispatch({ type: "DISMISS_TOAST", toastId: id })
        }, duration)
    }
}

export function useToast() {
    const [state, setState] = React.useState<State>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [])

    return {
        toasts: state.toasts,
        toast,
        dismiss: (toastId: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    }
}
