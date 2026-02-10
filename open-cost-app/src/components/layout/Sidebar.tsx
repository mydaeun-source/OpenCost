"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"
import { useStore } from "@/contexts/StoreContext"
import { ChevronLeft, ChevronRight, LogOut, Store as StoreIcon, Building2 } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface SidebarProps {
    isCollapsed: boolean
    onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname()
    const { activeStore, stores, businesses, setActiveStoreId, role, isAggregatedView } = useStore()

    return (
        <aside className={cn(
            "hidden md:flex h-screen flex-col fixed left-0 top-0 border-r border-white/5 bg-black/20 backdrop-blur-xl z-50 transition-all duration-300 overscroll-contain",
            isCollapsed ? "w-20" : "w-64"
        )}>
            {/* Store Title & Selector Section */}
            <div className={cn(
                "flex h-24 flex-col justify-center transition-all duration-300 border-b border-white/5",
                isCollapsed ? "px-0 items-center" : "px-6"
            )}>
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-25"></div>
                        <div className="relative h-10 w-10 bg-indigo-600/20 rounded-lg border border-white/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-black text-lg tracking-tight text-white truncate">
                                {activeStore?.name || "Open-Cost"}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">
                                {role === 'owner' ? '최고 경영자 (Owner)' : role === 'manager' ? '지점 점장 (Manager)' : '직원 (Staff)'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Store Switcher (if multiple stores exist) */}
            {!isCollapsed && (stores.length > 1 || role === 'owner' || role === 'super_admin') && (
                <div className="px-6 py-4">
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
                        value={isAggregatedView ? "all" : activeStore?.id}
                        onChange={(e) => setActiveStoreId(e.target.value)}
                    >
                        {(role === 'owner' || role === 'super_admin') && (
                            <option value="all" className="bg-slate-900 font-bold text-primary">전체 지점 합계 보기</option>
                        )}
                        {businesses.map(biz => (
                            <optgroup key={biz.id} label={biz.name} className="bg-slate-900 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                {stores.filter(s => s.business_id === biz.id).map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200 text-sm font-medium">
                                        {s.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                        {/* Fallback for stores without business_id if any */}
                        {stores.filter(s => !s.business_id).length > 0 && (
                            <optgroup label="기타 지점" className="bg-slate-900">
                                {stores.filter(s => !s.business_id).map(s => (
                                    <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            )}

            {/* Indicator for switcher when collapsed */}
            {isCollapsed && stores.length > 1 && (
                <div className="py-2 flex justify-center">
                    <div className="h-1 w-8 bg-primary/20 rounded-full" />
                </div>
            )}

            {/* Sophisticated Toggle Handle */}
            <button
                onClick={onToggle}
                className={cn(
                    "absolute -right-4 top-12 h-20 w-8 flex items-center justify-center z-[60] group transition-all duration-300",
                    "before:absolute before:inset-0 before:bg-indigo-600/20 before:backdrop-blur-md before:border before:border-white/10 before:rounded-r-2xl before:shadow-[5px_0_15px_rgba(0,0,0,0.3)]",
                    "hover:before:bg-indigo-600/30 hover:before:border-indigo-400/30 hover:before:w-10 hover:-right-6"
                )}
            >
                <div className="relative flex flex-col items-center gap-1">
                    <div className={cn(
                        "transition-transform duration-300",
                        isCollapsed ? "rotate-0" : "rotate-180"
                    )}>
                        <ChevronRight className="h-4 w-4 text-primary group-hover:scale-125 transition-transform" />
                    </div>
                </div>
            </button>

            <nav
                className="flex-1 overflow-y-auto py-6 px-3 space-y-2 overflow-x-hidden overscroll-contain"
            >
                {NAV_ITEMS.filter(item => {
                    if ((item as any).adminOnly && role !== 'super_admin') return false
                    // Hide store/staff management for regular staff
                    if (role === 'staff' && (item.href.includes('/settings/stores') || item.href.includes('/settings/staff'))) return false
                    return true
                }).map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-all duration-200 group relative",
                                isCollapsed ? "justify-center px-0" : "px-4",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-xl" />
                            )}
                            <item.icon className={cn(
                                "h-5 w-5 transition-colors flex-shrink-0",
                                isActive ? "text-primary" : "group-hover:text-primary"
                            )} />
                            {!isCollapsed && (
                                <span className="relative whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className={cn(
                "p-4 border-t border-white/5 bg-white/5 transition-all duration-300",
                isCollapsed ? "items-center" : ""
            )}>
                <div className={cn(
                    "flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group",
                    isCollapsed ? "justify-center" : ""
                )}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 p-[1px] flex-shrink-0">
                        <div className="h-full w-full rounded-full bg-black/80 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">U</span>
                        </div>
                    </div>
                    {!isCollapsed && (
                        <div className="text-sm overflow-hidden">
                            <p className="font-medium text-slate-200 truncate">Account Profile</p>
                            <p className="text-xs text-primary/80 truncate">{activeStore?.name || "Premium Access"}</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
