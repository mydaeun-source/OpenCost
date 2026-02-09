"use client"
import { useEffect, useState } from "react"
import { debugRecipeData } from "@/lib/debug-db"

export default function DebugPage() {
    const [logs, setLogs] = useState<any[]>([])

    useEffect(() => {
        const run = async () => {
            const originalLog = console.log
            const capturedLogs: any[] = []
            console.log = (...args) => {
                capturedLogs.push(args)
                originalLog(...args)
            }

            await debugRecipeData()

            setLogs(capturedLogs)
            console.log = originalLog
        }
        run()
    }, [])

    return (
        <div className="p-10 bg-black text-white font-mono whitespace-pre-wrap">
            <h1>Debug Output</h1>
            {JSON.stringify(logs, null, 2)}
        </div>
    )
}
