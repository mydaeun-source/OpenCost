import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"
import { cn } from "@/lib/utils"
import { useGlobalScrollbar } from "@/hooks/useGlobalScrollbar"
import { useStore } from "@/contexts/StoreContext"
import { ShieldAlert, Clock, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/contexts/ThemeContext"

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { theme } = useTheme()
    useGlobalScrollbar()

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved === 'true') setIsCollapsed(true)
        setMounted(true)
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar-collapsed', String(newState))
    }

    const { role, isApproved, loading: contextLoading } = useStore()

    if (!mounted) {
        return <div className="min-h-screen bg-background" />
    }

    // Dashboard Interception for Pending Approval
    if (!contextLoading && role === 'owner' && !isApproved) {
        return (
            <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-background">
                {/* Background Glow */}
                <div className="absolute inset-0 z-[-1]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[128px]" />
                </div>

                <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-700">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative bg-card border border-border p-6 rounded-full shadow-xl">
                                <Clock className="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black italic text-foreground tracking-tighter uppercase">
                            Approval Pending
                        </h1>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            관리자의 승인을 기다리고 있습니다.<br />
                            정상적인 이용을 위해 개발자의 최종 승인이 필요합니다.
                        </p>
                    </div>

                    <div className="pt-8 flex flex-col gap-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 text-left">
                            <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-sm text-foreground/80">
                                승인이 완료되면 페이지를 새로고침하거나 다시 로그인해 주세요.
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            className="bg-muted/50 border-border text-foreground hover:bg-muted"
                            onClick={async () => {
                                await supabase.auth.signOut()
                                window.location.href = "/login"
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            로그아웃
                        </Button>
                    </div>

                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                        Powered by Open-Cost.AI Secure Engine
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Glow Effects (Vibe Theme Only) */}
            {theme === 'vibe' && (
                <div className="fixed inset-0 z-[-1] bg-background">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
                </div>
            )}

            {/* Desktop Sidebar */}
            <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

            {/* Main Content Area */}
            <main className={cn(
                "pb-20 md:pb-0 min-h-screen transition-all duration-300",
                isCollapsed ? "md:pl-20" : "md:pl-64"
            )}>
                <div className="container max-w-none mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
