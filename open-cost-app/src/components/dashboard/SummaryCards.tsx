import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Component, Utensils, TrendingUp, Banknote, Wallet, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatNumber } from "@/lib/utils"

interface SummaryCardsProps {
    ingredientCount: number
    recipeCount: number
    avgMarginRate: number
    totalExpenses: number
    targetRevenue: number
    estimatedProfit: number
    trends?: {
        profit: number
        revenue: number
    }
}

export function SummaryCards({
    ingredientCount,
    recipeCount,
    avgMarginRate,
    totalExpenses,
    targetRevenue,
    estimatedProfit,
    trends
}: SummaryCardsProps) {
    // Format currency helper - replaced by global formatNumber

    const TrendBadge = ({ value }: { value: number }) => {
        if (!value) return null
        const isUp = value > 0
        return (
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${isUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                {isUp ? '▲' : '▼'} {Math.abs(value)}%
            </span>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Estimated Profit (Highlight) */}
            <Link href="/analysis/profit" className="block group">
                <Card className="bg-primary/10 border-none shadow-none relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 h-full">
                    <div className="absolute top-0 right-0 p-8 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black tracking-widest text-primary uppercase">예상 순이익 (EST. PROFIT)</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline">
                            <div className="text-2xl font-black text-primary italic">{formatNumber(Math.round(estimatedProfit))}원</div>
                            {trends?.profit !== undefined && <TrendBadge value={trends.profit} />}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] font-bold text-muted-foreground">
                                목표 매출({formatNumber(Math.round(targetRevenue / 10000))}만) 기준
                            </p>
                            <span className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                분석하기 <ChevronRight className="h-2 w-2" />
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* 2. Total Expenses */}
            <Card className="group hover:scale-[1.02] transition-all duration-300 border-none shadow-none bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-foreground/80 uppercase">이번 달 총 지출 (EXPENSES)</CardTitle>
                    <Banknote className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground italic tracking-tight">{formatNumber(totalExpenses)}원</div>
                    <p className="text-xs font-bold text-muted-foreground mt-1">
                        고정비 + 변동비 합계
                    </p>
                </CardContent>
            </Card>

            {/* 3. Margin Rate */}
            <Card className="group hover:scale-[1.02] transition-all duration-300 border-none shadow-none bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-foreground/80 uppercase">평균 마진율 (MARGIN %)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground italic tracking-tight">{formatNumber(avgMarginRate)}%</div>
                    <p className="text-xs font-bold text-muted-foreground mt-1">
                        예상 마진율 (목표 70%)
                    </p>
                </CardContent>
            </Card>

            {/* 4. Active Menus */}
            <Card className="group hover:scale-[1.02] transition-all duration-300 border-none shadow-none bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black tracking-widest text-foreground uppercase">활성 메뉴 (ACTIVE MENUS)</CardTitle>
                    <Utensils className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black text-foreground italic tracking-tight">{recipeCount}개</div>
                    <p className="text-xs font-bold text-muted-foreground mt-1">
                        재료({ingredientCount}) 관리 중
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
