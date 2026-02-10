import { Card, CardContent } from "@/components/ui/Card"
import { AlertCircle, TrendingUp, TrendingDown, Lightbulb, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Insight } from "@/hooks/useDashboard"

interface FinancialInsightsProps {
    insights: Insight[]
}

export function FinancialInsights({ insights }: FinancialInsightsProps) {
    if (insights.length === 0) return null

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {insights.map((insight, idx) => {
                const isWarning = insight.type === 'warning'
                const isSuccess = insight.type === 'success'
                const isInfo = insight.type === 'info'

                return (
                    <Card key={idx} className={cn(
                        "relative overflow-hidden border-none shadow-none transition-all hover:scale-[1.02] cursor-default",
                        isWarning ? "bg-rose-500/[0.08]" :
                            isSuccess ? "bg-emerald-500/[0.08]" :
                                "bg-indigo-500/[0.08]"
                    )}>
                        <CardContent className="p-4 flex items-start gap-4">
                            <div className={cn(
                                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg",
                                isWarning ? "bg-rose-500 text-white shadow-rose-500/20" :
                                    isSuccess ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                                        "bg-indigo-500 text-white shadow-indigo-500/20"
                            )}>
                                {isWarning ? <AlertCircle className="h-5 w-5" /> :
                                    isSuccess ? <ArrowUpRight className="h-5 w-5" /> :
                                        <Lightbulb className="h-5 w-5" />}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h3 className={cn(
                                        "text-xs font-black uppercase tracking-tighter",
                                        isWarning ? "text-rose-500" :
                                            isSuccess ? "text-emerald-500" :
                                                "text-indigo-500"
                                    )}>
                                        {insight.title}
                                    </h3>
                                    {insight.value && (
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center gap-1",
                                            isWarning ? "bg-rose-500/10 text-rose-500" :
                                                isSuccess ? "bg-emerald-500/10 text-emerald-500" :
                                                    "bg-indigo-500/10 text-indigo-500"
                                        )}>
                                            {insight.value}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                    {insight.description}
                                </p>
                            </div>

                            {/* Decorative background icon */}
                            {isWarning && <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-rose-500/10 -rotate-12" />}
                            {isSuccess && <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-emerald-500/10 -rotate-12" />}
                            {!isWarning && !isSuccess && <Lightbulb className="absolute -right-2 -bottom-2 h-16 w-16 text-indigo-500/10 -rotate-12" />}
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
