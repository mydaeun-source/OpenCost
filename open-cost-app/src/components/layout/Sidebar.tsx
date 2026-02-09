"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"

export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 border-r border-white/5 bg-black/20 backdrop-blur-xl z-50">
            <div className="flex h-20 items-center px-6">
                <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-25"></div>
                    <span className="relative text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">
                        Open-Cost.AI
                    </span>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                            )}
                            <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                            <span className="relative">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-[1px]">
                        <div className="h-full w-full rounded-full bg-black/80 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">U</span>
                        </div>
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-slate-200">Owner Account</p>
                        <p className="text-xs text-primary/80">Premium Access</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
