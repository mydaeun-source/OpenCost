"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"

export function BottomNav() {
    const pathname = usePathname()

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-black/20 backdrop-blur-xl z-50 pb-safe">
            <div className="flex justify-around items-center h-16">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative overflow-hidden",
                                isActive
                                    ? "text-white"
                                    : "text-slate-300 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute top-0 w-8 h-1 bg-primary shadow-[0_0_10px_rgba(34,211,238,0.8)] rounded-b-full" />
                            )}
                            <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive ? "scale-110 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" : "")} />
                            <span className={cn("text-xs font-black tracking-tight mt-0.5", isActive ? "text-white" : "text-slate-300")}>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
