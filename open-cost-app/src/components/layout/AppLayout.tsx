import { Sidebar } from "./Sidebar"
import { BottomNav } from "./BottomNav"

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Glow Effects (Global) */}
            <div className="fixed inset-0 z-[-1] bg-background">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
            </div>

            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="md:pl-64 pb-20 md:pb-0 min-h-screen transition-all duration-300">
                <div className="container max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
